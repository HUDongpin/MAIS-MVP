# 2026-06-18 S11 Student E2E Functional Check

- Session: S11 QA and release quality lead.
- Scope: owner-approved student-side E2E functional check from the user perspective.
- Coordination: S19 owns provider/env readiness, S22 owns build/dev-server isolation, S07 owns AI Tutor provider behavior, S15 owns adaptive behavior, S12 owns backend API contracts.
- Product-code scope: no product code, API behavior, env files, Git staging, commits, branches, resets, or reverts were changed by this check.
- Secret hygiene: provider readiness was recorded only as redacted present/missing status. No real credential values were printed or intentionally recorded.

## Preflight

- `git status --short`: 1691 dirty entries before execution; this run did not try to clean, stage, commit, or revert them.
- Disk before execution: about 59GiB free; `.tmp` about 23GiB and `.next` about 4.1GiB.
- Ports 3141, 3142, 3143, and 3144 were free.
- Local provider readiness, redacted: DeepSeek ready = yes; SimpleTex auth mode = `uat`; `.env.local` present. The approved DOCX credential source was not needed because required local variables were already present.

## E2E Results

| Gate | Command summary | Result | Evidence root |
| --- | --- | --- | --- |
| Core student desktop | `PLAYWRIGHT_PORT=3141 PLAYWRIGHT_RUN_ID=s11-student-core-20260618 npx playwright test tests/e2e/app-shell-auth.spec.ts tests/e2e/student-smoke.spec.ts tests/e2e/student-frontend.spec.ts tests/e2e/practice-pager.spec.ts --project=desktop-chrome --reporter=line` | 6 passed, 16 failed in 9.7m | `.tmp/e2e-run-s11-student-core-20260618/test-results/` |
| Mobile student smoke | `PLAYWRIGHT_PORT=3142 PLAYWRIGHT_RUN_ID=s11-student-mobile-20260618 npx playwright test tests/e2e/student-button-dropdown-matrix.spec.ts --project=mobile-chrome --reporter=line` | 1 failed, 8 skipped | `.tmp/e2e-run-s11-student-mobile-20260618/test-results/` |
| Multi-course representative | `PLAYWRIGHT_PORT=3143 PLAYWRIGHT_RUN_ID=s11-student-multicourse-20260618 npx playwright test tests/e2e/california-student-assignment-flow.spec.ts tests/e2e/mainland-pep-primary-lessons.spec.ts tests/e2e/mainland-pep-junior-lessons-smoke.spec.ts tests/e2e/mainland-pep-high-lessons.spec.ts tests/e2e/mainland-pep-roadmaps.spec.ts tests/e2e/mainland-hjb-roadmaps.spec.ts --project=desktop-chrome --reporter=line` | 10 passed, 11 failed in 16.8m | `.tmp/e2e-run-s11-student-multicourse-20260618/test-results/` |
| DeepSeek live text | `AI_TUTOR_LIVE_TEXT_QA=1 AI_TUTOR_LIVE_TEXT_MATRIX_ROUNDS=1 AI_TUTOR_LIVE_TEXT_SOAK_REQUESTS=0 AI_TUTOR_LIVE_TEXT_SERVER_MODE=start PLAYWRIGHT_RUN_ID=s11-live-deepseek-text-20260618 npx playwright test tests/e2e/ai-tutor-live-text.spec.ts --project=desktop-chrome --reporter=line` | 1 failed before provider calls, 3 did not run | `.tmp/e2e-run-s11-live-deepseek-text-20260618/test-results/` and `.tmp/ai-tutor-live-text/runs/2026-06-18T09-10-06-837Z-66596/live-text-summary.json` |
| SimpleTex/live OCR | `HANDWRITING_REPORT_LABEL=s11-student-live-ocr-20260618 PLAYWRIGHT_PORT=3144 PLAYWRIGHT_RUN_ID=s11-student-live-ocr-20260618 npx playwright test tests/e2e/handwriting-board-bug-hunt.spec.ts --project=desktop-chrome --reporter=line` | 1 failed after 15.2m before live OCR provider rows | `.tmp/e2e-run-s11-student-live-ocr-20260618/test-results/` |

## Failure Clusters

- Core registration and login UI drift: tests could not find expected `individual student`, S2/S3/S5 grade radios, and confirm-password selectors collided with password reveal controls. Owner routing: S01/S09/S11 for app shell/register-copy/test selectors.
- Lesson route/title drift: multiple student lesson routes loaded without expected legacy headings such as `Quadratic Functions`, `Algebra Basics`, `Circles`, `Integers`, and `Polynomials`. Owner routing: S05 lesson, S18 content QA, S11 regression maintenance.
- Practice free-selection regression or selector drift: several specs could not reach the `Question type` or `difficulty` combobox after attempted unlock; this blocked Practice workflows and also prevented the live OCR route smoke from reaching provider calls. Owner routing: S04 practice, S15 adaptive unlock semantics, S11 tests.
- Practice math keyboard usability: one keyboard case timed out because a fixed overlay intercepted clicks on math-key buttons. Owner routing: S04 practice UI and S11 regression.
- Personalized Learning/adaptive UI drift: the US adaptive smoke could not find `section[aria-label="Adaptive knowledge galaxy"]`; learning analytics export produced `learning-analytics-S4.xlsx` when the test expected S3. Owner routing: S02 dashboard/adaptive UI, S15 adaptive semantics, S11 expectations.
- Visualization mobile smoke drift: mobile test could not find `Explore all labs`, `Explore my curriculum`, or `Explore other grades` on `/student/tools/visualizations`. Owner routing: S06 visualization and S11 mobile expectations.
- California student surfaces: California lesson seed title was not found, and Student Shirleen dashboard did not expose the expected `Teacher-assigned work` heading. Owner routing: S05 California lesson, S02/S13 assignment dashboard, S11 tests.
- Mainland HJB/PEP roadmaps: HJB Learning Path heading was not found; Mainland PEP roadmap login flows timed out on Simplified Chinese or US Student demo selectors. Owner routing: S03 roadmap, S09 i18n/demo labels, S11 tests.
- Mainland PEP High lesson API and assets: repeated `lesson.topic.publisher` was `undefined` where tests expected `MAINLAND_PEP`; representative high-school lesson images under `mainland-pep-high` were missing from rendered pages. This aligns with current dirty-tree deleted `public/lesson-illustrations/mainland-pep-high/...` assets. Owner routing: S05/S18/S21/S23/S24 and S12 if the API shape is intended to include publisher.
- DeepSeek live provider was not tested: the live text harness failed during `npm run build` because the dirty copied directory `MAIS-MVP-california-practice-beta-clean/` was included and hit an out-of-scope `LLMProviderName` type error. Owner routing: S22/S25 build isolation and dirty-tree intake. This is not a DeepSeek provider failure.
- SimpleTex live provider was not tested: the OCR bug-hunt timed out waiting for the Practice `Question type` combobox before live OCR rows could run. Owner routing: S04/S15/S11 first; S19/S12 provider health remains inconclusive.

## Evidence Hygiene

- Final disk state after all runs: about 27GiB free; `.tmp` about 55GiB and `.next` about 4.1GiB.
- Generated artifacts across these run roots include 111 screenshot/video/trace/error-context files.
- `git diff -- tsconfig.json` was empty after the live DeepSeek harness; no root temp tsconfig file remained.
- A targeted scan over generated markdown/json/error-context text artifacts found no raw credential-value patterns for DeepSeek, SimpleTex, Authorization bearer tokens, API keys, or session tokens. A broad scan over `next-dist` does match source-code templates and bundled data, so `next-dist` artifacts should remain local-only.

## Decision

Student E2E release gate is red. The primary evidence is local student workflow and multi-course functional failure, not production or live-provider failure. Live DeepSeek and SimpleTex health remain inconclusive because both live checks were blocked before provider calls.

Recommended next order:

1. S22/S25 isolate or exclude the dirty copied app directory from live-provider build harnesses.
2. S04/S15/S11 repair or rebaseline Practice unlock/filter expectations because this blocks both core Practice and live OCR evidence.
3. S05/S18/S21/S23/S24 resolve Mainland PEP High API/asset readiness, especially missing high-school lesson illustrations.
4. S01/S09/S11 rebaseline registration, language/demo selectors, and password reveal selector strictness.
5. Rerun the five commands above after the core Practice/register/lesson blockers are addressed.
