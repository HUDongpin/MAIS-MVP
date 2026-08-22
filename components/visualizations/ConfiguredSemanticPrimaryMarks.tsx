import React, { type ReactNode } from "react";
import type { VisualizationTheme } from "./visualizationTheme";

/**
 * Curriculum-correct primary/middle-school marks for configured labs.
 *
 * This module is deliberately independent from the catalog resolver.  A caller
 * supplies the already-resolved semantic family and the existing two control
 * values.  Every builder is pure, and every rendered family exposes the exact
 * state that generated its marks for browser QA.
 */

export const CONFIGURED_SEMANTIC_PRIMARY_MARKS_SOURCE = {
  auditScope: "335 Mainland China curriculum-owned Visualization Labs",
  frozenAuditSha256: "eabf3d1cc09bebc4cf81fe040152c92def6e031b106def1b82088e223554a3ea",
  version: "a18-primary-marks-v2"
} as const;

export const configuredSemanticPrimaryFamilies = [
  "small-whole-number-line",
  "large-whole-number-line",
  "signed-real-number-line",
  "decimal-number-line",
  "multi-place-value",
  "decimal-place-value",
  "equal-groups-array",
  "division-remainder-array",
  "factor-array",
  "decimal-product-area",
  "volume-layers",
  "area-perimeter",
  "polygon-area",
  "fraction-equivalence",
  "fraction-operations",
  "ratio-proportion",
  "percent-model",
  "proportional-function",
  "clock-time",
  "calendar-model",
  "money-model",
  "attribute-comparison",
  "measurement-model",
  "measurement-estimation",
  "mass-unit-conversion",
  "primary-bar-chart",
  "categorical-data",
  "raw-data-summary",
  "line-chart",
  "seeded-probability-experiment",
  "random-variable-distribution",
  "combinatorics"
] as const;

export type ConfiguredSemanticPrimaryFamily = (typeof configuredSemanticPrimaryFamilies)[number];

export type SemanticPrimaryBuildInput = {
  comparison: number;
  height?: number;
  mode: number;
  value: number;
  variant: string;
};

type SemanticStateBase = {
  family: ConfiguredSemanticPrimaryFamily;
  formula: string;
  variant: string;
};

export type NumberLineState = SemanticStateBase & {
  kind: "number-line";
  domainMax: number;
  domainMin: number;
  end: number;
  start: number;
  step: number;
  tickValues: number[];
};

export type PlaceValueState = SemanticStateBase & {
  kind: "place-value";
  comparisonDigits: Array<{ digit: number; label: string; place: number; contribution: number }>;
  comparisonRelation: "<" | "=" | ">";
  comparisonTotal: number;
  digits: Array<{ digit: number; label: string; place: number; contribution: number }>;
  scale: number;
  total: number;
};

export type ArrayState = SemanticStateBase & {
  kind: "array";
  columns: number;
  dividend?: number;
  factorPairs?: Array<[number, number]>;
  product: number;
  quotient?: number;
  remainder?: number;
  rows: number;
  scale: number;
};

export type VolumeState = SemanticStateBase & {
  kind: "volume";
  displayMode: "layers" | "solid";
  height: number;
  heightSource: "derived-from-visible-dimensions" | "explicit-visible-control";
  length: number;
  volume: number;
  width: number;
};

export type AreaState = SemanticStateBase & {
  kind: "area";
  area: number;
  base: number;
  height: number;
  perimeter?: number;
  shape: "parallelogram" | "rectangle" | "triangle" | "trapezoid";
  topBase?: number;
  width?: number;
};

export type FractionState = SemanticStateBase & {
  displayMode?: "compare" | "equivalent" | "fraction";
  kind: "fraction";
  denominator: number;
  multiplier?: number;
  numerator: number;
  operation?: "+" | "−" | "×" | "÷";
  otherDenominator?: number;
  otherNumerator?: number;
  resultDenominator: number;
  resultNumerator: number;
};

export type RatioState = SemanticStateBase & {
  kind: "ratio";
  a: number;
  b: number;
  factor: number;
  scaledA: number;
  scaledB: number;
};

export type PercentState = SemanticStateBase & {
  kind: "percent";
  decimal: number;
  part: number;
  percent: number;
  whole: number;
};

export type ProportionalState = SemanticStateBase & {
  kind: "proportional";
  constant: number;
  points: Array<{ x: number; y: number }>;
  proportion: "direct" | "inverse";
  x: number;
  y: number;
};

export type ClockState = SemanticStateBase & {
  kind: "clock";
  hour: number;
  hourAngle: number;
  minute: number;
  minuteAngle: number;
};

export type CalendarState = SemanticStateBase & {
  kind: "calendar";
  day: number;
  elapsedDays: number;
  endDay: number;
  endMonth: number;
  endYear: number;
  month: number;
  monthLength: number;
};

export type MoneyState = SemanticStateBase & {
  kind: "money";
  amountCents: number;
  denominations: Array<{ cents: number; count: number }>;
  denominationTotal: number;
};

export type MeasurementState = SemanticStateBase & {
  kind: "measurement";
  displayUnit?: "cm" | "dm" | "mm";
  error?: number;
  estimate?: number;
  measured?: number;
  physicalLengthMm?: number;
  unitCount?: number;
  unitSizeMm?: number;
};

export type AttributeComparisonState = SemanticStateBase & {
  attribute: "quantity" | "length" | "height" | "mass";
  difference: number;
  first: number;
  kind: "attribute-comparison";
  relation: "<" | "=" | ">";
  second: number;
};

export type MassState = SemanticStateBase & {
  kind: "mass";
  displayUnit: "g" | "kg" | "t";
  grams: number;
  kilograms: number;
  tonnes: number;
};

export type DataState = SemanticStateBase & {
  kind: "data";
  categories?: Array<{ label: string; value: number }>;
  mean: number;
  median?: number;
  points: Array<{ x: number; y: number }>;
  range: number;
  sample: number[];
  total: number;
};

export type SeededProbabilityState = SemanticStateBase & {
  kind: "seeded-probability";
  displayMode: "experiment" | "theory";
  failures: number;
  probability: number;
  seed: number;
  sequence: number[];
  successes: number;
  trials: number;
};

export type RandomVariableState = SemanticStateBase & {
  kind: "random-variable";
  expectedValue: number;
  outcomes: Array<{ probability: number; value: number }>;
  probabilitySum: number;
  successProbability: number;
  trials: number;
  variance: number;
};

export type CombinatoricsState = SemanticStateBase & {
  kind: "combinatorics";
  combinations: number;
  n: number;
  permutations: number;
  r: number;
};

export type ConfiguredSemanticPrimaryState =
  | NumberLineState
  | PlaceValueState
  | ArrayState
  | VolumeState
  | AreaState
  | FractionState
  | RatioState
  | PercentState
  | ProportionalState
  | ClockState
  | CalendarState
  | MoneyState
  | AttributeComparisonState
  | MeasurementState
  | MassState
  | DataState
  | SeededProbabilityState
  | RandomVariableState
  | CombinatoricsState;

export type ConfiguredSemanticPrimaryInvariant = {
  holds: boolean;
  id: string;
  ids: readonly string[];
  left: number;
  right: number;
};

export type SemanticPrimaryLocalizedStrings = Partial<{
  count: string;
  cubes: string;
  days: string;
  error: string;
  estimate: string;
  expectedValue: string;
  failures: string;
  formula: string;
  layers: string;
  measured: string;
  mean: string;
  median: string;
  hundredths: string;
  ones: string;
  range: string;
  remainder: string;
  successes: string;
  tenths: string;
  total: string;
  trials: string;
  uniqueOutcomes: string;
}>;

export type ConfiguredSemanticPrimaryMarksProps = {
  accent: string;
  comparison: number;
  family: string;
  height?: number;
  localizedStrings?: SemanticPrimaryLocalizedStrings;
  mode: number;
  value: number;
  variant: string;
  vizTheme: VisualizationTheme;
};

export const configuredSemanticPrimaryLayout = {
  contentBottom: 282,
  contentLeft: 64,
  contentRight: 576,
  contentTop: 108,
  formulaY: 310
} as const;

export type SemanticPrimaryControlText = { en: string; zh: string; zhHans: string };

export type SemanticPrimaryNumericControlContract = {
  id: "comparison" | "height" | "value";
  initial: number;
  label: SemanticPrimaryControlText;
  max: number;
  min: number;
  role: string;
  step: number;
};

export type SemanticPrimaryModeContract = {
  id: string;
  label: SemanticPrimaryControlText;
};

export type SemanticPrimaryControlContract = {
  modes: readonly SemanticPrimaryModeContract[];
  numericControls: readonly [SemanticPrimaryNumericControlContract, SemanticPrimaryNumericControlContract, ...SemanticPrimaryNumericControlContract[]];
};

function controlText(en: string, zh: string, zhHans = zh): SemanticPrimaryControlText {
  return { en, zh, zhHans };
}

function numericControl(
  id: SemanticPrimaryNumericControlContract["id"],
  role: string,
  en: string,
  zh: string,
  min: number,
  max: number,
  initial: number,
  step: number
): SemanticPrimaryNumericControlContract {
  return { id, role, label: controlText(en, zh), min, max, initial, step };
}

function modeContract(id: string, en: string, zh: string): SemanticPrimaryModeContract {
  return { id, label: controlText(en, zh) };
}

const noModes = [] as const;

/**
 * Executable control contract for every Primary semantic family.  `id` maps to
 * the actual builder input while `role` records the learner-visible meaning.
 * A mode is listed only when it changes visible mathematics/representation.
 */
export const configuredSemanticPrimaryControlContracts = {
  "small-whole-number-line": { numericControls: [numericControl("value", "start", "Start", "起始數", 0, 20, 8, 1), numericControl("comparison", "jump-magnitude", "Jump size", "跳躍大小", 0, 10, 4, 1)], modes: [modeContract("add", "Add", "向右加"), modeContract("subtract", "Subtract", "向左減")] },
  "large-whole-number-line": { numericControls: [numericControl("value", "start-tenth-index", "Start position (tenths)", "起點（十分位格）", 0, 10, 3, 1), numericControl("comparison", "jump-tenth-count", "Jump (tenths)", "跳躍格數", 0, 10, 2, 1)], modes: [modeContract("add", "Add", "向右加"), modeContract("subtract", "Subtract", "向左減")] },
  "signed-real-number-line": { numericControls: [numericControl("value", "signed-start", "Signed start", "有符號起點", -10, 10, -3, 1), numericControl("comparison", "jump-magnitude", "Jump size", "跳躍大小", 0, 10, 4, 1)], modes: [modeContract("add", "Add", "向右加"), modeContract("subtract", "Subtract", "向左減")] },
  "decimal-number-line": { numericControls: [numericControl("value", "decimal-start", "Decimal start", "小數起點", 0, 2, 0.62, 0.01), numericControl("comparison", "decimal-jump", "Jump size", "跳躍大小", 0, 0.5, 0.08, 0.01)], modes: [modeContract("add", "Add", "向右加"), modeContract("subtract", "Subtract", "向左減")] },
  "multi-place-value": { numericControls: [numericControl("value", "number-a", "Number A", "數 A", 0, 99999, 12345, 1), numericControl("comparison", "number-b", "Number B", "數 B", 0, 99999, 12054, 1)], modes: noModes },
  "decimal-place-value": { numericControls: [numericControl("value", "decimal-a", "Decimal A", "小數 A", 0, 9.99, 3.48, 0.01), numericControl("comparison", "decimal-b", "Decimal B", "小數 B", 0, 9.99, 3.84, 0.01)], modes: noModes },
  "equal-groups-array": { numericControls: [numericControl("value", "rows", "Rows", "行數", 1, 10, 4, 1), numericControl("comparison", "columns", "Columns", "列數", 1, 10, 5, 1)], modes: noModes },
  "division-remainder-array": { numericControls: [numericControl("value", "dividend", "Dividend", "被除數", 0, 99, 23, 1), numericControl("comparison", "divisor", "Divisor", "除數", 1, 10, 4, 1)], modes: noModes },
  "factor-array": { numericControls: [numericControl("value", "factor-a", "Factor A", "因數 A", 1, 10, 6, 1), numericControl("comparison", "factor-b", "Factor B", "因數 B", 1, 10, 4, 1)], modes: noModes },
  "decimal-product-area": { numericControls: [numericControl("value", "tenths-factor-a", "Tenths factor A", "十分位因數 A", 1, 10, 6, 1), numericControl("comparison", "tenths-factor-b", "Tenths factor B", "十分位因數 B", 1, 10, 4, 1)], modes: noModes },
  "volume-layers": { numericControls: [numericControl("value", "length", "Length", "長", 1, 10, 4, 1), numericControl("comparison", "width", "Width", "寬", 1, 10, 3, 1), numericControl("height", "height", "Height", "高", 1, 10, 2, 1)], modes: [modeContract("layers", "Separated layers", "分層"), modeContract("solid", "Assembled solid", "組成立體")] },
  "area-perimeter": { numericControls: [numericControl("value", "width", "Width", "寬", 1, 10, 6, 1), numericControl("comparison", "height", "Height", "高", 1, 8, 4, 1)], modes: noModes },
  "polygon-area": { numericControls: [numericControl("value", "base", "Base", "底", 2, 10, 6, 1), numericControl("comparison", "height", "Height", "高", 1, 8, 4, 1)], modes: [modeContract("parallelogram", "Parallelogram", "平行四邊形"), modeContract("triangle", "Triangle", "三角形"), modeContract("trapezoid", "Trapezoid", "梯形")] },
  "fraction-equivalence": { numericControls: [numericControl("value", "numerator", "Numerator", "分子", 1, 11, 4, 1), numericControl("comparison", "denominator", "Denominator", "分母", 2, 12, 6, 1)], modes: noModes },
  "fraction-operations": { numericControls: [numericControl("value", "operand-a-tenths", "Operand A (tenths)", "運算數 A（十分數）", 1, 9, 3, 1), numericControl("comparison", "operand-b-tenths", "Operand B (tenths)", "運算數 B（十分數）", 1, 9, 2, 1)], modes: [modeContract("add", "Add", "加"), modeContract("subtract", "Subtract", "減"), modeContract("multiply", "Multiply", "乘"), modeContract("divide", "Divide", "除")] },
  "ratio-proportion": { numericControls: [numericControl("value", "ratio-a", "Ratio A", "比的前項", 1, 12, 3, 1), numericControl("comparison", "ratio-b", "Ratio B", "比的後項", 1, 12, 4, 1)], modes: noModes },
  "percent-model": { numericControls: [numericControl("value", "part", "Part", "部分量", 0, 100, 30, 1), numericControl("comparison", "whole", "Whole", "整體量", 1, 100, 100, 1)], modes: noModes },
  "proportional-function": { numericControls: [numericControl("value", "x", "x value", "x 值", 1, 8, 3, 1), numericControl("comparison", "constant", "Constant k", "常數 k", 1, 8, 2, 1)], modes: [modeContract("direct", "Direct proportion", "正比例"), modeContract("inverse", "Inverse proportion", "反比例")] },
  "clock-time": { numericControls: [numericControl("value", "hour", "Hour", "小時", 0, 23, 3, 1), numericControl("comparison", "minute", "Minute", "分鐘", 0, 59, 30, 1)], modes: noModes },
  "calendar-model": { numericControls: [numericControl("value", "month", "Start month", "起始月份", 1, 12, 2, 1), numericControl("comparison", "elapsed-days", "Elapsed days", "經過日數", 1, 31, 14, 1)], modes: noModes },
  "money-model": { numericControls: [numericControl("value", "whole-yuan", "Whole yuan", "整元", 0, 99, 23, 1), numericControl("comparison", "remaining-cents", "Remaining cents", "餘下分", 0, 99, 45, 1)], modes: noModes },
  "attribute-comparison": { numericControls: [numericControl("value", "attribute-a", "Value A", "數值 A", 0, 10, 7, 1), numericControl("comparison", "attribute-b", "Value B", "數值 B", 0, 10, 4, 1)], modes: [modeContract("quantity", "Quantity", "數量"), modeContract("length", "Length", "長度"), modeContract("height", "Height", "高度"), modeContract("mass", "Mass", "質量")] },
  "measurement-model": { numericControls: [numericControl("value", "whole-centimetres", "Whole centimetres", "整厘米", 0, 12, 7, 1), numericControl("comparison", "remaining-millimetres", "Remaining millimetres", "餘下毫米", 0, 9, 4, 1)], modes: [modeContract("millimetres", "Millimetres", "毫米"), modeContract("centimetres", "Centimetres", "厘米"), modeContract("decimetres", "Decimetres", "分米")] },
  "measurement-estimation": { numericControls: [numericControl("value", "estimate", "Estimate", "估計值", 0, 10, 5, 0.1), numericControl("comparison", "measured", "Measured value", "實測值", 0, 10, 4.5, 0.1)], modes: noModes },
  "mass-unit-conversion": { numericControls: [numericControl("value", "whole-kilograms", "Whole kilograms", "整千克", 0, 9999, 2, 1), numericControl("comparison", "remaining-grams", "Remaining grams", "餘下克", 0, 999, 500, 1)], modes: [modeContract("grams", "Grams", "克"), modeContract("kilograms", "Kilograms", "千克"), modeContract("tonnes", "Tonnes", "噸")] },
  "primary-bar-chart": { numericControls: [numericControl("value", "sample-centre", "Sample centre", "樣本中心", 0, 10, 5, 1), numericControl("comparison", "comparison-count", "Comparison count", "比較數量", 0, 10, 7, 1)], modes: noModes },
  "categorical-data": { numericControls: [numericControl("value", "category-a-count", "Category A count", "A 類數量", 0, 10, 7, 1), numericControl("comparison", "category-b-count", "Category B count", "B 類數量", 0, 10, 4, 1)], modes: noModes },
  "raw-data-summary": { numericControls: [numericControl("value", "sample-centre", "Sample centre", "樣本中心", 0, 10, 5, 1), numericControl("comparison", "comparison-observation", "Comparison observation", "比較觀察值", 0, 10, 7, 1)], modes: noModes },
  "line-chart": { numericControls: [numericControl("value", "first-value", "First value", "首個數值", 0, 10, 3, 1), numericControl("comparison", "last-value", "Last value", "末個數值", 0, 10, 8, 1)], modes: [modeContract("rising", "Rising middle trend", "中段上升"), modeContract("falling", "Falling middle trend", "中段下降")] },
  "seeded-probability-experiment": { numericControls: [numericControl("value", "trials", "Trials", "試驗次數", 1, 24, 12, 1), numericControl("comparison", "success-probability", "Success probability", "成功概率", 0.1, 0.9, 0.5, 0.1)], modes: [modeContract("experiment", "Experiment", "試驗結果"), modeContract("theory", "Theory", "理論概率")] },
  "random-variable-distribution": { numericControls: [numericControl("value", "success-probability", "Success probability", "成功概率", 0.1, 0.9, 0.5, 0.1), numericControl("comparison", "binomial-trials", "Binomial trials n", "二項試驗次數 n", 1, 8, 4, 1)], modes: noModes },
  combinatorics: { numericControls: [numericControl("value", "available-items", "Available items n", "可選項目 n", 2, 8, 5, 1), numericControl("comparison", "chosen-items", "Chosen items r", "選取項目 r", 1, 8, 3, 1)], modes: noModes }
} as const satisfies Record<ConfiguredSemanticPrimaryFamily, SemanticPrimaryControlContract>;

const tensAndOnesPrimaryControlContract = {
  numericControls: [
    numericControl("value", "number-a", "Number A", "數 A", 0, 99, 42, 1),
    numericControl("comparison", "number-b", "Number B", "數 B", 0, 99, 37, 1)
  ],
  modes: noModes
} as const satisfies SemanticPrimaryControlContract;

/**
 * Resolve exact Primary controls when a topic narrows a broad family.  The
 * family registry remains the ordinary five-place contract; a within-100 lab
 * opts into the two-place contract without changing other place-value labs.
 */
export function getConfiguredSemanticPrimaryControlContract(
  family: ConfiguredSemanticPrimaryFamily,
  variant = ""
): SemanticPrimaryControlContract {
  if (family === "multi-place-value" && variant === "tens-ones") {
    return tensAndOnesPrimaryControlContract;
  }
  return configuredSemanticPrimaryControlContracts[family];
}

export const configuredSemanticPrimaryControlRequirements = Object.fromEntries(
  configuredSemanticPrimaryFamilies.map((family) => {
    const contract = configuredSemanticPrimaryControlContracts[family];
    return [family, {
      additionalNumericControls: contract.numericControls.slice(2).map(({ id }) => id),
      modeCount: contract.modes.length,
      note: contract.modes.length > 0
        ? "Every exposed mode changes visible mathematics or representation."
        : "No mode control is required for this family."
    }];
  })
) as Record<ConfiguredSemanticPrimaryFamily, { additionalNumericControls: string[]; modeCount: number; note: string }>;

const defaultStrings: Required<SemanticPrimaryLocalizedStrings> = {
  count: "count",
  cubes: "cubes",
  days: "days",
  error: "error",
  estimate: "estimate",
  expectedValue: "E(X)",
  failures: "failures",
  formula: "formula",
  layers: "layers",
  measured: "measured",
  mean: "mean",
  median: "median",
  hundredths: "hundredths",
  ones: "ones",
  range: "range",
  remainder: "remainder",
  successes: "successes",
  tenths: "tenths",
  total: "Total",
  trials: "trials",
  uniqueOutcomes: "unique outcomes"
};

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function integer(value: number, minimum: number, maximum: number) {
  return clamp(Math.round(finite(value, minimum)), minimum, maximum);
}

function rounded(value: number, places = 2) {
  const scale = 10 ** places;
  return Math.round((finite(value, 0) + Number.EPSILON) * scale) / scale;
}

function gcd(left: number, right: number) {
  let a = Math.abs(Math.trunc(left));
  let b = Math.abs(Math.trunc(right));
  while (b !== 0) [a, b] = [b, a % b];
  return a || 1;
}

function reduceFraction(numerator: number, denominator: number) {
  const safeDenominator = denominator === 0 ? 1 : denominator;
  const sign = safeDenominator < 0 ? -1 : 1;
  const divisor = gcd(numerator, safeDenominator);
  return {
    denominator: (Math.abs(safeDenominator) / divisor) * 1,
    numerator: (numerator / divisor) * sign
  };
}

function range(start: number, count: number) {
  return Array.from({ length: Math.max(0, Math.floor(count)) }, (_, index) => start + index);
}

function compactNumber(value: number, places = 2) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: places,
    minimumFractionDigits: 0,
    useGrouping: false
  }).format(value);
}

function commonState(family: ConfiguredSemanticPrimaryFamily, input: SemanticPrimaryBuildInput) {
  return { family, variant: input.variant };
}

function evenlySpacedTicks(minimum: number, maximum: number, count: number, places = 0) {
  return range(0, count).map((index) => rounded(minimum + ((maximum - minimum) * index) / (count - 1), places));
}

export function buildSmallWholeNumberLineState(input: SemanticPrimaryBuildInput): NumberLineState {
  const start = integer(input.value, 0, 20);
  const requestedStep = integer(Math.abs(input.comparison), 0, 10);
  const step = input.mode % 2 === 1 ? -Math.min(requestedStep, start) : Math.min(requestedStep, 20 - start);
  const end = start + step;
  return {
    ...commonState("small-whole-number-line", input),
    kind: "number-line",
    domainMin: 0,
    domainMax: 20,
    start,
    step,
    end,
    tickValues: evenlySpacedTicks(0, 20, 11),
    formula: `${start} ${step >= 0 ? "+" : "−"} ${Math.abs(step)} = ${end}`
  };
}

export function buildLargeWholeNumberLineState(input: SemanticPrimaryBuildInput): NumberLineState {
  const lowerVariant = input.variant.toLowerCase();
  const endpoint = lowerVariant.includes("10000") || lowerVariant.includes("ten-thousand")
    ? 10000
    : lowerVariant.includes("1000") || lowerVariant.includes("three-digit")
      ? 1000
      : lowerVariant.includes("20")
        ? 20
        : 100;
  const unit = endpoint / 10;
  const start = clamp(integer(input.value, 0, 10) * unit, 0, endpoint);
  const requestedStep = integer(Math.abs(input.comparison), 0, 10) * unit;
  const step = input.mode % 2 === 1 ? -Math.min(requestedStep, start) : Math.min(requestedStep, endpoint - start);
  return {
    ...commonState("large-whole-number-line", input),
    kind: "number-line",
    domainMin: 0,
    domainMax: endpoint,
    start,
    step,
    end: start + step,
    tickValues: evenlySpacedTicks(0, endpoint, 6),
    formula: `${start} ${step >= 0 ? "+" : "−"} ${Math.abs(step)} = ${start + step}`
  };
}

export function buildSignedRealNumberLineState(input: SemanticPrimaryBuildInput): NumberLineState {
  const start = integer(input.value, -10, 10);
  const magnitude = integer(Math.abs(input.comparison), 0, 10);
  const requestedStep = input.mode % 2 === 0 ? magnitude : -magnitude;
  const end = clamp(start + requestedStep, -10, 10);
  return {
    ...commonState("signed-real-number-line", input),
    kind: "number-line",
    domainMin: -10,
    domainMax: 10,
    start,
    step: end - start,
    end,
    tickValues: evenlySpacedTicks(-10, 10, 11),
    formula: `${start} ${(end - start) >= 0 ? "+" : "−"} ${Math.abs(end - start)} = ${end}`
  };
}

export function buildDecimalNumberLineState(input: SemanticPrimaryBuildInput): NumberLineState {
  const start = rounded(clamp(input.value, 0, 2), 2);
  const signedHundredths = (input.mode % 2 === 0 ? 1 : -1) * integer(Math.abs(input.comparison) * 100, 0, 50);
  const endHundredths = clamp(Math.round(start * 100) + signedHundredths, 0, 200);
  const end = endHundredths / 100;
  return {
    ...commonState("decimal-number-line", input),
    kind: "number-line",
    domainMin: 0,
    domainMax: 2,
    start,
    step: rounded(end - start, 2),
    end,
    tickValues: evenlySpacedTicks(0, 2, 21, 1),
    formula: `${compactNumber(start, 2)} ${(end - start) >= 0 ? "+" : "−"} ${compactNumber(Math.abs(end - start), 2)} = ${compactNumber(end, 2)}`
  };
}

export function buildMultiPlaceValueState(input: SemanticPrimaryBuildInput): PlaceValueState {
  const tensAndOnes = input.variant === "tens-ones";
  const maximum = tensAndOnes ? 99 : 99999;
  const total = integer(Math.abs(input.value), 0, maximum);
  const comparisonTotal = integer(Math.abs(input.comparison), 0, maximum);
  const places = tensAndOnes ? [10, 1] : [10000, 1000, 100, 10, 1];
  const labels = tensAndOnes ? ["10", "1"] : ["10,000", "1,000", "100", "10", "1"];
  const digitsFor = (number: number) => places.map((place, index) => {
    const digit = Math.floor(number / place) % 10;
    return { digit, label: labels[index], place, contribution: digit * place };
  });
  const digits = digitsFor(total);
  const comparisonDigits = digitsFor(comparisonTotal);
  const comparisonRelation = total < comparisonTotal ? "<" : total > comparisonTotal ? ">" : "=";
  return {
    ...commonState("multi-place-value", input),
    kind: "place-value",
    comparisonDigits,
    comparisonRelation,
    comparisonTotal,
    digits,
    scale: 1,
    total,
    formula: tensAndOnes
      ? `A=${digits[0].digit}×10+${digits[1].digit}=${total} ${comparisonRelation} B=${comparisonDigits[0].digit}×10+${comparisonDigits[1].digit}=${comparisonTotal}`
      : `A=${total} ${comparisonRelation} B=${comparisonTotal}`
  };
}

export function buildDecimalPlaceValueState(input: SemanticPrimaryBuildInput): PlaceValueState {
  const totalFromVisibleValue = clamp(rounded(Math.abs(input.value), 2), 0, 9.99);
  const comparisonFromVisibleValue = clamp(rounded(Math.abs(input.comparison), 2), 0, 9.99);
  const scaledTotal = Math.round(totalFromVisibleValue * 100);
  const scaledComparisonTotal = Math.round(comparisonFromVisibleValue * 100);
  const total = scaledTotal / 100;
  const comparisonTotal = scaledComparisonTotal / 100;
  const digitsFor = (scaledNumber: number) => {
    const ones = Math.floor(scaledNumber / 100) % 10;
    const tenths = Math.floor(scaledNumber / 10) % 10;
    const hundredths = scaledNumber % 10;
    return [
      { digit: ones, label: "ones", place: 1, contribution: ones },
      { digit: tenths, label: "tenths", place: 0.1, contribution: tenths / 10 },
      { digit: hundredths, label: "hundredths", place: 0.01, contribution: hundredths / 100 }
    ];
  };
  const digits = digitsFor(scaledTotal);
  const comparisonDigits = digitsFor(scaledComparisonTotal);
  const comparisonRelation = total < comparisonTotal ? "<" : total > comparisonTotal ? ">" : "=";
  return {
    ...commonState("decimal-place-value", input),
    kind: "place-value",
    comparisonDigits,
    comparisonRelation,
    comparisonTotal,
    digits,
    scale: 100,
    total,
    formula: `A=${compactNumber(total, 2)} ${comparisonRelation} B=${compactNumber(comparisonTotal, 2)}`
  };
}

export function buildEqualGroupsArrayState(input: SemanticPrimaryBuildInput): ArrayState {
  const rows = integer(input.value, 1, 10);
  const columns = integer(input.comparison, 1, 10);
  return {
    ...commonState("equal-groups-array", input),
    kind: "array",
    rows,
    columns,
    product: rows * columns,
    scale: 1,
    formula: `${rows} × ${columns} = ${rows * columns}`
  };
}

export function buildDivisionRemainderArrayState(input: SemanticPrimaryBuildInput): ArrayState {
  const dividend = integer(input.value, 0, 99);
  const columns = integer(input.comparison, 1, 10);
  const quotient = Math.floor(dividend / columns);
  const remainder = dividend % columns;
  return {
    ...commonState("division-remainder-array", input),
    kind: "array",
    rows: quotient,
    columns,
    dividend,
    quotient,
    remainder,
    product: quotient * columns,
    scale: 1,
    formula: `${dividend} = ${quotient} × ${columns} + ${remainder}`
  };
}

export function buildFactorArrayState(input: SemanticPrimaryBuildInput): ArrayState {
  const rows = integer(input.value, 1, 10);
  const columns = integer(input.comparison, 1, 10);
  const selected = rows * columns;
  const factorPairs: Array<[number, number]> = [];
  for (let factor = 1; factor <= Math.sqrt(selected); factor += 1) {
    if (selected % factor === 0) factorPairs.push([factor, selected / factor]);
  }
  return {
    ...commonState("factor-array", input),
    kind: "array",
    rows,
    columns,
    factorPairs,
    product: selected,
    scale: 1,
    formula: `${rows} × ${columns} = ${selected}`
  };
}

export function buildDecimalProductAreaState(input: SemanticPrimaryBuildInput): ArrayState {
  const rows = integer(input.value, 1, 10);
  const columns = integer(input.comparison, 1, 10);
  const productHundredths = rows * columns;
  return {
    ...commonState("decimal-product-area", input),
    kind: "array",
    rows,
    columns,
    product: productHundredths / 100,
    scale: 100,
    formula: `${rows}/10 × ${columns}/10 = ${compactNumber(productHundredths / 100, 2)}`
  };
}

export function buildVolumeLayersState(input: SemanticPrimaryBuildInput): VolumeState {
  const length = integer(input.value, 1, 10);
  const width = integer(input.comparison, 1, 10);
  // Until the host adds the required third visible numeric control, height is
  // an explicit deterministic function of the two visible dimensions.  Mode
  // remains available solely for representation (layers/assembled solid).
  const hasExplicitHeight = input.height !== undefined && Number.isFinite(input.height);
  const height = hasExplicitHeight ? integer(input.height ?? 1, 1, 10) : clamp(Math.abs(length - width) + 1, 1, 5);
  return {
    ...commonState("volume-layers", input),
    kind: "volume",
    displayMode: input.mode % 2 === 0 ? "layers" : "solid",
    length,
    width,
    height,
    heightSource: hasExplicitHeight ? "explicit-visible-control" : "derived-from-visible-dimensions",
    volume: length * width * height,
    formula: `${length} × ${width} × ${height} = ${length * width * height}`
  };
}

export function buildAreaPerimeterState(input: SemanticPrimaryBuildInput): AreaState {
  const width = integer(input.value, 1, 10);
  const height = integer(input.comparison, 1, 8);
  return {
    ...commonState("area-perimeter", input),
    kind: "area",
    shape: "rectangle",
    base: width,
    width,
    height,
    area: width * height,
    perimeter: 2 * (width + height),
    formula: `A=${width}×${height}=${width * height} · P=2(${width}+${height})=${2 * (width + height)}`
  };
}

export function buildPolygonAreaState(input: SemanticPrimaryBuildInput): AreaState {
  const base = integer(input.value, 2, 10);
  const height = integer(input.comparison, 1, 8);
  const shapeMode = Math.abs(Math.trunc(input.mode)) % 3;
  if (shapeMode === 0) {
    return {
      ...commonState("polygon-area", input),
      kind: "area",
      shape: "parallelogram",
      base,
      height,
      area: base * height,
      formula: `A = ${base} × ${height} = ${base * height}`
    };
  }
  if (shapeMode === 1) {
    return {
      ...commonState("polygon-area", input),
      kind: "area",
      shape: "triangle",
      base,
      height,
      area: (base * height) / 2,
      formula: `A = ${base} × ${height} ÷ 2 = ${compactNumber((base * height) / 2)}`
    };
  }
  const topBase = Math.max(1, base - 2);
  return {
    ...commonState("polygon-area", input),
    kind: "area",
    shape: "trapezoid",
    base,
    topBase,
    height,
    area: ((base + topBase) * height) / 2,
    formula: `A = (${base}+${topBase}) × ${height} ÷ 2 = ${compactNumber(((base + topBase) * height) / 2)}`
  };
}

export function buildFractionEquivalenceState(input: SemanticPrimaryBuildInput): FractionState {
  const isHongKongIntroduction = input.variant === "p3-fractions-intro";
  const denominator = isHongKongIntroduction
    ? integer(input.value, 1, 9) + 1
    : integer(input.comparison, 2, 12);
  const numerator = isHongKongIntroduction
    ? integer(input.comparison, 0, denominator)
    : integer(input.value, 1, denominator - 1);
  const multiplier = 2;
  return {
    ...commonState("fraction-equivalence", input),
    kind: "fraction",
    displayMode: isHongKongIntroduction
      ? (["fraction", "equivalent", "compare"] as const)[Math.abs(Math.trunc(input.mode)) % 3]
      : "compare",
    numerator,
    denominator,
    multiplier,
    resultNumerator: numerator * multiplier,
    resultDenominator: denominator * multiplier,
    formula: `${numerator}/${denominator} = ${numerator * multiplier}/${denominator * multiplier}`
  };
}

export function buildFractionOperationsState(input: SemanticPrimaryBuildInput): FractionState {
  const left = reduceFraction(integer(input.value, 1, 9), 10);
  const right = reduceFraction(integer(input.comparison, 1, 9), 10);
  const { numerator, denominator } = left;
  const { numerator: otherNumerator, denominator: otherDenominator } = right;
  const requestedOperationIndex = Math.abs(Math.trunc(input.mode)) % 4;
  const operationIndex = input.variant === "fraction-multiply"
    ? 2
    : input.variant === "fraction-divide"
      ? 3
      : input.variant === "fraction-add-subtract"
        ? requestedOperationIndex % 2
        : requestedOperationIndex;
  const operation = (["+", "−", "×", "÷"] as const)[operationIndex];
  let rawNumerator: number;
  let rawDenominator: number;
  if (operation === "+") {
    rawNumerator = numerator * otherDenominator + otherNumerator * denominator;
    rawDenominator = denominator * otherDenominator;
  } else if (operation === "−") {
    rawNumerator = numerator * otherDenominator - otherNumerator * denominator;
    rawDenominator = denominator * otherDenominator;
  } else if (operation === "×") {
    rawNumerator = numerator * otherNumerator;
    rawDenominator = denominator * otherDenominator;
  } else {
    rawNumerator = numerator * otherDenominator;
    rawDenominator = denominator * otherNumerator;
  }
  const result = reduceFraction(rawNumerator, rawDenominator);
  return {
    ...commonState("fraction-operations", input),
    kind: "fraction",
    numerator,
    denominator,
    otherNumerator,
    otherDenominator,
    operation,
    resultNumerator: result.numerator,
    resultDenominator: result.denominator,
    formula: `${numerator}/${denominator} ${operation} ${otherNumerator}/${otherDenominator} = ${result.numerator}/${result.denominator}`
  };
}

export function buildRatioProportionState(input: SemanticPrimaryBuildInput): RatioState {
  const a = integer(input.value, 1, 12);
  const b = integer(input.comparison, 1, 12);
  const factor = 2;
  return {
    ...commonState("ratio-proportion", input),
    kind: "ratio",
    a,
    b,
    factor,
    scaledA: a * factor,
    scaledB: b * factor,
    formula: `${a}:${b} = ${a * factor}:${b * factor} (×${factor})`
  };
}

export function buildPercentModelState(input: SemanticPrimaryBuildInput): PercentState {
  const whole = integer(input.comparison, 1, 100);
  const part = integer(input.value, 0, whole);
  const decimal = part / whole;
  const percent = decimal * 100;
  return {
    ...commonState("percent-model", input),
    kind: "percent",
    part,
    whole,
    decimal,
    percent,
    formula: `${part}/${whole} = ${compactNumber(decimal, 3)} = ${compactNumber(percent, 1)}%`
  };
}

export function buildProportionalFunctionState(input: SemanticPrimaryBuildInput): ProportionalState {
  const x = integer(input.value, 1, 8);
  const constant = integer(input.comparison, 1, 8);
  const direct = input.mode % 2 === 0;
  const points = range(1, 8).map((pointX) => ({ x: pointX, y: direct ? constant * pointX : constant / pointX }));
  const y = direct ? constant * x : constant / x;
  return {
    ...commonState("proportional-function", input),
    kind: "proportional",
    proportion: direct ? "direct" : "inverse",
    x,
    y,
    constant,
    points,
    formula: direct ? `y = ${constant}x · y/x = ${constant}` : `y = ${constant}/x · xy = ${constant}`
  };
}

export function buildClockTimeState(input: SemanticPrimaryBuildInput): ClockState {
  const hour = integer(input.value, 0, 23) % 12;
  const minute = integer(input.comparison, 0, 59);
  const minuteAngle = minute * 6;
  const hourAngle = hour * 30 + minute * 0.5;
  return {
    ...commonState("clock-time", input),
    kind: "clock",
    hour,
    minute,
    hourAngle,
    minuteAngle,
    formula: `${String(hour || 12).padStart(2, "0")}:${String(minute).padStart(2, "0")} · h=${compactNumber(hourAngle, 1)}° · m=${minuteAngle}°`
  };
}

const monthLengths = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

export function buildCalendarModelState(input: SemanticPrimaryBuildInput): CalendarState {
  const month = integer(input.value, 1, 12);
  const monthLength = monthLengths[month - 1];
  const day = 1;
  const elapsedDays = integer(input.comparison, 1, 31);
  const date = new Date(Date.UTC(2024, month - 1, day + elapsedDays));
  const endYear = date.getUTCFullYear();
  const endMonth = date.getUTCMonth() + 1;
  const endDay = date.getUTCDate();
  return {
    ...commonState("calendar-model", input),
    kind: "calendar",
    month,
    day,
    monthLength,
    elapsedDays,
    endYear,
    endMonth,
    endDay,
    formula: `${month}/${day}/2024 + ${elapsedDays}d = ${endMonth}/${endDay}/${endYear}`
  };
}

export function buildMoneyModelState(input: SemanticPrimaryBuildInput): MoneyState {
  const amountCents = integer(Math.abs(input.value) * 100 + Math.abs(input.comparison), 0, 9999);
  const coinValues = [500, 200, 100, 50, 20, 10, 5, 1];
  let remaining = amountCents;
  const denominations = coinValues.map((cents) => {
    const count = Math.floor(remaining / cents);
    remaining %= cents;
    return { cents, count };
  });
  const denominationTotal = denominations.reduce((sum, denomination) => sum + denomination.cents * denomination.count, 0);
  return {
    ...commonState("money-model", input),
    kind: "money",
    amountCents,
    denominations,
    denominationTotal,
    formula: `¥${compactNumber(amountCents / 100, 2)} = ${denominations.filter(({ count }) => count > 0).map(({ cents, count }) => `${count}×${compactNumber(cents / 100, 2)}`).join(" + ") || "0"}`
  };
}

export function buildAttributeComparisonState(input: SemanticPrimaryBuildInput): AttributeComparisonState {
  const first = integer(input.value, 0, 10);
  const second = integer(input.comparison, 0, 10);
  const relation = first < second ? "<" : first > second ? ">" : "=";
  const difference = Math.abs(first - second);
  const attribute = (["quantity", "length", "height", "mass"] as const)[Math.abs(Math.trunc(input.mode)) % 4];
  return {
    ...commonState("attribute-comparison", input),
    attribute,
    difference,
    first,
    kind: "attribute-comparison",
    relation,
    second,
    formula: `A=${first} ${relation} B=${second} · |A−B|=${difference}`
  };
}

export function buildMeasurementModelState(input: SemanticPrimaryBuildInput): MeasurementState {
  const physicalLengthMm = integer(Math.abs(input.value) * 10 + Math.abs(input.comparison), 0, 129);
  const modeIndex = Math.abs(Math.trunc(input.mode)) % 3;
  const displayUnit = (["mm", "cm", "dm"] as const)[modeIndex];
  const unitSizeMm = ([1, 10, 100] as const)[modeIndex];
  const unitCount = physicalLengthMm / unitSizeMm;
  return {
    ...commonState("measurement-model", input),
    kind: "measurement",
    displayUnit,
    unitCount,
    unitSizeMm,
    physicalLengthMm,
    formula: `${physicalLengthMm} mm = ${compactNumber(unitCount, 2)} ${displayUnit}`
  };
}

export function buildMeasurementEstimationState(input: SemanticPrimaryBuildInput): MeasurementState {
  const estimate = rounded(Math.abs(input.value), 1);
  const measured = rounded(Math.abs(input.comparison), 1);
  const error = rounded(estimate - measured, 1);
  return {
    ...commonState("measurement-estimation", input),
    kind: "measurement",
    estimate,
    measured,
    error,
    formula: `error = ${compactNumber(estimate, 1)} − ${compactNumber(measured, 1)} = ${compactNumber(error, 1)}`
  };
}

export function buildMassUnitConversionState(input: SemanticPrimaryBuildInput): MassState {
  const grams = integer(Math.abs(input.value) * 1000 + Math.abs(input.comparison), 0, 9_999_999);
  return {
    ...commonState("mass-unit-conversion", input),
    kind: "mass",
    displayUnit: (["g", "kg", "t"] as const)[Math.abs(Math.trunc(input.mode)) % 3],
    grams,
    kilograms: grams / 1000,
    tonnes: grams / 1_000_000,
    formula: `${grams} g = ${compactNumber(grams / 1000, 3)} kg = ${compactNumber(grams / 1_000_000, 6)} t`
  };
}

function sampleFromControls(input: SemanticPrimaryBuildInput) {
  const center = integer(input.value, 0, 10);
  const comparison = integer(input.comparison, 0, 10);
  return [Math.max(0, center - 2), Math.max(0, center - 1), center, comparison, comparison + 1];
}

function sortedMedian(sample: number[]) {
  const sorted = [...sample].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function dataSummary(family: DataState["family"], input: SemanticPrimaryBuildInput, sample: number[], categories?: DataState["categories"]): DataState {
  const total = sample.reduce((sum, entry) => sum + entry, 0);
  const mean = total / sample.length;
  const minimum = Math.min(...sample);
  const maximum = Math.max(...sample);
  return {
    ...commonState(family, input),
    kind: "data",
    sample,
    categories,
    points: sample.map((y, index) => ({ x: index + 1, y })),
    total,
    mean,
    median: sortedMedian(sample),
    range: maximum - minimum,
    formula: `Σ=${total} · mean=${compactNumber(mean, 2)} · range=${maximum - minimum}`
  };
}

export function buildPrimaryBarChartState(input: SemanticPrimaryBuildInput): DataState {
  const sample = sampleFromControls(input).slice(0, 4);
  const categories = sample.map((value, index) => ({ label: String.fromCharCode(65 + index), value }));
  return dataSummary("primary-bar-chart", input, sample, categories);
}

export function buildCategoricalDataState(input: SemanticPrimaryBuildInput): DataState {
  const first = integer(input.value, 0, 10);
  const second = integer(input.comparison, 0, 10);
  const sample = [first, second, Math.round((first + second) / 2)];
  const categories = ["A", "B", "C"].map((label, index) => ({ label, value: sample[index] }));
  return dataSummary("categorical-data", input, sample, categories);
}

export function buildRawDataSummaryState(input: SemanticPrimaryBuildInput): DataState {
  return dataSummary("raw-data-summary", input, sampleFromControls(input));
}

export function buildLineChartState(input: SemanticPrimaryBuildInput): DataState {
  const first = integer(input.value, 0, 10);
  const last = integer(input.comparison, 0, 10);
  const direction = input.mode % 2 === 0 ? 1 : -1;
  const sample = [first, clamp(first + direction * 2, 0, 12), clamp((first + last) / 2 + direction, 0, 12), last].map((entry) => rounded(entry, 1));
  return dataSummary("line-chart", input, sample);
}

function seededUnit(seed: number, index: number) {
  let value = (seed + Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x21f0aaad) >>> 0;
  value ^= value >>> 15;
  value = Math.imul(value, 0x735a2d97) >>> 0;
  value ^= value >>> 15;
  return (value >>> 0) / 4_294_967_296;
}

export function buildSeededProbabilityExperimentState(input: SemanticPrimaryBuildInput): SeededProbabilityState {
  const trials = integer(input.value, 1, 24);
  const probability = clamp(rounded(input.comparison, 2), 0.1, 0.9);
  const seed = integer(trials * 997 + Math.round(probability * 1000) * 37, 1, 2_147_483_647);
  const sequence = range(0, trials).map((index) => (seededUnit(seed, index) < probability ? 1 : 0));
  const successes = sequence.reduce<number>((sum, outcome) => sum + outcome, 0);
  const failures = trials - successes;
  return {
    ...commonState("seeded-probability-experiment", input),
    kind: "seeded-probability",
    displayMode: input.mode % 2 === 0 ? "experiment" : "theory",
    seed,
    trials,
    probability,
    sequence,
    successes,
    failures,
    formula: `n=${trials} · p=${compactNumber(probability, 2)} · ${successes} + ${failures} = ${trials} · f=${compactNumber(successes / trials, 2)}`
  };
}

export function buildRandomVariableDistributionState(input: SemanticPrimaryBuildInput): RandomVariableState {
  const successProbability = clamp(rounded(input.value, 2), 0.1, 0.9);
  const trials = integer(input.comparison, 1, 8);
  const complement = 1 - successProbability;
  const outcomes = range(0, trials + 1).map((value) => ({
    value,
    probability: (factorial(trials) / (factorial(value) * factorial(trials - value)))
      * successProbability ** value
      * complement ** (trials - value)
  }));
  const probabilitySum = outcomes.reduce((sum, outcome) => sum + outcome.probability, 0);
  const expectedValue = outcomes.reduce((sum, outcome) => sum + outcome.value * outcome.probability, 0);
  const variance = outcomes.reduce((sum, outcome) => sum + (outcome.value - expectedValue) ** 2 * outcome.probability, 0);
  return {
    ...commonState("random-variable-distribution", input),
    kind: "random-variable",
    successProbability,
    trials,
    outcomes,
    probabilitySum,
    expectedValue,
    variance,
    formula: `X~Bin(${trials}, ${compactNumber(successProbability, 2)}) · Σp=${compactNumber(probabilitySum, 2)} · E(X)=${compactNumber(expectedValue, 2)}`
  };
}

function factorial(value: number) {
  return range(1, value).reduce((product, factor) => product * factor, 1);
}

export function buildCombinatoricsState(input: SemanticPrimaryBuildInput): CombinatoricsState {
  const n = integer(input.value, 2, 8);
  const r = integer(input.comparison, 1, n);
  const permutations = factorial(n) / factorial(n - r);
  const combinations = permutations / factorial(r);
  return {
    ...commonState("combinatorics", input),
    kind: "combinatorics",
    n,
    r,
    permutations,
    combinations,
    formula: `P(${n},${r})=${permutations} · C(${n},${r})=${combinations}`
  };
}

export const configuredSemanticPrimaryStateBuilders = {
  "small-whole-number-line": buildSmallWholeNumberLineState,
  "large-whole-number-line": buildLargeWholeNumberLineState,
  "signed-real-number-line": buildSignedRealNumberLineState,
  "decimal-number-line": buildDecimalNumberLineState,
  "multi-place-value": buildMultiPlaceValueState,
  "decimal-place-value": buildDecimalPlaceValueState,
  "equal-groups-array": buildEqualGroupsArrayState,
  "division-remainder-array": buildDivisionRemainderArrayState,
  "factor-array": buildFactorArrayState,
  "decimal-product-area": buildDecimalProductAreaState,
  "volume-layers": buildVolumeLayersState,
  "area-perimeter": buildAreaPerimeterState,
  "polygon-area": buildPolygonAreaState,
  "fraction-equivalence": buildFractionEquivalenceState,
  "fraction-operations": buildFractionOperationsState,
  "ratio-proportion": buildRatioProportionState,
  "percent-model": buildPercentModelState,
  "proportional-function": buildProportionalFunctionState,
  "clock-time": buildClockTimeState,
  "calendar-model": buildCalendarModelState,
  "money-model": buildMoneyModelState,
  "attribute-comparison": buildAttributeComparisonState,
  "measurement-model": buildMeasurementModelState,
  "measurement-estimation": buildMeasurementEstimationState,
  "mass-unit-conversion": buildMassUnitConversionState,
  "primary-bar-chart": buildPrimaryBarChartState,
  "categorical-data": buildCategoricalDataState,
  "raw-data-summary": buildRawDataSummaryState,
  "line-chart": buildLineChartState,
  "seeded-probability-experiment": buildSeededProbabilityExperimentState,
  "random-variable-distribution": buildRandomVariableDistributionState,
  combinatorics: buildCombinatoricsState
} as const satisfies Record<ConfiguredSemanticPrimaryFamily, (input: SemanticPrimaryBuildInput) => ConfiguredSemanticPrimaryState>;

export function isConfiguredSemanticPrimaryFamily(family: string): family is ConfiguredSemanticPrimaryFamily {
  return Object.hasOwn(configuredSemanticPrimaryStateBuilders, family);
}

export function buildConfiguredSemanticPrimaryState(
  family: string,
  input: SemanticPrimaryBuildInput
): ConfiguredSemanticPrimaryState | null {
  if (!isConfiguredSemanticPrimaryFamily(family)) return null;
  return configuredSemanticPrimaryStateBuilders[family](input) as ConfiguredSemanticPrimaryState;
}

function approximatelyEqual(left: number, right: number) {
  return Math.abs(left - right) <= 1e-9;
}

function fractionOperationValue(state: FractionState) {
  if (!state.operation || state.otherNumerator === undefined || state.otherDenominator === undefined) {
    return state.numerator / state.denominator;
  }
  const left = state.numerator / state.denominator;
  const right = state.otherNumerator / state.otherDenominator;
  if (state.operation === "+") return left + right;
  if (state.operation === "−") return left - right;
  if (state.operation === "×") return left * right;
  return left / right;
}

export function configuredSemanticPrimaryInvariant(state: ConfiguredSemanticPrimaryState): ConfiguredSemanticPrimaryInvariant {
  let id: string;
  let left: number;
  let right: number;
  switch (state.kind) {
    case "number-line":
      id = "start-plus-step-equals-end";
      left = state.start + state.step;
      right = state.end;
      break;
    case "place-value":
      id = "both-place-contribution-rows-equal-both-totals";
      left = state.digits.reduce((sum, digit) => sum + digit.contribution, 0)
        + state.comparisonDigits.reduce((sum, digit) => sum + digit.contribution, 0);
      right = state.total + state.comparisonTotal;
      break;
    case "array":
      if (state.dividend !== undefined) {
        id = "dividend-equals-divisor-times-quotient-plus-remainder";
        left = (state.quotient ?? 0) * state.columns + (state.remainder ?? 0);
        right = state.dividend;
      } else {
        id = "rows-times-columns-equals-product";
        left = (state.rows * state.columns) / state.scale;
        right = state.product;
      }
      break;
    case "volume":
      id = "length-times-width-times-height-equals-volume";
      left = state.length * state.width * state.height;
      right = state.volume;
      break;
    case "area":
      id = "shown-dimensions-equal-area";
      left = state.shape === "rectangle"
        ? state.base * state.height
        : state.shape === "triangle"
          ? state.base * state.height / 2
          : (state.base + (state.topBase ?? 0)) * state.height / 2;
      right = state.area;
      break;
    case "fraction":
      id = state.multiplier ? "equivalent-fraction-cross-products" : "fraction-exact-rational";
      left = state.resultNumerator / state.resultDenominator;
      right = fractionOperationValue(state);
      break;
    case "ratio":
      id = "equivalent-ratio-cross-products";
      left = state.a * state.scaledB;
      right = state.b * state.scaledA;
      break;
    case "percent":
      id = "part-over-whole-times-one-hundred-equals-percent";
      left = (state.part / state.whole) * 100;
      right = state.percent;
      break;
    case "proportional":
      id = state.proportion === "direct" ? "y-over-x-is-constant" : "x-times-y-is-constant";
      left = state.proportion === "direct" ? state.y / state.x : state.x * state.y;
      right = state.constant;
      break;
    case "clock":
      id = "minute-angle-is-six-times-minute";
      left = state.minuteAngle;
      right = state.minute * 6;
      break;
    case "calendar": {
      id = "date-difference-equals-elapsed-days";
      const start = Date.UTC(2024, state.month - 1, state.day);
      const end = Date.UTC(state.endYear, state.endMonth - 1, state.endDay);
      left = (end - start) / 86_400_000;
      right = state.elapsedDays;
      break;
    }
    case "money":
      id = "denominations-sum-to-amount";
      left = state.denominations.reduce((sum, denomination) => sum + denomination.cents * denomination.count, 0);
      right = state.amountCents;
      break;
    case "attribute-comparison":
      id = "absolute-difference-matches-two-attributes";
      left = Math.abs(state.first - state.second);
      right = state.difference;
      break;
    case "measurement":
      if (state.error !== undefined) {
        id = "estimate-minus-measured-equals-error";
        left = (state.estimate ?? 0) - (state.measured ?? 0);
        right = state.error;
      } else {
        id = "unit-count-times-size-equals-length";
        left = (state.unitCount ?? 0) * (state.unitSizeMm ?? 0);
        right = state.physicalLengthMm ?? 0;
      }
      break;
    case "mass":
      id = "kilograms-times-one-thousand-equals-grams";
      left = state.kilograms * 1000;
      right = state.grams;
      break;
    case "data":
      id = "visible-observations-sum-to-total";
      left = state.sample.reduce((sum, observation) => sum + observation, 0);
      right = state.total;
      break;
    case "seeded-probability":
      id = "successes-plus-failures-equals-trials";
      left = state.successes + state.failures;
      right = state.trials;
      break;
    case "random-variable":
      id = "probabilities-sum-to-one";
      left = state.outcomes.reduce((sum, outcome) => sum + outcome.probability, 0);
      right = 1;
      break;
    case "combinatorics":
      id = "combinations-times-r-factorial-equals-permutations";
      left = state.combinations * factorial(state.r);
      right = state.permutations;
      break;
  }
  const ids = state.kind === "fraction"
    ? ["fraction-denominator-nonzero", id]
    : [id];
  const denominatorInvariantHolds = state.kind !== "fraction" || [
    state.denominator,
    state.otherDenominator,
    state.resultDenominator
  ].every((denominator) => denominator === undefined || denominator !== 0);
  return {
    holds: denominatorInvariantHolds && approximatelyEqual(left, right),
    id,
    ids,
    left,
    right
  };
}

function xOnDomain(state: NumberLineState, value: number) {
  const span = state.domainMax - state.domainMin || 1;
  return configuredSemanticPrimaryLayout.contentLeft + ((value - state.domainMin) / span) * (configuredSemanticPrimaryLayout.contentRight - configuredSemanticPrimaryLayout.contentLeft);
}

function NumberLineMarks({ accent, state, theme }: { accent: string; state: NumberLineState; theme: VisualizationTheme }) {
  const y = 200;
  const startX = xOnDomain(state, state.start);
  const endX = xOnDomain(state, state.end);
  return (
    <>
      <line data-viz-mark data-viz-name="semantic number line axis" x1="64" x2="576" y1={y} y2={y} stroke={theme.axisStrong} strokeWidth="4" />
      {state.tickValues.map((tick) => {
        const x = xOnDomain(state, tick);
        return (
          <g key={tick} data-viz-mark data-viz-name="semantic number line tick" data-viz-tick-value={tick}>
            <line x1={x} x2={x} y1={y - 10} y2={y + 10} stroke={theme.axisStrong} strokeWidth="2" />
            <text data-viz-label x={x} y={y + 31} textAnchor="middle" fill={theme.tickText} fontSize="11" fontWeight="700">{compactNumber(tick, 2)}</text>
          </g>
        );
      })}
      <path
        data-viz-mark
        data-viz-name="semantic number line jump"
        data-viz-start={state.start}
        data-viz-step={state.step}
        data-viz-end={state.end}
        d={`M ${startX} ${y - 12} Q ${(startX + endX) / 2} ${y - 72} ${endX} ${y - 12}`}
        fill="none"
        stroke={accent}
        strokeLinecap="round"
        strokeWidth="7"
      />
      <circle data-viz-mark data-viz-name="semantic number line start" cx={startX} cy={y} r="9" fill={theme.svgBackground} stroke={accent} strokeWidth="5" />
      <circle data-viz-mark data-viz-name="semantic number line end" cx={endX} cy={y} r="10" fill={accent} stroke={theme.pointStroke} strokeWidth="3" />
      <text data-viz-label x={(startX + endX) / 2} y={136} textAnchor="middle" fill={theme.text} fontSize="18" fontWeight="800">
        {compactNumber(state.start, 2)} {state.step >= 0 ? "+" : "−"} {compactNumber(Math.abs(state.step), 2)} = {compactNumber(state.end, 2)}
      </text>
    </>
  );
}

function PlaceValueMarks({ accent, state, strings, theme }: { accent: string; state: PlaceValueState; strings: Required<SemanticPrimaryLocalizedStrings>; theme: VisualizationTheme }) {
  const columnWidth = Math.min(94, 468 / state.digits.length);
  const startX = 320 - (columnWidth * state.digits.length) / 2;
  const localizedLabel = (entry: PlaceValueState["digits"][number]) => state.family === "decimal-place-value"
    ? entry.place === 1
      ? strings.ones
      : entry.place === 0.1
        ? strings.tenths
        : strings.hundredths
    : entry.label;
  return (
    <>
      {state.digits.map((entry, index) => (
        <text key={`label-${entry.place}`} data-viz-label x={startX + index * columnWidth + columnWidth / 2} y="122" textAnchor="middle" fill={theme.textMuted} fontSize="10" fontWeight="800">
          {localizedLabel(entry)}
        </text>
      ))}
      {[
        { digits: state.digits, id: "A", name: "place value A column", y: 132 },
        { digits: state.comparisonDigits, id: "B", name: "place value B column", y: 212 }
      ].map((row) => (
        <g key={row.id} data-viz-mark data-viz-name="place value row" data-viz-place-value-row={row.id}>
          <text data-viz-label x="72" y={row.y + 35} textAnchor="middle" fill={theme.text} fontSize="17" fontWeight="900">{row.id}</text>
          {row.digits.map((entry, index) => {
            const x = startX + index * columnWidth;
            return (
              <g key={entry.place} data-viz-mark data-viz-name={row.name} data-viz-place={entry.place} data-viz-digit={entry.digit} data-viz-contribution={entry.contribution}>
                <rect x={x + 3} y={row.y} width={columnWidth - 6} height="52" rx="11" fill={index % 2 === 0 ? theme.softFill : theme.emptyFill} stroke={accent} strokeOpacity={row.id === "A" ? 0.72 : 0.48} strokeWidth="2" />
                <text data-viz-label x={x + columnWidth / 2} y={row.y + 37} textAnchor="middle" fill={theme.text} fontSize="27" fontWeight="900">{entry.digit}</text>
              </g>
            );
          })}
        </g>
      ))}
      <text data-viz-label data-viz-comparison-relation={state.comparisonRelation} x="560" y="206" textAnchor="middle" fill={accent} fontSize="28" fontWeight="900">{state.comparisonRelation}</text>
    </>
  );
}

function repeatedAdditionLines(state: ArrayState) {
  const terms = range(0, state.rows).map(() => String(state.columns));
  if (terms.length <= 5) return [`${terms.join(" + ")} = ${state.product}`];
  const splitAt = Math.ceil(terms.length / 2);
  return [
    `${terms.slice(0, splitAt).join(" + ")} +`,
    `${terms.slice(splitAt).join(" + ")} = ${state.product}`
  ];
}

function ArrayMarks({ accent, state, strings, theme }: { accent: string; state: ArrayState; strings: Required<SemanticPrimaryLocalizedStrings>; theme: VisualizationTheme }) {
  if (state.family === "decimal-product-area") {
    const cell = 15;
    const startX = 244;
    const startY = 124;
    return (
      <>
        <rect data-viz-mark data-viz-name="decimal hundred grid" x={startX} y={startY} width={cell * 10} height={cell * 10} fill={theme.emptyFill} stroke={theme.axisStrong} strokeWidth="2" />
        {range(0, 100).map((index) => {
          const row = Math.floor(index / 10);
          const column = index % 10;
          const shaded = row < state.rows && column < state.columns;
          return <rect key={index} data-viz-mark data-viz-name="decimal product cell" data-viz-shaded={shaded ? "true" : "false"} x={startX + column * cell} y={startY + row * cell} width={cell} height={cell} fill={shaded ? accent : "transparent"} fillOpacity={shaded ? 0.7 : 1} stroke={theme.gridStrong} />;
        })}
      </>
    );
  }
  const multiplicationFoundation = state.variant === "p2-multiplication-foundations";
  const visibleRows = Math.min(state.rows, multiplicationFoundation ? 10 : 8);
  const visibleColumns = Math.min(state.columns, 12);
  const hasEqualGroupsReasoning = state.family === "equal-groups-array";
  const availableArrayHeight = state.factorPairs ? 116 : 142;
  const availableArrayWidth = hasEqualGroupsReasoning ? 250 : 330;
  const arrayCenterX = hasEqualGroupsReasoning ? 208 : 320;
  const cell = Math.min(25, availableArrayWidth / Math.max(visibleColumns, 1), availableArrayHeight / Math.max(visibleRows, 1));
  const startX = arrayCenterX - (visibleColumns * cell) / 2;
  const startY = 130;
  const factorPairLabelY = Math.min(276, startY + visibleRows * cell + 24);
  const remainder = state.remainder ?? 0;
  const arrayRight = startX + visibleColumns * cell;
  const reasoningX = hasEqualGroupsReasoning ? 360 : Math.min(arrayRight + 18, 430);
  const reasoningWidth = configuredSemanticPrimaryLayout.contentRight - reasoningX;
  const additionLines = state.family === "equal-groups-array" && state.variant !== "p2-multiplication-foundations"
    ? repeatedAdditionLines(state)
    : [];
  return (
    <>
      <rect
        data-viz-mark
        data-viz-name="array outline"
        x={startX - 6}
        y={startY - 6}
        width={visibleColumns * cell + 12}
        height={visibleRows * cell + 12}
        data-viz-rows={state.rows}
        data-viz-columns={state.columns}
        data-viz-object-total={state.product}
        rx="9"
        fill={theme.emptyFill}
        stroke={accent}
        strokeWidth="3"
      />
      {range(0, visibleRows * visibleColumns).map((index) => (
        <circle
          key={index}
          data-viz-mark
          data-viz-name="array item"
          data-viz-row={Math.floor(index / visibleColumns) + 1}
          data-viz-column={(index % visibleColumns) + 1}
          cx={startX + (index % visibleColumns) * cell + cell / 2}
          cy={startY + Math.floor(index / visibleColumns) * cell + cell / 2}
          r={Math.max(4, cell * 0.3)}
          fill={accent}
          fillOpacity="0.78"
          stroke={theme.pointStroke}
          strokeWidth="1"
        />
      ))}
      {remainder > 0 && range(0, remainder).map((index) => (
        <circle key={`r-${index}`} data-viz-mark data-viz-name="division remainder item" data-viz-remainder-index={index + 1} cx={470 + index * 18} cy="236" r="7" fill="#f59e0b" stroke={theme.pointStroke} strokeWidth="1" />
      ))}
      {state.factorPairs && (
        <text data-viz-label data-viz-name="factor pair label" x="320" y={factorPairLabelY} textAnchor="middle" fill={theme.textMuted} fontSize="12" fontWeight="800">
          {state.factorPairs.map(([left, right]) => `${left}×${right}`).join(" · ")}
        </text>
      )}
      {additionLines.map((line, index) => (
        <text
          key={line}
          data-viz-label
          data-viz-name="equal groups repeated addition"
          data-viz-repeated-addition-line={index + 1}
          x={reasoningX}
          y={176 + index * 22}
          fill={theme.text}
          fontSize="12"
          fontWeight="900"
          lengthAdjust={line.length * 7 > reasoningWidth ? "spacingAndGlyphs" : undefined}
          textLength={line.length * 7 > reasoningWidth ? reasoningWidth : undefined}
        >
          {line}
        </text>
      ))}
      {state.family === "equal-groups-array" && (
        <text
          data-viz-label
          data-viz-name="equal groups total"
          data-viz-total={state.product}
          x={reasoningX}
          y={176 + additionLines.length * 22}
          fill={accent}
          fontSize="14"
          fontWeight="900"
        >
          {strings.total}: {state.product}
        </text>
      )}
    </>
  );
}

function VolumeMarks({ accent, state, strings, theme }: { accent: string; state: VolumeState; strings: Required<SemanticPrimaryLocalizedStrings>; theme: VisualizationTheme }) {
  const cube = 10;
  const rowOffset = 3;
  const layerOffset = state.displayMode === "layers" ? 12 : 8;
  const projectedWidth = (state.length - 1) * cube + (state.width - 1) * rowOffset + cube + rowOffset;
  const originX = 320 - projectedWidth / 2;
  const originY = 260;
  const cubes: ReactNode[] = [];
  for (let layer = 0; layer < state.height; layer += 1) {
    for (let row = 0; row < state.width; row += 1) {
      for (let column = 0; column < state.length; column += 1) {
        const x = originX + column * cube + row * rowOffset;
        const y = originY - layer * layerOffset - row * rowOffset;
        cubes.push(
          <g key={`${layer}-${row}-${column}`} data-viz-mark data-viz-name="unit cube" data-viz-display-mode={state.displayMode} data-viz-layer={layer + 1} data-viz-row={row + 1} data-viz-column={column + 1}>
            <rect x={x} y={y} width={cube} height={cube} fill={accent} fillOpacity={clamp(0.34 + layer * 0.06, 0.34, 0.9)} stroke={theme.pointStroke} strokeWidth="1.5" />
            <path d={`M ${x} ${y} l 5 -4 h ${cube} l -5 4 z`} fill={accent} fillOpacity="0.72" stroke={theme.pointStroke} strokeWidth="1" />
            <path d={`M ${x + cube} ${y} l 5 -4 v ${cube} l -5 4 z`} fill={accent} fillOpacity="0.5" stroke={theme.pointStroke} strokeWidth="1" />
          </g>
        );
      }
    }
  }
  return <>{cubes}<text data-viz-label x="472" y="176" textAnchor="middle" fill={theme.text} fontSize="24" fontWeight="900">{state.volume} {strings.cubes}</text></>;
}

function AreaMarks({ accent, state, theme }: { accent: string; state: AreaState; theme: VisualizationTheme }) {
  const basePixels = state.base * 22;
  const heightPixels = state.height * 18;
  const left = 320 - basePixels / 2;
  const bottom = 256;
  if (state.shape === "rectangle") {
    return (
      <>
        <rect data-viz-mark data-viz-name="area rectangle" data-viz-area={state.area} data-viz-perimeter={state.perimeter} x={left} y={bottom - heightPixels} width={basePixels} height={heightPixels} fill={accent} fillOpacity="0.34" stroke={accent} strokeWidth="5" />
        {range(1, Math.max(0, state.base - 1)).map((index) => <line key={`v-${index}`} x1={left + index * 22} x2={left + index * 22} y1={bottom - heightPixels} y2={bottom} stroke={theme.gridStrong} />)}
        {range(1, Math.max(0, state.height - 1)).map((index) => <line key={`h-${index}`} x1={left} x2={left + basePixels} y1={bottom - index * 18} y2={bottom - index * 18} stroke={theme.gridStrong} />)}
        <text data-viz-label x={left + basePixels / 2} y={bottom + 18} textAnchor="middle" fill={theme.textMuted} fontSize="12" fontWeight="800">{state.base}</text>
        <text data-viz-label x={left - 17} y={bottom - heightPixels / 2} textAnchor="middle" fill={theme.textMuted} fontSize="12" fontWeight="800">{state.height}</text>
      </>
    );
  }
  const topBasePixels = (state.topBase ?? state.base) * 22;
  const topLeft = 320 - topBasePixels / 2;
  const points = state.shape === "triangle"
    ? `${left},${bottom} ${left + basePixels},${bottom} ${left + basePixels * 0.58},${bottom - heightPixels}`
    : state.shape === "parallelogram"
      ? `${left},${bottom} ${left + basePixels},${bottom} ${left + basePixels * 0.8},${bottom - heightPixels} ${left - basePixels * 0.2},${bottom - heightPixels}`
      : `${left},${bottom} ${left + basePixels},${bottom} ${topLeft + topBasePixels},${bottom - heightPixels} ${topLeft},${bottom - heightPixels}`;
  return (
    <>
      <polygon data-viz-mark data-viz-name="polygon area shape" data-viz-shape={state.shape} data-viz-area={state.area} points={points} fill={accent} fillOpacity="0.34" stroke={accent} strokeWidth="5" />
      <line data-viz-mark data-viz-name="polygon height" x1={left + basePixels * 0.58} x2={left + basePixels * 0.58} y1={bottom} y2={bottom - heightPixels} stroke={theme.axisStrong} strokeDasharray="6 5" strokeWidth="2" />
      <text data-viz-label x={left + basePixels / 2} y={bottom + 18} textAnchor="middle" fill={theme.textMuted} fontSize="12" fontWeight="800">b={state.base}</text>
      <text data-viz-label data-viz-name="polygon height label" x={left + basePixels + 14} y={bottom - heightPixels / 2} fill={theme.textMuted} fontSize="12" fontWeight="800">h={state.height}</text>
    </>
  );
}

function FractionMarks({ accent, state, theme }: { accent: string; state: FractionState; theme: VisualizationTheme }) {
  const barX = 92;
  const barWidth = 456;
  const bar = (
    numerator: number,
    denominator: number,
    y: number,
    key: string,
    name: "equivalent bar" | "left fraction bar" | "right fraction bar" | "whole bar",
    emphasis: "active" | "reference"
  ) => {
    const safeNumerator = clamp(numerator, 0, denominator);
    const active = emphasis === "active";
    return (
      <g
        key={key}
        data-viz-mark
        data-viz-name={name}
        data-viz-numerator={numerator}
        data-viz-denominator={denominator}
        data-viz-value={numerator / denominator}
        data-viz-bar-emphasis={emphasis}
        data-viz-partition-count={denominator}
      >
        <rect
          data-viz-mark
          data-viz-name={`${name} background`}
          data-viz-bar-width={barWidth}
          data-viz-partition-count={denominator}
          x={barX}
          y={y}
          width={barWidth}
          height="42"
          rx="12"
          fill={theme.emptyFill}
          stroke={theme.axisStrong}
          strokeWidth={active ? 3 : 2}
        />
        <rect
          data-viz-mark
          data-viz-name={`${name} fill`}
          data-viz-numerator={numerator}
          data-viz-denominator={denominator}
          data-viz-value={numerator / denominator}
          data-viz-bar-width={barWidth}
          data-viz-partition-count={denominator}
          x={barX}
          y={y}
          width={(barWidth * safeNumerator) / denominator}
          height="42"
          rx="12"
          fill={accent}
          fillOpacity={active ? 0.76 : 0.42}
        />
        {range(1, denominator - 1).map((index) => <line key={index} data-viz-mark data-viz-name={`${name} partition`} data-viz-partition-index={index} data-viz-partition-count={denominator} x1={barX + (barWidth * index) / denominator} x2={barX + (barWidth * index) / denominator} y1={y} y2={y + 42} stroke={theme.axisStrong} strokeOpacity="0.55" />)}
        <text data-viz-label data-viz-fraction-value-label="true" data-viz-label-placement="above-bar" x={barX} y={y - 10} textAnchor="start" fill={theme.text} fontSize="15" fontWeight="900">{numerator}/{denominator}</text>
      </g>
    );
  };
  const firstEmphasis = state.displayMode === "equivalent" ? "reference" : "active";
  const secondEmphasis = state.displayMode === "fraction" ? "reference" : "active";
  return (
    <g data-viz-name="fraction mode layer" data-viz-fraction-layer-mode={state.displayMode ?? "compare"}>
      {bar(
        state.numerator,
        state.denominator,
        132,
        "left",
        state.family === "fraction-equivalence" ? "whole bar" : "left fraction bar",
        firstEmphasis
      )}
      {state.family === "fraction-equivalence"
        ? bar(
            state.resultNumerator,
            state.resultDenominator,
            218,
            "result",
            "equivalent bar",
            secondEmphasis
          )
        : state.otherNumerator !== undefined && state.otherDenominator !== undefined
          ? bar(
              state.otherNumerator,
              state.otherDenominator,
              218,
              "right",
              "right fraction bar",
              "active"
            )
          : null}
    </g>
  );
}

function RatioMarks({ accent, state, theme }: { accent: string; state: RatioState; theme: VisualizationTheme }) {
  const ratioRow = (left: number, right: number, y: number, scale: number) => (
    <g data-viz-mark data-viz-name="equivalent ratio row" data-viz-left={left} data-viz-right={right} data-viz-scale={scale}>
      <rect x="104" y={y} width={(360 * left) / (left + right)} height="42" rx="12" fill={accent} fillOpacity="0.72" />
      <rect x={104 + (360 * left) / (left + right)} y={y} width={(360 * right) / (left + right)} height="42" rx="12" fill="#f59e0b" fillOpacity="0.62" />
      <text data-viz-label x="500" y={y + 27} fill={theme.text} fontSize="16" fontWeight="900">{left}:{right}</text>
    </g>
  );
  return <>{ratioRow(state.a, state.b, 142, 1)}{ratioRow(state.scaledA, state.scaledB, 222, state.factor)}</>;
}

function PercentMarks({ accent, state, theme }: { accent: string; state: PercentState; theme: VisualizationTheme }) {
  const shadedCells = Math.round(state.decimal * 100);
  return (
    <>
      <g data-viz-mark data-viz-name="percent hundred grid" data-viz-shaded-cells={shadedCells}>
        {range(0, 100).map((index) => (
          <rect key={index} x={238 + (index % 10) * 17} y={112 + Math.floor(index / 10) * 17} width="16" height="16" fill={index < shadedCells ? accent : theme.emptyFill} fillOpacity={index < shadedCells ? 0.78 : 1} stroke={theme.gridStrong} />
        ))}
      </g>
      <text data-viz-label x="448" y="184" fill={theme.text} fontSize="30" fontWeight="900">{compactNumber(state.percent, 1)}%</text>
      <text data-viz-label x="448" y="220" fill={theme.textMuted} fontSize="16" fontWeight="800">{state.part}/{state.whole}</text>
    </>
  );
}

type ProportionalCalloutRect = { height: number; left: number; top: number; width: number };

export type ProportionalCalloutLayout = {
  anchor: { x: number; y: number };
  box: ProportionalCalloutRect;
  label: string;
  leaderTarget: { x: number; y: number };
};

const proportionalChart = { height: 154, left: 156, top: 118, width: 330 } as const;

function expandCalloutRect(rect: ProportionalCalloutRect, padding: number): ProportionalCalloutRect {
  return {
    height: rect.height + padding * 2,
    left: rect.left - padding,
    top: rect.top - padding,
    width: rect.width + padding * 2
  };
}

function pointHitsCalloutRect(point: { x: number; y: number }, radius: number, rect: ProportionalCalloutRect) {
  const nearestX = clamp(point.x, rect.left, rect.left + rect.width);
  const nearestY = clamp(point.y, rect.top, rect.top + rect.height);
  return Math.hypot(point.x - nearestX, point.y - nearestY) < radius;
}

function segmentHitsCalloutRect(start: { x: number; y: number }, end: { x: number; y: number }, rect: ProportionalCalloutRect) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  let minimum = 0;
  let maximum = 1;
  const boundaries: Array<[number, number]> = [
    [-deltaX, start.x - rect.left],
    [deltaX, rect.left + rect.width - start.x],
    [-deltaY, start.y - rect.top],
    [deltaY, rect.top + rect.height - start.y]
  ];
  for (const [direction, distance] of boundaries) {
    if (direction === 0) {
      if (distance < 0) return false;
      continue;
    }
    const ratio = distance / direction;
    if (direction < 0) minimum = Math.max(minimum, ratio);
    else maximum = Math.min(maximum, ratio);
    if (minimum > maximum) return false;
  }
  return true;
}

function proportionalScreenPoints(state: ProportionalState) {
  const maximumY = Math.max(...state.points.map((point) => point.y), 1);
  return state.points.map((point) => ({
    x: proportionalChart.left + ((point.x - 1) / 7) * proportionalChart.width,
    y: proportionalChart.top + proportionalChart.height - (point.y / maximumY) * proportionalChart.height
  }));
}

export function buildProportionalCalloutLayout(state: ProportionalState): ProportionalCalloutLayout {
  const points = proportionalScreenPoints(state);
  const anchor = points[state.x - 1];
  const label = `(${state.x}, ${compactNumber(state.y, 2)})`;
  const width = Math.max(50, label.length * 7 + 16);
  const height = 26;
  const candidates: ProportionalCalloutRect[] = [18, 30, 42, 54, 68].flatMap((gap) => [
    { left: anchor.x + gap, top: anchor.y - height / 2, width, height },
    { left: anchor.x + 18, top: anchor.y + gap, width, height },
    { left: anchor.x + 18, top: anchor.y - height - gap, width, height },
    { left: anchor.x - width - gap, top: anchor.y - height / 2, width, height },
    { left: anchor.x - width - 18, top: anchor.y + gap, width, height },
    { left: anchor.x - width - 18, top: anchor.y - height - gap, width, height },
    { left: anchor.x - width / 2, top: anchor.y - height - gap, width, height },
    { left: anchor.x - width / 2, top: anchor.y + gap, width, height }
  ]);
  const curveClearance = 9;
  const axisClearance = 8;
  const pointClearance = 6;
  const xAxis = [
    { x: proportionalChart.left, y: proportionalChart.top + proportionalChart.height },
    { x: proportionalChart.left + proportionalChart.width, y: proportionalChart.top + proportionalChart.height }
  ] as const;
  const yAxis = [
    { x: proportionalChart.left, y: proportionalChart.top },
    { x: proportionalChart.left, y: proportionalChart.top + proportionalChart.height }
  ] as const;
  const box = candidates.find((candidate) => {
    if (
      candidate.left < configuredSemanticPrimaryLayout.contentLeft
      || candidate.left + candidate.width > configuredSemanticPrimaryLayout.contentRight
      || candidate.top < configuredSemanticPrimaryLayout.contentTop
      || candidate.top + candidate.height > configuredSemanticPrimaryLayout.contentBottom
    ) return false;
    const pointBox = expandCalloutRect(candidate, pointClearance);
    if (points.some((point, index) => pointHitsCalloutRect(point, index === state.x - 1 ? 12 : 7, pointBox))) return false;
    const curveBox = expandCalloutRect(candidate, curveClearance);
    for (let index = 1; index < points.length; index += 1) {
      if (segmentHitsCalloutRect(points[index - 1], points[index], curveBox)) return false;
    }
    const axisBox = expandCalloutRect(candidate, axisClearance);
    return !segmentHitsCalloutRect(xAxis[0], xAxis[1], axisBox)
      && !segmentHitsCalloutRect(yAxis[0], yAxis[1], axisBox);
  });
  if (!box) throw new Error(`No collision-free proportional callout layout for ${state.proportion} x=${state.x} k=${state.constant}.`);
  return {
    anchor,
    box,
    label,
    leaderTarget: {
      x: clamp(anchor.x, box.left, box.left + box.width),
      y: clamp(anchor.y, box.top, box.top + box.height)
    }
  };
}

function ProportionalMarks({ accent, state, theme }: { accent: string; state: ProportionalState; theme: VisualizationTheme }) {
  const { left, top, width: chartWidth, height: chartHeight } = proportionalChart;
  const points = proportionalScreenPoints(state);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const callout = buildProportionalCalloutLayout(state);
  return (
    <>
      <line data-viz-mark data-viz-name="proportion x axis" x1={left} x2={left + chartWidth} y1={top + chartHeight} y2={top + chartHeight} stroke={theme.axisStrong} strokeWidth="3" />
      <line data-viz-mark data-viz-name="proportion y axis" x1={left} x2={left} y1={top} y2={top + chartHeight} stroke={theme.axisStrong} strokeWidth="3" />
      <path
        data-viz-mark
        data-viz-name="proportion curve"
        data-viz-overlap-ok="true"
        data-viz-overlap-owner="proportional-callout-clearance"
        data-viz-overlap-reason="The callout layout is proven against the exact curve segments; the SVG path bounding box is intentionally broader than the painted stroke."
        data-viz-proportion={state.proportion}
        d={path}
        fill="none"
        stroke={accent}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {state.points.map((point, index) => {
        return <circle key={point.x} data-viz-mark data-viz-name="proportion point" data-viz-x={point.x} data-viz-y={point.y} cx={points[index].x} cy={points[index].y} r="7" fill={accent} stroke={theme.pointStroke} strokeWidth="2" />;
      })}
      <circle data-viz-mark data-viz-name="selected proportion point" cx={callout.anchor.x} cy={callout.anchor.y} r="12" fill="none" stroke="#f59e0b" strokeWidth="4" />
      <g
        data-viz-mark
        data-viz-name="selected proportion callout"
        data-viz-overlap-owner="proportional-callout-clearance"
        data-viz-overlap-reason="The callout layout is proven against the exact curve segments; the SVG path bounding box is intentionally broader than the painted stroke."
        data-viz-selected-x={state.x}
        data-viz-selected-y={state.y}
        data-viz-anchor-x={callout.anchor.x}
        data-viz-anchor-y={callout.anchor.y}
        data-viz-callout-left={callout.box.left}
        data-viz-callout-top={callout.box.top}
        data-viz-callout-width={callout.box.width}
        data-viz-callout-height={callout.box.height}
      >
        <line data-viz-mark data-viz-name="selected proportion callout leader" x1={callout.anchor.x} y1={callout.anchor.y} x2={callout.leaderTarget.x} y2={callout.leaderTarget.y} stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 3" />
        <rect data-viz-name="selected proportion callout background" x={callout.box.left} y={callout.box.top} width={callout.box.width} height={callout.box.height} rx="8" fill={theme.svgBackground} stroke="#f59e0b" strokeWidth="2" />
        <text data-viz-label data-viz-name="selected proportion coordinate" x={callout.box.left + callout.box.width / 2} y={callout.box.top + 18} textAnchor="middle" fill={theme.text} fontSize="12" fontWeight="900">{callout.label}</text>
      </g>
    </>
  );
}

function ClockMarks({ accent, state, theme }: { accent: string; state: ClockState; theme: VisualizationTheme }) {
  const centerX = 320;
  const centerY = 195;
  const point = (angle: number, radius: number) => {
    const radians = ((angle - 90) * Math.PI) / 180;
    return { x: centerX + Math.cos(radians) * radius, y: centerY + Math.sin(radians) * radius };
  };
  const hourEnd = point(state.hourAngle, 52);
  const minuteEnd = point(state.minuteAngle, 72);
  return (
    <>
      <circle data-viz-mark data-viz-name="clock face" cx={centerX} cy={centerY} r="80" fill={theme.emptyFill} stroke={accent} strokeWidth="5" />
      {range(0, 12).map((index) => {
        const outside = point(index * 30, 70);
        const inside = point(index * 30, 61);
        return <line key={index} data-viz-mark data-viz-name="clock hour tick" data-viz-hour={index} x1={inside.x} x2={outside.x} y1={inside.y} y2={outside.y} stroke={theme.axisStrong} strokeWidth={index % 3 === 0 ? 4 : 2} />;
      })}
      <line data-viz-mark data-viz-name="clock hour hand" data-viz-angle={state.hourAngle} x1={centerX} x2={hourEnd.x} y1={centerY} y2={hourEnd.y} stroke={theme.axisStrong} strokeWidth="8" strokeLinecap="round" />
      <line data-viz-mark data-viz-name="clock minute hand" data-viz-angle={state.minuteAngle} x1={centerX} x2={minuteEnd.x} y1={centerY} y2={minuteEnd.y} stroke={accent} strokeWidth="5" strokeLinecap="round" />
      <circle cx={centerX} cy={centerY} r="7" fill={accent} />
    </>
  );
}

function CalendarMarks({ accent, state, theme }: { accent: string; state: CalendarState; theme: VisualizationTheme }) {
  const cellWidth = 48;
  const cellHeight = 28;
  const startX = 152;
  const startY = 126;
  const overlapReason = "Day text is intentionally centered inside its calendar cell.";
  return (
    <>
      <rect data-viz-name="calendar month" data-viz-month={state.month} data-viz-month-length={state.monthLength} x={startX - 24} y={startY - 22} width={cellWidth * 7} height="174" rx="16" fill={theme.emptyFill} stroke={accent} strokeWidth="3" />
      {range(1, state.monthLength).map((day) => {
        const index = day - 1;
        const selected = day === state.day;
        const centerX = startX + (index % 7) * cellWidth;
        const centerY = startY + Math.floor(index / 7) * cellHeight;
        const overlapOwner = `calendar-day-${day}`;
        return (
          <g key={day} data-viz-name="calendar day" data-viz-day={day}>
            <rect
              data-viz-mark
              data-viz-name="calendar day background"
              data-viz-day={day}
              data-viz-overlap-ok="true"
              data-viz-overlap-owner={overlapOwner}
              data-viz-overlap-reason={overlapReason}
              x={centerX - 20}
              y={centerY - 14}
              width="40"
              height="26"
              rx="6"
              fill={theme.svgBackground}
              fillOpacity="0.34"
              stroke={theme.gridStrong}
              strokeWidth="1"
            />
            {selected && <circle data-viz-mark data-viz-name="calendar selected day marker" data-viz-day={day} data-viz-overlap-ok="true" data-viz-overlap-owner={overlapOwner} data-viz-overlap-reason={overlapReason} cx={centerX} cy={centerY} r="13" fill={accent} />}
            <text data-viz-label data-viz-name="calendar day label" data-viz-day={day} data-viz-overlap-ok="true" data-viz-overlap-owner={overlapOwner} data-viz-overlap-reason={overlapReason} x={centerX} y={centerY + 5} textAnchor="middle" fill={selected ? theme.svgBackground : theme.text} fontSize="12" fontWeight="800">{day}</text>
          </g>
        );
      })}
      <text data-viz-label x="320" y="275" textAnchor="middle" fill={theme.text} fontSize="17" fontWeight="900">{state.month}/{state.day}/2024 → {state.endMonth}/{state.endDay}/{state.endYear}</text>
    </>
  );
}

function MoneyMarks({ accent, state, theme }: { accent: string; state: MoneyState; theme: VisualizationTheme }) {
  const visible = state.denominations.filter(({ count }) => count > 0).slice(0, 6);
  return (
    <>
      {visible.map((denomination, index) => (
        <g key={denomination.cents} data-viz-mark data-viz-name="money denomination" data-viz-cents={denomination.cents} data-viz-count={denomination.count}>
          <circle cx={132 + index * 76} cy="194" r={28 + Math.min(8, denomination.cents / 100)} fill={accent} fillOpacity={0.2 + index * 0.08} stroke={accent} strokeWidth="3" />
          <text data-viz-label x={132 + index * 76} y="190" textAnchor="middle" fill={theme.text} fontSize="13" fontWeight="900">¥{compactNumber(denomination.cents / 100, 2)}</text>
          <text data-viz-label x={132 + index * 76} y="211" textAnchor="middle" fill={theme.textMuted} fontSize="11" fontWeight="800">×{denomination.count}</text>
        </g>
      ))}
      <text data-viz-label x="320" y="264" textAnchor="middle" fill={theme.text} fontSize="26" fontWeight="900">¥{compactNumber(state.amountCents / 100, 2)}</text>
    </>
  );
}

function AttributeComparisonMarks({ accent, state, theme }: { accent: string; state: AttributeComparisonState; theme: VisualizationTheme }) {
  let marks: ReactNode;
  if (state.attribute === "quantity") {
    marks = (
      <g data-viz-mark data-viz-name="comparison quantity groups">
        {[
          { count: state.first, label: "A", panelX: 80 },
          { count: state.second, label: "B", panelX: 350 }
        ].map(({ count, label, panelX }) => (
          <g key={label} data-viz-mark data-viz-name="comparison quantity group" data-viz-comparison-side={label} data-viz-count={count}>
            <rect x={panelX} y="126" width="210" height="122" rx="18" fill={theme.emptyFill} stroke={accent} strokeOpacity={label === "A" ? 0.82 : 0.56} strokeWidth="3" />
            {range(1, count).map((index) => (
              <circle key={index} data-viz-mark data-viz-name="comparison counted object" data-viz-comparison-side={label} data-viz-object-index={index} cx={panelX + 34 + ((index - 1) % 5) * 35} cy={157 + Math.floor((index - 1) / 5) * 36} r="10" fill={accent} fillOpacity={label === "A" ? 0.82 : 0.46} stroke={theme.pointStroke} strokeWidth="2" />
            ))}
            <text data-viz-label x={panelX + 105} y="235" textAnchor="middle" fill={theme.text} fontSize="15" fontWeight="900">{label} = {count}</text>
          </g>
        ))}
      </g>
    );
  } else if (state.attribute === "length") {
    marks = (
      <g data-viz-mark data-viz-name="comparison length bars">
        {[
          { label: "A", value: state.first, y: 158 },
          { label: "B", value: state.second, y: 226 }
        ].map(({ label, value, y }) => (
          <g key={label} data-viz-mark data-viz-name="comparison length bar" data-viz-comparison-side={label} data-viz-length={value}>
            <text data-viz-label x="92" y={y + 6} textAnchor="middle" fill={theme.text} fontSize="16" fontWeight="900">{label}</text>
            <line x1="132" x2="492" y1={y} y2={y} stroke={theme.gridStrong} strokeWidth="14" strokeLinecap="round" />
            <line x1="132" x2={132 + value * 36} y1={y} y2={y} stroke={accent} strokeOpacity={label === "A" ? 0.9 : 0.58} strokeWidth="14" strokeLinecap="round" />
            <line x1={132 + value * 36} x2={132 + value * 36} y1={y - 18} y2={y + 18} stroke={theme.axisStrong} strokeWidth="3" />
            <text data-viz-label x="536" y={y + 6} textAnchor="middle" fill={theme.text} fontSize="15" fontWeight="900">{value}</text>
          </g>
        ))}
      </g>
    );
  } else if (state.attribute === "height") {
    marks = (
      <g data-viz-mark data-viz-name="comparison height columns">
        <line data-viz-mark data-viz-name="comparison height baseline" x1="110" x2="530" y1="252" y2="252" stroke={theme.axisStrong} strokeWidth="4" />
        {[
          { label: "A", value: state.first, x: 176 },
          { label: "B", value: state.second, x: 394 }
        ].map(({ label, value, x }) => {
          const height = value * 11;
          return (
            <g key={label} data-viz-mark data-viz-name="comparison height column" data-viz-comparison-side={label} data-viz-height={value}>
              <rect x={x} y={252 - height} width="70" height={height} rx="10" fill={accent} fillOpacity={label === "A" ? 0.86 : 0.5} stroke={accent} strokeWidth="3" />
              <text data-viz-label x={x + 35} y={Math.max(126, 240 - height)} textAnchor="middle" fill={theme.text} fontSize="15" fontWeight="900">{value}</text>
              <text data-viz-label x={x + 35} y="274" textAnchor="middle" fill={theme.textMuted} fontSize="14" fontWeight="900">{label}</text>
            </g>
          );
        })}
      </g>
    );
  } else {
    const tilt = state.first === state.second ? 0 : state.first > state.second ? 18 : -18;
    const leftY = 174 + tilt;
    const rightY = 174 - tilt;
    marks = (
      <g data-viz-mark data-viz-name="comparison mass balance">
        <line data-viz-mark data-viz-name="comparison mass beam" x1="174" x2="466" y1={leftY} y2={rightY} stroke={theme.axisStrong} strokeWidth="8" strokeLinecap="round" />
        <path data-viz-mark data-viz-name="comparison mass fulcrum" d="M 320 176 L 282 252 L 358 252 Z" fill={theme.softFill} stroke={accent} strokeWidth="4" />
        {[
          { label: "A", value: state.first, x: 174, y: leftY },
          { label: "B", value: state.second, x: 466, y: rightY }
        ].map(({ label, value, x, y }) => (
          <g key={label} data-viz-mark data-viz-name="comparison mass pan" data-viz-comparison-side={label} data-viz-mass={value}>
            <line x1={x} x2={x} y1={y} y2={y + 9} stroke={theme.axisStrong} strokeWidth="3" />
            <rect x={x - 27} y={y + 10} width="54" height="32" rx="9" fill={accent} fillOpacity={label === "A" ? 0.84 : 0.52} />
            <path d={`M ${x - 52} ${y + 48} Q ${x} ${y + 66} ${x + 52} ${y + 48}`} fill={theme.emptyFill} stroke={accent} strokeWidth="4" />
            <text data-viz-label data-viz-name="comparison mass value" x={label === "A" ? 100 : 540} y={y + 32} textAnchor="middle" fill={theme.text} fontSize="13" fontWeight="900">{label}={value}</text>
          </g>
        ))}
      </g>
    );
  }
  return (
    <>
      {marks}
      <text data-viz-label data-viz-name="comparison relation summary" x="320" y="276" textAnchor="middle" fill={theme.text} fontSize="17" fontWeight="900">A {state.relation} B · |A−B| = {state.difference}</text>
    </>
  );
}

function MeasurementMarks({ accent, state, strings, theme }: { accent: string; state: MeasurementState; strings: Required<SemanticPrimaryLocalizedStrings>; theme: VisualizationTheme }) {
  if (state.estimate !== undefined && state.measured !== undefined && state.error !== undefined) {
    const maximum = Math.max(state.estimate, state.measured, 1);
    return (
      <>
        {[
          { label: strings.estimate, value: state.estimate, y: 156 },
          { label: strings.measured, value: state.measured, y: 226 }
        ].map((entry) => (
          <g key={entry.label} data-viz-mark data-viz-name={`${entry.label} measurement`} data-viz-value={entry.value}>
            <text data-viz-label x="92" y={entry.y + 22} fill={theme.textMuted} fontSize="13" fontWeight="800">{entry.label}</text>
            <rect x="190" y={entry.y} width={(330 * entry.value) / maximum} height="34" rx="10" fill={accent} fillOpacity={entry.y === 156 ? 0.42 : 0.76} />
            <text data-viz-label x="536" y={entry.y + 23} textAnchor="end" fill={theme.text} fontSize="15" fontWeight="900">{compactNumber(entry.value, 1)}</text>
          </g>
        ))}
      </>
    );
  }
  const count = state.unitCount ?? 1;
  const countSpan = count || 1;
  const wholeUnitCount = Math.floor(count);
  const tickValues = [...range(0, wholeUnitCount + 1)];
  if (!approximatelyEqual(count, wholeUnitCount)) tickValues.push(count);
  const rulerStartX = 98;
  const rulerEndX = 510;
  const unitLabelX = 532;
  return (
    <>
      <line data-viz-mark data-viz-name="measurement ruler" x1={rulerStartX} x2={rulerEndX} y1="220" y2="220" stroke={theme.axisStrong} strokeWidth="6" />
      {tickValues.map((tickValue, index) => {
        const x = rulerStartX + ((rulerEndX - rulerStartX) * tickValue) / countSpan;
        const showLabel = tickValues.length <= 14 || index % Math.ceil(tickValues.length / 12) === 0 || index === tickValues.length - 1;
        const terminal = index === tickValues.length - 1;
        return <g key={`${tickValue}-${index}`} data-viz-mark data-viz-name="measurement unit interval" data-viz-unit-index={tickValue} data-viz-unit-size-mm={state.unitSizeMm}><line x1={x} x2={x} y1="190" y2="236" stroke={accent} strokeWidth="3" />{showLabel && <text data-viz-label data-viz-name={terminal ? "measurement terminal value" : "measurement tick value"} data-viz-terminal-tick={terminal ? "true" : undefined} x={x} y="258" textAnchor="middle" fill={theme.tickText} fontSize="10" fontWeight="800">{compactNumber(tickValue, 1)}</text>}</g>;
      })}
      <text data-viz-label data-viz-name="measurement display unit" x={unitLabelX} y="258" textAnchor="start" fill={accent} fontSize="13" fontWeight="900">{state.displayUnit}</text>
      <path data-viz-mark data-viz-name="measured object" d="M 98 162 Q 320 118 542 162" fill="none" stroke={accent} strokeWidth="12" strokeLinecap="round" />
    </>
  );
}

function MassMarks({ accent, state, theme }: { accent: string; state: MassState; theme: VisualizationTheme }) {
  const values = [
    { label: "g", value: state.grams, display: compactNumber(state.grams, 0) },
    { label: "kg", value: state.kilograms, display: compactNumber(state.kilograms, 3) },
    { label: "t", value: state.tonnes, display: compactNumber(state.tonnes, 6) }
  ];
  return (
    <>
      <line data-viz-mark data-viz-name="mass equivalence beam" x1="110" x2="530" y1="214" y2="214" stroke={theme.axisStrong} strokeWidth="5" />
      {values.map((entry, index) => (
        <g key={entry.label} data-viz-mark data-viz-name="mass equivalent value" data-viz-unit={entry.label} data-viz-value={entry.value}>
          <rect x={105 + index * 170} y="146" width="90" height="60" rx="14" fill={accent} fillOpacity={entry.label === state.displayUnit ? 0.82 : 0.2} stroke={accent} strokeWidth={entry.label === state.displayUnit ? 5 : 2} />
          <text data-viz-label x={150 + index * 170} y="174" textAnchor="middle" fill={theme.text} fontSize="15" fontWeight="900">{entry.display}</text>
          <text data-viz-label x={150 + index * 170} y="194" textAnchor="middle" fill={theme.textMuted} fontSize="12" fontWeight="800">{entry.label}</text>
        </g>
      ))}
      <path d="M 300 214 L 340 214 L 320 260 Z" fill={accent} stroke={theme.pointStroke} strokeWidth="2" />
    </>
  );
}

function DataMarks({ accent, state, theme }: { accent: string; state: DataState; theme: VisualizationTheme }) {
  const left = 132;
  const bottom = 252;
  const chartWidth = 376;
  const chartHeight = 140;
  const maximum = Math.max(...state.sample, 1);
  if (state.family === "line-chart") {
    const path = state.points.map((point, index) => {
      const x = left + (index * chartWidth) / Math.max(1, state.points.length - 1);
      const y = bottom - (point.y / maximum) * chartHeight;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    }).join(" ");
    return (
      <>
        <line data-viz-mark data-viz-name="line chart x axis" x1={left} x2={left + chartWidth} y1={bottom} y2={bottom} stroke={theme.axisStrong} strokeWidth="3" />
        <line data-viz-mark data-viz-name="line chart y axis" x1={left} x2={left} y1={130} y2={bottom} stroke={theme.axisStrong} strokeWidth="3" />
        <path data-viz-mark data-viz-name="ordered line chart" d={path} fill="none" stroke={accent} strokeWidth="6" strokeLinejoin="round" />
        {state.points.map((point, index) => <circle key={point.x} data-viz-mark data-viz-name="line chart observation" data-viz-order={point.x} data-viz-value={point.y} cx={left + (index * chartWidth) / Math.max(1, state.points.length - 1)} cy={bottom - (point.y / maximum) * chartHeight} r="7" fill={accent} stroke={theme.pointStroke} strokeWidth="2" />)}
      </>
    );
  }
  if (state.family === "raw-data-summary") {
    const frequencies = Array.from(
      state.sample.reduce((counts, value) => counts.set(value, (counts.get(value) ?? 0) + 1), new Map<number, number>())
    ).map(([value, count]) => ({ count, value }));
    return (
      <>
        <line data-viz-mark data-viz-name="raw data axis" x1={left} x2={left + chartWidth} y1="212" y2="212" stroke={theme.axisStrong} strokeWidth="4" />
        {frequencies.map(({ count, value }) => {
          const x = left + (value / maximum) * chartWidth;
          return <g key={value} data-viz-mark data-viz-name="raw observation frequency" data-viz-observed-value={value} data-viz-observed-count={count}>{range(0, count).map((stackIndex) => <circle key={stackIndex} cx={x} cy={190 - stackIndex * 18} r="9" fill={accent} fillOpacity={0.68 + (stackIndex % 2) * 0.2} stroke={theme.pointStroke} strokeWidth="2" />)}<text data-viz-label x={x} y="240" textAnchor="middle" fill={theme.tickText} fontSize="11" fontWeight="800">{value}{count > 1 ? ` ×${count}` : ""}</text></g>;
        })}
        <line data-viz-mark data-viz-name="raw data mean" data-viz-mean={state.mean} x1={left + (state.mean / maximum) * chartWidth} x2={left + (state.mean / maximum) * chartWidth} y1="132" y2="222" stroke="#f59e0b" strokeDasharray="6 4" strokeWidth="4" />
      </>
    );
  }
  const categories = state.categories ?? state.sample.map((value, index) => ({ label: String(index + 1), value }));
  const slotWidth = chartWidth / categories.length;
  return (
    <>
      <line data-viz-mark data-viz-name="bar chart baseline" x1={left} x2={left + chartWidth} y1={bottom} y2={bottom} stroke={theme.axisStrong} strokeWidth="4" />
      {categories.map((category, index) => {
        const barHeight = (category.value / maximum) * chartHeight;
        return (
          <g key={category.label} data-viz-mark data-viz-name="category bar" data-viz-category={category.label} data-viz-count={category.value}>
            <rect x={left + index * slotWidth + 14} y={bottom - barHeight} width={slotWidth - 28} height={barHeight} rx="8" fill={accent} fillOpacity={0.46 + (index % 3) * 0.16} stroke={accent} strokeWidth="2" />
            <text data-viz-label x={left + index * slotWidth + slotWidth / 2} y={bottom - barHeight - 8} textAnchor="middle" fill={theme.text} fontSize="13" fontWeight="900">{category.value}</text>
            <text data-viz-label x={left + index * slotWidth + slotWidth / 2} y={bottom + 18} textAnchor="middle" fill={theme.textMuted} fontSize="12" fontWeight="800">{category.label}</text>
          </g>
        );
      })}
    </>
  );
}

function SeededProbabilityMarks({ accent, state, theme }: { accent: string; state: SeededProbabilityState; theme: VisualizationTheme }) {
  const shownFrequency = state.displayMode === "experiment" ? state.successes / state.trials : state.probability;
  return (
    <>
      <g data-viz-mark data-viz-name="seeded trial sequence" data-viz-seed={state.seed}>
        {state.sequence.map((outcome, index) => (
          <rect key={index} data-viz-mark data-viz-name="seeded trial" data-viz-trial={index + 1} data-viz-outcome={outcome} x={92 + (index % 12) * 38} y={134 + Math.floor(index / 12) * 38} width="30" height="30" rx="8" fill={outcome ? accent : theme.emptyFill} fillOpacity={state.displayMode === "experiment" ? 1 : 0.28} stroke={outcome ? accent : theme.neutralStroke} strokeWidth="2" />
        ))}
      </g>
      <rect data-viz-mark data-viz-name="probability reference bar" x="116" y="246" width="408" height="22" rx="11" fill={theme.emptyFill} />
      <rect data-viz-mark data-viz-name={state.displayMode === "experiment" ? "empirical successes" : "theoretical successes"} data-viz-frequency={shownFrequency} x="116" y="246" width={408 * shownFrequency} height="22" rx="11" fill={accent} />
      <text data-viz-label x="320" y="238" textAnchor="middle" fill={theme.textMuted} fontSize="11" fontWeight="800">{state.displayMode === "experiment" ? `f=${compactNumber(shownFrequency, 2)}` : `p=${compactNumber(shownFrequency, 2)}`}</text>
    </>
  );
}

function RandomVariableMarks({ accent, state, theme }: { accent: string; state: RandomVariableState; theme: VisualizationTheme }) {
  const maximum = Math.max(...state.outcomes.map(({ probability }) => probability), 0.01);
  const left = 100;
  const width = 440;
  const slotWidth = width / state.outcomes.length;
  const barWidth = clamp(slotWidth * 0.62, 18, 64);
  return (
    <>
      <line data-viz-mark data-viz-name="random variable baseline" x1={left} x2={left + width} y1="248" y2="248" stroke={theme.axisStrong} strokeWidth="4" />
      {state.outcomes.map((outcome, index) => {
        const height = (outcome.probability / maximum) * 118;
        const x = left + slotWidth * (index + 0.5);
        return (
          <g key={outcome.value} data-viz-mark data-viz-name="random variable outcome" data-viz-outcome={outcome.value} data-viz-probability={outcome.probability}>
            <rect x={x - barWidth / 2} y={248 - height} width={barWidth} height={height} rx="7" fill={accent} fillOpacity={0.46 + (index / Math.max(1, state.outcomes.length - 1)) * 0.32} stroke={accent} strokeWidth="2" />
            <text data-viz-label x={x} y={236 - height} textAnchor="middle" fill={theme.text} fontSize={state.outcomes.length > 7 ? "10" : "12"} fontWeight="900">{compactNumber(outcome.probability, 2)}</text>
            <text data-viz-label x={x} y="274" textAnchor="middle" fill={theme.textMuted} fontSize="12" fontWeight="800">X={outcome.value}</text>
          </g>
        );
      })}
    </>
  );
}

function CombinatoricsMarks({ accent, state, strings, theme }: { accent: string; state: CombinatoricsState; strings: Required<SemanticPrimaryLocalizedStrings>; theme: VisualizationTheme }) {
  const leaves = Math.min(state.n, 8);
  const overlapReason = "Choice number is intentionally centered inside its counting node.";
  return (
    <>
      <circle data-viz-mark data-viz-name="counting tree root" cx="320" cy="126" r="13" fill={accent} stroke={theme.pointStroke} strokeWidth="2" />
      {range(0, leaves).map((index) => {
        const x = 112 + (416 * index) / Math.max(1, leaves - 1);
        const choice = index + 1;
        const overlapOwner = `counting-choice-${choice}`;
        return (
          <g key={index} data-viz-name="counting first choice" data-viz-choice={choice}>
            <line data-viz-mark data-viz-name="counting choice branch" data-viz-choice={choice} x1="320" x2={x} y1="139" y2="208" stroke={accent} strokeOpacity="0.62" strokeWidth="3" />
            <circle data-viz-mark data-viz-name="counting choice node" data-viz-choice={choice} data-viz-overlap-ok="true" data-viz-overlap-owner={overlapOwner} data-viz-overlap-reason={overlapReason} cx={x} cy="220" r="12" fill={theme.emptyFill} stroke={accent} strokeWidth="3" />
            <text data-viz-label data-viz-name="counting choice number" data-viz-choice={choice} data-viz-overlap-ok="true" data-viz-overlap-owner={overlapOwner} data-viz-overlap-reason={overlapReason} x={x} y="225" textAnchor="middle" fill={theme.text} fontSize="11" fontWeight="900">{choice}</text>
            {state.r > 1 && <line data-viz-mark data-viz-name="counting continuation branch" data-viz-choice={choice} x1={x} x2={x + (index % 2 === 0 ? -14 : 14)} y1="232" y2="262" stroke={theme.axis} strokeWidth="2" />}
          </g>
        );
      })}
      <text data-viz-label x="320" y="274" textAnchor="middle" fill={theme.textMuted} fontSize="13" fontWeight="800">n={state.n} · r={state.r} · {strings.uniqueOutcomes}</text>
    </>
  );
}

function machineAttributes(state: ConfiguredSemanticPrimaryState) {
  const attributes: Record<string, string | number> = {
    "data-viz-formula": state.formula,
    "data-viz-state-json": JSON.stringify(state),
    "data-viz-state-kind": state.kind
  };
  if (state.kind === "number-line") {
    attributes["data-viz-domain-min"] = state.domainMin;
    attributes["data-viz-domain-max"] = state.domainMax;
    attributes["data-viz-start"] = state.start;
    attributes["data-viz-step"] = state.step;
    attributes["data-viz-end"] = state.end;
  } else if (state.kind === "place-value") {
    attributes["data-viz-total"] = state.total;
    attributes["data-viz-comparison-total"] = state.comparisonTotal;
    attributes["data-viz-comparison-relation"] = state.comparisonRelation;
    attributes["data-viz-place-count"] = state.digits.length;
  } else if (state.kind === "array") {
    attributes["data-viz-rows"] = state.rows;
    attributes["data-viz-columns"] = state.columns;
    attributes["data-viz-product"] = state.product;
    if (state.remainder !== undefined) attributes["data-viz-remainder"] = state.remainder;
  } else if (state.kind === "volume") {
    attributes["data-viz-length"] = state.length;
    attributes["data-viz-width"] = state.width;
    attributes["data-viz-height"] = state.height;
    attributes["data-viz-volume"] = state.volume;
    attributes["data-viz-volume-display-mode"] = state.displayMode;
  } else if (state.kind === "area") {
    attributes["data-viz-area"] = state.area;
    if (state.perimeter !== undefined) attributes["data-viz-perimeter"] = state.perimeter;
  } else if (state.kind === "fraction") {
    attributes["data-viz-numerator"] = state.numerator;
    attributes["data-viz-denominator"] = state.denominator;
    attributes["data-viz-result-numerator"] = state.resultNumerator;
    attributes["data-viz-result-denominator"] = state.resultDenominator;
    if (state.displayMode) attributes["data-viz-fraction-display-mode"] = state.displayMode;
    if (state.family === "fraction-equivalence") {
      attributes["data-viz-equivalent-numerator"] = state.resultNumerator;
      attributes["data-viz-equivalent-denominator"] = state.resultDenominator;
      attributes["data-viz-equivalent-pair"] = `${state.numerator}/${state.denominator}=${state.resultNumerator}/${state.resultDenominator}`;
    }
  } else if (state.kind === "measurement") {
    if (state.physicalLengthMm !== undefined) attributes["data-viz-physical-length-mm"] = state.physicalLengthMm;
    if (state.unitCount !== undefined) attributes["data-viz-unit-count"] = state.unitCount;
    if (state.displayUnit !== undefined) attributes["data-viz-display-unit"] = state.displayUnit;
  } else if (state.kind === "attribute-comparison") {
    attributes["data-viz-comparison-attribute"] = state.attribute;
    attributes["data-viz-comparison-first"] = state.first;
    attributes["data-viz-comparison-second"] = state.second;
    attributes["data-viz-comparison-relation"] = state.relation;
    attributes["data-viz-comparison-difference"] = state.difference;
  } else if (state.kind === "mass") {
    attributes["data-viz-grams"] = state.grams;
    attributes["data-viz-display-unit"] = state.displayUnit;
  } else if (state.kind === "data") {
    attributes["data-viz-data-total"] = state.total;
    attributes["data-viz-data-mean"] = state.mean;
    attributes["data-viz-data-range"] = state.range;
  } else if (state.kind === "seeded-probability") {
    attributes["data-viz-seed"] = state.seed;
    attributes["data-viz-trials"] = state.trials;
    attributes["data-viz-successes"] = state.successes;
    attributes["data-viz-failures"] = state.failures;
    attributes["data-viz-probability"] = state.probability;
    attributes["data-viz-probability-display-mode"] = state.displayMode;
  } else if (state.kind === "random-variable") {
    attributes["data-viz-probability-sum"] = state.probabilitySum;
    attributes["data-viz-expected-value"] = state.expectedValue;
    attributes["data-viz-variance"] = state.variance;
    attributes["data-viz-binomial-trials"] = state.trials;
    attributes["data-viz-success-probability"] = state.successProbability;
  } else if (state.kind === "combinatorics") {
    attributes["data-viz-permutations"] = state.permutations;
    attributes["data-viz-combinations"] = state.combinations;
  }
  return attributes;
}

function marksForState(
  state: ConfiguredSemanticPrimaryState,
  accent: string,
  theme: VisualizationTheme,
  strings: Required<SemanticPrimaryLocalizedStrings>
) {
  switch (state.kind) {
    case "number-line": return <NumberLineMarks accent={accent} state={state} theme={theme} />;
    case "place-value": return <PlaceValueMarks accent={accent} state={state} strings={strings} theme={theme} />;
    case "array": return <ArrayMarks accent={accent} state={state} strings={strings} theme={theme} />;
    case "volume": return <VolumeMarks accent={accent} state={state} strings={strings} theme={theme} />;
    case "area": return <AreaMarks accent={accent} state={state} theme={theme} />;
    case "fraction": return <FractionMarks accent={accent} state={state} theme={theme} />;
    case "ratio": return <RatioMarks accent={accent} state={state} theme={theme} />;
    case "percent": return <PercentMarks accent={accent} state={state} theme={theme} />;
    case "proportional": return <ProportionalMarks accent={accent} state={state} theme={theme} />;
    case "clock": return <ClockMarks accent={accent} state={state} theme={theme} />;
    case "calendar": return <CalendarMarks accent={accent} state={state} theme={theme} />;
    case "money": return <MoneyMarks accent={accent} state={state} theme={theme} />;
    case "attribute-comparison": return <AttributeComparisonMarks accent={accent} state={state} theme={theme} />;
    case "measurement": return <MeasurementMarks accent={accent} state={state} strings={strings} theme={theme} />;
    case "mass": return <MassMarks accent={accent} state={state} theme={theme} />;
    case "data": return <DataMarks accent={accent} state={state} theme={theme} />;
    case "seeded-probability": return <SeededProbabilityMarks accent={accent} state={state} theme={theme} />;
    case "random-variable": return <RandomVariableMarks accent={accent} state={state} theme={theme} />;
    case "combinatorics": return <CombinatoricsMarks accent={accent} state={state} strings={strings} theme={theme} />;
  }
}

function visibleFormula(state: ConfiguredSemanticPrimaryState, strings: Required<SemanticPrimaryLocalizedStrings>) {
  if (state.kind === "measurement" && state.error !== undefined) {
    return `${strings.error} = ${compactNumber(state.estimate ?? 0, 1)} − ${compactNumber(state.measured ?? 0, 1)} = ${compactNumber(state.error, 1)}`;
  }
  if (state.kind === "data") {
    return `Σ=${compactNumber(state.total, 2)} · ${strings.mean}=${compactNumber(state.mean, 2)} · ${strings.range}=${compactNumber(state.range, 2)}`;
  }
  return state.formula;
}

export function ConfiguredSemanticPrimaryMarks({
  accent,
  comparison,
  family,
  height,
  localizedStrings,
  mode,
  value,
  variant,
  vizTheme
}: ConfiguredSemanticPrimaryMarksProps) {
  const state = buildConfiguredSemanticPrimaryState(family, { comparison, height, mode, value, variant });
  if (!state) return null;
  const strings = { ...defaultStrings, ...localizedStrings };
  const invariant = configuredSemanticPrimaryInvariant(state);
  const displayFormula = visibleFormula(state, strings);
  return (
    <g
      data-viz-mark
      data-viz-name="configured semantic primary marks"
      data-viz-semantic-family={state.family}
      data-viz-semantic-variant={state.variant}
      data-viz-semantic-source-sha={CONFIGURED_SEMANTIC_PRIMARY_MARKS_SOURCE.frozenAuditSha256}
      data-viz-source-value={finite(value, 0)}
      data-viz-source-comparison={finite(comparison, 0)}
      data-viz-source-height={height === undefined ? "derived" : finite(height, 1)}
      data-viz-source-mode={finite(mode, 0)}
      data-viz-invariant-id={invariant.id}
      data-viz-invariant-ids={invariant.ids.join(",")}
      data-viz-invariant-left={invariant.left}
      data-viz-invariant-right={invariant.right}
      data-viz-invariant-status={invariant.holds ? "pass" : "fail"}
      {...machineAttributes(state)}
    >
      {marksForState(state, accent, vizTheme, strings)}
      <g
        data-viz-name="semantic formula"
        data-viz-safe-y={configuredSemanticPrimaryLayout.formulaY}
      >
        <line
          data-viz-mark
          data-viz-formula-rail
          data-viz-name="semantic formula upper rail"
          x1="76"
          x2="564"
          y1={configuredSemanticPrimaryLayout.formulaY - 24}
          y2={configuredSemanticPrimaryLayout.formulaY - 24}
          stroke={vizTheme.labelStroke}
          strokeWidth="1.5"
        />
        <line
          data-viz-mark
          data-viz-formula-rail
          data-viz-name="semantic formula lower rail"
          x1="76"
          x2="564"
          y1={configuredSemanticPrimaryLayout.formulaY + 7}
          y2={configuredSemanticPrimaryLayout.formulaY + 7}
          stroke={vizTheme.labelStroke}
          strokeWidth="1.5"
        />
        <text
          data-viz-label
          x="320"
          y={configuredSemanticPrimaryLayout.formulaY - 3}
          textAnchor="middle"
          fill={vizTheme.text}
          fontSize={displayFormula.length > 48 ? "13" : "15"}
          fontWeight="900"
          lengthAdjust={displayFormula.length > 58 ? "spacingAndGlyphs" : undefined}
          textLength={displayFormula.length > 58 ? "450" : undefined}
        >
          {displayFormula}
        </text>
      </g>
    </g>
  );
}
