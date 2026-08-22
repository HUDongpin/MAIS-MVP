"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { visualizationThemeForTheme } from "@/components/visualizations/visualizationTheme";
import type { FeaturedLabDefinition } from "@/data/visualizationLabs";
import type { LocalizedText } from "@/types";
import {
  SIGNED_REAL_NUMBER_LINE_DOMAIN,
  SIGNED_REAL_NUMBER_LINE_LAB_IDS,
  SIGNED_REAL_NUMBER_LINE_MODEL_CONTRACT,
  SIGNED_REAL_NUMBER_LINE_TOPIC_PROFILES,
  SIGNED_REAL_NUMBER_LINE_TOPIC_RESET_INPUTS,
  buildSignedRealNumberLineModel,
  type ExactRadicalInput,
  type ExactRational,
  type ExactRationalInput,
  type ExactRealInput,
  type QuadraticSurdInput,
  type SignedRealInvariantId,
  type SignedRealNumberLineExactMode,
  type SignedRealNumberLineInput,
  type SignedRealNumberLineLabId,
  type SignedRealNumberLineModel,
} from "./SignedRealNumberLineModel";
import {
  SignedRealNumberLineControlDomainError,
  createSignedRealNumberLineAcceptedActionReceipt,
  createSignedRealNumberLineControlState,
  createSignedRealNumberLineRejectedActionReceipt,
  observeSignedRealNumberLineControlTransition,
  planSignedRealNumberLineControlTransition,
  type SignedRealNumberLineActionReceipt,
  type SignedRealNumberLineActionRequest,
  type SignedRealNumberLineActionSnapshot,
  type SignedRealNumberLineControlName,
  type SignedRealNumberLineControlDomainErrorCode,
  type SignedRealNumberLineControlRequest,
  type SignedRealNumberLineControlState,
  type SignedRealNumberLineControlTransitionReceipt,
} from "./SignedRealNumberLineControlDomain";
import {
  SIGNED_REAL_NUMBER_LINE_GEOMETRY_CONTRACT,
  buildSignedRealNumberLineGeometry,
  type SignedRealNumberLineGeometry,
} from "./SignedRealNumberLineGeometry";

export const MAINLAND_SIGNED_REAL_NUMBER_LINE_LAB_IDS =
  SIGNED_REAL_NUMBER_LINE_LAB_IDS;

export type MainlandSignedRealNumberLineLabId = SignedRealNumberLineLabId;

const SIGNED_REAL_NUMBER_LINE_LAB_ID_SET = new Set<string>(
  MAINLAND_SIGNED_REAL_NUMBER_LINE_LAB_IDS,
);

export function isMainlandSignedRealNumberLineLabId(
  labId: string,
): labId is MainlandSignedRealNumberLineLabId {
  return SIGNED_REAL_NUMBER_LINE_LAB_ID_SET.has(labId);
}

function localized(en: string, zh: string, zhHans: string): LocalizedText {
  return { en, zh, zhHans };
}

export const SIGNED_REAL_NUMBER_LINE_COPY = {
  title: localized(
    "Exact signed number line",
    "精確帶符號數線",
    "精确带符号数轴",
  ),
  eyebrow: localized(
    "Exact value, position, and proof",
    "精確數值、位置與證明",
    "精确数值、位置与证明",
  ),
  learningGoal: localized("Learning goal", "學習目標", "学习目标"),
  modesLabel: localized("Choose a math action", "選擇數學操作", "选择数学操作"),
  modes: {
    locate: localized("Locate", "定位", "定位"),
    compare: localized("Compare", "比較", "比较"),
    add: localized("Add", "加法", "加法"),
    subtract: localized("Subtract", "減法", "减法"),
    multiply: localized("Multiply", "乘法", "乘法"),
    divide: localized("Divide", "除法", "除法"),
    opposite: localized("Opposite number", "相反數", "相反数"),
    "absolute-value": localized("Absolute value", "絕對值", "绝对值"),
    radical: localized("Radical position", "根式定位", "根式定位"),
    classify: localized("Classify real number", "實數分類", "实数分类"),
    "square-root": localized("Square root", "平方根", "平方根"),
    "cube-root": localized("Cube root", "立方根", "立方根"),
    estimate: localized("Estimate", "估算", "估算"),
    simplify: localized("Simplify radical", "化簡根式", "化简根式"),
    "radical-add": localized("Add radicals", "根式加法", "根式加法"),
    "radical-subtract": localized("Subtract radicals", "根式減法", "根式减法"),
    "radical-multiply": localized("Multiply radicals", "根式乘法", "根式乘法"),
    "radical-divide": localized("Divide radicals", "根式除法", "根式除法"),
    "estimate-check": localized("Check estimate", "檢查估算", "检查估算"),
  },
  panHint: localized(
    "Swipe horizontally or use the arrow keys to inspect the full number line.",
    "左右滑動或使用方向鍵查看完整數線。",
    "左右滑动或使用方向键查看完整数轴。",
  ),
  surfaceLabel: localized(
    "Exact signed number line with certified positions",
    "附有認證位置的精確帶符號數線",
    "附有认证位置的精确带符号数轴",
  ),
  negativeSide: localized("Negative side", "負數側", "负数侧"),
  positiveSide: localized("Positive side", "正數側", "正数侧"),
  atOrigin: localized("At the origin", "位於原點", "位于原点"),
  origin: localized("Origin", "原點", "原点"),
  primaryPoint: localized("Plotted value", "繪製數值", "绘制数值"),
  comparisonPoint: localized("Comparison value", "比較值", "比较值"),
  operationStart: localized("Starting value", "起始值", "起始值"),
  operationEndpoint: localized("Ending value", "終點值", "终点值"),
  exactValue: localized("Plotted exact value", "繪製的精確值", "绘制的精确值"),
  decimalApproximation: localized("Decimal estimate", "小數估算", "小数估算"),
  decimalBounds: localized("Certified decimal bounds", "認證小數界限", "认证小数界限"),
  errorBound: localized("Maximum error", "最大誤差", "最大误差"),
  absoluteDistance: localized("Distance from zero", "到零的距離", "到零的距离"),
  comparisonProof: localized("Exact comparison proof", "精確比較證明", "精确比较证明"),
  operationMotion: localized("Exact number-line movement", "精確數線移動", "精确数轴移动"),
  radicalPowerProof: localized("Certified root interval", "認證根式區間", "认证根式区间"),
  geometryReceipt: localized("Position certificate", "位置認證", "位置认证"),
  geometryRange: localized("Visible number-line range", "可見數線範圍", "可见数轴范围"),
  geometryError: localized("Screen-position error", "畫面位置誤差", "画面位置误差"),
  value: localized("Value", "數值", "数值"),
  leftValue: localized("Left value", "左側數值", "左侧数值"),
  rightValue: localized("Right value", "右側數值", "右侧数值"),
  start: localized("Start", "起點", "起点"),
  inputStep: localized("Input step", "輸入步長", "输入步长"),
  signedStep: localized("Applied signed step", "套用的帶符號步長", "应用的带符号步长"),
  endpoint: localized("Endpoint", "終點", "终点"),
  numberKind: localized("Exact number kind", "精確數類型", "精确数类型"),
  rational: localized("Rational number", "有理數", "有理数"),
  radical: localized("Radical", "根式", "根式"),
  signedNumerator: localized("Signed numerator", "帶符號分子", "带符号分子"),
  denominator: localized("Positive denominator", "正分母", "正分母"),
  radicalSign: localized("Sign", "符號", "符号"),
  negative: localized("Negative", "負", "负"),
  positive: localized("Positive", "正", "正"),
  radicand: localized("Radicand", "被開方數", "被开方数"),
  radicalIndex: localized("Root index", "根指數", "根指数"),
  coefficientNumerator: localized("Coefficient numerator", "係數分子", "系数分子"),
  coefficientDenominator: localized("Coefficient denominator", "係數分母", "系数分母"),
  precision: localized("Decimal places", "小數位數", "小数位数"),
  invariantChecks: localized("Exact checks", "精確檢查", "精确检查"),
  verified: localized("Verified", "已驗證", "已验证"),
  failed: localized("Needs correction", "需要修正", "需要修正"),
  notApplicable: localized("Not applicable", "不適用", "不适用"),
  stateSummary: localized("Current mathematical state", "目前數學狀態", "当前数学状态"),
  controlReceipt: localized("Control update", "控制更新", "控制更新"),
  controlConfirmed: localized("Requested and observed states agree", "要求狀態與觀察狀態一致", "请求状态与观察状态一致"),
  projectionApplied: localized("A dependent value was updated safely", "已安全更新相依數值", "已安全更新依赖数值"),
  noProjection: localized("No dependent value needed an update", "無需更新相依數值", "无需更新依赖数值"),
  rejectedControl: localized("That control value is not valid here", "此控制值在目前操作中無效", "此控制值在当前操作中无效"),
  rationalOperation: localized("Exact rational calculation", "精確有理數計算", "精确有理数计算"),
  realConcept: localized("Real-number reasoning", "實數推理", "实数推理"),
  radicalOperation: localized("Exact radical calculation", "精確根式計算", "精确根式计算"),
  classification: localized("Classification", "分類", "分类"),
  defined: localized("Defined over the real numbers", "在實數範圍有定義", "在实数范围有定义"),
  combinable: localized("Like radicals can be combined", "同類根式可以合併", "同类根式可以合并"),
  unlikeRadicals: localized("Unlike radicals stay as separate exact terms", "非同類根式保留為分開的精確項", "非同类根式保留为分开的精确项"),
  classifications: {
    natural: localized("Natural", "自然數", "自然数"),
    whole: localized("Whole", "非負整數", "非负整数"),
    integer: localized("Integer", "整數", "整数"),
    rational: localized("Rational", "有理數", "有理数"),
    irrational: localized("Irrational", "無理數", "无理数"),
    real: localized("Real", "實數", "实数"),
  },
  yes: localized("Yes", "是", "是"),
  no: localized("No", "否", "否"),
  result: localized("Result", "結果", "结果"),
  reset: localized("Reset this lab", "重設此實驗", "重置此实验"),
  invariants: {
    "rational-point": localized("Rational forms are reduced", "有理數已約分", "有理数已约分"),
    "radical-square-error": localized("The radical interval is certified", "根式區間已認證", "根式区间已认证"),
    "absolute-value-distance": localized("Absolute value equals distance", "絕對值等於距離", "绝对值等于距离"),
    "signed-origin-stability": localized("The sign agrees with the side of zero", "符號與零的方向一致", "符号与零的方向一致"),
    "exact-cross-product": localized("The exact comparison is reconstructed", "精確比較已重建", "精确比较已重建"),
    "additive-endpoint": localized("The endpoint equals start plus signed step", "終點等於起點加帶符號步長", "终点等于起点加带符号步长"),
    "topic-mode-allowlist": localized("This action belongs to the current topic", "此操作屬於目前主題", "此操作属于当前主题"),
    "rational-operation-reconstruction": localized("The rational calculation reconstructs exactly", "有理數計算可精確重建", "有理数计算可精确重建"),
    "real-concept-reconstruction": localized("The real-number statement reconstructs exactly", "實數敘述可精確重建", "实数叙述可精确重建"),
    "quadratic-radical-reconstruction": localized("The radical calculation is canonical", "根式計算為標準形式", "根式计算为标准形式"),
  } satisfies Record<SignedRealInvariantId, LocalizedText>,
} as const;

export type SignedRealNumberLineLabProps = {
  lab: FeaturedLabDefinition;
  initialInput?: SignedRealNumberLineInput;
  controlFooterAction?: ReactNode;
};

export type SignedRealNumberLineLearnerState = {
  input: SignedRealNumberLineInput;
  controls: SignedRealNumberLineControlState;
  receipt: SignedRealNumberLineControlTransitionReceipt;
  actionReceipt: SignedRealNumberLineActionReceipt;
};

const UI_MAX_ABS_RATIONAL_COMPONENT = 24;
const UI_MAX_RADICAND = 50;
const UI_MAX_DENOMINATOR = 12;
const GEOMETRY_RATIONAL_LAB =
  "bnu-junior-s1-upper-rational-numbers" as const;

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (!value || typeof value !== "object") return value;
  const object = value as object;
  if (seen.has(object)) return value;
  seen.add(object);
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child, seen);
  }
  return Object.freeze(value);
}

function clampInteger(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function rational(numerator: number, denominator = 1): ExactRationalInput {
  return { kind: "rational", numerator, denominator };
}

function radical(
  radicand: number,
  index = 2,
  sign: -1 | 1 = 1,
): ExactRadicalInput {
  const magnitude = Math.abs(radicand);
  const normalizedSign =
    radicand < 0 && index % 2 === 1 ? (sign === -1 ? 1 : -1) : sign;
  return {
    kind: "radical",
    radicand: magnitude,
    index,
    sign: magnitude === 0 ? 1 : normalizedSign,
  };
}

function surd(
  coefficientNumerator: number,
  radicand: number,
  coefficientDenominator = 1,
): QuadraticSurdInput {
  return {
    kind: "quadratic-surd",
    coefficient: rational(coefficientNumerator, coefficientDenominator),
    radicand,
  };
}

function canonicalExactInput(value: ExactRealInput): ExactRealInput {
  return value.kind === "rational"
    ? rational(value.numerator, value.denominator)
    : radical(value.radicand, value.index, value.sign ?? 1);
}

function canonicalizeInput(
  input: SignedRealNumberLineInput,
  labId: SignedRealNumberLineLabId,
): SignedRealNumberLineInput {
  const bound = { ...input, labId } as SignedRealNumberLineInput;
  switch (bound.mode) {
    case "locate":
    case "absolute-value":
    case "radical":
    case "classify":
    case "estimate":
      return { ...bound, value: canonicalExactInput(bound.value) };
    case "compare":
      return {
        ...bound,
        left: canonicalExactInput(bound.left),
        right: canonicalExactInput(bound.right),
      };
    default:
      return bound;
  }
}

function inputNumberKind(
  input: SignedRealNumberLineInput,
): SignedRealNumberLineControlState["numberKind"] {
  if (
    input.mode === "simplify" ||
    input.mode === "estimate-check" ||
    input.mode === "radical-add" ||
    input.mode === "radical-subtract" ||
    input.mode === "radical-multiply" ||
    input.mode === "radical-divide"
  ) {
    return "quadratic-surd";
  }
  if (input.mode === "square-root" || input.mode === "cube-root") {
    return "radical";
  }
  if (input.mode === "compare") return input.left.kind;
  if (
    input.mode === "locate" ||
    input.mode === "absolute-value" ||
    input.mode === "radical" ||
    input.mode === "classify" ||
    input.mode === "estimate"
  ) {
    return input.value.kind;
  }
  return "rational";
}

function controlStateFromInput(
  input: SignedRealNumberLineInput,
): SignedRealNumberLineControlState {
  let valueSign: -1 | 1 = 1;
  let valueRadicand = 2;
  let rightRationalNumerator = 1;
  let rightRationalDenominator = 1;
  let rightSurdCoefficientNumerator = 1;
  let rightSurdCoefficientDenominator = 1;
  let rightSurdRadicand = 2;

  const primary =
    input.mode === "compare"
      ? input.left
      : input.mode === "locate" ||
          input.mode === "absolute-value" ||
          input.mode === "radical" ||
          input.mode === "classify" ||
          input.mode === "estimate"
        ? input.value
        : null;
  if (primary?.kind === "radical") {
    valueSign = primary.sign ?? 1;
    valueRadicand = primary.radicand;
  } else if (input.mode === "square-root" || input.mode === "cube-root") {
    valueSign = input.radicand < 0 ? -1 : 1;
    valueRadicand = Math.abs(input.radicand);
  } else if (input.mode === "simplify" || input.mode === "estimate-check") {
    valueRadicand = input.value.radicand;
  }

  if (
    (input.mode === "compare" ||
      input.mode === "multiply" ||
      input.mode === "divide") &&
    input.right.kind === "rational"
  ) {
    rightRationalNumerator = input.right.numerator;
    rightRationalDenominator = input.right.denominator;
  }
  if (
    input.mode === "radical-add" ||
    input.mode === "radical-subtract" ||
    input.mode === "radical-multiply" ||
    input.mode === "radical-divide"
  ) {
    valueRadicand = input.left.radicand;
    rightSurdCoefficientNumerator = input.right.coefficient.numerator;
    rightSurdCoefficientDenominator = input.right.coefficient.denominator;
    rightSurdRadicand = input.right.radicand;
  }

  return createSignedRealNumberLineControlState(input.labId, input.mode, {
    numberKind: inputNumberKind(input),
    valueSign,
    valueRadicand,
    rightRationalNumerator,
    rightRationalDenominator,
    rightSurdCoefficientNumerator,
    rightSurdCoefficientDenominator,
    rightSurdRadicand,
  });
}

function confirmedReceipt(
  controls: SignedRealNumberLineControlState,
): SignedRealNumberLineControlTransitionReceipt {
  const plan = planSignedRealNumberLineControlTransition(controls, {
    control: "mode",
    value: controls.mode,
  });
  return observeSignedRealNumberLineControlTransition(plan, plan.expected);
}

function actionRequestForDomainRequest(
  request: SignedRealNumberLineControlRequest,
): SignedRealNumberLineActionRequest {
  return request.control === "mode" || request.control === "number-kind"
    ? {
        kind: "controller",
        controller: request.control,
        value: request.value,
      }
    : {
        kind: "control",
        control: request.control,
        value: request.value,
      };
}

function actionSnapshot(
  input: SignedRealNumberLineInput,
  controls: SignedRealNumberLineControlState,
  pendingRequest: SignedRealNumberLineActionRequest | null,
): SignedRealNumberLineActionSnapshot {
  return {
    labId: input.labId,
    mode: input.mode,
    configuredState: buildSignedRealNumberLineModel(input).stateKey,
    input: input as unknown as SignedRealNumberLineActionSnapshot["input"],
    controlState:
      controls as unknown as SignedRealNumberLineActionSnapshot["controlState"],
    pendingRequest,
  };
}

function acceptedInitialActionReceipt(
  input: SignedRealNumberLineInput,
  controls: SignedRealNumberLineControlState,
): SignedRealNumberLineActionReceipt {
  const request = {
    kind: "initial",
    topicId: input.labId,
  } as const;
  const settled = actionSnapshot(input, controls, null);
  return createSignedRealNumberLineAcceptedActionReceipt({
    request,
    before: settled,
    requested: actionSnapshot(input, controls, request),
    expected: settled,
    observed: settled,
    projections: [],
  });
}

function inputForMode(
  labId: SignedRealNumberLineLabId,
  mode: SignedRealNumberLineExactMode,
  controls: SignedRealNumberLineControlState,
): SignedRealNumberLineInput {
  const precision = 3;
  const exactValue =
    controls.numberKind === "radical"
      ? radical(controls.valueRadicand, 2, controls.valueSign)
      : rational(-3, 2);
  switch (mode) {
    case "locate":
    case "absolute-value":
    case "classify":
    case "estimate":
      return { labId, mode, precision, value: exactValue };
    case "radical":
      return {
        labId,
        mode,
        precision,
        value: radical(controls.valueRadicand, 2, controls.valueSign),
      };
    case "compare":
      return {
        labId,
        mode,
        precision,
        left: exactValue,
        right: rational(
          controls.rightRationalNumerator,
          controls.rightRationalDenominator,
        ),
      };
    case "add":
    case "subtract":
      return {
        labId,
        mode,
        precision,
        start: rational(-3, 2),
        step: rational(mode === "add" ? 5 : -5, 4),
      };
    case "multiply":
    case "divide":
      return {
        labId,
        mode,
        precision,
        left: rational(-3, 2),
        right: rational(
          controls.rightRationalNumerator,
          controls.rightRationalDenominator,
        ),
      };
    case "opposite":
      return { labId, mode, precision, value: rational(-7, 3) };
    case "square-root":
    case "cube-root":
      return {
        labId,
        mode,
        precision,
        radicand:
          mode === "cube-root"
            ? controls.valueSign * controls.valueRadicand
            : controls.valueRadicand,
      };
    case "simplify":
    case "estimate-check":
      return {
        labId,
        mode,
        precision,
        value: surd(1, controls.valueRadicand),
      };
    case "radical-add":
    case "radical-subtract":
      return {
        labId,
        mode,
        precision,
        left: surd(2, controls.valueRadicand),
        right: surd(
          controls.rightSurdCoefficientNumerator,
          controls.rightSurdRadicand,
          controls.rightSurdCoefficientDenominator,
        ),
      };
    case "radical-multiply":
    case "radical-divide":
      return {
        labId,
        mode,
        precision,
        left: surd(1, controls.valueRadicand),
        right: surd(
          controls.rightSurdCoefficientNumerator,
          controls.rightSurdRadicand,
          controls.rightSurdCoefficientDenominator,
        ),
      };
  }
}

export function createSignedRealNumberLineLearnerState(
  labId: SignedRealNumberLineLabId,
  initialInput: SignedRealNumberLineInput =
    SIGNED_REAL_NUMBER_LINE_TOPIC_RESET_INPUTS[labId],
): SignedRealNumberLineLearnerState {
  const input = canonicalizeInput(initialInput, labId);
  buildSignedRealNumberLineModel(input);
  const controls = controlStateFromInput(input);
  return deepFreeze({
    input,
    controls,
    receipt: confirmedReceipt(controls),
    actionReceipt: acceptedInitialActionReceipt(input, controls),
  });
}

function inputAfterControlTransition(
  current: SignedRealNumberLineInput,
  expected: SignedRealNumberLineControlState,
  request: SignedRealNumberLineControlRequest,
): SignedRealNumberLineInput {
  if (request.control === "mode" || request.control === "number-kind") {
    return inputForMode(current.labId, expected.mode, expected);
  }
  if (request.control === "value-sign" || request.control === "value-radicand") {
    if (
      current.mode === "locate" ||
      current.mode === "absolute-value" ||
      current.mode === "radical" ||
      current.mode === "classify" ||
      current.mode === "estimate"
    ) {
      if (current.value.kind !== "radical") return current;
      return {
        ...current,
        value: radical(
          expected.valueRadicand,
          current.value.index,
          expected.valueSign,
        ),
      };
    }
    if (current.mode === "compare" && current.left.kind === "radical") {
      return {
        ...current,
        left: radical(
          expected.valueRadicand,
          current.left.index,
          expected.valueSign,
        ),
      };
    }
    if (current.mode === "square-root" || current.mode === "cube-root") {
      return {
        ...current,
        radicand:
          current.mode === "cube-root"
            ? expected.valueSign * expected.valueRadicand
            : expected.valueRadicand,
      };
    }
    return current;
  }
  if (
    request.control === "right-rational-numerator" ||
    request.control === "right-rational-denominator"
  ) {
    if (
      (current.mode === "compare" ||
        current.mode === "multiply" ||
        current.mode === "divide") &&
      current.right.kind === "rational"
    ) {
      return {
        ...current,
        right: rational(
          expected.rightRationalNumerator,
          expected.rightRationalDenominator,
        ),
      };
    }
    return current;
  }
  if (
    request.control === "right-surd-coefficient-numerator" ||
    request.control === "right-surd-coefficient-denominator" ||
    request.control === "right-surd-radicand"
  ) {
    if (
      current.mode === "radical-add" ||
      current.mode === "radical-subtract" ||
      current.mode === "radical-multiply" ||
      current.mode === "radical-divide"
    ) {
      return {
        ...current,
        right: surd(
          expected.rightSurdCoefficientNumerator,
          expected.rightSurdRadicand,
          expected.rightSurdCoefficientDenominator,
        ),
      };
    }
  }
  return current;
}

export function applySignedRealNumberLineLearnerDomainRequest(
  state: SignedRealNumberLineLearnerState,
  request: SignedRealNumberLineControlRequest,
): SignedRealNumberLineLearnerState {
  const plan = planSignedRealNumberLineControlTransition(
    state.controls,
    request,
  );
  const input = canonicalizeInput(
    inputAfterControlTransition(state.input, plan.expected, request),
    state.input.labId,
  );
  buildSignedRealNumberLineModel(input);
  const observed = controlStateFromInput(input);
  const receipt = observeSignedRealNumberLineControlTransition(plan, observed);
  const actionRequest = actionRequestForDomainRequest(request);
  const before = actionSnapshot(state.input, state.controls, null);
  const settled = actionSnapshot(input, receipt.observed, null);
  const actionReceipt = createSignedRealNumberLineAcceptedActionReceipt({
    request: actionRequest,
    before,
    requested: actionSnapshot(state.input, state.controls, actionRequest),
    expected: settled,
    observed: settled,
    projections: receipt.projections,
  });
  return deepFreeze({
    input,
    controls: receipt.observed,
    receipt,
    actionReceipt,
  });
}

export function replaceSignedRealNumberLineLearnerInput(
  state: SignedRealNumberLineLearnerState,
  input: SignedRealNumberLineInput,
  request: SignedRealNumberLineActionRequest,
): SignedRealNumberLineLearnerState {
  const nextInput = canonicalizeInput(input, state.input.labId);
  buildSignedRealNumberLineModel(nextInput);
  const controls = controlStateFromInput(nextInput);
  const before = actionSnapshot(state.input, state.controls, null);
  const settled = actionSnapshot(nextInput, controls, null);
  const actionReceipt = createSignedRealNumberLineAcceptedActionReceipt({
    request,
    before,
    requested: actionSnapshot(state.input, state.controls, request),
    expected: settled,
    observed: settled,
    projections: [],
  });
  return deepFreeze({
    input: nextInput,
    controls,
    receipt: confirmedReceipt(controls),
    actionReceipt,
  });
}

export function rejectSignedRealNumberLineLearnerAction(
  state: SignedRealNumberLineLearnerState,
  request: SignedRealNumberLineActionRequest,
  rejection: SignedRealNumberLineControlDomainErrorCode,
): SignedRealNumberLineLearnerState {
  const before = actionSnapshot(state.input, state.controls, null);
  const actionReceipt = createSignedRealNumberLineRejectedActionReceipt({
    request,
    before,
    requested: actionSnapshot(state.input, state.controls, request),
    rejection,
  });
  return deepFreeze({ ...state, actionReceipt });
}

export function resetSignedRealNumberLineLearnerState(
  state: SignedRealNumberLineLearnerState,
): SignedRealNumberLineLearnerState {
  const resetState = createSignedRealNumberLineLearnerState(state.input.labId);
  const request = {
    kind: "reset",
    topicId: state.input.labId,
  } as const;
  const before = actionSnapshot(state.input, state.controls, null);
  const settled = actionSnapshot(
    resetState.input,
    resetState.controls,
    null,
  );
  return deepFreeze({
    ...resetState,
    actionReceipt: createSignedRealNumberLineAcceptedActionReceipt({
      request,
      before,
      requested: actionSnapshot(state.input, state.controls, request),
      expected: settled,
      observed: settled,
      projections: [],
    }),
  });
}

function rationalText(value: ExactRational) {
  return value.denominator === 1
    ? String(value.numerator)
    : `${value.numerator}/${value.denominator}`;
}

function relationSymbol(result: -1 | 0 | 1) {
  return result < 0 ? "<" : result > 0 ? ">" : "=";
}

function sideCopy(side: SignedRealNumberLineModel["side"]) {
  if (side === "negative") return SIGNED_REAL_NUMBER_LINE_COPY.negativeSide;
  if (side === "positive") return SIGNED_REAL_NUMBER_LINE_COPY.positiveSide;
  return SIGNED_REAL_NUMBER_LINE_COPY.atOrigin;
}

function displayTick(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0+$/u, "").replace(/\.$/u, "");
}

type RangeControlProps = {
  parameter: string;
  label: string;
  value: number;
  min: number;
  max: number;
  output?: string;
  onChange: (value: number) => void;
};

function RangeControl({
  parameter,
  label,
  value,
  min,
  max,
  output = String(value),
  onChange,
}: RangeControlProps) {
  return (
    <label className="block min-w-0 text-sm font-bold text-slate-700 dark:text-slate-200">
      <span className="flex min-w-0 items-center justify-between gap-3">
        <span className="min-w-0 break-words">{label}</span>
        <output className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
          {output}
        </output>
      </span>
      <input
        data-viz-control="range"
        data-viz-parameter={parameter}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        aria-label={label}
        aria-valuetext={output}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        className="focus-ring min-h-11 w-full cursor-pointer accent-cyan-600"
      />
    </label>
  );
}

type ExactValueEditorProps = {
  prefix: "value" | "left" | "right";
  label: string;
  value: ExactRealInput;
  allowKind: boolean;
  onChange: (
    value: ExactRealInput,
    control: string,
    requestedValue: string | number,
  ) => void;
  onKindRequest?: (kind: "rational" | "radical") => void;
  onSignRequest?: (sign: -1 | 1) => void;
  onRadicandRequest?: (radicand: number) => void;
};

function ExactValueEditor({
  prefix,
  label,
  value,
  allowKind,
  onChange,
  onKindRequest,
  onSignRequest,
  onRadicandRequest,
}: ExactValueEditorProps) {
  const { t } = useSettings();
  return (
    <fieldset className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
      <legend className="px-1 text-sm font-black text-slate-950 dark:text-white">
        {label}
      </legend>
      {allowKind ? (
        <label className="block min-w-0 text-sm font-bold text-slate-700 dark:text-slate-200">
          <span>{t(SIGNED_REAL_NUMBER_LINE_COPY.numberKind)}</span>
          <select
            data-viz-control="select"
            data-viz-parameter={`${prefix}-kind`}
            value={value.kind}
            aria-label={`${label}: ${t(SIGNED_REAL_NUMBER_LINE_COPY.numberKind)}`}
            onChange={(event) => {
              const kind =
                event.currentTarget.value === "radical"
                  ? "radical"
                  : "rational";
              if (onKindRequest) onKindRequest(kind);
              else
                onChange(
                  kind === "radical" ? radical(2) : rational(-3, 2),
                  `${prefix}-kind`,
                  kind,
                );
            }}
            className="focus-ring mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
          >
            <option value="rational">
              {t(SIGNED_REAL_NUMBER_LINE_COPY.rational)}
            </option>
            <option value="radical">
              {t(SIGNED_REAL_NUMBER_LINE_COPY.radical)}
            </option>
          </select>
        </label>
      ) : null}
      {value.kind === "rational" ? (
        <div className="space-y-3">
          <RangeControl
            parameter={`${prefix}-numerator`}
            label={t(SIGNED_REAL_NUMBER_LINE_COPY.signedNumerator)}
            value={value.numerator}
            min={-UI_MAX_ABS_RATIONAL_COMPONENT}
            max={UI_MAX_ABS_RATIONAL_COMPONENT}
            onChange={(numerator) =>
              onChange(
                {
                  ...value,
                  numerator: clampInteger(
                    numerator,
                    -UI_MAX_ABS_RATIONAL_COMPONENT,
                    UI_MAX_ABS_RATIONAL_COMPONENT,
                  ),
                },
                `${prefix}-numerator`,
                numerator,
              )
            }
          />
          <RangeControl
            parameter={`${prefix}-denominator`}
            label={t(SIGNED_REAL_NUMBER_LINE_COPY.denominator)}
            value={value.denominator}
            min={1}
            max={UI_MAX_DENOMINATOR}
            onChange={(denominator) =>
              onChange(
                {
                  ...value,
                  denominator: clampInteger(
                    denominator,
                    1,
                    UI_MAX_DENOMINATOR,
                  ),
                },
                `${prefix}-denominator`,
                denominator,
              )
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block min-w-0 text-sm font-bold text-slate-700 dark:text-slate-200">
            <span>{t(SIGNED_REAL_NUMBER_LINE_COPY.radicalSign)}</span>
            <select
              data-viz-control="select"
              data-viz-parameter={`${prefix}-sign`}
              value={value.sign ?? 1}
              aria-label={`${label}: ${t(SIGNED_REAL_NUMBER_LINE_COPY.radicalSign)}`}
              onChange={(event) => {
                const sign =
                  Number(event.currentTarget.value) === -1 ? -1 : 1;
                if (onSignRequest) onSignRequest(sign);
                else
                  onChange(
                    { ...value, sign },
                    `${prefix}-sign`,
                    sign,
                  );
              }}
              className="focus-ring mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
            >
              <option value={-1}>
                − {t(SIGNED_REAL_NUMBER_LINE_COPY.negative)}
              </option>
              <option value={1}>
                + {t(SIGNED_REAL_NUMBER_LINE_COPY.positive)}
              </option>
            </select>
          </label>
          <RangeControl
            parameter={`${prefix}-radicand`}
            label={t(SIGNED_REAL_NUMBER_LINE_COPY.radicand)}
            value={value.radicand}
            min={0}
            max={UI_MAX_RADICAND}
            onChange={(radicand) => {
              const next = clampInteger(radicand, 0, UI_MAX_RADICAND);
              if (onRadicandRequest) onRadicandRequest(next);
              else
                onChange(
                  {
                    ...value,
                    radicand: next,
                    sign: next === 0 ? 1 : value.sign,
                  },
                  `${prefix}-radicand`,
                  radicand,
                );
            }}
          />
          <RangeControl
            parameter={`${prefix}-index`}
            label={t(SIGNED_REAL_NUMBER_LINE_COPY.radicalIndex)}
            value={value.index}
            min={SIGNED_REAL_NUMBER_LINE_DOMAIN.minRadicalIndex}
            max={SIGNED_REAL_NUMBER_LINE_DOMAIN.maxRadicalIndex}
            onChange={(index) =>
              onChange(
                {
                  ...value,
                  index: clampInteger(
                    index,
                    SIGNED_REAL_NUMBER_LINE_DOMAIN.minRadicalIndex,
                    SIGNED_REAL_NUMBER_LINE_DOMAIN.maxRadicalIndex,
                  ),
                },
                `${prefix}-index`,
                index,
              )
            }
          />
        </div>
      )}
    </fieldset>
  );
}

function RationalEditor({
  prefix,
  label,
  value,
  onChange,
}: {
  prefix: "value" | "left" | "right" | "start" | "step";
  label: string;
  value: ExactRationalInput;
  onChange: (value: ExactRationalInput, control: "numerator" | "denominator") => void;
}) {
  const { t } = useSettings();
  return (
    <fieldset className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
      <legend className="px-1 text-sm font-black text-slate-950 dark:text-white">
        {label}
      </legend>
      <RangeControl
        parameter={`${prefix}-numerator`}
        label={t(SIGNED_REAL_NUMBER_LINE_COPY.signedNumerator)}
        value={value.numerator}
        min={-UI_MAX_ABS_RATIONAL_COMPONENT}
        max={UI_MAX_ABS_RATIONAL_COMPONENT}
        onChange={(numerator) =>
          onChange(
            {
              ...value,
              numerator: clampInteger(
                numerator,
                -UI_MAX_ABS_RATIONAL_COMPONENT,
                UI_MAX_ABS_RATIONAL_COMPONENT,
              ),
            },
            "numerator",
          )
        }
      />
      <RangeControl
        parameter={`${prefix}-denominator`}
        label={t(SIGNED_REAL_NUMBER_LINE_COPY.denominator)}
        value={value.denominator}
        min={1}
        max={UI_MAX_DENOMINATOR}
        onChange={(denominator) =>
          onChange(
            {
              ...value,
              denominator: clampInteger(denominator, 1, UI_MAX_DENOMINATOR),
            },
            "denominator",
          )
        }
      />
    </fieldset>
  );
}

function SurdEditor({
  prefix,
  label,
  value,
  onChange,
}: {
  prefix: "value" | "left" | "right";
  label: string;
  value: QuadraticSurdInput;
  onChange: (
    value: QuadraticSurdInput,
    control: "coefficient-numerator" | "coefficient-denominator" | "radicand",
  ) => void;
}) {
  const { t } = useSettings();
  return (
    <fieldset className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
      <legend className="px-1 text-sm font-black text-slate-950 dark:text-white">
        {label}
      </legend>
      <RangeControl
        parameter={`${prefix}-coefficient-numerator`}
        label={t(SIGNED_REAL_NUMBER_LINE_COPY.coefficientNumerator)}
        value={value.coefficient.numerator}
        min={-UI_MAX_ABS_RATIONAL_COMPONENT}
        max={UI_MAX_ABS_RATIONAL_COMPONENT}
        onChange={(numerator) =>
          onChange(
            {
              ...value,
              coefficient: {
                ...value.coefficient,
                numerator: clampInteger(
                  numerator,
                  -UI_MAX_ABS_RATIONAL_COMPONENT,
                  UI_MAX_ABS_RATIONAL_COMPONENT,
                ),
              },
            },
            "coefficient-numerator",
          )
        }
      />
      <RangeControl
        parameter={`${prefix}-coefficient-denominator`}
        label={t(SIGNED_REAL_NUMBER_LINE_COPY.coefficientDenominator)}
        value={value.coefficient.denominator}
        min={1}
        max={UI_MAX_DENOMINATOR}
        onChange={(denominator) =>
          onChange(
            {
              ...value,
              coefficient: {
                ...value.coefficient,
                denominator: clampInteger(denominator, 1, UI_MAX_DENOMINATOR),
              },
            },
            "coefficient-denominator",
          )
        }
      />
      <RangeControl
        parameter={`${prefix}-radicand`}
        label={t(SIGNED_REAL_NUMBER_LINE_COPY.radicand)}
        value={value.radicand}
        min={0}
        max={UI_MAX_RADICAND}
        onChange={(radicand) =>
          onChange(
            { ...value, radicand: clampInteger(radicand, 0, UI_MAX_RADICAND) },
            "radicand",
          )
        }
      />
    </fieldset>
  );
}

function projectionModel(
  value: ExactRealInput,
  precision: number,
): SignedRealNumberLineModel {
  return buildSignedRealNumberLineModel({
    labId:
      value.kind === "rational"
        ? GEOMETRY_RATIONAL_LAB
        : "bnu-junior-s2-upper-real-numbers",
    mode: "locate",
    precision,
    value,
  });
}

function geometryForModel(
  model: SignedRealNumberLineModel,
  input: SignedRealNumberLineInput,
): SignedRealNumberLineGeometry {
  const points = [
    {
      semanticId: "origin",
      model: projectionModel(rational(0), model.precision),
    },
    { semanticId: "primary", model },
  ];
  if (input.mode === "compare") {
    points.push({
      semanticId: "comparison",
      model: projectionModel(input.right, model.precision),
    });
  }
  if (model.operation) {
    points.push({
      semanticId: "operation-start",
      model: projectionModel(
        rational(
          model.operation.start.numerator,
          model.operation.start.denominator,
        ),
        model.precision,
      ),
    });
    points.push({
      semanticId: "operation-endpoint",
      model: projectionModel(
        rational(
          model.operation.endpoint.numerator,
          model.operation.endpoint.denominator,
        ),
        model.precision,
      ),
    });
  }
  return buildSignedRealNumberLineGeometry({ points });
}

function geometryPointLabel(
  semanticId: string,
  pointSymbolic: string,
  t: ReturnType<typeof useSettings>["t"],
) {
  if (semanticId === "origin") {
    return `${t(SIGNED_REAL_NUMBER_LINE_COPY.origin)} 0`;
  }
  if (semanticId === "comparison") {
    return `${t(SIGNED_REAL_NUMBER_LINE_COPY.comparisonPoint)} ${pointSymbolic}`;
  }
  if (semanticId === "operation-start") {
    return `${t(SIGNED_REAL_NUMBER_LINE_COPY.operationStart)} ${pointSymbolic}`;
  }
  if (semanticId === "operation-endpoint") {
    return `${t(SIGNED_REAL_NUMBER_LINE_COPY.operationEndpoint)} ${pointSymbolic}`;
  }
  return `${t(SIGNED_REAL_NUMBER_LINE_COPY.primaryPoint)} ${pointSymbolic}`;
}

function pointColor(semanticId: string, model: SignedRealNumberLineModel) {
  if (semanticId === "origin") return "#d97706";
  if (semanticId === "comparison") return "#7c3aed";
  if (semanticId.startsWith("operation")) return "#7c3aed";
  if (model.side === "negative") return "#e11d48";
  if (model.side === "positive") return "#0891b2";
  return "#d97706";
}

function SignedRealNumberLineSurface({
  model,
  input,
}: {
  model: SignedRealNumberLineModel;
  input: SignedRealNumberLineInput;
}) {
  const { t, theme } = useSettings();
  const colors = visualizationThemeForTheme(theme);
  const panHintId = useId();
  const geometry = useMemo(() => geometryForModel(model, input), [input, model]);
  const byId = new Map(geometry.points.map((point) => [point.semanticId, point]));
  const origin = byId.get("origin");
  const primary = byId.get("primary");
  const operationStart = byId.get("operation-start");
  const operationEndpoint = byId.get("operation-endpoint");
  if (!origin || !primary) throw new Error("Geometry omitted required points.");
  const tickStep = (geometry.axisMax - geometry.axisMin) / 4;
  const ticks = Array.from(
    { length: 5 },
    (_, index) => geometry.axisMin + tickStep * index,
  );
  const xForTick = (value: number) =>
    geometry.svgXMin + (value - geometry.axisMin) * geometry.pixelsPerUnit;

  return (
    <section className={colors.paddedSurfaceClassName}>
      <p
        id={panHintId}
        data-viz-pan-hint
        className="mb-2 text-xs font-bold text-slate-600 dark:text-slate-300 sm:hidden"
      >
        {t(SIGNED_REAL_NUMBER_LINE_COPY.panHint)}
      </p>
      <div
        data-viz-scroll-container
        aria-describedby={panHintId}
        aria-label={t(SIGNED_REAL_NUMBER_LINE_COPY.surfaceLabel)}
        tabIndex={0}
        className="focus-ring max-w-full touch-pan-x overflow-x-auto overscroll-x-contain rounded-2xl"
      >
        <svg
          data-viz-surface
          data-viz-svg-background="opaque"
          data-viz-geometry={geometry.version}
          data-viz-geometry-state={geometry.stateKey}
          role="img"
          aria-label={t(SIGNED_REAL_NUMBER_LINE_COPY.surfaceLabel)}
          viewBox="0 0 960 390"
          preserveAspectRatio="xMidYMid meet"
          className="block h-auto min-h-[330px] w-full min-w-[760px]"
        >
          <rect width="960" height="390" rx="24" fill={colors.svgBackground} />
          <rect
            x="20"
            y="20"
            width="920"
            height="350"
            rx="20"
            fill={colors.panelFill}
            stroke={colors.panelStroke}
            strokeWidth="2"
          />
          <text x="48" y="58" fill={colors.text} fontSize="21" fontWeight="900">
            {t(SIGNED_REAL_NUMBER_LINE_COPY.title)}
          </text>
          <text
            x="912"
            y="58"
            textAnchor="end"
            fill={colors.textMuted}
            fontSize="15"
            fontWeight="800"
          >
            {`${t(sideCopy(model.side))}: ${model.point.symbolic}`}
          </text>
          <line
            x1={geometry.svgXMin}
            y1="190"
            x2={geometry.svgXMax}
            y2="190"
            stroke={colors.axisStrong}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path d="M 70 190 L 84 181 L 84 199 Z" fill={colors.axisStrong} />
          <path d="M 890 190 L 876 181 L 876 199 Z" fill={colors.axisStrong} />
          <text x="70" y="106" fill={colors.textMuted} fontSize="14" fontWeight="800">
            {t(SIGNED_REAL_NUMBER_LINE_COPY.negativeSide)}
          </text>
          <text
            x="890"
            y="106"
            textAnchor="end"
            fill={colors.textMuted}
            fontSize="14"
            fontWeight="800"
          >
            {t(SIGNED_REAL_NUMBER_LINE_COPY.positiveSide)}
          </text>
          {ticks.map((tick) => {
            const x = xForTick(tick);
            return (
              <g key={tick}>
                <line
                  x1={x}
                  y1="179"
                  x2={x}
                  y2="201"
                  stroke={colors.axisStrong}
                  strokeWidth={tick === 0 ? 3 : 2}
                />
                <text
                  x={x}
                  y="224"
                  textAnchor="middle"
                  fill={colors.tickText}
                  fontSize="13"
                  fontWeight="800"
                >
                  {displayTick(tick)}
                </text>
              </g>
            );
          })}
          {model.operation && operationStart && operationEndpoint ? (
            <g data-viz-operation-kind={model.operation.kind}>
              <line
                x1={operationStart.renderedX}
                y1="142"
                x2={operationEndpoint.renderedX}
                y2="142"
                stroke="#7c3aed"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <text
                x={(operationStart.renderedX + operationEndpoint.renderedX) / 2}
                y="130"
                textAnchor="middle"
                fill="#6d28d9"
                fontSize="14"
                fontWeight="900"
              >
                {`${t(SIGNED_REAL_NUMBER_LINE_COPY.signedStep)} ${model.operation.signedStep.symbolic}`}
              </text>
            </g>
          ) : null}
          {geometry.points.map((point, index) => {
            const color = pointColor(point.semanticId, model);
            const labelY = index % 2 === 0 ? 92 : 286;
            return (
              <g
                key={point.semanticId}
                data-viz-mark
                data-viz-name={
                  point.semanticId === "primary"
                    ? "signed-point"
                    : point.semanticId
                }
                data-viz-geometry-point={point.semanticId}
                data-viz-exact-key={point.exactKey}
                data-viz-colocation-owner={point.coLocation.ownerId}
                data-viz-colocation-reason={point.coLocation.reason}
                data-viz-render-marker={String(point.coLocation.renderMarker)}
                data-viz-pixel-lower={point.pixelLower}
                data-viz-pixel-upper={point.pixelUpper}
                data-viz-rendered-x={point.renderedX}
                data-viz-pixel-error-bound={point.pixelErrorBound}
              >
                {point.pixelLower !== point.pixelUpper ? (
                  <line
                    data-viz-certified-interval
                    x1={point.pixelLower}
                    y1="190"
                    x2={point.pixelUpper}
                    y2="190"
                    stroke={color}
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                ) : null}
                {point.coLocation.renderMarker ? (
                  <>
                    <circle
                      data-viz-point-marker
                      cx={point.renderedX}
                      cy="190"
                      r={point.semanticId === "origin" ? 9 : 12}
                      fill={color}
                      stroke={colors.pointStroke}
                      strokeWidth="3"
                    />
                    <line
                      x1={point.renderedX}
                      y1={point.semanticId === "origin" ? 176 : 174}
                      x2={point.renderedX}
                      y2={labelY < 190 ? labelY + 10 : labelY - 20}
                      stroke={color}
                      strokeWidth="3"
                    />
                    <text
                      x={point.renderedX}
                      y={labelY}
                      textAnchor="middle"
                      fill={color}
                      fontSize="15"
                      fontWeight="900"
                    >
                      {geometryPointLabel(
                        point.semanticId,
                        point.exactSymbolic,
                        t,
                      )}
                    </text>
                  </>
                ) : null}
              </g>
            );
          })}
          {model.realConcept?.root ? (
            <g
              data-viz-mark
              data-viz-name="root-point"
              data-viz-root-defined={String(model.realConcept.root.defined)}
              data-viz-root-exact={String(model.realConcept.root.exact)}
            >
              <path
                d={`M ${primary.renderedX - 18} 242 L ${primary.renderedX - 10} 250 L ${primary.renderedX} 230 L ${primary.renderedX + 20} 230`}
                fill="none"
                stroke="#0891b2"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          ) : null}
          {model.point.kind === "radical" ? (
            <g data-viz-mark data-viz-name="radical-point">
              <path
                d={`M ${primary.renderedX - 17} 164 L ${primary.renderedX - 9} 172 L ${primary.renderedX} 151 L ${primary.renderedX + 18} 151`}
                fill="none"
                stroke="#0891b2"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          ) : null}
          <g
            data-viz-mark
            data-viz-name="absolute-distance"
            data-viz-absolute-distance={model.absoluteValueDistance.exact.symbolic}
          >
            <line
              x1={origin.renderedX}
              y1="330"
              x2={primary.renderedX}
              y2="330"
              stroke="#047857"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <text
              x={(origin.renderedX + primary.renderedX) / 2}
              y="354"
              textAnchor="middle"
              fill="#047857"
              fontSize="14"
              fontWeight="900"
            >
              {`${t(SIGNED_REAL_NUMBER_LINE_COPY.absoluteDistance)} = ${model.absoluteValueDistance.exact.symbolic}`}
            </text>
          </g>
        </svg>
      </div>

      <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-2">
        <article
          data-viz-mark
          data-viz-name="exact-symbolic-value"
          data-viz-exact-value={model.point.symbolic}
          className="min-w-0 rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-cyan-950 dark:border-cyan-700 dark:bg-cyan-950 dark:text-cyan-100"
        >
          <h3 className="text-xs font-black uppercase tracking-[0.12em]">
            {t(SIGNED_REAL_NUMBER_LINE_COPY.exactValue)}
          </h3>
          <p className="mt-1 break-words font-mono text-lg font-black">
            {model.point.symbolic}
          </p>
          <p className="mt-1 text-xs font-bold">{t(sideCopy(model.side))}</p>
        </article>

        <article
          data-viz-mark
          data-viz-name="decimal-receipt"
          data-viz-decimal={model.approximation.text}
          data-viz-decimal-exact={String(model.approximation.exact)}
          className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
            {t(SIGNED_REAL_NUMBER_LINE_COPY.decimalApproximation)}
          </h3>
          <p className="mt-1 font-mono text-lg font-black">
            {model.approximation.text}
          </p>
        </article>

        <article
          data-viz-mark
          data-viz-name="decimal-bounds"
          data-viz-bound-lower={rationalText(model.approximation.interval.lower)}
          data-viz-bound-upper={rationalText(model.approximation.interval.upper)}
          data-viz-error-bound={rationalText(model.approximation.errorBound)}
          className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        >
          <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
            {t(SIGNED_REAL_NUMBER_LINE_COPY.decimalBounds)}
          </h3>
          <p className="mt-1 break-words font-mono text-sm font-black">
            {`${rationalText(model.approximation.interval.lower)} ≤ ${model.point.symbolic} ≤ ${rationalText(model.approximation.interval.upper)}`}
          </p>
          <p className="mt-1 break-words font-mono text-xs font-bold">
            {`${t(SIGNED_REAL_NUMBER_LINE_COPY.errorBound)}: |${model.point.symbolic} − ${model.approximation.text}| ≤ ${rationalText(model.approximation.errorBound)}`}
          </p>
        </article>

        <article
          data-viz-mark
          data-viz-name="geometry-receipt"
          data-viz-geometry-candidates={geometry.coverage.candidateCount}
          data-viz-geometry-marker-owners={geometry.coverage.markerOwnerCount}
          data-viz-geometry-certified={geometry.coverage.certifiedPointCount}
          className="min-w-0 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100"
        >
          <h3 className="text-xs font-black uppercase tracking-[0.12em]">
            {t(SIGNED_REAL_NUMBER_LINE_COPY.geometryReceipt)}
          </h3>
          <p className="mt-1 break-words font-mono text-sm font-black">
            {`${t(SIGNED_REAL_NUMBER_LINE_COPY.geometryRange)}: ${geometry.axisMin} ≤ x ≤ ${geometry.axisMax}`}
          </p>
          <p className="mt-1 break-words font-mono text-xs font-bold">
            {`${t(SIGNED_REAL_NUMBER_LINE_COPY.geometryError)} ≤ ${primary.pixelErrorBound}`}
          </p>
        </article>

        {model.comparison ? (
          <article
            data-viz-mark
            data-viz-name="comparison-proof"
            data-viz-comparison-strategy={model.comparison.exactReceipt.strategy}
            data-viz-comparison-relation={model.comparison.relation}
            className="min-w-0 rounded-2xl border border-violet-200 bg-violet-50 p-3 text-violet-950 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-100 md:col-span-2"
          >
            <h3 className="text-xs font-black uppercase tracking-[0.12em]">
              {t(SIGNED_REAL_NUMBER_LINE_COPY.comparisonProof)}
            </h3>
            <p className="mt-1 break-words font-mono text-base font-black">
              {`${model.comparison.left.symbolic} ${relationSymbol(model.comparison.result)} ${model.comparison.right.symbolic}`}
            </p>
            <p className="mt-1 break-words font-mono text-sm font-bold">
              {`${model.comparison.exactReceipt.leftCrossProduct} ${relationSymbol(model.comparison.exactReceipt.magnitudeResult)} ${model.comparison.exactReceipt.rightCrossProduct}`}
            </p>
          </article>
        ) : null}

        {model.operation ? (
          <article
            data-viz-mark
            data-viz-name="operation-receipt"
            data-viz-operation-kind={model.operation.kind}
            className="min-w-0 rounded-2xl border border-violet-200 bg-violet-50 p-3 text-violet-950 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-100 md:col-span-2"
          >
            <h3 className="text-xs font-black uppercase tracking-[0.12em]">
              {t(SIGNED_REAL_NUMBER_LINE_COPY.operationMotion)}
            </h3>
            <p className="mt-1 break-words font-mono text-base font-black">
              {`${model.operation.start.symbolic} + (${model.operation.signedStep.symbolic}) = ${model.operation.endpoint.symbolic}`}
            </p>
          </article>
        ) : null}

        {model.rationalOperation ? (
          <article
            data-viz-mark
            data-viz-name="rational-operation-receipt"
            data-viz-rational-operation={model.rationalOperation.kind}
            data-viz-rational-reconstruction={String(
              model.rationalOperation.reconstructionPassed,
            )}
            className="min-w-0 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-blue-950 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100 md:col-span-2"
          >
            <h3 className="text-xs font-black uppercase tracking-[0.12em]">
              {t(SIGNED_REAL_NUMBER_LINE_COPY.rationalOperation)}
            </h3>
            <p className="mt-1 break-words font-mono text-base font-black">
              {model.rationalOperation.reconstruction}
            </p>
            <p className="mt-1 break-words font-mono text-sm font-bold">
              {`${t(SIGNED_REAL_NUMBER_LINE_COPY.result)}: ${model.rationalOperation.result.symbolic}`}
            </p>
          </article>
        ) : null}

        {model.realConcept ? (
          <article
            data-viz-mark
            data-viz-name="real-concept-receipt"
            data-viz-real-concept={model.realConcept.kind}
            data-viz-root-defined={
              model.realConcept.root
                ? String(model.realConcept.root.defined)
                : undefined
            }
            className="min-w-0 rounded-2xl border border-teal-200 bg-teal-50 p-3 text-teal-950 dark:border-teal-700 dark:bg-teal-950 dark:text-teal-100 md:col-span-2"
          >
            <h3 className="text-xs font-black uppercase tracking-[0.12em]">
              {t(SIGNED_REAL_NUMBER_LINE_COPY.realConcept)}
            </h3>
            {model.realConcept.classification ? (
              <p className="mt-1 break-words text-sm font-black">
                {`${t(SIGNED_REAL_NUMBER_LINE_COPY.classification)}: ${model.realConcept.classification
                  .map((value) =>
                    t(SIGNED_REAL_NUMBER_LINE_COPY.classifications[value]),
                  )
                  .join(" · ")}`}
              </p>
            ) : null}
            {model.realConcept.root ? (
              <p className="mt-1 break-words font-mono text-sm font-black">
                {`${t(SIGNED_REAL_NUMBER_LINE_COPY.defined)}: ${model.realConcept.root.defined ? t(SIGNED_REAL_NUMBER_LINE_COPY.yes) : t(SIGNED_REAL_NUMBER_LINE_COPY.no)} · ${t(SIGNED_REAL_NUMBER_LINE_COPY.exactValue)}: ${model.point.symbolic}`}
              </p>
            ) : null}
          </article>
        ) : null}

        {model.radicalOperation ? (
          <article
            data-viz-mark
            data-viz-name="quadratic-radical-receipt"
            data-viz-radical-operation={model.radicalOperation.kind}
            data-viz-radical-defined={String(model.radicalOperation.defined)}
            data-viz-radical-combinable={String(
              model.radicalOperation.combinable,
            )}
            className="min-w-0 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100 md:col-span-2"
          >
            <h3 className="text-xs font-black uppercase tracking-[0.12em]">
              {t(SIGNED_REAL_NUMBER_LINE_COPY.radicalOperation)}
            </h3>
            <p className="mt-1 break-words font-mono text-base font-black">
              {model.radicalOperation.reconstruction}
            </p>
            <p className="mt-1 break-words font-mono text-sm font-bold">
              {`${t(SIGNED_REAL_NUMBER_LINE_COPY.result)}: ${model.radicalOperation.result.symbolic}`}
            </p>
            <p className="mt-1 break-words text-xs font-bold">
              {model.radicalOperation.combinable
                ? t(SIGNED_REAL_NUMBER_LINE_COPY.combinable)
                : t(SIGNED_REAL_NUMBER_LINE_COPY.unlikeRadicals)}
            </p>
          </article>
        ) : null}

        {model.approximation.powerReceipt ? (
          <article
            data-viz-mark
            data-viz-name="radical-power-receipt"
            data-viz-power-lower={model.approximation.powerReceipt.lowerPower}
            data-viz-power-target={model.approximation.powerReceipt.scaledRadicand}
            data-viz-power-upper={model.approximation.powerReceipt.nextPower}
            className="min-w-0 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100 md:col-span-2"
          >
            <h3 className="text-xs font-black uppercase tracking-[0.12em]">
              {t(SIGNED_REAL_NUMBER_LINE_COPY.radicalPowerProof)}
            </h3>
            <p className="mt-1 break-words font-mono text-sm font-black">
              {`${model.approximation.powerReceipt.lowerPower} ≤ ${model.approximation.powerReceipt.scaledRadicand} < ${model.approximation.powerReceipt.nextPower}`}
            </p>
          </article>
        ) : null}
      </div>
    </section>
  );
}

function controlsForInput(
  state: SignedRealNumberLineLearnerState,
  applyDomain: (request: SignedRealNumberLineControlRequest) => void,
  replaceInput: (
    input: SignedRealNumberLineInput,
    request: SignedRealNumberLineActionRequest,
  ) => void,
  t: ReturnType<typeof useSettings>["t"],
) {
  const input = state.input;
  const primaryExactEditor = (
    value: ExactRealInput,
    prefix: "value" | "left",
    label: string,
    onChange: (
      value: ExactRealInput,
      control: string,
      requestedValue: string | number,
    ) => void,
    allowKind: boolean,
  ) => (
    <ExactValueEditor
      prefix={prefix}
      label={label}
      value={value}
      allowKind={allowKind}
      onChange={onChange}
      onKindRequest={(kind) =>
        applyDomain({ control: "number-kind", value: kind })
      }
      onSignRequest={(sign) =>
        applyDomain({ control: "value-sign", value: sign })
      }
      onRadicandRequest={(radicand) =>
        applyDomain({ control: "value-radicand", value: radicand })
      }
    />
  );

  if (
    input.mode === "locate" ||
    input.mode === "absolute-value" ||
    input.mode === "radical" ||
    input.mode === "classify" ||
    input.mode === "estimate"
  ) {
    const allowKind =
      input.mode !== "radical" &&
      SIGNED_REAL_NUMBER_LINE_TOPIC_PROFILES[input.labId].kind === "real";
    return primaryExactEditor(
      input.value,
      "value",
      t(SIGNED_REAL_NUMBER_LINE_COPY.value),
      (value, control, requestedValue) =>
        replaceInput(
          { ...input, value },
          { kind: "control", control, value: requestedValue },
        ),
      allowKind,
    );
  }
  if (input.mode === "opposite") {
    return (
      <RationalEditor
        prefix="value"
        label={t(SIGNED_REAL_NUMBER_LINE_COPY.value)}
        value={input.value}
        onChange={(value, control) =>
          replaceInput(
            { ...input, value },
            {
              kind: "control",
              control: `value-${control}`,
              value:
                control === "numerator"
                  ? value.numerator
                  : value.denominator,
            },
          )
        }
      />
    );
  }
  if (input.mode === "compare") {
    const realTopic =
      SIGNED_REAL_NUMBER_LINE_TOPIC_PROFILES[input.labId].kind === "real";
    const left = realTopic ? (
      primaryExactEditor(
        input.left,
        "left",
        t(SIGNED_REAL_NUMBER_LINE_COPY.leftValue),
        (value, control, requestedValue) =>
          replaceInput(
            { ...input, left: value },
            { kind: "control", control, value: requestedValue },
          ),
        true,
      )
    ) : (
      <RationalEditor
        prefix="left"
        label={t(SIGNED_REAL_NUMBER_LINE_COPY.leftValue)}
        value={input.left as ExactRationalInput}
        onChange={(left, control) =>
          replaceInput(
            { ...input, left },
            {
              kind: "control",
              control: `left-${control}`,
              value:
                control === "numerator"
                  ? left.numerator
                  : left.denominator,
            },
          )
        }
      />
    );
    const right = realTopic ? (
      <ExactValueEditor
        prefix="right"
        label={t(SIGNED_REAL_NUMBER_LINE_COPY.rightValue)}
        value={input.right}
        allowKind
        onChange={(rightValue, control, requestedValue) =>
          replaceInput(
            { ...input, right: rightValue },
            { kind: "control", control, value: requestedValue },
          )
        }
      />
    ) : (
      <RationalEditor
        prefix="right"
        label={t(SIGNED_REAL_NUMBER_LINE_COPY.rightValue)}
        value={input.right as ExactRationalInput}
        onChange={(rightValue, control) =>
          applyDomain({
            control:
              control === "numerator"
                ? "right-rational-numerator"
                : "right-rational-denominator",
            value:
              control === "numerator"
                ? rightValue.numerator
                : rightValue.denominator,
          })
        }
      />
    );
    return <div className="space-y-3">{left}{right}</div>;
  }
  if (input.mode === "add" || input.mode === "subtract") {
    return (
      <div className="space-y-3">
        <RationalEditor
          prefix="start"
          label={t(SIGNED_REAL_NUMBER_LINE_COPY.start)}
          value={input.start}
          onChange={(start, control) =>
            replaceInput(
              { ...input, start },
              {
                kind: "control",
                control: `start-${control}`,
                value:
                  control === "numerator"
                    ? start.numerator
                    : start.denominator,
              },
            )
          }
        />
        <RationalEditor
          prefix="step"
          label={t(SIGNED_REAL_NUMBER_LINE_COPY.inputStep)}
          value={input.step}
          onChange={(step, control) =>
            replaceInput(
              { ...input, step },
              {
                kind: "control",
                control: `step-${control}`,
                value:
                  control === "numerator"
                    ? step.numerator
                    : step.denominator,
              },
            )
          }
        />
      </div>
    );
  }
  if (input.mode === "multiply" || input.mode === "divide") {
    return (
      <div className="space-y-3">
        <RationalEditor
          prefix="left"
          label={t(SIGNED_REAL_NUMBER_LINE_COPY.leftValue)}
          value={input.left}
          onChange={(left, control) =>
            replaceInput(
              { ...input, left },
              {
                kind: "control",
                control: `left-${control}`,
                value:
                  control === "numerator"
                    ? left.numerator
                    : left.denominator,
              },
            )
          }
        />
        <RationalEditor
          prefix="right"
          label={t(SIGNED_REAL_NUMBER_LINE_COPY.rightValue)}
          value={input.right}
          onChange={(rightValue, control) =>
            applyDomain({
              control:
                control === "numerator"
                  ? "right-rational-numerator"
                  : "right-rational-denominator",
              value:
                control === "numerator"
                  ? rightValue.numerator
                  : rightValue.denominator,
            })
          }
        />
      </div>
    );
  }
  if (input.mode === "square-root" || input.mode === "cube-root") {
    return (
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
        {input.mode === "cube-root" ? (
          <label className="block min-w-0 text-sm font-bold text-slate-700 dark:text-slate-200">
            <span>{t(SIGNED_REAL_NUMBER_LINE_COPY.radicalSign)}</span>
            <select
              data-viz-control="select"
              data-viz-parameter="value-sign"
              value={state.controls.valueSign}
              onChange={(event) =>
                applyDomain({
                  control: "value-sign",
                  value: Number(event.currentTarget.value) === -1 ? -1 : 1,
                })
              }
              className="focus-ring mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
            >
              <option value={-1}>− {t(SIGNED_REAL_NUMBER_LINE_COPY.negative)}</option>
              <option value={1}>+ {t(SIGNED_REAL_NUMBER_LINE_COPY.positive)}</option>
            </select>
          </label>
        ) : null}
        <RangeControl
          parameter="value-radicand"
          label={t(SIGNED_REAL_NUMBER_LINE_COPY.radicand)}
          value={state.controls.valueRadicand}
          min={0}
          max={UI_MAX_RADICAND}
          onChange={(value) =>
            applyDomain({ control: "value-radicand", value })
          }
        />
      </div>
    );
  }
  if (input.mode === "simplify" || input.mode === "estimate-check") {
    return (
      <SurdEditor
        prefix="value"
        label={t(SIGNED_REAL_NUMBER_LINE_COPY.value)}
        value={input.value}
        onChange={(value, control) =>
          replaceInput(
            { ...input, value },
            {
              kind: "control",
              control: `value-${control}`,
              value:
                control === "coefficient-numerator"
                  ? value.coefficient.numerator
                  : control === "coefficient-denominator"
                    ? value.coefficient.denominator
                    : value.radicand,
            },
          )
        }
      />
    );
  }
  if (
    input.mode !== "radical-add" &&
    input.mode !== "radical-subtract" &&
    input.mode !== "radical-multiply" &&
    input.mode !== "radical-divide"
  ) {
    throw new Error("Unsupported exact control surface.");
  }
  return (
    <div className="space-y-3">
      <SurdEditor
        prefix="left"
        label={t(SIGNED_REAL_NUMBER_LINE_COPY.leftValue)}
        value={input.left}
        onChange={(left, control) =>
          replaceInput(
            { ...input, left },
            {
              kind: "control",
              control: `left-${control}`,
              value:
                control === "coefficient-numerator"
                  ? left.coefficient.numerator
                  : control === "coefficient-denominator"
                    ? left.coefficient.denominator
                    : left.radicand,
            },
          )
        }
      />
      <SurdEditor
        prefix="right"
        label={t(SIGNED_REAL_NUMBER_LINE_COPY.rightValue)}
        value={input.right}
        onChange={(right, control) => {
          const controlName: SignedRealNumberLineControlName =
            control === "coefficient-numerator"
              ? "right-surd-coefficient-numerator"
              : control === "coefficient-denominator"
                ? "right-surd-coefficient-denominator"
                : "right-surd-radicand";
          applyDomain({
            control: controlName as
              | "right-surd-coefficient-numerator"
              | "right-surd-coefficient-denominator"
              | "right-surd-radicand",
            value:
              control === "coefficient-numerator"
                ? right.coefficient.numerator
                : control === "coefficient-denominator"
                  ? right.coefficient.denominator
                  : right.radicand,
          });
        }}
      />
    </div>
  );
}

function SignedRealNumberLineLearner({
  lab,
  initialInput,
  controlFooterAction,
}: SignedRealNumberLineLabProps) {
  const { language, t, theme } = useSettings();
  const labId = lab.labId as SignedRealNumberLineLabId;
  const [state, setState] = useState<SignedRealNumberLineLearnerState>(() =>
    createSignedRealNumberLineLearnerState(labId, initialInput),
  );
  const model = useMemo(
    () => buildSignedRealNumberLineModel(state.input),
    [state.input],
  );

  function applyDomain(request: SignedRealNumberLineControlRequest) {
    try {
      const next = applySignedRealNumberLineLearnerDomainRequest(
        state,
        request,
      );
      setState(next);
    } catch (error) {
      if (!(error instanceof SignedRealNumberLineControlDomainError)) {
        throw error;
      }
      setState(
        rejectSignedRealNumberLineLearnerAction(
          state,
          actionRequestForDomainRequest(request),
          error.code,
        ),
      );
    }
  }

  function replaceInput(
    input: SignedRealNumberLineInput,
    request: SignedRealNumberLineActionRequest,
  ) {
    try {
      const next = replaceSignedRealNumberLineLearnerInput(
        state,
        input,
        request,
      );
      setState(next);
    } catch (error) {
      if (!(error instanceof SignedRealNumberLineControlDomainError)) {
        throw error;
      }
      setState(
        rejectSignedRealNumberLineLearnerAction(
          state,
          request,
          error.code,
        ),
      );
    }
  }

  function reset() {
    setState(resetSignedRealNumberLineLearnerState(state));
  }

  return (
    <div
      data-mainland-signed-real-number-line={lab.labId}
      data-viz-family={SIGNED_REAL_NUMBER_LINE_MODEL_CONTRACT.family}
      data-viz-group-id={SIGNED_REAL_NUMBER_LINE_MODEL_CONTRACT.groupId}
      data-viz-configured-model={SIGNED_REAL_NUMBER_LINE_MODEL_CONTRACT.version}
      data-viz-configured-state={model.stateKey}
      data-viz-module={lab.moduleId}
      data-viz-module-id={lab.moduleId}
      data-viz-topic={lab.topicId}
      data-viz-topic-id={lab.topicId}
      data-viz-language={language}
      data-viz-theme={theme}
      data-viz-mode={model.mode}
      data-viz-origin={model.origin.symbolic}
      data-viz-sign={model.sign}
      data-viz-signed-side={model.side}
      data-viz-exact-value={model.point.symbolic}
      data-viz-control-domain-id={state.receipt.descriptorId}
      data-viz-control-transition-status={state.actionReceipt.status}
      data-viz-control-requested={JSON.stringify(state.actionReceipt.request)}
      data-viz-control-expected={JSON.stringify(state.actionReceipt.expected)}
      data-viz-control-observed={JSON.stringify(state.actionReceipt.observed)}
      data-viz-action-receipt={JSON.stringify(state.actionReceipt)}
      data-viz-action-receipt-version={state.actionReceipt.version}
      data-viz-action-status={state.actionReceipt.status}
      data-viz-action-request={JSON.stringify(state.actionReceipt.request)}
      data-viz-action-before={JSON.stringify(state.actionReceipt.before)}
      data-viz-action-requested={JSON.stringify(state.actionReceipt.requested)}
      data-viz-action-expected={JSON.stringify(state.actionReceipt.expected)}
      data-viz-action-observed={JSON.stringify(state.actionReceipt.observed)}
      data-viz-action-projections={JSON.stringify(
        state.actionReceipt.projections,
      )}
      data-viz-action-rejection={state.actionReceipt.rejection ?? "none"}
      data-viz-value-sign={state.controls.valueSign}
      data-viz-value-radicand={state.controls.valueRadicand}
      className="min-w-0 space-y-4"
    >
      <header className="rounded-3xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-800 dark:bg-cyan-950 sm:p-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
          {t(SIGNED_REAL_NUMBER_LINE_COPY.eyebrow)}
        </p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl">
            {t(lab.title)}
          </h2>
          <p className="text-sm font-bold text-cyan-800 dark:text-cyan-200">
            {t(SIGNED_REAL_NUMBER_LINE_COPY.title)}
          </p>
        </div>
      </header>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <SignedRealNumberLineSurface model={model} input={state.input} />
        </div>

        <aside className="min-w-0 space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950 sm:p-5">
          <section className="space-y-2">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
              {t(SIGNED_REAL_NUMBER_LINE_COPY.learningGoal)}
            </p>
            <p className="text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
              {t(lab.description)}
            </p>
          </section>

          <div
            role="group"
            aria-label={t(SIGNED_REAL_NUMBER_LINE_COPY.modesLabel)}
            data-viz-mode-group="signed-real-number-line-mode"
            className="grid grid-cols-2 gap-2"
          >
            {SIGNED_REAL_NUMBER_LINE_TOPIC_PROFILES[labId].allowedModes.map(
              (mode, index) => {
                const active = mode === state.input.mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    data-viz-mode-button
                    data-viz-mode={mode}
                    data-viz-mode-group="signed-real-number-line-mode"
                    data-viz-mode-index={index}
                    data-viz-mode-active={String(active)}
                    aria-pressed={active}
                    onClick={() =>
                      applyDomain({ control: "mode", value: mode })
                    }
                    className={`focus-ring min-h-11 rounded-xl border px-3 py-2 text-sm font-black transition-colors motion-reduce:transition-none ${
                      active
                        ? "border-cyan-500 bg-cyan-100 text-cyan-950 dark:border-cyan-300 dark:bg-cyan-950 dark:text-cyan-100"
                        : "border-slate-300 bg-white text-slate-800 hover:border-cyan-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {t(SIGNED_REAL_NUMBER_LINE_COPY.modes[mode])}
                  </button>
                );
              },
            )}
          </div>

          {controlsForInput(state, applyDomain, replaceInput, t)}

          <RangeControl
            parameter="precision"
            label={t(SIGNED_REAL_NUMBER_LINE_COPY.precision)}
            value={state.input.precision}
            min={0}
            max={SIGNED_REAL_NUMBER_LINE_DOMAIN.maxPrecision}
            onChange={(precision) =>
              replaceInput(
                {
                  ...state.input,
                  precision: clampInteger(
                    precision,
                    0,
                    SIGNED_REAL_NUMBER_LINE_DOMAIN.maxPrecision,
                  ),
                },
                { kind: "control", control: "precision", value: precision },
              )
            }
          />

          <section
            data-viz-control-receipt
            className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-blue-950 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100"
          >
            <h3 className="text-xs font-black uppercase tracking-[0.12em]">
              {t(SIGNED_REAL_NUMBER_LINE_COPY.controlReceipt)}
            </h3>
            <p className="mt-1 text-sm font-bold">
              {t(SIGNED_REAL_NUMBER_LINE_COPY.controlConfirmed)}
            </p>
            <p className="mt-1 text-xs font-semibold">
              {state.receipt.projections.length > 0
                ? t(SIGNED_REAL_NUMBER_LINE_COPY.projectionApplied)
                : t(SIGNED_REAL_NUMBER_LINE_COPY.noProjection)}
            </p>
            {state.actionReceipt.status === "rejected" ? (
              <p data-viz-control-error className="mt-2 text-sm font-black text-rose-800 dark:text-rose-200">
                {t(SIGNED_REAL_NUMBER_LINE_COPY.rejectedControl)}
              </p>
            ) : null}
          </section>

          <section>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
              {t(SIGNED_REAL_NUMBER_LINE_COPY.invariantChecks)}
            </p>
            <ul className="space-y-2">
              {model.invariantReceipts.map((receipt) => {
                const statusCopy =
                  receipt.status === "pass"
                    ? SIGNED_REAL_NUMBER_LINE_COPY.verified
                    : receipt.status === "fail"
                      ? SIGNED_REAL_NUMBER_LINE_COPY.failed
                      : SIGNED_REAL_NUMBER_LINE_COPY.notApplicable;
                const statusMark =
                  receipt.status === "pass"
                    ? "✓"
                    : receipt.status === "fail"
                      ? "!"
                      : "—";
                const statusClass =
                  receipt.status === "pass"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100"
                    : receipt.status === "fail"
                      ? "border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-100"
                      : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";
                return (
                  <li
                    key={receipt.id}
                    data-viz-invariant={receipt.id}
                    data-viz-invariant-applicable={String(receipt.applicable)}
                    data-viz-invariant-status={receipt.status}
                    data-viz-invariant-expected={receipt.expected}
                    data-viz-invariant-observed={receipt.observed}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold ${statusClass}`}
                  >
                    <span className="break-words">
                      {t(SIGNED_REAL_NUMBER_LINE_COPY.invariants[receipt.id])}
                    </span>
                    <span className="ml-2">
                      {statusMark} {t(statusCopy)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <output
            data-viz-state={model.stateKey}
            data-viz-state-summary
            aria-live="polite"
            aria-atomic="true"
            className="block rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-3 text-sm font-bold leading-6 text-cyan-950 dark:border-cyan-700 dark:bg-cyan-950 dark:text-cyan-100"
          >
            <span className="block text-xs font-black uppercase tracking-[0.12em]">
              {t(SIGNED_REAL_NUMBER_LINE_COPY.stateSummary)}
            </span>
            <span className="mt-1 block break-words font-mono">
              {`${t(sideCopy(model.side))} · ${t(SIGNED_REAL_NUMBER_LINE_COPY.exactValue)} ${model.point.symbolic}`}
            </span>
            <span className="block break-words font-mono text-xs">
              {`${t(SIGNED_REAL_NUMBER_LINE_COPY.decimalApproximation)} ${model.approximation.text} · ${t(SIGNED_REAL_NUMBER_LINE_COPY.absoluteDistance)} ${model.absoluteValueDistance.exact.symbolic}`}
            </span>
          </output>

          <button
            type="button"
            data-viz-reset
            data-viz-reset-model
            data-viz-reset-module-id={lab.moduleId}
            data-viz-reset-topic-id={lab.topicId}
            onClick={reset}
            className="focus-ring min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-black text-slate-900 transition-colors hover:border-cyan-400 hover:bg-cyan-50 motion-reduce:transition-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            {t(SIGNED_REAL_NUMBER_LINE_COPY.reset)}
          </button>

          {controlFooterAction ? (
            <div data-viz-lesson-action-slot>{controlFooterAction}</div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

export function SignedRealNumberLineLab(
  props: SignedRealNumberLineLabProps,
) {
  if (!isMainlandSignedRealNumberLineLabId(props.lab.labId)) return null;
  return <SignedRealNumberLineLearner {...props} />;
}
