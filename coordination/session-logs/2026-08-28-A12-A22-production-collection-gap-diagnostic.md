# A12/A22 production collection-gap diagnostic

- Session slice: `codex/a12-a22-production-collection-gap-diagnostic-20260828`
- Baseline: `71d7b74688b74121246459c6f4215760f66b6528`
- Owner: A12 backend/API platform with A22 production reliability; A10/A11/A19 coordination
- Target PR: pending
- Created: 2026-08-28 HKT
- Expected closeout: 2026-08-28 after protected-main read-only diagnosis

## Scope and assumption

Production schema preflight run `33123170656` was bound to the exact baseline
and failed closed at `evidence-build` with `app-storage-partial` /
`legacy-snapshot-missing-collections`. The deploy job was skipped and no
production mutation occurred.

This slice adds a protected-main-only, serialized, read-only diagnostic mode
that returns only allowlisted required collection names classified as missing
or malformed. It must not return snapshot values, row content, identifiers,
database URLs, provider details, credentials, or a schema confirmation; it
cannot authorize repair or deployment.

## Intended files

- `.github/workflows/production-deploy.yml`
- `RELEASE.md`
- `scripts/production-deploy-workflow.test.mjs`
- `lib/server/userStoreNovaPostgresIntegration.test.ts`
- `scripts/nova-postgres-integration-worker.ts`
- `scripts/teacher-notice-production-schema-gate.mjs`
- `scripts/teacher-notice-production-schema-gate.test.mjs`
- this session log

No `app/`, `components/`, parent API/runtime, `lib/server/userStore.ts`, secret,
environment, deployment, or database-mutation path is in scope.

## Verification to date

- Red phase: the workflow tests rejected the absent third mode/job and the
  schema-gate test module rejected the absent diagnostic exports.
- Focused schema/workflow tests: `38/38` pass after implementation.
- Schema, deploy, workflow, and fast-path focused union: `57/57` pass before
  the final redaction assertion; the narrower final replay is `38/38`.
- `npm run type-check`: pass.
- `npm run test:parent-console`: tooling `76/76`; runtime `403/403`; zero
  skipped and zero failed.
- `npm run test:postgres-readiness`: runner `1/1`; readiness suite `57/57`.
- `npm run test:promotion-gate`: `40/40` pass.
- `scripts/release-governance.test.mjs`: 84 pass, 11 explicit skips, 0 fail.
- `git diff --check`: pass.

The PostgreSQL 16 integration matrix now requires exact missing and malformed
array classifications, array/object multi-gap classifications, and unchanged
payload digest, revision, and timestamp across the diagnostic. Local direct
production connectivity remains unavailable at the bounded connection stage;
the protected GitHub PostgreSQL 16 job and the post-merge serialized diagnostic
remain authoritative. No production mutation or deployment occurred in this
slice before handoff.
