# A25 Authorization Round Validation Plan

Generated: 2026-07-04T15:26:23.073Z

Dirty map signature: `d20470b5add81361e15b9a442d7784b5bed65137e18241c1f7d9b27e87532f64`

Expanded dirty entries: 4316

This plan is evidence-only. It describes how to validate owner authorization rounds after owner input is recorded, but it does not create the authorization file, record owner approval, authorize merge, authorize cleanup, run cleanup, stage, commit, discard, tag, push, prune, deploy, remove worktrees, or delete files.

## Summary

- Authorization rounds: 5
- Round rows: 71
- Round pending rows: 69
- Round authorized rows: 2
- Ready-for-owner-review rounds: 1
- Safe post-input validation commands: 5
- Deferred aggregate validation commands: 8
- Validation phases: 4
- Unique post-approval checks: 100
- Exact-command rows: 9
- Target input files: 3
- Required inputs: 3
- Cleanup-authorized rows: 0
- Executable rows: 0
- Source currentness failures: 0

## Round Validation Matrix

| Order | Round | ID | Rows | Pending | Authorized | Exact-command rows | Post-approval checks | Ready review |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | Ready candidate owner review | `ready-candidate-owner-review` | 2 | 0 | 2 | 0 | 8 | yes |
| 2 | Wave 01 package resync authorizations | `wave01-package-resync-authorizations` | 7 | 7 | 0 | 7 | 5 | no |
| 3 | Remaining owner-package final states | `remaining-owner-package-final-states` | 23 | 23 | 0 | 0 | 48 | no |
| 4 | Remaining physical-lifecycle final states | `remaining-physical-lifecycle-final-states` | 37 | 37 | 0 | 0 | 41 | no |
| 5 | A22 generated-artifact residual cleanup authorizations | `a22-generated-artifact-residual-cleanup-authorizations` | 2 | 2 | 0 | 2 | 6 | no |

### 1. Ready candidate owner review

- ID: `ready-candidate-owner-review`
- Owner action: Review and decide the first ready owner-package candidate before any merge or cleanup.
- Rows: 2; pending: 0; authorized: 2
- Exact-command rows: 0
- Post-approval checks:
- `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec --status`
- `npm run release:dirty-map -- --reason "A25 post-owner-approval a16-research-and-learning-science"`
- `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
- `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a16-research-evidence-closure"`
- `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
- `node coordination/release-intake/assert-worktree-lifecycle.mjs`
- First authorization text:

```text
Authorize approvalId=a16-research-and-learning-science for owner=A16 research and learning science; selectedFinalState=reviewed commit; evidenceReviewed=coordination/release-intake/latest-A25-next-owner-approval-packet.json, coordination/release-intake/latest-A25-next-owner-authorizations-starter.json, coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec, coordination/release-intake/latest-A25-effective-work-order-a16-research-and-learning-science.md, coordination/release-intake/latest-A25-ready-candidate-owner-review-capsule.json, coordination/release-intake/latest-A25-ready-candidate-owner-acceptance-docket.json; approvedBy=dongpinhu; approvedAt=2026-07-04T14:48:52Z; notes=Scope is the six untracked coordination/research evidence files only. No merge, cleanup, executable command, destructive Git, deploy, or worktree removal is authorized.
```

### 2. Wave 01 package resync authorizations

- ID: `wave01-package-resync-authorizations`
- Owner action: Approve, reject, or defer the seven exact Wave 01 package-resync rows.
- Rows: 7; pending: 7; authorized: 0
- Exact-command rows: 7
- Post-approval checks:
- `node coordination/release-intake/generate-wave01-governance-readiness.mjs`
- `node coordination/release-intake/assert-wave01-governance-readiness-current.mjs`
- `node coordination/release-intake/generate-wave01-package-resync-approval-requests.mjs`
- `node coordination/release-intake/assert-wave01-package-resync-approval-requests-current.mjs`
- `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- First authorization text:

```text
Authorize approvalId=wave01-resync-01-tsconfig-json; worktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance; path=tsconfig.json; selectedAction=owner-approved-package-restore; command=git restore --source=HEAD -- tsconfig.json; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>
```

### 3. Remaining owner-package final states

- ID: `remaining-owner-package-final-states`
- Owner action: Select reviewed final states for owner-package rows after package evidence is reviewed.
- Rows: 23; pending: 23; authorized: 0
- Exact-command rows: 0
- Post-approval checks:
- `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a25-git-hygiene-and-release-intake.pathspec --status`
- `npm run release:dirty-map -- --reason "A25 post-owner-approval a25-git-hygiene-and-release-intake"`
- `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
- `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a22-production-reliability-and-release-engineering.pathspec --status`
- `npm run release:dirty-map -- --reason "A25 post-owner-approval a22-production-reliability-and-release-engineering"`
- `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a06-visualization-lead.pathspec --status`
- `npm run release:dirty-map -- --reason "A25 post-owner-approval a06-visualization-lead"`
- `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a12-backend-api-platform.pathspec --status`
- `npm run release:dirty-map -- --reason "A25 post-owner-approval a12-backend-api-platform"`
- `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a11-qa-and-release-quality.pathspec --status`
- `npm run release:dirty-map -- --reason "A25 post-owner-approval a11-qa-and-release-quality"`
- `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a10-tooling-docs-and-report.pathspec --status`
- `npm run release:dirty-map -- --reason "A25 post-owner-approval a10-tooling-docs-and-report"`
- `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a05-lesson-lead.pathspec --status`
- `npm run release:dirty-map -- --reason "A25 post-owner-approval a05-lesson-lead"`
- `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a21-content-pipeline-and-rag-operations.pathspec --status`
- `npm run release:dirty-map -- --reason "A25 post-owner-approval a21-content-pipeline-and-rag-operations"`
- `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a04-practice-lead.pathspec --status`
- `npm run release:dirty-map -- --reason "A25 post-owner-approval a04-practice-lead"`
- `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a03-curriculum-roadmap-lead.pathspec --status`
- `npm run release:dirty-map -- --reason "A25 post-owner-approval a03-curriculum-roadmap-lead"`
- `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a18-curriculum-qa-a21-content-pipeline.pathspec --status`
- `npm run release:dirty-map -- --reason "A25 post-owner-approval a18-curriculum-qa-a21-content-pipeline"`
- `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a13-teacher-console.pathspec --status`
- `npm run release:dirty-map -- --reason "A25 post-owner-approval a13-teacher-console"`
- `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a01-app-shell-lead.pathspec --status`
- `npm run release:dirty-map -- --reason "A25 post-owner-approval a01-app-shell-lead"`
- `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a02-dashboard-lead.pathspec --status`
- `npm run release:dirty-map -- --reason "A25 post-owner-approval a02-dashboard-lead"`
- `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a20-game-design-and-game-based-learning.pathspec --status`
- `npm run release:dirty-map -- --reason "A25 post-owner-approval a20-game-design-and-game-based-learning"`
- `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a07-ai-tutor-lead.pathspec --status`
- `npm run release:dirty-map -- --reason "A25 post-owner-approval a07-ai-tutor-lead"`
- `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a08-state-and-analytics-lead.pathspec --status`
- `npm run release:dirty-map -- --reason "A25 post-owner-approval a08-state-and-analytics-lead"`
- `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a15-adaptive-engine-lead.pathspec --status`
- `npm run release:dirty-map -- --reason "A25 post-owner-approval a15-adaptive-engine-lead"`
- `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a14-parent-console.pathspec --status`
- `npm run release:dirty-map -- --reason "A25 post-owner-approval a14-parent-console"`
- `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a24-illustration-exact-layer.pathspec --status`
- `npm run release:dirty-map -- --reason "A25 post-owner-approval a24-illustration-exact-layer"`
- `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a09-copy-i18n-accessibility.pathspec --status`
- `npm run release:dirty-map -- --reason "A25 post-owner-approval a09-copy-i18n-accessibility"`
- `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a17-gamification-and-motivation.pathspec --status`
- `npm run release:dirty-map -- --reason "A25 post-owner-approval a17-gamification-and-motivation"`
- `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a23-integration-and-promotion-lead.pathspec --status`
- `npm run release:dirty-map -- --reason "A25 post-owner-approval a23-integration-and-promotion-lead"`
- First authorization text:

```text
Authorize approvalId=a25-git-hygiene-and-release-intake for owner=A25 git hygiene and release intake; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a25-git-hygiene-and-release-intake.pathspec, coordination/release-intake/latest-A25-effective-work-order-a25-git-hygiene-and-release-intake.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
```

### 4. Remaining physical-lifecycle final states

- ID: `remaining-physical-lifecycle-final-states`
- Owner action: Select final states for linked worktrees and root lifecycle rows after package review.
- Rows: 37; pending: 37; authorized: 0
- Exact-command rows: 0
- Post-approval checks:
- `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval root-main"`
- `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
- `node coordination/release-intake/assert-worktree-lifecycle.mjs`
- `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a01-app-shell-closure"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a01-shell-lazy-load"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a02-a15-dashboard-adaptive-closure"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a03-roadmap-closure"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a04-practice-closure"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a05-lesson-checklist-p0"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a05-lesson-closure"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a05-lesson-pep-load"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a05-next-item-button-scroll"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a06-manim-three-closure"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a06-visualization-closure"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a07-a15-a08-ai-adaptive-types"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a07-ai-tutor-classroom-switches"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a07-ai-tutor-closure"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a08-a12-shared-contract-closure"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a09-copy-i18n-accessibility-closure"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a10-a22-a08-a12-a06-compose-20260628"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a10-a22-release-governance"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a11-fix-126-128-129"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a11-regression-evidence-closure"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a12-google-oauth-login"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a12-userstore-storage-contract"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a13-a14-console-closure"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a17-a20-game-motivation-closure"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a18-a21-content-evidence-closure"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a19-vercel-postgres-region"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a22-missing-module-release-slice"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a22-next-15-5-19-audit"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a22-p1-release-hygiene-security"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a22-us-region-alignment"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a25-dirty-closure-governance"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a25-full-dirty-compose-verification"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a14-profile-avatar-save"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-visualization-production-release"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-california-practice-beta-clean"`
- `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-s22-release-hygiene-2026-06-15"`
- First authorization text:

```text
Authorize approvalId=root-main for branch=main; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/latest-A25-dirty-tree-map.md, coordination/release-intake/latest-A25-effective-disposition-queue.md, coordination/release-intake/latest-A25-owner-disposition-queue.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
```

### 5. A22 generated-artifact residual cleanup authorizations

- ID: `a22-generated-artifact-residual-cleanup-authorizations`
- Owner action: Review A22 residual generated-artifact evidence before any cleanup apply can be separately authorized.
- Rows: 2; pending: 2; authorized: 0
- Exact-command rows: 2
- Post-approval checks:
- `node coordination/release-intake/generate-a22-generated-artifact-residual-evidence.mjs`
- `node coordination/release-intake/assert-a22-generated-artifact-residual-evidence-current.mjs`
- `npm run release:dirty-map -- --reason "A22 residual generated-artifact cleanup authorization post-check" --no-report`
- `node coordination/release-intake/refresh-dirty-worktree-remediation-evidence.mjs --reason "A22 residual generated-artifact cleanup authorization post-check"`
- `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- `node coordination/release-intake/assert-no-staged-changes.mjs`
- First authorization text:

```text
Authorize approvalId=a22-generated-residual-tmp; target=.tmp; selectedAction=owner-approved-generated-artifact-cleanup-script-apply; command=node scripts/cleanup-generated-artifacts.mjs --apply --scope all; evidenceReviewed=coordination/release-intake/latest-A22-generated-artifact-residual-evidence.json, coordination/release-intake/latest-A22-generated-artifact-residual-authorization-packet.json; approvedBy=<owner/A22>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>
```


## Validation Phases

| Order | Phase | ID | Status | Commands |
| ---: | --- | --- | --- | ---: |
| 1 | Record owner inputs | `record-owner-inputs` | pending-owner-input | 0 |
| 2 | Safe post-input validation | `safe-post-input-validation` | ready-after-owner-input | 5 |
| 3 | Separate execution instructions | `separate-execution-instructions` | blocked-until-valid-authorized-command-manifest | 3 |
| 4 | Deferred aggregate validation | `deferred-aggregate-validation` | held:waiting-for-owner-compose-deletion-confirmation | 8 |

### 1. Record owner inputs

- ID: `record-owner-inputs`
- Status: pending-owner-input
- Purpose: Owner records exact approval rows in the named input files. This phase still does not execute commands.
- Commands:
- none

### 2. Safe post-input validation

- ID: `safe-post-input-validation`
- Status: ready-after-owner-input
- Purpose: Validate the owner input files and rebuild the non-executable authorization preview.
- Commands:
- `node coordination/release-intake/assert-next-owner-authorizations-current.mjs`
- `node coordination/release-intake/generate-next-owner-authorization-execution-preview.mjs`
- `node coordination/release-intake/assert-next-owner-authorization-execution-preview-current.mjs`
- `node coordination/release-intake/assert-owner-package-blocker-report-records-current.mjs`
- `node coordination/release-intake/assert-owner-closure-input-readiness-current.mjs`

### 3. Separate execution instructions

- ID: `separate-execution-instructions`
- Status: blocked-until-valid-authorized-command-manifest
- Purpose: Only after valid owner authorizations exist, the owner must issue a separate instruction naming exact approval IDs and exact commands.
- Commands:
- `node coordination/release-intake/generate-next-owner-authorized-command-manifest.mjs`
- `node coordination/release-intake/assert-next-owner-authorized-command-manifest-current.mjs`
- `node coordination/release-intake/assert-next-owner-execution-instructions-current.mjs`

### 4. Deferred aggregate validation

- ID: `deferred-aggregate-validation`
- Status: held:waiting-for-owner-compose-deletion-confirmation
- Purpose: Run only after the owner resolves the active compose-worktree validation hold.
- Commands:
- `node coordination/release-intake/refresh-linked-worktree-archive-evidence.mjs`
- `node coordination/release-intake/assert-linked-worktree-archive-evidence-current.mjs`
- `node coordination/release-intake/generate-wave06-final-root-lifecycle-readiness.mjs`
- `node coordination/release-intake/assert-wave06-final-root-lifecycle-readiness-current.mjs`
- `node coordination/release-intake/refresh-dirty-worktree-remediation-evidence.mjs --reason "owner input action packet post-input verification"`
- `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- `node coordination/release-intake/generate-dirty-worktree-remediation-completion-audit.mjs`
- `node coordination/release-intake/assert-dirty-worktree-remediation-completion-audit-current.mjs`


## Validation Hold

- Status: waiting-for-owner-compose-deletion-confirmation
- Active worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A10-A22-A08-A12-A06-compose-20260628`
- Reason: Owner reported active exact deletion in this compose worktree; linked-worktree archive, Wave 06, aggregate remediation, and completion-audit refreshes should wait for owner confirmation.
- Resume condition: Owner confirms exact deletion in the compose worktree is complete.

## Boundary

Every row remains non-executable. Owner approval must be recorded in the named input files and a separate owner instruction must name exact approval IDs and exact commands before any merge, cleanup, or physical lifecycle action can run.
