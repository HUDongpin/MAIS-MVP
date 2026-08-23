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

export type KernelErrorCode =
  (typeof KERNEL_ERROR_CODES)[keyof typeof KERNEL_ERROR_CODES];

export interface KernelErrorDto {
  readonly code: KernelErrorCode;
  readonly message: string;
  readonly path?: string;
}
