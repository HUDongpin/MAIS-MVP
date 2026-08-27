import {
  assertJsonSerializable,
  canonicalJson,
  type JsonValue,
} from "./json";

const REDACTED = "[REDACTED]" as const;

export const GRAPHOPS_EVIDENCE_LIMITS = Object.freeze({
  maxCanonicalBytes: 32_768,
  maxDepth: 16,
  maxCollectionEntries: 128,
  maxStringBytes: 4_096,
  maxNodes: 2_048,
});

const SENSITIVE_KEY_FRAGMENTS = Object.freeze([
  "password",
  "passwd",
  "secret",
  "token",
  "apikey",
  "authorization",
  "credential",
  "cookie",
  "privatekey",
  "email",
  "phonenumber",
  "studentname",
  "teachername",
  "guardianname",
  "fullname",
  "homeaddress",
  "userid",
  "studentid",
  "teacherid",
  "guardianid",
]);

const EXECUTABLE_CONTROL_FIELD_FRAGMENTS = Object.freeze([
  "command",
  "shell",
  "argv",
  "environment",
  "sql",
  "url",
  "provider",
  "deploy",
  "network",
  "endpoint",
  "webhook",
  "socket",
]);

function normalizeAsciiKey(key: string): string {
  return key.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function assertBoundedStructuredPayload(
  input: unknown,
  path: string,
): asserts input is Readonly<Record<string, JsonValue>> {
  if (!isPlainRecord(input)) {
    throw new TypeError(`${path} must be a structured JSON object`);
  }

  let nodes = 0;
  const ancestors = new Set<object>();
  const visit = (value: unknown, currentPath: string, depth: number): void => {
    nodes += 1;
    if (nodes > GRAPHOPS_EVIDENCE_LIMITS.maxNodes) {
      throw new TypeError(
        `${path} exceeds the ${GRAPHOPS_EVIDENCE_LIMITS.maxNodes}-node evidence limit`,
      );
    }
    if (depth > GRAPHOPS_EVIDENCE_LIMITS.maxDepth) {
      throw new TypeError(
        `${currentPath} exceeds the evidence depth limit of ${GRAPHOPS_EVIDENCE_LIMITS.maxDepth}`,
      );
    }
    if (typeof value === "string") {
      if (
        Buffer.byteLength(value, "utf8") >
        GRAPHOPS_EVIDENCE_LIMITS.maxStringBytes
      ) {
        throw new TypeError(
          `${currentPath} exceeds the ${GRAPHOPS_EVIDENCE_LIMITS.maxStringBytes}-byte evidence string limit`,
        );
      }
      return;
    }
    if (value === null || typeof value !== "object") {
      return;
    }
    if (ancestors.has(value)) {
      throw new TypeError(`${currentPath} contains a circular reference`);
    }
    ancestors.add(value);
    try {
      if (Array.isArray(value)) {
        if (value.length > GRAPHOPS_EVIDENCE_LIMITS.maxCollectionEntries) {
          throw new TypeError(
            `${currentPath} exceeds the ${GRAPHOPS_EVIDENCE_LIMITS.maxCollectionEntries}-entry collection limit`,
          );
        }
        for (let index = 0; index < value.length; index += 1) {
          const descriptor = Object.getOwnPropertyDescriptor(value, index);
          if (!descriptor?.enumerable || descriptor.get || descriptor.set) {
            throw new TypeError(
              `${currentPath}[${index}] must be an enumerable data property`,
            );
          }
          visit(descriptor.value, `${currentPath}[${index}]`, depth + 1);
        }
        return;
      }
      if (!isPlainRecord(value)) {
        throw new TypeError(`${currentPath} must contain only plain JSON objects`);
      }
      let entryCount = 0;
      for (const key in value) {
        if (!Object.hasOwn(value, key)) {
          continue;
        }
        entryCount += 1;
        if (entryCount > GRAPHOPS_EVIDENCE_LIMITS.maxCollectionEntries) {
          throw new TypeError(
            `${currentPath} exceeds the ${GRAPHOPS_EVIDENCE_LIMITS.maxCollectionEntries}-entry collection limit`,
          );
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor?.enumerable || descriptor.get || descriptor.set) {
          throw new TypeError(
            `${currentPath}.${key} must be an enumerable data property`,
          );
        }
        visit(descriptor.value, `${currentPath}.${key}`, depth + 1);
      }
    } finally {
      ancestors.delete(value);
    }
  };

  visit(input, path, 0);
  assertJsonSerializable(input, path);
  if (
    Buffer.byteLength(canonicalJson(input), "utf8") >
    GRAPHOPS_EVIDENCE_LIMITS.maxCanonicalBytes
  ) {
    throw new TypeError(
      `${path} exceeds the ${GRAPHOPS_EVIDENCE_LIMITS.maxCanonicalBytes}-byte canonical evidence limit`,
    );
  }
}

function isExecutableControlField(key: string): boolean {
  const normalized = normalizeAsciiKey(key);
  return (
    EXECUTABLE_CONTROL_FIELD_FRAGMENTS.some((fragment) =>
      normalized.includes(fragment),
    ) ||
    normalized === "cmd" ||
    normalized.endsWith("cmd") ||
    normalized === "env" ||
    normalized.endsWith("env") ||
    normalized === "uri" ||
    normalized.endsWith("uri") ||
    normalized === "host" ||
    normalized.endsWith("host")
  );
}

export function assertDataOnlyPayload(
  input: unknown,
  path = "payload",
): void {
  assertBoundedStructuredPayload(input, path);
  const visit = (value: JsonValue, currentPath: string): void => {
    if (value === null || typeof value !== "object") {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${currentPath}[${index}]`));
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (isExecutableControlField(key)) {
        throw new TypeError(
          `${currentPath} contains forbidden executable/control field: ${key}`,
        );
      }
      visit(child, `${currentPath}.${key}`);
    }
  };
  visit(input, path);
}

function isSensitiveKey(key: string): boolean {
  const normalized = normalizeAsciiKey(key);
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) =>
    normalized.includes(fragment),
  );
}

function sanitizeString(_value: string): string {
  // Foundation receipts/events retain digests, not text. Keep this utility
  // deliberately lossy so unknown names, opaque credentials, provider output,
  // and private corpus prose cannot survive merely because no heuristic matched.
  return "[REDACTED_TEXT]";
}

function sanitizeJsonValue(value: JsonValue): JsonValue {
  if (typeof value === "string") {
    return sanitizeString(value);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => sanitizeJsonValue(item)));
  }

  const sanitized: Record<string, JsonValue> = {};
  for (const [key, child] of Object.entries(value)) {
    sanitized[key] = isSensitiveKey(key) ? REDACTED : sanitizeJsonValue(child);
  }
  return Object.freeze(sanitized);
}

export function sanitizeEvidence(input: unknown): JsonValue {
  assertBoundedStructuredPayload(input, "evidence");
  const sanitized = sanitizeJsonValue(input);
  assertBoundedStructuredPayload(sanitized, "evidence");
  return sanitized;
}

export function assertSanitizedEvidence(
  input: unknown,
): asserts input is JsonValue {
  assertBoundedStructuredPayload(input, "evidence");
  const sanitized = sanitizeJsonValue(input);
  if (canonicalJson(sanitized) !== canonicalJson(input)) {
    throw new TypeError("evidence contains unsanitized secret or PII material");
  }
}
