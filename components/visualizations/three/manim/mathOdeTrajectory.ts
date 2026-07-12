import type {
  AxisRangeSpec,
  MathSceneOdeSystemSpec,
  MathSceneOdeTrajectorySpec,
  MathSceneSpec,
  Range2,
  Vec3
} from "./mathSceneTypes";

export type MathOdeMethod = "euler" | "rk4";

export const ODE_TRAJECTORY_SOURCE_CONTRACT =
  "ode_solution_points|ParametricCurve trajectory samples|time-indexed dynamic-system path";
export const ODE_TRAJECTORY_SOLVER_CONTRACT = "ode_solution_points|rk4|euler";

export type MathOdeSystem = (state: Vec3, time: number) => Vec3;

export type MathOdeStoppedReason = "completed" | "non-finite-derivative" | "out-of-bounds";

export type MathOdeTrajectorySample = {
  derivative: Vec3;
  finite: boolean;
  index: number;
  point: Vec3;
  time: number;
};

export type MathOdeTrajectory = {
  bounds?: AxisRangeSpec;
  conceptId: string;
  finiteSampleCount: number;
  id: string;
  initialState: Vec3;
  method: MathOdeMethod;
  sampleCount: number;
  samples: MathOdeTrajectorySample[];
  sourceStepCount: number;
  sourceSystemSummary: string;
  stepSize: number;
  stoppedReason: MathOdeStoppedReason;
  tailSamples: MathOdeTrajectorySample[];
  tRange: Range2;
};

export type BuildOdeTrajectoryInput = {
  bounds?: AxisRangeSpec;
  conceptId: string;
  id: string;
  method?: MathOdeMethod;
  sourceSystemSummary?: string;
  start: Vec3;
  stepCount: number;
  system: MathOdeSystem;
  tailDurationSeconds?: number;
  tRange: Range2;
};

export type OdeTrajectorySummary = {
  boundsSummary: string;
  finiteSampleCount: number;
  initialStateSummary: string;
  methodIds: string;
  sampleCount: number;
  sourceContract: typeof ODE_TRAJECTORY_SOURCE_CONTRACT;
  solverContract: string;
  stepCountSummary: string;
  stepSizeSummary: string;
  stoppedCount: number;
  stoppedReasonSummary: string;
  summary: string;
  systemSummary: string;
  tailSampleCount: number;
  timeRangeSummary: string;
  trajectoryCount: number;
  trajectoryIds: string;
};

export type OdeTrajectoryPayload = OdeTrajectorySummary & {
  trajectories: MathOdeTrajectory[];
  version: "mais-manim-ode-trajectory/v1";
};

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function stableValue(value: unknown): unknown {
  if (typeof value === "function") return "[function]";
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

function formatFixed(value: number) {
  return Number.isFinite(value) ? value.toFixed(3) : "NaN";
}

function formatVec3(vector: Vec3) {
  return `[${vector.map(formatFixed).join(",")}]`;
}

function formatRange(range: Range2) {
  return `[${formatFixed(range[0])},${formatFixed(range[1])}]`;
}

function formatBoundsRange(bounds: AxisRangeSpec | undefined) {
  if (!bounds) return "none";

  return `x=${formatRange(bounds.x)},y=${formatRange(bounds.y)},z=${formatRange(bounds.z)}`;
}

function formatSceneOdeSystem(system: MathSceneOdeSystemSpec) {
  if (system.type === "constantVelocity") return `constantVelocity${formatVec3(sanitizeVec3(system.velocity))}`;
  if (system.type === "lorenz") {
    return `lorenz(sigma=${formatFixed(system.sigma)},rho=${formatFixed(system.rho)},beta=${formatFixed(system.beta)})`;
  }

  return `linear2d[[${system.matrix[0].map(formatFixed).join(",")}],[${system.matrix[1].map(formatFixed).join(",")}]]`;
}

function finiteVec3(vector: Vec3 | undefined): vector is Vec3 {
  return Array.isArray(vector) && vector.length === 3 && vector.every(Number.isFinite);
}

function sanitizeVec3(vector: Vec3 | undefined): Vec3 {
  return finiteVec3(vector) ? vector : [0, 0, 0];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function addScaled(point: Vec3, vector: Vec3, scale: number): Vec3 {
  return [
    point[0] + vector[0] * scale,
    point[1] + vector[1] * scale,
    point[2] + vector[2] * scale
  ];
}

function addVec3(left: Vec3, right: Vec3): Vec3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function scaleVec3(vector: Vec3, scale: number): Vec3 {
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function interpolateVec3(start: Vec3, end: Vec3, progress: number): Vec3 {
  return [
    lerp(start[0], end[0], progress),
    lerp(start[1], end[1], progress),
    lerp(start[2], end[2], progress)
  ];
}

function inRange(value: number, range: Range2 | undefined) {
  if (!range) return true;
  const min = Math.min(range[0], range[1]);
  const max = Math.max(range[0], range[1]);

  return value >= min && value <= max;
}

function withinBounds(point: Vec3, bounds: AxisRangeSpec | undefined) {
  return inRange(point[0], bounds?.x) && inRange(point[1], bounds?.y) && inRange(point[2], bounds?.z);
}

function derivativeAt(system: MathOdeSystem, state: Vec3, time: number): Vec3 | null {
  const derivative = system(state, time);

  return finiteVec3(derivative) ? derivative : null;
}

function eulerStep(system: MathOdeSystem, state: Vec3, time: number, dt: number): { derivative: Vec3; next: Vec3 } | null {
  const derivative = derivativeAt(system, state, time);
  if (!derivative) return null;

  return {
    derivative,
    next: addScaled(state, derivative, dt)
  };
}

function rk4Step(system: MathOdeSystem, state: Vec3, time: number, dt: number): { derivative: Vec3; next: Vec3 } | null {
  const k1 = derivativeAt(system, state, time);
  if (!k1) return null;

  const k2 = derivativeAt(system, addScaled(state, k1, dt / 2), time + dt / 2);
  if (!k2) return null;

  const k3 = derivativeAt(system, addScaled(state, k2, dt / 2), time + dt / 2);
  if (!k3) return null;

  const k4 = derivativeAt(system, addScaled(state, k3, dt), time + dt);
  if (!k4) return null;

  const weightedDerivative = scaleVec3(
    addVec3(addVec3(k1, scaleVec3(k2, 2)), addVec3(scaleVec3(k3, 2), k4)),
    1 / 6
  );

  return {
    derivative: k1,
    next: addScaled(state, weightedDerivative, dt)
  };
}

function sampleEntry(index: number, time: number, point: Vec3, system: MathOdeSystem): MathOdeTrajectorySample {
  return {
    derivative: sanitizeVec3(system(point, time)),
    finite: finiteVec3(point),
    index,
    point: sanitizeVec3(point),
    time
  };
}

export function odeTrajectoryPointAtTime(trajectory: MathOdeTrajectory, time: number): Vec3 {
  const samples = trajectory.samples;
  if (samples.length === 0) return [0, 0, 0];
  if (samples.length === 1) return samples[0].point;

  const first = samples[0];
  const last = samples[samples.length - 1];
  const clampedTime = clamp(finite(time, first.time), Math.min(first.time, last.time), Math.max(first.time, last.time));

  if (clampedTime <= first.time) return first.point;
  if (clampedTime >= last.time) return last.point;

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const next = samples[index];
    if (clampedTime > next.time) continue;

    const span = next.time - previous.time;
    const progress = span === 0 ? 0 : (clampedTime - previous.time) / span;

    return interpolateVec3(previous.point, next.point, progress);
  }

  return last.point;
}

function interpolatedSample(trajectory: MathOdeTrajectory, time: number, index: number): MathOdeTrajectorySample {
  const point = odeTrajectoryPointAtTime(trajectory, time);

  return {
    derivative: [0, 0, 0],
    finite: finiteVec3(point),
    index,
    point,
    time
  };
}

export function odeTrajectoryTail(
  trajectory: MathOdeTrajectory,
  time: number,
  durationSeconds: number
): MathOdeTrajectorySample[] {
  const samples = trajectory.samples;
  if (samples.length === 0) return [];

  const firstTime = samples[0].time;
  const lastTime = samples[samples.length - 1].time;
  const endTime = clamp(finite(time, lastTime), Math.min(firstTime, lastTime), Math.max(firstTime, lastTime));
  const duration = Math.max(0, finite(durationSeconds, 0));
  const startTime = clamp(endTime - duration, Math.min(firstTime, lastTime), Math.max(firstTime, lastTime));
  const epsilon = 1e-9;
  const interior = samples.filter((sample) => sample.time > startTime + epsilon && sample.time < endTime - epsilon);
  const tail = [interpolatedSample(trajectory, startTime, 0), ...interior];

  if (Math.abs(endTime - startTime) > epsilon) {
    tail.push(interpolatedSample(trajectory, endTime, tail.length));
  }

  return tail.map((sample, index) => ({ ...sample, index }));
}

export function buildOdeTrajectory({
  bounds,
  conceptId,
  id,
  method = "rk4",
  sourceSystemSummary = "function",
  start,
  stepCount,
  system,
  tailDurationSeconds = 0,
  tRange
}: BuildOdeTrajectoryInput): MathOdeTrajectory {
  const safeMethod: MathOdeMethod = method === "euler" ? "euler" : "rk4";
  const safeStepCount = Math.max(0, Math.floor(finite(stepCount, 0)));
  const startTime = finite(tRange[0], 0);
  const endTime = finite(tRange[1], startTime);
  const dt = safeStepCount > 0 ? (endTime - startTime) / safeStepCount : 0;
  const samples: MathOdeTrajectorySample[] = [];
  const initialState = sanitizeVec3(start);
  let current = initialState;
  let currentTime = startTime;
  let stoppedReason: MathOdeStoppedReason = withinBounds(current, bounds) ? "completed" : "out-of-bounds";

  samples.push(sampleEntry(0, currentTime, current, system));

  if (stoppedReason === "completed") {
    for (let index = 0; index < safeStepCount; index += 1) {
      const result = safeMethod === "euler"
        ? eulerStep(system, current, currentTime, dt)
        : rk4Step(system, current, currentTime, dt);

      if (!result || !finiteVec3(result.next)) {
        stoppedReason = "non-finite-derivative";
        break;
      }

      const nextTime = startTime + dt * (index + 1);
      if (!withinBounds(result.next, bounds)) {
        stoppedReason = "out-of-bounds";
        break;
      }

      current = result.next;
      currentTime = nextTime;
      samples.push(sampleEntry(samples.length, currentTime, current, system));
    }
  }

  const baseTrajectory: MathOdeTrajectory = {
    bounds,
    conceptId,
    finiteSampleCount: samples.filter((sample) => sample.finite).length,
    id,
    initialState,
    method: safeMethod,
    sampleCount: samples.length,
    samples,
    sourceStepCount: safeStepCount,
    sourceSystemSummary,
    stepSize: dt,
    stoppedReason,
    tailSamples: [],
    tRange: [startTime, endTime]
  };
  const tailSamples = tailDurationSeconds > 0
    ? odeTrajectoryTail(baseTrajectory, samples.at(-1)?.time ?? endTime, tailDurationSeconds)
    : [];

  return {
    ...baseTrajectory,
    tailSamples
  };
}

export function resolveOdeSystem(system: MathSceneOdeSystemSpec): MathOdeSystem {
  if (system.type === "constantVelocity") {
    const velocity = sanitizeVec3(system.velocity);

    return () => velocity;
  }

  if (system.type === "linear2d") {
    const matrix = system.matrix.map((row) => row.map((value) => finite(value, 0))) as [[number, number], [number, number]];

    return ([x, y]) => [
      matrix[0][0] * x + matrix[0][1] * y,
      matrix[1][0] * x + matrix[1][1] * y,
      0
    ];
  }

  return ([x, y, z]) => {
    const sigma = finite(system.sigma, 10);
    const rho = finite(system.rho, 28);
    const beta = finite(system.beta, 8 / 3);

    return [
      sigma * (y - x),
      x * (rho - z) - y,
      x * y - beta * z
    ];
  };
}

function buildSceneOdeTrajectory(spec: MathSceneOdeTrajectorySpec): MathOdeTrajectory {
  return buildOdeTrajectory({
    bounds: spec.bounds,
    conceptId: spec.conceptId,
    id: spec.id,
    method: spec.method,
    sourceSystemSummary: formatSceneOdeSystem(spec.system),
    start: spec.start,
    stepCount: spec.stepCount,
    system: resolveOdeSystem(spec.system),
    tailDurationSeconds: spec.tailDurationSeconds,
    tRange: spec.tRange
  });
}

export function buildSceneOdeTrajectories(scene: MathSceneSpec): MathOdeTrajectory[] {
  return (scene.odeTrajectories ?? []).map(buildSceneOdeTrajectory);
}

export function summarizeOdeTrajectories(trajectories: MathOdeTrajectory[]): OdeTrajectorySummary {
  const sortedTrajectories = [...trajectories].sort((left, right) => left.id.localeCompare(right.id));
  const trajectoryIds = uniqueSorted(trajectories.map((trajectory) => trajectory.id)).join(",") || "none";
  const sampleCount = trajectories.reduce((sum, trajectory) => sum + trajectory.sampleCount, 0);
  const finiteSampleCount = trajectories.reduce((sum, trajectory) => sum + trajectory.finiteSampleCount, 0);
  const stoppedCount = trajectories.filter((trajectory) => trajectory.stoppedReason !== "completed").length;
  const tailSampleCount = trajectories.reduce((sum, trajectory) => sum + trajectory.tailSamples.length, 0);
  const methodIds = uniqueSorted(trajectories.map((trajectory) => trajectory.method)).join(",") || "none";
  const initialStateSummary = sortedTrajectories
    .map((trajectory) => `${trajectory.id}=${formatVec3(trajectory.initialState)}`)
    .join(";") || "none";
  const stepCountSummary = sortedTrajectories
    .map((trajectory) => `${trajectory.id}=${trajectory.sourceStepCount}`)
    .join(";") || "none";
  const boundsSummary = sortedTrajectories
    .map((trajectory) => `${trajectory.id}=${formatBoundsRange(trajectory.bounds)}`)
    .join(";") || "none";
  const systemSummary = sortedTrajectories
    .map((trajectory) => `${trajectory.id}:${trajectory.sourceSystemSummary}`)
    .join(";") || "none";
  const stepSizeSummary = sortedTrajectories
    .map((trajectory) => `${trajectory.id}=${formatFixed(trajectory.stepSize)}`)
    .join(";") || "none";
  const timeRangeSummary = sortedTrajectories
    .map((trajectory) => `${trajectory.id}=${formatFixed(trajectory.tRange[0])}..${formatFixed(trajectory.tRange[1])}`)
    .join(";") || "none";
  const stoppedReasonSummary = [
    `completed=${trajectories.filter((trajectory) => trajectory.stoppedReason === "completed").length}`,
    `non-finite-derivative=${trajectories.filter((trajectory) => trajectory.stoppedReason === "non-finite-derivative").length}`,
    `out-of-bounds=${trajectories.filter((trajectory) => trajectory.stoppedReason === "out-of-bounds").length}`
  ].join(";");

  return {
    boundsSummary,
    finiteSampleCount,
    initialStateSummary,
    methodIds,
    sampleCount,
    sourceContract: ODE_TRAJECTORY_SOURCE_CONTRACT,
    solverContract: ODE_TRAJECTORY_SOLVER_CONTRACT,
    stepCountSummary,
    stepSizeSummary,
    stoppedCount,
    stoppedReasonSummary,
    summary: `odeTrajectories=${trajectories.length};samples=${sampleCount};finite=${finiteSampleCount};stopped=${stoppedCount};tails=${tailSampleCount};ids=${trajectoryIds}`,
    systemSummary,
    tailSampleCount,
    timeRangeSummary,
    trajectoryCount: trajectories.length,
    trajectoryIds
  };
}

export function buildOdeTrajectoryEvidenceForScene(scene: MathSceneSpec) {
  return summarizeOdeTrajectories(buildSceneOdeTrajectories(scene));
}

export function serializeOdeTrajectoryPayload(trajectories: MathOdeTrajectory[]) {
  const evidence = summarizeOdeTrajectories(trajectories);

  return stableSerialize({
    ...evidence,
    trajectories,
    version: "mais-manim-ode-trajectory/v1"
  } satisfies OdeTrajectoryPayload);
}

export function odeTrajectoryDataAttributes(summary: OdeTrajectorySummary) {
  return {
    "data-viz-manim-ode-finite-sample-count": String(summary.finiteSampleCount),
    "data-viz-manim-ode-bounds-summary": summary.boundsSummary,
    "data-viz-manim-ode-initial-state-summary": summary.initialStateSummary,
    "data-viz-manim-ode-method-ids": summary.methodIds,
    "data-viz-manim-ode-sample-count": String(summary.sampleCount),
    "data-viz-manim-ode-source-contract": summary.sourceContract,
    "data-viz-manim-ode-solver-contract": summary.solverContract,
    "data-viz-manim-ode-step-count-summary": summary.stepCountSummary,
    "data-viz-manim-ode-step-size-summary": summary.stepSizeSummary,
    "data-viz-manim-ode-stopped-count": String(summary.stoppedCount),
    "data-viz-manim-ode-stopped-reason-summary": summary.stoppedReasonSummary,
    "data-viz-manim-ode-summary": summary.summary,
    "data-viz-manim-ode-system-summary": summary.systemSummary,
    "data-viz-manim-ode-tail-sample-count": String(summary.tailSampleCount),
    "data-viz-manim-ode-time-range-summary": summary.timeRangeSummary,
    "data-viz-manim-ode-trajectory-count": String(summary.trajectoryCount)
  } as const;
}
