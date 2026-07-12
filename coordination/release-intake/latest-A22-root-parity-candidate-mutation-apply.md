# A22 Root-Parity Candidate Mutation Apply Report

Generated: 2026-07-08T14:00:44.654Z

Mode: `apply-candidate-mutation`

Executor status: `not-ready-check-failures`

Dirty map signature: `340f99c33d2a1dfd0015d1dc67b58b838156a600307de07438c1189d27ac7b16`

Expanded dirty entries: 6116

This executor is fail-closed. Dry-run mode writes evidence only. Apply-candidate-mutation mode may copy only the four recorded A22 root-parity source files into the contained top-candidate worktree, and only after recorded extraction instructions plus a separate owner candidate-mutation input are present. It never stages, commits, merges, deploys, cleans, deletes, resets, prunes, edits root source files, or runs type-check/build/regression.

## Summary

- Expected rows: 4
- Recorded instruction rows: 4
- Root sources SHA matched: 4/4
- Candidate targets missing: 4/4
- Candidate targets verified: 0/4
- Candidate git status rows: 4
- Owner input blank: false
- Owner mutation input file: `coordination/release-intake/latest-A22-root-parity-candidate-mutation-owner-input.json`
- Preflight checks: 8/11
- Apply requested: true
- Apply permitted: false
- Mutations performed: true
- Root copy rows: 4
- Candidate mutation rows: 4
- Cleanup-authorized rows: 0
- Executable rows: 0

## Candidate Mutation Rows

| Unit ID | Selected action | Root source | Root SHA matches | Candidate target | Instruction recorded | Target exists |
| --- | --- | --- | --- | --- | --- | --- |
| `a06-visualization-back-to-top-import-parity` | reexport | `components/visualizations/VisualizationLabBackToTopButton.tsx` | yes | `app/visualization-lab/VisualizationLabBackToTopButton.tsx` | yes | no |
| `a20-math-virus-blaster-data-parity` | same-path-copy | `data/mathVirusBlaster.ts` | yes | `data/mathVirusBlaster.ts` | yes | no |
| `a20-mighty-tank-battle-data-parity` | same-path-copy | `data/mightyTankBattle.ts` | yes | `data/mightyTankBattle.ts` | yes | no |
| `a05-california-high-school-lesson-illustration-data-parity` | same-path-copy | `data/usCaliforniaHighSchoolLessonIllustrations.ts` | yes | `data/usCaliforniaHighSchoolLessonIllustrations.ts` | yes | no |

## Preflight Checks

| Check | Status | Detail |
| --- | --- | --- |
| `mode-is-explicit` | pass | mode=apply-candidate-mutation |
| `source-current` | fail | sourceCurrentnessFailures=1 |
| `target-worktree-contained` | pass | targetWorktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment |
| `four-mutation-units` | pass | mutationUnits=4 |
| `recorded-instruction-state-coherent` | pass | recordedRows=4; status=not-ready-source-stale |
| `root-source-fingerprints-ready-or-waiting` | pass | rootShaMatched=4/4 |
| `candidate-targets-safe` | pass | missing=4; verified=0 |
| `candidate-git-status-clean` | fail | candidateGitStatusRows=4; allTargetsVerified=false |
| `owner-candidate-mutation-input-state` | pass | ownerInputBlank=false; ownerReady=true |
| `apply-requires-ready-status` | fail | mode=apply-candidate-mutation; status=not-ready-source-stale |
| `no-cleanup-merge-deploy-boundary` | pass | candidate mutation input must not authorize cleanup, merge, deploy, broad staging, destructive git, or physical lifecycle cleanup |

## Boundary

- Evidence only: false
- Modifies candidate: true
- Copies root files: true
- Writes root source files: false
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
- Requires recorded extraction instructions: false
- Requires separate owner candidate mutation input: true
- Requires explicit apply-candidate-mutation flag: true
