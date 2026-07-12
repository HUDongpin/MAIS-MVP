import { effectiveMobjectBoundingBox, effectiveMobjectFamilyBoundingBox } from "./mathMobjectBoundingBox";
import type { MathObjectGraph, RuntimeBoundingBox } from "./mathSceneRuntimeState";
import type { RuntimeMathObjectNode } from "./mathSceneRuntimeState";
import type { MathMobjectAnchorName, Vec3 } from "./mathSceneTypes";

export type MobjectAnchorName = MathMobjectAnchorName;
export const MOBJECT_ANCHOR_SOURCE_CONTRACT = "Mobject.get_critical_point|get_bounding_box|Mobject anchors";

export const DEFAULT_MOBJECT_EVIDENCE_ANCHORS: MobjectAnchorName[] = [
  "back",
  "bottom",
  "center",
  "front",
  "left",
  "right",
  "top"
];

export type MobjectAnchorEvidence = {
  anchorNameCount: number;
  anchorNames: string;
  anchorPointCount: number;
  emptyBoundingBoxCount: number;
  finiteAnchorPointCount: number;
  objectCount: number;
  objectIds: string;
  sourceContract: typeof MOBJECT_ANCHOR_SOURCE_CONTRACT;
  summary: string;
};

const anchorDirections: Record<MobjectAnchorName, Vec3> = {
  back: [0, 0, -1],
  bottom: [0, -1, 0],
  center: [0, 0, 0],
  front: [0, 0, 1],
  left: [-1, 0, 0],
  lowerLeft: [-1, -1, 0],
  lowerRight: [1, -1, 0],
  right: [1, 0, 0],
  top: [0, 1, 0],
  upperLeft: [-1, 1, 0],
  upperRight: [1, 1, 0]
};

function finite(value: number, fallback: number) {
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

function safeVec3(value: Vec3 | undefined, fallback: Vec3 = [0, 0, 0]): Vec3 {
  if (!value) return [...fallback];
  return [
    finite(value[0], fallback[0]),
    finite(value[1], fallback[1]),
    finite(value[2], fallback[2])
  ];
}

function criticalCoordinate(min: number, center: number, max: number, direction: number) {
  if (direction > 0) return max;
  if (direction < 0) return min;
  return center;
}

export function mobjectCriticalPoint(boundingBox: RuntimeBoundingBox, direction: Vec3): Vec3 {
  if (boundingBox.kind === "empty") return [0, 0, 0];

  const center = safeVec3(boundingBox.center);
  const min = safeVec3(boundingBox.min, center);
  const max = safeVec3(boundingBox.max, center);
  const safeDirection = safeVec3(direction);

  return [
    criticalCoordinate(min[0], center[0], max[0], safeDirection[0]),
    criticalCoordinate(min[1], center[1], max[1], safeDirection[1]),
    criticalCoordinate(min[2], center[2], max[2], safeDirection[2])
  ];
}

export function mobjectAnchorPoint(boundingBox: RuntimeBoundingBox, anchorName: MobjectAnchorName = "center"): Vec3 {
  return mobjectCriticalPoint(boundingBox, anchorDirections[anchorName] ?? anchorDirections.center);
}

export function mobjectAnchorPointForNode(
  node: RuntimeMathObjectNode,
  anchorName: MobjectAnchorName = "center"
): Vec3 {
  return mobjectAnchorPoint(effectiveMobjectBoundingBox(node), anchorName);
}

function formatVec3(point: Vec3) {
  return `(${point.map((value) => finite(value, 0).toFixed(3)).join(",")})`;
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function isFiniteVec3(point: Vec3) {
  return point.every(Number.isFinite);
}

export function summarizeMobjectAnchors(
  boundingBox: RuntimeBoundingBox,
  anchors: MobjectAnchorName[] = ["center"]
) {
  return anchors.map((anchor) => `${anchor}=${formatVec3(mobjectAnchorPoint(boundingBox, anchor))}`).join(";");
}

export function buildMobjectAnchorEvidence(
  objectGraph: MathObjectGraph,
  anchors: MobjectAnchorName[] = DEFAULT_MOBJECT_EVIDENCE_ANCHORS
): MobjectAnchorEvidence {
  const nodes = Object.values(objectGraph.byId).sort((left, right) => left.id.localeCompare(right.id));
  const anchorNames = uniqueSorted(anchors);
  let finiteAnchorPointCount = 0;
  let emptyBoundingBoxCount = 0;

  for (const node of nodes) {
    const boundingBox = effectiveMobjectFamilyBoundingBox(objectGraph, node);
    if (boundingBox.kind === "empty") emptyBoundingBoxCount += 1;

    for (const anchorName of anchorNames) {
      if (isFiniteVec3(mobjectAnchorPoint(boundingBox, anchorName as MobjectAnchorName))) finiteAnchorPointCount += 1;
    }
  }

  const anchorPointCount = nodes.length * anchorNames.length;
  const objectIds = nodes.map((node) => node.id).join(",") || "none";
  const anchorNameSummary = anchorNames.join(",") || "none";

  return {
    anchorNameCount: anchorNames.length,
    anchorNames: anchorNameSummary,
    anchorPointCount,
    emptyBoundingBoxCount,
    finiteAnchorPointCount,
    objectCount: nodes.length,
    objectIds,
    sourceContract: MOBJECT_ANCHOR_SOURCE_CONTRACT,
    summary: `mobject-anchors:objects=${nodes.length}:anchors=${anchorNames.length}:points=${anchorPointCount}:finite=${finiteAnchorPointCount}:empty=${emptyBoundingBoxCount}:names=${anchorNameSummary}:ids=${objectIds}`
  };
}

export function mobjectAnchorEvidenceDataAttributes(evidence: MobjectAnchorEvidence) {
  return {
    "data-viz-mobject-anchor-empty-bounding-box-count": String(evidence.emptyBoundingBoxCount),
    "data-viz-mobject-anchor-finite-point-count": String(evidence.finiteAnchorPointCount),
    "data-viz-mobject-anchor-name-count": String(evidence.anchorNameCount),
    "data-viz-mobject-anchor-names": evidence.anchorNames,
    "data-viz-mobject-anchor-object-count": String(evidence.objectCount),
    "data-viz-mobject-anchor-object-ids": evidence.objectIds,
    "data-viz-mobject-anchor-point-count": String(evidence.anchorPointCount),
    "data-viz-mobject-anchor-source-contract": evidence.sourceContract,
    "data-viz-mobject-anchor-summary": evidence.summary
  } as const;
}

export function serializeMobjectAnchorEvidence(evidence: MobjectAnchorEvidence) {
  return stableSerialize(evidence);
}
