# California Math lesson-page content QA — round 18

- Date: 2026-08-09
- Worktree: `/Volumes/Starship/MAIS-ca-content-qa-wt`
- Branch: `content/us-ca-math-lesson-qa`
- Baseline HEAD inspected: `295b8c2929a30aaacb096bec1d7bcf6e44044ff1`
- Verified artifact: the **uncommitted working-tree snapshot based on that
  HEAD**; HEAD by itself is not the tested artifact
Roles borrowed: A05 lesson implementation, A11 regression quality, A18 curriculum/content QA, A22 browser-gate reliability

## Decision status

**PASS for the defined authenticated-student-visible working-tree snapshot.**

After the final TypeScript check, production build, diff check, authenticated
browser gates, and current-source audits passed, this round found **zero
unresolved displayed-content findings** across the 76 California student lesson
routes under the enumerated current-source/current-render QA gates.

The terminal claim in this round is deliberately narrower than “the entire
California curriculum is complete.” The gate can establish that the **current
student-visible lesson-page render** has zero findings under the defined current-
source QA standard. It cannot turn hidden blocks, quarantined features, a
five-question checkpoint sample, or intentionally English-first copy into
verified displayed content.

## QA standard used

This pass applies the same families of controls expected in large digital-
learning content operations:

1. **Standards and instructional alignment** — reconstruct the actual California
   route-to-seed-to-CCSS-component render path; check the stated standard,
   representation, explanation, example, and task against current California
   Common Core resources and the California Mathematics Framework.
2. **Mathematical correctness** — recompute answers and formulas from the
   mathematical prompt/source rather than treating generation metadata as proof;
   test equality versus approximation, units, domains, sign conventions,
   singular/degenerate states, graph data, coordinates, and figure/equation
   agreement.
3. **Language and pedagogy** — read learner-facing prose, accessible names,
   captions, instructions, readouts, narration, and checkpoint feedback for
   grammatical sense, precise terminology, developmental fit, and state-aware
   singular/plural wording. Developmental fit here rests on cumulative human and
   source review plus targeted grammar/state checks; it is not an automated
   readability certification.
4. **Interaction correctness** — drive every discoverable directional numeric
   family to both finite extremes, fill bounded range and number inputs at both
   endpoints, and exercise 28 targeted semantic contracts plus selected choice
   and select probes; inspect zero, one, equality, overlap, coincident, singular,
   invalid, and maximum states; require a reachable bound and truthful disabled
   state for directional numeric controls. This is not exhaustive combinatorial
   coverage of every possible control-state permutation.
5. **Accessibility and responsive rendering** — authenticate into the actual
   lesson, assert the exact route, test desktop and mobile, reject horizontal
   overflow, require figure names to follow figure state, and check that drawn
   geometry remains inside its SVG viewBox.
6. **Assessment integrity** — validate every linked question, exact displayed
   checkpoint selection, multiple-choice uniqueness, free-entry equivalence,
   semantic units, narration, and deterministic data-derived graph.
7. **Regression and evidence integrity** — prove new gates against a RED state,
   rerun after each repair, separate product defects from harness/infrastructure
   defects, reject partial/stopped runs, and retain non-display reds as explicit
   residuals instead of calling them green.

Primary external references:

- California Department of Education, Common Core State Standards resources:
  <https://www.cde.ca.gov/re/cc/mathresources.asp>
- California Department of Education, Mathematics Framework Chapter 13:
  <https://www.cde.ca.gov/ci/ma/cf/documents/mathframeworkch13.pdf>
- WCAG 2.2, Name, Role, Value:
  <https://www.w3.org/WAI/WCAG22/Understanding/name-role-value>

## Current route, render, and linked-source inventory

The inventory was rebuilt from executable current data and the production
renderer, not inferred from filenames or an earlier report.

| Surface | Current count | Exact interpretation |
| --- | ---: | --- |
| California lesson routes | 76 | All authenticated student lesson routes |
| Seeded lesson blocks | 538 | 286 interactive + 12 concept + 12 worked example + 76 checklist + 76 extension + 76 teacher guide |
| Authenticated-student-rendered body/checklist blocks | 386 | 286 interactive + 12 concept + 12 worked example + 76 checklist |
| Unrendered extension blocks | 76 | Present in seeds, but not selected by the student renderer |
| Teacher/admin-only guide blocks | 76 | Present in seeds, role-gated away from students |
| Interactive CCSS occurrences | 286 | 114 K–G5 plus 172 P6–S6 occurrences |
| Unique interactive CCSS bodies | 270 | 112 K–G5 plus 158 P6–S6; every one is represented |
| Linked checkpoint questions | 608 | 271 free-entry plus 337 multiple-choice |
| Actual displayed checkpoint slots | 380 | Exactly five per route; renderer deduplicates, caps at five, and may substitute a handwriting-capable item |
| Nonempty seed `content` fields checked for speech normalization | 386 | 286 interactive + 12 concept + 12 worked example + 76 hidden teacher guide; this is not the displayed-block count or proof of 386 audio players |
| Rendered concept audio players | 298 | 286 interactive narrations + 12 concept narrations; worked examples use visible content without this player |
| Deterministic displayed graph checkpoints | 9 | Across four real lesson routes |

The distinction between **608 linked questions** and **380 displayed slots** is
hard. This report does not call all 608 simultaneously displayed. The numerical
coincidence between 386 student-rendered blocks and 386 nonempty seed `content`
fields is also not a shared population: checklists are student-rendered but store
text in `items`, while teacher guides are student-hidden but have `content`.

## Iterative defects found and repaired

### Interactive lesson bodies

The current-source review covered all 270 represented CCSS lesson bodies and
their reachable control states.

- The K–G5 adversarial pass repaired 26 component findings. These included the
  undefined literal `n` in fraction-by-whole work, an incorrect clock-position
  convention at 12, state-aware singular/plural wording, subject–verb
  agreement, missing JSX spaces, and accessible-name corrections.
- The P6–S6 adversarial pass repaired five late mathematical/state defects:
  mutually exclusive events now draw disjoint circles; signed complex operands
  are parenthesized; the parabola equation, axes, vertex, focus, directrix, and
  hyperbola locus agree; singular matrices no longer instruct learners to use a
  nonexistent inverse; and a zero vector renders as a point without invented
  direction geometry.
- A separate current-snapshot recheck reopened 18 earlier dynamic-state and
  diagram findings: triangle sine-area reasoning, conjugate powers, zero-trial
  probability, degenerate distance states, triangle/prism altitude geometry,
  cube cross-sections, the hyperbola locus, signed/zero vector operations,
  signed equation steps, scientific notation, the addition rule, decimal-mode
  headings, axes/origin language, exponential-window wording, fixed-phase sine
  modeling, rectangle symmetry, and signed matrix work. Result: **18 resolved,
  0 still present**, with current source assertions and targeted semantic-state
  probes for every item.
- Earlier repairs retained by the final snapshot cover exact-versus-rounded
  notation, graph/coordinate consistency, proof conditions, probability bounds,
  signed algebra, figure clipping, zero/undefined states, dynamic captions, and
  learner-facing narration conditions.

### Late authenticated-browser findings

The browser sweep continued the loop instead of treating earlier static green
results as terminal:

1. Three lazy interactive components produced server/client ID-prefix mismatch
   errors on real routes. `useId()` was replaced by component-slug-namespaced
   constants in `missing-addend`, `estimate-compare-length`, and
   `write-expressions`; all three routes then hydrated without a console error.
2. `two-way-tables` allowed every cell count to increase forever. A RED source
   contract and browser semantic contract were added; cells now clamp to 0–99,
   and the correct decrease/increase control disables at each endpoint.
3. `expected-value` allowed all four payoffs to increase or decrease forever.
   A RED contract first failed, then the lesson was bounded to −20 through 20,
   with clamped updates, visible range copy, and truthful disabled controls. The
   authenticated route then reached both extremes in 14 traversals / 285 presses
   with zero findings.

### Browser-gate defects kept separate from content defects

- The control classifier did not recognize “by one tenth” as a coarse step, so
  it falsely treated a correct 9,999-range decimal control as nonconvergent. The
  runtime and figure-bounds gates now rank that label as a coarse step.
- The label-motion and figure-bounds gates waited for `networkidle`, although
  Next background requests are unrelated to figure readiness. This was proved
  RED in a new two-gate source contract. Both now wait for `domcontentloaded`
  and then explicitly wait for a real `svg[role=img|group]`; the contract and
  syntax checks are green.
- The first all-route bounds rerun emitted 75 invalid non-convergence findings:
  that gate still used a 1,200 ms click timeout while the already-proven runtime
  driver used 4,000 ms. A RED source contract was added and the timeout aligned.
  The next run narrowed the result to two controls whose Playwright call logs
  said the element was not stable. Source reconstruction proved both controls'
  clamps and disabled conditions; focused runs showed entrance/layout motion,
  not mathematical non-convergence. The geometry gate now uses the proven
  three-second post-hydration settle, reduced motion, and an exact ordered check
  of every assigned `[data-ccss-lesson]` root before traversal. Its six source
  contracts and final all-route rerun are green.

These are reported because a false red or a gate that cannot finish is not
evidence about content. They are not counted as learner-facing defects.

### Checkpoints, grading, narration, and visualization

- All 35 Grade 1 checkpoint constructs repaired in the current pack remain
  covered by dedicated tests.
- S5 Chapter 4 uses five distinct statistics/data-display checkpoint constructs
  rather than repeated surface variants.
- Nine displayed graph checkpoints are deterministic, data-derived SVGs whose
  points, axes, labels, and answers are checked on desktop and mobile.
- Unit-sensitive free-entry grading is semantic rather than substring-based;
  the current alias inventory contains 96 question IDs.
- Generic visualization blocks are **quarantined, not declared fixed**. The
  California visualization allowlist is empty, the lesson seed omits those
  blocks, and the directory does not fabricate a preview.

## Final evidence

### Authenticated rendered-state coverage

| Gate | Desktop result | Mobile 390×844 | Result |
| --- | ---: | ---: | --- |
| All-route runtime sweep | 76 pages at 1280×900 | 76 pages | 0 findings |
| Directional traversals | 929 | 929 | Every tested directional family reached disabled bounds |
| Directional presses | 17,089 | 17,257 | 34,346 total successful presses |
| Range endpoints | 110 | 110 | 220 total |
| Number-input endpoints | 92 | 92 | 184 total |
| Targeted semantic states | 28 contracts at 1280×900 | 28 contracts | 0 findings at both viewports |
| Deterministic checkpoint graphs | 9 graphs / 4 routes at 1280×900 | 9 graphs / 4 routes | 0 findings at both viewports |
| Dynamic figure labels | 76 requested / 76 inspected at 1280×1100 | Not repeated; mobile state/overflow covered above | Every inspected accessible figure whose SVG text changed during the state-family probe also changed its accessible name |
| SVG figure bounds at both extremes | 76/76 routes; 286/286 assigned roots; 940 directional controls / 20,241 presses / 110 range endpoints / 92 number-input endpoints at 1280×1100 | Not repeated | 0 non-clipped shape overflows with 3 px slack; reduced motion used only for this geometry measurement |

The four successful desktop batches were:

- pages 1–19: 198 traversals / 6,741 presses / 24 range endpoints;
- pages 20–38: 181 / 4,760 / 12 range / 22 number endpoints;
- pages 39–57: 260 / 2,864 / 26 range / 32 number endpoints;
- pages 58–76: 290 / 2,724 / 48 range / 38 number endpoints.

The four successful mobile batches were:

- pages 1–19: 198 traversals / 6,909 presses / 24 range endpoints;
- pages 20–38: 181 / 4,760 / 12 range / 22 number endpoints;
- pages 39–57: 260 / 2,864 / 26 range / 32 number endpoints;
- pages 58–76: 290 / 2,724 / 48 range / 38 number endpoints.

Stopped, failed, pre-repair, and harness-invalid runs are excluded from those
totals.

The bounds gate inspected non-clipped `circle`, `rect`, `polygon`, `polyline`,
`line`, `path`, and `ellipse` geometry against each figure's own viewBox with a
three-pixel measurement allowance. It used reduced motion only to isolate
endpoint geometry after the complete assigned lesson-root sequence mounted;
the ordinary-motion usability and state transitions were exercised separately
by the desktop and mobile runtime gates. Neither the label gate nor the bounds
gate claims exhaustive coverage of every choice, select, pointer, or
combinatorial state.

### Static, unit, and generator evidence

| Gate | Result |
| --- | --- |
| K–G5 focused current-source suites | 28/28 passed |
| P6–S6 semantic/state suites | 28/28 passed |
| Exact displayed repair regression bundle | 69/69 passed |
| Displayed five-question surface + strict grading | 18/18 passed |
| California lesson seed contracts | 13/13 passed |
| Lesson content audit | 76 seeds / 538 seeded blocks / 0 configured arithmetic, copy, or typography findings |
| Checkpoint grading audit | 271 free-entry + 337 multiple-choice / 0 matcher-contract findings |
| Read-aloud audit | 608 linked questions + 386 blocks with nonempty `content` fields / 0 configured silent-token or exposed-syntax findings |
| Illustration audit | 2 records load, retain proportions, and are described; both unreachable |
| Static interaction audit | 270 unique interactive sources / 0 configured source-contract findings |
| Textbook class audit | 278 files clean |
| Textbook assignment contracts | 8/8 passed |
| Interaction-auditor self-test | 2/2 passed |
| Browser navigation/harness contracts | 6/6 passed |
| Number inputs missing a min or max | 0 |
| Range inputs missing a min or max | 0 |
| Directional aria controls missing `disabled` semantics | 0 |
| Generator run 1 | 810 questions / 62 topics |
| Generator run 2 | byte-identical to run 1 |
| Generator source hash | `4dab0a4a2434593de72b11f8dc5b091003a45231f0a2ad30f57bda0330511bba` |
| Generated pack hash | `7db5501a62a2913f505cb277e47bbdd1f6816b2c7921c569471c3bdcd051b21e` |
| TypeScript | Passed; exit 0 |
| Production build | Passed; 236/236 static pages generated; exit 0 |
| Diff whitespace | Passed; exit 0 |

## Explicit non-display boundaries and residuals

These facts remain visible so “zero displayed findings” is not inflated into a
broader claim:

1. **English-first contract.** Identical English/Traditional Chinese/Simplified
   Chinese values are intentional under the current product boundary and are
   not classified as a defect here. This is not a claim of full localization.
2. **Five-question sample.** The current checkpoint is not comprehensive: 51 of
   76 pages omit at least one linked standard from the sample, and 50 omit at
   least one component source. The sample was checked for correctness, not
   called full coverage.
3. **Hidden blocks.** Seventy-six extension blocks are not selected by the
   current student renderer, and 76 teacher-guide blocks are role-gated to
   teacher/admin users. Both populations are outside the authenticated-student-
   displayed terminal claim.
4. **Unreachable illustrations.** The two registered California illustration
   records cannot render because their page has no corresponding block. Twelve
   of 76 pages have a block type capable of rendering an illustration. The
   unreachable records are asset/integration debt, not displayed false content.
5. **Visualization quarantine.** No generic California visualization block is
   displayed. This prevents known fabricated/mismatched previews from reaching
   learners; it does not verify the quarantined labs.
6. **Depth gate.** `npm run test:ccss-depth` retains three expected non-display
   reds caused by the visualization quarantine: 322 real-visual lessons versus
   a floor of 329; 62 paper-only lessons versus a ceiling of 50; and 26 Grade 8
   real-visual lessons versus a floor of 28. The run reported 4 passed, 3 failed,
   and 1 skipped test. These inventory thresholds are not assertions about the
   correctness of the currently displayed California lesson content.
7. **Pre-existing cross-surface test drift.** A broad run of
   `data/usCaliforniaLessons.test.ts` plus `lib/californiaGradeAware.test.ts`
   passes 16/18. The two failures are unchanged at HEAD: a test requires the
   absent identifier `defaultUnitedStatesLoginGrade`, and another requires a
   candidate-only seed although the current inventory has none. All 13 actual
   California lesson-page seed tests pass; neither red describes displayed
   lesson content.
8. **Independent-verification metadata debt.** A current-source probe resolved
   all 608 linked questions and found that every
   `independentVerification.answer` value is identical to the stored answer.
   For the 464 `ccss-textbook-practice-v1` records, the verification solution is
   also identical to the stored solution; the other two batches do not share
   identical solution text. These fields therefore do not prove an independent
   second derivation. This report does not use them as correctness evidence;
   correctness rests on source/human review plus the current semantic and
   grading gates.
9. **Readability boundary.** Language was reviewed cumulatively and challenged
   through targeted grammar, narration, state-copy, accessible-name, and
   developmental-fit checks. No separate normed readability score or formal
   age-level certification was performed.
10. **Regression-gate durability.** Three exact P6–S6 coverage artifacts are
    currently untracked and are not wired into a `package.json` script:
    `scripts/ccss-p6-s6-state-defects-a.test.mjs`,
    `scripts/ccss-p6-s6-student-state-corrections.test.mjs`, and
    `scripts/audit-us-ca-lesson-semantic-states.mjs`. Their direct current-
    snapshot runs are green, but repeatable release-gate durability requires
    including them in a reviewed package and wiring the intended command. No
    Git packaging was authorized in this round.

## Git and release state

- No file was staged, committed, branched, merged, rebased, pushed, reset,
  deleted, or reverted in this round.
- This report is local QA evidence only. It is not a release, deployment, live-
  site verification, or authorization to publish.
- The production build restored `next-env.d.ts` to its normal
  `.next/types/routes.d.ts` reference; the final file has no working-tree diff.
- A generated-artifact cleanup dry run found 9.2 GB across `.tmp` and `.next`.
  Cleanup was not applied because `.tmp` contains a Playwright HTML report that
  may be preservation evidence. Both paths remain ignored generated artifacts.

## Terminal determination

**PASS for the defined authenticated-student-visible working-tree snapshot.**

After iterative source, assessment, interaction, accessibility, desktop/mobile,
semantic-state, figure-label, geometry-bound, TypeScript, build, and diff gates,
there are **zero unresolved displayed-content findings** on the 76 California
student lesson routes under the enumerated current-source/current-render QA
standard. This is not a claim about teacher-only guides, unrendered extensions,
quarantined visualizations, linked-but-not-selected questions, full
localization, exhaustive combinatorial interaction states, copied independent-
verification metadata, production deployment, or live-site behavior.
