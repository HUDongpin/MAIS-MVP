# Mainland HJB High School Lesson-only Controlled Release Smoke

- Date: 2026-05-24
- Session ID: S11
- Workstream: QA and release quality
- Result: Pass for lesson-only controlled release

## Scope

Validate that `MAINLAND_HJB` high-school Lesson Page can be used by temporary HJB student and teacher QA accounts while V4 generated questions remain gated.

This smoke does not import or publish `mainland-hjb-high-generated-bank-v4*`, does not add HJB V4 questions to `data/questions.ts`, and keeps Lesson Page practice empty by using explicit empty HJB lesson `practiceQuestionIds`.

## Automated Smoke

- Spec: `tests/e2e/mainland-hjb-lesson-only.spec.ts`
- Command: `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3020 npx playwright test tests/e2e/mainland-hjb-lesson-only.spec.ts --project=desktop-chrome`
- App mode: production build plus `next start` on `127.0.0.1:3020`
- Result: Passed, 1/1

## Assertions Covered

- Temporary HJB S4 student registers through `/api/auth/register` with `curriculumProfile.publisher = MAINLAND_HJB`.
- Student `/api/lesson-entry?grade=S4` returns a real HJB lesson slug.
- `/api/lessons/{slug}` stays scoped to `publisher = MAINLAND_HJB`.
- HJB Lesson Page renders real title, core concept, worked example, and checklist content.
- HJB lesson API returns `practiceQuestions.length === 0`.
- Student page shows the no-practice empty state and does not render the teacher-guide section.
- Temporary HJB teacher is created by test-only SQLite role mutation while preserving the HJB profile.
- HJB teacher can open the same lesson and sees the teacher-guide section.
- `/api/questions?grade=S4&publisher=MAINLAND_HJB` exposes no V4 candidate IDs and no V4 candidate prompt labels.

## Checks

- `node coordination/content-qa/mainland-hjb-high-lessons-v1/validate-lessons.mjs` - Passed, validated 21 HJB high-school lessons.
- `npm run type-check` - Passed.
- `npm run test:mvp` - Passed, 24/24.
- `npm run build` - Passed, 86 app routes.
- Focused Playwright smoke - Passed, 1/1.

## Caveats

- The default Playwright `webServer` path timed out once at 240 seconds before tests ran. The smoke was completed against a manually started production `next start` server with `PLAYWRIGHT_SKIP_WEBSERVER=1`.
- Next dev showed local generated-cache instability around `.next/routes-manifest.json`; final evidence uses production build/start, not dev mode.
- HJB V4/remediated questions remain candidate-only pending S18 manual re-review and separate S04/S08 integration approval.
