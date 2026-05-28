import fs from "node:fs";
import { createHash } from "node:crypto";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

const QUESTIONS_JSONL = path.join(__dirname, "questions.jsonl");
const MANUAL_QUEUE_CSV = path.join(__dirname, "manual-review-queue.csv");
const OUTPUT_DIR = path.join(__dirname, "deepseek-model-qa");
const RESULTS_JSON = path.join(OUTPUT_DIR, "deepseek-model-qa-results.json");
const RESULTS_CSV = path.join(OUTPUT_DIR, "deepseek-model-qa-results.csv");
const ISSUES_CSV = path.join(OUTPUT_DIR, "deepseek-model-qa-issues.csv");
const REPORT_MD = path.join(OUTPUT_DIR, "deepseek-model-qa-report.md");

const scope = process.env.HJB_JUNIOR_DEEPSEEK_QA_SCOPE?.trim() || "queue";
const batchSize = Number(process.env.HJB_JUNIOR_DEEPSEEK_QA_BATCH_SIZE ?? 5);
const limit = Number(process.env.HJB_JUNIOR_DEEPSEEK_QA_LIMIT ?? 0);
const requestTimeoutMs = Number(process.env.HJB_JUNIOR_DEEPSEEK_QA_TIMEOUT_MS ?? 90000);
const cacheRunId = process.env.HJB_JUNIOR_DEEPSEEK_QA_RUN_ID?.trim() || "";
const forceCacheRefresh = /^(1|true|yes)$/i.test(process.env.HJB_JUNIOR_DEEPSEEK_QA_FORCE ?? "");

function batchDirForScope(value) {
  if (cacheRunId) {
    const digest = createHash("sha1").update(`${value}:${cacheRunId}`).digest("hex").slice(0, 10);
    return path.join(OUTPUT_DIR, `batches-${digest}`);
  }
  if (value === "queue") return path.join(OUTPUT_DIR, "batches");
  if (value === "all") return path.join(OUTPUT_DIR, "batches-all");
  const digest = createHash("sha1").update(value).digest("hex").slice(0, 10);
  return path.join(OUTPUT_DIR, `batches-${digest}`);
}

const BATCH_DIR = batchDirForScope(scope);

const allowedVerdicts = new Set(["pass", "needs-review"]);
const allowedSeverities = new Set(["none", "P0", "P1", "P2"]);
const allowedConfidences = new Set(["high", "medium", "low"]);
const allowedIssueCodes = new Set([
  "wrong-answer",
  "explanation-mismatch",
  "multiple-correct-options",
  "no-correct-option",
  "ambiguous-prompt",
  "missing-condition",
  "invalid-solution",
  "accepted-answer-gap",
  "terminology-risk",
  "grade-scope-risk",
  "source-reference-risk",
  "visual-dependency",
  "other"
]);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "").trim();
  }
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing file: ${filePath}`);
  return fs
    .readFileSync(filePath, "utf8")
    .trim()
    .split(/\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function manualQueueIds(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing file: ${filePath}`);
  return fs
    .readFileSync(filePath, "utf8")
    .trim()
    .split(/\n/)
    .slice(1)
    .map((line) => line.match(/^"([^"]+)"/)?.[1])
    .filter(Boolean);
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
}

function batchIdFor(index) {
  return `model-qa-${String(index + 1).padStart(4, "0")}`;
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"`;
}

function writeCsv(filePath, rows, headers) {
  const lines = [headers.map(csvEscape).join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function questionForJudge(question) {
  return {
    id: question.id,
    grade: question.grade,
    semester: question.semester,
    unitTitle: question.unitTitle,
    topicId: question.topicId,
    type: question.type,
    difficulty: question.difficulty,
    promptZhHans: question.promptZhHans,
    optionsZhHans: question.optionsZhHans,
    answer: question.answer,
    acceptedAnswers: question.acceptedAnswers,
    explanationZhHans: question.explanationZhHans
  };
}

function systemPrompt() {
  return [
    "你是 MAIS 的沪教版初中数学题目 QA 审核员。",
    "你现在只做检测，不改写题目，不生成新题，不批准上线。",
    "请独立解题，不要默认给定答案正确。",
    "重点检查：题干是否唯一可解；标准答案是否正确；解析是否推出答案；选择题是否只有一个正确选项；选项是否互异；填空/简答是否无选项；acceptedAnswers 是否覆盖标准答案；是否存在缺图、缺条件、矛盾、循环论证、年级范围或术语风险。",
    "如果题目答案和解析不一致，即使题干本身可解，也必须标记 needs-review。",
    "如果你不确定，宁可标记 needs-review，confidence 用 low 或 medium。",
    "只输出 JSON object，不要 Markdown，不要代码块。"
  ].join("\n");
}

function userPrompt(questions) {
  return JSON.stringify({
    task: "QA-check these Mainland Shanghai Education Press / HuJiaoBan junior math candidate questions.",
    outputContract: {
      root: "reviews",
      perReviewFields: [
        "id",
        "verdict",
        "severity",
        "issueCodes",
        "issueDetailsZhHans",
        "independentAnswerZhHans",
        "answerCheckZhHans",
        "recommendedActionZhHans",
        "confidence"
      ],
      allowedValues: {
        verdict: ["pass", "needs-review"],
        severity: ["none", "P0", "P1", "P2"],
        issueCodes: Array.from(allowedIssueCodes),
        confidence: ["high", "medium", "low"]
      },
      rules: [
        "Return exactly one JSON object: {\"reviews\":[...items...]}.",
        "Use each question id exactly once.",
        "For pass: severity must be none, issueCodes must be empty array, and issueDetailsZhHans must be empty.",
        "For needs-review: severity must be P0, P1, or P2; issueCodes must be non-empty.",
        "Use P1 for wrong answer, explanation contradiction, no correct choice, multiple correct choices, missing condition, or impossible item.",
        "Use P2 for minor wording, accepted-answer, terminology, or grade-scope concerns.",
        "Keep issueDetailsZhHans concise but specific enough for S18 to review.",
        "Do not mention source files, OCR, page numbers, or production integration."
      ]
    },
    questions: questions.map(questionForJudge)
  });
}

function extractJsonObject(text) {
  const trimmed = text.trim();
  const parseJson = (candidate) => {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      if (!/Bad escaped character/.test(String(error?.message ?? error))) throw error;
      return JSON.parse(candidate.replace(/\\(?!["\\/bfnrtu])/g, "\\\\"));
    }
  };
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return parseJson(trimmed);
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in provider reply");
  return parseJson(match[0]);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function requestDeepSeekJson({ apiUrl, apiKey, body }) {
  return new Promise((resolve, reject) => {
    const url = new URL(apiUrl);
    const payload = JSON.stringify(body);
    const client = url.protocol === "http:" ? http : https;
    let settled = false;
    let request;
    const absoluteTimeout = setTimeout(() => {
      if (request) request.destroy(new Error(`DeepSeek request timed out after ${requestTimeoutMs} ms`));
    }, requestTimeoutMs);
    const finish = (handler, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(absoluteTimeout);
      handler(value);
    };
    request = client.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          Authorization: `Bearer ${apiKey}`
        }
      },
      (response) => {
        response.setEncoding("utf8");
        let text = "";
        response.on("data", (part) => {
          text += part;
        });
        response.on("end", () => {
          finish(resolve, {
            ok: (response.statusCode ?? 0) >= 200 && (response.statusCode ?? 0) < 300,
            status: response.statusCode ?? 0,
            text
          });
        });
      }
    );
    request.setTimeout(requestTimeoutMs, () => {
      request.destroy(new Error(`DeepSeek request timed out after ${requestTimeoutMs} ms`));
    });
    request.on("error", (error) => finish(reject, error));
    request.write(payload);
    request.end();
  });
}

async function postDeepSeek({ apiUrl, apiKey, model, messages, attempt = 0 }) {
  const body = {
    model,
    messages,
    response_format: { type: "json_object" },
    thinking: { type: "disabled" },
    stream: false,
    max_tokens: 7000,
    temperature: 0.05
  };
  try {
    const response = await requestDeepSeekJson({ apiUrl, apiKey, body });
    if (!response.ok) {
      const safeText = response.text.replaceAll(apiKey, "[REDACTED_API_KEY]").slice(0, 1200);
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        await sleep(3000 * (attempt + 1));
        return postDeepSeek({ apiUrl, apiKey, model, messages, attempt: attempt + 1 });
      }
      throw new Error(`DeepSeek request failed with HTTP ${response.status}: ${safeText}`);
    }
    const parsed = JSON.parse(response.text);
    const content = parsed?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new Error("DeepSeek reply did not include message.content");
    return content;
  } catch (error) {
    const message = String(error?.message ?? error);
    if (/fetch failed|network|ECONNRESET|ETIMEDOUT|timed out|aborted/i.test(message) && attempt < 2) {
      await sleep(4000 * (attempt + 1));
      return postDeepSeek({ apiUrl, apiKey, model, messages, attempt: attempt + 1 });
    }
    throw error;
  }
}

function normalizeReview(raw, targetIds) {
  const review = {
    id: String(raw?.id ?? "").trim(),
    verdict: String(raw?.verdict ?? "").trim(),
    severity: String(raw?.severity ?? "").trim(),
    issueCodes: Array.isArray(raw?.issueCodes) ? raw.issueCodes.map((code) => String(code).trim()).filter(Boolean) : [],
    issueDetailsZhHans: String(raw?.issueDetailsZhHans ?? "").trim(),
    independentAnswerZhHans: String(raw?.independentAnswerZhHans ?? "").trim(),
    answerCheckZhHans: String(raw?.answerCheckZhHans ?? "").trim(),
    recommendedActionZhHans: String(raw?.recommendedActionZhHans ?? "").trim(),
    confidence: String(raw?.confidence ?? "").trim()
  };
  if (review.verdict === "pass" && !review.recommendedActionZhHans) review.recommendedActionZhHans = "无需修改；保留进入人工抽样复核。";
  const errors = [];
  if (!targetIds.has(review.id)) errors.push(`unknown id ${review.id}`);
  if (!allowedVerdicts.has(review.verdict)) errors.push(`${review.id}: bad verdict ${review.verdict}`);
  if (!allowedSeverities.has(review.severity)) errors.push(`${review.id}: bad severity ${review.severity}`);
  if (!allowedConfidences.has(review.confidence)) errors.push(`${review.id}: bad confidence ${review.confidence}`);
  for (const code of review.issueCodes) {
    if (!allowedIssueCodes.has(code)) errors.push(`${review.id}: bad issue code ${code}`);
  }
  if (review.verdict === "pass") {
    if (review.severity !== "none") errors.push(`${review.id}: pass severity must be none`);
    if (review.issueCodes.length) errors.push(`${review.id}: pass issueCodes must be empty`);
  }
  if (review.verdict === "needs-review") {
    if (review.severity === "none") errors.push(`${review.id}: needs-review must have P severity`);
    if (!review.issueCodes.length) errors.push(`${review.id}: needs-review must include issueCodes`);
  }
  if (!review.independentAnswerZhHans) errors.push(`${review.id}: missing independentAnswerZhHans`);
  if (!review.answerCheckZhHans) errors.push(`${review.id}: missing answerCheckZhHans`);
  if (review.verdict === "needs-review" && !review.recommendedActionZhHans) errors.push(`${review.id}: missing recommendedActionZhHans`);
  return { review, errors };
}

function validateReviews(rawReviews, questions) {
  if (!Array.isArray(rawReviews)) throw new Error("Provider JSON missing reviews array");
  if (rawReviews.length !== questions.length) throw new Error(`Expected ${questions.length} reviews, got ${rawReviews.length}`);
  const targetIds = new Set(questions.map((question) => question.id));
  const reviews = [];
  const errors = [];
  for (const raw of rawReviews) {
    const result = normalizeReview(raw, targetIds);
    reviews.push(result.review);
    errors.push(...result.errors);
  }
  const seen = new Set();
  for (const review of reviews) {
    if (seen.has(review.id)) errors.push(`duplicate review id ${review.id}`);
    seen.add(review.id);
  }
  for (const id of targetIds) {
    if (!seen.has(id)) errors.push(`missing review for ${id}`);
  }
  if (errors.length) throw new Error(errors.join("; "));
  return reviews.sort((left, right) => left.id.localeCompare(right.id));
}

async function qaBatch({ questions, batchIndex, apiUrl, apiKey, model }) {
  const batchId = batchIdFor(batchIndex);
  const cachePath = path.join(BATCH_DIR, `${batchId}.json`);
  if (!forceCacheRefresh && fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    return validateReviews(cached.reviews, questions);
  }
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      console.log(`${batchId} attempt ${attempt}/3`);
      const messages = [
        { role: "system", content: systemPrompt() },
        { role: "user", content: userPrompt(questions) },
        ...(lastError
          ? [
              {
                role: "user",
                content: `Previous QA response failed local JSON validation: ${String(lastError?.message ?? lastError).slice(0, 1200)}. Return the same ids again with the required JSON schema.`
              }
            ]
          : [])
      ];
      const content = await postDeepSeek({ apiUrl, apiKey, model, messages });
      const parsed = extractJsonObject(content);
      const reviews = validateReviews(parsed.reviews, questions);
      fs.writeFileSync(cachePath, `${JSON.stringify({ batchId, ids: questions.map((question) => question.id), reviews }, null, 2)}\n`);
      return reviews;
    } catch (error) {
      lastError = error;
      console.log(`${batchId} attempt ${attempt} failed: ${String(error?.message ?? error).slice(0, 360)}`);
      if (attempt < 3) await sleep(2000 * attempt);
    }
  }
  throw new Error(`${batchId} failed after retries: ${lastError?.message ?? lastError}`);
}

function selectQuestions(rows) {
  let selected;
  if (scope === "all") {
    selected = rows;
  } else if (scope === "queue") {
    const queueIds = new Set(manualQueueIds(MANUAL_QUEUE_CSV));
    selected = rows.filter((row) => queueIds.has(row.id));
  } else if (scope.startsWith("ids:")) {
    const ids = new Set(scope.slice(4).split(",").map((id) => id.trim()).filter(Boolean));
    selected = rows.filter((row) => ids.has(row.id));
  } else {
    throw new Error(`Unsupported HJB_JUNIOR_DEEPSEEK_QA_SCOPE: ${scope}. Use queue, all, or ids:id1,id2.`);
  }
  if (limit > 0) selected = selected.slice(0, limit);
  return selected.sort((left, right) => left.id.localeCompare(right.id));
}

function buildSummary(reviews) {
  const counts = {
    total: reviews.length,
    pass: reviews.filter((review) => review.verdict === "pass").length,
    needsReview: reviews.filter((review) => review.verdict === "needs-review").length,
    P0: reviews.filter((review) => review.severity === "P0").length,
    P1: reviews.filter((review) => review.severity === "P1").length,
    P2: reviews.filter((review) => review.severity === "P2").length
  };
  const codeCounts = {};
  for (const review of reviews) {
    for (const code of review.issueCodes) codeCounts[code] = (codeCounts[code] ?? 0) + 1;
  }
  return { counts, codeCounts };
}

function writeOutputs({ reviews, questions, model, apiUrl, startedAt, finishedAt }) {
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const enriched = reviews.map((review) => {
    const question = questionById.get(review.id);
    return {
      ...review,
      grade: question?.grade ?? "",
      semester: question?.semester ?? "",
      topicId: question?.topicId ?? "",
      unitTitle: question?.unitTitle ?? "",
      type: question?.type ?? "",
      difficulty: question?.difficulty ?? "",
      promptZhHans: question?.promptZhHans ?? "",
      answer: question?.answer ?? ""
    };
  });
  const issues = enriched.filter((review) => review.verdict === "needs-review");
  const summary = buildSummary(reviews);
  fs.writeFileSync(
    RESULTS_JSON,
    `${JSON.stringify(
      {
        generatedAt: finishedAt,
        sessionId: "S18",
        scope,
        cacheRunId,
        forceCacheRefresh,
        batchCacheDir: path.relative(__dirname, BATCH_DIR),
        model,
        apiHost: new URL(apiUrl).host,
        candidatePackage: "mainland-hjb-junior-generated-bank-v2-1500",
        counts: summary.counts,
        codeCounts: summary.codeCounts,
        reviews: enriched
      },
      null,
      2
    )}\n`
  );
  writeCsv(RESULTS_CSV, enriched, [
    "id",
    "grade",
    "semester",
    "topicId",
    "unitTitle",
    "type",
    "difficulty",
    "verdict",
    "severity",
    "issueCodes",
    "issueDetailsZhHans",
    "independentAnswerZhHans",
    "answer",
    "answerCheckZhHans",
    "recommendedActionZhHans",
    "confidence",
    "promptZhHans"
  ]);
  writeCsv(ISSUES_CSV, issues, [
    "id",
    "grade",
    "unitTitle",
    "type",
    "difficulty",
    "severity",
    "issueCodes",
    "issueDetailsZhHans",
    "independentAnswerZhHans",
    "answer",
    "answerCheckZhHans",
    "recommendedActionZhHans",
    "confidence",
    "promptZhHans"
  ]);
  const topIssues = issues
    .slice(0, 30)
    .map((review) => `| ${review.id} | ${review.grade} | ${review.unitTitle} | ${review.severity} | ${review.issueCodes.join(" | ")} | ${review.issueDetailsZhHans.replace(/\|/g, "/")} |`)
    .join("\n");
  const codeLines = Object.entries(summary.codeCounts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([code, count]) => `- ${code}: ${count}`)
    .join("\n");
  fs.writeFileSync(
    REPORT_MD,
    `# DeepSeek Model QA Report - Mainland HJB Junior V2 Candidate

	- Date: 2026-05-25
	- Session ID: S18
	- Scope: ${scope}
	- Cache run id: ${cacheRunId || "default"}
	- Force cache refresh: ${forceCacheRefresh ? "yes" : "no"}
	- Batch cache dir: \`${path.relative(__dirname, BATCH_DIR)}\`
	- Candidate package: \`mainland-hjb-junior-generated-bank-v2-1500\`
- Model: \`${model}\`
- API host: \`${new URL(apiUrl).host}\`
- Started: ${startedAt}
- Finished: ${finishedAt}
- Result: ${summary.counts.needsReview ? "needs-review" : "model-qa-green"}

## Summary

- Reviewed rows: ${summary.counts.total}
- Pass: ${summary.counts.pass}
- Needs review: ${summary.counts.needsReview}
- P0: ${summary.counts.P0}
- P1: ${summary.counts.P1}
- P2: ${summary.counts.P2}

## Issue Codes

${codeLines || "- None"}

## Top Issue Rows

| id | grade | unit | severity | issue codes | details |
| --- | --- | --- | --- | --- | --- |
${topIssues || "| None |  |  |  |  |  |"}

## Notes

- This is a DeepSeek-assisted QA pass, not a production approval.
- DeepSeek was asked to independently solve and check answer/explanation consistency.
- Any \`needs-review\` row should go to S18 math review before any future S04/S08 production integration.
- This task did not edit \`data/questions.ts\`, UI, API routes, or the formal question bank.
`
  );
}

async function main() {
  loadEnvFile(path.join(rootDir, ".env.local"));
  const apiKey = process.env.LLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  const apiUrl = process.env.LLM_API_URL?.trim() || "https://api.deepseek.com/chat/completions";
  const model = process.env.LLM_MODEL?.trim() || "deepseek-v4-pro";
  const startedAt = new Date().toISOString();

  if (!apiKey) throw new Error("Missing LLM_API_KEY or OPENAI_API_KEY in local environment");
  if (!new URL(apiUrl).host.includes("api.deepseek.com")) throw new Error(`Refusing non-DeepSeek endpoint for this task: ${new URL(apiUrl).host}`);
  if (model !== "deepseek-v4-pro") throw new Error(`Refusing non-DeepSeek V4 Pro model for this task: ${model}`);
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 20) throw new Error(`Invalid HJB_JUNIOR_DEEPSEEK_QA_BATCH_SIZE: ${batchSize}`);
  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 30000 || requestTimeoutMs > 180000) {
    throw new Error(`Invalid HJB_JUNIOR_DEEPSEEK_QA_TIMEOUT_MS: ${requestTimeoutMs}`);
  }

  fs.mkdirSync(BATCH_DIR, { recursive: true });
  const rows = readJsonl(QUESTIONS_JSONL);
  const selected = selectQuestions(rows);
  const batches = chunk(selected, batchSize);
  console.log(
    `DeepSeek model QA starting: scope=${scope}, rows=${selected.length}, batches=${batches.length}, model=${model}, endpoint=${new URL(apiUrl).host}, ` +
      `cacheRunId=${cacheRunId || "default"}, forceCacheRefresh=${forceCacheRefresh ? "yes" : "no"}`
  );

  const reviews = [];
  for (let index = 0; index < batches.length; index += 1) {
    const questions = batches[index];
    console.log(`batch ${index + 1}/${batches.length}: ${batchIdFor(index)} ${questions[0].grade} ${questions[0].unitTitle}`);
    reviews.push(...(await qaBatch({ questions, batchIndex: index, apiUrl, apiKey, model })));
  }
  reviews.sort((left, right) => left.id.localeCompare(right.id));
  const finishedAt = new Date().toISOString();
  writeOutputs({ reviews, questions: selected, model, apiUrl, startedAt, finishedAt });
  const summary = buildSummary(reviews);
  console.log(`DeepSeek model QA complete: reviewed ${summary.counts.total}, pass ${summary.counts.pass}, needs-review ${summary.counts.needsReview}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
