# A22 Top Clean Candidate Build Snapshot

Generated: 2026-07-09T14:01:39.669Z

Dirty map signature: `b3d232fd2b9ef81d4efc95903d2e3b316db664d6e9ec6ab366181395b3966be7`

Expanded dirty entries: 6604

This snapshot records the observed A22 top candidate build result without rerunning `next build`. The real build required owner-approved escalated write access because Next writes `.next` in the linked worktree. This artifact does not select a release source, rerun build, stage, commit, merge, push, deploy, delete, reset, restore, clean, prune, record owner approval, record execution instruction, or authorize cleanup.

## Summary

- Build status: blocked-build-refresh-required
- Top candidate branch: `codex/A22-us-region-alignment`
- Top candidate path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`
- Command observed: `env NEXT_TELEMETRY_DISABLED=1 npm run build`
- Exit status: null
- Failure category: post-extraction-build-refresh-required
- Module blocker rows: 0/5
- Resolved previous module blocker rows: 5/5
- Build refresh required: yes
- Candidate normal git status entries: 7
- Candidate status allowed: yes
- Bounded dirty accepted: yes
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
| `candidate-build-observed` | A22 production reliability and release engineering | blocked | no | Previous build observation is stale after root-parity extraction; a fresh escalated build observation is required. |
| `candidate-build-passed` | A22 production reliability and release engineering | failed | no | Candidate build failed with 0 confirmed module-resolution blocker row(s). |
| `candidate-build-blockers-confirmed` | A22 production reliability and release engineering | blocked | no | 0/5 module-resolution blocker row(s) are confirmed by source inspection. |
| `candidate-build-blockers-resolved` | A22 production reliability and release engineering | passed | yes | 5/5 previous module-resolution blocker row(s) now resolve in the candidate. |
| `candidate-build-git-clean-after` | A25 git hygiene and release intake | passed | yes | Candidate worktree normal git status entries after build snapshot: 7; boundedDirtyAccepted=true. |
| `candidate-build-artifact-present` | A22 production reliability and release engineering | observed | yes | .next build artifact is present and ignored; cleanup is not authorized in this pass. |

## Module Blockers

| Importer | Module | Import present | Target resolved | Blocker confirmed |
| --- | --- | --- | --- | --- |
| `app/visualization-lab/page.tsx` | `@/app/visualization-lab/VisualizationLabBackToTopButton` | yes | yes | no |
| `components/games/MathVirusBlasterGame.tsx` | `@/data/mathVirusBlaster` | yes | yes | no |
| `components/games/MightyTankBattleGame.tsx` | `@/data/mightyTankBattle` | yes | yes | no |
| `components/lesson/CaliforniaHighSchoolTextbookPage.tsx` | `@/data/usCaliforniaHighSchoolLessonIllustrations` | yes | yes | no |
| `components/lesson/CaliforniaHighSchoolTextbookStudentPage.tsx` | `@/data/usCaliforniaHighSchoolLessonIllustrations` | yes | yes | no |

## Boundary

Failed build or stale build-observation status remains a validation blocker. The ignored `.next` artifact remains present because cleanup is not authorized in this pass.
