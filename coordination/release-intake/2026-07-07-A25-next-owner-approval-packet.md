# A25 Next Owner Approval Packet

Generated: 2026-07-07T15:48:06.769Z

Dirty map signature: `21bf7897e245ce5bceb31315d088e7024d2e12aa53a9a098945ea69c3440b015`

Expanded dirty entries: 5728

Root status entries: 1464

This packet is approval support only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any other physical cleanup. Every approval row remains non-executable until the owner explicitly authorizes the exact approval ID and selected final state or command.

## Summary

- Completion: not complete
- Requirements complete: 9/13
- Plan tasks complete: 3/10
- Package resync approvals: 1
- Owner package approvals: 23
- Physical lifecycle approvals: 39
- Cleanup-authorized rows: 0
- Executable rows: 0

## Recommended Approval Order

| Order | Queue | Approval IDs | Reason |
| ---: | --- | ---: | --- |
| 1 | wave01-package-resync | 1 | Clear package-worktree-only stale entries before the A25/A10/A22 governance package can be reviewed. |
| 2 | owner-package-approvals | 23 | Owner package final-state approvals are required before root dirty entries can move to reviewed commits, exact-path discards, evidence archives, or blockers. |
| 3 | physical-lifecycle-approvals | 39 | Linked worktrees and diverged branches need explicit lifecycle final-state choices before strict lifecycle can pass. |

## Immediate Wave 01 Package Resync Approvals

| Approval ID | Owner | Path | Action kind | Command hint |
| --- | --- | --- | --- | --- |
| `wave01-resync-01-tsconfig-json` | A10 tooling, docs, and report | `tsconfig.json` | owner-approved-package-restore | `git restore --source=HEAD -- tsconfig.json` |

## First Owner Package Approvals

Showing first 12 of 23.

| Approval ID | Owner | Priority | Entries | Current blocker |
| --- | --- | ---: | ---: | --- |
| `a25-git-hygiene-and-release-intake` | A25 git hygiene and release intake | P1 | 4004 | root package has 4004 dirty entries |
| `a22-production-reliability-and-release-engineering` | A22 production reliability and release engineering | P1 | 68 | root package has 68 dirty entries |
| `a06-visualization-lead` | A06 visualization lead | P2 | 460 | root package has 460 dirty entries |
| `a12-backend-api-platform` | A12 backend/API platform | P2 | 175 | root package has 175 dirty entries |
| `a11-qa-and-release-quality` | A11 QA and release quality | P2 | 62 | root package has 62 dirty entries |
| `a10-tooling-docs-and-report` | A10 tooling, docs, and report | P3 | 476 | root package has 476 dirty entries |
| `a05-lesson-lead` | A05 lesson lead | P3 | 128 | root package has 128 dirty entries |
| `a21-content-pipeline-and-rag-operations` | A21 content pipeline and RAG operations | P3 | 74 | root package has 74 dirty entries |
| `a04-practice-lead` | A04 practice lead | P3 | 59 | root package has 59 dirty entries |
| `a03-curriculum-roadmap-lead` | A03 curriculum roadmap lead | P3 | 30 | root package has 30 dirty entries |
| `a18-curriculum-qa-a21-content-pipeline` | A18 curriculum QA / A21 content pipeline | P3 | 30 | root package has 30 dirty entries |
| `a13-teacher-console` | A13 teacher console | P4 | 36 | root package has 36 dirty entries |

## First Physical Lifecycle Approvals

Showing first 12 of 39.

| Approval ID | Branch | State | Current blocker | Owner hints |
| --- | --- | --- | --- | --- |
| `root-main` | `main` | dirty-open-decision | dirty 5728 | A25, A10, A22, effective file owners |
| `codex-a01-app-shell-closure` | `codex/A01-app-shell-closure` | dirty-open-decision | dirty 26 | A01 |
| `codex-a01-shell-lazy-load` | `codex/A01-shell-lazy-load` | dirty-open-decision | dirty 8 | A01 |
| `codex-a02-a15-dashboard-adaptive-closure` | `codex/A02-A15-dashboard-adaptive-closure` | dirty-open-decision | dirty 30 | A02, A15 |
| `codex-a03-roadmap-closure` | `codex/A03-roadmap-closure` | dirty-open-decision | dirty 30 | A03 |
| `codex-a04-practice-closure` | `codex/A04-practice-closure` | dirty-open-decision | dirty 56 | A04 |
| `codex-a05-lesson-checklist-p0` | `codex/A05-lesson-checklist-p0` | clean-diverged-open-decision | behind 2, ahead 0 | A05 |
| `codex-a05-lesson-closure` | `codex/A05-lesson-closure` | dirty-open-decision | dirty 126 | A05 |
| `codex-a05-lesson-pep-load` | `codex/A05-lesson-pep-load` | clean-diverged-open-decision | behind 2, ahead 0 | A05 |
| `codex-a05-next-item-button-scroll` | `codex/A05-next-item-button-scroll` | clean-diverged-open-decision | behind 2, ahead 0 | A05 |
| `codex-a06-manim-three-closure` | `codex/A06-manim-three-closure` | dirty-open-decision | dirty 351 | A06 |
| `codex-a06-visualization-closure` | `codex/A06-visualization-closure` | dirty-open-decision | dirty 437 | A06, A22 |

## Wave Sequence

| Wave | ID | Owner approvals | Physical approvals | Blocked until |
| ---: | --- | ---: | ---: | --- |
| 1 | wave-01-governance-release-hygiene | 3 | 7 | Owner authorizes every selected final state and exact Git operation needed for this wave. |
| 2 | wave-02-shared-contracts | 2 | 4 | Owner authorizes every selected final state and exact Git operation needed for this wave. |
| 3 | wave-03-shell-dashboard-roadmap | 4 | 4 | Owner authorizes every selected final state and exact Git operation needed for this wave. |
| 4 | wave-04-practice-lesson-content | 6 | 7 | Owner authorizes every selected final state and exact Git operation needed for this wave. |
| 5 | wave-05-visualization-ai-runtime | 8 | 12 | Owner authorizes every selected final state and exact Git operation needed for this wave. |
| 6 | wave-06-final-root-and-compose-lifecycle | 0 | 5 | Owner authorizes every selected final state and exact Git operation needed for this wave. |

## Top Cross-Owner Routing Owners

| Owner ID | Owner | Route rows | Files | Type errors |
| --- | --- | ---: | ---: | ---: |
| A06 | A06 visualization lead | 14 | 44 | 3226 |
| A13 | A13 teacher console lead | 13 | 69 | 2017 |
| A18 | A18 curriculum QA and content quality lead | 4 | 10 | 407 |
| A03 | A03 curriculum roadmap lead | 3 | 8 | 225 |
| A04 | A04 practice lead | 2 | 2 | 182 |
| A20 | A20 game design and game-based learning lead | 8 | 9 | 114 |
| A25 | A25 git hygiene and release intake lead | 4 | 4 | 77 |
| A15 | A15 adaptive engine lead | 2 | 2 | 44 |
| A11 | A11 QA and release quality lead | 1 | 1 | 30 |
| A12 | A12 backend/API platform lead | 2 | 2 | 21 |
| A07 | A07 AI tutor lead | 1 | 1 | 12 |

## Top Type-Check Files

| File | Errors |
| --- | ---: |
| `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` | 2688 |
| `components/teacher/TeacherPrepViews.tsx` | 468 |
| `components/teacher/TeacherOperationsView.tsx` | 416 |
| `lib/teacherReviewLesson.ts` | 390 |
| `components/teacher/TeacherReviewLessonView.tsx` | 325 |
| `components/visualizations/three/ThreeDGraphCanvas.tsx` | 272 |
| `lib/teacherReviewLessonPptx.ts` | 246 |
| `data/questions.ts` | 182 |
| `components/visualizations/VisualizationLabPage.tsx` | 174 |
| `components/games/MathVirusBlasterGame.tsx` | 104 |
| `data/topics.ts` | 98 |
| `components/teacher/TeacherResourceAssessmentViews.tsx` | 96 |
