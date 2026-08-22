import questionPackJson from "./generated-content/mainland-pep-junior-generated-bank-v2-1200/question-pack.json";
import { mainlandPepJuniorTopics } from "./mainlandPepJuniorTopics";
import { mapDifficultyToActive } from "@/lib/difficulty";
import { normalizeQuestionDiagram, validateQuestionDiagram } from "@/lib/questionFigure";
import type { DifficultyRecord, GradeId, LocalizedText, MainlandPepSemester, Question, QuestionDiagram, QuestionType } from "@/types";

type MainlandPepJuniorGeneratedBatch = "junior-rag-v2-1200";

type GeneratedQuestion = {
  id: string;
  batch: MainlandPepJuniorGeneratedBatch;
  grade: GradeId;
  semester: MainlandPepSemester;
  knowledgePointId: string;
  unitTitle: string;
  type: QuestionType;
  difficulty: DifficultyRecord;
  promptZhHans: string;
  optionsZhHans?: string[];
  answer: string;
  acceptedAnswers?: string[];
  explanationZhHans: string;
  diagram?: unknown;
  evidenceCardIds: string[];
  paperPatternCardIds: string[];
  examPatternCardIds: string[];
  sourceDistanceStatus: "passed" | "needs-review";
  mathQaStatus: "pass" | "needs-review";
  reviewNotes: string;
};

type GeneratedQuestionPack = {
  questions: GeneratedQuestion[];
};

export type MainlandPepJuniorQuestionGenerationMetadata = {
  batch: MainlandPepJuniorGeneratedBatch;
  grade: GradeId;
  semester: MainlandPepSemester;
  topicId: string;
  type: QuestionType;
  evidenceCardIds: string[];
  paperPatternCardIds: string[];
  examPatternCardIds: string[];
  sourceDistanceStatus: "passed" | "needs-review";
  mathQaStatus: "pass" | "needs-review";
  independentAnswer: string;
};

const questionPack = questionPackJson as GeneratedQuestionPack;
const mainlandPepProfile = { region: "MAINLAND" as const, publisher: "MAINLAND_PEP" as const };
const topicById = new Map(mainlandPepJuniorTopics.map((topic) => [topic.id, topic]));

type TranslationRule = {
  pattern: RegExp;
  translate: (match: RegExpMatchArray) => string;
};

function visibleMath(value: string) {
  return value
    .replace(/℃/g, "°C")
    .replace(/厘米/g, " cm")
    .replace(/米/g, " m")
    .replace(/元/g, " yuan")
    .replace(/或/g, " or ")
    .replace(/第([一二三四])象限/g, (_, quadrant: string) => {
      const labels: Record<string, string> = { 一: "Quadrant I", 二: "Quadrant II", 三: "Quadrant III", 四: "Quadrant IV" };
      return labels[quadrant] ?? `Quadrant ${quadrant}`;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function translateVisibleAnswer(value: string) {
  return visibleMath(value);
}

function localized(value: string): LocalizedText {
  return { en: translateVisibleAnswer(value), zh: value, zhHans: value };
}

function translatedText(en: string, zhHans: string): LocalizedText {
  return { en, zh: zhHans, zhHans };
}

type MainlandPepJuniorManualContentQaOverride = Partial<
  Pick<Question, "prompt" | "options" | "answer" | "acceptedAnswers" | "explanation">
>;

const mainlandPepJuniorManualContentQaOverrides: Record<string, MainlandPepJuniorManualContentQaOverride> = {
  "pep-junior-v2-s1-k03-mc-002": {
    prompt: translatedText(
      "Given distinct points A and B, which statement about lines, rays, and segments is correct?",
      "已知点A、B不重合，关于直线、射线和线段，下列说法正确的是？"
    ),
    options: [
      translatedText(
        "Segment AB and segment BA represent the same segment.",
        "线段AB与线段BA表示同一条线段。"
      ),
      translatedText(
        "Ray AB and ray BA represent the same ray.",
        "射线AB与射线BA表示同一条射线。"
      ),
      translatedText(
        "Line AB has two endpoints.",
        "直线AB有两个端点。"
      ),
      translatedText(
        "Ray AB extends infinitely in both directions.",
        "射线AB向两个方向无限延伸。"
      )
    ],
    answer: "Segment AB and segment BA represent the same segment.",
    acceptedAnswers: [],
    explanation: translatedText(
      "A segment is determined by its two endpoints and has no direction, so AB and BA name the same segment. Rays AB and BA have different endpoints and directions; a line has no endpoints; and a ray extends infinitely in only one direction.",
      "线段由两个端点确定，没有方向，所以线段AB与线段BA表示同一条线段。射线AB与射线BA的端点和方向不同；直线没有端点；射线只向一个方向无限延伸。"
    )
  },
  "pep-junior-v2-s2-k07-mc-001": {
    explanation: translatedText(
      "Since 2+7=9 and 2×7=14, the factorization is (x+2)(x+7).",
      "2+7=9，2×7=14，所以分解为(x+2)(x+7)。"
    )
  },
  "pep-junior-v2-s2-k07-fi-002": {
    prompt: translatedText(
      "Calculate 4x·3x = ____.",
      "计算：4x·3x=____。"
    ),
    explanation: translatedText(
      "Multiply the coefficients and add the exponents of x: 4x·3x=12x^2.",
      "系数相乘，同底数幂的指数相加：4x·3x=12x^2。"
    )
  },
  "pep-junior-v2-s3-k10-mc-002": {
    prompt: translatedText(
      "In one circle, O is the center and A, B, and C lie on the circle. Central angle AOB and inscribed angle ACB subtend the same arc AB. If angle AOB is 80°, what is angle ACB?",
      "在同一个圆中，O是圆心，A、B、C在圆上。圆心角∠AOB与圆周角∠ACB所对的都是弧AB。若∠AOB=80°，则∠ACB是多少度？"
    ),
    options: ["20°", "40°", "80°", "160°"].map(localized),
    answer: "40°",
    acceptedAnswers: ["40", "40度"],
    explanation: translatedText(
      "An inscribed angle equals half the central angle subtending the same arc, so angle ACB=80°÷2=40°.",
      "同弧所对的圆周角等于圆心角的一半，所以∠ACB=80°÷2=40°。"
    )
  },
  "pep-junior-v2-s3-k11-fi-002": {
    prompt: translatedText(
      "For two similar triangles, the larger-to-smaller corresponding-side ratio is 4:1. A side in the smaller triangle is 19 cm. What is the corresponding side in the larger triangle?",
      "两个相似三角形中，大三角形与小三角形对应边的比是4:1。小三角形的一条边长19厘米，大三角形的对应边长多少厘米？"
    )
  },
  "pep-junior-v2-s3-k11-sa-001": {
    prompt: translatedText(
      "The angle of elevation from an observer's eye to the top of a flagpole is 45°, and the horizontal distance to the flagpole is 93 m. Ignoring the observer's eye height above the ground, about how tall is the flagpole?",
      "测量者眼睛看向旗杆顶端的仰角为45°，测量点到旗杆底部的水平距离为93米。忽略测量者眼睛离地的高度，旗杆高约多少米？"
    )
  }
};

function translateWithRules(value: string, rules: TranslationRule[], fallback: string) {
  for (const rule of rules) {
    const match = value.match(rule.pattern);
    if (match) return rule.translate(match);
  }
  return fallback;
}

const promptRules: TranslationRule[] = [
  {
    pattern: /^某地清晨气温为(-?\d+)℃，中午上升(\d+)℃，傍晚又下降(\d+)℃。傍晚气温是多少？$/,
    translate: ([, start, rise, fall]) =>
      `The temperature is ${start}°C at dawn, rises by ${rise}°C at noon, then falls by ${fall}°C in the evening. What is the evening temperature?`
  },
  {
    pattern: /^数轴上点A表示(-?\d+)，点B表示(-?\d+)。A、B两点之间的距离是____。$/,
    translate: ([, left, right]) => `Point A is at ${left} and point B is at ${right} on a number line. The distance AB is ____.`
  },
  { pattern: /^化简：(.+)。$/, translate: ([, expression]) => `Simplify ${visibleMath(expression)}.` },
  { pattern: /^解方程：(.+)。x=____。$/, translate: ([, equation]) => `Solve ${visibleMath(equation)}. x = ____.` },
  {
    pattern: /^每本练习本x元，买(\d+)本后又花(\d+)元买笔，共用(\d+)元。写出求x的方程。$/,
    translate: ([, books, penCost, total]) =>
      `Each notebook costs x yuan. After buying ${books} notebooks and spending ${penCost} yuan on pens, the total is ${total} yuan. Write the equation for x.`
  },
  {
    pattern: /^两个角组成平角，其中一个角是(\d+)°，另一个角是多少？$/,
    translate: ([, angle]) => `Two angles form a straight angle. One angle is ${angle}°. What is the other angle?`
  },
  {
    pattern: /^线段AB长(\d+)厘米，点C是AB的中点。AC=____。$/,
    translate: ([, length]) => `Segment AB is ${length} cm long, and C is the midpoint of AB. AC = ____.`
  },
  {
    pattern: /^两个角互余，其中一个角是(\d+)°。求另一个角的度数。$/,
    translate: ([, angle]) => `Two angles are complementary. One angle is ${angle}°. Find the other angle.`
  },
  {
    pattern: /^点P\((-?\d+),(-?\d+)\)先向右平移(\d+)个单位，再向下平移(\d+)个单位，所得点的坐标是？$/,
    translate: ([, x, y, right, down]) =>
      `Point P(${x},${y}) is translated ${right} ${right === "1" ? "unit" : "units"} right and ${down} ${down === "1" ? "unit" : "units"} down. What are the new coordinates?`
  },
  {
    pattern: /^两条平行直线被一条截线所截，一组同位角中一个角为(\d+)°，另一个同位角为____。$/,
    translate: ([, angle]) =>
      `Two parallel lines are cut by a transversal. One corresponding angle is ${angle}°. The other corresponding angle is ____.`
  },
  {
    pattern: /^点Q\((-?\d+),(-?\d+)\)位于哪个象限？$/,
    translate: ([, x, y]) => `Which quadrant contains point Q(${x},${y})?`
  },
  { pattern: /^解不等式：(.+)。$/, translate: ([, inequality]) => `Solve the inequality ${visibleMath(inequality)}.` },
  {
    pattern: /^方程组x\+y=(-?\d+)，x-y=(-?\d+)的解是____。$/,
    translate: ([, sum, difference]) => `For the system x+y=${sum}, x-y=${difference}, the solution is ____.`
  },
  {
    pattern: /^某小组三次测量的数据分别是(\d+)、(\d+)、(\d+)。求这三次数据的平均数。$/,
    translate: ([, a, b, c]) => `A group records three measurements: ${a}, ${b}, and ${c}. Find their mean.`
  },
  {
    pattern: /^三角形的两个内角分别为(\d+)°和(\d+)°，第三个内角是多少？$/,
    translate: ([, a, b]) => `Two angles of a triangle are ${a}° and ${b}°. What is the third angle?`
  },
  {
    pattern: /^等腰三角形的顶角为(\d+)°，每个底角为____。$/,
    translate: ([, angle]) => `An isosceles triangle has vertex angle ${angle}°. Each base angle is ____.`
  },
  {
    pattern: /^在△ABC和△DEF中，AB=DE=(\d+)厘米，BC=EF=(\d+)厘米，AC=DF=(\d+)厘米。可用哪一种判定说明两个三角形全等？$/,
    translate: ([, ab, bc, ac]) =>
      `In triangles ABC and DEF, AB=DE=${ab} cm, BC=EF=${bc} cm, and AC=DF=${ac} cm. Which congruence criterion proves the triangles congruent?`
  },
  { pattern: /^因式分解：(.+)。$/, translate: ([, expression]) => `Factor ${visibleMath(expression)}.` },
  { pattern: /^计算：(.+)=____。$/, translate: ([, expression]) => `Calculate ${visibleMath(expression)} = ____.` },
  { pattern: /^计算：(.+)。$/, translate: ([, expression]) => `Calculate ${visibleMath(expression)}.` },
  {
    pattern: /^化简分式(.+)，并注明x不能等于什么。$/,
    translate: ([, expression]) => `Simplify the algebraic fraction ${visibleMath(expression)}, and state the value that x cannot equal.`
  },
  {
    pattern: /^直角三角形两条直角边分别为(\d+)厘米和(\d+)厘米，斜边长____。$/,
    translate: ([, a, b]) => `A right triangle has legs ${a} cm and ${b} cm. The hypotenuse is ____.`
  },
  {
    pattern: /^平行四边形ABCD中，AB=(\d+)厘米。若CD与AB是对边，CD长多少？$/,
    translate: ([, side]) => `In parallelogram ABCD, AB=${side} cm. If CD is opposite AB, how long is CD?`
  },
  {
    pattern: /^一次函数y=(.+)，当x=(-?\d+)时，y的值是多少？$/,
    translate: ([, expression, x]) => `For the linear function y=${visibleMath(expression)}, what is y when x=${x}?`
  },
  {
    pattern: /^一次函数图象经过点\((-?\d+),(-?\d+)\)和\((-?\d+),(-?\d+)\)，它的斜率是____。$/,
    translate: ([, x1, y1, x2, y2]) => `A linear function passes through (${x1},${y1}) and (${x2},${y2}). Its slope is ____.`
  },
  {
    pattern: /^一组数据按从小到大排列为(\d+)、(\d+)、(\d+)、(\d+)。求这组数据的中位数。$/,
    translate: ([, a, b, c, d]) => `A data set in order is ${a}, ${b}, ${c}, ${d}. Find its median.`
  },
  { pattern: /^解方程：(.+)=0。$/, translate: ([, equation]) => `Solve the equation ${visibleMath(equation)}=0.` },
  {
    pattern: /^二次函数y=(.+)的对称轴是____。$/,
    translate: ([, expression]) => `For the quadratic function y=${visibleMath(expression)}, the axis of symmetry is ____.`
  },
  {
    pattern: /^袋中有(\d+)个红球和(\d+)个蓝球，随机摸出1个球。摸到红球的概率是多少？$/,
    translate: ([, red, blue]) => `A bag has ${red} red balls and ${blue} blue balls. One ball is drawn at random. What is the probability of drawing a red ball?`
  },
  {
    pattern: /^反比例函数y=k\/x经过点\((-?\d+),(-?\d+)\)，k的值是多少？$/,
    translate: ([, x, y]) => `The inverse proportional function y=k/x passes through (${x},${y}). What is k?`
  },
  {
    pattern: /^两个相似三角形中，大三角形与小三角形对应边的比为(\d+):(\d+)。小三角形一条边长(\d+)厘米，大三角形的对应边长____。$/,
    translate: ([, larger, smaller, side]) =>
      `For two similar triangles, the ratio of a side in the larger triangle to its corresponding side in the smaller triangle is ${larger}:${smaller}. A side in the smaller triangle is ${side} cm. The corresponding side in the larger triangle is ____.`
  },
  {
    pattern: /^两个相似三角形的相似比为(\d+):(\d+)，小三角形一条对应边长(\d+)厘米，大三角形对应边长____。$/,
    translate: ([, larger, smaller, side]) =>
      `Two similar triangles have similarity ratio ${larger}:${smaller}. A corresponding side of the smaller triangle is ${side} cm. The corresponding side of the larger triangle is ____.`
  },
  {
    pattern: /^测得旗杆顶端的仰角为(\d+)°，测量点到旗杆底部的水平距离为(\d+)米。若忽略测量高度，旗杆高约多少？$/,
    translate: ([, angle, distance]) =>
      `The angle of elevation to the top of a flagpole is ${angle}°, and the horizontal distance to its base is ${distance} m. Ignoring measuring height, about how tall is the flagpole?`
  }
];

const explanationRules: TranslationRule[] = [
  {
    pattern: /^按正负变化计算：(.+)，所以傍晚气温是(.+)。$/,
    translate: ([, expression, answer]) => `Compute the signed changes: ${visibleMath(expression)}, so the evening temperature is ${visibleMath(answer)}.`
  },
  { pattern: /^两点距离为(.+)，所以距离是(.+)。$/, translate: ([, expression, answer]) => `The distance is ${visibleMath(expression)}, so it is ${visibleMath(answer)}.` },
  { pattern: /^先合并正负变化，(.+)，结果为负数。$/, translate: ([, expression]) => `Combine the signed changes first: ${visibleMath(expression)}, so the result is negative.` },
  {
    pattern: /^同类项合并得(.+)。$/,
    translate: ([, expression]) => `Combine like terms to get ${visibleMath(expression)}.`
  },
  {
    pattern: /^两边减(\d+)得(.+)，再除以(\d+)，x=(-?\d+)。$/,
    translate: ([, subtract, middle, divisor, answer]) => `Subtract ${subtract} from both sides to get ${visibleMath(middle)}, then divide by ${divisor}, so x=${answer}.`
  },
  {
    pattern: /^(\d+)本练习本花(.+)元，加上(\d+)元等于(\d+)元，方程是(.+)。$/,
    translate: ([, books, cost, extra, total, equation]) =>
      `${books} notebooks cost ${visibleMath(cost)} yuan. Adding ${extra} yuan gives ${total} yuan, so the equation is ${visibleMath(equation)}.`
  },
  {
    pattern: /^平角为180°，另一个角是(.+)。$/,
    translate: ([, expression]) => `A straight angle is 180°, so the other angle is ${visibleMath(expression)}.`
  },
  { pattern: /^中点把线段平均分成两段，AC=(.+)。$/, translate: ([, expression]) => `A midpoint splits a segment into two equal parts, so AC=${visibleMath(expression)}.` },
  { pattern: /^互余两角和为90°，所以另一个角是(.+)。$/, translate: ([, expression]) => `Complementary angles add to 90°, so the other angle is ${visibleMath(expression)}.` },
  {
    pattern: /^向右使x加(\d+)，向下使y减(\d+)，所以坐标为(.+)。$/,
    translate: ([, right, down, point]) => `Moving right adds ${right} to x and moving down subtracts ${down} from y, so the coordinates are ${visibleMath(point)}.`
  },
  {
    pattern: /^两直线平行，同位角相等，所以另一个同位角也是(.+)。$/,
    translate: ([, angle]) => `When two parallel lines are cut by a transversal, corresponding angles are equal, so the other angle is also ${visibleMath(angle)}.`
  },
  {
    pattern: /^横坐标为正、纵坐标为负，点Q位于第四象限。$/,
    translate: () => "The x-coordinate is positive and the y-coordinate is negative, so point Q is in Quadrant IV."
  },
  { pattern: /^(.+)，得(.+)，所以(.+)。$/, translate: ([, start, middle, answer]) => `${visibleMath(start)}, giving ${visibleMath(middle)}, so ${visibleMath(answer)}.` },
  {
    pattern: /^两式相加得(.+)，x=(-?\d+)；代回得y=(-?\d+)，解为(.+)。$/,
    translate: ([, combined, x, y, solution]) => `Adding the equations gives ${visibleMath(combined)}, so x=${x}. Substitute back to get y=${y}, so the solution is ${visibleMath(solution)}.`
  },
  { pattern: /^平均数=(.+)。$/, translate: ([, expression]) => `Mean = ${visibleMath(expression)}.` },
  { pattern: /^三角形内角和为180°，第三个角是(.+)。$/, translate: ([, expression]) => `The angles of a triangle add to 180°, so the third angle is ${visibleMath(expression)}.` },
  { pattern: /^两个底角相等，每个底角=(.+)。$/, translate: ([, expression]) => `The base angles are equal, so each base angle is ${visibleMath(expression)}.` },
  { pattern: /^三组对应边分别相等，可用边边边判定，即SSS。$/, translate: () => "All three pairs of corresponding sides are equal, so the SSS congruence criterion applies." },
  { pattern: /^(.+)，所以分解为(.+)。$/, translate: ([, check, answer]) => `${visibleMath(check)}, so the factorization is ${visibleMath(answer)}.` },
  { pattern: /^系数相乘、同底数幂指数相加，(.+)。$/, translate: ([, expression]) => `Multiply the coefficients and add exponents for the same base: ${visibleMath(expression)}.` },
  {
    pattern: /^分子提公因式得(.+)，约分后为(.+)，且x≠(.+)。$/,
    translate: ([, factored, simplified, excluded]) => `Factor the numerator as ${visibleMath(factored)}. After canceling, the result is ${visibleMath(simplified)}, with x≠${visibleMath(excluded)}.`
  },
  { pattern: /^√(\d+)=√\((.+)\)=(.+)。$/, translate: ([, radicand, factorization, answer]) => `√${radicand}=√(${visibleMath(factorization)})=${visibleMath(answer)}.` },
  { pattern: /^由勾股定理，斜边=(.+)。$/, translate: ([, expression]) => `By the Pythagorean theorem, the hypotenuse is ${visibleMath(expression)}.` },
  { pattern: /^平行四边形对边相等，所以CD=AB=(.+)。$/, translate: ([, answer]) => `Opposite sides of a parallelogram are equal, so CD=AB=${visibleMath(answer)}.` },
  { pattern: /^代入x=(-?\d+)，(.+)。$/, translate: ([, x, expression]) => `Substitute x=${x}: ${visibleMath(expression)}.` },
  { pattern: /^斜率=(.+)。$/, translate: ([, expression]) => `Slope = ${visibleMath(expression)}.` },
  {
    pattern: /^共有4个数，中位数是中间两个数的平均数：(.+)。$/,
    translate: ([, expression]) => `There are four numbers, so the median is the mean of the two middle numbers: ${visibleMath(expression)}.`
  },
  {
    pattern: /^两个因式乘积为0，所以(.+)，答案是(.+)。$/,
    translate: ([, conditions, answer]) => `A product is zero only when at least one factor is zero, so ${visibleMath(conditions)}. The answer is ${visibleMath(answer)}.`
  },
  {
    pattern: /^顶点式y=(.+)的对称轴为(.+)。$/,
    translate: ([, expression, axis]) => `For vertex form y=${visibleMath(expression)}, the axis of symmetry is ${visibleMath(axis)}.`
  },
  {
    pattern: /^共有(\d+)个球，其中红球(\d+)个，所以概率是(.+)。$/,
    translate: ([, total, red, probability]) => `There are ${total} balls in total and ${red} red balls, so the probability is ${visibleMath(probability)}.`
  },
  {
    pattern: /^把点\((-?\d+),(-?\d+)\)代入y=k\/x，得k=(.+)。$/,
    translate: ([, x, y, expression]) => `Substitute (${x},${y}) into y=k/x to get k=${visibleMath(expression)}.`
  },
  {
    pattern: /^对应边按相似比放大(\d+)倍，所以大三角形对应边长(.+)。$/,
    translate: ([, scale, expression]) => `Corresponding sides scale by ${scale}, so the larger triangle's corresponding side is ${visibleMath(expression)}.`
  },
  {
    pattern: /^tan45°=1，高度=水平距离×1=(.+)。$/,
    translate: ([, height]) => `tan45°=1, so height = horizontal distance x 1 = ${visibleMath(height)}.`
  }
];

function translatePrompt(question: GeneratedQuestion) {
  return translateWithRules(
    question.promptZhHans,
    promptRules,
    `Solve this ${question.unitTitle} practice item. Give the requested value.`
  );
}

function translateExplanation(question: GeneratedQuestion) {
  return translateWithRules(
    question.explanationZhHans,
    explanationRules,
    `Use the given conditions step by step. The final answer is ${translateVisibleAnswer(question.answer)}.`
  );
}

function acceptedAnswersFor(question: GeneratedQuestion, canonicalAnswer: string) {
  return Array.from(new Set([...(question.acceptedAnswers ?? []), question.answer].filter((answer) => answer !== canonicalAnswer)));
}

function resolveGeneratedQuestionDiagram(question: GeneratedQuestion): QuestionDiagram | undefined {
  if (typeof question.diagram === "undefined" || question.diagram === null) return undefined;
  const normalized = normalizeQuestionDiagram(question.diagram);
  if (!normalized || validateQuestionDiagram(normalized).length > 0) return undefined;
  return normalized;
}

// Fail-closed release gate: a graph-type generated question is only student-visible
// when its checked-in diagram spec normalizes and passes deterministic figure QA.
function hasStudentVisibleDiagramIfRequired(question: GeneratedQuestion) {
  if (question.type !== "graph") return true;
  return Boolean(resolveGeneratedQuestionDiagram(question));
}

function toQuestion(question: GeneratedQuestion): Question {
  const topic = topicById.get(question.knowledgePointId);
  if (!topic) throw new Error(`Missing Mainland PEP junior topic for ${question.knowledgePointId}`);
  const answer = translateVisibleAnswer(question.answer);
  const diagram = resolveGeneratedQuestionDiagram(question);
  const manualContentQaOverride = mainlandPepJuniorManualContentQaOverrides[question.id];

  return {
    id: question.id,
    curriculumTrack: "MAINLAND_PEP_HIGH",
    curriculumProfile: mainlandPepProfile,
    region: "MAINLAND",
    publisher: "MAINLAND_PEP",
    canonicalTopicId: question.knowledgePointId,
    grade: question.grade,
    topicId: question.knowledgePointId,
    topic: topic.title,
    difficulty: mapDifficultyToActive(question.difficulty),
    type: question.type,
    prompt: translatedText(translatePrompt(question), question.promptZhHans),
    options: question.type === "multiple-choice" ? (question.optionsZhHans ?? []).map(localized) : undefined,
    answer,
    acceptedAnswers: acceptedAnswersFor(question, answer),
    explanation: translatedText(translateExplanation(question), question.explanationZhHans),
    ...(diagram ? { diagram } : {}),
    ...manualContentQaOverride
  };
}

export const mainlandPepJuniorQuestionGenerationMetadata: Record<string, MainlandPepJuniorQuestionGenerationMetadata> =
  Object.fromEntries(
    questionPack.questions.map((question) => [
      question.id,
      {
        batch: question.batch,
        grade: question.grade,
        semester: question.semester,
        topicId: question.knowledgePointId,
        type: question.type,
        evidenceCardIds: question.evidenceCardIds,
        paperPatternCardIds: question.paperPatternCardIds,
        examPatternCardIds: question.examPatternCardIds,
        sourceDistanceStatus: question.sourceDistanceStatus,
        mathQaStatus: question.mathQaStatus,
        independentAnswer:
          mainlandPepJuniorManualContentQaOverrides[question.id]?.answer ?? translateVisibleAnswer(question.answer)
      }
    ])
  );

export function independentMainlandPepJuniorAnswer(question: Question) {
  return mainlandPepJuniorQuestionGenerationMetadata[question.id]?.independentAnswer ?? question.answer;
}

export const mainlandPepJuniorDroppedGraphQuestionIds: string[] = questionPack.questions
  .filter((question) => !hasStudentVisibleDiagramIfRequired(question))
  .map((question) => question.id);

export const mainlandPepJuniorQuestions: Question[] = questionPack.questions
  .filter(hasStudentVisibleDiagramIfRequired)
  .map(toQuestion);

export const mainlandPepJuniorStarterQuestions: Question[] = mainlandPepJuniorQuestions;
