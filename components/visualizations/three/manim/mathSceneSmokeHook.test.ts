import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildApprovedSceneSpecExport, type ApprovedSceneSpecExport } from "./mathSceneExport";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import {
  buildMathSceneStateSnapshot,
  type MathSceneStateSnapshot
} from "./mathSceneStateSnapshot";
import type { MathSceneSpec } from "./mathSceneTypes";
import {
  threeDCanvasRequiredDataAttributes,
  threeDCanvasRequiredSelectors
} from "../threeDCanvasSurfaceContract";

const expectedSmokeHookSourceContract =
  "InteractiveSceneEmbed->EvidenceHarness|Playwright smoke hook selector manifest" as const;

type MathSceneSmokeHookManifest = {
  attributeCount: number;
  convertedSelectorCount: number;
  convertedSelectors: string[];
  cssSelectors: string[];
  dataAttributes: string[];
  familyId: string;
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
  sourceContract: typeof expectedSmokeHookSourceContract;
  snapshotSignature: string;
  summary: string;
};

type MathSceneSmokeHookModule = {
  SCENE_SMOKE_HOOK_SOURCE_CONTRACT: typeof expectedSmokeHookSourceContract;
  buildMathSceneSmokeHookManifest: (input: {
    scene: MathSceneSpec;
    sceneExport: ApprovedSceneSpecExport;
    stateSnapshot: MathSceneStateSnapshot;
  }) => MathSceneSmokeHookManifest;
  sceneSmokeHookDataAttributes: (manifest: MathSceneSmokeHookManifest) => Record<string, string>;
  serializeMathSceneSmokeHookManifest: (manifest: MathSceneSmokeHookManifest) => string;
};

const smokeHookModulePath = "components/visualizations/three/manim/mathSceneSmokeHook.ts";

function canvasRequiredSelectorToCssSelector(selector: (typeof threeDCanvasRequiredSelectors)[number]) {
  return selector === "three-d-r3f-surface" ? "[data-viz-name=\"three-d-r3f-surface\"]" : `[${selector}]`;
}

function requiredJsonPayloadSelectorsFromCanvasContract() {
  return threeDCanvasRequiredSelectors
    .filter((selector) => selector.endsWith("-json"))
    .map(canvasRequiredSelectorToCssSelector);
}

function requiredCssSelectorsFromCanvasContract() {
  return threeDCanvasRequiredSelectors.map(canvasRequiredSelectorToCssSelector);
}

function buildFunctionGraphSpec() {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#22d3ee",
    state: {
      comparison: 5,
      depthValue: 1.4,
      familyId: "three-function-graph",
      mode: 0,
      primaryValue: 6,
      secondaryValue: 5,
      stateSummary: "family=three-function-graph;template=function-graph;value=6.000;comparison=5.000;depth=1.400",
      templateId: "function-graph",
      value: 6
    }
  });

  if (!spec) throw new Error("expected function graph MAIS Manim spec");
  return spec;
}

function buildSnapshot(scene: MathSceneSpec, sceneExport: ApprovedSceneSpecExport) {
  return buildMathSceneStateSnapshot({
    activeStep: "highlight:function",
    authoringMode: "playback",
    cameraMode: "guided",
    cameraShotId: "overview",
    checkpointKeys: ["intro"],
    elapsedSeconds: 1,
    frameIndex: 7,
    historySummary: {
      canRedo: false,
      canUndo: false,
      currentLabel: "initial",
      droppedUndoCount: 0,
      maxUndoEntries: 50,
      redoCount: 0,
      revision: 0,
      undoCount: 0
    },
    playbackState: "playing",
    scene,
    sceneSignature: sceneExport.signature,
    selectedFamilyId: scene.familyId,
    selectedParameterId: "value",
    selectedSceneId: scene.sceneId
  });
}

async function importSmokeHookModule() {
  assert.ok(fs.existsSync(smokeHookModulePath), "MAIS Manim should provide a pure Playwright smoke-hook manifest module");
  return (await import("./mathSceneSmokeHook")) as MathSceneSmokeHookModule;
}

test("builds a deterministic Playwright smoke-hook manifest from scene export and state snapshot", async () => {
  const {
    SCENE_SMOKE_HOOK_SOURCE_CONTRACT,
    buildMathSceneSmokeHookManifest,
    serializeMathSceneSmokeHookManifest
  } = await importSmokeHookModule();
  const scene = buildFunctionGraphSpec();
  const sceneExport = buildApprovedSceneSpecExport(scene);
  const stateSnapshot = buildSnapshot(scene, sceneExport);
  const manifest = buildMathSceneSmokeHookManifest({ scene, sceneExport, stateSnapshot });

  assert.equal(SCENE_SMOKE_HOOK_SOURCE_CONTRACT, expectedSmokeHookSourceContract);
  assert.equal(manifest.sourceContract, SCENE_SMOKE_HOOK_SOURCE_CONTRACT);
  assert.equal(manifest.hookVersion, "mais-manim-smoke-hook/v1");
  assert.equal(manifest.runtime, "mais-manim");
  assert.equal(manifest.sceneId, scene.sceneId);
  assert.equal(manifest.familyId, scene.familyId);
  assert.equal(manifest.sceneSignature, sceneExport.signature);
  assert.equal(manifest.snapshotSignature, stateSnapshot.signature);
  assert.equal(manifest.requiredObjectCount, scene.objects.length);
  assert.equal(manifest.requiredFormulaTokenCount, scene.formulas.reduce((sum, formula) => sum + formula.tokens.length, 0));
  assert.equal(manifest.requiredSemanticBindingCount, scene.bindings.length);
  assert.equal(manifest.requiredCameraShotCount, scene.cameraShots.length);
  assert.equal(manifest.convertedSelectorCount, 1);
  assert.deepEqual(manifest.convertedSelectors, ["three-d-r3f-surface=>[data-viz-name=\"three-d-r3f-surface\"]"]);
  assert.equal(manifest.selectorConversionSummary, "converted=1:three-d-r3f-surface=>data-viz-name");
  assert.match(manifest.signature, /^smoke-[0-9a-f]{8}$/);
  assert.equal(
    manifest.summary,
    `smoke:${scene.sceneId}:selectors=${manifest.selectorCount}:attributes=${manifest.attributeCount}:payloads=${manifest.jsonPayloadSelectors.length}`
  );

  for (const selector of [
    "[data-viz-surface][data-viz-runtime=\"mais-manim\"]",
    "[data-viz-name]",
    "[data-viz-name=\"three-d-r3f-surface\"]",
    "[data-viz-manim-mark]",
    "[data-viz-three-formula]",
    "[data-viz-manim-formula-token]",
    "[data-viz-manim-scene-export-json]",
    "[data-viz-manim-state-snapshot-json]"
  ]) {
    assert.ok(manifest.cssSelectors.includes(selector), `${selector} should be smoke-checkable`);
  }

  for (const attribute of [
    "data-viz-runtime",
    "data-viz-family-id",
    "data-viz-scene-id",
    "data-viz-object-count",
    "data-viz-formula-token-count",
    "data-viz-semantic-binding-count",
    "data-viz-manim-scene-export-ready",
    "data-viz-manim-smoke-hook-source-contract",
    "data-viz-manim-state-snapshot-ready"
  ]) {
    assert.ok(manifest.dataAttributes.includes(attribute), `${attribute} should be captured in the manifest`);
  }

  for (const attribute of [
    "data-viz-concept-id",
    "data-viz-parameter-tracker-values",
    "data-viz-formula-token-ids",
    "data-viz-camera-state",
    "data-viz-mark-count",
    "data-viz-reduced-motion",
    "data-viz-semantic-binding-concept-ids",
    "data-viz-manim-fade-grow-opacity-schedule",
    "data-viz-manim-fade-grow-scale-schedule",
    "data-viz-manim-fade-grow-summary"
  ]) {
    assert.ok(
      manifest.dataAttributes.includes(attribute),
      `${attribute} should satisfy the MAIS Manim implementation-rule smoke hook`
    );
  }

  assert.deepEqual(manifest.jsonPayloadSelectors, [
    "[data-viz-manim-capture-plan-json]",
    "[data-viz-manim-render-quality-json]",
    "[data-viz-manim-renderer-bridge-json]",
    "[data-viz-manim-file-writer-json]",
    "[data-viz-manim-file-writer-segment-json]",
    "[data-viz-manim-playback-file-writer-bridge-json]",
    "[data-viz-manim-file-writer-combine-json]",
    "[data-viz-manim-checkpoint-file-writer-bridge-json]",
    "[data-viz-manim-sound-cue-json]",
    "[data-viz-manim-frame-audit-json]",
    "[data-viz-scene-graph-json]",
    "[data-viz-manim-runtime-graph-json]",
    "[data-viz-manim-render-batch-json]",
    "[data-viz-scene-membership-json]",
    "[data-viz-scene-restructure-json]",
    "[data-viz-scene-clear-mobject-json]",
    "[data-viz-scene-remove-all-except-mobject-json]",
    "[data-viz-scene-bring-to-front-mobject-json]",
    "[data-viz-scene-send-to-back-mobject-json]",
    "[data-viz-scene-add-mobject-json]",
    "[data-viz-scene-replace-mobject-json]",
    "[data-viz-scene-remove-mobject-json]",
    "[data-viz-manim-scene-init-json]",
    "[data-viz-manim-coordinate-system-json]",
    "[data-viz-manim-axis-tick-json]",
    "[data-viz-manim-coordinate-space-json]",
    "[data-viz-manim-surface-object-json]",
    "[data-viz-manim-ode-trajectory-json]",
    "[data-viz-manim-ode-trajectory-object-json]",
    "[data-viz-manim-vector-field-json]",
    "[data-viz-manim-move-along-vector-field-json]",
    "[data-viz-manim-stream-line-json]",
    "[data-viz-manim-timeline-json]",
    "[data-viz-manim-curve-partial-json]",
    "[data-viz-manim-tracing-tail-json]",
    "[data-viz-manim-show-creation-json]",
    "[data-viz-manim-draw-border-fill-json]",
    "[data-viz-manim-fade-grow-json]",
    "[data-viz-manim-indication-json]",
    "[data-viz-manim-indication-runtime-overlay-json]",
    "[data-viz-manim-transform-path-json]",
    "[data-viz-manim-rate-function-json]",
    "[data-viz-manim-lag-ratio-json]",
    "[data-viz-manim-sub-alpha-json]",
    "[data-viz-manim-animation-runtime-json]",
    "[data-viz-manim-transform-interpolate-bounding-box-json]",
    "[data-viz-manim-transform-interpolate-uniform-json]",
    "[data-viz-manim-transform-interpolate-field-json]",
    "[data-viz-manim-animate-builder-json]",
    "[data-viz-manim-always-updater-json]",
    "[data-viz-manim-always-method-json]",
    "[data-viz-manim-animation-composition-json]",
    "[data-viz-manim-frame-stepper-json]",
    "[data-viz-manim-camera-director-json]",
    "[data-viz-manim-camera-updater-json]",
    "[data-viz-manim-checkpoint-store-json]",
    "[data-viz-manim-checkpoint-paste-json]",
    "[data-viz-manim-parameter-panel-json]",
    "[data-viz-manim-camera-shot-json]",
    "[data-viz-manim-camera-frame-json]",
    "[data-viz-manim-history-json]",
    "[data-viz-manim-shortcut-catalog-json]",
    "[data-viz-manim-play-compilation-json]",
    "[data-viz-manim-pre-play-json]",
    "[data-viz-manim-begin-animations-json]",
    "[data-viz-manim-time-progression-json]",
    "[data-viz-manim-progress-through-json]",
    "[data-viz-manim-update-frame-json]",
    "[data-viz-manim-update-policy-json]",
    "[data-viz-manim-interact-loop-json]",
    "[data-viz-manim-floor-plane-json]",
    "[data-viz-manim-pick-json]",
    "[data-viz-manim-key-control-json]",
    "[data-viz-manim-pointer-control-json]",
    "[data-viz-manim-window-event-json]",
    "[data-viz-manim-emit-frame-json]",
    "[data-viz-manim-wait-control-json]",
    "[data-viz-manim-presenter-hold-json]",
    "[data-viz-manim-skipping-window-json]",
    "[data-viz-manim-skip-control-json]",
    "[data-viz-manim-progress-control-json]",
    "[data-viz-manim-finish-animations-json]",
    "[data-viz-manim-post-play-preview-json]",
    "[data-viz-manim-post-cell-redraw-json]",
    "[data-viz-manim-reload-json]",
    "[data-viz-manim-animation-lifecycle-json]",
    "[data-viz-manim-transform-begin-json]",
    "[data-viz-manim-transform-matching-json]",
    "[data-viz-manim-transform-family-alignment-json]",
    "[data-viz-manim-transform-point-alignment-json]",
    "[data-viz-manim-transform-data-lock-json]",
    "[data-viz-mobject-bounding-box-json]",
    "[data-viz-mobject-copy-plan-json]",
    "[data-viz-mobject-layout-json]",
    "[data-viz-mobject-render-order-json]",
    "[data-viz-mobject-data-array-json]",
    "[data-viz-mobject-dirty-state-json]",
    "[data-viz-mobject-invalidation-json]",
    "[data-viz-mobject-family-json]",
    "[data-viz-mobject-family-cache-json]",
    "[data-viz-mobject-point-cloud-json]",
    "[data-viz-mobject-uniform-json]",
    "[data-viz-mobject-state-json]",
    "[data-viz-mobject-state-restore-bridge-json]",
    "[data-viz-mobject-move-to-target-json]",
    "[data-viz-mobject-anchor-json]",
    "[data-viz-mobject-material-json]",
    "[data-viz-manim-playback-json]",
    "[data-viz-manim-run-from-beat-json]",
    "[data-viz-manim-scene-export-json]",
    "[data-viz-manim-scene-run-json]",
    "[data-viz-manim-scene-run-interact-json]",
    "[data-viz-manim-scene-run-file-writer-finish-json]",
    "[data-viz-manim-smoke-hook-json]",
    "[data-viz-manim-projected-label-json]",
    "[data-viz-manim-formula-collision-json]",
    "[data-viz-manim-state-snapshot-json]",
    "[data-viz-manim-tex-cache-json]",
    "[data-viz-manim-tex-compile-json]",
    "[data-viz-manim-tex-color-map-json]",
    "[data-viz-manim-tex-colorized-json]",
    "[data-viz-manim-tex-isolation-json]",
    "[data-viz-manim-updater-execution-json]",
    "[data-viz-manim-updater-signature-json]",
    "[data-viz-manim-updater-suspension-json]",
    "[data-viz-manim-value-tracker-json]"
  ]);

  const serialized = serializeMathSceneSmokeHookManifest(manifest);
  assert.equal(
    serializeMathSceneSmokeHookManifest(JSON.parse(JSON.stringify(manifest)) as MathSceneSmokeHookManifest),
    serialized
  );
  assert.doesNotMatch(serialized, /undefined|NaN|Infinity/);
  assert.doesNotMatch(serialized, /<\/script/i);
});

test("maps smoke-hook manifests to browser QA data attributes", async () => {
  const {
    buildMathSceneSmokeHookManifest,
    sceneSmokeHookDataAttributes
  } = await importSmokeHookModule();
  const scene = buildFunctionGraphSpec();
  const sceneExport = buildApprovedSceneSpecExport(scene);
  const manifest = buildMathSceneSmokeHookManifest({
    scene,
    sceneExport,
    stateSnapshot: buildSnapshot(scene, sceneExport)
  });

  assert.deepEqual(sceneSmokeHookDataAttributes(manifest), {
    "data-viz-manim-smoke-hook-attribute-count": String(manifest.attributeCount),
    "data-viz-manim-smoke-hook-converted-selector-count": "1",
    "data-viz-manim-smoke-hook-json-payload-count": String(manifest.jsonPayloadSelectors.length),
    "data-viz-manim-smoke-hook-ready": "true",
    "data-viz-manim-smoke-hook-scene-id": scene.sceneId,
    "data-viz-manim-smoke-hook-selector-count": String(manifest.selectorCount),
    "data-viz-manim-smoke-hook-selector-conversion-summary": manifest.selectorConversionSummary,
    "data-viz-manim-smoke-hook-signature": manifest.signature,
    "data-viz-manim-smoke-hook-source-contract": expectedSmokeHookSourceContract,
    "data-viz-manim-smoke-hook-summary": manifest.summary
  });
});

test("lists every Canvas JSON payload selector in the smoke-hook manifest", async () => {
  const { buildMathSceneSmokeHookManifest } = await importSmokeHookModule();
  const scene = buildFunctionGraphSpec();
  const sceneExport = buildApprovedSceneSpecExport(scene);
  const manifest = buildMathSceneSmokeHookManifest({
    scene,
    sceneExport,
    stateSnapshot: buildSnapshot(scene, sceneExport)
  });
  const requiredJsonPayloadSelectors = requiredJsonPayloadSelectorsFromCanvasContract();
  const missingSelectors = requiredJsonPayloadSelectors.filter(
    (selector) => !manifest.jsonPayloadSelectors.includes(selector)
  );

  assert.deepEqual(missingSelectors, []);
  assert.deepEqual(manifest.jsonPayloadSelectors, requiredJsonPayloadSelectors);
});

test("lists every Canvas authoring selector in the smoke-hook manifest", async () => {
  const { buildMathSceneSmokeHookManifest } = await importSmokeHookModule();
  const scene = buildFunctionGraphSpec();
  const sceneExport = buildApprovedSceneSpecExport(scene);
  const manifest = buildMathSceneSmokeHookManifest({
    scene,
    sceneExport,
    stateSnapshot: buildSnapshot(scene, sceneExport)
  });
  const requiredCssSelectors = requiredCssSelectorsFromCanvasContract();
  const missingSelectors = requiredCssSelectors.filter((selector) => !manifest.cssSelectors.includes(selector));

  assert.deepEqual(missingSelectors, []);
  assert.deepEqual(manifest.cssSelectors.slice(-requiredCssSelectors.length), requiredCssSelectors);
});

test("lists every Canvas root data attribute in the smoke-hook manifest", async () => {
  const { buildMathSceneSmokeHookManifest } = await importSmokeHookModule();
  const scene = buildFunctionGraphSpec();
  const sceneExport = buildApprovedSceneSpecExport(scene);
  const manifest = buildMathSceneSmokeHookManifest({
    scene,
    sceneExport,
    stateSnapshot: buildSnapshot(scene, sceneExport)
  });
  const missingAttributes = threeDCanvasRequiredDataAttributes.filter(
    (attribute) => !manifest.dataAttributes.includes(attribute)
  );

  assert.deepEqual(missingAttributes, []);
});

test("lists run-from-beat checkpoint invalidation root attributes for browser smoke QA", async () => {
  const { buildMathSceneSmokeHookManifest } = await importSmokeHookModule();
  const scene = buildFunctionGraphSpec();
  const sceneExport = buildApprovedSceneSpecExport(scene);
  const manifest = buildMathSceneSmokeHookManifest({
    scene,
    sceneExport,
    stateSnapshot: buildSnapshot(scene, sceneExport)
  });
  const expectedInvalidationAttributes = [
    "data-viz-manim-run-from-beat-checkpoint-invalidates-count",
    "data-viz-manim-run-from-beat-checkpoint-invalidated-keys",
    "data-viz-manim-run-from-beat-checkpoint-invalidation-summary",
    "data-viz-manim-run-from-beat-checkpoint-retained-keys-after-restore",
    "data-viz-manim-run-from-beat-checkpoint-restore-action"
  ];

  for (const attribute of expectedInvalidationAttributes) {
    assert.ok(manifest.dataAttributes.includes(attribute), `${attribute} should be smoke-checkable`);
    assert.ok(!manifest.jsonPayloadSelectors.includes(`[${attribute}]`), `${attribute} should remain a root attribute`);
  }
});

test("derives smoke-hook selector registries from the Canvas selector contract", () => {
  const source = fs.readFileSync(smokeHookModulePath, "utf8");

  assert.match(source, /threeDCanvasRequiredSelectors/);
  assert.match(source, /canvasRequiredSelectorToCssSelector/);
  assert.ok(
    threeDCanvasRequiredSelectors.includes("data-viz-name" as (typeof threeDCanvasRequiredSelectors)[number]),
    "data-viz-name should be an explicit browser smoke selector instead of only an implicit special conversion"
  );

  for (const duplicatedSelector of [
    "[data-viz-manim-capture-control]",
    "[data-viz-manim-capture-plan-json]",
    "[data-viz-manim-camera-frame-json]",
    "[data-viz-manim-formula-token]",
    "[data-viz-manim-mark]",
    "[data-viz-manim-projected-label-layer]",
    "[data-viz-manim-updater-suspension-json]",
    "[data-viz-manim-value-tracker-json]"
  ]) {
    assert.doesNotMatch(
      source,
      new RegExp(`"${duplicatedSelector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`),
      `${duplicatedSelector} should come from threeDCanvasRequiredSelectors instead of a duplicate smoke-hook literal`
    );
  }
});

test("keeps the smoke-hook manifest pure and renderer independent", () => {
  assert.ok(fs.existsSync(smokeHookModulePath), "smoke-hook manifests should live in a pure Manim math module");
  const source = fs.readFileSync(smokeHookModulePath, "utf8");

  assert.match(source, /import type \{ ApprovedSceneSpecExport \} from "\.\/mathSceneExport"/);
  assert.match(source, /import type \{ MathSceneStateSnapshot \} from "\.\/mathSceneStateSnapshot"/);
  assert.match(source, /import type \{ MathSceneSpec \} from "\.\/mathSceneTypes"/);
  assert.match(source, /SCENE_SMOKE_HOOK_SOURCE_CONTRACT/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|playwright|MathSceneRuntime|ThreeDLabCanvas|window|document/);
  assert.match(source, /buildMathSceneSmokeHookManifest/);
  assert.match(source, /sceneSmokeHookDataAttributes/);
  assert.match(source, /serializeMathSceneSmokeHookManifest/);
});
