# 2026-06-06 S11 Production Auth/API Storage Smoke

## Scope

- Session: S11 QA and release quality.
- Target: `https://www.mais.hk`.
- Context: S10 probes at 2026-06-06 12:43 HKT saw production `POST /api/auth/login` and `POST /api/auth/register` return HTTP 500 with empty bodies; Vercel logs reportedly show Postgres provider error `XX000: data transfer quota exceeded`.
- Constraint: Minimal browser smoke only. No broad five-account production auth/storage smoke and no production game-writing smoke while storage quota failure is active.
- Secret handling: No cookies, credentials, auth headers, or real secrets were printed or stored.

## Commands Run

- `sed -n '1,260p' /Users/dongpinhu/Desktop/MAIS-MVP/AGENTS.md`
- `git status --short`
- `command -v npx >/dev/null 2>&1; echo "npx:$?"`
- `PLAYWRIGHT_SKIP_WEBSERVER=1 "$PWCLI" --help`
  - Result: local Playwright CLI wrapper could not run because `npx` hit local `ENOSPC` while fetching `@playwright/cli`.
- `node -e "import('playwright')..."`
  - Result: project-installed Playwright package is available.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 node <<'NODE' ... NODE`
  - Inline Playwright smoke: loaded `/`, loaded `/login`, then submitted one browser UI login form using a disposable nonexistent account. Credential values were intentionally omitted from output.

## Result

Smoke status: **RED**

| Check | Status | Evidence |
| --- | --- | --- |
| Home page load | Pass | `GET /` returned HTTP 200; final URL `https://www.mais.hk/`; title `MAIS`; body contained expected brand marker. |
| Login page load | Pass | `GET /login` returned HTTP 200; username input, password input, and submit button were present. |
| Auth transport | Fail | One browser UI `POST /api/auth/login` returned HTTP 500. |

## Auth/API Observation

- Route: `POST /api/auth/login`.
- Browser action: one UI login form submission with a disposable nonexistent account.
- HTTP status: `500`.
- `response.ok()`: `false`.
- Response content type: none observed.
- Response body class: non-JSON, non-empty generic text/HTML class.
- Response body size: 125 bytes.
- Socket behavior: no socket reset or empty reply was observed by Playwright.
- UI behavior after response: browser stayed on `/login`; no visible `role="status"` or `role="alert"` error text was captured within the short post-submit wait.
- Console evidence: one unauthenticated `401` resource error appeared during page activity, then the auth submit produced a `500` resource error.

## Artifacts

- No screenshot, trace, cookie dump, or response-body artifact was created.
- Evidence is recorded in this report and the S11 session log only.

## Blocker

Full production auth/storage smoke remains blocked until the Neon/Vercel Postgres quota condition is restored and S19/S12 confirm production auth storage can read/write without provider error `XX000`.

Running the broad five-account auth smoke or production game-writing smoke now would create avoidable repeated writes against a known failing storage dependency.
