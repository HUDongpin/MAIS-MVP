# A25 No Dirty Root Deploy Evidence

Generated: 2026-07-10T17:12:20.243Z

Dirty map signature: `e30d647e1b51432945713f42ac78b0a2466fcb17192de0235a801ac877a0801f`

Expanded dirty entries: 7636

Result: pass

This is local evidence only. It does not claim an external historical Vercel audit. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, worktree removal, or any other physical cleanup.

## Boundary

- A25-owned evidence only; deploy commands executed by this script: 0
- A22-owned release wrappers were inspected as source, and A22/A25 release guards were probed without running `vercel deploy`.
- The probe overrides only `MAIS_RELEASE_MIN_FREE_GB` inside the guard probe processes so source/lifecycle blockers can be observed despite local disk pressure.

## Guard Probes

| Probe | Exit status | Command result | Failed closed |
| --- | ---: | --- | --- |
| dirtyMapCurrent | 0 | passed | n/a |
| rootDeployGuard | 1 | failed | yes |
| previewGuard | 1 | failed | yes |
| stagedPublishGuard | 1 | failed | yes |

## Wrapper Invariants

| Wrapper | Check | Result | Evidence |
| --- | --- | --- | --- |
| preview | preview-preflight | pass | Preview wrapper runs the release-env preview preflight before deploy |
| preview | preview-staging-source | pass | Preview wrapper deploys the prepared staging directory |
| preview | preview-target | pass | Preview wrapper is constrained to the preview target |
| production | production-preflight | pass | Production wrapper runs the staged-publish preflight before deploy |
| production | production-staging-source | pass | Production wrapper deploys the prepared staging directory |
| production | production-skip-domain | pass | Production wrapper deploys with --skip-domain before promotion gates |

## Local Deployment Records

Records inspected under `.tmp/vercel-staging`: 0

| Record | Target | Staging dir location | Staging dir is repo root | Valid |
| --- | --- | --- | --- | --- |
| none | n/a | n/a | n/a | n/a |

## Failures

- none
