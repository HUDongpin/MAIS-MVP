import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
const inputJsonl = path.join(__dirname, "questions.jsonl");
const qaResultsJson = path.join(__dirname, "deepseek-v4-pro-qa/deepseek-v4-pro-qa-results.json");
const outputDir = path.join(__dirname, "deepseek-v4-pro-remediation");
const patchDir = path.join(outputDir, "batches");
const patchJson = path.join(outputDir, "deepseek-v4-pro-remediation-patch.json");
const patchCsv = path.join(outputDir, "deepseek-v4-pro-remediation-patch.csv");
const reportMd = path.join(outputDir, "deepseek-v4-pro-remediation-report.md");

const defaultBatchSize = 6;
const maxAttempts = 3;
const requestTimeoutMs = 180000;
const maxTokens = 8000;
const allowedTypes = new Set(["multiple-choice", "fill-in", "short-answer"]);
const bannedTextPattern =
  /如图|见图|下图|上图|右图|左图|图中|根据图|观察下面的图|原题|原卷|原教材|教材原文|课本原文|答案原句|照抄|改编自|来源于|\bOCR\b|光学字符识别|识别文本|第\s*\d+\s*页|页码|P\.\s*\d+|\.pdf\b|\.docx\b|文件名|路径|source locator|archive path/i;
const metaRemediationPattern = /原题|修正|重新|检查|需调整|笔误|解析错误|之前|最终答案/;

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
    force: false,
    limit: null,
    onlyBlockers: false
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--force") args.force = true;
    else if (arg === "--only-blockers") args.onlyBlockers = true;
    else if (arg === "--batch-size") args.batchSize = Number(argv[++index]);
    else if (arg === "--limit") args.limit = Number(argv[++index]);
  }
  if (!Number.isInteger(args.batchSize) || args.batchSize < 1 || args.batchSize > 10) {
    throw new Error("--batch-size must be an integer from 1 to 10.");
  }
  if (args.limit !== null && (!Number.isInteger(args.limit) || args.limit < 1)) {
    throw new Error("--limit must be a positive integer.");
  }
  return args;
}

function chunkRows(rows, size) {
  const chunks = [];
  for (let index = 0; index < rows.length; index += size) chunks.push(rows.slice(index, index + size));
  return chunks;
}

function compactIssue(issue, question) {
  return {
    id: question.id,
    grade: question.grade,
    semester: question.semester,
    knowledgePointId: question.knowledgePointId,
    unitTitle: question.unitTitle,
    type: question.type,
    difficulty: question.difficulty,
    promptZhHans: question.promptZhHans,
    optionsZhHans: question.optionsZhHans,
    answer: question.answer,
    acceptedAnswers: question.acceptedAnswers,
    explanationZhHans: question.explanationZhHans,
    modelFlag: {
      status: issue.status,
      severity: issue.severity,
      issueTags: issue.issueTags,
      rationale: String(issue.rationale ?? "").slice(0, 700),
      correctedAnswer: issue.correctedAnswer ?? null
    }
  };
}

function buildMessages(items) {
  return [
    {
      role: "system",
      content: [
        "You are S18, a strict Mainland China 人教版初中数学 content remediator.",
        "You will receive DeepSeek QA flagged candidate questions and must produce corrected public-bank-ready replacements.",
        "For every item, either repair it or mark it as a false positive only if the original is mathematically correct, unambiguous, grade/topic appropriate, and public-ready.",
        "When repairing, preserve the id, grade, semester, knowledgePointId, unitTitle, type, and difficulty.",
        "You may change promptZhHans, optionsZhHans, answer, acceptedAnswers, and explanationZhHans.",
        "For multiple-choice, provide exactly four options and exactly one option that equals answer.",
        "For fill-in and short-answer, optionsZhHans must be [].",
        "Avoid diagrams, unseen figures, tables, source references, textbook/page/file names, or OCR wording.",
        "The repaired question fields must contain only the final clean problem, answer, and solution. Do not mention 原题、修正、重新、检查、需调整、笔误、解析错误、之前、最终答案.",
        "Keep questions self-contained, concise, and suitable for the assigned grade/topic.",
        "Return JSON only. Do not include markdown or prose outside JSON.",
        "Use this exact schema:",
        '{"items":[{"id":"string","action":"repair|keep_false_positive","confidence":"high|medium|low","remediationNotes":"short Chinese note","question":{"promptZhHans":"string","optionsZhHans":[],"answer":"string","acceptedAnswers":["string"],"explanationZhHans":"string"}}]}'
      ].join("\n")
    },
    {
      role: "user",
      content: `请复核并修复以下 ${items.length} 道 DeepSeek QA flagged 人教版初中 v3 候选题。优先修复 blocker/major；若原 flag 是误报，action 用 keep_false_positive 并保留原题内容。\n${JSON.stringify(items)}`
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
    if (firstBrace !== -1 && lastBrace > firstBrace) return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    throw new Error("response is not parseable JSON");
  }
}

function normalized(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, "").replace(/[，。！？、；：“”‘’（）()【】\[\]{}]/g, "");
}

function validatePatchResult(result, batch, questionById) {
  if (!result || !Array.isArray(result.items)) throw new Error("result.items is missing");
  const expectedIds = new Set(batch.map((item) => item.id));
  const seen = new Set();
  const patches = [];
  for (const item of result.items) {
    if (!expectedIds.has(item.id)) throw new Error(`unexpected id ${item.id}`);
    if (seen.has(item.id)) throw new Error(`duplicate id ${item.id}`);
    seen.add(item.id);
    if (!["repair", "keep_false_positive"].includes(item.action)) throw new Error(`invalid action for ${item.id}`);
    if (!["high", "medium", "low"].includes(item.confidence)) throw new Error(`invalid confidence for ${item.id}`);
    const original = questionById.get(item.id);
    const q = item.question;
    if (!q || typeof q !== "object") throw new Error(`missing question for ${item.id}`);
    if (typeof q.promptZhHans !== "string" || !q.promptZhHans.trim()) throw new Error(`missing prompt for ${item.id}`);
    if (typeof q.answer !== "string" || !q.answer.trim()) throw new Error(`missing answer for ${item.id}`);
    if (typeof q.explanationZhHans !== "string" || !q.explanationZhHans.trim()) throw new Error(`missing explanation for ${item.id}`);
    if (!Array.isArray(q.acceptedAnswers) || !q.acceptedAnswers.length) throw new Error(`missing acceptedAnswers for ${item.id}`);
    if (!Array.isArray(q.optionsZhHans)) throw new Error(`options must be array for ${item.id}`);
    if (!allowedTypes.has(original.type)) throw new Error(`unknown type for ${item.id}`);
    if (original.type === "multiple-choice") {
      if (q.optionsZhHans.length !== 4) throw new Error(`MC must have 4 options for ${item.id}`);
      const matching = q.optionsZhHans.filter((option) => normalized(option) === normalized(q.answer));
      if (matching.length !== 1) throw new Error(`MC answer must match exactly one option for ${item.id}`);
      if (new Set(q.optionsZhHans.map(normalized)).size !== 4) throw new Error(`duplicate MC options for ${item.id}`);
    } else if (q.optionsZhHans.length !== 0) {
      throw new Error(`non-MC options must be empty for ${item.id}`);
    }
    const text = `${q.promptZhHans}\n${q.optionsZhHans.join("\n")}\n${q.answer}\n${q.explanationZhHans}`;
    if (bannedTextPattern.test(text)) throw new Error(`banned source/visual wording for ${item.id}`);
    if (metaRemediationPattern.test(text)) throw new Error(`meta remediation wording for ${item.id}`);
    patches.push({
      id: item.id,
      action: item.action,
      confidence: item.confidence,
      remediationNotes: String(item.remediationNotes ?? "").slice(0, 500),
      question: {
        promptZhHans: q.promptZhHans.trim(),
        optionsZhHans: q.optionsZhHans.map((option) => String(option).trim()),
        answer: q.answer.trim(),
        acceptedAnswers: [...new Set(q.acceptedAnswers.map((answer) => String(answer).trim()).filter(Boolean))],
        explanationZhHans: q.explanationZhHans.trim()
      }
    });
  }
  for (const id of expectedIds) {
    if (!seen.has(id)) throw new Error(`missing id ${id}`);
  }
  return patches;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function callDeepSeek({ apiKey, apiUrl, model, messages }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  let response;
  try {
    response = await fetch(apiUrl, {
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
        temperature: 0.2,
        max_tokens: maxTokens
      }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }
  if (!response.ok) {
    throw new Error(`DeepSeek HTTP ${response.status}: ${(payload?.error?.message ?? text).slice(0, 300)}`);
  }
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("DeepSeek response did not include content");
  return { content, usage: payload?.usage ?? null };
}

function batchFileName(index) {
  return path.join(patchDir, `patch-${String(index + 1).padStart(3, "0")}.json`);
}

async function remediateBatch({ batch, batchIndex, config, questionById, force }) {
  const filePath = batchFileName(batchIndex);
  if (!force && fs.existsSync(filePath)) {
    const cached = JSON.parse(fs.readFileSync(filePath, "utf8"));
    try {
      validatePatchResult({ items: cached.items }, batch, questionById);
      return { ...cached, cached: true };
    } catch (error) {
      fs.writeFileSync(
        path.join(patchDir, `patch-${String(batchIndex + 1).padStart(3, "0")}.cache-invalid.json`),
        `${JSON.stringify({ batchIndex, cacheValidationError: String(error?.message ?? error), items: cached.items }, null, 2)}\n`
      );
      fs.unlinkSync(filePath);
      console.warn(
        JSON.stringify({
          event: "deepseek-remediation-cache-invalid",
          batch: batchIndex + 1,
          message: String(error?.message ?? error)
        })
      );
    }
  }
  const baseMessages = buildMessages(batch.map((item) => compactIssue(item, questionById.get(item.id))));
  let messages = baseMessages;
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let parsed = null;
    try {
      const response = await callDeepSeek({ ...config, messages });
      parsed = parseJsonObject(response.content);
      const patches = validatePatchResult(parsed, batch, questionById);
      const record = {
        batchIndex,
        completedAt: new Date().toISOString(),
        model: config.model,
        itemIds: batch.map((item) => item.id),
        usage: response.usage,
        items: patches
      };
      fs.writeFileSync(filePath, `${JSON.stringify(record, null, 2)}\n`);
      return { ...record, cached: false };
    } catch (error) {
      lastError = error;
      if (parsed?.items) {
        fs.writeFileSync(
          path.join(patchDir, `patch-${String(batchIndex + 1).padStart(3, "0")}.invalid.json`),
          `${JSON.stringify({ batchIndex, attempt, validationError: String(error?.message ?? error), items: parsed.items }, null, 2)}\n`
        );
      }
      messages = [
        ...baseMessages,
        {
          role: "user",
          content: [
            "The previous remediation output failed local validation. Regenerate the entire batch.",
            "Do not use any diagram/source wording such as 如图、见图、图中、根据图、下图、上图、原题、来源于、教材原文.",
            "Do not include process/meta wording in the repaired question fields, including 原题、修正、重新、检查、需调整、笔误、解析错误、之前、最终答案.",
            "Keep every item self-contained and return only the required JSON schema.",
            "Validation feedback:",
            String(error?.message ?? error).slice(0, 1800)
          ].join("\n")
        }
      ];
      if (attempt < maxAttempts) await sleep(1800 * attempt);
    }
  }
  console.warn(
    JSON.stringify({
      event: "deepseek-remediation-split-fallback",
      batch: batchIndex + 1,
      reason: String(lastError?.message ?? lastError)
    })
  );
  const splitCachePath = path.join(patchDir, `patch-${String(batchIndex + 1).padStart(3, "0")}.split.json`);
  const splitItems = fs.existsSync(splitCachePath)
    ? JSON.parse(fs.readFileSync(splitCachePath, "utf8")).items ?? []
    : [];
  for (const issue of batch) {
    if (splitItems.some((item) => item.id === issue.id)) continue;
    const original = questionById.get(issue.id);
    console.log(JSON.stringify({ event: "deepseek-remediation-split-item", batch: batchIndex + 1, id: issue.id }));
    const singleBatch = [issue];
    const singleBaseMessages = buildMessages([compactIssue(issue, original)]);
    let singleMessages = singleBaseMessages;
    let singleLastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      let parsed = null;
      try {
        const response = await callDeepSeek({ ...config, messages: singleMessages });
        parsed = parseJsonObject(response.content);
        const [patch] = validatePatchResult(parsed, singleBatch, questionById);
        splitItems.push(patch);
        fs.writeFileSync(
          splitCachePath,
          `${JSON.stringify({ batchIndex, completedItemCount: splitItems.length, items: splitItems }, null, 2)}\n`
        );
        singleLastError = null;
        break;
      } catch (error) {
        singleLastError = error;
        if (parsed?.items) {
          fs.writeFileSync(
            path.join(patchDir, `patch-${String(batchIndex + 1).padStart(3, "0")}.${issue.id}.invalid.json`),
            `${JSON.stringify({ batchIndex, id: issue.id, attempt, validationError: String(error?.message ?? error), items: parsed.items }, null, 2)}\n`
          );
        }
        singleMessages = [
          ...singleBaseMessages,
          {
            role: "user",
            content: [
              "The previous single-item remediation output failed local validation.",
              "Regenerate only this item with clean final problem text and final solution.",
              "Do not include process/meta wording such as 原题、修正、重新、检查、需调整、笔误、解析错误、之前、最终答案.",
              "Do not include diagram/source wording such as 如图、见图、图中、根据图、下图、上图、原题、来源于、教材原文.",
              "Validation feedback:",
              String(error?.message ?? error).slice(0, 1800)
            ].join("\n")
          }
        ];
        if (attempt < maxAttempts) await sleep(1800 * attempt);
      }
    }
    if (singleLastError) throw new Error(`split remediation failed for ${issue.id}: ${singleLastError?.message ?? singleLastError}`);
  }
  const record = {
    batchIndex,
    completedAt: new Date().toISOString(),
    model: config.model,
    itemIds: batch.map((item) => item.id),
    usage: null,
    items: splitItems
  };
  fs.writeFileSync(filePath, `${JSON.stringify(record, null, 2)}\n`);
  if (fs.existsSync(splitCachePath)) fs.unlinkSync(splitCachePath);
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

async function main() {
  const args = parseArgs(process.argv);
  const localEnv = readLocalEnv(path.join(projectRoot, ".env.local"));
  const apiKey = localEnv.LLM_API_KEY || process.env.LLM_API_KEY;
  const apiUrl = localEnv.LLM_API_URL || process.env.LLM_API_URL || "https://api.deepseek.com/chat/completions";
  const model = localEnv.LLM_MODEL || process.env.LLM_MODEL || "deepseek-v4-pro";
  if (!apiKey) throw new Error("Missing LLM_API_KEY");
  if (!new URL(apiUrl).host.includes("api.deepseek.com")) throw new Error(`Refusing non-DeepSeek endpoint: ${new URL(apiUrl).host}`);
  if (model !== "deepseek-v4-pro") throw new Error(`Refusing non-DeepSeek-v4-pro model: ${model}`);

  fs.mkdirSync(patchDir, { recursive: true });
  const questions = readJsonl(inputJsonl);
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const qaResults = JSON.parse(fs.readFileSync(qaResultsJson, "utf8"));
  let issues = qaResults.issues.filter((issue) => questionById.has(issue.id));
  if (args.onlyBlockers) issues = issues.filter((issue) => issue.severity === "blocker");
  if (args.limit !== null) issues = issues.slice(0, args.limit);
  const batches = chunkRows(issues, args.batchSize);
  const config = { apiKey, apiUrl, model };
  const records = [];
  console.log(
    JSON.stringify({
      event: "deepseek-remediation-start",
      model,
      apiHost: new URL(apiUrl).host,
      issues: issues.length,
      batches: batches.length,
      batchSize: args.batchSize
    })
  );
  for (let index = 0; index < batches.length; index += 1) {
    const record = await remediateBatch({
      batch: batches[index],
      batchIndex: index,
      config,
      questionById,
      force: args.force
    });
    records.push(record);
    const actionCounts = record.items.reduce((counts, item) => {
      counts[item.action] = (counts[item.action] ?? 0) + 1;
      return counts;
    }, {});
    console.log(
      JSON.stringify({
        event: "deepseek-remediation-batch",
        batch: index + 1,
        cached: record.cached,
        items: record.items.length,
        actionCounts
      })
    );
  }
  const patchItems = records.flatMap((record) => record.items);
  const patch = {
    generatedAt: new Date().toISOString(),
    model,
    apiHost: new URL(apiUrl).host,
    scope: "v3-mainland-pep-junior-1200-flagged-remediation",
    inputIssues: issues.length,
    patchItems,
    usage: records.reduce(
      (total, record) => {
        total.promptTokens += record.usage?.prompt_tokens ?? 0;
        total.completionTokens += record.usage?.completion_tokens ?? 0;
        total.totalTokens += record.usage?.total_tokens ?? 0;
        return total;
      },
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    )
  };
  fs.writeFileSync(patchJson, `${JSON.stringify(patch, null, 2)}\n`);
  writeCsv(
    patchCsv,
    patchItems.map((item) => ({
      id: item.id,
      action: item.action,
      confidence: item.confidence,
      remediationNotes: item.remediationNotes,
      promptZhHans: item.question.promptZhHans,
      answer: item.question.answer
    })),
    ["id", "action", "confidence", "remediationNotes", "promptZhHans", "answer"]
  );
  const actionCounts = patchItems.reduce((counts, item) => {
    counts[item.action] = (counts[item.action] ?? 0) + 1;
    return counts;
  }, {});
  fs.writeFileSync(
    reportMd,
    [
      "# DeepSeek V4 Pro Remediation Patch - Mainland PEP Junior V3",
      "",
      `- Generated at: ${patch.generatedAt}`,
      `- Input flagged rows: ${issues.length}`,
      `- Patch rows: ${patchItems.length}`,
      `- Action counts: ${JSON.stringify(actionCounts)}`,
      `- Token usage: ${JSON.stringify(patch.usage)}`,
      "",
      "This artifact is a remediation patch only. Apply and rerun deterministic plus DeepSeek QA gates before public integration."
    ].join("\n")
  );
  console.log(
    JSON.stringify({
      event: "deepseek-remediation-complete",
      patchRows: patchItems.length,
      actionCounts,
      patchPath: path.relative(projectRoot, patchJson)
    })
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      event: "deepseek-remediation-error",
      message: String(error?.message ?? error).replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]")
    })
  );
  process.exitCode = 1;
});
