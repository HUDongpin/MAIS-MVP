# S11 Teacher Console Overnight Button/Flow Audit

Date: 2026-06-17  
Owner: S11 QA and release quality lead  
Consumed owners: S13 teacher console UI, S12 teacher API contracts, S22 harness/release reliability

## Executive finding

S11 found one confirmed teacher-console functional break:

- **P1 / S13 UI defect: Assessment builder cannot publish from the natural "3. Custom" step after adding a manual question.**
  - Repro: log in as `HK Teacher Chan`, open `/teacher/assessments/new`, set class/title on `1. Setup`, go to `3. Custom`, add manual question, click `Publish assessment`.
  - Observed: POST `/api/teacher/assessments` returns `400 {"error":"Invalid assessment payload."}` and the UI shows `Could not create this assessment yet.`
  - Expected: assessment is created and routes to `/teacher/assessments/assessment-*`.
  - Evidence artifact: `.tmp/e2e-run-s11-teacher-assessment-publish-20260617011924/test-results/teacher-current-ui-probe-t-4af59-publishes-a-manual-question-desktop-chrome/`
  - Likely cause: `components/teacher/TeacherResourceAssessmentViews.tsx` builds the request from `new FormData(event.currentTarget)` at lines 736-757, but setup inputs `name="type"` and `name="title"` are only mounted while `activeStep === 0` at lines 797-825. When publishing from `3. Custom`, those fields are unmounted, so S12 validation correctly rejects missing `title`/`type` at `app/api/teacher/assessments/route.ts` lines 46-52.

## Fix update

S13 has fixed the confirmed assessment-builder defect in `components/teacher/TeacherResourceAssessmentViews.tsx` by storing setup fields in React state and submitting those persisted values from any step. S12 API validation was not changed.

S11 reran current teacher UI coverage after the fix:

- `npx playwright test tests/e2e/teacher-current-ui-probe.spec.ts --project=desktop-chrome --reporter=list`
- Result: 4 passed in 1.8m.
- The passing coverage includes the original failure path: `/teacher/assessments/new` -> `3. Custom` -> add manual question -> `Publish assessment`.

Remaining release caveat:

- `npm run type-check` still exits 2 because the current dirty tree includes pre-existing `MAIS-MVP-california-practice-beta-clean/` schema/type drift. No visible error from the touched root teacher UI file or S11 probe appeared in the final type-check output.

## Confirmed working current UI paths

- Assignment dispatch and score save work on the current UI:
  - `Create assignment` to `/teacher/assignments/assignment-*`
  - submission score edit through `/api/teacher/submissions/*/reviews`
  - Evidence: `PLAYWRIGHT_RUN_ID=s11-teacher-current-ui-split-20260617011749`, test `current assignment dispatch and score save work`, passed.
- Reports and inbox reply work:
  - `/teacher/reports` `Save report`
  - `/teacher/communications/inbox` `Draft reply` and `Send reply`
  - Evidence: `PLAYWRIGHT_RUN_ID=s11-teacher-current-ui-split-20260617011749`, test `current report save and inbox reply actions work`, passed.
- Lesson-kit classroom launch works:
  - `/teacher/lesson-kits/new` create
  - detail `Save`, `Approve review`, `Publish and start class`
  - `Presenter screen` and `Mobile controller` links
  - Evidence: `PLAYWRIGHT_RUN_ID=s11-teacher-lesson-kit-current-dev3130-pass-20260617021400`, passed.
- Teacher/parent P1 regressions work:
  - Ended live-classroom join codes are hidden from students but teacher preview still works.
  - Teacher/parent timestamp hydration had no page errors across UTC server and Hong Kong browser.
  - Evidence: `PLAYWRIGHT_RUN_ID=s11-teacher-parent-p1-20260617013600`, 2 passed.
- Teacher operations suite works:
  - WeCom notice, roster CSV import, Nova Tutor governance read-only/admin restore paths.
  - Evidence: `PLAYWRIGHT_RUN_ID=s11-teacher-operations-202606170128...`, 4 passed.

## Stale tests / inconclusive findings

- Existing `teacher-console-button-matrix.spec.ts` has several stale expectations:
  - Global class focus now preserves `/teacher/dashboard?classId=...`, not `/teacher?classId=...`.
  - Inbox route is now `/teacher/communications/inbox`, not `/teacher/inbox`.
  - Student detail route is now class-scoped (`/teacher/classes/{classId}/students/{studentId}`).
  - Assignment detail now renders submission cards/articles, not table rows.
  - Assessment builder now uses a stepper (`1. Setup`, `2. Select`, `3. Custom`, `4. Preview`), not the old `Question bank` button-only shape.
- `teacher-prep-toolchain.spec.ts` expected lesson-kit AI generation without `DEEPSEEK_API_KEY` to return 503, but current behavior returned 200. Route to S13/S07/S19/S22 for product decision: either deterministic fallback is intended and S11 should update the test, or provider config should gate generation again.
- `teacher-student-cross-role.spec.ts` did not reach teacher features. It timed out in student registration because the helper expected an HK-style `S3` grade while the registration flow was on California `G10`.
- `teacher-review-lesson.spec.ts` did not reach review-lesson UI. Setup API returned 409 when adding a newly registered student to a newly created class; likely curriculum/duplicate setup mismatch, not a confirmed teacher button defect.
- `teacher-console-api-stress.spec.ts` stalled and was interrupted after several minutes. Treat as S22/S11 harness follow-up, not product evidence.

## Recommended fix routing

- S13 completed the assessment-builder fix by persisting setup state outside mounted DOM fields. The submit payload now uses React state for `title`, `type`, schedule, attempts, randomization, and grade weight rather than `FormData` from currently visible step content.
- S12 API validation is behaving correctly for the confirmed assessment failure; no S12 behavior change is recommended unless S13 wants a more specific error message for missing setup fields.
- S11 should retain `tests/e2e/teacher-current-ui-probe.spec.ts` as current UI regression coverage for assignment, assessment, report/inbox, and lesson-kit paths.

## Commands run

- `npx playwright test tests/e2e/teacher-console-button-matrix.spec.ts --project=desktop-chrome --reporter=list`
- `npx playwright test tests/e2e/teacher-current-ui-probe.spec.ts --project=desktop-chrome --reporter=list`
- `npx playwright test tests/e2e/teacher-current-ui-probe.spec.ts --project=desktop-chrome --grep "current assessment builder publishes" --reporter=list`
- `npx playwright test tests/e2e/teacher-operations.spec.ts --project=desktop-chrome --reporter=list`
- `npx playwright test tests/e2e/teacher-prep-toolchain.spec.ts --project=desktop-chrome --reporter=list`
- `npx playwright test tests/e2e/teacher-review-lesson.spec.ts --project=desktop-chrome --reporter=list`
- `npx playwright test tests/e2e/teacher-student-cross-role.spec.ts --project=desktop-chrome --reporter=list`
- `npx playwright test tests/e2e/teacher-parent-p1-regressions.spec.ts --project=desktop-chrome --reporter=list`
- `npx playwright test tests/e2e/teacher-console-stress.spec.ts --project=desktop-chrome --reporter=list`
- Focused lesson-kit current UI reruns against short-lived S11 dev server on port 3130; server was stopped after the pass.
