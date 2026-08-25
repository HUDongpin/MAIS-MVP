import assert from "node:assert/strict";
import test from "node:test";
import type { MathSceneCaptureFrameV3 } from "./mathSceneCaptureClockV3";
import { MATH_SCENE_VIDEO_EXPORT_RESULT_FIELDS } from "./mathSceneVideoExportContract";
import {
  MATH_SCENE_BROWSER_WEBM_MAX_BLOB_BYTES,
  MATH_SCENE_BROWSER_WEBM_MAX_CHUNKS,
  MATH_SCENE_BROWSER_WEBM_MAX_DURATION_SECONDS,
  MATH_SCENE_BROWSER_WEBM_MAX_FRAME_COUNT,
  MATH_SCENE_BROWSER_WEBM_MAX_PIXEL_WORK,
  executeMathSceneBrowserWebmV3,
  preflightMathSceneBrowserWebmV3,
  validateMathSceneBrowserWebmChunkV3,
  type MathSceneBrowserMediaRecorderV3,
  type MathSceneBrowserMediaStreamTrackV3,
  type MathSceneBrowserMediaStreamV3,
  type MathSceneBrowserWebmAdapterV3,
  type MathSceneBrowserWebmExportRequestV3
} from "./mathSceneBrowserWebmExecutorV3";

const HASH_A = `sha256-${"a".repeat(64)}`;
const HASH_B = `sha256-${"b".repeat(64)}`;
const HASH_C = `sha256-${"c".repeat(64)}`;
const HASH_D = `sha256-${"d".repeat(64)}`;
const EBML = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x42, 0x86, 0x81, 0x01]);

type RecorderListener = (event: { data?: Blob }) => void;

class FakeTrack implements MathSceneBrowserMediaStreamTrackV3 {
  readonly kind: string;
  readonly clones: FakeTrack[] = [];
  stopCalls = 0;

  constructor(kind: string) {
    this.kind = kind;
  }

  clone() {
    const clone = new FakeTrack(this.kind);
    this.clones.push(clone);
    return clone;
  }

  stop() {
    this.stopCalls += 1;
  }
}

class FakeStream implements MathSceneBrowserMediaStreamV3 {
  readonly tracks: MathSceneBrowserMediaStreamTrackV3[];

  constructor(tracks: MathSceneBrowserMediaStreamTrackV3[] = [new FakeTrack("video")]) {
    this.tracks = tracks;
  }

  addTrack(track: MathSceneBrowserMediaStreamTrackV3) {
    this.tracks.push(track);
  }

  getTracks() {
    return [...this.tracks];
  }
}

class FakeRecorder implements MathSceneBrowserMediaRecorderV3 {
  mimeType: string;
  state: "inactive" | "paused" | "recording" = "inactive";
  readonly listeners = new Map<string, Set<RecorderListener>>();
  readonly chunks: Blob[];
  emitRuntimeErrorOnStart = false;
  startThrows = false;
  stopEmits = true;
  stopCalls = 0;
  startTimesliceMs: number | undefined;

  constructor(mimeType: string, chunks?: Blob[]) {
    this.mimeType = mimeType;
    this.chunks = chunks ?? [new Blob([EBML], { type: mimeType })];
  }

  addEventListener(type: "dataavailable" | "error" | "stop", listener: RecorderListener) {
    const listeners = this.listeners.get(type) ?? new Set<RecorderListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: "dataavailable" | "error" | "stop", listener: RecorderListener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: "dataavailable" | "error" | "stop", event: { data?: Blob } = {}) {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener(event);
  }

  requestData() {}

  start(timesliceMs?: number) {
    if (this.startThrows) throw new Error("private recorder detail");
    this.startTimesliceMs = timesliceMs;
    this.state = "recording";
    if (this.emitRuntimeErrorOnStart) queueMicrotask(() => this.emit("error"));
  }

  stop() {
    this.stopCalls += 1;
    this.state = "inactive";
    if (!this.stopEmits) return;
    queueMicrotask(() => {
      for (const chunk of this.chunks) this.emit("dataavailable", { data: chunk });
      this.emit("stop");
    });
  }
}

type HarnessOptions = {
  attachAudio?: boolean;
  chunks?: Blob[];
  cleanupAudioThrows?: boolean;
  metadata?: { audioTrackCount?: number | null; durationSeconds: number; height: number; width: number };
  metadataAudioTrackCount?: number | null;
  recorderMimeType?: string;
  recorderError?: boolean;
  startThrows?: boolean;
  stopEmits?: boolean;
  timeoutImmediately?: boolean;
  fireTimeoutMs?: number;
  supported?: (mimeType: string) => boolean;
  videoTrack?: boolean;
};

function harness(options: HarnessOptions = {}) {
  const audioMixSessions: Array<{ cleanupCalls: number; startCalls: number; track: FakeTrack }> = [];
  const streams: FakeStream[] = [];
  const recorders: FakeRecorder[] = [];
  const pacing: number[] = [];
  const clearedTimers: unknown[] = [];
  let timer = 0;
  let timeMs = 1_000;
  const adapter: MathSceneBrowserWebmAdapterV3 = {
    captureStream: () => {
      const stream = new FakeStream(options.videoTrack === false ? [] : undefined);
      if (options.attachAudio === false) stream.addTrack = () => undefined;
      streams.push(stream);
      return stream;
    },
    clearTimeout: (handle) => clearedTimers.push(handle),
    createMediaRecorder: (_stream, { mimeType }) => {
      const recorder = new FakeRecorder(options.recorderMimeType ?? mimeType, options.chunks);
      recorder.emitRuntimeErrorOnStart = options.recorderError ?? false;
      recorder.startThrows = options.startThrows ?? false;
      recorder.stopEmits = options.stopEmits ?? true;
      recorders.push(recorder);
      return recorder;
    },
    digestBlobSha256: async (blob) => blob.type === "text/vtt"
      ? HASH_C
      : blob.type.startsWith("audio/")
        ? HASH_B
        : HASH_D,
    hasCanvasCaptureStream: () => true,
    hasMediaRecorder: () => true,
    isTypeSupported: (mimeType) => options.supported?.(mimeType) ?? true,
    mixAudioBlobToTrack: async () => {
      const session = { cleanupCalls: 0, startCalls: 0, track: new FakeTrack("audio") };
      audioMixSessions.push(session);
      return {
        cleanup: () => {
          session.cleanupCalls += 1;
          if (options.cleanupAudioThrows) throw new Error("private cleanup detail");
        },
        start: () => { session.startCalls += 1; },
        track: session.track
      };
    },
    nowIso: () => "2026-08-23T08:00:00.000Z",
    nowMs: () => timeMs,
    parseVideoMetadata: async () => ({
      audioTrackCount: options.metadata?.audioTrackCount ?? options.metadataAudioTrackCount ?? null,
      durationSeconds: options.metadata?.durationSeconds ?? 1.5,
      height: options.metadata?.height ?? 720,
      width: options.metadata?.width ?? 1280
    }),
    pace: async (milliseconds, signal) => {
      pacing.push(milliseconds);
      if (signal.aborted) throw new Error("aborted pacing");
      timeMs += milliseconds;
    },
    setTimeout: (callback, timeoutMs) => {
      timer += 1;
      if (options.timeoutImmediately && timeoutMs === options.fireTimeoutMs) queueMicrotask(callback);
      return timer;
    }
  };
  return {
    adapter,
    advanceTime: (milliseconds: number) => { timeMs += milliseconds; },
    audioMixSessions,
    clearedTimers,
    pacing,
    recorders,
    streams
  };
}

function request(
  adapter: MathSceneBrowserWebmAdapterV3,
  overrides: Partial<MathSceneBrowserWebmExportRequestV3> = {}
): MathSceneBrowserWebmExportRequestV3 {
  return {
    adapter,
    audio: null,
    captions: {
      blob: new Blob(["WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHeight becomes sine.\n"], {
        type: "text/vtt"
      }),
      fileName: "unit-wave.vtt"
    },
    capturePlan: {
      fps: 2,
      frameCount: 3,
      frameTimes: [0, 0.5, 1]
    },
    exportId: "export-1",
    fileName: "unit-wave.webm",
    packageContentHash: HASH_A,
    profileContentHash: HASH_B,
    profileId: "webm-720p",
    requestId: "request-1",
    sceneId: "three-trig-unit-wave",
    surface: {
      canvas: { height: 720, width: 1280 } as HTMLCanvasElement,
      compositeEvidence: {
        captions: true,
        formulaOverlay: true,
        projectedLabels: true,
        webgl: true
      },
      renderFrame: async () => undefined
    },
    ...overrides
  };
}

test("captures exact plan times from t=0, parses media, and reaches ready", async () => {
  const h = harness();
  const rendered: MathSceneCaptureFrameV3[] = [];
  const states: string[] = [];
  const result = await executeMathSceneBrowserWebmV3(request(h.adapter, {
    onStateChange: (state) => states.push(state.status),
    surface: {
      ...request(h.adapter).surface,
      renderFrame: async (frame) => {
        rendered.push(frame);
      }
    }
  }));

  assert.equal(result.ok, true, result.ok ? "" : JSON.stringify(result.error));
  assert.ok(result.ok);
  assert.deepEqual(rendered.map((frame) => [frame.frameIndex, frame.timeSeconds]), [
    [0, 0],
    [1, 0.5],
    [2, 1]
  ]);
  assert.deepEqual(h.pacing, [500, 500, 500]);
  assert.deepEqual(states, ["idle", "preparing", "capturing", "encoding", "ready"]);
  assert.equal(result.blob.size, EBML.byteLength);
  assert.equal(result.result.byteCount, EBML.byteLength);
  assert.equal(result.result.format, "webm");
  assert.equal(result.result.errorCode, null);
  assert.equal(result.result.mediaContentHash, HASH_D);
  assert.equal(result.result.metadataParsed, true);
  assert.equal(result.result.durationSeconds, 1.5);
  assert.equal(result.result.audioIncluded, false);
  assert.equal(result.result.captionFileName, "unit-wave.vtt");
  assert.equal(result.result.captionsVttContentHash, HASH_C);
  assert.equal(result.captionArtifact?.blob.type, "text/vtt");
  assert.match(await result.captionArtifact!.blob.text(), /^WEBVTT/u);
  assert.deepEqual(Object.keys(result.result).sort(), [...MATH_SCENE_VIDEO_EXPORT_RESULT_FIELDS].sort());
  assert.deepEqual(result.stateHistory.map((state) => state.status), states);
  assert.equal(h.streams.length, 2, "one capability probe and one real capture stream");
  assert.ok(h.streams.every((stream) => stream.getTracks().every((track) => (track as FakeTrack).stopCalls === 1)));
  assert.ok(h.recorders.every((recorder) => [...recorder.listeners.values()].every((set) => set.size === 0)));
  assert.equal(h.recorders.at(-1)?.startTimesliceMs, 1_000, "MediaRecorder chunks are requested at a bounded interval");
});

test("paces against absolute frame deadlines so render cost does not accumulate", async () => {
  const h = harness();
  const renderCosts = [120, 300, 50];
  const result = await executeMathSceneBrowserWebmV3(request(h.adapter, {
    surface: {
      ...request(h.adapter).surface,
      renderFrame: (frame) => h.advanceTime(renderCosts[frame.frameIndex]!)
    }
  }));
  assert.equal(result.ok, true, result.ok ? "" : JSON.stringify(result.error));
  assert.deepEqual(h.pacing, [380, 200, 450]);
});

test("falls through VP9 to VP8 and reports unsupported without starting capture", async () => {
  const fallback = harness({ supported: (mimeType) => !mimeType.includes("vp9") });
  const vp8 = await executeMathSceneBrowserWebmV3(request(fallback.adapter));
  assert.equal(vp8.ok, true, vp8.ok ? "" : JSON.stringify(vp8.error));
  assert.ok(vp8.ok);
  assert.equal(vp8.result.mimeType, "video/webm;codecs=vp8");

  const unavailable = harness({ supported: () => false });
  const unsupported = await executeMathSceneBrowserWebmV3(request(unavailable.adapter));
  assert.equal(unsupported.ok, false);
  assert.ok(!unsupported.ok);
  assert.equal(unsupported.status, "unsupported");
  assert.equal(unsupported.error.code, "MEDIA_RECORDER_MIME_UNSUPPORTED");
  assert.deepEqual(unsupported.stateHistory.map((state) => state.status), ["idle", "preparing", "unsupported"]);
  assert.equal(unavailable.streams.length, 0);
});

test("cancels after a rendered frame without allowing ordinary playback time into capture", async () => {
  const h = harness();
  const controller = new AbortController();
  const rendered: number[] = [];
  const result = await executeMathSceneBrowserWebmV3(request(h.adapter, {
    abortSignal: controller.signal,
    surface: {
      ...request(h.adapter).surface,
      renderFrame: (frame) => {
        rendered.push(frame.timeSeconds);
        controller.abort();
      }
    }
  }));

  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.equal(result.status, "cancelled");
  assert.equal(result.error.code, "CAPTURE_ABORTED");
  assert.deepEqual(rendered, [0]);
  assert.deepEqual(result.stateHistory.map((state) => state.status), ["idle", "preparing", "capturing", "cancelled"]);
  assert.ok(h.streams.every((stream) => stream.getTracks().every((track) => (track as FakeTrack).stopCalls === 1)));
});

test("cancellation does not wait for a renderer promise that has stopped responding", async () => {
  const h = harness();
  const controller = new AbortController();
  const receivedSignals: AbortSignal[] = [];
  const exportPromise = executeMathSceneBrowserWebmV3(request(h.adapter, {
    abortSignal: controller.signal,
    surface: {
      ...request(h.adapter).surface,
      renderFrame: (_frame, signal) => {
        receivedSignals.push(signal);
        return new Promise<void>(() => undefined);
      }
    }
  }));
  queueMicrotask(() => controller.abort());
  const result = await Promise.race([
    exportPromise,
    new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error("cancel hung")), 100))
  ]);
  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.equal(result.status, "cancelled");
  assert.equal(receivedSignals[0]?.aborted, true);
});

test("maps recorder runtime errors, start failures, and stop timeout to explicit failures", async () => {
  const runtimeHarness = harness({ recorderError: true });
  const runtime = await executeMathSceneBrowserWebmV3(request(runtimeHarness.adapter));
  assert.equal(runtime.ok, false);
  assert.ok(!runtime.ok);
  assert.equal(runtime.error.code, "MEDIA_RECORDER_RUNTIME_FAILED");

  const startHarness = harness({ startThrows: true });
  const start = await executeMathSceneBrowserWebmV3(request(startHarness.adapter));
  assert.equal(start.ok, false);
  assert.ok(!start.ok);
  assert.equal(start.error.code, "MEDIA_RECORDER_START_FAILED");
  assert.doesNotMatch(start.error.message, /private recorder detail/i);

  const timeoutHarness = harness({ fireTimeoutMs: 1, stopEmits: false, timeoutImmediately: true });
  const timeout = await executeMathSceneBrowserWebmV3(request(timeoutHarness.adapter, {
    recorderStopTimeoutMs: 1
  }));
  assert.equal(timeout.ok, false);
  assert.ok(!timeout.ok);
  assert.equal(timeout.error.code, "MEDIA_RECORDER_STOP_TIMEOUT");
  assert.equal(timeout.status, "failed");
  assert.ok(timeoutHarness.recorders.at(-1)?.stopCalls);
});

test("rejects empty output and parsed metadata mismatches before ready", async () => {
  const emptyHarness = harness({ chunks: [new Blob([], { type: "video/webm;codecs=vp9" })] });
  const empty = await executeMathSceneBrowserWebmV3(request(emptyHarness.adapter));
  assert.equal(empty.ok, false);
  assert.ok(!empty.ok);
  assert.equal(empty.error.code, "VIDEO_BLOB_EMPTY");

  const mismatchHarness = harness({
    metadata: { durationSeconds: 1.5, height: 360, width: 1280 }
  });
  const mismatch = await executeMathSceneBrowserWebmV3(request(mismatchHarness.adapter));
  assert.equal(mismatch.ok, false);
  assert.ok(!mismatch.ok);
  assert.equal(mismatch.error.code, "VIDEO_METADATA_MISMATCH");
  assert.equal(mismatch.state.result, null);
});

test("refuses to relabel recorder output when the constructed MIME disagrees", async () => {
  const h = harness({ recorderMimeType: "video/webm;codecs=vp8" });
  const result = await executeMathSceneBrowserWebmV3(request(h.adapter));
  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.equal(result.error.code, "VIDEO_MIME_MISMATCH");
  assert.equal(h.recorders.at(-1)?.state, "inactive");
});

test("refuses capture streams without an actual video track", async () => {
  const h = harness({ videoTrack: false });
  const result = await executeMathSceneBrowserWebmV3(request(h.adapter));
  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.equal(result.error.code, "CANVAS_CAPTURE_STREAM_UNAVAILABLE");
  assert.equal(h.recorders.length, 1, "only the capability probe recorder is constructed");
});

test("claims audio only after hashing real local bytes and observing one encoded audio track", async () => {
  const h = harness({ metadataAudioTrackCount: 1 });
  const result = await executeMathSceneBrowserWebmV3(request(h.adapter, {
    audio: {
      blob: new Blob(["real local audio bytes"], { type: "audio/wav" }),
      fileName: "narration.wav"
    },
    captions: null
  }));

  assert.equal(result.ok, true, result.ok ? "" : JSON.stringify(result.error));
  assert.ok(result.ok);
  assert.equal(result.result.audioIncluded, true);
  assert.equal(result.result.audioContentHash, HASH_B);
  assert.equal(result.result.captionFileName, null);
  assert.equal(result.result.captionsVttContentHash, null);
  assert.equal(h.audioMixSessions.length, 1);
  assert.equal(h.audioMixSessions[0]!.track.stopCalls, 1);
  assert.equal(h.audioMixSessions[0]!.cleanupCalls, 1);
  assert.equal(h.audioMixSessions[0]!.startCalls, 1);
  assert.equal(h.streams.at(-1)?.getTracks().filter((track) => track.kind === "audio").length, 1);
});

test("does not claim audio inclusion when the capture stream rejects the Web Audio track", async () => {
  const h = harness({ attachAudio: false });
  const result = await executeMathSceneBrowserWebmV3(request(h.adapter, {
    audio: {
      blob: new Blob(["real local audio bytes"], { type: "audio/wav" }),
      fileName: "narration.wav"
    }
  }));
  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.equal(result.error.code, "AUDIO_MIX_FAILED");
  assert.equal(h.audioMixSessions[0]!.track.stopCalls, 0, "unretained tracks are released by mixer cleanup");
  assert.equal(h.audioMixSessions[0]!.cleanupCalls, 1);
});

test("fails closed when encoded audio evidence is unavailable or source bytes are missing", async () => {
  const h = harness({ metadataAudioTrackCount: null });
  const unobserved = await executeMathSceneBrowserWebmV3(request(h.adapter, {
    audio: {
      blob: new Blob(["audio"], { type: "audio/wav" }),
      fileName: "narration.wav"
    }
  }));
  assert.equal(unobserved.ok, false);
  assert.ok(!unobserved.ok);
  assert.equal(unobserved.error.code, "AUDIO_TRACK_COUNT_INVALID");

  const missingBytes = await executeMathSceneBrowserWebmV3(request(h.adapter, {
    audio: {
      blob: new Blob([], { type: "audio/wav" }),
      fileName: "narration.wav"
    }
  }));
  assert.equal(missingBytes.ok, false);
  assert.ok(!missingBytes.ok);
  assert.equal(missingBytes.error.code, "AUDIO_SOURCE_INVALID");
});

test("does not reach ready when local Web Audio cleanup fails", async () => {
  const h = harness({ cleanupAudioThrows: true, metadataAudioTrackCount: 1 });
  const result = await executeMathSceneBrowserWebmV3(request(h.adapter, {
    audio: {
      blob: new Blob(["audio"], { type: "audio/wav" }),
      fileName: "narration.wav"
    },
    captions: null
  }));
  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.equal(result.error.code, "AUDIO_CLEANUP_FAILED");
  assert.equal(result.state.result, null);
});

test("observes cancellation that arrives while browser metadata is being parsed", async () => {
  const h = harness();
  const controller = new AbortController();
  h.adapter.parseVideoMetadata = async () => {
    controller.abort();
    return { audioTrackCount: null, durationSeconds: 1.5, height: 720, width: 1280 };
  };
  const result = await executeMathSceneBrowserWebmV3(request(h.adapter, {
    abortSignal: controller.signal
  }));
  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.equal(result.status, "cancelled");
  assert.equal(result.state.result, null);
});

test("abort races do not hang in recorder stop, metadata parsing, or media hashing", async () => {
  const stopController = new AbortController();
  const stopHarness = harness({ stopEmits: false });
  const originalStopFactory = stopHarness.adapter.createMediaRecorder;
  stopHarness.adapter.createMediaRecorder = (...args) => {
    const recorder = originalStopFactory(...args);
    const originalStop = recorder.stop.bind(recorder);
    recorder.stop = () => {
      originalStop();
      queueMicrotask(() => stopController.abort());
    };
    return recorder;
  };
  const stopped = await executeMathSceneBrowserWebmV3(request(stopHarness.adapter, {
    abortSignal: stopController.signal
  }));
  assert.equal(stopped.ok, false);
  assert.ok(!stopped.ok);
  assert.equal(stopped.status, "cancelled");

  const metadataController = new AbortController();
  const metadataHarness = harness();
  metadataHarness.adapter.parseVideoMetadata = () => {
    queueMicrotask(() => metadataController.abort());
    return new Promise(() => undefined);
  };
  const metadata = await executeMathSceneBrowserWebmV3(request(metadataHarness.adapter, {
    abortSignal: metadataController.signal
  }));
  assert.equal(metadata.ok, false);
  assert.ok(!metadata.ok);
  assert.equal(metadata.status, "cancelled");

  const hashController = new AbortController();
  const hashHarness = harness();
  hashHarness.adapter.digestBlobSha256 = (blob) => {
    if (blob.type === "text/vtt") return Promise.resolve(HASH_C);
    queueMicrotask(() => hashController.abort());
    return new Promise(() => undefined);
  };
  const hashing = await executeMathSceneBrowserWebmV3(request(hashHarness.adapter, {
    abortSignal: hashController.signal
  }));
  assert.equal(hashing.ok, false);
  assert.ok(!hashing.ok);
  assert.equal(hashing.status, "cancelled");
});

test("capture watchdog interrupts an unresponsive renderer with CAPTURE_TIMEOUT", async () => {
  const h = harness({ fireTimeoutMs: 5, timeoutImmediately: true });
  const exportPromise = executeMathSceneBrowserWebmV3(request(h.adapter, {
    captureWatchdogMs: 5,
    surface: {
      ...request(h.adapter).surface,
      renderFrame: () => new Promise<void>(() => undefined)
    }
  }));
  const result = await Promise.race([
    exportPromise,
    new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error("watchdog hung")), 100))
  ]);
  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.equal(result.error.code, "CAPTURE_TIMEOUT");
});

test("real caption bytes are required, validated, internally hashed, and returned as a sidecar", async () => {
  const h = harness();
  for (const captions of [
    { blob: new Blob([], { type: "text/vtt" }), fileName: "empty.vtt" },
    { blob: new Blob(["not vtt"], { type: "text/plain" }), fileName: "fake.vtt" },
    { blob: new Blob([new Uint8Array([0xc3, 0x28])], { type: "text/vtt" }), fileName: "invalid-utf8.vtt" }
  ]) {
    const result = await executeMathSceneBrowserWebmV3(request(h.adapter, { captions }));
    assert.equal(result.ok, false);
    assert.ok(!result.ok);
    assert.equal(result.error.code, "CAPTION_ARTIFACT_INVALID");
  }
});

test("preflight and chunk accounting bound browser duration, frames, pixel work, chunks, and bytes", () => {
  assert.equal(MATH_SCENE_BROWSER_WEBM_MAX_DURATION_SECONDS, 600);
  assert.ok(MATH_SCENE_BROWSER_WEBM_MAX_FRAME_COUNT <= 36_000);
  const valid = preflightMathSceneBrowserWebmV3({
    capturePlan: { fps: 30, frameCount: 300, frameTimes: Array.from({ length: 300 }, (_, index) => index / 30) },
    height: 720,
    width: 1280
  });
  assert.equal(valid.ok, true);
  const tooLong = preflightMathSceneBrowserWebmV3({
    capturePlan: { fps: 1, frameCount: 2, frameTimes: [0, 601] },
    height: 720,
    width: 1280
  });
  assert.equal(tooLong.ok, false);
  const tooManyFrames = preflightMathSceneBrowserWebmV3({
    capturePlan: { fps: 60, frameCount: MATH_SCENE_BROWSER_WEBM_MAX_FRAME_COUNT + 1, frameTimes: [0] },
    height: 720,
    width: 1280
  });
  assert.equal(tooManyFrames.ok, false);
  const tooMuchPixelWork = preflightMathSceneBrowserWebmV3({
    capturePlan: { fps: 60, frameCount: 36_000, frameTimes: [0] },
    height: 2_160,
    width: 3_840
  });
  assert.equal(tooMuchPixelWork.ok, false);
  assert.ok(MATH_SCENE_BROWSER_WEBM_MAX_PIXEL_WORK < 3_840 * 2_160 * 36_000);

  assert.equal(validateMathSceneBrowserWebmChunkV3({
    chunkByteCount: 8,
    chunkCount: MATH_SCENE_BROWSER_WEBM_MAX_CHUNKS + 1,
    totalByteCount: 8
  }).ok, false);
  assert.equal(validateMathSceneBrowserWebmChunkV3({
    chunkByteCount: 8,
    chunkCount: 1,
    totalByteCount: MATH_SCENE_BROWSER_WEBM_MAX_BLOB_BYTES + 1
  }).ok, false);
});

test("executor stops before Blob assembly when MediaRecorder exceeds the chunk bound", async () => {
  const chunks = Array.from(
    { length: MATH_SCENE_BROWSER_WEBM_MAX_CHUNKS + 1 },
    (_, index) => new Blob([
      index === 0 ? EBML : new Uint8Array([index % 255])
    ], { type: "video/webm;codecs=vp9" })
  );
  const h = harness({ chunks });
  const result = await executeMathSceneBrowserWebmV3(request(h.adapter));
  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.equal(result.error.code, "CAPTURE_CHUNK_LIMIT_EXCEEDED");
  assert.equal(result.state.result, null);
});

test("fails closed on incomplete composite evidence or renderer errors and can retry cleanly", async () => {
  const h = harness();
  const invalid = await executeMathSceneBrowserWebmV3(request(h.adapter, {
    surface: {
      ...request(h.adapter).surface,
      compositeEvidence: {
        captions: true,
        formulaOverlay: false,
        projectedLabels: true,
        webgl: true
      } as never
    }
  }));
  assert.equal(invalid.ok, false);
  assert.ok(!invalid.ok);
  assert.equal(invalid.error.code, "COMPOSITE_EVIDENCE_INCOMPLETE");
  assert.equal(h.streams.length, 0);

  const failed = await executeMathSceneBrowserWebmV3(request(h.adapter, {
    requestId: "request-2",
    surface: {
      ...request(h.adapter).surface,
      renderFrame: () => {
        throw new Error("private renderer detail");
      }
    }
  }));
  assert.equal(failed.ok, false);
  assert.ok(!failed.ok);
  assert.equal(failed.error.code, "CAPTURE_FRAME_FAILED");
  assert.doesNotMatch(failed.error.message, /private renderer detail/i);

  const retried = await executeMathSceneBrowserWebmV3(request(h.adapter, { requestId: "request-3" }));
  assert.equal(retried.ok, true, retried.ok ? "" : JSON.stringify(retried.error));
  assert.ok(retried.ok);
});
