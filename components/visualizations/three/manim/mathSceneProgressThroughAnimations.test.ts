import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import type { MathSceneEmitFramePlan } from "./mathSceneEmitFrame";
import type { MathSceneUpdateFramePlan } from "./mathSceneUpdateFrame";
import {
  PROGRESS_THROUGH_ANIMATIONS_FRAME_POLICY,
  PROGRESS_THROUGH_ANIMATIONS_SOURCE_CONTRACT,
  PROGRESS_THROUGH_ANIMATIONS_UPDATE_MOBJECTS_POLICY
} from "./mathSceneProgressThroughAnimations";

type MathSceneProgressAnimationSpec = {
  animationId: string;
  objectId?: string;
  runTime: number;
  startingMobjectId?: string;
  targetCopyObjectId?: string;
  targetObjectId?: string;
};

type MathSceneProgressAnimationFrame = {
  allMobjectIds: string[];
  animationId: string;
  callsInterpolate: boolean;
  callsUpdateMobjects: boolean;
  objectId: string;
  primaryMobjectExcluded: boolean;
  rawAlpha: number;
  runTime: number;
  updatedMobjectCount: number;
  updatedMobjectIds: string[];
};

type MathSceneProgressFrame = {
  animationFrames: MathSceneProgressAnimationFrame[];
  callsEmitFrame: boolean;
  callsUpdateFrame: boolean;
  dtSeconds: number;
  emitFrame: MathSceneEmitFramePlan;
  frameIndex: number;
  tSeconds: number;
  updateFrame: MathSceneUpdateFramePlan;
  updateFrameDtSeconds: number;
  writesFrame: boolean;
};

type MathSceneProgressThroughAnimationsPlan = {
  animationCount: number;
  emitFrameCallCount: number;
  finalAlphaSummary: string;
  frameOperationSequenceSummary: string;
  finalTime: number;
  fps: number;
  frameInterval: number;
  framePolicy: typeof PROGRESS_THROUGH_ANIMATIONS_FRAME_POLICY;
  frameOrderSummary: string;
  frameCount: number;
  frames: MathSceneProgressFrame[];
  interpolateCallCount: number;
  rawAlphaOvershootAnimationIds: string;
  rawAlphaOvershootCount: number;
  rawAlphaSequenceSummary: string;
  runTime: number;
  skipAnimations: boolean;
  sourceContract: typeof PROGRESS_THROUGH_ANIMATIONS_SOURCE_CONTRACT;
  summary: string;
  timeProgression: unknown;
  timeProgressionSummary: string;
  updateFrameActionSummary: string;
  updateFrameCallCount: number;
  updateMobjectExclusionPolicy: typeof PROGRESS_THROUGH_ANIMATIONS_UPDATE_MOBJECTS_POLICY;
  updateMobjectObjectDtSummary: string;
  updateMobjectObjectCallCount: number;
  updateMobjectTargetSummary: string;
  updateMobjectsCallCount: number;
  updateMobjectsDtSummary: string;
  version: "mais-manim-progress-through-animations/v1";
  writtenFrameCount: number;
};

type MathSceneProgressThroughAnimationsModule = {
  buildSceneProgressThroughAnimationsPlan: (input: {
    animations: MathSceneProgressAnimationSpec[];
    description?: string;
    fps?: number;
    skipAnimations?: boolean;
  }) => MathSceneProgressThroughAnimationsPlan;
  sceneProgressThroughAnimationsDataAttributes: (plan: MathSceneProgressThroughAnimationsPlan) => Record<string, string>;
  serializeSceneProgressThroughAnimationsPlan: (plan: MathSceneProgressThroughAnimationsPlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneProgressThroughAnimations.ts";

async function importProgressThroughAnimationsModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.progress_through_animations module");
  return (await import("./mathSceneProgressThroughAnimations")) as MathSceneProgressThroughAnimationsModule;
}

test("buildSceneProgressThroughAnimationsPlan mirrors Manim frame loop ordering", async () => {
  const { buildSceneProgressThroughAnimationsPlan } = await importProgressThroughAnimationsModule();
  const plan = buildSceneProgressThroughAnimationsPlan({
    animations: [
      { animationId: "curve-reveal", objectId: "curve", runTime: 1 },
      { animationId: "dot-pop", objectId: "dot", runTime: 0.5 }
    ],
    description: "0 curve-reveal, etc.",
    fps: 4,
    skipAnimations: false
  });

  assert.equal(plan.version, "mais-manim-progress-through-animations/v1");
  assert.equal(plan.animationCount, 2);
  assert.equal(plan.sourceContract, PROGRESS_THROUGH_ANIMATIONS_SOURCE_CONTRACT);
  assert.equal(plan.framePolicy, PROGRESS_THROUGH_ANIMATIONS_FRAME_POLICY);
  assert.equal(plan.runTime, 1);
  assert.equal(plan.fps, 4);
  assert.equal(plan.frameInterval, 0.25);
  assert.equal(plan.frameCount, 4);
  assert.deepEqual(plan.frames.map((frame) => frame.tSeconds), [0.25, 0.5, 0.75, 1]);
  assert.deepEqual(plan.frames.map((frame) => frame.dtSeconds), [0.25, 0.25, 0.25, 0.25]);
  assert.deepEqual(plan.frames.map((frame) => frame.animationFrames[0].rawAlpha), [0.25, 0.5, 0.75, 1]);
  assert.deepEqual(plan.frames.map((frame) => frame.animationFrames[1].rawAlpha), [0.5, 1, 1.5, 2]);
  assert.ok(plan.frames.every((frame) => frame.callsUpdateFrame));
  assert.ok(plan.frames.every((frame) => frame.callsEmitFrame));
  assert.ok(plan.frames.every((frame) => frame.writesFrame));
  assert.equal(plan.frames[0].updateFrame.action, "capture");
  assert.equal(plan.frames[0].updateFrame.callsUpdateMobjects, true);
  assert.equal(plan.frames[0].updateFrame.callsCameraCapture, true);
  assert.equal(plan.frames[0].updateFrame.dtSeconds, 0.25);
  assert.equal(plan.frames[0].emitFrame.status, "write-frame");
  assert.equal(plan.frames[0].emitFrame.callsFileWriterWriteFrame, true);
  assert.equal(plan.frames[0].emitFrame.writesMovieFrame, true);
  assert.equal(
    plan.frames[0].updateFrame.summary,
    "updateFrame:action=capture:dt=0.250:time=0.250:capture=true:dispatch=false:sleep=0.000"
  );
  assert.equal(plan.updateMobjectsCallCount, 8);
  assert.equal(
    plan.updateMobjectObjectDtSummary,
    [
      "frame-0:curve-reveal=curve:starting-mobject@0.250;dot-pop=dot:starting-mobject@0.250",
      "frame-1:curve-reveal=curve:starting-mobject@0.250;dot-pop=dot:starting-mobject@0.250",
      "frame-2:curve-reveal=curve:starting-mobject@0.250;dot-pop=dot:starting-mobject@0.250",
      "frame-3:curve-reveal=curve:starting-mobject@0.250;dot-pop=dot:starting-mobject@0.250"
    ].join("|")
  );
  assert.equal(plan.interpolateCallCount, 8);
  assert.equal(plan.rawAlphaOvershootCount, 2);
  assert.equal(plan.rawAlphaOvershootAnimationIds, "dot-pop");
  assert.equal(plan.updateFrameCallCount, 4);
  assert.equal(
    plan.updateFrameActionSummary,
    "update-frame-actions:frames=4:capture=4:dispatch=0:skip=0:end=0:actions=capture,capture,capture,capture"
  );
  assert.equal(plan.emitFrameCallCount, 4);
  assert.equal(plan.writtenFrameCount, 4);
  assert.equal(plan.finalAlphaSummary, "curve-reveal=1.000,dot-pop=2.000");
  assert.equal(
    plan.frameOrderSummary,
    "frame-order:frames=4:animations=2:order=update_mobjects>interpolate>update_frame>emit_frame"
  );
  assert.equal(
    plan.frameOperationSequenceSummary,
    "frame-0:update_mobjects(curve-reveal,dot-pop)>interpolate(curve-reveal,dot-pop)>update_frame(capture,dt=0.250)>emit_frame(write-frame)|frame-1:update_mobjects(curve-reveal,dot-pop)>interpolate(curve-reveal,dot-pop)>update_frame(capture,dt=0.250)>emit_frame(write-frame)|frame-2:update_mobjects(curve-reveal,dot-pop)>interpolate(curve-reveal,dot-pop)>update_frame(capture,dt=0.250)>emit_frame(write-frame)|frame-3:update_mobjects(curve-reveal,dot-pop)>interpolate(curve-reveal,dot-pop)>update_frame(capture,dt=0.250)>emit_frame(write-frame)"
  );
  assert.equal(
    plan.rawAlphaSequenceSummary,
    "raw-alpha-sequence:frames=4:animations=2:curve-reveal=0.250|0.500|0.750|1.000;dot-pop=0.500|1.000|1.500|2.000"
  );
  assert.equal(
    plan.updateMobjectsDtSummary,
    "update-mobjects-dt:frames=4:animations=2:calls=8:dt=0.250,0.250,0.250,0.250:total=1.000"
  );
  assert.equal(
    plan.summary,
    "progressThroughAnimations:animations=2:frames=4:run=1.000:updates=8:interpolates=8:writes=4:skip=false"
  );
});

test("buildSceneProgressThroughAnimationsPlan mirrors skip_animations final-frame progression", async () => {
  const { buildSceneProgressThroughAnimationsPlan } = await importProgressThroughAnimationsModule();
  const plan = buildSceneProgressThroughAnimationsPlan({
    animations: [{ animationId: "camera-move", objectId: "camera-frame", runTime: 1.1 }],
    fps: 4,
    skipAnimations: true
  });

  assert.equal(plan.skipAnimations, true);
  assert.equal(plan.frameCount, 1);
  assert.equal(plan.finalTime, 1.1);
  assert.equal(plan.frames[0].dtSeconds, 1.1);
  assert.equal(plan.frames[0].updateFrame.action, "skip-return");
  assert.equal(plan.frames[0].updateFrame.callsCameraCapture, false);
  assert.equal(plan.frames[0].updateFrame.skipAnimations, true);
  assert.equal(plan.frames[0].emitFrame.status, "skipped");
  assert.equal(plan.frames[0].emitFrame.callsFileWriterWriteFrame, false);
  assert.equal(plan.frames[0].animationFrames[0].rawAlpha, 1);
  assert.equal(plan.emitFrameCallCount, 1);
  assert.equal(
    plan.updateFrameActionSummary,
    "update-frame-actions:frames=1:capture=0:dispatch=0:skip=1:end=0:actions=skip-return"
  );
  assert.equal(plan.rawAlphaOvershootCount, 0);
  assert.equal(plan.rawAlphaOvershootAnimationIds, "none");
  assert.equal(plan.writtenFrameCount, 0);
  assert.equal(
    plan.updateMobjectsDtSummary,
    "update-mobjects-dt:frames=1:animations=1:calls=1:dt=1.100:total=1.100"
  );
  assert.equal(
    plan.rawAlphaSequenceSummary,
    "raw-alpha-sequence:frames=1:animations=1:camera-move=1.000"
  );
  assert.equal(plan.timeProgressionSummary, "timeProgression:skip-final:run=1.100:fps=4:frames=1:final=1.100:overshoot=false");
});

test("buildSceneProgressThroughAnimationsPlan tracks update_mobjects target objects while excluding primary mobjects", async () => {
  const { buildSceneProgressThroughAnimationsPlan } = await importProgressThroughAnimationsModule();
  const plan = buildSceneProgressThroughAnimationsPlan({
    animations: [
      { animationId: "plain-fade", objectId: "plain", runTime: 0.5 },
      {
        animationId: "curve-transform",
        objectId: "curve",
        runTime: 0.5,
        targetCopyObjectId: "curve-target-copy",
        targetObjectId: "curve-target"
      }
    ],
    fps: 2,
    skipAnimations: false
  });

  assert.equal(plan.frameCount, 1);
  assert.equal(plan.updateMobjectsCallCount, 2);
  assert.equal(plan.updateMobjectObjectCallCount, 4);
  assert.equal(plan.updateMobjectExclusionPolicy, PROGRESS_THROUGH_ANIMATIONS_UPDATE_MOBJECTS_POLICY);
  assert.equal(
    plan.updateMobjectTargetSummary,
    "plain-fade:all=plain|plain:starting-mobject:updated=plain:starting-mobject:excluded=plain;curve-transform:all=curve|curve:starting-mobject|curve-target|curve-target-copy:updated=curve:starting-mobject|curve-target|curve-target-copy:excluded=curve"
  );
  assert.equal(
    plan.updateMobjectObjectDtSummary,
    "frame-0:plain-fade=plain:starting-mobject@0.500;curve-transform=curve:starting-mobject@0.500,curve-target@0.500,curve-target-copy@0.500"
  );
  assert.deepEqual(plan.frames[0].animationFrames[0].allMobjectIds, ["plain", "plain:starting-mobject"]);
  assert.deepEqual(plan.frames[0].animationFrames[0].updatedMobjectIds, ["plain:starting-mobject"]);
  assert.equal(plan.frames[0].animationFrames[0].updatedMobjectCount, 1);
  assert.equal(plan.frames[0].animationFrames[0].primaryMobjectExcluded, true);
  assert.deepEqual(plan.frames[0].animationFrames[1].allMobjectIds, [
    "curve",
    "curve:starting-mobject",
    "curve-target",
    "curve-target-copy"
  ]);
  assert.deepEqual(plan.frames[0].animationFrames[1].updatedMobjectIds, [
    "curve:starting-mobject",
    "curve-target",
    "curve-target-copy"
  ]);
  assert.equal(plan.frames[0].animationFrames[1].updatedMobjectCount, 3);
  assert.equal(plan.frames[0].animationFrames[1].primaryMobjectExcluded, true);
});

test("sceneProgressThroughAnimationsDataAttributes exposes stable browser QA evidence", async () => {
  const {
    buildSceneProgressThroughAnimationsPlan,
    sceneProgressThroughAnimationsDataAttributes
  } = await importProgressThroughAnimationsModule();
  const plan = buildSceneProgressThroughAnimationsPlan({
    animations: [{ animationId: "curve-reveal", objectId: "curve", runTime: 1 }],
    fps: 4,
    skipAnimations: false
  });

  assert.deepEqual(sceneProgressThroughAnimationsDataAttributes(plan), {
    "data-viz-manim-progress-through-animation-count": "1",
    "data-viz-manim-progress-through-emit-frame-count": "4",
    "data-viz-manim-progress-through-emit-frame-statuses": "write-frame,write-frame,write-frame,write-frame",
    "data-viz-manim-progress-through-final-alpha-summary": "curve-reveal=1.000",
    "data-viz-manim-progress-through-final-time": "1.000",
    "data-viz-manim-progress-through-fps": "4",
    "data-viz-manim-progress-through-frame-interval": "0.250",
    "data-viz-manim-progress-through-frame-policy": PROGRESS_THROUGH_ANIMATIONS_FRAME_POLICY,
    "data-viz-manim-progress-through-frame-operation-sequence":
      "frame-0:update_mobjects(curve-reveal)>interpolate(curve-reveal)>update_frame(capture,dt=0.250)>emit_frame(write-frame)|frame-1:update_mobjects(curve-reveal)>interpolate(curve-reveal)>update_frame(capture,dt=0.250)>emit_frame(write-frame)|frame-2:update_mobjects(curve-reveal)>interpolate(curve-reveal)>update_frame(capture,dt=0.250)>emit_frame(write-frame)|frame-3:update_mobjects(curve-reveal)>interpolate(curve-reveal)>update_frame(capture,dt=0.250)>emit_frame(write-frame)",
    "data-viz-manim-progress-through-frame-order-summary": "frame-order:frames=4:animations=1:order=update_mobjects>interpolate>update_frame>emit_frame",
    "data-viz-manim-progress-through-frame-count": "4",
    "data-viz-manim-progress-through-interpolate-count": "4",
    "data-viz-manim-progress-through-raw-alpha-overshoot-animation-ids": "none",
    "data-viz-manim-progress-through-raw-alpha-overshoot-count": "0",
    "data-viz-manim-progress-through-raw-alpha-sequence-summary":
      "raw-alpha-sequence:frames=4:animations=1:curve-reveal=0.250|0.500|0.750|1.000",
    "data-viz-manim-progress-through-run-time": "1.000",
    "data-viz-manim-progress-through-skip": "false",
    "data-viz-manim-progress-through-source-contract": PROGRESS_THROUGH_ANIMATIONS_SOURCE_CONTRACT,
    "data-viz-manim-progress-through-summary": plan.summary,
    "data-viz-manim-progress-through-update-frame-action-summary":
      "update-frame-actions:frames=4:capture=4:dispatch=0:skip=0:end=0:actions=capture,capture,capture,capture",
    "data-viz-manim-progress-through-update-frame-count": "4",
    "data-viz-manim-progress-through-update-mobject-exclusion-policy": PROGRESS_THROUGH_ANIMATIONS_UPDATE_MOBJECTS_POLICY,
    "data-viz-manim-progress-through-update-mobject-object-dt-summary":
      "frame-0:curve-reveal=curve:starting-mobject@0.250|frame-1:curve-reveal=curve:starting-mobject@0.250|frame-2:curve-reveal=curve:starting-mobject@0.250|frame-3:curve-reveal=curve:starting-mobject@0.250",
    "data-viz-manim-progress-through-update-mobject-object-count": "4",
    "data-viz-manim-progress-through-update-mobject-target-summary":
      "curve-reveal:all=curve|curve:starting-mobject:updated=curve:starting-mobject:excluded=curve",
    "data-viz-manim-progress-through-update-mobjects-count": "4",
    "data-viz-manim-progress-through-update-mobjects-dt-summary":
      "update-mobjects-dt:frames=4:animations=1:calls=4:dt=0.250,0.250,0.250,0.250:total=1.000",
    "data-viz-manim-progress-through-written-frame-count": "4"
  });
});

test("serializeSceneProgressThroughAnimationsPlan emits escaped deterministic browser JSON", async () => {
  const {
    buildSceneProgressThroughAnimationsPlan,
    serializeSceneProgressThroughAnimationsPlan
  } = await importProgressThroughAnimationsModule();
  const plan = buildSceneProgressThroughAnimationsPlan({
    animations: [{ animationId: "<progress-through>", objectId: "curve-</script>", runTime: 1 }],
    fps: 2,
    skipAnimations: false
  });
  const serialized = serializeSceneProgressThroughAnimationsPlan(plan);

  assert.equal(
    serializeSceneProgressThroughAnimationsPlan(JSON.parse(JSON.stringify(plan)) as MathSceneProgressThroughAnimationsPlan),
    serialized
  );
  assert.doesNotMatch(serialized, /<progress-through>/);
  assert.doesNotMatch(serialized, /<\/script/i);
  assert.match(serialized, /\\u003cprogress-through>/);
  assert.deepEqual(JSON.parse(serialized), plan);
});

test("Scene progress-through-animations stays pure and documents the source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathSceneProgressThroughAnimations.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /progress_through_animations/);
  assert.match(source, /get_animation_time_progression/);
  assert.match(source, /get_all_mobjects_to_update/);
  assert.match(source, /primaryMobjectExcluded/);
  assert.match(source, /targetCopyObjectId/);
  assert.match(source, /update_mobjects/);
  assert.match(source, /interpolate/);
  assert.match(source, /update_frame/);
  assert.match(source, /emit_frame/);
  assert.match(source, /PROGRESS_THROUGH_ANIMATIONS_FRAME_POLICY/);
  assert.match(source, /PROGRESS_THROUGH_ANIMATIONS_SOURCE_CONTRACT/);
  assert.match(source, /buildSceneEmitFramePlan/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|\bdocument\b|setTimeout|requestAnimationFrame/);
  assert.doesNotMatch(source, /\bwindow(?:\.|\[)/);
});
