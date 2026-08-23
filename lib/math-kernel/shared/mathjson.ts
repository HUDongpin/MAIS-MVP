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

const CORE_KEYS = ["num", "sym", "str", "fn", "dict"] as const;
const STRING_ATTRIBUTE_KEYS = new Set([
  "comment",
  "documentation",
  "latex",
  "wikidata",
  "wikibase",
  "openmathSymbol",
  "openmathCd",
  "sourceUrl",
  "sourceContent",
]);
const ATTRIBUTE_KEYS = new Set([
  ...STRING_ATTRIBUTE_KEYS,
  "sourceOffsets",
]);
const VALID_SYMBOL = /^[\p{ID_Start}_][\p{ID_Continue}_\u200c\u200d]*$/u;

function propertyPath(path: string, key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
    ? `${path}.${key}`
    : `${path}[${JSON.stringify(key)}]`;
}

function reflectionFailure(path: string): ValidationFailure {
  return failure(
    KERNEL_ERROR_CODES.mathJsonInvalidType,
    "MathJSON properties must be safely inspectable data properties.",
    path,
  );
}

function isCanonicalArrayIndex(key: string, length: number): boolean {
  if (!/^(?:0|[1-9][0-9]*)$/.test(key)) return false;
  const index = Number(key);
  return Number.isSafeInteger(index) && index >= 0 && index < length;
}

function ownDataValue(value: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
}

function isValidMathJsonSymbol(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.normalize("NFC") === value &&
    VALID_SYMBOL.test(value) &&
    !/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/.test(value)
  );
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

  let arrayValue: boolean;
  let prototype: object | null;
  let ownKeys: readonly PropertyKey[];
  try {
    arrayValue = Array.isArray(value);
    prototype = Object.getPrototypeOf(value);
    ownKeys = Reflect.ownKeys(value);
  } catch {
    return reflectionFailure(path);
  }

  if (
    arrayValue
      ? prototype !== Array.prototype
      : prototype !== Object.prototype && prototype !== null
  ) {
    return failure(
      KERNEL_ERROR_CODES.mathJsonInvalidType,
      arrayValue
        ? "MathJSON arrays must use the standard Array prototype."
        : "MathJSON objects must be plain JSON objects.",
      path,
    );
  }

  active.add(value);
  try {
    if (arrayValue) {
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
      if (
        !lengthDescriptor ||
        !("value" in lengthDescriptor) ||
        typeof lengthDescriptor.value !== "number"
      ) {
        return reflectionFailure(`${path}.length`);
      }
      const length = lengthDescriptor.value;
      let indexCount = 0;

      for (const key of ownKeys) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !("value" in descriptor)) {
          return failure(
            KERNEL_ERROR_CODES.mathJsonInvalidType,
            "MathJSON arrays must not contain accessor elements.",
            typeof key === "string" ? propertyPath(path, key) : path,
          );
        }
        if (typeof key !== "string") {
          return failure(
            KERNEL_ERROR_CODES.mathJsonInvalidType,
            "MathJSON arrays must not contain symbol-keyed properties.",
            path,
          );
        }
        if (key === "length") continue;
        if (!isCanonicalArrayIndex(key, length)) {
          return failure(
            KERNEL_ERROR_CODES.mathJsonInvalidType,
            "MathJSON arrays may only contain indexed elements and length.",
            propertyPath(path, key),
          );
        }

        indexCount += 1;
        const nested = validateJsonValue(
          descriptor.value,
          depth + 1,
          `${path}[${key}]`,
          active,
          state,
        );
        if (nested) return nested;
      }

      if (indexCount !== length) {
        return failure(
          KERNEL_ERROR_CODES.mathJsonInvalidType,
          "MathJSON arrays must not be sparse.",
          path,
        );
      }
      return null;
    }

    for (const key of ownKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor)) {
        return failure(
          KERNEL_ERROR_CODES.mathJsonInvalidType,
          "MathJSON must not contain accessor properties.",
          typeof key === "string" ? propertyPath(path, key) : path,
        );
      }
      if (typeof key !== "string") {
        return failure(
          KERNEL_ERROR_CODES.mathJsonInvalidType,
          "MathJSON must not contain symbol-keyed properties.",
          path,
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
      if (!descriptor.enumerable) {
        return failure(
          KERNEL_ERROR_CODES.mathJsonInvalidType,
          "MathJSON object properties must be enumerable JSON properties.",
          propertyPath(path, key),
        );
      }
    }
    return null;
  } catch {
    return reflectionFailure(path);
  } finally {
    active.delete(value);
  }
}

function validateAttributes(
  value: Record<string, unknown>,
  keys: readonly string[],
  path: string,
): ValidationFailure | null {
  for (const key of keys) {
    if (!ATTRIBUTE_KEYS.has(key)) continue;
    const attribute = ownDataValue(value, key);
    if (STRING_ATTRIBUTE_KEYS.has(key)) {
      if (typeof attribute !== "string") {
        return failure(
          KERNEL_ERROR_CODES.mathJsonInvalidShape,
          `MathJSON ${key} metadata must be a string.`,
          propertyPath(path, key),
        );
      }
      continue;
    }

    if (!Array.isArray(attribute)) {
      return failure(
        KERNEL_ERROR_CODES.mathJsonInvalidShape,
        "MathJSON sourceOffsets must be a two-number tuple.",
        `${path}.sourceOffsets`,
      );
    }
    const length = ownDataValue(attribute, "length");
    const start = ownDataValue(attribute, "0");
    const end = ownDataValue(attribute, "1");
    if (
      length !== 2 ||
      typeof start !== "number" ||
      typeof end !== "number"
    ) {
      return failure(
        KERNEL_ERROR_CODES.mathJsonInvalidShape,
        "MathJSON sourceOffsets must be a two-number tuple.",
        `${path}.sourceOffsets`,
      );
    }
  }
  return null;
}

function validateDictionaryValue(
  value: unknown,
  path: string,
): ValidationFailure | null {
  if (
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return null;
  }
  if (Array.isArray(value)) {
    const length = ownDataValue(value, "length");
    if (typeof length !== "number") return reflectionFailure(path);
    for (let index = 0; index < length; index += 1) {
      const nested = validateDictionaryValue(
        ownDataValue(value, String(index)),
        `${path}[${index}]`,
      );
      if (nested) return nested;
    }
    return null;
  }
  if (value && typeof value === "object" && isPlainObject(value)) {
    return validateExpressionObject(value, path);
  }
  return failure(
    KERNEL_ERROR_CODES.mathJsonInvalidShape,
    "MathJSON dictionary values must match Compute Engine DictionaryValue.",
    path,
  );
}

function validateFunctionObject(
  value: unknown,
  path: string,
): ValidationFailure | null {
  if (!Array.isArray(value)) {
    return failure(
      KERNEL_ERROR_CODES.mathJsonInvalidShape,
      "A MathJSON fn value must be a non-empty array.",
      path,
    );
  }
  const length = ownDataValue(value, "length");
  if (typeof length !== "number" || length === 0) {
    return failure(
      KERNEL_ERROR_CODES.mathJsonInvalidShape,
      "A MathJSON fn value must be a non-empty array.",
      path,
    );
  }

  const head = ownDataValue(value, "0");
  if (typeof head === "string") {
    if (!isValidMathJsonSymbol(head)) {
      return failure(
        KERNEL_ERROR_CODES.mathJsonInvalidShape,
        "A MathJSON function head must be a valid symbol.",
        `${path}[0]`,
      );
    }
  } else if (head && typeof head === "object" && isPlainObject(head)) {
    const headFailure = validateExpressionObject(head, `${path}[0]`);
    if (headFailure) return headFailure;
    if (!Object.prototype.hasOwnProperty.call(head, "sym")) {
      return failure(
        KERNEL_ERROR_CODES.mathJsonInvalidShape,
        "A MathJSON function head object must be a symbol object.",
        `${path}[0]`,
      );
    }
  } else {
    return failure(
      KERNEL_ERROR_CODES.mathJsonInvalidShape,
      "A MathJSON function head must be a symbol string or symbol object.",
      `${path}[0]`,
    );
  }

  for (let index = 1; index < length; index += 1) {
    const nested = validateExpressionShape(
      ownDataValue(value, String(index)),
      `${path}[${index}]`,
    );
    if (nested) return nested;
  }
  return null;
}

function validateExpressionObject(
  value: Record<string, unknown>,
  path: string,
): ValidationFailure | null {
  const keys = Reflect.ownKeys(value).filter(
    (key): key is string => typeof key === "string",
  );
  const coreKeys = CORE_KEYS.filter((key) =>
    Object.prototype.hasOwnProperty.call(value, key),
  );
  if (coreKeys.length !== 1) {
    return failure(
      KERNEL_ERROR_CODES.mathJsonInvalidShape,
      "A MathJSON object must contain exactly one of num, sym, str, fn, or dict.",
      path,
    );
  }

  for (const key of keys) {
    if (!CORE_KEYS.includes(key as (typeof CORE_KEYS)[number]) && !ATTRIBUTE_KEYS.has(key)) {
      return failure(
        KERNEL_ERROR_CODES.mathJsonInvalidShape,
        `Unknown MathJSON object property: ${key}.`,
        propertyPath(path, key),
      );
    }
  }
  const attributeFailure = validateAttributes(value, keys, path);
  if (attributeFailure) return attributeFailure;

  const coreKey = coreKeys[0];
  const coreValue = ownDataValue(value, coreKey);
  if (coreKey === "num" || coreKey === "str") {
    return typeof coreValue === "string"
      ? null
      : failure(
          KERNEL_ERROR_CODES.mathJsonInvalidShape,
          `MathJSON ${coreKey} must be a string.`,
          `${path}.${coreKey}`,
        );
  }
  if (coreKey === "sym") {
    return isValidMathJsonSymbol(coreValue)
      ? null
      : failure(
          KERNEL_ERROR_CODES.mathJsonInvalidShape,
          "MathJSON sym must be a valid symbol string.",
          `${path}.sym`,
        );
  }
  if (coreKey === "fn") {
    return validateFunctionObject(coreValue, `${path}.fn`);
  }

  if (!coreValue || typeof coreValue !== "object" || !isPlainObject(coreValue)) {
    return failure(
      KERNEL_ERROR_CODES.mathJsonInvalidShape,
      "A MathJSON dict must be a plain JSON object.",
      `${path}.dict`,
    );
  }
  for (const key of Reflect.ownKeys(coreValue)) {
    if (typeof key !== "string") {
      return failure(
        KERNEL_ERROR_CODES.mathJsonInvalidShape,
        "A MathJSON dict must use string keys.",
        `${path}.dict`,
      );
    }
    const nested = validateDictionaryValue(
      ownDataValue(coreValue, key),
      propertyPath(`${path}.dict`, key),
    );
    if (nested) return nested;
  }
  return null;
}

function validateExpressionShape(
  value: unknown,
  path: string,
): ValidationFailure | null {
  if (typeof value === "number" || typeof value === "string") return null;

  if (Array.isArray(value)) {
    const length = ownDataValue(value, "length");
    const head = ownDataValue(value, "0");
    if (typeof length !== "number" || length === 0 || !isValidMathJsonSymbol(head)) {
      return failure(
        KERNEL_ERROR_CODES.mathJsonInvalidShape,
        "A MathJSON function array must start with a valid operator symbol.",
        path,
      );
    }
    for (let index = 1; index < length; index += 1) {
      const nested = validateExpressionShape(
        ownDataValue(value, String(index)),
        `${path}[${index}]`,
      );
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

  return validateExpressionObject(value, path);
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
