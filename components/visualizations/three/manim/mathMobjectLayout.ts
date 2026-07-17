import { effectiveMobjectFamilyBoundingBox } from "./mathMobjectBoundingBox";
import { mobjectCriticalPoint } from "./mathMobjectAnchors";
import type { MathObjectGraph, RuntimeBoundingBox } from "./mathSceneRuntimeState";
import type { Vec3 } from "./mathSceneTypes";

export const MOBJECT_LAYOUT_SOURCE_CONTRACT =
  "Mobject.arrange / Mobject.align_to / Mobject.next_to / Mobject.to_edge / Mobject.to_corner: critical-point layout from get_all_points family bounding boxes, arrange spacing, edge alignment, next-to gaps, frame targets, and deterministic deltas" as const;

export type MathMobjectArrangeLayoutOptions = {
  buff?: number;
  center?: boolean;
  direction?: Vec3;
};

export type MathMobjectAlignToLayoutOptions = {
  direction?: Vec3;
  objectId: string;
  targetObjectId?: string;
  targetPoint?: Vec3;
};

export type MathMobjectNextToLayoutOptions = {
  buff?: number;
  direction?: Vec3;
  objectId: string;
  targetObjectId: string;
};

export type MathMobjectEdgeFrame = {
  max: Vec3;
  min: Vec3;
};

export type MathMobjectToEdgeLayoutOptions = {
  buff?: number;
  direction?: Vec3;
  frame?: MathMobjectEdgeFrame;
  objectId: string;
};

export type MathMobjectToCornerLayoutOptions = {
  buff?: number;
  direction?: Vec3;
  frame?: MathMobjectEdgeFrame;
  objectId: string;
};

export type MathMobjectLayoutRow = {
  delta: Vec3;
  objectId: string;
  sourceCenter: Vec3;
  sourceMax: Vec3;
  sourceMin: Vec3;
  targetCenter: Vec3;
  targetMax: Vec3;
  targetMin: Vec3;
};

type MathMobjectLayoutBasePlan = {
  buff: number;
  center: boolean;
  centeringDelta: Vec3;
  direction: Vec3;
  groupBoundingBox: RuntimeBoundingBox;
  groupCenterBeforeCentering: Vec3;
  missingObjectCount: number;
  missingObjectIds: string[];
  objectCount: number;
  objectIds: string[];
  rows: MathMobjectLayoutRow[];
  signature: string;
  sourceContract: typeof MOBJECT_LAYOUT_SOURCE_CONTRACT;
};

export type MathMobjectArrangeLayoutPlan = MathMobjectLayoutBasePlan & {
  layoutKind: "arrange";
};

export type MathMobjectAlignToLayoutPlan = MathMobjectLayoutBasePlan & {
  alignTargetId: string;
  alignedAxes: string;
  layoutKind: "alignTo";
};

export type MathMobjectNextToLayoutPlan = MathMobjectLayoutBasePlan & {
  gap: number;
  layoutKind: "nextTo";
  nextTargetId: string;
};

type MathMobjectFrameLayoutPlan = MathMobjectLayoutBasePlan & {
  frameAnchor: "corner" | "edge";
  frameMax: Vec3;
  frameMin: Vec3;
  frameTargetPoint: Vec3;
};

export type MathMobjectToEdgeLayoutPlan = MathMobjectFrameLayoutPlan & {
  frameAnchor: "edge";
  layoutKind: "toEdge";
};

export type MathMobjectToCornerLayoutPlan = MathMobjectFrameLayoutPlan & {
  frameAnchor: "corner";
  layoutKind: "toCorner";
};

export type MathMobjectLayoutPlan =
  | MathMobjectArrangeLayoutPlan
  | MathMobjectAlignToLayoutPlan
  | MathMobjectNextToLayoutPlan
  | MathMobjectToEdgeLayoutPlan
  | MathMobjectToCornerLayoutPlan;

function finite(value: number, fallback = 0) {
  const next = Number.isFinite(value) ? value : fallback;
  return Object.is(next, -0) ? 0 : next;
}

function safeVec3(value: Vec3 | undefined, fallback: Vec3 = [0, 0, 0]): Vec3 {
  if (!value) return [...fallback];
  return [finite(value[0], fallback[0]), finite(value[1], fallback[1]), finite(value[2], fallback[2])];
}

function addVec3(left: Vec3, right: Vec3): Vec3 {
  return [finite(left[0] + right[0]), finite(left[1] + right[1]), finite(left[2] + right[2])];
}

function subtractVec3(left: Vec3, right: Vec3): Vec3 {
  return [finite(left[0] - right[0]), finite(left[1] - right[1]), finite(left[2] - right[2])];
}

function multiplyVec3(vector: Vec3, factor: number): Vec3 {
  return [finite(vector[0] * factor), finite(vector[1] * factor), finite(vector[2] * factor)];
}

function oppositeDirection(direction: Vec3): Vec3 {
  return [-direction[0], -direction[1], -direction[2]];
}

function normalizeDirection(direction: Vec3 | undefined): Vec3 {
  const safeDirection = safeVec3(direction, [1, 0, 0]);
  const length = Math.hypot(safeDirection[0], safeDirection[1], safeDirection[2]);

  if (!Number.isFinite(length) || length <= 0) return [1, 0, 0];

  return [
    safeDirection[0] / length,
    safeDirection[1] / length,
    safeDirection[2] / length
  ];
}

function normalizeAlignmentDirection(direction: Vec3 | undefined): Vec3 {
  const safeDirection = safeVec3(direction, [1, 0, 0]);
  const aligned: Vec3 = [
    safeDirection[0] === 0 ? 0 : Math.sign(safeDirection[0]),
    safeDirection[1] === 0 ? 0 : Math.sign(safeDirection[1]),
    safeDirection[2] === 0 ? 0 : Math.sign(safeDirection[2])
  ];

  return aligned.some((value) => value !== 0) ? aligned : [1, 0, 0];
}

function finiteBox(box: RuntimeBoundingBox): { center: Vec3; max: Vec3; min: Vec3 } {
  if (box.kind === "empty") return { center: [0, 0, 0], max: [0, 0, 0], min: [0, 0, 0] };

  const center = safeVec3(box.center);
  const min = safeVec3(box.min, center);
  const max = safeVec3(box.max, center);

  return { center, max, min };
}

function familyBox(graph: MathObjectGraph, objectId: string) {
  return finiteBox(effectiveMobjectFamilyBoundingBox(graph, graph.byId[objectId]));
}

function shiftBox(box: { center: Vec3; max: Vec3; min: Vec3 }, delta: Vec3) {
  return {
    center: addVec3(box.center, delta),
    max: addVec3(box.max, delta),
    min: addVec3(box.min, delta)
  };
}

function unionBoxes(boxes: Array<{ max: Vec3; min: Vec3 }>): RuntimeBoundingBox {
  if (boxes.length === 0) return { kind: "empty" };

  const min: Vec3 = [...boxes[0].min];
  const max: Vec3 = [...boxes[0].max];

  boxes.forEach((box) => {
    min[0] = Math.min(min[0], box.min[0]);
    min[1] = Math.min(min[1], box.min[1]);
    min[2] = Math.min(min[2], box.min[2]);
    max[0] = Math.max(max[0], box.max[0]);
    max[1] = Math.max(max[1], box.max[1]);
    max[2] = Math.max(max[2], box.max[2]);
  });

  return {
    center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
    kind: "finite",
    max,
    min
  };
}

function boxCenter(box: RuntimeBoundingBox): Vec3 {
  return box.kind === "finite" ? safeVec3(box.center) : [0, 0, 0];
}

function boxSize(box: RuntimeBoundingBox): Vec3 {
  if (box.kind !== "finite") return [0, 0, 0];
  return [
    finite(box.max[0] - box.min[0]),
    finite(box.max[1] - box.min[1]),
    finite(box.max[2] - box.min[2])
  ];
}

function formatNumber(value: number) {
  return finite(value).toFixed(3);
}

function formatVec3(point: Vec3) {
  return point.map(formatNumber).join(",");
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function hashStableJson(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `mobject-layout-${hash.toString(16).padStart(8, "0")}`;
}

function escapedJson(value: string) {
  return value.replace(/</g, "\\u003c");
}

function alignedAxesFor(direction: Vec3) {
  const axes = [
    direction[0] === 0 ? "" : "x",
    direction[1] === 0 ? "" : "y",
    direction[2] === 0 ? "" : "z"
  ].filter(Boolean);

  return axes.join(",") || "x";
}

function axisDelta(sourcePoint: Vec3, targetPoint: Vec3, direction: Vec3): Vec3 {
  return [
    direction[0] === 0 ? 0 : finite(targetPoint[0] - sourcePoint[0]),
    direction[1] === 0 ? 0 : finite(targetPoint[1] - sourcePoint[1]),
    direction[2] === 0 ? 0 : finite(targetPoint[2] - sourcePoint[2])
  ];
}

function axisMaskFromDirection(direction: Vec3): Vec3 {
  return [
    direction[0] === 0 ? 0 : 1,
    direction[1] === 0 ? 0 : 1,
    direction[2] === 0 ? 0 : 1
  ];
}

function cleanEdgeFrame(frame: MathMobjectEdgeFrame): MathMobjectEdgeFrame {
  const cleanMin = safeVec3(frame.min, [-1, -1, -1]);
  const cleanMax = safeVec3(frame.max, [1, 1, 1]);

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

function graphEdgeFrame(graph: MathObjectGraph): MathMobjectEdgeFrame {
  const finiteBoxes = Object.values(graph.byId)
    .map((node) => familyBox(graph, node.id))
    .filter((box) => box.min.every(Number.isFinite) && box.max.every(Number.isFinite));

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

function edgeCriticalPoint(frame: MathMobjectEdgeFrame, direction: Vec3): Vec3 {
  return [
    direction[0] > 0 ? frame.max[0] : direction[0] < 0 ? frame.min[0] : (frame.min[0] + frame.max[0]) / 2,
    direction[1] > 0 ? frame.max[1] : direction[1] < 0 ? frame.min[1] : (frame.min[1] + frame.max[1]) / 2,
    direction[2] > 0 ? frame.max[2] : direction[2] < 0 ? frame.min[2] : (frame.min[2] + frame.max[2]) / 2
  ];
}

function cornerTargetPoint(frame: MathMobjectEdgeFrame, direction: Vec3, buff: number): Vec3 {
  return [
    direction[0] > 0 ? frame.max[0] - buff : direction[0] < 0 ? frame.min[0] + buff : (frame.min[0] + frame.max[0]) / 2,
    direction[1] > 0 ? frame.max[1] - buff : direction[1] < 0 ? frame.min[1] + buff : (frame.min[1] + frame.max[1]) / 2,
    direction[2] > 0 ? frame.max[2] - buff : direction[2] < 0 ? frame.min[2] + buff : (frame.min[2] + frame.max[2]) / 2
  ];
}

function frameBounds(frame: MathMobjectEdgeFrame) {
  return `${formatVec3(frame.min)}..${formatVec3(frame.max)}`;
}

// Manim source contract: Mobject.arrange repeatedly places each submobject
// next_to the previous one using bounding-box critical point alignment, then
// optionally centers the whole group.
export function buildMobjectArrangeLayoutPlan(
  graph: MathObjectGraph,
  objectIds: string[],
  options: MathMobjectArrangeLayoutOptions = {}
): MathMobjectLayoutPlan {
  const direction = normalizeDirection(options.direction);
  const buff = Math.max(0, finite(options.buff ?? 0.25, 0.25));
  const center = options.center ?? true;
  const missingObjectIds = objectIds.filter((objectId) => !graph.byId[objectId]);
  const sourceRows = objectIds
    .map((objectId) => graph.byId[objectId])
    .filter(Boolean)
    .map((node) => ({
      objectId: node.id,
      sourceBox: familyBox(graph, node.id)
    }));
  const arrangedRows: MathMobjectLayoutRow[] = [];

  sourceRows.forEach((row, index) => {
    const previous = arrangedRows.at(-1);
    const sourcePoint = mobjectCriticalPoint(
      { center: row.sourceBox.center, kind: "finite", max: row.sourceBox.max, min: row.sourceBox.min },
      oppositeDirection(direction)
    );
    const targetPoint = previous
      ? addVec3(
          mobjectCriticalPoint({ center: previous.targetCenter, kind: "finite", max: previous.targetMax, min: previous.targetMin }, direction),
          multiplyVec3(direction, buff)
        )
      : sourcePoint;
    const delta = index === 0 ? [0, 0, 0] as Vec3 : subtractVec3(targetPoint, sourcePoint);
    const targetBox = shiftBox(row.sourceBox, delta);

    arrangedRows.push({
      delta,
      objectId: row.objectId,
      sourceCenter: row.sourceBox.center,
      sourceMax: row.sourceBox.max,
      sourceMin: row.sourceBox.min,
      targetCenter: targetBox.center,
      targetMax: targetBox.max,
      targetMin: targetBox.min
    });
  });

  const beforeCenteringBox = unionBoxes(arrangedRows.map((row) => ({ max: row.targetMax, min: row.targetMin })));
  const groupCenterBeforeCentering = boxCenter(beforeCenteringBox);
  const centeringDelta = center ? multiplyVec3(groupCenterBeforeCentering, -1) : [0, 0, 0] as Vec3;
  const rows = arrangedRows.map((row) => ({
    ...row,
    delta: addVec3(row.delta, centeringDelta),
    targetCenter: addVec3(row.targetCenter, centeringDelta),
    targetMax: addVec3(row.targetMax, centeringDelta),
    targetMin: addVec3(row.targetMin, centeringDelta)
  }));
  const groupBoundingBox = unionBoxes(rows.map((row) => ({ max: row.targetMax, min: row.targetMin })));
  const basePlan = {
    buff,
    center,
    centeringDelta,
    direction,
    groupBoundingBox,
    groupCenterBeforeCentering,
    layoutKind: "arrange" as const,
    missingObjectCount: missingObjectIds.length,
    missingObjectIds,
    objectCount: rows.length,
    objectIds: rows.map((row) => row.objectId),
    rows
  };

  return {
    ...basePlan,
    signature: hashStableJson(stableSerialize(basePlan)),
    sourceContract: MOBJECT_LAYOUT_SOURCE_CONTRACT
  };
}

// Manim source contract: Mobject.align_to shifts one mobject so its selected
// critical-point coordinate matches another mobject or explicit point, while
// preserving all non-selected axes.
export function buildMobjectAlignToLayoutPlan(
  graph: MathObjectGraph,
  options: MathMobjectAlignToLayoutOptions
): MathMobjectAlignToLayoutPlan {
  const direction = normalizeAlignmentDirection(options.direction);
  const sourceNode = graph.byId[options.objectId];
  const targetNode = options.targetObjectId ? graph.byId[options.targetObjectId] : null;
  const alignTargetId = options.targetObjectId ?? "point";
  const missingObjectIds = [
    sourceNode ? "" : options.objectId,
    options.targetObjectId && !targetNode ? options.targetObjectId : ""
  ].filter(Boolean);
  const rows: MathMobjectLayoutRow[] = [];

  if (sourceNode && (targetNode || options.targetPoint)) {
    const sourceBox = familyBox(graph, sourceNode.id);
    const targetReferenceBox = targetNode ? familyBox(graph, targetNode.id) : null;
    const targetPoint = options.targetPoint
      ? safeVec3(options.targetPoint)
      : mobjectCriticalPoint(
          { center: targetReferenceBox!.center, kind: "finite", max: targetReferenceBox!.max, min: targetReferenceBox!.min },
          direction
        );
    const sourcePoint = mobjectCriticalPoint(
      { center: sourceBox.center, kind: "finite", max: sourceBox.max, min: sourceBox.min },
      direction
    );
    const delta = axisDelta(sourcePoint, targetPoint, direction);
    const targetBox = shiftBox(sourceBox, delta);

    rows.push({
      delta,
      objectId: sourceNode.id,
      sourceCenter: sourceBox.center,
      sourceMax: sourceBox.max,
      sourceMin: sourceBox.min,
      targetCenter: targetBox.center,
      targetMax: targetBox.max,
      targetMin: targetBox.min
    });
  }

  const groupBoundingBox = unionBoxes(rows.map((row) => ({ max: row.targetMax, min: row.targetMin })));
  const basePlan = {
    alignTargetId,
    alignedAxes: alignedAxesFor(direction),
    buff: 0,
    center: false,
    centeringDelta: [0, 0, 0] as Vec3,
    direction,
    groupBoundingBox,
    groupCenterBeforeCentering: boxCenter(groupBoundingBox),
    layoutKind: "alignTo" as const,
    missingObjectCount: missingObjectIds.length,
    missingObjectIds,
    objectCount: rows.length,
    objectIds: rows.map((row) => row.objectId),
    rows
  };

  return {
    ...basePlan,
    signature: hashStableJson(stableSerialize(basePlan)),
    sourceContract: MOBJECT_LAYOUT_SOURCE_CONTRACT
  };
}

// Manim source contract: Mobject.next_to places one mobject's opposite
// critical point next to another mobject's selected critical point, then adds
// a fixed gap in the chosen direction.
export function buildMobjectNextToLayoutPlan(
  graph: MathObjectGraph,
  options: MathMobjectNextToLayoutOptions
): MathMobjectNextToLayoutPlan {
  const direction = normalizeDirection(options.direction);
  const buff = Math.max(0, finite(options.buff ?? 0.25, 0.25));
  const sourceNode = graph.byId[options.objectId];
  const targetNode = graph.byId[options.targetObjectId];
  const missingObjectIds = [
    sourceNode ? "" : options.objectId,
    targetNode ? "" : options.targetObjectId
  ].filter(Boolean);
  const rows: MathMobjectLayoutRow[] = [];

  if (sourceNode && targetNode) {
    const sourceBox = familyBox(graph, sourceNode.id);
    const targetBox = familyBox(graph, targetNode.id);
    const sourcePoint = mobjectCriticalPoint(
      { center: sourceBox.center, kind: "finite", max: sourceBox.max, min: sourceBox.min },
      oppositeDirection(direction)
    );
    const targetPoint = mobjectCriticalPoint(
      { center: targetBox.center, kind: "finite", max: targetBox.max, min: targetBox.min },
      direction
    );
    const delta = addVec3(subtractVec3(targetPoint, sourcePoint), multiplyVec3(direction, buff));
    const shiftedBox = shiftBox(sourceBox, delta);

    rows.push({
      delta,
      objectId: sourceNode.id,
      sourceCenter: sourceBox.center,
      sourceMax: sourceBox.max,
      sourceMin: sourceBox.min,
      targetCenter: shiftedBox.center,
      targetMax: shiftedBox.max,
      targetMin: shiftedBox.min
    });
  }

  const groupBoundingBox = unionBoxes(rows.map((row) => ({ max: row.targetMax, min: row.targetMin })));
  const basePlan = {
    buff,
    center: false,
    centeringDelta: [0, 0, 0] as Vec3,
    direction,
    gap: buff,
    groupBoundingBox,
    groupCenterBeforeCentering: boxCenter(groupBoundingBox),
    layoutKind: "nextTo" as const,
    missingObjectCount: missingObjectIds.length,
    missingObjectIds,
    nextTargetId: options.targetObjectId,
    objectCount: rows.length,
    objectIds: rows.map((row) => row.objectId),
    rows
  };

  return {
    ...basePlan,
    signature: hashStableJson(stableSerialize(basePlan)),
    sourceContract: MOBJECT_LAYOUT_SOURCE_CONTRACT
  };
}

// Manim source contract: Mobject.to_edge shifts a mobject along the selected
// axes until its critical point sits inside the scene frame edge by buff.
export function buildMobjectToEdgeLayoutPlan(
  graph: MathObjectGraph,
  options: MathMobjectToEdgeLayoutOptions
): MathMobjectToEdgeLayoutPlan {
  const rawDirection = safeVec3(options.direction, [1, 0, 0]);
  const direction = normalizeDirection(rawDirection);
  const mask = axisMaskFromDirection(rawDirection);
  const buff = Math.max(0, finite(options.buff ?? 0.5, 0.5));
  const frame = cleanEdgeFrame(options.frame ?? graphEdgeFrame(graph));
  const sourceNode = graph.byId[options.objectId];
  const missingObjectIds = sourceNode ? [] : [options.objectId];
  const framePoint = edgeCriticalPoint(frame, direction);
  const frameTargetPoint = subtractVec3(framePoint, multiplyVec3(direction, buff));
  const rows: MathMobjectLayoutRow[] = [];

  if (sourceNode) {
    const sourceBox = familyBox(graph, sourceNode.id);
    const sourcePoint = mobjectCriticalPoint(
      { center: sourceBox.center, kind: "finite", max: sourceBox.max, min: sourceBox.min },
      direction
    );
    const rawDelta = subtractVec3(frameTargetPoint, sourcePoint);
    const delta: Vec3 = [
      finite(rawDelta[0] * mask[0]),
      finite(rawDelta[1] * mask[1]),
      finite(rawDelta[2] * mask[2])
    ];
    const targetBox = shiftBox(sourceBox, delta);

    rows.push({
      delta,
      objectId: sourceNode.id,
      sourceCenter: sourceBox.center,
      sourceMax: sourceBox.max,
      sourceMin: sourceBox.min,
      targetCenter: targetBox.center,
      targetMax: targetBox.max,
      targetMin: targetBox.min
    });
  }

  const groupBoundingBox = unionBoxes(rows.map((row) => ({ max: row.targetMax, min: row.targetMin })));
  const basePlan = {
    buff,
    center: false,
    centeringDelta: [0, 0, 0] as Vec3,
    direction,
    frameAnchor: "edge" as const,
    frameMax: frame.max,
    frameMin: frame.min,
    frameTargetPoint,
    groupBoundingBox,
    groupCenterBeforeCentering: boxCenter(groupBoundingBox),
    layoutKind: "toEdge" as const,
    missingObjectCount: missingObjectIds.length,
    missingObjectIds,
    objectCount: rows.length,
    objectIds: rows.map((row) => row.objectId),
    rows
  };

  return {
    ...basePlan,
    signature: hashStableJson(stableSerialize(basePlan)),
    sourceContract: MOBJECT_LAYOUT_SOURCE_CONTRACT
  };
}

// Manim source contract: Mobject.to_corner shifts a mobject along the selected
// axes until its critical point sits inside the scene frame corner by buff.
export function buildMobjectToCornerLayoutPlan(
  graph: MathObjectGraph,
  options: MathMobjectToCornerLayoutOptions
): MathMobjectToCornerLayoutPlan {
  const direction = safeVec3(options.direction, [1, 1, 0]);
  const mask = axisMaskFromDirection(direction);
  const buff = Math.max(0, finite(options.buff ?? 0.5, 0.5));
  const frame = cleanEdgeFrame(options.frame ?? graphEdgeFrame(graph));
  const sourceNode = graph.byId[options.objectId];
  const missingObjectIds = sourceNode ? [] : [options.objectId];
  const frameTargetPoint = cornerTargetPoint(frame, direction, buff);
  const rows: MathMobjectLayoutRow[] = [];

  if (sourceNode) {
    const sourceBox = familyBox(graph, sourceNode.id);
    const sourcePoint = mobjectCriticalPoint(
      { center: sourceBox.center, kind: "finite", max: sourceBox.max, min: sourceBox.min },
      direction
    );
    const rawDelta = subtractVec3(frameTargetPoint, sourcePoint);
    const delta: Vec3 = [
      finite(rawDelta[0] * mask[0]),
      finite(rawDelta[1] * mask[1]),
      finite(rawDelta[2] * mask[2])
    ];
    const targetBox = shiftBox(sourceBox, delta);

    rows.push({
      delta,
      objectId: sourceNode.id,
      sourceCenter: sourceBox.center,
      sourceMax: sourceBox.max,
      sourceMin: sourceBox.min,
      targetCenter: targetBox.center,
      targetMax: targetBox.max,
      targetMin: targetBox.min
    });
  }

  const groupBoundingBox = unionBoxes(rows.map((row) => ({ max: row.targetMax, min: row.targetMin })));
  const basePlan = {
    buff,
    center: false,
    centeringDelta: [0, 0, 0] as Vec3,
    direction,
    frameAnchor: "corner" as const,
    frameMax: frame.max,
    frameMin: frame.min,
    frameTargetPoint,
    groupBoundingBox,
    groupCenterBeforeCentering: boxCenter(groupBoundingBox),
    layoutKind: "toCorner" as const,
    missingObjectCount: missingObjectIds.length,
    missingObjectIds,
    objectCount: rows.length,
    objectIds: rows.map((row) => row.objectId),
    rows
  };

  return {
    ...basePlan,
    signature: hashStableJson(stableSerialize(basePlan)),
    sourceContract: MOBJECT_LAYOUT_SOURCE_CONTRACT
  };
}

export function summarizeMobjectLayoutPlan(plan: MathMobjectLayoutPlan) {
  return [
    `mobject-layout:${plan.layoutKind}`,
    `objects=${plan.objectCount}`,
    `missing=${plan.missingObjectCount}`,
    `buff=${formatNumber(plan.buff)}`,
    `center=${plan.center ? "true" : "false"}`,
    `direction=${formatVec3(plan.direction)}`
  ].join(":");
}

export function serializeMobjectLayoutPlan(plan: MathMobjectLayoutPlan) {
  return escapedJson(stableSerialize(plan));
}

export function mobjectLayoutDataAttributes(plan: MathMobjectLayoutPlan): Record<string, string> {
  const baseAttributes = {
    "data-viz-mobject-layout-buff": formatNumber(plan.buff),
    "data-viz-mobject-layout-centering-delta": formatVec3(plan.centeringDelta),
    "data-viz-mobject-layout-direction": formatVec3(plan.direction),
    "data-viz-mobject-layout-group-center": formatVec3(boxCenter(plan.groupBoundingBox)),
    "data-viz-mobject-layout-group-size": formatVec3(boxSize(plan.groupBoundingBox)),
    "data-viz-mobject-layout-kind": plan.layoutKind,
    "data-viz-mobject-layout-missing-count": String(plan.missingObjectCount),
    "data-viz-mobject-layout-missing-ids": plan.missingObjectIds.join(",") || "none",
    "data-viz-mobject-layout-object-count": String(plan.objectCount),
    "data-viz-mobject-layout-object-ids": plan.objectIds.join(",") || "none",
    "data-viz-mobject-layout-signature": plan.signature,
    "data-viz-mobject-layout-source-contract": plan.sourceContract,
    "data-viz-mobject-layout-summary": summarizeMobjectLayoutPlan(plan),
    "data-viz-mobject-layout-target-centers": plan.rows.map((row) => `${row.objectId}=${formatVec3(row.targetCenter)}`).join("|") || "none"
  };

  if (plan.layoutKind === "nextTo") {
    return {
      ...baseAttributes,
      "data-viz-mobject-layout-next-gap": formatNumber(plan.gap),
      "data-viz-mobject-layout-next-target-id": plan.nextTargetId
    };
  }

  if (plan.layoutKind === "toEdge" || plan.layoutKind === "toCorner") {
    return {
      ...baseAttributes,
      "data-viz-mobject-layout-frame-anchor": plan.frameAnchor,
      "data-viz-mobject-layout-frame-bounds": frameBounds({ max: plan.frameMax, min: plan.frameMin }),
      "data-viz-mobject-layout-frame-target": formatVec3(plan.frameTargetPoint)
    };
  }

  if (plan.layoutKind !== "alignTo") return baseAttributes;

  return {
    "data-viz-mobject-layout-align-target-id": plan.alignTargetId,
    "data-viz-mobject-layout-aligned-axes": plan.alignedAxes,
    ...baseAttributes
  };
}
