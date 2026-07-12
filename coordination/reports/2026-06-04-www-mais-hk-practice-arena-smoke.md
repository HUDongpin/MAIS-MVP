# www.mais.hk Practice Arena Smoke Report

- Date: 2026-06-04
- Session: S11 QA and release quality
- Target: `https://www.mais.hk/practice`
- Scope: Live production Practice Arena smoke test for guest and authenticated student flows. No feature code was edited.

## Executive Summary

Practice Arena is running on production for the tested desktop flow.

Confirmed working:

- `/practice` returns HTTP 200 from Vercel.
- Guest users can load the Practice Arena shell, choose a grade, see a 5-question practice round, select options, and see that checking answers requires login.
- Authenticated student `HK Student Peter` can load the adaptive practice mission, receive a 5-question S3 Polynomials round, enter a short-answer response, submit it, and receive a successful `/api/attempts` result.
- Key production APIs returned 200 after login: `/api/me`, `/api/questions?grade=S3`, `/api/adaptive-learning/next?grade=S3`, `/api/attempts`, `/api/mistakes`, and `/api/learning-events`.
- No browser `pageerror` events were captured during the successful submit run.

No P0/P1 Practice Arena blocker was found in this smoke test.

## Coverage Performed

1. Opened guest `https://www.mais.hk/practice`.
2. Waited for client hydration and verified the filter controls rendered.
3. Selected `Primary 1` as guest and verified 5 question cards rendered.
4. Selected a guest answer and verified answer checking remains disabled with `Log in to check answers`.
5. Logged in with the public demo student account.
6. Re-opened `/practice` and verified adaptive mission content plus 5 S3 question cards rendered.
7. Filled the visible short-answer field for `Simplify 2x^2 + 5x^2` with `7x^2`.
8. Clicked `Check Answer`.
9. Verified `/api/attempts` returned HTTP 200 with `correct: true`, and the UI advanced to the next question.

## Evidence

- Browser artifacts: `output/playwright/2026-06-04-www-mais-practice/`
- Summary JSON: `output/playwright/2026-06-04-www-mais-practice/result.json`
- Submit JSON: `output/playwright/2026-06-04-www-mais-practice/submit-result.json`
- Key screenshots:
  - `01-guest-practice-all.png`
  - `02-guest-practice-p1.png`
  - `04-auth-practice-after-login.png`
  - `06-auth-answer-ready.png`
  - `07-auth-answer-feedback.png`

## Notes

- Guest default `All` filter state rendered filters but no question cards. Selecting a specific grade immediately rendered questions. This appears to be current product behavior rather than an outage, but it may be worth adding helper copy if users are expected to start from `All`.
- Anonymous `/api/me` returned 401 before login; this is expected.
- Several `net::ERR_ABORTED` entries were observed for Next.js prefetch/navigation requests. They did not block the visible practice flow or API submit path.

## Checks Not Run

- Not run: full cross-browser/mobile regression matrix.
- Not run: all grades/topics/question types.
- Not run: full 5-question round completion and game unlock flow.

## Recommendation

Treat production Practice Arena as smoke-cleared for the tested core flow. For release signoff, add a broader S11/S04 matrix covering multiple grades, fill-in, multiple-choice, short-answer, graph questions, mobile viewport, full round summary, Mistake Book persistence, and game unlock handoff.
