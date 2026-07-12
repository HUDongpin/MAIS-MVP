# A25 Wave 01 Governance Readiness

Generated: 2026-07-08T14:13:17.484Z

Dirty map signature: `4892e406613fc3846378621b84ba0f486bb8ebf371c35837eae544472596f318`

Expanded dirty entries: 6130

Worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance`

Branch: `codex/A25-dirty-closure-governance`

This is readiness evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, worktree removal, or any other physical cleanup.

## Result

- Commit ready: no
- Blocking reasons: 1 package-only dirty entries need owner-approved package resync authorization; npm run type-check failed
- Status entries: 1012
- Covered by A25/A10/A22 pathspec union: 1011
- Uncovered entries: 1
- Package-only resync rows waiting for owner authorization: 1
- True root/pathspec uncovered rows: 0
- Type-check errors: 404

## Checks

| Check | Result | Status | Command |
| --- | --- | ---: | --- |
| highAudit | pass | 0 | `npm audit --audit-level=high` |
| releaseHelperTests | pass | 0 | `/usr/local/bin/node --test scripts/cleanup-generated-artifacts.test.mjs scripts/deploy-vercel-preview.test.mjs scripts/deploy-vercel-production.test.mjs scripts/release-build-gate.test.mjs scripts/release-env-guard.test.mjs` |
| typeCheck | fail | 2 | `npm run type-check -- --pretty false` |

## Uncovered Entries

| Status | Path |
| --- | --- |
| `M` | `tsconfig.json` |

## Package Resync Recommendations

These recommendations are non-executable. They do not authorize cleanup; they identify exact stale package-worktree entries that need owner approval before any restore, clean, discard, or recopy action.

| Path | Package-only | Action kind | Command hint |
| --- | --- | --- | --- |
| `tsconfig.json` | yes | owner-approved-package-restore | `git restore --source=HEAD -- tsconfig.json` |

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
