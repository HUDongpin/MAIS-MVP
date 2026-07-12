# A22 Typecheck Remediation Owner Work Orders

Generated: 2026-07-09T13:47:28.722Z

Dirty map signature: `b3d232fd2b9ef81d4efc95903d2e3b316db664d6e9ec6ab366181395b3966be7`

Expanded dirty entries: 6604

This bundle turns the A22 top clean candidate type-check remediation routing into owner work orders. It is guidance/evidence only and does not execute remediation, stage, commit, merge, deploy, cleanup, delete, reset, prune, record owner approval, or authorize physical lifecycle cleanup.

## Summary

- Owner work-order status: ready-for-owner-remediation
- Remediation status: owner-routed-cross-owner-remediation-required
- Top candidate branch: `codex/A22-us-region-alignment`
- Top candidate path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`
- Clean-source queue status: fallback-candidate-green-await-clean-source-selection-review
- Type-check status: failed
- TypeScript error rows: 360
- Work orders: 5
- Primary owners: A06, A10, A12, A13
- Coordination owners: A08
- Candidate mutation rows: 0
- Cleanup-authorized rows: 0
- Executable rows: 0

## Work Orders

| Owner | Label | Role | Primary error rows | Coordination error rows | Work order |
| --- | --- | --- | ---: | ---: | --- |
| `A13` | Teacher console lead | primary-remediation | 178 | 50 | `coordination/release-intake/latest-A22-typecheck-remediation-owner-work-order-a13.md` |
| `A12` | Backend/API platform lead | primary-remediation | 105 | 16 | `coordination/release-intake/latest-A22-typecheck-remediation-owner-work-order-a12.md` |
| `A08` | State and analytics / shared types lead | coordination-support | 0 | 97 | `coordination/release-intake/latest-A22-typecheck-remediation-owner-work-order-a08.md` |
| `A06` | Visualization lead | primary-remediation | 41 | 0 | `coordination/release-intake/latest-A22-typecheck-remediation-owner-work-order-a06.md` |
| `A10` | Tooling, docs, report lead | primary-remediation | 36 | 0 | `coordination/release-intake/latest-A22-typecheck-remediation-owner-work-order-a10.md` |

## Validation Rows

| ID | Owner | Status | Passed | Detail |
| --- | --- | --- | --- | --- |
| `routing-current-source` | A25 git hygiene and release intake | passed | yes | sourceCurrentnessFailures=0 |
| `owner-work-orders-match-routes` | A25 git hygiene and release intake | passed | yes | workOrders=5; routes=5 |
| `a22-direct-mutation-blocked` | A22 production reliability and release engineering | passed | yes | Work orders route remediation to owners; A22 direct feature/API/type mutation remains blocked. |
| `merge-deploy-cleanup-still-blocked` | A25 git hygiene and release intake | passed | yes | cleanupAuthorizedRows=0; executableRows=0; releaseSourceSelected=false. |

## Boundary

A22 remains blocked from clean-source promotion until owner remediation is completed and fresh A22 type-check/build evidence is green or explicitly accepted by the release gate.
