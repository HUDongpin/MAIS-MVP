# A22 Top Clean Candidate Root-Parity Extraction Instruction Intake

Generated: 2026-07-07T15:14:15.652Z

Dirty map signature: `84e0553381630f5c29322b7cd071032a65d4d5b479cd222bba15314f9269b4e0`

Expanded dirty entries: 5717

Top candidate: `codex/A22-us-region-alignment`

This intake is evidence-only. It may create or preserve the owner-input scaffold for A22 root-parity extraction instructions, but it does not record extraction instructions, does not mutate the candidate, does not copy root files, does not run type-check/build/regression, and does not authorize cleanup, merge, deploy, broad staging, destructive Git, or physical lifecycle cleanup.

## Summary

- Intake status: ready-to-record-extraction-instruction-rows
- Request status: waiting-for-owner-execution-instruction
- Owner input file: `coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-owner-input.json`
- Owner input action: preserve-existing-owner-input
- Expected rows: 4
- Draft rows: 4
- Proposed instruction rows not recorded: 4
- Owner input checks: 10/10 pass, 0 waiting, 0 failed
- Records extraction-instruction rows: 0
- Modifies candidate rows: 0
- Cleanup-authorized rows: 0
- Executable rows: 0

## Selected Actions In Owner Input

| Unit ID | Allowed actions | Selected action | Provided |
| --- | --- | --- | --- |
| `a06-visualization-back-to-top-import-parity` | reexport, import-align | reexport | yes |
| `a20-math-virus-blaster-data-parity` | same-path-copy | same-path-copy | yes |
| `a20-mighty-tank-battle-data-parity` | same-path-copy | same-path-copy | yes |
| `a05-california-high-school-lesson-illustration-data-parity` | same-path-copy | same-path-copy | yes |

## Proposed Extraction Instruction Rows Do Not Record

| # | Unit ID | Selected action | Candidate target |
| ---: | --- | --- | --- |
| 1 | `a06-visualization-back-to-top-import-parity` | reexport | `app/visualization-lab/VisualizationLabBackToTopButton.tsx` |
| 2 | `a20-math-virus-blaster-data-parity` | same-path-copy | `data/mathVirusBlaster.ts` |
| 3 | `a20-mighty-tank-battle-data-parity` | same-path-copy | `data/mightyTankBattle.ts` |
| 4 | `a05-california-high-school-lesson-illustration-data-parity` | same-path-copy | `data/usCaliforniaHighSchoolLessonIllustrations.ts` |

## Owner Input Checks

| Check | Status | Detail |
| --- | --- | --- |
| `source-current` | pass | expanded=5717 |
| `instruction-request-gate-passing` | pass | requestGateFailures=0 |
| `instruction-request-ready` | pass | requestStatus=waiting-for-owner-execution-instruction; instructionRows=4 |
| `four-draft-rows-available` | pass | draftRows=4 |
| `owner-input-targets-request` | pass | inputUnitIds=4; requestUnitIds=4 |
| `owner-input-selected-action-shape-current` | pass | selectedActionRows=4 |
| `owner-input-no-execution-boundary` | pass | owner input preserves no-cleanup, non-executable, no-deploy, no-merge, and no-candidate-mutation boundary |
| `owner-selected-actions-valid` | pass | each unit must select exactly one allowed action |
| `owner-execution-text-complete` | pass | execution text must include every unitId, selectedAction, targetWorktree, root source, candidate target, and non-cleanup/non-deploy/non-merge terms |
| `owner-metadata-valid` | pass | approvedBy, ISO approvedAt, and notes are required |

## Boundary

- Records extraction instruction: false.
- Modifies candidate: false.
- Copies root files: false.
- Runs type-check: false.
- Runs build: false.
- Runs regression: false.
- Stage authorized: false.
- Commit authorized: false.
- Merge authorized: false.
- Cleanup authorized: false.
- Executable now: false.
- Destructive Git authorized: false.
- Deploy authorized: false.
- Physical lifecycle cleanup authorized: false.
- Requires separate recording step: true.
- Requires separate candidate extraction step: true.
