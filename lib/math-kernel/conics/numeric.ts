/**
 * Browser-safe numeric conic calculations, rewritten from Edulab conics.py at
 * cf0bc1d68b4ea64307f57d7fac64667e6a3148cc (Apache-2.0).
 * See third_party/edulab for the upstream license and modification notice.
 */

import { KERNEL_ERROR_CODES, type MathKernelErrorCode } from "../shared/errors";
import type { KernelResult } from "../shared/types";
import type {
  CircleModel,
  ConicAxis,
  ConicModel,
  ConicRenderBranch,
  ConicRenderSpec,
  EllipseModel,
  HyperbolaModel,
  ParabolaModel,
  Point2D,
  Quadratic2D,
} from "./model";

export interface EllipseNumericOptions {
  readonly a: number;
  readonly b: number;
  readonly center?: Point2D<number>;
  readonly majorAxis?: ConicAxis;
}

export interface HyperbolaNumericOptions {
  readonly a: number;
  readonly b: number;
  readonly center?: Point2D<number>;
  readonly orientation?: ConicAxis;
}

export interface ParabolaNumericOptions {
  readonly p: number;
  readonly vertex?: Point2D<number>;
  readonly orientation?: ConicAxis;
}

export interface CircleNumericOptions {
  readonly r: number;
  readonly center?: Point2D<number>;
}

export interface ConicSamplingOptions {
  readonly sampleCount?: number;
  readonly parameterRange?: readonly [number, number];
}

function fail<T>(
  code: MathKernelErrorCode,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): KernelResult<T> {
  return { ok: false, error: { code, message, details } };
}

function finite(values: readonly number[]): boolean {
  for (let index = 0; index < values.length; index += 1) {
    if (!Number.isFinite(values[index])) return false;
  }
  return true;
}

function unsafeDerived<T>(label: string): KernelResult<T> {
  return fail(
    KERNEL_ERROR_CODES.nonFiniteInput,
    `${label} cannot be represented as a non-zero finite JavaScript number.`,
    { label },
  );
}

function safeSquare(value: number, label: string): KernelResult<number> {
  const squared = value * value;
  return Number.isFinite(squared) && (value === 0 || squared !== 0)
    ? { ok: true, value: squared }
    : unsafeDerived(label);
}

function safeDouble(value: number, label: string): KernelResult<number> {
  const doubled = 2 * value;
  return Number.isFinite(doubled) && (value === 0 || doubled !== 0)
    ? { ok: true, value: doubled }
    : unsafeDerived(label);
}

function safeHalf(value: number, label: string): KernelResult<number> {
  const halved = value / 2;
  return Number.isFinite(halved) && (value === 0 || halved !== 0)
    ? { ok: true, value: halved }
    : unsafeDerived(label);
}

function nonZeroFinite(value: number, label: string): KernelResult<number> {
  return Number.isFinite(value) && value !== 0
    ? { ok: true, value }
    : unsafeDerived(label);
}

function containsOnlyFiniteNumbers(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) {
    return value.every(containsOnlyFiniteNumbers);
  }
  if (value && typeof value === "object") {
    return Object.values(value).every(containsOnlyFiniteNumbers);
  }
  return true;
}

function normalizeNegativeZero<T>(value: T): T {
  if (typeof value === "number") {
    return (Object.is(value, -0) ? 0 : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeNegativeZero) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeNegativeZero(entry)]),
    ) as T;
  }
  return value;
}

function finiteModel<T extends ConicModel<number>>(model: T): KernelResult<T> {
  return containsOnlyFiniteNumbers(model)
    ? { ok: true, value: normalizeNegativeZero(model) }
    : unsafeDerived("derived conic model");
}

function validAxis(axis: unknown): axis is ConicAxis {
  return axis === "x" || axis === "y";
}

function validatePoint(
  point: Point2D<number>,
  label: string,
): KernelResult<Point2D<number>> {
  if (!Array.isArray(point) || point.length !== 2 || !finite(point)) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      `${label} must be a pair of finite real numbers.`,
    );
  }
  return { ok: true, value: [point[0], point[1]] };
}

function validatePositiveDimensions(
  entries: Readonly<Record<string, number>>,
): KernelResult<true> {
  const values = Object.values(entries);
  if (!finite(values)) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      "Conic dimensions must be finite real numbers.",
      entries,
    );
  }
  if (values.some((value) => value <= 0)) {
    return fail(
      KERNEL_ERROR_CODES.nonPositiveDimension,
      "Conic semiaxes and radii must be positive.",
      entries,
    );
  }
  return { ok: true, value: true };
}

export function ellipseNumeric(
  options: EllipseNumericOptions,
): KernelResult<EllipseModel<number>> {
  const dimensions = validatePositiveDimensions({ a: options.a, b: options.b });
  if (!dimensions.ok) return dimensions;
  if (options.a === options.b) {
    return fail(
      KERNEL_ERROR_CODES.degenerateConic,
      "Equal ellipse semiaxes define a circle; use circleNumeric().",
    );
  }
  if (options.majorAxis !== undefined && !validAxis(options.majorAxis)) {
    return fail(KERNEL_ERROR_CODES.invalidMajorAxis, "majorAxis must be x or y.");
  }
  const derivedMajorAxis: ConicAxis = options.a > options.b ? "x" : "y";
  if (options.majorAxis !== undefined && options.majorAxis !== derivedMajorAxis) {
    return fail(
      KERNEL_ERROR_CODES.invalidMajorAxis,
      "majorAxis contradicts the numeric semiaxis lengths.",
    );
  }
  const center = validatePoint(options.center ?? [0, 0], "center");
  if (!center.ok) return center;
  const [cx, cy] = center.value;
  const aSquared = safeSquare(options.a, "a squared");
  if (!aSquared.ok) return aSquared;
  const bSquared = safeSquare(options.b, "b squared");
  if (!bSquared.ok) return bSquared;
  const focalSquare = Math.abs(aSquared.value - bSquared.value);
  if (focalSquare === 0 || !Number.isFinite(focalSquare)) {
    return unsafeDerived("ellipse focal distance squared");
  }
  const c = Math.sqrt(focalSquare);
  const major = derivedMajorAxis === "x" ? options.a : options.b;
  const majorSquared = derivedMajorAxis === "x" ? aSquared.value : bSquared.value;
  const eccentricity = nonZeroFinite(c / major, "ellipse eccentricity");
  if (!eccentricity.ok) return eccentricity;
  const directrixOffset = nonZeroFinite(
    majorSquared / c,
    "ellipse directrix offset",
  );
  if (!directrixOffset.ok) return directrixOffset;
  const foci: EllipseModel<number>["foci"] =
    derivedMajorAxis === "x"
      ? [[cx - c, cy], [cx + c, cy]]
      : [[cx, cy - c], [cx, cy + c]];
  const vertices: EllipseModel<number>["vertices"] =
    derivedMajorAxis === "x"
      ? [
          [cx - options.a, cy],
          [cx + options.a, cy],
          [cx, cy - options.b],
          [cx, cy + options.b],
        ]
      : [
          [cx, cy - options.b],
          [cx, cy + options.b],
          [cx - options.a, cy],
          [cx + options.a, cy],
        ];
  const a2 = aSquared.value;
  const b2 = bSquared.value;
  const quadratic: Quadratic2D<number> = {
    x2: 1 / a2,
    xy: 0,
    y2: 1 / b2,
    x: (-2 * cx) / a2,
    y: (-2 * cy) / b2,
    constant: (cx * cx) / a2 + (cy * cy) / b2 - 1,
  };
  return finiteModel({
      kind: "ellipse",
      a: options.a,
      b: options.b,
      center: center.value,
      majorAxis: derivedMajorAxis,
      c,
      eccentricity: eccentricity.value,
      foci,
      directrices:
        derivedMajorAxis === "x"
          ? [
              { axis: "x", value: cx - directrixOffset.value },
              { axis: "x", value: cx + directrixOffset.value },
            ]
          : [
              { axis: "y", value: cy - directrixOffset.value },
              { axis: "y", value: cy + directrixOffset.value },
            ],
      vertices,
      quadratic,
  });
}

export function hyperbolaNumeric(
  options: HyperbolaNumericOptions,
): KernelResult<HyperbolaModel<number>> {
  const dimensions = validatePositiveDimensions({ a: options.a, b: options.b });
  if (!dimensions.ok) return dimensions;
  const orientation = options.orientation ?? "x";
  if (!validAxis(orientation)) {
    return fail(KERNEL_ERROR_CODES.invalidOrientation, "orientation must be x or y.");
  }
  const center = validatePoint(options.center ?? [0, 0], "center");
  if (!center.ok) return center;
  const [cx, cy] = center.value;
  const aSquared = safeSquare(options.a, "a squared");
  if (!aSquared.ok) return aSquared;
  const bSquared = safeSquare(options.b, "b squared");
  if (!bSquared.ok) return bSquared;
  const a2 = aSquared.value;
  const b2 = bSquared.value;
  const focalSquare = a2 + b2;
  if (!Number.isFinite(focalSquare) || focalSquare === 0) {
    return unsafeDerived("hyperbola focal distance squared");
  }
  const c = Math.sqrt(focalSquare);
  const directrixOffset = nonZeroFinite(a2 / c, "hyperbola directrix offset");
  if (!directrixOffset.ok) return directrixOffset;
  const foci: HyperbolaModel<number>["foci"] =
    orientation === "x"
      ? [[cx - c, cy], [cx + c, cy]]
      : [[cx, cy - c], [cx, cy + c]];
  const vertices: HyperbolaModel<number>["vertices"] =
    orientation === "x"
      ? [[cx - options.a, cy], [cx + options.a, cy]]
      : [[cx, cy - options.a], [cx, cy + options.a]];
  const quadratic: Quadratic2D<number> =
    orientation === "x"
      ? {
          x2: 1 / a2,
          xy: 0,
          y2: -1 / b2,
          x: (-2 * cx) / a2,
          y: (2 * cy) / b2,
          constant: (cx * cx) / a2 - (cy * cy) / b2 - 1,
        }
      : {
          x2: -1 / b2,
          xy: 0,
          y2: 1 / a2,
          x: (2 * cx) / b2,
          y: (-2 * cy) / a2,
          constant: -(cx * cx) / b2 + (cy * cy) / a2 - 1,
        };
  const slope = nonZeroFinite(
    orientation === "x" ? options.b / options.a : options.a / options.b,
    "hyperbola asymptote slope",
  );
  if (!slope.ok) return slope;
  return finiteModel({
      kind: "hyperbola",
      a: options.a,
      b: options.b,
      center: center.value,
      orientation,
      c,
      eccentricity: c / options.a,
      foci,
      directrices:
        orientation === "x"
          ? [
              { axis: "x", value: cx - directrixOffset.value },
              { axis: "x", value: cx + directrixOffset.value },
            ]
          : [
              { axis: "y", value: cy - directrixOffset.value },
              { axis: "y", value: cy + directrixOffset.value },
            ],
      vertices,
      asymptoteSlopes: [slope.value, -slope.value],
      quadratic,
  });
}

export function parabolaNumeric(
  options: ParabolaNumericOptions,
): KernelResult<ParabolaModel<number>> {
  if (!Number.isFinite(options.p)) {
    return fail(KERNEL_ERROR_CODES.nonFiniteInput, "p must be a finite real number.");
  }
  if (options.p === 0) {
    return fail(
      KERNEL_ERROR_CODES.zeroParabolaParameter,
      "p must be non-zero for a non-degenerate parabola.",
    );
  }
  const orientation = options.orientation ?? "x";
  if (!validAxis(orientation)) {
    return fail(KERNEL_ERROR_CODES.invalidOrientation, "orientation must be x or y.");
  }
  const vertex = validatePoint(options.vertex ?? [0, 0], "vertex");
  if (!vertex.ok) return vertex;
  const [cx, cy] = vertex.value;
  const halfP = safeHalf(options.p, "p divided by two");
  if (!halfP.ok) return halfP;
  const twoP = safeDouble(options.p, "two times p");
  if (!twoP.ok) return twoP;
  const focus: Point2D<number> =
    orientation === "x" ? [cx + halfP.value, cy] : [cx, cy + halfP.value];
  const directrix =
    orientation === "x"
      ? { axis: "x" as const, value: cx - halfP.value }
      : { axis: "y" as const, value: cy - halfP.value };
  const quadratic: Quadratic2D<number> =
    orientation === "x"
      ? {
          x2: 0,
          xy: 0,
          y2: 1,
          x: -twoP.value,
          y: -2 * cy,
          constant: cy * cy + 2 * options.p * cx,
        }
      : {
          x2: 1,
          xy: 0,
          y2: 0,
          x: -2 * cx,
          y: -twoP.value,
          constant: cx * cx + 2 * options.p * cy,
        };
  return finiteModel({
      kind: "parabola",
      p: options.p,
      vertex: vertex.value,
      orientation,
      focus,
      directrix,
      quadratic,
  });
}

export function circleNumeric(
  options: CircleNumericOptions,
): KernelResult<CircleModel<number>> {
  const dimensions = validatePositiveDimensions({ r: options.r });
  if (!dimensions.ok) return dimensions;
  const center = validatePoint(options.center ?? [0, 0], "center");
  if (!center.ok) return center;
  const [cx, cy] = center.value;
  const r = options.r;
  const radiusSquared = safeSquare(r, "radius squared");
  if (!radiusSquared.ok) return radiusSquared;
  return finiteModel({
      kind: "circle",
      r,
      center: center.value,
      vertices: [
        [cx - r, cy],
        [cx + r, cy],
        [cx, cy - r],
        [cx, cy + r],
      ],
      quadratic: {
        x2: 1,
        xy: 0,
        y2: 1,
        x: -2 * cx,
        y: -2 * cy,
        constant: cx * cx + cy * cy - radiusSquared.value,
      },
  });
}

function sampleParameters(
  count: number,
  range: readonly [number, number],
): number[] {
  const [start, end] = range;
  return Array.from(
    { length: count },
    (_, index) => start + ((end - start) * index) / (count - 1),
  );
}

function branch(
  id: ConicRenderBranch["id"],
  closed: boolean,
  points: readonly Point2D<number>[],
): ConicRenderBranch {
  return { id, closed, points };
}

export function toConicRenderSpec(
  model: ConicModel<number>,
  options: ConicSamplingOptions = {},
): KernelResult<ConicRenderSpec> {
  const sampleCount = options.sampleCount ?? 129;
  if (!Number.isInteger(sampleCount) || sampleCount < 3 || sampleCount > 10_000) {
    return fail(
      KERNEL_ERROR_CODES.invalidInput,
      "sampleCount must be an integer between 3 and 10,000.",
    );
  }
  const defaultRange: readonly [number, number] =
    model.kind === "ellipse" || model.kind === "circle"
      ? [0, 2 * Math.PI]
      : [-3, 3];
  const parameterRange = options.parameterRange ?? defaultRange;
  if (!Array.isArray(parameterRange) || parameterRange.length !== 2 || !finite(parameterRange)) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      "parameterRange must contain two finite real numbers.",
    );
  }
  if (parameterRange[0] >= parameterRange[1]) {
    return fail(
      KERNEL_ERROR_CODES.invalidInput,
      "parameterRange must be strictly increasing.",
    );
  }
  const parameters = sampleParameters(sampleCount, parameterRange);
  let branches: ConicRenderBranch[];

  if (model.kind === "ellipse") {
    const [cx, cy] = model.center;
    const points = parameters.map<Point2D<number>>((t) => [
      cx + model.a * Math.cos(t),
      cy + model.b * Math.sin(t),
    ]);
    const isFullTurn = Math.abs(parameterRange[1] - parameterRange[0] - 2 * Math.PI) <= 1e-12;
    branches = [branch("curve", isFullTurn, points)];
  } else if (model.kind === "circle") {
    const [cx, cy] = model.center;
    const points = parameters.map<Point2D<number>>((t) => [
      cx + model.r * Math.cos(t),
      cy + model.r * Math.sin(t),
    ]);
    const isFullTurn = Math.abs(parameterRange[1] - parameterRange[0] - 2 * Math.PI) <= 1e-12;
    branches = [branch("curve", isFullTurn, points)];
  } else if (model.kind === "hyperbola") {
    const [cx, cy] = model.center;
    const makePoints = (sign: -1 | 1): Point2D<number>[] =>
      parameters.map((t) =>
        model.orientation === "x"
          ? [cx + sign * model.a * Math.cosh(t), cy + model.b * Math.sinh(t)]
          : [cx + model.b * Math.sinh(t), cy + sign * model.a * Math.cosh(t)],
      );
    branches = [
      branch("negative", false, makePoints(-1)),
      branch("positive", false, makePoints(1)),
    ];
  } else {
    const [cx, cy] = model.vertex;
    const points = parameters.map<Point2D<number>>((t) =>
      model.orientation === "x"
        ? [cx + (t * t) / (2 * model.p), cy + t]
        : [cx + t, cy + (t * t) / (2 * model.p)],
    );
    branches = [branch("curve", false, points)];
  }

  if (
    branches.some((item) =>
      item.points.some((point) => !finite(point)),
    )
  ) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      "The requested sampling range produced a non-finite render point.",
    );
  }

  return {
    ok: true,
    value: { kind: model.kind, sampleCount, parameterRange, branches },
  };
}
