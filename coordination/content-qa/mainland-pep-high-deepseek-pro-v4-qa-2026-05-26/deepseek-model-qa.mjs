import fs from "node:fs";
import { createHash } from "node:crypto";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const outputDir = __dirname;
const resultsJson = path.join(outputDir, "deepseek-model-qa-results.json");
const resultsCsv = path.join(outputDir, "deepseek-model-qa-results.csv");
const issuesCsv = path.join(outputDir, "deepseek-model-qa-issues.csv");
const reportMd = path.join(outputDir, "deepseek-model-qa-report.md");
const nodeRequire = createRequire(import.meta.url);

const scope = process.env.PEP_HIGH_DEEPSEEK_QA_SCOPE?.trim() || "all";
const batchSize = Number(process.env.PEP_HIGH_DEEPSEEK_QA_BATCH_SIZE ?? 20);
const concurrency = Number(process.env.PEP_HIGH_DEEPSEEK_QA_CONCURRENCY ?? 1);
const limit = Number(process.env.PEP_HIGH_DEEPSEEK_QA_LIMIT ?? 0);
const requestTimeoutMs = Number(process.env.PEP_HIGH_DEEPSEEK_QA_TIMEOUT_MS ?? 180000);
const cacheRunId = process.env.PEP_HIGH_DEEPSEEK_QA_RUN_ID?.trim() || "";
const forceCacheRefresh = /^(1|true|yes)$/i.test(process.env.PEP_HIGH_DEEPSEEK_QA_FORCE ?? "");
const readApiKeyFromStdin = /^(1|true|yes)$/i.test(process.env.PEP_HIGH_DEEPSEEK_QA_API_KEY_STDIN ?? "");

const allowedVerdicts = new Set(["pass", "needs-review"]);
const allowedSeverities = new Set(["none", "P0", "P1", "P2"]);
const allowedConfidences = new Set(["high", "medium", "low"]);
const allowedIssueCodes = new Set([
  "unsolvable",
  "wrong-answer",
  "explanation-mismatch",
  "multiple-correct-options",
  "no-correct-option",
  "ambiguous-prompt",
  "missing-condition",
  "invalid-solution",
  "accepted-answer-gap",
  "grading-format-risk",
  "visual-dependency",
  "other"
]);

function batchDirForScope(value) {
  const suffix = cacheRunId ? `${value}:${cacheRunId}` : value;
  const digest = createHash("sha1").update(suffix).digest("hex").slice(0, 10);
  return path.join(outputDir, `batches-${digest}`);
}

const batchDir = batchDirForScope(scope);

function loadTsModule(filePath, cache = new Map()) {
  const resolvedPath = filePath.endsWith(".ts") ? filePath : `${filePath}.ts`;
  if (cache.has(resolvedPath)) return cache.get(resolvedPath).exports;

  const source = fs.readFileSync(resolvedPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    },
    fileName: resolvedPath
  }).outputText;

  const module = { exports: {} };
  cache.set(resolvedPath, module);

  function localRequire(specifier) {
    if (specifier.startsWith("@/types")) return {};
    if (specifier.startsWith("@/")) return loadTsModule(path.join(rootDir, `${specifier.slice(2)}.ts`), cache);
    if (specifier.startsWith(".")) return loadTsModule(path.resolve(path.dirname(resolvedPath), specifier), cache);
    return nodeRequire(specifier);
  }

  const wrapped = `(function (exports, require, module, __filename, __dirname) {\n${compiled}\n})`;
  const fn = vm.runInNewContext(wrapped, { console, URL, Intl, setTimeout, clearTimeout }, { filename: resolvedPath });
  fn(module.exports, localRequire, module, resolvedPath, path.dirname(resolvedPath));
  return module.exports;
}

function text(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.zhHans ?? value.zh ?? value.en ?? "";
}

function compactQuestion(question, metadata) {
  return {
    id: question.id,
    batch: metadata?.batch ?? "unknown",
    grade: question.grade,
    topicId: question.topicId,
    topicZhHans: text(question.topic),
    type: question.type,
    difficulty: question.difficulty,
    promptZhHans: text(question.prompt),
    promptEn: question.prompt?.en ?? "",
    optionsZhHans: (question.options ?? []).map(text),
    optionsEn: (question.options ?? []).map((option) => option.en ?? ""),
    answer: question.answer,
    acceptedAnswers: question.acceptedAnswers ?? [],
    explanationZhHans: text(question.explanation),
    explanationEn: question.explanation?.en ?? ""
  };
}

function loadQuestions() {
  const module = loadTsModule(path.join(rootDir, "data/mainlandPepHighQuestions.ts"));
  const metadata = module.mainlandPepHighQuestionGenerationMetadata ?? {};
  return (module.mainlandPepHighQuestions ?? []).map((question) => compactQuestion(question, metadata[question.id]));
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
  const textValue = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${textValue.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"`;
}

function writeCsv(filePath, rows, headers) {
  const lines = [headers.map(csvEscape).join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function systemPrompt() {
  return [
    "你是 MAIS 的人教版高中数学题目质量审核员。",
    "你现在只做检测，不改写题目，不生成新题，不批准上线。",
    "请独立解题，不要默认给定答案正确。",
    "本次只关注两个硬门槛：1）题目是否 solvable，也就是条件充分、无矛盾、无需缺失图形或外部材料；2）标准答案、acceptedAnswers 与题目是否匹配，解析是否能推出答案。",
    "选择题还要检查是否只有一个正确选项；填空和简答要检查答案形式是否合理，acceptedAnswers 是否覆盖标准答案。",
    "如果题目本身可解但给定答案、选项或解析不匹配，必须标记 needs-review。",
    "如果独立答案与标准答案一致，只是解析较简略或没有逐步展开，不能标记 wrong-answer；只有解析给出相反结论或错误计算时才标记 explanation-mismatch。",
    "如果你不确定，宁可标记 needs-review，confidence 用 low 或 medium。",
    "只输出 JSON object，不要 Markdown，不要代码块。"
  ].join("\n");
}

function userPrompt(questions) {
  return JSON.stringify({
    task: "QA-check these Mainland PEP high-school math questions for solvability and answer/question match.",
    outputContract: {
      root: "reviews",
      perReviewFields: [
        "id",
        "verdict",
        "solvable",
        "answerMatches",
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
        "For pass: solvable=true, answerMatches=true, severity=none, issueCodes=[], issueDetailsZhHans=''.",
        "For needs-review: severity must be P0, P1, or P2; issueCodes must be non-empty.",
        "Use P1 for wrong answer, explanation contradiction, no correct choice, multiple correct choices, missing condition, or impossible item.",
        "Use P2 only for accepted-answer formatting gaps or minor wording risks that do not change the mathematical answer.",
        "Keep issueDetailsZhHans concise but specific enough for S18 to review.",
        "Do not mention source files, OCR, page numbers, API keys, or production integration."
      ]
    },
    questions
  });
}

function extractJsonObject(value) {
  const trimmed = String(value ?? "").trim();
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
        let responseText = "";
        response.on("data", (part) => {
          responseText += part;
        });
        response.on("end", () => {
          finish(resolve, {
            ok: (response.statusCode ?? 0) >= 200 && (response.statusCode ?? 0) < 300,
            status: response.statusCode ?? 0,
            text: responseText
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
    max_tokens: 12000,
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

function normalizeBoolean(value) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
}

function normalizeAnswerValue(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[−–—]/g, "-")
    .replace(/\s+/g, "")
    .replace(/[，,。；;：:]/g, "")
    .replace(/\\\(|\\\)/g, "")
    .trim();
}

function normalizeReview(raw, targetIds, questionById) {
  const review = {
    id: String(raw?.id ?? "").trim(),
    verdict: String(raw?.verdict ?? "").trim(),
    solvable: normalizeBoolean(raw?.solvable),
    answerMatches: normalizeBoolean(raw?.answerMatches),
    severity: String(raw?.severity ?? "").trim(),
    issueCodes: Array.isArray(raw?.issueCodes) ? raw.issueCodes.map((code) => String(code).trim()).filter(Boolean) : [],
    issueDetailsZhHans: String(raw?.issueDetailsZhHans ?? "").trim(),
    independentAnswerZhHans: String(raw?.independentAnswerZhHans ?? "").trim(),
    answerCheckZhHans: String(raw?.answerCheckZhHans ?? "").trim(),
    recommendedActionZhHans: String(raw?.recommendedActionZhHans ?? "").trim(),
    confidence: String(raw?.confidence ?? "").trim(),
    localValidationNotes: []
  };
  if (review.verdict === "pass" && !review.recommendedActionZhHans) review.recommendedActionZhHans = "无需修改；进入人工抽样复核即可。";
  const errors = [];
  if (!targetIds.has(review.id)) errors.push(`unknown id ${review.id}`);
  if (!allowedVerdicts.has(review.verdict)) errors.push(`${review.id}: bad verdict ${review.verdict}`);
  if (!allowedSeverities.has(review.severity)) errors.push(`${review.id}: bad severity ${review.severity}`);
  if (!allowedConfidences.has(review.confidence)) errors.push(`${review.id}: bad confidence ${review.confidence}`);
  for (const code of review.issueCodes) {
    if (!allowedIssueCodes.has(code)) errors.push(`${review.id}: bad issue code ${code}`);
  }
  if (typeof review.solvable !== "boolean") errors.push(`${review.id}: missing boolean solvable`);
  if (typeof review.answerMatches !== "boolean") errors.push(`${review.id}: missing boolean answerMatches`);
  if (review.verdict === "pass") {
    if (review.solvable !== true) errors.push(`${review.id}: pass requires solvable=true`);
    if (review.answerMatches !== true) errors.push(`${review.id}: pass requires answerMatches=true`);
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
  const answerCheckSaysMatch = /答案.*(?:匹配|正确|一致)|给定答案.*正确|标准答案.*正确|独立计算也为|答案本身正确|标准答案(?:为|是).*(?:匹配|正确)/.test(
    review.answerCheckZhHans
  );
  const detailsSayCorrect = /答案.*(?:匹配|正确|一致)|给定答案.*正确|标准答案.*正确|答案本身正确/.test(review.issueDetailsZhHans);
  const normalizedIndependentAnswer = normalizeAnswerValue(review.independentAnswerZhHans);
  const normalizedStoredAnswer = normalizeAnswerValue(questionById.get(review.id)?.answer ?? "");
  const simpleAnswerMatch = normalizedIndependentAnswer && normalizedStoredAnswer && normalizedIndependentAnswer === normalizedStoredAnswer;
  const answerMatchContradiction = review.answerMatches === false && (answerCheckSaysMatch || simpleAnswerMatch);
  const wrongAnswerContradiction =
    review.issueCodes.includes("wrong-answer") && (answerCheckSaysMatch || detailsSayCorrect || simpleAnswerMatch);
  const onlyAnswerOrExplanationCodes = review.issueCodes.every((code) => code === "wrong-answer" || code === "explanation-mismatch");
  if ((answerMatchContradiction || wrongAnswerContradiction) && onlyAnswerOrExplanationCodes) {
    review.verdict = "pass";
    review.solvable = true;
    review.answerMatches = true;
    review.severity = "none";
    review.issueCodes = [];
    review.issueDetailsZhHans = "";
    review.recommendedActionZhHans =
      "无需修改；模型初稿出现答案匹配/错答标记矛盾，本地一致性校验按独立答案与标准答案一致判为 pass。";
    review.localValidationNotes.push("corrected-model-answer-match-contradiction");
  } else {
    if (answerMatchContradiction) {
      errors.push(`${review.id}: answerMatches=false contradicts answerCheckZhHans or identical independent/stored answer`);
    }
    if (wrongAnswerContradiction) {
      errors.push(`${review.id}: wrong-answer contradicts model rationale or identical independent/stored answer`);
    }
  }
  return { review, errors };
}

function validateReviews(rawReviews, questions) {
  if (!Array.isArray(rawReviews)) throw new Error("Provider JSON missing reviews array");
  if (rawReviews.length !== questions.length) throw new Error(`Expected ${questions.length} reviews, got ${rawReviews.length}`);
  const targetIds = new Set(questions.map((question) => question.id));
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const reviews = [];
  const errors = [];
  for (const raw of rawReviews) {
    const result = normalizeReview(raw, targetIds, questionById);
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
  const cachePath = path.join(batchDir, `${batchId}.json`);
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
      console.log(`${batchId} attempt ${attempt} failed: ${String(error?.message ?? error).replaceAll(apiKey, "[REDACTED_API_KEY]").slice(0, 360)}`);
      if (attempt < 3) await sleep(2000 * attempt);
    }
  }
  throw new Error(`${batchId} failed after retries: ${lastError?.message ?? lastError}`);
}

function selectQuestions(rows) {
  let selected;
  if (scope === "all") {
    selected = rows;
  } else if (scope.startsWith("batch:")) {
    const batch = scope.slice(6).trim();
    selected = rows.filter((row) => row.batch === batch);
  } else if (scope.startsWith("grade:")) {
    const grade = scope.slice(6).trim();
    selected = rows.filter((row) => row.grade === grade);
  } else if (scope.startsWith("ids:")) {
    const ids = new Set(scope.slice(4).split(",").map((id) => id.trim()).filter(Boolean));
    selected = rows.filter((row) => ids.has(row.id));
  } else {
    throw new Error(`Unsupported PEP_HIGH_DEEPSEEK_QA_SCOPE: ${scope}. Use all, batch:rag-v4, grade:S4, or ids:id1,id2.`);
  }
  selected = selected.sort((left, right) => left.id.localeCompare(right.id));
  if (limit > 0) selected = selected.slice(0, limit);
  return selected;
}

function buildSummary(reviews) {
  const counts = {
    total: reviews.length,
    pass: reviews.filter((review) => review.verdict === "pass").length,
    needsReview: reviews.filter((review) => review.verdict === "needs-review").length,
    P0: reviews.filter((review) => review.severity === "P0").length,
    P1: reviews.filter((review) => review.severity === "P1").length,
    P2: reviews.filter((review) => review.severity === "P2").length,
    unsolvable: reviews.filter((review) => review.solvable === false).length,
    answerMismatch: reviews.filter((review) => review.answerMatches === false).length,
    localValidationCorrected: reviews.filter((review) => review.localValidationNotes?.length).length
  };
  const codeCounts = {};
  const batchCounts = {};
  const gradeCounts = {};
  for (const review of reviews) {
    for (const code of review.issueCodes) codeCounts[code] = (codeCounts[code] ?? 0) + 1;
    batchCounts[review.batch] = batchCounts[review.batch] ?? { total: 0, pass: 0, needsReview: 0, P0: 0, P1: 0, P2: 0 };
    batchCounts[review.batch].total += 1;
    batchCounts[review.batch][review.verdict === "pass" ? "pass" : "needsReview"] += 1;
    if (review.severity !== "none") batchCounts[review.batch][review.severity] += 1;
    gradeCounts[review.grade] = gradeCounts[review.grade] ?? { total: 0, pass: 0, needsReview: 0, P0: 0, P1: 0, P2: 0 };
    gradeCounts[review.grade].total += 1;
    gradeCounts[review.grade][review.verdict === "pass" ? "pass" : "needsReview"] += 1;
    if (review.severity !== "none") gradeCounts[review.grade][review.severity] += 1;
  }
  return { counts, codeCounts, batchCounts, gradeCounts };
}

function writeOutputs({ reviews, questions, model, apiUrl, startedAt, finishedAt }) {
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const enriched = reviews.map((review) => {
    const question = questionById.get(review.id);
    return {
      ...review,
      batch: question?.batch ?? "",
      grade: question?.grade ?? "",
      topicId: question?.topicId ?? "",
      topicZhHans: question?.topicZhHans ?? "",
      type: question?.type ?? "",
      difficulty: question?.difficulty ?? "",
      promptZhHans: question?.promptZhHans ?? "",
      answer: question?.answer ?? "",
      acceptedAnswers: question?.acceptedAnswers ?? [],
      explanationZhHans: question?.explanationZhHans ?? ""
    };
  });
  const issues = enriched.filter((review) => review.verdict === "needs-review");
  const summary = buildSummary(enriched);
  fs.writeFileSync(
    resultsJson,
    `${JSON.stringify(
      {
        generatedAt: finishedAt,
        sessionId: "S18",
        scope,
        cacheRunId,
        forceCacheRefresh,
        batchCacheDir: path.relative(outputDir, batchDir),
        model,
        apiHost: new URL(apiUrl).host,
        questionSource: "data/mainlandPepHighQuestions.ts",
        counts: summary.counts,
        codeCounts: summary.codeCounts,
        batchCounts: summary.batchCounts,
        gradeCounts: summary.gradeCounts,
        reviews: enriched
      },
      null,
      2
    )}\n`
  );
  writeCsv(resultsCsv, enriched, [
    "id",
    "batch",
    "grade",
    "topicId",
    "topicZhHans",
    "type",
    "difficulty",
    "verdict",
    "solvable",
    "answerMatches",
    "severity",
    "issueCodes",
    "issueDetailsZhHans",
    "independentAnswerZhHans",
    "answer",
    "acceptedAnswers",
    "answerCheckZhHans",
    "recommendedActionZhHans",
    "confidence",
    "localValidationNotes",
    "promptZhHans"
  ]);
  writeCsv(issuesCsv, issues, [
    "id",
    "batch",
    "grade",
    "topicId",
    "topicZhHans",
    "type",
    "difficulty",
    "severity",
    "issueCodes",
    "issueDetailsZhHans",
    "independentAnswerZhHans",
    "answer",
    "acceptedAnswers",
    "answerCheckZhHans",
    "recommendedActionZhHans",
    "confidence",
    "localValidationNotes",
    "promptZhHans"
  ]);
  const topIssues = issues
    .slice(0, 50)
    .map((review) => `| ${review.id} | ${review.batch} | ${review.grade} | ${review.topicZhHans} | ${review.severity} | ${review.issueCodes.join(" | ")} | ${review.issueDetailsZhHans.replace(/\|/g, "/")} |`)
    .join("\n");
  const codeLines = Object.entries(summary.codeCounts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([code, count]) => `- ${code}: ${count}`)
    .join("\n");
  const batchLines = Object.entries(summary.batchCounts)
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([batch, counts]) => `| ${batch} | ${counts.total} | ${counts.pass} | ${counts.needsReview} | ${counts.P0} | ${counts.P1} | ${counts.P2} |`)
    .join("\n");
  const gradeLines = Object.entries(summary.gradeCounts)
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([grade, counts]) => `| ${grade} | ${counts.total} | ${counts.pass} | ${counts.needsReview} | ${counts.P0} | ${counts.P1} | ${counts.P2} |`)
    .join("\n");
  fs.writeFileSync(
    reportMd,
    `# DeepSeek-pro-v4 Model QA Report - Mainland PEP High Questions

- Date: 2026-05-26
- Session ID: S18
- Scope: ${scope}
- Cache run id: ${cacheRunId || "default"}
- Force cache refresh: ${forceCacheRefresh ? "yes" : "no"}
- Batch cache dir: \`${path.relative(outputDir, batchDir)}\`
- Question source: \`data/mainlandPepHighQuestions.ts\`
- Model: \`${model}\`
- API host: \`${new URL(apiUrl).host}\`
- Started: ${startedAt}
- Finished: ${finishedAt}
- Result: ${summary.counts.needsReview ? "needs-review" : "model-qa-green"}

## Hard-Gate Summary

- Reviewed rows: ${summary.counts.total}
- Pass: ${summary.counts.pass}
- Needs review: ${summary.counts.needsReview}
- P0: ${summary.counts.P0}
- P1: ${summary.counts.P1}
- P2: ${summary.counts.P2}
- Unsolvable flagged: ${summary.counts.unsolvable}
- Answer mismatch flagged: ${summary.counts.answerMismatch}
- Local model-contradiction corrections: ${summary.counts.localValidationCorrected}

## By Grade

| grade | reviewed | pass | needs review | P0 | P1 | P2 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${gradeLines || "| None | 0 | 0 | 0 | 0 | 0 | 0 |"}

## By Batch

| batch | reviewed | pass | needs review | P0 | P1 | P2 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${batchLines || "| None | 0 | 0 | 0 | 0 | 0 | 0 |"}

## Issue Codes

${codeLines || "- None"}

## Top Issue Rows

| id | batch | grade | topic | severity | issue codes | details |
| --- | --- | --- | --- | --- | --- | --- |
${topIssues || "| None |  |  |  |  |  |  |"}

## Notes

- This is a DeepSeek-assisted QA pass, not a production approval by itself.
- DeepSeek was asked to independently solve and check only the two requested hard gates: solvability and answer/question match.
- Any \`needs-review\` row should go to S18 math adjudication before source-data edits.
- This task did not edit \`data/mainlandPepHighQuestions.ts\`, feature UI, API routes, or shared types.
- The API key was provided at runtime only and is not stored in this artifact.
`
  );
}

function readApiKey() {
  const envKey = process.env.LLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim() || process.env.DEEPSEEK_API_KEY?.trim();
  if (envKey) return envKey;
  if (!readApiKeyFromStdin) return "";
  return fs.readFileSync(0, "utf8").trim().split(/\r?\n/)[0]?.trim() ?? "";
}

async function main() {
  const apiKey = readApiKey();
  const apiUrl = process.env.LLM_API_URL?.trim() || "https://api.deepseek.com/chat/completions";
  const model = process.env.LLM_MODEL?.trim() || "deepseek-v4-pro";
  const startedAt = new Date().toISOString();

  if (!apiKey) throw new Error("Missing LLM_API_KEY, OPENAI_API_KEY, DEEPSEEK_API_KEY, or stdin API key");
  if (!new URL(apiUrl).host.includes("api.deepseek.com")) throw new Error(`Refusing non-DeepSeek endpoint for this task: ${new URL(apiUrl).host}`);
  if (model !== "deepseek-v4-pro") throw new Error(`Refusing non-DeepSeek V4 Pro model for this task: ${model}`);
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 20) throw new Error(`Invalid PEP_HIGH_DEEPSEEK_QA_BATCH_SIZE: ${batchSize}`);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) throw new Error(`Invalid PEP_HIGH_DEEPSEEK_QA_CONCURRENCY: ${concurrency}`);
  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 30000 || requestTimeoutMs > 240000) {
    throw new Error(`Invalid PEP_HIGH_DEEPSEEK_QA_TIMEOUT_MS: ${requestTimeoutMs}`);
  }

  fs.mkdirSync(batchDir, { recursive: true });
  const rows = loadQuestions();
  const selected = selectQuestions(rows);
  const batches = chunk(selected, batchSize);
  console.log(
    `DeepSeek PEP high QA starting: scope=${scope}, rows=${selected.length}, batches=${batches.length}, model=${model}, endpoint=${new URL(apiUrl).host}, ` +
      `cacheRunId=${cacheRunId || "default"}, forceCacheRefresh=${forceCacheRefresh ? "yes" : "no"}, concurrency=${concurrency}`
  );

  const reviews = [];
  let nextBatchIndex = 0;
  async function worker(workerIndex) {
    while (nextBatchIndex < batches.length) {
      const index = nextBatchIndex;
      nextBatchIndex += 1;
      const questions = batches[index];
      console.log(
        `worker ${workerIndex}: batch ${index + 1}/${batches.length}: ${batchIdFor(index)} ${questions[0].batch} ${questions[0].grade} ${questions[0].topicId}`
      );
      const batchReviews = await qaBatch({ questions, batchIndex: index, apiUrl, apiKey, model });
      reviews.push(...batchReviews);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, batches.length) }, (_, index) => worker(index + 1)));
  reviews.sort((left, right) => left.id.localeCompare(right.id));
  const finishedAt = new Date().toISOString();
  writeOutputs({ reviews, questions: selected, model, apiUrl, startedAt, finishedAt });
  const questionById = new Map(selected.map((question) => [question.id, question]));
  const summary = buildSummary(
    reviews.map((review) => ({
      ...review,
      batch: questionById.get(review.id)?.batch ?? "",
      grade: questionById.get(review.id)?.grade ?? ""
    }))
  );
  console.log(`DeepSeek PEP high QA complete: reviewed ${summary.counts.total}, pass ${summary.counts.pass}, needs-review ${summary.counts.needsReview}.`);
}

main().catch((error) => {
  console.error(String(error?.message ?? error).replace(/sk-[A-Za-z0-9]+/g, "[REDACTED_API_KEY]"));
  process.exitCode = 1;
});
