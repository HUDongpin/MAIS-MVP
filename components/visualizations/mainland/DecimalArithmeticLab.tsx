"use client";

import { useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { visualizationThemeForTheme } from "@/components/visualizations/visualizationTheme";
import type { FeaturedLabDefinition } from "@/data/visualizationLabs";
import type { LocalizedText } from "@/types";
import {
  DECIMAL_ARITHMETIC_MODEL_CONTRACT,
  buildDecimalArithmeticState,
  decimalArithmeticOperations,
  decimalArithmeticResetInput,
  type DecimalArithmeticInput,
  type DecimalArithmeticOperation,
  type DecimalArithmeticState,
  type ExactRational,
} from "./DecimalArithmeticModel";

export const MAINLAND_DECIMAL_ARITHMETIC_LAB_IDS = [
  "bnu-primary-p4-lower-decimal-meaning-add-sub",
  "bnu-primary-p5-upper-decimal-division",
  "hjb-primary-p4-lower-decimals-meaning-add-sub",
  "hjb-primary-p5-upper-decimal-operations",
] as const;

export type MainlandDecimalArithmeticLabId =
  (typeof MAINLAND_DECIMAL_ARITHMETIC_LAB_IDS)[number];

const MAINLAND_DECIMAL_ARITHMETIC_LAB_ID_SET = new Set<string>(
  MAINLAND_DECIMAL_ARITHMETIC_LAB_IDS,
);

export function isMainlandDecimalArithmeticLabId(
  labId: string,
): labId is MainlandDecimalArithmeticLabId {
  return MAINLAND_DECIMAL_ARITHMETIC_LAB_ID_SET.has(labId);
}

const localized = (en: string, zh: string, zhHans: string): LocalizedText => ({
  en,
  zh,
  zhHans,
});

export const DECIMAL_ARITHMETIC_COPY = {
  title: localized("Decimal arithmetic", "小數運算", "小数运算"),
  eyebrow: localized("Exact place-value model", "精確位值模型", "精确位值模型"),
  learningGoal: localized("Learning goal", "學習目標", "学习目标"),
  operation: localized("Operation", "運算", "运算"),
  modes: {
    add: localized("Add", "加法", "加法"),
    subtract: localized("Subtract", "減法", "减法"),
    multiply: localized("Multiply", "乘法", "乘法"),
    divide: localized("Divide", "除法", "除法"),
    "estimate-check": localized("Estimate check", "估算檢查", "估算检查"),
  },
  operandA: localized("Operand A", "運算數 A", "运算数 A"),
  operandB: localized(
    "Operand B (non-zero)",
    "運算數 B（非零）",
    "运算数 B（非零）",
  ),
  decimalScale: localized("Decimal scale", "小數位尺度", "小数位尺度"),
  precision: localized("Rounding precision", "捨入精度", "舍入精度"),
  scaleOutput: localized(
    "A scale / B scale",
    "A 尺度 / B 尺度",
    "A 尺度 / B 尺度",
  ),
  panHint: localized(
    "Swipe horizontally or use the arrow keys to inspect every place-value column.",
    "左右滑動或使用方向鍵檢視每個位值欄。",
    "左右滑动或使用方向键查看每个位值栏。",
  ),
  surfaceLabel: localized(
    "Aligned decimal arithmetic columns and exact operation receipts",
    "對齊小數運算欄與精確運算收據",
    "对齐小数运算栏与精确运算收据",
  ),
  alignedColumns: localized(
    "Aligned place-value columns",
    "對齊位值欄",
    "对齐位值栏",
  ),
  scaledInteger: localized("Scaled integer", "縮放整數", "缩放整数"),
  decimalPoint: localized("Decimal point", "小數點", "小数点"),
  exactDecimal: localized("Exact decimal", "精確小數", "精确小数"),
  exactRational: localized("Exact rational", "精確分數", "精确分数"),
  carry: localized("Carry", "進位", "进位"),
  borrow: localized("Borrow", "退位", "退位"),
  effectiveOperation: localized("Effective operation", "實際列式", "实际列式"),
  topRow: localized("Top row", "上列", "上列"),
  bottomRow: localized("Bottom row", "下列", "下列"),
  leftSource: localized("operand A", "運算數 A", "运算数 A"),
  rightSource: localized("operand B", "運算數 B", "运算数 B"),
  operandsSwapped: localized("Rows swapped", "列式已換位", "列式已换位"),
  resultSign: localized("Result sign", "結果符號", "结果符号"),
  reconstructedAlignedResult: localized(
    "Reconstructed aligned result",
    "重構對齊結果",
    "重构对齐结果",
  ),
  yes: localized("yes", "是", "是"),
  no: localized("no", "否", "否"),
  partialProducts: localized("Partial products", "部分積", "部分积"),
  divisionWork: localized("Division transformation", "除法轉換", "除法转换"),
  quotient: localized("Quotient", "商", "商"),
  remainder: localized("Remainder", "餘數", "余数"),
  reconstruction: localized("Reconstruction", "逆向重構", "逆向重构"),
  roundedEstimate: localized("Rounded estimate", "捨入估算", "舍入估算"),
  signedError: localized("Signed error", "帶符號誤差", "带符号误差"),
  absoluteError: localized("Absolute error", "絕對誤差", "绝对误差"),
  invariantChecks: localized(
    "Exact invariant checks",
    "精確不變量檢查",
    "精确不变量检查",
  ),
  holds: localized("holds", "成立", "成立"),
  stateSummary: localized(
    "Current exact state",
    "目前精確狀態",
    "当前精确状态",
  ),
  reset: localized("Reset decimal model", "重設小數模型", "重置小数模型"),
  places: {
    thousands: localized("thousands", "千位", "千位"),
    hundreds: localized("hundreds", "百位", "百位"),
    tens: localized("tens", "十位", "十位"),
    ones: localized("ones", "個位", "个位"),
    tenths: localized("tenths", "十分位", "十分位"),
    hundredths: localized("hundredths", "百分位", "百分位"),
    thousandths: localized("thousandths", "千分位", "千分位"),
  },
} as const;

export type DecimalArithmeticLabProps = {
  lab: FeaturedLabDefinition;
  controlFooterAction?: ReactNode;
  /** SSR/source contract tests may inject exact endpoint states without a browser. */
  initialInput?: DecimalArithmeticInput;
};

type RangeControlProps = {
  controlId: "operand-a" | "operand-b" | "decimal-scale" | "precision";
  label: string;
  value: number;
  min: number;
  max: number;
  output: string;
  onChange: (value: number) => void;
};

const UI_MAX_UNSCALED = 9_999;
const UI_MAX_SCALE = 3;
const UI_MAX_PRECISION = 4;

function clampInteger(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function sanitizeInitialInput(
  input: DecimalArithmeticInput,
): DecimalArithmeticInput {
  const leftScale = clampInteger(input.left.scale, 0, UI_MAX_SCALE);
  const rightScale = clampInteger(input.right.scale, 0, UI_MAX_SCALE);
  return {
    ...input,
    left: {
      unscaled: clampInteger(input.left.unscaled, 0, UI_MAX_UNSCALED),
      scale: leftScale,
    },
    right: {
      unscaled: clampInteger(input.right.unscaled, 1, UI_MAX_UNSCALED),
      scale: rightScale,
    },
    precision: clampInteger(input.precision, 0, UI_MAX_PRECISION),
  };
}

function hasSignedLearnerOperand(input: DecimalArithmeticInput) {
  return input.left.unscaled < 0 || input.right.unscaled < 0;
}

function exactDecimalText(unscaled: number, scale: number) {
  if (!Number.isSafeInteger(unscaled) || !Number.isSafeInteger(scale)) {
    throw new TypeError("Exact decimal display requires safe integers.");
  }
  if (scale < 0)
    throw new RangeError("Exact decimal scale cannot be negative.");
  const sign = unscaled < 0 ? "-" : "";
  const digits = String(Math.abs(unscaled)).padStart(scale + 1, "0");
  if (scale === 0) return `${sign}${digits}`;
  const decimalPoint = digits.length - scale;
  return `${sign}${digits.slice(0, decimalPoint)}.${digits.slice(decimalPoint)}`;
}

function terminatingDecimalText(value: ExactRational) {
  let denominator = value.denominator;
  let twos = 0;
  let fives = 0;
  while (denominator % 2 === 0) {
    denominator /= 2;
    twos += 1;
  }
  while (denominator % 5 === 0) {
    denominator /= 5;
    fives += 1;
  }
  if (denominator !== 1) return null;
  const scale = Math.max(twos, fives);
  const decimalDenominator = 10 ** scale;
  const unscaled = value.numerator * (decimalDenominator / value.denominator);
  return Number.isSafeInteger(unscaled)
    ? exactDecimalText(unscaled, scale)
    : null;
}

function exactResultDisplay(state: DecimalArithmeticState) {
  const exactDecimal = state.columnCalculation
    ? exactDecimalText(
        state.columnCalculation.expectedAlignedResult,
        state.alignment.commonScale,
      )
    : state.multiplication
      ? exactDecimalText(
          state.multiplication.exactUnscaledProduct,
          state.multiplication.resultScale,
        )
      : terminatingDecimalText(state.result.exact);
  return {
    exactDecimal,
    primary: exactDecimal ?? state.result.text,
    rational: state.result.text,
  };
}

function rationalText(value: ExactRational) {
  return value.denominator === 1
    ? String(value.numerator)
    : `${value.numerator}/${value.denominator}`;
}

function operationSymbol(
  operation: Exclude<DecimalArithmeticOperation, "estimate-check">,
) {
  if (operation === "add") return "+";
  if (operation === "subtract") return "−";
  if (operation === "multiply") return "×";
  return "÷";
}

function configuredStateKey(state: DecimalArithmeticState) {
  return [
    DECIMAL_ARITHMETIC_MODEL_CONTRACT.version,
    `operation=${state.operation}`,
    `evaluated=${state.evaluatedOperation}`,
    `left=${state.left.unscaled}@${state.left.scale}`,
    `right=${state.right.unscaled}@${state.right.scale}`,
    `precision=${state.estimate.precision}`,
  ].join("|");
}

function placeCopy(label: string): LocalizedText {
  const key = label as keyof typeof DECIMAL_ARITHMETIC_COPY.places;
  return DECIMAL_ARITHMETIC_COPY.places[key] ?? localized(label, label, label);
}

function RangeControl({
  controlId,
  label,
  value,
  min,
  max,
  output,
  onChange,
}: RangeControlProps) {
  return (
    <label className="block min-w-0 text-sm font-bold text-slate-700 dark:text-slate-200">
      <span className="flex min-w-0 items-center justify-between gap-3">
        <span className="min-w-0 break-words">{label}</span>
        <output className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-900 dark:bg-white/10 dark:text-white">
          {output}
        </output>
      </span>
      <input
        data-viz-control="range"
        data-viz-parameter={controlId}
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

function DecimalArithmeticSurface({
  state,
}: {
  state: DecimalArithmeticState;
}) {
  const { t, theme } = useSettings();
  const colors = visualizationThemeForTheme(theme);
  const panHintId = useId();
  const columns = state.alignment.columns;
  const columnStep = Math.min(76, 510 / Math.max(columns.length - 1, 1));
  const columnStart = 160;
  const columnEnd = columnStart + Math.max(columns.length - 1, 0) * columnStep;
  const decimalPointX =
    columnStart + (state.alignment.decimalPointAfterColumn - 0.5) * columnStep;
  const operation = state.evaluatedOperation;
  const symbol = operationSymbol(operation);
  const exactDisplay = exactResultDisplay(state);

  return (
    <section className={colors.paddedSurfaceClassName}>
      <p
        id={panHintId}
        data-viz-pan-hint
        className="mb-2 text-xs font-bold text-slate-600 dark:text-slate-300 sm:hidden"
      >
        {t(DECIMAL_ARITHMETIC_COPY.panHint)}
      </p>
      <div
        data-viz-scroll-container
        aria-describedby={panHintId}
        aria-label={t(DECIMAL_ARITHMETIC_COPY.surfaceLabel)}
        tabIndex={0}
        className="focus-ring max-w-full touch-pan-x overflow-x-auto overscroll-x-contain rounded-2xl"
      >
        <svg
          data-viz-surface
          data-viz-svg-background="opaque"
          role="img"
          aria-label={t(DECIMAL_ARITHMETIC_COPY.surfaceLabel)}
          viewBox="0 0 760 560"
          preserveAspectRatio="xMidYMid meet"
          className="block h-auto min-h-[440px] w-full min-w-[760px]"
        >
          <rect
            data-viz-svg-background="opaque"
            width="760"
            height="560"
            fill={colors.svgBackground}
          />
          <rect
            x="18"
            y="18"
            width="724"
            height="524"
            rx="24"
            fill={colors.panelFill}
            stroke={colors.panelStroke}
            strokeWidth="2"
          />

          <text x="42" y="53" fill={colors.text} fontSize="20" fontWeight="800">
            {t(DECIMAL_ARITHMETIC_COPY.alignedColumns)}
          </text>
          <text
            x="718"
            y="53"
            textAnchor="end"
            fill={colors.textMuted}
            fontSize="14"
          >
            {`${state.left.unscaled}/10^${state.left.scale} ${symbol} ${state.right.unscaled}/10^${state.right.scale}`}
          </text>

          {columns.map((column, index) => {
            const x = columnStart + index * columnStep;
            return (
              <g
                key={column.exponent}
                data-viz-mark
                data-viz-name="aligned-column"
                data-viz-exponent={column.exponent}
              >
                <rect
                  x={x - columnStep / 2 + 3}
                  y="72"
                  width={columnStep - 6}
                  height="184"
                  rx="12"
                  fill={colors.softFill}
                  stroke={colors.gridStrong}
                />
                <text
                  x={x}
                  y="96"
                  textAnchor="middle"
                  fill={colors.textMuted}
                  fontSize="11"
                  fontWeight="700"
                >
                  {t(placeCopy(column.label))}
                </text>
                <text
                  x={x}
                  y="157"
                  textAnchor="middle"
                  fill={colors.text}
                  fontSize="34"
                  fontWeight="800"
                >
                  {column.leftDigit}
                </text>
                <text
                  x={x}
                  y="222"
                  textAnchor="middle"
                  fill={colors.text}
                  fontSize="34"
                  fontWeight="800"
                >
                  {column.rightDigit}
                </text>
              </g>
            );
          })}

          <text
            x="58"
            y="153"
            fill={colors.textMuted}
            fontSize="14"
            fontWeight="800"
          >
            A
          </text>
          <text
            x="58"
            y="218"
            fill={colors.textMuted}
            fontSize="14"
            fontWeight="800"
          >
            B
          </text>
          <text
            x="94"
            y="220"
            fill={colors.text}
            fontSize="31"
            fontWeight="900"
          >
            {symbol}
          </text>
          <line
            x1={columnStart - columnStep / 2}
            y1="242"
            x2={columnEnd + columnStep / 2}
            y2="242"
            stroke={colors.axisStrong}
            strokeWidth="3"
          />
          {[151, 216].map((y) => (
            <circle
              key={y}
              data-viz-mark
              data-viz-name="decimal-point"
              data-viz-value={t(DECIMAL_ARITHMETIC_COPY.decimalPoint)}
              cx={decimalPointX}
              cy={y}
              r="4.5"
              fill="#0891b2"
              stroke={colors.pointStroke}
              strokeWidth="1.5"
            />
          ))}

          <g data-viz-mark data-viz-name="scaled-integer-receipt">
            <rect
              x="42"
              y="276"
              width="676"
              height="62"
              rx="15"
              fill={colors.labelFill}
              stroke={colors.labelStroke}
              strokeWidth="2"
            />
            <text
              x="60"
              y="301"
              fill={colors.labelText}
              fontSize="13"
              fontWeight="800"
            >
              {t(DECIMAL_ARITHMETIC_COPY.scaledInteger)}
            </text>
            <text
              x="60"
              y="325"
              fill={colors.text}
              fontSize="17"
              fontWeight="800"
            >
              {`A = ${state.left.unscaled}/10^${state.left.scale} = ${state.left.text}   ·   B = ${state.right.unscaled}/10^${state.right.scale} = ${state.right.text}`}
            </text>
            <text
              data-viz-mark
              data-viz-name="exact-result"
              data-viz-exact-decimal={exactDisplay.exactDecimal ?? undefined}
              data-viz-exact-rational={exactDisplay.rational}
              x="700"
              y="307"
              textAnchor="end"
              fill={colors.labelText}
              fontSize="17"
              fontWeight="900"
            >
              {`${t(
                exactDisplay.exactDecimal
                  ? DECIMAL_ARITHMETIC_COPY.exactDecimal
                  : DECIMAL_ARITHMETIC_COPY.exactRational,
              )}: ${exactDisplay.primary}`}
            </text>
            {exactDisplay.exactDecimal ? (
              <text
                x="700"
                y="329"
                textAnchor="end"
                fill={colors.textMuted}
                fontSize="12"
                fontWeight="800"
              >
                {`${t(DECIMAL_ARITHMETIC_COPY.exactRational)}: ${exactDisplay.rational}`}
              </text>
            ) : null}
          </g>

          {(operation === "add" || operation === "subtract") &&
            state.columnCalculation && (
              <g data-viz-operation-receipts={operation}>
                <text
                  x="42"
                  y="375"
                  fill={colors.text}
                  fontSize="17"
                  fontWeight="900"
                >
                  {t(
                    operation === "add"
                      ? DECIMAL_ARITHMETIC_COPY.carry
                      : DECIMAL_ARITHMETIC_COPY.borrow,
                  )}
                </text>
                {state.regrouping.map((receipt, index) => {
                  const x = 96 + index * 76;
                  return (
                    <g
                      key={`${receipt.columnExponent}-${index}`}
                      data-viz-mark
                      data-viz-name={`${receipt.kind}-receipt`}
                      data-viz-value={`${receipt.incoming}:${receipt.resultDigit}:${receipt.outgoing}`}
                    >
                      <rect
                        x={x}
                        y="353"
                        width="66"
                        height="64"
                        rx="12"
                        fill={colors.badgeFill}
                        stroke={colors.labelStroke}
                      />
                      <text
                        x={x + 33}
                        y="374"
                        textAnchor="middle"
                        fill={colors.badgeText}
                        fontSize="11"
                        fontWeight="800"
                      >
                        {`10^${receipt.columnExponent}`}
                      </text>
                      <text
                        x={x + 33}
                        y="400"
                        textAnchor="middle"
                        fill={colors.text}
                        fontSize="15"
                        fontWeight="900"
                      >
                        {`${receipt.incoming}→${receipt.resultDigit}→${receipt.outgoing}`}
                      </text>
                    </g>
                  );
                })}

                <g
                  data-viz-mark
                  data-viz-name="column-calculation-receipt"
                  data-viz-effective-operation={
                    state.columnCalculation.effectiveOperation
                  }
                  data-viz-top-source={state.columnCalculation.topSource}
                  data-viz-bottom-source={state.columnCalculation.bottomSource}
                  data-viz-operands-swapped={String(
                    state.columnCalculation.operandsSwapped,
                  )}
                  data-viz-result-sign={state.columnCalculation.resultSign}
                  data-viz-reconstructed-aligned-result={
                    state.columnCalculation.reconstructedAlignedResult
                  }
                >
                  <rect
                    x="42"
                    y="431"
                    width="676"
                    height="94"
                    rx="14"
                    fill={colors.labelFill}
                    stroke={colors.labelStroke}
                    strokeWidth="2"
                  />
                  <text
                    x="60"
                    y="455"
                    fill={colors.labelText}
                    fontSize="12"
                    fontWeight="900"
                  >
                    {`${t(DECIMAL_ARITHMETIC_COPY.effectiveOperation)}: ${t(
                      DECIMAL_ARITHMETIC_COPY.modes[
                        state.columnCalculation.effectiveOperation
                      ],
                    )}`}
                  </text>
                  <text
                    x="60"
                    y="478"
                    fill={colors.text}
                    fontSize="13"
                    fontWeight="800"
                  >
                    {`${t(DECIMAL_ARITHMETIC_COPY.topRow)}: ${t(
                      state.columnCalculation.topSource === "left"
                        ? DECIMAL_ARITHMETIC_COPY.leftSource
                        : DECIMAL_ARITHMETIC_COPY.rightSource,
                    )} = ${state.columnCalculation.topMagnitude}; ${t(
                      DECIMAL_ARITHMETIC_COPY.bottomRow,
                    )}: ${t(
                      state.columnCalculation.bottomSource === "left"
                        ? DECIMAL_ARITHMETIC_COPY.leftSource
                        : DECIMAL_ARITHMETIC_COPY.rightSource,
                    )} = ${state.columnCalculation.bottomMagnitude}`}
                  </text>
                  <text
                    x="60"
                    y="503"
                    fill={colors.text}
                    fontSize="13"
                    fontWeight="800"
                  >
                    {`${t(DECIMAL_ARITHMETIC_COPY.operandsSwapped)}: ${t(
                      state.columnCalculation.operandsSwapped
                        ? DECIMAL_ARITHMETIC_COPY.yes
                        : DECIMAL_ARITHMETIC_COPY.no,
                    )}; ${t(DECIMAL_ARITHMETIC_COPY.resultSign)}: ${state.columnCalculation.resultSign}; ${t(
                      DECIMAL_ARITHMETIC_COPY.reconstructedAlignedResult,
                    )}: ${state.columnCalculation.reconstructedAlignedResult}/10^${state.alignment.commonScale} = ${exactDisplay.primary}`}
                  </text>
                </g>
              </g>
            )}

          {operation === "multiply" && state.multiplication && (
            <g data-viz-operation-receipts="multiply">
              <text
                x="42"
                y="375"
                fill={colors.text}
                fontSize="17"
                fontWeight="900"
              >
                {t(DECIMAL_ARITHMETIC_COPY.partialProducts)}
              </text>
              {state.multiplication.partialProducts.map((part, index) => (
                <g
                  key={part.digitPlace}
                  data-viz-mark
                  data-viz-name="partial-product"
                  data-viz-value={part.partialProduct}
                >
                  <rect
                    x="42"
                    y={389 + index * 34}
                    width="676"
                    height="29"
                    rx="9"
                    fill={index % 2 === 0 ? colors.softFill : colors.emptyFill}
                  />
                  <text
                    x="60"
                    y={410 + index * 34}
                    fill={colors.text}
                    fontSize="14"
                    fontWeight="800"
                  >
                    {`${state.left.unscaled} × ${part.digit} × 10^${part.digitPlace} = ${part.partialProduct}`}
                  </text>
                </g>
              ))}
              <text
                x="700"
                y="525"
                textAnchor="end"
                fill={colors.labelText}
                fontSize="15"
                fontWeight="900"
              >
                {`Σ = ${state.multiplication.exactUnscaledProduct}; scale = ${state.multiplication.resultScale}`}
              </text>
            </g>
          )}

          {operation === "divide" && state.division && (
            <g data-viz-operation-receipts="divide">
              <text
                x="42"
                y="375"
                fill={colors.text}
                fontSize="17"
                fontWeight="900"
              >
                {t(DECIMAL_ARITHMETIC_COPY.divisionWork)}
              </text>
              <g
                data-viz-mark
                data-viz-name="division-quotient"
                data-viz-value={state.division.quotient}
              >
                <rect
                  x="42"
                  y="392"
                  width="210"
                  height="72"
                  rx="14"
                  fill={colors.softFill}
                  stroke={colors.gridStrong}
                />
                <text
                  x="60"
                  y="418"
                  fill={colors.textMuted}
                  fontSize="12"
                  fontWeight="800"
                >
                  {t(DECIMAL_ARITHMETIC_COPY.quotient)}
                </text>
                <text
                  x="60"
                  y="449"
                  fill={colors.text}
                  fontSize="25"
                  fontWeight="900"
                >
                  {state.division.quotient}
                </text>
              </g>
              <g
                data-viz-mark
                data-viz-name="division-remainder"
                data-viz-value={state.division.remainder}
              >
                <rect
                  x="266"
                  y="392"
                  width="210"
                  height="72"
                  rx="14"
                  fill={colors.softFill}
                  stroke={colors.gridStrong}
                />
                <text
                  x="284"
                  y="418"
                  fill={colors.textMuted}
                  fontSize="12"
                  fontWeight="800"
                >
                  {t(DECIMAL_ARITHMETIC_COPY.remainder)}
                </text>
                <text
                  x="284"
                  y="449"
                  fill={colors.text}
                  fontSize="25"
                  fontWeight="900"
                >
                  {state.division.remainder}
                </text>
              </g>
              <g
                data-viz-mark
                data-viz-name="division-reconstruction"
                data-viz-value={`${state.division.divisor}*${state.division.quotient}+${state.division.remainder}=${state.division.dividend}`}
              >
                <rect
                  x="490"
                  y="392"
                  width="228"
                  height="108"
                  rx="14"
                  fill={colors.labelFill}
                  stroke={colors.labelStroke}
                />
                <text
                  x="508"
                  y="418"
                  fill={colors.labelText}
                  fontSize="12"
                  fontWeight="800"
                >
                  {t(DECIMAL_ARITHMETIC_COPY.reconstruction)}
                </text>
                <text
                  x="508"
                  y="448"
                  fill={colors.text}
                  fontSize="15"
                  fontWeight="900"
                >
                  {`${state.division.divisor} × ${state.division.quotient}`}
                </text>
                <text
                  x="508"
                  y="473"
                  fill={colors.text}
                  fontSize="15"
                  fontWeight="900"
                >
                  {`+ ${state.division.remainder} = ${state.division.dividend}`}
                </text>
              </g>
            </g>
          )}

          {state.operation === "estimate-check" && (
            <g data-viz-operation-receipts="estimate-check">
              <text
                x="42"
                y="375"
                fill={colors.text}
                fontSize="17"
                fontWeight="900"
              >
                {t(DECIMAL_ARITHMETIC_COPY.roundedEstimate)}
              </text>
              <g
                data-viz-mark
                data-viz-name="rounded-estimate"
                data-viz-value={state.estimate.rounded.text}
              >
                <rect
                  x="42"
                  y="392"
                  width="210"
                  height="82"
                  rx="14"
                  fill={colors.softFill}
                  stroke={colors.gridStrong}
                />
                <text
                  x="60"
                  y="418"
                  fill={colors.textMuted}
                  fontSize="12"
                  fontWeight="800"
                >
                  {t(DECIMAL_ARITHMETIC_COPY.roundedEstimate)}
                </text>
                <text
                  x="60"
                  y="455"
                  fill={colors.text}
                  fontSize="25"
                  fontWeight="900"
                >
                  {state.estimate.rounded.text}
                </text>
              </g>
              <g
                data-viz-mark
                data-viz-name="estimate-error"
                data-viz-value={rationalText(state.estimate.signedError)}
              >
                <rect
                  x="266"
                  y="392"
                  width="210"
                  height="82"
                  rx="14"
                  fill={colors.softFill}
                  stroke={colors.gridStrong}
                />
                <text
                  x="284"
                  y="418"
                  fill={colors.textMuted}
                  fontSize="12"
                  fontWeight="800"
                >
                  {t(DECIMAL_ARITHMETIC_COPY.signedError)}
                </text>
                <text
                  x="284"
                  y="455"
                  fill={colors.text}
                  fontSize="25"
                  fontWeight="900"
                >
                  {rationalText(state.estimate.signedError)}
                </text>
              </g>
              <g
                data-viz-mark
                data-viz-name="absolute-estimate-error"
                data-viz-value={rationalText(state.estimate.absoluteError)}
              >
                <rect
                  x="490"
                  y="392"
                  width="228"
                  height="82"
                  rx="14"
                  fill={colors.labelFill}
                  stroke={colors.labelStroke}
                />
                <text
                  x="508"
                  y="418"
                  fill={colors.labelText}
                  fontSize="12"
                  fontWeight="800"
                >
                  {t(DECIMAL_ARITHMETIC_COPY.absoluteError)}
                </text>
                <text
                  x="508"
                  y="455"
                  fill={colors.text}
                  fontSize="25"
                  fontWeight="900"
                >
                  {rationalText(state.estimate.absoluteError)}
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>
    </section>
  );
}

function DecimalArithmeticLearner({
  lab,
  controlFooterAction,
  initialInput = decimalArithmeticResetInput,
}: DecimalArithmeticLabProps) {
  const { language, t, theme } = useSettings();
  const [input, setInput] = useState<DecimalArithmeticInput>(() =>
    sanitizeInitialInput(initialInput),
  );
  const state = useMemo(() => buildDecimalArithmeticState(input), [input]);
  const stateKey = configuredStateKey(state);
  const exactDisplay = exactResultDisplay(state);
  const modeOptions = decimalArithmeticOperations.map((operation) => ({
    value: operation,
    label: t(DECIMAL_ARITHMETIC_COPY.modes[operation]),
  }));

  function setOperation(operation: DecimalArithmeticOperation) {
    setInput((current) => {
      const priorExactOperation =
        current.operation === "estimate-check"
          ? (current.estimateOperation ?? "add")
          : current.operation;
      return {
        ...current,
        operation,
        estimateOperation:
          operation === "estimate-check" ? priorExactOperation : undefined,
      };
    });
  }

  function setDecimalScale(scale: number) {
    const nextScale = clampInteger(scale, 0, UI_MAX_SCALE);
    setInput((current) => ({
      ...current,
      left: { ...current.left, scale: nextScale },
      right: { ...current.right, scale: Math.min(UI_MAX_SCALE, nextScale + 1) },
    }));
  }

  function reset() {
    setInput(sanitizeInitialInput(decimalArithmeticResetInput));
  }

  return (
    <div
      data-mainland-decimal-arithmetic={lab.labId}
      data-viz-family={DECIMAL_ARITHMETIC_MODEL_CONTRACT.family}
      data-viz-configured-model={DECIMAL_ARITHMETIC_MODEL_CONTRACT.version}
      data-viz-configured-state={stateKey}
      data-viz-module={lab.moduleId}
      data-viz-module-id={lab.moduleId}
      data-viz-topic={lab.topicId}
      data-viz-topic-id={lab.topicId}
      data-viz-language={language}
      data-viz-theme={theme}
      data-viz-mode={state.operation}
      className="min-w-0 space-y-4"
    >
      <header className="rounded-3xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-400/20 dark:bg-cyan-950/40 sm:p-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
          {t(DECIMAL_ARITHMETIC_COPY.eyebrow)}
        </p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl">
            {t(lab.title)}
          </h2>
          <p className="text-sm font-bold text-cyan-800 dark:text-cyan-200">
            {t(DECIMAL_ARITHMETIC_COPY.title)}
          </p>
        </div>
      </header>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0">
          <DecimalArithmeticSurface state={state} />
        </div>

        <aside className="min-w-0 space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950 sm:p-5">
          <section className="space-y-2">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
              {t(DECIMAL_ARITHMETIC_COPY.learningGoal)}
            </p>
            <p className="text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
              {t(lab.description)}
            </p>
          </section>

          <div
            role="group"
            aria-label={t(DECIMAL_ARITHMETIC_COPY.operation)}
            data-viz-control="mode-group"
            data-viz-parameter="operation"
            data-viz-mode-group="decimal-operation"
            className="grid grid-cols-2 gap-2"
          >
            {modeOptions.map((option, index) => {
              const active = option.value === state.operation;
              return (
                <button
                  key={option.value}
                  type="button"
                  data-viz-mode-button
                  data-viz-mode-group="decimal-operation"
                  data-viz-mode-index={index}
                  data-viz-mode={option.value}
                  data-viz-mode-active={String(active)}
                  aria-pressed={active}
                  onClick={() => setOperation(option.value)}
                  className={`focus-ring min-h-11 rounded-xl border px-3 py-2 text-sm font-black transition-colors motion-reduce:transition-none ${
                    active
                      ? "border-cyan-400 bg-cyan-100 text-cyan-950 dark:bg-cyan-400/20 dark:text-cyan-100"
                      : "border-slate-200 bg-white text-slate-700 hover:border-cyan-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            <RangeControl
              controlId="operand-a"
              label={t(DECIMAL_ARITHMETIC_COPY.operandA)}
              value={state.left.unscaled}
              min={0}
              max={UI_MAX_UNSCALED}
              output={state.left.text}
              onChange={(unscaled) =>
                setInput((current) => ({
                  ...current,
                  left: { ...current.left, unscaled },
                }))
              }
            />
            <RangeControl
              controlId="operand-b"
              label={t(DECIMAL_ARITHMETIC_COPY.operandB)}
              value={state.right.unscaled}
              min={1}
              max={UI_MAX_UNSCALED}
              output={state.right.text}
              onChange={(unscaled) =>
                setInput((current) => ({
                  ...current,
                  right: {
                    ...current.right,
                    unscaled: clampInteger(unscaled, 1, UI_MAX_UNSCALED),
                  },
                }))
              }
            />
            <RangeControl
              controlId="decimal-scale"
              label={t(DECIMAL_ARITHMETIC_COPY.decimalScale)}
              value={state.left.scale}
              min={0}
              max={UI_MAX_SCALE}
              output={`A 10^−${state.left.scale} · B 10^−${state.right.scale}`}
              onChange={setDecimalScale}
            />
            <RangeControl
              controlId="precision"
              label={t(DECIMAL_ARITHMETIC_COPY.precision)}
              value={state.estimate.precision}
              min={0}
              max={UI_MAX_PRECISION}
              output={String(state.estimate.precision)}
              onChange={(precision) =>
                setInput((current) => ({ ...current, precision }))
              }
            />
          </div>

          <section>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
              {t(DECIMAL_ARITHMETIC_COPY.invariantChecks)}
            </p>
            <ul className="space-y-2">
              {state.invariants.map((receipt) => (
                <li
                  key={receipt.id}
                  data-viz-invariant={receipt.id}
                  data-viz-invariant-holds={String(receipt.holds)}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-950 dark:border-emerald-400/20 dark:bg-emerald-950/35 dark:text-emerald-100"
                >
                  <span className="break-words">{receipt.id}</span>
                  <span className="ml-2">
                    ✓ {t(DECIMAL_ARITHMETIC_COPY.holds)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <output
            data-viz-state={stateKey}
            data-viz-state-summary
            aria-live="polite"
            aria-atomic="true"
            className="block rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-3 text-sm font-bold leading-6 text-cyan-950 dark:border-cyan-400/20 dark:bg-cyan-950/35 dark:text-cyan-100"
          >
            <span className="block text-xs font-black uppercase tracking-[0.12em]">
              {t(DECIMAL_ARITHMETIC_COPY.stateSummary)}
            </span>
            <span className="mt-1 block font-mono">
              {`${state.left.text} ${operationSymbol(state.evaluatedOperation)} ${state.right.text} = ${exactDisplay.primary}`}
            </span>
            <span className="block font-mono text-xs">
              {`${t(DECIMAL_ARITHMETIC_COPY.exactRational)}: ${exactDisplay.rational}`}
            </span>
            {state.operation === "estimate-check" ? (
              <span className="block font-mono">
                {`${t(DECIMAL_ARITHMETIC_COPY.roundedEstimate)} ${state.estimate.rounded.text}; ${t(DECIMAL_ARITHMETIC_COPY.absoluteError)} ${rationalText(state.estimate.absoluteError)}`}
              </span>
            ) : null}
          </output>

          <button
            type="button"
            data-viz-reset
            data-viz-reset-model
            data-viz-reset-module-id={lab.moduleId}
            data-viz-reset-topic-id={lab.topicId}
            onClick={reset}
            className="focus-ring min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-black text-slate-800 transition-colors hover:border-cyan-400 hover:bg-cyan-50 motion-reduce:transition-none dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:border-cyan-300 dark:hover:bg-cyan-400/10"
          >
            {t(DECIMAL_ARITHMETIC_COPY.reset)}
          </button>

          {controlFooterAction ? (
            <div data-viz-lesson-action-slot>{controlFooterAction}</div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

export function DecimalArithmeticLab(props: DecimalArithmeticLabProps) {
  if (!isMainlandDecimalArithmeticLabId(props.lab.labId)) return null;
  // These four primary G02 learner controls currently expose non-negative
  // decimal operands. Keep signed initial injection fail-closed until A18
  // explicitly expands that curriculum-facing domain; the exact model itself
  // supports and independently verifies signed arithmetic.
  if (props.initialInput && hasSignedLearnerOperand(props.initialInput))
    return null;
  return <DecimalArithmeticLearner {...props} />;
}
