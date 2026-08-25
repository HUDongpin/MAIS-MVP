/**
 * The mathematical model behind `ConfiguredVisualizationLab`.
 *
 * These are pure functions of the two slider values and the mode index, kept out
 * of the client component so they can be executed by a test rather than only
 * grepped as source text. `ConfiguredVisualizationLab.tsx` compiles to `.jsx`
 * under `jsx: "preserve"`, so anything that needs a behavioural proof has to
 * live here.
 *
 * Slider bounds for each template are in `three/configuredThreeDControls.ts`;
 * every reachable slider position must produce a distinct, honest state.
 */
import { clamp } from "@/lib/math";

/** Value range the statistics mean dial addresses. */
export const statisticsValueRange = {
  xMax: 10,
  xMin: 0
};

/** Plot geometry the coordinate-transform model maps its points through. */
export const coordinateTransformGeometry = {
  origin: { x: 320, y: 200 },
  xScale: 32,
  yScale: 21
};

export function trigState(value: number, comparison: number, mode: number) {
  const phase = mode * (Math.PI / 4);
  const theta = ((value - 1) / 8) * Math.PI * 2 + phase;
  const thetaDegrees = (((value - 1) / 8) * 360 + mode * 45) % 360;

  return {
    // Tenths over a 1..10 slider: every reachable amplitude is exact at one
    // decimal place and A = 1 is reachable. The former `comparison / 9` made 8
    // of 9 amplitudes repeating decimals that were displayed rounded ("A =
    // 0.11") while the curve was plotted from the unrounded value.
    amplitude: clamp(comparison / 10, 0.1, 1),
    phase,
    theta,
    thetaDegrees
  };
}

export function fractionState(value: number, comparison: number) {
  const denominator = clamp(Math.round(value + 1), 2, 10);
  const numerator = clamp(Math.round(comparison), 0, denominator);

  return {
    denominator,
    equivalentDenominator: denominator * 2,
    equivalentNumerator: numerator * 2,
    numerator,
    value: numerator / denominator,
    zeroFraction: numerator === 0
  };
}

/**
 * Three place columns from two dials: the value slider carries the hundreds and
 * tens digits as one 0..99 reading (34 -> 3 hundreds, 4 tens) and the comparison
 * slider carries the ones.
 *
 * The model used to be `tens * 10 + ones` with both digits clamped to 0..9, so
 * its maximum was 99 — yet every topic it serves is a three-digit place-value
 * topic ("Place Value to 1000: Hundreds, Tens, Ones"). The hundreds place, the
 * whole point of those lessons, was unreachable.
 */
export function baseTenState(value: number, comparison: number) {
  const placeReading = clamp(Math.round(value), 0, 99);
  const hundreds = Math.floor(placeReading / 10);
  const tens = placeReading % 10;
  const ones = clamp(Math.round(comparison), 0, 9);

  return {
    hundreds,
    ones,
    placeReading,
    tens,
    total: hundreds * 100 + tens * 10 + ones,
    zeroHundreds: hundreds === 0,
    zeroOnes: ones === 0,
    zeroTens: tens === 0,
    zeroTotal: hundreds === 0 && tens === 0 && ones === 0
  };
}

// 15 degrees per step over a 0..12 slider reaches every angle school geometry is
// built on — 30, 45, 60, 90, 120, 135, 150 — and still lands exactly on 0 and
// 180. The previous 18-degree step could express none of 30/45/60.
export const angleGeometryStepDegrees = 15;

export function angleGeometryState(value: number, comparison: number) {
  const angleA = clamp(Math.round(value) * angleGeometryStepDegrees, 0, 180);
  const angleB = clamp(Math.round(comparison) * angleGeometryStepDegrees, 0, 180);
  const sum = angleA + angleB;

  return {
    angleA,
    angleB,
    complementary: sum === 90,
    difference: Math.abs(angleA - angleB),
    sum,
    supplementary: sum === 180
  };
}

export function probabilityState(value: number, comparison: number) {
  const success = clamp(Math.round(value), 0, 9);
  const failure = clamp(Math.round(comparison), 0, 9);
  const trials = success + failure;
  const probabilityDefined = trials > 0;
  const probability = probabilityDefined ? success / trials : 0;

  return {
    failure,
    probability,
    probabilityDefined,
    success,
    trials
  };
}

export function statisticsState(value: number, comparison: number) {
  const mean = clamp(Math.round(value), statisticsValueRange.xMin, statisticsValueRange.xMax);
  const spread = clamp(comparison / 2, 0.5, 4.5);

  return {
    mean,
    spread
  };
}

export function coordinateTransformState(value: number, comparison: number, mode: number) {
  const origin = coordinateTransformGeometry.origin;
  const scale = { x: coordinateTransformGeometry.xScale, y: coordinateTransformGeometry.yScale };
  const dx = value - 5;
  // Every slider position must be a distinct state. `comparison` spans 0..10, so
  // dy spans -5..+5; the former clamp to +/-3 made 6 of 11 positions duplicates
  // while the thumb kept moving. Points that leave the grid are already handled
  // by clampPointToDiagramBounds plus an explicit overflow indicator.
  const dy = comparison - 5;
  const reflectionLineX = (value - 5) / 2;
  // Quarter steps over 0..10 give 11 distinct scale factors (0.25 .. 2.75) and
  // land exactly on k = 1 at value = 3. The former `clamp(value / 5, 0.2, 1.8)`
  // collapsed values 0/1 onto 0.2 and 9/10 onto 1.8.
  const dilationScale = 0.25 + Math.round(clamp(value, 0, 10)) * 0.25;
  const source = [
    { label: "A", x: -2, y: -0.75 },
    { label: "B", x: -1, y: 0.9 },
    { label: "C", x: 1, y: -0.75 }
  ];
  // Each mode is the transformation it is named after, and nothing else.
  // A reflection in x = L fixes every point of that line, and a dilation of
  // factor k about the origin fixes the origin; the vertical shift that used to
  // be added here broke both defining properties (and turned k = 1 into a pure
  // translation still labelled "Dilation"). The vertical slider is disabled in
  // these two modes because the transformation genuinely has one parameter.
  const transformPoint = (point: { x: number; y: number }) => {
    if (mode === 0) return { x: point.x + dx, y: point.y + dy };
    if (mode === 1) return { x: 2 * reflectionLineX - point.x, y: point.y };
    return { x: point.x * dilationScale, y: point.y * dilationScale };
  };
  const toSvg = (point: { x: number; y: number }) => ({
    x: origin.x + point.x * scale.x,
    y: origin.y - point.y * scale.y
  });

  return {
    dilationScale,
    dx,
    dy,
    origin,
    reflectionLineX,
    scale,
    source,
    sourceSvg: source.map(toSvg),
    transformed: source.map(transformPoint),
    // Exposed so a test can assert the defining property of each transformation
    // on points of its own (the mirror line, the centre of dilation) rather than
    // only on the three triangle vertices.
    transformPoint,
    transformedSvg: source.map((point) => toSvg(transformPoint(point)))
  };
}
