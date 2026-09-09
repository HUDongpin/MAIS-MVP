# Verification record — 35 MAIS-authored California chapter openers

**Date:** 2026-09-02 · **Branch:** `replacing-Codex-textbook-by-Claude`
**Authoring contract:** `authoring-contract.md` (this folder) · **Snapshot:** `data/generated-content/ccss-textbook-claude-v1/`

## 1. How each lesson was verified

Every lesson went through, in order:

1. **Authoring** — one agent per chapter, working from a per-chapter brief carrying
   the chapter's CCSS standards (ids, descriptions, cluster headings from
   `data/ccss/`), the interactive lessons already in the chapter, and the Codex text
   chapter being replaced (as a coverage hint only — copied sentences were a
   must-fix).
2. **A per-lesson `node:test` harness** committed beside the lesson
   (`<slug>.test.ts`), which enumerates the lesson's **full control grid** — every
   reachable combination of every control, not a sample — and recomputes each
   displayed claim independently.
3. **Adversarial verification** by an agent that did not write the lesson, told to
   refute it, across three lenses: mathematics over the full grid, California CCSS-M
   alignment, and the UI/code contract. Verifiers wrote their own enumerators (and in
   several cases server-rendered the component and swept the emitted DOM) rather than
   trusting the lesson's helpers.
4. **Repair and re-verification** where must-fix findings were reported, then a final
   pass by hand in the main session for the findings that survived.

A verifier that failed to return was treated as **no verification at all**, never as
a pass — the first run of this workflow was discarded for exactly that reason.

## 2. What the verification caught

These are defects that every mechanical gate in the repo passed. They are the reason
this step is not ceremonial:

| Class | Example |
|---|---|
| A claim false in most states | A budget card printed a derivation whose answer disagreed with it in 15,876 of 21,000 states |
| Arithmetic from rounded operands | Four probability cards broke the addition rule in 20 of 63 states because `toFixed(2)` resolved exact ties by IEEE-754 |
| A false mathematical statement | A Math check asserted the *converse* of the coordinate rule; a trig lesson said a wheel "rises quickly near the bottom" (it is stationary there) |
| Wrong number-kind vocabulary | Negative quotients described as "one whole number divided by another" (CCSS defines rational over the **integers**, 7.NS.A.2d) |
| A figure that does not do what the text says | A graph pixel-identical across all 72 price settings; a drone segment vanishing in 9.8% of states; residual gaps invisible at default |
| A tautological test | Assertions of the form `helper(x) === helper(x)`, which certify nothing — treated as must-fix |
| An ambiguous assessment item | A "Try it" whose stem admitted two true answers |
| Copy that names two different objects | A Math check binding "the rule" to two incompatible panels, false in 90 of 96 states |

Where a fix was applied by hand, the guard added with it was **mutation-tested**:
the defect was re-introduced and the suite confirmed to fail, then reverted.

## 3. Per-lesson outcome

All 35 verified. "after repair" = the adversarial reviewer found must-fix defects that
were fixed and re-verified.

| Course | Lesson | Standards developed | Outcome |
|---|---|---|---|
| P6 · Ch 01 | `ca-g6-ch01-ratios-rates-percent-reasoning` | 6.RP.A.1, 6.RP.A.3, 6.RP.A.2 | verified after repair + main-session fix (plural agreement at a=1; guard mutation-tested) |
| P6 · Ch 02 | `ca-g6-ch02-rational-numbers-number-line` | 6.NS.C.6, 6.NS.C.7, 6.NS.C.5, 6.NS.C.8, 6.NS.B.4, 6.NS.A.1 | verified after repair + main-session fix (planeNote state-derived; 625-pair guard mutation-tested) |
| P6 · Ch 03 | `ca-g6-ch03-expressions-equations-variables` | 6.EE.A.1, 6.EE.A.2, 6.EE.A.3, 6.EE.A.4, 6.EE.B.5, 6.EE.B.6, 6.EE.B.7, 6.EE.B.8, 6.EE.C.9 | verified after repair + main-session fix (Math check now names each panel; 96-state guard) |
| P6 · Ch 04 | `ca-g6-ch04-geometry-area-surface-area` | 6.G.A.1, 6.G.A.4, 6.G.A.2, 6.G.A.3 | verified after repair (full grid) |
| P6 · Ch 05 | `ca-g6-ch05-statistics-data-distributions` | 6.SP.A.2, 6.SP.A.1, 6.SP.A.3, 6.SP.B.5, 6.SP.B.4 | verified after repair (72-state grid) |
| S1 · Ch 01 | `ca-g7-ch01-proportional-relationships` | 7.RP.A.2, 7.RP.A.1, 7.RP.A.3 | verified (after pre-repair of 7 earlier must-fix; 1,344-state sweep) |
| S1 · Ch 02 | `ca-g7-ch02-operations-rational-numbers` | 7.NS.A.1, 7.NS.A.2, 7.NS.A.3 | verified after repair (324 figure states / 8,100 UI states) |
| S1 · Ch 03 | `ca-g7-ch03-linear-expressions-equations` | 7.EE.A.1, 7.EE.A.2, 7.EE.B.4, 7.EE.B.3 | verified after repair (21,000-state grid, enumerated twice) |
| S1 · Ch 04 | `ca-g7-ch04-scale-geometry-measurement` | 7.G.A.1, 7.G.B.4, 7.G.B.6 | verified after repair (1,320-state sweep) |
| S1 · Ch 05 | `ca-g7-ch05-sampling-probability-inference` | 7.SP.A.1, 7.SP.A.2, 7.SP.B.3, 7.SP.B.4, 7.SP.C.5, 7.SP.C.6, 7.SP.C.7, 7.SP.C.8 | verified (7,800 rendered DOM states + 60 mutation runs) |
| S2 · Ch 01 | `ca-g8-ch01-linear-equations-systems-readiness` | 8.EE.C.7, 8.EE.C.8, 8.NS.A.1, 8.NS.A.2 | verified after repair + main-session fix (whole number -> integer per 7.NS.A.2d; regex hole closed; 2 mutations caught) |
| S2 · Ch 02 | `ca-g8-ch02-functions-rate-change` | 8.F.B.4, 8.F.A.3, 8.EE.B.5, 8.EE.B.6, 8.F.A.1, 8.F.A.2 | verified after repair (882-state grid; label collision fixed) |
| S2 · Ch 03 | `ca-g8-ch03-transformations-similarity` | 8.G.A.1, 8.G.A.4, 8.G.A.3, 8.G.A.2, 8.G.A.5 | verified after repair (735-state grid; fmt rounding fixed) |
| S2 · Ch 04 | `ca-g8-ch04-pythagorean-reasoning-coordinate-geometry` | 8.G.B.8, 8.G.B.7, 8.EE.A.2 | verified after repair (6,561-state grid; label collision fixed) |
| S2 · Ch 05 | `ca-g8-ch05-bivariate-data-claims` | 8.SP.A.1, 8.SP.A.2, 8.SP.A.3, 8.SP.A.4 | verified (308-state grid) |
| S3 · Ch 01 | `ca-g9-ch01-equations-context` | A-CED.1, A-CED.2, A-CED.3, A-CED.4 | verified (25,515-state grid) |
| S3 · Ch 02 | `ca-g9-ch02-function-notation-interpretation` | F-IF.2, F-IF.1, F-IF.3, F-IF.4, F-IF.5, F-IF.6 | verified (full grid, twice) |
| S3 · Ch 03 | `ca-g9-ch03-linear-quadratic-models` | A-REI.11, A-REI.7, A-REI.4, A-REI.10, A-SSE.3, A-SSE.1, A-REI.1, A-REI.3, A-SSE.2 | verified after repair (23,940-state grid; vanishing segment fixed) |
| S3 · Ch 04 | `ca-g9-ch04-coordinate-geometry-methods` | G-GPE.1, G-GPE.7, G-GPE.5, G-GPE.6, G-GPE.4 | verified after repair (63-state grid; dy=0 right-triangle claim fixed) |
| S3 · Ch 05 | `ca-g9-ch05-modeling-evidence` | S-ID.6, S-ID.7, S-ID.8, S-ID.1, S-ID.3, S-ID.9 | verified after repair (252-state grid; residual gaps made visible) |
| S4 · Ch 01 | `ca-g10-ch01-congruence-proof` | G-CO.6, G-CO.7, G-CO.8, G-CO.2, G-CO.4, G-CO.5 | verified (64-state grid) |
| S4 · Ch 02 | `ca-g10-ch02-similarity-right-triangle-reasoning` | G-SRT.1, G-SRT.6, G-SRT.3, G-SRT.5, G-SRT.8, G-SRT.7, G-SRT.2, G-SRT.9 | verified (18-state grid, two passes) |
| S4 · Ch 03 | `ca-g10-ch03-circle-geometry` | G-C.5, G-C.1, G-GMD.1, G-GMD.3, G-GMD.4 | verified after repair (63-state grid; similarity over-claim scoped to lengths) |
| S4 · Ch 04 | `ca-g10-ch04-quadratic-structure` | A-SSE.1, A-SSE.2, A-SSE.3 | verified after repair + main-session fix (narration no longer calls the revenue parabola upward-opening) |
| S4 · Ch 05 | `ca-g10-ch05-conditional-probability` | S-CP.3, S-CP.6, S-CP.4, S-CP.7, S-CP.8, S-CP.1, S-CP.2, S-CP.5, S-CP.9 | verified after repair + main-session fix (integer half-up rounding restores the addition rule in 20/63 states; two-way table now testable, 3 mutants caught) |
| S5 · Ch 01 | `ca-g11-ch01-function-transformations-inverses` | F-BF.3, F-BF.4, F-BF.5, F-IF.7, F-IF.8, F-BF.1 | verified after repair (882-state grid; mirror claim state-derived) |
| S5 · Ch 02 | `ca-g11-ch02-exponential-logarithmic-models` | F-LE.1, F-LE.2, F-LE.3, F-LE.4, F-LE.5 | verified after repair (825-state grid; aria-label marker claim fixed) |
| S5 · Ch 03 | `ca-g11-ch03-trigonometric-functions-graphs` | F-TF.2, F-TF.1, F-TF.3, F-TF.4, F-TF.5, F-TF.6, F-TF.7, F-TF.8, F-TF.9 | verified after repair + main-session fix (opening prose said the wheel is fast at the bottom; it is flat at both extremes) |
| S5 · Ch 04 | `ca-g11-ch04-data-modeling-residuals` | S-ID.6, S-ID.1, S-ID.2, S-ID.3, S-ID.7 | verified after repair (360-state grid; outlier claim state-derived) |
| S5 · Ch 05 | `ca-g11-ch05-statistical-inference-claims` | S-IC.1, S-IC.4, S-IC.2, S-IC.3, S-IC.5, S-IC.6 | verified after repair + main-session fix (band now claim-independent seNull, matches its own words and verdict rule) |
| S6 · Ch 01 | `ca-g12-ch01-quantities-units-precision` | N-Q.1, N-Q.2, N-Q.3 | verified after repair + main-session fix (Try-it stem had two true answers; now asks for the exact set) |
| S6 · Ch 02 | `ca-g12-ch02-polynomial-structure-behavior` | A-APR.3, A-APR.2, A-APR.1, N-CN.9, N-CN.7, N-CN.8, N-CN.3, N-CN.4, N-CN.1 | verified after repair + main-session fix (zero-sum brackets, near-zeros vertical scale + tail clipping, generic letters disambiguated) |
| S6 · Ch 03 | `ca-g12-ch03-decision-statistics` | S-MD.2, S-MD.1, S-MD.3, S-MD.4, S-MD.5, S-MD.6, S-MD.7 | verified (450 readout states) |
| S6 · Ch 04 | `ca-g12-ch04-function-analysis-rates` | F-IF.6, F-IF.4, F-IF.9, F-IF.1, F-IF.2, F-IF.3, F-IF.5, F-IF.7, F-IF.8 | verified after repair (63-state grid; average-rate step fixed) |
| S6 · Ch 05 | `ca-g12-ch05-capstone-modeling` | N-VM.12, N-VM.11, G-MG.2, G-MG.1, G-MG.3, N-VM.1, N-VM.2, N-VM.4, N-VM.5, N-VM.3 | verified after repair (2,800 states; false determinant theorem removed) |

## 4. Gate results on this branch

| Gate | Result |
|---|---|
| `tsc --noEmit` (whole project) | clean |
| 35 per-lesson math harnesses | 35/35 pass |
| `npm run test:components` (discovers all `components/**/*.test.ts`) | pass |
| `npm run test:ccss-textbook` (class audit + assignment contract) | pass |
| `npm run test:lesson-menu` | pass |
| `npm run check:imports` | pass |
| `npm run audit:lesson-illustrations` | pass |
| `node scripts/audit-ca-translations.mjs` (US English-only) | 0 violations |
| `scripts/audit-ccss-lesson-classes.mjs` | 356 files clean |
| `scripts/audit-ccss-lesson-interaction.mjs` | no findings on any new lesson |
| Browser, `/student/lessons/california-middle-school-textbook` | 15 chapters, 15 hydrated openers, 45 chapter checks, 0 images |
| Browser, `/lesson/california-high-school-textbook/review` | 20 chapters, 20 hydrated openers, noindex + review-only banner intact, 0 images |

Pre-existing failures on `main` that this branch does not touch and does not fix:
`lib/californiaGradeAware.test.ts` (2) and `tests/e2e/math-diagram-source-geometry.test.ts` (3)
fail identically on a clean `main` checkout under `tsx --test`, and
`scripts/audit-us-ca-lesson-content.mts` reports 695 findings on `main` as well.
None are CI gates.

## 5. What is NOT claimed

- The chapter-check questions are rendered on the textbook routes only. They are
  **not** in any live question-bank pack; promoting them runs through the
  A21 → A18 → A23 content chain.
- The high-school book stays review-only and noindex. This branch changes what the
  route renders, not its release status.
- Playwright e2e was not run on this host in this session; the four rewritten specs
  are updated to the new DOM but unexecuted here.
