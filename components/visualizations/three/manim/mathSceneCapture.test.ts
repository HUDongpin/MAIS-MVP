import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildApprovedSceneSpecExport } from "./mathSceneExport";
import type { MathSceneRenderGroups } from "./mathSceneGraph";
import { buildMathSceneRenderQualityPlan, type MathSceneRenderQualityPlan } from "./mathSceneRenderQuality";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import type { MathSceneSpec } from "./mathSceneTypes";

type MathSceneCaptureKind = "screenshot" | "video";
type MathSceneCaptureFramebufferStatus = "planned" | "ready" | "unavailable";
type MathSceneCaptureTarget = "canvas" | "offscreen";
type MathSceneCaptureStatus = "captured" | "planned" | "unavailable";

type MathSceneCapturePlan = {
  byteCount: number;
  cameraShotId: string;
  captureVersion: "mais-manim-capture/v1";
  durationSeconds: number;
  elapsedSeconds: number;
  fps: number;
  familyId: string;
  framebufferId: string;
  framebufferStatus: MathSceneCaptureFramebufferStatus;
  frameCount: number;
  frameTimes: number[];
  height: number;
  kind: MathSceneCaptureKind;
  mimeType: string;
  renderGroupCount: number;
  renderGroupIds: string;
  renderGroupSummary: string;
  requestCount: number;
  captureTarget: MathSceneCaptureTarget;
  renderPassSummary: string;
  renderQualityBackgroundAlpha: number;
  renderQualityBackgroundColor: string;
  renderQualityDevicePixelRatio: number;
  renderQualityPreset: MathSceneRenderQualityPlan["preset"];
  renderQualityRendererMode: MathSceneRenderQualityPlan["rendererMode"];
  renderQualitySamplesPerPixel: number;
  renderQualityTransparentBackground: boolean;
  sceneId: string;
  sceneSignature: string;
  sourceContract: typeof expectedCaptureSourceContract;
  status: MathSceneCaptureStatus;
  summary: string;
  width: number;
};

type MathSceneCaptureModule = {
  SCENE_CAPTURE_SOURCE_CONTRACT: typeof expectedCaptureSourceContract;
  buildMathSceneCapturePlan: (input: {
    byteCount?: number;
    cameraShotId: string;
    elapsedSeconds: number;
    fps?: number;
    height?: number;
    kind: MathSceneCaptureKind;
    requestCount?: number;
    renderQuality?: MathSceneRenderQualityPlan;
    renderGroups?: MathSceneRenderGroups;
    scene: MathSceneSpec;
    sceneSignature: string;
    status?: MathSceneCaptureStatus;
    width?: number;
  }) => MathSceneCapturePlan;
  capturePlanDataAttributes: (plan: MathSceneCapturePlan) => Record<string, string>;
  serializeMathSceneCapturePlan: (plan: MathSceneCapturePlan) => string;
};

const captureModulePath = "components/visualizations/three/manim/mathSceneCapture.ts";
const expectedCaptureSourceContract =
  "Camera capture: render scene render groups through framebuffer into screenshot/video artifacts for SceneFileWriter" as const;

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

const functionGraphRenderGroups: MathSceneRenderGroups = {
  all: ["axes", "function-curve", "moving-probe", "probe-trace"],
  fixedInFrame: ["probe-trace"],
  foreground: ["moving-probe"],
  scene: ["axes", "function-curve"]
};

async function importCaptureModule() {
  assert.ok(fs.existsSync(captureModulePath), "MAIS Manim should provide a pure screenshot/video capture plan module");
  return (await import("./mathSceneCapture")) as MathSceneCaptureModule;
}

test("builds deterministic screenshot capture plans from scene specs and camera state", async () => {
  const { SCENE_CAPTURE_SOURCE_CONTRACT, buildMathSceneCapturePlan, serializeMathSceneCapturePlan } = await importCaptureModule();
  const scene = buildFunctionGraphSpec();
  const sceneSignature = buildApprovedSceneSpecExport(scene).signature;
  const plan = buildMathSceneCapturePlan({
    byteCount: 2048,
    cameraShotId: "overview",
    elapsedSeconds: 1.23456,
    height: 450,
    kind: "screenshot",
    renderGroups: functionGraphRenderGroups,
    requestCount: 2,
    scene,
    sceneSignature,
    status: "captured",
    width: 800
  });

  assert.equal(plan.captureVersion, "mais-manim-capture/v1");
  assert.equal(SCENE_CAPTURE_SOURCE_CONTRACT, expectedCaptureSourceContract);
  assert.equal(plan.sourceContract, SCENE_CAPTURE_SOURCE_CONTRACT);
  assert.equal(plan.kind, "screenshot");
  assert.equal(plan.status, "captured");
  assert.equal(plan.sceneId, scene.sceneId);
  assert.equal(plan.familyId, scene.familyId);
  assert.equal(plan.sceneSignature, sceneSignature);
  assert.equal(plan.cameraShotId, "overview");
  assert.equal(plan.captureTarget, "canvas");
  assert.equal(plan.framebufferId, "fb-mais-manim-function-graph-overview-800x450-canvas");
  assert.equal(plan.framebufferStatus, "ready");
  assert.equal(plan.elapsedSeconds, 1.235);
  assert.equal(plan.durationSeconds, 0);
  assert.equal(plan.frameCount, 1);
  assert.deepEqual(plan.frameTimes, [1.235]);
  assert.equal(plan.byteCount, 2048);
  assert.equal(plan.requestCount, 2);
  assert.equal(plan.mimeType, "image/png");
  assert.equal(plan.renderGroupCount, 4);
  assert.equal(plan.renderGroupIds, "axes,function-curve,moving-probe,probe-trace");
  assert.equal(plan.renderGroupSummary, "scene=2:foreground=1:fixedInFrame=1:all=4");
  assert.equal(
    plan.renderPassSummary,
    "capture-pass:target=canvas:framebuffer=fb-mais-manim-function-graph-overview-800x450-canvas:groups=scene(2)>foreground(1)>fixedInFrame(1):frames=1"
  );
  assert.equal(plan.summary, "screenshot:mais-manim-function-graph:overview:frames=1:status=captured");

  const serialized = serializeMathSceneCapturePlan(plan);
  assert.equal(serializeMathSceneCapturePlan(JSON.parse(JSON.stringify(plan)) as MathSceneCapturePlan), serialized);
  assert.equal(JSON.parse(serialized).sourceContract, SCENE_CAPTURE_SOURCE_CONTRACT);
  assert.doesNotMatch(serialized, /undefined|NaN|Infinity|<\/script/i);
});

test("builds video capture frame plans over the full guided timeline", async () => {
  const { SCENE_CAPTURE_SOURCE_CONTRACT, buildMathSceneCapturePlan } = await importCaptureModule();
  const scene = buildFunctionGraphSpec();
  const plan = buildMathSceneCapturePlan({
    cameraShotId: "curve-detail",
    elapsedSeconds: 4,
    fps: 12,
    kind: "video",
    renderGroups: functionGraphRenderGroups,
    scene,
    sceneSignature: buildApprovedSceneSpecExport(scene).signature
  });

  assert.equal(plan.sourceContract, SCENE_CAPTURE_SOURCE_CONTRACT);
  assert.equal(plan.kind, "video");
  assert.equal(plan.captureTarget, "offscreen");
  assert.equal(plan.framebufferStatus, "planned");
  assert.equal(plan.framebufferId, "fb-mais-manim-function-graph-curve-detail-800x450-offscreen");
  assert.equal(plan.status, "planned");
  assert.equal(plan.mimeType, "video/webm");
  assert.equal(plan.durationSeconds, 10.84);
  assert.equal(plan.frameCount, plan.frameTimes.length);
  assert.equal(plan.frameTimes[0], 0);
  assert.equal(plan.frameTimes.at(-1), 10.84);
  assert.ok(plan.frameCount > 100, "video plan should sample enough frames for review");
  assert.ok(plan.frameTimes.every((time, index, times) => index === 0 || time > times[index - 1]));
});

test("uses render quality presets as capture defaults", async () => {
  const { buildMathSceneCapturePlan } = await importCaptureModule();
  const scene = buildFunctionGraphSpec();
  const renderQuality = buildMathSceneRenderQualityPlan({
    backgroundColor: "#111827",
    preset: "production",
    rendererMode: "capture",
    transparentBackground: true
  });
  const plan = buildMathSceneCapturePlan({
    cameraShotId: "curve-detail",
    elapsedSeconds: 0,
    kind: "video",
    renderQuality,
    scene,
    sceneSignature: buildApprovedSceneSpecExport(scene).signature
  });

  assert.equal(plan.width, 1920);
  assert.equal(plan.height, 1080);
  assert.equal(plan.fps, 60);
  assert.equal(plan.renderQualityPreset, "production");
  assert.equal(plan.renderQualityRendererMode, "capture");
  assert.equal(plan.renderQualityDevicePixelRatio, 2);
  assert.equal(plan.renderQualitySamplesPerPixel, 4);
  assert.equal(plan.renderQualityTransparentBackground, true);
  assert.equal(plan.renderQualityBackgroundColor, "#111827");
  assert.equal(plan.renderQualityBackgroundAlpha, 0);
  assert.equal(plan.frameTimes[1], 0.017);
  assert.ok(plan.frameCount > 600, "production quality should sample the guided timeline at 60fps");
});

test("maps capture plans to browser QA data attributes", async () => {
  const {
    SCENE_CAPTURE_SOURCE_CONTRACT,
    buildMathSceneCapturePlan,
    capturePlanDataAttributes
  } = await importCaptureModule();
  const scene = buildFunctionGraphSpec();
  const plan = buildMathSceneCapturePlan({
    byteCount: 1234,
    cameraShotId: "overview",
    elapsedSeconds: 2,
    height: 320,
    kind: "screenshot",
    renderGroups: functionGraphRenderGroups,
    requestCount: 3,
    scene,
    sceneSignature: buildApprovedSceneSpecExport(scene).signature,
    status: "captured",
    width: 360
  });

  assert.deepEqual(capturePlanDataAttributes(plan), {
    "data-viz-manim-capture-byte-count": "1234",
    "data-viz-manim-capture-camera-shot": "overview",
    "data-viz-manim-capture-target": "canvas",
    "data-viz-manim-capture-elapsed-seconds": "2.000",
    "data-viz-manim-capture-framebuffer-id": "fb-mais-manim-function-graph-overview-360x320-canvas",
    "data-viz-manim-capture-framebuffer-status": "ready",
    "data-viz-manim-capture-fps": "1",
    "data-viz-manim-capture-frame-count": "1",
    "data-viz-manim-capture-height": "320",
    "data-viz-manim-capture-kind": "screenshot",
    "data-viz-manim-capture-quality-preset": "interactive",
    "data-viz-manim-capture-renderer-mode": "interactive",
    "data-viz-manim-capture-render-group-count": "4",
    "data-viz-manim-capture-render-group-ids": "axes,function-curve,moving-probe,probe-trace",
    "data-viz-manim-capture-render-group-summary": "scene=2:foreground=1:fixedInFrame=1:all=4",
    "data-viz-manim-capture-render-pass-summary":
      "capture-pass:target=canvas:framebuffer=fb-mais-manim-function-graph-overview-360x320-canvas:groups=scene(2)>foreground(1)>fixedInFrame(1):frames=1",
    "data-viz-manim-capture-request-count": "3",
    "data-viz-manim-capture-scene-signature": plan.sceneSignature,
    "data-viz-manim-capture-source-contract": SCENE_CAPTURE_SOURCE_CONTRACT,
    "data-viz-manim-capture-status": "captured",
    "data-viz-manim-capture-dpr": "1.000",
    "data-viz-manim-capture-samples": "2",
    "data-viz-manim-capture-transparent": "false",
    "data-viz-manim-capture-background": "#020617",
    "data-viz-manim-capture-alpha": "1.000",
    "data-viz-manim-capture-width": "360"
  });
});

test("keeps capture planning pure and renderer independent", () => {
  assert.ok(fs.existsSync(captureModulePath), "capture planning should live in a pure Manim math module");
  const source = fs.readFileSync(captureModulePath, "utf8");

  assert.match(source, /import type \{ MathSceneSpec \} from "\.\/mathSceneTypes"/);
  assert.match(source, /SCENE_CAPTURE_SOURCE_CONTRACT/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|MathSceneRuntime|ThreeDLabCanvas|toDataURL|MediaRecorder/);
});
