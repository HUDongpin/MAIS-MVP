import {
  buildCreationPrimitiveFrame,
  type SceneCreationPrimitive,
  type SceneCreationPrimitivePlan
} from "./mathCreationPrimitives";
import { summarizeVMobjectStyle } from "./mathVMobjectStyle";

export type FadeGrowEvidenceKind = "fadeIn" | "fadeOut" | "growFromCenter";

export const FADE_GROW_SOURCE_CONTRACT =
  "FadeIn/FadeOut animate opacity while GrowFromCenter scales from center" as const;
export const FADE_GROW_PHASE_POLICY = "fade-opacity-grow-center-scale" as const;

export type FadeGrowEvidenceFrame = {
  kind: FadeGrowEvidenceKind;
  objectId: string;
  opacity: number;
  phase: "fade" | "grow";
  phasePolicy: typeof FADE_GROW_PHASE_POLICY;
  progress: number;
  scale: number;
  sourceContract: typeof FADE_GROW_SOURCE_CONTRACT;
  styleSummary: string;
  timelineStepIndex: number;
};

export type FadeGrowEvidence = {
  fadeFrameCount: number;
  frameCount: number;
  frames: FadeGrowEvidenceFrame[];
  growFrameCount: number;
  kindSequence: string;
  objectIds: string;
  opacitySchedule: string;
  phasePolicy: typeof FADE_GROW_PHASE_POLICY;
  phaseSequence: string;
  primitiveCount: number;
  scaleSchedule: string;
  sourceContract: typeof FADE_GROW_SOURCE_CONTRACT;
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

function pipeList(values: string[]) {
  return values.length > 0 ? values.join("|") : "none";
}

function commaList(values: string[]) {
  return values.length > 0 ? values.join(",") : "none";
}

function isFadeGrowPrimitive(primitive: SceneCreationPrimitive): primitive is SceneCreationPrimitive & { kind: FadeGrowEvidenceKind } {
  return primitive.kind === "fadeIn" || primitive.kind === "fadeOut" || primitive.kind === "growFromCenter";
}

function frameFromPrimitive(primitive: SceneCreationPrimitive & { kind: FadeGrowEvidenceKind }, progress: number): FadeGrowEvidenceFrame {
  const frame = buildCreationPrimitiveFrame({
    kind: primitive.kind,
    objectId: primitive.objectId,
    progress,
    style: primitive.style
  });

  return {
    kind: primitive.kind,
    objectId: primitive.objectId,
    opacity: stableNumber(frame.opacity),
    phase: frame.phase === "grow" ? "grow" : "fade",
    phasePolicy: FADE_GROW_PHASE_POLICY,
    progress: stableNumber(frame.progress),
    scale: stableNumber(frame.scale),
    sourceContract: FADE_GROW_SOURCE_CONTRACT,
    styleSummary: summarizeVMobjectStyle(frame.style),
    timelineStepIndex: primitive.timelineStepIndex
  };
}

function summarizeFrames(input: {
  frames: FadeGrowEvidenceFrame[];
  primitiveCount: number;
}) {
  const objectIds = commaList(Array.from(new Set(input.frames.map((frame) => frame.objectId))));
  const kindSequence = pipeList(
    input.frames.map((frame) => `${frame.objectId}@${formatProgress(frame.progress)}:${frame.kind}`)
  );
  const phaseSequence = pipeList(
    input.frames.map((frame) => `${frame.objectId}@${formatProgress(frame.progress)}:${frame.phase}`)
  );
  const opacitySchedule = pipeList(
    input.frames.map((frame) => `${frame.objectId}@${formatProgress(frame.progress)}=${frame.opacity.toFixed(3)}`)
  );
  const scaleSchedule = pipeList(
    input.frames.map((frame) => `${frame.objectId}@${formatProgress(frame.progress)}=${frame.scale.toFixed(3)}`)
  );
  const fadeFrameCount = input.frames.filter((frame) => frame.phase === "fade").length;
  const growFrameCount = input.frames.filter((frame) => frame.phase === "grow").length;

  return {
    fadeFrameCount,
    frameCount: input.frames.length,
    growFrameCount,
    kindSequence,
    objectIds,
    opacitySchedule,
    phasePolicy: FADE_GROW_PHASE_POLICY,
    phaseSequence,
    primitiveCount: input.primitiveCount,
    scaleSchedule,
    sourceContract: FADE_GROW_SOURCE_CONTRACT
  };
}

export function summarizeFadeGrowEvidence(evidence: Omit<FadeGrowEvidence, "summary">) {
  return [
    `fadeGrow:primitives=${evidence.primitiveCount}`,
    `frames=${evidence.frameCount}`,
    `fade=${evidence.fadeFrameCount}`,
    `grow=${evidence.growFrameCount}`,
    `objects=${evidence.objectIds}`,
    `kinds=${evidence.kindSequence}`
  ].join(":");
}

// Manim source contract: FadeIn and FadeOut change opacity over the animation
// alpha while preserving geometry, and GrowFromCenter scales a mobject out from
// its center while increasing opacity. MAIS records those FadeIn, FadeOut, and
// GrowFromCenter schedules without touching Three.js renderer objects.
export function buildFadeGrowEvidence(
  plan: SceneCreationPrimitivePlan,
  progressSamples?: number[]
): FadeGrowEvidence {
  const fadeGrowPrimitives = plan.primitives.filter(isFadeGrowPrimitive);
  const samples = stableSamples(progressSamples);
  const frames = fadeGrowPrimitives.flatMap((primitive) =>
    samples.map((sample) => frameFromPrimitive(primitive, sample))
  );
  const summaryFields = summarizeFrames({
    frames,
    primitiveCount: fadeGrowPrimitives.length
  });
  const evidenceWithoutSummary = {
    ...summaryFields,
    frames
  };

  return {
    ...evidenceWithoutSummary,
    summary: summarizeFadeGrowEvidence(evidenceWithoutSummary)
  };
}

export function fadeGrowEvidenceDataAttributes(evidence: FadeGrowEvidence): Record<string, string> {
  return {
    "data-viz-manim-fade-grow-fade-frame-count": String(evidence.fadeFrameCount),
    "data-viz-manim-fade-grow-frame-count": String(evidence.frameCount),
    "data-viz-manim-fade-grow-grow-frame-count": String(evidence.growFrameCount),
    "data-viz-manim-fade-grow-kind-sequence": evidence.kindSequence,
    "data-viz-manim-fade-grow-object-ids": evidence.objectIds,
    "data-viz-manim-fade-grow-opacity-schedule": evidence.opacitySchedule,
    "data-viz-manim-fade-grow-phase-policy": evidence.phasePolicy,
    "data-viz-manim-fade-grow-phase-sequence": evidence.phaseSequence,
    "data-viz-manim-fade-grow-primitive-count": String(evidence.primitiveCount),
    "data-viz-manim-fade-grow-scale-schedule": evidence.scaleSchedule,
    "data-viz-manim-fade-grow-source-contract": evidence.sourceContract,
    "data-viz-manim-fade-grow-summary": evidence.summary
  };
}

export function serializeFadeGrowEvidence(evidence: FadeGrowEvidence) {
  return stableSerialize(evidence);
}
