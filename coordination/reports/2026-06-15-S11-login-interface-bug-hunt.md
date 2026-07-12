# 2026-06-15 S11 Login Interface Bug Hunt

## Scope

Target: local MAIS-MVP login surface at `http://127.0.0.1:3037/login`.

Session: S11 QA and release quality.

Write policy: no feature-code edits, no git operations, no real credential logging. Evidence is limited to QA notes and screenshots.

## Severity Definitions

- P0: blocks or destabilizes core login/access for normal users, or creates severe auth/data risk.
- P1: major correctness or data-integrity issue with practical user impact.
- P2: user-facing quality, resilience, or usability issue that should be fixed but is not a launch-stopping auth break by itself.

## Findings

### P0 - Login API intermittently returns HTML 404 for valid credentials

Status: confirmed.

Evidence:

- After dev server restart and `/login` warmup, 12 identical valid HK student demo login requests returned: `200, 200, 200, 404, 200, 404, 200, 200, 404, 200, 200, 404`.
- A newly registered formal S5 student showed the same class of failure: `404, 200, 200, 404, 200, 200, 200, 200, 200, 200, 200, 404`.
- The failing responses were HTML 404 pages, not JSON auth errors.
- UI evidence: `output/playwright/s11-login-qa/min-hk-student-hydrated-after-submit.png` shows a valid example account left on `/login` with the generic error `Could not log in yet. Try again in a moment.`

Impact:

- Core login is unreliable for both demo and formal accounts.
- The client cannot distinguish route-level 404 from an auth-service failure and gives a generic retry message.
- Because failures are intermittent, manual retesting can falsely pass.

Relevant code:

- `app/api/auth/login/route.ts` handles POST login.
- `components/providers/AppProviders.tsx` maps non-400/401/503 failures to `reason: "error"`.
- `app/login/page.tsx` displays the generic login error for `reason: "error"`.

Owner routing: S12 backend/API plus S22 reliability, with S11 regression coverage.

### P1 - Login can change a formal student's active grade away from their registered grade

Status: confirmed.

Evidence:

- Registered a formal student with `grade = S5`.
- Logged in with submitted login grade `S1`.
- `/api/me` then reported `user.grade = S5` but `settings.selectedGrade = S1`.

Impact:

- A fixed-grade student can enter the app with a mismatched active grade.
- Dashboard, lesson-entry, and dashboard API requests use `settings.selectedGrade`, so learning content and analytics can drift from the assigned grade.

Relevant code:

- `app/login/page.tsx` submits selected grade from the login form.
- `app/api/auth/login/route.ts` accepts request `grade` and writes it into session settings.
- `app/api/me/route.ts` uses `authenticated.settings.selectedGrade` for lesson entry.
- `app/api/dashboard/route.ts` accepts a grade query and falls back to `authenticated.settings.selectedGrade`.
- `components/dashboard/DashboardGradeSelectorGrid.tsx` currently renders grade buttons with `locked={false}`.

Owner routing: S08 shared state/types, S12 auth API, S02 dashboard follow-through, S11 regression.

### P2 - Example-account buttons are clickable before hydration but do nothing

Status: confirmed.

Evidence:

- On `domcontentloaded`, submit button was disabled.
- Clicking the `HK Student Peter` example button before hydration left `#login-identifier` empty.
- Clicking the same button after hydration filled `HK Student Peter`.

Impact:

- Fast users can click an example account and see no response.
- This is especially noticeable on slower first loads because `/login` first compile took about 31 seconds in this dirty local checkout.

Relevant code:

- `app/login/page.tsx` disables only the submit button before hydration.
- Example account buttons do not have a hydration disabled state.

Owner routing: S01/S09 for UI/accessibility polish, S11 regression.

### P2 - Demo passwords are displayed in clear text on the login page

Status: product-risk confirmed, severity depends on whether this is intentional for public demos.

Evidence:

- Login page renders each example account as `account.username / account.password`.

Impact:

- If demo teacher/student accounts are shared and stateful, public clear-text credentials invite uncontrolled use of demo workspaces.
- If these are intentionally public walkthrough accounts with isolated/reset state, this is acceptable but should be explicitly documented.

Relevant code:

- `app/login/page.tsx` example account rendering.

Owner routing: S07/S12 for demo-account policy, S09 for copy, S11 for regression once policy is decided.

## Non-Findings / Lower Risk

- Desktop 1440x1100 and mobile 390x844 hydrated layout had no horizontal overflow.
- Hydrated `/login` load showed no console errors or same-origin 4xx/5xx in the clean layout probe.
- Student access to `/teacher/dashboard` was redirected back to `/dashboard`; no confirmed teacher-workspace data exposure in this run.

## Checks Run

- `curl` route smoke for `/login`: 200.
- Playwright browser probes for desktop/mobile layout, hydration race, valid demo login, API loops, and formal-student grade mismatch.
- Existing focused E2E: `tests/e2e/app-shell-auth.spec.ts` with local dev server and no retries: 1 passed, 4 failed.

## Residual Risk

- The intermittent HTML 404 root cause is not isolated. It appears below or around App Route handling rather than normal auth validation, because identical POST payloads alternate between JSON 200 and HTML 404.
- Existing auth E2E failures include non-login selector drift; follow-up should separate stale test expectations from real auth regressions.
