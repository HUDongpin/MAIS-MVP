import "server-only";

/**
 * Server-only exact conic calculations, rewritten from Edulab conics.py at
 * cf0bc1d68b4ea64307f57d7fac64667e6a3148cc (Apache-2.0).
 * See third_party/edulab for the upstream license and modification notice.
 */

import { CasSession } from "../cas/computeEngine.server";
import { KERNEL_ERROR_CODES, type MathKernelErrorCode } from "../shared/errors";
import type { ExactValueDto, KernelResult, MathJsonExpr } from "../shared/types";
import type {
  CircleModel,
  ConicAxis,
  ConicModel,
  EllipseModel,
  HyperbolaModel,
  ParabolaModel,
  Point2D,
  Quadratic2D,
} from "./model";
import {
  circleNumeric,
  ellipseNumeric,
  hyperbolaNumeric,
  parabolaNumeric,
} from "./numeric";

export type ExactConicModel = ConicModel<MathJsonExpr>;

export interface EllipseExactOptions {
  readonly a: MathJsonExpr;
  readonly b: MathJsonExpr;
  readonly center?: Point2D<MathJsonExpr>;
  readonly majorAxis?: ConicAxis;
}

export interface HyperbolaExactOptions {
  readonly a: MathJsonExpr;
  readonly b: MathJsonExpr;
  readonly center?: Point2D<MathJsonExpr>;
  readonly orientation?: ConicAxis;
}

export interface ParabolaExactOptions {
  readonly p: MathJsonExpr;
  readonly vertex?: Point2D<MathJsonExpr>;
  readonly orientation?: ConicAxis;
}

export interface CircleExactOptions {
  readonly r: MathJsonExpr;
  readonly center?: Point2D<MathJsonExpr>;
}

interface ExactConstant {
  readonly expression: MathJsonExpr;
}

function fail<T>(
  code: MathKernelErrorCode,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): KernelResult<T> {
  return { ok: false, error: { code, message, details } };
}

function validAxis(axis: unknown): axis is ConicAxis {
  return axis === "x" || axis === "y";
}

function add(...values: MathJsonExpr[]): MathJsonExpr {
  return values.length === 1 ? values[0] : ["Add", ...values];
}

function sub(a: MathJsonExpr, b: MathJsonExpr): MathJsonExpr {
  return ["Subtract", a, b];
}

function mul(...values: MathJsonExpr[]): MathJsonExpr {
  return values.length === 1 ? values[0] : ["Multiply", ...values];
}

function div(a: MathJsonExpr, b: MathJsonExpr): MathJsonExpr {
  return ["Divide", a, b];
}

function square(value: MathJsonExpr): MathJsonExpr {
  return ["Power", value, 2];
}

function sqrt(value: MathJsonExpr): MathJsonExpr {
  return ["Sqrt", value];
}

function neg(value: MathJsonExpr): MathJsonExpr {
  return ["Negate", value];
}

function exactConstant(
  session: CasSession,
  input: MathJsonExpr,
  label: string,
): KernelResult<ExactConstant> {
  if (typeof input === "number" && !Number.isFinite(input)) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      `${label} must be a finite real constant.`,
    );
  }
  const boxed = session.boxMathJson(input);
  if (!boxed.ok) return boxed;
  const dto = session.toExactValueDto(boxed.value);
  if (!dto.ok) return dto;
  if (dto.value.decimal === null) {
    return fail(
      KERNEL_ERROR_CODES.indeterminateSymbolicResult,
      `${label} must be provably finite and real.`,
      { label },
    );
  }
  return {
    ok: true,
    value: { expression: boxed.value },
  };
}

function positiveConstant(
  session: CasSession,
  input: MathJsonExpr,
  label: string,
): KernelResult<ExactConstant> {
  const constant = exactConstant(session, input, label);
  if (!constant.ok) return constant;
  const order = session.compareExactOrder(constant.value.expression, 0);
  if (!order.ok) return order;
  if (order.value === "greater") return constant;
  if (order.value === "less" || order.value === "equal") {
    return fail(
      KERNEL_ERROR_CODES.nonPositiveDimension,
      `${label} must be positive.`,
      { label },
    );
  }
  return fail(
    KERNEL_ERROR_CODES.indeterminateSymbolicResult,
    `${label} could not be proven positive.`,
    { label },
  );
}

function positiveDerivedConstant(
  session: CasSession,
  input: MathJsonExpr,
  label: string,
): KernelResult<ExactConstant> {
  const constant = exactConstant(session, input, label);
  if (!constant.ok) {
    return fail(
      KERNEL_ERROR_CODES.indeterminateSymbolicResult,
      `${label} could not be proven finite, real, and positive.`,
      { label },
    );
  }
  const order = session.compareExactOrder(constant.value.expression, 0);
  if (!order.ok || order.value !== "greater") {
    return fail(
      KERNEL_ERROR_CODES.indeterminateSymbolicResult,
      `${label} could not be proven finite, real, and positive.`,
      { label },
    );
  }
  return constant;
}

function exactPoint(
  session: CasSession,
  input: Point2D<MathJsonExpr>,
  label: string,
): KernelResult<readonly [ExactConstant, ExactConstant]> {
  if (!Array.isArray(input) || input.length !== 2) {
    return fail(KERNEL_ERROR_CODES.invalidInput, `${label} must contain two coordinates.`);
  }
  const x = exactConstant(session, input[0], `${label}.x`);
  if (!x.ok) return x;
  const y = exactConstant(session, input[1], `${label}.y`);
  if (!y.ok) return y;
  return { ok: true, value: [x.value, y.value] };
}

function simplifyMany(
  session: CasSession,
  values: readonly MathJsonExpr[],
): KernelResult<readonly MathJsonExpr[]> {
  const simplified: MathJsonExpr[] = [];
  for (const value of values) {
    const result = session.boxMathJson(value);
    if (!result.ok) return result;
    simplified.push(result.value);
  }
  return { ok: true, value: simplified };
}

export function ellipseExact(
  options: EllipseExactOptions,
  session = new CasSession(),
): KernelResult<EllipseModel<MathJsonExpr>> {
  if (options.majorAxis !== undefined && !validAxis(options.majorAxis)) {
    return fail(KERNEL_ERROR_CODES.invalidMajorAxis, "majorAxis must be x or y.");
  }
  const a = positiveConstant(session, options.a, "a");
  if (!a.ok) return a;
  const b = positiveConstant(session, options.b, "b");
  if (!b.ok) return b;
  const order = session.compareExactOrder(a.value.expression, b.value.expression);
  if (!order.ok) return order;
  if (order.value === "equal") {
    return fail(
      KERNEL_ERROR_CODES.degenerateConic,
      "Equal ellipse semiaxes define a circle; use circleExact().",
    );
  }
  if (order.value === "unknown" && options.majorAxis === undefined) {
    return fail(
      KERNEL_ERROR_CODES.indeterminateSymbolicResult,
      "The CAS could not prove which ellipse semiaxis is longer.",
    );
  }
  const derivedMajorAxis: ConicAxis =
    order.value === "greater"
      ? "x"
      : order.value === "less"
        ? "y"
        : options.majorAxis!;
  if (
    order.value !== "unknown" &&
    options.majorAxis !== undefined &&
    options.majorAxis !== derivedMajorAxis
  ) {
    return fail(
      KERNEL_ERROR_CODES.invalidMajorAxis,
      "majorAxis contradicts the exact semiaxis lengths.",
    );
  }
  const center = exactPoint(session, options.center ?? [0, 0], "center");
  if (!center.ok) return center;
  const ax = a.value.expression;
  const by = b.value.expression;
  const cx = center.value[0].expression;
  const cy = center.value[1].expression;
  const a2 = square(ax);
  const b2 = square(by);
  const cRaw = sqrt(
    derivedMajorAxis === "x" ? sub(a2, b2) : sub(b2, a2),
  );
  const c = positiveDerivedConstant(session, cRaw, "ellipse focal distance");
  if (!c.ok) return c;
  const directrixCenter = derivedMajorAxis === "x" ? cx : cy;
  const directrixOffset = div(
    square(derivedMajorAxis === "x" ? ax : by),
    c.value.expression,
  );
  const values = simplifyMany(session, [
    div(c.value.expression, derivedMajorAxis === "x" ? ax : by),
    add(directrixCenter, neg(directrixOffset)),
    add(directrixCenter, directrixOffset),
    sub(cx, c.value.expression),
    add(cx, c.value.expression),
    sub(cy, c.value.expression),
    add(cy, c.value.expression),
    sub(cx, ax),
    add(cx, ax),
    sub(cy, by),
    add(cy, by),
    div(1, a2),
    div(1, b2),
    div(mul(-2, cx), a2),
    div(mul(-2, cy), b2),
    sub(add(div(square(cx), a2), div(square(cy), b2)), 1),
  ]);
  if (!values.ok) return values;
  const [
    eccentricity,
    directrixMinus,
    directrixPlus,
    cxMinusC,
    cxPlusC,
    cyMinusC,
    cyPlusC,
    cxMinusA,
    cxPlusA,
    cyMinusB,
    cyPlusB,
    x2,
    y2,
    x,
    y,
    constant,
  ] = values.value;
  const foci: EllipseModel<MathJsonExpr>["foci"] =
    derivedMajorAxis === "x"
      ? [[cxMinusC, cy], [cxPlusC, cy]]
      : [[cx, cyMinusC], [cx, cyPlusC]];
  const vertices: EllipseModel<MathJsonExpr>["vertices"] =
    derivedMajorAxis === "x"
      ? [[cxMinusA, cy], [cxPlusA, cy], [cx, cyMinusB], [cx, cyPlusB]]
      : [[cx, cyMinusB], [cx, cyPlusB], [cxMinusA, cy], [cxPlusA, cy]];
  return {
    ok: true,
    value: {
      kind: "ellipse",
      a: ax,
      b: by,
      center: [cx, cy],
      majorAxis: derivedMajorAxis,
      c: c.value.expression,
      eccentricity,
      foci,
      directrices: [
        { axis: derivedMajorAxis, value: directrixMinus },
        { axis: derivedMajorAxis, value: directrixPlus },
      ],
      vertices,
      quadratic: { x2, xy: 0, y2, x, y, constant },
    },
  };
}

export function hyperbolaExact(
  options: HyperbolaExactOptions,
  session = new CasSession(),
): KernelResult<HyperbolaModel<MathJsonExpr>> {
  const orientation = options.orientation ?? "x";
  if (!validAxis(orientation)) {
    return fail(KERNEL_ERROR_CODES.invalidOrientation, "orientation must be x or y.");
  }
  const a = positiveConstant(session, options.a, "a");
  if (!a.ok) return a;
  const b = positiveConstant(session, options.b, "b");
  if (!b.ok) return b;
  const center = exactPoint(session, options.center ?? [0, 0], "center");
  if (!center.ok) return center;
  const ax = a.value.expression;
  const by = b.value.expression;
  const cx = center.value[0].expression;
  const cy = center.value[1].expression;
  const a2 = square(ax);
  const b2 = square(by);
  const cRaw = sqrt(add(a2, b2));
  const directrixCenter = orientation === "x" ? cx : cy;
  const directrixOffset = div(a2, cRaw);
  const slopeRaw = orientation === "x" ? div(by, ax) : div(ax, by);
  const rawQuadratic: readonly MathJsonExpr[] =
    orientation === "x"
      ? [
          div(1, a2),
          neg(div(1, b2)),
          div(mul(-2, cx), a2),
          div(mul(2, cy), b2),
          sub(sub(div(square(cx), a2), div(square(cy), b2)), 1),
        ]
      : [
          neg(div(1, b2)),
          div(1, a2),
          div(mul(2, cx), b2),
          div(mul(-2, cy), a2),
          sub(add(neg(div(square(cx), b2)), div(square(cy), a2)), 1),
        ];
  const values = simplifyMany(session, [
    cRaw,
    div(cRaw, ax),
    sub(directrixCenter, directrixOffset),
    add(directrixCenter, directrixOffset),
    sub(cx, cRaw),
    add(cx, cRaw),
    sub(cy, cRaw),
    add(cy, cRaw),
    sub(cx, ax),
    add(cx, ax),
    sub(cy, ax),
    add(cy, ax),
    slopeRaw,
    neg(slopeRaw),
    ...rawQuadratic,
  ]);
  if (!values.ok) return values;
  const [
    c,
    eccentricity,
    directrixMinus,
    directrixPlus,
    cxMinusC,
    cxPlusC,
    cyMinusC,
    cyPlusC,
    cxMinusA,
    cxPlusA,
    cyMinusA,
    cyPlusA,
    slope,
    negativeSlope,
    x2,
    y2,
    x,
    y,
    constant,
  ] = values.value;
  return {
    ok: true,
    value: {
      kind: "hyperbola",
      a: ax,
      b: by,
      center: [cx, cy],
      orientation,
      c,
      eccentricity,
      foci:
        orientation === "x"
          ? [[cxMinusC, cy], [cxPlusC, cy]]
          : [[cx, cyMinusC], [cx, cyPlusC]],
      directrices: [
        { axis: orientation, value: directrixMinus },
        { axis: orientation, value: directrixPlus },
      ],
      vertices:
        orientation === "x"
          ? [[cxMinusA, cy], [cxPlusA, cy]]
          : [[cx, cyMinusA], [cx, cyPlusA]],
      asymptoteSlopes: [slope, negativeSlope],
      quadratic: { x2, xy: 0, y2, x, y, constant },
    },
  };
}

export function parabolaExact(
  options: ParabolaExactOptions,
  session = new CasSession(),
): KernelResult<ParabolaModel<MathJsonExpr>> {
  const orientation = options.orientation ?? "x";
  if (!validAxis(orientation)) {
    return fail(KERNEL_ERROR_CODES.invalidOrientation, "orientation must be x or y.");
  }
  const p = exactConstant(session, options.p, "p");
  if (!p.ok) return p;
  const zero = session.compareExactMathJson(p.value.expression, 0);
  if (!zero.ok) return zero;
  if (zero.value === "equal") {
    return fail(
      KERNEL_ERROR_CODES.zeroParabolaParameter,
      "p must be non-zero for a non-degenerate parabola.",
    );
  }
  const vertex = exactPoint(session, options.vertex ?? [0, 0], "vertex");
  if (!vertex.ok) return vertex;
  const px = p.value.expression;
  const cx = vertex.value[0].expression;
  const cy = vertex.value[1].expression;
  const halfP = div(px, 2);
  const rawQuadratic: readonly MathJsonExpr[] =
    orientation === "x"
      ? [
          0,
          1,
          mul(-2, px),
          mul(-2, cy),
          add(square(cy), mul(2, px, cx)),
        ]
      : [
          1,
          0,
          mul(-2, cx),
          mul(-2, px),
          add(square(cx), mul(2, px, cy)),
        ];
  const values = simplifyMany(session, [
    orientation === "x" ? add(cx, halfP) : cx,
    orientation === "x" ? cy : add(cy, halfP),
    orientation === "x" ? sub(cx, halfP) : sub(cy, halfP),
    ...rawQuadratic,
  ]);
  if (!values.ok) return values;
  const [focusX, focusY, directrixValue, x2, y2, x, y, constant] = values.value;
  return {
    ok: true,
    value: {
      kind: "parabola",
      p: px,
      vertex: [cx, cy],
      orientation,
      focus: [focusX, focusY],
      directrix: { axis: orientation, value: directrixValue },
      quadratic: { x2, xy: 0, y2, x, y, constant },
    },
  };
}

export function circleExact(
  options: CircleExactOptions,
  session = new CasSession(),
): KernelResult<CircleModel<MathJsonExpr>> {
  const r = positiveConstant(session, options.r, "r");
  if (!r.ok) return r;
  const center = exactPoint(session, options.center ?? [0, 0], "center");
  if (!center.ok) return center;
  const radius = r.value.expression;
  const cx = center.value[0].expression;
  const cy = center.value[1].expression;
  const values = simplifyMany(session, [
    sub(cx, radius),
    add(cx, radius),
    sub(cy, radius),
    add(cy, radius),
    mul(-2, cx),
    mul(-2, cy),
    sub(add(square(cx), square(cy)), square(radius)),
  ]);
  if (!values.ok) return values;
  const [cxMinusR, cxPlusR, cyMinusR, cyPlusR, x, y, constant] = values.value;
  return {
    ok: true,
    value: {
      kind: "circle",
      r: radius,
      center: [cx, cy],
      vertices: [[cxMinusR, cy], [cxPlusR, cy], [cx, cyMinusR], [cx, cyPlusR]],
      quadratic: { x2: 1, xy: 0, y2: 1, x, y, constant },
    },
  };
}

function equationMathJson(model: ExactConicModel): MathJsonExpr {
  if (model.kind === "ellipse") {
    return [
      "Equal",
      add(
        div(square(sub("x", model.center[0])), square(model.a)),
        div(square(sub("y", model.center[1])), square(model.b)),
      ),
      1,
    ];
  }
  if (model.kind === "hyperbola") {
    const xTerm = div(square(sub("x", model.center[0])), square(model.orientation === "x" ? model.a : model.b));
    const yTerm = div(square(sub("y", model.center[1])), square(model.orientation === "x" ? model.b : model.a));
    return ["Equal", model.orientation === "x" ? sub(xTerm, yTerm) : sub(yTerm, xTerm), 1];
  }
  if (model.kind === "parabola") {
    return model.orientation === "x"
      ? [
          "Equal",
          square(sub("y", model.vertex[1])),
          mul(2, model.p, sub("x", model.vertex[0])),
        ]
      : [
          "Equal",
          square(sub("x", model.vertex[0])),
          mul(2, model.p, sub("y", model.vertex[1])),
        ];
  }
  return [
    "Equal",
    add(
      square(sub("x", model.center[0])),
      square(sub("y", model.center[1])),
    ),
    square(model.r),
  ];
}

export function toEquationExact(
  model: ExactConicModel,
  session = new CasSession(),
): KernelResult<ExactValueDto> {
  return session.toExactValueDto(equationMathJson(model));
}

export function toEquationLatex(
  model: ExactConicModel,
  session = new CasSession(),
): KernelResult<string> {
  const equation = toEquationExact(model, session);
  return equation.ok ? { ok: true, value: equation.value.latex } : equation;
}

function toFiniteNumber(
  session: CasSession,
  value: MathJsonExpr,
): KernelResult<number> {
  const dto = session.toExactValueDto(value);
  if (!dto.ok) return dto;
  if (dto.value.approx === null || !Number.isFinite(dto.value.approx)) {
    return fail(
      KERNEL_ERROR_CODES.exactToNumberFailed,
      "The exact value cannot be represented as a finite JavaScript number.",
    );
  }
  return { ok: true, value: dto.value.approx };
}

function numericPoint(
  session: CasSession,
  point: Point2D<MathJsonExpr>,
): KernelResult<Point2D<number>> {
  const x = toFiniteNumber(session, point[0]);
  if (!x.ok) return x;
  const y = toFiniteNumber(session, point[1]);
  if (!y.ok) return y;
  return { ok: true, value: [x.value, y.value] };
}

export function exactConicToNumeric(
  model: ExactConicModel,
  session = new CasSession(),
): KernelResult<ConicModel<number>> {
  if (model.kind === "ellipse") {
    const a = toFiniteNumber(session, model.a);
    if (!a.ok) return a;
    const b = toFiniteNumber(session, model.b);
    if (!b.ok) return b;
    const center = numericPoint(session, model.center);
    if (!center.ok) return center;
    return ellipseNumeric({ a: a.value, b: b.value, center: center.value, majorAxis: model.majorAxis });
  }
  if (model.kind === "hyperbola") {
    const a = toFiniteNumber(session, model.a);
    if (!a.ok) return a;
    const b = toFiniteNumber(session, model.b);
    if (!b.ok) return b;
    const center = numericPoint(session, model.center);
    if (!center.ok) return center;
    return hyperbolaNumeric({ a: a.value, b: b.value, center: center.value, orientation: model.orientation });
  }
  if (model.kind === "parabola") {
    const p = toFiniteNumber(session, model.p);
    if (!p.ok) return p;
    const vertex = numericPoint(session, model.vertex);
    if (!vertex.ok) return vertex;
    return parabolaNumeric({ p: p.value, vertex: vertex.value, orientation: model.orientation });
  }
  const r = toFiniteNumber(session, model.r);
  if (!r.ok) return r;
  const center = numericPoint(session, model.center);
  if (!center.ok) return center;
  return circleNumeric({ r: r.value, center: center.value });
}

export type { Quadratic2D };
