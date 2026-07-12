# A22 Top Clean Candidate Root-Parity Extraction Plan

Generated: 2026-07-09T14:01:40.079Z

Dirty map signature: `b3d232fd2b9ef81d4efc95903d2e3b316db664d6e9ec6ab366181395b3966be7`

Expanded dirty entries: 6604

This is root-parity extraction planning evidence only. It fingerprints root-local parity sources for the A22 top clean candidate build blockers and names the owner-reviewed target paths or import-alignment choices. It does not copy files, edit the candidate, select a release source, run type-check, run build, run regression, stage, commit, merge, push, deploy, delete, reset, restore, clean, prune, record owner approval, record execution instruction, or authorize cleanup.

## Summary

- Plan status: reviewable-non-executable
- Top candidate branch: `codex/A22-us-region-alignment`
- Blocker rows covered: 5
- Extraction unit rows: 4
- Root sources available: 4/4
- Candidate targets missing: 0/4
- Candidate targets matching root: 4/4
- Cleanup-authorized rows: 0
- Executable rows: 0

## Extraction Units

| Unit | Primary owners | Root parity source | Source exists | Candidate target | Target exists | Covered blockers |
| --- | --- | --- | --- | --- | --- | ---: |
| `a06-visualization-back-to-top-import-parity` | A06 | `components/visualizations/VisualizationLabBackToTopButton.tsx` | yes | `app/visualization-lab/VisualizationLabBackToTopButton.tsx` | yes | 1 |
| `a20-math-virus-blaster-data-parity` | A20 | `data/mathVirusBlaster.ts` | yes | `data/mathVirusBlaster.ts` | yes | 1 |
| `a20-mighty-tank-battle-data-parity` | A20 | `data/mightyTankBattle.ts` | yes | `data/mightyTankBattle.ts` | yes | 1 |
| `a05-california-high-school-lesson-illustration-data-parity` | A05 | `data/usCaliforniaHighSchoolLessonIllustrations.ts` | yes | `data/usCaliforniaHighSchoolLessonIllustrations.ts` | yes | 2 |

## Validation Rows

| ID | Owner | Status | Passed | Detail |
| --- | --- | --- | --- | --- |
| `build-blocker-routing-current` | A25 git hygiene and release intake | passed | yes | A22 build-blocker routing is current; blockers are either routed or resolved with build refresh still required. |
| `root-parity-sources-fingerprinted` | A25 git hygiene and release intake | passed | yes | 4/4 extraction unit root source(s) exist and have SHA-256 fingerprints. |
| `candidate-targets-still-missing` | A22 production reliability and release engineering | passed-controlled-recovery | yes | Candidate target path(s) now exist and match the root parity source under the controlled recovery candidate; refresh A22 build evidence before promotion. |
| `extraction-plan-non-executable` | A25 git hygiene and release intake | passed | yes | The plan records no execution instruction and authorizes no cleanup, merge, deploy, staging, or destructive Git. |

## Safe Validation Commands

- `npm run release:dirty-map -- --assert-current --max-age-minutes 60`
- `node coordination/release-intake/assert-a22-top-clean-candidate-build-blocker-routing-current.mjs`
- `node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-plan-current.mjs`
- `node coordination/release-intake/assert-a22-top-clean-candidate-review-packet-current.mjs`

## Boundary

These rows make extraction reviewable, not executable. Owner instruction is still required before any candidate mutation, merge, deployment, cleanup, destructive Git, or physical lifecycle cleanup.
