"use client";

import { useEffect, useMemo, useReducer, useRef, useState, type Dispatch, type KeyboardEvent } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { useStudentAccommodations } from "@/components/accommodations/useStudentAccommodations";
import {
  calculatorReducer,
  defaultCalculatorMode,
  formatCalculatorNumber,
  initialCalculatorState,
  type CalculatorAction,
  type CalculatorAngleMode,
  type CalculatorMode
} from "@/lib/calculatorEngine";
import { decimalToFraction, evaluateExpressionTokens, type Fraction } from "@/lib/expressionCalculator";
import { computeRegression, computeStatistics, type DataPoint } from "@/lib/statistics";
import { cn } from "@/lib/utils";

function CalculatorIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <rect x="4" y="3" width="16" height="18" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M8 7h8" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
    </svg>
  );
}

type KeyKind = "number" | "operator" | "function" | "equals";
type LocalizedLabel = { en: string; zh: string; zhHans?: string };

function keyClassName(kind: KeyKind) {
  switch (kind) {
    case "operator":
      return "bg-cyan-500 text-white hover:bg-cyan-400";
    case "equals":
      return "bg-violet-600 text-white hover:bg-violet-500";
    case "function":
      return "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/20";
    case "number":
    default:
      return "bg-white text-slate-900 hover:bg-slate-100 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.14]";
  }
}

// ---------------------------------------------------------------------------
// Basic mode — immediate-execution (standard pocket calculator).
// ---------------------------------------------------------------------------

type BasicKey = { label: string; ariaLabel: LocalizedLabel; action: CalculatorAction; kind: KeyKind };

const basicKeys: BasicKey[] = [
  { label: "AC", ariaLabel: { en: "Clear", zh: "清除", zhHans: "清除" }, action: { type: "clear" }, kind: "function" },
  { label: "±", ariaLabel: { en: "Plus minus", zh: "正負號", zhHans: "正负号" }, action: { type: "negate" }, kind: "function" },
  { label: "%", ariaLabel: { en: "Percent", zh: "百分比", zhHans: "百分比" }, action: { type: "percent" }, kind: "function" },
  { label: "÷", ariaLabel: { en: "Divide", zh: "除", zhHans: "除" }, action: { type: "operator", value: "÷" }, kind: "operator" },
  { label: "7", ariaLabel: { en: "Seven", zh: "七", zhHans: "七" }, action: { type: "digit", value: "7" }, kind: "number" },
  { label: "8", ariaLabel: { en: "Eight", zh: "八", zhHans: "八" }, action: { type: "digit", value: "8" }, kind: "number" },
  { label: "9", ariaLabel: { en: "Nine", zh: "九", zhHans: "九" }, action: { type: "digit", value: "9" }, kind: "number" },
  { label: "×", ariaLabel: { en: "Multiply", zh: "乘", zhHans: "乘" }, action: { type: "operator", value: "×" }, kind: "operator" },
  { label: "4", ariaLabel: { en: "Four", zh: "四", zhHans: "四" }, action: { type: "digit", value: "4" }, kind: "number" },
  { label: "5", ariaLabel: { en: "Five", zh: "五", zhHans: "五" }, action: { type: "digit", value: "5" }, kind: "number" },
  { label: "6", ariaLabel: { en: "Six", zh: "六", zhHans: "六" }, action: { type: "digit", value: "6" }, kind: "number" },
  { label: "−", ariaLabel: { en: "Subtract", zh: "減", zhHans: "减" }, action: { type: "operator", value: "-" }, kind: "operator" },
  { label: "1", ariaLabel: { en: "One", zh: "一", zhHans: "一" }, action: { type: "digit", value: "1" }, kind: "number" },
  { label: "2", ariaLabel: { en: "Two", zh: "二", zhHans: "二" }, action: { type: "digit", value: "2" }, kind: "number" },
  { label: "3", ariaLabel: { en: "Three", zh: "三", zhHans: "三" }, action: { type: "digit", value: "3" }, kind: "number" },
  { label: "+", ariaLabel: { en: "Add", zh: "加", zhHans: "加" }, action: { type: "operator", value: "+" }, kind: "operator" },
  { label: "√", ariaLabel: { en: "Square root", zh: "平方根", zhHans: "平方根" }, action: { type: "unary", fn: "sqrt" }, kind: "function" },
  { label: "0", ariaLabel: { en: "Zero", zh: "零", zhHans: "零" }, action: { type: "digit", value: "0" }, kind: "number" },
  { label: ".", ariaLabel: { en: "Decimal point", zh: "小數點", zhHans: "小数点" }, action: { type: "decimal" }, kind: "number" },
  { label: "=", ariaLabel: { en: "Equals", zh: "等於", zhHans: "等于" }, action: { type: "equals" }, kind: "equals" }
];

function BasicCalculatorBody() {
  const { t } = useSettings();
  const [state, dispatch] = useReducer(calculatorReducer, initialCalculatorState);

  return (
    <>
      <div
        data-testid="calculator-display"
        aria-live="polite"
        aria-atomic="true"
        className="mb-3 overflow-x-auto rounded-2xl bg-slate-950 px-4 py-3 text-right text-3xl font-black tabular-nums text-white"
      >
        {state.display}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {basicKeys.map((key) => (
          <button
            key={key.label}
            type="button"
            onClick={() => dispatch(key.action)}
            aria-label={t(key.ariaLabel)}
            className={cn(
              "focus-ring flex h-11 items-center justify-center rounded-xl text-lg font-black shadow-sm transition active:translate-y-px",
              keyClassName(key.kind)
            )}
          >
            {key.label}
          </button>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Scientific mode — Casio/TI-style full expression entry (parentheses,
// precedence, functions, implicit multiplication). Buttons append to an
// expression string that is evaluated on "=".
// ---------------------------------------------------------------------------

type ExpressionKey =
  | { label: string; ariaLabel: LocalizedLabel; kind: KeyKind; token: string; isValue: boolean }
  | {
      label: string;
      ariaLabel: LocalizedLabel;
      kind: KeyKind;
      control:
        | "clear"
        | "backspace"
        | "equals"
        | "memoryClear"
        | "memoryRecall"
        | "memoryAdd"
        | "memorySubtract"
        | "toggleFraction";
    };

const expressionFunctionKeys: ExpressionKey[] = [
  { label: "sin", ariaLabel: { en: "Sine", zh: "正弦", zhHans: "正弦" }, token: "sin(", isValue: true, kind: "function" },
  { label: "cos", ariaLabel: { en: "Cosine", zh: "餘弦", zhHans: "余弦" }, token: "cos(", isValue: true, kind: "function" },
  { label: "tan", ariaLabel: { en: "Tangent", zh: "正切", zhHans: "正切" }, token: "tan(", isValue: true, kind: "function" },
  { label: "sin⁻¹", ariaLabel: { en: "Inverse sine", zh: "反正弦", zhHans: "反正弦" }, token: "sin⁻¹(", isValue: true, kind: "function" },
  { label: "cos⁻¹", ariaLabel: { en: "Inverse cosine", zh: "反餘弦", zhHans: "反余弦" }, token: "cos⁻¹(", isValue: true, kind: "function" },
  { label: "tan⁻¹", ariaLabel: { en: "Inverse tangent", zh: "反正切", zhHans: "反正切" }, token: "tan⁻¹(", isValue: true, kind: "function" },
  { label: "ln", ariaLabel: { en: "Natural log", zh: "自然對數", zhHans: "自然对数" }, token: "ln(", isValue: true, kind: "function" },
  { label: "log", ariaLabel: { en: "Log base 10", zh: "常用對數", zhHans: "常用对数" }, token: "log(", isValue: true, kind: "function" },
  { label: "eˣ", ariaLabel: { en: "e to the power x", zh: "e 的次方", zhHans: "e 的次方" }, token: "e^(", isValue: true, kind: "function" },
  { label: "√", ariaLabel: { en: "Square root", zh: "平方根", zhHans: "平方根" }, token: "√(", isValue: true, kind: "function" },
  { label: "x²", ariaLabel: { en: "Square", zh: "平方", zhHans: "平方" }, token: "²", isValue: false, kind: "function" },
  { label: "xʸ", ariaLabel: { en: "Power", zh: "次方", zhHans: "次方" }, token: "^", isValue: false, kind: "operator" },
  { label: "n!", ariaLabel: { en: "Factorial", zh: "階乘", zhHans: "阶乘" }, token: "!", isValue: false, kind: "function" },
  { label: "nPr", ariaLabel: { en: "Permutations", zh: "排列", zhHans: "排列" }, token: "nPr", isValue: false, kind: "operator" },
  { label: "nCr", ariaLabel: { en: "Combinations", zh: "組合", zhHans: "组合" }, token: "nCr", isValue: false, kind: "operator" },
  { label: "a/b", ariaLabel: { en: "Fraction", zh: "分數", zhHans: "分数" }, token: "⁄", isValue: false, kind: "function" },
  { label: "a b/c", ariaLabel: { en: "Mixed number", zh: "帶分數", zhHans: "带分数" }, token: "⁀", isValue: false, kind: "function" },
  { label: "%", ariaLabel: { en: "Percent", zh: "百分比", zhHans: "百分比" }, token: "%", isValue: false, kind: "function" },
  { label: "π", ariaLabel: { en: "Pi", zh: "圓周率", zhHans: "圆周率" }, token: "π", isValue: true, kind: "function" },
  { label: "e", ariaLabel: { en: "Euler's number", zh: "自然常數 e", zhHans: "自然常数 e" }, token: "e", isValue: true, kind: "function" },
  { label: "MC", ariaLabel: { en: "Memory clear", zh: "清除記憶", zhHans: "清除记忆" }, control: "memoryClear", kind: "function" },
  { label: "MR", ariaLabel: { en: "Memory recall", zh: "讀取記憶", zhHans: "读取记忆" }, control: "memoryRecall", kind: "function" },
  { label: "M−", ariaLabel: { en: "Memory subtract", zh: "記憶減", zhHans: "记忆减" }, control: "memorySubtract", kind: "function" },
  { label: "M+", ariaLabel: { en: "Memory add", zh: "記憶加", zhHans: "记忆加" }, control: "memoryAdd", kind: "function" },
  { label: "S⇔D", ariaLabel: { en: "Toggle fraction or decimal", zh: "切換分數或小數", zhHans: "切换分数或小数" }, control: "toggleFraction", kind: "operator" }
];

const expressionKeypadKeys: ExpressionKey[] = [
  { label: "AC", ariaLabel: { en: "Clear", zh: "清除", zhHans: "清除" }, control: "clear", kind: "function" },
  { label: "⌫", ariaLabel: { en: "Backspace", zh: "刪除", zhHans: "删除" }, control: "backspace", kind: "function" },
  { label: "(", ariaLabel: { en: "Open parenthesis", zh: "左括號", zhHans: "左括号" }, token: "(", isValue: true, kind: "function" },
  { label: ")", ariaLabel: { en: "Close parenthesis", zh: "右括號", zhHans: "右括号" }, token: ")", isValue: false, kind: "function" },
  { label: "7", ariaLabel: { en: "Seven", zh: "七", zhHans: "七" }, token: "7", isValue: true, kind: "number" },
  { label: "8", ariaLabel: { en: "Eight", zh: "八", zhHans: "八" }, token: "8", isValue: true, kind: "number" },
  { label: "9", ariaLabel: { en: "Nine", zh: "九", zhHans: "九" }, token: "9", isValue: true, kind: "number" },
  { label: "÷", ariaLabel: { en: "Divide", zh: "除", zhHans: "除" }, token: "÷", isValue: false, kind: "operator" },
  { label: "4", ariaLabel: { en: "Four", zh: "四", zhHans: "四" }, token: "4", isValue: true, kind: "number" },
  { label: "5", ariaLabel: { en: "Five", zh: "五", zhHans: "五" }, token: "5", isValue: true, kind: "number" },
  { label: "6", ariaLabel: { en: "Six", zh: "六", zhHans: "六" }, token: "6", isValue: true, kind: "number" },
  { label: "×", ariaLabel: { en: "Multiply", zh: "乘", zhHans: "乘" }, token: "×", isValue: false, kind: "operator" },
  { label: "1", ariaLabel: { en: "One", zh: "一", zhHans: "一" }, token: "1", isValue: true, kind: "number" },
  { label: "2", ariaLabel: { en: "Two", zh: "二", zhHans: "二" }, token: "2", isValue: true, kind: "number" },
  { label: "3", ariaLabel: { en: "Three", zh: "三", zhHans: "三" }, token: "3", isValue: true, kind: "number" },
  { label: "−", ariaLabel: { en: "Subtract", zh: "減", zhHans: "减" }, token: "−", isValue: false, kind: "operator" },
  { label: "0", ariaLabel: { en: "Zero", zh: "零", zhHans: "零" }, token: "0", isValue: true, kind: "number" },
  { label: ".", ariaLabel: { en: "Decimal point", zh: "小數點", zhHans: "小数点" }, token: ".", isValue: true, kind: "number" },
  { label: "+", ariaLabel: { en: "Add", zh: "加", zhHans: "加" }, token: "+", isValue: false, kind: "operator" },
  { label: "=", ariaLabel: { en: "Equals", zh: "等於", zhHans: "等于" }, control: "equals", kind: "equals" }
];

type ExpressionCalculatorState = {
  tokens: string[];
  // Calculation tokens retain the full numeric result while display tokens are
  // rounded for the screen. This preserves calculator guard digits in chains.
  evaluationTokens: string[];
  justEvaluated: boolean;
  errored: boolean;
  memory: number;
  // Exact-fraction form of the last result (null when it is an integer or
  // irrational); displayForm is the S⇔D preference the toggle cycles through.
  fraction: Fraction | null;
  displayForm: "fraction" | "mixed" | "decimal";
};

type ExpressionCalculatorAction =
  | { type: "push"; token: string; isValue: boolean }
  | { type: "clear" }
  | { type: "backspace" }
  | { type: "evaluate"; angleMode: CalculatorAngleMode }
  | { type: "memoryClear" }
  | { type: "memoryRecall" }
  | { type: "memoryStore"; sign: 1 | -1; angleMode: CalculatorAngleMode }
  | { type: "toggleFraction" };

const initialExpressionState: ExpressionCalculatorState = {
  tokens: [],
  evaluationTokens: [],
  justEvaluated: false,
  errored: false,
  memory: 0,
  fraction: null,
  displayForm: "decimal"
};

// Append a value/operator token with the "after =" rules (a value starts fresh,
// an operator continues from the result — Casio-style "Ans"). Editing clears any
// shown fraction form.
function pushToken(
  state: ExpressionCalculatorState,
  token: string,
  isValue: boolean,
  evaluationToken = token
): ExpressionCalculatorState {
  const displayBase = state.errored ? [] : state.tokens;
  const evaluationBase = state.errored ? [] : state.evaluationTokens;
  const startsFresh = state.justEvaluated && isValue;
  return {
    ...state,
    tokens: startsFresh ? [token] : [...displayBase, token],
    evaluationTokens: startsFresh ? [evaluationToken] : [...evaluationBase, evaluationToken],
    justEvaluated: false,
    errored: false,
    fraction: null,
    displayForm: "decimal"
  };
}

const expressionEntryBoundaries = new Set(["+", "−", "×", "÷", "^", "nCr", "nPr", "⁄", "⁀"]);

// Locate the start of the current operand without splitting a balanced group.
// For `2+(3)` or `2+sin(30)`, MR replaces the whole final operand and leaves
// `2+` intact. For an unfinished `2+sin(3`, it replaces only the active numeric
// entry and keeps the open function so the learner can continue editing it.
function currentExpressionEntryStart(tokens: string[]): number {
  let parenthesisDepth = 0;
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token === ")") {
      parenthesisDepth += 1;
      continue;
    }
    if (token === "(" || token.endsWith("(")) {
      if (parenthesisDepth > 0) {
        parenthesisDepth -= 1;
        continue;
      }
      return index + 1;
    }
    if (parenthesisDepth === 0 && expressionEntryBoundaries.has(token)) return index + 1;
  }
  return 0;
}

// Shared shape for a shown result (from "=" or M+/M−): the decimal string plus its
// exact fraction, defaulting to fraction display when the result is a proper fraction.
function resolvedState(
  state: ExpressionCalculatorState,
  value: number,
  extra: Partial<ExpressionCalculatorState> = {}
): ExpressionCalculatorState {
  const fraction = decimalToFraction(value);
  return {
    ...state,
    tokens: [formatCalculatorNumber(value)],
    evaluationTokens: [String(value)],
    justEvaluated: true,
    errored: false,
    fraction,
    displayForm: fraction !== null && fraction.denominator !== 1 ? "fraction" : "decimal",
    ...extra
  };
}

// A reducer (not closure-based useState) so a burst of key presses always applies
// to the latest token list — building the expression can never drop a keystroke.
// Memory persists across AC (cleared only by MC), like a physical calculator.
function expressionReducer(
  state: ExpressionCalculatorState,
  action: ExpressionCalculatorAction
): ExpressionCalculatorState {
  switch (action.type) {
    case "clear":
      return { ...initialExpressionState, memory: state.memory };
    case "backspace":
      return {
        ...state,
        tokens: state.tokens.slice(0, -1),
        evaluationTokens: state.evaluationTokens.slice(0, -1),
        justEvaluated: false,
        errored: false,
        fraction: null,
        displayForm: "decimal"
      };
    case "push":
      return pushToken(state, action.token, action.isValue);
    case "evaluate": {
      const value = state.evaluationTokens.length === 0
        ? 0
        : evaluateExpressionTokens(state.evaluationTokens, action.angleMode);
      if (value === null) return { ...state, errored: true };
      return resolvedState(state, value);
    }
    case "memoryClear":
      return { ...state, memory: 0 };
    case "memoryRecall":
      {
        const displayValue = formatCalculatorNumber(state.memory);
        const evaluationValue = String(state.memory);
        if (state.errored || state.justEvaluated || state.tokens.length === 0) {
          return pushToken(state, displayValue, true, evaluationValue);
        }

        // MR replaces one complete current operand. The balanced-group-aware
        // boundary prevents a closed parenthesis/function from becoming `(...5`.
        const entryStart = currentExpressionEntryStart(state.tokens);
        return {
          ...state,
          tokens: [...state.tokens.slice(0, entryStart), displayValue],
          evaluationTokens: [...state.evaluationTokens.slice(0, entryStart), evaluationValue],
          justEvaluated: false,
          errored: false,
          fraction: null,
          displayForm: "decimal"
        };
      }
    case "memoryStore": {
      // M+ / M− evaluate the current expression, show the result, and add/subtract
      // it from memory.
      const value = state.evaluationTokens.length === 0
        ? 0
        : evaluateExpressionTokens(state.evaluationTokens, action.angleMode);
      if (value === null) return { ...state, errored: true };
      return resolvedState(state, value, { memory: state.memory + action.sign * value });
    }
    case "toggleFraction": {
      // S⇔D cycles fraction → (mixed, when improper) → decimal → fraction.
      if (!state.fraction || state.fraction.denominator === 1) return state;
      const improper = Math.abs(state.fraction.numerator) > state.fraction.denominator;
      const order: ExpressionCalculatorState["displayForm"][] = improper
        ? ["fraction", "mixed", "decimal"]
        : ["fraction", "decimal"];
      const nextIndex = (order.indexOf(state.displayForm) + 1) % order.length;
      return { ...state, displayForm: order[nextIndex] };
    }
  }
}

// Renders a rational result as a stacked fraction — improper (7/3) or, when
// `mixed`, as a whole number beside a proper stacked fraction (2 1/3).
function FractionResult({ fraction, mixed }: { fraction: Fraction; mixed: boolean }) {
  const { t } = useSettings();
  const negative = fraction.numerator < 0;
  const absNumerator = Math.abs(fraction.numerator);
  const denominator = fraction.denominator;
  const whole = mixed ? Math.floor(absNumerator / denominator) : 0;
  const partNumerator = mixed ? absNumerator % denominator : absNumerator;
  const ariaLabel = mixed
    ? t({
        en: `${negative ? "negative " : ""}${whole} and ${partNumerator} over ${denominator}`,
        zh: `${negative ? "負" : ""}${whole} 又 ${denominator} 分之 ${partNumerator}`,
        zhHans: `${negative ? "负" : ""}${whole} 又 ${denominator} 分之 ${partNumerator}`
      })
    : t({
        en: `${negative ? "negative " : ""}${absNumerator} over ${denominator}`,
        zh: `${negative ? "負" : ""}${denominator} 分之 ${absNumerator}`,
        zhHans: `${negative ? "负" : ""}${denominator} 分之 ${absNumerator}`
      });
  return (
    <span role="math" aria-label={ariaLabel} className="inline-flex items-center gap-1 align-middle">
      {negative ? <span aria-hidden="true">−</span> : null}
      {mixed && whole !== 0 ? <span aria-hidden="true" className="mr-1">{whole}</span> : null}
      <span aria-hidden="true" className="inline-flex flex-col items-center text-xl leading-none">
        <span className="px-1">{partNumerator}</span>
        <span className="my-1 h-px w-full bg-white" />
        <span className="px-1">{denominator}</span>
      </span>
    </span>
  );
}

function ScientificCalculatorBody({
  angleMode,
  state,
  dispatch
}: {
  angleMode: CalculatorAngleMode;
  state: ExpressionCalculatorState;
  dispatch: Dispatch<ExpressionCalculatorAction>;
}) {
  const { t } = useSettings();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Focus the panel when it opens so the physical keyboard drives it right away.
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // Physical-keyboard input — only fires while focus is inside the panel, so it
  // never steals keystrokes meant for the assessment's answer fields.
  const handleKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key;
    if ((key === "Enter" || key === " ") && (event.target as Element).closest("button")) return;
    if (/^[0-9]$/.test(key)) dispatch({ type: "push", token: key, isValue: true });
    else if (key === ".") dispatch({ type: "push", token: ".", isValue: true });
    else if (key === "+") dispatch({ type: "push", token: "+", isValue: false });
    else if (key === "-") dispatch({ type: "push", token: "−", isValue: false });
    else if (key === "*") dispatch({ type: "push", token: "×", isValue: false });
    else if (key === "/") dispatch({ type: "push", token: "÷", isValue: false });
    else if (key === "^") dispatch({ type: "push", token: "^", isValue: false });
    else if (key === "(") dispatch({ type: "push", token: "(", isValue: true });
    else if (key === ")") dispatch({ type: "push", token: ")", isValue: false });
    else if (key === "%") dispatch({ type: "push", token: "%", isValue: false });
    else if (key === "!") dispatch({ type: "push", token: "!", isValue: false });
    else if (key === "Enter" || key === "=") dispatch({ type: "evaluate", angleMode });
    else if (key === "Backspace") dispatch({ type: "backspace" });
    else if (key === "Escape") dispatch({ type: "clear" });
    else return;
    event.preventDefault();
  };

  const showsFraction = state.justEvaluated && state.displayForm !== "decimal" && state.fraction !== null && state.fraction.denominator !== 1;

  const handleKey = (key: ExpressionKey) => {
    if ("control" in key) {
      switch (key.control) {
        case "clear":
          dispatch({ type: "clear" });
          break;
        case "backspace":
          dispatch({ type: "backspace" });
          break;
        case "equals":
          dispatch({ type: "evaluate", angleMode });
          break;
        case "memoryClear":
          dispatch({ type: "memoryClear" });
          break;
        case "memoryRecall":
          dispatch({ type: "memoryRecall" });
          break;
        case "memoryAdd":
          dispatch({ type: "memoryStore", sign: 1, angleMode });
          break;
        case "memorySubtract":
          dispatch({ type: "memoryStore", sign: -1, angleMode });
          break;
        case "toggleFraction":
          dispatch({ type: "toggleFraction" });
          break;
      }
      return;
    }
    dispatch({ type: "push", token: key.token, isValue: key.isValue });
  };

  const renderKey = (key: ExpressionKey, height: string, text: string) => (
    <button
      key={key.label}
      type="button"
      onClick={() => handleKey(key)}
      aria-label={t(key.ariaLabel)}
      className={cn(
        "focus-ring flex items-center justify-center rounded-lg font-black shadow-sm transition active:translate-y-px",
        height,
        text,
        keyClassName(key.kind)
      )}
    >
      {key.label}
    </button>
  );

  return (
    <div ref={containerRef} tabIndex={-1} onKeyDown={handleKeyboard} className="outline-none">
      <div className="relative mb-3">
        {state.memory !== 0 ? (
          <span className="absolute left-3 top-2 text-[10px] font-black uppercase tracking-wide text-violet-300">M</span>
        ) : null}
        <div
          data-testid="calculator-display"
          aria-live="polite"
          aria-atomic="true"
          className="flex min-h-14 items-center justify-end overflow-x-auto whitespace-nowrap rounded-2xl bg-slate-950 px-4 py-3 text-right text-2xl font-black tabular-nums text-white"
        >
          {state.errored
            ? "Error"
            : showsFraction && state.fraction
              ? <FractionResult fraction={state.fraction} mixed={state.displayForm === "mixed"} />
              : state.tokens.length
                ? state.tokens.join("")
                : "0"}
        </div>
      </div>
      <div className="mb-2 grid grid-cols-5 gap-1.5">
        {expressionFunctionKeys.map((key) => renderKey(key, "h-11", "text-xs"))}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {expressionKeypadKeys.map((key) => renderKey(key, "h-11", "text-lg"))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Statistics mode — enter a data list, read n / mean / Σx / SD / min / max.
// ---------------------------------------------------------------------------

type StatVariant = "single" | "regression";

type StatisticsState = {
  variant: StatVariant;
  values: number[];
  pairs: DataPoint[];
  current: string;
  entering: "x" | "y";
  pendingX: number | null;
};

type StatisticsAction =
  | { type: "digit"; value: string }
  | { type: "decimal" }
  | { type: "negate" }
  | { type: "backspace" }
  | { type: "data" }
  | { type: "deleteLast" }
  | { type: "clear" }
  | { type: "setVariant"; variant: StatVariant };

const initialStatisticsState: StatisticsState = {
  variant: "single",
  values: [],
  pairs: [],
  current: "",
  entering: "x",
  pendingX: null
};

function statisticsReducer(state: StatisticsState, action: StatisticsAction): StatisticsState {
  switch (action.type) {
    case "digit":
      return { ...state, current: state.current === "0" ? action.value : state.current + action.value };
    case "decimal":
      if (state.current.includes(".")) return state;
      return { ...state, current: `${state.current || "0"}.` };
    case "negate":
      if (!state.current || state.current === "0") return state;
      return { ...state, current: state.current.startsWith("-") ? state.current.slice(1) : `-${state.current}` };
    case "backspace":
      return { ...state, current: state.current.slice(0, -1) };
    case "data": {
      const value = Number.parseFloat(state.current);
      if (!Number.isFinite(value)) return state;
      if (state.variant === "single") {
        return { ...state, values: [...state.values, value], current: "" };
      }
      // 2-Var: DATA advances x → y → commit the (x, y) pair.
      if (state.entering === "x") {
        return { ...state, pendingX: value, entering: "y", current: "" };
      }
      return {
        ...state,
        pairs: [...state.pairs, { x: state.pendingX ?? 0, y: value }],
        entering: "x",
        pendingX: null,
        current: ""
      };
    }
    case "deleteLast":
      if (state.variant === "single") return { ...state, values: state.values.slice(0, -1) };
      if (state.current !== "" || state.pendingX !== null) {
        return { ...state, entering: "x", pendingX: null, current: "" };
      }
      return { ...state, pairs: state.pairs.slice(0, -1), entering: "x", pendingX: null, current: "" };
    case "clear":
      return { ...initialStatisticsState, variant: state.variant };
    case "setVariant":
      if (action.variant === state.variant) return state;
      return { ...initialStatisticsState, variant: action.variant };
  }
}

type StatisticsKey = { label: string; ariaLabel: LocalizedLabel; kind: KeyKind; action: StatisticsAction };

const statisticsKeys: StatisticsKey[] = [
  { label: "7", ariaLabel: { en: "Seven", zh: "七", zhHans: "七" }, action: { type: "digit", value: "7" }, kind: "number" },
  { label: "8", ariaLabel: { en: "Eight", zh: "八", zhHans: "八" }, action: { type: "digit", value: "8" }, kind: "number" },
  { label: "9", ariaLabel: { en: "Nine", zh: "九", zhHans: "九" }, action: { type: "digit", value: "9" }, kind: "number" },
  { label: "DEL", ariaLabel: { en: "Delete last data point", zh: "刪除最後數據", zhHans: "删除最后数据" }, action: { type: "deleteLast" }, kind: "function" },
  { label: "4", ariaLabel: { en: "Four", zh: "四", zhHans: "四" }, action: { type: "digit", value: "4" }, kind: "number" },
  { label: "5", ariaLabel: { en: "Five", zh: "五", zhHans: "五" }, action: { type: "digit", value: "5" }, kind: "number" },
  { label: "6", ariaLabel: { en: "Six", zh: "六", zhHans: "六" }, action: { type: "digit", value: "6" }, kind: "number" },
  { label: "±", ariaLabel: { en: "Plus minus", zh: "正負號", zhHans: "正负号" }, action: { type: "negate" }, kind: "function" },
  { label: "1", ariaLabel: { en: "One", zh: "一", zhHans: "一" }, action: { type: "digit", value: "1" }, kind: "number" },
  { label: "2", ariaLabel: { en: "Two", zh: "二", zhHans: "二" }, action: { type: "digit", value: "2" }, kind: "number" },
  { label: "3", ariaLabel: { en: "Three", zh: "三", zhHans: "三" }, action: { type: "digit", value: "3" }, kind: "number" },
  { label: "⌫", ariaLabel: { en: "Backspace", zh: "刪除", zhHans: "删除" }, action: { type: "backspace" }, kind: "function" },
  { label: "0", ariaLabel: { en: "Zero", zh: "零", zhHans: "零" }, action: { type: "digit", value: "0" }, kind: "number" },
  { label: ".", ariaLabel: { en: "Decimal point", zh: "小數點", zhHans: "小数点" }, action: { type: "decimal" }, kind: "number" },
  { label: "AC", ariaLabel: { en: "Clear all", zh: "全部清除", zhHans: "全部清除" }, action: { type: "clear" }, kind: "function" },
  { label: "DATA", ariaLabel: { en: "Add data point", zh: "加入數據", zhHans: "加入数据" }, action: { type: "data" }, kind: "equals" }
];

function StatisticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-1.5 dark:bg-white/[0.06]">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="tabular-nums text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

function StatisticsCalculatorBody() {
  const { t } = useSettings();
  const [state, dispatch] = useReducer(statisticsReducer, initialStatisticsState);
  const stats = useMemo(() => computeStatistics(state.values), [state.values]);
  const regression = useMemo(() => computeRegression(state.pairs), [state.pairs]);
  const fmt = (value: number) => (Number.isNaN(value) ? "—" : formatCalculatorNumber(value));
  const isRegression = state.variant === "regression";

  const primaryDisplay = isRegression
    ? state.entering === "x"
      ? `x: ${state.current || "0"}`
      : `x=${formatCalculatorNumber(state.pendingX ?? 0)}  y: ${state.current || "0"}`
    : state.current || "0";

  const dataListText = isRegression
    ? state.pairs.length
      ? state.pairs.map((point) => `(${formatCalculatorNumber(point.x)}, ${formatCalculatorNumber(point.y)})`).join(" ")
      : t({ en: "x, DATA, y, DATA", zh: "x、DATA、y、DATA", zhHans: "x、DATA、y、DATA" })
    : state.values.length
      ? state.values.join(", ")
      : t({ en: "Type a number, press DATA", zh: "輸入數字後按 DATA", zhHans: "输入数字后按 DATA" });

  return (
    <>
      <div className="mb-2 flex justify-center">
        <div className="flex rounded-full bg-slate-100 p-0.5 dark:bg-white/10">
          {([
            ["single", { en: "1-Var", zh: "單變量", zhHans: "单变量" }],
            ["regression", { en: "2-Var", zh: "雙變量", zhHans: "双变量" }]
          ] as [StatVariant, LocalizedLabel][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => dispatch({ type: "setVariant", variant: value })}
              aria-pressed={state.variant === value}
              className={cn(
                "focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide",
                state.variant === value ? "bg-violet-600 text-white" : "text-slate-600 dark:text-slate-300"
              )}
            >
              {t(label)}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-2 rounded-2xl bg-slate-950 px-4 py-3 text-white">
        <div
          data-testid="calculator-display"
          aria-live="polite"
          aria-atomic="true"
          className="overflow-x-auto whitespace-nowrap text-right text-2xl font-black tabular-nums"
        >
          {primaryDisplay}
        </div>
        <div className="mt-1 truncate text-right text-[11px] font-bold text-slate-400">{dataListText}</div>
      </div>
      <div className="mb-2 grid grid-cols-2 gap-1.5 text-xs font-bold">
        {isRegression ? (
          <>
            <StatisticRow label="n" value={regression ? String(regression.count) : String(state.pairs.length)} />
            <StatisticRow label="r" value={regression ? fmt(regression.correlation) : "—"} />
            <StatisticRow label="x̄" value={regression ? fmt(regression.meanX) : "—"} />
            <StatisticRow label="ȳ" value={regression ? fmt(regression.meanY) : "—"} />
            <StatisticRow label={t({ en: "a (intercept)", zh: "a（截距）", zhHans: "a（截距）" })} value={regression ? fmt(regression.intercept) : "—"} />
            <StatisticRow label={t({ en: "b (slope)", zh: "b（斜率）", zhHans: "b（斜率）" })} value={regression ? fmt(regression.slope) : "—"} />
          </>
        ) : (
          <>
            <StatisticRow label="n" value={stats ? String(stats.count) : "0"} />
            <StatisticRow label="Σx" value={stats ? fmt(stats.sum) : "—"} />
            <StatisticRow label={t({ en: "mean x̄", zh: "平均 x̄", zhHans: "平均 x̄" })} value={stats ? fmt(stats.mean) : "—"} />
            <StatisticRow label="σₙ" value={stats ? fmt(stats.populationStdDev) : "—"} />
            <StatisticRow label="σₙ₋₁" value={stats ? fmt(stats.sampleStdDev) : "—"} />
            <StatisticRow label={t({ en: "min–max", zh: "最小–最大", zhHans: "最小–最大" })} value={stats ? `${fmt(stats.min)}–${fmt(stats.max)}` : "—"} />
          </>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {statisticsKeys.map((key) => (
          <button
            key={key.label}
            type="button"
            onClick={() => dispatch(key.action)}
            aria-label={t(key.ariaLabel)}
            className={cn(
              "focus-ring flex h-11 items-center justify-center rounded-xl text-base font-black shadow-sm transition active:translate-y-px",
              keyClassName(key.kind)
            )}
          >
            {key.label}
          </button>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Launcher — gating + open state + mode / angle toggles.
// ---------------------------------------------------------------------------

// A floating calculator, shown only when the student's accommodation policy allows
// a calculator. Renders nothing for every other student. Upper-secondary students
// get the scientific (full expression) layout by default; anyone can switch modes.
export function CalculatorLauncher() {
  const { t, currentUser } = useSettings();
  const { accommodations, loaded } = useStudentAccommodations();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CalculatorMode>(() =>
    defaultCalculatorMode(currentUser?.role === "student" ? currentUser.grade : undefined)
  );
  const [angleMode, setAngleMode] = useState<CalculatorAngleMode>("deg");
  // Keep scientific memory/state at launcher lifetime so mode switches and the
  // dialog's close/reopen cycle do not silently erase memory.
  const [expressionState, expressionDispatch] = useReducer(expressionReducer, initialExpressionState);

  if (!loaded || accommodations.calculatorPolicy !== "allowed") return null;

  const scientific = mode === "scientific";

  return (
    <div className="fixed bottom-4 left-4 z-[60] print:hidden">
      {open ? (
        <div
          role="dialog"
          aria-label={t({ en: "Calculator", zh: "計算機", zhHans: "计算器" })}
          className={cn(
            "mb-3 max-h-[80vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 p-3 shadow-[0_22px_46px_rgba(15,23,42,0.28)] backdrop-blur dark:border-white/10 dark:bg-slate-900/95",
            mode === "stats"
              ? "w-[calc(100vw-2rem)] max-w-72"
              : scientific
                ? "w-[calc(100vw-2rem)] max-w-80"
                : "w-[calc(100vw-2rem)] max-w-72 sm:max-w-64"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">
              {t({ en: "Calculator", zh: "計算機", zhHans: "计算器" })}
            </span>
            <div className="flex items-center gap-1">
              {scientific ? (
                <button
                  type="button"
                  onClick={() => setAngleMode((current) => (current === "deg" ? "rad" : "deg"))}
                  aria-label={t(angleMode === "deg"
                    ? {
                        en: "Angle mode degrees; switch to radians",
                        zh: "目前為角度模式；切換至弧度",
                        zhHans: "当前为角度模式；切换至弧度"
                      }
                    : {
                        en: "Angle mode radians; switch to degrees",
                        zh: "目前為弧度模式；切換至角度",
                        zhHans: "当前为弧度模式；切换至角度"
                      })}
                  aria-pressed={angleMode === "rad"}
                  className="focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-full bg-slate-200 px-2 py-1 text-[10px] font-black uppercase text-slate-700 dark:bg-white/10 dark:text-slate-100"
                >
                  {angleMode === "deg" ? "DEG" : "RAD"}
                </button>
              ) : null}
              <div className="flex rounded-full bg-slate-100 p-0.5 dark:bg-white/10">
                {([
                  ["basic", { en: "Basic", zh: "基本", zhHans: "基本" }],
                  ["scientific", { en: "Sci", zh: "科學", zhHans: "科学" }],
                  ["stats", { en: "Stat", zh: "統計", zhHans: "统计" }]
                ] as [CalculatorMode, LocalizedLabel][]).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    aria-pressed={mode === value}
                    className={cn(
                      "focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide",
                      mode === value ? "bg-violet-600 text-white" : "text-slate-600 dark:text-slate-300"
                    )}
                  >
                    {t(label)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {mode === "stats" ? (
            <StatisticsCalculatorBody />
          ) : scientific ? (
            <ScientificCalculatorBody
              angleMode={angleMode}
              state={expressionState}
              dispatch={expressionDispatch}
            />
          ) : (
            <BasicCalculatorBody />
          )}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={open
          ? t({ en: "Close calculator", zh: "關閉計算機", zhHans: "关闭计算器" })
          : t({ en: "Open calculator", zh: "開啟計算機", zhHans: "开启计算器" })}
        className="focus-ring flex items-center gap-2 rounded-full border border-violet-200 bg-white/90 px-4 py-3 text-sm font-black text-violet-700 shadow-lg backdrop-blur transition hover:-translate-y-0.5 dark:border-violet-500/30 dark:bg-slate-900/90 dark:text-violet-200"
      >
        <CalculatorIcon />
        {t({ en: "Calculator", zh: "計算機", zhHans: "计算器" })}
      </button>
    </div>
  );
}
