# 2026-06-29 A22 US Region Alignment

- Agent: A22, production reliability and release engineering.
- Coordination: A19 owns provider/env parity; A12 owns core classroom API contracts; A07 owns AI Tutor route behavior.
- Baseline: branch `codex/A22-us-region-alignment` from `main` at `cef544e09`.
- Dependency state: `npm install` completed in isolated worktree; no root dependency files changed.
- Objective: align US classroom Vercel Node functions with a US West Postgres/Neon region and guard core classroom APIs from Hong Kong route pinning.

## Plan

1. Add a failing guard test for Vercel region config and core classroom API route pinning. Completed; first run failed because `vercel.json` was missing.
2. Add deploy config for US West Node functions without changing provider credentials or secrets. Completed with `regions: ["pdx1"]`.
3. Record A22/A19/A07/A12 handoff notes for Neon/Postgres and AI Tutor region ownership. Completed in `coordination/reports/2026-06-29-A22-us-region-alignment.md`.
4. Run focused guard test and type-check/build checks as feasible. Completed with focused guard green, full type-check red from baseline drift.

## Intended Write Scope

- `vercel.json`
- `scripts/vercel-region-config.test.mjs`
- `coordination/session-logs/2026-06-29-A22-us-region-alignment.md`
- `coordination/reports/2026-06-29-A22-us-region-alignment.md`

## Forbidden Scope

- Real `.env*` secret files, Vercel secret values, database URLs, provider behavior, live deployments, and unrelated dirty-root changes.

## Notes

- Official Vercel docs say `vercel.json` `regions` changes the default Function region, while per-route `preferredRegion` is route segment metadata.
- Official Vercel region docs list `pdx1` as Portland / `us-west-2`.
- Official Neon docs list AWS US West Oregon as `aws-us-west-2` and recommend choosing the Neon region closest to the application server.

## Verification

- Red test: `node --test scripts/vercel-region-config.test.mjs` failed because `vercel.json` was missing.
- Green test: `node --test scripts/vercel-region-config.test.mjs` passed, 2/2 tests.
- `git diff --check` passed.
- `npm run type-check` failed before build on broad baseline drift unrelated to this slice. Representative failures included missing `@/lib/server/aiGovernance`, missing `@/lib/difficulty`, userStore export drift, teacher operations/review lesson type drift, and visualization lab type drift.
- `npm run build` not run after the type-check blocker.
