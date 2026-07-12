# A25 Wave 01 Governance Readiness

Generated: 2026-07-05T11:12:44.734Z

Dirty map signature: `fc405946dbb9033f749aa5e537f14edc23d82355d6b8e796759a4856fcbefeef`

Expanded dirty entries: 4737

Worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance`

Branch: `codex/A25-dirty-closure-governance`

This is readiness evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, worktree removal, or any other physical cleanup.

## Result

- Commit ready: no
- Blocking reasons: 7 package-only dirty entries need owner-approved package resync authorization; npm audit --audit-level=high failed; release helper tests failed; npm run type-check failed
- Status entries: 1018
- Covered by A25/A10/A22 pathspec union: 1011
- Uncovered entries: 7
- Package-only resync rows waiting for owner authorization: 7
- True root/pathspec uncovered rows: 0
- Type-check errors: 404

## Checks

| Check | Result | Status | Command |
| --- | --- | ---: | --- |
| highAudit | fail | 1 | `npm audit --audit-level=high` |
| releaseHelperTests | fail | 1 | `/usr/local/bin/node --test scripts/cleanup-generated-artifacts.test.mjs scripts/deploy-vercel-preview.test.mjs scripts/deploy-vercel-production.test.mjs scripts/release-build-gate.test.mjs scripts/release-env-guard.test.mjs` |
| typeCheck | fail | 2 | `npm run type-check -- --pretty false` |

## Uncovered Entries

| Status | Path |
| --- | --- |
| `M` | `tsconfig.json` |
| `??` | `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.json` |
| `??` | `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.md` |
| `??` | `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.json` |
| `??` | `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.md` |
| `??` | `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.json` |
| `??` | `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.md` |

## Package Resync Recommendations

These recommendations are non-executable. They do not authorize cleanup; they identify exact stale package-worktree entries that need owner approval before any restore, clean, discard, or recopy action.

| Path | Package-only | Action kind | Command hint |
| --- | --- | --- | --- |
| `tsconfig.json` | yes | owner-approved-package-restore | `git restore --source=HEAD -- tsconfig.json` |
| `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.json` | yes | owner-approved-package-untracked-clean | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.json` |
| `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.md` | yes | owner-approved-package-untracked-clean | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.md` |
| `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.json` | yes | owner-approved-package-untracked-clean | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.json` |
| `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.md` | yes | owner-approved-package-untracked-clean | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.md` |
| `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.json` | yes | owner-approved-package-untracked-clean | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.json` |
| `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.md` | yes | owner-approved-package-untracked-clean | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.md` |

## Type-Check Hotspots

| File | Errors |
| --- | ---: |
| `components/teacher/TeacherPrepViews.tsx` | 36 |
| `components/teacher/TeacherOperationsView.tsx` | 32 |
| `lib/teacherReviewLesson.ts` | 30 |
| `components/teacher/TeacherReviewLessonView.tsx` | 25 |
| `lib/teacherReviewLessonPptx.ts` | 18 |
| `components/visualizations/VisualizationLabPage.tsx` | 16 |
| `components/games/MathVirusBlasterGame.tsx` | 13 |
| `components/games/MightyTankBattleGame.tsx` | 10 |
| `app/api/teacher/review-lessons/[reviewLessonId]/route.ts` | 9 |
| `components/visualizations/three/threeDSceneMath.catalog.test.ts` | 9 |
| `lib/server/teacherReviewLessonLLM.ts` | 9 |
| `lib/teacherAssessmentAnalysis.ts` | 9 |
| `app/api/assignments/[assignmentId]/corrections/route.ts` | 8 |
| `app/api/assignments/[assignmentId]/submissions/route.ts` | 8 |
| `app/api/classroom/live/[sessionId]/work-samples/route.ts` | 8 |
| `app/api/me/learner-profile/route.ts` | 7 |
| `components/lesson/CaliforniaHighSchoolTextbookPage.tsx` | 7 |
| `components/lesson/CaliforniaHighSchoolTextbookStudentPage.tsx` | 7 |
| `app/api/classroom/live/actions/route.ts` | 6 |
| `components/games/MathMatchQuestGame.tsx` | 6 |
