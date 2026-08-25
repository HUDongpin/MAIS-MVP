import type { MathSceneVideoExportError } from "./mathSceneVideoExportContract";

export const MATH_SCENE_CAPTURE_CLOCK_V3_INDEPENDENCE_CONTRACT =
  "The export capture clock is independent from ordinary interactive playback and consumes capture-plan frame times only." as const;

export type MathSceneCaptureClockPlanV3 = {
  fps: number;
  frameCount: number;
  frameTimes: readonly number[];
};

export type MathSceneCaptureFrameV3 = {
  fps: number;
  frameIndex: number;
  timeSeconds: number;
};

export type MathSceneCaptureAbortSignal = {
  readonly aborted: boolean;
};

export type MathSceneCaptureFramesV3Result =
  | { frames: MathSceneCaptureFrameV3[]; ok: true }
  | { error: MathSceneVideoExportError; ok: false };

export type MathSceneCaptureClockV3RunResult =
  | {
      completedFrameCount: number;
      durationSeconds: number;
      lastFrameIndex: number;
      ok: true;
    }
  | {
      completedFrameCount: number;
      error: MathSceneVideoExportError;
      lastFrameIndex: number | null;
      ok: false;
    };

export type MathSceneCaptureClockV3RunInput = {
  abortSignal?: MathSceneCaptureAbortSignal;
  capturePlan: MathSceneCaptureClockPlanV3;
  deadlineAtMs?: number;
  nowMs?: () => number;
  renderFrame: (frame: MathSceneCaptureFrameV3) => void | Promise<void>;
};

function invalidPlan(path: string, message: string): MathSceneCaptureFramesV3Result {
  return {
    error: { code: "CAPTURE_PLAN_INVALID", message, path },
    ok: false
  };
}

export function buildMathSceneCaptureFramesV3(
  capturePlan: MathSceneCaptureClockPlanV3
): MathSceneCaptureFramesV3Result {
  if (!capturePlan || typeof capturePlan !== "object") {
    return invalidPlan("capturePlan", "Capture clock requires a plan.");
  }
  if (!Number.isInteger(capturePlan.fps) || capturePlan.fps <= 0) {
    return invalidPlan("capturePlan.fps", "Capture fps must be a positive integer.");
  }
  if (!Number.isInteger(capturePlan.frameCount) || capturePlan.frameCount <= 0) {
    return invalidPlan("capturePlan.frameCount", "Capture frame count must be a positive integer.");
  }
  if (!Array.isArray(capturePlan.frameTimes) || capturePlan.frameTimes.length !== capturePlan.frameCount) {
    return invalidPlan("capturePlan.frameTimes", "Capture frame times must match frame count exactly.");
  }
  if (capturePlan.frameTimes[0] !== 0) {
    return invalidPlan("capturePlan.frameTimes[0]", "Capture frame times must start exactly at t=0.");
  }

  for (let index = 0; index < capturePlan.frameTimes.length; index += 1) {
    const timeSeconds = capturePlan.frameTimes[index];
    if (!Number.isFinite(timeSeconds) || timeSeconds < 0) {
      return invalidPlan(`capturePlan.frameTimes[${index}]`, "Capture frame time must be finite and non-negative.");
    }
    if (index > 0 && timeSeconds <= capturePlan.frameTimes[index - 1]) {
      return invalidPlan(`capturePlan.frameTimes[${index}]`, "Capture frame times must be strictly monotonic.");
    }
  }

  return {
    frames: capturePlan.frameTimes.map((timeSeconds, frameIndex) => ({
      fps: capturePlan.fps,
      frameIndex,
      timeSeconds
    })),
    ok: true
  };
}

function interrupted(
  code: "CAPTURE_ABORTED" | "CAPTURE_TIMEOUT",
  completedFrameCount: number,
  message: string
): MathSceneCaptureClockV3RunResult {
  return {
    completedFrameCount,
    error: { code, message, path: code === "CAPTURE_TIMEOUT" ? "deadlineAtMs" : "abortSignal" },
    lastFrameIndex: completedFrameCount === 0 ? null : completedFrameCount - 1,
    ok: false
  };
}

export async function runMathSceneCaptureClockV3({
  abortSignal,
  capturePlan,
  deadlineAtMs,
  nowMs = Date.now,
  renderFrame
}: MathSceneCaptureClockV3RunInput): Promise<MathSceneCaptureClockV3RunResult> {
  const built = buildMathSceneCaptureFramesV3(capturePlan);
  if (!built.ok) {
    return {
      completedFrameCount: 0,
      error: built.error,
      lastFrameIndex: null,
      ok: false
    };
  }
  if (deadlineAtMs !== undefined && !Number.isFinite(deadlineAtMs)) {
    return {
      completedFrameCount: 0,
      error: {
        code: "CAPTURE_PLAN_INVALID",
        message: "Capture deadline must be a finite absolute timestamp.",
        path: "deadlineAtMs"
      },
      lastFrameIndex: null,
      ok: false
    };
  }

  let completedFrameCount = 0;
  for (const frame of built.frames) {
    if (abortSignal?.aborted) {
      return interrupted("CAPTURE_ABORTED", completedFrameCount, "Capture clock was aborted.");
    }
    if (deadlineAtMs !== undefined && nowMs() >= deadlineAtMs) {
      return interrupted("CAPTURE_TIMEOUT", completedFrameCount, "Capture clock reached its deadline.");
    }

    await renderFrame(frame);
    completedFrameCount += 1;

    if (abortSignal?.aborted) {
      return interrupted("CAPTURE_ABORTED", completedFrameCount, "Capture clock was aborted.");
    }
    if (deadlineAtMs !== undefined && nowMs() >= deadlineAtMs) {
      return interrupted("CAPTURE_TIMEOUT", completedFrameCount, "Capture clock reached its deadline.");
    }
  }

  return {
    completedFrameCount,
    durationSeconds: built.frames.at(-1)?.timeSeconds ?? 0,
    lastFrameIndex: built.frames.length - 1,
    ok: true
  };
}
