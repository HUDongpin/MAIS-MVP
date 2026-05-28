import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
const inputJsonl = path.join(__dirname, "questions.jsonl");
const outputDir = path.join(__dirname, "deepseek-v4-pro-qa");
const batchDir = path.join(outputDir, "batches");

const defaultBatchSize = 18;
const maxTokens = 6000;
const maxAttempts = 3;

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

  if (!Number.isInteger(args.batchSize) || args.batchSize < 1 || args.batchSize > 30) {
    throw new Error("--batch-size must be an integer from 1 to 30.");
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
    knowledgePointId: row.knowledgePointId,
    unitTitle: row.unitTitle,
    type: row.type,
    difficulty: row.difficulty,
    promptZhHans: row.promptZhHans,
    optionsZhHans: row.optionsZhHans,
    answer: row.answer,
    acceptedAnswers: row.acceptedAnswers,
    explanationZhHans: row.explanationZhHans
  };
}

function buildMessages(batch) {
  return [
    {
      role: "system",
      content: [
        "You are S18, a strict Mainland China junior math public-bank QA reviewer.",
        "Review legacy candidate questions for possible promotion into a public question bank.",
        "Check every item independently for mathematical correctness, answer/explanation alignment, multiple-choice ambiguity, missing conditions, grade/topic suitability for 人教版初中数学, unsafe visual/source artifacts, and public-readiness risk.",
        "Return JSON only. Do not include markdown.",
        "Use this exact schema:",
        '{"items":[{"id":"string","status":"pass|warn|fail","severity":"none|minor|major|blocker","issueTags":["math_error|answer_mismatch|ambiguous_mc|bad_options|missing_condition|grade_mismatch|source_artifact|copy_risk|language_issue|public_readiness"],"correctedAnswer":null,"rationale":"short Chinese reason"}],"batchSummary":{"pass":0,"warn":0,"fail":0,"notes":"short Chinese summary"}}',
        "For clean items use status pass, severity none, issueTags [], correctedAnswer null, and a very short rationale.",
        "Use warn only for non-blocking public-polish concerns; use fail for math, ambiguity, invalid option, missing-condition, or source/copy risk."
      ].join("\n")
    },
    {
      role: "user",
      content: `请用 json 审核以下 ${batch.length} 道 legacy v1 人教版初中候选题：\n${JSON.stringify(batch.map(compactQuestion))}`
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
  if (!result || !Array.isArray(result.items)) {
    throw new Error("result.items is missing");
  }
  const expectedIds = new Set(batch.map((row) => row.id));
  const seenIds = new Set();
  for (const item of result.items) {
    if (!expectedIds.has(item.id)) throw new Error(`unexpected result id ${item.id}`);
    if (seenIds.has(item.id)) throw new Error(`duplicate result id ${item.id}`);
    seenIds.add(item.id);
    if (!["pass", "warn", "fail"].includes(item.status)) {
      throw new Error(`invalid status for ${item.id}`);
    }
    if (!["none", "minor", "major", "blocker"].includes(item.severity)) {
      throw new Error(`invalid severity for ${item.id}`);
    }
    if (!Array.isArray(item.issueTags)) {
      throw new Error(`issueTags must be an array for ${item.id}`);
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
    })
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
}

function batchFileName(batchNumber) {
  return path.join(batchDir, `batch-${String(batchNumber).padStart(3, "0")}.json`);
}

async function reviewBatch({ batch, batchNumber, config, force }) {
  const filePath = batchFileName(batchNumber);
  if (!force && fs.existsSync(filePath)) {
    const cached = JSON.parse(fs.readFileSync(filePath, "utf8"));
    validateBatchResult(cached.result, batch);
    return { ...cached, cached: true };
  }

  const messages = buildMessages(batch);
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
      if (attempt < maxAttempts) await sleep(1500 * attempt);
    }
  }

  throw lastError;
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return /[",\n\r]/.test(text)
    ? `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"`
    : text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function hongKongDateString(date = new Date()) {
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

function summarize(records, questions) {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const itemResults = records.flatMap((record) =>
    record.result.items.map((item) => ({
      ...item,
      grade: byId.get(item.id)?.grade,
      semester: byId.get(item.id)?.semester,
      type: byId.get(item.id)?.type,
      knowledgePointId: byId.get(item.id)?.knowledgePointId,
      promptZhHans: byId.get(item.id)?.promptZhHans,
      answer: byId.get(item.id)?.answer
    }))
  );
  const statusCounts = itemResults.reduce((counts, item) => {
    counts[item.status] = (counts[item.status] ?? 0) + 1;
    return counts;
  }, {});
  const severityCounts = itemResults.reduce((counts, item) => {
    counts[item.severity] = (counts[item.severity] ?? 0) + 1;
    return counts;
  }, {});
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

  return { itemResults, statusCounts, severityCounts, usage, issues };
}

function writeSummary({ records, questions, config, args }) {
  const summary = summarize(records, questions);
  const generatedAt = new Date().toISOString();
  const resultJson = {
    generatedAt,
    model: config.model,
    apiHost: new URL(config.apiUrl).hostname,
    scope: "legacy-v1-mainland-pep-junior-candidate",
    batchSize: args.batchSize,
    totalQuestionsInScope: questions.length,
    reviewedCount: summary.itemResults.length,
    statusCounts: summary.statusCounts,
    severityCounts: summary.severityCounts,
    usage: summary.usage,
    issues: summary.issues,
    results: summary.itemResults
  };

  fs.writeFileSync(
    path.join(outputDir, "deepseek-v4-pro-qa-results.json"),
    `${JSON.stringify(resultJson, null, 2)}\n`
  );

  writeCsv(path.join(outputDir, "deepseek-v4-pro-qa-results.csv"), summary.itemResults, [
    "id",
    "grade",
    "semester",
    "type",
    "knowledgePointId",
    "status",
    "severity",
    "issueTags",
    "correctedAnswer",
    "rationale",
    "answer",
    "promptZhHans"
  ]);

  writeCsv(path.join(outputDir, "deepseek-v4-pro-qa-issues.csv"), summary.issues, [
    "id",
    "grade",
    "semester",
    "type",
    "knowledgePointId",
    "status",
    "severity",
    "issueTags",
    "correctedAnswer",
    "rationale",
    "answer",
    "promptZhHans"
  ]);

  const issuePreview = summary.issues.length
    ? summary.issues
        .slice(0, 40)
        .map(
          (item) =>
            `| \`${item.id}\` | ${item.grade} | ${item.type} | ${item.status} | ${item.severity} | ${item.issueTags.join(", ") || "-"} | ${item.rationale} |`
        )
        .join("\n")
    : "| None | - | - | - | - | - | - |";

  const markdown = `# DeepSeek V4 Pro QA - Mainland PEP Junior Legacy V1 Candidate

- Date: ${hongKongDateString()}
- Session ID: S18
- Scope: \`coordination/content-qa/mainland-pep-junior-generated-bank-v1/questions.jsonl\`
- Model: \`${config.model}\`
- API host: \`${new URL(config.apiUrl).hostname}\`
- Reviewed rows: ${summary.itemResults.length}
- Status counts: ${Object.entries(summary.statusCounts)
    .map(([key, value]) => `${key} ${value}`)
    .join(", ")}
- Severity counts: ${Object.entries(summary.severityCounts)
    .map(([key, value]) => `${key} ${value}`)
    .join(", ")}
- Token usage: prompt ${summary.usage.promptTokens}, completion ${summary.usage.completionTokens}, total ${summary.usage.totalTokens}

## QA Gate Result

${summary.issues.length === 0
    ? "DeepSeek V4 Pro found 0 warn/fail items in this run. This is supporting evidence for promotion evaluation, not automatic public promotion."
    : `DeepSeek V4 Pro flagged ${summary.issues.length} item(s). These must be reviewed or remediated before public promotion.`}

## Issue Preview

| ID | Grade | Type | Status | Severity | Tags | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
${issuePreview}

## Notes

- This run used the local redacted DeepSeek provider configuration. No secret values are recorded in this artifact.
- This QA artifact does not edit or promote public \`data/questions.ts\` entries.
- Existing deterministic solvability and source-distance gates should still be rerun immediately before any S04/S08/S18 public integration task.
`;

  fs.writeFileSync(path.join(outputDir, "deepseek-v4-pro-qa-summary.md"), markdown);

  return resultJson;
}

async function main() {
  const args = parseArgs(process.argv);
  const localEnv = readLocalEnv(path.join(projectRoot, ".env.local"));
  const apiKey = localEnv.LLM_API_KEY || process.env.LLM_API_KEY;
  const apiUrl =
    localEnv.LLM_API_URL || process.env.LLM_API_URL || "https://api.deepseek.com/chat/completions";
  const model = localEnv.LLM_MODEL || process.env.LLM_MODEL || "deepseek-v4-pro";

  if (!apiKey) {
    throw new Error("Missing LLM_API_KEY in .env.local or process env.");
  }

  fs.mkdirSync(batchDir, { recursive: true });

  const allQuestions = readJsonl(inputJsonl);
  const scopedQuestions = allQuestions.slice(
    args.offset,
    args.limit === null ? undefined : args.offset + args.limit
  );
  const batches = chunkRows(scopedQuestions, args.batchSize);
  const config = { apiKey, apiUrl, model };
  const records = [];

  console.log(
    JSON.stringify({
      event: "deepseek-qa-start",
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
      force: args.force
    });
    records.push(record);
    const statusCounts = record.result.items.reduce((counts, item) => {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
      return counts;
    }, {});
    console.log(
      JSON.stringify({
        event: "deepseek-qa-batch",
        batchNumber,
        cached: record.cached,
        items: record.result.items.length,
        statusCounts
      })
    );
  }

  const result = writeSummary({ records, questions: scopedQuestions, config, args });
  console.log(
    JSON.stringify({
      event: "deepseek-qa-complete",
      reviewedCount: result.reviewedCount,
      statusCounts: result.statusCounts,
      severityCounts: result.severityCounts,
      issues: result.issues.length,
      summaryPath: path.relative(projectRoot, path.join(outputDir, "deepseek-v4-pro-qa-summary.md"))
    })
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      event: "deepseek-qa-error",
      message: String(error?.message ?? error).replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]")
    })
  );
  process.exitCode = 1;
});
