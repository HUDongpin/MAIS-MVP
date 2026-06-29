# 2026-06-29 A22 US Region Alignment

## Scope

- Agent: A22, production reliability and release engineering.
- Coordination: A19 owns Postgres/Neon env parity; A12 owns core classroom API contracts; A07 owns AI Tutor route behavior.
- Branch/worktree: `codex/A22-us-region-alignment` at `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`.
- Baseline: `main` commit `cef544e09`.
- Secrets: no real `.env*`, Vercel, Neon, or provider credential values were read, copied, printed, or changed.

## Decision

- Set Vercel project-level Function region in `vercel.json` to `pdx1`.
- `pdx1` is Vercel Portland / `us-west-2`, matching Neon AWS US West Oregon (`aws-us-west-2`) when the production `POSTGRES_URL` points at a US West Neon project.
- This intentionally optimizes the high-chatter path for US West classrooms as: California browser -> Vercel CDN/PoP -> `pdx1` Node function -> Neon/Postgres US West.
- I did not add multi-region function execution because DB-backed classroom APIs should avoid picking a compute region far from the single primary database unless A12/A19 add read replicas or a multi-region data strategy.

## AI Tutor Handoff

- Current committed branch state has no `preferredRegion = "hkg1"` in `app/api/ai-tutor/`.
- A07 dirty worktree route pins were also narrowed in place by removing `preferredRegion = "hkg1"` from `app/api/ai-tutor/route.ts`, `app/api/ai-tutor/status/route.ts`, and `app/api/ai-tutor/resolve/route.ts`.
- This does not change AI Tutor provider behavior, prompts, model choice, or quota semantics.
- Added guard coverage so committed AI Tutor routes fail the release check if a hard Hong Kong pin is reintroduced.

## A19 Database/Env Handoff

- A19 verified, without exposing secrets, that Vercel Preview and Production `POSTGRES_URL` now point at Neon `aws-us-west-2`.
- A19 created `mais-us-west-postgres`, copied `app_state`, and promoted the verified US West value to Preview and Production `POSTGRES_URL`.
- Runtime code usage scan found app durable storage reads `process.env.POSTGRES_URL` in `lib/server/userStore.ts`; no app runtime code directly reads the legacy non-`POSTGRES_URL` Neon env family.
- Therefore the legacy non-`POSTGRES_URL` DB variables were left untouched for now; they should be reconciled only if an owning session proves a runtime dependency.
- Do not expose database URLs in reports or logs; record only redacted present/missing status and region/provider names.

## Production Runtime Pickup

- Latest pre-update Production deployment was older than the A19 `POSTGRES_URL` promotion.
- A22 redeployed the latest ready Production deployment with Vercel `redeploy`, target `production`, scope `peter-dongpin-hu-s-projects`.
- New Production deployment: `dpl_AUAo4JFVMhWRpyM2sTCKHQ5tom9n`, URL `https://mais-7gqsmkz5w-peter-dongpin-hu-s-projects.vercel.app`, aliased to `https://www.mais.hk` and related production aliases, status `Ready`, created `2026-06-29 18:24:45 HKT`.
- Live production auth/storage smoke against `https://www.mais.hk` passed 3/3 register -> login -> `/api/me` probes with same-user verification.
- Redacted US West `app_state` evidence: production `POSTGRES_URL` row hash changed from `ef3048a1385102b0` before the smoke to `6e4e984f2fd3f644` after the smoke, and the target row contained the `a22-runtime-smoke-` prefix after the live writes.
- This proves the redeployed Production runtime is writing to the current Vercel Production `POSTGRES_URL`, which A19 separately verified as Neon `aws-us-west-2`.

## Function Region Deployment Status

- A22 updated the Vercel project-level `serverlessFunctionRegion` from `iad1` to `pdx1` through the official Vercel project API and verified `resourceConfig.functionDefaultRegions: ["pdx1"]`.
- Direct Production deploy from the clean branch commit `5994e5b0d` failed before publish because the current branch still has baseline missing-module build drift: `VisualizationLabBackToTopButton`, `data/mathVirusBlaster`, `data/mightyTankBattle`, `data/usCaliforniaHighSchoolLessonIllustrations`, and then `@/lib/server/aiGovernance`.
- A22 then redeployed the last known-good Production source again after the project-level region update.
- Second redeploy: `dpl_EpthhHmZA498xrCVxeu5ctDimfKs`, URL `https://mais-3xuha98ni-peter-dongpin-hu-s-projects.vercel.app`, aliased to `https://www.mais.hk`, status `Ready`, created `2026-06-29 18:41:40 HKT`.
- Vercel inspect for the second redeploy still showed generated functions in `iad1`; JSON inspect did not expose function-region fields.
- Therefore Production env/runtime pickup is proven, Vercel project default is now `pdx1`, and the branch carries `vercel.json` `regions: ["pdx1"]`, but live Production function placement is not yet proven as `pdx1`.
- Remaining A22/A10 release blocker: integrate or slice the missing-module/build fixes before deploying this branch's `pdx1` config, then inspect the resulting deployment for `pdx1`.

## Guardrail

- Added `scripts/vercel-region-config.test.mjs`.
- The guard asserts:
  - `vercel.json` exists and defaults Vercel Functions to `["pdx1"]`.
  - selected core classroom APIs remain `runtime = "nodejs"`.
  - selected core classroom APIs do not export `preferredRegion = "hkg1"`.
  - committed AI Tutor routes do not export `preferredRegion = "hkg1"`.

## Verification

- `node --test scripts/vercel-region-config.test.mjs`: passed, 3/3 tests.
- A07 worktree check: `rg "preferredRegion\\s*=\\s*[\\\"']hkg1|hkg1" app/api/ai-tutor next.config.ts` returned no matches.
- Production redeploy inspect: status `Ready`; aliases include `https://www.mais.hk`; generated functions still showed `iad1` because the redeployed source predated this branch's `vercel.json`.
- Production auth/storage smoke: passed 3/3 register -> login -> `/api/me` probes with same-user verification.
- Production `POSTGRES_URL` target hash check: changed after smoke and contained the smoke prefix, proving live writes hit the current Production `POSTGRES_URL`.
- Vercel project API setting update: `serverlessFunctionRegion: "pdx1"` and `resourceConfig.functionDefaultRegions: ["pdx1"]`.
- Direct clean-branch Production deploy: failed before publish on baseline missing modules; no alias was promoted from the failed deployment.
- Second known-good-source Production redeploy after project setting update: status `Ready`, alias restored to `https://www.mais.hk`; inspect text still showed functions in `iad1`.
- Final live Production auth/storage smoke after second redeploy: warmed one-user register -> login -> `/api/me` passed with same-user verification.
- Final redacted `POSTGRES_URL` target hash moved to `d3cef03e72431f41` with `a22-runtime-smoke-warm-` prefix present, proving the current alias still writes to the US West target.
- `git diff --check`: passed.
- `npm run type-check`: failed on the clean baseline with broad pre-existing missing-module/missing-export/type drift outside this slice, including `@/lib/server/aiGovernance`, `@/lib/difficulty`, teacher operations/review lesson exports, visualization lab type drift, and userStore API drift. This slice only adds JSON, a Node guard script, and coordination markdown.
- `npm run build`: failed on missing modules, starting with `@/lib/server/aiGovernance`, after the direct Vercel deploy exposed earlier missing data/component modules.

## Final Live PDX1 Update

- A22 tested the dirty-root `a22-us-west-region-20260629T1111` package first; it inspected as `[pdx1]`, but live registration returned `503`, so A22 rolled back immediately to `dpl_EpthhHmZA498xrCVxeu5ctDimfKs`.
- A22 then copied the older stable pruned package `.tmp/vercel-staging/20260628-www-mais` to `.tmp/vercel-staging/a22-stable-us-west-20260629T1138` and applied only the region-policy delta: added `vercel.json` with `regions: ["pdx1"]` and removed `preferredRegion = "hkg1"` from the three AI Tutor routes.
- Stable-source Production deployment `dpl_CtyFaCuufrFmU971k2nN8ZTFPKMQ`, URL `https://mais-iu4g07g4l-peter-dongpin-hu-s-projects.vercel.app`, is now live on `https://www.mais.hk`.
- Vercel inspect for `dpl_CtyFaCuufrFmU971k2nN8ZTFPKMQ` shows generated functions in `[pdx1]`.
- Live production auth/storage smoke passed: disposable `a22-stable-pdx-smoke-` registration `200`, login `200`, `/api/me` `200`, and same-user hash match.
- Dashboard UI loading smoke passed: ready in `3242ms` under the `12000ms` threshold.
- Warmed dashboard latency smoke passed: `/api/me`, `/api/dashboard?grade=P1`, `/api/assignments`, `/api/gamification/summary`, and `/api/rewards` all returned `200`; dashboard p95 was `3711ms` under the `6000ms` threshold.
- A19 redacted env checks after this release verified Preview and Production `POSTGRES_URL` as Neon `aws-us-west-2`, and Preview/Production `HK_MATH_STORAGE_PROVIDER` as present and equal to `postgres`.
- Runtime code scan in the deployed stable package found DB env reads only at `lib/server/userStore.ts` and `lib/server/practiceAttemptStore.ts`, both using `process.env.POSTGRES_URL`; the legacy non-`POSTGRES_URL` DB env variables remain present but are not used by the classroom runtime path, so they were left unmigrated.

## Sources Checked

- Vercel Functions region configuration: https://vercel.com/docs/functions/configuring-functions/region
- Vercel region list: https://vercel.com/docs/regions
- Neon region list: https://neon.com/docs/introduction/regions
- Next.js `preferredRegion` route segment config: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/preferredRegion
