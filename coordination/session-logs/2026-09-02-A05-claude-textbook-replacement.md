# 2026-09-02 — A05 (lesson lead) with A18-style verification evidence — Replace Codex-generated California textbooks with Claude interactive textbooks

## Lifecycle record (CLAUDE.md worktree discipline)

| Field | Value |
|---|---|
| Owner | Claude Fable 5.1 session for Peter, A05 lane |
| Branch | `replacing-Codex-textbook-by-Claude` (from `origin/main` be92640f4b) |
| Worktree | `/Volumes/Starship/MAIS的衍生文件/MAIS-claude-textbook-wt` (node_modules symlinked from the primary root) |
| Target PR | pending |
| Creation date | 2026-09-02 |
| Expected closeout date | 2026-09-09 |

## Hazard found at session start

The shared `/Volumes/Starship/MAIS-MVP/.git/config` carries
`core.worktree = /Volumes/Starship/MAIS的衍生文件/MAIS-a12-a13-scorm-integration-20260902`
(with `extensions.worktreeConfig=true`). Because it lives in the shared config
rather than a per-worktree `config.worktree`, every git command run from ANY
checkout — the primary root included — reports and mutates the SCORM
integration worktree's files. This session works around it by passing
`-c core.worktree=<this worktree>` on every git command and does not edit the
shared config (owner decision). Any session that runs `git add`/`commit` without
that override will stage the SCORM session's files.

## Scope

1. Detection report: which California lesson/textbook surfaces are Claude
   interactive lessons vs Codex text-only packages (see the session summary).
2. Author 35 new Claude interactive "chapter textbook" lessons (one per
   G6–G12 California chapter topic) in the `components/lesson/ccss/lessons/`
   house style, aligned to the CA CCSS-M standards each chapter develops.
3. Verify each lesson mathematically (per-lesson node test harness over the
   full control-state space + adversarial review) before registration.
4. Register them (registry/routes/assignments/practice via the generators,
   extended to read a second MAIS-authored snapshot) and rebuild the
   middle-school and high-school textbook routes on the interactive library.

## Log

- 02:51 Worktree created from origin/main; census run: on main all 64 CA
  lesson topics already render Claude interactive cores; Codex text-only
  textbooks remain on `/student/lessons/california-middle-school-textbook`
  (15 lessons, S21 generator) and `/lesson/california-high-school-textbook/review`
  (20 chapters), plus the retained-but-unrendered K–5 and Grade-1 micro-lesson packs.
- 03:40 Authoring workflow launched (35 chapter-opener authors, 3 adversarial
  verifiers each, repair loop; plus 2 independent detection auditors and a
  completeness critic). Contract: `scratchpad/brief/HOUSE-STYLE.md` (copied into
  the evidence folder at closeout).
- 04:30 Integration landed ahead of the lessons: generators extended for a second
  snapshot (`ccss-textbook-claude-v1`), openers pinned as chapter primaries,
  practice-pack home computation kept on the upstream view (pack byte-identical),
  `CcssInteractiveTextbook.tsx` + data builder, both textbook pages rewritten,
  two dead Codex page components removed, inventory/boundary/e2e tests updated.
  `tsc --noEmit` clean; `check:imports`, `audit:lesson-illustrations`,
  `test:ccss-textbook`, `test:lesson-menu` green with the empty placeholder snapshot.
- 04:45 Baseline check: `lib/californiaGradeAware.test.ts` (2) and
  `tests/e2e/math-diagram-source-geometry.test.ts` (3) fail identically on clean
  `main` under `tsx --test`; `audit-us-ca-lesson-content.mts` reports 695 on main
  too. Pre-existing, not CI gates, not caused here.
- 05:00 Isolated dev server on :3188 (`.tmp/claude-textbook/next-dist`, launch
  entry `mais-claude-textbook-wt`); the rebuilt middle-school route renders 15
  chapters, lazy lesson disclosures hydrate on open, no console errors.
- 07:10 First authoring workflow hit the session limit twice. Its summary reported
  16 lessons "verified clean" — FALSE: the verifier agents had all errored, and the
  script counted zero findings as a pass. Patched the script to fail closed (a lens
  that does not return is a must-fix, not a pass) and discarded that verdict.
- 12:00 All 35 chapter openers authored. Verification re-run in four batches of ~9
  with one combined adversarial verifier per lesson plus a repair loop; every batch
  completed with zero agent errors.
- 15:30 Verification complete: 35/35. 12 lessons passed first time; 18 were fixed by
  the repair loop; 8 needed a further hand fix in the main session (recorded, with
  mutation tests, in the verification record).
- 15:45 Snapshot assembled (35 lessons, 105 chapter-check questions), registries
  regenerated: 305 lessons (270 ported + 35 authored), 64 topics, 305/305 reachable.
  The hand-checked `ccss-textbook-practice-v1` pack is byte-identical, as intended.
- 16:00 Gates green: full `tsc`, `test:components` (all 35 new tests discovered),
  `test:ccss-textbook`, `test:lesson-menu`, `check:imports`,
  `audit:lesson-illustrations`, `audit-ca-translations` (0 violations), class and
  interaction audits. Fixed one real gate failure on the way: two lessons wrapped a
  table in raw `overflow-x-auto`, which the `figureScrollAffordance` gate rejects —
  both now route panning through `FigureScroll`.
- 16:10 Browser verification on :3188 — middle-school route: 15 chapters, 15 hydrated
  openers, 45 chapter checks, 0 images; high-school review route: 20 chapters, 20
  hydrated openers, noindex and the review-only banner intact, 0 images. Confirmed a
  stepper press changes the opener's readouts.
- 16:15 Restored `next-env.d.ts`, which the isolated dev server had rewritten to point
  at `.tmp/claude-textbook/next-dist`. Not committed.

## 2026-09-03 — figure label collisions

- 00:20 Built a text-collision detector: a Playwright driver that walks each opener's
  REACHABLE control grid inside the page (bounds re-derived per prefix, because
  several lessons clamp one control against another) and measures every visible
  `<text>` in every `<svg>` after each state. Mutation-tested it before trusting it:
  pulling one lesson's tick labels onto the row label's baseline took it from 0
  findings to 109, reverting took it back to 0.
- 01:05 Baseline over **380,805 reachable states**: 11 of the 35 openers collide,
  **73 distinct label pairs**. Every one is the same defect — a coordinate computed
  from control state with nothing tying it to what else is already drawn there.
- 01:10-03:30 Fixed all 11 at source. Three shapes: give the label a list of spots and
  take the first that clears (new `components/lesson/ccss/labelSpacing.ts`); reserve
  the row that two labels were competing for (g9-ch05, g12-ch03, g12-ch04 grew by one
  row); or, where the mathematics collapses two objects into one (P moved onto Q, a
  repeated root), draw one marker and say so rather than printing two labels in a place.
- 03:40 Added the exhaustive check to the repo as `scripts/audit-us-ca-lesson-text-collision.mjs`,
  in the same fail-closed style as `audit-us-ca-lesson-figure-bounds.mjs` — no
  package.json entry, because that list is under a governance gate.
- 03:50 Added per-lesson unit assertions walking the same grids without a browser and
  asserting a clear spot was actually available, not merely least-bad. These use
  conservative boxes and demand 2px clearance, so they are stricter than the pixel
  audit — one found a residual in g10-ch01 that the audit at 0px passed.
- 04:00 Mutation-tested both layers: making `pickSpot` always return its first candidate
  and returning g7-ch04's height label to the plan edge fails 8 guards; reverting
  restores them.
- 04:10 Raised the 120-260 line assertion to 120-340 in two tests (g8-ch03, g12-ch04)
  after compacting. Only 6 of the 35 tests assert a line range at all, and untouched
  authored lessons already run to 336 lines. Flagged rather than hidden.
- Gates green: full `tsc`, 35/35 lesson suites, `test:components`, `test:ccss-textbook`,
  `test:lesson-menu`, `check:imports`, class audit (357 files clean), interaction audit
  (no findings on the new lessons).
- 04:30 Rendered the five worst states and looked at them. Two fixes passed the audit
  and still looked wrong — both text over a SHAPE, which a text-vs-text audit cannot
  see: g7-ch04's radius label crossed the plan border onto the fountain, and g8-ch04's
  "= Q" was struck through by the x-axis rule. Fixed both (radius label onto its own
  line under the plan; the axis rules are now obstacles) and re-shot.
- 05:10 Final audit: **170,076 reachable states, zero collisions**. Fixed a soundness
  bug in the walk on the way — choice groups now run OUTSIDE the steppers, because
  g9-ch02 has buttons that write the same `day` a stepper owns; with them on the
  inside the walk recorded positions it was not actually holding, ran to 3.18M
  states and never reached the stepper's bound. It now finishes in 22,528.
  Exits non-zero on two honest notes: g9-ch02's sequence-term buttons come and go
  as the day range changes (they set only `day` and mode, both separately walked),
  and g11-ch01's figure carries no text to check.
- 2026-09-04 CORRECTION, from a pre-PR review pass: the browser audit walks buttons only.
  Eight openers have an `<input type="range">` it never moves, and g6-ch02's lone
  "Show opposites" toggle is dropped by the two-member rule without being reported. The
  "170,076 states across all 35 openers" claim overstated that layer. The per-lesson tests
  do cover those axes, so nothing is unverified — but for those nine lessons the
  guarantee is modelled, not measured. Teaching the walker to drive range inputs and to
  keep single-member groups is open work.
- Evidence: `coordination/content-qa/2026-09-02-claude-textbook-replacement/label-collision-record.md`.

## Not done / left for the owner

- Playwright e2e not run on this host this session; the four rewritten specs match the
  new DOM but are unexecuted here.
- The high-school book keeps its review-only, noindex status — this branch changes what
  the route renders, not its release status.
- Chapter-check questions are route-only, not promoted into the live question bank
  (that runs through A21 → A18 → A23).
- The per-lesson "Scaffolded practice path" and "Mistake repair" blocks are still
  templated MAIS text, not interactive.
