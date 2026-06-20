export type ThreeDGraphPoint = {
  x: number;
  y: number;
  z: number;
};

export type ThreeDGraphProjectedPoint = {
  depth: number;
  x: number;
  y: number;
};

export type ThreeDGraphCamera = {
  originX: number;
  originY: number;
  xAxisX: number;
  xAxisY: number;
  yAxisX: number;
  yAxisY: number;
  zAxisX: number;
  zAxisY: number;
};

export type ThreeDGraphView = {
  azimuthDegrees: number;
  elevationScale: number;
};

export type ThreeDGraphLine = {
  depth: number;
  id: string;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
};

export type ThreeDGraphPath = {
  d: string;
  depth: number;
  id: string;
};

export type ThreeDGraphPanelColumn = {
  depth: number;
  height: number;
  id: string;
  leftFace: string;
  rightFace: string;
  topFace: string;
};

export type ThreeDGraphSurfaceSampleOptions = {
  meshResolution?: number;
  surfaceScale?: number;
};

export type ThreeDGraphPanelSample = {
  corners: ThreeDGraphPoint[];
  depth: number;
  height: number;
  id: string;
};

export type ThreeDGraphPanelSampleOptions = {
  panelScale?: number;
};

export type ThreeDGraphScene = {
  axisBoxEdges: ThreeDGraphLine[];
  baseGridLines: ThreeDGraphLine[];
  meshColumns: ThreeDGraphPath[];
  meshRows: ThreeDGraphPath[];
  panelColumns: ThreeDGraphPanelColumn[];
  peak: ThreeDGraphPoint;
  summary: {
    formula: string;
    meshResolution: number;
    panelScale: number;
    peakZ: number;
    surfaceScale: number;
  };
};

export type ThreeDGraphSceneOptions = {
  camera?: ThreeDGraphCamera;
  meshResolution?: number;
  panelScale?: number;
  surfaceScale?: number;
};

export const defaultThreeDGraphCamera: ThreeDGraphCamera = {
  originX: 320,
  originY: 286,
  xAxisX: -112,
  xAxisY: -56,
  yAxisX: 112,
  yAxisY: -56,
  zAxisX: 0,
  zAxisY: -134
};

export const defaultThreeDGraphView: ThreeDGraphView = {
  azimuthDegrees: 0,
  elevationScale: 1
};

const formula = "z = h(1 - x^2 - y^2)";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatGraphNumber(value: number) {
  return value.toFixed(2);
}

function normalizeMeshResolution(meshResolution: number | undefined) {
  return Math.max(5, Math.round(meshResolution ?? 25));
}

function pathFromPoints(points: ThreeDGraphProjectedPoint[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${formatGraphNumber(point.x)} ${formatGraphNumber(point.y)}`).join(" ");
}

function lineFromPoints(id: string, start: ThreeDGraphPoint, end: ThreeDGraphPoint, camera: ThreeDGraphCamera): ThreeDGraphLine {
  const projectedStart = projectThreeDGraphPoint(start, camera);
  const projectedEnd = projectThreeDGraphPoint(end, camera);

  return {
    depth: (projectedStart.depth + projectedEnd.depth) / 2,
    id,
    x1: projectedStart.x,
    x2: projectedEnd.x,
    y1: projectedStart.y,
    y2: projectedEnd.y
  };
}

function polygonPath(points: ThreeDGraphPoint[], camera: ThreeDGraphCamera) {
  const projected = points.map((point) => projectThreeDGraphPoint(point, camera));
  return `${pathFromPoints(projected)} Z`;
}

function surfaceZ(x: number, y: number, surfaceScale: number) {
  return clamp(surfaceScale * (1 - x * x - y * y), 0, 1.55);
}

export function buildThreeDGraphSurfaceSamples(options: ThreeDGraphSurfaceSampleOptions = {}): ThreeDGraphPoint[] {
  const meshResolution = normalizeMeshResolution(options.meshResolution);
  const surfaceScale = clamp(options.surfaceScale ?? 1, 0.2, 1.6);
  const step = 2 / (meshResolution - 1);
  const samples = Array.from({ length: meshResolution }, (_, index) => -1 + index * step);

  return samples.flatMap((y) => samples.map((x) => ({ x, y, z: surfaceZ(x, y, surfaceScale) })));
}

export function buildThreeDGraphPanelSamples(options: ThreeDGraphPanelSampleOptions = {}): ThreeDGraphPanelSample[] {
  const panelScale = clamp(options.panelScale ?? 1, 0.2, 1.6);
  const panelSamples = [-0.8, -0.4, 0, 0.4, 0.8];
  const columnHalfWidth = 0.13;

  return panelSamples
    .flatMap((x, xIndex) =>
      panelSamples.map((y, yIndex) => {
        const height = clamp((0.18 + surfaceZ(x, y, 1) * 0.76) * panelScale, 0.15, 1.35);
        const x0 = x - columnHalfWidth;
        const x1 = x + columnHalfWidth;
        const y0 = y - columnHalfWidth;
        const y1 = y + columnHalfWidth;
        const bottomFrontLeft = { x: x0, y: y0, z: 0 };
        const bottomFrontRight = { x: x1, y: y0, z: 0 };
        const bottomBackLeft = { x: x0, y: y1, z: 0 };
        const bottomBackRight = { x: x1, y: y1, z: 0 };
        const topFrontLeft = { x: x0, y: y0, z: height };
        const topFrontRight = { x: x1, y: y0, z: height };
        const topBackLeft = { x: x0, y: y1, z: height };
        const topBackRight = { x: x1, y: y1, z: height };

        return {
          corners: [
            bottomFrontLeft,
            bottomFrontRight,
            bottomBackLeft,
            bottomBackRight,
            topFrontLeft,
            topFrontRight,
            topBackLeft,
            topBackRight
          ],
          depth: x + y,
          height,
          id: `panel-${xIndex}-${yIndex}`
        };
      })
    )
    .sort((a, b) => a.depth - b.depth);
}

function rotateAxisPair(
  xAxis: { x: number; y: number },
  yAxis: { x: number; y: number },
  degrees: number
) {
  const radians = degrees * (Math.PI / 180);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    xAxis: {
      x: xAxis.x * cos + yAxis.x * sin,
      y: xAxis.y * cos + yAxis.y * sin
    },
    yAxis: {
      x: yAxis.x * cos - xAxis.x * sin,
      y: yAxis.y * cos - xAxis.y * sin
    }
  };
}

export function buildThreeDGraphCameraFromView(view: ThreeDGraphView): ThreeDGraphCamera {
  const elevationScale = clamp(view.elevationScale, 0.55, 1.25);
  const rotated = rotateAxisPair(
    { x: defaultThreeDGraphCamera.xAxisX, y: defaultThreeDGraphCamera.xAxisY },
    { x: defaultThreeDGraphCamera.yAxisX, y: defaultThreeDGraphCamera.yAxisY },
    view.azimuthDegrees
  );

  return {
    ...defaultThreeDGraphCamera,
    xAxisX: rotated.xAxis.x,
    xAxisY: rotated.xAxis.y * elevationScale,
    yAxisX: rotated.yAxis.x,
    yAxisY: rotated.yAxis.y * elevationScale,
    zAxisY: defaultThreeDGraphCamera.zAxisY * elevationScale
  };
}

export function rotateThreeDGraphView(
  view: ThreeDGraphView,
  drag: { deltaX: number; deltaY: number }
): ThreeDGraphView {
  return {
    azimuthDegrees: view.azimuthDegrees + drag.deltaX * 0.35,
    elevationScale: clamp(view.elevationScale - drag.deltaY * 0.0035, 0.55, 1.25)
  };
}

export function projectThreeDGraphPoint(point: ThreeDGraphPoint, camera: ThreeDGraphCamera): ThreeDGraphProjectedPoint {
  return {
    depth: point.x + point.y + point.z * 0.4,
    x: camera.originX + point.x * camera.xAxisX + point.y * camera.yAxisX + point.z * camera.zAxisX,
    y: camera.originY + point.x * camera.xAxisY + point.y * camera.yAxisY + point.z * camera.zAxisY
  };
}

export function threeDGraphScalesFromControls(value: number, comparison: number) {
  return {
    panelScale: 0.65 + (clamp(comparison, 0, 10) / 10) * 0.7,
    surfaceScale: 0.75 + (clamp(value, 0, 10) / 10) * 0.7
  };
}

export function formatThreeDGraphSummary(options: Pick<Required<ThreeDGraphSceneOptions>, "meshResolution" | "panelScale" | "surfaceScale">) {
  return `Surface model: ${formula}; surface height = ${formatGraphNumber(options.surfaceScale)}, panel scale = ${formatGraphNumber(options.panelScale)}, ${options.meshResolution} x ${options.meshResolution} mesh.`;
}

export function buildThreeDGraphScene(options: ThreeDGraphSceneOptions = {}): ThreeDGraphScene {
  const camera = options.camera ?? defaultThreeDGraphCamera;
  const meshResolution = normalizeMeshResolution(options.meshResolution);
  const panelScale = clamp(options.panelScale ?? 1, 0.2, 1.6);
  const surfaceScale = clamp(options.surfaceScale ?? 1, 0.2, 1.6);
  const surfaceSamples = buildThreeDGraphSurfaceSamples({ meshResolution, surfaceScale });
  const sampleRows = Array.from({ length: meshResolution }, (_, rowIndex) =>
    surfaceSamples.slice(rowIndex * meshResolution, (rowIndex + 1) * meshResolution)
  );
  const meshRows = sampleRows.map((samples, rowIndex) => {
    const points = samples.map((sample) => projectThreeDGraphPoint(sample, camera));

    return {
      d: pathFromPoints(points),
      depth: points.reduce((sum, point) => sum + point.depth, 0) / points.length,
      id: `surface-row-${rowIndex}`
    };
  });
  const meshColumns = Array.from({ length: meshResolution }, (_, columnIndex) => {
    const points = sampleRows.map((row) => projectThreeDGraphPoint(row[columnIndex], camera));

    return {
      d: pathFromPoints(points),
      depth: points.reduce((sum, point) => sum + point.depth, 0) / points.length,
      id: `surface-column-${columnIndex}`
    };
  });
  const gridSamples = Array.from({ length: 7 }, (_, index) => -1 + index * (2 / 6));
  const baseGridLines = [
    ...gridSamples.map((x, index) => lineFromPoints(`base-grid-x-${index}`, { x, y: -1, z: 0 }, { x, y: 1, z: 0 }, camera)),
    ...gridSamples.map((y, index) => lineFromPoints(`base-grid-y-${index}`, { x: -1, y, z: 0 }, { x: 1, y, z: 0 }, camera))
  ];
  const baseCorners = [
    { x: -1, y: -1, z: 0 },
    { x: 1, y: -1, z: 0 },
    { x: 1, y: 1, z: 0 },
    { x: -1, y: 1, z: 0 }
  ];
  const topCorners = baseCorners.map((point) => ({ ...point, z: 1 }));
  const axisBoxEdges = [
    ...baseCorners.map((point, index) => lineFromPoints(`box-vertical-${index}`, point, topCorners[index], camera)),
    ...baseCorners.map((point, index) => lineFromPoints(`box-base-${index}`, point, baseCorners[(index + 1) % baseCorners.length], camera)),
    ...topCorners.map((point, index) => lineFromPoints(`box-top-${index}`, point, topCorners[(index + 1) % topCorners.length], camera))
  ];
  const panelColumns = buildThreeDGraphPanelSamples({ panelScale }).map((panel) => {
    const [
      bottomFrontLeft,
      bottomFrontRight,
      bottomBackLeft,
      bottomBackRight,
      topFrontLeft,
      topFrontRight,
      topBackLeft,
      topBackRight
    ] = panel.corners;

    return {
      depth: panel.depth,
      height: panel.height,
      id: panel.id,
      leftFace: polygonPath([bottomFrontLeft, bottomBackLeft, topBackLeft, topFrontLeft], camera),
      rightFace: polygonPath([bottomFrontRight, bottomBackRight, topBackRight, topFrontRight], camera),
      topFace: polygonPath([topFrontLeft, topFrontRight, topBackRight, topBackLeft], camera)
    };
  });

  return {
    axisBoxEdges,
    baseGridLines,
    meshColumns,
    meshRows,
    panelColumns,
    peak: { x: 0, y: 0, z: surfaceZ(0, 0, surfaceScale) },
    summary: {
      formula,
      meshResolution,
      panelScale,
      peakZ: surfaceZ(0, 0, surfaceScale),
      surfaceScale
    }
  };
}
