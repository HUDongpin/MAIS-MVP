export const KERNEL_ERROR_CODES = {
  mathJsonInvalidType: "MATH_JSON_INVALID_TYPE",
  mathJsonNonFiniteNumber: "MATH_JSON_NON_FINITE_NUMBER",
  mathJsonCycle: "MATH_JSON_CYCLE",
  mathJsonDepthLimit: "MATH_JSON_DEPTH_LIMIT",
  mathJsonNodeLimit: "MATH_JSON_NODE_LIMIT",
  mathJsonStringLengthLimit: "MATH_JSON_STRING_LENGTH_LIMIT",
  mathJsonTotalStringLengthLimit: "MATH_JSON_TOTAL_STRING_LENGTH_LIMIT",
  mathJsonNumericDigitsLimit: "MATH_JSON_NUMERIC_DIGITS_LIMIT",
  mathJsonIntegerExponentLimit: "MATH_JSON_INTEGER_EXPONENT_LIMIT",
  mathJsonEstimatedPowerDigitsLimit: "MATH_JSON_ESTIMATED_POWER_DIGITS_LIMIT",
  mathJsonInvalidShape: "MATH_JSON_INVALID_SHAPE",
  casInvalidExpression: "CAS_INVALID_EXPRESSION",
  casOperationFailed: "CAS_OPERATION_FAILED",
  indeterminateSymbolicResult: "INDETERMINATE_SYMBOLIC_RESULT",
  invalidInput: "INVALID_INPUT",
  nonFiniteInput: "NON_FINITE_INPUT",
  nonPositiveDimension: "NON_POSITIVE_DIMENSION",
  invalidOrientation: "INVALID_ORIENTATION",
  invalidMajorAxis: "INVALID_MAJOR_AXIS",
  degenerateConic: "DEGENERATE_CONIC",
  zeroParabolaParameter: "ZERO_PARABOLA_PARAMETER",
  exactToNumberFailed: "EXACT_TO_NUMBER_FAILED",
  zeroDirection: "ZERO_DIRECTION",
  collinearPlanePoints: "COLLINEAR_PLANE_POINTS",
  degeneratePlane: "DEGENERATE_PLANE",
  degenerateEdge: "DEGENERATE_EDGE",
  degenerateHalfPlane: "DEGENERATE_HALF_PLANE",
  nonRealExpression: "NON_REAL_EXPRESSION",
  invalidScale: "INVALID_SCALE",
  invalidVertexId: "INVALID_VERTEX_ID",
  duplicateVertex: "DUPLICATE_VERTEX",
  invalidArity: "INVALID_ARITY",
  selfLoopEdge: "SELF_LOOP_EDGE",
  duplicateEdge: "DUPLICATE_EDGE",
  unknownVertex: "UNKNOWN_VERTEX",
} as const;

export type MathKernelErrorCode =
  (typeof KERNEL_ERROR_CODES)[keyof typeof KERNEL_ERROR_CODES];

/** @deprecated Use MathKernelErrorCode. */
export type KernelErrorCode = MathKernelErrorCode;

export interface KernelErrorDto {
  readonly code: MathKernelErrorCode;
  readonly message: string;
  readonly path?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}
