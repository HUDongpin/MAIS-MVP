import {
  buildCreationPrimitiveFrame,
  type SceneCreationPrimitive,
  type SceneCreationPrimitivePlan
} from "./mathCreationPrimitives";
import { summarizeVMobjectStyle } from "./mathVMobjectStyle";

export const SHOW_CREATION_SOURCE_CONTRACT =
  "ShowCreation uses pointwise_become_partial(vmobject, 0, alpha) to reveal a VMobject stroke" as const;
export const SHOW_CREATION_PARTIAL_POLICY = "partial-stroke-reveal-from-zero-to-alpha" as const;

export type ShowCreationEvidenceFrame = {
  drawRange: [number, number];
  objectId: string;
  opacity: number;
  partialPolicy: typeof SHOW_CREATION_PARTIAL_POLICY;
  phase: "stroke";
  progress: number;
  sourceContract: typeof SHOW_CREATION_SOURCE_CONTRACT;
  styleSummary: string;
  timelineStepIndex: number;
};

export type ShowCreationEvidence = {
  drawRangeSummary: string;
  frameCount: number;
  frames: ShowCreationEvidenceFrame[];
  objectIds: string;
  opacitySchedule: string;
  partialPolicy: typeof SHOW_CREATION_PARTIAL_POLICY;
  phaseSequence: string;
  primitiveCount: number;
  progressRange: string;
  sourceContract: typeof SHOW_CREATION_SOURCE_CONTRACT;
  summary: string;
};

function finite(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, finite(value, 0)));
}

function stableNumber(value: number) {
  return Number(finite(value, 0).toFixed(6));
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

function stableSamples(progressSamples: number[] | undefined) {
  const samples = (progressSamples?.length ? progressSamples : [0.25, 0.75]).map(clamp01);
  return Array.from(new Set(samples.map((sample) => sample.toFixed(6)))).map(Number).sort((left, right) => left - right);
}

function formatProgress(progress: number) {
  return progress.toFixed(3);
}

function formatRange([start, end]: [number, number]) {
  return `${start.toFixed(3)}..${end.toFixed(3)}`;
}

function pipeList(values: string[]) {
  return values.length > 0 ? values.join("|") : "none";
}

function commaList(values: string[]) {
  return values.length > 0 ? values.join(",") : "none";
}

function isShowCreationPrimitive(primitive: SceneCreationPrimitive) {
  return primitive.kind === "showCreation";
}

function frameFromPrimitive(primitive: SceneCreationPrimitive, progress: number): ShowCreationEvidenceFrame {
  const frame = buildCreationPrimitiveFrame({
    kind: "showCreation",
    objectId: primitive.objectId,
    progress,
    style: primitive.style
  });

  return {
    drawRange: [stableNumber(frame.drawRange[0]), stableNumber(frame.drawRange[1])],
    objectId: primitive.objectId,
    opacity: stableNumber(frame.opacity),
    partialPolicy: SHOW_CREATION_PARTIAL_POLICY,
    phase: "stroke",
    progress: stableNumber(frame.progress),
    sourceContract: SHOW_CREATION_SOURCE_CONTRACT,
    styleSummary: summarizeVMobjectStyle(frame.style),
    timelineStepIndex: primitive.timelineStepIndex
  };
}

function summarizeFrames(input: {
  frames: ShowCreationEvidenceFrame[];
  primitiveCount: number;
}) {
  const objectIds = commaList(Array.from(new Set(input.frames.map((frame) => frame.objectId))));
  const phaseSequence = pipeList(
    input.frames.map((frame) => `${frame.objectId}@${formatProgress(frame.progress)}:${frame.phase}`)
  );
  const drawRangeSummary = pipeList(
    input.frames.map((frame) => `${frame.objectId}@${formatProgress(frame.progress)}=${formatRange(frame.drawRange)}`)
  );
  const opacitySchedule = pipeList(
    input.frames.map((frame) => `${frame.objectId}@${formatProgress(frame.progress)}=${frame.opacity.toFixed(3)}`)
  );
  const progresses = input.frames.map((frame) => frame.progress);
  const progressRange = progresses.length
    ? `${formatProgress(Math.min(...progresses))}..${formatProgress(Math.max(...progresses))}`
    : "none";

  return {
    drawRangeSummary,
    frameCount: input.frames.length,
    objectIds,
    opacitySchedule,
    partialPolicy: SHOW_CREATION_PARTIAL_POLICY,
    phaseSequence,
    primitiveCount: input.primitiveCount,
    progressRange,
    sourceContract: SHOW_CREATION_SOURCE_CONTRACT
  };
}

export function summarizeShowCreationEvidence(evidence: Omit<ShowCreationEvidence, "summary">) {
  return [
    `showCreation:primitives=${evidence.primitiveCount}`,
    `frames=${evidence.frameCount}`,
    `progress=${evidence.progressRange}`,
    `objects=${evidence.objectIds}`,
    `ranges=${evidence.drawRangeSummary}`
  ].join(":");
}

// Manim source contract: ShowCreation reveals a VMobject by showing the partial
// path [0, alpha]. MAIS records this partial-stroke schedule as pure evidence so
// browser QA can verify curve creation semantics without mutating WebGL objects.
export function buildShowCreationEvidence(
  plan: SceneCreationPrimitivePlan,
  progressSamples?: number[]
): ShowCreationEvidence {
  const showCreationPrimitives = plan.primitives.filter(isShowCreationPrimitive);
  const samples = stableSamples(progressSamples);
  const frames = showCreationPrimitives.flatMap((primitive) =>
    samples.map((sample) => frameFromPrimitive(primitive, sample))
  );
  const evidenceWithoutSummary = {
    ...summarizeFrames({
      frames,
      primitiveCount: showCreationPrimitives.length
    }),
    frames
  };

  return {
    ...evidenceWithoutSummary,
    summary: summarizeShowCreationEvidence(evidenceWithoutSummary)
  };
}

export function showCreationEvidenceDataAttributes(evidence: ShowCreationEvidence): Record<string, string> {
  return {
    "data-viz-manim-show-creation-draw-ranges": evidence.drawRangeSummary,
    "data-viz-manim-show-creation-frame-count": String(evidence.frameCount),
    "data-viz-manim-show-creation-object-ids": evidence.objectIds,
    "data-viz-manim-show-creation-opacity-schedule": evidence.opacitySchedule,
    "data-viz-manim-show-creation-partial-policy": evidence.partialPolicy,
    "data-viz-manim-show-creation-phase-sequence": evidence.phaseSequence,
    "data-viz-manim-show-creation-primitive-count": String(evidence.primitiveCount),
    "data-viz-manim-show-creation-progress-range": evidence.progressRange,
    "data-viz-manim-show-creation-source-contract": evidence.sourceContract,
    "data-viz-manim-show-creation-summary": evidence.summary
  };
}

export function serializeShowCreationEvidence(evidence: ShowCreationEvidence) {
  return stableSerialize(evidence);
}
