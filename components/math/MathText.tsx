import katex from "katex";
import { Fragment, createElement, type ElementType } from "react";
import { normalizeMathTextForDisplay } from "@/components/math/mathTextFormatting";
import { cn } from "@/lib/utils";

type MathSegment =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "math";
      value: string;
      displayMode: boolean;
    };

type MathTextProps<TElement extends ElementType = "span"> = {
  text: string;
  as?: TElement;
  className?: string;
  ariaLabel?: string;
  normalizeMath?: boolean;
  renderBareMath?: boolean;
};

const mathDelimiterPattern = /\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$\$([\s\S]+?)\$\$|(?<![A-Za-z0-9])\$([^$\n]+?)\$/g;

function hasMathDelimiters(value: string) {
  mathDelimiterPattern.lastIndex = 0;
  return mathDelimiterPattern.test(value);
}

function looksLikeMathExpression(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 120) return false;
  if (/^[IVX]+$/.test(trimmed)) return false;
  if (/^(local maximum|local minimum|no turning point|vertical asymptote)$/i.test(trimmed)) return false;
  return (
    /[=^/()+\-,:°]|\\/.test(trimmed) ||
    /\b(?:sin|cos|tan|log|ln|sqrt|frac|theta|pi|P)\b/i.test(trimmed) ||
    /[θπ]/.test(trimmed) ||
    /^[a-zA-Z](?:_\{?\d+\}?|\d)?$/.test(trimmed)
  );
}

function splitMathText(value: string): MathSegment[] {
  const segments: MathSegment[] = [];
  mathDelimiterPattern.lastIndex = 0;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = mathDelimiterPattern.exec(value)) !== null) {
    if (match.index > cursor) {
      segments.push({ type: "text", value: value.slice(cursor, match.index) });
    }

    const bracketMath = match[1];
    const parenMath = match[2];
    const blockDollarMath = match[3];
    const inlineDollarMath = match[4];
    segments.push({
      type: "math",
      value: bracketMath ?? parenMath ?? blockDollarMath ?? inlineDollarMath ?? "",
      displayMode: Boolean(bracketMath ?? blockDollarMath)
    });
    cursor = mathDelimiterPattern.lastIndex;
  }

  if (cursor < value.length) {
    segments.push({ type: "text", value: value.slice(cursor) });
  }

  return segments;
}

function normalizeMathSource(value: string) {
  return value
    .replace(/−/g, "-")
    .replace(/·/g, "\\cdot ")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/°/g, "^\\circ");
}

export function toPlainMathText(value: string) {
  return normalizeMathTextForDisplay(value)
    .replace(mathDelimiterPattern, (_, bracketMath, parenMath, blockDollarMath, inlineDollarMath) =>
      String(bracketMath ?? parenMath ?? blockDollarMath ?? inlineDollarMath ?? "")
    )
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1 over $2")
    .replace(/\\text\{([^{}]+)\}/g, "$1")
    .replace(/\\log_\{([^{}]+)\}/g, "log base $1 ")
    .replace(/\\sin/g, "sin ")
    .replace(/\\cos/g, "cos ")
    .replace(/\\tan/g, "tan ")
    .replace(/\\times/g, " times ")
    .replace(/\\div/g, " divided by ")
    .replace(/\\cdot/g, " times ")
    .replace(/\\sqrt/g, " square root ")
    .replace(/\\quad/g, " ")
    .replace(/\\theta/g, "theta")
    .replace(/\\pi/g, "pi")
    .replace(/\\circ/g, "degrees")
    .replace(/\s+/g, " ")
    .trim();
}

function renderMathSegment(segment: Extract<MathSegment, { type: "math" }>, index: number) {
  const html = katex.renderToString(normalizeMathSource(segment.value), {
    displayMode: segment.displayMode,
    output: "html",
    strict: "ignore",
    throwOnError: false,
    trust: false
  });

  return (
    <span
      key={index}
      className={segment.displayMode ? "math-display" : "math-inline"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function MathText<TElement extends ElementType = "span">({
  text,
  as,
  className,
  ariaLabel,
  normalizeMath = true,
  renderBareMath = false
}: MathTextProps<TElement>) {
  const normalizedText = normalizeMath ? normalizeMathTextForDisplay(text) : text;
  const source = renderBareMath && !hasMathDelimiters(normalizedText) && looksLikeMathExpression(normalizedText)
    ? `\\(${normalizedText}\\)`
    : normalizedText;
  const Component = as ?? "span";

  return createElement(
    Component,
    { className: cn("math-text", className), "aria-label": ariaLabel },
    splitMathText(source).map((segment, index) => (
      segment.type === "math"
        ? renderMathSegment(segment, index)
        : <Fragment key={index}>{segment.value}</Fragment>
    ))
  );
}
