# S11 Regression: California Middle School Textbook Layout

- Date: 2026-06-04
- Session: S11
- Route: `/lesson/california-middle-school-textbook/review`
- Local server: `http://127.0.0.1:3025`

## Decision

`PASS_FOR_REVIEW_ROUTE`

Desktop and mobile checks passed for the review route. This does not approve a final California textbook/lesson launch because S18 still has a content-alignment blocker.

## Checks Run

- `npm run type-check` - passed.
- Desktop screenshot:
  - `npx playwright screenshot --viewport-size=1440,1200 http://127.0.0.1:3025/lesson/california-middle-school-textbook/review output/playwright/ca-textbook-desktop.png`
  - Result: passed.
- Mobile screenshot:
  - `npx playwright screenshot --device="Pixel 5" http://127.0.0.1:3025/lesson/california-middle-school-textbook/review output/playwright/ca-textbook-mobile.png`
  - Result: passed.
- Desktop/mobile DOM and layout probe:
  - 15 chapter cards found.
  - 3 grade book sections found.
  - 30 California content images found.
  - 0 unloaded California images after scrolling through all chapters.
  - 0 horizontal overflow on desktop and mobile.
  - 15 content-alignment hold notices found.

## Visual Notes

- Desktop: header, grade navigation, first chapter concept image, and exact-layer image render cleanly.
- Mobile Pixel 5: layout stacks without horizontal overflow; grade navigation wraps; page remains readable.
- Floating AI Tutor and mobile browser overlay can cover small areas near the bottom of the viewport, but they did not create page overflow or block the main route check.

## Remaining Risk

- No production lesson-route E2E was added. This route is a scoped review page under `app/lesson/`.
- Final student lesson integration would need a new targeted S11 spec after S18 approves app-ready lesson content.
