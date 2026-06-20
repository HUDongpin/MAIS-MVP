import type { FormulaBinding, MathObjectSpec, MathSceneSpec } from "./mathSceneTypes";

function formulaTokenIds(scene: MathSceneSpec, formulaId: string) {
  return new Set(scene.formulas.find((formula) => formula.id === formulaId)?.tokens.map((token) => token.id) ?? []);
}

function hasConceptId(object: MathObjectSpec): object is MathObjectSpec & { conceptId?: string } {
  return "conceptId" in object;
}

function objectConcept(scene: MathSceneSpec, objectId: string) {
  const object = scene.objects.find((entry) => entry.id === objectId);

  return object && hasConceptId(object) ? object.conceptId : undefined;
}

function validateBinding(scene: MathSceneSpec, binding: FormulaBinding) {
  const issues: string[] = [];
  const objectIds = new Set(scene.objects.map((object) => object.id));
  const formulaIds = new Set(scene.formulas.map((formula) => formula.id));

  if (!objectIds.has(binding.objectId)) {
    issues.push(`binding ${binding.conceptId} references unknown object ${binding.objectId}`);
  }

  if (!formulaIds.has(binding.formulaId)) {
    issues.push(`binding ${binding.conceptId} references unknown formula ${binding.formulaId}`);
  } else if (!formulaTokenIds(scene, binding.formulaId).has(binding.tokenId)) {
    issues.push(`binding ${binding.conceptId} references unknown token ${binding.tokenId} in formula ${binding.formulaId}`);
  }

  if (objectConcept(scene, binding.objectId) !== binding.conceptId) {
    issues.push(`binding ${binding.conceptId} conceptId is not represented by object ${binding.objectId}`);
  }

  return issues;
}

export function validateFormulaBindings(scene: MathSceneSpec) {
  return scene.bindings.flatMap((binding) => validateBinding(scene, binding));
}

export function summarizeFormulaBindings(scene: MathSceneSpec) {
  return {
    bindingCount: scene.bindings.length,
    objectCount: scene.objects.length,
    tokenCount: scene.formulas.reduce((sum, formula) => sum + formula.tokens.length, 0)
  };
}
