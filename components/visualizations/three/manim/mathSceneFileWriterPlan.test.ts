import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildMathSceneCapturePlan,
  type MathSceneCaptureKind,
  type MathSceneCapturePlan,
  type MathSceneCaptureStatus
} from "./mathSceneCapture";
import { buildApprovedSceneSpecExport, type ApprovedSceneSpecExport } from "./mathSceneExport";
import { buildMathSceneRenderQualityPlan, type MathSceneRenderQualityPlan } from "./mathSceneRenderQuality";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import {
  buildMathSceneSmokeHookManifest,
  type MathSceneSmokeHookManifest
} from "./mathSceneSmokeHook";
import {
  buildMathSceneStateSnapshot,
  type MathSceneStateSnapshot
} from "./mathSceneStateSnapshot";
import type { MathSceneSpec } from "./mathSceneTypes";

type MathSceneFileWriterArtifact = {
  byteCount: number;
  fileName: string;
  frameCount: number;
  kind: "manifest" | "scene-spec" | "state-snapshot" | "smoke-hook" | "media";
  mimeType: "application/json" | "image/png" | "video/webm";
  signature: string;
};

type MathSceneFileWriterPlan = {
  artifactCount: number;
  artifactFileSummary: string;
  artifactKindSummary: string;
  artifactMimeSummary: string;
  artifacts: MathSceneFileWriterArtifact[];
  byteCount: number;
  captureBackgroundAlpha: number;
  captureBackgroundColor: string;
  captureDevicePixelRatio: number;
  captureFps: number;
  captureHeight: number;
  captureKind: MathSceneCaptureKind;
  captureQualityPreset: MathSceneRenderQualityPlan["preset"];
  captureRendererMode: MathSceneRenderQualityPlan["rendererMode"];
  captureSamplesPerPixel: number;
  captureStatus: MathSceneCaptureStatus;
  captureTransparentBackground: boolean;
  captureWidth: number;
  familyId: string;
  fileWriterVersion: "mais-manim-file-writer/v1";
  frameCount: number;
  frameFilePattern: string;
  manifestFileName: string;
  jsonArtifactCount: number;
  mediaArtifactCount: number;
  mediaFileName: string;
  outputSlug: string;
  ready: boolean;
  sceneId: string;
  sceneSignature: string;
  sceneSpecFileName: string;
  signature: string;
  smokeHookFileName: string;
  smokeHookSignature: string;
  sourceContract: string;
  snapshotSignature: string;
  stateSnapshotFileName: string;
  summary: string;
};

type MathSceneFileWriterPlanModule = {
  SCENE_FILE_WRITER_SOURCE_CONTRACT: string;
  buildMathSceneFileWriterPlan: (input: {
    capturePlan: MathSceneCapturePlan;
    scene: MathSceneSpec;
    sceneExport: ApprovedSceneSpecExport;
    smokeHook: MathSceneSmokeHookManifest;
    stateSnapshot: MathSceneStateSnapshot;
  }) => MathSceneFileWriterPlan;
  sceneFileWriterDataAttributes: (plan: MathSceneFileWriterPlan) => Record<string, string>;
  serializeMathSceneFileWriterPlan: (plan: MathSceneFileWriterPlan) => string;
};

const fileWriterModulePath = "components/visualizations/three/manim/mathSceneFileWriterPlan.ts";

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

function buildWriterInputs(kind: MathSceneCaptureKind = "screenshot", renderQuality?: MathSceneRenderQualityPlan) {
  const scene = buildFunctionGraphSpec();
  const sceneExport = buildApprovedSceneSpecExport(scene);
  const stateSnapshot = buildSnapshot(scene, sceneExport);
  const smokeHook = buildMathSceneSmokeHookManifest({ scene, sceneExport, stateSnapshot });
  const capturePlan = buildMathSceneCapturePlan({
    byteCount: kind === "screenshot" ? 2048 : 0,
    cameraShotId: "overview",
    elapsedSeconds: 1,
    fps: renderQuality ? undefined : 12,
    kind,
    renderQuality,
    requestCount: 1,
    scene,
    sceneSignature: sceneExport.signature,
    status: kind === "screenshot" ? "captured" : "planned"
  });

  return { capturePlan, scene, sceneExport, smokeHook, stateSnapshot };
}

async function importFileWriterModule() {
  assert.ok(fs.existsSync(fileWriterModulePath), "MAIS Manim should provide a pure SceneFileWriter-style artifact manifest module");
  return (await import("./mathSceneFileWriterPlan")) as MathSceneFileWriterPlanModule;
}

test("builds a deterministic SceneFileWriter-style artifact manifest", async () => {
  const {
    SCENE_FILE_WRITER_SOURCE_CONTRACT,
    buildMathSceneFileWriterPlan,
    serializeMathSceneFileWriterPlan
  } = await importFileWriterModule();
  const inputs = buildWriterInputs();
  const plan = buildMathSceneFileWriterPlan(inputs);

  assert.equal(plan.fileWriterVersion, "mais-manim-file-writer/v1");
  assert.equal(plan.sourceContract, SCENE_FILE_WRITER_SOURCE_CONTRACT);
  assert.match(plan.sourceContract, /SceneFileWriter/);
  assert.match(plan.sourceContract, /begin_animation/);
  assert.match(plan.sourceContract, /write_frame/);
  assert.match(plan.sourceContract, /finish/);
  assert.match(plan.sourceContract, /artifacts/);
  assert.equal(plan.sceneId, inputs.scene.sceneId);
  assert.equal(plan.familyId, inputs.scene.familyId);
  assert.equal(plan.sceneSignature, inputs.sceneExport.signature);
  assert.equal(plan.snapshotSignature, inputs.stateSnapshot.signature);
  assert.equal(plan.smokeHookSignature, inputs.smokeHook.signature);
  assert.equal(plan.captureKind, "screenshot");
  assert.equal(plan.captureStatus, "captured");
  assert.equal(plan.captureWidth, 800);
  assert.equal(plan.captureHeight, 450);
  assert.equal(plan.captureFps, 12);
  assert.equal(plan.captureQualityPreset, "interactive");
  assert.equal(plan.captureRendererMode, "interactive");
  assert.equal(plan.captureDevicePixelRatio, 1);
  assert.equal(plan.captureSamplesPerPixel, 2);
  assert.equal(plan.captureTransparentBackground, false);
  assert.equal(plan.captureBackgroundColor, "#020617");
  assert.equal(plan.captureBackgroundAlpha, 1);
  assert.equal(plan.ready, true);
  assert.equal(plan.byteCount, 2048);
  assert.equal(plan.frameCount, 1);
  assert.match(plan.outputSlug, /^mais-manim-function-graph-fnv1a-[0-9a-f]{8}$/);
  assert.equal(plan.manifestFileName, `${plan.outputSlug}.manifest.json`);
  assert.equal(plan.sceneSpecFileName, `${plan.outputSlug}.scene-spec.json`);
  assert.equal(plan.stateSnapshotFileName, `${plan.outputSlug}.state-snapshot.json`);
  assert.equal(plan.smokeHookFileName, `${plan.outputSlug}.smoke-hook.json`);
  assert.equal(plan.mediaFileName, `${plan.outputSlug}.png`);
  assert.equal(plan.frameFilePattern, `${plan.outputSlug}.frame-%04d.png`);
  assert.equal(plan.artifactCount, 5);
  assert.equal(plan.artifactKindSummary, "manifest|scene-spec|state-snapshot|smoke-hook|media");
  assert.equal(
    plan.artifactFileSummary,
    [
      `${plan.outputSlug}.manifest.json`,
      `${plan.outputSlug}.scene-spec.json`,
      `${plan.outputSlug}.state-snapshot.json`,
      `${plan.outputSlug}.smoke-hook.json`,
      `${plan.outputSlug}.png`
    ].join("|")
  );
  assert.equal(plan.artifactMimeSummary, "application/json=4|image/png=1");
  assert.equal(plan.jsonArtifactCount, 4);
  assert.equal(plan.mediaArtifactCount, 1);
  assert.deepEqual(plan.artifacts.map((artifact) => artifact.kind), [
    "manifest",
    "scene-spec",
    "state-snapshot",
    "smoke-hook",
    "media"
  ]);
  assert.equal(
    plan.summary,
    `file-writer:${inputs.scene.sceneId}:artifacts=5:capture=screenshot:ready=true`
  );
  assert.match(plan.signature, /^writer-[0-9a-f]{8}$/);

  const serialized = serializeMathSceneFileWriterPlan(plan);
  assert.equal(
    serializeMathSceneFileWriterPlan(JSON.parse(JSON.stringify(plan)) as MathSceneFileWriterPlan),
    serialized
  );
  assert.doesNotMatch(serialized, /undefined|NaN|Infinity|<\/script/i);
});

test("uses video media names while retaining the frame export pattern", async () => {
  const { buildMathSceneFileWriterPlan } = await importFileWriterModule();
  const plan = buildMathSceneFileWriterPlan(buildWriterInputs("video"));

  assert.equal(plan.captureKind, "video");
  assert.equal(plan.captureStatus, "planned");
  assert.equal(plan.mediaFileName, `${plan.outputSlug}.webm`);
  assert.equal(plan.frameFilePattern, `${plan.outputSlug}.frame-%04d.png`);
  assert.ok(plan.frameCount > 100, "video writer plan should inherit the capture frame count");
  assert.equal(plan.artifacts.at(-1)?.mimeType, "video/webm");
  assert.equal(plan.artifactMimeSummary, "application/json=4|video/webm=1");
  assert.equal(plan.mediaArtifactCount, 1);
});

test("propagates render quality metadata into SceneFileWriter manifests", async () => {
  const {
    buildMathSceneFileWriterPlan,
    sceneFileWriterDataAttributes
  } = await importFileWriterModule();
  const renderQuality = buildMathSceneRenderQualityPlan({
    backgroundColor: "#111827",
    preset: "production",
    rendererMode: "capture",
    transparentBackground: true
  });
  const plan = buildMathSceneFileWriterPlan(buildWriterInputs("video", renderQuality));
  const attributes = sceneFileWriterDataAttributes(plan);

  assert.equal(plan.captureWidth, 1920);
  assert.equal(plan.captureHeight, 1080);
  assert.equal(plan.captureFps, 60);
  assert.equal(plan.captureQualityPreset, "production");
  assert.equal(plan.captureRendererMode, "capture");
  assert.equal(plan.captureDevicePixelRatio, 2);
  assert.equal(plan.captureSamplesPerPixel, 4);
  assert.equal(plan.captureTransparentBackground, true);
  assert.equal(plan.captureBackgroundColor, "#111827");
  assert.equal(plan.captureBackgroundAlpha, 0);
  assert.equal(attributes["data-viz-manim-file-writer-capture-width"], "1920");
  assert.equal(attributes["data-viz-manim-file-writer-capture-height"], "1080");
  assert.equal(attributes["data-viz-manim-file-writer-capture-fps"], "60");
  assert.equal(attributes["data-viz-manim-file-writer-capture-quality-preset"], "production");
  assert.equal(attributes["data-viz-manim-file-writer-capture-renderer-mode"], "capture");
  assert.equal(attributes["data-viz-manim-file-writer-capture-dpr"], "2.000");
  assert.equal(attributes["data-viz-manim-file-writer-capture-samples"], "4");
  assert.equal(attributes["data-viz-manim-file-writer-capture-transparent"], "true");
  assert.equal(attributes["data-viz-manim-file-writer-capture-background"], "#111827");
  assert.equal(attributes["data-viz-manim-file-writer-capture-alpha"], "0.000");
});

test("marks writer plans unready when upstream scene artifacts disagree", async () => {
  const { buildMathSceneFileWriterPlan } = await importFileWriterModule();
  const inputs = buildWriterInputs();
  const mismatchedSnapshot = {
    ...inputs.stateSnapshot,
    sceneId: "different-scene"
  };
  const plan = buildMathSceneFileWriterPlan({
    ...inputs,
    stateSnapshot: mismatchedSnapshot
  });

  assert.equal(plan.ready, false);
  assert.equal(plan.summary, `file-writer:${inputs.scene.sceneId}:artifacts=5:capture=screenshot:ready=false`);
});

test("maps file writer plans to browser QA data attributes", async () => {
  const {
    SCENE_FILE_WRITER_SOURCE_CONTRACT,
    buildMathSceneFileWriterPlan,
    sceneFileWriterDataAttributes
  } = await importFileWriterModule();
  const plan = buildMathSceneFileWriterPlan(buildWriterInputs());

  assert.deepEqual(sceneFileWriterDataAttributes(plan), {
    "data-viz-manim-file-writer-artifact-count": "5",
    "data-viz-manim-file-writer-artifact-file-summary": plan.artifactFileSummary,
    "data-viz-manim-file-writer-artifact-kind-summary": "manifest|scene-spec|state-snapshot|smoke-hook|media",
    "data-viz-manim-file-writer-artifact-mime-summary": "application/json=4|image/png=1",
    "data-viz-manim-file-writer-byte-count": "2048",
    "data-viz-manim-file-writer-capture-alpha": "1.000",
    "data-viz-manim-file-writer-capture-background": "#020617",
    "data-viz-manim-file-writer-capture-dpr": "1.000",
    "data-viz-manim-file-writer-capture-fps": "12",
    "data-viz-manim-file-writer-capture-height": "450",
    "data-viz-manim-file-writer-capture-kind": "screenshot",
    "data-viz-manim-file-writer-capture-quality-preset": "interactive",
    "data-viz-manim-file-writer-capture-renderer-mode": "interactive",
    "data-viz-manim-file-writer-capture-samples": "2",
    "data-viz-manim-file-writer-capture-status": "captured",
    "data-viz-manim-file-writer-capture-transparent": "false",
    "data-viz-manim-file-writer-capture-width": "800",
    "data-viz-manim-file-writer-frame-count": "1",
    "data-viz-manim-file-writer-json-artifact-count": "4",
    "data-viz-manim-file-writer-media-artifact-count": "1",
    "data-viz-manim-file-writer-output-slug": plan.outputSlug,
    "data-viz-manim-file-writer-ready": "true",
    "data-viz-manim-file-writer-scene-id": plan.sceneId,
    "data-viz-manim-file-writer-signature": plan.signature,
    "data-viz-manim-file-writer-source-contract": SCENE_FILE_WRITER_SOURCE_CONTRACT,
    "data-viz-manim-file-writer-summary": plan.summary
  });
});

test("keeps file writer planning pure and renderer independent", () => {
  assert.ok(fs.existsSync(fileWriterModulePath), "file writer planning should live in a pure Manim math module");
  const source = fs.readFileSync(fileWriterModulePath, "utf8");

  assert.match(source, /import type \{ MathSceneCapturePlan \} from "\.\/mathSceneCapture"/);
  assert.match(source, /import type \{ ApprovedSceneSpecExport \} from "\.\/mathSceneExport"/);
  assert.match(source, /import type \{ MathSceneSmokeHookManifest \} from "\.\/mathSceneSmokeHook"/);
  assert.match(source, /import type \{ MathSceneStateSnapshot \} from "\.\/mathSceneStateSnapshot"/);
  assert.match(source, /import type \{ MathSceneSpec \} from "\.\/mathSceneTypes"/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|MathSceneRuntime|ThreeDLabCanvas|window|document/);
  assert.match(source, /SCENE_FILE_WRITER_SOURCE_CONTRACT/);
  assert.match(source, /buildMathSceneFileWriterPlan/);
  assert.match(source, /sceneFileWriterDataAttributes/);
  assert.match(source, /serializeMathSceneFileWriterPlan/);
});
