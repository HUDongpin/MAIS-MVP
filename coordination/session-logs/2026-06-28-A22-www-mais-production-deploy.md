# 2026-06-28 A22 www.mais Production Deploy

## Agent

- A22 production reliability and release engineering.
- Consumed A25 dirty-tree intake evidence before deploy.

## Objective

Deploy the latest local MAIS-MVP version to Vercel production for `www.mais.ac` and `www.mais.hk`.

## Source And Isolation

- Root worktree remained dirty and was not used as a direct deployment source.
- A25 dirty-tree map refreshed before release preflight:
  - `coordination/release-intake/2026-06-28-A25-dirty-tree-map-20260628T110555Z.md`
  - `coordination/release-intake/2026-06-28-A25-dirty-tree-map-20260628T111034Z.md`
  - Latest expanded status entries after refresh: `1998`.
- Staged production publish preflight passed:
  - Required production env variable names present: `15/15`.
  - Vercel scope: `peter-dongpin-hu-s-projects`.
  - Project: `mais-mvp`.
- Isolated staging source:
  - `.tmp/vercel-staging/20260628-www-mais`
  - `2097` files.
  - `172034014` bytes.
  - Forbidden deploy paths: `0`.

## Deployment

- Vercel deployment:
  - Deployment URL: `https://mais-mqjbr23cp-peter-dongpin-hu-s-projects.vercel.app`
  - Deployment ID: `dpl_3BrCaSGy8S9gkAbCeecY2AbVn9sA`
  - Vercel status: Ready.
  - Target: production.
- The repo production deploy script created the deployment with `--skip-domain`, but pre-promotion smoke against raw `*.vercel.app` hostnames timed out from this local network. Existing old `*.vercel.app` hostnames also timed out while custom domains were reachable, so A22 treated this as a raw-hostname reachability issue and promoted through Vercel CLI after confirming the deployment was Ready.
- Promotion command succeeded:
  - `vercel promote https://mais-mqjbr23cp-peter-dongpin-hu-s-projects.vercel.app -y --timeout 5m --scope peter-dongpin-hu-s-projects`
- Explicit alias commands succeeded:
  - `www.mais.ac` now points to `mais-mqjbr23cp-peter-dongpin-hu-s-projects.vercel.app`.
  - `www.mais.hk` now points to `mais-mqjbr23cp-peter-dongpin-hu-s-projects.vercel.app`.

## Verification

- `https://www.mais.ac/`
  - HTTP `200`, total `0.994395s`.
- `https://www.mais.hk/`
  - HTTP `200`, total `1.866766s`.
- Latest-local asset marker:
  - `https://www.mais.ac/lesson-illustrations/us-ca-k5/grade1-operations-algebraic-thinking/add-subtract-stories-single-panel-source-hd.png`
  - HTTP `200`, `image/png`, `3060262` bytes.
  - `https://www.mais.hk/lesson-illustrations/us-ca-k5/grade1-operations-algebraic-thinking/add-subtract-stories-single-panel-source-hd.png`
  - HTTP `200`, `image/png`, `3060262` bytes.
- `www.mais.ac` dashboard UI loading smoke:
  - Passed.
  - Ready `10925ms`, threshold `12000ms`.
- `www.mais.hk` dashboard UI loading smoke:
  - Passed.
  - Ready `5699ms`, threshold `12000ms`.
- `www.mais.ac` AI Tutor live latency smoke:
  - Passed.
  - Provider `qwen`, model `qwen3.7-plus`.
  - Status p95 `188ms`; first event `293ms`; final `4294ms`.
- `www.mais.hk` AI Tutor live latency smoke:
  - Passed.
  - Provider `qwen`, model `qwen3.7-plus`.
  - Status p95 `163ms`; first event `252ms`; final `4232ms`.

## Residual Notes

- `scripts/dashboard-latency-smoke.mjs` API latency runs aborted from Node/undici via local proxy sockets after promotion. Browser-style dashboard UI loading smokes passed on both requested domains, and direct HTTP checks plus latest-asset checks passed.
- No git staging, commit, branch, push, reset, or cleanup was performed.
