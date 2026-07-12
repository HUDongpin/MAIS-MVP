# 2026-06-06 Production Auth/API Transport And Storage Health

## Status

- Session coordinator: S10, with S19/S12/S11 evidence now complete.
- Target checked: `https://www.mais.hk`.
- Gate result at 2026-06-06 12:48 HKT: **red / blocked**.
- Root cause evidence: Vercel production serverless logs show `/api/auth/login` and `/api/auth/register` failing because the connected Postgres provider reports `XX000` with `Your project has exceeded the data transfer quota. Upgrade your plan to increase limits.`
- Secret handling: no secret values, cookies, Postgres URLs, API keys, Vercel tokens, or admin credentials were printed or written.

Related evidence files:

- `coordination/reports/2026-06-06-production-auth-storage-health-S19.md`
- `coordination/reports/2026-06-06-production-auth-storage-health-S12.md`
- `coordination/reports/2026-06-06-production-auth-storage-smoke-S11.md`

## Evidence

Read-only production probes:

| Probe | Result |
| --- | --- |
| `GET /` | 200 HTML |
| Anonymous `GET /api/admin/storage/health` | 401 JSON, expected because admin auth is required |
| Malformed `POST /api/auth/login` | 400 JSON, expected request-body validation |
| Missing-user `POST /api/auth/login` | 500 empty body/content-type, unexpected |
| Repeated missing-user `POST /api/auth/login` x5 | 5/5 returned 500 empty body |
| Disposable `POST /api/auth/register` x2 | 2/2 returned 500 empty body |

Vercel production env inventory by variable name only confirms the expected runtime variable classes are present:

- `AUTH_SESSION_SECRET`
- `HK_MATH_STORAGE_PROVIDER`
- `POSTGRES_URL`
- Neon/Vercel Postgres related names including `PGDATABASE`, `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_URL_NON_POOLING`, and `POSTGRES_PRISMA_URL`
- DeepSeek/Qwen/SimpleTex provider names including `DEEPSEEK_API_KEY`, `QWEN_API_KEY`, `SIMPLETEX_APP_ID`, and `SIMPLETEX_APP_SECRET`

Vercel expanded function logs for the probe window show:

- `λ POST /api/auth/login`
- `λ POST /api/auth/register`
- Error class/code: Postgres provider error `XX000`
- Message: data transfer quota exceeded; upgrade plan to increase limits.

S19's broader log scan found no `socket hang up` or `empty reply` mentions in the sampled Vercel windows. The active reproducible signal is storage-backed auth returning serverless 500s when Postgres rejects access because of quota.

## S12 API Contract Notes

- `app/api/auth/login/route.ts` calls `authenticateUserForLogin()`, which calls `readDatabase()`. With `HK_MATH_STORAGE_PROVIDER=postgres`, that reaches the Postgres state table before returning a normal 401 for invalid credentials.
- `app/api/auth/register/route.ts` calls `createStudentUser()`, which mutates the same Postgres-backed state.
- `app/api/admin/storage/health/route.ts` is intentionally protected:
  - anonymous request: 401
  - non-admin authenticated request: 403
  - admin authenticated request: 200 with `{ storage: ... }`
- `getStorageReadinessSnapshot()` should report the release gate as:
  - `provider: "postgres"`
  - `status: "durable-ready"`
  - `durableReady: true`
  - `configuredUrl: true`
  - `usingTmpFallback: false`
  - `runtime: "vercel"`

The immediate failure is not a missing env variable or cookie transport mismatch. The configured Postgres service is currently unavailable because of quota, so storage-backed auth cannot complete.

## Admin Storage Health Verification Plan

Run only after the Neon/Postgres quota is restored.

1. Keep the negative controls:
   - anonymous `GET https://www.mais.hk/api/admin/storage/health` must return 401.
   - authenticated student `GET /api/admin/storage/health` must return 403.
2. Obtain an approved production admin smoke credential or existing admin session through the owner-approved secret channel. Do not print the credential or cookie.
3. Login as admin with `POST https://www.mais.hk/api/auth/login` and a local cookie jar.
4. Call `GET https://www.mais.hk/api/admin/storage/health` with the admin session cookie.
5. Accept only 200 JSON where `storage.provider === "postgres"`, `storage.status === "durable-ready"`, `storage.durableReady === true`, and `storage.usingTmpFallback === false`.
6. Record only redacted status, variable names, endpoint names, HTTP status codes, and boolean health fields.

## S11 Production Browser Smoke Gate

S11 ran the minimal production browser smoke and marked it **RED**:

- Home page and login page loaded successfully.
- One browser UI `POST /api/auth/login` returned HTTP 500.
- Browser observed a non-JSON response with no content type and a 125-byte generic body.
- Playwright did not observe a socket reset or empty reply.
- Full five-account production auth/storage smoke and game-writing smoke were intentionally not run while the known Postgres quota failure is active.

Current recommendation: **do not run broad production-writing smoke until quota is fixed**, because auth/register storage writes are already failing and extra smoke attempts will only create more 500 logs.

After quota recovery and admin health passes, run:

```bash
PLAYWRIGHT_SKIP_WEBSERVER=1 \
PLAYWRIGHT_BASE_URL=https://www.mais.hk \
PRODUCTION_AUTH_STORAGE_SMOKE=1 \
npx playwright test tests/e2e/production-auth-storage-smoke.spec.ts --project=desktop-chrome --reporter=line
```

Expected pass condition: five disposable smoke students each show register 200, browser login 200, one secure `hk_math_session` cookie, `/api/me` 200, and `/api/me` username matching the smoke account.

Then, if needed for game release:

```bash
PLAYWRIGHT_SKIP_WEBSERVER=1 \
PLAYWRIGHT_BASE_URL=https://www.mais.hk \
PRODUCTION_GAME_SMOKE=1 \
npx playwright test tests/e2e/production-game-smoke.spec.ts --project=desktop-chrome --reporter=line
```

## Required Owner/S19 Action

- Restore the connected Neon/Postgres resource from data-transfer quota exhaustion. Practical options are to upgrade the Neon plan/quota, attach a fresh approved durable Postgres resource, or otherwise restore the existing resource's quota.
- After restoration, S19 should re-check Vercel production logs for absence of the `XX000` quota error and S12 should run the authenticated admin storage health plan above.
- Only then should S11 run the full production browser smoke.

## Residual Engineering Follow-up

S12 may consider adding a narrow catch around storage-provider failures in auth/register routes so production users receive a 503 JSON health-style error instead of an empty 500. That is a UX/diagnostics improvement only; it does not clear the storage health gate while the Postgres quota is exhausted.
