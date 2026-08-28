import { canonicalJson } from "./canonical";
import { assertNoSensitivePersistence } from "./security";

export const AGENTOPS_REQUEST_SCHEMA_VERSION = "mais-agentops-request.v1" as const;

export type AgentOpsTaskType =
  | "feature"
  | "bugfix"
  | "content-generation"
  | "machine-qa"
  | "content-qa"
  | "prompt-audit"
  | "adaptive-audit"
  | "research"
  | "regression"
  | "release"
  | "git-hygiene"
  | "backend"
  | "documentation"
  | "illustration"
  | "routing";

export type AgentOpsOperationMode =
  | "analyze"
  | "audit"
  | "plan"
  | "route"
  | "handoff";

export type AgentOpsTargetRuntime =
  | "codex"
  | "claude"
  | "specialist-skill"
  | "graphops"
  | "human";

export type AgentOpsRequestedEffect =
  | "repository-read"
  | "deterministic-validation"
  | "code-write"
  | "content-write"
  | "credential-access"
  | "provider-execution"
  | "git-mutation"
  | "deployment"
  | "production-data-mutation";

export interface AgentOpsContextRefV1 {
  readonly kind: "repo-path" | "logical-ref" | "sha256";
  readonly value: string;
}

export interface AgentOpsUnresolvedItemV1 {
  readonly id: string;
  readonly question: string;
  readonly impact: "low" | "high";
}

export interface AgentOpsRequestV1 {
  readonly schemaVersion: typeof AGENTOPS_REQUEST_SCHEMA_VERSION;
  readonly requestId: string;
  readonly intentSummary: string;
  readonly explicitGoal: string;
  readonly taskType: AgentOpsTaskType;
  readonly operationMode: AgentOpsOperationMode;
  readonly audience: string;
  readonly targetRuntime: AgentOpsTargetRuntime;
  readonly scope: {
    readonly included: readonly string[];
    readonly excluded: readonly string[];
  };
  readonly mustHave: readonly string[];
  readonly mustAvoid: readonly string[];
  readonly successCriteria: readonly string[];
  readonly assumptions: readonly string[];
  readonly unresolvedItems: readonly AgentOpsUnresolvedItemV1[];
  readonly contextRefs: readonly AgentOpsContextRefV1[];
  readonly requestedEffects: readonly AgentOpsRequestedEffect[];
}

const TASK_TYPES: readonly AgentOpsTaskType[] = Object.freeze([
  "feature",
  "bugfix",
  "content-generation",
  "machine-qa",
  "content-qa",
  "prompt-audit",
  "adaptive-audit",
  "research",
  "regression",
  "release",
  "git-hygiene",
  "backend",
  "documentation",
  "illustration",
  "routing",
]);

const OPERATION_MODES: readonly AgentOpsOperationMode[] = Object.freeze([
  "analyze",
  "audit",
  "plan",
  "route",
  "handoff",
]);

const TARGET_RUNTIMES: readonly AgentOpsTargetRuntime[] = Object.freeze([
  "codex",
  "claude",
  "specialist-skill",
  "graphops",
  "human",
]);

const REQUESTED_EFFECTS: readonly AgentOpsRequestedEffect[] = Object.freeze([
  "repository-read",
  "deterministic-validation",
  "code-write",
  "content-write",
  "credential-access",
  "provider-execution",
  "git-mutation",
  "deployment",
  "production-data-mutation",
]);

const REQUEST_KEYS = Object.freeze([
  "schemaVersion",
  "requestId",
  "intentSummary",
  "explicitGoal",
  "taskType",
  "operationMode",
  "audience",
  "targetRuntime",
  "scope",
  "mustHave",
  "mustAvoid",
  "successCriteria",
  "assumptions",
  "unresolvedItems",
  "contextRefs",
  "requestedEffects",
] as const);

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    throw new TypeError(`${path} must be a plain object`);
  }
  return value as Record<string, unknown>;
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  path: string,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    throw new TypeError(`${path} contains unknown or missing schema fields`);
  }
}

function requireString(
  value: unknown,
  path: string,
  options: { readonly min?: number; readonly max?: number } = {},
): string {
  const min = options.min ?? 1;
  const max = options.max ?? 8_192;
  if (
    typeof value !== "string" ||
    value.length < min ||
    value.length > max ||
    value.trim() !== value ||
    value.includes("\0")
  ) {
    throw new TypeError(
      `${path} must be a trimmed string between ${min} and ${max} characters`,
    );
  }
  return value;
}

function requireEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new TypeError(`${path} is not a supported value`);
  }
  return value as T;
}

function requireStringArray(
  value: unknown,
  path: string,
  options: { readonly min?: number; readonly max?: number } = {},
): readonly string[] {
  const min = options.min ?? 0;
  const max = options.max ?? 100;
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    throw new TypeError(`${path} must contain between ${min} and ${max} items`);
  }
  const result = value.map((item, index) =>
    requireString(item, `${path}[${index}]`),
  );
  if (new Set(result).size !== result.length) {
    throw new TypeError(`${path} must not contain duplicate items`);
  }
  return result;
}

function requireRequestId(value: unknown): string {
  const result = requireString(value, "AgentOpsRequestV1.requestId", {
    max: 128,
  });
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(result)) {
    throw new TypeError(
      "AgentOpsRequestV1.requestId must use only safe identifier characters",
    );
  }
  return result;
}

function requireRepositoryRelativePath(value: unknown, path: string): string {
  const result = requireString(value, path, { max: 1_024 });
  if (
    result.startsWith("/") ||
    result.includes("\\") ||
    result.split("/").some((part) => part === ".." || part === "")
  ) {
    throw new TypeError(`${path} must be a normalized repository-relative path`);
  }
  return result;
}

function requireScopeArray(
  value: unknown,
  path: string,
  options: { readonly min?: number } = {},
): readonly string[] {
  const scopes = requireStringArray(value, path, { min: options.min });
  for (const [index, scope] of scopes.entries()) {
    const segments = scope.split("/");
    if (
      scope.startsWith("/") ||
      scope.includes("\\") ||
      /^[a-z][a-z0-9+.-]*:\/\//i.test(scope) ||
      /^[a-z]:/i.test(scope) ||
      segments.some(
        (segment) => segment === "" || segment === "." || segment === "..",
      )
    ) {
      throw new TypeError(
        `${path}[${index}] must be a normalized repository-relative scope`,
      );
    }
  }
  return scopes;
}

function parseUnresolvedItems(value: unknown): readonly AgentOpsUnresolvedItemV1[] {
  if (!Array.isArray(value) || value.length > 50) {
    throw new TypeError("AgentOpsRequestV1.unresolvedItems must be an array");
  }
  const parsed = value.map((item, index) => {
    const path = `AgentOpsRequestV1.unresolvedItems[${index}]`;
    const record = requireRecord(item, path);
    assertExactKeys(record, ["id", "question", "impact"], path);
    return {
      id: requireString(record.id, `${path}.id`, { max: 128 }),
      question: requireString(record.question, `${path}.question`),
      impact: requireEnum(record.impact, ["low", "high"], `${path}.impact`),
    } as const;
  });
  if (new Set(parsed.map((item) => item.id)).size !== parsed.length) {
    throw new TypeError("AgentOpsRequestV1.unresolvedItems contains duplicate ids");
  }
  return parsed;
}

function parseContextRefs(value: unknown): readonly AgentOpsContextRefV1[] {
  if (!Array.isArray(value) || value.length > 100) {
    throw new TypeError("AgentOpsRequestV1.contextRefs must be an array");
  }
  const parsed = value.map((item, index) => {
    const path = `AgentOpsRequestV1.contextRefs[${index}]`;
    const record = requireRecord(item, path);
    assertExactKeys(record, ["kind", "value"], path);
    const kind = requireEnum(
      record.kind,
      ["repo-path", "logical-ref", "sha256"],
      `${path}.kind`,
    );
    let refValue: string;
    if (kind === "repo-path") {
      refValue = requireRepositoryRelativePath(record.value, `${path}.value`);
    } else if (kind === "sha256") {
      refValue = requireString(record.value, `${path}.value`, {
        min: 64,
        max: 64,
      });
      if (!/^[a-f0-9]{64}$/.test(refValue)) {
        throw new TypeError(`${path}.value must be a lowercase SHA-256 digest`);
      }
    } else {
      refValue = requireString(record.value, `${path}.value`, { max: 256 });
      if (/^[a-z][a-z0-9+.-]*:\/\//i.test(refValue)) {
        throw new TypeError(`${path}.value must not be a URL`);
      }
    }
    return { kind, value: refValue } as const;
  });
  const identities = parsed.map((item) => `${item.kind}:${item.value}`);
  if (new Set(identities).size !== identities.length) {
    throw new TypeError("AgentOpsRequestV1.contextRefs contains duplicates");
  }
  return parsed;
}

function parseRequestedEffects(value: unknown): readonly AgentOpsRequestedEffect[] {
  if (!Array.isArray(value) || value.length > REQUESTED_EFFECTS.length) {
    throw new TypeError("AgentOpsRequestV1.requestedEffects must be an array");
  }
  const parsed = value.map((item, index) =>
    requireEnum(
      item,
      REQUESTED_EFFECTS,
      `AgentOpsRequestV1.requestedEffects[${index}]`,
    ),
  );
  if (new Set(parsed).size !== parsed.length) {
    throw new TypeError("AgentOpsRequestV1.requestedEffects contains duplicates");
  }
  return parsed;
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

export function parseAgentOpsRequest(input: unknown): Readonly<AgentOpsRequestV1> {
  const cloned = JSON.parse(canonicalJson(input)) as unknown;
  const request = requireRecord(cloned, "AgentOpsRequestV1");
  assertExactKeys(request, REQUEST_KEYS, "AgentOpsRequestV1");
  if (request.schemaVersion !== AGENTOPS_REQUEST_SCHEMA_VERSION) {
    throw new TypeError(
      `schemaVersion must be ${AGENTOPS_REQUEST_SCHEMA_VERSION}`,
    );
  }
  const scope = requireRecord(request.scope, "AgentOpsRequestV1.scope");
  assertExactKeys(scope, ["included", "excluded"], "AgentOpsRequestV1.scope");
  const parsed: AgentOpsRequestV1 = {
    schemaVersion: AGENTOPS_REQUEST_SCHEMA_VERSION,
    requestId: requireRequestId(request.requestId),
    intentSummary: requireString(
      request.intentSummary,
      "AgentOpsRequestV1.intentSummary",
    ),
    explicitGoal: requireString(
      request.explicitGoal,
      "AgentOpsRequestV1.explicitGoal",
    ),
    taskType: requireEnum(
      request.taskType,
      TASK_TYPES,
      "AgentOpsRequestV1.taskType",
    ),
    operationMode: requireEnum(
      request.operationMode,
      OPERATION_MODES,
      "AgentOpsRequestV1.operationMode",
    ),
    audience: requireString(request.audience, "AgentOpsRequestV1.audience"),
    targetRuntime: requireEnum(
      request.targetRuntime,
      TARGET_RUNTIMES,
      "AgentOpsRequestV1.targetRuntime",
    ),
    scope: {
      included: requireScopeArray(
        scope.included,
        "AgentOpsRequestV1.scope.included",
        { min: 1 },
      ),
      excluded: requireScopeArray(
        scope.excluded,
        "AgentOpsRequestV1.scope.excluded",
      ),
    },
    mustHave: requireStringArray(request.mustHave, "AgentOpsRequestV1.mustHave"),
    mustAvoid: requireStringArray(
      request.mustAvoid,
      "AgentOpsRequestV1.mustAvoid",
    ),
    successCriteria: requireStringArray(
      request.successCriteria,
      "AgentOpsRequestV1.successCriteria",
      { min: 1 },
    ),
    assumptions: requireStringArray(
      request.assumptions,
      "AgentOpsRequestV1.assumptions",
    ),
    unresolvedItems: parseUnresolvedItems(request.unresolvedItems),
    contextRefs: parseContextRefs(request.contextRefs),
    requestedEffects: parseRequestedEffects(request.requestedEffects),
  };
  assertNoSensitivePersistence(parsed);
  return deepFreeze(parsed);
}
