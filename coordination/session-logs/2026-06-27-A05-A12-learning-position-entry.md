# 2026-06-27 A05/A12 Learning Position Entry

- Agent IDs: A05 lesson lead, with A12 backend/storage boundary.
- Objective: make the student lesson table of contents open at the student's actual current unit/lesson progress instead of falling back to Unit 1.
- Assumption: "current progress" means the most recent unfinished lesson if one exists; otherwise the next lesson after the furthest completed unit; otherwise the first available lesson.
- Planned files: `components/lesson/StudentLessonEntryPage.tsx`, `app/student/lessons/route.ts`, `lib/server/userStore/studentActivityPersistence.ts`, `lib/server/userStore.ts`, focused tests in `lib/server/userStoreStudentActivityPersistence.test.ts` and `components/lesson/lessonAccessPolicy.test.ts`.
- Scope guard: no question/content edits, no dashboard visual rewrites, no Git staging/branch/commit.
- Verification target: unit tests prove a student with Unit 5 in-progress lands on Unit 5, and a student who completed Units 1-4 lands on Unit 5.

## Handoff

- Changed: lesson entry now uses the authenticated `getLessonEntryTarget` path from both `StudentLessonEntryPage` and `/student/lessons` route.
- Changed: `studentActivityPersistence` now selects current lesson entry by active progress first, then next after furthest completed lesson, then first available lesson.
- Changed: Postgres fast lesson-entry target now receives `userId` and reads `lesson_progress` instead of always selecting the first lesson by `sort_order`.
- Tests: `npx tsx --test lib/server/userStoreStudentActivityPersistence.test.ts components/lesson/lessonAccessPolicy.test.ts` passed, 55/55.
- Type evidence: targeted TypeScript compiler API check passed for the changed lesson-entry/test files.
- Known unrelated blocker: `npm run type-check` and `npx tsc -p tsconfig.next.json --noEmit --incremental false` are blocked by existing generated `tmp/` and `var/folders/.../next-dist/types/validator.ts` references to missing `app/student/lessons/page.js`.
