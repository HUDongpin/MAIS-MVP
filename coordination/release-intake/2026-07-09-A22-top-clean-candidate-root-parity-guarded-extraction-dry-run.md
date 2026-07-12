# A22 Root-Parity Guarded Extraction Dry Run

Generated: 2026-07-09T14:01:40.876Z

Mode: `dry-run`

Executor status: `already-extracted-and-verified`

Dirty map signature: `b3d232fd2b9ef81d4efc95903d2e3b316db664d6e9ec6ab366181395b3966be7`

Expanded dirty entries: 6604

This executor is fail-closed evidence only. It validates whether recorded A22 root-parity extraction instructions are present and current, but it does not copy root files, mutate the A22 candidate, run type-check/build/regression, stage, commit, merge, deploy, clean, delete, reset, prune, record owner approval, or record execution instructions.

## Summary

- Expected rows: 4
- Recorded instruction rows: 4
- Candidate git status rows: 7
- Root sources SHA matched: 4/4
- Candidate targets missing: 0/4
- Candidate targets verified: 4/4
- Preflight checks: 12/12
- Apply requested: false
- Apply permitted: false
- Mutations performed: false
- Root copy rows: 0
- Candidate mutation rows: 0
- Cleanup-authorized rows: 0
- Executable rows: 0

## Extraction Units

| Unit ID | Root source | Root SHA matches | Candidate target | Target exists | Instruction recorded |
| --- | --- | --- | --- | --- | --- |
| `a06-visualization-back-to-top-import-parity` | `components/visualizations/VisualizationLabBackToTopButton.tsx` | yes | `app/visualization-lab/VisualizationLabBackToTopButton.tsx` | yes | yes |
| `a20-math-virus-blaster-data-parity` | `data/mathVirusBlaster.ts` | yes | `data/mathVirusBlaster.ts` | yes | yes |
| `a20-mighty-tank-battle-data-parity` | `data/mightyTankBattle.ts` | yes | `data/mightyTankBattle.ts` | yes | yes |
| `a05-california-high-school-lesson-illustration-data-parity` | `data/usCaliforniaHighSchoolLessonIllustrations.ts` | yes | `data/usCaliforniaHighSchoolLessonIllustrations.ts` | yes | yes |

## Preflight Checks

| Check | Status | Detail |
| --- | --- | --- |
| `mode-is-explicit` | pass | mode=dry-run |
| `source-current` | pass | sourceCurrentnessFailures=0; post-extraction target hashes verified |
| `target-worktree-contained` | pass | targetWorktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment |
| `four-extraction-units` | pass | expectedRows=4; extractionUnits=4 |
| `instruction-recording-source-safe` | pass | recorderStatus=already-recorded |
| `recorded-instructions-state-coherent` | pass | recordedInstructionRows=4; expectedRows=4 |
| `recorded-instructions-safe-boundary` | pass | recorded rows must not authorize cleanup, execution, deploy, merge, staging, destructive git, or physical lifecycle cleanup |
| `root-sources-fingerprint-match` | pass | matchingRootSources=4/4 |
| `candidate-targets-preflight` | pass | verifiedTargets=4/4 |
| `candidate-git-status-clean` | pass | candidateGitStatusRows=7; allTargetsVerified=true |
| `no-candidate-mutation-in-this-executor` | pass | this executor writes evidence only and never copies root files into the candidate |
| `extraction-instruction-file-shape` | pass | instructionFileRows=4; targetRows=4 |

## Boundary

- Evidence only: true
- Records owner approval: false
- Records execution instruction: false
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
- Requires separate owner candidate mutation instruction: false
