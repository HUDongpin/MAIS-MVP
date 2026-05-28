#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../../..");
const packDir = __dirname;
const outDir = join(packDir, "lessons");
const tmpDir = join(projectRoot, ".tmp/mainland-high-lesson-gen");
const tmpConfigPath = join(projectRoot, ".tmp/mainland-high-lesson-gen-tsconfig.json");
const generatedAt = "2026-05-23T00:00:00+08:00";

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function compileRagSubset() {
  mkdirSync(join(projectRoot, ".tmp"), { recursive: true });
  rmSync(tmpDir, { recursive: true, force: true });
  writeJson(tmpConfigPath, {
    extends: "../tsconfig.json",
    compilerOptions: {
      outDir: "mainland-high-lesson-gen",
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
      "../data/mainlandPepHighTopics.ts",
      "../lib/rag/**/*.ts"
    ],
    exclude: [
      "../node_modules",
      "../.next",
      "mainland-high-lesson-gen",
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
const { mainlandPepHighTopics } = require(join(tmpDir, "data/mainlandPepHighTopics.js"));
const { getMainlandPepEvidencePack } = require(join(tmpDir, "lib/rag/mainlandPep.js"));

const m = (expression) => `\\(${expression}\\)`;
const sentence = (items) => items.filter(Boolean).join(" ");
const unique = (values) => Array.from(new Set(values.filter(Boolean)));
const uniqueBy = (values, keyFn) => {
  const seen = new Set();
  return values.filter((value) => {
    const key = keyFn(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const competencyEnLabels = {
  "数学抽象": "mathematical abstraction",
  "逻辑推理": "logical reasoning",
  "数学运算": "mathematical operations",
  "直观想象": "spatial and visual reasoning",
  "数学建模": "mathematical modeling",
  "数据分析": "data analysis",
  "应用意识": "application awareness",
  "数学语言": "mathematical language"
};

function englishCompetencies(tags) {
  return tags.map((tag) => competencyEnLabels[tag] ?? tag);
}

function escapeTableCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

const pilotTopicIds = new Set([
  "pep-high-s4-quadratic-inequalities",
  "pep-high-s5-derivatives",
  "pep-high-s6-probability-statistics-synthesis"
]);

const profiles = {
  "pep-high-s4-sets-logic": {
    chapter: "集合与常用逻辑用语",
    conceptIds: ["sets", "set-operations", "logic-conditions", "quantifiers"],
    hookZh: "先把对象范围说清楚，再判断关系是否成立。",
    hookEn: "First define the object range, then decide whether each relation is valid.",
    coreZh: `集合语言的重点不是记符号，而是用 ${m("A\\subseteq B")}、${m("A\\cap B")}、${m("A\\cup B")} 和补集把对象范围表达准确；逻辑用语帮助判断一个条件是充分、必要，还是充要。`,
    coreEn: `Set language is not just symbol memory. It uses ${m("A\\subseteq B")}, ${m("A\\cap B")}, ${m("A\\cup B")}, and complements to describe ranges precisely; logical language classifies sufficient, necessary, and equivalent conditions.`,
    examples: [
      {
        zhPrompt: `设全集 ${m("U=\\{1,2,\\ldots,12\\}")}，${m("A")} 为偶数集合，${m("B")} 为大于 ${m("7")} 的数的集合，求 ${m("A\\cap B")} 与 ${m("A\\cup B")}.`,
        zhSolution: `${m("A=\\{2,4,6,8,10,12\\}")}，${m("B=\\{8,9,10,11,12\\}")}。共同元素是 ${m("\\{8,10,12\\}")}，合并后是 ${m("\\{2,4,6,8,9,10,11,12\\}")}。`,
        enPrompt: `Let ${m("U=\\{1,2,\\ldots,12\\}")}. Let ${m("A")} be the even numbers and ${m("B")} be the numbers greater than ${m("7")}. Find ${m("A\\cap B")} and ${m("A\\cup B")}.`,
        enSolution: `${m("A=\\{2,4,6,8,10,12\\}")} and ${m("B=\\{8,9,10,11,12\\}")}. The common elements are ${m("\\{8,10,12\\}")}; the union is ${m("\\{2,4,6,8,9,10,11,12\\}")}.`
      }
    ],
    checkpoints: [
      {
        zhPrompt: `若 ${m("x>3")}，一定能推出 ${m("x>1")} 吗？反过来成立吗？`,
        answer: "前者成立，反过来不成立",
        zhExplanation: `${m("x>3")} 的每个数都大于 ${m("1")}，所以充分；但 ${m("x=2")} 满足 ${m("x>1")} 却不满足 ${m("x>3")}。`,
        enPrompt: `If ${m("x>3")}, must ${m("x>1")} be true? Does the converse hold?`,
        enExplanation: `Every number greater than ${m("3")} is greater than ${m("1")}, but ${m("x=2")} shows the converse fails.`
      },
      {
        zhPrompt: `写出 ${m("\\{1,3,5\\}\\cap\\{3,4,5,6\\}")}.`,
        answer: "{3,5}",
        zhExplanation: `交集只保留两个集合共有的元素。`,
        enPrompt: `Find ${m("\\{1,3,5\\}\\cap\\{3,4,5,6\\}")}.`,
        enExplanation: `The intersection keeps only elements appearing in both sets.`
      },
      {
        zhPrompt: `在全集 ${m("U=\\{a,b,c,d\\}")} 中，若 ${m("A=\\{a,c\\}")}，求 ${m("\\complement_U A")}.`,
        answer: "{b,d}",
        zhExplanation: `补集是在全集中但不在 ${m("A")} 中的元素。`,
        enPrompt: `In ${m("U=\\{a,b,c,d\\}")}, if ${m("A=\\{a,c\\}")}, find ${m("\\complement_U A")}.`,
        enExplanation: `The complement contains the elements in the universe but not in ${m("A")}.`
      }
    ],
    examStrategyZh: "集合题先写全集和条件边界；逻辑题先找反例，再判断充分或必要。",
    examStrategyEn: "For set items, write the universe and boundary conditions first. For logic items, test the converse with a counterexample.",
    extensionZh: "让学生把一个日常分类问题改写成集合语言，并说明哪些条件是充要条件。",
    extensionEn: "Ask students to rewrite a daily classification situation in set language and identify equivalent conditions."
  },
  "pep-high-s4-quadratic-inequalities": {
    chapter: "一元二次函数、方程和不等式",
    conceptIds: ["quadratic-functions", "quadratic-equations", "quadratic-inequalities", "basic-inequality"],
    hookZh: "把方程的根、函数图像和不等式解集连成同一张图。",
    hookEn: "Connect roots, graphs, and inequality solution intervals in one picture.",
    coreZh: `二次不等式的关键是先看 ${m("ax^2+bx+c=0")} 的根，再利用开口方向判断函数值在 ${m("x")} 轴上方还是下方。`,
    coreEn: `For a quadratic inequality, first locate the roots of ${m("ax^2+bx+c=0")}, then use the opening direction to decide where the graph is above or below the ${m("x")}-axis.`,
    examples: [
      {
        zhPrompt: `解不等式 ${m("x^2-5x+6\\le 0")}.`,
        zhSolution: `因式分解得 ${m("(x-2)(x-3)\\le 0")}。抛物线开口向上，在两根之间不大于零，所以解集为 ${m("2\\le x\\le 3")}。`,
        enPrompt: `Solve ${m("x^2-5x+6\\le 0")}.`,
        enSolution: `Factor to get ${m("(x-2)(x-3)\\le 0")}. The parabola opens upward, so it is non-positive between the roots: ${m("2\\le x\\le 3")}.`
      },
      {
        zhPrompt: `若 ${m("x^2-2kx+k+3=0")} 有两个不同实根，求 ${m("k")} 的范围。`,
        zhSolution: `判别式 ${m("\\Delta=(-2k)^2-4(k+3)=4(k^2-k-3)>0")}，所以 ${m("k^2-k-3>0")}。解得 ${m("k<\\frac{1-\\sqrt{13}}2")} 或 ${m("k>\\frac{1+\\sqrt{13}}2")}。`,
        enPrompt: `For ${m("x^2-2kx+k+3=0")} to have two distinct real roots, find the range of ${m("k")}.`,
        enSolution: `The discriminant must be positive: ${m("\\Delta=4(k^2-k-3)>0")}. Hence ${m("k<\\frac{1-\\sqrt{13}}2")} or ${m("k>\\frac{1+\\sqrt{13}}2")}.`
      }
    ],
    checkpoints: [
      {
        zhPrompt: `解 ${m("(x+1)(x-4)>0")}.`,
        answer: "x<-1 或 x>4",
        zhExplanation: `乘积为正表示两个因式同号，区间在两根外侧。`,
        enPrompt: `Solve ${m("(x+1)(x-4)>0")}.`,
        enExplanation: `The product is positive outside the two roots because the factors have the same sign.`
      },
      {
        zhPrompt: `若 ${m("y=-x^2+6x-8")}，写出 ${m("y\\ge0")} 的 ${m("x")} 范围。`,
        answer: "2<=x<=4",
        zhExplanation: `${m("-x^2+6x-8=-(x-2)(x-4)")}，开口向下，在两根之间不小于零。`,
        enPrompt: `For ${m("y=-x^2+6x-8")}, find the ${m("x")} values where ${m("y\\ge0")}.`,
        enExplanation: `${m("-x^2+6x-8=-(x-2)(x-4)")}; a downward-opening parabola is non-negative between the roots.`
      },
      {
        zhPrompt: `方程 ${m("x^2+2x+m=0")} 没有实根时，${m("m")} 应满足什么？`,
        answer: "m>1",
        zhExplanation: `无实根要求 ${m("\\Delta=4-4m<0")}，所以 ${m("m>1")}。`,
        enPrompt: `For ${m("x^2+2x+m=0")} to have no real roots, what must ${m("m")} satisfy?`,
        enExplanation: `No real roots requires ${m("\\Delta=4-4m<0")}, so ${m("m>1")}.`
      }
    ],
    examStrategyZh: "先求根或判别式，再画符号区间；遇到参数题先把存在性条件写成判别式或区间包含关系。",
    examStrategyEn: "Find roots or the discriminant first, then build the sign intervals. For parameter items, convert existence into a discriminant or interval condition.",
    extensionZh: "设计一个价格与利润的二次模型，要求学生解释利润非负的销售区间。",
    extensionEn: "Design a price-profit quadratic model and ask students to interpret the interval where profit is non-negative."
  },
  "pep-high-s4-function-properties": {
    chapter: "函数的概念与性质",
    conceptIds: ["function-definition", "domain-range", "monotonicity", "parity", "function-applications"],
    hookZh: "函数学习的第一步，是把“能不能输入”和“输出怎样变化”分开看。",
    hookEn: "The first step in functions is separating valid inputs from how outputs change.",
    coreZh: `函数是一种对应关系。研究函数时，先确定定义域，再观察值域、单调性、奇偶性和图像特征。`,
    coreEn: `A function is a correspondence. Study it by first fixing the domain, then examining range, monotonicity, parity, and graph behavior.`,
    examples: [
      {
        zhPrompt: `求函数 ${m("f(x)=\\sqrt{x-1}+\\frac1{x-3}")} 的定义域。`,
        zhSolution: `根号要求 ${m("x-1\\ge0")}，分母要求 ${m("x\\ne3")}。因此定义域为 ${m("[1,3)\\cup(3,+\\infty)")}.`,
        enPrompt: `Find the domain of ${m("f(x)=\\sqrt{x-1}+\\frac1{x-3}")}.`,
        enSolution: `The square root requires ${m("x\\ge1")} and the denominator requires ${m("x\\ne3")}. Domain: ${m("[1,3)\\cup(3,+\\infty)")}.`
      }
    ],
    checkpoints: [
      {
        zhPrompt: `函数 ${m("f(x)=x^2-4x+1")} 的对称轴是什么？`,
        answer: "x=2",
        zhExplanation: `${m("x^2-4x+1=(x-2)^2-3")}，对称轴为 ${m("x=2")}。`,
        enPrompt: `What is the axis of symmetry of ${m("f(x)=x^2-4x+1")}?`,
        enExplanation: `${m("f(x)=(x-2)^2-3")}, so the axis is ${m("x=2")}.`
      },
      {
        zhPrompt: `若 ${m("f(-x)=f(x)")} 对定义域内所有 ${m("x")} 成立，函数是什么性质？`,
        answer: "偶函数",
        zhExplanation: `这是偶函数的定义，图像关于 ${m("y")} 轴对称。`,
        enPrompt: `If ${m("f(-x)=f(x)")} for every valid ${m("x")}, what property does the function have?`,
        enExplanation: `That is the definition of an even function; its graph is symmetric about the ${m("y")}-axis.`
      },
      {
        zhPrompt: `函数 ${m("g(x)=\\frac1{x+2}")} 的定义域排除哪个数？`,
        answer: "x=-2",
        zhExplanation: `分母不能为零，所以排除 ${m("x=-2")}。`,
        enPrompt: `Which input is excluded from the domain of ${m("g(x)=\\frac1{x+2}")}?`,
        enExplanation: `The denominator cannot be zero, so ${m("x=-2")} is excluded.`
      }
    ],
    examStrategyZh: "函数题先写定义域；判断单调或奇偶前，必须确认讨论区间在定义域内。",
    examStrategyEn: "Write the domain first. Before judging monotonicity or parity, confirm the interval belongs to the domain.",
    extensionZh: "让学生用同一组数据分别画表格、图像和函数表达式，比较三种表征。",
    extensionEn: "Ask students to represent the same data with a table, graph, and formula, then compare the representations."
  },
  "pep-high-s4-exp-log": {
    chapter: "指数函数与对数函数",
    conceptIds: ["exponential-functions", "logarithmic-functions", "inverse-functions", "function-modeling"],
    hookZh: "指数和对数是一对互逆语言：一个说增长，一个说需要多少次方。",
    hookEn: "Exponential and logarithmic forms are inverse languages: one describes growth, the other asks for an exponent.",
    coreZh: `指数函数和对数函数的单调性由底数决定。对数式必须先检查真数大于零，底数大于零且不等于 ${m("1")}。`,
    coreEn: `The base controls monotonicity for exponential and logarithmic functions. A logarithm requires a positive argument and a positive base not equal to ${m("1")}.`,
    examples: [
      {
        zhPrompt: `解方程 ${m("2^{x+1}=16")}.`,
        zhSolution: `${m("16=2^4")}，所以 ${m("x+1=4")}，得 ${m("x=3")}。`,
        enPrompt: `Solve ${m("2^{x+1}=16")}.`,
        enSolution: `Since ${m("16=2^4")}, ${m("x+1=4")} and ${m("x=3")}.`
      },
      {
        zhPrompt: `求 ${m("f(x)=\\log_3(x-2)")} 的定义域。`,
        zhSolution: `真数要求 ${m("x-2>0")}，所以定义域为 ${m("(2,+\\infty)")}.`,
        enPrompt: `Find the domain of ${m("f(x)=\\log_3(x-2)")}.`,
        enSolution: `The argument must be positive: ${m("x-2>0")}. Domain: ${m("(2,+\\infty)")}.`
      }
    ],
    checkpoints: [
      {
        zhPrompt: `把 ${m("\\log_5 25=2")} 改写成指数式。`,
        answer: "5^2=25",
        zhExplanation: `对数式 ${m("\\log_a b=c")} 等价于 ${m("a^c=b")}。`,
        enPrompt: `Rewrite ${m("\\log_5 25=2")} in exponential form.`,
        enExplanation: `${m("\\log_a b=c")} is equivalent to ${m("a^c=b")}.`
      },
      {
        zhPrompt: `函数 ${m("y=(\\frac12)^x")} 是递增还是递减？`,
        answer: "递减",
        zhExplanation: `底数在 ${m("(0,1)")} 内，指数函数递减。`,
        enPrompt: `Is ${m("y=(\\frac12)^x")} increasing or decreasing?`,
        enExplanation: `An exponential function with base in ${m("(0,1)")} is decreasing.`
      },
      {
        zhPrompt: `求 ${m("\\log_2 8+\\log_2 4")}.`,
        answer: "5",
        zhExplanation: `${m("\\log_2 8=3")}，${m("\\log_2 4=2")}，和为 ${m("5")}。`,
        enPrompt: `Find ${m("\\log_2 8+\\log_2 4")}.`,
        enExplanation: `${m("\\log_2 8=3")} and ${m("\\log_2 4=2")}; the sum is ${m("5")}.`
      }
    ],
    examStrategyZh: "解指数对数题先处理定义域，再用同底、换元或单调性比较。",
    examStrategyEn: "For exponential-logarithmic items, handle the domain first, then use common bases, substitution, or monotonicity.",
    extensionZh: "用细菌增长或折旧情境解释指数模型中底数的意义。",
    extensionEn: "Use growth or depreciation contexts to explain the meaning of the base in an exponential model."
  },
  "pep-high-s4-trigonometry": {
    chapter: "三角函数",
    conceptIds: ["unit-circle", "trigonometric-functions", "trigonometric-graphs", "trigonometric-identities"],
    hookZh: "三角函数把角度、单位圆坐标和周期图像连接起来。",
    hookEn: "Trigonometric functions connect angle measure, unit-circle coordinates, and periodic graphs.",
    coreZh: `学习三角函数图像时，要同时看振幅、周期、相位移动和对称性。例如 ${m("y=A\\sin(\\omega x+\\varphi)+b")} 的周期是 ${m("\\frac{2\\pi}{|\\omega|}")}。`,
    coreEn: `When studying trigonometric graphs, track amplitude, period, phase shift, and symmetry. For ${m("y=A\\sin(\\omega x+\\varphi)+b")}, the period is ${m("\\frac{2\\pi}{|\\omega|}")}.`,
    examples: [
      {
        zhPrompt: `求 ${m("y=2\\sin(2x-\\frac{\\pi}{3})+1")} 的周期和振幅。`,
        zhSolution: `振幅为 ${m("2")}，周期为 ${m("\\frac{2\\pi}{2}=\\pi")}。`,
        enPrompt: `Find the amplitude and period of ${m("y=2\\sin(2x-\\frac{\\pi}{3})+1")}.`,
        enSolution: `Amplitude is ${m("2")}; period is ${m("\\frac{2\\pi}{2}=\\pi")}.`
      }
    ],
    checkpoints: [
      {
        zhPrompt: `把 ${m("180^\\circ")} 化为弧度。`,
        answer: "pi",
        zhExplanation: `${m("180^\\circ=\\pi")} 弧度。`,
        enPrompt: `Convert ${m("180^\\circ")} to radians.`,
        enExplanation: `${m("180^\\circ=\\pi")} radians.`
      },
      {
        zhPrompt: `若 ${m("y=3\\cos x")}，振幅是多少？`,
        answer: "3",
        zhExplanation: `振幅是系数绝对值 ${m("|3|=3")}。`,
        enPrompt: `For ${m("y=3\\cos x")}, what is the amplitude?`,
        enExplanation: `Amplitude is the absolute value of the coefficient: ${m("3")}.`
      },
      {
        zhPrompt: `求 ${m("\\sin^2 x+\\cos^2 x")} 的值。`,
        answer: "1",
        zhExplanation: `这是基本恒等式，恒等于 ${m("1")}。`,
        enPrompt: `Find the value of ${m("\\sin^2 x+\\cos^2 x")}.`,
        enExplanation: `The basic identity gives ${m("1")}.`
      }
    ],
    examStrategyZh: "图像题先读周期和最高最低点，再反推参数；方程题先确定一个周期内的解，再推广。",
    examStrategyEn: "For graph items, read period and extrema before solving parameters. For equations, solve within one period and then generalize.",
    extensionZh: "让学生比较两个同周期但相位不同的波形，解释相位移动的方向。",
    extensionEn: "Ask students to compare two waves with the same period but different phase shifts and explain the direction of the shift."
  },
  "pep-high-s4-plane-vectors": {
    chapter: "平面向量及其应用",
    conceptIds: ["plane-vectors", "vector-operations", "dot-product", "vector-applications"],
    hookZh: "向量同时记录长度和方向，适合把几何关系变成运算。",
    hookEn: "Vectors record both magnitude and direction, turning geometric relations into computation.",
    coreZh: `平面向量可以用坐标表示。数量积 ${m("\\vec a\\cdot\\vec b=|\\vec a||\\vec b|\\cos\\theta")} 连接角度、投影和垂直关系。`,
    coreEn: `Plane vectors can be represented by coordinates. The dot product ${m("\\vec a\\cdot\\vec b=|\\vec a||\\vec b|\\cos\\theta")} connects angles, projections, and perpendicularity.`,
    examples: [
      {
        zhPrompt: `若 ${m("\\vec a=(3,4)")}，${m("\\vec b=(2,-1)")}，求 ${m("\\vec a\\cdot\\vec b")}.`,
        zhSolution: `${m("\\vec a\\cdot\\vec b=3\\times2+4\\times(-1)=2")}。`,
        enPrompt: `If ${m("\\vec a=(3,4)")} and ${m("\\vec b=(2,-1)")}, find ${m("\\vec a\\cdot\\vec b")}.`,
        enSolution: `${m("\\vec a\\cdot\\vec b=3\\cdot2+4\\cdot(-1)=2")}.`
      }
    ],
    checkpoints: [
      {
        zhPrompt: `向量 ${m("(6,8)")} 的模是多少？`,
        answer: "10",
        zhExplanation: `${m("\\sqrt{6^2+8^2}=10")}。`,
        enPrompt: `What is the magnitude of ${m("(6,8)")}?`,
        enExplanation: `${m("\\sqrt{6^2+8^2}=10")}.`
      },
      {
        zhPrompt: `若两个非零向量数量积为 ${m("0")}，它们有什么关系？`,
        answer: "垂直",
        zhExplanation: `数量积为零表示夹角余弦为零，即夹角 ${m("90^\\circ")}。`,
        enPrompt: `If the dot product of two nonzero vectors is ${m("0")}, what is their relation?`,
        enExplanation: `The cosine of the angle is zero, so the vectors are perpendicular.`
      },
      {
        zhPrompt: `从点 ${m("A(1,2)")} 到 ${m("B(5,7)")} 的向量是什么？`,
        answer: "(4,5)",
        zhExplanation: `${m("\\overrightarrow{AB}=(5-1,7-2)=(4,5)")}。`,
        enPrompt: `What is ${m("\\overrightarrow{AB}")} from ${m("A(1,2)")} to ${m("B(5,7)")}?`,
        enExplanation: `${m("\\overrightarrow{AB}=(5-1,7-2)=(4,5)")}.`
      }
    ],
    examStrategyZh: "遇到几何证明，先选基底或建立坐标，再用共线、垂直、夹角等向量条件表达。",
    examStrategyEn: "For geometry proofs, choose basis vectors or coordinates first, then express collinearity, perpendicularity, and angles with vector conditions.",
    extensionZh: "用位移情境设计一题向量加法与数量积结合的问题。",
    extensionEn: "Create a displacement context combining vector addition and dot product reasoning."
  },
  "pep-high-s4-complex-numbers": {
    chapter: "复数",
    conceptIds: ["complex-numbers", "complex-operations", "complex-plane", "complex-roots"],
    hookZh: "复数把数轴扩展成平面，运算也能看成几何移动。",
    hookEn: "Complex numbers extend the number line to a plane, where operations can also carry geometric meaning.",
    coreZh: `复数 ${m("z=a+bi")} 的实部是 ${m("a")}，虚部是 ${m("b")}；模为 ${m("|z|=\\sqrt{a^2+b^2}")}，共轭为 ${m("\\bar z=a-bi")}。`,
    coreEn: `For ${m("z=a+bi")}, the real part is ${m("a")}, the imaginary part is ${m("b")}, the modulus is ${m("|z|=\\sqrt{a^2+b^2}")}, and the conjugate is ${m("\\bar z=a-bi")}.`,
    examples: [
      {
        zhPrompt: `计算 ${m("(3-2i)(1+4i)")}.`,
        zhSolution: `${m("3+12i-2i-8i^2=11+10i")}，因为 ${m("i^2=-1")}。`,
        enPrompt: `Compute ${m("(3-2i)(1+4i)")}.`,
        enSolution: `${m("3+12i-2i-8i^2=11+10i")} because ${m("i^2=-1")}.`
      }
    ],
    checkpoints: [
      {
        zhPrompt: `复数 ${m("4-3i")} 的模是多少？`,
        answer: "5",
        zhExplanation: `${m("\\sqrt{4^2+(-3)^2}=5")}。`,
        enPrompt: `What is the modulus of ${m("4-3i")}?`,
        enExplanation: `${m("\\sqrt{4^2+(-3)^2}=5")}.`
      },
      {
        zhPrompt: `${m("i^4")} 等于多少？`,
        answer: "1",
        zhExplanation: `${m("i^2=-1")}，所以 ${m("i^4=1")}。`,
        enPrompt: `What is ${m("i^4")}?`,
        enExplanation: `${m("i^2=-1")}, so ${m("i^4=1")}.`
      },
      {
        zhPrompt: `${m("2+5i")} 的共轭复数是什么？`,
        answer: "2-5i",
        zhExplanation: `共轭复数保持实部不变，虚部变号。`,
        enPrompt: `What is the conjugate of ${m("2+5i")}?`,
        enExplanation: `The real part stays the same and the imaginary part changes sign.`
      }
    ],
    examStrategyZh: `复数运算中先处理 ${m("i^2=-1")}；几何题把复数转成平面点或向量。`,
    examStrategyEn: `In algebraic operations, reduce with ${m("i^2=-1")}; in geometry items, translate complex numbers into points or vectors.`,
    extensionZh: "让学生在复平面中比较两个复数的模和共轭位置。",
    extensionEn: "Ask students to compare moduli and conjugate positions on the complex plane."
  },
  "pep-high-s4-solid-geometry-intro": {
    chapter: "立体几何初步",
    conceptIds: ["solid-geometry", "spatial-lines-planes", "parallel-perpendicular", "surface-volume"],
    hookZh: "立体几何不能只相信图像，要把空间关系用判定定理说清楚。",
    hookEn: "In solid geometry, diagrams are clues, but spatial relations must be justified by criteria.",
    coreZh: `空间中的平行、垂直、角和距离需要借助线面关系、平面性质和几何体结构来判断。计算表面积和体积时要先识别底面与高。`,
    coreEn: `Parallelism, perpendicularity, angles, and distances in space rely on line-plane relations, plane properties, and solid structure. For surface area and volume, identify the base and height first.`,
    examples: [
      {
        zhPrompt: `一个长方体的长、宽、高分别为 ${m("4,3,5")}，求体积。`,
        zhSolution: `长方体体积 ${m("V=abc=4\\times3\\times5=60")}。`,
        enPrompt: `A cuboid has length ${m("4")}, width ${m("3")}, and height ${m("5")}. Find its volume.`,
        enSolution: `${m("V=abc=4\\times3\\times5=60")}.`
      }
    ],
    checkpoints: [
      {
        zhPrompt: `若一条直线垂直于平面内两条相交直线，它与这个平面有什么关系？`,
        answer: "直线垂直于平面",
        zhExplanation: `这是线面垂直的常用判定。`,
        enPrompt: `If a line is perpendicular to two intersecting lines in a plane, what is its relation to the plane?`,
        enExplanation: `This is a standard criterion for a line being perpendicular to a plane.`
      },
      {
        zhPrompt: `棱长为 ${m("3")} 的正方体体积是多少？`,
        answer: "27",
        zhExplanation: `${m("3^3=27")}。`,
        enPrompt: `What is the volume of a cube with side length ${m("3")}?`,
        enExplanation: `${m("3^3=27")}.`
      },
      {
        zhPrompt: `两个平面都垂直于同一条直线时，这两个平面有什么关系？`,
        answer: "平行",
        zhExplanation: `在高中常用空间关系中，它们互相平行。`,
        enPrompt: `If two planes are both perpendicular to the same line, what is their relation?`,
        enExplanation: `They are parallel in the standard spatial relation.`
      }
    ],
    examStrategyZh: "证明题先找相交线、平行线或垂直线的判定条件；计算题先把空间问题拆成平面直角三角形。",
    examStrategyEn: "For proofs, look for criteria involving intersecting, parallel, or perpendicular lines. For calculations, reduce space relations to right triangles.",
    extensionZh: "用纸盒模型描述一组线面关系，并写出不用图也能成立的理由。",
    extensionEn: "Use a box model to describe line-plane relations and write reasons that do not depend only on a drawing."
  },
  "pep-high-s4-statistics": {
    chapter: "统计",
    conceptIds: ["sampling", "data-distribution", "statistical-charts", "statistical-estimation"],
    hookZh: "统计不是只算平均数，而是用数据说明群体的变化和不确定性。",
    hookEn: "Statistics is not only averaging; it uses data to describe variation and uncertainty in a group.",
    coreZh: `统计分析要关注样本是否有代表性、数据的集中趋势和离散程度，以及图表是否可能误导。平均数适合概括中心，但不能替代分布。`,
    coreEn: `Statistical analysis asks whether the sample is representative, how the data center and spread behave, and whether a chart may mislead. A mean summarizes center but does not replace the distribution.`,
    examples: [
      {
        zhPrompt: `一组数据为 ${m("78,82,84,88,93")}，求平均数。`,
        zhSolution: `总和为 ${m("425")}，平均数为 ${m("425\\div5=85")}。`,
        enPrompt: `For the data ${m("78,82,84,88,93")}, find the mean.`,
        enSolution: `The sum is ${m("425")}; the mean is ${m("425\\div5=85")}.`
      }
    ],
    checkpoints: [
      {
        zhPrompt: `只调查篮球队成员的身高来代表全校学生，样本有什么问题？`,
        answer: "样本不具有代表性",
        zhExplanation: `篮球队成员身高分布可能与全校不同。`,
        enPrompt: `What is wrong with using only basketball-team heights to represent the whole school?`,
        enExplanation: `The basketball team may have a height distribution different from the whole school.`
      },
      {
        zhPrompt: `数据 ${m("2,4,4,10")} 的平均数是多少？`,
        answer: "5",
        zhExplanation: `${m("(2+4+4+10)\\div4=5")}。`,
        enPrompt: `Find the mean of ${m("2,4,4,10")}.`,
        enExplanation: `${m("(2+4+4+10)\\div4=5")}.`
      },
      {
        zhPrompt: `条形图纵轴不从 ${m("0")} 开始时，可能带来什么问题？`,
        answer: "夸大差异",
        zhExplanation: `截断纵轴会让视觉差异看起来比实际更大。`,
        enPrompt: `What can happen if a bar chart's vertical axis does not start at ${m("0")}?`,
        enExplanation: `A truncated axis can visually exaggerate differences.`
      }
    ],
    examStrategyZh: "统计情境题先判断样本与变量，再计算中心量和离散量，最后解释结论能否推广。",
    examStrategyEn: "For statistics contexts, identify the sample and variable, compute center/spread, then decide whether the conclusion generalizes.",
    extensionZh: "让学生设计一个校园调查方案，并说明如何减少抽样偏差。",
    extensionEn: "Ask students to design a school survey and explain how to reduce sampling bias."
  },
  "pep-high-s4-probability": {
    chapter: "概率",
    conceptIds: ["probability-foundations", "random-events", "probability-operations", "simulation"],
    hookZh: "概率帮助我们把随机事件的可能性用可计算的方式表达出来。",
    hookEn: "Probability gives a computable language for uncertainty in random events.",
    coreZh: `概率题先列样本空间，再判断事件关系。互斥事件不能同时发生，对立事件既互斥又覆盖整个样本空间。`,
    coreEn: `Start probability items by listing the sample space, then classify event relations. Mutually exclusive events cannot happen together; complementary events are mutually exclusive and cover the whole sample space.`,
    examples: [
      {
        zhPrompt: `袋中有 ${m("3")} 个红球和 ${m("2")} 个蓝球，随机取一球，取到红球的概率是多少？`,
        zhSolution: `共有 ${m("5")} 个球，其中红球 ${m("3")} 个，所以概率为 ${m("\\frac35")}。`,
        enPrompt: `A bag contains ${m("3")} red balls and ${m("2")} blue balls. One ball is drawn at random. What is the probability of red?`,
        enSolution: `There are ${m("5")} balls and ${m("3")} are red, so the probability is ${m("\\frac35")}.`
      }
    ],
    checkpoints: [
      {
        zhPrompt: `掷一枚均匀骰子，点数大于 ${m("4")} 的概率是多少？`,
        answer: "1/3",
        zhExplanation: `有利结果为 ${m("5,6")}，共 ${m("6")} 种，所以概率 ${m("\\frac26=\\frac13")}。`,
        enPrompt: `Roll a fair die. What is the probability of a result greater than ${m("4")}?`,
        enExplanation: `Favorable outcomes are ${m("5,6")}, so ${m("\\frac26=\\frac13")}.`
      },
      {
        zhPrompt: `事件 ${m("A")} 与其对立事件能同时发生吗？`,
        answer: "不能",
        zhExplanation: `对立事件互斥，且二者覆盖全部可能。`,
        enPrompt: `Can an event and its complement occur at the same time?`,
        enExplanation: `No. Complementary events are mutually exclusive and exhaustive.`
      },
      {
        zhPrompt: `若 ${m("P(A)=0.7")}，求 ${m("P(\\bar A)")}.`,
        answer: "0.3",
        zhExplanation: `${m("P(\\bar A)=1-P(A)=0.3")}。`,
        enPrompt: `If ${m("P(A)=0.7")}, find ${m("P(\\bar A)")}.`,
        enExplanation: `${m("P(\\bar A)=1-P(A)=0.3")}.`
      }
    ],
    examStrategyZh: "先写样本空间，再区分互斥、对立和独立；复杂题可用树状图或表格避免漏数。",
    examStrategyEn: "Write the sample space first, then distinguish mutually exclusive, complementary, and independent events. Use a tree or table to avoid omissions.",
    extensionZh: "让学生用模拟实验比较频率和理论概率。",
    extensionEn: "Ask students to compare experimental frequency with theoretical probability through simulation."
  },
  "pep-high-s5-space-vectors": {
    chapter: "空间向量与立体几何",
    conceptIds: ["space-vectors", "spatial-coordinate-system", "line-plane-angle", "distance-in-space"],
    hookZh: "空间向量把看不清的立体关系变成坐标和方程。",
    hookEn: "Space vectors turn hard-to-see spatial relations into coordinates and equations.",
    coreZh: `空间向量常用方向向量、法向量和数量积解决线线角、线面角、面面角与距离问题。`,
    coreEn: `Space vectors use direction vectors, normal vectors, and dot products to solve line-line angles, line-plane angles, dihedral angles, and distances.`,
    examples: [
      {
        zhPrompt: `点 ${m("A(1,0,2)")}，${m("B(3,2,5)")}，求 ${m("\\overrightarrow{AB}")}.`,
        zhSolution: `${m("\\overrightarrow{AB}=(3-1,2-0,5-2)=(2,2,3)")}。`,
        enPrompt: `For ${m("A(1,0,2)")} and ${m("B(3,2,5)")}, find ${m("\\overrightarrow{AB}")}.`,
        enSolution: `${m("\\overrightarrow{AB}=(2,2,3)")}.`
      }
    ],
    checkpoints: [
      {
        zhPrompt: `向量 ${m("(1,2,2)")} 的模是多少？`,
        answer: "3",
        zhExplanation: `${m("\\sqrt{1^2+2^2+2^2}=3")}。`,
        enPrompt: `What is the magnitude of ${m("(1,2,2)")}?`,
        enExplanation: `${m("\\sqrt{1^2+2^2+2^2}=3")}.`
      },
      {
        zhPrompt: `平面法向量与平面内任意方向向量有什么关系？`,
        answer: "垂直",
        zhExplanation: `法向量定义为垂直于平面的向量。`,
        enPrompt: `What is the relation between a plane normal vector and any direction vector in the plane?`,
        enExplanation: `A normal vector is perpendicular to the plane.`
      },
      {
        zhPrompt: `${m("(1,0,1)\\cdot(2,3,-2)")} 等于多少？`,
        answer: "0",
        zhExplanation: `${m("1\\times2+0\\times3+1\\times(-2)=0")}。`,
        enPrompt: `Find ${m("(1,0,1)\\cdot(2,3,-2)")}.`,
        enExplanation: `${m("1\\cdot2+0\\cdot3+1\\cdot(-2)=0")}.`
      }
    ],
    examStrategyZh: "先建立空间坐标系，再选方向向量和法向量；角度问题通常转化为数量积。",
    examStrategyEn: "Set up coordinates first, then choose direction and normal vectors. Angle problems usually become dot-product problems.",
    extensionZh: "给一个棱锥坐标模型，让学生比较传统几何法和向量法的步骤。",
    extensionEn: "Give a coordinate pyramid model and ask students to compare synthetic geometry and vector methods."
  },
  "pep-high-s5-lines-circles": {
    chapter: "直线和圆的方程",
    conceptIds: ["analytic-geometry", "line-equations", "circle-equations", "coordinate-method"],
    hookZh: "解析几何的核心，是把图形位置变成方程约束。",
    hookEn: "Analytic geometry turns geometric position into equation constraints.",
    coreZh: `直线可由斜率、点斜式、一般式表示；圆的标准方程 ${m("(x-a)^2+(y-b)^2=r^2")} 表示圆心和半径。`,
    coreEn: `A line can be represented by slope form, point-slope form, or general form. The circle equation ${m("(x-a)^2+(y-b)^2=r^2")} gives center and radius.`,
    examples: [
      {
        zhPrompt: `求过点 ${m("(1,2)")} 且斜率为 ${m("-3")} 的直线方程。`,
        zhSolution: `点斜式 ${m("y-2=-3(x-1)")}，整理得 ${m("y=-3x+5")}。`,
        enPrompt: `Find the equation of the line through ${m("(1,2)")} with slope ${m("-3")}.`,
        enSolution: `Point-slope form gives ${m("y-2=-3(x-1)")}, so ${m("y=-3x+5")}.`
      }
    ],
    checkpoints: [
      {
        zhPrompt: `圆 ${m("(x-2)^2+(y+1)^2=9")} 的圆心和半径是什么？`,
        answer: "圆心(2,-1)，半径3",
        zhExplanation: `与标准式比较可得圆心 ${m("(2,-1)")}，半径 ${m("3")}。`,
        enPrompt: `For ${m("(x-2)^2+(y+1)^2=9")}, find the center and radius.`,
        enExplanation: `Compare with standard form: center ${m("(2,-1)")}, radius ${m("3")}.`
      },
      {
        zhPrompt: `直线 ${m("2x-y+4=0")} 的斜率是多少？`,
        answer: "2",
        zhExplanation: `化为 ${m("y=2x+4")}，斜率为 ${m("2")}。`,
        enPrompt: `What is the slope of ${m("2x-y+4=0")}?`,
        enExplanation: `Rewrite as ${m("y=2x+4")}; slope is ${m("2")}.`
      },
      {
        zhPrompt: `点 ${m("(0,0)")} 到直线 ${m("3x+4y-12=0")} 的距离是多少？`,
        answer: "12/5",
        zhExplanation: `距离为 ${m("\\frac{| -12 |}{\\sqrt{3^2+4^2}}=\\frac{12}{5}")}。`,
        enPrompt: `Find the distance from ${m("(0,0)")} to ${m("3x+4y-12=0")}.`,
        enExplanation: `Distance is ${m("\\frac{| -12 |}{\\sqrt{3^2+4^2}}=\\frac{12}{5}")}.`
      }
    ],
    examStrategyZh: "先提取几何量，再选方程形式；涉及距离或相切时优先使用点到直线距离。",
    examStrategyEn: "Extract geometric quantities first, then choose the equation form. For tangency or distance, use point-line distance early.",
    extensionZh: "让学生设计一个圆与直线相切的问题，并说明判定条件。",
    extensionEn: "Ask students to design a tangent line-circle problem and state the criterion."
  },
  "pep-high-s5-conics": {
    chapter: "圆锥曲线的方程",
    conceptIds: ["ellipse", "hyperbola", "parabola-conic", "line-conic-intersection", "analytic-geometry"],
    hookZh: "圆锥曲线题看似复杂，入口通常是定义、标准方程和判别式。",
    hookEn: "Conic items look complex, but the entry points are definitions, standard equations, and discriminants.",
    coreZh: `椭圆、双曲线、抛物线都有定义和标准方程。直线与圆锥曲线联立后，常用判别式、韦达定理和弦长关系分析。`,
    coreEn: `Ellipses, hyperbolas, and parabolas each have definitions and standard equations. Intersect a line with a conic, then use discriminants, Vieta's formulas, and chord relations.`,
    examples: [
      {
        zhPrompt: `椭圆 ${m("\\frac{x^2}{16}+\\frac{y^2}{9}=1")} 的长半轴和短半轴分别是多少？`,
        zhSolution: `因为 ${m("16>9")}，长半轴 ${m("a=4")}，短半轴 ${m("b=3")}。`,
        enPrompt: `For the ellipse ${m("\\frac{x^2}{16}+\\frac{y^2}{9}=1")}, find the semi-major and semi-minor axes.`,
        enSolution: `Since ${m("16>9")}, ${m("a=4")} and ${m("b=3")}.`
      }
    ],
    checkpoints: [
      {
        zhPrompt: `抛物线 ${m("y^2=8x")} 的焦点是什么？`,
        answer: "(2,0)",
        zhExplanation: `${m("y^2=2px")} 中 ${m("2p=8")}，所以 ${m("p=4")}，焦点为 ${m("(\\frac p2,0)=(2,0)")}。`,
        enPrompt: `Find the focus of ${m("y^2=8x")}.`,
        enExplanation: `For ${m("y^2=2px")}, ${m("2p=8")}, so ${m("p=4")} and the focus is ${m("(2,0)")}.`
      },
      {
        zhPrompt: `双曲线 ${m("\\frac{x^2}{9}-\\frac{y^2}{4}=1")} 的 ${m("a")} 是多少？`,
        answer: "3",
        zhExplanation: `${m("a^2=9")}，所以 ${m("a=3")}。`,
        enPrompt: `For ${m("\\frac{x^2}{9}-\\frac{y^2}{4}=1")}, what is ${m("a")}?`,
        enExplanation: `${m("a^2=9")}, so ${m("a=3")}.`
      },
      {
        zhPrompt: `直线与圆锥曲线相切时，联立所得二次方程的判别式通常等于多少？`,
        answer: "0",
        zhExplanation: `相切对应一个公共点，即二次方程有重根。`,
        enPrompt: `When a line is tangent to a conic, what is the discriminant of the resulting quadratic?`,
        enExplanation: `Tangency means one repeated intersection, so the discriminant is ${m("0")}.`
      }
    ],
    examStrategyZh: "先判断曲线类型和标准量，再联立直线；弦长、斜率和参数问题常用韦达定理承接。",
    examStrategyEn: "Identify the conic type and standard parameters first, then intersect with the line. Chord length, slope, and parameter questions often use Vieta's formulas.",
    extensionZh: "让学生从同一个焦点定义出发，比较椭圆、双曲线、抛物线的差异。",
    extensionEn: "Ask students to compare ellipse, hyperbola, and parabola from their focus-based definitions."
  },
  "pep-high-s5-sequences": {
    chapter: "数列",
    conceptIds: ["arithmetic-sequences", "geometric-sequences", "recursion", "summation"],
    hookZh: "数列是按顺序排列的数，关键是看相邻项怎样变化。",
    hookEn: "A sequence is an ordered list; the key is how neighboring terms change.",
    coreZh: `等差数列看公差，等比数列看公比。通项公式和前 ${m("n")} 项和是解决数列题的两条主线。`,
    coreEn: `Arithmetic sequences use a common difference, while geometric sequences use a common ratio. General terms and partial sums are the two main tools.`,
    examples: [
      {
        zhPrompt: `等差数列首项 ${m("5")}，公差 ${m("3")}，求第 ${m("10")} 项。`,
        zhSolution: `${m("a_{10}=5+(10-1)\\times3=32")}。`,
        enPrompt: `An arithmetic sequence has first term ${m("5")} and common difference ${m("3")}. Find the ${m("10")}th term.`,
        enSolution: `${m("a_{10}=5+9\\cdot3=32")}.`
      }
    ],
    checkpoints: [
      {
        zhPrompt: `等比数列 ${m("2,6,18,\\ldots")} 的公比是多少？`,
        answer: "3",
        zhExplanation: `${m("6\\div2=3")}，${m("18\\div6=3")}。`,
        enPrompt: `What is the common ratio of ${m("2,6,18,\\ldots")}?`,
        enExplanation: `${m("6\\div2=3")} and ${m("18\\div6=3")}.`
      },
      {
        zhPrompt: `等差数列前 ${m("n")} 项和公式是什么？`,
        answer: "S_n=n(a_1+a_n)/2",
        zhExplanation: `首尾配对可得 ${m("S_n=\\frac{n(a_1+a_n)}2")}。`,
        enPrompt: `What is the sum formula for the first ${m("n")} terms of an arithmetic sequence?`,
        enExplanation: `Pair first and last terms: ${m("S_n=\\frac{n(a_1+a_n)}2")}.`
      },
      {
        zhPrompt: `若 ${m("a_n=2n+1")}，求 ${m("a_6")}.`,
        answer: "13",
        zhExplanation: `代入 ${m("n=6")} 得 ${m("2\\times6+1=13")}。`,
        enPrompt: `If ${m("a_n=2n+1")}, find ${m("a_6")}.`,
        enExplanation: `Substitute ${m("n=6")}: ${m("13")}.`
      }
    ],
    examStrategyZh: "先判断等差、等比还是递推；求和题先尝试公式、错位相减或裂项。",
    examStrategyEn: "First decide whether the sequence is arithmetic, geometric, or recursive. For sums, try formulas, shifted subtraction, or telescoping.",
    extensionZh: "让学生把分期储蓄或折扣问题建模成数列。",
    extensionEn: "Ask students to model savings or discounts as sequences."
  },
  "pep-high-s5-derivatives": {
    chapter: "一元函数的导数及其应用",
    conceptIds: ["derivatives", "monotonicity-extrema", "optimization", "function-inequalities"],
    hookZh: "导数把函数变化的快慢变成可计算的斜率。",
    hookEn: "Derivatives turn the rate of change of a function into a computable slope.",
    coreZh: `导数 ${m("f'(x)")} 可表示切线斜率，也可判断单调性和极值。若 ${m("f'(x)>0")}，函数在相应区间递增；若 ${m("f'(x)<0")}，函数递减。`,
    coreEn: `${m("f'(x)")} represents tangent slope and helps determine monotonicity and extrema. If ${m("f'(x)>0")}, the function increases; if ${m("f'(x)<0")}, it decreases.`,
    examples: [
      {
        zhPrompt: `设 ${m("f(x)=x^3-3x^2+2")}，求 ${m("f'(x)")} 并判断驻点。`,
        zhSolution: `${m("f'(x)=3x^2-6x=3x(x-2)")}，驻点为 ${m("x=0")} 和 ${m("x=2")}。`,
        enPrompt: `Let ${m("f(x)=x^3-3x^2+2")}. Find ${m("f'(x)")} and the stationary points.`,
        enSolution: `${m("f'(x)=3x^2-6x=3x(x-2)")}; stationary points occur at ${m("x=0")} and ${m("x=2")}.`
      }
    ],
    checkpoints: [
      {
        zhPrompt: `若 ${m("f(x)=x^4")}，求 ${m("f'(x)")}.`,
        answer: "4x^3",
        zhExplanation: `幂函数求导公式给出 ${m("f'(x)=4x^3")}。`,
        enPrompt: `If ${m("f(x)=x^4")}, find ${m("f'(x)")}.`,
        enExplanation: `By the power rule, ${m("f'(x)=4x^3")}.`
      },
      {
        zhPrompt: `函数在某区间内 ${m("f'(x)<0")}，函数单调性如何？`,
        answer: "递减",
        zhExplanation: `导数为负表示函数值随 ${m("x")} 增大而减小。`,
        enPrompt: `If ${m("f'(x)<0")} on an interval, how does the function behave?`,
        enExplanation: `A negative derivative means the function decreases as ${m("x")} increases.`
      },
      {
        zhPrompt: `曲线 ${m("y=x^2")} 在 ${m("x=3")} 处切线斜率是多少？`,
        answer: "6",
        zhExplanation: `${m("y'=2x")}，代入 ${m("x=3")} 得 ${m("6")}。`,
        enPrompt: `What is the tangent slope of ${m("y=x^2")} at ${m("x=3")}?`,
        enExplanation: `${m("y'=2x")}; at ${m("x=3")}, slope is ${m("6")}.`
      }
    ],
    examStrategyZh: "先求导并列表判断符号；含参数题把“恒成立、极值、切线”转化为导数和不等式条件。",
    examStrategyEn: "Differentiate first and build a sign table. For parameter items, translate always-true, extrema, and tangent conditions into derivative and inequality constraints.",
    extensionZh: "用面积最大化或成本最小化情境训练建模、求导和检验端点。",
    extensionEn: "Use an area-maximization or cost-minimization context to practice modeling, differentiating, and checking endpoints."
  },
  "pep-high-s6-counting": {
    chapter: "计数原理",
    conceptIds: ["counting-principles", "permutations-combinations", "binomial-theorem"],
    hookZh: "计数题的关键不是算得快，而是分类不重不漏。",
    hookEn: "The key to counting is not speed; it is classifying without overlap or omission.",
    coreZh: `分类加法原理用于“几类任选其一”，分步乘法原理用于“每一步都要完成”。排列关注顺序，组合不关注顺序。`,
    coreEn: `The addition principle handles separate cases; the multiplication principle handles sequential choices. Permutations care about order, combinations do not.`,
    examples: [
      {
        zhPrompt: `从 ${m("6")} 名学生中选 ${m("2")} 名参加展示，有多少种选法？`,
        zhSolution: `不考虑顺序，用组合 ${m("C_6^2=15")}。`,
        enPrompt: `Choose ${m("2")} students from ${m("6")} for a presentation. How many choices are there?`,
        enSolution: `Order does not matter, so ${m("C_6^2=15")}.`
      }
    ],
    checkpoints: [
      {
        zhPrompt: `用数字 ${m("1,2,3")} 组成无重复三位数，有多少个？`,
        answer: "6",
        zhExplanation: `排列数 ${m("3!=6")}。`,
        enPrompt: `How many three-digit numbers can be formed using ${m("1,2,3")} without repetition?`,
        enExplanation: `${m("3!=6")}.`
      },
      {
        zhPrompt: `${m("(1+x)^5")} 中 ${m("x^2")} 的系数是多少？`,
        answer: "10",
        zhExplanation: `系数为 ${m("C_5^2=10")}。`,
        enPrompt: `What is the coefficient of ${m("x^2")} in ${m("(1+x)^5")}?`,
        enExplanation: `It is ${m("C_5^2=10")}.`
      },
      {
        zhPrompt: `三件不同任务分给三个人，每人一件，有多少种分法？`,
        answer: "6",
        zhExplanation: `这是三个人的排列，${m("3!=6")}。`,
        enPrompt: `Assign three different tasks to three people, one each. How many assignments?`,
        enExplanation: `This is a permutation of three people: ${m("3!=6")}.`
      }
    ],
    examStrategyZh: "先判断是否有顺序，再处理限制条件；复杂限制可用总数减去不合格情况。",
    examStrategyEn: "First decide whether order matters, then handle restrictions. For complex restrictions, count total minus invalid cases.",
    extensionZh: "让学生设计一个含相邻限制的排队问题，并说明分类方案。",
    extensionEn: "Ask students to design an arrangement problem with adjacency restrictions and explain the case split."
  },
  "pep-high-s6-random-variables": {
    chapter: "随机变量及其分布",
    conceptIds: ["random-variables", "discrete-distribution", "expectation-variance", "conditional-probability"],
    hookZh: "随机变量把随机结果转化为数值，方便计算平均水平和波动。",
    hookEn: "A random variable turns random outcomes into numbers, making average behavior and variation computable.",
    coreZh: `离散型随机变量要列出所有可能取值及概率。期望 ${m("E(X)")} 表示长期平均，方差表示波动程度。`,
    coreEn: `For a discrete random variable, list all values and probabilities. Expectation ${m("E(X)")} describes long-run average behavior; variance describes spread.`,
    examples: [
      {
        zhPrompt: `若 ${m("P(X=0)=0.2")}，${m("P(X=1)=0.5")}，${m("P(X=2)=0.3")}，求 ${m("E(X)")}.`,
        zhSolution: `${m("E(X)=0\\times0.2+1\\times0.5+2\\times0.3=1.1")}。`,
        enPrompt: `If ${m("P(X=0)=0.2")}, ${m("P(X=1)=0.5")}, ${m("P(X=2)=0.3")}, find ${m("E(X)")}.`,
        enSolution: `${m("E(X)=0\\cdot0.2+1\\cdot0.5+2\\cdot0.3=1.1")}.`
      }
    ],
    checkpoints: [
      {
        zhPrompt: `若 ${m("X\\sim B(5,0.4)")}，求 ${m("E(X)")}.`,
        answer: "2",
        zhExplanation: `二项分布期望 ${m("np=5\\times0.4=2")}。`,
        enPrompt: `If ${m("X\\sim B(5,0.4)")}, find ${m("E(X)")}.`,
        enExplanation: `For a binomial variable, ${m("E(X)=np=2")}.`
      },
      {
        zhPrompt: `离散分布中所有概率之和应等于多少？`,
        answer: "1",
        zhExplanation: `所有可能结果覆盖样本空间，概率和为 ${m("1")}。`,
        enPrompt: `In a discrete distribution, what must the probabilities sum to?`,
        enExplanation: `All possible outcomes cover the sample space, so the sum is ${m("1")}.`
      },
      {
        zhPrompt: `方差越大，一般表示数据波动越大还是越小？`,
        answer: "越大",
        zhExplanation: `方差衡量随机变量偏离期望的平均程度。`,
        enPrompt: `A larger variance usually means larger or smaller spread?`,
        enExplanation: `Variance measures average squared deviation from the expectation, so larger variance means larger spread.`
      }
    ],
    examStrategyZh: "先列分布列并检查概率和，再计算期望、方差或二项分布概率。",
    examStrategyEn: "List the distribution and check the probability sum before computing expectation, variance, or binomial probabilities.",
    extensionZh: "让学生用一个小游戏建立随机变量，并估计期望收益。",
    extensionEn: "Ask students to create a game-based random variable and estimate expected payoff."
  },
  "pep-high-s6-bivariate-data": {
    chapter: "成对数据的统计分析",
    conceptIds: ["bivariate-data", "correlation", "linear-regression", "statistical-inference"],
    hookZh: "成对数据研究两个变量是否一起变化，但相关不等于因果。",
    hookEn: "Bivariate data studies whether two variables move together, but correlation is not causation.",
    coreZh: `散点图先看方向、强弱和异常点。回归直线描述平均趋势，残差用于判断模型拟合情况。`,
    coreEn: `A scatter plot reveals direction, strength, and outliers. A regression line describes the average trend; residuals diagnose fit.`,
    examples: [
      {
        zhPrompt: `若学习时间增加时测试分数整体上升，这表示正相关还是负相关？`,
        zhSolution: `两个变量同向变化，表示正相关。`,
        enPrompt: `If scores tend to increase as study time increases, is the relation positive or negative?`,
        enSolution: `The variables move in the same direction, so the association is positive.`
      }
    ],
    checkpoints: [
      {
        zhPrompt: `残差等于实际值减去什么？`,
        answer: "预测值",
        zhExplanation: `残差 ${m("=\\text{实际值}-\\text{预测值}")}。`,
        enPrompt: `A residual equals the actual value minus what?`,
        enExplanation: `Residual ${m("=\\text{actual}-\\text{predicted}")}.`
      },
      {
        zhPrompt: `相关系数接近 ${m("-1")} 表示什么？`,
        answer: "强负相关",
        zhExplanation: `接近 ${m("-1")} 表示近似线性且方向相反。`,
        enPrompt: `What does a correlation coefficient close to ${m("-1")} indicate?`,
        enExplanation: `A strong negative linear association.`
      },
      {
        zhPrompt: `只凭相关能否直接断定因果？`,
        answer: "不能",
        zhExplanation: `可能存在混杂变量或反向解释。`,
        enPrompt: `Can correlation alone prove causation?`,
        enExplanation: `No. Confounding variables or reverse explanations may exist.`
      }
    ],
    examStrategyZh: "先读散点图趋势，再解释回归参数；任何因果结论都要谨慎。",
    examStrategyEn: "Read the scatter-plot trend first, then interpret regression parameters. Treat causal claims carefully.",
    extensionZh: "让学生收集两列校园数据，画散点图并说明是否适合线性模型。",
    extensionEn: "Ask students to collect two school-related variables, draw a scatter plot, and judge whether a linear model fits."
  },
  "pep-high-s6-derivative-synthesis": {
    chapter: "导数综合",
    conceptIds: ["derivatives", "optimization", "function-inequalities", "parameter-analysis"],
    hookZh: "导数综合题通常把单调性、极值、零点和不等式压缩在同一个函数中。",
    hookEn: "Derivative synthesis compresses monotonicity, extrema, zeros, and inequalities into one function.",
    coreZh: `综合题要先求导，再按导数符号划分区间。含参数时，把题目条件转化为临界点、最值或恒成立条件。`,
    coreEn: `For synthesis, differentiate first and split intervals by derivative signs. With parameters, translate conditions into critical points, extrema, or always-true inequalities.`,
    examples: [
      {
        zhPrompt: `设 ${m("f(x)=x^3-3ax")}，求 ${m("f'(x)")}，并说明临界点形式。`,
        zhSolution: `${m("f'(x)=3x^2-3a=3(x^2-a)")}。当 ${m("a>0")} 时临界点为 ${m("x=\\pm\\sqrt a")}。`,
        enPrompt: `Let ${m("f(x)=x^3-3ax")}. Find ${m("f'(x)")} and describe the critical points.`,
        enSolution: `${m("f'(x)=3x^2-3a=3(x^2-a)")}. If ${m("a>0")}, critical points are ${m("x=\\pm\\sqrt a")}.`
      }
    ],
    checkpoints: [
      {
        zhPrompt: `若函数在区间端点和驻点处的函数值分别为 ${m("1,4,2")}，最大值是多少？`,
        answer: "4",
        zhExplanation: `闭区间最值在端点或驻点中比较，最大为 ${m("4")}。`,
        enPrompt: `If endpoint and stationary values on a closed interval are ${m("1,4,2")}, what is the maximum?`,
        enExplanation: `Compare endpoint and stationary values; the maximum is ${m("4")}.`
      },
      {
        zhPrompt: `证明 ${m("f(x)\\ge0")} 恒成立时，常转化为什么条件？`,
        answer: "最小值不小于0",
        zhExplanation: `若能求全局最小值，只需证明最小值 ${m("\\ge0")}。`,
        enPrompt: `To prove ${m("f(x)\\ge0")} for all ${m("x")}, what condition is often used?`,
        enExplanation: `Find the global minimum and show it is at least ${m("0")}.`
      },
      {
        zhPrompt: `若 ${m("f'(x)")} 从负变正，函数在该点取得什么？`,
        answer: "极小值",
        zhExplanation: `函数先减后增，所以该点为极小值点。`,
        enPrompt: `If ${m("f'(x)")} changes from negative to positive, what occurs?`,
        enExplanation: `The function decreases then increases, so there is a local minimum.`
      }
    ],
    examStrategyZh: "先完成导数符号表，再把参数放入临界点和端点比较；不要跳过定义域。",
    examStrategyEn: "Build the derivative sign table first, then compare parameter-dependent critical and endpoint values. Do not skip the domain.",
    extensionZh: "设计一个含参数的利润函数，让学生用导数判断最优产量区间。",
    extensionEn: "Design a parameterized profit function and ask students to use derivatives to find an optimal production range."
  },
  "pep-high-s6-analytic-geometry-synthesis": {
    chapter: "解析几何综合",
    conceptIds: ["analytic-geometry", "conic-sections", "line-conic-intersection", "parameter-reasoning"],
    hookZh: "解析几何综合题通常从一条直线和一条曲线的联立开始。",
    hookEn: "Analytic geometry synthesis often begins by intersecting a line and a curve.",
    coreZh: `直线与圆锥曲线联立后，二次方程的判别式控制交点个数，韦达定理连接两交点坐标的和与积。`,
    coreEn: `After intersecting a line with a conic, the discriminant controls the number of intersections, and Vieta's formulas connect sums and products of coordinates.`,
    examples: [
      {
        zhPrompt: `直线 ${m("y=kx+1")} 与抛物线 ${m("y=x^2")} 联立后得到什么方程？`,
        zhSolution: `代入得 ${m("x^2=kx+1")}，即 ${m("x^2-kx-1=0")}。`,
        enPrompt: `Intersect ${m("y=kx+1")} with ${m("y=x^2")}. What quadratic equation results?`,
        enSolution: `Substitute to get ${m("x^2=kx+1")}, so ${m("x^2-kx-1=0")}.`
      }
    ],
    checkpoints: [
      {
        zhPrompt: `二次方程判别式大于 ${m("0")} 时，直线与曲线通常有几个不同交点？`,
        answer: "2",
        zhExplanation: `判别式大于零表示两个不同实根，对应两个交点。`,
        enPrompt: `If a resulting quadratic has discriminant greater than ${m("0")}, how many distinct intersections are there?`,
        enExplanation: `Two distinct real roots correspond to two intersections.`
      },
      {
        zhPrompt: `${m("x^2-5x+6=0")} 的两根和是多少？`,
        answer: "5",
        zhExplanation: `由韦达定理，两根和为 ${m("5")}。`,
        enPrompt: `For ${m("x^2-5x+6=0")}, what is the sum of roots?`,
        enExplanation: `By Vieta's formula, the sum is ${m("5")}.`
      },
      {
        zhPrompt: `圆心到直线距离等于半径时，直线与圆的位置关系是什么？`,
        answer: "相切",
        zhExplanation: `距离等于半径表示只有一个公共点。`,
        enPrompt: `If the distance from a circle center to a line equals the radius, what is the relation?`,
        enExplanation: `The line is tangent to the circle.`
      }
    ],
    examStrategyZh: "把几何关系转成代数条件：相交看判别式，弦长看两根差，定点定值看表达式化简。",
    examStrategyEn: "Translate geometry into algebra: intersections use discriminants, chord length uses root differences, fixed values use simplification.",
    extensionZh: "让学生构造一个参数直线族，并观察交点个数如何随参数变化。",
    extensionEn: "Ask students to build a family of parameterized lines and observe how intersection count changes."
  },
  "pep-high-s6-probability-statistics-synthesis": {
    chapter: "概率统计综合",
    conceptIds: ["probability-foundations", "random-variables", "counting-principles", "bivariate-data"],
    hookZh: "概率统计综合题通常先计数，再建分布，最后解释数据意义。",
    hookEn: "Probability-statistics synthesis usually counts outcomes, builds a distribution, then interprets the data.",
    coreZh: `综合题要把“样本空间、事件、随机变量、统计结论”分层处理。不要把频率、概率和因果解释混为一谈。`,
    coreEn: `Synthesis items separate sample space, events, random variables, and statistical conclusions. Do not confuse frequency, probability, and causal interpretation.`,
    examples: [
      {
        zhPrompt: `某活动成功概率为 ${m("0.6")}，独立进行 ${m("3")} 次，求恰好成功 ${m("2")} 次的概率。`,
        zhSolution: `服从二项分布，概率为 ${m("C_3^2(0.6)^2(0.4)=0.432")}。`,
        enPrompt: `An activity succeeds with probability ${m("0.6")} independently over ${m("3")} trials. Find the probability of exactly ${m("2")} successes.`,
        enSolution: `Use the binomial model: ${m("C_3^2(0.6)^2(0.4)=0.432")}.`
      }
    ],
    checkpoints: [
      {
        zhPrompt: `二项分布模型需要各次试验相互独立吗？`,
        answer: "需要",
        zhExplanation: `二项分布要求固定次数、两种结果、概率不变且试验独立。`,
        enPrompt: `Does a binomial model require independent trials?`,
        enExplanation: `Yes. It requires fixed trials, two outcomes, constant probability, and independence.`
      },
      {
        zhPrompt: `若样本有明显偏差，统计结论应怎样处理？`,
        answer: "谨慎推广",
        zhExplanation: `偏差样本可能不能代表总体。`,
        enPrompt: `If a sample is biased, how should the statistical conclusion be treated?`,
        enExplanation: `Generalize cautiously because the sample may not represent the population.`
      },
      {
        zhPrompt: `若 ${m("X\\sim B(4,0.5)")}，求 ${m("P(X=0)")}.`,
        answer: "1/16",
        zhExplanation: `${m("P(X=0)=C_4^0(0.5)^0(0.5)^4=\\frac1{16}")}。`,
        enPrompt: `If ${m("X\\sim B(4,0.5)")}, find ${m("P(X=0)")}.`,
        enExplanation: `${m("P(X=0)=C_4^0(0.5)^4=\\frac1{16}")}.`
      }
    ],
    examStrategyZh: "先判断模型：古典概型、条件概率、二项分布或统计推断；再写清概率和解释边界。",
    examStrategyEn: "Identify the model first: classical probability, conditional probability, binomial distribution, or statistical inference. Then state probability and interpretation limits.",
    extensionZh: "让学生用同一数据情境分别提出一个概率问题和一个统计解释问题。",
    extensionEn: "Ask students to create both a probability question and a statistical interpretation question from the same data context."
  },
  "pep-high-s6-exam-practice": {
    chapter: "高考风格综合练习",
    conceptIds: ["derivatives", "analytic-geometry", "probability-foundations", "sequences"],
    hookZh: "综合复习的目标不是堆题，而是快速识别入口策略。",
    hookEn: "Mixed review is not about piling up problems; it is about quickly identifying the entry strategy.",
    coreZh: `高考风格综合题常把函数、解析几何、概率统计和数列放在同一套试卷节奏中。训练时要记录题型入口、关键条件和检验步骤。`,
    coreEn: `Exam-style mixed practice places functions, analytic geometry, probability-statistics, and sequences into one assessment rhythm. Track entry strategy, key conditions, and checks.`,
    examples: [
      {
        zhPrompt: `看到“恒成立”与函数参数，应优先想到哪类工具？`,
        zhSolution: `通常优先考虑最值、导数单调性或等价不等式转化。`,
        enPrompt: `When a parameterized function problem says "always true," what tools should you consider first?`,
        enSolution: `Consider extrema, derivative-based monotonicity, or equivalent inequality transformations.`
      }
    ],
    checkpoints: [
      {
        zhPrompt: `直线与圆锥曲线交点个数通常由什么判断？`,
        answer: "判别式",
        zhExplanation: `联立后得到二次方程，判别式控制实根个数。`,
        enPrompt: `What usually determines the number of intersections between a line and a conic?`,
        enExplanation: `After substitution, the discriminant of the quadratic controls real roots.`
      },
      {
        zhPrompt: `概率综合题若有“恰好 k 次成功”，常用什么模型？`,
        answer: "二项分布",
        zhExplanation: `在独立、概率不变且成功/失败两类结果下使用二项分布。`,
        enPrompt: `If a probability item asks for exactly ${m("k")} successes, what model is often used?`,
        enExplanation: `Use a binomial model when trials are independent with constant success probability.`
      },
      {
        zhPrompt: `数列求和中出现相邻项相消，应想到什么方法？`,
        answer: "裂项相消",
        zhExplanation: `相邻项抵消是裂项求和的典型信号。`,
        enPrompt: `If neighboring terms cancel in a sequence sum, what method should you consider?`,
        enExplanation: `This is a signal for telescoping.`
      }
    ],
    examStrategyZh: "每题先标记知识入口、限制条件和检查方式；训练后按错因分类，而不是只看分数。",
    examStrategyEn: "For each item, mark the knowledge entry, restrictions, and checking method. After practice, classify errors rather than only recording scores.",
    extensionZh: "让学生建立个人综合题错因表，按“入口误判、计算错误、条件遗漏、表达不完整”分类。",
    extensionEn: "Ask students to build a personal error log for mixed problems: wrong entry, calculation error, missed condition, or incomplete reasoning."
  }
};

function profileForTopic(topic) {
  const direct = profiles[topic.id];
  if (direct) return direct;

  return {
    chapter: topic.title.zh,
    conceptIds: [],
    hookZh: `围绕${topic.title.zh}建立概念、方法和应用之间的连接。`,
    hookEn: `Build connections among concepts, methods, and applications in ${topic.title.en}.`,
    coreZh: `${topic.description.zh} 学习时先明确对象、条件和目标，再选择合适的数学表示。`,
    coreEn: `${topic.description.en} Start by identifying objects, conditions, and goals, then choose a suitable mathematical representation.`,
    examples: [
      {
        zhPrompt: `设计一道与${topic.title.zh}有关的原创例题，并说明已知、所求和方法。`,
        zhSolution: `先列已知条件，再选择对应定义或公式，最后检验结果是否满足题意。`,
        enPrompt: `Design an original example for ${topic.title.en} and identify the givens, target, and method.`,
        enSolution: `List the givens, choose the relevant definition or formula, and check that the result fits the question.`
      }
    ],
    checkpoints: [
      {
        zhPrompt: `学习${topic.title.zh}时，第一步应确认什么？`,
        answer: "对象、条件和目标",
        zhExplanation: `明确对象、条件和目标可避免公式误用。`,
        enPrompt: `When studying ${topic.title.en}, what should be confirmed first?`,
        enExplanation: `Confirming objects, conditions, and goals prevents formula misuse.`
      },
      {
        zhPrompt: `若结果不满足原条件，应怎样处理？`,
        answer: "舍去或修正",
        zhExplanation: `数学结果必须回到原条件中检验。`,
        enPrompt: `If a result does not satisfy the original conditions, what should be done?`,
        enExplanation: `A mathematical result must be checked against the original conditions.`
      },
      {
        zhPrompt: `综合题中为何要写推理步骤？`,
        answer: "保证逻辑完整",
        zhExplanation: `步骤展示条件如何推出结论，便于发现漏洞。`,
        enPrompt: `Why should reasoning steps be written in a synthesis item?`,
        enExplanation: `Steps show how conditions lead to conclusions and reveal gaps.`
      }
    ],
    examStrategyZh: "先识别知识点，再选择表示方式，最后检验答案。",
    examStrategyEn: "Identify the knowledge point, choose the representation, and then check the answer.",
    extensionZh: "把同一问题改写成概念辨析、计算求解和应用建模三种形式。",
    extensionEn: "Rewrite one problem as concept classification, calculation, and modeling."
  };
}

function section(title, zhHans, en) {
  return { section: title, zhHans, en };
}

const englishAnswerMap = new Map([
  ["前者成立，反过来不成立", "first true; converse false"],
  ["偶函数", "even function"],
  ["递减", "decreasing"],
  ["垂直", "perpendicular"],
  ["直线垂直于平面", "line perpendicular to the plane"],
  ["平行", "parallel"],
  ["样本不具有代表性", "not representative"],
  ["夸大差异", "exaggerates differences"],
  ["不能", "no"],
  ["圆心(2,-1)，半径3", "center (2,-1), radius 3"],
  ["越大", "larger"],
  ["预测值", "predicted value"],
  ["强负相关", "strong negative correlation"],
  ["最小值不小于0", "minimum value is not less than 0"],
  ["极小值", "local minimum"],
  ["相切", "tangent"],
  ["需要", "needed"],
  ["谨慎推广", "generalize cautiously"],
  ["判别式", "discriminant"],
  ["二项分布", "binomial distribution"],
  ["裂项相消", "telescoping cancellation"]
]);

function normalizeMathAnswer(value) {
  return String(value)
    .replaceAll("<=", "\\le ")
    .replaceAll(">=", "\\ge ")
    .replaceAll("<", " < ")
    .replaceAll(">", " > ")
    .replace(/\s+/g, " ")
    .trim();
}

function zhAnswer(value) {
  const normalized = normalizeMathAnswer(value);
  if (/[\\^=<>]|\\le|\\ge|_\{|_n|\d\/\d|pi/.test(normalized)) return m(normalized);
  return normalized;
}

function enAnswer(value) {
  const translated = englishAnswerMap.get(value) ?? value.replaceAll(" 或 ", " or ").replaceAll("，", ", ");
  const normalized = normalizeMathAnswer(translated);
  if (/[\\^=<>]|\\le|\\ge|_\{|_n|\d\/\d|pi/.test(normalized)) return m(normalized);
  return normalized;
}

function buildLesson(topic) {
  const profile = profileForTopic(topic);
  const lessonPack = getMainlandPepEvidencePack({
    grade: topic.grade,
    unitTitle: profile.chapter,
    conceptIds: profile.conceptIds,
    intent: "generate-lesson",
    limit: 6
  });
  const examPack = getMainlandPepEvidencePack({
    grade: topic.grade,
    unitTitle: profile.chapter,
    conceptIds: profile.conceptIds,
    intent: "exam-practice",
    limit: 6
  });
  const evidenceCards = uniqueBy([...lessonPack.cards, ...examPack.cards], (card) => card.id);
  const examPatternCards = uniqueBy([...lessonPack.secondaryExamPatternCards, ...examPack.secondaryExamPatternCards], (card) => card.id);
  const cardConcepts = unique(evidenceCards.flatMap((card) => card.conceptIds ?? []));
  const misconceptions = unique([
    ...evidenceCards.flatMap((card) => card.misconceptionTags ?? []),
    ...examPatternCards.flatMap((card) => card.misconceptionTags ?? [])
  ]).slice(0, 6);
  const competencies = unique(evidenceCards.flatMap((card) => card.competencyTags ?? [])).slice(0, 6);
  const itemTypes = unique([
    ...evidenceCards.flatMap((card) => card.skillTags ?? []),
    ...examPatternCards.flatMap((card) => card.itemTypeTags ?? [])
  ]).slice(0, 6);
  const generationGuidance = unique([
    ...evidenceCards.flatMap((card) => card.generationGuidance ?? []),
    ...examPatternCards.flatMap((card) => card.generationGuidance ?? [])
  ]).slice(0, 8);

  const objectivesZh = [
    `能用${topic.title.zh}的核心概念描述已知条件和目标。`,
    `能在原创例题中选择合适的表示方式、公式或推理路径。`,
    `能识别至少两个常见误区，并用检验步骤修正答案。`
  ];
  const objectivesEn = [
    `Describe givens and goals using the core concepts of ${topic.title.en}.`,
    `Choose suitable representations, formulas, or reasoning paths in original examples.`,
    `Identify at least two common pitfalls and use checking steps to correct answers.`
  ];
  const misconceptionZh = [
    `把${topic.title.zh}中的限制条件、边界或定义域漏掉。`,
    "只套公式而没有说明为什么该公式适用。",
    "得到答案后没有代回原题检验符号、单位或范围。"
  ];
  const misconceptionEn = [
    `Missing restrictions, boundary cases, or domains in ${topic.title.en}.`,
    "Applying a formula without explaining why it is valid.",
    "Not checking signs, units, or ranges against the original question."
  ];
  const checklistZh = [
    "是否只使用安全抽象证据，不复现教材或试卷原题？",
    "每个例题和检查题是否有答案、解释和检验步骤？",
    "简体中文术语是否符合内地高中数学表达？",
    "是否适合未来映射为 MAIS Lesson block？"
  ];
  const checklistEn = [
    "Uses safe abstraction evidence only, with no reconstruction of source textbook or paper items.",
    "Every example and checkpoint includes an answer, explanation, and checking step.",
    "Simplified Chinese terminology fits Mainland high-school mathematics.",
    "Ready to be mapped later into MAIS Lesson blocks."
  ];

  const zhLesson = {
    title: `${topic.title.zh}：概念、方法与原创应用`,
    audience: `${topic.grade} 内地人教版高中数学学生`,
    durationMinutes: topic.minutes,
    hook: profile.hookZh,
    objectives: objectivesZh,
    prerequisiteWarmUp: `用 3 分钟写出本节的已知对象、限制条件和目标。${profile.hookZh}`,
    conceptExplanation: sentence([
      profile.coreZh,
      competencies.length ? `本节重点素养：${competencies.join("、")}。` : ""
    ]),
    workedExamples: profile.examples.map((example, index) => ({
      title: `例 ${index + 1}`,
      prompt: example.zhPrompt,
      solution: example.zhSolution,
      check: "把结果代回原条件，确认定义域、符号或单位没有被遗漏。"
    })),
    commonPitfalls: misconceptionZh,
    checkpoints: profile.checkpoints.map((checkpoint, index) => ({
      id: `${topic.id}-checkpoint-${index + 1}`,
      prompt: checkpoint.zhPrompt,
      answer: zhAnswer(checkpoint.answer),
      explanation: checkpoint.zhExplanation
    })),
    examStyleStrategy: profile.examStrategyZh,
    extension: profile.extensionZh,
    exitTicket: `用一句话说明${topic.title.zh}中最容易出错的条件，并写出一个检查办法。`
  };

  const enLesson = {
    title: `${topic.title.en}: Concepts, Methods, and Original Applications`,
    audience: `${topic.grade} Mainland PEP high-school mathematics students`,
    durationMinutes: topic.minutes,
    hook: profile.hookEn,
    objectives: objectivesEn,
    prerequisiteWarmUp: `Spend 3 minutes writing the mathematical objects, restrictions, and target for the lesson. ${profile.hookEn}`,
    conceptExplanation: sentence([
      profile.coreEn,
      competencies.length ? `Competency focus: ${englishCompetencies(competencies).join(", ")}.` : ""
    ]),
    workedExamples: profile.examples.map((example, index) => ({
      title: `Example ${index + 1}`,
      prompt: example.enPrompt,
      solution: example.enSolution,
      check: "Substitute or reason back into the original conditions to confirm no domain, sign, or unit condition was missed."
    })),
    commonPitfalls: misconceptionEn,
    checkpoints: profile.checkpoints.map((checkpoint, index) => ({
      id: `${topic.id}-checkpoint-${index + 1}`,
      prompt: checkpoint.enPrompt,
      answer: enAnswer(checkpoint.answer),
      explanation: checkpoint.enExplanation
    })),
    examStyleStrategy: profile.examStrategyEn,
    extension: profile.extensionEn,
    exitTicket: `In one sentence, name the easiest condition to miss in ${topic.title.en}, and write one checking method.`
  };

  return {
    schemaVersion: "mainland-pep-high-lessons-v1",
    id: `mainland-pep-high-lesson-${topic.id}`,
    reviewStatus: "approved",
    reviewStatusReason: "S18/S09/S05 revision pass complete: source-safety checks passed, math examples and checkpoints are answer-backed, bilingual answer notation is normalized, and Lesson-block mapping is ready.",
    integrationStatus: "production-integrated",
    pilot: pilotTopicIds.has(topic.id),
    metadata: {
      topicId: topic.id,
      grade: topic.grade,
      curriculumTrack: "MAINLAND_PEP_HIGH",
      publisher: "MAINLAND_PEP",
      chapter: profile.chapter,
      topicTitle: topic.title,
      difficulty: topic.difficulty,
      estimatedMinutes: topic.minutes,
      generatedAt,
      sourceSafetyStatus: "safe-rag-only",
      evidence: {
        lessonQuery: {
          grade: topic.grade,
          unitTitle: profile.chapter,
          conceptIds: profile.conceptIds,
          intent: "generate-lesson"
        },
        examQuery: {
          grade: topic.grade,
          unitTitle: profile.chapter,
          conceptIds: profile.conceptIds,
          intent: "exam-practice"
        },
        ragCardIds: evidenceCards.map((card) => card.id),
        examPatternCardIds: examPatternCards.map((card) => card.id),
        conceptIds: unique([...profile.conceptIds, ...cardConcepts]),
        competencyTags: competencies,
        itemTypeTags: itemTypes,
        generationGuidance
      }
    },
    studentLesson: {
      zhHans: zhLesson,
      en: enLesson,
      bilingualAlignment: [
        section("title", zhLesson.title, enLesson.title),
        section("hook", zhLesson.hook, enLesson.hook),
        section("objectives", zhLesson.objectives.join(" | "), enLesson.objectives.join(" | ")),
        section("warm-up", zhLesson.prerequisiteWarmUp, enLesson.prerequisiteWarmUp),
        section("concept", zhLesson.conceptExplanation, enLesson.conceptExplanation),
        section("worked-example-1", zhLesson.workedExamples[0]?.solution ?? "", enLesson.workedExamples[0]?.solution ?? ""),
        section("common-pitfalls", zhLesson.commonPitfalls.join(" | "), enLesson.commonPitfalls.join(" | ")),
        section("checkpoint-summary", zhLesson.checkpoints.map((item) => item.answer).join(" | "), enLesson.checkpoints.map((item) => item.answer).join(" | ")),
        section("exam-strategy", zhLesson.examStyleStrategy, enLesson.examStyleStrategy),
        section("extension", zhLesson.extension, enLesson.extension)
      ]
    },
    teacherReviewerNotes: {
      curriculumAlignment: {
        zhHans: `围绕${profile.chapter}生成，证据来自安全 RAG 卡 ${evidenceCards.map((card) => card.id).join("、")}。`,
        en: `Generated around ${profile.chapter} using safe RAG cards ${evidenceCards.map((card) => card.id).join(", ")}.`
      },
      misconceptionTargets: misconceptions,
      verificationChecklist: checklistZh.map((zh, index) => ({ zhHans: zh, en: checklistEn[index] })),
      appFitNotes: {
        zhHans: "已可映射为 concept、worked-example、checklist、practice、extension blocks；practice block 由现有题库按 topic 自动注入。",
        en: "Ready to map into concept, worked-example, checklist, practice, and extension blocks; the practice block is injected from the existing question bank by topic."
      }
    },
    futureProductionMapping: {
      productionLessonSeedReady: true,
      suggestedBlocks: ["concept", "worked-example", "checklist", "practice", "extension"],
      targetFileAfterSignoff: "data/mainlandPepHighLessons.ts"
    }
  };
}

function renderList(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function renderCheckpoints(items) {
  return items
    .map((item, index) => [
      `${index + 1}. ${item.prompt}`,
      `   - Answer: ${item.answer}`,
      `   - Explanation: ${item.explanation}`
    ].join("\n"))
    .join("\n");
}

function renderExamples(items) {
  return items
    .map((item) => [
      `### ${item.title}`,
      "",
      `Prompt: ${item.prompt}`,
      "",
      `Solution: ${item.solution}`,
      "",
      `Check: ${item.check}`
    ].join("\n"))
    .join("\n\n");
}

function renderLessonMarkdown(lesson) {
  const zh = lesson.studentLesson.zhHans;
  const en = lesson.studentLesson.en;
  const evidence = lesson.metadata.evidence;
  return [
    `# ${zh.title}`,
    "",
    `- Topic ID: ${lesson.metadata.topicId}`,
    `- Grade: ${lesson.metadata.grade}`,
    `- Chapter: ${lesson.metadata.chapter}`,
    `- Status: ${lesson.reviewStatus}`,
    `- Integration: ${lesson.integrationStatus}`,
    `- Pilot: ${lesson.pilot ? "yes" : "no"}`,
    `- Safe RAG cards: ${evidence.ragCardIds.join(", ") || "none"}`,
    `- Exam-pattern cards: ${evidence.examPatternCardIds.join(", ") || "none"}`,
    "",
    "## 简体中文",
    "",
    `### 导入`,
    zh.hook,
    "",
    "### 学习目标",
    renderList(zh.objectives),
    "",
    "### 预备热身",
    zh.prerequisiteWarmUp,
    "",
    "### 概念讲解",
    zh.conceptExplanation,
    "",
    "### 例题",
    renderExamples(zh.workedExamples),
    "",
    "### 常见误区",
    renderList(zh.commonPitfalls),
    "",
    "### 检查题",
    renderCheckpoints(zh.checkpoints),
    "",
    "### 高考风格策略",
    zh.examStyleStrategy,
    "",
    "### 延伸任务",
    zh.extension,
    "",
    "### 出门条",
    zh.exitTicket,
    "",
    "## English",
    "",
    `### Hook`,
    en.hook,
    "",
    "### Objectives",
    renderList(en.objectives),
    "",
    "### Prerequisite Warm-Up",
    en.prerequisiteWarmUp,
    "",
    "### Concept Explanation",
    en.conceptExplanation,
    "",
    "### Worked Examples",
    renderExamples(en.workedExamples),
    "",
    "### Common Pitfalls",
    renderList(en.commonPitfalls),
    "",
    "### Checkpoints",
    renderCheckpoints(en.checkpoints),
    "",
    "### Exam-Style Strategy",
    en.examStyleStrategy,
    "",
    "### Extension",
    en.extension,
    "",
    "### Exit Ticket",
    en.exitTicket,
    "",
    "## Bilingual Alignment",
    "",
    "| Section | 简体中文 | English |",
    "| --- | --- | --- |",
    ...lesson.studentLesson.bilingualAlignment.map((row) => `| ${escapeTableCell(row.section)} | ${escapeTableCell(row.zhHans)} | ${escapeTableCell(row.en)} |`),
    "",
    "## Reviewer Notes",
    "",
    `- ${lesson.teacherReviewerNotes.curriculumAlignment.zhHans}`,
    `- ${lesson.teacherReviewerNotes.appFitNotes.zhHans}`,
    "",
    "### Verification Checklist",
    renderList(lesson.teacherReviewerNotes.verificationChecklist.map((item) => `${item.zhHans} / ${item.en}`)),
    ""
  ].join("\n");
}

function renderIndex(lessons) {
  const byGrade = lessons.reduce((map, lesson) => {
    map[lesson.metadata.grade] = (map[lesson.metadata.grade] ?? 0) + 1;
    return map;
  }, {});
  return [
    "# Mainland PEP High-School Lessons V1",
    "",
    "Approved generated教材 pack for `MAINLAND_PEP_HIGH`, wired into the Lesson section through `data/mainlandPepHighLessons.ts`.",
    "",
    "## Scope",
    "",
    `- Generated at: ${generatedAt}`,
    `- Lessons: ${lessons.length}`,
    `- Grade coverage: ${Object.entries(byGrade).map(([grade, count]) => `${grade} ${count}`).join(", ")}`,
    "- Production Lesson integration: included through approved `ProductionLessonSeed` mapping",
    "- Evidence source: committed safe Mainland PEP RAG abstraction APIs only",
    "",
    "## Pilot Lessons",
    "",
    renderList(lessons.filter((lesson) => lesson.pilot).map((lesson) => `${lesson.metadata.grade} ${lesson.metadata.chapter} (${lesson.metadata.topicId})`)),
    "",
    "## Lesson Inventory",
    "",
    "| Grade | Topic ID | Chapter | Status | File |",
    "| --- | --- | --- | --- | --- |",
    ...lessons.map((lesson) => {
      const file = `lessons/${lesson.metadata.topicId}.md`;
      return `| ${lesson.metadata.grade} | ${lesson.metadata.topicId} | ${lesson.metadata.chapter} | ${lesson.reviewStatus} | [${file}](${file}) |`;
    }),
    "",
    "## Review Rule",
    "",
    "All 22 lessons are currently approved across S18 math/source-safety, S09 Simplified Chinese/bilingual terminology, and S05 Lesson-section fit. If any future lesson reopens as `needs-revision` or `blocked`, remove it from production integration until fixed.",
    ""
  ].join("\n");
}

function renderReadme() {
  return [
    "# Mainland PEP High-School Generated Lesson Pack",
    "",
    "This folder contains the approved generated教材 pack for the MAIS `MAINLAND_PEP_HIGH` curriculum track.",
    "",
    "The current pack has S18/S09/S05 approval and is consumed by `data/mainlandPepHighLessons.ts` for Lesson-section integration.",
    "",
    "## Files",
    "",
    "- `generate-lessons.mjs`: deterministic generator using the committed safe RAG API.",
    "- `validate-lessons.mjs`: schema/source-safety/bilingual/duplicate validator.",
    "- `lessons.json`: aggregate machine-readable draft pack.",
    "- `lessons/*.md`: human-readable lesson drafts.",
    "- `index.md`: review inventory.",
    "- `qa-report.md`: generated validation and review-status report.",
    "",
    "## Regenerate",
    "",
    "```bash",
    "node coordination/content-qa/mainland-pep-high-lessons-v1/generate-lessons.mjs",
    "node coordination/content-qa/mainland-pep-high-lessons-v1/validate-lessons.mjs",
    "```",
    ""
  ].join("\n");
}

const lessons = mainlandPepHighTopics.map(buildLesson);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
writeJson(join(packDir, "lessons.json"), {
  schemaVersion: "mainland-pep-high-lessons-v1",
  generatedAt,
  generator: relative(projectRoot, fileURLToPath(import.meta.url)),
  sourceEvidencePolicy: "safe-rag-only",
  integrationStatus: "production-integrated",
  reviewStatus: "approved",
  lessons
});

for (const lesson of lessons) {
  writeFileSync(join(outDir, `${lesson.metadata.topicId}.md`), renderLessonMarkdown(lesson));
}

writeFileSync(join(packDir, "index.md"), renderIndex(lessons));
writeFileSync(join(packDir, "README.md"), renderReadme());

console.log(`Generated ${lessons.length} Mainland PEP high-school lesson drafts in ${relative(projectRoot, packDir)}.`);
