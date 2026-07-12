# A18/A03/A04/A05/A12/A22 Session Log - California Grade-Aware Audit

Date: 2026-06-27

## Agent IDs

- A18 Curriculum QA lead: California grade-aware content and curriculum-position checks.
- A03 Curriculum roadmap lead: grade-label and K-12 taxonomy semantics.
- A04 Practice lead: practice/onboarding grade presentation.
- A05 Lesson lead: lesson-entry availability and California lesson content fit.
- A12 Backend/API platform lead: fast-login and seeded lesson record behavior.
- A22 Production reliability lead: review-only high-school route posture and regression evidence.

## Objective

Repair the current California Math Curriculum setup and presentation issues that violated grade-aware principles: U.S. labels should not expose Hong Kong P/S aliases, candidate-only lessons should not appear live, approved K-5 beta lessons should stay reachable, high-school material should remain review-only with pathway metadata, and K-B.1 should test comparison/cardinality instead of joining addition.

## Write Scope Used

- California label and selector surfaces in login/register, dashboard, practice, grade selector, and visualization lab components.
- California lesson gating in `data/lessons.ts`, `data/usCaliforniaLessons.ts`, `components/lesson/lessonEntryTarget.ts`, and `lib/server/userStore.ts`.
- Internal California fast-login helper and focused tests.
- California high-school preview/review routes and high-school chapter metadata.
- California middle-school replacement page copy.
- California K-G5 lesson package mirrors and generator repair for K-B.1.
- Focused regression tests for California grade-aware behavior and lesson content fit.

## Changes

- Changed California curriculum labels to use English U.S. grade names/abbreviations such as Kindergarten, G1, and Grade 12 instead of Primary/Secondary labels.
- Updated practice, onboarding, dashboard, compact grade picker, and visualization lab surfaces to use curriculum-aware labels.
- Kept approved California K-5 textbook and Grade 1 micro-lesson beta seeds live while blocking candidate-only California question-derived lesson seeds from production lesson lookup and seeded lesson records.
- Repointed internal California student fast-login lesson targets through the shared public lesson-entry helper.
- Changed California high-school textbook student/public route behavior to review-only redirects and added chapter-level domain/pathway/prerequisite metadata to the review page.
- Reworded the middle-school replacement page as a domain-overview beta with cluster coverage, not a complete course.
- Repaired K-B.1 worked example and generator logic so it asks which group has more/how many more instead of treating the comparison standard as a joining addition problem.

## Checks Run

- `npx tsx --test lib/californiaGradeAware.test.ts` - pass, 5/5 tests.
- `npx tsx --test lib/server/internalCaliforniaFastLogin.test.ts` - pass, 4/4 tests.
- `npx tsx --test data/usCaliforniaLessons.test.ts` - pass, 11/11 tests.
- `npx tsx --test components/lesson/lessonAccessPolicy.test.ts` - pass, 4/4 tests.
- `npm run type-check` - failed outside this slice on stale generated Next validator/type artifacts under `tmp/` and `var/folders/...` referencing deleted `app/student/lessons/page.js`.

## Known External Red Gates

- Full `npm run type-check` remains red outside this slice on A22-owned stale generated Next validator/type artifacts referencing deleted `app/student/lessons/page.js`.
- Full `lib/mvpReadiness.test.ts` was previously red outside this slice on missing generated illustration assets, one visualization mapping assertion, and one parent console API/hook assertion.

## Git Operations

None staged, committed, branched, pushed, reset, reverted, deleted, or cleaned.
