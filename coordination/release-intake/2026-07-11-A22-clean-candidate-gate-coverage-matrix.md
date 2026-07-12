# A22 Clean Candidate Gate Coverage Matrix

Generated: 2026-07-10T17:10:56.618Z

Dirty map signature: `e30d647e1b51432945713f42ac78b0a2466fcb17192de0235a801ac877a0801f`

Expanded dirty entries: 7636

This matrix is evidence-only. It summarizes already-recorded A22 clean-candidate gate evidence. It does not run type-check, run build, run regression, select a release source, record owner approval, record extraction instructions, copy root files, mutate the candidate, stage, commit, merge, deploy, clean, delete, reset, prune, or authorize physical lifecycle cleanup.

## Summary

- Matrix status: `coverage-current-top-candidate-red`
- Candidate rows: 9
- Candidates with gate evidence: 1
- Candidates gate green: 0
- Candidates gate red: 1
- Candidates awaiting gate evidence: 8
- Top candidate: `codex/A22-us-region-alignment`
- Top candidate gate status: `top-candidate-gates-red`
- Focused smoke passed: yes
- Type-check passed: no
- Type-check error lines: 360
- Build passed: no
- Build failure category: `post-extraction-build-refresh-required`
- Build module blockers: 0/5
- Build blockers routed: no
- Release source selected: no
- Promotion eligible now: no
- Cleanup-authorized rows: 0
- Executable rows: 0

## Candidate Gate Coverage

| Rank | Branch | Gate coverage | Smoke | Type-check | Build | Blockers routed |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `codex/A22-us-region-alignment` | top-candidate-gates-red | yes | no | no | no |
| 2 | `codex/A10-A22-release-governance` | candidate-specific-gates-not-run | n/a | n/a | n/a | n/a |
| 3 | `codex/A19-vercel-postgres-region` | candidate-specific-gates-not-run | n/a | n/a | n/a | n/a |
| 4 | `codex/california-practice-beta-clean` | candidate-specific-gates-not-run | n/a | n/a | n/a | n/a |
| 5 | `codex/s22-release-hygiene-2026-06-15` | candidate-specific-gates-not-run | n/a | n/a | n/a | n/a |
| 6 | `codex/A25-ci-backup-workflow` | candidate-specific-gates-not-run | n/a | n/a | n/a | n/a |
| 7 | `codex/A05-lesson-checklist-p0` | candidate-specific-gates-not-run | n/a | n/a | n/a | n/a |
| 8 | `codex/A05-lesson-pep-load` | candidate-specific-gates-not-run | n/a | n/a | n/a | n/a |
| 9 | `codex/A05-next-item-button-scroll` | candidate-specific-gates-not-run | n/a | n/a | n/a | n/a |

## Current Interpretation

- The earlier clean-candidate blocker is now more precise: candidate-specific gate evidence exists for the top candidate, but it is red.
- The top candidate remains reviewable, not deployable, because type-check and build are failing.
- The other 8 clean candidates remain unvalidated at candidate-specific gate level.
- Clean-source promotion remains blocked until a candidate has green candidate-specific gates, clean-source selection evidence, and a separate owner merge instruction.

## Checks

| Check | Status | Detail |
| --- | --- | --- |
| `source-current` | pass | sourceCurrentnessFailures=0 |
| `candidate-rows-covered` | pass | rows=9; promotionRows=9 |
| `top-candidate-gate-evidence-visible` | pass | topRows=1; candidatesWithGateEvidence=1 |
| `coverage-refines-missing-gates` | pass | topGateStatus=top-candidate-gates-red; candidatesAwaitingGateEvidence=8 |
| `coverage-matrix-non-executable` | pass | coverage rows must not authorize cleanup, execution, merge, deploy, destructive git, or physical lifecycle cleanup |

## Boundary

- Evidence only: true
- Runs type-check: false
- Runs build: false
- Runs regression: false
- Selects release source: false
- Records owner approval: false
- Records extraction instruction: false
- Modifies candidate: false
- Copies root files: false
- Stage authorized: false
- Commit authorized: false
- Merge authorized: false
- Cleanup authorized: false
- Executable now: false
- Deploy authorized: false
- Destructive Git authorized: false
- Physical lifecycle cleanup authorized: false
