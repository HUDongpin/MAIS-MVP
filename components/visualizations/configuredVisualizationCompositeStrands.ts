import type { ConfiguredSemanticPrimaryFamily } from "./ConfiguredSemanticPrimaryMarks";
import type { ConfiguredSemanticSecondaryFamily } from "./ConfiguredSemanticSecondaryMarks";
import type { FeaturedLabDefinition } from "../../data/visualizationLabs";
import type { LocalizedText } from "../../types";

export const CONFIGURED_VISUALIZATION_COMPOSITE_STRANDS_SOURCE = {
  auditScope: "37 Mainland labs resolved as composite-split or catalog-scope",
  catalogScopeCount: 5,
  compositeSplitCount: 32,
  frozenAuditSha256: "eabf3d1cc09bebc4cf81fe040152c92def6e031b106def1b82088e223554a3ea",
  version: "a18-composite-strands-v1"
} as const;

export const configuredVisualizationCompositeLabIds = [
  "pep-primary-p1-upper-shapes-position-time",
  "pep-primary-p2-upper-length-angles-observation",
  "pep-primary-p2-lower-place-value-measurement-data",
  "pep-primary-p3-upper-operations-fractions",
  "pep-primary-p3-upper-measurement-time-geometry",
  "pep-primary-p4-upper-large-numbers-multiplication",
  "pep-primary-p5-lower-volume-data",
  "pep-junior-s1-upper-geometric-figures",
  "pep-junior-s1-lower-lines-coordinates",
  "pep-junior-s2-lower-roots-pythagorean-quadrilaterals",
  "pep-junior-s3-upper-quadratics-circle-probability",
  "pep-junior-s3-lower-inverse-similarity-trigonometry",
  "pep-high-s6-probability-statistics-synthesis",
  "pep-high-s6-exam-practice",
  "bnu-junior-s3-lower-statistics-probability",
  "bnu-primary-p1-lower-math-play-review",
  "bnu-primary-p3-upper-math-play-review",
  "bnu-primary-p3-lower-math-play-review",
  "bnu-primary-p4-upper-math-play-review",
  "bnu-primary-p5-upper-review-activity",
  "bnu-primary-p5-lower-review-activity",
  "bnu-primary-p6-upper-review-activity",
  "bnu-primary-p6-lower-final-review",
  "bnu-high-s4-数学建模活动-一",
  "bnu-high-s4-预备知识",
  "bnu-high-s6-高三数列与导数综合复习",
  "hjb-primary-p1-upper-school-math-habits",
  "hjb-primary-p1-lower-review",
  "hjb-primary-p3-upper-review-place-value-operations",
  "hjb-primary-p3-upper-time-measurement",
  "hjb-primary-p3-lower-math-square-review",
  "hjb-primary-p4-upper-large-numbers-measurement",
  "hjb-primary-p4-upper-review-integration",
  "hjb-primary-p4-lower-review-operation-properties",
  "hjb-primary-p6-lower-probability-statistics",
  "hjb-high-s6-概率统计综合",
  "hjb-high-s6-数列与计数综合"
] as const;

export type ConfiguredVisualizationCompositeLabId =
  (typeof configuredVisualizationCompositeLabIds)[number];

export type ConfiguredVisualizationCompositeChildFamily =
  | ConfiguredSemanticPrimaryFamily
  | Exclude<ConfiguredSemanticSecondaryFamily, "composite-split" | "catalog-scope">;

export type ConfiguredVisualizationCompositeStrandLabel = LocalizedText & {
  zhHans: string;
};

export type ConfiguredVisualizationCompositeStrand = {
  family: ConfiguredVisualizationCompositeChildFamily;
  label: ConfiguredVisualizationCompositeStrandLabel;
  variant: string;
};

function strand(
  family: ConfiguredVisualizationCompositeChildFamily,
  variant: string,
  en: string,
  zh: string,
  zhHans: string
): ConfiguredVisualizationCompositeStrand {
  return { family, variant, label: { en, zh, zhHans } };
}

/**
 * Exact plans are intentional: broad review titles and the audit's ambiguous
 * `split-topic-strands`/`strategy-or-split` variants must never be routed by a
 * loose title regex. Each child is a concrete implemented semantic family;
 * recursive composite/catalog children are excluded at the type boundary.
 */
export const configuredVisualizationCompositeStrandPlans = {
  "pep-primary-p1-upper-shapes-position-time": [
    strand("shape-classifier", "sides-corners", "Sort shapes by sides and corners", "按邊與角分類圖形", "按边与角分类图形"),
    strand("solid-projection", "object-views", "Recognize a simple solid from its view", "從觀察圖辨認簡單立體", "从观察图辨认简单立体"),
    strand("coordinate-position", "relative-position-grid", "Describe relative position", "描述相對位置", "描述相对位置"),
    strand("clock-time", "whole-hour-clock", "Read whole-hour clocks", "認讀整時鐘面", "认读整时钟面")
  ],
  "pep-primary-p2-upper-length-angles-observation": [
    strand("measurement-model", "length-unit-intervals", "Measure and compare length", "量度與比較長度", "测量与比较长度"),
    strand("angle-measure", "identify-and-compare-angles", "Identify and compare angles", "辨認與比較角", "辨认与比较角"),
    strand("solid-projection", "object-views", "Match views of an object", "配對物體觀察圖", "配对物体观察图")
  ],
  "pep-primary-p2-lower-place-value-measurement-data": [
    strand("multi-place-value", "ones-to-ten-thousands", "Place value to 10,000", "萬以內位值", "万以内位值"),
    strand("mass-unit-conversion", "mass-units", "Compare mass units", "比較質量單位", "比较质量单位"),
    strand("clock-time", "clock-or-elapsed-time", "Read and compare time", "認讀與比較時間", "认读与比较时间"),
    strand("primary-bar-chart", "simple-table-bars", "Read a simple data display", "讀取簡單數據圖", "读取简单数据图")
  ],
  "pep-primary-p3-upper-operations-fractions": [
    strand("multi-place-value", "place-value-add-subtract", "Add and subtract by place value", "用位值做加減", "用位值做加减"),
    strand("equal-groups-array", "multi-digit-multiplication", "Model multiplication in equal groups", "用等組模型表示乘法", "用等组模型表示乘法"),
    strand("fraction-equivalence", "unit-fraction-part-whole", "Name equal parts as fractions", "用分數表示等份", "用分数表示等份")
  ],
  "pep-primary-p3-upper-measurement-time-geometry": [
    strand("measurement-model", "metric-unit-measure", "Measure with metric units", "使用公制單位量度", "使用公制单位测量"),
    strand("calendar-model", "calendar-elapsed-days", "Reason about dates and elapsed time", "推理日期與經過時間", "推理日期与经过时间"),
    strand("angle-measure", "simple-angle-measure", "Measure simple angles", "量度簡單角", "测量简单角"),
    strand("sequence-model", "growing-pattern", "Continue a growing pattern", "延續增長規律", "延续增长规律")
  ],
  "pep-primary-p4-upper-large-numbers-multiplication": [
    strand("large-whole-number-line", "whole-number-0-to-10000", "Locate and compare large numbers", "定位與比較大數", "定位与比较大数"),
    strand("multi-place-value", "large-number-read-round", "Read and round large numbers", "讀寫與取大數近似值", "读写与取大数近似值"),
    strand("equal-groups-array", "multi-digit-product", "Model a multi-digit product", "表示多位數乘積", "表示多位数乘积"),
    strand("measurement-estimation", "estimate-then-calculate", "Estimate, calculate, and check", "估算、計算與檢查", "估算、计算与检查")
  ],
  "pep-primary-p5-lower-volume-data": [
    strand("volume-layers", "unit-cube-layers", "Build cuboid volume with unit cubes", "用單位立方體建立體積", "用单位立方体建立体积"),
    strand("primary-bar-chart", "countable-category-bars", "Interpret a small data chart", "解讀小型數據圖", "解读小型数据图")
  ],
  "pep-junior-s1-upper-geometric-figures": [
    strand("line-angle-geometry", "points-lines-rays-segments", "Points, lines, rays, and segments", "點、線、射線與線段", "点、线、射线与线段"),
    strand("angle-measure", "shared-vertex-angle", "Construct and measure angles", "作角與量角", "作角与量角"),
    strand("solid-projection", "points-lines-planes-solids", "Relate points, lines, planes, and solids", "連繫點線面體", "联系点线面体")
  ],
  "pep-junior-s1-lower-lines-coordinates": [
    strand("line-angle-geometry", "parallel-transversal", "Parallel lines and transversal angles", "平行線與截線角", "平行线与截线角"),
    strand("signed-real-number-line", "signed-or-irrational", "Locate real numbers and radicals", "定位實數與根式", "定位实数与根式"),
    strand("coordinate-position", "ordered-pair-position", "Plot ordered pairs", "繪出有序數對", "绘出有序数对"),
    strand("plane-transform", "translation", "Translate a figure on the plane", "在平面平移圖形", "在平面平移图形")
  ],
  "pep-junior-s2-lower-roots-pythagorean-quadrilaterals": [
    strand("signed-real-number-line", "radical-position", "Simplify and locate radicals", "化簡與定位根式", "化简与定位根式"),
    strand("right-triangle", "pythagorean-converse-similarity", "Test the Pythagorean theorem and converse", "檢驗勾股定理與逆定理", "检验勾股定理与逆定理"),
    strand("quadrilateral-geometry", "parallelogram-properties", "Classify parallelograms", "辨認平行四邊形性質", "辨认平行四边形性质")
  ],
  "pep-junior-s3-upper-quadratics-circle-probability": [
    strand("quadratic-features", "equation-roots-and-graph", "Quadratic roots, vertex, and graph", "二次方程根、頂點與圖像", "二次方程根、顶点与图象"),
    strand("circle-sector", "radius-arc-sector", "Circle radius, arc, and sector", "圓的半徑、弧與扇形", "圆的半径、弧与扇形"),
    strand("plane-transform", "rotation", "Rotation about a center", "繞中心旋轉", "绕中心旋转"),
    strand("seeded-probability-experiment", "seeded-trial-machine", "Introductory probability experiment", "初步概率實驗", "初步概率实验")
  ],
  "pep-junior-s3-lower-inverse-similarity-trigonometry": [
    strand("reciprocal-function", "xy-equals-k", "Inverse-proportion graph", "反比例函數圖像", "反比例函数图象"),
    strand("triangle-geometry", "similar-triangle-ratios", "Similar triangles and scale ratios", "相似三角形與比例", "相似三角形与比例"),
    strand("triangle-trigonometry", "right-triangle-ratios", "Sine, cosine, and tangent", "正弦、餘弦與正切", "正弦、余弦与正切"),
    strand("solid-projection", "projection-views", "Projection and three views", "投影與三視圖", "投影与三视图")
  ],
  "pep-high-s6-probability-statistics-synthesis": [
    strand("combinatorics", "counting-outcomes", "Count the sample space", "計數樣本空間", "计数样本空间"),
    strand("seeded-probability-experiment", "seeded-trial-machine", "Probability and frequency", "概率與頻率", "概率与频率"),
    strand("random-variable-distribution", "discrete-random-variable", "Discrete probability distribution", "離散概率分佈", "离散概率分布"),
    strand("bivariate-regression", "scatter-regression-residual", "Regression and interpretation", "回歸與解釋", "回归与解释")
  ],
  "pep-high-s6-exam-practice": [
    strand("derivative-synthesis", "function-derivative-extrema", "Function and derivative strategy", "函數與導數策略", "函数与导数策略"),
    strand("analytic-line-circle", "line-circle-equations", "Analytic-geometry strategy", "解析幾何策略", "解析几何策略"),
    strand("statistics-distribution", "sample-mean-spread-observed-z", "Probability and statistics strategy", "概率統計策略", "概率统计策略"),
    strand("advanced-strategy", "vector-conic-solid-selection", "Vector, conic, or solid strategy", "向量、圓錐曲線或立體策略", "向量、圆锥曲线或立体策略")
  ],
  "bnu-junior-s3-lower-statistics-probability": [
    strand("primary-bar-chart", "frequency-bars", "Frequency table and bars", "頻數表與柱形圖", "频数表与柱形图"),
    strand("raw-data-summary", "sample-and-summary", "Statistical measures from data", "由數據計算統計量", "由数据计算统计量"),
    strand("seeded-probability-experiment", "seeded-trial-machine", "Probability experiment", "概率實驗", "概率实验")
  ],
  "bnu-primary-p1-lower-math-play-review": [
    strand("sequence-model", "simple-picture-pattern", "Continue a simple pattern", "延續簡單規律", "延续简单规律"),
    strand("small-whole-number-line", "count-and-check-routine", "Count and check routine", "數一數並檢查", "数一数并检查")
  ],
  "bnu-primary-p3-upper-math-play-review": [
    strand("expression-equivalence", "mixed-operation-order", "Mixed-operation check", "混合運算檢查", "混合运算检查"),
    strand("equal-groups-array", "multiplication-division-check", "Multiplication and division check", "乘除互相檢查", "乘除互相检查"),
    strand("area-perimeter", "rectangle-boundary-and-cover", "Perimeter and area check", "周界與面積檢查", "周长与面积检查"),
    strand("calendar-model", "calendar-elapsed-days", "Calendar and date check", "年月日檢查", "年月日检查")
  ],
  "bnu-primary-p3-lower-math-play-review": [
    strand("division-remainder-array", "quotient-remainder", "Division and remainder check", "除法與餘數檢查", "除法与余数检查"),
    strand("plane-transform", "translate-reflect-rotate-dilate", "Shape-motion check", "圖形運動檢查", "图形运动检查"),
    strand("area-perimeter", "rectangle-boundary-and-cover", "Area and perimeter check", "面積與周界檢查", "面积与周长检查"),
    strand("fraction-equivalence", "part-whole-equivalent", "Fraction-part check", "分數等份檢查", "分数等份检查")
  ],
  "bnu-primary-p4-upper-math-play-review": [
    strand("large-whole-number-line", "whole-number-0-to-10000", "Large-number check", "大數檢查", "大数检查"),
    strand("angle-measure", "shared-vertex-angle", "Line-and-angle check", "線與角檢查", "线与角检查"),
    strand("equal-groups-array", "multi-digit-product", "Multiplication-and-division check", "乘除檢查", "乘除检查"),
    strand("expression-equivalence", "operation-order-and-laws", "Operation-law check", "運算律檢查", "运算律检查")
  ],
  "bnu-primary-p5-upper-review-activity": [
    strand("decimal-product-area", "decimal-grid-product", "Decimal-operation check", "小數運算檢查", "小数运算检查"),
    strand("plane-transform", "translate-reflect-rotate-dilate", "Shape-transform check", "圖形變換檢查", "图形变换检查"),
    strand("symbolic-equation", "unknown-and-balance", "Equation check", "方程檢查", "方程检查"),
    strand("primary-bar-chart", "countable-category-bars", "Data-display check", "數據圖檢查", "数据图检查")
  ],
  "bnu-primary-p5-lower-review-activity": [
    strand("factor-array", "factor-pairs", "Factor-pair check", "因數對檢查", "因数对检查"),
    strand("polygon-area", "base-height-decompose", "Polygon-area check", "多邊形面積檢查", "多边形面积检查"),
    strand("fraction-operations", "exact-fraction-operation", "Fraction-operation check", "分數運算檢查", "分数运算检查"),
    strand("volume-layers", "unit-cube-layers", "Cuboid-volume check", "長方體體積檢查", "长方体体积检查")
  ],
  "bnu-primary-p6-upper-review-activity": [
    strand("fraction-operations", "exact-fraction-operation", "Fraction-operation check", "分數運算檢查", "分数运算检查"),
    strand("coordinate-position", "ordered-pair-position", "Position-coordinate check", "位置與坐標檢查", "位置与坐标检查"),
    strand("circle-sector", "radius-arc-sector", "Circle check", "圓的檢查", "圆的检查"),
    strand("percent-model", "fraction-decimal-percent", "Percent check", "百分數檢查", "百分数检查")
  ],
  "bnu-primary-p6-lower-final-review": [
    strand("ratio-proportion", "equivalent-ratios", "Ratio and proportion review", "比與比例複習", "比与比例复习"),
    strand("symbolic-equation", "unknown-and-balance", "Equation review", "方程複習", "方程复习"),
    strand("polygon-area", "base-height-decompose", "Geometry-measure review", "圖形度量複習", "图形测量复习"),
    strand("raw-data-summary", "sample-and-summary", "Data-summary review", "數據整理複習", "数据整理复习")
  ],
  "bnu-high-s4-数学建模活动-一": [
    strand("linear-function", "table-line-slope", "Build a function model", "建立函數模型", "建立函数模型"),
    strand("statistics-distribution", "sample-mean-spread-observed-z", "Build a data model", "建立數據模型", "建立数据模型"),
    strand("geometric-modeling", "assumption-variable-geometry", "Validate assumptions and predictions", "驗證假設與預測", "验证假设与预测")
  ],
  "bnu-high-s4-预备知识": [
    strand("set-logic", "membership-and-condition", "Sets and logical conditions", "集合與邏輯條件", "集合与逻辑条件"),
    strand("inequality-solver", "symbolic-inequality", "Inequality properties", "不等式性質", "不等式性质"),
    strand("quadratic-features", "equation-roots-and-graph", "Quadratic equations", "一元二次方程", "一元二次方程")
  ],
  "bnu-high-s6-高三数列与导数综合复习": [
    strand("sequence-model", "discrete-sequence", "Sequences, recurrence, and sums", "數列、遞推與求和", "数列、递推与求和"),
    strand("derivative-synthesis", "function-derivative-extrema", "Derivatives, monotonicity, and tangents", "導數、單調性與切線", "导数、单调性与切线")
  ],
  "hjb-primary-p1-upper-school-math-habits": [
    strand("small-whole-number-line", "count-check-listen-routine", "Count, explain, and check routine", "數一數、說一說、再檢查", "数一数、说一说、再检查")
  ],
  "hjb-primary-p1-lower-review": [
    strand("multi-place-value", "tens-ones", "Tens-and-ones review", "十位與個位複習", "十位与个位复习"),
    strand("small-whole-number-line", "whole-number-jumps", "Addition-and-subtraction review", "加減法複習", "加减法复习"),
    strand("clock-time", "clock-or-elapsed-time", "Time review", "時間複習", "时间复习"),
    strand("measurement-model", "unit-interval-measure", "Length review", "長度複習", "长度复习")
  ],
  "hjb-primary-p3-upper-review-place-value-operations": [
    strand("multi-place-value", "ones-to-ten-thousands", "Place-value review", "位值複習", "位值复习"),
    strand("expression-equivalence", "operation-order-and-laws", "Addition-subtraction relationship", "加減關係檢查", "加减关系检查"),
    strand("equal-groups-array", "multiplication-division-check", "Multiplication-division relationship", "乘除關係檢查", "乘除关系检查")
  ],
  "hjb-primary-p3-upper-time-measurement": [
    strand("clock-time", "clock-or-elapsed-time", "Elapsed-time reasoning", "經過時間推理", "经过时间推理"),
    strand("calendar-model", "calendar-elapsed-days", "Schedule and date reasoning", "日程與日期推理", "日程与日期推理")
  ],
  "hjb-primary-p3-lower-math-square-review": [
    strand("decimal-place-value", "ones-tenths-hundredths", "Decimal review", "小數複習", "小数复习"),
    strand("area-perimeter", "rectangle-boundary-and-cover", "Area-and-perimeter review", "面積與周界複習", "面积与周长复习"),
    strand("primary-bar-chart", "countable-category-bars", "Data-display review", "數據圖複習", "数据图复习")
  ],
  "hjb-primary-p4-upper-large-numbers-measurement": [
    strand("large-whole-number-line", "domain-window", "Large numbers and rounding", "大數與四捨五入", "大数与四舍五入"),
    strand("area-perimeter", "rectangle-boundary-and-cover", "Area-unit check", "面積單位檢查", "面积单位检查"),
    strand("mass-unit-conversion", "mass-units", "Mass-unit conversion", "質量單位換算", "质量单位换算"),
    strand("measurement-model", "unit-interval-measure", "Measurement-unit scale", "計量單位刻度", "计量单位刻度")
  ],
  "hjb-primary-p4-upper-review-integration": [
    strand("large-whole-number-line", "domain-window", "Large-number review", "大數複習", "大数复习"),
    strand("expression-equivalence", "operation-order-and-laws", "Operation review", "運算複習", "运算复习"),
    strand("angle-measure", "shared-vertex-angle", "Geometry review", "幾何複習", "几何复习"),
    strand("fraction-equivalence", "part-whole-equivalent", "Fraction review", "分數複習", "分数复习")
  ],
  "hjb-primary-p4-lower-review-operation-properties": [
    strand("expression-equivalence", "operation-order-and-laws", "Four operations and operation laws", "四則運算與運算律", "四则运算与运算律"),
    strand("equal-groups-array", "distributive-array-check", "Distributive-law array check", "分配律陣列檢查", "分配律阵列检查")
  ],
  "hjb-primary-p6-lower-probability-statistics": [
    strand("seeded-probability-experiment", "seeded-trial-machine", "Possibility and experimental frequency", "可能性與實驗頻率", "可能性与实验频率"),
    strand("line-chart", "ordered-line-data", "Statistical tables and charts", "統計表與統計圖", "统计表与统计图")
  ],
  "hjb-high-s6-概率统计综合": [
    strand("combinatorics", "counting-outcomes", "Sample-space counting", "樣本空間計數", "样本空间计数"),
    strand("seeded-probability-experiment", "seeded-trial-machine", "Events, independence, and frequency", "事件、獨立性與頻率", "事件、独立性与频率"),
    strand("random-variable-distribution", "discrete-random-variable", "Probability distribution", "概率分佈", "概率分布"),
    strand("statistics-distribution", "sample-mean-spread-observed-z", "Sampling and statistical estimation", "抽樣與統計估計", "抽样与统计估计")
  ],
  "hjb-high-s6-数列与计数综合": [
    strand("sequence-model", "discrete-sequence", "Sequences, recurrence, and induction", "數列、遞推與歸納", "数列、递推与归纳"),
    strand("combinatorics", "counting-outcomes", "Counting principles and combinations", "計數原理與組合", "计数原理与组合")
  ]
} as const satisfies Record<
  ConfiguredVisualizationCompositeLabId,
  readonly [
    ConfiguredVisualizationCompositeStrand,
    ConfiguredVisualizationCompositeStrand?,
    ConfiguredVisualizationCompositeStrand?,
    ConfiguredVisualizationCompositeStrand?
  ]
>;

export function isConfiguredVisualizationCompositeLabId(
  labId: string
): labId is ConfiguredVisualizationCompositeLabId {
  return Object.hasOwn(configuredVisualizationCompositeStrandPlans, labId);
}

export function resolveConfiguredVisualizationCompositeStrands(
  lab: Pick<FeaturedLabDefinition, "labId">
): readonly ConfiguredVisualizationCompositeStrand[] | null {
  if (!isConfiguredVisualizationCompositeLabId(lab.labId)) return null;
  return configuredVisualizationCompositeStrandPlans[lab.labId];
}
