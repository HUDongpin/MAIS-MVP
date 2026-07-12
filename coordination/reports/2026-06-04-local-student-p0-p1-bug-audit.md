# 2026-06-04 Local Student P0/P1 Bug Audit

- Session: S11
- Scope: local MAIS-MVP student-facing pages and student-accessible public/auth pages
- Environment: `http://127.0.0.1:3051`, `next start`, current local worktree, Asia/Hong_Kong 2026-06-04
- Write mode: QA/report only. No feature code was changed.

## Executive Summary

No confirmed P0 was found.

One confirmed P1 was found:

1. US demo student login by advertised username is blocked by a duplicate historical username record in local storage. `Student Shirleen / 12345` returns 401 even though the seeded US demo account exists and email login works.

Two important non-P1 signals were also found:

- Anonymous protected-route redirects canonicalize `127.0.0.1` to `localhost`, causing CORS console errors during RSC prefetch on public pages.
- Several existing E2E tests are stale against the current student UI and content copy; those failures should not be counted as product P0/P1 without retargeting the assertions.

## Coverage Run

- `npm run type-check`: passed.
- `npm run build`: passed; 100 app routes generated with no build-time crash.
- Student route crawl: 68 desktop/mobile checks over anonymous and authenticated student routes. No 500, blank page, pageerror, or severe mobile horizontal overflow found.
- HK lesson API sweep: 49 P1-S6 lesson slugs from `/api/roadmap`; all returned 200 with localized title/description, required lesson blocks, and practice questions.
- Practice/visualization targeted Playwright:
  - 20 passed.
  - 2 skipped.
  - 2 failed due stale local visualization lab id expectation, not a runtime page failure.
- Student registration manual UI path: passed. Four-step registration creates account and enters `/dashboard`.
- Resource assignment retest: passed. After teacher-created assignment, `/resource/resource-s3-quadratics-slides` rendered the resource and download action.

## Confirmed P1

### P1-01: Advertised US Demo Student Username Cannot Log In

Impact:

- Public copy advertises `US student (Student Shirleen / 12345)`.
- `components/providers/AppProviders.tsx` exports `demoUnitedStatesStudentAccount` with username `Student Shirleen`.
- `lib/server/userStore.ts` seeds `student-shirleen-us` with username `Student Shirleen`.
- Local login by username returns 401, blocking the advertised US student demo path and US adaptive fallback checks.
- Broader risk: historical duplicate usernames can shadow valid accounts because auth stops at the first matching username/email record.

Reproduction:

```bash
curl -i -X POST http://127.0.0.1:3051/api/auth/login \
  -H 'Content-Type: application/json' \
  --data '{"username":"Student Shirleen","password":"12345","grade":"S3","language":"en","theme":"light"}'
```

Observed:

- Response: `401 Unauthorized`
- Body: `{"error":"Invalid email/username or password."}`

Control:

```bash
curl -i -X POST http://127.0.0.1:3051/api/auth/login \
  -H 'Content-Type: application/json' \
  --data '{"username":"student.shirleen@example.edu","password":"12345","grade":"S3","language":"en","theme":"light"}'
```

Observed:

- Response: `200 OK`
- User id: `student-shirleen-us`
- Curriculum: `US_CA_MATH`

Root cause evidence:

- SQLite app state contains two users with `normalized_username: "student shirleen"`:
  - Historical user: `student-a350b106-3524-41d6-b3e7-c47d44091e3f`, profile name `XU Shirleen`, HK profile, no seed email.
  - Seeded US demo user: `student-shirleen-us`, email `student.shirleen@example.edu`, US profile.
- `authenticatedUserForCredentials()` in `lib/server/userStore.ts` uses `database.users.find(...)` and checks password only on the first match.
- `createStudentUser()` now rejects duplicate normalized usernames, but existing duplicates are not migrated or resolved by `syncDemoAccounts()`.

Recommended fix:

1. In S12 backend/auth scope, update `authenticatedUserForCredentials()` to collect all username/email matches and return the candidate whose password matches. Prefer exact email match over username match when the identifier is email-like.
2. Add a normalization migration in `normalizeDatabase()` or demo-sync path to detect duplicate `normalized_username` / `normalized_email` records and preserve reserved seeded demo accounts by id.
3. Decide what to do with conflicting historical local users:
   - For local/dev demo collisions, rename the non-seed username with a suffix such as `Student Shirleen (legacy)`; or
   - mark a blocker requiring owner approval before mutating existing local user identity.
4. Add regression tests:
   - Existing duplicate `Student Shirleen` record does not block `student-shirleen-us` username login.
   - Email login and username login both reach the same seed account.
   - Public registration still rejects new duplicate username/email.

Retest:

- `Student Shirleen / 12345` should return 200 and enter dashboard or US content-unavailable fallback.
- `student.shirleen@example.edu / 12345` should still return 200.
- `HK Student Peter / 12345` and `Mainland Student Ludwig / 12345` should remain 200.

Owner:

- Primary: S12 backend/API platform.
- Coordinate with S19 only if the chosen remediation involves local/Vercel storage reset or environment-specific seeding.

## Non-P1 Findings

### Protected-Route Redirect Host Mismatch

Evidence:

```bash
curl -i http://127.0.0.1:3051/dashboard
```

Observed:

- `307 Temporary Redirect`
- `location: http://localhost:3051/login?next=%2Fdashboard`

Impact:

- Anonymous public pages that prefetch protected links from `127.0.0.1` can log CORS errors because the redirect target switches origin to `localhost`.
- Direct page navigation still works, and authenticated student route crawl found no page breakage.

Severity:

- Not counted as P1 for this report because it did not block visible student workflows.
- Treat as P2 or P1-risk for local QA reliability if console-clean public pages are a release gate.

Fix direction:

- Build middleware redirects from the incoming `Host` / `x-forwarded-host` and protocol instead of relying on `request.nextUrl.clone()` when local Next canonicalizes to `localhost`.
- Add a middleware test that `Host: 127.0.0.1:port` redirects to the same host.

### Stale Student E2E Assertions

Observed stale checks:

- `student-smoke.spec.ts` expects direct `S2` radio selection on `/register`; current registration is a four-step carousel. Manual current-UI registration passed.
- `student-frontend.spec.ts` expects old dashboard copy `Personalized learning analytics report`.
- `visualization-values.spec.ts` expects old lab id `lab-example-capstone-hk-mainland-crosswalk-explorer`.
- Some demo-account and mistake-book expectations assume a clean shared demo state; current local DB has accumulated state.

Severity:

- QA harness issue, not product P0/P1.

Fix direction:

- Update S11-owned E2E helpers to drive the current registration stepper.
- Prefer unique test-created accounts over mutable demo accounts for mistake-book assertions.
- Refresh visualization lab selectors from current `data/visualizationLabs`.

## Student Route Crawl Summary

Authenticated student routes checked on desktop and mobile:

- `/dashboard`
- `/progress`
- `/learning-path`
- `/primary-roadmap`
- `/secondary-roadmap`
- `/lesson`
- `/lesson/quadratic-functions`
- `/lesson/polynomials`
- `/lesson/circle-properties` redirecting to `/lesson/circles`
- `/practice`
- `/mistake-book`
- `/adaptive-learning`
- `/visualization-lab`
- `/messages`
- `/classroom`
- `/classroom/join`
- `/assessment/assessment-s3-algebra-quiz`
- `/resource/resource-s3-quadratics-slides`
- `/practice/fishing-game`
- `/practice/adventure-island`
- `/practice/super-platformer-like` redirecting to `/practice/adventure-island`

Anonymous routes checked:

- `/`
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/change-password`
- Protected route redirects for `/dashboard`, `/progress`, `/mistake-book`, `/messages`, `/classroom`

Result:

- No confirmed P0/P1 route-rendering failure.
- No confirmed blank page.
- No pageerror.
- No severe mobile horizontal overflow.

## Checks Not Completed

- Full `lesson-all.spec.ts` was started but stopped after long no-output runtime. It was replaced with the 49-slug API sweep because the full browser test was not returning actionable progress.
- The broad mixed Playwright batch was stopped after a long stall; partial evidence was preserved and followed by narrower checks.

## Recommended Next Work

1. S12 fixes duplicate-username auth resolution and demo seed collision migration.
2. S11 updates stale student E2E helpers/selectors, then reruns:
   - `student-smoke.spec.ts`
   - `student-frontend.spec.ts`
   - `visualization-values.spec.ts`
3. S12/S10 optionally fix local redirect host preservation if local console-clean route crawl is required.
