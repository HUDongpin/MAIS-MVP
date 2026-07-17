import { buildApprovedSceneSpecExport } from "./mathSceneExport";
import { timelineFocusTargetIds } from "./mathTimeline";
import type { MathSceneSpec } from "./mathSceneTypes";

export const MATH_SCENE_TEACHING_QUALITY_SOURCE_CONTRACT =
  "A18/A06 teaching-quality precheck: scene spec exposes visible math objects, formula bindings, focused beats, camera shots, and controllable parameters" as const;

export type MathSceneTeachingQualityConcern =
  | "runtime-export-approval"
  | "visible-math-objects"
  | "formula-tokens"
  | "semantic-formula-bindings"
  | "focused-timeline-beats"
  | "camera-shots"
  | "controlled-parameters"
  | "diagnostic-counts";

export type MathSceneTeachingQualityStatus = "ready-for-a18-review" | "needs-a18-followup";

export type MathSceneTeachingQualityEvidence = {
  cameraShotCount: number;
  conceptObjectCount: number;
  controlParameterCount: number;
  derivedParameterCount: number;
  diagnosticCountsMatch: boolean;
  familyId: MathSceneSpec["familyId"];
  focusedBeatCount: number;
  formulaCount: number;
  formulaTokenCount: number;
  invalidBindingCount: number;
  missingTeachingEvidence: MathSceneTeachingQualityConcern[];
  nonWaitFocusedBeatCount: number;
  objectCount: number;
  readyForA18Review: boolean;
  runtimeApproved: boolean;
  sceneId: string;
  semanticBindingCount: number;
  sourceContract: typeof MATH_SCENE_TEACHING_QUALITY_SOURCE_CONTRACT;
  status: MathSceneTeachingQualityStatus;
  summary: string;
  timelineBeatCount: number;
};

function formulaTokenIds(scene: MathSceneSpec) {
  return new Set(scene.formulas.flatMap((formula) => formula.tokens.map((token) => token.id)));
}

function objectIds(scene: MathSceneSpec) {
  return new Set(scene.objects.map((object) => object.id));
}

function formulaTokenCount(scene: MathSceneSpec) {
  return scene.formulas.reduce((sum, formula) => sum + formula.tokens.length, 0);
}

function conceptObjectCount(scene: MathSceneSpec) {
  return scene.objects.filter((object) => "conceptId" in object && Boolean(object.conceptId)).length;
}

function focusedBeatCount(scene: MathSceneSpec) {
  return scene.timeline.filter((step) => timelineFocusTargetIds(step).length > 0).length;
}

function nonWaitFocusedBeatCount(scene: MathSceneSpec) {
  return scene.timeline.filter((step) => step.type !== "wait" && timelineFocusTargetIds(step).length > 0).length;
}

function diagnosticCountsMatch(scene: MathSceneSpec, tokenCount: number) {
  return (
    scene.objects.length === scene.diagnostics.expectedObjectCount &&
    tokenCount === scene.diagnostics.expectedTokenCount &&
    scene.bindings.length === scene.diagnostics.expectedBindingCount
  );
}

function invalidBindingCount(scene: MathSceneSpec) {
  const tokens = formulaTokenIds(scene);
  const objects = objectIds(scene);

  return scene.bindings.filter((binding) => !tokens.has(binding.tokenId) || !objects.has(binding.objectId)).length;
}

function controlParameterCount(scene: MathSceneSpec) {
  return (scene.parameters ?? []).filter((parameter) => parameter.role === "control").length;
}

function derivedParameterCount(scene: MathSceneSpec) {
  return (scene.parameters ?? []).filter((parameter) => parameter.role === "derived").length;
}

function missingTeachingEvidence({
  conceptObjects,
  controlParameters,
  diagnosticsMatch,
  focusedBeats,
  invalidBindings,
  nonWaitFocusedBeats,
  scene,
  tokenCount,
  runtimeApproved
}: {
  conceptObjects: number;
  controlParameters: number;
  diagnosticsMatch: boolean;
  focusedBeats: number;
  invalidBindings: number;
  nonWaitFocusedBeats: number;
  runtimeApproved: boolean;
  scene: MathSceneSpec;
  tokenCount: number;
}): MathSceneTeachingQualityConcern[] {
  const missing: MathSceneTeachingQualityConcern[] = [];

  if (!runtimeApproved) missing.push("runtime-export-approval");
  if (scene.objects.length === 0 || conceptObjects === 0) missing.push("visible-math-objects");
  if (scene.formulas.length === 0 || tokenCount === 0) missing.push("formula-tokens");
  if (scene.bindings.length === 0 || invalidBindings > 0) missing.push("semantic-formula-bindings");
  if (scene.timeline.length === 0 || focusedBeats === 0 || nonWaitFocusedBeats === 0) missing.push("focused-timeline-beats");
  if (scene.cameraShots.length === 0) missing.push("camera-shots");
  if (controlParameters === 0) missing.push("controlled-parameters");
  if (!diagnosticsMatch) missing.push("diagnostic-counts");

  return missing;
}

export function buildMathSceneTeachingQualityEvidence(scene: MathSceneSpec): MathSceneTeachingQualityEvidence {
  const exportPlan = buildApprovedSceneSpecExport(scene);
  const tokenCount = formulaTokenCount(scene);
  const conceptObjects = conceptObjectCount(scene);
  const controls = controlParameterCount(scene);
  const derived = derivedParameterCount(scene);
  const focusedBeats = focusedBeatCount(scene);
  const nonWaitBeats = nonWaitFocusedBeatCount(scene);
  const diagnosticsMatch = diagnosticCountsMatch(scene, tokenCount);
  const invalidBindings = invalidBindingCount(scene);
  const missing = missingTeachingEvidence({
    conceptObjects,
    controlParameters: controls,
    diagnosticsMatch,
    focusedBeats,
    invalidBindings,
    nonWaitFocusedBeats: nonWaitBeats,
    runtimeApproved: exportPlan.approvedForRuntime,
    scene,
    tokenCount
  });
  const readyForA18Review = missing.length === 0;

  return {
    cameraShotCount: scene.cameraShots.length,
    conceptObjectCount: conceptObjects,
    controlParameterCount: controls,
    derivedParameterCount: derived,
    diagnosticCountsMatch: diagnosticsMatch,
    familyId: scene.familyId,
    focusedBeatCount: focusedBeats,
    formulaCount: scene.formulas.length,
    formulaTokenCount: tokenCount,
    invalidBindingCount: invalidBindings,
    missingTeachingEvidence: missing,
    nonWaitFocusedBeatCount: nonWaitBeats,
    objectCount: scene.objects.length,
    readyForA18Review,
    runtimeApproved: exportPlan.approvedForRuntime,
    sceneId: scene.sceneId,
    semanticBindingCount: scene.bindings.length,
    sourceContract: MATH_SCENE_TEACHING_QUALITY_SOURCE_CONTRACT,
    status: readyForA18Review ? "ready-for-a18-review" : "needs-a18-followup",
    summary: [
      `teachingQuality:${scene.sceneId}`,
      `ready=${readyForA18Review ? "true" : "false"}`,
      `objects=${scene.objects.length}`,
      `conceptObjects=${conceptObjects}`,
      `tokens=${tokenCount}`,
      `bindings=${scene.bindings.length}`,
      `beats=${scene.timeline.length}`,
      `focused=${focusedBeats}`,
      `camera=${scene.cameraShots.length}`,
      `controls=${controls}`
    ].join(":"),
    timelineBeatCount: scene.timeline.length
  };
}

export function buildMathSceneTeachingQualityMatrix(scenes: MathSceneSpec[]): MathSceneTeachingQualityEvidence[] {
  return scenes.map((scene) => buildMathSceneTeachingQualityEvidence(scene));
}

export function mathSceneTeachingQualityDataAttributes(evidence: MathSceneTeachingQualityEvidence) {
  return {
    "data-viz-manim-teaching-quality-camera-count": String(evidence.cameraShotCount),
    "data-viz-manim-teaching-quality-control-count": String(evidence.controlParameterCount),
    "data-viz-manim-teaching-quality-focused-beat-count": String(evidence.focusedBeatCount),
    "data-viz-manim-teaching-quality-missing": evidence.missingTeachingEvidence.join(",") || "none",
    "data-viz-manim-teaching-quality-ready": evidence.readyForA18Review ? "true" : "false",
    "data-viz-manim-teaching-quality-source-contract": evidence.sourceContract,
    "data-viz-manim-teaching-quality-status": evidence.status,
    "data-viz-manim-teaching-quality-summary": evidence.summary
  } as const;
}
