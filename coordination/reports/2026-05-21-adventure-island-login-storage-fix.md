# Adventure Island Login Storage Fix Report

- Date: 2026-05-21
- Session: S12, with S19/S11 follow-up required
- Target issue: Adventure Island production smoke fails before gameplay because production browser UI login returns HTTP 401 for disposable smoke users
- Secret policy: No cookies, passwords, Postgres URLs, or encrypted Vercel values recorded

## Executive Summary

The Adventure Island blocker is still best classified as a production auth/storage issue, not an Adventure Island game-loop issue.

S12 implemented the code-side storage safety fix in `lib/server/userStore.ts`: Postgres normalization write-back now re-reads and locks the current `app_state` row with `SELECT ... FOR UPDATE` before writing a normalized full-state snapshot. This prevents a read-only normalization pass from overwriting a newer registration, attempt, or reward mutation.

Local checks passed. Production cannot be cleared yet because Vercel Production currently has `AUTH_SESSION_SECRET`, but does not list `HK_MATH_STORAGE_PROVIDER` or `POSTGRES_URL`. Without those variables, the live app can still use serverless SQLite/tmp fallback, which can make smoke users disappear across Vercel function instances.

## Code Change

| Area | Result |
| --- | --- |
| Postgres read normalization | `readPostgresDatabaseFrom` no longer writes a normalized snapshot from an unlocked read. |
| Locked synchronization | Any normalization write-back now runs in a Postgres transaction and locks the `app_state` row first. |
| Initialization fallback | Missing or malformed Postgres state is initialized inside the same locked path. |
| Adventure Island UI/game | No changes made. |

## Verification

| Check | Result |
| --- | --- |
| `npm run type-check` | Passed. |
| `npm run test:backend` | Passed, 3/3. |
| `npm run build` | Passed on sequential rerun. First attempt failed from overlapping build/test `.next` contention, not the code change. |
| `npx playwright test tests/e2e/adventure-island.spec.ts --project=desktop-chrome --project=mobile-chrome` | Passed, 4/4. |
| Anonymous `GET https://www.mais.hk/api/admin/storage/health` | HTTP 401 `Not authenticated`, expected without admin credentials. |
| `vercel env ls` name-only check | `AUTH_SESSION_SECRET` present; `HK_MATH_STORAGE_PROVIDER` and `POSTGRES_URL` absent. |

## Remaining Production Blocker

S19/owner must configure durable Production storage before Adventure Island can be called functional on `www.mais.hk`:

```bash
printf 'postgres\n' | vercel env add HK_MATH_STORAGE_PROVIDER production
printf '<redacted-postgres-url>\n' | vercel env add POSTGRES_URL production
```

Then redeploy so production functions receive the new variables. Do not log the Postgres URL.

## Required Rerun After Env Fix

1. Verify admin storage health with an approved admin smoke credential:
   - `provider: "postgres"`
   - `status: "durable-ready"`
   - `durableReady: true`
   - `usingTmpFallback: false`
2. Rerun auth-storage smoke if available:
   - `PRODUCTION_AUTH_STORAGE_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://www.mais.hk npx playwright test tests/e2e/production-auth-storage-smoke.spec.ts --project=desktop-chrome --reporter=list`
3. Rerun Adventure Island desktop:
   - `PRODUCTION_GAME_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://www.mais.hk npx playwright test tests/e2e/production-game-smoke.spec.ts --project=desktop-chrome --reporter=list -g "Adventure Island authenticates"`
4. If desktop passes, rerun with `--project=mobile-chrome`.

Adventure Island should be marked green only after authenticated desktop and mobile gameplay reach canvas, movement, trophy clear, `35 XP / 35 points`, badge unlock, and duplicate reward protection.
