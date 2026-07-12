# A22 Root-Parity Owner Action Packet

Generated: 2026-07-08T12:21:17.175Z

Focus status: `ready-for-guarded-extraction`

Dirty map signature: `340f99c33d2a1dfd0015d1dc67b58b838156a600307de07438c1189d27ac7b16`

Expanded dirty entries: 6116

Top candidate: `codex/A22-us-region-alignment`

This packet is evidence-only. It previews the owner action needed for A22 root-parity extraction rows, but it does not record owner input, record extraction instructions, copy root files, mutate the candidate, run type-check/build/regression, stage, commit, merge, deploy, clean, delete, reset, prune, or authorize physical lifecycle cleanup.

## Summary

- Focus rows: 4
- Recommended action rows: 4
- Owner input blank: no
- Instruction request: waiting-for-owner-execution-instruction
- Instruction intake: ready-to-record-extraction-instruction-rows
- Intake proposed instruction rows: 4
- Instruction recording: already-recorded
- Recording proposed instruction rows: 4
- Recorded instruction rows: 0
- Guarded extraction: dry-run-ready-requires-explicit-apply
- Guarded recorded instruction rows: 4
- Guarded candidate targets missing: 4
- Guarded candidate git status rows: 0
- Root copy rows: 0
- Candidate mutation rows: 0
- Checks passing: 10/10
- Cleanup-authorized rows: 0
- Executable rows: 0

## Owner Action Rows

| # | Unit ID | Owners | Allowed actions | Recommended selectedAction | Root source | Candidate target |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `a06-visualization-back-to-top-import-parity` | A06, A22, A25 | reexport, import-align | reexport | `components/visualizations/VisualizationLabBackToTopButton.tsx` | `app/visualization-lab/VisualizationLabBackToTopButton.tsx` |
| 2 | `a20-math-virus-blaster-data-parity` | A20, A10, A22, A25 | same-path-copy | same-path-copy | `data/mathVirusBlaster.ts` | `data/mathVirusBlaster.ts` |
| 3 | `a20-mighty-tank-battle-data-parity` | A20, A10, A22, A25 | same-path-copy | same-path-copy | `data/mightyTankBattle.ts` | `data/mightyTankBattle.ts` |
| 4 | `a05-california-high-school-lesson-illustration-data-parity` | A05, A18, A21, A24, A22, A25 | same-path-copy | same-path-copy | `data/usCaliforniaHighSchoolLessonIllustrations.ts` | `data/usCaliforniaHighSchoolLessonIllustrations.ts` |

## Owner Execution Text Required

```text
Authorize A22 root-parity extraction instruction for unitId=a06-visualization-back-to-top-import-parity; topCandidate=codex/A22-us-region-alignment; targetWorktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment; primaryOwnerIds=A06; coordinationOwnerIds=A22,A25; actionMode=owner-reviewed-reexport-or-import-align; rootSource=components/visualizations/VisualizationLabBackToTopButton.tsx; rootSourceSha256=efef3f7c3590ebbd6b21ca56a3d4fcdcab1c0e3dd591bf08ee5a6ccc58707155; candidateTarget=app/visualization-lab/VisualizationLabBackToTopButton.tsx; coveredBlockerRows=1; selectedAction=reexport; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>; No cleanup; No deploy; No merge; No broad staging; No destructive git; No physical lifecycle cleanup.
Authorize A22 root-parity extraction instruction for unitId=a20-math-virus-blaster-data-parity; topCandidate=codex/A22-us-region-alignment; targetWorktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment; primaryOwnerIds=A20; coordinationOwnerIds=A10,A22,A25; actionMode=owner-reviewed-same-path-data-extraction; rootSource=data/mathVirusBlaster.ts; rootSourceSha256=e7e7edfe35ada99e17be43cdfea5cea36e409d52e8a4c3966476209687b495fa; candidateTarget=data/mathVirusBlaster.ts; coveredBlockerRows=1; selectedAction=same-path-copy; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>; No cleanup; No deploy; No merge; No broad staging; No destructive git; No physical lifecycle cleanup.
Authorize A22 root-parity extraction instruction for unitId=a20-mighty-tank-battle-data-parity; topCandidate=codex/A22-us-region-alignment; targetWorktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment; primaryOwnerIds=A20; coordinationOwnerIds=A10,A22,A25; actionMode=owner-reviewed-same-path-data-extraction; rootSource=data/mightyTankBattle.ts; rootSourceSha256=d74bfa43d60d766f818bd7b8e958b386cdff38fc91d3ae5d84889c957c2138e7; candidateTarget=data/mightyTankBattle.ts; coveredBlockerRows=1; selectedAction=same-path-copy; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>; No cleanup; No deploy; No merge; No broad staging; No destructive git; No physical lifecycle cleanup.
Authorize A22 root-parity extraction instruction for unitId=a05-california-high-school-lesson-illustration-data-parity; topCandidate=codex/A22-us-region-alignment; targetWorktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment; primaryOwnerIds=A05; coordinationOwnerIds=A18,A21,A24,A22,A25; actionMode=owner-reviewed-same-path-data-extraction-with-content-signoff; rootSource=data/usCaliforniaHighSchoolLessonIllustrations.ts; rootSourceSha256=366c5b3a2e8ea9a67f1c13e005377f0be4d903d7d4657e15ad2d9f2da0507a28; candidateTarget=data/usCaliforniaHighSchoolLessonIllustrations.ts; coveredBlockerRows=2; selectedAction=same-path-copy; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>; No cleanup; No deploy; No merge; No broad staging; No destructive git; No physical lifecycle cleanup.
```

## Owner Input Patch Preview Do Not Apply

```json
{
  "doNotApply": true,
  "ownerInputFile": "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-owner-input.json",
  "inputKind": "a22-root-parity-extraction-instruction-owner-input",
  "applyToUnitIds": [
    "a06-visualization-back-to-top-import-parity",
    "a20-math-virus-blaster-data-parity",
    "a20-mighty-tank-battle-data-parity",
    "a05-california-high-school-lesson-illustration-data-parity"
  ],
  "selectedActions": [
    {
      "unitId": "a06-visualization-back-to-top-import-parity",
      "primaryOwnerIds": [
        "A06"
      ],
      "coordinationOwnerIds": [
        "A22",
        "A25"
      ],
      "allowedActions": [
        "reexport",
        "import-align"
      ],
      "selectedAction": "reexport",
      "rootSource": "components/visualizations/VisualizationLabBackToTopButton.tsx",
      "rootSourceSha256": "efef3f7c3590ebbd6b21ca56a3d4fcdcab1c0e3dd591bf08ee5a6ccc58707155",
      "candidateTarget": "app/visualization-lab/VisualizationLabBackToTopButton.tsx"
    },
    {
      "unitId": "a20-math-virus-blaster-data-parity",
      "primaryOwnerIds": [
        "A20"
      ],
      "coordinationOwnerIds": [
        "A10",
        "A22",
        "A25"
      ],
      "allowedActions": [
        "same-path-copy"
      ],
      "selectedAction": "same-path-copy",
      "rootSource": "data/mathVirusBlaster.ts",
      "rootSourceSha256": "e7e7edfe35ada99e17be43cdfea5cea36e409d52e8a4c3966476209687b495fa",
      "candidateTarget": "data/mathVirusBlaster.ts"
    },
    {
      "unitId": "a20-mighty-tank-battle-data-parity",
      "primaryOwnerIds": [
        "A20"
      ],
      "coordinationOwnerIds": [
        "A10",
        "A22",
        "A25"
      ],
      "allowedActions": [
        "same-path-copy"
      ],
      "selectedAction": "same-path-copy",
      "rootSource": "data/mightyTankBattle.ts",
      "rootSourceSha256": "d74bfa43d60d766f818bd7b8e958b386cdff38fc91d3ae5d84889c957c2138e7",
      "candidateTarget": "data/mightyTankBattle.ts"
    },
    {
      "unitId": "a05-california-high-school-lesson-illustration-data-parity",
      "primaryOwnerIds": [
        "A05"
      ],
      "coordinationOwnerIds": [
        "A18",
        "A21",
        "A24",
        "A22",
        "A25"
      ],
      "allowedActions": [
        "same-path-copy"
      ],
      "selectedAction": "same-path-copy",
      "rootSource": "data/usCaliforniaHighSchoolLessonIllustrations.ts",
      "rootSourceSha256": "366c5b3a2e8ea9a67f1c13e005377f0be4d903d7d4657e15ad2d9f2da0507a28",
      "candidateTarget": "data/usCaliforniaHighSchoolLessonIllustrations.ts"
    }
  ],
  "ownerExecutionText": "Authorize A22 root-parity extraction instruction for unitId=a06-visualization-back-to-top-import-parity; topCandidate=codex/A22-us-region-alignment; targetWorktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment; primaryOwnerIds=A06; coordinationOwnerIds=A22,A25; actionMode=owner-reviewed-reexport-or-import-align; rootSource=components/visualizations/VisualizationLabBackToTopButton.tsx; rootSourceSha256=efef3f7c3590ebbd6b21ca56a3d4fcdcab1c0e3dd591bf08ee5a6ccc58707155; candidateTarget=app/visualization-lab/VisualizationLabBackToTopButton.tsx; coveredBlockerRows=1; selectedAction=reexport; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>; No cleanup; No deploy; No merge; No broad staging; No destructive git; No physical lifecycle cleanup.\nAuthorize A22 root-parity extraction instruction for unitId=a20-math-virus-blaster-data-parity; topCandidate=codex/A22-us-region-alignment; targetWorktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment; primaryOwnerIds=A20; coordinationOwnerIds=A10,A22,A25; actionMode=owner-reviewed-same-path-data-extraction; rootSource=data/mathVirusBlaster.ts; rootSourceSha256=e7e7edfe35ada99e17be43cdfea5cea36e409d52e8a4c3966476209687b495fa; candidateTarget=data/mathVirusBlaster.ts; coveredBlockerRows=1; selectedAction=same-path-copy; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>; No cleanup; No deploy; No merge; No broad staging; No destructive git; No physical lifecycle cleanup.\nAuthorize A22 root-parity extraction instruction for unitId=a20-mighty-tank-battle-data-parity; topCandidate=codex/A22-us-region-alignment; targetWorktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment; primaryOwnerIds=A20; coordinationOwnerIds=A10,A22,A25; actionMode=owner-reviewed-same-path-data-extraction; rootSource=data/mightyTankBattle.ts; rootSourceSha256=d74bfa43d60d766f818bd7b8e958b386cdff38fc91d3ae5d84889c957c2138e7; candidateTarget=data/mightyTankBattle.ts; coveredBlockerRows=1; selectedAction=same-path-copy; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>; No cleanup; No deploy; No merge; No broad staging; No destructive git; No physical lifecycle cleanup.\nAuthorize A22 root-parity extraction instruction for unitId=a05-california-high-school-lesson-illustration-data-parity; topCandidate=codex/A22-us-region-alignment; targetWorktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment; primaryOwnerIds=A05; coordinationOwnerIds=A18,A21,A24,A22,A25; actionMode=owner-reviewed-same-path-data-extraction-with-content-signoff; rootSource=data/usCaliforniaHighSchoolLessonIllustrations.ts; rootSourceSha256=366c5b3a2e8ea9a67f1c13e005377f0be4d903d7d4657e15ad2d9f2da0507a28; candidateTarget=data/usCaliforniaHighSchoolLessonIllustrations.ts; coveredBlockerRows=2; selectedAction=same-path-copy; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>; No cleanup; No deploy; No merge; No broad staging; No destructive git; No physical lifecycle cleanup.",
  "approvedBy": "<owner>",
  "approvedAt": "<ISO-8601>",
  "notes": "<scope and checks>",
  "cleanupAuthorized": false,
  "executableNow": false,
  "deployAuthorized": false,
  "mergeAuthorized": false,
  "stageAuthorized": false,
  "destructiveGitAuthorized": false,
  "physicalLifecycleCleanupAuthorized": false,
  "boundary": {
    "previewOnly": true,
    "ownerInputOnly": true,
    "recordsOwnerInput": false,
    "recordsExtractionInstruction": false,
    "modifiesCandidate": false,
    "copiesRootFiles": false,
    "runsTypeCheck": false,
    "runsBuild": false,
    "runsRegression": false,
    "cleanupAuthorized": false,
    "executableNow": false,
    "deployAuthorized": false,
    "mergeAuthorized": false,
    "stageAuthorized": false,
    "destructiveGitAuthorized": false,
    "physicalLifecycleCleanupAuthorized": false
  }
}
```

## Required Owner Reply Fields

- ownerExecutionText
- selectedActions
- approvedBy
- approvedAt
- notes

## Checks

| Check | Status | Detail |
| --- | --- | --- |
| `source-current` | pass | sourceCurrentnessFailures=0; expanded=6116 |
| `source-gates-passing` | pass | gateFailures=0 |
| `instruction-request-ready` | pass | requestStatus=waiting-for-owner-execution-instruction; instructionRows=4 |
| `owner-action-rows-complete` | pass | ownerActionRows=4; recommendedActionsValid=true |
| `owner-input-shape-current` | pass | ownerInputRows=4; ownerInputBlank=false |
| `owner-input-patch-preview-only` | pass | patchPreviewRows=4 |
| `instruction-intake-lifecycle-safe` | pass | intakeStatus=ready-to-record-extraction-instruction-rows; proposedInstructionRows=4 |
| `instruction-recording-lifecycle-safe` | pass | recorderStatus=already-recorded; recordedRows=0 |
| `guarded-extraction-lifecycle-safe` | pass | executorStatus=dry-run-ready-requires-explicit-apply; candidateMutationRows=0 |
| `no-executable-boundary` | pass | owner action packet remains evidence-only and non-executable |

## Boundary

- Evidence only: true
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
- Destructive Git authorized: false
- Deploy authorized: false
- Physical lifecycle cleanup authorized: false
- Requires owner reply: true
- Requires separate recording step: true
- Requires separate candidate mutation instruction: true
