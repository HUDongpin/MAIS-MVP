import { createHash } from "node:crypto";

export type JsonPrimitive = null | boolean | number | string;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

interface EncodeState {
  readonly ancestors: WeakSet<object>;
  nodes: number;
}

function enterObject(value: object, state: EncodeState, depth: number): void {
  if (depth > 128) {
    throw new TypeError("canonical JSON exceeds the maximum nesting depth");
  }
  state.nodes += 1;
  if (state.nodes > 100_000) {
    throw new TypeError("canonical JSON exceeds the maximum node count");
  }
  if (state.ancestors.has(value)) {
    throw new TypeError("canonical JSON does not accept circular cycles");
  }
  state.ancestors.add(value);
}

function encode(value: unknown, state: EncodeState, depth: number): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("canonical JSON accepts only finite numbers");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    enterObject(value, state, depth);
    const ownKeys = Reflect.ownKeys(value);
    const expectedKeys = new Set<PropertyKey>([
      "length",
      ...Array.from({ length: value.length }, (_unused, index) => String(index)),
    ]);
    if (
      ownKeys.length !== expectedKeys.size ||
      ownKeys.some((key) => !expectedKeys.has(key))
    ) {
      state.ancestors.delete(value);
      throw new TypeError("canonical JSON arrays must not have extra properties");
    }
    const items: string[] = [];
    try {
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, index);
        if (!descriptor?.enumerable || descriptor.get || descriptor.set) {
          throw new TypeError(
            `canonical JSON requires array entry ${index} to be a data property`,
          );
        }
        items.push(encode(descriptor.value, state, depth + 1));
      }
      return `[${items.join(",")}]`;
    } finally {
      state.ancestors.delete(value);
    }
  }
  if (
    value === null ||
    typeof value !== "object" ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    throw new TypeError("canonical JSON accepts only plain JSON values");
  }
  enterObject(value, state, depth);
  const record = value as Record<string, unknown>;
  try {
    const ownKeys = Reflect.ownKeys(record);
    if (ownKeys.some((key) => typeof key === "symbol")) {
      throw new TypeError("canonical JSON does not accept symbol properties");
    }
    const keys = ownKeys as string[];
    return `{${keys
      .sort()
      .map((key) => {
        if (UNSAFE_KEYS.has(key)) {
          throw new TypeError(`canonical JSON rejects unsafe key ${key}`);
        }
        const descriptor = Object.getOwnPropertyDescriptor(record, key);
        if (!descriptor?.enumerable || descriptor.get || descriptor.set) {
          throw new TypeError(
            `canonical JSON requires ${key} to be an enumerable data property`,
          );
        }
        return `${JSON.stringify(key)}:${encode(descriptor.value, state, depth + 1)}`;
      })
      .join(",")}}`;
  } finally {
    state.ancestors.delete(value);
  }
}

export function canonicalJson(value: unknown): string {
  return encode(value, { ancestors: new WeakSet<object>(), nodes: 0 }, 0);
}

export function sha256Digest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}
