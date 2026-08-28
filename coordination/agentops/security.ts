import { canonicalJson } from "./canonical";

export const V1_AUTHORITY_POLICY = Object.freeze({
  repositoryReadAllowed: true,
  deterministicValidationAllowed: true,
  localCheckpointWriteAllowed: true,
  handoffWriteAllowed: true,
  codeWriteAllowed: false,
  contentWriteAllowed: false,
  credentialAccessAllowed: false,
  providerExecutionAllowed: false,
  gitMutationAllowed: false,
  deploymentAllowed: false,
  productionDataMutationAllowed: false,
} as const);

export type AgentOpsAuthorityPolicyV1 = typeof V1_AUTHORITY_POLICY;

export interface SanitizedEvidenceV1 {
  readonly summary: string;
  readonly evidenceDigests: readonly string[];
  readonly repositoryPaths: readonly string[];
}

const FORBIDDEN_KEY_FRAGMENTS = Object.freeze([
  "apikey",
  "authorization",
  "bearertoken",
  "password",
  "passwd",
  "credential",
  "cookie",
  "sessiontoken",
  "accesstoken",
  "refreshtoken",
  "privatekey",
  "studentid",
  "studentname",
  "studentdata",
  "rawstudent",
  "rawquestion",
  "protectedquestion",
  "answerkey",
  "providerresponse",
  "rawproviderresponse",
  "rawresponse",
  "chainofthought",
  "reasoningtrace",
  "internalreasoning",
]);

const SECRET_PATTERNS = Object.freeze([
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi,
  /\b(?:api[_-]?key|token|secret|password|cookie)\s*[:=]\s*[^\s,;]{12,}/gi,
  /\b(?:sk|ds|rk|pk)-[A-Za-z0-9_-]{16,}\b/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
]);

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

export function redactText(value: string): string {
  return SECRET_PATTERNS.reduce(
    (redacted, pattern) => redacted.replace(pattern, "[REDACTED]"),
    value,
  );
}

export function assertNoSensitivePersistence(value: unknown): void {
  const cloned = JSON.parse(canonicalJson(value)) as unknown;

  function visit(current: unknown, path: string): void {
    if (typeof current === "string") {
      if (redactText(current) !== current) {
        throw new TypeError(`${path} contains forbidden sensitive text`);
      }
      return;
    }
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (current !== null && typeof current === "object") {
      for (const [key, child] of Object.entries(current)) {
        const normalized = normalizeKey(key);
        const isBooleanPolicyFlag =
          normalized.endsWith("allowed") && typeof child === "boolean";
        if (
          !isBooleanPolicyFlag &&
          FORBIDDEN_KEY_FRAGMENTS.some(
            (fragment) => normalized === fragment || normalized.endsWith(fragment),
          )
        ) {
          throw new TypeError(`${path}.${key} is a forbidden sensitive field`);
        }
        visit(child, `${path}.${key}`);
      }
    }
  }

  visit(cloned, "$persisted");
}

function requireRepositoryPath(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 1_024 ||
    value.trim() !== value ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.split("/").some((part) => part === "" || part === "..")
  ) {
    throw new TypeError(`${path} must be a normalized repository-relative path`);
  }
  return value;
}

function requireUniqueArray<T>(
  value: unknown,
  path: string,
  parser: (item: unknown, itemPath: string) => T,
): readonly T[] {
  if (!Array.isArray(value) || value.length > 100) {
    throw new TypeError(`${path} must be an array with at most 100 items`);
  }
  const parsed = value.map((item, index) => parser(item, `${path}[${index}]`));
  if (new Set(parsed.map((item) => String(item))).size !== parsed.length) {
    throw new TypeError(`${path} must not contain duplicates`);
  }
  return parsed;
}

export function sanitizeEvidence(input: unknown): Readonly<SanitizedEvidenceV1> {
  const cloned = JSON.parse(canonicalJson(input)) as unknown;
  if (cloned === null || typeof cloned !== "object" || Array.isArray(cloned)) {
    throw new TypeError("sanitized evidence must be an object");
  }
  const record = cloned as Record<string, unknown>;
  const actual = Object.keys(record).sort();
  const expected = ["evidenceDigests", "repositoryPaths", "summary"].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new TypeError("sanitized evidence contains unknown schema fields");
  }
  if (
    typeof record.summary !== "string" ||
    record.summary.length === 0 ||
    record.summary.length > 2_048 ||
    record.summary.trim() !== record.summary
  ) {
    throw new TypeError("sanitized evidence summary is invalid");
  }
  const evidence: SanitizedEvidenceV1 = {
    summary: record.summary,
    evidenceDigests: requireUniqueArray(
      record.evidenceDigests,
      "sanitizedEvidence.evidenceDigests",
      (item, path) => {
        if (typeof item !== "string" || !/^[a-f0-9]{64}$/.test(item)) {
          throw new TypeError(`${path} must be a lowercase SHA-256 digest`);
        }
        return item;
      },
    ),
    repositoryPaths: requireUniqueArray(
      record.repositoryPaths,
      "sanitizedEvidence.repositoryPaths",
      requireRepositoryPath,
    ),
  };
  assertNoSensitivePersistence(evidence);
  return deepFreeze(evidence);
}
