import { mainlandPepHighTopics } from "./mainlandPepHighTopics";
import { mainlandPepHighRagCards } from "./rag/mainlandPepHigh";
import { mainlandPepHighExamPatternCards } from "./rag/mainlandPepHighExamPatterns";
import type { Difficulty, GradeId, LocalizedText, Question, QuestionType } from "@/types";

const math = (expression: string) => `\\(${expression}\\)`;

type MainlandPepHighQuestionFamily =
  | "sets"
  | "quadratic"
  | "functions"
  | "exp-log"
  | "trigonometry"
  | "plane-vectors"
  | "complex"
  | "solid-geometry"
  | "statistics"
  | "probability"
  | "space-vectors"
  | "lines-circles"
  | "conics"
  | "sequences"
  | "derivatives"
  | "counting"
  | "random-variables"
  | "bivariate-data"
  | "exam-synthesis";

type MainlandPepHighQuestionSpec = {
  grade: Extract<GradeId, "S4" | "S5" | "S6">;
  topicId: string;
  chapter: string;
  family: MainlandPepHighQuestionFamily;
  difficulty?: Difficulty;
};

type QuestionDraft = {
  prompt: LocalizedText;
  answer: string;
  acceptedAnswers?: string[];
  explanation: LocalizedText;
  options?: LocalizedText[];
  difficulty?: Difficulty;
};

type MainlandPepHighQuestionBatch = "seed-v1" | "rag-v2" | "rag-v3" | "rag-v4";
type MainlandPepHighQuestionSourceDistanceStatus = "passed" | "needs-review";
type TypeQuota = Record<Exclude<QuestionType, "graph">, number>;

export type MainlandPepHighQuestionGenerationMetadata = {
  batch: MainlandPepHighQuestionBatch;
  evidenceCardIds: string[];
  examPatternCardIds: string[];
  sourceDistanceStatus: MainlandPepHighQuestionSourceDistanceStatus;
};

const specs: MainlandPepHighQuestionSpec[] = [
  { grade: "S4", topicId: "pep-high-s4-sets-logic", chapter: "集合与常用逻辑用语", family: "sets", difficulty: "Low" },
  { grade: "S4", topicId: "pep-high-s4-quadratic-inequalities", chapter: "一元二次函数、方程和不等式", family: "quadratic" },
  { grade: "S4", topicId: "pep-high-s4-function-properties", chapter: "函数的概念与性质", family: "functions" },
  { grade: "S4", topicId: "pep-high-s4-exp-log", chapter: "指数函数与对数函数", family: "exp-log" },
  { grade: "S4", topicId: "pep-high-s4-trigonometry", chapter: "三角函数", family: "trigonometry" },
  { grade: "S4", topicId: "pep-high-s4-plane-vectors", chapter: "平面向量及其应用", family: "plane-vectors" },
  { grade: "S4", topicId: "pep-high-s4-complex-numbers", chapter: "复数", family: "complex" },
  { grade: "S4", topicId: "pep-high-s4-solid-geometry-intro", chapter: "立体几何初步", family: "solid-geometry" },
  { grade: "S4", topicId: "pep-high-s4-statistics", chapter: "统计", family: "statistics" },
  { grade: "S4", topicId: "pep-high-s4-probability", chapter: "概率", family: "probability" },
  { grade: "S5", topicId: "pep-high-s5-space-vectors", chapter: "空间向量与立体几何", family: "space-vectors" },
  { grade: "S5", topicId: "pep-high-s5-lines-circles", chapter: "直线和圆的方程", family: "lines-circles" },
  { grade: "S5", topicId: "pep-high-s5-conics", chapter: "圆锥曲线的方程", family: "conics" },
  { grade: "S5", topicId: "pep-high-s5-sequences", chapter: "数列", family: "sequences" },
  { grade: "S5", topicId: "pep-high-s5-derivatives", chapter: "一元函数的导数及其应用", family: "derivatives" },
  { grade: "S6", topicId: "pep-high-s6-counting", chapter: "计数原理", family: "counting" },
  { grade: "S6", topicId: "pep-high-s6-random-variables", chapter: "随机变量及其分布", family: "random-variables" },
  { grade: "S6", topicId: "pep-high-s6-bivariate-data", chapter: "成对数据的统计分析", family: "bivariate-data" },
  { grade: "S6", topicId: "pep-high-s6-derivative-synthesis", chapter: "一元函数的导数及其应用", family: "derivatives", difficulty: "High" },
  { grade: "S6", topicId: "pep-high-s6-analytic-geometry-synthesis", chapter: "圆锥曲线的方程", family: "conics", difficulty: "High" },
  { grade: "S6", topicId: "pep-high-s6-probability-statistics-synthesis", chapter: "概率", family: "probability", difficulty: "High" },
  { grade: "S6", topicId: "pep-high-s6-exam-practice", chapter: "综合复习与跨章节建模", family: "exam-synthesis", difficulty: "High" }
];

const topicById = new Map(mainlandPepHighTopics.map((topic) => [topic.id, topic]));
const specByTopicId = new Map(specs.map((spec) => [spec.topicId, spec]));
const ragDifficultyByChapter = new Map(mainlandPepHighRagCards.map((card) => [card.chapter, card.difficultyBand]));
const examPatternChapters = new Set(mainlandPepHighExamPatternCards.map((card) => card.chapter));

const familyConceptHints: Record<MainlandPepHighQuestionFamily, string[]> = {
  sets: ["sets", "set-operations", "logic-conditions", "quantifiers"],
  quadratic: ["quadratic-functions", "quadratic-equations", "quadratic-inequalities", "basic-inequality"],
  functions: ["function-definition", "domain-range", "monotonicity", "parity", "function-applications"],
  "exp-log": ["exponential-functions", "logarithmic-functions", "inverse-functions", "function-modeling"],
  trigonometry: ["unit-circle", "trigonometric-functions", "trigonometric-graphs", "trigonometric-identities"],
  "plane-vectors": ["plane-vectors", "vector-operations", "dot-product", "vector-applications"],
  complex: ["complex-numbers", "complex-operations", "complex-plane", "complex-roots"],
  "solid-geometry": ["solid-geometry", "parallel-perpendicular", "surface-volume", "space-imagination"],
  statistics: ["statistics", "sampling", "data-distribution", "mean-variance"],
  probability: ["probability-foundations", "random-events", "probability-operations"],
  "space-vectors": ["space-vectors", "solid-geometry", "line-plane-angle", "distance-in-space", "parallel-perpendicular"],
  "lines-circles": ["line-equations", "circle-equations", "analytic-geometry", "line-circle-position"],
  conics: ["ellipse", "hyperbola", "parabola-conic", "line-conic-intersection", "analytic-geometry"],
  sequences: ["arithmetic-sequences", "geometric-sequences", "recursion", "summation"],
  derivatives: ["derivatives", "monotonicity-extrema", "optimization", "function-inequalities"],
  counting: ["counting-principles", "permutations-combinations", "binomial-theorem"],
  "random-variables": ["random-variables", "discrete-distribution", "expectation-variance", "conditional-probability"],
  "bivariate-data": ["bivariate-data", "correlation", "linear-regression", "statistical-inference"],
  "exam-synthesis": [
    "derivatives",
    "analytic-geometry",
    "probability-foundations",
    "random-variables",
    "function-inequalities",
    "trigonometric-functions",
    "sequences"
  ]
};

const examSynthesisEvidenceCardIds = [
  "pep-high-derivatives-applications",
  "pep-high-conic-sections",
  "pep-high-probability",
  "pep-high-sequences",
  "pep-high-trigonometric-functions"
];

const itemTypeTagLabels: Record<string, string> = {
  "概念辨析": "concept classification",
  "证明推理": "proof-style reasoning",
  "计算求解": "calculation fluency",
  "函数图像": "graph interpretation",
  "综合压轴题": "exam synthesis",
  "建模应用": "mathematical modeling",
  "统计概率情境题": "probability and statistics modeling"
};

const ragV2ScenarioLabels = [
  { en: "diagnostic", zh: "诊断" },
  { en: "calculation", zh: "计算" },
  { en: "modeling", zh: "建模" },
  { en: "reasoning", zh: "推理" },
  { en: "review", zh: "复习" }
];

const ragV3ScenarioLabels = [
  {
    en: "concept-check",
    zh: "概念辨析",
    guidanceEn: "Identify the definition that controls the calculation.",
    guidanceZh: "先确定本题使用的定义，再进行计算。"
  },
  {
    en: "parameter discussion",
    zh: "参数讨论",
    guidanceEn: "Identify which given quantity determines the requested value.",
    guidanceZh: "先找出哪个已知量决定所求值。"
  },
  {
    en: "condition check",
    zh: "条件核对",
    guidanceEn: "Check the result against every condition in the prompt.",
    guidanceZh: "作答后把结果与题目中的每个条件核对。"
  },
  {
    en: "representation link",
    zh: "表示关联",
    guidanceEn: "Connect the formula with the quantity it represents.",
    guidanceZh: "把公式与它表示的数量对应起来。"
  },
  {
    en: "modeling context",
    zh: "建模情境",
    guidanceEn: "Translate the given conditions into a mathematical relation.",
    guidanceZh: "先把题目条件转化为数学关系。"
  },
  {
    en: "misconception diagnosis",
    zh: "误区诊断",
    guidanceEn: "Check signs, order, and the requested quantity before submitting.",
    guidanceZh: "提交前检查符号、顺序和所求量。"
  },
  {
    en: "synthesis step",
    zh: "综合拆步",
    guidanceEn: "Separate the setup from the final calculation.",
    guidanceZh: "把列式步骤与最终计算分开完成。"
  }
];

const ragV4StudentFrames = [
  { en: "Check the given conditions first.", zh: "先核对题目条件。" },
  { en: "Use the most direct representation for the question.", zh: "选用最直接的表示方式。" },
  { en: "Compare the quantities before computing.", zh: "先比较相关数量，再计算。" },
  { en: "Translate the statement into a formula, then answer.", zh: "先把题意转化为式子，再作答。" },
  { en: "Identify the target value before applying a formula.", zh: "先明确所求量，再套用公式。" },
  { en: "Keep the domain or counting rule in mind.", zh: "注意定义域或计数规则。" },
  { en: "Read the notation carefully and simplify step by step.", zh: "看清符号，逐步化简。" },
  { en: "Decide which known relationship is useful here.", zh: "判断本题需要使用哪个关系式。" },
  { en: "Focus on the invariant in the expression.", zh: "抓住式子中的不变量。" },
  { en: "Organize the information before doing arithmetic.", zh: "先整理信息，再进行运算。" },
  { en: "Separate the setup step from the final calculation.", zh: "把建模步骤和最终计算分开处理。" },
  { en: "Check whether order, sign, or direction matters.", zh: "注意顺序、符号或方向是否影响结果。" }
];

const ragV4ReasoningFrames = [
  { en: "Give the final value after one clear line of reasoning.", zh: "用一条清晰思路得到最终结果。" },
  { en: "A short calculation is enough if each condition is used.", zh: "只要条件用全，简短计算即可。" },
  { en: "Explain which part of the expression determines the answer.", zh: "说明式子中哪一部分决定答案。" },
  { en: "Avoid adding assumptions that are not in the prompt.", zh: "不要额外加入题目没有给出的假设。" },
  { en: "Use exact values rather than decimal guesses.", zh: "优先使用精确值，不用猜测小数。" },
  { en: "State the requested quantity, not an intermediate result.", zh: "回答所求量，不停留在中间结果。" },
  { en: "Use the standard formula only after matching its conditions.", zh: "确认条件匹配后再使用标准公式。" },
  { en: "Keep equivalent forms consistent with the question.", zh: "让等价形式与题目要求保持一致。" },
  { en: "Check the answer against the original notation.", zh: "把答案代回原符号核对。" },
  { en: "Choose the simpler route when two methods are possible.", zh: "若有两种方法，选择更简洁的一种。" }
];

const ragV4ExplanationClosers = [
  { en: "This also checks that the requested value, not a related one, has been found.", zh: "这样也确认求到的是题目要求的量，而不是相关量。" },
  { en: "The final value follows after matching the condition with the correct formula.", zh: "把条件与对应公式匹配后，即可得到最终值。" },
  { en: "No extra case is introduced, so the answer is determined by the given data.", zh: "未引入额外情形，因此答案由题目数据唯一确定。" },
  { en: "The computation uses all necessary conditions in the prompt.", zh: "计算过程已使用题目中的必要条件。" },
  { en: "The result is written in the same form requested by the question.", zh: "结果按题目要求的形式写出。" },
  { en: "A quick substitution or count confirms the answer.", zh: "再代入或计数核对，可确认答案。" }
];

const difficultyByBand: Record<string, Difficulty> = {
  foundation: "Low",
  core: "Medium",
  exam: "High",
  challenge: "High"
};

const typePrefixes: Record<Exclude<QuestionType, "graph">, string> = {
  "multiple-choice": "mc",
  "fill-in": "fi",
  "short-answer": "sa"
};

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

function signed(value: number) {
  return value >= 0 ? `+${formatNumber(value)}` : formatNumber(value);
}

function shiftedX(center: number) {
  return center >= 0 ? `x-${formatNumber(center)}` : `x+${formatNumber(Math.abs(center))}`;
}

function linearExpression(coefficient: number, constant: number) {
  return `${formatNumber(coefficient)}x${signed(constant)}`;
}

function quadraticExpression(a: number, b: number, c: number) {
  return `${formatNumber(a)}x^2${signed(b)}x${signed(c)}`;
}

function complexExpression(real: number, imaginary: number) {
  return `${formatNumber(real)}${signed(imaginary)}i`;
}

function localized(value: string): LocalizedText {
  return { en: value, zh: value };
}

function localizedOptions(values: string[]): LocalizedText[] {
  return values.map(localized);
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function hasConceptOverlap(conceptIds: string[], hints: string[]) {
  return conceptIds.some((conceptId) => hints.includes(conceptId));
}

function ragCardsForSpec(spec: MainlandPepHighQuestionSpec) {
  const hints = familyConceptHints[spec.family];
  const exactChapterCards = mainlandPepHighRagCards.filter((card) => card.chapter === spec.chapter);
  const conceptCards = mainlandPepHighRagCards.filter((card) => hasConceptOverlap(card.conceptIds, hints));
  const synthesisCards =
    spec.family === "exam-synthesis"
      ? examSynthesisEvidenceCardIds
          .map((cardId) => mainlandPepHighRagCards.find((card) => card.id === cardId))
          .filter((card): card is (typeof mainlandPepHighRagCards)[number] => Boolean(card))
      : [];
  const cards = uniqueById([...exactChapterCards, ...conceptCards, ...synthesisCards]);
  return cards.length ? cards.slice(0, 3) : mainlandPepHighRagCards.slice(0, 1);
}

function examPatternCardsForSpec(spec: MainlandPepHighQuestionSpec) {
  const hints = familyConceptHints[spec.family];
  const exactChapterCards = mainlandPepHighExamPatternCards.filter((card) => card.chapter === spec.chapter);
  const conceptCards = mainlandPepHighExamPatternCards.filter((card) => hasConceptOverlap(card.conceptIds, hints));
  const synthesisCards =
    spec.family === "exam-synthesis"
      ? mainlandPepHighExamPatternCards.filter((card) => card.difficultyBand === "exam" || card.difficultyBand === "challenge")
      : [];
  return uniqueById([...exactChapterCards, ...conceptCards, ...synthesisCards]).slice(0, 2);
}

function metadataForSpec(
  spec: MainlandPepHighQuestionSpec,
  batch: MainlandPepHighQuestionBatch
): MainlandPepHighQuestionGenerationMetadata {
  return {
    batch,
    evidenceCardIds: ragCardsForSpec(spec).map((card) => card.id),
    examPatternCardIds: batch === "seed-v1" ? [] : examPatternCardsForSpec(spec).map((card) => card.id),
    sourceDistanceStatus: "passed"
  };
}

function appendSentence(value: string, sentence: string) {
  return `${value}${/[.!?。！？]$/.test(value.trim()) ? " " : " "}${sentence}`;
}

function withRagV2Guidance(draft: QuestionDraft, spec: MainlandPepHighQuestionSpec, contextIndex: number): QuestionDraft {
  const primaryCard = ragCardsForSpec(spec)[0];
  const itemTypeTag = primaryCard?.itemTypeTags[0] ?? "计算求解";
  const itemTypeLabel = itemTypeTagLabels[itemTypeTag] ?? "mathematical reasoning";
  const misconception = primaryCard?.misconceptionTags[0] ?? "missing the condition check";
  const scenario = ragV2ScenarioLabels[contextIndex % ragV2ScenarioLabels.length];
  const promptNumber = contextIndex + 1;

  return {
    ...draft,
    prompt: {
      en: `${scenario.en[0].toUpperCase()}${scenario.en.slice(1)} practice ${promptNumber}: ${draft.prompt.en}`,
      zh: `${scenario.zh}练习 ${promptNumber}：${draft.prompt.zh}`
    },
    explanation: {
      en: appendSentence(
        draft.explanation.en,
        `This practice targets ${itemTypeLabel}; check the conditions to avoid ${misconception}.`
      ),
      zh: appendSentence(
        draft.explanation.zh,
        `本题同时训练${itemTypeTag}，解完后要回到题设条件复核。`
      )
    }
  };
}

function withRagV3Guidance(
  draft: QuestionDraft,
  spec: MainlandPepHighQuestionSpec,
  contextIndex: number,
  type: Exclude<QuestionType, "graph">
): QuestionDraft {
  const cards = ragCardsForSpec(spec);
  const primaryCard = cards[0];
  const mode = ragV3ScenarioLabels[(contextIndex + spec.topicId.length) % ragV3ScenarioLabels.length];
  const typeLabels: Record<Exclude<QuestionType, "graph">, { en: string; zh: string }> = {
    "multiple-choice": { en: "multiple-choice", zh: "选择题" },
    "fill-in": { en: "fill-in", zh: "填空题" },
    "short-answer": { en: "short-answer", zh: "解答题" }
  };
  const typeLabel = typeLabels[type];
  const itemTypeTag = primaryCard?.itemTypeTags[contextIndex % Math.max(primaryCard.itemTypeTags.length, 1)] ?? "计算求解";
  const itemTypeLabel = itemTypeTagLabels[itemTypeTag] ?? "mathematical reasoning";
  const misconception = primaryCard?.misconceptionTags[contextIndex % Math.max(primaryCard.misconceptionTags.length, 1)] ?? "missing a condition check";
  const answerSentenceEn =
    type === "multiple-choice"
      ? `The unique matching option is ${draft.answer}.`
      : `The final answer is ${draft.answer}.`;
  const answerSentenceZh =
    type === "multiple-choice"
      ? `唯一匹配选项为 ${draft.answer}。`
      : `最终答案为 ${draft.answer}。`;

  return {
    ...draft,
    prompt: {
      en: `${mode.en[0].toUpperCase()}${mode.en.slice(1)} ${typeLabel.en} practice ${contextIndex + 1}: ${mode.guidanceEn} ${draft.prompt.en}`,
      zh: `${mode.zh}${typeLabel.zh}练习 ${contextIndex + 1}：${mode.guidanceZh}${draft.prompt.zh}`
    },
    explanation: {
      en: appendSentence(
        appendSentence(draft.explanation.en, answerSentenceEn),
        `This practice targets ${itemTypeLabel}; check for ${misconception}.`
      ),
      zh: appendSentence(
        appendSentence(draft.explanation.zh, answerSentenceZh),
        `本题训练${itemTypeTag}，解完后请复核题设条件和运算步骤。`
      )
    }
  };
}

function withRagV4Guidance(
  draft: QuestionDraft,
  spec: MainlandPepHighQuestionSpec,
  contextIndex: number,
  type: Exclude<QuestionType, "graph">
): QuestionDraft {
  const responseFrame: Record<Exclude<QuestionType, "graph">, { en: string; zh: string }> = {
    "multiple-choice": { en: "Choose the only matching option.", zh: "选择唯一匹配的选项。" },
    "fill-in": { en: "Write the requested value.", zh: "写出题目要求的值。" },
    "short-answer": { en: "Write only the requested final result.", zh: "只写题目要求的最终结果。" }
  };
  const promptFrame =
    ragV4StudentFrames[(contextIndex + spec.chapter.length + type.length) % ragV4StudentFrames.length];
  const reasoningFrame =
    ragV4ReasoningFrames[(contextIndex * 2 + spec.topicId.length + typePrefixes[type].length) % ragV4ReasoningFrames.length];
  const scoredReasoningFrame = reasoningFrame === ragV4ReasoningFrames[2]
    ? { en: "", zh: "" }
    : reasoningFrame;
  const explanationCloser =
    ragV4ExplanationClosers[(contextIndex + spec.topicId.length + type.length) % ragV4ExplanationClosers.length];
  const answerSentenceEn =
    type === "multiple-choice"
      ? `The unique matching option is ${draft.answer}.`
      : `The final answer is ${draft.answer}.`;
  const answerSentenceZh =
    type === "multiple-choice"
      ? `唯一匹配选项为 ${draft.answer}。`
      : `最终答案为 ${draft.answer}。`;
  const promptGuidanceEn = type === "short-answer"
    ? `${spec.grade} short-answer practice ${contextIndex + 1}: ${promptFrame.en} ${responseFrame[type].en}`
    : [promptFrame.en, responseFrame[type].en, scoredReasoningFrame.en].filter(Boolean).join(" ");
  const promptGuidanceZh = type === "short-answer"
    ? `${spec.grade}解答题练习 ${contextIndex + 1}：${promptFrame.zh}${responseFrame[type].zh}`
    : [promptFrame.zh, responseFrame[type].zh, scoredReasoningFrame.zh].filter(Boolean).join("");

  return {
    ...draft,
    prompt: {
      en: `${promptGuidanceEn} ${draft.prompt.en}`,
      zh: `${promptGuidanceZh}${draft.prompt.zh}`
    },
    explanation: {
      en: appendSentence(
        appendSentence(draft.explanation.en, answerSentenceEn),
        explanationCloser.en
      ),
      zh: appendSentence(
        appendSentence(draft.explanation.zh, answerSentenceZh),
        explanationCloser.zh
      )
    }
  };
}

function numericOptions(answer: number, step = 1) {
  const values = [answer, answer + step, answer - step, answer + 2 * step, answer - 2 * step];
  return localizedOptions(Array.from(new Set(values.map(formatNumber))).slice(0, 4));
}

function fraction(numerator: number, denominator: number) {
  const divisor = gcd(Math.abs(numerator), Math.abs(denominator));
  return `${numerator / divisor}/${denominator / divisor}`;
}

function exactRational(numerator: number, denominator: number) {
  const sign = denominator < 0 ? -1 : 1;
  const divisor = gcd(Math.abs(numerator), Math.abs(denominator));
  const reducedNumerator = (sign * numerator) / divisor;
  const reducedDenominator = Math.abs(denominator) / divisor;
  if (reducedDenominator === 1) return String(reducedNumerator);

  let remainingDenominator = reducedDenominator;
  while (remainingDenominator % 2 === 0) remainingDenominator /= 2;
  while (remainingDenominator % 5 === 0) remainingDenominator /= 5;
  if (remainingDenominator === 1) {
    return String(Number((reducedNumerator / reducedDenominator).toFixed(12)));
  }

  return `${reducedNumerator}/${reducedDenominator}`;
}

function uniqueAliases(values: string[]) {
  return Array.from(new Set(values));
}

function minimumValueAliases(answer: string) {
  return uniqueAliases([
    `minimum value is ${answer}`,
    `the minimum value is ${answer}`,
    `minimum=${answer}`,
    `最小值为${answer}`,
    `最小值是${answer}`
  ]);
}

function probabilityAnswerAliases(rawProbability: string, reducedProbability: string) {
  const labeledValues = uniqueAliases([rawProbability, reducedProbability]).flatMap((value) => [
    `P=${value}`,
    `P(A)=${value}`,
    `probability is ${value}`,
    `the probability is ${value}`,
    `概率为${value}`,
    `概率是${value}`
  ]);
  const reductionChains = rawProbability === reducedProbability
    ? []
    : [
        `${rawProbability}=${reducedProbability}`,
        `P=${rawProbability}=${reducedProbability}`,
        `P(A)=${rawProbability}=${reducedProbability}`,
        `probability is ${rawProbability}=${reducedProbability}`,
        `the probability is ${rawProbability}=${reducedProbability}`,
        `概率为${rawProbability}=${reducedProbability}`,
        `概率是${rawProbability}=${reducedProbability}`
      ];
  return uniqueAliases([...labeledValues, ...reductionChains]);
}

function fractionOptions(answer: string, numerator: number, denominator: number) {
  const distractors = [
    fraction(Math.max(1, numerator + 1), denominator),
    fraction(numerator, denominator + 1),
    fraction(Math.max(1, denominator - numerator), denominator),
    fraction(Math.max(1, numerator + 2), denominator + 2),
    fraction(Math.max(1, numerator + 1), denominator + 3)
  ];
  return localizedOptions(Array.from(new Set([answer, ...distractors])).slice(0, 4));
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function arithmeticSet(limit: number, divisor: number) {
  return Array.from({ length: limit }, (_, index) => index + 1).filter((value) => value % divisor === 0);
}

function draftSets(type: Exclude<QuestionType, "graph">, n: number): QuestionDraft {
  const limit = 18 + (n % 5);
  const a = 2 + (n % 3);
  const b = 3 + (n % 4);
  const setA = arithmeticSet(limit, a);
  const setB = arithmeticSet(limit, b);
  const intersection = setA.filter((value) => setB.includes(value));
  const union = Array.from(new Set([...setA, ...setB]));
  const answer = type === "fill-in" ? union.length : type === "short-answer" ? limit - union.length : intersection.length;
  const setAText = `\\{${setA.join(",")}\\}`;
  const setBText = `\\{${setB.join(",")}\\}`;
  const intersectionText = `\\{${intersection.join(",")}\\}`;
  const unionText = `\\{${union.join(",")}\\}`;
  const isSelfIntersection = type === "multiple-choice" && a === b;
  const taskEn =
    type === "fill-in"
      ? `Find ${math("|A\\cup B|")}`
      : type === "short-answer"
        ? `Find the number of elements outside ${math("A\\cup B")}`
        : `Find ${math("|A\\cap B|")}`;
  const taskZh =
    type === "fill-in"
      ? `求 ${math("|A\\cup B|")}`
      : type === "short-answer"
        ? `求不属于 ${math("A\\cup B")} 的元素个数`
        : `求 ${math("|A\\cap B|")}`;
  return {
    prompt: isSelfIntersection
      ? {
          en: `In ${math(`U=\\{1,2,\\ldots,${limit}\\}`)}, let ${math("A")} be the multiples of ${math(String(a))} and let ${math("B=A")}. Using ${math("A\\cap A=A")}, find ${math("|A\\cap B|")}.`,
          zh: `在 ${math(`U=\\{1,2,\\ldots,${limit}\\}`)} 中，${math("A")} 是 ${math(String(a))} 的倍数组成的集合，并令 ${math("B=A")}。利用 ${math("A\\cap A=A")}，求 ${math("|A\\cap B|")}。`
        }
      : {
          en: `In ${math(`U=\\{1,2,\\ldots,${limit}\\}`)}, let ${math(`A`)} be the multiples of ${math(String(a))} and ${math("B")} be the multiples of ${math(String(b))}. ${taskEn}.`,
          zh: `在 ${math(`U=\\{1,2,\\ldots,${limit}\\}`)} 中，${math("A")} 是 ${math(String(a))} 的倍数组成的集合，${math("B")} 是 ${math(String(b))} 的倍数组成的集合。${taskZh}。`
        },
    answer: String(answer),
    options: type === "multiple-choice" ? numericOptions(answer) : undefined,
    explanation: type === "fill-in"
      ? {
          en: `${math(`A=${setAText}`)} and ${math(`B=${setBText}`)}, so ${math(`A\\cup B=${unionText}`)} and ${math(`|A\\cup B|=${answer}`)}.`,
          zh: `${math(`A=${setAText}`)}，${math(`B=${setBText}`)}，所以 ${math(`A\\cup B=${unionText}`)}，${math(`|A\\cup B|=${answer}`)}。`
        }
      : type === "short-answer"
        ? {
            en: `${math(`A\\cup B=${unionText}`)} has ${union.length} elements, so its complement in the ${limit}-element universe has ${math(`${limit}-${union.length}=${answer}`)} elements.`,
            zh: `${math(`A\\cup B=${unionText}`)} 共有 ${union.length} 个元素，所以它在含 ${limit} 个元素的全集中的补集有 ${math(`${limit}-${union.length}=${answer}`)} 个元素。`
          }
        : {
            en: isSelfIntersection
              ? `Here ${math(`B=A=${setAText}`)}. By ${math("A\\cap A=A")}, ${math(`A\\cap B=${intersectionText}`)} and ${math(`|A\\cap B|=${answer}`)}.`
              : `${math(`A=${setAText}`)} and ${math(`B=${setBText}`)}, so ${math(`A\\cap B=${intersectionText}`)} and ${math(`|A\\cap B|=${answer}`)}.`,
            zh: isSelfIntersection
              ? `本题 ${math(`B=A=${setAText}`)}。由 ${math("A\\cap A=A")}，${math(`A\\cap B=${intersectionText}`)}，所以 ${math(`|A\\cap B|=${answer}`)}。`
              : `${math(`A=${setAText}`)}，${math(`B=${setBText}`)}，所以 ${math(`A\\cap B=${intersectionText}`)}，${math(`|A\\cap B|=${answer}`)}。`
          }
  };
}

function draftQuadratic(type: Exclude<QuestionType, "graph">, n: number): QuestionDraft {
  const h = (n % 9) - 4;
  const k = (n % 7) - 3;
  const x = (n % 5) + 1;
  const value = (x - h) ** 2 + k;
  const answer = type === "short-answer" ? k : type === "fill-in" ? value : h;
  const expression = `(${shiftedX(h)})^2${signed(k)}`;
  const answerText = String(answer);
  const prompt =
    type === "short-answer"
      ? {
          en: `For ${math(`f(x)=${expression}`)}, find the minimum value.`,
          zh: `已知 ${math(`f(x)=${expression}`)}，求它的最小值。`
        }
      : type === "fill-in"
        ? {
            en: `For ${math(`f(x)=${expression}`)}, find ${math(`f(${x})`)}.`,
            zh: `已知 ${math(`f(x)=${expression}`)}，求 ${math(`f(${x})`)}。`
          }
        : {
            en: `What is the axis of symmetry of ${math(`y=${expression}`)}? Give the value of ${math("x")}.`,
            zh: `${math(`y=${expression}`)} 的对称轴是 ${math("x")} 等于多少？`
          };
  return {
    prompt,
    answer: answerText,
    acceptedAnswers: type === "short-answer" ? minimumValueAliases(answerText) : undefined,
    options: type === "multiple-choice" ? numericOptions(answer) : undefined,
    explanation: type === "short-answer"
      ? {
          en: `Because ${math(`(${shiftedX(h)})^2\\ge 0`)}, the minimum occurs at ${math(`x=${h}`)} and equals ${math(String(k))}.`,
          zh: `因为 ${math(`(${shiftedX(h)})^2\\ge 0`)}，所以当 ${math(`x=${h}`)} 时函数取得最小值 ${math(String(k))}。`
        }
      : type === "fill-in"
        ? {
            en: `Substitute ${math(`x=${x}`)}: ${math(`f(${x})=(${shiftedX(h).replace("x", String(x))})^2${signed(k)}=${value}`)}.`,
            zh: `代入 ${math(`x=${x}`)}：${math(`f(${x})=(${shiftedX(h).replace("x", String(x))})^2${signed(k)}=${value}`)}。`
          }
        : {
            en: `The vertex form has vertex ${math(`(${h},${k})`)}, so the axis of symmetry is ${math(`x=${h}`)}.`,
            zh: `顶点式的顶点为 ${math(`(${h},${k})`)}，所以对称轴为 ${math(`x=${h}`)}。`
          }
  };
}

function draftFunctions(type: Exclude<QuestionType, "graph">, n: number): QuestionDraft {
  const a = 2 + (n % 5);
  const b = (n % 9) - 4;
  const x = (n % 6) - 2;
  const value = a * x + b;
  const inverseAt = a * (n % 4) + b;
  const inverseValue = (inverseAt - b) / a;
  const answer = type === "short-answer" ? inverseValue : value;
  const expression = linearExpression(a, b);
  return {
    prompt: type === "short-answer"
      ? {
          en: `Let ${math(`f(x)=${expression}`)}. Solve ${math(`f(x)=${inverseAt}`)}.`,
          zh: `已知 ${math(`f(x)=${expression}`)}，解 ${math(`f(x)=${inverseAt}`)}。`
        }
      : {
          en: `Let ${math(`f(x)=${expression}`)}. Find ${math(`f(${x})`)}.`,
          zh: `已知 ${math(`f(x)=${expression}`)}，求 ${math(`f(${x})`)}。`
    },
    answer: formatNumber(answer),
    options: type === "multiple-choice" ? numericOptions(answer) : undefined,
    explanation: type === "short-answer"
      ? {
          en: `Solve ${math(`${expression}=${inverseAt}`)}: ${math(`x=(${inverseAt}${signed(-b)})\\div${a}=${formatNumber(inverseValue)}`)}.`,
          zh: `解 ${math(`${expression}=${inverseAt}`)}：${math(`x=(${inverseAt}${signed(-b)})\\div${a}=${formatNumber(inverseValue)}`)}。`
        }
      : {
          en: `Substitute ${math(`x=${x}`)}: ${math(`f(${x})=${a}\\times(${x})${signed(b)}=${formatNumber(value)}`)}.`,
          zh: `代入 ${math(`x=${x}`)}：${math(`f(${x})=${a}\\times(${x})${signed(b)}=${formatNumber(value)}`)}。`
        }
  };
}

function draftExpLog(type: Exclude<QuestionType, "graph">, n: number): QuestionDraft {
  const base = n % 2 === 0 ? 2 : 3;
  const exponent = 2 + (n % 5);
  const coefficient = 1 + (n % 4);
  const answer = type === "short-answer" ? coefficient * exponent : exponent;
  return {
    prompt: type === "short-answer"
      ? {
          en: `Simplify ${math(`${coefficient}\\log_${base}${base ** exponent}`)}.`,
          zh: `化简 ${math(`${coefficient}\\log_${base}${base ** exponent}`)}。`
        }
      : {
          en: `Find ${math(`\\log_${base}${base ** exponent}`)}.`,
          zh: `求 ${math(`\\log_${base}${base ** exponent}`)}。`
        },
    answer: String(answer),
    options: type === "multiple-choice" ? numericOptions(answer) : undefined,
    explanation: type === "short-answer"
      ? {
          en: `Because ${math(`${base}^{${exponent}}=${base ** exponent}`)}, the logarithm equals ${exponent}; multiplying by the coefficient gives ${math(`${coefficient}\\times ${exponent}=${answer}`)}.`,
          zh: `因为 ${math(`${base}^{${exponent}}=${base ** exponent}`)}，所以对应的对数值为 ${exponent}；再乘以前面的系数，得到 ${math(`${coefficient}\\times ${exponent}=${answer}`)}。`
        }
      : {
          en: `Because ${math(`${base}^{${exponent}}=${base ** exponent}`)}, the logarithm equals ${exponent}.`,
          zh: `因为 ${math(`${base}^{${exponent}}=${base ** exponent}`)}，所以对应的对数值为 ${exponent}。`
        }
  };
}

function draftTrigonometry(type: Exclude<QuestionType, "graph">, n: number): QuestionDraft {
  const amplitude = 1 + (n % 5);
  const frequency = 1 + (n % 3);
  const angleValues = [
    { value: "1/2", label: "30^\\circ", fn: "\\sin" },
    { value: "1/2", label: "60^\\circ", fn: "\\cos" },
    { value: "1", label: "45^\\circ", fn: "\\tan" }
  ];
  const chosen = angleValues[n % angleValues.length];
  const answer = type === "short-answer" ? amplitude : type === "fill-in" ? frequency : chosen.value;
  const sineExpression = `${amplitude === 1 ? "" : amplitude}\\sin(${frequency === 1 ? "" : frequency}x)`;
  const explanation =
    type === "short-answer"
      ? {
          en: `In ${math("y=A\\sin(kx)")}, the amplitude is ${math("|A|")}. Here ${math(`A=${amplitude}`)}, so the amplitude is ${math(String(amplitude))}.`,
          zh: `在 ${math("y=A\\sin(kx)")} 中，振幅为 ${math("|A|")}。本题 ${math(`A=${amplitude}`)}，所以振幅为 ${math(String(amplitude))}。`
        }
      : type === "fill-in"
        ? {
            en: `In ${math("y=A\\sin(kx)")}, ${math("k")} is the coefficient of ${math("x")} in the sine argument. Here the argument is ${math(`${frequency}x`)}, so ${math(`k=${frequency}`)}.`,
            zh: `在 ${math("y=A\\sin(kx)")} 中，${math("k")} 是正弦函数自变量中 ${math("x")} 的系数。本题自变量为 ${math(`${frequency}x`)}，所以 ${math(`k=${frequency}`)}。`
          }
        : {
            en: `From the exact special-angle values, ${math(`${chosen.fn}${chosen.label}=${chosen.value}`)}.`,
            zh: `根据特殊角的精确三角函数值，${math(`${chosen.fn}${chosen.label}=${chosen.value}`)}。`
          };
  return {
    prompt: type === "short-answer"
      ? {
          en: `For ${math(`y=${sineExpression}`)}, find the amplitude.`,
          zh: `对于 ${math(`y=${sineExpression}`)}，求振幅。`
        }
      : type === "fill-in"
        ? {
            en: `For ${math(`y=${sineExpression}`)}, give the coefficient of ${math("x")} in the sine argument.`,
            zh: `对于 ${math(`y=${sineExpression}`)}，写出正弦函数自变量中 ${math("x")} 的系数。`
          }
        : {
            en: `Find ${math(`${chosen.fn}${chosen.label}`)}.`,
            zh: `求 ${math(`${chosen.fn}${chosen.label}`)}。`
          },
    answer: String(answer),
    options: type === "multiple-choice" ? localizedOptions([String(answer), "0", "2", "sqrt(3)/2"]) : undefined,
    explanation
  };
}

function draftVectors(type: Exclude<QuestionType, "graph">, n: number, spatial = false): QuestionDraft {
  const a = 1 + (n % 5);
  const b = 2 + (n % 4);
  const c = spatial ? 1 + (n % 3) : 0;
  const d = 3 + (n % 5);
  const e = 1 + (n % 6);
  const f = spatial ? 2 + (n % 4) : 0;
  const dot = a * d + b * e + c * f;
  const lengthSquared = a ** 2 + b ** 2 + c ** 2;
  const answer = type === "short-answer" ? lengthSquared : dot;
  const vectorA = spatial ? `(${a},${b},${c})` : `(${a},${b})`;
  const vectorB = spatial ? `(${d},${e},${f})` : `(${d},${e})`;
  const dotTerms = spatial ? `${a}\\times${d}+${b}\\times${e}+${c}\\times${f}` : `${a}\\times${d}+${b}\\times${e}`;
  const lengthTerms = spatial ? `${a}^2+${b}^2+${c}^2` : `${a}^2+${b}^2`;
  return {
    prompt: type === "short-answer"
      ? {
          en: `For vector ${math(`\\vec a=${vectorA}`)}, find ${math("|\\vec a|^2")}.`,
          zh: `已知向量 ${math(`\\vec a=${vectorA}`)}，求 ${math("|\\vec a|^2")}。`
        }
      : {
          en: `For ${math(`\\vec a=${vectorA}`)} and ${math(`\\vec b=${vectorB}`)}, find ${math("\\vec a\\cdot\\vec b")}.`,
          zh: `已知 ${math(`\\vec a=${vectorA}`)}，${math(`\\vec b=${vectorB}`)}，求 ${math("\\vec a\\cdot\\vec b")}。`
        },
    answer: String(answer),
    options: type === "multiple-choice" ? numericOptions(answer, 2) : undefined,
    explanation: type === "short-answer"
      ? {
          en: `The squared length is the sum of the squared coordinates: ${math(`|\\vec a|^2=${lengthTerms}=${lengthSquared}`)}.`,
          zh: `向量模长的平方等于各坐标平方之和：${math(`|\\vec a|^2=${lengthTerms}=${lengthSquared}`)}。`
        }
      : {
          en: `The dot product is the sum of the products of corresponding coordinates: ${math(`\\vec a\\cdot\\vec b=${dotTerms}=${dot}`)}.`,
          zh: `数量积等于对应坐标乘积之和：${math(`\\vec a\\cdot\\vec b=${dotTerms}=${dot}`)}。`
        }
  };
}

function draftComplex(type: Exclude<QuestionType, "graph">, n: number): QuestionDraft {
  const a = (n % 7) - 3;
  const b = 1 + (n % 5);
  const c = 2 + (n % 4);
  const d = (n % 6) - 2;
  const real = a + c;
  const imaginary = b + d;
  const modulusSquared = real ** 2 + imaginary ** 2;
  const answer = type === "short-answer" ? modulusSquared : type === "fill-in" ? imaginary : real;
  const first = complexExpression(a, b);
  const second = complexExpression(c, d);
  const sum = complexExpression(real, imaginary);
  return {
    prompt: type === "short-answer"
      ? {
          en: `Let ${math(`z=(${first})+(${second})`)}. Find ${math("|z|^2")}.`,
          zh: `设 ${math(`z=(${first})+(${second})`)}，求 ${math("|z|^2")}。`
        }
      : type === "fill-in"
        ? {
            en: `Find the imaginary part of ${math(`(${first})+(${second})`)}.`,
            zh: `求 ${math(`(${first})+(${second})`)} 的虚部。`
          }
        : {
            en: `Find the real part of ${math(`(${first})+(${second})`)}.`,
            zh: `求 ${math(`(${first})+(${second})`)} 的实部。`
    },
    answer: String(answer),
    options: type === "multiple-choice" ? numericOptions(answer) : undefined,
    explanation: type === "short-answer"
      ? {
          en: `${math(`z=(${first})+(${second})=${sum}`)}, so ${math(`|z|^2=${real}^2+${imaginary}^2=${modulusSquared}`)}.`,
          zh: `${math(`z=(${first})+(${second})=${sum}`)}，所以 ${math(`|z|^2=${real}^2+${imaginary}^2=${modulusSquared}`)}。`
        }
      : type === "fill-in"
        ? {
            en: `${math(`(${first})+(${second})=${sum}`)}, so the imaginary part is ${math(String(imaginary))}.`,
            zh: `${math(`(${first})+(${second})=${sum}`)}，所以虚部为 ${math(String(imaginary))}。`
          }
        : {
            en: `${math(`(${first})+(${second})=${sum}`)}, so the real part is ${math(String(real))}.`,
            zh: `${math(`(${first})+(${second})=${sum}`)}，所以实部为 ${math(String(real))}。`
          }
  };
}

function draftSolid(type: Exclude<QuestionType, "graph">, n: number): QuestionDraft {
  const a = 2 + (n % 5);
  const b = 3 + (n % 4);
  const c = 4 + (n % 3);
  const surface = 2 * (a * b + b * c + a * c);
  const volume = a * b * c;
  const diagonalSquared = a ** 2 + b ** 2 + c ** 2;
  const answer = type === "short-answer" ? diagonalSquared : type === "fill-in" ? volume : surface;
  return {
    prompt: {
      en: `A cuboid has side lengths ${math(`${a}, ${b}, ${c}`)}. ${type === "short-answer" ? "Find the square of its space diagonal." : type === "fill-in" ? "Find its volume." : "Find its surface area."}`,
      zh: `一个长方体的三条棱长为 ${math(`${a}, ${b}, ${c}`)}。${type === "short-answer" ? "求它的体对角线长度的平方。" : type === "fill-in" ? "求它的体积。" : "求它的表面积。"}`
    },
    answer: String(answer),
    options: type === "multiple-choice" ? numericOptions(answer, 4) : undefined,
    explanation: type === "short-answer"
      ? {
          en: `By the three-dimensional Pythagorean theorem, the square of the space diagonal is ${math(`${a}^2+${b}^2+${c}^2=${diagonalSquared}`)}.`,
          zh: `由空间勾股关系，体对角线长度的平方为 ${math(`${a}^2+${b}^2+${c}^2=${diagonalSquared}`)}。`
        }
      : type === "fill-in"
        ? {
            en: `The cuboid volume is length times width times height: ${math(`${a}\\times${b}\\times${c}=${volume}`)}.`,
            zh: `长方体体积等于长、宽、高的乘积：${math(`${a}\\times${b}\\times${c}=${volume}`)}。`
          }
        : {
            en: `The cuboid surface area is ${math(`2(${a}\\times${b}+${b}\\times${c}+${a}\\times${c})=${surface}`)}.`,
            zh: `长方体表面积为 ${math(`2(${a}\\times${b}+${b}\\times${c}+${a}\\times${c})=${surface}`)}。`
          }
  };
}

function draftStatistics(type: Exclude<QuestionType, "graph">, n: number): QuestionDraft {
  const start = 2 + (n % 6);
  const values = [start, start + 2, start + 4];
  const mean = start + 2;
  const range = 4;
  const varianceTimesThree = values.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  const valueSum = values.reduce((sum, value) => sum + value, 0);
  const deviationSquares = values.map((value) => `(${value}-${mean})^2`).join("+");
  const answer = type === "short-answer" ? varianceTimesThree : type === "fill-in" ? range : mean;
  return {
    prompt: {
      en: `For the data ${math(values.join(", "))}, ${type === "short-answer" ? "using variance as the mean of the squared deviations (divide by the number of data values), find three times the variance." : type === "fill-in" ? "find the range." : "find the mean."}`,
      zh: `对于数据 ${math(values.join(", "))}，${type === "short-answer" ? "按方差等于各偏差平方的平均数（除以数据个数）这一口径，求方差的三倍。" : type === "fill-in" ? "求极差。" : "求平均数。"}`
    },
    answer: String(answer),
    options: type === "multiple-choice" ? numericOptions(answer) : undefined,
    explanation: type === "short-answer"
      ? {
          en: `The mean is ${math(`${valueSum}\\div3=${mean}`)}. The variance is ${math(`(${deviationSquares})\\div3=${varianceTimesThree}/3`)}, so three times the variance is ${math(String(varianceTimesThree))}.`,
          zh: `平均数为 ${math(`${valueSum}\\div3=${mean}`)}。方差为 ${math(`(${deviationSquares})\\div3=${varianceTimesThree}/3`)}，所以方差的三倍为 ${math(String(varianceTimesThree))}。`
        }
      : type === "fill-in"
        ? {
            en: `The range is the maximum minus the minimum: ${math(`${values[2]}-${values[0]}=${range}`)}.`,
            zh: `极差等于最大值减最小值：${math(`${values[2]}-${values[0]}=${range}`)}。`
          }
        : {
            en: `The mean is the sum divided by the number of data values: ${math(`(${values.join("+")})\\div3=${valueSum}\\div3=${mean}`)}.`,
            zh: `平均数等于数据之和除以数据个数：${math(`(${values.join("+")})\\div3=${valueSum}\\div3=${mean}`)}。`
          }
  };
}

function draftProbability(type: Exclude<QuestionType, "graph">, n: number): QuestionDraft {
  const red = 2 + (n % 4);
  const blue = 3 + (n % 5);
  const total = red + blue;
  const redProbability = fraction(red, total);
  const rawRedProbability = `${red}/${total}`;
  const probabilityCalculation = rawRedProbability === redProbability
    ? rawRedProbability
    : `${rawRedProbability}=${redProbability}`;
  const notBlue = redProbability;
  const orderedPairs = total * (total - 1);
  const answer = type === "short-answer" ? String(orderedPairs) : type === "fill-in" ? notBlue : redProbability;
  return {
    prompt: type === "short-answer"
      ? {
          en: `A bag contains ${red} red balls and ${blue} blue balls, and every ball is individually distinguishable. Two balls are drawn in order without replacement. How many ordered pairs of balls are possible?`,
          zh: `袋中有 ${red} 个红球和 ${blue} 个蓝球，每个球都可区分。不放回依次摸出两个球，共有多少种有序取法？`
        }
      : {
          en: `A bag contains ${red} red balls and ${blue} blue balls. One ball is drawn uniformly at random. Find ${math("P(\\text{red})")}.`,
          zh: `袋中有 ${red} 个红球和 ${blue} 个蓝球。随机摸出一个球，求 ${math("P(\\text{摸到红球})")}。`
        },
    answer,
    options: type === "multiple-choice" ? fractionOptions(answer, red, total) : undefined,
    explanation: type === "short-answer"
      ? {
          en: `There are ${total} choices for the first ball and ${total - 1} for the second, so the number of ordered pairs is ${math(`${total}\\times${total - 1}=${orderedPairs}`)}.`,
          zh: `第一次有 ${total} 种选法，第二次有 ${total - 1} 种选法，所以有序取法共有 ${math(`${total}\\times${total - 1}=${orderedPairs}`)} 种。`
        }
      : {
          en: `There are ${red} favorable balls among ${total} equally likely balls, so ${math(`P(\\text{red})=${probabilityCalculation}`)}.`,
          zh: `${total} 个等可能的球中有 ${red} 个红球，所以 ${math(`P(\\text{摸到红球})=${probabilityCalculation}`)}。`
        }
  };
}

function draftLinesCircles(type: Exclude<QuestionType, "graph">, n: number): QuestionDraft {
  const m = 1 + (n % 5);
  const x1 = n % 4;
  const y1 = 2 + (n % 6);
  const x2 = x1 + 2;
  const y2 = y1 + 2 * m;
  const radius = 2 + (n % 6);
  const radiusSquared = radius ** 2;
  const answer = type === "short-answer" ? radiusSquared : type === "fill-in" ? radius : m;
  const explanation =
    type === "short-answer"
      ? {
          en: `A circle in standard form ${math("(x-a)^2+(y-b)^2=r^2")} has right side ${math("r^2")}. Here ${math(`r^2=${radiusSquared}`)}.`,
          zh: `圆的标准方程 ${math("(x-a)^2+(y-b)^2=r^2")} 右端就是 ${math("r^2")}。本题中 ${math(`r^2=${radiusSquared}`)}。`
        }
      : type === "fill-in"
        ? {
            en: `A circle in standard form ${math("(x-a)^2+(y-b)^2=r^2")} has radius ${math("r")}. Here ${math(`r^2=${radiusSquared}`)}, so ${math(`r=${radius}`)}.`,
            zh: `圆的标准方程 ${math("(x-a)^2+(y-b)^2=r^2")} 中，半径为 ${math("r")}。本题 ${math(`r^2=${radiusSquared}`)}，所以 ${math(`r=${radius}`)}。`
          }
        : {
            en: `The slope through two points is ${math("\\frac{y_2-y_1}{x_2-x_1}")}. Here ${math(`\\frac{${y2}-${y1}}{${x2}-${x1}}=${m}`)}.`,
            zh: `两点式斜率为 ${math("\\frac{y_2-y_1}{x_2-x_1}")}。本题 ${math(`\\frac{${y2}-${y1}}{${x2}-${x1}}=${m}`)}。`
          };
  return {
    prompt: type === "short-answer"
      ? {
          en: `For the circle ${math(`(x-${x1})^2+(y-${y1})^2=${radiusSquared}`)}, find ${math("r^2")}.`,
          zh: `已知圆 ${math(`(x-${x1})^2+(y-${y1})^2=${radiusSquared}`)}，求 ${math("r^2")}。`
        }
      : type === "fill-in"
        ? {
            en: `For the circle ${math(`(x-${x1})^2+(y-${y1})^2=${radiusSquared}`)}, find its radius.`,
            zh: `已知圆 ${math(`(x-${x1})^2+(y-${y1})^2=${radiusSquared}`)}，求半径。`
          }
        : {
            en: `Find the slope of the line through ${math(`(${x1},${y1})`)} and ${math(`(${x2},${y2})`)}.`,
            zh: `求过 ${math(`(${x1},${y1})`)} 与 ${math(`(${x2},${y2})`)} 的直线斜率。`
          },
    answer: String(answer),
    options: type === "multiple-choice" ? numericOptions(answer) : undefined,
    explanation
  };
}

function draftConics(type: Exclude<QuestionType, "graph">, n: number): QuestionDraft {
  const a = 4 + (n % 5);
  const b = Math.min(2 + (n % 3), a - 1);
  const cSquared = a ** 2 - b ** 2;
  const latus = 2 + (n % 6);
  const answer = type === "short-answer" ? latus : type === "fill-in" ? cSquared : 2 * a;
  const explanation = type === "short-answer"
    ? {
        en: `In ${math("y^2=2px")}, compare coefficients: ${math(`2p=${2 * latus}`)}, so ${math(`p=${latus}`)}.`,
        zh: `在 ${math("y^2=2px")} 中比较系数：${math(`2p=${2 * latus}`)}，所以 ${math(`p=${latus}`)}。`
      }
    : type === "fill-in"
      ? {
          en: `Here ${math(`a^2=${a ** 2}`)} and ${math(`b^2=${b ** 2}`)}, so ${math(`c^2=a^2-b^2=${cSquared}`)}.`,
          zh: `本题 ${math(`a^2=${a ** 2}`)}，${math(`b^2=${b ** 2}`)}，所以 ${math(`c^2=a^2-b^2=${cSquared}`)}。`
        }
      : {
          en: `Because ${math(`a=${a}`)} is the semi-major axis, the major-axis length is ${math(`2a=${2 * a}`)}.`,
          zh: `因为长半轴 ${math(`a=${a}`)}，所以长轴长为 ${math(`2a=${2 * a}`)}。`
        };
  return {
    prompt: type === "short-answer"
      ? {
          en: `For the parabola ${math(`y^2=${2 * latus}x`)}, find ${math("p")} in ${math("y^2=2px")}.`,
          zh: `已知抛物线 ${math(`y^2=${2 * latus}x`)}，求 ${math("y^2=2px")} 中的 ${math("p")}。`
        }
      : type === "fill-in"
        ? {
            en: `For the ellipse ${math(`\\frac{x^2}{${a ** 2}}+\\frac{y^2}{${b ** 2}}=1`)}, find ${math("c^2")}.`,
            zh: `已知椭圆 ${math(`\\frac{x^2}{${a ** 2}}+\\frac{y^2}{${b ** 2}}=1`)}，求 ${math("c^2")}。`
          }
        : {
            en: `For the ellipse ${math(`\\frac{x^2}{${a ** 2}}+\\frac{y^2}{${b ** 2}}=1`)}, find the major-axis length.`,
            zh: `已知椭圆 ${math(`\\frac{x^2}{${a ** 2}}+\\frac{y^2}{${b ** 2}}=1`)}，求长轴长。`
          },
    answer: formatNumber(answer),
    options: type === "multiple-choice" ? numericOptions(answer) : undefined,
    explanation
  };
}

function draftSequences(type: Exclude<QuestionType, "graph">, n: number): QuestionDraft {
  const first = 2 + (n % 5);
  const diff = 1 + (n % 6);
  const term = 5 + (n % 8);
  const nth = first + (term - 1) * diff;
  const sum = (term * (first + nth)) / 2;
  const answer = type === "short-answer" ? sum : nth;
  return {
    prompt: type === "short-answer"
      ? {
          en: `An arithmetic sequence has ${math(`a_1=${first}`)} and ${math(`d=${diff}`)}. Find ${math(`S_${term}`)}.`,
          zh: `等差数列满足 ${math(`a_1=${first}`)}，${math(`d=${diff}`)}。求 ${math(`S_${term}`)}。`
        }
      : {
          en: `An arithmetic sequence has ${math(`a_1=${first}`)} and ${math(`d=${diff}`)}. Find ${math(`a_${term}`)}.`,
          zh: `等差数列满足 ${math(`a_1=${first}`)}，${math(`d=${diff}`)}。求 ${math(`a_${term}`)}。`
    },
    answer: formatNumber(answer),
    options: type === "multiple-choice" ? numericOptions(answer, diff) : undefined,
    explanation: type === "short-answer"
      ? {
          en: `First, ${math(`a_${term}=${first}+(${term}-1)\\times${diff}=${nth}`)}. Then ${math(`S_${term}=\\frac{${term}(${first}+${nth})}{2}=${formatNumber(sum)}`)}.`,
          zh: `先求 ${math(`a_${term}=${first}+(${term}-1)\\times${diff}=${nth}`)}，再由 ${math(`S_${term}=\\frac{${term}(${first}+${nth})}{2}=${formatNumber(sum)}`)} 得到答案。`
        }
      : {
          en: `Use the arithmetic-sequence formula: ${math(`a_${term}=a_1+(${term}-1)d=${first}+(${term}-1)\\times${diff}=${nth}`)}.`,
          zh: `使用等差数列通项公式：${math(`a_${term}=a_1+(${term}-1)d=${first}+(${term}-1)\\times${diff}=${nth}`)}。`
        }
  };
}

function draftDerivatives(type: Exclude<QuestionType, "graph">, n: number): QuestionDraft {
  const a = 1 + (n % 5);
  const b = (n % 7) - 3;
  const x = 1 + (n % 4);
  const derivativeValue = 2 * a * x + b;
  const stationaryX = exactRational(-b, 2 * a);
  const answer = type === "short-answer" ? stationaryX : String(derivativeValue);
  const expression = quadraticExpression(a, b, 1);
  const derivativeExpression = linearExpression(2 * a, b);
  return {
    prompt: type === "short-answer"
      ? {
          en: `For ${math(`f(x)=${expression}`)}, solve ${math("f'(x)=0")}.`,
          zh: `已知 ${math(`f(x)=${expression}`)}，解 ${math("f'(x)=0")}。`
        }
      : {
          en: `For ${math(`f(x)=${expression}`)}, find ${math(`f'(${x})`)}.`,
          zh: `已知 ${math(`f(x)=${expression}`)}，求 ${math(`f'(${x})`)}。`
    },
    answer,
    acceptedAnswers: type === "short-answer" ? [`x=${stationaryX}`] : undefined,
    options: type === "multiple-choice" ? numericOptions(derivativeValue) : undefined,
    explanation: type === "short-answer"
      ? {
          en: `Differentiate to get ${math(`f'(x)=${derivativeExpression}`)}. Solving ${math(`${derivativeExpression}=0`)} gives ${math(`x=${stationaryX}`)}.`,
          zh: `先求导得 ${math(`f'(x)=${derivativeExpression}`)}。解 ${math(`${derivativeExpression}=0`)}，得 ${math(`x=${stationaryX}`)}。`
        }
      : {
          en: `Differentiate to get ${math(`f'(x)=${derivativeExpression}`)}. Substituting ${math(`x=${x}`)} gives ${math(`f'(${x})=${derivativeExpression.replace("x", `\\times${x}`)}=${formatNumber(derivativeValue)}`)}.`,
          zh: `先求导得 ${math(`f'(x)=${derivativeExpression}`)}。代入 ${math(`x=${x}`)}，得 ${math(`f'(${x})=${derivativeExpression.replace("x", `\\times${x}`)}=${formatNumber(derivativeValue)}`)}。`
        }
  };
}

function draftCounting(type: Exclude<QuestionType, "graph">, n: number): QuestionDraft {
  const total = 5 + (n % 8);
  const chooseTwo = (total * (total - 1)) / 2;
  const arrangeTwo = total * (total - 1);
  const binomialCoefficient = chooseTwo;
  const answer = type === "short-answer" ? binomialCoefficient : type === "fill-in" ? arrangeTwo : chooseTwo;
  return {
    prompt: {
      en: `From ${total} different items, ${type === "fill-in" ? "how many ordered selections of 2 are possible?" : "how many ways are there to choose 2 items?"}`,
      zh: `从 ${total} 个不同元素中，${type === "fill-in" ? "有多少种有序选取 2 个的方法？" : "有多少种选出 2 个的方法？"}`
    },
    answer: String(answer),
    options: type === "multiple-choice" ? numericOptions(answer, total) : undefined,
    explanation: type === "fill-in"
      ? {
          en: `Order matters, so there are ${math(`A_{${total}}^2=${total}\\times${total - 1}=${arrangeTwo}`)} ordered selections.`,
          zh: `选取顺序不同算不同结果，所以有序选法共有 ${math(`A_{${total}}^2=${total}\\times${total - 1}=${arrangeTwo}`)} 种。`
        }
      : {
          en: `Order does not matter, so ${math(`C_{${total}}^2=\\frac{${total}\\times${total - 1}}{2}=${chooseTwo}`)}.`,
          zh: `选取顺序不影响结果，所以 ${math(`C_{${total}}^2=\\frac{${total}\\times${total - 1}}{2}=${chooseTwo}`)}。`
        }
  };
}

function draftRandomVariables(type: Exclude<QuestionType, "graph">, n: number): QuestionDraft {
  const trials = 4 + 2 * (n % 5);
  const probabilityNumerator = n % 2 === 0 ? 1 : 3;
  const probabilityDenominator = probabilityNumerator === 1 ? 2 : 4;
  const expectation = trials * probabilityNumerator / probabilityDenominator;
  const variance = trials * (probabilityNumerator / probabilityDenominator) * (1 - probabilityNumerator / probabilityDenominator);
  const answer = type === "short-answer" ? variance : expectation;
  return {
    prompt: {
      en: `Let ${math(`X\\sim B(${trials}, ${fraction(probabilityNumerator, probabilityDenominator)})`)}. ${type === "short-answer" ? "Find the variance." : "Find the expectation."}`,
      zh: `设 ${math(`X\\sim B(${trials}, ${fraction(probabilityNumerator, probabilityDenominator)})`)}，${type === "short-answer" ? "求方差。" : "求期望。"}`
    },
    answer: formatNumber(answer),
    options: type === "multiple-choice" ? numericOptions(answer) : undefined,
    explanation: type === "short-answer"
      ? {
          en: `For a binomial variable, ${math(`D(X)=np(1-p)=${trials}\\times${fraction(probabilityNumerator, probabilityDenominator)}\\times(1-${fraction(probabilityNumerator, probabilityDenominator)})=${formatNumber(variance)}`)}.`,
          zh: `二项分布中，${math(`D(X)=np(1-p)=${trials}\\times${fraction(probabilityNumerator, probabilityDenominator)}\\times(1-${fraction(probabilityNumerator, probabilityDenominator)})=${formatNumber(variance)}`)}。`
        }
      : {
          en: `For a binomial variable, ${math(`E(X)=np=${trials}\\times${fraction(probabilityNumerator, probabilityDenominator)}=${formatNumber(expectation)}`)}.`,
          zh: `二项分布中，${math(`E(X)=np=${trials}\\times${fraction(probabilityNumerator, probabilityDenominator)}=${formatNumber(expectation)}`)}。`
        }
  };
}

function draftBivariateData(type: Exclude<QuestionType, "graph">, n: number): QuestionDraft {
  const slope = 1 + (n % 5);
  const intercept = (n % 7) - 3;
  const x = 2 + (n % 6);
  const predicted = slope * x + intercept;
  const residual = 2 + (n % 4);
  const observed = predicted + residual;
  const answer = type === "short-answer" ? residual : predicted;
  const regression = intercept === 0 ? `${slope}x` : linearExpression(slope, intercept);
  const interceptTerm = intercept === 0 ? "" : signed(intercept);
  return {
    prompt: type === "short-answer"
      ? {
          en: `A regression model is ${math(`\\hat y=${regression}`)}. When ${math(`x=${x}`)}, the observed value is ${observed}. Find the residual ${math("y-\\hat y")}.`,
          zh: `回归模型为 ${math(`\\hat y=${regression}`)}。当 ${math(`x=${x}`)} 时，观测值为 ${observed}。求残差 ${math("y-\\hat y")}。`
        }
      : {
          en: `A regression model is ${math(`\\hat y=${regression}`)}. Find the predicted value when ${math(`x=${x}`)}.`,
          zh: `回归模型为 ${math(`\\hat y=${regression}`)}。求 ${math(`x=${x}`)} 时的预测值。`
    },
    answer: String(answer),
    options: type === "multiple-choice" ? numericOptions(answer) : undefined,
    explanation: type === "short-answer"
      ? {
          en: `The predicted value is ${math(`\\hat y=${slope}\\times${x}${interceptTerm}=${predicted}`)}. Therefore the residual is ${math(`y-\\hat y=${observed}-${predicted}=${residual}`)}.`,
          zh: `预测值为 ${math(`\\hat y=${slope}\\times${x}${interceptTerm}=${predicted}`)}，所以残差为 ${math(`y-\\hat y=${observed}-${predicted}=${residual}`)}。`
        }
      : {
          en: `Substitute ${math(`x=${x}`)} into the regression equation: ${math(`\\hat y=${slope}\\times${x}${interceptTerm}=${predicted}`)}.`,
          zh: `把 ${math(`x=${x}`)} 代入回归方程：${math(`\\hat y=${slope}\\times${x}${interceptTerm}=${predicted}`)}。`
        }
  };
}

function draftExamSynthesis(type: Exclude<QuestionType, "graph">, n: number): QuestionDraft {
  const a = 1 + (n % 4);
  const x = 2 + (n % 5);
  const derivativeValue = 3 * a * x ** 2;
  const favorableOutcomes = 2 + (n % 3);
  const totalOutcomes = 7 + (n % 5);
  const rawProbability = `${favorableOutcomes}/${totalOutcomes}`;
  const probabilityAnswer = fraction(favorableOutcomes, totalOutcomes);
  if (type === "fill-in") {
    return {
      prompt: {
        en: `A mixed-practice model uses ${math(`f(x)=${a}x^3`)}. Find ${math(`f'(${x})`)}.`,
        zh: `一个综合练习模型中，${math(`f(x)=${a}x^3`)}。求 ${math(`f'(${x})`)}。`
      },
      answer: String(derivativeValue),
      explanation: {
        en: `By the power rule, ${math(`f'(x)=${3 * a}x^2`)}. Substituting ${math(`x=${x}`)} gives ${math(`f'(${x})=${3 * a}\\times${x}^2=${derivativeValue}`)}.`,
        zh: `由幂函数求导法则，${math(`f'(x)=${3 * a}x^2`)}。代入 ${math(`x=${x}`)}，得 ${math(`f'(${x})=${3 * a}\\times${x}^2=${derivativeValue}`)}。`
      }
    };
  }
  if (type === "short-answer") {
    return {
      prompt: {
        en: `In a review task, a favorable event has ${favorableOutcomes} outcomes from ${totalOutcomes} equally likely outcomes. Find the probability.`,
        zh: `在一道综合练习中，某事件在 ${totalOutcomes} 个等可能结果中有 ${favorableOutcomes} 个有利结果。求该事件的概率。`
      },
      answer: probabilityAnswer,
      acceptedAnswers: probabilityAnswerAliases(rawProbability, probabilityAnswer),
      explanation: {
        en: `Probability is favorable outcomes divided by total equally likely outcomes: ${math(`P=${rawProbability}${rawProbability === probabilityAnswer ? "" : `=${probabilityAnswer}`}`)}.`,
        zh: `概率等于有利结果数除以等可能结果总数：${math(`P=${rawProbability}${rawProbability === probabilityAnswer ? "" : `=${probabilityAnswer}`}`)}。`
      }
    };
  }
  return {
    prompt: {
      en: `For ${math(`f(x)=${a}x^3`)}, find ${math(`f'(${x})`)}.`,
      zh: `已知 ${math(`f(x)=${a}x^3`)}，求 ${math(`f'(${x})`)}。`
    },
    answer: String(derivativeValue),
    options: numericOptions(derivativeValue, 3),
    explanation: {
      en: `The derivative is ${math(`f'(x)=${3 * a}x^2`)}, so substitution gives ${derivativeValue}.`,
      zh: `导函数为 ${math(`f'(x)=${3 * a}x^2`)}，代入可得 ${derivativeValue}。`
    }
  };
}

function draftFor(spec: MainlandPepHighQuestionSpec, type: Exclude<QuestionType, "graph">, n: number): QuestionDraft {
  switch (spec.family) {
    case "sets":
      return draftSets(type, n);
    case "quadratic":
      return draftQuadratic(type, n);
    case "functions":
      return draftFunctions(type, n);
    case "exp-log":
      return draftExpLog(type, n);
    case "trigonometry":
      return draftTrigonometry(type, n);
    case "plane-vectors":
      return draftVectors(type, n);
    case "complex":
      return draftComplex(type, n);
    case "solid-geometry":
      return draftSolid(type, n);
    case "statistics":
      return draftStatistics(type, n);
    case "probability":
      return draftProbability(type, n);
    case "space-vectors":
      return draftVectors(type, n, true);
    case "lines-circles":
      return draftLinesCircles(type, n);
    case "conics":
      return draftConics(type, n);
    case "sequences":
      return draftSequences(type, n);
    case "derivatives":
      return draftDerivatives(type, n);
    case "counting":
      return draftCounting(type, n);
    case "random-variables":
      return draftRandomVariables(type, n);
    case "bivariate-data":
      return draftBivariateData(type, n);
    case "exam-synthesis":
      return draftExamSynthesis(type, n);
  }
}

function difficultyFor(spec: MainlandPepHighQuestionSpec, draft: QuestionDraft): Difficulty {
  if (draft.difficulty) return draft.difficulty;
  if (spec.difficulty) return spec.difficulty;
  const ragDifficulty = ragDifficultyByChapter.get(spec.chapter);
  if (ragDifficulty) return difficultyByBand[ragDifficulty] ?? "Medium";
  return examPatternChapters.has(spec.chapter) ? "High" : "Medium";
}

function questionFor({
  grade,
  type,
  index
}: {
  grade: Extract<GradeId, "S4" | "S5" | "S6">;
  type: Exclude<QuestionType, "graph">;
  index: number;
}): Question {
  const gradeSpecs = specs.filter((spec) => spec.grade === grade);
  const spec = gradeSpecs[index % gradeSpecs.length];
  const topic = topicById.get(spec.topicId);
  if (!topic) throw new Error(`Missing Mainland PEP high topic: ${spec.topicId}`);
  const cycle = Math.floor(index / gradeSpecs.length);
  const draft = draftFor(spec, type, cycle * 17 + index + 1);
  const typePrefix = typePrefixes[type];
  const id = `pep-high-${grade.toLowerCase()}-${typePrefix}-${String(index + 1).padStart(3, "0")}`;

  return {
    id,
    curriculumTrack: "MAINLAND_PEP_HIGH",
    grade,
    topicId: spec.topicId,
    topic: topic.title,
    difficulty: difficultyFor(spec, draft),
    type,
    prompt: draft.prompt,
    options: draft.options,
    answer: draft.answer,
    acceptedAnswers: draft.acceptedAnswers,
    explanation: draft.explanation
  };
}

function seedV1QuestionsForGrade(grade: Extract<GradeId, "S4" | "S5" | "S6">) {
  const types: Exclude<QuestionType, "graph">[] = ["multiple-choice", "fill-in", "short-answer"];
  return types.flatMap((type) =>
    Array.from({ length: 100 }, (_, index) => questionFor({ grade, type, index }))
  );
}

function ragV2TypeQuotasForGrade(grade: Extract<GradeId, "S4" | "S5" | "S6">): TypeQuota[] {
  const gradeSpecs = specs.filter((spec) => spec.grade === grade);
  if (grade === "S4") {
    return gradeSpecs.map(() => ({ "multiple-choice": 10, "fill-in": 10, "short-answer": 10 }));
  }
  if (grade === "S5") {
    return gradeSpecs.map(() => ({ "multiple-choice": 20, "fill-in": 20, "short-answer": 20 }));
  }
  return [
    { "multiple-choice": 15, "fill-in": 14, "short-answer": 14 },
    { "multiple-choice": 14, "fill-in": 15, "short-answer": 14 },
    { "multiple-choice": 14, "fill-in": 14, "short-answer": 15 },
    { "multiple-choice": 15, "fill-in": 14, "short-answer": 14 },
    { "multiple-choice": 14, "fill-in": 15, "short-answer": 14 },
    { "multiple-choice": 14, "fill-in": 14, "short-answer": 15 },
    { "multiple-choice": 14, "fill-in": 14, "short-answer": 14 }
  ];
}

function ragV2PlanForType(
  grade: Extract<GradeId, "S4" | "S5" | "S6">,
  type: Exclude<QuestionType, "graph">
) {
  const gradeSpecs = specs.filter((spec) => spec.grade === grade);
  const quotas = ragV2TypeQuotasForGrade(grade);
  return gradeSpecs.flatMap((spec, specIndex) =>
    Array.from({ length: quotas[specIndex][type] }, () => spec)
  );
}

function ragV2QuestionFor({
  grade,
  type,
  typeIndex,
  spec,
  occurrence
}: {
  grade: Extract<GradeId, "S4" | "S5" | "S6">;
  type: Exclude<QuestionType, "graph">;
  typeIndex: number;
  spec: MainlandPepHighQuestionSpec;
  occurrence: number;
}): Question {
  const topic = topicById.get(spec.topicId);
  if (!topic) throw new Error(`Missing Mainland PEP high topic: ${spec.topicId}`);

  const draftSeed = 1000 + occurrence * 19 + typeIndex * 7 + grade.charCodeAt(1);
  const draft = withRagV2Guidance(draftFor(spec, type, draftSeed), spec, typeIndex);
  const typePrefix = typePrefixes[type];
  const id = `pep-high-${grade.toLowerCase()}-rag2-${typePrefix}-${String(typeIndex + 1).padStart(3, "0")}`;

  return {
    id,
    curriculumTrack: "MAINLAND_PEP_HIGH",
    grade,
    topicId: spec.topicId,
    topic: topic.title,
    difficulty: difficultyFor(spec, draft),
    type,
    prompt: draft.prompt,
    options: draft.options,
    answer: draft.answer,
    acceptedAnswers: draft.acceptedAnswers,
    explanation: draft.explanation
  };
}

function ragV2QuestionsForGrade(grade: Extract<GradeId, "S4" | "S5" | "S6">) {
  const types: Exclude<QuestionType, "graph">[] = ["multiple-choice", "fill-in", "short-answer"];
  return types.flatMap((type) => {
    const occurrenceByTopic = new Map<string, number>();
    return ragV2PlanForType(grade, type).map((spec, typeIndex) => {
      const occurrence = occurrenceByTopic.get(spec.topicId) ?? 0;
      occurrenceByTopic.set(spec.topicId, occurrence + 1);
      return ragV2QuestionFor({ grade, type, typeIndex, spec, occurrence });
    });
  });
}

function ragV3TypeQuotasForGrade(grade: Extract<GradeId, "S4" | "S5" | "S6">): TypeQuota[] {
  const gradeSpecs = specs.filter((spec) => spec.grade === grade);
  if (grade === "S4") {
    return gradeSpecs.map((_, index) => ({
      "multiple-choice": 17,
      "fill-in": index < 5 ? 17 : 16,
      "short-answer": index < 5 ? 16 : 17
    }));
  }
  if (grade === "S5") {
    return gradeSpecs.map(() => ({ "multiple-choice": 34, "fill-in": 33, "short-answer": 33 }));
  }
  return [
    { "multiple-choice": 25, "fill-in": 24, "short-answer": 23 },
    { "multiple-choice": 24, "fill-in": 25, "short-answer": 23 },
    { "multiple-choice": 24, "fill-in": 23, "short-answer": 25 },
    { "multiple-choice": 25, "fill-in": 23, "short-answer": 23 },
    { "multiple-choice": 24, "fill-in": 24, "short-answer": 23 },
    { "multiple-choice": 24, "fill-in": 23, "short-answer": 24 },
    { "multiple-choice": 24, "fill-in": 23, "short-answer": 24 }
  ];
}

function ragV3PlanForType(
  grade: Extract<GradeId, "S4" | "S5" | "S6">,
  type: Exclude<QuestionType, "graph">
) {
  const gradeSpecs = specs.filter((spec) => spec.grade === grade);
  const quotas = ragV3TypeQuotasForGrade(grade);
  return gradeSpecs.flatMap((spec, specIndex) =>
    Array.from({ length: quotas[specIndex][type] }, () => spec)
  );
}

function ragV3QuestionFor({
  grade,
  type,
  typeIndex,
  spec,
  occurrence
}: {
  grade: Extract<GradeId, "S4" | "S5" | "S6">;
  type: Exclude<QuestionType, "graph">;
  typeIndex: number;
  spec: MainlandPepHighQuestionSpec;
  occurrence: number;
}): Question {
  const topic = topicById.get(spec.topicId);
  if (!topic) throw new Error(`Missing Mainland PEP high topic: ${spec.topicId}`);

  const draftSeed = 4000 + occurrence * 17 + typeIndex * 29 + spec.topicId.length + grade.charCodeAt(1);
  const draft = withRagV3Guidance(draftFor(spec, type, draftSeed), spec, typeIndex, type);
  const typePrefix = typePrefixes[type];
  const id = `pep-high-${grade.toLowerCase()}-rag3-${typePrefix}-${String(typeIndex + 1).padStart(3, "0")}`;

  return {
    id,
    curriculumTrack: "MAINLAND_PEP_HIGH",
    grade,
    topicId: spec.topicId,
    topic: topic.title,
    difficulty: difficultyFor(spec, draft),
    type,
    prompt: draft.prompt,
    options: draft.options,
    answer: draft.answer,
    acceptedAnswers: draft.acceptedAnswers,
    explanation: draft.explanation
  };
}

function ragV3QuestionsForGrade(grade: Extract<GradeId, "S4" | "S5" | "S6">) {
  const types: Exclude<QuestionType, "graph">[] = ["multiple-choice", "fill-in", "short-answer"];
  return types.flatMap((type) => {
    const occurrenceByTopic = new Map<string, number>();
    return ragV3PlanForType(grade, type).map((spec, typeIndex) => {
      const occurrence = occurrenceByTopic.get(spec.topicId) ?? 0;
      occurrenceByTopic.set(spec.topicId, occurrence + 1);
      return ragV3QuestionFor({ grade, type, typeIndex, spec, occurrence });
    });
  });
}

function ragV4TypeQuotasForGrade(grade: Extract<GradeId, "S4" | "S5" | "S6">): TypeQuota[] {
  return ragV3TypeQuotasForGrade(grade);
}

function ragV4PlanForType(
  grade: Extract<GradeId, "S4" | "S5" | "S6">,
  type: Exclude<QuestionType, "graph">
) {
  const gradeSpecs = specs.filter((spec) => spec.grade === grade);
  const quotas = ragV4TypeQuotasForGrade(grade);
  return gradeSpecs.flatMap((spec, specIndex) =>
    Array.from({ length: quotas[specIndex][type] }, () => spec)
  );
}

function ragV4QuestionFor({
  grade,
  type,
  typeIndex,
  spec,
  occurrence
}: {
  grade: Extract<GradeId, "S4" | "S5" | "S6">;
  type: Exclude<QuestionType, "graph">;
  typeIndex: number;
  spec: MainlandPepHighQuestionSpec;
  occurrence: number;
}): Question {
  const topic = topicById.get(spec.topicId);
  if (!topic) throw new Error(`Missing Mainland PEP high topic: ${spec.topicId}`);

  const draftSeed = 8000 + occurrence * 23 + typeIndex * 31 + spec.chapter.length + grade.charCodeAt(1);
  const draft = withRagV4Guidance(draftFor(spec, type, draftSeed), spec, typeIndex, type);
  const typePrefix = typePrefixes[type];
  const id = `pep-high-${grade.toLowerCase()}-rag4-${typePrefix}-${String(typeIndex + 1).padStart(3, "0")}`;

  return {
    id,
    curriculumTrack: "MAINLAND_PEP_HIGH",
    grade,
    topicId: spec.topicId,
    topic: topic.title,
    difficulty: difficultyFor(spec, draft),
    type,
    prompt: draft.prompt,
    options: draft.options,
    answer: draft.answer,
    acceptedAnswers: draft.acceptedAnswers,
    explanation: draft.explanation
  };
}

function ragV4QuestionsForGrade(grade: Extract<GradeId, "S4" | "S5" | "S6">) {
  const types: Exclude<QuestionType, "graph">[] = ["multiple-choice", "fill-in", "short-answer"];
  return types.flatMap((type) => {
    const occurrenceByTopic = new Map<string, number>();
    return ragV4PlanForType(grade, type).map((spec, typeIndex) => {
      const occurrence = occurrenceByTopic.get(spec.topicId) ?? 0;
      occurrenceByTopic.set(spec.topicId, occurrence + 1);
      return ragV4QuestionFor({ grade, type, typeIndex, spec, occurrence });
    });
  });
}

function metadataForQuestion(question: Question, batch: MainlandPepHighQuestionBatch) {
  const spec = specByTopicId.get(question.topicId);
  if (!spec) throw new Error(`Missing Mainland PEP high spec for question ${question.id}`);
  return metadataForSpec(spec, batch);
}

type MainlandPepHighManualContentQaOverride = Partial<
  Pick<Question, "prompt" | "answer" | "acceptedAnswers" | "explanation" | "options">
>;

const mainlandPepHighManualContentQaOverrides: Record<string, MainlandPepHighManualContentQaOverride> = {
  "pep-high-s4-mc-041": {
    prompt: {
      en: 'For real x, let p be "x=2" and q be "x^2=4". Which statement is correct?',
      zh: '对实数x，设p为“x=2”，q为“x^2=4”。下列说法正确的是哪一项？'
    },
    answer: "p is sufficient but not necessary for q.",
    acceptedAnswers: ["p是q的充分不必要条件。"],
    options: [
      { en: "p is sufficient but not necessary for q.", zh: "p是q的充分不必要条件。" },
      { en: "p is necessary but not sufficient for q.", zh: "p是q的必要不充分条件。" },
      { en: "p is necessary and sufficient for q.", zh: "p是q的充要条件。" },
      { en: "p is neither sufficient nor necessary for q.", zh: "p既不是q的充分条件，也不是q的必要条件。" }
    ],
    explanation: {
      en: "If x=2, then x^2=4. However, x^2=4 also holds when x=-2, so p is sufficient but not necessary for q.",
      zh: "当x=2时，一定有x^2=4；但x=-2时也有x^2=4，所以p是q的充分不必要条件。"
    }
  },
  "pep-high-s4-mc-042": {
    prompt: { en: "Solve x^2-5x+6<0.", zh: "解不等式x^2-5x+6<0。" },
    answer: "2<x<3",
    options: [
      { en: "2<x<3", zh: "2<x<3" },
      { en: "x<2 or x>3", zh: "x<2或x>3" },
      { en: "x≤2 or x≥3", zh: "x≤2或x≥3" },
      { en: "x>3", zh: "x>3" }
    ],
    explanation: {
      en: "Factor x^2-5x+6=(x-2)(x-3). The upward-opening quadratic is negative between its two roots, so 2<x<3.",
      zh: "因式分解得x^2-5x+6=(x-2)(x-3)。二次函数开口向上，在两个根之间取负值，所以2<x<3。"
    }
  },
  "pep-high-s4-fi-042": {
    prompt: {
      en: "The equation x^2-4x+m=0 has exactly one real root. Find m.",
      zh: "方程x^2-4x+m=0恰有一个实数根，求m。"
    },
    answer: "4",
    explanation: {
      en: "Exactly one real root requires the discriminant to be 0. Here (-4)^2-4m=0, so m=4.",
      zh: "恰有一个实数根时判别式必须为0。本题(-4)^2-4m=0，所以m=4。"
    }
  },
  "pep-high-s4-mc-002": {
    explanation: {
      en: `The vertex form has vertex ${math("(-2,-1)")}, so the axis of symmetry is ${math("x=-2")}.`,
      zh: `顶点式的顶点是 ${math("(-2,-1)")}，所以对称轴是 ${math("x=-2")}。`
    }
  },
  "pep-high-s4-fi-002": {
    explanation: {
      en: `Substitute ${math("x=3")}: ${math("f(3)=(3+2)^2-1=24")}.`,
      zh: `代入 ${math("x=3")}：${math("f(3)=(3+2)^2-1=24")}。`
    }
  },
  "pep-high-s4-sa-002": {
    explanation: {
      en: `The square term is nonnegative, so at ${math("x=-2")}, ${math("f(x)")} reaches its minimum ${math("-1")}.`,
      zh: `平方项非负，所以当 ${math("x=-2")} 时，${math("f(x)")} 取得最小值 ${math("-1")}。`
    }
  },
  "pep-high-s4-mc-043": {
    prompt: { en: "What is the domain of f(x)=1/(x-3)?", zh: "函数f(x)=1/(x-3)的定义域是什么？" },
    answer: "x≠3",
    options: [
      { en: "x≠3", zh: "x≠3" },
      { en: "x>3", zh: "x>3" },
      { en: "x<3", zh: "x<3" },
      { en: "x≥3", zh: "x≥3" }
    ],
    explanation: {
      en: "The denominator x-3 cannot equal 0, so x≠3.",
      zh: "分母x-3不能等于0，所以x≠3。"
    }
  },
  "pep-high-s4-mc-044": {
    prompt: { en: "What is the domain of f(x)=log_2(x-1)?", zh: "函数f(x)=log_2(x-1)的定义域是什么？" },
    answer: "x>1",
    options: [
      { en: "x>1", zh: "x>1" },
      { en: "x>0", zh: "x>0" },
      { en: "x≥1", zh: "x≥1" },
      { en: "x≠1", zh: "x≠1" }
    ],
    explanation: {
      en: "The argument must satisfy x-1>0, so x>1. The base 2 also satisfies 2>0 and 2≠1.",
      zh: "真数必须满足x-1>0，所以x>1；底数2也满足2>0且2≠1。"
    }
  },
  "pep-high-s4-mc-046": {
    prompt: {
      en: "Let vectors a=(1,2) and b=(t,-1). If a is perpendicular to b, find t.",
      zh: "已知向量a=(1,2)，b=(t,-1)。若a与b垂直，求t。"
    },
    answer: "2",
    options: [
      { en: "-2", zh: "-2" },
      { en: "0", zh: "0" },
      { en: "1", zh: "1" },
      { en: "2", zh: "2" }
    ],
    explanation: {
      en: "Perpendicular vectors satisfy a·b=0. Here 1·t+2·(-1)=0, so t=2.",
      zh: "垂直向量满足a·b=0。本题1·t+2·(-1)=0，所以t=2。"
    }
  },
  "pep-high-s4-mc-048": {
    prompt: {
      en: "Line l is perpendicular to plane α at P. Line m lies in plane α and passes through P. What is the relation between l and m?",
      zh: "直线l在点P处垂直于平面α，直线m在平面α内且经过P。l与m有什么位置关系？"
    },
    answer: "l is perpendicular to m.",
    acceptedAnswers: ["l垂直于m。"],
    options: [
      { en: "l is perpendicular to m.", zh: "l垂直于m。" },
      { en: "l is parallel to m.", zh: "l平行于m。" },
      { en: "l coincides with m.", zh: "l与m重合。" },
      { en: "The relation cannot be determined.", zh: "无法确定。" }
    ],
    explanation: {
      en: "A line perpendicular to a plane is perpendicular to every line in that plane through its foot P. Hence l is perpendicular to m.",
      zh: "一条直线垂直于一个平面时，它垂直于该平面内所有经过垂足P的直线，所以l垂直于m。"
    }
  },
  "pep-high-s4-mc-050": {
    prompt: { en: "If P(A)=3/8, find the probability of the complement of A.", zh: "若P(A)=3/8，求A的对立事件的概率。" },
    answer: "5/8",
    options: [
      { en: "3/8", zh: "3/8" },
      { en: "5/8", zh: "5/8" },
      { en: "3/5", zh: "3/5" },
      { en: "1/8", zh: "1/8" }
    ],
    explanation: {
      en: "An event and its complement have total probability 1, so the required probability is 1-3/8=5/8.",
      zh: "一个事件与它的对立事件概率之和为1，所以P(A的对立事件)=1-3/8=5/8。"
    }
  },
  "pep-high-s4-mc-010": {
    prompt: {
      en: "A bag has 4 red balls and 3 blue balls. What is the probability of drawing a red ball?",
      zh: "袋中有4个红球和3个蓝球。摸到红球的概率是多少？"
    }
  },
  "pep-high-s4-fi-020": {
    prompt: {
      en: "A bag has 3 red balls and 5 blue balls. What is the probability of drawing a red ball?",
      zh: "袋中有3个红球和5个蓝球。摸到红球的概率是多少？"
    }
  },
  "pep-high-s4-mc-030": {
    prompt: {
      en: "A bag has 2 red balls and 7 blue balls. What is the probability of drawing a red ball?",
      zh: "袋中有2个红球和7个蓝球。摸到红球的概率是多少？"
    }
  },
  "pep-high-s4-sa-010": {
    prompt: {
      en: "A bag contains 4 red balls and 3 blue balls. If every ball is treated as distinct, how many ordered pairs of balls can be drawn without replacement?",
      zh: "袋中有4个红球和3个蓝球。若每个球都视为不同，不放回依次取出两个球，共有多少种有序取法？"
    },
    explanation: {
      en: "There are 7 choices for the first ball and 6 remaining choices for the second, so the number of ordered pairs is 7×6=42.",
      zh: "第一个球有7种选择，第二个球有6种选择，所以有序取法共有7×6=42种。"
    }
  },
  "pep-high-s5-mc-041": {
    prompt: {
      en: "Let a=(1,2,-1) and b=(t,1,3). If a is perpendicular to b, find t.",
      zh: "已知向量a=(1,2,-1)，b=(t,1,3)。若a与b垂直，求t。"
    },
    answer: "1",
    options: [
      { en: "-1", zh: "-1" },
      { en: "0", zh: "0" },
      { en: "1", zh: "1" },
      { en: "2", zh: "2" }
    ],
    explanation: {
      en: "Perpendicular vectors have dot product 0. Thus t+2-3=0, so t=1.",
      zh: "垂直向量的数量积为0，因此t+2-3=0，所以t=1。"
    }
  },
  "pep-high-s5-mc-042": {
    prompt: {
      en: "For the circle x^2+y^2=25 and the line 3x+4y=25, what is their positional relationship?",
      zh: "圆x^2+y^2=25与直线3x+4y=25有什么位置关系？"
    },
    answer: "The line is tangent to the circle.",
    acceptedAnswers: ["直线与圆相切。"],
    options: [
      { en: "The line is tangent to the circle.", zh: "直线与圆相切。" },
      { en: "The line intersects the circle at two points.", zh: "直线与圆相交于两点。" },
      { en: "The line and circle have no common point.", zh: "直线与圆没有公共点。" },
      { en: "The line passes through the center of the circle.", zh: "直线经过圆心。" }
    ],
    explanation: {
      en: "The circle has center (0,0) and radius 5. The distance from the center to the line is 25/sqrt(3^2+4^2)=5, equal to the radius, so the line is tangent to the circle.",
      zh: "圆心为(0,0)，半径为5。圆心到直线的距离为25/sqrt(3^2+4^2)=5，等于半径，所以直线与圆相切。"
    }
  },
  "pep-high-s5-mc-044": {
    prompt: {
      en: `A geometric sequence has ${math("a_1=3")} and common ratio ${math("q=2")}. Find ${math("a_5")}.`,
      zh: `等比数列满足 ${math("a_1=3")}，公比 ${math("q=2")}。求 ${math("a_5")}。`
    },
    answer: "48",
    options: [
      { en: "24", zh: "24" },
      { en: "32", zh: "32" },
      { en: "48", zh: "48" },
      { en: "96", zh: "96" }
    ],
    explanation: {
      en: `Use ${math("a_n=a_1q^{n-1}")}: ${math("a_5=3\\times2^4=48")}.`,
      zh: `利用 ${math("a_n=a_1q^{n-1}")}，得 ${math("a_5=3\\times2^4=48")}。`
    }
  },
  "pep-high-s5-mc-045": {
    prompt: {
      en: "Find the minimum value of f(x)=x^2-4x+5 on the interval [0,5].",
      zh: "求函数f(x)=x^2-4x+5在区间[0,5]上的最小值。"
    },
    answer: "1",
    options: [
      { en: "0", zh: "0" },
      { en: "1", zh: "1" },
      { en: "5", zh: "5" },
      { en: "10", zh: "10" }
    ],
    explanation: {
      en: "Since f'(x)=2x-4, the interior critical point is x=2. Comparing f(0)=5, f(2)=1, and f(5)=10 shows that the minimum value is 1.",
      zh: "因为f'(x)=2x-4，所以区间内的临界点是x=2。比较f(0)=5、f(2)=1与f(5)=10，可知最小值为1。"
    }
  },
  "pep-high-s5-mc-005": {
    prompt: {
      en: `For ${math("f(x)=x^2+2x+1")}, find ${math("f'(2)")}.`,
      zh: `已知 ${math("f(x)=x^2+2x+1")}，求 ${math("f'(2)")}。`
    },
    explanation: {
      en: `Differentiate to get ${math("f'(x)=2x+2")}. Therefore ${math("f'(2)=2\times2+2=6")}.`,
      zh: `先求导得 ${math("f'(x)=2x+2")}，所以 ${math("f'(2)=2\times2+2=6")}。`
    }
  },
  "pep-high-s5-sa-005": {
    prompt: {
      en: `For ${math("f(x)=x^2+2x+1")}, solve ${math("f'(x)=0")}.`,
      zh: `已知 ${math("f(x)=x^2+2x+1")}，解 ${math("f'(x)=0")}。`
    },
    explanation: {
      en: `Differentiate to get ${math("f'(x)=2x+2")}. Solving ${math("2x+2=0")} gives ${math("x=-1")}.`,
      zh: `先求导得 ${math("f'(x)=2x+2")}。解 ${math("2x+2=0")}，得 ${math("x=-1")}。`
    }
  },
  "pep-high-s6-mc-037": {
    prompt: {
      en: "Let X follow a binomial distribution B(3,1/2). Find P(X=2).",
      zh: "设X服从二项分布B(3,1/2)，求P(X=2)。"
    },
    answer: "3/8",
    options: [
      { en: "1/8", zh: "1/8" },
      { en: "3/8", zh: "3/8" },
      { en: "1/2", zh: "1/2" },
      { en: "3/4", zh: "3/4" }
    ],
    explanation: {
      en: "For X~B(3,1/2), P(X=2)=C(3,2)(1/2)^2(1/2)=3/8.",
      zh: "由X~B(3,1/2)，得P(X=2)=C(3,2)(1/2)^2(1/2)=3/8。"
    }
  },
  "pep-high-s6-mc-038": {
    prompt: {
      en: "A dataset has Pearson correlation coefficient r=-0.92. Which interpretation is justified?",
      zh: "一组数据的皮尔逊相关系数r=-0.92。下列哪项解释合理？"
    },
    answer: "There is a strong negative linear association.",
    acceptedAnswers: ["存在较强的负线性相关关系。"],
    options: [
      { en: "There is a strong negative linear association.", zh: "存在较强的负线性相关关系。" },
      { en: "There is a strong positive linear association.", zh: "存在较强的正线性相关关系。" },
      { en: "There is almost no linear association.", zh: "几乎不存在线性相关关系。" },
      { en: "The value of x is proven to cause the value of y.", zh: "已经证明x的取值导致y的取值。" }
    ],
    explanation: {
      en: "Because r is close to -1, the data show a strong negative linear association. Correlation alone does not establish causation.",
      zh: "因为r接近-1，所以数据呈现较强的负线性相关关系；仅凭相关关系不能得出因果结论。"
    }
  },
  "pep-high-s6-mc-039": {
    prompt: {
      en: "On which set is f(x)=x^3-3x increasing?",
      zh: "函数f(x)=x^3-3x在哪个集合上单调递增？"
    },
    answer: "(-∞,-1)∪(1,∞)",
    options: [
      { en: "(-∞,-1)∪(1,∞)", zh: "(-∞,-1)∪(1,∞)" },
      { en: "(-1,1)", zh: "(-1,1)" },
      { en: "(-∞,1)", zh: "(-∞,1)" },
      { en: "(-1,∞)", zh: "(-1,∞)" }
    ],
    explanation: {
      en: "f'(x)=3x^2-3=3(x-1)(x+1). This derivative is positive when x<-1 or x>1, so f is increasing on (-∞,-1)∪(1,∞).",
      zh: "f'(x)=3x^2-3=3(x-1)(x+1)。当x<-1或x>1时，f'(x)>0，所以f在(-∞,-1)∪(1,∞)上单调递增。"
    }
  },
  "pep-high-s6-mc-004": {
    prompt: {
      en: `For ${math("f(x)=5x^2+x+1")}, find ${math("f'(1)")}.`,
      zh: `已知 ${math("f(x)=5x^2+x+1")}，求 ${math("f'(1)")}。`
    },
    explanation: {
      en: `Differentiate to get ${math("f'(x)=10x+1")}. Therefore ${math("f'(1)=10\times1+1=11")}.`,
      zh: `先求导得 ${math("f'(x)=10x+1")}，所以 ${math("f'(1)=10\times1+1=11")}。`
    }
  },
  "pep-high-s6-sa-004": {
    prompt: {
      en: `For ${math("f(x)=5x^2+x+1")}, solve ${math("f'(x)=0")}.`,
      zh: `已知 ${math("f(x)=5x^2+x+1")}，解 ${math("f'(x)=0")}。`
    },
    explanation: {
      en: `Differentiate to get ${math("f'(x)=10x+1")}. Solving ${math("10x+1=0")} gives ${math("x=-0.1")}.`,
      zh: `先求导得 ${math("f'(x)=10x+1")}。解 ${math("10x+1=0")}，得 ${math("x=-0.1")}。`
    }
  },
  "pep-high-s6-mc-040": {
    prompt: {
      en: "How many intersection points do the line y=x and the parabola y=x^2 have?",
      zh: "直线y=x与抛物线y=x^2有几个交点？"
    },
    answer: "2",
    options: [
      { en: "0", zh: "0" },
      { en: "1", zh: "1" },
      { en: "2", zh: "2" },
      { en: "3", zh: "3" }
    ],
    explanation: {
      en: "Set x=x^2. Then x(x-1)=0, so x=0 or x=1, giving two distinct intersection points.",
      zh: "联立得x=x^2，即x(x-1)=0，所以x=0或x=1，对应两个不同的交点。"
    }
  },
  "pep-high-s6-mc-041": {
    prompt: {
      en: "If P(A)=7/20, find the probability of the complement of A.",
      zh: "若P(A)=7/20，求A的对立事件的概率。"
    },
    answer: "13/20",
    options: [
      { en: "7/20", zh: "7/20" },
      { en: "13/20", zh: "13/20" },
      { en: "7/13", zh: "7/13" },
      { en: "1/20", zh: "1/20" }
    ],
    explanation: {
      en: "An event and its complement have total probability 1, so P(A complement)=1-7/20=13/20.",
      zh: "一个事件与其对立事件的概率之和为1，所以P(A的对立事件)=1-7/20=13/20。"
    }
  },
  "pep-high-s6-mc-042": {
    prompt: {
      en: `An arithmetic sequence has ${math("a_1=2")} and common difference ${math("d=3")}. Find ${math("S_{10}")}.`,
      zh: `等差数列满足 ${math("a_1=2")}，公差 ${math("d=3")}。求 ${math("S_{10}")}。`
    },
    answer: "155",
    options: [
      { en: "145", zh: "145" },
      { en: "150", zh: "150" },
      { en: "155", zh: "155" },
      { en: "160", zh: "160" }
    ],
    explanation: {
      en: `First find ${math("a_{10}=2+9\\times3=29")}. Then ${math("S_{10}=10(2+29)/2=155")}.`,
      zh: `先求 ${math("a_{10}=2+9\\times3=29")}，再由 ${math("S_{10}=10(2+29)/2=155")} 得到所求的和。`
    }
  },
  "pep-high-s6-fi-014": {
    prompt: {
      en: `For ${math("f(x)=4x^3")}, find ${math("f'(3)")}.`,
      zh: `已知 ${math("f(x)=4x^3")}，求 ${math("f'(3)")}。`
    },
    explanation: {
      en: `The power rule gives ${math("f'(x)=12x^2")}; hence ${math("f'(3)=12\\times3^2=108")}.`,
      zh: `由幂函数求导法则得 ${math("f'(x)=12x^2")}，所以 ${math("f'(3)=12\\times3^2=108")}。`
    }
  },
  "pep-high-s6-sa-007": {
    prompt: {
      en: "An event has 3 favorable outcomes among 9 equally likely outcomes. Find its probability.",
      zh: "某事件在9个等可能结果中有3个有利结果，求该事件的概率。"
    },
    explanation: {
      en: `Probability equals favorable outcomes divided by all equally likely outcomes: ${math("3/9=1/3")}.`,
      zh: `概率等于有利结果数除以等可能结果总数：${math("3/9=1/3")}。`
    }
  },
  "pep-high-s6-sa-014": {
    prompt: {
      en: "An event has 3 favorable outcomes among 8 equally likely outcomes. Find its probability.",
      zh: "某事件在8个等可能结果中有3个有利结果，求该事件的概率。"
    },
    explanation: {
      en: `Probability equals favorable outcomes divided by all equally likely outcomes: ${math("3/8")}.`,
      zh: `概率等于有利结果数除以等可能结果总数：${math("3/8")}。`
    }
  },
  "pep-high-s6-sa-006": {
    prompt: {
      en: "A bag contains 4 red balls and 4 blue balls. Treating all 8 balls as distinct, how many ordered pairs can be drawn without replacement?",
      zh: "袋中有4个红球和4个蓝球。若把8个球都视为不同，不放回依次取出两个球，共有多少种有序取法？"
    },
    explanation: {
      en: `There are 8 choices for the first ball and 7 remaining choices for the second, so there are ${math("8\\times7=56")} ordered pairs.`,
      zh: `第一个球有8种选择，第二个球有7种选择，所以共有 ${math("8\\times7=56")} 种有序取法。`
    }
  },
  "pep-high-s6-sa-013": {
    prompt: {
      en: "A bag contains 4 red balls and 3 blue balls. Treating all 7 balls as distinct, how many ordered pairs can be drawn without replacement?",
      zh: "袋中有4个红球和3个蓝球。若把7个球都视为不同，不放回依次取出两个球，共有多少种有序取法？"
    },
    explanation: {
      en: `There are 7 choices for the first ball and 6 remaining choices for the second, so there are ${math("7\\times6=42")} ordered pairs.`,
      zh: `第一个球有7种选择，第二个球有6种选择，所以共有 ${math("7\\times6=42")} 种有序取法。`
    }
  },
  "pep-high-s5-sa-003": {
    prompt: {
      en: `For the parabola ${math("y^2=10x")}, find ${math("p")} in ${math("y^2=2px")}.`,
      zh: `已知抛物线 ${math("y^2=10x")}，求 ${math("p")} 在 ${math("y^2=2px")} 中的值。`
    }
  }
};

function applyMainlandPepHighManualContentQaOverride(question: Question): Question {
  return {
    ...question,
    ...mainlandPepHighManualContentQaOverrides[question.id]
  };
}

export const mainlandPepHighSeedV1Questions: Question[] = [
  ...seedV1QuestionsForGrade("S4"),
  ...seedV1QuestionsForGrade("S5"),
  ...seedV1QuestionsForGrade("S6")
].map(applyMainlandPepHighManualContentQaOverride);

export const mainlandPepHighRagV2Questions: Question[] = [
  ...ragV2QuestionsForGrade("S4"),
  ...ragV2QuestionsForGrade("S5"),
  ...ragV2QuestionsForGrade("S6")
].map(applyMainlandPepHighManualContentQaOverride);

export const mainlandPepHighRagV3Questions: Question[] = [
  ...ragV3QuestionsForGrade("S4"),
  ...ragV3QuestionsForGrade("S5"),
  ...ragV3QuestionsForGrade("S6")
].map(applyMainlandPepHighManualContentQaOverride);

export const mainlandPepHighRagV4Questions: Question[] = [
  ...ragV4QuestionsForGrade("S4"),
  ...ragV4QuestionsForGrade("S5"),
  ...ragV4QuestionsForGrade("S6")
].map(applyMainlandPepHighManualContentQaOverride);

// Backward-compatible alias for older QA notes that predate public promotion.
export const mainlandPepHighRagV4CandidateQuestions = mainlandPepHighRagV4Questions;

export const mainlandPepHighQuestions: Question[] = [
  ...mainlandPepHighSeedV1Questions,
  ...mainlandPepHighRagV2Questions,
  ...mainlandPepHighRagV3Questions,
  ...mainlandPepHighRagV4Questions
];

export const mainlandPepHighQuestionGenerationMetadata: Record<string, MainlandPepHighQuestionGenerationMetadata> =
  Object.fromEntries([
    ...mainlandPepHighSeedV1Questions.map((question) => [question.id, metadataForQuestion(question, "seed-v1")] as const),
    ...mainlandPepHighRagV2Questions.map((question) => [question.id, metadataForQuestion(question, "rag-v2")] as const),
    ...mainlandPepHighRagV3Questions.map((question) => [question.id, metadataForQuestion(question, "rag-v3")] as const),
    ...mainlandPepHighRagV4Questions.map((question) => [question.id, metadataForQuestion(question, "rag-v4")] as const)
  ]);

export const mainlandPepHighRagV4QuestionGenerationMetadata: Record<string, MainlandPepHighQuestionGenerationMetadata> =
  Object.fromEntries(
    mainlandPepHighRagV4Questions.map((question) => [question.id, metadataForQuestion(question, "rag-v4")] as const)
  );

// Backward-compatible alias for older QA notes that predate public promotion.
export const mainlandPepHighRagV4CandidateQuestionGenerationMetadata = mainlandPepHighRagV4QuestionGenerationMetadata;
