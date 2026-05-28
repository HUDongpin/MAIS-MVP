import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const batchDir = path.join(__dirname, "batches");
const v1CandidateDir = path.resolve(__dirname, "../mainland-bnu-primary-generated-bank-v1-1500");

const grades = ["P1", "P2", "P3", "P4", "P5", "P6"];
const questionTypes = ["multiple-choice", "fill-in", "short-answer"];
const difficulties = ["Foundation", "Core", "Exam", "Challenge"];
const gradeQuestionCount = 250;
const totalQuestionCount = 1500;
const batchSize = Number(process.env.BNU_PRIMARY_GENERATION_BATCH_SIZE ?? 10);
const generationConcurrency = Number(process.env.BNU_PRIMARY_GENERATION_CONCURRENCY ?? 4);

const typeQuotaByGrade = {
  "multiple-choice": 100,
  "fill-in": 90,
  "short-answer": 60
};

const difficultyQuotaByGrade = {
  P1: { Foundation: 138, Core: 87, Exam: 5, Challenge: 20 },
  P2: { Foundation: 113, Core: 100, Exam: 7, Challenge: 30 },
  P3: { Foundation: 88, Core: 112, Exam: 12, Challenge: 38 },
  P4: { Foundation: 88, Core: 112, Exam: 12, Challenge: 38 },
  P5: { Foundation: 63, Core: 125, Exam: 17, Challenge: 45 },
  P6: { Foundation: 63, Core: 125, Exam: 17, Challenge: 45 }
};

const forbiddenSourcePattern =
  /OCR|PDF|DOCX|docx|zip|截图|扫描|页码|第\s*\d+\s*页|教材原题|课本原题|试卷原题|原题|原卷|原文|源文件|来源文件|改编自|摘自|如图|见图|上图|下图|右图|左图|(^|[，。；：、\s])图中/i;
const mathRedFlagPattern =
  /设计有误|选项中没有|没有正确答案|无法确定|重新计算|但选项|但题目|假设图中|答案不唯一|可能有误|题目误写|重新生成|我将|根据输出要求|缺少条件|缺少图|不够条件/i;
const genericStemPattern =
  /^(下面哪句(?:话)?是正确的[？?]?$|下面哪种说法是正确的[？?]?$|下列说法(?:中)?，?正确的是(?:哪一项)?[？?]?$|下列说法(?:中)?，?正确的是\s*[（(]\s*[）)]。?$|下面说法正确的是\s*[（(]\s*[）)]。?$)/;
const omittedVisualConditionPattern =
  /从(?:正面|前面|左面|右面|上面|后面)看(?:到的)?是\s*[，。；;,.]|看(?:到的)?是\s*[，。；;,.]/;
const diagonalTranslationPattern =
  /相当于向.*方向平移.*格|(?:东南|东北|西南|西北)\s*√/;

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

function normalizeIdentity(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[！-～]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ")
    .replace(/\s+/g, "")
    .replace(/−/g, "-")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/[，、；;：:。！？?!“”"‘’']/g, "");
}

function readQuestionsFromJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function readQuestionsFromJson(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return Array.isArray(parsed?.questions) ? parsed.questions : [];
  } catch {
    return [];
  }
}

function loadPriorPromptKeys() {
  const questions = [
    ...readQuestionsFromJsonl(path.join(v1CandidateDir, "questions.jsonl")),
    ...readQuestionsFromJson(path.join(v1CandidateDir, "question-pack.json"))
  ];
  const v1BatchDir = path.join(v1CandidateDir, "batches");
  if (fs.existsSync(v1BatchDir)) {
    for (const entry of fs.readdirSync(v1BatchDir).sort()) {
      if (/^batch-\d+\.json$/.test(entry)) {
        questions.push(...readQuestionsFromJson(path.join(v1BatchDir, entry)));
      }
    }
  }
  return new Set(questions.map((question) => normalizeIdentity(question.promptZhHans)).filter(Boolean));
}

function loadCachedPromptKeys(excludeBatchId) {
  const keys = new Set();
  if (!fs.existsSync(batchDir)) return keys;
  for (const entry of fs.readdirSync(batchDir).sort()) {
    if (!/^batch-\d+\.json$/.test(entry)) continue;
    if (entry === `${excludeBatchId}.json`) continue;
    for (const question of readQuestionsFromJson(path.join(batchDir, entry))) {
      const key = normalizeIdentity(question.promptZhHans);
      if (key) keys.add(key);
    }
  }
  return keys;
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

function volumeForCard(card) {
  if (card.volume) return card.volume;
  const gradeNumber = String(card.grade ?? "").replace(/^P/, "");
  const semesterLabel = card.semester === "upper" ? "上册" : "下册";
  return gradeNumber ? `${gradeNumber}年级${semesterLabel}` : card.semester;
}

function buildScopeCountsByCardId(curriculumCards) {
  const counts = {};
  for (const grade of grades) {
    const gradeCards = curriculumCards.filter((card) => card.grade === grade);
    if (!gradeCards.length) throw new Error(`Missing BNU primary curriculum safe cards for ${grade}`);
    const base = Math.floor(gradeQuestionCount / gradeCards.length);
    const remainder = gradeQuestionCount % gradeCards.length;
    gradeCards.forEach((card, index) => {
      counts[card.id] = base + (index < remainder ? 1 : 0);
    });
  }
  return counts;
}

function buildPlan({ curriculumCards, assessmentPatternCards }) {
  const cardById = new Map(curriculumCards.map((card) => [card.id, card]));
  const gradeIndexes = new Map(grades.map((grade) => [grade, 0]));
  const typePlans = Object.fromEntries(grades.map((grade) => [grade, balancedSequence(typeQuotaByGrade)]));
  const difficultyPlans = Object.fromEntries(grades.map((grade) => [grade, balancedSequence(difficultyQuotaByGrade[grade])]));
  const scopeCountsByCardId = buildScopeCountsByCardId(curriculumCards);
  const rows = [];

  for (const [cardId, count] of Object.entries(scopeCountsByCardId)) {
    const curriculumCard = cardById.get(cardId);
    if (!curriculumCard) throw new Error(`Missing BNU primary curriculum safe card ${cardId}`);
    const assessmentCards = pickCards(
      assessmentPatternCards,
      scorePatternCard,
      curriculumCard,
      2,
      (card) => card.grade === curriculumCard.grade && card.semester === curriculumCard.semester
    );
    const supportingAssessmentIds = assessmentCards.map((card) => card.id);

    if (!supportingAssessmentIds.length) {
      throw new Error(`Missing BNU primary assessment pattern evidence for ${cardId}`);
    }

    for (let localIndex = 0; localIndex < count; localIndex += 1) {
      const grade = curriculumCard.grade;
      const gradeIndex = gradeIndexes.get(grade) ?? 0;
      const id = `bnu-primary-ds-v2-${grade.toLowerCase()}-${String(gradeIndex + 1).padStart(3, "0")}`;
      rows.push({
        id,
        batch: "bnu-primary-v2",
        grade,
        semester: curriculumCard.semester,
        topicId: curriculumCard.id,
        unitTitle: curriculumCard.unitTitle,
        volume: volumeForCard(curriculumCard),
        conceptIds: unique(curriculumCard.conceptIds).slice(0, 10),
        competencyTags: unique(curriculumCard.competencyTags).slice(0, 6),
        skillTags: unique(curriculumCard.skillTags).slice(0, 8),
        misconceptionTags: unique(curriculumCard.misconceptionTags).slice(0, 6),
        difficulty: difficultyPlans[grade][gradeIndex],
        type: typePlans[grade][gradeIndex],
        evidenceCardIds: [curriculumCard.id],
        assessmentPatternCardIds: supportingAssessmentIds,
        paperPatternCardIds: [],
        sourceDistanceStatus: "pending-generation",
        mathQaStatus: "pending-generation",
        terminologyQaStatus: "pending-generation",
        manualQaStatus: "pending-generation",
        reviewNotes: "V2 generation target built from committed BNU primary safe-RAG metadata only."
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
    volume: volumeForCard(card),
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
    "你是 MAIS 的小学数学原创题生成与审核专家。",
    "任务是根据安全 RAG 摘要生成内地北师大版小学数学原创题。",
    "必须使用简体中文与内地小学数学术语，语言要适合对应年级学生。",
    "只能依据安全摘要、概念标签、能力标签、误区标签和题型模式生成全新题目。",
    "不得复制、改写、翻译、近似重构教材、练习册、试卷、答案、图表、页面、版式或解法原文。",
    "不得提到来源文件、PDF、DOCX、OCR、页码、截图、试卷原题、教材原题或任何 source locator。",
    "不要写“如图”“见图”“上图”“下图”“图中”。题目若需要几何或图像，必须用文字完整描述，使学生不依赖外部图片即可作答。",
    "几何、统计、方向位置、图形、单位换算和应用题必须用文字、数值、点名、边长、角度、方向或数据表完整描述；禁止把任何条件放在未提供的图、图像、表格或阴影区域里。",
    "不要使用“图中”“下图”“上图”“右图”“左图”“如图所示”“观察下面的图”“根据图形/图像/图表”等表达。",
    "不要在解析里写“原题”“原卷”“原文”，可改写为“题目中的算式”“这个条件”或“已知条件”。",
    "每题必须唯一可解；选择题只有一个正确选项，answer 必须与某一个 optionsZhHans 字符串完全相同。",
    "选择题生成后必须逐项验算：正确选项只能有一个，其他三个选项必须明确错误，不能有等值算式、重复表述或同义正确项。",
    "解释必须直接推出 answer 字段，不能与答案或选项矛盾。",
    "answer 字段只能写最终答案；不要把错因分析、多个互相矛盾的判断或非最终结果写入 answer。",
    "不要设计依赖生活常识争议的题目，例如按蔬菜颜色、物品形状习惯、可变摆放方式判断唯一答案。",
    "不要设计让学生判断题目、答案、解法或选项是否有误的审稿式任务；若使用错题情境，只能问正确结果或正确步骤，不要求回答题目有误、选项缺失或答案不唯一。",
    "选择题优先设计为直接求值、求量、找算式或判断一个明确数学性质，并给出4个互斥选项；尽量不要使用泛泛的“下面哪种说法正确”题干。",
    "方向、位置、观察物体、立体图形、图形运动题必须给出完整文字条件；若涉及小正方体搭法，必须用层数、行列坐标、每层摆放数量或明确可计算的结构描述，不能让学生根据未给出的正面/上面/左面视图推断。",
    "观察物体题不得使用空白视图、汉字形状视图或“请画出”；必须写清每层、每行、每列或每个位置的小正方体数量。",
    "方向位置题不要询问两个由同一观测点给出的非共线地点之间的相对方向；若问A在B的什么方向，必须改用明确坐标或东西南北共线条件。",
    "图形运动题不要把向右、向下等平移合成为斜向和根号距离；应询问最终位置、坐标变化或分别向哪个水平方向/竖直方向移动几格。",
    "小数的意义和加减法单元只用小数意义、比较、改写、加法和减法，不设计小数乘法或小数除法。",
    "统计和数据选择题必须问一个明确可计算的量或结论，例如总数、平均数、最多/最少、相差多少；不要设计多个陈述中选择“说法正确”的题。",
    "P1-P3 避免负坐标、复杂小数、超前方程或需要中学几何的推理；P4-P5 避免平方根、三角函数、向量距离、非整数书本人数等超纲或不合理结果。",
    "题面、选项、答案和解析都不得出现这些审稿/纠错词：设计有误、选项中没有、没有正确答案、无法确定、重新计算、但选项、但题目、假设图中、答案不唯一、可能有误、题目误写、重新生成、我将、根据输出要求、缺少条件、缺少图、不够条件。",
    "解析控制在160个汉字以内，不要写模型思考、纠错、自我提醒、题目修改建议或生成过程。",
    "只输出 JSON object，不要 Markdown，不要代码块。"
  ].join("\n");
}

function userPrompt({ targets, curriculumCards, assessmentPatternCards }) {
  return JSON.stringify({
    task: `Generate exactly ${targets.length} original Beijing Normal University Press primary math questions.`,
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
        "This is a v2 candidate package: do not reuse v1 prompts, values, surface contexts, or solution paths.",
        "Use the target id as a uniqueness seed: vary names, numbers, objects, and the asked quantity so prompts are not repeated across targets.",
        "The stem must include topic-specific mathematical content; avoid bare generic stems such as 下面哪句话是正确的, 下面哪种说法是正确的, 下列说法正确的是.",
        "Do not copy examples, exercise wording, page language, diagram layout, or worked-solution phrasing.",
        "Do not use external diagrams; any graph, shape, table, or data set must be fully described in text.",
        "For geometry, measurement, direction-position, statistics, ratio, equation, circle, cylinder, cone, or data targets, write all quantities, point names, side lengths, angle measures, movement directions, formulas, or data lists in text.",
        "For observation of objects or cube constructions, provide exact cube positions or layer descriptions; do not ask students to infer from omitted front/top/left view diagrams.",
        "For multiple-choice questions, verify all four options: exactly one option must be true, and no distractor may be mathematically equivalent to the answer.",
        "Avoid contexts whose answer depends on convention or outside life knowledge rather than the stated math conditions.",
        "Avoid reviewer/error-audit tasks about whether a question, option set, answer, or solution is wrong; if using a mistake context, ask only for the corrected mathematical result or corrected step.",
        "For multiple-choice, prefer a direct computed result, expression, unit, or unique property with four mutually exclusive options; avoid broad statement-selection stems.",
        "For observation-of-solids tasks, never use blank view placeholders, Chinese-character silhouettes, or drawing requests; describe layers, rows, columns, and cube counts explicitly.",
        "For direction-position tasks, do not ask the relative direction between two non-collinear locations that were only described from the same observation point; use coordinates or a collinear/opposite setup.",
        "For translation/motion tasks, do not combine horizontal and vertical moves into a diagonal/root-distance answer; ask for final position or separate horizontal and vertical movements.",
        "For decimal meaning/add-subtract targets, do not use decimal multiplication or division.",
        "For statistics/data multiple-choice targets, ask for one specific computed quantity or conclusion, such as total, average, maximum/minimum, or difference; do not use broad true-statement selection.",
        "Keep grade fit strict: no negative coordinates in P3 grid tasks, no trigonometry or diagonal-vector distance in P5 direction tasks, and no fractional people/books/items when the context requires whole counts.",
        "Before returning JSON, check answer, acceptedAnswers, and explanationZhHans agree exactly.",
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
    safeBnuPrimaryAssessmentPatternEvidence: assessmentPatternCards.map(compactPatternCard)
  });
}

function messagesForTargets({ targets, curriculumCards, assessmentPatternCards, lastError }) {
  const curriculumIds = unique(targets.flatMap((target) => target.evidenceCardIds));
  const assessmentIds = unique(targets.flatMap((target) => target.assessmentPatternCardIds));
  const relevantCurriculumCards = curriculumCards.filter((card) => curriculumIds.includes(card.id));
  const relevantAssessmentCards = assessmentPatternCards.filter((card) => assessmentIds.includes(card.id));
  const messages = [
    { role: "system", content: systemPrompt() },
    {
      role: "user",
      content: userPrompt({
        targets,
        curriculumCards: relevantCurriculumCards,
        assessmentPatternCards: relevantAssessmentCards
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
  return [
    "Previous response failed the local validation gate.",
    "Regenerate the full batch with the same target ids. Do not echo, discuss, or quote the previous validation failure.",
    "Do not mention any missing or external picture/diagram/table/graph.",
    "Do not use 如图, 见图, 上图, 下图, 左图, 右图, 图中, 根据图形, 根据图像, 根据图表, 缺少图, or 缺少条件.",
    "Do not write reviewer/error-audit tasks about whether a question, answer, solution, or option set is wrong; write an ordinary solvable math question instead.",
    "Avoid broad statement-selection multiple-choice stems; ask for a specific result or property with four mutually exclusive options.",
    "Do not use blank visual placeholders after 从正面看是, 从上面看是, or 从左面看是; describe cube positions in words.",
    "Do not ask for diagonal/root-distance translation results such as 东南√34; ask for final coordinates or separate horizontal/vertical moves.",
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
    max_tokens: 8000,
    temperature: 0.45
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
    if (new Set(optionsZhHans).size !== optionsZhHans.length) errors.push("multiple-choice options include duplicates");
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
    reviewNotes: "Generated offline as BNU primary V2 with DeepSeek V4 Pro from MAIS BNU primary safe-RAG metadata only; candidate QA package only, not approved for public integration."
  };

  if (forbiddenSourcePattern.test(sourceRiskText(normalized))) errors.push("forbidden source or missing-visual wording detected");
  if (omittedVisualConditionPattern.test(sourceRiskText(normalized))) errors.push("blank observation-view condition detected");
  if (diagonalTranslationPattern.test(sourceRiskText(normalized))) errors.push("diagonal translation/root-distance wording detected");
  if (mathRedFlagPattern.test(sourceRiskText(normalized))) errors.push("math red-flag wording detected");
  if (genericStemPattern.test(normalized.promptZhHans.trim())) errors.push("overly generic prompt stem detected");
  if (!normalized.acceptedAnswers.length) errors.push("missing acceptedAnswers");
  return { question: normalized, errors };
}

function validateBatch(targets, rawQuestions, existingPromptKeys = new Set()) {
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
    const result = normalizeQuestion(target, raw);
    normalized.push(result.question);
    errors.push(...result.errors.map((error) => `${target.id}: ${error}`));
    const promptKey = normalizeIdentity(result.question.promptZhHans);
    if (existingPromptKeys.has(promptKey)) errors.push(`${target.id}: prompt duplicates a BNU primary v1 or earlier package question`);
    if (batchPromptKeys.has(promptKey)) errors.push(`${target.id}: prompt duplicates another question in this batch`);
    batchPromptKeys.add(promptKey);
  }
  if (errors.length) throw new Error(errors.join("; "));
  return normalized;
}

async function generateBatch({
  targets,
  batchIndex,
  curriculumCards,
  assessmentPatternCards,
  apiUrl,
  apiKey,
  model,
  existingPromptKeys = new Set()
}) {
  const batchId = batchIdFor(batchIndex);
  const cachePath = path.join(batchDir, `${batchId}.json`);
  const packagePromptKeys = new Set([...existingPromptKeys, ...loadCachedPromptKeys(batchId)]);
  if (fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    const normalized = validateBatch(targets, cached.questions, packagePromptKeys);
    fs.writeFileSync(cachePath, `${JSON.stringify({ batchId, questions: normalized }, null, 2)}\n`);
    return normalized;
  }

  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const messages = messagesForTargets({ targets, curriculumCards, assessmentPatternCards, lastError });
      const content = await postDeepSeek({ apiUrl, apiKey, model, messages });
      const parsed = extractJsonObject(content);
      const normalized = validateBatch(targets, parsed.questions, packagePromptKeys);
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
    const fallbackPromptKeys = new Set(packagePromptKeys);
    for (const target of targets) {
      let singleLastError = lastError;
      let singleQuestion = null;
      for (let attempt = 1; attempt <= 4; attempt += 1) {
        try {
          const messages = messagesForTargets({
            targets: [target],
            curriculumCards,
            assessmentPatternCards,
            lastError: singleLastError
          });
          const content = await postDeepSeek({ apiUrl, apiKey, model, messages });
          const parsed = extractJsonObject(content);
          [singleQuestion] = validateBatch([target], parsed.questions, fallbackPromptKeys);
          break;
        } catch (error) {
          singleLastError = error;
          if (attempt < 4) await sleep(2000 * attempt);
        }
      }
      if (!singleQuestion) {
        throw new Error(`${batchId} single-target fallback failed for ${target.id}: ${singleLastError?.message ?? singleLastError}`);
      }
      normalized.push(singleQuestion);
      fallbackPromptKeys.add(normalizeIdentity(singleQuestion.promptZhHans));
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
      question.paperPatternCardIds.join("|")
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
        paperPatternCardIds
      ] = key.split("\t");
      return { grade, semester, topicId, unitTitle, type, difficulty, count, evidenceCardIds, assessmentPatternCardIds, paperPatternCardIds };
    })
    .sort((left, right) => left.grade.localeCompare(right.grade) || left.semester.localeCompare(right.semester) || left.topicId.localeCompare(right.topicId));
}

function buildQaReport({ questions, plan, model, apiUrl, startedAt, finishedAt, curriculumCards, assessmentPatternCards, previousPromptKeys }) {
  const gradeCounts = Object.fromEntries(countBy(questions, (question) => question.grade));
  const typeCounts = Object.fromEntries(countBy(questions, (question) => `${question.grade}-${question.type}`));
  const difficultyCounts = Object.fromEntries(countBy(questions, (question) => `${question.grade}-${question.difficulty}`));
  const duplicateIds = Array.from(countBy(questions, (question) => question.id).entries()).filter(([, count]) => count > 1).map(([id]) => id);
  const duplicatePrompts = Array.from(countBy(questions, (question) => normalizeIdentity(question.promptZhHans)).entries()).filter(([, count]) => count > 1).length;
  const v1PromptDuplicates = questions.filter((question) => previousPromptKeys.has(normalizeIdentity(question.promptZhHans))).length;
  const sourceRiskRows = questions.filter((question) => question.sourceDistanceStatus !== "passed-auto-source-scan");
  const missingEvidenceRows = questions.filter(
    (question) =>
      !question.evidenceCardIds.length ||
      !question.assessmentPatternCardIds.length
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
    v1PromptDuplicates === 0 &&
    missingEvidenceRows.length === 0 &&
    malformedMcRows.length === 0 &&
    missingAcceptedRows.length === 0 &&
    missingExplanationRows.length === 0 &&
    sourceRiskRows.length === 0;

  return `# Mainland BNU Primary Generated Bank V2 Candidate QA Report

- Date: 2026-05-26
- Session ID: S18
- Generator: DeepSeek API via project server-side \`LLM_API_KEY\` or \`OPENAI_API_KEY\` from local \`.env.local\`
- Model: \`${model}\`
- API host: \`${new URL(apiUrl).host}\`
- Started: ${startedAt}
- Finished: ${finishedAt}
- Verdict: ${allChecksPass ? "Auto structure/count/schema QA passed for the offline v2 candidate package; S18 audit-solvability gate still required before any future integration decision." : "Needs remediation before use."}

## Scope

- Generated ${questions.length} original Simplified Chinese questions for Mainland Beijing Normal University Press primary mathematics.
- Distribution target: 250 questions per P1, P2, P3, P4, P5, and P6.
- This package is candidate-only. It must not be connected to public practice, lessons, APIs, or production data in this task.
- RAG evidence source: ${curriculumCards.length} committed BNU primary textbook safe cards and ${assessmentPatternCards.length} committed BNU primary assessment-pattern cards.
- This package does not reference junior zhongkao evidence and does not require a primary paper-pattern layer.
- V1 prompt reference keys loaded: ${previousPromptKeys.size}.
- Coverage plan rows: ${plan.length}.

## Secret Hygiene

- The script read the provider key locally and sent it only as an Authorization header.
- No API key, request header, raw prompt transcript, source file path, OCR text, page image, page number, or source locator is written into these artifacts.
- Batch cache files contain parsed generated questions only.

## Count Checks

- Total questions: ${questions.length} / ${totalQuestionCount}.
- Duplicate IDs: ${duplicateIds.length ? duplicateIds.join(", ") : "none"}.
- Duplicate exact prompts: ${duplicatePrompts}.
- Exact prompt duplicates against v1 reference set: ${v1PromptDuplicates}.
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
- Required next step for candidate QA: run \`node coordination/content-qa/mainland-bnu-primary-generated-bank-v2-1500/audit-solvability.mjs\`.
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
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 20) throw new Error(`Invalid BNU_PRIMARY_GENERATION_BATCH_SIZE: ${batchSize}`);
  if (!Number.isInteger(generationConcurrency) || generationConcurrency < 1 || generationConcurrency > 8) {
    throw new Error(`Invalid BNU_PRIMARY_GENERATION_CONCURRENCY: ${generationConcurrency}`);
  }

  const curriculumCards = loadTsExport(path.join(rootDir, "data/rag/mainlandBnuPrimary.ts"), "mainlandBnuPrimaryRagCards");
  const assessmentPatternCards = loadTsExport(path.join(rootDir, "data/rag/mainlandBnuPrimaryAssessmentPatterns.ts"), "mainlandBnuPrimaryAssessmentPatternCards");
  const plan = buildPlan({ curriculumCards, assessmentPatternCards });
  const previousPromptKeys = loadPriorPromptKeys();
  const batchResults = new Array();

  fs.mkdirSync(batchDir, { recursive: true });
  const batches = chunk(plan, batchSize);
  const workerCount = Math.min(generationConcurrency, batches.length);
  let nextBatchIndex = 0;

  console.log(`DeepSeek generation starting: ${batches.length} batches, model=${model}, endpoint=${new URL(apiUrl).host}, concurrency=${workerCount}`);
  async function runWorker(workerIndex) {
    while (nextBatchIndex < batches.length) {
      const index = nextBatchIndex;
      nextBatchIndex += 1;
      const targets = batches[index];
      console.log(`worker ${workerIndex + 1}/${workerCount} batch ${index + 1}/${batches.length}: ${batchIdFor(index)} ${targets[0].grade} ${targets[0].unitTitle}`);
      batchResults[index] = await generateBatch({
        targets,
        batchIndex: index,
        curriculumCards,
        assessmentPatternCards,
        apiUrl,
        apiKey,
        model,
        existingPromptKeys: previousPromptKeys
      });
    }
  }

  await Promise.all(Array.from({ length: workerCount }, (_, index) => runWorker(index)));
  const questions = batchResults.flat();

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
    "paperPatternCardIds"
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
      previousPromptKeys
    })
  );
  console.log("Generation complete: wrote questions.jsonl, questions.csv, question-pack.json, coverage-matrix.csv, qa-report.md");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
