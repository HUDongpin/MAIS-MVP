# A22 Fallback Clean Candidate Validation Sweep

Generated: 2026-07-10T16:00:39.428Z

Dirty map signature: `37c9d353a7710b8e92d3d766006b7230936ca194044a47770a99ab12d7c6cef1`

Expanded dirty entries: 7221

This sweep records A22 clean-source validation queue evidence only. It runs candidate-local type-check/build commands for selected fallback branches. It does not select a release source, stage, commit, merge, deploy, clean, delete, reset, prune, record owner input, or authorize physical lifecycle cleanup.

## Summary

- Selected rows: 7
- Validation passed rows: 0
- Validation failed rows: 7
- Error rows: 0
- Mutation rows: 0
- Release source selected: no
- Cleanup-authorized rows: 0
- Executable rows: 0

## Results

| Rank | Branch | Status | Type-check passed | TS errors | Build passed | Tracked mutation |
| ---: | --- | --- | --- | ---: | --- | --- |
| 2 | `codex/A10-A22-release-governance` | fail | no | 652 | no | no |
| 3 | `codex/A19-vercel-postgres-region` | fail | no | 652 | no | no |
| 4 | `codex/california-practice-beta-clean` | fail | no | 0 | no | no |
| 6 | `codex/A25-ci-backup-workflow` | fail | no | 0 | no | no |
| 7 | `codex/A05-lesson-checklist-p0` | fail | no | 0 | no | no |
| 8 | `codex/A05-lesson-pep-load` | fail | no | 652 | no | no |
| 9 | `codex/A05-next-item-button-scroll` | fail | no | 652 | no | no |

## Checks

| Check | Status | Detail |
| --- | --- | --- |
| `selected-fallback-candidates` | pass | selectedRows=7 |
| `candidate-local-validation-only` | pass | runs candidate-local type-check/build evidence only |
| `no-tracked-mutation` | pass | mutationRows=0 |
| `non-executable-boundary` | pass | does not select release source, stage, commit, merge, deploy, cleanup, or run destructive git |

## Boundary

- Evidence only: true
- Runs type-check: true
- Runs build: true
- Runs regression: false
- Selects release source: false
- Stage authorized: false
- Commit authorized: false
- Merge authorized: false
- Cleanup authorized: false
- Executable now: false
- Deploy authorized: false
- Destructive Git authorized: false
- Physical lifecycle cleanup authorized: false
