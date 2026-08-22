import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { getPrimaryVisualizationLabForTopic, visualizationLabCatalog } from "./visualizationLabs";

type ExpectedLearnerMetadata = Readonly<{
  category: string;
  description: string;
  focus: string;
  formula: string;
  forbidden: RegExp;
}>;

const expectedMetadata = Object.freeze({
  "p2-multiplication-foundations": {
    category: "Equal rows and columns",
    description: "Count objects arranged in equal rows and columns, keeping rows × columns equal to the object total.",
    focus: "Synchronize the row count, column count, and every countable object in the arrangement.",
    formula: "rows × columns = object total",
    forbidden: /area|square units?|repeated addition|面積|面积|平方單位|平方单位|重複加法|重复加法/iu
  },
  "p2-place-value": {
    category: "Hundreds, tens and ones",
    description: "Build every whole number from 0 to 1000 with hundreds, tens, and ones, including regrouping ten hundreds as one thousand.",
    focus: "Keep the number synchronized with its visible hundreds, tens, ones, and one-thousand regrouping.",
    formula: "100 × hundreds + 10 × tens + ones = number",
    forbidden: /number line|start \+ step|數線|数线|起點|起点|步長|步长/iu
  },
  "p3-multiplication-division": {
    category: "Equal groups and sharing",
    description: "Keep one total synchronized across equal groups, a countable row-column arrangement, multiplication, and equal sharing.",
    focus: "Use the same objects to connect groups × items per group with equal sharing.",
    formula: "groups × items per group = total",
    forbidden: /area|remainder|面積|面积|餘數|余数/iu
  },
  "p3-measurement": {
    category: "Measurement and bar charts",
    description: "Convert one physical quantity between compatible metric units; separately read categorical bar heights from one zero-based shared scale.",
    focus: "Keep each measurement within one physical dimension, and keep each category count aligned to its own bar height.",
    formula: "same quantity ↔ compatible units; category count ↔ zero-based bar height",
    forbidden: /measured value (?:->|→) labelled bar height|量度值 (?:->|→) 具標籤的棒高|测量值 (?:->|→) 带标签的条形高度/iu
  },
  "p3-geometry-patterns": {
    category: "Quadrilaterals and triangles",
    description: "Recognise concrete quadrilaterals and triangles from their visible sides, vertices, and property marks.",
    focus: "Match each selected shape to only the side, vertex, equal-side, and parallel-side marks it actually has.",
    formula: "visible sides + vertices + property marks → shape family",
    forbidden: /angle A|degrees?|symmetr|general term|角 A|度數|度数|對稱|对称|通項|通项/iu
  },
  "p5-volume": {
    category: "Unit-cube volume",
    description: "Build a bounded cuboid from visible unit-cube layers and keep length × width × height equal to its volume.",
    focus: "Synchronize cubes per layer, visible layers, cuboid dimensions, and the total cubic units.",
    formula: "length × width × height = volume in cubic units",
    forbidden: /arrays? and area|rows × columns = area|陣列與面積|阵列与面积|行 × 列 = 面積|行 × 列 = 面积/iu
  },
  "p5-charts-averages": {
    category: "Composite bar charts",
    description: "Read and compare two data series category by category on one composite bar chart with one shared scale.",
    focus: "Keep both values for the selected category aligned to their bars and to the common scale.",
    formula: "series A value ↔ series B value on one shared scale",
    forbidden: /mean|average|spread|平均數|平均数|平均值|離散|离散/iu
  },
  "trigonometry-basics": {
    category: "Right-triangle trigonometry",
    description: "Resize one labelled right triangle, select an acute reference angle, and identify its opposite, adjacent, and hypotenuse sides.",
    focus: "Keep the selected angle and its opposite, adjacent, and hypotenuse labels synchronized with SOH-CAH-TOA.",
    formula: "sin θ = opposite/hypotenuse; cos θ = adjacent/hypotenuse; tan θ = opposite/adjacent",
    forbidden: /unit circle|wave|a sin\(bx|單位圓|单位圆|波形|正弦波/iu
  },
  "more-algebra": {
    category: "Algebraic forms",
    description: "Explore exact index laws, signed identity tiles, and rational cancellation while retaining the excluded value x = k.",
    focus: "Keep each algebraic transformation equal to its source expression and keep every domain restriction visible.",
    formula: "index law; identity; rational cancellation with x ≠ k",
    forbidden: /function famil|generic function|函數族|函数族|一般函數|一般函数/iu
  },
  "advanced-functions": {
    category: "Selected function curve",
    description: "Adjust one selected quadratic curve and keep its displayed formula, scale, and vertical shift synchronized.",
    focus: "Use the same scale and vertical shift for the one visible curve and its formula.",
    formula: "y = a·x² + k for one selected curve",
    forbidden: /families|compare|comparison|wave|函數族|函数族|比較|比较|波形/iu
  },
  "differentiation-intro": {
    category: "Tangent and local gradient",
    description: "At one selected point on the plotted curve, connect the tangent slope to the displayed local derivative.",
    focus: "Keep the curve, selected point, tangent line, and local gradient synchronized.",
    formula: "f(x) = 0.5ax² + 0.35; f′(x) = ax; tangent slope = f′(x₀)",
    forbidden: /secant|accumulated area|integral|割線|割线|累積面積|累积面积|積分|积分/iu
  },
  calculus: {
    category: "Tangent and local gradient",
    description: "At one selected point on the plotted curve, connect the tangent slope to the displayed local derivative.",
    focus: "Keep the curve, selected point, tangent line, and local gradient synchronized.",
    formula: "f(x) = 0.5ax² + 0.35; f′(x) = ax; tangent slope = f′(x₀)",
    forbidden: /secant|accumulated area|integral|割線|割线|累積面積|累积面积|積分|积分/iu
  },
  "statistics-s6": {
    category: "Normal distribution and standard scores",
    description: "Standardize one displayed observed value and locate its signed z-score in the normal-distribution model.",
    focus: "Keep the observed value, mean, positive standard deviation, signed z-score, and off-scale state synchronized.",
    formula: "z = (observed value − mean) / standard deviation, with standard deviation > 0",
    forbidden: /mean \+\/- spread|changing only mean and spread|平均數 \+\/- 離散|平均数 \+\/- 离散/iu
  },
  "mixed-problem-solving": {
    category: "Strategy, model and check",
    description: "Carry one distance-speed-time problem through a chosen representation, calculation, unit check, and inverse verification.",
    focus: "Use every known fact consistently in the diagram, table, equation, or graph selected by the learner.",
    formula: "distance = speed × time; inverse check: distance / time = speed",
    forbidden: /function famil|generic function|函數族|函数族|一般函數|一般函数/iu
  }
} as const satisfies Record<string, ExpectedLearnerMetadata>);

const additionalNarrowedMetadata = Object.freeze({
  "p1-counting-number-bonds": {
    category: "Number bonds",
    formula: "known part + missing part = total",
    forbidden: /number line|place value above 20|數線|数线|位值/iu
  },
  "p1-measurement-time": {
    category: "Length units and analogue time",
    formula: "equal units → length; minute hand at 12/6 → whole/half hour",
    forbidden: /money|data|quarter.hour|unit conversion|金錢|金钱|數據|数据|刻鐘|刻钟|換算|换算/iu
  },
  "p2-money-time": {
    category: "Hong Kong money and analogue time",
    formula: "payment − price = non-negative change; whole/half-hour time",
    forbidden: /data (?:->|→) bar|foreign currency|payment below price|數據 (?:->|→) 棒|数据 (?:->|→) 条|外幣|外币|付款不足/iu
  },
  "p2-length-data": {
    category: "Metres and one-to-one pictograms",
    formula: "1 icon = 1 object; length in metres",
    forbidden: /statistics|distribution|bar chart|icon multiplier|統計|统计|分佈|分布|棒形圖|条形图|圖示倍數|图标倍数/iu
  },
  "p3-fractions-intro": {
    category: "Fractions and equivalence",
    formula: "n/d ≡ 2n/2d, for 0 ≤ n ≤ d",
    forbidden: /ratio|unlike.denominator operations|比例|異分母運算|异分母运算/iu
  },
  "p4-large-numbers": {
    category: "Factors, multiples, HCF and LCM",
    formula: "d is a factor of n iff n = dq + r and r = 0; HCF = greatest common factor; LCM = least positive common multiple",
    forbidden: /arrays? and area|large.number place value|rounding|陣列與面積|阵列与面积|大數位值|大数位值|取近似/iu
  },
  "p5-fractions-operations": {
    category: "Unlike-denominator fraction operations",
    formula: "rename over the LCM → add/subtract two or three fractions → simplify",
    forbidden: /\bratio\b|same.denominator.only|equivalence.only|比例|同分母.*核心|只.*等值/iu
  },
  "p5-rates": {
    category: "Unitary method and unit price",
    formula: "unitary method: total cost / quantity = unit price",
    forbidden: /formal speed|journey graph|正式速率|行程圖|行程图/iu
  },
  "p6-percentages": {
    category: "Fractions, decimals and percentages",
    formula: "p% = p/100 = decimal; change = base × p/100; final = base ± change",
    forbidden: /\bratio\b|old.*new|compound percentage|比例|舊數.*新數|旧数.*新数|複合百分|复合百分/iu
  },
  "p6-ratio-proportion": {
    category: "Mean and broken-line graphs",
    formula: "mean = total / count = fair share; ordered points -> broken-line graph",
    forbidden: /\bratio\b|proportion|distribution|正反比|按比|分佈|分布/iu
  },
  "p6-speed": {
    category: "Speed and distance-time graphs",
    formula: "distance = speed × time; gradient = distance / time = speed",
    forbidden: /arrays? and area|multiplication array|陣列與面積|阵列与面积|乘法陣列|乘法阵列/iu
  },
  "p6-pre-secondary-problem-solving": {
    category: "Multi-step problem solving",
    formula: "spending = count × unit price + extra cost; if spending ≤ budget, remaining = budget − spending; if spending > budget, overspend = spending − budget",
    forbidden: /fraction|\bratio\b|分數|分数|比例/iu
  },
  coordinates: {
    category: "Signed coordinates",
    formula: "three or more signed points → labelled connected shape; pure translation/reflection",
    forbidden: /coordinate transformations|dilation|坐標與變換|坐标与变换|放大/iu
  },
  polynomials: {
    category: "Expansion and factorisation",
    formula: "(x+p)(x+q) = x² + (p+q)x + pq",
    forbidden: /function famil|f\(x\)|函數族|函数族/iu
  },
  "identities-square-patterns": {
    category: "Area identities",
    formula: "(a+b)^2 ≡ a^2+2ab+b^2; (a-b)^2 ≡ a^2-2ab+b^2; a^2-b^2 ≡ (a-b)(a+b)",
    forbidden: /arrays? and area|parabola|陣列與面積|阵列与面积|拋物線|抛物线/iu
  },
  "coordinate-geometry": {
    category: "Coordinate geometry",
    formula: "gradient = Δy/Δx; distance = √(Δx²+Δy²); midpoint = ((x₁+x₂)/2,(y₁+y₂)/2)",
    forbidden: /coordinates and transformations|\(x, y\) (?:->|→) \(x'|坐標與變換|坐标与变换/iu
  },
  "exam-revision": {
    category: "Revision planning",
    formula: "priority = 0.6(100 − mastery) + 8(recent errors); time = marks × minutes per mark",
    forbidden: /statistics and distributions|統計與分佈|统计与分布/iu
  }
} as const);

/**
 * These cards were independently found to contain at least one materially
 * false learner promise.  Keep all four learner-visible fields exact: a
 * category-only or formula-only repair must not hide stale description/focus
 * copy in the directory or recommendation card.
 */
const auditedMaterialMetadata = Object.freeze({
  "p1-addition-subtraction": {
    category: "0–20 number-line movement",
    description: "Move forward to add and backward to subtract on one directed number line from 0 to 20, including a stationary zero step.",
    focus: "Keep the start, non-negative step, operation, and endpoint synchronized without leaving 0–20.",
    formula: "add: end = start + step; subtract: end = start − step",
    forbidden: /pictures?|ten frames?|圖片|图片|圖像|图像|十格框|十格架/iu
  },
  "p4-large-numbers": {
    category: "Factors, multiples, HCF and LCM",
    description: "For positive integers, list complete factor pairs and positive multiples, test divisibility by zero remainder, and identify HCF and LCM from common lists.",
    focus: "Use factor-pair cards, a zero-remainder test, common-list intersections, and the least positive common multiple.",
    formula: "d is a factor of n iff n = dq + r and r = 0; HCF = greatest common factor; LCM = least positive common multiple",
    forbidden: /whole numbers?|factor arrays?|rounding|因數陣列|因数阵列|取近似/iu
  },
  "p4-decimals": {
    category: "Decimal place value on a number line",
    description: "Locate values from 0.00 to 2.00 at hundredth precision and decompose each value into ones, tenths, and hundredths.",
    focus: "Keep the point and its place-value digits synchronized on the main and magnified hundredth number lines.",
    formula: "ones + tenths/10 + hundredths/100 = decimal",
    forbidden: /money|measures?|金錢|金钱|貨幣|货币|度量情境|連繫小數與度量|联系小数与度量/iu
  },
  "p4-perimeter-area": {
    category: "Rectangle perimeter and area",
    description: "Change the length and width of one rectangle and distinguish its boundary length from its covered square units.",
    focus: "Keep one rectangle, its side lengths, boundary, unit-square grid, perimeter, and area synchronized.",
    formula: "P = 2(length + width); A = length × width",
    forbidden: /rectilinear composite|composite shapes?|volume|複合直線|复合直线|組合圖形|组合图形|體積|体积/iu
  },
  "p6-speed": {
    category: "Speed and distance-time graphs",
    description: "Change speed and time while keeping distance, a straight journey line through the origin, and its gradient synchronized.",
    focus: "Read speed, time, distance, the journey point, and the gradient from one distance-time graph.",
    formula: "distance = speed × time; gradient = distance / time = speed",
    forbidden: /tables?|arrays? and area|表格|陣列與面積|阵列与面积/iu
  },
  "p6-pre-secondary-problem-solving": {
    category: "Multi-step problem solving",
    description: "Carry one budget problem through represent, plan, solve, and inverse-check states while displaying and verifying the exact budget result.",
    focus: "Keep the budget, item count, unit price, extra cost, spending, result, and inverse check synchronized across all four workflow steps.",
    formula: "spending = count × unit price + extra cost; if spending ≤ budget, remaining = budget − spending; if spending > budget, overspend = spending − budget",
    forbidden: /budget\s*[−-]\s*total cost\s*=\s*remaining amount or overspend|fraction bar|預算\s*[−-]\s*總支出\s*=\s*餘額或超支|预算\s*[−-]\s*总支出\s*=\s*余额或超支|分數條|分数条/iu
  },
  integers: {
    category: "Signed number-line operations",
    description: "Add and subtract signed integers on one number line, including negative starts, negative operands, and subtraction of a negative.",
    focus: "Keep the selected operation, signed start, signed operand, movement direction, and endpoint synchronized.",
    formula: "add: end = start + operand; subtract: end = start − operand; subtracting a negative moves right",
    forbidden: /signed start \+ signed operand = result|帶正負號的起點 \+ 帶正負號的運算數 = 結果|带正负号的起点 \+ 带正负号的运算数 = 结果/iu
  },
  "algebra-basics": {
    category: "Algebra balance",
    description: "Represent x + a = b on a symbolic balance, apply the same inverse operation to both sides, isolate x, and verify by substitution.",
    focus: "Keep both sides of the symbolic balance equal through the inverse step, isolated solution, and substitution check.",
    formula: "x + a = b; x = b − a; check: x + a = b",
    forbidden: /patterns?|規律|规律|樣式|样式/iu
  },
  ratios: {
    category: "Equivalent ratios and unit rate",
    description: "Scale both terms of one part-to-part ratio by the same positive factor and read the amount of B per unit A.",
    focus: "Keep the base ratio bar, scaled ratio bar, common scale groups, and B-per-A unit marker synchronized.",
    formula: "a:b = ka:kb; B per A = b/a",
    forbidden: /fractions? and ratio|everyday Hong Kong|part\s*\/\s*whole|分數與比例|分数与比例|香港日常|部分\s*\/\s*整體|部分\s*\/\s*整体/iu
  },
  "trigonometry-s5": {
    category: "Sine and cosine transformations",
    description: "Transform one selected sine or cosine graph by changing its amplitude, period, and signed phase shift independently.",
    focus: "Keep the selected sine or cosine curve, amplitude guide, period guide, phase marker, and displayed formula synchronized.",
    formula: "y = A sin(2π(x−φ)/T) or y = A cos(2π(x−φ)/T)",
    forbidden: /identit(?:y|ies)|恆等式|恒等式/iu
  },
  "probability-s5": {
    category: "Counting and conditional probability",
    description: "Count unordered two-object outcomes and update a without-replacement conditional tree before calculating probability.",
    focus: "Keep the red and blue counts, unordered pair sample space, and each updated conditional branch synchronized.",
    formula: "total pairs = C(r+b,2); P(at least one red) = [C(r+b,2) − C(b,2)] / C(r+b,2); P(R then R) = r/(r+b) × (r−1)/(r+b−1)",
    forbidden: /simulation|frequency|trials?|模擬|模拟|頻數|频数|試驗次數|试验次数/iu
  },
  "exam-revision": {
    category: "Revision planning",
    description: "Rank algebra, geometry, and statistics revision from mastery gaps and recent errors, then budget time from marks and pace.",
    focus: "Keep each visible priority bar explainable from mastery and recent errors, and keep the time bar equal to marks × minutes per mark.",
    formula: "priority = 0.6(100 − mastery) + 8(recent errors); time = marks × minutes per mark",
    forbidden: /mixed.paper practice|混合試卷練習|混合试卷练习/iu
  },
  "statistics-s1": {
    category: "Distribution centre and spread",
    description: "Adjust the centre and positive spread of one symmetric summary curve and read both displayed values.",
    focus: "Keep the summary curve, centre marker, symmetric width, and centre-and-spread readout synchronized.",
    formula: "centre = μ; spread = s > 0; height(μ−s) = height(μ+s)",
    forbidden: /charts?|compare averages|mean \+\/- spread|圖表|图表|比較平均|比较平均|平均數 \+\/- 離散|平均数 \+\/- 离散/iu
  },
  "data-handling": {
    category: "Distribution centre and spread",
    description: "Connect one symmetric distribution shape to its displayed centre and positive spread.",
    focus: "Keep the summary curve, centre marker, symmetric width, and centre-and-spread readout synchronized.",
    formula: "centre = μ; spread = s > 0; height(μ−s) = height(μ+s)",
    forbidden: /evaluate data claims|mean \+\/- spread|評估數據說法|评估数据说法|平均數 \+\/- 離散|平均数 \+\/- 离散/iu
  }
} as const satisfies Record<string, ExpectedLearnerMetadata>);

/**
 * Byte-stable trilingual snapshots complement the readable English contract
 * and forbidden-claim checks above. A future copy change in any of the four
 * learner-visible fields or three locales therefore requires an explicit,
 * reviewed contract update instead of passing merely because it is nonblank.
 */
const auditedMaterialLocaleSha256 = Object.freeze({
  "p1-addition-subtraction": "5eae08b1352697b7ecf9bbfc8a96babad912861bbcced9eec3bbf9ed1bba8a35",
  "p4-large-numbers": "c623775d67395cfadd90e5b78280bef8f7177636d7a02b95b12b7d815e1cf6a6",
  "p4-decimals": "22793c39b7d1a778a8dc50a698f24289875389334693efb2419a6269dc2254c8",
  "p4-perimeter-area": "8a4552fd5dfdf92808f4ab9d5a4fffa63b3e6482b730de442d90c3178723e010",
  "p6-speed": "f2ddd193767420e9095ce74c6318a9f7e804e3c5112f9085b7d06173a28f815e",
  "p6-pre-secondary-problem-solving": "23fb0b4efdca1c810166ddb5f88a4bb27a33e28890a39a3f29dfcfdfbcc0c33d",
  integers: "ad381f0ac567740260d8e05b29965bef60ce302bd2f86ce162c51dfb9510b3c0",
  "algebra-basics": "d54c7808d826c1fbaf8961349ffba20826b52893f902cf7563cb2588a8a41f1a",
  ratios: "7d8a023524c0efd19983978fb4c86591a0d715c301c073e785b0617f9e3edf86",
  "trigonometry-s5": "40b283defc7da83abef95c009c02b1f09464954cafbd0bd6f7d6dc8b69c89013",
  "probability-s5": "df3150a7677c4bdeec76f56b00f25507a223f6b5d1091933074b5467cb1c3cc9",
  "exam-revision": "49cd43711aab5c1d435571887d9744ce7ff7d7831d45241b7d15c2ef8ba34495",
  "statistics-s1": "297833823d4c52d5bae0499b7c4a4c63a5f6358b2e2d3a07ab81e9ed7dce4e44",
  "data-handling": "0d3de3b133bd3248a016ebd32515eb2c4d4a175f6733d8038d4cb6bb75b63626"
} as const satisfies Record<keyof typeof auditedMaterialMetadata, string>);

const broadSafeMetadataReasons = Object.freeze({
  angles: "The broad geometry label is truthful; the learner surface is bounded by the exact draggable-triangle 180-degree formula.",
  "arc-length-sector-area": "All four fields describe the same dedicated sector, arc, exact-pi, and approximation surface.",
  circles: "The broad geometry label is truthful and every named circle object appears in the dedicated model.",
  functions: "The generic input-output-to-graph promise is a conservative subset of the delivered function model.",
  "linear-equations": "The algebra-balance copy conservatively describes the delivered equality and solve controls.",
  "p1-counting-number-bonds": "The narrowed category/formula are exact and the remaining copy does not promise arithmetic outside the delivered number-bond model.",
  "p1-measurement-time": "The card truthfully limits itself to equal length units and whole or half-hour analogue time.",
  "p1-shapes-patterns": "The broad geometry copy is age-fit and limited to common 2D shapes and repeating visual patterns delivered by the model.",
  "p2-money-time": "The narrowed category/formula are exact and the generic remainder does not add foreign currency or unsupported time intervals.",
  "p2-length-data": "The fixed one-icon-to-one-object key and metre promise safely bound the remaining copy.",
  "p3-fractions-intro": "The narrowed formula is an exact subset of the fraction and equivalence surface, including the endpoint n=d.",
  "p4-angles": "The broad geometry category is truthful and the other fields name only delivered quadrilateral properties and composition.",
  "p5-fractions-operations": "The narrowed formula precisely bounds the delivered unlike-denominator two-or-three-term operations.",
  "p5-rates": "The card safely underpromises the delivered unitary-method unit-price model and excludes formal speed.",
  "p6-percentages": "The card safely underpromises the delivered equivalent-form and given-percent change modes.",
  "p6-ratio-proportion": "The renamed category/formula exclude ratio semantics and truthfully describe mean plus broken-line graphs.",
  coordinates: "The narrowed signed-coordinate formula and copy exclude dilation while allowing the delivered translation and reflection.",
  polynomials: "The expansion/factorisation formula is exact and the remaining copy does not promise a function-family renderer.",
  "identities-square-patterns": "All learner fields are bounded by the three exact signed-area identities and their dedicated pieces.",
  "coordinate-geometry": "The three displayed coordinate formulae precisely bound the delivered gradient, distance, and midpoint surface.",
  "probability-s2": "Simulation, theoretical probability, frequency, and trials are all delivered by this dedicated S2 model.",
  "quadratic-patterns": "The copy explicitly requires a non-degenerate quadratic and names only graph features rendered by the lab.",
  transformations: "The copy distinguishes the three core rigid transformations from origin-centred enlargement enrichment."
} as const satisfies Record<string, string>);

function learnerText(topicId: string) {
  const lab = getPrimaryVisualizationLabForTopic(topicId);
  assert.ok(lab, `${topicId} must remain in the learner catalog`);
  return {
    lab,
    combined: [
      ...Object.values(lab.category),
      ...Object.values(lab.description),
      ...Object.values(lab.templateConfig.focus),
      ...Object.values(lab.templateConfig.formula ?? {})
    ].join(" ")
  };
}

function learnerLocaleSnapshotSha256(topicId: keyof typeof auditedMaterialMetadata) {
  const { lab } = learnerText(topicId);
  const localized = (value: typeof lab.category) => ({
    en: value.en,
    zh: value.zh,
    zhHans: value.zhHans
  });
  return createHash("sha256").update(JSON.stringify({
    category: localized(lab.category),
    description: localized(lab.description),
    focus: localized(lab.templateConfig.focus),
    formula: localized(lab.templateConfig.formula!)
  })).digest("hex");
}

test("HK learner catalog metadata describes the exact delivered model instead of its generic template", () => {
  for (const [topicId, expected] of Object.entries(expectedMetadata)) {
    const { lab } = learnerText(topicId);
    assert.equal(lab.curriculumTrack, "HK", topicId);
    assert.equal(lab.category.en, expected.category, `${topicId} category`);
    assert.equal(lab.description.en, expected.description, `${topicId} description`);
    assert.equal(lab.templateConfig.focus.en, expected.focus, `${topicId} focus`);
    assert.equal(lab.templateConfig.formula?.en, expected.formula, `${topicId} formula`);

    for (const [field, copy] of [
      ["category", lab.category],
      ["description", lab.description],
      ["focus", lab.templateConfig.focus],
      ["formula", lab.templateConfig.formula]
    ] as const) {
      assert.ok(copy, `${topicId} ${field}`);
      assert.ok(copy.en.trim(), `${topicId} ${field}.en`);
      assert.ok(copy.zh.trim(), `${topicId} ${field}.zh`);
      assert.ok(copy.zhHans?.trim(), `${topicId} ${field}.zhHans`);
    }
  }
});

test("HK learner catalog metadata removes audited false promises in every locale", () => {
  for (const [topicId, expected] of Object.entries(expectedMetadata)) {
    assert.doesNotMatch(learnerText(topicId).combined, expected.forbidden, topicId);
  }
});

test("additional HK template-backed cards expose narrowed category and formula promises", () => {
  for (const [topicId, expected] of Object.entries(additionalNarrowedMetadata)) {
    const { lab, combined } = learnerText(topicId);
    assert.equal(lab.category.en, expected.category, `${topicId} category`);
    assert.equal(lab.templateConfig.formula?.en, expected.formula, `${topicId} formula`);
    assert.doesNotMatch(combined, expected.forbidden, topicId);
  }
});

test("independently audited HK cards expose exact four-field learner metadata in every locale", () => {
  for (const [topicId, expected] of Object.entries(auditedMaterialMetadata)) {
    const { lab, combined } = learnerText(topicId);
    assert.equal(lab.category.en, expected.category, `${topicId} category`);
    assert.equal(lab.description.en, expected.description, `${topicId} description`);
    assert.equal(lab.templateConfig.focus.en, expected.focus, `${topicId} focus`);
    assert.equal(lab.templateConfig.formula?.en, expected.formula, `${topicId} formula`);
    assert.doesNotMatch(combined, expected.forbidden, topicId);

    for (const [field, copy] of [
      ["category", lab.category],
      ["description", lab.description],
      ["focus", lab.templateConfig.focus],
      ["formula", lab.templateConfig.formula]
    ] as const) {
      assert.ok(copy?.en.trim(), `${topicId} ${field}.en`);
      assert.ok(copy?.zh.trim(), `${topicId} ${field}.zh`);
      assert.ok(copy?.zhHans?.trim(), `${topicId} ${field}.zhHans`);
    }
  }
});

test("independently audited HK cards retain their exact trilingual four-field snapshots", () => {
  assert.deepEqual(
    Object.keys(auditedMaterialLocaleSha256).sort(),
    Object.keys(auditedMaterialMetadata).sort()
  );
  for (const [topicId, expectedSha256] of Object.entries(auditedMaterialLocaleSha256)) {
    assert.equal(
      learnerLocaleSnapshotSha256(topicId as keyof typeof auditedMaterialMetadata),
      expectedSha256,
      `${topicId} trilingual learner metadata snapshot`
    );
  }
});

test("audited learner-copy forbidden patterns reject known English, Traditional Chinese, and Simplified Chinese regressions", () => {
  const hardNegatives = [
    ["p1-addition-subtraction", "用圖像、十格架表示加減法"],
    ["p1-addition-subtraction", "用图像、十格架表示加减法"],
    ["p4-decimals", "Connect each decimal to a measure."],
    ["p4-decimals", "連繫小數與度量"],
    ["trigonometry-s5", "探索三角恆等式"]
  ] as const;

  for (const [topicId, stalePromise] of hardNegatives) {
    const expected = auditedMaterialMetadata[topicId];
    assert.match(stalePromise, expected.forbidden, `${topicId} must reject ${stalePromise}`);
  }
});

test("conditional budget formula and minutes-per-mark copy remain explicit in all three locales", () => {
  const budget = learnerText("p6-pre-secondary-problem-solving").lab;
  assert.equal(
    budget.templateConfig.formula?.zh,
    "支出 = 數量 × 單價 + 額外費用；若支出 ≤ 預算，餘款 = 預算 − 支出；若支出 > 預算，超支 = 支出 − 預算"
  );
  assert.equal(
    budget.templateConfig.formula?.zhHans,
    "支出 = 数量 × 单价 + 额外费用；若支出 ≤ 预算，余款 = 预算 − 支出；若支出 > 预算，超支 = 支出 − 预算"
  );

  const revision = learnerText("exam-revision").lab;
  assert.match(revision.templateConfig.formula?.zh ?? "", /每分所需分鐘/u);
  assert.match(revision.templateConfig.focus.zh, /每分所需分鐘/u);
  assert.match(revision.templateConfig.formula?.zhHans ?? "", /每分所需分钟/u);
  assert.match(revision.templateConfig.focus.zhHans ?? "", /每分所需分钟/u);
  assert.doesNotMatch(
    [
      revision.templateConfig.formula?.zh,
      revision.templateConfig.formula?.zhHans,
      revision.templateConfig.focus.zh,
      revision.templateConfig.focus.zhHans
    ].join(" "),
    /每分分鐘|每分分钟/u
  );
});

test("the learner metadata audit accounts for every exact HK topic with no silent omission", () => {
  const exactFourFieldIds = new Set([
    ...Object.keys(expectedMetadata),
    ...Object.keys(auditedMaterialMetadata)
  ]);
  const broadSafeIds = new Set(Object.keys(broadSafeMetadataReasons));
  const overlap = [...exactFourFieldIds].filter((topicId) => broadSafeIds.has(topicId));
  assert.deepEqual(overlap, [], "a topic cannot be both exact-four-field and broad-safe");

  for (const [topicId, reason] of Object.entries(broadSafeMetadataReasons)) {
    assert.ok(reason.trim().length >= 24, `${topicId} broad-safe reason`);
    const { lab } = learnerText(topicId);
    for (const [field, copy] of [
      ["category", lab.category],
      ["description", lab.description],
      ["focus", lab.templateConfig.focus],
      ["formula", lab.templateConfig.formula]
    ] as const) {
      assert.ok(copy?.en.trim(), `${topicId} ${field}.en`);
      assert.ok(copy?.zh.trim(), `${topicId} ${field}.zh`);
      assert.ok(copy?.zhHans?.trim(), `${topicId} ${field}.zhHans`);
    }
  }

  const hkTopicIds = visualizationLabCatalog
    .filter((lab) => lab.curriculumTrack === "HK")
    .map((lab) => lab.topicId)
    .sort();
  const accountedTopicIds = [...new Set([...exactFourFieldIds, ...broadSafeIds])].sort();
  assert.equal(hkTopicIds.length, 51, "exact HK catalog size");
  assert.deepEqual(accountedTopicIds, hkTopicIds);
});
