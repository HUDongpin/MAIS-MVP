import {
  buildHighlightPulseFrame,
  buildIndicationTargetFromNode,
  INDICATION_PRIMITIVE_STATE_POLICY
} from "./mathIndicationPrimitives";
import type { MathSceneRuntimeState, RuntimeMathObjectNode } from "./mathSceneRuntimeState";
import type { Vec3 } from "./mathSceneTypes";
import { TIMELINE_FOCUS_TARGET_POLICY, timelineFocusTargetIds } from "./mathTimeline";

export const RUNTIME_INDICATION_OVERLAY_SOURCE_CONTRACT =
  "Scene.play focus targets render transient attention overlays for matched runtime math objects" as const;
export const RUNTIME_INDICATION_OVERLAY_STATE_POLICY = INDICATION_PRIMITIVE_STATE_POLICY;
export const RUNTIME_INDICATION_OVERLAY_FOCUS_TARGET_POLICY = TIMELINE_FOCUS_TARGET_POLICY;

type RuntimeIndicationOverlayBaseFrame = {
  colorRole: "attention";
  conceptId: string;
  objectId: string;
  opacity: number;
  sourceContract: typeof RUNTIME_INDICATION_OVERLAY_SOURCE_CONTRACT;
  statePolicy: typeof RUNTIME_INDICATION_OVERLAY_STATE_POLICY;
};

export type RuntimeIndicationOverlayLineFrame = RuntimeIndicationOverlayBaseFrame & {
  lineWidth: number;
  points: Vec3[];
  segmentId: string;
  type: "line";
};

export type RuntimeIndicationOverlayPointFrame = RuntimeIndicationOverlayBaseFrame & {
  position: Vec3;
  radius: number;
  type: "point";
};

export type RuntimeIndicationOverlayFrame =
  | RuntimeIndicationOverlayLineFrame
  | RuntimeIndicationOverlayPointFrame;

export type RuntimeIndicationOverlaySummary = {
  activeConceptId: string;
  focusTargetCount: number;
  focusTargetIds: string;
  focusTargetPolicy: typeof RUNTIME_INDICATION_OVERLAY_FOCUS_TARGET_POLICY;
  focusTargetPrimaryId: string;
  focusTargetSummary: string;
  frameCount: number;
  lineFrameCount: number;
  objectCount: number;
  objectIds: string;
  pointFrameCount: number;
  sourceContract: typeof RUNTIME_INDICATION_OVERLAY_SOURCE_CONTRACT;
  statePolicy: typeof RUNTIME_INDICATION_OVERLAY_STATE_POLICY;
  summary: string;
};

export type RuntimeIndicationOverlayOptions = {
  activeConceptId?: string;
  focusTargetIds?: readonly string[];
};

export type RuntimeIndicationOverlayPayload = RuntimeIndicationOverlaySummary & {
  frames: RuntimeIndicationOverlayFrame[];
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

function orderedUnique(values: readonly string[]) {
  return [...new Set(values.filter(Boolean))];
}

function sortedUnique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function rounded(value: number, digits = 6) {
  return Number(finite(value).toFixed(digits));
}

function activeHighlightConceptId(runtimeState: MathSceneRuntimeState) {
  const activeStep = runtimeState.timeline.activeStep;
  if (activeStep?.type !== "highlight") return null;

  return activeStep.conceptId || runtimeState.timeline.activeConceptId || null;
}

function conceptIdForObjectId(runtimeState: MathSceneRuntimeState, objectId: string | undefined) {
  if (!objectId) return undefined;
  return runtimeState.objectGraph.byId[objectId]?.conceptId ?? objectId;
}

export function runtimeIndicationOverlayActiveConceptId(runtimeState: MathSceneRuntimeState) {
  const step = runtimeState.timeline.activeStep;
  if (!step) return runtimeState.timeline.activeConceptId || "none";

  if (step.type === "highlight") return step.conceptId || runtimeState.timeline.activeConceptId || "none";
  if (step.type === "moveAlongPath") {
    return conceptIdForObjectId(runtimeState, step.objectId) ?? runtimeState.timeline.activeConceptId ?? "none";
  }
  if (
    step.type === "revealCurve" ||
    step.type === "revealSurface" ||
    step.type === "fadeInObject" ||
    step.type === "fadeOutObject" ||
    step.type === "growFromCenter" ||
    step.type === "transformObject"
  ) {
    return conceptIdForObjectId(runtimeState, step.objectId) ?? runtimeState.timeline.activeConceptId ?? "none";
  }

  return runtimeState.timeline.activeConceptId || "none";
}

export function runtimeIndicationOverlayFocusTargetIds(runtimeState: MathSceneRuntimeState) {
  return timelineFocusTargetIds(runtimeState.timeline.activeStep);
}

function fallbackFocusTargetIds(runtimeState: MathSceneRuntimeState) {
  const timelineTargets = timelineFocusTargetIds(runtimeState.timeline.activeStep);
  if (timelineTargets.length > 0) return timelineTargets;

  const conceptId = activeHighlightConceptId(runtimeState);
  return conceptId ? [conceptId] : [];
}

function focusTargetIdsForOptions(runtimeState: MathSceneRuntimeState, options: RuntimeIndicationOverlayOptions) {
  if (options.focusTargetIds) return orderedUnique(options.focusTargetIds);

  return fallbackFocusTargetIds(runtimeState);
}

function summarizeFocusTargets(activeConceptId: string, focusTargetIds: readonly string[]) {
  const ids = orderedUnique(focusTargetIds);
  const idSummary = ids.join(",") || "none";

  return {
    focusTargetCount: ids.length,
    focusTargetIds: idSummary,
    focusTargetPolicy: RUNTIME_INDICATION_OVERLAY_FOCUS_TARGET_POLICY,
    focusTargetPrimaryId: ids[0] ?? "none",
    focusTargetSummary: `runtimeIndicationOverlayFocus:active=${activeConceptId}:targets=${ids.length}:ids=${idSummary}`
  };
}

function targetObjectIdsForConcept(runtimeState: MathSceneRuntimeState, conceptId: string) {
  const boundObjectIds = runtimeState.sourceScene.bindings
    .filter((binding) => binding.conceptId === conceptId)
    .map((binding) => binding.objectId);
  const directObjectIds = Object.values(runtimeState.objectGraph.byId)
    .filter((node) => node.conceptId === conceptId)
    .map((node) => node.id);
  const objectIds = new Set([...boundObjectIds, ...directObjectIds]);
  const renderOrder = runtimeState.sceneGraph.renderGroups.all;
  const orderedObjectIds = renderOrder.filter((objectId) => objectIds.has(objectId));
  const remainingObjectIds = sortedUnique([...objectIds].filter((objectId) => !orderedObjectIds.includes(objectId)));

  return [...orderedObjectIds, ...remainingObjectIds];
}

function targetObjectDescriptorsForFocusTarget(runtimeState: MathSceneRuntimeState, targetId: string) {
  const directNode = runtimeState.objectGraph.byId[targetId];
  if (directNode) {
    return [{ conceptId: directNode.conceptId ?? targetId, objectId: targetId }];
  }

  return targetObjectIdsForConcept(runtimeState, targetId).map((objectId) => ({
    conceptId: targetId,
    objectId
  }));
}

function targetObjectDescriptorsForFocusTargets(runtimeState: MathSceneRuntimeState, focusTargetIds: readonly string[]) {
  const descriptors = focusTargetIds.flatMap((targetId) =>
    targetObjectDescriptorsForFocusTarget(runtimeState, targetId)
  );
  const byObjectId = new Map<string, { conceptId: string; objectId: string }>();

  descriptors.forEach((descriptor) => {
    if (!byObjectId.has(descriptor.objectId)) byObjectId.set(descriptor.objectId, descriptor);
  });

  return [...byObjectId.values()];
}

function overlayBase(
  node: RuntimeMathObjectNode,
  conceptId: string,
  opacity: number
): RuntimeIndicationOverlayBaseFrame {
  return {
    colorRole: "attention",
    conceptId,
    objectId: node.id,
    opacity: rounded(opacity),
    sourceContract: RUNTIME_INDICATION_OVERLAY_SOURCE_CONTRACT,
    statePolicy: RUNTIME_INDICATION_OVERLAY_STATE_POLICY
  };
}

function lineFrame(
  node: RuntimeMathObjectNode,
  conceptId: string,
  points: Vec3[],
  options: {
    lineWidth: number;
    opacity: number;
    segmentId: string;
  }
): RuntimeIndicationOverlayLineFrame | null {
  if (points.length < 2) return null;

  return {
    ...overlayBase(node, conceptId, options.opacity),
    lineWidth: rounded(options.lineWidth, 3),
    points,
    segmentId: options.segmentId,
    type: "line"
  };
}

function pointFrame(
  node: RuntimeMathObjectNode,
  conceptId: string,
  position: Vec3,
  options: {
    opacity: number;
    radius: number;
  }
): RuntimeIndicationOverlayPointFrame {
  return {
    ...overlayBase(node, conceptId, options.opacity),
    position,
    radius: rounded(options.radius, 4),
    type: "point"
  };
}

function framesForNode(
  node: RuntimeMathObjectNode,
  conceptId: string,
  progress: number
): RuntimeIndicationOverlayFrame[] {
  const target = buildIndicationTargetFromNode(node);
  const pulse = buildHighlightPulseFrame(target, {
    maxScale: 1.16,
    progress
  });
  const opacity = pulse.opacity;
  const lineWidth = 8 * pulse.scale;

  if (node.renderState.kind === "axes") {
    return [
      lineFrame(node, conceptId, node.renderState.xAxisPoints, { lineWidth, opacity, segmentId: "x-axis" }),
      lineFrame(node, conceptId, node.renderState.yAxisPoints, { lineWidth, opacity, segmentId: "y-axis" }),
      lineFrame(node, conceptId, node.renderState.zAxisPoints, { lineWidth, opacity, segmentId: "z-axis" })
    ].filter((frame): frame is RuntimeIndicationOverlayLineFrame => frame !== null);
  }

  if (node.renderState.kind === "polyline") {
    const frame = lineFrame(node, conceptId, node.renderState.points, {
      lineWidth,
      opacity,
      segmentId: "polyline"
    });

    return frame ? [frame] : [];
  }

  if (node.renderState.kind === "surface") {
    return [
      ...node.renderState.wireframeRows.map((points, index) =>
        lineFrame(node, conceptId, points, {
          lineWidth: 3.4 * pulse.scale,
          opacity,
          segmentId: `row:${index}`
        })
      ),
      ...node.renderState.wireframeColumns.map((points, index) =>
        lineFrame(node, conceptId, points, {
          lineWidth: 2.8 * pulse.scale,
          opacity: opacity * 0.72,
          segmentId: `column:${index}`
        })
      )
    ].filter((frame): frame is RuntimeIndicationOverlayLineFrame => frame !== null);
  }

  if (node.renderState.kind === "vector") {
    const frame = lineFrame(node, conceptId, [node.renderState.from, node.renderState.to], {
      lineWidth,
      opacity,
      segmentId: "vector"
    });

    return frame ? [frame] : [];
  }

  if (node.renderState.kind === "point") {
    return [
      pointFrame(node, conceptId, node.renderState.position, {
        opacity,
        radius: 0.16 * pulse.scale
      })
    ];
  }

  return [];
}

export function buildRuntimeIndicationOverlayFrames(
  runtimeState: MathSceneRuntimeState,
  options: RuntimeIndicationOverlayOptions = {}
): RuntimeIndicationOverlayFrame[] {
  const focusTargetIds = focusTargetIdsForOptions(runtimeState, options);
  if (focusTargetIds.length === 0) return [];

  return targetObjectDescriptorsForFocusTargets(runtimeState, focusTargetIds).flatMap(({ conceptId, objectId }) => {
    const node = runtimeState.objectGraph.byId[objectId];
    if (!node) return [];

    return framesForNode(node, conceptId, runtimeState.timeline.easedLocalProgress);
  });
}

export function summarizeRuntimeIndicationOverlayFrames(
  frames: readonly RuntimeIndicationOverlayFrame[],
  activeConceptId = "none",
  options: Pick<RuntimeIndicationOverlayOptions, "focusTargetIds"> = {}
): RuntimeIndicationOverlaySummary {
  const objectIds = sortedUnique(frames.map((frame) => frame.objectId));
  const lineFrameCount = frames.filter((frame) => frame.type === "line").length;
  const pointFrameCount = frames.filter((frame) => frame.type === "point").length;
  const frameCount = frames.length;
  const objectIdSummary = objectIds.join(",") || "none";
  const focusTargetSummary = summarizeFocusTargets(
    activeConceptId,
    options.focusTargetIds ?? (activeConceptId === "none" ? [] : [activeConceptId])
  );

  return {
    activeConceptId,
    ...focusTargetSummary,
    frameCount,
    lineFrameCount,
    objectCount: objectIds.length,
    objectIds: objectIdSummary,
    pointFrameCount,
    sourceContract: RUNTIME_INDICATION_OVERLAY_SOURCE_CONTRACT,
    statePolicy: RUNTIME_INDICATION_OVERLAY_STATE_POLICY,
    summary: `runtimeIndicationOverlay:concept=${activeConceptId}:focusTargets=${focusTargetSummary.focusTargetCount}:frames=${frameCount}:objects=${objectIds.length}:lines=${lineFrameCount}:points=${pointFrameCount}:objectIds=${objectIdSummary}`
  };
}

export function runtimeIndicationOverlayDataAttributes(summary: RuntimeIndicationOverlaySummary) {
  return {
    "data-viz-manim-indication-runtime-overlay-active-concept-id": summary.activeConceptId,
    "data-viz-manim-indication-runtime-overlay-count": String(summary.frameCount),
    "data-viz-manim-indication-runtime-overlay-focus-target-count": String(summary.focusTargetCount),
    "data-viz-manim-indication-runtime-overlay-focus-target-ids": summary.focusTargetIds,
    "data-viz-manim-indication-runtime-overlay-focus-target-policy": summary.focusTargetPolicy,
    "data-viz-manim-indication-runtime-overlay-focus-target-primary-id": summary.focusTargetPrimaryId,
    "data-viz-manim-indication-runtime-overlay-focus-target-summary": summary.focusTargetSummary,
    "data-viz-manim-indication-runtime-overlay-line-count": String(summary.lineFrameCount),
    "data-viz-manim-indication-runtime-overlay-object-count": String(summary.objectCount),
    "data-viz-manim-indication-runtime-overlay-object-ids": summary.objectIds,
    "data-viz-manim-indication-runtime-overlay-point-count": String(summary.pointFrameCount),
    "data-viz-manim-indication-runtime-overlay-source-contract": summary.sourceContract,
    "data-viz-manim-indication-runtime-overlay-state-policy": summary.statePolicy,
    "data-viz-manim-indication-runtime-overlay-summary": summary.summary
  } as const;
}

export function serializeRuntimeIndicationOverlayPayload(
  frames: readonly RuntimeIndicationOverlayFrame[],
  summary: RuntimeIndicationOverlaySummary
) {
  return stableSerialize({
    ...summary,
    frames: [...frames]
  });
}
