import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
const inputJsonPath = path.join(projectRoot, "data/ease/ease_questions_all.json");
const outputDir = __dirname;
const batchDir = path.join(outputDir, "batches");
const errorDir = path.join(outputDir, "errors");

const validSolvabilityStatuses = ["pass", "unsolvable", "ambiguous", "image-context-required", "api-error"];
const validAnswerMatchStatuses = ["pass", "mismatch", "missing-answer-key", "not-checkable"];
const validSeverities = ["P0", "P1", "P2", "none"];

function hongKongDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function parseArgs(argv) {
  const args = {
    mode: "dry-run",
    batchSize: 5,
    concurrency: 2,
    offset: 0,
    limit: null,
    sampleSize: 100,
    dryRunPrompts: 5,
    force: false,
    summarize: false,
    envFile: null,
    reportDate: hongKongDate(),
    maxTokens: Number(process.env.EASE_QA_MAX_TOKENS ?? 8000),
    maxAttempts: Number(process.env.EASE_QA_MAX_ATTEMPTS ?? 3),
    timeoutMs: Number(process.env.EASE_QA_TIMEOUT_MS ?? 120000)
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") args.mode = "dry-run";
    else if (arg === "--inventory") args.mode = "inventory";
    else if (arg === "--pilot") args.mode = "pilot";
    else if (arg === "--full") args.mode = "full";
    else if (arg === "--summarize") args.summarize = true;
    else if (arg === "--force") args.force = true;
    else if (arg === "--batch-size") args.batchSize = Number(argv[++index]);
    else if (arg === "--concurrency") args.concurrency = Number(argv[++index]);
    else if (arg === "--offset") args.offset = Number(argv[++index]);
    else if (arg === "--limit") args.limit = Number(argv[++index]);
    else if (arg === "--sample-size") args.sampleSize = Number(argv[++index]);
    else if (arg === "--dry-run-prompts") args.dryRunPrompts = Number(argv[++index]);
    else if (arg === "--env-file") args.envFile = argv[++index];
    else if (arg === "--report-date") args.reportDate = argv[++index];
    else if (arg === "--max-tokens") args.maxTokens = Number(argv[++index]);
    else if (arg === "--max-attempts") args.maxAttempts = Number(argv[++index]);
    else if (arg === "--timeout-ms") args.timeoutMs = Number(argv[++index]);
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!["dry-run", "inventory", "pilot", "full"].includes(args.mode)) {
    throw new Error(`Unsupported mode: ${args.mode}`);
  }
  if (!Number.isInteger(args.batchSize) || args.batchSize < 1 || args.batchSize > 10) {
    throw new Error("--batch-size must be an integer from 1 to 10.");
  }
  if (!Number.isInteger(args.concurrency) || args.concurrency < 1 || args.concurrency > 4) {
    throw new Error("--concurrency must be an integer from 1 to 4.");
  }
  if (!Number.isInteger(args.offset) || args.offset < 0) {
    throw new Error("--offset must be a non-negative integer.");
  }
  if (args.limit !== null && (!Number.isInteger(args.limit) || args.limit < 1)) {
    throw new Error("--limit must be a positive integer.");
  }
  if (!Number.isInteger(args.sampleSize) || args.sampleSize < 1) {
    throw new Error("--sample-size must be a positive integer.");
  }
  if (!Number.isInteger(args.dryRunPrompts) || args.dryRunPrompts < 1) {
    throw new Error("--dry-run-prompts must be a positive integer.");
  }
  if (!Number.isInteger(args.maxAttempts) || args.maxAttempts < 1 || args.maxAttempts > 6) {
    throw new Error("--max-attempts must be an integer from 1 to 6.");
  }
  if (!Number.isFinite(args.maxTokens) || args.maxTokens < 1000) {
    throw new Error("--max-tokens must be at least 1000.");
  }
  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs < 10000) {
    throw new Error("--timeout-ms must be at least 10000.");
  }

  return args;
}

function printHelp() {
  console.log(`EASE DeepSeek V4 Pro QA runner

Usage:
  node coordination/content-qa/ease-deepseek-qa/ease-deepseek-v4-pro-qa.mjs --dry-run
  LLM_API_KEY=... node coordination/content-qa/ease-deepseek-qa/ease-deepseek-v4-pro-qa.mjs --pilot --sample-size 100
  LLM_API_KEY=... node coordination/content-qa/ease-deepseek-qa/ease-deepseek-v4-pro-qa.mjs --full

Modes:
  --inventory      Write structure/inventory reports only.
  --dry-run        Write inventory plus prompt samples only. No API call. Default.
  --pilot          Live DeepSeek run on a stratified sample.
  --full           Live DeepSeek run on all rows, or --offset/--limit range.
  --summarize      Rebuild reports from cached batch JSON without API calls.

Live provider env:
  LLM_API_KEY      Required for live runs. Do not pass secrets as command args.
  LLM_API_URL      Optional; defaults to https://api.deepseek.com/chat/completions.
  LLM_MODEL        Optional; defaults to deepseek-v4-pro.
`);
}

function readEnvFile(filePath) {
  if (!filePath) return {};
  const resolved = path.resolve(projectRoot, filePath);
  if (!fs.existsSync(resolved)) throw new Error(`Env file does not exist: ${filePath}`);
  const env = {};
  for (const line of fs.readFileSync(resolved, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

function providerConfig(args) {
  const fileEnv = readEnvFile(args.envFile);
  const apiKey = process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY || fileEnv.LLM_API_KEY || fileEnv.DEEPSEEK_API_KEY;
  const apiUrl = process.env.LLM_API_URL || fileEnv.LLM_API_URL || "https://api.deepseek.com/chat/completions";
  const model = process.env.LLM_MODEL || fileEnv.LLM_MODEL || "deepseek-v4-pro";
  const host = new URL(apiUrl).hostname;
  if (!host.includes("api.deepseek.com")) throw new Error(`Refusing non-DeepSeek endpoint: ${host}`);
  if (model !== "deepseek-v4-pro") throw new Error(`Refusing non-DeepSeek V4 Pro model: ${model}`);
  return { apiKey, apiUrl, model, host };
}

function readEaseQuestions() {
  const payload = JSON.parse(fs.readFileSync(inputJsonPath, "utf8"));
  if (!payload || !Array.isArray(payload.questions)) {
    throw new Error("data/ease/ease_questions_all.json does not contain a questions array.");
  }
  return { metadata: payload.metadata ?? {}, questions: payload.questions };
}

function questionId(question) {
  return String(question.id ?? "");
}

function answerIsMissing(question) {
  const answer = String(question.standardAnswer ?? "").trim();
  return !answer || answer === "<not provided from school>";
}

function questionImages(question) {
  return Array.isArray(question.files?.questionImages) ? question.files.questionImages : [];
}

function hasImage(question) {
  return questionImages(question).length > 0 || /\[@\].+?\[@\]/.test(String(question.questionText ?? ""));
}

function compactTopic(topic) {
  return {
    id: topic?.id ?? null,
    name: topic?.name ?? null,
    enName: topic?.enName ?? null,
    mtrId: topic?.mtrId ?? null
  };
}

function compactQuestion(question) {
  const images = questionImages(question).map((image) => ({
    name: image.name ?? null,
    relativePath: image.relativePath ?? null,
    readableByThisRun: false
  }));
  return {
    questionId: questionId(question),
    level: question.level ?? null,
    levelZh: question.levelZh ?? null,
    grade: question.grade ?? null,
    gradeTextZh: question.gradeTextZh ?? null,
    gradeTextEn: question.gradeTextEn ?? null,
    questionType: question.questionType ?? null,
    difficultyLevel: question.difficultyLevel ?? null,
    locale: question.locale ?? null,
    originName: question.originName ?? null,
    questionText: truncate(String(question.questionText ?? ""), 6500),
    questionTextEn: truncate(String(question.questionTextEn ?? ""), 3000),
    standardAnswer: question.standardAnswer ?? null,
    standardAnswerEn: question.standardAnswerEn ?? null,
    hasImage: hasImage(question),
    images,
    noteForImages: images.length
      ? "This DeepSeek text QA run cannot inspect local images directly. If the image is needed to solve the item, return solvabilityStatus image-context-required."
      : null,
    topics: Array.isArray(question.topics) ? question.topics.map(compactTopic) : [],
    knowledgePoints: Array.isArray(question.knowledgePoints) ? question.knowledgePoints.map(compactTopic) : []
  };
}

function truncate(value, maxLength) {
  const text = String(value ?? "");
  return text.length > maxLength ? `${text.slice(0, maxLength)}...[truncated]` : text;
}

function buildInventory(metadata, questions) {
  const idCounts = new Map();
  const localImageIssues = [];
  const missingRequiredRows = [];
  const counts = {
    byLevel: {},
    byGrade: {},
    byQuestionType: {},
    byOriginName: {},
    byLocale: {}
  };

  for (const question of questions) {
    const id = questionId(question);
    idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
    increment(counts.byLevel, question.level ?? "unknown");
    increment(counts.byGrade, question.grade ?? "unknown");
    increment(counts.byQuestionType, question.questionType ?? "unknown");
    increment(counts.byOriginName, question.originName ?? "unknown");
    increment(counts.byLocale, question.locale ?? "unknown");

    const missing = [];
    for (const field of ["id", "questionText", "questionType"]) {
      if (question[field] === undefined || question[field] === null || String(question[field]).trim() === "") missing.push(field);
    }
    if (missing.length) missingRequiredRows.push({ questionId: id || "<missing>", missing });

    for (const image of questionImages(question)) {
      if (image.localPath && !fs.existsSync(image.localPath)) {
        localImageIssues.push({
          questionId: id,
          name: image.name ?? "",
          relativePath: image.relativePath ?? "",
          issue: "missing-local-image-file"
        });
      }
    }
  }

  const duplicateIds = Array.from(idCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([id, count]) => ({ questionId: id, count }));

  return {
    generatedAt: new Date().toISOString(),
    source: path.relative(projectRoot, inputJsonPath),
    metadataDownloadedAt: metadata.downloadedAt ?? null,
    sourceTotalQuestions: metadata.totalQuestions ?? null,
    totalQuestions: questions.length,
    duplicateIds,
    duplicateIdCount: duplicateIds.length,
    missingRequiredRows,
    missingRequiredRowCount: missingRequiredRows.length,
    missingAnswerKeyCount: questions.filter(answerIsMissing).length,
    hasAnswerKeyCount: questions.filter((question) => !answerIsMissing(question)).length,
    withQuestionImages: questions.filter(hasImage).length,
    withoutQuestionImages: questions.filter((question) => !hasImage(question)).length,
    localImageIssueCount: localImageIssues.length,
    localImageIssues,
    aiSolveTrueCount: questions.filter((question) => question.aiSolve === true).length,
    counts
  };
}

function increment(record, key) {
  const normalized = String(key ?? "unknown");
  record[normalized] = (record[normalized] ?? 0) + 1;
}

function writeInventoryReports(args, inventory) {
  const jsonPath = path.join(outputDir, `${args.reportDate}-S18-ease-inventory-summary.json`);
  const mdPath = path.join(outputDir, `${args.reportDate}-S18-ease-inventory-summary.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(inventory, null, 2)}\n`);

  const markdown = `# EASE Question Inventory Summary

- Date: ${args.reportDate}
- Session ID: S18
- Source: \`${inventory.source}\`
- Total questions: ${inventory.totalQuestions}
- Metadata total: ${inventory.sourceTotalQuestions ?? "n/a"}
- Duplicate ID rows: ${inventory.duplicateIdCount}
- Missing required-field rows: ${inventory.missingRequiredRowCount}
- Missing answer-key rows: ${inventory.missingAnswerKeyCount}
- Rows with question images/placeholders: ${inventory.withQuestionImages}
- Missing local image files: ${inventory.localImageIssueCount}
- AI-solve true rows: ${inventory.aiSolveTrueCount}

## Counts By Question Type

${markdownCountTable("Question type", inventory.counts.byQuestionType)}

## Counts By Level

${markdownCountTable("Level", inventory.counts.byLevel)}

## Counts By Grade

${markdownCountTable("Grade", inventory.counts.byGrade)}

## Notes

- This inventory does not call DeepSeek and does not inspect or write real secret files.
- Rows with \`standardAnswer\` equal to \`<not provided from school>\` must receive \`answerMatchStatus=missing-answer-key\` in model QA.
- Image rows are text-checked only unless a separate vision/OCR workflow is approved.
`;
  fs.writeFileSync(mdPath, markdown);
  return { jsonPath, mdPath };
}

function markdownCountTable(label, counts) {
  const rows = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => `| ${key} | ${value} |`)
    .join("\n");
  return `| ${label} | Count |\n| --- | ---: |\n${rows || "| none | 0 |"}`;
}

function stratifiedSample(questions, sampleSize) {
  const buckets = new Map();
  for (const question of questions) {
    const key = [
      question.level ?? "unknown",
      question.questionType ?? "unknown",
      hasImage(question) ? "image" : "text",
      answerIsMissing(question) ? "missing-answer" : "has-answer"
    ].join("|");
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(question);
  }

  const bucketKeys = Array.from(buckets.keys()).sort();
  const picked = [];
  const pickedIds = new Set();
  let round = 0;
  while (picked.length < Math.min(sampleSize, questions.length)) {
    let changed = false;
    for (const key of bucketKeys) {
      const bucket = buckets.get(key);
      const candidate = bucket?.[round];
      if (!candidate) continue;
      const id = questionId(candidate);
      if (!pickedIds.has(id)) {
        picked.push(candidate);
        pickedIds.add(id);
        changed = true;
        if (picked.length >= Math.min(sampleSize, questions.length)) break;
      }
    }
    if (!changed) break;
    round += 1;
  }
  return picked;
}

function selectQuestions(args, questions) {
  if (args.mode === "pilot") return stratifiedSample(questions, args.sampleSize);
  if (args.mode === "full") {
    return questions.slice(args.offset, args.limit === null ? undefined : args.offset + args.limit);
  }
  return dryRunSample(questions, args.dryRunPrompts);
}

function dryRunSample(questions, sampleSize) {
  const targets = [
    (question) => question.questionType === "MCQ" && !hasImage(question) && !answerIsMissing(question),
    (question) => question.questionType === "BFQ" && !hasImage(question) && !answerIsMissing(question),
    (question) => question.questionType === "FRQ" && !hasImage(question) && !answerIsMissing(question),
    (question) => question.questionType === "FRQ" && hasImage(question) && !answerIsMissing(question),
    (question) => question.questionType === "FRQ" && answerIsMissing(question)
  ];
  const picked = [];
  const pickedIds = new Set();
  for (const predicate of targets) {
    const question = questions.find((candidate) => predicate(candidate) && !pickedIds.has(questionId(candidate)));
    if (!question) continue;
    picked.push(question);
    pickedIds.add(questionId(question));
    if (picked.length >= sampleSize) return picked;
  }
  for (const question of stratifiedSample(questions, sampleSize)) {
    if (pickedIds.has(questionId(question))) continue;
    picked.push(question);
    pickedIds.add(questionId(question));
    if (picked.length >= sampleSize) break;
  }
  return picked;
}

function scopeName(args, selectedCount, totalCount) {
  if (args.mode === "pilot") return `pilot-${selectedCount}`;
  if (args.mode === "full" && args.offset === 0 && (args.limit === null || args.limit >= totalCount)) return "full";
  if (args.mode === "full") return `range-${args.offset}-${selectedCount}`;
  return args.mode;
}

function chunkRows(rows, batchSize) {
  const batches = [];
  for (let index = 0; index < rows.length; index += batchSize) {
    batches.push({
      batchIndex: batches.length + 1,
      startIndex: index,
      rows: rows.slice(index, index + batchSize)
    });
  }
  return batches;
}

function buildMessages(batchRows) {
  return [
    {
      role: "system",
      content: [
        "You are S18, a strict Hong Kong mathematics content-QA reviewer.",
        "Task: independently review EASE math questions for two gates: (1) whether the item is solvable from the provided question text and available non-image information, and (2) whether standardAnswer matches the question.",
        "The run is text-only. You cannot inspect local images or URLs. If an item needs a diagram, graph, table, calendar, screenshot, or any image content that is not fully described in text, use solvabilityStatus image-context-required. Do not guess from the image filename.",
        "For MCQ/BFQ, verify exactly one option is mathematically correct and the answer key identifies it. For FRQ, derive an independent answer and compare it to standardAnswer.",
        "If standardAnswer is missing or equals <not provided from school>, set answerMatchStatus to missing-answer-key. You may still judge solvability and provide an independentAnswer when possible.",
        "Use P0 for unsolvable or answer-mismatch hard blockers, P1 for missing answer keys, image-context-required, ambiguous/not-checkable rows, and P2 for minor wording/format issues. Clean rows use severity none.",
        "Return JSON only. Do not include markdown. Use this exact schema:",
        '{"items":[{"questionId":"string","questionType":"MCQ|FRQ|BFQ|unknown","hasImage":false,"standardAnswer":"string|null","independentAnswer":"string|null","solvabilityStatus":"pass|unsolvable|ambiguous|image-context-required|api-error","answerMatchStatus":"pass|mismatch|missing-answer-key|not-checkable","severity":"P0|P1|P2|none","reason":"short reason in Chinese or English","recommendedAction":"short action"}],"batchSummary":{"pass":0,"unsolvable":0,"ambiguous":0,"imageContextRequired":0,"answerMismatch":0,"missingAnswerKey":0,"notes":"short summary"}}'
      ].join("\n")
    },
    {
      role: "user",
      content: JSON.stringify({
        task: `Review these ${batchRows.length} EASE questions for solvability and answer-key consistency.`,
        questions: batchRows.map(compactQuestion)
      })
    }
  ];
}

function writeDryRun(args, inventory, selectedQuestions) {
  const promptSamples = selectedQuestions.slice(0, args.dryRunPrompts).map((question) => ({
    questionId: questionId(question),
    questionType: question.questionType ?? null,
    hasImage: hasImage(question),
    missingAnswerKey: answerIsMissing(question),
    messages: buildMessages([question])
  }));
  const jsonPath = path.join(outputDir, `${args.reportDate}-S18-ease-deepseek-v4-pro-qa-dry-run-prompts.json`);
  const mdPath = path.join(outputDir, `${args.reportDate}-S18-ease-deepseek-v4-pro-qa-dry-run.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), promptSamples }, null, 2)}\n`);
  fs.writeFileSync(
    mdPath,
    `# EASE DeepSeek V4 Pro QA Dry Run

- Date: ${args.reportDate}
- Session ID: S18
- API calls made: 0
- Prompt samples written: ${promptSamples.length}
- Inventory total questions: ${inventory.totalQuestions}
- Missing answer-key rows: ${inventory.missingAnswerKeyCount}
- Rows with question images/placeholders: ${inventory.withQuestionImages}

## Prompt Sample IDs

${promptSamples.map((sample) => `- \`${sample.questionId}\` (${sample.questionType}, image=${sample.hasImage}, missingAnswerKey=${sample.missingAnswerKey})`).join("\n")}

## Next Commands

- Pilot: \`LLM_API_KEY=<rotated-key> node coordination/content-qa/ease-deepseek-qa/ease-deepseek-v4-pro-qa.mjs --pilot --sample-size 100 --batch-size 5 --concurrency 2\`
- Full: \`LLM_API_KEY=<rotated-key> node coordination/content-qa/ease-deepseek-qa/ease-deepseek-v4-pro-qa.mjs --full --batch-size 5 --concurrency 2\`
`
  );
  return { jsonPath, mdPath };
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

function redact(value) {
  return String(value ?? "")
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]");
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function callDeepSeek({ config, args, messages }) {
  const first = await postDeepSeek({ config, args, messages, structuredJson: true });
  if (first.ok) return { ...first, jsonModeFallback: false };

  const message = `${first.errorMessage ?? ""} ${first.text ?? ""}`;
  if (/response_format|json[_ -]?object|json mode|unsupported/i.test(message)) {
    const fallback = await postDeepSeek({ config, args, messages, structuredJson: false });
    if (fallback.ok) return { ...fallback, jsonModeFallback: true };
    throw new Error(fallback.errorMessage);
  }

  throw new Error(first.errorMessage);
}

function addUsage(total, usage) {
  if (!usage) return total;
  return {
    prompt_tokens: (total.prompt_tokens ?? 0) + (usage.prompt_tokens ?? 0),
    completion_tokens: (total.completion_tokens ?? 0) + (usage.completion_tokens ?? 0),
    total_tokens: (total.total_tokens ?? 0) + (usage.total_tokens ?? 0)
  };
}

async function postDeepSeek({ config, args, messages, structuredJson }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs);
  const body = {
    model: config.model,
    messages,
    ...(structuredJson ? { response_format: { type: "json_object" } } : {}),
    thinking: { type: "enabled" },
    reasoning_effort: "high",
    stream: false,
    temperature: 0,
    max_tokens: args.maxTokens
  };

  try {
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const text = await response.text();
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        text,
        errorMessage: `DeepSeek HTTP ${response.status}: ${redact(payload?.error?.message ?? text.slice(0, 500))}`
      };
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return {
        ok: false,
        status: response.status,
        text,
        errorMessage: "DeepSeek response did not include message content"
      };
    }

    return {
      ok: true,
      content,
      usage: payload?.usage ?? null,
      finishReason: payload?.choices?.[0]?.finish_reason ?? null
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      text: "",
      errorMessage: redact(error?.name === "AbortError" ? "DeepSeek request timed out" : error?.message ?? error)
    };
  } finally {
    clearTimeout(timeout);
  }
}

function batchFilePath(scope, batchIndex) {
  return path.join(batchDir, `${scope}-batch-${String(batchIndex).padStart(4, "0")}.json`);
}

function errorFilePath(scope, batchIndex) {
  return path.join(errorDir, `${scope}-batch-${String(batchIndex).padStart(4, "0")}.json`);
}

function validateAndFinalizeBatchResult(rawResult, batchRows) {
  if (!rawResult || !Array.isArray(rawResult.items)) throw new Error("result.items is missing");
  const byId = new Map(batchRows.map((row) => [questionId(row), row]));
  const seen = new Set();
  const items = rawResult.items.map((item) => {
    const id = String(item.questionId ?? item.id ?? "");
    if (!byId.has(id)) throw new Error(`unexpected result id ${id}`);
    if (seen.has(id)) throw new Error(`duplicate result id ${id}`);
    seen.add(id);
    const question = byId.get(id);
    const finalized = {
      questionId: id,
      questionType: String(item.questionType ?? question.questionType ?? "unknown"),
      hasImage: Boolean(item.hasImage ?? hasImage(question)),
      standardAnswer: item.standardAnswer ?? question.standardAnswer ?? null,
      independentAnswer: item.independentAnswer === undefined ? null : item.independentAnswer,
      solvabilityStatus: String(item.solvabilityStatus ?? ""),
      answerMatchStatus: String(item.answerMatchStatus ?? ""),
      severity: String(item.severity ?? ""),
      reason: truncate(String(item.reason ?? ""), 800),
      recommendedAction: truncate(String(item.recommendedAction ?? ""), 800)
    };

    if (!validSolvabilityStatuses.includes(finalized.solvabilityStatus)) {
      throw new Error(`invalid solvabilityStatus for ${id}`);
    }
    if (!validAnswerMatchStatuses.includes(finalized.answerMatchStatus)) {
      throw new Error(`invalid answerMatchStatus for ${id}`);
    }
    if (!validSeverities.includes(finalized.severity)) {
      throw new Error(`invalid severity for ${id}`);
    }

    return applyLocalVerdictRules(finalized, question);
  });

  for (const id of byId.keys()) {
    if (!seen.has(id)) throw new Error(`missing result id ${id}`);
  }

  return {
    items,
    batchSummary: rawResult.batchSummary ?? {}
  };
}

function applyLocalVerdictRules(item, question) {
  const missingAnswerKey = answerIsMissing(question);
  const normalized = { ...item };

  if (missingAnswerKey) {
    normalized.answerMatchStatus = "missing-answer-key";
    if (normalized.severity === "none") normalized.severity = "P1";
    if (!normalized.recommendedAction) normalized.recommendedAction = "Add or verify the missing school answer key before release.";
  }

  if (normalized.solvabilityStatus === "api-error") {
    normalized.answerMatchStatus = "not-checkable";
    normalized.severity = "P1";
  }

  if (normalized.solvabilityStatus === "pass" && normalized.answerMatchStatus === "pass") {
    normalized.severity = "none";
  }

  if (normalized.solvabilityStatus === "unsolvable" || normalized.answerMatchStatus === "mismatch") {
    normalized.severity = "P0";
  }

  if (
    ["ambiguous", "image-context-required"].includes(normalized.solvabilityStatus) ||
    normalized.answerMatchStatus === "not-checkable"
  ) {
    if (normalized.severity === "none" || normalized.severity === "P2") normalized.severity = "P1";
  }

  if (!normalized.reason) normalized.reason = "No model reason provided.";
  if (!normalized.recommendedAction) {
    normalized.recommendedAction = normalized.severity === "none"
      ? "No blocking action."
      : "Review this row under S18 content QA before release.";
  }

  return normalized;
}

function apiErrorResult(batchRows, errorMessage) {
  return {
    items: batchRows.map((question) => ({
      questionId: questionId(question),
      questionType: question.questionType ?? "unknown",
      hasImage: hasImage(question),
      standardAnswer: question.standardAnswer ?? null,
      independentAnswer: null,
      solvabilityStatus: "api-error",
      answerMatchStatus: answerIsMissing(question) ? "missing-answer-key" : "not-checkable",
      severity: "P1",
      reason: `API or schema failure after retries: ${redact(errorMessage)}`,
      recommendedAction: "Rerun this batch with a rotated valid key and stable provider response."
    })),
    batchSummary: {
      pass: 0,
      unsolvable: 0,
      ambiguous: 0,
      imageContextRequired: 0,
      answerMismatch: 0,
      missingAnswerKey: batchRows.filter(answerIsMissing).length,
      notes: "Batch was not checkable because the provider call or response schema failed."
    }
  };
}

async function reviewBatch({ batch, scope, config, args }) {
  const filePath = batchFilePath(scope, batch.batchIndex);
  if (!args.force && fs.existsSync(filePath)) {
    const cached = JSON.parse(fs.readFileSync(filePath, "utf8"));
    cached.result = validateAndFinalizeBatchResult(cached.result, batch.rows);
    return { ...cached, cached: true };
  }

  const messages = buildMessages(batch.rows);
  let lastError = null;
  for (let attempt = 1; attempt <= args.maxAttempts; attempt += 1) {
    try {
      const startedAt = new Date().toISOString();
      const response = await callDeepSeek({ config, args, messages });
      const parsed = parseJsonObject(response.content);
      const result = validateAndFinalizeBatchResult(parsed, batch.rows);
      const record = {
        scope,
        batchIndex: batch.batchIndex,
        startedAt,
        completedAt: new Date().toISOString(),
        model: config.model,
        apiHost: config.host,
        itemIds: batch.rows.map(questionId),
        usage: response.usage,
        finishReason: response.finishReason,
        jsonModeFallback: response.jsonModeFallback,
        result
      };
      fs.writeFileSync(filePath, `${JSON.stringify(record, null, 2)}\n`);
      return { ...record, cached: false };
    } catch (error) {
      lastError = error;
      if (attempt < args.maxAttempts) await sleep(2500 * attempt);
    }
  }

  const fallback = await reviewSingleQuestionFallback({
    batchRows: batch.rows,
    scope,
    batchIndex: batch.batchIndex,
    config,
    args,
    batchError: lastError
  });
  if (fallback) {
    const record = {
      scope,
      batchIndex: batch.batchIndex,
      startedAt: fallback.startedAt,
      completedAt: new Date().toISOString(),
      model: config.model,
      apiHost: config.host,
      itemIds: batch.rows.map(questionId),
      usage: fallback.usage,
      finishReason: "single-question-fallback",
      jsonModeFallback: fallback.jsonModeFallback,
      batchProviderError: redact(lastError?.message ?? lastError),
      singleQuestionFallback: true,
      result: fallback.result
    };
    fs.writeFileSync(filePath, `${JSON.stringify(record, null, 2)}\n`);
    return { ...record, cached: false };
  }

  const result = validateAndFinalizeBatchResult(apiErrorResult(batch.rows, lastError?.message ?? lastError), batch.rows);
  const record = {
    scope,
    batchIndex: batch.batchIndex,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    model: config.model,
    apiHost: config.host,
    itemIds: batch.rows.map(questionId),
    usage: null,
    finishReason: null,
    jsonModeFallback: null,
    providerError: redact(lastError?.message ?? lastError),
    result
  };
  fs.writeFileSync(filePath, `${JSON.stringify(record, null, 2)}\n`);
  fs.writeFileSync(errorFilePath(scope, batch.batchIndex), `${JSON.stringify(record, null, 2)}\n`);
  return { ...record, cached: false };
}

async function reviewSingleQuestionFallback({ batchRows, scope, batchIndex, config, args, batchError }) {
  const startedAt = new Date().toISOString();
  const items = [];
  let usage = {};
  let usedJsonModeFallback = false;
  let successfulItems = 0;

  for (const question of batchRows) {
    let lastError = null;
    let succeeded = false;
    for (let attempt = 1; attempt <= args.maxAttempts; attempt += 1) {
      try {
        const response = await callDeepSeek({ config, args, messages: buildMessages([question]) });
        const parsed = parseJsonObject(response.content);
        const result = validateAndFinalizeBatchResult(parsed, [question]);
        items.push(result.items[0]);
        usage = addUsage(usage, response.usage);
        usedJsonModeFallback = usedJsonModeFallback || Boolean(response.jsonModeFallback);
        successfulItems += 1;
        succeeded = true;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < args.maxAttempts) await sleep(1500 * attempt);
      }
    }
    if (!succeeded) {
      const result = validateAndFinalizeBatchResult(apiErrorResult([question], lastError?.message ?? lastError), [question]);
      items.push(result.items[0]);
    }
  }

  if (successfulItems === 0) return null;
  const result = validateAndFinalizeBatchResult({ items, batchSummary: fallbackBatchSummary(items, batchError) }, batchRows);
  const apiErrors = result.items.filter((item) => item.solvabilityStatus === "api-error");
  if (apiErrors.length) {
    fs.writeFileSync(
      errorFilePath(scope, batchIndex),
      `${JSON.stringify({
        scope,
        batchIndex,
        startedAt,
        completedAt: new Date().toISOString(),
        model: config.model,
        apiHost: config.host,
        itemIds: batchRows.map(questionId),
        batchProviderError: redact(batchError?.message ?? batchError),
        singleQuestionFallback: true,
        apiErrorItemIds: apiErrors.map((item) => item.questionId),
        result
      }, null, 2)}\n`
    );
  }
  return {
    startedAt,
    usage,
    jsonModeFallback: usedJsonModeFallback,
    result
  };
}

function fallbackBatchSummary(items, batchError) {
  return {
    pass: items.filter((item) => item.solvabilityStatus === "pass" && item.answerMatchStatus === "pass").length,
    unsolvable: items.filter((item) => item.solvabilityStatus === "unsolvable").length,
    ambiguous: items.filter((item) => item.solvabilityStatus === "ambiguous").length,
    imageContextRequired: items.filter((item) => item.solvabilityStatus === "image-context-required").length,
    answerMismatch: items.filter((item) => item.answerMatchStatus === "mismatch").length,
    missingAnswerKey: items.filter((item) => item.answerMatchStatus === "missing-answer-key").length,
    notes: `Batch-level request failed (${redact(batchError?.message ?? batchError)}); item-level fallback was used.`
  };
}

async function runWithConcurrency(items, concurrency, worker) {
  const results = [];
  let nextIndex = 0;
  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker));
  return results;
}

function cachedRecordsForScope(scope) {
  if (!fs.existsSync(batchDir)) return [];
  return fs
    .readdirSync(batchDir)
    .filter((name) => name.startsWith(`${scope}-batch-`) && name.endsWith(".json"))
    .sort()
    .map((name) => JSON.parse(fs.readFileSync(path.join(batchDir, name), "utf8")));
}

function rowForResult(item, question, scope) {
  return {
    questionId: item.questionId,
    questionType: item.questionType,
    level: question?.level ?? "",
    grade: question?.grade ?? "",
    originName: question?.originName ?? "",
    locale: question?.locale ?? "",
    hasImage: item.hasImage,
    missingAnswerKey: answerIsMissing(question ?? {}),
    standardAnswer: item.standardAnswer,
    independentAnswer: item.independentAnswer,
    solvabilityStatus: item.solvabilityStatus,
    answerMatchStatus: item.answerMatchStatus,
    severity: item.severity,
    reason: item.reason,
    recommendedAction: item.recommendedAction,
    questionTextExcerpt: truncate(String(question?.questionText ?? ""), 260),
    scope
  };
}

function summarizeRecords(records, selectedQuestions, allQuestions, args, scope, inventory, config) {
  const byId = new Map(allQuestions.map((question) => [questionId(question), question]));
  const rows = records.flatMap((record) =>
    record.result.items.map((item) => rowForResult(item, byId.get(item.questionId), scope))
  );
  const reviewedIds = new Set(rows.map((row) => row.questionId));
  const missingSelectedRows = selectedQuestions
    .filter((question) => !reviewedIds.has(questionId(question)))
    .map((question) => rowForResult({
      questionId: questionId(question),
      questionType: question.questionType ?? "unknown",
      hasImage: hasImage(question),
      standardAnswer: question.standardAnswer ?? null,
      independentAnswer: null,
      solvabilityStatus: "api-error",
      answerMatchStatus: answerIsMissing(question) ? "missing-answer-key" : "not-checkable",
      severity: "P1",
      reason: "No cached or live result was found for this selected row.",
      recommendedAction: "Rerun the missing batch."
    }, question, scope));
  const allRows = rows.concat(missingSelectedRows);
  const issueRows = allRows.filter((row) => row.severity !== "none" || row.solvabilityStatus !== "pass" || row.answerMatchStatus !== "pass");
  const p0Rows = allRows.filter((row) => row.severity === "P0");
  const p1Rows = allRows.filter((row) => row.severity === "P1");
  const p2Rows = allRows.filter((row) => row.severity === "P2");
  const usage = records.reduce(
    (total, record) => {
      total.promptTokens += record.usage?.prompt_tokens ?? 0;
      total.completionTokens += record.usage?.completion_tokens ?? 0;
      total.totalTokens += record.usage?.total_tokens ?? 0;
      return total;
    },
    { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
  );
  const selectedCount = selectedQuestions.length;
  const skippedCount = args.mode === "full" && selectedCount === allQuestions.length ? 0 : allQuestions.length - selectedCount;
  return {
    reportDate: args.reportDate,
    generatedAt: new Date().toISOString(),
    sessionId: "S18",
    source: path.relative(projectRoot, inputJsonPath),
    model: config?.model ?? "deepseek-v4-pro",
    apiHost: config?.host ?? "api.deepseek.com",
    scope,
    summary: {
      totalQuestions: allQuestions.length,
      selectedQuestions: selectedCount,
      reviewedRows: allRows.length,
      skippedRows: skippedCount,
      apiErrorRows: allRows.filter((row) => row.solvabilityStatus === "api-error").length,
      missingSelectedRows: missingSelectedRows.length,
      issueRows: issueRows.length,
      p0Rows: p0Rows.length,
      p1Rows: p1Rows.length,
      p2Rows: p2Rows.length,
      solvabilityStatusCounts: countBy(allRows, (row) => row.solvabilityStatus),
      answerMatchStatusCounts: countBy(allRows, (row) => row.answerMatchStatus),
      severityCounts: countBy(allRows, (row) => row.severity),
      questionTypeCounts: countBy(allRows, (row) => row.questionType),
      hasImageCounts: countBy(allRows, (row) => String(row.hasImage)),
      usage,
      completionEquation: {
        processedPlusSkippedPlusApiError: allRows.filter((row) => row.solvabilityStatus !== "api-error").length + skippedCount + allRows.filter((row) => row.solvabilityStatus === "api-error").length,
        expectedTotal: allQuestions.length
      },
      releaseRecommendation: p0Rows.length
        ? "Red: answer-key/solvability release gate is blocked until P0 rows are reviewed or fixed."
        : p1Rows.length
          ? "Amber: no P0 row found, but P1 not-checkable/missing-answer/image-context rows require S18 follow-up."
          : "Green for checked scope: no blocking solvability or answer-key mismatch found."
    },
    inventorySummary: {
      missingAnswerKeyCount: inventory.missingAnswerKeyCount,
      withQuestionImages: inventory.withQuestionImages,
      duplicateIdCount: inventory.duplicateIdCount,
      localImageIssueCount: inventory.localImageIssueCount
    },
    rows: allRows,
    issueRows,
    p0Rows,
    p1Rows,
    p2Rows,
    assumptions: [
      "The EASE source JSON is read-only for this QA runner.",
      "DeepSeek-v4-pro is used as the independent text QA reviewer.",
      "Local image files are not sent to DeepSeek in this text-only runner; image-dependent rows must be marked image-context-required.",
      "Rows with <not provided from school> answer keys are solvability-checkable but answer-key consistency is missing-answer-key."
    ]
  };
}

function countBy(items, keyFn) {
  return items.reduce((counts, item) => {
    const key = String(keyFn(item));
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function reportBaseName(args, scope) {
  const exact = `${args.reportDate}-S18-ease-deepseek-v4-pro-qa`;
  return scope === "full" ? exact : `${exact}-${scope}`;
}

function writeQaReports(report, args, scope) {
  const baseName = reportBaseName(args, scope);
  const jsonPath = path.join(outputDir, `${baseName}.json`);
  const csvPath = path.join(outputDir, `${baseName}.csv`);
  const mdPath = path.join(outputDir, `${baseName}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeCsv(csvPath, report.rows, [
    "questionId",
    "questionType",
    "level",
    "grade",
    "originName",
    "locale",
    "hasImage",
    "missingAnswerKey",
    "standardAnswer",
    "independentAnswer",
    "solvabilityStatus",
    "answerMatchStatus",
    "severity",
    "reason",
    "recommendedAction",
    "questionTextExcerpt",
    "scope"
  ]);
  fs.writeFileSync(mdPath, qaMarkdown(report));
  return { jsonPath, csvPath, mdPath };
}

function qaMarkdown(report) {
  const issuePreview = report.issueRows.length
    ? report.issueRows
        .slice(0, 100)
        .map((row) => `| \`${row.questionId}\` | ${row.questionType} | ${row.grade} | ${row.hasImage} | ${row.solvabilityStatus} | ${row.answerMatchStatus} | ${row.severity} | ${escapeMarkdownCell(row.reason)} | ${escapeMarkdownCell(row.recommendedAction)} |`)
        .join("\n")
    : "| None | - | - | - | - | - | - | - | - |";

  return `# EASE DeepSeek V4 Pro QA Report

- Date: ${report.reportDate}
- Session ID: ${report.sessionId}
- Source: \`${report.source}\`
- Scope: \`${report.scope}\`
- Model: \`${report.model}\`
- API host: \`${report.apiHost}\`
- Selected rows: ${report.summary.selectedQuestions}
- Reviewed rows: ${report.summary.reviewedRows}
- Skipped rows: ${report.summary.skippedRows}
- API-error rows: ${report.summary.apiErrorRows}

## Executive Summary

| Metric | Count |
| --- | ---: |
| Total EASE questions | ${report.summary.totalQuestions} |
| Selected for this run | ${report.summary.selectedQuestions} |
| Reviewed/result rows | ${report.summary.reviewedRows} |
| Issue rows | ${report.summary.issueRows} |
| P0 rows | ${report.summary.p0Rows} |
| P1 rows | ${report.summary.p1Rows} |
| P2 rows | ${report.summary.p2Rows} |
| Missing answer-key rows in inventory | ${report.inventorySummary.missingAnswerKeyCount} |
| Image rows in inventory | ${report.inventorySummary.withQuestionImages} |

Release recommendation: ${report.summary.releaseRecommendation}

## Solvability Status Counts

${markdownCountTable("Solvability status", report.summary.solvabilityStatusCounts)}

## Answer-Match Status Counts

${markdownCountTable("Answer-match status", report.summary.answerMatchStatusCounts)}

## Issue Preview

| Question ID | Type | Grade | Image | Solvability | Answer match | Severity | Reason | Recommended action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${issuePreview}

## Completion Check

- Processed non-error + skipped + API-error: ${report.summary.completionEquation.processedPlusSkippedPlusApiError}
- Expected total: ${report.summary.completionEquation.expectedTotal}

## Secret Hygiene

- No API key, bearer token, request header, or raw provider transcript is written by this runner.
- Live runs should use a rotated key in \`LLM_API_KEY\`; do not pass keys as command-line arguments.
- The exposed chat key should be considered compromised and rotated by S19/owner before full QA.
`;
}

function escapeMarkdownCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"` : text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function printEvent(event) {
  console.log(JSON.stringify(event));
}

async function main() {
  const args = parseArgs(process.argv);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(batchDir, { recursive: true });
  fs.mkdirSync(errorDir, { recursive: true });

  const { metadata, questions } = readEaseQuestions();
  const inventory = buildInventory(metadata, questions);
  const inventoryPaths = writeInventoryReports(args, inventory);

  if (args.mode === "inventory") {
    printEvent({
      event: "ease-qa-inventory-complete",
      totalQuestions: inventory.totalQuestions,
      missingAnswerKeyCount: inventory.missingAnswerKeyCount,
      withQuestionImages: inventory.withQuestionImages,
      inventoryPath: path.relative(projectRoot, inventoryPaths.mdPath)
    });
    return;
  }

  const selectedQuestions = selectQuestions(args, questions);
  const scope = scopeName(args, selectedQuestions.length, questions.length);

  if (args.mode === "dry-run") {
    const dryRunPaths = writeDryRun(args, inventory, selectedQuestions);
    printEvent({
      event: "ease-qa-dry-run-complete",
      apiCalls: 0,
      totalQuestions: questions.length,
      promptSamples: Math.min(args.dryRunPrompts, selectedQuestions.length),
      inventoryPath: path.relative(projectRoot, inventoryPaths.mdPath),
      dryRunPath: path.relative(projectRoot, dryRunPaths.mdPath)
    });
    return;
  }

  const config = providerConfig(args);

  if (args.summarize) {
    const records = cachedRecordsForScope(scope);
    const report = summarizeRecords(records, selectedQuestions, questions, args, scope, inventory, config);
    const paths = writeQaReports(report, args, scope);
    printEvent({
      event: "ease-qa-summary-complete",
      scope,
      cachedBatches: records.length,
      reviewedRows: report.summary.reviewedRows,
      issueRows: report.summary.issueRows,
      reportPath: path.relative(projectRoot, paths.mdPath)
    });
    return;
  }

  if (!config.apiKey) {
    throw new Error("Missing LLM_API_KEY or DEEPSEEK_API_KEY in process environment. Rotate the exposed key before live QA.");
  }

  const batches = chunkRows(selectedQuestions, args.batchSize);
  printEvent({
    event: "ease-qa-live-start",
    scope,
    model: config.model,
    apiHost: config.host,
    selectedQuestions: selectedQuestions.length,
    batches: batches.length,
    batchSize: args.batchSize,
    concurrency: args.concurrency
  });

  const records = await runWithConcurrency(batches, args.concurrency, async (batch) => {
    const record = await reviewBatch({ batch, scope, config, args });
    const counts = countBy(record.result.items, (item) => item.solvabilityStatus);
    printEvent({
      event: "ease-qa-batch-complete",
      scope,
      batchIndex: batch.batchIndex,
      cached: record.cached,
      items: record.result.items.length,
      solvabilityStatusCounts: counts,
      apiErrorRows: record.result.items.filter((item) => item.solvabilityStatus === "api-error").length
    });
    return record;
  });

  const report = summarizeRecords(records, selectedQuestions, questions, args, scope, inventory, config);
  const paths = writeQaReports(report, args, scope);
  printEvent({
    event: "ease-qa-live-complete",
    scope,
    reviewedRows: report.summary.reviewedRows,
    issueRows: report.summary.issueRows,
    p0Rows: report.summary.p0Rows,
    p1Rows: report.summary.p1Rows,
    p2Rows: report.summary.p2Rows,
    apiErrorRows: report.summary.apiErrorRows,
    reportPath: path.relative(projectRoot, paths.mdPath)
  });
}

main().catch((error) => {
  console.error(JSON.stringify({
    event: "ease-qa-error",
    message: redact(error?.message ?? error)
  }));
  process.exitCode = 1;
});
