import type { MathObjectGraph, RuntimeRenderState } from "./mathSceneRuntimeState";
import type { VMobjectStyle } from "./mathVMobjectStyle";

export type VMobjectStyleEvidenceSummary = {
  baseNormalObjectIds: string;
  fillCount: number;
  maxAntiAliasWidth: number;
  maxJointAngleDegrees: number;
  maxStrokeWidth: number;
  minStrokeOpacity: number;
  styleCount: number;
  styleObjectIds: string;
  styleSummary: string;
  strokeZoomScreenSpaceCount: number;
  strokeZoomWorldSpaceCount: number;
  transparentStrokeCount: number;
};

function renderStateStyle(renderState: RuntimeRenderState): VMobjectStyle | undefined {
  if (renderState.kind === "polyline" || renderState.kind === "surface" || renderState.kind === "vector") {
    return renderState.style;
  }

  return undefined;
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function summarizeVMobjectStyleEvidence(graph: MathObjectGraph): VMobjectStyleEvidenceSummary {
  const styledObjects = Object.values(graph.byId)
    .map((node) => ({ id: node.id, style: renderStateStyle(node.renderState) }))
    .filter((entry): entry is { id: string; style: VMobjectStyle } => Boolean(entry.style))
    .sort((left, right) => left.id.localeCompare(right.id));

  const styleCount = styledObjects.length;
  const strokeRoles = uniqueSorted(styledObjects.map((entry) => entry.style.strokeRole)).join(",") || "none";
  const fillRoles = uniqueSorted(styledObjects.map((entry) => entry.style.fillRole)).join(",") || "none";
  const baseNormalObjectIds = styledObjects
    .filter((entry) => entry.style.baseNormal.some((component) => Math.abs(component) > 1e-9))
    .map((entry) => entry.id)
    .join(",") || "none";
  const maxStrokeWidth = styleCount > 0 ? Math.max(...styledObjects.map((entry) => entry.style.strokeWidth)) : 0;
  const maxAntiAliasWidth = styleCount > 0 ? Math.max(...styledObjects.map((entry) => entry.style.antiAliasWidth)) : 0;
  const maxJointAngleDegrees = styleCount > 0 ? Math.max(...styledObjects.map((entry) => entry.style.jointAngleDegrees)) : 0;
  const minStrokeOpacity = styleCount > 0 ? Math.min(...styledObjects.map((entry) => entry.style.strokeOpacity)) : 1;
  const transparentStrokeCount = styledObjects.filter((entry) => entry.style.strokeOpacity < 1).length;
  const fillCount = styledObjects.filter((entry) => entry.style.fillOpacity > 0).length;
  const strokeZoomScreenSpaceCount = styledObjects.filter((entry) => entry.style.strokeZoomBehavior === "screen-space").length;
  const strokeZoomWorldSpaceCount = styledObjects.filter((entry) => entry.style.strokeZoomBehavior === "world-space").length;
  const styleObjectIds = styledObjects.map((entry) => entry.id).join(",") || "none";

  return {
    baseNormalObjectIds,
    fillCount,
    maxAntiAliasWidth,
    maxJointAngleDegrees,
    maxStrokeWidth,
    minStrokeOpacity,
    styleCount,
    styleObjectIds,
    styleSummary: [
      `objects=${styleCount}`,
      `strokeRoles=${strokeRoles}`,
      `fillRoles=${fillRoles}`,
      `transparentStroke=${transparentStrokeCount}`,
      `filled=${fillCount}`,
      `maxStrokeWidth=${maxStrokeWidth.toFixed(2)}`,
      `minStrokeOpacity=${minStrokeOpacity.toFixed(2)}`,
      `maxAntiAliasWidth=${maxAntiAliasWidth.toFixed(2)}`,
      `maxJointAngle=${maxJointAngleDegrees.toFixed(2)}`,
      `baseNormals=${baseNormalObjectIds}`,
      `strokeZoom=screen-space:${strokeZoomScreenSpaceCount},world-space:${strokeZoomWorldSpaceCount}`
    ].join(";"),
    strokeZoomScreenSpaceCount,
    strokeZoomWorldSpaceCount,
    transparentStrokeCount
  };
}

export function vmobjectStyleEvidenceDataAttributes(summary: VMobjectStyleEvidenceSummary) {
  return {
    "data-viz-vmobject-base-normal-object-ids": summary.baseNormalObjectIds,
    "data-viz-vmobject-fill-count": String(summary.fillCount),
    "data-viz-vmobject-max-anti-alias-width": summary.maxAntiAliasWidth.toFixed(2),
    "data-viz-vmobject-max-joint-angle": summary.maxJointAngleDegrees.toFixed(2),
    "data-viz-vmobject-max-stroke-width": summary.maxStrokeWidth.toFixed(2),
    "data-viz-vmobject-min-stroke-opacity": summary.minStrokeOpacity.toFixed(2),
    "data-viz-vmobject-stroke-zoom-screen-space-count": String(summary.strokeZoomScreenSpaceCount),
    "data-viz-vmobject-stroke-zoom-world-space-count": String(summary.strokeZoomWorldSpaceCount),
    "data-viz-vmobject-style-count": String(summary.styleCount),
    "data-viz-vmobject-style-object-ids": summary.styleObjectIds,
    "data-viz-vmobject-style-summary": summary.styleSummary,
    "data-viz-vmobject-transparent-stroke-count": String(summary.transparentStrokeCount)
  } as const;
}
