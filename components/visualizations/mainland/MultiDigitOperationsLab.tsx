"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { useSettings } from "../../providers/AppProviders";
import type { LocalizedText } from "../../../types";
import {
  MULTI_DIGIT_OPERATIONS_DOMAIN,
  MULTI_DIGIT_OPERATIONS_MODEL_VERSION,
  MULTI_DIGIT_OPERATIONS_RESET_INPUT,
  buildMultiDigitOperationsModel,
  type MultiDigitBaseOperation,
  type MultiDigitOperation,
  type MultiDigitOperationsInput,
  type MultiDigitOperationsModel,
} from "./MultiDigitOperationsModel";
import {
  createMainlandPhysicalCommitHandlers,
  type MainlandPhysicalCommitRecorder,
} from "./MainlandPhysicalCommitAnalytics";

export const MAINLAND_MULTI_DIGIT_OPERATIONS_LAB_IDS = [
  "bnu-primary-p3-lower-two-digit-multiplication",
  "bnu-primary-p3-upper-multi-digit-multiplication",
  "bnu-primary-p3-upper-multiplication-division-fluency",
  "bnu-primary-p4-upper-division",
  "bnu-primary-p4-upper-multiplication",
  "hjb-primary-p3-lower-two-digit-multiplication-division",
  "hjb-primary-p3-upper-multiplication-division-extension",
  "hjb-primary-p3-upper-one-digit-multiplication",
  "hjb-primary-p4-upper-four-operations-problem-solving",
] as const;

export type MainlandMultiDigitOperationsLabId =
  (typeof MAINLAND_MULTI_DIGIT_OPERATIONS_LAB_IDS)[number];

const MULTI_DIGIT_OPERATIONS_LAB_ID_SET = new Set<string>(
  MAINLAND_MULTI_DIGIT_OPERATIONS_LAB_IDS,
);

export function isMainlandMultiDigitOperationsLabId(
  labId: string,
): labId is MainlandMultiDigitOperationsLabId {
  return MULTI_DIGIT_OPERATIONS_LAB_ID_SET.has(labId);
}

function localized(en: string, zh: string, zhHans: string): LocalizedText {
  return { en, zh, zhHans };
}

export const MULTI_DIGIT_OPERATIONS_COPY = {
  title: localized("Multi-digit operations", "多位數運算", "多位数运算"),
  goal: localized(
    "Connect every written step to exact place value, regrouping, and inverse checks.",
    "把每個直式步驟連結到精確數位、重組和逆運算檢查。",
    "把每个竖式步骤连接到精确数位、重组和逆运算检查。",
  ),
  panHint: localized(
    "Swipe horizontally or use the arrow keys to inspect the whole model.",
    "左右滑動或使用方向鍵查看完整模型。",
    "左右滑动或使用方向键查看完整模型。",
  ),
  modesLabel: localized("Operation mode", "運算模式", "运算模式"),
  modes: {
    add: localized("Add", "加法", "加法"),
    subtract: localized("Subtract", "減法", "减法"),
    multiply: localized("Multiply", "乘法", "乘法"),
    divide: localized("Divide", "除法", "除法"),
    "estimate-check": localized(
      "Estimate and check",
      "估算並檢查",
      "估算并检查",
    ),
  },
  operandA: localized("Operand A", "運算數 A", "运算数 A"),
  operandB: localized("Operand B", "運算數 B", "运算数 B"),
  strategyStep: localized("Strategy step", "策略步驟", "策略步骤"),
  estimateOperation: localized(
    "Operation to estimate",
    "要估算的運算",
    "要估算的运算",
  ),
  roundingPlace: localized("Rounding place", "取整數位", "取整数位"),
  roundingPlaces: {
    ones: localized("nearest one", "取整到個位", "取整到个位"),
    tens: localized("nearest ten", "取整到十位", "取整到十位"),
    hundreds: localized("nearest hundred", "取整到百位", "取整到百位"),
    thousands: localized("nearest thousand", "取整到千位", "取整到千位"),
    tenThousands: localized("nearest ten thousand", "取整到萬位", "取整到万位"),
    hundredThousands: localized(
      "nearest hundred thousand",
      "取整到十萬位",
      "取整到十万位",
    ),
  },
  steps: {
    placeValue: localized("Place value", "數位分解", "数位分解"),
    algorithm: localized("Written strategy", "直式策略", "竖式策略"),
    exactResult: localized("Exact result", "精確結果", "精确结果"),
    check: localized("Check and explain", "檢查並解釋", "检查并解释"),
  },
  placeValue: localized("Place-value reconstruction", "數位重構", "数位重构"),
  partialProducts: localized("Partial products", "部分積", "部分积"),
  partialQuotients: localized("Partial quotients", "部分商", "部分商"),
  regrouping: localized("Regrouping receipts", "重組記錄", "重组记录"),
  remainder: localized("Remainder", "餘數", "余数"),
  inverse: localized("Inverse reconstruction", "逆運算重構", "逆运算重构"),
  estimate: localized("Estimate", "估算", "估算"),
  estimateError: localized("Estimate error", "估算誤差", "估算误差"),
  invariants: localized("Verified invariants", "已驗證不變量", "已验证不变量"),
  exactResult: localized("Exact result", "精確結果", "精确结果"),
  reset: localized("Reset model", "重設模型", "重设模型"),
  passed: localized("verified", "已驗證", "已验证"),
} as const;

const MODE_VALUES = [
  "add",
  "subtract",
  "multiply",
  "divide",
  "estimate-check",
] as const;
const BASE_OPERATION_VALUES = [
  "add",
  "subtract",
  "multiply",
  "divide",
] as const;
const STRATEGY_STEPS = [0, 1, 2, 3] as const;

const ROUNDING_PLACE_COPY = new Map<number, LocalizedText>([
  [1, MULTI_DIGIT_OPERATIONS_COPY.roundingPlaces.ones],
  [10, MULTI_DIGIT_OPERATIONS_COPY.roundingPlaces.tens],
  [100, MULTI_DIGIT_OPERATIONS_COPY.roundingPlaces.hundreds],
  [1_000, MULTI_DIGIT_OPERATIONS_COPY.roundingPlaces.thousands],
  [10_000, MULTI_DIGIT_OPERATIONS_COPY.roundingPlaces.tenThousands],
  [100_000, MULTI_DIGIT_OPERATIONS_COPY.roundingPlaces.hundredThousands],
]);

export type MultiDigitOperationsLabProps = {
  labId: string;
  initialInput?: MultiDigitOperationsInput;
  initialStrategyStep?: number;
  controlFooterAction?: ReactNode;
  onLearningEvent?: MainlandPhysicalCommitRecorder;
};

function validateInitialStrategyStep(value: number | undefined): number {
  if (value === undefined) return 0;
  if (
    !Number.isInteger(value) ||
    !STRATEGY_STEPS.includes(value as (typeof STRATEGY_STEPS)[number])
  ) {
    throw new RangeError(
      "initialStrategyStep must be an integer from 0 through 3.",
    );
  }
  return value;
}

function initialExactOperation(
  input: MultiDigitOperationsInput,
): MultiDigitBaseOperation {
  return input.operation === "estimate-check"
    ? input.exactOperation
    : input.operation;
}

function initialRoundingPlace(input: MultiDigitOperationsInput): number {
  return input.operation === "estimate-check" ? input.roundingPlace : 10;
}

function operationSymbol(operation: MultiDigitBaseOperation): string {
  switch (operation) {
    case "add":
      return "+";
    case "subtract":
      return "−";
    case "multiply":
      return "×";
    case "divide":
      return "÷";
  }
}

function exactFormula(
  model: MultiDigitOperationsModel,
  format: (value: number) => string,
): string {
  if (model.result.kind === "division") {
    return `${format(model.operands.left)} = ${format(model.operands.right)} × ${format(model.result.quotient)} + ${format(model.result.remainder)}`;
  }
  return `${format(model.operands.left)} ${operationSymbol(model.exactOperation)} ${format(model.operands.right)} = ${format(model.result.value)}`;
}

function placeValueFormula(
  receipts: MultiDigitOperationsModel["placeValues"]["left"],
  format: (value: number) => string,
): string {
  return receipts
    .slice()
    .reverse()
    .map(({ contribution }) => format(contribution))
    .join(" + ");
}

function resultValue(model: MultiDigitOperationsModel): number {
  return model.result.kind === "whole"
    ? model.result.value
    : model.result.quotient;
}

function stepClasses(active: boolean): string {
  return active
    ? "border-cyan-500 bg-cyan-50 text-slate-950 dark:border-cyan-300 dark:bg-cyan-950 dark:text-white"
    : "border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
}

function MultiDigitOperationsSvg({
  model,
  strategyStep,
  format,
  text,
  dark,
}: {
  model: MultiDigitOperationsModel;
  strategyStep: number;
  format: (value: number) => string;
  text: (value: LocalizedText) => string;
  dark: boolean;
}) {
  const background = dark ? "#020617" : "#f8fafc";
  const panel = dark ? "#0f172a" : "#ffffff";
  const border = dark ? "#475569" : "#cbd5e1";
  const primaryText = dark ? "#f8fafc" : "#0f172a";
  const secondaryText = dark ? "#cbd5e1" : "#334155";
  const accent = dark ? "#67e8f9" : "#0e7490";
  const exact = exactFormula(model, format);
  const algorithmRows =
    model.algorithm.kind === "addition"
      ? model.algorithm.columns.map(
          (column) =>
            `${format(column.place)}: ${column.leftDigit}+${column.rightDigit}+${column.carryIn}=${column.rawTotal} → ${column.resultDigit}, c${column.carryOut}`,
        )
      : model.algorithm.kind === "subtraction"
        ? model.algorithm.columns.map(
            (column) =>
              `${format(column.place)}: ${column.leftDigit}−${column.borrowIn}+${column.borrowOut * 10}−${column.rightDigit}=${column.resultDigit}`,
          )
        : model.algorithm.kind === "multiplication"
          ? model.algorithm.partialProducts.map(
              (receipt) =>
                `${format(model.operands.left)} × ${receipt.multiplierDigit} × ${format(receipt.multiplierPlace)} = ${format(receipt.partialProduct)}`,
            )
          : model.algorithm.steps.map(
              (step) =>
                `${format(step.workingDividend)} ÷ ${format(model.operands.right)} → ${step.quotientDigit}, r${format(step.remainder)}`,
            );
  const algorithmHeading =
    model.algorithm.kind === "multiplication"
      ? text(MULTI_DIGIT_OPERATIONS_COPY.partialProducts)
      : model.algorithm.kind === "division"
        ? text(MULTI_DIGIT_OPERATIONS_COPY.partialQuotients)
        : text(MULTI_DIGIT_OPERATIONS_COPY.regrouping);

  return (
    <svg
      data-viz-surface
      data-viz-svg-background="opaque"
      role="img"
      aria-label={text(MULTI_DIGIT_OPERATIONS_COPY.title)}
      viewBox="0 0 960 520"
      className="block h-auto w-full min-w-[760px]"
    >
      <rect width="960" height="520" rx="24" fill={background} />
      <rect
        x="24"
        y="24"
        width="912"
        height="472"
        rx="20"
        fill={panel}
        stroke={border}
        strokeWidth="2"
      />

      <g
        data-viz-mark
        data-viz-name="place-value-receipt"
        data-viz-strategy-step="0"
      >
        <text x="52" y="66" fill={accent} className="text-sm font-black">
          {text(MULTI_DIGIT_OPERATIONS_COPY.placeValue)}
        </text>
        <text
          x="52"
          y="104"
          fill={primaryText}
          className="text-base font-black"
        >
          A = {placeValueFormula(model.placeValues.left, format)}
        </text>
        <text
          x="52"
          y="140"
          fill={primaryText}
          className="text-base font-black"
        >
          B = {placeValueFormula(model.placeValues.right, format)}
        </text>
      </g>

      <g
        data-viz-mark
        data-viz-name={
          model.algorithm.kind === "division"
            ? "partial-quotient"
            : model.algorithm.kind === "multiplication"
              ? "partial-product"
              : model.algorithm.kind === "addition"
                ? "carry-receipt"
                : "borrow-receipt"
        }
        data-viz-strategy-step="1"
      >
        <text x="512" y="66" fill={accent} className="text-sm font-black">
          {algorithmHeading}
        </text>
        {algorithmRows.slice(0, 7).map((row, index) => (
          <text
            key={`${row}-${index}`}
            x="512"
            y={100 + index * 38}
            fill={primaryText}
            className="text-sm font-bold"
          >
            {row}
          </text>
        ))}
      </g>

      {model.algorithm.kind === "multiplication" ? (
        <g
          data-viz-mark
          data-viz-name="regroup-receipt"
          data-viz-strategy-step="1"
        >
          <text
            x="52"
            y="198"
            fill={secondaryText}
            className="text-sm font-bold"
          >
            {text(MULTI_DIGIT_OPERATIONS_COPY.regrouping)}:{" "}
            {
              model.algorithm.partialProducts
                .flatMap((receipt) => receipt.digitSteps)
                .filter((step) => step.carryOut > 0).length
            }
          </text>
        </g>
      ) : null}

      <g
        data-viz-mark
        data-viz-name="exact-result"
        data-viz-value={resultValue(model)}
        data-viz-strategy-step="2"
      >
        <rect
          x="52"
          y="242"
          width="406"
          height="86"
          rx="16"
          fill={background}
          stroke={border}
          strokeWidth="2"
        />
        <text
          x="72"
          y="274"
          fill={secondaryText}
          className="text-xs font-black"
        >
          {text(MULTI_DIGIT_OPERATIONS_COPY.exactResult)}
        </text>
        <text x="72" y="310" fill={primaryText} className="text-lg font-black">
          {exact}
        </text>
      </g>

      {model.result.kind === "division" ? (
        <>
          <g
            data-viz-mark
            data-viz-name="remainder-receipt"
            data-viz-remainder={model.result.remainder}
            data-viz-strategy-step="2"
          >
            <text
              x="52"
              y="368"
              fill={primaryText}
              className="text-sm font-black"
            >
              {text(MULTI_DIGIT_OPERATIONS_COPY.remainder)} ={" "}
              {format(model.result.remainder)}; 0 ≤{" "}
              {format(model.result.remainder)} &lt;{" "}
              {format(model.operands.right)}
            </text>
          </g>
          <g
            data-viz-mark
            data-viz-name="inverse-reconstruction"
            data-viz-observed={model.result.inverseReconstruction}
            data-viz-strategy-step="3"
          >
            <text
              x="52"
              y="414"
              fill={primaryText}
              className="text-sm font-black"
            >
              {text(MULTI_DIGIT_OPERATIONS_COPY.inverse)}: {exact}
            </text>
          </g>
        </>
      ) : null}

      {model.estimate ? (
        <>
          <g
            data-viz-mark
            data-viz-name="estimate-receipt"
            data-viz-estimated-value={model.estimate.estimatedValue}
            data-viz-strategy-step="3"
          >
            <text
              x="52"
              y="374"
              fill={primaryText}
              className="text-sm font-black"
            >
              {text(MULTI_DIGIT_OPERATIONS_COPY.estimate)}:{" "}
              {format(model.estimate.roundedLeft)}{" "}
              {operationSymbol(model.estimate.exactOperation)}{" "}
              {format(model.estimate.roundedRight)} ={" "}
              {format(model.estimate.estimatedValue)}
            </text>
          </g>
          <g
            data-viz-mark
            data-viz-name="estimate-error"
            data-viz-signed-error={model.estimate.signedError}
            data-viz-strategy-step="3"
          >
            <text
              x="52"
              y="420"
              fill={primaryText}
              className="text-sm font-black"
            >
              {text(MULTI_DIGIT_OPERATIONS_COPY.estimateError)}:{" "}
              {format(model.estimate.signedError)}; |error| ={" "}
              {format(model.estimate.absoluteError)}
            </text>
          </g>
        </>
      ) : null}

      <text x="52" y="470" fill={secondaryText} className="text-xs font-bold">
        {text(MULTI_DIGIT_OPERATIONS_COPY.strategyStep)} {strategyStep + 1} /{" "}
        {STRATEGY_STEPS.length}
      </text>
    </svg>
  );
}

function AllowedMultiDigitOperationsLab({
  labId,
  initialInput = MULTI_DIGIT_OPERATIONS_RESET_INPUT,
  initialStrategyStep,
  controlFooterAction,
  onLearningEvent,
}: {
  labId: MainlandMultiDigitOperationsLabId;
  initialInput?: MultiDigitOperationsInput;
  initialStrategyStep?: number;
  controlFooterAction?: ReactNode;
  onLearningEvent?: MainlandPhysicalCommitRecorder;
}) {
  const { language, t, theme } = useSettings();
  const panHintId = useId();
  const [mode, setMode] = useState<MultiDigitOperation>(initialInput.operation);
  const [exactOperation, setExactOperation] = useState<MultiDigitBaseOperation>(
    () => initialExactOperation(initialInput),
  );
  const [left, setLeft] = useState(initialInput.left);
  const [right, setRight] = useState(initialInput.right);
  const [roundingPlace, setRoundingPlace] = useState(() =>
    initialRoundingPlace(initialInput),
  );
  const [strategyStep, setStrategyStep] = useState(() =>
    validateInitialStrategyStep(initialStrategyStep),
  );
  const activeExactOperation =
    mode === "estimate-check" ? exactOperation : mode;
  const rightMinimum = activeExactOperation === "divide" ? 1 : 0;
  const rightMaximum =
    activeExactOperation === "subtract"
      ? left
      : MULTI_DIGIT_OPERATIONS_DOMAIN.maxOperand;
  const modelInput: MultiDigitOperationsInput =
    mode === "estimate-check"
      ? { operation: mode, exactOperation, left, right, roundingPlace }
      : { operation: mode, left, right };
  const model = useMemo(
    () => buildMultiDigitOperationsModel(modelInput),
    [mode, exactOperation, left, right, roundingPlace],
  );
  const locale =
    language === "zh"
      ? "zh-Hant-HK"
      : language === "zh-Hans"
        ? "zh-Hans-CN"
        : "en-HK";
  const format = useMemo(() => new Intl.NumberFormat(locale).format, [locale]);
  const dark = theme === "dark";
  const {
    recordModeCommit,
    recordRangeCommit,
    recordRangeKeyCommit,
    recordResetCommit,
  } =
    createMainlandPhysicalCommitHandlers(onLearningEvent);

  function selectMode(nextMode: MultiDigitOperation) {
    if (nextMode !== "estimate-check") setExactOperation(nextMode);
    const nextExact = nextMode === "estimate-check" ? exactOperation : nextMode;
    if (nextExact === "subtract" && right > left) setRight(left);
    if (nextExact === "divide" && right === 0) setRight(1);
    setMode(nextMode);
    recordModeCommit();
  }

  function selectEstimateOperation(nextOperation: MultiDigitBaseOperation) {
    if (nextOperation === "subtract" && right > left) setRight(left);
    if (nextOperation === "divide" && right === 0) setRight(1);
    setExactOperation(nextOperation);
    recordModeCommit();
  }

  function selectRoundingPlace(nextRoundingPlace: number) {
    setRoundingPlace(nextRoundingPlace);
    recordModeCommit();
  }

  function updateLeft(nextLeft: number) {
    setLeft(nextLeft);
    if (activeExactOperation === "subtract" && right > nextLeft)
      setRight(nextLeft);
  }

  function updateRight(nextRight: number) {
    setRight(nextRight);
  }

  function reset() {
    setMode(MULTI_DIGIT_OPERATIONS_RESET_INPUT.operation);
    setExactOperation(MULTI_DIGIT_OPERATIONS_RESET_INPUT.operation);
    setLeft(MULTI_DIGIT_OPERATIONS_RESET_INPUT.left);
    setRight(MULTI_DIGIT_OPERATIONS_RESET_INPUT.right);
    setRoundingPlace(10);
    setStrategyStep(0);
    recordResetCommit();
  }

  const result =
    model.result.kind === "whole"
      ? `${t(MULTI_DIGIT_OPERATIONS_COPY.exactResult)}: ${format(model.result.value)}`
      : `${t(MULTI_DIGIT_OPERATIONS_COPY.exactResult)}: ${format(model.result.quotient)}; ${t(MULTI_DIGIT_OPERATIONS_COPY.remainder)}: ${format(model.result.remainder)}`;

  return (
    <section
      data-mainland-multi-digit-operations="v1"
      data-viz-topic-id={labId}
      data-viz-family="multi-digit-operations"
      data-viz-configured-model={MULTI_DIGIT_OPERATIONS_MODEL_VERSION}
      data-viz-configured-state={model.stateKey}
      data-viz-mode={model.operation}
      data-viz-active-strategy-step={strategyStep}
      data-viz-invariant-ids={model.invariantReceipts
        .map(({ id }) => id)
        .join(",")}
      aria-label={t(MULTI_DIGIT_OPERATIONS_COPY.title)}
      className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:p-5"
    >
      <header className="space-y-2">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
          {t(MULTI_DIGIT_OPERATIONS_COPY.goal)}
        </p>
        <h2 className="text-xl font-black sm:text-2xl">
          {t(MULTI_DIGIT_OPERATIONS_COPY.title)}
        </h2>
      </header>

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
          <p
            id={panHintId}
            data-viz-pan-hint
            className="mb-2 text-xs font-bold text-slate-600 dark:text-slate-300 sm:hidden"
          >
            {t(MULTI_DIGIT_OPERATIONS_COPY.panHint)}
          </p>
          <div
            data-viz-scroll-container
            aria-describedby={panHintId}
            tabIndex={0}
            className="focus-ring max-w-full touch-pan-x overflow-x-auto overscroll-x-contain rounded-2xl"
          >
            <MultiDigitOperationsSvg
              model={model}
              strategyStep={strategyStep}
              format={format}
              text={t}
              dark={dark}
            />
          </div>
        </div>

        <aside className="min-w-0 space-y-4">
          <div
            role="group"
            aria-label={t(MULTI_DIGIT_OPERATIONS_COPY.modesLabel)}
            className="grid grid-cols-2 gap-2"
          >
            {MODE_VALUES.map((value) => {
              const active = value === mode;
              return (
                <button
                  key={value}
                  type="button"
                  data-viz-mode-button="true"
                  data-viz-mode={value}
                  data-viz-mode-active={String(active)}
                  aria-pressed={active}
                  onClick={() => selectMode(value)}
                  className={`focus-ring min-h-11 rounded-xl border px-3 py-2 text-sm font-black ${
                    active
                      ? "border-cyan-500 bg-cyan-100 text-cyan-950 dark:border-cyan-300 dark:bg-cyan-950 dark:text-cyan-100"
                      : "border-slate-300 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  }`}
                >
                  {t(MULTI_DIGIT_OPERATIONS_COPY.modes[value])}
                </button>
              );
            })}
          </div>

          <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
            <span className="flex items-center justify-between gap-3">
              <span>{t(MULTI_DIGIT_OPERATIONS_COPY.operandA)}</span>
              <output className="rounded-full border border-slate-300 bg-white px-2.5 py-1 font-mono text-xs text-slate-950 dark:border-slate-600 dark:bg-slate-900 dark:text-white">
                {format(left)}
              </output>
            </span>
            <input
              data-viz-control="range"
              data-viz-parameter="operand-a"
              data-viz-range-affects={
                activeExactOperation === "subtract" ? "operand-b" : undefined
              }
              data-viz-range-projection={
                activeExactOperation === "subtract" ? "clamp-max" : undefined
              }
              data-viz-range-projection-reason={
                activeExactOperation === "subtract"
                  ? "whole-number-subtraction-remains-nonnegative"
                  : undefined
              }
              aria-label={t(MULTI_DIGIT_OPERATIONS_COPY.operandA)}
              type="range"
              min={MULTI_DIGIT_OPERATIONS_DOMAIN.minOperand}
              max={MULTI_DIGIT_OPERATIONS_DOMAIN.maxOperand}
              step="1"
              value={left}
              onChange={(event) =>
                updateLeft(Number(event.currentTarget.value))
              }
              onPointerUp={recordRangeCommit}
              onKeyUp={(event) => recordRangeKeyCommit(event.key, event)}
              className="focus-ring min-h-11 w-full cursor-pointer accent-cyan-600"
            />
          </label>

          <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
            <span className="flex items-center justify-between gap-3">
              <span>{t(MULTI_DIGIT_OPERATIONS_COPY.operandB)}</span>
              <output className="rounded-full border border-slate-300 bg-white px-2.5 py-1 font-mono text-xs text-slate-950 dark:border-slate-600 dark:bg-slate-900 dark:text-white">
                {format(right)}
              </output>
            </span>
            <input
              data-viz-control="range"
              data-viz-parameter="operand-b"
              aria-label={t(MULTI_DIGIT_OPERATIONS_COPY.operandB)}
              type="range"
              min={rightMinimum}
              max={rightMaximum}
              step="1"
              value={right}
              onChange={(event) =>
                updateRight(Number(event.currentTarget.value))
              }
              onPointerUp={recordRangeCommit}
              onKeyUp={(event) => recordRangeKeyCommit(event.key, event)}
              className="focus-ring min-h-11 w-full cursor-pointer accent-cyan-600"
            />
          </label>

          <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
            <span className="flex items-center justify-between gap-3">
              <span>{t(MULTI_DIGIT_OPERATIONS_COPY.strategyStep)}</span>
              <output className="rounded-full border border-slate-300 bg-white px-2.5 py-1 font-mono text-xs text-slate-950 dark:border-slate-600 dark:bg-slate-900 dark:text-white">
                {strategyStep + 1} / {STRATEGY_STEPS.length}
              </output>
            </span>
            <input
              data-viz-control="range"
              data-viz-parameter="strategy-step"
              aria-label={t(MULTI_DIGIT_OPERATIONS_COPY.strategyStep)}
              type="range"
              min="0"
              max="3"
              step="1"
              value={strategyStep}
              onChange={(event) =>
                setStrategyStep(Number(event.currentTarget.value))
              }
              onPointerUp={recordRangeCommit}
              onKeyUp={(event) => recordRangeKeyCommit(event.key, event)}
              className="focus-ring min-h-11 w-full cursor-pointer accent-cyan-600"
            />
          </label>

          {mode === "estimate-check" ? (
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <label className="block min-w-0 text-sm font-bold text-slate-700 dark:text-slate-200">
                <span>{t(MULTI_DIGIT_OPERATIONS_COPY.estimateOperation)}</span>
                <select
                  data-viz-parameter="estimate-operation"
                  aria-label={t(MULTI_DIGIT_OPERATIONS_COPY.estimateOperation)}
                  value={exactOperation}
                  onChange={(event) =>
                    selectEstimateOperation(
                      event.currentTarget.value as MultiDigitBaseOperation,
                    )
                  }
                  className="focus-ring mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  {BASE_OPERATION_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {t(MULTI_DIGIT_OPERATIONS_COPY.modes[value])}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-0 text-sm font-bold text-slate-700 dark:text-slate-200">
                <span>{t(MULTI_DIGIT_OPERATIONS_COPY.roundingPlace)}</span>
                <select
                  data-viz-parameter="rounding-place"
                  aria-label={t(MULTI_DIGIT_OPERATIONS_COPY.roundingPlace)}
                  value={roundingPlace}
                  onChange={(event) =>
                    selectRoundingPlace(Number(event.currentTarget.value))
                  }
                  className="focus-ring mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  {MULTI_DIGIT_OPERATIONS_DOMAIN.roundingPlaces.map((place) => (
                    <option key={place} value={place}>
                      {t(
                        ROUNDING_PLACE_COPY.get(place) ??
                          MULTI_DIGIT_OPERATIONS_COPY.roundingPlace,
                      )}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
            {STRATEGY_STEPS.map((step) => (
              <div
                key={step}
                data-viz-strategy-step={step}
                data-viz-strategy-step-active={String(step === strategyStep)}
                aria-current={step === strategyStep ? "step" : undefined}
                className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-black ${stepClasses(step === strategyStep)}`}
              >
                {t(Object.values(MULTI_DIGIT_OPERATIONS_COPY.steps)[step]!)}
              </div>
            ))}
          </div>

          <div
            data-viz-state-summary
            aria-live="polite"
            aria-atomic="true"
            className="rounded-2xl border border-emerald-300 bg-emerald-50 px-3 py-3 text-sm font-black leading-6 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100"
          >
            {result}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-black">
              {t(MULTI_DIGIT_OPERATIONS_COPY.invariants)}
            </h3>
            <ul className="mt-2 space-y-2">
              {model.invariantReceipts.map((receipt) => (
                <li
                  key={receipt.id}
                  data-viz-invariant="true"
                  data-viz-invariant-id={receipt.id}
                  data-viz-invariant-status="pass"
                  data-viz-invariant-expected={receipt.expected}
                  data-viz-invariant-observed={receipt.observed}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                >
                  <span className="font-mono">{receipt.id}</span>:{" "}
                  {t(MULTI_DIGIT_OPERATIONS_COPY.passed)}
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            data-viz-reset-model="true"
            data-viz-reset-module-id="configured-visualization-lab"
            data-viz-reset-topic-id={labId}
            onClick={reset}
            className="focus-ring min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            {t(MULTI_DIGIT_OPERATIONS_COPY.reset)}
          </button>

          {controlFooterAction ? (
            <div data-viz-lesson-action-slot>{controlFooterAction}</div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

export function MultiDigitOperationsLab(props: MultiDigitOperationsLabProps) {
  if (!isMainlandMultiDigitOperationsLabId(props.labId)) return null;
  return <AllowedMultiDigitOperationsLab {...props} labId={props.labId} />;
}
