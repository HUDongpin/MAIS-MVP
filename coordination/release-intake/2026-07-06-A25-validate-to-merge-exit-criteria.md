# A25 Validate-To-Merge Exit Criteria

Generated: 2026-07-06T15:51:13.544Z

Dirty map signature: `b26fe39c438a20cdbb9cf3943e3d000d9dc8dc04ccccedc13792c457c5942d3b`

Expanded dirty entries: 5183

This artifact is evidence-only. It explains what must become true before A25/A22 can even request a merge path. It does not authorize staging, committing, merging, cleaning, restoring, resetting, deleting files, deleting branches, removing worktrees, pushing, deploying, dirty-root deploy, or physical lifecycle cleanup.

## Exit Equation

- validate_exit_ready: false
- handoff status: `blocked-before-merge`
- direct failed merge checks: 5
- current focus authorization rows: 3
- pending canonical authorization rows: 42
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
| `focus-batch-recorded` | no | owner-authorization-focus | 3 focus-batch row(s) still pending |
| `canonical-authorizations-complete` | no | canonical-authorization-backlog | 42 canonical authorization row(s) still pending |
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
| `current-focus-batch-not-recorded` | blocked | owner-authorization-focus | 3 | 3 current focus row(s) still require explicit owner authorization |
| `canonical-authorization-backlog-not-empty` | blocked | canonical-authorization-backlog | 42 | 42 canonical authorization row(s) remain pending |
| `owner-input-readiness-not-green` | blocked | owner-input-readiness | 1 | ownerInputsReady=false |
| `validation-hold-not-released` | blocked | validation-hold | 1 | validationHoldStatus=waiting-for-owner-compose-deletion-confirmation |
| `release-source-not-clean` | blocked | clean-release-source | 1 | rootStatusEntries=5183 |
| `strict-lifecycle-still-deferred` | deferred | deferred-physical-lifecycle | 38 | 30 dirty worktree decision(s), 9 clean diverged decision(s), 38 deferred physical-lifecycle row(s) |
| `merge-not-authorized` | blocked | explicit-merge-authorization | 1 | No exact owner merge instruction is recorded; this artifact is evidence-only. |
| `post-input-validation-commands` | ready-after-owner-input | post-input-validation | 13 | 5 immediate command(s), 8 deferred aggregate command(s) |

## Current Focus Authorization

- Approval IDs: a09-copy-i18n-accessibility, a17-gamification-and-motivation, a23-integration-and-promotion-lead
- Pending rows: 3

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
- Root status entries: 5183

## Downstream Closure State

- A25 strict lifecycle clean: no
- Dirty worktree decisions: 30
- Clean diverged worktree decisions: 9
- Deferred physical lifecycle rows: 38

## Boundary

Merge remains blocked until validate_exit_ready is true and a separate exact owner merge instruction exists. Cleanup remains blocked until merge verification and separate exact cleanup or lifecycle instructions exist.
