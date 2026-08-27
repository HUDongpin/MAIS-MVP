import {
  GRAPHOPS_RUNNER_IDS,
  GRAPHOPS_RUNNER_REGISTRY_VERSION,
  type GraphOpsRunnerId,
} from "./registry";
import {
  GRAPHOPS_GRAPH_ID,
  GRAPHOPS_GRAPH_VERSION,
  getGraphSpecDigest,
  getRunnerRegistryDigest,
} from "./definition";

export const GRAPHOPS_MANIFEST_SCHEMA_VERSION =
  "mais-graphops-manifest.v1" as const;

export interface CandidateBinding {
  readonly commitSha: string;
  readonly treeSha: string;
}

export interface GraphOpsAuthorizations {
  readonly previewAllowed: boolean;
  readonly productionAllowed: boolean;
}

export interface GraphManifest {
  readonly schemaVersion: typeof GRAPHOPS_MANIFEST_SCHEMA_VERSION;
  readonly registryVersion: typeof GRAPHOPS_RUNNER_REGISTRY_VERSION;
  readonly graphId: typeof GRAPHOPS_GRAPH_ID;
  readonly graphVersion: typeof GRAPHOPS_GRAPH_VERSION;
  readonly graphSpecDigest: string;
  readonly runnerRegistryDigest: string;
  readonly runId: string;
  readonly candidate: Readonly<CandidateBinding>;
  readonly authorizations: Readonly<GraphOpsAuthorizations>;
  readonly runnerIds: readonly GraphOpsRunnerId[];
}

type UnknownRecord = Record<string, unknown>;

function isPlainRecord(value: unknown): value is UnknownRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireRecord(value: unknown, path: string): UnknownRecord {
  if (!isPlainRecord(value)) {
    throw new TypeError(`${path} must be a plain JSON object`);
  }
  return value;
}

const FORBIDDEN_MANIFEST_FIELD_FRAGMENTS = Object.freeze([
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

function isForbiddenManifestField(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    FORBIDDEN_MANIFEST_FIELD_FRAGMENTS.some((fragment) =>
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

function assertNoForbiddenManifestFields(
  value: unknown,
  path = "manifest",
  seen = new WeakSet<object>(),
): void {
  if (value === null || typeof value !== "object") {
    return;
  }
  if (seen.has(value)) {
    return;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenManifestFields(item, `${path}[${index}]`, seen),
    );
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (isForbiddenManifestField(key)) {
      throw new TypeError(`forbidden manifest field at ${path}.${key}: ${key}`);
    }
    assertNoForbiddenManifestFields(child, `${path}.${key}`, seen);
  }
}

function assertExactKeys(
  value: UnknownRecord,
  allowedKeys: readonly string[],
  path: string,
  optionalKeys: readonly string[] = [],
): void {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new TypeError(`${path} contains unsupported field: ${key}`);
    }
  }

  const optional = new Set(optionalKeys);
  for (const key of allowedKeys) {
    if (!optional.has(key) && !Object.hasOwn(value, key)) {
      throw new TypeError(`${path} is missing required field: ${key}`);
    }
  }
}

function requireLiteral<T extends string>(
  value: unknown,
  expected: T,
  path: string,
): T {
  if (value !== expected) {
    throw new TypeError(`${path} must equal ${expected}`);
  }
  return expected;
}

function requireIdentifier(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,127})$/.test(value)
  ) {
    throw new TypeError(`${path} must be a safe 1-128 character identifier`);
  }
  return value;
}

function requireGitObjectId(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/.test(value)) {
    throw new TypeError(`${path} must be a lowercase 40-character Git object ID`);
  }
  return value;
}

function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw new TypeError(`${path} must be boolean`);
  }
  return value;
}

function validateRunnerIds(value: unknown): readonly GraphOpsRunnerId[] {
  if (!Array.isArray(value)) {
    throw new TypeError("manifest.runnerIds must be an array");
  }

  const known = new Set<string>(GRAPHOPS_RUNNER_IDS);
  for (const [index, runnerId] of value.entries()) {
    if (typeof runnerId !== "string" || !known.has(runnerId)) {
      throw new TypeError(
        `manifest.runnerIds[${index}] is not a registered runner ID: ${String(runnerId)}`,
      );
    }
  }

  if (
    value.length !== GRAPHOPS_RUNNER_IDS.length ||
    value.some((runnerId, index) => runnerId !== GRAPHOPS_RUNNER_IDS[index])
  ) {
    throw new TypeError(
      "manifest.runnerIds must exactly match the versioned runner registry order",
    );
  }

  return Object.freeze([...GRAPHOPS_RUNNER_IDS]);
}

export function validateGraphManifest(input: unknown): Readonly<GraphManifest> {
  assertNoForbiddenManifestFields(input);
  const manifest = requireRecord(input, "manifest");
  assertExactKeys(
    manifest,
    [
      "schemaVersion",
      "registryVersion",
      "graphId",
      "graphVersion",
      "graphSpecDigest",
      "runnerRegistryDigest",
      "runId",
      "candidate",
      "authorizations",
      "runnerIds",
    ],
    "manifest",
    ["authorizations"],
  );

  const candidate = requireRecord(manifest.candidate, "manifest.candidate");
  assertExactKeys(candidate, ["commitSha", "treeSha"], "manifest.candidate");

  const rawAuthorizations = manifest.authorizations ?? {};
  const authorizations = requireRecord(
    rawAuthorizations,
    "manifest.authorizations",
  );
  assertExactKeys(
    authorizations,
    ["previewAllowed", "productionAllowed"],
    "manifest.authorizations",
    ["previewAllowed", "productionAllowed"],
  );
  const previewAllowed =
    authorizations.previewAllowed === undefined
      ? false
      : requireBoolean(
          authorizations.previewAllowed,
          "manifest.authorizations.previewAllowed",
        );
  const productionAllowed =
    authorizations.productionAllowed === undefined
      ? false
      : requireBoolean(
          authorizations.productionAllowed,
          "manifest.authorizations.productionAllowed",
        );
  if (previewAllowed) {
    throw new TypeError(
      "Foundation manifest requires previewAllowed=false; Preview activation is outside this contract",
    );
  }
  if (productionAllowed) {
    throw new TypeError(
      "Foundation manifest requires productionAllowed=false; production activation is outside this contract",
    );
  }

  const normalized: GraphManifest = {
    schemaVersion: requireLiteral(
      manifest.schemaVersion,
      GRAPHOPS_MANIFEST_SCHEMA_VERSION,
      "manifest.schemaVersion",
    ),
    registryVersion: requireLiteral(
      manifest.registryVersion,
      GRAPHOPS_RUNNER_REGISTRY_VERSION,
      "manifest.registryVersion",
    ),
    graphId: requireLiteral(
      manifest.graphId,
      GRAPHOPS_GRAPH_ID,
      "manifest.graphId",
    ),
    graphVersion: requireLiteral(
      manifest.graphVersion,
      GRAPHOPS_GRAPH_VERSION,
      "manifest.graphVersion",
    ),
    graphSpecDigest: requireLiteral(
      manifest.graphSpecDigest,
      getGraphSpecDigest(),
      "manifest.graphSpecDigest",
    ),
    runnerRegistryDigest: requireLiteral(
      manifest.runnerRegistryDigest,
      getRunnerRegistryDigest(),
      "manifest.runnerRegistryDigest",
    ),
    runId: requireIdentifier(manifest.runId, "manifest.runId"),
    candidate: Object.freeze({
      commitSha: requireGitObjectId(
        candidate.commitSha,
        "manifest.candidate.commitSha",
      ),
      treeSha: requireGitObjectId(
        candidate.treeSha,
        "manifest.candidate.treeSha",
      ),
    }),
    authorizations: Object.freeze({
      previewAllowed,
      productionAllowed,
    }),
    runnerIds: validateRunnerIds(manifest.runnerIds),
  };

  return Object.freeze(normalized);
}
