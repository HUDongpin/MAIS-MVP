# Student Console — Guided Sequence Feature (Implementation Plan)

**Date:** 2026-07-21
**Platform:** MAIS-MVP — [www.mais.ac](https://www.mais.ac)
**Goal:** Add a first-run, step-by-step guided tour ("1, 2, 3 …") to the **Student Console**, mirroring the tour that already exists in the Teacher Console.

---

## 1. Does Claude agree the Student Console is hard for new users? — Yes.

Grounded rationale (from the codebase):

- **The Student Console is broad.** A new student lands among many surfaces — dashboard (grade selector, "Growth track" motivation hub, rewards, profile, knowledge galaxy, analytics), Personalized Learning, Lessons (with **map *and* list** views), Practice Arena, Assignments, Roadmap, Assessments, Tools/Visualizations, games (Fishing, Adventure Island, Practice Island), and the Nova Tutor. That's a lot of first-session cognitive load, especially for elementary users.
- **Multiple gamified navigation metaphors** (galaxy, meadow map, islands) are engaging but *not self-evident* — a 6-year-old doesn't automatically know the "meadow clearings" are lessons or where their homework lives.
- **There is a setup gate but no navigation tour.** `LearnerStartSetupGate` asks "What do you want to do first today?" — that's *intent selection*, not a *walkthrough of where things are*. Nothing today teaches the console's layout.

So a **sequenced guided tour is well-justified.** One caveat: a tour should *complement*, not *paper over*, good information architecture. Pair it with the IA improvements discussed elsewhere (assigned-work on the dashboard, clearer lesson-menu affordances) so the tour reinforces an already-navigable console rather than compensating for a confusing one.

---

## 2. Good news: the engine already exists — reuse, don't rebuild

`components/teacher/TeacherGuidedTour.tsx` (304 lines) is a **generic, anchor-driven spotlight tour**:
- Steps resolve at open time against `[data-tour="…"]` DOM anchors (`nav`, `workspace-header`, `kpis`, `action-queue`, `workflow`, `tour-button`).
- Per-user persistence via `teacherTourStorageKey(userId)` → `localStorage`.
- Accessible modal: `role="dialog"`, `aria-modal="true"`, spotlight overlay `aria-hidden`.
- Auto-launch only on first visit; suppressed under `navigator.webdriver`.
- Pinned by `teacherGuidedTourRegressions.test.ts` (a11y, per-user storage, anchors).

Almost none of this is teacher-specific. The Student version needs a **new set of steps + a new storage key + `data-tour` anchors on student surfaces** — not a new engine.

---

## 3. Implementation plan (brief, phased)

**Phase 1 — Extract a shared tour engine (~0.5 day).**
Lift the generic parts of `TeacherGuidedTour.tsx` into `components/common/GuidedTour.tsx`, parameterized by `steps`, `storageKey`, and `tourVersion`. Refactor `TeacherGuidedTour` to a thin wrapper over it (keep its tests green). *No behavior change for teachers.*

**Phase 2 — Create `StudentGuidedTour` (~0.5 day).**
Thin wrapper over the shared engine with:
- Storage key `mais-student-tour:v1:<userId>` (versioned so you can re-trigger after a redesign).
- Auto-launch on **first dashboard visit**, `navigator.webdriver`-suppressed (same guard).
- A persistent **"Show me around again"** replay button (kids re-take tours often).

**Phase 3 — Add `data-tour` anchors to Student surfaces (~1 day; the main new wiring).**
Tag the student dashboard/console targets: `nav`, `assigned-work`, `start-lesson`, `practice-games`, `nova-tutor`, `growth-track`. (`app/dashboard/page.tsx` + `DashboardGradeSelectorGrid`, `StudentMotivationHub`, the lessons entry, the Nova Tutor button.)

**Phase 4 — Age-appropriate + accessible pass (~1 day).**
See §5. Reuse the teacher tour's dialog a11y (keyboard nav, focus trap, screen-reader labels) — this also serves the WCAG 2.1 AA pilot requirement.

**Phase 5 — Tests (~0.5 day).**
Clone `teacherGuidedTourRegressions.test.ts` → `studentGuidedTourRegressions.test.ts`: webdriver guard, per-user storage key, dialog a11y, anchor resolution, replay.

**Total: ~3–4 days**, low risk (proven pattern).

---

## 4. Proposed student tour sequence (the "1, 2, 3")

Keep it **short (4–5 steps)** — young learners disengage from long tours. Draft:

| # | Anchor | Message (kid-friendly) |
|---|---|---|
| 1 | `nav` / dashboard | "Welcome! This is your home base — everything starts here." |
| 2 | `assigned-work` | "Work your teacher gave you shows up right here." |
| 3 | `start-lesson` | "Tap here to start a lesson and explore the map." |
| 4 | `practice-games` | "Practice and play math games to earn stars." |
| 5 | `nova-tutor` | "Stuck? Tap Nova — your math helper — anytime." |

*(Optional 6th: `growth-track` — "Watch your level and rewards grow.")*

---

## 5. Design considerations for US K-12 (what makes this different from the teacher tour)

- **Age-band the tour.** Younger students need simpler words, bigger highlight targets, and fewer steps. Consider a K-2 variant (4 steps, very plain language, maybe read-aloud via your existing TTS) vs a 3-5 / 6-12 variant. Key off the grade band you already track.
- **Reading load & read-aloud.** For emerging readers, keep each step to one short sentence; optionally add a "play" button using the TTS you already have on lesson pages.
- **Tone & visuals.** Warm, playful, encouraging — match the meadow/galaxy world, not the teacher tour's professional voice.
- **Touch + trackpad targets.** ≥48px controls (Chromebook trackpad + iPad touch), per the device profile.
- **Don't annoy.** Once-only auto-launch, fully dismissable ("Skip"), always replayable, never blocks the UI, and never re-fires unless `tourVersion` bumps.
- **Accessibility (pilot requirement).** Keyboard-operable, focus-trapped dialog, `aria` labels, and `prefers-reduced-motion` (no spotlight animation for those users) — inherit from the shared engine.
- **Resilient anchors.** Steps skip gracefully if an anchor is missing (the teacher engine already resolves anchors at open time) — so a student who hasn't unlocked a surface won't hit a broken step.

---

## 6. Caution & recommended next step

- A tour **complements** good navigation; it doesn't fix confusing IA. Ship it alongside the dashboard/lesson-menu clarity improvements so it teaches a console that's already learnable.
- **Validate with real kids.** Watch 2–3 first-graders take the tour on the actual Chromebook/iPad — if they skip or get confused, shorten it. For the youngest band, a 3-step tour often beats a 6-step one.

**Suggested first move:** Phase 1 + 2 (extract the shared engine, stand up `StudentGuidedTour` with the 5 steps and a replay button) — a ~1-day spike that proves the whole thing before wiring every anchor.

---

*Prepared by Claude (Claude Code, Opus 4.8) on 2026-07-21. Based on the existing `components/teacher/TeacherGuidedTour.tsx` pattern and the Student Console surfaces in `app/dashboard` / `components/dashboard`.*
