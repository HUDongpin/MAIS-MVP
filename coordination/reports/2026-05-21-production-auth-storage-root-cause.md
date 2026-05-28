# Production Auth/Storage Root Cause Report

- Date: 2026-05-21
- Sessions: S12/S19/S11 coordinated production auth-storage diagnosis
- Target: `https://www.mais.hk`
- Related product gate: Fishing Master at `/practice/fishing-game`
- Secret policy: No cookie values, passwords, Postgres URLs, or Vercel encrypted values were recorded.

## Executive Summary

The Fishing Master production blocker is caused by production auth/storage inconsistency before the game can be reached.

Vercel Production currently has `AUTH_SESSION_SECRET`, but it does **not** have `HK_MATH_STORAGE_PROVIDER` or `POSTGRES_URL` configured. Because the app defaults to SQLite and Vercel runtime storage defaults to ephemeral `/tmp`, smoke users can be created in one serverless runtime and then fail login or `/api/me` in another runtime.

This is not a confirmed Fishing Master gameplay bug. S20 should wait until auth/storage is green.

## Production Environment Evidence

`vercel env ls production` showed these Production variable names only:

| Variable | Production present |
| --- | --- |
| `AUTH_SESSION_SECRET` | Yes |
| `HK_MATH_STORAGE_PROVIDER` | No |
| `POSTGRES_URL` | No |
| `HK_MATH_ENABLE_DEMO_USER` | Yes |
| `LLM_*` | Yes |
| `SIMPLETEX_*` | Yes |

`vercel integration ls` returned no Marketplace integration resources for the linked project.

## Runtime Probe Evidence

An API-level 5-run probe using direct HTTP requests passed all 5 runs:

| Probe | Result |
| --- | --- |
| Register status | 5/5 HTTP 200 |
| Register `Set-Cookie` | 5/5 present, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` |
| Register cookie `/api/me` | 5/5 HTTP 200, same smoke user |
| Login status | 5/5 HTTP 200 |
| Login `Set-Cookie` | 5/5 present, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` |
| Login cookie `/api/me` | 5/5 HTTP 200, same smoke user |

The API-level pass does not prove durable storage because direct requests can stay on a warm runtime long enough to read the same ephemeral state.

A browser/UI production auth-storage smoke was added and run:

```bash
PRODUCTION_AUTH_STORAGE_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://www.mais.hk npx playwright test tests/e2e/production-auth-storage-smoke.spec.ts --project=desktop-chrome --reporter=list
```

Result: **failed 1/1**.

| Attempt | Register | UI login | `hk_math_session` cookie | Browser `/api/me` |
| --- | ---: | ---: | ---: | ---: |
| 1 | 200 | 401 | 0 | 401 |
| 2 | 200 | 200 | 1 | 401 |
| 3 | 200 | 401 | 0 | 401 |
| 4 | 200 | 401 | 0 | 401 |
| 5 | 200 | 401 | 0 | 401 |

This reproduces the exact failure mode blocking Fishing Master: registration can succeed, but browser login/session verification is not stable enough to reach authenticated gameplay.

## Changes Implemented

| Area | Change |
| --- | --- |
| Environment example | Added `HK_MATH_STORAGE_PROVIDER` and `POSTGRES_URL` notes to `.env.local.example`, explicitly warning that Vercel without Postgres durable storage can produce 401 drift across serverless instances. |
| QA coverage | Added `tests/e2e/production-auth-storage-smoke.spec.ts`, an opt-in production-writing smoke gated by `PRODUCTION_AUTH_STORAGE_SMOKE=1`. |
| Secret hygiene | New smoke disables trace/video/screenshots and records only redacted cookie attributes, status codes, and same-user booleans. |

## Required Production Fix

S19/owner must configure durable Production storage before Fishing Master can be cleared:

```bash
printf 'postgres\n' | vercel env add HK_MATH_STORAGE_PROVIDER production
printf '<redacted-postgres-url>\n' | vercel env add POSTGRES_URL production
```

Then redeploy or redeploy the current production build so Vercel functions receive the new variables.

After deployment, verify with an admin smoke credential:

- `/api/admin/storage/health` returns `provider: "postgres"`.
- `status` is `durable-ready`.
- `durableReady` is `true`.
- `usingTmpFallback` is `false`.

## Follow-Up Verification

After the Vercel Production env fix:

1. Rerun the new auth-storage smoke command above. It must pass 5/5.
2. Rerun desktop Fishing Master production smoke.
3. If desktop passes, rerun mobile Fishing Master production smoke.
4. Only if auth-storage passes but Fishing gameplay fails should S20 inspect game logic.
