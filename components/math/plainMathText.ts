import { normalizeMathTextForDisplay } from "@/components/math/mathTextFormatting";

const mathDelimiterPattern = /\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$\$([\s\S]+?)\$\$|(?<![A-Za-z0-9])\$([^$\n]+?)\$/g;

function plainExponentText(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact === "?") return "unknown";

  const fraction = compact.match(/^([+-]?\d+)\s*\/\s*(\d+)$/);
  return fraction ? `${fraction[1]} over ${fraction[2]}` : compact;
}

/**
 * `normalizeMathTextForDisplay` deliberately converts superscripts and grouped
 * powers into KaTeX-friendly caret syntax. That syntax is useful to the visual
 * renderer but is not a meaningful accessible name: `8^{1/3}` is exposed as
 * braces and punctuation. Translate the small power grammar used by question
 * labels into words after display normalization and before whitespace cleanup.
 */
function powersToPlainLanguage(value: string) {
  return value
    .replace(/\^\{([^{}]+)\}/g, (_match, exponent: string) => ` to the power of ${plainExponentText(exponent)}`)
    .replace(/\^\(([^()]+)\)/g, (_match, exponent: string) => ` to the power of ${plainExponentText(exponent)}`)
    .replace(/\^([+-]?(?:\d+(?:\/\d+)?|[A-Za-z][A-Za-z0-9]*|\?))/g, (_match, exponent: string) =>
      ` to the power of ${plainExponentText(exponent)}`
    );
}

export function toPlainMathText(value: string) {
  return powersToPlainLanguage(normalizeMathTextForDisplay(value))
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
