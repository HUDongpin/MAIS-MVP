import type { MathSceneSpec, Range2, Vec3 } from "./mathSceneTypes";

export const SURFACE_OBJECT_SOURCE_CONTRACT =
  "SurfaceObject|parametric surface sampled grid|surfaceWireframeCurves|mesh cell/triangle topology|revealSurface partial wireframe";

export type SurfaceSample = {
  column: number;
  point: Vec3;
  row: number;
  u: number;
  v: number;
};

export type SurfaceBounds = {
  center: Vec3;
  max: Vec3;
  min: Vec3;
};

export type SurfaceObject = {
  bounds: SurfaceBounds;
  colorRole: string;
  columns: number;
  conceptId: string;
  id: string;
  normals: Vec3[];
  rows: number;
  samples: SurfaceSample[];
  uRange: Range2;
  vRange: Range2;
};

export type SurfaceWireframeCurves = {
  columns: Vec3[][];
  rows: Vec3[][];
};

export type SurfaceMeshCell = {
  column: number;
  cornerSampleIndices: [number, number, number, number];
  corners: [Vec3, Vec3, Vec3, Vec3];
  id: string;
  row: number;
};

export type SurfaceMeshTriangle = {
  cellId: string;
  id: string;
  points: [Vec3, Vec3, Vec3];
  sampleIndices: [number, number, number];
  winding: "grid-forward";
};

export type AlignedSurfaceSamples = {
  columns: number;
  conceptId: string;
  rows: number;
  source: Vec3[][];
  sourceId: string;
  target: Vec3[][];
  targetId: string;
};

export type SurfaceObjectEvidence = {
  boundsSummary: string;
  cellCount: number;
  finiteNormalCount: number;
  finiteSampleCount: number;
  gridSummary: string;
  normalCount: number;
  objectCount: number;
  objectIds: string;
  rangeSummary: string;
  sampleCount: number;
  sourceContract: typeof SURFACE_OBJECT_SOURCE_CONTRACT;
  summary: string;
  topologySummary: string;
  triangleCount: number;
  version: "mais-manim-surface-object/v1";
  wireframeColumnCount: number;
  wireframeRowCount: number;
};

export type SurfaceObjectPayload = SurfaceObjectEvidence & {
  meshCells: Array<{ cells: SurfaceMeshCell[]; id: string }>;
  meshTriangles: Array<{ id: string; triangles: SurfaceMeshTriangle[] }>;
  surfaces: SurfaceObject[];
  wireframes: Array<SurfaceWireframeCurves & { id: string }>;
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

function safeProgress(value: number) {
  if (value === Infinity) return 1;
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function safeSegmentCount(value: number) {
  return Math.max(1, Math.floor(finite(value, 1)));
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function interpolatePoint(left: Vec3, right: Vec3, progress: number): Vec3 {
  return [
    lerp(left[0], right[0], progress),
    lerp(left[1], right[1], progress),
    lerp(left[2], right[2], progress)
  ];
}

function subtract(left: Vec3, right: Vec3): Vec3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function cross(left: Vec3, right: Vec3): Vec3 {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0]
  ];
}

function normalize(vector: Vec3): Vec3 {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (!Number.isFinite(length) || length === 0) return [0, 0, 1];
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function isFiniteVec3(point: Vec3) {
  return point.every(Number.isFinite);
}

function formatCompactNumber(value: number) {
  if (!Number.isFinite(value)) return "NaN";
  if (Object.is(value, -0)) return "0";
  return value.toFixed(3).replace(/\.?0+$/, "");
}

function formatFixedNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(3) : "NaN";
}

function formatVec3(point: Vec3) {
  return point.map((value) => formatFixedNumber(value)).join(",");
}

function formatSurfaceRange(surface: SurfaceObject) {
  return `${surface.id}:u=${formatCompactNumber(surface.uRange[0])}..${formatCompactNumber(surface.uRange[1])}:v=${formatCompactNumber(surface.vRange[0])}..${formatCompactNumber(surface.vRange[1])}`;
}

function formatSurfaceBounds(surface: SurfaceObject) {
  return [
    `${surface.id}:min=${formatVec3(surface.bounds.min)}`,
    `max=${formatVec3(surface.bounds.max)}`,
    `center=${formatVec3(surface.bounds.center)}`
  ].join(":");
}

function formatSurfaceTopology(surface: SurfaceObject) {
  const cellRows = Math.max(0, surface.rows - 1);
  const cellColumns = Math.max(0, surface.columns - 1);
  return `${surface.id}:cells=${cellRows}x${cellColumns}:triangles=${cellRows * cellColumns * 2}`;
}

function sampleAt(surface: SurfaceObject, row: number, column: number) {
  const safeRow = Math.min(surface.rows - 1, Math.max(0, row));
  const safeColumn = Math.min(surface.columns - 1, Math.max(0, column));
  return surface.samples[safeRow * surface.columns + safeColumn];
}

function sampleIndexAt(surface: SurfaceObject, row: number, column: number) {
  const safeRow = Math.min(surface.rows - 1, Math.max(0, row));
  const safeColumn = Math.min(surface.columns - 1, Math.max(0, column));
  return safeRow * surface.columns + safeColumn;
}

function buildBounds(samples: SurfaceSample[]): SurfaceBounds {
  const first = samples[0]?.point ?? [0, 0, 0];
  const min: Vec3 = [...first];
  const max: Vec3 = [...first];

  samples.forEach(({ point }) => {
    min[0] = Math.min(min[0], point[0]);
    min[1] = Math.min(min[1], point[1]);
    min[2] = Math.min(min[2], point[2]);
    max[0] = Math.max(max[0], point[0]);
    max[1] = Math.max(max[1], point[1]);
    max[2] = Math.max(max[2], point[2]);
  });

  return {
    center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
    max,
    min
  };
}

function computeNormal(surface: SurfaceObject, row: number, column: number): Vec3 {
  const previousU = sampleAt(surface, row - 1, column).point;
  const nextU = sampleAt(surface, row + 1, column).point;
  const previousV = sampleAt(surface, row, column - 1).point;
  const nextV = sampleAt(surface, row, column + 1).point;
  const tangentU = subtract(nextU, previousU);
  const tangentV = subtract(nextV, previousV);

  return normalize(cross(tangentU, tangentV));
}

function isParametricSurfaceSpec(
  object: MathSceneSpec["objects"][number]
): object is Extract<MathSceneSpec["objects"][number], { type: "parametricSurface" }> {
  return object.type === "parametricSurface";
}

export function buildSurfaceObject({
  colorRole,
  conceptId,
  id,
  uRange,
  uSegments,
  valueAt,
  vRange,
  vSegments
}: {
  colorRole: string;
  conceptId: string;
  id: string;
  uRange: Range2;
  uSegments: number;
  valueAt: (u: number, v: number, uProgress: number, vProgress: number) => Vec3;
  vRange: Range2;
  vSegments: number;
}): SurfaceObject {
  const rows = safeSegmentCount(uSegments) + 1;
  const columns = safeSegmentCount(vSegments) + 1;
  const samples: SurfaceSample[] = [];

  for (let row = 0; row < rows; row += 1) {
    const uProgress = row / Math.max(1, rows - 1);
    const u = lerp(uRange[0], uRange[1], uProgress);

    for (let column = 0; column < columns; column += 1) {
      const vProgress = column / Math.max(1, columns - 1);
      const v = lerp(vRange[0], vRange[1], vProgress);
      const rawPoint = valueAt(u, v, uProgress, vProgress);

      samples.push({
        column,
        point: [
          finite(rawPoint[0], u),
          finite(rawPoint[1], v),
          finite(rawPoint[2], v)
        ],
        row,
        u,
        v
      });
    }
  }

  const surface: SurfaceObject = {
    bounds: buildBounds(samples),
    colorRole,
    columns,
    conceptId,
    id,
    normals: [],
    rows,
    samples,
    uRange,
    vRange
  };

  surface.normals = samples.map((sample) => computeNormal(surface, sample.row, sample.column));

  return surface;
}

export function buildSurfaceObjectFromGrid({
  colorRole,
  conceptId,
  id,
  samples: grid,
  uRange,
  vRange
}: {
  colorRole: string;
  conceptId: string;
  id: string;
  samples: Vec3[][];
  uRange: Range2;
  vRange: Range2;
}): SurfaceObject {
  const rows = Math.max(1, grid.length);
  const columns = Math.max(1, ...grid.map((row) => row.length));
  const samples: SurfaceSample[] = [];

  for (let row = 0; row < rows; row += 1) {
    const uProgress = rows === 1 ? 0 : row / (rows - 1);
    const u = lerp(uRange[0], uRange[1], uProgress);

    for (let column = 0; column < columns; column += 1) {
      const vProgress = columns === 1 ? 0 : column / (columns - 1);
      const v = lerp(vRange[0], vRange[1], vProgress);
      const rawPoint = grid[row]?.[column] ?? [u, v, 0];

      samples.push({
        column,
        point: [
          finite(rawPoint[0], u),
          finite(rawPoint[1], v),
          finite(rawPoint[2], v)
        ],
        row,
        u,
        v
      });
    }
  }

  const surface: SurfaceObject = {
    bounds: buildBounds(samples),
    colorRole,
    columns,
    conceptId,
    id,
    normals: [],
    rows,
    samples,
    uRange,
    vRange
  };

  surface.normals = samples.map((sample) => computeNormal(surface, sample.row, sample.column));

  return surface;
}

export function surfacePointAt(surface: SurfaceObject, uProgress: number, vProgress: number): Vec3 {
  const u = safeProgress(uProgress) * (surface.rows - 1);
  const v = safeProgress(vProgress) * (surface.columns - 1);
  const row0 = Math.floor(u);
  const row1 = Math.ceil(u);
  const column0 = Math.floor(v);
  const column1 = Math.ceil(v);
  const rowProgress = u - row0;
  const columnProgress = v - column0;
  const top = interpolatePoint(sampleAt(surface, row0, column0).point, sampleAt(surface, row0, column1).point, columnProgress);
  const bottom = interpolatePoint(sampleAt(surface, row1, column0).point, sampleAt(surface, row1, column1).point, columnProgress);

  return interpolatePoint(top, bottom, rowProgress);
}

export function surfaceNormalAt(surface: SurfaceObject, row: number, column: number): Vec3 {
  const sample = sampleAt(surface, Math.floor(finite(row, 0)), Math.floor(finite(column, 0)));
  return surface.normals[sample.row * surface.columns + sample.column] ?? [0, 0, 1];
}

export function surfaceWireframeCurves(surface: SurfaceObject): SurfaceWireframeCurves {
  return {
    columns: Array.from({ length: surface.columns }, (_, column) =>
      Array.from({ length: surface.rows }, (_, row) => sampleAt(surface, row, column).point)
    ),
    rows: Array.from({ length: surface.rows }, (_, row) =>
      Array.from({ length: surface.columns }, (_, column) => sampleAt(surface, row, column).point)
    )
  };
}

export function surfaceMeshCells(surface: SurfaceObject): SurfaceMeshCell[] {
  const cellRows = Math.max(0, surface.rows - 1);
  const cellColumns = Math.max(0, surface.columns - 1);

  return Array.from({ length: cellRows }, (_, row) =>
    Array.from({ length: cellColumns }, (_, column) => {
      const topLeft = sampleAt(surface, row, column);
      const topRight = sampleAt(surface, row, column + 1);
      const bottomRight = sampleAt(surface, row + 1, column + 1);
      const bottomLeft = sampleAt(surface, row + 1, column);

      return {
        column,
        cornerSampleIndices: [
          sampleIndexAt(surface, row, column),
          sampleIndexAt(surface, row, column + 1),
          sampleIndexAt(surface, row + 1, column + 1),
          sampleIndexAt(surface, row + 1, column)
        ],
        corners: [topLeft.point, topRight.point, bottomRight.point, bottomLeft.point],
        id: `${surface.id}:cell:${row}:${column}`,
        row
      } satisfies SurfaceMeshCell;
    })
  ).flat();
}

export function surfaceMeshTriangles(surface: SurfaceObject): SurfaceMeshTriangle[] {
  return surfaceMeshCells(surface).flatMap((cell) => [
    {
      cellId: cell.id,
      id: `${surface.id}:tri:${cell.row}:${cell.column}:a`,
      points: [cell.corners[0], cell.corners[1], cell.corners[2]],
      sampleIndices: [cell.cornerSampleIndices[0], cell.cornerSampleIndices[1], cell.cornerSampleIndices[2]],
      winding: "grid-forward"
    },
    {
      cellId: cell.id,
      id: `${surface.id}:tri:${cell.row}:${cell.column}:b`,
      points: [cell.corners[0], cell.corners[2], cell.corners[3]],
      sampleIndices: [cell.cornerSampleIndices[0], cell.cornerSampleIndices[2], cell.cornerSampleIndices[3]],
      winding: "grid-forward"
    }
  ]);
}

export function buildSurfaceObjectEvidence(surfaces: SurfaceObject[]): SurfaceObjectEvidence {
  const surfaceIds = surfaces.map((surface) => surface.id);
  let sampleCount = 0;
  let finiteSampleCount = 0;
  let normalCount = 0;
  let finiteNormalCount = 0;
  let cellCount = 0;
  let triangleCount = 0;
  let wireframeRowCount = 0;
  let wireframeColumnCount = 0;

  for (const surface of surfaces) {
    const wireframe = surfaceWireframeCurves(surface);
    const cells = surfaceMeshCells(surface);
    const triangles = surfaceMeshTriangles(surface);

    sampleCount += surface.samples.length;
    finiteSampleCount += surface.samples.filter((sample) => isFiniteVec3(sample.point)).length;
    normalCount += surface.normals.length;
    finiteNormalCount += surface.normals.filter(isFiniteVec3).length;
    cellCount += cells.length;
    triangleCount += triangles.length;
    wireframeRowCount += wireframe.rows.length;
    wireframeColumnCount += wireframe.columns.length;
  }

  const objectIds = surfaceIds.join(",") || "none";
  const gridSummary = surfaces.map((surface) => `${surface.id}=${surface.rows}x${surface.columns}`).join(";") || "none";
  const rangeSummary = surfaces.map(formatSurfaceRange).join(";") || "none";
  const boundsSummary = surfaces.map(formatSurfaceBounds).join(";") || "none";
  const topologySummary = surfaces.map(formatSurfaceTopology).join(";") || "none";
  const summary = [
    `surfaces:objects=${surfaces.length}`,
    `samples=${sampleCount}`,
    `finite=${finiteSampleCount}`,
    `normals=${normalCount}`,
    `finiteNormals=${finiteNormalCount}`,
    `cells=${cellCount}`,
    `triangles=${triangleCount}`,
    `wireRows=${wireframeRowCount}`,
    `wireColumns=${wireframeColumnCount}`,
    `ids=${objectIds}`
  ].join(":");

  return {
    boundsSummary,
    cellCount,
    finiteNormalCount,
    finiteSampleCount,
    gridSummary,
    normalCount,
    objectCount: surfaces.length,
    objectIds,
    rangeSummary,
    sampleCount,
    sourceContract: SURFACE_OBJECT_SOURCE_CONTRACT,
    summary,
    topologySummary,
    triangleCount,
    version: "mais-manim-surface-object/v1",
    wireframeColumnCount,
    wireframeRowCount
  };
}

export function buildSurfaceObjectsForScene(scene: MathSceneSpec) {
  return scene.objects
    .filter(isParametricSurfaceSpec)
    .map((object) =>
      buildSurfaceObjectFromGrid({
        colorRole: object.colorRole,
        conceptId: object.conceptId,
        id: object.id,
        samples: object.samples,
        uRange: object.uRange,
        vRange: object.vRange
      })
    );
}

export function buildSurfaceObjectEvidenceForScene(scene: MathSceneSpec) {
  return buildSurfaceObjectEvidence(buildSurfaceObjectsForScene(scene));
}

export function serializeSurfaceObjectPayload(surfaces: SurfaceObject[]) {
  const evidence = buildSurfaceObjectEvidence(surfaces);

  return stableSerialize({
    ...evidence,
    meshCells: surfaces.map((surface) => ({
      cells: surfaceMeshCells(surface),
      id: surface.id
    })),
    meshTriangles: surfaces.map((surface) => ({
      id: surface.id,
      triangles: surfaceMeshTriangles(surface)
    })),
    surfaces,
    wireframes: surfaces.map((surface) => ({
      id: surface.id,
      ...surfaceWireframeCurves(surface)
    }))
  } satisfies SurfaceObjectPayload);
}

export function surfaceObjectEvidenceDataAttributes(evidence: SurfaceObjectEvidence): Record<string, string> {
  return {
    "data-viz-manim-surface-bounds": evidence.boundsSummary,
    "data-viz-manim-surface-cell-count": String(evidence.cellCount),
    "data-viz-manim-surface-finite-normal-count": String(evidence.finiteNormalCount),
    "data-viz-manim-surface-finite-sample-count": String(evidence.finiteSampleCount),
    "data-viz-manim-surface-grid-summary": evidence.gridSummary,
    "data-viz-manim-surface-normal-count": String(evidence.normalCount),
    "data-viz-manim-surface-object-count": String(evidence.objectCount),
    "data-viz-manim-surface-object-ids": evidence.objectIds,
    "data-viz-manim-surface-range-summary": evidence.rangeSummary,
    "data-viz-manim-surface-sample-count": String(evidence.sampleCount),
    "data-viz-manim-surface-source-contract": evidence.sourceContract,
    "data-viz-manim-surface-summary": evidence.summary,
    "data-viz-manim-surface-topology-summary": evidence.topologySummary,
    "data-viz-manim-surface-triangle-count": String(evidence.triangleCount),
    "data-viz-manim-surface-wireframe-column-count": String(evidence.wireframeColumnCount),
    "data-viz-manim-surface-wireframe-row-count": String(evidence.wireframeRowCount)
  };
}

export function partialSurfaceWireframe(surface: SurfaceObject, progress: number): SurfaceWireframeCurves {
  const visibleRows = Math.max(1, Math.min(surface.rows, Math.ceil(surface.rows * safeProgress(progress))));

  return {
    columns: Array.from({ length: surface.columns }, (_, column) =>
      Array.from({ length: visibleRows }, (_, row) => sampleAt(surface, row, column).point)
    ),
    rows: Array.from({ length: visibleRows }, (_, row) =>
      Array.from({ length: surface.columns }, (_, column) => sampleAt(surface, row, column).point)
    )
  };
}

function resampleSurfaceGrid(surface: SurfaceObject, sampleCount: number) {
  const count = Math.max(2, Math.floor(finite(sampleCount, Math.max(surface.rows, surface.columns, 2))));

  return Array.from({ length: count }, (_, row) =>
    Array.from({ length: count }, (_, column) =>
      surfacePointAt(surface, row / Math.max(1, count - 1), column / Math.max(1, count - 1))
    )
  );
}

export function alignSurfaceSamplesForMorph(source: SurfaceObject, target: SurfaceObject, sampleCount?: number): AlignedSurfaceSamples {
  const count = Math.max(
    2,
    Math.floor(finite(sampleCount ?? Math.max(source.rows, source.columns, target.rows, target.columns), 2))
  );

  return {
    columns: count,
    conceptId: source.conceptId === target.conceptId ? source.conceptId : `${source.conceptId}->${target.conceptId}`,
    rows: count,
    source: resampleSurfaceGrid(source, count),
    sourceId: source.id,
    target: resampleSurfaceGrid(target, count),
    targetId: target.id
  };
}

export function interpolateAlignedSurfaces(
  aligned: AlignedSurfaceSamples,
  progress: number,
  pathFunction?: (from: Vec3, to: Vec3, alpha: number) => Vec3
): Vec3[][] {
  const alpha = safeProgress(progress);

  return Array.from({ length: aligned.rows }, (_, row) =>
    Array.from({ length: aligned.columns }, (_, column) => {
      const source = aligned.source[row][column];
      const target = aligned.target[row][column];
      return pathFunction ? pathFunction(source, target, alpha) : interpolatePoint(source, target, alpha);
    })
  );
}
