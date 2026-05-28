import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
const inputJsonl = path.join(__dirname, "questions.jsonl");
const outputDir = path.join(__dirname, "deepseek-v4-pro-solvability-qa");
const batchDir = path.join(outputDir, "batches");

const defaultBatchSize = 12;
const maxTokens = Number(process.env.BNU_JUNIOR_QA_MAX_TOKENS ?? 8000);
const maxAttempts = Number(process.env.BNU_JUNIOR_QA_MAX_ATTEMPTS ?? 3);
const requestTimeoutMs = Number(process.env.BNU_JUNIOR_QA_TIMEOUT_MS ?? 120000);

const validStatuses = ["pass", "warn", "fail"];
const validSeverities = ["none", "minor", "major", "blocker"];
const validIssueTags = [
  "unsolvable",
  "answer_mismatch",
  "explanation_mismatch",
  "ambiguous_mc",
  "bad_options",
  "missing_condition",
  "grade_mismatch",
  "topic_mismatch",
  "rag_mismatch",
  "source_artifact",
  "copy_risk",
  "language_issue",
  "accepted_answer_gap",
  "public_readiness"
];

function readLocalEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .trim()
    .split(/\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function loadTsExport(filePath, exportName) {
  const source = fs
    .readFileSync(filePath, "utf8")
    .replace(/^import\s+.*;\s*$/gm, "")
    .replace(/\b(const|let|var)\s+([A-Za-z_$][\w$]*)\s*:\s*[^=;]+=/g, "$1 $2 =")
    .replace(new RegExp(`export const ${exportName}(?:: [^=]+)? =`), `exports.${exportName} =`);
  const context = { exports: {} };
  vm.runInNewContext(source, context, { filename: filePath });
  return context.exports[exportName];
}

function parseArgs(argv) {
  const args = {
    batchSize: defaultBatchSize,
    limit: null,
    offset: 0,
    force: false
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--force") {
      args.force = true;
    } else if (arg === "--batch-size") {
      args.batchSize = Number(argv[++index]);
    } else if (arg === "--limit") {
      args.limit = Number(argv[++index]);
    } else if (arg === "--offset") {
      args.offset = Number(argv[++index]);
    }
  }

  if (!Number.isInteger(args.batchSize) || args.batchSize < 1 || args.batchSize > 20) {
    throw new Error("--batch-size must be an integer from 1 to 20.");
  }
  if (args.limit !== null && (!Number.isInteger(args.limit) || args.limit < 1)) {
    throw new Error("--limit must be a positive integer.");
  }
  if (!Number.isInteger(args.offset) || args.offset < 0) {
    throw new Error("--offset must be a non-negative integer.");
  }

  return args;
}

function chunkRows(rows, batchSize) {
  const batches = [];
  for (let index = 0; index < rows.length; index += batchSize) {
    batches.push(rows.slice(index, index + batchSize));
  }
  return batches;
}

function compactQuestion(row) {
  return {
    id: row.id,
    grade: row.grade,
    semester: row.semester,
    topicId: row.topicId,
    unitTitle: row.unitTitle,
    type: row.type,
    difficulty: row.difficulty,
    conceptIds: row.conceptIds,
    competencyTags: row.competencyTags,
    skillTags: row.skillTags,
    promptZhHans: row.promptZhHans,
    optionsZhHans: row.optionsZhHans,
    answer: row.answer,
    acceptedAnswers: row.acceptedAnswers,
    explanationZhHans: row.explanationZhHans
  };
}

function compactCurriculumCard(card) {
  return {
    id: card.id,
    grade: card.grade,
    semester: card.semester,
    unitTitle: card.unitTitle,
    conceptIds: card.conceptIds,
    competencyTags: card.competencyTags,
    skillTags: card.skillTags,
    difficultyBand: card.difficultyBand,
    safeSummary: card.safeSummary,
    generationGuidance: card.generationGuidance,
    misconceptionTags: card.misconceptionTags,
    prohibitedReuseNotes: card.prohibitedReuseNotes
  };
}

function compactPatternCard(card) {
  return {
    id: card.id,
    grade: card.grade ?? card.grades,
    semester: card.semester ?? card.semesters,
    unitTitles: card.unitTitles,
    conceptIds: card.conceptIds,
    competencyTags: card.competencyTags,
    skillTags: card.skillTags ?? [],
    itemTypeTags: card.itemTypeTags,
    difficultyBand: card.difficultyBand,
    patternSummary: card.patternSummary,
    solutionStrategyTags: card.solutionStrategyTags ?? [],
    misconceptionTags: card.misconceptionTags,
    generationGuidance: card.generationGuidance,
    prohibitedReuseNotes: card.prohibitedReuseNotes
  };
}

function loadRagMaps() {
  const curriculumCards = loadTsExport(
    path.join(projectRoot, "data/rag/mainlandBnuJunior.ts"),
    "mainlandBnuJuniorRagCards"
  );
  const assessmentCards = loadTsExport(
    path.join(projectRoot, "data/rag/mainlandBnuJuniorAssessmentPatterns.ts"),
    "mainlandBnuJuniorAssessmentPatternCards"
  );
  const zhongkaoCards = loadTsExport(
    path.join(projectRoot, "data/rag/mainlandJuniorZhongkaoExamPatterns.ts"),
    "mainlandJuniorZhongkaoExamPatternCards"
  );
  return {
    curriculumById: new Map(curriculumCards.map((card) => [card.id, card])),
    assessmentById: new Map(assessmentCards.map((card) => [card.id, card])),
    zhongkaoById: new Map(zhongkaoCards.map((card) => [card.id, card]))
  };
}

function evidenceForBatch(batch, ragMaps) {
  const curriculumIds = new Set(batch.flatMap((row) => row.evidenceCardIds ?? []));
  const assessmentIds = new Set(batch.flatMap((row) => row.assessmentPatternCardIds ?? []));
  const zhongkaoIds = new Set(batch.flatMap((row) => row.zhongkaoPatternCardIds ?? []));
  return {
    curriculumSafeCards: Array.from(curriculumIds)
      .map((id) => ragMaps.curriculumById.get(id))
      .filter(Boolean)
      .map(compactCurriculumCard),
    bnuAssessmentPatternCards: Array.from(assessmentIds)
      .map((id) => ragMaps.assessmentById.get(id))
      .filter(Boolean)
      .map(compactPatternCard),
    sharedZhongkaoPatternCards: Array.from(zhongkaoIds)
      .map((id) => ragMaps.zhongkaoById.get(id))
      .filter(Boolean)
      .map(compactPatternCard)
  };
}

function buildMessages(batch, ragMaps) {
  const evidence = evidenceForBatch(batch, ragMaps);
  return [
    {
      role: "system",
      content: [
        "You are S18, a strict Mainland China junior math QA reviewer.",
        "Review candidate questions for Mainland Beijing Normal University Press junior-secondary mathematics.",
        "Primary task: decide whether each item is solvable from the prompt alone and whether the provided answer/acceptedAnswers/explanation match the prompt.",
        "Use the supplied safe RAG cards only for grade, topic, terminology, assessment style, and zhongkao-style appropriateness. Do not cite or require textbook source text.",
        "Check every item independently for: mathematical correctness, enough conditions, answer-match, explanation-match, accepted-answer coverage, multiple-choice uniqueness, option validity, grade/topic suitability, unsafe visual/source artifacts, and public-readiness risk.",
        "For multiple-choice, fail if there are multiple correct options, no correct option, duplicate/equivalent options, or answer does not exactly identify one option.",
        "For fill-in or short-answer, fail if the answer is wrong, not derivable, under-specified, or the explanation contradicts the answer.",
        "Return JSON only. Do not include markdown.",
        "Use this exact schema:",
        '{"items":[{"id":"string","status":"pass|warn|fail","severity":"none|minor|major|blocker","solvable":true,"answerMatches":true,"issueTags":["unsolvable|answer_mismatch|explanation_mismatch|ambiguous_mc|bad_options|missing_condition|grade_mismatch|topic_mismatch|rag_mismatch|source_artifact|copy_risk|language_issue|accepted_answer_gap|public_readiness"],"correctedAnswer":null,"rationale":"short Chinese reason","confidence":"high|medium|low"}],"batchSummary":{"pass":0,"warn":0,"fail":0,"notes":"short Chinese summary"}}',
        "For clean items use status pass, severity none, solvable true, answerMatches true, issueTags [], correctedAnswer null, and a short Chinese rationale.",
        "Use warn only for non-blocking wording/public-readiness concerns when the item is still solvable and answerMatches is true.",
        "Use fail when solvable is false, answerMatches is false, answer/explanation/options are mathematically wrong, or the prompt lacks needed conditions."
      ].join("\n")
    },
    {
      role: "user",
      content: JSON.stringify({
        task: `审核以下 ${batch.length} 道北师大版初中候选题，判断是否可解、答案是否与题目匹配。`,
        questions: batch.map(compactQuestion),
        safeRagEvidence: evidence
      })
    }
  ];
}

function parseJsonObject(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) throw new Error("empty model response");
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1]);
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }
    throw new Error("response is not parseable JSON");
  }
}

function validateBatchResult(result, batch) {
  if (!result || !Array.isArray(result.items)) throw new Error("result.items is missing");
  const expectedIds = new Set(batch.map((row) => row.id));
  const seenIds = new Set();
  for (const item of result.items) {
    if (!expectedIds.has(item.id)) throw new Error(`unexpected result id ${item.id}`);
    if (seenIds.has(item.id)) throw new Error(`duplicate result id ${item.id}`);
    seenIds.add(item.id);
    if (!validStatuses.includes(item.status)) throw new Error(`invalid status for ${item.id}`);
    if (!validSeverities.includes(item.severity)) throw new Error(`invalid severity for ${item.id}`);
    if (typeof item.solvable !== "boolean") throw new Error(`solvable must be boolean for ${item.id}`);
    if (typeof item.answerMatches !== "boolean") throw new Error(`answerMatches must be boolean for ${item.id}`);
    if (!Array.isArray(item.issueTags)) throw new Error(`issueTags must be an array for ${item.id}`);
    for (const tag of item.issueTags) {
      if (!validIssueTags.includes(tag)) throw new Error(`invalid issue tag ${tag} for ${item.id}`);
    }
    if (!["high", "medium", "low"].includes(item.confidence)) throw new Error(`invalid confidence for ${item.id}`);
    if (item.status === "pass" && (item.severity !== "none" || !item.solvable || !item.answerMatches || item.issueTags.length)) {
      throw new Error(`pass item has inconsistent gate fields for ${item.id}`);
    }
  }
  for (const id of expectedIds) {
    if (!seenIds.has(id)) throw new Error(`missing result id ${id}`);
  }
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function callDeepSeek({ apiKey, apiUrl, model, messages }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: "json_object" },
        thinking: { type: "disabled" },
        stream: false,
        temperature: 0.1,
        max_tokens: maxTokens
      }),
      signal: controller.signal
    });

    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const message = payload?.error?.message ?? text.slice(0, 300);
      throw new Error(`DeepSeek HTTP ${response.status}: ${message}`);
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("DeepSeek response did not include message content");
    }

    return {
      content,
      usage: payload?.usage ?? null,
      finishReason: payload?.choices?.[0]?.finish_reason ?? null
    };
  } finally {
    clearTimeout(timeout);
  }
}

function batchFileName(batchNumber) {
  return path.join(batchDir, `batch-${String(batchNumber).padStart(3, "0")}.json`);
}

async function reviewBatch({ batch, batchNumber, config, ragMaps, force }) {
  const filePath = batchFileName(batchNumber);
  if (!force && fs.existsSync(filePath)) {
    const cached = JSON.parse(fs.readFileSync(filePath, "utf8"));
    validateBatchResult(cached.result, batch);
    return { ...cached, cached: true };
  }

  const messages = buildMessages(batch, ragMaps);
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const startedAt = new Date().toISOString();
      const response = await callDeepSeek({ ...config, messages });
      const result = parseJsonObject(response.content);
      validateBatchResult(result, batch);
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
      if (attempt < maxAttempts) await sleep(2500 * attempt);
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
    new Intl.DateTimeFormat("en-GB", {
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

function countBy(items, keyFn) {
  return items.reduce((counts, item) => {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function qaOutputConcernTags(item) {
  const tags = [];
  const rationale = String(item.rationale ?? "");
  if (
    item.status === "fail" &&
    /应\s*(?:pass|通过)|答案(?:和选项)?(?:正确|匹配)|应标记|应判为?pass/i.test(rationale)
  ) {
    tags.push("rationale_status_tension");
  }
  if (
    item.answerMatches === false &&
    /答案(?:和选项)?(?:正确|匹配)|答案与选项匹配|应通过/i.test(rationale)
  ) {
    tags.push("answer_match_tension");
  }
  if (
    item.solvable === false &&
    /可解|可以求|能够求出|条件(?:足够|充分)/.test(rationale)
  ) {
    tags.push("solvability_tension");
  }
  return tags;
}

function summarize(records, questions) {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const itemResults = records.flatMap((record) =>
    record.result.items.map((item) => {
      const question = byId.get(item.id);
      return {
        ...item,
        grade: question?.grade,
        semester: question?.semester,
        type: question?.type,
        difficulty: question?.difficulty,
        topicId: question?.topicId,
        unitTitle: question?.unitTitle,
        answer: question?.answer,
        acceptedAnswers: question?.acceptedAnswers,
        promptZhHans: question?.promptZhHans,
        qaOutputConcernTags: qaOutputConcernTags(item)
      };
    })
  );
  const statusCounts = countBy(itemResults, (item) => item.status);
  const severityCounts = countBy(itemResults, (item) => item.severity);
  const solvableCounts = countBy(itemResults, (item) => String(item.solvable));
  const answerMatchCounts = countBy(itemResults, (item) => String(item.answerMatches));
  const issueTagCounts = countBy(itemResults.flatMap((item) => item.issueTags), (tag) => tag);
  const usage = records.reduce(
    (total, record) => {
      total.promptTokens += record.usage?.prompt_tokens ?? 0;
      total.completionTokens += record.usage?.completion_tokens ?? 0;
      total.totalTokens += record.usage?.total_tokens ?? 0;
      return total;
    },
    { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
  );
  const issues = itemResults.filter((item) => item.status !== "pass" || item.severity !== "none");
  const remediationQueue = itemResults.filter((item) => item.status === "fail" || ["major", "blocker"].includes(item.severity));
  const adjudicationPriority = issues.filter((item) => item.qaOutputConcernTags.length);
  return {
    itemResults,
    statusCounts,
    severityCounts,
    solvableCounts,
    answerMatchCounts,
    issueTagCounts,
    usage,
    issues,
    remediationQueue,
    adjudicationPriority
  };
}

function writeSummary({ records, questions, config, args }) {
  const summary = summarize(records, questions);
  const generatedAt = new Date().toISOString();
  const resultJson = {
    generatedAt,
    model: config.model,
    apiHost: new URL(config.apiUrl).hostname,
    scope: "mainland-bnu-junior-v1-1500-candidate",
    batchSize: args.batchSize,
    totalQuestionsInScope: questions.length,
    reviewedCount: summary.itemResults.length,
    statusCounts: summary.statusCounts,
    severityCounts: summary.severityCounts,
    solvableCounts: summary.solvableCounts,
    answerMatchCounts: summary.answerMatchCounts,
    issueTagCounts: summary.issueTagCounts,
    usage: summary.usage,
    issues: summary.issues,
    remediationQueue: summary.remediationQueue,
    adjudicationPriority: summary.adjudicationPriority,
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
    "unitTitle",
    "status",
    "severity",
    "solvable",
    "answerMatches",
    "issueTags",
    "qaOutputConcernTags",
    "correctedAnswer",
    "confidence",
    "rationale",
    "answer",
    "acceptedAnswers",
    "promptZhHans"
  ];
  writeCsv(path.join(outputDir, "deepseek-solvability-results.csv"), summary.itemResults, columns);
  writeCsv(path.join(outputDir, "deepseek-solvability-issues.csv"), summary.issues, columns);
  writeCsv(path.join(outputDir, "deepseek-remediation-queue.csv"), summary.remediationQueue, columns);
  writeCsv(path.join(outputDir, "deepseek-s18-adjudication-priority.csv"), summary.adjudicationPriority, columns);

  const issuePreview = summary.issues.length
    ? summary.issues
        .slice(0, 80)
        .map(
          (item) =>
            `| \`${item.id}\` | ${item.grade} | ${item.type} | ${item.status} | ${item.severity} | ${item.solvable} | ${item.answerMatches} | ${item.issueTags.join(", ") || "-"} | ${item.rationale} |`
        )
        .join("\n")
    : "| None | - | - | - | - | - | - | - | - |";

  const markdown = `# DeepSeek V4 Pro Solvability QA - Mainland BNU Junior V1 Candidate

- Date: ${localDateString()}
- Session ID: S18
- Scope: \`coordination/content-qa/mainland-bnu-junior-generated-bank-v1-1500/questions.jsonl\`
- Model: \`${config.model}\`
- API host: \`${new URL(config.apiUrl).hostname}\`
- Reviewed rows: ${summary.itemResults.length}
- Status counts: ${Object.entries(summary.statusCounts).map(([key, value]) => `${key} ${value}`).join(", ")}
- Severity counts: ${Object.entries(summary.severityCounts).map(([key, value]) => `${key} ${value}`).join(", ")}
- Solvable counts: ${Object.entries(summary.solvableCounts).map(([key, value]) => `${key} ${value}`).join(", ")}
- Answer-match counts: ${Object.entries(summary.answerMatchCounts).map(([key, value]) => `${key} ${value}`).join(", ")}
- Issue tag counts: ${Object.entries(summary.issueTagCounts).map(([key, value]) => `${key} ${value}`).join(", ") || "none"}
- QA-output concern rows: ${summary.adjudicationPriority.length}
- Token usage: prompt ${summary.usage.promptTokens}, completion ${summary.usage.completionTokens}, total ${summary.usage.totalTokens}

## QA Gate Result

${summary.issues.length === 0
    ? "DeepSeek V4 Pro found 0 warn/fail items in this run. This supports candidate QA, but does not approve public integration without S18 manual review."
    : `DeepSeek V4 Pro flagged ${summary.issues.length} item(s); ${summary.remediationQueue.length} are fail/major/blocker remediation rows. These require S18 review before any public integration.`}

## Issue Preview

| ID | Grade | Type | Status | Severity | Solvable | Answer matches | Tags | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${issuePreview}

## Notes

- This run used local redacted DeepSeek provider configuration. No API key, request headers, raw prompts, or full provider transcripts are recorded.
- Safe BNU junior curriculum RAG, BNU assessment-pattern RAG, and shared zhongkao pattern cards were supplied as metadata-only context for grade/topic/style checks.
- This QA artifact does not edit candidate questions or promote public \`data/questions.ts\` entries.
`;

  fs.writeFileSync(path.join(outputDir, "deepseek-solvability-summary.md"), markdown);

  const decision = `# S18 DeepSeek V4 Pro Solvability Decision - Mainland BNU Junior V1

- Date: ${localDateString()}
- Session ID: S18
- Decision: ${summary.remediationQueue.length === 0 ? "deepseek-solvability-gate-passed-pending-manual-review" : "deepseek-solvability-gate-blocked-pending-remediation"}
- Reviewed rows: ${summary.itemResults.length}
- Fail/major/blocker remediation rows: ${summary.remediationQueue.length}
- Warn/fail issue rows: ${summary.issues.length}
- Solvable false rows: ${summary.solvableCounts.false ?? 0}
- Answer mismatch rows: ${summary.answerMatchCounts.false ?? 0}
- QA-output concern rows: ${summary.adjudicationPriority.length}
- App integration status: Blocked by design; do not import into \`data/questions.ts\`, routes, lessons, or public practice until S18 remediation/manual QA and a separate owner-approved S04/S18 integration task.
`;

  fs.writeFileSync(path.join(outputDir, "s18-deepseek-solvability-decision.md"), decision);
  return resultJson;
}

async function main() {
  const args = parseArgs(process.argv);
  const localEnv = readLocalEnv(path.join(projectRoot, ".env.local"));
  const apiKey = localEnv.LLM_API_KEY || process.env.LLM_API_KEY || localEnv.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const apiUrl = localEnv.LLM_API_URL || process.env.LLM_API_URL || "https://api.deepseek.com/chat/completions";
  const model = localEnv.LLM_MODEL || process.env.LLM_MODEL || "deepseek-v4-pro";

  if (!apiKey) throw new Error("Missing LLM_API_KEY or OPENAI_API_KEY in .env.local or process env.");
  if (!new URL(apiUrl).hostname.includes("api.deepseek.com")) throw new Error(`Refusing non-DeepSeek endpoint: ${new URL(apiUrl).hostname}`);
  if (model !== "deepseek-v4-pro") throw new Error(`Refusing non-DeepSeek V4 Pro model: ${model}`);

  fs.mkdirSync(batchDir, { recursive: true });

  const allQuestions = readJsonl(inputJsonl);
  const scopedQuestions = allQuestions.slice(args.offset, args.limit === null ? undefined : args.offset + args.limit);
  const batches = chunkRows(scopedQuestions, args.batchSize);
  const ragMaps = loadRagMaps();
  const config = { apiKey, apiUrl, model };
  const records = [];

  console.log(
    JSON.stringify({
      event: "deepseek-solvability-qa-start",
      model,
      apiHost: new URL(apiUrl).hostname,
      questions: scopedQuestions.length,
      batches: batches.length,
      batchSize: args.batchSize
    })
  );

  for (let index = 0; index < batches.length; index += 1) {
    const batchNumber = Math.floor((args.offset + index * args.batchSize) / args.batchSize) + 1;
    const record = await reviewBatch({
      batch: batches[index],
      batchNumber,
      config,
      ragMaps,
      force: args.force
    });
    records.push(record);
    const statusCounts = countBy(record.result.items, (item) => item.status);
    const failingGateCount = record.result.items.filter((item) => !item.solvable || !item.answerMatches).length;
    console.log(
      JSON.stringify({
        event: "deepseek-solvability-qa-batch",
        batchNumber,
        cached: record.cached,
        items: record.result.items.length,
        statusCounts,
        failingGateCount
      })
    );
  }

  const result = writeSummary({ records, questions: scopedQuestions, config, args });
  console.log(
    JSON.stringify({
      event: "deepseek-solvability-qa-complete",
      reviewedCount: result.reviewedCount,
      statusCounts: result.statusCounts,
      severityCounts: result.severityCounts,
      solvableCounts: result.solvableCounts,
      answerMatchCounts: result.answerMatchCounts,
      issues: result.issues.length,
      remediationRows: result.remediationQueue.length,
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
