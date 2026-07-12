# S11 Visualization Lab Stress Test Report

- Date: 2026-06-01
- Session ID: S11
- Scope tested: Current `visualizationLabCatalog` source of truth
- Catalog count found: 389 labs
- Note: The owner request referred to 100 labs, but the current code catalog contains 389. The public page still contains a stale "All 100 interactive modules" copy line while the live metrics show 389.

## Result Summary

| Viewport | Catalog labs | Rendered lab cards | Passed health checks | Failed health checks | Page errors | Console errors | Request failures |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Desktop Chrome | 389 | 389 | 389 | 0 | 0 | 0 | 0 |
| Mobile Chrome | 389 | 389 | 389 | 0 | 0 | 0 | 0 |

## Stress Actions Covered

| Viewport | Range controls exercised | Model buttons clicked | Visualization surfaces verified | Visual marks verified |
| --- | ---: | ---: | ---: | ---: |
| Desktop Chrome | 770 | 1,485 | 389 | 4,046 |
| Mobile Chrome | 770 | 1,485 | 389 | 4,046 |

## What Was Checked

- Opened `/visualization-lab` in a real browser.
- Expanded the full lab catalog.
- Verified the page rendered exactly 389 `lab-example-*` cards.
- For every lab card, waited for a `[data-viz-surface]` to appear.
- Checked every lab for missing surfaces, undersized surfaces, missing `[data-viz-mark]`, and rendered `NaN` / `Infinity`.
- Drove all range controls through min, midpoint, max, min, max.
- Triggered non-save model buttons such as mode/reset controls.
- Ran a pointer drag probe against the first visualization surface per lab.
- Captured page errors, browser console errors, and same-origin request failures.

## Commands Run

- `npm run type-check`
  - Result: final run passed. An earlier preflight failed while other worktree changes were still in flight at `components/lesson/LessonView.tsx:1558`, but the current authoritative run is green.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3041 VISUALIZATION_STRESS_REPORT_PATH=/tmp/mais-viz-stress/output/visualization-lab-stress-mobile-rerun.json npx playwright test tests/e2e/visualization-lab-stress.spec.ts --project=mobile-chrome --reporter=list`
  - Result: passed, 389/389 labs.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3041 VISUALIZATION_STRESS_REPORT_PATH=/tmp/mais-viz-stress/output/visualization-lab-stress-desktop-rerun.json npx playwright test tests/e2e/visualization-lab-stress.spec.ts --project=desktop-chrome --reporter=list`
  - Result: passed, 389/389 labs.

## Environment Notes

- The shared project workspace had concurrent `next build` / `next dev` processes writing `.next`, which caused transient 500s such as missing `app-build-manifest.json` and `routes-manifest.json`.
- To avoid false negatives and avoid interfering with other sessions, S11 ran the final browser stress tests from a temporary isolated source snapshot at `/tmp/mais-viz-stress` with its own `.next` output.
- The temporary snapshot used the current source files and symlinked the existing `node_modules`; Next was started without Turbopack because Turbopack rejects `node_modules` symlinks that point outside the project root.

## Risks And Follow-Up

- Production build-backed Playwright health was not rerun in the shared worktree because concurrent local Next/Playwright jobs were modifying `.next`; final browser evidence came from an isolated `/tmp/mais-viz-stress` snapshot to avoid false negatives.
- Existing visualization selector tests were updated to recognize the current "Explore my curriculum" / Chinese equivalent labels.
- Product copy still says "All 100 interactive modules" although the current catalog and visible metrics show 389 labs. Route to S01/S10 for copy/product metric cleanup.
