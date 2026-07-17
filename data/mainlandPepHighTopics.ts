import type { Topic } from "@/types";

type MainlandPepHighTopicSeed = Omit<Topic, "curriculumTrack" | "status" | "mastery"> & {
  status?: Topic["status"];
  mastery?: number;
};

const topicSeeds: MainlandPepHighTopicSeed[] = [
  {
    id: "pep-high-s4-sets-logic",
    grade: "S4",
    title: { en: "Sets and Logic", zh: "集合与常用逻辑用语" },
    description: { en: "Use sets, relations, propositions, and sufficient or necessary conditions.", zh: "运用集合、关系、命题以及充分条件与必要条件。" },
    difficulty: "Low",
    minutes: 42
  },
  {
    id: "pep-high-s4-quadratic-inequalities",
    grade: "S4",
    title: { en: "Quadratics and Inequalities", zh: "一元二次函数、方程和不等式" },
    description: { en: "Connect quadratic graphs, roots, intervals, and inequality solving.", zh: "联系二次函数图像、方程根、区间与不等式求解。" },
    difficulty: "Medium",
    minutes: 52
  },
  {
    id: "pep-high-s4-function-properties",
    grade: "S4",
    title: { en: "Function Concepts and Properties", zh: "函数的概念与性质" },
    description: { en: "Study domain, range, monotonicity, parity, inverse relations, and function models.", zh: "学习定义域、值域、单调性、奇偶性、反函数关系与函数模型。" },
    difficulty: "Medium",
    minutes: 54
  },
  {
    id: "pep-high-s4-exp-log",
    grade: "S4",
    title: { en: "Exponential and Logarithmic Functions", zh: "指数函数与对数函数" },
    description: { en: "Compare exponential and logarithmic growth, equations, and transformations.", zh: "比较指数与对数增长、方程和图像变换。" },
    difficulty: "Medium",
    minutes: 52
  },
  {
    id: "pep-high-s4-trigonometry",
    grade: "S4",
    title: { en: "Trigonometric Functions", zh: "三角函数" },
    description: { en: "Use unit-circle values, identities, graph features, and simple transformations.", zh: "使用单位圆取值、恒等变换、图像特征和简单变换。" },
    difficulty: "High",
    minutes: 58
  },
  {
    id: "pep-high-s4-plane-vectors",
    grade: "S4",
    title: { en: "Plane Vectors", zh: "平面向量及其应用" },
    description: { en: "Represent vectors, calculate dot products, and solve planar geometry tasks.", zh: "表示向量、计算数量积，并解决平面几何问题。" },
    difficulty: "Medium",
    minutes: 50
  },
  {
    id: "pep-high-s4-complex-numbers",
    grade: "S4",
    title: { en: "Complex Numbers", zh: "复数" },
    description: { en: "Operate with complex numbers and connect algebraic and geometric meanings.", zh: "进行复数运算，并联系代数形式与几何意义。" },
    difficulty: "Medium",
    minutes: 44
  },
  {
    id: "pep-high-s4-solid-geometry-intro",
    grade: "S4",
    title: { en: "Introductory Solid Geometry", zh: "立体几何初步" },
    description: { en: "Reason about spatial lines, planes, distance, angles, and simple solids.", zh: "推理空间直线、平面、距离、角度与简单几何体。" },
    difficulty: "Medium",
    minutes: 50
  },
  {
    id: "pep-high-s4-statistics",
    grade: "S4",
    title: { en: "Statistics", zh: "统计" },
    description: { en: "Summarize data with averages, variance, percentiles, and distribution language.", zh: "用平均数、方差、百分位数和分布语言概括数据。" },
    difficulty: "Medium",
    minutes: 44
  },
  {
    id: "pep-high-s4-probability",
    grade: "S4",
    title: { en: "Probability", zh: "概率" },
    description: { en: "Model random events, sample spaces, complements, and simple compound probability.", zh: "刻画随机事件、样本空间、对立事件和简单复合概率。" },
    difficulty: "Medium",
    minutes: 46
  },
  {
    id: "pep-high-s5-space-vectors",
    grade: "S5",
    title: { en: "Space Vectors and Solid Geometry", zh: "空间向量与立体几何" },
    description: { en: "Use coordinates and vectors to calculate spatial distance, angle, and position.", zh: "用坐标和向量计算空间距离、角度与位置关系。" },
    difficulty: "High",
    minutes: 58
  },
  {
    id: "pep-high-s5-lines-circles",
    grade: "S5",
    title: { en: "Lines and Circles", zh: "直线和圆的方程" },
    description: { en: "Build equations of lines and circles and use coordinate constraints.", zh: "建立直线与圆的方程，并运用坐标约束。" },
    difficulty: "Medium",
    minutes: 52
  },
  {
    id: "pep-high-s5-conics",
    grade: "S5",
    title: { en: "Conic Sections", zh: "圆锥曲线的方程" },
    description: { en: "Analyze ellipses, parabolas, hyperbolas, intersections, and parameter constraints.", zh: "分析椭圆、抛物线、双曲线、交点和参数约束。" },
    difficulty: "High",
    minutes: 62
  },
  {
    id: "pep-high-s5-sequences",
    grade: "S5",
    title: { en: "Sequences", zh: "数列" },
    description: { en: "Work with arithmetic and geometric sequences, sums, recursion, and induction.", zh: "处理等差数列、等比数列、求和、递推和归纳。" },
    difficulty: "High",
    minutes: 58
  },
  {
    id: "pep-high-s5-derivatives",
    grade: "S5",
    title: { en: "Derivatives and Applications", zh: "一元函数的导数及其应用" },
    description: { en: "Use derivatives for tangent lines, monotonicity, extrema, and optimization.", zh: "用导数研究切线、单调性、极值和最优化。" },
    difficulty: "High",
    minutes: 64
  },
  {
    id: "pep-high-s6-counting",
    grade: "S6",
    title: { en: "Counting Principles", zh: "计数原理" },
    description: { en: "Apply permutations, combinations, binomial expansion, and counting cases.", zh: "应用排列、组合、二项式展开和分类计数。" },
    difficulty: "High",
    minutes: 54
  },
  {
    id: "pep-high-s6-random-variables",
    grade: "S6",
    title: { en: "Random Variables and Distributions", zh: "随机变量及其分布" },
    description: { en: "Use discrete distributions, expectation, variance, binomial models, and normal ideas.", zh: "运用离散分布、期望、方差、二项分布模型和正态思想。" },
    difficulty: "High",
    minutes: 60
  },
  {
    id: "pep-high-s6-bivariate-data",
    grade: "S6",
    title: { en: "Bivariate Data Analysis", zh: "成对数据的统计分析" },
    description: { en: "Interpret correlation, regression, residuals, and data-based decisions.", zh: "解释相关、回归、残差和基于数据的判断。" },
    difficulty: "Medium",
    minutes: 50
  },
  {
    id: "pep-high-s6-derivative-synthesis",
    grade: "S6",
    title: { en: "Derivative Synthesis", zh: "导数综合" },
    description: { en: "Combine derivative rules, parameter analysis, inequalities, and optimization.", zh: "综合导数规则、参数分析、不等式和最优化。" },
    difficulty: "High",
    minutes: 66
  },
  {
    id: "pep-high-s6-analytic-geometry-synthesis",
    grade: "S6",
    title: { en: "Analytic Geometry Synthesis", zh: "解析几何综合" },
    description: { en: "Combine lines, circles, conics, vectors, and parameter reasoning.", zh: "综合直线、圆、圆锥曲线、向量和参数推理。" },
    difficulty: "High",
    minutes: 66
  },
  {
    id: "pep-high-s6-probability-statistics-synthesis",
    grade: "S6",
    title: { en: "Probability and Statistics Synthesis", zh: "概率统计综合" },
    description: { en: "Mix counting, probability, distributions, regression, and interpretation.", zh: "综合计数、概率、分布、回归和解释。" },
    difficulty: "High",
    minutes: 62
  },
  {
    id: "pep-high-s6-exam-practice",
    grade: "S6",
    title: { en: "Exam-Style Mixed Practice", zh: "高考风格综合练习" },
    description: { en: "Practice original multi-topic tasks with clear strategy selection and checking.", zh: "练习原创跨章节任务，强调策略选择和结果检验。" },
    difficulty: "High",
    minutes: 60
  }
];

export const mainlandPepHighTopics: Topic[] = topicSeeds.map((topic) => ({
  ...topic,
  curriculumTrack: "MAINLAND_PEP_HIGH",
  curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_PEP" },
  region: "MAINLAND",
  publisher: "MAINLAND_PEP",
  status: topic.status ?? "not-started",
  mastery: topic.mastery ?? 0
}));
