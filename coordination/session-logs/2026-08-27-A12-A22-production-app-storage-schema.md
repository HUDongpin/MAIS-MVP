# 2026-08-27 A12/A22 Production App Storage Schema Gate

- Owners: A12 Backend/API platform lead and A22 Production reliability/release engineering lead
- Branch: `codex/a12-a22-production-app-storage-schema-20260827`
- Worktree: `.worktrees/a12-a22-production-app-storage-schema-20260827`
- Target PR: pending
- Created: 2026-08-27 (Asia/Hong_Kong)
- Expected closeout: 2026-08-27
- Baseline: protected `main@f001a9570f2a0ef066b1a83a33619f72215ff354`
- Declared slice: extend the serialized production schema release gate so it read-only inspects, exact-candidate confirms, idempotently installs, and independently re-attests the canonical Postgres app-state, readiness-marker, hot-auth, and existing teacher-notice schemas before deployment.
- Hard boundary: no feature UI changes, no local or Vercel secret-file writes, no secret values in output or evidence, no unbounded production mutation, and no production account/data write outside the separately authorized dedicated synthetic-family acceptance flow.

## Initial evidence boundary

- The exact `f001a957` candidate built, deployed, and passed protected-candidate plus `www.mais.ac` and `www.mais.hk` read-only smoke checks.
- The existing production schema preflight proved PostgreSQL 17 and exact teacher-notice outbox/webhook/heartbeat schemas only.
- A bounded synthetic-family registration and a non-mutating invalid-login prime both returned stable `503` with private no-store headers before creating any family data.
- Safe runtime diagnostics established that the configured storage provider is Postgres and that `POSTGRES_URL` is a TLS pooler URL, while the application readiness result remained false because canonical app-state/auth relations were absent or incomplete.
- Therefore production functionality remains blocked until this gate is tested, reviewed, merged, run against a fresh main SHA, and followed by a new exact-SHA deployment and synthetic acceptance run.

## Planned verification

- Add RED tests for app-storage empty/exact/partial plans, target-bound confirmation, apply revalidation, strict postflight, redaction, and workflow/deploy evidence parsing.
- Run focused schema/workflow tests, Postgres readiness tests, type-check, release governance, and a clean production build before handoff.
- After merge, generate a new read-only production confirmation, apply only its confirmed plan, deploy the same SHA, and repeat public-domain and dedicated synthetic-family acceptance.

## Local implementation evidence

- The production schema evidence contract is version 4 and binds the clean candidate SHA/tree, approved Vercel project/team, stable database-target fingerprint, PostgreSQL major version, exact app-storage seed mode, app-storage state, teacher-notice states, aggregate-only statistics, operation plan, and preflight digest.
- Read-only preflight now classifies the canonical app-state/readiness/hot-auth contract as `empty`, `exact`, or fail-closed `partial`; it uses a repeatable-read read-only transaction, bounded timeouts, and the shared storage-contract advisory lock.
- Apply is admitted only in the serialized protected-main `workflow_dispatch` context. An `empty` app-storage plan reuses the canonical transactional bootstrap under the exclusive storage-contract lock, rechecks emptiness before DDL, and requires strict same-connection plus independent exact postflight evidence.
- Runtime/build Vercel app-storage settings must match exactly. Only the allowlisted bootstrap settings are passed transiently in memory; all prior process values are restored in `finally`, and no secret value is emitted or persisted.
- Focused production schema, deployment parser, workflow, and static storage-contract tests: `49/49` passed.
- Parent Console gate: governance/preflight `76/76` passed; runtime `400/400` passed with `0` skipped.
- PostgreSQL readiness gate: runner contract `1/1` and reviewed readiness suite `56/56` passed.
- Exact-source deployment test bundle: `161/161` passed.
- Release governance: `91` passed, `11` explicit Promotion Shadow skips, `0` failed.
- `npm run type-check`, `git diff --check`, and the isolated `npm run build` production build passed. The build restored tracked Next inputs; no `next-env.d.ts` drift or generated tracked change remains.
- Current evidence is local source/build proof only. The new app-storage mutation path has not yet touched production. A real PostgreSQL service integration run, protected PR checks, merge, exact-main schema preflight/apply, deployment, and dedicated synthetic-family acceptance remain mandatory.
