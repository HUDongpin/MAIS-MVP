# S11 Practice Arena Mobile Fix Execution

- Date: 2026-06-04
- Session: S11 with owner-approved cross-domain hotfix support for Practice mobile release blockers
- Scope: restore local type/build baseline enough to rerun Practice mobile regression; fix Practice Arena visible empty/error states

## Result

Status: Completed.

The original Practice Arena mobile P0 from the earlier audit is no longer reproduced in the targeted regression suite. The full mobile `practice-pager` Playwright suite now passes under a production build/start flow.

## Fixes Applied

1. Practice question catalog API failure is now visible.
   - Added `questionCatalogError` state in `app/practice/page.tsx`.
   - `/api/questions` catalog fetch now checks `response.ok`.
   - If the catalog fails and no adaptive/free-selection surface can render, the page shows a `role="alert"` message instead of leaving only hero/footer content.

2. Free-selection filters no longer hide available questions when fewer than 5 match.
   - `app/practice/page.tsx` now renders the `QuestionPager` whenever filtered free-selection results have at least 1 question.
   - The existing warning remains for fewer than 5 questions because game unlock still requires a complete 5-question same-topic round.
   - Verified S1 `Challenge` + `short-answer` now shows `Question 1 of 1` instead of an empty main area.

3. Type baseline blocker fixed in S11 test code.
   - `tests/e2e/teacher-console-stress.spec.ts` now allows `readJsonNoSecrets` to accept both Playwright `APIResponse` and browser `Response`.
   - Root cause: `page.waitForResponse()` returns browser `Response`, not `APIResponse`.

4. Production build blocker fixed in teacher review lesson export route.
   - `app/api/teacher/review-lessons/[reviewLessonId]/export/route.ts` now rejects unsupported export formats with HTTP 400 before calling the exporter.
   - Removed the unreachable `unsupported` branch that Next build flagged because the exporter currently accepts only `"json" | "markdown" | "pptx"`.

## Checks

- Passed: `npm run type-check`
- Passed: dev probe on `/practice`, S1 `Challenge` + `short-answer` renders `Question 1 of 1`.
- Passed: `PLAYWRIGHT_PORT=3024 node node_modules/@playwright/test/cli.js test tests/e2e/practice-pager.spec.ts --project=mobile-chrome --grep "free-selection mode|fill-in questions support handwriting"`: 2/2.
- Passed: `PLAYWRIGHT_PORT=3025 node node_modules/@playwright/test/cli.js test tests/e2e/practice-pager.spec.ts --project=mobile-chrome --grep "handwriting conversion reviews|handwriting conversion handles|short-answer handwriting|lesson fill-in|circles lesson|lesson multiple-choice"`: 6/6.
- Passed: `PLAYWRIGHT_PORT=3026 node node_modules/@playwright/test/cli.js test tests/e2e/practice-pager.spec.ts --project=mobile-chrome`: 10/10.

## Notes

- Port `3020` was occupied, so reruns used isolated ports.
- `npx playwright` was unavailable late in the run because the local bin symlink was missing; the equivalent local CLI path `node node_modules/@playwright/test/cli.js` was used successfully.
- The worktree remains heavily dirty with many unrelated owner/session changes. No unrelated changes were reverted.
- No git staging, commit, branch, push, or destructive operation was performed.
