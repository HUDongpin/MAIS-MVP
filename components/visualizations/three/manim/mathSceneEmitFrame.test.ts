import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  SCENE_EMIT_FRAME_SOURCE_CONTRACT,
  SCENE_EMIT_FRAME_WRITE_POLICY
} from "./mathSceneEmitFrame";

type MathSceneEmitFrameStatus = "no-movie-output" | "not-called" | "skipped" | "write-frame";

type MathSceneEmitFramePlan = {
  cameraId: string;
  callsFileWriterWriteFrame: boolean;
  callsSceneEmitFrame: boolean;
  emitFrameVersion: "mais-manim-emit-frame/v1";
  frameIndex: number;
  progressDisplayActive: boolean;
  readsCameraRawFboData: boolean;
  skipAnimations: boolean;
  sourceContract: typeof SCENE_EMIT_FRAME_SOURCE_CONTRACT;
  status: MathSceneEmitFrameStatus;
  summary: string;
  updatesProgressDisplay: boolean;
  writePolicy: typeof SCENE_EMIT_FRAME_WRITE_POLICY;
  writesMovieFrame: boolean;
  writeToMovie: boolean;
};

type MathSceneEmitFrameModule = {
  buildSceneEmitFramePlan: (input: {
    called?: boolean;
    cameraId?: string;
    frameIndex?: number;
    progressDisplayActive?: boolean;
    skipAnimations?: boolean;
    writeToMovie?: boolean;
  }) => MathSceneEmitFramePlan;
  sceneEmitFrameDataAttributes: (plan: MathSceneEmitFramePlan) => Record<string, string>;
  serializeSceneEmitFramePlan: (plan: MathSceneEmitFramePlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneEmitFrame.ts";

async function importSceneEmitFrameModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.emit_frame contract module");
  return await import("./mathSceneEmitFrame") as MathSceneEmitFrameModule;
}

test("buildSceneEmitFramePlan writes a movie frame through SceneFileWriter when animations are not skipped", async () => {
  const { buildSceneEmitFramePlan } = await importSceneEmitFrameModule();
  const plan = buildSceneEmitFramePlan({
    cameraId: "teaching-camera",
    frameIndex: 2,
    progressDisplayActive: true,
    skipAnimations: false,
    writeToMovie: true
  });

  assert.equal(plan.emitFrameVersion, "mais-manim-emit-frame/v1");
  assert.equal(plan.cameraId, "teaching-camera");
  assert.equal(plan.frameIndex, 2);
  assert.equal(plan.callsSceneEmitFrame, true);
  assert.equal(plan.callsFileWriterWriteFrame, true);
  assert.equal(plan.writesMovieFrame, true);
  assert.equal(plan.readsCameraRawFboData, true);
  assert.equal(plan.sourceContract, SCENE_EMIT_FRAME_SOURCE_CONTRACT);
  assert.equal(plan.updatesProgressDisplay, true);
  assert.equal(plan.writePolicy, SCENE_EMIT_FRAME_WRITE_POLICY);
  assert.equal(plan.status, "write-frame");
  assert.equal(
    plan.summary,
    "emitFrame:status=write-frame:frame=2:skip=false:writeToMovie=true:write=true"
  );
});

test("buildSceneEmitFramePlan mirrors Scene.emit_frame skip_animations guard", async () => {
  const { buildSceneEmitFramePlan } = await importSceneEmitFrameModule();
  const plan = buildSceneEmitFramePlan({
    frameIndex: 3,
    progressDisplayActive: true,
    skipAnimations: true,
    writeToMovie: true
  });

  assert.equal(plan.callsSceneEmitFrame, true);
  assert.equal(plan.callsFileWriterWriteFrame, false);
  assert.equal(plan.writesMovieFrame, false);
  assert.equal(plan.readsCameraRawFboData, false);
  assert.equal(plan.updatesProgressDisplay, false);
  assert.equal(plan.status, "skipped");
});

test("buildSceneEmitFramePlan distinguishes write_frame no-op when movie output is disabled", async () => {
  const { buildSceneEmitFramePlan } = await importSceneEmitFrameModule();
  const plan = buildSceneEmitFramePlan({
    frameIndex: 4,
    skipAnimations: false,
    writeToMovie: false
  });

  assert.equal(plan.callsSceneEmitFrame, true);
  assert.equal(plan.callsFileWriterWriteFrame, true);
  assert.equal(plan.writesMovieFrame, false);
  assert.equal(plan.readsCameraRawFboData, false);
  assert.equal(plan.updatesProgressDisplay, false);
  assert.equal(plan.status, "no-movie-output");
});

test("buildSceneEmitFramePlan records hold-loop frames that never call emit_frame", async () => {
  const { buildSceneEmitFramePlan } = await importSceneEmitFrameModule();
  const plan = buildSceneEmitFramePlan({
    called: false,
    frameIndex: 5,
    skipAnimations: false
  });

  assert.equal(plan.callsSceneEmitFrame, false);
  assert.equal(plan.callsFileWriterWriteFrame, false);
  assert.equal(plan.writesMovieFrame, false);
  assert.equal(plan.status, "not-called");
});

test("sceneEmitFrameDataAttributes exposes stable browser QA evidence", async () => {
  const { buildSceneEmitFramePlan, sceneEmitFrameDataAttributes } = await importSceneEmitFrameModule();
  const plan = buildSceneEmitFramePlan({
    cameraId: "camera-frame",
    frameIndex: 1,
    progressDisplayActive: false,
    skipAnimations: false,
    writeToMovie: true
  });

  assert.deepEqual(sceneEmitFrameDataAttributes(plan), {
    "data-viz-manim-emit-frame-camera-id": "camera-frame",
    "data-viz-manim-emit-frame-calls-file-writer": "true",
    "data-viz-manim-emit-frame-called": "true",
    "data-viz-manim-emit-frame-frame-index": "1",
    "data-viz-manim-emit-frame-progress-display": "false",
    "data-viz-manim-emit-frame-raw-fbo": "true",
    "data-viz-manim-emit-frame-skip": "false",
    "data-viz-manim-emit-frame-source-contract": SCENE_EMIT_FRAME_SOURCE_CONTRACT,
    "data-viz-manim-emit-frame-status": "write-frame",
    "data-viz-manim-emit-frame-summary": plan.summary,
    "data-viz-manim-emit-frame-updates-progress-display": "false",
    "data-viz-manim-emit-frame-write-policy": SCENE_EMIT_FRAME_WRITE_POLICY,
    "data-viz-manim-emit-frame-write-movie": "true",
    "data-viz-manim-emit-frame-write-to-movie": "true"
  });
});

test("serializeSceneEmitFramePlan emits escaped deterministic browser JSON", async () => {
  const {
    buildSceneEmitFramePlan,
    serializeSceneEmitFramePlan
  } = await importSceneEmitFrameModule();
  const plan = buildSceneEmitFramePlan({
    cameraId: "<emit-frame></script>",
    frameIndex: 7,
    progressDisplayActive: true,
    skipAnimations: false,
    writeToMovie: true
  });
  const serialized = serializeSceneEmitFramePlan(plan);

  assert.equal(
    serializeSceneEmitFramePlan(JSON.parse(JSON.stringify(plan)) as MathSceneEmitFramePlan),
    serialized
  );
  assert.doesNotMatch(serialized, /<emit-frame>/);
  assert.doesNotMatch(serialized, /<\/script/i);
  assert.match(serialized, /\\u003cemit-frame>/);
  assert.deepEqual(JSON.parse(serialized), plan);
});

test("Scene emit-frame stays pure and documents the source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathSceneEmitFrame.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /emit_frame/);
  assert.match(source, /skip_animations/);
  assert.match(source, /file_writer\.write_frame/);
  assert.match(source, /SceneFileWriter\.write_frame/);
  assert.match(source, /write_to_movie/);
  assert.match(source, /get_raw_fbo_data/);
  assert.match(source, /SCENE_EMIT_FRAME_SOURCE_CONTRACT/);
  assert.match(source, /SCENE_EMIT_FRAME_WRITE_POLICY/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|ThreeDLabCanvas/);
});
