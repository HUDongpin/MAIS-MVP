"use client";

import {
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useSettings } from "../../providers/AppProviders";
import type { LocalizedText } from "../../../types";
import {
  FRACTION_OPERATIONS_MODE_ALLOWLIST,
  FRACTION_OPERATIONS_RESET_INPUTS,
  buildFractionOperationsModel,
  type ExactFraction,
  type FractionArithmeticOperation,
  type FractionEquationReconstructionId,
  type FractionOperationsInput,
  type FractionOperationsLabId,
  type FractionOperationsMode,
  type FractionOperationsModel,
  type FractionPhysicalInterpretationApplicability,
  type FractionVisibleReceipt,
} from "./FractionOperationsModel";
import {
  FRACTION_OPERATIONS_ACTION_RECEIPT_CONTRACT,
  FRACTION_OPERATIONS_DIVISOR_DOMAIN_DESCRIPTOR,
  FRACTION_OPERATIONS_DIVISOR_DOMAIN_ID,
  FractionOperationsDivisorDomainError,
  auditFractionOperationsDivisorTransition,
  createFractionOperationsAcceptedActionReceipt,
  createFractionOperationsRejectedActionReceipt,
  planFractionOperationsDivisorTransition,
  type FractionOperationsActionReceipt,
  type FractionOperationsDivisorTransitionReceipt,
  type FractionOperationsDomainRequest,
  type FractionOperationsDomainState,
} from "./FractionOperationsControlDomain";
import { FractionOperationsVisualModel } from "./FractionOperationsVisualModel";

export const MAINLAND_FRACTION_OPERATIONS_LAB_IDS = [
  "bnu-primary-p5-lower-fraction-add-sub",
  "bnu-primary-p5-lower-fraction-division",
  "bnu-primary-p5-lower-fraction-multiplication",
  "hjb-primary-p5-lower-fractions-equivalence-operations",
  "pep-primary-p5-lower-factors-fractions",
] as const;

export type MainlandFractionOperationsLabId =
  (typeof MAINLAND_FRACTION_OPERATIONS_LAB_IDS)[number];

const MAINLAND_FRACTION_OPERATIONS_LAB_ID_SET = new Set<string>(
  MAINLAND_FRACTION_OPERATIONS_LAB_IDS,
);

export function isMainlandFractionOperationsLabId(
  labId: string,
): labId is MainlandFractionOperationsLabId {
  return MAINLAND_FRACTION_OPERATIONS_LAB_ID_SET.has(labId);
}

function localized(en: string, zh: string, zhHans: string): LocalizedText {
  return { en, zh, zhHans };
}

type UnsupportedInterpretationReason = Extract<
  FractionPhysicalInterpretationApplicability,
  { status: "unsupported" }
>["reason"];

const FRACTION_EQUATION_RECONSTRUCTION_COPY = {
  "fraction-equation.additive-inverse": localized(
    "Subtract the second fraction to recover the first.",
    "減去第二個分數可還原第一個分數。",
    "减去第二个分数可还原第一个分数。",
  ),
  "fraction-equation.comparison-difference": localized(
    "The signed gap agrees with the comparison relation.",
    "帶符號差值與比較關係一致。",
    "带符号差值与比较关系一致。",
  ),
  "fraction-equation.division-inverse": localized(
    "Multiply the quotient by the divisor to recover the dividend.",
    "用商乘除數可還原被除數。",
    "用商乘除数可还原被除数。",
  ),
  "fraction-equation.equivalent-expansion": localized(
    "The expanded fraction has the same exact value.",
    "擴分後的分數保持相同的精確值。",
    "扩分后的分数保持相同的精确值。",
  ),
  "fraction-equation.estimate-error-reconstruction": localized(
    "The exact result plus the signed error reconstructs the estimate.",
    "精確結果加上帶符號誤差可重構估算值。",
    "精确结果加上带符号误差可重构估算值。",
  ),
  "fraction-equation.multiplication-forward": localized(
    "The fraction product reconstructs the exact result.",
    "分數乘積可重構精確結果。",
    "分数乘积可重构精确结果。",
  ),
  "fraction-equation.simplification-equivalence": localized(
    "Dividing both parts by the GCF preserves the exact value.",
    "分子與分母同除最大公因數會保持精確值。",
    "分子与分母同除最大公因数会保持精确值。",
  ),
  "fraction-equation.subtractive-inverse": localized(
    "Add the second fraction to recover the first.",
    "加回第二個分數可還原第一個分數。",
    "加回第二个分数可还原第一个分数。",
  ),
} as const satisfies Record<FractionEquationReconstructionId, LocalizedText>;

const FRACTION_INTERPRETATION_REASON_COPY = {
  "measurement-requires-nonnegative-available-and-positive-unit": localized(
    "This measurement model needs a nonnegative amount and a positive unit size.",
    "此包含除模型需要非負總量和正的單位量。",
    "此包含除模型需要非负总量和正的单位量。",
  ),
  "sharing-requires-positive-integer-group-count": localized(
    "This sharing model needs a positive whole-number group count.",
    "此等分除模型需要正整數組數。",
    "此等分除模型需要正整数组数。",
  ),
  "signed-operands-require-sign-model": localized(
    "Signed fractions need a separate sign-aware physical model.",
    "帶符號分數需要另一個能表示正負方向的實體模型。",
    "带符号分数需要另一个能表示正负方向的实体模型。",
  ),
} as const satisfies Record<UnsupportedInterpretationReason, LocalizedText>;

export const FRACTION_OPERATIONS_COPY = {
  eyebrow: localized("Exact fraction lab", "精確分數實驗", "精确分数实验"),
  title: localized("Fraction operations", "分數運算", "分数运算"),
  goal: localized(
    "Track why each exact fraction step works: equivalent forms, common denominators, simplification, and operation meaning.",
    "追蹤每個精確分數步驟的原因：等值分數、通分、約分與運算意義。",
    "追踪每个精确分数步骤的原因：等值分数、通分、约分与运算意义。",
  ),
  panHint: localized(
    "Swipe horizontally or use the arrow keys to inspect every exact receipt.",
    "左右滑動或使用方向鍵查看每張精確收據。",
    "左右滑动或使用方向键查看每张精确收据。",
  ),
  modesLabel: localized("Operation mode", "運算模式", "运算模式"),
  modes: {
    equivalence: localized("Equivalent", "等值", "等值"),
    compare: localized("Compare", "比較", "比较"),
    add: localized("Add", "加法", "加法"),
    subtract: localized("Subtract", "減法", "减法"),
    multiply: localized("Multiply", "乘法", "乘法"),
    divide: localized("Divide", "除法", "除法"),
    simplify: localized("Simplify", "約分", "约分"),
    estimate: localized("Estimate", "估算", "估算"),
  },
  leftFraction: localized("Left fraction", "左邊分數", "左边分数"),
  rightFraction: localized("Right fraction", "右邊分數", "右边分数"),
  leftNumerator: localized("Left numerator", "左邊分子", "左边分子"),
  leftDenominator: localized("Left denominator", "左邊分母", "左边分母"),
  rightNumerator: localized("Right numerator", "右邊分子", "右边分子"),
  rightDenominator: localized("Right denominator", "右邊分母", "右边分母"),
  exactFraction: localized("Exact fraction", "精確分數", "精确分数"),
  normalized: localized("Simplest exact form", "最簡精確形式", "最简精确形式"),
  mixedNumber: localized("Whole / mixed form", "整數／帶分數形式", "整数／带分数形式"),
  equivalentFractions: localized("Equivalent fractions", "等值分數", "等值分数"),
  simplification: localized("Factor and GCF simplification", "因數與最大公因數約分", "因数与最大公因数约分"),
  commonDenominator: localized("Least common denominator", "最小公分母", "最小公分母"),
  commonDenominatorShort: localized("LCD", "最小公分母", "最小公分母"),
  denominatorGcf: localized("Denominator GCF", "分母最大公因數", "分母最大公因数"),
  crossProducts: localized("Cross-products", "交叉乘積", "交叉乘积"),
  exactOperation: localized("Exact operation receipt", "精確運算收據", "精确运算收据"),
  exactResult: localized("Exact result", "精確結果", "精确结果"),
  unsimplifiedResult: localized("Before simplification", "約分前", "约分前"),
  equivalenceReceipt: localized("Equivalent expansion", "等值擴分", "等值扩分"),
  comparisonReceipt: localized("Exact comparison", "精確比較", "精确比较"),
  additionReceipt: localized("Addition through the LCD", "通分加法", "通分加法"),
  subtractionReceipt: localized("Subtraction through the LCD", "通分減法", "通分减法"),
  multiplicationReceipt: localized("Multiply numerators and denominators", "分子與分母分別相乘", "分子与分母分别相乘"),
  divisionReceipt: localized("Divide by multiplying by the reciprocal", "乘倒數完成除法", "乘倒数完成除法"),
  simplificationReceipt: localized("Divide both parts by the GCF", "分子分母同除最大公因數", "分子分母同除最大公因数"),
  estimateReceipt: localized("Nearest-whole estimate", "最接近整數估算", "最接近整数估算"),
  estimateOperation: localized("Operation to estimate", "要估算的運算", "要估算的运算"),
  estimateOperations: {
    add: localized("Addition", "加法", "加法"),
    subtract: localized("Subtraction", "減法", "减法"),
    multiply: localized("Multiplication", "乘法", "乘法"),
    divide: localized("Division", "除法", "除法"),
  },
  lowerWhole: localized("Lower whole", "下界整數", "下界整数"),
  upperWhole: localized("Upper whole", "上界整數", "上界整数"),
  estimatedWhole: localized("Estimated whole", "估算整數", "估算整数"),
  signedError: localized("Signed error", "帶符號誤差", "带符号误差"),
  absoluteError: localized("Absolute error", "絕對誤差", "绝对误差"),
  visibleOperation: localized("Visible exact model", "可見精確模型", "可见精确模型"),
  signedGap: localized("Signed gap", "帶符號差值", "带符号差值"),
  numeratorDivision: localized("Numerator step", "分子步驟", "分子步骤"),
  denominatorDivision: localized("Denominator step", "分母步驟", "分母步骤"),
  areaInterpretation: localized("Area interpretation", "面積意義", "面积意义"),
  repeatedGroupInterpretation: localized("Repeated-group interpretation", "重複組意義", "重复组意义"),
  scalingInterpretation: localized("Scaling interpretation", "縮放意義", "缩放意义"),
  reciprocalInterpretation: localized("Reciprocal transformation", "倒數轉換", "倒数转换"),
  measurementInterpretation: localized("Measurement division", "包含除意義", "包含除意义"),
  sharingInterpretation: localized("Sharing division", "等分除意義", "等分除意义"),
  interpretationUnavailable: localized(
    "Not applicable to this state",
    "不適用於目前狀態",
    "不适用于当前状态",
  ),
  interpretationReasons: FRACTION_INTERPRETATION_REASON_COPY,
  equationCheck: localized("Equation check", "等式檢查", "等式检查"),
  equationReconstructions: FRACTION_EQUATION_RECONSTRUCTION_COPY,
  invariantChecks: localized("Verified exact invariants", "已驗證精確不變量", "已验证精确不变量"),
  verified: localized("verified", "已驗證", "已验证"),
  verifiedRelationship: localized(
    "Exact relationship verified",
    "精確關係已驗證",
    "精确关系已验证",
  ),
  currentState: localized("Current exact state", "目前精確狀態", "当前精确状态"),
  controls: localized("Try another exact fraction", "試算另一組精確分數", "试算另一组精确分数"),
  nonZero: localized("zero is excluded for division", "除法時不可為零", "除法时不可为零"),
  reset: localized("Reset fraction model", "重設分數模型", "重置分数模型"),
} as const;

export type FractionOperationsLabProps = {
  controlFooterAction?: ReactNode;
  initialInput?: FractionOperationsInput;
  labId: string;
};

const UI_MIN_NUMERATOR = -48;
const UI_MAX_NUMERATOR = 48;
const UI_MAX_DENOMINATOR = 24;

export type FractionOperationsLabTransition = Readonly<{
  actionReceipt: Extract<FractionOperationsActionReceipt, { status: "accepted" }>;
  receipt: FractionOperationsDivisorTransitionReceipt;
  state: FractionOperationsDomainState;
}>;

export function executeFractionOperationsLabTransition(
  current: FractionOperationsDomainState,
  request: FractionOperationsDomainRequest,
): FractionOperationsLabTransition {
  const plan = planFractionOperationsDivisorTransition(current, request);
  const receipt = auditFractionOperationsDivisorTransition(
    plan,
    plan.expected,
  );
  const actionReceipt = createFractionOperationsAcceptedActionReceipt({
    before: current,
    expected: receipt.expected,
    observed: receipt.observed,
    projections: receipt.projections,
    request: receipt.request,
    requested: receipt.requested,
  });
  return Object.freeze({ actionReceipt, receipt, state: receipt.observed });
}

function domainStateFromInput(
  input: FractionOperationsInput,
): FractionOperationsDomainState {
  return {
    mode: input.mode,
    evaluatedOperation:
      input.mode === "estimate" ? input.estimateOperation! : input.mode,
    leftNumerator: input.left.numerator,
    leftDenominator: input.left.denominator,
    rightNumerator: input.right.numerator,
    rightDenominator: input.right.denominator,
  };
}

function inputFromDomainState(
  labId: FractionOperationsLabId,
  state: FractionOperationsDomainState,
): FractionOperationsInput {
  return {
    ...(state.mode === "estimate"
      ? { estimateOperation: state.evaluatedOperation as FractionArithmeticOperation }
      : {}),
    labId,
    left: {
      denominator: state.leftDenominator,
      numerator: state.leftNumerator,
    },
    mode: state.mode,
    right: {
      denominator: state.rightDenominator,
      numerator: state.rightNumerator,
    },
  };
}

function initialActionReceipt(
  state: FractionOperationsDomainState,
): FractionOperationsActionReceipt {
  const transition = executeFractionOperationsLabTransition(state, {
    kind: "controller",
    mode: state.mode,
    evaluatedOperation: state.evaluatedOperation,
  });
  return createFractionOperationsAcceptedActionReceipt({
    before: state,
    expected: transition.receipt.expected,
    observed: transition.receipt.observed,
    projections: transition.receipt.projections,
    request: { kind: "initial" },
    requested: transition.receipt.requested,
  });
}

function serializeDomainState(state: FractionOperationsDomainState): string {
  return JSON.stringify({
    mode: state.mode,
    evaluatedOperation: state.evaluatedOperation,
    leftNumerator: state.leftNumerator,
    leftDenominator: state.leftDenominator,
    rightNumerator: state.rightNumerator,
    rightDenominator: state.rightDenominator,
  });
}

function copyInput(input: FractionOperationsInput): FractionOperationsInput {
  return {
    ...(input.estimateOperation === undefined
      ? {}
      : { estimateOperation: input.estimateOperation }),
    labId: input.labId,
    left: { ...input.left },
    mode: input.mode,
    right: { ...input.right },
  };
}

function isWithinLearnerDomain(input: FractionOperationsInput): boolean {
  return (
    Number.isInteger(input.left.numerator) &&
    input.left.numerator >= UI_MIN_NUMERATOR &&
    input.left.numerator <= UI_MAX_NUMERATOR &&
    Number.isInteger(input.right.numerator) &&
    input.right.numerator >= UI_MIN_NUMERATOR &&
    input.right.numerator <= UI_MAX_NUMERATOR &&
    Number.isInteger(input.left.denominator) &&
    input.left.denominator >= 1 &&
    input.left.denominator <= UI_MAX_DENOMINATOR &&
    Number.isInteger(input.right.denominator) &&
    input.right.denominator >= 1 &&
    input.right.denominator <= UI_MAX_DENOMINATOR
  );
}

function checkedInitialInput(
  labId: MainlandFractionOperationsLabId,
  initialInput: FractionOperationsInput | undefined,
): FractionOperationsInput | null {
  const candidate = copyInput(
    initialInput ??
      (FRACTION_OPERATIONS_RESET_INPUTS[
        labId
      ] as FractionOperationsInput),
  );
  if (candidate.labId !== labId || !isWithinLearnerDomain(candidate)) {
    return null;
  }
  try {
    buildFractionOperationsModel(candidate);
    return candidate;
  } catch {
    return null;
  }
}

function isArithmeticMode(
  mode: FractionOperationsMode,
): mode is FractionArithmeticOperation {
  return (
    mode === "add" ||
    mode === "subtract" ||
    mode === "multiply" ||
    mode === "divide"
  );
}

function allowedModesForLab(
  labId: FractionOperationsLabId,
): readonly FractionOperationsMode[] {
  return FRACTION_OPERATIONS_MODE_ALLOWLIST[labId] as readonly FractionOperationsMode[];
}

function allowedEstimateOperations(
  labId: FractionOperationsLabId,
): readonly FractionArithmeticOperation[] {
  return allowedModesForLab(labId).filter(isArithmeticMode);
}

function initialEstimateOperation(
  input: FractionOperationsInput,
): FractionArithmeticOperation {
  if (input.mode === "estimate" && input.estimateOperation) {
    return input.estimateOperation;
  }
  if (isArithmeticMode(input.mode)) return input.mode;
  return allowedEstimateOperations(input.labId)[0]!;
}

function parseInteger(
  event: ChangeEvent<HTMLInputElement>,
  minimum: number,
  maximum: number,
): number | null {
  const value = Number(event.currentTarget.value);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    return null;
  }
  return value;
}

function FractionGlyph({ value }: { value: ExactFraction }) {
  if (value.denominator === 1) {
    return <span className="font-mono text-2xl font-black">{value.numerator}</span>;
  }
  return (
    <span
      aria-label={value.text}
      className="inline-grid min-w-12 grid-rows-2 place-items-center font-mono text-lg font-black leading-none"
    >
      <span className="w-full border-b-2 border-current px-1 pb-1 text-center">
        {value.numerator}
      </span>
      <span className="px-1 pt-1">{value.denominator}</span>
    </span>
  );
}

function ReceiptCard({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-950 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
      <h3 className="text-sm font-black tracking-tight">{title}</h3>
      <div className="mt-3 text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">
        {children}
      </div>
    </article>
  );
}

function OperandCard({
  label,
  name,
  operand,
  t,
}: {
  label: string;
  name: "left" | "right";
  operand: FractionOperationsModel["operands"]["left"];
  t: (copy: LocalizedText) => string;
}) {
  return (
    <article className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100">
      <h3 className="text-sm font-black">{label}</h3>
      <div
        data-viz-mark="true"
        data-viz-name={`${name}-exact-fraction`}
        data-viz-exact={operand.source.text}
        data-viz-numerator={operand.source.numerator}
        data-viz-denominator={operand.source.denominator}
        className="mt-3 flex min-h-24 items-center justify-center rounded-xl border border-sky-200 bg-white px-4 py-3 dark:border-sky-700 dark:bg-slate-950"
      >
        <FractionGlyph value={operand.source} />
      </div>
      <dl className="mt-3 grid gap-2 text-xs font-bold sm:grid-cols-2">
        <div className="rounded-xl bg-white px-3 py-2 dark:bg-slate-900">
          <dt className="text-slate-500 dark:text-slate-400">
            {t(FRACTION_OPERATIONS_COPY.normalized)}
          </dt>
          <dd className="mt-1 font-mono text-sm text-slate-950 dark:text-white">
            {operand.normalized.text}
          </dd>
        </div>
        <div
          data-viz-mark="true"
          data-viz-name={`${name}-mixed-number`}
          data-viz-mixed={operand.mixed.text}
          data-viz-explicit-whole={String(operand.mixed.explicitWhole)}
          className="rounded-xl bg-white px-3 py-2 dark:bg-slate-900"
        >
          <dt className="text-slate-500 dark:text-slate-400">
            {t(FRACTION_OPERATIONS_COPY.mixedNumber)}
          </dt>
          <dd className="mt-1 font-mono text-sm text-slate-950 dark:text-white">
            {operand.mixed.text}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function NumberControl({
  controlId,
  label,
  maximum,
  minimum,
  onChange,
  output,
  value,
  zeroExcluded = false,
}: {
  controlId:
    | "left-numerator"
    | "left-denominator"
    | "right-numerator"
    | "right-denominator";
  label: string;
  maximum: number;
  minimum: number;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  output: string;
  value: number;
  zeroExcluded?: boolean;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="block rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
      <span className="flex items-center justify-between gap-3 text-xs font-black text-slate-700 dark:text-slate-200">
        <span>{label}</span>
        <output htmlFor={id} className="font-mono text-sm text-sky-700 dark:text-sky-300">
          {output}
        </output>
      </span>
      <input
        id={id}
        type="number"
        data-viz-parameter={controlId}
        data-viz-zero-excluded={String(zeroExcluded)}
        className="focus-ring mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-base font-black text-slate-950 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
        min={minimum}
        max={maximum}
        step={1}
        value={value}
        onChange={onChange}
      />
    </label>
  );
}

function MathMark({
  children,
  name,
}: {
  children: ReactNode;
  name: string;
}) {
  return (
    <span data-viz-math-mark={name} className="inline-flex items-center">
      {children}
    </span>
  );
}

function FractionMathMark({
  name,
  value,
}: {
  name: string;
  value: ExactFraction;
}) {
  return (
    <MathMark name={name}>
      <FractionGlyph value={value} />
    </MathMark>
  );
}

function visibleOperator(operator: "+" | "-" | "x" | "/"): string {
  if (operator === "x") return "×";
  if (operator === "/") return "÷";
  return operator;
}

function visibleReceiptSummary(
  receipt: FractionVisibleReceipt,
  t: (copy: LocalizedText) => string,
): string {
  if (receipt.kind === "equivalence") {
    return `${receipt.source.text} × ${receipt.expansion.numerator.factor}/${receipt.expansion.denominator.factor} = ${receipt.expanded.text} ≡ ${receipt.exactResult.text}`;
  }
  if (receipt.kind === "comparison") {
    return `${receipt.relation.left.text} ${receipt.relation.symbol} ${receipt.relation.right.text}; ${t(FRACTION_OPERATIONS_COPY.signedGap)}: ${receipt.signedGap.exact.text}`;
  }
  if (receipt.kind === "simplification") {
    return `${receipt.numeratorDivision.dividend} ÷ ${receipt.numeratorDivision.divisor} = ${receipt.numeratorDivision.quotient}; ${receipt.denominatorDivision.dividend} ÷ ${receipt.denominatorDivision.divisor} = ${receipt.denominatorDivision.quotient}; ${receipt.simplified.text}`;
  }
  return `${receipt.equation.left.text} ${visibleOperator(receipt.equation.operator)} ${receipt.equation.right.text} = ${receipt.equation.unsimplifiedResult.text} → ${receipt.equation.exactResult.text}`;
}

function VisibleOperationReceipt({
  mixedResult,
  receipt,
  t,
}: {
  mixedResult: FractionOperationsModel["operation"]["mixedResult"];
  receipt: FractionVisibleReceipt;
  t: (copy: LocalizedText) => string;
}) {
  let attributes: Record<string, string | number>;
  let content: ReactNode;
  let exactResult: ExactFraction;

  if (receipt.kind === "equivalence") {
    attributes = {
      "data-viz-visible-source": receipt.source.text,
      "data-viz-visible-expanded": receipt.expanded.text,
      "data-viz-visible-exact": receipt.exactResult.text,
    };
    exactResult = receipt.exactResult;
    content = (
      <>
        <FractionMathMark name="equivalence-source" value={receipt.source} />
        <MathMark name="equivalence-multiply">×</MathMark>
        <MathMark name="equivalence-factor">
          {receipt.expansion.numerator.factor}/{receipt.expansion.denominator.factor}
        </MathMark>
        <MathMark name="equivalence-equals">=</MathMark>
        <FractionMathMark name="equivalence-expanded" value={receipt.expanded} />
        <MathMark name="equivalence-relation">≡</MathMark>
        <FractionMathMark name="equivalence-exact" value={receipt.exactResult} />
      </>
    );
  } else if (receipt.kind === "comparison") {
    attributes = {
      "data-viz-visible-left": receipt.relation.left.text,
      "data-viz-visible-right": receipt.relation.right.text,
      "data-viz-visible-relation": receipt.relation.symbol,
      "data-viz-visible-gap": receipt.signedGap.exact.text,
    };
    exactResult = receipt.signedGap.exact;
    content = (
      <>
        <FractionMathMark name="comparison-left" value={receipt.relation.left} />
        <MathMark name="comparison-relation">{receipt.relation.symbol}</MathMark>
        <FractionMathMark name="comparison-right" value={receipt.relation.right} />
        <span className="basis-full text-center text-sm">
          {t(FRACTION_OPERATIONS_COPY.signedGap)}:{" "}
          <MathMark name="comparison-signed-gap">
            {receipt.signedGap.exact.text}
          </MathMark>
        </span>
      </>
    );
  } else if (receipt.kind === "simplification") {
    const numeratorDivision = `${receipt.numeratorDivision.dividend}÷${receipt.numeratorDivision.divisor}=${receipt.numeratorDivision.quotient}`;
    const denominatorDivision = `${receipt.denominatorDivision.dividend}÷${receipt.denominatorDivision.divisor}=${receipt.denominatorDivision.quotient}`;
    attributes = {
      "data-viz-visible-source": receipt.source.text,
      "data-viz-visible-exact": receipt.simplified.text,
      "data-viz-numerator-division": numeratorDivision,
      "data-viz-denominator-division": denominatorDivision,
    };
    exactResult = receipt.simplified;
    content = (
      <>
        <span className="grid gap-1 rounded-xl bg-white/80 px-3 py-2 text-sm dark:bg-slate-900/80">
          <span>{t(FRACTION_OPERATIONS_COPY.numeratorDivision)}</span>
          <MathMark name="simplification-numerator">{numeratorDivision}</MathMark>
        </span>
        <MathMark name="simplification-compose">/</MathMark>
        <span className="grid gap-1 rounded-xl bg-white/80 px-3 py-2 text-sm dark:bg-slate-900/80">
          <span>{t(FRACTION_OPERATIONS_COPY.denominatorDivision)}</span>
          <MathMark name="simplification-denominator">{denominatorDivision}</MathMark>
        </span>
        <MathMark name="simplification-equals">=</MathMark>
        <FractionMathMark name="simplification-exact" value={receipt.simplified} />
      </>
    );
  } else {
    const equation = receipt.equation;
    attributes = {
      "data-viz-visible-left": equation.left.text,
      "data-viz-visible-right": equation.right.text,
      "data-viz-visible-operator": equation.operator,
      "data-viz-visible-unsimplified": equation.unsimplifiedResult.text,
      "data-viz-visible-exact": equation.exactResult.text,
    };
    exactResult = equation.exactResult;
    content = (
      <>
        <FractionMathMark name="arithmetic-left" value={equation.left} />
        <MathMark name="arithmetic-operator">
          {visibleOperator(equation.operator)}
        </MathMark>
        <FractionMathMark name="arithmetic-right" value={equation.right} />
        <MathMark name="arithmetic-equals">=</MathMark>
        <FractionMathMark
          name="arithmetic-unsimplified"
          value={equation.unsimplifiedResult}
        />
        <MathMark name="arithmetic-simplifies">→</MathMark>
        <FractionMathMark name="arithmetic-exact" value={equation.exactResult} />
      </>
    );
  }

  return (
    <div
      data-viz-mark="true"
      data-viz-name="operation-receipt"
      data-viz-visible-receipt={receipt.kind}
      data-viz-exact-result={exactResult.text}
      {...attributes}
      className="rounded-2xl border-2 border-indigo-300 bg-indigo-50 p-4 text-indigo-950 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-100"
    >
      <p className="text-xs font-black uppercase tracking-[0.14em]">
        {t(FRACTION_OPERATIONS_COPY.visibleOperation)}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xl font-black">
        {content}
      </div>
      <span
        data-viz-mark="true"
        data-viz-name="exact-result"
        data-viz-exact-result={exactResult.text}
        className="sr-only"
      >
        {exactResult.text}
      </span>
      <p
        data-viz-mark="true"
        data-viz-name="result-mixed-number"
        data-viz-mixed={mixedResult.text}
        data-viz-explicit-whole={String(mixedResult.explicitWhole)}
        className="mt-3 text-center text-sm font-black"
      >
        {receipt.kind === "comparison"
          ? t(FRACTION_OPERATIONS_COPY.signedGap)
          : t(FRACTION_OPERATIONS_COPY.mixedNumber)}
        : {mixedResult.text}
      </p>
    </div>
  );
}

function InterpretationReceipt({
  applicability,
  children,
  name,
  t,
  title,
}: {
  applicability: FractionPhysicalInterpretationApplicability;
  children: ReactNode;
  name: string;
  t: (copy: LocalizedText) => string;
  title: string;
}) {
  const supported = applicability.status === "supported";
  return (
    <div
      data-viz-mark="true"
      data-viz-name={name}
      data-viz-interpretation-status={applicability.status}
      data-viz-unsupported-reason={
        supported ? undefined : applicability.reason
      }
    >
      <ReceiptCard title={title}>
        {supported ? (
          children
        ) : (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
            <p>{t(FRACTION_OPERATIONS_COPY.interpretationUnavailable)}</p>
            <p className="mt-1">
              {t(
                FRACTION_OPERATIONS_COPY.interpretationReasons[
                  applicability.reason
                ],
              )}
            </p>
          </div>
        )}
      </ReceiptCard>
    </div>
  );
}

function OperationReceipts({
  model,
  t,
}: {
  model: FractionOperationsModel;
  t: (copy: LocalizedText) => string;
}) {
  const { commonDenominator, operation } = model;
  const evaluated = operation.evaluatedOperation;
  const visible = model.visibleReceipt;
  const arithmeticEquation =
    visible.kind === "arithmetic" || visible.kind === "estimate"
      ? visible.equation
      : null;
  const multiplication = model.operationInterpretation.multiplication;
  const division = model.operationInterpretation.division;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {visible.kind === "equivalence" ? (
        <div
          data-viz-mark="true"
          data-viz-name="equivalence-operation-receipt"
          data-viz-source={visible.source.text}
          data-viz-equivalent={visible.expanded.text}
        >
          <ReceiptCard title={t(FRACTION_OPERATIONS_COPY.equivalenceReceipt)}>
            <p className="font-mono text-base">
              {visible.source.text} × {visible.expansion.numerator.factor}/
              {visible.expansion.denominator.factor} = {visible.expanded.text} ≡{" "}
              {visible.exactResult.text}
            </p>
          </ReceiptCard>
        </div>
      ) : null}

      {visible.kind === "comparison" ? (
        <div
          data-viz-mark="true"
          data-viz-name="comparison-operation-receipt"
          data-viz-relation={visible.relation.symbol}
          data-viz-signed-gap={visible.signedGap.exact.text}
        >
          <ReceiptCard title={t(FRACTION_OPERATIONS_COPY.comparisonReceipt)}>
            <p className="font-mono text-base">
              {visible.relation.left.text} {visible.relation.symbol}{" "}
              {visible.relation.right.text}
            </p>
            <p className="mt-2 font-mono text-base">
              {t(FRACTION_OPERATIONS_COPY.signedGap)}: {visible.signedGap.exact.text}
            </p>
          </ReceiptCard>
        </div>
      ) : null}

      {(evaluated === "add" || evaluated === "subtract") &&
      arithmeticEquation ? (
        <div
          data-viz-mark="true"
          data-viz-name={
            evaluated === "add" ? "addition-receipt" : "subtraction-receipt"
          }
          data-viz-unsimplified-result={arithmeticEquation.unsimplifiedResult.text}
          data-viz-exact-result={arithmeticEquation.exactResult.text}
        >
          <ReceiptCard
            title={
              evaluated === "add"
                ? t(FRACTION_OPERATIONS_COPY.additionReceipt)
                : t(FRACTION_OPERATIONS_COPY.subtractionReceipt)
            }
          >
            <p
              data-viz-mark="true"
              data-viz-name="common-denominator-operation-receipt"
              data-viz-lcd={commonDenominator.leastCommonDenominator}
              className="font-mono text-base"
            >
              {commonDenominator.left.converted.text} {operation.operator}{" "}
              {commonDenominator.right.converted.text} ={" "}
              {arithmeticEquation.unsimplifiedResult.text} →{" "}
              {arithmeticEquation.exactResult.text}
            </p>
          </ReceiptCard>
        </div>
      ) : null}

      {evaluated === "multiply" && arithmeticEquation ? (
        <div
          data-viz-mark="true"
          data-viz-name="multiplication-receipt"
          data-viz-unsimplified-result={arithmeticEquation.unsimplifiedResult.text}
          data-viz-exact-result={arithmeticEquation.exactResult.text}
        >
          <ReceiptCard title={t(FRACTION_OPERATIONS_COPY.multiplicationReceipt)}>
            <p className="font-mono text-base">
              {arithmeticEquation.left.numerator} ×{" "}
              {arithmeticEquation.right.numerator} / ({arithmeticEquation.left.denominator}{" "}
              × {arithmeticEquation.right.denominator}) ={" "}
              {arithmeticEquation.unsimplifiedResult.text} →{" "}
              {arithmeticEquation.exactResult.text}
            </p>
          </ReceiptCard>
        </div>
      ) : null}

      {evaluated === "divide" && arithmeticEquation && division ? (
        <div
          data-viz-mark="true"
          data-viz-name="division-receipt"
          data-viz-unsimplified-result={arithmeticEquation.unsimplifiedResult.text}
          data-viz-exact-result={arithmeticEquation.exactResult.text}
        >
          <ReceiptCard title={t(FRACTION_OPERATIONS_COPY.divisionReceipt)}>
            <p className="font-mono text-base">
              {arithmeticEquation.left.text} ÷ {arithmeticEquation.right.text} ={" "}
              {arithmeticEquation.left.text} × {division.reciprocal.text} ={" "}
              {arithmeticEquation.exactResult.text}
            </p>
          </ReceiptCard>
        </div>
      ) : null}

      {visible.kind === "simplification" ? (
        <div
          data-viz-mark="true"
          data-viz-name="simplification-operation-receipt"
          data-viz-source={visible.source.text}
          data-viz-gcf={visible.gcf}
          data-viz-exact-result={visible.simplified.text}
        >
          <ReceiptCard title={t(FRACTION_OPERATIONS_COPY.simplificationReceipt)}>
            <p className="font-mono text-base">
              {t(FRACTION_OPERATIONS_COPY.numeratorDivision)}:{" "}
              {visible.numeratorDivision.dividend} ÷ {visible.numeratorDivision.divisor}{" "}
              = {visible.numeratorDivision.quotient}
            </p>
            <p className="font-mono text-base">
              {t(FRACTION_OPERATIONS_COPY.denominatorDivision)}:{" "}
              {visible.denominatorDivision.dividend} ÷{" "}
              {visible.denominatorDivision.divisor} ={" "}
              {visible.denominatorDivision.quotient}
            </p>
          </ReceiptCard>
        </div>
      ) : null}

      {visible.kind === "estimate" ? (
        <div
          data-viz-mark="true"
          data-viz-name="estimate-receipt"
          data-viz-lower-whole={visible.estimate.lowerWhole}
          data-viz-upper-whole={visible.estimate.upperWhole}
          data-viz-estimated-whole={visible.estimate.estimatedWhole.text}
          data-viz-signed-error={visible.estimate.signedError.text}
          data-viz-absolute-error={visible.estimate.absoluteError.text}
          data-viz-rounding-rule={visible.estimate.roundingRule}
        >
          <ReceiptCard title={t(FRACTION_OPERATIONS_COPY.estimateReceipt)}>
            <dl className="grid grid-cols-2 gap-2">
              <div><dt>{t(FRACTION_OPERATIONS_COPY.lowerWhole)}</dt><dd className="font-mono text-base">{visible.estimate.lowerWhole}</dd></div>
              <div><dt>{t(FRACTION_OPERATIONS_COPY.upperWhole)}</dt><dd className="font-mono text-base">{visible.estimate.upperWhole}</dd></div>
              <div><dt>{t(FRACTION_OPERATIONS_COPY.estimatedWhole)}</dt><dd className="font-mono text-base">{visible.estimate.estimatedWhole.text}</dd></div>
              <div><dt>{t(FRACTION_OPERATIONS_COPY.signedError)}</dt><dd className="font-mono text-base">{visible.estimate.signedError.text}</dd></div>
              <div><dt>{t(FRACTION_OPERATIONS_COPY.absoluteError)}</dt><dd className="font-mono text-base">{visible.estimate.absoluteError.text}</dd></div>
            </dl>
          </ReceiptCard>
        </div>
      ) : null}

      {multiplication ? (
        <>
          <InterpretationReceipt
            applicability={multiplication.area.applicability}
            name="multiplication-area-interpretation"
            title={t(FRACTION_OPERATIONS_COPY.areaInterpretation)}
            t={t}
          >
            <FractionOperationsVisualModel kind="area-grid" model={model} t={t} />
          </InterpretationReceipt>
          <InterpretationReceipt
            applicability={multiplication.repeatedGroup.applicability}
            name="multiplication-repeated-group-interpretation"
            title={t(FRACTION_OPERATIONS_COPY.repeatedGroupInterpretation)}
            t={t}
          >
            <FractionOperationsVisualModel
              kind="part-of-quantity"
              model={model}
              t={t}
            />
          </InterpretationReceipt>
          <InterpretationReceipt
            applicability={multiplication.scaling.applicability}
            name="multiplication-scaling-interpretation"
            title={t(FRACTION_OPERATIONS_COPY.scalingInterpretation)}
            t={t}
          >
            <FractionOperationsVisualModel kind="scaling" model={model} t={t} />
          </InterpretationReceipt>
        </>
      ) : null}

      {division ? (
        <>
          <div
            data-viz-mark="true"
            data-viz-name="division-reciprocal-interpretation"
            data-viz-interpretation-status="supported"
            data-viz-reciprocal={division.reciprocal.text}
            data-viz-reciprocal-product={division.reciprocalProduct.text}
          >
            <ReceiptCard title={t(FRACTION_OPERATIONS_COPY.reciprocalInterpretation)}>
              <p className="flex items-center gap-2 font-mono">
                <FractionMathMark name="reciprocal-divisor" value={model.operands.right.normalized} />
                <MathMark name="reciprocal-times">×</MathMark>
                <FractionMathMark name="reciprocal-value" value={division.reciprocal} />
                <MathMark name="reciprocal-equals">=</MathMark>
                <MathMark name="reciprocal-one">1</MathMark>
              </p>
            </ReceiptCard>
          </div>
          <InterpretationReceipt
            applicability={division.measurement.applicability}
            name="division-measurement-interpretation"
            title={t(FRACTION_OPERATIONS_COPY.measurementInterpretation)}
            t={t}
          >
            <FractionOperationsVisualModel
              kind="measurement-division"
              model={model}
              t={t}
            />
          </InterpretationReceipt>
          <InterpretationReceipt
            applicability={division.sharing.applicability}
            name="division-sharing-interpretation"
            title={t(FRACTION_OPERATIONS_COPY.sharingInterpretation)}
            t={t}
          >
            <FractionOperationsVisualModel
              kind="sharing-division"
              model={model}
              t={t}
            />
          </InterpretationReceipt>
        </>
      ) : null}
    </div>
  );
}

export type FractionOperationsLabUiState = Readonly<{
  actionReceipt: FractionOperationsActionReceipt;
  domainState: FractionOperationsDomainState;
  estimateOperation: FractionArithmeticOperation;
  lastRejection: FractionOperationsDivisorDomainError["code"] | null;
  receipt: FractionOperationsActionReceipt;
}>;

export function createFractionOperationsLabUiState(
  input: FractionOperationsInput,
): FractionOperationsLabUiState {
  const domainState = domainStateFromInput(input);
  const actionReceipt = initialActionReceipt(domainState);
  return {
    actionReceipt,
    domainState,
    estimateOperation: initialEstimateOperation(input),
    lastRejection: null,
    receipt: actionReceipt,
  };
}

export function reduceFractionOperationsLabUiState(
  current: FractionOperationsLabUiState,
  request: FractionOperationsDomainRequest,
  estimateOperation = current.estimateOperation,
): FractionOperationsLabUiState {
  try {
    const transition = executeFractionOperationsLabTransition(
      current.domainState,
      request,
    );
    return {
      actionReceipt: transition.actionReceipt,
      domainState: transition.state,
      estimateOperation,
      lastRejection: null,
      receipt: transition.actionReceipt,
    };
  } catch (error) {
    if (error instanceof FractionOperationsDivisorDomainError) {
      if (error.code !== "DIRECT_DIVISOR_ZERO_REQUEST") throw error;
      const actionReceipt = createFractionOperationsRejectedActionReceipt({
        before: current.domainState,
        rejection: error.code,
        request,
      });
      return {
        ...current,
        actionReceipt,
        lastRejection: error.code,
        receipt: actionReceipt,
      };
    }
    throw error;
  }
}

function AllowedFractionOperationsLab({
  controlFooterAction,
  initialInput,
  labId,
}: {
  controlFooterAction?: ReactNode;
  initialInput: FractionOperationsInput;
  labId: MainlandFractionOperationsLabId;
}) {
  const { t } = useSettings();
  const allowedModes = allowedModesForLab(labId);
  const estimateOperations = allowedEstimateOperations(labId);
  const [uiState, setUiState] = useState<FractionOperationsLabUiState>(() =>
    createFractionOperationsLabUiState(initialInput),
  );
  const { actionReceipt, domainState, estimateOperation } = uiState;
  const {
    leftDenominator,
    leftNumerator,
    mode,
    rightDenominator,
    rightNumerator,
  } = domainState;

  const input = useMemo<FractionOperationsInput>(
    () => inputFromDomainState(labId, domainState),
    [domainState, labId],
  );
  const model = useMemo(() => buildFractionOperationsModel(input), [input]);
  const divisionActive = model.operation.evaluatedOperation === "divide";

  function selectMode(nextMode: FractionOperationsMode) {
    if (!allowedModes.includes(nextMode)) return;
    setUiState((current) =>
      reduceFractionOperationsLabUiState(current, {
        kind: "controller",
        mode: nextMode,
        evaluatedOperation:
          nextMode === "estimate" ? current.estimateOperation : nextMode,
      }),
    );
  }

  function selectEstimateOperation(next: FractionArithmeticOperation) {
    if (!estimateOperations.includes(next)) return;
    setUiState((current) =>
      reduceFractionOperationsLabUiState(
        current,
        {
          kind: "controller",
          mode: "estimate",
          evaluatedOperation: next,
        },
        next,
      ),
    );
  }

  function updateControl(
    controlId: Extract<
      FractionOperationsDomainRequest,
      { kind: "control" }
    >["controlId"],
    value: number,
  ) {
    setUiState((current) =>
      reduceFractionOperationsLabUiState(current, {
        kind: "control",
        controlId,
        value,
      }),
    );
  }

  function reset() {
    const resetInput = copyInput(
      FRACTION_OPERATIONS_RESET_INPUTS[labId] as FractionOperationsInput,
    );
    setUiState((current) => {
      const resetState = createFractionOperationsLabUiState(resetInput);
      const actionReceipt = createFractionOperationsAcceptedActionReceipt({
        before: current.domainState,
        expected: resetState.domainState,
        observed: resetState.domainState,
        projections: [],
        request: { kind: "reset" },
        requested: resetState.domainState,
      });
      return {
        ...resetState,
        actionReceipt,
        receipt: actionReceipt,
      };
    });
  }

  return (
    <section
      data-mainland-fraction-operations="true"
      data-viz-topic-id={labId}
      data-viz-family={model.family}
      data-viz-model={model.version}
      data-viz-configured-model={model.version}
      data-viz-configured-state={model.stateKey}
      data-viz-state={model.stateKey}
      data-viz-mode={model.mode}
      data-viz-evaluated-operation={model.operation.evaluatedOperation}
      data-viz-action-accepted={String(actionReceipt.accepted)}
      data-viz-action-before={serializeDomainState(actionReceipt.before)}
      data-viz-action-expected={serializeDomainState(actionReceipt.expected)}
      data-viz-action-observed={serializeDomainState(actionReceipt.observed)}
      data-viz-action-projections={JSON.stringify(actionReceipt.projections)}
      data-viz-action-receipt={JSON.stringify(actionReceipt)}
      data-viz-action-receipt-version={
        FRACTION_OPERATIONS_ACTION_RECEIPT_CONTRACT.id
      }
      data-viz-action-rejection={actionReceipt.rejection ?? "none"}
      data-viz-action-request={JSON.stringify(actionReceipt.request)}
      data-viz-action-requested={serializeDomainState(actionReceipt.requested)}
      data-viz-action-requested-validity={actionReceipt.requestedValidity}
      data-viz-action-status={actionReceipt.status}
      data-viz-range-domain-id={FRACTION_OPERATIONS_DIVISOR_DOMAIN_ID}
      data-viz-domain-version={
        FRACTION_OPERATIONS_DIVISOR_DOMAIN_DESCRIPTOR.domainVersion
      }
      data-viz-domain-requested={serializeDomainState(actionReceipt.requested)}
      data-viz-domain-expected={serializeDomainState(actionReceipt.expected)}
      data-viz-domain-observed={serializeDomainState(actionReceipt.observed)}
      data-viz-domain-match={String(actionReceipt.matchesExpected)}
      data-viz-domain-projection-count={actionReceipt.projections.length}
      data-viz-domain-projection-reasons={actionReceipt.projections
        .map(({ reason }) => reason)
        .join(",")}
      data-viz-domain-rejection={actionReceipt.rejection ?? undefined}
      className="min-w-0 rounded-3xl border border-slate-200 bg-slate-50 p-3 text-slate-950 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:p-5"
    >
      <header className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
          {t(FRACTION_OPERATIONS_COPY.eyebrow)}
        </p>
        <h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
          {t(FRACTION_OPERATIONS_COPY.title)}
        </h2>
        <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
          {t(FRACTION_OPERATIONS_COPY.goal)}
        </p>
      </header>

      <p
        data-viz-pan-hint="true"
        className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
      >
        {t(FRACTION_OPERATIONS_COPY.panHint)}
      </p>

      <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div
          data-viz-scroll-container="true"
          tabIndex={0}
          aria-label={t(FRACTION_OPERATIONS_COPY.panHint)}
          className="focus-ring min-w-0 overflow-x-auto rounded-2xl"
        >
          <div
            data-viz-surface="fraction-operations-receipts"
            className="min-w-[760px] space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <OperandCard
                label={t(FRACTION_OPERATIONS_COPY.leftFraction)}
                name="left"
                operand={model.operands.left}
                t={t}
              />
              <OperandCard
                label={t(FRACTION_OPERATIONS_COPY.rightFraction)}
                name="right"
                operand={model.operands.right}
                t={t}
              />
            </div>

            <VisibleOperationReceipt
              mixedResult={model.operation.mixedResult}
              receipt={model.visibleReceipt}
              t={t}
            />

            <div className="grid gap-3 lg:grid-cols-2">
              <div
                data-viz-mark="true"
                data-viz-name="common-denominator-receipt"
                data-viz-lcd={model.commonDenominator.leastCommonDenominator}
                data-viz-denominator-gcf={model.commonDenominator.denominatorGcf}
                data-viz-left-converted={model.commonDenominator.left.converted.text}
                data-viz-right-converted={model.commonDenominator.right.converted.text}
              >
                <ReceiptCard title={t(FRACTION_OPERATIONS_COPY.commonDenominator)}>
                  <p className="font-mono text-base">
                    {t(FRACTION_OPERATIONS_COPY.commonDenominatorShort)} {model.commonDenominator.leastCommonDenominator}: {model.operands.left.source.text} × {model.commonDenominator.left.multiplier}/{model.commonDenominator.left.multiplier} = {model.commonDenominator.left.converted.text}; {model.operands.right.source.text} × {model.commonDenominator.right.multiplier}/{model.commonDenominator.right.multiplier} = {model.commonDenominator.right.converted.text}
                  </p>
                  <p className="mt-2">
                    {t(FRACTION_OPERATIONS_COPY.denominatorGcf)}: {model.commonDenominator.denominatorGcf}
                  </p>
                </ReceiptCard>
              </div>

              <div
                data-viz-mark="true"
                data-viz-name="equivalent-fraction-receipt"
                data-viz-left-equivalent={model.operands.left.equivalent.equivalent.text}
                data-viz-right-equivalent={model.operands.right.equivalent.equivalent.text}
              >
                <ReceiptCard title={t(FRACTION_OPERATIONS_COPY.equivalentFractions)}>
                  <p className="font-mono text-base">
                    {model.operands.left.source.text} × 2/2 = {model.operands.left.equivalent.equivalent.text}
                  </p>
                  <p className="font-mono text-base">
                    {model.operands.right.source.text} × 2/2 = {model.operands.right.equivalent.equivalent.text}
                  </p>
                </ReceiptCard>
              </div>

              <div
                data-viz-mark="true"
                data-viz-name="operand-simplification-receipt"
                data-viz-left-gcf={model.operands.left.simplification.gcf}
                data-viz-right-gcf={model.operands.right.simplification.gcf}
                data-viz-result-gcf={model.operation.resultSimplification.gcf}
              >
                <ReceiptCard title={t(FRACTION_OPERATIONS_COPY.simplification)}>
                  <p className="font-mono text-base">
                    ({model.operands.left.source.numerator} ÷{" "}
                    {model.operands.left.simplification.gcf}) / ({model.operands.left.source.denominator}{" "}
                    ÷ {model.operands.left.simplification.gcf}) ={" "}
                    {model.operands.left.normalized.text}
                  </p>
                  <p className="font-mono text-base">
                    ({model.operands.right.source.numerator} ÷{" "}
                    {model.operands.right.simplification.gcf}) / ({model.operands.right.source.denominator}{" "}
                    ÷ {model.operands.right.simplification.gcf}) ={" "}
                    {model.operands.right.normalized.text}
                  </p>
                </ReceiptCard>
              </div>

              <div
                data-viz-mark="true"
                data-viz-name="cross-product-receipt"
                data-viz-left-cross-product={model.comparison.leftCrossProduct}
                data-viz-right-cross-product={model.comparison.rightCrossProduct}
                data-viz-relation={model.comparison.symbol}
              >
                <ReceiptCard title={t(FRACTION_OPERATIONS_COPY.crossProducts)}>
                  <p className="font-mono text-base">
                    {model.operands.left.source.numerator} × {model.operands.right.source.denominator} = {model.comparison.leftCrossProduct} {model.comparison.symbol} {model.comparison.rightCrossProduct} = {model.operands.right.source.numerator} × {model.operands.left.source.denominator}
                  </p>
                </ReceiptCard>
              </div>
            </div>

            <OperationReceipts model={model} t={t} />

            <div
              data-viz-mark="true"
              data-viz-name="equation-check"
              data-viz-check-kind={model.equationCheck.kind}
              data-viz-reconstruction-id={model.equationCheck.reconstructionId}
              data-viz-left-side={model.equationCheck.leftSide.text}
              data-viz-right-side={model.equationCheck.rightSide.text}
              data-viz-check-holds="true"
            >
              <ReceiptCard title={t(FRACTION_OPERATIONS_COPY.equationCheck)}>
                <p>
                  {t(
                    FRACTION_OPERATIONS_COPY.equationReconstructions[
                      model.equationCheck.reconstructionId
                    ],
                  )}
                </p>
                <p className="mt-1 font-mono text-base">
                  {model.equationCheck.leftSide.text} = {model.equationCheck.rightSide.text}
                </p>
              </ReceiptCard>
            </div>
          </div>
        </div>

        <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
          <h3 className="text-sm font-black">
            {t(FRACTION_OPERATIONS_COPY.controls)}
          </h3>
          <div
            role="group"
            aria-label={t(FRACTION_OPERATIONS_COPY.modesLabel)}
            className="grid grid-cols-2 gap-2"
          >
            {allowedModes.map((value) => {
              const active = value === mode;
              return (
                <button
                  key={value}
                  type="button"
                  data-viz-mode-button="true"
                  data-viz-mode={value}
                  data-viz-mode-active={String(active)}
                  data-viz-domain-controller="mode"
                  data-viz-range-affects={
                    value === "divide" ||
                    (value === "estimate" && estimateOperation === "divide")
                      ? "right-numerator"
                      : undefined
                  }
                  data-viz-range-projection={
                    value === "divide" ||
                    (value === "estimate" && estimateOperation === "divide")
                      ? FRACTION_OPERATIONS_DIVISOR_DOMAIN_DESCRIPTOR.projection
                      : undefined
                  }
                  data-viz-range-projection-reason={
                    value === "divide" ||
                    (value === "estimate" && estimateOperation === "divide")
                      ? FRACTION_OPERATIONS_DIVISOR_DOMAIN_DESCRIPTOR.projectionReason
                      : undefined
                  }
                  aria-pressed={active}
                  className={`focus-ring min-h-11 rounded-xl border px-3 py-2 text-sm font-black ${
                    active
                      ? "border-sky-700 bg-sky-700 text-white dark:border-sky-300 dark:bg-sky-300 dark:text-slate-950"
                      : "border-slate-300 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  }`}
                  onClick={() => selectMode(value)}
                >
                  {t(FRACTION_OPERATIONS_COPY.modes[value])}
                </button>
              );
            })}
          </div>

          {mode === "estimate" ? (
            <label className="block rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
              <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                {t(FRACTION_OPERATIONS_COPY.estimateOperation)}
              </span>
              <select
                data-viz-parameter="estimate-operation"
                data-viz-domain-controller="evaluated-operation"
                data-viz-range-affects="right-numerator"
                data-viz-range-projection={
                  FRACTION_OPERATIONS_DIVISOR_DOMAIN_DESCRIPTOR.projection
                }
                data-viz-range-projection-reason={
                  FRACTION_OPERATIONS_DIVISOR_DOMAIN_DESCRIPTOR.projectionReason
                }
                className="focus-ring mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-black text-slate-950 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                value={estimateOperation}
                onChange={(event) =>
                  selectEstimateOperation(
                    event.currentTarget.value as FractionArithmeticOperation,
                  )
                }
              >
                {estimateOperations.map((value) => (
                  <option key={value} value={value}>
                    {t(FRACTION_OPERATIONS_COPY.estimateOperations[value])}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <NumberControl
              controlId="left-numerator"
              label={t(FRACTION_OPERATIONS_COPY.leftNumerator)}
              minimum={UI_MIN_NUMERATOR}
              maximum={UI_MAX_NUMERATOR}
              output={String(leftNumerator)}
              value={leftNumerator}
              onChange={(event) => {
                const value = parseInteger(
                  event,
                  UI_MIN_NUMERATOR,
                  UI_MAX_NUMERATOR,
                );
                if (value !== null) updateControl("left-numerator", value);
              }}
            />
            <NumberControl
              controlId="left-denominator"
              label={t(FRACTION_OPERATIONS_COPY.leftDenominator)}
              minimum={1}
              maximum={UI_MAX_DENOMINATOR}
              output={String(leftDenominator)}
              value={leftDenominator}
              onChange={(event) => {
                const value = parseInteger(event, 1, UI_MAX_DENOMINATOR);
                if (value !== null) updateControl("left-denominator", value);
              }}
            />
            <NumberControl
              controlId="right-numerator"
              label={t(FRACTION_OPERATIONS_COPY.rightNumerator)}
              minimum={UI_MIN_NUMERATOR}
              maximum={UI_MAX_NUMERATOR}
              output={String(rightNumerator)}
              value={rightNumerator}
              zeroExcluded={divisionActive}
              onChange={(event) => {
                const value = parseInteger(
                  event,
                  UI_MIN_NUMERATOR,
                  UI_MAX_NUMERATOR,
                );
                if (value !== null) updateControl("right-numerator", value);
              }}
            />
            <NumberControl
              controlId="right-denominator"
              label={t(FRACTION_OPERATIONS_COPY.rightDenominator)}
              minimum={1}
              maximum={UI_MAX_DENOMINATOR}
              output={String(rightDenominator)}
              value={rightDenominator}
              onChange={(event) => {
                const value = parseInteger(event, 1, UI_MAX_DENOMINATOR);
                if (value !== null) updateControl("right-denominator", value);
              }}
            />
          </div>

          {divisionActive ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
              {t(FRACTION_OPERATIONS_COPY.nonZero)}
            </p>
          ) : null}

          <div
            data-viz-state-summary="true"
            aria-live="polite"
            aria-atomic="true"
            className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-3 text-sm font-black leading-6 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100"
          >
            <span className="block text-xs uppercase tracking-[0.12em]">
              {t(FRACTION_OPERATIONS_COPY.currentState)}
            </span>
            <span className="mt-1 block font-mono">
              {visibleReceiptSummary(model.visibleReceipt, t)}
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-black">
              {t(FRACTION_OPERATIONS_COPY.invariantChecks)}
            </h3>
            <ul className="mt-2 space-y-2">
              {model.invariantReceipts.map((receipt, index) => (
                <li
                  key={receipt.id}
                  data-viz-invariant="true"
                  data-viz-invariant-id={receipt.id}
                  data-viz-invariant-status="pass"
                  data-viz-invariant-expected={receipt.expected}
                  data-viz-invariant-observed={receipt.observed}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                >
                  <span>{t(FRACTION_OPERATIONS_COPY.verifiedRelationship)}</span>{" "}
                  <span aria-hidden="true">{index + 1}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            data-viz-reset-model="true"
            data-viz-reset-module-id="configured-visualization-lab"
            data-viz-reset-topic-id={labId}
            className="focus-ring min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            onClick={reset}
          >
            {t(FRACTION_OPERATIONS_COPY.reset)}
          </button>

          {controlFooterAction ? (
            <div data-viz-lesson-action-slot>{controlFooterAction}</div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

export function FractionOperationsLab(props: FractionOperationsLabProps) {
  if (!isMainlandFractionOperationsLabId(props.labId)) return null;
  const initialInput = checkedInitialInput(props.labId, props.initialInput);
  if (!initialInput) return null;
  return (
    <AllowedFractionOperationsLab
      key={props.labId}
      controlFooterAction={props.controlFooterAction}
      initialInput={initialInput}
      labId={props.labId}
    />
  );
}
