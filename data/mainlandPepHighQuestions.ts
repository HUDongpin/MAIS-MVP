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
  { grade: "S4", topicId: "pep-high-s4-sets-logic", chapter: "集合与常用逻辑用语", family: "sets", difficulty: "Foundation" },
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
  { grade: "S6", topicId: "pep-high-s6-derivative-synthesis", chapter: "一元函数的导数及其应用", family: "derivatives", difficulty: "Challenge" },
  { grade: "S6", topicId: "pep-high-s6-analytic-geometry-synthesis", chapter: "圆锥曲线的方程", family: "conics", difficulty: "Challenge" },
  { grade: "S6", topicId: "pep-high-s6-probability-statistics-synthesis", chapter: "概率", family: "probability", difficulty: "Challenge" },
  { grade: "S6", topicId: "pep-high-s6-exam-practice", chapter: "综合复习与跨章节建模", family: "exam-synthesis", difficulty: "Exam" }
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
  { en: "concept-check", zh: "概念辨析" },
  { en: "parameter discussion", zh: "参数讨论" },
  { en: "counterexample check", zh: "反例判断" },
  { en: "graph-information", zh: "图像信息" },
  { en: "modeling context", zh: "建模情境" },
  { en: "misconception diagnosis", zh: "误区诊断" },
  { en: "synthesis step", zh: "综合拆步" }
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
  foundation: "Foundation",
  core: "Core",
  exam: "Exam",
  challenge: "Challenge"
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
      en: `Original ${scenario.en} item ${promptNumber}: ${draft.prompt.en}`,
      zh: `原创${scenario.zh}练习 ${promptNumber}：${draft.prompt.zh}`
    },
    explanation: {
      en: appendSentence(
        draft.explanation.en,
        `This original MAIS item targets ${itemTypeLabel}; check the conditions to avoid ${misconception}.`
      ),
      zh: appendSentence(
        draft.explanation.zh,
        `这道 MAIS 原创练习同时训练${itemTypeTag}，解完后要回到题设条件复核。`
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
  const patternCard = examPatternCardsForSpec(spec)[0];
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
  const evidenceLabel = cards.map((card) => card.id).join(", ");
  const patternLabel = patternCard ? `; exam pattern ${patternCard.id}` : "";
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
      en: `RAG-v3 ${mode.en} ${contextIndex + 1} for ${spec.chapter}: ${mode.en} ${typeLabel.en} focus. ${draft.prompt.en}`,
      zh: `RAG-v3 ${mode.zh} ${contextIndex + 1}（${spec.chapter}）：${mode.zh}${typeLabel.zh}任务：${draft.prompt.zh}`
    },
    explanation: {
      en: appendSentence(
        appendSentence(draft.explanation.en, answerSentenceEn),
        `This original MAIS item targets ${itemTypeLabel} using safe evidence cards ${evidenceLabel}${patternLabel}; check for ${misconception}.`
      ),
      zh: appendSentence(
        appendSentence(draft.explanation.zh, answerSentenceZh),
        `本题依据安全 RAG 卡片抽象生成，训练${itemTypeTag}，并提醒避免${misconception}。`
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
    "short-answer": { en: "Give the result with a brief justification.", zh: "写出结果并给出简要理由。" }
  };
  const promptFrame =
    ragV4StudentFrames[(contextIndex + spec.chapter.length + type.length) % ragV4StudentFrames.length];
  const reasoningFrame =
    ragV4ReasoningFrames[(contextIndex * 2 + spec.topicId.length + typePrefixes[type].length) % ragV4ReasoningFrames.length];
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

  return {
    ...draft,
    prompt: {
      en: `${promptFrame.en} ${responseFrame[type].en} ${reasoningFrame.en} ${draft.prompt.en}`,
      zh: `${promptFrame.zh}${responseFrame[type].zh}${reasoningFrame.zh}${draft.prompt.zh}`
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
    prompt: {
      en: `In ${math(`U=\\{1,2,\\ldots,${limit}\\}`)}, let ${math(`A`)} be the multiples of ${math(String(a))} and ${math("B")} be the multiples of ${math(String(b))}. ${taskEn}.`,
      zh: `在 ${math(`U=\\{1,2,\\ldots,${limit}\\}`)} 中，${math("A")} 是 ${math(String(a))} 的倍数组成的集合，${math("B")} 是 ${math(String(b))} 的倍数组成的集合。${taskZh}。`
    },
    answer: String(answer),
    options: type === "multiple-choice" ? numericOptions(answer) : undefined,
    explanation: {
      en: `List the two sets in the finite universe, then count the requested part. The result is ${answer}.`,
      zh: `先在有限全集中列出两个集合，再数出所求部分，结果为 ${answer}。`
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
    answer: String(answer),
    options: type === "multiple-choice" ? numericOptions(answer) : undefined,
    explanation: {
      en: `Vertex form shows the vertex is ${math(`(${h},${k})`)}. Substitute values only when the prompt asks for a function value.`,
      zh: `顶点式可直接看出顶点为 ${math(`(${h},${k})`)}。若题目要求函数值，再代入对应的 ${math("x")}。`
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
    explanation: {
      en: `Use the function rule directly. Substitution or solving the resulting linear equation gives ${formatNumber(answer)}.`,
      zh: `直接使用函数对应法则，代入或解一元一次方程可得 ${formatNumber(answer)}。`
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
  return {
    prompt: type === "short-answer"
      ? {
          en: `For ${math(`y=${amplitude}\\sin ${frequency}x`)}, find the amplitude.`,
          zh: `对于 ${math(`y=${amplitude}\\sin ${frequency}x`)}，求振幅。`
        }
      : type === "fill-in"
        ? {
            en: `For ${math(`y=${amplitude}\\sin ${frequency}x`)}, give the coefficient of ${math("x")} inside the sine function.`,
            zh: `对于 ${math(`y=${amplitude}\\sin ${frequency}x`)}，写出正弦函数内部 ${math("x")} 的系数。`
          }
        : {
            en: `Find ${math(`${chosen.fn}${chosen.label}`)}.`,
            zh: `求 ${math(`${chosen.fn}${chosen.label}`)}。`
          },
    answer: String(answer),
    options: type === "multiple-choice" ? localizedOptions([String(answer), "0", "2", "sqrt(3)/2"]) : undefined,
    explanation: {
      en: `Use standard-angle values or read the graph parameter from ${math(`y=A\\sin kx`)}.`,
      zh: `使用特殊角取值，或从 ${math(`y=A\\sin kx`)} 中读取图像参数。`
    }
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
    explanation: {
      en: `Multiply corresponding coordinates and add. For length squared, add the squares of the coordinates.`,
      zh: `数量积是对应坐标乘积之和；模长平方是各坐标平方之和。`
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
  return {
    prompt: type === "short-answer"
      ? {
          en: `Let ${math(`z=(${first})+(${second})`)}. Find ${math("|z|^2")}.`,
          zh: `设 ${math(`z=(${first})+(${second})`)}，求 ${math("|z|^2")}。`
        }
      : type === "fill-in"
        ? {
            en: `Find the imaginary coefficient of ${math(`(${first})+(${second})`)}.`,
            zh: `求 ${math(`(${first})+(${second})`)} 的虚部系数。`
          }
        : {
            en: `Find the real part of ${math(`(${first})+(${second})`)}.`,
            zh: `求 ${math(`(${first})+(${second})`)} 的实部。`
          },
    answer: String(answer),
    options: type === "multiple-choice" ? numericOptions(answer) : undefined,
    explanation: {
      en: `Add real parts and imaginary coefficients separately, then use ${math("|z|^2=a^2+b^2")} if needed.`,
      zh: `先分别合并实部和虚部系数，需要模长平方时再用 ${math("|z|^2=a^2+b^2")}。`
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
    explanation: {
      en: `Use the cuboid formulas for surface area, volume, or the 3D Pythagorean theorem.`,
      zh: `根据题意使用长方体表面积、体积公式，或空间勾股关系。`
    }
  };
}

function draftStatistics(type: Exclude<QuestionType, "graph">, n: number): QuestionDraft {
  const start = 2 + (n % 6);
  const values = [start, start + 2, start + 4];
  const mean = start + 2;
  const range = 4;
  const varianceTimesThree = values.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  const answer = type === "short-answer" ? varianceTimesThree : type === "fill-in" ? range : mean;
  return {
    prompt: {
      en: `For the data ${math(values.join(", "))}, ${type === "short-answer" ? "find three times the variance." : type === "fill-in" ? "find the range." : "find the mean."}`,
      zh: `对于数据 ${math(values.join(", "))}，${type === "short-answer" ? "求方差的三倍。" : type === "fill-in" ? "求极差。" : "求平均数。"}`
    },
    answer: String(answer),
    options: type === "multiple-choice" ? numericOptions(answer) : undefined,
    explanation: {
      en: `Summarize the three data values by the requested statistic and check units consistently.`,
      zh: `按题目指定的统计量处理三个数据，并保持计算口径一致。`
    }
  };
}

function draftProbability(type: Exclude<QuestionType, "graph">, n: number): QuestionDraft {
  const red = 2 + (n % 4);
  const blue = 3 + (n % 5);
  const total = red + blue;
  const redProbability = fraction(red, total);
  const notBlue = redProbability;
  const orderedPairs = total * (total - 1);
  const answer = type === "short-answer" ? String(orderedPairs) : type === "fill-in" ? notBlue : redProbability;
  return {
    prompt: type === "short-answer"
      ? {
          en: `A bag has ${red} red balls and ${blue} blue balls. Two balls are drawn in order without replacement. How many ordered color-position outcomes are possible at ball level?`,
          zh: `袋中有 ${red} 个红球和 ${blue} 个蓝球，不放回依次摸出两个球。按具体球区分时，有多少种有序结果？`
        }
      : {
          en: `A bag has ${red} red balls and ${blue} blue balls. Find ${math("P(\\text{red})")}.`,
          zh: `袋中有 ${red} 个红球和 ${blue} 个蓝球，求 ${math("P(\\text{摸到红球})")}。`
        },
    answer,
    options: type === "multiple-choice" ? fractionOptions(answer, red, total) : undefined,
    explanation: {
      en: `Build the sample space first. Probability is favorable outcomes divided by total outcomes.`,
      zh: `先建立样本空间，概率等于有利结果数除以总结果数。`
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
    explanation: {
      en: `Use slope from two points or read the circle radius from standard form.`,
      zh: `斜率由两点坐标计算；圆的半径从标准方程中读取。`
    }
  };
}

function draftConics(type: Exclude<QuestionType, "graph">, n: number): QuestionDraft {
  const a = 4 + (n % 5);
  const b = 2 + (n % 3);
  const cSquared = a ** 2 - b ** 2;
  const latus = 2 + (n % 6);
  const answer = type === "short-answer" ? latus : type === "fill-in" ? cSquared : 2 * a;
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
    explanation: {
      en: `For an ellipse, use ${math("c^2=a^2-b^2")} and major-axis length ${math("2a")}. For ${math("y^2=2px")}, read ${math("p")}.`,
      zh: `椭圆中使用 ${math("c^2=a^2-b^2")} 和长轴长 ${math("2a")}；抛物线 ${math("y^2=2px")} 可直接读出 ${math("p")}。`
    }
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
    explanation: {
      en: `Use ${math("a_n=a_1+(n-1)d")} and the arithmetic-sum formula when needed.`,
      zh: `使用 ${math("a_n=a_1+(n-1)d")}；需要求和时再用等差数列求和公式。`
    }
  };
}

function draftDerivatives(type: Exclude<QuestionType, "graph">, n: number): QuestionDraft {
  const a = 1 + (n % 5);
  const b = (n % 7) - 3;
  const x = 1 + (n % 4);
  const derivativeValue = 2 * a * x + b;
  const stationaryX = -b / (2 * a);
  const answer = type === "short-answer" ? stationaryX : derivativeValue;
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
    answer: formatNumber(answer),
    options: type === "multiple-choice" ? numericOptions(answer) : undefined,
    explanation: {
      en: `Differentiate first: ${math(`f'(x)=${derivativeExpression}`)}. Then substitute or solve the linear equation.`,
      zh: `先求导得 ${math(`f'(x)=${derivativeExpression}`)}，再代入或解一元一次方程。`
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
    explanation: {
      en: `Decide whether order matters. Use combinations when order does not matter and permutations when it does.`,
      zh: `先判断是否考虑顺序：不考虑顺序用组合，考虑顺序用排列。`
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
    explanation: {
      en: `For a binomial variable, ${math("E(X)=np")} and ${math("D(X)=np(1-p)")}.`,
      zh: `二项分布中，${math("E(X)=np")}，${math("D(X)=np(1-p)")}。`
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
  const regression = linearExpression(slope, intercept);
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
    explanation: {
      en: `Substitute into the regression equation. Residual equals observed value minus predicted value.`,
      zh: `代入回归方程求预测值；残差等于观测值减预测值。`
    }
  };
}

function draftExamSynthesis(type: Exclude<QuestionType, "graph">, n: number): QuestionDraft {
  const a = 1 + (n % 4);
  const x = 2 + (n % 5);
  const derivativeValue = 3 * a * x ** 2;
  const probabilityAnswer = fraction(2 + (n % 3), 7 + (n % 5));
  if (type === "fill-in") {
    return {
      prompt: {
        en: `An original mixed-practice model uses ${math(`f(x)=${a}x^3`)}. Find ${math(`f'(${x})`)}.`,
        zh: `一个原创综合练习模型中，${math(`f(x)=${a}x^3`)}。求 ${math(`f'(${x})`)}。`
      },
      answer: String(derivativeValue),
      explanation: {
        en: `Use the power rule first, then substitute the given value of ${math("x")}.`,
        zh: `先用幂函数求导法则，再代入给定的 ${math("x")} 值。`
      }
    };
  }
  if (type === "short-answer") {
    return {
      prompt: {
        en: `In an original review task, a favorable event has ${2 + (n % 3)} outcomes from ${7 + (n % 5)} equally likely outcomes. Find the probability.`,
        zh: `在一道原创综合练习中，某事件在 ${7 + (n % 5)} 个等可能结果中有 ${2 + (n % 3)} 个有利结果。求该事件的概率。`
      },
      answer: probabilityAnswer,
      explanation: {
        en: `Use favorable outcomes divided by total equally likely outcomes, then simplify if possible.`,
        zh: `用有利结果数除以等可能结果总数，并在可能时约分。`
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
  if (ragDifficulty) return difficultyByBand[ragDifficulty] ?? "Core";
  return examPatternChapters.has(spec.chapter) ? "Exam" : "Core";
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

export const mainlandPepHighSeedV1Questions: Question[] = [
  ...seedV1QuestionsForGrade("S4"),
  ...seedV1QuestionsForGrade("S5"),
  ...seedV1QuestionsForGrade("S6")
];

export const mainlandPepHighRagV2Questions: Question[] = [
  ...ragV2QuestionsForGrade("S4"),
  ...ragV2QuestionsForGrade("S5"),
  ...ragV2QuestionsForGrade("S6")
];

export const mainlandPepHighRagV3Questions: Question[] = [
  ...ragV3QuestionsForGrade("S4"),
  ...ragV3QuestionsForGrade("S5"),
  ...ragV3QuestionsForGrade("S6")
];

export const mainlandPepHighRagV4Questions: Question[] = [
  ...ragV4QuestionsForGrade("S4"),
  ...ragV4QuestionsForGrade("S5"),
  ...ragV4QuestionsForGrade("S6")
];

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
