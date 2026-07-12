# www.mais.hk Student P0/P1 Bug Report

- Date: 2026-06-04
- Session: S11 QA and release quality
- Target: `https://www.mais.hk`
- Local parity target: `http://127.0.0.1:3021`
- Scope: Student-facing P0/P1 discovery and fix analysis. No feature code was edited.

## Executive Summary

No confirmed site-wide P0 outage was found in the tested student surface. The public home, login, registration, learning path, lesson, practice, mistake book, visualization lab, classroom join, and game routes returned HTTP 200 or expected login redirects, with no production page crashes or blank app.

One confirmed high-severity production bug was found:

1. **SEV-P1-01: Production new student registration is not durable across API/serverless reads.**
   A new P1 student can register and briefly receive a valid session, but the account disappears from subsequent production reads/logins. The dashboard then shows partial fallback UI such as `Could not load dashboard data`, and later `/api/me`, `/api/dashboard`, and `/api/auth/login` return 401 for that newly registered user.

This should be treated as **P1 immediately**. If public self-registration is expected for real users today, treat it operationally as **P0-risk** because it causes new-account data loss.

## Severity Rubric

- **P0:** Site-wide outage, production data loss/corruption, account/session security failure, or a blocker that prevents all users from using the product.
- **P1:** Core student workflow broken or unreliable for a major segment; significant production-only runtime failure; serious account/storage defect; or high-confidence release-critical regression.
- **P2+:** Important issue, stale test, copy mismatch, performance risk, or degraded experience that does not block a core workflow.

## Coverage Performed

- Live production route scan, anonymous desktop/mobile:
  - `/`, `/login`, `/register`, `/forgot-password`, `/lesson`, `/lesson/quadratic-functions`, `/adaptive-learning`, `/dashboard`, `/progress`, `/learning-path`, `/primary-roadmap`, `/secondary-roadmap`, `/practice`, `/mistake-book`, `/visualization-lab`, `/messages`, `/classroom/join`, `/practice/fishing-game`, `/practice/adventure-island`, `/assessment/assessment-s3-algebra-quiz`, `/resource/resource-s3-quadratics-slides`.
- Authenticated demo-student scan on local and production, desktop/mobile:
  - `/dashboard`, `/adaptive-learning`, `/progress`, `/learning-path`, `/lesson/quadratic-functions`, `/practice`, `/mistake-book`, `/visualization-lab`, `/messages`, `/classroom/join`, student game routes.
- Targeted local/production UI checks:
  - Mobile login UI.
  - P1 student registration UI.
  - Practice Arena pagination/jump controls.
  - Lesson page load for `quadratic-functions`.
- Regression re-test for previous P1 candidate:
  - Ended live-classroom join code.
- Local checks:
  - `npm run type-check`: passed.
  - Broad student E2E matrix was run and failed, but the confirmed failures were stale selectors/copy or changed product flow; details below.

## SEV-P1-01: Production New Student Registration Is Not Durable

### Status

Confirmed P1, production-only.

### Impact

New student registration appears to succeed, but the account is not reliably available to other production API reads or later logins.

For a new student, this means:

- The user sees a successful account creation path and lands on `/dashboard`.
- The dashboard can show the new name and P1 grade from in-memory client/session state.
- Backend dashboard data fails with `401 Not authenticated`.
- The account cannot be used to log in again shortly afterward.

This breaks public onboarding and can look like account/data loss to families or students.

### Reproduction

Production UI reproduction, P1 student:

1. Open `https://www.mais.hk/register`.
2. Use the stepper normally:
   - Account type: Individual student.
   - Next step.
   - Grade: P1.
   - Next step through curriculum.
   - Fill account details with a unique `example.test` email.
3. Click `Create account`.
4. Observe `/api/auth/register` returns 200 and `/api/me` can briefly return 200.
5. Observe `/api/dashboard?grade=P1` returns 401.
6. After a short delay, `/api/me` also returns 401.
7. Attempt to log in again with the newly created username/password.
8. Observe `/api/auth/login` returns 401 `Invalid email/username or password`.

Confirmed test accounts created during this audit now fail fresh login:

- `s11-api-p1-1780537933178-g3p57@example.test`: login 401.
- `s11-ui-p1-1780537977282-2i43g@example.test`: login 401.
- `s11-p1-1780537840157-hldyg@example.test`: login 401.

### Evidence

Production UI registration evidence:

- `POST https://www.mais.hk/api/auth/register`: 200 with a session payload for `S11 UI P1 ...`, grade `P1`.
- Immediate `GET https://www.mais.hk/api/me?includeLessonEntry=false`: 200 once, with the new user.
- Immediate `GET https://www.mais.hk/api/dashboard?grade=P1`: 401 `{"error":"Not authenticated."}`.
- Later same browser context `GET /api/me`: 401.
- Fresh login for same account: 401 `{"error":"Invalid email/username or password."}`.

Local parity check:

- The same P1 registration flow on `http://127.0.0.1:3021` succeeded.
- Local dashboard showed `Welcome back, S11 P1 ...`, grade `P1`, and persisted session/account data.

Relevant code/config evidence:

- `.env.local.example:28-38` explicitly warns that Vercel without durable storage uses ephemeral storage and that authenticated browser flows may return 401.
- `lib/server/userStore.ts:874-881` defaults storage to SQLite unless `HK_MATH_STORAGE_PROVIDER=postgres`.
- `lib/server/userStore.ts:3279-3364` contains the durable Postgres state path.
- `lib/server/userStore.ts:3371-3397` contains the SQLite write path.
- `lib/server/userStore.ts:5692-5776` creates student users by mutating the configured database snapshot.
- `app/api/auth/register/route.ts:82-109` creates the user, returns session JSON, and sets the session cookie.

### Likely Root Cause

Production is likely running with the default SQLite/serverless storage path instead of durable shared Postgres. On Vercel, SQLite or `/tmp`-style storage is not durable across serverless function instances. The register request can create a user in one instance/cache, while dashboard/login requests hit another instance or a later cold start that cannot see the new user.

This is an inference from observed production behavior plus the project’s own environment documentation. I did not have admin credentials to call authenticated storage-health endpoints.

### Recommended Fix

Owner/session: S19 for Vercel environment configuration, coordinated with S12 for backend/storage validation.

Immediate remediation:

1. In Vercel Production, set:
   - `HK_MATH_STORAGE_PROVIDER=postgres`
   - `POSTGRES_URL=<server-only durable Postgres connection string>`
   - Keep `AUTH_SESSION_SECRET` stable and server-only.
2. Redeploy production.
3. Run an authenticated storage health check as admin:
   - `/api/admin/storage/health`
   - Expected durable-ready provider: `postgres`.
4. Re-run the exact P1 registration smoke:
   - Register a new P1 student via UI.
   - Verify `/api/me` stays 200 after navigation and after a fresh browser context.
   - Verify `/api/dashboard?grade=P1` returns 200.
   - Verify fresh login succeeds after at least one cold-start-like delay.
5. Add a production-safe smoke test or release checklist item:
   - Register unique test student.
   - Fetch dashboard.
   - Dispose browser/context.
   - Fresh login with same credentials.
   - Delete or mark test account if admin tooling supports cleanup.

Code hardening recommendation:

- If production durable storage is missing, public registration should fail loudly with a safe 503 or a clear “registration temporarily unavailable” state instead of returning 200 and creating a non-durable account.
- The storage readiness helper already exposes this risk; use it as a guard for write endpoints in production-like environments.

## P0 Findings

No confirmed P0 outage was found in the tested student routes.

However, **SEV-P1-01 is P0-risk** if public self-registration is being used by real students/families, because new account records can be lost.

## Previous P1 Re-test

### Ended Live-Classroom Join Code

Status: Re-tested as fixed locally.

Evidence:

- Teacher login: 200.
- Student login: 200.
- Start live classroom: 201.
- Active student join by code: 200.
- Teacher ends session: 200.
- Student join with ended code: 404 `Session not found`.
- Student submit to ended session: 404.

This is no longer a confirmed P1 in the current local parity build.

## Not P0/P1 After Investigation

These failures appeared in the broad E2E run but should not be reported as product P0/P1:

- Home heading selector `/MAIS/i` is ambiguous because the page also has `TRUST-MAIS adaptive engine`.
- Registration tests use old radio selectors. The current registration UI is a stepper with button/radio-role controls; following the stepper works locally and reaches production registration response.
- `Personalized learning analytics report` text is stale; current dashboard/adaptive copy uses the newer knowledge galaxy/dashboard experience.
- Practice free-selection dropdown tests are stale; current student practice starts with an Adaptive Practice Mission and locked free practice. Pagination and Jump controls were verified on local and production.
- Lesson page “Learning Galaxy” loading text was not reproducible as a stable bug. Local and production desktop/mobile rendered `Quadratic Functions: Shape, Vertex, and Intercepts` with no page errors.
- Production mobile login UI is slower than the first short wait in the script, but it sends `POST /api/auth/login`, returns 200, and lands on `/dashboard`.

## Checks

- `npm run type-check`: passed.
- Broad Playwright student matrix:
  - Failed due to stale selectors/copy and changed flow assumptions.
  - Useful as discovery signal, not a release gate in its current form.
- `npm run build`: not rerun separately in this report-only pass. Existing production build and local production server were exercised through route/UI scans.

## Follow-up Priorities

1. Fix production durable storage for new student accounts.
2. Add a release gate for production registration persistence.
3. Refresh student E2E suites to match the current stepper registration UI, Adaptive Practice Mission lock state, and current dashboard copy.
4. After storage fix, rerun:
   - P1 registration smoke.
   - Authenticated student route scan.
   - Practice/lesson/progress/mistake-book smoke.
