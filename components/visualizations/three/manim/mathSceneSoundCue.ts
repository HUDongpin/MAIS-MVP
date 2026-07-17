export const SCENE_SOUND_CUE_SOURCE_CONTRACT =
  "Scene.add_sound|SceneFileWriter.add_sound|negative timestamp guard";

export type MathSceneSoundCueStatus = "negative-time" | "scheduled" | "skip-animations";

export type MathSceneSoundCueSpec = {
  gain?: number;
  gainToBackground?: number;
  id: string;
  sceneTime: number;
  soundFile: string;
  timeOffset?: number;
};

export type MathSceneSoundCueRow = {
  cueId: string;
  gain: number | null;
  gainToBackground: number | null;
  scheduledTime: number;
  soundFile: string;
  status: MathSceneSoundCueStatus;
  timeOffset: number;
};

export type MathSceneSoundCuePlan = {
  audibleCueCount: number;
  cueCount: number;
  includesSound: boolean;
  issueCount: number;
  rows: MathSceneSoundCueRow[];
  scheduledCueIds: string;
  skippedCueCount: number;
  sourceContract: typeof SCENE_SOUND_CUE_SOURCE_CONTRACT;
  summary: string;
};

export type MathSceneSoundCuePlanInput = {
  cues: MathSceneSoundCueSpec[];
  skipAnimations?: boolean;
};

function finite(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stableNumber(value: number) {
  return Number(finite(value, 0).toFixed(6));
}

function stableNullableNumber(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? stableNumber(value) : null;
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

function soundCueStatus(scheduledTime: number, skipAnimations: boolean): MathSceneSoundCueStatus {
  if (skipAnimations) return "skip-animations";
  if (scheduledTime < 0) return "negative-time";
  return "scheduled";
}

function soundCueSummary(plan: Omit<MathSceneSoundCuePlan, "summary">) {
  return [
    `soundCues:total=${plan.cueCount}`,
    `audible=${plan.audibleCueCount}`,
    `skipped=${plan.skippedCueCount}`,
    `issues=${plan.issueCount}`,
    `ids=${plan.scheduledCueIds}`
  ].join(":");
}

function formatNumber(value: number) {
  return stableNumber(value).toFixed(3);
}

function formatNullableNumber(value: number | null) {
  return value === null ? "none" : formatNumber(value);
}

function rowIds(rows: MathSceneSoundCueRow[]) {
  return rows.map((row) => row.cueId).join(",") || "none";
}

function rowStatusSummary(rows: MathSceneSoundCueRow[]) {
  return rows.map((row) => `${row.cueId}:${row.status}`).join("|") || "none";
}

function rowScheduledTimeSummary(rows: MathSceneSoundCueRow[]) {
  return rows.map((row) => `${row.cueId}:${formatNumber(row.scheduledTime)}`).join("|") || "none";
}

function rowTimeOffsetSummary(rows: MathSceneSoundCueRow[]) {
  return rows.map((row) => `${row.cueId}:${formatNumber(row.timeOffset)}`).join("|") || "none";
}

function rowGainSummary(rows: MathSceneSoundCueRow[]) {
  return rows
    .map((row) => `${row.cueId}:gain=${formatNullableNumber(row.gain)}:background=${formatNullableNumber(row.gainToBackground)}`)
    .join("|") || "none";
}

function soundFileCount(rows: MathSceneSoundCueRow[]) {
  return rows.filter((row) => row.soundFile.trim().length > 0).length;
}

// Manim source contract:
// Scene.add_sound(sound_file, time_offset=0, gain=None, gain_to_background=None)
// returns immediately when skip_animations is true. Otherwise it schedules
// file_writer.add_sound(sound_file, scene.get_time() + time_offset, ...).
// SceneFileWriter.add_audio_segment raises "Adding sound at timestamp < 0"
// for negative timestamps, so the browser planner exposes that as an issue.
export function buildSceneSoundCuePlan(input: MathSceneSoundCuePlanInput): MathSceneSoundCuePlan {
  const skipAnimations = input.skipAnimations === true;
  const rows = input.cues.map((cue) => {
    const timeOffset = stableNumber(finite(cue.timeOffset, 0));
    const scheduledTime = stableNumber(finite(cue.sceneTime, 0) + timeOffset);
    const status = soundCueStatus(scheduledTime, skipAnimations);

    return {
      cueId: cue.id,
      gain: stableNullableNumber(cue.gain),
      gainToBackground: stableNullableNumber(cue.gainToBackground),
      scheduledTime,
      soundFile: cue.soundFile,
      status,
      timeOffset
    };
  });
  const scheduledRows = rows.filter((row) => row.status === "scheduled");
  const basePlan: Omit<MathSceneSoundCuePlan, "summary"> = {
    audibleCueCount: scheduledRows.length,
    cueCount: rows.length,
    includesSound: scheduledRows.length > 0,
    issueCount: rows.filter((row) => row.status === "negative-time").length,
    rows,
    scheduledCueIds: scheduledRows.map((row) => row.cueId).join(",") || "none",
    skippedCueCount: rows.filter((row) => row.status === "skip-animations").length,
    sourceContract: SCENE_SOUND_CUE_SOURCE_CONTRACT
  };

  return {
    ...basePlan,
    summary: soundCueSummary(basePlan)
  };
}

export function sceneSoundCueDataAttributes(plan: MathSceneSoundCuePlan): Record<string, string> {
  return {
    "data-viz-manim-sound-cue-audible-count": String(plan.audibleCueCount),
    "data-viz-manim-sound-cue-count": String(plan.cueCount),
    "data-viz-manim-sound-cue-gain-summary": rowGainSummary(plan.rows),
    "data-viz-manim-sound-cue-includes-sound": String(plan.includesSound),
    "data-viz-manim-sound-cue-issue-count": String(plan.issueCount),
    "data-viz-manim-sound-cue-ids": rowIds(plan.rows),
    "data-viz-manim-sound-cue-row-count": String(plan.rows.length),
    "data-viz-manim-sound-cue-scheduled-ids": plan.scheduledCueIds,
    "data-viz-manim-sound-cue-scheduled-time-summary": rowScheduledTimeSummary(plan.rows),
    "data-viz-manim-sound-cue-skipped-count": String(plan.skippedCueCount),
    "data-viz-manim-sound-cue-sound-file-count": String(soundFileCount(plan.rows)),
    "data-viz-manim-sound-cue-source-contract": plan.sourceContract,
    "data-viz-manim-sound-cue-status-summary": rowStatusSummary(plan.rows),
    "data-viz-manim-sound-cue-summary": plan.summary,
    "data-viz-manim-sound-cue-time-offset-summary": rowTimeOffsetSummary(plan.rows)
  };
}

export function serializeSceneSoundCuePlan(plan: MathSceneSoundCuePlan) {
  return stableSerialize(plan);
}
