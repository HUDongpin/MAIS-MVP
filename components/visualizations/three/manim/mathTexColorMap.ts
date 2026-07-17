import type { FormulaBinding, MathObjectSpec, MathSceneSpec } from "./mathSceneTypes";
import { buildTexIsolationPlan, type TexIsolationRule } from "./mathTexIsolation";

export type TexColorSource = "binding" | "reference" | "tex-isolation";

export const TEX_COLOR_MAP_SOURCE_CONTRACT = "Tex.tex_to_color_map|Tex.t2c|Tex.isolate";

export type TexColorMapEntry = {
  bound: boolean;
  colorHex: string;
  colorRole: string;
  colorSource: TexColorSource;
  conceptId: string;
  formulaId: string;
  objectId?: string;
  selector: string;
  texIsolationSelector?: string;
  tokenId: string;
  tokenText: string;
};

export type TexColorMap = {
  boundTokenCount: number;
  colorRoles: string[];
  colorSourceCounts: Record<TexColorSource, number>;
  colorSourceSummary: string;
  entries: TexColorMapEntry[];
  entryCount: number;
  familyId: MathSceneSpec["familyId"];
  sceneId: string;
  sourceContract: typeof TEX_COLOR_MAP_SOURCE_CONTRACT;
  summary: string;
  texIsolatedTokenCount: number;
  texIsolationSelectorCount: number;
  tokenCount: number;
  unmatchedSelectors: string[];
  unmatchedTokenCount: number;
};

export type TexColorMapOptions = {
  texIsolationRules?: TexIsolationRule[];
};

const colorHexByRole: Record<string, string> = {
  attention: "#fb7185",
  function: "#22d3ee",
  parameter: "#38bdf8",
  probe: "#facc15",
  reference: "#94a3b8",
  surface: "#818cf8",
  trace: "#a78bfa",
  vector: "#60a5fa"
};

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

function selectorValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function selectorFor(attribute: string, value: string) {
  return `[${attribute}="${selectorValue(value)}"]`;
}

function hasColorRole(object: MathObjectSpec): object is MathObjectSpec & { colorRole: string } {
  return "colorRole" in object;
}

function objectById(scene: MathSceneSpec, objectId: string) {
  return scene.objects.find((object) => object.id === objectId);
}

function tokenBinding(scene: MathSceneSpec, formulaId: string, tokenId: string) {
  return scene.bindings.find((binding) => {
    if (binding.formulaId !== formulaId || binding.tokenId !== tokenId) return false;

    return Boolean(objectById(scene, binding.objectId));
  });
}

function colorRoleForBinding(scene: MathSceneSpec, binding: FormulaBinding | undefined) {
  if (!binding) return "reference";

  const object = objectById(scene, binding.objectId);

  return object && hasColorRole(object) ? object.colorRole : "reference";
}

export function texColorHexForRole(colorRole: string) {
  return colorHexByRole[colorRole] ?? colorHexByRole.reference;
}

function summarizeTexColorMap(sceneId: string, entries: TexColorMapEntry[]) {
  const boundTokenCount = entries.filter((entry) => entry.bound).length;
  const unmatchedTokenCount = entries.length - boundTokenCount;
  const colorRoles = uniqueSorted(entries.map((entry) => entry.colorRole));
  const roleSummary = colorRoles.length > 0 ? colorRoles.join(",") : "none";

  return `tex-color-map:${sceneId}:entries=${entries.length}:tokens=${entries.length}:bound=${boundTokenCount}:unmatched=${unmatchedTokenCount}:roles=${roleSummary}`;
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function summarizeColorSources(colorSourceCounts: Record<TexColorSource, number>) {
  return [
    `binding=${colorSourceCounts.binding}`,
    `tex-isolation=${colorSourceCounts["tex-isolation"]}`,
    `reference=${colorSourceCounts.reference}`
  ].join(":");
}

export function buildTexColorMap(scene: MathSceneSpec, options: TexColorMapOptions = {}): TexColorMap {
  const entries: TexColorMapEntry[] = [];
  const unmatchedSelectors: string[] = [];

  for (const formula of scene.formulas) {
    const isolationPlan = buildTexIsolationPlan(formula, options.texIsolationRules ?? []);
    const isolationByTokenId = new Map(isolationPlan.entries.map((entry) => [entry.tokenId, entry]));
    unmatchedSelectors.push(...isolationPlan.unmatchedSelectors);

    for (const token of formula.tokens) {
      const binding = tokenBinding(scene, formula.id, token.id);
      const isolation = isolationByTokenId.get(token.id);
      const colorRole = isolation?.isolated ? isolation.colorRole : colorRoleForBinding(scene, binding);
      const bound = Boolean(binding);

      entries.push({
        bound,
        colorHex: texColorHexForRole(colorRole),
        colorRole,
        colorSource: isolation?.isolated ? "tex-isolation" : bound ? "binding" : "reference",
        conceptId: token.conceptId,
        formulaId: formula.id,
        objectId: binding?.objectId,
        selector: selectorFor("data-viz-manim-formula-token", token.id),
        texIsolationSelector: isolation?.isolated ? isolation.selector : undefined,
        tokenId: token.id,
        tokenText: token.text
      });
    }
  }

  const boundTokenCount = entries.filter((entry) => entry.bound).length;
  const colorRoles = uniqueSorted(entries.map((entry) => entry.colorRole));
  const colorSourceCounts: Record<TexColorSource, number> = {
    binding: entries.filter((entry) => entry.colorSource === "binding").length,
    reference: entries.filter((entry) => entry.colorSource === "reference").length,
    "tex-isolation": entries.filter((entry) => entry.colorSource === "tex-isolation").length
  };
  const texIsolationSelectors = uniqueSorted(
    entries
      .filter((entry) => entry.colorSource === "tex-isolation")
      .map((entry) => entry.texIsolationSelector)
      .filter((selector): selector is string => Boolean(selector))
  );

  return {
    boundTokenCount,
    colorRoles,
    colorSourceCounts,
    colorSourceSummary: summarizeColorSources(colorSourceCounts),
    entries,
    entryCount: entries.length,
    familyId: scene.familyId,
    sceneId: scene.sceneId,
    sourceContract: TEX_COLOR_MAP_SOURCE_CONTRACT,
    summary: summarizeTexColorMap(scene.sceneId, entries),
    texIsolatedTokenCount: colorSourceCounts["tex-isolation"],
    texIsolationSelectorCount: texIsolationSelectors.length,
    tokenCount: entries.length,
    unmatchedSelectors: uniqueSorted(unmatchedSelectors),
    unmatchedTokenCount: entries.length - boundTokenCount
  };
}

export function texColorMapDataAttributes(colorMap: TexColorMap) {
  return {
    "data-viz-manim-tex-color-map-bound-token-count": String(colorMap.boundTokenCount),
    "data-viz-manim-tex-color-map-source-contract": colorMap.sourceContract,
    "data-viz-manim-tex-color-map-binding-source-count": String(colorMap.colorSourceCounts.binding),
    "data-viz-manim-tex-color-map-tex-isolation-source-count": String(colorMap.colorSourceCounts["tex-isolation"]),
    "data-viz-manim-tex-color-map-reference-source-count": String(colorMap.colorSourceCounts.reference),
    "data-viz-manim-tex-color-map-source-summary": colorMap.colorSourceSummary,
    "data-viz-manim-tex-color-map-tex-isolated-token-count": String(colorMap.texIsolatedTokenCount),
    "data-viz-manim-tex-color-map-tex-isolation-selector-count": String(colorMap.texIsolationSelectorCount),
    "data-viz-manim-tex-color-map-entry-count": String(colorMap.entryCount),
    "data-viz-manim-tex-color-map-role-count": String(colorMap.colorRoles.length),
    "data-viz-manim-tex-color-map-scene-id": colorMap.sceneId,
    "data-viz-manim-tex-color-map-summary": colorMap.summary,
    "data-viz-manim-tex-color-map-token-count": String(colorMap.tokenCount),
    "data-viz-manim-tex-color-map-unmatched-selector-count": String(colorMap.unmatchedSelectors.length),
    "data-viz-manim-tex-color-map-unmatched-selectors": colorMap.unmatchedSelectors.join(",") || "none",
    "data-viz-manim-tex-color-map-unmatched-token-count": String(colorMap.unmatchedTokenCount)
  } as const;
}

export function serializeTexColorMap(colorMap: TexColorMap) {
  return stableSerialize(colorMap);
}
