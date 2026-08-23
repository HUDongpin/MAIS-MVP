export const KERNEL_ERROR_CODES = {
  mathJsonInvalidType: "MATH_JSON_INVALID_TYPE",
  mathJsonNonFiniteNumber: "MATH_JSON_NON_FINITE_NUMBER",
  mathJsonCycle: "MATH_JSON_CYCLE",
  mathJsonDepthLimit: "MATH_JSON_DEPTH_LIMIT",
  mathJsonNodeLimit: "MATH_JSON_NODE_LIMIT",
  mathJsonInvalidShape: "MATH_JSON_INVALID_SHAPE",
  casInvalidExpression: "CAS_INVALID_EXPRESSION",
  casOperationFailed: "CAS_OPERATION_FAILED",
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
