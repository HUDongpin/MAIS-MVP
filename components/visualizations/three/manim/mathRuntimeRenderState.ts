import type { MathObjectGraph, RuntimeRenderState } from "./mathSceneRuntimeState";
import type { Vec3 } from "./mathSceneTypes";

export const RUNTIME_RENDER_STATE_SOURCE_CONTRACT =
  "RuntimeRenderState->pointsForRuntimeRenderState|mapRuntimeRenderState";

export type RuntimeRenderStateEvidence = {
  finitePointCount: number;
  kindSummary: string;
  objectCount: number;
  objectIds: string;
  pointCount: number;
  sourceContract: typeof RUNTIME_RENDER_STATE_SOURCE_CONTRACT;
  styledObjectCount: number;
  summary: string;
  wireframeCurveCount: number;
  zeroPointObjectCount: number;
};

export function pointsForRuntimeRenderState(renderState: RuntimeRenderState): Vec3[] {
  if (renderState.kind === "axes") {
    return [
      ...renderState.xAxisPoints,
      ...renderState.yAxisPoints,
      ...renderState.zAxisPoints
    ];
  }
  if (renderState.kind === "point") return [renderState.position];
  if (renderState.kind === "polyline") return renderState.points;
  if (renderState.kind === "surface") return renderState.points;
  if (renderState.kind === "vector") return [renderState.from, renderState.to];

  return [];
}

export function runtimeRenderStateHasPoints(renderState: RuntimeRenderState) {
  return pointsForRuntimeRenderState(renderState).length > 0;
}

export function mapRuntimeRenderState(
  renderState: RuntimeRenderState,
  mapper: (point: Vec3) => Vec3
): RuntimeRenderState {
  if (renderState.kind === "axes") {
    return {
      ...renderState,
      xAxisPoints: renderState.xAxisPoints.map(mapper),
      yAxisPoints: renderState.yAxisPoints.map(mapper),
      zAxisPoints: renderState.zAxisPoints.map(mapper)
    };
  }
  if (renderState.kind === "point") return { kind: "point", position: mapper(renderState.position) };
  if (renderState.kind === "polyline") return { ...renderState, points: renderState.points.map(mapper) };
  if (renderState.kind === "surface") {
    return {
      ...renderState,
      points: renderState.points.map(mapper),
      wireframeColumns: renderState.wireframeColumns.map((column) => column.map(mapper)),
      wireframeRows: renderState.wireframeRows.map((row) => row.map(mapper))
    };
  }
  if (renderState.kind === "vector") {
    return {
      ...renderState,
      from: mapper(renderState.from),
      to: mapper(renderState.to)
    };
  }

  return renderState;
}

function renderStateHasStyle(renderState: RuntimeRenderState) {
  return (renderState.kind === "polyline" || renderState.kind === "surface" || renderState.kind === "vector") && Boolean(renderState.style);
}

function wireframeCurveCount(renderState: RuntimeRenderState) {
  if (renderState.kind !== "surface") return 0;

  return renderState.wireframeRows.length + renderState.wireframeColumns.length;
}

function finitePointCount(points: Vec3[]) {
  return points.filter((point) => point.every(Number.isFinite)).length;
}

function runtimeRenderStateKindSummary(kindCounts: Record<RuntimeRenderState["kind"], number>) {
  return [
    `axes=${kindCounts.axes}`,
    `empty=${kindCounts.empty}`,
    `point=${kindCounts.point}`,
    `polyline=${kindCounts.polyline}`,
    `surface=${kindCounts.surface}`,
    `vector=${kindCounts.vector}`
  ].join(";");
}

export function buildRuntimeRenderStateEvidence(objectGraph: MathObjectGraph): RuntimeRenderStateEvidence {
  const nodes = Object.values(objectGraph.byId).sort((left, right) => left.id.localeCompare(right.id));
  const kindCounts: Record<RuntimeRenderState["kind"], number> = {
    axes: 0,
    empty: 0,
    point: 0,
    polyline: 0,
    surface: 0,
    vector: 0
  };
  let pointCount = 0;
  let finitePoints = 0;
  let styledObjectCount = 0;
  let wireframes = 0;
  let zeroPointObjectCount = 0;

  nodes.forEach((node) => {
    const points = pointsForRuntimeRenderState(node.renderState);
    kindCounts[node.renderState.kind] += 1;
    pointCount += points.length;
    finitePoints += finitePointCount(points);
    if (points.length === 0) zeroPointObjectCount += 1;
    if (renderStateHasStyle(node.renderState)) styledObjectCount += 1;
    wireframes += wireframeCurveCount(node.renderState);
  });

  const kindSummary = runtimeRenderStateKindSummary(kindCounts);
  const objectIds = nodes.map((node) => node.id).join(",") || "none";

  return {
    finitePointCount: finitePoints,
    kindSummary,
    objectCount: nodes.length,
    objectIds,
    pointCount,
    sourceContract: RUNTIME_RENDER_STATE_SOURCE_CONTRACT,
    styledObjectCount,
    summary: `runtime-render-state:objects=${nodes.length}:kinds=${kindSummary}:points=${pointCount}:finite=${finitePoints}:zeroPoint=${zeroPointObjectCount}:styled=${styledObjectCount}:wireframes=${wireframes}:ids=${objectIds}`,
    wireframeCurveCount: wireframes,
    zeroPointObjectCount
  };
}

export function runtimeRenderStateEvidenceDataAttributes(evidence: RuntimeRenderStateEvidence) {
  return {
    "data-viz-runtime-render-state-finite-point-count": String(evidence.finitePointCount),
    "data-viz-runtime-render-state-kind-summary": evidence.kindSummary,
    "data-viz-runtime-render-state-object-count": String(evidence.objectCount),
    "data-viz-runtime-render-state-object-ids": evidence.objectIds,
    "data-viz-runtime-render-state-point-count": String(evidence.pointCount),
    "data-viz-runtime-render-state-source-contract": evidence.sourceContract,
    "data-viz-runtime-render-state-styled-object-count": String(evidence.styledObjectCount),
    "data-viz-runtime-render-state-summary": evidence.summary,
    "data-viz-runtime-render-state-wireframe-curve-count": String(evidence.wireframeCurveCount),
    "data-viz-runtime-render-state-zero-point-object-count": String(evidence.zeroPointObjectCount)
  } as const;
}
