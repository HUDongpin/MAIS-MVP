import assert from "node:assert/strict";
import test from "node:test";
import type { MathSceneVideoExportReadyResult } from "./mathSceneVideoExportContract";
import {
  createMathSceneVideoExportInitialState,
  transitionMathSceneVideoExportState,
  type MathSceneVideoExportState
} from "./mathSceneVideoExportStateMachine";

const hash = (character: string) => `sha256-${character.repeat(64)}`;

function readyResult(): MathSceneVideoExportReadyResult {
  return {
    audioContentHash: null,
    audioIncluded: false,
    byteCount: 32,
    captionFileName: "unit-wave.vtt",
    captionsVttContentHash: hash("b"),
    compositeEvidence: {
      captions: true,
      formulaOverlay: true,
      projectedLabels: true,
      webgl: true
    },
    createdAtIso: "2026-08-23T08:00:00.000Z",
    durationSeconds: 2,
    errorCode: null,
    exportId: "export-1",
    fileName: "unit-wave.webm",
    format: "webm",
    fps: 30,
    frameCount: 61,
    height: 720,
    mediaContentHash: hash("c"),
    metadataParsed: true,
    mimeType: "video/webm;codecs=vp9",
    packageContentHash: hash("d"),
    profileContentHash: hash("e"),
    profileId: "webm-720p",
    sceneId: "unit-wave",
    schemaVersion: "mais-manim-video-export-result/v1",
    status: "ready",
    width: 1280
  };
}

function apply(
  state: MathSceneVideoExportState,
  event: Parameters<typeof transitionMathSceneVideoExportState>[1]
) {
  const transitioned = transitionMathSceneVideoExportState(state, event);
  assert.equal(transitioned.ok, true, transitioned.ok ? "" : JSON.stringify(transitioned.error));
  assert.ok(transitioned.ok);
  return transitioned.state;
}

test("runs the legal export lifecycle without mutating prior snapshots", () => {
  const idle = createMathSceneVideoExportInitialState();
  assert.deepEqual(idle, {
    attempt: 0,
    error: null,
    requestId: null,
    result: null,
    status: "idle"
  });

  const preparing = apply(idle, { requestId: "request-1", type: "prepare" });
  const capturing = apply(preparing, { attempt: 1, type: "capture" });
  const encoding = apply(capturing, { attempt: 1, type: "encode" });
  const encodedResult = readyResult();
  const ready = apply(encoding, { attempt: 1, result: encodedResult, type: "succeed" });

  assert.equal(idle.status, "idle");
  assert.equal(preparing.status, "preparing");
  assert.equal(capturing.status, "capturing");
  assert.equal(encoding.status, "encoding");
  assert.equal(ready.status, "ready");
  assert.equal(ready.attempt, 1);
  assert.equal(ready.requestId, "request-1");
  assert.deepEqual(ready.result, readyResult());
  assert.notStrictEqual(ready.result, encodedResult);
});

test("rejects illegal and planned transitions while preserving the current state", () => {
  const idle = createMathSceneVideoExportInitialState();
  const illegal = transitionMathSceneVideoExportState(idle, { attempt: 0, type: "encode" });
  assert.equal(illegal.ok, false);
  assert.ok(!illegal.ok);
  assert.equal(illegal.error.code, "INVALID_STATE_TRANSITION");
  assert.strictEqual(illegal.state, idle);

  const planned = transitionMathSceneVideoExportState(
    idle,
    { type: "planned" } as unknown as Parameters<typeof transitionMathSceneVideoExportState>[1]
  );
  assert.equal(planned.ok, false);
  assert.ok(!planned.ok);
  assert.equal(planned.error.code, "INVALID_STATE_TRANSITION");
  assert.strictEqual(planned.state, idle);
});

test("cancels active work idempotently and retries with a new attempt", () => {
  const preparing = apply(createMathSceneVideoExportInitialState(), {
    requestId: "request-1",
    type: "prepare"
  });
  const cancelled = apply(preparing, { attempt: 1, type: "cancel" });
  const cancelledAgain = apply(cancelled, { attempt: 1, type: "cancel" });
  const retried = apply(cancelledAgain, { requestId: "request-2", type: "retry" });

  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.error?.code, "CAPTURE_ABORTED");
  assert.deepEqual(cancelledAgain, cancelled);
  assert.equal(retried.status, "preparing");
  assert.equal(retried.attempt, 2);
  assert.equal(retried.requestId, "request-2");
  assert.equal(retried.error, null);
  assert.equal(retried.result, null);
});

test("rejects stale callbacks from an earlier retry attempt", () => {
  const first = apply(createMathSceneVideoExportInitialState(), { requestId: "request-1", type: "prepare" });
  const failed = apply(first, {
    attempt: 1,
    error: { code: "VIDEO_METADATA_PARSE_FAILED", message: "metadata failed", path: "metadata" },
    type: "fail"
  });
  const retried = apply(failed, { requestId: "request-2", type: "retry" });
  const stale = transitionMathSceneVideoExportState(retried, { attempt: 1, type: "capture" });

  assert.equal(stale.ok, false);
  assert.ok(!stale.ok);
  assert.equal(stale.error.code, "STALE_EXPORT_ATTEMPT");
  assert.strictEqual(stale.state, retried);
});

test("records unsupported capability checks and permits an explicit retry", () => {
  const preparing = apply(createMathSceneVideoExportInitialState(), { requestId: "request-1", type: "prepare" });
  const unsupported = apply(preparing, {
    attempt: 1,
    error: {
      code: "MEDIA_RECORDER_UNAVAILABLE",
      message: "MediaRecorder is unavailable.",
      path: "MediaRecorder"
    },
    type: "unsupported"
  });
  const retry = apply(unsupported, { requestId: "request-2", type: "retry" });

  assert.equal(unsupported.status, "unsupported");
  assert.equal(unsupported.error?.code, "MEDIA_RECORDER_UNAVAILABLE");
  assert.equal(retry.status, "preparing");
  assert.equal(retry.attempt, 2);
});

test("refuses a ready transition when the result has not been parsed", () => {
  const preparing = apply(createMathSceneVideoExportInitialState(), { requestId: "request-1", type: "prepare" });
  const capturing = apply(preparing, { attempt: 1, type: "capture" });
  const encoding = apply(capturing, { attempt: 1, type: "encode" });
  const invalidResult = { ...readyResult(), metadataParsed: false };
  const rejected = transitionMathSceneVideoExportState(encoding, {
    attempt: 1,
    result: invalidResult as unknown as MathSceneVideoExportReadyResult,
    type: "succeed"
  });

  assert.equal(rejected.ok, false);
  assert.ok(!rejected.ok);
  assert.equal(rejected.error.code, "READY_RESULT_INVALID");
  assert.strictEqual(rejected.state, encoding);
});
