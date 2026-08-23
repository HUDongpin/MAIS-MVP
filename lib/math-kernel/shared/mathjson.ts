import { KERNEL_ERROR_CODES } from "./errors";
import type { KernelErrorCode } from "./errors";
import type { KernelResult, MathJsonExpr } from "./types";

export const MATH_JSON_LIMITS = {
  maxDepth: 64,
  maxNodes: 2_000,
} as const;

type ValidationFailure = {
  readonly code: KernelErrorCode;
  readonly message: string;
  readonly path: string;
};

function failure(
  code: KernelErrorCode,
  message: string,
  path: string,
): ValidationFailure {
  return { code, message, path };
}

function isPlainObject(
  value: object,
): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validateJsonValue(
  value: unknown,
  depth: number,
  path: string,
  active: WeakSet<object>,
  state: { nodes: number },
): ValidationFailure | null {
  if (depth > MATH_JSON_LIMITS.maxDepth) {
    return failure(
      KERNEL_ERROR_CODES.mathJsonDepthLimit,
      `MathJSON exceeds the maximum depth of ${MATH_JSON_LIMITS.maxDepth}.`,
      path,
    );
  }

  state.nodes += 1;
  if (state.nodes > MATH_JSON_LIMITS.maxNodes) {
    return failure(
      KERNEL_ERROR_CODES.mathJsonNodeLimit,
      `MathJSON exceeds the maximum node count of ${MATH_JSON_LIMITS.maxNodes}.`,
      path,
    );
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? null
      : failure(
          KERNEL_ERROR_CODES.mathJsonNonFiniteNumber,
          "MathJSON numbers must be finite JSON numbers.",
          path,
        );
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return null;
  }

  if (typeof value !== "object") {
    return failure(
      KERNEL_ERROR_CODES.mathJsonInvalidType,
      "MathJSON contains a value that JSON cannot represent.",
      path,
    );
  }

  if (active.has(value)) {
    return failure(
      KERNEL_ERROR_CODES.mathJsonCycle,
      "MathJSON must not contain circular references.",
      path,
    );
  }

  if (!Array.isArray(value) && !isPlainObject(value)) {
    return failure(
      KERNEL_ERROR_CODES.mathJsonInvalidType,
      "MathJSON objects must be plain JSON objects.",
      path,
    );
  }

  if (Object.getOwnPropertySymbols(value).length > 0) {
    return failure(
      KERNEL_ERROR_CODES.mathJsonInvalidType,
      "MathJSON must not contain symbol-keyed properties.",
      path,
    );
  }

  active.add(value);
  try {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        if (!(index in value)) {
          return failure(
            KERNEL_ERROR_CODES.mathJsonInvalidType,
            "MathJSON arrays must not be sparse.",
            `${path}[${index}]`,
          );
        }
        const nested = validateJsonValue(
          value[index],
          depth + 1,
          `${path}[${index}]`,
          active,
          state,
        );
        if (nested) return nested;
      }
      return null;
    }

    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor)) {
        return failure(
          KERNEL_ERROR_CODES.mathJsonInvalidType,
          "MathJSON must not contain accessor properties.",
          `${path}.${key}`,
        );
      }
      const nested = validateJsonValue(
        descriptor.value,
        depth + 1,
        `${path}.${key}`,
        active,
        state,
      );
      if (nested) return nested;
    }
    return null;
  } finally {
    active.delete(value);
  }
}

function validateExpressionShape(
  value: unknown,
  path: string,
): ValidationFailure | null {
  if (typeof value === "number" || typeof value === "string") return null;

  if (Array.isArray(value)) {
    if (
      value.length === 0 ||
      typeof value[0] !== "string" ||
      value[0].length === 0
    ) {
      return failure(
        KERNEL_ERROR_CODES.mathJsonInvalidShape,
        "A MathJSON function array must start with a non-empty operator name.",
        path,
      );
    }
    for (let index = 1; index < value.length; index += 1) {
      const nested = validateExpressionShape(value[index], `${path}[${index}]`);
      if (nested) return nested;
    }
    return null;
  }

  if (!value || typeof value !== "object" || !isPlainObject(value)) {
    return failure(
      KERNEL_ERROR_CODES.mathJsonInvalidShape,
      "MathJSON expressions must be a number, symbol, function array, or MathJSON object.",
      path,
    );
  }

  const coreKeys = ["num", "sym", "str", "fn", "dict"].filter(
    (key) => Object.prototype.hasOwnProperty.call(value, key),
  );
  if (coreKeys.length !== 1) {
    return failure(
      KERNEL_ERROR_CODES.mathJsonInvalidShape,
      "A MathJSON object must contain exactly one of num, sym, str, fn, or dict.",
      path,
    );
  }

  const coreKey = coreKeys[0];
  const coreValue = value[coreKey];
  if (coreKey === "num" || coreKey === "sym" || coreKey === "str") {
    return typeof coreValue === "string"
      ? null
      : failure(
          KERNEL_ERROR_CODES.mathJsonInvalidShape,
          `MathJSON ${coreKey} must be a string.`,
          `${path}.${coreKey}`,
        );
  }

  if (coreKey === "fn") {
    return validateExpressionShape(coreValue, `${path}.fn`);
  }

  return coreValue && typeof coreValue === "object" && isPlainObject(coreValue)
    ? null
    : failure(
        KERNEL_ERROR_CODES.mathJsonInvalidShape,
        "A MathJSON dict must be a plain JSON object.",
        `${path}.dict`,
      );
}

export function validateMathJson(input: unknown): KernelResult<MathJsonExpr> {
  const jsonFailure = validateJsonValue(
    input,
    1,
    "$",
    new WeakSet<object>(),
    { nodes: 0 },
  );
  if (jsonFailure) {
    return {
      ok: false,
      error: jsonFailure,
    };
  }

  const shapeFailure = validateExpressionShape(input, "$");
  if (shapeFailure) {
    return {
      ok: false,
      error: shapeFailure,
    };
  }

  return { ok: true, value: input as MathJsonExpr };
}
