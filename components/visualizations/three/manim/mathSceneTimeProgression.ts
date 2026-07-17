export const SCENE_TIME_PROGRESSION_SOURCE_CONTRACT =
  "Scene.get_time_progression|skip_animations|override_skip_animations|fps sampling";

export const SCENE_TIME_PROGRESSION_SAMPLING_POLICY =
  "skip-animations-yields-final-run-time-unless-overridden-otherwise-sample-arange-plus-one-frame-interval-from-camera-fps";

export type MathSceneTimeProgressionMode = "sampled" | "skip-final";

export type MathSceneTimeProgressionPlan = {
  description: string;
  finalTime: number;
  fps: number;
  frameInterval: number;
  mode: MathSceneTimeProgressionMode;
  nIterations: number;
  overrideSkipAnimations: boolean;
  overshootsRunTime: boolean;
  runTime: number;
  samplingPolicy: typeof SCENE_TIME_PROGRESSION_SAMPLING_POLICY;
  skipAnimations: boolean;
  sourceContract: typeof SCENE_TIME_PROGRESSION_SOURCE_CONTRACT;
  summary: string;
  times: number[];
};

export type MathSceneTimeProgressionInput = {
  description?: string;
  fps?: number;
  nIterations?: number;
  overrideSkipAnimations?: boolean;
  runTime: number;
  skipAnimations?: boolean;
};

function finite(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stableNumber(value: number) {
  return Number(finite(value, 0).toFixed(6));
}

function stableFps(value: number | undefined) {
  return Math.max(1, Math.floor(finite(value, 60)));
}

function stableRunTime(value: number) {
  return Math.max(0, stableNumber(value));
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

function sampledTimes(runTime: number, frameInterval: number) {
  const times: number[] = [];
  let baseTime = 0;

  // Manim source contract: Scene.get_time_progression first checks
  // skip_animations unless override_skip_animations is set, then builds
  // np.arange(0, run_time, 1 / camera.fps) + 1 / camera.fps.
  while (baseTime < runTime - 1e-9) {
    const nextTime = stableNumber(baseTime + frameInterval);
    times.push(nextTime);
    baseTime = nextTime;
  }

  return times;
}

function progressionSummary(plan: Omit<MathSceneTimeProgressionPlan, "summary">) {
  return [
    `timeProgression:${plan.mode}`,
    `run=${plan.runTime.toFixed(3)}`,
    `fps=${plan.fps}`,
    `frames=${plan.times.length}`,
    `final=${plan.finalTime.toFixed(3)}`,
    `overshoot=${String(plan.overshootsRunTime)}`
  ].join(":");
}

function timesSummary(times: number[]) {
  return `times:${times.map((time) => time.toFixed(3)).join(",") || "none"}`;
}

export function buildSceneTimeProgression(input: MathSceneTimeProgressionInput): MathSceneTimeProgressionPlan {
  const fps = stableFps(input.fps);
  const runTime = stableRunTime(input.runTime);
  const frameInterval = stableNumber(1 / fps);
  const skipAnimations = input.skipAnimations === true;
  const overrideSkipAnimations = input.overrideSkipAnimations === true;
  const description = input.description ?? "";

  if (skipAnimations && !overrideSkipAnimations) {
    const times = [runTime];
    const basePlan: Omit<MathSceneTimeProgressionPlan, "summary"> = {
      description,
      finalTime: runTime,
      fps,
      frameInterval,
      mode: "skip-final" as const,
      nIterations: input.nIterations ?? times.length,
      overrideSkipAnimations,
      overshootsRunTime: false,
      runTime,
      samplingPolicy: SCENE_TIME_PROGRESSION_SAMPLING_POLICY,
      skipAnimations,
      sourceContract: SCENE_TIME_PROGRESSION_SOURCE_CONTRACT,
      times
    };

    return {
      ...basePlan,
      summary: progressionSummary(basePlan)
    };
  }

  const times = sampledTimes(runTime, frameInterval);
  const finalTime = times.at(-1) ?? 0;
  const basePlan: Omit<MathSceneTimeProgressionPlan, "summary"> = {
    description,
    finalTime,
    fps,
    frameInterval,
    mode: "sampled" as const,
    nIterations: input.nIterations ?? times.length,
    overrideSkipAnimations,
    overshootsRunTime: finalTime > runTime,
    runTime,
    samplingPolicy: SCENE_TIME_PROGRESSION_SAMPLING_POLICY,
    skipAnimations,
    sourceContract: SCENE_TIME_PROGRESSION_SOURCE_CONTRACT,
    times
  };

  return {
    ...basePlan,
    summary: progressionSummary(basePlan)
  };
}

export function sceneTimeProgressionDataAttributes(plan: MathSceneTimeProgressionPlan): Record<string, string> {
  return {
    "data-viz-manim-time-progression-description": plan.description,
    "data-viz-manim-time-progression-final-time": plan.finalTime.toFixed(3),
    "data-viz-manim-time-progression-fps": String(plan.fps),
    "data-viz-manim-time-progression-frame-count": String(plan.times.length),
    "data-viz-manim-time-progression-frame-interval": plan.frameInterval.toFixed(3),
    "data-viz-manim-time-progression-mode": plan.mode,
    "data-viz-manim-time-progression-n-iterations": String(plan.nIterations),
    "data-viz-manim-time-progression-override-skip": String(plan.overrideSkipAnimations),
    "data-viz-manim-time-progression-overshoot": String(plan.overshootsRunTime),
    "data-viz-manim-time-progression-run-time": plan.runTime.toFixed(3),
    "data-viz-manim-time-progression-sampling-policy": plan.samplingPolicy,
    "data-viz-manim-time-progression-skip-animations": String(plan.skipAnimations),
    "data-viz-manim-time-progression-source-contract": plan.sourceContract,
    "data-viz-manim-time-progression-summary": plan.summary,
    "data-viz-manim-time-progression-times-summary": timesSummary(plan.times)
  };
}

export function serializeSceneTimeProgression(plan: MathSceneTimeProgressionPlan) {
  return stableSerialize(plan);
}
