# A12/A19/A10 Resend Webhook Verifier Session

- Date: 2026-08-23
- Agent IDs: A12 backend/API platform; A19 provider configuration; A10 package/config coordination
- Workstream: Resend webhook signature verification and parent-safe event normalization
- Branch: `codex/a12-resend-webhook-verifier-20260823`
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a12-resend-webhook-verifier-20260823`
- Branch owner: A12/A19/A10 borrowed lane
- Target PR: `pending`
- Branch creation date: 2026-08-23
- Expected closeout date: 2026-08-23
- Baseline: `9c622c2d0daf9a15b79bb6b90c28c994837dc803`
- Objective: Add a standalone, test-driven Resend/Svix raw-body verifier that returns only a minimal internal envelope. Storage and route wiring are explicitly deferred.
- Allowed write scope: `package.json`, `package-lock.json`, `lib/server/teacherNoticeResendWebhook.ts`, `lib/server/teacherNoticeResendWebhook.test.ts`, and this session log.
- Forbidden write scope: outbox storage, API routes, UI, environment files, generated outputs, and every other tracked path.
- Intended sequence: inspect existing provider/test conventions; add `svix`; write the full failing contract test; capture the expected RED result; implement the smallest verifier; run focused tests, type-check, import smoke, and exact diff/status review.
- Stop conditions: package/runtime incompatibility, shared-file collision, secret access, or any required edit outside the allowed scope.

## Live status

- Isolated worktree created at the exact baseline.
- No real webhook secret or provider payload will be read, printed, or stored; tests use synthetic signing secrets and payloads only.
- Dependency compatibility: `svix@2.0.0` declares Node `>=22`; the local verification runtime is Node `v24.15.0`, and the consuming formal Vercel project is configured for Node 24.x per the integration owner evidence.

## TDD evidence

- RED command: `node --import tsx --test lib/server/teacherNoticeResendWebhook.test.ts`
- RED result: `0 pass / 1 fail`; expected `MODULE_NOT_FOUND` because the wished-for verifier module did not exist yet.
- Mutation RED proof after the first GREEN: temporarily normalized supported types to `ignored`; the same focused command produced `11 pass / 2 fail` with the precise `email.sent` versus `ignored` assertion diff. The one-line mutation was then removed before the final GREEN run.
- GREEN command: `node --import tsx --test lib/server/teacherNoticeResendWebhook.test.ts`
- Initial GREEN result: `13 pass / 0 fail`; renewed post-review GREEN result: `16 pass / 0 fail`.
- Covered behaviors: exact raw-body binding; 64 KiB UTF-8 limit; Svix header presence, duplication, and syntax; default five-minute old/future rejection; missing, malformed, and wrong secrets; signature-before-JSON behavior; supported lifecycle allowlist; unknown signed event normalization; strict UUID provider message ID; multi-signature rotation; safe allowlisted output with no recipient, subject, HTML, provider headers, payload, or secret echo.

## Verification evidence

- Existing delivery adapter baseline: `node --import tsx --test lib/server/teacherNoticeEmailDelivery.test.ts` -> `20 pass / 0 fail`.
- TypeScript: `npm run type-check` -> exit `0`.
- Dependency resolution: `npm ls svix --depth=0` -> `svix@2.0.0`.
- Direct import smoke: `node --import tsx --eval "import('./lib/server/teacherNoticeResendWebhook.ts')..."` -> exit `0` and exported verifier is a function.
- Import target audit: `npm run check:imports` -> `All local import targets resolved.`
- Diff hygiene: `git diff --check` -> exit `0`; status contains exactly the two dependency manifests, verifier, verifier test, and this session log.
- `npm install svix` reported an aggregate `4 high severity vulnerabilities` for the full installed dependency tree. No broad audit remediation or unrelated package upgrade was attempted inside this bounded slice.

## Handoff

- First independent review result: `NOT READY (0 critical / 2 important / 1 minor)` because timestamp parsing allowed JavaScript calendar normalization, signature-before-JSON precedence lacked a negative regression, and the exact 64 KiB acceptance boundary lacked a regression.
- Remediation RED: after adding the review regressions, the focused suite produced `14 pass / 1 fail`; a signed `2026-02-31T01:02:03.004Z` payload was incorrectly accepted and normalized to `2026-03-03T01:02:03.004Z`.
- Remediation: RFC 3339 components now use explicit numeric ranges plus a Gregorian calendar component round-trip before offset conversion. Impossible dates, `24:00`, invalid minute/second values, non-leap February 29, and invalid numeric offsets fail closed. Valid leap days and positive/negative offsets normalize to the canonical UTC instant.
- Added precedence proof: malformed signed JSON with either a wrong configured secret or a one-character tampered signature returns only `signature-verification-failed`, establishing verification before parse.
- Added body-boundary proof: an exactly `65,536`-byte valid signed JSON payload is accepted, while larger UTF-8 input is rejected.
- Remediation GREEN: the final focused verification reports `16 pass / 0 fail`; final type-check, direct import smoke, import-target audit, and diff check all exit `0`.
- Status: Implemented and locally verified; intentionally uncommitted and unpushed pending renewed independent specification and security review.
- Storage, replay-event persistence, monotonic outbox state transitions, route wiring, webhook registration, and live-secret placement are not part of this slice.
- Build not run: the helper is deliberately not route-wired in this slice; the integration candidate must run the clean build after route/storage composition.

## 2026-08-24 A12 durable webhook amendment

- Amendment baseline: committed branch tip `f1234d2b2393321245c00b0af3c352c8a8babf09`; the worktree was clean before the amendment.
- Expanded owner assignment: A12 was explicitly authorized to add the raw-body route, durable webhook schema v2, SQLite/PostgreSQL persistence, migration tooling, focused tests, package scripts, CI wiring, and this log. No commit, stage, push, deploy, provider call, secret read, network access, or `.vercel` access was authorized or performed.
- Frozen integration dependency: runtime and migration require the independently frozen, unmerged teacher-notice email outbox v2 relation `teacher_notice_email_outbox`, including its stable `id` and `provider_message_id` columns. This slice does not copy, merge, or normalize the outbox candidate. Missing, partial, ambiguous, or malformed dependency state fails closed.

### Amendment TDD evidence

- Raw-body/handler RED: the two focused files reported `12 pass / 7 fail`, with expected missing priority/comparator exports, missing exact schema/ns fields, and a missing handler module.
- Raw-body/handler GREEN: `21 pass / 0 fail` after adding a streaming 65,536-byte reader, exact common supported-event schema checks, nanosecond ordering, event priority, safe responses, and signed-unknown acknowledgement without persistence.
- Durable SQLite RED: the persistence test failed with `MODULE_NOT_FOUND`; the later PostgreSQL ordering RED reported `4 pass / 2 fail` for missing advisory dependency and transaction helper.
- Durable GREEN: the persistence suite reached `6 pass / 0 fail`, then `7 pass / 0 fail` after a new RED/GREEN regression for empty/exact/partial atomic migration state.
- Runtime route/store RED: both focused files failed with the expected missing store and route modules. GREEN: `3 pass / 0 fail` with explicit SQLite/PostgreSQL selection and no fallback from configured PostgreSQL.
- Formal migration/CI RED: the migration wiring test failed because the guarded CLI did not exist. GREEN: the formal package gate now reports `32 pass / 0 fail` across the verifier, handler, store, SQLite durability, route, migration, and CI/package contract tests.

### Amendment contract

- The verifier accepts only the seven supported Resend email lifecycle types, requires the common Resend data schema for supported events, preserves up to nine fractional timestamp digits as a decimal epoch-nanosecond value, and orders by `(occurredAtNs, eventPriority, eventId)` using one code-unit comparator.
- The route reads at most 64 KiB from the request stream, verifies the exact bytes, and returns only stable no-store JSON. Signed unknown events and signed unmatched known events return safe `200 { received: true }`; invalid signature/header, invalid signed body, oversize, and unavailable persistence use stable 401/400/413/503 responses without diagnostics or payload echo.
- The durable schema stores only event ID, provider message UUID, allowlisted event type/order fields, opaque matched outbox ID, and retention timestamps. Raw body, from/to, subject, provider diagnostics, secret material, and family content are never persisted or returned by the safe read DTO.
- SQLite migration and mutation use explicit schema v2 attestation and `BEGIN IMMEDIATE`. PostgreSQL runtime uses a safe transaction-local search path, frozen-outbox schema shared advisory lock, webhook-schema shared advisory lock, per-provider-message exclusive advisory lock, fixed relation locks, fresh exact catalog/marker attestation, and only then DML.
- Concurrent identical events create one journal row. Conflicting event-ID reuse and multiple outbox rows for one provider message fail closed. Out-of-order events remain journaled but cannot regress the aggregate state. A durable unmatched event can reconcile on an identical later replay after the outbox mapping appears.
- Tombstones contain no direct family payload and expire after 400 days. The explicit migration is atomic, installs only from empty state, is idempotent for an exact v2 installation, and rejects partial or malformed state without normalization.

### Amendment verification and remaining boundary

- `npm run test:teacher-notice-resend-webhook` -> `32 pass / 0 fail`.
- Final `npm run type-check`, `npm run check:imports`, and `git diff --check` all exited `0` after the last test-only TypeScript narrowing amendment.
- The PostgreSQL 16 integration file is wired to a dedicated, non-optional CI job and fails when `MAIS_RESEND_WEBHOOK_POSTGRES_INTEGRATION_URL` is absent. It was not run locally because this assignment prohibited loopback/network and escalation; no existing shared PostgreSQL container was mutated.
- No real Resend secret, real provider payload, production registration, provider delivery, deployment, or live-domain behavior was tested. The candidate must not merge before the frozen outbox v2 slice is integrated and the dedicated PostgreSQL 16 job passes on the same candidate SHA.
- Amendment status: uncommitted and unstaged, frozen for independent review after the final safe local gates.

## 2026-08-24 independent-review remediation

- Remediation baseline and comparison point: `f1234d2b2393321245c00b0af3c352c8a8babf09` in the same isolated worktree. This round remained unstaged and uncommitted. No network, provider, secret, real PostgreSQL, push, merge, deploy, or production operation was performed.
- Review disposition entering this round: `REQUEST CHANGES` on seven groups: unsafe mutation targets; an outbox impostor dependency and mapping race; incomplete PostgreSQL/SQLite catalog attestation; replay-dependent unmatched reconciliation; non-operational retention; incomplete SQLite migration exactness; and signed unsupported events being coupled to current known-event fields.

### Remediation RED to GREEN

- Signed unsupported event branch: targeted RED `0/2` (`invalid-payload`/HTTP 400); targeted GREEN `3/3`. A verified, bounded unknown type now returns only `{type:"ignored"}` before known-event `data`, email ID, recipient, subject, or timestamp validation, and never enters persistence.
- Guarded migration target: initial behavioral RED failed because the target-guard module did not exist; the first full CLI contract run then exposed the missing CI target-bound confirmation. GREEN established explicit provider selection, loopback/container-only disposable PostgreSQL database names, canonical SQLite roots, action-and-target-bound SHA-256 confirmation, and failure before connection/file open.
- Canonical-path follow-up: a lexical allowlisted path escaping through a child symlink and an allowlist root that was itself a symlink both produced RED; the same behavioral test is GREEN after physical ancestor resolution and canonical-root containment checks.
- SQLite exact migration/readiness: targeted RED `0/2` (non-idempotent table creation and false-positive drift); GREEN `2/2`. Migration now runs empty/exact/partial inspection, install, marker write, and post-attestation in one `BEGIN IMMEDIATE`; exact retry is a digest-preserving no-op and malformed state rolls back without normalization.
- PostgreSQL catalog: targeted RED `0/1` because the exact catalog attester was absent; GREEN `1/1`. The runtime reader now checks every public relation, column position/type/nullability/default, constraint definition/key/FK target/action/backing OID, index access/key/order/predicate/opclass/collation/validity/readiness/liveness, marker/comment, trigger/rule/inheritance count, and unexpected object count for both webhook v2 and the frozen outbox v2 dependency.
- Same-transaction DDL barrier: relation-lock order targeted RED `0/1`; GREEN `1/1`. Migration and runtime lock the outbox table and marker before exact dependency attestation, then webhook tables/marker in fixed order; provider lookup uses `FOR SHARE`; DML starts only after same-transaction exact attestation.
- No-replay reconciliation and retention: targeted RED `0/3` for missing maintenance/transaction/retention contract; GREEN `3/3`, followed by concurrent exact-once and safe-read coverage. Bounded maintenance reconciles every previously unmatched row for each selected provider ID with the canonical `(occurredAtNs, priority, eventId)` comparator, then deletes bounded 400-day tombstones in the same transaction. SQLite uses `BEGIN IMMEDIATE`; PostgreSQL uses the database clock and `FOR UPDATE SKIP LOCKED`.
- PostgreSQL maintenance/read model: targeted RED `0/1` for each missing exported operation; GREEN `1/1`. The real-engine fixture now covers no-replay reconciliation, safe read disappearance after retention, hostile `search_path`, malformed-schema before/after digest, and an `ALTER TABLE` lock barrier, but is intentionally unrun locally.
- Operational maintenance: route/handler RED `0/2` because both modules were absent; GREEN `4/4`. The five-minute cron is fixed at 100 reconciliation providers and 100 retention rows, requires a configured 32-512 byte `CRON_SECRET`, compares fixed SHA-256 digests with `timingSafeEqual`, returns only aggregate counts, and sets `Cache-Control: private, no-store` on success and failure.
- Store fail-closed follow-up: targeted RED `0/1` showed an unknown provider typo silently selected SQLite; GREEN `1/1` rejects any configured value other than `sqlite` or `postgres` before either store is called.

### Exact outbox composition contract

- This webhook candidate uses the frozen outbox worktree only as a read-only source. It does not copy or mutate that worktree and it does not install outbox DDL at runtime.
- The webhook dependency is now the complete frozen outbox v2 table and PostgreSQL migration-marker/catalog contract, not the former two-column same-name impostor.
- Same-SHA integration requires one explicit outbox amendment before this candidate can run:
  1. add `teacher_notice_email_outbox_provider_message_uq`, a unique partial index on non-null `provider_message_id`, to SQLite and PostgreSQL outbox migrations and both exact catalog attesters;
  2. in the outbox provider-accepted completion transaction, acquire the outbox shared schema advisory, webhook shared schema advisory, and `mais-resend-teacher-notice-webhook-v2:<providerMessageId>` exclusive mapping advisory before the outbox relation lock, exact attestation, and provider-ID assignment;
  3. keep SQLite provider assignment under `BEGIN IMMEDIATE` and include the same unique partial index in its exact schema contract.
- The webhook side already acquires that exact per-provider advisory before relation locks, holds `FOR SHARE` on an existing mapping row, rejects catalog drift, and repairs the webhook-first/no-mapping ordering through bounded maintenance. Until the outbox amendment lands on the same SHA, composition is intentionally fail-closed rather than simulated.

### Current evidence and boundaries

- Final formal focused package gate: `npm run test:teacher-notice-resend-webhook` -> `53 pass / 0 fail` after the fail-closed provider and canonical-root symlink regressions.
- Exact-current `npm run type-check`, `npm run check:imports`, and `git diff --check` -> exit `0` after the final PostgreSQL fixture, cron, provider, and canonical-target amendments.
- The PostgreSQL 16 test is non-skipping and guarded by an explicit `destroy-test` provider/target confirmation in CI. It remains **UNRUN locally** because this remediation expressly prohibited PostgreSQL/network access. Source contracts and SQLite behavior do not replace that evidence.
- Deployment still requires the same-SHA outbox amendment, a successful disposable PostgreSQL 16 job, explicit migration execution, a configured strong `CRON_SECRET`, Resend webhook registration/secret placement, and live no-store/header/provider verification. No production-ready or provider-side claim is made by this log.

### Final candidate inventory

- Branch remains `codex/a12-resend-webhook-verifier-20260823` at unchanged HEAD `f1234d2b2393321245c00b0af3c352c8a8babf09`.
- Final inventory is exactly `24` code/config/test paths plus this session log (`25` dirty paths total), with `0` staged paths:
  - `.github/workflows/ci.yml`
  - `app/api/cron/teacher-notice-resend-webhook-maintenance/route.test.ts`
  - `app/api/cron/teacher-notice-resend-webhook-maintenance/route.ts`
  - `app/api/webhooks/resend/teacher-notices/route.test.ts`
  - `app/api/webhooks/resend/teacher-notices/route.ts`
  - `lib/server/teacherNoticeResendWebhook.test.ts`
  - `lib/server/teacherNoticeResendWebhook.ts`
  - `lib/server/teacherNoticeResendWebhookHandler.test.ts`
  - `lib/server/teacherNoticeResendWebhookHandler.ts`
  - `lib/server/teacherNoticeResendWebhookMaintenanceHandler.test.ts`
  - `lib/server/teacherNoticeResendWebhookMaintenanceHandler.ts`
  - `lib/server/teacherNoticeResendWebhookStore.test.ts`
  - `lib/server/teacherNoticeResendWebhookStore.ts`
  - `lib/server/userStore/teacherNoticeEmailOutboxV2Dependency.ts`
  - `lib/server/userStore/teacherNoticeResendWebhookPersistence.test.ts`
  - `lib/server/userStore/teacherNoticeResendWebhookPersistence.ts`
  - `lib/server/userStoreTeacherNoticeResendWebhookPostgresIntegration.test.ts`
  - `package.json`
  - `scripts/run-teacher-notice-resend-webhook-tests.mjs`
  - `scripts/teacher-notice-resend-webhook-maintenance.mjs`
  - `scripts/teacher-notice-resend-webhook-migration.mjs`
  - `scripts/teacher-notice-resend-webhook-migration.test.mjs`
  - `scripts/teacher-notice-resend-webhook-target-guard.mjs`
  - `vercel.json`
  - `coordination/session-logs/2026-08-23-A12-A19-A10-resend-webhook-verifier.md` (log)

## 2026-08-24 second independent-review remediation

- Second review disposition entering this round: `REQUEST CHANGES` with four Important findings: a dangling SQLite symlink could bypass the former existence/realpath check; the maintenance handler could serialize extra persistence fields; the reconciliation limit counted providers instead of durable event rows; and PostgreSQL exact catalog attestation omitted relation permanence/RLS plus the route had no total invocation deadline.
- This round remained confined to the same isolated branch/worktree. No stage, commit, push, network, secret, provider, browser, real PostgreSQL, deployment, DNS, or production operation was performed.

### Review RED to GREEN evidence

- Privacy-safe maintenance DTO: regression input added provider message ID, email, recipient, and nested diagnostics; RED serialized the extras, while GREEN projects exactly five nonnegative aggregate counts and two booleans. Malformed counts or flags now fail closed to generic private no-store `503`.
- Canonical SQLite target: a dangling final-component symlink produced behavioral RED and could have created an outside file. GREEN uses `lstat` for every existing path component, rejects both live and dangling symlinks, requires canonical existing parents, and re-prepares plus fingerprint-compares the target immediately after confirmation before opening storage. A malicious same-user nanosecond replacement remains an operating-system TOCTOU boundary and is not represented as impossible.
- Hard row budget: a single provider with 213 unmatched events produced RED `[213,0,0]`; GREEN selects stable event rows rather than provider groups and reconciles `[100,100,13]`, with `hasMoreReconciliation` `[true,true,false]`. PostgreSQL uses `FOR UPDATE OF event SKIP LOCKED`; SQLite uses the same stable total order under `BEGIN IMMEDIATE`.
- Exact relation security: both frozen outbox relations and all three webhook relations now require `relpersistence='p'`, `relrowsecurity=false`, and `relforcerowsecurity=false`. Unit mutations reject every field class; the real PostgreSQL fixture contains reversible UNLOGGED, RLS, and FORCE RLS drift probes for both dependency and webhook relations.
- Total maintenance deadline: route `maxDuration` is 30 seconds; the authorized handler creates one monotonic absolute deadline 20 seconds after start and forwards the same clock through the configured store. PostgreSQL maintenance uses 1-second lock, statement, and transaction-idle limits plus deadline checks between lock/attestation/DML phases and bounded loops. SQLite checks the same deadline inside its transaction. A deterministic RED/GREEN regression proves deadline expiry after reconciliation begins rolls back both the event match and aggregate state instead of committing a partial result.
- Same-SHA dependency composition: the frozen outbox dependency snapshot includes the exact non-null unique provider-message index, the two permanent/non-RLS relation contracts, exact marker/catalog counts, and the shared advisory/provider-mapping lock order required by the current outbox candidate. The webhook worktree still does not install or normalize outbox storage.

### Current verification and boundary

- Targeted remediation gate: `33 pass / 0 fail`.
- Final formal `npm run test:teacher-notice-resend-webhook`: `57 pass / 0 fail`, `0 skip`.
- Final `npm run type-check`, `npm run test:imports`, and `git diff --check`: exit `0`.
- The real PostgreSQL 16 integration remains source-wired and non-skipping but **UNRUN locally**. Accordingly, the current branch is locally verified only; it is not approved for merge, migration, deployment, or provider registration until the outbox and webhook slices are composed on one clean candidate SHA and the disposable PostgreSQL gate passes there.
- Current inventory remains exactly the 24 code/config/test paths listed above plus this session log, with no `next-env.d.ts` drift and no staged paths.
