import type { FormulaSpec, MathSceneSpec } from "./mathSceneTypes";

export const TEX_ISOLATION_SOURCE_CONTRACT = "Tex.isolate|Tex.tex_to_color_map|StringMobject selector matching";

export type TexIsolationRule = {
  colorRole: string;
  selector: string;
};

export type TexIsolationEntry = {
  colorRole: string;
  conceptId: string;
  formulaId: string;
  isolated: boolean;
  matchedText: string;
  occurrence: number;
  selector?: string;
  tokenId: string;
  tokenText: string;
};

export type TexIsolationPlan = {
  cacheKey: string;
  entries: TexIsolationEntry[];
  formulaId: string;
  unmatchedSelectors: string[];
};

export type TexIsolationEvidence = {
  cacheKeyCount: number;
  formulaCount: number;
  isolatedTokenCount: number;
  occurrenceSummary: string;
  sceneId: string;
  selectorCount: number;
  selectorSummary: string;
  sourceContract: typeof TEX_ISOLATION_SOURCE_CONTRACT;
  summary: string;
  tokenCount: number;
  unmatchedSelectorCount: number;
  unmatchedSelectors: string;
};

export type TexIsolationEvidenceOptions = {
  texIsolationRules?: TexIsolationRule[];
};

type TexSelectorMatch = {
  matchedText: string;
  priority: number;
};

function selectorMatchForToken(selector: string, token: FormulaSpec["tokens"][number]): TexSelectorMatch | undefined {
  if (selector === token.id) return { matchedText: token.text, priority: 0 };
  if (selector === token.text) return { matchedText: token.text, priority: 0 };
  if (selector === `concept:${token.conceptId}`) return { matchedText: token.text, priority: 0 };
  if (selector.length > 0 && token.text.startsWith(selector)) return { matchedText: selector, priority: 1 };
  return undefined;
}

function matchingRule(token: FormulaSpec["tokens"][number], rules: TexIsolationRule[]) {
  return rules
    .map((rule, index) => {
      const match = selectorMatchForToken(rule.selector, token);

      return match ? { ...match, index, rule } : undefined;
    })
    .filter((entry): entry is TexSelectorMatch & { index: number; rule: TexIsolationRule } => Boolean(entry))
    .sort((left, right) =>
      left.priority - right.priority ||
      right.matchedText.length - left.matchedText.length ||
      left.index - right.index
    )[0];
}

function stableRules(rules: TexIsolationRule[]) {
  return [...rules].sort((left, right) =>
    `${left.selector}:${left.colorRole}`.localeCompare(`${right.selector}:${right.colorRole}`)
  );
}

function tokenSignature(formula: FormulaSpec) {
  return formula.tokens
    .map((token) => `${token.id}:${token.text}:${token.conceptId}`)
    .join("|");
}

function ruleSignature(rules: TexIsolationRule[]) {
  return stableRules(rules)
    .map((rule) => `${rule.selector}:${rule.colorRole}`)
    .join("|");
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
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

export function texIsolationCacheKey(formula: FormulaSpec, rules: TexIsolationRule[] = []) {
  return [
    formula.id,
    formula.latex,
    tokenSignature(formula),
    ruleSignature(rules)
  ].join("::");
}

export function buildTexIsolationPlan(formula: FormulaSpec, rules: TexIsolationRule[] = []): TexIsolationPlan {
  const occurrenceByMatchedText = new Map<string, number>();
  const matchedSelectors = new Set<string>();
  const entries = formula.tokens.map((token) => {
    const match = matchingRule(token, rules);
    const matchedText = match?.matchedText ?? token.text;
    const occurrence = occurrenceByMatchedText.get(matchedText) ?? 0;
    const rule = match?.rule;

    occurrenceByMatchedText.set(matchedText, occurrence + 1);

    if (rule) matchedSelectors.add(rule.selector);

    return {
      colorRole: rule?.colorRole ?? "reference",
      conceptId: token.conceptId,
      formulaId: formula.id,
      isolated: Boolean(rule),
      matchedText,
      occurrence,
      selector: rule?.selector,
      tokenId: token.id,
      tokenText: token.text
    };
  });

  return {
    cacheKey: texIsolationCacheKey(formula, rules),
    entries,
    formulaId: formula.id,
    unmatchedSelectors: stableRules(rules)
      .map((rule) => rule.selector)
      .filter((selector) => !matchedSelectors.has(selector))
  };
}

export function buildTexIsolationEvidence(
  scene: Pick<MathSceneSpec, "formulas" | "sceneId">,
  options: TexIsolationEvidenceOptions = {}
): TexIsolationEvidence {
  const rules = options.texIsolationRules ?? [];
  const plans = scene.formulas.map((formula) => buildTexIsolationPlan(formula, rules));
  const entries = plans.flatMap((plan) => plan.entries);
  const isolatedEntries = entries.filter((entry) => entry.isolated);
  const selectors = uniqueSorted(rules.map((rule) => rule.selector));
  const selectorSummary = selectors.join(",") || "none";
  const unmatchedSelectors = uniqueSorted(plans.flatMap((plan) => plan.unmatchedSelectors));
  const occurrenceSummary = isolatedEntries
    .map((entry) => `${entry.formulaId}:${entry.tokenId}#${entry.occurrence}=${entry.selector ?? "none"}`)
    .join("|") || "none";

  return {
    cacheKeyCount: uniqueSorted(plans.map((plan) => plan.cacheKey)).length,
    formulaCount: plans.length,
    isolatedTokenCount: isolatedEntries.length,
    occurrenceSummary,
    sceneId: scene.sceneId,
    selectorCount: selectors.length,
    selectorSummary,
    sourceContract: TEX_ISOLATION_SOURCE_CONTRACT,
    summary: `tex-isolation:${scene.sceneId}:formulas=${plans.length}:tokens=${entries.length}:isolated=${isolatedEntries.length}:selectors=${selectorSummary}:unmatched=${unmatchedSelectors.length}`,
    tokenCount: entries.length,
    unmatchedSelectorCount: unmatchedSelectors.length,
    unmatchedSelectors: unmatchedSelectors.join(",") || "none"
  };
}

export function texIsolationEvidenceDataAttributes(evidence: TexIsolationEvidence) {
  return {
    "data-viz-manim-tex-isolation-cache-key-count": String(evidence.cacheKeyCount),
    "data-viz-manim-tex-isolation-formula-count": String(evidence.formulaCount),
    "data-viz-manim-tex-isolation-isolated-token-count": String(evidence.isolatedTokenCount),
    "data-viz-manim-tex-isolation-occurrence-summary": evidence.occurrenceSummary,
    "data-viz-manim-tex-isolation-scene-id": evidence.sceneId,
    "data-viz-manim-tex-isolation-selector-count": String(evidence.selectorCount),
    "data-viz-manim-tex-isolation-selector-summary": evidence.selectorSummary,
    "data-viz-manim-tex-isolation-source-contract": evidence.sourceContract,
    "data-viz-manim-tex-isolation-summary": evidence.summary,
    "data-viz-manim-tex-isolation-token-count": String(evidence.tokenCount),
    "data-viz-manim-tex-isolation-unmatched-selector-count": String(evidence.unmatchedSelectorCount),
    "data-viz-manim-tex-isolation-unmatched-selectors": evidence.unmatchedSelectors
  } as const;
}

export function serializeTexIsolationEvidence(evidence: TexIsolationEvidence) {
  return stableSerialize(evidence);
}
