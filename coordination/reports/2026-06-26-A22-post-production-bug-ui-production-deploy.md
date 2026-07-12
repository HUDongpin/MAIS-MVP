# 2026-06-26 A22 Post-Production Bug/UI Production Deploy

- Date: 2026-06-26 20:05 HKT
- Agent: A22 production reliability and release engineering
- Supporting agents: A25 git hygiene/release intake; A10 tooling/docs/report; A11 QA and release quality; A19 API configuration readiness
- Owner approval: `approve A22 production deploy of .tmp/vercel-staging/a22-post-production-bug-ui-runtime-20260626-1950 to www.mais.hk and www.mais.ac`
- Status: Completed. Approved runtime package is deployed to production and aliased to both domains.

## Release Scope

Frozen release intent:

> Ship only the post-production bug/UI fixes selected in the A22 runtime overlay; do not ship the current dirty-root runtime behavior.

Deployment source:

- `.tmp/vercel-staging/a22-post-production-bug-ui-runtime-20260626-1950`
- Runtime pathspec: `coordination/release-intake/2026-06-26-A22-post-production-bug-ui-runtime.pathspec`
- Regression evidence pathspec: `coordination/release-intake/2026-06-26-A11-post-production-bug-ui-regression-evidence.pathspec`

No deployment was made from the repository root.

## Pre-Deploy Gates

- A25 dirty-tree intake:
  - Command: `npm run release:dirty-map -- --reason "approved post-production bug-ui production deploy"`
  - Report: `coordination/release-intake/2026-06-26-A25-dirty-tree-map-20260626T115936Z.md`
  - Expanded entries: `1666`
- A22 preflight:
  - Command: `npm run release:preflight -- --json`
  - Result: passed
  - Free disk: above `20 GB` minimum
  - Staging root: `.tmp/vercel-staging`
- A19 env parity:
  - Command: `npm run release:env-preflight -- --json`
  - Scope: `peter-dongpin-hu-s-projects`
  - Target: `production`
  - Required variable names present: `7/7`
  - Missing variables: none
  - Secret values were not printed, copied, stored, or summarized.
- Package scan:
  - Forbidden matches: `0`
  - Checked for `.env*`, `All API Keys.docx`, `default accounts.md`, `.git`, `.local`, `coordination`, `node_modules`, `.next`, `tests`, `*.test.*`, and `*.spec.*`.

## Rollback Target Before Deploy

Before this deployment, both aliases resolved to:

- Deployment id: `dpl_49jkJtqN3eW5Jo4eBEZ3wpBrdLpR`
- Deployment URL: `https://mais-cefu3kc2f-peter-dongpin-hu-s-projects.vercel.app`
- Target: `production`
- Status: Ready
- Created: 2026-06-26 19:45:10 HKT

Rollback command if needed:

```bash
vercel rollback dpl_49jkJtqN3eW5Jo4eBEZ3wpBrdLpR --scope peter-dongpin-hu-s-projects
```

## Production Deployment

Command:

```bash
vercel deploy .tmp/vercel-staging/a22-post-production-bug-ui-runtime-20260626-1950 -y --prod --scope peter-dongpin-hu-s-projects --project mais-mvp --no-wait
```

Result:

- Deployment id: `dpl_5Tf6Y5RzZp2sxjwJTVLWxMqv57uY`
- Deployment URL: `https://mais-2hwzldp7y-peter-dongpin-hu-s-projects.vercel.app`
- Inspect URL: `https://vercel.com/peter-dongpin-hu-s-projects/mais-mvp/5Tf6Y5RzZp2sxjwJTVLWxMqv57uY`
- Target: `production`
- Final status: Ready
- Created: 2026-06-26 19:59:57 HKT

Alias verification:

- `https://www.mais.hk`: `dpl_5Tf6Y5RzZp2sxjwJTVLWxMqv57uY`, Ready
- `https://www.mais.ac`: `dpl_5Tf6Y5RzZp2sxjwJTVLWxMqv57uY`, Ready
- Deployment aliases include `https://mais.hk`, `https://www.mais.hk`, `https://mais.ac`, and `https://www.mais.ac`.

## Production Smoke

A11-owned Playwright safe production preflight:

- Command: `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://www.mais.hk npx playwright test tests/e2e/production-auth-api-preflight.spec.ts --project=desktop-chrome`
- Result: passed, `1/1`

Equivalent safe HTTP/API probes:

| Domain | Home | Login | Anonymous storage health | Public questions | Public lesson | Dashboard protected |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `https://www.mais.hk` | 200 | 200 | 401 | 200 | 200 | 307 |
| `https://www.mais.ac` | 200 | 200 | 401 | 200 | 200 | 307 |

## Checks Not Run

- Production-writing auth/storage smoke was not run because it requires explicit write opt-in.
- Production game smoke was not run because it writes gamification/game state.
- Full production visualization sweep was not run to avoid unnecessary live production stress.
- No Git staging, commit, branch, push, merge, rebase, reset, delete, or revert was performed.

## Residual Risks

- Repository root remains heavily dirty and uncommitted.
- This deploy came from an approved pruned staging package, not a clean Git commit.
- Source-control closure remains a prepared patch/overlay bundle pending owner-approved Git operations.
- npm audit from the verified package still reported `1 moderate` and `1 high`.
