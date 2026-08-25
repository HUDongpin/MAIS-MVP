import type { LocalizedText } from "../../types";
import {
  getConfiguredSemanticPrimaryControlContract,
  type ConfiguredSemanticPrimaryFamily
} from "./ConfiguredSemanticPrimaryMarks";
import type { ConfiguredSemanticSecondaryFamily } from "./ConfiguredSemanticSecondaryMarks";

export const CONFIGURED_VISUALIZATION_SEMANTIC_CONTROLS_SOURCE = {
  auditScope: "335 Mainland China curriculum-owned Visualization Labs",
  frozenAuditSha256: "eabf3d1cc09bebc4cf81fe040152c92def6e031b106def1b82088e223554a3ea",
  version: "a11-a18-learner-controls-v1"
} as const;

export type ConfiguredVisualizationSemanticControlFamily =
  | ConfiguredSemanticPrimaryFamily
  | ConfiguredSemanticSecondaryFamily;

export type ConfiguredVisualizationSemanticSliderInput =
  | "value"
  | "comparison"
  | "height";

export type ConfiguredVisualizationSemanticSlider = {
  disabled?: boolean;
  id: ConfiguredVisualizationSemanticSliderInput;
  initial: number;
  label: LocalizedText;
  max: number;
  min: number;
  role: string;
  step: number;
};

export type ConfiguredVisualizationSemanticMode = {
  id: string;
  label: LocalizedText;
  value: number;
};

export type ConfiguredVisualizationSemanticControlStateDomain =
  | {
      affectedControlIds: readonly [];
      controllerInputs: readonly [];
      id: "independent-controls";
      kind: "independent";
      projection: "identity";
      version: 1;
    }
  | {
      affectedControlIds: readonly ConfiguredVisualizationSemanticSliderInput[];
      controllerInputs: readonly (ConfiguredVisualizationSemanticSliderInput | "mode")[];
      id:
        | "directed-decimal-number-line-step"
        | "directed-large-whole-number-line-step"
        | "directed-signed-number-line-step"
        | "directed-small-whole-number-line-step"
        | "fraction-bar-numerator-v1"
        | "part-within-whole"
        | "proper-fraction-numerator";
      kind: "projected";
      projection: string;
      version: 1;
    };

export type ConfiguredVisualizationSemanticExternalPlan =
  | {
      kind: "dynamic-strands";
      label: LocalizedText;
      required: true;
    }
  | {
      kind: "catalog-scope";
      label: LocalizedText;
      required: true;
    };

export type ConfiguredVisualizationSemanticControlContract = {
  externalPlan: ConfiguredVisualizationSemanticExternalPlan | null;
  family: ConfiguredVisualizationSemanticControlFamily;
  modes: readonly ConfiguredVisualizationSemanticMode[];
  sliders: readonly ConfiguredVisualizationSemanticSlider[];
  stateDomain: ConfiguredVisualizationSemanticControlStateDomain;
};

export type ConfiguredVisualizationSemanticProjectedControlState = {
  bounds: Partial<Record<ConfiguredVisualizationSemanticSliderInput, {
    disabled: boolean;
    max: number;
    min: number;
  }>>;
  domain: ConfiguredVisualizationSemanticControlStateDomain;
  values: Partial<Record<ConfiguredVisualizationSemanticSliderInput, number>>;
};

function localized(en: string, zh: string, zhHans = zh): LocalizedText {
  return { en, zh, zhHans };
}

function slider(
  role: string,
  id: ConfiguredVisualizationSemanticSliderInput,
  label: LocalizedText,
  min: number,
  max: number,
  initial: number,
  step = 1
): ConfiguredVisualizationSemanticSlider {
  return { id, initial, label, max, min, role, step };
}

function mode<const Id extends string>(
  id: Id,
  value: number,
  label: LocalizedText
): ConfiguredVisualizationSemanticMode & { id: Id } {
  return { id, label, value };
}

const independentControlStateDomain: ConfiguredVisualizationSemanticControlStateDomain = {
  affectedControlIds: [],
  controllerInputs: [],
  id: "independent-controls",
  kind: "independent",
  projection: "identity",
  version: 1
};

function controlStateDomainForFamily(
  family: ConfiguredVisualizationSemanticControlFamily
): ConfiguredVisualizationSemanticControlStateDomain {
  if (family === "small-whole-number-line") {
    return {
      affectedControlIds: ["comparison"],
      controllerInputs: ["value", "mode"],
      id: "directed-small-whole-number-line-step",
      kind: "projected",
      projection: "comparison<=mode:add?20-value:value",
      version: 1
    };
  }
  if (family === "large-whole-number-line") {
    return {
      affectedControlIds: ["comparison"],
      controllerInputs: ["value", "mode"],
      id: "directed-large-whole-number-line-step",
      kind: "projected",
      projection: "comparison<=mode:add?10-value:value",
      version: 1
    };
  }
  if (family === "signed-real-number-line") {
    return {
      affectedControlIds: ["comparison"],
      controllerInputs: ["value", "mode"],
      id: "directed-signed-number-line-step",
      kind: "projected",
      projection: "comparison<=mode:add?10-value:value+10",
      version: 1
    };
  }
  if (family === "decimal-number-line") {
    return {
      affectedControlIds: ["comparison"],
      controllerInputs: ["value", "mode"],
      id: "directed-decimal-number-line-step",
      kind: "projected",
      projection: "comparison<=min(0.5,mode:add?2-value:value)",
      version: 1
    };
  }
  if (family === "fraction-equivalence") {
    return {
      affectedControlIds: ["value"],
      controllerInputs: ["comparison"],
      id: "proper-fraction-numerator",
      kind: "projected",
      projection: "value<=comparison-1",
      version: 1
    };
  }
  if (family === "percent-model") {
    return {
      affectedControlIds: ["value"],
      controllerInputs: ["comparison"],
      id: "part-within-whole",
      kind: "projected",
      projection: "value<=comparison",
      version: 1
    };
  }
  return independentControlStateDomain;
}

function contract<F extends ConfiguredVisualizationSemanticControlFamily>(
  family: F,
  sliders: readonly ConfiguredVisualizationSemanticSlider[] = [],
  modes: readonly ConfiguredVisualizationSemanticMode[] = [],
  externalPlan: ConfiguredVisualizationSemanticExternalPlan | null = null
): ConfiguredVisualizationSemanticControlContract {
  return {
    externalPlan,
    family,
    modes,
    sliders,
    stateDomain: controlStateDomainForFamily(family)
  };
}

export const configuredVisualizationSemanticControlContracts = {
  "small-whole-number-line": contract("small-whole-number-line", [
    slider("start", "value", localized("Start", "起點", "起点"), 0, 20, 8),
    slider("jump-magnitude", "comparison", localized("Step size", "步長", "步长"), 0, 10, 4)
  ], [
    mode("add", 0, localized("Increase", "增加")),
    mode("subtract", 1, localized("Decrease", "減少", "减少"))
  ]),
  "large-whole-number-line": contract("large-whole-number-line", [
    slider("start-tenth-index", "value", localized("Start tick", "起始刻度"), 0, 10, 3),
    slider("jump-tenth-count", "comparison", localized("Jump ticks", "跳動格數", "跳动格数"), 0, 10, 2)
  ], [
    mode("add", 0, localized("Move right", "向右移動", "向右移动")),
    mode("subtract", 1, localized("Move left", "向左移動", "向左移动"))
  ]),
  "signed-real-number-line": contract("signed-real-number-line", [
    slider("signed-start", "value", localized("Start position", "起始位置"), -10, 10, -3),
    slider("jump-magnitude", "comparison", localized("Distance", "距離", "距离"), 0, 10, 4)
  ], [
    mode("add", 0, localized("Positive direction", "正方向")),
    mode("subtract", 1, localized("Negative direction", "負方向", "负方向"))
  ]),
  "decimal-number-line": contract("decimal-number-line", [
    slider("decimal-start", "value", localized("Start decimal", "起始小數", "起始小数"), 0, 2, 0.62, 0.01),
    slider("decimal-jump", "comparison", localized("Decimal step", "小數步長", "小数步长"), 0, 0.5, 0.08, 0.01)
  ], [
    mode("add", 0, localized("Increase", "增加")),
    mode("subtract", 1, localized("Decrease", "減少", "减少"))
  ]),
  "multi-place-value": contract("multi-place-value", [
    slider("number-a", "value", localized("Number A", "數 A", "数 A"), 0, 99_999, 12_345),
    slider("number-b", "comparison", localized("Number B", "數 B", "数 B"), 0, 99_999, 12_054)
  ]),
  "decimal-place-value": contract("decimal-place-value", [
    slider("decimal-a", "value", localized("Decimal A", "小數 A", "小数 A"), 0, 9.99, 3.48, 0.01),
    slider("decimal-b", "comparison", localized("Decimal B", "小數 B", "小数 B"), 0, 9.99, 3.84, 0.01)
  ]),
  "equal-groups-array": contract("equal-groups-array", [
    slider("rows", "value", localized("Rows", "行數", "行数"), 1, 10, 4),
    slider("columns", "comparison", localized("Columns", "列數", "列数"), 1, 10, 5)
  ]),
  "division-remainder-array": contract("division-remainder-array", [
    slider("dividend", "value", localized("Dividend", "被除數", "被除数"), 0, 99, 23),
    slider("divisor", "comparison", localized("Divisor", "除數", "除数"), 1, 10, 4)
  ]),
  "factor-array": contract("factor-array", [
    slider("factor-a", "value", localized("Rows", "行數", "行数"), 1, 10, 6),
    slider("factor-b", "comparison", localized("Columns", "列數", "列数"), 1, 10, 4)
  ]),
  "decimal-product-area": contract("decimal-product-area", [
    slider("tenths-factor-a", "value", localized("First tenths", "第一個十分位", "第一个十分位"), 1, 10, 6),
    slider("tenths-factor-b", "comparison", localized("Second tenths", "第二個十分位", "第二个十分位"), 1, 10, 4)
  ]),
  "volume-layers": contract("volume-layers", [
    slider("length", "value", localized("Length", "長", "长"), 1, 10, 4),
    slider("width", "comparison", localized("Width", "寬", "宽"), 1, 10, 3),
    slider("height", "height", localized("Height", "高"), 1, 10, 2)
  ], [
    mode("layers", 0, localized("Layers", "分層", "分层")),
    mode("solid", 1, localized("Solid", "組合立體", "组合立体"))
  ]),
  "area-perimeter": contract("area-perimeter", [
    slider("width", "value", localized("Width", "寬", "宽"), 1, 10, 6),
    slider("height", "comparison", localized("Height", "高"), 1, 8, 4)
  ]),
  "polygon-area": contract("polygon-area", [
    slider("base", "value", localized("Base", "底"), 2, 10, 6),
    slider("height", "comparison", localized("Height", "高"), 1, 8, 4)
  ], [
    mode("parallelogram", 0, localized("Parallelogram", "平行四邊形", "平行四边形")),
    mode("triangle", 1, localized("Triangle", "三角形")),
    mode("trapezoid", 2, localized("Trapezoid", "梯形"))
  ]),
  "fraction-equivalence": contract("fraction-equivalence", [
    slider("numerator", "value", localized("Numerator", "分子"), 1, 11, 4),
    slider("denominator", "comparison", localized("Denominator", "分母"), 2, 12, 6)
  ]),
  "fraction-operations": contract("fraction-operations", [
    slider("operand-a-tenths", "value", localized("First fraction (tenths)", "第一個分數（十分位）", "第一个分数（十分位）"), 1, 9, 3),
    slider("operand-b-tenths", "comparison", localized("Second fraction (tenths)", "第二個分數（十分位）", "第二个分数（十分位）"), 1, 9, 2)
  ], [
    mode("add", 0, localized("Add", "加法")),
    mode("subtract", 1, localized("Subtract", "減法", "减法")),
    mode("multiply", 2, localized("Multiply", "乘法")),
    mode("divide", 3, localized("Divide", "除法"))
  ]),
  "ratio-proportion": contract("ratio-proportion", [
    slider("ratio-a", "value", localized("First ratio term", "比的前項", "比的前项"), 1, 12, 3),
    slider("ratio-b", "comparison", localized("Second ratio term", "比的後項", "比的后项"), 1, 12, 4)
  ]),
  "percent-model": contract("percent-model", [
    slider("part", "value", localized("Part", "部分"), 0, 100, 30),
    slider("whole", "comparison", localized("Whole", "整體", "整体"), 1, 100, 100)
  ]),
  "proportional-function": contract("proportional-function", [
    slider("x", "value", localized("x value", "x 值"), 1, 8, 3),
    slider("constant", "comparison", localized("Constant", "常數", "常数"), 1, 8, 2)
  ], [
    mode("direct", 0, localized("Direct proportion", "正比例")),
    mode("inverse", 1, localized("Inverse proportion", "反比例"))
  ]),
  "clock-time": contract("clock-time", [
    slider("hour", "value", localized("Hour", "小時", "小时"), 0, 23, 3),
    slider("minute", "comparison", localized("Minute", "分鐘", "分钟"), 0, 59, 30)
  ]),
  "calendar-model": contract("calendar-model", [
    slider("month", "value", localized("Month", "月份"), 1, 12, 2),
    slider("elapsed-days", "comparison", localized("Elapsed days", "經過日數", "经过天数"), 1, 31, 14)
  ]),
  "money-model": contract("money-model", [
    slider("whole-yuan", "value", localized("Whole yuan", "整元"), 0, 99, 23),
    slider("remaining-cents", "comparison", localized("Cents", "分"), 0, 99, 45)
  ]),
  "attribute-comparison": contract("attribute-comparison", [
    slider("attribute-a", "value", localized("Value A", "數值 A", "数值 A"), 0, 10, 7),
    slider("attribute-b", "comparison", localized("Value B", "數值 B", "数值 B"), 0, 10, 4)
  ], [
    mode("quantity", 0, localized("Quantity", "數量", "数量")),
    mode("length", 1, localized("Length", "長度", "长度")),
    mode("height", 2, localized("Height", "高度")),
    mode("mass", 3, localized("Mass", "質量", "质量"))
  ]),
  "measurement-model": contract("measurement-model", [
    slider("whole-centimetres", "value", localized("Centimetres", "厘米"), 0, 12, 7),
    slider("remaining-millimetres", "comparison", localized("Extra millimetres", "附加毫米"), 0, 9, 4)
  ], [
    mode("millimetres", 0, localized("Millimetres", "毫米")),
    mode("centimetres", 1, localized("Centimetres", "厘米")),
    mode("decimetres", 2, localized("Decimetres", "分米"))
  ]),
  "measurement-estimation": contract("measurement-estimation", [
    slider("estimate", "value", localized("Estimate", "估計", "估计"), 0, 10, 5, 0.1),
    slider("measured", "comparison", localized("Measured value", "測量值", "测量值"), 0, 10, 4.5, 0.1)
  ]),
  "mass-unit-conversion": contract("mass-unit-conversion", [
    slider("whole-kilograms", "value", localized("Whole kilograms", "整千克"), 0, 9_999, 2),
    slider("remaining-grams", "comparison", localized("Remaining grams", "餘下克數", "余下克数"), 0, 999, 500)
  ], [
    mode("grams", 0, localized("Grams", "克")),
    mode("kilograms", 1, localized("Kilograms", "千克")),
    mode("tonnes", 2, localized("Tonnes", "噸", "吨"))
  ]),
  "primary-bar-chart": contract("primary-bar-chart", [
    slider("sample-centre", "value", localized("Category A", "類別 A", "类别 A"), 0, 10, 5),
    slider("comparison-count", "comparison", localized("Category B", "類別 B", "类别 B"), 0, 10, 7)
  ]),
  "categorical-data": contract("categorical-data", [
    slider("category-a-count", "value", localized("Category A", "類別 A", "类别 A"), 0, 10, 7),
    slider("category-b-count", "comparison", localized("Category B", "類別 B", "类别 B"), 0, 10, 4)
  ]),
  "raw-data-summary": contract("raw-data-summary", [
    slider("sample-centre", "value", localized("Sample center", "樣本中心", "样本中心"), 0, 10, 5),
    slider("comparison-observation", "comparison", localized("Comparison value", "比較值", "比较值"), 0, 10, 7)
  ]),
  "line-chart": contract("line-chart", [
    slider("first-value", "value", localized("First value", "首個數值", "首个数值"), 0, 10, 3),
    slider("last-value", "comparison", localized("Last value", "末個數值", "末个数值"), 0, 10, 8)
  ], [
    mode("rising", 0, localized("Rising middle", "中段上升")),
    mode("falling", 1, localized("Falling middle", "中段下降"))
  ]),
  "seeded-probability-experiment": contract("seeded-probability-experiment", [
    slider("trials", "value", localized("Trials", "試驗次數", "试验次数"), 1, 24, 12),
    slider("success-probability", "comparison", localized("Success probability", "成功概率"), 0.1, 0.9, 0.5, 0.1)
  ], [
    mode("experiment", 0, localized("Experiment", "試驗", "试验")),
    mode("theory", 1, localized("Theory", "理論", "理论"))
  ]),
  "random-variable-distribution": contract("random-variable-distribution", [
    slider("success-probability", "value", localized("Success probability", "成功概率"), 0.1, 0.9, 0.5, 0.1),
    slider("binomial-trials", "comparison", localized("Trials", "試驗次數", "试验次数"), 1, 8, 4)
  ]),
  combinatorics: contract("combinatorics", [
    slider("available-items", "value", localized("Total items n", "總項數 n", "总项数 n"), 2, 8, 5),
    slider("chosen-items", "comparison", localized("Selected items r", "選取項數 r", "选取项数 r"), 1, 8, 3)
  ]),
  "angle-measure": contract("angle-measure", [
    slider("first-angle", "value", localized("First angle", "第一個角", "第一个角"), 0, 10, 4),
    slider("second-angle", "comparison", localized("Second angle", "第二個角", "第二个角"), 0, 10, 7)
  ]),
  "line-angle-geometry": contract("line-angle-geometry", [
    slider("relation-angle", "value", localized("Line direction / angle", "直線方向／夾角", "直线方向／夹角"), 0, 10, 5),
    slider("relation-position", "comparison", localized("Separation / intersection position", "間距／交點位置", "间距／交点位置"), 0, 10, 5)
  ], [
    mode("parallel-transversal", 0, localized("Parallel lines and transversal", "平行線與截線", "平行线与截线")),
    mode("perpendicular", 1, localized("Perpendicular lines", "垂直線", "垂直线")),
    mode("intersecting", 2, localized("Intersecting lines", "相交線", "相交线"))
  ]),
  "triangle-geometry": contract("triangle-geometry", [
    slider("vertex-x", "value", localized("Vertex horizontal position", "頂點水平位置", "顶点水平位置"), 0, 10, 5),
    slider("vertex-y", "comparison", localized("Vertex height", "頂點高度", "顶点高度"), 0, 10, 5)
  ]),
  "quadrilateral-geometry": contract("quadrilateral-geometry", [
    slider("width-and-skew", "value", localized("Width and skew", "寬度與傾斜", "宽度与倾斜"), 0, 10, 5),
    slider("height", "comparison", localized("Height", "高"), 0, 10, 5)
  ], [
    mode("parallelogram", 0, localized("Parallelogram", "平行四邊形", "平行四边形")),
    mode("rectangle", 1, localized("Rectangle", "長方形", "长方形"))
  ]),
  "right-triangle": contract("right-triangle", [
    slider("leg-a", "value", localized("Leg a", "直角邊 a", "直角边 a"), 0, 3, 2),
    slider("leg-b", "comparison", localized("Leg b", "直角邊 b", "直角边 b"), 0, 3, 1)
  ]),
  "circle-sector": contract("circle-sector", [
    slider("radius", "value", localized("Radius", "半徑", "半径"), 0, 10, 5),
    slider("central-angle", "comparison", localized("Central angle", "圓心角", "圆心角"), 0, 10, 5)
  ]),
  "shape-classifier": contract("shape-classifier", [
    slider("extra-sides", "value", localized("Extra sides", "附加邊數", "附加边数"), 0, 5, 3),
    slider("rotation", "comparison", localized("Rotation", "旋轉", "旋转"), 0, 10, 5)
  ]),
  "solid-projection": contract("solid-projection", [
    slider("width", "value", localized("Solid width", "立體寬度", "立体宽度"), 0, 3, 2),
    slider("depth", "comparison", localized("Solid depth", "立體深度", "立体深度"), 0, 2, 1)
  ]),
  "reflection-symmetry": contract("reflection-symmetry", [
    slider("source-x", "value", localized("Source x", "原像 x"), 0, 10, 5),
    slider("source-y", "comparison", localized("Source y", "原像 y"), 0, 10, 5)
  ]),
  "plane-transform": contract("plane-transform", [
    slider("source-x", "value", localized("Source x", "原圖 x", "原图 x"), 0, 10, 5),
    slider("source-y", "comparison", localized("Source y", "原圖 y", "原图 y"), 0, 10, 5)
  ], [
    mode("translation", 0, localized("Translation", "平移")),
    mode("reflection", 1, localized("Reflection", "反射")),
    mode("rotation", 2, localized("Rotation", "旋轉", "旋转")),
    mode("dilation", 3, localized("Dilation", "位似"))
  ]),
  "coordinate-position": contract("coordinate-position", [
    slider("x-coordinate", "value", localized("x coordinate", "x 坐標", "x 坐标"), 0, 10, 5),
    slider("y-coordinate", "comparison", localized("y coordinate", "y 坐標", "y 坐标"), 0, 10, 5)
  ]),
  "analytic-line-circle": contract("analytic-line-circle", [
    slider("line-slope", "value", localized("Line slope", "直線斜率", "直线斜率"), 0, 10, 5),
    slider("line-circle-offset", "comparison", localized("Line and circle offset", "直線與圓偏移", "直线与圆偏移"), 0, 10, 5)
  ]),
  "complex-plane": contract("complex-plane", [
    slider("real-part", "value", localized("Real part", "實部", "实部"), 0, 10, 7),
    slider("imaginary-part", "comparison", localized("Imaginary part", "虛部", "虚部"), 0, 10, 7)
  ], [
    mode("rotate-30", 0, localized("Rotate 30°", "旋轉 30°", "旋转 30°")),
    mode("rotate-45", 1, localized("Rotate 45°", "旋轉 45°", "旋转 45°")),
    mode("rotate-60", 2, localized("Rotate 60°", "旋轉 60°", "旋转 60°")),
    mode("rotate-75", 3, localized("Rotate 75°", "旋轉 75°", "旋转 75°"))
  ]),
  "symbolic-equation": contract("symbolic-equation", [
    slider("coefficient-index", "value", localized("Coefficient", "係數", "系数"), 0, 3, 1),
    slider("solution-index", "comparison", localized("Solution", "解"), 0, 5, 2)
  ]),
  "expression-equivalence": contract("expression-equivalence", [
    slider("term-a", "value", localized("Term a", "項 a", "项 a"), 0, 10, 4, 2),
    slider("term-b", "comparison", localized("Term b", "項 b", "项 b"), 0, 9, 3, 3)
  ]),
  "algebra-tiles-polynomial": contract("algebra-tiles-polynomial", [
    slider("factor-p", "value", localized("Factor p", "因數 p", "因数 p"), 0, 3, 1),
    slider("factor-q", "comparison", localized("Factor q", "因數 q", "因数 q"), 0, 2, 1)
  ]),
  "linear-system": contract("linear-system", [
    slider("solution-x", "value", localized("Solution x", "解 x"), 0, 3, 1),
    slider("solution-y", "comparison", localized("Solution y", "解 y"), 0, 3, 2)
  ]),
  "inequality-solver": contract("inequality-solver", [
    slider("boundary", "value", localized("Boundary", "邊界值", "边界值"), 0, 10, 4, 2),
    slider("constant", "comparison", localized("Constant term", "常數項", "常数项"), 0, 10, 5)
  ], [
    mode("positive-coefficient", 0, localized("Positive coefficient", "正係數", "正系数")),
    mode("negative-coefficient", 1, localized("Negative coefficient", "負係數", "负系数"))
  ]),
  "set-logic": contract("set-logic", [
    slider("set-a-offset", "value", localized("Set A offset", "集合 A 平移量"), 0, 10, 4, 2),
    slider("set-b-offset", "comparison", localized("Set B offset", "集合 B 平移量"), 0, 10, 6, 2)
  ]),
  "linear-function": contract("linear-function", [
    slider("slope", "value", localized("Slope", "斜率"), 0, 10, 5),
    slider("intercept", "comparison", localized("Intercept", "截距"), 0, 10, 5)
  ]),
  "reciprocal-function": contract("reciprocal-function", [
    slider("constant-magnitude", "value", localized("Constant magnitude", "常數絕對值", "常数绝对值"), 0, 10, 4, 2),
    slider("sample-x", "comparison", localized("Sample x", "樣本 x", "样本 x"), 0, 10, 5)
  ], [
    mode("positive-constant", 0, localized("Positive constant", "正常數", "正常数")),
    mode("negative-constant", 1, localized("Negative constant", "負常數", "负常数"))
  ]),
  "quadratic-features": contract("quadratic-features", [
    slider("left-root-index", "value", localized("Left root", "左根"), 0, 2, 1),
    slider("right-root-index", "comparison", localized("Right root", "右根"), 0, 2, 1)
  ], [
    mode("opens-up", 0, localized("Opens up", "開口向上", "开口向上")),
    mode("opens-down", 1, localized("Opens down", "開口向下", "开口向下"))
  ]),
  "quadratic-inequality": contract("quadratic-inequality", [
    slider("left-root-index", "value", localized("Left root", "左根"), 0, 2, 1),
    slider("right-root-index", "comparison", localized("Right root", "右根"), 0, 2, 1)
  ], [
    mode("opens-up", 0, localized("Opens up", "開口向上", "开口向上")),
    mode("opens-down", 1, localized("Opens down", "開口向下", "开口向下"))
  ]),
  "function-properties": contract("function-properties", [
    slider("coefficient", "value", localized("Coefficient", "係數", "系数"), 0, 10, 5),
    slider("vertical-shift", "comparison", localized("Vertical shift", "垂直平移"), 0, 10, 5)
  ]),
  "exponential-logarithmic": contract("exponential-logarithmic", [
    slider("base-index", "value", localized("Base", "底數", "底数"), 0, 2, 1),
    slider("exponent", "comparison", localized("Exponent", "指數", "指数"), 0, 10, 5)
  ]),
  "sequence-model": contract("sequence-model", [
    slider("first-term", "value", localized("First term", "首項", "首项"), 0, 3, 1),
    slider("common-step", "comparison", localized("Common difference or ratio", "公差或公比"), 0, 3, 1)
  ], [
    mode("arithmetic", 0, localized("Arithmetic", "等差數列", "等差数列")),
    mode("geometric", 1, localized("Geometric", "等比數列", "等比数列"))
  ]),
  "unit-circle-wave": contract("unit-circle-wave", [
    slider("angle", "value", localized("Angle", "角度"), 0, 10, 5),
    slider("reference-length", "comparison", localized("Reference length", "參考長度", "参考长度"), 0, 10, 5)
  ]),
  "trigonometric-identity": contract("trigonometric-identity", [
    slider("angle", "value", localized("Angle", "角度"), 0, 10, 5),
    slider("reference-length", "comparison", localized("Reference length", "參考長度", "参考长度"), 0, 10, 5)
  ]),
  "triangle-trigonometry": contract("triangle-trigonometry", [
    slider("angle", "value", localized("Angle", "角度"), 0, 10, 5),
    slider("hypotenuse", "comparison", localized("Hypotenuse", "斜邊", "斜边"), 0, 10, 5)
  ]),
  "trigonometric-synthesis": contract("trigonometric-synthesis", [
    slider("angle", "value", localized("Angle", "角度"), 0, 10, 5),
    slider("reference-length", "comparison", localized("Reference length", "參考長度", "参考长度"), 0, 10, 5)
  ]),
  "derivative-rate-area": contract("derivative-rate-area", [
    slider("x-position", "value", localized("x position", "x 位置"), 0, 10, 5),
    slider("vertical-shift", "comparison", localized("Vertical shift", "垂直平移"), 0, 10, 5)
  ]),
  "derivative-synthesis": contract("derivative-synthesis", [
    slider("x-position", "value", localized("x position", "x 位置"), 0, 10, 5),
    slider("vertical-shift", "comparison", localized("Vertical shift", "垂直平移"), 0, 10, 5)
  ]),
  "optimization-derivative": contract("optimization-derivative", [
    slider("current-width", "value", localized("Current width", "目前寬度", "当前宽度"), 0, 9, 5),
    slider("perimeter-offset", "comparison", localized("Perimeter offset", "周長增量", "周长增量"), 0, 10, 5)
  ]),
  "vector-operations": contract("vector-operations", [
    slider("u-x-index", "value", localized("Vector u x", "向量 u 的 x"), 0, 3, 1),
    slider("v-y-index", "comparison", localized("Vector v y", "向量 v 的 y"), 0, 3, 2)
  ]),
  "space-vector-plane": contract("space-vector-plane", [
    slider("normal-z-index", "value", localized("Normal z", "法向量 z"), 0, 2, 1),
    slider("point-x-index", "comparison", localized("Point x", "點 x", "点 x"), 0, 2, 1)
  ]),
  "conic-sections": contract("conic-sections", [
    slider("parameter-a", "value", localized("Parameter a", "參數 a", "参数 a"), 0, 10, 5),
    slider("parameter-b", "comparison", localized("Parameter b", "參數 b", "参数 b"), 0, 10, 5)
  ], [
    mode("ellipse", 0, localized("Ellipse", "橢圓", "椭圆")),
    mode("parabola", 1, localized("Parabola", "拋物線", "抛物线")),
    mode("hyperbola", 2, localized("Hyperbola", "雙曲線", "双曲线"))
  ]),
  "geometric-modeling": contract("geometric-modeling", [
    slider("width", "value", localized("Width", "寬", "宽"), 0, 10, 5),
    slider("height", "comparison", localized("Height", "高"), 0, 10, 5)
  ], [
    mode("scale-1", 0, localized("Scale ×1", "比例 ×1")),
    mode("scale-1-25", 1, localized("Scale ×1.25", "比例 ×1.25")),
    mode("scale-1-5", 2, localized("Scale ×1.5", "比例 ×1.5"))
  ]),
  "advanced-strategy": contract("advanced-strategy", [
    slider("strategy-value", "value", localized("Strategy value", "策略數值", "策略数值"), 0, 2, 1),
    slider("strategy-comparison", "comparison", localized("Strategy comparison", "策略比較值", "策略比较值"), 0, 2, 1)
  ], [
    mode("vector-strategy", 0, localized("Vector strategy", "向量策略")),
    mode("conic-strategy", 1, localized("Conic strategy", "圓錐曲線策略", "圆锥曲线策略")),
    mode("space-strategy", 2, localized("Space strategy", "空間策略", "空间策略"))
  ]),
  "bivariate-regression": contract("bivariate-regression", [
    slider("vertical-lift", "value", localized("Vertical lift", "垂直提升"), 0, 10, 5),
    slider("spread", "comparison", localized("Spread", "離散程度", "离散程度"), 0, 10, 5)
  ]),
  "statistics-distribution": contract("statistics-distribution", [
    slider("center", "value", localized("Center", "中心"), 0, 10, 5),
    slider("scale", "comparison", localized("Scale", "尺度"), 0, 10, 5)
  ], [
    mode("observation-1", 0, localized("Observation 1", "觀測值 1", "观测值 1")),
    mode("observation-2", 1, localized("Observation 2", "觀測值 2", "观测值 2")),
    mode("observation-3", 2, localized("Observation 3", "觀測值 3", "观测值 3")),
    mode("observation-4", 3, localized("Observation 4", "觀測值 4", "观测值 4")),
    mode("observation-5", 4, localized("Observation 5", "觀測值 5", "观测值 5"))
  ]),
  "composite-split": contract("composite-split", [], [], {
    kind: "dynamic-strands",
    label: localized("External strand plan required", "需要外部單元計劃", "需要外部单元计划"),
    required: true
  }),
  "catalog-scope": contract("catalog-scope", [], [], {
    kind: "catalog-scope",
    label: localized("External catalog decision required", "需要外部目錄決策", "需要外部目录决策"),
    required: true
  })
} as const satisfies Readonly<
  Record<
    ConfiguredVisualizationSemanticControlFamily,
    ConfiguredVisualizationSemanticControlContract
  >
>;

export const configuredVisualizationSemanticControlFamilies = Object.freeze(
  Object.keys(configuredVisualizationSemanticControlContracts) as ConfiguredVisualizationSemanticControlFamily[]
);

function snapProjectedControlValue(
  value: number,
  minimum: number,
  maximum: number,
  step: number
) {
  const finiteValue = Number.isFinite(value) ? value : minimum;
  const clamped = Math.min(maximum, Math.max(minimum, finiteValue));
  const snapped = minimum + Math.round((clamped - minimum) / step) * step;
  const decimalPlaces = Math.min(8, (String(step).split(".")[1] ?? "").length);
  return Number(Math.min(maximum, Math.max(minimum, snapped)).toFixed(decimalPlaces));
}

/**
 * Project a requested control vector into the exact reachable learner domain.
 * Only the versioned stateDomain declarations above may alter bounds/values;
 * every other family is strict identity and any observed clamp is a QA error.
 */
export function projectConfiguredVisualizationSemanticControlState(
  contract: ConfiguredVisualizationSemanticControlContract,
  requested: Partial<Record<ConfiguredVisualizationSemanticSliderInput, number>>,
  activeMode: number
): ConfiguredVisualizationSemanticProjectedControlState {
  const bounds: ConfiguredVisualizationSemanticProjectedControlState["bounds"] = {};
  const values: ConfiguredVisualizationSemanticProjectedControlState["values"] = {};
  for (const control of contract.sliders) {
    bounds[control.id] = {
      disabled: Boolean(control.disabled),
      max: control.max,
      min: control.min
    };
    values[control.id] = snapProjectedControlValue(
      requested[control.id] ?? control.initial,
      control.min,
      control.max,
      control.step
    );
  }

  const updateAffectedMaximum = (
    id: ConfiguredVisualizationSemanticSliderInput,
    requestedMaximum: number
  ) => {
    const control = contract.sliders.find((candidate) => candidate.id === id);
    if (!control) throw new TypeError(`${contract.family}: state domain references missing ${id} control.`);
    const maximum = snapProjectedControlValue(requestedMaximum, control.min, control.max, control.step);
    bounds[id] = {
      disabled: maximum <= control.min,
      max: maximum,
      min: control.min
    };
    values[id] = snapProjectedControlValue(
      requested[id] ?? control.initial,
      control.min,
      maximum,
      control.step
    );
  };

  switch (contract.stateDomain.id) {
    case "directed-small-whole-number-line-step": {
      const start = values.value ?? 0;
      updateAffectedMaximum("comparison", activeMode % 2 === 0 ? 20 - start : start);
      break;
    }
    case "directed-large-whole-number-line-step": {
      const startTick = values.value ?? 0;
      updateAffectedMaximum("comparison", activeMode % 2 === 0 ? 10 - startTick : startTick);
      break;
    }
    case "directed-signed-number-line-step": {
      const start = values.value ?? 0;
      updateAffectedMaximum("comparison", activeMode % 2 === 0 ? 10 - start : start + 10);
      break;
    }
    case "directed-decimal-number-line-step": {
      const start = values.value ?? 0;
      updateAffectedMaximum("comparison", Math.min(0.5, activeMode % 2 === 0 ? 2 - start : start));
      break;
    }
    case "fraction-bar-numerator-v1": {
      const denominator = (values.value ?? 1) + 1;
      updateAffectedMaximum("comparison", denominator);
      break;
    }
    case "proper-fraction-numerator": {
      const denominator = values.comparison ?? 2;
      updateAffectedMaximum("value", denominator - 1);
      break;
    }
    case "part-within-whole": {
      const whole = values.comparison ?? 1;
      updateAffectedMaximum("value", whole);
      break;
    }
    case "independent-controls":
      break;
    default: {
      const exhaustive: never = contract.stateDomain;
      throw new TypeError(`Unsupported control state domain: ${JSON.stringify(exhaustive)}`);
    }
  }

  return { bounds, domain: contract.stateDomain, values };
}

export function configuredVisualizationSemanticControlExecutionOrder(
  contract: ConfiguredVisualizationSemanticControlContract
): ConfiguredVisualizationSemanticSliderInput[] {
  const sliderIds = contract.sliders.map(({ id }) => id);
  const controllerInputs = contract.stateDomain.controllerInputs as readonly (
    ConfiguredVisualizationSemanticSliderInput | "mode"
  )[];
  const controllerIds = controllerInputs.filter(
    (input): input is ConfiguredVisualizationSemanticSliderInput => input !== "mode"
  );
  return [
    ...controllerIds,
    ...sliderIds.filter((id) => !controllerIds.includes(id))
  ];
}

export function configuredVisualizationSemanticCanonicalEndpointVectors(
  contract: ConfiguredVisualizationSemanticControlContract,
  activeMode: number
) {
  const order = configuredVisualizationSemanticControlExecutionOrder(contract);
  const initial = Object.fromEntries(
    contract.sliders.map(({ id, initial: value }) => [id, value])
  ) as Partial<Record<ConfiguredVisualizationSemanticSliderInput, number>>;
  const results: Array<Partial<Record<ConfiguredVisualizationSemanticSliderInput, number>>> = [];
  const seen = new Set<string>();

  const visit = (
    position: number,
    requested: Partial<Record<ConfiguredVisualizationSemanticSliderInput, number>>
  ) => {
    const projected = projectConfiguredVisualizationSemanticControlState(contract, requested, activeMode);
    if (position >= order.length) {
      const canonical = Object.fromEntries(
        contract.sliders.map(({ id }) => [id, projected.values[id]])
      ) as Partial<Record<ConfiguredVisualizationSemanticSliderInput, number>>;
      const key = JSON.stringify(contract.sliders.map(({ id }) => [id, canonical[id]]));
      if (!seen.has(key)) {
        seen.add(key);
        results.push(canonical);
      }
      return;
    }

    const id = order[position];
    const bounds = projected.bounds[id];
    if (!bounds) throw new TypeError(`${contract.family}: missing projected bounds for ${id}.`);
    const endpoints = [...new Set([bounds.min, bounds.max])];
    for (const endpoint of endpoints) {
      visit(position + 1, { ...projected.values, [id]: endpoint });
    }
  };

  visit(0, initial);
  return results;
}

/**
 * Dynamic domains need the controller-specific midpoint as well as both
 * endpoints. This reaches states such as d=10,n=5 without expanding every
 * independent five-slider model to a 3^n Cartesian matrix.
 */
export function configuredVisualizationSemanticCanonicalDynamicStateVectors(
  contract: ConfiguredVisualizationSemanticControlContract,
  activeMode: number
) {
  if (contract.stateDomain.kind === "independent") {
    return configuredVisualizationSemanticCanonicalEndpointVectors(contract, activeMode);
  }

  const order = configuredVisualizationSemanticControlExecutionOrder(contract);
  const initial = Object.fromEntries(
    contract.sliders.map(({ id, initial: value }) => [id, value])
  ) as Partial<Record<ConfiguredVisualizationSemanticSliderInput, number>>;
  const results: Array<Partial<Record<ConfiguredVisualizationSemanticSliderInput, number>>> = [];
  const seen = new Set<string>();

  const visit = (
    position: number,
    requested: Partial<Record<ConfiguredVisualizationSemanticSliderInput, number>>
  ) => {
    const projected = projectConfiguredVisualizationSemanticControlState(contract, requested, activeMode);
    if (position >= order.length) {
      const canonical = Object.fromEntries(
        contract.sliders.map(({ id }) => [id, projected.values[id]])
      ) as Partial<Record<ConfiguredVisualizationSemanticSliderInput, number>>;
      const key = JSON.stringify(contract.sliders.map(({ id }) => [id, canonical[id]]));
      if (!seen.has(key)) {
        seen.add(key);
        results.push(canonical);
      }
      return;
    }

    const id = order[position];
    const control = contract.sliders.find((candidate) => candidate.id === id);
    const bounds = projected.bounds[id];
    if (!control || !bounds) throw new TypeError(`${contract.family}: missing projected dynamic bounds for ${id}.`);
    const midpoint = snapProjectedControlValue(
      bounds.min + (bounds.max - bounds.min) / 2,
      bounds.min,
      bounds.max,
      control.step
    );
    for (const candidate of [...new Set([bounds.min, midpoint, bounds.max])]) {
      visit(position + 1, { ...projected.values, [id]: candidate });
    }
  };

  visit(0, initial);
  return results;
}

const solidProjectionNetModes = [
  mode("views", 0, localized("Linked views", "聯動視圖", "联动视图")),
  mode("net", 1, localized("Solid net", "立體展開圖", "立体展开图"))
] as const;

const commonSolidsModes = [
  mode("cube", 0, localized("Cube", "正方體", "正方体")),
  mode("cuboid", 1, localized("Cuboid", "長方體", "长方体")),
  mode("cylinder", 2, localized("Cylinder", "圓柱", "圆柱")),
  mode("cone", 3, localized("Cone", "圓錐", "圆锥")),
  mode("sphere", 4, localized("Sphere", "球", "球"))
] as const;

const commonSolidsSliders = [
  slider("solid-size", "value", localized("Solid size", "立體大小", "立体大小"), 1, 6, 3),
  slider("feature-focus", "comparison", localized("Feature focus", "特徵重點", "特征重点"), 0, 2, 0)
] as const;

const cylinderConeModes = [
  mode("cylinder", 0, localized("Cylinder", "圓柱", "圆柱")),
  mode("cone", 1, localized("Cone", "圓錐", "圆锥"))
] as const;

const radiusHeightSliders = [
  slider("radius", "value", localized("Radius", "半徑", "半径"), 1, 6, 3),
  slider("height", "comparison", localized("Height", "高", "高"), 1, 10, 5)
] as const;

const surfaceVolumeModes = [
  mode("prism", 0, localized("Square prism", "正方柱", "正方柱")),
  mode("pyramid", 1, localized("Square pyramid", "正方錐", "正方锥")),
  mode("cylinder", 2, localized("Cylinder", "圓柱", "圆柱")),
  mode("cone", 3, localized("Cone", "圓錐", "圆锥")),
  mode("sphere", 4, localized("Sphere", "球", "球"))
] as const;

const baseHeightSliders = [
  slider("base-side", "value", localized("Base side", "底面邊長", "底面边长"), 1, 6, 3),
  slider("height", "comparison", localized("Height", "高", "高"), 1, 10, 5)
] as const;

const sphereSectionSliders = [
  slider("radius", "value", localized("Radius", "半徑", "半径"), 1, 6, 3),
  slider("cross-section-level", "comparison", localized("Cross-section level", "截面位置", "截面位置"), 1, 10, 5)
] as const;

const relativePositionGridSliders = [
  slider("target-column", "value", localized("Target column", "目標欄", "目标列"), 0, 4, 3),
  slider("target-row", "comparison", localized("Target row", "目標行", "目标行"), 0, 4, 1)
] as const;

const directionDistanceRouteSliders = [
  slider("east-west-displacement", "value", localized("East / west steps", "東西步數", "东西步数"), -4, 4, 3),
  slider("north-south-displacement", "comparison", localized("North / south steps", "南北步數", "南北步数"), -4, 4, 2)
] as const;

const similarTriangleSliders = [
  slider("scale-factor", "value", localized("Scale factor", "比例因子"), 1, 3, 2, 0.25),
  slider("source-side", "comparison", localized("Source side AB", "原三角形邊 AB", "原三角形边 AB"), 2, 6, 4, 0.5)
] as const;

const quadrilateralClassificationSliders = [
  slider("shape-size", "value", localized("Shape size", "圖形大小", "图形大小"), 2, 6, 4, 0.5),
  slider("orientation", "comparison", localized("Orientation", "方向"), -3, 3, 1)
] as const;

export const configuredQuadrilateralGeometryModesByVariant = {
  "parallelogram-properties": [
    mode("parallelogram", 0, localized("Parallelogram", "平行四邊形", "平行四边形")),
    mode("rectangle", 1, localized("Rectangle", "長方形", "长方形")),
    mode("rhombus", 2, localized("Rhombus", "菱形")),
    mode("square", 3, localized("Square", "正方形"))
  ],
  "property-classification": [
    mode("trapezoid", 0, localized("Trapezoid", "梯形")),
    mode("parallelogram", 1, localized("Parallelogram", "平行四邊形", "平行四边形")),
    mode("rectangle", 2, localized("Rectangle", "長方形", "长方形")),
    mode("rhombus", 3, localized("Rhombus", "菱形")),
    mode("square", 4, localized("Square", "正方形"))
  ],
  "quadrilateral-families-composition": [
    mode("parallelogram", 0, localized("Parallelogram", "平行四邊形", "平行四边形")),
    mode("rectangle", 1, localized("Rectangle", "長方形", "长方形")),
    mode("rhombus", 2, localized("Rhombus", "菱形")),
    mode("square", 3, localized("Square", "正方形")),
    mode("composition", 4, localized("Compose two triangles", "拼組兩個三角形", "拼组两个三角形"))
  ],
  "special-parallelogram-classification": [
    mode("rectangle", 0, localized("Rectangle", "長方形", "长方形")),
    mode("rhombus", 1, localized("Rhombus", "菱形")),
    mode("square", 2, localized("Square", "正方形"))
  ],
  "triangle-quadrilateral-classification": [
    mode("triangle", 0, localized("Triangle", "三角形")),
    mode("quadrilateral", 1, localized("Quadrilateral", "四邊形", "四边形")),
    mode("parallelogram", 2, localized("Parallelogram", "平行四邊形", "平行四边形")),
    mode("rectangle", 3, localized("Rectangle", "長方形", "长方形"))
  ]
} as const;

const hongKongMultiplicationFoundationSliders = [
  slider("rows", "value", localized("Rows", "行數", "行数"), 1, 10, 4),
  slider("columns", "comparison", localized("Columns", "列數", "列数"), 1, 10, 5)
] as const;

const hongKongFractionIntroductionSliders = [
  slider("denominator-minus-one", "value", localized("Denominator d", "分母 d"), 1, 9, 5),
  slider("numerator", "comparison", localized("Numerator n", "分子 n"), 0, 10, 4)
] as const;

const hongKongFractionIntroductionModes = [
  mode("fraction", 0, localized("Fraction", "分數", "分数")),
  mode("equivalent", 1, localized("Equivalent fraction", "等值分數", "等值分数")),
  mode("compare", 2, localized("Compare the pair", "比較兩個分數", "比较两个分数"))
] as const;

const hongKongCenterSpreadSliders = [
  slider("mean", "value", localized("Mean", "平均數", "平均数"), 0, 10, 5),
  slider("spread", "comparison", localized("Spread", "離散程度", "离散程度"), 1, 4, 2)
] as const;

const hongKongCalculusSliders = [
  slider("curvature", "value", localized("Curvature", "曲率參數", "曲率参数"), 0, 10, 5),
  slider("probe-x", "comparison", localized("Probe x", "探測 x", "探测 x"), 1, 9, 4)
] as const;

const hongKongCalculusModes = [
  mode("tangent", 0, localized("Tangent", "切線", "切线")),
  mode("secant", 1, localized("Secant", "割線", "割线")),
  mode("area", 2, localized("Accumulated area", "累積面積", "累积面积"))
] as const;

const fractionAddSubtractModes = [
  mode("add", 0, localized("Add", "加法")),
  mode("subtract", 1, localized("Subtract", "減法", "减法"))
] as const;

const fractionMultiplyModes = [
  mode("multiply", 2, localized("Multiply", "乘法"))
] as const;

const fractionDivideModes = [
  mode("divide", 3, localized("Divide", "除法"))
] as const;

/**
 * Resolve the learner controls for the exact active renderer family.
 *
 * Most contracts are family-wide. Solid nets are the one audited
 * variant-specific exception: ordinary projection labs have no inert mode
 * switch, while a `solid-nets` variant may switch between linked orthographic
 * views and the net of the same solid.
 */
export function getConfiguredVisualizationSemanticControlContract(
  family: string,
  variant = "",
  activeMode = 0
): ConfiguredVisualizationSemanticControlContract | undefined {
  const base = configuredVisualizationSemanticControlContracts[
    family as ConfiguredVisualizationSemanticControlFamily
  ];

  if (base?.family === "multi-place-value" && variant === "tens-ones") {
    const exact = getConfiguredSemanticPrimaryControlContract(base.family, variant);
    return { ...base, sliders: exact.numericControls };
  }

  if (base?.family === "equal-groups-array" && variant === "p2-multiplication-foundations") {
    return { ...base, sliders: hongKongMultiplicationFoundationSliders };
  }

  if (base?.family === "fraction-equivalence" && variant === "p3-fractions-intro") {
    return {
      ...base,
      modes: hongKongFractionIntroductionModes,
      sliders: hongKongFractionIntroductionSliders,
      stateDomain: {
        affectedControlIds: ["comparison"],
        controllerInputs: ["value"],
        id: "fraction-bar-numerator-v1",
        kind: "projected",
        projection: "comparison<=value+1",
        version: 1
      }
    };
  }

  if (base?.family === "fraction-operations") {
    if (variant === "fraction-add-subtract") {
      return { ...base, modes: fractionAddSubtractModes };
    }
    if (variant === "fraction-multiply") {
      return { ...base, modes: fractionMultiplyModes };
    }
    if (variant === "fraction-divide") {
      return { ...base, modes: fractionDivideModes };
    }
  }

  if (
    base?.family === "statistics-distribution" &&
    (variant === "statistics-s1" || variant === "data-handling")
  ) {
    return { ...base, modes: [], sliders: hongKongCenterSpreadSliders };
  }

  if (
    base?.family === "derivative-rate-area" &&
    (variant === "differentiation-intro" || variant === "calculus")
  ) {
    return { ...base, modes: hongKongCalculusModes, sliders: hongKongCalculusSliders };
  }

  if (base?.family === "coordinate-position") {
    if (variant === "relative-position-grid") {
      return { ...base, sliders: relativePositionGridSliders };
    }
    if (variant === "direction-distance-route") {
      return { ...base, sliders: directionDistanceRouteSliders };
    }
  }

  if (base?.family === "triangle-geometry" && variant === "similar-triangle-ratios") {
    return { ...base, sliders: similarTriangleSliders };
  }

  if (base?.family === "quadrilateral-geometry") {
    const exactModes = configuredQuadrilateralGeometryModesByVariant[
      variant as keyof typeof configuredQuadrilateralGeometryModesByVariant
    ];
    if (exactModes) {
      return { ...base, modes: exactModes, sliders: quadrilateralClassificationSliders };
    }
  }

  if (base?.family === "solid-projection") {
    if (variant === "common-solids-classification") {
      return { ...base, modes: commonSolidsModes, sliders: commonSolidsSliders };
    }
    if (variant === "cylinder-cone-volume") {
      return { ...base, modes: cylinderConeModes, sliders: radiusHeightSliders };
    }
    if (variant === "surface-volume-solids") {
      const normalizedMode = ((Math.trunc(activeMode) % surfaceVolumeModes.length) + surfaceVolumeModes.length) % surfaceVolumeModes.length;
      return {
        ...base,
        modes: surfaceVolumeModes,
        sliders: normalizedMode < 2
          ? baseHeightSliders
          : normalizedMode < 4
            ? radiusHeightSliders
            : sphereSectionSliders
      };
    }
    if (/solid-nets/u.test(variant)) {
      return { ...base, modes: solidProjectionNetModes };
    }
  }

  if (base?.family === "advanced-strategy") {
    const childFamily = ([
      "vector-operations",
      "conic-sections",
      "space-vector-plane"
    ] as const)[Math.abs(Math.trunc(activeMode)) % 3];
    return {
      ...base,
      sliders: configuredVisualizationSemanticControlContracts[childFamily].sliders
    };
  }

  return base;
}
