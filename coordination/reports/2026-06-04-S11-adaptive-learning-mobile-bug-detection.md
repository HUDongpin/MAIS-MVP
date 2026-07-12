# S11 Adaptive Learning Mobile Bug Detection

- Date: 2026-06-04
- Session: S11 QA and release quality
- Scope: Mobile functional/UI bug detection for `/adaptive-learning`
- Tested target: local `http://127.0.0.1:3031/adaptive-learning`
- Feature code changes: none
- Evidence: `output/playwright/2026-06-04-S11-adaptive-learning-mobile/`

## Executive Summary

S11 ran a mobile Adaptive Learning page audit across guest, authenticated HK student, Traditional/Simplified Chinese, dark mode, landscape, mobile navigation, forced API failure, and attempted US/no-content states.

No body-level horizontal overflow or React page errors were found in the successful HK logged-in Adaptive Learning renders. The page can render the Knowledge Galaxy, details panels, assignment bay, analytics bay, route support, progress archive, Chinese copy, and dark mode on mobile.

Three high-impact issues were found:

1. P1 current-tree blocker: during the audit, authenticated Adaptive Learning repeatedly degraded to the guest page because `/api/auth/login`, `/api/me`, `/api/ai-tutor/status`, and icon routes returned 500 during dev compilation. Evidence showed transient/current-tree compile errors in `lib/server/userStore.ts` and `data/topics.ts`. `npm run type-check` later passed, so this is recorded as a current workspace/dev-build stability blocker rather than a confirmed Adaptive page implementation defect.
2. P1 page defect: if `/api/adaptive-learning/next` fails, the page silently shows the normal "no current route / complete practice" empty-state instead of an adaptive-service error. This misleads students and hides a recommendation outage.
3. P1 candidate mobile nav defect: on the narrowest phone scenario, tapping "Open mobile menu" timed out because the ThemeToggle moon icon intercepted pointer events.

## Coverage

Viewports:

- 320x568 small phone
- 375x667 phone
- 390x844 phone
- 414x896 large phone
- 667x375 landscape

Scenarios:

- Guest `/adaptive-learning`
- HK demo student `/adaptive-learning`
- HK demo student, Chinese Simplified, dark mode, details panels open
- Mobile nav link from Home to Adaptive Learning
- Forced `/api/adaptive-learning/next` 500
- Forced `/api/dashboard` 500
- Attempted US_CA_MATH registered student no-content state

Artifacts:

- JSON result matrix: `output/playwright/2026-06-04-S11-adaptive-learning-mobile/adaptive-learning-mobile-results.json`
- Screenshots include:
  - `guest-iphone-se-320x568.png`
  - `hk-student-landscape-667x375.png`
  - `adaptive-api-500-hk-student-375x667.png`
  - `dashboard-api-500-hk-student-375x667.png`
  - `zh-hans-dark-hk-student-375x667.png`

## Findings

### P1: Authenticated Adaptive Page Can Fall Back To Guest During Current-Tree API 500s

Severity: P1 current-tree/release-confidence blocker.

Evidence:

- In portrait HK student scenarios, the login API returned 500 and the page rendered `Log in to view adaptive recommendations`.
- The dev-server log showed `the name submissionAttemptsFor is defined multiple times` in `lib/server/userStore.ts` while compiling `/api/auth/login` and `/api/me`.
- Later, `/api/me` returned 500 with a `data/topics.ts` import error for `mainlandBnuJuniorTopics`.
- After hot compilation settled, HK landscape and Chinese/dark logged-in scenarios did render the Knowledge Galaxy.
- `npm run type-check` passed, which lowers confidence that this is a stable source-level TypeScript error.

Impact:

- A mobile student can be authenticated at the API layer but see the guest Adaptive Learning page if `/api/me` fails during current-tree instability.
- The page has no visible distinction between "not logged in" and "auth/session API failed."

Observed root-cause candidates:

- Current workspace has active concurrent changes in shared server/content files.
- Dev/Turbopack hot compilation reported stale or transient errors not reproduced by `tsc`.
- `/api/me` failure causes `AppProviders` to clear or fail to establish `currentUser`, so `AdaptiveLearningContent` renders its guest branch at `components/dashboard/AdaptiveLearningContent.tsx:498`.

Suggested owner routing:

- S12 for `/api/me` and session/API reliability.
- S10/S22 for dev/build harness stability if this recurs after shared-file cleanup.
- S21/S18 if the `mainlandBnuJuniorTopics` import/export state is tied to generated content handoff timing.

Verification:

- Restart dev/prod server from a clean current tree.
- Confirm `POST /api/auth/login`, `GET /api/me?includeLessonEntry=false`, `GET /api/dashboard?grade=S3`, and `GET /api/adaptive-learning/next?grade=S3` all return 200.
- Re-run the portrait HK student mobile scenarios.

### P1: Adaptive API Failure Is Misrepresented As A Normal Empty Learning State

Severity: P1 page defect.

Reproduction:

1. Log in as demo student.
2. Intercept or force `/api/adaptive-learning/next?grade=S3` to return 500.
3. Open `/adaptive-learning` on mobile.

Evidence:

- Scenario: `adaptive-api-500-hk-student-375x667`.
- Network showed `GET /api/adaptive-learning/next?grade=S3` returned 500.
- Screenshot showed the Knowledge Galaxy placeholder copy: "暂无当前航线 / 完成练习后会解锁下一颗星球" and CTA "开启练习".
- No explicit adaptive-service error was shown.

Root cause:

- `loadDashboard()` records dashboard failures in `loadError` at `components/dashboard/AdaptiveLearningContent.tsx:400-404`.
- `loadAdaptiveDecision()` throws on bad response at `components/dashboard/AdaptiveLearningContent.tsx:451-458`, but its catch only runs `setAdaptiveDecision(null)` at `components/dashboard/AdaptiveLearningContent.tsx:472-474`.
- `AdaptiveKnowledgeGalaxy` receives `decision=null` and `loadError=""`, so it renders the ordinary no-route placeholder rather than an outage state.

Expected behavior:

- Adaptive recommendation failures should show a distinct message such as "Adaptive recommendation is unavailable. Try again later."
- The message should not imply the student simply lacks practice evidence.

Suggested owner routing:

- S02 for dashboard/page UI state.
- S15 for adaptive API semantics and error copy if engine-specific.
- S09 for final bilingual copy.

Verification:

- Add a mocked mobile E2E/probe where `/api/adaptive-learning/next` returns 500 and assert the page exposes adaptive-specific error text.
- Confirm the normal no-evidence state still appears only when the API returns a valid `decision: null` or product-approved content-unavailable payload.

### P1 Candidate: 320px Mobile Menu Button Can Be Unclickable

Severity: P1 candidate mobile navigation defect.

Reproduction:

1. Open guest `/adaptive-learning` at the narrowest mobile viewport.
2. Click the `Open mobile menu` button.

Evidence:

- Scenario: `guest-iphone-se-320x568`.
- Playwright resolved the correct button but timed out after 30 seconds.
- The click log repeatedly reported that the ThemeToggle moon icon intercepted pointer events.
- Screenshot `guest-iphone-se-320x568.png` shows the header controls packed tightly: language selector, theme toggle, and menu button.

Root cause candidate:

- `Navbar` renders `LanguageToggle`, `ThemeToggle`, and a `h-10 w-10` mobile menu button in a single `flex shrink-0` control group at `components/layout/Navbar.tsx:198-222`.
- At the narrowest mobile size, available header space is tight and adjacent circular buttons can overlap in hit testing.

Suggested owner routing:

- S01 for app shell/navigation.

Verification:

- Re-run at 320px, 360px, 375px.
- Assert the menu opens and `aria-expanded` changes to `true`.
- Consider reducing language toggle footprint on very small screens or increasing control spacing/z-index.

### P2: Mobile Tap Targets Are Below 44px In Navigation And Expanded Panels

Severity: P2 UI/accessibility.

Evidence:

- Across successful mobile scenarios, the probe repeatedly found these target sizes:
  - Language buttons: about 48-50px wide by 32px high.
  - Global theme toggle and mobile menu: 40px by 40px.
  - Some expanded-panel links/buttons in landscape: 20-38px high.
- Examples came from `guest-iphone-12-390x844`, `hk-student-landscape-667x375`, and `zh-hans-dark-hk-student-375x667`.

Impact:

- Small controls are harder to tap on mobile and may contribute to the 320px menu interception.

Suggested owner routing:

- S01 for global nav controls.
- S02 for Adaptive page panel actions.

Verification:

- Add a mobile tap-target audit for visible `button`, `a`, and `summary` elements on `/adaptive-learning`.
- Keep global controls at 44px minimum hit area even if the visual button is smaller.

### P2: Decorative Overflow Offender In Error/Expanded States

Severity: P2 low-risk visual/layout.

Evidence:

- Forced API failure scenarios reported one non-interactive horizontal offender:
  - `span.absolute.-right-10.-top-10`, `right=377` on a 375px viewport.
- Body-level horizontal overflow stayed false.

Impact:

- No whole-page horizontal scroll was observed, but decorative absolute elements can complicate clipping and hit testing in tight mobile layouts.

Suggested owner routing:

- S02 if cleanup is desired while fixing error states.

## Positive Findings

- Successful HK logged-in mobile renders had no body-level horizontal overflow.
- Successful HK logged-in mobile renders had no React `pageerror`.
- Chinese Simplified + dark mode rendered the Adaptive page and details panels.
- Dashboard API failure state is visibly handled: forced `/api/dashboard` 500 produced dashboard error copy while the adaptive decision still rendered.
- Mobile nav from Home to Adaptive Learning worked at 390x844; failed `_rsc` requests were aborted navigation/prefetch noise, not a page crash.

## Checks Run

- `git status --short`: very dirty worktree with many pre-existing owner/session changes.
- Read AGENTS.md and confirmed S11 report/test-only scope.
- Source inspection:
  - `app/adaptive-learning/page.tsx`
  - `app/adaptive-learning/loading.tsx`
  - `components/dashboard/AdaptiveLearningContent.tsx`
  - `components/dashboard/AdaptiveKnowledgeGalaxy.tsx`
  - `components/layout/Navbar.tsx`
  - existing adaptive/student E2E helpers
- Custom Playwright mobile probe: 15 scenarios, screenshots and JSON written under `output/playwright/2026-06-04-S11-adaptive-learning-mobile/`.
- `npm run type-check`: passed.
- `npm run build`: failed after compile during page-data collection for `/api/assessments/[assessmentId]` with `MODULE_NOT_FOUND` for `.next/server/app/api/assessments/[assessmentId]/route.js`. This is outside Adaptive Learning page scope but blocks production-grade release verification.

## Checks Not Run

- No live LLM provider calls.
- No production-site test for this page in this run.
- US_CA_MATH authenticated no-content UI could not be confidently verified because the attempted registered US student scenario rendered the guest page after `/api/me` returned 401 during the unstable auth/API window. Existing S11/S15 Adaptive engine reports already cover US no-decision content risk separately.

## Handoff

Do not fix in S11 without owner reassignment. Recommended next order:

1. S12/S10/S22 resolve current-tree API/build instability and rerun login/API smoke.
2. S02/S15 add explicit Adaptive API failure state on `/adaptive-learning`.
3. S01 fix 320px mobile nav hit testing.
4. S01/S02 raise mobile tap target hit areas.
5. S11 reruns this mobile matrix after fixes.
