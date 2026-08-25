import type { CameraFrameState } from "./mathCameraFrame";
import { mobjectAnchorPointForNode, type MobjectAnchorName } from "./mathMobjectAnchors";
import type { MathSceneRuntimeState, RuntimeMathObjectNode } from "./mathSceneRuntimeState";
import type { MathSceneProjectedLabelSpec, Vec3 } from "./mathSceneTypes";

export const PROJECTED_LABEL_SOURCE_CONTRACT =
  "CameraFrame projection|fixed FormulaLayer overlay|projected spatial label anchors" as const;

export type ProjectionViewport = {
  height: number;
  width: number;
};

export type ProjectedPoint = {
  depth: number;
  ndc: Vec3;
  screen: [number, number];
  visible: boolean;
};

export type ProjectedLabelAnchor = ProjectedPoint & {
  anchorName?: MobjectAnchorName;
  ariaLabel: string;
  colorRole?: string;
  conceptId: string;
  id: string;
  objectId: string;
  placement: "projected-3d-anchor";
  text: string;
  variant?: MathSceneProjectedLabelSpec["variant"];
  world: Vec3;
};

export type ProjectedLabelAnchorInput = {
  anchorName?: MobjectAnchorName;
  cameraFrame: CameraFrameState;
  colorRole?: string;
  conceptId: string;
  id: string;
  objectId: string;
  text: string;
  viewport: ProjectionViewport;
  world: Vec3;
};

export type ProjectedLabelRuntimeOptions = {
  anchorForObject?: (node: RuntimeMathObjectNode) => MobjectAnchorName;
  includeHidden?: boolean;
  objectIds?: string[];
  textForObject?: (node: RuntimeMathObjectNode) => string;
};

export type ProjectedLabelAnchorSummary = {
  conceptIds: string;
  hiddenCount: number;
  hiddenObjectIds: string;
  labelCount: number;
  objectCount: number;
  objectIds: string;
  sourceContract: typeof PROJECTED_LABEL_SOURCE_CONTRACT;
  summary: string;
  visibleCount: number;
};

export type ProjectedLabelAnchorPayload = ProjectedLabelAnchorSummary & {
  anchors: ProjectedLabelAnchor[];
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

function clampDimension(value: number, fallback: number) {
  return Math.max(1, finite(value, fallback));
}

function finiteVec3(value: Vec3, fallback: Vec3 = [0, 0, 0]): Vec3 {
  return [
    finite(value[0], fallback[0]),
    finite(value[1], fallback[1]),
    finite(value[2], fallback[2])
  ];
}

function sub(left: Vec3, right: Vec3): Vec3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function dot(left: Vec3, right: Vec3) {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function projectedScreenFromNdc(ndcX: number, ndcY: number, viewport: ProjectionViewport): [number, number] {
  const width = clampDimension(viewport.width, 800);
  const height = clampDimension(viewport.height, 600);

  return [
    ((ndcX + 1) / 2) * width,
    ((1 - ndcY) / 2) * height
  ];
}

export function projectPointWithCameraFrame(
  cameraFrame: CameraFrameState,
  point: Vec3,
  viewport: ProjectionViewport
): ProjectedPoint {
  const world = finiteVec3(point);
  const position = finiteVec3(cameraFrame.position, [0, 0, 5]);
  const relative = sub(world, position);
  const right = finiteVec3(cameraFrame.orientation.right, [1, 0, 0]);
  const up = finiteVec3(cameraFrame.orientation.up, [0, 1, 0]);
  const forward = finiteVec3(cameraFrame.orientation.forward, [0, 0, -1]);
  const width = clampDimension(viewport.width, 800);
  const height = clampDimension(viewport.height, 600);
  const aspect = width / height;
  const fovRadians = (Math.min(160, Math.max(1, finite(cameraFrame.fov, 48))) * Math.PI) / 180;
  const tanHalfFov = Math.tan(fovRadians / 2);
  const depth = dot(relative, forward);
  const safeDepth = Math.max(Math.abs(depth), 1e-9);
  const cameraX = dot(relative, right);
  const cameraY = dot(relative, up);
  const ndcX = cameraX / (safeDepth * tanHalfFov * aspect);
  const ndcY = cameraY / (safeDepth * tanHalfFov);
  const visible = depth > 1e-9 && Math.abs(ndcX) <= 1 && Math.abs(ndcY) <= 1;

  return {
    depth,
    ndc: [ndcX, ndcY, depth > 1e-9 ? 1 / depth : -1],
    screen: projectedScreenFromNdc(ndcX, ndcY, viewport),
    visible
  };
}

export function buildProjectedLabelAnchor(input: ProjectedLabelAnchorInput): ProjectedLabelAnchor {
  const world = finiteVec3(input.world);
  const projection = projectPointWithCameraFrame(input.cameraFrame, world, input.viewport);

  return {
    ...projection,
    anchorName: input.anchorName,
    ariaLabel: `${input.text}, projected label for ${input.conceptId}`,
    colorRole: input.colorRole,
    conceptId: input.conceptId,
    id: input.id,
    objectId: input.objectId,
    placement: "projected-3d-anchor",
    text: input.text,
    world
  };
}

function labelWorldPointForNode(node: RuntimeMathObjectNode, anchorName: MobjectAnchorName = "center"): Vec3 {
  return mobjectAnchorPointForNode(node, anchorName);
}

export function buildProjectedLabelAnchorFromNode(
  node: RuntimeMathObjectNode,
  options: {
    anchorName?: MobjectAnchorName;
    cameraFrame: CameraFrameState;
    text?: string;
    viewport: ProjectionViewport;
  }
): ProjectedLabelAnchor {
  const anchorName = options.anchorName ?? "center";

  return buildProjectedLabelAnchor({
    anchorName,
    cameraFrame: options.cameraFrame,
    colorRole: node.colorRole,
    conceptId: node.conceptId,
    id: `label:${node.id}`,
    objectId: node.id,
    text: options.text ?? node.id,
    viewport: options.viewport,
    world: labelWorldPointForNode(node, anchorName)
  });
}

export function buildProjectedLabelAnchorsFromRuntimeState(
  runtimeState: MathSceneRuntimeState,
  viewport: ProjectionViewport,
  options: ProjectedLabelRuntimeOptions = {}
): ProjectedLabelAnchor[] {
  const ids = options.objectIds ?? runtimeState.objectGraph.rootIds;
  const anchors = ids
    .map((id) => runtimeState.objectGraph.byId[id])
    .filter((node): node is RuntimeMathObjectNode => Boolean(node))
    .map((node) => buildProjectedLabelAnchorFromNode(node, {
      anchorName: options.anchorForObject?.(node) ?? "center",
      cameraFrame: runtimeState.cameraDirector.frame,
      text: options.textForObject?.(node) ?? node.id,
      viewport
    }));

  if (options.includeHidden === false) {
    return anchors.filter((anchor) => anchor.visible);
  }

  return anchors;
}

export function buildSceneProjectedLabelAnchorsFromRuntimeState(
  runtimeState: MathSceneRuntimeState,
  viewport: ProjectionViewport,
  labels: MathSceneProjectedLabelSpec[]
): ProjectedLabelAnchor[] {
  const useMobileText = viewport.width < 640;
  const elapsedSeconds = runtimeState.timeline.elapsedSeconds;

  return labels.flatMap((label) => {
    if (elapsedSeconds < (label.startSeconds ?? 0)) return [];
    if (label.endSeconds !== undefined && elapsedSeconds >= label.endSeconds) return [];

    const node = runtimeState.objectGraph.byId[label.objectId];
    if (!node) return [];

    const text = useMobileText ? label.mobileText ?? label.text : label.text;
    const projected = buildProjectedLabelAnchorFromNode(node, {
      anchorName: label.anchorName,
      cameraFrame: runtimeState.cameraDirector.frame,
      text,
      viewport
    });
    const screenOffset = useMobileText ? label.mobileScreenOffset ?? label.screenOffset : label.screenOffset;

    return [{
      ...projected,
      ariaLabel: label.ariaLabel ?? `${text}, projected label for ${node.conceptId}`,
      id: `scene-label:${label.id}`,
      screen: [
        projected.screen[0] + (screenOffset?.[0] ?? 0),
        projected.screen[1] + (screenOffset?.[1] ?? 0)
      ],
      variant: label.variant ?? "pill"
    }];
  });
}

export function summarizeProjectedLabels(anchors: ProjectedLabelAnchor[]) {
  const visibleCount = anchors.filter((anchor) => anchor.visible).length;
  const ids = anchors.map((anchor) => anchor.id).join(",");

  return `labels=${anchors.length}:visible=${visibleCount}:ids=${ids || "none"}`;
}

function joinedUnique(values: string[]) {
  return [...new Set(values)].join(",") || "none";
}

export function summarizeProjectedLabelAnchors(anchors: ProjectedLabelAnchor[]): ProjectedLabelAnchorSummary {
  const visibleCount = anchors.filter((anchor) => anchor.visible).length;
  const hiddenAnchors = anchors.filter((anchor) => !anchor.visible);
  const objectIds = joinedUnique(anchors.map((anchor) => anchor.objectId));
  const conceptIds = joinedUnique(anchors.map((anchor) => anchor.conceptId));
  const hiddenObjectIds = joinedUnique(hiddenAnchors.map((anchor) => anchor.objectId));

  return {
    conceptIds,
    hiddenCount: hiddenAnchors.length,
    hiddenObjectIds,
    labelCount: anchors.length,
    objectCount: objectIds === "none" ? 0 : objectIds.split(",").length,
    objectIds,
    sourceContract: PROJECTED_LABEL_SOURCE_CONTRACT,
    summary: [
      `projectedLabels=${anchors.length}`,
      `visible=${visibleCount}`,
      `hidden=${hiddenAnchors.length}`,
      `objects=${objectIds}`,
      `concepts=${conceptIds}`,
      `hiddenObjects=${hiddenObjectIds}`
    ].join(":"),
    visibleCount
  };
}

export function projectedLabelAnchorDataAttributes(summary: ProjectedLabelAnchorSummary): Record<string, string> {
  return {
    "data-viz-manim-projected-label-concept-ids": summary.conceptIds,
    "data-viz-manim-projected-label-count": String(summary.labelCount),
    "data-viz-manim-projected-label-hidden-count": String(summary.hiddenCount),
    "data-viz-manim-projected-label-hidden-object-ids": summary.hiddenObjectIds,
    "data-viz-manim-projected-label-object-count": String(summary.objectCount),
    "data-viz-manim-projected-label-object-ids": summary.objectIds,
    "data-viz-manim-projected-label-source-contract": summary.sourceContract,
    "data-viz-manim-projected-label-summary": summary.summary,
    "data-viz-manim-projected-label-visible-count": String(summary.visibleCount)
  };
}

export function serializeProjectedLabelAnchors(anchors: ProjectedLabelAnchor[]) {
  const summary = summarizeProjectedLabelAnchors(anchors);

  return stableSerialize({
    ...summary,
    anchors
  } satisfies ProjectedLabelAnchorPayload);
}
