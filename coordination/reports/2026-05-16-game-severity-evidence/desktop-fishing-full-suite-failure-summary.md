# Desktop Fishing Full-Suite Failure Evidence

- Date: 2026-05-16
- Command: `npx playwright test tests/e2e/quadratic-bonus.spec.ts tests/e2e/fishing-game.spec.ts --project=desktop-chrome`
- Affected test: `tests/e2e/fishing-game.spec.ts` / `Fishing Game renders, catches a fish question, and completion awards coins x3 once`

## Observed Failure

The full desktop combined game suite reproduced the Fishing entry failure twice.

First full run:
- Fishing test failed after clicking `Start Fishing Game`.
- Browser screenshot showed `ERR_CONNECTION_REFUSED`.
- Bonus test also failed in the same run because a challenge answer submission returned `Could not check this answer yet`.

Second full run:
- Bonus test passed.
- Fishing test failed again after clicking `Start Fishing Game`.
- Playwright error context showed:
  - `Application error: a client-side exception has occurred while loading 127.0.0.1`
  - Trace console event: `ChunkLoadError: Loading chunk 4872 failed`
  - Failed chunk URL: `/_next/static/chunks/app/practice/fishing-game/page-*.js`

## Counter-Checks

The same user-facing path passed in a standalone production-style server on port `3044`:
- Free Selection summary showed `Start Fishing Game`.
- Clicking the real link loaded `/practice/fishing-game`.
- The page displayed `Math Fishing Challenge`.
- Evidence: `desktop-fishing-after-start-click.png` and `desktop-fishing-start-click-console.json`.

The targeted desktop Fishing Playwright test also passed afterward:

```text
npx playwright test tests/e2e/fishing-game.spec.ts --project=desktop-chrome -g "Fishing Game renders"
1 passed
```

## Classification

Classified as `S3 Major` for QA/release-gate stability, not as a confirmed product runtime bug.
