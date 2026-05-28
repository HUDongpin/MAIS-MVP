import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const batchDir = path.join(__dirname, "batches");

const grades = ["P1", "P2", "P3", "P4", "P5", "P6"];
const semesters = ["upper", "lower"];
const types = ["multiple-choice", "fill-in", "short-answer"];
const typeQuotas = { "multiple-choice": 20, "fill-in": 18, "short-answer": 12 };
const difficultyQuotas = {
  P1: {
    upper: { Foundation: 28, Core: 17, Challenge: 4, Exam: 1 },
    lower: { Foundation: 27, Core: 18, Challenge: 4, Exam: 1 }
  },
  P2: {
    upper: { Foundation: 23, Core: 20, Challenge: 6, Exam: 1 },
    lower: { Foundation: 22, Core: 20, Challenge: 6, Exam: 2 }
  },
  P3: {
    upper: { Foundation: 18, Core: 22, Challenge: 8, Exam: 2 },
    lower: { Foundation: 17, Core: 23, Challenge: 7, Exam: 3 }
  },
  P4: {
    upper: { Foundation: 18, Core: 22, Challenge: 8, Exam: 2 },
    lower: { Foundation: 17, Core: 23, Challenge: 7, Exam: 3 }
  },
  P5: {
    upper: { Foundation: 13, Core: 25, Challenge: 9, Exam: 3 },
    lower: { Foundation: 12, Core: 25, Challenge: 9, Exam: 4 }
  },
  P6: {
    upper: { Foundation: 13, Core: 25, Challenge: 9, Exam: 3 },
    lower: { Foundation: 12, Core: 25, Challenge: 9, Exam: 4 }
  }
};

const manualQuestionOverrides = {
  "pep-primary-p2-upper-031": {
    explanationZhHans: "有5排，每排4张，就是5个4相加。用乘法表示为5×4，所以桌子总数可以用5×4计算。"
  },
  "pep-primary-p3-upper-039": {
    promptZhHans: "下面哪一项描述的涂色部分可以用1/4表示？\nA. 一个圆形被分成4份，其中1份涂色，但每份大小不一样。\nB. 一个正方形被平均分成4个小正方形，其中1个小正方形涂色。\nC. 一个长方形被平均分成4份，其中2份涂色。\nD. 一个三角形被平均分成3份，其中1份涂色。",
    explanationZhHans: "1/4表示把一个整体平均分成4份，取其中的1份。只有B符合“平均分成4份并涂1份”。"
  },
  "pep-primary-p4-upper-033": {
    promptZhHans: "一个四边形，两组对边分别平行，四个角都是直角，并且相邻两条边长度不相等。这个四边形是什么图形？",
    explanationZhHans: "两组对边分别平行且四个角都是直角，说明它是矩形；相邻两边不相等，所以不是正方形，而是长方形。"
  },
  "pep-primary-p4-upper-049": {
    promptZhHans: "四（1）班同学最喜欢的运动项目统计记录如下：足球15人，篮球10人，乒乓球20人，羽毛球5人。在条形统计图中，用1格表示2人，乒乓球项目应画（ ）格。",
    explanationZhHans: "乒乓球有20人，每1格表示2人，所以20÷2=10，应画10格。"
  },
  "pep-primary-p5-lower-005": {
    answer: "4",
    acceptedAnswers: ["4", "4个", "4个小正方体"],
    explanationZhHans: "从前面看要有3个小正方体排成一横排；从左面看要有2层。最少是在底层放3个，再在其中1个上面放1个，共4个。"
  },
  "pep-primary-p6-lower-002": {
    promptZhHans: "一个圆柱形水桶，底面半径为2分米，高为5分米。给这个水桶的外侧（只包括一个底面和侧面）涂防锈漆，每平方分米需要油漆0.2千克。一共需要油漆多少千克？（π取3.14）",
    answer: "15.072",
    acceptedAnswers: ["15.072", "15.07", "15.072千克", "15.07千克"],
    explanationZhHans: "侧面积=2×3.14×2×5=62.8平方分米；一个底面积=3.14×2²=12.56平方分米。总面积75.36平方分米，需要油漆75.36×0.2=15.072千克。"
  }
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    const value = rawValue.replace(/^['"]|['"]$/g, "").trim();
    process.env[key] = value;
  }
}

function loadTsExport(filePath, exportName) {
  const source = fs.readFileSync(filePath, "utf8")
    .replace(/^import\s+.*;\s*$/gm, "")
    .replace(new RegExp(`export const ${exportName}: [^=]+ =`), `exports.${exportName} =`);
  const context = { exports: {} };
  vm.runInNewContext(source, context, { filename: filePath });
  return context.exports[exportName];
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function assessmentFamiliesFor(card) {
  const mapped = card.materialKinds.flatMap((kind) => {
    if (kind === "sync-practice" || kind === "tiered-practice" || kind === "calculation-practice") return ["lesson-practice"];
    if (kind === "unit-test") return ["unit-test"];
    if (kind === "topic-practice" || kind === "error-extension" || kind === "challenge-practice") return ["topic-drill"];
    if (kind === "midterm-final") return ["midterm", "final", "comprehensive"];
    if (kind === "comprehensive-assessment" || kind === "problem-solving") return ["comprehensive"];
    return [];
  });
  return unique([...(card.assessmentFamilies ?? []), ...mapped]);
}

function balancedSequence(counts) {
  const remaining = new Map(Object.entries(counts));
  const result = [];
  while (Array.from(remaining.values()).some((count) => count > 0)) {
    const next = Array.from(remaining.entries())
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    for (const [key, count] of next) {
      result.push(key);
      remaining.set(key, count - 1);
    }
  }
  return result;
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
    misconceptionTags: card.misconceptionTags,
    safeSummary: card.safeSummary,
    generationGuidance: card.generationGuidance,
    prohibitedReuseNotes: card.prohibitedReuseNotes
  };
}

function compactPatternCard(card) {
  return {
    id: card.id,
    grade: card.grade,
    semester: card.semester,
    unitTitles: card.unitTitles,
    materialKinds: card.materialKinds,
    assessmentFamilies: assessmentFamiliesFor(card),
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

function buildPlan(curriculumCards, patternCards) {
  const rows = [];
  for (const grade of grades) {
    for (const semester of semesters) {
      const typePlan = balancedSequence(typeQuotas);
      const difficultyPlan = balancedSequence(difficultyQuotas[grade][semester]);
      const curriculumPool = curriculumCards.filter((card) => card.grade === grade && card.semester === semester);
      const fallbackCurriculumPool = curriculumCards.filter((card) => card.grade === grade);
      const patternPool = patternCards.filter((card) => card.grade === grade && card.semester === semester);
      if (!patternPool.length) throw new Error(`Missing pattern cards for ${grade} ${semester}`);

      for (let index = 0; index < 50; index += 1) {
        const pattern = patternPool[index % patternPool.length];
        const curriculum = (curriculumPool.length ? curriculumPool : fallbackCurriculumPool)[index % (curriculumPool.length || fallbackCurriculumPool.length)];
        const assessmentFamilies = assessmentFamiliesFor(pattern);
        rows.push({
          id: `pep-primary-${grade.toLowerCase()}-${semester}-${String(index + 1).padStart(3, "0")}`,
          grade,
          semester,
          unitTitle: pattern.unitTitles[index % pattern.unitTitles.length] ?? curriculum.unitTitle,
          conceptIds: unique([...(pattern.conceptIds ?? []), ...(curriculum?.conceptIds ?? [])]).slice(0, 8),
          difficulty: difficultyPlan[index],
          type: typePlan[index],
          evidenceCardIds: curriculum ? [curriculum.id] : [],
          examPatternCardIds: [pattern.id],
          materialKind: pattern.materialKinds[index % pattern.materialKinds.length],
          assessmentFamily: assessmentFamilies[index % assessmentFamilies.length] ?? "lesson-practice"
        });
      }
    }
  }
  return rows;
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
}

function batchIdFor(targets) {
  return `${targets[0].grade}-${targets[0].semester}-${String(Math.floor((Number(targets[0].id.slice(-3)) - 1) / 10) + 1).padStart(2, "0")}`;
}

function systemPrompt() {
  return [
    "你是 MAIS 的小学数学原创题生成与审核专家。",
    "任务是根据安全 RAG 摘要生成内地人教版小学数学原创题。",
    "必须使用简体中文。不得复制、改写、翻译、近似重构教材、练习册、试卷、答案、图表、页面、版式或解法原文。",
    "不得提到来源文件、PDF、DOCX、OCR、页码、截图、试卷原题、教材原题或任何 source locator。",
    "不要写“如图”“见图”“上图”“下图”“图中”，题目必须不依赖外部图片也能完整作答。",
    "每题必须唯一可解，选择题只有一个正确选项；不要输出“设计有误”“选项中没有”“答案不唯一”“重新计算”等自我纠错文字。",
    "解释必须直接支持 answer 字段，不能与 answer 或选项矛盾。",
    "解析控制在120个汉字以内，不要写推测、反复验证、题目修改建议或模型思考过程。",
    "只输出 JSON object，不要 Markdown，不要代码块。"
  ].join("\n");
}

function userPrompt({ targets, curriculumCards, patternCards }) {
  return JSON.stringify({
    task: "Generate exactly 10 original Mainland PEP primary math questions.",
    outputContract: {
      root: "questions",
      perQuestionFields: ["id", "promptZhHans", "optionsZhHans", "answer", "acceptedAnswers", "explanationZhHans"],
      rules: [
        "Return exactly one JSON object: {\"questions\":[...10 items...]}",
        "Use the exact target id for each question.",
        "For multiple-choice, optionsZhHans must contain exactly 4 strings and answer must exactly equal one option.",
        "For fill-in and short-answer, optionsZhHans must be an empty array.",
        "acceptedAnswers must include the canonical answer.",
        "Explanation must be concise, age-appropriate, and show enough reasoning to verify the answer.",
        "Explanation must not say the question is wrong, under-specified, missing options, or has multiple possible answers.",
        "Explanation must be under 120 Chinese characters and must not include hidden reasoning, speculation, or prompt-repair notes.",
        "Do not invent unseen diagrams; any shape, table, clock, chart, or pattern must be fully described in text.",
        "Use only the target type, difficulty, grade, semester, unitTitle, and conceptIds.",
        "Create fresh numbers, contexts, diagrams-in-words, distractors, and solution paths."
      ]
    },
    targets,
    safeCurriculumEvidence: curriculumCards.map(compactCurriculumCard),
    safeExamPatternEvidence: patternCards.map(compactPatternCard)
  });
}

function extractJsonObject(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return JSON.parse(trimmed);
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in provider reply");
  return JSON.parse(match[0]);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function postDeepSeek({ apiUrl, apiKey, model, messages, maxTokens = 8000, attempt = 0, useThinking = false }) {
  const body = {
    model,
    messages,
    response_format: { type: "json_object" },
    thinking: { type: useThinking ? "enabled" : "disabled" },
    ...(useThinking ? { reasoning_effort: "high" } : {}),
    stream: false,
    max_tokens: maxTokens,
    temperature: 0.55
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const text = await response.text();
    if (!response.ok) {
      const safeText = text.replace(apiKey, "[REDACTED_API_KEY]").slice(0, 1200);
      if (response.status === 400 && /thinking|reasoning/i.test(safeText)) {
        const fallbackBodySupported = !useThinking;
        if (!fallbackBodySupported) return postDeepSeek({ apiUrl, apiKey, model, messages, maxTokens, attempt, useThinking: false });
      }
      if ((response.status === 429 || response.status >= 500) && attempt < 3) {
        await sleep(2500 * (attempt + 1));
        return postDeepSeek({ apiUrl, apiKey, model, messages, maxTokens, attempt: attempt + 1, useThinking });
      }
      throw new Error(`DeepSeek request failed with HTTP ${response.status}: ${safeText}`);
    }
    const parsed = JSON.parse(text);
    const content = parsed?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new Error("DeepSeek reply did not include message.content");
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

function sourceRiskText(question) {
  return [
    question.promptZhHans,
    ...(question.optionsZhHans ?? []),
    question.answer,
    ...(question.acceptedAnswers ?? []),
    question.explanationZhHans
  ].join("\n");
}

const forbiddenSourcePattern = /OCR|PDF|DOCX|docx|zip|截图|扫描|页码|第\s*\d+\s*页|教材原题|课本原题|试卷原题|原文|源文件|来源文件|如图|见图|上图|下图|(^|[，。；：、\s])图中/i;
const mathRedFlagPattern = /设计有误|选项中没有|没有最大|实际上没有|重新计算|但选项|但题目|假设图中|如果长是宽的两倍|答案不唯一|可能有误|题目误写|最终题目|重新生成|我将|根据输出要求|不能指出题目错误/i;

function normalizeQuestion(target, raw) {
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
    if (!optionsZhHans.includes(answer)) errors.push("multiple-choice answer does not match exactly one option");
  } else if (optionsZhHans.length) {
    errors.push(`${target.type} must not include options`);
  }
  const finalAcceptedAnswers = unique([answer, ...acceptedAnswers]);

  const override = manualQuestionOverrides[target.id] ?? {};
  const overriddenPromptZhHans = override.promptZhHans ?? promptZhHans;
  const overriddenOptionsZhHans = override.optionsZhHans ?? optionsZhHans;
  const overriddenAnswer = override.answer ?? answer;
  const overriddenAcceptedAnswers = override.acceptedAnswers ?? finalAcceptedAnswers;
  const overriddenExplanationZhHans = override.explanationZhHans ?? explanationZhHans;
  const mathRedFlag = mathRedFlagPattern.test([
    overriddenPromptZhHans,
    ...overriddenOptionsZhHans,
    overriddenAnswer,
    ...overriddenAcceptedAnswers,
    overriddenExplanationZhHans
  ].join("\n"));

  const normalized = {
    ...target,
    promptZhHans: overriddenPromptZhHans,
    optionsZhHans: target.type === "multiple-choice" ? overriddenOptionsZhHans : [],
    answer: overriddenAnswer,
    acceptedAnswers: unique([overriddenAnswer, ...overriddenAcceptedAnswers]),
    explanationZhHans: overriddenExplanationZhHans,
    sourceDistanceStatus: "passed-auto-source-scan",
    mathQaStatus: mathRedFlag ? "needs-review-auto-red-flag" : "pending-manual",
    terminologyQaStatus: "pending-manual",
    reviewNotes: mathRedFlag
      ? "Auto red-flag scan found wording that may indicate an under-specified or self-contradictory item; revise before use."
      : override.promptZhHans || override.answer || override.explanationZhHans
        ? "Manual S18 correction applied after auto red-flag review; still pending full manual sampling before app integration."
      : "Generated offline with DeepSeek V4 Pro from MAIS safe-RAG metadata only; manual S18 sampling required before app integration."
  };

  if (forbiddenSourcePattern.test(sourceRiskText(normalized))) {
    normalized.sourceDistanceStatus = "needs-review";
  }

  return { question: normalized, errors };
}

function validateBatch(targets, rawQuestions) {
  if (!Array.isArray(rawQuestions)) throw new Error("Provider JSON missing questions array");
  if (rawQuestions.length !== targets.length) throw new Error(`Expected ${targets.length} questions, got ${rawQuestions.length}`);
  const normalized = [];
  const errors = [];
  for (const target of targets) {
    const raw = rawQuestions.find((question) => question?.id === target.id);
    if (!raw) {
      errors.push(`Missing generated question for ${target.id}`);
      continue;
    }
    const result = normalizeQuestion(target, raw);
    normalized.push(result.question);
    errors.push(...result.errors.map((error) => `${target.id}: ${error}`));
  }
  if (errors.length) throw new Error(errors.join("; "));
  return normalized;
}

async function generateBatch({ targets, curriculumCards, patternCards, apiUrl, apiKey, model }) {
  const batchId = batchIdFor(targets);
  const cachePath = path.join(batchDir, `${batchId}.json`);
  if (fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    const normalized = validateBatch(targets, cached.questions);
    fs.writeFileSync(cachePath, `${JSON.stringify({ batchId, questions: normalized }, null, 2)}\n`);
    return normalized;
  }

  const evidenceCardIds = unique(targets.flatMap((target) => target.evidenceCardIds));
  const examPatternCardIds = unique(targets.flatMap((target) => target.examPatternCardIds));
  const relevantCurriculumCards = curriculumCards.filter((card) => evidenceCardIds.includes(card.id));
  const relevantPatternCards = patternCards.filter((card) => examPatternCardIds.includes(card.id));

  const messages = [
    { role: "system", content: systemPrompt() },
    {
      role: "user",
      content: userPrompt({
        targets,
        curriculumCards: relevantCurriculumCards,
        patternCards: relevantPatternCards
      })
    }
  ];

  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const content = await postDeepSeek({ apiUrl, apiKey, model, messages });
      const parsed = extractJsonObject(content);
      const normalized = validateBatch(targets, parsed.questions);
      fs.writeFileSync(cachePath, `${JSON.stringify({ batchId, questions: normalized }, null, 2)}\n`);
      return normalized;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(1200 * attempt);
    }
  }
  throw new Error(`Batch ${batchId} failed after retries: ${lastError?.message ?? lastError}`);
}

function csvEscape(value) {
  const text = (Array.isArray(value) ? value.join(" | ") : String(value ?? "")).replace(/\s*\r?\n\s*/g, " ");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function writeCsv(filePath, rows, columns) {
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))
  ];
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
  const grouped = countBy(questions, (question) => [
    question.grade,
    question.semester,
    question.unitTitle,
    question.conceptIds[0] ?? "",
    question.type,
    question.difficulty,
    question.evidenceCardIds.join("|"),
    question.examPatternCardIds.join("|")
  ].join("\t"));
  return Array.from(grouped.entries()).map(([key, count]) => {
    const [grade, semester, unitTitle, primaryConceptId, type, difficulty, evidenceCardIds, examPatternCardIds] = key.split("\t");
    return { grade, semester, unitTitle, primaryConceptId, type, difficulty, count, evidenceCardIds, examPatternCardIds };
  }).sort((a, b) => a.grade.localeCompare(b.grade) || a.semester.localeCompare(b.semester) || a.unitTitle.localeCompare(b.unitTitle));
}

function buildQaReport({ questions, plan, model, apiUrl, startedAt, finishedAt, sourceCards, patternCards }) {
  const total = questions.length;
  const gradeCounts = Object.fromEntries(countBy(questions, (question) => question.grade));
  const semesterCounts = Object.fromEntries(countBy(questions, (question) => `${question.grade}-${question.semester}`));
  const typeCounts = Object.fromEntries(countBy(questions, (question) => `${question.grade}-${question.semester}-${question.type}`));
  const difficultyCounts = Object.fromEntries(countBy(questions, (question) => `${question.grade}-${question.difficulty}`));
  const duplicateIds = Array.from(countBy(questions, (question) => question.id).entries()).filter(([, count]) => count > 1).map(([id]) => id);
  const sourceRiskRows = questions.filter((question) => question.sourceDistanceStatus !== "passed-auto-source-scan");
  const missingEvidenceRows = questions.filter((question) => !question.evidenceCardIds.length || !question.examPatternCardIds.length);
  const malformedMcRows = questions.filter((question) => question.type === "multiple-choice" && (question.optionsZhHans.length !== 4 || !question.optionsZhHans.includes(question.answer)));
  const missingAcceptedRows = questions.filter((question) => !question.acceptedAnswers.length);
  const missingExplanationRows = questions.filter((question) => !question.explanationZhHans.trim());
  const mathRedFlagRows = questions.filter((question) => question.mathQaStatus === "needs-review-auto-red-flag");
  const allChecksPass = (
    total === 600 &&
    grades.every((grade) => gradeCounts[grade] === 100) &&
    grades.every((grade) => semesters.every((semester) => semesterCounts[`${grade}-${semester}`] === 50)) &&
    duplicateIds.length === 0 &&
    missingEvidenceRows.length === 0 &&
    malformedMcRows.length === 0 &&
    missingAcceptedRows.length === 0 &&
    missingExplanationRows.length === 0
  );

  return `# Mainland PEP Primary Generated Bank V1 QA Report

- Date: 2026-05-23
- Session ID: S18
- Generator: DeepSeek API via project server-side \`LLM_API_KEY\` from local \`.env.local\`
- Model: \`${model}\`
- API host: \`${new URL(apiUrl).host}\`
- Started: ${startedAt}
- Finished: ${finishedAt}
- Verdict: ${allChecksPass ? "Auto structure/count/schema QA passed for the offline content package; manual S18 sampling still required before app integration." : "Needs structural remediation before use."}

## Scope

- Generated 600 original Simplified Chinese questions for Mainland PEP primary mathematics.
- Distribution target: 100 questions per P1-P6 grade, 50 per semester.
- This package is offline only. It does not edit \`data/questions.ts\`, \`types/index.ts\`, app UI, API routes, source archives, extracted text, OCR, screenshots, page notes, or embeddings.
- RAG evidence source: ${sourceCards.length} committed primary curriculum safe cards and ${patternCards.length} committed primary exam-pattern safe cards.

## DeepSeek Secret Hygiene

- The script read \`LLM_API_KEY\` locally and sent it only as an Authorization header.
- No API key, request header, raw prompt transcript, source file path, OCR text, page image, page number, or source locator is written into these artifacts.
- Batch cache files contain parsed generated questions only.

## Count Checks

- Total questions: ${total} / 600.
- Duplicate IDs: ${duplicateIds.length ? duplicateIds.join(", ") : "none"}.
- Missing evidence rows: ${missingEvidenceRows.length}.
- Source-distance risk rows: ${sourceRiskRows.length}.
- Math red-flag rows: ${mathRedFlagRows.length}.
- Malformed multiple-choice rows: ${malformedMcRows.length}.
- Missing accepted-answer rows: ${missingAcceptedRows.length}.
- Missing explanation rows: ${missingExplanationRows.length}.

## Grade Counts

${grades.map((grade) => `- ${grade}: ${gradeCounts[grade] ?? 0} / 100`).join("\n")}

## Semester Counts

${grades.flatMap((grade) => semesters.map((semester) => `- ${grade} ${semester}: ${semesterCounts[`${grade}-${semester}`] ?? 0} / 50`)).join("\n")}

## Type Quota Checks

${grades.flatMap((grade) => semesters.flatMap((semester) => types.map((type) => {
  const expected = typeQuotas[type];
  const actual = typeCounts[`${grade}-${semester}-${type}`] ?? 0;
  return `- ${grade} ${semester} ${type}: ${actual} / ${expected}`;
}))).join("\n")}

## Difficulty Quota Checks

${grades.flatMap((grade) => Object.entries(difficultyQuotas[grade].upper).map(([difficulty, upperCount]) => {
  const expected = upperCount + difficultyQuotas[grade].lower[difficulty];
  const actual = difficultyCounts[`${grade}-${difficulty}`] ?? 0;
  return `- ${grade} ${difficulty}: ${actual} / ${expected}`;
})).join("\n")}

## Manual QA Status

- \`mathQaStatus\`: kept as \`pending-manual\` for ordinary rows because full human-style solving of 600 items is a separate S18 review pass.
- Rows with obvious self-contradiction, under-specified visual references, answer-design caveats, or model-admitted design issues are marked \`needs-review-auto-red-flag\`.
- \`terminologyQaStatus\`: kept as \`pending-manual\`; the generation prompt requires Simplified Chinese Mainland mathematics terminology.
- Required next step before app integration: S18 sample at least 15 questions per grade for mathematical correctness, grade fit, source distance, and terminology.

## Files

- \`questions.jsonl\`
- \`questions.csv\`
- \`coverage-matrix.csv\`
- \`qa-report.md\`
- \`generate-with-deepseek.mjs\`
- \`batches/*.json\` resumable parsed batch cache
`;
}

async function main() {
  loadEnvFile(path.join(rootDir, ".env.local"));
  const apiKey = process.env.LLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  const apiUrl = process.env.LLM_API_URL?.trim() || "https://api.deepseek.com/chat/completions";
  const model = process.env.LLM_MODEL?.trim() || "deepseek-v4-pro";
  if (!apiKey) throw new Error("Missing LLM_API_KEY or OPENAI_API_KEY in local environment");
  if (!new URL(apiUrl).host.includes("api.deepseek.com")) {
    throw new Error(`Refusing to run non-DeepSeek endpoint for this task: ${new URL(apiUrl).host}`);
  }
  if (model !== "deepseek-v4-pro") {
    throw new Error(`Refusing to run non-DeepSeek V4 Pro model for this task: ${model}`);
  }

  fs.mkdirSync(batchDir, { recursive: true });
  const startedAt = new Date().toISOString();
  const curriculumCards = loadTsExport(path.join(rootDir, "data/rag/mainlandPepPrimary.ts"), "mainlandPepPrimaryRagCards");
  const patternCards = loadTsExport(path.join(rootDir, "data/rag/mainlandPepPrimaryExamPatterns.ts"), "mainlandPepPrimaryExamPatternCards");
  const plan = buildPlan(curriculumCards, patternCards);
  const batches = chunk(plan, 10);
  const questions = [];

  console.log(`DeepSeek generation starting: ${batches.length} batches, model=${model}, endpoint=${new URL(apiUrl).host}`);
  for (let index = 0; index < batches.length; index += 1) {
    const targets = batches[index];
    const batchId = batchIdFor(targets);
    console.log(`batch ${index + 1}/${batches.length}: ${batchId}`);
    const batchQuestions = await generateBatch({ targets, curriculumCards, patternCards, apiUrl, apiKey, model });
    questions.push(...batchQuestions);
  }

  questions.sort((a, b) => a.id.localeCompare(b.id));
  writeJsonl(path.join(__dirname, "questions.jsonl"), questions);
  writeCsv(path.join(__dirname, "questions.csv"), questions, [
    "id",
    "grade",
    "semester",
    "unitTitle",
    "conceptIds",
    "difficulty",
    "type",
    "promptZhHans",
    "optionsZhHans",
    "answer",
    "acceptedAnswers",
    "explanationZhHans",
    "evidenceCardIds",
    "examPatternCardIds",
    "materialKind",
    "assessmentFamily",
    "sourceDistanceStatus",
    "mathQaStatus",
    "terminologyQaStatus",
    "reviewNotes"
  ]);
  writeCsv(path.join(__dirname, "coverage-matrix.csv"), buildCoverageRows(questions), [
    "grade",
    "semester",
    "unitTitle",
    "primaryConceptId",
    "type",
    "difficulty",
    "count",
    "evidenceCardIds",
    "examPatternCardIds"
  ]);
  fs.writeFileSync(path.join(__dirname, "qa-report.md"), buildQaReport({
    questions,
    plan,
    model,
    apiUrl,
    startedAt,
    finishedAt: new Date().toISOString(),
    sourceCards: curriculumCards,
    patternCards
  }));
  console.log("DeepSeek generation complete: wrote questions.jsonl, questions.csv, coverage-matrix.csv, qa-report.md");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
