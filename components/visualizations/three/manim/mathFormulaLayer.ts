import type { FormulaBinding, FormulaSpec, MathObjectSpec, MathSceneSpec } from "./mathSceneTypes";

export type FormulaLayerTokenState = {
  active: boolean;
  ariaLabel: string;
  boundObjectIds: string[];
  colorRole: string;
  conceptId: string;
  formulaId: string;
  id: string;
  index: number;
  text: string;
};

export type FormulaLayerFormulaState = {
  id: string;
  latex: string;
  tokens: FormulaLayerTokenState[];
};

export type FormulaLayerState = {
  activeConceptId: string;
  activeObjectIds: string[];
  formulas: FormulaLayerFormulaState[];
  screenFixed: boolean;
  tokenColorMap: Record<string, string>;
  unboundTokenIds: string[];
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

export function buildFormulaLayerState(scene: MathSceneSpec, options: { activeConceptId?: string } = {}): FormulaLayerState {
  const activeConceptId = options.activeConceptId ?? "";
  const tokenColorMap: Record<string, string> = {};
  const unboundTokenIds: string[] = [];
  const activeObjectIds: string[] = [];

  const formulas = scene.formulas.map((formula) => ({
    id: formula.id,
    latex: formula.latex,
    tokens: formula.tokens.map((token, index) => {
      const bindings = tokenBindings(scene, formula, token.id);
      const objectIds = boundObjectIds(scene, bindings);
      const active = activeConceptId !== "" && (token.conceptId === activeConceptId || bindings.some((binding) => binding.conceptId === activeConceptId));
      const colorRole = colorRoleForBindings(scene, bindings);

      if (objectIds.length === 0) {
        unboundTokenIds.push(token.id);
      }

      if (active) {
        activeObjectIds.push(...objectIds);
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
        text: token.text
      };
    })
  }));

  return {
    activeConceptId,
    activeObjectIds: unique(activeObjectIds),
    formulas,
    screenFixed: true,
    tokenColorMap,
    unboundTokenIds: unique(unboundTokenIds)
  };
}
