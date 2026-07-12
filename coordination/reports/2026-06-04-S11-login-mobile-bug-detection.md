# 2026-06-04 S11 Login Page Mobile Bug Detection

- Session: S11 QA and release quality
- Scope: mobile `/login` page functional/UI bug detection on current local worktree
- Primary code reviewed: `app/login/page.tsx`
- Browser evidence:
  - Current page probe: `output/playwright/2026-06-04-S11-login-mobile/3187-current-login-initial.png`
  - Current 320-width probe: `output/playwright/2026-06-04-S11-login-mobile/3187-current-320-width-probe.png`
  - Current progress redirect probe: `output/playwright/2026-06-04-S11-login-mobile/3187-current-next-progress.png`
  - Controlled invalid-login probe: `output/playwright/2026-06-04-S11-login-mobile/3187-controlled-invalid-login-success.png`
  - Controlled HK student login probe: `output/playwright/2026-06-04-S11-login-mobile/3187-controlled-hk-student-login.png`
  - Matrix JSON: `output/playwright/2026-06-04-S11-login-mobile/login-mobile-audit-results-3001.json`
  - Current page JSON: `output/playwright/2026-06-04-S11-login-mobile/login-mobile-current-3187-results.json`
  - Recheck JSON: `output/playwright/2026-06-04-S11-login-mobile/current-3187-recheck.json`
  - Controlled invalid-login JSON: `output/playwright/2026-06-04-S11-login-mobile/3187-controlled-invalid-login-success.json`

## Post-Fix Remediation Update

- Execution session: S01, with Dr. Peter Hu approval to execute the S01/S07/S09 recommendations from this report.
- Fixed files:
  - `app/layout.tsx`
  - `app/login/page.tsx`
  - `components/layout/Navbar.tsx`
  - `components/ui/LanguageToggle.tsx`
  - `components/ui/ThemeToggle.tsx`
  - `components/ai/AITutorProvider.tsx`
  - `lib/i18n.ts`
- Post-fix evidence:
  - Remediation JSON: `output/playwright/2026-06-04-S01-login-mobile-remediation/login-mobile-remediation-results.json`
  - Final width/touch-target JSON: `output/playwright/2026-06-04-S01-login-mobile-remediation/post-logo-hitbox-width-results.json`
  - Landscape width/touch-target JSON: `output/playwright/2026-06-04-S01-login-mobile-remediation/post-fix-landscape-667x375.json`
  - Invalid-login targeted JSON: `output/playwright/2026-06-04-S01-login-mobile-remediation/invalid-login-targeted.json`
  - Screenshots: `output/playwright/2026-06-04-S01-login-mobile-remediation/`
- Post-fix result on local server `127.0.0.1:3411`:
  - 320px, 360px, 393px, and 667x375 landscape mobile widths now report `scrollWidth === clientWidth`.
  - Header/form target scan now reports `smallTargets: []`.
  - Username/password inputs now include stable `id`/`name` fields, and the username field disables autocorrect/spellcheck.
  - Invalid credentials return `401` and show `Check your email/username and password.`
  - Mainland student example login reaches `/dashboard`.
  - Mainland teacher example login reaches `/teacher`.
  - External `next=https://...` and protocol-relative `next=//...` stay on local workspace routes and resolve to `/dashboard`.
  - `npm run type-check` passed after remediation.

## Executive Summary

No confirmed P0 login-page outage was found. API-level demo login returned `200` for `HK Student Peter / 12345` on both probed local servers.

Post-fix status: the confirmed mobile layout, touch-target, input-attribute, and loading-copy findings listed below have been remediated in the current local worktree and passed targeted mobile retest.

Original confirmed mobile UI bugs before remediation were:

1. P1/P2: 320px and 360px mobile widths have horizontal overflow.
2. P2: login and shell controls expose touch targets below the 44px mobile target baseline.
3. P2: login inputs omit `name`; username input also omits `type`, `inputMode`, and `spellCheck={false}`, weakening mobile keyboard, autofill, and password-manager behavior.
4. P3: login loading copy uses `...` instead of `…`.

Functional login basics passed on the current `3187` build when controlled directly: invalid credentials produced a `401` plus inline error, and `HK Student Peter / 12345` navigated to `/dashboard`. The originally inconclusive example-account and external-`next` permutations were later re-run during the S01 remediation pass and passed on `127.0.0.1:3411`.

## Findings

### P1/P2 - 320/360px Mobile Login Page Horizontally Scrolls

- Evidence:
  - Current `3187` width probe:
    - 320px viewport: `documentElement.clientWidth=320`, `documentElement.scrollWidth=365`, `body.scrollWidth=365`
    - 360px viewport: `documentElement.clientWidth=360`, `documentElement.scrollWidth=366`, `body.scrollWidth=365`
    - 393px viewport: no overflow, `393/393`
  - Legacy/full matrix reproduced the same overflow on `3001` across English, Traditional Chinese, and Simplified Chinese at 320px and 360px.
- Visible impact: narrow phones can pan sideways. This is most noticeable around the sticky header and floating AI Tutor button.
- Top overflow offenders from current 320px probe:
  - `components/background/AnimatedMathBackground.tsx:14` fixed background measures 365px wide after layout overflow.
  - `components/layout/Navbar.tsx:214` mobile menu button sits beyond the 320px right edge.
  - `components/ai/AITutorProvider.tsx:1963` fixed AI Tutor launcher extends past the 320px viewport.
- Suggested owner: S01 for shell/navbar/background layout; S07 for AI Tutor launcher if it remains a contributor.
- Suggested fix direction: add a mobile-safe shell constraint such as `overflow-x-hidden` at the page/root level, then reduce or wrap the header control group at 320px so the source of overflow is removed rather than only clipped.

### P2 - Several Login-Visible Touch Targets Are Under 44px

- Evidence: mobile matrix reported repeated targets below 44px:
  - `components/ui/LanguageToggle.tsx:33`: language buttons rendered about `48-50 x 32`.
  - `components/ui/ThemeToggle.tsx:16`: theme toggle rendered `40 x 40`.
  - `components/layout/Navbar.tsx:219`: mobile menu toggle rendered `40 x 40`.
  - `app/login/page.tsx:459`: "Forgot password?" link rendered about `129 x 24` in English, `76-77 x 24` in Chinese.
  - Register link in Chinese rendered about `141-145 x 25`.
- Impact: harder tapping on small phones, especially around login recovery and language/theme controls.
- Suggested owner: S01 for shell toggles, S09/S01 for login copy/accessibility touch-target treatment.
- Suggested fix direction: increase mobile hit-boxes with `min-h-11`, larger vertical padding, or wrapping the forgot/register links in a taller inline-flex target.

### P2 - Login Inputs Miss Mobile/Auth Field Attributes

- Source:
  - `app/login/page.tsx:445-451`
  - `app/login/page.tsx:463-471`
- Runtime evidence from current 3187 probe:
  - Username input: `type="text"` default, `name=""`, `autocomplete="username"`, no `inputmode`, no `spellcheck`.
  - Password input: `type="password"`, `name=""`, `autocomplete="current-password"`.
- Impact: mobile keyboards may not optimize for email/username entry; password managers and form analytics lose stable `name` fields; spellcheck/autocorrect may interfere with usernames.
- Suggested fix direction:
  - username: `id="login-identifier"`, `name="username"`, `type="text"` or `type="email"` plus `inputMode="email"` if email-first, `spellCheck={false}`, label `htmlFor`.
  - password: `name="password"`, keep `type="password"` and `autoComplete="current-password"`.

### P3 - Loading Copy Uses Three Periods

- Source: `lib/i18n.ts:703`
- Current copy: `Signing in...`, `正在登入...`
- Impact: polish/accessibility consistency issue; Web Interface Guidelines prefer the ellipsis character for loading states.
- Suggested fix: `Signing in…`, `正在登入…`.

## Functional Checks

### Passed / Supported By Evidence

- `/login` renders on current local server `3187` with current example-account panel visible.
- Empty-submit native required validation focuses the first required field.
- `/progress` protected route redirects through login and reached `/progress` after API-backed login in the current 3187 probe.
- Controlled invalid-credentials UI submission on current `3187` sent `POST /api/auth/login`, received `401`, and displayed `Check your email/username and password.`
- Controlled HK student UI login on current `3187` with `HK Student Peter / 12345` received `200` and reached `/dashboard`.
- Direct API login succeeded:
  - `POST http://127.0.0.1:3187/api/auth/login` with `HK Student Peter / 12345`: `200`
  - `POST http://127.0.0.1:3001/api/auth/login` with `HK Student Peter / 12345`: `200`
- Source review shows external `next` targets are guarded by `safeWorkspaceTarget`, which accepts only same-origin relative paths and rejects `//...`.

### Previously Inconclusive / Now Re-Tested

- During the original audit, some UI permutations on reused dev servers remained worth re-testing:
  - `3001` served an older login page without current example-account buttons.
  - `3187` served the current page, but repeated Playwright submissions sometimes ran before hydration/state updates settled for example-button and malicious-`next` permutations.
  - Controlled invalid and HK student direct-fill submissions passed, so this is not currently a confirmed auth/backend failure.
- Post-fix re-test on `127.0.0.1:3411` completed:
  - Mainland student example fill and dashboard navigation: passed.
  - Mainland teacher example fill and teacher navigation: passed.
  - external `next=https://...` and `next=//...` sanitization: passed, stayed local and resolved to `/dashboard`.

## Checks Run

- `git status --short`: many pre-existing owner/session changes present.
- `command -v npx`: available.
- Source review of `app/login/page.tsx`, `components/providers/AppProviders.tsx`, auth routes, nav/toggle/background components, and existing auth E2E.
- Browser probes:
  - 15-view matrix on available local server `3001` across 320/360/393/430/landscape and `en`/`zh`/`zh-Hans`.
  - Current source probes on local server `3187`, including 320/360/393 width checks and `/progress` redirect.
  - Controlled current-source UI submissions on `3187` for invalid credentials and HK student happy path.
  - Direct API login checks on `3001` and `3187`.
- Post-fix remediation checks:
  - `npm run type-check`: passed.
  - Playwright mobile retest on local server `3411`: 320/360/393 portrait width, 667x375 landscape width, touch targets, invalid login, Mainland student example login, Mainland teacher example login, and malicious `next` sanitization passed.

## Checks Not Run

- Original audit: `npm run type-check` was not run because the first pass was report/testing-only with no app source edits. Post-fix remediation later ran `npm run type-check`: passed.
- Not run: `npm run build`; current worktree has many concurrent changes, and this audit focused on mobile browser QA/reporting.
- Original audit: clean isolated Playwright webServer run was not completed because ad hoc `NEXT_DIST_DIR` dev-server attempts caused Next to touch `tsconfig.json`; those accidental edits were reverted to the pre-audit observed state. Post-fix remediation used a fresh local dev server on port `3411`.

## Handoff

- Report owner: S11.
- Fix status:
  - S01 executed shell/nav/login-page mobile remediation.
  - S07-scoped AI Tutor launcher adjustment was included as a narrow launcher positioning/width fix.
  - S09-scoped copy/form-accessibility polish was included for login input attributes and loading text.
- Retest coverage completed after fixes:
  - 320px, 360px, 393px mobile portrait and 667x375 landscape.
  - `document.documentElement.scrollWidth <= clientWidth`.
  - touch targets at least 44px high/wide where practical.
  - UI login happy paths and invalid login on a clean isolated server.
