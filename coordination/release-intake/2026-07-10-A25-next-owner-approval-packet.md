# A25 Next Owner Approval Packet

Generated: 2026-07-10T15:57:39.090Z

Dirty map signature: `37c9d353a7710b8e92d3d766006b7230936ca194044a47770a99ab12d7c6cef1`

Expanded dirty entries: 7221

Root status entries: 1507

This packet is approval support only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any other physical cleanup. Every approval row remains non-executable until the owner explicitly authorizes the exact approval ID and selected final state or command.

## Summary

- Completion: not complete
- Requirements complete: 7/13
- Plan tasks complete: 2/10
- Package resync approvals: 0
- Owner package approvals: 26
- Physical lifecycle approvals: 39
- Cleanup-authorized rows: 0
- Executable rows: 0

## Recommended Approval Order

| Order | Queue | Approval IDs | Reason |
| ---: | --- | ---: | --- |
| 1 | wave01-package-resync | 0 | Clear package-worktree-only stale entries before the A25/A10/A22 governance package can be reviewed. |
| 2 | owner-package-approvals | 26 | Owner package final-state approvals are required before root dirty entries can move to reviewed commits, exact-path discards, evidence archives, or blockers. |
| 3 | physical-lifecycle-approvals | 39 | Linked worktrees and diverged branches need explicit lifecycle final-state choices before strict lifecycle can pass. |

## Immediate Wave 01 Package Resync Approvals

| Approval ID | Owner | Path | Action kind | Command hint |
| --- | --- | --- | --- | --- |
| none | n/a | n/a | n/a | n/a |

## First Owner Package Approvals

Showing first 12 of 26.

| Approval ID | Owner | Priority | Entries | Current blocker |
| --- | --- | ---: | ---: | --- |
| `a25-git-hygiene-and-release-intake` | A25 git hygiene and release intake | P1 | 5287 | root package has 5287 dirty entries |
| `a22-production-reliability-and-release-engineering` | A22 production reliability and release engineering | P1 | 68 | root package has 68 dirty entries |
| `a06-visualization-lead` | A06 visualization lead | P2 | 460 | root package has 460 dirty entries |
| `a12-backend-api-platform` | A12 backend/API platform | P2 | 178 | root package has 178 dirty entries |
| `a11-qa-and-release-quality` | A11 QA and release quality | P2 | 64 | root package has 64 dirty entries |
| `a10-tooling-docs-and-report` | A10 tooling, docs, and report | P3 | 490 | root package has 490 dirty entries |
| `a05-lesson-lead` | A05 lesson lead | P3 | 129 | root package has 129 dirty entries |
| `a21-content-pipeline-and-rag-operations` | A21 content pipeline and RAG operations | P3 | 76 | root package has 76 dirty entries |
| `a04-practice-lead` | A04 practice lead | P3 | 60 | root package has 60 dirty entries |
| `a18-curriculum-qa-a21-content-pipeline` | A18 curriculum QA / A21 content pipeline | P3 | 45 | root package has 45 dirty entries |
| `a03-curriculum-roadmap-lead` | A03 curriculum roadmap lead | P3 | 30 | root package has 30 dirty entries |
| `a24-illustration-exact-layer` | A24 illustration exact-layer | P4 | 168 | root package has 168 dirty entries |

## First Physical Lifecycle Approvals

Showing first 12 of 39.

| Approval ID | Branch | State | Current blocker | Owner hints |
| --- | --- | --- | --- | --- |
| `root-main` | `main` | dirty-open-decision | dirty 7221 | A25, A10, A22, effective file owners |
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
| 1 | wave-01-governance-release-hygiene | 4 | 7 | Owner authorizes every selected final state and exact Git operation needed for this wave. |
| 2 | wave-02-shared-contracts | 2 | 4 | Owner authorizes every selected final state and exact Git operation needed for this wave. |
| 3 | wave-03-shell-dashboard-roadmap | 4 | 4 | Owner authorizes every selected final state and exact Git operation needed for this wave. |
| 4 | wave-04-practice-lesson-content | 7 | 7 | Owner authorizes every selected final state and exact Git operation needed for this wave. |
| 5 | wave-05-visualization-ai-runtime | 9 | 12 | Owner authorizes every selected final state and exact Git operation needed for this wave. |
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
