import { buildFormulaSvgMorphPlan, type FormulaSvgPathMorphSpec } from "./mathSvgPathMorph";
import { buildTexIsolationPlan, type TexIsolationRule } from "./mathTexIsolation";
import type { FormulaSpec, MathSceneSpec } from "./mathSceneTypes";

export const TEX_CACHE_MANIFEST_SOURCE_CONTRACT =
  "Tex latex_to_svg cache: formula HTML/SVG entries, isolate token selectors, SVG morph artifacts, deterministic cache keys" as const;

export type MathTexCacheEntryKind = "formula-html" | "formula-svg" | "token-isolation" | "svg-morph";

export type MathTexCacheEntry = {
  cacheKey: string;
  conceptId: string;
  formulaId: string;
  kind: MathTexCacheEntryKind;
  ready: boolean;
  selector: string;
  sourceLength: number;
  tokenId: string;
};

export type MathTexCacheManifest = {
  cacheEntryCount: number;
  cacheHitEligibleCount: number;
  cacheKeys: string[];
  cacheVersion: "mais-manim-tex-cache/v1";
  entries: MathTexCacheEntry[];
  familyId: MathSceneSpec["familyId"];
  formulaCount: number;
  isolationEntryCount: number;
  ready: boolean;
  sceneId: string;
  signature: string;
  sourceContract: typeof TEX_CACHE_MANIFEST_SOURCE_CONTRACT;
  staleEntryCount: number;
  summary: string;
  svgMorphPlanCount: number;
  tokenCount: number;
};

export type MathTexCacheManifestOptions = {
  svgPathMorphs?: FormulaSvgPathMorphSpec[];
  texIsolationRules?: TexIsolationRule[];
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

function hashStableJson(value: string, prefix: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `${prefix}-${hash.toString(16).padStart(8, "0")}`;
}

function formulaTokenCount(scene: MathSceneSpec) {
  return scene.formulas.reduce((sum, formula) => sum + formula.tokens.length, 0);
}

function selectorValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function selectorFor(attribute: string, value: string) {
  return `[${attribute}="${selectorValue(value)}"]`;
}

function cacheKeyFor(value: unknown) {
  return hashStableJson(stableSerialize(value), "tex-entry");
}

function formulaEntries(formula: FormulaSpec): MathTexCacheEntry[] {
  const tokenSignature = formula.tokens.map((token) => `${token.id}:${token.text}:${token.conceptId}`).join("|");
  const ready = formula.latex.trim().length > 0;

  return [
    {
      cacheKey: cacheKeyFor({ formulaId: formula.id, kind: "formula-html", latex: formula.latex, tokenSignature }),
      conceptId: "formula",
      formulaId: formula.id,
      kind: "formula-html",
      ready,
      selector: selectorFor("data-viz-manim-formula", formula.id),
      sourceLength: formula.latex.length,
      tokenId: "formula"
    },
    {
      cacheKey: cacheKeyFor({ formulaId: formula.id, kind: "formula-svg", latex: formula.latex, tokenSignature }),
      conceptId: "formula",
      formulaId: formula.id,
      kind: "formula-svg",
      ready,
      selector: selectorFor("data-viz-manim-formula-svg", formula.id),
      sourceLength: formula.latex.length,
      tokenId: "formula"
    }
  ];
}

function summarizeTexCache(sceneId: string, formulaCount: number, tokenCount: number, entryCount: number, ready: boolean) {
  return `tex-cache:${sceneId}:formulas=${formulaCount}:tokens=${tokenCount}:entries=${entryCount}:ready=${ready ? "true" : "false"}`;
}

export function buildMathTexCacheManifest(
  scene: MathSceneSpec,
  options: MathTexCacheManifestOptions = {}
): MathTexCacheManifest {
  const entries: MathTexCacheEntry[] = [];
  const svgPathMorphs = options.svgPathMorphs ?? scene.formulaSvgMorphs ?? [];
  let isolationEntryCount = 0;
  let svgMorphPlanCount = 0;

  for (const formula of scene.formulas) {
    const isolationPlan = buildTexIsolationPlan(formula, options.texIsolationRules ?? []);
    const svgMorphPlan = buildFormulaSvgMorphPlan(formula, svgPathMorphs);
    const tokenById = new Map(formula.tokens.map((token) => [token.id, token]));

    entries.push(...formulaEntries(formula));
    isolationEntryCount += isolationPlan.entries.length;
    svgMorphPlanCount += svgMorphPlan.morphs.length;

    for (const entry of isolationPlan.entries) {
      entries.push({
        cacheKey: cacheKeyFor({
          formulaId: formula.id,
          isolationCacheKey: isolationPlan.cacheKey,
          kind: "token-isolation",
          tokenId: entry.tokenId,
          tokenText: entry.tokenText
        }),
        conceptId: entry.conceptId,
        formulaId: formula.id,
        kind: "token-isolation",
        ready: entry.tokenText.trim().length > 0,
        selector: selectorFor("data-viz-manim-formula-token", entry.tokenId),
        sourceLength: entry.tokenText.length,
        tokenId: entry.tokenId
      });
    }

    for (const morph of svgMorphPlan.morphs) {
      const sourceToken = tokenById.get(morph.sourceTokenId);
      const targetToken = tokenById.get(morph.targetTokenId);

      entries.push({
        cacheKey: cacheKeyFor({
          formulaId: formula.id,
          kind: "svg-morph",
          morphCacheKey: svgMorphPlan.cacheKeys[morph.id],
          morphId: morph.id
        }),
        conceptId: sourceToken?.conceptId ?? targetToken?.conceptId ?? "unbound",
        formulaId: formula.id,
        kind: "svg-morph",
        ready: morph.compatible && Boolean(sourceToken && targetToken),
        selector: selectorFor("data-viz-manim-svg-morph", morph.id),
        sourceLength: morph.sourcePath.length + morph.targetPath.length,
        tokenId: `${morph.sourceTokenId}->${morph.targetTokenId}`
      });
    }
  }

  const staleEntryCount = entries.filter((entry) => !entry.ready).length;
  const cacheHitEligibleCount = entries.length - staleEntryCount;
  const formulaCount = scene.formulas.length;
  const tokenCount = formulaTokenCount(scene);
  const ready = formulaCount > 0 && entries.length > 0 && staleEntryCount === 0;
  const summary = summarizeTexCache(scene.sceneId, formulaCount, tokenCount, entries.length, ready);
  const baseManifest = {
    cacheEntryCount: entries.length,
    cacheHitEligibleCount,
    cacheKeys: entries.map((entry) => entry.cacheKey),
    cacheVersion: "mais-manim-tex-cache/v1" as const,
    entries,
    familyId: scene.familyId,
    formulaCount,
    isolationEntryCount,
    ready,
    sceneId: scene.sceneId,
    sourceContract: TEX_CACHE_MANIFEST_SOURCE_CONTRACT,
    staleEntryCount,
    summary,
    svgMorphPlanCount,
    tokenCount
  };
  const signature = hashStableJson(stableSerialize(baseManifest), "tex-cache");

  return {
    ...baseManifest,
    signature
  };
}

export function texCacheManifestDataAttributes(manifest: MathTexCacheManifest) {
  return {
    "data-viz-manim-tex-cache-entry-count": String(manifest.cacheEntryCount),
    "data-viz-manim-tex-cache-formula-count": String(manifest.formulaCount),
    "data-viz-manim-tex-cache-isolation-entry-count": String(manifest.isolationEntryCount),
    "data-viz-manim-tex-cache-ready": manifest.ready ? "true" : "false",
    "data-viz-manim-tex-cache-scene-id": manifest.sceneId,
    "data-viz-manim-tex-cache-signature": manifest.signature,
    "data-viz-manim-tex-cache-source-contract": manifest.sourceContract,
    "data-viz-manim-tex-cache-summary": manifest.summary,
    "data-viz-manim-tex-cache-svg-morph-plan-count": String(manifest.svgMorphPlanCount),
    "data-viz-manim-tex-cache-token-count": String(manifest.tokenCount)
  } as const;
}

export function serializeMathTexCacheManifest(manifest: MathTexCacheManifest) {
  return stableSerialize(manifest);
}
