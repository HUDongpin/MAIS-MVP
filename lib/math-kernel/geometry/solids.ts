/**
 * Modified TypeScript rewrite of the Edulab solid-geometry coordinate
 * builders at cf0bc1d68b4ea64307f57d7fac64667e6a3148cc (Apache-2.0).
 * See third_party/edulab for the upstream license and modification notice.
 */

import { KERNEL_ERROR_CODES, type MathKernelErrorCode } from "../shared/errors";
import type { KernelResult } from "../shared/types";
import type { ScalarOps, Vec3 } from "./core";

const NUMBER_OPS: ScalarOps<number> = {
  zero: 0,
  fromInteger: (value) => value,
  add: (left, right) => left + right,
  sub: (left, right) => left - right,
  mul: (left, right) => left * right,
  div: (left, right) => left / right,
  abs: Math.abs,
  sqrt: Math.sqrt,
};

export interface RegularQuadPyramidCoordinates<S = number> {
  readonly O: Vec3<S>;
  readonly A: Vec3<S>;
  readonly C: Vec3<S>;
  readonly B: Vec3<S>;
  readonly D: Vec3<S>;
  readonly P: Vec3<S>;
}

export interface CuboidCoordinates<S = number> {
  readonly A: Vec3<S>;
  readonly B: Vec3<S>;
  readonly C: Vec3<S>;
  readonly D: Vec3<S>;
  readonly A1: Vec3<S>;
  readonly B1: Vec3<S>;
  readonly C1: Vec3<S>;
  readonly D1: Vec3<S>;
}

export interface RegularTetrahedronCoordinates<S = number> {
  readonly A: Vec3<S>;
  readonly B: Vec3<S>;
  readonly C: Vec3<S>;
  readonly D: Vec3<S>;
}

function fail<T>(
  code: MathKernelErrorCode,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): KernelResult<T> {
  return { ok: false, error: { code, message, details } };
}

function frozenVec3(x: number, y: number, z: number): Vec3<number> {
  return Object.freeze([
    Object.is(x, -0) ? 0 : x,
    Object.is(y, -0) ? 0 : y,
    Object.is(z, -0) ? 0 : z,
  ]);
}

function freezeCoordinateRecord<T>(coordinates: T): Readonly<T> {
  const entries = Object.entries(
    coordinates as Record<string, Vec3<number>>,
  ).map(([name, point]) => [
    name,
    frozenVec3(point[0], point[1], point[2]),
  ] as const);
  return Object.freeze(Object.fromEntries(entries)) as Readonly<T>;
}

export function regularQuadPyramidCoordinatesRaw<S>(
  ops: ScalarOps<S>,
  baseEdge: S,
  height: S,
): RegularQuadPyramidCoordinates<S> {
  const zero = ops.zero;
  const halfDiagonal = ops.mul(
    baseEdge,
    ops.div(ops.sqrt(ops.fromInteger(2)), ops.fromInteger(2)),
  );
  const negativeHalfDiagonal = ops.sub(zero, halfDiagonal);
  return {
    O: [zero, zero, zero],
    A: [halfDiagonal, zero, zero],
    C: [negativeHalfDiagonal, zero, zero],
    B: [zero, halfDiagonal, zero],
    D: [zero, negativeHalfDiagonal, zero],
    P: [zero, zero, height],
  };
}

export function cuboidCoordinatesRaw<S>(
  ops: ScalarOps<S>,
  lengthX: S,
  lengthY: S,
  lengthZ: S,
): CuboidCoordinates<S> {
  const zero = ops.zero;
  return {
    A: [zero, zero, zero],
    B: [lengthX, zero, zero],
    C: [lengthX, lengthY, zero],
    D: [zero, lengthY, zero],
    A1: [zero, zero, lengthZ],
    B1: [lengthX, zero, lengthZ],
    C1: [lengthX, lengthY, lengthZ],
    D1: [zero, lengthY, lengthZ],
  };
}

export function cubeCoordinatesRaw<S>(
  ops: ScalarOps<S>,
  edge: S,
): CuboidCoordinates<S> {
  return cuboidCoordinatesRaw(ops, edge, edge, edge);
}

export function regularTetrahedronCoordinatesRaw<S>(
  ops: ScalarOps<S>,
  edge: S,
): RegularTetrahedronCoordinates<S> {
  const scale = ops.div(
    edge,
    ops.mul(ops.fromInteger(2), ops.sqrt(ops.fromInteger(2))),
  );
  const negativeScale = ops.sub(ops.zero, scale);
  return {
    A: [scale, scale, scale],
    B: [scale, negativeScale, negativeScale],
    C: [negativeScale, scale, negativeScale],
    D: [negativeScale, negativeScale, scale],
  };
}

function validatePositiveDimension(
  value: number,
  label: string,
): KernelResult<number> {
  if (!Number.isFinite(value)) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      `${label} must be finite.`,
      { label },
    );
  }
  if (value <= 0) {
    return fail(
      KERNEL_ERROR_CODES.nonPositiveDimension,
      `${label} must be positive.`,
      { label, value },
    );
  }
  return { ok: true, value };
}

function derivedDimension<T>(
  value: number,
  label: string,
): KernelResult<T> | null {
  return Number.isFinite(value) && value !== 0
    ? null
    : fail(
        KERNEL_ERROR_CODES.nonFiniteInput,
        `${label} cannot be represented as a non-zero finite number.`,
        { label },
      );
}

export function regularQuadPyramidCoordinates(
  baseEdge: number,
  height: number,
): KernelResult<Readonly<RegularQuadPyramidCoordinates>> {
  const edgeResult = validatePositiveDimension(baseEdge, "baseEdge");
  if (!edgeResult.ok) return edgeResult;
  const heightResult = validatePositiveDimension(height, "height");
  if (!heightResult.ok) return heightResult;

  const halfDiagonal = baseEdge * Math.SQRT1_2;
  const derivedError = derivedDimension<RegularQuadPyramidCoordinates>(
    halfDiagonal,
    "base half-diagonal",
  );
  if (derivedError) return derivedError;

  return {
    ok: true,
    value: freezeCoordinateRecord(
      regularQuadPyramidCoordinatesRaw(NUMBER_OPS, baseEdge, height),
    ),
  };
}

export function cuboidCoordinates(
  lengthX: number,
  lengthY: number,
  lengthZ: number,
): KernelResult<Readonly<CuboidCoordinates>> {
  for (const [label, value] of [
    ["lengthX", lengthX],
    ["lengthY", lengthY],
    ["lengthZ", lengthZ],
  ] as const) {
    const dimension = validatePositiveDimension(value, label);
    if (!dimension.ok) return dimension;
  }

  return {
    ok: true,
    value: freezeCoordinateRecord(
      cuboidCoordinatesRaw(NUMBER_OPS, lengthX, lengthY, lengthZ),
    ),
  };
}

export function cubeCoordinates(
  edge: number,
): KernelResult<Readonly<CuboidCoordinates>> {
  return cuboidCoordinates(edge, edge, edge);
}

export function regularTetrahedronCoordinates(
  edge = 2 * Math.sqrt(2),
): KernelResult<Readonly<RegularTetrahedronCoordinates>> {
  const edgeResult = validatePositiveDimension(edge, "edge");
  if (!edgeResult.ok) return edgeResult;

  const scale = edge / (2 * Math.sqrt(2));
  const derivedError = derivedDimension<RegularTetrahedronCoordinates>(
    scale,
    "tetrahedron coordinate scale",
  );
  if (derivedError) return derivedError;

  return {
    ok: true,
    value: freezeCoordinateRecord(
      regularTetrahedronCoordinatesRaw(NUMBER_OPS, edge),
    ),
  };
}
