# A25 Validate-To-Merge Exit Criteria

Generated: 2026-07-08T14:15:17.804Z

Dirty map signature: `4892e406613fc3846378621b84ba0f486bb8ebf371c35837eae544472596f318`

Expanded dirty entries: 6130

This artifact is evidence-only. It explains what must become true before A25/A22 can even request a merge path. It does not authorize staging, committing, merging, cleaning, restoring, resetting, deleting files, deleting branches, removing worktrees, pushing, deploying, dirty-root deploy, or physical lifecycle cleanup.

## Exit Equation

- validate_exit_ready: false
- handoff status: `blocked-before-merge`
- direct failed merge checks: 4
- current focus authorization rows: 0
- pending canonical authorization rows: 39
- owner hold rows: 1
- deferred physical lifecycle rows: 38
- clean source blockers: 1
- validation hold blockers: 1
- merge authorized: false
- cleanup-authorized rows: 0
- executable rows: 0

## Direct Criteria

| Check | Passed | Class | Blocker |
| --- | --- | --- | --- |
| `sources-current` | yes | source-currentness |  |
| `closure-loop-validate` | yes | closure-loop-position |  |
| `preauthorization-clean` | yes | preauthorization-safety |  |
| `focus-batch-recorded` | yes | owner-authorization-focus |  |
| `canonical-authorizations-complete` | no | canonical-authorization-backlog | 39 canonical authorization row(s) still pending |
| `owner-inputs-ready` | no | owner-input-readiness | owner inputs are not ready |
| `execution-instructions-complete` | yes | execution-instruction-readiness |  |
| `validation-hold-released` | no | validation-hold | validation hold is waiting for owner compose deletion confirmation |
| `release-source-clean` | no | clean-release-source | A22 release source is not clean |
| `no-dirty-root-deploy` | yes | dirty-root-deploy-protection |  |
| `non-executable-boundary` | yes | non-executable-boundary |  |
| `strict-lifecycle-not-yet-clean` | yes | deferred-lifecycle-cleanup |  |

## Current Exit Blockers

| ID | Status | Class | Count | Detail |
| --- | --- | --- | ---: | --- |
| `current-focus-batch-not-recorded` | passed | owner-authorization-focus | 0 | 0 current focus row(s) still require explicit owner authorization |
| `canonical-authorization-backlog-not-empty` | blocked | canonical-authorization-backlog | 39 | 39 canonical authorization row(s) remain pending |
| `owner-input-readiness-not-green` | blocked | owner-input-readiness | 1 | ownerInputsReady=false |
| `validation-hold-not-released` | blocked | validation-hold | 1 | validationHoldStatus=waiting-for-owner-compose-deletion-confirmation |
| `release-source-not-clean` | blocked | clean-release-source | 1 | rootStatusEntries=6130 |
| `strict-lifecycle-still-deferred` | deferred | deferred-physical-lifecycle | 38 | 31 dirty worktree decision(s), 8 clean diverged decision(s), 38 deferred physical-lifecycle row(s) |
| `merge-not-authorized` | blocked | explicit-merge-authorization | 1 | No exact owner merge instruction is recorded; this artifact is evidence-only. |
| `post-input-validation-commands` | ready-after-owner-input | post-input-validation | 13 | 5 immediate command(s), 8 deferred aggregate command(s) |

## Current Focus Authorization

- Approval IDs: none
- Pending rows: 0

## Safe Post-Input Validation Commands

Immediate commands:
- `node coordination/release-intake/assert-next-owner-authorizations-current.mjs`
- `node coordination/release-intake/generate-next-owner-authorization-execution-preview.mjs`
- `node coordination/release-intake/assert-next-owner-authorization-execution-preview-current.mjs`
- `node coordination/release-intake/assert-owner-package-blocker-report-records-current.mjs`
- `node coordination/release-intake/assert-owner-closure-input-readiness-current.mjs`

Deferred aggregate commands:
- `node coordination/release-intake/refresh-linked-worktree-archive-evidence.mjs`
- `node coordination/release-intake/assert-linked-worktree-archive-evidence-current.mjs`
- `node coordination/release-intake/generate-wave06-final-root-lifecycle-readiness.mjs`
- `node coordination/release-intake/assert-wave06-final-root-lifecycle-readiness-current.mjs`
- `node coordination/release-intake/refresh-dirty-worktree-remediation-evidence.mjs --reason "owner input action packet post-input verification"`
- `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- `node coordination/release-intake/generate-dirty-worktree-remediation-completion-audit.mjs`
- `node coordination/release-intake/assert-dirty-worktree-remediation-completion-audit-current.mjs`

## A22 Release Source Options

Allowed release sources:
- `clean worktree`
- `clean clone`
- `reviewed clean release slice`
- `explicitly owner-approved pruned staging package`

- A22 release source clean: no
- Root status entries: 6130

## Downstream Closure State

- A25 strict lifecycle clean: no
- Dirty worktree decisions: 31
- Clean diverged worktree decisions: 8
- Deferred physical lifecycle rows: 38

## Boundary

Merge remains blocked until validate_exit_ready is true and a separate exact owner merge instruction exists. Cleanup remains blocked until merge verification and separate exact cleanup or lifecycle instructions exist.
