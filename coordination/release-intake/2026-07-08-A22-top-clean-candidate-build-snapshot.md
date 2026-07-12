# A22 Top Clean Candidate Build Snapshot

Generated: 2026-07-08T12:21:15.268Z

Dirty map signature: `340f99c33d2a1dfd0015d1dc67b58b838156a600307de07438c1189d27ac7b16`

Expanded dirty entries: 6116

This snapshot records the observed A22 top candidate build result without rerunning `next build`. The real build required owner-approved escalated write access because Next writes `.next` in the linked worktree. This artifact does not select a release source, rerun build, stage, commit, merge, push, deploy, delete, reset, restore, clean, prune, record owner approval, record execution instruction, or authorize cleanup.

## Summary

- Build status: failed
- Top candidate branch: `codex/A22-us-region-alignment`
- Top candidate path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`
- Command observed: `env NEXT_TELEMETRY_DISABLED=1 npm run build`
- Exit status: 1
- Failure category: webpack-module-not-found
- Module blocker rows: 5/5
- Candidate normal git status entries: 0
- Ignored entries: 2
- .next present: yes
- .next size: 948 MiB
- tsconfig.tsbuildinfo present: no
- Promotion eligible now: no
- Release source selected: no
- Cleanup-authorized rows: 0
- Executable rows: 0

## Validation Rows

| ID | Owner | Status | Passed | Detail |
| --- | --- | --- | --- | --- |
| `candidate-build-observed` | A22 production reliability and release engineering | observed | yes | A real candidate npm run build was observed with owner-approved escalated write access. |
| `candidate-build-passed` | A22 production reliability and release engineering | failed | no | Candidate build failed with 5 confirmed module-resolution blocker row(s). |
| `candidate-build-blockers-confirmed` | A22 production reliability and release engineering | passed | yes | 5/5 module-resolution blocker row(s) are confirmed by source inspection. |
| `candidate-build-git-clean-after` | A25 git hygiene and release intake | passed | yes | Candidate worktree normal git status entries after build: 0. |
| `candidate-build-artifact-present` | A22 production reliability and release engineering | observed | yes | .next build artifact is present and ignored; cleanup is not authorized in this pass. |

## Module Blockers

| Importer | Module | Import present | Target resolved | Blocker confirmed |
| --- | --- | --- | --- | --- |
| `app/visualization-lab/page.tsx` | `@/app/visualization-lab/VisualizationLabBackToTopButton` | yes | no | yes |
| `components/games/MathVirusBlasterGame.tsx` | `@/data/mathVirusBlaster` | yes | no | yes |
| `components/games/MightyTankBattleGame.tsx` | `@/data/mightyTankBattle` | yes | no | yes |
| `components/lesson/CaliforniaHighSchoolTextbookPage.tsx` | `@/data/usCaliforniaHighSchoolLessonIllustrations` | yes | no | yes |
| `components/lesson/CaliforniaHighSchoolTextbookStudentPage.tsx` | `@/data/usCaliforniaHighSchoolLessonIllustrations` | yes | no | yes |

## Boundary

A failed build is a validation blocker. The ignored `.next` artifact remains present because cleanup is not authorized in this pass.
