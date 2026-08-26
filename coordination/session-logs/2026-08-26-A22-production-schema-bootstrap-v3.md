# A22/A12 production notification schema bootstrap v3

- Owner lanes: A22 release engineering, borrowing A12 backend schema scope for this reviewed slice.
- Branch: `codex/a22-production-schema-bootstrap-v3-20260826`.
- Baseline: `origin/main` at `1e056b84c87a86ea9def50b9108ed70d5cea8112`.
- Target PR: pending at session creation.
- Creation date: 2026-08-26.
- Expected closeout date: 2026-08-26.
- Write scope: the production teacher-notice schema gate and deploy evidence parser, the reusable webhook v2-to-v3 statement list, their focused tests, and this handoff.

## Problem and implementation

The production database was independently observed as healthy but empty for all seven teacher-notice outbox, Resend webhook, and cron-heartbeat relations. The v2 production gate required an exact outbox dependency before it could emit any migration plan, while the production workflow did not install that dependency. An empty production database therefore could never pass preflight or reach a safe apply step.

The v3 contract now:

1. Classifies outbox state as `empty`, `exact`, or fail-closed `partial`.
2. Binds outbox state and `outbox-install-v2` into the immutable preflight digest and v3 confirmation.
3. Orders an empty-database plan as outbox v2, webhook v3, then heartbeat v2.
4. Re-inspects the confirmed plan under ordered exclusive advisory locks.
5. Applies all confirmed statements in one PostgreSQL transaction and rolls the full transaction back on any conflict or failed exact attestation.
6. Rejects legacy v2 evidence and any v3 evidence without an outbox state at the deployment parser boundary.

## Verification

- TDD RED: focused schema/deploy tests failed in nine expected places before implementation.
- Focused schema/deploy/workflow unit gate: 31 passed, 0 failed.
- TypeScript strict type-check: passed.
- Local real PostgreSQL 16.15 integration: 2 passed, 0 failed.
  - Empty database installed all three schema groups exactly.
  - A deliberate webhook-index conflict after outbox DDL rolled the entire transaction back to zero target relations.
  - Exact rerun with an empty plan left all three migration markers unchanged.
  - Atomic webhook v2 and heartbeat v1 upgrades preserved durable rows and reached exact v3/v2 catalogs.
- `npm run test:teacher-notice-outbox`: 107 passed, 0 failed.
- `npm run test:teacher-notice-resend-webhook`: 59 passed, 0 failed.
- Heartbeat/operational health focused tests: 48 passed, 0 failed.
- `npm run test:parent-console`: manifest gate 76 passed, then runtime 400 passed with 0 skipped and 0 failed.
- `npm run test:release-governance`: 91 passed, 11 intentional Promotion Shadow skips, 0 failed.
- `git diff --check`: passed.

## Evidence boundary and handoff

These results prove the local source, unit contracts, and disposable PostgreSQL 16 behavior only. They do not prove GitHub CI, merge, production mutation, Vercel deployment, or live-domain behavior. The next owner must review and merge this exact slice, wait for exact-SHA CI and promotion gates, then run the protected production schema preflight. Only its freshly emitted v3 confirmation may authorize the serialized production apply/deploy workflow.

No production schema mutation occurred in this session log phase. No credential values, database URLs, confirmation strings, private identifiers, or provider diagnostics are recorded here.
