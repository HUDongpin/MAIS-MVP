# A25/A22 Validate Frontier Owner Input Request Capsule

Generated: 2026-07-10T15:27:07.826Z

Capsule status: `waiting-for-owner-frontier-input`

Dirty map signature: `37c9d353a7710b8e92d3d766006b7230936ca194044a47770a99ab12d7c6cef1`

Expanded dirty entries: 7221

This capsule is evidence-only. It combines the two owner-input frontiers currently blocking validation: the A25 owner-package canonical authorization focus batch and the A22 root-parity selectedAction owner input. It does not record authorization, record A22 owner input, record extraction instructions, copy root files, mutate the candidate, run type-check/build/regression, stage, commit, merge, deploy, clean, delete, reset, prune, or authorize physical lifecycle cleanup.

## Summary

- Owner input groups: 2
- Owner-package focus pending rows: 1
- A22 selectedAction rows: 4
- A22 owner-input landing runway status: `owner-input-recorded-post-runway`
- A22 owner input blank: no
- A22 post-owner-input validation command rows: 8
- A22 candidate targets missing: 0/4
- A22 candidate-mutation executor status: `already-extracted-and-verified`
- A22 candidate-mutation recorded instruction rows: 4/4
- A22 candidate-mutation apply permitted: no
- A22 candidate-mutation rows: 0
- A22 candidate-mutation current gate failures: 0
- Total frontier owner rows: 5
- Pending canonical authorization rows: 41
- Validate exit ready: no
- Ready for merge: no
- Direct failed merge checks: 5
- Clean-source blockers: 1
- Validation-hold blockers: 1
- Checks passing: 8/8
- Cleanup-authorized rows: 0
- Executable rows: 0

## Owner Input Groups

| Group | Status | Pending rows | Accepted rows | Target file | Request kind |
| --- | --- | ---: | ---: | --- | --- |
| `owner-package-canonical-authorization-focus-batch` | ready-for-owner-review | 1 | 0 | `coordination/release-intake/latest-A25-next-owner-authorizations.json` | canonical-owner-package-authorization |
| `a22-root-parity-selected-actions` | post-extraction-verified | 0 | 4 | `coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-owner-input.json` | a22-root-parity-selected-action-owner-input |

## Copyable Owner Texts

### Owner-package canonical authorization focus batch

```text
我授权当前 1 条 owner-package canonical authorization preview：approvalIds=manual-a10-a25-owner-assignment-required；selectedFinalState=reviewed commit；不授权 cleanup；不授权 deploy；不授权 merge；不授权 destructive git；不授权 physical lifecycle cleanup。
```

### A22 root-parity selectedAction owner input

Compact approval text:

```text
我授权当前 4 条 A22 root-parity selectedAction canonical preview：approvalIds=a06-visualization-back-to-top-import-parity,a20-math-virus-blaster-data-parity,a20-mighty-tank-battle-data-parity,a05-california-high-school-lesson-illustration-data-parity；selectedActions=a06-visualization-back-to-top-import-parity:reexport,a20-math-virus-blaster-data-parity:same-path-copy,a20-mighty-tank-battle-data-parity:same-path-copy,a05-california-high-school-lesson-illustration-data-parity:same-path-copy；topCandidate=codex/A22-us-region-alignment；targetWorktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment；使用 latest-A22-root-parity-selected-action-canonical-preview.json 里的 exactOwnerExecutionTextLines；不授权 cleanup；不授权 deploy；不授权 merge；不授权 broad staging；不授权 destructive git；不授权 physical lifecycle cleanup。
```

- Landing runway status: `owner-input-recorded-post-runway`
- Owner input blank: no
- Landing patch rows: 4
- Post-owner-input validation commands: 8
- Candidate targets missing: 0/4
- Instruction intake status: `ready-to-record-extraction-instruction-rows`
- Instruction recording status: `already-recorded`
- Guarded extraction status: `already-extracted-and-verified`
- Candidate mutation executor status: `already-extracted-and-verified`
- Candidate mutation owner input blank: no
- Candidate mutation recorded instruction rows: 4/4
- Candidate mutation apply permitted: no
- Candidate mutation rows: 0
- Candidate mutation current gate failures: 0

Recommended selectedActions:

- - `a06-visualization-back-to-top-import-parity`: selectedAction=`reexport`, rootSource=`components/visualizations/VisualizationLabBackToTopButton.tsx`, candidateTarget=`app/visualization-lab/VisualizationLabBackToTopButton.tsx`
- - `a20-math-virus-blaster-data-parity`: selectedAction=`same-path-copy`, rootSource=`data/mathVirusBlaster.ts`, candidateTarget=`data/mathVirusBlaster.ts`
- - `a20-mighty-tank-battle-data-parity`: selectedAction=`same-path-copy`, rootSource=`data/mightyTankBattle.ts`, candidateTarget=`data/mightyTankBattle.ts`
- - `a05-california-high-school-lesson-illustration-data-parity`: selectedAction=`same-path-copy`, rootSource=`data/usCaliforniaHighSchoolLessonIllustrations.ts`, candidateTarget=`data/usCaliforniaHighSchoolLessonIllustrations.ts`

Exact owner execution text lines:

```text
Authorize A22 root-parity extraction instruction for unitId=a06-visualization-back-to-top-import-parity; topCandidate=codex/A22-us-region-alignment; targetWorktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment; primaryOwnerIds=A06; coordinationOwnerIds=A22,A25; actionMode=owner-reviewed-reexport-or-import-align; rootSource=components/visualizations/VisualizationLabBackToTopButton.tsx; rootSourceSha256=efef3f7c3590ebbd6b21ca56a3d4fcdcab1c0e3dd591bf08ee5a6ccc58707155; candidateTarget=app/visualization-lab/VisualizationLabBackToTopButton.tsx; coveredBlockerRows=1; selectedAction=reexport; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>; No cleanup; No deploy; No merge; No broad staging; No destructive git; No physical lifecycle cleanup.
Authorize A22 root-parity extraction instruction for unitId=a20-math-virus-blaster-data-parity; topCandidate=codex/A22-us-region-alignment; targetWorktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment; primaryOwnerIds=A20; coordinationOwnerIds=A10,A22,A25; actionMode=owner-reviewed-same-path-data-extraction; rootSource=data/mathVirusBlaster.ts; rootSourceSha256=e7e7edfe35ada99e17be43cdfea5cea36e409d52e8a4c3966476209687b495fa; candidateTarget=data/mathVirusBlaster.ts; coveredBlockerRows=1; selectedAction=same-path-copy; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>; No cleanup; No deploy; No merge; No broad staging; No destructive git; No physical lifecycle cleanup.
Authorize A22 root-parity extraction instruction for unitId=a20-mighty-tank-battle-data-parity; topCandidate=codex/A22-us-region-alignment; targetWorktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment; primaryOwnerIds=A20; coordinationOwnerIds=A10,A22,A25; actionMode=owner-reviewed-same-path-data-extraction; rootSource=data/mightyTankBattle.ts; rootSourceSha256=d74bfa43d60d766f818bd7b8e958b386cdff38fc91d3ae5d84889c957c2138e7; candidateTarget=data/mightyTankBattle.ts; coveredBlockerRows=1; selectedAction=same-path-copy; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>; No cleanup; No deploy; No merge; No broad staging; No destructive git; No physical lifecycle cleanup.
Authorize A22 root-parity extraction instruction for unitId=a05-california-high-school-lesson-illustration-data-parity; topCandidate=codex/A22-us-region-alignment; targetWorktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment; primaryOwnerIds=A05; coordinationOwnerIds=A18,A21,A24,A22,A25; actionMode=owner-reviewed-same-path-data-extraction-with-content-signoff; rootSource=data/usCaliforniaHighSchoolLessonIllustrations.ts; rootSourceSha256=366c5b3a2e8ea9a67f1c13e005377f0be4d903d7d4657e15ad2d9f2da0507a28; candidateTarget=data/usCaliforniaHighSchoolLessonIllustrations.ts; coveredBlockerRows=2; selectedAction=same-path-copy; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>; No cleanup; No deploy; No merge; No broad staging; No destructive git; No physical lifecycle cleanup.
```

## Safe Post-Owner-Input Validation Commands

- `npm run release:dirty-map -- --assert-current --max-age-minutes 60`
- `node coordination/release-intake/assert-next-owner-authorization-focus-batch-canonical-recording-current.mjs`
- `node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-owner-action-acceptance-docket-current.mjs`
- `node coordination/release-intake/assert-owner-closure-input-readiness-current.mjs`
- `node coordination/release-intake/assert-validate-to-merge-exit-criteria-current.mjs`
- `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- `node coordination/release-intake/generate-a22-top-clean-candidate-root-parity-extraction-instruction-intake.mjs`
- `node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-intake-current.mjs`
- `node coordination/release-intake/run-a22-top-clean-candidate-root-parity-extraction-instruction-recording.mjs`
- `node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-recording-current.mjs`
- `node coordination/release-intake/run-a22-top-clean-candidate-root-parity-guarded-extraction.mjs`
- `node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-guarded-extraction-current.mjs`
- `node coordination/release-intake/assert-a22-clean-source-validation-queue-current.mjs`
- `node coordination/release-intake/assert-validate-frontier-owner-input-request-capsule-current.mjs`

## Separate Steps Still Required

- Owner-package focus batch approval must be recorded by the guarded canonical recorder before it changes pending canonical authorization counts.
- A22 selectedAction owner input must be recorded separately before root-parity extraction instruction recording can become ready.
- A22 owner-input landing runway must stay current before running the A22 post-owner-input validation command chain.
- A22 candidate-mutation dry-run/current gate must stay current as fail-closed evidence before any separate candidate mutation instruction.
- A separate apply instruction is still required before any A22 candidate mutation, merge, cleanup, deploy, destructive Git, or physical lifecycle cleanup.
- A22 candidate type-check, build, and focused regression must be rerun after any candidate mutation.

## Checks

| Check | Status | Detail |
| --- | --- | --- |
| `source-current` | pass | sourceCurrentnessFailures=0; expanded=7221 |
| `validate-frontier-visible` | pass | handoffStatus=blocked-before-merge; ownerInputFrontierRows=4 |
| `validate-exit-still-blocked` | pass | validateExitReady=false; directFailedMergeChecks=5 |
| `owner-package-focus-ready-for-owner-review` | pass | previewStatus=ready-for-owner-review; pendingRows=1 |
| `a22-selected-actions-waiting-for-owner` | pass | acceptanceStatus=post-extraction-verified; previewStatus=owner-approved-post-extraction-verified-check-remediation; acceptanceRows=4; acceptedRows=4 |
| `a22-owner-input-landing-runway-ready` | pass | runwayStatus=owner-input-recorded-post-runway; patchRows=4; postOwnerInputValidationCommands=8; candidateTargetsMissing=0; candidateTargetsVerified=4 |
| `a22-candidate-mutation-dry-run-current` | pass | executorStatus=already-extracted-and-verified; recordedInstructions=4; applyPermitted=false; candidateMutationRows=0; gateFailures=0 |
| `frontier-groups-non-executable` | pass | ownerInputGroups=2; cleanup/executable/merge/deploy/physical cleanup stay false |

## Boundary

- Evidence only: true
- Records authorization: false
- Records owner input: false
- Records extraction instruction: false
- Modifies candidate: false
- Copies root files: false
- Runs type-check: false
- Runs build: false
- Runs regression: false
- Stage authorized: false
- Commit authorized: false
- Merge authorized: false
- Cleanup authorized: false
- Executable now: false
- Deploy authorized: false
- Destructive Git authorized: false
- Physical lifecycle cleanup authorized: false
- Requires owner reply: true
- Requires separate recording step: true
- Requires separate candidate mutation instruction: true
