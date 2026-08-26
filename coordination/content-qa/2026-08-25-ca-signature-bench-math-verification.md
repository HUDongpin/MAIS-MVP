# California signature-bench mathematical verification — 2026-08-25

Scope: every signature bench serving the California curriculum on branch
`claude/ca-codex-viz-replacement` (PR #143), before merge. Trigger: the Phase-1
lesson-embed flip promotes these benches into all 76 CA lessons, and
`check:port-drift` (run against the relocated upstream at
`/Volumes/Starship/Claude Math Visual`) showed 44 benches locally edited since
the 2026-07-25 manifest — almost all in commit `9031f8a619`
("close California lab presentation slice", 2026-08-22), plus small July/August
fix commits (`a5118ceea0`, `ef83780635`, `04d6ce7151`).

## What was verified

1. **All 192 `audit-*.mjs` math proofs** run green on this branch (aggregate
   3,828,342 counted checks, 0 failures, gate exit 0). Audit coverage is 1:1
   with the 192 benches.
2. **Audit-tamper check** on the review commit: it touched exactly two audits —
   `audit-conditional.mjs` (one structural regex renamed `S.cAB` → `scene.cAB`,
   matching a drawing-code refactor; verified against the bench diff) and
   `audit-composingshapes.mjs` (+76 lines of genuinely independent assertions:
   a `seamEdgesOf` differential oracle over all arrangements, not code echoes).
3. **All 44 locally-edited bench diffs reviewed hunk-by-hunk** (five parallel
   reviewers + spot adjudication) against the rubric: (A) presentation/layout,
   (B) displayed mathematical text, (C) model/lesson logic. 41 verified safe —
   overwhelmingly 44px touch targets, responsive canvas layouts, deferred label
   painting, keyboard editors mirroring pointer-path invariants, and
   contrast/solid-color styling. Notable positives: EllipseLab's hover fix is
   the exact inverse of the parametric direction (max error ~9e-14° across a
   full a/b/θ sweep); SineFunctionLab's MATCH_RMS 0.1→0.03 tightening is
   conservative (grid-wide minimum one-dial-step miss is 0.0921);
   VarianceLab's new MAX_STACK drag cap leaves every calibration target
   reachable; statistics semantics (population variance ÷n², exact-rational
   median, mode as max-frequency set) are unchanged everywhere.
4. **Model-region overlap scan**: only TwoStepLab's diff intersects a
   `MODEL:START…END` region — it names the pre-existing 0–60 scale as
   constants and adds input clamping that contains every legitimate answer and
   named-wrong-answer; `estimateOf`, `BAND`, and the calibration are untouched.

## Defects found and fixed (this commit)

- **DataLab** — the edited "Spread, and the outlier trap" step claimed "the
  gold mode does not move at all", which the lab's own `START_DATA =
  [2,3,4,4,5,5,5,6,7,8]` falsifies (moving a modal 5 changes the mode set to
  [4,5] or [4,5,6]); the text also dropped the "(mean)" identification of the
  carmine fulcrum. Rewritten to the qualified, true statement and the mean
  label restored. Quiz key and feedback were already correct and are unchanged.
- **TeenNumbersLab** — the new "Said aloud: ‹word›" card (`lastSpoken`) was
  never cleared, so it could read "fourteen" beside a canvas showing seventeen
  — the exact card-vs-canvas mismatch the file's own comments forbid. An effect
  keyed on `displayValue` now retires the card the moment the displayed number
  changes (it persists only while still true).
- **SineFunctionLab** — comment-only: the recorded one-dial-step miss margin
  said "~0.046"; the true figure is ~0.092 (closed form 2·|A|·sin(π/24)/√2;
  `audit-sine.mjs` prints the grid-wide minimum 0.0921). The threshold itself
  was and remains correct.

## Non-blocking observations (recorded, not churned)

- SubtractionLab/NumberBondLab deferred-label passes paint opaque backing
  rects/strokes that can clip short count-back arcs / fan bars on narrow
  layouts — rendering nuance, not math; leave to the visual-polish stream.
- LengthComparisonLab: JS `GOLD` (#74520b) and CSS `--gold` (#b98718) now
  differ — cosmetic.
- CongruenceLab's new side buttons print every `d²`, making the alibi directly
  readable — a pedagogy/difficulty trade-off, not an error.
- BoxPlotLab `moveEditedPoint` calls `setEditValue` outside the updater —
  currently unreachable drift, guarded by the disabled states.

## Manifest

`port-manifest.json` re-recorded (`check:port-drift -- --write` against the
relocated library) so the reviewed state is the baseline: any further local
bench edit re-flags as PORTED FILE EDITED LOCALLY. The persistent
"PORT CONTENT MISMATCH (44)" category is the accurate record that these 44
benches now intentionally extend upstream (responsive/keyboard/contrast work);
QuadraticEquationLab remains whitespace-only.

Post-fix gates: all 192 audits green (DataLab audit 191,192 checks;
TeenNumbers 46,855; sine PASS 1926), `test:signature-labs` green,
`tsc --noEmit` clean, `test:components` 384 pass, `test:visualizations` 163
pass.
