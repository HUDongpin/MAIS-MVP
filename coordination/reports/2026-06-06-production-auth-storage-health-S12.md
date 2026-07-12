# 2026-06-06 S12 Production Auth And Storage Health Investigation

- Session ID: S12
- Scope: Backend/API contract investigation and S11 verification plan.
- Code edits: none.
- Secret handling: no real credentials, session cookies, `POSTGRES_URL`, Vercel tokens, or secret values were read from secret files, printed, copied, logged, or written.

## Files Inspected

- `AGENTS.md`
- `app/api/auth/login/route.ts`
- `app/api/auth/register/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/admin/storage/health/route.ts`
- `app/api/admin/storage/export/route.ts`
- `lib/session.ts`
- `lib/server/auth.ts`
- `lib/server/sessionCookie.ts`
- `lib/server/userStore.ts`
- `middleware.ts`
- `components/providers/AppProviders.tsx`
- `app/login/page.tsx`
- `app/register/page.tsx`
- `tests/e2e/backend-api.spec.ts`
- `tests/e2e/production-auth-storage-smoke.spec.ts`
- `coordination/integration/2026-06-06-california-math-practice-beta-post-launch-handoff.md`
- `coordination/session-logs/2026-06-05-S19.md`
- `coordination/session-logs/2026-06-06-S19.md`
- `coordination/blockers/2026-06-05-S19-postgres-url.md`
- `coordination/blockers/2026-06-05-S19-durable-postgres-terms.md`
- `coordination/reports/build_2026_06_06_president_report.py`

## Confirmed Contracts

### `POST /api/auth/login`

- Supported request body is JSON. The client provider sends `Content-Type: application/json`.
- Required JSON fields:
  - `username`: string, trimmed, email or username.
  - `password`: string.
- Optional JSON fields:
  - `grade`: valid `GradeId`; falls back to stored selected grade.
  - `language`: valid app language.
  - `theme`: `"dark"` or `"light"`.
  - `curriculumTrack`: currently accepted values are `HK`, `MAINLAND_PEP_HIGH`, `US_CA_MATH`, `US_NC_MATH`, `US_AR_MATH`, `US_FL_MATH`.
  - `curriculumProfile`: object normalized by curriculum profile helpers.
- Expected statuses:
  - `400`: invalid JSON, non-object body, or missing username/password.
  - `401`: invalid email/username or password.
  - `200`: authenticated session JSON and `Set-Cookie: hk_math_session=...`; or `{ requiresCurriculumTrack: true, user }` for a legacy student that needs curriculum selection.
  - `500`: current login-only missing session-secret response. This is a contract mismatch with `register`, which returns the shared `503` setup response. Because S19 production smoke passed, this is unlikely to explain the current sporadic production symptom.

### `POST /api/auth/register`

- Supported request body is JSON. The client provider sends `Content-Type: application/json`.
- Shared fields:
  - `role`: optional, `"student"` by default; `"student"` or `"parent"` allowed.
  - `name`: string.
  - `username`: string; required for student, optional for parent when `email` is present.
  - `email`: optional for student, required for parent.
  - `password`: string, at least 5 characters.
  - `language`, `theme`: optional validated settings.
- Student fields:
  - `grade`: valid grade.
  - `curriculumTrack` or `curriculumProfile`: required through normalization.
- Expected statuses:
  - `200`: created session JSON and `Set-Cookie: hk_math_session=...`.
  - `400`: invalid or unsupported role/body/field combination.
  - `403`: public teacher/admin registration attempt.
  - `409`: duplicate username or email.
  - `503`: session secret missing via shared helper.

### `GET /api/admin/storage/health`

- Authentication: requires `hk_math_session` cookie.
- Authorization: authenticated user role must be `admin`.
- Expected statuses:
  - `401`: no valid session cookie or session token cannot be verified.
  - `403`: authenticated but not admin.
  - `200`: `{ storage: ... }`, even when the storage readiness state inside JSON is not durable-ready.
- Expected admin success shape for production:
  - `storage.provider === "postgres"`
  - `storage.status === "durable-ready"`
  - `storage.durableReady === true`
  - `storage.configuredUrl === true`
  - `storage.usingTmpFallback === false`
  - `storage.databasePath === "postgres://[redacted]"`
  - `storage.databaseDirectory === "postgres://[redacted]"`
- Other possible JSON statuses:
  - Postgres: `missing-postgres-url`, `postgres-unavailable`, `durable-ready`.
  - SQLite: `demo-only`, `durable-ready`.

## Findings

- The admin storage health route itself catches Postgres table/read failures inside `getStorageReadinessSnapshot()` and returns a JSON health object to an authorized admin. It should not normally cause a transport-level empty reply after admin auth succeeds.
- Login/register do not have an outer storage error boundary. `authenticateUserForLogin()`, `completeStudentCurriculumTrackSelection()`, `updateUserSettings()`, `createStudentUser()`, `createParentUser()`, and `getLessonEntryTarget()` can propagate `readDatabase()` or `mutateDatabase()` failures directly to the Next route runtime.
- S19 reported on 2026-06-05 that Production/Preview now have encrypted `POSTGRES_URL`, `HK_MATH_STORAGE_PROVIDER=postgres`, a fresh Production redeploy, and a passing disposable student registration/login persistence smoke. This reduces the likelihood of the older `/tmp` SQLite drift as the current cause.
- S23 reported on 2026-06-06 that direct API/curl login probes against `https://mais.hk/api/auth/login` intermittently returned `socket hang up`, `empty reply from server`, or timeout, while one real UI login for `Student Shirleen` returned `/api/auth/login` status 200 and navigated to `/dashboard`.
- The supported browser/client flow uses JSON. A direct probe using form-encoded `curl -d username=...` is outside the current route contract and should return `400`, not count as a supported login failure.
- Password verification uses PBKDF2 with 120,000 SHA-512 iterations per matching user. This is reasonable for normal UI login but can contribute to function pressure during repeated/concurrent raw probes.
- Postgres storage uses one `app_state` JSONB row with max one connection per serverless instance and row locking for mutations. Cold starts, full-state normalization, concurrent login settings updates, or transient Neon/Vercel connectivity can plausibly produce timeouts or unhandled route errors if they align with `/api/auth/login`.

## Plausible Sources Of Sporadic Empty Reply / Socket Hang Up

1. Transient Vercel/Neon runtime failure during login storage reads or mutations. Login has no route-level catch around storage calls, so Postgres connect timeout, row-lock wait, or function timeout could surface as transport instability instead of app JSON.
2. Production deployment/runtime churn. The California launch was promoted from a pruned staging snapshot, and the handoff records intermittent direct API transport failures but a successful UI login, which fits a deployment/runtime or probe-method issue more than a deterministic API-contract bug.
3. Probe contract mismatch. JSON is required; unsupported form-encoded direct probes should be separated from valid JSON probes in S11 evidence.
4. Login CPU/load pressure. Repeated login attempts can spend CPU on PBKDF2 and full state reads; this is a plausible amplifier under stress, not a confirmed root cause.
5. Session secret mismatch is less likely for the current production symptom because S19 registration/login persistence smoke passed. If it occurred, the expected failure would be deterministic JSON `500` or `503` behavior, not intermittent UI success.

## Minimal Authenticated Admin Verification Plan For S11

Use an existing owner-approved admin account/session, or get owner approval for a temporary admin smoke account. Do not create an admin backdoor and do not log credentials or cookie values.

1. Anonymous control:
   - `GET https://www.mais.hk/api/admin/storage/health`
   - Expected: `401` with `{ "error": "Not authenticated." }`.
2. Non-admin control:
   - Log in as a known teacher or student through the normal UI or JSON API.
   - `GET /api/admin/storage/health` in the same browser/request context.
   - Expected: `403` with `{ "error": "Admin role required." }`.
3. Admin health:
   - Log in as the owner-approved admin using JSON body:

```json
{
  "username": "<redacted-admin-username>",
  "password": "<redacted-admin-password>",
  "grade": "S3",
  "language": "en",
  "theme": "dark"
}
```

   - Then request `GET /api/admin/storage/health` with the same authenticated context.
   - Expected: HTTP `200`; `provider: "postgres"`; `status: "durable-ready"`; `durableReady: true`; `configuredUrl: true`; `usingTmpFallback: false`; redacted database path fields only.
4. Production auth/storage smoke:
   - Existing S11-style command, after explicit approval because it writes disposable smoke accounts:

```bash
PRODUCTION_AUTH_STORAGE_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://www.mais.hk npx playwright test tests/e2e/production-auth-storage-smoke.spec.ts --project=desktop-chrome
```

   - Expected: five attempts all return register `200`, login `200`, one `hk_math_session` cookie, `/api/me` `200`, and same username.
5. If any `socket hang up` or empty reply repeats:
   - Record exact absolute timestamp, endpoint, method, content type, deployment URL/alias, and whether the attempt was UI, Playwright APIRequest, browser fetch, or curl.
   - Ask S19/S22 to inspect Vercel function logs for `/api/auth/login` and matching timestamps, especially function timeout, memory, cold start, Postgres connect timeout, row-lock waits, build chunk errors, or deployment routing changes.

## Blockers

- S12 did not have an owner-approved production admin session/credential and did not run authenticated admin health.
- S12 did not inspect Vercel function logs; S19 has a parallel 2026-06-06 transport log scoped to Vercel/log evidence.
- The working tree is heavily dirty, including inspected auth/storage files, so this report treats current code as in-flight and avoids code edits.

## Checks

- Not run: documentation/report-only investigation. No code files were changed.
