import {
  mainlandBnuHighQuestionGenerationMetadata,
  mainlandBnuHighQuestions
} from "./mainlandBnuHighQuestions";
import { mainlandBnuHighTopicMetadata, mainlandBnuHighTopics } from "./mainlandBnuHighTopics";
import { toTraditionalHjbText } from "./hjbQuestionLocalization";
import type { ProductionLessonBlock, ProductionLessonSeed } from "./lessons";
import type { Difficulty, LocalizedText, Question, Topic } from "@/types";

const practiceDifficultyQuotas: Array<[Difficulty, number]> = [
  ["Low", 2],
  ["Medium", 3],
  ["High", 3]
];

const reviewedPracticeQuestionOrderByTopicId: Readonly<Record<string, readonly string[]>> = {
  "bnu-high-s6-高三数列与导数综合复习": [
    "bnu-high-ds-v1-s6-452",
    "bnu-high-ds-v1-s6-454",
    "bnu-high-ds-v1-s6-456",
    "bnu-high-ds-v1-s6-451",
    "bnu-high-ds-v1-s6-455",
    "bnu-high-ds-v1-s6-453",
    "bnu-high-ds-v1-s6-457",
    "bnu-high-ds-v1-s6-458"
  ]
};

type ReviewedWorkedExampleBase = {
  en: string;
  zhHans: string;
};

export type MainlandBnuHighReviewedWorkedExample = ReviewedWorkedExampleBase & (
  | { mode: "exact-approved-source"; sourceQuestionId: string }
  | { mode: "authored-novel-variant"; templateAnchorId: string }
);

export const mainlandBnuHighReviewedWorkedExamples = {
  "bnu-high-s4-对数运算与对数函数": {
    mode: "authored-novel-variant",
    templateAnchorId: "bnu-high-ds-v1-s4-116",
    zhHans: "例：已知 log_3 81 = m，求 m。解：log_3 81 = m 等价于 3^m = 81。因为 81 = 3^4，所以 m = 4。",
    en: "Example: Given log_3 81 = m, find m. Solution: log_3 81 = m is equivalent to 3^m = 81. Since 81 = 3^4, m = 4."
  },
  "bnu-high-s4-复数": {
    mode: "authored-novel-variant",
    templateAnchorId: "bnu-high-ds-v1-s4-440",
    zhHans: "例：设 z = (2 + 4i) + (4 + 2i)，求 z 的实部。解：分别合并实部和虚部，z = (2 + 4) + (4 + 2)i = 6 + 6i，所以实部为 6。",
    en: "Example: Let z = (2 + 4i) + (4 + 2i). Find the real part of z. Solution: Combine the real and imaginary parts separately: z = (2 + 4) + (4 + 2)i = 6 + 6i, so the real part is 6."
  },
  "bnu-high-s4-概率": {
    mode: "authored-novel-variant",
    templateAnchorId: "bnu-high-ds-v1-s4-224",
    zhHans: "例：袋中有 4 个红球和 5 个蓝球，随机取出 1 个球，求取到红球的概率。解：9 个球等可能被取到，其中 4 个是红球，所以概率为 4/9。",
    en: "Example: A bag contains 4 red balls and 5 blue balls. Select 1 ball at random and find the probability that it is red. Solution: The 9 balls are equally likely, and 4 are red, so the probability is 4/9."
  },
  "bnu-high-s4-函数": {
    mode: "exact-approved-source",
    sourceQuestionId: "bnu-high-ds-v1-s4-044",
    zhHans: "例：设 f(x) = 2x - 1，求 f(3)。解：代入 x = 3，f(3) = 2 × 3 - 1 = 5。",
    en: "Example: Let f(x) = 2x - 1. Find f(3). Solution: Substitute x = 3: f(3) = 2 × 3 - 1 = 5."
  },
  "bnu-high-s4-函数应用": {
    mode: "authored-novel-variant",
    templateAnchorId: "bnu-high-ds-v1-s4-152",
    zhHans: "例：模型为 y = 18 + 4t，求 t = 7 时的 y。解：代入 t = 7，y = 18 + 4 × 7 = 46。",
    en: "Example: A model is y = 18 + 4t. Find y when t = 7. Solution: Substitute t = 7: y = 18 + 4 × 7 = 46."
  },
  "bnu-high-s4-立体几何初步": {
    mode: "exact-approved-source",
    sourceQuestionId: "bnu-high-ds-v1-s4-474",
    zhHans: "例：一个长方体的长、宽、高分别为 4、6、2，求体积。解：V = 4 × 6 × 2 = 48，所以体积是 48 立方单位。",
    en: "Example: A cuboid has length 4, width 6, and height 2. Find its volume. Solution: V = 4 × 6 × 2 = 48, so the volume is 48 cubic units."
  },
  "bnu-high-s4-平面向量及其应用": {
    mode: "exact-approved-source",
    sourceQuestionId: "bnu-high-ds-v1-s4-335",
    zhHans: "例：已知向量 a = (4, 3)，b = (2, 1)，求 a·b。解：a·b = 4 × 2 + 3 × 1 = 11。",
    en: "Example: Given vectors a = (4, 3) and b = (2, 1), find a·b. Solution: a·b = 4 × 2 + 3 × 1 = 11."
  },
  "bnu-high-s4-三角函数": {
    mode: "authored-novel-variant",
    templateAnchorId: "bnu-high-ds-v1-s4-296",
    zhHans: "例：求函数 y = -4sin(2x) 的振幅。解：对 y = A sin(ωx)，振幅为 |A|。这里 |A| = |-4| = 4。",
    en: "Example: Find the amplitude of y = -4sin(2x). Solution: For y = A sin(ωx), the amplitude is |A|. Here |A| = |-4| = 4."
  },
  "bnu-high-s4-三角恒等变换": {
    mode: "authored-novel-variant",
    templateAnchorId: "bnu-high-ds-v1-s4-404",
    zhHans: "例：θ 为锐角，且 sin θ = 8/17，求 cos θ。解：锐角的余弦为正，所以 cos θ = √(1 - sin² θ) = √(1 - 64/289) = 15/17。",
    en: "Example: θ is acute and sin θ = 8/17. Find cos θ. Solution: The cosine of an acute angle is positive, so cos θ = √(1 - sin² θ) = √(1 - 64/289) = 15/17."
  },
  "bnu-high-s4-数学建模活动-二": {
    mode: "authored-novel-variant",
    templateAnchorId: "bnu-high-ds-v1-s4-371",
    zhHans: "例：测量者站在距旗杆底部 12 米处，眼睛离地 1.5 米，测得旗杆顶端相对眼睛的仰角为 45°，求旗杆高度。解：旗杆高出眼睛的部分为 12tan45° = 12 米，所以旗杆高度为 12 + 1.5 = 13.5 米。",
    en: "Example: An observer stands 12 m from a flagpole. The observer’s eye is 1.5 m above the ground, and the angle of elevation to the top is 45°. Find the height of the flagpole. Solution: The part above eye level is 12tan45° = 12 m, so the flagpole height is 12 + 1.5 = 13.5 m."
  },
  "bnu-high-s4-数学建模活动-一": {
    mode: "authored-novel-variant",
    templateAnchorId: "bnu-high-ds-v1-s4-260",
    zhHans: "例：水池开始有水 100 立方米，以每小时 8 立方米的速度匀速排水。建立 t 小时后的剩余水量 V，并求 6 小时后的剩余水量。解：V = 100 - 8t，且 0 ≤ t ≤ 12.5；V(6) = 100 - 8 × 6 = 52 立方米。",
    en: "Example: A tank initially contains 100 cubic meters of water and drains at a constant rate of 8 cubic meters per hour. Model the remaining volume V after t hours, and find it after 6 hours. Solution: V = 100 - 8t, with 0 ≤ t ≤ 12.5; V(6) = 100 - 8 × 6 = 52 cubic meters."
  },
  "bnu-high-s4-统计": {
    mode: "authored-novel-variant",
    templateAnchorId: "bnu-high-ds-v1-s4-188",
    zhHans: "例：一组数据为 6、9、15，求极差。解：最大值是 15，最小值是 6，所以极差为 15 - 6 = 9。",
    en: "Example: The data are 6, 9, and 15. Find the range. Solution: The maximum is 15 and the minimum is 6, so the range is 15 - 6 = 9."
  },
  "bnu-high-s4-预备知识": {
    mode: "exact-approved-source",
    sourceQuestionId: "bnu-high-ds-v1-s4-008",
    zhHans: "例：解方程 4x + 2 = 22。解：移项得 4x = 20，两边同除以 4，得到 x = 5。",
    en: "Example: Solve 4x + 2 = 22. Solution: Rearranging gives 4x = 20. Dividing both sides by 4 gives x = 5."
  },
  "bnu-high-s4-指数运算与指数函数": {
    mode: "authored-novel-variant",
    templateAnchorId: "bnu-high-ds-v1-s4-080",
    zhHans: "例：已知 3^4 × 3^3 = 3^k，求 k。解：同底数幂相乘时指数相加，所以 3^4 × 3^3 = 3^(4+3) = 3^7，故 k = 7。",
    en: "Example: Given 3^4 × 3^3 = 3^k, find k. Solution: When powers with the same base are multiplied, their exponents add, so 3^4 × 3^3 = 3^(4+3) = 3^7. Therefore, k = 7."
  },
  "bnu-high-s5-概率": {
    mode: "authored-novel-variant",
    templateAnchorId: "bnu-high-ds-v1-s5-368",
    zhHans: "例：随机变量 X 服从二项分布 B(5,1/2)，求 P(X = 2)。解：P(X = 2) = C(5,2)(1/2)^2(1/2)^3 = 10/32 = 5/16。",
    en: "Example: A random variable X has binomial distribution B(5,1/2). Find P(X = 2). Solution: P(X = 2) = C(5,2)(1/2)^2(1/2)^3 = 10/32 = 5/16."
  },
  "bnu-high-s5-计数原理": {
    mode: "authored-novel-variant",
    templateAnchorId: "bnu-high-ds-v1-s5-296",
    zhHans: "例：从 11 名学生中选出 3 名组成学习小组，共有多少种选法？解：组内顺序不重要，所以选法数为 C(11,3) = 11 × 10 × 9 ÷ (3 × 2 × 1) = 165。",
    en: "Example: How many ways can 3 students be selected from 11 to form a study group? Solution: Order within the group does not matter, so the number of selections is C(11,3) = 11 × 10 × 9 ÷ (3 × 2 × 1) = 165."
  },
  "bnu-high-s5-空间向量与立体几何": {
    mode: "exact-approved-source",
    sourceQuestionId: "bnu-high-ds-v1-s5-152",
    zhHans: "例：已知向量 a = (5, 3, 3)，b = (4, 2, 2)，求 a·b。解：a·b = 5 × 4 + 3 × 2 + 3 × 2 = 32。",
    en: "Example: Given vectors a = (5, 3, 3) and b = (4, 2, 2), find a·b. Solution: a·b = 5 × 4 + 3 × 2 + 3 × 2 = 32."
  },
  "bnu-high-s5-数学建模活动-三": {
    mode: "exact-approved-source",
    sourceQuestionId: "bnu-high-ds-v1-s5-224",
    zhHans: "例：模型为 y = 25 + 3t，求 t = 3 时的 y。解：代入 t = 3，y = 25 + 3 × 3 = 34。",
    en: "Example: A model is y = 25 + 3t. Find y when t = 3. Solution: Substitute t = 3: y = 25 + 3 × 3 = 34."
  },
  "bnu-high-s5-统计案例": {
    mode: "authored-novel-variant",
    templateAnchorId: "bnu-high-ds-v1-s5-440",
    zhHans: "例：某校建立线性回归方程 ŷ = 2.4x + 58，其中 x 表示每周自主学习时间，ŷ 表示预测成绩。若 x 增加 2 小时，预测成绩平均增加多少分？解：回归直线的斜率是 2.4，所以预测成绩增加 2.4 × 2 = 4.8 分。",
    en: "Example: A school uses the regression equation ŷ = 2.4x + 58, where x is weekly independent-study time and ŷ is the predicted score. If x increases by 2 hours, how much does the predicted score increase? Solution: The slope is 2.4, so the predicted score increases by 2.4 × 2 = 4.8 points."
  },
  "bnu-high-s5-圆锥曲线": {
    mode: "exact-approved-source",
    sourceQuestionId: "bnu-high-ds-v1-s5-080",
    zhHans: "例：椭圆满足 a² = 16，b² = 9，求 c²。解：椭圆中 c² = a² - b²，所以 c² = 16 - 9 = 7。",
    en: "Example: For an ellipse, a² = 16 and b² = 9. Find c². Solution: For an ellipse, c² = a² - b², so c² = 16 - 9 = 7."
  },
  "bnu-high-s5-直线与圆": {
    mode: "exact-approved-source",
    sourceQuestionId: "bnu-high-ds-v1-s5-008",
    en: "Example: A line passes through points A(3, -2) and B(5, 4). Find its slope. Solution: The two points have different x-coordinates, so the slope is defined. Using the slope formula, k=(4-(-2))÷(5-3)=6÷2=3.",
    zhHans: "例：直线经过点 A(3, -2) 和 B(5, 4)，求这条直线的斜率。解：两点的 x 坐标不同，斜率存在。由斜率公式，k=(4-(-2))÷(5-3)=6÷2=3。"
  },
  "bnu-high-s6-导数及其应用": {
    mode: "exact-approved-source",
    sourceQuestionId: "bnu-high-ds-v1-s6-236",
    zhHans: "例：函数 f(x) = 2x² + 2x + 2，求 f′(2)。解：f′(x) = 4x + 2，所以 f′(2) = 4 × 2 + 2 = 10。",
    en: "Example: For f(x) = 2x² + 2x + 2, find f′(2). Solution: f′(x) = 4x + 2, so f′(2) = 4 × 2 + 2 = 10."
  },
  "bnu-high-s6-高三数列与导数综合复习": {
    mode: "exact-approved-source",
    sourceQuestionId: "bnu-high-ds-v1-s6-460",
    zhHans: "例：函数 f(x) = 4x² + 2x + 2，求 f′(6)。解：f′(x) = 8x + 2，所以 f′(6) = 8 × 6 + 2 = 50。",
    en: "Example: For f(x) = 4x² + 2x + 2, find f′(6). Solution: f′(x) = 8x + 2, so f′(6) = 8 × 6 + 2 = 50."
  },
  "bnu-high-s6-数列": {
    mode: "exact-approved-source",
    sourceQuestionId: "bnu-high-ds-v1-s6-011",
    zhHans: "例：等差数列的首项 a_1 = 3，公差 d = 2，求 a_9。解：a_9 = a_1 + (9 - 1)d = 3 + 8 × 2 = 19。",
    en: "Example: An arithmetic sequence has first term a_1 = 3 and common difference d = 2. Find a_9. Solution: a_9 = a_1 + (9 - 1)d = 3 + 8 × 2 = 19."
  }
} satisfies Record<string, MainlandBnuHighReviewedWorkedExample>;

const reviewedWorkedExamplesByTopicId: Readonly<Record<string, MainlandBnuHighReviewedWorkedExample>> =
  mainlandBnuHighReviewedWorkedExamples;

function text(en: string, zhHans: string): LocalizedText {
  return { en, zh: toTraditionalHjbText(zhHans), zhHans };
}

function approvedQuestion(question: Question) {
  const metadata = mainlandBnuHighQuestionGenerationMetadata[question.id];
  return (
    metadata?.sourceDistanceStatus === "passed-auto-source-scan" &&
    metadata.mathQaStatus === "pass" &&
    metadata.terminologyQaStatus === "pass" &&
    metadata.manualQaStatus === "approved"
  );
}

function questionIdSort(left: Question, right: Question) {
  return left.id.localeCompare(right.id, "zh-Hans");
}

function questionsForTopic(topicId: string) {
  return mainlandBnuHighQuestions
    .filter((question) => question.topicId === topicId && approvedQuestion(question))
    .sort(questionIdSort);
}

function selectPracticeQuestionIds(topicId: string) {
  const topicQuestions = questionsForTopic(topicId);
  const picked = new Set<string>();

  practiceDifficultyQuotas.forEach(([difficulty, quota]) => {
    topicQuestions
      .filter((question) => question.difficulty === difficulty)
      .slice(0, quota)
      .forEach((question) => picked.add(question.id));
  });
  topicQuestions.forEach((question) => {
    if (picked.size < 8) picked.add(question.id);
  });

  const selected = Array.from(picked).slice(0, 8);
  const reviewedOrder = reviewedPracticeQuestionOrderByTopicId[topicId];
  if (!reviewedOrder) return selected;
  if (
    reviewedOrder.length !== selected.length
    || new Set(reviewedOrder).size !== reviewedOrder.length
    || reviewedOrder.some((id) => !picked.has(id))
    || selected.some((id) => !reviewedOrder.includes(id))
  ) {
    throw new Error(`${topicId}: reviewed checkpoint order must be a permutation of the selected approved questions`);
  }
  return [...reviewedOrder];
}

function volumeTitleEn(volume: string) {
  const normalized = volume.replace(/\s+/g, "");
  const volumeTitleMap: Record<string, string> = {
    "必修第一册": "Compulsory Volume 1",
    "必修第二册": "Compulsory Volume 2",
    "选择性必修第一册": "Selective Compulsory Volume 1",
    "选择性必修第二册": "Selective Compulsory Volume 2",
    "选择性必修第二册综合复习": "Selective Compulsory Volume 2 Review"
  };

  return volumeTitleMap[normalized] ?? volume;
}

const conceptSummaryByTopicId: Record<string, { en: string; zhHans: string }> = {
  "bnu-high-s4-对数运算与对数函数": {
    en: "A logarithm rewrites an exponential relation: for a > 0, a ≠ 1, and x > 0, log_a(x) = y exactly when a^y = x. Use the product, quotient, power, and change-of-base rules only within their domains, and connect a logarithmic graph to its inverse exponential graph.",
    zhHans: "对数把指数关系改写为另一种形式：当 a > 0、a ≠ 1、x > 0 时，log_a(x) = y 与 a^y = x 等价。运用积、商、幂和换底公式时必须保留定义域，并把对数函数图像与其反函数——指数函数图像联系起来。"
  },
  "bnu-high-s4-复数": {
    en: "Write a complex number as z = a + bi, where a and b are real and i² = −1. Perform algebra by collecting real and imaginary parts, and use the conjugate, modulus, and Argand-plane point to connect symbolic and geometric representations.",
    zhHans: "复数写成 z = a + bi，其中 a、b 为实数且 i² = −1。运算时分别合并实部与虚部，并用共轭复数、模以及复平面上的点连接代数表示和几何表示。"
  },
  "bnu-high-s4-概率": {
    en: "Describe the random experiment and sample space before assigning probabilities. For equally likely finite outcomes, probability is favorable outcomes divided by all outcomes; also use complements and addition rules, while treating observed frequency as evidence rather than an exact theoretical probability.",
    zhHans: "计算概率前先说明随机试验和样本空间。有限个等可能结果下，概率等于有利结果数除以全部结果数；还可运用对立事件和加法公式，但实验频率只是对理论概率的估计，不应当作完全相等。"
  },
  "bnu-high-s4-函数": {
    en: "A function assigns each input in its domain exactly one output. Coordinate formulas, tables, and graphs by checking domain and range first, then justify monotonicity, parity, zeros, extrema, or transformations from definitions and valid algebraic comparisons.",
    zhHans: "函数把定义域中的每个输入唯一对应到一个输出。使用解析式、表格和图像时先检查定义域和值域，再依据定义和有效的代数比较说明单调性、奇偶性、零点、最值或图像变换。"
  },
  "bnu-high-s4-函数应用": {
    en: "Build a function model by defining variables, units, domain, and assumptions before choosing a formula. Interpret zeros, growth, parameters, and approximate solutions in context, then test the result against the data, units, and realistic constraints.",
    zhHans: "建立函数模型时，先定义变量、单位、定义域和假设，再选择合适的解析式。结合情境解释零点、增长趋势、参数和近似解，并用数据、单位及现实限制检验结果。"
  },
  "bnu-high-s4-立体几何初步": {
    en: "Distinguish points, lines, and planes in space, and use stated criteria—not appearance in a sketch—to prove parallel or perpendicular relationships. For simple solids, identify the required lengths before applying surface-area or volume formulas and keep units consistent.",
    zhHans: "在空间中区分点、直线和平面，并依据明确的判定或性质证明平行、垂直关系，不能只凭示意图外观下结论。计算简单几何体的表面积或体积前先找出所需长度，并保持单位一致。"
  },
  "bnu-high-s4-平面向量及其应用": {
    en: "A plane vector has magnitude and direction and can be represented by coordinates. Use component operations and scalar multiplication consistently; for nonzero vectors, the dot product a·b = |a||b|cos θ links coordinates with length, angle, projection, and perpendicularity.",
    zhHans: "平面向量同时具有大小和方向，也可用坐标表示。向量加减与数乘要按分量进行；对非零向量，数量积 a·b = |a||b|cos θ 把坐标运算与长度、夹角、投影和垂直关系联系起来。"
  },
  "bnu-high-s4-三角函数": {
    en: "Define sine and cosine on the unit circle using radian measure, then read sign, periodicity, zeros, and extrema from angle position and graphs. For y = A sin(ωx + φ) + b or its cosine form, distinguish amplitude |A|, period 2π/|ω|, phase shift, and vertical shift.",
    zhHans: "用弧度制和单位圆定义正弦、余弦，再从角的位置和图像判断符号、周期、零点与最值。研究 y = A sin(ωx + φ) + b 或相应余弦式时，要区分振幅 |A|、周期 2π/|ω|、相位移动和竖直移动。"
  },
  "bnu-high-s4-三角恒等变换": {
    en: "Use the sum, difference, and double-angle formulas as identities on their valid domains, keeping angle signs and quadrants explicit. Choose a transformation target before expanding or combining terms, and verify the final expression numerically or by reversing the identity.",
    zhHans: "在有效定义域内运用和角、差角及二倍角公式，并明确角的符号和所在象限。变形前先确定目标形式，再展开或合并各项，最后可用代入数值或逆向恒等变形检验结果。"
  },
  "bnu-high-s4-数学建模活动-二": {
    en: "Model a measurement situation by stating assumptions, drawing the geometry, defining measurable quantities, and choosing trigonometric or vector relations. Calculate with units, estimate measurement error, and explain whether the result is reasonable for the original setting.",
    zhHans: "对测量情境建模时，先说明假设、画出几何关系、定义可测量的量，再选择三角或向量关系。计算中保留单位，估计测量误差，并说明结果在原情境中是否合理。"
  },
  "bnu-high-s4-数学建模活动-一": {
    en: "A complete modeling cycle moves from a real question to assumptions, variables, data, a mathematical model, a solution, validation, and a communicated conclusion. Distinguish what the model proves from what depends on simplifying assumptions.",
    zhHans: "完整的建模过程包括提出现实问题、作出假设、定义变量、整理数据、建立模型、求解、检验并表达结论。结论中要区分模型能够支持的内容与依赖简化假设的部分。"
  },
  "bnu-high-s4-统计": {
    en: "Separate population, sample, variable, and observation, and use an appropriate random sampling method before generalizing. Describe a distribution with graphs and numerical summaries, compare center and spread, and avoid turning association in sample data into an unsupported causal claim.",
    zhHans: "先区分总体、样本、变量和观测值，并在作总体推断前采用合适的随机抽样方法。用图表和数字特征描述分布、比较集中趋势与离散程度，不能把样本中的相关关系直接解释为因果关系。"
  },
  "bnu-high-s4-预备知识": {
    en: "Consolidate sets, algebraic transformations, equations, inequalities, and logical conditions while preserving equivalence. Record domain restrictions before dividing, taking roots, or transforming inequalities, and distinguish sufficient, necessary, and sufficient-and-necessary conditions.",
    zhHans: "复习集合、代数变形、方程、不等式和逻辑条件时，要始终保持等价性。进行除法、开方或不等式变形前先记录取值限制，并区分充分条件、必要条件和充要条件。"
  },
  "bnu-high-s4-指数运算与指数函数": {
    en: "Apply exponent laws under their stated real-number conditions and connect rational exponents with radicals. For y = a^x, require a > 0 and a ≠ 1; use the value of a to determine monotonicity and interpret repeated growth or decay.",
    zhHans: "在相应实数条件下运用指数运算法则，并把分数指数与根式联系起来。指数函数 y = a^x 要求 a > 0 且 a ≠ 1；根据 a 的取值判断单调性，并解释重复增长或衰减。"
  },
  "bnu-high-s5-概率": {
    en: "Extend probability through conditional probability, independence, and discrete random variables. Check the model conditions before using a binomial distribution, compute expectation and variance from the distribution, and interpret normal-distribution probabilities as areas or standardized values.",
    zhHans: "通过条件概率、独立性和离散型随机变量深化概率学习。使用二项分布前必须检查试验次数固定、各次独立且成功概率不变等条件；由分布求期望和方差，并把正态分布概率解释为面积或标准化位置。"
  },
  "bnu-high-s5-计数原理": {
    en: "Decide first whether a task is split into disjoint cases or completed through successive steps, then use addition or multiplication accordingly. For permutations and combinations, state whether order matters and whether repetition is allowed; connect binomial coefficients with combinations.",
    zhHans: "先判断计数任务是分成互斥类别还是依次完成多个步骤，再分别使用分类加法或分步乘法原理。处理排列组合时要说明顺序是否重要、元素能否重复，并把二项式系数与组合数联系起来。"
  },
  "bnu-high-s5-空间向量与立体几何": {
    en: "Choose coordinates, direction vectors, and plane normals that match the solid. Use vector equations and dot products to prove line-plane relationships and calculate angles or distances, while excluding zero-vector cases where a direction or normal is required.",
    zhHans: "根据立体结构选择合适的坐标系、方向向量和平面法向量。用向量方程和数量积证明线面关系、计算角度或距离；需要方向向量或法向量时必须排除零向量。"
  },
  "bnu-high-s5-数学建模活动-三": {
    en: "Represent a spatial situation with explicit assumptions, a coordinate system, points, vectors, and geometric constraints. Solve the resulting equations, translate the result back to the physical setting, and test sensitivity to measurement or assumption changes.",
    zhHans: "把空间情境表示为明确的假设、坐标系、点、向量和几何约束。求解相应方程后把结果还原到现实情境，并检验测量误差或假设变化对结论的影响。"
  },
  "bnu-high-s5-统计案例": {
    en: "Use a scatterplot before fitting a least-squares line, interpret slope and residuals in context, and distinguish correlation from causation. For categorical data, state hypotheses and conditions before using an independence test and interpret the conclusion at the chosen significance level.",
    zhHans: "拟合最小二乘直线前先观察散点图，并结合情境解释斜率和残差；相关关系不等于因果关系。分析分类数据时，先写出假设和适用条件，再进行独立性检验，并在给定显著性水平下解释结论。"
  },
  "bnu-high-s5-圆锥曲线": {
    en: "Start from each conic's geometric definition, then connect foci, directrix or distance conditions with its standard equation and parameter restrictions. For a line-conic intersection, substitute consistently and use the resulting quadratic and discriminant to determine the number of intersections.",
    zhHans: "从圆锥曲线的几何定义出发，把焦点、准线或距离条件与标准方程及参数限制联系起来。研究直线与圆锥曲线的位置关系时，统一代入得到一元二次方程，并用判别式判断交点个数。"
  },
  "bnu-high-s5-直线与圆": {
    en: "Select a line equation that fits the available information and handle vertical lines separately when slope is undefined. Express a circle by center and radius, then use point-line distance, center distance, or substitution and a discriminant to classify positional relationships.",
    zhHans: "根据已知条件选择合适的直线方程；斜率不存在的竖直直线要单独处理。用圆心和半径表示圆，再通过点到直线的距离、圆心距，或代入后的判别式判断位置关系。"
  },
  "bnu-high-s6-导数及其应用": {
    en: "Interpret the derivative as an instantaneous rate of change and tangent slope, then apply derivative rules on the function's domain. Use the sign of f′ to justify monotonic intervals and extrema, checking endpoints and contextual constraints in optimization problems.",
    zhHans: "把导数理解为瞬时变化率和切线斜率，并在函数定义域内运用求导法则。根据 f′ 的符号说明单调区间和极值；解决最优化问题时还要检查端点及情境限制。"
  },
  "bnu-high-s6-高三数列与导数综合复习": {
    en: "Combine sequence formulas, recurrence, and partial sums with derivative-based monotonicity of a related continuous function when appropriate. Keep the discrete index n separate from a real variable, justify every domain restriction, and verify conclusions for the required integer indices.",
    zhHans: "综合运用数列通项、递推和前 n 项和；必要时可借助相关连续函数的导数研究单调性。必须区分离散指标 n 与实变量，说明定义域限制，并对题目要求的整数指标检验结论。"
  },
  "bnu-high-s6-数列": {
    en: "Treat a sequence as a function on positive integers and connect its terms through an explicit formula or recurrence. Distinguish arithmetic and geometric conditions, derive term and sum formulas rather than memorizing them alone, and use induction with a clear base case and inductive step.",
    zhHans: "把数列看作定义在正整数集上的函数，并用通项公式或递推关系连接各项。区分等差与等比条件，理解通项和求和公式的推导；使用数学归纳法时要写清基础步骤和归纳递推步骤。"
  }
};

function conceptSummary(topic: Topic) {
  return conceptSummaryByTopicId[topic.id] ?? {
    en: topic.description.en,
    zhHans: topic.description.zhHans ?? topic.description.zh
  };
}

function workedExampleContent(topic: Topic, practiceQuestionIds: string[]) {
  const reviewed = reviewedWorkedExamplesByTopicId[topic.id];
  if (!reviewed) throw new Error(`${topic.id}: reviewed worked-example contract is missing`);
  const anchorId = reviewed.mode === "exact-approved-source" ? reviewed.sourceQuestionId : reviewed.templateAnchorId;
  const anchor = questionsForTopic(topic.id).find((question) => question.id === anchorId);
  if (!anchor) throw new Error(`${topic.id}: reviewed worked-example source or template anchor is missing or not approved`);
  if (practiceQuestionIds.includes(anchorId)) {
    throw new Error(`${topic.id}: reviewed worked-example source or template anchor must be disjoint from the complete checkpoint`);
  }
  return text(reviewed.en, reviewed.zhHans);
}

function lessonBlocks(topic: Topic, practiceQuestionIds: string[]): ProductionLessonBlock[] {
  const metadata = mainlandBnuHighTopicMetadata[topic.id];
  const concept = conceptSummary(topic);

  return [
    {
      idSuffix: "concept",
      type: "concept",
      title: text("Core concept", "核心概念"),
      content: text(concept.en, concept.zhHans)
    },
    {
      idSuffix: "worked-example",
      type: "worked-example",
      title: text("Worked example", "例题精讲"),
      content: workedExampleContent(topic, practiceQuestionIds)
    },
    {
      idSuffix: "checklist",
      type: "checklist",
      title: text("Before practice", "练习前检查"),
      items: [
        text("State the mathematical definition, rule, or theorem being used.", "说出正在使用的数学定义、规则或定理。"),
        text("Mark the known conditions and target before calculating.", "计算前标出已知条件和目标。"),
        text("Write the key transformation, substitution, graph feature, or proof step.", "写出关键变形、代入、图像特征或证明步骤。"),
        text("Check the final answer against domain, units, and question wording.", "用定义域、单位和题目问法复核最终答案。")
      ]
    },
    {
      idSuffix: "extension",
      type: "extension",
      title: text("Strategy and extension", "考试策略与拓展"),
      items: [
        text("Solve one checkpoint again with a different representation.", "任选一道检查题，换一种表示方式再做一遍。"),
        text("Write one likely misconception for this chapter and how to avoid it.", "写出本章一个易错点，并说明如何避免。"),
        text("Change one condition in a checkpoint, then predict how the solution path changes.", "改变一道检查题中的一个条件，并预测解题路径怎样改变。")
      ]
    },
    {
      idSuffix: "teacher-guide",
      type: "teacher-guide",
      title: text("Teacher guide", "教师使用建议"),
      content: text(
        `Use the five-question checkpoint shown on this lesson page to identify readiness for more independent work on ${topic.title.en}.`,
        `先用本课页面显示的五道课堂检查题了解学生对《${metadata.chapter}》的掌握情况，再按需要安排独立练习。`
      ),
      items: [
        text("Ask students to name the rule or theorem before calculation.", "计算前先让学生说出所用规则或定理。"),
        text("Use one incorrect answer to model checklist-based correction.", "用一个错误答案示范如何按清单修正。"),
        text("Choose follow-up questions that match the same unit, grade, and learning goal.", "后续练习应与本单元、年级和学习目标一致。")
      ]
    }
  ];
}

function toProductionLessonSeed(topic: Topic): ProductionLessonSeed {
  const practiceQuestionIds = selectPracticeQuestionIds(topic.id);
  return {
    topicId: topic.id,
    productionReady: true,
    title: topic.title,
    description: topic.description,
    estimatedMinutes: topic.minutes,
    practiceQuestionIds,
    blocks: lessonBlocks(topic, practiceQuestionIds)
  };
}

export const mainlandBnuHighLessonSeeds: ProductionLessonSeed[] = mainlandBnuHighTopics.map(toProductionLessonSeed);
