# MAIS-MVP Functional Health Check

- Date: 2026-05-22
- Session: S10 with S11-style QA coverage
- Audience: Dr. Peter Hu
- Scope: report-only functional health check; no feature code changes
- Production target: `https://www.mais.hk`
- Secret policy: no passwords, cookies, provider keys, storage URLs, or raw provider payloads recorded

## Executive Summary

Overall status: **Local/demo baseline is Yellow-Green; production class launch remains Red.**

The local source and deterministic content gates are strong: type-check, MVP readiness, analytics/adaptive tests, question-bank tests, RAG tests, production build, practice-bank solvability, teacher desktop workflows, and local desktop/mobile game specs passed. The major release blockers are not TypeScript or static content correctness.

The highest-risk functional issue is still **production auth/storage/session consistency**. A fresh production auth-storage smoke reproduced the blocker: 5/5 disposable registrations returned 200, but browser login/session verification failed. This blocks authenticated production gameplay and any real class/student launch until durable storage and session parity are verified.

AI Tutor live text is also not release-ready. The live status endpoint reports DeepSeek `deepseek-v4-pro`, but the 27-call role/language matrix achieved only **3/27 successful replies**. All calls returned HTTP 200, but 24/27 used fallback modes and median latency was about 12 seconds.

## Red / Yellow / Green Findings

| Severity | Area | Finding | Evidence | Owner path | Recommended fix order |
| --- | --- | --- | --- | --- | ---: |
| P0 Red | Production auth/storage | Disposable production users can register, but browser login and `/api/me` are inconsistent. Fresh run: attempt 1 login 200 but `/api/me` 401; attempts 2-5 login 401 and `/api/me` 401. | `PRODUCTION_AUTH_STORAGE_SMOKE=1 ... production-auth-storage-smoke.spec.ts`; `test-results/production-auth-storage-sm-620f7-ent-for-five-smoke-students-desktop-chrome/error-context.md` | S12/S19 | 1 |
| P1 Red | AI Tutor live | Live DeepSeek status is green, but role/language matrix failed acceptance: 3/27 success, 24 fallback responses, p50 12048 ms, p95 12116 ms. | `.tmp/ai-tutor-live-text/live-text-summary.json`; `tests/e2e/ai-tutor-live-text.spec.ts` | S07/S19, with S12 if route/runtime involved | 2 |
| P1 Red | Parent console | No-child parent link flow reproducibly sticks on `/login` after login attempt, while the page still shows signed-in navbar/state. This blocks child-linking acceptance. | `parent-console.spec.ts -g "no-child parent"` failed twice; `test-results/parent-console-parent-cons-4e101-eated-links-stay-idempotent-desktop-chrome/error-context.md` | S14 with S12 auth/session support | 3 |
| P1/P2 Yellow-Red | Student mistake workflow | Practice shows `Saved to Mistake Book`, but the follow-up Mistake Book page can remain empty/loading and does not show the saved axis-of-symmetry item. | `student-frontend.spec.ts -g "practice filters"` failed on Mistake Book assertion; error context under `test-results/student-frontend-student-f-30b24-d-mistake-book-actions-work-desktop-chrome/` | S04/S08 | 4 |
| P2 Yellow | Dashboard analytics / QA contract | Student dashboard no longer renders `Personalized learning analytics report` or `Export summary`, while tests still require it. Decide whether to restore dashboard analytics or update tests/navigation to the current adaptive/progress surface. | `student-frontend.spec.ts -g "dashboard, progress"` failed; `app/dashboard/page.tsx` does not render `LearningAnalyticsReport` | S02/S11 | 5 |
| P2 Yellow | Lesson all-slug QA gate | `lesson-all.spec.ts` crashes with `TypeError: Invalid URL` while trying to record a non-200 lesson API finding from `about:blank`. This hides the actual lesson slug/API failure. | `test-results/lesson-all-lesson-page-all-5a895-ation-bugs-for-every-lesson-desktop-chrome/error-context.md` | S11/S10, then S05 if real lesson issue is exposed | 6 |
| P2 Yellow | Visualization QA / coverage | Visualization overlap spec timed out waiting for old Chinese button name `使用繁體中文`; current accessible name is `Use Traditional Chinese`. Snapshot also shows `22 roadmap topic needs a visualization label before release.` | `test-results/visualization-overlap-Visu-1d29c--marks-after-slider-changes-desktop-chrome/error-context.md` | S06/S11, coordinate S03 for roadmap labels | 7 |
| P3 Yellow | Teacher mobile QA timeout | Teacher mobile route smoke passed with `--timeout=60000` but fails under default 30s. Product route reachability appears OK; the release gate timeout is too tight. | Default mobile run failed at 30s; rerun with `--timeout=60000` passed in 38.9s | S11/S13 | 8 |
| P3 Yellow | SimpleTex local smoke scheduling | SimpleTex dry-run was ready, but live local smoke aborted because another MAIS-MVP Playwright/Next process began. This is QA scheduling noise, not provider evidence. | `coordination/reports/2026-05-22-simpletex-uat-local-flow-smoke.md` | S10/S19/S11 | 9 |

## Green Evidence

| Area | Result |
| --- | --- |
| TypeScript | `npm run type-check` passed. |
| MVP readiness | `npm run test:mvp` passed, 22/22. |
| Analytics/adaptive | `npm run test:analytics` passed, 21/21. |
| Question bank | `npm run test:question-bank` passed, 19/19. |
| RAG | `npm run test:rag` passed, 27/27. |
| Production build | `npm run build` passed; 86 app routes generated. |
| Backend API local E2E | Backend API integration passed, 3/3. |
| Teacher console desktop | `teacher-console-button-matrix.spec.ts --project=desktop-chrome` passed, 13/13 desktop checks. |
| Teacher console mobile | Mobile smoke passed with a 60s timeout. |
| Practice bank browser solvability | `practice-bank-solvability.spec.ts --project=desktop-chrome` passed, 2/2, including full current item-bank answer audit. |
| Local games desktop | Fishing Game + Adventure Island desktop specs passed, 5/5. |
| Local games mobile | Fishing Game + Adventure Island mobile specs passed, 5/5. |
| Production read-only routes | `/`, `/login`, `/register`, `/practice`, `/practice/fishing-game`, `/practice/adventure-island`, `/visualization-lab` returned route HTML with app chunks and no fatal error copy. |
| AI Tutor status | Production `/api/ai-tutor/status` returned live DeepSeek `deepseek-v4-pro`. |
| Expected unauthenticated responses | Production `/dashboard` redirects to login; `/api/admin/storage/health` and `/api/me` return 401 without credentials; handwriting GET returns 405. |

## Checks Run

| Check | Result |
| --- | --- |
| `npm run type-check` | Passed |
| `npm run test:mvp` | Passed, 22/22 |
| `npm run test:analytics` | Passed, 21/21 |
| `npm run test:question-bank` | Passed, 19/19 |
| `npm run test:rag` | Passed, 27/27 |
| `npm run build` | Passed |
| `PLAYWRIGHT_PORT=3042 npx playwright test backend-api student-frontend parent-console --project=desktop-chrome` | Failed, 8 passed / 3 failed / 1 not run |
| `parent-console.spec.ts -g "no-child parent"` | Failed again |
| `student-frontend.spec.ts -g "dashboard, progress"` | Failed again |
| `student-frontend.spec.ts -g "practice filters"` | Failed again, later in Mistake Book |
| `teacher-console-button-matrix.spec.ts --project=desktop-chrome` | Passed, 13 passed / 1 mobile skipped |
| `teacher-console-button-matrix.spec.ts --project=mobile-chrome` | Failed at 30s timeout |
| `teacher-console-button-matrix.spec.ts --project=mobile-chrome -g "mobile teacher console" --timeout=60000` | Passed |
| `lesson-all.spec.ts --project=desktop-chrome` | Failed due QA harness `Invalid URL` |
| `practice-bank-solvability.spec.ts --project=desktop-chrome` | Passed, 2/2 |
| `visualization-overlap.spec.ts --project=desktop-chrome` | Failed due stale language button selector / timeout |
| `fishing-game.spec.ts adventure-island.spec.ts --project=desktop-chrome` | Passed, 5/5 |
| `fishing-game.spec.ts adventure-island.spec.ts --project=mobile-chrome` | Passed, 5/5 |
| Production read-only route/API smoke | Passed for route availability; admin health blocked by auth as expected |
| `PRODUCTION_AUTH_STORAGE_SMOKE=1 ... production-auth-storage-smoke.spec.ts` | Failed, production auth/storage still red |
| `AI_TUTOR_LIVE_TEXT_QA=1 AI_TUTOR_LIVE_TEXT_SERVER_MODE=start ... ai-tutor-live-text.spec.ts` | Failed matrix; status passed, frontend/soak skipped after matrix failure |
| `npm run smoke:simpletex:local -- --dry-run` | Passed readiness after concurrent process cleared |
| `npm run smoke:simpletex:local` | Blocked by newly detected concurrent local Playwright/Next process |

## Checks Not Run

- Production game write smoke was not run because production auth/storage is red; the plan gates authenticated game smoke behind a green auth/session baseline.
- Production admin storage health/export was not verified because no admin smoke credential was available in this session.
- AI Tutor 90-request soak was not run because the baseline live matrix failed; avoiding extra provider cost is the correct stop condition.
- SimpleTex live local OCR calls were not completed because the smoke runner detected concurrent local Next/Playwright activity and stopped before provider calls.
- Full `npm run test:e2e` was not run; targeted suites produced enough actionable failures and the full suite would repeat several known noisy gates.

## Recommended Next Actions

1. **S12/S19:** make production storage/session durable and verifiable. Confirm `HK_MATH_STORAGE_PROVIDER=postgres`, `POSTGRES_URL`, redeploy, then verify admin `/api/admin/storage/health` reports durable-ready and rerun auth-storage 5/5.
2. **S07/S19:** diagnose why live AI Tutor returns fallback modes for most role/language calls despite HTTP 200. Rerun matrix before frontend smoke or soak.
3. **S14/S12:** fix parent no-child linking login/session redirect behavior, then rerun the parent no-child spec.
4. **S04/S08:** inspect Practice -> Mistake Book persistence/loading after a saved wrong answer, especially the API response and client loading state.
5. **S02/S11:** decide whether analytics export belongs on `/dashboard` or only `/adaptive-learning`/progress surfaces; align product and tests.
6. **S11/S10:** repair `lesson-all.spec.ts` failure-reporting so it exposes the actual lesson API slug/problem.
7. **S06/S11/S03:** update visualization overlap selectors to current accessible names and resolve the visible roadmap visualization-label coverage warning.
8. **S11/S13:** raise teacher mobile smoke timeout or optimize route readiness waits.
9. **S10/S19:** rerun SimpleTex live local smoke in a quiet window; keep the current blocked report as QA-infra evidence only.

