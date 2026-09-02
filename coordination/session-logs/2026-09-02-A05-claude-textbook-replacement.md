# 2026-09-02 — A05 (lesson lead) with A18-style verification evidence — Replace Codex-generated California textbooks with Claude interactive textbooks

## Lifecycle record (CLAUDE.md worktree discipline)

| Field | Value |
|---|---|
| Owner | Claude Fable 5.1 session for Peter (hudongpin123@gmail.com), A05 lane |
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

## Not done / left for the owner

- Playwright e2e not run on this host this session; the four rewritten specs match the
  new DOM but are unexecuted here.
- The high-school book keeps its review-only, noindex status — this branch changes what
  the route renders, not its release status.
- Chapter-check questions are route-only, not promoted into the live question bank
  (that runs through A21 → A18 → A23).
- The per-lesson "Scaffolded practice path" and "Mistake repair" blocks are still
  templated MAIS text, not interactive.
