# MAIS-MVP Release Readiness Check

- Date: 2026-05-17
- Session: S05 with release-readiness coordination notes
- Scope: P1 number-bonds MVP blocker, local release gates, SimpleTex/Fishing/storage production-smoke readiness

## Executive Summary

Local release gates are green after fixing the P1 number-bonds lesson completeness gap. The previous `npm run test:mvp` blocker is resolved, production build succeeds, and Fishing Game desktop/mobile local production-style regressions pass.

Production release is not fully cleared yet. Vercel Production smoke checks for SimpleTex APP authentication, Fishing Game live interaction, and storage path/persistence still require production URL, test accounts, and owner/S19-approved credentials. Until those checks are completed, treat Production as blocked for real student/class use and only eligible for local/demo validation.

## Code Change

- Added a bilingual `visualization` block to `p1-counting-number-bonds` in `data/lessons.ts`.
- The block reuses the registered Visualization Lab mapping:
  - `moduleId: "coordinate-plane-demo"`
  - `source: "coordinate-plane"`
  - `topicId: "p1-counting-number-bonds"`
- No public API, storage, SimpleTex provider, reward economy, or route behavior was changed.

## Local Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run test:mvp` | Passed | 22/22 tests passed; previous `p1-counting-number-bonds: missing visualization block` failure is resolved. |
| `npm run type-check` | Passed | `tsc --noEmit` completed successfully. |
| `npm run build` | Passed | Next.js production build completed; `/practice/fishing-game` is generated as a static route. |
| `npx playwright test tests/e2e/fishing-game.spec.ts --project=desktop-chrome` | Passed | 3/3 tests passed, including unlock, locked summary, gameplay, reward, and duplicate guard paths. |
| `npx playwright test tests/e2e/fishing-game.spec.ts --project=mobile-chrome` | Passed | 3/3 tests passed, including mobile game shell assertions and full gameplay/reward path. |

## Production Smoke Status

| Area | Status | Notes | Owner |
| --- | --- | --- | --- |
| SimpleTex Production APP auth | Blocked / not run | Requires Vercel Production URL, student login, and owner/S19-approved `SIMPLETEX_APP_ID`, `SIMPLETEX_APP_SECRET`, `SIMPLETEX_API_URL`. Smoke must prove provider `simpletex`, accepted result, and no browser/log secret exposure. | S19 with S07 |
| Fishing Game Production interaction | Blocked / not run | Local desktop/mobile regression passed. Vercel Production still needs a real browser smoke from Free Selection 80%+ unlock through `/practice/fishing-game`, catch, answer, coin, submission, and reward. Watch for prior `ChunkLoadError` risk. | S20 with S11 |
| Vercel `/tmp` storage drift | Blocked / unresolved | Code still defaults to Vercel writable `/tmp` when `HK_MATH_DB_PATH` is absent. This is acceptable only for demo smoke, not durable student records. Production needs admin/export or equivalent storage-path verification plus a persistent storage decision. | S12 with S10/S19 |

## Release Decision

- Local/demo release readiness: Cleared.
- Vercel Production demo smoke: Not cleared until the three production smoke checks above are run and recorded.
- Real class/student-data release: Blocked until `/tmp` persistence is replaced or explicitly accepted by the owner as a temporary demo-only risk.

## Follow-Up Task Packages

| Session | Task | Acceptance Criteria |
| --- | --- | --- |
| S19/S07 | Run SimpleTex Production APP auth smoke. | Redacted report confirms Production env names are present, OCR response provider is `simpletex`, result is accepted, and no secrets appear client-side or in logs. |
| S20/S11 | Run Vercel Production Fishing Game smoke. | Evidence shows 80%+ unlock, route load without `ChunkLoadError`, canvas/gameplay interaction, coin conversion, completion API success, and duplicate-award guard if practical. |
| S12/S10 | Verify and decide storage persistence. | Report confirms whether Production uses `/tmp` or configured persistent storage; if `/tmp`, create a durable-storage migration/decision before real class launch. |

## Assumptions And Risks

- No production credentials, production URL, or test account details were provided in this session.
- No live SimpleTex call was made, avoiding unapproved billable provider usage.
- No real Vercel environment variables or secret values were read, printed, edited, or recorded.
- The local Fishing Game regression is strong evidence for product behavior, but it does not replace Production smoke on the deployed asset/chunk pipeline.
