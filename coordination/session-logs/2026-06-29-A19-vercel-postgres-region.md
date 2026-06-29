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
5. After owner authorization, provision US West Neon/Postgres target, copy production `app_state`, update Vercel Preview/Production `POSTGRES_URL`, and reverify. Completed.

## Evidence

- Vercel CLI installed.
- Root project link present.
- No shell Vercel token/project env vars, but Vercel CLI auth is present.
- No Vercel entry/token pattern in approved DOCX.
- No Neon/Postgres URL or US West signal in approved DOCX.
- Initial cloud Preview `POSTGRES_URL` verified as Neon `aws-ap-southeast-1`, not US West.
- Initial cloud Production `POSTGRES_URL` verified as Neon `aws-ap-southeast-1`, not US West.
- Cloud Preview/Production related DB env family also classifies as Neon `aws-ap-southeast-1`; no US West fallback variable found.
- Owner authorized creating a US West Neon/Postgres target.
- Created Vercel Neon Marketplace resource `mais-us-west-postgres` with `region=pdx1`, `auth=false`, plan `free_v3`.
- Verified `USWEST_` prefixed resource variables as Neon `aws-us-west-2`.
- Copied production `app_state` from old source to US West target with matching redacted row hash.
- Promoted US West value to Vercel `POSTGRES_URL` for both Preview and Production.
- Final cloud Preview `POSTGRES_URL` verified as Neon `aws-us-west-2`.
- Final cloud Production `POSTGRES_URL` verified as Neon `aws-us-west-2`.
- Converted non-secret `HK_MATH_STORAGE_PROVIDER=postgres` to readable encrypted env records for Production and Preview after CLI-created deployments missed the old sensitive provider flag.
- A22 final stable-source `pdx1` deployment `dpl_CtyFaCuufrFmU971k2nN8ZTFPKMQ` passed live auth/storage smoke on `https://www.mais.hk`.
- Existing admin storage health route does not prove Neon region.

## Verification

- Red test: verifier test initially failed because implementation file was missing.
- Green test: `node --test scripts/verify-vercel-postgres-region.test.mjs` passed, 4/4.
- Safe Vercel cloud env run from clean A19 worktree returned no secrets and classified both Preview and Production as Neon `aws-ap-southeast-1`.
- Safe Vercel cloud env family scan returned no secrets and found no US West DB variable to promote.
- Safe final Vercel cloud env run through the linked root returned no secrets and classified both Preview and Production `POSTGRES_URL` as Neon `aws-us-west-2`.
- Safe final Vercel cloud env run confirmed Preview and Production `HK_MATH_STORAGE_PROVIDER` are present and equal to `postgres`.
- Safe final equality check confirmed Preview and Production `POSTGRES_URL` equals `USWEST_POSTGRES_URL` in the Vercel target env.
- `git diff --check` passed.

## Follow-Up

- A22 redeployed Production and verified live function runtime pickup with auth/storage smoke plus redacted US West `POSTGRES_URL` target hash evidence.
- Legacy non-`POSTGRES_URL` Neon env variables still point to the older region and should be reconciled only if an owning session confirms they are used by runtime code.
