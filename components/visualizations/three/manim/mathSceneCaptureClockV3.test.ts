import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  MATH_SCENE_CAPTURE_CLOCK_V3_INDEPENDENCE_CONTRACT,
  buildMathSceneCaptureFramesV3,
  runMathSceneCaptureClockV3,
  type MathSceneCaptureClockPlanV3
} from "./mathSceneCaptureClockV3";

const modulePath = "components/visualizations/three/manim/mathSceneCaptureClockV3.ts";

function plan(overrides: Partial<MathSceneCaptureClockPlanV3> = {}): MathSceneCaptureClockPlanV3 {
  return {
    fps: 30,
    frameCount: 4,
    frameTimes: [0, 1 / 30, 2 / 30, 0.1],
    ...overrides
  };
}

test("maps capture-plan frame times exactly from t=0 with stable indices and fps", () => {
  const built = buildMathSceneCaptureFramesV3(plan());
  assert.equal(built.ok, true, built.ok ? "" : JSON.stringify(built.error));
  assert.ok(built.ok);
  assert.deepEqual(built.frames, [
    { fps: 30, frameIndex: 0, timeSeconds: 0 },
    { fps: 30, frameIndex: 1, timeSeconds: 1 / 30 },
    { fps: 30, frameIndex: 2, timeSeconds: 2 / 30 },
    { fps: 30, frameIndex: 3, timeSeconds: 0.1 }
  ]);
  assert.equal(built.frames[1].timeSeconds, plan().frameTimes[1]);
  assert.ok(built.frames.every((frame, index, frames) => index === 0 || frame.timeSeconds > frames[index - 1].timeSeconds));
});

test("rejects capture plans that skip t=0, regress time, or lie about frame count", () => {
  const noZero = buildMathSceneCaptureFramesV3(plan({ frameTimes: [0.01, 0.02, 0.03, 0.04] }));
  const repeated = buildMathSceneCaptureFramesV3(plan({ frameTimes: [0, 0.03, 0.03, 0.1] }));
  const countMismatch = buildMathSceneCaptureFramesV3(plan({ frameCount: 5 }));
  const badFps = buildMathSceneCaptureFramesV3(plan({ fps: 0 }));

  for (const invalid of [noZero, repeated, countMismatch, badFps]) {
    assert.equal(invalid.ok, false);
    assert.ok(!invalid.ok);
    assert.equal(invalid.error.code, "CAPTURE_PLAN_INVALID");
  }
});

test("renders every planned frame in order without consulting ordinary playback", async () => {
  const rendered: Array<{ fps: number; frameIndex: number; timeSeconds: number }> = [];
  const run = await runMathSceneCaptureClockV3({
    capturePlan: plan(),
    renderFrame: async (frame) => {
      rendered.push(frame);
    }
  });

  assert.deepEqual(rendered, buildMathSceneCaptureFramesV3(plan()).ok
    ? (buildMathSceneCaptureFramesV3(plan()) as { ok: true; frames: typeof rendered }).frames
    : []);
  assert.deepEqual(run, {
    completedFrameCount: 4,
    durationSeconds: 0.1,
    lastFrameIndex: 3,
    ok: true
  });

  const source = fs.readFileSync(modulePath, "utf8");
  assert.match(MATH_SCENE_CAPTURE_CLOCK_V3_INDEPENDENCE_CONTRACT, /independent/i);
  assert.doesNotMatch(source, /mathScenePlayback|requestAnimationFrame|setInterval/);
});

test("aborts before rendering when cancellation is already signalled", async () => {
  let calls = 0;
  const run = await runMathSceneCaptureClockV3({
    abortSignal: { aborted: true },
    capturePlan: plan(),
    renderFrame: async () => {
      calls += 1;
    }
  });

  assert.equal(run.ok, false);
  assert.ok(!run.ok);
  assert.equal(run.error.code, "CAPTURE_ABORTED");
  assert.equal(run.completedFrameCount, 0);
  assert.equal(run.lastFrameIndex, null);
  assert.equal(calls, 0);
});

test("observes cancellation between frames without rendering stale work", async () => {
  const abortSignal = { aborted: false };
  const rendered: number[] = [];
  const run = await runMathSceneCaptureClockV3({
    abortSignal,
    capturePlan: plan(),
    renderFrame: async (frame) => {
      rendered.push(frame.frameIndex);
      abortSignal.aborted = true;
    }
  });

  assert.equal(run.ok, false);
  assert.ok(!run.ok);
  assert.equal(run.error.code, "CAPTURE_ABORTED");
  assert.equal(run.completedFrameCount, 1);
  assert.equal(run.lastFrameIndex, 0);
  assert.deepEqual(rendered, [0]);
});

test("times out at an injected deadline and reports completed evidence only", async () => {
  const nowValues = [99, 99, 101];
  const rendered: number[] = [];
  const run = await runMathSceneCaptureClockV3({
    capturePlan: plan(),
    deadlineAtMs: 100,
    nowMs: () => nowValues.shift() ?? 101,
    renderFrame: async (frame) => {
      rendered.push(frame.frameIndex);
    }
  });

  assert.equal(run.ok, false);
  assert.ok(!run.ok);
  assert.equal(run.error.code, "CAPTURE_TIMEOUT");
  assert.equal(run.completedFrameCount, 1);
  assert.equal(run.lastFrameIndex, 0);
  assert.deepEqual(rendered, [0]);
});
