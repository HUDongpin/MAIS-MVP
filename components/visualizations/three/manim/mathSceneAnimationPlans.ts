import { createMathAnimateBuilder, type MathAnimateBuilder, type MathAnimatePlan } from "./mathAnimationBuilder";
import { buildSceneAnimationCompositionPlans, summarizeAnimationCompositionPlans } from "./mathAnimationComposition";
import type { MathObjectGraph, MathSceneRuntimeState } from "./mathSceneRuntimeState";
import type { MathSceneAnimateOperationSpec, MathSceneAnimatePlanSpec, MathSceneSpec } from "./mathSceneTypes";

export type MathSceneAnimationPlanSummary = {
  animatedObjectIds: string[];
  compositionCount: number;
  compositionDurationSeconds: number;
  compositionIssueCount: number;
  compositionModes: string[];
  compositionWindowCount: number;
  operationCount: number;
  planCount: number;
  transformStepCount: number;
};

function applyOperation(builder: MathAnimateBuilder, operation: MathSceneAnimateOperationSpec) {
  if (operation.type === "shift") return builder.shift(operation.vector);
  if (operation.type === "scale") return builder.scale(operation.factor, { aboutPoint: operation.aboutPoint });
  if (operation.type === "center") return builder.center();
  if (operation.type === "alignTo") {
    return builder.alignTo(operation.targetObjectId, { direction: operation.direction });
  }
  if (operation.type === "matchDepth") {
    return builder.matchDepth(operation.targetObjectId, { aboutPoint: operation.aboutPoint, stretch: operation.stretch });
  }
  if (operation.type === "matchHeight") {
    return builder.matchHeight(operation.targetObjectId, { aboutPoint: operation.aboutPoint, stretch: operation.stretch });
  }
  if (operation.type === "matchWidth") {
    return builder.matchWidth(operation.targetObjectId, { aboutPoint: operation.aboutPoint, stretch: operation.stretch });
  }
  if (operation.type === "matchX") return builder.matchX(operation.targetObjectId);
  if (operation.type === "matchY") return builder.matchY(operation.targetObjectId);
  if (operation.type === "matchZ") return builder.matchZ(operation.targetObjectId);
  if (operation.type === "moveTo") return builder.moveTo(operation.point);
  if (operation.type === "nextTo") {
    return builder.nextTo(operation.targetObjectId, { buff: operation.buff, direction: operation.direction });
  }
  if (operation.type === "toEdge") {
    return builder.toEdge(operation.direction, { buff: operation.buff, frame: operation.frame });
  }
  if (operation.type === "toCorner") {
    return builder.toCorner(operation.direction, { buff: operation.buff, frame: operation.frame });
  }
  if (operation.type === "rotate") {
    return builder.rotate(operation.angleRadians, { aboutPoint: operation.aboutPoint, axis: operation.axis });
  }
  if (operation.type === "setDepth") {
    return builder.setDepth(operation.depth, { aboutPoint: operation.aboutPoint, stretch: operation.stretch });
  }
  if (operation.type === "setWidth") {
    return builder.setWidth(operation.width, { aboutPoint: operation.aboutPoint, stretch: operation.stretch });
  }
  if (operation.type === "setHeight") {
    return builder.setHeight(operation.height, { aboutPoint: operation.aboutPoint, stretch: operation.stretch });
  }
  if (operation.type === "setOpacity") return builder.setOpacity(operation.opacity);
  if (operation.type === "setStroke") {
    return builder.setStroke({
      strokeOpacity: operation.strokeOpacity,
      strokeRole: operation.strokeRole,
      strokeWidth: operation.strokeWidth
    });
  }
  if (operation.type === "setFill") {
    return builder.setFill({
      fillOpacity: operation.fillOpacity,
      fillRole: operation.fillRole
    });
  }
  if (operation.type === "setStyle") {
    return builder.setStyle({
      antiAliasWidth: operation.antiAliasWidth,
      fillOpacity: operation.fillOpacity,
      fillRole: operation.fillRole,
      jointAngleDegrees: operation.jointAngleDegrees,
      strokeOpacity: operation.strokeOpacity,
      strokeRole: operation.strokeRole,
      strokeWidth: operation.strokeWidth
    });
  }
  if (operation.type === "setX") return builder.setX(operation.coordinate);
  if (operation.type === "setY") return builder.setY(operation.coordinate);
  if (operation.type === "setZ") return builder.setZ(operation.coordinate);
  return builder.setColorRole(operation.colorRole);
}

function buildPlanFromSpec(graph: MathObjectGraph, planSpec: MathSceneAnimatePlanSpec): MathAnimatePlan {
  const builder = planSpec.operations.reduce(
    (currentBuilder, operation) => applyOperation(currentBuilder, operation),
    createMathAnimateBuilder(graph, planSpec.objectId)
  );

  return builder.build({
    duration: planSpec.duration,
    id: planSpec.id,
    lagRatio: planSpec.lagRatio,
    path: planSpec.path,
    targetId: planSpec.targetObjectId
  });
}

export function buildMathSceneAnimatePlansFromGraph(scene: MathSceneSpec, graph: MathObjectGraph): MathAnimatePlan[] {
  return (scene.animationPlans ?? []).map((planSpec) => buildPlanFromSpec(graph, planSpec));
}

export function buildMathSceneAnimatePlans(scene: MathSceneSpec, runtimeState: MathSceneRuntimeState): MathAnimatePlan[] {
  return buildMathSceneAnimatePlansFromGraph(scene, runtimeState.objectGraph);
}

export function summarizeSceneAnimationPlans(scene: MathSceneSpec): MathSceneAnimationPlanSummary {
  const animationPlans = scene.animationPlans ?? [];
  const transformSteps = scene.timeline.filter((step) => step.type === "transformObject");
  const animatedObjectIds = [...new Set(animationPlans.map((plan) => plan.objectId))].sort((left, right) => left.localeCompare(right));
  const compositionSummary = summarizeAnimationCompositionPlans(buildSceneAnimationCompositionPlans(scene));

  return {
    animatedObjectIds,
    compositionCount: compositionSummary.compositionCount,
    compositionDurationSeconds: compositionSummary.compositionDurationSeconds,
    compositionIssueCount: compositionSummary.issueCount,
    compositionModes: compositionSummary.compositionModes,
    compositionWindowCount: compositionSummary.windowCount,
    operationCount: animationPlans.reduce((sum, plan) => sum + plan.operations.length, 0),
    planCount: animationPlans.length,
    transformStepCount: transformSteps.length
  };
}

export function sceneAnimationPlanDataAttributes(summary: MathSceneAnimationPlanSummary) {
  return {
    "data-viz-manim-animation-composition-count": String(summary.compositionCount),
    "data-viz-manim-animation-composition-duration": summary.compositionDurationSeconds.toFixed(3),
    "data-viz-manim-animation-composition-issue-count": String(summary.compositionIssueCount),
    "data-viz-manim-animation-composition-modes": summary.compositionModes.join(",") || "none",
    "data-viz-manim-animation-composition-window-count": String(summary.compositionWindowCount),
    "data-viz-manim-animation-object-count": String(summary.animatedObjectIds.length),
    "data-viz-manim-animation-operation-count": String(summary.operationCount),
    "data-viz-manim-animation-plan-count": String(summary.planCount),
    "data-viz-manim-transform-step-count": String(summary.transformStepCount)
  } as const;
}
