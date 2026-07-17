import {
  materialPropsForMobject,
  lineOpacityForMobject,
  lineTransparencyForMobject,
  type MobjectMaterialUniformProps
} from "./mathMobjectMaterialUniforms";
import type { MathObjectGraph, RuntimeRenderState } from "./mathSceneRuntimeState";
import { buildVMobjectStyle, type VMobjectStyle, type VMobjectStyleInput } from "./mathVMobjectStyle";

export const VMOBJECT_LINE_RENDER_SOURCE_CONTRACT =
  "VMobject stroke/fill style->vmobjectLineProps|Mobject material uniforms";
export const VMOBJECT_SURFACE_FILL_RENDER_SOURCE_CONTRACT =
  "VMobject fill style->surface mesh triangles|Mobject material uniforms";

export type VMobjectLinePropsInput = {
  fallbackColorRole: string;
  fallbackOpacity: number;
  fallbackStrokeWidth: number;
  materialProps: MobjectMaterialUniformProps;
  style?: VMobjectStyle | VMobjectStyleInput;
};

export type VMobjectLineRenderProps = {
  colorRole: string;
  lineWidth: number;
  opacity: number;
  strokeOpacity: number;
  strokeWidth: number;
  transparent: boolean;
};

export type VMobjectSurfaceFillMeshPropsInput = {
  fallbackColorRole: string;
  materialProps: MobjectMaterialUniformProps;
  renderState: Extract<RuntimeRenderState, { kind: "surface" }>;
  style?: VMobjectStyle | VMobjectStyleInput;
};

export type VMobjectSurfaceFillMeshProps = {
  colorRole: string;
  depthWrite: boolean;
  fillOpacity: number;
  opacity: number;
  positions: number[];
  transparent: boolean;
  triangleCount: number;
  vertexCount: number;
};

export type VMobjectLineRenderEvidence = {
  colorRoles: string;
  objectCount: number;
  objectIds: string;
  opacityRange: string;
  sourceContract: typeof VMOBJECT_LINE_RENDER_SOURCE_CONTRACT;
  strokeWidthRange: string;
  summary: string;
  transparentCount: number;
};

export type VMobjectSurfaceFillRenderEvidence = {
  colorRoles: string;
  meshObjectCount: number;
  meshObjectIds: string;
  objectCount: number;
  objectIds: string;
  opacityRange: string;
  sourceContract: typeof VMOBJECT_SURFACE_FILL_RENDER_SOURCE_CONTRACT;
  summary: string;
  transparentCount: number;
  triangleCount: number;
  vertexCount: number;
};

export function vmobjectLineProps({
  fallbackColorRole,
  fallbackOpacity,
  fallbackStrokeWidth,
  materialProps,
  style
}: VMobjectLinePropsInput): VMobjectLineRenderProps {
  const resolvedStyle = buildVMobjectStyle({
    strokeOpacity: fallbackOpacity,
    strokeRole: fallbackColorRole,
    strokeWidth: fallbackStrokeWidth,
    ...style
  });

  return {
    colorRole: resolvedStyle.strokeRole,
    lineWidth: resolvedStyle.strokeWidth,
    opacity: lineOpacityForMobject(resolvedStyle.strokeOpacity, materialProps),
    strokeOpacity: resolvedStyle.strokeOpacity,
    strokeWidth: resolvedStyle.strokeWidth,
    transparent: lineTransparencyForMobject(resolvedStyle.strokeOpacity, materialProps)
  };
}

function isFinitePoint(point: [number, number, number] | undefined): point is [number, number, number] {
  return Boolean(point && point.every(Number.isFinite));
}

function pushPoint(positions: number[], point: [number, number, number]) {
  positions.push(point[0], point[1], point[2]);
}

function pushTriangle(
  positions: number[],
  first: [number, number, number] | undefined,
  second: [number, number, number] | undefined,
  third: [number, number, number] | undefined
) {
  if (!isFinitePoint(first) || !isFinitePoint(second) || !isFinitePoint(third)) return;

  pushPoint(positions, first);
  pushPoint(positions, second);
  pushPoint(positions, third);
}

function surfacePoint(renderState: Extract<RuntimeRenderState, { kind: "surface" }>, row: number, column: number) {
  return renderState.points[row * renderState.columns + column];
}

function surfaceTrianglePositions(renderState: Extract<RuntimeRenderState, { kind: "surface" }>) {
  const positions: number[] = [];

  for (let row = 0; row < renderState.rows - 1; row += 1) {
    for (let column = 0; column < renderState.columns - 1; column += 1) {
      const topLeft = surfacePoint(renderState, row, column);
      const topRight = surfacePoint(renderState, row, column + 1);
      const bottomLeft = surfacePoint(renderState, row + 1, column);
      const bottomRight = surfacePoint(renderState, row + 1, column + 1);

      pushTriangle(positions, topLeft, bottomLeft, topRight);
      pushTriangle(positions, bottomLeft, bottomRight, topRight);
    }
  }

  return positions;
}

export function vmobjectSurfaceFillMeshProps({
  fallbackColorRole,
  materialProps,
  renderState,
  style
}: VMobjectSurfaceFillMeshPropsInput): VMobjectSurfaceFillMeshProps {
  const resolvedStyle = buildVMobjectStyle({
    fillOpacity: 0,
    fillRole: fallbackColorRole,
    ...renderState.style,
    ...style
  });
  const opacity = lineOpacityForMobject(resolvedStyle.fillOpacity, materialProps);
  const transparent = lineTransparencyForMobject(resolvedStyle.fillOpacity, materialProps);
  const positions = opacity > 0 ? surfaceTrianglePositions(renderState) : [];

  return {
    colorRole: resolvedStyle.fillRole,
    depthWrite: materialProps.depthWrite && !transparent,
    fillOpacity: resolvedStyle.fillOpacity,
    opacity,
    positions,
    transparent,
    triangleCount: positions.length / 9,
    vertexCount: positions.length / 3
  };
}

function renderStateStyle(renderState: RuntimeRenderState): VMobjectStyle | undefined {
  if (renderState.kind === "polyline" || renderState.kind === "surface" || renderState.kind === "vector") {
    return renderState.style;
  }

  return undefined;
}

function fallbackStrokeWidthForRenderState(renderState: RuntimeRenderState) {
  if (renderState.kind === "surface") return 2;
  if (renderState.kind === "vector") return 5;
  return 3;
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(3) : "none";
}

function numberRange(values: number[]) {
  if (values.length === 0) return "none";

  return `${formatNumber(Math.min(...values))}..${formatNumber(Math.max(...values))}`;
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function buildVMobjectLineRenderEvidence(objectGraph: MathObjectGraph): VMobjectLineRenderEvidence {
  const lineObjects = Object.values(objectGraph.byId)
    .map((node) => {
      const style = renderStateStyle(node.renderState);
      if (!style) return undefined;

      const lineProps = vmobjectLineProps({
        fallbackColorRole: node.colorRole ?? node.id,
        fallbackOpacity: style.strokeOpacity,
        fallbackStrokeWidth: fallbackStrokeWidthForRenderState(node.renderState),
        materialProps: materialPropsForMobject(node.uniforms),
        style
      });

      return { id: node.id, lineProps };
    })
    .filter((entry): entry is { id: string; lineProps: VMobjectLineRenderProps } => Boolean(entry))
    .sort((left, right) => left.id.localeCompare(right.id));
  const objectIds = lineObjects.map((entry) => entry.id).join(",") || "none";
  const colorRoles = uniqueSorted(lineObjects.map((entry) => entry.lineProps.colorRole)).join(",") || "none";
  const opacities = lineObjects.map((entry) => entry.lineProps.opacity);
  const strokeWidths = lineObjects.map((entry) => entry.lineProps.strokeWidth);
  const opacityRange = numberRange(opacities);
  const strokeWidthRange = numberRange(strokeWidths);
  const transparentCount = lineObjects.filter((entry) => entry.lineProps.transparent).length;

  return {
    colorRoles,
    objectCount: lineObjects.length,
    objectIds,
    opacityRange,
    sourceContract: VMOBJECT_LINE_RENDER_SOURCE_CONTRACT,
    strokeWidthRange,
    summary: `vmobject-line-render:objects=${lineObjects.length}:transparent=${transparentCount}:opacityRange=${opacityRange}:strokeWidthRange=${strokeWidthRange}:roles=${colorRoles}:ids=${objectIds}`,
    transparentCount
  };
}

export function buildVMobjectSurfaceFillRenderEvidence(objectGraph: MathObjectGraph): VMobjectSurfaceFillRenderEvidence {
  const surfaceObjects = Object.values(objectGraph.byId)
    .filter((node) => node.renderState.kind === "surface")
    .map((node) => {
      if (node.renderState.kind !== "surface") return undefined;
      const fillProps = vmobjectSurfaceFillMeshProps({
        fallbackColorRole: node.colorRole ?? node.id,
        materialProps: materialPropsForMobject(node.uniforms),
        renderState: node.renderState
      });

      return { fillProps, id: node.id };
    })
    .filter((entry): entry is { fillProps: VMobjectSurfaceFillMeshProps; id: string } => Boolean(entry))
    .sort((left, right) => left.id.localeCompare(right.id));
  const meshObjects = surfaceObjects.filter((entry) => entry.fillProps.triangleCount > 0);
  const objectIds = surfaceObjects.map((entry) => entry.id).join(",") || "none";
  const meshObjectIds = meshObjects.map((entry) => entry.id).join(",") || "none";
  const colorRoles = uniqueSorted(meshObjects.map((entry) => entry.fillProps.colorRole)).join(",") || "none";
  const opacityRange = numberRange(meshObjects.map((entry) => entry.fillProps.opacity));
  const transparentCount = meshObjects.filter((entry) => entry.fillProps.transparent).length;
  const triangleCount = meshObjects.reduce((sum, entry) => sum + entry.fillProps.triangleCount, 0);
  const vertexCount = meshObjects.reduce((sum, entry) => sum + entry.fillProps.vertexCount, 0);

  return {
    colorRoles,
    meshObjectCount: meshObjects.length,
    meshObjectIds,
    objectCount: surfaceObjects.length,
    objectIds,
    opacityRange,
    sourceContract: VMOBJECT_SURFACE_FILL_RENDER_SOURCE_CONTRACT,
    summary: `vmobject-surface-fill-render:objects=${surfaceObjects.length}:meshes=${meshObjects.length}:triangles=${triangleCount}:vertices=${vertexCount}:transparent=${transparentCount}:opacityRange=${opacityRange}:roles=${colorRoles}:ids=${meshObjectIds}`,
    transparentCount,
    triangleCount,
    vertexCount
  };
}

export function vmobjectLineRenderEvidenceDataAttributes(evidence: VMobjectLineRenderEvidence) {
  return {
    "data-viz-vmobject-render-line-color-roles": evidence.colorRoles,
    "data-viz-vmobject-render-line-object-count": String(evidence.objectCount),
    "data-viz-vmobject-render-line-object-ids": evidence.objectIds,
    "data-viz-vmobject-render-line-opacity-range": evidence.opacityRange,
    "data-viz-vmobject-render-line-source-contract": evidence.sourceContract,
    "data-viz-vmobject-render-line-stroke-width-range": evidence.strokeWidthRange,
    "data-viz-vmobject-render-line-summary": evidence.summary,
    "data-viz-vmobject-render-line-transparent-count": String(evidence.transparentCount)
  } as const;
}

export function vmobjectSurfaceFillRenderEvidenceDataAttributes(evidence: VMobjectSurfaceFillRenderEvidence) {
  return {
    "data-viz-vmobject-render-fill-color-roles": evidence.colorRoles,
    "data-viz-vmobject-render-fill-mesh-object-count": String(evidence.meshObjectCount),
    "data-viz-vmobject-render-fill-mesh-object-ids": evidence.meshObjectIds,
    "data-viz-vmobject-render-fill-object-count": String(evidence.objectCount),
    "data-viz-vmobject-render-fill-object-ids": evidence.objectIds,
    "data-viz-vmobject-render-fill-opacity-range": evidence.opacityRange,
    "data-viz-vmobject-render-fill-source-contract": evidence.sourceContract,
    "data-viz-vmobject-render-fill-summary": evidence.summary,
    "data-viz-vmobject-render-fill-transparent-count": String(evidence.transparentCount),
    "data-viz-vmobject-render-fill-triangle-count": String(evidence.triangleCount),
    "data-viz-vmobject-render-fill-vertex-count": String(evidence.vertexCount)
  } as const;
}
