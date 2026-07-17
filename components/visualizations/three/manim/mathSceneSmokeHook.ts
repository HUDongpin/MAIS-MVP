import type { ApprovedSceneSpecExport } from "./mathSceneExport";
import type { MathSceneStateSnapshot } from "./mathSceneStateSnapshot";
import type { MathSceneSpec } from "./mathSceneTypes";
import {
  threeDCanvasRequiredDataAttributes,
  threeDCanvasRequiredSelectors
} from "../threeDCanvasSurfaceContract";

export const SCENE_SMOKE_HOOK_SOURCE_CONTRACT =
  "InteractiveSceneEmbed->EvidenceHarness|Playwright smoke hook selector manifest";

export type MathSceneSmokeHookManifest = {
  attributeCount: number;
  convertedSelectorCount: number;
  convertedSelectors: string[];
  cssSelectors: string[];
  dataAttributes: string[];
  familyId: MathSceneSpec["familyId"];
  hookVersion: "mais-manim-smoke-hook/v1";
  jsonPayloadSelectors: string[];
  requiredCameraShotCount: number;
  requiredFormulaTokenCount: number;
  requiredObjectCount: number;
  requiredSemanticBindingCount: number;
  runtime: "mais-manim";
  sceneId: string;
  sceneSignature: string;
  selectorConversionSummary: string;
  selectorCount: number;
  signature: string;
  sourceContract: typeof SCENE_SMOKE_HOOK_SOURCE_CONTRACT;
  snapshotSignature: string;
  summary: string;
};

export type MathSceneSmokeHookManifestInput = {
  scene: MathSceneSpec;
  sceneExport: ApprovedSceneSpecExport;
  stateSnapshot: MathSceneStateSnapshot;
};

const smokeHookRuntimeOnlySelectors = [
  "[data-viz-surface][data-viz-runtime=\"mais-manim\"]"
] as const;

const smokeHookDataAttributes = threeDCanvasRequiredDataAttributes;

const smokeHookSelectorConversions = [
  {
    cssSelector: "[data-viz-name=\"three-d-r3f-surface\"]",
    sourceSelector: "three-d-r3f-surface",
    summary: "three-d-r3f-surface=>data-viz-name"
  }
] as const;

function canvasRequiredSelectorToCssSelector(selector: (typeof threeDCanvasRequiredSelectors)[number]) {
  const conversion = smokeHookSelectorConversions.find((entry) => entry.sourceSelector === selector);

  return conversion ? conversion.cssSelector : `[${selector}]`;
}

const smokeHookSelectors = [
  ...smokeHookRuntimeOnlySelectors,
  ...threeDCanvasRequiredSelectors.map(canvasRequiredSelectorToCssSelector)
] as const;

const smokeHookJsonPayloadSelectors = threeDCanvasRequiredSelectors
  .filter((selector) => selector.endsWith("-json"))
  .map(canvasRequiredSelectorToCssSelector);

const smokeHookConvertedSelectors = smokeHookSelectorConversions
  .filter((conversion) => threeDCanvasRequiredSelectors.includes(conversion.sourceSelector))
  .map((conversion) => `${conversion.sourceSelector}=>${conversion.cssSelector}`);

const smokeHookSelectorConversionParts = smokeHookSelectorConversions
  .filter((conversion) => threeDCanvasRequiredSelectors.includes(conversion.sourceSelector))
  .map((conversion) => conversion.summary)
  .join("|");
const smokeHookSelectorConversionSummary = smokeHookSelectorConversionParts
  ? `converted=${smokeHookConvertedSelectors.length}:${smokeHookSelectorConversionParts}`
  : "converted=0:none";

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

function hashStableJson(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `smoke-${hash.toString(16).padStart(8, "0")}`;
}

function formulaTokenCount(scene: MathSceneSpec) {
  return scene.formulas.reduce((sum, formula) => sum + formula.tokens.length, 0);
}

function summarizeSmokeHook(sceneId: string, selectorCount: number, attributeCount: number, payloadCount: number) {
  return `smoke:${sceneId}:selectors=${selectorCount}:attributes=${attributeCount}:payloads=${payloadCount}`;
}

export function buildMathSceneSmokeHookManifest({
  scene,
  sceneExport,
  stateSnapshot
}: MathSceneSmokeHookManifestInput): MathSceneSmokeHookManifest {
  const cssSelectors = [...smokeHookSelectors];
  const convertedSelectors = [...smokeHookConvertedSelectors];
  const dataAttributes = [...smokeHookDataAttributes];
  const jsonPayloadSelectors = [...smokeHookJsonPayloadSelectors];
  const convertedSelectorCount = convertedSelectors.length;
  const selectorCount = cssSelectors.length;
  const attributeCount = dataAttributes.length;
  const summary = summarizeSmokeHook(scene.sceneId, selectorCount, attributeCount, jsonPayloadSelectors.length);
  const signature = hashStableJson(stableSerialize({
    attributeCount,
    convertedSelectorCount,
    convertedSelectors,
    dataAttributes,
    cssSelectors,
    familyId: scene.familyId,
    jsonPayloadSelectors,
    sceneId: scene.sceneId,
    sceneSignature: sceneExport.signature,
    selectorConversionSummary: smokeHookSelectorConversionSummary,
    sourceContract: SCENE_SMOKE_HOOK_SOURCE_CONTRACT,
    snapshotSignature: stateSnapshot.signature
  }));

  return {
    attributeCount,
    convertedSelectorCount,
    convertedSelectors,
    cssSelectors,
    dataAttributes,
    familyId: scene.familyId,
    hookVersion: "mais-manim-smoke-hook/v1",
    jsonPayloadSelectors,
    requiredCameraShotCount: scene.cameraShots.length,
    requiredFormulaTokenCount: formulaTokenCount(scene),
    requiredObjectCount: scene.objects.length,
    requiredSemanticBindingCount: scene.bindings.length,
    runtime: "mais-manim",
    sceneId: scene.sceneId,
    sceneSignature: sceneExport.signature,
    selectorConversionSummary: smokeHookSelectorConversionSummary,
    selectorCount,
    signature,
    sourceContract: SCENE_SMOKE_HOOK_SOURCE_CONTRACT,
    snapshotSignature: stateSnapshot.signature,
    summary
  };
}

export function sceneSmokeHookDataAttributes(manifest: MathSceneSmokeHookManifest) {
  return {
    "data-viz-manim-smoke-hook-attribute-count": String(manifest.attributeCount),
    "data-viz-manim-smoke-hook-converted-selector-count": String(manifest.convertedSelectorCount),
    "data-viz-manim-smoke-hook-json-payload-count": String(manifest.jsonPayloadSelectors.length),
    "data-viz-manim-smoke-hook-ready": "true",
    "data-viz-manim-smoke-hook-scene-id": manifest.sceneId,
    "data-viz-manim-smoke-hook-selector-count": String(manifest.selectorCount),
    "data-viz-manim-smoke-hook-selector-conversion-summary": manifest.selectorConversionSummary,
    "data-viz-manim-smoke-hook-signature": manifest.signature,
    "data-viz-manim-smoke-hook-source-contract": manifest.sourceContract,
    "data-viz-manim-smoke-hook-summary": manifest.summary
  } as const;
}

export function serializeMathSceneSmokeHookManifest(manifest: MathSceneSmokeHookManifest) {
  return stableSerialize(manifest);
}
