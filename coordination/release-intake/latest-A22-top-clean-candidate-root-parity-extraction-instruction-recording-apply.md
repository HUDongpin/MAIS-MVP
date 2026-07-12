# A22 Root-Parity Extraction Instruction Recording Apply Report

Generated: 2026-07-07T15:17:15.092Z

Mode: `apply-recording`

Recorder status: `not-ready-check-failures`

Intake status: `ready-to-record-extraction-instruction-rows`

Dirty map signature: `84e0553381630f5c29322b7cd071032a65d4d5b479cd222bba15314f9269b4e0`

Expanded dirty entries: 5717

This recorder is fail-closed. Dry-run mode writes evidence only. Apply-recording mode can update only `coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instructions.json`, and only after A22 root-parity owner input validates all four extraction instruction rows. It never mutates the candidate, copies root files, runs type-check/build/regression, stages, commits, merges, deploys, or authorizes cleanup.

## Summary

- Expected rows: 4
- Existing instruction rows: 4
- Proposed instruction rows not applied: 4
- Recording checks: 7/8
- Apply requested: true
- Apply permitted: false
- Mutations performed: true
- Records extraction-instruction rows: 4
- Modifies candidate rows: 0
- Cleanup-authorized rows: 0
- Executable rows: 0

## Proposed Extraction Instruction Rows Do Not Apply

| # | Unit ID | Selected action | Root source | Candidate target |
| ---: | --- | --- | --- | --- |
| 1 | `a06-visualization-back-to-top-import-parity` | reexport | `components/visualizations/VisualizationLabBackToTopButton.tsx` | `app/visualization-lab/VisualizationLabBackToTopButton.tsx` |
| 2 | `a20-math-virus-blaster-data-parity` | same-path-copy | `data/mathVirusBlaster.ts` | `data/mathVirusBlaster.ts` |
| 3 | `a20-mighty-tank-battle-data-parity` | same-path-copy | `data/mightyTankBattle.ts` | `data/mightyTankBattle.ts` |
| 4 | `a05-california-high-school-lesson-illustration-data-parity` | same-path-copy | `data/usCaliforniaHighSchoolLessonIllustrations.ts` | `data/usCaliforniaHighSchoolLessonIllustrations.ts` |

## Recording Checks

| Check | Status | Detail |
| --- | --- | --- |
| `mode-is-explicit` | pass | mode=apply-recording |
| `source-current` | pass | sourceCurrentnessFailures=0 |
| `four-unit-ids` | pass | applyToUnitIds=4; expectedRows=4 |
| `no-partial-existing-target-records` | pass | existingTargetRows=4 |
| `proposed-rows-match-status` | pass | intakeStatus=ready-to-record-extraction-instruction-rows; proposedRows=4; expectedRows=4 |
| `proposed-rows-safe-boundary` | pass | proposed rows must not authorize cleanup, execution, deploy, merge, staging, destructive git, or physical lifecycle cleanup |
| `recording-status-coherent` | pass | recordingStatus=already-recorded |
| `apply-requires-ready-status` | fail | mode=apply-recording; status=already-recorded |

## Boundary

- Records extraction instruction: true
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
- Requires explicit apply-recording flag: true
- Requires separate candidate extraction step: true
