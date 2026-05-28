# MAIS-MVP Production Smoke Report

- Date: 2026-05-21
- Session: S10 coordination, with S19/S11/S12/S07/S20 smoke responsibilities covered in one owner-approved run
- Target: Vercel Production, `https://www.mais.hk`
- Smoke account policy: dedicated `smoke-*` student accounts only
- Secret policy: no keys, passwords, full cookies, provider payloads, or full storage snapshots recorded

## Executive Summary

Production smoke remains **red for real class/student launch** after the post-deploy rerun.

Green evidence was recorded for dedicated smoke-account registration, learning writes, relogin persistence, AI Tutor live DeepSeek response, game reward APIs, duplicate reward guards, legacy game redirect, and deployed game route/chunk availability. However, current release gates remain blocked:

- **Storage durability is unverified/red for release** because S11 did not have a production admin smoke credential to confirm `/api/admin/storage/health` reports Postgres durable-ready after deployment.
- **Authenticated desktop game smoke is red** because `/login` route/API behavior remains unstable after dedicated smoke account creation; Fishing and Adventure failed before gameplay evidence.
- **SimpleTex OCR is red** because a direct Production-env SimpleTex APP-auth smoke returned HTTP `401` with `req_unauthorized`.

## Results Matrix

The matrix below includes the original smoke evidence plus the post-deploy game rerun. The `Post-Deploy Rerun` section is the authoritative current status for storage/game release gating.

| Area | Status | Evidence |
| --- | --- | --- |
| Production URL | Green | `https://www.mais.hk` returned HTTP 200 from Vercel. |
| Production env preflight | Original SQLite storage red; Postgres unverified after deploy | Original preflight found `AUTH_SESSION_SECRET`, `SIMPLETEX_*`, `LLM_*`, and `HK_MATH_ENABLE_DEMO_USER` present while `HK_MATH_DB_PATH` was absent. Post-deploy Postgres env could not be verified without admin storage health. |
| Storage health/export | Blocked/unverified after deploy | Anonymous `/api/admin/storage/health` returned 401; smoke student health/export returned 403 as expected; no production admin smoke credential was available. Postgres durable-ready health remains unverified. |
| Dedicated smoke accounts | Green | S3 and P5 `smoke-*` student accounts registered successfully; user IDs were present. |
| Learning persistence | Green for current production runtime | S3 lesson completion returned 200; S3 and P5 each recorded 5/5 correct attempts; S3 relogin returned 200 with the same user id and dashboard returned 200. |
| AI Tutor live | Green | `/api/ai-tutor/status` returned `configured: true`, `mode: live`, provider `deepseek`, model `deepseek-v4-pro`; one safe prompt returned HTTP 200 with a non-empty reply and no fallback/error copy. |
| SimpleTex OCR | Red | Temporary Production env pull was used only for a direct provider smoke and deleted afterward; SimpleTex returned HTTP 401, `req_unauthorized`; Lesson/Practice OCR matrix was skipped per plan. |
| Fishing Game API | Green | Completion returned 201 `awarded`, reward `6 XP / 6 points`; duplicate returned 409 `duplicate`, reward `0 / 0`. |
| Adventure Island API | Green | Eligibility returned ready with 5 attempts and 5 correct; completion returned 201 `awarded`, reward `35 XP / 35 points`; duplicate returned 409 `duplicate`, reward `0 / 0`. |
| Game routes/assets | Green for route/chunk availability | `/practice/fishing-game` and `/practice/adventure-island` HTML included their app chunks; headless Chrome desktop/mobile screenshots were captured. |
| Authenticated browser gameplay | Red/Blocked | S11 added and executed a dedicated production smoke spec after repairing local Playwright dependencies. Initial desktop smoke failed before gameplay; the post-deploy rerun also failed before gameplay, with Fishing UI login returning 401 and Adventure browser-context `/api/me` returning 401 after a smoke-user dashboard state. This is classified as production auth/storage/API readiness blocking gameplay evidence, not as proof of missing route chunks. |

## Redacted Evidence

Production smoke suffix: `mpetmjhr-8jqrwn`

API smoke highlights:

| Check | Result |
| --- | --- |
| S3 registration | HTTP 200 |
| P5 registration | HTTP 200 |
| S3 lesson progress | HTTP 200, `quadratic-functions`, `completed` |
| S3 attempts | 5 total, 5 correct |
| P5 attempts | 5 total, 5 correct |
| S3 relogin | HTTP 200, same user id |
| S3 dashboard after relogin | HTTP 200 |
| AI Tutor status | HTTP 200, live DeepSeek |
| AI Tutor prompt | HTTP 200, non-empty non-fallback reply |
| Fishing completion | HTTP 201, awarded |
| Fishing duplicate | HTTP 409, duplicate |
| Adventure eligibility | HTTP 200, ready |
| Adventure completion | HTTP 201, awarded |
| Adventure duplicate | HTTP 409, duplicate |
| Legacy game redirect | HTTP 308 to `/practice/adventure-island` |

Screenshots captured:

- `coordination/reports/2026-05-21-production-smoke-evidence/production-fishing-game-headless.png`
- `coordination/reports/2026-05-21-production-smoke-evidence/production-adventure-island-headless.png`
- `coordination/reports/2026-05-21-production-smoke-evidence/production-fishing-game-mobile-headless.png`
- `coordination/reports/2026-05-21-production-smoke-evidence/production-adventure-island-mobile-headless.png`

HTML route checks:

| Route | HTML bytes | App chunk found |
| --- | ---: | --- |
| `/practice/fishing-game` | 31,152 | Yes |
| `/practice/adventure-island` | 29,585 | Yes |

Authenticated game smoke harness:

| Check | Result |
| --- | --- |
| Local Playwright dependency repair | Completed; missing `playwright-core` WebKit file was restored by reinstalling the generated Playwright dependency directories. |
| `node -e "require('@playwright/test'); console.log('ok')"` | Passed after repair, `ok` returned in ~0.6s. |
| `npx playwright --version` | Passed, `Version 1.59.1`. |
| `npm run type-check` | Passed after adding `tests/e2e/production-game-smoke.spec.ts`. |
| Desktop production command | Ran: `PRODUCTION_GAME_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://www.mais.hk npx playwright test tests/e2e/production-game-smoke.spec.ts --project=desktop-chrome`. |
| Fishing authenticated desktop | Failed before gameplay evidence: UI login eventually succeeded, route loaded, but `fishing-game-stage` remained `data-phase="loading"` and did not reach `welcome`/canvas-ready within 20s. |
| Adventure Island authenticated desktop | Failed before gameplay evidence: authenticated API/eligibility was unstable after UI login; observed HTTP 401 `Not authenticated` and earlier `need-attempts`/zero-attempt eligibility despite seeded attempts. |
| Mobile production command | Not run because desktop authenticated smoke did not pass. |

## Implementation Update: Auth/Storage Smoke Fix

S12/S11/S20 implemented the code-side fix path for the production game auth/storage blocker. This does not make current Vercel Production green by itself; it must be deployed and paired with S19-owned Vercel env configuration.

| Item | Result |
| --- | --- |
| Durable storage provider | Added `HK_MATH_STORAGE_PROVIDER=postgres` with `POSTGRES_URL`, using one Postgres `app_state` table and JSONB `payload`. SQLite remains the default local provider. |
| Mutation consistency | `readDatabase`, `writeDatabase`, and `mutateDatabase` now route through the selected provider. Postgres mutations run inside a transaction with `SELECT ... FOR UPDATE` on the shared state row. |
| Storage health/export | `/api/admin/storage/health` now verifies the Postgres `app_state` table before reporting `provider: "postgres"`, `status: "durable-ready"`, `durableReady: true`, and `usingTmpFallback: false`. Admin export redacts the Postgres target instead of printing the connection URL. |
| Smoke harness | Production game smoke now verifies browser `/api/me` after UI login, reads Adventure eligibility three times through browser cookies, and uses browser-context fetch for authenticated reward/duplicate checks. |
| Fishing diagnostics | Fishing question fetch and Phaser renderer startup now have bounded timeout/error states and expose `data-question-load`, `data-renderer-load`, and `data-load-error` for S11/S20 diagnostics. |
| Local verification | `npm run type-check` passed; `npm run build` passed; backend API E2E passed 3/3 against a fresh local production server; focused Fishing E2E passed 3/3. |

Next production gate: deploy this code, configure Vercel Production with `HK_MATH_STORAGE_PROVIDER=postgres` and `POSTGRES_URL` without logging values, verify admin storage health as Postgres durable-ready, then rerun desktop production game smoke before mobile.

## Post-Deploy Rerun: Storage/Game Gate

S11 reran the production game gate after the owner reported that the related deployment was complete.

| Gate | Result | Evidence |
| --- | --- | --- |
| Admin storage health | Blocked/unverified | Anonymous `GET /api/admin/storage/health` returned 401 as expected. No production admin smoke credential was available in this session, so S11 could not verify `provider: "postgres"`, `status: "durable-ready"`, `durableReady: true`, or admin export. |
| Desktop game smoke | Red | `PRODUCTION_GAME_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://www.mais.hk npx playwright test tests/e2e/production-game-smoke.spec.ts --project=desktop-chrome --reporter=list` ran 2 tests, 2 failed. |
| Fishing desktop | Red before gameplay | Dedicated smoke registration/seed began, but UI login failed after 3 attempts with HTTP 401 `Invalid username or password`; no authenticated gameplay evidence was reached. |
| Adventure desktop | Red before gameplay | UI login reached a dashboard state for the smoke user, but browser-context `/api/me` returned HTTP 401 `Not authenticated`; dashboard and points widgets showed authenticated API load failures. |
| Mobile game smoke | Not run | Mobile remains gated behind desktop green; desktop authenticated smoke is still red. |

Additional redacted diagnostics narrowed the failure:

| Probe | Result |
| --- | --- |
| API context auth | Register/login and same-context `/api/me` returned 200; `hk_math_session` Set-Cookie was present with Secure, HttpOnly, and SameSite attributes. |
| Browser fetch auth | Browser `fetch` register/login stored an HttpOnly `hk_math_session`; `/api/me` returned 200. Basic browser cookie handling is not the primary blocker. |
| UI login request body | The real `/login` form submitted the expected smoke username, expected generated password, expected password length, and expected grade. Even with a correct body, UI login returned HTTP 401 in the focused probe. |
| Register → clear cookie → reopen `/login` → direct browser fetch login | Flaky: 2/3 attempts returned HTTP 401 `Invalid username or password`, 1/3 returned 200. This reproduces the same instability without relying on a mistyped UI form. |

Current classification: production game release gate remains **red** because authenticated `/login` route/API behavior is not stable after smoke account creation. This is still best treated as production storage/session consistency or mixed deployment/runtime configuration until S19/S12 verify admin storage health as Postgres durable-ready. S20 should not take this as a gameplay implementation bug yet, because the tests are failing before Fishing/Adventure gameplay can be exercised.

## Blockers

- `coordination/blockers/2026-05-21-S10-production-storage.md`
- `coordination/blockers/2026-05-21-S10-simpletex-production.md`
- `coordination/blockers/2026-05-21-S11-production-game-auth-storage.md`
- `coordination/blockers/2026-05-21-S19-postgres-production-env.md`

## Checks Not Fully Run

- Admin storage health/export with an admin user was not run because no production admin smoke credentials were available.
- The 20-run Lesson/Practice SimpleTex OCR matrix was skipped because direct Production-env SimpleTex auth failed with 401.
- Full authenticated browser gameplay is not green. Local Playwright tooling was repaired and desktop production smoke ran, but production auth/storage/API readiness blocked the gameplay stage and reward verification. Mobile authenticated smoke was skipped because desktop did not pass.

## Release Decision

Do not clear Vercel Production for real class/student use yet. Configure durable production storage, verify production session/auth stability, and rotate/verify SimpleTex APP credentials first, then rerun the storage admin smoke, authenticated game desktop/mobile smoke, and 20-run OCR matrix.
