# 2026-06-28 A04/A20/A11 Adventure Island Summary CTA

- Agent IDs: A04 Practice Arena primary, A20 Adventure Island route target, A11 regression coverage.
- Objective: Fix the 100% personalized Practice Arena completion CTA so "Start Adventure Island" opens the Adventure Island game route.
- Scope touched: `app/practice/page.tsx`, `tests/e2e/adventure-island.spec.ts`, this session log.
- Root cause: the summary CTA used client-side App Router navigation from the already-loaded Practice Arena page. In the observed failure, the RSC request started but the browser remained on `/practice` long enough that the user-facing route did not change.
- Fix: changed the Practice Arena game-entry CTAs to native anchors pointing at `studentPracticeGameHrefs`, so the browser starts the document navigation to `/student/practice/games/adventure-island` immediately.
- Regression: added `starts from the personalized 100% summary Adventure Island CTA`, which registers a Grade 1 `US_CA_MATH` student, answers the personalized set 5/5 correctly, clicks the completion-dialog Adventure Island CTA, and asserts the Adventure Island welcome stage loads unlocked.
- Passing check: `npx playwright test tests/e2e/adventure-island.spec.ts --project=desktop-chrome --reporter=list -g "starts from the personalized 100% summary Adventure Island CTA"` completed with 1 passed after generated-artifact cleanup restored disk space.
- Passing check: `npm run type-check` completed with exit 0.
- Passing check: `git diff --check -- app/practice/page.tsx tests/e2e/adventure-island.spec.ts coordination/session-logs/2026-06-28-A04-A20-adventure-island-summary-cta.md` produced no output.
- Environment note: initial fresh Playwright rerun failed while the filesystem had about 292 MB free and Playwright emitted `ENOSPC`; ran `node scripts/cleanup-generated-artifacts.mjs --dry-run`, then `node scripts/cleanup-generated-artifacts.mjs --apply`, reclaiming generated `.tmp`/`.next` artifacts and restoring about 52 GB free.
- Blocked/unrelated smoke: the existing Fishing Game free-selection smoke did not reach the unlock CTA because the helper could not enter free-selection mode in the current harness/data state.
- Dirty-tree note: the repository root is already very dirty. This slice intentionally leaves unrelated dirty files untouched.
