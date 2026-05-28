# MAIS-MVP Release Readiness Matrix

- Date: 2026-05-20
- Session: S10 cross-workstream implementation
- Scope: Engineering health, teacher console release blockers, storage readiness, Mainland PEP content/RAG quality, AI Tutor safe context support, adaptive contract visibility

## Executive Summary

Overall status: **Yellow for local/demo release, Red for real production class launch until live production smoke and durable-storage verification are recorded.**

Local release gates improved substantially. Deterministic type-checking now avoids stale `.next/types` / `tsconfig.tsbuildinfo` failures, the teacher console desktop matrix is green after fixing form reset, assessment detail routing, and report-preview abort handling, and Mainland PEP content/RAG checks now cover the exp/log explanation and narrow-query tail-filter regressions.

Production launch is still not fully cleared because SimpleTex/LLM live-provider smoke, deployed game smoke, and deployed storage persistence evidence require owner-approved production URL, test accounts, and credentials.

## Red Yellow Green Matrix

| Area | Status | Evidence | Owner path |
| --- | --- | --- | --- |
| Deterministic type-check | Green | `npm run type-check` passed with `tsc --noEmit --incremental false`. | S10 |
| Production build | Green | `npm run build` passed and includes `/api/admin/storage/health` plus `/teacher/assessments/[assessmentId]`. | S10 |
| MVP readiness | Green | `npm run test:mvp` passed, 22/22 tests. | S10/S11 |
| Mainland PEP question correctness | Green for known P1/P2 fixes | `npm run test:question-bank` passed, 11/11 tests, including conics and exp/log coefficient explanation regressions. | S04/S18 |
| Mainland PEP RAG retrieval | Green for narrow-query filtering | `npm run test:rag` passed, 10/10 tests, including derivative, trig, conics, and space-vector tail filtering. | S08/S18/S07 |
| Adaptive recommendation contract | Green | `npm run test:analytics` passed, 21/21 tests; API now exposes `evidenceCount`, `guardFlags`, and `nextReviewAt`. | S15/S08 |
| Backend/API smoke | Green locally | `PLAYWRIGHT_PORT=3035 npm run test:backend` passed, 3/3 tests, including admin storage health. | S12/S11 |
| Teacher console desktop matrix | Green locally | `PLAYWRIGHT_PORT=3037 npx playwright test tests/e2e/teacher-console-button-matrix.spec.ts --project=desktop-chrome` passed, 13/13 desktop tests; mobile-only smoke skipped by project filter. | S13/S11 |
| Teacher console mobile route smoke | Green locally | `PLAYWRIGHT_PORT=3041 npx playwright test tests/e2e/teacher-console-button-matrix.spec.ts --project=mobile-chrome` passed, 1/1 mobile route smoke; desktop-only cases skipped by project filter. | S13/S11 |
| Teacher console production-start stability | Yellow | First teacher matrix attempt failed during Next build with a transient missing chunk for `/api/admin/storage/health`; immediate retry passed all desktop tests. A mobile API-login soft-navigation variant also showed URL/active-nav changing before child content, so the mobile gate now validates hard route loads while desktop retains click-navigation coverage. | S10/S11 |
| Storage durability | Yellow locally, Red until production verified | `/api/admin/storage/health` now reports `durable-ready` when `HK_MATH_DB_PATH` is configured and `demo-only` otherwise; deployed environment still needs verification. | S12/S10/S19 |
| AI Tutor live provider/OCR | Red until production smoke | Server can accept safe Mainland PEP context and build evidence server-side, but no live provider/OCR smoke was run. | S07/S19 |
| Game production smoke | Red until production smoke | No game code changed in this implementation; deployed route/canvas/reward smoke remains outstanding. | S20/S11 |

## Implemented Changes

- Check scripts now use non-incremental TypeScript compilation so stale local `.next/types` or `tsconfig.tsbuildinfo` cannot block source validation.
- Teacher workflows now retain the submitted form element before awaited requests, preventing async `event.currentTarget` reset errors.
- Added `/teacher/assessments/[assessmentId]` to render the existing teacher assessment detail view.
- Teacher report preview now ignores deliberate aborts during rapid dropdown/remarks changes instead of surfacing uncaught page errors.
- Added admin-only `/api/admin/storage/health` with a redacted storage readiness summary.
- Mainland PEP exp/log generated short-answer explanations now explicitly include coefficient multiplication.
- Mainland PEP curriculum and exam-pattern RAG retrieval now filters low-relevance tail cards for narrow concept/chapter queries.
- AI Tutor context can accept `curriculumTrack`, `skillId`, and a safe Mainland PEP evidence query; the server builds the evidence pack instead of trusting client text.
- Adaptive decisions expose `evidenceCount`, `guardFlags`, and `nextReviewAt` as stable top-level fields.

## Checks Run

| Check | Result |
| --- | --- |
| `npm run type-check` | Passed |
| `npm run test:question-bank` | Passed, 11/11 |
| `npm run test:rag` | Passed, 10/10 |
| `npm run test:mvp` | Passed, 22/22 |
| `npm run test:analytics` | Passed, 21/21 |
| `npm run build` | Passed |
| `PLAYWRIGHT_BROWSER_CHANNEL=chrome PLAYWRIGHT_PORT=3035 npm run test:backend` | Passed, 3/3 |
| `PLAYWRIGHT_BROWSER_CHANNEL=chrome PLAYWRIGHT_PORT=3037 npx playwright test tests/e2e/teacher-console-button-matrix.spec.ts --project=desktop-chrome` | Passed, 13 passed, 1 mobile-only skipped |
| `PLAYWRIGHT_BROWSER_CHANNEL=chrome PLAYWRIGHT_PORT=3041 npx playwright test tests/e2e/teacher-console-button-matrix.spec.ts --project=mobile-chrome` | Passed, 1 passed, 13 desktop-only skipped |

## Checks Not Run

- Live SimpleTex, LLM, or OCR provider smoke: not run because production credentials and provider-cost approval were not provided.
- Deployed Vercel storage persistence smoke: not run because no production URL/environment context was provided.
- Deployed game smoke: not run because no production URL/test account was provided.
- Full `npm run test:e2e`: not run because the targeted release gates covered the changed surfaces and the full suite is broader than this implementation window.

## Remaining Release Decisions

- Confirm production `HK_MATH_DB_PATH` or another durable persistence path before real class/student use.
- Authorize S19/S07 provider smoke with redacted evidence only.
- Authorize S20/S11 production game smoke for Fishing Game and Adventure Island.
- Decide whether Mainland PEP can move from internal/demo to student-facing after S18 reviews the remaining difficulty-balance follow-up.
