# Homepage Functional QA Result

- Date: 2026-05-24
- Session ID: S11
- Scope: `/` homepage plus global layout controls rendered on the homepage.
- Test file: `tests/e2e/home-functional.spec.ts`

## Result Summary

| Area | Result | Notes |
| --- | --- | --- |
| Guest homepage render | Passed | Main heading, navbar, footer, AI Tutor button, and no page errors verified. |
| Hero CTA links | Passed | `Start Learning` routes to `/login`; both visualization CTAs route to `/visualization-lab`. |
| Homepage stat cards | Passed | Grades, visualization labs, practice questions, and curriculum cards route to expected pages. |
| Grade selector | Passed | Primary/Secondary expand/collapse, P2 guest selection, localStorage persistence, and reload persistence verified. |
| Desktop navigation | Passed | Lesson, Adaptive Learning, Visualization Lab, Practice Arena, Log In, logo home route, and active state verified. |
| Language and theme controls | Passed | English, Traditional Chinese, Simplified Chinese, `html.lang`, theme class, and localStorage persistence verified. |
| Mobile menu | Passed | 390x844 viewport menu open/close, route click, close-after-route, and homepage overflow guard verified. |
| AI Tutor shell | Passed | Floating button opens the panel and close button hides it; no tutor prompt was submitted. |
| Footer links | Passed | Email mailto and external personal website link attributes verified. |
| Student logged-in homepage | Passed | Student account link routes to dashboard, grade buttons are locked, and back-to-top returns to page top. |

## Checks Run

- Passed: `npm run type-check`
- Initial Playwright run: partially executed, then failed because the student scroll assertion used a viewport that did not scroll far enough; fixed in the spec.
- Second direct Playwright run: blocked before tests by `Timed out waiting 240000ms from config.webServer`.
- Passed: `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3020 npx playwright test tests/e2e/home-functional.spec.ts --project=desktop-chrome --project=mobile-chrome`
  - Result: `8 passed`, `2 skipped`
  - Skips were intentional: desktop-only nav test skipped on mobile, mobile-only menu test skipped on desktop.

## Risks And Follow-Up

- The default Playwright webServer path timed out once during production build/startup. The same spec passed against `npm run dev` on port 3020, matching the QA plan's local dev-server route.
- No homepage functional defects were found in the automated coverage added here.
