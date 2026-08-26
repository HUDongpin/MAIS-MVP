# 2026-08-23 A12/A19 Teacher Notice Email Outbox

- Owner/lane: A12 backend/API platform with A19 provider-environment coordination.
- Branch: `codex/a12-teacher-notice-outbox-20260823`.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a12-teacher-notice-outbox-20260823`.
- Baseline: `9c622c2d0daf9a15b79bb6b90c28c994837dc803` (`fix(notifications): harden Resend teacher notice delivery`).
- Target PR: pending.
- Created: 2026-08-23.
- Expected closeout: 2026-08-24 after renewed independent spec and code-quality review.
- Objective: integrate the reviewed single-recipient Resend adapter through an authorization-safe durable outbox with transaction-external provider I/O, cross-instance leasing, idempotent retry, accepted-versus-delivered state, and cron/manual recovery controls.
- Safety boundary: do not expose provider credentials, recipient email addresses, provider diagnostics, delivery keys, or outbox internals through Parent APIs, logs, commits, screenshots, or reports.
- Release boundary: this slice is not production approval; real provider writes require a dedicated test family and same-SHA deployment evidence.

## Implemented candidate

- Added a server-private `teacher_notice_email_outbox` table for SQLite and PostgreSQL. It is deliberately absent from the application-state `Database` JSON type, public DTOs, and Parent APIs.
- Manual teacher notice publication and missing-work reminder creation now persist the authoritative `app_state` mutation and immutable outbox rows in one physical transaction. Provider I/O occurs only after a short lease transaction commits.
- Publication and claim revalidation fail closed on duplicate business identifiers or recipient tuples, disabled users, missing enrollment, inactive/duplicate guardian authority, acknowledged recipients, non-queued notices, malformed email, missing/duplicate settings, unsupported locale, and content or destination drift. Teacher authority matches the existing operations contract: class owner, active collaborator, or matching teacher/admin school membership; viewer, inactive/revoked collaborator, and foreign membership evidence are rejected.
- Notice authorship and the requesting actor are separate. `teacher_id` remains the immutable notice author on both the notice and durable row, while any currently authorized teacher actor may publish or replay the same row. Claim-time revalidation requires the stable author to remain an active, non-disabled teacher and independently requires at least one current class-mutate authority; revoking one historical actor therefore neither rewrites authorship nor blocks another valid teacher, while loss of every valid authority fails closed.
- Destination email or locale changes generate a new opaque content revision and outbox row while leaving the provider input at exactly `recipientId`, `email`, `locale`, `durableDeliveryKey`, and `contentRevision`.
- PostgreSQL claims lock the authoritative `app_state` row before `FOR UPDATE SKIP LOCKED`; SQLite claims use a dedicated `BEGIN IMMEDIATE` connection. Both issue fresh leases, automatically reclaim expired leases, and complete only through an id-plus-lease-token compare-and-set. Unexpired leases are never swept merely because their attempt count or 23-hour window has been reached.
- Accepted provider work becomes `provider-accepted` only and never stamps the notice `sent_at`. Retryable or ambiguous results use deterministic backoff and stop before eight attempts or 23 hours. Ordinary teacher replay never resets `provider-accepted` or `dead-letter` rows.
- Ordinary recovery resets only blocked rows whose internal allowlisted reason proves no provider call occurred (`delivery-disabled`, `missing-configuration`, or `invalid-configuration`) and only when no provider message ID exists. Provider-contact quota, authentication, sender, security, and permission blocks are not blindly replayed.
- Added a strict teacher-only, origin-free, private/no-store aggregate handler for both existing send route aliases and an exact-Bearer `GET /api/cron/teacher-notice-email` worker route. A successful publication returns `202`; a publication with zero eligible guardian recipients leaves the notice/run unqueued and returns a stable `409`. Responses rebuild fixed aggregate allowlists and discard recipient, email, delivery-key, provider-ID, and diagnostic fields.
- The cron route exports `maxDuration = 300`, and the worker uses a monotonic 290-second invocation deadline with a 60-second pre-claim reserve. It claims at most eight rows per invocation, stops claiming when the reserve is unavailable, and still completes the last already-claimed row through CAS. The default 12-second provider timeout stays inside that budget.
- The worker repeats the monotonic deadline check after claim and before provider I/O. If the remaining reserve is insufficient, a lease-token CAS restores the exact pre-claim status, attempt count, and next-attempt schedule without contacting the provider or consuming retry budget. The aggregate reports only `releasedWithoutProviderContact` and `releaseFailures`; stale tokens cannot restore state.
- SQLite and PostgreSQL schemas enforce centralized locale, attempt-count, HTTP-status, and complete status-field combination invariants. Parsers, inserts, claims, reclaim, and completion repeat the same checks in application code; invalid-row quarantine is bounded and never erases existing provider evidence.
- Invalid-row quarantine in both engines preserves any existing provider message identifier, HTTP status, and completion timestamp; it only supplies a completion timestamp when one is absent.
- PostgreSQL readiness attests exact main and marker relation kinds; every column type, nullability, position, and default; exact ordered primary/unique constraints; exact canonical definitions for all validated checks; marker singleton/version/cardinality; and the eligible btree index's columns, sort/null semantics, validity/readiness, access method, OID-resolved `pg_catalog` opclasses/input types/default status, and collations before latching success.
- Coordination supplied read-only live evidence on 2026-08-23 that the formal Vercel team billing plan is Pro, so the existing five-minute cron cadence is plan-compatible. This is not deployment proof: release preflight must still validate `vercel.json`, the candidate SHA, project linkage, function duration, and scheduler creation without exposing account metadata.

## Exact candidate paths

Tracked modifications:

- `.env.local.example`
- `app/api/teacher/notices/[noticeId]/send/route.ts`
- `app/api/teacher/reminders/run/route.ts`
- `lib/server/userStore.ts`
- `lib/server/userStore/teacherOpsNoticePersistence.ts`
- `lib/server/userStore/teacherOpsReminderPersistence.ts`
- `lib/server/userStoreTeacherOpsNoticePersistence.test.ts`
- `lib/server/userStoreTeacherOpsReminderPersistence.test.ts`
- `vercel.json`

New candidate paths:

- `app/api/cron/teacher-notice-email/route.ts`
- `coordination/session-logs/2026-08-23-A12-A19-teacher-notice-outbox.md`
- `lib/server/teacherNoticeEmailOutboxHandlers.ts`
- `lib/server/teacherNoticeEmailOutboxHandlers.test.ts`
- `lib/server/userStore/teacherNoticeEmailOutboxPersistence.ts`
- `lib/server/userStoreTeacherNoticeEmailOutboxIntegration.test.ts`
- `lib/server/userStoreTeacherNoticeEmailOutboxPersistence.test.ts`
- `lib/server/userStoreTeacherNoticeEmailOutboxSqliteIntegration.test.ts`
- `lib/server/userStoreTeacherNoticeEmailOutboxStorage.test.ts`

The untracked `.vercel` entry is a worktree-local dependency/project-link symlink and is explicitly outside the candidate.

## TDD evidence

- Initial module/schema/publication contract: focused test command failed `0/5` while the outbox module was absent, then passed after the dedicated schema and pure publication contract were implemented.
- Claim revalidation, destination revision, acknowledged/cancelled state, and completion taxonomy were added as failing assertions before implementation.
- Physical storage source contract failed `0/4` before SQLite/PostgreSQL transactions, claim ordering, lease, and CAS integration existed.
- Manual send and missing-work integration source contract failed `0/2`; handler/routes failed `0/4`; Vercel/env contract initially passed only `4/5`; each was implemented to green before proceeding.
- Safe recovery and duplicate recipient-tuple RED on 2026-08-23:
  - Command: `node --import tsx --test lib/server/userStoreTeacherNoticeEmailOutboxPersistence.test.ts`
  - RED: `5 passed / 4 failed`, proving duplicate recipient publication, duplicate tuple claim revalidation, disabled reason attestation, and provider-contact blocked replay were not yet safe.
  - GREEN: `9/9` after the fail-closed tuple checks, `delivery-disabled` internal sentinel, and blocked-recovery allowlist.
- PostgreSQL readiness RED/GREEN:
  - Command: `node --import tsx --test lib/server/userStoreTeacherNoticeEmailOutboxStorage.test.ts`
  - RED 1: `3/4`, missing bounded marker timeouts, safe `to_regclass`, and post-bootstrap attestation.
  - RED 2: `3/4`, missing exact PostgreSQL type/nullability attestation.
  - GREEN: `4/4` after both fixes.
- Cron runtime budget RED/GREEN:
  - Command: `node --import tsx --test lib/server/teacherNoticeEmailOutboxHandlers.test.ts`
  - RED: `4/5`, missing `maxDuration = 300`.
  - GREEN: `5/5`, with a tested 300-second constant and explicit eight-row batch.
- Independent-review remediation RED/GREEN:
  - Command: `node --import tsx --test lib/server/userStoreTeacherNoticeEmailOutboxPersistence.test.ts`.
  - Initial RED: `4 passed / 8 failed`, proving the absent status-combination CHECK, false queued result for zero recipients, student-audience admission, owner-only authority regression, missing centralized row validation, unsafe retryable reset, and missing invocation deadline.
  - PostgreSQL catalog/completion RED: `11 passed / 2 failed`, proving catalog attestation and strict completion validation were absent.
  - Storage/route/reminder REDs separately proved missing exact catalog/version-marker checks, parser validation, no-eligible `409`, and reminder rollback.
  - SQLite runtime RED proved the schema accepted a fractional HTTP status before the integer-type CHECK was added.
  - Final GREEN: focused remediation and integration contracts `40/40`, plus disposable SQLite runtime `1/1` and reviewed adapter `20/20`.
- Renewed independent-review remediation on 2026-08-24:
  - Initial RED command: `env TMPDIR="$PWD/.tmp" node --import tsx --test lib/server/userStoreTeacherNoticeEmailOutboxPersistence.test.ts lib/server/userStoreTeacherNoticeEmailOutboxStorage.test.ts lib/server/userStoreTeacherNoticeEmailOutboxSqliteIntegration.test.ts`.
  - Initial RED: `12 passed / 7 failed`, proving co-teacher publication still collapsed actor into author, exact catalog fixtures were absent, a 299-second claim could reach the provider, SQLite quarantine overwrote completion evidence, relation-kind and evidence-preserving SQL attestations were missing, and no no-contact release dependency existed.
  - No-contact release RED: the targeted deadline tests failed `0/2` because pre-claim status/attempt/schedule were not carried or restored; the first implementation was deliberately rejected because repeated no-contact releases could consume attempts.
  - Aggregate RED: targeted cron-handler test failed `0/1` because the two safe release counters were omitted. PostgreSQL opclass/collation RED failed `0/1` because the fixture carried names rather than schema/OID semantics. Executable SQLite release-CAS RED failed `0/1` because no shared runtime SQL contract existed.
  - Final GREEN: stable author/current actor matrices, provider-evidence-preserving quarantine, post-claim deadline and exact pre-claim restoration, safe aggregate counters, exact PostgreSQL catalog drift fixtures, and executable SQLite stale-token/repeated-release cases all pass in the fresh focused suite below.
- Third independent-review remediation on 2026-08-24:
  - PostgreSQL 16 catalog RED 1: the dedicated loopback test ran `2 passed / 1 failed` because the production catalog query used a reserved-style `pg_collation AS collation` alias and PostgreSQL returned `42601`. After the alias fix, RED 2 remained `2 passed / 1 failed` because the expected canonical state-fields CHECK carried one parenthesis not present in PostgreSQL 16 `pg_get_expr`. The corrected exact golden then passed; no whitespace, parenthesis-stripping, regex, or weakened semantic comparison was introduced.
  - Semantic-authority RED: the targeted pure test ran `0/1` because an active co-teacher plus active viewer record for the same class/teacher did not fail closed. The shared publication/claim authority resolver now validates role/status enums and semantic uniqueness for every class collaborator and class membership. Targeted GREEN was `1/1`; the positive cross-actor matrix remained `2/2`; real SQLite and PostgreSQL claims both quarantine co-teacher/viewer and active/revoked conflicts with `claimed = 0`.
  - Evidence-sweep RED: the real SQLite test ran `0/1` because an expired contradictory attempt-limit lease was classified as ordinary window expiry and its historical completion evidence was at risk. PostgreSQL and SQLite now separate healthy stale reclaim from bounded invalid-row quarantine; quarantine uses `completed_at = COALESCE(completed_at, now)`, preserves provider and HTTP evidence, and clears only the lease. GREEN SQLite was `1/1`, including corrupt pending and retryable rows plus expired attempt-eight and 24-hour-cutoff leases. The final PostgreSQL 16 test independently passed both expired contradiction cases with every evidence-preservation boolean true and `claimed = 0`.
  - Absolute-deadline REDs: the late-claim and 25-row-quarantine pure tests each ran `0/1` because `claimNext` received no deadline; the storage source contract ran `0/2` because claim/release accepted no deadline and used fixed PostgreSQL timeouts. The worker now creates one absolute monotonic deadline, passes it through claim and no-contact release, checks it across schema/lock/sweep/quarantine/authority/pre-lease stages, and derives transaction-local PostgreSQL statement/lock timeouts from the remaining margin. GREEN was `2/2` for the targeted pure cases, `19/19` for the full pure persistence module, and `2/2` for the targeted storage source contract. A late claim never reaches the provider, a no-contact release restores the exact pre-claim attempt/schedule by lease-token CAS, and repeated deadline releases consume no attempts.

## Fresh verification

- Fresh focused adapter, handler, outbox, real-SQLite, notice, and reminder suite: `64/64` passed with zero failures or skips. The count includes the unchanged reviewed provider adapter's `20/20`.
- Fresh disposable real SQLite integration: `1/1` passed. It proves durable queue/replay, configuration-only blocked recovery with attempt/window/error/HTTP preservation, future retry non-reset, provider-accepted non-reset, stale-lease reclaim, unexpired attempt-eight/23-hour lease preservation, two workers claiming once, provider-evidence-preserving invalid-row quarantine, student-only no-eligible rollback, immutable-row conflict rollback, and no `sent_at` stamp.
- TypeScript: `npm run type-check` passed.
- Imports and generated-type hygiene: `npm run check:imports`, `npm run test:imports` (`7/7`), and `npm run check:stray-types` passed.
- Direct imports of the persistence module, handler, cron route, manual-send route, and reminder route passed through `tsx` (`direct-imports-ok`).
- Parent gate: the sandboxed run failed only because 23 process-birth tests could not read OS process metadata. The first visible-process rerun then exposed four macOS Unix-socket `EINVAL` errors caused by an overlong run-owned `TMPDIR`; using the same worktree's shorter `.tmp/x` path passed tooling `69/69` plus runtime `265/265`, with zero skips or failures and no product assertion failure.
- Broad adjacent teacher test sweep: `342/343` passed. The sole deterministic failure is the unchanged `userStoreTeacherOpsOperationsPersistence.test.ts` snapshot-read expectation (`2 !== 1`); both that test and `teacherOpsOperationsPersistence.ts` are byte-unchanged from baseline (`git diff --quiet HEAD -- ...` exited `0`) and are outside this slice. Focused notice/reminder tests are green.
- `git diff --check` passed. HEAD remains the exact baseline `9c622c2d0daf9a15b79bb6b90c28c994837dc803`; all candidate work remains intentionally uncommitted and unpushed pending independent spec and code-quality reviews.
- Third-review final focused evidence supersedes the earlier focused count for the current dirty candidate:
  - Pure adapter/handler/outbox/storage/notice/reminder command: `67` enumerated, `66` passed, `1` explicit skip for the separately invoked real-PostgreSQL case, `0` failed, in `170.355 ms`.
  - Disposable real SQLite production-path integration: `1/1` passed in `24.706 s`, including the added corrupt-retryable evidence case.
  - Disposable PostgreSQL 16 (`postgres:16-bookworm`) final full gate: `3/3` passed, `0` failed/skipped, in `42.933 s`. The test rebuilt its dedicated database `public` schema from the production DDL, attested the exact production catalog, rejected every independent catalog drift, exercised both authority conflicts, and proved attempt-limit plus 24-hour-cutoff evidence preservation. The fixture password was injected only into the test process and was never printed, written, or recorded.
  - `npm run type-check` passed after the final code/test changes. `npm run check:imports`, `npm run test:imports` (`7/7`), `npm run check:stray-types`, direct imports, and `git diff --check` passed.
  - The visible-process parent gate passed tooling `69/69` plus runtime `265/265`, with zero failures or skips. A preceding sandboxed attempt failed `23` process-birth tests solely because OS process metadata was unavailable; the exact unrestricted rerun closed that environment boundary.
  - No test process remained after verification. No candidate path is staged; no commit or push was created.

## Unproved release boundaries

- Disposable local PostgreSQL 16 now proves DDL/catalog parsing, exact catalog drift rejection, class-authority fail-closed behavior, and evidence-preserving invalid-row quarantine. It does not prove Neon/provider-specific behavior, production sizing, cross-region or cross-instance load, managed-provider failover, or same-SHA deployment behavior.
- The shared `createPostgresSchemaReadinessGate` currently caches a successful attestation for the life of a warm module. This slice does not edit that shared fast-path gate while the independent metadata-readiness slice is under review; integration must verify failure-latch reset and post-migration invalidation semantics together. A pre-existing legacy outbox table without the new constraints will deliberately fail closed rather than be silently rewritten and therefore needs an explicit deployment migration decision.
- No Resend call, real recipient email, real `CRON_SECRET`, real provider credential, production write, deployment, or live-domain check was performed.
- The Pro plan evidence establishes schedule eligibility only. Release preflight must validate the same candidate SHA, deployment configuration, actual cron registration, function duration, monitoring, retry backlog behavior, and aggregate-only logs/responses.
- The teacher operations UI and A11 E2E assertions still describe the former synchronous send-attempt response. They were outside this A12/A19 authorized path set and require a separate A13/A11 coordinated update to the new `202` queued aggregate semantics before full browser acceptance.
- The broad adjacent teacher sweep retains one known baseline failure in unchanged `userStoreTeacherOpsOperationsPersistence.test.ts` (`2 !== 1` snapshot-read expectation); both that test and its persistence module remain byte-unchanged by this slice. The current candidate still requires renewed independent spec-compliance and code-quality/security review before any commit or integration decision.

## 2026-08-24 frozen REQUEST CHANGES remediation

This section supersedes the earlier response, no-eligible, readiness-latch, and
schema-version descriptions above for the current uncommitted candidate.

- Manual send now retains the authorized teacher read model and returns `202`
  with `{ notice, attempt, email }`. The additive `email` member is a bounded
  aggregate. Student-only audiences still execute one idempotent WeCom attempt
  even when guardian email is `no-eligible`.
- Notice-send idempotency binds actor, operation, and payload to SHA-256
  digests. The actual queue actor is persisted and re-authorized immediately
  before WeCom contact. Provider-contact start is committed before I/O, so a
  committed/lost response replays the same attempt without another provider
  contact. Raw idempotency keys are not retained.
- Automatic and manual reminders derive a stable WeCom idempotency key per
  durable run. Mixed email eligibility no longer rolls back otherwise valid
  notices/runs. Eligibility is evaluated before the 100-row limit, and the
  stable cursor processed the 205-item regression as `100 + 100 + 5` without
  starvation or duplication.
- PostgreSQL outbox schema version 2 uses exact OID, constraint, backing-index,
  trigger/rule/inheritance, and canonical-expression attestation. Readiness is
  re-attested on every operation; normal runtime does not run DDL. Migration is
  an explicit operation and cold-start contention has a four-worker fixture in
  the dedicated PostgreSQL 16 job.
- Mutating PostgreSQL outbox work uses one disposable `max: 1` client and
  transaction with database-enforced statement, lock, and idle-transaction
  timeouts. The operation uses fresh `clock_timestamp()` lease time and awaits
  client destruction before returning. No `Promise.race` deadline wrapper is
  used. The PostgreSQL 16 fixture checks SQLSTATE `57014`, immediate rollback,
  and absence of a later post-timeout commit.
- Terminal rows receive deterministic 30-day direct-PII and 400-day non-PII
  tombstone deadlines. At the first deadline, family/actor/contact/locale and
  virtual-delivery fields are nulled; only opaque internal IDs, one-way
  fingerprints, delivery-state evidence, and retention timestamps remain. At
  the second deadline the tombstone is deleted.
- Cron authentication uses strict exact Bearer parsing and timing-safe digest
  comparison. Cron output is aggregate-only. New unit/SQLite tests are wired
  into `test:teacher-notice-outbox`, the ordinary CI validation job, and a
  separate non-skip-only PostgreSQL 16 service job.
- A real read-model defect exposed during the final SQLite rerun was fixed:
  a disabled WeCom channel keeps the notice `queued` but no longer writes
  `sent_at`; only an actually `sent` WeCom result can write that timestamp.

Final local evidence for this frozen candidate:

- `npm run test:teacher-notice-outbox`: `63/63` passed, zero failures/skips.
- SQLite production-path integration: `2/2` passed.
- remediation/package/CI contract: `8/8` passed.
- no-PostgreSQL integration boundary: `3` passed, `1` explicit real-engine
  skip, zero failures.
- `npm run type-check`: passed with zero TypeScript errors.
- `git diff --check`: passed; staged paths remain zero.

The dedicated real PostgreSQL 16 job is source-wired but was not runnable in
the ordinary local sandbox (loopback/Docker access was denied). Therefore exact
catalog parsing, four-worker cold migration, database timeout rollback, and
no-post-timeout-commit remain CI/real-engine requirements, not local evidence.
The separate generic PostgreSQL full-writer hot-path candidate is also an
integration dependency; its own real PostgreSQL execution remains unproved.
The A13 client still needs to generate a fresh reminder idempotency key for
each new user intent and retain it only across retries; the server's deterministic
legacy fallback preserves compatibility but deliberately replays identical
legacy requests. No stage, commit, push, merge, deployment, provider contact,
secret access, or production data access was performed.

## 2026-08-24 final PostgreSQL DDL-TOCTOU remediation

This final section supersedes the earlier PostgreSQL runtime-attestation and
candidate-inventory wording for the current uncommitted worktree.

- Publication no longer attests the outbox before opening its mutation
  transaction. Publication and every disposable claim, no-contact release, and
  completion lane now invoke one same-handle helper inside the physical
  transaction.
- That helper applies the fixed transaction-local settings, obtains the shared
  counterpart to migration's exclusive advisory lock, locks
  `public.teacher_notice_email_outbox` and then
  `public.teacher_notice_email_outbox_schema_migrations` in fixed order using
  `ROW EXCLUSIVE` and `SHARE` modes respectively, performs the exact catalog
  and marker attestation, and only then invokes DML. Those modes are compatible
  across ordinary helper transactions while blocking outbox DDL and concurrent
  marker mutation through the attestation-to-DML window.
- The dedicated PostgreSQL 16 fixture now attempts `ALTER TABLE` through a
  second connection while an attested DML transaction holds both relation
  locks. It requires SQLSTATE `55P03`, then proves the same ALTER succeeds after
  commit and the restored exact catalog attests. This fixture was not executed
  locally under the assigned no-PostgreSQL boundary.

The exact candidate is **22 code/config/test paths plus this session log**:

1. `.env.local.example`
2. `.github/workflows/ci.yml`
3. `app/api/cron/teacher-notice-email/route.ts`
4. `app/api/teacher/notices/[noticeId]/send/route.ts`
5. `app/api/teacher/reminders/run/route.ts`
6. `lib/server/teacherNoticeEmailOutboxHandlers.test.ts`
7. `lib/server/teacherNoticeEmailOutboxHandlers.ts`
8. `lib/server/userStore.ts`
9. `lib/server/userStore/teacherNoticeEmailOutboxPersistence.ts`
10. `lib/server/userStore/teacherOpsNoticePersistence.ts`
11. `lib/server/userStore/teacherOpsReminderPersistence.ts`
12. `lib/server/userStoreTeacherNoticeEmailOutboxIntegration.test.ts`
13. `lib/server/userStoreTeacherNoticeEmailOutboxPersistence.test.ts`
14. `lib/server/userStoreTeacherNoticeEmailOutboxRemediation.test.ts`
15. `lib/server/userStoreTeacherNoticeEmailOutboxSqliteIntegration.test.ts`
16. `lib/server/userStoreTeacherNoticeEmailOutboxStorage.test.ts`
17. `lib/server/userStoreTeacherOpsNoticePersistence.test.ts`
18. `lib/server/userStoreTeacherOpsReminderPersistence.test.ts`
19. `package.json`
20. `scripts/teacher-notice-outbox-migration.mjs`
21. `scripts/teacher-notice-outbox-migration.test.mjs`
22. `vercel.json`

Evidence log (not counted among the 22):
`coordination/session-logs/2026-08-23-A12-A19-teacher-notice-outbox.md`.
The worktree-local untracked `.vercel` symlink remains untouched and excluded.

Final safe local evidence after the DDL-TOCTOU remediation:

- The pure same-handle transaction-order regression was RED `0/1` before the
  helper existed and GREEN afterward; its full persistence file is `23/23`.
- The source/order regression was RED `0/1` before publication and worker
  mutations adopted the helper and GREEN afterward; its full storage file is
  `7/7`.
- `npm run test:teacher-notice-outbox`: `71/71` passed, zero failures/skips.
- `npm run type-check`: passed with zero TypeScript errors.
- The no-PostgreSQL integration boundary remains `3` passed and `1` explicit
  real-PostgreSQL-16 skip. The new ALTER barrier fixture is source-wired but was
  deliberately not executed under this session's no-PostgreSQL boundary.
- No PostgreSQL engine, Docker, network, provider, secret, production write,
  stage, commit, push, merge, or deployment operation was performed.

## 2026-08-24 stable teacher-operation error codes

A13's independent queued-client review found that the two different `409`
conditions exposed by this slice were indistinguishable to a safe client. The
API now adds a closed, non-sensitive machine code while retaining the existing
human-readable message:

- `IDEMPOTENCY_CONFLICT` for reuse of one key with a different operation;
- `NO_ELIGIBLE_RECIPIENTS` when no family e-mail target is currently eligible.

The reminder route also emits `IDEMPOTENCY_CONFLICT` for its own `409` result.
No free-form storage or provider detail is exposed, and all responses retain
`Cache-Control: private, no-store`.

RED evidence:

- focused send-handler test: `0/1`; the prior response omitted
  `NO_ELIGIBLE_RECIPIENTS`;
- focused reminder source-contract test: `0/1`; the prior route omitted
  `IDEMPOTENCY_CONFLICT`.

GREEN evidence after the implementation:

- focused send-handler test: `1/1`;
- focused reminder source-contract test: `1/1`.

This amendment changes only paths already present in the exact candidate list:
`lib/server/teacherNoticeEmailOutboxHandlers.ts`, its test,
`app/api/teacher/reminders/run/route.ts`, the existing integration contract,
and this log. It does not change the unresolved real PostgreSQL and same-SHA
integration boundary.

## 2026-08-24 same-SHA provider mapping and relation-hardening amendment

This section supersedes the earlier `71/71` final-count wording for the current
uncommitted candidate. It implements only the outbox half of the frozen Resend
webhook same-SHA dependency; it does not claim that the two worktrees have been
integrated or exercised against a PostgreSQL engine.

- SQLite and PostgreSQL migrations now require the unique partial index
  `teacher_notice_email_outbox_provider_message_uq` on
  `provider_message_id` where that value is non-null. Both exact attesters
  validate the index key, order, predicate, access method, opclass, collation,
  uniqueness, partial status, and (for PostgreSQL) validity/readiness/liveness,
  object counts, and backing relation identity. Hostile same-name shapes fail
  closed.
- A provider-accepted PostgreSQL completion now obtains locks in the global
  order: outbox-schema shared advisory, webhook-schema shared advisory,
  provider-ID exclusive advisory, outbox relation, marker relation, exact
  catalog and marker attestation, then provider-ID assignment. Retryable and
  other non-accepted completion states do not acquire a provider mapping lock.
- SQLite completion remains inside one `BEGIN IMMEDIATE` transaction, exact
  schema attestation happens before DML, and a second outbox row cannot acquire
  the same non-null provider ID. Independent fixture rows now use distinct
  provider IDs; a dedicated duplicate-ID transaction test still proves the
  uniqueness failure and rollback.
- PostgreSQL relation attestation now also requires, for both the outbox and
  schema-marker relations, permanent persistence (`relpersistence = 'p'`),
  disabled RLS, and disabled forced RLS. Independent fake/source regressions
  and source-wired PostgreSQL fixtures cover `SET UNLOGGED`, RLS, and force-RLS
  drift on each relation.
- The dedicated PostgreSQL fixture also covers an `ALTER TABLE` barrier while
  a provider-mapping completion owns the cooperative advisory/relation locks,
  a duplicate provider-ID SQLSTATE `23505`, and hostile public index drift.
  It remains deliberately unrun under this session's no-PostgreSQL boundary.

Strict TDD evidence:

- Initial focused RED: persistence `0/3`, source/order `0/1`, and SQLite
  provider barrier/uniqueness `0/1` before the index, exact attestation, and
  cooperative provider mapping lock existed.
- Initial focused GREEN: persistence `3/3`, source/order `1/1`, and SQLite
  provider barrier/uniqueness `1/1` after implementation.
- Relation-hardening RED: the exact-catalog relation regression was `0/1` and
  the raw-source regression was `0/1` before persistence/RLS attributes were
  queried and attested. Both are GREEN at `1/1` after implementation.
- Combined persistence and storage files: `31/31` passed.
- Formal named gate: `npm run test:teacher-notice-outbox` passed `73/73`, with
  zero failures, skips, cancellations, or TODOs.
- `npm run type-check` passed with zero TypeScript errors.
- Direct imports of the outbox persistence and `userStore` modules passed.
- The dedicated no-engine PostgreSQL target-boundary test passed `1/1`; it did
  not open a database connection or execute the real PostgreSQL fixture.
- `git diff --check` passed.

This amendment touched exactly these six paths already included in the frozen
22-path candidate, plus this session log:

1. `lib/server/userStore.ts`
2. `lib/server/userStore/teacherNoticeEmailOutboxPersistence.ts`
3. `lib/server/userStoreTeacherNoticeEmailOutboxIntegration.test.ts`
4. `lib/server/userStoreTeacherNoticeEmailOutboxPersistence.test.ts`
5. `lib/server/userStoreTeacherNoticeEmailOutboxSqliteIntegration.test.ts`
6. `lib/server/userStoreTeacherNoticeEmailOutboxStorage.test.ts`
7. `coordination/session-logs/2026-08-23-A12-A19-teacher-notice-outbox.md`

The candidate inventory remains exactly 22 code/config/test paths plus this
log. The pre-existing stable `409` code amendments in the handler, handler
tests, reminder route, and integration contract were preserved and not
overwritten by this amendment. The worktree-local untracked `.vercel` symlink
remains untouched and excluded. No stage, commit, push, merge, deployment,
network, provider, secret, Docker, or PostgreSQL operation was performed.

Release boundaries remain: merge the frozen webhook and outbox contracts on
one clean candidate SHA, verify that both sides attest the same outbox v2
marker/catalog and use the same advisory ordering, then run the non-skipping
disposable PostgreSQL 16 gate. Provider side effects and live deployment remain
separate, unproven gates.

## 2026-08-24 independent-review P1 remediation

This amendment closes the four code/configuration findings from the fresh
independent review without expanding the real-provider or real-PostgreSQL
boundary.

- `POST /api/teacher/reminders/run` now delegates to the reviewed handler. A
  JSON array, `null`, malformed JSON, or an explicitly provided `classId`,
  `assignmentId`, `manual`, or `cursor` with the wrong type or an out-of-range
  length returns stable `400 {"error":"Invalid request."}` before persistence.
  The optional opaque ID ceiling is 256 characters and the cursor ceiling is
  500; explicit empty strings fail closed. Legacy empty-body invocation and
  stable fallback idempotency remain supported.
- Authentication, authorization evaluation, database, and schema/runtime
  storage exceptions return only stable
  `503 {"error":"Service temporarily unavailable."}`. Every handler response,
  including 400/401/403/404/409/503, uses `Cache-Control: private, no-store`.
- The PostgreSQL 16 outbox CI job still covers pull requests and manual full
  validation, now also covers the exact post-merge `push` SHA on
  `refs/heads/main`, and runs for GitHub `merge_group` queue SHAs. Checkout is
  the event SHA through `actions/checkout@v4`.
- The formal `test:teacher-notice-outbox` gate now directly includes
  `lib/server/teacherNoticeEmailDelivery.test.ts`, so the provider adapter
  contract is enforced by the ordinary CI validation job as part of the named
  gate rather than remaining an adjacent manual test.

Strict TDD and fresh verification evidence:

- Focused RED: `4/17` failed exactly because the reminder handler export,
  fail-closed behavior, provider contract gate membership, and CI event
  coverage were absent.
- Focused GREEN after the minimal implementation: `17/17` passed.
- Formal named gate: `npm run test:teacher-notice-outbox` passed `96/96`, with
  zero failures, skips, cancellations, or TODOs. The increase from 73 is the
  newly enforced 20-test provider adapter contract plus three reminder handler
  regressions.
- `npm run type-check` passed with zero TypeScript errors after one observed
  RED type mismatch was corrected by narrowing the authenticated role union.
- `npm run check:imports`, `npm run test:imports` (`7/7`),
  `npm run check:stray-types`, direct imports of the handler, outbox
  persistence, and reminder route, and `git diff --check` all passed.

This amendment changed only these seven already-owned code/config/test paths,
plus this existing session log:

1. `.github/workflows/ci.yml`
2. `app/api/teacher/reminders/run/route.ts`
3. `lib/server/teacherNoticeEmailOutboxHandlers.ts`
4. `lib/server/teacherNoticeEmailOutboxHandlers.test.ts`
5. `lib/server/userStoreTeacherNoticeEmailOutboxIntegration.test.ts`
6. `lib/server/userStoreTeacherNoticeEmailOutboxRemediation.test.ts`
7. `package.json`
8. `coordination/session-logs/2026-08-23-A12-A19-teacher-notice-outbox.md`

The frozen candidate inventory remains exactly 22 code/config/test paths plus
this log. The worktree-local untracked `.vercel` symlink remains untouched and
excluded. No stage, commit, push, merge, deployment, network, browser,
provider, secret, Docker, or PostgreSQL operation was performed.

The disposable loopback PostgreSQL 16 test is source-wired and CI-required but
remains deliberately unrun in this no-PostgreSQL remediation. Same-SHA webhook
integration, real provider delivery, and deployed execution remain separate
release gates.
