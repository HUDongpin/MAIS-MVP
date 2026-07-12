# S11/S22 California Math Practice Beta E2E Check

- Date: 2026-06-04
- Sessions: S11 regression testing, with S22 Playwright/build isolation support
- Approved public stage name: `California Math Practice Beta`
- Approved short description: `California Math Practice Beta: standards-aligned practice and diagnostic experience, with lesson content layer in progress.`
- Release-boundary source: `coordination/reports/2026-06-04-california-math-practice-beta-boundary.md`
- Production code edits: none

## Scope

This check verifies the authenticated desktop flow for California student workspace, Dashboard, Adaptive Learning, Practice, and Teacher assignment behavior.

The check does not certify a California lesson, course, or full curriculum state. The lesson content layer remains a separate readiness gate.

## Files Changed

- `tests/e2e/california-student-assignment-flow.spec.ts`
- `coordination/session-logs/2026-06-04-S11.md`
- `coordination/session-logs/2026-06-04-S22.md`
- `coordination/reports/2026-06-04-S11-S22-california-e2e-check.md`

## Covered Flow

- Teacher Scott logs in, creates an S3 California class, adds Student Shirleen, creates a non-LLM practice assignment, and verifies the assignment detail.
- Student Shirleen logs in with `US_CA_MATH` / S3 context and sees California course context, Teacher-assigned work, and the new assignment on Dashboard.
- `/api/adaptive-learning/next?grade=S3` returns a `US_CA_MATH` topic and `US_CA_MATH` questions.
- Adaptive Learning shows the California knowledge galaxy and the teacher-assigned work.
- Practice Arena shows the California adaptive practice mission, accepts an answer, returns `/api/attempts` feedback, opens the diagnostic summary, shows review focus, correct-answer feedback, personalized next path, and Mistake Book navigation.
- Student submits the assignment.
- Teacher Scott reviews the submission, records score `92`, adds feedback, and sees the submission become graded.
- The spec checks captured page errors at the end.

## Practice Beta Readiness

- Dashboard/student workspace: passed for the covered authenticated desktop S3 California flow.
- Adaptive: passed for covered S3 `US_CA_MATH` API and page behavior.
- Practice: passed for covered answer submission, feedback, diagnostic summary, and Mistake Book link behavior.
- Teacher assignment: passed for create, assign, submit, review, score, and feedback loop.
- Grade/topic filters: partially covered through S3 California adaptive route and Practice California mission display; broader grade/topic filter matrix was not run.
- Mobile/browser behavior: not run in this task. The new spec currently runs once on `desktop-chrome`.
- Public copy guardrails: this report uses the approved `California Math Practice Beta` wording; an app-wide copy scan was not run in this task.

Verdict for covered flow: pass. No P0/P1 product blocker was found in the authenticated desktop flow above.

Verdict for full Practice Beta release signoff: not complete until the remaining S11 matrix covers mobile/browser behavior, broader grade/topic filters, progress/mistake behavior beyond this diagnostic summary, and public copy guardrails.

## Lesson Layer Readiness

Lesson Layer readiness is not complete. It remains blocked until there is:

- Standards-to-topic/skill mapping.
- One lesson page/module per included skill.
- Bilingual concept explanation.
- Worked examples.
- Scaffolded practice.
- Mistake remediation.
- Progress/coverage tracking.
- S18 curriculum QA signoff.

Owners for this future gate:

- S05 for lesson page/module implementation.
- S18 for curriculum QA signoff.
- S21 for candidate lesson/content package.
- S11 for release-readiness regression coverage after implementation.
- S04 for practice handoff behavior if lesson-to-practice integration changes.
- S12/S15 for API/adaptive semantics if shared route or recommendation behavior changes.

## Findings

- P0: none found in the covered flow.
- P1: none found in the covered flow.
- S22 watch item: Playwright/Next runs still emit repeated `NO_COLOR` / `FORCE_COLOR` warnings and Next `runtime` export recognition warnings on several teacher API route families. These did not block this run, but remain release-engineering noise for S22 to track.
- S11 test-harness note: the learner start setup gate can appear over student Practice pages. The final E2E closes it with Escape, matching the component's supported close behavior, before proceeding with Practice assertions.

## Checks Run

- `npm run type-check`: passed.
- `PLAYWRIGHT_PORT=3988 PLAYWRIGHT_RUN_ID=s11-s22-ca-e2e-3988 npx playwright test tests/e2e/california-student-assignment-flow.spec.ts --project=desktop-chrome --reporter=line --retries=0`: passed, 1 test passed in 1.7m.

## Checks Not Run

- Full Playwright suite: not run; this was a targeted S11/S22 California E2E check.
- `mobile-chrome` project for this spec: not run; the spec is intentionally guarded to run once on desktop.
- Broader grade/topic filter sweep: not run.
- App-wide public-copy guardrail scan: not run.
- Lesson Layer route/content regression: not run because Lesson Layer readiness is outside the current Practice Beta scope and remains incomplete.

## Earlier Run Notes

Earlier isolated runs on ports `3981` through `3987` failed while refining stale or unstable test assertions:

- Teacher submission status copy used `Not started` rather than `not-started`.
- UI login selected S4 for Student Shirleen, so the test now logs in via API with S3 `US_CA_MATH` context.
- Dashboard had more than one `California Curriculum` match, so the assertion now scopes to the first visible match.
- Practice answer feedback moves into the adaptive summary after a one-question adaptive round, so the test now verifies `/api/attempts` plus summary diagnostics.
- The learner start setup gate can intercept clicks; the test closes it with Escape before Practice interaction.

These were classified as test-harness/assertion refinements, not final P0/P1 product blockers.

## Handoff

The covered desktop California Math Practice Beta E2E is passing. S11 should add the remaining release matrix items before a full Practice Beta signoff: mobile/browser coverage, broader grade/topic filters, progress/mistake persistence beyond the summary link, and public copy guardrails.
