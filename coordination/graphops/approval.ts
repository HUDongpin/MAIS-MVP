import {
  GRAPHOPS_GRAPH_VERSION,
  getGraphSpecDigest,
  getRunnerRegistryDigest,
} from "./definition";
import {
  assertJsonSerializable,
  canonicalJson,
  sha256Digest,
} from "./json";

export const APPROVAL_ENVELOPE_SCHEMA_VERSION =
  "mais-graphops-approval-envelope.v1" as const;

export interface PreviousProductionBinding {
  readonly deploymentId: string;
  readonly candidateSha: string;
}

export interface ApprovalEnvelopeInput {
  readonly runId: string;
  readonly candidateSha: string;
  readonly candidateTreeSha: string;
  readonly previewDeploymentId: string;
  readonly previewEvidenceDigest: string;
  readonly requiredChecksDigest: string;
  readonly changedPathPolicyDigest: string;
  readonly schemaSourcePlanDigest: string;
  readonly previousProductionBinding: Readonly<PreviousProductionBinding>;
  readonly approvalExpiresAt: string;
  readonly rollbackAuthorization: true;
}

interface ApprovalEnvelopeBody extends ApprovalEnvelopeInput {
  readonly graphVersion: typeof GRAPHOPS_GRAPH_VERSION;
  readonly graphSpecDigest: string;
  readonly runnerRegistryDigest: string;
}

export interface ApprovalEnvelope extends ApprovalEnvelopeBody {
  readonly approvalDigest: string;
}

const INPUT_KEYS = Object.freeze([
  "runId",
  "candidateSha",
  "candidateTreeSha",
  "previewDeploymentId",
  "previewEvidenceDigest",
  "requiredChecksDigest",
  "changedPathPolicyDigest",
  "schemaSourcePlanDigest",
  "previousProductionBinding",
  "approvalExpiresAt",
  "rollbackAuthorization",
] as const);

const ENVELOPE_KEYS = Object.freeze([
  ...INPUT_KEYS,
  "graphVersion",
  "graphSpecDigest",
  "runnerRegistryDigest",
  "approvalDigest",
] as const);

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new TypeError(`${path} must be a plain JSON object`);
  }
  return value;
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  path: string,
): void {
  if (
    canonicalJson(Object.keys(value).sort()) !==
    canonicalJson([...expected].sort())
  ) {
    throw new TypeError(`${path} contains unsupported or missing fields`);
  }
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

function requireDigest(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new TypeError(`${path} must be a lowercase SHA-256 digest`);
  }
  return value;
}

function requireIsoTimestamp(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new TypeError(`${path} must be a canonical ISO-8601 UTC timestamp`);
  }
  return value;
}

function freezeJson<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      freezeJson(child);
    }
    Object.freeze(value);
  }
  return value;
}

function canonicalClone<T>(value: T): Readonly<T> {
  assertJsonSerializable(value);
  return freezeJson(JSON.parse(canonicalJson(value)) as T);
}

function parsePreviousProduction(
  input: unknown,
): Readonly<PreviousProductionBinding> {
  const record = requireRecord(input, "approval.previousProductionBinding");
  assertExactKeys(
    record,
    ["deploymentId", "candidateSha"],
    "approval.previousProductionBinding",
  );
  return Object.freeze({
    deploymentId: requireIdentifier(
      record.deploymentId,
      "approval.previousProductionBinding.deploymentId",
    ),
    candidateSha: requireGitObjectId(
      record.candidateSha,
      "approval.previousProductionBinding.candidateSha",
    ),
  });
}

function parseInput(
  record: Record<string, unknown>,
): Readonly<ApprovalEnvelopeInput> {
  if (record.rollbackAuthorization !== true) {
    throw new TypeError("approval.rollbackAuthorization must equal true");
  }
  return canonicalClone({
    runId: requireIdentifier(record.runId, "approval.runId"),
    candidateSha: requireGitObjectId(
      record.candidateSha,
      "approval.candidateSha",
    ),
    candidateTreeSha: requireGitObjectId(
      record.candidateTreeSha,
      "approval.candidateTreeSha",
    ),
    previewDeploymentId: requireIdentifier(
      record.previewDeploymentId,
      "approval.previewDeploymentId",
    ),
    previewEvidenceDigest: requireDigest(
      record.previewEvidenceDigest,
      "approval.previewEvidenceDigest",
    ),
    requiredChecksDigest: requireDigest(
      record.requiredChecksDigest,
      "approval.requiredChecksDigest",
    ),
    changedPathPolicyDigest: requireDigest(
      record.changedPathPolicyDigest,
      "approval.changedPathPolicyDigest",
    ),
    schemaSourcePlanDigest: requireDigest(
      record.schemaSourcePlanDigest,
      "approval.schemaSourcePlanDigest",
    ),
    previousProductionBinding: parsePreviousProduction(
      record.previousProductionBinding,
    ),
    approvalExpiresAt: requireIsoTimestamp(
      record.approvalExpiresAt,
      "approval.approvalExpiresAt",
    ),
    rollbackAuthorization: true as const,
  }) as Readonly<ApprovalEnvelopeInput>;
}

function bodyFrom(input: Readonly<ApprovalEnvelopeInput>): ApprovalEnvelopeBody {
  return {
    ...input,
    graphVersion: GRAPHOPS_GRAPH_VERSION,
    graphSpecDigest: getGraphSpecDigest(),
    runnerRegistryDigest: getRunnerRegistryDigest(),
  };
}

export function createPreviewPilotApprovalEnvelope(
  input: ApprovalEnvelopeInput | unknown,
): Readonly<ApprovalEnvelope> {
  assertJsonSerializable(input, "approvalInput");
  const record = requireRecord(input, "approvalInput");
  assertExactKeys(record, INPUT_KEYS, "approvalInput");
  const body = bodyFrom(parseInput(record));
  return canonicalClone({
    ...body,
    approvalDigest: sha256Digest(body),
  }) as Readonly<ApprovalEnvelope>;
}

export function verifyApprovalEnvelope(input: unknown): Readonly<ApprovalEnvelope> {
  assertJsonSerializable(input, "approvalEnvelope");
  const record = requireRecord(input, "approvalEnvelope");
  assertExactKeys(record, ENVELOPE_KEYS, "approvalEnvelope");
  if (
    record.graphVersion !== GRAPHOPS_GRAPH_VERSION ||
    record.graphSpecDigest !== getGraphSpecDigest() ||
    record.runnerRegistryDigest !== getRunnerRegistryDigest()
  ) {
    throw new TypeError(
      "approvalEnvelope graphSpecDigest or registry binding drifted",
    );
  }
  const selected = Object.fromEntries(
    INPUT_KEYS.map((key) => [key, record[key]]),
  );
  const body = bodyFrom(parseInput(selected));
  const approvalDigest = requireDigest(
    record.approvalDigest,
    "approval.approvalDigest",
  );
  if (sha256Digest(body) !== approvalDigest) {
    throw new TypeError("approvalEnvelope approvalDigest mismatch");
  }
  return canonicalClone({ ...body, approvalDigest }) as Readonly<ApprovalEnvelope>;
}
