# `app_state` write amplification and growth

**Lane:** A08 (shared app state semantics), with A22 for the release/verification path
**Status:** instrumentation landed; the SQL change below is proposed, NOT applied
**Date:** 2026-10-19

## Summary

All persistent application state lives in a single `app_state` row, in one `jsonb`
payload holding 81 entity collections. Every mutation takes an exclusive row lock on
it, reads the whole payload, mutates in JS, and writes the whole payload back.

Two separable problems follow, and they have very different costs to fix:

1. **Write amplification (cheap to fix, large win).** The write path sends the
   serialized payload to Postgres **three times per mutation and reads it back once** —
   roughly 4× the necessary bytes. This is a bounded change to one function and does
   not touch the storage architecture.
2. **The single-row architecture itself (expensive to fix).** Write cost scales with
   total accumulated history rather than with the size of the change, and every write
   in the system serializes on one lock. This is the strangler work in
   `Technical-Review/ENGINEERING-BACKLOG.md` (BK-07, BK-11, BK-12).

Problem 1 is worth doing first: it is a few lines, it is independent of problem 2, and
it attacks the symptom that has already been felt in production.

## Why this is not hypothetical

`postgres-quota` — matched from the provider message `"data transfer quota"` — is
already a named, first-class failure kind in the authentication hot path and in the
health check:

- `lib/server/authRouteGuards.ts` → `authFailureKind()`
- `lib/server/healthCheck.ts` → the failure set, and its own classifier

Code does not acquire a dedicated error class for "the database provider cut us off for
moving too much data" unless that has happened. Rewriting a large `jsonb` blob on every
request, four times over, is how a project reaches that state.

Corroborating signals in the repo: `app/api/warm/route.ts` exists because cold start
plus connection handshake was "a large part of the ~10s slow login reports", and
`scripts/classroom-load-smoke.mjs` plus BK-19 show that class-sized concurrency is
already a known worry.

## Problem 1 — the payload crosses the wire four times

In `writePostgresDatabaseWith` (`lib/server/userStore.ts`). postgres.js binds every
`${...}` interpolation as a **separate** parameter, so each occurrence below is its own
full copy of the serialized payload on the wire:

```ts
const payload = postgresDatabasePayload(database);

const stateRows = await sql`
  UPDATE public.app_state AS state
  SET
    revision = state.revision + 1,
    payload = ${sql.json(payload)}::pg_catalog.jsonb,   -- (1) upload: required
    updated_at = ${new Date().toISOString()}
  WHERE ...
    AND state.revision = ${storageCapability.previousRevision}
  RETURNING
    state.payload,                                      -- (2) DOWNLOAD of the whole blob
    state.revision,
    ...
    state.payload = ${sql.json(payload)}::pg_catalog.jsonb AS payload_matches,  -- (3) upload
    ...
`;

validateCompletePostgresStorageSnapshot(writtenState.payload);   -- consumes (2)

const finalStateRows = await sql`
  SELECT
    current_state.revision,
    current_state.payload = ${sql.json(payload)}::pg_catalog.jsonb AS payload_matches  -- (4) upload
  FROM public.app_state AS current_state
  WHERE ... AND current_state.revision = ${revision}
  FOR UPDATE OF current_state
`;
```

**Per mutation: 3 payload uploads + 1 payload download, where 1 upload is required.**

The *intent* of (2), (3) and (4) is sound and deliberate — they verify that the row
holds exactly what was sent, and (4) specifically detects a trigger rewriting the row
*after* `RETURNING`. The fault-injection modes in
`__userStorePostgresStorageReadinessTestHooks` (`suppress-returning`,
`rewrite-returning`, `post-returning-drift`) exist to exercise precisely that. None of
that guarantee needs to be weakened; it just does not need the whole payload shipped
three more times to obtain it.

### Proposed change

Bind the payload once, compare server-side, and return a digest instead of the blob:

```ts
const stateRows = await sql`
  WITH incoming AS (
    SELECT ${sql.json(payload)}::pg_catalog.jsonb AS payload   -- the ONLY payload binding
  )
  UPDATE public.app_state AS state
  SET
    revision = state.revision + 1,
    payload = (SELECT payload FROM incoming),
    updated_at = ${new Date().toISOString()}
  WHERE state.id = ${stateRecordId}
    AND state.tenant_id = ${stateTenantId}
    AND state.state_kind = ${stateKind}
    AND state.schema_version = ${schemaVersion}
    AND state.revision = ${storageCapability.previousRevision}
  RETURNING
    state.revision,
    pg_catalog.md5(state.payload::pg_catalog.text) AS payload_digest,
    state.payload = (SELECT payload FROM incoming) AS payload_matches,
    state.revision = ${storageCapability.previousRevision + 1} AS revision_matches,
    state.id = ${stateRecordId}
      AND state.tenant_id = ${stateTenantId}
      AND state.state_kind = ${stateKind}
      AND state.schema_version = ${schemaVersion} AS state_identity_matches
`;
```

and then the post-`RETURNING` drift check compares **digest to digest**:

```ts
const finalStateRows = await sql`
  SELECT
    current_state.revision,
    pg_catalog.md5(current_state.payload::pg_catalog.text) AS payload_digest
  FROM public.app_state AS current_state
  WHERE ... AND current_state.revision = ${revision}
  FOR UPDATE OF current_state
`;

// Drift detection, preserved: both digests are computed server-side from the
// stored jsonb, so they are directly comparable.
if (finalStateRows[0]?.payload_digest !== writtenState.payload_digest) {
  throw new Error("Postgres storage readiness is unavailable.");
}
```

Result: **1 payload upload + two 32-byte digests**, down from 3 uploads + 1 download.
Roughly a 75% cut in bytes moved on the dominant write path, with no change to the
storage shape and no loss of the drift guarantee.

### Correctness notes — read these before implementing

- **Do not compare a server digest against a client-side `md5(JSON.stringify(payload))`.**
  `jsonb` normalizes key order and discards insignificant whitespace, so
  `payload::text` from Postgres is not byte-identical to the client's serialization.
  Only compare digests that were **both** computed server-side, which is what the
  proposal above does.
- `validateCompletePostgresStorageSnapshot(writtenState.payload)` loses its input when
  `RETURNING state.payload` is dropped. Validate the local `payload` object instead.
  This is equivalent *provided* `payload_matches` is asserted true first, which it is:
  equality against a valid local payload implies the stored value is valid. Note the
  one thing this gives up — validating the server's copy also incidentally checked
  `jsonb` round-trip fidelity. If that is considered load-bearing, keep a sampled
  variant that pulls the full payload on 1-in-N writes rather than on every write.
- `md5` here is a cheap change-detector, not a security primitive. If a non-cryptographic
  digest is unwelcome, `sha256(payload::text)` costs a little more CPU and the same
  bytes on the wire.

### Why it is not applied in this change

The write path's only automated coverage is **source-text regex assertions**:
`lib/server/userStoreSessionRevisionPostgres.test.ts` locates
`async function writePostgresDatabaseWith(` by string index and asserts large regexes
against the SQL text. Those will break loudly on this edit, which is a signal but not
evidence of correctness. The tests that would actually validate it need a live
PostgreSQL (`MAIS_RESEND_WEBHOOK_POSTGRES_INTEGRATION_URL`,
`MAIS_OUTBOX_POSTGRES16_INTEGRATION_URL`) which was not available here.

Changing the verification logic of the primary datastore without being able to run the
integration tests that guard it is not a safe unverified edit, so it is written up here
instead. **To land it:** apply the SQL above, update the three affected regexes in
`userStoreSessionRevisionPostgres.test.ts`, then run
`npm run test:postgres-readiness`, `npm run test:teacher-notice-outbox:postgres` and
`npm run test:teacher-notice-resend-webhook:postgres` against a real instance, including
the three fault-injection modes.

## Problem 2 — the single-row architecture

### Measured facts

- 81 entity collections in one `jsonb` payload (counted from `database.*` references).
- Exclusive row lock before every read-modify-write: `FOR UPDATE OF app_state` at
  `userStore.ts:5083, 5500, 8085, 9564, 9691`.
- `lock_timeout = 1000ms`, `statement_timeout = 5000ms`
  (`postgresMutationTransactionTimeouts`). Past one second of contention, concurrent
  writers **fail** rather than queue.
- No retention anywhere over the blob collections. The retention logic at
  `userStore.ts:10892` applies to a separate Postgres table.

Locking is correct — there are no lost updates, and the `revision` CAS is sound. The
problem is throughput and growth, not consistency.

### Collections that grow without bound

Enumerated in `unboundedAppStateCollections` in
`lib/server/appStateGrowthObservation.ts`, and append-only today:

```
learning_events  attempts  ai_tutor_messages  ai_tutor_usage
ai_governance_events  gamification_events  visualization_events
visualization_sessions  teacher_live_responses  teacher_live_prompts
assignment_submission_attempts  assignment_grading_runs  content_safety_flags
forum_audit_events  forum_notifications  nova_lens_runs
nova_lens_policy_events  teacher_notice_delivery_attempts  reward_point_ledger
```

A class of 30 students answering questions simultaneously is the workload this shape
handles worst, and it is the product's core use case.

### Instrumentation (landed)

`lib/server/appStateGrowthObservation.ts`, called from the success path of
`writePostgresDatabaseWith`. It answers the question the review could not: how big is
the payload, how long do writes take, and *which* collection is running away.

- Collection row counts and write duration: always on, effectively free.
- Payload bytes: opt-in and sampled via `MAIS_APP_STATE_SIZE_SAMPLE`, because measuring
  requires serializing the payload a second time. Unset means never measured and no
  added cost.
- Thresholds: `MAIS_APP_STATE_WARN_BYTES` (default 8 MiB),
  `MAIS_APP_STATE_CRITICAL_BYTES` (default 32 MiB),
  `MAIS_APP_STATE_WARN_DURATION_MS` (default 2000).
- `warn`/`critical` escalate through `captureServerError` with scope `datastore`, so a
  growing payload surfaces where other datastore problems already do. `ok` is silent.
- `payloadBytes`, `durationMs`, `revision` and `operation` were **already** on
  `errorMonitor`'s `allowedExtraKeys` allowlist before this module existed.

To take a measurement in production, set `MAIS_APP_STATE_SIZE_SAMPLE=1` for a short
window (or e.g. `50` for 1-in-50 ongoing), then read the observations off the error
monitor and the structured `app_state write` log lines.

### Suggested sequencing

The backlog's strangler approach (BK-11/BK-12) is right. Two notes on priority:

1. **Run the load test early.** BK-19 is marked P3; this is the constraint most likely
   to produce a visible failure during a live lesson, and
   `scripts/classroom-load-smoke.mjs` already exists. It is cheap and it tells you how
   much time you actually have.
2. **Sequence extraction by write volume, not by domain.** `learning_events` and
   `attempts` are the highest-frequency writers, and normalized destination tables for
   them **already exist** in `lib/server/practiceAttemptStore.ts` (`practice_attempts`,
   `learning_events`, `mistake_book_items`, `adaptive_skill_states`,
   `reward_point_ledger`). Much of the target schema is built.

Related and not yet addressed: `learning_events` and `lesson_progress` are currently
read from **both** the normalized tables and the blob (`jsonb_array_elements` over
`payload->'learning_events'` at `userStore.ts:13304, 13352, 17981`). Commit `487fdc5a`
("fix(progress): share the dashboard attempt source for accuracy") fixed one consumer
of that split; the duality itself remains and will keep producing accuracy
discrepancies until one side becomes authoritative.

Low-churn configuration collections (`topics`, `lessons`, `schools`, `questions`) can
stay in the blob indefinitely — they are read-mostly and cost little.

### Retention

Not implemented here, deliberately. Deleting student learning history is a policy
decision with child-data-compliance implications (`docs/child-data-compliance.md`), not
an implementation detail, and it needs an owner's retention period per collection rather
than a default chosen by whoever touched the code. The instrumentation above identifies
which collections to start with.
