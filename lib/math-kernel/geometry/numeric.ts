/**
 * Finite-number geometry ported from Edulab geometry_kernel.py at
 * cf0bc1d68b4ea64307f57d7fac64667e6a3148cc (Apache-2.0).
 * See third_party/edulab for the upstream license and modification notice.
 */

import { KERNEL_ERROR_CODES, type MathKernelErrorCode } from "../shared/errors";
import type { KernelResult } from "../shared/types";
import {
  boxVolumeValue,
  dihedralCosFromNormalsValue,
  edgeOrthogonalComponent,
  lineLineAngleCosValue,
  linePlaneAngleSinValue,
  normalFromThreePoints,
  pointPlaneDistanceValue,
  prismVolumeValue,
  pyramidVolumeValue,
  tetrahedronVolumeValue,
  vecDivideByScalar,
  vecMidpoint,
  vecNormSquared,
  vecSub,
  type ScalarOps,
  type Vec3,
} from "./core";

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

function fail<T>(code: MathKernelErrorCode, message: string): KernelResult<T> {
  return { ok: false, error: { code, message } };
}

function immutableVec3(x: number, y: number, z: number): Vec3<number> {
  return Object.freeze([x, y, z]) as Vec3<number>;
}

function validateVector(vector: Vec3<number>, label: string): KernelResult<Vec3<number>> {
  if (
    !Array.isArray(vector) ||
    vector.length !== 3 ||
    !vector.every((component) => typeof component === "number" && Number.isFinite(component))
  ) {
    return fail(KERNEL_ERROR_CODES.nonFiniteInput, `${label} must contain three finite numbers.`);
  }
  return { ok: true, value: vector };
}

function finiteScalar(value: number, label: string): KernelResult<number> {
  return Number.isFinite(value)
    ? { ok: true, value }
    : fail(KERNEL_ERROR_CODES.nonFiniteInput, `${label} must be finite.`);
}

function positiveScalar(value: number, label: string): KernelResult<number> {
  const finite = finiteScalar(value, label);
  if (!finite.ok) return finite;
  if (value <= 0) {
    return fail(KERNEL_ERROR_CODES.nonPositiveDimension, `${label} must be positive.`);
  }
  return finite;
}

function finiteVectorResult(vector: Vec3<number>, label: string): KernelResult<Vec3<number>> {
  if (!vector.every(Number.isFinite)) {
    return fail(KERNEL_ERROR_CODES.nonFiniteInput, `${label} overflowed the finite numeric domain.`);
  }
  return { ok: true, value: immutableVec3(vector[0], vector[1], vector[2]) };
}

function normSquared(
  vector: Vec3<number>,
  zeroCode: MathKernelErrorCode,
  zeroMessage: string,
): KernelResult<number> {
  const value = vecNormSquared(NUMBER_OPS, vector);
  if (!Number.isFinite(value)) {
    return fail(KERNEL_ERROR_CODES.nonFiniteInput, "Vector norm overflowed the finite numeric domain.");
  }
  if (value === 0) {
    if (vector.some((component) => component !== 0)) {
      return fail(
        KERNEL_ERROR_CODES.nonFiniteInput,
        "A non-zero vector norm underflowed to zero.",
      );
    }
    return fail(zeroCode, zeroMessage);
  }
  return { ok: true, value };
}

function boundedUnitResult(value: number, label: string): KernelResult<number> {
  if (!Number.isFinite(value)) {
    return fail(KERNEL_ERROR_CODES.nonFiniteInput, `${label} is not finite.`);
  }
  // A few ulps of overshoot are expected when the same exact norm is rounded
  // through sqrt() and multiplication. Larger violations indicate subnormal
  // distortion or another loss of numeric significance and must not be hidden.
  const tolerance = 64 * Number.EPSILON;
  if (value < -1 - tolerance || value > 1 + tolerance) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      `${label} falls outside the unit interval beyond floating-point tolerance.`,
    );
  }
  return { ok: true, value: Math.max(-1, Math.min(1, value)) };
}

function stableDirection(
  vector: Vec3<number>,
  zeroCode: MathKernelErrorCode,
  zeroMessage: string,
  label: string,
): KernelResult<Vec3<number>> {
  const scale = Math.max(...vector.map(Math.abs));
  if (scale === 0) return fail(zeroCode, zeroMessage);
  const scaled = vecDivideByScalar(NUMBER_OPS, vector, scale);
  if (!scaled.every(Number.isFinite)) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      `${label} could not be normalized in the finite numeric domain.`,
    );
  }
  if (vector.some((component, index) => component !== 0 && scaled[index] === 0)) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      `${label} normalization underflowed a non-zero component.`,
    );
  }
  return { ok: true, value: scaled };
}

function positiveDerivedScalar(value: number, label: string): KernelResult<number> {
  const finite = finiteScalar(value, label);
  if (!finite.ok) return finite;
  if (value === 0) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      `${label} underflowed to zero from positive inputs.`,
    );
  }
  return finite;
}

type NormalizedVectorDiagnostic =
  | { readonly kind: "zero" }
  | { readonly kind: "unrepresentable" }
  | { readonly kind: "value"; readonly value: Vec3<number> };

function powerOfTwoNormalizedVector(
  vector: Vec3<number>,
): NormalizedVectorDiagnostic {
  const maximum = Math.max(...vector.map(Math.abs));
  if (maximum === 0) return { kind: "zero" };
  let exponent = Math.floor(Math.log2(maximum));
  let scale = 2 ** exponent;
  if (!Number.isFinite(scale)) {
    exponent -= 1;
    scale = 2 ** exponent;
  }
  if (!Number.isFinite(scale) || scale === 0) {
    return { kind: "unrepresentable" };
  }
  const normalized = vecDivideByScalar(NUMBER_OPS, vector, scale);
  if (
    !normalized.every(Number.isFinite) ||
    vector.some((component, index) =>
      component !== 0 && normalized[index] === 0)
  ) {
    return { kind: "unrepresentable" };
  }
  return { kind: "value", value: normalized };
}

function scaledTetrahedronVolumeDiagnostic(
  first: Vec3<number>,
  second: Vec3<number>,
  third: Vec3<number>,
  fourth: Vec3<number>,
): "zero" | "nonzero" | "unrepresentable" {
  const ab = vecSub(NUMBER_OPS, second, first);
  const ac = vecSub(NUMBER_OPS, third, first);
  const ad = vecSub(NUMBER_OPS, fourth, first);
  const scaledAb = powerOfTwoNormalizedVector(ab);
  const scaledAc = powerOfTwoNormalizedVector(ac);
  const scaledAd = powerOfTwoNormalizedVector(ad);
  if (
    scaledAb.kind === "zero" ||
    scaledAc.kind === "zero" ||
    scaledAd.kind === "zero"
  ) {
    return "zero";
  }
  if (
    scaledAb.kind === "unrepresentable" ||
    scaledAc.kind === "unrepresentable" ||
    scaledAd.kind === "unrepresentable"
  ) {
    return "unrepresentable";
  }
  const normalizedVolume = tetrahedronVolumeValue(
    NUMBER_OPS,
    [0, 0, 0],
    scaledAb.value,
    scaledAc.value,
    scaledAd.value,
  );
  return normalizedVolume === 0 ? "zero" : "nonzero";
}

function normalizedPlaneNormalDiagnostic(
  first: Vec3<number>,
  second: Vec3<number>,
  third: Vec3<number>,
): "zero" | "nonzero" | "unrepresentable" {
  const firstEdge = vecSub(NUMBER_OPS, second, first);
  const secondEdge = vecSub(NUMBER_OPS, third, first);
  const normalizedFirst = powerOfTwoNormalizedVector(firstEdge);
  const normalizedSecond = powerOfTwoNormalizedVector(secondEdge);
  if (normalizedFirst.kind === "zero" || normalizedSecond.kind === "zero") {
    return "zero";
  }
  if (
    normalizedFirst.kind === "unrepresentable" ||
    normalizedSecond.kind === "unrepresentable"
  ) {
    return "unrepresentable";
  }
  const normalized = normalFromThreePoints(
    NUMBER_OPS,
    [0, 0, 0],
    normalizedFirst.value,
    normalizedSecond.value,
  );
  return normalized.some((component) => component !== 0)
    ? "nonzero"
    : "zero";
}

export function vec3(x: number, y: number, z: number): KernelResult<Vec3<number>> {
  return validateVector([x, y, z], "vector").ok
    ? { ok: true, value: immutableVec3(x, y, z) }
    : fail(KERNEL_ERROR_CODES.nonFiniteInput, "vector must contain three finite numbers.");
}

export function midpoint(left: Vec3<number>, right: Vec3<number>): KernelResult<Vec3<number>> {
  const validLeft = validateVector(left, "left point");
  if (!validLeft.ok) return validLeft;
  const validRight = validateVector(right, "right point");
  if (!validRight.ok) return validRight;
  return finiteVectorResult(vecMidpoint(NUMBER_OPS, left, right), "midpoint");
}

export function normalFromPoints(
  first: Vec3<number>,
  second: Vec3<number>,
  third: Vec3<number>,
): KernelResult<Vec3<number>> {
  for (const [point, label] of [[first, "first point"], [second, "second point"], [third, "third point"]] as const) {
    const valid = validateVector(point, label);
    if (!valid.ok) return valid;
  }
  const normal = normalFromThreePoints(NUMBER_OPS, first, second, third);
  const finite = finiteVectorResult(normal, "plane normal");
  if (!finite.ok) return finite;
  if (normal.every((component) => component === 0)) {
    const diagnostic = normalizedPlaneNormalDiagnostic(first, second, third);
    if (diagnostic !== "zero") {
      return fail(
        KERNEL_ERROR_CODES.nonFiniteInput,
        "A non-collinear plane normal underflowed to zero.",
      );
    }
    return fail(
      KERNEL_ERROR_CODES.collinearPlanePoints,
      "Three collinear points do not define a plane.",
    );
  }
  const nonzero = normSquared(
    finite.value,
    KERNEL_ERROR_CODES.collinearPlanePoints,
    "Three collinear points do not define a plane.",
  );
  return nonzero.ok ? finite : nonzero;
}

function integerGcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

export function primitiveDirectionForDisplay(vector: Vec3<number>): KernelResult<Vec3<number>> {
  const valid = validateVector(vector, "direction");
  if (!valid.ok) return valid;
  const nonzero = normSquared(
    vector,
    KERNEL_ERROR_CODES.zeroDirection,
    "A zero vector has no display direction.",
  );
  if (!nonzero.ok) return nonzero;

  if (!vector.every(Number.isSafeInteger)) {
    return { ok: true, value: immutableVec3(vector[0], vector[1], vector[2]) };
  }
  const gcd = vector.reduce(integerGcd, 0);
  if (gcd <= 1) return { ok: true, value: immutableVec3(vector[0], vector[1], vector[2]) };
  return { ok: true, value: immutableVec3(vector[0] / gcd, vector[1] / gcd, vector[2] / gcd) };
}

export function linePlaneAngleSin(
  lineDirection: Vec3<number>,
  planeNormal: Vec3<number>,
): KernelResult<number> {
  const validLine = validateVector(lineDirection, "line direction");
  if (!validLine.ok) return validLine;
  const validNormal = validateVector(planeNormal, "plane normal");
  if (!validNormal.ok) return validNormal;
  const stableLine = stableDirection(
    lineDirection,
    KERNEL_ERROR_CODES.zeroDirection,
    "Line direction must be non-zero.",
    "Line direction",
  );
  if (!stableLine.ok) return stableLine;
  const stableNormal = stableDirection(
    planeNormal,
    KERNEL_ERROR_CODES.degeneratePlane,
    "Plane normal must be non-zero.",
    "Plane normal",
  );
  if (!stableNormal.ok) return stableNormal;
  return boundedUnitResult(
    linePlaneAngleSinValue(NUMBER_OPS, stableLine.value, stableNormal.value),
    "Line-plane angle sine",
  );
}

export function lineLineAngleCos(
  firstDirection: Vec3<number>,
  secondDirection: Vec3<number>,
): KernelResult<number> {
  const first = validateVector(firstDirection, "first line direction");
  if (!first.ok) return first;
  const second = validateVector(secondDirection, "second line direction");
  if (!second.ok) return second;
  const stableFirst = stableDirection(
    firstDirection,
    KERNEL_ERROR_CODES.zeroDirection,
    "First line direction must be non-zero.",
    "First line direction",
  );
  if (!stableFirst.ok) return stableFirst;
  const stableSecond = stableDirection(
    secondDirection,
    KERNEL_ERROR_CODES.zeroDirection,
    "Second line direction must be non-zero.",
    "Second line direction",
  );
  if (!stableSecond.ok) return stableSecond;
  return boundedUnitResult(
    lineLineAngleCosValue(NUMBER_OPS, stableFirst.value, stableSecond.value),
    "Line-line angle cosine",
  );
}

export function pointPlaneDistance(
  point: Vec3<number>,
  planePoint: Vec3<number>,
  planeNormal: Vec3<number>,
): KernelResult<number> {
  for (const [vector, label] of [[point, "point"], [planePoint, "plane point"], [planeNormal, "plane normal"]] as const) {
    const valid = validateVector(vector, label);
    if (!valid.ok) return valid;
  }
  const stableNormal = stableDirection(
    planeNormal,
    KERNEL_ERROR_CODES.degeneratePlane,
    "Plane normal must be non-zero.",
    "Plane normal",
  );
  if (!stableNormal.ok) return stableNormal;
  const displacement = finiteVectorResult(
    vecSub(NUMBER_OPS, point, planePoint),
    "point-plane displacement",
  );
  if (!displacement.ok) return displacement;
  const displacementScale = Math.max(...displacement.value.map(Math.abs));
  if (displacementScale === 0) return { ok: true, value: 0 };
  const stableDisplacement = stableDirection(
    displacement.value,
    KERNEL_ERROR_CODES.nonFiniteInput,
    "Point-plane displacement must remain representable.",
    "Point-plane displacement",
  );
  if (!stableDisplacement.ok) return stableDisplacement;
  const normalizedDistance = pointPlaneDistanceValue(
    NUMBER_OPS,
    stableDisplacement.value,
    [0, 0, 0],
    stableNormal.value,
  );
  const value = normalizedDistance * displacementScale;
  if (normalizedDistance !== 0 && value === 0) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      "A positive point-plane distance underflowed to zero.",
    );
  }
  return finiteScalar(value, "Point-plane distance");
}

export function dihedralHalfPlaneCos(
  edgeStart: Vec3<number>,
  edgeEnd: Vec3<number>,
  firstHalfPlanePoint: Vec3<number>,
  secondHalfPlanePoint: Vec3<number>,
): KernelResult<number> {
  for (const [point, label] of [[edgeStart, "edge start"], [edgeEnd, "edge end"], [firstHalfPlanePoint, "first half-plane point"], [secondHalfPlanePoint, "second half-plane point"]] as const) {
    const valid = validateVector(point, label);
    if (!valid.ok) return valid;
  }
  const edge = vecSub(NUMBER_OPS, edgeEnd, edgeStart);
  const finiteEdge = finiteVectorResult(edge, "dihedral edge");
  if (!finiteEdge.ok) return finiteEdge;
  const stableEdge = stableDirection(
    finiteEdge.value,
    KERNEL_ERROR_CODES.degenerateEdge,
    "Dihedral edge must be non-degenerate.",
    "Dihedral edge",
  );
  if (!stableEdge.ok) return stableEdge;
  const firstFromStart = finiteVectorResult(
    vecSub(NUMBER_OPS, firstHalfPlanePoint, edgeStart),
    "first half-plane displacement",
  );
  if (!firstFromStart.ok) return firstFromStart;
  const stableFirstFromStart = stableDirection(
    firstFromStart.value,
    KERNEL_ERROR_CODES.degenerateHalfPlane,
    "First half-plane point must not coincide with the edge start.",
    "First half-plane displacement",
  );
  if (!stableFirstFromStart.ok) return stableFirstFromStart;
  const secondFromStart = finiteVectorResult(
    vecSub(NUMBER_OPS, secondHalfPlanePoint, edgeStart),
    "second half-plane displacement",
  );
  if (!secondFromStart.ok) return secondFromStart;
  const stableSecondFromStart = stableDirection(
    secondFromStart.value,
    KERNEL_ERROR_CODES.degenerateHalfPlane,
    "Second half-plane point must not coincide with the edge start.",
    "Second half-plane displacement",
  );
  if (!stableSecondFromStart.ok) return stableSecondFromStart;
  const first = finiteVectorResult(
    edgeOrthogonalComponent(
      NUMBER_OPS,
      stableEdge.value,
      stableFirstFromStart.value,
    ),
    "first half-plane component",
  );
  if (!first.ok) return first;
  const second = finiteVectorResult(
    edgeOrthogonalComponent(
      NUMBER_OPS,
      stableEdge.value,
      stableSecondFromStart.value,
    ),
    "second half-plane component",
  );
  if (!second.ok) return second;
  const stableFirst = stableDirection(
    first.value,
    KERNEL_ERROR_CODES.degenerateHalfPlane,
    "First half-plane point must not lie on the edge.",
    "First half-plane component",
  );
  if (!stableFirst.ok) return stableFirst;
  const stableSecond = stableDirection(
    second.value,
    KERNEL_ERROR_CODES.degenerateHalfPlane,
    "Second half-plane point must not lie on the edge.",
    "Second half-plane component",
  );
  if (!stableSecond.ok) return stableSecond;
  return boundedUnitResult(
    dihedralCosFromNormalsValue(
      NUMBER_OPS,
      stableFirst.value,
      stableSecond.value,
    ),
    "Dihedral cosine",
  );
}

/** @deprecated Use dihedralHalfPlaneCos(), whose name states the half-plane convention. */
export const dihedralCos = dihedralHalfPlaneCos;

export function dihedralCosFromNormals(
  firstNormal: Vec3<number>,
  secondNormal: Vec3<number>,
): KernelResult<number> {
  const first = validateVector(firstNormal, "first half-plane normal");
  if (!first.ok) return first;
  const second = validateVector(secondNormal, "second half-plane normal");
  if (!second.ok) return second;
  const stableFirst = stableDirection(
    firstNormal,
    KERNEL_ERROR_CODES.degenerateHalfPlane,
    "First half-plane normal must be non-zero.",
    "First half-plane normal",
  );
  if (!stableFirst.ok) return stableFirst;
  const stableSecond = stableDirection(
    secondNormal,
    KERNEL_ERROR_CODES.degenerateHalfPlane,
    "Second half-plane normal must be non-zero.",
    "Second half-plane normal",
  );
  if (!stableSecond.ok) return stableSecond;
  return boundedUnitResult(
    dihedralCosFromNormalsValue(NUMBER_OPS, stableFirst.value, stableSecond.value),
    "Normal-based dihedral cosine",
  );
}

export function boxVolume(x: number, y: number, z: number): KernelResult<number> {
  for (const [value, label] of [[x, "x length"], [y, "y length"], [z, "z length"]] as const) {
    const valid = positiveScalar(value, label);
    if (!valid.ok) return valid;
  }
  return positiveDerivedScalar(boxVolumeValue(NUMBER_OPS, x, y, z), "Box volume");
}

export function prismVolume(baseArea: number, height: number): KernelResult<number> {
  for (const [value, label] of [[baseArea, "base area"], [height, "height"]] as const) {
    const valid = positiveScalar(value, label);
    if (!valid.ok) return valid;
  }
  return positiveDerivedScalar(prismVolumeValue(NUMBER_OPS, baseArea, height), "Prism volume");
}

export function pyramidVolume(baseArea: number, height: number): KernelResult<number> {
  for (const [value, label] of [[baseArea, "base area"], [height, "height"]] as const) {
    const valid = positiveScalar(value, label);
    if (!valid.ok) return valid;
  }
  return positiveDerivedScalar(pyramidVolumeValue(NUMBER_OPS, baseArea, height), "Pyramid volume");
}

export function tetrahedronVolume(
  first: Vec3<number>,
  second: Vec3<number>,
  third: Vec3<number>,
  fourth: Vec3<number>,
): KernelResult<number> {
  for (const [point, label] of [[first, "first point"], [second, "second point"], [third, "third point"], [fourth, "fourth point"]] as const) {
    const valid = validateVector(point, label);
    if (!valid.ok) return valid;
  }
  const volume = tetrahedronVolumeValue(NUMBER_OPS, first, second, third, fourth);
  const finite = finiteScalar(volume, "Tetrahedron volume");
  if (!finite.ok) return finite;
  if (
    volume === 0 &&
    scaledTetrahedronVolumeDiagnostic(first, second, third, fourth) !== "zero"
  ) {
    return fail(
      KERNEL_ERROR_CODES.nonFiniteInput,
      "A non-degenerate tetrahedron volume underflowed to zero.",
    );
  }
  return finite;
}
