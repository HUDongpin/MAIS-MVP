# MAIS-MVP Mobile Registration Page Bug Detection

- Date: 2026-06-04
- Session: S11 QA and release quality
- Target: `https://www.mais.hk/register`
- Scope: Mobile functional and UI bug detection for the registration page. No feature code was edited.

## Executive Summary

Production mobile registration has one release-critical onboarding defect:

1. **P1: Student and parent registration return 200 but the created account/session is not durable.**
   - Student registration reaches `/dashboard`, then `/api/dashboard`, later `/api/me`, and fresh login all return 401.
   - Parent registration returns 200 but lands on `/login?next=/parent` instead of a usable parent connection flow, and later login returns 401.

Two confirmed mobile UI defects were also found:

1. **P2: 320px phone width clips the hamburger menu offscreen.**
2. **P2: Landscape mobile AI Tutor floating button overlaps the `DSE UP` registration summary chip.**

One accessibility defect was found:

1. **P3: Custom account-type radio group does not support ArrowRight keyboard selection.**

## Coverage

- Viewports:
  - 320x568 iPhone SE-style narrow phone
  - 360x740 narrow phone
  - 390x844 iPhone 12-style phone
  - 412x915 Pixel-style phone
  - 667x375 mobile landscape
- Flows:
  - Student registration path: account type -> grade -> curriculum -> details -> submit.
  - Parent registration path: account type -> details -> submit.
  - Required-field validation.
  - Invalid email validation.
  - Short password validation.
  - Password mismatch validation.
  - Simplified Chinese copy smoke.
  - Keyboard radio behavior.
- Evidence screenshots:
  - `output/playwright/register-mobile-production-2026-06-04/targeted-320-initial-stable.png`
  - `output/playwright/register-mobile-production-2026-06-04/targeted-landscape-initial-stable.png`
  - `output/playwright/register-mobile-production-2026-06-04/targeted-student-production-before-submit.png`
  - `output/playwright/register-mobile-production-2026-06-04/targeted-parent-production-before-submit.png`

## Findings

### P1: Production Student Registration Is Not Durable

Status: Confirmed on production mobile.

Reproduction:

1. Open `https://www.mais.hk/register` at 390x844 mobile viewport.
2. Select individual student.
3. Select `P1`.
4. Keep default HKSAR/DSE UP curriculum.
5. Fill a unique `example.test` student account.
6. Submit.
7. Observe `/api/auth/register` returns 200 and page reaches `/dashboard`.
8. Query `/api/dashboard?grade=P1`, later `/api/me`, and fresh login.

Evidence from this run:

- Test student: `s11-mobile-student-1780540546836-g4cx3@example.test`
- `POST /api/auth/register`: 200
- Final page URL: `https://www.mais.hk/dashboard`
- `GET /api/dashboard?grade=P1`: 401
- Immediate/later `GET /api/me?includeLessonEntry=false`: 401
- Fresh `POST /api/auth/login`: 401

Impact:

- New student onboarding appears successful, but the user cannot reliably use or reuse the account.
- Treat as P1 and P0-risk if real families/students are self-registering today.

Likely owner and fix direction:

- S19: verify Vercel durable storage/session environment configuration.
- S12: validate auth/register storage contract and add production write-read readiness guardrails.
- This matches the earlier S11 production student P1 storage finding; current test confirms the issue on the mobile registration page.

Relevant code path:

- `app/register/page.tsx:298` calls `register(...)`; `app/register/page.tsx:310` redirects to `/dashboard` or `/parent/connect` on `result.ok`.
- `components/providers/AppProviders.tsx:707` posts to `/api/auth/register` and applies the returned session.
- `app/api/auth/register/route.ts:42` creates parent users; `app/api/auth/register/route.ts:82` creates student users; `app/api/auth/register/route.ts:101` sets the student session cookie.

### P1: Production Parent Registration Is Not Durable

Status: Confirmed on production mobile.

Reproduction:

1. Open `https://www.mais.hk/register` at 390x844 mobile viewport.
2. Select parent.
3. Fill parent name, email, password, and confirm password.
4. Submit.

Evidence from this run:

- Test parent: `s11-mobile-parent-1780540546836-g4cx3@example.test`
- `POST /api/auth/register`: 200
- Expected usable route: `/parent/connect`
- Observed final URL after submit: `https://www.mais.hk/login?next=/parent`
- Later `GET /api/me?includeLessonEntry=false`: 401
- Later `POST /api/auth/login` with the same parent email/password: 401

Impact:

- Parent onboarding is also broken; families cannot complete child connection after public registration.

Likely owner and fix direction:

- Same as student registration: S19 for production environment parity, S12 for auth/storage behavior and readiness guardrails.

### P2: 320px Mobile Header Clips the Hamburger Menu

Status: Confirmed on production mobile.

Evidence:

- Viewport: 320x568
- `documentElement.clientWidth`: 320
- `documentElement.scrollWidth`: 365
- Hamburger button rect: left 325, right 365, width 40, not in viewport.
- Screenshot: `output/playwright/register-mobile-production-2026-06-04/targeted-320-initial-stable.png`

Impact:

- On narrow phones, the mobile menu is inaccessible without horizontal scrolling.
- This affects registration page navigation and likely any page sharing the same header layout.

Likely owner:

- S01 for app shell/header layout.

Recommended fix direction:

- Reduce mobile header horizontal footprint at <= 320px.
- Collapse or shrink language controls, hide the `MAIS` wordmark, or move controls into the hamburger menu at the smallest breakpoint.
- Add a 320px header overflow regression check.

### P2: Landscape AI Tutor Floating Button Overlaps Registration Chips

Status: Confirmed on production mobile landscape.

Evidence:

- Viewport: 667x375
- AI Tutor button rect: left 499, right 647, top 297, bottom 355.
- `DSE UP` chip rect: left 437.8, right 517.6, top 302, bottom 336.
- These rectangles intersect.
- Screenshot: `output/playwright/register-mobile-production-2026-06-04/targeted-landscape-initial-stable.png`

Impact:

- The floating assistant occludes registration summary content on landscape phones.
- It can also interfere with tapping content near the lower-right edge.

Likely owner:

- S01/S07 coordination, depending on whether the floating AI Tutor placement is owned globally or by the page shell.

Recommended fix direction:

- For short landscape mobile viewports, reduce to icon-only, move the control below content after scroll, or add collision-aware placement.

### P3: Account-Type Radio Group Lacks Arrow-Key Behavior

Status: Confirmed on production mobile/keyboard simulation.

Evidence:

- Focused `Individual student` custom radio.
- Pressed `ArrowRight`.
- `Parent` `aria-checked` remained `false`.

Impact:

- The component advertises `role="radio"`/`radiogroup` semantics but does not implement expected radio keyboard behavior.
- Tab/Enter interaction remains possible, so this is accessibility P3 rather than functional blocker.

Likely owner:

- S09 for accessibility remediation, coordinated with S01 for register UI implementation.

Recommended fix direction:

- Use native radio inputs styled as cards, or implement roving tabindex plus ArrowLeft/ArrowRight/ArrowUp/ArrowDown behavior.

## Passed Checks

- Empty required fields did not send `/api/auth/register`; native validity showed `valueMissing=true` for all required details inputs.
- Invalid email did not send `/api/auth/register`; native validity showed `typeMismatch=true`.
- Short password did not send `/api/auth/register`; native validity showed `tooShort=true`, `minLength=5`.
- Password mismatch did not send `/api/auth/register`; visible status message appeared: `Passwords must match before registration can continue.`
- Simplified Chinese production copy smoke did not reproduce Traditional Chinese residue for the checked registration field labels/buttons.
- 360x740, 390x844, and 412x915 portrait widths did not show full-page horizontal overflow.

## Harness Notes

- Local `npm run dev` on shared `.next` became unstable during multi-viewport automation:
  - Missing `.next/server/app/register/page/app-build-manifest.json`
  - Missing `.next/static/development/_buildManifest.js.tmp...`
- An isolated `next dev` attempt was stopped because Next auto-added test distDir includes to root `tsconfig.json`.
- Root `tsconfig.json` was restored to the include list observed before this audit continued.
- These harness issues are not counted as registration page product bugs, but S22/S10 may want to investigate dev-server isolation for future overnight mobile sweeps.

## Checks Not Run

- `npm run type-check`: not run because final deliverable is report-only and no feature code was intentionally changed.
- `npm run build`: not run because the local harness showed config churn risk, while production Playwright evidence was sufficient for this registration page audit.

## Recommended Retest After Fix

1. Register a unique mobile student account.
2. Verify `/dashboard` loads and `/api/dashboard?grade=P1` returns 200.
3. Wait at least 3 seconds, then verify `/api/me` remains 200.
4. Open a fresh browser context and verify login succeeds.
5. Register a unique parent account.
6. Verify `/parent/connect` opens without redirecting to login.
7. Fresh login with the parent email/password succeeds.
8. Re-run 320px and landscape layout checks.
