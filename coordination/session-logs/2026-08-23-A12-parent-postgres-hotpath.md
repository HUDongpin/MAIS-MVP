# A12 Parent Postgres Hot-Path Session

- Date: `2026-08-23`
- Owner/lane: `A12` backend API, session, and storage platform
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a12-parent-postgres-hotpath-20260823`
- Branch: `codex/a12-parent-postgres-hotpath-20260823`
- Baseline candidate SHA: `c5335f42ac892670374a7025cbfc627f50d083a4`
- Current branch HEAD/upstream before this uncommitted amendment: `52db8b25ea44b4c81db1b02da8391bd66d81be73`
- Target PR: `pending`
- Creation date: `2026-08-23`
- Expected closeout date: `2026-08-24`
- Objective: Slice A only — remove the full Postgres JSONB application-snapshot read from external storage readiness while preserving canonical bootstrap, complete write-time attestation, metadata readiness, and hot-auth readiness checks. Parent collection read/write projections remain deferred to separate slices.
- Intended write scope: A12-owned storage/readiness implementation under `lib/server/userStore.ts` and `lib/server/userStore/`, focused backend tests, and this session log.
- Coordination boundaries: no provider credential values, no formal-domain promotion, no parent UI changes, no broad test-harness changes, and no edits to the dirty integration root.
- Baseline symptom: production-target candidate `/api/warm` returns `storageReady=true` but repeatedly takes approximately 14–22 seconds; earlier parent-message p95 approached 156 seconds.
- Final implementation candidate:
  - the only cold-start DDL path remains the canonical `ensurePostgresStateTable()` / `bootstrapPostgresStateTables()` flow; the rejected independent metadata half-bootstrap was removed completely;
  - canonical bootstrap begins a transaction and installs transaction-local `lock_timeout=1000ms` and `statement_timeout=5000ms` before its advisory lock and DDL;
  - canonical bootstrap owns the small `app_state_readiness_markers` table and writes an exact marker only after the canonical app snapshot and schema have passed the complete snapshot validator, including all canonical collections and the six safety-critical parent/classroom collections (`guardian_links`, `teacher_classes`, `teacher_messages`, `teacher_message_entries`, `teacher_notices`, and `teacher_notice_recipients`);
  - the marker binds state id, tenant id, state kind, schema version, current app-state revision, readiness-contract version, and the exact hot-auth migration version;
  - canonical bootstrap also installs a `SECURITY INVOKER`/volatile trigger function with a fixed `pg_catalog, public` search path. Its `AFTER INSERT OR UPDATE OF id, payload, revision, tenant_id, state_kind, schema_version` trigger deletes readiness markers atomically; an update deletes both `OLD.id` and `NEW.id`, so unknown or bypass writers fail closed even when they alter payload without incrementing revision or rename the state row;
  - external readiness uses a fresh bounded `READ ONLY` transaction, then transaction-local timeouts, exact physical catalog validation, exact trigger/function validation, and finally an exact scalar marker/current-revision predicate. `/api/warm` never calls `ensurePostgresStateTable()`, bootstrap, DDL, advisory locks, a payload query, or a mutation;
  - `/api/warm` requires a nonblank `CRON_SECRET`; missing configuration returns private/no-store `503`, a wrong bearer returns private/no-store `401`, and an authorized missing-table/marker/drift/timeout returns only `storageReady:false` without diagnostics;
  - the catalog probe maps real `pg_catalog` rows against an exact 16-column allowlist for `public.app_state`, `public.app_state_readiness_markers`, and `public.auth_schema_migrations`, including PostgreSQL type, nullability, ordinary/partitioned-table relation kind, ordered primary-key columns, and validated primary-key constraints. It never selects, expresses, or detoasts the JSONB `payload` column;
  - the initializer uses a strict probe: only a successfully executed absent/drift result returns `false`, `42P01` is the sole bootstrap-eligible probe error, and permission/timeout/transport errors propagate without triggering DDL; the external/admin wrapper alone catches errors and maps them to generic not-ready;
  - hot-auth readiness uses the same bounded short-transaction discipline and, on every uncached call, verifies an exact pg_catalog allowlist for all required columns, PostgreSQL types, and nullability across the four auth tables plus the exact auth migration marker before counting rows;
  - the full snapshot writer validates the actual `RETURNING payload, revision` row exactly once, requires the returned payload to equal the intended serialized JSONB, synchronizes projections, then restores the marker at that exact committed revision; it remains composable in an existing transaction;
  - the AI Tutor message/usage and both password-reset partial JSONB writers acquire an opaque capability only after the full scalar catalog, trigger/function, state/marker, revision, and migration tuple has been locked and validated. A changed write advances exactly one revision and restores the marker in the same transaction; an idempotent no-delta replay leaves the existing marker untouched. These paths do not re-read or normalize the full payload;
  - the snapshot admin merge now uses a locked exact payload/revision CAS, never bootstraps or re-attests, explicitly leaves readiness invalidated, and reports `storageReady:false`;
  - legacy or missing app-state/marker columns, empty storage, stale revision, wrong tenant/kind/schema, incomplete marker, auth marker drift, missing hot-auth columns, timeouts, and driver failures all fail closed at the appropriate strict or private boundary;
  - both `tablesReady=false` and dependency rejection map to private `postgres-unavailable` with `durableReady=false`;
  - SQLite behavior, parent routes/UI, provider behavior, and parent read/write hot paths are outside this slice and were not changed.
- TDD evidence:
  - RED 1: the new executor readiness contract failed `0/1` because the scalar probe module surface did not exist;
  - RED 2: after the first test skeleton, the behavioral batch was `1 pass / 3 fail` because bounded schema probing, timeout recovery, and concurrent canonical bootstrap behavior were not implemented;
  - RED 3: marker completeness and bounded hot-auth tests failed because the required-collection contract and hot-auth executor were absent;
  - RED 4: auth-admin storage tests proved `tablesReady=false` was incorrectly reported as durable-ready and that a rejected dependency escaped instead of becoming a private unavailable result;
  - RED 5: canonical source-contract tests proved the earlier readiness path still referenced JSONB payload and lacked canonical transaction-local timeouts;
  - independent-review RED 6: the amended executor suite initially passed `2/8` and failed `6/8` because strict probing, a real complete fixture, final locked-payload attestation, and hot-auth column validation were absent; the semantic fast-path suite passed `1/2` and exposed six raw-marker call sites instead of the required single fully validated path;
  - renewed-review RED 7: after replacing the vacuous catalog boolean fake with real catalog rows, the focused executor suite passed `7/9` and the semantic fast-path suite passed `1/2`; the ready fixture was rejected by the old `rows[0].schema_ready` mapping, while the SQL lacked public-namespace, type, relation-kind, ordered primary-key, and constraint-validation semantics;
  - renewed-review GREEN 7: the focused catalog suite passed `9/9` and semantic schema fast-path passed `2/2`; parameterized executor tests reject type and nullability drift for every required column, plus wrong relation kind, missing/wrong primary keys, and an unvalidated primary-key constraint;
  - renewed-review RED 8: the focused marker suite passed `9/10`; a fake configured as `ready` returned true for a different requested state id, proving that the old `markerState === "ready"` shortcut did not exercise the SQL predicate;
  - renewed-review GREEN 8: the focused marker suite passed `10/10` without changing production SQL; the executor now holds concrete app-state rows, marker rows, and migration versions and evaluates the six bound query values against the same id/tenant/kind/schema/revision/contract/migration relationship as the production `EXISTS` predicate. Concrete fixtures reject a different requested id/tenant/kind/schema, missing state, missing marker, stale revision, wrong marker id/tenant/kind/schema, missing or wrong contract version, and missing or wrong exact auth migration version;
  - renewed-review RED 9: the new warm/trigger/capability behavioral batch passed `21/28` and failed the seven intended assertions: warm still invoked the unbounded path, missing trigger metadata was accepted, the capability seam and writer CAS were absent, and the metadata verifier still called ensure/bootstrap. The semantic batch passed `1/6` and failed the five intended source/ordering assertions;
  - root-review RED 10: after adding exact follow-up regressions, the focused batch passed `22/29` and failed the seven intended assertions: readiness lacked explicit `READ ONLY`, trigger invalidation omitted state-id changes/`OLD.id`, capability acquisition omitted the complete physical catalog, and the full writer did not validate the actual returned row;
  - GREEN: focused readiness/warm/auth-admin tests passed `29/29`; adjacent storage/auth tests passed `51/51`; semantic schema/admin fast-path tests passed `7/7`; the exact final worktree's full parent-console gate passed `69/69` tooling and `265/265` runtime outside the macOS process-inspection sandbox.
- Fresh verification:
  - `node --import tsx --test app/api/warm/route.test.ts lib/server/userStore/postgresStorageReadiness.test.ts lib/server/userStoreAuthAdminStoragePersistence.test.ts`: passed `29/29`;
  - `node --import tsx --test lib/server/userStore/postgresSchemaReadiness.test.ts lib/server/userStoreSessionRevisionPostgres.test.ts lib/server/userStoreNovaPostgresAdmission.test.ts lib/server/userStoreAuthAdminStoragePersistence.test.ts lib/server/userStore/postgresStorageReadiness.test.ts app/api/warm/route.test.ts`: passed `51/51`;
  - `node --test scripts/postgres-schema-fast-path.test.mjs`: passed `7/7`; the prior brittle fixed SQL-count assertion is replaced with semantic ordering and executor-level warm, catalog, trigger invalidation, full-writer, partial-CAS, rollback, and admin-CAS assertions;
  - `npm run type-check`: passed;
  - `npm run check:imports`: passed (`All local import targets resolved.`);
  - direct imports of `lib/server/userStore.ts`, `lib/server/userStore/authAdminStoragePersistence.ts`, and `app/api/warm/route.ts`: passed;
  - `node scripts/storage-admin-snapshot-merge.mjs --self-test`: passed;
  - `git diff --check`: passed;
  - the default macOS process-inspection sandbox run of `npm run test:parent-console` reached tooling `46/69`; all 23 failures were the same harness-level `Could not establish process-birth identity` class (plus derived timeouts), not product assertions;
  - `npm run test:parent-console` outside the process-inspection sandbox: tooling `69/69`, runtime `265/265`, zero skipped or failed;
- Exact uncommitted changed-path allowlist:
  - `app/api/warm/route.ts`;
  - `app/api/warm/route.test.ts`;
  - `coordination/session-logs/2026-08-23-A12-parent-postgres-hotpath.md`;
  - `lib/server/userStore.ts`;
  - `lib/server/userStore/authAdminStoragePersistence.ts`;
  - `lib/server/userStoreAuthAdminStoragePersistence.test.ts`;
  - `lib/server/userStoreSessionRevisionPostgres.test.ts`;
  - `lib/server/userStore/postgresStorageReadiness.test.ts`;
  - `scripts/postgres-schema-fast-path.test.mjs` (A11 shared-test amendment explicitly authorized by the review contract);
  - `scripts/storage-admin-snapshot-merge.mjs`.
- Remaining acceptance boundaries:
  - no disposable PostgreSQL 16 instance was run in this amendment. Real-engine function/trigger DDL, exact catalog projection, trigger invalidation, transaction rollback, timeout and pooled-connection reuse, concurrent bootstrap, and mutation-capability race behavior still require the local-only integration gate;
  - the existing destructive integration harness refuses non-local hosts, unexpected ports/databases, URL query strings, and fragments. The reviewed disposable target is `MAIS_POSTGRES_INTEGRATION_URL=postgres://postgres:postgres@127.0.0.1:55432/mais_nova_ci` (or CI port `5432`) with `postgres:16-alpine`, followed by `npx tsx --tsconfig tsconfig.json --test lib/server/userStoreNovaPostgresIntegration.test.ts`; no production connection string is required or permitted;
  - the existing PostgreSQL integration file covers canonical migration, rollback compatibility, and concurrent writes but does not yet contain a dedicated assertion for every new marker trigger/CAS-race invariant; executor-level coverage does not replace that focused real-engine extension;
  - this candidate requires independent spec-compliance and code-quality/security review before any commit or integration.
- Final state: uncommitted candidate; no paths staged, committed, pushed, merged, deployed, or exercised against production by this amendment.

## 2026-08-24 Hot-Path Concurrency And Fail-Closed Amendment

- This amendment remains on local/upstream HEAD `52db8b25ea44b4c81db1b02da8391bd66d81be73`; all implementation and test changes below are uncommitted and unstaged.
- Bootstrap contention is now recovered only from the explicit `PostgresAdvisoryBootstrapContentionError` wrapper for PostgreSQL `55P03`. Recovery is bounded to six attempts and polls the same strict marker; permission, transport, undefined-table-after-bootstrap, statement-timeout, DDL, and validation failures still propagate.
- External readiness now runs in one bounded `REPEATABLE READ, READ ONLY` transaction, fixes transaction-local `search_path` to `pg_catalog, public`, takes `ACCESS SHARE NOWAIT` on the exact public readiness/auth relations, and then evaluates catalog, trigger, marker, migration, and hot-auth evidence in one coherent observation boundary. It remains payload-free and DDL-free.
- Mutation capability first locks the exact app-state identity/revision, fixes the safe transaction-local search path, takes relation locks, re-runs the exact catalog and trigger probes, and locks the matching marker/migration tuple before exposing the opaque capability. Partial message/usage writers retain exactly-once replay and revision behavior without reading the JSONB snapshot.
- Exact catalog verification now binds built-in type OID, `pg_catalog` namespace and base type kind; primary-key count/order/validation/nondeferrability, backing-index validity/readiness/access method, and exact internal dependency; and trigger predicate/arguments/type/update-column/function-owner/config/source semantics. Canonical bootstrap DDL targets `public` explicitly so a superuser test connection with `pg_catalog` first cannot create MAIS relations there.
- The generic full writer now verifies the actual single `RETURNING` row, exact state identity, exact intended JSONB payload, and exact next revision before synchronizing projections or restoring readiness. Suppressing and identity/revision-rewriting trigger fixtures are expected to roll the full transaction back.
- Ordinary PostgreSQL reads, generic mutations, full rewrites, partial writers, and auth-admin backfill no longer repair an existing incomplete state with `createInitialDatabase()`. They require the complete storage contract and fail closed. Only the canonical bootstrap may insert the initial snapshot when the state row is truly absent; its explicit string-to-JSON version migration remains transaction-scoped and the final complete validator must pass before the migration/marker can commit.
- The real-engine harness now covers two-process cold bootstrap, state-lock/capability races, DDL/trigger/marker/migration drift, hostile shadow search paths, exact built-in type and trigger drift, actual full-writer `RETURNING`, rollback fixture restoration, and malformed existing-state preservation. The malformed fixture compares only payload digest/revision/timestamp evidence, verifies the marker and journal stay empty, restores the exact prior fixture snapshot, and re-attests through a test-only hook; it does not print payloads or normalize production data.

### Additional TDD evidence

- Malformed-state RED: `node --import tsx --test --test-name-pattern='ordinary Postgres reads' lib/server/userStore/postgresStorageReadiness.test.ts` failed `0/1` because ordinary normalization still referenced the initial-state fallback. After removing the fallback and adding the complete-contract guard, that focused assertion passed `1/1`.
- Search-path real-engine RED: the first PostgreSQL 16 run after introducing `pg_catalog, public` failed its cold bootstrap because unqualified bootstrap DDL could target `pg_catalog` under the disposable superuser. The amendment explicitly schema-qualifies canonical DDL and adds a `pg_catalog` no-MAIS-object sentinel. A final fresh real-engine rerun remains required below.
- Adjacent-source RED: after public-qualifying canonical DDL, the Nova admission suite passed `8/10` because two legacy regex assertions still required unqualified relations; the full adjacent batch passed `56/58`. The assertions now require `public` qualification and pass `10/10` alone and `58/58` in the adjacent batch.

### Fresh non-PostgreSQL verification for this exact amendment

- readiness-focused: `node --import tsx --test lib/server/userStore/postgresSchemaReadiness.test.ts lib/server/userStore/postgresStorageReadiness.test.ts` passed `28/28`;
- focused backend: warm/auth-admin/session/readiness passed `48/48`;
- adjacent backend including Nova admission passed `58/58`;
- semantic fast-path: `node --test scripts/postgres-schema-fast-path.test.mjs` passed `7/7`;
- integration harness parse/boundary without a configured database passed its destructive-target test and explicitly skipped the real-engine case (`1 pass / 1 explicit skip / 0 fail`);
- `npm run type-check`, `npm run check:imports`, direct imports of the three touched runtime modules, `node scripts/storage-admin-snapshot-merge.mjs --self-test`, and `git diff --check` passed;
- `npm run test:imports` passed `7/7`;
- the fresh sandboxed `npm run test:parent-console` tooling phase passed `46/69`; all 23 failures were the known macOS process-birth identity denial (`Could not establish process-birth identity`) and derived wait timeouts. The runner correctly stopped before its 265-test runtime phase. It was not retried and is not reported as a product failure or as a complete parent gate.

### Current acceptance boundaries

- A final fresh PostgreSQL 16 run for `lib/server/userStoreNovaPostgresIntegration.test.ts` remains pending outside this filesystem/process sandbox. This environment cannot connect to the prepared loopback disposable fixture, so the main session must run the eight-case gate against the already prepared local-only `mais_nova_ci` database without disclosing its fixture credential. The earlier pre-fix real-engine run is diagnostic evidence only, not final GREEN evidence.
- The current amendment's full parent-console gate also requires one outside-sandbox rerun. The earlier `69/69` tooling plus `265/265` runtime result recorded above predates these latest changes and must not be treated as exact-current acceptance.
- No live Neon, production Postgres, production account, provider, deployment, or production write was used. No connection string, payload, email, provider ID, or credential was written to this log.
- Final independent read-only gap audit initially requested one test-fixture change: a rejected/timed-out malformed-state worker could bypass the sequential restore path. The destructive fixture now uses `try/finally`, parameterizes the exact captured payload/revision/timestamp restore, verifies digest-only evidence, and re-attests even when a worker rejects or an assertion fails. The same reviewer re-reviewed the change as `PASS` with no production or test blocker. The post-fix integration parse/boundary check and a fresh `npm run type-check` both passed.

### Exact current dirty-path allowlist

- `app/api/warm/route.ts`;
- `app/api/warm/route.test.ts`;
- `coordination/session-logs/2026-08-23-A12-parent-postgres-hotpath.md`;
- `lib/server/userStore.ts`;
- `lib/server/userStore/authAdminStoragePersistence.ts`;
- `lib/server/userStore/postgresSchemaReadiness.ts`;
- `lib/server/userStore/postgresSchemaReadiness.test.ts`;
- `lib/server/userStore/postgresStorageReadiness.test.ts`;
- `lib/server/userStoreAuthAdminStoragePersistence.test.ts`;
- `lib/server/userStoreNovaPostgresAdmission.test.ts`;
- `lib/server/userStoreNovaPostgresIntegration.test.ts`;
- `lib/server/userStoreSessionRevisionPostgres.test.ts`;
- `scripts/nova-postgres-integration-worker.ts`;
- `scripts/postgres-schema-fast-path.test.mjs`;
- `scripts/storage-admin-snapshot-merge.mjs`.

- Amendment state: exact 15-path dirty slice, staged paths `0`; no commit, push, merge, deploy, production credential use, or production data mutation.

## 2026-08-24 Consolidated Readiness, Full-Writer, And Session-Rollback Hardening

- This local amendment remains based on branch HEAD/upstream `52db8b25ea44b4c81db1b02da8391bd66d81be73`. It is intentionally uncommitted and unstaged pending renewed independent specification and code-quality review.
- External durable readiness now uses one dedicated `max=1` PostgreSQL client and one `REPEATABLE READ, READ ONLY` transaction for the complete observation boundary: cooperative shared advisory lock, safe transaction-local search path, exact relation locks, app-state/marker/migration catalog, the two closed-world canonical triggers and zero user rewrite rules, both AI Tutor journals, hot-auth catalog and canonical primary keys, exact marker/revision tuple, and hot-auth row counts. The operation-wide deadline begins before the abortable slot queue; on timeout the singleton is atomically cleared and ended while the slot remains held. No query cancellation is used and the general application pool is not destroyed.
- Generic full snapshot reads/writes, journal paths, and the admin merge path use explicit `public` relations, `pg_catalog` functions/types, and a safe local search path. The full writer requires an exact pre-state identity/revision capability and CAS, exactly one actual `RETURNING` row with the intended identity/payload/next revision, then a final locked post-trigger reread before marker advancement. Ordinary reads and writers reject malformed/incomplete existing state; only a truly absent canonical row can be initialized, and scalar-string conversion is limited to the explicit versioned cold migration.
- Storage catalog attestation now covers built-in type OID/namespace/kind, exact nondeferrable canonical primary keys and their backing-index dependency, both AI Tutor journals, exactly the readiness-invalidation and AI Tutor compatibility triggers, exact function/owner/config/source/update-column/predicate/argument contracts, and zero non-internal rules. Runtime readers/writers use the shared advisory protocol; bootstrap/migration uses the exclusive side of the same protocol.
- Password-reset hot-path capability failures no longer fall back to the generic full writer. Token/user mutations require exactly one returned row, used/expired/malformed token cleanup is mirrored in hot tables and canonical JSONB state, a generic rewrite overlays current hot-auth state so removed tokens cannot be resurrected, and a test-only failpoint proves transaction rollback after hot user/token mutation but before the app-state CAS. The real-engine fixture captures and restores exact state/revision/timestamp/marker/auth/token evidence in `finally` without logging business payloads.
- Formal gate wiring adds `npm run test:postgres-readiness`, its runner contract self-test, the exact warm/readiness tests, and the matching CI step. Root additionally granted this A12 session a narrow A11 borrow for only `scripts/parent-console-test-manifest.mjs` and `scripts/parent-console-gates.test.mjs`; those two paths only update the two new static declarations from `142/263` to `144/265` and assert the same totals. No other A11 path was touched.

### Strict TDD evidence for this consolidation

- Session rollback RED: the focused source contract passed `0/1` because no failpoint existed after the hot user/token writes; GREEN passed `1/1` after adding the transaction-local failpoint and exact captured-state restore assertions.
- Token-cleanup parity RED: the focused fixture contract passed `0/1` because the malformed/expired/used sentinels and no-resurrection evidence were absent; GREEN passed `1/1` with exact hot/canonical cleanup and rewrite overlay coverage.
- Readiness deadline RED: the dedicated-client deadline harness passed `0/2`; GREEN passed `2/2` after adding the pre-slot total deadline, atomic client teardown, and non-orphaning cleanup. The separate queued-probe RED passed `0/1`; GREEN passed `1/1`.
- Formal runner RED: the runner self-test passed `0/1` because the module did not exist. The first implementation then exposed a local `tsx` CLI IPC `EPERM`; changing the runner to Node's `--import tsx --test` path produced GREEN: runner contract `1/1` and runtime readiness tests `28/28`.
- The first fresh TypeScript gate found one fixture-only `JSONValue` mismatch; after correcting that test value, `npm run type-check` passed with zero errors.
- Adjacent storage/auth source tests initially passed `37/41`; four assertions still encoded superseded SQL shapes. After aligning them to the hardened contracts, the fresh adjacent batch passed `41/41`.
- Semantic fast-path/source tests initially passed `2/8`; six assertions still encoded the pre-hardening catalog/capability shapes. After replacing them with exact contracts and executor evidence, the fresh batch passed `8/8`.
- The first sandboxed full parent gate reached tooling `45/69`: one failure was the expected new static-declaration count drift and the remaining failures were process-birth identity denials/timeouts. The narrow A11 count correction is independently GREEN at `9/9`; the complete parent runner was not retried because the main session explicitly prohibited further process/network escalation in this sandbox.

### Fresh safe verification

- `npm run test:postgres-readiness`: runner contract `1/1`, readiness/warm runtime `28/28`.
- `node --import tsx --test lib/server/userStoreSessionRevisionPostgres.test.ts lib/server/userStoreAuthAdminStoragePersistence.test.ts lib/server/userStoreNovaPostgresAdmission.test.ts lib/server/userStore/postgresSchemaReadiness.test.ts`: `41/41`.
- `node --test scripts/postgres-schema-fast-path.test.mjs scripts/run-postgres-readiness-tests.test.mjs`: `8/8`.
- `node --test scripts/parent-console-gates.test.mjs`: `9/9` after the explicitly authorized narrow A11 manifest-count amendment.
- `npm run test:release-governance`: `89/89`.
- `npm run type-check`: zero errors.
- `npm run check:imports && npm run test:imports`: local imports resolved and `7/7` tests passed.
- `git diff --check`: passed.
- An independent read-only fixture audit returned PASS on the destructive integration fixture's `try/finally` exact restore/re-attestation behavior. That audit did not connect to PostgreSQL and does not replace the real-engine gate.

### Exact current dirty-path allowlist and boundaries

- `.github/workflows/ci.yml`;
- `app/api/warm/route.ts`;
- `app/api/warm/route.test.ts`;
- `coordination/session-logs/2026-08-23-A12-parent-postgres-hotpath.md`;
- `lib/server/userStore.ts`;
- `lib/server/userStore/authAdminStoragePersistence.ts`;
- `lib/server/userStore/postgresSchemaReadiness.ts`;
- `lib/server/userStore/postgresSchemaReadiness.test.ts`;
- `lib/server/userStore/postgresStorageReadiness.test.ts`;
- `lib/server/userStoreAuthAdminStoragePersistence.test.ts`;
- `lib/server/userStoreNovaPostgresAdmission.test.ts`;
- `lib/server/userStoreNovaPostgresIntegration.test.ts`;
- `lib/server/userStoreSessionRevisionPostgres.test.ts`;
- `package.json`;
- `scripts/nova-postgres-integration-worker.ts`;
- `scripts/parent-console-gates.test.mjs` (narrow A11 borrow);
- `scripts/parent-console-test-manifest.mjs` (narrow A11 borrow);
- `scripts/postgres-schema-fast-path.test.mjs`;
- `scripts/run-postgres-readiness-tests.mjs`;
- `scripts/run-postgres-readiness-tests.test.mjs`;
- `scripts/storage-admin-snapshot-merge.mjs`.
- This is a 21-path dirty slice with zero staged paths. No commit, push, merge, deploy, production credential use, production data access, or production mutation occurred.
- The current real PostgreSQL 16 integration gate is **unrun** in this consolidation. The prepared local-only fixture could not be reached within the approved sandbox, and the main session explicitly prohibited further escalation, Docker access, loopback access, or workarounds. Therefore SQL parse/execution, exact live catalog attestation, cooperative-lock interleavings, trigger/rule drift, actual rollback, two-process bootstrap, and the final `8/8` real-engine claim remain acceptance blockers until another authorized environment runs `lib/server/userStoreNovaPostgresIntegration.test.ts` against a fresh disposable PostgreSQL 16 database.
- The exact-current full `npm run test:parent-console` result is also incomplete: the sandboxed run stopped in tooling after process-birth identity failures, so its `265` runtime cases were not executed. Earlier out-of-sandbox `69/69 + 265/265` evidence predates this consolidation and is retained as historical evidence only.

## 2026-08-24 Post-Review Lock Order, Contention, And Full-Writer Amendment

- This amendment responds to the independent `REQUEST CHANGES` review without changing the branch tip. The worktree remains on branch `codex/a12-parent-postgres-hotpath-20260823` at local/upstream commit `52db8b25ea44b4c81db1b02da8391bd66d81be73`; every change remains uncommitted and unstaged.
- Generic full-state rewrites and mutations now acquire the opaque shared storage capability before taking or consuming the app-state row lock. The same capability is carried through the writer instead of being reacquired, enforcing the global cooperative lock order `advisory -> relation -> row` against the bootstrap path's exclusive advisory lock.
- Cold-bootstrap recovery now distinguishes an exact shared-advisory marker-probe `55P03` from every other lock, statement, permission, DDL, validation, transport, or driver failure. Only the specialized marker-probe contention enters the existing bounded six-attempt strict-marker recovery loop; raw or unrelated `55P03` remains fail-closed.
- The formal readiness runner now includes `lib/server/userStoreAuthAdminStoragePersistence.test.ts` in addition to the warm-route and storage-readiness suites. The parent manifest preserves static counts `144` security / `265` total and declares exact runtime counts `146` security / `267` total, accounting for the two runtime session-revision cases without inflating counts for consolidated source assertions.
- The previous real-engine suppress/rewrite fixtures were redesigned so the fault is installed only after the capability boundary, inside the same full-writer transaction. Test-only modes cover suppressed `RETURNING`, rewritten identity/revision, and post-`RETURNING` payload drift; bounded stage evidence is aggregate-only, and each fixture requires exact state/marker rollback. A two-process barrier scenario also waits for the generic writer's state lock and the bootstrap's blocked advisory acquisition before awaiting both processes with all-settled teardown. These real-engine scenarios are present in the harness but remain **unrun** in this sandbox.

### Post-review RED -> GREEN evidence

- Lock order RED: `node --import tsx --test --test-name-pattern='generic full-state mutations acquire one capability' lib/server/userStore/postgresStorageReadiness.test.ts` passed `0/1`; the source contract could not find the capability-first generic mutation reader. The targeted GREEN passed `1/1` after introducing the capability-carrying read/write boundary; the assertion was then consolidated into the existing full-snapshot source contract so the formal manifest count remains exact.
- Parent-manifest RED: `node --test --test-name-pattern='parent Node gate uses' scripts/parent-console-gates.test.mjs` passed `0/1` with the intended `144 !== 146` runtime-security mismatch. The final manifest/gate batch passed `17/17` with runtime `146/267` and static `144/265`.
- Formal-runner RED: `node --test scripts/run-postgres-readiness-tests.test.mjs` passed `0/1` because the auth-admin durability suite was absent. The runner contract then passed `1/1`, and `npm run test:postgres-readiness` passed its contract `1/1` plus runtime `43/43` including auth-admin durability behavior.
- Marker-contention RED: the focused schema-readiness regression passed `0/1` because `PostgresAdvisoryMarkerContentionError` did not exist. The targeted GREEN passed `1/1`; after consolidation, the adjacent schema/auth/storage batch passed `41/41` and retains the exact-contention assertion inside the established bounded-recovery case.
- Post-capability fault REDs: the storage source regression passed `0/1` while the test-only full-writer fault helper was absent, and the worker source regression passed `0/1` while the bounded `full-snapshot-fault` command was absent. Each targeted GREEN passed `1/1`. This proves the source and harness contracts locally; only a real PostgreSQL run can prove the trigger execution and rollback behavior.

### Final safe-gate evidence for the frozen candidate

- `npm run test:postgres-readiness`: runner contract `1/1`; runtime readiness/warm/auth-admin `43/43`; zero failures.
- `node --import tsx --test lib/server/userStoreSessionRevisionPostgres.test.ts lib/server/userStoreAuthAdminStoragePersistence.test.ts lib/server/userStoreNovaPostgresAdmission.test.ts lib/server/userStore/postgresSchemaReadiness.test.ts`: `41/41`; zero failures.
- `node --test scripts/postgres-schema-fast-path.test.mjs scripts/run-postgres-readiness-tests.test.mjs scripts/parent-console-gates.test.mjs`: `17/17`; zero failures.
- `npm run type-check`: passed with zero TypeScript errors.
- `npm run check:imports`: passed (`All local import targets resolved.`); `npm run test:imports`: `7/7`.
- `npm run test:release-governance`: `89/89`.
- `node --import tsx --test lib/server/userStoreNovaPostgresIntegration.test.ts`: destructive-target boundary `1/1` passed and the actual engine case was explicitly skipped `1/1` because no integration URL was supplied. This is parsing/target-guard evidence only, not PostgreSQL acceptance.
- `git diff --check`: passed before this log-only handoff update and is rerun after it below.

### Frozen path and acceptance boundary

- Exact dirty paths (`21`):
  - `.github/workflows/ci.yml`;
  - `app/api/warm/route.ts`;
  - `app/api/warm/route.test.ts`;
  - `coordination/session-logs/2026-08-23-A12-parent-postgres-hotpath.md`;
  - `lib/server/userStore.ts`;
  - `lib/server/userStore/authAdminStoragePersistence.ts`;
  - `lib/server/userStore/postgresSchemaReadiness.ts`;
  - `lib/server/userStore/postgresSchemaReadiness.test.ts`;
  - `lib/server/userStore/postgresStorageReadiness.test.ts`;
  - `lib/server/userStoreAuthAdminStoragePersistence.test.ts`;
  - `lib/server/userStoreNovaPostgresAdmission.test.ts`;
  - `lib/server/userStoreNovaPostgresIntegration.test.ts`;
  - `lib/server/userStoreSessionRevisionPostgres.test.ts`;
  - `package.json`;
  - `scripts/nova-postgres-integration-worker.ts`;
  - `scripts/parent-console-gates.test.mjs` (explicit narrow A11 borrow);
  - `scripts/parent-console-test-manifest.mjs` (explicit narrow A11 borrow);
  - `scripts/postgres-schema-fast-path.test.mjs`;
  - `scripts/run-postgres-readiness-tests.mjs`;
  - `scripts/run-postgres-readiness-tests.test.mjs`;
  - `scripts/storage-admin-snapshot-merge.mjs`.
- Real PostgreSQL 16 remains **unrun** for this post-review candidate by explicit session boundary. Therefore the new lock-order barrier, post-capability trigger faults, exact catalog/DDL execution, rollback, two-process cold bootstrap, and final eight-case engine matrix remain blockers to acceptance and must be run in a separately authorized environment.
- The exact-current full `npm run test:parent-console` runtime gate is also **unrun**. The manifest and its self-test are current at runtime `146/267`, but the earlier full out-of-sandbox result predates this amendment and cannot be promoted to exact-current evidence.
- This candidate still requires renewed independent specification and code-quality review after the real-engine evidence. No path is staged; no commit, push, merge, deploy, production credential access, production data access, or production mutation occurred.

## 2026-08-24 Independent-Review Remediation: Locking, Metadata-Only Readiness, Physical Attestation, And Same-SHA CI

- This amendment closes the four blocking findings from the latest independent read-only review while preserving the standalone readiness/hotpath slice. It does not incorporate the three separate parent scoped-read/write commits already combined by A23 elsewhere. The worktree remains on branch `codex/a12-parent-postgres-hotpath-20260823` at HEAD/upstream `52db8b25ea44b4c81db1b02da8391bd66d81be73`; all changes are local, uncommitted, and unstaged.
- Mutation capability no longer takes `SHARE ... NOWAIT` before the app-state row lock. All nine attested relations are acquired in one fixed-order `SHARE ROW EXCLUSIVE` request. The mode is compatible with the same transaction's later `UPDATE`/`INSERT`, conflicts with concurrent writers and catalog-changing DDL, and queues competing application writers before they can retain a shared lock while waiting for the row. The real-engine fixture now starts one writer with a deterministic 1.5-second post-row-lock hold, waits for its granted `ShareRowExclusiveLock`, starts three more independent processes, and requires all four results to succeed with exactly two durable revision advances for the two unique IDs.
- Operational durable readiness is now metadata-only: one dedicated, total-deadline-bounded client validates catalog, the two canonical triggers, exact migration/marker/revision evidence, and the four hot-auth table catalogs, then returns a boolean readiness result. It performs no tenant-row `COUNT(*)` scan. Hot-auth counts remain available only through the explicitly named admin diagnostics contract and only when `getStorageReadinessSnapshot({ includeDiagnosticsCounts: true })` is requested by the authenticated admin storage-health route. Warm and registration paths use the default `false` option. Optional diagnostics still run on the dedicated one-slot client inside the same operation-wide deadline.
- All nine relations (`app_state`, readiness marker, migration marker, both journals, and four hot-auth tables) must be ordinary `relkind='r'`, permanent `relpersistence='p'`, with `relrowsecurity=false` and `relforcerowsecurity=false`. The storage catalog returns and validates these flags per relation; the hot-auth scalar catalog applies the same closed-world predicates. Bootstrap takes the same stable fixed-order relation lock, runs an early physical-only probe before any initial-state mutation, runs complete storage/trigger/hot-auth catalogs after the migration marker, and only then writes the readiness marker. Existing unlogged/RLS/forced-RLS drift therefore cannot be silently re-attested by the initializer.
- The disposable PostgreSQL fixture now applies and restores `SET UNLOGGED`, `ENABLE ROW LEVEL SECURITY`, and `FORCE ROW LEVEL SECURITY` drift. Each case requires both strict readiness and cold initializer/bootstrap to fail closed before the relation is restored. These executable fixture branches are source-verified locally but remain unexecuted against a PostgreSQL server under this amendment's explicit boundary.
- The real PostgreSQL CI job now runs for pull requests, merge-queue `merge_group`, pushes to `refs/heads/main`, and manual `full_validation`. Its checkout explicitly uses `${{ github.sha }}` and then requires `git rev-parse HEAD` to equal that event SHA. The other existing job conditions were left unchanged. In GitHub CI, a missing integration URL is a failing test rather than an allowed skip; local non-CI runs without a URL retain one explicit skip.
- The warm route safety contract remains intact: missing cron secret is private/no-store 503 without storage access, a wrong bearer is private/no-store 401 without storage access, authorized storage failures are reduced to `storageReady:false`, and the response contains only bounded scalar fields.

### Strict RED -> GREEN evidence for this remediation

- Writer lock protocol: the two focused source/fake assertions first passed `0/2` against `IN SHARE MODE NOWAIT`; after the minimal lock change they passed `2/2`.
- Operational row-scan removal: the focused readiness assertion first passed `0/1` because the probe returned four exact counts; after returning only metadata readiness it passed `1/1`. The separate admin opt-in assertion first passed `0/1` because no options crossed the dependency boundary; after the explicit diagnostics option it passed `1/1`.
- Physical storage relations: the per-table fake mutation test first passed `0/1` because a partitioned relation was accepted; after checking kind/persistence/RLS/FORCE RLS it passed `1/1`. The hot-auth source/fake assertion likewise passed `0/1` before the four physical predicates and `1/1` after them.
- Real-engine drift contract: the focused source test first passed `0/1` because no persistence/RLS fixture existed, then passed `1/1`. The bootstrap fallback regressions then passed `0/2` because neither early/final physical attestation nor bootstrap-rejection calls existed; after the fail-closed bootstrap boundary they passed `2/2`.
- Deterministic four-writer contract: the focused fixture-source test first passed `0/1` because there was no table-lock barrier, then passed `1/1` after the first-writer hold and `ShareRowExclusiveLock` observation were added.
- CI event/SHA/non-skip contract: the runner self-test first passed `0/1` because `merge_group`, main-push, exact checkout SHA, and CI-required integration were absent; after the narrow workflow/test changes it passed `1/1`. A local negative simulation with `CI=true` and no integration URL produced `0 skip / 1 expected failure`, proving the CI path cannot falsely pass through the local skip.

### Acceptance boundary and frozen inventory

- No network, Docker, browser, provider, PostgreSQL instance, production environment, or production data was accessed. The real PostgreSQL 16 case remains **unrun** for this exact candidate. Local parse/target-boundary execution without a URL passes the destructive-target test and explicitly skips the engine case; this does not prove SQL execution, the four-process lock queue, physical drift detection/restoration, bootstrap rollback, or exact live catalog values.
- Exact dirty paths are now `22` because the existing authenticated admin storage-health route is the explicit on-demand diagnostics caller:
  - `.github/workflows/ci.yml`;
  - `app/api/admin/storage/health/route.ts`;
  - `app/api/warm/route.ts`;
  - `app/api/warm/route.test.ts`;
  - `coordination/session-logs/2026-08-23-A12-parent-postgres-hotpath.md`;
  - `lib/server/userStore.ts`;
  - `lib/server/userStore/authAdminStoragePersistence.ts`;
  - `lib/server/userStore/postgresSchemaReadiness.ts`;
  - `lib/server/userStore/postgresSchemaReadiness.test.ts`;
  - `lib/server/userStore/postgresStorageReadiness.test.ts`;
  - `lib/server/userStoreAuthAdminStoragePersistence.test.ts`;
  - `lib/server/userStoreNovaPostgresAdmission.test.ts`;
  - `lib/server/userStoreNovaPostgresIntegration.test.ts`;
  - `lib/server/userStoreSessionRevisionPostgres.test.ts`;
  - `package.json`;
  - `scripts/nova-postgres-integration-worker.ts`;
  - `scripts/parent-console-gates.test.mjs` (existing explicit narrow A11 borrow);
  - `scripts/parent-console-test-manifest.mjs` (existing explicit narrow A11 borrow);
  - `scripts/postgres-schema-fast-path.test.mjs`;
  - `scripts/run-postgres-readiness-tests.mjs`;
  - `scripts/run-postgres-readiness-tests.test.mjs`;
  - `scripts/storage-admin-snapshot-merge.mjs`.
- Staged paths remain `0`. No commit, push, merge, deploy, credential access, branch/ref mutation, or parent scoped-commit integration occurred. After final local gates, this worktree is frozen for a different independent read-only reviewer.

### Fresh final local verification for the frozen remediation

- `npm run test:postgres-readiness`: runner contract `1/1`; runtime warm/readiness/auth-admin `46/46`; zero failures/skips.
- `node --import tsx --test lib/server/userStore/postgresSchemaReadiness.test.ts lib/server/userStoreSessionRevisionPostgres.test.ts lib/server/userStoreNovaPostgresAdmission.test.ts`: `26/26`.
- `node --test scripts/postgres-schema-fast-path.test.mjs scripts/run-postgres-readiness-tests.test.mjs`: `8/8`.
- `npm run type-check`: exit `0`, zero TypeScript errors.
- `npm run check:imports`: `All local import targets resolved.`; `npm run test:imports`: `7/7`.
- Local integration parse/target guard without a URL: destructive-target test `1/1`, real-engine case `1` explicit skip, exit `0`.
- CI non-skip negative contract with `CI=true` and no URL: `0` skips and `1` intentional failure with the stable message `CI real PostgreSQL integration must provide MAIS_POSTGRES_INTEGRATION_URL.`. This is expected negative evidence, not a failed candidate gate.
- `git diff --check`: rerun after this log update; exit `0` is required before handoff.

## 2026-08-24 Final-Review Remediation: Deterministic Four-Writer Barrier And Private Admin Health DTO

- This amendment closes the two remaining findings from the next independent `REQUEST CHANGES` review without changing the branch tip or integrating any other parent slice. The worktree remains `codex/a12-parent-postgres-hotpath-20260823` at HEAD/upstream `52db8b25ea44b4c81db1b02da8391bd66d81be73`; all changes remain local, uncommitted, and unstaged.
- The four-writer fixture no longer relies on a 1.5-second sleep that exceeds the production mutation `lock_timeout=1000ms`. A reserved fixture connection now owns an explicit session advisory barrier. The first worker obtains the canonical `SHARE ROW EXCLUSIVE` relation lock and app-state row lock, then blocks at a `NODE_ENV=test`-only transaction advisory barrier. The harness starts three more processes, requires the live `pg_locks` view to show exactly one granted and three waiting `ShareRowExclusiveLock` requests on `public.app_state`, and explicitly releases the barrier before awaiting all four results. The real-engine assertions remain four successes plus exactly two revision advances for the two unique IDs.
- Production mutation budgets remain `lock_timeout=1000ms` and `statement_timeout=5000ms`. Only `NODE_ENV=test` can accept the bounded pair `MAIS_TEST_POSTGRES_MUTATION_LOCK_TIMEOUT_MS` / `MAIS_TEST_POSTGRES_MUTATION_STATEMENT_TIMEOUT_MS`; the four-writer fixture uses `30000ms` / `45000ms`. Invalid, out-of-range, production, or internally inverted pairs fall back to the production defaults. Both journal writers consume the same resolver. This gives the fixture sufficient deterministic observation/release budget without weakening production behavior.
- The authenticated admin storage-health route now exposes a dependency-injected handler while retaining the real `GET` wiring to `requireAuthenticatedUser` and `getStorageReadinessSnapshot`. Anonymous and non-admin calls return before diagnostics and are proven not to invoke the readiness dependency. `401`, `403`, `200`, and both auth/storage exception `503` responses explicitly use `Cache-Control: private, no-store, max-age=0`.
- The successful admin response is a dedicated allowlist DTO. It keeps provider/status/readiness/runtime/configured booleans and the admin-requested hot-auth readiness/count scalars, while omitting generated timestamps, database paths/directories, storage messages, data-layer internals, environment-variable names, and table-name inventories. Auth or diagnostic exceptions return only `{ "error": "Service temporarily unavailable." }` with status `503`; PostgreSQL URLs, relation names, and exception messages are not copied into the response.
- The executable handler suite is now part of the formal `test:postgres-readiness` manifest, so CI cannot retain only source-regex coverage for the route.

### Strict RED -> GREEN evidence for this amendment

- Four-writer fixture contract: the focused source test first passed `0/1`, showing the old `capabilityStateLockHoldMs: 1_500` sleep and no explicit barrier, queue observation, release call, or test budget. After the minimal fixture and hook changes it passed `1/1`.
- Test-only budget contract: the executable fake-environment test first passed `0/1` because an invalid `lock=10000ms` / `statement=5000ms` pair was accepted as internally inconsistent. After paired validation/fallback it passed `1/1`; the final combined barrier/budget batch passed `2/2`.
- Anonymous route tracer: first `0/1` because `createStorageHealthRouteHandler` did not exist; after the narrow factory extraction and private `401` response it passed `1/1`.
- Non-admin route: first `0/1` because `403` had no cache header; after the explicit private header it passed `1/1`, while retaining zero diagnostic calls.
- Admin success route: first `0/1` because `200` had no private header and returned the storage persistence object directly; after the allowlist DTO and private header it passed `1/1`.
- Authentication exception: first `0/1` with the injected session/DB error escaping the handler; after the stable private `503` boundary it passed `1/1`.
- Diagnostics exception: first `0/1` with the injected PostgreSQL detail escaping the handler; after the stable private `503` boundary the complete executable route suite passed `5/5`.
- Formal runner contract: first `0/1` because the new executable route test was not in the runner; after the exact manifest addition it passed `1/1`.

### Fresh local verification and real-engine boundary

- `npm run test:postgres-readiness`: formal runner contract `1/1`; executable readiness/warm/admin-route/auth-admin runtime `52/52`; zero failures and zero skips.
- `node --import tsx --test lib/server/userStore/postgresSchemaReadiness.test.ts lib/server/userStoreSessionRevisionPostgres.test.ts lib/server/userStoreNovaPostgresAdmission.test.ts`: `26/26`.
- `node --test scripts/postgres-schema-fast-path.test.mjs scripts/run-postgres-readiness-tests.test.mjs`: `8/8`.
- `npm run type-check`: exit `0`; `npm run check:imports`: `All local import targets resolved.`; `npm run test:imports`: `7/7`.
- `node --import tsx --test lib/server/userStoreNovaPostgresIntegration.test.ts` without a URL: destructive-target guard `1/1`, real-engine case `1` explicit skip, exit `0`. This remains parsing and target-boundary evidence only.
- No network, Docker, browser, provider, PostgreSQL server, production environment, credential, or production data was accessed. Consequently the advisory barrier, one-granted/three-waiting observation, four-process success, exact `+2` revision result, and all other real PostgreSQL SQL/catalog/rollback behavior remain unexecuted for this exact candidate and must be proven later by the same-SHA real-PostgreSQL CI job or an authorized disposable PostgreSQL 16 environment.

### Frozen exact dirty inventory

- Exact dirty paths are now `23`; the only newly introduced path in this amendment is the executable route test:
  - `.github/workflows/ci.yml`;
  - `app/api/admin/storage/health/route.ts`;
  - `app/api/admin/storage/health/route.test.ts`;
  - `app/api/warm/route.ts`;
  - `app/api/warm/route.test.ts`;
  - `coordination/session-logs/2026-08-23-A12-parent-postgres-hotpath.md`;
  - `lib/server/userStore.ts`;
  - `lib/server/userStore/authAdminStoragePersistence.ts`;
  - `lib/server/userStore/postgresSchemaReadiness.ts`;
  - `lib/server/userStore/postgresSchemaReadiness.test.ts`;
  - `lib/server/userStore/postgresStorageReadiness.test.ts`;
  - `lib/server/userStoreAuthAdminStoragePersistence.test.ts`;
  - `lib/server/userStoreNovaPostgresAdmission.test.ts`;
  - `lib/server/userStoreNovaPostgresIntegration.test.ts`;
  - `lib/server/userStoreSessionRevisionPostgres.test.ts`;
  - `package.json`;
  - `scripts/nova-postgres-integration-worker.ts`;
  - `scripts/parent-console-gates.test.mjs` (existing explicit narrow A11 borrow);
  - `scripts/parent-console-test-manifest.mjs` (existing explicit narrow A11 borrow);
  - `scripts/postgres-schema-fast-path.test.mjs`;
  - `scripts/run-postgres-readiness-tests.mjs`;
  - `scripts/run-postgres-readiness-tests.test.mjs`;
  - `scripts/storage-admin-snapshot-merge.mjs`.
- Staged paths remain `0`. No commit, push, merge, deploy, branch/ref mutation, or parent scoped-commit integration occurred. After the final post-log `git diff --check` and status audit, this worktree is frozen for a different independent read-only reviewer.
