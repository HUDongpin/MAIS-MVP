"use client";

import { useReducer, useState } from "react";
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
import { evaluateExpression } from "@/lib/expressionCalculator";
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
        aria-live="polite"
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
      control: "clear" | "backspace" | "equals" | "memoryClear" | "memoryRecall" | "memoryAdd" | "memorySubtract";
    };

const expressionFunctionKeys: ExpressionKey[] = [
  { label: "sin", ariaLabel: { en: "Sine", zh: "正弦", zhHans: "正弦" }, token: "sin(", isValue: true, kind: "function" },
  { label: "cos", ariaLabel: { en: "Cosine", zh: "餘弦", zhHans: "余弦" }, token: "cos(", isValue: true, kind: "function" },
  { label: "tan", ariaLabel: { en: "Tangent", zh: "正切", zhHans: "正切" }, token: "tan(", isValue: true, kind: "function" },
  { label: "√", ariaLabel: { en: "Square root", zh: "平方根", zhHans: "平方根" }, token: "√(", isValue: true, kind: "function" },
  { label: "sin⁻¹", ariaLabel: { en: "Inverse sine", zh: "反正弦", zhHans: "反正弦" }, token: "sin⁻¹(", isValue: true, kind: "function" },
  { label: "cos⁻¹", ariaLabel: { en: "Inverse cosine", zh: "反餘弦", zhHans: "反余弦" }, token: "cos⁻¹(", isValue: true, kind: "function" },
  { label: "tan⁻¹", ariaLabel: { en: "Inverse tangent", zh: "反正切", zhHans: "反正切" }, token: "tan⁻¹(", isValue: true, kind: "function" },
  { label: "x²", ariaLabel: { en: "Square", zh: "平方", zhHans: "平方" }, token: "²", isValue: false, kind: "function" },
  { label: "ln", ariaLabel: { en: "Natural log", zh: "自然對數", zhHans: "自然对数" }, token: "ln(", isValue: true, kind: "function" },
  { label: "log", ariaLabel: { en: "Log base 10", zh: "常用對數", zhHans: "常用对数" }, token: "log(", isValue: true, kind: "function" },
  { label: "eˣ", ariaLabel: { en: "e to the power x", zh: "e 的次方", zhHans: "e 的次方" }, token: "e^(", isValue: true, kind: "function" },
  { label: "xʸ", ariaLabel: { en: "Power", zh: "次方", zhHans: "次方" }, token: "^", isValue: false, kind: "operator" },
  { label: "n!", ariaLabel: { en: "Factorial", zh: "階乘", zhHans: "阶乘" }, token: "!", isValue: false, kind: "function" },
  { label: "nPr", ariaLabel: { en: "Permutations", zh: "排列", zhHans: "排列" }, token: "nPr", isValue: false, kind: "operator" },
  { label: "nCr", ariaLabel: { en: "Combinations", zh: "組合", zhHans: "组合" }, token: "nCr", isValue: false, kind: "operator" },
  { label: "%", ariaLabel: { en: "Percent", zh: "百分比", zhHans: "百分比" }, token: "%", isValue: false, kind: "function" },
  { label: "a/b", ariaLabel: { en: "Fraction", zh: "分數", zhHans: "分数" }, token: "⁄", isValue: false, kind: "function" },
  { label: "a b/c", ariaLabel: { en: "Mixed number", zh: "帶分數", zhHans: "带分数" }, token: "⁀", isValue: false, kind: "function" },
  { label: "π", ariaLabel: { en: "Pi", zh: "圓周率", zhHans: "圆周率" }, token: "π", isValue: true, kind: "function" },
  { label: "e", ariaLabel: { en: "Euler's number", zh: "自然常數 e", zhHans: "自然常数 e" }, token: "e", isValue: true, kind: "function" },
  { label: "MC", ariaLabel: { en: "Memory clear", zh: "清除記憶", zhHans: "清除记忆" }, control: "memoryClear", kind: "function" },
  { label: "MR", ariaLabel: { en: "Memory recall", zh: "讀取記憶", zhHans: "读取记忆" }, control: "memoryRecall", kind: "function" },
  { label: "M−", ariaLabel: { en: "Memory subtract", zh: "記憶減", zhHans: "记忆减" }, control: "memorySubtract", kind: "function" },
  { label: "M+", ariaLabel: { en: "Memory add", zh: "記憶加", zhHans: "记忆加" }, control: "memoryAdd", kind: "function" }
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

type ExpressionCalculatorState = { tokens: string[]; justEvaluated: boolean; errored: boolean; memory: number };

type ExpressionCalculatorAction =
  | { type: "push"; token: string; isValue: boolean }
  | { type: "clear" }
  | { type: "backspace" }
  | { type: "evaluate"; angleMode: CalculatorAngleMode }
  | { type: "memoryClear" }
  | { type: "memoryRecall" }
  | { type: "memoryStore"; sign: 1 | -1; angleMode: CalculatorAngleMode };

const initialExpressionState: ExpressionCalculatorState = { tokens: [], justEvaluated: false, errored: false, memory: 0 };

// Append a value/operator token with the "after =" rules (a value starts fresh,
// an operator continues from the result — Casio-style "Ans").
function pushToken(state: ExpressionCalculatorState, token: string, isValue: boolean): ExpressionCalculatorState {
  const base = state.errored ? [] : state.tokens;
  const next = state.justEvaluated && isValue ? [token] : [...base, token];
  return { ...state, tokens: next, justEvaluated: false, errored: false };
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
      return { ...state, tokens: state.tokens.slice(0, -1), justEvaluated: false, errored: false };
    case "push":
      return pushToken(state, action.token, action.isValue);
    case "evaluate": {
      const value = evaluateExpression(state.tokens.join(""), action.angleMode);
      if (value === null) return { ...state, errored: true };
      return { ...state, tokens: [formatCalculatorNumber(value)], justEvaluated: true, errored: false };
    }
    case "memoryClear":
      return { ...state, memory: 0 };
    case "memoryRecall":
      return pushToken(state, formatCalculatorNumber(state.memory), true);
    case "memoryStore": {
      // M+ / M− evaluate the current expression and add/subtract it from memory,
      // showing the result (leaving the current expression untouched otherwise).
      const value = evaluateExpression(state.tokens.join(""), action.angleMode);
      if (value === null) return { ...state, errored: true };
      return {
        ...state,
        tokens: [formatCalculatorNumber(value)],
        justEvaluated: true,
        errored: false,
        memory: state.memory + action.sign * value
      };
    }
  }
}

function ScientificCalculatorBody({ angleMode }: { angleMode: CalculatorAngleMode }) {
  const { t } = useSettings();
  const [state, dispatch] = useReducer(expressionReducer, initialExpressionState);

  const display = state.errored ? "Error" : state.tokens.length ? state.tokens.join("") : "0";

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
    <>
      <div className="relative mb-3">
        {state.memory !== 0 ? (
          <span className="absolute left-3 top-2 text-[10px] font-black uppercase tracking-wide text-violet-300">M</span>
        ) : null}
        <div
          aria-live="polite"
          className="overflow-x-auto whitespace-nowrap rounded-2xl bg-slate-950 px-4 py-3 text-right text-2xl font-black tabular-nums text-white"
        >
          {display}
        </div>
      </div>
      <div className="mb-2 grid grid-cols-4 gap-1.5">
        {expressionFunctionKeys.map((key) => renderKey(key, "h-9", "text-xs"))}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {expressionKeypadKeys.map((key) => renderKey(key, "h-11", "text-lg"))}
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

  if (!loaded || accommodations.calculatorPolicy !== "allowed") return null;

  const scientific = mode === "scientific";

  return (
    <div className="fixed bottom-4 left-4 z-40 print:hidden">
      {open ? (
        <div
          role="dialog"
          aria-label={t({ en: "Calculator", zh: "計算機", zhHans: "计算器" })}
          className={cn(
            "mb-3 max-h-[80vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 p-3 shadow-[0_22px_46px_rgba(15,23,42,0.28)] backdrop-blur dark:border-white/10 dark:bg-slate-900/95",
            scientific ? "w-80" : "w-64"
          )}
        >
          <div className="flex items-center justify-between gap-2 px-1 pb-2">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">
              {t({ en: "Calculator", zh: "計算機", zhHans: "计算器" })}
            </span>
            <div className="flex items-center gap-1">
              {scientific ? (
                <button
                  type="button"
                  onClick={() => setAngleMode((current) => (current === "deg" ? "rad" : "deg"))}
                  aria-label={t({ en: "Toggle degrees or radians", zh: "切換角度或弧度", zhHans: "切换角度或弧度" })}
                  className="focus-ring rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black uppercase text-slate-700 dark:bg-white/10 dark:text-slate-100"
                >
                  {angleMode === "deg" ? "DEG" : "RAD"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setMode(scientific ? "basic" : "scientific")}
                aria-pressed={scientific}
                aria-label={scientific
                  ? t({ en: "Switch to basic calculator", zh: "切換至基本計算機", zhHans: "切换至基本计算器" })
                  : t({ en: "Switch to scientific calculator", zh: "切換至科學計算機", zhHans: "切换至科学计算器" })}
                className="focus-ring rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-violet-700 dark:bg-violet-500/15 dark:text-violet-200"
              >
                {scientific
                  ? t({ en: "Sci", zh: "科學", zhHans: "科学" })
                  : t({ en: "Basic", zh: "基本", zhHans: "基本" })}
              </button>
            </div>
          </div>
          {scientific ? <ScientificCalculatorBody angleMode={angleMode} /> : <BasicCalculatorBody />}
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
