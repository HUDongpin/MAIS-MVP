# A25 A16 Guarded Extraction Executor Apply Report

Generated: 2026-07-04T21:02:25.589Z

Mode: `apply`

Executor status: `not-ready-check-failures`

Dirty map signature: `095c6a389ed8cd8a8b99a03444cab16830b12054729761cbb8c0546dcb371a0c`

Expanded dirty entries: 4609

This artifact is fail-closed. Dry-run mode writes evidence only. Apply mode is allowed only when a separate owner execution instruction is valid and the exact A16 pathspec preflight passes.

## Summary

- Plan status: ready-for-owner-approved-guarded-extraction
- Package files: 6
- Pathspec rows: 6
- Package dirty rows: 0
- Staged rows: 0
- Owner instruction rows: 1
- Valid owner instruction rows: 1
- Instruction validation failures: 0
- Apply requested: true
- Apply permitted: false
- Mutations performed: true
- Cleanup-authorized rows: 0
- Executable rows: 0

## Guarded Command Sequence

1. `git add --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec`
2. `git commit -m "Add A16 research evidence package"`

## Preflight Checks

| Check | Status | Detail |
| --- | --- | --- |
| `mode-is-explicit` | pass | mode=apply |
| `source-current` | fail | source currentness failures=1 |
| `guarded-plan-gate-passing` | pass | guarded plan=10/10 |
| `owner-instruction-state-coherent` | fail | instruction rows=1; valid=1; instruction failures=0 |
| `pathspec-matches-package` | pass | pathspec rows=6; package files=6 |
| `package-status-before-apply` | fail | package dirty rows=0 |
| `no-staged-before-apply` | pass | staged rows=0; package staged rows=0 |
| `exact-command-sequence-only` | pass | command rows=2 |
| `dry-run-has-no-side-effects` | pass | apply mode must pass all preflight checks before mutation |

## Boundary

- Evidence only: false.
- Dry run only: false.
- Apply mode requested: true.
- Records owner approval: false.
- Records execution instruction: false.
- Broad staging authorized: false.
- Stage authorized by executor: false.
- Commit authorized by executor: false.
- Cleanup authorized: false.
- Deploy authorized: false.
- Requires explicit apply flag: true.
- Requires separate owner execution instruction: false.
