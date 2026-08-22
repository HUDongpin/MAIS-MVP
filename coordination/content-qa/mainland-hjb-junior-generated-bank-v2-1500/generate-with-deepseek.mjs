import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import { applyHjbJuniorCuratedCorrection } from "./curated-corrections.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const batchDir = path.join(__dirname, "batches");

const grades = ["S1", "S2", "S3"];
const questionTypes = ["multiple-choice", "fill-in", "short-answer"];
const difficulties = ["Foundation", "Core", "Exam", "Challenge"];
const gradeQuestionCount = 500;
const totalQuestionCount = 1500;
const batchSize = Number(process.env.HJB_JUNIOR_GENERATION_BATCH_SIZE ?? 5);

const typeQuotaByGrade = {
  "multiple-choice": 200,
  "fill-in": 175,
  "short-answer": 125
};

const difficultyQuotaByGrade = {
  S1: { Foundation: 165, Core: 260, Exam: 60, Challenge: 15 },
  S2: { Foundation: 90, Core: 285, Exam: 100, Challenge: 25 },
  S3: { Foundation: 40, Core: 210, Exam: 190, Challenge: 60 }
};

const scopeCountsByCardId = {
  "hjb-junior-s1-upper-polynomial-add-subtract": 50,
  "hjb-junior-s1-upper-polynomial-multiply-divide": 50,
  "hjb-junior-s1-upper-factorization": 50,
  "hjb-junior-s1-upper-algebraic-fractions": 50,
  "hjb-junior-s1-upper-figure-transformations": 50,
  "hjb-junior-s1-lower-linear-inequalities": 63,
  "hjb-junior-s1-lower-intersecting-parallel-lines": 62,
  "hjb-junior-s1-lower-triangles": 63,
  "hjb-junior-s1-lower-isosceles-triangles": 62,
  "hjb-junior-s2-upper-real-numbers": 62,
  "hjb-junior-s2-upper-quadratic-radicals": 63,
  "hjb-junior-s2-upper-quadratic-equations": 63,
  "hjb-junior-s2-upper-right-triangles": 62,
  "hjb-junior-s2-lower-quadrilaterals": 63,
  "hjb-junior-s2-lower-coordinate-plane": 62,
  "hjb-junior-s2-lower-linear-functions": 63,
  "hjb-junior-s2-lower-inverse-functions": 62,
  "hjb-junior-s3-upper-similar-triangles": 84,
  "hjb-junior-s3-upper-acute-trigonometry": 83,
  "hjb-junior-s3-upper-quadratic-functions": 83,
  "hjb-junior-s3-lower-circle-regular-polygons": 150,
  "hjb-junior-s3-lower-statistics-introduction": 100
};

const forbiddenSourcePattern =
  /OCR|PDF|DOCX|docx|zip|截图|扫描|页码|第\s*\d+\s*页|教材原题|课本原题|试卷原题|原题|原卷|原教材|原文|源文件|来源文件|来源于|改编自|摘自|如图|见图|上图|下图|右图|左图|(^|[，。；：、\s])图中/i;
const mathRedFlagPattern =
  /设计有误|题目有误|选项中没有|没有正确答案|无法确定|重新计算|重新审题|重新分析|重新检查|但选项|但题目|假设图中|答案不唯一|可能有误|题目误写|重新生成|我将|根据输出要求|缺少条件|缺少图|缺少信息|不够条件|上面算错|前面错误|矛盾|不合理|不可能|无解/i;

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

function balancedSequence(counts) {
  const remaining = new Map(Object.entries(counts));
  const result = [];
  while (Array.from(remaining.values()).some((count) => count > 0)) {
    const next = Array.from(remaining.entries())
      .filter(([, count]) => count > 0)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
    for (const [key, count] of next) {
      result.push(key);
      remaining.set(key, count - 1);
    }
  }
  return result;
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\s\-_/，、。,.()[\]（）:：;；·+]+/g, "");
}

function conceptOverlap(left = [], right = []) {
  const rightSet = new Set(right.map(normalize));
  return left.map(normalize).filter((value) => rightSet.has(value)).length;
}

function titleOverlap(unitTitle, unitTitles = []) {
  const title = normalize(unitTitle);
  return unitTitles.some((candidate) => {
    const normalized = normalize(candidate);
    return normalized.includes(title) || title.includes(normalized);
  });
}

function scorePatternCard(card, curriculumCard) {
  return (
    (card.grade === curriculumCard.grade ? 24 : 0) +
    (card.semester === curriculumCard.semester ? 18 : 0) +
    (titleOverlap(curriculumCard.unitTitle, card.unitTitles) ? 16 : 0) +
    conceptOverlap(curriculumCard.conceptIds, card.conceptIds) * 8
  );
}

function scoreExamPatternCard(card, curriculumCard) {
  return (
    (card.grades?.includes(curriculumCard.grade) ? 18 : 0) +
    (card.semesters?.includes(curriculumCard.semester) || card.semesters?.includes("full-year") ? 10 : 0) +
    (titleOverlap(curriculumCard.unitTitle, card.unitTitles) ? 12 : 0) +
    conceptOverlap(curriculumCard.conceptIds, card.conceptIds) * 7
  );
}

function pickCards(cards, scoreFn, curriculumCard, limit, fallbackFilter) {
  const scored = cards
    .map((card, index) => ({ card, index, score: scoreFn(card, curriculumCard) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index);
  const pool = scored.length
    ? scored
    : cards.filter(fallbackFilter).map((card, index) => ({ card, index, score: 0 }));
  return pool.slice(0, limit).map((entry) => entry.card);
}

function buildPlan({ curriculumCards, assessmentPatternCards, paperPatternCards, zhongkaoExamPatternCards }) {
  const cardById = new Map(curriculumCards.map((card) => [card.id, card]));
  const gradeIndexes = new Map(grades.map((grade) => [grade, 0]));
  const typePlans = Object.fromEntries(grades.map((grade) => [grade, balancedSequence(typeQuotaByGrade)]));
  const difficultyPlans = Object.fromEntries(grades.map((grade) => [grade, balancedSequence(difficultyQuotaByGrade[grade])]));
  const rows = [];

  for (const [cardId, count] of Object.entries(scopeCountsByCardId)) {
    const curriculumCard = cardById.get(cardId);
    if (!curriculumCard) throw new Error(`Missing HJB junior curriculum safe card ${cardId}`);
    const assessmentCards = pickCards(
      assessmentPatternCards,
      scorePatternCard,
      curriculumCard,
      2,
      (card) => card.grade === curriculumCard.grade && card.semester === curriculumCard.semester
    );
    const paperCards = pickCards(
      paperPatternCards,
      scorePatternCard,
      curriculumCard,
      2,
      (card) => card.grade === curriculumCard.grade && card.semester === curriculumCard.semester
    );
    const examCards = pickCards(
      zhongkaoExamPatternCards,
      scoreExamPatternCard,
      curriculumCard,
      2,
      (card) => card.grades?.includes(curriculumCard.grade)
    );
    const supportingAssessmentIds = assessmentCards.map((card) => card.id);
    const supportingPaperIds = paperCards.map((card) => card.id);
    const supportingExamIds = examCards.map((card) => card.id);

    if (!supportingAssessmentIds.length && !supportingPaperIds.length) {
      throw new Error(`Missing HJB junior assessment or paper pattern evidence for ${cardId}`);
    }
    if (!supportingExamIds.length) throw new Error(`Missing shared zhongkao pattern evidence for ${cardId}`);

    for (let localIndex = 0; localIndex < count; localIndex += 1) {
      const grade = curriculumCard.grade;
      const gradeIndex = gradeIndexes.get(grade) ?? 0;
      const id = `hjb-junior-ds-v2-${grade.toLowerCase()}-${String(gradeIndex + 1).padStart(3, "0")}`;
      rows.push({
        id,
        batch: "hjb-junior-v2",
        grade,
        semester: curriculumCard.semester,
        topicId: curriculumCard.id,
        unitTitle: curriculumCard.unitTitle,
        volume: curriculumCard.volume,
        conceptIds: unique(curriculumCard.conceptIds).slice(0, 10),
        competencyTags: unique(curriculumCard.competencyTags).slice(0, 6),
        skillTags: unique(curriculumCard.skillTags).slice(0, 8),
        misconceptionTags: unique(curriculumCard.misconceptionTags).slice(0, 6),
        difficulty: difficultyPlans[grade][gradeIndex],
        type: typePlans[grade][gradeIndex],
        evidenceCardIds: [curriculumCard.id],
        assessmentPatternCardIds: supportingAssessmentIds,
        paperPatternCardIds: supportingPaperIds,
        examPatternCardIds: supportingExamIds,
        sourceDistanceStatus: "pending-generation",
        mathQaStatus: "pending-generation",
        terminologyQaStatus: "pending-generation",
        manualQaStatus: "pending-generation",
        reviewNotes: "Generation target built from committed HJB junior safe-RAG metadata only."
      });
      gradeIndexes.set(grade, gradeIndex + 1);
    }
  }

  if (rows.length !== totalQuestionCount) throw new Error(`Plan row count ${rows.length}; expected ${totalQuestionCount}`);
  for (const grade of grades) {
    const count = rows.filter((row) => row.grade === grade).length;
    if (count !== gradeQuestionCount) throw new Error(`${grade} has ${count}; expected ${gradeQuestionCount}`);
  }
  return rows;
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

function batchIdFor(index) {
  return `batch-${String(index + 1).padStart(3, "0")}`;
}

function systemPrompt() {
  return [
    "你是 MAIS 的初中数学原创题生成与审核专家。",
    "任务是根据安全 RAG 摘要生成内地沪教版初中数学原创题。",
    "必须使用简体中文与内地初中数学术语。",
    "只能依据安全摘要、概念标签、能力标签、误区标签和题型模式生成全新题目。",
    "不得复制、改写、翻译、近似重构教材、练习册、试卷、答案、图表、页面、版式或解法原文。",
    "不得提到来源文件、PDF、DOCX、OCR、页码、截图、试卷原题、教材原题或任何 source locator。",
    "不要写“如图”“见图”“上图”“下图”“图中”。题目若需要几何或图像，必须用文字完整描述，使学生不依赖外部图片即可作答。",
    "几何、变换、坐标、函数图像类题必须用坐标、点名、边长、角度、方向、函数解析式或数据表完整描述；禁止把任何条件放在未提供的图、图像、表格或阴影区域里。",
    "不要使用“图中”“下图”“上图”“右图”“左图”“如图所示”“观察下面的图”“根据图形/图像/图表”等表达。",
    "每题必须唯一可解；选择题只有一个正确选项，answer 必须与某一个 optionsZhHans 字符串完全相同。",
    "解释必须直接推出 answer 字段，不能与答案或选项矛盾。",
    "题干必须包含具体表达式、数量、条件、点名、坐标、角度或情境；不得只写“下列计算正确的是”“下列说法正确的是”“下列因式分解正确的是”等泛化题干。",
    "题面、选项、答案和解析都不得出现这些审稿/纠错词：设计有误、选项中没有、没有正确答案、无法确定、重新计算、但选项、但题目、假设图中、答案不唯一、可能有误、题目误写、重新生成、我将、根据输出要求、缺少条件、缺少图、不够条件。",
    "解析控制在160个汉字以内，不要写模型思考、纠错、自我提醒、题目修改建议或生成过程。",
    "只输出 JSON object，不要 Markdown，不要代码块。"
  ].join("\n");
}

function userPrompt({ targets, curriculumCards, assessmentPatternCards, paperPatternCards, zhongkaoExamPatternCards }) {
  return JSON.stringify({
    task: `Generate exactly ${targets.length} original Shanghai Education Press junior-secondary math questions.`,
    outputContract: {
      root: "questions",
      perQuestionFields: ["id", "promptZhHans", "optionsZhHans", "answer", "acceptedAnswers", "explanationZhHans"],
      rules: [
        "Return exactly one JSON object: {\"questions\":[...items...]}",
        "Use each target id exactly once.",
        "Do not add or remove target ids.",
        "For multiple-choice, optionsZhHans must contain exactly 4 strings and answer must exactly equal one option.",
        "For fill-in and short-answer, optionsZhHans must be an empty array.",
        "acceptedAnswers must include the canonical answer.",
        "Use only the target grade, semester, unitTitle, volume, conceptIds, type, and difficulty.",
        "Use fresh numbers, mathematical objects, contexts, and distractors.",
        "The prompt must include concrete expressions, values, conditions, point names, coordinates, angles, or a short context; do not use a bare generic stem like 下列计算正确的是, 下列说法正确的是, or 下列因式分解正确的是.",
        "Do not copy examples, exercise wording, page language, diagram layout, or worked-solution phrasing.",
        "Do not use external diagrams; any graph, shape, table, or data set must be fully described in text.",
        "For geometry, transformation, coordinate, and function-graph targets, write all point coordinates, side lengths, angle measures, movement directions, or formulas in text.",
        "Never ask the learner to inspect an unstated picture, diagram, shaded region, graph image, or table image.",
        "Do not include reviewer language such as 设计有误, 重新计算, 重新生成, 选项中没有, 答案不唯一, 缺少条件, or 根据输出要求."
      ]
    },
    targets: targets.map((target) => ({
      id: target.id,
      grade: target.grade,
      semester: target.semester,
      unitTitle: target.unitTitle,
      volume: target.volume,
      conceptIds: target.conceptIds,
      competencyTags: target.competencyTags,
      skillTags: target.skillTags,
      misconceptionTags: target.misconceptionTags,
      difficulty: target.difficulty,
      type: target.type
    })),
    safeCurriculumEvidence: curriculumCards.map(compactCurriculumCard),
    safeHjbAssessmentPatternEvidence: assessmentPatternCards.map(compactPatternCard),
    safeHjbPaperPatternEvidence: paperPatternCards.map(compactPatternCard),
    safeSharedZhongkaoPatternEvidence: zhongkaoExamPatternCards.map(compactPatternCard)
  });
}

function messagesForTargets({ targets, curriculumCards, assessmentPatternCards, paperPatternCards, zhongkaoExamPatternCards, lastError }) {
  const curriculumIds = unique(targets.flatMap((target) => target.evidenceCardIds));
  const assessmentIds = unique(targets.flatMap((target) => target.assessmentPatternCardIds));
  const paperIds = unique(targets.flatMap((target) => target.paperPatternCardIds));
  const examIds = unique(targets.flatMap((target) => target.examPatternCardIds));
  const relevantCurriculumCards = curriculumCards.filter((card) => curriculumIds.includes(card.id));
  const relevantAssessmentCards = assessmentPatternCards.filter((card) => assessmentIds.includes(card.id));
  const relevantPaperCards = paperPatternCards.filter((card) => paperIds.includes(card.id));
  const relevantExamCards = zhongkaoExamPatternCards.filter((card) => examIds.includes(card.id));
  const messages = [
    { role: "system", content: systemPrompt() },
    {
      role: "user",
      content: userPrompt({
        targets,
        curriculumCards: relevantCurriculumCards,
        assessmentPatternCards: relevantAssessmentCards,
        paperPatternCards: relevantPaperCards,
        zhongkaoExamPatternCards: relevantExamCards
      })
    }
  ];
  return lastError ? [...messages, { role: "user", content: retryInstruction(lastError) }] : messages;
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

function retryInstruction(error) {
  const message = String(error?.message ?? error).slice(0, 1600);
  return [
    "Previous response failed the local validation gate.",
    `Validation failure: ${message}`,
    "Regenerate the full batch with the same target ids.",
    "If the failure says prompt duplicates an accepted row, do not reuse the prompt text shown in the failure. Create a more specific prompt with fresh expressions, values, conditions, point names, coordinates, angles, or context.",
    "Do not use bare generic stems such as 下列计算正确的是, 下列说法正确的是, 下列因式分解正确的是, 下列条件中能判定..., or 下列条件中能确定....",
    "Do not mention any missing or external picture/diagram/table/graph.",
    "Do not use 如图, 见图, 上图, 下图, 左图, 右图, 图中, 根据图形, 根据图像, 根据图表, 缺少图, or 缺少条件.",
    "If the validation failure mentions visual wording, do not use the Chinese character 图 anywhere in promptZhHans, optionsZhHans, answer, acceptedAnswers, or explanationZhHans.",
    "Avoid 图形, 图像, 图表, 作图, 画图, 示意图, 草图, and 坐标图. Use 三角形, 四边形, 函数关系, 坐标系, 数据, 已知, 点, 线段, 角, 边长, or 解析式 instead.",
    "Use complete textual conditions only: coordinates, point names, side lengths, angle measures, formulas, movement directions, or explicit data lists.",
    "Return only one JSON object with the required questions array."
  ].join("\n");
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function postDeepSeek({ apiUrl, apiKey, model, messages, attempt = 0 }) {
  const body = {
    model,
    messages,
    response_format: { type: "json_object" },
    thinking: { type: "disabled" },
    stream: false,
    max_tokens: 5000,
    temperature: 0.32
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);
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
      const safeText = text.replaceAll(apiKey, "[REDACTED_API_KEY]").slice(0, 1200);
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
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
    if (/fetch failed|network|ECONNRESET|ETIMEDOUT|aborted/i.test(message) && attempt < 4) {
      await sleep(5000 * (attempt + 1));
      return postDeepSeek({ apiUrl, apiKey, model, messages, attempt: attempt + 1 });
    }
    throw error;
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

function normalizeQuestion(target, raw, { usedPromptKeys, batchPromptKeys } = {}) {
  const correctedRaw = applyHjbJuniorCuratedCorrection(target.id, raw);
  const promptZhHans = typeof correctedRaw.promptZhHans === "string" ? correctedRaw.promptZhHans.trim() : "";
  const answer = typeof correctedRaw.answer === "string" ? correctedRaw.answer.trim() : "";
  const explanationZhHans = typeof correctedRaw.explanationZhHans === "string" ? correctedRaw.explanationZhHans.trim() : "";
  const optionsZhHans = Array.isArray(correctedRaw.optionsZhHans) ? correctedRaw.optionsZhHans.map((value) => String(value).trim()).filter(Boolean) : [];
  const acceptedAnswers = Array.isArray(correctedRaw.acceptedAnswers)
    ? correctedRaw.acceptedAnswers.map((value) => String(value).trim()).filter(Boolean)
    : [];
  const errors = [];

  if (correctedRaw.id !== target.id) errors.push(`id mismatch: expected ${target.id}, got ${correctedRaw.id}`);
  if (!promptZhHans) errors.push("missing promptZhHans");
  if (!answer) errors.push("missing answer");
  if (!explanationZhHans) errors.push("missing explanationZhHans");
  if (target.type === "multiple-choice") {
    if (optionsZhHans.length !== 4) errors.push(`multiple-choice options length ${optionsZhHans.length}`);
    if (new Set(optionsZhHans.map(normalizeIdentity)).size !== optionsZhHans.length) errors.push("multiple-choice options include duplicates");
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
    reviewNotes: "Generated offline with DeepSeek V4 Pro from MAIS HJB junior safe-RAG metadata only; candidate QA package only, not approved for public integration."
  };

  const promptKey = normalizeIdentity(promptZhHans);
  if (promptKey && usedPromptKeys?.has(promptKey)) errors.push(`prompt duplicates an already accepted row: ${promptZhHans}`);
  if (promptKey && batchPromptKeys?.has(promptKey)) errors.push(`prompt duplicates another row in this batch: ${promptZhHans}`);
  if (forbiddenSourcePattern.test(sourceRiskText(normalized))) errors.push("forbidden source or missing-visual wording detected");
  if (mathRedFlagPattern.test(sourceRiskText(normalized))) errors.push("math red-flag wording detected");
  if (!normalized.acceptedAnswers.length) errors.push("missing acceptedAnswers");
  return { question: normalized, promptKey, errors };
}

function validateBatch(targets, rawQuestions, { usedPromptKeys = new Set() } = {}) {
  if (!Array.isArray(rawQuestions)) throw new Error("Provider JSON missing questions array");
  if (rawQuestions.length !== targets.length) throw new Error(`Expected ${targets.length} questions, got ${rawQuestions.length}`);
  const normalized = [];
  const errors = [];
  const batchPromptKeys = new Set();
  for (const target of targets) {
    const raw = rawQuestions.find((question) => question?.id === target.id);
    if (!raw) {
      errors.push(`Missing generated question for ${target.id}`);
      continue;
    }
    const result = normalizeQuestion(target, raw, { usedPromptKeys, batchPromptKeys });
    normalized.push(result.question);
    if (result.promptKey) batchPromptKeys.add(result.promptKey);
    errors.push(...result.errors.map((error) => `${target.id}: ${error}`));
  }
  if (errors.length) throw new Error(errors.join("; "));
  return normalized;
}

async function generateBatch({
  targets,
  batchIndex,
  curriculumCards,
  assessmentPatternCards,
  paperPatternCards,
  zhongkaoExamPatternCards,
  apiUrl,
  apiKey,
  model,
  usedPromptKeys = new Set()
}) {
  const batchId = batchIdFor(batchIndex);
  const cachePath = path.join(batchDir, `${batchId}.json`);
  let lastError = null;
  if (fs.existsSync(cachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
      const normalized = validateBatch(targets, cached.questions, { usedPromptKeys });
      fs.writeFileSync(cachePath, `${JSON.stringify({ batchId, questions: normalized }, null, 2)}\n`);
      return normalized;
    } catch (error) {
      lastError = error;
      console.log(`${batchId} cached content failed current QA gate; regenerating. ${String(error?.message ?? error).slice(0, 240)}`);
    }
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const messages = messagesForTargets({ targets, curriculumCards, assessmentPatternCards, paperPatternCards, zhongkaoExamPatternCards, lastError });
      const content = await postDeepSeek({ apiUrl, apiKey, model, messages });
      const parsed = extractJsonObject(content);
      const normalized = validateBatch(targets, parsed.questions, { usedPromptKeys });
      fs.writeFileSync(cachePath, `${JSON.stringify({ batchId, questions: normalized }, null, 2)}\n`);
      return normalized;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(2000 * attempt);
    }
  }
  if (targets.length > 1) {
    console.log(`${batchId} falling back to single-target DeepSeek retries after batch validation failures.`);
    const normalized = [];
    const localUsedPromptKeys = new Set(usedPromptKeys);
    for (const target of targets) {
      let singleLastError = lastError;
      let singleQuestion = null;
      for (let attempt = 1; attempt <= 8; attempt += 1) {
        try {
          console.log(`${batchId} ${target.id} single-target attempt ${attempt}/8`);
          const messages = messagesForTargets({
            targets: [target],
            curriculumCards,
            assessmentPatternCards,
            paperPatternCards,
            zhongkaoExamPatternCards,
            lastError: singleLastError
          });
          const content = await postDeepSeek({ apiUrl, apiKey, model, messages });
          const parsed = extractJsonObject(content);
          [singleQuestion] = validateBatch([target], parsed.questions, { usedPromptKeys: localUsedPromptKeys });
          break;
        } catch (error) {
          singleLastError = error;
          if (attempt < 8) await sleep(2000 * Math.min(attempt, 4));
        }
      }
      if (!singleQuestion) {
        throw new Error(`${batchId} single-target fallback failed for ${target.id}: ${singleLastError?.message ?? singleLastError}`);
      }
      normalized.push(singleQuestion);
      localUsedPromptKeys.add(normalizeIdentity(singleQuestion.promptZhHans));
    }
    fs.writeFileSync(cachePath, `${JSON.stringify({ batchId, questions: normalized }, null, 2)}\n`);
    return normalized;
  }
  throw new Error(`${batchId} failed after retries: ${lastError?.message ?? lastError}`);
}

function csvEscape(value) {
  const text = (Array.isArray(value) ? value.join(" | ") : String(value ?? "")).replace(/\s*\r?\n\s*/g, " ");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
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

function buildQaReport({ questions, plan, model, apiUrl, startedAt, finishedAt, curriculumCards, assessmentPatternCards, paperPatternCards, zhongkaoExamPatternCards }) {
  const gradeCounts = Object.fromEntries(countBy(questions, (question) => question.grade));
  const typeCounts = Object.fromEntries(countBy(questions, (question) => `${question.grade}-${question.type}`));
  const difficultyCounts = Object.fromEntries(countBy(questions, (question) => `${question.grade}-${question.difficulty}`));
  const duplicateIds = Array.from(countBy(questions, (question) => question.id).entries()).filter(([, count]) => count > 1).map(([id]) => id);
  const duplicatePrompts = Array.from(countBy(questions, (question) => question.promptZhHans.replace(/\s+/g, "")).entries()).filter(([, count]) => count > 1).length;
  const sourceRiskRows = questions.filter((question) => question.sourceDistanceStatus !== "passed-auto-source-scan");
  const missingEvidenceRows = questions.filter(
    (question) =>
      !question.evidenceCardIds.length ||
      (!question.assessmentPatternCardIds.length && !question.paperPatternCardIds.length) ||
      !question.examPatternCardIds.length
  );
  const malformedMcRows = questions.filter((question) => question.type === "multiple-choice" && (question.optionsZhHans.length !== 4 || !question.optionsZhHans.includes(question.answer)));
  const missingAcceptedRows = questions.filter((question) => !question.acceptedAnswers.length);
  const missingExplanationRows = questions.filter((question) => !question.explanationZhHans.trim());
  const allChecksPass =
    questions.length === totalQuestionCount &&
    grades.every((grade) => gradeCounts[grade] === gradeQuestionCount) &&
    grades.every((grade) => questionTypes.every((type) => (typeCounts[`${grade}-${type}`] ?? 0) === typeQuotaByGrade[type])) &&
    grades.every((grade) => difficulties.every((difficulty) => (difficultyCounts[`${grade}-${difficulty}`] ?? 0) === difficultyQuotaByGrade[grade][difficulty])) &&
    duplicateIds.length === 0 &&
    duplicatePrompts === 0 &&
    missingEvidenceRows.length === 0 &&
    malformedMcRows.length === 0 &&
    missingAcceptedRows.length === 0 &&
    missingExplanationRows.length === 0 &&
    sourceRiskRows.length === 0;

  return `# Mainland HJB Junior Generated Bank V2 Candidate QA Report

- Date: 2026-05-24
- Session ID: S18
- Generator: DeepSeek API via project server-side \`LLM_API_KEY\` or \`OPENAI_API_KEY\` from local \`.env.local\`
- Model: \`${model}\`
- API host: \`${new URL(apiUrl).host}\`
- Started: ${startedAt}
- Finished: ${finishedAt}
- Verdict: ${allChecksPass ? "Auto structure/count/schema QA passed for the offline candidate package; S18 audit-solvability gate still required before any future integration decision." : "Needs remediation before use."}

## Scope

- Generated ${questions.length} original Simplified Chinese questions for Mainland Shanghai Education Press / HuJiaoBan junior-secondary mathematics.
- Distribution target: 500 questions per S1, S2, and S3 grade.
- This package is candidate-only. It must not be connected to public practice, lessons, APIs, or production data in this task.
- RAG evidence source: ${curriculumCards.length} committed HJB junior textbook safe cards, ${assessmentPatternCards.length} committed HJB junior assessment-pattern cards, ${paperPatternCards.length} committed HJB junior paper-pattern cards, and ${zhongkaoExamPatternCards.length} shared Mainland junior zhongkao pattern cards.
- Coverage plan rows: ${plan.length}.

## Secret Hygiene

- The script read the provider key locally and sent it only as an Authorization header.
- No API key, request header, raw prompt transcript, source file path, OCR text, page image, page number, or source locator is written into these artifacts.
- Batch cache files contain parsed generated questions only.

## Count Checks

- Total questions: ${questions.length} / ${totalQuestionCount}.
- Duplicate IDs: ${duplicateIds.length ? duplicateIds.join(", ") : "none"}.
- Duplicate exact prompts: ${duplicatePrompts}.
- Missing evidence rows: ${missingEvidenceRows.length}.
- Source-distance risk rows: ${sourceRiskRows.length}.
- Malformed multiple-choice rows: ${malformedMcRows.length}.
- Missing accepted-answer rows: ${missingAcceptedRows.length}.
- Missing explanation rows: ${missingExplanationRows.length}.

## Grade Counts

${grades.map((grade) => `- ${grade}: ${gradeCounts[grade] ?? 0} / ${gradeQuestionCount}`).join("\n")}

## Type Quota Checks

${grades.flatMap((grade) => questionTypes.map((type) => `- ${grade} ${type}: ${typeCounts[`${grade}-${type}`] ?? 0} / ${typeQuotaByGrade[type]}`)).join("\n")}

## Difficulty Quota Checks

${grades.flatMap((grade) => difficulties.map((difficulty) => `- ${grade} ${difficulty}: ${difficultyCounts[`${grade}-${difficulty}`] ?? 0} / ${difficultyQuotaByGrade[grade][difficulty]}`)).join("\n")}

## Manual QA Status

- \`mathQaStatus\`, \`terminologyQaStatus\`, and \`manualQaStatus\` remain \`pending-s18-review\` after generation; this task does not approve public integration.
- Rows with obvious self-contradiction, missing visual references, source-reference wording, or malformed answer design are rejected during generation retries and rechecked by the audit.
- Required next step for candidate QA: run \`node coordination/content-qa/mainland-hjb-junior-generated-bank-v2-1500/audit-solvability.mjs\`.
`;
}

async function main() {
  loadEnvFile(path.join(rootDir, ".env.local"));
  const apiKey = process.env.LLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  const apiUrl = process.env.LLM_API_URL?.trim() || "https://api.deepseek.com/chat/completions";
  const model = process.env.LLM_MODEL?.trim() || "deepseek-v4-pro";
  const startedAt = new Date().toISOString();

  if (!apiKey) throw new Error("Missing LLM_API_KEY or OPENAI_API_KEY in local environment");
  if (!new URL(apiUrl).host.includes("api.deepseek.com")) throw new Error(`Refusing non-DeepSeek endpoint for this task: ${new URL(apiUrl).host}`);
  if (model !== "deepseek-v4-pro") throw new Error(`Refusing non-DeepSeek V4 Pro model for this task: ${model}`);
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 20) throw new Error(`Invalid HJB_JUNIOR_GENERATION_BATCH_SIZE: ${batchSize}`);

  const curriculumCards = loadTsExport(path.join(rootDir, "data/rag/mainlandHjbJunior.ts"), "mainlandHjbJuniorRagCards");
  const assessmentPatternCards = loadTsExport(path.join(rootDir, "data/rag/mainlandHjbJuniorAssessmentPatterns.ts"), "mainlandHjbJuniorAssessmentPatternCards");
  const paperPatternCards = loadTsExport(path.join(rootDir, "data/rag/mainlandHjbJuniorPaperPatterns.ts"), "mainlandHjbJuniorPaperPatternCards");
  const zhongkaoExamPatternCards = loadTsExport(path.join(rootDir, "data/rag/mainlandJuniorZhongkaoExamPatterns.ts"), "mainlandJuniorZhongkaoExamPatternCards");
  const plan = buildPlan({ curriculumCards, assessmentPatternCards, paperPatternCards, zhongkaoExamPatternCards });
  const questions = [];
  const usedPromptKeys = new Set();

  fs.mkdirSync(batchDir, { recursive: true });
  const batches = chunk(plan, batchSize);
  console.log(`DeepSeek generation starting: ${batches.length} batches, model=${model}, endpoint=${new URL(apiUrl).host}`);
  for (let index = 0; index < batches.length; index += 1) {
    const targets = batches[index];
    console.log(`batch ${index + 1}/${batches.length}: ${batchIdFor(index)} ${targets[0].grade} ${targets[0].unitTitle}`);
    const batchQuestions = await generateBatch({
      targets,
      batchIndex: index,
      curriculumCards,
      assessmentPatternCards,
      paperPatternCards,
      zhongkaoExamPatternCards,
      apiUrl,
      apiKey,
      model,
      usedPromptKeys
    });
    questions.push(...batchQuestions);
    for (const question of batchQuestions) {
      const promptKey = normalizeIdentity(question.promptZhHans);
      if (promptKey) usedPromptKeys.add(promptKey);
    }
  }

  questions.sort((left, right) => left.id.localeCompare(right.id));
  writeJsonl(path.join(__dirname, "questions.jsonl"), questions);
  writeCsv(path.join(__dirname, "questions.csv"), questions, [
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
  writeCsv(path.join(__dirname, "coverage-matrix.csv"), buildCoverageRows(questions), [
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
  fs.writeFileSync(path.join(__dirname, "question-pack.json"), `${JSON.stringify({ questions }, null, 2)}\n`);
  fs.writeFileSync(
    path.join(__dirname, "qa-report.md"),
    buildQaReport({
      questions,
      plan,
      model,
      apiUrl,
      startedAt,
      finishedAt: new Date().toISOString(),
      curriculumCards,
      assessmentPatternCards,
      paperPatternCards,
      zhongkaoExamPatternCards
    })
  );
  console.log("Generation complete: wrote questions.jsonl, questions.csv, question-pack.json, coverage-matrix.csv, qa-report.md");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
