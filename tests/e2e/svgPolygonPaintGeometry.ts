export type SvgAffineMatrix = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

export type SvgPoint = { x: number; y: number };

export type SvgPaintBounds = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

type StrokedPolygonPaintBoundsInput = {
  matrix: SvgAffineMatrix;
  points: SvgPoint[];
  strokeLinejoin: "bevel" | "miter";
  strokeMiterLimit: number;
  strokeWidth: number;
};

const geometryEpsilon = 1e-9;

function cross(left: SvgPoint, right: SvgPoint) {
  return left.x * right.y - left.y * right.x;
}

function finitePoint(point: SvgPoint) {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function normalize(vector: SvgPoint) {
  const length = Math.hypot(vector.x, vector.y);
  if (!Number.isFinite(length) || length <= geometryEpsilon) {
    throw new Error("A painted SVG polygon cannot contain a zero-length edge.");
  }
  return { x: vector.x / length, y: vector.y / length };
}

export function affineScreenPoint(point: SvgPoint, matrix: SvgAffineMatrix): SvgPoint {
  if (!finitePoint(point) || !Object.values(matrix).every(Number.isFinite)) {
    throw new Error("SVG paint geometry requires finite points and matrix coefficients.");
  }
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f
  };
}

/**
 * Returns the screen-space paint bounds for a closed, filled polygon.
 *
 * SVG strokes are centred on each edge. At a miter join, the painted outline
 * extends to the intersection of adjacent offset edge lines, which can be
 * farther from a vertex than half the stroke width. The intersection is used
 * only while it remains within the SVG stroke-miterlimit; otherwise the join
 * falls back to the bevel endpoints already included in the candidate hull.
 */
export function strokedPolygonPaintBounds({
  matrix,
  points,
  strokeLinejoin,
  strokeMiterLimit,
  strokeWidth
}: StrokedPolygonPaintBoundsInput): SvgPaintBounds {
  if (points.length < 3 || !points.every(finitePoint)) {
    throw new Error("SVG paint geometry requires at least three finite polygon points.");
  }
  if (!Number.isFinite(strokeWidth) || strokeWidth < 0) {
    throw new Error("SVG paint geometry requires a finite, non-negative stroke width.");
  }
  if (!Number.isFinite(strokeMiterLimit) || strokeMiterLimit < 1) {
    throw new Error("SVG paint geometry requires a valid stroke-miterlimit.");
  }

  const strokeRadius = strokeWidth / 2;
  const paintHull: SvgPoint[] = [...points];

  if (strokeRadius > 0) {
    for (let index = 0; index < points.length; index += 1) {
      const previous = points[(index - 1 + points.length) % points.length];
      const current = points[index];
      const next = points[(index + 1) % points.length];
      const previousDirection = normalize({
        x: current.x - previous.x,
        y: current.y - previous.y
      });
      const nextDirection = normalize({
        x: next.x - current.x,
        y: next.y - current.y
      });
      const previousNormal = { x: -previousDirection.y, y: previousDirection.x };
      const nextNormal = { x: -nextDirection.y, y: nextDirection.x };

      for (const side of [-1, 1]) {
        const previousOffset = {
          x: current.x + side * strokeRadius * previousNormal.x,
          y: current.y + side * strokeRadius * previousNormal.y
        };
        const nextOffset = {
          x: current.x + side * strokeRadius * nextNormal.x,
          y: current.y + side * strokeRadius * nextNormal.y
        };
        paintHull.push(previousOffset, nextOffset);

        if (strokeLinejoin !== "miter") continue;
        const denominator = cross(previousDirection, nextDirection);
        if (Math.abs(denominator) <= geometryEpsilon) continue;
        const offsetDelta = {
          x: nextOffset.x - previousOffset.x,
          y: nextOffset.y - previousOffset.y
        };
        const previousLineDistance = cross(offsetDelta, nextDirection) / denominator;
        const intersection = {
          x: previousOffset.x + previousLineDistance * previousDirection.x,
          y: previousOffset.y + previousLineDistance * previousDirection.y
        };
        const miterLength = Math.hypot(
          intersection.x - current.x,
          intersection.y - current.y
        );
        if (miterLength <= strokeMiterLimit * strokeRadius + geometryEpsilon) {
          paintHull.push(intersection);
        }
      }
    }
  }

  const screenHull = paintHull.map((point) => affineScreenPoint(point, matrix));
  return {
    bottom: Math.max(...screenHull.map((point) => point.y)),
    left: Math.min(...screenHull.map((point) => point.x)),
    right: Math.max(...screenHull.map((point) => point.x)),
    top: Math.min(...screenHull.map((point) => point.y))
  };
}
