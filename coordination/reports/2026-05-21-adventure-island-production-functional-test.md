# Adventure Island Production Functional Test

- Date: 2026-05-21
- Session: S11
- Target: `https://www.mais.hk/practice/adventure-island`
- Scope: Production functional smoke for Adventure Island only
- Smoke account policy: Disposable `smoke-*` P5 student accounts only
- Secret policy: No passwords, cookies, session tokens, full request bodies, or secret environment values recorded

## Executive Summary

Adventure Island is **not green for production functional gameplay** yet.

The deployed route and legacy redirect are healthy, but authenticated desktop smoke failed before the game could be exercised. Two desktop attempts failed at production browser UI login with HTTP 401 after disposable smoke student registration and setup. Per the acceptance criteria, this is classified as a **production auth/storage blocker**, not a confirmed Adventure Island gameplay bug. Mobile was not run because desktop did not pass.

## Results

| Check | Status | Evidence |
| --- | --- | --- |
| Live route | Green | `GET https://www.mais.hk/practice/adventure-island` returned HTTP 200 from Vercel. |
| Legacy route | Green | `GET https://www.mais.hk/practice/super-platformer-like` returned HTTP 308 with `location: /practice/adventure-island`. |
| App chunk | Green | HTML contained `/_next/static/chunks/app/practice/adventure-island/page-5c0b3b048bc5df72.js`. |
| Runtime error copy | Green in route HTML | No `Application error`, `ChunkLoadError`, or `Loading chunk` copy was found in the fetched route HTML. |
| Desktop authenticated smoke | Red before gameplay | Adventure Island production Playwright smoke failed at browser UI login: HTTP 401 after 3 attempts. |
| Desktop focused rerun | Red before gameplay | Focused Adventure-only rerun failed the same way: HTTP 401 after 3 browser UI login attempts. |
| Mobile authenticated smoke | Not run | Skipped because desktop did not pass. |
| Trophy clear / reward / duplicate guard | Not reached | The test could not reach authenticated gameplay, canvas, trophy clear, `35 XP / 35 points`, badge, or duplicate-reward checks. |

## Commands Run

```bash
curl -I -L --max-time 20 https://www.mais.hk/practice/adventure-island
```

Result: HTTP 200.

```bash
curl -I --max-time 20 https://www.mais.hk/practice/super-platformer-like
```

Result: HTTP 308 redirect to `/practice/adventure-island`.

```bash
curl -sS -L --max-time 20 https://www.mais.hk/practice/adventure-island | rg -n "Adventure Island|/_next/static/chunks/app/practice/adventure-island|Application error|ChunkLoadError|Loading chunk"
```

Result: Adventure Island route content and app chunk were present; no matching runtime error copy was found.

```bash
PRODUCTION_GAME_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://www.mais.hk npx playwright test tests/e2e/production-game-smoke.spec.ts --project=desktop-chrome --reporter=list
```

Result: Failed 2/2. The Adventure Island test failed before gameplay at browser UI login with HTTP 401.

```bash
PRODUCTION_GAME_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://www.mais.hk npx playwright test tests/e2e/production-game-smoke.spec.ts --project=desktop-chrome --reporter=list -g "Adventure Island authenticates"
```

Result: Failed 1/1. Focused Adventure-only rerun failed before gameplay at browser UI login with HTTP 401.

## Redacted Diagnostics

- The production smoke created disposable smoke users and submitted setup through the existing smoke harness.
- The Adventure Island test did not reach `/practice/adventure-island` in an authenticated playable state.
- Runtime diagnostics attached by Playwright showed unauthenticated API responses, including `/api/me` HTTP 401.
- A local artifact scan checked generated production smoke failure files for secret-like content. It found only a password field label in `error-context.md`, not a session cookie or password-shaped smoke token.

## Classification

This run matches the plan's auth/storage failure condition:

- Login, `/api/me`, or eligibility instability blocks the test before gameplay.
- Route/API-only success is not enough to call Adventure Island functional.
- S20 should not treat this as a game-loop bug until production auth becomes stable enough to reach gameplay.

## Follow-Up

- S12/S19 should verify Vercel Production storage/session durability, including admin storage health with an approved admin smoke credential.
- After production auth/storage is stable, S11 should rerun the focused desktop Adventure command.
- If desktop passes, S11 should run the same production smoke with `--project=mobile-chrome`.
- If auth is stable but canvas, movement, trophy clear, reward award, badge unlock, or duplicate guard then fails, assign the gameplay evidence to S20.
