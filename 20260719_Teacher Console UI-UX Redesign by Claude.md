# Teacher Console UI/UX Redesign — Phases 1–4 (2026-07-19)

Owner request: make the Teacher Console navigable for US K-12 math teachers without
extra learning effort. Phase 1 reworks the left navigation; Phase 2 introduces a
semantic color system for the right-side content; Phase 3 adds a first-run guided
tour; Phase 4 replaces enterprise jargon with teacher language and reorders the
dashboard around the day's actual work.

## Phase 1 — Ranked, grouped navigation

`components/teacher/TeacherShell.tsx` now renders the 12 console links in four
zone groups, ordered top-to-bottom by how often a US math teacher needs them:

| Group | Items | Cadence |
|---|---|---|
| **Today** | Overview, Assignments, Inbox, Live | Daily triage, grading, replies, teaching |
| **Plan & teach** | Lesson kits, Assessments, Resources | Weekly planning |
| **Students & data** | Classes, Analytics, Rewards | Weekly check-ins / interventions |
| **School & records** | Reports, Operations | Monthly / end of term |

Supporting changes:

- **Icons** — new local inline-SVG set in `components/teacher/teacherNavIcons.tsx`
  (no icon dependency added). All icons are `aria-hidden`, so link accessible names
  stay the exact labels the E2E suite selects by.
- **Badge counts** — Assignments shows `pendingGrading`, Inbox shows
  `unrepliedMessages`. Counts come from the new `GET /api/teacher/nav-signals`
  route, which reuses the dashboard aggregation behind `unstable_cache`
  (`revalidate: 120`, tagged with `teacherWorkspaceCacheTag`) so badges always match
  the KPI tiles without adding a fresh heavy aggregation per page view. The shell
  fetches lazily on the client, skips empty workspaces, and throttles to once per
  minute; badges are `aria-hidden` hints (counts remain fully readable on the
  dashboard KPI tiles).
- **Mobile/tablet drawer** — below `lg` the sidebar is collapsed behind a toggle
  bar showing the current section and its zone dot (`aria-expanded`/`aria-controls`
  wired). Previously all 12 links stacked above the page content on iPad/phone.
- The layout hot path is unchanged: `getTeacherShellData` still returns only
  `teacher` + `classes`, and all empty-workspace fast paths pinned by
  `app/teacher/teacherNavigationPerformanceBoundary.test.ts` are preserved (a new
  test there pins the badge-path invariants too).

## Phase 2 — Semantic zone color system

New token module `components/teacher/teacherZones.ts` establishes the rule
**cool hues = places, warm hues = urgency**, so one hue always means one thing:

- **Zones (places):** Today = cyan, Plan & teach = indigo, Students & data =
  violet, School & records = slate. Used for nav group headers, the workspace
  header's top accent border (follows the active section on every console page),
  workflow-card accent bars / icon tiles / eyebrows / CTAs, and KPI-tile accent
  bars.
- **Status (urgency):** emerald = on track / all clear, amber = needs review,
  rose = at risk, neutral = no data. Used for KPI numbers, workload signal chips,
  class-mastery percentages, and the existing heatmap and priority chips.

Dashboard application (`components/teacher/TeacherDashboardView.tsx`):

- The six workflow cards are zone-coded by destination and carry an icon tile plus
  a signal chip: chips with a live workload signal (to grade, students at risk,
  open messages) use status colors; the rest repeat the zone hue. A compact zone
  legend sits under the "Run the teaching operation" heading, teaching the mapping.
- KPI tiles replace the uniform gradient number with status-colored values —
  emerald zeros read as "all caught up", amber/rose demand attention. Two "no data"
  cases render neutral instead of alarmist rose: weekly completion at exactly 0%,
  and class cards with 0 students.
- Section eyebrows now follow their zone (Points system / Class health / Mastery
  heatmap = violet; Action queue = cyan) instead of all-cyan.
- Zone/status colors keep dark-mode variants and are never the only signal
  (labels are always present).

## Phase 3 — First-run guided tour

New `components/teacher/TeacherGuidedTour.tsx`, mounted by the shell — no external
tour library:

- **Six steps** anchored to `data-tour` attributes: grouped navigation → class
  focus & search → today's numbers (status colors explained) → action queue →
  workflow cards (zone colors explained) → how to replay. Steps whose anchors are
  not on the current page are skipped, so the tour also works from sub-pages.
- **Spotlight overlay**: the anchored element stays lit while the rest dims; the
  card shows "Step N of 6", Back/Next/Skip, and progress dots.
- **Auto-launch rules**: first visit to the dashboard only, real workspaces only
  (empty workspaces keep their own onboarding), never under test automation
  (`navigator.webdriver` guard), and never again once completed or skipped.
- **Persistence**: per-user versioned localStorage record
  (`mais-teacher-tour:v1:<userId>`, `completed`/`skipped` + timestamp). The
  server `user_settings` store only allowlists language/theme/grade, so server-side
  persistence was deliberately skipped; the always-visible **"? Tour" replay
  button** in the workspace header covers new devices.
- **Accessibility**: `role="dialog"` + `aria-modal`, focus trap, Esc dismisses,
  arrow keys navigate, `aria-live` step announcements, and the global
  reduced-motion CSS applies.

## Phase 4 — Teacher language and dashboard flow

- **Jargon replaced on the dashboard**: "Enterprise workflow / Run the teaching
  operation" → "Teaching workflow / Plan, teach, and follow up"; "Send notice
  receipts" → "Send school notices" (WeCom wording removed from the card — the
  operations pages keep their own domain terms); "Audit-ready" → "Records ready";
  "Close" → "Wrap up"; "Operations console" button → "School notices"; nav label
  "Operations" → "School admin" (both languages, spec updated in the same change).
- **The dashboard now delivers what the hero promises**: "Today's numbers" (KPI
  tiles) and the "What needs attention" action queue render immediately under the
  hero, side by side; workflow cards second; rewards, class health, and the
  full-width mastery heatmap after.
- **Timestamps in the viewer's timezone**: the "Updated …" labels render a
  deterministic (SSR-safe) value first, then swap to the viewer's own
  locale/timezone after hydration (`LocalDateTime`), instead of fixed Hong Kong
  time.
- **Typography hierarchy**: section headings and nav labels step down from
  `font-black` to `font-bold`, leaving black for the page title, card titles, and
  key numbers.

## Verification

- Unit: `node --import tsx --test app/teacher/teacherNavigationPerformanceBoundary.test.ts
  components/teacher/teacherGuidedTourRegressions.test.ts` — 21/21 pass (perf-boundary
  pins for the shell fast paths + badge throttle, plus new tour/jargon/order/timezone pins).
- `tsc --noEmit` — clean.
- Live dev-server walkthrough (Teacher Rhi, California K-12 demo): grouped nav,
  badges, zone borders, dark mode, mobile drawer, and the full tour lifecycle
  (auto-launch on first dashboard visit → keyboard stepping → Done records
  `completed` → no re-launch on reload → replay button reopens → Esc records
  `skipped`) all verified in the browser.
- E2E: `teacher-console-button-matrix.spec.ts` + `teacher-workspace.spec.ts` under
  the full production harness from a worktree (dev servers make these specs flake;
  the harness's clean-build guard also refuses to run from the main repo while
  session dev servers are up). **With all four phases applied: 16 of 17 pass** —
  13/14 button-matrix + 3/3 workspace. One workspace assertion needed updating in
  the same change: the mobile nav toggle duplicates the active section label in a
  `display:none` bar, so the route-visibility loop now filters to visible matches.
  The single remaining failure — "teacher area enforces guest, student, and
  teacher role routing" — is a **pre-existing spec/product mismatch at pure
  HEAD** (verified: it fails identically without any redesign changes): the spec
  expects an authenticated student visiting `/teacher/dashboard` to land on their
  own `/dashboard`, but the committed console behavior (QA BUG decision in
  `getTeacherFoundation.ts`) sends them to
  `/login?reason=teacher-account-required`. Not introduced by this redesign;
  needs a product decision on which behavior is correct.
