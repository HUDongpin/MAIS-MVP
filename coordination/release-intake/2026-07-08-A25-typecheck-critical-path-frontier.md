# A25 Type-Check Critical Path Frontier

Generated: 2026-07-08T14:14:19.800Z

Dirty map signature: `4892e406613fc3846378621b84ba0f486bb8ebf371c35837eae544472596f318`

Expanded dirty entries: 6130

This is A25-owned verification-routing evidence only. It does not authorize staging, committing, merging, cleanup, destructive Git, worktree removal, branch deletion, deploy, or dirty-root release.

## Summary

- Type-check error lines: 9907
- Top type-check files: 12
- Frontier rows: 12
- Critical owner rows: 6
- Failed checks: 34
- Blocked owner-package rows: 14
- Cleanup-authorized rows: 0
- Executable rows: 0

## Owner Frontier

| Owner ID | Owner | Files | Frontier rows | Impacted package rows | Matched errors | Recommended worktree |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| A06 | A06 visualization lead | 3 | 3 | 37 | 3134 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-visualization-closure` |
| A13 | A13 teacher console lead | 6 | 6 | 66 | 1941 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure` |
| A18 | A18 curriculum QA and content quality lead | 2 | 2 | 4 | 280 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A18-A21-content-evidence-closure` |
| A04 | A04 practice lead | 1 | 1 | 2 | 182 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A04-practice-closure` |
| A20 | A20 game design and game-based learning lead | 1 | 1 | 8 | 104 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A17-A20-game-motivation-closure` |
| A03 | A03 curriculum roadmap lead | 1 | 1 | 2 | 98 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A03-roadmap-closure` |

## File Frontier

| Rank | File | Errors | Primary owner | Route kind | Impacted package rows | Waves |
| ---: | --- | ---: | --- | --- | ---: | --- |
| 1 | `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` | 2688 | A06 | package-owner | 13 | wave-02-shared-contracts, wave-03-shell-dashboard-roadmap, wave-04-practice-lesson-content, wave-05-visualization-ai-runtime |
| 2 | `components/teacher/TeacherPrepViews.tsx` | 468 | A13 | package-owner | 13 | wave-01-governance-release-hygiene, wave-03-shell-dashboard-roadmap, wave-04-practice-lesson-content, wave-05-visualization-ai-runtime |
| 3 | `components/teacher/TeacherOperationsView.tsx` | 416 | A13 | package-owner | 13 | wave-01-governance-release-hygiene, wave-03-shell-dashboard-roadmap, wave-04-practice-lesson-content, wave-05-visualization-ai-runtime |
| 4 | `lib/teacherReviewLesson.ts` | 390 | A13 | package-owner | 13 | wave-01-governance-release-hygiene, wave-03-shell-dashboard-roadmap, wave-04-practice-lesson-content, wave-05-visualization-ai-runtime |
| 5 | `components/teacher/TeacherReviewLessonView.tsx` | 325 | A13 | package-owner | 13 | wave-01-governance-release-hygiene, wave-03-shell-dashboard-roadmap, wave-04-practice-lesson-content, wave-05-visualization-ai-runtime |
| 6 | `components/visualizations/three/ThreeDGraphCanvas.tsx` | 272 | A06 | package-owner | 13 | wave-02-shared-contracts, wave-03-shell-dashboard-roadmap, wave-04-practice-lesson-content, wave-05-visualization-ai-runtime |
| 7 | `lib/teacherReviewLessonPptx.ts` | 246 | A13 | package-owner | 13 | wave-01-governance-release-hygiene, wave-03-shell-dashboard-roadmap, wave-04-practice-lesson-content, wave-05-visualization-ai-runtime |
| 8 | `data/questions.ts` | 182 | A04 | package-owner | 2 | wave-02-shared-contracts, wave-04-practice-lesson-content |
| 9 | `components/visualizations/VisualizationLabPage.tsx` | 174 | A06 | cross-owner-blocker | 11 | wave-01-governance-release-hygiene, wave-02-shared-contracts, wave-03-shell-dashboard-roadmap, wave-04-practice-lesson-content, wave-05-visualization-ai-runtime |
| 10 | `components/games/MathVirusBlasterGame.tsx` | 104 | A20 | cross-owner-blocker | 8 | wave-01-governance-release-hygiene, wave-02-shared-contracts, wave-03-shell-dashboard-roadmap, wave-04-practice-lesson-content, wave-05-visualization-ai-runtime |
| 11 | `data/topics.ts` | 98 | A03 | package-owner | 2 | wave-02-shared-contracts, wave-03-shell-dashboard-roadmap |
| 12 | `components/teacher/TeacherResourceAssessmentViews.tsx` | 96 | A13 | package-owner | 1 | wave-05-visualization-ai-runtime |

## 1. `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx`

- Total type-check errors: 2688
- Primary owner: A06 (A06 visualization lead)
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-visualization-closure`
- Impacted package rows: 13
- Impacted waves: wave-02-shared-contracts, wave-03-shell-dashboard-roadmap, wave-04-practice-lesson-content, wave-05-visualization-ai-runtime
- Next action: A06 should inspect `components/visualizations/three/scenes/TemplatePrimitiveScene.tsx` in /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-visualization-closure, fix only its assigned owner scope, then rerun the impacted package checks for 13 package row(s) before A25 refreshes the aggregate gates.
- Owner routes: A06 (2688)

## 2. `components/teacher/TeacherPrepViews.tsx`

- Total type-check errors: 468
- Primary owner: A13 (A13 teacher console lead)
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure`
- Impacted package rows: 13
- Impacted waves: wave-01-governance-release-hygiene, wave-03-shell-dashboard-roadmap, wave-04-practice-lesson-content, wave-05-visualization-ai-runtime
- Next action: A13 should inspect `components/teacher/TeacherPrepViews.tsx` in /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure, fix only its assigned owner scope, then rerun the impacted package checks for 13 package row(s) before A25 refreshes the aggregate gates.
- Owner routes: A13 (468)

## 3. `components/teacher/TeacherOperationsView.tsx`

- Total type-check errors: 416
- Primary owner: A13 (A13 teacher console lead)
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure`
- Impacted package rows: 13
- Impacted waves: wave-01-governance-release-hygiene, wave-03-shell-dashboard-roadmap, wave-04-practice-lesson-content, wave-05-visualization-ai-runtime
- Next action: A13 should inspect `components/teacher/TeacherOperationsView.tsx` in /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure, fix only its assigned owner scope, then rerun the impacted package checks for 13 package row(s) before A25 refreshes the aggregate gates.
- Owner routes: A13 (416)

## 4. `lib/teacherReviewLesson.ts`

- Total type-check errors: 390
- Primary owner: A13 (A13 teacher console lead)
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure`
- Impacted package rows: 13
- Impacted waves: wave-01-governance-release-hygiene, wave-03-shell-dashboard-roadmap, wave-04-practice-lesson-content, wave-05-visualization-ai-runtime
- Next action: A13 should inspect `lib/teacherReviewLesson.ts` in /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure, fix only its assigned owner scope, then rerun the impacted package checks for 13 package row(s) before A25 refreshes the aggregate gates.
- Owner routes: A13 (390)

## 5. `components/teacher/TeacherReviewLessonView.tsx`

- Total type-check errors: 325
- Primary owner: A13 (A13 teacher console lead)
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure`
- Impacted package rows: 13
- Impacted waves: wave-01-governance-release-hygiene, wave-03-shell-dashboard-roadmap, wave-04-practice-lesson-content, wave-05-visualization-ai-runtime
- Next action: A13 should inspect `components/teacher/TeacherReviewLessonView.tsx` in /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure, fix only its assigned owner scope, then rerun the impacted package checks for 13 package row(s) before A25 refreshes the aggregate gates.
- Owner routes: A13 (325)

## 6. `components/visualizations/three/ThreeDGraphCanvas.tsx`

- Total type-check errors: 272
- Primary owner: A06 (A06 visualization lead)
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-visualization-closure`
- Impacted package rows: 13
- Impacted waves: wave-02-shared-contracts, wave-03-shell-dashboard-roadmap, wave-04-practice-lesson-content, wave-05-visualization-ai-runtime
- Next action: A06 should inspect `components/visualizations/three/ThreeDGraphCanvas.tsx` in /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-visualization-closure, fix only its assigned owner scope, then rerun the impacted package checks for 13 package row(s) before A25 refreshes the aggregate gates.
- Owner routes: A06 (272)

## 7. `lib/teacherReviewLessonPptx.ts`

- Total type-check errors: 246
- Primary owner: A13 (A13 teacher console lead)
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure`
- Impacted package rows: 13
- Impacted waves: wave-01-governance-release-hygiene, wave-03-shell-dashboard-roadmap, wave-04-practice-lesson-content, wave-05-visualization-ai-runtime
- Next action: A13 should inspect `lib/teacherReviewLessonPptx.ts` in /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure, fix only its assigned owner scope, then rerun the impacted package checks for 13 package row(s) before A25 refreshes the aggregate gates.
- Owner routes: A13 (246)

## 8. `data/questions.ts`

- Total type-check errors: 182
- Primary owner: A04 (A04 practice lead)
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A04-practice-closure`
- Impacted package rows: 2
- Impacted waves: wave-02-shared-contracts, wave-04-practice-lesson-content
- Next action: A04 should inspect `data/questions.ts` in /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A04-practice-closure, fix only its assigned owner scope, then rerun the impacted package checks for 2 package row(s) before A25 refreshes the aggregate gates.
- Owner routes: A04 (182), A18 (182)

## 9. `components/visualizations/VisualizationLabPage.tsx`

- Total type-check errors: 174
- Primary owner: A06 (A06 visualization lead)
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-visualization-closure`
- Impacted package rows: 11
- Impacted waves: wave-01-governance-release-hygiene, wave-02-shared-contracts, wave-03-shell-dashboard-roadmap, wave-04-practice-lesson-content, wave-05-visualization-ai-runtime
- Next action: A06 should inspect `components/visualizations/VisualizationLabPage.tsx` in /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-visualization-closure, fix only its assigned owner scope, then rerun the impacted package checks for 11 package row(s) before A25 refreshes the aggregate gates.
- Owner routes: A06 (174)

## 10. `components/games/MathVirusBlasterGame.tsx`

- Total type-check errors: 104
- Primary owner: A20 (A20 game design and game-based learning lead)
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A17-A20-game-motivation-closure`
- Impacted package rows: 8
- Impacted waves: wave-01-governance-release-hygiene, wave-02-shared-contracts, wave-03-shell-dashboard-roadmap, wave-04-practice-lesson-content, wave-05-visualization-ai-runtime
- Next action: A20 should inspect `components/games/MathVirusBlasterGame.tsx` in /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A17-A20-game-motivation-closure, fix only its assigned owner scope, then rerun the impacted package checks for 8 package row(s) before A25 refreshes the aggregate gates.
- Owner routes: A20 (104)

## 11. `data/topics.ts`

- Total type-check errors: 98
- Primary owner: A03 (A03 curriculum roadmap lead)
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A03-roadmap-closure`
- Impacted package rows: 2
- Impacted waves: wave-02-shared-contracts, wave-03-shell-dashboard-roadmap
- Next action: A03 should inspect `data/topics.ts` in /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A03-roadmap-closure, fix only its assigned owner scope, then rerun the impacted package checks for 2 package row(s) before A25 refreshes the aggregate gates.
- Owner routes: A03 (98), A18 (98)

## 12. `components/teacher/TeacherResourceAssessmentViews.tsx`

- Total type-check errors: 96
- Primary owner: A13 (A13 teacher console lead)
- Recommended worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure`
- Impacted package rows: 1
- Impacted waves: wave-05-visualization-ai-runtime
- Next action: A13 should inspect `components/teacher/TeacherResourceAssessmentViews.tsx` in /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure, fix only its assigned owner scope, then rerun the impacted package checks for 1 package row(s) before A25 refreshes the aggregate gates.
- Owner routes: A13 (96)

