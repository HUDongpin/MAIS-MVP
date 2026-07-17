import type { AnimationStep, MathObjectSpec, MathSceneSpec } from "./mathSceneTypes";
import { buildDrawBorderThenFillFrame, buildVMobjectStyle, type VMobjectStyle, type VMobjectStyleInput } from "./mathVMobjectStyle";

export type CreationPrimitiveKind = "showCreation" | "drawBorderThenFill" | "fadeIn" | "fadeOut" | "growFromCenter";

export type CreationPrimitiveFramePhase = "stroke" | "draw-border" | "fill" | "fade" | "grow";

export type CreationPrimitiveFrame = {
  drawRange: [number, number];
  kind: CreationPrimitiveKind;
  objectId: string;
  opacity: number;
  phase: CreationPrimitiveFramePhase;
  progress: number;
  scale: number;
  style: VMobjectStyle;
};

export type SceneCreationPrimitive = {
  colorRole: string;
  conceptId: string;
  duration: number;
  kind: CreationPrimitiveKind;
  objectId: string;
  style: VMobjectStyle;
  timelineStepIndex: number;
};

export type SceneCreationPrimitivePlan = {
  primitives: SceneCreationPrimitive[];
  sceneId: string;
};

export type SceneCreationPrimitiveSummary = {
  drawBorderThenFillCount: number;
  fadeCount: number;
  growFromCenterCount: number;
  primitiveCount: number;
  sceneId: string;
  showCreationCount: number;
  summary: string;
};

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, finite(value, 0)));
}

function styleForObject(object: MathObjectSpec): VMobjectStyle {
  const style = "style" in object ? object.style : undefined;
  const colorRole = "colorRole" in object ? object.colorRole : "reference";
  const input: VMobjectStyleInput = {
    strokeRole: colorRole,
    ...style
  };

  return buildVMobjectStyle(input);
}

function conceptIdForObject(object: MathObjectSpec) {
  return "conceptId" in object ? object.conceptId ?? object.id : object.id;
}

function colorRoleForObject(object: MathObjectSpec) {
  return "colorRole" in object ? object.colorRole : "reference";
}

function objectForStep(scene: MathSceneSpec, step: AnimationStep) {
  if (
    step.type !== "revealCurve" &&
    step.type !== "revealSurface" &&
    step.type !== "fadeInObject" &&
    step.type !== "fadeOutObject" &&
    step.type !== "growFromCenter"
  ) {
    return undefined;
  }
  return scene.objects.find((object) => object.id === step.objectId);
}

function creationKindForStep(step: AnimationStep, object: MathObjectSpec, style: VMobjectStyle): CreationPrimitiveKind {
  if (step.type === "fadeInObject") return "fadeIn";
  if (step.type === "fadeOutObject") return "fadeOut";
  if (step.type === "growFromCenter") return "growFromCenter";
  if (step.type === "revealSurface" && style.fillOpacity > 0) return "drawBorderThenFill";
  return "showCreation";
}

export function buildCreationPrimitiveFrame({
  kind,
  objectId,
  progress,
  style
}: {
  kind: CreationPrimitiveKind;
  objectId: string;
  progress: number;
  style: VMobjectStyle;
}): CreationPrimitiveFrame {
  const alpha = clamp01(progress);

  if (kind === "drawBorderThenFill") {
    const frame = buildDrawBorderThenFillFrame(style, alpha);

    return {
      drawRange: frame.drawRange,
      kind,
      objectId,
      opacity: 1,
      phase: frame.phase,
      progress: alpha,
      scale: 1,
      style: frame.style
    };
  }

  if (kind === "fadeIn" || kind === "fadeOut") {
    return {
      drawRange: [0, 1],
      kind,
      objectId,
      opacity: kind === "fadeIn" ? alpha : 1 - alpha,
      phase: "fade",
      progress: alpha,
      scale: 1,
      style
    };
  }

  if (kind === "growFromCenter") {
    return {
      drawRange: [0, 1],
      kind,
      objectId,
      opacity: alpha,
      phase: "grow",
      progress: alpha,
      scale: alpha,
      style
    };
  }

  return {
    drawRange: [0, alpha],
    kind,
    objectId,
    opacity: 1,
    phase: "stroke",
    progress: alpha,
    scale: 1,
    style: {
      ...style,
      fillOpacity: 0
    }
  };
}

export function summarizeCreationPrimitiveFrame(frame: CreationPrimitiveFrame) {
  return [
    `${frame.kind}:${frame.objectId}:phase=${frame.phase}`,
    `draw=${frame.drawRange[1].toFixed(3)}`,
    `opacity=${frame.opacity.toFixed(3)}`,
    `scale=${frame.scale.toFixed(3)}`
  ].join(":");
}

export function buildSceneCreationPrimitivePlan(scene: MathSceneSpec): SceneCreationPrimitivePlan {
  const primitives = scene.timeline.flatMap((step, timelineStepIndex) => {
    const object = objectForStep(scene, step);
    if (!object) return [];

    const style = styleForObject(object);

    return [{
      colorRole: colorRoleForObject(object),
      conceptId: conceptIdForObject(object),
      duration: Math.max(0, finite(step.duration, 0)),
      kind: creationKindForStep(step, object, style),
      objectId: object.id,
      style,
      timelineStepIndex
    }];
  });

  return {
    primitives,
    sceneId: scene.sceneId
  };
}

function summaryText(summary: Omit<SceneCreationPrimitiveSummary, "summary">) {
  return [
    `creation:${summary.sceneId}`,
    `primitives=${summary.primitiveCount}`,
    `show=${summary.showCreationCount}`,
    `borderFill=${summary.drawBorderThenFillCount}`,
    `fade=${summary.fadeCount}`,
    `grow=${summary.growFromCenterCount}`
  ].join(":");
}

export function summarizeSceneCreationPrimitivePlan(plan: SceneCreationPrimitivePlan): SceneCreationPrimitiveSummary {
  const primitiveCount = plan.primitives.length;
  const showCreationCount = plan.primitives.filter((primitive) => primitive.kind === "showCreation").length;
  const drawBorderThenFillCount = plan.primitives.filter((primitive) => primitive.kind === "drawBorderThenFill").length;
  const fadeCount = plan.primitives.filter((primitive) => primitive.kind === "fadeIn" || primitive.kind === "fadeOut").length;
  const growFromCenterCount = plan.primitives.filter((primitive) => primitive.kind === "growFromCenter").length;
  const baseSummary = {
    drawBorderThenFillCount,
    fadeCount,
    growFromCenterCount,
    primitiveCount,
    sceneId: plan.sceneId,
    showCreationCount
  };

  return {
    ...baseSummary,
    summary: summaryText(baseSummary)
  };
}

export function creationPrimitivePlanDataAttributes(summary: SceneCreationPrimitiveSummary) {
  return {
    "data-viz-manim-creation-draw-border-count": String(summary.drawBorderThenFillCount),
    "data-viz-manim-creation-fade-count": String(summary.fadeCount),
    "data-viz-manim-creation-grow-count": String(summary.growFromCenterCount),
    "data-viz-manim-creation-primitive-count": String(summary.primitiveCount),
    "data-viz-manim-creation-show-count": String(summary.showCreationCount),
    "data-viz-manim-creation-summary": summary.summary
  } as const;
}
