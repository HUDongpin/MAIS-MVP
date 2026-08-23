/**
 * Generic geometry formulas ported from Edulab geometry_kernel.py at
 * cf0bc1d68b4ea64307f57d7fac64667e6a3148cc (Apache-2.0).
 * See third_party/edulab for the upstream license and modification notice.
 */

/** Renderer-independent immutable three-vector. */
export type Vec3<S> = readonly [S, S, S];

/**
 * The scalar vocabulary required by the shared geometry formulas. Numeric and
 * exact layers supply their own implementations so every formula lives here
 * once without importing a renderer, browser API, or CAS runtime.
 */
export interface ScalarOps<S> {
  readonly zero: S;
  readonly fromInteger: (value: number) => S;
  readonly add: (left: S, right: S) => S;
  readonly sub: (left: S, right: S) => S;
  readonly mul: (left: S, right: S) => S;
  readonly div: (left: S, right: S) => S;
  readonly abs: (value: S) => S;
  readonly sqrt: (value: S) => S;
}

export function vecAdd<S>(ops: ScalarOps<S>, left: Vec3<S>, right: Vec3<S>): Vec3<S> {
  return [
    ops.add(left[0], right[0]),
    ops.add(left[1], right[1]),
    ops.add(left[2], right[2]),
  ];
}

export function vecSub<S>(
  ops: Pick<ScalarOps<S>, "sub">,
  left: Vec3<S>,
  right: Vec3<S>,
): Vec3<S> {
  return [
    ops.sub(left[0], right[0]),
    ops.sub(left[1], right[1]),
    ops.sub(left[2], right[2]),
  ];
}

export function vecScale<S>(ops: ScalarOps<S>, scalar: S, vector: Vec3<S>): Vec3<S> {
  return [
    ops.mul(scalar, vector[0]),
    ops.mul(scalar, vector[1]),
    ops.mul(scalar, vector[2]),
  ];
}

export function vecDivideByScalar<S>(
  ops: ScalarOps<S>,
  vector: Vec3<S>,
  scalar: S,
): Vec3<S> {
  return [
    ops.div(vector[0], scalar),
    ops.div(vector[1], scalar),
    ops.div(vector[2], scalar),
  ];
}

export function vecDot<S>(
  ops: Pick<ScalarOps<S>, "add" | "mul">,
  left: Vec3<S>,
  right: Vec3<S>,
): S {
  return ops.add(
    ops.add(ops.mul(left[0], right[0]), ops.mul(left[1], right[1])),
    ops.mul(left[2], right[2]),
  );
}

export function vecCross<S>(
  ops: Pick<ScalarOps<S>, "sub" | "mul">,
  left: Vec3<S>,
  right: Vec3<S>,
): Vec3<S> {
  return [
    ops.sub(ops.mul(left[1], right[2]), ops.mul(left[2], right[1])),
    ops.sub(ops.mul(left[2], right[0]), ops.mul(left[0], right[2])),
    ops.sub(ops.mul(left[0], right[1]), ops.mul(left[1], right[0])),
  ];
}

export function vecNormSquared<S>(ops: ScalarOps<S>, vector: Vec3<S>): S {
  return vecDot(ops, vector, vector);
}

export function vecNorm<S>(ops: ScalarOps<S>, vector: Vec3<S>): S {
  return ops.sqrt(vecNormSquared(ops, vector));
}

export function vecMidpoint<S>(ops: ScalarOps<S>, left: Vec3<S>, right: Vec3<S>): Vec3<S> {
  return vecScale(
    ops,
    ops.div(ops.fromInteger(1), ops.fromInteger(2)),
    vecAdd(ops, left, right),
  );
}

export function normalFromThreePoints<S>(
  ops: Pick<ScalarOps<S>, "sub" | "mul">,
  first: Vec3<S>,
  second: Vec3<S>,
  third: Vec3<S>,
): Vec3<S> {
  return vecCross(ops, vecSub(ops, second, first), vecSub(ops, third, first));
}

export function linePlaneAngleSinValue<S>(
  ops: ScalarOps<S>,
  lineDirection: Vec3<S>,
  planeNormal: Vec3<S>,
): S {
  return ops.abs(directionCosineValue(ops, lineDirection, planeNormal));
}

export function directionCosineValue<S>(
  ops: ScalarOps<S>,
  firstDirection: Vec3<S>,
  secondDirection: Vec3<S>,
): S {
  return ops.div(
    vecDot(ops, firstDirection, secondDirection),
    ops.mul(vecNorm(ops, firstDirection), vecNorm(ops, secondDirection)),
  );
}

export function lineLineAngleCosValue<S>(
  ops: ScalarOps<S>,
  firstDirection: Vec3<S>,
  secondDirection: Vec3<S>,
): S {
  return ops.abs(directionCosineValue(ops, firstDirection, secondDirection));
}

export function pointPlaneDistanceValue<S>(
  ops: ScalarOps<S>,
  point: Vec3<S>,
  planePoint: Vec3<S>,
  planeNormal: Vec3<S>,
): S {
  return ops.div(
    ops.abs(pointPlaneSignedNumeratorValue(ops, point, planePoint, planeNormal)),
    vecNorm(ops, planeNormal),
  );
}

export function pointPlaneSignedNumeratorValue<S>(
  ops: Pick<ScalarOps<S>, "add" | "sub" | "mul">,
  point: Vec3<S>,
  planePoint: Vec3<S>,
  planeNormal: Vec3<S>,
): S {
  return vecDot(ops, vecSub(ops, point, planePoint), planeNormal);
}

export function edgeOrthogonalComponent<S>(
  ops: ScalarOps<S>,
  edge: Vec3<S>,
  fromEdgeStart: Vec3<S>,
): Vec3<S> {
  const coefficient = ops.div(
    vecDot(ops, fromEdgeStart, edge),
    vecNormSquared(ops, edge),
  );
  return vecSub(ops, fromEdgeStart, vecScale(ops, coefficient, edge));
}

export function dihedralHalfPlaneCosValue<S>(
  ops: ScalarOps<S>,
  edgeStart: Vec3<S>,
  edgeEnd: Vec3<S>,
  firstHalfPlanePoint: Vec3<S>,
  secondHalfPlanePoint: Vec3<S>,
): S {
  const edge = vecSub(ops, edgeEnd, edgeStart);
  const first = edgeOrthogonalComponent(
    ops,
    edge,
    vecSub(ops, firstHalfPlanePoint, edgeStart),
  );
  const second = edgeOrthogonalComponent(
    ops,
    edge,
    vecSub(ops, secondHalfPlanePoint, edgeStart),
  );
  return directionCosineValue(ops, first, second);
}

export function dihedralCosFromNormalsValue<S>(
  ops: ScalarOps<S>,
  firstNormal: Vec3<S>,
  secondNormal: Vec3<S>,
): S {
  return directionCosineValue(ops, firstNormal, secondNormal);
}

export function boxVolumeValue<S>(ops: ScalarOps<S>, x: S, y: S, z: S): S {
  return ops.mul(ops.mul(x, y), z);
}

export function prismVolumeValue<S>(ops: ScalarOps<S>, baseArea: S, height: S): S {
  return ops.mul(baseArea, height);
}

export function pyramidVolumeValue<S>(ops: ScalarOps<S>, baseArea: S, height: S): S {
  return ops.div(prismVolumeValue(ops, baseArea, height), ops.fromInteger(3));
}

export function tetrahedronVolumeValue<S>(
  ops: ScalarOps<S>,
  first: Vec3<S>,
  second: Vec3<S>,
  third: Vec3<S>,
  fourth: Vec3<S>,
): S {
  const triple = tetrahedronSignedTripleProductValue(
    ops,
    first,
    second,
    third,
    fourth,
  );
  return ops.div(ops.abs(triple), ops.fromInteger(6));
}

export function tetrahedronSignedTripleProductValue<S>(
  ops: Pick<ScalarOps<S>, "add" | "sub" | "mul">,
  first: Vec3<S>,
  second: Vec3<S>,
  third: Vec3<S>,
  fourth: Vec3<S>,
): S {
  return vecDot(
    ops,
    vecCross(ops, vecSub(ops, second, first), vecSub(ops, third, first)),
    vecSub(ops, fourth, first),
  );
}
