import {
  buildMathSceneCaptureFramesV3,
  runMathSceneCaptureClockV3,
  type MathSceneCaptureClockPlanV3,
  type MathSceneCaptureFrameV3
} from "./mathSceneCaptureClockV3";
import { parseMathSceneBrowserVideoMetadataV3 } from "./mathSceneBrowserVideoMetadataParserV3";
import {
  validateMathSceneVideoExportReadyResult,
  type MathSceneCompositeCaptureEvidence,
  type MathSceneVideoExportError,
  type MathSceneVideoExportReadyResult,
  type MathSceneWebmMimeType
} from "./mathSceneVideoExportContract";
import {
  createMathSceneVideoExportInitialState,
  transitionMathSceneVideoExportState,
  type MathSceneVideoExportEvent,
  type MathSceneVideoExportState
} from "./mathSceneVideoExportStateMachine";
import {
  probeMathSceneWebmCapability,
  type MathSceneWebmCapabilityAdapter
} from "./mathSceneWebmCapability";
import {
  verifyMathSceneWebmMediaEvidence,
  type MathSceneWebmMediaEvidence,
  type MathSceneWebmParsedVideoMetadata
} from "./mathSceneWebmMediaEvidence";

export const MATH_SCENE_BROWSER_WEBM_EXECUTOR_V3_SURFACE_CONTRACT =
  "This executor records only a caller-injected composite canvas whose frame renderer already includes WebGL, KaTeX formula overlay, projected labels, and captions; it does not connect ThreeDLabCanvas or create download URLs." as const;

export const MATH_SCENE_BROWSER_WEBM_MAX_DURATION_SECONDS = 10 * 60;
export const MATH_SCENE_BROWSER_WEBM_MAX_FRAME_COUNT = 36_000;
export const MATH_SCENE_BROWSER_WEBM_MAX_DIMENSION = 3_840;
export const MATH_SCENE_BROWSER_WEBM_MAX_PIXEL_WORK = 40_000_000_000;
export const MATH_SCENE_BROWSER_WEBM_MAX_BLOB_BYTES = 512 * 1024 * 1024;
export const MATH_SCENE_BROWSER_WEBM_MAX_CHUNKS = 2_048;
export const MATH_SCENE_BROWSER_WEBM_MAX_CHUNK_BYTES = 16 * 1024 * 1024;
export const MATH_SCENE_BROWSER_WEBM_MAX_CAPTION_BYTES = 1024 * 1024;
export const MATH_SCENE_BROWSER_WEBM_MAX_AUDIO_BYTES = 100 * 1024 * 1024;
export const MATH_SCENE_BROWSER_WEBM_RECORDER_TIMESLICE_MS = 1_000;

export type MathSceneBrowserMediaStreamTrackV3 = {
  readonly kind: string;
  clone: () => MathSceneBrowserMediaStreamTrackV3;
  stop: () => void;
};

export type MathSceneBrowserMediaStreamV3 = {
  addTrack: (track: MathSceneBrowserMediaStreamTrackV3) => void;
  getTracks: () => MathSceneBrowserMediaStreamTrackV3[];
};

export type MathSceneBrowserRecorderDataEventV3 = { data?: Blob };
export type MathSceneBrowserRecorderListenerV3 = (
  event: MathSceneBrowserRecorderDataEventV3
) => void;

export type MathSceneBrowserMediaRecorderV3 = {
  readonly mimeType: string;
  readonly state: "inactive" | "paused" | "recording";
  addEventListener: (
    type: "dataavailable" | "error" | "stop",
    listener: MathSceneBrowserRecorderListenerV3
  ) => void;
  removeEventListener: (
    type: "dataavailable" | "error" | "stop",
    listener: MathSceneBrowserRecorderListenerV3
  ) => void;
  requestData?: () => void;
  start: (timesliceMs?: number) => void;
  stop: () => void;
};

export type MathSceneBrowserWebmAdapterV3 = {
  captureStream: (canvas: HTMLCanvasElement, fps: number) => MathSceneBrowserMediaStreamV3;
  clearTimeout: (handle: unknown) => void;
  createMediaRecorder: (
    stream: MathSceneBrowserMediaStreamV3,
    options: { mimeType: MathSceneWebmMimeType }
  ) => MathSceneBrowserMediaRecorderV3;
  digestBlobSha256: (blob: Blob) => Promise<string>;
  hasCanvasCaptureStream: (canvas: HTMLCanvasElement) => boolean;
  hasMediaRecorder: () => boolean;
  isTypeSupported: (mimeType: MathSceneWebmMimeType) => boolean;
  mixAudioBlobToTrack: (input: {
    blob: Blob;
    signal: AbortSignal;
    targetDurationSeconds: number;
  }) => Promise<MathSceneBrowserWebmAudioMixSessionV3>;
  nowIso: () => string;
  nowMs: () => number;
  pace: (milliseconds: number, signal: AbortSignal) => void | Promise<void>;
  parseVideoMetadata: (blob: Blob, signal?: AbortSignal) => Promise<MathSceneWebmParsedVideoMetadata>;
  setTimeout: (callback: () => void, timeoutMs: number) => unknown;
};

export type MathSceneBrowserCompositeSurfaceV3 = {
  canvas: HTMLCanvasElement;
  compositeEvidence: MathSceneCompositeCaptureEvidence;
  renderFrame: (frame: MathSceneCaptureFrameV3, signal: AbortSignal) => void | Promise<void>;
};

export type MathSceneBrowserWebmAudioV3 = {
  blob: Blob;
  fileName: string;
};

export type MathSceneBrowserWebmAudioMixSessionV3 = {
  cleanup: () => void | Promise<void>;
  start: () => void;
  track: MathSceneBrowserMediaStreamTrackV3;
};

export type MathSceneBrowserWebmCaptionsV3 = {
  blob: Blob;
  fileName: string;
};

export type MathSceneBrowserWebmCaptionArtifactV3 = {
  blob: Blob;
  byteCount: number;
  contentHash: string;
  fileName: string;
  mimeType: "text/vtt";
};

export type MathSceneBrowserWebmExportRequestV3 = {
  abortSignal?: AbortSignal;
  adapter?: MathSceneBrowserWebmAdapterV3;
  audio: MathSceneBrowserWebmAudioV3 | null;
  captions: MathSceneBrowserWebmCaptionsV3 | null;
  captureWatchdogMs?: number;
  capturePlan: MathSceneCaptureClockPlanV3;
  exportId: string;
  fileName: string;
  onStateChange?: (state: MathSceneVideoExportState) => void;
  packageContentHash: string;
  profileContentHash: string;
  profileId: string;
  postCaptureWatchdogMs?: number;
  recorderStopTimeoutMs?: number;
  requestId: string;
  sceneId: string;
  surface: MathSceneBrowserCompositeSurfaceV3;
};

export type MathSceneBrowserWebmExportSuccessV3 = {
  blob: Blob;
  captionArtifact: MathSceneBrowserWebmCaptionArtifactV3 | null;
  evidence: MathSceneWebmMediaEvidence;
  ok: true;
  result: MathSceneVideoExportReadyResult;
  state: MathSceneVideoExportState & { status: "ready" };
  stateHistory: MathSceneVideoExportState[];
};

export type MathSceneBrowserWebmExportFailureV3 = {
  error: MathSceneVideoExportError;
  ok: false;
  state: MathSceneVideoExportState;
  stateHistory: MathSceneVideoExportState[];
  status: "cancelled" | "failed" | "unsupported";
};

export type MathSceneBrowserWebmExportResultV3 =
  | MathSceneBrowserWebmExportFailureV3
  | MathSceneBrowserWebmExportSuccessV3;

type RecorderTerminal =
  | { error: MathSceneVideoExportError; kind: "resource-limit" }
  | { kind: "error" }
  | { kind: "stop" };

export type MathSceneBrowserWebmPreflightResultV3 =
  | {
      durationSeconds: number;
      ok: true;
      pixelWork: number;
    }
  | { error: MathSceneVideoExportError; ok: false };

export type MathSceneBrowserWebmChunkValidationV3 =
  | { ok: true }
  | { error: MathSceneVideoExportError; ok: false };

function error(
  code: MathSceneVideoExportError["code"],
  message: string,
  path: string
): MathSceneVideoExportError {
  return { code, message, path };
}

export function preflightMathSceneBrowserWebmV3({
  capturePlan,
  height,
  width
}: {
  capturePlan: MathSceneCaptureClockPlanV3;
  height: number;
  width: number;
}): MathSceneBrowserWebmPreflightResultV3 {
  if (
    !Number.isInteger(width) || width <= 0 || width > MATH_SCENE_BROWSER_WEBM_MAX_DIMENSION ||
    !Number.isInteger(height) || height <= 0 || height > MATH_SCENE_BROWSER_WEBM_MAX_DIMENSION ||
    width * height > 3_840 * 2_160
  ) {
    return {
      error: error(
        "CAPTURE_WORK_LIMIT_EXCEEDED",
        "Browser WebM dimensions exceed the bounded 4K capture surface.",
        "surface.canvas"
      ),
      ok: false
    };
  }
  if (
    !capturePlan ||
    !Number.isInteger(capturePlan.frameCount) ||
    capturePlan.frameCount <= 0 ||
    capturePlan.frameCount > MATH_SCENE_BROWSER_WEBM_MAX_FRAME_COUNT
  ) {
    return {
      error: error(
        "CAPTURE_WORK_LIMIT_EXCEEDED",
        "Browser WebM frame count exceeds the bounded capture limit.",
        "capturePlan.frameCount"
      ),
      ok: false
    };
  }
  const pixelWork = width * height * capturePlan.frameCount;
  if (!Number.isSafeInteger(pixelWork) || pixelWork > MATH_SCENE_BROWSER_WEBM_MAX_PIXEL_WORK) {
    return {
      error: error(
        "CAPTURE_WORK_LIMIT_EXCEEDED",
        "Browser WebM pixel work exceeds the bounded capture limit.",
        "capturePlan"
      ),
      ok: false
    };
  }
  const built = buildMathSceneCaptureFramesV3(capturePlan);
  if (!built.ok) return built;
  const durationSeconds = (built.frames.at(-1)?.timeSeconds ?? 0) + 1 / capturePlan.fps;
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return {
      error: error("CAPTURE_PLAN_INVALID", "WebM capture plan must have a positive duration.", "capturePlan.frameTimes"),
      ok: false
    };
  }
  if (durationSeconds > MATH_SCENE_BROWSER_WEBM_MAX_DURATION_SECONDS) {
    return {
      error: error(
        "CAPTURE_WORK_LIMIT_EXCEEDED",
        "Browser WebM duration exceeds the ten-minute local capture limit.",
        "capturePlan.frameTimes"
      ),
      ok: false
    };
  }
  return { durationSeconds, ok: true, pixelWork };
}

export function validateMathSceneBrowserWebmChunkV3({
  chunkByteCount,
  chunkCount,
  totalByteCount
}: {
  chunkByteCount: number;
  chunkCount: number;
  totalByteCount: number;
}): MathSceneBrowserWebmChunkValidationV3 {
  if (
    !Number.isSafeInteger(chunkCount) || chunkCount < 0 ||
    chunkCount > MATH_SCENE_BROWSER_WEBM_MAX_CHUNKS
  ) {
    return {
      error: error(
        "CAPTURE_CHUNK_LIMIT_EXCEEDED",
        "MediaRecorder emitted more chunks than the bounded browser capture limit.",
        "MediaRecorder.dataavailable"
      ),
      ok: false
    };
  }
  if (
    !Number.isSafeInteger(chunkByteCount) || chunkByteCount < 0 ||
    !Number.isSafeInteger(totalByteCount) || totalByteCount < 0 ||
    chunkByteCount > MATH_SCENE_BROWSER_WEBM_MAX_CHUNK_BYTES ||
    totalByteCount > MATH_SCENE_BROWSER_WEBM_MAX_BLOB_BYTES
  ) {
    return {
      error: error(
        "VIDEO_BLOB_TOO_LARGE",
        "MediaRecorder bytes exceed the bounded browser memory limit.",
        "blob"
      ),
      ok: false
    };
  }
  return { ok: true };
}

function validLocalFileName(value: unknown, suffix: string) {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    value.toLowerCase().endsWith(suffix) &&
    !/[\\/\u0000-\u001f]/u.test(value) &&
    !/^[a-z][a-z0-9+.-]*:/iu.test(value) &&
    value !== "." &&
    value !== "..";
}

function validAudioInput(value: MathSceneBrowserWebmAudioV3 | null) {
  if (value === null) return true;
  return value &&
    value.blob instanceof Blob &&
    value.blob.size > 0 &&
    value.blob.size <= MATH_SCENE_BROWSER_WEBM_MAX_AUDIO_BYTES &&
    /^audio\/[a-z0-9.+-]+$/iu.test(value.blob.type) &&
    /\.[a-z0-9]{1,12}$/iu.test(value.fileName) &&
    validLocalFileName(value.fileName, value.fileName.toLowerCase().match(/\.[a-z0-9]+$/u)?.[0] ?? "\0");
}

function validCaptionInput(value: MathSceneBrowserWebmCaptionsV3 | null) {
  if (value === null) return true;
  return value &&
    value.blob instanceof Blob &&
    value.blob.size > 0 &&
    value.blob.size <= MATH_SCENE_BROWSER_WEBM_MAX_CAPTION_BYTES &&
    value.blob.type.toLowerCase() === "text/vtt" &&
    validLocalFileName(value.fileName, ".vtt");
}

function isCompleteCompositeEvidence(value: unknown): value is MathSceneCompositeCaptureEvidence {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  return keys.length === 4 &&
    record.webgl === true &&
    record.formulaOverlay === true &&
    record.projectedLabels === true &&
    record.captions === true;
}

function stopStreamTracks(stream: MathSceneBrowserMediaStreamV3 | null) {
  if (!stream) return;
  let tracks: MathSceneBrowserMediaStreamTrackV3[] = [];
  try {
    tracks = stream.getTracks();
  } catch {
    return;
  }
  for (const track of new Set(tracks)) {
    try {
      track.stop();
    } catch {
      // Track ownership has still been released by this execution attempt.
    }
  }
}

function stopRecorderSafely(recorder: MathSceneBrowserMediaRecorderV3 | null) {
  if (!recorder || recorder.state === "inactive") return;
  try {
    recorder.stop();
  } catch {
    // Final stream-track cleanup is the hard fallback.
  }
}

async function sha256Blob(blob: Blob) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Browser SHA-256 is unavailable.");
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  const hex = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `sha256-${hex}`;
}

async function decodeUtf8Blob(blob: Blob) {
  return new TextDecoder("utf-8", { fatal: true }).decode(await blob.arrayBuffer());
}

function defaultPace(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("Capture pacing was aborted."));
      return;
    }
    let handle: ReturnType<typeof setTimeout>;
    const handleAbort = () => {
      globalThis.clearTimeout(handle);
      signal.removeEventListener("abort", handleAbort);
      reject(new Error("Capture pacing was aborted."));
    };
    handle = globalThis.setTimeout(() => {
      signal.removeEventListener("abort", handleAbort);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", handleAbort, { once: true });
  });
}

async function mixAudioBlobToBrowserTrack({
  blob,
  signal
}: {
  blob: Blob;
  signal: AbortSignal;
  targetDurationSeconds: number;
}): Promise<MathSceneBrowserWebmAudioMixSessionV3> {
  const AudioContextConstructor = globalThis.AudioContext;
  if (typeof AudioContextConstructor !== "function") {
    throw new Error("Web Audio is unavailable.");
  }
  if (signal.aborted) throw new Error("Web Audio mixing was aborted.");
  const context = new AudioContextConstructor();
  let source: AudioBufferSourceNode | null = null;
  let track: MediaStreamTrack | null = null;
  try {
    const bytes = await blob.arrayBuffer();
    if (signal.aborted) throw new Error("Web Audio mixing was aborted.");
    const decoded = await context.decodeAudioData(bytes.slice(0));
    if (signal.aborted) throw new Error("Web Audio mixing was aborted.");
    const destination = context.createMediaStreamDestination();
    source = context.createBufferSource();
    source.buffer = decoded;
    source.connect(destination);
    track = destination.stream.getAudioTracks()[0] ?? null;
    if (!track) throw new Error("Web Audio produced no track.");
    if (context.state === "suspended") await context.resume();
    const allocatedSource = source;
    const allocatedTrack = track;
    let started = false;
    return {
      cleanup: async () => {
        try {
          allocatedSource.stop();
        } catch {
          // A naturally-ended source is already stopped.
        }
        try {
          allocatedSource.disconnect();
        } catch {
          // Context close is the final graph cleanup.
        }
        try {
          allocatedTrack.stop();
        } catch {
          // Context close still releases the destination.
        }
        await context.close();
      },
      start: () => {
        if (started) throw new Error("Web Audio source was already started.");
        allocatedSource.start(0);
        started = true;
      },
      track: allocatedTrack as unknown as MathSceneBrowserMediaStreamTrackV3
    };
  } catch (mixError) {
    try {
      source?.disconnect();
    } catch {
      // Continue cleanup.
    }
    try {
      track?.stop();
    } catch {
      // Continue cleanup.
    }
    await context.close().catch(() => undefined);
    throw mixError;
  }
}

function createDefaultAdapter(): MathSceneBrowserWebmAdapterV3 {
  return {
    captureStream: (canvas, fps) => canvas.captureStream(fps) as unknown as MathSceneBrowserMediaStreamV3,
    clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
    createMediaRecorder: (stream, options) => new MediaRecorder(
      stream as unknown as MediaStream,
      options
    ) as unknown as MathSceneBrowserMediaRecorderV3,
    digestBlobSha256: sha256Blob,
    hasCanvasCaptureStream: (canvas) => typeof canvas?.captureStream === "function",
    hasMediaRecorder: () => typeof MediaRecorder !== "undefined",
    isTypeSupported: (mimeType) => MediaRecorder.isTypeSupported(mimeType),
    mixAudioBlobToTrack: mixAudioBlobToBrowserTrack,
    nowIso: () => new Date().toISOString(),
    nowMs: () => performance.now(),
    pace: defaultPace,
    parseVideoMetadata: (blob, signal) => parseMathSceneBrowserVideoMetadataV3(blob, { abortSignal: signal }),
    setTimeout: (callback, timeoutMs) => globalThis.setTimeout(callback, timeoutMs)
  };
}

function buildCapabilityAdapter(
  browser: MathSceneBrowserWebmAdapterV3,
  canvas: HTMLCanvasElement
): MathSceneWebmCapabilityAdapter {
  let canvasAvailable = false;
  let mediaRecorderAvailable = false;
  try {
    canvasAvailable = browser.hasCanvasCaptureStream(canvas);
  } catch {
    canvasAvailable = false;
  }
  try {
    mediaRecorderAvailable = browser.hasMediaRecorder();
  } catch {
    mediaRecorderAvailable = false;
  }
  return {
    canvas: canvasAvailable
      ? { captureStream: (fps) => browser.captureStream(canvas, fps) }
      : null,
    mediaRecorder: mediaRecorderAvailable
      ? {
          construct: (stream, options) => browser.createMediaRecorder(
            stream as MathSceneBrowserMediaStreamV3,
            options
          ),
          isTypeSupported: (mimeType) => browser.isTypeSupported(mimeType)
        }
      : null,
    releaseProbe: ({ recorder, stream }) => {
      stopRecorderSafely(recorder as MathSceneBrowserMediaRecorderV3 | null);
      stopStreamTracks(stream as MathSceneBrowserMediaStreamV3 | null);
    }
  };
}

function validSurface(surface: MathSceneBrowserCompositeSurfaceV3) {
  return Boolean(
    surface &&
    surface.canvas &&
    Number.isInteger(surface.canvas.width) &&
    surface.canvas.width > 0 &&
    Number.isInteger(surface.canvas.height) &&
    surface.canvas.height > 0 &&
    typeof surface.renderFrame === "function"
  );
}

function recorderTerminalPromise(recorder: MathSceneBrowserMediaRecorderV3) {
  let settle!: (value: RecorderTerminal) => void;
  let settled = false;
  const promise = new Promise<RecorderTerminal>((resolve) => {
    settle = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
  });
  const chunks: Blob[] = [];
  let observedChunkCount = 0;
  let totalByteCount = 0;
  const handleData: MathSceneBrowserRecorderListenerV3 = (event) => {
    if (settled || !(event.data instanceof Blob)) return;
    observedChunkCount += 1;
    const nextTotalByteCount = totalByteCount + event.data.size;
    const bounded = validateMathSceneBrowserWebmChunkV3({
      chunkByteCount: event.data.size,
      chunkCount: observedChunkCount,
      totalByteCount: nextTotalByteCount
    });
    if (!bounded.ok) {
      settle({ error: bounded.error, kind: "resource-limit" });
      return;
    }
    if (event.data.size > 0) chunks.push(event.data);
    totalByteCount = nextTotalByteCount;
  };
  const handleError: MathSceneBrowserRecorderListenerV3 = () => settle({ kind: "error" });
  const handleStop: MathSceneBrowserRecorderListenerV3 = () => settle({ kind: "stop" });
  recorder.addEventListener("dataavailable", handleData);
  recorder.addEventListener("error", handleError);
  recorder.addEventListener("stop", handleStop);
  return {
    chunks,
    cleanup: () => {
      recorder.removeEventListener("dataavailable", handleData);
      recorder.removeEventListener("error", handleError);
      recorder.removeEventListener("stop", handleStop);
    },
    promise
  };
}

type WatchedPromiseResult<Value> =
  | { kind: "abort" }
  | { kind: "rejected" }
  | { kind: "timeout" }
  | { kind: "timer-error" }
  | { kind: "value"; value: Value };

async function watchPromise<Value>(
  promise: Promise<Value>,
  browser: MathSceneBrowserWebmAdapterV3,
  signal: AbortSignal,
  deadlineAtMs: number
): Promise<WatchedPromiseResult<Value>> {
  if (signal.aborted) return { kind: "abort" };
  let remainingMs: number;
  try {
    remainingMs = deadlineAtMs - browser.nowMs();
  } catch {
    return { kind: "timer-error" };
  }
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return { kind: "timeout" };

  let timeoutHandle: unknown;
  let handleAbort!: () => void;
  const abort = new Promise<{ kind: "abort" }>((resolve) => {
    handleAbort = () => resolve({ kind: "abort" });
    signal.addEventListener("abort", handleAbort, { once: true });
  });
  const timeout = new Promise<{ kind: "timeout" }>((resolve) => {
    try {
      timeoutHandle = browser.setTimeout(() => resolve({ kind: "timeout" }), remainingMs);
    } catch {
      resolve({ kind: "timeout" });
    }
  });
  try {
    return await Promise.race([
      promise.then(
        (value) => ({ kind: "value" as const, value }),
        () => ({ kind: "rejected" as const })
      ),
      abort,
      timeout
    ]);
  } finally {
    signal.removeEventListener("abort", handleAbort);
    if (timeoutHandle !== undefined) {
      try {
        browser.clearTimeout(timeoutHandle);
      } catch {
        // Host timer cleanup cannot manufacture a ready export.
      }
    }
  }
}

function safeNowMs(browser: MathSceneBrowserWebmAdapterV3) {
  try {
    const value = browser.nowMs();
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export async function executeMathSceneBrowserWebmV3(
  request: MathSceneBrowserWebmExportRequestV3
): Promise<MathSceneBrowserWebmExportResultV3> {
  const browser = request.adapter ?? createDefaultAdapter();
  let state = createMathSceneVideoExportInitialState();
  const stateHistory: MathSceneVideoExportState[] = [];

  const publishState = () => {
    const snapshot = structuredClone(state);
    stateHistory.push(snapshot);
    try {
      request.onStateChange?.(structuredClone(snapshot));
    } catch {
      // UI observers cannot change export correctness.
    }
  };
  publishState();

  const transition = (event: MathSceneVideoExportEvent) => {
    const transitioned = transitionMathSceneVideoExportState(state, event);
    if (!transitioned.ok) return transitioned.error;
    state = transitioned.state;
    publishState();
    return null;
  };

  const fail = (failure: MathSceneVideoExportError): MathSceneBrowserWebmExportFailureV3 => {
    const transitionFailure = transition({ attempt: state.attempt, error: failure, type: "fail" });
    const finalError = transitionFailure ?? failure;
    return {
      error: finalError,
      ok: false,
      state,
      stateHistory,
      status: "failed"
    };
  };

  const cancel = (): MathSceneBrowserWebmExportFailureV3 => {
    const transitionFailure = transition({ attempt: state.attempt, type: "cancel" });
    return {
      error: transitionFailure ?? state.error ?? error("CAPTURE_ABORTED", "Video export was cancelled.", "abortSignal"),
      ok: false,
      state,
      stateHistory,
      status: "cancelled"
    };
  };

  const prepareFailure = transition({ requestId: request.requestId, type: "prepare" });
  if (prepareFailure) {
    return {
      error: prepareFailure,
      ok: false,
      state,
      stateHistory,
      status: "failed"
    };
  }

  if (request.abortSignal?.aborted) return cancel();
  if (!validSurface(request.surface)) {
    return fail(error("CAPTURE_SURFACE_INVALID", "Composite capture surface is invalid.", "surface"));
  }
  if (!isCompleteCompositeEvidence(request.surface.compositeEvidence)) {
    return fail(error(
      "COMPOSITE_EVIDENCE_INCOMPLETE",
      "Composite canvas evidence must include WebGL, formula overlay, projected labels, and captions.",
      "surface.compositeEvidence"
    ));
  }
  const preflight = preflightMathSceneBrowserWebmV3({
    capturePlan: request.capturePlan,
    height: request.surface.canvas.height,
    width: request.surface.canvas.width
  });
  if (!preflight.ok) return fail(preflight.error);
  if (!validCaptionInput(request.captions)) {
    return fail(error(
      "CAPTION_ARTIFACT_INVALID",
      "WebVTT sidecar input must contain bounded local text/vtt bytes and a safe .vtt name.",
      "captions"
    ));
  }
  if (!validAudioInput(request.audio)) {
    return fail(error(
      "AUDIO_SOURCE_INVALID",
      "Browser WebM audio requires one bounded local audio Blob and a cloneable local audio track.",
      "audio"
    ));
  }
  const expectedDurationSeconds = preflight.durationSeconds;
  const stopTimeoutMs = request.recorderStopTimeoutMs ?? 8_000;
  if (!Number.isFinite(stopTimeoutMs) || stopTimeoutMs <= 0) {
    return fail(error("CAPTURE_PLAN_INVALID", "Recorder stop timeout must be positive and finite.", "recorderStopTimeoutMs"));
  }
  const expectedDurationMs = expectedDurationSeconds * 1_000;
  const captureWatchdogMs = request.captureWatchdogMs ?? (
    expectedDurationMs + Math.min(60_000, Math.max(10_000, expectedDurationMs * 0.25))
  );
  const postCaptureWatchdogMs = request.postCaptureWatchdogMs ?? 30_000;
  if (
    !Number.isFinite(captureWatchdogMs) || captureWatchdogMs <= 0 ||
    captureWatchdogMs > (MATH_SCENE_BROWSER_WEBM_MAX_DURATION_SECONDS + 60) * 1_000
  ) {
    return fail(error("CAPTURE_PLAN_INVALID", "Capture watchdog is outside the bounded browser range.", "captureWatchdogMs"));
  }
  if (!Number.isFinite(postCaptureWatchdogMs) || postCaptureWatchdogMs <= 0 || postCaptureWatchdogMs > 60_000) {
    return fail(error("CAPTURE_PLAN_INVALID", "Post-capture watchdog must be from 1 to 60000 ms.", "postCaptureWatchdogMs"));
  }

  const capability = probeMathSceneWebmCapability({
    adapter: buildCapabilityAdapter(browser, request.surface.canvas),
    fps: request.capturePlan.fps
  });
  if (!capability.supported) {
    const unsupportedFailure = transition({
      attempt: state.attempt,
      error: capability.reason,
      type: "unsupported"
    });
    return {
      error: unsupportedFailure ?? capability.reason,
      ok: false,
      state,
      stateHistory,
      status: "unsupported"
    };
  }

  let captureStream: MathSceneBrowserMediaStreamV3 | null = null;
  let recorder: MathSceneBrowserMediaRecorderV3 | null = null;
  let terminal: ReturnType<typeof recorderTerminalPromise> | null = null;
  let audioMixSession: MathSceneBrowserWebmAudioMixSessionV3 | null = null;
  let captureWatchdogHandle: unknown;
  let captureWatchdogArmed = false;
  let captureTimedOut = false;
  let audioContentHash: string | null = null;
  let captionArtifact: MathSceneBrowserWebmCaptionArtifactV3 | null = null;
  const sessionAbort = new AbortController();
  const handleExternalAbort = () => sessionAbort.abort();
  request.abortSignal?.addEventListener("abort", handleExternalAbort, { once: true });

  try {
    if (request.abortSignal?.aborted) return cancel();
    if (request.audio) {
      const preparationStartedAtMs = safeNowMs(browser);
      if (preparationStartedAtMs === null) {
        return fail(error("CAPTURE_TIMEOUT", "Browser monotonic clock is unavailable.", "adapter.nowMs"));
      }
      const preparationDeadlineAtMs = preparationStartedAtMs + postCaptureWatchdogMs;
      const audioHashOutcome = await watchPromise(
        browser.digestBlobSha256(request.audio.blob),
        browser,
        sessionAbort.signal,
        preparationDeadlineAtMs
      );
      if (audioHashOutcome.kind === "abort") return cancel();
      if (audioHashOutcome.kind === "timeout" || audioHashOutcome.kind === "timer-error") {
        return fail(error("CAPTURE_TIMEOUT", "Local audio hashing exceeded the preparation deadline.", "audio.blob"));
      }
      if (audioHashOutcome.kind === "rejected") {
        return fail(error("AUDIO_SOURCE_INVALID", "Local audio SHA-256 could not be computed.", "audio.blob"));
      }
      audioContentHash = audioHashOutcome.value;
      const audioMixOutcome = await watchPromise(
        browser.mixAudioBlobToTrack({
          blob: request.audio.blob,
          signal: sessionAbort.signal,
          targetDurationSeconds: expectedDurationSeconds
        }),
        browser,
        sessionAbort.signal,
        preparationDeadlineAtMs
      );
      if (audioMixOutcome.kind === "abort") return cancel();
      if (audioMixOutcome.kind === "timeout" || audioMixOutcome.kind === "timer-error") {
        return fail(error("CAPTURE_TIMEOUT", "Local audio mixing exceeded the preparation deadline.", "audio.blob"));
      }
      if (audioMixOutcome.kind === "rejected") {
        return fail(error("AUDIO_MIX_FAILED", "Local Web Audio mixing failed safely.", "audio.blob"));
      }
      audioMixSession = audioMixOutcome.value;
      if (
        !audioMixSession ||
        audioMixSession.track?.kind !== "audio" ||
        typeof audioMixSession.start !== "function" ||
        typeof audioMixSession.cleanup !== "function"
      ) {
        return fail(error("AUDIO_MIX_FAILED", "Local Web Audio mixing produced no observed audio track.", "audio.blob"));
      }
    }
    try {
      captureStream = browser.captureStream(request.surface.canvas, request.capturePlan.fps);
      if (
        !captureStream ||
        typeof captureStream.getTracks !== "function" ||
        !captureStream.getTracks().some((track) => track.kind === "video")
      ) {
        return fail(error("CANVAS_CAPTURE_STREAM_UNAVAILABLE", "Canvas captureStream returned no usable stream.", "surface.canvas"));
      }
    } catch {
      return fail(error("CANVAS_CAPTURE_STREAM_UNAVAILABLE", "Canvas captureStream failed safely.", "surface.canvas"));
    }

    if (request.audio) {
      try {
        const mixedAudioTrack = audioMixSession?.track;
        if (!mixedAudioTrack || mixedAudioTrack.kind !== "audio") {
          throw new TypeError("Web Audio did not produce an audio track.");
        }
        captureStream.addTrack(mixedAudioTrack);
        if (!captureStream.getTracks().includes(mixedAudioTrack)) {
          throw new TypeError("Capture stream did not retain the isolated audio track.");
        }
      } catch {
        return fail(error("AUDIO_MIX_FAILED", "Local audio track could not be attached safely.", "audio.blob"));
      }
    }

    try {
      recorder = browser.createMediaRecorder(captureStream, { mimeType: capability.mimeType });
      if (!recorder) throw new TypeError("Recorder constructor returned no instance.");
    } catch {
      return fail(error("MEDIA_RECORDER_CONSTRUCTOR_FAILED", "MediaRecorder construction failed safely.", "MediaRecorder"));
    }
    if (recorder.mimeType !== capability.mimeType) {
      return fail(error("VIDEO_MIME_MISMATCH", "MediaRecorder MIME does not match the selected WebM profile.", "MediaRecorder.mimeType"));
    }
    terminal = recorderTerminalPromise(recorder);
    const captureTransitionFailure = transition({ attempt: state.attempt, type: "capture" });
    if (captureTransitionFailure) return fail(captureTransitionFailure);

    try {
      recorder.start(MATH_SCENE_BROWSER_WEBM_RECORDER_TIMESLICE_MS);
      if (recorder.state === "inactive") throw new TypeError("Recorder remained inactive.");
    } catch {
      return fail(error("MEDIA_RECORDER_START_FAILED", "MediaRecorder could not start safely.", "MediaRecorder.start"));
    }
    if (audioMixSession) {
      try {
        audioMixSession.start();
      } catch {
        return fail(error("AUDIO_MIX_FAILED", "Local audio playback could not start after MediaRecorder.", "audio.blob"));
      }
    }

    const captureStartedAtMs = safeNowMs(browser);
    if (captureStartedAtMs === null) {
      return fail(error("CAPTURE_TIMEOUT", "Browser monotonic clock is unavailable.", "adapter.nowMs"));
    }
    const captureDeadlineAtMs = captureStartedAtMs + captureWatchdogMs;
    try {
      captureWatchdogHandle = browser.setTimeout(() => {
        captureTimedOut = true;
        sessionAbort.abort();
      }, captureWatchdogMs);
      captureWatchdogArmed = true;
    } catch {
      return fail(error("CAPTURE_TIMEOUT", "Capture watchdog could not be armed.", "captureWatchdogMs"));
    }

    const clock = runMathSceneCaptureClockV3({
      abortSignal: sessionAbort.signal,
      capturePlan: request.capturePlan,
      deadlineAtMs: captureDeadlineAtMs,
      nowMs: browser.nowMs,
      renderFrame: async (frame) => {
        await request.surface.renderFrame(frame, sessionAbort.signal);
        const nextTime = request.capturePlan.frameTimes[frame.frameIndex + 1];
        const targetElapsedSeconds = nextTime === undefined
          ? expectedDurationSeconds
          : nextTime;
        const nowMs = browser.nowMs();
        const remainingMs = Math.max(0, captureStartedAtMs + targetElapsedSeconds * 1_000 - nowMs);
        await browser.pace(remainingMs, sessionAbort.signal);
      }
    }).then(
      (result) => ({ kind: "clock" as const, result }),
      () => ({ kind: "frame-error" as const })
    );

    const captureAbort = new Promise<{ kind: "abort" }>((resolve) => {
      if (sessionAbort.signal.aborted) {
        resolve({ kind: "abort" });
        return;
      }
      sessionAbort.signal.addEventListener("abort", () => resolve({ kind: "abort" }), { once: true });
    });

    const captureOutcome = await Promise.race([clock, terminal.promise, captureAbort]);
    if (captureWatchdogArmed) {
      try {
        browser.clearTimeout(captureWatchdogHandle);
      } catch {
        // Clearing a completed watchdog does not alter the capture verdict.
      }
      captureWatchdogArmed = false;
    }
    if (captureOutcome.kind === "abort") {
      if (captureTimedOut) {
        return fail(error("CAPTURE_TIMEOUT", "Browser WebM capture exceeded its absolute deadline.", "captureWatchdogMs"));
      }
      return cancel();
    }
    if (captureOutcome.kind === "error") {
      sessionAbort.abort();
      return fail(error("MEDIA_RECORDER_RUNTIME_FAILED", "MediaRecorder failed during capture.", "MediaRecorder.error"));
    }
    if (captureOutcome.kind === "stop") {
      sessionAbort.abort();
      return fail(error("MEDIA_RECORDER_RUNTIME_FAILED", "MediaRecorder stopped before encoding was requested.", "MediaRecorder.stop"));
    }
    if (captureOutcome.kind === "resource-limit") {
      sessionAbort.abort();
      return fail(captureOutcome.error);
    }
    if (captureOutcome.kind === "frame-error") {
      if (request.abortSignal?.aborted) return cancel();
      return fail(error("CAPTURE_FRAME_FAILED", "Composite surface frame rendering failed safely.", "surface.renderFrame"));
    }
    if (!captureOutcome.result.ok) {
      if (captureOutcome.result.error.code === "CAPTURE_TIMEOUT" || captureTimedOut) {
        return fail(error("CAPTURE_TIMEOUT", "Browser WebM capture exceeded its absolute deadline.", "captureWatchdogMs"));
      }
      if (captureOutcome.result.error.code === "CAPTURE_ABORTED" || request.abortSignal?.aborted) return cancel();
      return fail(captureOutcome.result.error);
    }
    if (request.abortSignal?.aborted) return cancel();

    const encodingTransitionFailure = transition({ attempt: state.attempt, type: "encode" });
    if (encodingTransitionFailure) return fail(encodingTransitionFailure);
    try {
      recorder.stop();
    } catch {
      return fail(error("MEDIA_RECORDER_RUNTIME_FAILED", "MediaRecorder could not stop safely.", "MediaRecorder.stop"));
    }

    const postCaptureStartedAtMs = safeNowMs(browser);
    if (postCaptureStartedAtMs === null) {
      return fail(error("CAPTURE_TIMEOUT", "Browser monotonic clock is unavailable.", "adapter.nowMs"));
    }
    const postCaptureDeadlineAtMs = postCaptureStartedAtMs + postCaptureWatchdogMs;
    const recorderOutcome = await watchPromise(
      terminal.promise,
      browser,
      sessionAbort.signal,
      Math.min(postCaptureDeadlineAtMs, postCaptureStartedAtMs + stopTimeoutMs)
    );
    if (recorderOutcome.kind === "abort") return cancel();
    if (recorderOutcome.kind === "timeout") {
      return fail(error("MEDIA_RECORDER_STOP_TIMEOUT", "MediaRecorder did not finish before the stop timeout.", "MediaRecorder.stop"));
    }
    if (recorderOutcome.kind === "timer-error") {
      return fail(error("MEDIA_RECORDER_STOP_TIMEOUT", "MediaRecorder stop watchdog was unavailable.", "MediaRecorder.stop"));
    }
    if (recorderOutcome.kind === "rejected") {
      return fail(error("MEDIA_RECORDER_RUNTIME_FAILED", "MediaRecorder terminal event failed safely.", "MediaRecorder"));
    }
    if (recorderOutcome.value.kind === "error") {
      return fail(error("MEDIA_RECORDER_RUNTIME_FAILED", "MediaRecorder failed during encoding.", "MediaRecorder.error"));
    }
    if (recorderOutcome.value.kind === "resource-limit") {
      return fail(recorderOutcome.value.error);
    }

    const blob = new Blob(terminal.chunks, { type: capability.mimeType });
    if (blob.size <= 0) {
      return fail(error("VIDEO_BLOB_EMPTY", "MediaRecorder produced no WebM bytes.", "blob"));
    }
    if (blob.size > MATH_SCENE_BROWSER_WEBM_MAX_BLOB_BYTES) {
      return fail(error("VIDEO_BLOB_TOO_LARGE", "Encoded WebM exceeds the bounded browser Blob limit.", "blob"));
    }

    if (request.captions) {
      const captionTextOutcome = await watchPromise(
        decodeUtf8Blob(request.captions.blob),
        browser,
        sessionAbort.signal,
        postCaptureDeadlineAtMs
      );
      if (captionTextOutcome.kind === "abort") return cancel();
      if (captionTextOutcome.kind === "timeout" || captionTextOutcome.kind === "timer-error") {
        return fail(error("CAPTURE_TIMEOUT", "WebVTT validation exceeded the post-capture deadline.", "captions.blob"));
      }
      if (
        captionTextOutcome.kind === "rejected" ||
        !/^WEBVTT(?:\r?\n|$)/u.test(captionTextOutcome.value) ||
        captionTextOutcome.value.includes("\0")
      ) {
        return fail(error("CAPTION_ARTIFACT_INVALID", "Caption sidecar bytes are not a valid WebVTT document.", "captions.blob"));
      }
      const captionHashOutcome = await watchPromise(
        browser.digestBlobSha256(request.captions.blob),
        browser,
        sessionAbort.signal,
        postCaptureDeadlineAtMs
      );
      if (captionHashOutcome.kind === "abort") return cancel();
      if (captionHashOutcome.kind === "timeout" || captionHashOutcome.kind === "timer-error") {
        return fail(error("CAPTURE_TIMEOUT", "WebVTT hashing exceeded the post-capture deadline.", "captions.blob"));
      }
      if (captionHashOutcome.kind === "rejected") {
        return fail(error("CAPTION_ARTIFACT_INVALID", "WebVTT SHA-256 could not be computed.", "captions.blob"));
      }
      captionArtifact = {
        blob: request.captions.blob,
        byteCount: request.captions.blob.size,
        contentHash: captionHashOutcome.value,
        fileName: request.captions.fileName,
        mimeType: "text/vtt"
      };
    }

    const evidenceOutcome = await watchPromise(verifyMathSceneWebmMediaEvidence({
      blob,
      durationToleranceSeconds: 1 / request.capturePlan.fps,
      expected: {
        audioExpected: request.audio !== null,
        durationSeconds: expectedDurationSeconds,
        height: request.surface.canvas.height,
        mimeType: capability.mimeType,
        width: request.surface.canvas.width
      },
      parseVideoMetadata: (candidate) => browser.parseVideoMetadata(candidate, sessionAbort.signal)
    }), browser, sessionAbort.signal, postCaptureDeadlineAtMs);
    if (evidenceOutcome.kind === "abort") return cancel();
    if (evidenceOutcome.kind === "timeout" || evidenceOutcome.kind === "timer-error") {
      return fail(error("CAPTURE_TIMEOUT", "WebM metadata validation exceeded the post-capture deadline.", "metadata"));
    }
    if (evidenceOutcome.kind === "rejected") {
      return fail(error("VIDEO_METADATA_PARSE_FAILED", "WebM metadata validation failed safely.", "metadata"));
    }
    const evidenceResult = evidenceOutcome.value;
    if (!evidenceResult.ok) return fail(evidenceResult.error);

    const mediaHashOutcome = await watchPromise(
      browser.digestBlobSha256(blob),
      browser,
      sessionAbort.signal,
      postCaptureDeadlineAtMs
    );
    if (mediaHashOutcome.kind === "abort") return cancel();
    if (mediaHashOutcome.kind === "timeout" || mediaHashOutcome.kind === "timer-error") {
      return fail(error("CAPTURE_TIMEOUT", "Encoded media hashing exceeded the post-capture deadline.", "mediaContentHash"));
    }
    if (mediaHashOutcome.kind === "rejected") {
      return fail(error("READY_RESULT_INVALID", "Encoded media SHA-256 could not be computed.", "mediaContentHash"));
    }
    const mediaContentHash = mediaHashOutcome.value;
    if (audioMixSession) {
      try {
        await audioMixSession.cleanup();
        audioMixSession = null;
      } catch {
        return fail(error("AUDIO_CLEANUP_FAILED", "Local Web Audio cleanup failed safely.", "audio.blob"));
      }
    }
    let createdAtIso: string;
    try {
      createdAtIso = browser.nowIso();
    } catch {
      return fail(error("READY_RESULT_INVALID", "Ready export timestamp could not be created.", "createdAtIso"));
    }
    const readyCandidate: MathSceneVideoExportReadyResult = {
      audioContentHash,
      audioIncluded: request.audio !== null,
      byteCount: evidenceResult.evidence.byteLength,
      captionFileName: captionArtifact?.fileName ?? null,
      captionsVttContentHash: captionArtifact?.contentHash ?? null,
      compositeEvidence: structuredClone(request.surface.compositeEvidence),
      createdAtIso,
      durationSeconds: evidenceResult.evidence.durationSeconds,
      errorCode: null,
      exportId: request.exportId,
      fileName: request.fileName,
      format: "webm",
      fps: request.capturePlan.fps,
      frameCount: request.capturePlan.frameCount,
      height: evidenceResult.evidence.height,
      mediaContentHash,
      metadataParsed: true,
      mimeType: evidenceResult.evidence.actualMimeType,
      packageContentHash: request.packageContentHash,
      profileContentHash: request.profileContentHash,
      profileId: request.profileId,
      sceneId: request.sceneId,
      schemaVersion: "mais-manim-video-export-result/v1",
      status: "ready",
      width: evidenceResult.evidence.width
    };
    const validated = validateMathSceneVideoExportReadyResult(readyCandidate);
    if (!validated.ok) {
      return fail(validated.errors[0] ?? error("READY_RESULT_INVALID", "Ready WebM evidence is invalid.", "result"));
    }
    const readyTransitionFailure = transition({
      attempt: state.attempt,
      result: validated.value,
      type: "succeed"
    });
    if (readyTransitionFailure) return fail(readyTransitionFailure);

    return {
      blob,
      captionArtifact,
      evidence: evidenceResult.evidence,
      ok: true,
      result: validated.value,
      state: state as MathSceneVideoExportState & { status: "ready" },
      stateHistory
    };
  } finally {
    if (captureWatchdogArmed) {
      try {
        browser.clearTimeout(captureWatchdogHandle);
      } catch {
        // Final cleanup is best effort; no ready result depends on it.
      }
    }
    sessionAbort.abort();
    request.abortSignal?.removeEventListener("abort", handleExternalAbort);
    stopRecorderSafely(recorder);
    terminal?.cleanup();
    stopStreamTracks(captureStream);
    if (audioMixSession) {
      try {
        await audioMixSession.cleanup();
      } catch {
        // Failed audio cleanup cannot manufacture a ready result; stream tracks
        // have already been stopped above.
      }
    }
  }
}
