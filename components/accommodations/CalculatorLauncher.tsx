"use client";

import { useReducer, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { useStudentAccommodations } from "@/components/accommodations/useStudentAccommodations";
import {
  calculatorReducer,
  defaultCalculatorMode,
  initialCalculatorState,
  type CalculatorAction,
  type CalculatorMode
} from "@/lib/calculatorEngine";
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

type CalculatorKey = {
  label: string;
  ariaLabel: LocalizedLabel;
  action: CalculatorAction;
  kind: KeyKind;
};

const keypadKeys: CalculatorKey[] = [
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

const scientificKeys: CalculatorKey[] = [
  { label: "sin", ariaLabel: { en: "Sine", zh: "正弦", zhHans: "正弦" }, action: { type: "unary", fn: "sin" }, kind: "function" },
  { label: "cos", ariaLabel: { en: "Cosine", zh: "餘弦", zhHans: "余弦" }, action: { type: "unary", fn: "cos" }, kind: "function" },
  { label: "tan", ariaLabel: { en: "Tangent", zh: "正切", zhHans: "正切" }, action: { type: "unary", fn: "tan" }, kind: "function" },
  { label: "sin⁻¹", ariaLabel: { en: "Inverse sine", zh: "反正弦", zhHans: "反正弦" }, action: { type: "unary", fn: "asin" }, kind: "function" },
  { label: "cos⁻¹", ariaLabel: { en: "Inverse cosine", zh: "反餘弦", zhHans: "反余弦" }, action: { type: "unary", fn: "acos" }, kind: "function" },
  { label: "tan⁻¹", ariaLabel: { en: "Inverse tangent", zh: "反正切", zhHans: "反正切" }, action: { type: "unary", fn: "atan" }, kind: "function" },
  { label: "ln", ariaLabel: { en: "Natural log", zh: "自然對數", zhHans: "自然对数" }, action: { type: "unary", fn: "ln" }, kind: "function" },
  { label: "log", ariaLabel: { en: "Log base 10", zh: "常用對數", zhHans: "常用对数" }, action: { type: "unary", fn: "log" }, kind: "function" },
  { label: "eˣ", ariaLabel: { en: "e to the power x", zh: "e 的次方", zhHans: "e 的次方" }, action: { type: "unary", fn: "exp" }, kind: "function" },
  { label: "x²", ariaLabel: { en: "Square", zh: "平方", zhHans: "平方" }, action: { type: "unary", fn: "square" }, kind: "function" },
  { label: "xʸ", ariaLabel: { en: "Power", zh: "次方", zhHans: "次方" }, action: { type: "operator", value: "^" }, kind: "operator" },
  { label: "1/x", ariaLabel: { en: "Reciprocal", zh: "倒數", zhHans: "倒数" }, action: { type: "unary", fn: "reciprocal" }, kind: "function" },
  { label: "n!", ariaLabel: { en: "Factorial", zh: "階乘", zhHans: "阶乘" }, action: { type: "unary", fn: "factorial" }, kind: "function" },
  { label: "π", ariaLabel: { en: "Pi", zh: "圓周率", zhHans: "圆周率" }, action: { type: "constant", value: "pi" }, kind: "function" },
  { label: "e", ariaLabel: { en: "Euler's number", zh: "自然常數 e", zhHans: "自然常数 e" }, action: { type: "constant", value: "e" }, kind: "function" }
];

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

// A floating calculator, shown only when the student's accommodation policy allows
// a calculator. Renders nothing for every other student, so it never adds an
// affordance a "no calculator" or default policy shouldn't have. Upper-secondary
// students get the scientific layout by default; anyone can switch modes.
export function CalculatorLauncher() {
  const { t, currentUser } = useSettings();
  const { accommodations, loaded } = useStudentAccommodations();
  const [state, dispatch] = useReducer(calculatorReducer, initialCalculatorState);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CalculatorMode>(() =>
    defaultCalculatorMode(currentUser?.role === "student" ? currentUser.grade : undefined)
  );

  if (!loaded || accommodations.calculatorPolicy !== "allowed") return null;

  const scientific = mode === "scientific";

  return (
    <div className="fixed bottom-4 left-4 z-40 print:hidden">
      {open ? (
        <div
          role="dialog"
          aria-label={t({ en: "Calculator", zh: "計算機", zhHans: "计算器" })}
          className={cn(
            "mb-3 rounded-3xl border border-slate-200/80 bg-white/95 p-3 shadow-[0_22px_46px_rgba(15,23,42,0.28)] backdrop-blur dark:border-white/10 dark:bg-slate-900/95",
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
                  onClick={() => dispatch({ type: "toggleAngleMode" })}
                  aria-label={t({ en: "Toggle degrees or radians", zh: "切換角度或弧度", zhHans: "切换角度或弧度" })}
                  className="focus-ring rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black uppercase text-slate-700 dark:bg-white/10 dark:text-slate-100"
                >
                  {state.angleMode === "deg" ? "DEG" : "RAD"}
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
          <div
            aria-live="polite"
            className="mb-3 overflow-x-auto rounded-2xl bg-slate-950 px-4 py-3 text-right text-3xl font-black tabular-nums text-white"
          >
            {state.display}
          </div>
          {scientific ? (
            <div className="mb-2 grid grid-cols-5 gap-1.5">
              {scientificKeys.map((key) => (
                <button
                  key={key.label}
                  type="button"
                  onClick={() => dispatch(key.action)}
                  aria-label={t(key.ariaLabel)}
                  className={cn(
                    "focus-ring flex h-9 items-center justify-center rounded-lg text-xs font-black shadow-sm transition active:translate-y-px",
                    keyClassName(key.kind)
                  )}
                >
                  {key.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="grid grid-cols-4 gap-2">
            {keypadKeys.map((key) => (
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
