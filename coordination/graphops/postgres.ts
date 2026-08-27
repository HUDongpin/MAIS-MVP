import { sha256Digest } from "./json";
import {
  GRAPHOPS_GRAPH_ID,
  getGraphSpecDigest,
  getRunnerRegistryDigest,
} from "./definition";
import {
  EVIDENCE_LEVELS,
  GRAPHOPS_RUNNER_IDS,
  GRAPHOPS_RUNNER_REGISTRY_VERSION,
  LIFECYCLE_STATES,
  NODE_OUTCOMES,
  type EvidenceLevel,
  type GraphOpsRunnerId,
  type LifecycleState,
  type NodeOutcome,
} from "./registry";

export const GRAPHOPS_POSTGRES_SCHEMA_VERSION =
  "mais-graphops-postgres-ledger.v1" as const;
export const GRAPHOPS_POSTGRES_EVENT_SCHEMA_VERSION =
  "mais-graphops-postgres-event.v1" as const;
export const GRAPHOPS_CHECKPOINT_SCHEMA = "langgraph_checkpoint" as const;

const FIXED_GRAPH_SPEC_DIGEST = getGraphSpecDigest();
const FIXED_RUNNER_REGISTRY_DIGEST = getRunnerRegistryDigest();

/**
 * Setup-only DDL. It is never executed by this package.
 *
 * LangGraph checkpoints belong to the separate `langgraph_checkpoint`
 * namespace and are intentionally absent from this event-ledger DDL.
 */
export const GRAPHOPS_POSTGRES_SETUP_SQL = String.raw`
CREATE SCHEMA IF NOT EXISTS mais_graphops;

CREATE TABLE IF NOT EXISTS mais_graphops.graphops_event (
  event_schema_version text NOT NULL CHECK (
    event_schema_version = 'mais-graphops-postgres-event.v1'
  ),
  ledger_schema_version text NOT NULL CHECK (
    ledger_schema_version = 'mais-graphops-postgres-ledger.v1'
  ),
  registry_version text NOT NULL CHECK (
    registry_version = 'mais-graphops-runner-registry.v1'
  ),
  graph_spec_digest text NOT NULL CHECK (graph_spec_digest = '${FIXED_GRAPH_SPEC_DIGEST}'),
  runner_registry_digest text NOT NULL CHECK (runner_registry_digest = '${FIXED_RUNNER_REGISTRY_DIGEST}'),
  graph_id text NOT NULL CHECK (graph_id = '${GRAPHOPS_GRAPH_ID}'),
  run_id text NOT NULL,
  sequence bigint NOT NULL CHECK (sequence > 0),
  event_kind text NOT NULL CHECK (event_kind IN (
    'receipt-recorded',
    'approval-requested',
    'approval-resumed',
    'run-blocked',
    'run-closed',
    'lease-fenced'
  )),
  runner_id text NULL CHECK (runner_id IS NULL OR runner_id IN (
    'git.bind-protected-main',
    'release.owner-currentness',
    'github.required-checks',
    'release.build-gate',
    'vercel.prepare-staging',
    'vercel.deploy-preview',
    'vercel.inspect-preview',
    'smoke.preview-readonly',
    'github.verify-production-approval',
    'schema.production-preflight',
    'schema.production-apply',
    'vercel.deploy-production-candidate',
    'vercel.verify-production-candidate',
    'vercel.promote',
    'smoke.production-readonly',
    'vercel.restore-previous',
    'release.closeout'
  )),
  candidate_sha text NOT NULL CHECK (candidate_sha ~ '^[0-9a-f]{40}$'),
  candidate_tree_sha text NOT NULL CHECK (candidate_tree_sha ~ '^[0-9a-f]{40}$'),
  outcome text NULL CHECK (outcome IS NULL OR outcome IN (
    'PASS',
    'BLOCKED',
    'REPAIR_REQUIRED',
    'REJECTED',
    'INCONCLUSIVE',
    'ROLLED_BACK',
    'CANCELLED',
    'FAILED_INTERNAL'
  )),
  lifecycle_state text NOT NULL CHECK (lifecycle_state IN (
    'PLANNED',
    'VALIDATING',
    'PREVIEW_DEPLOYED',
    'PREVIEW_VERIFIED',
    'AWAITING_PRODUCTION_APPROVAL',
    'PRODUCTION_APPROVED',
    'SCHEMA_APPLIED',
    'PRODUCTION_CANDIDATE_VERIFIED',
    'PROMOTED',
    'LIVE_VERIFIED',
    'CLOSED',
    'BLOCKED',
    'REPAIR_REQUIRED',
    'REJECTED',
    'INCONCLUSIVE',
    'ROLLED_BACK',
    'CANCELLED',
    'FAILED_INTERNAL'
  )),
  evidence_level text NOT NULL CHECK (evidence_level IN (
    'E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7'
  )),
  lease_fencing_token bigint NOT NULL CHECK (lease_fencing_token > 0),
  manifest_digest text NOT NULL CHECK (manifest_digest ~ '^[0-9a-f]{64}$'),
  previous_event_digest text NULL CHECK (
    previous_event_digest IS NULL OR previous_event_digest ~ '^[0-9a-f]{64}$'
  ),
  event_digest text NOT NULL UNIQUE CHECK (event_digest ~ '^[0-9a-f]{64}$'),
  subject_digest text NOT NULL CHECK (subject_digest ~ '^[0-9a-f]{64}$'),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (graph_id, run_id, sequence),
  CHECK (
    (sequence = 1 AND previous_event_digest IS NULL) OR
    (sequence > 1 AND previous_event_digest IS NOT NULL)
  ),
  CHECK (
    (
      event_kind = 'receipt-recorded'
      AND runner_id IS NOT NULL
      AND outcome IS NOT NULL
    ) OR (
      event_kind = 'run-blocked'
      AND outcome IN (
        'BLOCKED',
        'REPAIR_REQUIRED',
        'REJECTED',
        'INCONCLUSIVE',
        'CANCELLED',
        'FAILED_INTERNAL'
      )
    ) OR (
      event_kind NOT IN ('receipt-recorded', 'run-blocked')
      AND outcome IS NULL
    )
  )
);

CREATE OR REPLACE FUNCTION mais_graphops.graphops_reject_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'graphops_event is append-only';
END;
$$;

DROP TRIGGER IF EXISTS graphops_event_reject_update_delete ON mais_graphops.graphops_event;
CREATE TRIGGER graphops_event_reject_update_delete
BEFORE UPDATE OR DELETE ON mais_graphops.graphops_event
FOR EACH ROW EXECUTE FUNCTION mais_graphops.graphops_reject_event_mutation();

DROP TRIGGER IF EXISTS graphops_event_reject_truncate ON mais_graphops.graphops_event;
CREATE TRIGGER graphops_event_reject_truncate
BEFORE TRUNCATE ON mais_graphops.graphops_event
FOR EACH STATEMENT EXECUTE FUNCTION mais_graphops.graphops_reject_event_mutation();

CREATE TABLE IF NOT EXISTS mais_graphops.graphops_run_lease (
  graph_id text NOT NULL CHECK (graph_id = '${GRAPHOPS_GRAPH_ID}'),
  run_id text NOT NULL,
  holder_id text NOT NULL,
  lease_token_digest text NOT NULL CHECK (lease_token_digest ~ '^[0-9a-f]{64}$'),
  fencing_token bigint NOT NULL CHECK (fencing_token > 0),
  acquired_at timestamptz NOT NULL,
  heartbeat_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (graph_id, run_id),
  CHECK (heartbeat_at >= acquired_at),
  CHECK (expires_at >= heartbeat_at)
);
`.trim();

export const GRAPHOPS_POSTGRES_QUERIES = Object.freeze({
  appendEvent: String.raw`
INSERT INTO mais_graphops.graphops_event (
  event_schema_version,
  ledger_schema_version,
  registry_version,
  graph_spec_digest,
  runner_registry_digest,
  graph_id,
  run_id,
  sequence,
  event_kind,
  runner_id,
  candidate_sha,
  candidate_tree_sha,
  outcome,
  lifecycle_state,
  evidence_level,
  lease_fencing_token,
  manifest_digest,
  previous_event_digest,
  event_digest,
  subject_digest
)
SELECT
  $1::text,
  $2::text,
  $3::text,
  $4::text,
  $5::text,
  $6::text,
  $7::text,
  $8::bigint,
  $9::text,
  $10::text,
  $11::text,
  $12::text,
  $13::text,
  $14::text,
  $15::text,
  $22::bigint,
  $16::text,
  $17::text,
  $18::text,
  $19::text
WHERE (
  (
    $8::bigint = 1
    AND $17::text IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM mais_graphops.graphops_event
      WHERE graph_id = $6::text AND run_id = $7::text
    )
  )
  OR
  (
    $8::bigint > 1
    AND EXISTS (
      SELECT 1 FROM mais_graphops.graphops_event
      WHERE graph_id = $6::text
        AND run_id = $7::text
        AND sequence = $8::bigint - 1
        AND graph_spec_digest = $4::text
        AND runner_registry_digest = $5::text
        AND candidate_sha = $11::text
        AND candidate_tree_sha = $12::text
        AND manifest_digest = $16::text
        AND event_digest = $17::text
    )
  )
)
AND EXISTS (
  SELECT 1 FROM mais_graphops.graphops_run_lease
  WHERE graph_id = $6::text
    AND run_id = $7::text
    AND holder_id = $20::text
    AND lease_token_digest = $21::text
    AND fencing_token = $22::bigint
    AND expires_at > clock_timestamp()
)
ON CONFLICT DO NOTHING
RETURNING graph_id, run_id, sequence, event_digest, recorded_at;
`.trim(),
  acquireLease: String.raw`
INSERT INTO mais_graphops.graphops_run_lease AS current_lease (
  graph_id,
  run_id,
  holder_id,
  lease_token_digest,
  fencing_token,
  acquired_at,
  heartbeat_at,
  expires_at
)
VALUES (
  $1::text,
  $2::text,
  $3::text,
  $4::text,
  1,
  clock_timestamp(),
  clock_timestamp(),
  clock_timestamp() + ($5::integer * interval '1 second')
)
ON CONFLICT (graph_id, run_id) DO UPDATE
SET holder_id = EXCLUDED.holder_id,
    lease_token_digest = EXCLUDED.lease_token_digest,
    fencing_token = current_lease.fencing_token + 1,
    acquired_at = clock_timestamp(),
    heartbeat_at = clock_timestamp(),
    expires_at = clock_timestamp() + ($5::integer * interval '1 second')
WHERE current_lease.expires_at <= clock_timestamp()
RETURNING graph_id, run_id, holder_id, lease_token_digest, fencing_token, expires_at;
`.trim(),
  renewLease: String.raw`
UPDATE mais_graphops.graphops_run_lease
SET heartbeat_at = clock_timestamp(),
    expires_at = clock_timestamp() + ($6::integer * interval '1 second')
WHERE graph_id = $1::text
  AND run_id = $2::text
  AND holder_id = $3::text
  AND lease_token_digest = $4::text
  AND fencing_token = $5::bigint
  AND expires_at > clock_timestamp()
RETURNING graph_id, run_id, holder_id, fencing_token, expires_at;
`.trim(),
  releaseLease: String.raw`
UPDATE mais_graphops.graphops_run_lease
SET expires_at = clock_timestamp()
WHERE graph_id = $1::text
  AND run_id = $2::text
  AND holder_id = $3::text
  AND lease_token_digest = $4::text
  AND fencing_token = $5::bigint
RETURNING graph_id, run_id, holder_id, fencing_token;
`.trim(),
});

export type GraphOpsEventKind =
  | "receipt-recorded"
  | "approval-requested"
  | "approval-resumed"
  | "run-blocked"
  | "run-closed"
  | "lease-fenced";

export interface AppendEventInput {
  readonly graphId: typeof GRAPHOPS_GRAPH_ID;
  readonly runId: string;
  readonly sequence: number;
  readonly eventKind: GraphOpsEventKind;
  readonly runnerId: GraphOpsRunnerId | null;
  readonly candidateSha: string;
  readonly candidateTreeSha: string;
  readonly outcome: NodeOutcome | null;
  readonly lifecycleState: LifecycleState;
  readonly evidenceLevel: EvidenceLevel;
  readonly manifestDigest: string;
  readonly previousEventDigest: string | null;
  readonly subjectDigest: string;
  readonly holderId: string;
  readonly leaseTokenDigest: string;
  readonly fencingToken: number;
}

export interface GraphOpsLedgerEvent {
  readonly schemaVersion: typeof GRAPHOPS_POSTGRES_EVENT_SCHEMA_VERSION;
  readonly ledgerSchemaVersion: typeof GRAPHOPS_POSTGRES_SCHEMA_VERSION;
  readonly registryVersion: typeof GRAPHOPS_RUNNER_REGISTRY_VERSION;
  readonly graphSpecDigest: string;
  readonly runnerRegistryDigest: string;
  readonly graphId: typeof GRAPHOPS_GRAPH_ID;
  readonly runId: string;
  readonly sequence: number;
  readonly eventKind: GraphOpsEventKind;
  readonly runnerId: GraphOpsRunnerId | null;
  readonly candidateSha: string;
  readonly candidateTreeSha: string;
  readonly outcome: NodeOutcome | null;
  readonly lifecycleState: LifecycleState;
  readonly evidenceLevel: EvidenceLevel;
  readonly fencingToken: number;
  readonly manifestDigest: string;
  readonly previousEventDigest: string | null;
  readonly subjectDigest: string;
  readonly eventDigest: string;
}

export interface SqlStatement<TEvent = undefined> {
  readonly text: string;
  readonly values: readonly unknown[];
  readonly event: TEvent;
}

interface LeaseIdentity {
  readonly graphId: typeof GRAPHOPS_GRAPH_ID;
  readonly runId: string;
  readonly holderId: string;
  readonly leaseTokenDigest: string;
}

export interface AcquireLeaseInput extends LeaseIdentity {
  readonly ttlSeconds: number;
}

export interface FencedLeaseInput extends AcquireLeaseInput {
  readonly fencingToken: number;
}

function requirePlainRecord(
  value: unknown,
  path: string,
): Record<string, unknown> {
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
  input: Record<string, unknown>,
  expected: readonly string[],
  path: string,
): void {
  const actual = Object.keys(input).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
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

function requireFixedGraphId(
  value: unknown,
  path: string,
): typeof GRAPHOPS_GRAPH_ID {
  const graphId = requireIdentifier(value, path);
  if (graphId !== GRAPHOPS_GRAPH_ID) {
    throw new TypeError(`${path} must be the fixed ${GRAPHOPS_GRAPH_ID} graph`);
  }
  return GRAPHOPS_GRAPH_ID;
}

function requireDigest(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new TypeError(`${path} must be a lowercase SHA-256 digest`);
  }
  return value;
}

function requireGitObjectId(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/.test(value)) {
    throw new TypeError(`${path} must be a lowercase 40-character Git object id`);
  }
  return value;
}

function requireOutcome(value: unknown): NodeOutcome | null {
  if (value === null) {
    return null;
  }
  if (
    typeof value !== "string" ||
    !NODE_OUTCOMES.includes(value as NodeOutcome)
  ) {
    throw new TypeError("outcome is not registered");
  }
  return value as NodeOutcome;
}

function requireLifecycleState(value: unknown): LifecycleState {
  if (
    typeof value !== "string" ||
    !LIFECYCLE_STATES.includes(value as LifecycleState)
  ) {
    throw new TypeError("lifecycleState is not registered");
  }
  return value as LifecycleState;
}

function requireEvidenceLevel(value: unknown): EvidenceLevel {
  if (
    typeof value !== "string" ||
    !EVIDENCE_LEVELS.includes(value as EvidenceLevel)
  ) {
    throw new TypeError("evidenceLevel is not registered");
  }
  return value as EvidenceLevel;
}

function requireNullableDigest(value: unknown, path: string): string | null {
  return value === null ? null : requireDigest(value, path);
}

function requirePositiveInteger(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new TypeError(`${path} must be a positive safe integer`);
  }
  return value as number;
}

function requireTtl(value: unknown): number {
  const ttl = requirePositiveInteger(value, "ttlSeconds");
  if (ttl > 3_600) {
    throw new TypeError("ttlSeconds must not exceed 3600");
  }
  return ttl;
}

function parseLeaseIdentity(
  record: Record<string, unknown>,
): Readonly<LeaseIdentity> {
  return Object.freeze({
    graphId: requireFixedGraphId(record.graphId, "graphId"),
    runId: requireIdentifier(record.runId, "runId"),
    holderId: requireIdentifier(record.holderId, "holderId"),
    leaseTokenDigest: requireDigest(
      record.leaseTokenDigest,
      "leaseTokenDigest",
    ),
  });
}

function noEventStatement(text: string, values: readonly unknown[]) {
  return Object.freeze({ text, values: Object.freeze([...values]), event: undefined });
}

export function createAppendEventStatement(
  input: AppendEventInput | unknown,
): Readonly<SqlStatement<Readonly<GraphOpsLedgerEvent>>> {
  const record = requirePlainRecord(input, "appendEvent");
  assertExactKeys(
    record,
    [
      "graphId",
      "runId",
      "sequence",
      "eventKind",
      "runnerId",
      "candidateSha",
      "candidateTreeSha",
      "outcome",
      "lifecycleState",
      "evidenceLevel",
      "manifestDigest",
      "previousEventDigest",
      "subjectDigest",
      "holderId",
      "leaseTokenDigest",
      "fencingToken",
    ],
    "appendEvent",
  );
  const graphId = requireFixedGraphId(record.graphId, "graphId");
  const runId = requireIdentifier(record.runId, "runId");
  const lease = parseLeaseIdentity(record);
  const fencingToken = requirePositiveInteger(
    record.fencingToken,
    "fencingToken",
  );
  const sequence = requirePositiveInteger(record.sequence, "sequence");
  const eventKinds = new Set<GraphOpsEventKind>([
    "receipt-recorded",
    "approval-requested",
    "approval-resumed",
    "run-blocked",
    "run-closed",
    "lease-fenced",
  ]);
  if (
    typeof record.eventKind !== "string" ||
    !eventKinds.has(record.eventKind as GraphOpsEventKind)
  ) {
    throw new TypeError("eventKind is not registered");
  }
  const knownRunners = new Set<string>(GRAPHOPS_RUNNER_IDS);
  if (
    record.runnerId !== null &&
    (typeof record.runnerId !== "string" || !knownRunners.has(record.runnerId))
  ) {
    throw new TypeError("runnerId is not registered");
  }
  const candidateSha = requireGitObjectId(
    record.candidateSha,
    "candidateSha",
  );
  const candidateTreeSha = requireGitObjectId(
    record.candidateTreeSha,
    "candidateTreeSha",
  );
  const outcome = requireOutcome(record.outcome);
  const lifecycleState = requireLifecycleState(record.lifecycleState);
  const evidenceLevel = requireEvidenceLevel(record.evidenceLevel);
  if (
    (record.eventKind === "receipt-recorded" &&
      (record.runnerId === null || outcome === null)) ||
    (record.eventKind === "run-blocked" &&
      (outcome === null || outcome === "PASS" || outcome === "ROLLED_BACK")) ||
    (record.eventKind !== "receipt-recorded" &&
      record.eventKind !== "run-blocked" &&
      outcome !== null)
  ) {
    throw new TypeError("eventKind, runnerId, and outcome are inconsistent");
  }
  const manifestDigest = requireDigest(record.manifestDigest, "manifestDigest");
  const subjectDigest = requireDigest(record.subjectDigest, "subjectDigest");
  const previousEventDigest = requireNullableDigest(
    record.previousEventDigest,
    "previousEventDigest",
  );
  if (
    (sequence === 1 && previousEventDigest !== null) ||
    (sequence > 1 && previousEventDigest === null)
  ) {
    throw new TypeError("previousEventDigest does not match event sequence");
  }
  const body = Object.freeze({
    schemaVersion: GRAPHOPS_POSTGRES_EVENT_SCHEMA_VERSION,
    ledgerSchemaVersion: GRAPHOPS_POSTGRES_SCHEMA_VERSION,
    registryVersion: GRAPHOPS_RUNNER_REGISTRY_VERSION,
    graphSpecDigest: FIXED_GRAPH_SPEC_DIGEST,
    runnerRegistryDigest: FIXED_RUNNER_REGISTRY_DIGEST,
    graphId,
    runId,
    sequence,
    eventKind: record.eventKind as GraphOpsEventKind,
    runnerId: record.runnerId as GraphOpsRunnerId | null,
    candidateSha,
    candidateTreeSha,
    outcome,
    lifecycleState,
    evidenceLevel,
    fencingToken,
    manifestDigest,
    subjectDigest,
    previousEventDigest,
  });
  const event = Object.freeze({ ...body, eventDigest: sha256Digest(body) });
  return Object.freeze({
    text: GRAPHOPS_POSTGRES_QUERIES.appendEvent,
    values: Object.freeze([
      GRAPHOPS_POSTGRES_EVENT_SCHEMA_VERSION,
      GRAPHOPS_POSTGRES_SCHEMA_VERSION,
      GRAPHOPS_RUNNER_REGISTRY_VERSION,
      FIXED_GRAPH_SPEC_DIGEST,
      FIXED_RUNNER_REGISTRY_DIGEST,
      graphId,
      runId,
      sequence,
      body.eventKind,
      body.runnerId,
      candidateSha,
      candidateTreeSha,
      outcome,
      lifecycleState,
      evidenceLevel,
      manifestDigest,
      previousEventDigest,
      event.eventDigest,
      subjectDigest,
      lease.holderId,
      lease.leaseTokenDigest,
      fencingToken,
    ]),
    event,
  });
}

export function createAcquireLeaseStatement(
  input: AcquireLeaseInput | unknown,
): Readonly<SqlStatement> {
  const record = requirePlainRecord(input, "acquireLease");
  assertExactKeys(
    record,
    ["graphId", "runId", "holderId", "leaseTokenDigest", "ttlSeconds"],
    "acquireLease",
  );
  const lease = parseLeaseIdentity(record);
  return noEventStatement(GRAPHOPS_POSTGRES_QUERIES.acquireLease, [
    lease.graphId,
    lease.runId,
    lease.holderId,
    lease.leaseTokenDigest,
    requireTtl(record.ttlSeconds),
  ]);
}

export function createRenewLeaseStatement(
  input: FencedLeaseInput | unknown,
): Readonly<SqlStatement> {
  const record = requirePlainRecord(input, "renewLease");
  assertExactKeys(
    record,
    [
      "graphId",
      "runId",
      "holderId",
      "leaseTokenDigest",
      "fencingToken",
      "ttlSeconds",
    ],
    "renewLease",
  );
  const lease = parseLeaseIdentity(record);
  return noEventStatement(GRAPHOPS_POSTGRES_QUERIES.renewLease, [
    lease.graphId,
    lease.runId,
    lease.holderId,
    lease.leaseTokenDigest,
    requirePositiveInteger(record.fencingToken, "fencingToken"),
    requireTtl(record.ttlSeconds),
  ]);
}

export function createReleaseLeaseStatement(
  input: Omit<FencedLeaseInput, "ttlSeconds"> | unknown,
): Readonly<SqlStatement> {
  const record = requirePlainRecord(input, "releaseLease");
  assertExactKeys(
    record,
    ["graphId", "runId", "holderId", "leaseTokenDigest", "fencingToken"],
    "releaseLease",
  );
  const lease = parseLeaseIdentity(record);
  return noEventStatement(GRAPHOPS_POSTGRES_QUERIES.releaseLease, [
    lease.graphId,
    lease.runId,
    lease.holderId,
    lease.leaseTokenDigest,
    requirePositiveInteger(record.fencingToken, "fencingToken"),
  ]);
}
