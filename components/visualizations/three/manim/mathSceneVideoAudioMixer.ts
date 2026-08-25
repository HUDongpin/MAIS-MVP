import type { MathSceneVideoExportError } from "./mathSceneVideoExportContract";

export const MATH_SCENE_VIDEO_AUDIO_ADAPTER_CONTRACT =
  "The audio mixer plans zero or a single local track and delegates local decoding, padding, truncation, inspection, and cleanup to an injected adapter." as const;

export type MathSceneVideoLocalAudioTrack = {
  contentHash: string;
  durationSeconds: number;
  fileName: string;
  mimeType: "audio/mp4" | "audio/mpeg" | "audio/ogg" | "audio/wav" | "audio/webm";
  source: "local-file";
  trackId: string;
};

export type MathSceneVideoAudioMixStrategy =
  | "no-audio"
  | "passthrough"
  | "pad-silence"
  | "truncate";

export type MathSceneVideoAudioMixPlan = {
  adjustmentSeconds: number;
  requiresAdapter: boolean;
  schemaVersion: "mais-manim-video-audio-mix-plan/v1";
  sourceTrack: MathSceneVideoLocalAudioTrack | null;
  sourceTrackCount: 0 | 1;
  strategy: MathSceneVideoAudioMixStrategy;
  targetDurationSeconds: number;
};

export type MathSceneVideoAudioMixPlanResult =
  | { ok: true; plan: MathSceneVideoAudioMixPlan }
  | { error: MathSceneVideoExportError; ok: false };

export type MathSceneVideoAudioInspection = {
  durationSeconds: number;
  trackCount: number;
};

export type MathSceneVideoAudioMixerAdapter<Handle = unknown> = {
  cleanup: (handle: Handle) => void | Promise<void>;
  inspectMixedTrack: (handle: Handle) => MathSceneVideoAudioInspection | Promise<MathSceneVideoAudioInspection>;
  openLocalTrack: (source: MathSceneVideoLocalAudioTrack) => Handle | Promise<Handle>;
  padSilence: (handle: Handle, seconds: number) => void | Promise<void>;
  truncate: (handle: Handle, targetDurationSeconds: number) => void | Promise<void>;
};

export type MathSceneVideoAudioAbortSignal = {
  readonly aborted: boolean;
};

export type MathSceneVideoAudioEvidence = {
  cleanupCompleted: true;
  durationSeconds: number;
  included: boolean;
  schemaVersion: "mais-manim-video-audio-evidence/v1";
  sourceContentHash: string | null;
  strategy: MathSceneVideoAudioMixStrategy;
  trackCount: 0 | 1;
};

export type MathSceneVideoAudioMixRunResult =
  | { evidence: MathSceneVideoAudioEvidence; ok: true }
  | { error: MathSceneVideoExportError; ok: false };

const trackFields = new Set([
  "contentHash",
  "durationSeconds",
  "fileName",
  "mimeType",
  "source",
  "trackId"
]);
const audioMimeTypes = new Set(["audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav", "audio/webm"]);

function failure(
  code: Extract<
    MathSceneVideoExportError["code"],
    | "AUDIO_TRACK_COUNT_INVALID"
    | "AUDIO_SOURCE_INVALID"
    | "AUDIO_PLAN_INVALID"
    | "AUDIO_MIX_ABORTED"
    | "AUDIO_MIX_FAILED"
    | "AUDIO_CLEANUP_FAILED"
  >,
  message: string,
  path: string
): { error: MathSceneVideoExportError; ok: false } {
  return { error: { code, message, path }, ok: false };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validLocalFileName(value: unknown) {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    !/[\\/\u0000-\u001f]/.test(value) &&
    !/^[a-z][a-z0-9+.-]*:/i.test(value) &&
    value !== "." &&
    value !== "..";
}

function validLocalTrack(value: unknown): value is MathSceneVideoLocalAudioTrack {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  return keys.length === trackFields.size &&
    keys.every((key) => trackFields.has(key)) &&
    typeof value.contentHash === "string" &&
    /^sha256-[a-f0-9]{64}$/.test(value.contentHash) &&
    typeof value.durationSeconds === "number" &&
    Number.isFinite(value.durationSeconds) &&
    value.durationSeconds > 0 &&
    validLocalFileName(value.fileName) &&
    typeof value.mimeType === "string" &&
    audioMimeTypes.has(value.mimeType) &&
    value.source === "local-file" &&
    typeof value.trackId === "string" &&
    value.trackId.trim().length > 0;
}

function strategyFor(sourceDurationSeconds: number, targetDurationSeconds: number): MathSceneVideoAudioMixStrategy {
  if (sourceDurationSeconds < targetDurationSeconds) return "pad-silence";
  if (sourceDurationSeconds > targetDurationSeconds) return "truncate";
  return "passthrough";
}

export function buildMathSceneVideoAudioMixPlan({
  tracks,
  videoDurationSeconds
}: {
  tracks: readonly MathSceneVideoLocalAudioTrack[];
  videoDurationSeconds: number;
}): MathSceneVideoAudioMixPlanResult {
  if (!Number.isFinite(videoDurationSeconds) || videoDurationSeconds <= 0) {
    return failure("AUDIO_PLAN_INVALID", "Video duration must be positive and finite.", "videoDurationSeconds");
  }
  if (!Array.isArray(tracks) || tracks.length > 1) {
    return failure("AUDIO_TRACK_COUNT_INVALID", "Video export accepts at most one local audio track.", "tracks");
  }
  if (tracks.length === 0) {
    return {
      ok: true,
      plan: {
        adjustmentSeconds: 0,
        requiresAdapter: false,
        schemaVersion: "mais-manim-video-audio-mix-plan/v1",
        sourceTrack: null,
        sourceTrackCount: 0,
        strategy: "no-audio",
        targetDurationSeconds: videoDurationSeconds
      }
    };
  }

  const sourceTrack = tracks[0];
  if (!validLocalTrack(sourceTrack)) {
    return failure("AUDIO_SOURCE_INVALID", "Audio source must be one exact local-file track.", "tracks[0]");
  }
  const strategy = strategyFor(sourceTrack.durationSeconds, videoDurationSeconds);
  return {
    ok: true,
    plan: {
      adjustmentSeconds: Math.abs(videoDurationSeconds - sourceTrack.durationSeconds),
      requiresAdapter: true,
      schemaVersion: "mais-manim-video-audio-mix-plan/v1",
      sourceTrack: structuredClone(sourceTrack),
      sourceTrackCount: 1,
      strategy,
      targetDurationSeconds: videoDurationSeconds
    }
  };
}

function validatePlan(plan: MathSceneVideoAudioMixPlan): MathSceneVideoAudioMixPlanResult {
  if (!plan || typeof plan !== "object") {
    return failure("AUDIO_PLAN_INVALID", "Audio mix plan is inconsistent.", "plan");
  }
  const rebuilt = buildMathSceneVideoAudioMixPlan({
    tracks: plan.sourceTrack ? [plan.sourceTrack] : [],
    videoDurationSeconds: plan.targetDurationSeconds
  });
  if (!rebuilt.ok || stableSerialize(rebuilt.plan) !== stableSerialize(plan)) {
    return failure("AUDIO_PLAN_INVALID", "Audio mix plan is inconsistent.", "plan");
  }
  return rebuilt;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((entry) => stableSerialize(entry)).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function aborted(): MathSceneVideoAudioMixRunResult {
  return failure("AUDIO_MIX_ABORTED", "Local audio mixing was aborted.", "abortSignal");
}

export async function runMathSceneVideoAudioMixPlan<Handle>({
  abortSignal,
  adapter,
  durationToleranceSeconds = 0.02,
  plan
}: {
  abortSignal?: MathSceneVideoAudioAbortSignal;
  adapter: MathSceneVideoAudioMixerAdapter<Handle>;
  durationToleranceSeconds?: number;
  plan: MathSceneVideoAudioMixPlan;
}): Promise<MathSceneVideoAudioMixRunResult> {
  const validated = validatePlan(plan);
  if (!validated.ok) return validated;
  if (!Number.isFinite(durationToleranceSeconds) || durationToleranceSeconds < 0) {
    return failure("AUDIO_PLAN_INVALID", "Audio evidence tolerance is invalid.", "durationToleranceSeconds");
  }

  const normalizedPlan = validated.plan;
  if (normalizedPlan.strategy === "no-audio") {
    return {
      evidence: {
        cleanupCompleted: true,
        durationSeconds: normalizedPlan.targetDurationSeconds,
        included: false,
        schemaVersion: "mais-manim-video-audio-evidence/v1",
        sourceContentHash: null,
        strategy: "no-audio",
        trackCount: 0
      },
      ok: true
    };
  }
  if (abortSignal?.aborted) return aborted();

  let handle!: Handle;
  let handleOpened = false;
  let outcome: MathSceneVideoAudioMixRunResult;
  try {
    handle = await adapter.openLocalTrack(normalizedPlan.sourceTrack as MathSceneVideoLocalAudioTrack);
    handleOpened = true;
    if (abortSignal?.aborted) {
      outcome = aborted();
    } else {
      if (normalizedPlan.strategy === "pad-silence") {
        await adapter.padSilence(handle, normalizedPlan.adjustmentSeconds);
      } else if (normalizedPlan.strategy === "truncate") {
        await adapter.truncate(handle, normalizedPlan.targetDurationSeconds);
      }

      if (abortSignal?.aborted) {
        outcome = aborted();
      } else {
        const inspected = await adapter.inspectMixedTrack(handle);
        if (
          !inspected ||
          inspected.trackCount !== 1 ||
          !Number.isFinite(inspected.durationSeconds) ||
          Math.abs(inspected.durationSeconds - normalizedPlan.targetDurationSeconds) > durationToleranceSeconds
        ) {
          outcome = failure(
            "AUDIO_MIX_FAILED",
            "Local audio adapter evidence does not match the single-track mix plan.",
            "adapter.inspectMixedTrack"
          );
        } else {
          outcome = {
            evidence: {
              cleanupCompleted: true,
              durationSeconds: inspected.durationSeconds,
              included: true,
              schemaVersion: "mais-manim-video-audio-evidence/v1",
              sourceContentHash: normalizedPlan.sourceTrack?.contentHash ?? null,
              strategy: normalizedPlan.strategy,
              trackCount: 1
            },
            ok: true
          };
        }
      }
    }
  } catch {
    outcome = failure("AUDIO_MIX_FAILED", "Local audio adapter failed safely.", "adapter");
  }

  if (handleOpened) {
    try {
      await adapter.cleanup(handle);
    } catch {
      return failure("AUDIO_CLEANUP_FAILED", "Local audio adapter cleanup failed safely.", "adapter.cleanup");
    }
  }
  return outcome;
}
