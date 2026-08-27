import { createHash } from "node:crypto";

export type JsonPrimitive = null | boolean | number | string;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

const UNSAFE_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertJsonValueAt(
  value: unknown,
  path: string,
  ancestors: Set<object>,
  depth: number,
): asserts value is JsonValue {
  if (depth > 64) {
    throw new TypeError(`${path} exceeds the maximum JSON depth of 64`);
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${path} must contain only finite JSON numbers`);
    }
    return;
  }
  if (typeof value !== "object") {
    throw new TypeError(`${path} is not JSON-serializable`);
  }
  if (ancestors.has(value)) {
    throw new TypeError(`${path} contains a circular reference`);
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, index);
        if (!descriptor) {
          throw new TypeError(`${path}[${index}] is a sparse array entry`);
        }
        if (!descriptor.enumerable || descriptor.get || descriptor.set) {
          throw new TypeError(
            `${path}[${index}] must be an enumerable data property`,
          );
        }
        assertJsonValueAt(
          descriptor.value,
          `${path}[${index}]`,
          ancestors,
          depth + 1,
        );
      }
      return;
    }

    if (!isPlainObject(value)) {
      throw new TypeError(`${path} must contain only plain JSON objects`);
    }
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new TypeError(`${path} must not contain symbol keys`);
    }

    for (const key of Object.getOwnPropertyNames(value)) {
      if (UNSAFE_OBJECT_KEYS.has(key)) {
        throw new TypeError(`${path} contains unsafe object key: ${key}`);
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || descriptor.get || descriptor.set) {
        throw new TypeError(`${path}.${key} must be an enumerable data property`);
      }
      assertJsonValueAt(value[key], `${path}.${key}`, ancestors, depth + 1);
    }
  } finally {
    ancestors.delete(value);
  }
}

export function assertJsonSerializable(
  value: unknown,
  path = "value",
): asserts value is JsonValue {
  assertJsonValueAt(value, path, new Set<object>(), 0);
}

function encodeCanonical(value: JsonValue): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => encodeCanonical(item)).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${encodeCanonical(
          (value as Record<string, JsonValue>)[key],
        )}`,
    )
    .join(",")}}`;
}

export function canonicalJson(value: unknown): string {
  assertJsonSerializable(value);
  return encodeCanonical(value);
}

export function sha256Digest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}
