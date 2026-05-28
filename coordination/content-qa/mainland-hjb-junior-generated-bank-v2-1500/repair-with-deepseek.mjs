import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

const QUESTIONS_JSONL = path.join(__dirname, "questions.jsonl");
const CODEX_REVIEW_CSV = path.join(__dirname, "codex-review", "codex-review-results.csv");
const REPAIR_DIR = path.join(__dirname, "deepseek-repair");
const REPAIR_BATCH_DIR = path.join(REPAIR_DIR, "repair-batches");
const REPAIR_TARGETS_JSON = path.join(REPAIR_DIR, "repair-targets.json");
const REPAIR_RESULTS_JSON = path.join(REPAIR_DIR, "repair-results.json");
const REPAIR_REPORT_MD = path.join(REPAIR_DIR, "s18-repair-report.md");

const batchSize = Number(process.env.HJB_JUNIOR_REPAIR_BATCH_SIZE ?? 5);
const requestTimeoutMs = Number(process.env.HJB_JUNIOR_DEEPSEEK_TIMEOUT_MS ?? 90000);
const allowNonstandardCounts = /^(1|true|yes)$/i.test(process.env.HJB_JUNIOR_REPAIR_ALLOW_NONSTANDARD_COUNTS ?? "");

const requiredFields = [
  "id",
  "batch",
  "grade",
  "semester",
  "topicId",
  "unitTitle",
  "volume",
  "conceptIds",
  "difficulty",
  "type",
  "promptZhHans",
  "optionsZhHans",
  "answer",
  "acceptedAnswers",
  "explanationZhHans",
  "evidenceCardIds",
  "assessmentPatternCardIds",
  "paperPatternCardIds",
  "examPatternCardIds",
  "sourceDistanceStatus",
  "mathQaStatus",
  "terminologyQaStatus",
  "manualQaStatus",
  "reviewNotes"
];

const forbiddenSourcePatterns = [
  { code: "source-ocr", regex: /\bOCR\b|光学字符识别|识别文本/i },
  { code: "source-screenshot", regex: /截图|截屏|扫描图|扫描件|图片来源|教材图片/ },
  { code: "source-page", regex: /第\s*\d+\s*页|页码|页\s*\d+|P\.\s*\d+/i },
  { code: "source-original", regex: /原题|原卷|原教材|教材原文|课本原文|照抄|改编自|来源于|摘自/ },
  { code: "source-file", regex: /\.pdf\b|\.docx\b|\.zip\b|\.jpg\b|\.png\b|文件名|路径/iu }
];

const missingVisualPatterns = [
  /如图(?:所示)?/,
  /见图/,
  /下图/,
  /上图/,
  /右图/,
  /左图/,
  /(?:^|[，。；：:\s])图中(?:可以|有|阴影|涂色|显示|给出)?/,
  /根据图(?:形|表|像)?/,
  /观察下面的图/
];

const contradictionPatterns = [
  /选项中没有/,
  /题目有误/,
  /无法确定/,
  /答案不唯一/,
  /不够条件/,
  /缺少图/,
  /缺少信息/,
  /重新计算/,
  /上面算错/,
  /前面错误/,
  /没有正确答案/
];

const generatorRedFlagPattern =
  /设计有误|选项中没有|没有正确答案|无法确定|重新计算|但选项|但题目|假设图中|答案不唯一|可能有误|题目误写|重新生成|我将|根据输出要求|缺少条件|缺少图|不够条件/i;

const tooGenericPromptKeys = new Set([
  "下列计算正确的是",
  "下列说法正确的是",
  "下列因式分解正确的是",
  "下列运动属于平移的是",
  "下列条件中能确定一个圆的是",
  "下列条件中能判定四边形是平行四边形的是",
  "下列条件中能判定△abc与△def相似的是",
  "下列各组数中能作为直角三角形三边长的是"
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

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeIdentity(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[！-～]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ")
    .replace(/\s+/g, "")
    .replace(/−/g, "-")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/[，、；;：:。！？?!（）()【】\[\]{}“”"‘’']/g, "");
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

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function readCsv(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing file: ${filePath}`);
  const lines = fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => Object.fromEntries(parseCsvLine(line).map((value, index) => [headers[index], value])));
}

function sourceRiskText(row) {
  return [row.promptZhHans, ...(row.optionsZhHans ?? []), row.answer, ...(row.acceptedAnswers ?? []), row.explanationZhHans].join("\n");
}

function compactCurriculumCard(card) {
  return {
    id: card.id,
    volume: card.volume,
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
    materialKinds: card.materialKinds ?? [],
    assessmentFamilies: card.assessmentFamilies ?? card.examFamilies ?? [],
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

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
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
    const finish = (handler, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(absoluteTimeout);
      handler(value);
    };
    const absoluteTimeout = setTimeout(() => {
      if (request) request.destroy(new Error(`DeepSeek request timed out after ${requestTimeoutMs} ms`));
    }, requestTimeoutMs);
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
        response.on("data", (chunk) => {
          text += chunk;
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
    temperature: 0.36
  };
  try {
    const response = await requestDeepSeekJson({ apiUrl, apiKey, body });
    const text = response.text;
    if (!response.ok) {
      const safeText = text.replaceAll(apiKey, "[REDACTED_API_KEY]").slice(0, 1200);
      if ((response.status === 429 || response.status >= 500) && attempt < 1) {
        console.log(`DeepSeek HTTP retry ${attempt + 1}: HTTP ${response.status}`);
        await sleep(3000 * (attempt + 1));
        return postDeepSeek({ apiUrl, apiKey, model, messages, attempt: attempt + 1 });
      }
      throw new Error(`DeepSeek request failed with HTTP ${response.status}: ${safeText}`);
    }
    const parsed = JSON.parse(text);
    const content = parsed?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new Error("DeepSeek reply did not include message.content");
    return content;
  } catch (error) {
    const message = String(error?.message ?? error);
    if (/fetch failed|network|ECONNRESET|ETIMEDOUT|timed out|aborted/i.test(message) && attempt < 1) {
      console.log(`DeepSeek transport retry ${attempt + 1}: ${message.slice(0, 240)}`);
      await sleep(5000 * (attempt + 1));
      return postDeepSeek({ apiUrl, apiKey, model, messages, attempt: attempt + 1 });
    }
    throw error;
  }
}

function localIssueCodes(row) {
  const codes = [];
  for (const field of requiredFields) {
    if (!(field in row)) codes.push(`missing-field:${field}`);
  }
  if (row.batch !== "hjb-junior-v2") codes.push("bad-batch");
  if (!["S1", "S2", "S3"].includes(row.grade)) codes.push("bad-grade");
  if (!["multiple-choice", "fill-in", "short-answer"].includes(row.type)) codes.push("bad-type");
  if (!String(row.promptZhHans ?? "").trim()) codes.push("missing-prompt");
  if (!String(row.answer ?? "").trim()) codes.push("missing-answer");
  if (!Array.isArray(row.acceptedAnswers) || !row.acceptedAnswers.includes(row.answer)) codes.push("missing-accepted-answer");
  if (!String(row.explanationZhHans ?? "").trim()) codes.push("missing-explanation");
  if (row.type === "multiple-choice") {
    const options = Array.isArray(row.optionsZhHans) ? row.optionsZhHans : [];
    if (options.length !== 4) codes.push("bad-mc-options");
    if (new Set(options.map(normalizeIdentity)).size !== options.length) codes.push("duplicate-mc-options");
    if (!options.includes(row.answer)) codes.push("answer-not-option");
  } else if (Array.isArray(row.optionsZhHans) && row.optionsZhHans.length) {
    codes.push("non-mc-has-options");
  }
  const text = sourceRiskText(row);
  for (const { code, regex } of forbiddenSourcePatterns) {
    if (regex.test(text)) codes.push(code);
  }
  for (const regex of missingVisualPatterns) {
    if (regex.test(text)) codes.push("missing-visual-reference");
  }
  for (const regex of contradictionPatterns) {
    if (regex.test(text)) codes.push("self-contradiction-wording");
  }
  if (generatorRedFlagPattern.test(text)) codes.push("math-red-flag-wording");
  if (tooGenericPromptKeys.has(normalizeIdentity(row.promptZhHans))) codes.push("too-generic-prompt");
  return unique(codes);
}

function codexRepairDecisions(rows) {
  const rowIds = new Set(rows.map((row) => row.id));
  const reviewRows = readCsv(CODEX_REVIEW_CSV);
  const decisions = reviewRows
    .map((row) => ({
      id: row.id,
      grade: row.grade,
      unitTitle: row.unitTitle,
      type: row.type,
      difficulty: row.difficulty,
      deepseekSeverity: row.deepseekSeverity,
      deepseekIssueCodes: row.deepseekIssueCodes,
      deepseekConfidence: row.deepseekConfidence,
      codexStatus: row.codexStatus,
      codexAction: row.codexAction,
      codexReason: row.codexReason,
      deepseekIssueDetailsZhHans: row.deepseekIssueDetailsZhHans,
      previousPromptZhHans: row.promptZhHans,
      previousAnswer: row.answer
    }))
    .filter((row) => row.id);

  const missingQuestionRows = decisions.filter((row) => !rowIds.has(row.id));
  if (missingQuestionRows.length) throw new Error(`Codex review references ids missing from questions.jsonl: ${missingQuestionRows.map((row) => row.id).join(", ")}`);

  const repairRows = decisions.filter((row) => row.codexStatus === "repair-required");
  const minorRows = decisions.filter((row) => row.codexStatus === "minor-or-format-review");
  const falsePositiveRows = decisions.filter((row) => row.codexStatus === "likely-model-false-positive");
  const otherRows = decisions.filter((row) => !["repair-required", "minor-or-format-review", "likely-model-false-positive"].includes(row.codexStatus));

  if (!allowNonstandardCounts && (repairRows.length !== 197 || minorRows.length !== 4 || falsePositiveRows.length !== 35 || otherRows.length !== 0)) {
    throw new Error(
      `Unexpected Codex review counts: repair=${repairRows.length}, minor=${minorRows.length}, falsePositive=${falsePositiveRows.length}, other=${otherRows.length}. ` +
        "Set HJB_JUNIOR_REPAIR_ALLOW_NONSTANDARD_COUNTS=1 only for a consciously revised review set."
    );
  }

  const decisionById = new Map(decisions.map((row) => [row.id, row]));
  return {
    decisions,
    decisionById,
    repairRows,
    minorRows,
    falsePositiveRows,
    repairIds: new Set([...repairRows, ...minorRows].map((row) => row.id)),
    falsePositiveIds: new Set(falsePositiveRows.map((row) => row.id))
  };
}

function systemPrompt() {
  return [
    "你是 MAIS 的初中数学原创题修复与审核专家。",
    "任务是修复候选题包中被 S18 Codex 复核确认的问题题目。",
    "必须使用简体中文与内地初中数学术语。",
    "只能依据安全 RAG 摘要、概念标签、能力标签、误区标签和题型模式生成全新题目。",
    "不得复制、改写、翻译、近似重构教材、练习册、试卷、答案、图表、页面、版式或解法原文。",
    "不得提到来源文件、PDF、DOCX、OCR、页码、截图、试卷原题、教材原题、原题、原卷、原教材、改编自、摘自、来源于或任何 source locator。",
    "不要写如图、见图、上图、下图、右图、左图、图中、根据图形、根据图像、根据图表。几何、函数、坐标、统计类条件必须全部文字化。",
    "题目必须唯一可解；选择题只有一个正确选项，answer 必须与某一个 optionsZhHans 字符串完全相同。",
    "解释必须直接推出 answer 字段，不能与答案或选项矛盾。",
    "不要写模型思考、纠错、自我提醒、题目修改建议或生成过程。",
    "题干不得只是“下列计算正确的是”“下列说法正确的是”等泛化句；必须包含具体表达式、数量、条件或情境。",
    "解析控制在160个汉字以内。",
    "只输出 JSON object，不要 Markdown，不要代码块。"
  ].join("\n");
}

function userPrompt({ targets, curriculumCards, assessmentPatternCards, paperPatternCards, zhongkaoExamPatternCards, sameTopicPromptSamples }) {
  return JSON.stringify({
    task: `Repair exactly ${targets.length} original Shanghai Education Press junior-secondary math questions.`,
    outputContract: {
      root: "questions",
      perQuestionFields: ["id", "promptZhHans", "optionsZhHans", "answer", "acceptedAnswers", "explanationZhHans"],
      rules: [
        "Return exactly one JSON object: {\"questions\":[...items...]}",
        "Use each target id exactly once.",
        "Do not add or remove target ids.",
        "Keep target grade, semester, unitTitle, volume, conceptIds, type, and difficulty.",
        "For multiple-choice, optionsZhHans must contain exactly 4 strings and answer must exactly equal one option.",
        "For multiple-choice, all four options must be textually and mathematically distinct after removing spaces and punctuation.",
        "For fill-in and short-answer, optionsZhHans must be an empty array.",
        "acceptedAnswers must include the canonical answer.",
        "Use compact JSON strings. Do not put raw line breaks inside any string value.",
        "Do not use LaTeX delimiters or backslash commands such as \\(, \\), \\sqrt, \\frac; write math with plain text symbols like √12, (14/3)√3, x^2.",
        "For repairMode=repair-required, create a fully new original question using fresh numbers, expressions, point names, contexts, and distractors.",
        "For repairMode=minor-or-format-review, prefer preserving the existing question and only fix acceptedAnswers, precision wording, or explanation text; rewrite only if preservation would leave ambiguity.",
        "Do not reuse any sameTopicPromptSamples.",
        "For isosceles-triangle targets, avoid the repetitive template '在△ABC中，AB=AC，点D在BC上...'; use varied labels, equilateral-triangle facts, perpendicular-bisector conditions, side comparisons, or concrete proof/angle tasks with fully stated text conditions.",
        "Do not include reviewer language such as 原题, 题目有误, 重新计算, 重新生成, 选项中没有, 答案不唯一, 缺少条件, 缺少图, 不够条件, 根据输出要求.",
        "Do not rely on any external diagram; all point coordinates, side lengths, angles, formulas, data lists, or table values must be written in text."
      ]
    },
    targets: targets.map((target) => ({
      id: target.id,
      repairMode: target.repairMode,
      repairReason: target.repairReason,
      codexAction: target.codexAction,
      codexReason: target.codexReason,
      deepseekIssueCodes: target.deepseekIssueCodes,
      deepseekIssueDetailsZhHans: target.deepseekIssueDetailsZhHans,
      previousQuestion:
        target.repairMode === "minor-or-format-review"
          ? {
              promptZhHans: target.promptZhHans,
              optionsZhHans: target.optionsZhHans,
              answer: target.answer,
              acceptedAnswers: target.acceptedAnswers,
              explanationZhHans: target.explanationZhHans
            }
          : "[withheld: create a completely new question from target metadata and Codex issue summary]",
      grade: target.grade,
      semester: target.semester,
      unitTitle: target.unitTitle,
      volume: target.volume,
      conceptIds: target.conceptIds,
      competencyTags: target.competencyTags,
      skillTags: target.skillTags,
      misconceptionTags: target.misconceptionTags,
      difficulty: target.difficulty,
      type: target.type,
      sameTopicPromptSamples: sameTopicPromptSamples.get(target.id) ?? []
    })),
    safeCurriculumEvidence: curriculumCards.map(compactCurriculumCard),
    safeHjbAssessmentPatternEvidence: assessmentPatternCards.map(compactPatternCard),
    safeHjbPaperPatternEvidence: paperPatternCards.map(compactPatternCard),
    safeSharedZhongkaoPatternEvidence: zhongkaoExamPatternCards.map(compactPatternCard)
  });
}

function retryInstruction(error) {
  const message = String(error?.message ?? error).slice(0, 1800);
  return [
    "Previous repair response failed the local validation gate.",
    `Validation failure: ${message}`,
    "Regenerate the full repair batch with the same target ids.",
    "Make every prompt concrete and unique. Do not reuse old prompt wording.",
    "For choice questions, make four options unique after removing spaces and punctuation, and make exactly one option correct.",
    "Do not mention 原题, 题目有误, 重新计算, 重新生成, 答案不唯一, 无法确定, 缺少条件, or 缺少图.",
    "Do not use 如图, 见图, 上图, 下图, 左图, 右图, 图中, 根据图形, 根据图像, or 根据图表.",
    "Return only one JSON object with the required questions array."
  ].join("\n");
}

function evidenceForTargets({ targets, curriculumCards, assessmentPatternCards, paperPatternCards, zhongkaoExamPatternCards }) {
  const curriculumIds = unique(targets.flatMap((target) => target.evidenceCardIds));
  const assessmentIds = unique(targets.flatMap((target) => target.assessmentPatternCardIds));
  const paperIds = unique(targets.flatMap((target) => target.paperPatternCardIds));
  const examIds = unique(targets.flatMap((target) => target.examPatternCardIds));
  return {
    curriculumCards: curriculumCards.filter((card) => curriculumIds.includes(card.id)),
    assessmentPatternCards: assessmentPatternCards.filter((card) => assessmentIds.includes(card.id)),
    paperPatternCards: paperPatternCards.filter((card) => paperIds.includes(card.id)),
    zhongkaoExamPatternCards: zhongkaoExamPatternCards.filter((card) => examIds.includes(card.id))
  };
}

function messagesForTargets({
  targets,
  curriculumCards,
  assessmentPatternCards,
  paperPatternCards,
  zhongkaoExamPatternCards,
  sameTopicPromptSamples,
  lastError
}) {
  const evidence = evidenceForTargets({ targets, curriculumCards, assessmentPatternCards, paperPatternCards, zhongkaoExamPatternCards });
  const messages = [
    { role: "system", content: systemPrompt() },
    {
      role: "user",
      content: userPrompt({
        targets,
        sameTopicPromptSamples,
        ...evidence
      })
    }
  ];
  return lastError ? [...messages, { role: "user", content: retryInstruction(lastError) }] : messages;
}

function normalizeRepairQuestion(target, raw, usedPromptKeys, batchPromptKeys) {
  const promptZhHans = typeof raw.promptZhHans === "string" ? raw.promptZhHans.trim() : "";
  const answer = typeof raw.answer === "string" ? raw.answer.trim() : "";
  const explanationZhHans = typeof raw.explanationZhHans === "string" ? raw.explanationZhHans.trim() : "";
  const optionsZhHans = Array.isArray(raw.optionsZhHans) ? raw.optionsZhHans.map((value) => String(value).trim()).filter(Boolean) : [];
  const acceptedAnswers = Array.isArray(raw.acceptedAnswers)
    ? raw.acceptedAnswers.map((value) => String(value).trim()).filter(Boolean)
    : [];
  const errors = [];

  if (raw.id !== target.id) errors.push(`id mismatch: expected ${target.id}, got ${raw.id}`);
  if (!promptZhHans) errors.push("missing promptZhHans");
  if (!answer) errors.push("missing answer");
  if (!explanationZhHans) errors.push("missing explanationZhHans");
  if (target.type === "multiple-choice") {
    if (optionsZhHans.length !== 4) errors.push(`multiple-choice options length ${optionsZhHans.length}`);
    if (new Set(optionsZhHans.map(normalizeIdentity)).size !== optionsZhHans.length) errors.push("multiple-choice options include normalized duplicates");
    if (!optionsZhHans.includes(answer)) errors.push("multiple-choice answer does not exactly match one option");
  } else if (optionsZhHans.length) {
    errors.push(`${target.type} must not include options`);
  }

  const normalized = {
    ...target,
    promptZhHans,
    optionsZhHans: target.type === "multiple-choice" ? optionsZhHans : [],
    answer,
    acceptedAnswers: unique([answer, ...acceptedAnswers]),
    explanationZhHans,
    sourceDistanceStatus: "passed-auto-source-scan",
    mathQaStatus: "pending-s18-review",
    terminologyQaStatus: "pending-s18-review",
    manualQaStatus: "pending-s18-review",
    reviewNotes:
      "Repaired offline with DeepSeek V4 Pro from MAIS HJB junior safe-RAG metadata only; candidate QA package only, not approved for public integration."
  };
  delete normalized.repairReason;
  delete normalized.repairMode;
  delete normalized.codexAction;
  delete normalized.codexReason;
  delete normalized.deepseekIssueCodes;
  delete normalized.deepseekIssueDetailsZhHans;
  delete normalized.deepseekSeverity;
  delete normalized.deepseekConfidence;
  delete normalized.previousPromptZhHans;
  delete normalized.previousAnswer;

  const promptKey = normalizeIdentity(promptZhHans);
  if (usedPromptKeys.has(promptKey)) errors.push("prompt duplicates an existing non-repair row");
  if (batchPromptKeys.has(promptKey)) errors.push("prompt duplicates another repaired row in this batch");
  if (tooGenericPromptKeys.has(promptKey)) errors.push("prompt is too generic");
  if (!normalized.acceptedAnswers.length) errors.push("missing acceptedAnswers");
  errors.push(...localIssueCodes(normalized));
  return { question: normalized, promptKey, errors: unique(errors) };
}

function validateRepairBatch(targets, rawQuestions, usedPromptKeys) {
  if (!Array.isArray(rawQuestions)) throw new Error("Provider JSON missing questions array");
  if (rawQuestions.length !== targets.length) throw new Error(`Expected ${targets.length} questions, got ${rawQuestions.length}`);
  const batchPromptKeys = new Set();
  const normalized = [];
  const errors = [];
  for (const target of targets) {
    const raw = rawQuestions.find((question) => question?.id === target.id);
    if (!raw) {
      errors.push(`Missing repaired question for ${target.id}`);
      continue;
    }
    const result = normalizeRepairQuestion(target, raw, usedPromptKeys, batchPromptKeys);
    normalized.push(result.question);
    if (result.promptKey) batchPromptKeys.add(result.promptKey);
    errors.push(...result.errors.map((error) => `${target.id}: ${error}`));
  }
  if (errors.length) throw new Error(errors.join("; "));
  return normalized;
}

async function generateRepairBatch({
  targets,
  usedPromptKeys,
  sameTopicPromptSamples,
  curriculumCards,
  assessmentPatternCards,
  paperPatternCards,
  zhongkaoExamPatternCards,
  apiUrl,
  apiKey,
  model,
  batchLabel
}) {
  let lastError = null;
  const maxBatchAttempts = targets.length === 1 ? 8 : 3;
  for (let attempt = 1; attempt <= maxBatchAttempts; attempt += 1) {
    try {
      console.log(`${batchLabel} attempt ${attempt}/${maxBatchAttempts}`);
      const messages = messagesForTargets({
        targets,
        curriculumCards,
        assessmentPatternCards,
        paperPatternCards,
        zhongkaoExamPatternCards,
        sameTopicPromptSamples,
        lastError
      });
      const content = await postDeepSeek({ apiUrl, apiKey, model, messages });
      const parsed = extractJsonObject(content);
      return validateRepairBatch(targets, parsed.questions, usedPromptKeys);
    } catch (error) {
      lastError = error;
      console.log(`${batchLabel} attempt ${attempt} failed: ${String(error?.message ?? error).slice(0, 320)}`);
      if (attempt < maxBatchAttempts) await sleep(2000 * Math.min(attempt, 4));
    }
  }

  if (targets.length > 1) {
    console.log(`${batchLabel} falling back to single-target DeepSeek repair retries.`);
    const repaired = [];
    for (const target of targets) {
      let singleLastError = lastError;
      let singleQuestion = null;
      for (let attempt = 1; attempt <= 8; attempt += 1) {
        try {
          const messages = messagesForTargets({
            targets: [target],
            curriculumCards,
            assessmentPatternCards,
            paperPatternCards,
            zhongkaoExamPatternCards,
            sameTopicPromptSamples,
            lastError: singleLastError
          });
          const content = await postDeepSeek({ apiUrl, apiKey, model, messages });
          const parsed = extractJsonObject(content);
          [singleQuestion] = validateRepairBatch([target], parsed.questions, usedPromptKeys);
          break;
        } catch (error) {
          singleLastError = error;
          if (attempt < 8) await sleep(2000 * Math.min(attempt, 4));
        }
      }
      if (!singleQuestion) throw new Error(`${batchLabel} single-target repair failed for ${target.id}: ${singleLastError?.message ?? singleLastError}`);
      usedPromptKeys.add(normalizeIdentity(singleQuestion.promptZhHans));
      repaired.push(singleQuestion);
    }
    return repaired;
  }

  throw new Error(`${batchLabel} failed after repair retries: ${lastError?.message ?? lastError}`);
}

function sameTopicSamplesForTargets(rows, repairIds, targets) {
  const map = new Map();
  for (const target of targets) {
    const samples = rows
      .filter((row) => row.topicId === target.topicId && row.id !== target.id && !repairIds.has(row.id))
      .slice(0, 30)
      .map((row) => `${row.id}: ${row.promptZhHans}`);
    map.set(target.id, samples);
  }
  return map;
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function csvEscape(value) {
  const text = (Array.isArray(value) ? value.join(" | ") : String(value ?? "")).replace(/\s*\r?\n\s*/g, " ");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function buildCoverageRows(questions) {
  const grouped = countBy(questions, (question) =>
    [
      question.grade,
      question.semester,
      question.topicId,
      question.unitTitle,
      question.type,
      question.difficulty,
      question.evidenceCardIds.join("|"),
      question.assessmentPatternCardIds.join("|"),
      question.paperPatternCardIds.join("|"),
      question.examPatternCardIds.join("|")
    ].join("\t")
  );
  return Array.from(grouped.entries())
    .map(([key, count]) => {
      const [
        grade,
        semester,
        topicId,
        unitTitle,
        type,
        difficulty,
        evidenceCardIds,
        assessmentPatternCardIds,
        paperPatternCardIds,
        examPatternCardIds
      ] = key.split("\t");
      return { grade, semester, topicId, unitTitle, type, difficulty, count, evidenceCardIds, assessmentPatternCardIds, paperPatternCardIds, examPatternCardIds };
    })
    .sort((left, right) => left.grade.localeCompare(right.grade) || left.semester.localeCompare(right.semester) || left.topicId.localeCompare(right.topicId));
}

function duplicatePromptGroups(rows) {
  const counts = countBy(rows, (row) => normalizeIdentity(row.promptZhHans));
  return Array.from(counts.entries()).filter(([key, count]) => key && count > 1);
}

function repairBatchIdFor(index) {
  return `repair-${String(index + 1).padStart(4, "0")}`;
}

function writeRepairTargets({ decisions, repairTargets, repairRows, minorRows, falsePositiveRows }) {
  fs.mkdirSync(REPAIR_DIR, { recursive: true });
  const countsByGrade = Object.fromEntries(
    Array.from(countBy(repairTargets, (row) => row.grade).entries()).sort((left, right) => left[0].localeCompare(right[0]))
  );
  fs.writeFileSync(
    REPAIR_TARGETS_JSON,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sessionId: "S18",
        candidatePackage: "mainland-hjb-junior-generated-bank-v2-1500",
        source: path.relative(__dirname, CODEX_REVIEW_CSV),
        counts: {
          codexReviewRows: decisions.length,
          repairRequired: repairRows.length,
          minorOrFormatReview: minorRows.length,
          likelyModelFalsePositive: falsePositiveRows.length,
          totalTargets: repairTargets.length,
          targetsByGrade: countsByGrade
        },
        targetIds: repairTargets.map((row) => row.id),
        falsePositiveIds: falsePositiveRows.map((row) => row.id),
        targets: repairTargets.map((row) => ({
          id: row.id,
          grade: row.grade,
          unitTitle: row.unitTitle,
          type: row.type,
          difficulty: row.difficulty,
          repairMode: row.repairMode,
          repairReason: row.repairReason,
          codexAction: row.codexAction,
          codexReason: row.codexReason,
          deepseekIssueCodes: row.deepseekIssueCodes
        }))
      },
      null,
      2
    )}\n`
  );
}

function writeRepairReport({ startedAt, finishedAt, repairTargets, repairRows, minorRows, falsePositiveRows, repairedCount, cacheFilesWritten, duplicatePrompts, localIssues }) {
  fs.mkdirSync(REPAIR_DIR, { recursive: true });
  const byGrade = Object.fromEntries(Array.from(countBy(repairTargets, (row) => row.grade).entries()).sort((left, right) => left[0].localeCompare(right[0])));
  const byUnit = Array.from(countBy(repairTargets, (row) => row.unitTitle).entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([unit, count]) => `| ${unit} | ${count} |`)
    .join("\n");
  fs.writeFileSync(
    REPAIR_REPORT_MD,
    `# S18 HJB Junior V2 Targeted Repair Report

- Date: ${finishedAt.slice(0, 10)}
- Session ID: S18
- Candidate package: \`mainland-hjb-junior-generated-bank-v2-1500\`
- Started: ${startedAt}
- Finished: ${finishedAt}
- Model: \`deepseek-v4-pro\`
- Status: ${repairedCount === repairTargets.length && duplicatePrompts === 0 && localIssues.length === 0 ? "targeted-repair-complete-pending-full-qa" : "targeted-repair-needs-follow-up"}

## Summary

- Codex repair-required rows regenerated/fixed: ${repairRows.length}
- Minor/format-review rows fixed or regenerated: ${minorRows.length}
- DeepSeek false positives retained unchanged: ${falsePositiveRows.length}
- Total target rows replaced in candidate outputs: ${repairedCount}
- Repair cache files written this run: ${cacheFilesWritten}

## Target Split

| Grade | Count |
| --- | ---: |
${Object.entries(byGrade)
  .map(([grade, count]) => `| ${grade} | ${count} |`)
  .join("\n")}

| Unit | Count |
| --- | ---: |
${byUnit || "| None | 0 |"}

## Local Gate After Merge

- Duplicate normalized prompts: ${duplicatePrompts}
- Local structural/source-risk row issues: ${localIssues.length}
- This report is candidate QA evidence only; it does not approve public integration.

## Required Next Gates

- Run \`audit-solvability.mjs\`.
- Force a fresh full-package DeepSeek-v4-pro QA pass without reusing old \`batches-all\` cache.
- Rerun Codex adjudication on the fresh model QA results.
`
  );
}

function rewriteBatchCaches(rowsById) {
  let touched = 0;
  for (const filename of fs.readdirSync(batchDir).filter((file) => file.endsWith(".json")).sort()) {
    const cachePath = path.join(batchDir, filename);
    const cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    let changed = false;
    const questions = (cache.questions ?? []).map((question) => {
      const replacement = rowsById.get(question.id);
      if (!replacement) return question;
      if (JSON.stringify(replacement) !== JSON.stringify(question)) {
        changed = true;
        return replacement;
      }
      return question;
    });
    if (changed) {
      touched += 1;
      fs.writeFileSync(cachePath, `${JSON.stringify({ ...cache, questions }, null, 2)}\n`);
    }
  }
  return touched;
}

function writeOutputs(rows, repairCount, repairCacheFilesWritten, { strict = true } = {}) {
  const sorted = [...rows].sort((left, right) => left.id.localeCompare(right.id));
  writeJsonl(QUESTIONS_JSONL, sorted);
  writeCsv(path.join(__dirname, "questions.csv"), sorted, [
    "id",
    "batch",
    "grade",
    "semester",
    "topicId",
    "unitTitle",
    "volume",
    "conceptIds",
    "difficulty",
    "type",
    "promptZhHans",
    "optionsZhHans",
    "answer",
    "acceptedAnswers",
    "explanationZhHans",
    "evidenceCardIds",
    "assessmentPatternCardIds",
    "paperPatternCardIds",
    "examPatternCardIds",
    "sourceDistanceStatus",
    "mathQaStatus",
    "terminologyQaStatus",
    "manualQaStatus",
    "reviewNotes"
  ]);
  writeCsv(path.join(__dirname, "coverage-matrix.csv"), buildCoverageRows(sorted), [
    "grade",
    "semester",
    "topicId",
    "unitTitle",
    "type",
    "difficulty",
    "count",
    "evidenceCardIds",
    "assessmentPatternCardIds",
    "paperPatternCardIds",
    "examPatternCardIds"
  ]);
  fs.writeFileSync(path.join(__dirname, "question-pack.json"), `${JSON.stringify({ questions: sorted }, null, 2)}\n`);

  const duplicatePrompts = duplicatePromptGroups(sorted).length;
  const localIssues = sorted.flatMap((row) => localIssueCodes(row).map((code) => `${row.id}:${code}`));
  fs.writeFileSync(
    path.join(__dirname, "qa-report.md"),
    `# Mainland HJB Junior Generated Bank V2 Candidate QA Report

	- Date: ${new Date().toISOString().slice(0, 10)}
	- Session ID: S18
	- Generator: DeepSeek API via project server-side \`LLM_API_KEY\` or \`OPENAI_API_KEY\` from local \`.env.local\`
	- Repair pass: DeepSeek-only targeted repair completed for ${repairCount} rows; ${repairCacheFilesWritten} dedicated repair cache files written.
- Verdict: ${duplicatePrompts === 0 && localIssues.length === 0 ? "Auto structure/count/schema QA passed for the offline candidate package; S18 audit-solvability gate still required before any future integration decision." : "Needs remediation before use."}

## Scope

- Generated ${sorted.length} original Simplified Chinese questions for Mainland Shanghai Education Press / HuJiaoBan junior-secondary mathematics.
- Distribution target: 500 questions per S1, S2, and S3 grade.
- This package is candidate-only. It must not be connected to public practice, lessons, APIs, or production data in this task.
- RAG evidence source: committed HJB junior textbook safe cards, HJB junior assessment/paper-pattern cards, and shared Mainland junior zhongkao pattern cards.

## Repair QA Checks

- Duplicate exact prompts after normalized scan: ${duplicatePrompts}.
- Local structural/source-risk row issues after repair: ${localIssues.length}.
- \`mathQaStatus\`, \`terminologyQaStatus\`, and \`manualQaStatus\` remain \`pending-s18-review\`; this task does not approve public integration.
- Required next step for candidate QA: run \`node coordination/content-qa/mainland-hjb-junior-generated-bank-v2-1500/audit-solvability.mjs\`.
`
  );

  if (strict && (duplicatePrompts || localIssues.length)) {
    throw new Error(`Repair output still has ${duplicatePrompts} duplicate prompt groups and ${localIssues.length} local row issues`);
  }
}

async function main() {
  const startedAt = new Date().toISOString();
  loadEnvFile(path.join(rootDir, ".env.local"));
  const apiKey = process.env.LLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  const apiUrl = process.env.LLM_API_URL?.trim() || "https://api.deepseek.com/chat/completions";
  const model = process.env.LLM_MODEL?.trim() || "deepseek-v4-pro";

  if (!apiKey) throw new Error("Missing LLM_API_KEY or OPENAI_API_KEY in local environment");
  if (!new URL(apiUrl).host.includes("api.deepseek.com")) throw new Error(`Refusing non-DeepSeek endpoint for this task: ${new URL(apiUrl).host}`);
  if (model !== "deepseek-v4-pro") throw new Error(`Refusing non-DeepSeek V4 Pro model for this task: ${model}`);
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 10) throw new Error(`Invalid HJB_JUNIOR_REPAIR_BATCH_SIZE: ${batchSize}`);
  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 30000 || requestTimeoutMs > 180000) {
    throw new Error(`Invalid HJB_JUNIOR_DEEPSEEK_TIMEOUT_MS: ${requestTimeoutMs}`);
  }

  const rows = readJsonl(QUESTIONS_JSONL);
  const decisions = codexRepairDecisions(rows);
  const repairIds = decisions.repairIds;
  const repairTargets = rows
    .filter((row) => repairIds.has(row.id))
    .map((row) => {
      const decision = decisions.decisionById.get(row.id);
      return {
        ...row,
        repairMode: decision.codexStatus,
        repairReason: `${decision.codexAction} ${decision.codexReason}`.trim(),
        codexAction: decision.codexAction,
        codexReason: decision.codexReason,
        deepseekSeverity: decision.deepseekSeverity,
        deepseekIssueCodes: decision.deepseekIssueCodes,
        deepseekConfidence: decision.deepseekConfidence,
        deepseekIssueDetailsZhHans: decision.deepseekIssueDetailsZhHans,
        previousPromptZhHans: decision.previousPromptZhHans,
        previousAnswer: decision.previousAnswer
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));

  if (!repairTargets.length) {
    console.log("No repair targets detected.");
    return;
  }

  fs.mkdirSync(REPAIR_BATCH_DIR, { recursive: true });
  writeRepairTargets({
    decisions: decisions.decisions,
    repairTargets,
    repairRows: decisions.repairRows,
    minorRows: decisions.minorRows,
    falsePositiveRows: decisions.falsePositiveRows
  });

  const usedPromptKeys = new Set(rows.filter((row) => !repairIds.has(row.id)).map((row) => normalizeIdentity(row.promptZhHans)).filter(Boolean));
  const rowsById = new Map(rows.map((row) => [row.id, row]));

  const curriculumCards = loadTsExport(path.join(rootDir, "data/rag/mainlandHjbJunior.ts"), "mainlandHjbJuniorRagCards");
  const assessmentPatternCards = loadTsExport(path.join(rootDir, "data/rag/mainlandHjbJuniorAssessmentPatterns.ts"), "mainlandHjbJuniorAssessmentPatternCards");
  const paperPatternCards = loadTsExport(path.join(rootDir, "data/rag/mainlandHjbJuniorPaperPatterns.ts"), "mainlandHjbJuniorPaperPatternCards");
  const zhongkaoExamPatternCards = loadTsExport(path.join(rootDir, "data/rag/mainlandJuniorZhongkaoExamPatterns.ts"), "mainlandJuniorZhongkaoExamPatternCards");

  const repairBatches = chunk(repairTargets, batchSize);
  console.log(`DeepSeek repair starting: ${repairTargets.length} rows in ${repairBatches.length} batches, model=${model}, endpoint=${new URL(apiUrl).host}`);
  console.log(
    `Codex review queue: repair-required=${decisions.repairRows.length}, minor-or-format-review=${decisions.minorRows.length}, retained false positives=${decisions.falsePositiveRows.length}`
  );

  let repairedCount = 0;
  let repairCacheFilesWritten = 0;
  for (let index = 0; index < repairBatches.length; index += 1) {
    const targets = repairBatches[index];
    const batchId = repairBatchIdFor(index);
    const batchLabel = `${batchId}/${String(repairBatches.length).padStart(4, "0")}`;
    const cachePath = path.join(REPAIR_BATCH_DIR, `${batchId}.json`);
    console.log(`${batchLabel}: ${targets[0].grade} ${targets[0].unitTitle}`);
    const sameTopicPromptSamples = sameTopicSamplesForTargets(rows, repairIds, targets);
    let repaired;
    if (fs.existsSync(cachePath)) {
      const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
      repaired = validateRepairBatch(targets, cached.questions, usedPromptKeys);
      console.log(`${batchLabel}: loaded ${repaired.length} repaired rows from dedicated repair cache`);
    } else {
      repaired = await generateRepairBatch({
        targets,
        usedPromptKeys,
        sameTopicPromptSamples,
        curriculumCards,
        assessmentPatternCards,
        paperPatternCards,
        zhongkaoExamPatternCards,
        apiUrl,
        apiKey,
        model,
        batchLabel
      });
      fs.writeFileSync(
        cachePath,
        `${JSON.stringify(
          {
            batchId,
            generatedAt: new Date().toISOString(),
            targetIds: targets.map((target) => target.id),
            questions: repaired
          },
          null,
          2
        )}\n`
      );
      repairCacheFilesWritten += 1;
    }
    for (const question of repaired) {
      rowsById.set(question.id, question);
      usedPromptKeys.add(normalizeIdentity(question.promptZhHans));
      repairedCount += 1;
    }
    const currentRows = rows.map((row) => rowsById.get(row.id) ?? row);
    writeOutputs(currentRows, repairedCount, repairCacheFilesWritten, { strict: false });
  }

  const repairedRows = rows.map((row) => rowsById.get(row.id) ?? row);
  writeOutputs(repairedRows, repairedCount, repairCacheFilesWritten, { strict: true });
  const sortedRows = [...repairedRows].sort((left, right) => left.id.localeCompare(right.id));
  const duplicatePrompts = duplicatePromptGroups(sortedRows).length;
  const localIssues = sortedRows.flatMap((row) => localIssueCodes(row).map((code) => `${row.id}:${code}`));
  const finishedAt = new Date().toISOString();
  fs.writeFileSync(
    REPAIR_RESULTS_JSON,
    `${JSON.stringify(
      {
        generatedAt: finishedAt,
        sessionId: "S18",
        candidatePackage: "mainland-hjb-junior-generated-bank-v2-1500",
        model,
        repairedCount,
        repairCacheFilesWritten,
        duplicatePrompts,
        localIssueCount: localIssues.length,
        localIssues,
        repairedIds: repairTargets.map((target) => target.id),
        retainedFalsePositiveIds: decisions.falsePositiveRows.map((row) => row.id)
      },
      null,
      2
    )}\n`
  );
  writeRepairReport({
    startedAt,
    finishedAt,
    repairTargets,
    repairRows: decisions.repairRows,
    minorRows: decisions.minorRows,
    falsePositiveRows: decisions.falsePositiveRows,
    repairedCount,
    cacheFilesWritten: repairCacheFilesWritten,
    duplicatePrompts,
    localIssues
  });
  console.log(`Repair complete: repaired ${repairedCount} rows, wrote ${repairCacheFilesWritten} dedicated repair cache files, rewrote candidate outputs.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
