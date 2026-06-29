# 2026-06-29 A19 Vercel Postgres Region

- Agent: A19, API configuration and deployment env readiness.
- Branch/worktree: `codex/A19-vercel-postgres-region` at `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A19-vercel-postgres-region`.
- Baseline: `main` commit `cef544e09`.
- Objective: redacted confirmation that Vercel Preview/Production `POSTGRES_URL` points to Neon US West.

## Plan

1. Inspect current root/linkage and available auth without printing secrets. Completed.
2. Check approved local DOCX for Vercel credential presence only. Completed; no Vercel entry/token pattern found.
3. Add a no-print verifier for Vercel `POSTGRES_URL` region classification. Completed with both REST and `vercel env run` process-env modes.
4. Record current blocker and exact completion evidence. Completed.

## Evidence

- Vercel CLI installed.
- Root project link present.
- No shell Vercel token/project env vars, but Vercel CLI auth is present.
- No Vercel entry/token pattern in approved DOCX.
- No Neon/Postgres URL or US West signal in approved DOCX.
- Cloud Preview `POSTGRES_URL` verified as Neon `aws-ap-southeast-1`, not US West.
- Cloud Production `POSTGRES_URL` verified as Neon `aws-ap-southeast-1`, not US West.
- Cloud Preview/Production related DB env family also classifies as Neon `aws-ap-southeast-1`; no US West fallback variable found.
- Existing admin storage health route does not prove Neon region.

## Verification

- Red test: verifier test initially failed because implementation file was missing.
- Green test: `node --test scripts/verify-vercel-postgres-region.test.mjs` passed, 4/4.
- Safe Vercel cloud env run from clean A19 worktree returned no secrets and classified both Preview and Production as Neon `aws-ap-southeast-1`.
- Safe Vercel cloud env family scan returned no secrets and found no US West DB variable to promote.
- `git diff --check` passed.

## Stop Condition

The requested US West confirmation cannot be true until the owner provides or provisions a US West Neon/Postgres target, then authorizes A19 to update Vercel Preview/Production `POSTGRES_URL` without logging the value.
