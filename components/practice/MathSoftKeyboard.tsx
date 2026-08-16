"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { MathText } from "@/components/math/MathText";
import { calculateMathKeyboardAnswer } from "@/components/practice/mathSoftKeyboardCalculation";
import { cn, localize } from "@/lib/utils";
import type { Language, LocalizedText } from "@/types";

type AnswerControl = HTMLInputElement | HTMLTextAreaElement;
type KeyboardTabId = "numbers" | "symbols" | "letters" | "greek";
type MathKeyTone = "default" | "command" | "danger";
type MathKeyAction = "clear" | "backspace" | "calculate-or-equals" | "move-left" | "move-right" | "toggle-sign" | "toggle-shift" | "undo" | "redo";
type Snapshot = {
  value: string;
  start: number;
  end: number;
};
type MathKey = {
  label: string;
  aria: LocalizedText;
  tone?: MathKeyTone;
  insert?: string;
  shiftLabel?: string;
  shiftInsert?: string;
  shiftAria?: LocalizedText;
  shiftRenderLabelAsMath?: boolean;
  cursorOffset?: number;
  wrap?: [string, string];
  action?: MathKeyAction;
  active?: boolean;
  renderLabelAsMath?: boolean;
  subLabel?: string;
  wide?: boolean;
  extraWide?: boolean;
};

type MathSoftKeyboardProps = {
  id: string;
  value: string;
  targetRef: RefObject<AnswerControl | null>;
  language: Language;
  onChange: (value: string) => void;
  ariaLabel?: LocalizedText;
  clearAriaLabel?: LocalizedText;
};

const maxHistoryLength = 24;
const activePlaceholderLatex = String.raw`\textcolor{#1574d7}{\blacksquare}`;

const tabLabels: Array<{ id: KeyboardTabId; label: LocalizedText }> = [
  { id: "numbers", label: { en: "123", zh: "123" } },
  { id: "symbols", label: { en: "∞≠∈", zh: "∞≠∈" } },
  { id: "letters", label: { en: "abc", zh: "abc" } },
  { id: "greek", label: { en: "αβγ", zh: "αβγ" } }
];

const greekGlyphs: Record<string, { lower: string; upper: string }> = {
  alpha: { lower: "α", upper: "Α" },
  beta: { lower: "β", upper: "Β" },
  chi: { lower: "χ", upper: "Χ" },
  delta: { lower: "δ", upper: "Δ" },
  epsilon: { lower: "ε", upper: "Ε" },
  eta: { lower: "η", upper: "Η" },
  gamma: { lower: "γ", upper: "Γ" },
  iota: { lower: "ι", upper: "Ι" },
  kappa: { lower: "κ", upper: "Κ" },
  lambda: { lower: "λ", upper: "Λ" },
  mu: { lower: "μ", upper: "Μ" },
  nu: { lower: "ν", upper: "Ν" },
  omega: { lower: "ω", upper: "Ω" },
  omicron: { lower: "ο", upper: "Ο" },
  phi: { lower: "φ", upper: "Φ" },
  pi: { lower: "π", upper: "Π" },
  psi: { lower: "ψ", upper: "Ψ" },
  rho: { lower: "ρ", upper: "Ρ" },
  sigma: { lower: "σ", upper: "Σ" },
  tau: { lower: "τ", upper: "Τ" },
  theta: { lower: "θ", upper: "Θ" },
  upsilon: { lower: "υ", upper: "Υ" },
  xi: { lower: "ξ", upper: "Ξ" },
  zeta: { lower: "ζ", upper: "Ζ" }
};

const keyboardRows: Record<KeyboardTabId, MathKey[][]> = {
  numbers: [
    [
      insertKey("y", "y", "Insert y", "輸入 y", { renderLabelAsMath: true }),
      insertKey("a", "a", "Insert a", "輸入 a", { renderLabelAsMath: true }),
      exponentKey("7"),
      exponentKey("8"),
      exponentKey("9"),
      insertKey(String.raw`\frac{1}{\Box}`, "1/", "Insert reciprocal pattern", "輸入倒數格式", {
        renderLabelAsMath: true,
        shiftLabel: String.raw`\frac{1}{${activePlaceholderLatex}}`,
        shiftInsert: "1/",
        shiftAria: { en: "Insert reciprocal pattern", zh: "輸入倒數格式" },
        shiftRenderLabelAsMath: true
      }),
      functionKey("ln", "ln()", "Insert natural logarithm function", "輸入自然對數函數"),
      insertKey("i", "i", "Insert imaginary unit", "輸入虛數單位", { renderLabelAsMath: true }),
      functionKey("sin", "sin()", "Insert sine function", "輸入正弦函數")
    ],
    [
      insertKey("≤", "<=", "Insert less than or equal sign", "輸入小於或等於符號"),
      insertKey("≥", ">=", "Insert greater than or equal sign", "輸入大於或等於符號"),
      exponentKey("4"),
      exponentKey("5"),
      exponentKey("6"),
      insertKey("×", "*", "Insert multiplication sign", "輸入乘號"),
      insertKey("□′", "'", "Insert prime mark", "輸入撇號", {
        shiftLabel: String.raw`${activePlaceholderLatex}'`,
        shiftInsert: "'",
        shiftAria: { en: "Insert prime mark", zh: "輸入撇號" },
        shiftRenderLabelAsMath: true
      }),
      insertKey("□□", "*", "Insert multiplication between placeholders", "輸入兩項相乘", {
        shiftLabel: String.raw`${activePlaceholderLatex}\Box`,
        shiftInsert: "*",
        shiftAria: { en: "Insert multiplication between placeholders", zh: "輸入兩項相乘" },
        shiftRenderLabelAsMath: true
      }),
      insertKey("√□", "sqrt()", "Insert square root function", "輸入平方根函數", {
        cursorOffset: -1,
        shiftLabel: String.raw`\sqrt{${activePlaceholderLatex}}`,
        shiftInsert: "sqrt()",
        shiftAria: { en: "Insert square root function", zh: "輸入平方根函數" },
        shiftRenderLabelAsMath: true
      })
    ],
    [
      wrapKey("[", "[", "]", "Wrap with brackets", "加上中括號"),
      insertKey("]", "]", "Insert closing bracket", "輸入右中括號"),
      exponentKey("-1"),
      exponentKey("2"),
      exponentKey("3"),
      actionKey("±", "toggle-sign", "Toggle sign", "切換正負號"),
      functionKey("∫", "integral()", "Insert integral function", "輸入積分函數"),
      insertKey("∃", "exists", "Insert exists symbol", "輸入存在符號"),
      actionKey("⌫", "clear", "Clear answer", "清空答案", { tone: "danger", wide: true })
    ],
    [
      actionKey("⇧", "toggle-shift", "Toggle shift", "切換 Shift", { tone: "command", extraWide: true }),
      insertKey("∞", "infinity", "Insert infinity", "輸入無限"),
      insertKey(",", ",", "Insert comma", "輸入逗號"),
      insertKey("≠", "!=", "Insert not equal sign", "輸入不等於符號"),
      functionKey("Σ", "sum()", "Insert summation function", "輸入求和函數"),
      insertKey("^", "^", "Insert exponent marker", "輸入指數符號"),
      digitKey("0"),
      digitKey("1"),
      digitKey("2"),
      digitKey("3"),
      insertKey("+", "+", "Insert plus sign", "輸入加號")
    ],
    [
      digitKey("4"),
      digitKey("5"),
      digitKey("6"),
      digitKey("7"),
      digitKey("8"),
      digitKey("9"),
      insertKey("-", "-", "Insert minus sign", "輸入減號"),
      insertKey("/", "/", "Insert division slash", "輸入除號"),
      actionKey("=", "calculate-or-equals", "Calculate or insert equals sign", "計算或輸入等號", {
        ariaZhHans: "计算或输入等号",
        tone: "command"
      })
    ]
  ],
  symbols: [
    [
      shiftableFunctionKey(
        "sin",
        "sin()",
        "Insert sine function",
        "輸入正弦函數",
        String.raw`\sin^{-1}`,
        "asin()",
        "Insert inverse sine function",
        "輸入反正弦函數"
      ),
      functionKey("ln", "ln()", "Insert natural logarithm function", "輸入自然對數函數"),
      functionKey("abs", "abs()", "Insert absolute value function", "輸入絕對值函數"),
      insertKey("⇒", "=>", "Insert implies sign", "輸入推出符號"),
      insertKey("∄", "notexists", "Insert does not exist symbol", "輸入不存在符號"),
      insertKey("∉", "notin", "Insert not-in symbol", "輸入不屬於符號"),
      insertKey("∪", "union", "Insert union symbol", "輸入聯集符號"),
      insertKey("←□", "<-", "Insert maps from template", "輸入向左箭嘴模板", {
        shiftLabel: String.raw`\overset{\leftarrow}{${activePlaceholderLatex}}`,
        shiftInsert: "<-",
        shiftAria: { en: "Insert maps from template", zh: "輸入向左箭嘴模板" },
        shiftRenderLabelAsMath: true
      }),
      insertKey(String.raw`\lim_{x\to\infty}`, "lim(x->infinity)", "Insert limit to infinity", "輸入趨向無限的極限", { renderLabelAsMath: true }),
      insertKey("e", "e", "Insert Euler's number", "輸入自然常數 e")
    ],
    [
      shiftableFunctionKey(
        "cos",
        "cos()",
        "Insert cosine function",
        "輸入餘弦函數",
        String.raw`\cos^{-1}`,
        "acos()",
        "Insert inverse cosine function",
        "輸入反餘弦函數"
      ),
      functionKey(String.raw`\log_{10}`, "log10()", "Insert base ten logarithm function", "輸入常用對數函數"),
      wrapKey("|□|", "|", "|", "Wrap with absolute value bars", "加上絕對值符號"),
      insertKey("⇐", "<=", "Insert reverse implication sign", "輸入反向推出符號"),
      insertKey("¬", "not", "Insert logical not", "輸入邏輯非"),
      insertKey("∌", "notcontains", "Insert does-not-contain symbol", "輸入不包含符號"),
      insertKey("∩", "intersection", "Insert intersection symbol", "輸入交集符號"),
      insertKey("□_", "_", "Insert subscript marker", "輸入下標符號", {
        shiftLabel: String.raw`\underline{${activePlaceholderLatex}}`,
        shiftInsert: "_",
        shiftAria: { en: "Insert subscript marker", zh: "輸入下標符號" },
        shiftRenderLabelAsMath: true
      }),
      functionKey("∬", "doubleIntegral()", "Insert double integral function", "輸入二重積分函數"),
      insertKey("τ", "tau", "Insert tau", "輸入 tau")
    ],
    [
      shiftableFunctionKey(
        "tan",
        "tan()",
        "Insert tangent function",
        "輸入正切函數",
        String.raw`\tan^{-1}`,
        "atan()",
        "Insert inverse tangent function",
        "輸入反正切函數"
      ),
      functionKey("exp", "exp()", "Insert exponential function", "輸入指數函數"),
      functionKey("||□||", "norm()", "Insert norm function", "輸入範數函數"),
      insertKey("↔", "<->", "Insert if and only if sign", "輸入當且僅當符號"),
      insertKey("!", "!", "Insert factorial sign", "輸入階乘符號"),
      insertKey("□ᶜ", "^c", "Insert complement marker", "輸入補集符號", {
        subLabel: "complement",
        shiftLabel: String.raw`${activePlaceholderLatex}^{c}`,
        shiftInsert: "^c",
        shiftAria: { en: "Insert complement marker", zh: "輸入補集符號" },
        shiftRenderLabelAsMath: true
      }),
      insertKey("⊆", "subseteq", "Insert subset or equal symbol", "輸入子集或相等符號"),
      insertKey("□″", "''", "Insert double prime mark", "輸入雙撇號", {
        shiftLabel: String.raw`${activePlaceholderLatex}''`,
        shiftInsert: "''",
        shiftAria: { en: "Insert double prime mark", zh: "輸入雙撇號" },
        shiftRenderLabelAsMath: true
      }),
      insertKey("∂", "partial", "Insert partial derivative symbol", "輸入偏導符號"),
      insertKey("∞", "infinity", "Insert infinity", "輸入無限")
    ],
    [
      actionKey("⇧", "toggle-shift", "Toggle shift", "切換 Shift", { tone: "command", extraWide: true }),
      insertKey(";", ";", "Insert semicolon", "輸入分號"),
      insertKey("∷", "::", "Insert proportion symbol", "輸入比例符號"),
      insertKey("*", "*", "Insert multiplication asterisk", "輸入乘號星號"),
      actionKey("«", "move-left", "Move cursor left", "游標向左", { tone: "command" }),
      actionKey("»", "move-right", "Move cursor right", "游標向右", { tone: "command" }),
      actionKey("⌫", "clear", "Clear answer", "清空答案", { tone: "danger" }),
      insertKey("+", "+", "Insert plus sign", "輸入加號", { tone: "command" })
    ],
    [
      insertKey("cm", "cm", "Insert centimetres", "輸入厘米單位"),
      insertKey(String.raw`\mathrm{cm}^{2}`, "cm^2", "Insert square centimetres", "輸入平方厘米單位", { renderLabelAsMath: true }),
      insertKey(String.raw`\mathrm{cm}^{3}`, "cm^3", "Insert cubic centimetres", "輸入立方厘米單位", { renderLabelAsMath: true }),
      insertKey("mL", "mL", "Insert millilitres", "輸入毫升單位"),
      insertKey("km/h", "km/h", "Insert kilometres per hour", "輸入公里每小時單位"),
      insertKey("$", "$", "Insert US dollar sign", "輸入美元符號"),
      insertKey("HK$", "HK$", "Insert Hong Kong dollar sign", "輸入港幣符號"),
      insertKey("¥", "¥", "Insert Renminbi sign", "輸入人民幣符號")
    ]
  ],
  letters: [
    [
      letterKey("1"),
      letterKey("2"),
      letterKey("3"),
      letterKey("4"),
      insertKey(String.raw`\frac{\Box}{\Box}`, "/", "Insert fraction slash", "輸入分數斜線", { renderLabelAsMath: true }),
      insertKey("□□", "*", "Insert multiplication between placeholders", "輸入兩項相乘"),
      letterKey("7"),
      insertKey("×", "*", "Insert multiplication sign", "輸入乘號"),
      wrapKey("(", "(", ")", "Wrap with parentheses", "加上小括號"),
      insertKey(")", ")", "Insert closing parenthesis", "輸入右小括號")
    ],
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"].map(letterKey),
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"].map(letterKey),
    [
      actionKey("⇧", "toggle-shift", "Toggle shift", "切換 Shift", { tone: "command", wide: true }),
      ...["Z", "X", "C", "V", "B", "N", "M"].map(letterKey),
      actionKey("⌫", "clear", "Clear answer", "清空答案", { tone: "danger", wide: true })
    ],
    [
      actionKey("±", "toggle-sign", "Toggle sign", "切換正負號"),
      functionKey("Σ", "sum()", "Insert summation function", "輸入求和函數"),
      insertKey("≠", "!=", "Insert not equal sign", "輸入不等於符號"),
      insertKey("space", " ", "Insert space", "輸入空格", { extraWide: true }),
      insertKey(";", ";", "Insert semicolon", "輸入分號"),
      insertKey(",", ",", "Insert comma", "輸入逗號"),
      actionKey("«", "move-left", "Move cursor left", "游標向左", { tone: "command" }),
      actionKey("»", "move-right", "Move cursor right", "游標向右", { tone: "command" }),
      insertKey("+", "+", "Insert plus sign", "輸入加號", { tone: "command" })
    ]
  ],
  greek: [
    [
      greekKey("Φ", "phi"),
      greekKey("Σ", "sigma"),
      greekKey("ε", "epsilon"),
      greekKey("Ρ", "rho"),
      greekKey("Τ", "tau"),
      greekKey("Υ", "upsilon"),
      greekKey("Θ", "theta"),
      greekKey("Ι", "iota"),
      greekKey("Ο", "omicron"),
      greekKey("Π", "pi")
    ],
    [
      greekKey("Α", "alpha"),
      greekKey("Σ", "sigma"),
      greekKey("Δ", "delta"),
      greekKey("Φ", "phi"),
      greekKey("Γ", "gamma"),
      greekKey("Η", "eta"),
      greekKey("Ξ", "xi"),
      greekKey("Κ", "kappa"),
      greekKey("Λ", "lambda")
    ],
    [
      actionKey("⇧", "toggle-shift", "Toggle shift", "切換 Shift", { tone: "command", wide: true }),
      greekKey("Ζ", "zeta"),
      greekKey("Χ", "chi"),
      greekKey("Ψ", "psi"),
      greekKey("Ω", "omega"),
      greekKey("Β", "beta"),
      greekKey("Ν", "nu"),
      greekKey("Μ", "mu"),
      actionKey("⌫", "clear", "Clear answer", "清空答案", { tone: "danger", wide: true })
    ],
    [
      greekKey("ε", "epsilon", "epsilon var."),
      greekKey("ϑ", "theta", "theta var."),
      greekKey("ϰ", "kappa", "kappa var."),
      greekKey("ϖ", "pi", "pi var."),
      greekKey("ϱ", "rho", "rho var."),
      actionKey("«", "move-left", "Move cursor left", "游標向左", { tone: "command" }),
      actionKey("»", "move-right", "Move cursor right", "游標向右", { tone: "command" }),
      insertKey("+", "+", "Insert plus sign", "輸入加號", { tone: "command", wide: true })
    ]
  ]
};

function insertKey(
  label: string,
  insert: string,
  ariaEn: string,
  ariaZh: string,
  options: Partial<
    Pick<
      MathKey,
      | "cursorOffset"
      | "renderLabelAsMath"
      | "subLabel"
      | "tone"
      | "wide"
      | "extraWide"
      | "shiftLabel"
      | "shiftInsert"
      | "shiftAria"
      | "shiftRenderLabelAsMath"
    >
  > = {}
): MathKey {
  return {
    label,
    aria: { en: ariaEn, zh: ariaZh },
    insert,
    shiftLabel: options.shiftLabel,
    shiftInsert: options.shiftInsert,
    shiftAria: options.shiftAria,
    shiftRenderLabelAsMath: options.shiftRenderLabelAsMath,
    tone: options.tone,
    cursorOffset: options.cursorOffset,
    renderLabelAsMath: options.renderLabelAsMath,
    subLabel: options.subLabel,
    wide: options.wide,
    extraWide: options.extraWide
  };
}

function functionKey(label: string, insert: string, ariaEn: string, ariaZh: string): MathKey {
  return insertKey(label, insert, ariaEn, ariaZh, {
    cursorOffset: insert.endsWith("()") ? -1 : 0,
    renderLabelAsMath: label.includes("\\")
  });
}

function shiftableFunctionKey(
  label: string,
  insert: string,
  ariaEn: string,
  ariaZh: string,
  shiftLabel: string,
  shiftInsert: string,
  shiftAriaEn: string,
  shiftAriaZh: string
): MathKey {
  return insertKey(label, insert, ariaEn, ariaZh, {
    cursorOffset: insert.endsWith("()") ? -1 : 0,
    renderLabelAsMath: label.includes("\\"),
    shiftLabel,
    shiftInsert,
    shiftAria: { en: shiftAriaEn, zh: shiftAriaZh },
    shiftRenderLabelAsMath: shiftLabel.includes("\\")
  });
}

function exponentKey(exponent: string): MathKey {
  return insertKey(`□${exponent.startsWith("-") ? "^" : ""}${superscript(exponent)}`, `^${exponent}`, `Insert exponent ${exponent}`, `輸入 ${exponent} 次方`, {
    shiftLabel: activeExponentLabel(exponent),
    shiftInsert: `^${exponent}`,
    shiftAria: { en: `Insert exponent ${exponent}`, zh: `輸入 ${exponent} 次方` },
    shiftRenderLabelAsMath: true
  });
}

function digitKey(digit: string): MathKey {
  return insertKey(digit, digit, `Insert ${digit}`, `輸入 ${digit}`, {
    shiftLabel: activeExponentLabel(digit),
    shiftInsert: `^${digit}`,
    shiftAria: { en: `Insert exponent ${digit}`, zh: `輸入 ${digit} 次方` },
    shiftRenderLabelAsMath: true
  });
}

function letterKey(label: string): MathKey {
  if (!/^[A-Z]$/.test(label)) {
    return insertKey(label, label, `Insert ${label}`, `輸入 ${label}`);
  }

  const lowerLabel = label.toLowerCase();
  return {
    ...insertKey(lowerLabel, lowerLabel, `Insert ${lowerLabel}`, `輸入 ${lowerLabel}`),
    shiftLabel: label,
    shiftInsert: label,
    shiftAria: { en: `Insert ${label}`, zh: `輸入 ${label}` }
  };
}

function greekKey(label: string, insert: string, subLabel?: string): MathKey {
  const variantLabel = subLabel?.replace(/\.$/, "");
  const glyphs = subLabel ? undefined : greekGlyphs[insert];

  if (!glyphs) {
    return insertKey(label, insert, `Insert ${variantLabel ?? insert}`, `輸入 ${variantLabel ?? insert}`, { subLabel });
  }

  return {
    ...insertKey(glyphs.lower, insert, `Insert ${insert}`, `輸入 ${insert}`),
    shiftLabel: glyphs.upper,
    shiftInsert: insert.charAt(0).toUpperCase() + insert.slice(1),
    shiftAria: { en: `Insert uppercase ${insert}`, zh: `輸入大寫 ${insert}` }
  };
}

function actionKey(
  label: string,
  action: MathKeyAction,
  ariaEn: string,
  ariaZh: string,
  options: Partial<Pick<MathKey, "tone" | "wide" | "extraWide">> & { ariaZhHans?: string } = {}
): MathKey {
  return {
    label,
    action,
    aria: { en: ariaEn, zh: ariaZh, zhHans: options.ariaZhHans },
    tone: options.tone,
    wide: options.wide,
    extraWide: options.extraWide
  };
}

function wrapKey(label: string, before: string, after: string, ariaEn: string, ariaZh: string): MathKey {
  return {
    label,
    aria: { en: ariaEn, zh: ariaZh },
    insert: before,
    wrap: [before, after]
  };
}

function activeExponentLabel(exponent: string) {
  return String.raw`${activePlaceholderLatex}^{${exponent}}`;
}

function superscript(value: string) {
  return value
    .replace(/-/g, "⁻")
    .replace(/0/g, "⁰")
    .replace(/1/g, "¹")
    .replace(/2/g, "²")
    .replace(/3/g, "³")
    .replace(/4/g, "⁴")
    .replace(/5/g, "⁵")
    .replace(/6/g, "⁶")
    .replace(/7/g, "⁷")
    .replace(/8/g, "⁸")
    .replace(/9/g, "⁹");
}

function clampCursor(value: number, max: number) {
  return Math.min(max, Math.max(0, value));
}

function historyWith(snapshot: Snapshot, stack: Snapshot[]) {
  return [...stack, snapshot].slice(-maxHistoryLength);
}

function keyForShiftState(mathKey: MathKey, shiftActive: boolean): MathKey {
  const shiftedKey =
    shiftActive && mathKey.shiftLabel
      ? {
          ...mathKey,
          label: mathKey.shiftLabel,
          insert: mathKey.shiftInsert ?? mathKey.insert,
          aria: mathKey.shiftAria ?? mathKey.aria,
          renderLabelAsMath: mathKey.shiftRenderLabelAsMath ?? mathKey.renderLabelAsMath
        }
      : mathKey;

  return mathKey.action === "toggle-shift" ? { ...shiftedKey, active: shiftActive } : shiftedKey;
}

export function resolveMathKeyboardEqualsAction(value: string, start: number, end: number) {
  const isCaretAtEnd = start === end && end === value.length;
  if (!isCaretAtEnd) return { kind: "insert" } as const;

  const result = calculateMathKeyboardAnswer(value);
  if (result !== null) return { kind: "replace", value: result } as const;

  return value.includes("=") ? { kind: "noop" } as const : { kind: "insert" } as const;
}

export function reconcileMathKeyboardControlledValue(
  lastReceivedValue: string,
  pendingOwnValue: string | null,
  nextValue: string
) {
  if (lastReceivedValue === nextValue) {
    return { lastReceivedValue, pendingOwnValue, shouldClearRedo: false };
  }

  return {
    lastReceivedValue: nextValue,
    pendingOwnValue: null,
    shouldClearRedo: pendingOwnValue !== nextValue
  };
}

export function MathSoftKeyboard({
  id,
  value,
  targetRef,
  language,
  onChange,
  ariaLabel = { en: "Math soft keyboard", zh: "數學軟鍵盤", zhHans: "数学软键盘" },
  clearAriaLabel = { en: "Clear answer", zh: "清空答案", zhHans: "清空答案" }
}: MathSoftKeyboardProps) {
  const [activeTab, setActiveTab] = useState<KeyboardTabId>("numbers");
  const [shiftActive, setShiftActive] = useState(false);
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [redoStack, setRedoStack] = useState<Snapshot[]>([]);
  const lastReceivedValueRef = useRef(value);
  const pendingOwnValueRef = useRef<string | null>(null);
  const activeRows = keyboardRows[activeTab];

  useEffect(() => {
    const sync = reconcileMathKeyboardControlledValue(
      lastReceivedValueRef.current,
      pendingOwnValueRef.current,
      value
    );
    lastReceivedValueRef.current = sync.lastReceivedValue;
    pendingOwnValueRef.current = sync.pendingOwnValue;
    if (sync.shouldClearRedo) setRedoStack([]);
  }, [value]);

  function getSnapshot(): Snapshot {
    const target = targetRef.current;
    const currentValue = target?.value ?? value;
    const start = target?.selectionStart ?? currentValue.length;
    const end = target?.selectionEnd ?? start;
    return {
      value: currentValue,
      start: clampCursor(start, currentValue.length),
      end: clampCursor(end, currentValue.length)
    };
  }

  function focusAnswer(start: number, end = start, nextValue = value) {
    requestAnimationFrame(() => {
      const target = targetRef.current;
      if (!target) return;
      const safeStart = clampCursor(start, nextValue.length);
      const safeEnd = clampCursor(end, nextValue.length);
      target.focus({ preventScroll: true });
      target.setSelectionRange(safeStart, safeEnd);
    });
  }

  function emitOwnChange(nextValue: string) {
    pendingOwnValueRef.current = nextValue;
    onChange(nextValue);
  }

  function commit(nextValue: string, nextStart: number, nextEnd = nextStart) {
    const previous = getSnapshot();
    setUndoStack((current) => historyWith(previous, current));
    setRedoStack([]);
    emitOwnChange(nextValue);
    focusAnswer(nextStart, nextEnd, nextValue);
  }

  function insertText(insert: string, cursorOffset = 0) {
    const snapshot = getSnapshot();
    const nextValue = `${snapshot.value.slice(0, snapshot.start)}${insert}${snapshot.value.slice(snapshot.end)}`;
    const nextCursor = snapshot.start + insert.length + cursorOffset;
    commit(nextValue, nextCursor);
    setShiftActive(false);
  }

  function calculateOrInsertEquals() {
    const snapshot = getSnapshot();
    const resolution = resolveMathKeyboardEqualsAction(snapshot.value, snapshot.start, snapshot.end);

    if (resolution.kind === "noop") return;

    if (resolution.kind === "insert") {
      insertText("=");
      return;
    }

    commit(resolution.value, resolution.value.length);
    setShiftActive(false);
  }

  function toggleSign() {
    const snapshot = getSnapshot();
    const selectedText = snapshot.value.slice(snapshot.start, snapshot.end);

    if (selectedText) {
      const signedText = selectedText.startsWith("-") ? selectedText.slice(1) : `-${selectedText}`;
      const nextValue = `${snapshot.value.slice(0, snapshot.start)}${signedText}${snapshot.value.slice(snapshot.end)}`;
      commit(nextValue, snapshot.start + signedText.length);
      return;
    }

    if (!snapshot.value) {
      commit("-", 1);
      return;
    }

    const isNegative = snapshot.value.startsWith("-");
    const nextValue = isNegative ? snapshot.value.slice(1) : `-${snapshot.value}`;
    const cursorAdjustment = isNegative ? -1 : 1;
    commit(
      nextValue,
      clampCursor(snapshot.start + cursorAdjustment, nextValue.length),
      clampCursor(snapshot.end + cursorAdjustment, nextValue.length)
    );
  }

  function handleAction(action: MathKeyAction) {
    if (action === "calculate-or-equals") {
      calculateOrInsertEquals();
      return;
    }

    if (action === "clear") {
      clearAnswer();
      return;
    }

    if (action === "backspace") {
      backspace();
      return;
    }

    if (action === "move-left") {
      moveCursor(-1);
      return;
    }

    if (action === "move-right") {
      moveCursor(1);
      return;
    }

    if (action === "toggle-sign") {
      toggleSign();
      return;
    }

    if (action === "toggle-shift") {
      setShiftActive((current) => !current);
      focusAnswer(getSnapshot().start);
      return;
    }

    if (action === "undo") {
      undo();
      return;
    }

    redo();
  }

  function isKeyDisabled(mathKey: MathKey) {
    if (mathKey.action === "clear" || mathKey.action === "backspace") return !value;
    if (mathKey.action === "undo") return !undoStack.length;
    if (mathKey.action === "redo") return !redoStack.length;
    return false;
  }

  function applyKey(mathKey: MathKey) {
    if (mathKey.action) {
      handleAction(mathKey.action);
      return;
    }

    const snapshot = getSnapshot();
    const selectedText = snapshot.value.slice(snapshot.start, snapshot.end);

    if (mathKey.wrap && selectedText) {
      const [before, after] = mathKey.wrap;
      const wrapped = `${before}${selectedText}${after}`;
      const nextValue = `${snapshot.value.slice(0, snapshot.start)}${wrapped}${snapshot.value.slice(snapshot.end)}`;
      commit(nextValue, snapshot.start + wrapped.length);
      setShiftActive(false);
      return;
    }

    insertText(mathKey.insert ?? "", mathKey.cursorOffset ?? 0);
  }

  function backspace() {
    const snapshot = getSnapshot();
    if (!snapshot.value || (snapshot.start === 0 && snapshot.end === 0)) return;

    if (snapshot.start !== snapshot.end) {
      const nextValue = `${snapshot.value.slice(0, snapshot.start)}${snapshot.value.slice(snapshot.end)}`;
      commit(nextValue, snapshot.start);
      return;
    }

    const nextStart = snapshot.start - 1;
    const nextValue = `${snapshot.value.slice(0, nextStart)}${snapshot.value.slice(snapshot.end)}`;
    commit(nextValue, nextStart);
  }

  function clearAnswer() {
    if (!value) return;
    commit("", 0);
  }

  function moveCursor(direction: -1 | 1) {
    const snapshot = getSnapshot();
    const nextCursor = clampCursor((direction < 0 ? snapshot.start : snapshot.end) + direction, snapshot.value.length);
    focusAnswer(nextCursor, nextCursor, snapshot.value);
  }

  function undo() {
    const previous = undoStack.at(-1);
    if (!previous) return;

    const current = getSnapshot();
    setUndoStack((stack) => stack.slice(0, -1));
    setRedoStack((stack) => historyWith(current, stack));
    emitOwnChange(previous.value);
    focusAnswer(previous.start, previous.end, previous.value);
  }

  function redo() {
    const next = redoStack.at(-1);
    if (!next) return;

    const current = getSnapshot();
    setRedoStack((stack) => stack.slice(0, -1));
    setUndoStack((stack) => historyWith(current, stack));
    emitOwnChange(next.value);
    focusAnswer(next.start, next.end, next.value);
  }

  const editingControls = [
    actionKey("↶", "undo", "Undo soft keyboard input", "復原軟鍵盤輸入", { ariaZhHans: "复原软键盘输入" }),
    actionKey("↷", "redo", "Redo soft keyboard input", "重做軟鍵盤輸入", { ariaZhHans: "重做软键盘输入" }),
    actionKey("←", "move-left", "Move cursor left", "游標向左", { ariaZhHans: "光标向左" }),
    actionKey("→", "move-right", "Move cursor right", "游標向右", { ariaZhHans: "光标向右" }),
    actionKey("⌫", "backspace", "Backspace", "刪除前一字元", { ariaZhHans: "删除前一字符" }),
    actionKey("AC", "clear", localize(clearAriaLabel, "en"), localize(clearAriaLabel, "zh"), {
      ariaZhHans: localize(clearAriaLabel, "zh-Hans")
    })
  ];

  return (
    <div
      id={id}
      role="group"
      aria-label={localize(ariaLabel, language)}
      className="mt-3 scroll-mt-28 overflow-hidden rounded-[1.6rem] border border-[#aeb8c5] bg-[#c4ccd7] p-3 shadow-inner shadow-slate-500/20"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div role="tablist" aria-label={localize({ en: "Math keyboard categories", zh: "數學鍵盤分類" }, language)} className="flex flex-wrap gap-5 px-1">
          {tabLabels.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={localize(tab.label, language)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "focus-ring min-h-8 border-b-2 px-1 text-sm font-black italic tracking-normal transition",
                  active
                    ? "border-[#1574d7] text-[#1574d7]"
                    : "border-transparent text-slate-700 hover:border-[#1574d7]/50 hover:text-[#1574d7]"
                )}
              >
                {localize(tab.label, language)}
              </button>
            );
          })}
        </div>

        <div
          role="group"
          aria-label={localize({ en: "Soft keyboard editing controls", zh: "軟鍵盤編輯控制", zhHans: "软键盘编辑控制" }, language)}
          className="flex flex-wrap gap-2"
        >
          {editingControls.map((control) => (
            <KeyButton
              key={`control-${control.action}`}
              mathKey={control}
              language={language}
              compact
              disabled={isKeyDisabled(control)}
              onClick={() => applyKey(control)}
            />
          ))}
        </div>
      </div>

      <div role="tabpanel" className="mt-3 space-y-2">
        {activeRows.map((row, rowIndex) => (
          <div key={`${activeTab}-${rowIndex}`} className="flex flex-wrap justify-center gap-2">
            {row.map((mathKey, index) => {
              const hydratedKey = keyForShiftState(mathKey, shiftActive);
              return (
                <KeyButton
                  key={`${activeTab}-${rowIndex}-${mathKey.label}-${mathKey.action ?? mathKey.insert ?? mathKey.wrap?.join("")}-${index}`}
                  mathKey={hydratedKey}
                  language={language}
                  disabled={isKeyDisabled(hydratedKey)}
                  onClick={() => applyKey(hydratedKey)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function KeyButton({
  mathKey,
  language,
  compact,
  disabled,
  onClick
}: {
  mathKey: MathKey;
  language: Language;
  compact?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const tone = mathKey.tone ?? "default";
  const keyKind = mathKey.action ? "action" : mathKey.wrap ? "wrap" : "insert";

  return (
    <button
      type="button"
      aria-label={localize(mathKey.aria, language)}
      aria-pressed={mathKey.action === "toggle-shift" ? Boolean(mathKey.active) : undefined}
      title={localize(mathKey.aria, language)}
      disabled={disabled}
      data-math-key="true"
      data-math-key-kind={keyKind}
      data-math-key-action={mathKey.action}
      data-math-key-insert={mathKey.insert}
      data-math-key-wrap-before={mathKey.wrap?.[0]}
      data-math-key-wrap-after={mathKey.wrap?.[1]}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "focus-ring grid min-w-0 place-items-center rounded-md border px-2 text-center font-black leading-none shadow-sm transition enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35",
        compact
          ? "h-9 min-w-9 flex-[0_0_2.35rem] text-sm"
          : "h-10 min-w-[2.75rem] flex-[0_1_2.75rem] max-w-[4.2rem] text-sm sm:h-16 sm:min-w-[5.7rem] sm:flex-[1_1_5.7rem] sm:max-w-[7.2rem] sm:text-xl",
        mathKey.wide && "min-w-[5.8rem] flex-[0_1_5.8rem] max-w-[9rem] sm:min-w-[8.8rem] sm:flex-[2_1_8.8rem] sm:max-w-[14rem]",
        mathKey.extraWide && "min-w-[7rem] flex-[0_1_7rem] max-w-[11rem] sm:min-w-[11rem] sm:flex-[3_1_11rem] sm:max-w-[17rem]",
        tone === "command"
          ? "border-[#94a0af] bg-[#98a3b3] text-slate-950 shadow-slate-600/15 enabled:hover:bg-[#a7b1c0]"
          : tone === "danger"
            ? "border-[#c40031] bg-[#d30235] text-white shadow-rose-800/20 enabled:hover:bg-[#e11d48]"
            : "border-white/70 bg-[#f4f5f7] text-slate-950 shadow-slate-500/15 enabled:hover:bg-white",
        mathKey.active && "ring-2 ring-[#1574d7] ring-offset-1 ring-offset-[#c4ccd7]"
      )}
    >
      <span className="grid place-items-center gap-0.5">
        <span className="leading-none">
          {mathKey.renderLabelAsMath ? <MathText text={mathKey.label} renderBareMath /> : mathKey.label}
        </span>
        {mathKey.subLabel ? <span className="text-[0.6rem] font-bold leading-none text-slate-700">{mathKey.subLabel}</span> : null}
      </span>
    </button>
  );
}
