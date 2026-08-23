/**
 * Modified TypeScript rewrite of the Edulab coordinate convention at
 * cf0bc1d68b4ea64307f57d7fac64667e6a3148cc (Apache-2.0).
 * See third_party/edulab for the upstream license and modification notice.
 */

import { KERNEL_ERROR_CODES, type MathKernelErrorCode } from "../shared/errors";
import type { KernelResult } from "../shared/types";
import type { Vec3 } from "./core";

function fail<T>(
  code: MathKernelErrorCode,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): KernelResult<T> {
  return {
    ok: false,
    error: details === undefined
      ? { code, message }
      : { code, message, details },
  };
}

function frozenVec3(x: number, y: number, z: number): Vec3<number> {
  return Object.freeze([
    Object.is(x, -0) ? 0 : x,
    Object.is(y, -0) ? 0 : y,
    Object.is(z, -0) ? 0 : z,
  ]);
}

function validateScale(scale: number): KernelResult<number> {
  if (!Number.isFinite(scale) || scale === 0) {
    return fail(
      KERNEL_ERROR_CODES.invalidScale,
      "Coordinate scale must be finite and non-zero.",
    );
  }
  const determinant = -(scale * scale * scale);
  if (!Number.isFinite(determinant) || determinant === 0) {
    return fail(
      KERNEL_ERROR_CODES.invalidScale,
      "Coordinate scale must have a representable non-zero finite determinant.",
      { scale },
    );
  }
  return { ok: true, value: scale };
}

function validateVec3(
  value: Vec3<number>,
  label: string,
): KernelResult<Vec3<number>> {
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    !value.every((component) =>
      typeof component === "number" && Number.isFinite(component)
    )
  ) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      `${label} must contain exactly three finite numbers.`,
      { label },
    );
  }
  return { ok: true, value };
}

function checkedVec3(
  x: number,
  y: number,
  z: number,
  label: string,
): KernelResult<Vec3<number>> {
  if (![x, y, z].every(Number.isFinite)) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      `${label} produced a non-finite coordinate.`,
      { label },
    );
  }
  return { ok: true, value: frozenVec3(x, y, z) };
}

function rejectLostNonzeroComponents(
  input: Vec3<number>,
  output: Vec3<number>,
  outputIndexForInput: readonly [number, number, number],
  label: string,
): KernelResult<Vec3<number>> {
  for (let inputIndex = 0; inputIndex < 3; inputIndex += 1) {
    if (
      input[inputIndex] !== 0 &&
      output[outputIndexForInput[inputIndex]] === 0
    ) {
      return fail(
        KERNEL_ERROR_CODES.nonFiniteInput,
        `${label} underflowed a non-zero coordinate to zero.`,
        { inputIndex },
      );
    }
  }
  return { ok: true, value: output };
}

const ROUND_TRIP_RELATIVE_TOLERANCE = 128 * Number.EPSILON;

function rejectMaterialRoundTripLoss(
  input: Vec3<number>,
  output: Vec3<number>,
  outputIndexForInput: readonly [number, number, number],
  recover: (component: number) => number,
  label: string,
): KernelResult<Vec3<number>> {
  for (let inputIndex = 0; inputIndex < 3; inputIndex += 1) {
    const inputComponent = input[inputIndex];
    const recovered = recover(output[outputIndexForInput[inputIndex]]);
    if (!Number.isFinite(recovered)) {
      return fail(
        KERNEL_ERROR_CODES.nonFiniteInput,
        `${label} inverse check produced a non-finite coordinate.`,
        { inputIndex },
      );
    }
    if (recovered === inputComponent) continue;
    const magnitude = Math.max(
      Math.abs(inputComponent),
      Math.abs(recovered),
    );
    const relativeDifference = magnitude === 0
      ? 0
      : Math.abs(inputComponent / magnitude - recovered / magnitude);
    if (relativeDifference > ROUND_TRIP_RELATIVE_TOLERANCE) {
      return fail(
        KERNEL_ERROR_CODES.nonFiniteInput,
        `${label} lost material precision in a coordinate round trip.`,
        { inputIndex },
      );
    }
  }
  return { ok: true, value: output };
}

/** Map mathematical (x, y, z) coordinates to the renderer's (x, z, y). */
export function mathZUpToWorldYUp(
  point: Vec3<number>,
  scale = 1,
): KernelResult<Vec3<number>> {
  const scaleResult = validateScale(scale);
  if (!scaleResult.ok) return scaleResult;
  const pointResult = validateVec3(point, "point");
  if (!pointResult.ok) return pointResult;
  const transformed = checkedVec3(
    point[0] * scale,
    point[2] * scale,
    point[1] * scale,
    "coordinate transform",
  );
  if (!transformed.ok) return transformed;
  const preserved = rejectLostNonzeroComponents(
    point,
    transformed.value,
    [0, 2, 1],
    "Coordinate transform",
  );
  if (!preserved.ok) return preserved;
  return rejectMaterialRoundTripLoss(
    point,
    preserved.value,
    [0, 2, 1],
    (component) => component / scale,
    "Coordinate transform",
  );
}

/** Inverse of mathZUpToWorldYUp(). */
export function worldYUpToMathZUp(
  point: Vec3<number>,
  scale = 1,
): KernelResult<Vec3<number>> {
  const scaleResult = validateScale(scale);
  if (!scaleResult.ok) return scaleResult;
  const pointResult = validateVec3(point, "point");
  if (!pointResult.ok) return pointResult;
  const transformed = checkedVec3(
    point[0] / scale,
    point[2] / scale,
    point[1] / scale,
    "inverse coordinate transform",
  );
  if (!transformed.ok) return transformed;
  const preserved = rejectLostNonzeroComponents(
    point,
    transformed.value,
    [0, 2, 1],
    "Inverse coordinate transform",
  );
  if (!preserved.ok) return preserved;
  return rejectMaterialRoundTripLoss(
    point,
    preserved.value,
    [0, 2, 1],
    (component) => component * scale,
    "Inverse coordinate transform",
  );
}

/** Determinant of the uniform scale followed by the y/z axis swap. */
export function mathZUpToWorldDeterminant(
  scale = 1,
): KernelResult<number> {
  const scaleResult = validateScale(scale);
  if (!scaleResult.ok) return scaleResult;
  const determinant = -(scale * scale * scale);
  return { ok: true, value: determinant };
}

/**
 * Map a mathematical normal after
 * correctTriangleWindingForMathZUpToWorldYUp() applies determinant-aware
 * winding correction. The inverse-transpose direction is
 * sign(scale) * (nx, nz, ny); magnitude is intentionally not normalized.
 */
export function mathNormalToWorldNormal(
  normal: Vec3<number>,
  scale = 1,
): KernelResult<Vec3<number>> {
  const scaleResult = validateScale(scale);
  if (!scaleResult.ok) return scaleResult;
  const normalResult = validateVec3(normal, "normal");
  if (!normalResult.ok) return normalResult;
  if (Math.hypot(normal[0], normal[1], normal[2]) === 0) {
    return fail(
      KERNEL_ERROR_CODES.zeroDirection,
      "A surface normal must be non-zero.",
    );
  }
  const transformed = checkedVec3(
    normal[0] / scale,
    normal[2] / scale,
    normal[1] / scale,
    "normal transform",
  );
  if (!transformed.ok) return transformed;
  const preserved = rejectLostNonzeroComponents(
    normal,
    transformed.value,
    [0, 2, 1],
    "Normal transform",
  );
  if (!preserved.ok) return preserved;
  const reversible = rejectMaterialRoundTripLoss(
    normal,
    preserved.value,
    [0, 2, 1],
    (component) => component * scale,
    "Normal transform",
  );
  if (!reversible.ok) return reversible;
  if (Math.hypot(...reversible.value) === 0) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      "Normal transform underflowed to a zero direction.",
    );
  }
  return reversible;
}

export function reverseTriangleWinding<First, Second, Third>(
  triangle: readonly [First, Second, Third],
): readonly [First, Third, Second] {
  return Object.freeze([triangle[0], triangle[2], triangle[1]]);
}

/** Correct triangle winding for the determinant sign of the full transform. */
export function correctTriangleWindingForMathZUpToWorldYUp<First, Second, Third>(
  triangle: readonly [First, Second, Third],
  scale = 1,
): KernelResult<
  readonly [First, Second, Third] | readonly [First, Third, Second]
> {
  const scaleResult = validateScale(scale);
  if (!scaleResult.ok) return scaleResult;
  return {
    ok: true,
    value: scale > 0
      ? reverseTriangleWinding(triangle)
      : Object.freeze([triangle[0], triangle[1], triangle[2]]),
  };
}
