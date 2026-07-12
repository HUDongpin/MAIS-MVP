# A22 Top Clean Candidate Root-Parity Extraction Instruction Request

Generated: 2026-07-07T15:08:02.465Z

Request status: waiting-for-owner-execution-instruction

Top candidate: `codex/A22-us-region-alignment`

This is an owner-instruction request only. It prepares exact review text for the A22 root-parity extraction units, but it does not write owner input, record approval, copy files, mutate the candidate, run type-check, run build, run regression, stage, commit, merge, push, deploy, clean, delete, reset, prune, or authorize physical lifecycle cleanup.

## Summary

- Instruction rows: 4
- Ready for owner instruction rows: 4
- Root sources available: 4/4
- Candidate targets missing: 4/4
- Blocker rows covered: 5
- Proposed action options: 5
- Cleanup-authorized rows: 0
- Executable rows: 0

## Instruction Rows

| Unit | Owners | Action mode | Root source | Candidate target | Blockers | Target exists |
| --- | --- | --- | --- | --- | ---: | --- |
| `a06-visualization-back-to-top-import-parity` | A06, A22, A25 | owner-reviewed-reexport-or-import-align | `components/visualizations/VisualizationLabBackToTopButton.tsx` | `app/visualization-lab/VisualizationLabBackToTopButton.tsx` | 1 | no |
| `a20-math-virus-blaster-data-parity` | A20, A10, A22, A25 | owner-reviewed-same-path-data-extraction | `data/mathVirusBlaster.ts` | `data/mathVirusBlaster.ts` | 1 | no |
| `a20-mighty-tank-battle-data-parity` | A20, A10, A22, A25 | owner-reviewed-same-path-data-extraction | `data/mightyTankBattle.ts` | `data/mightyTankBattle.ts` | 1 | no |
| `a05-california-high-school-lesson-illustration-data-parity` | A05, A18, A21, A24, A22, A25 | owner-reviewed-same-path-data-extraction-with-content-signoff | `data/usCaliforniaHighSchoolLessonIllustrations.ts` | `data/usCaliforniaHighSchoolLessonIllustrations.ts` | 2 | no |

## Copyable Owner Instruction Texts

### a06-visualization-back-to-top-import-parity

`Authorize A22 root-parity extraction instruction for unitId=a06-visualization-back-to-top-import-parity; topCandidate=codex/A22-us-region-alignment; targetWorktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment; primaryOwnerIds=A06; coordinationOwnerIds=A22,A25; actionMode=owner-reviewed-reexport-or-import-align; rootSource=components/visualizations/VisualizationLabBackToTopButton.tsx; rootSourceSha256=efef3f7c3590ebbd6b21ca56a3d4fcdcab1c0e3dd591bf08ee5a6ccc58707155; candidateTarget=app/visualization-lab/VisualizationLabBackToTopButton.tsx; coveredBlockerRows=1; selectedAction=<reexport|import-align|same-path-copy>; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>; No cleanup; No deploy; No merge; No broad staging; No destructive git; No physical lifecycle cleanup.`

Options:
- A06 app-level re-export: Use only if A06 confirms an app-level re-export is the narrowest parity fix for the candidate import path.
- A06 importer alignment: Use only if A06 confirms changing the import path is preferable to adding an app-level re-export.

### a20-math-virus-blaster-data-parity

`Authorize A22 root-parity extraction instruction for unitId=a20-math-virus-blaster-data-parity; topCandidate=codex/A22-us-region-alignment; targetWorktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment; primaryOwnerIds=A20; coordinationOwnerIds=A10,A22,A25; actionMode=owner-reviewed-same-path-data-extraction; rootSource=data/mathVirusBlaster.ts; rootSourceSha256=e7e7edfe35ada99e17be43cdfea5cea36e409d52e8a4c3966476209687b495fa; candidateTarget=data/mathVirusBlaster.ts; coveredBlockerRows=1; selectedAction=<reexport|import-align|same-path-copy>; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>; No cleanup; No deploy; No merge; No broad staging; No destructive git; No physical lifecycle cleanup.`

Options:
- owner-reviewed same-path parity extraction: Use only after the owning content/runtime session confirms the root-local source is the correct parity source for this candidate.

### a20-mighty-tank-battle-data-parity

`Authorize A22 root-parity extraction instruction for unitId=a20-mighty-tank-battle-data-parity; topCandidate=codex/A22-us-region-alignment; targetWorktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment; primaryOwnerIds=A20; coordinationOwnerIds=A10,A22,A25; actionMode=owner-reviewed-same-path-data-extraction; rootSource=data/mightyTankBattle.ts; rootSourceSha256=d74bfa43d60d766f818bd7b8e958b386cdff38fc91d3ae5d84889c957c2138e7; candidateTarget=data/mightyTankBattle.ts; coveredBlockerRows=1; selectedAction=<reexport|import-align|same-path-copy>; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>; No cleanup; No deploy; No merge; No broad staging; No destructive git; No physical lifecycle cleanup.`

Options:
- owner-reviewed same-path parity extraction: Use only after the owning content/runtime session confirms the root-local source is the correct parity source for this candidate.

### a05-california-high-school-lesson-illustration-data-parity

`Authorize A22 root-parity extraction instruction for unitId=a05-california-high-school-lesson-illustration-data-parity; topCandidate=codex/A22-us-region-alignment; targetWorktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment; primaryOwnerIds=A05; coordinationOwnerIds=A18,A21,A24,A22,A25; actionMode=owner-reviewed-same-path-data-extraction-with-content-signoff; rootSource=data/usCaliforniaHighSchoolLessonIllustrations.ts; rootSourceSha256=366c5b3a2e8ea9a67f1c13e005377f0be4d903d7d4657e15ad2d9f2da0507a28; candidateTarget=data/usCaliforniaHighSchoolLessonIllustrations.ts; coveredBlockerRows=2; selectedAction=<reexport|import-align|same-path-copy>; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>; No cleanup; No deploy; No merge; No broad staging; No destructive git; No physical lifecycle cleanup.`

Options:
- owner-reviewed same-path parity extraction: Use only after the owning content/runtime session confirms the root-local source is the correct parity source for this candidate.

## Validation Rows

| ID | Status | Passed | Detail |
| --- | --- | --- | --- |
| `root-parity-plan-current` | passed | yes | Root-parity extraction plan projection is current. |
| `owner-instruction-texts-prepared` | passed | yes | 4 owner instruction text row(s) prepared for the 4 root-parity extraction units. |
| `candidate-targets-still-missing` | passed | yes | 4/4 candidate target path(s) remain missing before extraction. |
| `request-non-executable` | passed | yes | Instruction request does not authorize cleanup or execution. |

## Safe Validation Commands

- `npm run release:dirty-map -- --assert-current --max-age-minutes 60`
- `node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-plan-current.mjs`
- `node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-request-current.mjs`
- `node coordination/release-intake/assert-a22-top-clean-candidate-review-packet-current.mjs`

## Boundary

This request is reviewable, not executable. It keeps cleanup, merge, deployment, broad staging, destructive Git, candidate mutation, and physical lifecycle cleanup unauthorized.
