import {
  buildCreationPrimitiveFrame,
  type SceneCreationPrimitive,
  type SceneCreationPrimitivePlan
} from "./mathCreationPrimitives";
import { summarizeVMobjectStyle } from "./mathVMobjectStyle";

export const DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT =
  "DrawBorderThenFill traces outline first, then interpolates fill/style" as const;
export const DRAW_BORDER_THEN_FILL_PHASE_POLICY = "border-then-fill" as const;

export type DrawBorderThenFillEvidenceFrame = {
  drawRange: [number, number];
  fillOpacity: number;
  objectId: string;
  phase: "draw-border" | "fill";
  phasePolicy: typeof DRAW_BORDER_THEN_FILL_PHASE_POLICY;
  progress: number;
  sourceContract: typeof DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT;
  strokeOpacity: number;
  styleSummary: string;
  timelineStepIndex: number;
};

export type DrawBorderThenFillEvidence = {
  borderFrameCount: number;
  drawRangeSummary: string;
  fillFrameCount: number;
  fillOpacitySchedule: string;
  frameCount: number;
  frames: DrawBorderThenFillEvidenceFrame[];
  objectIds: string;
  phaseSequence: string;
  phasePolicy: typeof DRAW_BORDER_THEN_FILL_PHASE_POLICY;
  primitiveCount: number;
  sourceContract: typeof DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT;
  strokeOpacitySchedule: string;
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

function frameFromPrimitive(primitive: SceneCreationPrimitive, progress: number): DrawBorderThenFillEvidenceFrame {
  const frame = buildCreationPrimitiveFrame({
    kind: "drawBorderThenFill",
    objectId: primitive.objectId,
    progress,
    style: primitive.style
  });

  return {
    drawRange: [stableNumber(frame.drawRange[0]), stableNumber(frame.drawRange[1])],
    fillOpacity: stableNumber(frame.style.fillOpacity),
    objectId: primitive.objectId,
    phase: frame.phase === "fill" ? "fill" : "draw-border",
    phasePolicy: DRAW_BORDER_THEN_FILL_PHASE_POLICY,
    progress: stableNumber(frame.progress),
    sourceContract: DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT,
    strokeOpacity: stableNumber(frame.style.strokeOpacity),
    styleSummary: summarizeVMobjectStyle(frame.style),
    timelineStepIndex: primitive.timelineStepIndex
  };
}

function summarizeFrames(input: {
  frames: DrawBorderThenFillEvidenceFrame[];
  primitiveCount: number;
}) {
  const objectIds = commaList(Array.from(new Set(input.frames.map((frame) => frame.objectId))));
  const phaseSequence = pipeList(
    input.frames.map((frame) => `${frame.objectId}@${formatProgress(frame.progress)}:${frame.phase}`)
  );
  const drawRangeSummary = pipeList(
    input.frames.map((frame) => `${frame.objectId}@${formatProgress(frame.progress)}=${formatRange(frame.drawRange)}`)
  );
  const fillOpacitySchedule = pipeList(
    input.frames.map((frame) => `${frame.objectId}@${formatProgress(frame.progress)}=${frame.fillOpacity.toFixed(3)}`)
  );
  const strokeOpacitySchedule = pipeList(
    input.frames.map((frame) => `${frame.objectId}@${formatProgress(frame.progress)}=${frame.strokeOpacity.toFixed(3)}`)
  );
  const borderFrameCount = input.frames.filter((frame) => frame.phase === "draw-border").length;
  const fillFrameCount = input.frames.filter((frame) => frame.phase === "fill").length;

  return {
    borderFrameCount,
    drawRangeSummary,
    fillFrameCount,
    fillOpacitySchedule,
    frameCount: input.frames.length,
    objectIds,
    phaseSequence,
    phasePolicy: DRAW_BORDER_THEN_FILL_PHASE_POLICY,
    primitiveCount: input.primitiveCount,
    sourceContract: DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT,
    strokeOpacitySchedule
  };
}

export function summarizeDrawBorderThenFillEvidence(evidence: Omit<DrawBorderThenFillEvidence, "summary">) {
  return [
    `drawBorderThenFill:primitives=${evidence.primitiveCount}`,
    `frames=${evidence.frameCount}`,
    `border=${evidence.borderFrameCount}`,
    `fill=${evidence.fillFrameCount}`,
    `objects=${evidence.objectIds}`,
    `phases=${evidence.phaseSequence}`
  ].join(":");
}

// Manim source contract: DrawBorderThenFill first displays a VMobject as a
// partial stroke with fill opacity forced to zero, then switches to a full
// outline while interpolating the fill style toward its authored opacity.
export function buildDrawBorderThenFillEvidence(
  plan: SceneCreationPrimitivePlan,
  progressSamples?: number[]
): DrawBorderThenFillEvidence {
  const drawBorderThenFillPrimitives = plan.primitives.filter((primitive) => primitive.kind === "drawBorderThenFill");
  const samples = stableSamples(progressSamples);
  const frames = drawBorderThenFillPrimitives.flatMap((primitive) =>
    samples.map((sample) => frameFromPrimitive(primitive, sample))
  );
  const summaryFields = summarizeFrames({
    frames,
    primitiveCount: drawBorderThenFillPrimitives.length
  });
  const evidenceWithoutSummary = {
    ...summaryFields,
    frames
  };

  return {
    ...evidenceWithoutSummary,
    summary: summarizeDrawBorderThenFillEvidence(evidenceWithoutSummary)
  };
}

export function drawBorderThenFillEvidenceDataAttributes(evidence: DrawBorderThenFillEvidence): Record<string, string> {
  return {
    "data-viz-manim-draw-border-fill-border-frame-count": String(evidence.borderFrameCount),
    "data-viz-manim-draw-border-fill-draw-ranges": evidence.drawRangeSummary,
    "data-viz-manim-draw-border-fill-fill-frame-count": String(evidence.fillFrameCount),
    "data-viz-manim-draw-border-fill-fill-opacity-schedule": evidence.fillOpacitySchedule,
    "data-viz-manim-draw-border-fill-frame-count": String(evidence.frameCount),
    "data-viz-manim-draw-border-fill-object-ids": evidence.objectIds,
    "data-viz-manim-draw-border-fill-phase-policy": evidence.phasePolicy,
    "data-viz-manim-draw-border-fill-phase-sequence": evidence.phaseSequence,
    "data-viz-manim-draw-border-fill-primitive-count": String(evidence.primitiveCount),
    "data-viz-manim-draw-border-fill-source-contract": evidence.sourceContract,
    "data-viz-manim-draw-border-fill-stroke-opacity-schedule": evidence.strokeOpacitySchedule,
    "data-viz-manim-draw-border-fill-summary": evidence.summary
  };
}

export function serializeDrawBorderThenFillEvidence(evidence: DrawBorderThenFillEvidence) {
  return stableSerialize(evidence);
}
