# 2026-08-27 A22 Production Evidence-Build Recovery

- Agent ID: `A22` production reliability and release engineering
- Coordinated lanes: `A12` for shared storage architecture if required; `A19` for redacted production-environment inspection only
- Branch: `codex/a22-production-evidence-build-recovery-20260827`
- Clean-clone worktree: `/private/tmp/mais-mvp-fix.cqX6HM`
- Baseline: protected `main@889e0f1f23ca46b7f1553c3af07f4a317b1cd4c1`
- Owner objective: recover the protected production schema preflight, transactionally complete the exact legacy readiness-marker contract, deploy the same protected-main SHA, and verify credential login plus session state before separately resolving the auth-funnel failure.
- Existing failure evidence: production release run `33052859351` reached a successful read-only production inspection, failed closed at `evidence-build`, and skipped `deploy`.

## Declared write scope

- `scripts/teacher-notice-production-schema-gate.mjs`
- `scripts/teacher-notice-production-schema-gate.test.mjs`
- `.github/workflows/production-deploy.yml` only if the root cause requires a workflow contract correction
- `lib/server/userStore.ts` and focused storage tests only if diagnosis proves an A12-owned inspection or migration defect
- This session log

## Forbidden scope

- Product UI, curriculum/content data, unrelated API behavior, package upgrades, generated outputs, real `.env*`, secret values, direct workstation production deployment, or any production mutation outside the existing serialized protected-main workflow.

## Plan

1. Reproduce the production `evidence-build` rejection from this clean exact-main clone using the existing redacted Vercel credential loader and read-only database inspection.
2. Identify the rejected structural field or invariant without printing production secrets or snapshot data.
3. Add a regression test, implement the smallest fail-closed correction, and run focused schema/workflow tests, type-check, release governance, and a clean build as required by the touched surface.
4. Push a reviewable branch, obtain protected PR checks, merge through GitHub, and wait for exact-main CI plus Promotion Shadow.
5. Run the protected workflow in `schema-preflight` mode, review the safe confirmation for `app-storage-complete-readiness-v1`, then run `deploy` with that exact confirmation and SHA.
6. Verify transactional exact postflight, same-SHA Vercel promotion, login `200`, session cookie, and `/api/auth/session-state`; diagnose `/api/auth/funnel` separately after primary auth is healthy.

## Safety boundaries

- Production inspection is read-only until the protected workflow emits and binds a valid confirmation.
- No secret or reversible derivative may enter command output, Git, logs, screenshots, or local environment files.
- The current production database and deployment remain unchanged until the reviewed exact-main release reaches its serialized apply step.

## Progress

- Confirmed run `33052859351` bound protected `main@889e0f1f23ca46b7f1553c3af07f4a317b1cd4c1`, completed provider access and read-only PostgreSQL inspection, then failed closed at `evidence-build`; `deploy` remained skipped.
- Confirmed the workstation cannot reach either approved pooled or unpooled production endpoints within the bounded timeout. Only fixed connection-state labels were emitted; no URL, host, credential, database identity, or raw error was printed or persisted.
- Added a strict allowlist of schema-plan failure reasons. Partial app storage, outbox, webhook, heartbeat, and the outbox/webhook consistency invariant can now be distinguished in protected CI while all untrusted or provider/database diagnostics remain `unknown` and redacted.
- Validation completed:
  - `node --test --import tsx scripts/teacher-notice-production-schema-gate.test.mjs` — 24 passed.
  - `npm run type-check` — passed.
  - `npm run test:release-governance` — 91 passed, 11 skipped, 0 failed after fetching the one historical Git object required by the fixture.
  - `npm run build` — passed, including compilation, type validation, and 202 static-page generations.
- No production mutation or deployment has occurred. Next step is protected PR review/merge followed by an exact-main read-only preflight to obtain the safe structural reason.
