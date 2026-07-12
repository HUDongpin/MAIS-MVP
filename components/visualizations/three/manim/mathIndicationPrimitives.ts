import type { RuntimeMathObjectNode } from "./mathSceneRuntimeState";
import type { AnimationStep, MathObjectSpec, Vec3 } from "./mathSceneTypes";

export const INDICATION_PRIMITIVE_SOURCE_CONTRACT =
  "Indication animations add transient attention geometry without changing target math objects" as const;
export const INDICATION_PRIMITIVE_STATE_POLICY = "attention-overlays-preserve-target-state" as const;

export type IndicationTarget = {
  center: Vec3;
  colorRole?: string;
  conceptId: string;
  id: string;
  max: Vec3;
  min: Vec3;
};

export type IndicationRay = {
  from: Vec3;
  to: Vec3;
};

export type FlashFrame = {
  center: Vec3;
  opacity: number;
  rays: IndicationRay[];
  targetId: string;
  type: "flash";
};

export type CircumscribeFrame = {
  drawRange: [number, number];
  opacity: number;
  outline: Vec3[];
  targetId: string;
  type: "circumscribe";
};

export type HighlightPulseFrame = {
  center: Vec3;
  opacity: number;
  scale: number;
  targetId: string;
  type: "pulse";
};

export type IndicationFrame = CircumscribeFrame | FlashFrame | HighlightPulseFrame;

export type SceneIndicationPrimitiveKind = "pulse" | "circumscribe" | "flash";

export type SceneIndicationPrimitive = {
  colorRoles: string[];
  conceptId: string;
  duration: number;
  kind: SceneIndicationPrimitiveKind;
  targetObjectIds: string[];
  timelineStepIndex: number;
};

export type SceneIndicationPrimitivePlan = {
  indications: SceneIndicationPrimitive[];
  sceneId: string;
};

export type SceneIndicationPrimitiveSummary = {
  circumscribeCount: number;
  conceptIds: string;
  flashCount: number;
  highlightBeatCount: number;
  indicationCount: number;
  missingTargetCount: number;
  pulseCount: number;
  sceneId: string;
  sourceContract: typeof INDICATION_PRIMITIVE_SOURCE_CONTRACT;
  statePolicy: typeof INDICATION_PRIMITIVE_STATE_POLICY;
  summary: string;
  targetObjectCount: number;
  targetObjectIds: string;
};

export type SceneIndicationPrimitivePlanInput = {
  objects: readonly MathObjectSpec[];
  sceneId: string;
  timeline: readonly AnimationStep[];
};

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
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

function clamp01(value: number) {
  return Math.min(1, Math.max(0, finite(value, 0)));
}

function safeVec3(value: Vec3 | undefined, fallback: Vec3 = [0, 0, 0]): Vec3 {
  if (!value) return [...fallback];
  return [
    finite(value[0], fallback[0]),
    finite(value[1], fallback[1]),
    finite(value[2], fallback[2])
  ];
}

function pulseEnvelope(progress: number) {
  const alpha = clamp01(progress);
  return Math.sin(Math.PI * alpha);
}

function defaultRadius(target: IndicationTarget) {
  return Math.max(
    0.5,
    Math.hypot(target.max[0] - target.min[0], target.max[1] - target.min[1], target.max[2] - target.min[2]) / 2
  );
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function summarizeIds(values: string[]) {
  return values.join(",") || "none";
}

function conceptIdForObject(object: MathObjectSpec) {
  return "conceptId" in object ? object.conceptId : undefined;
}

function colorRoleForObject(object: MathObjectSpec) {
  return "colorRole" in object ? object.colorRole : "reference";
}

export function buildIndicationTargetFromNode(node: RuntimeMathObjectNode): IndicationTarget {
  if (node.boundingBox.kind === "empty") {
    return {
      center: [0, 0, 0],
      colorRole: node.colorRole,
      conceptId: node.conceptId,
      id: node.id,
      max: [0, 0, 0],
      min: [0, 0, 0]
    };
  }

  return {
    center: safeVec3(node.boundingBox.center),
    colorRole: node.colorRole,
    conceptId: node.conceptId,
    id: node.id,
    max: safeVec3(node.boundingBox.max),
    min: safeVec3(node.boundingBox.min)
  };
}

export function buildFlashFrame(
  target: IndicationTarget,
  options: {
    innerRadius?: number;
    outerRadius?: number;
    progress: number;
    rayCount?: number;
  }
): FlashFrame {
  const rayCount = Math.max(1, Math.floor(finite(options.rayCount ?? 8, 8)));
  const baseRadius = defaultRadius(target);
  const innerRadius = Math.max(0, finite(options.innerRadius ?? baseRadius, baseRadius));
  const outerRadius = Math.max(innerRadius, finite(options.outerRadius ?? baseRadius * 1.4, baseRadius * 1.4));
  const opacity = Number(pulseEnvelope(options.progress).toFixed(6));
  const rays = Array.from({ length: rayCount }, (_, index) => {
    const angle = (2 * Math.PI * index) / rayCount;
    const unit: Vec3 = [Math.cos(angle), Math.sin(angle), 0];
    const from: Vec3 = [
      target.center[0] + unit[0] * innerRadius,
      target.center[1] + unit[1] * innerRadius,
      target.center[2]
    ];
    const to: Vec3 = [
      target.center[0] + unit[0] * outerRadius,
      target.center[1] + unit[1] * outerRadius,
      target.center[2]
    ];

    return {
      from,
      to
    };
  });

  return {
    center: target.center,
    opacity,
    rays,
    targetId: target.id,
    type: "flash"
  };
}

export function buildCircumscribeFrame(
  target: IndicationTarget,
  options: { padding?: number; progress: number }
): CircumscribeFrame {
  const padding = Math.max(0, finite(options.padding ?? 0.1, 0.1));
  const z = target.center[2];
  const minX = target.min[0] - padding;
  const minY = target.min[1] - padding;
  const maxX = target.max[0] + padding;
  const maxY = target.max[1] + padding;
  const progress = clamp01(options.progress);

  return {
    drawRange: [0, progress],
    opacity: Number(pulseEnvelope(progress).toFixed(6)),
    outline: [
      [minX, minY, z],
      [maxX, minY, z],
      [maxX, maxY, z],
      [minX, maxY, z],
      [minX, minY, z]
    ],
    targetId: target.id,
    type: "circumscribe"
  };
}

export function buildHighlightPulseFrame(
  target: IndicationTarget,
  options: { maxScale?: number; progress: number }
): HighlightPulseFrame {
  const maxScale = Math.max(1, finite(options.maxScale ?? 1.1, 1.1));
  const envelope = pulseEnvelope(options.progress);

  return {
    center: target.center,
    opacity: Number(envelope.toFixed(6)),
    scale: Number((1 + (maxScale - 1) * envelope).toFixed(6)),
    targetId: target.id,
    type: "pulse"
  };
}

export function summarizeIndicationFrame(frame: IndicationFrame) {
  if (frame.type === "flash") {
    return `flash:${frame.targetId}:rays=${frame.rays.length}:opacity=${frame.opacity.toFixed(3)}`;
  }

  if (frame.type === "circumscribe") {
    return `circumscribe:${frame.targetId}:points=${frame.outline.length}:draw=${frame.drawRange[1].toFixed(3)}`;
  }

  return `pulse:${frame.targetId}:scale=${frame.scale.toFixed(3)}:opacity=${frame.opacity.toFixed(3)}`;
}

export function buildSceneIndicationPrimitivePlan(scene: SceneIndicationPrimitivePlanInput): SceneIndicationPrimitivePlan {
  const indications = scene.timeline.flatMap((step, timelineStepIndex) => {
    const conceptId = step.type === "highlight"
      ? step.conceptId
      : step.type === "sweepParameter"
        ? step.conceptId
        : undefined;

    if (!conceptId) return [];

    const targets = scene.objects.filter((object) => conceptIdForObject(object) === conceptId);

    return [{
      colorRoles: uniqueSorted(targets.map(colorRoleForObject)),
      conceptId,
      duration: Math.max(0, finite(step.duration, 0)),
      kind: "pulse" as const,
      targetObjectIds: uniqueSorted(targets.map((target) => target.id)),
      timelineStepIndex
    }];
  });

  return {
    indications,
    sceneId: scene.sceneId
  };
}

function indicationSummaryText(
  summary: Omit<SceneIndicationPrimitiveSummary, "conceptIds" | "sourceContract" | "statePolicy" | "summary" | "targetObjectIds">
) {
  return [
    `indication:${summary.sceneId}`,
    `beats=${summary.highlightBeatCount}`,
    `targets=${summary.targetObjectCount}`,
    `pulse=${summary.pulseCount}`,
    `circumscribe=${summary.circumscribeCount}`,
    `flash=${summary.flashCount}`,
    `missing=${summary.missingTargetCount}`
  ].join(":");
}

export function summarizeSceneIndicationPrimitivePlan(
  plan: SceneIndicationPrimitivePlan
): SceneIndicationPrimitiveSummary {
  const indicationCount = plan.indications.length;
  const pulseCount = plan.indications.filter((indication) => indication.kind === "pulse").length;
  const circumscribeCount = plan.indications.filter((indication) => indication.kind === "circumscribe").length;
  const flashCount = plan.indications.filter((indication) => indication.kind === "flash").length;
  const targetObjectIds = uniqueSorted(plan.indications.flatMap((indication) => indication.targetObjectIds));
  const baseSummary = {
    circumscribeCount,
    flashCount,
    highlightBeatCount: indicationCount,
    indicationCount,
    missingTargetCount: plan.indications.filter((indication) => indication.targetObjectIds.length === 0).length,
    pulseCount,
    sceneId: plan.sceneId,
    targetObjectCount: targetObjectIds.length
  };

  return {
    ...baseSummary,
    conceptIds: summarizeIds(uniqueSorted(plan.indications.map((indication) => indication.conceptId))),
    sourceContract: INDICATION_PRIMITIVE_SOURCE_CONTRACT,
    statePolicy: INDICATION_PRIMITIVE_STATE_POLICY,
    summary: indicationSummaryText(baseSummary),
    targetObjectIds: summarizeIds(targetObjectIds)
  };
}

export function indicationPrimitivePlanDataAttributes(summary: SceneIndicationPrimitiveSummary) {
  return {
    "data-viz-manim-indication-circumscribe-count": String(summary.circumscribeCount),
    "data-viz-manim-indication-concept-ids": summary.conceptIds,
    "data-viz-manim-indication-count": String(summary.indicationCount),
    "data-viz-manim-indication-flash-count": String(summary.flashCount),
    "data-viz-manim-indication-highlight-beat-count": String(summary.highlightBeatCount),
    "data-viz-manim-indication-missing-target-count": String(summary.missingTargetCount),
    "data-viz-manim-indication-pulse-count": String(summary.pulseCount),
    "data-viz-manim-indication-source-contract": summary.sourceContract,
    "data-viz-manim-indication-state-policy": summary.statePolicy,
    "data-viz-manim-indication-summary": summary.summary,
    "data-viz-manim-indication-target-object-count": String(summary.targetObjectCount),
    "data-viz-manim-indication-target-object-ids": summary.targetObjectIds
  } as const;
}

export function serializeSceneIndicationPrimitivePlan(plan: SceneIndicationPrimitivePlan) {
  return stableSerialize(plan);
}
