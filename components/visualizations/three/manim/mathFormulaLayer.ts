import type { FormulaBinding, FormulaSpec, MathMobjectAnchorName, MathObjectSpec, MathSceneSpec } from "./mathSceneTypes";
import { buildTexIsolationPlan, type TexIsolationRule } from "./mathTexIsolation";
import { buildFormulaSvgMorphPlan, type FormulaSvgPathMorphSpec } from "./mathSvgPathMorph";

export const FORMULA_LAYER_SOURCE_CONTRACT =
  "Tex/StringMobject fixed-in-frame FormulaLayer|semantic token ids|token-to-object bindings" as const;

export type FormulaLayerTokenState = {
  active: boolean;
  ariaLabel: string;
  boundObjectIds: string[];
  colorRole: string;
  conceptId: string;
  formulaId: string;
  id: string;
  index: number;
  texIsolated: boolean;
  texIsolationMatchedText: string;
  texIsolationOccurrence: number;
  texIsolationSelector?: string;
  text: string;
};

export type FormulaLayerFormulaState = {
  id: string;
  latex: string;
  tokens: FormulaLayerTokenState[];
};

export type FormulaLayerState = {
  activeConceptId: string;
  activeObjectAnchorNames: Record<string, MathMobjectAnchorName>;
  activeObjectIds: string[];
  formulas: FormulaLayerFormulaState[];
  screenFixed: boolean;
  sourceContract: typeof FORMULA_LAYER_SOURCE_CONTRACT;
  tokenColorMap: Record<string, string>;
  texIsolationCacheKeys: Record<string, string>;
  texIsolationUnmatchedSelectors: string[];
  svgPathMorphCacheKeys: Record<string, string>;
  svgPathMorphCount: number;
  svgPathMorphIssues: string[];
  unboundTokenIds: string[];
};

export type FormulaLayerOptions = {
  activeConceptId?: string;
  activeConceptIds?: string[];
  svgPathMorphs?: FormulaSvgPathMorphSpec[];
  texIsolationRules?: TexIsolationRule[];
};

export const FORMULA_LAYER_PROJECTED_LABEL_TEXT_POLICY =
  "active FormulaLayer projected labels use bound formula token text instead of internal concept ids" as const;

export type FormulaLayerProjectedLabelTextSummary = {
  objectCount: number;
  objectIds: string;
  policy: typeof FORMULA_LAYER_PROJECTED_LABEL_TEXT_POLICY;
  source: "formula-token";
  sourceContract: typeof FORMULA_LAYER_SOURCE_CONTRACT;
  summary: string;
  textSummary: string;
};

export type FormulaLayerActiveTokenSummary = {
  activeObjectIds: string;
  activeTokenCount: number;
  activeTokenIds: string;
  sourceContract: typeof FORMULA_LAYER_SOURCE_CONTRACT;
  summary: string;
};

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function hasColorRole(object: MathObjectSpec): object is MathObjectSpec & { colorRole: string } {
  return "colorRole" in object;
}

function objectById(scene: MathSceneSpec, objectId: string) {
  return scene.objects.find((object) => object.id === objectId);
}

function tokenBindings(scene: MathSceneSpec, formula: FormulaSpec, tokenId: string) {
  return scene.bindings.filter((binding) => binding.formulaId === formula.id && binding.tokenId === tokenId);
}

function colorRoleForBindings(scene: MathSceneSpec, bindings: FormulaBinding[]) {
  const object = bindings.map((binding) => objectById(scene, binding.objectId)).find((entry) => entry && hasColorRole(entry));

  return object && hasColorRole(object) ? object.colorRole : "reference";
}

function boundObjectIds(scene: MathSceneSpec, bindings: FormulaBinding[]) {
  return unique(bindings.map((binding) => binding.objectId).filter((objectId) => objectById(scene, objectId)));
}

function activeAnchorNameForObject(bindings: FormulaBinding[], objectId: string): MathMobjectAnchorName {
  return bindings.find((binding) => binding.objectId === objectId)?.anchorName ?? "center";
}

export function buildFormulaLayerState(scene: MathSceneSpec, options: FormulaLayerOptions = {}): FormulaLayerState {
  const activeConceptId = options.activeConceptId ?? "";
  const activeIds = unique([activeConceptId, ...(options.activeConceptIds ?? [])].filter(Boolean));
  const svgPathMorphs = options.svgPathMorphs ?? scene.formulaSvgMorphs ?? [];
  const activeObjectAnchorNames: Record<string, MathMobjectAnchorName> = {};
  const tokenColorMap: Record<string, string> = {};
  const texIsolationCacheKeys: Record<string, string> = {};
  const texIsolationUnmatchedSelectors: string[] = [];
  const svgPathMorphCacheKeys: Record<string, string> = {};
  const svgPathMorphIssues: string[] = [];
  let svgPathMorphCount = 0;
  const unboundTokenIds: string[] = [];
  const activeObjectIds: string[] = [];

  const formulas = scene.formulas.map((formula) => {
    const isolationPlan = buildTexIsolationPlan(formula, options.texIsolationRules ?? []);
    const svgMorphPlan = buildFormulaSvgMorphPlan(formula, svgPathMorphs);
    const isolationByTokenId = Object.fromEntries(isolationPlan.entries.map((entry) => [entry.tokenId, entry]));

    texIsolationCacheKeys[formula.id] = isolationPlan.cacheKey;
    texIsolationUnmatchedSelectors.push(...isolationPlan.unmatchedSelectors);
    Object.assign(svgPathMorphCacheKeys, svgMorphPlan.cacheKeys);
    svgPathMorphCount += svgMorphPlan.morphs.length;
    svgPathMorphIssues.push(...svgMorphPlan.issues);

    return {
      id: formula.id,
      latex: formula.latex,
      tokens: formula.tokens.map((token, index) => {
        const bindings = tokenBindings(scene, formula, token.id);
        const objectIds = boundObjectIds(scene, bindings);
        const active =
          activeIds.length > 0 &&
          activeIds.some((activeId) =>
            token.conceptId === activeId ||
            token.id === activeId ||
            bindings.some((binding) =>
              binding.conceptId === activeId ||
              binding.objectId === activeId ||
              binding.tokenId === activeId
            )
          );
        const isolation = isolationByTokenId[token.id];
        const colorRole = isolation?.isolated ? isolation.colorRole : colorRoleForBindings(scene, bindings);

        if (objectIds.length === 0) {
          unboundTokenIds.push(token.id);
        }

        if (active) {
          activeObjectIds.push(...objectIds);
          objectIds.forEach((objectId) => {
            activeObjectAnchorNames[objectId] ??= activeAnchorNameForObject(bindings, objectId);
          });
        }

        tokenColorMap[token.id] = colorRole;

        return {
          active,
          ariaLabel: `${token.text} maps to ${token.conceptId}`,
          boundObjectIds: objectIds,
          colorRole,
          conceptId: token.conceptId,
          formulaId: formula.id,
          id: token.id,
          index,
          texIsolated: Boolean(isolation?.isolated),
          texIsolationMatchedText: isolation?.matchedText ?? token.text,
          texIsolationOccurrence: isolation?.occurrence ?? 0,
          texIsolationSelector: isolation?.selector,
          text: token.text
        };
      })
    };
  });

  return {
    activeConceptId,
    activeObjectAnchorNames,
    activeObjectIds: unique(activeObjectIds),
    formulas,
    screenFixed: true,
    sourceContract: FORMULA_LAYER_SOURCE_CONTRACT,
    tokenColorMap,
    texIsolationCacheKeys,
    texIsolationUnmatchedSelectors: unique(texIsolationUnmatchedSelectors),
    svgPathMorphCacheKeys,
    svgPathMorphCount,
    svgPathMorphIssues: unique(svgPathMorphIssues),
    unboundTokenIds: unique(unboundTokenIds)
  };
}

export function buildActiveProjectedLabelTextByObjectId(layer: FormulaLayerState): Record<string, string> {
  return layer.formulas.reduce<Record<string, string>>((labels, formulaEntry) => {
    formulaEntry.tokens.forEach((token) => {
      if (!token.active) return;

      token.boundObjectIds.forEach((objectId) => {
        labels[objectId] = labels[objectId] ? `${labels[objectId]} + ${token.text}` : token.text;
      });
    });

    return labels;
  }, {});
}

export function summarizeActiveProjectedLabelText(layer: FormulaLayerState): FormulaLayerProjectedLabelTextSummary {
  const textByObjectId = buildActiveProjectedLabelTextByObjectId(layer);
  const entries = Object.entries(textByObjectId).sort(([left], [right]) => left.localeCompare(right));
  const objectIds = entries.map(([objectId]) => objectId).join(",") || "none";
  const textSummary = entries.map(([objectId, text]) => `${objectId}=${text}`).join("|") || "none";

  return {
    objectCount: entries.length,
    objectIds,
    policy: FORMULA_LAYER_PROJECTED_LABEL_TEXT_POLICY,
    source: "formula-token",
    sourceContract: FORMULA_LAYER_SOURCE_CONTRACT,
    summary: [
      `projectedLabelText=${entries.length}`,
      `source=formula-token`,
      `objects=${objectIds}`,
      `labels=${textSummary}`
    ].join(":"),
    textSummary
  };
}

export function summarizeFormulaLayerActiveTokens(layer: FormulaLayerState): FormulaLayerActiveTokenSummary {
  const activeTokens = layer.formulas.flatMap((formula) => formula.tokens.filter((token) => token.active));
  const activeTokenIds = activeTokens.map((token) => token.id).join(",") || "none";
  const activeObjectIds = unique(activeTokens.flatMap((token) => token.boundObjectIds)).join(",") || "none";

  return {
    activeObjectIds,
    activeTokenCount: activeTokens.length,
    activeTokenIds,
    sourceContract: FORMULA_LAYER_SOURCE_CONTRACT,
    summary: `activeFormulaTokens=${activeTokens.length}:ids=${activeTokenIds}:objects=${activeObjectIds}`
  };
}

export function formulaLayerActiveTokenDataAttributes(summary: FormulaLayerActiveTokenSummary) {
  return {
    "data-viz-manim-active-token-count": String(summary.activeTokenCount),
    "data-viz-manim-active-token-ids": summary.activeTokenIds,
    "data-viz-manim-active-token-object-ids": summary.activeObjectIds,
    "data-viz-manim-active-token-source-contract": summary.sourceContract,
    "data-viz-manim-active-token-summary": summary.summary
  } as const;
}

export function emptyFormulaLayerProjectedLabelTextSummary(): FormulaLayerProjectedLabelTextSummary {
  return {
    objectCount: 0,
    objectIds: "none",
    policy: FORMULA_LAYER_PROJECTED_LABEL_TEXT_POLICY,
    source: "formula-token",
    sourceContract: FORMULA_LAYER_SOURCE_CONTRACT,
    summary: "projectedLabelText=0:source=formula-token:objects=none:labels=none",
    textSummary: "none"
  };
}

export function formulaLayerProjectedLabelTextDataAttributes(
  summary: FormulaLayerProjectedLabelTextSummary
): Record<string, string> {
  return {
    "data-viz-manim-projected-label-text-object-count": String(summary.objectCount),
    "data-viz-manim-projected-label-text-object-ids": summary.objectIds,
    "data-viz-manim-projected-label-text-policy": summary.policy,
    "data-viz-manim-projected-label-text-source": summary.source,
    "data-viz-manim-projected-label-text-source-contract": summary.sourceContract,
    "data-viz-manim-projected-label-text-summary": summary.summary,
    "data-viz-manim-projected-label-text-token-summary": summary.textSummary
  };
}
