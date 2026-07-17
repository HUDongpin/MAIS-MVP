import {
  generateMobjectTarget,
  saveMobjectState,
  type MathMobjectStateNode,
  type MathMobjectTargetState
} from "./mathMobjectState";
import type { TransformPathSpec } from "./mathPathFunctions";
import { mapRuntimeRenderState, pointsForRuntimeRenderState } from "./mathRuntimeRenderState";
import type { AnimationStep, Vec3 } from "./mathSceneTypes";
import type { MathObjectGraph, RuntimeBoundingBox, RuntimeRenderState } from "./mathSceneRuntimeState";
import { buildVMobjectStyle, type VMobjectStyleInput } from "./mathVMobjectStyle";

export const ANIMATION_BUILDER_SOURCE_CONTRACT =
  "Mobject.animate|_AnimationBuilder method chain|generate_target Transform prep|get_all_points family bounds" as const;

export type MathAnimateEdgeFrame = {
  max: Vec3;
  min: Vec3;
};

export type MathAnimateOperation =
  | { type: "alignTo"; direction?: Vec3; targetObjectId: string }
  | { type: "center" }
  | { type: "matchDepth"; aboutPoint?: Vec3; stretch?: boolean; targetObjectId: string }
  | { type: "matchHeight"; aboutPoint?: Vec3; stretch?: boolean; targetObjectId: string }
  | { type: "matchWidth"; aboutPoint?: Vec3; stretch?: boolean; targetObjectId: string }
  | { type: "matchX"; targetObjectId: string }
  | { type: "matchY"; targetObjectId: string }
  | { type: "matchZ"; targetObjectId: string }
  | { type: "moveTo"; point: Vec3 }
  | { type: "nextTo"; buff?: number; direction?: Vec3; targetObjectId: string }
  | { type: "rotate"; aboutPoint?: Vec3; angleRadians: number; axis?: "x" | "y" | "z" }
  | { type: "scale"; aboutPoint?: Vec3; factor: number }
  | { type: "setColorRole"; colorRole: string }
  | { type: "setDepth"; aboutPoint?: Vec3; depth: number; stretch?: boolean }
  | { type: "setFill"; fillOpacity?: number; fillRole?: string }
  | { type: "setHeight"; aboutPoint?: Vec3; height: number; stretch?: boolean }
  | { type: "setOpacity"; opacity: number }
  | { type: "setStroke"; strokeOpacity?: number; strokeRole?: string; strokeWidth?: number }
  | ({ type: "setStyle" } & VMobjectStyleInput)
  | { type: "setWidth"; aboutPoint?: Vec3; stretch?: boolean; width: number }
  | { type: "setX"; coordinate: number }
  | { type: "setY"; coordinate: number }
  | { type: "setZ"; coordinate: number }
  | { type: "shift"; vector: Vec3 }
  | { type: "toCorner"; buff?: number; direction: Vec3; frame: MathAnimateEdgeFrame }
  | { type: "toEdge"; buff?: number; direction: Vec3; frame: MathAnimateEdgeFrame };

export type MathAnimateBuildOptions = {
  duration: number;
  id?: string;
  lagRatio?: number;
  path?: TransformPathSpec;
  targetId?: string;
};

export type MathAnimatePlan = {
  changedFields: string[];
  changedNodeIds: string[];
  id: string;
  objectId: string;
  operations: MathAnimateOperation[];
  sourceContract: typeof ANIMATION_BUILDER_SOURCE_CONTRACT;
  step: Extract<AnimationStep, { type: "transformObject" }>;
  target: MathMobjectTargetState;
  targetObjectId: string;
};

export type MathAnimatePlanSummary = {
  changedFieldCount: number;
  changedNodeCount: number;
  duration: number;
  objectId: string;
  operationCount: number;
  targetObjectId: string;
};

export type MathAnimateBuilderCatalog = {
  changedFieldCount: number;
  changedNodeCount: number;
  changedNodeIds: string[];
  firstPlanId: string;
  laggedPlanCount: number;
  objectIds: string[];
  operationCount: number;
  operationTypes: string[];
  pathPlanCount: number;
  planCount: number;
  sourceContract: typeof ANIMATION_BUILDER_SOURCE_CONTRACT;
  summary: string;
  targetObjectIds: string[];
  totalDuration: number;
  version: "mais-manim-animate-builder/v1";
};

export type MathAnimateBuilder = {
  alignTo(targetObjectId: string, options?: { direction?: Vec3 }): MathAnimateBuilder;
  build(options: MathAnimateBuildOptions): MathAnimatePlan;
  center(): MathAnimateBuilder;
  matchDepth(targetObjectId: string, options?: { aboutPoint?: Vec3; stretch?: boolean }): MathAnimateBuilder;
  matchHeight(targetObjectId: string, options?: { aboutPoint?: Vec3; stretch?: boolean }): MathAnimateBuilder;
  matchWidth(targetObjectId: string, options?: { aboutPoint?: Vec3; stretch?: boolean }): MathAnimateBuilder;
  matchX(targetObjectId: string): MathAnimateBuilder;
  matchY(targetObjectId: string): MathAnimateBuilder;
  matchZ(targetObjectId: string): MathAnimateBuilder;
  moveTo(point: Vec3): MathAnimateBuilder;
  nextTo(targetObjectId: string, options?: { buff?: number; direction?: Vec3 }): MathAnimateBuilder;
  rotate(angleRadians: number, options?: { aboutPoint?: Vec3; axis?: "x" | "y" | "z" }): MathAnimateBuilder;
  scale(factor: number, options?: { aboutPoint?: Vec3 }): MathAnimateBuilder;
  setColorRole(colorRole: string): MathAnimateBuilder;
  setDepth(depth: number, options?: { aboutPoint?: Vec3; stretch?: boolean }): MathAnimateBuilder;
  setFill(style: { fillOpacity?: number; fillRole?: string }): MathAnimateBuilder;
  setHeight(height: number, options?: { aboutPoint?: Vec3; stretch?: boolean }): MathAnimateBuilder;
  setOpacity(opacity: number): MathAnimateBuilder;
  setStroke(style: { strokeOpacity?: number; strokeRole?: string; strokeWidth?: number }): MathAnimateBuilder;
  setStyle(style: VMobjectStyleInput): MathAnimateBuilder;
  setWidth(width: number, options?: { aboutPoint?: Vec3; stretch?: boolean }): MathAnimateBuilder;
  setX(coordinate: number): MathAnimateBuilder;
  setY(coordinate: number): MathAnimateBuilder;
  setZ(coordinate: number): MathAnimateBuilder;
  shift(vector: Vec3): MathAnimateBuilder;
  toCorner(direction: Vec3, options?: { buff?: number; frame?: MathAnimateEdgeFrame }): MathAnimateBuilder;
  toEdge(direction: Vec3, options?: { buff?: number; frame?: MathAnimateEdgeFrame }): MathAnimateBuilder;
};

function cloneJson<TValue>(value: TValue): TValue {
  // Deep-clones JSON-shaped state without the JSON.parse(JSON.stringify(...))
  // string round-trip that dominated ~10-second lab-page main-thread long
  // tasks (profiled 2026-07-09). Mirrors JSON semantics for plain data:
  // undefined object properties are dropped and undefined array items become
  // null.
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((item) => (item === undefined ? null : cloneJson(item))) as TValue;
  }
  const clone: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (entry === undefined) continue;
    clone[key] = cloneJson(entry);
  }
  return clone as TValue;
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

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function finiteVec3(points: Vec3[]) {
  return points.filter((point) => point.every(Number.isFinite));
}

function cleanVec3(vector: Vec3, fallback: Vec3 = [0, 0, 0]): Vec3 {
  return [
    finite(vector[0], fallback[0]),
    finite(vector[1], fallback[1]),
    finite(vector[2], fallback[2])
  ];
}

function addVec3(point: Vec3, vector: Vec3): Vec3 {
  return [point[0] + vector[0], point[1] + vector[1], point[2] + vector[2]];
}

function subtractVec3(left: Vec3, right: Vec3): Vec3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function multiplyVec3(vector: Vec3, factor: number): Vec3 {
  return [vector[0] * factor, vector[1] * factor, vector[2] * factor];
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, finite(value, 1)));
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function scaleVec3(point: Vec3, factor: number, aboutPoint: Vec3): Vec3 {
  const alpha = finite(factor, 1);

  return [
    aboutPoint[0] + (point[0] - aboutPoint[0]) * alpha,
    aboutPoint[1] + (point[1] - aboutPoint[1]) * alpha,
    aboutPoint[2] + (point[2] - aboutPoint[2]) * alpha
  ];
}

function scaleVec3ByAxis(point: Vec3, factor: Vec3, aboutPoint: Vec3): Vec3 {
  return [
    aboutPoint[0] + (point[0] - aboutPoint[0]) * factor[0],
    aboutPoint[1] + (point[1] - aboutPoint[1]) * factor[1],
    aboutPoint[2] + (point[2] - aboutPoint[2]) * factor[2]
  ];
}

function rotateVec3(point: Vec3, angleRadians: number, axis: "x" | "y" | "z", aboutPoint: Vec3): Vec3 {
  const angle = finite(angleRadians, 0);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point[0] - aboutPoint[0];
  const dy = point[1] - aboutPoint[1];
  const dz = point[2] - aboutPoint[2];

  if (axis === "x") {
    return [aboutPoint[0] + dx, aboutPoint[1] + dy * cos - dz * sin, aboutPoint[2] + dy * sin + dz * cos];
  }

  if (axis === "y") {
    return [aboutPoint[0] + dx * cos + dz * sin, aboutPoint[1] + dy, aboutPoint[2] - dx * sin + dz * cos];
  }

  return [aboutPoint[0] + dx * cos - dy * sin, aboutPoint[1] + dx * sin + dy * cos, aboutPoint[2] + dz];
}

function mapRenderState(renderState: RuntimeRenderState, mapper: (point: Vec3) => Vec3): RuntimeRenderState {
  return mapRuntimeRenderState(renderState, mapper);
}

function stylePatchRenderState(renderState: RuntimeRenderState, stylePatch: VMobjectStyleInput): RuntimeRenderState {
  if (renderState.kind === "polyline" || renderState.kind === "surface" || renderState.kind === "vector") {
    return {
      ...renderState,
      style: buildVMobjectStyle({
        ...renderState.style,
        ...stylePatch
      })
    };
  }

  return renderState;
}

function cleanVMobjectStylePatch(style: VMobjectStyleInput): VMobjectStyleInput {
  return {
    antiAliasWidth: style.antiAliasWidth === undefined ? undefined : Math.max(0, finite(style.antiAliasWidth, 0)),
    baseNormal: style.baseNormal,
    fillOpacity: style.fillOpacity === undefined ? undefined : clamp01(style.fillOpacity),
    fillRole: style.fillRole,
    jointAngleDegrees: style.jointAngleDegrees === undefined ? undefined : finite(style.jointAngleDegrees, 0),
    strokeZoomBehavior: style.strokeZoomBehavior === undefined
      ? undefined
      : style.strokeZoomBehavior === "world-space"
        ? "world-space"
        : "screen-space",
    strokeOpacity: style.strokeOpacity === undefined ? undefined : clamp01(style.strokeOpacity),
    strokeRole: style.strokeRole,
    strokeWidth: style.strokeWidth === undefined ? undefined : Math.max(0, finite(style.strokeWidth, 0))
  };
}

function boundingBoxForPoints(points: Vec3[]): RuntimeBoundingBox {
  const finitePoints = finiteVec3(points);
  if (finitePoints.length === 0) return { kind: "empty" };

  const min: Vec3 = [...finitePoints[0]];
  const max: Vec3 = [...finitePoints[0]];

  finitePoints.forEach((point) => {
    min[0] = Math.min(min[0], point[0]);
    min[1] = Math.min(min[1], point[1]);
    min[2] = Math.min(min[2], point[2]);
    max[0] = Math.max(max[0], point[0]);
    max[1] = Math.max(max[1], point[1]);
    max[2] = Math.max(max[2], point[2]);
  });

  return {
    center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
    kind: "finite",
    max,
    min
  };
}

function collectStateFamilyPoints(
  nodes: Record<string, MathMobjectStateNode>,
  objectId: string,
  visited = new Set<string>()
): Vec3[] {
  if (visited.has(objectId)) return [];

  const node = nodes[objectId];
  if (!node) return [];

  const nextVisited = new Set(visited);
  nextVisited.add(objectId);

  return [
    ...pointsForRuntimeRenderState(node.renderState),
    ...node.childIds.flatMap((childId) => collectStateFamilyPoints(nodes, childId, nextVisited))
  ];
}

function familyBoundingBoxForStateNodes(
  nodes: Record<string, MathMobjectStateNode>,
  objectId: string | undefined
): RuntimeBoundingBox {
  if (!objectId) return { kind: "empty" };

  const familyBox = boundingBoxForPoints(collectStateFamilyPoints(nodes, objectId));
  if (familyBox.kind === "finite") return familyBox;

  return nodes[objectId]?.boundingBox ?? { kind: "empty" };
}

function familyBoundingBoxForTarget(
  graph: MathObjectGraph,
  workingNodes: Record<string, MathMobjectStateNode>,
  targetObjectId: string | undefined
): RuntimeBoundingBox | undefined {
  if (!targetObjectId) return undefined;
  if (workingNodes[targetObjectId]) return familyBoundingBoxForStateNodes(workingNodes, targetObjectId);

  const snapshot = saveMobjectState(graph, targetObjectId);
  if (!snapshot.nodes[targetObjectId]) return undefined;

  return familyBoundingBoxForStateNodes(snapshot.nodes, targetObjectId);
}

function defaultScaleAnchor(rootBox: RuntimeBoundingBox | undefined): Vec3 {
  if (rootBox?.kind === "finite") return cloneJson(rootBox.center);
  return [0, 0, 0];
}

function defaultTransformAnchor(rootBox: RuntimeBoundingBox | undefined): Vec3 {
  return defaultScaleAnchor(rootBox);
}

function normalizeDirection(direction: Vec3 | undefined): Vec3 {
  const cleanDirection = cleanVec3(direction ?? [1, 0, 0], [1, 0, 0]);
  const length = Math.hypot(cleanDirection[0], cleanDirection[1], cleanDirection[2]);

  if (length <= 0) return [1, 0, 0];
  return [cleanDirection[0] / length, cleanDirection[1] / length, cleanDirection[2] / length];
}

function oppositeDirection(direction: Vec3): Vec3 {
  return [-direction[0], -direction[1], -direction[2]];
}

function axisMaskFromDirection(direction: Vec3): Vec3 {
  return [direction[0] === 0 ? 0 : 1, direction[1] === 0 ? 0 : 1, direction[2] === 0 ? 0 : 1];
}

function cleanEdgeFrame(frame: MathAnimateEdgeFrame): MathAnimateEdgeFrame {
  const cleanMin = cleanVec3(frame.min, [-1, -1, -1]);
  const cleanMax = cleanVec3(frame.max, [1, 1, 1]);

  return {
    max: [
      Math.max(cleanMin[0], cleanMax[0]),
      Math.max(cleanMin[1], cleanMax[1]),
      Math.max(cleanMin[2], cleanMax[2])
    ],
    min: [
      Math.min(cleanMin[0], cleanMax[0]),
      Math.min(cleanMin[1], cleanMax[1]),
      Math.min(cleanMin[2], cleanMax[2])
    ]
  };
}

function criticalPoint(boundingBox: RuntimeBoundingBox | undefined, direction: Vec3): Vec3 {
  if (boundingBox?.kind !== "finite") return [0, 0, 0];

  return [
    direction[0] > 0 ? boundingBox.max[0] : direction[0] < 0 ? boundingBox.min[0] : boundingBox.center[0],
    direction[1] > 0 ? boundingBox.max[1] : direction[1] < 0 ? boundingBox.min[1] : boundingBox.center[1],
    direction[2] > 0 ? boundingBox.max[2] : direction[2] < 0 ? boundingBox.min[2] : boundingBox.center[2]
  ];
}

function edgeCriticalPoint(frame: MathAnimateEdgeFrame, direction: Vec3): Vec3 {
  return [
    direction[0] > 0 ? frame.max[0] : direction[0] < 0 ? frame.min[0] : (frame.min[0] + frame.max[0]) / 2,
    direction[1] > 0 ? frame.max[1] : direction[1] < 0 ? frame.min[1] : (frame.min[1] + frame.max[1]) / 2,
    direction[2] > 0 ? frame.max[2] : direction[2] < 0 ? frame.min[2] : (frame.min[2] + frame.max[2]) / 2
  ];
}

function cornerTargetPoint(frame: MathAnimateEdgeFrame, direction: Vec3, buff: number): Vec3 {
  return [
    direction[0] > 0 ? frame.max[0] - buff : direction[0] < 0 ? frame.min[0] + buff : (frame.min[0] + frame.max[0]) / 2,
    direction[1] > 0 ? frame.max[1] - buff : direction[1] < 0 ? frame.min[1] + buff : (frame.min[1] + frame.max[1]) / 2,
    direction[2] > 0 ? frame.max[2] - buff : direction[2] < 0 ? frame.min[2] + buff : (frame.min[2] + frame.max[2]) / 2
  ];
}

function boundingBoxSize(boundingBox: RuntimeBoundingBox | undefined): Vec3 {
  if (boundingBox?.kind !== "finite") return [0, 0, 0];

  return [
    Math.max(0, finite(boundingBox.max[0] - boundingBox.min[0], 0)),
    Math.max(0, finite(boundingBox.max[1] - boundingBox.min[1], 0)),
    Math.max(0, finite(boundingBox.max[2] - boundingBox.min[2], 0))
  ];
}

function dimensionScale(targetSize: number, currentSize: number) {
  if (!Number.isFinite(targetSize) || currentSize <= 0) return 1;
  return Math.max(0, targetSize) / currentSize;
}

function defaultUniforms() {
  return {
    clippingPlanes: [],
    fixedInFrame: false,
    opacity: 1,
    shadeIn3D: false
  };
}

function graphEdgeFrame(graph: MathObjectGraph): MathAnimateEdgeFrame {
  const finiteBoxes = Object.values(graph.byId)
    .map((node) => node.boundingBox)
    .filter((box) => box.kind === "finite");

  if (finiteBoxes.length === 0) return { max: [1, 1, 1], min: [-1, -1, -1] };

  const min: Vec3 = [...finiteBoxes[0].min];
  const max: Vec3 = [...finiteBoxes[0].max];

  finiteBoxes.forEach((box) => {
    min[0] = Math.min(min[0], box.min[0]);
    min[1] = Math.min(min[1], box.min[1]);
    min[2] = Math.min(min[2], box.min[2]);
    max[0] = Math.max(max[0], box.max[0]);
    max[1] = Math.max(max[1], box.max[1]);
    max[2] = Math.max(max[2], box.max[2]);
  });

  return { max, min };
}

function applyOperation(
  node: MathMobjectStateNode,
  operation: MathAnimateOperation,
  rootBox: RuntimeBoundingBox | undefined,
  targetBox?: RuntimeBoundingBox
): MathMobjectStateNode {
  if (operation.type === "shift") {
    const vector = cleanVec3(operation.vector);
    return {
      ...node,
      renderState: mapRenderState(node.renderState, (point) => addVec3(point, vector))
    };
  }

  if (operation.type === "scale") {
    const aboutPoint = cleanVec3(operation.aboutPoint ?? defaultScaleAnchor(rootBox));
    return {
      ...node,
      renderState: mapRenderState(node.renderState, (point) => scaleVec3(point, operation.factor, aboutPoint))
    };
  }

  if (operation.type === "setOpacity") {
    return {
      ...node,
      uniforms: {
        ...(node.uniforms ?? defaultUniforms()),
        opacity: operation.opacity
      }
    };
  }

  if (operation.type === "setStroke") {
    return {
      ...node,
      renderState: stylePatchRenderState(node.renderState, {
        strokeOpacity: operation.strokeOpacity,
        strokeRole: operation.strokeRole,
        strokeWidth: operation.strokeWidth
      })
    };
  }

  if (operation.type === "setFill") {
    return {
      ...node,
      renderState: stylePatchRenderState(node.renderState, {
        fillOpacity: operation.fillOpacity,
        fillRole: operation.fillRole
      })
    };
  }

  if (operation.type === "setStyle") {
    return {
      ...node,
      renderState: stylePatchRenderState(node.renderState, operation)
    };
  }

  if (operation.type === "center") {
    const center = defaultTransformAnchor(rootBox);
    const vector = subtractVec3([0, 0, 0], center);

    return {
      ...node,
      renderState: mapRenderState(node.renderState, (point) => addVec3(point, vector))
    };
  }

  if (operation.type === "moveTo") {
    const targetPoint = cleanVec3(operation.point);
    const center = defaultTransformAnchor(rootBox);
    const vector = subtractVec3(targetPoint, center);

    return {
      ...node,
      renderState: mapRenderState(node.renderState, (point) => addVec3(point, vector))
    };
  }

  if (operation.type === "alignTo") {
    const direction = cleanVec3(operation.direction ?? [1, 0, 0], [1, 0, 0]);
    const mask = axisMaskFromDirection(direction);
    const sourcePoint = criticalPoint(rootBox, direction);
    const targetPoint = criticalPoint(targetBox, direction);
    const rawVector = subtractVec3(targetPoint, sourcePoint);
    const vector: Vec3 = [rawVector[0] * mask[0], rawVector[1] * mask[1], rawVector[2] * mask[2]];

    return {
      ...node,
      renderState: mapRenderState(node.renderState, (point) => addVec3(point, vector))
    };
  }

  if (operation.type === "matchWidth") {
    const aboutPoint = cleanVec3(operation.aboutPoint ?? defaultTransformAnchor(rootBox));
    const size = boundingBoxSize(rootBox);
    const targetSize = boundingBoxSize(targetBox);
    const factor = dimensionScale(targetSize[0], size[0]);
    const scaleFactor: Vec3 = operation.stretch ? [factor, 1, 1] : [factor, factor, factor];

    return {
      ...node,
      renderState: mapRenderState(node.renderState, (point) => scaleVec3ByAxis(point, scaleFactor, aboutPoint))
    };
  }

  if (operation.type === "matchHeight") {
    const aboutPoint = cleanVec3(operation.aboutPoint ?? defaultTransformAnchor(rootBox));
    const size = boundingBoxSize(rootBox);
    const targetSize = boundingBoxSize(targetBox);
    const factor = dimensionScale(targetSize[1], size[1]);
    const scaleFactor: Vec3 = operation.stretch ? [1, factor, 1] : [factor, factor, factor];

    return {
      ...node,
      renderState: mapRenderState(node.renderState, (point) => scaleVec3ByAxis(point, scaleFactor, aboutPoint))
    };
  }

  if (operation.type === "matchDepth") {
    const aboutPoint = cleanVec3(operation.aboutPoint ?? defaultTransformAnchor(rootBox));
    const size = boundingBoxSize(rootBox);
    const targetSize = boundingBoxSize(targetBox);
    const factor = dimensionScale(targetSize[2], size[2]);
    const scaleFactor: Vec3 = operation.stretch ? [1, 1, factor] : [factor, factor, factor];

    return {
      ...node,
      renderState: mapRenderState(node.renderState, (point) => scaleVec3ByAxis(point, scaleFactor, aboutPoint))
    };
  }

  if (operation.type === "matchX") {
    const sourceCenter = defaultTransformAnchor(rootBox);
    const targetCenter = defaultTransformAnchor(targetBox);
    const vector: Vec3 = [targetCenter[0] - sourceCenter[0], 0, 0];

    return {
      ...node,
      renderState: mapRenderState(node.renderState, (point) => addVec3(point, vector))
    };
  }

  if (operation.type === "matchY") {
    const sourceCenter = defaultTransformAnchor(rootBox);
    const targetCenter = defaultTransformAnchor(targetBox);
    const vector: Vec3 = [0, targetCenter[1] - sourceCenter[1], 0];

    return {
      ...node,
      renderState: mapRenderState(node.renderState, (point) => addVec3(point, vector))
    };
  }

  if (operation.type === "matchZ") {
    const sourceCenter = defaultTransformAnchor(rootBox);
    const targetCenter = defaultTransformAnchor(targetBox);
    const vector: Vec3 = [0, 0, targetCenter[2] - sourceCenter[2]];

    return {
      ...node,
      renderState: mapRenderState(node.renderState, (point) => addVec3(point, vector))
    };
  }

  if (operation.type === "setX") {
    const sourceCenter = defaultTransformAnchor(rootBox);
    const vector: Vec3 = [finite(operation.coordinate, sourceCenter[0]) - sourceCenter[0], 0, 0];

    return {
      ...node,
      renderState: mapRenderState(node.renderState, (point) => addVec3(point, vector))
    };
  }

  if (operation.type === "setY") {
    const sourceCenter = defaultTransformAnchor(rootBox);
    const vector: Vec3 = [0, finite(operation.coordinate, sourceCenter[1]) - sourceCenter[1], 0];

    return {
      ...node,
      renderState: mapRenderState(node.renderState, (point) => addVec3(point, vector))
    };
  }

  if (operation.type === "setZ") {
    const sourceCenter = defaultTransformAnchor(rootBox);
    const vector: Vec3 = [0, 0, finite(operation.coordinate, sourceCenter[2]) - sourceCenter[2]];

    return {
      ...node,
      renderState: mapRenderState(node.renderState, (point) => addVec3(point, vector))
    };
  }

  if (operation.type === "toEdge") {
    const direction = normalizeDirection(operation.direction);
    const mask = axisMaskFromDirection(operation.direction);
    const buff = Math.max(0, finite(operation.buff ?? 0.5, 0.5));
    const sourcePoint = criticalPoint(rootBox, direction);
    const framePoint = edgeCriticalPoint(operation.frame, direction);
    const targetPoint = subtractVec3(framePoint, multiplyVec3(direction, buff));
    const rawVector = subtractVec3(targetPoint, sourcePoint);
    const vector: Vec3 = [rawVector[0] * mask[0], rawVector[1] * mask[1], rawVector[2] * mask[2]];

    return {
      ...node,
      renderState: mapRenderState(node.renderState, (point) => addVec3(point, vector))
    };
  }

  if (operation.type === "toCorner") {
    const direction = cleanVec3(operation.direction, [1, 1, 0]);
    const mask = axisMaskFromDirection(direction);
    const buff = Math.max(0, finite(operation.buff ?? 0.5, 0.5));
    const sourcePoint = criticalPoint(rootBox, direction);
    const targetPoint = cornerTargetPoint(operation.frame, direction, buff);
    const rawVector = subtractVec3(targetPoint, sourcePoint);
    const vector: Vec3 = [rawVector[0] * mask[0], rawVector[1] * mask[1], rawVector[2] * mask[2]];

    return {
      ...node,
      renderState: mapRenderState(node.renderState, (point) => addVec3(point, vector))
    };
  }

  if (operation.type === "nextTo") {
    const direction = normalizeDirection(operation.direction);
    const buff = Math.max(0, finite(operation.buff ?? 0.25, 0.25));
    const sourcePoint = criticalPoint(rootBox, oppositeDirection(direction));
    const targetPoint = criticalPoint(targetBox, direction);
    const vector = addVec3(subtractVec3(targetPoint, sourcePoint), multiplyVec3(direction, buff));

    return {
      ...node,
      renderState: mapRenderState(node.renderState, (point) => addVec3(point, vector))
    };
  }

  if (operation.type === "rotate") {
    const aboutPoint = cleanVec3(operation.aboutPoint ?? defaultTransformAnchor(rootBox));
    const axis = operation.axis ?? "z";
    return {
      ...node,
      renderState: mapRenderState(node.renderState, (point) => rotateVec3(point, operation.angleRadians, axis, aboutPoint))
    };
  }

  if (operation.type === "setWidth") {
    const aboutPoint = cleanVec3(operation.aboutPoint ?? defaultTransformAnchor(rootBox));
    const size = boundingBoxSize(rootBox);
    const factor = dimensionScale(operation.width, size[0]);
    const scaleFactor: Vec3 = operation.stretch ? [factor, 1, 1] : [factor, factor, factor];

    return {
      ...node,
      renderState: mapRenderState(node.renderState, (point) => scaleVec3ByAxis(point, scaleFactor, aboutPoint))
    };
  }

  if (operation.type === "setHeight") {
    const aboutPoint = cleanVec3(operation.aboutPoint ?? defaultTransformAnchor(rootBox));
    const size = boundingBoxSize(rootBox);
    const factor = dimensionScale(operation.height, size[1]);
    const scaleFactor: Vec3 = operation.stretch ? [1, factor, 1] : [factor, factor, factor];

    return {
      ...node,
      renderState: mapRenderState(node.renderState, (point) => scaleVec3ByAxis(point, scaleFactor, aboutPoint))
    };
  }

  if (operation.type === "setDepth") {
    const aboutPoint = cleanVec3(operation.aboutPoint ?? defaultTransformAnchor(rootBox));
    const size = boundingBoxSize(rootBox);
    const factor = dimensionScale(operation.depth, size[2]);
    const scaleFactor: Vec3 = operation.stretch ? [1, 1, factor] : [factor, factor, factor];

    return {
      ...node,
      renderState: mapRenderState(node.renderState, (point) => scaleVec3ByAxis(point, scaleFactor, aboutPoint))
    };
  }

  return {
    ...node,
    colorRole: operation.colorRole
  };
}

function changedFieldsForOperations(operations: MathAnimateOperation[]) {
  const fields = new Set<string>();

  operations.forEach((operation) => {
    if (operation.type === "setColorRole") fields.add("colorRole");
    if (operation.type === "setOpacity") fields.add("uniforms");
    if (
      operation.type === "shift" ||
      operation.type === "scale" ||
      operation.type === "alignTo" ||
      operation.type === "center" ||
      operation.type === "matchDepth" ||
      operation.type === "matchHeight" ||
      operation.type === "matchWidth" ||
      operation.type === "matchX" ||
      operation.type === "matchY" ||
      operation.type === "matchZ" ||
      operation.type === "moveTo" ||
      operation.type === "nextTo" ||
      operation.type === "rotate" ||
      operation.type === "setDepth" ||
      operation.type === "setFill" ||
      operation.type === "setWidth" ||
      operation.type === "setHeight" ||
      operation.type === "setStroke" ||
      operation.type === "setStyle" ||
      operation.type === "setX" ||
      operation.type === "setY" ||
      operation.type === "setZ" ||
      operation.type === "toCorner" ||
      operation.type === "toEdge"
    ) {
      fields.add("renderState");
    }
  });

  return [...fields].sort();
}

function operationCopy(operations: MathAnimateOperation[]) {
  return cloneJson(operations);
}

class MathAnimateBuilderImpl implements MathAnimateBuilder {
  private readonly graph: MathObjectGraph;
  private readonly objectId: string;
  private readonly operations: MathAnimateOperation[];

  constructor(graph: MathObjectGraph, objectId: string, operations: MathAnimateOperation[] = []) {
    this.graph = graph;
    this.objectId = objectId;
    this.operations = operations;
  }

  build(options: MathAnimateBuildOptions): MathAnimatePlan {
    const snapshot = saveMobjectState(this.graph, this.objectId);

    if (!snapshot.nodes[this.objectId]) {
      throw new Error(`Unknown MAIS Manim object: ${this.objectId}`);
    }

    const workingNodes = cloneJson(snapshot.nodes);

    this.operations.forEach((operation) => {
      const rootBox = familyBoundingBoxForStateNodes(workingNodes, this.objectId);
      const targetBox =
        operation.type === "alignTo" ||
        operation.type === "matchDepth" ||
        operation.type === "matchHeight" ||
        operation.type === "matchWidth" ||
        operation.type === "matchX" ||
        operation.type === "matchY" ||
        operation.type === "matchZ" ||
        operation.type === "nextTo"
          ? familyBoundingBoxForTarget(this.graph, workingNodes, operation.targetObjectId)
          : undefined;

      snapshot.familyIds.forEach((nodeId) => {
        const node = workingNodes[nodeId];
        if (!node) return;
        workingNodes[nodeId] = applyOperation(node, operation, rootBox, targetBox);
      });
    });

    const nodeOverrides = Object.fromEntries(
      snapshot.familyIds
        .map((nodeId) => workingNodes[nodeId])
        .filter((node): node is MathMobjectStateNode => Boolean(node))
        .map((node) => [
          node.id,
          {
            childIds: node.childIds,
            colorRole: node.colorRole,
            conceptId: node.conceptId,
            parentId: node.parentId,
            renderState: node.renderState,
            uniforms: node.uniforms
          }
        ])
    );
    const targetObjectId = options.targetId ?? `${this.objectId}:animate-target`;
    const target = generateMobjectTarget(snapshot, {
      nodeOverrides,
      targetId: targetObjectId
    });
    const step: Extract<AnimationStep, { type: "transformObject" }> = {
      duration: finite(options.duration, 0),
      objectId: this.objectId,
      targetObjectId,
      type: "transformObject"
    };

    if (options.lagRatio !== undefined) {
      step.lagRatio = finite(options.lagRatio, 0);
    }

    if (options.path !== undefined) {
      step.path = cloneJson(options.path);
    }

    return {
      changedFields: changedFieldsForOperations(this.operations),
      changedNodeIds: this.operations.length > 0 ? cloneJson(snapshot.familyIds) : [],
      id: options.id ?? targetObjectId,
      objectId: this.objectId,
      operations: operationCopy(this.operations),
      sourceContract: ANIMATION_BUILDER_SOURCE_CONTRACT,
      step,
      target,
      targetObjectId
    };
  }

  alignTo(targetObjectId: string, options: { direction?: Vec3 } = {}): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      {
        direction: options.direction ? cleanVec3(options.direction, [1, 0, 0]) : undefined,
        targetObjectId,
        type: "alignTo"
      }
    ]);
  }

  center(): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      { type: "center" }
    ]);
  }

  matchDepth(targetObjectId: string, options: { aboutPoint?: Vec3; stretch?: boolean } = {}): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      {
        aboutPoint: options.aboutPoint ? cleanVec3(options.aboutPoint) : undefined,
        stretch: options.stretch,
        targetObjectId,
        type: "matchDepth"
      }
    ]);
  }

  matchHeight(targetObjectId: string, options: { aboutPoint?: Vec3; stretch?: boolean } = {}): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      {
        aboutPoint: options.aboutPoint ? cleanVec3(options.aboutPoint) : undefined,
        stretch: options.stretch,
        targetObjectId,
        type: "matchHeight"
      }
    ]);
  }

  matchWidth(targetObjectId: string, options: { aboutPoint?: Vec3; stretch?: boolean } = {}): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      {
        aboutPoint: options.aboutPoint ? cleanVec3(options.aboutPoint) : undefined,
        stretch: options.stretch,
        targetObjectId,
        type: "matchWidth"
      }
    ]);
  }

  matchX(targetObjectId: string): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      { targetObjectId, type: "matchX" }
    ]);
  }

  matchY(targetObjectId: string): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      { targetObjectId, type: "matchY" }
    ]);
  }

  matchZ(targetObjectId: string): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      { targetObjectId, type: "matchZ" }
    ]);
  }

  moveTo(point: Vec3): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      { point: cleanVec3(point), type: "moveTo" }
    ]);
  }

  nextTo(targetObjectId: string, options: { buff?: number; direction?: Vec3 } = {}): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      {
        buff: options.buff === undefined ? undefined : finite(options.buff, 0.25),
        direction: options.direction ? cleanVec3(options.direction, [1, 0, 0]) : undefined,
        targetObjectId,
        type: "nextTo"
      }
    ]);
  }

  rotate(angleRadians: number, options: { aboutPoint?: Vec3; axis?: "x" | "y" | "z" } = {}): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      {
        aboutPoint: options.aboutPoint ? cleanVec3(options.aboutPoint) : undefined,
        angleRadians: finite(angleRadians, 0),
        axis: options.axis ?? "z",
        type: "rotate"
      }
    ]);
  }

  scale(factor: number, options: { aboutPoint?: Vec3 } = {}): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      { aboutPoint: options.aboutPoint, factor, type: "scale" }
    ]);
  }

  setColorRole(colorRole: string): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      { colorRole, type: "setColorRole" }
    ]);
  }

  setDepth(depth: number, options: { aboutPoint?: Vec3; stretch?: boolean } = {}): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      {
        aboutPoint: options.aboutPoint ? cleanVec3(options.aboutPoint) : undefined,
        depth: finite(depth, 0),
        stretch: options.stretch,
        type: "setDepth"
      }
    ]);
  }

  setFill(style: { fillOpacity?: number; fillRole?: string }): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      {
        fillOpacity: style.fillOpacity === undefined ? undefined : clamp01(style.fillOpacity),
        fillRole: style.fillRole,
        type: "setFill"
      }
    ]);
  }

  setHeight(height: number, options: { aboutPoint?: Vec3; stretch?: boolean } = {}): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      {
        aboutPoint: options.aboutPoint ? cleanVec3(options.aboutPoint) : undefined,
        height: finite(height, 0),
        stretch: options.stretch,
        type: "setHeight"
      }
    ]);
  }

  setOpacity(opacity: number): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      { opacity: clamp01(opacity), type: "setOpacity" }
    ]);
  }

  setStroke(style: { strokeOpacity?: number; strokeRole?: string; strokeWidth?: number }): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      {
        strokeOpacity: style.strokeOpacity === undefined ? undefined : clamp01(style.strokeOpacity),
        strokeRole: style.strokeRole,
        strokeWidth: style.strokeWidth === undefined ? undefined : Math.max(0, finite(style.strokeWidth, 0)),
        type: "setStroke"
      }
    ]);
  }

  setStyle(style: VMobjectStyleInput): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      {
        ...cleanVMobjectStylePatch(style),
        type: "setStyle"
      }
    ]);
  }

  setWidth(width: number, options: { aboutPoint?: Vec3; stretch?: boolean } = {}): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      {
        aboutPoint: options.aboutPoint ? cleanVec3(options.aboutPoint) : undefined,
        stretch: options.stretch,
        type: "setWidth",
        width: finite(width, 0)
      }
    ]);
  }

  setX(coordinate: number): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      { coordinate: finite(coordinate, 0), type: "setX" }
    ]);
  }

  setY(coordinate: number): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      { coordinate: finite(coordinate, 0), type: "setY" }
    ]);
  }

  setZ(coordinate: number): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      { coordinate: finite(coordinate, 0), type: "setZ" }
    ]);
  }

  shift(vector: Vec3): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      { type: "shift", vector: cleanVec3(vector) }
    ]);
  }

  toEdge(direction: Vec3, options: { buff?: number; frame?: MathAnimateEdgeFrame } = {}): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      {
        buff: options.buff === undefined ? undefined : finite(options.buff, 0.5),
        direction: cleanVec3(direction, [1, 0, 0]),
        frame: cleanEdgeFrame(options.frame ?? graphEdgeFrame(this.graph)),
        type: "toEdge"
      }
    ]);
  }

  toCorner(direction: Vec3, options: { buff?: number; frame?: MathAnimateEdgeFrame } = {}): MathAnimateBuilder {
    return new MathAnimateBuilderImpl(this.graph, this.objectId, [
      ...this.operations,
      {
        buff: options.buff === undefined ? undefined : finite(options.buff, 0.5),
        direction: cleanVec3(direction, [1, 1, 0]),
        frame: cleanEdgeFrame(options.frame ?? graphEdgeFrame(this.graph)),
        type: "toCorner"
      }
    ]);
  }
}

export function createMathAnimateBuilder(graph: MathObjectGraph, objectId: string): MathAnimateBuilder {
  if (!graph.byId[objectId]) {
    throw new Error(`Unknown MAIS Manim object: ${objectId}`);
  }

  return new MathAnimateBuilderImpl(graph, objectId);
}

export function summarizeMathAnimatePlan(plan: MathAnimatePlan): MathAnimatePlanSummary {
  return {
    changedFieldCount: plan.changedFields.length,
    changedNodeCount: plan.changedNodeIds.length,
    duration: plan.step.duration,
    objectId: plan.objectId,
    operationCount: plan.operations.length,
    targetObjectId: plan.targetObjectId
  };
}

function buildMathAnimateBuilderSummary(catalog: Omit<MathAnimateBuilderCatalog, "summary" | "version">) {
  return [
    `animateBuilder:plans=${catalog.planCount}`,
    `first=${catalog.firstPlanId}`,
    `objects=${catalog.objectIds.join(",") || "none"}`,
    `targets=${catalog.targetObjectIds.join(",") || "none"}`,
    `ops=${catalog.operationCount}`,
    `fields=${catalog.changedFieldCount}`,
    `nodes=${catalog.changedNodeCount}`,
    `duration=${catalog.totalDuration.toFixed(3)}`,
    `lagged=${catalog.laggedPlanCount}`,
    `paths=${catalog.pathPlanCount}`
  ].join(":");
}

// Manim source contract:
// - Mobject.animate collects method-like calls into an AnimationBuilder.
// - build() materializes a target state, operation list, timing, lag ratio, and
//   optional path function without mutating the source mobject graph.
// - Browser QA needs this manifest so Scene.play builder preparation is
//   inspectable separately from the lower-level Transform interpolation.
export function buildMathAnimateBuilderCatalog(plans: MathAnimatePlan[]): MathAnimateBuilderCatalog {
  const baseCatalog = {
    changedFieldCount: uniqueSorted(plans.flatMap((plan) => plan.changedFields)).length,
    changedNodeCount: uniqueSorted(plans.flatMap((plan) => plan.changedNodeIds)).length,
    changedNodeIds: uniqueSorted(plans.flatMap((plan) => plan.changedNodeIds)),
    firstPlanId: plans[0]?.id ?? "none",
    laggedPlanCount: plans.filter((plan) => (plan.step.lagRatio ?? 0) > 0).length,
    objectIds: uniqueSorted(plans.map((plan) => plan.objectId)),
    operationCount: plans.reduce((sum, plan) => sum + plan.operations.length, 0),
    operationTypes: uniqueSorted(plans.flatMap((plan) => plan.operations.map((operation) => operation.type))),
    pathPlanCount: plans.filter((plan) => plan.step.path !== undefined).length,
    planCount: plans.length,
    sourceContract: ANIMATION_BUILDER_SOURCE_CONTRACT,
    targetObjectIds: uniqueSorted(plans.map((plan) => plan.targetObjectId)),
    totalDuration: plans.reduce((sum, plan) => sum + finite(plan.step.duration, 0), 0)
  };

  return {
    ...baseCatalog,
    summary: buildMathAnimateBuilderSummary(baseCatalog),
    version: "mais-manim-animate-builder/v1"
  };
}

export function mathAnimateBuilderCatalogDataAttributes(catalog: MathAnimateBuilderCatalog): Record<string, string> {
  return {
    "data-viz-manim-animate-builder-changed-field-count": String(catalog.changedFieldCount),
    "data-viz-manim-animate-builder-changed-node-count": String(catalog.changedNodeCount),
    "data-viz-manim-animate-builder-changed-node-ids": catalog.changedNodeIds.join(",") || "none",
    "data-viz-manim-animate-builder-first-plan-id": catalog.firstPlanId,
    "data-viz-manim-animate-builder-lagged-count": String(catalog.laggedPlanCount),
    "data-viz-manim-animate-builder-object-ids": catalog.objectIds.join(",") || "none",
    "data-viz-manim-animate-builder-operation-count": String(catalog.operationCount),
    "data-viz-manim-animate-builder-operation-types": catalog.operationTypes.join(",") || "none",
    "data-viz-manim-animate-builder-path-count": String(catalog.pathPlanCount),
    "data-viz-manim-animate-builder-plan-count": String(catalog.planCount),
    "data-viz-manim-animate-builder-source-contract": catalog.sourceContract,
    "data-viz-manim-animate-builder-summary": catalog.summary,
    "data-viz-manim-animate-builder-target-ids": catalog.targetObjectIds.join(",") || "none",
    "data-viz-manim-animate-builder-total-duration": catalog.totalDuration.toFixed(3)
  };
}

export function serializeMathAnimateBuilderCatalog(catalog: MathAnimateBuilderCatalog) {
  return stableSerialize(catalog);
}
