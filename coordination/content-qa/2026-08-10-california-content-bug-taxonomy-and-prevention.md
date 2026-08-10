# California Math content bug taxonomy and similar-bug prevention

- Date: 2026-08-10
- Worktree: `/Volumes/Starship/MAIS-ca-content-qa-wt`
- Branch: `content/us-ca-math-lesson-qa`
- Roles borrowed: A05 lesson implementation, A11 regression quality, A18 curriculum/content QA, A21 content generation, A22 browser/build-gate reliability
- Evidence base: the available California lesson-page QA reports through Round 18,
  plus a fresh adversarial current-working-tree static/browser/build rerun

## Executive determination

The historical defects are not one undifferentiated class of “bad copy.” They
fall into **eleven recurring bug families** spanning mathematical truth,
standards alignment, dynamic state, diagrams, assessment, language,
accessibility, rendering, and QA-evidence integrity.

The current authenticated-student lesson-page snapshot has been rescanned by
those families. The first fresh static rerun found:

- 76 California lesson seeds and 538 seeded blocks: **0 configured content
  findings**;
- 270 unique interactive lesson implementations: **0 configured interaction or
  state-copy findings**;
- 608 linked checkpoint questions: **0 configured grading-contract findings**;
- 608 linked questions plus 386 blocks with nonempty `content` fields: **0
  configured read-aloud findings**;
- 2 illustration records: valid assets, proportions, and descriptions; both are
  unreachable and therefore not displayed;
- browser-gate navigation and interaction-auditor self-tests: **8/8 passed**.

That green result was not treated as terminal. Independent adversarial scans
then found **three checkpoint findings plus 17 affected interactive-component
finding groups that the configured gates did not encode**:

- two prompts omitted mathematical conditions;
- one inverse-function sentence was malformed; and
- 17 interactive components had numeric-truth or precision-presentation defects.
  All 17 used the wrong equality/approximation relation for at least one
  reachable state; `correlation` additionally used hard-coded coefficients that
  did not match its plotted points, and `compare-populations` additionally used
  a hard-coded spread almost twice its actual mean absolute deviation. Several
  component groups therefore contain more than one closely related defect.

All 20 finding groups were repaired in the authoritative source/current
generated pack or the rendered interactive component. A related large-number
estimate card was also
clarified so the arithmetic between its displayed rounded operands uses `=`,
while surrounding prose continues to call the result an estimate of the
original operands. That clarification is not counted as a confirmed defect
because the prior presentation was semantically ambiguous rather than false.

The post-repair result is **zero unresolved authenticated-student-displayed
content findings under the enumerated current-snapshot gates**. This is a
bounded evidence claim, not a proof over every possible multi-control state or
over content that the current renderer does not display.

Round 18 records the earlier authenticated all-route desktop/mobile runtime,
figure-label, figure-bounds, TypeScript, and production-build baseline. This
follow-up adds those repairs, expands the explicit static manifest from 110 to
119 tests, expands the focused semantic-state browser gate from 28 to 46
contracts, and reruns that focused gate at desktop and mobile sizes, TypeScript,
and an isolated current-snapshot 236-page production build. The full 76-route
browser runtime/label/bounds sweep was not repeated after this final delta; the
Round 18 sweep remains the baseline for those broader browser dimensions.

This does not mean every historical report count can be added into one “bugs
fixed” total. Findings overlap across lenses and later rounds deliberately
reopened earlier repairs. Counts below are therefore evidence of prevalence,
not a deduplicated lifetime total.

There is no standalone Round 5 or Round 16 report in this worktree. Round 5 is
represented by the Round 6 report, and Round-16-era work is represented in the
Round 18 consolidation. The absent standalone files prevent an exact historical
instance total but do not create a gap in the fresh current-snapshot scan.

## Current adversarial findings and repairs

| Finding | Student-visible reproduction | Repair | New regression evidence |
| --- | --- | --- | --- |
| Dilation premise falsely universal | `us-ca-math-s2-chapter-03`, checkpoint slot 4: “A dilation changes a figure's size…” is false for scale factor 1 | Changed the authoritative prompt to “A non-unit dilation…” and made the explanation state the scale-factor condition; regenerated all locale-mirrored pack fields | Displayed checkpoint condition test |
| Margin-of-error condition omitted | `us-ca-math-s5-chapter-05`, checkpoint slot 4: increasing sample size does not by itself guarantee a smaller margin of error if confidence level/procedure or variability also changes | Prompt now holds confidence level and population variability fixed; explanation repeats the same-procedure/same-variability boundary | Displayed checkpoint statistics-condition test |
| Inverse-function sentence malformed | `us-ca-math-s5-chapter-01`, checkpoint slot 5: “The graph of f⁻¹ is f reflected…” equates a graph with an ungrammatical function fragment | Prompt now says “The graph of f⁻¹ is the graph of f reflected across…” | Exact displayed checkpoint copy test |
| Exact slope marked approximate | `us-ca-math-s2-chapter-02`, `slope-explorer`: reachable slope 1 displayed `1 ≈ 1.00`; horizontal slope displayed `0 ≈ 0.00` | This component compares `Number(slope.toFixed(2))` with the raw slope strictly and renders `=` only when they are equal, otherwise `≈` | Source contract plus authenticated state check: `2/3 ≈ 0.67` and `1 = 1.00` at desktop and mobile |

The three checkpoint tests and the original slope relation test were observed
RED before their production edits:

```text
data/usCaliforniaDisplayedCheckpointSemantics.test.ts  9 pass / 3 fail
scripts/ccss-p6-s6-semantic-corrections.test.mjs        4 pass / 1 fail
```

The independent numeric-truth/precision scan then reproduced related defects in
16 additional components. The shared number-presentation unit suite
started RED because its helper module did not exist; after implementation it
passed 3/3. The 16 component repairs were then exercised by exact-state source
enumerations and authenticated browser canaries:

| Components | Confirmed defect pattern or representative exact state |
| --- | --- |
| `correlation`, `compare-populations` | Replaced hard-coded correlation coefficients with values computed from the plotted points; replaced `spread = 2` with the actual MAD (`50/49 ≈ 1.0204`), then chose relations from the computed raw/displayed values |
| `coordinate-perimeter-area`, `trig-ratios` | integer coordinate measurements; `sin 30°`, `cos 60°`, and `tan 45°` |
| `solve-equations-steps`, `ratio-double-number-line` | non-integer quotients or rates whose rounded display is nevertheless exact |
| `volume-formulas`, `inverse-trig`, `linear-equations` | exact pyramid volumes, exact inverse-trig angles, and exact displayed solutions |
| `solve-right-triangles`, `interpret-expressions` | exact 45°/60° geometry and exact displayed growth/balance states |
| `round-decimals`, `exponential-vs-linear` | values already exact at the selected place and exact model comparisons |
| `complex-plane`, `divide-two-digit`, `trig-identities` | exact axis-state polar values, exact displayed quotients, and exact identity values |

All repaired relation text and accessible narration now derive from the same raw
numeric state. The shared predicate uses a scale-relative epsilon tolerance with
a unit-scale floor and is covered for the enumerated lesson ranges. It is not a
claim of exact ULP counting or of correctness for arbitrarily tiny magnitudes.

After all repairs:

```text
data/usCaliforniaDisplayedCheckpointSemantics.test.ts  12/12 pass
scripts/ccss-p6-s6-semantic-corrections.test.mjs        5/5 pass
components/lesson/ccss/numberPresentation.test.ts       3/3 pass
explicit Round 18-plus static manifest                  119/119 pass
authenticated semantic states, 1280×900                 46/46 pass
authenticated semantic states, 390×844                  46/46 pass
```

During the final independent challenge, the authoritative source changed ahead
of its generated pack and the parity gate correctly went RED with 34
`explanation.en` mismatches. A18 review approved 32 improved explanations and
found two that still omitted material scope:

- `compare-functions-q02` generalized rate-of-change/intercept comparison beyond
  the two linear functions in the lesson; it now explicitly names the linear
  scope and the y-intercept/starting-value feature; and
- `similarity-proofs-q03` said only “an altitude” in a right triangle; it now
  specifies the altitude from the right-angle vertex to the hypotenuse in the
  prompt, explanation, and matching lesson prose.

Those two source rows were repaired and the pack was regenerated rather than the
source being rolled back. The current generator also derives its declared grade
span from the grades actually emitted, and the parity audit now rejects any scope
other than K–Grade 12. These late parity/scope findings are reported separately
from the three checkpoint + 17 component groups; the categories overlap and are
not a deduplicated instance total.

The authoritative source regenerated 810 questions across 62 topics twice with
byte-identical output. The one-to-one audit now compares 270 source slugs × three
questions with 810 generated questions and reports zero core-field or inventory
mismatches. Current hashes are:

```text
source.json SHA-256         7dcf7e286606c1874a325442c7b68fb4a1053eccffc9d0d70fc91525b6ce7215
question-pack.json SHA-256  16d13e0d2f4b8144013bd4437ca4c60fc18e721948a2fb836b20adbf3869ae15
```

## Scope and visibility contract

The current seed inventory contains 538 blocks:

| Block type | Seeded | Authenticated-student treatment |
| --- | ---: | --- |
| `interactive-lesson` | 286 | Displayed |
| `concept` | 12 | Displayed |
| `worked-example` | 12 | Displayed |
| `checklist` | 76 | Displayed through the completion checklist |
| `extension` | 76 | Not selected by the current student renderer |
| `teacher-guide` | 76 | Teacher/admin role only |

The authenticated student renderer selects 386 seeded blocks: 286 interactive,
12 concept, 12 worked-example, and 76 checklist blocks. Each checklist surface
currently renders up to three authored checklist items. Extension blocks are not
selected, and teacher guides are role-gated. The 286 interactive occurrences
resolve to 270 unique lesson bodies because some bodies are reused. Every page
displays exactly five checkpoint slots, for 380 displayed slots in total, while
608 linked questions are audited.

The read-aloud audit's population of 386 content-bearing blocks is a different
set: 286 interactive + 12 concept + 12 worked-example + 76 student-hidden teacher
guides. It excludes checklists and extensions because their text is stored in
`items`, not in the block `content` field. The two populations happen to have the
same count and must not be treated as identical coverage.

## Prioritized taxonomy

| ID | Bug family | Typical severity | Student-visible symptom | Canonical prevention rule | Current displayed status |
| --- | --- | --- | --- | --- | --- |
| M1 | Mathematical truth, domain, and conditions | Critical | A rule, answer, or explanation is false in at least one reachable case | Re-derive independently; enumerate domain, boundary, singular, and degenerate cases | No displayed finding under the enumerated current-snapshot gates |
| M2 | Precision, sign, notation, and units | High | Rounded values are asserted equal, exact values are labelled approximate, signs are ambiguous, or units silently change | Preserve raw state; compare raw and displayed values with a tight exactness predicate; format signed operands; grade units semantically | No displayed finding under the enumerated current-snapshot gates |
| S1 | Standards, grade-band, and instructional alignment | High | The page teaches or assesses a different construct from the stated California standard | Trace route → seed → assigned body → checkpoint; compare the actual construct with the standard progression | No displayed finding under the enumerated current-snapshot gates |
| D1 | Dynamic state and boundary coherence | Critical–High | Copy, formula, result, or control becomes false at zero, one, equality, tie, max/min, or singular states | Treat each reachable state family as content; test both bounds and named semantic states | No finding in tested endpoints/named states; joint-state coverage is not combinatorially exhaustive |
| V1 | Diagram, graph, and equation consistency | Critical–High | The picture, accessible name, caption, or equation represents a different mathematical object | Derive all representations from one state; measure geometry and recompute depicted quantities | No displayed finding under the enumerated current-snapshot gates |
| I1 | Interaction semantics and operability | High | A control has no effect, never reaches a bound, lies about disabled state, or is pointer-only | Clamp state, expose truthful min/max/disabled semantics, traverse controls, and provide keyboard/button alternatives | No finding in enumerated controls/states; joint-state coverage is not combinatorially exhaustive |
| A1 | Assessment key, selection, and grading | Critical–High | Correct work is rejected, a wrong key is accepted, or the shown checkpoint differs from its promise | Independently solve every item; verify exact rendered selection and exactly one correct MC option | No displayed finding under the enumerated current-snapshot gates |
| L1 | Language, pedagogy, and state-aware copy | Medium–High | Generated prose is ungrammatical, generic, repetitive, or contradicts the current state | Author copy from the named construct/state; use quantity-aware grammar and targeted remediation | No displayed finding under the enumerated current-snapshot gates; house-style/localization review remains bounded |
| X1 | Accessibility, labels, and spoken mathematics | High | A learner hears an incomplete question or assistive text describes another state/figure | Generate visible and accessible descriptions from the same state; test narration in the actual utterance context | No displayed finding under the enumerated current-snapshot gates |
| R1 | Render-path and content-contract mismatch | High | The page promises a block it does not render, renders the wrong source, or keeps dead content | Reconstruct the production render path and classify every block as displayed, role-gated, data-only, or quarantined | No wrong displayed content under current routing; explicit non-display debt remains |
| Q1 | QA evidence integrity / false green | Critical process risk | A gate passes while checking the wrong page, a sample, an invalid metric, or evidence that cannot disagree | Prove every gate RED, assert exact population and landed route, fail on zero coverage, and retain refutations | Current direct gates pass; untracked wiring and clean-candidate packaging debt remains |

## M1 — Mathematical truth, domain, and conditions

### Historical signatures

- Universal claims omitted necessary conditions: the digit sum of a multiple of
  nine was said to always equal nine; a Fundamental Theorem of Algebra root-count
  statement omitted “counted with multiplicity”; a proper-fraction product claim
  ignored a reachable factor of one; geometric-series language needed the
  `r ≠ 1` condition.
- Reachable inputs exposed undefined mathematics: division by zero, empty-list
  recursion, singular matrices, zero-trial experimental probability, zero
  vectors, coincident points, and impossible negative story quantities.
- Text and calculation disagreed: exact divisibility still instructed rounding
  up; a perimeter-equals-area state reported different values; a conditional
  probability display shaded the wrong row; a mutually exclusive-events state
  drew an intersection.
- Round 11 independently re-solved 608 questions and found two incorrect stored
  results: `21` instead of `22`, and `31` instead of `31.4`.

### Root cause

The implementation was usually correct in the default state but the prose was
written as an unconditional theorem. Elsewhere, answer metadata was copied
rather than independently derived, so the strongest-looking verification field
could not disagree with the stored answer.

### Repair and prevention rule

1. Derive the answer or claim from the prompt, not from its stored key.
2. State every necessary domain condition beside the rule.
3. Include zero, one, equality, exact division, tie, empty, singular, coincident,
   and maximum/minimum states in the authored content contract.
4. For each state, compare prose, formula, result, figure, caption, accessible
   name, and feedback—not merely the numerical calculation.
5. Never treat copied `independentAnswer` or `independentSolution` metadata as a
   second solve.

## M2 — Precision, sign, notation, and units

### Historical signatures

- Rounded display numbers were fed back into later calculations, producing
  results such as `0.99` instead of an exact identity and wrong compound-interest
  or rational-exponent outputs.
- Relation symbols were wrong in both directions: rounded decimal output used
  `=`, while reachable exact values formatted with trailing zeros used `≈`.
- Raw signed operands produced expressions such as `−-5`, `x − -2`, `+ -2`, or
  `−5²`, where parentheses are mathematically necessary for the intended base.
- Floating-point residue displayed negative zero.
- The same page mixed `x` with `×`, `/` with `÷`, and numeral words with digits.
- Unit-rate orientation was reversed, and free-entry grading treated units as
  substrings rather than semantic aliases.

### Root cause

Formatting and mathematical state were coupled. A display-rounded string was
reused as a value, or JSX concatenated a negative number without a signed-
operand formatter. Unit and notation variants were handled by ad hoc string
matching.

### Repair and prevention rule

- Keep full-precision numeric state and round only at the final display layer.
- Compare the raw value with the displayed numeric value. Use `=` when they are
  equal within a scale-aware floating-point tolerance and `≈` when display
  rounding or estimation changes the value; never infer the relation merely
  from the presence of decimal places.
- Format a negative factor/base as `(−n)`; fold a negative addend into
  subtraction or show `+ (−n)` deliberately.
- Normalize `−0` to `0` at the display boundary.
- Select one notation appropriate to the grade and task, and apply it to prompt,
  worked steps, labels, narration, and answer feedback.
- Grade units through a question-specific alias contract, not a substring test.

## S1 — Standards, grade-band, and instructional alignment

### Historical signatures

- A unit-rate lesson used the inverse orientation of the named standard.
- Standard identifiers omitted cluster letters or failed the app's own registry.
- Thirty-nine of 64 lesson/checkpoint pairings claimed a linkage not supported by
  the selected questions.
- One Kindergarten item exceeded its own grade band and contradicted the lesson's
  stated pitfall.
- Section labels, topic descriptions, and generated “misconception watch” copy
  described only a subset—or a different rotated question-bank topic.

### Root cause

QA inspected metadata, filenames, or seed text rather than tracing what the
authenticated route actually renders. A technically valid question was treated
as aligned merely because it shared a broad domain label.

### Repair and prevention rule

- Resolve every route through its current seed, assignment registry, unique
  interactive body, and exact five-question renderer selection.
- Judge the mathematical construct, representation, and cognitive demand—not
  keyword overlap.
- Preserve California K–8 progression and high-school course/domain boundaries;
  never claim a standard from an unverified code.
- Record checkpoint sampling as sampling. Do not call five displayed questions
  comprehensive coverage of every linked standard or component.

## D1 — Dynamic state and boundary coherence

### Historical signatures

- State-dependent singular/plural and subject–verb errors appeared across many
  lessons (`1 cookies`, `1 feet`, `1 cent are`, and similar patterns).
- Tie handling used `indexOf(max)` and silently named only the first winner.
- Dependent probabilities were not reclamped after a parent probability changed.
- Graphs silently clamped values while prose described the unclamped prediction.
- Zero/one states were described as populated or directional when they were not.
- `two-way-tables` and `expected-value` controls were initially unbounded.
- A decimal-mode body changed while its heading remained fixed; matrix captions
  recommended an inverse even in singular states.

### Root cause

Copy and figures were authored for the initial state, while controls changed
only the central number. Local controls and multi-control combinations also
escaped static scans built around a single shared component.

### Repair and prevention rule

- Define semantic branches for zero, one, tie, equality, axis/origin, no-overlap,
  exact division, singular, and degenerate geometry.
- Drive every directional numeric family to both finite disabled endpoints.
- Exercise range and number inputs at both endpoints and test targeted joint
  states; single-control extremes are not enough for dependent state.
- Derive headings, explanations, figures, captions, labels, and MathCheck
  feedback from the same state object.
- Use exact quantity checks (`n === 1`) rather than suffix heuristics; “feet” is
  not a plural form created by appending `s`.

## V1 — Diagram, graph, and equation consistency

### Historical signatures

- A Grade 1 raster showed three conflicting totals in one illustration.
- Inscribed/circumscribed circles, triangle congruence marks, cross-sections,
  tape diagrams, Venn diagrams, vector arrows, histogram bin widths, and
  rotations contradicted their own labels or equations.
- A “360°” sector disappeared because coincident arc endpoints were treated as
  an empty path.
- A line/quadratic system claimed two intersections while one was clipped in a
  large part of its reachable state space.
- A labelled equilateral triangle was only isosceles; a trigonometry triangle
  ignored its slider; a parabola equation, origin, focus, directrix, and drawn
  locus used different coordinate assumptions.
- Obtuse triangles, markers, roofs, predictions, and graph elements could leave
  their viewBox.

### Root cause

The visible geometry was decorative or hard-coded while text and values were
dynamic. Some reviews checked the formula but not the coordinates; others
checked default geometry only.

### Repair and prevention rule

- Derive equation, sampled geometry, labels, caption, and accessible name from
  one state and coordinate transform.
- Recompute counts, lengths, slopes, areas, intersections, and loci represented
  by the SVG; never approve a diagram merely by visual resemblance.
- Audit every fixed-geometry implementation, not a filename sample.
- Measure all non-clipped shapes against their own viewBox at control extremes,
  after the full lesson sequence has mounted and layout motion has settled.
- Treat a full circle, zero vector, coincident point, tangent, and collapsed
  geometry as explicit drawing cases.

## I1 — Interaction semantics and operability

### Historical signatures

- Enabled buttons performed no action or controls never reached their claimed
  state.
- Arithmetic controls allowed impossible/unbounded values, silently clamped
  only the visual, or failed to disable at min/max.
- A graph marker could not reach the origin because a guard discarded the state.
- Some figures exposed only mouse/pointer interaction.
- Three lazy components used unstable ID prefixes and produced hydration
  mismatches on authenticated routes.
- Duplicate accessible labels made a failing control impossible to attribute to
  its owning lesson body.

### Root cause

The component tested visual change but not the complete input contract:
reachability, clamping, disabled state, keyboard path, hydration stability, and
ownership within a page containing several interactive bodies.

### Repair and prevention rule

- Give every numeric control an explicit finite domain and clamp updates to it.
- Disable the relevant direction truthfully at its endpoint.
- Traverse the real control until disabled and fail non-convergence.
- Retain ordinary Playwright actionability; never hide instability with forced
  clicks.
- Scope repeated labels to `[data-ccss-lesson]` and identify the owning slug.
- Provide buttons or keyboard operation for pointer-driven mathematical state.
- Use stable component-namespaced IDs when server/client ID order can diverge.

## A1 — Assessment key, selection, and grading

### Historical signatures

- Stored answer and explanation disagreed, or the keyed answer used the wrong
  rounding.
- The page promised eight questions while the renderer deliberately showed five.
- The grader rejected 538 valid answer variants, including `.5`, comma-grouped
  numerals, leading `+`, trailing decimal points, punctuation-tolerant words, and
  equivalent coordinates.
- Multiple-choice validation originally did not prove exactly one option graded
  correct.
- Graph checkpoints risked decorative or nondeterministic data unrelated to the
  keyed result.
- Five different item IDs are not sufficient evidence of construct diversity;
  the displayed tasks themselves must be compared. Current focused contracts do
  that for all 35 Grade 1 displayed IDs and for the five distinct statistical
  tasks on `us-ca-math-s5-chapter-04`, but not yet for every five-item sample.

### Root cause

Validation compared strings rather than mathematical meaning, and audits
inspected all linked questions without reconstructing the exact rendered five-
question selection and handwriting substitution.

### Repair and prevention rule

- Independently solve all linked questions and compare prompt, options, answer,
  explanation, and units.
- Mirror the renderer exactly: deduplicate, select five, and apply the current
  handwriting-capable substitution.
- For free entry, enumerate accepted equivalences and known-wrong counterexamples.
- Require exactly one multiple-choice option to grade correct.
- Make graph questions deterministic and derive points, axes, labels, and answer
  from the same data.
- Keep wrong forms in the test corpus so permissive normalization does not turn
  into over-acceptance.

## L1 — Language, pedagogy, and state-aware copy

### Historical signatures

- One hundred five internal topic/stage identifiers were interpolated into
  learner-facing scaffold copy instead of authored skill labels.
- Template splicing created phrases such as “reason about connect/use.”
- Coaching and remediation were generic, did not address the prompt, or referred
  to a worked example that did not exist.
- Independent practice repeated identical boilerplate.
- Punctuation, article agreement, duplicate words, missing JSX spaces, and
  subject–verb errors appeared in learner-facing text.
- Instructions were phrased as questions or vice versa.
- Grade 2 clock language incorrectly treated the 12 position as 60 minutes
  without explaining the completed hour; a fraction model displayed a literal
  variable `n` instead of the current multiplier.

### Root cause

Prose was generated from generic templates or concatenated JSX fragments, then
reviewed outside the current mathematical state and grade context.

### Repair and prevention rule

- Name the exact construct and current values in coaching and remediation.
- Check the prompt, hint, explanation, MathCheck, checklist, and spoken version
  as one instructional sequence.
- Use state-aware grammar for every live quantity.
- Review rendered JSX, not only source fragments; child boundaries can erase
  spaces or hide duplicate wording.
- Scan every learner-visible, feedback, `aria-*`, caption, and narration field
  for internal IDs, provider/QA metadata, raw state keys, and placeholder names;
  a clean paragraph-only scan is insufficient.
- Apply a defined California English house style consistently. Where Chinese is
  authored later, review Chinese/Latin spacing and punctuation joins separately
  instead of treating duplicated English locale values as translated content.
- Do not use a generic readability score on non-rendered seed text as an age-
  appropriateness gate. Developmental fit needs calibrated human/source review.

## X1 — Accessibility, labels, and spoken mathematics

### Historical signatures

- Captions and accessible names described a different figure, nonexistent
  colors, stale state, or internal state keys.
- Controls with the same label were indistinguishable; some meaning depended on
  color alone.
- Dynamic SVG text changed while the accessible figure name stayed fixed.
- Ninety-four checkpoint questions contained silent spaced minus signs or blanks;
  53 were directly reachable by every K–3 learner using the visible read-aloud
  button.
- Bare comparison-symbol options were audible in isolation but silent in the
  actual joined utterance context.

### Root cause

Accessibility text was maintained as parallel static copy. Speech testing
inventoried symbols or tested them alone instead of constructing the exact
utterance spoken by the app.

### Repair and prevention rule

- Derive caption and accessible name from the same state as the visible figure.
- When visible SVG text changes, require the accessible figure name to change
  where the mathematical meaning changes.
- Give repeated controls context-specific names and do not encode meaning by
  color alone.
- Normalize only the spoken string: runs of underscores become “blank,” spaced
  binary minus becomes “minus,” and bare symbolic options are labeled
  individually.
- Test narration using the complete prompt-plus-options construction from each
  real surface. An isolation test is not equivalent evidence.

## R1 — Render-path and content-contract mismatch

### Historical signatures

- Descriptions promised blocks that were not present; teacher guides promised
  hand-checked questions where none existed.
- Visualization titles rendered while the intended visualization body did not;
  later generic previews were found to be fabricated or topic-mismatched and
  were quarantined.
- Two valid Grade 1 illustration records were attached to a lesson with no
  corresponding `concept` or `worked-example` block, so both were correctly
  classified `[data-only/unreachable]` rather than displayed defects.
- Elementary authored guided-practice checklists and extension records existed
  in data. The current California renderer now shows up to three authored
  checklist items, but extension records remain unselected.
- Eighty-one short California standard IDs found in the visualization registry
  were non-rendered visualization metadata; they were not learner-visible
  lesson-standard labels in the audited route population.

### Root cause

QA treated authored data as displayed UI or treated a route title as proof the
body rendered. The production visibility rules were not reconstructed.

### Repair and prevention rule

- Classify content as student-visible, role-visible, data-only/unreachable, or
  quarantined before reviewing it.
- Count real assigned `[data-ccss-lesson]` roots and exact block types on the
  landed authenticated route.
- Do not “repair” quarantined or hidden content by claiming it was displayed.
- Missing renderers and unreachable records require a product/integration
  decision: wire intentionally, delete intentionally, or keep explicitly
  quarantined.

## Q1 — QA evidence integrity and false green

### Historical signatures

- An audit silently capped its sample and missed defects outside the cap.
- Browser gates reported 76/76 clean while loading `/login` 76 times; decorative
  login-page SVGs were miscounted as lesson figures.
- Two npm commands could not execute the audit as registered.
- A Flesch–Kincaid scan measured seed text rather than rendered text and treated
  mathematical vocabulary as general prose; its result was withdrawn.
- A speech test reached the opposite conclusion when a symbol was tested alone
  instead of inside the actual utterance.
- `independentAnswer` and `independentSolution` metadata were copied from the
  primary answer/solution, creating evidence that could not disagree.
- Clean browser results were initially produced before asserting the complete
  lesson body had mounted; `networkidle`, short click timeouts, and layout motion
  created false or non-diagnostic reds.

### Root cause

The QA system checked an implicit population, trusted a green process exit, or
used evidence structurally incapable of detecting the failure it claimed to
exclude.

### Repair and prevention rule

Every content gate must satisfy all of these conditions:

1. **RED proof:** a known-bad mutation/canary fails for the intended reason.
2. **Exact population:** the route, lesson count, block count, component slugs,
   question count, and viewport are reported.
3. **Route assertion:** the landed pathname equals the requested lesson route.
4. **Nonzero coverage:** zero real lesson figures/components/questions is a
   failure, not a green result.
5. **No silent sampling:** exhaustive partitions are reconciled to the inventory.
6. **Context fidelity:** narration, grading, selection, and browser actions match
   the production construction.
7. **Failure classification:** product defects, content defects, harness defects,
   infrastructure failures, and refuted candidates remain separate.
8. **Repeatability:** required regression artifacts are tracked and wired to a
   reviewed release command before being called a durable gate.

## False positives and non-bugs that must remain refuted

The loop also established patterns that should **not** be mass-replaced:

- English repeated across English/Traditional-Chinese/Simplified-Chinese values
  is intentional for the current English-first California surface. It is not a
  displayed mixed-language defect and is not a claim of localization complete.
- `undefined` and `-0` string searches are not sufficient runtime evidence;
  “undefined” can be legitimate prose and signed zero must be confirmed in a
  numeric display context.
- Multiplication, division, degree, superscript, slash fractions, `+`, and `=`
  were measured as audible; do not rewrite all mathematical symbols.
- A negative sign attached to a number such as `−5 degrees` is already spoken;
  only the measured spaced binary-minus form needs normalization.
- An SVG `getBBox()` measurement without transform-aware handling can report a
  false overflow.
- A control actionability failure during layout motion is not proof that the
  product control is mathematically nonconvergent.
- Domain ordering of standards should not be alphabetically sorted merely for
  cosmetic consistency.
- A data-only standard-code problem or unreachable asset is not a displayed-
  content defect, although it may still be metadata/integration debt.
- Specific candidates already investigated and refuted against the current
  source/rendered state include the residual plot, the alleged `r` identifier
  collision, an alleged internal `lw` leak, the acute-angle label, and the
  `multistep-rational` and `multiply-divide-integers` lesson states. Retain these
  refutations so a later broad text scan does not produce repeat churn without
  new contradictory evidence.

## Fresh current-snapshot evidence

The following checks were rerun on 2026-08-10 against the current snapshot and
exited zero. All ran in the working tree except the explicitly isolated build:

```text
npm run audit:us-ca-lesson-content
  76 lessons / 538 blocks / no configured content defects

npm run audit:ccss-lesson-interaction
  270 interactive lessons / 100 stateful buttons / 242 bounded steppers /
  no interaction-copy defects

npm run audit:us-ca-checkpoint-grading
  271 free-entry + 337 multiple-choice / all equivalent forms accepted /
  wrong answers rejected / exactly one correct option each

npm run audit:us-ca-lesson-readaloud
  608 linked questions + 386 content-bearing blocks
  (286 interactive + 12 concept + 12 worked example + 76 teacher guide) /
  no configured silent-token defect

npm run audit:us-ca-lesson-illustrations
  2 valid records / both explicitly reported unreachable

node scripts/audit-us-ca-ccss-source-pack-parity.mjs
  270 source slugs × 3 questions = 810/810 one-to-one pairs / 0 issues /
  full K–P6–S6 grade-span contract present

node scripts/audit-us-ca-ccss-textbook-k5-explanations.mjs
  336/336 explanations approved / 0 defects, drift, option, or diagram issues

node scripts/audit-us-ca-ccss-textbook-k5-independent.mjs
  336/336 independently derived answers / 0 mismatch or ambiguity

node scripts/audit-us-ca-ccss-textbook-p6-s6-explanations.mjs
  474/474 independently derived and reviewed / 0 defects or ambiguities

node scripts/audit-us-ca-ccss-textbook-p6-s6-independent.mjs
  474/474 independently derived answers / 0 mismatch or ambiguity

node scripts/audit-us-ca-exercise-inventory.mjs
  3/3 live packs / 2,802/2,802 questions / 0 structural, option,
  accepted-answer, or visible-data errors

node scripts/audit-us-ca-k5-visible-prompt-solvability.mjs
node scripts/audit-us-ca-k5-visible-explanation-consistency.mjs
  492/492 K-5 knowledge-point prompts independently solved / 492/492
  explanations consistent with prompt-derived solutions

node --test scripts/us-ca-browser-gate-navigation.test.mjs \
  scripts/audit-ccss-lesson-interaction.test.mjs
  8/8 passed

explicit Round 18-plus static manifest
  119/119 passed; 0 failed/cancelled/skipped/todo

California lesson plus grade-aware cross-surface tests
  18/18 passed; the two formerly stale contracts are repaired

authenticated semantic-state audit
  46/46 at 1280×900 and 46/46 at 390×844, including plotted
  correlation and nonzero computed-MAD canaries

npm run type-check
  passed

isolated current-snapshot copy: npm run build
  compiled and type-checked; 236/236 static pages generated

git diff --check
  passed
```

The earlier Round 18 evidence additionally records:

- K–G5 focused current-source suites: 28/28;
- P6–S6 semantic/state suites: 28/28;
- exact displayed repair regression bundle: 69/69;
- displayed five-question surface plus strict grading: 18/18;
- desktop and mobile all-route runtime sweeps: 76/76 at each viewport, zero
  findings;
- 34,346 successful directional presses plus 220 range and 184 number-input
  endpoint checks;
- 28 targeted semantic-state contracts at both viewports, zero findings in the
  Round 18 baseline; this follow-up's focused gate passed 46/46 at both
  viewports after adding relation-symbol and estimate-presentation canaries;
- dynamic figure-label and SVG-bound sweeps over all 76 routes, zero findings;
- TypeScript, production build, and diff-whitespace checks passed.

The final build was not run from the shared worktree because an unrelated Next
development server was already using that checkout. It was run from the exact
current runtime/data/component snapshot copy
`/Volumes/Starship/mais-ca-content-build-closure.Zm85XI`, using the existing
dependency installation by symlink, and generated 236/236 pages. Only
coordination evidence and the optional non-runtime item-quality audit were
edited afterward; no runtime, data, component, or build-input file changed. A
first attempt to create another isolated copy under `/tmp` stopped with
`ENOSPC`; no source or content gate failed. The successful copy and the
incomplete temporary copy were intentionally not deleted because artifact
cleanup was outside the owner's authorization.

## Explicit residuals outside the displayed-content terminal claim

These are not silently converted into green:

1. Two valid Grade 1 illustration records remain `[data-only/unreachable]`
   because the page lacks the corresponding block type.
2. Seventy-six extension blocks are not selected by the authenticated student
   renderer.
3. Seventy-six teacher-guide blocks are role-gated away from students.
4. Generic California visualization embeds remain quarantined; quarantine
   prevents wrong previews from displaying but does not validate the labs. The
   aspirational depth gate remains advisory RED: 322/329 real visualizations,
   62/50 paper-only, and Grade 8 at 26/28; `npm run test:ccss-depth` reports four
   passing, three failing, and one skipped subtests. These are non-display/depth
   gaps, not wrong content exposed by the current California renderer.
5. The displayed checkpoint is a five-question sample, not comprehensive linked-
   standard or component coverage: 51/76 samples omit at least one linked
   standard and 50/76 omit at least one component source. Focused construct-
   diversity proof currently covers the 35 displayed Grade 1 IDs and the five
   distinct tasks in S5 chapter 04, not every route.
6. Eighty-one short California standard IDs remain in non-rendered visualization
   metadata. They are integration/metadata debt, not displayed-label evidence.
7. The copied independent-verification metadata for 464 textbook-pack questions
   remains evidence debt and is not used as correctness proof.
8. A formal normed age-level readability certification has not been performed;
   the invalid automated lens was deliberately rejected.
9. The California surface is intentionally English-first; duplicated English in
   `zh`/`zhHans` values is not full localization. A complete locale/house-style
   audit—including Chinese/Latin spacing, US/British usage, and punctuation
   joins—remains outside the terminal claim.
10. Eighteen regression artifacts remain untracked and are not wired into
    `package.json` (the prior 17 plus
    `components/lesson/ccss/numberPresentation.test.ts`). Direct runs are green,
    but release-gate durability awaits an approved review package. The refreshed
    A25 intake now distinguishes the 315-path dirty overlay from the 373-path
    cumulative clean-candidate source and requires a count-enforced 119-test
    manifest plus an owned browser wrapper. The two formerly stale broad
    cross-surface assertions now pass in a fresh 18/18 run.
11. This is local working-tree QA evidence, not a staged package, commit, PR,
    deployment, or live-site verification.

## Reusable definition of done for the next California content change

A future California lesson-page content slice is not complete until it can
answer “yes” to every applicable item:

- The actual California standard, grade band, construct, and representation were
  checked from the current route and source.
- Every displayed equation, result, unit, condition, and approximation was
  independently recomputed.
- Every numeric relation was chosen by comparing the raw value with the displayed
  numeric value; decimal formatting alone did not decide between `=` and `≈`.
- Zero, one, equality, tie, exact-division, negative, singular, coincident,
  degenerate, and both endpoint states were exercised where reachable.
- Figure geometry, visible labels, caption, accessible name, and equation all
  describe the same state.
- Controls reach finite bounds, clamp state, expose truthful disabled semantics,
  and remain operable without a pointer-only dependency.
- The exact five displayed checkpoint questions were reconstructed and every
  linked question was independently solved and grading-tested.
- Learner-facing prose is grammatical, state-aware, grade-appropriate, and tied
  to the named misconception/task rather than boilerplate.
- The exact spoken utterance remains understandable, including blanks, binary
  minus, options, and mathematical syntax.
- The authenticated landed route and complete assigned lesson-root sequence are
  asserted before browser findings are trusted.
- The new regression gate was observed RED, then GREEN, reports nonzero exact
  coverage, and is included in the reviewed release package.
- Refuted candidates and out-of-scope hidden/quarantined populations are recorded
  explicitly.

## Final content verdict

For the current uncommitted working-tree snapshot, the iterative loop repaired
three checkpoint findings and 17 affected interactive numeric-truth/precision
component groups after the earlier configured gates were green. It also
clarified one estimate card without counting that ambiguity as a confirmed
defect. A final parity challenge then repaired 34 stale generated explanations,
including two source statements that required additional mathematical scope.
These overlapping counts are intentionally not summed. The post-repair scan has no remaining
**authenticated-student-displayed California lesson-page content** finding under
the enumerated standards, mathematical, language, assessment, interaction,
accessibility, focused desktop/mobile semantic-state, Round 18 figure/runtime
baseline, TypeScript, and isolated-build checks.

The residuals above remain real but are either non-displayed product/integration
decisions, evidence/packaging debt, or explicit scope boundaries. They must not
be represented as deployed, live, fully localized, or complete-curriculum proof.
