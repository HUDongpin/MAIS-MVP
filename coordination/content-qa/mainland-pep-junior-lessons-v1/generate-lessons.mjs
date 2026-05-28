#!/usr/bin/env node

import { createRequire } from "node:module";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../../..");
const packDir = __dirname;
const lessonsDir = join(packDir, "lessons");
const tmpDir = join(projectRoot, ".tmp/mainland-junior-lesson-gen");
const tmpConfigPath = join(projectRoot, ".tmp/mainland-junior-lesson-gen-tsconfig.json");
const schemaVersion = "mainland-pep-junior-lessons-v1";
const generatedAt = "2026-05-23T16:00:00+08:00";
const require = createRequire(import.meta.url);

const m = (expression) => `\\(${expression}\\)`;

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function installTsRequireHook() {
  if (globalThis.__maisJuniorLessonTsHookInstalled) return;
  const ts = require("typescript");
  const Module = require("node:module");
  const originalResolveFilename = Module._resolveFilename;

  Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
    if (typeof request === "string" && request.startsWith("@/")) {
      return originalResolveFilename.call(this, join(projectRoot, request.slice(2)), parent, isMain, options);
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  Module._extensions[".ts"] = function compileTs(module, filename) {
    const source = readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        resolveJsonModule: true,
        jsx: ts.JsxEmit.ReactJSX
      },
      fileName: filename
    }).outputText;
    module._compile(output, filename);
  };

  globalThis.__maisJuniorLessonTsHookInstalled = true;
}

installTsRequireHook();

const { mainlandPepJuniorRagCards } = require(join(projectRoot, "data/rag/mainlandPepJunior.ts"));
const { getMainlandPepEvidencePack } = require(join(projectRoot, "lib/rag/mainlandPep.ts"));
const { getMainlandPepJuniorExamPatternCards } = require(join(projectRoot, "lib/rag/mainlandPepJuniorExamPatterns.ts"));

function checkpoint(id, promptZh, promptEn, answer, explanationZh, explanationEn) {
  return { id, prompt: promptZh, promptEn, answer, explanation: explanationZh, explanationEn };
}

const profiles = {
  "pep-junior-s1-upper-rational-numbers": {
    estimatedMinutes: 45,
    titleZh: "有理数与数轴：把方向、距离和运算连起来",
    titleEn: "Rational Numbers and the Number Line: Connect Direction, Distance, and Operations",
    hookZh: `同一个数字在不同方向上可以表示上升、下降、收入或支出。数轴让这些变化有了可观察的位置。`,
    hookEn: "The same number can describe a rise, a fall, income, or spending depending on direction. A number line makes these changes visible.",
    objectivesZh: ["解释正数、负数和零在实际情境中的意义。", "在数轴上比较有理数并说明理由。", "用相反数、绝对值和运算检查结果是否合理。"],
    objectivesEn: ["Explain the meaning of positive numbers, negative numbers, and zero in real situations.", "Compare rational numbers on a number line and justify the comparison.", "Use opposites, absolute value, and operations to check whether an answer is reasonable."],
    prerequisiteWarmUpZh: `从 ${m("0")} 出发，向右走 ${m("4")} 格，再向左走 ${m("7")} 格。说出终点，并解释每一步的方向。`,
    prerequisiteWarmUpEn: `Start at ${m("0")}. Move ${m("4")} steps right, then ${m("7")} steps left. Name the endpoint and explain each direction.`,
    conceptExplanationZh: `有理数可以放在数轴上比较。数轴上越靠右的数越大；相反数到 ${m("0")} 的距离相同但方向相反；绝对值表示一个数到 ${m("0")} 的距离，所以 ${m("|-5|=5")}。运算时先判断方向，再用距离完成计算。`,
    conceptExplanationEn: `Rational numbers can be compared on a number line. Numbers farther right are greater. Opposite numbers have the same distance from ${m("0")} but opposite directions. Absolute value is distance from ${m("0")}, so ${m("|-5|=5")}. In operations, decide the direction first, then use distance to complete the calculation.`,
    workedExamples: [
      {
        titleZh: "例1：温度变化",
        titleEn: "Example 1: Temperature Change",
        promptZh: `清晨温度为 ${m("-3^\\circ C")}，中午升高 ${m("8^\\circ C")}，傍晚又下降 ${m("5^\\circ C")}。傍晚温度是多少？`,
        promptEn: `The morning temperature is ${m("-3^\\circ C")}. It rises by ${m("8^\\circ C")} at noon and then falls by ${m("5^\\circ C")} in the evening. What is the evening temperature?`,
        solutionZh: `先算 ${m("-3+8=5")}，再算 ${m("5-5=0")}。所以傍晚温度为 ${m("0^\\circ C")}。`,
        solutionEn: `First compute ${m("-3+8=5")}, then ${m("5-5=0")}. The evening temperature is ${m("0^\\circ C")}.`,
        checkZh: `在数轴上从 ${m("-3")} 向右 ${m("8")} 格到 ${m("5")}，再向左 ${m("5")} 格回到 ${m("0")}。`,
        checkEn: `On the number line, move from ${m("-3")} right ${m("8")} steps to ${m("5")}, then left ${m("5")} steps back to ${m("0")}.`
      },
      {
        titleZh: "例2：比较大小",
        titleEn: "Example 2: Compare Values",
        promptZh: `比较 ${m("-\\frac{3}{4}")}、${m("-0.6")} 和 ${m("0.2")} 的大小。`,
        promptEn: `Compare ${m("-\\frac{3}{4}")}, ${m("-0.6")}, and ${m("0.2")}.`,
        solutionZh: `把 ${m("-\\frac{3}{4}")} 写成 ${m("-0.75")}。数轴上 ${m("-0.75")} 在 ${m("-0.6")} 左边，${m("0.2")} 在右边，所以 ${m("-\\frac{3}{4}<-0.6<0.2")}。`,
        solutionEn: `Write ${m("-\\frac{3}{4}")} as ${m("-0.75")}. On the number line, ${m("-0.75")} is left of ${m("-0.6")}, and ${m("0.2")} is to the right, so ${m("-\\frac{3}{4}<-0.6<0.2")}.`,
        checkZh: `负数比较时，离 ${m("0")} 越远反而越小。`,
        checkEn: `For negative numbers, the one farther from ${m("0")} is smaller.`
      }
    ],
    commonPitfallsZh: ["把负号当作减号，忽略它也能表示方向。", "认为绝对值会保留原来的正负号。", "比较两个负数时只看数字大小，不看数轴位置。"],
    commonPitfallsEn: ["Treating a negative sign only as subtraction and missing its direction meaning.", "Thinking absolute value keeps the original sign.", "Comparing two negative numbers by digit size instead of number-line position."],
    misconceptionClinicZh: [`若学生说 ${m("-8>-3")}，请让他在数轴上标出两个点并读左右位置。`, `若学生写 ${m("|-6|=-6")}，请强调绝对值回答的是距离，而距离不为负。`],
    misconceptionClinicEn: [`If a learner says ${m("-8>-3")}, ask them to mark both points and read left-to-right position.`, `If a learner writes ${m("|-6|=-6")}, emphasize that absolute value answers a distance question, and distance is not negative.`],
    strategyChecklistZh: ["先判断数表示方向、位置还是变化量。", "比较大小时先想数轴左右。", "含绝对值时先说距离，再写数值。", "运算后用情境或数轴检查结果。"],
    strategyChecklistEn: ["First decide whether the number represents direction, position, or change.", "When comparing, picture left and right on the number line.", "For absolute value, state the distance before writing the value.", "After computing, check the answer with the context or number line."],
    checkpoints: [
      checkpoint("c1", `计算 ${m("-6+11-4")}。`, `Compute ${m("-6+11-4")}.`, "1", `先得 ${m("-6+11=5")}，再得 ${m("5-4=1")}。`, `First ${m("-6+11=5")}, then ${m("5-4=1")}.`),
      checkpoint("c2", `比较 ${m("-2.5")} 和 ${m("-2.05")}，哪个更小？`, `Compare ${m("-2.5")} and ${m("-2.05")}. Which is smaller?`, "-2.5", `${m("-2.5")} 在数轴上更靠左，所以更小。`, `${m("-2.5")} is farther left on the number line, so it is smaller.`),
      checkpoint("c3", `写出 ${m("7")} 的相反数和 ${m("|-7|")} 的值。`, `Write the opposite of ${m("7")} and the value of ${m("|-7|")}.`, "-7; 7", `${m("7")} 的相反数是 ${m("-7")}；${m("|-7|")} 表示到 ${m("0")} 的距离，是 ${m("7")}。`, `The opposite of ${m("7")} is ${m("-7")}; ${m("|-7|")} is the distance from ${m("0")}, which is ${m("7")}.`)
    ],
    examStyleStrategyZh: "遇到含负数的综合题，先把每个数量标成位置或变化量，再决定加、减和比较方向。",
    examStyleStrategyEn: "For mixed signed-number tasks, first label each quantity as a position or a change, then choose addition, subtraction, and comparison direction.",
    extensionZh: "设计一条校园积分记录，至少包含三次加分和两次扣分，并用数轴解释最终积分。",
    extensionEn: "Design a school-points record with at least three gains and two deductions, then explain the final score on a number line.",
    exitTicketZh: `一句话说明为什么 ${m("|-9|")} 不是 ${m("-9")}。`,
    exitTicketEn: `In one sentence, explain why ${m("|-9|")} is not ${m("-9")}.`,
    glossary: [
      ["有理数", "rational number", "能写成整数或分数形式的数。", "A number that can be written as an integer or a fraction."],
      ["数轴", "number line", "用位置表示数大小和方向的直线。", "A line that represents size and direction by position."],
      ["相反数", "opposite number", "到零距离相同、方向相反的两个数。", "Two numbers with the same distance from zero and opposite directions."],
      ["绝对值", "absolute value", "一个数到零的距离。", "The distance of a number from zero."]
    ]
  },
  "pep-junior-s1-upper-expressions-linear-equations": {
    estimatedMinutes: 50,
    titleZh: "整式初步与一元一次方程：用字母表达数量关系",
    titleEn: "Expressions and Linear Equations: Use Letters to Represent Relationships",
    hookZh: "当数量会变化时，字母可以把共同规律保留下来，方程则把相等关系写清楚。",
    hookEn: "When quantities vary, letters preserve the shared pattern, and equations make equality relationships clear.",
    objectivesZh: ["用字母表示实际数量。", "合并同类项并解释每一步。", "建立并求解一元一次方程。"],
    objectivesEn: ["Represent real quantities with letters.", "Combine like terms and explain each step.", "Build and solve one-variable linear equations."],
    prerequisiteWarmUpZh: `若一支笔 ${m("x")} 元，三支笔和一本 ${m("5")} 元练习本共多少钱？`,
    prerequisiteWarmUpEn: `If one pen costs ${m("x")} yuan, how much do three pens and one ${m("5")}-yuan notebook cost?`,
    conceptExplanationZh: `整式是用数、字母和运算组成的式子。同类项含有相同字母部分，例如 ${m("3a")} 和 ${m("-5a")}。一元一次方程只有一个未知数，且未知数最高次数为 ${m("1")}。解方程时，每一步都要保持等式两边平衡。`,
    conceptExplanationEn: `An algebraic expression is built from numbers, letters, and operations. Like terms have the same letter part, such as ${m("3a")} and ${m("-5a")}. A one-variable linear equation has one unknown, and the highest power of the unknown is ${m("1")}. When solving, every step must preserve balance on both sides.`,
    workedExamples: [
      {
        titleZh: "例1：合并同类项",
        titleEn: "Example 1: Combine Like Terms",
        promptZh: `化简 ${m("4x-3+2x+9")}。`,
        promptEn: `Simplify ${m("4x-3+2x+9")}.`,
        solutionZh: `同类项分别合并：${m("4x+2x=6x")}，${m("-3+9=6")}，所以结果为 ${m("6x+6")}。`,
        solutionEn: `Combine like terms: ${m("4x+2x=6x")} and ${m("-3+9=6")}, so the result is ${m("6x+6")}.`,
        checkZh: `代入 ${m("x=1")}，原式为 ${m("12")}，化简式也为 ${m("12")}。`,
        checkEn: `Substitute ${m("x=1")}. The original expression is ${m("12")}, and the simplified expression is also ${m("12")}.`
      },
      {
        titleZh: "例2：建立方程",
        titleEn: "Example 2: Build an Equation",
        promptZh: `一个数的 ${m("3")} 倍再减 ${m("7")} 等于 ${m("20")}。求这个数。`,
        promptEn: `${m("3")} times a number minus ${m("7")} equals ${m("20")}. Find the number.`,
        solutionZh: `设这个数为 ${m("x")}，列方程 ${m("3x-7=20")}。两边加 ${m("7")} 得 ${m("3x=27")}，所以 ${m("x=9")}。`,
        solutionEn: `Let the number be ${m("x")}. Write ${m("3x-7=20")}. Add ${m("7")} to both sides to get ${m("3x=27")}, so ${m("x=9")}.`,
        checkZh: `代回原关系：${m("3\\times9-7=20")}，成立。`,
        checkEn: `Check in the original relationship: ${m("3\\times9-7=20")}, so it works.`
      }
    ],
    commonPitfallsZh: ["把不同字母项合并。", "去括号时漏掉负号分配。", "解方程后没有代回检验。"],
    commonPitfallsEn: ["Combining terms with different letter parts.", "Dropping a negative sign when removing brackets.", "Solving an equation without substituting back to check."],
    misconceptionClinicZh: [`若学生把 ${m("2a+3b")} 写成 ${m("5ab")}，请让他说明 ${m("a")} 和 ${m("b")} 是否表示同一种数量。`, `若学生从 ${m("2(x-4)")} 得到 ${m("2x-4")}，请用分配律重写为 ${m("2x-8")}。`],
    misconceptionClinicEn: [`If a learner changes ${m("2a+3b")} into ${m("5ab")}, ask whether ${m("a")} and ${m("b")} represent the same quantity.`, `If a learner changes ${m("2(x-4)")} into ${m("2x-4")}, use the distributive property to show ${m("2x-8")}.`],
    strategyChecklistZh: ["先定义未知数。", "找出等量关系。", "每一步方程变形两边同做。", "最后代回原题检查。"],
    strategyChecklistEn: ["Define the unknown first.", "Find the equality relationship.", "Perform the same operation on both sides.", "Substitute the answer back into the original problem."],
    checkpoints: [
      checkpoint("c1", `化简 ${m("7y-2y+5")}。`, `Simplify ${m("7y-2y+5")}.`, "5y+5", `${m("7y-2y=5y")}，常数 ${m("5")} 保留。`, `${m("7y-2y=5y")}, and the constant ${m("5")} remains.`),
      checkpoint("c2", `解方程 ${m("5x+4=19")}。`, `Solve ${m("5x+4=19")}.`, "3", `两边减 ${m("4")} 得 ${m("5x=15")}，所以 ${m("x=3")}。`, `Subtract ${m("4")} from both sides to get ${m("5x=15")}, so ${m("x=3")}.`),
      checkpoint("c3", `把“比 ${m("n")} 的两倍多 ${m("6")}”写成代数式。`, `Write "${m("6")} more than twice ${m("n")}" as an expression.`, "2n+6", `两倍是 ${m("2n")}，多 ${m("6")} 是 ${m("2n+6")}。`, `Twice the number is ${m("2n")}; ${m("6")} more is ${m("2n+6")}.`)
    ],
    examStyleStrategyZh: "应用题先圈出未知量、总量和比较关系，再把文字顺序转换成代数顺序。",
    examStyleStrategyEn: "For word problems, circle the unknown, total, and comparison relationship before translating text order into algebraic order.",
    extensionZh: "把一个购物优惠情境写成方程，并解释方程每一项的实际意义。",
    extensionEn: "Write an equation for a shopping-discount situation and explain the real meaning of each term.",
    exitTicketZh: `为什么 ${m("3x+2x")} 可以合并，而 ${m("3x+2y")} 不可以？`,
    exitTicketEn: `Why can ${m("3x+2x")} be combined, but ${m("3x+2y")} cannot?`,
    glossary: [
      ["整式", "algebraic expression", "由数、字母和运算组成的式子。", "An expression made of numbers, letters, and operations."],
      ["同类项", "like terms", "字母部分完全相同的项。", "Terms with exactly the same letter part."],
      ["一元一次方程", "one-variable linear equation", "只含一个未知数且最高次数为一的方程。", "An equation with one unknown whose highest power is one."],
      ["等式性质", "properties of equality", "等式两边同做相同运算，等式仍成立。", "Doing the same operation to both sides keeps an equation true."]
    ]
  },
  "pep-junior-s1-upper-geometric-figures": {
    estimatedMinutes: 42,
    titleZh: "几何图形初步：用定义描述点、线、角和空间",
    titleEn: "Foundations of Geometry: Use Definitions for Points, Lines, Angles, and Space",
    hookZh: "几何学习不是只看图像像不像，而是用准确语言说明对象是什么、关系是什么。",
    hookEn: "Geometry is not just about what a drawing looks like; it is about using precise language to state objects and relationships.",
    objectivesZh: ["区分直线、射线和线段。", "用角的度量描述图形关系。", "用定义而不是外观判断几何对象。"],
    objectivesEn: ["Distinguish lines, rays, and segments.", "Describe figure relationships using angle measure.", "Use definitions rather than appearance to identify geometric objects."],
    prerequisiteWarmUpZh: `在纸上画两个点 ${m("A")}、${m("B")}，分别画线段 ${m("AB")}、射线 ${m("AB")} 和直线 ${m("AB")}。`,
    prerequisiteWarmUpEn: `Draw two points ${m("A")} and ${m("B")}. Then draw segment ${m("AB")}, ray ${m("AB")}, and line ${m("AB")}.`,
    conceptExplanationZh: `点表示位置，线段有两个端点，射线有一个端点并向一个方向无限延伸，直线向两个方向无限延伸。角由两条有公共端点的射线组成，角的大小由张开程度决定，而不是边画得多长。`,
    conceptExplanationEn: `A point represents a position. A segment has two endpoints. A ray has one endpoint and extends forever in one direction. A line extends forever in two directions. An angle is formed by two rays with a common endpoint, and its size depends on opening, not on how long the arms are drawn.`,
    workedExamples: [
      {
        titleZh: "例1：读图形语言",
        titleEn: "Example 1: Read Geometric Language",
        promptZh: `点 ${m("A")}、${m("B")}、${m("C")} 在同一直线上，且 ${m("B")} 在 ${m("A")} 与 ${m("C")} 之间。若 ${m("AB=4")}，${m("BC=7")}，求 ${m("AC")}。`,
        promptEn: `Points ${m("A")}, ${m("B")}, and ${m("C")} lie on the same line, and ${m("B")} is between ${m("A")} and ${m("C")}. If ${m("AB=4")} and ${m("BC=7")}, find ${m("AC")}.`,
        solutionZh: `${m("B")} 在中间，所以整段 ${m("AC")} 由 ${m("AB")} 和 ${m("BC")} 组成：${m("AC=4+7=11")}。`,
        solutionEn: `${m("B")} is between the endpoints, so segment ${m("AC")} is made of ${m("AB")} and ${m("BC")}: ${m("AC=4+7=11")}.`,
        checkZh: `线段长度相加必须符合“中间点”条件。`,
        checkEn: `Adding segment lengths is valid because the point-between condition is given.`
      },
      {
        titleZh: "例2：判断角的大小",
        titleEn: "Example 2: Judge Angle Size",
        promptZh: `两个角分别为 ${m("35^\\circ")} 和 ${m("53^\\circ")}。哪一个更大？若图中 ${m("35^\\circ")} 的边更长，会改变答案吗？`,
        promptEn: `Two angles measure ${m("35^\\circ")} and ${m("53^\\circ")}. Which is larger? If the arms of the ${m("35^\\circ")} angle are drawn longer, does the answer change?`,
        solutionZh: `${m("53^\\circ")} 更大。角的大小由张开程度决定，边的长度不改变角度。`,
        solutionEn: `${m("53^\\circ")} is larger. Angle size depends on opening, so longer arms do not change the angle measure.`,
        checkZh: `用量角器读数时看刻度，不看边长。`,
        checkEn: `When using a protractor, read the scale, not the arm length.`
      }
    ],
    commonPitfallsZh: ["把射线和线段混淆。", "按图形外观猜结论，不看定义。", "认为角边越长，角越大。"],
    commonPitfallsEn: ["Confusing rays with segments.", "Guessing conclusions from appearance instead of definitions.", "Thinking a longer angle arm means a larger angle."],
    misconceptionClinicZh: [`若学生说射线 ${m("AB")} 与射线 ${m("BA")} 相同，请让他指出各自端点和方向。`, "若学生凭肉眼判断两角相等，请要求给出度量或已知条件。"],
    misconceptionClinicEn: [`If a learner says ray ${m("AB")} and ray ${m("BA")} are the same, ask them to identify each endpoint and direction.`, "If a learner judges angles equal by sight, ask for a measure or given condition."],
    strategyChecklistZh: ["先标出点、端点和方向。", "判断线类对象时说出端点个数。", "比较角时看度数或可证明关系。", "写结论前说明使用的定义。"],
    strategyChecklistEn: ["Mark points, endpoints, and directions first.", "For line objects, state the number of endpoints.", "Compare angles using measures or provable relationships.", "Before writing a conclusion, name the definition used."],
    checkpoints: [
      checkpoint("c1", `线段 ${m("PQ")} 有几个端点？`, `How many endpoints does segment ${m("PQ")} have?`, "2", `线段有两个端点，分别是 ${m("P")} 和 ${m("Q")}。`, `A segment has two endpoints, ${m("P")} and ${m("Q")}.`),
      checkpoint("c2", `若 ${m("\\angle A=28^\\circ")}，${m("\\angle B=82^\\circ")}，哪个角更大？`, `If ${m("\\angle A=28^\\circ")} and ${m("\\angle B=82^\\circ")}, which angle is larger?`, "angle B", `${m("82^\\circ>28^\\circ")}，所以 ${m("\\angle B")} 更大。`, `${m("82^\\circ>28^\\circ")}, so ${m("\\angle B")} is larger.`),
      checkpoint("c3", `点 ${m("M")} 在线段 ${m("XY")} 上，${m("XM=3")}，${m("MY=9")}，求 ${m("XY")}。`, `Point ${m("M")} lies on segment ${m("XY")}. If ${m("XM=3")} and ${m("MY=9")}, find ${m("XY")}.`, "12", `${m("XY=XM+MY=3+9=12")}。`, `${m("XY=XM+MY=3+9=12")}.`)
    ],
    examStyleStrategyZh: "几何基础题先把题目语言翻译成图形标记，再确认能否用定义或已知条件推出结论。",
    examStyleStrategyEn: "For foundational geometry items, translate the text into figure markings first, then confirm whether a definition or given condition supports the conclusion.",
    extensionZh: "拍一张教室物体照片，用点、线段、射线、直线和角写出五条准确描述。",
    extensionEn: "Take a photo of a classroom object and write five precise descriptions using points, segments, rays, lines, and angles.",
    exitTicketZh: "说明为什么两个画得很长的角边不能直接证明角更大。",
    exitTicketEn: "Explain why longer drawn angle arms do not prove that an angle is larger.",
    glossary: [
      ["线段", "segment", "有两个端点的直线部分。", "Part of a line with two endpoints."],
      ["射线", "ray", "有一个端点并向一个方向延伸的线。", "A line part with one endpoint that extends in one direction."],
      ["直线", "line", "向两个方向无限延伸的线。", "A line extending without end in two directions."],
      ["角", "angle", "由两条有公共端点的射线组成的图形。", "A figure formed by two rays with a common endpoint."]
    ]
  },
  "pep-junior-s1-lower-lines-coordinates": {
    estimatedMinutes: 50,
    titleZh: "相交线、平行线与平面直角坐标系：从角关系走向位置表示",
    titleEn: "Intersecting Lines, Parallel Lines, and Coordinates: From Angle Relations to Position",
    hookZh: "同一张图既可以用角关系解释，也可以用坐标表示位置变化。",
    hookEn: "The same figure can be explained by angle relationships and by coordinate changes.",
    objectivesZh: ["识别邻补角、对顶角和平行线角关系。", "在平面直角坐标系中定位点。", "解释水平或竖直平移对坐标的影响。"],
    objectivesEn: ["Identify linear pairs, vertical angles, and parallel-line angle relationships.", "Locate points in the coordinate plane.", "Explain how horizontal or vertical translations affect coordinates."],
    prerequisiteWarmUpZh: `点 ${m("P(2,-3)")} 的横坐标和纵坐标分别是什么？它在第几象限？`,
    prerequisiteWarmUpEn: `For point ${m("P(2,-3)")}, what are the x-coordinate and y-coordinate? Which quadrant is it in?`,
    conceptExplanationZh: `相交线形成的对顶角相等，邻补角和为 ${m("180^\\circ")}。平行线被截线所截时，同位角、内错角等关系需要先确认“两直线平行”。坐标点 ${m("(x,y)")} 先读横坐标，再读纵坐标；沿水平方向移动改变 ${m("x")}，沿竖直方向移动改变 ${m("y")}。`,
    conceptExplanationEn: `Intersecting lines create equal vertical angles, and a linear pair sums to ${m("180^\\circ")}. When parallel lines are cut by a transversal, angle relationships such as corresponding and alternate interior angles require the condition that the two lines are parallel. In ${m("(x,y)")}, read the x-coordinate first and the y-coordinate second. Horizontal movement changes ${m("x")}; vertical movement changes ${m("y")}.`,
    workedExamples: [
      {
        titleZh: "例1：角关系",
        titleEn: "Example 1: Angle Relationship",
        promptZh: `两条直线相交。若一个角为 ${m("64^\\circ")}，求它的对顶角和邻补角。`,
        promptEn: `Two lines intersect. If one angle is ${m("64^\\circ")}, find its vertical angle and its adjacent supplementary angle.`,
        solutionZh: `对顶角相等，所以为 ${m("64^\\circ")}。邻补角与它和为 ${m("180^\\circ")}，所以 ${m("180^\\circ-64^\\circ=116^\\circ")}。`,
        solutionEn: `The vertical angle is equal, so it is ${m("64^\\circ")}. The adjacent supplementary angle sums with it to ${m("180^\\circ")}, so ${m("180^\\circ-64^\\circ=116^\\circ")}.`,
        checkZh: `四个角应成两组相等角，且相邻两个角和为 ${m("180^\\circ")}。`,
        checkEn: `The four angles should form two equal pairs, and adjacent angles should sum to ${m("180^\\circ")}.`
      },
      {
        titleZh: "例2：坐标平移",
        titleEn: "Example 2: Coordinate Translation",
        promptZh: `点 ${m("A(-2,5)")} 向右平移 ${m("6")} 个单位，再向下平移 ${m("3")} 个单位，得到点 ${m("A'")}。求 ${m("A'")} 坐标。`,
        promptEn: `Point ${m("A(-2,5)")} moves ${m("6")} units right and then ${m("3")} units down to point ${m("A'")}. Find the coordinates of ${m("A'")}.`,
        solutionZh: `向右使 ${m("x")} 加 ${m("6")}：${m("-2+6=4")}；向下使 ${m("y")} 减 ${m("3")}：${m("5-3=2")}。所以 ${m("A'(4,2)")}。`,
        solutionEn: `Moving right adds ${m("6")} to ${m("x")}: ${m("-2+6=4")}. Moving down subtracts ${m("3")} from ${m("y")}: ${m("5-3=2")}. Thus ${m("A'(4,2)")}.`,
        checkZh: `右移不改变纵坐标之前的变化方向，下移不改变横坐标。`,
        checkEn: `A right shift changes only the x-coordinate, and a down shift changes only the y-coordinate.`
      }
    ],
    commonPitfallsZh: ["没有确认平行条件就使用内错角相等。", "把横坐标和纵坐标读反。", "把坐标轴上的点误判为某个象限内。"],
    commonPitfallsEn: ["Using alternate interior angles without confirming parallel lines.", "Reading x- and y-coordinates in the wrong order.", "Putting a point on an axis into a quadrant."],
    misconceptionClinicZh: [`若学生说 ${m("(0,4)")} 在第一象限，请指出它在 ${m("y")} 轴上，不属于任何象限。`, "若学生用平行线角关系，请要求先标出哪两条线平行。"],
    misconceptionClinicEn: [`If a learner says ${m("(0,4)")} is in Quadrant I, point out that it lies on the ${m("y")}-axis and is in no quadrant.`, "If a learner uses a parallel-line angle relationship, ask them to mark which two lines are parallel first."],
    strategyChecklistZh: ["角关系先看条件：相交还是平行。", "坐标先横后纵。", "轴上点不属于任何象限。", "平移时分别处理横坐标和纵坐标。"],
    strategyChecklistEn: ["For angle relationships, inspect the condition: intersecting or parallel.", "Read coordinates as x first, then y.", "A point on an axis is not in a quadrant.", "For translations, handle x- and y-coordinates separately."],
    checkpoints: [
      checkpoint("c1", `若邻补角之一为 ${m("73^\\circ")}，另一个是多少？`, `If one angle in a linear pair is ${m("73^\\circ")}, what is the other?`, "107 degrees", `${m("180^\\circ-73^\\circ=107^\\circ")}。`, `${m("180^\\circ-73^\\circ=107^\\circ")}.`),
      checkpoint("c2", `点 ${m("B(0,-5)")} 在哪个坐标轴上？`, `Which axis contains point ${m("B(0,-5)")}?`, "y-axis", `横坐标为 ${m("0")}，所以点在 ${m("y")} 轴上。`, `The x-coordinate is ${m("0")}, so the point lies on the ${m("y")}-axis.`),
      checkpoint("c3", `点 ${m("C(3,1)")} 向左 ${m("4")} 个单位后坐标是多少？`, `What are the coordinates after point ${m("C(3,1)")} moves ${m("4")} units left?`, "(-1,1)", `向左使 ${m("x")} 减 ${m("4")}，得 ${m("3-4=-1")}，所以为 ${m("(-1,1)")}。`, `Moving left subtracts ${m("4")} from ${m("x")}: ${m("3-4=-1")}, so the point is ${m("(-1,1)")}.`)
    ],
    examStyleStrategyZh: "几何坐标题先分层：先读角或平行条件，再读坐标和平移方向，避免把图像观察当作证明。",
    examStyleStrategyEn: "For geometry-coordinate items, separate layers: read angle or parallel conditions first, then coordinates and translation directions. Do not treat visual appearance as proof.",
    extensionZh: "设计一条校园路线图，用坐标写出三个点的位置，并给出一次平移后的新坐标。",
    extensionEn: "Design a campus route map, write the coordinates of three points, and give the new coordinates after one translation.",
    exitTicketZh: `为什么使用内错角相等前必须知道两条直线平行？`,
    exitTicketEn: `Why must we know two lines are parallel before using equal alternate interior angles?`,
    glossary: [
      ["对顶角", "vertical angles", "两条直线相交形成的相对角。", "Opposite angles formed by two intersecting lines."],
      ["邻补角", "linear pair", "相邻且和为一百八十度的两个角。", "Adjacent angles whose measures sum to one hundred eighty degrees."],
      ["坐标", "coordinates", "表示点在平面中位置的有序数对。", "An ordered pair describing a point's position in the plane."],
      ["平移", "translation", "图形按同一方向和距离移动。", "A movement of a figure by the same direction and distance."]
    ]
  },
  "pep-junior-s1-lower-equations-inequalities-data": {
    estimatedMinutes: 55,
    titleZh: "方程组、不等式与数据初步：用模型表达限制条件",
    titleEn: "Systems, Inequalities, and Introductory Data: Model Conditions and Limits",
    hookZh: "有些问题不只需要一个未知数，有些答案不是一个数，而是一组满足条件的数。",
    hookEn: "Some problems need more than one unknown, and some answers are not one number but a set of values that satisfy a condition.",
    objectivesZh: ["用两个未知数建立二元一次方程组。", "解一元一次不等式并在数轴上表示解集。", "从小数据集中提出有根据的结论。"],
    objectivesEn: ["Build a two-variable linear system from a situation.", "Solve a one-variable linear inequality and represent the solution set on a number line.", "Draw justified conclusions from a small dataset."],
    prerequisiteWarmUpZh: `若 ${m("x+y=12")} 且 ${m("x-y=4")}，猜一组满足两个等式的数。`,
    prerequisiteWarmUpEn: `If ${m("x+y=12")} and ${m("x-y=4")}, guess a pair of numbers satisfying both equations.`,
    conceptExplanationZh: `方程组的解必须同时满足每个方程。不等式描述范围，乘除负数时不等号方向要改变。数据分析时，结论不能超过数据能支持的范围；样本、统计图和平均数都要服务于问题本身。`,
    conceptExplanationEn: `A solution of a system must satisfy every equation in the system. An inequality describes a range, and multiplying or dividing by a negative number reverses the inequality sign. In data analysis, conclusions cannot go beyond what the data support; samples, graphs, and averages must serve the question being asked.`,
    workedExamples: [
      {
        titleZh: "例1：二元一次方程组",
        titleEn: "Example 1: Linear System",
        promptZh: `两种票共 ${m("18")} 张，总价 ${m("132")} 元。学生票 ${m("6")} 元，成人票 ${m("10")} 元。求两种票各多少张。`,
        promptEn: `There are ${m("18")} tickets costing ${m("132")} yuan in total. A student ticket costs ${m("6")} yuan and an adult ticket costs ${m("10")} yuan. How many of each ticket were bought?`,
        solutionZh: `设学生票 ${m("x")} 张，成人票 ${m("y")} 张。列 ${m("x+y=18")}，${m("6x+10y=132")}。由 ${m("x=18-y")} 代入，得 ${m("6(18-y)+10y=132")}，所以 ${m("y=6")}，${m("x=12")}。`,
        solutionEn: `Let ${m("x")} be student tickets and ${m("y")} be adult tickets. Write ${m("x+y=18")} and ${m("6x+10y=132")}. From ${m("x=18-y")}, substitute to get ${m("6(18-y)+10y=132")}, so ${m("y=6")} and ${m("x=12")}.`,
        checkZh: `${m("12+6=18")}，${m("6\\times12+10\\times6=132")}，都符合。`,
        checkEn: `${m("12+6=18")} and ${m("6\\times12+10\\times6=132")}, so both conditions hold.`
      },
      {
        titleZh: "例2：不等式解集",
        titleEn: "Example 2: Inequality Solution Set",
        promptZh: `解不等式 ${m("-2x+5<13")}。`,
        promptEn: `Solve ${m("-2x+5<13")}.`,
        solutionZh: `两边减 ${m("5")} 得 ${m("-2x<8")}。两边除以 ${m("-2")} 时不等号改变方向，得 ${m("x>-4")}。`,
        solutionEn: `Subtract ${m("5")} from both sides to get ${m("-2x<8")}. Dividing by ${m("-2")} reverses the inequality sign, giving ${m("x>-4")}.`,
        checkZh: `取 ${m("x=0")}，原式 ${m("5<13")} 成立；取边界 ${m("x=-4")}，原式等于 ${m("13")}，不满足严格小于。`,
        checkEn: `Try ${m("x=0")}: ${m("5<13")} is true. At boundary ${m("x=-4")}, the expression equals ${m("13")}, which does not satisfy strict less than.`
      }
    ],
    commonPitfallsZh: ["方程组只检查了一个方程。", "除以负数时忘记改变不等号方向。", "用样本数据推出过大的结论。"],
    commonPitfallsEn: ["Checking only one equation in a system.", "Forgetting to reverse the inequality sign when dividing by a negative number.", "Making a conclusion larger than the sample supports."],
    misconceptionClinicZh: [`若学生把 ${m("-3x>9")} 解成 ${m("x> -3")}，请让他用 ${m("x=0")} 检查原不等式。`, "若学生说某调查代表所有学生，请追问样本来自哪里、人数是否足够。"],
    misconceptionClinicEn: [`If a learner solves ${m("-3x>9")} as ${m("x>-3")}, ask them to test ${m("x=0")} in the original inequality.`, "If a learner says a survey represents all students, ask where the sample came from and whether it is large enough."],
    strategyChecklistZh: ["方程组先定义两个未知数。", "解完方程组要代回两个方程。", "不等式乘除负数要换方向。", "数据结论要写依据和限制。"],
    strategyChecklistEn: ["Define two unknowns first for a system.", "After solving, substitute into both equations.", "Reverse the sign when multiplying or dividing an inequality by a negative number.", "Write the evidence and limitation for a data conclusion."],
    checkpoints: [
      checkpoint("c1", `解 ${m("x+2y=11")}，${m("x=3")} 时 ${m("y")} 是多少？`, `If ${m("x+2y=11")} and ${m("x=3")}, what is ${m("y")}?`, "4", `代入得 ${m("3+2y=11")}，所以 ${m("2y=8")}，${m("y=4")}。`, `Substitute to get ${m("3+2y=11")}, so ${m("2y=8")} and ${m("y=4")}.`),
      checkpoint("c2", `解不等式 ${m("4x-1\\ge 15")}。`, `Solve ${m("4x-1\\ge 15")}.`, "x>=4", `两边加 ${m("1")} 得 ${m("4x\\ge16")}，所以 ${m("x\\ge4")}。`, `Add ${m("1")} to both sides to get ${m("4x\\ge16")}, so ${m("x\\ge4")}.`),
      checkpoint("c3", `一组数据为 ${m("5,7,7,9")}，平均数是多少？`, `For the data ${m("5,7,7,9")}, what is the mean?`, "7", `${m("(5+7+7+9)\\div4=7")}。`, `${m("(5+7+7+9)\\div4=7")}.`)
    ],
    examStyleStrategyZh: "模型题先写变量含义和限制；不等式题先标边界，再用测试值确认方向。",
    examStyleStrategyEn: "For modeling tasks, write variable meanings and restrictions first. For inequalities, mark the boundary and use test values to confirm direction.",
    extensionZh: "设计一个班级问卷小数据集，计算一个统计量，并写一句有边界的结论。",
    extensionEn: "Design a small class survey dataset, compute one statistic, and write one conclusion with a clear limitation.",
    exitTicketZh: `解 ${m("-x<2")} 时，为什么答案是 ${m("x>-2")}？`,
    exitTicketEn: `When solving ${m("-x<2")}, why is the answer ${m("x>-2")}?`,
    glossary: [
      ["方程组", "system of equations", "需要同时满足的多个方程。", "Several equations that must be satisfied at the same time."],
      ["解集", "solution set", "所有满足条件的数或数对。", "All numbers or pairs that satisfy a condition."],
      ["不等式", "inequality", "用大于、小于等关系表示范围的式子。", "A statement describing a range using greater-than or less-than relationships."],
      ["样本", "sample", "从总体中选取的一部分数据。", "A subset of data selected from a larger population."]
    ]
  },
  "pep-junior-s2-upper-triangles-congruence": {
    estimatedMinutes: 55,
    titleZh: "三角形、全等与轴对称：从观察走向证明",
    titleEn: "Triangles, Congruence, and Symmetry: Move from Observation to Proof",
    hookZh: "几何证明的关键不是“看起来一样”，而是找到足够的条件说明它们必然一样。",
    hookEn: "The key in geometric proof is not that figures look the same, but that enough conditions force them to be the same.",
    objectivesZh: ["运用三角形边角关系分析图形。", "识别并使用全等判定条件。", "用轴对称性质解决角、边和位置问题。"],
    objectivesEn: ["Use triangle side-angle relationships to analyze figures.", "Identify and apply triangle congruence criteria.", "Use symmetry properties to solve angle, side, and position problems."],
    prerequisiteWarmUpZh: `三角形三个内角和是多少？若两个角为 ${m("48^\\circ")} 和 ${m("67^\\circ")}，第三个角是多少？`,
    prerequisiteWarmUpEn: `What is the sum of a triangle's interior angles? If two angles are ${m("48^\\circ")} and ${m("67^\\circ")}, what is the third angle?`,
    conceptExplanationZh: `三角形内角和为 ${m("180^\\circ")}。证明两个三角形全等时，要先对应顶点，再选用合适条件，如 ${m("SSS")}、${m("SAS")}、${m("ASA")} 或直角三角形中的斜边直角边条件。轴对称图形中，对称点到对称轴距离相等，对应线段和对应角相等。`,
    conceptExplanationEn: `The interior angles of a triangle sum to ${m("180^\\circ")}. To prove two triangles congruent, first match corresponding vertices, then choose a criterion such as ${m("SSS")}, ${m("SAS")}, ${m("ASA")}, or the hypotenuse-leg condition for right triangles. In axial symmetry, corresponding points are the same distance from the axis, and corresponding segments and angles are equal.`,
    workedExamples: [
      {
        titleZh: "例1：三角形角度",
        titleEn: "Example 1: Triangle Angles",
        promptZh: `三角形 ${m("ABC")} 中，${m("\\angle A=52^\\circ")}，${m("\\angle B=61^\\circ")}，求 ${m("\\angle C")}。`,
        promptEn: `In triangle ${m("ABC")}, ${m("\\angle A=52^\\circ")} and ${m("\\angle B=61^\\circ")}. Find ${m("\\angle C")}.`,
        solutionZh: `${m("\\angle C=180^\\circ-52^\\circ-61^\\circ=67^\\circ")}。`,
        solutionEn: `${m("\\angle C=180^\\circ-52^\\circ-61^\\circ=67^\\circ")}.`,
        checkZh: `三个角相加为 ${m("52^\\circ+61^\\circ+67^\\circ=180^\\circ")}。`,
        checkEn: `The three angles sum to ${m("52^\\circ+61^\\circ+67^\\circ=180^\\circ")}.`
      },
      {
        titleZh: "例2：全等证明思路",
        titleEn: "Example 2: Congruence Reasoning",
        promptZh: `已知 ${m("AB=DE")}，${m("AC=DF")}，${m("\\angle A=\\angle D")}。说明 ${m("\\triangle ABC")} 与 ${m("\\triangle DEF")} 为什么全等。`,
        promptEn: `Given ${m("AB=DE")}, ${m("AC=DF")}, and ${m("\\angle A=\\angle D")}, explain why ${m("\\triangle ABC")} and ${m("\\triangle DEF")} are congruent.`,
        solutionZh: `两组对应边相等，且夹角相等。对应顺序为 ${m("A\\leftrightarrow D")}，${m("B\\leftrightarrow E")}，${m("C\\leftrightarrow F")}，所以由 ${m("SAS")} 得两三角形全等。`,
        solutionEn: `Two pairs of corresponding sides are equal, and the included angle is equal. The correspondence is ${m("A\\leftrightarrow D")}, ${m("B\\leftrightarrow E")}, ${m("C\\leftrightarrow F")}, so the triangles are congruent by ${m("SAS")}.`,
        checkZh: `使用 ${m("SAS")} 时，角必须是两条已知边的夹角。`,
        checkEn: `When using ${m("SAS")}, the angle must be included between the two known sides.`
      }
    ],
    commonPitfallsZh: ["对应顶点没有匹配就写全等。", "把不完整条件当作全等判定。", "只凭图形像轴对称就下结论。"],
    commonPitfallsEn: ["Writing congruence before matching corresponding vertices.", "Treating incomplete information as a congruence criterion.", "Concluding symmetry from appearance only."],
    misconceptionClinicZh: [`若学生用 ${m("SSA")} 判定全等，请给出一个反例草图说明条件不够。`, "若学生找错对应边，请让他按顶点顺序重新读三角形名称。"],
    misconceptionClinicEn: [`If a learner uses ${m("SSA")} as a congruence test, show a counterexample sketch to demonstrate insufficiency.`, "If a learner mismatches corresponding sides, ask them to reread the triangle names in vertex order."],
    strategyChecklistZh: ["先写对应顶点。", "标出已知边和角。", "判断条件是否满足某个全等判定。", "证明后再使用对应边角相等。"],
    strategyChecklistEn: ["Write corresponding vertices first.", "Mark known sides and angles.", "Decide whether the information fits a congruence criterion.", "After proof, use equality of corresponding parts."],
    checkpoints: [
      checkpoint("c1", `三角形两角为 ${m("40^\\circ")} 和 ${m("75^\\circ")}，第三角是多少？`, `A triangle has angles ${m("40^\\circ")} and ${m("75^\\circ")}. What is the third angle?`, "65 degrees", `${m("180^\\circ-40^\\circ-75^\\circ=65^\\circ")}。`, `${m("180^\\circ-40^\\circ-75^\\circ=65^\\circ")}.`),
      checkpoint("c2", `${m("AB=PQ")}，${m("BC=QR")}，${m("AC=PR")} 可用什么判定全等？`, `If ${m("AB=PQ")}, ${m("BC=QR")}, and ${m("AC=PR")}, which criterion proves congruence?`, "SSS", `三组对应边相等，所以用 ${m("SSS")}。`, `Three pairs of corresponding sides are equal, so use ${m("SSS")}.`),
      checkpoint("c3", `轴对称中，对称点到对称轴的距离有什么关系？`, `In axial symmetry, what is true about the distances from corresponding points to the axis?`, "equal", `对称点到对称轴距离相等。`, `Corresponding points are the same distance from the axis.`)
    ],
    examStyleStrategyZh: "证明题先列“已知、要证、对应”，每一步只使用已经给出或已经证明的关系。",
    examStyleStrategyEn: "For proofs, list given facts, target statement, and correspondence first. Each step should use only a given or already-proven relationship.",
    extensionZh: "画一个轴对称图形，标出两组对应点，并写出两条可以证明的边角关系。",
    extensionEn: "Draw an axially symmetric figure, mark two pairs of corresponding points, and write two side-angle relationships that can be proven.",
    exitTicketZh: `为什么 ${m("SAS")} 中的角必须是两条已知边的夹角？`,
    exitTicketEn: `Why must the angle in ${m("SAS")} be the included angle between the two known sides?`,
    glossary: [
      ["全等", "congruence", "形状和大小完全相同。", "Exactly the same shape and size."],
      ["对应顶点", "corresponding vertices", "两个图形中位置相互匹配的顶点。", "Matching vertices in two figures."],
      ["轴对称", "axial symmetry", "沿一条直线折叠后两部分重合。", "A figure matches after folding along a line."],
      ["判定条件", "criterion", "足以推出结论的一组条件。", "A set of conditions sufficient to prove a conclusion."]
    ]
  },
  "pep-junior-s2-upper-polynomials-fractions": {
    estimatedMinutes: 55,
    titleZh: "整式乘法、因式分解与分式：看见结构再运算",
    titleEn: "Polynomial Products, Factorization, and Algebraic Fractions: See Structure Before Operating",
    hookZh: "同一个式子可以展开，也可以分解。会选择方向，运算才会更稳。",
    hookEn: "The same expression can be expanded or factored. Choosing the direction makes symbolic work steadier.",
    objectivesZh: ["运用乘法公式展开整式。", "选择提公因式或公式法进行因式分解。", "化简分式并检查限制条件。"],
    objectivesEn: ["Use product formulas to expand polynomials.", "Choose common-factor or formula methods for factorization.", "Simplify algebraic fractions and check restrictions."],
    prerequisiteWarmUpZh: `计算 ${m("6a^2b\\div 3ab")}，并说明 ${m("a")}、${m("b")} 不能为什么值。`,
    prerequisiteWarmUpEn: `Compute ${m("6a^2b\\div 3ab")} and state which values ${m("a")} and ${m("b")} cannot take.`,
    conceptExplanationZh: `整式乘法常用分配律和公式，如 ${m("(a+b)^2=a^2+2ab+b^2")}。因式分解是展开的逆过程，目标是把多项式写成乘积。分式化简前要先写出分母不为 ${m("0")} 的限制，分式方程求解后还要检验是否产生增根。`,
    conceptExplanationEn: `Polynomial multiplication often uses the distributive property and formulas such as ${m("(a+b)^2=a^2+2ab+b^2")}. Factorization reverses expansion by writing a polynomial as a product. Before simplifying an algebraic fraction, record restrictions that denominators cannot be ${m("0")}. After solving a fraction equation, check for extraneous solutions.`,
    workedExamples: [
      {
        titleZh: "例1：公式展开",
        titleEn: "Example 1: Formula Expansion",
        promptZh: `展开 ${m("(x-4)^2")}。`,
        promptEn: `Expand ${m("(x-4)^2")}.`,
        solutionZh: `用公式 ${m("(a-b)^2=a^2-2ab+b^2")}，得 ${m("(x-4)^2=x^2-8x+16")}。`,
        solutionEn: `Use ${m("(a-b)^2=a^2-2ab+b^2")} to get ${m("(x-4)^2=x^2-8x+16")}.`,
        checkZh: `中间项是 ${m("-2\\times x\\times4=-8x")}，不能漏掉。`,
        checkEn: `The middle term is ${m("-2\\times x\\times4=-8x")}; it must not be omitted.`
      },
      {
        titleZh: "例2：分式化简",
        titleEn: "Example 2: Simplify an Algebraic Fraction",
        promptZh: `化简 ${m("\\frac{x^2-9}{x^2+3x}")}。`,
        promptEn: `Simplify ${m("\\frac{x^2-9}{x^2+3x}")}.`,
        solutionZh: `先分解：${m("x^2-9=(x-3)(x+3)")}，${m("x^2+3x=x(x+3)")}。当 ${m("x\\ne0")} 且 ${m("x\\ne-3")} 时，可约去 ${m("x+3")}，得 ${m("\\frac{x-3}{x}")}。`,
        solutionEn: `Factor first: ${m("x^2-9=(x-3)(x+3)")} and ${m("x^2+3x=x(x+3)")}. When ${m("x\\ne0")} and ${m("x\\ne-3")}, cancel ${m("x+3")} to get ${m("\\frac{x-3}{x}")}.`,
        checkZh: `被约去的因式对应限制条件，不能把限制也约掉。`,
        checkEn: `A canceled factor still creates a restriction; the restriction cannot be canceled away.`
      }
    ],
    commonPitfallsZh: ["误用乘法公式，把所有二项式平方都写成两项。", "提公因式时没有提完整。", "分式约分后忘记分母限制。"],
    commonPitfallsEn: ["Misusing product formulas and writing every binomial square as two terms.", "Failing to factor out the complete common factor.", "Forgetting denominator restrictions after simplifying a fraction."],
    misconceptionClinicZh: [`若学生写 ${m("(x+5)^2=x^2+25")}，请让他用 ${m("(x+5)(x+5)")} 展开验证。`, `若学生把 ${m("\\frac{x+2}{x}")} 约成 ${m("2")}，请强调只能约乘法因式，不能约加法项。`],
    misconceptionClinicEn: [`If a learner writes ${m("(x+5)^2=x^2+25")}, ask them to expand ${m("(x+5)(x+5)")}.`, `If a learner changes ${m("\\frac{x+2}{x}")} to ${m("2")}, emphasize that only factors, not addends, can be canceled.`],
    strategyChecklistZh: ["先观察是否有公因式。", "再判断是否符合平方差或完全平方公式。", "分式先写限制再约分。", "分式方程最后代回原分母检查。"],
    strategyChecklistEn: ["First look for a common factor.", "Then check for difference-of-squares or perfect-square patterns.", "For fractions, write restrictions before canceling.", "For fraction equations, substitute back into original denominators."],
    checkpoints: [
      checkpoint("c1", `分解 ${m("6x^2+9x")}。`, `Factor ${m("6x^2+9x")}.`, "3x(2x+3)", `公因式为 ${m("3x")}，所以 ${m("6x^2+9x=3x(2x+3)")}。`, `The common factor is ${m("3x")}, so ${m("6x^2+9x=3x(2x+3)")}.`),
      checkpoint("c2", `展开 ${m("(2a+3)(2a-3)")}。`, `Expand ${m("(2a+3)(2a-3)")}.`, "4a^2-9", `平方差公式：${m("(2a)^2-3^2=4a^2-9")}。`, `Difference of squares: ${m("(2a)^2-3^2=4a^2-9")}.`),
      checkpoint("c3", `分式 ${m("\\frac{5}{x-1}")} 中 ${m("x")} 不能等于多少？`, `In ${m("\\frac{5}{x-1}")}, what value can ${m("x")} not equal?`, "1", `分母不能为 ${m("0")}，所以 ${m("x-1\\ne0")}，${m("x\\ne1")}。`, `The denominator cannot be ${m("0")}, so ${m("x-1\\ne0")} and ${m("x\\ne1")}.`)
    ],
    examStyleStrategyZh: "符号运算题先看结构再动手，分式题先写限制；若出现约分，检查被约因式是否带来禁值。",
    examStyleStrategyEn: "For symbolic tasks, inspect structure before operating. For fractions, write restrictions first; if canceling occurs, check whether the canceled factor creates forbidden values.",
    extensionZh: "编写一个分式化简题，要求分子含平方差、分母含公因式，并写出限制条件。",
    extensionEn: "Create a simplification problem where the numerator has a difference of squares and the denominator has a common factor, then state the restrictions.",
    exitTicketZh: `为什么 ${m("(x-4)^2")} 的展开式有中间项？`,
    exitTicketEn: `Why does the expansion of ${m("(x-4)^2")} have a middle term?`,
    glossary: [
      ["整式乘法", "polynomial multiplication", "把多项式相乘并合并同类项。", "Multiplying polynomials and combining like terms."],
      ["因式分解", "factorization", "把多项式写成几个因式乘积。", "Writing a polynomial as a product of factors."],
      ["公因式", "common factor", "各项共同含有的因式。", "A factor shared by all terms."],
      ["分式", "algebraic fraction", "分母中含有字母的式子。", "An expression with a variable in the denominator."]
    ]
  },
  "pep-junior-s2-lower-roots-pythagorean-quadrilaterals": {
    estimatedMinutes: 55,
    titleZh: "二次根式、勾股定理与平行四边形：用精确长度支持几何判断",
    titleEn: "Radicals, Pythagorean Theorem, and Quadrilaterals: Use Exact Lengths to Support Geometry",
    hookZh: "根式让长度保持精确，勾股定理让直角关系可以计算，也可以反过来判断。",
    hookEn: "Radicals keep lengths exact, and the Pythagorean theorem lets us calculate right-triangle lengths and also test whether a triangle is right.",
    objectivesZh: ["化简简单二次根式。", "正确使用勾股定理及其逆定理。", "根据性质判断平行四边形和特殊四边形。"],
    objectivesEn: ["Simplify simple square radicals.", "Use the Pythagorean theorem and its converse correctly.", "Classify parallelograms and special quadrilaterals by properties."],
    prerequisiteWarmUpZh: `判断 ${m("3^2+4^2")} 是否等于 ${m("5^2")}，并说明这能提示什么几何关系。`,
    prerequisiteWarmUpEn: `Check whether ${m("3^2+4^2")} equals ${m("5^2")} and explain the geometric relationship this suggests.`,
    conceptExplanationZh: `二次根式化简时，把被开方数分解出完全平方因数。勾股定理只适用于直角三角形：${m("a^2+b^2=c^2")}。逆定理可以用边长关系判断一个三角形是否为直角三角形。平行四边形的对边平行且相等，对角相等；矩形、菱形和正方形还具有额外性质。`,
    conceptExplanationEn: `To simplify a square radical, factor out perfect-square factors. The Pythagorean theorem applies only to right triangles: ${m("a^2+b^2=c^2")}. Its converse can test whether a triangle is right. In a parallelogram, opposite sides are parallel and equal, and opposite angles are equal. Rectangles, rhombi, and squares have additional properties.`,
    workedExamples: [
      {
        titleZh: "例1：根式化简",
        titleEn: "Example 1: Simplify a Radical",
        promptZh: `化简 ${m("\\sqrt{72}")}。`,
        promptEn: `Simplify ${m("\\sqrt{72}")}.`,
        solutionZh: `${m("72=36\\times2")}，所以 ${m("\\sqrt{72}=\\sqrt{36}\\sqrt2=6\\sqrt2")}。`,
        solutionEn: `${m("72=36\\times2")}, so ${m("\\sqrt{72}=\\sqrt{36}\\sqrt2=6\\sqrt2")}.`,
        checkZh: `${m("(6\\sqrt2)^2=36\\times2=72")}，与原被开方数一致。`,
        checkEn: `${m("(6\\sqrt2)^2=36\\times2=72")}, matching the original radicand.`
      },
      {
        titleZh: "例2：判断直角",
        titleEn: "Example 2: Test for a Right Triangle",
        promptZh: `三角形三边长为 ${m("6")}、${m("8")}、${m("10")}。它是直角三角形吗？`,
        promptEn: `A triangle has side lengths ${m("6")}, ${m("8")}, and ${m("10")}. Is it a right triangle?`,
        solutionZh: `最长边为 ${m("10")}。因为 ${m("6^2+8^2=36+64=100")}，且 ${m("10^2=100")}，所以满足勾股定理逆定理，是直角三角形。`,
        solutionEn: `The longest side is ${m("10")}. Since ${m("6^2+8^2=36+64=100")} and ${m("10^2=100")}, the converse of the Pythagorean theorem applies, so it is a right triangle.`,
        checkZh: `必须把最长边作为 ${m("c")} 检查。`,
        checkEn: `The longest side must be used as ${m("c")} in the check.`
      }
    ],
    commonPitfallsZh: ["把二次根式随意拆成加法。", "没有确认直角就使用勾股定理。", "把平行四边形、矩形、菱形性质混用。"],
    commonPitfallsEn: ["Splitting radicals incorrectly over addition.", "Using the Pythagorean theorem without confirming a right angle.", "Mixing properties of parallelograms, rectangles, and rhombi."],
    misconceptionClinicZh: [`若学生写 ${m("\\sqrt{25+9}=5+3")}，请用 ${m("\\sqrt{34}")} 与 ${m("8")} 比较验证。`, "若学生说所有平行四边形对角线相等，请让他画一个普通平行四边形反例。"],
    misconceptionClinicEn: [`If a learner writes ${m("\\sqrt{25+9}=5+3")}, compare ${m("\\sqrt{34}")} with ${m("8")}.`, "If a learner says all parallelograms have equal diagonals, ask for a non-rectangle parallelogram counterexample."],
    strategyChecklistZh: ["根式先找完全平方因数。", "勾股定理先确认直角或最长边。", "逆定理要比较两个平方和。", "四边形判断要说出足够条件。"],
    strategyChecklistEn: ["For radicals, look for perfect-square factors first.", "For Pythagorean work, confirm a right angle or identify the longest side.", "For the converse, compare two squared sums.", "For quadrilateral classification, state sufficient conditions."],
    checkpoints: [
      checkpoint("c1", `化简 ${m("\\sqrt{50}")}。`, `Simplify ${m("\\sqrt{50}")}.`, "5sqrt2", `${m("50=25\\times2")}，所以 ${m("\\sqrt{50}=5\\sqrt2")}。`, `${m("50=25\\times2")}, so ${m("\\sqrt{50}=5\\sqrt2")}.`),
      checkpoint("c2", `直角三角形两直角边为 ${m("5")} 和 ${m("12")}，斜边是多少？`, `A right triangle has legs ${m("5")} and ${m("12")}. What is the hypotenuse?`, "13", `${m("5^2+12^2=25+144=169")}，所以斜边为 ${m("13")}。`, `${m("5^2+12^2=25+144=169")}, so the hypotenuse is ${m("13")}.`),
      checkpoint("c3", `平行四边形一组对边长为 ${m("9")}，对应对边长是多少？`, `In a parallelogram, one side has length ${m("9")}. What is the length of the opposite side?`, "9", `平行四边形对边相等，所以对应对边为 ${m("9")}。`, `Opposite sides of a parallelogram are equal, so the opposite side is ${m("9")}.`)
    ],
    examStyleStrategyZh: "含长度的几何题先判断类型和条件，能保留根式时不要过早取近似值。",
    examStyleStrategyEn: "For geometry tasks with lengths, identify the figure type and conditions first. Keep radicals exact instead of approximating too early.",
    extensionZh: "设计一个坐标中的四边形，用边长或斜率说明它是否为平行四边形。",
    extensionEn: "Design a quadrilateral on a coordinate grid and use side lengths or slopes to decide whether it is a parallelogram.",
    exitTicketZh: `为什么三边 ${m("5,6,7")} 不能直接套用 ${m("a^2+b^2=c^2")} 求新边？`,
    exitTicketEn: `Why can we not directly use ${m("a^2+b^2=c^2")} to find a new side from sides ${m("5,6,7")}?`,
    glossary: [
      ["二次根式", "square radical", "形如根号下非负数的式子。", "An expression involving the square root of a nonnegative quantity."],
      ["勾股定理", "Pythagorean theorem", "直角三角形两直角边平方和等于斜边平方。", "In a right triangle, the sum of the squares of the legs equals the square of the hypotenuse."],
      ["逆定理", "converse", "把原定理的条件和结论反过来形成的判断。", "A statement formed by reversing the condition and conclusion of a theorem."],
      ["平行四边形", "parallelogram", "两组对边分别平行的四边形。", "A quadrilateral with both pairs of opposite sides parallel."]
    ]
  },
  "pep-junior-s2-lower-linear-functions-data": {
    estimatedMinutes: 52,
    titleZh: "一次函数与数据分析：在表、式、图和情境之间转换",
    titleEn: "Linear Functions and Data Analysis: Move Among Tables, Formulas, Graphs, and Contexts",
    hookZh: "一次函数描述稳定变化，数据统计帮助我们选择最合适的代表值。",
    hookEn: "Linear functions describe steady change, and data statistics help us choose an appropriate representative value.",
    objectivesZh: ["理解一次函数的变化率和截距。", "在表格、图象和表达式之间转换。", "根据问题选择平均数、中位数或众数。"],
    objectivesEn: ["Understand rate of change and intercept in a linear function.", "Move among tables, graphs, and formulas.", "Choose mean, median, or mode according to the question."],
    prerequisiteWarmUpZh: `数对 ${m("(0,3)")} 和 ${m("(2,7)")} 的纵坐标每当横坐标增加 ${m("1")} 时变化多少？`,
    prerequisiteWarmUpEn: `For points ${m("(0,3)")} and ${m("(2,7)")}, how much does the y-coordinate change when the x-coordinate increases by ${m("1")}?`,
    conceptExplanationZh: `一次函数常写成 ${m("y=kx+b")}。其中 ${m("k")} 表示每增加 ${m("1")} 个横坐标单位时纵坐标的变化量，${m("b")} 是图象与 ${m("y")} 轴的交点纵坐标。数据分析中，平均数受极端值影响，中位数强调中间位置，众数强调出现次数最多的值。`,
    conceptExplanationEn: `A linear function is often written as ${m("y=kx+b")}. Here ${m("k")} is the change in y when x increases by ${m("1")}, and ${m("b")} is the y-coordinate of the y-intercept. In data analysis, the mean is affected by outliers, the median emphasizes middle position, and the mode emphasizes the most frequent value.`,
    workedExamples: [
      {
        titleZh: "例1：求一次函数表达式",
        titleEn: "Example 1: Find a Linear Formula",
        promptZh: `一次函数经过 ${m("(0,4)")} 和 ${m("(3,10)")}。求表达式。`,
        promptEn: `A linear function passes through ${m("(0,4)")} and ${m("(3,10)")}. Find its formula.`,
        solutionZh: `因为 ${m("x=0")} 时 ${m("y=4")}，所以 ${m("b=4")}。斜率 ${m("k=\\frac{10-4}{3-0}=2")}，所以 ${m("y=2x+4")}。`,
        solutionEn: `Since ${m("y=4")} when ${m("x=0")}, ${m("b=4")}. The slope is ${m("k=\\frac{10-4}{3-0}=2")}, so ${m("y=2x+4")}.`,
        checkZh: `代入 ${m("x=3")} 得 ${m("y=10")}，符合第二个点。`,
        checkEn: `Substitute ${m("x=3")} to get ${m("y=10")}, matching the second point.`
      },
      {
        titleZh: "例2：选择统计量",
        titleEn: "Example 2: Choose a Statistic",
        promptZh: `一组练习用时为 ${m("8,9,9,10,24")} 分钟。若想描述大多数同学的典型用时，平均数和中位数哪个更合适？`,
        promptEn: `Practice times are ${m("8,9,9,10,24")} minutes. To describe a typical time for most students, which is better: mean or median?`,
        solutionZh: `平均数为 ${m("12")}，被 ${m("24")} 拉高。中位数为 ${m("9")}，更接近大多数数据，所以中位数更合适。`,
        solutionEn: `The mean is ${m("12")}, pulled upward by ${m("24")}. The median is ${m("9")}, closer to most data values, so the median is more suitable.`,
        checkZh: `选择统计量要看问题目的，而不是只算一个数。`,
        checkEn: `Choosing a statistic depends on the purpose, not just computing one number.`
      }
    ],
    commonPitfallsZh: ["把斜率和截距的意义混淆。", "点没有代入图象表达式检查。", "不看情境就固定使用平均数。"],
    commonPitfallsEn: ["Confusing the meanings of slope and intercept.", "Not checking whether a point satisfies the formula.", "Always using the mean without considering context."],
    misconceptionClinicZh: [`若学生认为 ${m("b")} 是横截距，请让他代入 ${m("x=0")} 观察 ${m("y")}。`, "若数据有极端值，请让学生比较平均数和中位数的变化。"],
    misconceptionClinicEn: [`If a learner thinks ${m("b")} is the x-intercept, ask them to substitute ${m("x=0")} and observe ${m("y")}.`, "When data include an outlier, ask learners to compare changes in mean and median."],
    strategyChecklistZh: ["找一次函数先求变化率。", "用已知点确认截距或常数项。", "图象、表格、式子要互相检查。", "统计量选择要说明原因。"],
    strategyChecklistEn: ["Find the rate of change first for a linear function.", "Use a known point to confirm the intercept or constant term.", "Check graphs, tables, and formulas against each other.", "Explain the reason for choosing a statistic."],
    checkpoints: [
      checkpoint("c1", `函数 ${m("y=3x-2")} 的斜率是多少？`, `What is the slope of ${m("y=3x-2")}?`, "3", `${m("y=kx+b")} 中 ${m("k=3")}。`, `In ${m("y=kx+b")}, ${m("k=3")}.`),
      checkpoint("c2", `点 ${m("(2,5)")} 是否在 ${m("y=2x+1")} 上？`, `Does point ${m("(2,5)")} lie on ${m("y=2x+1")}?`, "yes", `代入 ${m("x=2")} 得 ${m("2\\times2+1=5")}，成立。`, `Substitute ${m("x=2")} to get ${m("2\\times2+1=5")}, so yes.`),
      checkpoint("c3", `数据 ${m("4,4,6,7,9")} 的众数是多少？`, `What is the mode of ${m("4,4,6,7,9")}?`, "4", `${m("4")} 出现次数最多。`, `${m("4")} appears most often.`)
    ],
    examStyleStrategyZh: "函数题用点代回，数据题用一句话说明统计量为什么适合这个问题。",
    examStyleStrategyEn: "For function items, substitute points back. For data items, write one sentence explaining why the statistic fits the question.",
    extensionZh: "记录五天学习时间，分别计算平均数和中位数，并说明哪个更能代表这一周。",
    extensionEn: "Record five days of study time, compute the mean and median, and explain which better represents the week.",
    exitTicketZh: `在 ${m("y=kx+b")} 中，${m("k")} 和 ${m("b")} 各表示什么？`,
    exitTicketEn: `In ${m("y=kx+b")}, what do ${m("k")} and ${m("b")} represent?`,
    glossary: [
      ["一次函数", "linear function", "图象为直线且变化率固定的函数。", "A function with a straight-line graph and constant rate of change."],
      ["斜率", "slope", "横坐标增加一个单位时纵坐标的变化量。", "The change in y for a one-unit increase in x."],
      ["截距", "intercept", "图象与坐标轴的交点对应数值。", "The value where a graph crosses an axis."],
      ["中位数", "median", "按顺序排列后位于中间的数据。", "The middle value when data are ordered."]
    ]
  },
  "pep-junior-s3-upper-quadratics-circle-probability": {
    estimatedMinutes: 60,
    titleZh: "一元二次方程、二次函数、圆与概率初步：连接代数、图形和随机模型",
    titleEn: "Quadratics, Circle Geometry, and Introductory Probability: Connect Algebra, Figures, and Random Models",
    hookZh: "初三上学期的重点是把“求解、看图、证明、估计可能性”放进同一套推理习惯。",
    hookEn: "The main S3 upper habit is to connect solving, graph reading, proof, and probability reasoning in one reasoning system.",
    objectivesZh: ["选择合适方法解一元二次方程。", "用顶点、对称轴和开口解释二次函数图象。", "用清晰样本空间计算简单概率，并识别圆中的基本关系。"],
    objectivesEn: ["Choose suitable methods to solve quadratic equations.", "Use vertex, axis of symmetry, and opening direction to interpret quadratic graphs.", "Calculate simple probability using a clear sample space and identify basic circle relationships."],
    prerequisiteWarmUpZh: `因式分解 ${m("x^2-5x+6")}，并写出它等于 ${m("0")} 时的两个解。`,
    prerequisiteWarmUpEn: `Factor ${m("x^2-5x+6")} and write the two solutions when it equals ${m("0")}.`,
    conceptExplanationZh: `一元二次方程可以用因式分解、配方法或公式法求解。二次函数图象是抛物线，顶点和对称轴能帮助判断最大值、最小值和变化趋势。圆中很多结论必须依赖半径、弦、圆心角等明确关系。概率计算要先列出不重不漏的样本空间。`,
    conceptExplanationEn: `Quadratic equations can be solved by factorization, completing the square, or the quadratic formula. A quadratic graph is a parabola; its vertex and axis help identify maximum, minimum, and trend. Circle conclusions must rely on clear relationships involving radius, chord, central angle, and related objects. Probability calculation begins with a complete, non-overlapping sample space.`,
    workedExamples: [
      {
        titleZh: "例1：二次方程",
        titleEn: "Example 1: Quadratic Equation",
        promptZh: `解方程 ${m("x^2-7x+10=0")}。`,
        promptEn: `Solve ${m("x^2-7x+10=0")}.`,
        solutionZh: `因式分解得 ${m("(x-5)(x-2)=0")}，所以 ${m("x=5")} 或 ${m("x=2")}。`,
        solutionEn: `Factor to get ${m("(x-5)(x-2)=0")}, so ${m("x=5")} or ${m("x=2")}.`,
        checkZh: `代回两个解都能使左边为 ${m("0")}。`,
        checkEn: `Substituting either solution makes the left side equal ${m("0")}.`
      },
      {
        titleZh: "例2：概率样本空间",
        titleEn: "Example 2: Probability Sample Space",
        promptZh: `从数字 ${m("1,2,3,4")} 中随机取一个数，取到偶数的概率是多少？`,
        promptEn: `Choose one number at random from ${m("1,2,3,4")}. What is the probability of choosing an even number?`,
        solutionZh: `样本空间有 ${m("4")} 个结果。偶数为 ${m("2")} 和 ${m("4")}，有 ${m("2")} 个有利结果，所以概率为 ${m("\\frac{2}{4}=\\frac12")}。`,
        solutionEn: `The sample space has ${m("4")} outcomes. The even numbers are ${m("2")} and ${m("4")}, giving ${m("2")} favorable outcomes, so the probability is ${m("\\frac{2}{4}=\\frac12")}.`,
        checkZh: `有利结果不能重复，样本空间不能遗漏。`,
        checkEn: `Favorable outcomes must not repeat, and the sample space must not omit outcomes.`
      }
    ],
    commonPitfallsZh: ["只看判别式符号，不解释解的意义。", "把顶点和对称轴混淆。", "圆中凭图猜相等关系。", "概率中样本空间列不完整。"],
    commonPitfallsEn: ["Looking only at the discriminant sign without explaining solution meaning.", "Confusing vertex with axis of symmetry.", "Guessing equality in circle geometry from the drawing.", "Listing an incomplete probability sample space."],
    misconceptionClinicZh: [`若学生把 ${m("x=3")} 当作抛物线顶点，请追问顶点应是点 ${m("(x,y)")} 还是直线。`, "若概率结果大于一，请让学生重新数总结果和有利结果。"],
    misconceptionClinicEn: [`If a learner calls ${m("x=3")} the vertex, ask whether a vertex is a point ${m("(x,y)")} or a line.`, "If a probability is greater than one, ask learners to recount total and favorable outcomes."],
    strategyChecklistZh: ["二次方程先看能否因式分解。", "二次函数先找对称轴和顶点。", "圆题先标半径、弦和圆心。", "概率题先列样本空间。"],
    strategyChecklistEn: ["For quadratic equations, first check whether factorization works.", "For quadratic functions, find the axis and vertex first.", "For circle problems, mark radii, chords, and center first.", "For probability, list the sample space first."],
    checkpoints: [
      checkpoint("c1", `解 ${m("x^2-9=0")}。`, `Solve ${m("x^2-9=0")}.`, "x=3 or x=-3", `${m("(x-3)(x+3)=0")}，所以 ${m("x=3")} 或 ${m("x=-3")}。`, `${m("(x-3)(x+3)=0")}, so ${m("x=3")} or ${m("x=-3")}.`),
      checkpoint("c2", `函数 ${m("y=(x-1)^2+4")} 的顶点是什么？`, `What is the vertex of ${m("y=(x-1)^2+4")}?`, "(1,4)", `顶点式直接给出顶点 ${m("(1,4)")}。`, `Vertex form gives the vertex ${m("(1,4)")}.`),
      checkpoint("c3", `掷一枚均匀硬币一次，出现正面的概率是多少？`, `Flip a fair coin once. What is the probability of heads?`, "1/2", `样本空间为 ${m("2")} 个结果，正面为 ${m("1")} 个，所以概率为 ${m("\\frac12")}。`, `The sample space has ${m("2")} outcomes and heads is ${m("1")} outcome, so the probability is ${m("\\frac12")}.`)
    ],
    examStyleStrategyZh: "综合题先判断属于代数、图象、几何还是概率层，再把每层的条件写清楚。",
    examStyleStrategyEn: "For integrated tasks, identify whether each part is algebraic, graphical, geometric, or probabilistic, then state the conditions for that layer clearly.",
    extensionZh: "用同一个二次函数设计一道求根题和一道图象解释题，并说明二者如何关联。",
    extensionEn: "Use one quadratic function to create one root-finding task and one graph-interpretation task, then explain how they are connected.",
    exitTicketZh: `概率计算中，为什么必须先确定样本空间？`,
    exitTicketEn: `In probability, why must the sample space be identified first?`,
    glossary: [
      ["一元二次方程", "quadratic equation", "只含一个未知数且最高次数为二的方程。", "An equation in one unknown whose highest power is two."],
      ["二次函数", "quadratic function", "可写成二次多项式形式的函数。", "A function that can be written as a quadratic polynomial."],
      ["圆", "circle", "到定点距离相等的所有点组成的图形。", "The set of points at a fixed distance from a fixed point."],
      ["样本空间", "sample space", "随机试验所有可能结果的集合。", "The set of all possible outcomes of a random experiment."]
    ]
  },
  "pep-junior-s3-lower-inverse-similarity-trigonometry": {
    estimatedMinutes: 60,
    titleZh: "反比例函数、相似与锐角三角函数：用比例解决测量问题",
    titleEn: "Inverse Proportion, Similarity, and Right-Triangle Trigonometry: Use Ratios to Solve Measurement Problems",
    hookZh: "当图形变大变小、距离难以直接测量时，比例和三角函数可以把问题转化为可计算关系。",
    hookEn: "When figures scale or distances are hard to measure directly, ratios and trigonometric functions turn the problem into a computable relationship.",
    objectivesZh: ["解释反比例函数图象和常数的意义。", "使用相似判定并找准对应边。", "选择正弦、余弦或正切解决直角三角形问题。"],
    objectivesEn: ["Explain the graph and constant in an inverse proportional function.", "Use similarity criteria and identify corresponding sides accurately.", "Choose sine, cosine, or tangent to solve right-triangle problems."],
    prerequisiteWarmUpZh: `若两个相似三角形的相似比为 ${m("2:5")}，较小的三角形一边为 ${m("6")}，对应较大的三角形边长是多少？`,
    prerequisiteWarmUpEn: `If two similar triangles have scale ratio ${m("2:5")} and a side of the smaller triangle is ${m("6")}, what is the corresponding side of the larger triangle?`,
    conceptExplanationZh: `反比例函数常写成 ${m("y=\\frac{k}{x}")}，其中 ${m("xy=k")} 表示乘积保持不变。相似图形对应角相等、对应边成比例。直角三角形中，${m("\\sin A")}、${m("\\cos A")}、${m("\\tan A")} 分别连接角与对边、邻边、斜边之间的比例。视图问题要先确认观察方向。`,
    conceptExplanationEn: `An inverse proportional function is often written as ${m("y=\\frac{k}{x}")}, where ${m("xy=k")} means the product stays constant. Similar figures have equal corresponding angles and proportional corresponding sides. In a right triangle, ${m("\\sin A")}, ${m("\\cos A")}, and ${m("\\tan A")} connect an angle with ratios involving opposite side, adjacent side, and hypotenuse. For view problems, confirm the viewing direction first.`,
    workedExamples: [
      {
        titleZh: "例1：反比例函数",
        titleEn: "Example 1: Inverse Proportion",
        promptZh: `反比例函数 ${m("y=\\frac{k}{x}")} 经过点 ${m("(3,8)")}。求 ${m("k")}，并求当 ${m("x=6")} 时的 ${m("y")}。`,
        promptEn: `The inverse proportional function ${m("y=\\frac{k}{x}")} passes through ${m("(3,8)")}. Find ${m("k")}, and find ${m("y")} when ${m("x=6")}.`,
        solutionZh: `由 ${m("xy=k")} 得 ${m("k=3\\times8=24")}。当 ${m("x=6")} 时，${m("y=\\frac{24}{6}=4")}。`,
        solutionEn: `Since ${m("xy=k")}, ${m("k=3\\times8=24")}. When ${m("x=6")}, ${m("y=\\frac{24}{6}=4")}.`,
        checkZh: `两个点都满足乘积 ${m("xy=24")}。`,
        checkEn: `Both points satisfy product ${m("xy=24")}.`
      },
      {
        titleZh: "例2：直角三角函数",
        titleEn: "Example 2: Right-Triangle Trigonometry",
        promptZh: `直角三角形中，角 ${m("A")} 的对边为 ${m("9")}，邻边为 ${m("12")}。求 ${m("\\tan A")}。`,
        promptEn: `In a right triangle, the side opposite angle ${m("A")} is ${m("9")} and the adjacent side is ${m("12")}. Find ${m("\\tan A")}.`,
        solutionZh: `${m("\\tan A=\\frac{\\text{对边}}{\\text{邻边}}=\\frac{9}{12}=\\frac34")}。`,
        solutionEn: `${m("\\tan A=\\frac{\\text{opposite}}{\\text{adjacent}}=\\frac{9}{12}=\\frac34")}.`,
        checkZh: `正切只用对边和邻边，不用斜边。`,
        checkEn: `Tangent uses opposite and adjacent sides, not the hypotenuse.`
      }
    ],
    commonPitfallsZh: ["把反比例函数的象限读错。", "相似比顺序写反。", "三角函数中对边、邻边选错。", "三视图观察方向混淆。"],
    commonPitfallsEn: ["Misreading quadrants of an inverse proportional graph.", "Reversing the order of a similarity ratio.", "Choosing the wrong opposite or adjacent side in trigonometry.", "Confusing the viewing direction in projection views."],
    misconceptionClinicZh: [`若学生把 ${m("y=\\frac{12}{x}")} 当作一次函数，请比较 ${m("x")} 加倍时 ${m("y")} 是否也加倍。`, `若学生写相似比 ${m("5:2")}，请让他先标“小:大”或“大:小”。`],
    misconceptionClinicEn: [`If a learner treats ${m("y=\\frac{12}{x}")} as linear, compare what happens to ${m("y")} when ${m("x")} doubles.`, `If a learner writes similarity ratio ${m("5:2")}, ask them to label "small:large" or "large:small" first.`],
    strategyChecklistZh: ["反比例函数先找乘积常数。", "相似题先标对应顶点和对应边。", "三角函数先确定角，再找对边、邻边、斜边。", "视图题先写观察方向。"],
    strategyChecklistEn: ["For inverse proportion, find the constant product first.", "For similarity, mark corresponding vertices and sides.", "For trigonometry, identify the angle before opposite, adjacent, and hypotenuse.", "For projection views, write the viewing direction first."],
    checkpoints: [
      checkpoint("c1", `${m("y=\\frac{18}{x}")} 中，当 ${m("x=3")} 时 ${m("y")} 是多少？`, `In ${m("y=\\frac{18}{x}")}, what is ${m("y")} when ${m("x=3")}?`, "6", `${m("y=\\frac{18}{3}=6")}。`, `${m("y=\\frac{18}{3}=6")}.`),
      checkpoint("c2", `两个相似三角形边长比为 ${m("3:4")}，较小的三角形一边 ${m("15")}，对应较大的边是多少？`, `Two similar triangles have side ratio ${m("3:4")}. A side of the smaller triangle is ${m("15")}; what is the corresponding larger side?`, "20", `比例放大倍数为 ${m("\\frac43")}，所以 ${m("15\\times\\frac43=20")}。`, `The scale factor is ${m("\\frac43")}, so ${m("15\\times\\frac43=20")}.`),
      checkpoint("c3", `若直角三角形中 ${m("\\sin A=\\frac{5}{13}")}，对边与斜边的比是多少？`, `If ${m("\\sin A=\\frac{5}{13}")} in a right triangle, what is the ratio of opposite side to hypotenuse?`, "5:13", `${m("\\sin A")} 就是对边与斜边之比，所以为 ${m("5:13")}。`, `${m("\\sin A")} is the ratio of opposite side to hypotenuse, so it is ${m("5:13")}.`)
    ],
    examStyleStrategyZh: "测量应用题先画比例关系图，再决定用相似、反比例还是三角函数；不要先代公式再找边。",
    examStyleStrategyEn: "For measurement applications, draw the ratio relationship first, then decide whether similarity, inverse proportion, or trigonometry applies. Do not substitute into a formula before identifying sides.",
    extensionZh: "设计一个测量树高的问题，给出角度或相似影长数据，并写出完整比例关系。",
    extensionEn: "Design a tree-height measurement problem using an angle or similar-shadow data, then write the full ratio relationship.",
    exitTicketZh: `使用 ${m("\\tan A")} 前，为什么必须先确定角 ${m("A")}？`,
    exitTicketEn: `Before using ${m("\\tan A")}, why must angle ${m("A")} be identified first?`,
    glossary: [
      ["反比例函数", "inverse proportional function", "形如 y 等于常数除以 x 的函数。", "A function where y equals a constant divided by x."],
      ["相似", "similarity", "形状相同、大小可以不同的图形关系。", "A relationship where figures have the same shape but may differ in size."],
      ["正切", "tangent", "直角三角形内某个锐角的对边与邻边之比。", "For an acute angle in a right triangle, the ratio of opposite side to adjacent side."],
      ["视图", "projection view", "从某个方向观察立体得到的平面图。", "A plane view of a solid from a chosen direction."]
    ]
  }
};

function makeStudentLesson(profile, language) {
  const isZh = language === "zhHans";
  return {
    title: isZh ? profile.titleZh : profile.titleEn,
    hook: isZh ? profile.hookZh : profile.hookEn,
    objectives: isZh ? profile.objectivesZh : profile.objectivesEn,
    prerequisiteWarmUp: isZh ? profile.prerequisiteWarmUpZh : profile.prerequisiteWarmUpEn,
    conceptExplanation: isZh ? profile.conceptExplanationZh : profile.conceptExplanationEn,
    workedExamples: profile.workedExamples.map((example) => ({
      title: isZh ? example.titleZh : example.titleEn,
      prompt: isZh ? example.promptZh : example.promptEn,
      solution: isZh ? example.solutionZh : example.solutionEn,
      check: isZh ? example.checkZh : example.checkEn
    })),
    commonPitfalls: isZh ? profile.commonPitfallsZh : profile.commonPitfallsEn,
    misconceptionClinic: isZh ? profile.misconceptionClinicZh : profile.misconceptionClinicEn,
    strategyChecklist: isZh ? profile.strategyChecklistZh : profile.strategyChecklistEn,
    checkpoints: profile.checkpoints.map((item) => ({
      id: item.id,
      prompt: isZh ? item.prompt : item.promptEn,
      answer: item.answer,
      explanation: isZh ? item.explanation : item.explanationEn
    })),
    examStyleStrategy: isZh ? profile.examStyleStrategyZh : profile.examStyleStrategyEn,
    extension: isZh ? profile.extensionZh : profile.extensionEn,
    exitTicket: isZh ? profile.exitTicketZh : profile.exitTicketEn,
    glossary: profile.glossary.map(([termZh, termEn, definitionZh, definitionEn]) => ({
      term: isZh ? termZh : termEn,
      definition: isZh ? definitionZh : definitionEn
    }))
  };
}

function list(values) {
  return values.map((value, index) => `${index + 1}. ${value}`).join("\n");
}

function exampleText(examples, language) {
  return examples
    .map((example, index) => {
      const label = language === "zhHans" ? `例${index + 1}` : `Example ${index + 1}`;
      const checkLabel = language === "zhHans" ? "检查" : "Check";
      return `${label} ${example.title}\n${example.prompt}\n${example.solution}\n${checkLabel}: ${example.check}`;
    })
    .join("\n\n");
}

function checkpointText(checkpoints, language) {
  return checkpoints
    .map((item, index) => {
      const label = language === "zhHans" ? `小练习 ${index + 1}` : `Checkpoint ${index + 1}`;
      const answerLabel = language === "zhHans" ? "答案" : "Answer";
      return `${label}: ${item.prompt}\n${answerLabel}: ${item.answer}. ${item.explanation}`;
    })
    .join("\n");
}

function glossaryText(glossary) {
  return glossary.map((item) => `${item.term}: ${item.definition}`).join("\n");
}

function bilingualSections(profile, zh, en) {
  return [
    ["hook", "引入", "Hook", zh.hook, en.hook],
    ["objectives", "学习目标", "Objectives", list(zh.objectives), list(en.objectives)],
    ["warm-up", "预备热身", "Prerequisite Warm-Up", zh.prerequisiteWarmUp, en.prerequisiteWarmUp],
    ["concept", "核心讲解", "Core Concept", zh.conceptExplanation, en.conceptExplanation],
    ["worked-examples", "例题精讲", "Worked Examples", exampleText(zh.workedExamples, "zhHans"), exampleText(en.workedExamples, "en")],
    ["pitfalls", "常见错误", "Common Pitfalls", list(zh.commonPitfalls), list(en.commonPitfalls)],
    ["misconception-clinic", "误区诊断", "Misconception Clinic", list(zh.misconceptionClinic), list(en.misconceptionClinic)],
    ["strategy-checklist", "策略清单", "Strategy Checklist", list(zh.strategyChecklist), list(en.strategyChecklist)],
    ["checkpoints", "小练习", "Checkpoints", checkpointText(zh.checkpoints, "zhHans"), checkpointText(en.checkpoints, "en")],
    ["exam-strategy", "考试策略", "Exam-Style Strategy", zh.examStyleStrategy, en.examStyleStrategy],
    ["extension", "拓展任务", "Extension", zh.extension, en.extension],
    ["exit-ticket", "出门票", "Exit Ticket", zh.exitTicket, en.exitTicket],
    ["glossary", "术语表", "Glossary", glossaryText(zh.glossary), glossaryText(en.glossary)]
  ].map(([id, labelZh, labelEn, zhHans, enText]) => ({ id, labelZh, labelEn, zhHans, en: enText }));
}

function escapeTableCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function renderMarkdown(lesson) {
  const zh = lesson.studentLesson.zhHans;
  const en = lesson.studentLesson.en;
  const bilingualRows = lesson.studentLesson.bilingual.sections
    .map((section) => `| ${escapeTableCell(section.labelZh)} | ${escapeTableCell(section.zhHans)} | ${escapeTableCell(section.en)} |`)
    .join("\n");

  return [
    `# ${zh.title}`,
    "",
    `- Schema: ${lesson.schemaVersion}`,
    `- Lesson ID: ${lesson.id}`,
    `- Topic ID: ${lesson.metadata.topicId}`,
    `- Grade/Semester: ${lesson.metadata.grade} ${lesson.metadata.semester}`,
    `- Review status: ${lesson.reviewStatus}`,
    `- Integration status: ${lesson.integrationStatus}`,
    `- Source safety: ${lesson.metadata.sourceSafetyStatus}`,
    "",
    "## 简体中文教材",
    "",
    `### 引入\n${zh.hook}`,
    "",
    `### 学习目标\n${list(zh.objectives)}`,
    "",
    `### 预备热身\n${zh.prerequisiteWarmUp}`,
    "",
    `### 核心讲解\n${zh.conceptExplanation}`,
    "",
    `### 例题精讲\n${exampleText(zh.workedExamples, "zhHans")}`,
    "",
    `### 常见错误\n${list(zh.commonPitfalls)}`,
    "",
    `### 误区诊断\n${list(zh.misconceptionClinic)}`,
    "",
    `### 策略清单\n${list(zh.strategyChecklist)}`,
    "",
    `### 小练习\n${checkpointText(zh.checkpoints, "zhHans")}`,
    "",
    `### 考试策略\n${zh.examStyleStrategy}`,
    "",
    `### 拓展任务\n${zh.extension}`,
    "",
    `### 出门票\n${zh.exitTicket}`,
    "",
    `### 术语表\n${glossaryText(zh.glossary)}`,
    "",
    "## English Lesson Textbook",
    "",
    `### Hook\n${en.hook}`,
    "",
    `### Objectives\n${list(en.objectives)}`,
    "",
    `### Prerequisite Warm-Up\n${en.prerequisiteWarmUp}`,
    "",
    `### Core Concept\n${en.conceptExplanation}`,
    "",
    `### Worked Examples\n${exampleText(en.workedExamples, "en")}`,
    "",
    `### Common Pitfalls\n${list(en.commonPitfalls)}`,
    "",
    `### Misconception Clinic\n${list(en.misconceptionClinic)}`,
    "",
    `### Strategy Checklist\n${list(en.strategyChecklist)}`,
    "",
    `### Checkpoints\n${checkpointText(en.checkpoints, "en")}`,
    "",
    `### Exam-Style Strategy\n${en.examStyleStrategy}`,
    "",
    `### Extension\n${en.extension}`,
    "",
    `### Exit Ticket\n${en.exitTicket}`,
    "",
    `### Glossary\n${glossaryText(en.glossary)}`,
    "",
    "## 双语对照",
    "",
    "| Section | 简体中文 | English |",
    "| --- | --- | --- |",
    bilingualRows,
    "",
    "## Evidence IDs",
    "",
    `- Curriculum RAG cards: ${lesson.metadata.evidence.ragCardIds.join(", ")}`,
    `- Junior paper-pattern cards: ${lesson.metadata.evidence.juniorPaperPatternCardIds.join(", ")}`,
    `- Junior exam-pattern cards: ${lesson.metadata.evidence.juniorExamPatternCardIds.join(", ")}`,
    "",
    "## Source-Safety Note",
    "",
    "This lesson is MAIS-authored from safe abstraction cards only. It must not be treated as copied, translated, paraphrased, or reconstructed PEP textbook or paper content.",
    ""
  ].join("\n");
}

function buildLesson(card, index) {
  const profile = profiles[card.id];
  if (!profile) throw new Error(`Missing lesson profile for ${card.id}`);

  const evidencePack = getMainlandPepEvidencePack({
    grade: card.grade,
    semester: card.semester,
    unitTitle: card.unitTitle,
    conceptIds: card.conceptIds,
    intent: "generate-lesson",
    limit: 8
  });
  const juniorExamPatternCards = evidencePack.juniorExamPatternCards.length
    ? evidencePack.juniorExamPatternCards
    : getMainlandPepJuniorExamPatternCards({
        grade: card.grade,
        intent: "generate-lesson",
        limit: 4
      });

  const zhHans = makeStudentLesson(profile, "zhHans");
  const en = makeStudentLesson(profile, "en");
  const sections = bilingualSections(profile, zhHans, en);

  return {
    schemaVersion,
    id: `mainland-pep-junior-lesson-${String(index + 1).padStart(2, "0")}`,
    generatedAt,
    reviewStatus: "approved",
    reviewStatusReason: "Owner-authorized S18/S09/S05 production integration pass: source-safety, grade fit, bilingual structure, and Lesson block mapping approved for MAIS original junior-secondary Lesson content.",
    integrationStatus: "production-integrated",
    pilot: ["pep-junior-s1-upper-rational-numbers", "pep-junior-s2-upper-triangles-congruence", "pep-junior-s3-upper-quadratics-circle-probability"].includes(card.id),
    metadata: {
      topicId: card.id,
      ragCardId: card.id,
      publisher: card.publisher,
      stage: card.stage,
      grade: card.grade,
      semester: card.semester,
      unitTitle: card.unitTitle,
      estimatedMinutes: profile.estimatedMinutes,
      difficultyBand: card.difficultyBand,
      sourceSafetyStatus: "safe-rag-only",
      generationMode: "deterministic-mais-authored-safe-abstraction",
      evidence: {
        ragCardIds: evidencePack.cards.map((item) => item.id),
        juniorPaperPatternCardIds: evidencePack.juniorPaperPatternCards.map((item) => item.id),
        juniorExamPatternCardIds: juniorExamPatternCards.map((item) => item.id),
        primaryExamPatternCardIds: evidencePack.primaryExamPatternCards.map((item) => item.id),
        secondaryExamPatternCardIds: evidencePack.secondaryExamPatternCards.map((item) => item.id)
      },
      prohibitedReuseNotes: card.prohibitedReuseNotes
    },
    studentLesson: {
      zhHans,
      en,
      bilingual: {
        title: { zhHans: zhHans.title, en: en.title },
        sections
      },
      bilingualAlignment: sections.map((section) => ({
        id: section.id,
        labelZh: section.labelZh,
        labelEn: section.labelEn,
        status: "parallel-review-needed"
      }))
    },
    futureProductionMapping: {
      productionLessonSeedReady: true,
      suggestedTopicId: card.id,
      mappedBlockTypes: ["concept", "worked-example", "checklist", "practice", "extension"],
      notes: "Approved for production Lesson-section integration in the owner-authorized S18/S09/S05 pass; S11 route/browser smoke remains the post-integration verification gate."
    },
    qaGates: {
      s18MathCurriculumSourceDistance: "approved",
      s09ZhHansBilingual: "approved",
      s05LessonSectionMapping: "approved",
      s11RouteSmokeAfterIntegration: "pending-route-smoke"
    }
  };
}

rmSync(lessonsDir, { recursive: true, force: true });
mkdirSync(lessonsDir, { recursive: true });
mkdirSync(join(packDir, "review"), { recursive: true });

const juniorCards = mainlandPepJuniorRagCards.filter((card) => card.stage === "junior-secondary");
const lessons = juniorCards.map(buildLesson);
const lessonPack = {
  schemaVersion,
  generatedAt,
  publisher: "MAINLAND_PEP",
  stage: "junior-secondary",
  languageModes: ["zhHans", "en", "bilingual"],
  sourceSafetyStatus: "safe-rag-only",
  integrationStatus: "production-integrated",
  reviewStatus: "approved",
  releaseStatus: "approved-for-production",
  reviewStatusReason: "Owner-authorized S18/S09/S05 production integration pass: automated validation passed, safe-RAG source policy retained, and Lesson block mapping accepted.",
  lessonCount: lessons.length,
  expectedLessonCount: juniorCards.length,
  lessons
};

writeJson(join(packDir, "lessons.json"), lessonPack);

for (const lesson of lessons) {
  writeFileSync(join(lessonsDir, `${lesson.metadata.topicId}.md`), renderMarkdown(lesson));
}

const indexMd = [
  "# Mainland PEP Junior Generated Lesson-Textbook Pack",
  "",
  `- Schema: ${schemaVersion}`,
  `- Generated at: ${generatedAt}`,
  "- Status: Approved for production Lesson-section integration",
  "- Source mode: committed safe-abstraction RAG cards only",
  "- Language modes: Simplified Chinese, English, bilingual alignment",
  "",
  "## Inventory",
  "",
  "| # | Grade | Semester | Topic ID | Unit title | Pilot | Minutes |",
  "| ---: | --- | --- | --- | --- | --- | ---: |",
  ...lessons.map((lesson, index) =>
    `| ${index + 1} | ${lesson.metadata.grade} | ${lesson.metadata.semester} | ${lesson.metadata.topicId} | ${escapeTableCell(lesson.metadata.unitTitle)} | ${lesson.pilot ? "yes" : "no"} | ${lesson.metadata.estimatedMinutes} |`
  ),
  "",
  "## Integration Gates",
  "",
  "1. S18: approved mathematical correctness, grade/semester fit, Mainland PEP alignment, and source distance.",
  "2. S09: approved Simplified Chinese terminology and bilingual alignment.",
  "3. S05: approved Lesson-section mapping and student usability.",
  "4. S11: pending post-integration route/browser smoke.",
  "",
  "## Regenerate",
  "",
  "```bash",
  "node coordination/content-qa/mainland-pep-junior-lessons-v1/generate-lessons.mjs",
  "node coordination/content-qa/mainland-pep-junior-lessons-v1/validate-lessons.mjs",
  "```",
  ""
].join("\n");

writeFileSync(join(packDir, "index.md"), indexMd);

console.log(`Generated ${lessons.length} Mainland PEP junior production lessons in ${relative(projectRoot, packDir)}.`);
