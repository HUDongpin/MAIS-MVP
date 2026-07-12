import type { FormulaBinding, MathMobjectAnchorName, MathObjectSpec, MathSceneSpec } from "./mathSceneTypes";

export const FORMULA_BINDING_ANCHOR_SOURCE_CONTRACT =
  "FormulaBinding anchors: bound formula tokens use object-aware mobject anchors for projected label placement" as const;

export type FormulaBindingAnchorSummary = {
  anchoredBindingCount: number;
  missingAnchorCount: number;
  missingAnchorTokenIds: string;
  sourceContract: typeof FORMULA_BINDING_ANCHOR_SOURCE_CONTRACT;
};

function hasColorRole(object: MathObjectSpec): object is MathObjectSpec & { colorRole: string } {
  return "colorRole" in object;
}

function colorRoleForObject(object: MathObjectSpec | undefined) {
  return object && hasColorRole(object) ? object.colorRole : "";
}

export function formulaBindingAnchorForObject(object: MathObjectSpec | undefined): MathMobjectAnchorName {
  if (!object) return "center";
  if (object.type === "axis3d") return "center";
  if (object.type === "movingPoint") return "top";
  if (object.type === "trace") return "lowerRight";
  if (object.type === "vector") return "upperRight";
  if (object.type === "parametricSurface") return "upperRight";

  const colorRole = colorRoleForObject(object);
  if (object.type === "parametricCurve" && colorRole === "trace") return "upperLeft";
  if (object.type === "parametricCurve") return "upperRight";

  return "center";
}

function objectById(scene: MathSceneSpec) {
  return new Map(scene.objects.map((object) => [object.id, object]));
}

function withBindingAnchor(binding: FormulaBinding, object: MathObjectSpec | undefined): FormulaBinding {
  if (binding.anchorName) return { ...binding };
  return {
    ...binding,
    anchorName: formulaBindingAnchorForObject(object)
  };
}

export function assignFormulaBindingAnchors(scene: MathSceneSpec): MathSceneSpec {
  const objects = objectById(scene);

  return {
    ...scene,
    bindings: scene.bindings.map((binding) => withBindingAnchor(binding, objects.get(binding.objectId)))
  };
}

export function summarizeFormulaBindingAnchors(scene: MathSceneSpec): FormulaBindingAnchorSummary {
  const missing = scene.bindings.filter((binding) => !binding.anchorName);

  return {
    anchoredBindingCount: scene.bindings.length - missing.length,
    missingAnchorCount: missing.length,
    missingAnchorTokenIds: missing.map((binding) => binding.tokenId).join(",") || "none",
    sourceContract: FORMULA_BINDING_ANCHOR_SOURCE_CONTRACT
  };
}
