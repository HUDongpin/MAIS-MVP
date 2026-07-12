# A22 Top Clean Candidate Build Blocker Routing

Generated: 2026-07-10T17:10:17.562Z

Dirty map signature: `e30d647e1b51432945713f42ac78b0a2466fcb17192de0235a801ac877a0801f`

Expanded dirty entries: 7636

This is build-blocker routing evidence only. It maps the observed A22 top clean candidate module-resolution blockers to owners and root-local parity sources. It does not copy files, edit the candidate, select a release source, run type-check, run build, run regression, stage, commit, merge, push, deploy, delete, reset, restore, clean, prune, record owner approval, record execution instruction, or authorize cleanup.

## Summary

- Routing status: routing-not-required-build-refresh-required
- Top candidate branch: `codex/A22-us-region-alignment`
- Build status: blocked-build-refresh-required
- Build failure category: post-extraction-build-refresh-required
- Module blocker rows: 0/5
- Resolved previous blocker rows: 5/5
- Build refresh required: yes
- Route groups: 3
- Routed owner rows: 5
- Root parity source rows: 5
- Candidate clean for Git: no
- Candidate status allowed: yes
- Cleanup-authorized rows: 0
- Executable rows: 0

## Owner Routes

| Owner ID | Owner | Blocker rows | Root parity rows | Route groups |
| --- | --- | ---: | ---: | --- |
| A05 | A05 lesson lead | 2 | 2 | a22-build-blocker-a05-a18-a21-a24-california-illustrations |
| A20 | A20 game design and game-based learning lead | 2 | 2 | a22-build-blocker-a20-game-data |
| A06 | A06 visualization lead | 1 | 1 | a22-build-blocker-a06-visualization-back-to-top |

## Build Blocker Rows

| Importer | Missing module | Primary owners | Root parity source | Class |
| --- | --- | --- | --- | --- |
| `app/visualization-lab/page.tsx` | `@/app/visualization-lab/VisualizationLabBackToTopButton` | A06 | yes | import-path-parity |
| `components/games/MathVirusBlasterGame.tsx` | `@/data/mathVirusBlaster` | A20 | yes | root-local-data-module-missing-from-candidate |
| `components/games/MightyTankBattleGame.tsx` | `@/data/mightyTankBattle` | A20 | yes | root-local-data-module-missing-from-candidate |
| `components/lesson/CaliforniaHighSchoolTextbookPage.tsx` | `@/data/usCaliforniaHighSchoolLessonIllustrations` | A05 | yes | root-local-lesson-illustration-data-missing-from-candidate |
| `components/lesson/CaliforniaHighSchoolTextbookStudentPage.tsx` | `@/data/usCaliforniaHighSchoolLessonIllustrations` | A05 | yes | root-local-lesson-illustration-data-missing-from-candidate |

## Validation Rows

| ID | Owner | Status | Passed | Detail |
| --- | --- | --- | --- | --- |
| `build-snapshot-current` | A22 production reliability and release engineering | passed | yes | Build snapshot is aligned with the latest dirty map. |
| `build-blockers-confirmed` | A22 production reliability and release engineering | blocked | no | 0/5 build blocker row(s) are confirmed. |
| `previous-build-blockers-resolved` | A22 production reliability and release engineering | passed | yes | 5/5 previous module-resolution blocker row(s) now resolve in the candidate. |
| `build-blockers-owner-routed` | A25 git hygiene and release intake | passed | yes | 5/5 blocker row(s) have primary owner routes. |
| `build-blockers-non-executable` | A25 git hygiene and release intake | passed | yes | Routing rows do not authorize cleanup, execution, deployment, or merge. |

## Safe Validation Commands

- `npm run release:dirty-map -- --assert-current --max-age-minutes 60`
- `node coordination/release-intake/assert-a22-top-clean-candidate-build-snapshot-current.mjs`
- `node coordination/release-intake/assert-a22-top-clean-candidate-build-blocker-routing-current.mjs`
- `node coordination/release-intake/assert-a22-top-clean-candidate-review-packet-current.mjs`

## Boundary

These routing rows make the A22 build blockers assignable, not executable. Cleanup, merge, deployment, destructive Git, and physical lifecycle cleanup remain unauthorized.
