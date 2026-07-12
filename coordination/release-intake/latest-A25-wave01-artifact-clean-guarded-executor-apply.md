# A25 Wave01 Artifact-Clean Guarded Executor Apply Report

Generated: 2026-07-06T02:07:18.622Z

Mode: `apply`

Executor status: `not-ready-check-failures`

Plan status: `ready-for-owner-approved-guarded-clean`

Dirty map signature: `5fc283c94246a9b9b4772002cba938aeaf7cb774084a012cef1e4bab0aca9096`

Expanded dirty entries: 5056

This executor is fail-closed. Dry-run mode writes evidence only. Apply mode can remove only the six allowlisted Wave01 A25 dirty-map artifact files, and only after the separate owner execution instructions are valid.

## Summary

- Target rows: 6
- Target dirty rows: 6
- Instruction rows: 6
- Valid instruction rows: 6
- Apply requested: true
- Apply permitted: false
- Mutations performed: true
- Cleanup-authorized rows: 0
- Executable rows: 0

## Guarded Command Sequence

1. `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.json`
2. `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.md`
3. `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.json`
4. `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.md`
5. `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.json`
6. `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.md`

## Preflight Checks

| Check | Status | Detail |
| --- | --- | --- |
| `mode-is-explicit` | pass | mode=apply |
| `source-current` | fail | source currentness failures=1 |
| `guarded-plan-gate-passing` | pass | plan=8/8 |
| `plan-status-supported` | pass | planStatus=ready-for-owner-approved-guarded-clean |
| `executor-status-coherent` | fail | executorStatus=not-ready-source-stale |
| `six-target-commands` | pass | commands=6 |
| `dry-run-has-no-side-effects` | pass | apply mutates only when preflight permits |
| `apply-requires-ready-status` | fail | mode=apply; status=not-ready-source-stale |

## Boundary

- Records owner approval: false
- Records execution instruction: false
- Cleanup authorized: false
- Destructive Git authorized: false
- Deploy authorized: false
- Requires explicit apply flag: true
