import assert from "node:assert/strict";
import test from "node:test";

import {
  GRAPHOPS_POSTGRES_QUERIES,
  GRAPHOPS_POSTGRES_EVENT_SCHEMA_VERSION,
  GRAPHOPS_POSTGRES_SETUP_SQL,
  GRAPHOPS_POSTGRES_SCHEMA_VERSION,
  GRAPHOPS_CHECKPOINT_SCHEMA,
  GRAPHOPS_GRAPH_ID,
  GRAPHOPS_RUNNER_REGISTRY_VERSION,
  createAcquireLeaseStatement,
  createAppendEventStatement,
  createReleaseLeaseStatement,
  getGraphSpecDigest,
  getRunnerRegistryDigest,
  sha256Digest,
} from "./index";

const LEASE_BINDING = Object.freeze({
  holderId: "worker-a10",
  leaseTokenDigest: "4".repeat(64),
  fencingToken: 1,
});
const SUBJECT_DIGEST = "6".repeat(64);
const EVENT_STATE_BINDING = Object.freeze({
  candidateSha: "c".repeat(40),
  candidateTreeSha: "d".repeat(40),
  outcome: "PASS" as const,
  lifecycleState: "VALIDATING" as const,
  evidenceLevel: "E0" as const,
});

test("defines a separate append-only event ledger and fenced mutable lease schema", () => {
  assert.equal(
    GRAPHOPS_POSTGRES_SCHEMA_VERSION,
    "mais-graphops-postgres-ledger.v1",
  );
  assert.equal(GRAPHOPS_CHECKPOINT_SCHEMA, "langgraph_checkpoint");
  assert.equal(
    GRAPHOPS_POSTGRES_EVENT_SCHEMA_VERSION,
    "mais-graphops-postgres-event.v1",
  );
  assert.match(
    GRAPHOPS_POSTGRES_SETUP_SQL,
    /CREATE SCHEMA IF NOT EXISTS mais_graphops/i,
  );
  assert.match(
    GRAPHOPS_POSTGRES_SETUP_SQL,
    /CREATE TABLE IF NOT EXISTS mais_graphops\.graphops_event/i,
  );
  assert.match(
    GRAPHOPS_POSTGRES_SETUP_SQL,
    /BEFORE UPDATE OR DELETE ON mais_graphops\.graphops_event/i,
  );
  assert.match(GRAPHOPS_POSTGRES_SETUP_SQL, /RAISE EXCEPTION/i);
  assert.match(
    GRAPHOPS_POSTGRES_SETUP_SQL,
    /CREATE TABLE IF NOT EXISTS mais_graphops\.graphops_run_lease/i,
  );
  assert.match(GRAPHOPS_POSTGRES_SETUP_SQL, /event_schema_version text NOT NULL/i);
  assert.match(GRAPHOPS_POSTGRES_SETUP_SQL, /ledger_schema_version text NOT NULL/i);
  assert.match(GRAPHOPS_POSTGRES_SETUP_SQL, /registry_version text NOT NULL/i);
  assert.match(GRAPHOPS_POSTGRES_SETUP_SQL, /subject_digest text NOT NULL/i);
  assert.match(GRAPHOPS_POSTGRES_SETUP_SQL, /candidate_sha text NOT NULL/i);
  assert.match(GRAPHOPS_POSTGRES_SETUP_SQL, /candidate_tree_sha text NOT NULL/i);
  assert.match(GRAPHOPS_POSTGRES_SETUP_SQL, /outcome text NULL/i);
  assert.match(GRAPHOPS_POSTGRES_SETUP_SQL, /lifecycle_state text NOT NULL/i);
  assert.match(GRAPHOPS_POSTGRES_SETUP_SQL, /evidence_level text NOT NULL/i);
  assert.doesNotMatch(GRAPHOPS_POSTGRES_SETUP_SQL, /payload jsonb/i);
  assert.match(
    GRAPHOPS_POSTGRES_SETUP_SQL,
    /graph_id text NOT NULL CHECK \(graph_id = 'mais\.release\.v1'\)/i,
  );
  assert.ok(
    GRAPHOPS_POSTGRES_SETUP_SQL.includes(
      `graph_spec_digest text NOT NULL CHECK (graph_spec_digest = '${getGraphSpecDigest()}')`,
    ),
  );
  assert.ok(
    GRAPHOPS_POSTGRES_SETUP_SQL.includes(
      `runner_registry_digest text NOT NULL CHECK (runner_registry_digest = '${getRunnerRegistryDigest()}')`,
    ),
  );
  assert.doesNotMatch(GRAPHOPS_POSTGRES_SETUP_SQL, /PostgresSaver/i);
  assert.doesNotMatch(
    GRAPHOPS_POSTGRES_SETUP_SQL,
    /CREATE SCHEMA[^;]*langgraph_checkpoint/i,
  );
});

test("builds only fixed parameterized event and lease statements with deterministic event digests", () => {
  const eventInput = {
    graphId: GRAPHOPS_GRAPH_ID,
    runId: "run-ledger-001",
    sequence: 1,
    eventKind: "receipt-recorded" as const,
    runnerId: "git.bind-protected-main" as const,
    manifestDigest: "3".repeat(64),
    previousEventDigest: null,
    subjectDigest: SUBJECT_DIGEST,
    ...EVENT_STATE_BINDING,
    ...LEASE_BINDING,
  };
  const first = createAppendEventStatement(eventInput);
  const replay = createAppendEventStatement({
    ...LEASE_BINDING,
    ...EVENT_STATE_BINDING,
    subjectDigest: SUBJECT_DIGEST,
    previousEventDigest: null,
    manifestDigest: "3".repeat(64),
    runnerId: "git.bind-protected-main",
    eventKind: "receipt-recorded",
    sequence: 1,
    runId: "run-ledger-001",
    graphId: GRAPHOPS_GRAPH_ID,
  });

  assert.equal(first.text, GRAPHOPS_POSTGRES_QUERIES.appendEvent);
  assert.equal(first.event.eventDigest, replay.event.eventDigest);
  assert.equal(first.event.schemaVersion, GRAPHOPS_POSTGRES_EVENT_SCHEMA_VERSION);
  assert.equal(first.event.ledgerSchemaVersion, GRAPHOPS_POSTGRES_SCHEMA_VERSION);
  assert.equal(first.event.registryVersion, GRAPHOPS_RUNNER_REGISTRY_VERSION);
  assert.equal(first.event.graphId, GRAPHOPS_GRAPH_ID);
  assert.equal(first.event.graphSpecDigest, getGraphSpecDigest());
  assert.equal(first.event.runnerRegistryDigest, getRunnerRegistryDigest());
  assert.equal(first.event.fencingToken, 1);
  assert.equal(first.values[0], GRAPHOPS_POSTGRES_EVENT_SCHEMA_VERSION);
  assert.equal(first.values[1], GRAPHOPS_POSTGRES_SCHEMA_VERSION);
  assert.equal(first.values[2], GRAPHOPS_RUNNER_REGISTRY_VERSION);
  assert.equal(first.values[3], getGraphSpecDigest());
  assert.equal(first.values[4], getRunnerRegistryDigest());
  assert.equal(first.event.candidateSha, EVENT_STATE_BINDING.candidateSha);
  assert.equal(first.event.candidateTreeSha, EVENT_STATE_BINDING.candidateTreeSha);
  assert.equal(first.event.outcome, "PASS");
  assert.equal(first.event.lifecycleState, "VALIDATING");
  assert.equal(first.event.evidenceLevel, "E0");
  assert.equal(first.values[17], first.event.eventDigest);
  assert.equal(first.values[18], SUBJECT_DIGEST);
  assert.equal(first.values[19], LEASE_BINDING.holderId);
  assert.equal(first.values[20], LEASE_BINDING.leaseTokenDigest);
  assert.equal(first.values[21], LEASE_BINDING.fencingToken);
  const { eventDigest, ...eventBody } = first.event;
  assert.equal(eventDigest, sha256Digest(eventBody));
  assert.match(first.text, /INSERT INTO mais_graphops\.graphops_event/i);
  assert.match(first.text, /holder_id = \$20::text/i);
  assert.match(first.text, /lease_token_digest = \$21::text/i);
  assert.match(first.text, /fencing_token = \$22::bigint/i);
  assert.match(first.text, /expires_at > clock_timestamp\(\)/i);

  const lease = createAcquireLeaseStatement({
    graphId: GRAPHOPS_GRAPH_ID,
    runId: "run-ledger-001",
    holderId: "worker-a10",
    leaseTokenDigest: "4".repeat(64),
    ttlSeconds: 60,
  });
  assert.equal(lease.text, GRAPHOPS_POSTGRES_QUERIES.acquireLease);
  assert.deepEqual(lease.values, [
    GRAPHOPS_GRAPH_ID,
    "run-ledger-001",
    "worker-a10",
    "4".repeat(64),
    60,
  ]);
  assert.match(lease.text, /fencing_token \+ 1/i);
  assert.ok(!lease.text.includes("worker-a10"));
  assert.match(lease.text, /mais_graphops\.graphops_run_lease/i);
});

test("releases a lease without deleting its monotonic fencing counter", () => {
  const release = createReleaseLeaseStatement({
    graphId: GRAPHOPS_GRAPH_ID,
    runId: "run-ledger-001",
    holderId: "worker-a10",
    leaseTokenDigest: "4".repeat(64),
    fencingToken: 7,
  });

  assert.equal(release.text, GRAPHOPS_POSTGRES_QUERIES.releaseLease);
  assert.match(release.text, /^UPDATE mais_graphops\.graphops_run_lease/i);
  assert.match(release.text, /SET expires_at = clock_timestamp\(\)/i);
  assert.doesNotMatch(release.text, /DELETE FROM/i);
  assert.match(GRAPHOPS_POSTGRES_QUERIES.acquireLease, /fencing_token \+ 1/i);
  assert.deepEqual(release.values, [
    GRAPHOPS_GRAPH_ID,
    "run-ledger-001",
    "worker-a10",
    "4".repeat(64),
    7,
  ]);
});

test("makes a cross-manifest chain miss its digest-bound predecessor", () => {
  const first = createAppendEventStatement({
    graphId: GRAPHOPS_GRAPH_ID,
    runId: "run-ledger-chain",
    sequence: 1,
    eventKind: "receipt-recorded",
    runnerId: "git.bind-protected-main",
    manifestDigest: "4".repeat(64),
    previousEventDigest: null,
    subjectDigest: SUBJECT_DIGEST,
    ...EVENT_STATE_BINDING,
    ...LEASE_BINDING,
  });
  const switchedManifest = createAppendEventStatement({
    graphId: GRAPHOPS_GRAPH_ID,
    runId: "run-ledger-chain",
    sequence: 2,
    eventKind: "receipt-recorded",
    runnerId: "release.owner-currentness",
    manifestDigest: "5".repeat(64),
    previousEventDigest: first.event.eventDigest,
    subjectDigest: SUBJECT_DIGEST,
    ...EVENT_STATE_BINDING,
    ...LEASE_BINDING,
  });

  assert.notEqual(
    first.event.manifestDigest,
    switchedManifest.event.manifestDigest,
  );
  assert.equal(switchedManifest.values[15], "5".repeat(64));
  assert.equal(switchedManifest.values[16], first.event.eventDigest);
  assert.match(switchedManifest.text, /sequence = \$8::bigint - 1/i);
  assert.match(switchedManifest.text, /graph_spec_digest = \$4::text/i);
  assert.match(switchedManifest.text, /runner_registry_digest = \$5::text/i);
  assert.match(switchedManifest.text, /candidate_sha = \$11::text/i);
  assert.match(switchedManifest.text, /candidate_tree_sha = \$12::text/i);
  assert.match(switchedManifest.text, /manifest_digest = \$16::text/i);
  assert.match(switchedManifest.text, /event_digest = \$17::text/i);
});

test("rejects arbitrary graph identities before building ledger or lease statements", () => {
  assert.throws(
    () =>
      createAppendEventStatement({
        graphId: "other.release.v1",
        runId: "run-ledger-other",
        sequence: 1,
        eventKind: "receipt-recorded",
        runnerId: "git.bind-protected-main",
        manifestDigest: "3".repeat(64),
        previousEventDigest: null,
        subjectDigest: SUBJECT_DIGEST,
        ...EVENT_STATE_BINDING,
        ...LEASE_BINDING,
      }),
    /graphId.*fixed.*mais\.release\.v1/i,
  );
  assert.throws(
    () =>
      createAcquireLeaseStatement({
        graphId: "other.release.v1",
        runId: "run-ledger-other",
        holderId: "worker-a10",
        leaseTokenDigest: "4".repeat(64),
        ttlSeconds: 60,
      }),
    /graphId.*fixed.*mais\.release\.v1/i,
  );
});

test("rejects untyped or contradictory event state metadata", () => {
  const base = {
    graphId: GRAPHOPS_GRAPH_ID,
    runId: "run-ledger-state-contract",
    sequence: 1,
    eventKind: "receipt-recorded" as const,
    runnerId: "git.bind-protected-main" as const,
    manifestDigest: "3".repeat(64),
    previousEventDigest: null,
    subjectDigest: SUBJECT_DIGEST,
    ...EVENT_STATE_BINDING,
    ...LEASE_BINDING,
  };

  for (const patch of [
    { outcome: null },
    { runnerId: null },
    { lifecycleState: "NOT_A_STATE" },
    { evidenceLevel: "E9" },
    { candidateSha: "short" },
    { candidateTreeSha: "D".repeat(40) },
  ]) {
    assert.throws(
      () => createAppendEventStatement({ ...base, ...patch }),
      /inconsistent|not registered|Git object id/i,
      JSON.stringify(patch),
    );
  }

  assert.throws(
    () =>
      createAppendEventStatement({
        ...base,
        eventKind: "approval-requested",
        runnerId: null,
        outcome: "PASS",
      }),
    /inconsistent/i,
  );
});

test("rejects arbitrary ledger payload fields instead of storing executable or prose bodies", () => {
  for (const field of ["command", "shell", "env", "rawSql", "targetUrl", "provider", "deployArgs", "networkEndpoint"]) {
    assert.throws(
      () =>
        createAppendEventStatement({
          graphId: "mais.release.v1",
          runId: "run-ledger-data-only",
          sequence: 1,
          eventKind: "receipt-recorded",
          runnerId: "git.bind-protected-main",
          manifestDigest: "3".repeat(64),
          previousEventDigest: null,
          subjectDigest: SUBJECT_DIGEST,
          ...EVENT_STATE_BINDING,
          payload: { nested: { [field]: "blocked" } },
          ...LEASE_BINDING,
        }),
      /unsupported or missing fields/i,
      field,
    );
  }
});

test("stores only a typed subject digest and rejects secret or PII event bodies", () => {
  const fakeProviderToken = [
    "github",
    "_pat_",
    "1234567890abcdefghijklmnopqrstuvwxyz",
  ].join("");
  const fakeDatabaseUrl = [
    "postgres",
    "ql://runner:fixture-password@db.invalid/graphops",
  ].join("");
  const eventInput = {
    graphId: GRAPHOPS_GRAPH_ID,
    runId: "run-ledger-sanitized",
    sequence: 1,
    eventKind: "receipt-recorded",
    runnerId: "git.bind-protected-main",
    manifestDigest: "3".repeat(64),
    previousEventDigest: null,
    subjectDigest: SUBJECT_DIGEST,
    ...EVENT_STATE_BINDING,
    ...LEASE_BINDING,
  } as const;
  assert.throws(
    () =>
      createAppendEventStatement({
        ...eventInput,
        payload: {
          message: `${fakeProviderToken} ${fakeDatabaseUrl}`,
          identity: "Jane Student completed Algebra",
        },
      }),
    /unsupported or missing fields/i,
  );
  const statement = createAppendEventStatement(eventInput);
  const serialized = JSON.stringify({
    event: statement.event,
    values: statement.values,
  });

  assert.equal(serialized.includes(fakeProviderToken), false);
  assert.equal(serialized.includes(fakeDatabaseUrl), false);
  assert.equal(serialized.includes("Jane Student"), false);
  assert.equal(statement.event.subjectDigest, SUBJECT_DIGEST);
});
