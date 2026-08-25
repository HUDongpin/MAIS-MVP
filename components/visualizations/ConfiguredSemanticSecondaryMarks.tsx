import React, { type ReactNode } from "react";
import { configuredQuadrilateralGeometryModesByVariant } from "./configuredVisualizationSemanticControls";

export const CONFIGURED_SEMANTIC_SECONDARY_MARKS_SOURCE = {
  auditScope: "335 Mainland China curriculum-owned Visualization Labs",
  frozenAuditSha256: "eabf3d1cc09bebc4cf81fe040152c92def6e031b106def1b82088e223554a3ea",
  version: "a18-secondary-marks-v1"
} as const;

export const configuredSemanticSecondaryFamilies = [
  "angle-measure",
  "line-angle-geometry",
  "triangle-geometry",
  "quadrilateral-geometry",
  "right-triangle",
  "circle-sector",
  "shape-classifier",
  "solid-projection",
  "reflection-symmetry",
  "plane-transform",
  "coordinate-position",
  "analytic-line-circle",
  "complex-plane",
  "symbolic-equation",
  "expression-equivalence",
  "algebra-tiles-polynomial",
  "linear-system",
  "inequality-solver",
  "set-logic",
  "linear-function",
  "reciprocal-function",
  "quadratic-features",
  "quadratic-inequality",
  "function-properties",
  "exponential-logarithmic",
  "sequence-model",
  "unit-circle-wave",
  "trigonometric-identity",
  "triangle-trigonometry",
  "trigonometric-synthesis",
  "derivative-rate-area",
  "derivative-synthesis",
  "optimization-derivative",
  "vector-operations",
  "space-vector-plane",
  "conic-sections",
  "geometric-modeling",
  "advanced-strategy",
  "bivariate-regression",
  "statistics-distribution",
  "composite-split",
  "catalog-scope"
] as const;

export type ConfiguredSemanticSecondaryFamily =
  (typeof configuredSemanticSecondaryFamilies)[number];

export type SemanticPoint = { x: number; y: number };

export type ConfiguredSemanticCompositeStrand = {
  family: string;
  variant?: string;
};

export type ConfiguredSemanticSecondaryMathInput = {
  comparison: number;
  compositeStrands?: readonly ConfiguredSemanticCompositeStrand[];
  family: ConfiguredSemanticSecondaryFamily;
  mode: number;
  value: number;
  variant: string;
};

export type ConfiguredSemanticSecondaryMathState = {
  active?: ConfiguredSemanticSecondaryMathState;
  check: string;
  comparisonSeries?: readonly SemanticPoint[];
  family: ConfiguredSemanticSecondaryFamily;
  formula: string;
  kind: string;
  labels: readonly string[];
  metrics: Readonly<Record<string, number | string | boolean>>;
  points: Readonly<Record<string, SemanticPoint>>;
  series: readonly SemanticPoint[];
  strand?: string;
  variant: string;
};

export type ConfiguredSemanticSecondaryVizTheme = {
  axis: string;
  axisStrong: string;
  grid: string;
  labelFill: string;
  labelStroke: string;
  labelText: string;
  neutralStroke: string;
  pointStroke: string;
  softFill: string;
  text: string;
  textMuted: string;
};

export type ConfiguredSemanticSecondaryStrings = {
  checkLabel?: string;
  formulaLabel?: string;
  noModelLabel?: string;
  strandLabel?: string;
};

export type ConfiguredSemanticSecondaryMarksProps =
  ConfiguredSemanticSecondaryMathInput & {
    accent: string;
    renderCompositeStrand?: (
      request: ConfiguredSemanticCompositeStrand & {
        accent: string;
        comparison: number;
        mode: number;
        strings?: ConfiguredSemanticSecondaryStrings;
        value: number;
        vizTheme: ConfiguredSemanticSecondaryVizTheme;
      }
    ) => ReactNode;
    strings?: ConfiguredSemanticSecondaryStrings;
    vizTheme: ConfiguredSemanticSecondaryVizTheme;
  };

const EPSILON = 1e-9;

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function fixed(value: number, digits = 2) {
  const rounded = Number(value.toFixed(digits));
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

function distance(a: SemanticPoint, b: SemanticPoint) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function direction(a: SemanticPoint, b: SemanticPoint): SemanticPoint {
  return { x: b.x - a.x, y: b.y - a.y };
}

function normalizedCrossProduct(first: SemanticPoint, second: SemanticPoint) {
  const denominator = Math.max(EPSILON, Math.hypot(first.x, first.y) * Math.hypot(second.x, second.y));
  return (first.x * second.y - first.y * second.x) / denominator;
}

function normalizedDotProduct(first: SemanticPoint, second: SemanticPoint) {
  const denominator = Math.max(EPSILON, Math.hypot(first.x, first.y) * Math.hypot(second.x, second.y));
  return (first.x * second.x + first.y * second.y) / denominator;
}

function acuteAngleBetween(first: SemanticPoint, second: SemanticPoint) {
  const cosine = Math.abs(clamp(normalizedDotProduct(first, second), -1, 1));
  return Math.acos(cosine) * 180 / Math.PI;
}

function finiteSegmentIntersection(
  firstA: SemanticPoint,
  firstB: SemanticPoint,
  secondA: SemanticPoint,
  secondB: SemanticPoint
) {
  const firstDirection = direction(firstA, firstB);
  const secondDirection = direction(secondA, secondB);
  const denominator = firstDirection.x * secondDirection.y - firstDirection.y * secondDirection.x;
  if (Math.abs(denominator) < EPSILON) return null;
  const offset = direction(firstA, secondA);
  const firstParameter = (offset.x * secondDirection.y - offset.y * secondDirection.x) / denominator;
  const secondParameter = (offset.x * firstDirection.y - offset.y * firstDirection.x) / denominator;
  return {
    firstParameter,
    point: {
      x: firstA.x + firstDirection.x * firstParameter,
      y: firstA.y + firstDirection.y * firstParameter
    },
    secondParameter
  };
}

function angleAt(vertex: SemanticPoint, a: SemanticPoint, b: SemanticPoint) {
  const first = { x: a.x - vertex.x, y: a.y - vertex.y };
  const second = { x: b.x - vertex.x, y: b.y - vertex.y };
  const denominator = Math.hypot(first.x, first.y) * Math.hypot(second.x, second.y);
  const cosine = clamp(
    (first.x * second.x + first.y * second.y) / Math.max(EPSILON, denominator),
    -1,
    1
  );
  return (Math.acos(cosine) * 180) / Math.PI;
}

function makeState(
  input: ConfiguredSemanticSecondaryMathInput,
  state: Omit<
    ConfiguredSemanticSecondaryMathState,
    "family" | "variant" | "labels" | "points" | "series"
  > &
    Partial<
      Pick<
        ConfiguredSemanticSecondaryMathState,
        "labels" | "points" | "series"
      >
    >
): ConfiguredSemanticSecondaryMathState {
  return {
    family: input.family,
    labels: [],
    points: {},
    series: [],
    variant: input.variant,
    ...state
  };
}

function buildSimilarTriangleState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const scaleFactor = clamp(finite(input.value, 2), 1, 3);
  const sourceSide = clamp(finite(input.comparison, 4), 2, 6);
  const sourceHeight = sourceSide * 0.72;
  const a = { x: -5, y: -1.5 };
  const b = { x: a.x + sourceSide, y: a.y };
  const c = { x: a.x + sourceSide * 0.34, y: a.y + sourceHeight };
  const gap = 1.4;
  const aPrime = { x: b.x + gap, y: a.y };
  const bPrime = { x: aPrime.x + sourceSide * scaleFactor, y: aPrime.y };
  const cPrime = {
    x: aPrime.x + sourceSide * 0.34 * scaleFactor,
    y: aPrime.y + sourceHeight * scaleFactor
  };
  const sourceAB = distance(a, b);
  const sourceBC = distance(b, c);
  const sourceCA = distance(c, a);
  const scaledAB = distance(aPrime, bPrime);
  const scaledBC = distance(bPrime, cPrime);
  const scaledCA = distance(cPrime, aPrime);
  const correspondingAngleResidual = angleAt(a, b, c) - angleAt(aPrime, bPrime, cPrime);

  return makeState(input, {
    check: `AB=${fixed(sourceAB)} · A′B′=${fixed(scaledAB)} · k=${fixed(scaleFactor)}`,
    formula: `A′B′/AB = B′C′/BC = C′A′/CA = ${fixed(scaleFactor)}`,
    kind: "similar-triangles",
    metrics: {
      correspondingAngleResidual,
      scaleFactor,
      scaledAB,
      scaledBC,
      scaledCA,
      sideRatioResidualAB: scaledAB / sourceAB - scaleFactor,
      sideRatioResidualBC: scaledBC / sourceBC - scaleFactor,
      sideRatioResidualCA: scaledCA / sourceCA - scaleFactor,
      sourceAB,
      sourceBC,
      sourceCA,
      sourceSide
    },
    points: { a, aPrime, b, bPrime, c, cPrime }
  });
}

function buildTriangleState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  if (input.variant === "similar-triangle-ratios") {
    return buildSimilarTriangleState(input);
  }

  const value = clamp(finite(input.value, 5), 0, 10);
  const comparison = clamp(finite(input.comparison, 5), 0, 10);
  const a = { x: -3.2, y: -2 };
  const b = { x: 3.2, y: -2 };
  const c = { x: -1.2 + value * 0.24, y: 1.4 + comparison * 0.1 };
  const angleA = angleAt(a, b, c);
  const angleB = angleAt(b, a, c);
  const angleC = angleAt(c, a, b);
  const angleSum = angleA + angleB + angleC;

  return makeState(input, {
    check: `${fixed(angleA, 1)}° + ${fixed(angleB, 1)}° + ${fixed(angleC, 1)}° = ${fixed(angleSum, 1)}°`,
    formula: "A + B + C = 180°",
    kind: "triangle",
    metrics: { angleA, angleB, angleC, angleSum },
    points: { a, b, c }
  });
}

type ClassifiedPolygonName =
  (typeof configuredQuadrilateralGeometryModesByVariant)[
    keyof typeof configuredQuadrilateralGeometryModesByVariant
  ][number]["id"];

function rotatePoint(point: SemanticPoint, radians: number): SemanticPoint {
  return {
    x: point.x * Math.cos(radians) - point.y * Math.sin(radians),
    y: point.x * Math.sin(radians) + point.y * Math.cos(radians)
  };
}

function polygonSignedArea(points: readonly SemanticPoint[]) {
  return points.reduce((total, point, index) => {
    const next = points[(index + 1) % points.length];
    return total + point.x * next.y - next.x * point.y;
  }, 0) / 2;
}

function parallelDirection(first: SemanticPoint, second: SemanticPoint) {
  const denominator = Math.max(EPSILON, Math.hypot(first.x, first.y) * Math.hypot(second.x, second.y));
  return Math.abs(first.x * second.y - first.y * second.x) / denominator < 1e-9;
}

function buildClassifiedPolygonState(
  input: ConfiguredSemanticSecondaryMathInput,
  shapeName: ClassifiedPolygonName
): ConfiguredSemanticSecondaryMathState {
  const size = clamp(finite(input.value, 4), 2, 6);
  const orientationDegrees = clamp(finite(input.comparison, 1), -3, 3) * 12;
  const orientation = orientationDegrees * Math.PI / 180;
  const canonical = (() => {
    switch (shapeName) {
      case "triangle":
        return [
          { x: -0.65 * size, y: -0.42 * size },
          { x: 0.65 * size, y: -0.42 * size },
          { x: -0.12 * size, y: 0.56 * size }
        ];
      case "quadrilateral":
        return [
          { x: -0.67 * size, y: -0.44 * size },
          { x: 0.62 * size, y: -0.34 * size },
          { x: 0.43 * size, y: 0.57 * size },
          { x: -0.51 * size, y: 0.37 * size }
        ];
      case "trapezoid":
        return [
          { x: -0.72 * size, y: -0.44 * size },
          { x: 0.72 * size, y: -0.44 * size },
          { x: 0.4 * size, y: 0.48 * size },
          { x: -0.32 * size, y: 0.48 * size }
        ];
      case "parallelogram":
      case "composition":
        return [
          { x: -0.68 * size, y: -0.43 * size },
          { x: 0.48 * size, y: -0.43 * size },
          { x: 0.68 * size, y: 0.43 * size },
          { x: -0.48 * size, y: 0.43 * size }
        ];
      case "rectangle":
        return [
          { x: -0.7 * size, y: -0.42 * size },
          { x: 0.7 * size, y: -0.42 * size },
          { x: 0.7 * size, y: 0.42 * size },
          { x: -0.7 * size, y: 0.42 * size }
        ];
      case "rhombus":
        return [
          { x: 0, y: -0.68 * size },
          { x: 0.72 * size, y: 0 },
          { x: 0, y: 0.68 * size },
          { x: -0.72 * size, y: 0 }
        ];
      case "square":
        return [
          { x: -0.56 * size, y: -0.56 * size },
          { x: 0.56 * size, y: -0.56 * size },
          { x: 0.56 * size, y: 0.56 * size },
          { x: -0.56 * size, y: 0.56 * size }
        ];
    }
  })();
  const series = canonical.map((point) => rotatePoint(point, orientation));
  const sideLengths = series.map((point, index) => distance(point, series[(index + 1) % series.length]));
  const equalSideCount = sideLengths.filter((length) => Math.abs(length - sideLengths[0]) < 1e-9).length;
  const rightAngleCount = series.filter((point, index) => {
    const previous = series[(index + series.length - 1) % series.length];
    const next = series[(index + 1) % series.length];
    return Math.abs(angleAt(point, previous, next) - 90) < 1e-9;
  }).length;
  const parallelPairCount = series.length === 4
    ? Number(parallelDirection(
        { x: series[1].x - series[0].x, y: series[1].y - series[0].y },
        { x: series[2].x - series[3].x, y: series[2].y - series[3].y }
      )) + Number(parallelDirection(
        { x: series[2].x - series[1].x, y: series[2].y - series[1].y },
        { x: series[3].x - series[0].x, y: series[3].y - series[0].y }
      ))
    : 0;
  const area = Math.abs(polygonSignedArea(series));
  const triangleOneArea = series.length === 4
    ? Math.abs(polygonSignedArea([series[0], series[1], series[2]]))
    : area;
  const triangleTwoArea = series.length === 4
    ? Math.abs(polygonSignedArea([series[0], series[2], series[3]]))
    : 0;
  const classificationSatisfied = (() => {
    switch (shapeName) {
      case "triangle": return series.length === 3;
      case "quadrilateral": return series.length === 4 && parallelPairCount === 0 && rightAngleCount === 0;
      case "trapezoid": return series.length === 4 && parallelPairCount === 1;
      case "parallelogram":
      case "composition": return series.length === 4 && parallelPairCount === 2;
      case "rectangle": return series.length === 4 && parallelPairCount === 2 && rightAngleCount === 4;
      case "rhombus": return series.length === 4 && parallelPairCount === 2 && equalSideCount === 4;
      case "square": return series.length === 4 && parallelPairCount === 2 && rightAngleCount === 4 && equalSideCount === 4;
    }
  })();
  const propertyFormula = (() => {
    switch (shapeName) {
      case "triangle": return "n = 3";
      case "quadrilateral": return "n = 4";
      case "trapezoid": return "AB ∥ CD · BC ∦ AD";
      case "parallelogram": return "AB ∥ CD · BC ∥ AD";
      case "rectangle": return "AB ∥ CD · BC ∥ AD · ∠A=∠B=∠C=∠D=90°";
      case "rhombus": return "AB = BC = CD = DA · AB ∥ CD · BC ∥ AD";
      case "square": return "AB = BC = CD = DA · ∠A=∠B=∠C=∠D=90°";
      case "composition": return "A_Q = A_△1 + A_△2";
    }
  })();
  const formula = `${propertyFormula} · A = ${fixed(area)}`;

  return makeState(input, {
    check: `n=${series.length} · n∥=${parallelPairCount} · n90=${rightAngleCount} · n₌=${equalSideCount} · ✓=${classificationSatisfied ? 1 : 0}`,
    formula,
    kind: "classified-polygon",
    metrics: {
      area,
      classificationSatisfied,
      compositionParts: shapeName === "composition" ? 2 : 1,
      compositionResidual: area - triangleOneArea - triangleTwoArea,
      equalSideCount,
      orientationDegrees,
      parallelPairCount,
      pointCount: series.length,
      rightAngleCount,
      shapeName,
      size,
      triangleOneArea,
      triangleTwoArea
    },
    points: Object.fromEntries(series.map((point, index) => [String.fromCharCode(97 + index), point])),
    series
  });
}

function buildTransformState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const source = {
    x: 1.5 + clamp(finite(input.value, 5), 0, 10) * 0.22,
    y: 0.8 + clamp(finite(input.comparison, 5), 0, 10) * 0.16
  };
  const center = { x: 0, y: 0 };
  const transformMode = ((Math.trunc(finite(input.mode, 0)) % 4) + 4) % 4;
  const radians = Math.PI / 3;
  let target: SemanticPoint;
  let formula: string;

  if (transformMode === 0) {
    target = { x: source.x + 1.5, y: source.y - 1 };
    formula = "(x, y) → (x + 1.5, y − 1)";
  } else if (transformMode === 1) {
    target = { x: -source.x, y: source.y };
    formula = "(x, y) → (−x, y)";
  } else if (transformMode === 2) {
    target = {
      x: source.x * Math.cos(radians) - source.y * Math.sin(radians),
      y: source.x * Math.sin(radians) + source.y * Math.cos(radians)
    };
    formula = "R₆₀°(x, y)";
  } else {
    target = { x: source.x * 1.4, y: source.y * 1.4 };
    formula = "(x, y) → (1.4x, 1.4y)";
  }

  const distanceBefore = distance(center, source);
  const distanceAfter = distance(center, target);
  return makeState(input, {
    check:
      transformMode === 2
        ? `|OP| = |OP′| = ${fixed(distanceBefore)}`
        : `${fixed(source.x)}, ${fixed(source.y)} → ${fixed(target.x)}, ${fixed(target.y)}`,
    formula,
    kind: "transform",
    metrics: {
      distanceAfter,
      distanceBefore,
      transformMode
    },
    points: { center, source, target }
  });
}

function buildAnalyticState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const value = clamp(finite(input.value, 5), 0, 10);
  const comparison = clamp(finite(input.comparison, 5), 0, 10);
  const slope = 0.4 + value * 0.08;
  const intercept = -1 + comparison * 0.16;
  const center = { x: -0.8 + value * 0.1, y: -0.4 + comparison * 0.08 };
  const radius = 1.4 + comparison * 0.06;
  const theta = 0.35 + value * 0.12;
  const circlePoint = {
    x: center.x + radius * Math.cos(theta),
    y: center.y + radius * Math.sin(theta)
  };
  const linePoint = { x: 2, y: slope * 2 + intercept };
  const circleResidual =
    (circlePoint.x - center.x) ** 2 +
    (circlePoint.y - center.y) ** 2 -
    radius ** 2;
  const lineResidual = linePoint.y - slope * linePoint.x - intercept;

  return makeState(input, {
    check: `r_line = ${fixed(lineResidual, 6)} · r_circle = ${fixed(circleResidual, 6)}`,
    formula: `y = ${fixed(slope)}x ${intercept >= 0 ? "+" : "−"} ${fixed(Math.abs(intercept))} · (x − ${fixed(center.x)})² + (y − ${fixed(center.y)})² = ${fixed(radius ** 2)}`,
    kind: "analytic",
    metrics: {
      circleResidual,
      intercept,
      lineResidual,
      radius,
      slope
    },
    points: { center, circlePoint, linePoint }
  });
}

function buildComplexState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const real = -4 + clamp(finite(input.value, 5), 0, 10) * 0.8;
  const imaginary = -3 + clamp(finite(input.comparison, 5), 0, 10) * 0.6;
  const modulus = Math.hypot(real, imaginary);
  const argument = Math.atan2(imaginary, real);
  const conjugate = { x: real, y: -imaginary };
  const rotationDegrees = 30 + (Math.abs(Math.trunc(finite(input.mode, 0))) % 4) * 15;
  const rotationAngle = rotationDegrees * Math.PI / 180;
  const rotated = {
    x: real * Math.cos(rotationAngle) - imaginary * Math.sin(rotationAngle),
    y: real * Math.sin(rotationAngle) + imaginary * Math.cos(rotationAngle)
  };
  const modulusResidual = real ** 2 + imaginary ** 2 - modulus ** 2;
  const conjugateProductImaginary = real * -imaginary + imaginary * real;
  const rotationModulusResidual = Math.hypot(rotated.x, rotated.y) - modulus;

  return makeState(input, {
    check: `|z| = |R${rotationDegrees}°(z)| = ${fixed(modulus)} · arg z = ${fixed(argument, 3)} rad`,
    formula: `R${rotationDegrees}°(z) = ${fixed(rotated.x)} ${rotated.y >= 0 ? "+" : "−"} ${fixed(Math.abs(rotated.y))}i · z̄ = ${fixed(real)} ${imaginary >= 0 ? "−" : "+"} ${fixed(Math.abs(imaginary))}i`,
    kind: "complex",
    metrics: {
      argument,
      conjugateProductImaginary,
      imaginary,
      modulus,
      modulusResidual,
      real,
      rotationAngle,
      rotationDegrees,
      rotationModulusResidual
    },
    points: {
      conjugate,
      origin: { x: 0, y: 0 },
      rotated,
      z: { x: real, y: imaginary }
    }
  });
}

type ExactSolidType = "cone" | "cuboid" | "cube" | "cylinder" | "prism" | "pyramid" | "sphere";

function exactSolidMode(input: ConfiguredSemanticSecondaryMathInput, count: number) {
  return ((Math.trunc(finite(input.mode, 0)) % count) + count) % count;
}

function buildExactSolidState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState | null {
  if (input.family !== "solid-projection") return null;

  if (input.variant === "common-solids-classification") {
    const types = ["cube", "cuboid", "cylinder", "cone", "sphere"] as const;
    const properties = {
      cube: { curvedSurfaces: 0, edges: 12, flatFaces: 6, vertices: 8 },
      cuboid: { curvedSurfaces: 0, edges: 12, flatFaces: 6, vertices: 8 },
      cylinder: { curvedSurfaces: 1, edges: 2, flatFaces: 2, vertices: 0 },
      cone: { curvedSurfaces: 1, edges: 1, flatFaces: 1, vertices: 1 },
      sphere: { curvedSurfaces: 1, edges: 0, flatFaces: 0, vertices: 0 }
    } as const;
    const solidType = types[exactSolidMode(input, types.length)];
    const size = Math.round(clamp(finite(input.value, 3), 1, 6));
    const featureFocus = Math.round(clamp(finite(input.comparison, 0), 0, 2));
    const featureNames = ["faces", "edges", "vertices"] as const;
    const property = properties[solidType];
    return makeState(input, {
      check: `${solidType}: focus=${featureNames[featureFocus]} · F=${property.flatFaces}+${property.curvedSurfaces} curved · E=${property.edges} · V=${property.vertices}`,
      formula: `flat faces=${property.flatFaces} · curved surfaces=${property.curvedSurfaces} · edges=${property.edges} · vertices=${property.vertices}`,
      kind: "solid",
      metrics: {
        ...property,
        displayMode: solidType,
        featureFocus,
        featureFocusName: featureNames[featureFocus],
        size,
        solidDepth: solidType === "cuboid" ? Math.max(1, size - 1) : size,
        solidHeight: solidType === "cuboid" ? size + 1 : size,
        solidModel: "classification",
        solidType,
        solidWidth: solidType === "cuboid" ? size + 2 : size
      }
    });
  }

  if (input.variant === "cylinder-cone-volume") {
    const solidType = (["cylinder", "cone"] as const)[exactSolidMode(input, 2)];
    const radius = Math.round(clamp(finite(input.value, 3), 1, 6));
    const height = Math.round(clamp(finite(input.comparison, 5), 1, 10));
    const slantHeight = Math.hypot(radius, height);
    const volumePiCoefficient = solidType === "cylinder"
      ? radius ** 2 * height
      : radius ** 2 * height / 3;
    const surfaceAreaPiCoefficient = solidType === "cylinder"
      ? 2 * radius * (radius + height)
      : radius * (radius + slantHeight);
    const volume = volumePiCoefficient * Math.PI;
    const surfaceArea = surfaceAreaPiCoefficient * Math.PI;
    return makeState(input, {
      check: `r=${radius} · h=${height} · V≈${fixed(volume)} · SA≈${fixed(surfaceArea)}`,
      formula: solidType === "cylinder"
        ? `V = πr²h = ${fixed(volumePiCoefficient)}π · SA = 2πr(r+h) = ${fixed(surfaceAreaPiCoefficient)}π`
        : `V = ⅓πr²h = ${fixed(volumePiCoefficient)}π · SA = πr(r+ℓ) ≈ ${fixed(surfaceArea)}`,
      kind: "solid",
      metrics: {
        displayMode: solidType,
        height,
        radius,
        slantHeight,
        solidDepth: radius * 2,
        solidHeight: height,
        solidModel: "cylinder-cone-volume",
        solidType,
        solidWidth: radius * 2,
        surfaceArea,
        surfaceAreaPiCoefficient,
        volume,
        volumePiCoefficient
      }
    });
  }

  if (input.variant !== "surface-volume-solids") return null;

  const solidType = (["prism", "pyramid", "cylinder", "cone", "sphere"] as const)[
    exactSolidMode(input, 5)
  ];
  const primaryMeasure = Math.round(clamp(finite(input.value, 3), 1, 6));
  const secondaryMeasure = Math.round(clamp(finite(input.comparison, 5), 1, 10));
  const radius = primaryMeasure;
  const height = secondaryMeasure;
  const slantHeight = Math.hypot(primaryMeasure / 2, height);
  let volume: number;
  let surfaceArea: number;
  let volumePiCoefficient = 0;
  let surfaceAreaPiCoefficient = 0;
  let formula: string;

  if (solidType === "prism") {
    volume = primaryMeasure ** 2 * height;
    surfaceArea = 2 * primaryMeasure ** 2 + 4 * primaryMeasure * height;
    formula = `V = s²h = ${fixed(volume)} · SA = 2s²+4sh = ${fixed(surfaceArea)}`;
  } else if (solidType === "pyramid") {
    volume = primaryMeasure ** 2 * height / 3;
    surfaceArea = primaryMeasure ** 2 + 2 * primaryMeasure * slantHeight;
    formula = `V = ⅓s²h = ${fixed(volume)} · SA = s²+2sℓ ≈ ${fixed(surfaceArea)}`;
  } else if (solidType === "cylinder") {
    volumePiCoefficient = radius ** 2 * height;
    surfaceAreaPiCoefficient = 2 * radius * (radius + height);
    volume = volumePiCoefficient * Math.PI;
    surfaceArea = surfaceAreaPiCoefficient * Math.PI;
    formula = `V = πr²h = ${fixed(volumePiCoefficient)}π · SA = 2πr(r+h) = ${fixed(surfaceAreaPiCoefficient)}π`;
  } else if (solidType === "cone") {
    volumePiCoefficient = radius ** 2 * height / 3;
    surfaceAreaPiCoefficient = radius * (radius + Math.hypot(radius, height));
    volume = volumePiCoefficient * Math.PI;
    surfaceArea = surfaceAreaPiCoefficient * Math.PI;
    formula = `V = ⅓πr²h = ${fixed(volumePiCoefficient)}π · SA = πr(r+ℓ) ≈ ${fixed(surfaceArea)}`;
  } else {
    volumePiCoefficient = 4 * radius ** 3 / 3;
    surfaceAreaPiCoefficient = 4 * radius ** 2;
    volume = volumePiCoefficient * Math.PI;
    surfaceArea = surfaceAreaPiCoefficient * Math.PI;
    formula = `V = ⁴⁄₃πr³ = ${fixed(volumePiCoefficient)}π · SA = 4πr² = ${fixed(surfaceAreaPiCoefficient)}π`;
  }

  const sectionFraction = clamp((secondaryMeasure - 5.5) / 4.5, -1, 1);
  const sectionHeight = sectionFraction * radius;
  const crossSectionRadius = Math.sqrt(Math.max(0, radius ** 2 - sectionHeight ** 2));
  return makeState(input, {
    check: solidType === "sphere"
      ? `r=${radius} · z=${fixed(sectionHeight)} · section radius=${fixed(crossSectionRadius)} · V≈${fixed(volume)} · SA≈${fixed(surfaceArea)}`
      : `${solidType}: base/r=${primaryMeasure} · h=${height} · V≈${fixed(volume)} · SA≈${fixed(surfaceArea)}`,
    formula,
    kind: "solid",
    metrics: {
      crossSectionRadius,
      displayMode: solidType,
      height,
      primaryMeasure,
      radius,
      sectionHeight,
      slantHeight: solidType === "cone" ? Math.hypot(radius, height) : slantHeight,
      solidDepth: solidType === "sphere" ? radius * 2 : primaryMeasure,
      solidHeight: solidType === "sphere" ? radius * 2 : height,
      solidModel: "surface-volume",
      solidType,
      solidWidth: solidType === "sphere" ? radius * 2 : primaryMeasure,
      surfaceArea,
      surfaceAreaPiCoefficient,
      volume,
      volumePiCoefficient
    }
  });
}

function buildRemainingGeometryState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const value = clamp(finite(input.value, 5), 0, 10);
  const comparison = clamp(finite(input.comparison, 5), 0, 10);

  if (input.family === "angle-measure") {
    const angleDegrees = 20 + value * 12;
    const comparisonAngle = 20 + comparison * 12;
    const radians = (angleDegrees * Math.PI) / 180;
    const comparisonRadians = (comparisonAngle * Math.PI) / 180;
    const origin = { x: 0, y: 0 };
    const base = { x: 3, y: 0 };
    const ray = { x: 3 * Math.cos(radians), y: 3 * Math.sin(radians) };
    const comparisonRay = {
      x: 2.4 * Math.cos(comparisonRadians),
      y: 2.4 * Math.sin(comparisonRadians)
    };
    return makeState(input, {
      check: `Δθ = ${fixed(angleDegrees - comparisonAngle, 1)}°`,
      formula: `∠AOB = ${fixed(angleDegrees, 1)}° · ∠COD = ${fixed(comparisonAngle, 1)}°`,
      kind: "angle",
      metrics: { angleDegrees, comparisonAngle, sharedVertex: true },
      points: { base, comparisonRay, origin, ray }
    });
  }

  if (input.family === "line-angle-geometry") {
    const relationMode = ((Math.trunc(finite(input.mode, 0)) % 3) + 3) % 3;
    const halfLength = 3;

    if (relationMode === 0) {
      const angleDegrees = 35 + value * 5;
      const lineSeparation = 1.2 + comparison * 0.14;
      const radians = angleDegrees * Math.PI / 180;
      const line1A = { x: -halfLength, y: lineSeparation / 2 };
      const line1B = { x: halfLength, y: lineSeparation / 2 };
      const line2A = { x: -halfLength, y: -lineSeparation / 2 };
      const line2B = { x: halfLength, y: -lineSeparation / 2 };
      const transversalDirection = { x: Math.cos(radians), y: Math.sin(radians) };
      const transversalA = { x: -halfLength * transversalDirection.x, y: -halfLength * transversalDirection.y };
      const transversalB = { x: halfLength * transversalDirection.x, y: halfLength * transversalDirection.y };
      const firstIntersection = finiteSegmentIntersection(line1A, line1B, transversalA, transversalB);
      const secondIntersection = finiteSegmentIntersection(line2A, line2B, transversalA, transversalB);
      const firstDirection = direction(line1A, line1B);
      const secondDirection = direction(line2A, line2B);
      const firstAngle = acuteAngleBetween(firstDirection, transversalDirection);
      const secondAngle = acuteAngleBetween(secondDirection, transversalDirection);
      const intersectionCount = [firstIntersection, secondIntersection].filter((intersection) =>
        intersection &&
        intersection.firstParameter >= -EPSILON && intersection.firstParameter <= 1 + EPSILON &&
        intersection.secondParameter >= -EPSILON && intersection.secondParameter <= 1 + EPSILON
      ).length;
      return makeState(input, {
        check: `u₁×u₂=${fixed(normalizedCrossProduct(firstDirection, secondDirection), 4)} · ∠1−∠2=${fixed(firstAngle - secondAngle, 4)}°`,
        formula: "u₁ × u₂ = 0 ⇒ ℓ₁ ∥ ℓ₂ · ∠1 = ∠2",
        kind: "lines",
        metrics: {
          angleDegrees: firstAngle,
          correspondingAngle: secondAngle,
          correspondingResidual: firstAngle - secondAngle,
          intersectionCount,
          parallelCrossProduct: normalizedCrossProduct(firstDirection, secondDirection),
          relationKind: "parallel-transversal",
          transversalAngleDegrees: angleDegrees
        },
        points: {
          intersection1: firstIntersection?.point ?? { x: 0, y: lineSeparation / 2 },
          intersection2: secondIntersection?.point ?? { x: 0, y: -lineSeparation / 2 },
          line1A,
          line1B,
          line2A,
          line2B,
          transversalA,
          transversalB
        }
      });
    }

    const intersection = {
      x: (comparison - 5) * 0.28,
      y: (comparison - 5) * 0.08
    };
    const firstAngleRadians = (-30 + value * 6) * Math.PI / 180;
    const firstDirection = { x: Math.cos(firstAngleRadians), y: Math.sin(firstAngleRadians) };
    const relationAngleDegrees = relationMode === 1 ? 90 : 25 + value * 10;
    const secondAngleRadians = firstAngleRadians + relationAngleDegrees * Math.PI / 180;
    const secondDirection = { x: Math.cos(secondAngleRadians), y: Math.sin(secondAngleRadians) };
    const line1A = { x: intersection.x - firstDirection.x * halfLength, y: intersection.y - firstDirection.y * halfLength };
    const line1B = { x: intersection.x + firstDirection.x * halfLength, y: intersection.y + firstDirection.y * halfLength };
    const line2A = { x: intersection.x - secondDirection.x * halfLength, y: intersection.y - secondDirection.y * halfLength };
    const line2B = { x: intersection.x + secondDirection.x * halfLength, y: intersection.y + secondDirection.y * halfLength };
    const derivedIntersection = finiteSegmentIntersection(line1A, line1B, line2A, line2B);
    const crossProduct = normalizedCrossProduct(firstDirection, secondDirection);
    const dotProduct = normalizedDotProduct(firstDirection, secondDirection);

    return makeState(input, {
      check: relationMode === 1
        ? `u₁·u₂=${fixed(dotProduct, 4)} · ∠=${fixed(acuteAngleBetween(firstDirection, secondDirection), 1)}°`
        : `P=(${fixed(derivedIntersection?.point.x ?? intersection.x)}, ${fixed(derivedIntersection?.point.y ?? intersection.y)}) · ∠1−∠3=0°`,
      formula: relationMode === 1
        ? "u₁ · u₂ = 0 ⇒ ℓ₁ ⟂ ℓ₂"
        : "ℓ₁ ∩ ℓ₂ = {P} · ∠1 = ∠3",
      kind: "lines",
      metrics: {
        angleDegrees: acuteAngleBetween(firstDirection, secondDirection),
        intersectionCount: derivedIntersection ? 1 : 0,
        intersectionFirstParameter: derivedIntersection?.firstParameter ?? 0,
        intersectionSecondParameter: derivedIntersection?.secondParameter ?? 0,
        lineCrossProduct: crossProduct,
        lineDirectionDegrees: -30 + value * 6,
        perpendicularDotProduct: dotProduct,
        relationKind: relationMode === 1 ? "perpendicular" : "intersecting"
      },
      points: {
        intersection1: derivedIntersection?.point ?? intersection,
        line1A,
        line1B,
        line2A,
        line2B
      }
    });
  }

  if (input.family === "quadrilateral-geometry") {
    const exactModes = configuredQuadrilateralGeometryModesByVariant[
      input.variant as keyof typeof configuredQuadrilateralGeometryModesByVariant
    ];
    if (exactModes) {
      const normalizedMode = ((Math.trunc(finite(input.mode, 0)) % exactModes.length) + exactModes.length) % exactModes.length;
      return buildClassifiedPolygonState(input, exactModes[normalizedMode].id);
    }

    const rectangle = Math.abs(Math.trunc(finite(input.mode, 0))) % 2 === 1;
    const shapeWidth = 3.6 + value * 0.2;
    const skew = rectangle ? 0 : 0.4 + value * 0.04;
    const shapeHeight = 2.2 + comparison * 0.12;
    const a = { x: -2.8, y: -1.6 };
    const b = { x: a.x + shapeWidth, y: -1.6 };
    const c = { x: a.x + shapeWidth + skew, y: -1.6 + shapeHeight };
    const d = { x: -2.8 + skew, y: -1.6 + shapeHeight };
    return makeState(input, {
      check: `AB = CD = ${fixed(distance(a, b))} · BC = DA = ${fixed(distance(b, c))}`,
      formula: rectangle ? "AB ∥ CD · BC ∥ AD · AB ⟂ BC" : "AB ∥ CD · BC ∥ AD",
      kind: "quadrilateral",
      metrics: {
        oppositeSideResidualA: distance(a, b) - distance(c, d),
        oppositeSideResidualB: distance(b, c) - distance(d, a),
        parallelResidual: 0,
        rectangle
      },
      points: { a, b, c, d }
    });
  }

  if (input.family === "right-triangle") {
    const legA = 3 + (Math.round(value) % 4);
    const legB = 4 + (Math.round(comparison) % 4);
    const hypotenuse = Math.hypot(legA, legB);
    const pythagoreanResidual = legA ** 2 + legB ** 2 - hypotenuse ** 2;
    return makeState(input, {
      check: `${legA}² + ${legB}² = ${fixed(hypotenuse ** 2)}`,
      formula: "a² + b² = c²",
      kind: "right-triangle",
      metrics: { hypotenuse, legA, legB, pythagoreanResidual },
      points: {
        a: { x: 0, y: 0 },
        b: { x: legA, y: 0 },
        c: { x: 0, y: legB }
      }
    });
  }

  if (input.family === "circle-sector") {
    const radius = 1.5 + value * 0.12;
    const centralAngle = 30 + comparison * 12;
    const sectorFraction = centralAngle / 360;
    const circumference = 2 * Math.PI * radius;
    const area = Math.PI * radius ** 2;
    return makeState(input, {
      check: `θ/360 = ${fixed(sectorFraction, 3)}`,
      formula: `L = θ/360 · 2πr · A = θ/360 · πr²`,
      kind: "circle",
      metrics: {
        area,
        centralAngle,
        circumference,
        radius,
        sectorFraction
      },
      points: { center: { x: 0, y: 0 } }
    });
  }

  if (input.family === "shape-classifier") {
    const sides = 3 + (Math.round(value) % 6);
    const rotation = (comparison / 10) * Math.PI;
    const series = Array.from({ length: sides }, (_, index) => {
      const radians = -Math.PI / 2 + rotation + (index / sides) * Math.PI * 2;
      return { x: 2.4 * Math.cos(radians), y: 2.4 * Math.sin(radians) };
    });
    return makeState(input, {
      check: `n_s = ${sides} · n_v = ${sides}`,
      formula: `n = ${sides} ⇒ n_s = n_v`,
      kind: "shape",
      metrics: { corners: sides, generatedVertices: series.length, sides },
      series
    });
  }

  if (input.family === "solid-projection") {
    const exactSolid = buildExactSolidState(input);
    if (exactSolid) return exactSolid;
    const solidWidth = 2 + (Math.round(value) % 4);
    const solidDepth = 2 + (Math.round(comparison) % 3);
    const solidHeight = 2 + (Math.round((value + comparison) / 2) % 4);
    const displayMode = /solid-nets/u.test(input.variant) && Math.abs(Math.trunc(finite(input.mode, 0))) % 2 === 1
      ? "net"
      : "views";
    return makeState(input, {
      check: `F ${solidWidth}×${solidHeight} · T ${solidWidth}×${solidDepth} · S ${solidDepth}×${solidHeight}`,
      formula: displayMode === "net" ? "N(Ω) → Ω" : "Ω → π_F(Ω) / π_T(Ω) / π_S(Ω)",
      kind: "solid",
      metrics: {
        displayMode,
        frontHeight: solidHeight,
        frontWidth: solidWidth,
        sideHeight: solidHeight,
        sideWidth: solidDepth,
        solidDepth,
        solidHeight,
        solidWidth,
        topDepth: solidDepth,
        topWidth: solidWidth
      }
    });
  }

  if (input.family === "reflection-symmetry") {
    const source = { x: 1 + value * 0.18, y: -1 + comparison * 0.2 };
    const image = { x: -source.x, y: source.y };
    const axisPoint = { x: 0, y: source.y };
    const sourceDistance = distance(source, axisPoint);
    const imageDistance = distance(image, axisPoint);
    return makeState(input, {
      check: `d(P,m) = d(P′,m) = ${fixed(sourceDistance)}`,
      formula: `(x, y) → (−x, y)`,
      kind: "reflection",
      metrics: {
        imageDistance,
        joiningSegmentDotAxis: 0,
        sourceDistance
      },
      points: { axisPoint, image, source }
    });
  }

  if (input.family === "coordinate-position" && input.variant === "relative-position-grid") {
    const reference = { x: 2, y: 2 };
    const target = {
      x: Math.round(clamp(finite(input.value, 3), 0, 4)),
      y: Math.round(clamp(finite(input.comparison, 1), 0, 4))
    };
    const horizontalSteps = target.x - reference.x;
    const verticalSteps = target.y - reference.y;
    const horizontalRelation = horizontalSteps === 0
      ? "same column"
      : `${horizontalSteps > 0 ? "right" : "left"} ${Math.abs(horizontalSteps)}`;
    const verticalRelation = verticalSteps === 0
      ? "same row"
      : `${verticalSteps > 0 ? "above" : "below"} ${Math.abs(verticalSteps)}`;
    const relation = `${horizontalRelation}; ${verticalRelation}`;
    const ordinalPosition = target.x + 1;
    return makeState(input, {
      check: `|Δc|+|Δr|=${Math.abs(horizontalSteps) + Math.abs(verticalSteps)}`,
      formula: `R→T: Δc=${horizontalSteps >= 0 ? "+" : ""}${horizontalSteps} · Δr=${verticalSteps >= 0 ? "+" : ""}${verticalSteps} · ←#${ordinalPosition}`,
      kind: "relative-position",
      metrics: {
        coincident: horizontalSteps === 0 && verticalSteps === 0,
        horizontalDirection: horizontalSteps === 0 ? "same-column" : horizontalSteps > 0 ? "right" : "left",
        horizontalSteps,
        ordinalPosition,
        relation,
        routeDistance: Math.abs(horizontalSteps) + Math.abs(verticalSteps),
        verticalDirection: verticalSteps === 0 ? "same-row" : verticalSteps > 0 ? "above" : "below",
        verticalSteps
      },
      points: {
        elbow: { x: target.x, y: reference.y },
        reference,
        target
      }
    });
  }

  if (input.family === "coordinate-position" && input.variant === "direction-distance-route") {
    const horizontalSteps = Math.round(clamp(finite(input.value, 3), -4, 4));
    const verticalSteps = Math.round(clamp(finite(input.comparison, 2), -4, 4));
    const horizontalDirection = horizontalSteps < 0 ? "west" : horizontalSteps > 0 ? "east" : "stay";
    const verticalDirection = verticalSteps < 0 ? "south" : verticalSteps > 0 ? "north" : "stay";
    const routeDistance = Math.abs(horizontalSteps) + Math.abs(verticalSteps);
    const reference = { x: 0, y: 0 };
    const elbow = { x: horizontalSteps, y: 0 };
    const target = { x: horizontalSteps, y: verticalSteps };
    return makeState(input, {
      check: `S→T: Δx=${horizontalSteps >= 0 ? "+" : ""}${horizontalSteps} · Δy=${verticalSteps >= 0 ? "+" : ""}${verticalSteps}`,
      formula: `d₁=|Δx|+|Δy|=${routeDistance}`,
      kind: "relative-position",
      metrics: {
        coincident: horizontalSteps === 0 && verticalSteps === 0,
        horizontalDirection,
        horizontalSteps,
        routeDistance,
        verticalDirection,
        verticalSteps
      },
      points: {
        elbow,
        reference,
        target
      }
    });
  }

  const point = {
    x: -3 + value * 0.6,
    y: -2.5 + comparison * 0.5
  };
  return makeState(input, {
    check: `P = (${fixed(point.x)}, ${fixed(point.y)})`,
    formula: "(x, y) ↔ P(x, y)",
    kind: "coordinate",
    metrics: { pointX: point.x, pointY: point.y, scale: 1 },
    points: { point }
  });
}

function buildSymbolicEquationState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const coefficient = 2 + (Math.round(clamp(finite(input.value, 5), 0, 10)) % 4);
  const solution = 1 + (Math.round(clamp(finite(input.comparison, 5), 0, 10)) % 6);
  const constant = 1 + (coefficient % 3);
  const right = coefficient * solution + constant;
  const operationDelta = -constant;
  const substitutionResidual = coefficient * solution + constant - right;

  return makeState(input, {
    check: `x = ${solution}: ${coefficient * solution + constant} = ${right}`,
    formula: `${coefficient}x + ${constant} = ${right} → x = ${solution}`,
    kind: "equation",
    metrics: {
      coefficient,
      constant,
      leftDelta: operationDelta,
      right,
      rightDelta: operationDelta,
      solution,
      substitutionResidual
    }
  });
}

function buildExpressionState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const a = 2 + Math.round(clamp(finite(input.value, 5), 0, 10) / 2);
  const b = 2 + Math.round(clamp(finite(input.comparison, 5), 0, 10) * 0.3);
  const c = 3;
  const originalValue = a + b * c;
  const equivalentValue = b * c + a;

  return makeState(input, {
    check: `${originalValue} = ${equivalentValue}`,
    formula: `${a} + ${b} × ${c} = ${b} × ${c} + ${a}`,
    kind: "expression",
    metrics: { a, b, c, equivalentValue, originalValue }
  });
}

function buildPolynomialState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const factorP = 1 + (Math.round(clamp(finite(input.value, 5), 0, 10)) % 4);
  const factorQ = -1 - (Math.round(clamp(finite(input.comparison, 5), 0, 10)) % 3);
  const expandedLinear = factorP + factorQ;
  const expandedConstant = factorP * factorQ;
  const sampleX = 2;
  const factoredValue = (sampleX + factorP) * (sampleX + factorQ);
  const expandedValue = sampleX ** 2 + expandedLinear * sampleX + expandedConstant;

  return makeState(input, {
    check: `x=${sampleX}: ${fixed(factoredValue)} = ${fixed(expandedValue)}`,
    formula: `(x ${factorP >= 0 ? "+" : "−"} ${Math.abs(factorP)})(x ${factorQ >= 0 ? "+" : "−"} ${Math.abs(factorQ)}) = x² ${expandedLinear >= 0 ? "+" : "−"} ${Math.abs(expandedLinear)}x ${expandedConstant >= 0 ? "+" : "−"} ${Math.abs(expandedConstant)}`,
    kind: "polynomial",
    metrics: {
      expandedConstant,
      expandedLinear,
      expandedValue,
      factorP,
      factorQ,
      factoredValue,
      sampleX
    }
  });
}

function buildLinearSystemState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const solutionX = 1 + (Math.round(clamp(finite(input.value, 5), 0, 10)) % 4);
  const solutionY = 1 + (Math.round(clamp(finite(input.comparison, 5), 0, 10)) % 4);
  const firstRight = 2 * solutionX + solutionY;
  const secondRight = solutionX - solutionY;
  const firstResidual = 2 * solutionX + solutionY - firstRight;
  const secondResidual = solutionX - solutionY - secondRight;

  return makeState(input, {
    check: `(${solutionX}, ${solutionY}): r₁ = ${fixed(firstResidual)} · r₂ = ${fixed(secondResidual)}`,
    formula: `2x + y = ${firstRight} · x − y = ${secondRight}`,
    kind: "system",
    metrics: {
      firstResidual,
      firstRight,
      secondResidual,
      secondRight,
      solutionX,
      solutionY
    },
    points: { solution: { x: solutionX, y: solutionY } }
  });
}

function buildInequalityState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const usesNegativeOperation = Math.abs(Math.trunc(finite(input.mode, 0))) % 2 === 1;
  const boundary = 2 + Math.round(clamp(finite(input.value, 5), 0, 10) / 2);
  const constant = -2 + clamp(finite(input.comparison, 5), 0, 10) * 0.4;
  const coefficient = usesNegativeOperation ? -2 : 2;
  const right = coefficient * boundary + constant;
  const operationFactor = 1 / coefficient;
  const originalOperator = "≤";
  const solvedOperator = operationFactor < 0 ? "≥" : "≤";

  return makeState(input, {
    check: `${coefficient}x ${constant >= 0 ? "+" : "−"} ${fixed(Math.abs(constant))} ${originalOperator} ${fixed(right)} → x ${solvedOperator} ${boundary}`,
    formula: `−(${fixed(constant)}) · × ${fixed(operationFactor)}: ${originalOperator} → ${solvedOperator}`,
    kind: "inequality",
    metrics: {
      boundary,
      coefficient,
      constant,
      operationFactor,
      originalOperator,
      right,
      solvedOperator
    }
  });
}

function buildSetLogicState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const offsetA = Math.round(clamp(finite(input.value, 5), 0, 10) / 2);
  const offsetB = Math.round(clamp(finite(input.comparison, 5), 0, 10) / 2);
  const setA = [1 + offsetA, 2 + offsetA, 3 + offsetA];
  const setB = [2 + offsetB, 3 + offsetB, 4 + offsetB];
  const intersection = setA.filter((item) => setB.includes(item));
  const union = [...new Set([...setA, ...setB])];

  return makeState(input, {
    check: `A ∩ B = {${intersection.join(", ")}}`,
    formula: `A ∪ B = {${union.join(", ")}}`,
    kind: "sets",
    labels: [
      `A = {${setA.join(", ")}}`,
      `B = {${setB.join(", ")}}`
    ],
    metrics: {
      intersectionSize: intersection.length,
      unionSize: union.length
    }
  });
}

function buildLinearFunctionState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const slope = -2 + Math.round(clamp(finite(input.value, 5), 0, 10)) * 0.4;
  const intercept = -2 + Math.round(clamp(finite(input.comparison, 5), 0, 10)) * 0.4;
  const series = [-2, -1, 0, 1, 2].map((x) => ({ x, y: slope * x + intercept }));
  const tableSlope =
    (series[series.length - 1].y - series[0].y) /
    (series[series.length - 1].x - series[0].x);

  return makeState(input, {
    check: `Δy / Δx = ${fixed(tableSlope)}`,
    formula: `y = ${fixed(slope)}x ${intercept >= 0 ? "+" : "−"} ${fixed(Math.abs(intercept))}`,
    kind: "linear",
    metrics: { intercept, slope, tableSlope },
    series
  });
}

function buildReciprocalState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const signedMode = Math.abs(Math.trunc(finite(input.mode, 0))) % 2 === 0 ? 1 : -1;
  const k = signedMode * (2 + Math.round(clamp(finite(input.value, 5), 0, 10) / 2));
  const sampleX = 1 + clamp(finite(input.comparison, 5), 0, 10) * 0.2;
  const sampleY = k / sampleX;
  const sampleProduct = sampleX * sampleY;
  const domain = [-4, -3, -2, -1, 1, 2, 3, 4];
  const series = domain.map((x) => ({ x, y: k / x }));

  return makeState(input, {
    check: `${fixed(sampleX)} × ${fixed(sampleY)} = ${fixed(sampleProduct)}`,
    formula: `xy = ${k} · x ≠ 0`,
    kind: "reciprocal",
    metrics: { k, sampleProduct, sampleX, sampleY },
    series
  });
}

function buildQuadraticState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const rootA = -1 - (Math.round(clamp(finite(input.value, 5), 0, 10)) % 3);
  const rootB = 1 + (Math.round(clamp(finite(input.comparison, 5), 0, 10)) % 3);
  const leading = Math.abs(Math.trunc(finite(input.mode, 0))) % 2 === 0 ? 1 : -1;
  const linear = -leading * (rootA + rootB);
  const constant = leading * rootA * rootB;
  const vertexX = -linear / (2 * leading);
  const evaluate = (x: number) => leading * x * x + linear * x + constant;
  const vertexY = evaluate(vertexX);
  const series = Array.from({ length: 17 }, (_, index) => {
    const x = -4 + index * 0.5;
    return { x, y: evaluate(x) };
  });

  return makeState(input, {
    check: `f(${rootA}) = ${fixed(evaluate(rootA), 6)} · f(${rootB}) = ${fixed(evaluate(rootB), 6)}`,
    formula: `y = ${leading}x² ${linear >= 0 ? "+" : "−"} ${Math.abs(linear)}x ${constant >= 0 ? "+" : "−"} ${Math.abs(constant)}`,
    kind: "quadratic",
    metrics: {
      constant,
      leading,
      linear,
      rootA,
      rootAResidual: evaluate(rootA),
      rootB,
      rootBResidual: evaluate(rootB),
      vertexX,
      vertexY
    },
    points: { vertex: { x: vertexX, y: vertexY } },
    series
  });
}

function buildQuadraticInequalityState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const active = buildQuadraticState({ ...input, family: "quadratic-features" });
  const rootA = metric(active, "rootA");
  const rootB = metric(active, "rootB");
  const leading = metric(active, "leading", 1);
  const leftRoot = Math.min(rootA, rootB);
  const rightRoot = Math.max(rootA, rootB);
  const midpoint = (leftRoot + rightRoot) / 2;
  const midpointValue =
    leading * midpoint ** 2 +
    metric(active, "linear") * midpoint +
    metric(active, "constant");
  const intervalSignMatches = leading > 0 ? midpointValue <= EPSILON : midpointValue >= -EPSILON;
  const solution = leading > 0
    ? `[${fixed(leftRoot)}, ${fixed(rightRoot)}]`
    : `(−∞, ${fixed(leftRoot)}] ∪ [${fixed(rightRoot)}, ∞)`;

  return makeState(input, {
    active,
    check: `f(${fixed(leftRoot)}) = 0 · f(${fixed(rightRoot)}) = 0 · sgn(f) ✓`,
    formula: `f(x) ≤ 0 ⇒ x ∈ ${solution}`,
    kind: "quadratic-inequality",
    metrics: {
      intervalSignMatches,
      leading,
      midpointValue,
      rootA: leftRoot,
      rootAResidual: metric(active, "rootAResidual"),
      rootB: rightRoot,
      rootBResidual: metric(active, "rootBResidual")
    },
    points: active.points,
    series: active.series,
    strand: "roots-and-sign-intervals"
  });
}

function buildFunctionPropertiesState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  if (input.variant === "advanced-functions") {
    const scaleParameter = clamp(finite(input.value, 5), 0, 10) / 6;
    const verticalShift = clamp(finite(input.comparison, 5), 0, 10) - 5;
    const activeMode = ((Math.trunc(finite(input.mode, 0)) % 3) + 3) % 3;
    const families = ["quadratic", "exponential", "logarithmic"] as const;
    const primaryFamily = families[activeMode];
    const comparisonFamily = families[(activeMode + 1) % families.length];
    const evaluate = (
      family: (typeof families)[number],
      x: number
    ) => {
      if (family === "quadratic") return scaleParameter * x ** 2 + verticalShift;
      if (family === "exponential") return scaleParameter * 2 ** x + verticalShift;
      return scaleParameter * Math.log(x + 3) + verticalShift;
    };
    const formulaFor = (family: (typeof families)[number]) => {
      const shiftTerm = `${verticalShift >= 0 ? "+" : "−"} ${fixed(Math.abs(verticalShift))}`;
      if (family === "quadratic") return `${fixed(scaleParameter)}x² ${shiftTerm}`;
      if (family === "exponential") return `${fixed(scaleParameter)}·2ˣ ${shiftTerm}`;
      return `${fixed(scaleParameter)}·ln(x+3) ${shiftTerm}`;
    };
    const domain = Array.from({ length: 25 }, (_, index) => -2.4 + index * 0.225);
    const series = domain.map((x) => ({ x, y: evaluate(primaryFamily, x) }));
    const comparisonSeries = domain.map((x) => ({ x, y: evaluate(comparisonFamily, x) }));

    return makeState(input, {
      check: `shared a=${fixed(scaleParameter)} · shared k=${fixed(verticalShift)} · family ${primaryFamily} → ${comparisonFamily}`,
      comparisonSeries,
      formula: `y=${formulaFor(primaryFamily)} · compare y=${formulaFor(comparisonFamily)}`,
      kind: "advanced-functions",
      metrics: {
        activeMode,
        comparisonFamily,
        comparisonFormula: formulaFor(comparisonFamily),
        primaryFamily,
        primaryFormula: formulaFor(primaryFamily),
        scaleParameter,
        sharedParameters: true,
        verticalShift
      },
      series
    });
  }

  const shift = -2 + clamp(finite(input.comparison, 5), 0, 10) * 0.4;
  const coefficient = 0.5 + clamp(finite(input.value, 5), 0, 10) * 0.15;
  const series = Array.from({ length: 17 }, (_, index) => {
    const x = -4 + index * 0.5;
    return { x, y: coefficient * x ** 2 + shift };
  });
  const zeroMagnitude = shift <= 0 ? Math.sqrt(-shift / coefficient) : Number.NaN;

  return makeState(input, {
    check:
      shift <= 0
        ? `f⁻¹(0) = {±${fixed(zeroMagnitude)}}`
        : `min f = ${fixed(shift)} > 0`,
    formula: `f(x) = ${fixed(coefficient)}x² ${shift >= 0 ? "+" : "−"} ${Math.abs(shift)} · f(−x) = f(x)`,
    kind: "properties",
    metrics: {
      even: true,
      coefficient,
      minimum: shift,
      shift,
      zeroMagnitude: Number.isFinite(zeroMagnitude) ? zeroMagnitude : -1
    },
    points: { minimum: { x: 0, y: shift } },
    series
  });
}

function buildExponentialLogState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const base = 2 + (Math.round(clamp(finite(input.value, 5), 0, 10)) % 3);
  const exponent = -1 + clamp(finite(input.comparison, 5), 0, 10) * 0.3;
  const exponentialValue = base ** exponent;
  const logBack = Math.log(exponentialValue) / Math.log(base);
  const series = Array.from({ length: 9 }, (_, index) => {
    const x = -2 + index * 0.5;
    return { x, y: base ** x };
  });

  return makeState(input, {
    check: `log${base}(${fixed(exponentialValue)}) = ${fixed(logBack)}`,
    formula: `y = ${base}ˣ ↔ y = log${base}(x)`,
    kind: "exp-log",
    metrics: { base, exponent, exponentialValue, logBack },
    series
  });
}

function buildSequenceState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const geometric = Math.abs(Math.trunc(finite(input.mode, 0))) % 2 === 1;
  const first = 1 + (Math.round(clamp(finite(input.value, 5), 0, 10)) % 4);
  const step = 1 + (Math.round(clamp(finite(input.comparison, 5), 0, 10)) % 4);
  const terms = Array.from({ length: 6 }, (_, index) =>
    geometric ? first * step ** index : first + step * index
  );
  const residuals = terms.slice(1).map((term, index) =>
    geometric ? term - terms[index] * step : term - terms[index] - step
  );
  const maxRecurrenceResidual = Math.max(...residuals.map(Math.abs), 0);

  return makeState(input, {
    check: terms.map((term, index) => `a${index + 1}=${term}`).join(" · "),
    formula: geometric ? `aₙ = ${first}·${step}ⁿ⁻¹` : `aₙ = ${first} + (n−1)·${step}`,
    kind: "sequence",
    metrics: { first, geometric, maxRecurrenceResidual, step },
    series: terms.map((term, index) => ({ x: index + 1, y: term }))
  });
}

function buildTrigonometryState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const degrees = 20 + clamp(finite(input.value, 5), 0, 10) * 5;
  const radians = (degrees * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const tangent = sine / cosine;
  const identityValue = sine ** 2 + cosine ** 2;
  const identityResidual = identityValue - 1;
  const comparison = clamp(finite(input.comparison, 5), 0, 10);
  const referenceLength = input.family === "triangle-trigonometry"
    ? 4 + comparison * 0.3
    : 2 + comparison * 0.4;
  const hypotenuse = referenceLength;
  const adjacent = referenceLength * cosine;
  const opposite = referenceLength * sine;
  const circlePoint = { x: cosine, y: sine };
  const formula =
    input.family === "trigonometric-identity"
      ? `(${fixed(opposite)}/${fixed(referenceLength)})² + (${fixed(adjacent)}/${fixed(referenceLength)})² = ${fixed(identityValue, 6)}`
      : input.family === "triangle-trigonometry"
        ? `sin(${fixed(degrees, 1)}°) = ${fixed(opposite)}/${fixed(hypotenuse)}`
        : input.family === "trigonometric-synthesis"
          ? `R=${fixed(referenceLength)}: C_R ↔ Δ_R ↔ y/R = sin(${fixed(degrees, 1)}°)`
          : `R=${fixed(referenceLength)}: P=(${fixed(adjacent)}, ${fixed(opposite)}) → sinθ=${fixed(sine)}`;

  return makeState(input, {
    check: `sin²θ + cos²θ = ${fixed(identityValue, 6)} · tanθ = ${fixed(tangent)}`,
    formula,
    kind: "trigonometry",
    metrics: {
      adjacent,
      cosine,
      degrees,
      hypotenuse,
      identityResidual,
      identityValue,
      opposite,
      radians,
      referenceLength,
      sine,
      tangent,
      triangleCosine: adjacent / hypotenuse,
      triangleSine: opposite / hypotenuse
    },
    points: {
      circlePoint,
      triangleAdjacent: { x: adjacent, y: 0 },
      triangleOpposite: { x: adjacent, y: opposite },
      triangleOrigin: { x: 0, y: 0 }
    },
    series: Array.from({ length: 25 }, (_, index) => {
      const x = (index / 24) * Math.PI * 2;
      return { x, y: Math.sin(x) };
    })
  });
}

function buildDerivativeState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  if (input.variant === "differentiation-intro" || input.variant === "calculus") {
    const curvature = clamp(finite(input.value, 5), 0, 10) / 10;
    const probeX = (clamp(finite(input.comparison, 4), 1, 9) - 5) / 1.25;
    const evaluate = (x: number) => 0.5 * curvature * x ** 2 + 0.35;
    const derivative = (x: number) => curvature * x;
    const x1 = Number(clamp(probeX + 1.25, -3.75, 3.75).toFixed(12));
    const h = x1 - probeX;
    const tangentSlope = derivative(probeX);
    const secantSlope = (evaluate(x1) - evaluate(probeX)) / h;
    const lowerBound = -3.6;
    const upperBound = probeX;
    const stripCount = 8;
    const stripWidth = (upperBound - lowerBound) / stripCount;
    const antiderivative = (x: number) => (curvature * x ** 3) / 6 + 0.35 * x;
    const exactIntegral = antiderivative(upperBound) - antiderivative(lowerBound);
    const midpointApproximation = Array.from({ length: stripCount }, (_, index) => {
      const midpoint = lowerBound + (index + 0.5) * stripWidth;
      return evaluate(midpoint) * stripWidth;
    }).reduce((sum, contribution) => sum + contribution, 0);
    const signedError = midpointApproximation - exactIntegral;
    const absoluteError = Math.abs(signedError);
    const activeModeIndex = ((Math.trunc(finite(input.mode, 0)) % 3) + 3) % 3;
    const activeMode = (["tangent", "secant", "area"] as const)[activeModeIndex];
    const functionFormula = `f(x)=0.5·a·x²+0.35, a=${fixed(curvature)}`;
    const readNumber = (value: number) => fixed(value).replace(/^-/, "−");
    const check = activeMode === "tangent"
      ? `x₀=${readNumber(probeX)} · tangent slope=${readNumber(tangentSlope)}`
      : activeMode === "secant"
        ? `x₀=${readNumber(probeX)} · x₁=${readNumber(x1)} · secant slope=${readNumber(secantSlope)}`
        : `lower=${readNumber(lowerBound)} · exact=${readNumber(exactIntegral)} · midpoint₈=${readNumber(midpointApproximation)} · error=${readNumber(signedError)} · |error|=${readNumber(absoluteError)}`;
    const formula = activeMode === "tangent"
      ? `${functionFormula} · f′(x)=a·x`
      : activeMode === "secant"
        ? `${functionFormula} · m_s=[f(x₁)−f(x₀)]/(x₁−x₀)`
        : `${functionFormula} · ∫₋₃.₆ˣ⁰ f(x)dx ≈ midpoint₈`;
    const series = Array.from({ length: 33 }, (_, index) => {
      const sampleX = -4 + index * 0.25;
      return { x: sampleX, y: evaluate(sampleX) };
    });
    const second = { x: x1, y: evaluate(x1) };
    const tangent = { x: probeX, y: evaluate(probeX) };

    return makeState(input, {
      check,
      formula,
      kind: "calculus",
      metrics: {
        absoluteError,
        activeMode,
        activeModeIndex,
        analyticDerivative: tangentSlope,
        curvature,
        exactIntegral,
        functionValue: tangent.y,
        h,
        hkExactModel: true,
        lowerBound,
        midpointApproximation,
        probeX,
        secondPointY: second.y,
        secantSlope,
        signedError,
        stripCount,
        stripWidth,
        tangentSlope,
        upperBound,
        verticalShift: 0.35,
        x: probeX,
        x0: probeX,
        x1
      },
      points: { second, secant: second, tangent },
      series
    });
  }

  const x = -2 + clamp(finite(input.value, 5), 0, 10) * 0.4;
  const verticalShift = -2 + clamp(finite(input.comparison, 5), 0, 10) * 0.4;
  const synthesis = input.family === "derivative-synthesis";
  const evaluate = synthesis
    ? (at: number) => at ** 3 - 3 * at + verticalShift
    : (at: number) => at ** 2 + verticalShift;
  const analyticDerivative = synthesis ? 3 * x ** 2 - 3 : 2 * x;
  const tangentSlope = analyticDerivative;
  const h = 0.25;
  const secantSlope = (evaluate(x + h) - evaluate(x)) / h;
  const series = Array.from({ length: 25 }, (_, index) => {
    const sampleX = -3 + index * 0.25;
    return { x: sampleX, y: evaluate(sampleX) };
  });

  return makeState(input, {
    check: `f′(${fixed(x)}) = ${fixed(analyticDerivative)} · m_s ≈ ${fixed(secantSlope)}`,
    formula: synthesis
      ? `f(x)=x³−3x ${verticalShift >= 0 ? "+" : "−"} ${fixed(Math.abs(verticalShift))} · f′(x)=3x²−3`
      : `f(x)=x² ${verticalShift >= 0 ? "+" : "−"} ${fixed(Math.abs(verticalShift))} · f′(x)=2x`,
    kind: "calculus",
    metrics: {
      analyticDerivative,
      functionValue: evaluate(x),
      h,
      secantSlope,
      tangentSlope,
      verticalShift,
      x
    },
    points: {
      secant: { x: x + h, y: evaluate(x + h) },
      tangent: { x, y: evaluate(x) }
    },
    series
  });
}

function buildOptimizationState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const perimeter = 20 + clamp(finite(input.comparison, 5), 0, 10);
  const optimumWidth = perimeter / 4;
  const optimumHeight = perimeter / 4;
  const currentWidth = clamp(
    1 + finite(input.value, 5),
    1,
    perimeter / 2 - 1
  );
  const currentHeight = perimeter / 2 - currentWidth;
  const currentArea = currentWidth * currentHeight;
  const optimumArea = optimumWidth * optimumHeight;
  const derivativeAtCurrent = perimeter / 2 - 2 * currentWidth;
  const derivativeAtOptimum = perimeter / 2 - 2 * optimumWidth;

  return makeState(input, {
    check: `A′(${fixed(optimumWidth)}) = ${fixed(derivativeAtOptimum, 6)} · A* = ${fixed(optimumArea)}`,
    formula: `A(w) = w(${fixed(perimeter / 2)} − w)`,
    kind: "optimization",
    metrics: {
      currentArea,
      currentHeight,
      currentWidth,
      derivativeAtCurrent,
      derivativeAtOptimum,
      optimumArea,
      optimumHeight,
      optimumWidth,
      perimeter
    }
  });
}

function buildVectorState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const u = {
    x: 1 + (Math.round(clamp(finite(input.value, 5), 0, 10)) % 4),
    y: 2
  };
  const v = {
    x: -2,
    y: 1 + (Math.round(clamp(finite(input.comparison, 5), 0, 10)) % 4)
  };
  const sum = { x: u.x + v.x, y: u.y + v.y };
  const dot = u.x * v.x + u.y * v.y;
  const magnitudeU = Math.hypot(u.x, u.y);
  const magnitudeV = Math.hypot(v.x, v.y);
  const cosine = dot / (magnitudeU * magnitudeV);
  const dotIdentityResidual = dot - magnitudeU * magnitudeV * cosine;

  return makeState(input, {
    check: `u·v = ${dot} = |u||v|cosθ`,
    formula: `u + v = (${sum.x}, ${sum.y})`,
    kind: "vector",
    metrics: {
      cosine,
      dot,
      dotIdentityResidual,
      magnitudeU,
      magnitudeV,
      sumX: sum.x,
      sumY: sum.y,
      uX: u.x,
      uY: u.y,
      vX: v.x,
      vY: v.y
    },
    points: { sum, u, v }
  });
}

function buildSpaceState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const normal = { x: 1, y: 2 };
  const normalZ = 2 + (Math.round(clamp(finite(input.value, 5), 0, 10)) % 3);
  const point = {
    x: 1 + (Math.round(clamp(finite(input.comparison, 5), 0, 10)) % 3),
    y: 2
  };
  const pointZ = -1;
  const planeD = -(normal.x * point.x + normal.y * point.y + normalZ * pointZ);
  const planeResidual =
    normal.x * point.x + normal.y * point.y + normalZ * pointZ + planeD;
  const normalMagnitude = Math.hypot(normal.x, normal.y, normalZ);

  return makeState(input, {
    check: `n·P + d = ${fixed(planeResidual, 6)}`,
    formula: `${normal.x}x + ${normal.y}y + ${normalZ}z ${planeD >= 0 ? "+" : "−"} ${Math.abs(planeD)} = 0`,
    kind: "space",
    metrics: {
      normalMagnitude,
      normalX: normal.x,
      normalY: normal.y,
      normalZ,
      planeD,
      planeResidual,
      pointX: point.x,
      pointY: point.y,
      pointZ
    },
    points: { normal, point }
  });
}

function buildConicState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const activeMode = ((Math.trunc(finite(input.mode, 0)) % 3) + 3) % 3;
  const parameterA = 2 + clamp(finite(input.value, 5), 0, 10) * 0.12;
  const parameterB = 1.2 + clamp(finite(input.comparison, 5), 0, 10) * 0.08;
  const t = 0.65;
  let point: SemanticPoint;
  let conicResidual: number;
  let formula: string;
  let conicType: string;
  let series: SemanticPoint[];

  if (activeMode === 0) {
    point = { x: parameterA * Math.cos(t), y: parameterB * Math.sin(t) };
    conicResidual = point.x ** 2 / parameterA ** 2 + point.y ** 2 / parameterB ** 2 - 1;
    formula = `x²/${fixed(parameterA ** 2)} + y²/${fixed(parameterB ** 2)} = 1`;
    conicType = "ellipse";
    series = Array.from({ length: 49 }, (_, index) => {
      const radians = (index / 48) * Math.PI * 2;
      return { x: parameterA * Math.cos(radians), y: parameterB * Math.sin(radians) };
    });
  } else if (activeMode === 1) {
    const translationY = -2 + clamp(finite(input.comparison, 5), 0, 10) * 0.4;
    const sampleOffset = 1.6;
    point = {
      x: sampleOffset ** 2 / (4 * parameterA),
      y: translationY + sampleOffset
    };
    conicResidual = (point.y - translationY) ** 2 - 4 * parameterA * point.x;
    formula = translationY === 0
      ? `y² = ${fixed(4 * parameterA)}x`
      : `(y ${translationY > 0 ? "−" : "+"} ${fixed(Math.abs(translationY))})² = ${fixed(4 * parameterA)}x`;
    conicType = "parabola";
    series = Array.from({ length: 41 }, (_, index) => {
      const localY = -3 + index * 0.15;
      return {
        x: localY ** 2 / (4 * parameterA),
        y: translationY + localY
      };
    });
  } else {
    point = { x: parameterA * Math.cosh(t), y: parameterB * Math.sinh(t) };
    conicResidual = point.x ** 2 / parameterA ** 2 - point.y ** 2 / parameterB ** 2 - 1;
    formula = `x²/${fixed(parameterA ** 2)} − y²/${fixed(parameterB ** 2)} = 1`;
    conicType = "hyperbola";
    series = Array.from({ length: 41 }, (_, index) => {
      const hyperbolicT = -1.1 + index * 0.055;
      return {
        x: parameterA * Math.cosh(hyperbolicT),
        y: parameterB * Math.sinh(hyperbolicT)
      };
    });
  }

  return makeState(input, {
    check: `r_C = ${fixed(conicResidual, 6)}`,
    formula,
    kind: "conic",
    metrics: {
      conicResidual,
      conicType,
      parameterA,
      parameterB,
      pointX: point.x,
      pointY: point.y,
      translationY: activeMode === 1
        ? -2 + clamp(finite(input.comparison, 5), 0, 10) * 0.4
        : 0
    },
    points: { sample: point },
    series
  });
}

function buildRegressionState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const lift = clamp(finite(input.value, 5), 0, 10) * 0.08;
  const spread = 0.35 + clamp(finite(input.comparison, 5), 0, 10) * 0.035;
  const deviations = [-1, 0.5, 0.75, -0.5, 0.25].map((item) => item * spread);
  const series = deviations.map((deviation, index) => {
    const x = index + 1;
    return { x, y: 1.2 + lift + 1.35 * x + deviation };
  });
  const meanX = series.reduce((sum, point) => sum + point.x, 0) / series.length;
  const meanY = series.reduce((sum, point) => sum + point.y, 0) / series.length;
  const numerator = series.reduce(
    (sum, point) => sum + (point.x - meanX) * (point.y - meanY),
    0
  );
  const denominator = series.reduce(
    (sum, point) => sum + (point.x - meanX) ** 2,
    0
  );
  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;
  const residuals = series.map((point) => point.y - (slope * point.x + intercept));
  const residualSum = residuals.reduce((sum, residual) => sum + residual, 0);
  const firstPredicted = slope * series[0].x + intercept;
  const residualDefinitionError = residuals[0] - (series[0].y - firstPredicted);

  return makeState(input, {
    check: `Σe = ${fixed(residualSum, 6)}`,
    formula: `ŷ = ${fixed(slope)}x ${intercept >= 0 ? "+" : "−"} ${fixed(Math.abs(intercept))} · e = y − ŷ`,
    kind: "regression",
    metrics: {
      firstObserved: series[0].y,
      firstPredicted,
      firstResidual: residuals[0],
      intercept,
      residualDefinitionError,
      residualSum,
      slope
    },
    series
  });
}

function buildDistributionState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  if (input.variant === "statistics-s1" || input.variant === "data-handling") {
    const mean = clamp(finite(input.value, 5), 0, 10);
    const spread = clamp(finite(input.comparison, 2), 1, 4);
    const density = (standardized: number) => Math.exp(-0.5 * standardized ** 2);
    const leftDensity = density(-1);
    const rightDensity = density(1);
    const symmetryResidual = leftDensity - rightDensity;
    const series = Array.from({ length: 25 }, (_, index) => {
      const standardized = -3 + index * 0.25;
      return {
        x: mean + standardized * spread,
        y: density(standardized)
      };
    });

    return makeState(input, {
      check: `symmetric about μ=${fixed(mean)} · height(μ−spread)=height(μ+spread)`,
      formula: `center μ=${fixed(mean)} · spread=${fixed(spread)}`,
      kind: "distribution",
      metrics: {
        mean,
        spread,
        standardDeviation: spread,
        summaryOnly: true,
        symmetryResidual,
        variance: spread ** 2
      },
      points: {
        center: { x: mean, y: density(0) },
        leftSpread: { x: mean - spread, y: leftDensity },
        rightSpread: { x: mean + spread, y: rightDensity }
      },
      series
    });
  }

  const center = -1 + clamp(finite(input.value, 5), 0, 10) * 0.3;
  const scale = 0.8 + clamp(finite(input.comparison, 5), 0, 10) * 0.08;
  const standardized = [-1.5, -0.5, 0, 0.5, 1.5];
  const values = standardized.map((item) => center + item * scale);
  const mean = values.reduce((sum, item) => sum + item, 0) / values.length;
  const variance = values.reduce((sum, item) => sum + (item - mean) ** 2, 0) / values.length;
  const standardDeviation = Math.sqrt(variance);
  const observedIndex = Math.abs(Math.trunc(finite(input.mode, 0))) % values.length;
  const observed = values[observedIndex];
  const zScore = (observed - mean) / standardDeviation;
  const zResidual = zScore - (observed - mean) / standardDeviation;

  return makeState(input, {
    check: `x = ${fixed(observed)} ⇒ z = ${fixed(zScore)}`,
    formula: `z = (x − ${fixed(mean)}) / ${fixed(standardDeviation)}`,
    kind: "distribution",
    metrics: {
      mean,
      observed,
      observedIndex,
      standardDeviation,
      variance,
      zResidual,
      zScore
    },
    series: values.map((item, index) => ({ x: item, y: index === observedIndex ? 2 : 1 }))
  });
}

function buildGeometricModelingState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const width = 2 + clamp(finite(input.value, 5), 0, 10) * 0.4;
  const height = 2 + clamp(finite(input.comparison, 5), 0, 10) * 0.3;
  const scaleFactor = 1 + (Math.abs(Math.trunc(finite(input.mode, 0))) % 3) * 0.25;
  const area = width * height;
  const scaledArea = width * scaleFactor * height * scaleFactor;
  return makeState(input, {
    check: `k = ${fixed(scaleFactor)} ⇒ A′/A = ${fixed(scaledArea / area)}`,
    formula: `A = wh = ${fixed(width)} × ${fixed(height)} = ${fixed(area)}`,
    kind: "modeling",
    metrics: { area, height, scaleFactor, scaledArea, width }
  });
}

function buildStrategyState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const mode = ((Math.trunc(finite(input.mode, 0)) % 3) + 3) % 3;
  const family = ([
    "vector-operations",
    "conic-sections",
    "space-vector-plane"
  ] as const)[mode];
  const active = buildConfiguredSemanticSecondaryMathState({ ...input, family, mode });
  return makeState(input, {
    active,
    check: active.check,
    formula: active.formula,
    kind: "strategy",
    metrics: { activeMode: mode, activeMetricCount: Object.keys(active.metrics).length },
    points: active.points,
    series: active.series,
    strand: family
  });
}

function compositeFamiliesForVariant(
  variant: string
): readonly ConfiguredSemanticCompositeStrand[] | null {
  const plans: Readonly<Record<string, readonly ConfiguredSemanticCompositeStrand[]>> = {
    "array-perimeter-data-review": [
      { family: "equal-groups-array" },
      { family: "area-perimeter" },
      { family: "primary-bar-chart" }
    ],
    "geometry-foundations": [
      { family: "shape-classifier" },
      { family: "line-angle-geometry" },
      { family: "solid-projection" }
    ],
    "length-angle-solid-observation": [
      { family: "measurement-model" },
      { family: "angle-measure" },
      { family: "solid-projection" }
    ],
    "measurement-time-geometry": [
      { family: "measurement-model" },
      { family: "clock-time" },
      { family: "shape-classifier" }
    ],
    "place-value-measurement-data": [
      { family: "multi-place-value" },
      { family: "mass-unit-conversion" },
      { family: "primary-bar-chart" }
    ],
    "place-value-review": [{ family: "multi-place-value" }],
    "probability-statistics-synthesis": [
      { family: "seeded-probability-experiment" },
      { family: "statistics-distribution" }
    ],
    "pythagorean-plus-split": [
      { family: "right-triangle" },
      { family: "quadrilateral-geometry" }
    ],
    "quadratic-circle-probability": [
      { family: "quadratic-features" },
      { family: "circle-sector" },
      { family: "seeded-probability-experiment" }
    ],
    "reciprocal-similarity-trigonometry": [
      { family: "reciprocal-function" },
      { family: "triangle-geometry" },
      { family: "triangle-trigonometry" }
    ],
    "sequence-and-counting": [
      { family: "sequence-model" },
      { family: "combinatorics" }
    ],
    "sequence-and-derivative": [
      { family: "sequence-model" },
      { family: "derivative-rate-area" }
    ],
    "split-lines-numbers-coordinates": [
      { family: "line-angle-geometry" },
      { family: "signed-real-number-line" },
      { family: "coordinate-position" }
    ],
    "split-probability-statistics": [
      { family: "seeded-probability-experiment" },
      { family: "statistics-distribution" }
    ],
    "volume-and-statistics": [
      { family: "volume-layers" },
      { family: "statistics-distribution" }
    ]
  };
  return plans[variant] ?? null;
}

function buildCompositeState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  const plan = input.compositeStrands ?? compositeFamiliesForVariant(input.variant);
  if (!plan || plan.length === 0) {
    return makeState(input, {
      check: "S_variant → {S₁, …, Sₙ}",
      formula: "S_d ⊆ S_i",
      kind: "composite",
      metrics: { externalRendererRequired: true, missingStrandPlan: true },
      strand: `external:${input.variant}`
    });
  }
  const mode = ((Math.trunc(finite(input.mode, 0)) % plan.length) + plan.length) % plan.length;
  const descriptor = plan[mode];
  const family = descriptor.family;
  const active = supportsConfiguredSemanticSecondaryFamily(family)
    ? buildConfiguredSemanticSecondaryMathState({
        ...input,
        family,
        mode,
        variant: descriptor.variant ?? input.variant
      })
    : undefined;
  return makeState(input, {
    active,
    check: active?.check ?? `strand_${mode + 1} → ${family}`,
    formula: active?.formula ?? `model_${mode + 1} = ${family}`,
    kind: "composite",
    metrics: {
      activeMode: mode,
      activeMetricCount: active ? Object.keys(active.metrics).length : 0,
      externalRendererRequired: !active,
      requiredModeCount: plan.length
    },
    points: active?.points ?? {},
    series: active?.series ?? [],
    strand: family
  });
}

function buildCatalogScopeState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  return makeState(input, {
    check: "S_d ⊆ S_i",
    formula: "S_d ⊆ S_i",
    kind: "catalog",
    metrics: { implemented: false, unrelatedTemplateSuppressed: true },
    strand: "scope-hold"
  });
}

export function buildConfiguredSemanticSecondaryMathState(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryMathState {
  if (
    input.family === "angle-measure" ||
    input.family === "line-angle-geometry" ||
    input.family === "quadrilateral-geometry" ||
    input.family === "right-triangle" ||
    input.family === "circle-sector" ||
    input.family === "shape-classifier" ||
    input.family === "solid-projection" ||
    input.family === "reflection-symmetry" ||
    input.family === "coordinate-position"
  ) {
    return buildRemainingGeometryState(input);
  }
  if (input.family === "triangle-geometry") return buildTriangleState(input);
  if (input.family === "plane-transform") return buildTransformState(input);
  if (input.family === "analytic-line-circle") return buildAnalyticState(input);
  if (input.family === "complex-plane") return buildComplexState(input);
  if (input.family === "symbolic-equation") return buildSymbolicEquationState(input);
  if (input.family === "expression-equivalence") return buildExpressionState(input);
  if (input.family === "algebra-tiles-polynomial") return buildPolynomialState(input);
  if (input.family === "linear-system") return buildLinearSystemState(input);
  if (input.family === "inequality-solver") return buildInequalityState(input);
  if (input.family === "set-logic") return buildSetLogicState(input);
  if (input.family === "linear-function") return buildLinearFunctionState(input);
  if (input.family === "reciprocal-function") return buildReciprocalState(input);
  if (input.family === "quadratic-features") return buildQuadraticState(input);
  if (input.family === "quadratic-inequality") return buildQuadraticInequalityState(input);
  if (input.family === "function-properties") return buildFunctionPropertiesState(input);
  if (input.family === "exponential-logarithmic") return buildExponentialLogState(input);
  if (input.family === "sequence-model") return buildSequenceState(input);
  if (
    input.family === "unit-circle-wave" ||
    input.family === "trigonometric-identity" ||
    input.family === "triangle-trigonometry" ||
    input.family === "trigonometric-synthesis"
  ) {
    return buildTrigonometryState(input);
  }
  if (
    input.family === "derivative-rate-area" ||
    input.family === "derivative-synthesis"
  ) {
    return buildDerivativeState(input);
  }
  if (input.family === "optimization-derivative") return buildOptimizationState(input);
  if (input.family === "vector-operations") return buildVectorState(input);
  if (input.family === "space-vector-plane") return buildSpaceState(input);
  if (input.family === "conic-sections") return buildConicState(input);
  if (input.family === "bivariate-regression") return buildRegressionState(input);
  if (input.family === "statistics-distribution") return buildDistributionState(input);
  if (input.family === "geometric-modeling") return buildGeometricModelingState(input);
  if (input.family === "advanced-strategy") return buildStrategyState(input);
  if (input.family === "composite-split") return buildCompositeState(input);
  if (input.family === "catalog-scope") return buildCatalogScopeState(input);

  return buildCatalogScopeState({ ...input, family: "catalog-scope" });
}

export type ConfiguredSemanticSecondaryActualFamily = Exclude<
  ConfiguredSemanticSecondaryFamily,
  "catalog-scope" | "composite-split"
>;

export const configuredSemanticSecondaryActualFamilies = Object.freeze(
  configuredSemanticSecondaryFamilies.filter(
    (family): family is ConfiguredSemanticSecondaryActualFamily =>
      family !== "catalog-scope" && family !== "composite-split"
  )
);

export type ConfiguredSemanticSecondaryDisplayControl = "comparison" | "value";

/**
 * Human-facing mathematical values for the two learner sliders.
 *
 * The parent surface stores compact slider inputs. Those inputs are sometimes
 * indexes (for example, a quadratic root index or a vector component index),
 * and sometimes acquire a different mathematical role when the active mode
 * changes (for example, a common difference becomes a common ratio). This
 * projection is the single family/mode-aware bridge from slider state to the
 * value a learner should actually read.
 */
export type ConfiguredSemanticSecondaryDisplayProjection = Readonly<{
  comparison: string;
  family: ConfiguredSemanticSecondaryActualFamily;
  mode: string;
  value: string;
}>;

export function supportsConfiguredSemanticSecondaryDisplayProjection(
  family: string
): family is ConfiguredSemanticSecondaryActualFamily {
  return (configuredSemanticSecondaryActualFamilies as readonly string[]).includes(family);
}

function secondaryMode(input: ConfiguredSemanticSecondaryMathInput, count: number) {
  return ((Math.trunc(finite(input.mode, 0)) % count) + count) % count;
}

function displaySigned(symbol: string, value: number, suffix = "") {
  return `${symbol}=${fixed(value)}${suffix}`;
}

export function projectConfiguredSemanticSecondaryDisplayValues(
  input: ConfiguredSemanticSecondaryMathInput
): ConfiguredSemanticSecondaryDisplayProjection | null {
  if (!supportsConfiguredSemanticSecondaryDisplayProjection(input.family)) return null;

  const state = buildConfiguredSemanticSecondaryMathState(input);
  const number = (key: string) => semanticMetricNumber(state, key);
  let value: string;
  let comparison: string;
  let mode = "";

  switch (input.family) {
    case "angle-measure":
      value = displaySigned("θ₁", number("angleDegrees"), "°");
      comparison = displaySigned("θ₂", number("comparisonAngle"), "°");
      break;
    case "line-angle-geometry":
      value = String(state.metrics.relationKind) === "perpendicular"
        ? displaySigned("φ₁", number("lineDirectionDegrees"), "°")
        : displaySigned("θ", number("angleDegrees"), "°");
      comparison = String(state.metrics.relationKind) === "parallel-transversal"
        ? displaySigned("d", 1.2 + clamp(finite(input.comparison, 5), 0, 10) * 0.14)
        : displaySigned("x_P", state.points.intersection1.x);
      mode = String(state.metrics.relationKind);
      break;
    case "triangle-geometry":
      if (input.variant === "similar-triangle-ratios") {
        value = displaySigned("k", number("scaleFactor"));
        comparison = displaySigned("AB", number("sourceAB"));
        mode = "similar triangles";
      } else {
        value = displaySigned("x_C", state.points.c.x);
        comparison = displaySigned("y_C", state.points.c.y);
      }
      break;
    case "quadrilateral-geometry":
      if (state.kind === "classified-polygon") {
        value = displaySigned("size", number("size"));
        comparison = displaySigned("φ", number("orientationDegrees"), "°");
        mode = String(state.metrics.shapeName);
      } else {
        value = displaySigned("w", 3.6 + clamp(finite(input.value, 5), 0, 10) * 0.2);
        comparison = displaySigned("h", 2.2 + clamp(finite(input.comparison, 5), 0, 10) * 0.12);
        mode = state.metrics.rectangle ? "rectangle" : "parallelogram";
      }
      break;
    case "right-triangle":
      value = displaySigned("a", number("legA"));
      comparison = displaySigned("b", number("legB"));
      break;
    case "circle-sector":
      value = displaySigned("r", number("radius"));
      comparison = displaySigned("θ", number("centralAngle"), "°");
      break;
    case "shape-classifier":
      value = displaySigned("n", number("sides"));
      comparison = displaySigned("φ", clamp(finite(input.comparison, 5), 0, 10) * 18, "°");
      break;
    case "solid-projection":
      if (input.variant === "common-solids-classification") {
        value = displaySigned("size", number("size"));
        comparison = `focus=${String(state.metrics.featureFocusName)}`;
        mode = String(state.metrics.solidType);
      } else if (input.variant === "cylinder-cone-volume") {
        value = displaySigned("r", number("radius"));
        comparison = displaySigned("h", number("height"));
        mode = String(state.metrics.solidType);
      } else if (input.variant === "surface-volume-solids") {
        value = displaySigned(
          Number(input.mode) < 2 ? "s" : "r",
          number("primaryMeasure")
        );
        comparison = String(state.metrics.solidType) === "sphere"
          ? displaySigned("z", number("sectionHeight"))
          : displaySigned("h", number("height"));
        mode = String(state.metrics.solidType);
      } else {
        value = displaySigned("W", number("solidWidth"));
        comparison = displaySigned("D", number("solidDepth"));
        mode = String(state.metrics.displayMode ?? "views");
      }
      break;
    case "reflection-symmetry":
      value = displaySigned("x_P", state.points.source.x);
      comparison = displaySigned("y_P", state.points.source.y);
      break;
    case "plane-transform":
      value = displaySigned("x_P", state.points.source.x);
      comparison = displaySigned("y_P", state.points.source.y);
      mode = ["translation", "reflection", "rotation-60°", "dilation-1.4"][secondaryMode(input, 4)];
      break;
    case "coordinate-position":
      if (input.variant === "relative-position-grid") {
        value = displaySigned("column", state.points.target.x);
        comparison = displaySigned("row", state.points.target.y);
        mode = "relative grid";
      } else if (input.variant === "direction-distance-route") {
        value = `${Math.abs(number("horizontalSteps"))} ${String(state.metrics.horizontalDirection)}`;
        comparison = `${Math.abs(number("verticalSteps"))} ${String(state.metrics.verticalDirection)}`;
        mode = "route";
      } else {
        value = displaySigned("x", number("pointX"));
        comparison = displaySigned("y", number("pointY"));
      }
      break;
    case "analytic-line-circle":
      value = displaySigned("m", number("slope"));
      comparison = `b=${fixed(number("intercept"))} · r=${fixed(number("radius"))}`;
      break;
    case "complex-plane":
      value = displaySigned("Re(z)", number("real"));
      comparison = displaySigned("Im(z)", number("imaginary"));
      mode = `R${fixed(number("rotationDegrees"), 0)}°`;
      break;
    case "symbolic-equation":
      value = displaySigned("a", number("coefficient"));
      comparison = displaySigned("x", number("solution"));
      break;
    case "expression-equivalence":
      value = displaySigned("a", number("a"));
      comparison = displaySigned("b", number("b"));
      break;
    case "algebra-tiles-polynomial":
      value = displaySigned("p", number("factorP"));
      comparison = displaySigned("q", number("factorQ"));
      break;
    case "linear-system":
      value = displaySigned("x", number("solutionX"));
      comparison = displaySigned("y", number("solutionY"));
      break;
    case "inequality-solver":
      value = displaySigned("x₀", number("boundary"));
      comparison = displaySigned("c", number("constant"));
      mode = number("coefficient") < 0 ? "a<0: relation reverses" : "a>0: relation preserved";
      break;
    case "set-logic":
      value = displaySigned("ΔA", Math.round(clamp(finite(input.value, 5), 0, 10) / 2));
      comparison = displaySigned("ΔB", Math.round(clamp(finite(input.comparison, 5), 0, 10) / 2));
      break;
    case "linear-function":
      value = displaySigned("m", number("slope"));
      comparison = displaySigned("b", number("intercept"));
      break;
    case "reciprocal-function":
      value = displaySigned("|k|", Math.abs(number("k")));
      comparison = displaySigned("x_s", number("sampleX"));
      mode = number("k") < 0 ? "k<0" : "k>0";
      break;
    case "quadratic-features":
    case "quadratic-inequality":
      value = displaySigned("x₁", number("rootA"));
      comparison = displaySigned("x₂", number("rootB"));
      mode = number("leading") < 0 ? "a<0" : "a>0";
      break;
    case "function-properties":
      if (input.variant === "advanced-functions") {
        value = displaySigned("a", number("scaleParameter"));
        comparison = displaySigned("k", number("verticalShift"));
        mode = `${String(state.metrics.primaryFamily)}→${String(state.metrics.comparisonFamily)}`;
      } else {
        value = displaySigned("a", number("coefficient"));
        comparison = displaySigned("k", number("shift"));
      }
      break;
    case "exponential-logarithmic":
      value = displaySigned("b", number("base"));
      comparison = displaySigned("x", number("exponent"));
      break;
    case "sequence-model":
      value = displaySigned("a₁", number("first"));
      comparison = displaySigned(state.metrics.geometric ? "q" : "d", number("step"));
      mode = state.metrics.geometric ? "geometric" : "arithmetic";
      break;
    case "unit-circle-wave":
    case "trigonometric-identity":
    case "trigonometric-synthesis":
      value = displaySigned("θ", number("degrees"), "°");
      comparison = displaySigned("R", number("referenceLength"));
      break;
    case "triangle-trigonometry":
      value = displaySigned("θ", number("degrees"), "°");
      comparison = displaySigned("c", number("hypotenuse"));
      break;
    case "derivative-rate-area":
    case "derivative-synthesis":
      if (input.variant === "differentiation-intro" || input.variant === "calculus") {
        value = displaySigned("a", number("curvature"));
        comparison = displaySigned("x₀", number("probeX"));
        mode = String(state.metrics.activeMode);
      } else {
        value = displaySigned("x", number("x"));
        comparison = displaySigned("k", number("verticalShift"));
      }
      break;
    case "optimization-derivative":
      value = displaySigned("w", number("currentWidth"));
      comparison = displaySigned("P", number("perimeter"));
      break;
    case "vector-operations":
      value = displaySigned("u_x", number("uX"));
      comparison = displaySigned("v_y", number("vY"));
      break;
    case "space-vector-plane":
      value = displaySigned("n_z", number("normalZ"));
      comparison = displaySigned("P_x", number("pointX"));
      break;
    case "conic-sections":
      value = displaySigned("a", number("parameterA"));
      comparison = state.metrics.conicType === "parabola"
        ? displaySigned("k_y", number("translationY"))
        : displaySigned("b", number("parameterB"));
      mode = String(state.metrics.conicType);
      break;
    case "geometric-modeling":
      value = displaySigned("w", number("width"));
      comparison = displaySigned("h", number("height"));
      mode = displaySigned("k", number("scaleFactor"));
      break;
    case "advanced-strategy": {
      const strategyMode = secondaryMode(input, 3);
      const childFamily = ([
        "vector-operations",
        "conic-sections",
        "space-vector-plane"
      ] as const)[strategyMode];
      const child = projectConfiguredSemanticSecondaryDisplayValues({
        ...input,
        family: childFamily,
        mode: strategyMode
      });
      if (!child) throw new TypeError(`Missing advanced strategy projection: ${childFamily}`);
      value = child.value;
      comparison = child.comparison;
      mode = `${childFamily}${child.mode ? ` · ${child.mode}` : ""}`;
      break;
    }
    case "bivariate-regression":
      value = displaySigned("Δy", clamp(finite(input.value, 5), 0, 10) * 0.08);
      comparison = displaySigned("spread", 0.35 + clamp(finite(input.comparison, 5), 0, 10) * 0.035);
      break;
    case "statistics-distribution":
      value = displaySigned("μ", number("mean"));
      if (input.variant === "statistics-s1" || input.variant === "data-handling") {
        comparison = displaySigned("spread", number("spread"));
      } else {
        comparison = displaySigned("σ", number("standardDeviation"));
        mode = `x${number("observedIndex") + 1}=${fixed(number("observed"))}`;
      }
      break;
  }

  return { comparison, family: input.family, mode, value };
}

export function formatConfiguredSemanticSecondaryDisplayValue(
  input: ConfiguredSemanticSecondaryMathInput,
  control: ConfiguredSemanticSecondaryDisplayControl
): string | null {
  return projectConfiguredSemanticSecondaryDisplayValues(input)?.[control] ?? null;
}

export function semanticMetricNumber(
  state: ConfiguredSemanticSecondaryMathState,
  key: string
) {
  const value = state.metrics[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`Expected finite numeric semantic metric: ${key}`);
  }
  return value;
}

export function supportsConfiguredSemanticSecondaryFamily(
  family: string
): family is ConfiguredSemanticSecondaryFamily {
  return (configuredSemanticSecondaryFamilies as readonly string[]).includes(family);
}

export const configuredSemanticSecondaryControlRequirements = {
  "advanced-strategy": { modeCount: 3 },
  "conic-sections": { modeCount: 3 },
  "plane-transform": { modeCount: 4 }
} as const;

export function configuredSemanticSecondaryRequiredModeCount(
  input: Pick<ConfiguredSemanticSecondaryMathInput, "compositeStrands" | "family" | "variant">
) {
  if (input.family === "composite-split") {
    return (input.compositeStrands ?? compositeFamiliesForVariant(input.variant))?.length ?? 0;
  }
  if (input.family === "catalog-scope") return 0;
  if (input.family === "function-properties" && input.variant === "advanced-functions") return 3;
  if (input.family === "derivative-rate-area" && input.variant === "differentiation-intro") return 2;
  if (input.family === "derivative-rate-area" && input.variant === "calculus") return 3;
  if (
    input.family === "statistics-distribution" &&
    (input.variant === "statistics-s1" || input.variant === "data-handling")
  ) {
    return 0;
  }
  if (input.family === "plane-transform") return 4;
  if (input.family === "line-angle-geometry") return 3;
  if (input.family === "conic-sections" || input.family === "advanced-strategy") return 3;
  if (input.family === "complex-plane") return 4;
  if (input.family === "solid-projection" && input.variant === "common-solids-classification") return 5;
  if (input.family === "solid-projection" && input.variant === "cylinder-cone-volume") return 2;
  if (input.family === "solid-projection" && input.variant === "surface-volume-solids") return 5;
  if (input.family === "solid-projection" && /solid-nets/u.test(input.variant)) return 2;
  if (["inequality-solver", "quadratic-features", "quadratic-inequality", "reciprocal-function", "sequence-model"].includes(input.family)) return 2;
  if (input.family === "quadrilateral-geometry") {
    return configuredQuadrilateralGeometryModesByVariant[
      input.variant as keyof typeof configuredQuadrilateralGeometryModesByVariant
    ]?.length ?? 2;
  }
  return 1;
}

export function configuredSemanticSecondaryRequiredNumericControlCount(
  input: Pick<ConfiguredSemanticSecondaryMathInput, "compositeStrands" | "family" | "variant">
) {
  if (input.family === "catalog-scope") return 0;
  if (
    input.family === "composite-split" &&
    !(input.compositeStrands ?? compositeFamiliesForVariant(input.variant))?.length
  ) {
    return 0;
  }
  return 2;
}

export const configuredSemanticSecondaryLayout = {
  contentBottom: 264,
  contentLeft: 92,
  contentRight: 548,
  contentTop: 104,
  formulaBottom: 340,
  formulaTop: 286
} as const;

const secondaryFrame = {
  bottom: configuredSemanticSecondaryLayout.contentBottom,
  left: configuredSemanticSecondaryLayout.contentLeft,
  right: configuredSemanticSecondaryLayout.contentRight,
  top: configuredSemanticSecondaryLayout.contentTop + 12
} as const;

type SemanticViewport = {
  preserveAspectRatio?: boolean;
  xMaximum: number;
  xMinimum: number;
  yMaximum: number;
  yMinimum: number;
};

const fixedCoordinateViewport: SemanticViewport = {
  preserveAspectRatio: true,
  xMaximum: 6,
  xMinimum: -6,
  yMaximum: 5,
  yMinimum: -5
};

const fixedRelativeGridViewport: SemanticViewport = {
  preserveAspectRatio: true,
  xMaximum: 4.65,
  xMinimum: -0.65,
  yMaximum: 4.65,
  yMinimum: -1
};

const fixedDirectionRouteViewport: SemanticViewport = {
  preserveAspectRatio: true,
  xMaximum: 5,
  xMinimum: -5,
  yMaximum: 5,
  yMinimum: -5
};

const fixedLineRelationViewport: SemanticViewport = {
  preserveAspectRatio: true,
  xMaximum: 5,
  xMinimum: -5,
  yMaximum: 3.5,
  yMinimum: -3.5
};

function viewportForState(
  state: ConfiguredSemanticSecondaryMathState,
  extraPoints: readonly SemanticPoint[] = []
): SemanticViewport {
  if (["analytic", "complex", "coordinate", "reflection", "space", "transform", "vector"].includes(state.kind)) {
    return fixedCoordinateViewport;
  }
  if (state.kind === "relative-position") {
    return state.variant === "relative-position-grid"
      ? fixedRelativeGridViewport
      : fixedDirectionRouteViewport;
  }
  if (state.kind === "lines") return fixedLineRelationViewport;
  const points = [...Object.values(state.points), ...state.series, ...extraPoints, { x: 0, y: 0 }]
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  const xMinimum = Math.min(...points.map((point) => point.x));
  const xMaximum = Math.max(...points.map((point) => point.x));
  const yMinimum = Math.min(...points.map((point) => point.y));
  const yMaximum = Math.max(...points.map((point) => point.y));
  const xSpan = Math.max(1, xMaximum - xMinimum);
  const ySpan = Math.max(1, yMaximum - yMinimum);
  return {
    preserveAspectRatio: [
      "angle",
      "circle",
      "classified-polygon",
      "conic",
      "lines",
      "quadrilateral",
      "right-triangle",
      "shape",
      "similar-triangles",
      "triangle"
    ].includes(state.kind),
    xMaximum: xMaximum + xSpan * 0.12,
    xMinimum: xMinimum - xSpan * 0.12,
    yMaximum: yMaximum + ySpan * 0.16,
    yMinimum: yMinimum - ySpan * 0.16
  };
}

function mapPoint(point: SemanticPoint, viewport: SemanticViewport) {
  const frameWidth = secondaryFrame.right - secondaryFrame.left;
  const frameHeight = secondaryFrame.bottom - secondaryFrame.top;
  const logicalWidth = viewport.xMaximum - viewport.xMinimum;
  const logicalHeight = viewport.yMaximum - viewport.yMinimum;
  if (viewport.preserveAspectRatio) {
    const scale = Math.min(frameWidth / logicalWidth, frameHeight / logicalHeight);
    const renderedWidth = logicalWidth * scale;
    const renderedHeight = logicalHeight * scale;
    const left = secondaryFrame.left + (frameWidth - renderedWidth) / 2;
    const top = secondaryFrame.top + (frameHeight - renderedHeight) / 2;
    return {
      x: left + (point.x - viewport.xMinimum) * scale,
      y: top + (viewport.yMaximum - point.y) * scale
    };
  }
  return {
    x:
      secondaryFrame.left +
      ((point.x - viewport.xMinimum) / logicalWidth) * frameWidth,
    y:
      secondaryFrame.bottom -
      ((point.y - viewport.yMinimum) / logicalHeight) * frameHeight
  };
}

function mappedPoints(points: readonly SemanticPoint[], viewport: SemanticViewport) {
  return points.map((point) => mapPoint(point, viewport));
}

function minorAngleArcPath(
  center: SemanticPoint,
  firstRay: SemanticPoint,
  secondRay: SemanticPoint,
  radius = 18
) {
  const firstAngle = Math.atan2(firstRay.y - center.y, firstRay.x - center.x);
  const secondAngle = Math.atan2(secondRay.y - center.y, secondRay.x - center.x);
  let delta = secondAngle - firstAngle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const start = {
    x: center.x + Math.cos(firstAngle) * radius,
    y: center.y + Math.sin(firstAngle) * radius
  };
  const end = {
    x: center.x + Math.cos(firstAngle + delta) * radius,
    y: center.y + Math.sin(firstAngle + delta) * radius
  };
  return `M ${fixed(start.x, 1)} ${fixed(start.y, 1)} A ${radius} ${radius} 0 0 ${delta >= 0 ? 1 : 0} ${fixed(end.x, 1)} ${fixed(end.y, 1)}`;
}

function rightAnglePath(center: SemanticPoint, firstRay: SemanticPoint, secondRay: SemanticPoint) {
  const first = direction(center, firstRay);
  const second = direction(center, secondRay);
  const firstLength = Math.max(EPSILON, Math.hypot(first.x, first.y));
  const secondLength = Math.max(EPSILON, Math.hypot(second.x, second.y));
  const firstUnit = { x: first.x / firstLength, y: first.y / firstLength };
  const secondUnit = { x: second.x / secondLength, y: second.y / secondLength };
  const size = 16;
  const firstCorner = { x: center.x + firstUnit.x * size, y: center.y + firstUnit.y * size };
  const outerCorner = { x: firstCorner.x + secondUnit.x * size, y: firstCorner.y + secondUnit.y * size };
  const secondCorner = { x: center.x + secondUnit.x * size, y: center.y + secondUnit.y * size };
  return `M ${fixed(firstCorner.x, 1)} ${fixed(firstCorner.y, 1)} L ${fixed(outerCorner.x, 1)} ${fixed(outerCorner.y, 1)} L ${fixed(secondCorner.x, 1)} ${fixed(secondCorner.y, 1)}`;
}

function pathForSeries(series: readonly SemanticPoint[], viewport: SemanticViewport) {
  return mappedPoints(series, viewport)
    .map((point, index) => `${index === 0 ? "M" : "L"} ${fixed(point.x, 1)} ${fixed(point.y, 1)}`)
    .join(" ");
}

function clippedLineSeries(
  anchor: SemanticPoint,
  slope: number,
  viewport: SemanticViewport
): SemanticPoint[] {
  const candidates: SemanticPoint[] = [];
  const add = (point: SemanticPoint) => {
    if (
      point.x < viewport.xMinimum - EPSILON ||
      point.x > viewport.xMaximum + EPSILON ||
      point.y < viewport.yMinimum - EPSILON ||
      point.y > viewport.yMaximum + EPSILON ||
      candidates.some((candidate) =>
        Math.abs(candidate.x - point.x) < EPSILON && Math.abs(candidate.y - point.y) < EPSILON
      )
    ) return;
    candidates.push(point);
  };

  add({
    x: viewport.xMinimum,
    y: anchor.y + slope * (viewport.xMinimum - anchor.x)
  });
  add({
    x: viewport.xMaximum,
    y: anchor.y + slope * (viewport.xMaximum - anchor.x)
  });
  if (Math.abs(slope) > EPSILON) {
    add({
      x: anchor.x + (viewport.yMinimum - anchor.y) / slope,
      y: viewport.yMinimum
    });
    add({
      x: anchor.x + (viewport.yMaximum - anchor.y) / slope,
      y: viewport.yMaximum
    });
  }

  return candidates
    .sort((left, right) => left.x - right.x || left.y - right.y)
    .slice(0, 2);
}

function pointsAttribute(points: readonly SemanticPoint[], viewport: SemanticViewport) {
  return mappedPoints(points, viewport)
    .map((point) => `${fixed(point.x, 1)},${fixed(point.y, 1)}`)
    .join(" ");
}

function metric(state: ConfiguredSemanticSecondaryMathState, key: string, fallback = 0) {
  const value = state.metrics[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function semanticTextLength(text: string, maximum: number) {
  return text.length * 6.4 > maximum ? maximum : undefined;
}

function renderAxes(theme: ConfiguredSemanticSecondaryVizTheme, viewport: SemanticViewport) {
  const origin = mapPoint({ x: 0, y: 0 }, viewport);
  const left = mapPoint({ x: viewport.xMinimum, y: 0 }, viewport);
  const right = mapPoint({ x: viewport.xMaximum, y: 0 }, viewport);
  const top = mapPoint({ x: 0, y: viewport.yMaximum }, viewport);
  const bottom = mapPoint({ x: 0, y: viewport.yMinimum }, viewport);
  const axisX = clamp(origin.x, Math.min(top.x, bottom.x), Math.max(top.x, bottom.x));
  const axisY = clamp(origin.y, Math.min(left.y, right.y), Math.max(left.y, right.y));
  return (
    <g aria-hidden="true">
      <line data-viz-mark data-viz-name="semantic x axis" data-viz-logical-y="0" x1={left.x} x2={right.x} y1={axisY} y2={axisY} stroke={theme.axis} strokeWidth="3" />
      <line data-viz-mark data-viz-name="semantic y axis" data-viz-logical-x="0" x1={axisX} x2={axisX} y1={top.y} y2={bottom.y} stroke={theme.axis} strokeWidth="3" />
    </g>
  );
}

function renderExactSolidBody(
  state: ConfiguredSemanticSecondaryMathState,
  accent: string,
  theme: ConfiguredSemanticSecondaryVizTheme
): ReactNode {
  const solidType = String(state.metrics.solidType ?? "cuboid") as ExactSolidType;
  const solidModel = String(state.metrics.solidModel ?? "");
  const primaryMeasure = metric(state, "primaryMeasure", metric(state, "radius", metric(state, "size", 3)));
  const height = metric(state, "height", metric(state, "solidHeight", primaryMeasure));
  const radiusPixels = 38 + Math.min(6, primaryMeasure) * 5;
  const heightPixels = 60 + Math.min(10, height) * 7;
  const centerX = 260;
  const topY = 120;
  let solidMarks: ReactNode;

  if (solidType === "cylinder") {
    solidMarks = (
      <g data-viz-mark data-viz-name="classified cylinder" data-viz-radius={metric(state, "radius", primaryMeasure)} data-viz-height={height}>
        <rect x={centerX - radiusPixels} y={topY + 13} width={radiusPixels * 2} height={heightPixels} fill={theme.softFill} stroke={accent} strokeWidth="5" />
        <ellipse cx={centerX} cy={topY + 13} rx={radiusPixels} ry="13" fill={theme.softFill} stroke={accent} strokeWidth="5" />
        <ellipse cx={centerX} cy={topY + 13 + heightPixels} rx={radiusPixels} ry="13" fill={theme.softFill} stroke={accent} strokeWidth="5" />
      </g>
    );
  } else if (solidType === "cone") {
    solidMarks = (
      <g data-viz-mark data-viz-name="classified cone" data-viz-radius={metric(state, "radius", primaryMeasure)} data-viz-height={height}>
        <path d={`M ${centerX} ${topY} L ${centerX - radiusPixels} ${topY + heightPixels} L ${centerX + radiusPixels} ${topY + heightPixels} Z`} fill={theme.softFill} stroke={accent} strokeWidth="5" strokeLinejoin="round" />
        <ellipse cx={centerX} cy={topY + heightPixels} rx={radiusPixels} ry="13" fill={theme.softFill} stroke={accent} strokeWidth="5" />
      </g>
    );
  } else if (solidType === "sphere") {
    const sphereRadius = 48 + Math.min(6, metric(state, "radius", metric(state, "size", 3))) * 6;
    const sectionRadius = metric(state, "crossSectionRadius", metric(state, "radius", sphereRadius));
    const logicalRadius = Math.max(EPSILON, metric(state, "radius", metric(state, "size", 3)));
    const sectionPixels = sphereRadius * clamp(sectionRadius / logicalRadius, 0, 1);
    const sectionY = 184 - clamp(metric(state, "sectionHeight", 0) / logicalRadius, -1, 1) * sphereRadius;
    solidMarks = (
      <g data-viz-mark data-viz-name="classified sphere" data-viz-radius={logicalRadius}>
        <circle cx={centerX} cy="184" r={sphereRadius} fill={theme.softFill} stroke={accent} strokeWidth="5" />
        <ellipse data-viz-mark data-viz-name="sphere cross section" data-viz-section-height={metric(state, "sectionHeight", 0)} data-viz-section-radius={sectionRadius} cx={centerX} cy={sectionY} rx={sectionPixels} ry={Math.max(2, sectionPixels * 0.24)} fill="none" stroke={theme.axisStrong} strokeWidth="3" strokeDasharray="7 5" />
      </g>
    );
  } else if (solidType === "pyramid") {
    const halfBase = 52 + Math.min(6, primaryMeasure) * 5;
    solidMarks = (
      <g data-viz-mark data-viz-name="classified pyramid" data-viz-base-side={primaryMeasure} data-viz-height={height}>
        <polygon points={`${centerX},${topY} ${centerX - halfBase},${topY + heightPixels} ${centerX + halfBase},${topY + heightPixels}`} fill={theme.softFill} stroke={accent} strokeWidth="5" strokeLinejoin="round" />
        <path d={`M ${centerX} ${topY} L ${centerX + halfBase * 0.45} ${topY + heightPixels - 20} L ${centerX - halfBase} ${topY + heightPixels}`} fill="none" stroke={theme.axisStrong} strokeWidth="3" strokeDasharray="7 5" />
      </g>
    );
  } else {
    const width = 80 + Math.min(8, metric(state, "solidWidth", primaryMeasure)) * 7;
    const bodyHeight = 62 + Math.min(10, metric(state, "solidHeight", height)) * 6;
    const depth = solidType === "cube" ? 32 : solidType === "cuboid" ? 46 : 36;
    const left = centerX - width / 2;
    const frontY = topY + depth * 0.55;
    solidMarks = (
      <g data-viz-mark data-viz-name={`classified ${solidType}`} data-viz-base-side={primaryMeasure} data-viz-height={height}>
        <path
          d={`M ${left} ${frontY} L ${left + width} ${frontY} L ${left + width + depth} ${topY} L ${left + depth} ${topY} Z M ${left} ${frontY} L ${left} ${frontY + bodyHeight} L ${left + width} ${frontY + bodyHeight} L ${left + width} ${frontY} M ${left + width} ${frontY + bodyHeight} L ${left + width + depth} ${topY + bodyHeight} L ${left + width + depth} ${topY} M ${left} ${frontY + bodyHeight} L ${left + depth} ${topY + bodyHeight} L ${left + width + depth} ${topY + bodyHeight}`}
          fill={theme.softFill}
          stroke={accent}
          strokeLinejoin="round"
          strokeWidth="5"
        />
      </g>
    );
  }

  const isClassification = solidModel === "classification";
  const readout = isClassification
    ? `${String(state.metrics.featureFocusName)} · flat ${state.metrics.flatFaces} · curved ${state.metrics.curvedSurfaces} · edges ${state.metrics.edges} · vertices ${state.metrics.vertices}`
    : `V≈${fixed(metric(state, "volume"))} · SA≈${fixed(metric(state, "surfaceArea"))}`;
  return (
    <g>
      {solidMarks}
      <text data-viz-mark data-viz-name="solid type readout" x="480" y="138" textAnchor="middle" fill={theme.text} className="text-xs font-black">{solidType}</text>
      <text
        data-viz-mark
        data-viz-name={isClassification ? "solid property readout" : "solid measurement readout"}
        x="480"
        y="166"
        textAnchor="middle"
        fill={theme.textMuted}
        className="text-[10px] font-bold"
        textLength={semanticTextLength(readout, 170)}
        lengthAdjust={semanticTextLength(readout, 170) ? "spacingAndGlyphs" : undefined}
      >
        {readout}
      </text>
    </g>
  );
}

function renderSemanticBody(
  state: ConfiguredSemanticSecondaryMathState,
  accent: string,
  theme: ConfiguredSemanticSecondaryVizTheme,
  noModelLabel?: string
): ReactNode {
  if (state.active) return renderSemanticBody(state.active, accent, theme, noModelLabel);

  if (state.kind === "similar-triangles") {
    const logicalPoints = [
      state.points.a,
      state.points.b,
      state.points.c,
      state.points.aPrime,
      state.points.bPrime,
      state.points.cPrime
    ];
    const viewport = viewportForState(state, logicalPoints);
    const [a, b, c, aPrime, bPrime, cPrime] = mappedPoints(logicalPoints, viewport);
    const sourceLabelY = Math.min(configuredSemanticSecondaryLayout.contentBottom - 2, Math.max(a.y, b.y) + 18);
    const scaledLabelY = Math.min(configuredSemanticSecondaryLayout.contentBottom - 2, Math.max(aPrime.y, bPrime.y) + 18);
    return (
      <g>
        <polygon data-viz-mark data-viz-name="source similar triangle" points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y}`} fill={theme.softFill} stroke={accent} strokeWidth="6" strokeLinejoin="round" />
        <polygon data-viz-mark data-viz-name="scaled similar triangle" data-viz-scale-factor={metric(state, "scaleFactor")} points={`${aPrime.x},${aPrime.y} ${bPrime.x},${bPrime.y} ${cPrime.x},${cPrime.y}`} fill={theme.softFill} stroke={theme.labelText} strokeWidth="6" strokeLinejoin="round" />
        {[[a, aPrime], [b, bPrime], [c, cPrime]].map(([source, target], index) => (
          <line key={index} data-viz-mark data-viz-name="corresponding vertex link" x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={theme.axisStrong} strokeWidth="2" strokeDasharray="6 6" />
        ))}
        <text data-viz-mark data-viz-name="similar side AB label" x={(a.x + b.x) / 2} y={sourceLabelY} textAnchor="middle" fill={theme.text} className="text-[10px] font-black">AB={fixed(metric(state, "sourceAB"))}</text>
        <text data-viz-mark data-viz-name="similar side A′B′ label" x={(aPrime.x + bPrime.x) / 2} y={scaledLabelY} textAnchor="middle" fill={theme.text} className="text-[10px] font-black">A′B′={fixed(metric(state, "scaledAB"))}</text>
      </g>
    );
  }

  if (state.kind === "classified-polygon") {
    const viewport = viewportForState(state, state.series);
    const points = mappedPoints(state.series, viewport);
    const shapeName = String(state.metrics.shapeName);
    const polygonPoints = points.map((point) => `${point.x},${point.y}`).join(" ");
    const composition = shapeName === "composition" && points.length === 4;
    return (
      <g>
        {composition ? (
          <>
            <polygon data-viz-mark data-viz-name="composition part one" data-viz-area={metric(state, "triangleOneArea")} points={`${points[0].x},${points[0].y} ${points[1].x},${points[1].y} ${points[2].x},${points[2].y}`} fill={theme.softFill} stroke={accent} strokeWidth="3" strokeLinejoin="round" />
            <polygon data-viz-mark data-viz-name="composition part two" data-viz-area={metric(state, "triangleTwoArea")} points={`${points[0].x},${points[0].y} ${points[2].x},${points[2].y} ${points[3].x},${points[3].y}`} fill={theme.labelFill} stroke={theme.labelText} strokeWidth="3" strokeLinejoin="round" />
          </>
        ) : null}
        <polygon data-viz-mark data-viz-name={`classified ${shapeName} polygon`} data-viz-parallel-pair-count={metric(state, "parallelPairCount")} data-viz-right-angle-count={metric(state, "rightAngleCount")} data-viz-equal-side-count={metric(state, "equalSideCount")} points={polygonPoints} fill={composition ? "none" : theme.softFill} stroke={accent} strokeWidth="6" strokeLinejoin="round" />
        {composition ? <line data-viz-mark data-viz-name="composition diagonal" x1={points[0].x} y1={points[0].y} x2={points[2].x} y2={points[2].y} stroke={theme.axisStrong} strokeWidth="4" strokeDasharray="7 5" /> : null}
        {points.map((point, index) => (
          <circle key={index} data-viz-mark data-viz-name={`classified vertex ${index + 1}`} cx={point.x} cy={point.y} r="6" fill={accent} stroke={theme.pointStroke} strokeWidth="2" />
        ))}
      </g>
    );
  }

  if (
    state.kind === "triangle" ||
    state.kind === "right-triangle" ||
    state.kind === "quadrilateral"
  ) {
    const keys = state.kind === "quadrilateral" ? ["a", "b", "c", "d"] : ["a", "b", "c"];
    const points = keys.map((key) => state.points[key]);
    const viewport = viewportForState(state, points);
    return (
      <g>
        <polygon data-viz-mark data-viz-name={`${state.kind} polygon`} data-viz-leg-a={state.kind === "right-triangle" ? metric(state, "legA") : undefined} data-viz-leg-b={state.kind === "right-triangle" ? metric(state, "legB") : undefined} data-viz-hypotenuse={state.kind === "right-triangle" ? metric(state, "hypotenuse") : undefined} points={pointsAttribute(points, viewport)} fill={theme.softFill} stroke={accent} strokeWidth="6" strokeLinejoin="round" />
        {mappedPoints(points, viewport).map((point, index) => (
          <circle key={keys[index]} data-viz-mark data-viz-name={`${keys[index]} vertex`} cx={point.x} cy={point.y} r="7" fill={accent} stroke={theme.pointStroke} strokeWidth="2" />
        ))}
      </g>
    );
  }

  if (state.kind === "angle") {
    const logicalPoints = [
      state.points.origin,
      state.points.base,
      state.points.ray,
      state.points.comparisonRay
    ];
    const viewport = viewportForState(state, logicalPoints);
    const [origin, base, ray, comparisonRay] = mappedPoints(logicalPoints, viewport);
    return (
      <g>
        <line data-viz-mark data-viz-name="shared angle baseline" x1={origin.x} y1={origin.y} x2={base.x} y2={base.y} stroke={theme.axisStrong} strokeWidth="7" strokeLinecap="round" />
        <line data-viz-mark data-viz-name="shared angle ray" data-viz-angle-degrees={metric(state, "angleDegrees")} x1={origin.x} y1={origin.y} x2={ray.x} y2={ray.y} stroke={accent} strokeWidth="7" strokeLinecap="round" />
        <line data-viz-mark data-viz-name="comparison angle ray" data-viz-angle-degrees={metric(state, "comparisonAngle")} x1={origin.x} y1={origin.y} x2={comparisonRay.x} y2={comparisonRay.y} stroke={theme.labelText} strokeWidth="5" strokeLinecap="round" strokeDasharray="8 6" />
        <circle data-viz-mark data-viz-name="shared angle vertex" cx={origin.x} cy={origin.y} r="8" fill={accent} />
      </g>
    );
  }

  if (state.kind === "lines") {
    const hasTransversal = Boolean(state.points.transversalA && state.points.transversalB);
    const logicalPoints = [
      state.points.line1A,
      state.points.line1B,
      state.points.line2A,
      state.points.line2B,
      ...(hasTransversal ? [state.points.transversalA, state.points.transversalB] : []),
      state.points.intersection1,
      ...(state.points.intersection2 ? [state.points.intersection2] : [])
    ];
    const viewport = viewportForState(state, logicalPoints);
    const points = mappedPoints(logicalPoints, viewport);
    const [line1A, line1B, line2A, line2B] = points;
    const transversalA = hasTransversal ? points[4] : null;
    const transversalB = hasTransversal ? points[5] : null;
    const intersectionOffset = hasTransversal ? 6 : 4;
    const intersection1 = points[intersectionOffset];
    const intersection2 = hasTransversal ? points[intersectionOffset + 1] : null;
    const relationKind = String(state.metrics.relationKind ?? "parallel-transversal");
    const lineOneVector = { x: line1B.x - intersection1.x, y: line1B.y - intersection1.y };
    const lineTwoBVector = { x: line2B.x - intersection1.x, y: line2B.y - intersection1.y };
    const acuteSecondRay = lineOneVector.x * lineTwoBVector.x + lineOneVector.y * lineTwoBVector.y >= 0
      ? line2B
      : line2A;
    const oppositeSecondRay = acuteSecondRay === line2B ? line2A : line2B;
    const parallelMarkerPath = (start: SemanticPoint, end: SemanticPoint) => {
      const center = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
      return `M ${fixed(center.x - 8, 1)} ${fixed(center.y - 7, 1)} L ${fixed(center.x, 1)} ${fixed(center.y, 1)} L ${fixed(center.x - 8, 1)} ${fixed(center.y + 7, 1)}`;
    };
    return (
      <g>
        <line data-viz-mark data-viz-name="relation line one" data-viz-relation={relationKind} x1={line1A.x} y1={line1A.y} x2={line1B.x} y2={line1B.y} stroke={accent} strokeWidth="6" />
        <line data-viz-mark data-viz-name="relation line two" data-viz-relation={relationKind} x1={line2A.x} y1={line2A.y} x2={line2B.x} y2={line2B.y} stroke={accent} strokeWidth="6" />
        {transversalA && transversalB ? (
          <line data-viz-mark data-viz-name="relation transversal" data-viz-angle-degrees={metric(state, "transversalAngleDegrees")} x1={transversalA.x} y1={transversalA.y} x2={transversalB.x} y2={transversalB.y} stroke={theme.axisStrong} strokeWidth="5" />
        ) : null}
        {relationKind === "parallel-transversal" ? (
          <>
            <path data-viz-mark data-viz-name="parallel marker" data-viz-parallel-marker-index="1" d={parallelMarkerPath(line1A, line1B)} fill="none" stroke={theme.labelText} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path data-viz-mark data-viz-name="parallel marker" data-viz-parallel-marker-index="2" d={parallelMarkerPath(line2A, line2B)} fill="none" stroke={theme.labelText} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : null}
        {relationKind === "parallel-transversal" && transversalB && intersection2 ? (
          <>
            <path data-viz-mark data-viz-name="corresponding angle one" data-viz-angle-degrees={metric(state, "angleDegrees")} d={minorAngleArcPath(intersection1, line1B, transversalB)} fill="none" stroke={theme.labelText} strokeWidth="4" />
            <path data-viz-mark data-viz-name="corresponding angle two" data-viz-angle-degrees={metric(state, "correspondingAngle")} d={minorAngleArcPath(intersection2, line2B, transversalB)} fill="none" stroke={theme.labelText} strokeWidth="4" />
          </>
        ) : null}
        {relationKind === "perpendicular" ? (
          <path data-viz-mark data-viz-name="perpendicular right-angle mark" data-viz-dot-product={metric(state, "perpendicularDotProduct")} d={rightAnglePath(intersection1, line1B, line2B)} fill="none" stroke={theme.axisStrong} strokeWidth="4" />
        ) : null}
        {relationKind === "intersecting" ? (
          <>
            <path data-viz-mark data-viz-name="vertical angle one" data-viz-angle-degrees={metric(state, "angleDegrees")} d={minorAngleArcPath(intersection1, line1B, acuteSecondRay)} fill="none" stroke={theme.labelText} strokeWidth="4" />
            <path data-viz-mark data-viz-name="vertical angle two" data-viz-angle-degrees={metric(state, "angleDegrees")} d={minorAngleArcPath(intersection1, line1A, oppositeSecondRay)} fill="none" stroke={theme.labelText} strokeWidth="4" />
          </>
        ) : null}
      </g>
    );
  }

  if (state.kind === "circle") {
    const radius = Math.min(72, 52 + metric(state, "radius", 2) * 7);
    const angle = (metric(state, "centralAngle", 90) * Math.PI) / 180;
    return (
      <g>
        <circle data-viz-mark data-viz-name="circle with radius" data-viz-radius={metric(state, "radius")} cx="320" cy="186" r={radius} fill={theme.softFill} stroke={accent} strokeWidth="6" />
        <path data-viz-mark data-viz-name="sector" data-viz-sector-fraction={metric(state, "sectorFraction")} d={`M 320 186 L ${320 + radius} 186 A ${radius} ${radius} 0 ${angle > Math.PI ? 1 : 0} 0 ${320 + radius * Math.cos(angle)} ${186 - radius * Math.sin(angle)} Z`} fill={accent} opacity="0.28" stroke={accent} strokeWidth="3" />
      </g>
    );
  }

  if (state.kind === "shape") {
    const viewport = viewportForState(state);
    return <polygon data-viz-mark data-viz-name="classified polygon" data-viz-sides={metric(state, "sides")} points={pointsAttribute(state.series, viewport)} fill={theme.softFill} stroke={accent} strokeWidth="6" strokeLinejoin="round" />;
  }

  if (state.kind === "solid") {
    if (state.metrics.solidModel) return renderExactSolidBody(state, accent, theme);
    const solidWidth = metric(state, "solidWidth", 3);
    const solidDepth = metric(state, "solidDepth", 3);
    const solidHeight = metric(state, "solidHeight", 3);
    const widthPixels = 46 + solidWidth * 13;
    const depthPixels = 26 + solidDepth * 9;
    const heightPixels = 42 + solidHeight * 8;
    const a = { x: 142, y: 142 };
    const b = { x: a.x + widthPixels, y: a.y + widthPixels * 0.28 };
    const d = { x: a.x + depthPixels, y: a.y - depthPixels * 0.55 };
    const c = { x: b.x + depthPixels, y: b.y - depthPixels * 0.55 };
    const a2 = { x: a.x, y: a.y + heightPixels };
    const b2 = { x: b.x, y: b.y + heightPixels };
    const c2 = { x: c.x, y: c.y + heightPixels };
    const d2 = { x: d.x, y: d.y + heightPixels };
    const frontWidth = 48 + solidWidth * 10;
    const frontHeight = 24 + solidHeight * 8;
    const topDepth = 18 + solidDepth * 8;
    if (state.metrics.displayMode === "net") {
      const netWidth = 36 + solidWidth * 6;
      const netHeight = 28 + solidHeight * 5;
      const netDepth = 18 + solidDepth * 4;
      const centerX = 320 - netWidth / 2;
      const centerY = 194;
      return (
        <g data-viz-mark data-viz-name="solid net" data-viz-width={solidWidth} data-viz-depth={solidDepth} data-viz-height={solidHeight}>
          <rect data-viz-mark data-viz-name="net front face" x={centerX} y={centerY} width={netWidth} height={netHeight} fill={theme.softFill} stroke={accent} strokeWidth="4" />
          <rect data-viz-mark data-viz-name="net back face" x={centerX} y={centerY - netHeight - netDepth} width={netWidth} height={netHeight} fill={theme.softFill} stroke={accent} strokeWidth="4" />
          <rect data-viz-mark data-viz-name="net top face" x={centerX} y={centerY - netDepth} width={netWidth} height={netDepth} fill={theme.softFill} stroke={theme.axisStrong} strokeWidth="4" />
          <rect data-viz-mark data-viz-name="net bottom face" x={centerX} y={centerY + netHeight} width={netWidth} height={netDepth} fill={theme.softFill} stroke={theme.axisStrong} strokeWidth="4" />
          <rect data-viz-mark data-viz-name="net left face" x={centerX - netDepth} y={centerY} width={netDepth} height={netHeight} fill={theme.softFill} stroke={theme.axisStrong} strokeWidth="4" />
          <rect data-viz-mark data-viz-name="net right face" x={centerX + netWidth} y={centerY} width={netDepth} height={netHeight} fill={theme.softFill} stroke={theme.axisStrong} strokeWidth="4" />
        </g>
      );
    }
    return (
      <g>
        <path data-viz-mark data-viz-name="linked solid" data-viz-width={solidWidth} data-viz-depth={solidDepth} data-viz-height={solidHeight} d={`M ${a.x} ${a.y} L ${b.x} ${b.y} L ${c.x} ${c.y} L ${d.x} ${d.y} Z M ${a2.x} ${a2.y} L ${b2.x} ${b2.y} L ${c2.x} ${c2.y} L ${d2.x} ${d2.y} Z M ${a.x} ${a.y} L ${a2.x} ${a2.y} M ${b.x} ${b.y} L ${b2.x} ${b2.y} M ${c.x} ${c.y} L ${c2.x} ${c2.y} M ${d.x} ${d.y} L ${d2.x} ${d2.y}`} fill={theme.softFill} stroke={accent} strokeWidth="4" strokeLinejoin="round" />
        <rect data-viz-mark data-viz-name="front projection" data-viz-width={solidWidth} data-viz-height={solidHeight} x="410" y="112" width={frontWidth} height={frontHeight} fill="none" stroke={theme.axisStrong} strokeWidth="4" />
        <rect data-viz-mark data-viz-name="top projection" data-viz-width={solidWidth} data-viz-depth={solidDepth} x="410" y="202" width={frontWidth} height={topDepth} fill="none" stroke={theme.axisStrong} strokeWidth="4" />
        <rect data-viz-mark data-viz-name="side projection" data-viz-depth={solidDepth} data-viz-height={solidHeight} x={530 - topDepth} y="112" width={topDepth} height={frontHeight} fill="none" stroke={theme.axisStrong} strokeWidth="4" />
      </g>
    );
  }

  if (state.kind === "relative-position") {
    const viewport = viewportForState(state, Object.values(state.points));
    const reference = mapPoint(state.points.reference, viewport);
    const elbow = mapPoint(state.points.elbow, viewport);
    const target = mapPoint(state.points.target, viewport);
    const coincident = state.metrics.coincident === true;
    const positionGrid = state.variant === "relative-position-grid";
    const gridIndexes = [0, 1, 2, 3, 4] as const;
    return (
      <g>
        {positionGrid ? (
          <g data-viz-mark data-viz-name="position grid">
            {gridIndexes.map((column) => {
              const top = mapPoint({ x: column, y: 4 }, viewport);
              const bottom = mapPoint({ x: column, y: 0 }, viewport);
              return <line key={`column-${column}`} data-viz-mark data-viz-name="position grid column" data-viz-column={column} x1={top.x} y1={top.y} x2={bottom.x} y2={bottom.y} stroke={theme.grid} strokeWidth="2" />;
            })}
            {gridIndexes.map((row) => {
              const left = mapPoint({ x: 0, y: row }, viewport);
              const right = mapPoint({ x: 4, y: row }, viewport);
              return <line key={`row-${row}`} data-viz-mark data-viz-name="position grid row" data-viz-row={row} x1={left.x} y1={left.y} x2={right.x} y2={right.y} stroke={theme.grid} strokeWidth="2" />;
            })}
            {gridIndexes.map((column) => {
              const marker = mapPoint({ x: column, y: -0.9 }, viewport);
              return <text key={`ordinal-${column}`} data-viz-mark data-viz-name="position ordinal marker" data-viz-ordinal={column + 1} x={marker.x} y={marker.y} textAnchor="middle" fill={theme.textMuted} className="text-[9px] font-black">{column + 1}</text>;
            })}
          </g>
        ) : (
          <>
            {renderAxes(theme, viewport)}
            <text data-viz-mark data-viz-name="compass north" x={mapPoint({ x: 0, y: 4.55 }, viewport).x} y={mapPoint({ x: 0, y: 4.55 }, viewport).y} textAnchor="middle" fill={theme.textMuted} className="text-[10px] font-black">N</text>
            <text data-viz-mark data-viz-name="compass east" x={mapPoint({ x: 4.55, y: 0 }, viewport).x} y={mapPoint({ x: 4.55, y: 0 }, viewport).y} textAnchor="middle" fill={theme.textMuted} className="text-[10px] font-black">E</text>
            <text data-viz-mark data-viz-name="compass south" x={mapPoint({ x: 0, y: -4.55 }, viewport).x} y={mapPoint({ x: 0, y: -4.55 }, viewport).y} textAnchor="middle" fill={theme.textMuted} className="text-[10px] font-black">S</text>
            <text data-viz-mark data-viz-name="compass west" x={mapPoint({ x: -4.55, y: 0 }, viewport).x} y={mapPoint({ x: -4.55, y: 0 }, viewport).y} textAnchor="middle" fill={theme.textMuted} className="text-[10px] font-black">W</text>
          </>
        )}
        {coincident ? (
          <circle data-viz-mark data-viz-name="zero-step position route" cx={reference.x} cy={reference.y} r="5" fill="none" stroke={accent} strokeWidth="3" strokeDasharray="3 2" />
        ) : (
          <path data-viz-mark data-viz-name="position route" d={`M ${reference.x} ${reference.y} L ${elbow.x} ${elbow.y} L ${target.x} ${target.y}`} fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        )}
        <circle data-viz-mark data-viz-name="reference location" cx={reference.x} cy={reference.y} r="9" fill={theme.labelText} stroke={theme.pointStroke} strokeWidth="2" />
        {coincident ? (
          <circle data-viz-mark data-viz-name="coincident target location" data-viz-coincident-with="reference location" cx={target.x} cy={target.y} r="16" fill="none" stroke={accent} strokeWidth="4" />
        ) : (
          <circle data-viz-mark data-viz-name="target location" cx={target.x} cy={target.y} r="10" fill={accent} stroke={theme.pointStroke} strokeWidth="2" />
        )}
        <text data-viz-mark data-viz-name="reference label" x={reference.x - 17} y={reference.y - 13} fill={theme.text} className="text-xs font-black">R</text>
        <text
          data-viz-mark
          data-viz-name="target label"
          x={target.x + (coincident ? 22 : target.x < reference.x ? -13 : 13)}
          y={target.y - 13}
          textAnchor={!coincident && target.x < reference.x ? "end" : "start"}
          fill={theme.text}
          className="text-xs font-black"
        >T</text>
      </g>
    );
  }

  if (state.kind === "reflection" || state.kind === "transform" || state.kind === "coordinate" || state.kind === "complex") {
    const logicalPoints = Object.values(state.points);
    const viewport = viewportForState(state);
    const points = mappedPoints(logicalPoints, viewport);
    const mirrorAxisX = mapPoint({ x: 0, y: 0 }, viewport).x;
    const logicalOrigin = mapPoint({ x: 0, y: 0 }, viewport);
    const complexTargets = state.kind === "complex"
      ? [state.points.z, state.points.conjugate, state.points.rotated].map((point) => mapPoint(point, viewport))
      : [];
    return (
      <g>
        {renderAxes(theme, viewport)}
        {state.kind === "reflection" ? <line data-viz-mark data-viz-name="mirror axis" data-viz-logical-x="0" x1={mirrorAxisX} x2={mirrorAxisX} y1={secondaryFrame.top} y2={secondaryFrame.bottom} stroke={theme.axisStrong} strokeWidth="4" strokeDasharray="8 7" /> : null}
        {complexTargets.map((point, index) => <line key={index} data-viz-mark data-viz-name={index === 0 ? "complex z vector" : index === 1 ? "complex conjugate vector" : "complex rotated vector"} data-viz-modulus={metric(state, "modulus")} x1={logicalOrigin.x} y1={logicalOrigin.y} x2={point.x} y2={point.y} stroke={index === 0 ? accent : index === 1 ? theme.labelText : theme.axisStrong} strokeWidth={index === 0 ? 5 : 3} strokeDasharray={index === 0 ? undefined : "7 5"} />)}
        {state.kind === "complex" ? <text data-viz-mark data-viz-name="complex rotation label" x="112" y="136" fill={theme.text} className="text-xs font-black">R{fixed(metric(state, "rotationDegrees"), 0)}°(z)</text> : null}
        {points.map((point, index) => (
          <circle key={index} data-viz-mark data-viz-name={`${state.kind} point ${index + 1}`} cx={point.x} cy={point.y} r="9" fill={index === 0 ? accent : theme.labelText} stroke={theme.pointStroke} strokeWidth="2" />
        ))}
        {points.length > 1 && state.kind !== "complex" ? <line data-viz-mark data-viz-name={`${state.kind} connector`} x1={points[points.length - 2].x} y1={points[points.length - 2].y} x2={points[points.length - 1].x} y2={points[points.length - 1].y} stroke={accent} strokeWidth="4" strokeDasharray="7 6" /> : null}
      </g>
    );
  }

  if (state.kind === "analytic") {
    const center = state.points.center;
    const radius = metric(state, "radius");
    const logicalCircle = Array.from({ length: 33 }, (_, index) => {
      const radians = (index / 32) * Math.PI * 2;
      return { x: center.x + radius * Math.cos(radians), y: center.y + radius * Math.sin(radians) };
    });
    const line = [-3, 3].map((x) => ({ x, y: metric(state, "slope") * x + metric(state, "intercept") }));
    const viewport = viewportForState(state, [...logicalCircle, ...line]);
    return (
      <g>
        {renderAxes(theme, viewport)}
        <path data-viz-mark data-viz-name="analytic circle" data-viz-equation-residual={metric(state, "circleResidual")} d={`${pathForSeries(logicalCircle, viewport)} Z`} fill="none" stroke={accent} strokeWidth="5" />
        <path data-viz-mark data-viz-name="analytic line" data-viz-equation-residual={metric(state, "lineResidual")} d={pathForSeries(line, viewport)} fill="none" stroke={theme.labelText} strokeWidth="5" />
      </g>
    );
  }

  if (state.kind === "equation" || state.kind === "expression") {
    const leftLabel = state.kind === "equation"
      ? `${metric(state, "coefficient")}x + ${metric(state, "constant")}`
      : `${metric(state, "a")} + ${metric(state, "b")}×${metric(state, "c")}`;
    const rightLabel = state.kind === "equation"
      ? `${metric(state, "right")}`
      : `${metric(state, "b")}×${metric(state, "c")} + ${metric(state, "a")}`;
    return (
      <g>
        <line data-viz-mark data-viz-name="symbolic balance beam" x1="154" x2="486" y1="174" y2="174" stroke={theme.axisStrong} strokeWidth="8" strokeLinecap="round" />
        <circle data-viz-mark data-viz-name="balance pivot" cx="320" cy="196" r="20" fill={accent} stroke={theme.pointStroke} strokeWidth="3" />
        <rect data-viz-mark data-viz-overlap-ok data-viz-overlap-owner="symbolic-left-expression-card" data-viz-overlap-reason="left symbolic expression is intentionally contained by its state card" data-viz-name="left symbolic state" x="112" y="108" width="166" height="48" rx="14" fill={theme.softFill} stroke={accent} strokeWidth="4" />
        <rect data-viz-mark data-viz-overlap-ok data-viz-overlap-owner="symbolic-right-expression-card" data-viz-overlap-reason="right symbolic expression is intentionally contained by its state card" data-viz-name="right symbolic state" x="362" y="108" width="166" height="48" rx="14" fill={theme.softFill} stroke={accent} strokeWidth="4" />
        <text data-viz-mark data-viz-overlap-ok data-viz-overlap-owner="symbolic-left-expression-card" data-viz-overlap-reason="left symbolic expression is intentionally contained by its state card" data-viz-name="left symbolic expression" x="195" y="139" textAnchor="middle" fill={theme.text} className="text-sm font-black">{leftLabel}</text>
        <text data-viz-mark data-viz-overlap-ok data-viz-overlap-owner="symbolic-right-expression-card" data-viz-overlap-reason="right symbolic expression is intentionally contained by its state card" data-viz-name="right symbolic expression" x="445" y="139" textAnchor="middle" fill={theme.text} className="text-sm font-black">{rightLabel}</text>
        {state.kind === "equation" ? <>
          <text data-viz-mark data-viz-name="left synchronized operation" data-viz-delta={metric(state, "leftDelta")} x="195" y="230" textAnchor="middle" fill={theme.textMuted} className="text-xs font-black">{fixed(metric(state, "leftDelta"))}</text>
          <text data-viz-mark data-viz-name="right synchronized operation" data-viz-delta={metric(state, "rightDelta")} x="445" y="230" textAnchor="middle" fill={theme.textMuted} className="text-xs font-black">{fixed(metric(state, "rightDelta"))}</text>
        </> : null}
      </g>
    );
  }

  if (state.kind === "polynomial") {
    const linearTiles = Math.min(8, Math.abs(metric(state, "expandedLinear")));
    const unitTiles = Math.min(12, Math.abs(metric(state, "expandedConstant")));
    return (
      <g>
        <rect data-viz-mark data-viz-name="x squared algebra tile" data-viz-coefficient="1" x="142" y="112" width="112" height="112" fill={theme.softFill} stroke={accent} strokeWidth="5" />
        {Array.from({ length: linearTiles }, (_, index) => <rect key={index} data-viz-mark data-viz-name="x algebra tile" data-viz-sign={metric(state, "expandedLinear") >= 0 ? 1 : -1} x={286 + (index % 4) * 34} y={112 + Math.floor(index / 4) * 58} width="24" height="48" fill={metric(state, "expandedLinear") >= 0 ? accent : theme.labelText} opacity="0.72" />)}
        {Array.from({ length: unitTiles }, (_, index) => <rect key={index} data-viz-mark data-viz-name="unit algebra tile" data-viz-sign={metric(state, "expandedConstant") >= 0 ? 1 : -1} x={438 + (index % 4) * 22} y={112 + Math.floor(index / 4) * 22} width="16" height="16" fill={metric(state, "expandedConstant") >= 0 ? accent : theme.labelText} />)}
      </g>
    );
  }

  if (state.kind === "system") {
    const xDomain = [-1, 6];
    const firstLine = xDomain.map((x) => ({ x, y: metric(state, "firstRight") - 2 * x }));
    const secondLine = xDomain.map((x) => ({ x, y: x - metric(state, "secondRight") }));
    const viewport = viewportForState(state, [...firstLine, ...secondLine]);
    const solution = mapPoint(state.points.solution, viewport);
    return (
      <g>
        {renderAxes(theme, viewport)}
        <path data-viz-mark data-viz-name="system equation one" d={pathForSeries(firstLine, viewport)} fill="none" stroke={accent} strokeWidth="5" />
        <path data-viz-mark data-viz-name="system equation two" d={pathForSeries(secondLine, viewport)} fill="none" stroke={theme.labelText} strokeWidth="5" />
        <circle data-viz-mark data-viz-name="system intersection" data-viz-x={metric(state, "solutionX")} data-viz-y={metric(state, "solutionY")} cx={solution.x} cy={solution.y} r="8" fill={accent} stroke={theme.pointStroke} strokeWidth="2" />
      </g>
    );
  }

  if (state.kind === "inequality") {
    const boundary = metric(state, "boundary");
    const pointsRight = state.metrics.solvedOperator === "≥";
    const viewport: SemanticViewport = { xMinimum: boundary - 5, xMaximum: boundary + 5, yMinimum: -1, yMaximum: 1 };
    const start = mapPoint({ x: pointsRight ? boundary : boundary - 4.5, y: 0 }, viewport);
    const end = mapPoint({ x: pointsRight ? boundary + 4.5 : boundary, y: 0 }, viewport);
    const boundaryPoint = mapPoint({ x: boundary, y: 0 }, viewport);
    return (
      <g>
        <line data-viz-mark data-viz-name="inequality number line" x1={secondaryFrame.left} x2={secondaryFrame.right} y1={boundaryPoint.y} y2={boundaryPoint.y} stroke={theme.axisStrong} strokeWidth="5" />
        <line data-viz-mark data-viz-name="inequality solution ray" data-viz-operator={String(state.metrics.solvedOperator)} data-viz-boundary={boundary} x1={start.x} x2={end.x} y1={start.y} y2={end.y} stroke={accent} strokeWidth="10" strokeLinecap="round" />
        <circle data-viz-mark data-viz-name="closed inequality endpoint" cx={boundaryPoint.x} cy={boundaryPoint.y} r="10" fill={accent} stroke={theme.pointStroke} strokeWidth="3" />
      </g>
    );
  }

  if (state.kind === "sets") {
    return (
      <g>
        <circle data-viz-mark data-viz-overlap-ok data-viz-overlap-owner="set-logic-venn-model" data-viz-overlap-reason="set labels are intentionally contained by the overlapping Venn circles" data-viz-name="set A" cx="275" cy="180" r="70" fill={accent} opacity="0.24" stroke={accent} strokeWidth="5" />
        <circle data-viz-mark data-viz-overlap-ok data-viz-overlap-owner="set-logic-venn-model" data-viz-overlap-reason="set labels are intentionally contained by the overlapping Venn circles" data-viz-name="set B" cx="365" cy="180" r="70" fill={theme.labelText} opacity="0.22" stroke={theme.labelText} strokeWidth="5" />
        {state.labels.map((label, index) => <text key={label} data-viz-mark data-viz-overlap-ok data-viz-overlap-owner="set-logic-venn-model" data-viz-overlap-reason="set labels are intentionally contained by the overlapping Venn circles" data-viz-name="set membership" x={index === 0 ? 230 : 410} y="178" textAnchor="middle" fill={theme.text} className="text-[11px] font-black">{label}</text>)}
        <text data-viz-mark data-viz-overlap-ok data-viz-overlap-owner="set-logic-venn-model" data-viz-overlap-reason="set labels are intentionally contained by the overlapping Venn circles" data-viz-name="set intersection size" x="320" y="210" textAnchor="middle" fill={theme.text} className="text-xs font-black">|A∩B|={metric(state, "intersectionSize")}</text>
      </g>
    );
  }

  if (["advanced-functions", "linear", "reciprocal", "quadratic", "properties", "exp-log", "sequence", "calculus", "regression", "distribution"].includes(state.kind)) {
    const inverseSeries = state.kind === "exp-log"
      ? state.series.map((point) => ({ x: point.y, y: point.x }))
      : [];
    const comparisonSeries = state.comparisonSeries ?? [];
    const viewport = viewportForState(state, [...inverseSeries, ...comparisonSeries]);
    const path = pathForSeries(state.series, viewport);
    const points = mappedPoints(state.series, viewport);
    const summaryDistribution = state.kind === "distribution" && state.metrics.summaryOnly === true;
    const hkCalculus = state.kind === "calculus" && state.metrics.hkExactModel === true;
    const activeCalculusMode = hkCalculus ? String(state.metrics.activeMode) : "";
    const regressionDomain = state.series.length
      ? [state.series[0].x, state.series[state.series.length - 1].x]
      : [0, 1];
    const regressionLine = regressionDomain.map((x) => ({
      x,
      y: metric(state, "slope") * x + metric(state, "intercept")
    }));
    const regressionResiduals = state.kind === "regression"
      ? state.series.map((observed) => ({
          observed: mapPoint(observed, viewport),
          predicted: mapPoint({
            x: observed.x,
            y: metric(state, "slope") * observed.x + metric(state, "intercept")
          }, viewport),
          residual: observed.y - (metric(state, "slope") * observed.x + metric(state, "intercept"))
        }))
      : [];
    const tangentPoint = state.points.tangent;
    const tangentLine = tangentPoint
      ? clippedLineSeries(tangentPoint, metric(state, "tangentSlope"), viewport)
      : [];
    const secantLine = tangentPoint && state.points.secant
      ? [tangentPoint, state.points.secant]
      : [];
    const mappedTangentPoint = tangentPoint ? mapPoint(tangentPoint, viewport) : null;
    const mappedSecondPoint = state.points.second ? mapPoint(state.points.second, viewport) : null;
    return (
      <g>
        {renderAxes(theme, viewport)}
        {summaryDistribution
          ? <path data-viz-mark data-viz-name="distribution summary curve" data-viz-mean={metric(state, "mean")} data-viz-spread={metric(state, "spread")} data-viz-symmetry-residual={metric(state, "symmetryResidual")} d={path} fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          : state.kind === "advanced-functions"
            ? <path data-viz-mark data-viz-name="advanced primary curve" data-viz-function-family={String(state.metrics.primaryFamily)} data-viz-scale-parameter={metric(state, "scaleParameter")} data-viz-vertical-shift={metric(state, "verticalShift")} data-viz-formula={String(state.metrics.primaryFormula)} d={path} fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          : state.kind === "sequence" || state.kind === "regression" || state.kind === "distribution"
          ? points.map((point, index) => <circle key={index} data-viz-mark data-viz-name={`${state.kind} sample`} data-viz-observed={state.kind === "distribution" && index === metric(state, "observedIndex") ? "true" : undefined} data-viz-z-score={state.kind === "distribution" && index === metric(state, "observedIndex") ? metric(state, "zScore") : undefined} cx={point.x} cy={point.y} r={state.kind === "distribution" && index === metric(state, "observedIndex") ? 9 : 6} fill={state.kind === "distribution" && index === metric(state, "observedIndex") ? theme.labelText : accent} stroke={theme.pointStroke} strokeWidth="2" />)
          : state.kind === "reciprocal"
            ? <>
                <path data-viz-mark data-viz-name="reciprocal negative branch" d={pathForSeries(state.series.filter((point) => point.x < 0), viewport)} fill="none" stroke={accent} strokeWidth="5" />
                <path data-viz-mark data-viz-name="reciprocal positive branch" d={pathForSeries(state.series.filter((point) => point.x > 0), viewport)} fill="none" stroke={accent} strokeWidth="5" />
              </>
            : <path data-viz-mark data-viz-name={`${state.kind} curve`} d={path} fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />}
        {state.kind === "advanced-functions" ? <path data-viz-mark data-viz-name="advanced comparison curve" data-viz-function-family={String(state.metrics.comparisonFamily)} data-viz-scale-parameter={metric(state, "scaleParameter")} data-viz-vertical-shift={metric(state, "verticalShift")} data-viz-formula={String(state.metrics.comparisonFormula)} d={pathForSeries(comparisonSeries, viewport)} fill="none" stroke={theme.labelText} strokeWidth="4" strokeDasharray="8 6" strokeLinecap="round" strokeLinejoin="round" /> : null}
        {state.kind === "advanced-functions" ? <text data-viz-mark data-viz-name="advanced function readout" data-viz-primary-family={String(state.metrics.primaryFamily)} data-viz-comparison-family={String(state.metrics.comparisonFamily)} data-viz-scale-parameter={metric(state, "scaleParameter")} data-viz-vertical-shift={metric(state, "verticalShift")} x="320" y="108" textAnchor="middle" fill={theme.text} className="text-[11px] font-black">{String(state.metrics.primaryFamily)} → {String(state.metrics.comparisonFamily)} · a={fixed(metric(state, "scaleParameter"))} · k={fixed(metric(state, "verticalShift"))}</text> : null}
        {summaryDistribution ? <line data-viz-mark data-viz-name="distribution mean" data-viz-mean={metric(state, "mean")} x1={mapPoint({ x: metric(state, "mean"), y: 0 }, viewport).x} x2={mapPoint({ x: metric(state, "mean"), y: 1 }, viewport).x} y1={mapPoint({ x: metric(state, "mean"), y: 0 }, viewport).y} y2={mapPoint({ x: metric(state, "mean"), y: 1 }, viewport).y} stroke={theme.labelText} strokeWidth="3" strokeDasharray="5 4" /> : null}
        {summaryDistribution ? <text data-viz-mark data-viz-name="distribution summary readout" data-viz-mean={metric(state, "mean")} data-viz-spread={metric(state, "spread")} x="320" y="108" textAnchor="middle" fill={theme.text} className="text-[11px] font-black">mean={fixed(metric(state, "mean"))} · spread={fixed(metric(state, "spread"))} · symmetric distribution</text> : null}
        {state.kind === "exp-log" ? <path data-viz-mark data-viz-name="logarithmic inverse curve" d={pathForSeries(inverseSeries, viewport)} fill="none" stroke={theme.labelText} strokeWidth="4" strokeDasharray="8 6" /> : null}
        {state.kind === "linear" ? points.map((point, index) => <circle key={index} data-viz-mark data-viz-name="linear table point" data-viz-x={state.series[index].x} data-viz-y={state.series[index].y} cx={point.x} cy={point.y} r="5" fill={theme.labelText} stroke={theme.pointStroke} strokeWidth="1.5" />) : null}
        {state.kind === "quadratic" ? [
          { name: "quadratic root A", point: { x: metric(state, "rootA"), y: 0 } },
          { name: "quadratic root B", point: { x: metric(state, "rootB"), y: 0 } },
          { name: "quadratic vertex", point: state.points.vertex }
        ].map((entry) => {
          const point = mapPoint(entry.point, viewport);
          return <circle key={entry.name} data-viz-mark data-viz-name={entry.name} data-viz-x={entry.point.x} data-viz-y={entry.point.y} cx={point.x} cy={point.y} r="6" fill={theme.labelText} stroke={theme.pointStroke} strokeWidth="2" />;
        }) : null}
        {state.kind === "regression" ? <path data-viz-mark data-viz-name="regression line" data-viz-slope={metric(state, "slope")} data-viz-intercept={metric(state, "intercept")} data-viz-residual-sum={metric(state, "residualSum")} d={pathForSeries(regressionLine, viewport)} fill="none" stroke={theme.labelText} strokeWidth="4" /> : null}
        {regressionResiduals.map((entry, index) => <line key={index} data-viz-mark data-viz-name="regression residual" data-viz-residual={entry.residual} x1={entry.predicted.x} x2={entry.observed.x} y1={entry.predicted.y} y2={entry.observed.y} stroke={theme.axisStrong} strokeWidth="2.5" strokeDasharray="4 3" />)}
        {state.kind === "calculus" && !hkCalculus && state.family === "derivative-rate-area" ? Array.from({ length: 6 }, (_, index) => {
          const x0 = -1.5 + index * 0.5;
          const x1 = x0 + 0.45;
          const midpoint = (x0 + x1) / 2;
          const y = midpoint ** 2 + metric(state, "verticalShift");
          const topLeft = mapPoint({ x: x0, y: Math.max(0, y) }, viewport);
          const bottomRight = mapPoint({ x: x1, y: Math.min(0, y) }, viewport);
          return <rect key={index} data-viz-mark data-viz-name="calculus area strip" data-viz-x={midpoint} data-viz-y={y} x={topLeft.x} y={Math.min(topLeft.y, bottomRight.y)} width={Math.abs(bottomRight.x - topLeft.x)} height={Math.max(2, Math.abs(bottomRight.y - topLeft.y))} fill={accent} opacity="0.18" />;
        }) : null}
        {hkCalculus && activeCalculusMode === "area" ? Array.from({ length: metric(state, "stripCount") }, (_, index) => {
          const x0 = metric(state, "lowerBound") + index * metric(state, "stripWidth");
          const x1 = x0 + metric(state, "stripWidth");
          const midpoint = (x0 + x1) / 2;
          const functionValue = 0.5 * metric(state, "curvature") * midpoint ** 2 + 0.35;
          const baselineLeft = mapPoint({ x: x0, y: 0 }, viewport);
          const topRight = mapPoint({ x: x1, y: functionValue }, viewport);
          return <rect key={index} data-viz-mark data-viz-name="calculus area strip" data-viz-strip-index={index + 1} data-viz-strip-count={metric(state, "stripCount")} data-viz-left={x0} data-viz-right={x1} data-viz-midpoint={midpoint} data-viz-function-value={functionValue} data-viz-contribution={functionValue * metric(state, "stripWidth")} x={baselineLeft.x} y={Math.min(baselineLeft.y, topRight.y)} width={Math.max(2, Math.abs(topRight.x - baselineLeft.x))} height={Math.max(2, Math.abs(baselineLeft.y - topRight.y))} fill={accent} opacity="0.28" />;
        }) : null}
        {hkCalculus && activeCalculusMode === "area" ? <line data-viz-mark data-viz-name="calculus lower bound" data-viz-lower-bound={metric(state, "lowerBound")} x1={mapPoint({ x: metric(state, "lowerBound"), y: 0 }, viewport).x} x2={mapPoint({ x: metric(state, "lowerBound"), y: 0.5 * metric(state, "curvature") * metric(state, "lowerBound") ** 2 + 0.35 }, viewport).x} y1={mapPoint({ x: metric(state, "lowerBound"), y: 0 }, viewport).y} y2={mapPoint({ x: metric(state, "lowerBound"), y: 0.5 * metric(state, "curvature") * metric(state, "lowerBound") ** 2 + 0.35 }, viewport).y} stroke={theme.axisStrong} strokeWidth="4" /> : null}
        {hkCalculus && activeCalculusMode === "area" ? <line data-viz-mark data-viz-name="calculus upper bound" data-viz-upper-bound={metric(state, "upperBound")} x1={mapPoint({ x: metric(state, "upperBound"), y: 0 }, viewport).x} x2={mapPoint({ x: metric(state, "upperBound"), y: metric(state, "functionValue") }, viewport).x} y1={mapPoint({ x: metric(state, "upperBound"), y: 0 }, viewport).y} y2={mapPoint({ x: metric(state, "upperBound"), y: metric(state, "functionValue") }, viewport).y} stroke={theme.axisStrong} strokeWidth="4" /> : null}
        {state.kind === "calculus" && tangentLine.length && (!hkCalculus || activeCalculusMode === "tangent") ? <path data-viz-mark data-viz-name="tangent line" data-viz-slope={metric(state, "tangentSlope")} d={pathForSeries(tangentLine, viewport)} fill="none" stroke={theme.labelText} strokeWidth="4" /> : null}
        {state.kind === "calculus" && secantLine.length && (!hkCalculus || activeCalculusMode === "secant") ? <path data-viz-mark data-viz-name="secant line" data-viz-x0={metric(state, "x0", metric(state, "x"))} data-viz-x1={metric(state, "x1", state.points.secant?.x ?? 0)} data-viz-slope={metric(state, "secantSlope")} d={pathForSeries(secantLine, viewport)} fill="none" stroke={theme.axisStrong} strokeWidth="3" strokeDasharray="7 6" /> : null}
        {hkCalculus && mappedTangentPoint ? <circle data-viz-mark data-viz-name="calculus probe point" data-viz-x0={metric(state, "x0")} data-viz-y0={metric(state, "functionValue")} data-viz-tangent-slope={metric(state, "tangentSlope")} cx={mappedTangentPoint.x} cy={mappedTangentPoint.y} r="7" fill={accent} stroke={theme.pointStroke} strokeWidth="2" /> : null}
        {hkCalculus && activeCalculusMode === "secant" && mappedSecondPoint ? <circle data-viz-mark data-viz-name="calculus second point" data-viz-x1={metric(state, "x1")} data-viz-y1={metric(state, "secondPointY")} data-viz-secant-slope={metric(state, "secantSlope")} cx={mappedSecondPoint.x} cy={mappedSecondPoint.y} r="7" fill={theme.labelText} stroke={theme.pointStroke} strokeWidth="2" /> : null}
        {hkCalculus ? <text data-viz-mark data-viz-name="calculus mode readout" data-viz-active-mode={activeCalculusMode} data-viz-curvature={metric(state, "curvature")} data-viz-x0={metric(state, "probeX")} data-viz-x1={activeCalculusMode === "secant" ? metric(state, "x1") : undefined} data-viz-secant-slope={activeCalculusMode === "secant" ? metric(state, "secantSlope") : undefined} data-viz-lower-bound={activeCalculusMode === "area" ? metric(state, "lowerBound") : undefined} data-viz-exact-integral={activeCalculusMode === "area" ? metric(state, "exactIntegral") : undefined} data-viz-midpoint-approximation={activeCalculusMode === "area" ? metric(state, "midpointApproximation") : undefined} data-viz-signed-error={activeCalculusMode === "area" ? metric(state, "signedError") : undefined} data-viz-absolute-error={activeCalculusMode === "area" ? metric(state, "absoluteError") : undefined} x="320" y="108" textAnchor="middle" fill={theme.text} className="text-[10px] font-black">{state.check}</text> : null}
      </g>
    );
  }

  if (state.kind === "trigonometry") {
    const triangleScale = Math.min(
      210 / Math.max(EPSILON, metric(state, "adjacent")),
      126 / Math.max(EPSILON, metric(state, "opposite"))
    );
    const triangleOrigin = { x: 128, y: 242 };
    const triangleAdjacent = {
      x: triangleOrigin.x + metric(state, "adjacent") * triangleScale,
      y: triangleOrigin.y
    };
    const triangleOpposite = {
      x: triangleAdjacent.x,
      y: triangleOrigin.y - metric(state, "opposite") * triangleScale
    };
    if (state.family === "triangle-trigonometry") {
      const adjacentLabelY = triangleOrigin.y + 32;
      return (
        <g>
          <polygon data-viz-mark data-viz-name="marked trigonometric right triangle" data-viz-angle-degrees={metric(state, "degrees")} data-viz-adjacent={metric(state, "adjacent")} data-viz-opposite={metric(state, "opposite")} data-viz-hypotenuse={metric(state, "hypotenuse")} data-viz-base-y={triangleOrigin.y} points={`${triangleOrigin.x},${triangleOrigin.y} ${triangleAdjacent.x},${triangleAdjacent.y} ${triangleOpposite.x},${triangleOpposite.y}`} fill={theme.softFill} stroke={accent} strokeWidth="6" />
          <path data-viz-mark data-viz-name="trigonometric right angle" d={`M ${triangleAdjacent.x - 18} ${triangleAdjacent.y} L ${triangleAdjacent.x - 18} ${triangleAdjacent.y - 18} L ${triangleAdjacent.x} ${triangleAdjacent.y - 18}`} fill="none" stroke={theme.axisStrong} strokeWidth="4" />
          <text data-viz-mark data-viz-name="opposite label" x={triangleAdjacent.x + 22} y={(triangleAdjacent.y + triangleOpposite.y) / 2} fill={theme.text} className="text-xs font-black">opp={fixed(metric(state, "opposite"))}</text>
          <text data-viz-mark data-viz-name="adjacent label" data-viz-label-placement="outside-below-base" data-viz-label-y={adjacentLabelY} data-viz-triangle-clearance={adjacentLabelY - triangleOrigin.y} x={(triangleOrigin.x + triangleAdjacent.x) / 2} y={adjacentLabelY} textAnchor="middle" fill={theme.text} className="text-xs font-black">adj={fixed(metric(state, "adjacent"))}</text>
        </g>
      );
    }

    const circleCenter = { x: state.family === "trigonometric-synthesis" ? 154 : 190, y: 184 };
    const referenceLength = metric(state, "referenceLength", metric(state, "hypotenuse", 1));
    const circleRadius = 34 + referenceLength * (state.family === "trigonometric-synthesis" ? 7 : 8);
    const pointX = circleCenter.x + metric(state, "cosine") * circleRadius;
    const pointY = circleCenter.y - metric(state, "sine") * circleRadius;
    const waveLeft = state.family === "trigonometric-synthesis" ? 400 : 300;
    const waveRight = 550;
    const waveAmplitude = 24 + referenceLength * 6;
    const wavePath = state.series.map((point, index) => {
      const x = waveLeft + (point.x / (Math.PI * 2)) * (waveRight - waveLeft);
      const y = 184 - point.y * waveAmplitude;
      return `${index === 0 ? "M" : "L"} ${fixed(x, 1)} ${fixed(y, 1)}`;
    }).join(" ");
    const linkedWaveX = waveLeft + (metric(state, "radians") / (Math.PI * 2)) * (waveRight - waveLeft);
    const linkedWaveY = 184 - metric(state, "sine") * waveAmplitude;
    const miniOrigin = { x: 270, y: 238 };
    const miniScale = Math.min(82 / metric(state, "adjacent"), 82 / metric(state, "opposite"));
    const miniAdjacent = { x: miniOrigin.x + metric(state, "adjacent") * miniScale, y: miniOrigin.y };
    const miniOpposite = { x: miniAdjacent.x, y: miniOrigin.y - metric(state, "opposite") * miniScale };
    return (
      <g>
        <circle data-viz-mark data-viz-overlap-ok data-viz-overlap-owner="trigonometry-reference-radius-label" data-viz-overlap-reason="reference radius label intentionally identifies its containing reference circle" data-viz-name="reference circle" data-viz-reference-length={referenceLength} cx={circleCenter.x} cy={circleCenter.y} r={circleRadius} fill={theme.softFill} stroke={accent} strokeWidth="5" />
        <line data-viz-mark data-viz-name="reference radius" data-viz-reference-length={referenceLength} x1={circleCenter.x} y1={circleCenter.y} x2={pointX} y2={pointY} stroke={theme.axisStrong} strokeWidth="5" />
        <circle data-viz-mark data-viz-name="unit circle point" data-viz-identity-residual={metric(state, "identityResidual")} cx={pointX} cy={pointY} r="8" fill={accent} />
        <text data-viz-mark data-viz-overlap-ok data-viz-overlap-owner="trigonometry-reference-radius-label" data-viz-overlap-reason="reference radius label intentionally identifies its containing reference circle" data-viz-name="reference radius label" x={circleCenter.x - 4} y={circleCenter.y + 24} textAnchor="middle" fill={theme.text} className="text-xs font-black">R={fixed(referenceLength)}</text>
        {state.family === "trigonometric-synthesis" ? <polygon data-viz-mark data-viz-name="linked synthesis triangle" data-viz-angle-degrees={metric(state, "degrees")} points={`${miniOrigin.x},${miniOrigin.y} ${miniAdjacent.x},${miniAdjacent.y} ${miniOpposite.x},${miniOpposite.y}`} fill={theme.softFill} stroke={theme.axisStrong} strokeWidth="4" /> : null}
        <line data-viz-mark data-viz-name="sine wave baseline" x1={waveLeft} x2={waveRight} y1="184" y2="184" stroke={theme.axis} strokeWidth="3" />
        <path data-viz-mark data-viz-name="linked sine wave" data-viz-sine={metric(state, "sine")} d={wavePath} fill="none" stroke={theme.labelText} strokeWidth="5" />
        <line data-viz-mark data-viz-name="linked sine ordinate" x1={linkedWaveX} x2={linkedWaveX} y1="184" y2={linkedWaveY} stroke={accent} strokeWidth="3" strokeDasharray="5 4" />
        <circle data-viz-mark data-viz-name="linked sine sample" data-viz-radians={metric(state, "radians")} data-viz-sine={metric(state, "sine")} cx={linkedWaveX} cy={linkedWaveY} r="7" fill={accent} stroke={theme.pointStroke} strokeWidth="2" />
      </g>
    );
  }

  if (state.kind === "optimization" || state.kind === "modeling") {
    const currentWidth = 120 + metric(state, state.kind === "optimization" ? "currentWidth" : "width", 4) * 12;
    const currentHeight = 60 + metric(state, state.kind === "optimization" ? "currentHeight" : "height", 3) * 10;
    const comparisonWidth = state.kind === "optimization"
      ? 58 + metric(state, "optimumWidth", 4) * 10
      : 58 + metric(state, "width", 4) * metric(state, "scaleFactor", 1) * 10;
    const comparisonHeight = state.kind === "optimization"
      ? 40 + metric(state, "optimumHeight", 4) * 9
      : 40 + metric(state, "height", 3) * metric(state, "scaleFactor", 1) * 9;
    return (
      <g>
        <rect data-viz-mark data-viz-name={`${state.kind} current geometry`} data-viz-width={state.kind === "optimization" ? metric(state, "currentWidth") : metric(state, "width")} data-viz-height={state.kind === "optimization" ? metric(state, "currentHeight") : metric(state, "height")} x="126" y="110" width={Math.min(220, currentWidth)} height={Math.min(132, currentHeight)} fill={theme.softFill} stroke={accent} strokeWidth="6" />
        <rect data-viz-mark data-viz-name={`${state.kind} comparison geometry`} data-viz-width={state.kind === "optimization" ? metric(state, "optimumWidth") : metric(state, "width") * metric(state, "scaleFactor", 1)} data-viz-height={state.kind === "optimization" ? metric(state, "optimumHeight") : metric(state, "height") * metric(state, "scaleFactor", 1)} x={460 - Math.min(174, comparisonWidth) / 2} y={184 - Math.min(126, comparisonHeight) / 2} width={Math.min(174, comparisonWidth)} height={Math.min(126, comparisonHeight)} fill="none" stroke={theme.labelText} strokeWidth="5" strokeDasharray="8 6" />
      </g>
    );
  }

  if (state.kind === "vector" || state.kind === "space") {
    const viewport = viewportForState(state);
    const points = mappedPoints(Object.values(state.points), viewport);
    const origin = mapPoint({ x: 0, y: 0 }, viewport);
    const planePoint = mapPoint(state.points.point ?? { x: 0, y: 0 }, viewport);
    const normalX = metric(state, "normalX", 1);
    const normalY = metric(state, "normalY", 1);
    const normalLength = Math.max(EPSILON, Math.hypot(normalX, normalY));
    const direction = { x: -normalY / normalLength, y: normalX / normalLength };
    const halfWidth = 60;
    const halfHeight = 20;
    const planeCorners = [
      { x: planePoint.x - direction.x * halfWidth - normalX / normalLength * halfHeight, y: planePoint.y + direction.y * halfWidth + normalY / normalLength * halfHeight },
      { x: planePoint.x + direction.x * halfWidth - normalX / normalLength * halfHeight, y: planePoint.y - direction.y * halfWidth + normalY / normalLength * halfHeight },
      { x: planePoint.x + direction.x * halfWidth + normalX / normalLength * halfHeight, y: planePoint.y - direction.y * halfWidth - normalY / normalLength * halfHeight },
      { x: planePoint.x - direction.x * halfWidth + normalX / normalLength * halfHeight, y: planePoint.y + direction.y * halfWidth - normalY / normalLength * halfHeight }
    ];
    return (
      <g>
        {renderAxes(theme, viewport)}
        {state.kind === "space" ? <polygon data-viz-mark data-viz-name="plane" data-viz-plane-d={metric(state, "planeD")} data-viz-plane-residual={metric(state, "planeResidual")} points={planeCorners.map((point) => `${fixed(point.x, 1)},${fixed(point.y, 1)}`).join(" ")} fill={theme.softFill} stroke={accent} strokeWidth="4" /> : null}
        {points.map((point, index) => <line key={index} data-viz-mark data-viz-name={`${state.kind} vector ${index + 1}`} x1={origin.x} y1={origin.y} x2={point.x} y2={point.y} stroke={index === 0 ? accent : theme.labelText} strokeWidth="6" strokeLinecap="round" />)}
      </g>
    );
  }

  if (state.kind === "conic") {
    const conicType = state.metrics.conicType;
    const negativeBranch = conicType === "hyperbola"
      ? state.series.map((point) => ({ x: -point.x, y: point.y }))
      : [];
    const viewport = fixedCoordinateViewport;
    const sample = mapPoint(state.points.sample, viewport);
    return (
      <g>
        {renderAxes(theme, viewport)}
        <path data-viz-mark data-viz-name={String(conicType)} data-viz-parameter-a={metric(state, "parameterA")} data-viz-parameter-b={metric(state, "parameterB")} data-viz-equation-residual={metric(state, "conicResidual")} d={`${pathForSeries(state.series, viewport)}${conicType === "ellipse" ? " Z" : ""}`} fill="none" stroke={accent} strokeWidth="6" />
        {negativeBranch.length ? <path data-viz-mark data-viz-name="hyperbola negative branch" data-viz-parameter-a={metric(state, "parameterA")} data-viz-parameter-b={metric(state, "parameterB")} d={pathForSeries(negativeBranch, viewport)} fill="none" stroke={accent} strokeWidth="6" /> : null}
        <circle data-viz-mark data-viz-name="conic equation sample" cx={sample.x} cy={sample.y} r="7" fill={theme.labelText} stroke={theme.pointStroke} strokeWidth="2" />
      </g>
    );
  }

  return (
    <g>
      <rect data-viz-mark data-viz-name="catalog scope hold" x="112" y="108" width="416" height="134" rx="22" fill={theme.softFill} stroke={theme.labelStroke} strokeWidth="4" strokeDasharray="10 8" />
      <text data-viz-mark data-viz-name="catalog scope message" x="320" y="174" textAnchor="middle" fill={theme.text} className="text-xs font-black">{noModelLabel ?? "∅"}</text>
    </g>
  );
}

function visibleSecondaryStateText(
  state: ConfiguredSemanticSecondaryMathState,
  strings: ConfiguredSemanticSecondaryStrings | undefined
) {
  if (state.kind !== "relative-position") {
    return { check: state.check, formula: state.formula };
  }

  const locale = strings?.checkLabel === "驗證"
    ? "zh"
    : strings?.checkLabel === "验证"
      ? "zhHans"
      : "en";
  const horizontalSteps = Number(state.metrics.horizontalSteps ?? 0);
  const verticalSteps = Number(state.metrics.verticalSteps ?? 0);
  const routeDistance = Number(state.metrics.routeDistance ?? 0);

  if (state.variant === "relative-position-grid") {
    const ordinal = Number(state.metrics.ordinalPosition ?? 1);
    if (locale === "en") {
      const horizontal = horizontalSteps === 0
        ? "in the same column"
        : `${Math.abs(horizontalSteps)} column${Math.abs(horizontalSteps) === 1 ? "" : "s"} ${horizontalSteps > 0 ? "right" : "left"}`;
      const vertical = verticalSteps === 0
        ? "in the same row"
        : `${Math.abs(verticalSteps)} row${Math.abs(verticalSteps) === 1 ? "" : "s"} ${verticalSteps > 0 ? "above" : "below"}`;
      const suffix = ordinal === 1 ? "st" : ordinal === 2 ? "nd" : ordinal === 3 ? "rd" : "th";
      return {
        check: `Horizontal ${horizontalSteps}; vertical ${verticalSteps}; distance ${routeDistance}`,
        formula: `Target is ${horizontal} and ${vertical}; ${ordinal}${suffix} from left`
      };
    }
    const traditional = locale === "zh";
    const horizontal = horizontalSteps === 0
      ? "同列"
      : `${horizontalSteps > 0 ? "右" : "左"}${Math.abs(horizontalSteps)}格`;
    const vertical = verticalSteps === 0
      ? "同行"
      : `${verticalSteps > 0 ? "上" : "下"}${Math.abs(verticalSteps)}格`;
    return {
      check: `${traditional ? "橫向" : "横向"}${horizontalSteps}，${traditional ? "縱向" : "纵向"}${verticalSteps}，${traditional ? "距離" : "距离"}${routeDistance}`,
      formula: `${traditional ? "目標在參照點" : "目标在参照点"}${horizontal}、${vertical}；${traditional ? "從左數第" : "从左数第"}${ordinal}${traditional ? "個" : "个"}`
    };
  }

  const horizontalDirection = horizontalSteps === 0
    ? "stay"
    : horizontalSteps > 0 ? "east" : "west";
  const verticalDirection = verticalSteps === 0
    ? "stay"
    : verticalSteps > 0 ? "north" : "south";
  if (locale === "en") {
    return {
      check: `Move ${Math.abs(horizontalSteps)} ${horizontalDirection}, then ${Math.abs(verticalSteps)} ${verticalDirection}`,
      formula: `Route distance = ${Math.abs(horizontalSteps)} + ${Math.abs(verticalSteps)} = ${routeDistance} steps`
    };
  }
  const traditional = locale === "zh";
  const horizontal = horizontalSteps === 0
    ? "原地"
    : horizontalSteps > 0
      ? traditional ? "向東" : "向东"
      : "向西";
  const vertical = verticalSteps === 0 ? "原地" : verticalSteps > 0 ? "向北" : "向南";
  return {
    check: `${horizontal}${Math.abs(horizontalSteps)}步，再${vertical}${Math.abs(verticalSteps)}步`,
    formula: `${traditional ? "路線距離" : "路线距离"}=${Math.abs(horizontalSteps)}+${Math.abs(verticalSteps)}=${routeDistance}步`
  };
}

export function ConfiguredSemanticSecondaryMarks(
  props: ConfiguredSemanticSecondaryMarksProps
): ReactNode {
  const state = buildConfiguredSemanticSecondaryMathState(props);
  const formulaLabel = props.strings?.formulaLabel ?? "ƒ";
  const checkLabel = props.strings?.checkLabel ?? "✓";
  const visibleStateText = visibleSecondaryStateText(state, props.strings);
  const formulaText = `${formulaLabel}: ${visibleStateText.formula}`;
  const checkText = `${checkLabel}: ${visibleStateText.check}`;
  const machineState = JSON.stringify(state);
  const requiredModeCount = configuredSemanticSecondaryRequiredModeCount(props);
  const requiredNumericControlCount = configuredSemanticSecondaryRequiredNumericControlCount(props);
  const externalComposite = state.kind === "composite" && !state.active;
  const externalDescriptor = externalComposite && !state.strand?.startsWith("external:")
    ? { family: state.strand ?? "", variant: props.variant }
    : null;
  const externalMarks = externalDescriptor && props.renderCompositeStrand
    ? props.renderCompositeStrand({
        ...externalDescriptor,
        accent: props.accent,
        comparison: props.comparison,
        mode: props.mode,
        strings: props.strings,
        value: props.value,
        vizTheme: props.vizTheme
      })
    : null;

  return (
    <g
      data-viz-mark
      data-viz-name="configured semantic secondary model"
      data-viz-semantic-family={state.family}
      data-viz-semantic-variant={state.variant}
      data-viz-semantic-kind={state.kind}
      data-viz-semantic-strand={state.strand ?? state.family}
      data-viz-math-state={machineState}
      data-viz-required-mode-count={requiredModeCount}
      data-viz-required-numeric-control-count={requiredNumericControlCount}
    >
      <metadata data-viz-machine-math-state>{machineState}</metadata>
      <g data-viz-mark data-viz-name="semantic model body">
        {externalMarks ?? renderSemanticBody(state, props.accent, props.vizTheme, props.strings?.noModelLabel)}
      </g>
      {!externalComposite ? (
        <>
          <rect
            data-viz-mark
            data-viz-overlap-ok
            data-viz-overlap-owner="semantic-formula-card"
            data-viz-overlap-reason="formula text is intentionally contained by its background card"
            data-viz-name="semantic formula background"
            x="72"
            y="286"
            width="496"
            height="54"
            rx="15"
            fill={props.vizTheme.labelFill}
            stroke={props.vizTheme.labelStroke}
            strokeWidth="2"
          />
          <text
            data-viz-mark
            data-viz-name="semantic formula"
            data-viz-overlap-owner="semantic-formula-card"
            data-viz-overlap-reason="formula text is intentionally contained by its background card"
            data-viz-visible-formula={visibleStateText.formula}
            x="320"
            y="307"
            textAnchor="middle"
            fill={props.vizTheme.text}
            className="text-[11px] font-black"
            textLength={semanticTextLength(formulaText, 470)}
            lengthAdjust={semanticTextLength(formulaText, 470) ? "spacingAndGlyphs" : undefined}
          >
            {formulaText}
          </text>
          <text
            data-viz-mark
            data-viz-name="semantic invariant check"
            data-viz-overlap-owner="semantic-formula-card"
            data-viz-overlap-reason="formula text is intentionally contained by its background card"
            data-viz-visible-check={visibleStateText.check}
            x="320"
            y="327"
            textAnchor="middle"
            fill={props.vizTheme.textMuted}
            className="text-[10px] font-bold"
            textLength={semanticTextLength(checkText, 470)}
            lengthAdjust={semanticTextLength(checkText, 470) ? "spacingAndGlyphs" : undefined}
          >
            {checkText}
          </text>
        </>
      ) : null}
    </g>
  );
}
