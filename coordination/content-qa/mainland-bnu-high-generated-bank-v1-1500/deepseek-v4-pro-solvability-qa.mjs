import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
const inputJsonl = path.join(__dirname, "questions.jsonl");
const localRemediationCsv = path.join(__dirname, "remediation-queue.csv");
const outputDir = path.join(__dirname, "deepseek-v4-pro-solvability-qa");
const batchDir = path.join(outputDir, "batches");

const defaultBatchSize = 8;
const defaultConcurrency = 2;
const maxTokens = 8000;
const maxAttempts = 4;
const requestTimeoutMs = 180000;
const validSolvableStatuses = new Set(["pass", "fail", "uncertain"]);
const validAnswerMatchStatuses = new Set(["pass", "fail", "not_checkable"]);
const validExplanationMatchStatuses = new Set(["pass", "fail", "weak", "not_checkable"]);
const validIssueTags = new Set([
  "math_error",
  "answer_mismatch",
  "ambiguous_mc",
  "bad_options",
  "missing_condition",
  "explanation_contradiction",
  "unsolvable",
  "accepted_answer_gap",
  "rag_fit_issue",
  "language_issue"
]);
const validSeverities = new Set(["none", "minor", "major", "blocker"]);
const validConfidence = new Set(["low", "medium", "high"]);

function readLocalEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    env[match[1]] = value;
  }
  return env;
}

function readJsonl(filePath) {
  return fs.readFileSync(filePath, "utf8").trim().split(/\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function loadTsExport(filePath, exportName) {
  let source = fs.readFileSync(filePath, "utf8");
  source = source
    .replace(/^import\s+.*;\s*$/gm, "")
    .replace(/\b(const|let|var)\s+([A-Za-z_$][\w$]*)\s*:\s*[^=;]+=/g, "$1 $2 =")
    .replace(/\s+as\s+const\b/g, "")
    .replace(/\s+as\s+[A-Za-z_$][\w$]*(?:\[\])?/g, "")
    .replace(new RegExp(`export const ${exportName}(?:: [^=]+)? =`), `exports.${exportName} =`)
    .replace(/export const ([A-Za-z_$][\w$]*)(?:: [^=]+)? =/g, "const $1 =");
  const context = { exports: {} };
  vm.runInNewContext(source, context, { filename: filePath });
  return context.exports[exportName];
}

function parseArgs(argv) {
  const args = {
    batchSize: defaultBatchSize,
    concurrency: defaultConcurrency,
    limit: null,
    offset: 0,
    force: false
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--force") args.force = true;
    else if (arg === "--batch-size") args.batchSize = Number(argv[++index]);
    else if (arg === "--concurrency") args.concurrency = Number(argv[++index]);
    else if (arg === "--limit") args.limit = Number(argv[++index]);
    else if (arg === "--offset") args.offset = Number(argv[++index]);
  }
  if (!Number.isInteger(args.batchSize) || args.batchSize < 1 || args.batchSize > 12) throw new Error("--batch-size must be an integer from 1 to 12.");
  if (!Number.isInteger(args.concurrency) || args.concurrency < 1 || args.concurrency > 4) throw new Error("--concurrency must be an integer from 1 to 4.");
  if (args.limit !== null && (!Number.isInteger(args.limit) || args.limit < 1)) throw new Error("--limit must be a positive integer.");
  if (!Number.isInteger(args.offset) || args.offset < 0) throw new Error("--offset must be a non-negative integer.");
  return args;
}

function chunkRows(rows, batchSize) {
  const batches = [];
  for (let index = 0; index < rows.length; index += batchSize) batches.push(rows.slice(index, index + batchSize));
  return batches;
}

function compactTextbookCard(card) {
  if (!card) return null;
  return {
    id: card.id,
    gradeScope: card.grades,
    semesterScope: card.semesters,
    volume: card.volume,
    chapter: card.chapter,
    conceptIds: card.conceptIds,
    competencyTags: card.competencyTags,
    itemTypeTags: card.itemTypeTags,
    difficultyBand: card.difficultyBand,
    safeSummary: card.safeSummary,
    generationGuidance: card.generationGuidance,
    misconceptionTags: card.misconceptionTags
  };
}

function compactAssessmentCard(card) {
  if (!card) return null;
  return {
    id: card.id,
    gradeScope: card.grades,
    semesterScope: card.semesters,
    volumeScope: card.volumeScope,
    chapters: card.chapters,
    unitTitles: card.unitTitles,
    assessmentFamilies: card.assessmentFamilies,
    conceptIds: card.conceptIds,
    skillTags: card.skillTags,
    itemTypeTags: card.itemTypeTags,
    difficultyBand: card.difficultyBand,
    patternSummary: card.patternSummary,
    solutionStrategyTags: card.solutionStrategyTags,
    misconceptionTags: card.misconceptionTags
  };
}

function compactQuestion(row, evidenceMaps) {
  return {
    id: row.id,
    grade: row.grade,
    semester: row.semester,
    topicId: row.topicId,
    topicTitleZhHans: row.topicTitleZhHans,
    volume: row.volume,
    chapter: row.chapter,
    type: row.type,
    difficulty: row.difficulty,
    promptZhHans: row.promptZhHans,
    optionsZhHans: row.optionsZhHans,
    answer: row.answer,
    acceptedAnswers: row.acceptedAnswers,
    explanationZhHans: row.explanationZhHans,
    localAuditStatus: {
      sourceDistanceStatus: row.sourceDistanceStatus,
      mathQaStatus: row.mathQaStatus,
      terminologyQaStatus: row.terminologyQaStatus,
      manualQaStatus: row.manualQaStatus,
      reviewNotes: row.reviewNotes
    },
    safeBnuTextbookEvidence: (row.evidenceCardIds ?? []).map((id) => compactTextbookCard(evidenceMaps.curriculum.get(id))).filter(Boolean),
    safeBnuAssessmentPatternEvidence: (row.assessmentPatternCardIds ?? []).map((id) => compactAssessmentCard(evidenceMaps.assessment.get(id))).filter(Boolean)
  };
}

function buildMessages(batch, evidenceMaps) {
  return [
    {
      role: "system",
      content: [
        "You are S18, a strict Mainland China senior-secondary math QA reviewer.",
        "Review Beijing Normal University Press high-school candidate questions before any public integration.",
        "Your job is independent solvability QA: decide whether each item can be solved from the prompt/options alone, whether the stored answer or acceptedAnswers match the independent solution, and whether the explanation agrees with the question and answer.",
        "Use the provided safe BNU RAG cards only for grade/chapter/topic fit and expected skill scope; never treat RAG as an answer key and never cite protected textbook source text.",
        "Be strict: fail wrong answers, incomplete answers, missing conditions, hidden diagram assumptions, multiple-choice ambiguity, duplicate/invalid options, no correct option, multiple correct options, and explanations that contradict the actual solution.",
        "Do not reject merely because local mathQaStatus is pending-s18-review; that is expected.",
        "Return JSON only. Do not include markdown.",
        "Use this exact schema:",
        '{"items":[{"id":"string","solvableStatus":"pass|fail|uncertain","answerMatchStatus":"pass|fail|not_checkable","explanationMatchStatus":"pass|fail|weak|not_checkable","independentAnswer":"string|null","correctedAnswer":"string|null","issueTags":["math_error|answer_mismatch|ambiguous_mc|bad_options|missing_condition|explanation_contradiction|unsolvable|accepted_answer_gap|rag_fit_issue|language_issue"],"severity":"none|minor|major|blocker","confidence":"low|medium|high","rationaleZhHans":"short Chinese reason"}],"batchSummary":{"pass":0,"warn":0,"fail":0,"notes":"short Chinese summary"}}',
        "For clean items use solvableStatus pass, answerMatchStatus pass, explanationMatchStatus pass or weak, issueTags [], severity none, and correctedAnswer null.",
        "Use severity blocker for unsolvable, wrong answer, no unique MC answer, multiple correct MC options, or explanation contradicting the answer.",
        "Use severity major for accepted-answer gaps, missing nonessential condition, or serious grade/topic mismatch.",
        "Keep rationaleZhHans concise and specific; do not include private chain-of-thought."
      ].join("\n")
    },
    {
      role: "user",
      content: `请用 JSON 逐题审核以下 ${batch.length} 道北师大版高中候选题，重点检查是否可解、答案是否与题目匹配、解析是否与答案一致：\n${JSON.stringify(batch.map((row) => compactQuestion(row, evidenceMaps)))}`
    }
  ];
}

function parseJsonObject(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) throw new Error("empty model response");
  const candidates = [];
  candidates.push(trimmed);
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) candidates.push(fenced[1]);
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  let lastError = null;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
      try {
        return JSON.parse(candidate.replace(/\\(?!["\\/bfnrtu])/g, "\\\\"));
      } catch {
        // Continue trying other candidates.
      }
    }
  }
  throw lastError ?? new Error("response is not parseable JSON");
}

function normalizeItem(item) {
  return {
    id: String(item.id ?? ""),
    solvableStatus: validSolvableStatuses.has(item.solvableStatus) ? item.solvableStatus : "uncertain",
    answerMatchStatus: validAnswerMatchStatuses.has(item.answerMatchStatus) ? item.answerMatchStatus : "not_checkable",
    explanationMatchStatus: validExplanationMatchStatuses.has(item.explanationMatchStatus) ? item.explanationMatchStatus : "not_checkable",
    independentAnswer: item.independentAnswer === null || item.independentAnswer === undefined ? null : String(item.independentAnswer),
    correctedAnswer: item.correctedAnswer === null || item.correctedAnswer === undefined ? null : String(item.correctedAnswer),
    issueTags: Array.isArray(item.issueTags) ? item.issueTags.map(String).filter((tag) => validIssueTags.has(tag)) : [],
    severity: validSeverities.has(item.severity) ? item.severity : "major",
    confidence: validConfidence.has(item.confidence) ? item.confidence : "low",
    rationaleZhHans: String(item.rationaleZhHans ?? "").trim()
  };
}

function validateBatchResult(result, batch) {
  if (!result || !Array.isArray(result.items)) throw new Error("result.items is missing");
  const expectedIds = new Set(batch.map((row) => row.id));
  const seenIds = new Set();
  const normalizedItems = [];
  for (const rawItem of result.items) {
    const item = normalizeItem(rawItem);
    if (!expectedIds.has(item.id)) throw new Error(`unexpected result id ${item.id}`);
    if (seenIds.has(item.id)) throw new Error(`duplicate result id ${item.id}`);
    seenIds.add(item.id);
    if (!item.rationaleZhHans) throw new Error(`missing rationaleZhHans for ${item.id}`);
    normalizedItems.push(item);
  }
  for (const id of expectedIds) {
    if (!seenIds.has(id)) throw new Error(`missing result id ${id}`);
  }
  return {
    items: normalizedItems,
    batchSummary: {
      pass: Number(result.batchSummary?.pass ?? normalizedItems.filter((item) => item.severity === "none").length),
      warn: Number(result.batchSummary?.warn ?? normalizedItems.filter((item) => item.severity === "minor" || item.severity === "major").length),
      fail: Number(result.batchSummary?.fail ?? normalizedItems.filter((item) => item.severity === "blocker").length),
      notes: String(result.batchSummary?.notes ?? "")
    }
  };
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function postJsonWithOptionalPinnedIp({ apiUrl, apiKey, body, resolveIp }) {
  const url = new URL(apiUrl);
  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json"
        },
        lookup: resolveIp
          ? (_hostname, options, callback) => {
              if (options?.all) {
                callback(null, [{ address: resolveIp, family: 4 }]);
                return;
              }
              callback(null, resolveIp, 4);
            }
          : undefined,
        timeout: requestTimeoutMs
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          resolve({
            ok: response.statusCode >= 200 && response.statusCode < 300,
            status: response.statusCode,
            text: () => Promise.resolve(Buffer.concat(chunks).toString("utf8"))
          });
        });
      }
    );
    request.on("timeout", () => request.destroy(new Error("DeepSeek request timeout")));
    request.on("error", reject);
    request.write(JSON.stringify(body));
    request.end();
  });
}

async function callDeepSeek({ apiKey, apiUrl, model, messages, resolveIp }) {
  const body = {
    model,
    messages,
    response_format: { type: "json_object" },
    thinking: { type: "disabled" },
    stream: false,
    temperature: 0.1,
    max_tokens: maxTokens
  };
  let response;
  if (resolveIp) {
    response = await postJsonWithOptionalPinnedIp({ apiUrl, apiKey, body, resolveIp });
  } else {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const message = payload?.error?.message ?? text.replace(apiKey, "[REDACTED_API_KEY]").slice(0, 300);
    throw new Error(`DeepSeek HTTP ${response.status}: ${message}`);
  }
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("DeepSeek response did not include message content");
  return {
    content,
    usage: payload?.usage ?? null,
    finishReason: payload?.choices?.[0]?.finish_reason ?? null
  };
}

function batchFileName(batchNumber) {
  return path.join(batchDir, `batch-${String(batchNumber).padStart(3, "0")}.json`);
}

function cacheMatchesBatch(record, batch) {
  const expected = batch.map((row) => row.id).join("|");
  const actual = (record.itemIds ?? []).join("|");
  if (expected !== actual) return false;
  validateBatchResult(record.result, batch);
  return true;
}

async function reviewBatch({ batch, batchNumber, config, force, evidenceMaps }) {
  const filePath = batchFileName(batchNumber);
  if (!force && fs.existsSync(filePath)) {
    const cached = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (cacheMatchesBatch(cached, batch)) return { ...cached, cached: true };
  }

  const messages = buildMessages(batch, evidenceMaps);
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const startedAt = new Date().toISOString();
      const response = await callDeepSeek({ ...config, messages });
      const result = validateBatchResult(parseJsonObject(response.content), batch);
      const record = {
        batchNumber,
        startedAt,
        completedAt: new Date().toISOString(),
        model: config.model,
        itemIds: batch.map((row) => row.id),
        usage: response.usage,
        finishReason: response.finishReason,
        result
      };
      fs.writeFileSync(filePath, `${JSON.stringify(record, null, 2)}\n`);
      return { ...record, cached: false };
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) await sleep(2000 * attempt);
    }
  }
  throw lastError;
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"` : text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function localDateString(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Hong_Kong",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function readCsvIds(filePath) {
  if (!fs.existsSync(filePath)) return new Set();
  const [headerLine, ...lines] = fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(headerLine);
  const idIndex = headers.indexOf("id");
  if (idIndex === -1) return new Set();
  return new Set(lines.map((line) => parseCsvLine(line)[idIndex]).filter(Boolean));
}

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && inQuotes && line[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}

function qaOutputConcernTags(item) {
  const text = item.rationaleZhHans ?? "";
  const tags = [];
  if (/误判|判断错误|重新审视|重新检查|为何我标记|我之前/.test(text)) tags.push("self_correction_language");
  if (item.status !== "pass" && /无问题|答案正确|最终答案正确|与存储答案一致|与答案一致|无需/.test(text)) tags.push("status_rationale_tension");
  if (String(text).length > 600) tags.push("overlong_rationale");
  return tags;
}

function summarize(records, questions) {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const itemResults = records.flatMap((record) =>
    record.result.items.map((item) => {
      const question = byId.get(item.id);
      const status =
        item.severity === "blocker" || item.solvableStatus === "fail" || item.answerMatchStatus === "fail" || item.explanationMatchStatus === "fail"
          ? "fail"
          : item.severity === "major" || item.severity === "minor" || item.solvableStatus === "uncertain" || item.answerMatchStatus === "not_checkable"
            ? "warn"
            : "pass";
      const enriched = {
        ...item,
        status,
        grade: question?.grade,
        semester: question?.semester,
        type: question?.type,
        difficulty: question?.difficulty,
        topicId: question?.topicId,
        topicTitleZhHans: question?.topicTitleZhHans,
        volume: question?.volume,
        chapter: question?.chapter,
        promptZhHans: question?.promptZhHans,
        answer: question?.answer,
        acceptedAnswers: Array.isArray(question?.acceptedAnswers) ? question.acceptedAnswers.join(" | ") : ""
      };
      return {
        ...enriched,
        qaOutputConcernTags: qaOutputConcernTags(enriched)
      };
    })
  );
  const countBy = (values) => values.reduce((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
  const statusCounts = countBy(itemResults.map((item) => item.status));
  const severityCounts = countBy(itemResults.map((item) => item.severity));
  const solvableCounts = countBy(itemResults.map((item) => item.solvableStatus));
  const answerMatchCounts = countBy(itemResults.map((item) => item.answerMatchStatus));
  const explanationMatchCounts = countBy(itemResults.map((item) => item.explanationMatchStatus));
  const issueTagCounts = countBy(itemResults.flatMap((item) => item.issueTags));
  const confidenceCounts = countBy(itemResults.map((item) => item.confidence));
  const qaOutputConcernCounts = countBy(itemResults.flatMap((item) => item.qaOutputConcernTags));
  const usage = records.reduce(
    (total, record) => {
      total.promptTokens += record.usage?.prompt_tokens ?? 0;
      total.completionTokens += record.usage?.completion_tokens ?? 0;
      total.totalTokens += record.usage?.total_tokens ?? 0;
      return total;
    },
    { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
  );
  const issues = itemResults.filter((item) => item.status !== "pass" || item.severity !== "none" || item.issueTags.length);
  return {
    itemResults,
    statusCounts,
    severityCounts,
    solvableCounts,
    answerMatchCounts,
    explanationMatchCounts,
    issueTagCounts,
    confidenceCounts,
    qaOutputConcernCounts,
    usage,
    issues
  };
}

function compareWithLocalRemediation(issues) {
  const localIds = readCsvIds(localRemediationCsv);
  const deepseekIds = new Set(issues.map((item) => item.id));
  const overlap = [...deepseekIds].filter((id) => localIds.has(id)).sort();
  const deepseekOnly = [...deepseekIds].filter((id) => !localIds.has(id)).sort();
  const localOnly = [...localIds].filter((id) => !deepseekIds.has(id)).sort();
  return {
    localRemediationCount: localIds.size,
    deepseekIssueCount: deepseekIds.size,
    overlapCount: overlap.length,
    deepseekOnlyCount: deepseekOnly.length,
    localOnlyCount: localOnly.length,
    overlap,
    deepseekOnly,
    localOnly
  };
}

function writeSummary({ records, questions, config, args }) {
  const summary = summarize(records, questions);
  const comparison = compareWithLocalRemediation(summary.issues);
  const generatedAt = new Date().toISOString();
  const resultJson = {
    generatedAt,
    model: config.model,
    apiHost: new URL(config.apiUrl).hostname,
    scope: "mainland-bnu-high-v1-1500-candidate",
    batchSize: args.batchSize,
    concurrency: args.concurrency,
    totalQuestionsInScope: questions.length,
    reviewedCount: summary.itemResults.length,
    statusCounts: summary.statusCounts,
    severityCounts: summary.severityCounts,
    solvableCounts: summary.solvableCounts,
    answerMatchCounts: summary.answerMatchCounts,
    explanationMatchCounts: summary.explanationMatchCounts,
    issueTagCounts: summary.issueTagCounts,
    confidenceCounts: summary.confidenceCounts,
    qaOutputConcernCounts: summary.qaOutputConcernCounts,
    localAuditComparison: comparison,
    usage: summary.usage,
    issues: summary.issues,
    results: summary.itemResults
  };

  fs.writeFileSync(path.join(outputDir, "deepseek-solvability-results.json"), `${JSON.stringify(resultJson, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "deepseek-solvability-results.jsonl"), `${summary.itemResults.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const columns = [
    "id",
    "grade",
    "semester",
    "type",
    "difficulty",
    "topicId",
    "topicTitleZhHans",
    "volume",
    "chapter",
    "status",
    "severity",
    "confidence",
    "solvableStatus",
    "answerMatchStatus",
    "explanationMatchStatus",
    "independentAnswer",
    "correctedAnswer",
    "issueTags",
    "qaOutputConcernTags",
    "rationaleZhHans",
    "answer",
    "acceptedAnswers",
    "promptZhHans"
  ];
  writeCsv(path.join(outputDir, "deepseek-solvability-results.csv"), summary.itemResults, columns);
  writeCsv(path.join(outputDir, "deepseek-solvability-issues.csv"), summary.issues, columns);
  writeCsv(path.join(outputDir, "deepseek-remediation-queue.csv"), summary.issues.filter((item) => item.status === "fail" || item.severity === "blocker" || item.severity === "major"), columns);
  writeCsv(
    path.join(outputDir, "deepseek-s18-adjudication-priority.csv"),
    summary.issues.filter((item) => item.qaOutputConcernTags.length || item.status === "fail" || item.severity === "blocker" || item.severity === "major"),
    columns
  );

  const discrepancyRows = [
    ...comparison.deepseekOnly.map((id) => ({ id, source: "deepseek-only" })),
    ...comparison.localOnly.map((id) => ({ id, source: "local-audit-only" }))
  ];
  writeCsv(path.join(outputDir, "deepseek-local-audit-disagreements.csv"), discrepancyRows, ["id", "source"]);

  const issuePreview = summary.issues.length
    ? summary.issues
        .slice(0, 100)
        .map(
          (item) =>
            `| \`${item.id}\` | ${item.grade} | ${item.type} | ${item.status} | ${item.severity} | ${item.solvableStatus}/${item.answerMatchStatus}/${item.explanationMatchStatus} | ${item.issueTags.join(", ") || "-"} | ${item.rationaleZhHans} |`
        )
        .join("\n")
    : "| None | - | - | - | - | - | - | - |";

  const markdown = `# DeepSeek V4 Pro Solvability QA - Mainland BNU High V1 Candidate

- Date: ${localDateString()}
- Session ID: S18
- Scope: \`coordination/content-qa/mainland-bnu-high-generated-bank-v1-1500/questions.jsonl\`
- Model: \`${config.model}\`
- API host: \`${new URL(config.apiUrl).hostname}\`
- Reviewed rows: ${summary.itemResults.length}
- Status counts: ${Object.entries(summary.statusCounts).map(([key, value]) => `${key} ${value}`).join(", ")}
- Severity counts: ${Object.entries(summary.severityCounts).map(([key, value]) => `${key} ${value}`).join(", ")}
- Solvable counts: ${Object.entries(summary.solvableCounts).map(([key, value]) => `${key} ${value}`).join(", ")}
- Answer-match counts: ${Object.entries(summary.answerMatchCounts).map(([key, value]) => `${key} ${value}`).join(", ")}
- Explanation-match counts: ${Object.entries(summary.explanationMatchCounts).map(([key, value]) => `${key} ${value}`).join(", ")}
- Issue tag counts: ${Object.entries(summary.issueTagCounts).map(([key, value]) => `${key} ${value}`).join(", ") || "none"}
- DeepSeek output concern counts: ${Object.entries(summary.qaOutputConcernCounts).map(([key, value]) => `${key} ${value}`).join(", ") || "none"}
- Token usage: prompt ${summary.usage.promptTokens}, completion ${summary.usage.completionTokens}, total ${summary.usage.totalTokens}

## QA Gate Result

${summary.issues.length === 0
    ? "DeepSeek V4 Pro found 0 warn/fail items in this run. This supports S18 review but does not automatically promote the bank."
    : `DeepSeek V4 Pro flagged ${summary.issues.length} item(s). These require S18 review or remediation before public promotion.`}

## Local Audit Comparison

- Local remediation rows: ${comparison.localRemediationCount}
- DeepSeek issue rows: ${comparison.deepseekIssueCount}
- Overlap: ${comparison.overlapCount}
- DeepSeek-only issue rows: ${comparison.deepseekOnlyCount}
- Local-audit-only rows: ${comparison.localOnlyCount}
- Disagreement CSV: \`deepseek-local-audit-disagreements.csv\`

## Issue Preview

| ID | Grade | Type | Status | Severity | Solvable/Answer/Explanation | Tags | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- |
${issuePreview}

## Notes

- This run used the local redacted DeepSeek provider configuration. No secret values are recorded in this artifact.
- RAG cards were used only for grade/chapter/topic fit, not as an answer key.
- This QA artifact does not edit candidate questions or promote public \`data/questions.ts\` entries.
- Rows with \`qaOutputConcernTags\` need S18 human adjudication before their DeepSeek rationale is used as remediation evidence.
`;
  fs.writeFileSync(path.join(outputDir, "deepseek-solvability-summary.md"), markdown);

  const decision = `# S18 DeepSeek QA Decision - Mainland BNU High V1

- Date: ${localDateString()}
- Session ID: S18
- Reviewed rows: ${summary.itemResults.length}
- DeepSeek issue rows: ${summary.issues.length}
- Fail/blocker/major remediation rows: ${summary.issues.filter((item) => item.status === "fail" || item.severity === "blocker" || item.severity === "major").length}
- Decision: Not approved for product integration until all fail/blocker/major rows are remediated and S18 manual sampling is complete.

## Required Next Step

Use \`deepseek-remediation-queue.csv\` and \`deepseek-local-audit-disagreements.csv\` for S18 adjudication, then rerun this DeepSeek QA plus the local \`audit-solvability.mjs\` gate before any S04 question-bank integration.

Rows in \`deepseek-s18-adjudication-priority.csv\` that carry \`qaOutputConcernTags\` should be reviewed first because the model's status and written rationale may be internally tense or self-correcting.
`;
  fs.writeFileSync(path.join(outputDir, "s18-deepseek-qa-decision.md"), decision);
  return resultJson;
}

async function main() {
  const args = parseArgs(process.argv);
  const localEnv = readLocalEnv(path.join(projectRoot, ".env.local"));
  const apiKey = localEnv.LLM_API_KEY || process.env.LLM_API_KEY || localEnv.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const apiUrl = localEnv.LLM_API_URL || process.env.LLM_API_URL || "https://api.deepseek.com/chat/completions";
  const model = localEnv.LLM_MODEL || process.env.LLM_MODEL || "deepseek-v4-pro";
  const resolveIp = localEnv.DEEPSEEK_API_RESOLVE_IP || process.env.DEEPSEEK_API_RESOLVE_IP || null;
  if (!apiKey) throw new Error("Missing LLM_API_KEY or OPENAI_API_KEY in .env.local or process env.");
  if (!new URL(apiUrl).hostname.includes("api.deepseek.com")) throw new Error(`Refusing non-DeepSeek endpoint: ${new URL(apiUrl).hostname}`);
  if (model !== "deepseek-v4-pro") throw new Error(`Refusing non-DeepSeek V4 Pro model: ${model}`);
  if (resolveIp && !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(resolveIp)) throw new Error("DEEPSEEK_API_RESOLVE_IP must be an IPv4 address.");

  fs.mkdirSync(batchDir, { recursive: true });
  const allQuestions = readJsonl(inputJsonl);
  const scopedQuestions = allQuestions.slice(args.offset, args.limit === null ? undefined : args.offset + args.limit);
  const batches = chunkRows(scopedQuestions, args.batchSize);
  const curriculumCards = loadTsExport(path.join(projectRoot, "data/rag/mainlandBnuHigh.ts"), "mainlandBnuHighRagCards");
  const assessmentCards = loadTsExport(path.join(projectRoot, "data/rag/mainlandBnuHighAssessmentPatterns.ts"), "mainlandBnuHighAssessmentPatternCards");
  const evidenceMaps = {
    curriculum: new Map(curriculumCards.map((card) => [card.id, card])),
    assessment: new Map(assessmentCards.map((card) => [card.id, card]))
  };
  const config = { apiKey, apiUrl, model, resolveIp };
  const records = new Array(batches.length);
  let nextBatchIndex = 0;
  const workerCount = Math.min(args.concurrency, batches.length);

  console.log(
    JSON.stringify({
      event: "deepseek-solvability-qa-start",
      model,
      apiHost: new URL(apiUrl).hostname,
      resolveIpConfigured: Boolean(resolveIp),
      questions: scopedQuestions.length,
      batches: batches.length,
      batchSize: args.batchSize,
      concurrency: workerCount
    })
  );

  async function runWorker(workerIndex) {
    while (nextBatchIndex < batches.length) {
      const index = nextBatchIndex;
      nextBatchIndex += 1;
      const batch = batches[index];
      const batchNumber = Math.floor((args.offset + index * args.batchSize) / args.batchSize) + 1;
      const record = await reviewBatch({ batch, batchNumber, config, force: args.force, evidenceMaps });
      records[index] = record;
      const statusCounts = record.result.items.reduce((counts, item) => {
        const status =
          item.severity === "blocker" || item.solvableStatus === "fail" || item.answerMatchStatus === "fail" || item.explanationMatchStatus === "fail"
            ? "fail"
            : item.severity === "major" || item.severity === "minor" || item.solvableStatus === "uncertain" || item.answerMatchStatus === "not_checkable"
              ? "warn"
              : "pass";
        counts[status] = (counts[status] ?? 0) + 1;
        return counts;
      }, {});
      console.log(
        JSON.stringify({
          event: "deepseek-solvability-qa-batch",
          worker: workerIndex + 1,
          batchNumber,
          cached: record.cached,
          items: record.result.items.length,
          statusCounts
        })
      );
    }
  }

  await Promise.all(Array.from({ length: workerCount }, (_, index) => runWorker(index)));
  const result = writeSummary({ records, questions: scopedQuestions, config, args });
  console.log(
    JSON.stringify({
      event: "deepseek-solvability-qa-complete",
      reviewedCount: result.reviewedCount,
      statusCounts: result.statusCounts,
      severityCounts: result.severityCounts,
      issues: result.issues.length,
      summaryPath: path.relative(projectRoot, path.join(outputDir, "deepseek-solvability-summary.md"))
    })
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      event: "deepseek-solvability-qa-error",
      message: String(error?.message ?? error).replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]")
    })
  );
  process.exitCode = 1;
});
