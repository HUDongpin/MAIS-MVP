# S11 E2E: California Lesson, Practice, Checklist, And Teacher Guide

- Date: 2026-06-07 Asia/Hong_Kong
- Session: S11 regression/release quality gate artifact, prepared in the owner-requested cross-session release closure pass
- Spec: `tests/e2e/california-student-assignment-flow.spec.ts`

## Decision

`PASS_FOR_TARGETED_LOCAL_CALIFORNIA_BETA_E2E`

The focused local E2E now covers the missing California lesson/practice/checklist/teacher-guide lane in addition to the prior teacher assignment and adaptive practice flow.

## E2E Coverage Added

- Student login as `Student Shirleen` with `US_CA_MATH` / S3 profile.
- `/api/lessons/us-ca-math-s3-chapter-01` returns California lesson blocks:
  - concept
  - worked-example
  - checklist
  - practice
  - extension/mistake repair
  - teacher-guide
- Checklist block has trilingual items and is rendered on the student lesson route.
- Student can check a lesson checklist item.
- Lesson practice is visible and scoped to `US_CA_MATH` questions.
- Teacher-guide block is hidden from the student route.
- Teacher login as `Teacher Scott` can view the same California lesson route and sees the teacher-guide section with `California Math Practice Beta` release-boundary copy.
- Existing assignment/practice E2E still passes:
  - teacher creates a California class and practice assignment
  - student sees California dashboard/adaptive/practice surfaces
  - adaptive API returns `US_CA_MATH`
  - practice round completes
  - student submits work
  - teacher grades it

## Checks Run

- `PLAYWRIGHT_PORT=3993 PLAYWRIGHT_RUN_ID=s11-ca-final-3993 npx playwright test tests/e2e/california-student-assignment-flow.spec.ts --project=desktop-chrome --reporter=line --retries=0`: passed, 2/2 in 2.0m.
- Earlier failed Playwright run on port 3992 identified a brittle heading assertion; product rendering was already correct. The test now asserts the visible lesson title text rather than requiring it to be a heading.
- `npm run type-check`: passed after the local test type was widened for trilingual copy assertions.

## Not Covered

- Full Playwright suite was not run in this closure pass.
- Production E2E was not run because production storage/API health remains a separate S12/S19/S22 blocker in the existing 2026-06-07 reports.
- Mobile California lesson route was not rerun in this focused pass; prior S18 middle-school route mobile checks are separate.
