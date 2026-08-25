import assert from "node:assert/strict";
import test from "node:test";

import * as localAudio from "./teacherVisualizationLocalAudio";
import {
  hashTeacherVisualizationAudioBlob,
  normalizeTeacherVisualizationAudioMimeType,
  teacherVisualizationMaximumLocalAudioBytes,
  validateTeacherVisualizationAudioDuration,
  validateTeacherVisualizationAudioFile
} from "./teacherVisualizationLocalAudio";

function requireLocalAudioHelper<T>(name: string): T {
  const candidate = (localAudio as unknown as Record<string, unknown>)[name];
  assert.equal(typeof candidate, "function", `${name} must be a pure exported helper`);
  return candidate as T;
}

test("local narration accepts only package-validator MIME types and hashes bytes locally", async () => {
  assert.equal(normalizeTeacherVisualizationAudioMimeType("audio/webm;codecs=opus"), "audio/webm");
  assert.equal(normalizeTeacherVisualizationAudioMimeType("audio/x-wav"), "audio/wav");
  assert.equal(normalizeTeacherVisualizationAudioMimeType("application/octet-stream"), null);

  const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: "audio/webm" });
  const result = validateTeacherVisualizationAudioFile({ name: "voice.webm", size: blob.size, type: blob.type });
  assert.equal(result.ok, true);
  assert.match(await hashTeacherVisualizationAudioBlob(blob), /^sha256-[a-f0-9]{64}$/);
});

test("microphone denial is classified as non-blocking", () => {
  const result = validateTeacherVisualizationAudioFile({
    name: "voice.exe",
    size: 10,
    type: "application/octet-stream"
  });
  assert.deepEqual(result, { ok: false, code: "UNSUPPORTED_AUDIO_MIME" });
});

test("the shared local audio byte ceiling also rejects an oversized microphone Blob", () => {
  assert.equal(teacherVisualizationMaximumLocalAudioBytes, 100 * 1024 * 1024);
  assert.deepEqual(validateTeacherVisualizationAudioFile({
    name: "microphone-narration.webm",
    size: teacherVisualizationMaximumLocalAudioBytes + 1,
    type: "audio/webm"
  }), { ok: false, code: "AUDIO_TOO_LARGE" });
});

test("decoded audio duration fails closed instead of inventing a 0.001 second value", () => {
  assert.deepEqual(validateTeacherVisualizationAudioDuration(Number.NaN), {
    code: "AUDIO_DECODE_FAILED",
    ok: false
  });
  assert.deepEqual(validateTeacherVisualizationAudioDuration(0), {
    code: "AUDIO_DECODE_FAILED",
    ok: false
  });
  assert.deepEqual(validateTeacherVisualizationAudioDuration(12.5), {
    durationSeconds: 12.5,
    ok: true
  });
});

test("a deferred audio decode cannot attach metadata after the workspace revision advances", async () => {
  type Target = { draftId: string; revision: number };
  const targetMatches = requireLocalAudioHelper<(
    target: Target | null,
    current: Target | null
  ) => boolean>("teacherVisualizationAudioProcessingTargetMatches");
  let resolveDecode!: () => void;
  const decode = new Promise<void>((resolve) => { resolveDecode = resolve; });
  const capturedTarget = { draftId: "draft-1", revision: 1 };
  let current = { draftId: "draft-1", revision: 1 };

  assert.equal(targetMatches(capturedTarget, current), true);
  const mayAttach = decode.then(() => targetMatches(capturedTarget, current));
  current = { draftId: "draft-1", revision: 2 };
  resolveDecode();

  assert.equal(await mayAttach, false);
  assert.equal(targetMatches(capturedTarget, { draftId: "draft-2", revision: 1 }), false);
});

test("detach is denied deterministically while a cloud save owns the revision-changing lock", () => {
  type Target = { draftId: string; revision: number };
  const captureTarget = requireLocalAudioHelper<(
    current: Target | null,
    revisionChangingBusy: boolean
  ) => Target | null>("captureTeacherVisualizationAudioProcessingTarget");
  const targetMatches = requireLocalAudioHelper<(
    target: Target | null,
    current: Target | null
  ) => boolean>("teacherVisualizationAudioProcessingTargetMatches");
  const current = { draftId: "draft-1", revision: 3 };

  const detachTargetDuringSave = captureTarget(current, true);
  assert.equal(detachTargetDuringSave, null);
  assert.equal(targetMatches(detachTargetDuringSave, current), false);
  assert.deepEqual(captureTarget(current, false), current);
});

test("microphone retry distinguishes permission denial from recorder startup failure", () => {
  const classify = requireLocalAudioHelper<(error: unknown) => string>(
    "classifyTeacherVisualizationMicrophoneStartError"
  );
  assert.equal(classify(new DOMException("denied", "NotAllowedError")), "MICROPHONE_PERMISSION_DENIED");
  assert.equal(classify(new DOMException("blocked", "SecurityError")), "MICROPHONE_PERMISSION_DENIED");
  assert.equal(classify(new Error("MediaRecorder.start failed")), "MICROPHONE_START_FAILED");
});
