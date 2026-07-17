import type { MathSceneSpec } from "./mathSceneTypes";

export const SCENE_EXPORT_SOURCE_CONTRACT =
  "SceneSpec export: stable JSON scene spec, approval contract, deterministic signature, and runtime artifact" as const;

export type ApprovedSceneSpecExport = {
  approvedForRuntime: boolean;
  cameraShotCount: number;
  exportVersion: "mais-manim-scene-spec/v1";
  familyId: MathSceneSpec["familyId"];
  formulaTokenCount: number;
  json: string;
  objectCount: number;
  sceneId: string;
  semanticBindingCount: number;
  sourceContract: typeof SCENE_EXPORT_SOURCE_CONTRACT;
  signature: string;
  timelineStepCount: number;
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

function hashStableJson(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `fnv1a-${hash.toString(16).padStart(8, "0")}`;
}

function formulaTokenCount(scene: MathSceneSpec) {
  return scene.formulas.reduce((sum, formula) => sum + formula.tokens.length, 0);
}

export function stableSerializeMathSceneSpec(scene: MathSceneSpec) {
  return JSON.stringify(stableValue(scene))
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function buildApprovedSceneSpecExport(scene: MathSceneSpec): ApprovedSceneSpecExport {
  const json = stableSerializeMathSceneSpec(scene);
  const objectCount = scene.objects.length;
  const tokenCount = formulaTokenCount(scene);
  const bindingCount = scene.bindings.length;

  return {
    approvedForRuntime:
      objectCount > 0 &&
      scene.timeline.length > 0 &&
      scene.cameraShots.length > 0 &&
      objectCount === scene.diagnostics.expectedObjectCount &&
      tokenCount === scene.diagnostics.expectedTokenCount &&
      bindingCount === scene.diagnostics.expectedBindingCount,
    cameraShotCount: scene.cameraShots.length,
    exportVersion: "mais-manim-scene-spec/v1",
    familyId: scene.familyId,
    formulaTokenCount: tokenCount,
    json,
    objectCount,
    sceneId: scene.sceneId,
    semanticBindingCount: bindingCount,
    sourceContract: SCENE_EXPORT_SOURCE_CONTRACT,
    signature: hashStableJson(json),
    timelineStepCount: scene.timeline.length
  };
}

export function sceneSpecExportDataAttributes(exportPlan: ApprovedSceneSpecExport) {
  return {
    "data-viz-manim-scene-export-beat-count": String(exportPlan.timelineStepCount),
    "data-viz-manim-scene-export-formula-token-count": String(exportPlan.formulaTokenCount),
    "data-viz-manim-scene-export-object-count": String(exportPlan.objectCount),
    "data-viz-manim-scene-export-ready": exportPlan.approvedForRuntime ? "true" : "false",
    "data-viz-manim-scene-export-semantic-binding-count": String(exportPlan.semanticBindingCount),
    "data-viz-manim-scene-export-source-contract": exportPlan.sourceContract,
    "data-viz-manim-scene-export-signature": exportPlan.signature
  } as const;
}
