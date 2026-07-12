# www.mais.hk P0/P1 Bug Audit Report

- Date: 2026-06-03
- Session: S11 QA and release quality
- Target: `https://www.mais.hk`
- Local parity target: `http://127.0.0.1:3021` from `/Users/dongpinhu/Desktop/MAIS-MVP`
- Scope: P0/P1 production and local regression audit only. No feature code was edited.

## Executive Summary

No confirmed P0 was found in the tested surface. The public site and the local production server both returned HTTP 200 for the home page, `npm run type-check` passed, `npm run build` passed, and broad route/API smoke checks did not find a blank app, global 500, or total login outage.

Two confirmed P1 bugs were found:

1. **P1-01: Production teacher and parent pages throw React hydration error #418 on first load.**
   Authenticated teacher and parent routes render with server/client text mismatches, likely caused by timezone-dependent `Intl.DateTimeFormat` output during SSR/hydration. This affects the core teacher console and parent console.
2. **P1-02: Ended live-classroom join codes remain readable by students.**
   After a teacher ends a live session, enrolled students can still fetch the session by join code. Submitting is blocked, but the closed classroom prompt/session remains discoverable.

## Severity Rubric

- **P0:** Site-wide outage, data loss/corruption, account/session security failure, payment/production infrastructure failure, or a blocker that prevents all users from using the product.
- **P1:** Core user workflow broken or materially unreliable for a major persona; significant security/privacy exposure; serious production-only runtime error; or high-confidence regression in a release-critical workflow.
- **P2+:** Important issue, stale test, performance risk, configuration warning, or degraded experience that does not currently block a core P0/P1 workflow.

## Coverage Performed

- Verified production home page: `https://www.mais.hk` returned HTTP 200 from Vercel HIT at 2026-06-03 22:50 HKT.
- Verified local production server: `http://127.0.0.1:3021/` returned HTTP 200.
- Ran current quality gates during this audit:
  - `npm run type-check`: passed.
  - `npm run build`: passed.
- Ran broad route crawl across local/prod, desktop/mobile, and key app routes. No global HTTP 500, unexpected 404, blank page, or ChunkLoadError was found in the route matrix.
- Ran API smoke checks on representative public/protected endpoints:
  - `/api/me`: anonymous 401 on prod/local, expected.
  - `/api/questions?grade=S3`: 200 on prod/local.
  - `/api/questions?grade=invalid`: 400 on prod/local.
  - `/api/admin/storage/health`: anonymous 401 on prod/local, expected protection.
  - `/api/ai-tutor/status`: 200 on prod/local, but production text tutor status differs from local; see watchlist.
- Ran local and production demo login flows for student, teacher, and parent accounts.
- Ran targeted Playwright suites locally:
  - `tests/e2e/app-shell-auth.spec.ts`
  - `tests/e2e/home-functional.spec.ts`
  - `tests/e2e/student-smoke.spec.ts`
  - `tests/e2e/backend-api.spec.ts`
  - `tests/e2e/teacher-console-api-stress.spec.ts`

## P1-01: Production Teacher/Parent Hydration Errors

### Status

Confirmed P1.

### Impact

Logged-in teacher and parent routes throw production React hydration error `#418` on first load. The affected pages returned HTTP 200 and were not blank in the observed runs, so this is not a P0. It is still P1 because the error occurs on first-load hydration for the two operational consoles that teachers and parents rely on.

Hydration errors can cause React to discard server-rendered content and rerender parts of the page. That creates risk for unstable first paint, broken event binding, inconsistent UI state, and poor production reliability.

### Reproduction

Use a browser context with `timezoneId: "Asia/Hong_Kong"` and login to production demo accounts.

Teacher:

1. POST `/api/auth/login` with `HK Teacher Chan` / demo password.
2. Visit `/teacher`, `/teacher/reports`, `/teacher/rewards`, `/teacher/classes/class-s3a-2026`.
3. Observe one `pageerror` per route:
   `Minified React error #418`.

Parent:

1. POST `/api/auth/login` with `Peter's Parent` / demo password.
2. Visit `/parent`, `/parent/reports`, `/parent/children/student-peter`.
3. Observe one `pageerror` per route:
   `Minified React error #418`.

Latest confirmation in this session:

- Teacher login status: 200; `/api/me`: 200.
- Teacher route errors: 4 total React #418 errors across 4 tested teacher routes.
- Parent login status: 200; `/api/me`: 200.
- Parent route errors: 3 total React #418 errors across 3 tested parent routes.

### Evidence

Relevant source:

- `components/teacher/TeacherDashboardView.tsx:12` formats SSR-rendered timestamps with `new Intl.DateTimeFormat(...)` and no fixed `timeZone`.
- `components/teacher/TeacherDashboardView.tsx:157` renders `dashboard.generatedAt`.
- `components/parent/ParentViews.tsx:24` formats SSR-rendered timestamps with `new Intl.DateTimeFormat(...)` and no fixed `timeZone`.
- `components/parent/ParentViews.tsx:153`, `:225`, and `:242` render these formatted timestamps.

Observed production mismatch during the audit:

- Server-rendered production teacher/parent HTML showed `3 Jun, 02:21 pm`.
- Hydrated Hong Kong browser text showed `3 Jun, 10:21 pm`.
- The 8-hour difference matches UTC server rendering versus Asia/Hong_Kong browser rendering.

Additional similar risk locations found by code search:

- `components/teacher/TeacherRewardsView.tsx`
- `components/teacher/TeacherReportsView.tsx`
- `components/teacher/TeacherFoundationViews.tsx`
- `components/teacher/TeacherManagementViews.tsx`
- `components/teacher/TeacherResourceAssessmentViews.tsx`
- `components/dashboard/DashboardProgressDetails.tsx`
- `components/dashboard/StudentRewardsPanel.tsx`
- `components/dashboard/AdaptiveLearningContent.tsx`
- `components/dashboard/AdaptiveKnowledgeGalaxy.tsx`
- `components/dashboard/LearningAnalyticsReport.tsx`

Not every location was proven P1 in production, but they share the same timezone-sensitive SSR/client formatting pattern.

### Likely Root Cause

The page renders timestamp text during SSR and again during client hydration. `Intl.DateTimeFormat` uses the runtime's default timezone when `timeZone` is omitted. Vercel server output appears to be UTC, while the browser in Hong Kong renders Asia/Hong_Kong time. React sees different text and emits hydration error `#418`.

### Recommended Fix

Owner/session: S13 for teacher console, S14 for parent console, with S12/S08 coordination if a shared helper is introduced.

Recommended implementation:

1. Create or reuse a deterministic date formatter for SSR-rendered UI text.
2. Pass an explicit timezone, likely `timeZone: "Asia/Hong_Kong"`, for MAIS Hong Kong operational dashboards.
3. Apply it to teacher/parent dashboard/report/reward/management timestamp renderers and any dashboard components that SSR timestamp text.
4. Avoid `suppressHydrationWarning` as the main fix; it would hide the symptom but keep inconsistent user-visible text.
5. Add a regression test that loads teacher and parent routes with `timezoneId: "Asia/Hong_Kong"` and asserts `pageerror` remains empty.

Example direction:

```ts
new Intl.DateTimeFormat(localeForLanguage(language), {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Hong_Kong"
}).format(new Date(value));
```

If the product later supports region-specific teacher/parent schools, use the school or curriculum profile timezone explicitly instead of relying on host/browser defaults.

## P1-02: Ended Live-Classroom Join Codes Remain Readable

### Status

Confirmed P1.

### Impact

When a teacher ends a live classroom session, the join code should no longer be valid for students. The local stress test shows a student can still fetch the ended session by join code. Submitting answers is blocked, so this is not a P0, but it is still P1 because it breaks the core live-classroom lifecycle and exposes closed session content/status to enrolled students.

### Reproduction

Local targeted test:

```bash
env PLAYWRIGHT_SKIP_WEBSERVER=1 \
  PLAYWRIGHT_BASE_URL=http://127.0.0.1:3021 \
  PLAYWRIGHT_BROWSER_CHANNEL=chrome \
  HK_MATH_DB_PATH="$PWD/.tmp/s11-p0-p1-qa.sqlite" \
  npx playwright test tests/e2e/teacher-console-api-stress.spec.ts \
  --project=desktop-chrome --reporter=list
```

Observed result:

- The suite ran 2 tests: 1 passed, 1 failed.
- Failure: `Ended live join code should no longer be valid for students`.
- Expected status after teacher ended the session: 404.
- Actual student `GET /api/classroom/live?code=...`: 200.

### Evidence

Relevant source:

- `app/api/teacher/live/route.ts:56` handles teacher `PATCH` to end a live session.
- `lib/server/userStore.ts:11180` `endTeacherLiveSession` sets `session.status = "ended"` and `ended_at = now`.
- `app/api/classroom/live/route.ts:15` routes student requests to `getClassroomLiveSessionForStudent`.
- `lib/server/userStore.ts:11205` finds a session by join code only:
  `database.teacher_live_sessions.find((candidate) => candidate.join_code.toUpperCase() === normalizedCode)`.
- `lib/server/userStore.ts:11216` returns the session to the student without checking that `session.status === "active"`.
- `lib/server/userStore.ts:11251` correctly blocks submissions unless `session.status === "active"`.

### Likely Root Cause

The read path and write path have different lifecycle checks:

- Student submit path: requires active session.
- Student fetch path: does not require active session.

This leaves ended sessions readable even though they are no longer actionable.

### Recommended Fix

Owner/session: S12 backend/API platform, with S13 teacher-console coordination for intended teacher preview behavior.

Recommended implementation:

1. In `getClassroomLiveSessionForStudent`, require `candidate.status === "active"` when resolving a join code, or return `null` immediately if the matched session is not active.
2. Consider also checking `ended_at === null` for defense in depth.
3. Keep teacher preview behavior separate. Teachers may reasonably need to inspect ended sessions, but students should not join them.
4. Optionally make `toClassroomLiveSession.canSubmit` status-aware:
   `viewerMode === "student" && teacherSession.status === "active" && !response`.
5. Add or update the existing stress test so the ended-session GET regression is permanently covered.

Minimal fix direction:

```ts
const session = database.teacher_live_sessions.find(
  (candidate) =>
    candidate.join_code.toUpperCase() === normalizedCode &&
    candidate.status === "active" &&
    candidate.ended_at === null
);
```

## P0 Findings

No confirmed P0 was found.

The audit did not find:

- Site-wide outage.
- Home page HTTP failure.
- Global login API outage.
- Global route matrix 500/blank app failure.
- Build or type-check failure.
- Anonymous access to `/api/me` or admin storage health.
- Student answer submission allowed after an ended live session.

## Important Watchlist, Not Classified As P0/P1

### Production AI Tutor Text Provider Not Configured

Production `/api/ai-tutor/status` returned text tutor `configured: false` and `mode: "local-helper"`, while local returned live text configuration. Image and voice status reported configured on production.

This may be intentional fallback behavior. If live text tutoring is expected in production, S07/S19 should verify Vercel environment variables and provider readiness. I did not call a live LLM provider during this audit.

### Admin Storage Durability Unverified

`/api/admin/storage/health` returns 401 anonymously on prod/local, which is expected. I could not verify durable production storage without admin credentials. S12/S19 should run an authenticated storage health check before a release gate.

### Existing E2E Test Staleness

Several local Playwright failures appear to be stale test expectations rather than P1 product bugs:

- Registration tests click grade controls before the current carousel reaches the grade step.
- Parent registration test expects parent as default role, while current UI defaults to student.
- Home page tests expect old copy.
- Backend API tests expect login-time grade/curriculum switching, while current login code locks registered student grade/curriculum.

Recommended owner: S11 should refresh these tests after product owners confirm the current intended UX.

### Large Route Bundles

The production build succeeded, but several routes have very large first-load JS sizes, including learning path, visualization lab, primary roadmap, and lesson surfaces. This is a performance risk, not a confirmed P1 outage. It should be handled as a performance optimization track.

### Expected Console Noise

The broad route crawl saw expected 401s for protected anonymous data calls, `_rsc` aborts during navigation, and redirect aborts on game-like practice routes. These were not classified as P1 because they did not produce blank pages, unexpected HTTP failures, or core workflow breakage in the observed runs.

## Recommended Fix Order

1. **Fix P1-01 first** because it affects production first-load reliability for teacher and parent consoles.
2. **Fix P1-02 next** because it is a clear backend lifecycle contract bug with an existing failing test.
3. Run a targeted release gate:
   - `npm run type-check`
   - `npm run build`
   - Teacher/parent hydration Playwright check with `timezoneId: "Asia/Hong_Kong"`.
   - `tests/e2e/teacher-console-api-stress.spec.ts`
4. After P1 fixes, clean up stale S11 tests so future failures are actionable.
5. Ask S07/S19 to confirm whether production AI Tutor text fallback is intentional.
6. Ask S12/S19 to run authenticated production storage health verification.

## Commands And Artifacts

Key commands used during the audit:

```bash
npm run type-check
npm run build
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3021 PLAYWRIGHT_BROWSER_CHANNEL=chrome npx playwright test tests/e2e/app-shell-auth.spec.ts tests/e2e/home-functional.spec.ts tests/e2e/student-smoke.spec.ts --project=desktop-chrome --reporter=list
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3021 PLAYWRIGHT_BROWSER_CHANNEL=chrome npx playwright test tests/e2e/backend-api.spec.ts --project=desktop-chrome --reporter=list
env PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3021 PLAYWRIGHT_BROWSER_CHANNEL=chrome HK_MATH_DB_PATH="$PWD/.tmp/s11-p0-p1-qa.sqlite" npx playwright test tests/e2e/teacher-console-api-stress.spec.ts --project=desktop-chrome --reporter=list
curl -I -L --max-time 20 https://www.mais.hk
curl -sS -o /dev/null -w '%{http_code} %{url_effective}\n' --max-time 10 http://127.0.0.1:3021/
```

Route crawl artifact:

- `/tmp/mais-route-crawl-fast.json`

Final S11 handoff:

- `coordination/session-logs/2026-06-03-S11.md`
