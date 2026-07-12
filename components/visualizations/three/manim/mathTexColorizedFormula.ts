import type { FormulaLayerFormulaState, FormulaLayerTokenState } from "./mathFormulaLayer";
import { texColorHexForRole } from "./mathTexColorMap";

export const TEX_COLORIZED_FORMULA_SOURCE_CONTRACT =
  "Tex.tex_to_color_map runtime FormulaLayer adapter|KaTeX color command injection|semantic token intervals" as const;

export type TexColorizedFormula = {
  coloredCharacterCount: number;
  coloredTokenCount: number;
  coloredTokenIds: string[];
  coverageRatio: number;
  coverageSummary: string;
  formulaId: string;
  intervalOrderSummary: string;
  intervalSummary: string;
  latex: string;
  originalLatex: string;
  roleSummary: string;
  sourceContract: typeof TEX_COLORIZED_FORMULA_SOURCE_CONTRACT;
  sourceCharacterCount: number;
  summary: string;
  tokenCount: number;
  uncoloredTokenCount: number;
  uncoloredTokenIds: string[];
};

type LatexEnvelope = {
  body: string;
  prefix: string;
  suffix: string;
};

type TokenInterval = {
  colorHex: string;
  end: number;
  replacement: string;
  role: string;
  start: number;
  tokenId: string;
};

const texAliasesByPlainToken: Record<string, string> = {
  alpha: "\\alpha",
  beta: "\\beta",
  gamma: "\\gamma",
  lambda: "\\lambda",
  mu: "\\mu",
  pi: "\\pi",
  sigma: "\\sigma",
  theta: "\\theta"
};

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function stableValue(value: unknown): unknown {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry) ?? null);
  if (!value || typeof value !== "object") return value;

  const stableObject: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) {
    if (entry !== undefined) stableObject[key] = stableValue(entry);
  }

  return stableObject;
}

function stableSerialize(value: unknown) {
  return JSON.stringify(stableValue(value))
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function splitLatexEnvelope(latex: string): LatexEnvelope {
  if (latex.startsWith("$$") && latex.endsWith("$$") && latex.length >= 4) {
    return { body: latex.slice(2, -2), prefix: "$$", suffix: "$$" };
  }

  if (latex.startsWith("$") && latex.endsWith("$") && latex.length >= 2) {
    return { body: latex.slice(1, -1), prefix: "$", suffix: "$" };
  }

  if (latex.startsWith("\\(") && latex.endsWith("\\)") && latex.length >= 4) {
    return { body: latex.slice(2, -2), prefix: "\\(", suffix: "\\)" };
  }

  if (latex.startsWith("\\[") && latex.endsWith("\\]") && latex.length >= 4) {
    return { body: latex.slice(2, -2), prefix: "\\[", suffix: "\\]" };
  }

  return { body: latex, prefix: "", suffix: "" };
}

function tokenNeedles(token: FormulaLayerTokenState) {
  const trimmed = (token.texIsolated ? token.texIsolationMatchedText : token.text).trim();
  const alias = texAliasesByPlainToken[trimmed];

  return unique([alias, trimmed].filter((entry): entry is string => Boolean(entry))).sort(
    (left, right) => right.length - left.length || left.localeCompare(right)
  );
}

function overlaps(intervals: TokenInterval[], start: number, end: number) {
  return intervals.some((interval) => start < interval.end && end > interval.start);
}

function isInsideControlWord(body: string, start: number) {
  if (!/[a-zA-Z]/.test(body[start] ?? "")) return false;

  let runStart = start;
  while (runStart > 0 && /[a-zA-Z]/.test(body[runStart - 1])) runStart -= 1;

  return runStart > 0 && body[runStart - 1] === "\\";
}

function literalMatches(body: string, needle: string) {
  const matches: Array<{ end: number; start: number; value: string }> = [];
  let cursor = 0;

  while (cursor < body.length) {
    const start = body.indexOf(needle, cursor);
    if (start < 0) break;

    // Never wrap text that is part of a TeX control word (e.g. the "a" in
    // \approx or "time" in \times) — injecting \color there corrupts the command.
    if (!isInsideControlWord(body, start)) {
      matches.push({ end: start + needle.length, start, value: needle });
    }
    cursor = start + Math.max(needle.length, 1);
  }

  return matches;
}

function availableMatchForToken(body: string, token: FormulaLayerTokenState, intervals: TokenInterval[]) {
  const candidates = tokenNeedles(token)
    .flatMap((needle) => literalMatches(body, needle))
    .sort((left, right) => left.start - right.start || right.value.length - left.value.length);
  let availableOccurrence = 0;
  let fallback: (typeof candidates)[number] | undefined;

  for (const candidate of candidates) {
    if (overlaps(intervals, candidate.start, candidate.end)) continue;

    fallback ??= candidate;

    if (availableOccurrence === token.texIsolationOccurrence) {
      return candidate;
    }

    availableOccurrence += 1;
  }

  return fallback;
}

function applyIntervals(body: string, intervals: TokenInterval[]) {
  let cursor = 0;
  let output = "";

  for (const interval of intervals.sort((left, right) => left.start - right.start)) {
    output += body.slice(cursor, interval.start);
    output += interval.replacement;
    cursor = interval.end;
  }

  return `${output}${body.slice(cursor)}`;
}

function intervalSummary(intervals: TokenInterval[]) {
  return intervals
    .sort((left, right) => left.start - right.start || left.tokenId.localeCompare(right.tokenId))
    .map((interval) => `${interval.tokenId}@${interval.start}-${interval.end}=${interval.colorHex}`)
    .join("|") || "none";
}

function intervalOrderSummary(intervals: TokenInterval[]) {
  return [...intervals]
    .sort((left, right) => left.start - right.start || left.tokenId.localeCompare(right.tokenId))
    .map((interval) => interval.tokenId)
    .join(">") || "none";
}

function coverageRatio(coloredCharacterCount: number, sourceCharacterCount: number) {
  if (sourceCharacterCount <= 0) return 0;

  return Number((coloredCharacterCount / sourceCharacterCount).toFixed(3));
}

function coverageSummary(
  coloredCharacterCount: number,
  sourceCharacterCount: number,
  intervalOrder: string
) {
  const ratio = coverageRatio(coloredCharacterCount, sourceCharacterCount).toFixed(3);

  return `coverage:colored=${coloredCharacterCount}:source=${sourceCharacterCount}:ratio=${ratio}:order=${intervalOrder}`;
}

export function buildTexColorizedFormula(formula: FormulaLayerFormulaState): TexColorizedFormula {
  const envelope = splitLatexEnvelope(formula.latex);
  const intervals: TokenInterval[] = [];
  const sortedTokens = [...formula.tokens].sort(
    (left, right) => Math.max(...tokenNeedles(right).map((needle) => needle.length), 0) -
      Math.max(...tokenNeedles(left).map((needle) => needle.length), 0) || left.index - right.index
  );

  for (const token of sortedTokens) {
    const match = availableMatchForToken(envelope.body, token, intervals);
    if (!match) continue;

    const colorHex = texColorHexForRole(token.colorRole);
    intervals.push({
      colorHex,
      end: match.end,
      replacement: `\\color{${colorHex}}{${envelope.body.slice(match.start, match.end)}}`,
      role: token.colorRole,
      start: match.start,
      tokenId: token.id
    });
  }

  const coloredTokenIds = formula.tokens.filter((token) => intervals.some((interval) => interval.tokenId === token.id)).map((token) => token.id);
  const uncoloredTokenIds = formula.tokens.filter((token) => !coloredTokenIds.includes(token.id)).map((token) => token.id);
  const coloredBody = applyIntervals(envelope.body, intervals);
  const sourceCharacterCount = envelope.body.length;
  const coloredCharacterCount = intervals.reduce((total, interval) => total + Math.max(0, interval.end - interval.start), 0);
  const intervalOrder = intervalOrderSummary(intervals);
  const ratio = coverageRatio(coloredCharacterCount, sourceCharacterCount);
  const roleSummary = unique(intervals.map((interval) => interval.role)).sort((left, right) => left.localeCompare(right)).join(",") || "none";
  const summary = [
    `tex-colorized-formula:${formula.id}`,
    `tokens=${formula.tokens.length}`,
    `colored=${coloredTokenIds.length}`,
    `uncolored=${uncoloredTokenIds.length}`,
    `roles=${roleSummary}`
  ].join(":");

  return {
    coloredCharacterCount,
    coloredTokenCount: coloredTokenIds.length,
    coloredTokenIds,
    coverageRatio: ratio,
    coverageSummary: coverageSummary(coloredCharacterCount, sourceCharacterCount, intervalOrder),
    formulaId: formula.id,
    intervalOrderSummary: intervalOrder,
    intervalSummary: intervalSummary(intervals),
    latex: `${envelope.prefix}${coloredBody}${envelope.suffix}`,
    originalLatex: formula.latex,
    roleSummary,
    sourceContract: TEX_COLORIZED_FORMULA_SOURCE_CONTRACT,
    sourceCharacterCount,
    summary,
    tokenCount: formula.tokens.length,
    uncoloredTokenCount: uncoloredTokenIds.length,
    uncoloredTokenIds
  };
}

export function texColorizedFormulaDataAttributes(formula: TexColorizedFormula) {
  return {
    "data-viz-manim-tex-colorized-colored-character-count": String(formula.coloredCharacterCount),
    "data-viz-manim-tex-colorized-colored-token-count": String(formula.coloredTokenCount),
    "data-viz-manim-tex-colorized-colored-token-ids": formula.coloredTokenIds.join(",") || "none",
    "data-viz-manim-tex-colorized-coverage-ratio": formula.coverageRatio.toFixed(3),
    "data-viz-manim-tex-colorized-coverage-summary": formula.coverageSummary,
    "data-viz-manim-tex-colorized-formula-id": formula.formulaId,
    "data-viz-manim-tex-colorized-interval-order-summary": formula.intervalOrderSummary,
    "data-viz-manim-tex-colorized-interval-summary": formula.intervalSummary,
    "data-viz-manim-tex-colorized-role-summary": formula.roleSummary,
    "data-viz-manim-tex-colorized-source-contract": formula.sourceContract,
    "data-viz-manim-tex-colorized-source-character-count": String(formula.sourceCharacterCount),
    "data-viz-manim-tex-colorized-summary": formula.summary,
    "data-viz-manim-tex-colorized-token-count": String(formula.tokenCount),
    "data-viz-manim-tex-colorized-uncolored-token-count": String(formula.uncoloredTokenCount),
    "data-viz-manim-tex-colorized-uncolored-token-ids": formula.uncoloredTokenIds.join(",") || "none"
  } as const;
}

export function serializeTexColorizedFormula(formula: TexColorizedFormula) {
  return stableSerialize(formula);
}
