#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../../..");
const tmpDir = join(projectRoot, ".tmp/mainland-hjb-high-lesson-gen");
const tmpConfigPath = join(projectRoot, ".tmp/mainland-hjb-high-lesson-gen-tsconfig.json");
const generatedAt = "2026-05-24T00:00:00+08:00";

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function compileRagSubset() {
  mkdirSync(join(projectRoot, ".tmp"), { recursive: true });
  rmSync(tmpDir, { recursive: true, force: true });
  writeJson(tmpConfigPath, {
    extends: "../tsconfig.json",
    compilerOptions: {
      outDir: "mainland-hjb-high-lesson-gen",
      noEmit: false,
      incremental: false,
      module: "commonjs",
      moduleResolution: "node",
      rootDir: "..",
      baseUrl: ".."
    },
    include: [
      "../types/**/*.ts",
      "../data/rag/**/*.ts",
      "../lib/rag/**/*.ts"
    ],
    exclude: [
      "../node_modules",
      "../.next",
      "mainland-hjb-high-lesson-gen",
      "../output",
      "../outputs",
      "../test-results"
    ]
  });

  execFileSync(join(projectRoot, "node_modules/.bin/tsc"), ["-p", tmpConfigPath], {
    cwd: projectRoot,
    stdio: "inherit"
  });
}

compileRagSubset();

const require = createRequire(import.meta.url);
const { mainlandHjbHighRagCards } = require(join(tmpDir, "data/rag/mainlandHjbHigh.js"));
const { buildMainlandHjbHighEvidencePack } = require(join(tmpDir, "lib/rag/mainlandHjbHigh.js"));

const m = (expression) => `\\(${expression}\\)`;
const sentence = (items) => items.filter(Boolean).join(" ");
const unique = (values) => Array.from(new Set(values.filter(Boolean)));

const difficultyMap = {
  foundation: "Foundation",
  core: "Core",
  exam: "Exam",
  challenge: "Challenge"
};

const minutesByDifficulty = {
  Foundation: 38,
  Core: 44,
  Exam: 50,
  Challenge: 52
};

const competencyEnLabels = {
  "数学抽象": "mathematical abstraction",
  "逻辑推理": "logical reasoning",
  "数学运算": "mathematical operations",
  "直观想象": "spatial and visual reasoning",
  "数学建模": "mathematical modeling",
  "数据分析": "data analysis",
  "数学语言": "mathematical language"
};

const conceptZhLabels = {
  sets: "集合",
  "set-operations": "集合运算",
  "logic-conditions": "条件关系",
  quantifiers: "量词",
  "inequality-properties": "不等式性质",
  "quadratic-equations": "一元二次方程",
  "quadratic-inequalities": "一元二次不等式",
  "basic-inequality": "基本不等式",
  exponents: "指数",
  radicals: "根式",
  "logarithmic-operations": "对数运算",
  "base-conversion": "换底",
  "power-functions": "幂函数",
  "exponential-functions": "指数函数",
  "logarithmic-functions": "对数函数",
  "function-graphs": "函数图像",
  "function-definition": "函数定义",
  "domain-range": "定义域和值域",
  monotonicity: "单调性",
  parity: "奇偶性",
  "function-zero": "函数零点",
  "inverse-functions": "反函数",
  "unit-circle": "单位圆",
  "trigonometric-ratios": "三角比",
  "trigonometric-identities": "三角恒等式",
  "sine-theorem": "正弦定理",
  "cosine-theorem": "余弦定理",
  "trigonometric-functions": "三角函数",
  "trigonometric-graphs": "三角函数图像",
  periodicity: "周期性",
  "trigonometric-transformations": "三角函数变换",
  "plane-vectors": "平面向量",
  "vector-operations": "向量运算",
  "dot-product": "数量积",
  "vector-coordinates": "向量坐标",
  "vector-applications": "向量应用",
  "complex-numbers": "复数",
  "complex-operations": "复数运算",
  "complex-plane": "复平面",
  "complex-roots": "复数根",
  "solid-geometry": "立体几何",
  "spatial-lines-planes": "空间直线与平面",
  "parallel-perpendicular": "平行与垂直",
  "line-plane-angle": "线面角",
  "distance-in-space": "空间距离",
  "surface-volume": "表面积与体积",
  polyhedra: "多面体",
  "rotational-solids": "旋转体",
  "probability-foundations": "概率基础",
  "sample-space": "样本空间",
  "random-events": "随机事件",
  "probability-operations": "概率运算",
  independence: "独立性",
  sampling: "抽样",
  "data-distribution": "数据分布",
  "statistical-charts": "统计图表",
  "statistical-estimation": "统计估计",
  percentiles: "百分位数",
  "analytic-geometry": "解析几何",
  "line-equations": "直线方程",
  slope: "斜率",
  "point-line-distance": "点到直线距离",
  "circle-equations": "圆的方程",
  ellipse: "椭圆",
  hyperbola: "双曲线",
  "parabola-conic": "抛物线",
  "parametric-equations": "参数方程",
  "polar-coordinates": "极坐标",
  "space-vectors": "空间向量",
  "spatial-coordinate-system": "空间直角坐标系",
  sequences: "数列",
  "arithmetic-sequences": "等差数列",
  "geometric-sequences": "等比数列",
  recurrence: "递推",
  "mathematical-induction": "数学归纳法",
  derivatives: "导数",
  "tangent-line": "切线",
  "monotonicity-extrema": "单调性与极值",
  optimization: "最优化",
  "function-inequalities": "函数不等式",
  "counting-principles": "计数原理",
  "permutations-combinations": "排列组合",
  "binomial-theorem": "二项式定理",
  "case-analysis": "分类讨论",
  "conditional-probability": "条件概率",
  "total-probability": "全概率公式",
  "bayes-formula": "贝叶斯公式",
  "random-variables": "随机变量",
  "binomial-distribution": "二项分布",
  "normal-distribution": "正态分布",
  "bivariate-data": "成对数据",
  correlation: "相关",
  "linear-regression": "线性回归",
  "independence-test": "独立性检验"
};

const pitfallZhLabels = {
  "confusing element and subset": "混淆元素与子集",
  "universe set omitted": "遗漏全集",
  "sufficient and necessary reversed": "充分与必要方向颠倒",
  "inequality direction error": "不等号方向错误",
  "solution interval endpoint error": "解集端点处理错误",
  "basic inequality condition omitted": "遗漏基本不等式成立条件",
  "base condition forgotten": "忘记底数条件",
  "logarithm domain ignored": "忽略对数真数范围",
  "power-law overgeneralized": "幂运算公式过度套用",
  "domain restriction omitted": "遗漏定义域限制",
  "base range misread": "误读底数范围",
  "monotonicity direction reversed": "单调方向判断相反",
  "range and value confused": "混淆值域与函数值",
  "increasing interval confused with positive values": "把递增区间误当成函数值为正",
  "parity checked outside domain": "未先检查定义域就判断奇偶性",
  "degree-radian confusion": "混淆角度制与弧度制",
  "identity condition ignored": "忽略恒等式适用条件",
  "ambiguous triangle case missed": "遗漏三角形多解情形",
  "period formula error": "周期公式使用错误",
  "phase shift sign reversed": "相位平移方向写反",
  "solution interval incomplete": "三角方程区间解不完整",
  "vector direction ignored": "忽略向量方向",
  "dot product sign misread": "误读数量积符号",
  "coordinate decomposition mismatch": "坐标分解不匹配",
  "imaginary unit cycle error": "虚数单位幂周期错误",
  "conjugate sign error": "共轭符号错误",
  "modulus confused with real part": "把模与实部混淆",
  "drawing treated as proof": "把图形直观当作证明",
  "parallel criterion incomplete": "平行判定条件不完整",
  "angle complement confused": "混淆夹角与补角",
  "surface area and volume mixed": "混淆表面积与体积",
  "height chosen incorrectly": "高的选择错误",
  "unit conversion skipped": "遗漏单位换算",
  "sample space incomplete": "样本空间列举不完整",
  "frequency treated as exact probability": "把频率当作精确概率",
  "event relation confused": "混淆事件关系",
  "sample not representative": "样本缺乏代表性",
  "average treated as full distribution": "把平均数当作完整分布",
  "chart scale misread": "误读图表刻度",
  "undefined slope ignored": "忽略斜率不存在",
  "equation form chosen inefficiently": "方程形式选择不当",
  "distance formula target mismatch": "距离公式对象不匹配",
  "wrong focal axis": "焦点轴判断错误",
  "radius squared mishandled": "半径平方处理错误",
  "parameter range unverified": "未验证参数范围",
  "normal vector chosen incorrectly": "法向量选择错误",
  "angle complement error": "空间角补角错误",
  "point-to-plane distance formula misuse": "点到平面距离公式误用",
  "index shift error": "下标平移错误",
  "first term omitted": "遗漏首项",
  "induction base case missing": "归纳法缺少基础步",
  "derivative zero treated as sufficient for extremum": "把导数为零当作极值充分条件",
  "endpoint ignored": "忽略端点",
  "parameter case missed": "遗漏参数分类",
  "case overlap": "分类计数有重叠",
  "permutation and combination swapped": "混淆排列与组合",
  "restriction applied twice": "限制条件重复计算",
  "condition reversed": "条件概率方向反了",
  "distribution assumptions mixed": "混用分布假设",
  "expectation interpreted as guaranteed value": "把期望当作必然值",
  "correlation treated as causation": "把相关当作因果",
  "prediction outside data range": "超出数据范围外推",
  "decision threshold misread": "误读判断阈值"
};

function conceptZh(conceptId) {
  return conceptZhLabels[conceptId] ?? conceptId;
}

function pitfallZh(tag) {
  return pitfallZhLabels[tag] ?? tag;
}

function safePitfallEn(tag, fallback = "missing condition") {
  return (tag ?? fallback).replace("undefined slope ignored", "vertical-line slope case ignored");
}

function englishCompetencies(tags) {
  return tags.map((tag) => competencyEnLabels[tag] ?? tag);
}

const lessonProfiles = {
  "hjb-high-compulsory-1-sets-logic": {
    titleEn: "Sets and Logic",
    hookZh: "先说清对象范围，再判断元素、集合和条件之间的关系。",
    hookEn: "First define the object range, then decide how elements, sets, and conditions relate.",
    warmUpZh: `写出 ${m("\\{2,4,6\\}")} 与 ${m("\\{1,2,3,4\\}")} 的交集，并说明为什么。`,
    warmUpEn: `Find ${m("\\{2,4,6\\}\\cap\\{1,2,3,4\\}")} and explain why.`,
    coreZh: `集合语言把对象范围说清楚；逻辑语言把“能推出什么”和“反过来是否成立”说清楚。学习时先确认全集，再区分 ${m("\\in")}、${m("\\subseteq")}、交集、并集、补集和充分必要条件。`,
    coreEn: `Set language clarifies the object range; logic language clarifies what follows and whether the converse also holds. Start with the universe set, then separate ${m("\\in")}, ${m("\\subseteq")}, intersection, union, complement, and sufficient or necessary conditions.`,
    examples: [
      {
        title: "Finite sets and operations",
        zhPrompt: `设全集 ${m("U=\\{1,2,\\ldots,10\\}")}，${m("A")} 是偶数集合，${m("B")} 是大于 ${m("6")} 的数的集合，求 ${m("A\\cap B")} 与 ${m("\\complement_U B")}.`,
        zhSolution: `${m("A=\\{2,4,6,8,10\\}")}，${m("B=\\{7,8,9,10\\}")}。共同元素是 ${m("\\{8,10\\}")}；全集中不属于 ${m("B")} 的元素是 ${m("\\{1,2,3,4,5,6\\}")}。`,
        enPrompt: `Let ${m("U=\\{1,2,\\ldots,10\\}")}. Let ${m("A")} be the even numbers and ${m("B")} be the numbers greater than ${m("6")}. Find ${m("A\\cap B")} and ${m("\\complement_U B")}.`,
        enSolution: `${m("A=\\{2,4,6,8,10\\}")} and ${m("B=\\{7,8,9,10\\}")}. The intersection is ${m("\\{8,10\\}")}; the complement of ${m("B")} is ${m("\\{1,2,3,4,5,6\\}")}.`
      },
      {
        title: "Sufficient and necessary conditions",
        zhPrompt: `判断“${m("x>4")}”是否是“${m("x>1")}”的充分条件、必要条件。`,
        zhSolution: `${m("x>4")} 一定推出 ${m("x>1")}，所以它是充分条件；但 ${m("x>1")} 不一定推出 ${m("x>4")}，所以不是必要条件。`,
        enPrompt: `Decide whether ${m("x>4")} is sufficient or necessary for ${m("x>1")}.`,
        enSolution: `${m("x>4")} always implies ${m("x>1")}, so it is sufficient. Since ${m("x>1")} does not always imply ${m("x>4")}, it is not necessary.`
      }
    ],
    exitZh: `用一句话解释为什么判断充分必要条件时要检查“正向”和“反向”。`,
    exitEn: "Explain in one sentence why sufficient and necessary conditions require checking both directions."
  },
  "hjb-high-compulsory-1-equations-inequalities": {
    titleEn: "Equations and Inequalities",
    hookZh: "方程给出边界，不等式决定边界两侧哪些区间成立。",
    hookEn: "Equations give the boundaries; inequalities decide which intervals around those boundaries work.",
    warmUpZh: `把 ${m("x^2-5x+6")} 分解因式，并说出它的两个零点。`,
    warmUpEn: `Factor ${m("x^2-5x+6")} and name its two zeros.`,
    coreZh: `不等式变形要保持解集等价。遇到二次不等式时，先求方程的根，再用开口方向或符号表判断区间；用基本不等式时，要同时检查正数条件和等号成立条件。`,
    coreEn: `Inequality transformations must preserve the solution set. For a quadratic inequality, find the roots first, then use opening direction or a sign chart; for the basic inequality, check positivity and the equality condition.`,
    examples: [
      {
        title: "Quadratic sign interval",
        zhPrompt: `解不等式 ${m("x^2-6x+8\\le 0")}.`,
        zhSolution: `${m("x^2-6x+8=(x-2)(x-4)")}。抛物线开口向上，函数值在两根之间不大于零，所以 ${m("2\\le x\\le4")}。`,
        enPrompt: `Solve ${m("x^2-6x+8\\le 0")}.`,
        enSolution: `${m("x^2-6x+8=(x-2)(x-4)")}. The parabola opens upward, so it is non-positive between the roots: ${m("2\\le x\\le4")}.`
      },
      {
        title: "Basic inequality condition",
        zhPrompt: `若 ${m("x>0")}，求 ${m("x+\\frac4x")} 的最小值。`,
        zhSolution: `由基本不等式，${m("x+\\frac4x\\ge2\\sqrt{x\\cdot\\frac4x}=4")}。等号在 ${m("x=2")} 时成立，所以最小值为 ${m("4")}。`,
        enPrompt: `For ${m("x>0")}, find the minimum of ${m("x+\\frac4x")}.`,
        enSolution: `By AM-GM, ${m("x+\\frac4x\\ge2\\sqrt{x\\cdot\\frac4x}=4")}. Equality holds at ${m("x=2")}, so the minimum is ${m("4")}.`
      }
    ],
    exitZh: `写出解二次不等式时“先求根、再判号、最后写区间”的三步。`,
    exitEn: "Write the three steps for solving a quadratic inequality: roots, signs, interval."
  },
  "hjb-high-compulsory-1-powers-exponents-logarithms": {
    titleEn: "Powers, Exponents, and Logarithms",
    hookZh: "指数和对数是一对互逆语言，条件检查比套公式更先一步。",
    hookEn: "Exponents and logarithms are inverse languages, and condition checks come before formula use.",
    warmUpZh: `说明 ${m("\\log_a x")} 中 ${m("a")} 和 ${m("x")} 分别要满足什么条件。`,
    warmUpEn: `State the conditions on ${m("a")} and ${m("x")} in ${m("\\log_a x")}.`,
    coreZh: `幂、指数和对数的运算法则来自定义。处理题目时先检查底数、真数和根式条件，再进行指数化、对数化或换底。`,
    coreEn: `Power, exponent, and logarithm rules come from definitions. Check base, argument, and radical conditions before exponentiating, taking logarithms, or changing bases.`,
    examples: [
      {
        title: "Exponent rule with meaning",
        zhPrompt: `化简 ${m("a^{1/2}\\cdot a^{3/2}")}，其中 ${m("a>0")}.`,
        zhSolution: `同底幂相乘指数相加，${m("a^{1/2+3/2}=a^2")}。条件 ${m("a>0")} 保证分数指数有意义。`,
        enPrompt: `Simplify ${m("a^{1/2}\\cdot a^{3/2}")}, where ${m("a>0")}.`,
        enSolution: `Add exponents with the same base: ${m("a^{1/2+3/2}=a^2")}. The condition ${m("a>0")} keeps the fractional powers meaningful.`
      },
      {
        title: "Logarithm equation",
        zhPrompt: `解方程 ${m("\\log_2(x-1)+\\log_2 4=3")}.`,
        zhSolution: `定义域要求 ${m("x>1")}。合并得 ${m("\\log_2(4x-4)=3")}，所以 ${m("4x-4=8")}，解得 ${m("x=3")}。`,
        enPrompt: `Solve ${m("\\log_2(x-1)+\\log_2 4=3")}.`,
        enSolution: `The domain requires ${m("x>1")}. Combine logs: ${m("\\log_2(4x-4)=3")}, so ${m("4x-4=8")} and ${m("x=3")}.`
      }
    ],
    exitZh: `为什么解对数方程后必须回到定义域检查？`,
    exitEn: "Why must a logarithm equation solution be checked against the domain?"
  },
  "hjb-high-compulsory-1-power-exponential-log-functions": {
    titleEn: "Power, Exponential, and Logarithmic Functions",
    hookZh: "看函数图像时，要同时看底数、定义域、单调性和增长速度。",
    hookEn: "When reading function graphs, look at base, domain, monotonicity, and growth rate together.",
    warmUpZh: `判断 ${m("y=2^x")} 与 ${m("y=\\log_2 x")} 的定义域和值域。`,
    warmUpEn: `State the domains and ranges of ${m("y=2^x")} and ${m("y=\\log_2 x")}.`,
    coreZh: `幂函数、指数函数和对数函数都可以通过图像特征理解：定义域和值域给出可输入与可输出，单调性决定比较方向，平移或伸缩改变图像位置与形状。`,
    coreEn: `Power, exponential, and logarithmic functions can be understood through graph features: domain and range define possible inputs and outputs, monotonicity controls comparison, and transformations move or stretch the graph.`,
    examples: [
      {
        title: "Exponential equation",
        zhPrompt: `解方程 ${m("2^{x-1}=8")}.`,
        zhSolution: `${m("8=2^3")}，所以 ${m("x-1=3")}，解得 ${m("x=4")}。`,
        enPrompt: `Solve ${m("2^{x-1}=8")}.`,
        enSolution: `Since ${m("8=2^3")}, ${m("x-1=3")}, so ${m("x=4")}.`
      },
      {
        title: "Growth model reading",
        zhPrompt: `某量按 ${m("A(t)=100\\cdot1.2^t")} 增长，求 ${m("t=3")} 时的值并解释含义。`,
        zhSolution: `${m("A(3)=100\\cdot1.2^3=172.8")}。这表示经过 3 个单位时间后，该量约为初始值的 ${m("1.728")} 倍。`,
        enPrompt: `A quantity grows by ${m("A(t)=100\\cdot1.2^t")}. Find ${m("A(3)")} and interpret it.`,
        enSolution: `${m("A(3)=100\\cdot1.2^3=172.8")}. After 3 time units, the quantity is about ${m("1.728")} times the initial amount.`
      }
    ],
    exitZh: `比较指数函数和对数函数时，为什么要先看底数是否大于 1？`,
    exitEn: "When comparing exponential and logarithmic functions, why check whether the base is greater than 1 first?"
  },
  "hjb-high-compulsory-1-function-concepts-applications": {
    titleEn: "Function Concepts, Properties, and Applications",
    hookZh: "函数不是只算一个值，而是研究输入、输出和变化规律。",
    hookEn: "A function is not only a value calculation; it studies inputs, outputs, and change patterns.",
    warmUpZh: `求 ${m("f(x)=\\sqrt{x-2}")} 的定义域。`,
    warmUpEn: `Find the domain of ${m("f(x)=\\sqrt{x-2}")}.`,
    coreZh: `研究函数要先定定义域，再看表示方法、值域、单调性、奇偶性、零点和实际含义。模型题还要说明变量的现实范围。`,
    coreEn: `Study functions by fixing the domain first, then examining representation, range, monotonicity, parity, zeros, and real meaning. Modeling tasks also need realistic variable ranges.`,
    examples: [
      {
        title: "Domain with restrictions",
        zhPrompt: `求函数 ${m("f(x)=\\sqrt{x-2}+\\frac1{x+1}")} 的定义域。`,
        zhSolution: `根号要求 ${m("x-2\\ge0")}，分母要求 ${m("x\\ne-1")}。由于 ${m("x\\ge2")} 已经排除 ${m("-1")}，定义域为 ${m("[2,+\\infty)")}.`,
        enPrompt: `Find the domain of ${m("f(x)=\\sqrt{x-2}+\\frac1{x+1}")}.`,
        enSolution: `The square root requires ${m("x\\ge2")} and the denominator requires ${m("x\\ne-1")}. Since ${m("x\\ge2")} already excludes ${m("-1")}, the domain is ${m("[2,+\\infty)")}.`
      },
      {
        title: "Parity check",
        zhPrompt: `判断 ${m("f(x)=x^2+1")} 的奇偶性。`,
        zhSolution: `${m("f(-x)=(-x)^2+1=x^2+1=f(x)")}，且定义域关于 0 对称，所以它是偶函数。`,
        enPrompt: `Determine the parity of ${m("f(x)=x^2+1")}.`,
        enSolution: `${m("f(-x)=(-x)^2+1=x^2+1=f(x)")}. The domain is symmetric about 0, so the function is even.`
      }
    ],
    exitZh: `判断奇偶性时，为什么要先检查定义域是否关于 0 对称？`,
    exitEn: "Why check domain symmetry before deciding whether a function is odd or even?"
  },
  "hjb-high-compulsory-2-trigonometry-foundations": {
    titleEn: "Trigonometry Foundations",
    hookZh: "三角学习从角度制、弧度制和单位圆的对应关系开始。",
    hookEn: "Trigonometry begins with the links among degrees, radians, and the unit circle.",
    warmUpZh: `把 ${m("180^\\circ")} 化为弧度，并说出 ${m("\\sin 30^\\circ")} 的值。`,
    warmUpEn: `Convert ${m("180^\\circ")} to radians and state ${m("\\sin 30^\\circ")}.`,
    coreZh: `三角比把角与边、坐标联系起来。单位圆帮助理解符号和周期，三角恒等式帮助化简，正弦定理和余弦定理帮助处理非直角三角形。`,
    coreEn: `Trigonometric ratios connect angles with sides and coordinates. The unit circle explains signs and periodicity, identities support simplification, and sine/cosine rules solve non-right triangles.`,
    examples: [
      {
        title: "Degree-radian conversion",
        zhPrompt: `将 ${m("150^\\circ")} 化为弧度，并求 ${m("\\sin150^\\circ")}.`,
        zhSolution: `${m("150^\\circ=\\frac{5\\pi}{6}")}。该角在第二象限，参考角为 ${m("30^\\circ")}，所以 ${m("\\sin150^\\circ=\\frac12")}。`,
        enPrompt: `Convert ${m("150^\\circ")} to radians and find ${m("\\sin150^\\circ")}.`,
        enSolution: `${m("150^\\circ=\\frac{5\\pi}{6}")}. It is in quadrant II with reference angle ${m("30^\\circ")}, so ${m("\\sin150^\\circ=\\frac12")}.`
      },
      {
        title: "Cosine rule",
        zhPrompt: `三角形两边长为 ${m("5")}、${m("7")}，夹角为 ${m("60^\\circ")}，求第三边。`,
        zhSolution: `由余弦定理，${m("c^2=5^2+7^2-2\\cdot5\\cdot7\\cos60^\\circ=39")}，所以 ${m("c=\\sqrt{39}")}。`,
        enPrompt: `Two sides of a triangle are ${m("5")} and ${m("7")} with included angle ${m("60^\\circ")}. Find the third side.`,
        enSolution: `By the cosine rule, ${m("c^2=5^2+7^2-2\\cdot5\\cdot7\\cos60^\\circ=39")}, so ${m("c=\\sqrt{39}")}.`
      }
    ],
    exitZh: `什么时候优先考虑正弦定理，什么时候优先考虑余弦定理？`,
    exitEn: "When is the sine rule more natural, and when is the cosine rule more natural?"
  },
  "hjb-high-compulsory-2-trigonometric-functions": {
    titleEn: "Trigonometric Functions",
    hookZh: "三角函数图像的振幅、周期和相位决定了函数的节奏。",
    hookEn: "Amplitude, period, and phase shift determine the rhythm of a trigonometric function.",
    warmUpZh: `说出 ${m("y=\\sin x")} 的周期和最大值。`,
    warmUpEn: `State the period and maximum value of ${m("y=\\sin x")}.`,
    coreZh: `三角函数题要把解析式与图像对应起来：振幅看系数，周期看自变量系数，相位平移看括号内部，区间限制决定答案是否完整。`,
    coreEn: `Trigonometric function problems link formula and graph: amplitude comes from the coefficient, period from the input coefficient, phase shift from the inner expression, and interval restrictions determine completeness.`,
    examples: [
      {
        title: "Amplitude and period",
        zhPrompt: `求函数 ${m("y=2\\sin3x")} 的振幅和周期。`,
        zhSolution: `振幅为 ${m("2")}。周期为 ${m("\\frac{2\\pi}{3}")}，因为 ${m("\\sin bx")} 的周期是 ${m("\\frac{2\\pi}{|b|}")}。`,
        enPrompt: `Find the amplitude and period of ${m("y=2\\sin3x")}.`,
        enSolution: `The amplitude is ${m("2")}. The period is ${m("\\frac{2\\pi}{3}")} because ${m("\\sin bx")} has period ${m("\\frac{2\\pi}{|b|}")}.`
      },
      {
        title: "Interval solution",
        zhPrompt: `在 ${m("[0,2\\pi]")} 内解 ${m("\\sin x=\\frac12")}.`,
        zhSolution: `参考角为 ${m("\\frac\\pi6")}，正弦为正在第一、第二象限，所以 ${m("x=\\frac\\pi6")} 或 ${m("x=\\frac{5\\pi}6")}。`,
        enPrompt: `Solve ${m("\\sin x=\\frac12")} on ${m("[0,2\\pi]")}.`,
        enSolution: `The reference angle is ${m("\\frac\\pi6")}. Sine is positive in quadrants I and II, so ${m("x=\\frac\\pi6")} or ${m("x=\\frac{5\\pi}6")}.`
      }
    ],
    exitZh: `为什么三角方程必须根据给定区间筛选答案？`,
    exitEn: "Why must trigonometric equation solutions be filtered by the given interval?"
  },
  "hjb-high-compulsory-2-plane-vectors": {
    titleEn: "Plane Vectors",
    hookZh: "向量把方向、长度和坐标运算放进同一套语言。",
    hookEn: "Vectors put direction, length, and coordinate operations into one language.",
    warmUpZh: `若 ${m("\\vec a=(2,1)")}，${m("\\vec b=(-1,3)")}，求 ${m("\\vec a+\\vec b")}.`,
    warmUpEn: `If ${m("\\vec a=(2,1)")} and ${m("\\vec b=(-1,3)")}, find ${m("\\vec a+\\vec b")}.`,
    coreZh: `平面向量题的关键是把几何关系转成坐标或线性组合。数量积可以判断夹角、垂直和投影，坐标表示可以让证明变成运算。`,
    coreEn: `Plane-vector problems convert geometric relations into coordinates or linear combinations. Dot products handle angles, perpendicularity, and projections, while coordinates turn proof into computation.`,
    examples: [
      {
        title: "Dot product",
        zhPrompt: `设 ${m("\\vec a=(2,1)")}，${m("\\vec b=(-1,3)")}，求 ${m("\\vec a\\cdot\\vec b")} 并判断是否垂直。`,
        zhSolution: `${m("\\vec a\\cdot\\vec b=2\\cdot(-1)+1\\cdot3=1")}。数量积不为 0，所以两向量不垂直。`,
        enPrompt: `Let ${m("\\vec a=(2,1)")} and ${m("\\vec b=(-1,3)")}. Find ${m("\\vec a\\cdot\\vec b")} and decide whether they are perpendicular.`,
        enSolution: `${m("\\vec a\\cdot\\vec b=2\\cdot(-1)+1\\cdot3=1")}. The dot product is not 0, so the vectors are not perpendicular.`
      },
      {
        title: "Vector midpoint",
        zhPrompt: `点 ${m("A(1,2)")}、${m("B(5,4)")}，求中点 ${m("M")} 的坐标。`,
        zhSolution: `${m("M=(\\frac{1+5}{2},\\frac{2+4}{2})=(3,3)")}。这也可看作位置向量的平均。`,
        enPrompt: `For ${m("A(1,2)")} and ${m("B(5,4)")}, find midpoint ${m("M")}.`,
        enSolution: `${m("M=(\\frac{1+5}{2},\\frac{2+4}{2})=(3,3)")}. This is also the average of the position vectors.`
      }
    ],
    exitZh: `数量积为 0 在几何上表示什么？`,
    exitEn: "What does a dot product of 0 mean geometrically?"
  },
  "hjb-high-compulsory-2-complex-numbers": {
    titleEn: "Complex Numbers",
    hookZh: "复数把数轴扩展成平面，代数运算也有几何意义。",
    hookEn: "Complex numbers extend the number line into a plane, giving algebraic operations geometric meaning.",
    warmUpZh: `写出 ${m("3-2i")} 的实部、虚部和共轭复数。`,
    warmUpEn: `State the real part, imaginary part, and conjugate of ${m("3-2i")}.`,
    coreZh: `复数由实部和虚部组成。运算时要记住 ${m("i^2=-1")}；在复平面中，模表示到原点的距离，共轭表示关于实轴对称。`,
    coreEn: `A complex number has real and imaginary parts. Use ${m("i^2=-1")} in operations; in the complex plane, modulus is distance from the origin and conjugation reflects across the real axis.`,
    examples: [
      {
        title: "Complex multiplication",
        zhPrompt: `计算 ${m("(3+2i)(1-i)")}.`,
        zhSolution: `${m("(3+2i)(1-i)=3-3i+2i-2i^2=5-i")}，因为 ${m("i^2=-1")}。`,
        enPrompt: `Compute ${m("(3+2i)(1-i)")}.`,
        enSolution: `${m("(3+2i)(1-i)=3-3i+2i-2i^2=5-i")} because ${m("i^2=-1")}.`
      },
      {
        title: "Modulus",
        zhPrompt: `求复数 ${m("z=1+i")} 的模，并在复平面中解释。`,
        zhSolution: `${m("|z|=\\sqrt{1^2+1^2}=\\sqrt2")}。它表示点 ${m("(1,1)")} 到原点的距离。`,
        enPrompt: `Find the modulus of ${m("z=1+i")} and interpret it in the complex plane.`,
        enSolution: `${m("|z|=\\sqrt{1^2+1^2}=\\sqrt2")}. It is the distance from ${m("(1,1)")} to the origin.`
      }
    ],
    exitZh: `共轭复数在复平面中对应什么几何变换？`,
    exitEn: "What geometric transformation does conjugation represent in the complex plane?"
  },
  "hjb-high-compulsory-3-spatial-lines-planes": {
    titleEn: "Spatial Lines and Planes",
    hookZh: "空间几何不能只看图形直觉，要把位置关系写成可验证的条件。",
    hookEn: "Spatial geometry cannot rely only on visual intuition; position relations need verifiable conditions.",
    warmUpZh: `说出“线面垂直”需要验证的一个常用条件。`,
    warmUpEn: "Name one common condition used to verify that a line is perpendicular to a plane.",
    coreZh: `研究空间直线和平面时，要区分平行、相交、垂直、夹角和距离。图形可以帮助想象，但结论必须由定义、定理或向量/坐标条件支持。`,
    coreEn: `When studying spatial lines and planes, separate parallelism, intersection, perpendicularity, angle, and distance. Diagrams support imagination, but conclusions must be justified by definitions, theorems, or vector/coordinate conditions.`,
    examples: [
      {
        title: "Line parallel to plane by vectors",
        zhPrompt: `平面法向量为 ${m("\\vec n=(1,2,-1)")}，直线方向向量为 ${m("\\vec v=(2,-1,0)")}。判断直线是否平行于该平面。`,
        zhSolution: `${m("\\vec n\\cdot\\vec v=1\\cdot2+2\\cdot(-1)+(-1)\\cdot0=0")}，方向向量与法向量垂直，所以直线方向平行于平面。`,
        enPrompt: `A plane has normal vector ${m("\\vec n=(1,2,-1)")}; a line has direction vector ${m("\\vec v=(2,-1,0)")}. Decide whether the line is parallel to the plane.`,
        enSolution: `${m("\\vec n\\cdot\\vec v=1\\cdot2+2\\cdot(-1)+(-1)\\cdot0=0")}. The direction vector is perpendicular to the normal vector, so the line direction is parallel to the plane.`
      },
      {
        title: "Point-to-plane distance",
        zhPrompt: `求点 ${m("P(1,1,1)")} 到平面 ${m("x+2y+2z-6=0")} 的距离。`,
        zhSolution: `距离为 ${m("\\frac{|1+2+2-6|}{\\sqrt{1^2+2^2+2^2}}=\\frac13")}。`,
        enPrompt: `Find the distance from ${m("P(1,1,1)")} to the plane ${m("x+2y+2z-6=0")}.`,
        enSolution: `The distance is ${m("\\frac{|1+2+2-6|}{\\sqrt{1^2+2^2+2^2}}=\\frac13")}.`
      }
    ],
    exitZh: `为什么空间图形中的“看起来垂直”不能直接作为证明？`,
    exitEn: "Why is “it looks perpendicular” not enough as a spatial-geometry proof?"
  },
  "hjb-high-compulsory-3-simple-solids": {
    titleEn: "Simple Solids",
    hookZh: "几何体问题要先看清底面、高、侧面和展开关系。",
    hookEn: "Solid-geometry problems start by identifying base, height, side faces, and nets.",
    warmUpZh: `写出半径为 ${m("r")}、高为 ${m("h")} 的圆柱体积公式。`,
    warmUpEn: `Write the volume formula for a cylinder of radius ${m("r")} and height ${m("h")}.`,
    coreZh: `简单几何体的表面积和体积来自结构分解。解题时先判断是棱柱、棱锥、圆柱、圆锥还是球，再把底面积、高、母线或半径等量放入相应公式。`,
    coreEn: `Surface area and volume of simple solids come from structural decomposition. First identify prism, pyramid, cylinder, cone, or sphere, then place base area, height, slant height, or radius into the right formula.`,
    examples: [
      {
        title: "Cylinder volume",
        zhPrompt: `圆柱半径为 ${m("3")}，高为 ${m("5")}，求体积。`,
        zhSolution: `${m("V=\\pi r^2h=\\pi\\cdot3^2\\cdot5=45\\pi")}。`,
        enPrompt: `A cylinder has radius ${m("3")} and height ${m("5")}. Find its volume.`,
        enSolution: `${m("V=\\pi r^2h=\\pi\\cdot3^2\\cdot5=45\\pi")}.`
      },
      {
        title: "Rectangular prism surface area",
        zhPrompt: `长方体长、宽、高分别为 ${m("4,3,2")}，求表面积。`,
        zhSolution: `${m("S=2(4\\cdot3+4\\cdot2+3\\cdot2)=2(12+8+6)=52")}。`,
        enPrompt: `A rectangular prism has dimensions ${m("4,3,2")}. Find its surface area.`,
        enSolution: `${m("S=2(4\\cdot3+4\\cdot2+3\\cdot2)=52")}.`
      }
    ],
    exitZh: `计算几何体表面积时，为什么要先画出或想象展开图？`,
    exitEn: "Why is it useful to imagine a net before finding surface area?"
  },
  "hjb-high-compulsory-3-probability-foundations": {
    titleEn: "Probability Foundations",
    hookZh: "概率先看样本空间，再看事件包含了哪些结果。",
    hookEn: "Probability starts with the sample space, then checks which outcomes belong to the event.",
    warmUpZh: `掷一枚骰子，写出“点数为偶数”的事件。`,
    warmUpEn: `Roll one die. Write the event “the result is even.”`,
    coreZh: `概率初步强调样本空间、随机事件、互斥、对立和独立。先列清所有可能结果，再用事件关系计算，避免把“互斥”和“独立”混为一谈。`,
    coreEn: `Probability foundations emphasize sample space, random events, disjoint events, complements, and independence. List all possible outcomes first, then use event relations; do not confuse disjointness with independence.`,
    examples: [
      {
        title: "Sample-space probability",
        zhPrompt: `掷一枚公平骰子，求点数为偶数的概率。`,
        zhSolution: `样本空间有 ${m("6")} 个结果，偶数结果为 ${m("\\{2,4,6\\}")}，所以概率为 ${m("\\frac36=\\frac12")}。`,
        enPrompt: `Roll a fair die. Find the probability of an even result.`,
        enSolution: `There are ${m("6")} outcomes; the even outcomes are ${m("\\{2,4,6\\}")}. The probability is ${m("\\frac36=\\frac12")}.`
      },
      {
        title: "Union of events",
        zhPrompt: `若 ${m("P(A)=0.4")}，${m("P(B)=0.5")}，${m("P(A\\cap B)=0.2")}，求 ${m("P(A\\cup B)")}.`,
        zhSolution: `${m("P(A\\cup B)=P(A)+P(B)-P(A\\cap B)=0.4+0.5-0.2=0.7")}。`,
        enPrompt: `If ${m("P(A)=0.4")}, ${m("P(B)=0.5")}, and ${m("P(A\\cap B)=0.2")}, find ${m("P(A\\cup B)")}.`,
        enSolution: `${m("P(A\\cup B)=P(A)+P(B)-P(A\\cap B)=0.7")}.`
      }
    ],
    exitZh: `互斥事件和独立事件的区别是什么？`,
    exitEn: "What is the difference between disjoint events and independent events?"
  },
  "hjb-high-compulsory-3-statistics": {
    titleEn: "Statistics",
    hookZh: "统计不是只算平均数，还要判断数据从哪里来、怎样分布。",
    hookEn: "Statistics is not only calculating averages; it asks where data come from and how they are distributed.",
    warmUpZh: `求数据 ${m("2,4,4,6")} 的平均数。`,
    warmUpEn: `Find the mean of ${m("2,4,4,6")}.`,
    coreZh: `统计学习要同时关注抽样方式、图表表达、集中趋势、离散程度和百分位数。结论要回到数据来源，避免用局部样本作过度推断。`,
    coreEn: `Statistics studies sampling, charts, center, spread, and percentiles together. Conclusions must return to data source and avoid overgeneralizing from a limited sample.`,
    examples: [
      {
        title: "Mean and variance",
        zhPrompt: `数据 ${m("2,4,4,6")} 的平均数和方差是多少？`,
        zhSolution: `平均数为 ${m("4")}。方差为 ${m("\\frac{(2-4)^2+(4-4)^2+(4-4)^2+(6-4)^2}{4}=2")}。`,
        enPrompt: `Find the mean and variance of ${m("2,4,4,6")}.`,
        enSolution: `The mean is ${m("4")}. The variance is ${m("\\frac{(2-4)^2+(4-4)^2+(4-4)^2+(6-4)^2}{4}=2")}.`
      },
      {
        title: "Sampling judgment",
        zhPrompt: `只调查篮球队同学的身高，能代表全校学生身高吗？说明理由。`,
        zhSolution: `不能。篮球队样本可能偏高，不具有代表性；应使用覆盖不同年级和班级的随机或分层抽样。`,
        enPrompt: `Can a height survey of only the basketball team represent the whole school? Explain.`,
        enSolution: `No. The sample may be biased toward taller students; a random or stratified sample across grades and classes is more representative.`
      }
    ],
    exitZh: `为什么统计结论必须说明样本来源？`,
    exitEn: "Why must a statistical conclusion mention the source of the sample?"
  },
  "hjb-high-selective-1-lines": {
    titleEn: "Lines in the Coordinate Plane",
    hookZh: "直线方程要根据已知条件选择合适形式。",
    hookEn: "Line equations should be chosen according to the information given.",
    warmUpZh: `过点 ${m("(0,1)")} 且斜率为 ${m("2")} 的直线方程是什么？`,
    warmUpEn: `What is the equation of the line through ${m("(0,1)")} with slope ${m("2")}?`,
    coreZh: `解析几何中的直线问题，关键是把点、斜率、方向、平行、垂直和距离转化为方程条件。选择点斜式、斜截式或一般式，可以让计算更简洁。`,
    coreEn: `Line problems in analytic geometry convert points, slopes, direction, parallelism, perpendicularity, and distance into equation conditions. Choosing point-slope, slope-intercept, or general form can simplify work.`,
    examples: [
      {
        title: "Line through two points",
        zhPrompt: `求过 ${m("A(1,2)")}、${m("B(3,6)")} 的直线方程。`,
        zhSolution: `斜率 ${m("k=\\frac{6-2}{3-1}=2")}。用点斜式 ${m("y-2=2(x-1)")}，化简得 ${m("y=2x")}。`,
        enPrompt: `Find the equation of the line through ${m("A(1,2)")} and ${m("B(3,6)")}.`,
        enSolution: `The slope is ${m("k=\\frac{6-2}{3-1}=2")}. Point-slope form gives ${m("y-2=2(x-1)")}, so ${m("y=2x")}.`
      },
      {
        title: "Point-line distance",
        zhPrompt: `求点 ${m("(1,2)")} 到直线 ${m("3x+4y-10=0")} 的距离。`,
        zhSolution: `距离为 ${m("\\frac{|3\\cdot1+4\\cdot2-10|}{\\sqrt{3^2+4^2}}=\\frac15")}。`,
        enPrompt: `Find the distance from ${m("(1,2)")} to ${m("3x+4y-10=0")}.`,
        enSolution: `The distance is ${m("\\frac{|3\\cdot1+4\\cdot2-10|}{\\sqrt{3^2+4^2}}=\\frac15")}.`
      }
    ],
    exitZh: `什么时候用点斜式比一般式更方便？`,
    exitEn: "When is point-slope form more convenient than general form?"
  },
  "hjb-high-selective-1-conics": {
    titleEn: "Conic Sections",
    hookZh: "圆锥曲线要把几何定义、标准方程和参数范围联系起来。",
    hookEn: "Conics connect geometric definitions, standard equations, and parameter ranges.",
    warmUpZh: `椭圆 ${m("\\frac{x^2}{9}+\\frac{y^2}{4}=1")} 的长半轴是多少？`,
    warmUpEn: `For ${m("\\frac{x^2}{9}+\\frac{y^2}{4}=1")}, what is the semi-major axis?`,
    coreZh: `圆、椭圆、双曲线和抛物线都有定义驱动的方程。解题时先判断曲线类型和标准形式，再处理焦点、离心率、弦、切线或参数条件。`,
    coreEn: `Circles, ellipses, hyperbolas, and parabolas have definition-driven equations. Identify the curve and standard form first, then handle foci, eccentricity, chords, tangents, or parameter conditions.`,
    examples: [
      {
        title: "Ellipse focal distance",
        zhPrompt: `椭圆 ${m("\\frac{x^2}{9}+\\frac{y^2}{4}=1")} 的焦距参数 ${m("c")} 是多少？`,
        zhSolution: `${m("a^2=9")}，${m("b^2=4")}，所以 ${m("c^2=a^2-b^2=5")}，${m("c=\\sqrt5")}。`,
        enPrompt: `For the ellipse ${m("\\frac{x^2}{9}+\\frac{y^2}{4}=1")}, find ${m("c")}.`,
        enSolution: `${m("a^2=9")} and ${m("b^2=4")}, so ${m("c^2=a^2-b^2=5")} and ${m("c=\\sqrt5")}.`
      },
      {
        title: "Parabola focus",
        zhPrompt: `抛物线 ${m("y^2=8x")} 的焦点坐标是什么？`,
        zhSolution: `标准式 ${m("y^2=2px")}，所以 ${m("2p=8")}，${m("p=4")}；焦点为 ${m("(\\frac p2,0)=(2,0)")}。`,
        enPrompt: `Find the focus of ${m("y^2=8x")}.`,
        enSolution: `Using ${m("y^2=2px")}, ${m("2p=8")} so ${m("p=4")}. The focus is ${m("(\\frac p2,0)=(2,0)")}.`
      }
    ],
    exitZh: `为什么圆锥曲线题要先判断标准方程中哪个分母更大？`,
    exitEn: "Why check which denominator is larger in a conic standard equation?"
  },
  "hjb-high-selective-1-space-vectors": {
    titleEn: "Space Vectors and Applications",
    hookZh: "空间向量把立体几何中的角和距离转化为坐标运算。",
    hookEn: "Space vectors turn angles and distances in solid geometry into coordinate operations.",
    warmUpZh: `若 ${m("\\vec a=(1,2,2)")}，求 ${m("|\\vec a|")}.`,
    warmUpEn: `If ${m("\\vec a=(1,2,2)")}, find ${m("|\\vec a|")}.`,
    coreZh: `空间向量方法常用方向向量、法向量、数量积和坐标系。先建立空间模型，再决定用线线角、线面角、面面角或距离公式。`,
    coreEn: `Space-vector methods use direction vectors, normal vectors, dot products, and coordinate systems. Build the spatial model first, then choose line-line angle, line-plane angle, plane-plane angle, or distance formulas.`,
    examples: [
      {
        title: "Angle by dot product",
        zhPrompt: `设 ${m("\\vec a=(1,2,2)")}，${m("\\vec b=(2,0,1)")}，求 ${m("\\vec a\\cdot\\vec b")}。`,
        zhSolution: `${m("\\vec a\\cdot\\vec b=1\\cdot2+2\\cdot0+2\\cdot1=4")}。后续可用 ${m("\\cos\\theta=\\frac{\\vec a\\cdot\\vec b}{|\\vec a||\\vec b|}")} 求夹角。`,
        enPrompt: `Let ${m("\\vec a=(1,2,2)")} and ${m("\\vec b=(2,0,1)")}. Find ${m("\\vec a\\cdot\\vec b")}.`,
        enSolution: `${m("\\vec a\\cdot\\vec b=1\\cdot2+2\\cdot0+2\\cdot1=4")}. Then ${m("\\cos\\theta=\\frac{\\vec a\\cdot\\vec b}{|\\vec a||\\vec b|}")} can be used for the angle.`
      },
      {
        title: "Point-to-plane distance",
        zhPrompt: `点 ${m("P(2,1,0)")} 到平面 ${m("2x-y+2z-3=0")} 的距离是多少？`,
        zhSolution: `距离为 ${m("\\frac{|2\\cdot2-1+0-3|}{\\sqrt{2^2+(-1)^2+2^2}}=0")}，所以点在平面上。`,
        enPrompt: `Find the distance from ${m("P(2,1,0)")} to ${m("2x-y+2z-3=0")}.`,
        enSolution: `The distance is ${m("\\frac{|2\\cdot2-1+0-3|}{\\sqrt{2^2+(-1)^2+2^2}}=0")}, so the point lies on the plane.`
      }
    ],
    exitZh: `法向量在空间几何计算中有什么作用？`,
    exitEn: "What role does a normal vector play in spatial-geometry calculations?"
  },
  "hjb-high-selective-1-sequences": {
    titleEn: "Sequences",
    hookZh: "数列可以看成定义在正整数上的函数，递推和通项是两种表达。",
    hookEn: "A sequence is a function on positive integers; recurrence and explicit formulas are two representations.",
    warmUpZh: `等差数列首项为 ${m("3")}，公差为 ${m("2")}，写出第 ${m("5")} 项。`,
    warmUpEn: `An arithmetic sequence has first term ${m("3")} and common difference ${m("2")}. Find the fifth term.`,
    coreZh: `数列学习要关注首项、递推关系、通项公式、求和和归纳证明。写式子时要特别检查下标从哪里开始。`,
    coreEn: `Sequence study focuses on first term, recurrence, explicit formula, summation, and induction. Always check where the index starts.`,
    examples: [
      {
        title: "Arithmetic sum",
        zhPrompt: `等差数列首项 ${m("a_1=3")}，公差 ${m("d=2")}，求前 ${m("10")} 项和。`,
        zhSolution: `${m("a_{10}=3+9\\cdot2=21")}，所以 ${m("S_{10}=\\frac{10(3+21)}2=120")}。`,
        enPrompt: `An arithmetic sequence has ${m("a_1=3")} and ${m("d=2")}. Find ${m("S_{10}")}.`,
        enSolution: `${m("a_{10}=3+9\\cdot2=21")}, so ${m("S_{10}=\\frac{10(3+21)}2=120")}.`
      },
      {
        title: "Recurrence reading",
        zhPrompt: `若 ${m("a_1=1")}，${m("a_{n+1}=2a_n+1")}，求 ${m("a_3")}.`,
        zhSolution: `${m("a_2=2\\cdot1+1=3")}，${m("a_3=2\\cdot3+1=7")}。`,
        enPrompt: `If ${m("a_1=1")} and ${m("a_{n+1}=2a_n+1")}, find ${m("a_3")}.`,
        enSolution: `${m("a_2=2\\cdot1+1=3")} and ${m("a_3=2\\cdot3+1=7")}.`
      }
    ],
    exitZh: `递推公式和通项公式各自适合解决什么问题？`,
    exitEn: "What kinds of tasks are recurrence formulas and explicit formulas each suited for?"
  },
  "hjb-high-selective-2-derivatives": {
    titleEn: "Derivatives and Applications",
    hookZh: "导数把函数变化率、切线斜率和最值判断连接起来。",
    hookEn: "Derivatives connect rate of change, tangent slope, and extrema decisions.",
    warmUpZh: `求 ${m("f(x)=x^2")} 的导函数。`,
    warmUpEn: `Find the derivative of ${m("f(x)=x^2")}.`,
    coreZh: `导数应用题要先求导，再看导数符号、零点和端点。极值、最值、切线和不等式证明都要有区间与条件意识。`,
    coreEn: `Derivative applications start by differentiating, then reading derivative signs, zeros, and endpoints. Extrema, maxima/minima, tangents, and inequality proofs all require attention to intervals and conditions.`,
    examples: [
      {
        title: "Monotonicity from derivative",
        zhPrompt: `设 ${m("f(x)=x^3-3x")}，求单调区间。`,
        zhSolution: `${m("f'(x)=3x^2-3=3(x-1)(x+1)")}。导数在 ${m("(-\\infty,-1)")} 与 ${m("(1,+\\infty)")} 为正，在 ${m("(-1,1)")} 为负，所以函数先增、后减、再增。`,
        enPrompt: `Let ${m("f(x)=x^3-3x")}. Find its monotonic intervals.`,
        enSolution: `${m("f'(x)=3x^2-3=3(x-1)(x+1)")}. The derivative is positive on ${m("(-\\infty,-1)")} and ${m("(1,+\\infty)")}, negative on ${m("(-1,1)")}; the function increases, decreases, then increases.`
      },
      {
        title: "Tangent line",
        zhPrompt: `求 ${m("y=x^2")} 在 ${m("x=1")} 处的切线方程。`,
        zhSolution: `${m("y'=2x")}，在 ${m("x=1")} 处斜率为 ${m("2")}，点为 ${m("(1,1)")}。切线为 ${m("y-1=2(x-1)")}，即 ${m("y=2x-1")}。`,
        enPrompt: `Find the tangent line to ${m("y=x^2")} at ${m("x=1")}.`,
        enSolution: `${m("y'=2x")}; at ${m("x=1")}, the slope is ${m("2")} and the point is ${m("(1,1)")}. The tangent is ${m("y-1=2(x-1)")}, so ${m("y=2x-1")}.`
      }
    ],
    exitZh: `导数为 0 为什么不一定直接说明该点是极值点？`,
    exitEn: "Why does derivative zero not automatically prove an extremum?"
  },
  "hjb-high-selective-2-counting-principles": {
    titleEn: "Counting Principles",
    hookZh: "计数题先分类，再判断每类是排列、组合还是乘法原理。",
    hookEn: "Counting problems first require cases, then decide whether each case uses permutations, combinations, or multiplication.",
    warmUpZh: `从 5 名同学中选 2 名，顺序不重要，有多少种选法？`,
    warmUpEn: `Choose 2 students from 5, order not important. How many choices are there?`,
    coreZh: `计数原理的难点在于不重不漏。先确定分类是否互斥，再判断每一步是否有顺序；二项式定理题要看清指定项和系数。`,
    coreEn: `Counting is difficult because cases must be exhaustive and non-overlapping. Decide whether cases are disjoint and whether order matters; for binomial theorem items, read the requested term and coefficient carefully.`,
    examples: [
      {
        title: "Restriction in arrangements",
        zhPrompt: `用数字 ${m("1,2,3,4")} 组成没有重复数字的三位数，且百位不能为 ${m("1")}，共有多少个？`,
        zhSolution: `百位可选 ${m("2,3,4")}，有 ${m("3")} 种；十位从剩下 3 个选，个位从剩下 2 个选，共 ${m("3\\cdot3\\cdot2=18")} 个。`,
        enPrompt: `Form three-digit numbers without repeated digits from ${m("1,2,3,4")}, with hundreds digit not ${m("1")}. How many are there?`,
        enSolution: `The hundreds digit has ${m("3")} choices; the tens digit then has ${m("3")} choices and the ones digit ${m("2")}. Total: ${m("3\\cdot3\\cdot2=18")}.`
      },
      {
        title: "Binomial coefficient",
        zhPrompt: `求 ${m("(1+x)^5")} 中 ${m("x^2")} 的系数。`,
        zhSolution: `由二项式定理，${m("x^2")} 的系数为 ${m("\\binom52=10")}。`,
        enPrompt: `Find the coefficient of ${m("x^2")} in ${m("(1+x)^5")}.`,
        enSolution: `By the binomial theorem, the coefficient is ${m("\\binom52=10")}.`
      }
    ],
    exitZh: `排列与组合的关键区别是什么？`,
    exitEn: "What is the key difference between a permutation and a combination?"
  },
  "hjb-high-selective-2-probability-continuation": {
    titleEn: "Conditional Probability and Distributions",
    hookZh: "条件概率要先更新样本空间，再计算事件概率。",
    hookEn: "Conditional probability updates the sample space before calculating event probability.",
    warmUpZh: `解释 ${m("P(A|B)")} 中竖线的含义。`,
    warmUpEn: `Explain the meaning of the bar in ${m("P(A\\mid B)")}.`,
    coreZh: `概率续学把条件概率、全概率、贝叶斯公式、随机变量和常见分布联系起来。先判断模型，再代入公式，最后解释期望、方差或概率的实际意义。`,
    coreEn: `This unit connects conditional probability, total probability, Bayes formula, random variables, and common distributions. Choose the model first, then substitute into formulas and interpret expectation, variance, or probability.`,
    examples: [
      {
        title: "Conditional probability",
        zhPrompt: `若 ${m("P(A\\cap B)=0.18")}，${m("P(B)=0.6")}，求 ${m("P(A|B)")}.`,
        zhSolution: `${m("P(A|B)=\\frac{P(A\\cap B)}{P(B)}=\\frac{0.18}{0.6}=0.3")}。`,
        enPrompt: `If ${m("P(A\\cap B)=0.18")} and ${m("P(B)=0.6")}, find ${m("P(A|B)")}.`,
        enSolution: `${m("P(A|B)=\\frac{P(A\\cap B)}{P(B)}=\\frac{0.18}{0.6}=0.3")}.`
      },
      {
        title: "Binomial expectation",
        zhPrompt: `随机变量 ${m("X\\sim B(10,0.4)")}，求 ${m("E(X)")}.`,
        zhSolution: `二项分布期望为 ${m("np")}，所以 ${m("E(X)=10\\cdot0.4=4")}。`,
        enPrompt: `If ${m("X\\sim B(10,0.4)")}, find ${m("E(X)")}.`,
        enSolution: `The expectation of a binomial distribution is ${m("np")}, so ${m("E(X)=10\\cdot0.4=4")}.`
      }
    ],
    exitZh: `为什么条件概率题要先明确“条件”对应的新范围？`,
    exitEn: "Why must a conditional-probability problem first identify the new restricted space?"
  },
  "hjb-high-selective-2-bivariate-data": {
    titleEn: "Bivariate Data Analysis",
    hookZh: "成对数据分析要看关系强弱，也要避免把相关说成因果。",
    hookEn: "Bivariate data analysis studies association strength while avoiding causal overclaims.",
    warmUpZh: `如果散点图大致从左下到右上，相关方向通常是什么？`,
    warmUpEn: "If a scatter plot rises from lower left to upper right, what is the usual direction of association?",
    coreZh: `成对数据分析关注散点图、相关系数、线性回归、残差和独立性检验。模型只能在数据支持的范围内解释，不能把相关性直接说成因果关系。`,
    coreEn: `Bivariate data analysis uses scatter plots, correlation, linear regression, residuals, and independence tests. A model should be interpreted within the data-supported range and correlation must not be claimed as causation.`,
    examples: [
      {
        title: "Regression prediction",
        zhPrompt: `某线性回归模型为 ${m("\\hat y=2x+1")}，当 ${m("x=4")} 时预测值是多少？`,
        zhSolution: `${m("\\hat y=2\\cdot4+1=9")}。这是模型预测值，不一定等于真实观测值。`,
        enPrompt: `A linear regression model is ${m("\\hat y=2x+1")}. What is the predicted value when ${m("x=4")}?`,
        enSolution: `${m("\\hat y=2\\cdot4+1=9")}. This is a model prediction, not necessarily the actual observed value.`
      },
      {
        title: "Correlation interpretation",
        zhPrompt: `若两个变量的相关系数约为 ${m("0.85")}，可以直接说一个变量导致另一个变量变化吗？`,
        zhSolution: `不能。${m("0.85")} 表示较强正相关，但相关不等于因果，还需实验设计或额外证据支持因果判断。`,
        enPrompt: `If two variables have correlation about ${m("0.85")}, can we directly say one causes the other?`,
        enSolution: `No. ${m("0.85")} suggests strong positive association, but correlation is not causation; causal claims require experimental design or additional evidence.`
      }
    ],
    exitZh: `线性回归模型为什么不应随意外推到数据范围之外？`,
    exitEn: "Why should a linear regression model not be freely extrapolated outside the data range?"
  }
};

function conceptListZh(card) {
  return card.conceptIds.map(conceptZh).slice(0, 5).join("、");
}

function conceptListEn(card) {
  return card.conceptIds.slice(0, 5).join(", ");
}

function teacherGuide(card, profile) {
  const conceptsZh = conceptListZh(card);
  const competenciesZh = card.competencyTags.slice(0, 3).join("、");
  const competenciesEn = englishCompetencies(card.competencyTags).slice(0, 3).join(", ");
  const firstPitfallZh = pitfallZh(card.misconceptionTags[0] ?? "条件遗漏");
  const firstPitfallEn = safePitfallEn(card.misconceptionTags[0]);

  return {
    zhHans: {
      objectives: [
        `学生能用自己的话说明“${card.chapter}”中的核心概念，并能把问题归入 ${conceptsZh} 等知识点。`,
        `学生能完成至少一道基础例题和一道迁移例题，并解释关键条件。`,
        `学生能识别本章常见误区，例如 ${firstPitfallZh}。`
      ],
      lessonFlow: [
        `0-5 分钟：用导入问题激活前置知识，要求学生先说“已知、所求、限制条件”。`,
        `5-15 分钟：讲解核心概念，板书 ${conceptsZh} 的关系图。`,
        `15-30 分钟：完成两道原创例题，第一题教师示范，第二题让学生先独立写一步。`,
        `30-40 分钟：用检查点诊断 ${firstPitfallZh}，收集学生解释而不仅是答案。`,
        `40-50 分钟：布置出口题与分层作业，记录需要重讲的小组。`
      ],
      boardPlan: `板书建议：左侧写本节核心概念 ${conceptsZh}，中间保留例题步骤，右侧列出“条件检查、方法选择、结果验证”三栏。`,
      keyQuestions: [
        `这道题首先限制了哪些对象或变量？`,
        `如果换一种表示方式，结论是否更容易看出？`,
        `哪个步骤最容易出现 ${firstPitfallZh}，怎样检查？`
      ],
      differentiation: [
        `基础支持：先给出方法框架，让学生补充关键条件。`,
        `核心推进：让学生比较两种解法的效率。`,
        `挑战拓展：改变一个参数或限制条件，判断原结论是否仍成立。`
      ],
      homework: `建议作业：3 道基础巩固、2 道方法迁移、1 道开放解释题；教师批改时优先看条件书写和推理完整性。`
    },
    en: {
      objectives: [
        `Students can explain the core idea of ${card.chapter} and connect it to ${conceptListEn(card)}.`,
        "Students can solve one guided example and one transfer example while naming the key condition.",
        `Students can diagnose a common pitfall such as ${firstPitfallEn}.`
      ],
      lessonFlow: [
        "0-5 min: Use the hook to activate prerequisites and ask students to name givens, target, and restrictions.",
        `5-15 min: Teach the core idea and draw a relationship map for ${conceptListEn(card)}.`,
        "15-30 min: Work two original examples; model the first and let students attempt one step in the second.",
        `30-40 min: Use checkpoints to diagnose ${firstPitfallEn}; collect reasoning, not only answers.`,
        "40-50 min: Assign the exit ticket and tiered homework; note groups needing reteaching."
      ],
      boardPlan: `Board plan: put ${conceptListEn(card)} on the left, worked-example steps in the center, and condition check / method choice / result verification on the right.`,
      keyQuestions: [
        "What objects or variables are restricted first?",
        "Would another representation make the conclusion easier to see?",
        `Where might ${firstPitfallEn} appear, and how can we check it?`
      ],
      differentiation: [
        "Foundation: provide the method frame and ask students to fill in conditions.",
        "Core: ask students to compare two solution paths.",
        "Challenge: change one parameter or restriction and test whether the conclusion still holds."
      ],
      homework: `Suggested homework: 3 foundation items, 2 transfer items, and 1 explanation item; prioritize condition writing and reasoning completeness when marking.`
    },
    qualityNotes: {
      competencyFocus: card.competencyTags,
      primaryRisk: firstPitfallZh,
      estimatedLessonMinutes: 45
    }
  };
}

function checkpointItems(card, profile) {
  const firstConcept = conceptZh(card.conceptIds[0] ?? card.chapter);
  const secondConcept = conceptZh(card.conceptIds[1] ?? card.conceptIds[0] ?? card.chapter);
  const firstPitfall = pitfallZh(card.misconceptionTags[0] ?? "条件遗漏");

  return {
    zhHans: [
      `我能说明本课中的 ${firstConcept} 与 ${secondConcept} 分别解决什么问题。`,
      "我能在例题中先写出已知、所求和限制条件。",
      `我能检查并避免 ${firstPitfall}。`,
      `我能完成出口题：${profile.exitZh}`
    ],
    en: [
      `I can explain what ${card.conceptIds[0] ?? card.chapter} and ${card.conceptIds[1] ?? card.conceptIds[0] ?? card.chapter} are used for.`,
      "I can write givens, target, and restrictions before solving.",
      `I can check and avoid ${safePitfallEn(card.misconceptionTags[0], "missing conditions")}.`,
      `I can complete the exit ticket: ${profile.exitEn}`
    ]
  };
}

function lessonForCard(card) {
  const profile = lessonProfiles[card.id];
  if (!profile) {
    throw new Error(`Missing lesson profile for ${card.id}`);
  }

  const grade = card.grades[0] ?? "S4";
  const semester = card.semesters[0] ?? "full-year";
  const difficulty = difficultyMap[card.difficultyBand] ?? "Core";
  const pack = buildMainlandHjbHighEvidencePack({
    grade,
    semester,
    chapter: card.chapter,
    conceptIds: card.conceptIds,
    intent: "generate-lesson",
    difficultyBand: card.difficultyBand,
    limit: 6
  });
  const teacher = teacherGuide(card, profile);
  const checkpoints = checkpointItems(card, profile);
  const conceptsZh = conceptListZh(card);
  const conceptsEn = conceptListEn(card);

  return {
    reviewStatus: "approved",
    integrationStatus: "production-integrated",
    sourceSafetyStatus: "safe-rag-original-content",
    generatedAt,
    metadata: {
      topicId: card.id,
      slug: card.id,
      curriculumTrack: card.curriculumTrack,
      publisher: card.publisher,
      volume: card.volume,
      chapter: card.chapter,
      grade,
      grades: card.grades,
      semester,
      semesters: card.semesters,
      module: card.module,
      difficultyBand: card.difficultyBand,
      difficulty,
      estimatedMinutes: minutesByDifficulty[difficulty],
      textbookCardIds: pack.textbookCards.map((item) => item.id),
      hjbExamPatternCardIds: pack.hjbExamPatternCards.map((item) => item.id),
      sharedExamPatternCardIds: pack.examPatternCards.map((item) => item.id),
      conceptIds: card.conceptIds,
      competencyTags: card.competencyTags,
      misconceptionTags: card.misconceptionTags,
      sourceBoundary: "MAIS original lesson generated from safe RAG metadata only; no textbook body text, source examples, page locators, answer keys, diagrams, OCR, or embeddings."
    },
    studentLesson: {
      zhHans: {
        title: `${card.chapter}：沪教版高中导学`,
        hook: profile.hookZh,
        objectives: [
          `理解 ${conceptsZh} 的核心含义。`,
          `能把 ${card.chapter} 的问题转化为清晰的条件、表示和推理步骤。`,
          `能识别并避免 ${
            card.misconceptionTags.slice(0, 2).map(pitfallZh).join("、") || "条件遗漏"
          }。`
        ],
        prerequisiteWarmUp: profile.warmUpZh,
        conceptExplanation: sentence([
          profile.coreZh,
          `本课对应沪教版 ${card.volume} 的“${card.chapter}”章级单元，重点能力包括 ${card.competencyTags.join("、")}。`,
          `学习时不要急于套公式，要先确认对象范围、条件是否完整、结论是否需要回到情境解释。`
        ]),
        workedExamples: profile.examples.map((example) => ({
          title: example.title,
          prompt: example.zhPrompt,
          solution: example.zhSolution,
          check: `检查：答案是否满足题目条件，并说明是否避开了“${pitfallZh(card.misconceptionTags[0] ?? "条件遗漏")}”。`
        })),
        commonPitfalls: unique(card.misconceptionTags).map(pitfallZh).slice(0, 4),
        checkpoints: checkpoints.zhHans.map((prompt, index) => ({
          id: `${card.id}-checkpoint-${index + 1}`,
          prompt,
          answer: index === checkpoints.zhHans.length - 1 ? profile.exitZh : "能说出关键条件并给出理由",
          explanation: "检查的重点是条件是否写清、方法是否匹配、结论是否回到问题。"
        })),
        examStyleStrategy: `考试题先判断考查的是 ${conceptsZh} 中的哪一类，再写“条件检查 -> 方法选择 -> 结果验证”的三步。`,
        extension: profile.examples[1]
          ? `把第二个例题中的一个数值或限制条件改掉，判断解法中哪一步需要同步改变。`
          : `把本课问题改写成一个新的真实情境，并说明变量含义。`,
        exitTicket: profile.exitZh
      },
      en: {
        title: `${profile.titleEn}: HJB High-School Guided Lesson`,
        hook: profile.hookEn,
        objectives: [
          `Understand the core meaning of ${conceptsEn}.`,
          `Translate a ${card.chapter} task into clear conditions, representations, and reasoning steps.`,
          `Recognize and avoid ${card.misconceptionTags.slice(0, 2).map((tag) => safePitfallEn(tag)).join(", ") || "missing conditions"}.`
        ],
        prerequisiteWarmUp: profile.warmUpEn,
        conceptExplanation: sentence([
          profile.coreEn,
          `This lesson is aligned to the Shanghai Education Press volume ${card.volume}, chapter ${card.chapter}.`,
          `The main competencies are ${englishCompetencies(card.competencyTags).join(", ")}.`
        ]),
        workedExamples: profile.examples.map((example) => ({
          title: example.title,
          prompt: example.enPrompt,
          solution: example.enSolution,
          check: `Check that the answer satisfies the conditions and avoids ${safePitfallEn(card.misconceptionTags[0], "missing conditions")}.`
        })),
        commonPitfalls: unique(card.misconceptionTags).map((tag) => safePitfallEn(tag)).slice(0, 4),
        checkpoints: checkpoints.en.map((prompt, index) => ({
          id: `${card.id}-checkpoint-${index + 1}`,
          prompt,
          answer: index === checkpoints.en.length - 1 ? profile.exitEn : "Name the key condition and justify it.",
          explanation: "The check focuses on conditions, method fit, and returning the conclusion to the question."
        })),
        examStyleStrategy: `For exam-style work, first identify which part of ${conceptsEn} is being tested, then use condition check -> method choice -> result verification.`,
        extension: profile.examples[1]
          ? "Change one value or restriction in the second example and decide which step of the solution must change."
          : "Rewrite the task in a new real context and define the variables.",
        exitTicket: profile.exitEn
      }
    },
    teacherGuide: teacher,
    futureProductionMapping: {
      productionLessonSeedReady: true,
      productionTopicReady: true,
      includeTeacherGuideBlock: true
    }
  };
}

const lessons = mainlandHjbHighRagCards.map(lessonForCard);

writeJson(join(__dirname, "lessons.json"), {
  packageId: "mainland-hjb-high-lessons-v1",
  generatedAt,
  curriculumTrack: "MAINLAND_PEP_HIGH",
  publisher: "MAINLAND_HJB",
  lessonCount: lessons.length,
  safetyBoundary: [
    "Generated from committed safe RAG metadata only.",
    "No source PDF text, OCR text, page locators, source examples, answer keys, diagrams, tables, embeddings, or protected layouts are persisted."
  ],
  lessons
});

const indexRows = lessons.map((lesson) => {
  const metadata = lesson.metadata;
  return `| ${metadata.grade} | ${metadata.volume} | ${metadata.chapter} | \`${metadata.topicId}\` | ${metadata.textbookCardIds.length} | ${metadata.hjbExamPatternCardIds.length} | ${metadata.sharedExamPatternCardIds.length} | ${lesson.reviewStatus} |`;
});

writeFileSync(
  join(__dirname, "index.md"),
  [
    "# Mainland HJB High-School Lesson Pack Index",
    "",
    `- Generated at: ${generatedAt}`,
    "- Session ID: S18",
    "- Publisher: `MAINLAND_HJB`",
    "- Curriculum track compatibility: `MAINLAND_PEP_HIGH`",
    "- Status: approved generated Lesson package for website integration",
    "",
    "## Safety Boundary",
    "",
    "This package contains only MAIS-authored lesson copy generated from safe RAG abstractions. It does not contain source PDF body text, source examples, answer keys, source diagrams, page locators, OCR text, embeddings, or protected textbook layouts.",
    "",
    "## Lesson Inventory",
    "",
    "| Grade | Volume | Chapter | Topic ID | Textbook cards | HJB assessment cards | Shared exam cards | Review |",
    "| --- | --- | --- | --- | ---: | ---: | ---: | --- |",
    ...indexRows,
    ""
  ].join("\n")
);

console.log(`Generated ${lessons.length} HJB high-school lessons in ${relative(projectRoot, __dirname)}.`);
