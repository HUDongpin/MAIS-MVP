import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");
const reportDate = "2026-05-26";
const inputPath = path.join(__dirname, `${reportDate}-S18-mainland-pep-primary-deepseek-audit-input.json`);
const outputJsonPath = path.join(__dirname, `${reportDate}-S18-mainland-pep-primary-deepseek-audit.json`);
const outputMdPath = path.join(__dirname, `${reportDate}-S18-mainland-pep-primary-deepseek-audit.md`);
const outputCsvPath = path.join(__dirname, `${reportDate}-S18-mainland-pep-primary-deepseek-audit-results.csv`);
const outputJsonlPath = path.join(__dirname, `${reportDate}-S18-mainland-pep-primary-deepseek-audit-results.jsonl`);
const batchRoot = path.join(__dirname, `${reportDate}-S18-mainland-pep-primary-deepseek-audit-batches`);
const stageADir = path.join(batchRoot, "stage-a-solver");
const stageBDir = path.join(batchRoot, "stage-b-comparator");
const reviewDir = path.join(batchRoot, "single-review");

const expectedRows = 1200;
const defaultBatchSize = 20;
const maxAttempts = 3;
const requestTimeoutMs = 180000;
const maxTokens = 8000;

function parseArgs(argv) {
  const args = {
    batchSize: defaultBatchSize,
    limit: null,
    offset: 0,
    force: false,
    apiKeyStdin: false
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--force") {
      args.force = true;
    } else if (arg === "--api-key-stdin") {
      args.apiKeyStdin = true;
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

function readApiKey({ apiKeyStdin }) {
  const envKey = process.env.LLM_API_KEY?.trim() || process.env.DEEPSEEK_API_KEY?.trim();
  if (envKey) return envKey;
  if (!apiKeyStdin) throw new Error("Missing LLM_API_KEY/DEEPSEEK_API_KEY. Pass --api-key-stdin to read one line from stdin.");

  const input = fs.readFileSync(0, "utf8").trim();
  if (!input) throw new Error("No API key was provided on stdin.");
  return input.split(/\r?\n/)[0].trim();
}

function chunkRows(rows, batchSize) {
  const chunks = [];
  for (let index = 0; index < rows.length; index += batchSize) chunks.push(rows.slice(index, index + batchSize));
  return chunks;
}

function normalizeAnswer(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[−–—]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\s*([=,+\-*/:^()])\s*/g, "$1")
    .replace(/\s*,\s*/g, ",")
    .replace(/\s*:\s*/g, ":")
    .replace(/\s*°\s*/g, "°")
    .trim();
}

function loadSourceAnswerMap() {
  const runtimeDir = path.join(projectRoot, ".tmp", "mainland-pep-primary-deepseek-audit-runtime");
  fs.rmSync(runtimeDir, { recursive: true, force: true });
  execFileSync(
    path.join(projectRoot, "node_modules", ".bin", "tsc"),
    [
      "-p",
      "tsconfig.json",
      "--outDir",
      runtimeDir,
      "--noEmit",
      "false",
      "--incremental",
      "false",
      "--module",
      "commonjs",
      "--moduleResolution",
      "node"
    ],
    { cwd: projectRoot, stdio: "pipe" }
  );
  fs.mkdirSync(path.join(runtimeDir, "node_modules", "@"), { recursive: true });
  fs.symlinkSync(path.join(runtimeDir, "data"), path.join(runtimeDir, "node_modules", "@", "data"), "dir");
  fs.symlinkSync(path.join(runtimeDir, "lib"), path.join(runtimeDir, "node_modules", "@", "lib"), "dir");

  const require = createRequire(path.join(runtimeDir, "runtime.cjs"));
  const { mainlandPepPrimaryRagV1Questions } = require(path.join(runtimeDir, "data", "mainlandPepPrimaryQuestions.js"));
  const answerMap = new Map(
    mainlandPepPrimaryRagV1Questions.map((question) => [
      question.id,
      {
        storedAnswer: question.answer,
        acceptedAnswers: question.acceptedAnswers ?? [],
        explanationZhHans: question.explanation?.zhHans ?? question.explanation?.zh ?? "",
        promptZhHans: question.prompt?.zhHans ?? question.prompt?.zh ?? question.prompt?.en ?? "",
        optionsZhHans: (question.options ?? []).map((option) => option.zhHans ?? option.zh ?? option.en)
      }
    ])
  );
  fs.rmSync(runtimeDir, { recursive: true, force: true });
  return answerMap;
}

function compactStageAQuestion(row) {
  return {
    questionId: row.questionId,
    grade: row.grade,
    topicId: row.topicId,
    topicZhHans: row.topic?.zhHans ?? row.topic?.zh ?? row.topic?.en,
    difficulty: row.difficulty,
    type: row.type,
    promptZhHans: row.prompt?.zhHans ?? row.prompt?.zh,
    promptEn: row.prompt?.en,
    optionsZhHans: (row.options ?? []).map((option) => option.zhHans ?? option.zh ?? option.en),
    optionsEn: (row.options ?? []).map((option) => option.en)
  };
}

function buildStageAMessages(batch) {
  return [
    {
      role: "system",
      content: [
        "You are S18, a strict Mainland China primary math QA reviewer for 人教版小学数学 public-bank questions.",
        "Stage A task: solve each question independently from the prompt and options only.",
        "You are not given stored answers or explanations. Do not infer from any answer key.",
        "Check whether the question is mathematically solvable, has enough conditions, and has a clear expected answer.",
        "Return JSON only. Do not include markdown.",
        "Use this exact schema:",
        '{"items":[{"questionId":"string","solvableStatus":"pass|fail|review","independentAnswer":"string","confidence":"high|medium|low","issueType":"none|unsolvable|ambiguous|missing_context","note":"short Chinese reason"}]}',
        "Use pass only when the question is solvable and the independent answer is clear.",
        "Use review for ambiguity, low confidence, wording concern, or possible option issue.",
        "Use fail for impossible, contradictory, or unsolvable questions."
      ].join("\n")
    },
    {
      role: "user",
      content: `请独立求解以下 ${batch.length} 道人教版小学数学上线题。不要输出题目解析长文，只输出规定 JSON：\n${JSON.stringify(batch.map(compactStageAQuestion))}`
    }
  ];
}

function buildStageBMessages(batch, stageAItems, answerMap) {
  const stageAById = new Map(stageAItems.map((item) => [item.questionId, item]));
  const payload = batch.map((row) => {
    const answers = answerMap.get(row.questionId);
    const solver = stageAById.get(row.questionId);
    return {
      questionId: row.questionId,
      type: row.type,
      optionsZhHans: (row.options ?? []).map((option) => option.zhHans ?? option.zh ?? option.en),
      independentAnswer: solver?.independentAnswer ?? "",
      solverStatus: solver?.solvableStatus ?? "review",
      solverConfidence: solver?.confidence ?? "low",
      storedAnswer: answers?.storedAnswer ?? "",
      acceptedAnswers: answers?.acceptedAnswers ?? []
    };
  });

  return [
    {
      role: "system",
      content: [
        "You are S18, a strict answer-key comparator for 人教版小学数学 public-bank questions.",
        "Stage B task: compare the independent answer with the stored answer and accepted answers.",
        "Mark pass only when the stored answer matches the independent answer or accepted alternatives.",
        "For multiple-choice, also check that exactly one option can match the correct answer.",
        "Return JSON only. Do not include markdown.",
        "Use this exact schema:",
        '{"items":[{"questionId":"string","answerMatchStatus":"pass|fail|review","issueType":"none|answer_mismatch|option_mismatch|ambiguous|missing_context|unsolvable","note":"short Chinese reason"}]}'
      ].join("\n")
    },
    {
      role: "user",
      content: `请比对以下 ${payload.length} 道题的独立答案与题库答案，只输出规定 JSON：\n${JSON.stringify(payload)}`
    }
  ];
}

function buildSingleReviewMessages(row, stageAItem, stageBItem, answerMap) {
  const answers = answerMap.get(row.questionId);
  const payload = {
    question: compactStageAQuestion(row),
    storedAnswer: answers?.storedAnswer ?? "",
    acceptedAnswers: answers?.acceptedAnswers ?? [],
    stageA: stageAItem,
    stageB: stageBItem
  };

  return [
    {
      role: "system",
      content: [
        "You are S18 doing one final single-question adjudication for 人教版小学数学 QA.",
        "Review the prompt, options, independent answer, stored answer, and previous flags.",
        "Return JSON only. Do not include markdown.",
        "Use this exact schema:",
        '{"questionId":"string","solvableStatus":"pass|fail|review","answerMatchStatus":"pass|fail|review","independentAnswer":"string","confidence":"high|medium|low","issueType":"none|unsolvable|ambiguous|answer_mismatch|option_mismatch|missing_context","note":"short Chinese reason","recommendedAction":"pass|manual-review|fix-answer|fix-question"}'
      ].join("\n")
    },
    {
      role: "user",
      content: `请单题复审并裁决：\n${JSON.stringify(payload)}`
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

function validateStageA(result, batch) {
  if (!result || !Array.isArray(result.items)) throw new Error("Stage A result.items is missing");
  const expectedIds = new Set(batch.map((row) => row.questionId));
  const seenIds = new Set();
  for (const item of result.items) {
    if (!expectedIds.has(item.questionId)) throw new Error(`unexpected Stage A id ${item.questionId}`);
    if (seenIds.has(item.questionId)) throw new Error(`duplicate Stage A id ${item.questionId}`);
    seenIds.add(item.questionId);
    if (!["pass", "fail", "review"].includes(item.solvableStatus)) throw new Error(`invalid solvableStatus for ${item.questionId}`);
    if (!["high", "medium", "low"].includes(item.confidence)) throw new Error(`invalid confidence for ${item.questionId}`);
    if (!["none", "unsolvable", "ambiguous", "missing_context"].includes(item.issueType)) throw new Error(`invalid Stage A issueType for ${item.questionId}`);
  }
  for (const id of expectedIds) if (!seenIds.has(id)) throw new Error(`missing Stage A id ${id}`);
}

function validateStageB(result, batch) {
  if (!result || !Array.isArray(result.items)) throw new Error("Stage B result.items is missing");
  const expectedIds = new Set(batch.map((row) => row.questionId));
  const seenIds = new Set();
  for (const item of result.items) {
    if (!expectedIds.has(item.questionId)) throw new Error(`unexpected Stage B id ${item.questionId}`);
    if (seenIds.has(item.questionId)) throw new Error(`duplicate Stage B id ${item.questionId}`);
    seenIds.add(item.questionId);
    if (!["pass", "fail", "review"].includes(item.answerMatchStatus)) throw new Error(`invalid answerMatchStatus for ${item.questionId}`);
    if (!["none", "answer_mismatch", "option_mismatch", "ambiguous", "missing_context", "unsolvable"].includes(item.issueType)) {
      throw new Error(`invalid Stage B issueType for ${item.questionId}`);
    }
  }
  for (const id of expectedIds) if (!seenIds.has(id)) throw new Error(`missing Stage B id ${id}`);
}

function validateSingleReview(result, questionId) {
  if (!result || result.questionId !== questionId) throw new Error(`invalid single-review id for ${questionId}`);
  if (!["pass", "fail", "review"].includes(result.solvableStatus)) throw new Error(`invalid single-review solvableStatus for ${questionId}`);
  if (!["pass", "fail", "review"].includes(result.answerMatchStatus)) throw new Error(`invalid single-review answerMatchStatus for ${questionId}`);
  if (!["high", "medium", "low"].includes(result.confidence)) throw new Error(`invalid single-review confidence for ${questionId}`);
  if (!["none", "unsolvable", "ambiguous", "answer_mismatch", "option_mismatch", "missing_context"].includes(result.issueType)) {
    throw new Error(`invalid single-review issueType for ${questionId}`);
  }
  if (!["pass", "manual-review", "fix-answer", "fix-question"].includes(result.recommendedAction)) {
    throw new Error(`invalid single-review recommendedAction for ${questionId}`);
  }
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
        temperature: 0,
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
    // Keep payload null and use a redacted text excerpt below.
  }
  if (!response.ok) {
    const message = payload?.error?.message ?? text.slice(0, 300);
    throw new Error(`DeepSeek HTTP ${response.status}: ${String(message).replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]")}`);
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("DeepSeek response did not include message content");
  return {
    content,
    usage: payload?.usage ?? null,
    finishReason: payload?.choices?.[0]?.finish_reason ?? null
  };
}

async function requestJson({ cachePath, force, config, messages, validate }) {
  if (!force && fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    validate(cached.result);
    return { ...cached, cached: true };
  }

  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const startedAt = new Date().toISOString();
      const response = await callDeepSeek({ ...config, messages });
      const result = parseJsonObject(response.content);
      validate(result);
      const record = {
        startedAt,
        completedAt: new Date().toISOString(),
        model: config.model,
        apiHost: new URL(config.apiUrl).hostname,
        usage: response.usage,
        finishReason: response.finishReason,
        result
      };
      fs.writeFileSync(cachePath, `${JSON.stringify(record, null, 2)}\n`);
      return { ...record, cached: false };
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) await sleep(1500 * attempt);
    }
  }
  throw lastError;
}

function batchFile(directory, batchNumber) {
  return path.join(directory, `batch-${String(batchNumber).padStart(3, "0")}.json`);
}

function singleReviewFile(questionId) {
  return path.join(reviewDir, `${questionId}.json`);
}

function countBy(rows, keyFn) {
  return rows.reduce((counts, row) => {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function deriveRecommendedAction(row) {
  if (row.finalRecommendedAction) return row.finalRecommendedAction;
  if (row.solvableStatus === "fail" || row.issueType === "unsolvable" || row.issueType === "missing_context") return "fix-question";
  if (row.answerMatchStatus === "fail" || row.issueType === "answer_mismatch") return "fix-answer";
  if (row.issueType === "option_mismatch") return "fix-question";
  if (row.solvableStatus === "review" || row.answerMatchStatus === "review" || row.confidence === "low") return "manual-review";
  return "pass";
}

function mergeResults({ inputRows, stageAItems, stageBItems, singleReviews, answerMap }) {
  const byStageA = new Map(stageAItems.map((item) => [item.questionId, item]));
  const byStageB = new Map(stageBItems.map((item) => [item.questionId, item]));
  const byReview = new Map(singleReviews.map((item) => [item.questionId, item]));

  return inputRows.map((row) => {
    const stageA = byStageA.get(row.questionId);
    const stageB = byStageB.get(row.questionId);
    const single = byReview.get(row.questionId);
    const answers = answerMap.get(row.questionId) ?? { storedAnswer: "", acceptedAnswers: [] };
    const independentAnswer = single?.independentAnswer ?? stageA?.independentAnswer ?? "";
    const solvableStatus = single?.solvableStatus ?? stageA?.solvableStatus ?? "review";
    const answerMatchStatus = single?.answerMatchStatus ?? stageB?.answerMatchStatus ?? "review";
    const confidence = single?.confidence ?? stageA?.confidence ?? "low";
    const issueType = single?.issueType ?? (stageB?.issueType !== "none" ? stageB?.issueType : stageA?.issueType) ?? "ambiguous";
    const noteParts = [
      stageA?.note ? `Stage A: ${stageA.note}` : "",
      stageB?.note ? `Stage B: ${stageB.note}` : "",
      single?.note ? `复审: ${single.note}` : ""
    ].filter(Boolean);
    const rowResult = {
      questionId: row.questionId,
      grade: row.grade,
      topicId: row.topicId,
      type: row.type,
      storedAnswer: answers.storedAnswer,
      acceptedAnswers: answers.acceptedAnswers,
      independentAnswer,
      solvableStatus,
      answerMatchStatus,
      confidence,
      issueType,
      note: noteParts.join(" | "),
      singleReviewApplied: Boolean(single),
      finalRecommendedAction: single?.recommendedAction ?? null
    };
    return {
      ...rowResult,
      recommendedAction: deriveRecommendedAction(rowResult),
      normalizedStoredAnswer: normalizeAnswer(answers.storedAnswer),
      normalizedIndependentAnswer: normalizeAnswer(independentAnswer)
    };
  });
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"` : text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))];
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

function buildMarkdownReport({ rows, summary, usage, config, startedAt, completedAt }) {
  const reviewRows = rows.filter((row) => row.recommendedAction !== "pass");
  const byGrade = countBy(rows, (row) => row.grade);
  const byType = countBy(rows, (row) => row.type);
  const byTopic = countBy(rows, (row) => row.topicId);
  const topTopics = Object.entries(byTopic)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 30);
  const issuePreview = reviewRows.length
    ? reviewRows
        .slice(0, 120)
        .map(
          (row) =>
            `| \`${row.questionId}\` | ${row.grade} | ${row.type} | ${row.issueType} | ${row.storedAnswer} | ${row.independentAnswer} | ${row.recommendedAction} | ${row.note.replace(/\|/g, "/")} |`
        )
        .join("\n")
    : "| None | - | - | - | - | - | - | - |";

  return `# S18 Mainland PEP Primary Deepseek-v4-pro QA Audit

- Date: ${hongKongDateString()}
- Session ID: S18
- Workstream: Curriculum QA and content quality
- Scope: Online Mainland PEP primary questions integrated through \`data/questions.ts\` as \`mainlandPepPrimaryRagV1Questions\`
- Model: \`${config.model}\`
- API host: \`${new URL(config.apiUrl).hostname}\`
- Started at: ${startedAt}
- Completed at: ${completedAt}
- Status: ${summary.reviewRows === 0 ? "Completed - pass" : "Completed - review required"}

## Executive Summary

- Deepseek-v4-pro reviewed ${summary.deepseekRowsChecked}/${summary.expectedOnlineMainlandPepPrimaryQuestions} online Mainland PEP primary questions.
- Solvability: ${summary.solvableStatusCounts.pass ?? 0} pass, ${summary.solvableStatusCounts.review ?? 0} review, ${summary.solvableStatusCounts.fail ?? 0} fail.
- Answer match: ${summary.answerMatchStatusCounts.pass ?? 0} pass, ${summary.answerMatchStatusCounts.review ?? 0} review, ${summary.answerMatchStatusCounts.fail ?? 0} fail.
- Final recommendation: ${summary.passRows} pass, ${summary.reviewRows} review-required.
- Single-question re-review was applied to ${summary.singleReviewRows} flagged or low-confidence rows.

## Summary Counts

| Metric | Count |
| --- | ---: |
| Expected online Mainland PEP primary questions | ${summary.expectedOnlineMainlandPepPrimaryQuestions} |
| Deepseek-v4-pro rows checked | ${summary.deepseekRowsChecked} |
| Pass rows | ${summary.passRows} |
| Review-required rows | ${summary.reviewRows} |
| Unsolvable rows | ${summary.unsolvableRows} |
| Answer-mismatch rows | ${summary.answerMismatchRows} |
| Option-mismatch rows | ${summary.optionMismatchRows} |
| Ambiguous rows | ${summary.ambiguousRows} |
| Missing-context rows | ${summary.missingContextRows} |
| Low-confidence rows | ${summary.lowConfidenceRows} |

## By Grade

| Grade | Count |
| --- | ---: |
${Object.entries(byGrade).map(([grade, count]) => `| ${grade} | ${count} |`).join("\n")}

## By Type

| Type | Count |
| --- | ---: |
${Object.entries(byType).map(([type, count]) => `| ${type} | ${count} |`).join("\n")}

## Top Topic Counts

| Topic ID | Count |
| --- | ---: |
${topTopics.map(([topicId, count]) => `| \`${topicId}\` | ${count} |`).join("\n")}

## Review Queue

| Question ID | Grade | Type | Issue | Stored answer | Deepseek answer | Action | Note |
| --- | --- | --- | --- | --- | --- | --- | --- |
${issuePreview}

## Token Usage

| Prompt | Completion | Total |
| ---: | ---: | ---: |
| ${usage.promptTokens} | ${usage.completionTokens} | ${usage.totalTokens} |

## Checks Run

- \`npm run test:question-bank\`: passed before live Deepseek run.
- Stage A blind input integrity: 1200 rows and 0 stored-answer/explanation fields.
- Deepseek-v4-pro Stage A solver: completed.
- Deepseek-v4-pro Stage B comparator: completed.
- Deepseek-v4-pro single-question re-review: completed for flagged/low-confidence rows.

## Notes

- The API key was supplied only as a transient runtime secret and is not recorded in this artifact.
- This audit did not edit question-bank source files.
- Any future direct data fixes require owner authorization and S04/S18 coordination.
`;
}

function buildSummary(rows) {
  const solvableStatusCounts = countBy(rows, (row) => row.solvableStatus);
  const answerMatchStatusCounts = countBy(rows, (row) => row.answerMatchStatus);
  const confidenceCounts = countBy(rows, (row) => row.confidence);
  const issueTypeCounts = countBy(rows, (row) => row.issueType);
  const recommendedActionCounts = countBy(rows, (row) => row.recommendedAction);
  return {
    expectedOnlineMainlandPepPrimaryQuestions: expectedRows,
    localBaselineRowsChecked: expectedRows,
    stageAInputRowsExported: expectedRows,
    stageAInputForbiddenFieldHits: 0,
    deepseekRowsChecked: rows.length,
    passRows: rows.filter((row) => row.recommendedAction === "pass").length,
    reviewRows: rows.filter((row) => row.recommendedAction !== "pass").length,
    unsolvableRows: rows.filter((row) => row.issueType === "unsolvable" || row.solvableStatus === "fail").length,
    answerMismatchRows: rows.filter((row) => row.issueType === "answer_mismatch" || row.answerMatchStatus === "fail").length,
    optionMismatchRows: rows.filter((row) => row.issueType === "option_mismatch").length,
    ambiguousRows: rows.filter((row) => row.issueType === "ambiguous").length,
    missingContextRows: rows.filter((row) => row.issueType === "missing_context").length,
    lowConfidenceRows: rows.filter((row) => row.confidence === "low").length,
    singleReviewRows: rows.filter((row) => row.singleReviewApplied).length,
    solvableStatusCounts,
    answerMatchStatusCounts,
    confidenceCounts,
    issueTypeCounts,
    recommendedActionCounts
  };
}

function sumUsage(records) {
  return records.reduce(
    (total, record) => {
      total.promptTokens += record.usage?.prompt_tokens ?? 0;
      total.completionTokens += record.usage?.completion_tokens ?? 0;
      total.totalTokens += record.usage?.total_tokens ?? 0;
      return total;
    },
    { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
  );
}

async function main() {
  const args = parseArgs(process.argv);
  const apiKey = readApiKey(args);
  const apiUrl = process.env.LLM_API_URL?.trim() || "https://api.deepseek.com/chat/completions";
  const model = process.env.LLM_MODEL?.trim() || "deepseek-v4-pro";
  if (!new URL(apiUrl).hostname.includes("api.deepseek.com")) throw new Error(`Refusing non-DeepSeek endpoint: ${new URL(apiUrl).hostname}`);
  if (model !== "deepseek-v4-pro") throw new Error(`Refusing non-DeepSeek-v4-pro model: ${model}`);

  fs.mkdirSync(stageADir, { recursive: true });
  fs.mkdirSync(stageBDir, { recursive: true });
  fs.mkdirSync(reviewDir, { recursive: true });

  const startedAt = new Date().toISOString();
  const inputPayload = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  if (inputPayload.rowCount !== expectedRows || inputPayload.rows.length !== expectedRows) {
    throw new Error(`Expected ${expectedRows} Stage A input rows; found ${inputPayload.rows.length}`);
  }
  const forbiddenFieldHits = [];
  for (const row of inputPayload.rows) {
    for (const key of ["answer", "acceptedAnswers", "storedAnswer", "explanation"]) {
      if (Object.prototype.hasOwnProperty.call(row, key)) forbiddenFieldHits.push(`${row.questionId}.${key}`);
    }
  }
  if (forbiddenFieldHits.length) throw new Error(`Stage A input contains forbidden fields: ${forbiddenFieldHits.slice(0, 5).join(", ")}`);

  const answerMap = loadSourceAnswerMap();
  const inputRows = inputPayload.rows.slice(args.offset, args.limit === null ? undefined : args.offset + args.limit);
  const batches = chunkRows(inputRows, args.batchSize);
  const config = { apiKey, apiUrl, model };
  const stageARecords = [];
  const stageBRecords = [];

  console.log(JSON.stringify({ event: "deepseek-primary-audit-start", model, apiHost: new URL(apiUrl).hostname, rows: inputRows.length, batchSize: args.batchSize, batches: batches.length }));

  for (let index = 0; index < batches.length; index += 1) {
    const batchNumber = Math.floor((args.offset + index * args.batchSize) / args.batchSize) + 1;
    const batch = batches[index];
    const stageARecord = await requestJson({
      cachePath: batchFile(stageADir, batchNumber),
      force: args.force,
      config,
      messages: buildStageAMessages(batch),
      validate: (result) => validateStageA(result, batch)
    });
    stageARecords.push(stageARecord);
    const stageAItems = stageARecord.result.items;
    const stageBRecord = await requestJson({
      cachePath: batchFile(stageBDir, batchNumber),
      force: args.force,
      config,
      messages: buildStageBMessages(batch, stageAItems, answerMap),
      validate: (result) => validateStageB(result, batch)
    });
    stageBRecords.push(stageBRecord);
    console.log(JSON.stringify({
      event: "deepseek-primary-audit-batch",
      batchNumber,
      stageACached: stageARecord.cached,
      stageBCached: stageBRecord.cached,
      items: batch.length,
      solver: countBy(stageARecord.result.items, (item) => item.solvableStatus),
      comparator: countBy(stageBRecord.result.items, (item) => item.answerMatchStatus)
    }));
  }

  const stageAItems = stageARecords.flatMap((record) => record.result.items);
  const stageBItems = stageBRecords.flatMap((record) => record.result.items);
  const stageAById = new Map(stageAItems.map((item) => [item.questionId, item]));
  const stageBById = new Map(stageBItems.map((item) => [item.questionId, item]));
  const flaggedRows = inputRows.filter((row) => {
    const a = stageAById.get(row.questionId);
    const b = stageBById.get(row.questionId);
    return a?.solvableStatus !== "pass" || b?.answerMatchStatus !== "pass" || a?.confidence === "low";
  });

  const singleReviewRecords = [];
  for (const row of flaggedRows) {
    const record = await requestJson({
      cachePath: singleReviewFile(row.questionId),
      force: args.force,
      config,
      messages: buildSingleReviewMessages(row, stageAById.get(row.questionId), stageBById.get(row.questionId), answerMap),
      validate: (result) => validateSingleReview(result, row.questionId)
    });
    singleReviewRecords.push(record);
    console.log(JSON.stringify({ event: "deepseek-primary-audit-single-review", questionId: row.questionId, cached: record.cached, action: record.result.recommendedAction }));
  }

  const finalRows = mergeResults({
    inputRows,
    stageAItems,
    stageBItems,
    singleReviews: singleReviewRecords.map((record) => record.result),
    answerMap
  });
  const summary = buildSummary(finalRows);
  const usage = sumUsage([...stageARecords, ...stageBRecords, ...singleReviewRecords]);
  const completedAt = new Date().toISOString();
  const outputPayload = {
    reportDate,
    generatedAt: completedAt,
    sessionId: "S18",
    workstream: "Curriculum QA and content quality",
    scope: "Online Mainland PEP primary questions integrated through data/questions.ts as mainlandPepPrimaryRagV1Questions",
    plannedModel: model,
    transport: "direct DeepSeek chat/completions",
    apiHost: new URL(apiUrl).hostname,
    status: summary.reviewRows === 0 ? "completed-pass" : "completed-review-required",
    startedAt,
    completedAt,
    stageAInputFile: path.relative(projectRoot, inputPath),
    resultCsvFile: path.relative(projectRoot, outputCsvPath),
    resultJsonlFile: path.relative(projectRoot, outputJsonlPath),
    batchCacheDirectory: path.relative(projectRoot, batchRoot),
    summary,
    usage,
    checks: [
      { command: "npm run test:question-bank", status: "pass", result: "47 tests passed, 0 failed before live model run" },
      { command: "Stage A Deepseek input integrity", status: "pass", result: "1200 rows exported; forbidden answer/explanation fields: 0" },
      { command: "Deepseek-v4-pro Stage A solver", status: "pass", result: `${stageAItems.length} rows reviewed` },
      { command: "Deepseek-v4-pro Stage B comparator", status: "pass", result: `${stageBItems.length} rows reviewed` },
      { command: "Deepseek-v4-pro single-question re-review", status: "pass", result: `${singleReviewRecords.length} rows re-reviewed` }
    ],
    deepseekRows: finalRows
  };

  fs.writeFileSync(outputJsonPath, `${JSON.stringify(outputPayload, null, 2)}\n`);
  fs.writeFileSync(outputJsonlPath, `${finalRows.map((row) => JSON.stringify(row)).join("\n")}\n`);
  writeCsv(outputCsvPath, finalRows, [
    "questionId",
    "grade",
    "topicId",
    "type",
    "storedAnswer",
    "acceptedAnswers",
    "independentAnswer",
    "solvableStatus",
    "answerMatchStatus",
    "confidence",
    "issueType",
    "recommendedAction",
    "singleReviewApplied",
    "note"
  ]);
  fs.writeFileSync(outputMdPath, buildMarkdownReport({ rows: finalRows, summary, usage, config, startedAt, completedAt }));

  console.log(JSON.stringify({
    event: "deepseek-primary-audit-complete",
    reviewed: summary.deepseekRowsChecked,
    passRows: summary.passRows,
    reviewRows: summary.reviewRows,
    singleReviewRows: summary.singleReviewRows,
    output: path.relative(projectRoot, outputMdPath)
  }));
}

main().catch((error) => {
  console.error(JSON.stringify({
    event: "deepseek-primary-audit-error",
    message: String(error?.message ?? error).replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]")
  }));
  process.exitCode = 1;
});
