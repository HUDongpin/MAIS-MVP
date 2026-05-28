import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
const inputJsonl = path.join(__dirname, "questions.jsonl");
const localRemediationCsv = path.join(__dirname, "remediation-queue.csv");
const baselineResultsJson = path.join(__dirname, "deepseek-v4-pro-solvability-qa", "deepseek-solvability-results.json");
const outputDir = path.join(__dirname, "deepseek-v4-pro-full-rag-qa");
const batchDir = path.join(outputDir, "batches");

const defaultBatchSize = 8;
const defaultConcurrency = 2;
const maxTokens = 8000;
const maxAttempts = 6;
const requestTimeoutMs = 60000;
const validSolvableStatuses = new Set(["pass", "fail", "uncertain"]);
const validRagFitStatuses = new Set(["pass", "fail", "uncertain"]);
const validAnswerMatchStatuses = new Set(["pass", "fail", "not_checkable"]);
const validExplanationMatchStatuses = new Set(["pass", "fail", "weak", "not_checkable"]);
const validMcUniquenessStatuses = new Set(["pass", "fail", "not_applicable", "not_checkable"]);
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
  "language_issue",
  "source_distance_risk",
  "provider_timeout"
]);
const validSeverities = new Set(["none", "minor", "major", "blocker"]);
const validConfidence = new Set(["low", "medium", "high"]);
const severityRank = { none: 0, minor: 1, major: 2, blocker: 3 };

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
    .replace(/\s+satisfies\s+[A-Za-z_$][\w$]*(?:\[\])?/g, "")
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

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
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

function safeEvidenceForQuestion(row, evidenceMaps) {
  return {
    safeBnuTextbookEvidence: (row.evidenceCardIds ?? []).map((id) => compactTextbookCard(evidenceMaps.curriculum.get(id))).filter(Boolean),
    safeBnuAssessmentPatternEvidence: (row.assessmentPatternCardIds ?? []).map((id) => compactAssessmentCard(evidenceMaps.assessment.get(id))).filter(Boolean)
  };
}

function compactQuestionForStageA(row, evidenceMaps) {
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
    conceptIds: row.conceptIds,
    competencyTags: row.competencyTags,
    skillTags: row.skillTags,
    promptZhHans: row.promptZhHans,
    optionsZhHans: row.optionsZhHans,
    localQaStatus: {
      sourceDistanceStatus: row.sourceDistanceStatus,
      mathQaStatus: row.mathQaStatus,
      terminologyQaStatus: row.terminologyQaStatus,
      manualQaStatus: row.manualQaStatus
    },
    ...safeEvidenceForQuestion(row, evidenceMaps)
  };
}

function compactQuestionForStageB(row, evidenceMaps, stageAItem) {
  return {
    ...compactQuestionForStageA(row, evidenceMaps),
    stageAIndependentReview: stageAItem,
    answer: row.answer,
    acceptedAnswers: row.acceptedAnswers,
    explanationZhHans: row.explanationZhHans
  };
}

function compactQuestionForStageC(row, evidenceMaps, stageAItem, stageBItem, localFlag, baselineItem) {
  return {
    ...compactQuestionForStageB(row, evidenceMaps, stageAItem),
    stageBComparisonReview: stageBItem,
    localAuditFlagged: localFlag,
    baselineDeepSeekStatus: baselineItem
      ? {
          status: baselineItem.status,
          severity: baselineItem.severity,
          solvableStatus: baselineItem.solvableStatus,
          answerMatchStatus: baselineItem.answerMatchStatus,
          explanationMatchStatus: baselineItem.explanationMatchStatus,
          issueTags: baselineItem.issueTags
        }
      : null
  };
}

function buildStageAMessages(batch, evidenceMaps) {
  return [
    {
      role: "system",
      content: [
        "You are S18, a strict Mainland China senior-secondary math QA reviewer.",
        "Stage A is blind independent solvability review for Beijing Normal University Press high-school candidate questions.",
        "You must not see or infer from stored answers or explanations. Solve only from the prompt, options, grade/chapter metadata, and safe BNU RAG cards.",
        "Use safe BNU RAG only for grade/chapter/topic fit and expected skill scope. Never treat RAG as an answer key and never cite protected source wording.",
        "Fail or mark uncertain when the item lacks necessary conditions, has hidden diagram assumptions, has no unique MC answer, multiple correct MC options, invalid options, or cannot be solved from the prompt/options alone.",
        "Return JSON only. Do not include markdown.",
        "Use this exact schema:",
        '{"items":[{"id":"string","solvableStatus":"pass|fail|uncertain","ragFitStatus":"pass|fail|uncertain","independentAnswer":"string|null","issueTags":["math_error|ambiguous_mc|bad_options|missing_condition|unsolvable|rag_fit_issue|language_issue|source_distance_risk"],"severity":"none|minor|major|blocker","confidence":"low|medium|high","rationaleZhHans":"short Chinese reason"}],"batchSummary":{"pass":0,"warn":0,"fail":0,"notes":"short Chinese summary"}}',
        "For clean items use solvableStatus pass, ragFitStatus pass, issueTags [], severity none, and a concise independent answer.",
        "Use severity blocker for unsolvable, no correct MC option, multiple correct MC options, or missing condition that changes the answer.",
        "Keep rationaleZhHans concise and specific; do not include private chain-of-thought."
      ].join("\n")
    },
    {
      role: "user",
      content: `请进行 Stage A 盲审：逐题独立求解以下 ${batch.length} 道北师大版高中候选题。不要检查题库答案，因为这里没有提供答案。\n${JSON.stringify(batch.map((row) => compactQuestionForStageA(row, evidenceMaps)))}`
    }
  ];
}

function buildStageBMessages(batch, evidenceMaps, stageAById) {
  return [
    {
      role: "system",
      content: [
        "You are S18, a strict Mainland China senior-secondary math QA reviewer.",
        "Stage B compares stored answers and explanations against Stage A independent solutions.",
        "Use the prompt/options and Stage A independent answer as the primary mathematical reference. Use safe BNU RAG only for grade/chapter/topic fit, not as an answer key.",
        "Be strict: fail wrong stored answers, accepted-answer gaps, incomplete explanations, explanation-answer contradictions, single-choice questions with zero or multiple correct options, and any missing condition that makes the stored answer unsupported.",
        "Return JSON only. Do not include markdown.",
        "Use this exact schema:",
        '{"items":[{"id":"string","answerMatchStatus":"pass|fail|not_checkable","explanationMatchStatus":"pass|fail|weak|not_checkable","mcUniquenessStatus":"pass|fail|not_applicable|not_checkable","correctedAnswer":"string|null","issueTags":["math_error|answer_mismatch|ambiguous_mc|bad_options|missing_condition|explanation_contradiction|unsolvable|accepted_answer_gap|rag_fit_issue|language_issue|source_distance_risk"],"severity":"none|minor|major|blocker","confidence":"low|medium|high","rationaleZhHans":"short Chinese reason"}],"batchSummary":{"pass":0,"warn":0,"fail":0,"notes":"short Chinese summary"}}',
        "For clean items use answerMatchStatus pass, explanationMatchStatus pass or weak, mcUniquenessStatus pass/not_applicable, issueTags [], severity none, and correctedAnswer null.",
        "Use severity blocker for wrong answer, unsolvable, no unique MC answer, multiple correct MC options, or explanation contradicting the actual solution.",
        "Keep rationaleZhHans concise and specific; do not include private chain-of-thought."
      ].join("\n")
    },
    {
      role: "user",
      content: `请进行 Stage B 比对：检查以下 ${batch.length} 道题的存储答案、acceptedAnswers、解析是否与 Stage A 独立解一致。\n${JSON.stringify(batch.map((row) => compactQuestionForStageB(row, evidenceMaps, stageAById.get(row.id))))}`
    }
  ];
}

function buildStageCMessages(row, evidenceMaps, stageAById, stageBById, localFlag, baselineById) {
  return [
    {
      role: "system",
      content: [
        "You are S18, a strict final adjudicator for Mainland China senior-secondary math QA.",
        "Stage C is single-question adjudication for flagged BNU high-school candidate content.",
        "Review the prompt, options, safe BNU RAG fit, Stage A blind solution, Stage B answer/explanation comparison, local audit flag, and baseline DeepSeek status.",
        "Your final decision must prioritize mathematical correctness, unique solvability, answer match, explanation consistency, source-distance safety, and grade/chapter fit.",
        "Return JSON only. Do not include markdown.",
        "Use this exact schema:",
        '{"items":[{"id":"string","solvableStatus":"pass|fail|uncertain","ragFitStatus":"pass|fail|uncertain","answerMatchStatus":"pass|fail|not_checkable","explanationMatchStatus":"pass|fail|weak|not_checkable","mcUniquenessStatus":"pass|fail|not_applicable|not_checkable","independentAnswer":"string|null","correctedAnswer":"string|null","issueTags":["math_error|answer_mismatch|ambiguous_mc|bad_options|missing_condition|explanation_contradiction|unsolvable|accepted_answer_gap|rag_fit_issue|language_issue|source_distance_risk"],"severity":"none|minor|major|blocker","confidence":"low|medium|high","rationaleZhHans":"short Chinese final adjudication reason"}],"batchSummary":{"pass":0,"warn":0,"fail":0,"notes":"short Chinese summary"}}',
        "Use severity blocker for wrong answer, unsolvable, no unique MC answer, multiple correct MC options, or explanation contradicting the actual solution.",
        "Keep rationaleZhHans concise and specific; do not include private chain-of-thought."
      ].join("\n")
    },
    {
      role: "user",
      content: `请进行 Stage C 单题复核，并给出最终 QA 判定：\n${JSON.stringify([compactQuestionForStageC(row, evidenceMaps, stageAById.get(row.id), stageBById.get(row.id), localFlag, baselineById.get(row.id))])}`
    }
  ];
}

function parseJsonObject(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) throw new Error("empty model response");
  const candidates = [trimmed];
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
        // Try the next candidate.
      }
    }
  }
  throw lastError ?? new Error("response is not parseable JSON");
}

function normalizeIssueTags(tags) {
  return Array.isArray(tags) ? tags.map(String).filter((tag) => validIssueTags.has(tag)) : [];
}

function normalizeStageAItem(item) {
  return {
    id: String(item.id ?? ""),
    solvableStatus: validSolvableStatuses.has(item.solvableStatus) ? item.solvableStatus : "uncertain",
    ragFitStatus: validRagFitStatuses.has(item.ragFitStatus) ? item.ragFitStatus : "uncertain",
    independentAnswer: item.independentAnswer === null || item.independentAnswer === undefined ? null : String(item.independentAnswer),
    issueTags: normalizeIssueTags(item.issueTags),
    severity: validSeverities.has(item.severity) ? item.severity : "major",
    confidence: validConfidence.has(item.confidence) ? item.confidence : "low",
    rationaleZhHans: String(item.rationaleZhHans ?? "").trim()
  };
}

function normalizeStageBItem(item) {
  return {
    id: String(item.id ?? ""),
    answerMatchStatus: validAnswerMatchStatuses.has(item.answerMatchStatus) ? item.answerMatchStatus : "not_checkable",
    explanationMatchStatus: validExplanationMatchStatuses.has(item.explanationMatchStatus) ? item.explanationMatchStatus : "not_checkable",
    mcUniquenessStatus: validMcUniquenessStatuses.has(item.mcUniquenessStatus) ? item.mcUniquenessStatus : "not_checkable",
    correctedAnswer: item.correctedAnswer === null || item.correctedAnswer === undefined ? null : String(item.correctedAnswer),
    issueTags: normalizeIssueTags(item.issueTags),
    severity: validSeverities.has(item.severity) ? item.severity : "major",
    confidence: validConfidence.has(item.confidence) ? item.confidence : "low",
    rationaleZhHans: String(item.rationaleZhHans ?? "").trim()
  };
}

function normalizeStageCItem(item) {
  return {
    id: String(item.id ?? ""),
    solvableStatus: validSolvableStatuses.has(item.solvableStatus) ? item.solvableStatus : "uncertain",
    ragFitStatus: validRagFitStatuses.has(item.ragFitStatus) ? item.ragFitStatus : "uncertain",
    answerMatchStatus: validAnswerMatchStatuses.has(item.answerMatchStatus) ? item.answerMatchStatus : "not_checkable",
    explanationMatchStatus: validExplanationMatchStatuses.has(item.explanationMatchStatus) ? item.explanationMatchStatus : "not_checkable",
    mcUniquenessStatus: validMcUniquenessStatuses.has(item.mcUniquenessStatus) ? item.mcUniquenessStatus : "not_checkable",
    independentAnswer: item.independentAnswer === null || item.independentAnswer === undefined ? null : String(item.independentAnswer),
    correctedAnswer: item.correctedAnswer === null || item.correctedAnswer === undefined ? null : String(item.correctedAnswer),
    issueTags: normalizeIssueTags(item.issueTags),
    severity: validSeverities.has(item.severity) ? item.severity : "major",
    confidence: validConfidence.has(item.confidence) ? item.confidence : "low",
    rationaleZhHans: String(item.rationaleZhHans ?? "").trim()
  };
}

function validateBatchResult(result, batch, normalizeItem) {
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
  if (!resolveIp) {
    const controller = new AbortController();
    let timeout;
    const timeoutPromise = new Promise((_, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(new Error("DeepSeek request timeout"));
      }, requestTimeoutMs);
    });
    const responsePromise = fetch(apiUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    return Promise.race([responsePromise, timeoutPromise]).finally(() => clearTimeout(timeout));
  }

  const url = new URL(apiUrl);
  return new Promise((resolve, reject) => {
    let settled = false;
    let request;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      callback(value);
    };
    const watchdog = setTimeout(() => {
      const timeoutError = new Error("DeepSeek request watchdog timeout");
      request?.destroy(timeoutError);
      finish(reject, timeoutError);
    }, requestTimeoutMs + 5000);
    request = https.request(
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
          finish(resolve, {
            ok: response.statusCode >= 200 && response.statusCode < 300,
            status: response.statusCode,
            text: () => Promise.resolve(Buffer.concat(chunks).toString("utf8"))
          });
        });
      }
    );
    request.on("timeout", () => request.destroy(new Error("DeepSeek request timeout")));
    request.on("error", (error) => finish(reject, error));
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
  const response = await postJsonWithOptionalPinnedIp({ apiUrl, apiKey, body, resolveIp });

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

function cacheFileName(stage, key) {
  const safeKey = String(key).replace(/[^A-Za-z0-9_.-]+/g, "-");
  return path.join(batchDir, `${stage}-${safeKey}.json`);
}

function cacheMatchesBatch(record, stage, batch, normalizeItem) {
  if (record.stage !== stage) return false;
  const expected = batch.map((row) => row.id).join("|");
  const actual = (record.itemIds ?? []).join("|");
  if (expected !== actual) return false;
  validateBatchResult(record.result, batch, normalizeItem);
  return true;
}

function mergeUsage(records) {
  const totals = records.reduce(
    (accumulator, record) => {
      accumulator.prompt_tokens += record.usage?.prompt_tokens ?? 0;
      accumulator.completion_tokens += record.usage?.completion_tokens ?? 0;
      accumulator.total_tokens += record.usage?.total_tokens ?? 0;
      return accumulator;
    },
    { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  );
  return totals.total_tokens ? totals : null;
}

async function reviewBatch({ stage, cacheKey, batch, config, force, messages, normalizeItem, attempts = maxAttempts }) {
  const filePath = cacheFileName(stage, cacheKey);
  if (!force && fs.existsSync(filePath)) {
    const cached = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (cacheMatchesBatch(cached, stage, batch, normalizeItem)) return { ...cached, cached: true };
  }

  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const startedAt = new Date().toISOString();
      const response = await callDeepSeek({ ...config, messages });
      const result = validateBatchResult(parseJsonObject(response.content), batch, normalizeItem);
      const record = {
        stage,
        cacheKey,
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

function providerFailureItem(stage, question, error) {
  const rationaleZhHans = `DeepSeek provider request failed or timed out during ${stage}; mark as blocker for S18 rerun/manual adjudication. Error: ${String(error?.message ?? error).slice(0, 160)}`;
  if (stage === "stage-a") {
    return {
      id: question.id,
      solvableStatus: "uncertain",
      ragFitStatus: "uncertain",
      independentAnswer: null,
      issueTags: ["provider_timeout"],
      severity: "blocker",
      confidence: "low",
      rationaleZhHans
    };
  }
  if (stage === "stage-b") {
    return {
      id: question.id,
      answerMatchStatus: "not_checkable",
      explanationMatchStatus: "not_checkable",
      mcUniquenessStatus: question.type === "multiple-choice" ? "not_checkable" : "not_applicable",
      correctedAnswer: null,
      issueTags: ["provider_timeout"],
      severity: "blocker",
      confidence: "low",
      rationaleZhHans
    };
  }
  return {
    id: question.id,
    solvableStatus: "uncertain",
    ragFitStatus: "uncertain",
    answerMatchStatus: "not_checkable",
    explanationMatchStatus: "not_checkable",
    mcUniquenessStatus: question.type === "multiple-choice" ? "not_checkable" : "not_applicable",
    independentAnswer: null,
    correctedAnswer: null,
    issueTags: ["provider_timeout"],
    severity: "blocker",
    confidence: "low",
    rationaleZhHans
  };
}

function writeProviderFailureRecord({ stage, cacheKey, batch, config, normalizeItem, error }) {
  const startedAt = new Date().toISOString();
  const result = validateBatchResult(
    {
      items: batch.map((question) => providerFailureItem(stage, question, error)),
      batchSummary: {
        pass: 0,
        warn: 0,
        fail: batch.length,
        notes: "Provider timeout/failure placeholder. Treat as blocker until rerun succeeds."
      }
    },
    batch,
    normalizeItem
  );
  const record = {
    stage,
    cacheKey,
    startedAt,
    completedAt: new Date().toISOString(),
    model: config.model,
    itemIds: batch.map((row) => row.id),
    usage: null,
    finishReason: "provider_timeout",
    result
  };
  fs.writeFileSync(cacheFileName(stage, cacheKey), `${JSON.stringify(record, null, 2)}\n`);
  return { ...record, cached: false };
}

async function reviewBatchWithSplitFallback({ stage, cacheKey, batch, config, force, messages, normalizeItem, itemMessagesForBatch }) {
  try {
    return await reviewBatch({ stage, cacheKey, batch, config, force, messages, normalizeItem, attempts: 2 });
  } catch (error) {
    if (batch.length <= 1) throw error;
  }

  const startedAt = new Date().toISOString();
  const itemRecords = [];
  for (const item of batch) {
    const itemMessages = itemMessagesForBatch([item]);
    let itemRecord;
    try {
      itemRecord = await reviewBatch({
        stage,
        cacheKey: `${cacheKey}-item-${item.id}`,
        batch: [item],
        config,
        force,
        messages: itemMessages,
        normalizeItem,
        attempts: 2
      });
    } catch (error) {
      itemRecord = writeProviderFailureRecord({
        stage,
        cacheKey: `${cacheKey}-item-${item.id}`,
        batch: [item],
        config,
        normalizeItem,
        error
      });
    }
    itemRecords.push(itemRecord);
  }
  const items = itemRecords.flatMap((record) => record.result.items);
  const result = validateBatchResult(
    {
      items,
      batchSummary: {
        pass: items.filter((item) => item.severity === "none").length,
        warn: items.filter((item) => item.severity === "minor" || item.severity === "major").length,
        fail: items.filter((item) => item.severity === "blocker").length,
        notes: "Merged from single-item fallback calls after batch-level retry failure."
      }
    },
    batch,
    normalizeItem
  );
  const record = {
    stage,
    cacheKey,
    startedAt,
    completedAt: new Date().toISOString(),
    model: config.model,
    itemIds: batch.map((row) => row.id),
    usage: mergeUsage(itemRecords),
    finishReason: "split_fallback",
    result
  };
  fs.writeFileSync(cacheFileName(stage, cacheKey), `${JSON.stringify(record, null, 2)}\n`);
  return { ...record, cached: false };
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"` : text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
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

function readCsvIds(filePath) {
  if (!fs.existsSync(filePath)) return new Set();
  const [headerLine, ...lines] = fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(headerLine);
  const idIndex = headers.indexOf("id");
  if (idIndex === -1) return new Set();
  return new Set(lines.map((line) => parseCsvLine(line)[idIndex]).filter(Boolean));
}

function readBaselineResults() {
  if (!fs.existsSync(baselineResultsJson)) {
    return { resultsById: new Map(), statusCounts: {}, severityCounts: {}, reviewedCount: 0 };
  }
  const payload = JSON.parse(fs.readFileSync(baselineResultsJson, "utf8"));
  return {
    resultsById: new Map((payload.results ?? []).map((row) => [row.id, row])),
    statusCounts: payload.statusCounts ?? {},
    severityCounts: payload.severityCounts ?? {},
    reviewedCount: payload.reviewedCount ?? 0
  };
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

function maxSeverity(...values) {
  return values.filter(Boolean).sort((left, right) => severityRank[right] - severityRank[left])[0] ?? "none";
}

function minConfidence(...values) {
  if (values.includes("low")) return "low";
  if (values.includes("medium")) return "medium";
  if (values.includes("high")) return "high";
  return "low";
}

function statusFromCombined(item) {
  if (
    item.severity === "blocker" ||
    item.solvableStatus === "fail" ||
    item.ragFitStatus === "fail" ||
    item.answerMatchStatus === "fail" ||
    item.explanationMatchStatus === "fail" ||
    item.mcUniquenessStatus === "fail"
  ) {
    return "fail";
  }
  if (
    item.severity === "major" ||
    item.severity === "minor" ||
    item.solvableStatus === "uncertain" ||
    item.ragFitStatus === "uncertain" ||
    item.answerMatchStatus === "not_checkable" ||
    item.explanationMatchStatus === "not_checkable" ||
    item.explanationMatchStatus === "weak" ||
    item.mcUniquenessStatus === "not_checkable" ||
    item.confidence === "low"
  ) {
    return "warn";
  }
  return "pass";
}

function combinedFromAB(question, stageAItem, stageBItem) {
  const combined = {
    id: question.id,
    solvableStatus: stageAItem?.solvableStatus ?? "uncertain",
    ragFitStatus: stageAItem?.ragFitStatus ?? "uncertain",
    answerMatchStatus: stageBItem?.answerMatchStatus ?? "not_checkable",
    explanationMatchStatus: stageBItem?.explanationMatchStatus ?? "not_checkable",
    mcUniquenessStatus: stageBItem?.mcUniquenessStatus ?? (question.type === "multiple-choice" ? "not_checkable" : "not_applicable"),
    independentAnswer: stageAItem?.independentAnswer ?? null,
    correctedAnswer: stageBItem?.correctedAnswer ?? null,
    issueTags: unique([...(stageAItem?.issueTags ?? []), ...(stageBItem?.issueTags ?? [])]),
    severity: maxSeverity(stageAItem?.severity, stageBItem?.severity),
    confidence: minConfidence(stageAItem?.confidence, stageBItem?.confidence),
    rationaleZhHans: stageBItem?.rationaleZhHans || stageAItem?.rationaleZhHans || "",
    sourceStage: "stage-b"
  };
  return { ...combined, status: statusFromCombined(combined) };
}

function stageDisagreement(stageAItem, stageBItem) {
  if (!stageAItem || !stageBItem) return true;
  if (stageAItem.solvableStatus === "fail" && stageBItem.answerMatchStatus === "pass") return true;
  if (stageAItem.solvableStatus === "pass" && stageBItem.answerMatchStatus === "fail" && !stageBItem.correctedAnswer) return true;
  if (stageAItem.severity === "blocker" && stageBItem.severity === "none") return true;
  return false;
}

function needsStageC(question, stageAItem, stageBItem, localIds, baselineById) {
  const combined = combinedFromAB(question, stageAItem, stageBItem);
  const localFlag = localIds.has(question.id);
  const baseline = baselineById.get(question.id);
  const baselineIssue = baseline && baseline.status !== "pass";
  const localDisagreement = localFlag !== (combined.status !== "pass");
  const baselineDisagreement = Boolean(baseline) && baseline.status !== combined.status;
  return (
    combined.severity === "blocker" ||
    combined.severity === "major" ||
    combined.confidence === "low" ||
    stageDisagreement(stageAItem, stageBItem) ||
    localDisagreement ||
    baselineDisagreement ||
    (baselineIssue && combined.status === "pass")
  );
}

function countBy(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function usageByStage(records) {
  const byStage = {};
  for (const record of records) {
    byStage[record.stage] ??= { promptTokens: 0, completionTokens: 0, totalTokens: 0, calls: 0 };
    byStage[record.stage].promptTokens += record.usage?.prompt_tokens ?? 0;
    byStage[record.stage].completionTokens += record.usage?.completion_tokens ?? 0;
    byStage[record.stage].totalTokens += record.usage?.total_tokens ?? 0;
    byStage[record.stage].calls += 1;
  }
  return byStage;
}

function qaOutputConcernTags(item) {
  const text = [item.stageARationaleZhHans, item.stageBRationaleZhHans, item.stageCRationaleZhHans, item.rationaleZhHans].filter(Boolean).join("\n");
  const tags = [];
  if (/误判|判断错误|重新审视|重新检查|为何我标记|我之前/.test(text)) tags.push("self_correction_language");
  if (item.status !== "pass" && /无问题|答案正确|最终答案正确|与存储答案一致|与答案一致|无需/.test(text)) tags.push("status_rationale_tension");
  if (String(text).length > 900) tags.push("overlong_rationale");
  return tags;
}

function enrichStageRows(rows, questionsById) {
  return rows.map((item) => {
    const question = questionsById.get(item.id);
    return {
      ...item,
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
  });
}

function buildFinalResults({ questions, stageAItems, stageBItems, stageCItems }) {
  const stageAById = new Map(stageAItems.map((item) => [item.id, item]));
  const stageBById = new Map(stageBItems.map((item) => [item.id, item]));
  const stageCById = new Map(stageCItems.map((item) => [item.id, item]));
  return questions.map((question) => {
    const stageAItem = stageAById.get(question.id);
    const stageBItem = stageBById.get(question.id);
    const stageCItem = stageCById.get(question.id);
    const base = stageCItem
      ? {
          ...stageCItem,
          sourceStage: "stage-c"
        }
      : combinedFromAB(question, stageAItem, stageBItem);
    const merged = {
      ...base,
      status: statusFromCombined(base),
      grade: question.grade,
      semester: question.semester,
      type: question.type,
      difficulty: question.difficulty,
      topicId: question.topicId,
      topicTitleZhHans: question.topicTitleZhHans,
      volume: question.volume,
      chapter: question.chapter,
      promptZhHans: question.promptZhHans,
      answer: question.answer,
      acceptedAnswers: Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers.join(" | ") : "",
      stageASolvableStatus: stageAItem?.solvableStatus ?? "",
      stageARagFitStatus: stageAItem?.ragFitStatus ?? "",
      stageASeverity: stageAItem?.severity ?? "",
      stageAConfidence: stageAItem?.confidence ?? "",
      stageAIndependentAnswer: stageAItem?.independentAnswer ?? "",
      stageARationaleZhHans: stageAItem?.rationaleZhHans ?? "",
      stageBAnswerMatchStatus: stageBItem?.answerMatchStatus ?? "",
      stageBExplanationMatchStatus: stageBItem?.explanationMatchStatus ?? "",
      stageBMcUniquenessStatus: stageBItem?.mcUniquenessStatus ?? "",
      stageBSeverity: stageBItem?.severity ?? "",
      stageBConfidence: stageBItem?.confidence ?? "",
      stageBCorrectedAnswer: stageBItem?.correctedAnswer ?? "",
      stageBRationaleZhHans: stageBItem?.rationaleZhHans ?? "",
      stageCSeverity: stageCItem?.severity ?? "",
      stageCConfidence: stageCItem?.confidence ?? "",
      stageCRationaleZhHans: stageCItem?.rationaleZhHans ?? ""
    };
    return {
      ...merged,
      qaOutputConcernTags: qaOutputConcernTags(merged)
    };
  });
}

function compareWithIds(finalResults, localIds, baselineById) {
  const issueIds = new Set(finalResults.filter((item) => item.status !== "pass" || item.severity !== "none" || item.issueTags.length).map((item) => item.id));
  const baselineIssueIds = new Set([...baselineById.values()].filter((item) => item.status !== "pass").map((item) => item.id));
  const localOnly = [...localIds].filter((id) => !issueIds.has(id)).sort();
  const deepseekOnly = [...issueIds].filter((id) => !localIds.has(id)).sort();
  const baselineOnly = [...baselineIssueIds].filter((id) => !issueIds.has(id)).sort();
  const fullOnly = [...issueIds].filter((id) => !baselineIssueIds.has(id)).sort();
  return {
    localRemediationCount: localIds.size,
    finalIssueCount: issueIds.size,
    localOnly,
    fullOnlyVsLocal: deepseekOnly,
    baselineIssueCount: baselineIssueIds.size,
    baselineOnly,
    fullOnlyVsBaseline: fullOnly
  };
}

function writeArtifacts({ questions, config, args, stageAItems, stageBItems, stageCItems, finalResults, records, baseline, localIds }) {
  const generatedAt = new Date().toISOString();
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const stageAEnriched = enrichStageRows(stageAItems, questionsById);
  const stageBEnriched = enrichStageRows(stageBItems, questionsById);
  const stageCEnriched = enrichStageRows(stageCItems, questionsById);
  const issues = finalResults.filter((item) => item.status !== "pass" || item.severity !== "none" || item.issueTags.length);
  const remediationRows = finalResults.filter((item) => item.status === "fail" || item.severity === "blocker" || item.severity === "major");
  const adjudicationRows = finalResults.filter((item) => item.qaOutputConcernTags.length || item.sourceStage === "stage-c" || item.status === "fail" || item.severity === "blocker" || item.severity === "major");
  const comparison = compareWithIds(finalResults, localIds, baseline.resultsById);
  const tokenUsage = usageByStage(records);
  const summaryJson = {
    generatedAt,
    model: config.model,
    apiHost: new URL(config.apiUrl).hostname,
    scope: "mainland-bnu-high-v1-1500-candidate-full-rag-qa",
    batchSize: args.batchSize,
    concurrency: args.concurrency,
    totalQuestionsInScope: questions.length,
    reviewedCount: finalResults.length,
    stageAReviewedCount: stageAItems.length,
    stageBReviewedCount: stageBItems.length,
    stageCReviewedCount: stageCItems.length,
    baselineCombinedDeepSeek: {
      reviewedCount: baseline.reviewedCount,
      statusCounts: baseline.statusCounts,
      severityCounts: baseline.severityCounts
    },
    statusCounts: countBy(finalResults.map((item) => item.status)),
    severityCounts: countBy(finalResults.map((item) => item.severity)),
    solvableCounts: countBy(finalResults.map((item) => item.solvableStatus)),
    ragFitCounts: countBy(finalResults.map((item) => item.ragFitStatus)),
    answerMatchCounts: countBy(finalResults.map((item) => item.answerMatchStatus)),
    explanationMatchCounts: countBy(finalResults.map((item) => item.explanationMatchStatus)),
    mcUniquenessCounts: countBy(finalResults.map((item) => item.mcUniquenessStatus)),
    issueTagCounts: countBy(finalResults.flatMap((item) => item.issueTags)),
    confidenceCounts: countBy(finalResults.map((item) => item.confidence)),
    qaOutputConcernCounts: countBy(finalResults.flatMap((item) => item.qaOutputConcernTags)),
    tokenUsage,
    localAndBaselineComparison: comparison,
    issues,
    results: finalResults
  };

  fs.writeFileSync(path.join(outputDir, "deepseek-full-rag-results.json"), `${JSON.stringify(summaryJson, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "deepseek-full-rag-results.jsonl"), `${finalResults.map((row) => JSON.stringify(row)).join("\n")}\n`);
  fs.writeFileSync(path.join(outputDir, "deepseek-full-rag-token-usage.json"), `${JSON.stringify(tokenUsage, null, 2)}\n`);

  const stageAColumns = ["id", "grade", "semester", "type", "difficulty", "topicId", "volume", "chapter", "solvableStatus", "ragFitStatus", "independentAnswer", "issueTags", "severity", "confidence", "rationaleZhHans", "promptZhHans"];
  const stageBColumns = ["id", "grade", "semester", "type", "difficulty", "topicId", "volume", "chapter", "answerMatchStatus", "explanationMatchStatus", "mcUniquenessStatus", "correctedAnswer", "issueTags", "severity", "confidence", "rationaleZhHans", "answer", "acceptedAnswers", "promptZhHans"];
  const finalColumns = [
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
    "sourceStage",
    "solvableStatus",
    "ragFitStatus",
    "answerMatchStatus",
    "explanationMatchStatus",
    "mcUniquenessStatus",
    "independentAnswer",
    "correctedAnswer",
    "issueTags",
    "qaOutputConcernTags",
    "rationaleZhHans",
    "answer",
    "acceptedAnswers",
    "stageASolvableStatus",
    "stageASeverity",
    "stageAIndependentAnswer",
    "stageBAnswerMatchStatus",
    "stageBExplanationMatchStatus",
    "stageBMcUniquenessStatus",
    "stageBCorrectedAnswer",
    "stageCSeverity",
    "promptZhHans"
  ];
  writeCsv(path.join(outputDir, "stage-a-independent-solvability-results.csv"), stageAEnriched, stageAColumns);
  writeCsv(path.join(outputDir, "stage-b-answer-explanation-results.csv"), stageBEnriched, stageBColumns);
  writeCsv(path.join(outputDir, "stage-c-adjudication-results.csv"), stageCEnriched, finalColumns);
  writeCsv(path.join(outputDir, "deepseek-full-rag-results.csv"), finalResults, finalColumns);
  writeCsv(path.join(outputDir, "deepseek-full-rag-issues.csv"), issues, finalColumns);
  writeCsv(path.join(outputDir, "deepseek-remediation-queue.csv"), remediationRows, finalColumns);
  writeCsv(path.join(outputDir, "deepseek-s18-adjudication-priority.csv"), adjudicationRows, finalColumns);

  const disagreementRows = [
    ...comparison.localOnly.map((id) => ({ id, source: "local-audit-only" })),
    ...comparison.fullOnlyVsLocal.map((id) => ({ id, source: "deepseek-full-only-vs-local" })),
    ...comparison.baselineOnly.map((id) => ({ id, source: "baseline-only" })),
    ...comparison.fullOnlyVsBaseline.map((id) => ({ id, source: "deepseek-full-only-vs-baseline" }))
  ];
  writeCsv(path.join(outputDir, "local-vs-deepseek-disagreements.csv"), disagreementRows, ["id", "source"]);

  const blockingCount = remediationRows.length;
  const gateReadyForManualSampling =
    finalResults.length === questions.length &&
    blockingCount === 0 &&
    (summaryJson.issueTagCounts.answer_mismatch ?? 0) === 0 &&
    (summaryJson.issueTagCounts.unsolvable ?? 0) === 0 &&
    (summaryJson.issueTagCounts.bad_options ?? 0) === 0 &&
    (summaryJson.issueTagCounts.source_distance_risk ?? 0) === 0;

  const issuePreview = issues.length
    ? issues
        .slice(0, 80)
        .map(
          (item) =>
            `| \`${item.id}\` | ${item.grade} | ${item.type} | ${item.status} | ${item.severity} | ${item.sourceStage} | ${item.solvableStatus}/${item.answerMatchStatus}/${item.explanationMatchStatus}/${item.mcUniquenessStatus} | ${item.issueTags.join(", ") || "-"} | ${item.rationaleZhHans} |`
        )
        .join("\n")
    : "| None | - | - | - | - | - | - | - | - |";

  const summaryMd = `# DeepSeek V4 Pro Full RAG QA - Mainland BNU High V1 Candidate

- Date: ${localDateString()}
- Session ID: S18
- Scope: \`coordination/content-qa/mainland-bnu-high-generated-bank-v1-1500/questions.jsonl\`
- Model: \`${config.model}\`
- API host: \`${new URL(config.apiUrl).hostname}\`
- Reviewed rows: ${finalResults.length}
- Stage A rows: ${stageAItems.length}
- Stage B rows: ${stageBItems.length}
- Stage C adjudication rows: ${stageCItems.length}
- Status counts: ${Object.entries(summaryJson.statusCounts).map(([key, value]) => `${key} ${value}`).join(", ") || "none"}
- Severity counts: ${Object.entries(summaryJson.severityCounts).map(([key, value]) => `${key} ${value}`).join(", ") || "none"}
- Solvable counts: ${Object.entries(summaryJson.solvableCounts).map(([key, value]) => `${key} ${value}`).join(", ") || "none"}
- Answer-match counts: ${Object.entries(summaryJson.answerMatchCounts).map(([key, value]) => `${key} ${value}`).join(", ") || "none"}
- Explanation-match counts: ${Object.entries(summaryJson.explanationMatchCounts).map(([key, value]) => `${key} ${value}`).join(", ") || "none"}
- MC uniqueness counts: ${Object.entries(summaryJson.mcUniquenessCounts).map(([key, value]) => `${key} ${value}`).join(", ") || "none"}
- Issue tag counts: ${Object.entries(summaryJson.issueTagCounts).map(([key, value]) => `${key} ${value}`).join(", ") || "none"}
- Token usage by stage: ${Object.entries(tokenUsage).map(([stage, usage]) => `${stage} prompt ${usage.promptTokens}, completion ${usage.completionTokens}, total ${usage.totalTokens}`).join("; ") || "none"}

## Baseline

- Existing combined DeepSeek baseline reviewed ${baseline.reviewedCount} rows.
- Baseline status counts: ${Object.entries(baseline.statusCounts).map(([key, value]) => `${key} ${value}`).join(", ") || "not available"}.
- This full-RAG run separates Stage A blind solvability, Stage B answer/explanation comparison, and Stage C adjudication into separate cached records.

## QA Gate Result

${gateReadyForManualSampling
    ? "DeepSeek full-RAG gate has no blocker/major remediation rows and may proceed to S18 manual sampling. This does not by itself approve product integration."
    : `DeepSeek full-RAG gate is not clear. ${blockingCount} row(s) remain in the remediation queue and must be adjudicated or regenerated before manual sampling/product promotion.`}

## Local/Baseline Comparison

- Local remediation rows: ${comparison.localRemediationCount}
- Full-RAG issue rows: ${comparison.finalIssueCount}
- Local-only rows: ${comparison.localOnly.length}
- Full-RAG-only vs local rows: ${comparison.fullOnlyVsLocal.length}
- Baseline issue rows: ${comparison.baselineIssueCount}
- Baseline-only rows: ${comparison.baselineOnly.length}
- Full-RAG-only vs baseline rows: ${comparison.fullOnlyVsBaseline.length}
- Disagreement CSV: \`local-vs-deepseek-disagreements.csv\`

## Issue Preview

| ID | Grade | Type | Status | Severity | Source | Solvable/Answer/Explanation/MC | Tags | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${issuePreview}

## Notes

- The provider key was used only through local runtime configuration. No secret values are recorded in this artifact.
- RAG cards were used only as safe grade/chapter/topic fit evidence, not as an answer key.
- This QA artifact does not edit candidate questions or promote public \`data/questions.ts\` entries.
- Rows in \`deepseek-s18-adjudication-priority.csv\` should be reviewed before remediation because they include Stage C items, blocker/major rows, or model-output concern tags.
`;
  fs.writeFileSync(path.join(outputDir, "deepseek-full-rag-summary.md"), summaryMd);

  const decisionText = `# S18 DeepSeek Full RAG QA Decision - Mainland BNU High V1

- Date: ${localDateString()}
- Session ID: S18
- Reviewed rows: ${finalResults.length}
- Stage C adjudication rows: ${stageCItems.length}
- DeepSeek full-RAG issue rows: ${issues.length}
- Fail/blocker/major remediation rows: ${blockingCount}
- Manual sampling status: Pending
- Decision: ${gateReadyForManualSampling ? "Pending S18 manual sampling before S04 integration review." : "Not approved for product integration."}

## Required Next Step

${gateReadyForManualSampling
    ? "Run S18 manual sampling: 100% of all previously flagged rows plus 60 clean-pass rows balanced across S4/S5/S6, type, and difficulty. Only after manual sampling passes may this file be replaced with a decision that says Approved for S04 integration review."
    : "Use `deepseek-remediation-queue.csv`, `deepseek-full-rag-issues.csv`, and `local-vs-deepseek-disagreements.csv` for S18 adjudication/remediation, then rerun local `audit-solvability.mjs` and this full-RAG DeepSeek QA with `--force`."}

## Product Boundary

This QA pass does not authorize edits to public question-bank data, practice routes, adaptive recommendations, AI Tutor behavior, or production APIs.
`;
  fs.writeFileSync(path.join(outputDir, "s18-deepseek-full-rag-qa-decision.md"), decisionText);
  fs.writeFileSync(path.join(outputDir, "s18-promotability-decision.md"), decisionText);

  return summaryJson;
}

async function runBatchedStage({ stage, questions, args, config, evidenceMaps, messagesForBatch, normalizeItem, stageAById }) {
  const batches = chunkRows(questions, args.batchSize);
  const records = new Array(batches.length);
  let nextBatchIndex = 0;
  const workerCount = Math.min(args.concurrency, batches.length || 1);

  async function runWorker(workerIndex) {
    while (nextBatchIndex < batches.length) {
      const index = nextBatchIndex;
      nextBatchIndex += 1;
      const batch = batches[index];
      const batchNumber = Math.floor((args.offset + index * args.batchSize) / args.batchSize) + 1;
      const messages = messagesForBatch(batch, evidenceMaps, stageAById);
      const record = await reviewBatchWithSplitFallback({
        stage,
        cacheKey: `batch-${String(batchNumber).padStart(3, "0")}`,
        batch,
        config,
        force: args.force,
        messages,
        normalizeItem,
        itemMessagesForBatch: (itemBatch) => messagesForBatch(itemBatch, evidenceMaps, stageAById)
      });
      records[index] = record;
      console.log(
        JSON.stringify({
          event: "deepseek-full-rag-qa-batch",
          stage,
          worker: workerIndex + 1,
          batchNumber,
          cached: record.cached,
          items: record.result.items.length
        })
      );
    }
  }

  await Promise.all(Array.from({ length: workerCount }, (_, index) => runWorker(index)));
  return records;
}

async function runStageC({ questions, args, config, evidenceMaps, stageAById, stageBById, localIds, baselineById }) {
  const stageCQuestions = questions.filter((question) => needsStageC(question, stageAById.get(question.id), stageBById.get(question.id), localIds, baselineById));
  const records = new Array(stageCQuestions.length);
  let nextIndex = 0;
  const workerCount = Math.min(args.concurrency, stageCQuestions.length || 1);

  console.log(
    JSON.stringify({
      event: "deepseek-full-rag-qa-stage-c-start",
      items: stageCQuestions.length
    })
  );

  async function runWorker(workerIndex) {
    while (nextIndex < stageCQuestions.length) {
      const index = nextIndex;
      nextIndex += 1;
      const question = stageCQuestions[index];
      const messages = buildStageCMessages(question, evidenceMaps, stageAById, stageBById, localIds.has(question.id), baselineById);
      let record;
      try {
        record = await reviewBatch({
          stage: "stage-c",
          cacheKey: question.id,
          batch: [question],
          config,
          force: args.force,
          messages,
          normalizeItem: normalizeStageCItem,
          attempts: 2
        });
      } catch (error) {
        record = writeProviderFailureRecord({
          stage: "stage-c",
          cacheKey: question.id,
          batch: [question],
          config,
          normalizeItem: normalizeStageCItem,
          error
        });
      }
      records[index] = record;
      console.log(
        JSON.stringify({
          event: "deepseek-full-rag-qa-stage-c-item",
          worker: workerIndex + 1,
          id: question.id,
          cached: record.cached,
          severity: record.result.items[0]?.severity
        })
      );
    }
  }

  await Promise.all(Array.from({ length: workerCount }, (_, index) => runWorker(index)));
  return records;
}

async function main() {
  const args = parseArgs(process.argv);
  const localEnv = readLocalEnv(path.join(projectRoot, ".env.local"));
  const apiKey = process.env.LLM_API_KEY || localEnv.LLM_API_KEY || process.env.OPENAI_API_KEY || localEnv.OPENAI_API_KEY;
  const apiUrl = process.env.LLM_API_URL || localEnv.LLM_API_URL || "https://api.deepseek.com/chat/completions";
  const model = process.env.LLM_MODEL || localEnv.LLM_MODEL || "deepseek-v4-pro";
  const resolveIp = process.env.DEEPSEEK_API_RESOLVE_IP || localEnv.DEEPSEEK_API_RESOLVE_IP || null;
  if (!apiKey) throw new Error("Missing LLM_API_KEY or OPENAI_API_KEY in .env.local or process env.");
  if (!new URL(apiUrl).hostname.includes("api.deepseek.com")) throw new Error(`Refusing non-DeepSeek endpoint: ${new URL(apiUrl).hostname}`);
  if (model !== "deepseek-v4-pro") throw new Error(`Refusing non-DeepSeek V4 Pro model: ${model}`);
  if (resolveIp && !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(resolveIp)) throw new Error("DEEPSEEK_API_RESOLVE_IP must be an IPv4 address.");

  fs.mkdirSync(batchDir, { recursive: true });
  const allQuestions = readJsonl(inputJsonl);
  const scopedQuestions = allQuestions.slice(args.offset, args.limit === null ? undefined : args.offset + args.limit);
  const curriculumCards = loadTsExport(path.join(projectRoot, "data/rag/mainlandBnuHigh.ts"), "mainlandBnuHighRagCards");
  const assessmentCards = loadTsExport(path.join(projectRoot, "data/rag/mainlandBnuHighAssessmentPatterns.ts"), "mainlandBnuHighAssessmentPatternCards");
  const evidenceMaps = {
    curriculum: new Map(curriculumCards.map((card) => [card.id, card])),
    assessment: new Map(assessmentCards.map((card) => [card.id, card]))
  };
  const localIds = readCsvIds(localRemediationCsv);
  const baseline = readBaselineResults();
  const config = { apiKey, apiUrl, model, resolveIp };

  console.log(
    JSON.stringify({
      event: "deepseek-full-rag-qa-start",
      model,
      apiHost: new URL(apiUrl).hostname,
      resolveIpConfigured: Boolean(resolveIp),
      questions: scopedQuestions.length,
      batchSize: args.batchSize,
      concurrency: args.concurrency,
      baselineReviewedCount: baseline.reviewedCount
    })
  );

  const stageARecords = await runBatchedStage({
    stage: "stage-a",
    questions: scopedQuestions,
    args,
    config,
    evidenceMaps,
    messagesForBatch: buildStageAMessages,
    normalizeItem: normalizeStageAItem
  });
  const stageAItems = stageARecords.flatMap((record) => record.result.items);
  const stageAById = new Map(stageAItems.map((item) => [item.id, item]));

  const stageBRecords = await runBatchedStage({
    stage: "stage-b",
    questions: scopedQuestions,
    args,
    config,
    evidenceMaps,
    messagesForBatch: buildStageBMessages,
    normalizeItem: normalizeStageBItem,
    stageAById
  });
  const stageBItems = stageBRecords.flatMap((record) => record.result.items);
  const stageBById = new Map(stageBItems.map((item) => [item.id, item]));

  const stageCRecords = await runStageC({
    questions: scopedQuestions,
    args,
    config,
    evidenceMaps,
    stageAById,
    stageBById,
    localIds,
    baselineById: baseline.resultsById
  });
  const stageCItems = stageCRecords.flatMap((record) => record.result.items);
  const finalResults = buildFinalResults({ questions: scopedQuestions, stageAItems, stageBItems, stageCItems });
  const allRecords = [...stageARecords, ...stageBRecords, ...stageCRecords];
  const result = writeArtifacts({
    questions: scopedQuestions,
    config,
    args,
    stageAItems,
    stageBItems,
    stageCItems,
    finalResults,
    records: allRecords,
    baseline,
    localIds
  });

  console.log(
    JSON.stringify({
      event: "deepseek-full-rag-qa-complete",
      reviewedCount: result.reviewedCount,
      statusCounts: result.statusCounts,
      severityCounts: result.severityCounts,
      stageCReviewedCount: result.stageCReviewedCount,
      issues: result.issues.length,
      summaryPath: path.relative(projectRoot, path.join(outputDir, "deepseek-full-rag-summary.md"))
    })
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      event: "deepseek-full-rag-qa-error",
      message: String(error?.message ?? error)
        .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted_api_key]")
        .replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]")
    })
  );
  process.exitCode = 1;
});
