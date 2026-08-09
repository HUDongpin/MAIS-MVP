import {
  groupCoincidentDiagramPoints,
  isCircleInsideDiagramBounds,
  isPointInsideDiagramBounds
} from "@/lib/mathDiagramGeometry";

export type EulerVertexKey = "A" | "B" | "C";
export type EulerPoint = { x: number; y: number };
export type EulerTriangle = Record<EulerVertexKey, EulerPoint>;

export type EulerFields = {
  area: number;
  circumRadius: number;
  OG: number;
  GH: number;
  ratioGH_OG: number;
  ninePointRadius: number;
  collinear: boolean;
  eulerDegenerate: boolean;
  O: EulerPoint;
  G: EulerPoint;
  H: EulerPoint;
  N: EulerPoint;
  eulerLine: { a: EulerPoint; b: EulerPoint } | null;
  ninePointDots: EulerPoint[];
};

export const eulerVertexKeys: EulerVertexKey[] = ["A", "B", "C"];
export const eulerPlot = { x: 30, y: 30, width: 600, height: 400 };

const plotBounds = {
  left: eulerPlot.x,
  right: eulerPlot.x + eulerPlot.width,
  top: eulerPlot.y,
  bottom: eulerPlot.y + eulerPlot.height
};
const plotGeometryInset = 14;

export const initialEulerTriangle: EulerTriangle = {
  A: { x: 320, y: 80 },
  B: { x: 190, y: 320 },
  C: { x: 500, y: 300 }
};

function sq(value: number) {
  return value * value;
}

function distance(a: EulerPoint, b: EulerPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: EulerPoint, b: EulerPoint): EulerPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function triangleArea(triangle: EulerTriangle) {
  const { A, B, C } = triangle;
  return Math.abs((B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x)) / 2;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function add(a: EulerPoint, b: EulerPoint): EulerPoint {
  return { x: a.x + b.x, y: a.y + b.y };
}

function subtract(a: EulerPoint, b: EulerPoint): EulerPoint {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(point: EulerPoint, factor: number): EulerPoint {
  return { x: point.x * factor, y: point.y * factor };
}

function projectPointToLine(point: EulerPoint, lineA: EulerPoint, lineB: EulerPoint): EulerPoint {
  const vx = lineB.x - lineA.x;
  const vy = lineB.y - lineA.y;
  const denom = vx * vx + vy * vy || 1;
  const t = ((point.x - lineA.x) * vx + (point.y - lineA.y) * vy) / denom;
  return { x: lineA.x + vx * t, y: lineA.y + vy * t };
}

function centroid(triangle: EulerTriangle): EulerPoint {
  return {
    x: (triangle.A.x + triangle.B.x + triangle.C.x) / 3,
    y: (triangle.A.y + triangle.B.y + triangle.C.y) / 3
  };
}

function circumcenter(triangle: EulerTriangle): { center: EulerPoint; degenerate: boolean } {
  const { A, B, C } = triangle;
  const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));

  if (Math.abs(d) < 0.001) {
    return { center: centroid(triangle), degenerate: true };
  }

  const a2 = sq(A.x) + sq(A.y);
  const b2 = sq(B.x) + sq(B.y);
  const c2 = sq(C.x) + sq(C.y);

  return {
    center: {
      x: (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / d,
      y: (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / d
    },
    degenerate: false
  };
}

function buildEulerLine(O: EulerPoint, H: EulerPoint): { a: EulerPoint; b: EulerPoint } | null {
  const vector = subtract(H, O);
  const length = Math.hypot(vector.x, vector.y);
  if (length < 0.001) return null;

  const unit = scale(vector, 1 / length);
  return {
    a: add(O, scale(unit, -900)),
    b: add(O, scale(unit, 900))
  };
}

export function buildEulerFields(triangle: EulerTriangle): EulerFields {
  const OResult = circumcenter(triangle);
  const O = OResult.center;
  const G = centroid(triangle);
  const H = {
    x: triangle.A.x + triangle.B.x + triangle.C.x - 2 * O.x,
    y: triangle.A.y + triangle.B.y + triangle.C.y - 2 * O.y
  };
  const N = midpoint(O, H);
  const circumRadius = distance(O, triangle.A);
  const OG = distance(O, G);
  const GH = distance(G, H);
  const ratioGH_OG = OG < 0.001 ? 0 : GH / OG;
  const cross = Math.abs((G.x - O.x) * (H.y - O.y) - (G.y - O.y) * (H.x - O.x));
  const collinearityError = cross / Math.max(1, distance(O, H));
  const eulerLine = buildEulerLine(O, H);

  return {
    area: triangleArea(triangle),
    circumRadius,
    OG,
    GH,
    ratioGH_OG,
    ninePointRadius: circumRadius / 2,
    collinear: collinearityError < 0.4,
    eulerDegenerate: OResult.degenerate || !eulerLine,
    O,
    G,
    H,
    N,
    eulerLine,
    ninePointDots: [
      midpoint(triangle.A, triangle.B),
      midpoint(triangle.B, triangle.C),
      midpoint(triangle.C, triangle.A),
      midpoint(triangle.A, H),
      midpoint(triangle.B, H),
      midpoint(triangle.C, H),
      projectPointToLine(triangle.A, triangle.B, triangle.C),
      projectPointToLine(triangle.B, triangle.C, triangle.A),
      projectPointToLine(triangle.C, triangle.A, triangle.B)
    ]
  };
}

export function constrainEulerPoint(point: EulerPoint): EulerPoint {
  return {
    x: clamp(point.x, eulerPlot.x + 32, eulerPlot.x + eulerPlot.width - 32),
    y: clamp(point.y, eulerPlot.y + 32, eulerPlot.y + eulerPlot.height - 32)
  };
}

export function canUseTriangle(triangle: EulerTriangle) {
  const separated = eulerVertexKeys.every((key, index) =>
    eulerVertexKeys.slice(index + 1).every((otherKey) => distance(triangle[key], triangle[otherKey]) > 54)
  );
  if (!separated || triangleArea(triangle) <= 2000) return false;

  const centerResult = circumcenter(triangle);
  if (centerResult.degenerate) return false;
  const O = centerResult.center;
  const G = centroid(triangle);
  const H = {
    x: triangle.A.x + triangle.B.x + triangle.C.x - 2 * O.x,
    y: triangle.A.y + triangle.B.y + triangle.C.y - 2 * O.y
  };
  const N = midpoint(O, H);
  const circumRadius = distance(O, triangle.A);
  const centersInside = [O, G, H, N].every((point) =>
    isPointInsideDiagramBounds(point, plotBounds, plotGeometryInset)
  );

  return centersInside &&
    isCircleInsideDiagramBounds(O, circumRadius, plotBounds, plotGeometryInset) &&
    isCircleInsideDiagramBounds(N, circumRadius / 2, plotBounds, plotGeometryInset);
}

export function buildEulerCenterLayout(fields: Pick<EulerFields, "O" | "G" | "H" | "N">) {
  const marks = [
    { key: "O" as const, point: fields.O, color: "#f1bd3f", vizName: "Euler center point" as const },
    { key: "G" as const, point: fields.G, color: "#f1bd3f", vizName: "Euler center point" as const },
    { key: "H" as const, point: fields.H, color: "#f1bd3f", vizName: "Euler center point" as const },
    { key: "N" as const, point: fields.N, color: "#56f1b0", vizName: "Euler center point" as const }
  ];
  const offsets = [
    { dx: 12, dy: 18, anchor: "start" as const },
    { dx: 12, dy: -10, anchor: "start" as const },
    { dx: -12, dy: -10, anchor: "end" as const },
    { dx: -12, dy: 20, anchor: "end" as const }
  ];

  const labels = groupCoincidentDiagramPoints(marks, 24).map((group, index) => {
    const point = {
      x: group.reduce((sum, mark) => sum + mark.point.x, 0) / group.length,
      y: group.reduce((sum, mark) => sum + mark.point.y, 0) / group.length
    };
    const maximumSeparation = Math.max(...group.map((mark) => distance(mark.point, point)));
    const label = group.map((mark) => mark.key).join(maximumSeparation <= 0.75 ? "=" : "≈");
    const offset = offsets[index % offsets.length];
    const estimatedWidth = Math.max(16, label.length * 12);
    const x = offset.anchor === "start"
      ? clamp(point.x + offset.dx, plotBounds.left + 6, plotBounds.right - estimatedWidth - 6)
      : clamp(point.x + offset.dx, plotBounds.left + estimatedWidth + 6, plotBounds.right - 6);

    return {
      color: group.some((mark) => mark.key === "N") && group.length === 1 ? "#56f1b0" : "#f1bd3f",
      keys: group.map((mark) => mark.key).join(","),
      label,
      point,
      textAnchor: offset.anchor,
      textX: x,
      textY: clamp(point.y + offset.dy, plotBounds.top + 20, plotBounds.bottom - 8),
      vizName: "Euler center label" as const
    };
  });

  return { points: marks, labels };
}
