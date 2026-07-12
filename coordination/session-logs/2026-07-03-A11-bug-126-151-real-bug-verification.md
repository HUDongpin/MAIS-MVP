# 2026-07-03 A11 Bug 126-151 Real Bug Verification

Agent IDs: A11 QA and release quality lead, with A25 dirty-tree baseline, A22 local harness constraints, and owner routing to A02/A03/A04/A05/A06/A07/A09/A12/A13/A15/A19/A20 where relevant.

Objective: Check every bug in `/Users/dongpinhu/Downloads/20260702_Deliverable Bug and QA Report.docx` and verify whether Bugs 126-151 are real.

Scope:
- Verification first, then scoped fix pass for the seven bugs confirmed real.
- Use current dirty root as inventory evidence, not as clean release source.
- Feature-code fixes limited to the seven confirmed-real bugs after the fix goal was set.
- No staging, commit, branch, merge, rebase, push, reset, or revert.
- No secret values recorded.

Work performed:
- Extracted DOCX content and identified 26 bug cards: Bugs 126-151.
- Ran A25 dirty-tree baseline using `release:dirty-map`.
- Started an A22-scoped local dev server on port 3147 for browser/API probes.
- Verified student dashboard, personalized learning, practice/adventure, teacher console, roadmap, lesson, audio, and visualization claims.
- Stopped the A11 dev server after ENOSPC and removed only A11-owned temporary `.tmp/a11-bug-126-151-next` and `.tmp/a11-bug-126-151-db.sqlite` artifacts.
- Wrote report `coordination/reports/2026-07-03-A11-bug-126-151-real-bug-verification.md`.

Final classification:
- Real: Bugs 127, 138, 139, 140, 142, 143, 145.
- Partial/follow-up: Bugs 130, 141.
- Not reproduced: Bugs 126, 128, 129, 131, 132, 133, 134, 135, 136, 137, 144, 146, 147, 148, 149, 150, 151.

Checks:
- A25 dirty map completed and wrote latest release-intake artifacts.
- Browser/API probes completed for all non-visualization route groups.
- Direct and hydrated UI class creation checks showed backend and hydrated UI pass.
- Visualization source diagnostics passed 43/43.
- Reported-bug source regressions passed 17/17.

Known limitation:
- Fresh browser geometry checks for Bugs 146-151 could not complete after A22 local Next compilation hit `ENOSPC`. Source/regression evidence was used instead.

Follow-up fix pass:
- A13: fixed Bugs 138-140 by preserving the assignment queue filter in the no-class teacher fast path.
- A20: fixed Bug 127 by carrying completed round questions from Practice Arena into Adventure Island and avoiding `locked` on renderer startup failure.
- A07/A05: fixed Bug 142 by adding a bounded speech fallback for slow dynamic lesson audio.
- A05/A09: fixed Bug 143 by capitalizing simple English multiple-choice option labels while preserving math strings.
- A05: fixed Bug 145 by routing upper-primary grouped multiplication worked examples to a concrete counting/group model.

Fix checks:
- `npx tsx --test app/teacher/teacherNavigationPerformanceBoundary.test.ts app/practice/practiceArenaPageRegressions.test.ts components/gamification/adventureIslandGamePersistence.test.ts components/practice/practiceOptionDisplayText.test.ts components/lesson/workedExampleIllustrationMetadata.test.ts components/lesson/lessonAudioFallback.test.ts` passed 24/24.
- `npm run type-check` failed in pre-existing A06 visualization/manim review-package tests, with no printed errors in the files touched by this A11/A13/A20/A07/A05/A09 fix pass.
