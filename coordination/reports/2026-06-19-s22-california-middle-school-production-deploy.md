# S22 Production Deploy - California Middle School Downlist

## Scope

- Responsible release owner: S22 production reliability and release engineering.
- Owner instruction: dirty-worktree risk accepted; proceed despite dirty-root and broad staging warnings.
- Runtime intent: publish the temporary downlist page for California middle-school student-facing textbook routes.
- Content package status: `coordination/content-qa/us-ca-math-middle-school-textbooks-v2/` remains `candidate-only`; replacement textbook content was not promoted into live student routes.

## Preflight Evidence

- `MAIS_ALLOW_DIRTY_ROOT_DEPLOY=1 npm run release:publish-preflight -- --json`: pass.
- Dirty-root override was active:
  - Status entries: 1,732.
  - Tracked modified: 296.
  - Tracked deleted: 48.
  - Untracked status entries: 1,388.
  - Untracked files: 2,734.
- S19 production env-name parity in preflight:
  - Required variable names present: 7/7.
  - Missing variable names: 0.
  - Secret values were not printed or recorded.

## Deploy Evidence

- Command:
  - `MAIS_ALLOW_DIRTY_ROOT_DEPLOY=1 node scripts/deploy-vercel-production.mjs --json --run-id california-middle-school-downlist-owner-override-20260619`
- Deployment ID:
  - `dpl_CBCY7v8559JELZxAfuhDvR2eJ39m`
- Deployment URL:
  - `https://mais-g6t6bady0-peter-dongpin-hu-s-projects.vercel.app`
- Target:
  - `production`
- Staging directory:
  - `.tmp/vercel-staging/california-middle-school-downlist-owner-override-20260619`
- Staging file count:
  - 3,020
- Staging total bytes:
  - 700,653,842
- Vercel inspect:
  - Ready after polling.
  - Production aliases included `https://mais.hk` and `https://www.mais.hk`.

## Live Smoke Evidence

Smoke timestamp: 2026-06-19T10:45Z.

- `https://www.mais.hk/lesson/california-middle-school-textbook?smoke=ca-middle-downlist-20260619`
  - Response flow: HTTP 308 to `/student/lessons/california-middle-school-textbook`, then HTTP 200.
  - `x-matched-path`: `/student/lessons/california-middle-school-textbook`.
  - Found expected text: `Replacement lessons are in QA`.
  - Found expected text: `The Grade 6-8 California textbook sequence is temporarily offline`.
  - Old chapter title pattern `Ratios, Rates, and Percent Reasoning` was not returned by the smoke match.
- `https://www.mais.hk/student/lessons/california-middle-school-textbook?smoke=ca-middle-downlist-20260619`
  - Response: HTTP 200.
  - `x-matched-path`: `/student/lessons/california-middle-school-textbook`.
  - Found expected text: `Replacement lessons are in QA`.
  - Found expected text: `The Grade 6-8 California textbook sequence is temporarily offline`.
  - Old chapter title pattern `Ratios, Rates, and Percent Reasoning` was not returned by the smoke match.

## Notes

- Direct deployment-domain curl to `https://mais-g6t6bady0-peter-dongpin-hu-s-projects.vercel.app/...` failed twice with `LibreSSL SSL_connect: SSL_ERROR_SYSCALL`; public `www.mais.hk` smoke passed and Vercel inspect confirmed the deployment is ready.
- This production deploy used an owner-approved dirty-root override. It should not be treated as a normal clean release precedent.
- Replacement California middle-school textbook content still needs S18/human sampling, S23 promotion, S05 live integration, S11 route regression after integration, and S22 release gates before it can replace the downlist page.
