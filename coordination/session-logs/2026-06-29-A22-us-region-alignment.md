# 2026-06-29 A22 US Region Alignment

- Agent: A22, production reliability and release engineering.
- Coordination: A19 owns provider/env parity; A12 owns core classroom API contracts; A07 owns AI Tutor route behavior.
- Baseline: branch `codex/A22-us-region-alignment` from `main` at `cef544e09`.
- Dependency state: `npm install` completed in isolated worktree; no root dependency files changed.
- Objective: align US classroom Vercel Node functions with a US West Postgres/Neon region, guard classroom/AI Tutor APIs from Hong Kong route pinning, and collect A22 runtime pickup evidence after A19's Production `POSTGRES_URL` promotion.

## Plan

1. Add a failing guard test for Vercel region config and core classroom API route pinning. Completed; first run failed because `vercel.json` was missing.
2. Add deploy config for US West Node functions without changing provider credentials or secrets. Completed with `regions: ["pdx1"]`.
3. Record A22/A19/A07/A12 handoff notes for Neon/Postgres and AI Tutor region ownership. Completed in `coordination/reports/2026-06-29-A22-us-region-alignment.md`.
4. Fold in A19 US West `POSTGRES_URL` completion evidence and verify app runtime usage of legacy DB variables. Completed; app runtime uses `POSTGRES_URL`, so legacy DB env family was not migrated.
5. Redeploy Production to pick up the updated Vercel env and prove live writes hit the current `POSTGRES_URL`. Completed with redacted smoke/hash evidence.
6. Set project-level default Function region to `pdx1` and attempt to deploy the branch region config. Partially completed; Vercel project setting is `pdx1`, but clean-branch Production deploy is blocked by baseline missing modules and live inspect still shows `iad1`.
7. Run focused guard test and type-check/build checks as feasible. Completed with focused guard green, full type-check/build red from baseline drift.

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
- A19 verified Preview and Production `POSTGRES_URL` as Neon `aws-us-west-2`.
- Current app runtime code scans show durable storage reads `POSTGRES_URL`; no app runtime code directly reads the older non-`POSTGRES_URL` Neon env family.
- Production redeploy `dpl_AUAo4JFVMhWRpyM2sTCKHQ5tom9n` is Ready and aliased to `https://www.mais.hk`.
- Production live auth/storage smoke passed 3/3 register -> login -> `/api/me` same-user probes.
- Production `POSTGRES_URL` target hash changed from `ef3048a1385102b0` to `6e4e984f2fd3f644` after the smoke and contained the `a22-runtime-smoke-` prefix, proving live writes hit the current Production `POSTGRES_URL`.
- Vercel inspect for the redeployed previous production source still showed functions in `iad1`; this proves env pickup but not deployment of this branch's `pdx1` `vercel.json`.
- Vercel project API was updated and verified as `serverlessFunctionRegion: "pdx1"` / `resourceConfig.functionDefaultRegions: ["pdx1"]`.
- Direct clean-branch Production deploy from `5994e5b0d` failed before publish on baseline missing modules; no alias was promoted from the failed deployment.
- After the project setting update, A22 redeployed the known-good production source as `dpl_EpthhHmZA498xrCVxeu5ctDimfKs`; it is Ready and aliased to `https://www.mais.hk`, but inspect text still shows generated functions in `iad1`.
- Final warmed live auth/storage smoke passed 1/1 after the second redeploy; final `POSTGRES_URL` target hash is `d3cef03e72431f41` and contains the `a22-runtime-smoke-warm-` prefix.
- A07 dirty worktree AI Tutor route pins were narrowed by removing `preferredRegion = "hkg1"` from route, status, and resolve routes; no provider behavior was changed.

## Verification

- Red test: `node --test scripts/vercel-region-config.test.mjs` failed because `vercel.json` was missing.
- Green test: `node --test scripts/vercel-region-config.test.mjs` passed, 3/3 tests.
- A07 worktree `rg "preferredRegion\\s*=\\s*[\\\"']hkg1|hkg1" app/api/ai-tutor next.config.ts` returned no matches.
- Vercel Production redeploy inspect returned status `Ready` and production aliases.
- Live Production auth/storage smoke passed 3/3 same-user probes.
- Redacted Production `POSTGRES_URL` target hash/prefix check confirmed live writes landed in the current US West target.
- Vercel project API setting check passed for `pdx1`.
- Direct clean-branch Vercel deploy failed on missing modules, so this branch's `vercel.json` `pdx1` config is not yet live.
- Second known-good-source Production redeploy passed; final warmed live Production auth/storage smoke passed 1/1, but inspect text still showed `iad1`.
- Dirty-root `pdx1` package `a22-us-west-region-20260629T1111` was deployed and inspected as `[pdx1]`, but live registration returned `503`; A22 rolled it back immediately to `dpl_EpthhHmZA498xrCVxeu5ctDimfKs`.
- A22 copied the older stable pruned package `.tmp/vercel-staging/20260628-www-mais` to `.tmp/vercel-staging/a22-stable-us-west-20260629T1138` and applied only the `vercel.json` `pdx1` default plus AI Tutor `hkg1` pin removals.
- Stable-source Production deployment `dpl_CtyFaCuufrFmU971k2nN8ZTFPKMQ` is now live on `https://www.mais.hk`; inspect shows generated functions in `[pdx1]`.
- Live auth/storage smoke on the stable-source `pdx1` deployment passed: registration `200`, login `200`, `/api/me` `200`, same-user hash match.
- Dashboard UI smoke passed with ready time `3242ms`; warmed dashboard API latency smoke passed with dashboard p95 `3711ms`.
- A19 converted non-secret `HK_MATH_STORAGE_PROVIDER=postgres` to readable encrypted env form for Production and Preview after CLI deployments missed the old sensitive provider flag.
- `git diff --check` passed.
- `npm run type-check` failed before build on broad baseline drift unrelated to this slice. Representative failures included missing `@/lib/server/aiGovernance`, missing `@/lib/difficulty`, userStore export drift, teacher operations/review lesson type drift, and visualization lab type drift.
- `npm run build` failed on baseline missing modules, starting with `@/lib/server/aiGovernance`.
