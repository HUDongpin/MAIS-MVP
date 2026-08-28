# A12/A22 guardian-invitation snapshot repair v2

- Session slice: `codex/a12-a22-guardian-invitation-snapshot-repair-v2-20260828`
- Baseline: `6456de903e583d13e6d7b36505e079fbce5ca617`
- Owner: A12 backend/API platform with A22 production reliability; A10/A11/A19/A23 coordination
- Target PR: pending
- Created: 2026-08-28 HKT
- Expected closeout: 2026-08-28 after protected-main production preflight/deploy evidence

## Production evidence and assumption

Protected-main read-only collection-gap diagnostic run `33127539898`, bound to
the exact baseline/tree, returned one missing array:
`guardian_invitations`; all other required arrays/objects were exact and no
collection was malformed. The workflow's preflight and deploy jobs were
skipped. No production mutation occurred.

The field is an independent first-class snapshot collection introduced by the
reviewed guardian invitation lifecycle. Both current and already deployed
runtime code normalize an absent/non-array invitation source to an empty
in-memory list; active guardian authority remains in the separate
`guardian_links` collection. This slice may persist that already established
empty default only when `guardian_invitations` is the sole missing key.

## Version boundary

- v1 remains exactly `teacher_notice_delivery_attempts` only.
- v2 is exactly `guardian_invitations` only.
- Missing both keys, any other missing key/object, or any malformed collection
  remains fail closed.
- v1 and v2 confirmations/operations are not interchangeable.

No parent UI/API code, `lib/server/userStore.ts` runtime bytes, secret,
environment value, live data row, deployment, or alias is modified before the
new versioned operation passes review and protected-main gates.

## Files in the slice

- `RELEASE.md`
- `lib/server/userStoreNovaPostgresIntegration.test.ts`
- `scripts/deploy-vercel-production.mjs`
- `scripts/deploy-vercel-production.test.mjs`
- `scripts/nova-postgres-integration-worker.ts`
- `scripts/postgres-schema-fast-path.test.mjs`
- `scripts/teacher-notice-production-schema-gate.mjs`
- `scripts/teacher-notice-production-schema-gate.test.mjs`
- this session log

## Verification to date

- Red phase: builder, schema plan, combined apply, and deploy evidence tests
  rejected the absent v2 operation/state; type-check also caught a test-fixture
  metadata accessor before handoff.
- Focused schema/deploy/fast-path suite: `50/50` pass.
- `npm run type-check`: pass.
- `npm run test:parent-console`: tooling `76/76`; runtime `403/403`; zero
  skipped and zero failed.
- `npm run test:postgres-readiness`: runner `1/1`; readiness suite `57/57`.
- `npm run test:promotion-gate`: `40/40` pass.
- `scripts/release-governance.test.mjs`: 84 pass, 11 explicit skips, 0 fail.

The PostgreSQL 16 integration test requires the v1 worker to reject the v2
fixture without mutation, then requires v2 to add exactly one empty
`guardian_invitations` array, increment revision once, preserve the complete
payload and `guardian_links`, complete the canonical readiness marker, reject
a repeated v2 run, and close all clients. Local Docker is unavailable; PR CI
remains the authoritative real-engine result.
