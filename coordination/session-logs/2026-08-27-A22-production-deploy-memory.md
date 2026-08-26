# A22 Production deploy memory bootstrap

- Owner/lane: A22 production reliability and release engineering
- Branch: `codex/a22-production-deploy-memory-20260827`
- Baseline: protected `main` at `2a2d4f7c0e3b893a2220233e44f6225c16f55aa0`
- Target PR: pending
- Created: 2026-08-27 HKT
- Expected closeout: 2026-08-27 HKT after merge and production certification

## Scope

The first exact-candidate production deploy run `32994294212` installed the
pinned Vercel CLI successfully, then failed closed in the pre-mutation isolated
release build. Node reached its default approximately 2 GB old-space limit
after compilation while checking types. The release wrapper runs this build
before schema apply, Vercel deploy, or alias promotion.

A second read-only production schema preflight, run `32994861092`, confirmed
PostgreSQL 17 and unchanged empty outbox, webhook, and heartbeat states. No
schema mutation or alias promotion occurred in the failed deploy.

This slice gives only the schema/apply/deploy step the same 6144 MB Node
old-space already used by the green CI build jobs, and locks that value in the
workflow contract test. It does not change dependencies, application code,
database behavior, provider credentials, or production variables.

## Verification

- Focused workflow RED: 6 passed, 1 failed solely because the memory setting
  was absent.
- Focused workflow GREEN: 7/7 passed.
- Production deploy/workflow/environment gates: 25/25 passed.
- Isolated `release:build-gate` with the exact 6144 MB setting: passed; 202
  pages generated; temporary build removed; tracked inputs restored.
- Release governance: 91 passed, 11 explicit skips, 0 failed.
- `npm run type-check`: passed.
- `git diff --check`: passed.

## Handoff

Review and merge this exact three-path slice. After merge, regenerate the
fresh default `.next` attestation and all exact-main CI evidence, generate a
new read-only schema confirmation, then retry the serialized production
release. Do not reuse an earlier schema confirmation or build attestation.
