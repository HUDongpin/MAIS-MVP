export type MathSceneEmitFrameStatus = "no-movie-output" | "not-called" | "skipped" | "write-frame";

export const SCENE_EMIT_FRAME_SOURCE_CONTRACT =
  "Scene.emit_frame -> skip_animations guards file_writer.write_frame(camera); SceneFileWriter.write_frame reads camera.get_raw_fbo_data only when write_to_movie and updates active progress display after frame write";

export const SCENE_EMIT_FRAME_WRITE_POLICY =
  "skip-guard-before-file-writer-write-frame-only-read-raw-fbo-when-write-to-movie-update-progress-display-after-write";

export type MathSceneEmitFramePlan = {
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

export type MathSceneEmitFrameInput = {
  called?: boolean;
  cameraId?: string;
  frameIndex?: number;
  progressDisplayActive?: boolean;
  skipAnimations?: boolean;
  writeToMovie?: boolean;
};

function stableFrameIndex(value: number | undefined) {
  return Math.max(0, Math.floor(typeof value === "number" && Number.isFinite(value) ? value : 0));
}

function stableValue(value: unknown): unknown {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry) ?? null);
  if (!value || typeof value !== "object") return value;

  const stableObject: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) {
    if (entry !== undefined) stableObject[key] = stableValue(entry);
  }

  return stableObject;
}

function stableSerialize(value: unknown) {
  return JSON.stringify(stableValue(value))
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function statusFor(input: {
  callsSceneEmitFrame: boolean;
  skipAnimations: boolean;
  writeToMovie: boolean;
}): MathSceneEmitFrameStatus {
  if (!input.callsSceneEmitFrame) return "not-called";
  if (input.skipAnimations) return "skipped";
  return input.writeToMovie ? "write-frame" : "no-movie-output";
}

function buildSummary(plan: Omit<MathSceneEmitFramePlan, "emitFrameVersion" | "summary">) {
  return [
    `emitFrame:status=${plan.status}`,
    `frame=${plan.frameIndex}`,
    `skip=${String(plan.skipAnimations)}`,
    `writeToMovie=${String(plan.writeToMovie)}`,
    `write=${String(plan.writesMovieFrame)}`
  ].join(":");
}

// Manim source contract:
// - Scene.emit_frame checks skip_animations before touching the file writer.
// - When not skipped, it calls file_writer.write_frame(self.camera).
// - SceneFileWriter.write_frame(camera) only writes bytes when write_to_movie is
//   true, reading camera.get_raw_fbo_data() and then updating the progress
//   display if one is active.
export function buildSceneEmitFramePlan(input: MathSceneEmitFrameInput = {}): MathSceneEmitFramePlan {
  const callsSceneEmitFrame = input.called !== false;
  const skipAnimations = input.skipAnimations === true;
  const writeToMovie = input.writeToMovie !== false;
  const progressDisplayActive = input.progressDisplayActive === true;
  const status = statusFor({ callsSceneEmitFrame, skipAnimations, writeToMovie });
  const callsFileWriterWriteFrame = callsSceneEmitFrame && !skipAnimations;
  const writesMovieFrame = callsFileWriterWriteFrame && writeToMovie;
  const basePlan: Omit<MathSceneEmitFramePlan, "emitFrameVersion" | "summary"> = {
    cameraId: input.cameraId?.trim() || "scene-camera",
    callsFileWriterWriteFrame,
    callsSceneEmitFrame,
    frameIndex: stableFrameIndex(input.frameIndex),
    progressDisplayActive,
    readsCameraRawFboData: writesMovieFrame,
    skipAnimations,
    sourceContract: SCENE_EMIT_FRAME_SOURCE_CONTRACT,
    status,
    updatesProgressDisplay: writesMovieFrame && progressDisplayActive,
    writePolicy: SCENE_EMIT_FRAME_WRITE_POLICY,
    writesMovieFrame,
    writeToMovie
  };

  return {
    ...basePlan,
    emitFrameVersion: "mais-manim-emit-frame/v1",
    summary: buildSummary(basePlan)
  };
}

export function sceneEmitFrameDataAttributes(plan: MathSceneEmitFramePlan): Record<string, string> {
  return {
    "data-viz-manim-emit-frame-camera-id": plan.cameraId,
    "data-viz-manim-emit-frame-calls-file-writer": String(plan.callsFileWriterWriteFrame),
    "data-viz-manim-emit-frame-called": String(plan.callsSceneEmitFrame),
    "data-viz-manim-emit-frame-frame-index": String(plan.frameIndex),
    "data-viz-manim-emit-frame-progress-display": String(plan.progressDisplayActive),
    "data-viz-manim-emit-frame-raw-fbo": String(plan.readsCameraRawFboData),
    "data-viz-manim-emit-frame-skip": String(plan.skipAnimations),
    "data-viz-manim-emit-frame-source-contract": plan.sourceContract,
    "data-viz-manim-emit-frame-status": plan.status,
    "data-viz-manim-emit-frame-summary": plan.summary,
    "data-viz-manim-emit-frame-updates-progress-display": String(plan.updatesProgressDisplay),
    "data-viz-manim-emit-frame-write-policy": plan.writePolicy,
    "data-viz-manim-emit-frame-write-movie": String(plan.writesMovieFrame),
    "data-viz-manim-emit-frame-write-to-movie": String(plan.writeToMovie)
  };
}

export function serializeSceneEmitFramePlan(plan: MathSceneEmitFramePlan) {
  return stableSerialize(plan);
}
