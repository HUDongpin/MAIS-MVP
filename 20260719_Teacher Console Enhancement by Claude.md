# Teacher Console Enhancement by Claude — Full Session Record (2026-07-19)

This document records the complete dialogue and work performed in the Teacher
Console enhancement session: the owner's request, the proposed plan, all four
implementation phases, the verification journey, the pull request, and open
follow-ups.

---

## 1. The request

The owner provided screenshots of the current Teacher Console (left navigation
sidebar + right content area for Teacher Rhi's California K-12 workspace) and
asked for a smart enhancement plan covering three named issues plus anything
else worth fixing, so that US K-12 math teachers benefit and feel less burned
out:

- **Issue 1 — Navigation ranking.** The left sidebar's 12 functions were not
  ranked by importance from a math teacher's perspective.
- **Issue 2 — Right-side color design.** The content area was visually
  monochrome; elements belonging to different groups were not distinguishable
  by color.
- **Issue 3 — Learnability.** The console required effort to learn. The owner
  wanted a first-run guided tour that pops out in sequence (1, 2, 3 …), like
  Claude's own new-user guidance.

## 2. The plan Claude proposed

After reading the actual code (`components/teacher/TeacherShell.tsx` held a
flat 12-item nav; `TeacherDashboardView.tsx` used a single ad-hoc tone map;
no onboarding infrastructure existed), Claude proposed four phases:

1. **Phase 1 — Rank and group the navigation** into four zones ordered by
   frequency of use, with icons, live badge counts, and a mobile drawer.
2. **Phase 2 — A semantic color system**: cool hues mean *places*, warm hues
   mean *urgency*; one hue always means the same thing everywhere.
3. **Phase 3 — First-run guided tour**: a lightweight in-house spotlight tour
   with per-user persistence and a permanent replay button.
4. **Phase 4 — Unmentioned issues (burnout reducers)**: enterprise/China-ops
   jargon translated into teacher language, the dashboard reordered to deliver
   what its hero promises, timestamps in the viewer's timezone, and a
   typography-hierarchy pass.

The owner approved via two goals: "Implement Phases 1 and 2", then
"Implement Phases 3 and 4". All four phases shipped in this session.

---

## 3. Phase 1 — Ranked, grouped navigation

Implemented in [components/teacher/TeacherShell.tsx](components/teacher/TeacherShell.tsx).

| Group (zone) | Items in order | Cadence |
|---|---|---|
| **Today** (cyan) | Overview · Assignments · Inbox · Live | Daily: triage, grade, reply, teach |
| **Plan & teach** (indigo) | Lesson kits · Assessments · Resources | Weekly planning |
| **Students & data** (violet) | Classes · Analytics · Rewards | Weekly check-ins / interventions |
| **School & records** (slate) | Reports · School admin | Monthly / end of term |

Details:

- **Icons** — a new local inline-SVG set in
  [components/teacher/teacherNavIcons.tsx](components/teacher/teacherNavIcons.tsx)
  (12 stroke icons, no icon library dependency added). Icons and badges are
  `aria-hidden` so every nav link keeps its exact accessible name — the E2E
  suite selects links by exact label.
- **Badge counts** — Assignments shows `pendingGrading`, Inbox shows
  `unrepliedMessages`, served by the new
  [app/api/teacher/nav-signals/route.ts](app/api/teacher/nav-signals/route.ts).
  The route reuses the existing dashboard aggregation behind `unstable_cache`
  (`revalidate: 120`, tagged `teacherWorkspaceCacheTag`), so badge numbers
  always match the KPI tiles without adding a fresh heavy aggregation per page
  view. The shell fetches lazily on the client, skips empty workspaces, and
  throttles to once per minute. The layout's server hot path is unchanged:
  `getTeacherShellData` still returns only `teacher` + `classes`.
- **Mobile/tablet drawer** — below the `lg` breakpoint the sidebar collapses
  behind a toggle bar showing the current section name and its zone dot
  (`aria-expanded` / `aria-controls` wired). Previously all 12 links stacked
  above the page content on iPads and phones.
- A new `TeacherNavSignals` type was added to [types/index.ts](types/index.ts).

## 4. Phase 2 — Semantic zone color system

Token contract in [components/teacher/teacherZones.ts](components/teacher/teacherZones.ts):

- **Zones (cool hues = places):** today = cyan, plan = indigo, students =
  violet, records = slate.
- **Status (warm hues = urgency):** emerald = on track / all caught up,
  amber = needs review, rose = at risk, neutral = no data.
- Rule: one hue always carries one meaning; color is never the only signal
  (labels always remain); all tokens have AA-contrast dark-mode variants.

Applied across:

- Nav group headers and dots (shell), and the workspace header's **top accent
  border that follows the active section's zone** on every console page.
- The six dashboard workflow cards: zone accent bar + tinted icon tile + zone
  eyebrow + zone CTA; the signal chip uses *status* colors when it carries a
  live workload signal (to grade, students at risk, open messages) and the
  zone hue otherwise. A compact legend under the workflow heading teaches the
  mapping.
- KPI tiles: zone accent bar on top; the number is status-colored — emerald
  zeros read "all caught up", amber/rose demand attention. Two "no data" cases
  render neutral instead of alarmist rose: weekly completion at exactly 0%,
  and class cards with 0 students.
- Section eyebrows re-zoned (Points system / Class health / Mastery heatmap =
  violet; Today's numbers / Action queue = cyan) instead of all-cyan.

## 5. Phase 3 — First-run guided tour

New [components/teacher/TeacherGuidedTour.tsx](components/teacher/TeacherGuidedTour.tsx),
mounted by the shell — no external tour library (framer-motion was available
but not needed; the global reduced-motion CSS applies).

- **Six steps** anchored to `data-tour` attributes:
  1. the grouped navigation, 2. class focus & search, 3. today's numbers
  (status colors explained), 4. the action queue, 5. the workflow cards (zone
  colors explained), 6. how to replay. Steps whose anchors are missing on the
  current page are skipped, so the tour also works from sub-pages.
- **Spotlight overlay**: the anchored element stays lit while everything else
  dims (box-shadow cutout); the card shows "Step N of 6", Back / Next / Skip
  tour, and progress dots; it repositions on scroll/resize and clamps to the
  viewport.
- **Auto-launch rules**: first visit to `/teacher/dashboard` only; real
  workspaces only (empty workspaces keep their own onboarding); never under
  test automation (`navigator.webdriver` guard keeps every Playwright run
  deterministic); never again once completed or skipped.
- **Persistence**: per-user versioned localStorage record
  `mais-teacher-tour:v1:<userId>` → `{ status: "completed" | "skipped", at }`.
  Server-side persistence was deliberately skipped: the `user_settings` store
  allowlists only language/theme/grade, and threading a UX flag through the
  10k-line dual-backend store wasn't worth the risk. The always-visible
  **"? Tour" replay button** in the workspace header covers new devices.
- **Accessibility**: `role="dialog"` + `aria-modal`, focus trap, Esc
  dismisses (recorded as skipped), ArrowLeft/ArrowRight navigate, `aria-live`
  step announcements.

## 6. Phase 4 — Teacher language and dashboard flow

- **Jargon → teacher language** (both English and Chinese):
  - "Enterprise workflow / Run the teaching operation" → **"Teaching workflow
    / Plan, teach, and follow up"**
  - "Send notice receipts" (with WeCom delivery wording) → **"Send school
    notices"** (the operations pages keep their own domain terms)
  - "Audit-ready" → **"Records ready"**; "Close" → **"Wrap up"**
  - "Operations console" button → **"School notices"**
  - Nav label "Operations" → **"School admin"** (spec updated in the same
    change)
- **Dashboard reorder** — the hero says "Today's teaching queue", but the
  action queue used to sit at the bottom of a long scroll. Now: hero →
  **Today's numbers (KPIs) + What needs attention (action queue), side by
  side** → workflow cards → rewards → class health → full-width mastery
  heatmap.
- **Timestamps in the viewer's timezone** — "Updated …" labels render a
  deterministic SSR-safe value first, then swap to the viewer's own
  locale/timezone after hydration (`LocalDateTime` with `Intl.DateTimeFormat`)
  instead of fixed Hong Kong time.
- **Typography hierarchy** — section headings and nav labels step down from
  `font-black` to `font-bold`, reserving black for the page title, card
  titles, and key numbers.

---

## 7. Verification journey

**Unit + types.** `tsc --noEmit` clean. 21/21 node tests pass:
[app/teacher/teacherNavigationPerformanceBoundary.test.ts](app/teacher/teacherNavigationPerformanceBoundary.test.ts)
(all pre-existing shell fast-path pins still hold, plus new pins for the badge
fetch throttle and the cached nav-signals route) and the new
[components/teacher/teacherGuidedTourRegressions.test.ts](components/teacher/teacherGuidedTourRegressions.test.ts)
(tour webdriver guard, per-user storage, dialog a11y, anchor integrity, jargon
bans, KPI-before-workflow order, timezone swap).

**Live browser walkthrough** (session dev server on port 3235, Teacher Rhi
California K-12 demo): grouped nav with badges, zone top borders on Overview
(cyan) and Analytics (violet), dark mode, the mobile drawer at 375px, and the
full tour lifecycle — auto-launch on first dashboard visit, keyboard stepping
through all six steps, Done recording `completed`, no re-launch after reload,
replay via the header button, Esc recording `skipped`.

**E2E saga.** Running the teacher specs against a dev server produced 14
false failures (dev-mode cold compiles blow the specs' 5s timeouts). The
reliable path — documented in project memory — is the full production
Playwright harness from a `git worktree` (the clean-build guard blocks builds
while dev servers run in the main repo, but a worktree's root doesn't match).
Results:

- **Baseline at pure `main` HEAD**: 16/17 passed; 1 pre-existing failure.
- **With all four phases applied**: one real regression surfaced — the new
  mobile toggle duplicates the active section label in a `display:none` bar,
  and `teacher-workspace.spec.ts`'s route loop asserted on the *first* text
  match. Fixed by filtering the assertion to visible matches. Final:
  **`teacher-workspace.spec.ts` 3/3 passed; `teacher-console-button-matrix.spec.ts`
  13 passed** with only the same pre-existing failure as baseline.

**The one known failure (pre-existing, not from this work):** the
button-matrix "role routing" test expects an authenticated *student* visiting
`/teacher/dashboard` to bounce to their own `/dashboard`, but
`app/teacher/getTeacherFoundation.ts` intentionally (per its QA BUG-003/004/005
comment) redirects to `/login?reason=teacher-account-required`, and the login
page does not auto-forward authenticated users. Spec vs product needs an owner
decision — a follow-up task chip was filed for it.

## 8. Deliverables

**Pull request:** <https://github.com/HUDongpin/MAIS-MVP/pull/13> — branch
`feature/teacher-console-redesign`, 11 files, +1,164 / −226. The commit was
assembled in an isolated worktree so the other in-flight streams in the
working tree (games, visualization lab, register) stayed untouched and out of
the PR.

Files in the PR:

| File | Change |
|---|---|
| `components/teacher/TeacherShell.tsx` | Grouped nav, badges, drawer, zone header border, tour wiring |
| `components/teacher/TeacherDashboardView.tsx` | Zone/status colors, reorder, teacher language, LocalDateTime |
| `components/teacher/TeacherGuidedTour.tsx` | **New** — six-step spotlight tour |
| `components/teacher/teacherZones.ts` | **New** — zone/status color token contract |
| `components/teacher/teacherNavIcons.tsx` | **New** — local inline-SVG icon set |
| `components/teacher/teacherGuidedTourRegressions.test.ts` | **New** — tour/jargon/order/timezone pins |
| `app/api/teacher/nav-signals/route.ts` | **New** — cached badge-count endpoint |
| `app/teacher/teacherNavigationPerformanceBoundary.test.ts` | New pins for the badge path |
| `types/index.ts` | `TeacherNavSignals` type |
| `tests/e2e/teacher-console-button-matrix.spec.ts` | "Operations" → "School admin" label |
| `tests/e2e/teacher-workspace.spec.ts` | Route-loop assertion filters to visible text |

Kept local by repo convention (dated docs are not committed):
`20260719_Teacher Console UI-UX Redesign by Claude.md` (the design/verification
doc) and this session record.

## 9. Key decisions and rationale

1. **Ranking = grouping + ordering.** A flat 12-item list forces re-scanning;
   four ranked groups encode both importance (top-to-bottom by frequency) and
   meaning (each group is a kind of work).
2. **Cool hues = places, warm hues = urgency.** The pre-existing design used
   emerald both as "Teach" branding and "good mastery" status; separating the
   palettes removes that ambiguity and lets the color system teach itself.
3. **Badges ride the existing aggregation behind a cache** rather than a new
   store query — consistency with the KPI tiles is guaranteed and the
   perf-boundary philosophy (thin shell, no background API pressure) is
   preserved and now pinned by tests.
4. **Tour persistence is client-side by design** — extending the strict
   server settings allowlist for a UX flag wasn't worth the risk; the replay
   button covers cross-device.
5. **`navigator.webdriver` guard** keeps the auto-launching tour out of every
   E2E run without touching dozens of specs.
6. **"No data" renders neutral, not red** — a 0-student class or an empty week
   should not look like a crisis on a teacher's first day.

## 10. Open follow-ups

- Resolve the pre-existing role-routing spec-vs-product mismatch (task chip
  filed; likely update the spec to expect
  `/login?reason=teacher-account-required` and assert the reason banner).
- Possible later polish: carry zone tokens into the remaining teacher
  sub-page views (`TeacherAnalyticsView`, `TeacherLiveView`, …), which still
  use the old ad-hoc `gradient-text` styling; per-page mini-tips as a Phase 3
  extension; server-side tour persistence if the settings store ever gains a
  general preferences field.
