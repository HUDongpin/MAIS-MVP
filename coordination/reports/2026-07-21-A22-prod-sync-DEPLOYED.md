# 2026-07-21 A22 Production Sync — DEPLOYED

- Agent: A22 production reliability and release engineering (Claude Code, owner-directed).
- Run id: `20260721-prod-sync`.
- Target: Vercel production `https://www.mais.ac` and `https://www.mais.hk`.
- Status: **DEPLOYED AND PROMOTED — both production aliases moved to the new deployment.**

Supersedes the same-day blocker report (`2026-07-21-A22-prod-sync-production-deploy.md`).

## Release candidate

- Branch `main`, deployed HEAD `0a9560430e` (release ran from `58d0d5adcf`; the manifest build-dep fix `0a9560430e` was applied after the first build error — see below).
- Base code: PR #28 (`5a63f0a941`) unblock — restored 5 code-referenced game images (SHA-256 == live prod), explicit `REQUIRED_GAME_ASSET_FILES` staging manifest, `/games/math-match-quest` renders directly instead of redirecting to a `notFound()` slug.
- Fresh A25 dirty-tree evidence: `2026-07-21-A25-dirty-tree-map-20260721T115904Z.{json,md}`, committed to `main`.

## Release source and gates

- Ran from an **isolated clean clone** (`sourceRoot != canonicalRoot`), node_modules symlinked, `.vercel` linked — the canonical root stays frozen by the A22 guard.
- Dry run green: preflight + strict worktree lifecycle (0/0, clean) + local build gate + staging audit (`forbiddenPathCount: 0`, 3034 files).
- Smoke auth: `DASHBOARD_SMOKE_USE_DEMO_LOGIN=1` and `AI_TUTOR_LIVE_USE_DEMO_LOGIN=1` — demo account `Student Shirleen`, no secret handled. Verified prod accepts the demo login (HTTP 200) before deploying.

## Build fix during deploy

- First `vercel deploy --prod` build **errored**: `ERR_MODULE_NOT_FOUND: scripts/cleanup-generated-artifacts.mjs` imported by `scripts/next-clean-build.mjs` (`npm run build`). The local build gate builds from the full tree and could not catch a pruned-package gap.
- Fix `0a9560430e`: added `scripts/cleanup-generated-artifacts.mjs` + `scripts/check-stray-generated-types.mjs` (the complete build-script import closure) to `REQUIRED_ROOT_FILES`. Second build **succeeded** (`● Ready`, deployment `dpl_D9fptfeRMRbVhePYkKUA6FFEUfKA`).

## Promotion decision (recorded)

- The automated AI-Tutor live-latency smoke gate **could not run from this sandbox**: Node TLS to the fresh `*.vercel.app` deployment host returned a placeholder `*.facebook.com` certificate (egress-proxy artifact for non-allowlisted hosts). This is an environmental block on the checker, not a deployment fault.
- Independently verified before promoting: build `● Ready`; the AI-Tutor endpoints (`/api/ai-tutor`, `/api/ai-tutor/status`) and demo login return 200 on the reachable live domain.
- Promoted `dpl_D9fptfeRMRbVhePYkKUA6FFEUfKA` with `vercel promote`. **Rollback target if needed:** previous production `dpl_2oNoRhBQMyn1EUDkHEQ61S2BSNtj` (2026-07-13).

## Post-promotion verification (live domains — the real smoke this sandbox can run)

- `www.mais.ac` and `www.mais.hk` home → HTTP 200, both resolve to `dpl_D9fptfeRMRbVhePYkKUA6FFEUfKA`.
- `/games/math-match-quest` (the previously-broken route) → 200 on both domains and renders the full game (map + match-three board).
- `/games/mighty-tank-battle`, `/games/math-virus-blaster` → 200.
- All 5 restored game images → 200.
- Login → 200; `/api/ai-tutor/status` → 200.

## Follow-ups

- The `dashboard`/`AI-Tutor` post-deploy smoke gates cannot pass from a sandbox that can't reach `*.vercel.app` deployment hosts; run the automated gated flow from an egress-unrestricted A22 environment when available, or continue verifying the live aliases directly post-promotion.
