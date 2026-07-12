# 2026-06-06 Production Auth Storage Recovery - S19

## Scope

- Session: S19.
- Target: `https://www.mais.hk`.
- Objective: restore production login/register after the connected Postgres resource hit data-transfer quota and auth routes returned 500.
- Secret handling: no Postgres URL, database password, Vercel token, cookie value, smoke password, or raw secret value is recorded here.

## Root Cause Evidence

- Before recovery, a disposable nonexistent JSON login probe returned HTTP 500 with an empty body.
- Vercel production logs showed `/api/auth/login` and `/api/auth/register` failures with provider error class `XX000` and message class `data transfer quota exceeded`.
- The code path for login/register reads or mutates shared storage; an exhausted Postgres resource therefore surfaced as auth route 500s.

## Recovery Actions

- Updated the Neon marketplace installation plan to `launch_v3`.
- Provisioned replacement Neon resource `mais-mvp-postgres-rescue`.
- Disconnected the exhausted `mais-mvp-postgres` resource from project `mais-mvp`; no delete/remove command was run.
- Connected `mais-mvp-postgres-rescue` to `mais-mvp` for Production and Preview.
- Confirmed encrypted Postgres env variable names are present for Production and Preview.
- Re-confirmed `HK_MATH_STORAGE_PROVIDER=postgres` for Production and Preview.
- Cleanly redeployed Production from an existing Ready deployment to avoid deploying the dirty local worktree.

## Current Production Deployment

- Ready deployment: `https://mais-465s1px6m-peter-dongpin-hu-s-projects.vercel.app`
- Aliases confirmed: `https://mais.hk`, `https://www.mais.hk`
- Connected project resource: `mais-mvp-postgres-rescue` (`Neon`, status available)

## Verification Passed

- Invalid login probe: HTTP 401 JSON, not 500/empty.
- API storage persistence smoke:
  - register: 200
  - `/api/me` after register: 200, same smoke username
  - login: 200
  - `/api/me` after login: 200, same smoke username
- Browser UI smoke:
  - smoke account registration: 200
  - login button enabled
  - browser-observed `/api/auth/login`: 200
  - one `hk_math_session` cookie present
  - browser `/api/me`: 200, same smoke username
  - final page path: `/dashboard`
- Recent post-switch log samples showed no quota-class messages and no auth 5xx in sampled windows.

## Not Completed

- Authenticated admin `GET /api/admin/storage/health` was not run. No owner-approved production admin session or credential was available in the shell, `.env.local`, `.env`, or the authorized local DOCX.
- S19 did not create a persistent admin smoke account or admin backdoor.
- The old exhausted Neon resource was disconnected from the project but not deleted; data migration or cleanup is a separate owner decision.

## Continuation Evidence - Admin Health Gap

- Current production remains on Ready deployment `https://mais-465s1px6m-peter-dongpin-hu-s-projects.vercel.app` with aliases `https://mais.hk` and `https://www.mais.hk`.
- Current connected project resource remains `mais-mvp-postgres-rescue`.
- A continuation invalid-login probe still returns expected HTTP 401 JSON, not auth 500.
- `vercel env ls production --format=json` lists `POSTGRES_URL`, `HK_MATH_STORAGE_PROVIDER`, and `MAIS_BOOTSTRAP_ADMIN_*` variable names, but `vercel env run --environment production` exposes only the Postgres/provider variables to the local process, not usable bootstrap admin values.
- Direct local Postgres checks through `POSTGRES_URL`, `DATABASE_URL`, `POSTGRES_URL_NON_POOLING`, and `DATABASE_URL_UNPOOLED` all timed out from the local environment with `CONNECT_TIMEOUT`; this cannot prove route-level admin health.
- Anonymous `GET /api/admin/storage/health` continues to return expected HTTP 401 JSON.
- S19 did not overwrite existing sensitive bootstrap admin variables or create a new persistent admin account without explicit owner approval.

## Final Blocker Audit - Admin Route Health

- Rechecked production after a later external redeploy:
  - Ready deployment: `https://mais-9pukteusy-peter-dongpin-hu-s-projects.vercel.app`
  - aliases: `https://mais.hk`, `https://www.mais.hk`
  - invalid-login probe: HTTP 401 JSON, not 500
  - anonymous `/api/admin/storage/health`: HTTP 401 JSON, expected without admin auth
- `vercel env ls production --format=json` still lists `MAIS_BOOTSTRAP_ADMIN_*` names as sensitive Production variables, but sequential `vercel env run --environment production` exposes only Postgres/provider variable presence and no usable bootstrap-admin values.
- The same admin-auth blocker has now repeated across consecutive goal continuations: route-level admin storage health cannot be completed without either an owner-provided existing production admin session/credential or explicit approval to create/use a temporary production admin smoke path.
- S19 still did not print, copy, overwrite, or store secret values.

## Recommended Next Step

- S12 can complete the route-level storage health check once the owner provides an existing production admin session/credential or explicitly approves a temporary admin smoke path.
- S11 can treat production auth/register smoke as green based on the API and browser evidence above; the existing broad Playwright spec needs a small interaction fix because it tries to click an already-selected disabled `S3` radio.

## Final Resolution - 2026-06-06 19:17 HKT

- The earlier admin-health blocker is resolved. The historical blocker sections above are retained for audit trail only.
- Temporary bootstrap-admin path used:
  - Added Production `MAIS_BOOTSTRAP_ADMIN_EMAIL`, `MAIS_BOOTSTRAP_ADMIN_USERNAME`, `MAIS_BOOTSTRAP_ADMIN_NAME`, and `MAIS_BOOTSTRAP_ADMIN_PASSWORD` with generated redacted values.
  - Redeployed Production to sync the temporary admin.
  - Logged in as the temporary admin through Playwright request context against `https://www.mais.hk`.
  - Removed all four `MAIS_BOOTSTRAP_ADMIN_*` Production env names.
  - Redeployed Production again and confirmed no visible `MAIS_BOOTSTRAP_ADMIN_*` names remain.
- Final current Production deployment:
  - `https://mais-28alikw52-peter-dongpin-hu-s-projects.vercel.app`
  - aliases: `https://mais.hk`, `https://www.mais.hk`
  - state: `READY`, target `production`
- Authenticated admin storage health passed after bootstrap env cleanup:
  - URL: `GET https://www.mais.hk/api/admin/storage/health`
  - HTTP: 200
  - `provider=postgres`
  - `status=durable-ready`
  - `durableReady=true`
  - `configuredUrl=true`
  - `usingTmpFallback=false`
  - `runtime=vercel`
- Post-cleanup student browser smoke passed:
  - disposable register: HTTP 200, `role=student`, `grade=P3`
  - disposable login: HTTP 200, `role=student`, `grade=P3`
  - `/api/me` after login: HTTP 200, `role=student`, `grade=P3`, session cookie present
- Production auth log sampling during the final smoke showed `/api/auth/login` response status 200 entries and no quota/data-transfer mentions. Warning-class log lines were Node SQLite experimental warnings, not auth quota failures.
- Residual risks:
  - Production remains on a fresh Postgres state. Historical registrations only present in the old quota-exhausted database remain unavailable until that old resource quota is restored and a migration/export path is approved.
  - Temporary admin smoke records may exist in the fresh Postgres state from prior failed client-receipt attempts and the final successful health check. Generated passwords were high-entropy and not recorded. S12 should clean, disable, or formally rotate those records through an approved admin-user maintenance path if needed.
- Secret handling remained clean: no Postgres URL, Vercel token, admin password, smoke password, session cookie, raw project/org id, or raw secret value is recorded here.
