# 2026-06-30 A02/A04 Student Jon Performance

## Agent IDs

- A02 dashboard/personalized learning lead
- A04 Practice Arena lead, read-only comparison
- A08 shared provider state, read-only comparison
- A12 backend/API platform, read-only timing evidence
- A22 production reliability, production timing evidence

## Objective

Analyze the reported 40+ second Student Jon load on personalized learning, compare with Practice Arena and Student Peter behavior, then implement the narrowest code change that reduces personalized-learning startup contention.

## Evidence

- Local direct target-page checks did not reproduce a 40+ second wait after warm-up: Student Jon `/personalized-learning` and `/practice` completed around 1 second with API calls under about 200 ms.
- Production `https://www.mais.hk/personalized-learning` for Student Jon reproduced the user-visible shape: the page waited about 45 seconds before a route outcome was visible.
- The production trace showed a large parallel API burst for `/api/dashboard`, `/api/assignments`, `/api/adaptive-learning/next`, `/api/progress`, `/api/lesson-entry`, and `/api/analytics/summary`.
- `LearningAnalyticsReport` was mounted inside a collapsed details panel and polled `/api/analytics/summary` every 5 seconds while the primary personalized route was still waiting.
- Practice Arena was inspected for the same account and did not show the same local direct target-page slowness in this run.

## Change

- `components/dashboard/AdaptiveLearningContent.tsx` now treats the dashboard request as the primary personalized-learning fetch.
- Assignment and adaptive-decision requests wait until the primary dashboard request has settled.
- Learning analytics and progress archive panels mount only after the route has opened, using the same delayed-secondary-panel pattern already present on the student dashboard.
- `components/providers/AppProviders.tsx` skips automatic global mistake-record and lesson-entry warmups on `/personalized-learning`, `/practice`, and `/student/assignments`; explicit user/page actions still fetch these resources when needed.
- Added `components/dashboard/adaptiveLearningContentPerformanceBoundary.test.ts` to prevent eager secondary fetches from returning.
- Added `components/providers/appProvidersStudentWarmupPerformanceBoundary.test.ts` to prevent shared provider warmups from returning to the first-paint path.

## Checks

- Passed: `npx tsx --test components/dashboard/adaptiveLearningContentPerformanceBoundary.test.ts components/providers/appProvidersStudentWarmupPerformanceBoundary.test.ts app/dashboard/dashboardPagePerformanceBoundary.test.ts`.
- Passed local warmed browser smoke after the final provider change: Student Jon `/personalized-learning` route ready around 1.8 seconds, `/api/dashboard` completed before assignments/adaptive started, analytics/progress started after the delayed secondary gate, and no automatic `/api/mistakes` or `/api/lesson-entry` warmups appeared in the first-paint trace.
- Passed local browser comparison: Student Jon `/practice` and Student Peter `/practice` both became visible around 0.1 seconds in the final direct-login target-route smoke.
- Checked: `npm run type-check -- --pretty false` remains red from unrelated dirty-tree failures in Manim owner-evidence typing and generated `tmp/`/`var/` Next validator artifacts referencing `app/student/lessons/page.js`.

## Risks

- If production `/api/dashboard` itself keeps returning after tens of seconds, this frontend fix reduces API contention and removes repeated analytics polling, but A12/A22 still need backend/storage timing evidence for the primary dashboard route.
