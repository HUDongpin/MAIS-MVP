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

- Dirty root currently reports `preferredRegion = "hkg1"` in A07-owned AI Tutor routes, including `app/api/ai-tutor/route.ts`, `app/api/ai-tutor/status/route.ts`, and the untracked `app/api/ai-tutor/resolve/route.ts`.
- This A22 slice does not change AI Tutor provider behavior or route semantics.
- A07 should separately decide whether US classroom AI Tutor requests should remain Hong Kong-pinned, become `auto`, or use a US-region resolver path. Next.js route segment `preferredRegion` is per-route and can override inherited/default placement, so AI Tutor must be evaluated independently from core classroom APIs.

## A19 Database/Env Handoff

- A19 should verify, without exposing secrets, that Vercel Preview and Production `POSTGRES_URL` values point at the intended Neon US West project/branch before release.
- If the current Neon project is not in AWS US West Oregon, A19 should create or request the appropriate Neon target and migrate data rather than assuming `pdx1` compute alone solves the cross-region path.
- Do not expose database URLs in reports or logs; record only redacted present/missing status and region/provider names.

## Guardrail

- Added `scripts/vercel-region-config.test.mjs`.
- The guard asserts:
  - `vercel.json` exists and defaults Vercel Functions to `["pdx1"]`.
  - selected core classroom APIs remain `runtime = "nodejs"`.
  - selected core classroom APIs do not export `preferredRegion = "hkg1"`.

## Verification

- `node --test scripts/vercel-region-config.test.mjs`: passed, 2/2 tests.
- `git diff --check`: passed.
- `npm run type-check`: failed on the clean baseline with broad pre-existing missing-module/missing-export/type drift outside this slice, including `@/lib/server/aiGovernance`, `@/lib/difficulty`, teacher operations/review lesson exports, visualization lab type drift, and userStore API drift. This slice only adds JSON, a Node guard script, and coordination markdown.
- `npm run build`: not run because the full type-check gate is already red.

## Sources Checked

- Vercel Functions region configuration: https://vercel.com/docs/functions/configuring-functions/region
- Vercel region list: https://vercel.com/docs/regions
- Neon region list: https://neon.com/docs/introduction/regions
- Next.js `preferredRegion` route segment config: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/preferredRegion
