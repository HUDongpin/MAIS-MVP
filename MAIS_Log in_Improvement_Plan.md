# MAIS Login Page — UI/UX Improvement Plan

**Date:** 2026-07-19
**Scope:** `/login` page cognitive-load reduction (Issue 1) and example-accounts strategy (Issue 2)
**Primary files:** `app/login/page.tsx`, `components/providers/AppProviders.tsx`, `playwright.config.ts`, affected E2E specs

---

## Diagnosis

### Issue 1 — Why the login page feels heavy

The page asks users to make **5 decisions across ~13 interactive controls** when logging in should
take 2 (identity + password):

1. **It asks for information the system already knows.** Course and Grade are always-visible
   required dropdowns, but the backend already returns `requiresCurriculumTrack` and the page has a
   `pendingCurriculumUser` flow that asks for curriculum *only when the account is missing one*.
   Registered accounts lock their course after registration. For virtually every real login, those
   two dropdowns are dead weight — the classic UX violation of asking at the door what is already
   in the file.
2. **The Google role selector front-loads a decision.** A returning Google user's role is already
   known server-side; only a first-time Google sign-up needs to declare Student/Parent/Teacher.
   Asking everyone, every time, before they even click "Continue with Google" adds a decision that
   ~90% of uses don't need.
3. **Wrong defaults for the market.** The page defaulted to Mainland PEP + S4. A California
   parent's first impression was a Chinese-mainland textbook selection they had to undo.
4. **Flat visual hierarchy.** Nearly everything is `font-black`, so the primary CTA, the Google
   alternative, the role picker, and the register banner all shout at the same volume.

### Issue 2 — Example accounts on a public login page

**Not publicly, no.**

1. **Trust optics.** Parents, teachers, and districts evaluating an ed-tech product see shared
   credentials printed on the login page. It reads as "internal demo build," not "product my kid's
   data is safe in."
2. **Cognitive noise.** A new user can't tell whether they're supposed to pick one of these
   accounts or create their own.
3. **Strategy mismatch.** Three of the four rows (Mainland PEP, HK DSE, and the K-12 vs Grade 1
   split) aren't the California go-to-market.

**But the mechanism must survive:** sales demos, internal QA, and six E2E spec files depend on the
example-account buttons. The answer is to *relocate*, not delete — and convert the best use case
into a growth feature: a single **"Explore a demo classroom"** one-click CTA.

---

## Implementation notes discovered during code review

- The E2E suite runs a **production build** (`npm run build && npm run start` in
  `playwright.config.ts`), so any `NEXT_PUBLIC_*` gate must be injected into that build command.
- The login API (`app/api/auth/login/route.ts`) **assigns whatever curriculum the client submits**
  to accounts that lack one (`shouldCompleteCurriculumTrackSelectionForLogin`). Because the old UI
  always submitted the visible dropdown defaults, an account missing a curriculum could be silently
  assigned Mainland PEP S4 instead of being prompted. The fix: the initial submit sends
  **credentials only**; course/grade are sent only from the pending-curriculum panel or an example
  account tile.
- `authenticateInternalCaliforniaFastLogin` matches unique usernames without any curriculum
  selection, so typed credential logins for CA seed accounts keep working with no dropdowns.
- A source-regression unit test (`tests/e2e/reported-bug-source-regressions.test.ts`) pins the
  `<option className={loginSelectOptionClassName}>` JSX shape — the selects keep that exact markup
  in their new location.

---

## Phase 1 — Shrink the form to two fields (progressive disclosure) ✅ implemented

- Remove the always-visible Course/Grade dropdowns from the login form.
- Initial submit sends **identifier + password only** (`login()` grade parameter is now optional in
  `AppProviders`).
- When the server responds `requiresCurriculumTrack`, the amber "this account needs a curriculum"
  panel now *contains* the Course and Grade selects (same `#login-curriculum` / `#login-grade`
  ids and option markup). Submit label becomes "Save curriculum and log in".
- Defaults changed to **California Math (`US_CA_MATH`) + Kindergarten** for every flow that still
  needs a default (pending panel, Google student params).
- Changing the identifier clears a stale pending-curriculum prompt.
- Side benefit: a registered student's saved grade can no longer be stomped by an untouched
  dropdown default at login.

## Phase 2 — Simplify Google sign-in ✅ implemented

- The three-button Student/Parent/Teacher radiogroup is hidden by default; role defaults to
  **Student**.
- A one-line caption under the Google button — "Signing in as **Student** · Change" — expands the
  original radiogroup (same accessible name, "Google account type") only for the minority who need
  it. First-class post-OAuth role selection remains a future enhancement.

## Phase 3 — Relocate example accounts + demo CTA ✅ implemented

- The example-accounts grid renders only when one of these is true:
  - `next dev` (development builds — daily team workflow unchanged),
  - build-time flag `NEXT_PUBLIC_SHOW_EXAMPLE_ACCOUNTS=true` (set for the Playwright production
    build so all example-account specs keep passing),
  - runtime escape hatch `/login?demo=1` (for demos on production deployments).
- Production default: **hidden**.
- **"Explore a demo classroom"** card: one click opens the California Math Grade 1 student
  experience (Student Shirleen seed). Requires demo users server-side
  (`HK_MATH_ENABLE_DEMO_USER` ≠ "false", which is the default).
  **Owner decision (2026-07-19): gated, not public.** The card renders only in dev, with
  build-time `NEXT_PUBLIC_SHOW_DEMO_CTA=true`, or at runtime via `/login?demo=1` (so marketing
  pages can deep-link to a demo-enabled login). Default production login shows neither the CTA
  nor the grid — purely credentials + Google.

## Funnel instrumentation ✅ implemented (2026-07-19)

Privacy-first counters answering the redesign's open questions (method mix, error rate, demo-CTA
usage, register step drop-off). No per-user rows, no IPs, no timestamps beyond a UTC day:

- Store: `lib/server/authFunnelMetrics.ts` — standalone sqlite file
  (`auth-funnel-metrics.sqlite` beside the main DB; `AUTH_FUNNEL_DB_PATH` overrides) holding
  `(day, event, detail, count)` daily counters, 90-day retention pruned on write.
- API: `POST /api/auth/funnel` (anonymous beacon, closed event vocabulary validated server-side,
  batch-capped, IP rate-limited via the shared auth guard) and `GET /api/auth/funnel?days=N`
  (admin-only read).
- Client: `lib/authFunnelClient.ts` `recordAuthFunnelEvent` — sendBeacon with keepalive-fetch
  fallback, never throws into the auth flow.
- Events: `login_submit` `<credentials|example-tile|demo-cta>:<success|invalid|pending_curriculum|error>`,
  `login_google_start` `<role>`, `register_step` `<account|curriculum|grade|details>`,
  `register_submit` `<role>:<success|duplicate|invalid|error|password_mismatch>`.
- Verified: 4/4 unit tests (validation, aggregation, batch cap, retention); live end-to-end in
  the browser — invalid credentials, register-page entry, and a demo-CTA login each produced the
  expected counter rows in the sqlite file.

## Nova Tutor launcher on auth pages ✅ fixed (2026-07-19)

The floating Nova Tutor launcher could cover the demo-CTA button at mid-width viewports. Root
fix in `components/ai/AITutorProvider.tsx`: the launcher now hides on the auth utility routes
(`/login`, `/register`, `/forgot-password`, `/reset-password`, `/change-password`) — extending
the register page's existing "no tutor during auth" precedent to all of them at the source
instead of per-page CSS. Verified: launcher absent on /login, still present on /dashboard;
tutor E2E specs exercise /practice, /teacher, /parent only, so none are affected.

### Deferred by owner decision (2026-07-19)

- **Post-OAuth role selection** (first-time Google accounts choose Student/Parent/Teacher after
  OAuth, removing the "Signing in as … · Change" caption): deferred until Google OAuth
  credentials exist in a staging environment where the flow can actually be exercised. The
  current caption + toggle stays as the interim UX.

### Test updates in this changeset

| File | Change |
| --- | --- |
| `playwright.config.ts` | `NEXT_PUBLIC_SHOW_EXAMPLE_ACCOUNTS=true` added to the E2E build command |
| `tests/e2e/google-oauth-login.spec.ts` | Reveals the role picker via the new "Change Google account type" toggle before asserting radios |
| `tests/e2e/app-shell-auth.spec.ts` | Drops the `#login-grade` pre-selection (selector no longer exists pre-auth); the "grade stays fixed" assertions remain |
| `tests/e2e/student-button-dropdown-matrix.spec.ts` | "Manual curriculum selection" test rewritten to assert the new contract: credentials-only payload, no curriculum selectors before auth |

## Phase 4 — Visual hierarchy pass ✅ implemented (2026-07-19)

Weight/contrast only, no layout rework. Resulting scale (verified via computed styles):

- `Log in` h1 stays `font-black` (900) — the page's single heavyweight anchor.
- **Log In** submit: `font-bold` (700) on the black pill — strongest interactive element.
- Google button, form labels, "or" divider, role radios, Forgot-password: `font-semibold` (600).
- Register prompt: the cyan box is gone — plain centered text with a bold cyan link.
- Notices (signed-in, teacher-required, redirect, pending-curriculum) dropped from
  `font-black` to `font-semibold`/`font-bold`; helper copy to `font-medium`.
- Demo CTA: title `text-lg font-bold`, body `font-medium`, button `font-bold`.
- Example-accounts grid (dev/demo-gated): section title `text-xl font-bold`; row labels from
  `text-xl font-black uppercase` to `text-sm font-bold uppercase tracking-wide`; tile names
  from `text-2xl font-black` to `text-xl font-bold`.
- Curriculum-update modal weights softened to match.

Verified: computed font weights/sizes in the browser, zero console errors, and the
source-regression suite (20/20, including the login select-option contrast checks). Dark mode
unaffected — only theme-agnostic weight utilities changed; all `dark:` variants untouched.

## Phase 5 — Verification (results, 2026-07-19)

- `npm run type-check`: **clean** for this change (two pre-existing errors in generated
  `.next/types/validator.ts` reference deleted game routes — stale build artifacts).
- Browser verification on a session dev server (port 3355): two-field login renders; Google link
  carries the new CA defaults; role caption + Change toggle work; credentials-only login for
  "Student Jon" lands on /dashboard with his stored curriculum/grade (nothing overwritten); the
  "Explore a demo classroom" CTA logs in as Student Shirleen in one click; Traditional Chinese
  copy renders (登入身份／體驗示範課室); no console errors.
- Targeted Playwright against the dev server (`PLAYWRIGHT_SKIP_WEBSERVER=1`):
  - `google-oauth-login` role-picker test: **pass** (the sibling API test needs Google OAuth env
    that this machine doesn't have — pre-existing).
  - `student-button-dropdown-matrix` login tests (fixed-example, stalled-settings, credentials-
    only): **all pass** single-worker. A stalled-`/api/me` scenario was additionally verified
    with a standalone script: the login POST fires immediately even before settings load.
  - `app-shell-auth`: the two login-related tests **pass**; two *registration*-flow tests fail —
    verified to fail identically on an unmodified HEAD worktree baseline, i.e. **pre-existing**
    and unrelated to this change (flagged as a separate task).
- The full production-build E2E (`npx playwright test <specs>`) is blocked while other dev
  servers run in this repo (`scripts/next-clean-build.mjs` guard). Run it after stopping them —
  the build now includes `NEXT_PUBLIC_SHOW_EXAMPLE_ACCOUNTS=true` so example-account specs pass.

---

## Measurable outcome

| Metric | Before | After |
| --- | --- | --- |
| First-time decisions to log in | 5 (identity, password, course, grade, method) | 2 |
| Above-the-fold tap targets | ~13 | 3 |
| Non-CA content shown publicly | 3 of 4 example rows | none |
| Curriculum mis-assignment risk at login | default silently submitted | prompted only when needed |
