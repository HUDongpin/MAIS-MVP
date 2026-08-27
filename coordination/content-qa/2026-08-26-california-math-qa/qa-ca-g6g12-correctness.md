# QA audit — LIVE California G6–G12 math bank

**Pack:** `/Volumes/Starship/MAIS-MVP/data/generated-content/us-ca-math-g6-g12-generated-bank-v2-1500/question-pack.json`
**Live via:** `data/usCaliforniaTopics.ts:2` (direct import — this pack is served to students)
**Audited:** 2026-08-26 — READ-ONLY. No repo file was created, edited, or deleted.
**Scope:** the defect classes the existing gate (`scripts/audit-us-math-item-quality.mjs`) cannot see. That gate re-solves
template+parameters and reports CLEAN; every finding below survives it.

## Coverage of this audit

| Measure | Value |
|---|---|
| Items read in full (prompt / options / key / explanation / independent solution) | **350 of 1500 (23.3%)** |
| By grade | P6 48, S1 34, S2 28, S3 40, S4 70, S5 60, S6 70 |
| Generation templates covered by reading | **67 of 67 (100%)** — no template has <14 instances, so the "<5 instances" rule was vacuous |
| Programmatic checks run over **all 1500** | CoT-leak regex; visual-reference regex; answer-in-options; numeric-equivalent options; answer vs independentAnswer; explanation-final-value vs key; fraction-form keys; rounding precision; distractor derivation; option-position bias; locale completeness; standardIds/chapter/template cross-map; prompt duplication; difficulty-label consistency |

**Clean on these axes (all 1500, zero hits):** chain-of-thought leakage in `explanation`/`independentSolution`/`prompt`;
prompts referencing a figure/diagram/table that is not supplied; MC answer missing from its own option list; two options
with the same numeric value under different strings; `answer` disagreeing with `independentAnswer`; missing/empty
`en`/`zh`/`zhHans` on prompt, explanation, chapter title or options. Correct-option position is near-uniform
(A/B/C/D = 144/129/123/124 over 520 MC items) — no positional giveaway.

---

## Findings table

Severity: **P0** = student marked wrong when right, or taught something false. **P1** = unusable / misaligned as written. **P2** = quality / polish.

| # | Item id(s) | Grade | Sev | Defect class | Evidence (verbatim) | Why it is wrong | Suggested fix |
|---|---|---|---|---|---|---|---|
| 1 | `us-ca-g6-g12-v2-s4-c03-q05`, `-q14`, `-q18`, `-q38`, `-q41` (5 items) | S4 / G10 | **P0** | Answer key in wrong FORM (2) | q14 raw: `"type":"fill-in"`, `"prompt":"A circle has radius 2 cm. Using π ≈ 3.14, what is the area of a sector with a central angle of 120°?"`, `"answer":"314/75"`, `"acceptedAnswers":["314/75","314/75 cm^2"]`, `"explanation":"Sector area = (120/360) × π r² ≈ (120/360) × 3.14 × 4 = 314/75 cm²."` | The prompt says "Using π ≈ 3.14", which instructs a decimal computation; 314/75 = 4.186666… A student who does exactly what the prompt says and enters `4.19` (or `4.187`) is marked **wrong**. `lib/server/answerMatching.ts` matches numerics with `Math.abs(selectedNumber - acceptedNumber) < 0.000001`, so nothing short of ~7 decimal places or the literal improper fraction passes. Same for `314/3` = 104.6666… in q05/q18. | Either state "round to two decimal places" and set the key to `4.19` / `104.67`, or add the rounded decimals to `acceptedAnswers`, or restrict `theta`/`r` so the product is terminating (as `t_arc_length` already does — all 27 arc-length keys are exact decimals). |
| 2 | `us-ca-g6-g12-v2-s4-c03-q01`, `-q07`, `-q22`, `-q40` (4 items) | S4 | **P1** | Answer key in wrong FORM (2) | q07 raw: `"options":["628/75","12.56","157/75","314/75"]`, `"answer":"314/75"` | Prompt says "Using π ≈ 3.14" but three of four options are improper fractions and one (`12.56`) is a decimal. A student holding the correct value 4.19 must reverse-engineer which fraction it equals. Format is also internally inconsistent inside the same chapter (`t_arc_length`, same chapter S4-c03, uses decimals). | Render all four options in the same decimal form. |
| 3 | S2-c01 (43), S2-c03 (43), S3-c01 (43), S3-c02 (43), S3-c04 (43), S3-c05 (43), S6-c03 (42), S6-c04 (42) — **342 items** | S2, S3, S6 | **P1** | standardIds do not match the prompt (6) | `s3-c05-q01`: `"chapterTitle":"Modeling with Evidence"`, `"standardIds":["CA.CCSS.Math.HS.G-GPE"]`, `"prompt":"A line of best fit for a scatter plot is ŷ = 3x + 13. What value does the line predict when x = 6?"`, `"generationTemplate":"t_predict_from_fit"` | G-GPE is *Expressing Geometric Properties with Equations*; the item is a line-of-best-fit prediction (S-ID). The tags are assigned by **position in the canonical CCSS domain list**, not by content, so whole chapters are shifted. Full map: S2-c01 systems/linear eq → tagged `G8.NS` (should be 8.EE); S2-c03 translate/reflect a point → `G8.F` (should be 8.G); S3-c01 consecutive-integer & ticket word problems → `HS.N-RN` (should be A-CED; N-RN is not even in the Math I course); S3-c02 f(x) notation → `HS.A-CED` (should be F-IF); S3-c04 midpoint/perpendicular slope → `HS.F-IF` (should be G-GPE); S3-c05 line of fit/residual → `HS.G-GPE` (should be S-ID); S6-c03 expected value & z-score → `HS.F-IF` (should be S-MD/S-ID); S6-c04 average rate of change & vertex max → `HS.S-MD` (should be F-IF). Note S6-c03/c04 are simply **swapped**. Anything that reports standards mastery, or maps lessons to standards, is reporting the wrong standard for 22.8% of the bank. | Re-derive `standardIds` from `generationTemplate`, not from chapter index. Lower-confidence extra: S3-c03 (vertex / quadratic evaluate, 43 items) is tagged `HS.A-REI` but is F-IF content. |
| 4 | 310 items (152 prompts repeated 2–11×) | all | **P1** | Item pool is far smaller than 1500 | S4-c02: `"In right triangle ABC with the right angle at C, the side opposite angle A is 5 and the side adjacent to angle A is 12. What is tan A? Give a fraction."` appears **11 times** (`s4-c02-q06,q07,q12,q16,q17,q21,…`). S2-c04 `"A right triangle has legs of 6 cm and 8 cm…"` **10×**. S5-c03 `"What is the period, in degrees, of y = sin(2x)?"` **9×**. S6-c01 `"Convert 108 km/h to meters per second."` **8×**; `"A garden measures 14.2 m by 9.6 m…"` **8×**. | Only 1190 of 1500 prompts are distinct. Per chapter the pool collapses: **S6-c01 has 9 distinct prompts across 43 items**; S5-c03 16/43; S2-c04 19/43; S4-c03 19/43; S4-c02 21/43; S4-c05 22/43; S1-c04 25/43; P6-c1 26/43. A student practising a chapter re-answers the same question up to 11 times, so mastery signals and spaced-repetition scheduling are measuring memorisation of a handful of items. | Widen the parameter sampler per template (e.g. `t_kmh_to_ms` only uses 5 speeds, `t_trig_ratio` only 3 triangles, `t_sig_figs` only 5 garden pairs) and de-duplicate within a chapter. |
| 5 | 360 items across 106 prompts (161 items / 38 prompts flip Low↔High) | all | **P1** | `difficulty` label is noise | `"A car travels 300 miles in 5 hours at a steady speed. What is the unit rate in miles per hour?"` carries both `Exam` and `Challenge`. `"What is 75% of 160?"` carries `Challenge`, `Exam` **and** `Core`. `"A right triangle has legs of 5 cm and 12 cm…"` carries both a Low-mapped and a High-mapped label. | `lib/difficulty.ts` maps Foundation→Low, Core→Medium, Challenge/Exam→High, and that mapping is consumed by `lib/server/questionStore.ts`, `lib/server/teacherAssignmentGeneration.ts` and `data/usCaliforniaTopics.ts` (`dominantDifficulty`). A teacher who filters to "High" can receive literally the same question as the "Low" filter. Difficulty is being assigned by rotation, not by content. | Derive `difficulty` from template + parameter magnitude, and make identical prompts carry identical difficulty. |
| 6 | `t_residual_linear` 63 items (S2-c05, S3-c05, S5-c04); `t_predict_from_fit` 42 items (S2-c05, S3-c05) | S2/S3/S5 | **P1** | Wrong grade-level placement (5) | Identical prompt in two different courses: `s2-c05-q26` (Grade 8) and `s3-c05-q16` (High School Math I) both read `"A line of best fit for a scatter plot is ŷ = 6x + 5. What value does the line predict when x = 6?"`. `s5-c04-q02` (Math III, Grade 11): `"A model predicts ŷ = 3x + 17. At x = 9 the observed value is 47. What is the residual (observed − predicted)?"` — arithmetically identical to the Grade 8 items. | An 8.SP task is doing duty as the whole of Math I "Modeling with Evidence" (43 items) and half of Math III "Data Modeling and Residuals". Grade 11 students get a Grade 8 computation with no least-squares fitting, no interpretation, no residual plot. | Escalate the Math I/III versions (fit a line, interpret slope in context, judge a residual plot) or re-scope those chapters. |
| 7 | S2-c03, 43 items | S2 / G8 | **P1** | Chapter promises content it does not contain | Chapter title `"Transformations and Similarity"`; the only two templates present are `t_translate_point` and `t_reflect_point`, and **every one of the 43 prompts asks only for the y-coordinate**, e.g. `s2-c03-q01`: `"The point (3, 1) is translated 2 units right and 5 units down. What is the y-coordinate of the image?"`, `"explanation":"Moving down subtracts from y: 1 − 5 = -4. (x becomes 5.)"` | Zero similarity items, zero dilations, zero rotations, zero reflections over the y-axis or y = x, and the x-coordinate is never asked (the horizontal shift is a permanent red herring — and the explanation hands it to the student anyway). The chapter reduces to one subtraction. | Add dilation/similarity and rotation items; ask for the x-coordinate and for the full image point. |
| 8 | `t_sse_compare`, 23 items (S5-c04) | S5 / G11 | **P1** | Answer-key bias / gameable | All 23 have `"answer":"f"`. `s5-c04-q01`: `"Model f has a sum of squared residuals of 5, and model g has 12. Which model fits the data better?"` `"answer":"f"`; `s5-c04-q12`: `"…21, and model g has 39."` `"answer":"f"`. In every one of the 23, f's SSR is the smaller number. | 100% of the chapter's concept items have the same one-letter answer. A student who always types `f` scores 23/23 without reading. | Randomise which model wins; add ties and "cannot be determined" cases. |
| 9 | `t_expected_value`, 14 items (S6-c03) | S6 / G12 | **P1** | Teaches a false model | `s6-c03-q01`: `"A raffle ticket costs $2. One of every 10 tickets wins $40. What is the expected net gain, in dollars, from buying one ticket?"` `"answer":"2"`. All 14 items have a **positive** expected net gain (keys are only 1, 2 or 3). | Every raffle in the bank is profitable for the buyer. S-MD exists largely to teach that games of chance have negative expected value for the player; this chapter teaches the opposite by construction, and the three-value key set is also guessable. | Make most prizes yield a negative expectation; vary the key beyond {1,2,3}. |
| 10 | 12 items: `s1-c05-q07,q10,q13,q19,q28,q31,q34,q37`; `s4-c05-q01,q04,q28,q34` | S1, S4 | **P1** | Nonsensical MC distractor (4) | `s1-c05-q13` raw: `"prompt":"The probability that it rains tomorrow is 7/8. What is the probability that it does NOT rain?"`, `"options":["4.125","0.875","1/8","1/7"]`, `"answer":"1/8"`. Also `s1-c05-q19` `"options":["0.1","4.9","9","9/10"]`; `s4-c05-q04` `"options":["1/4","4.25","0.2","0.75"]`; `s1-c05-q10` `"options":["1.5","0.4","3/5","1/6"]`. | The distractor generator adds a constant 4 to the answer (0.125→4.125, 0.2→4.2, 0.25→4.25), producing probabilities > 1. No student error yields "there is a 4.125 probability of no rain"; it is instantly eliminable, so the item is easier than intended, and it models a probability as an impossible quantity. | Constrain probability-item distractors to [0, 1] and derive them from real errors (using P(A) instead of P(not A), n/(n−k) odds, etc.). |
| 11 | 256 of 514 numeric MC items (**49.8%**); 77 items (15.0%) have ≥2 | all | **P2→P1** | Distractors not derived from any student error (4) | `p6-c01-q10`: `"A car travels 36 miles in 3 hours…"` `"answer":"12"`, `"options":["17","12","7","33"]` — 17 = 12+5, 7 = 12−5, neither reachable by any method. `p6-c01-q16` `"What is 50% of 160?"` answer 80, distractor 84. `s1-c01-q01` `"Solve the proportion: 20/4 = x/24."` answer 120, distractors 116 and 124. | Classifying all 1542 MC distractors: 22.7% are `answer ± k` for an arbitrary integer k ≤ 5 unrelated to any parameter. These carry no diagnostic value — a wrong pick tells the adaptive engine nothing about the misconception — and they cluster so tightly around the key that near-miss arithmetic is rewarded. (The remaining categories are healthy: 14.7% answer ± a parameter, 10.1% double/half, 7.0% a given parameter, 4.4% sign flip.) | Replace ±k noise with error-model distractors, as `t_circle_circumference` already does well (radius-for-diameter, πd², 2πd). |
| 12 | `t_compare_integers`, **11 of 11** MC items: `p6-c02-q01,q07,q10,q19,q22,q25,q28,q31,q34,q37,q43` | P6 / G6 | **P2** | Ill-posed option set (1) | `p6-c02-q01`: `"prompt":"Which number is the least: -14, 12, or -9?"`, `"options":["-14","14","12","-9"]`. `p6-c02-q07`: prompt set {−15, 22, −23}, options include `"23"`. `p6-c02-q22`: prompt set {−11, 7, −8}, options include `"11"`. | The question restricts the answer to three named numbers; the fourth option is a number that is not in the set, so it is not an admissible answer to the question as asked. (It is meant to probe sign confusion, but the wording does not license it.) | Reword to "Which of the following is least?" and list four numbers, or make the fourth option one of the three. |
| 13 | 40 items | S1 (mostly `t_fraction_product`, `t_marble_probability`) | **P2** | Circular / degenerate explanation (3) | `s1-c02-q01`: `"explanation":"1/3 × 1/3 = 1/9 = 1/9."` `s1-c05-q03`: `"explanation":"P(red) = 4/15 = 4/15."` `s1-c02-q12`: `"2/3 × 2/5 = 4/15 = 4/15."` | The template always prints `raw = simplified`; when the product is already in lowest terms this becomes "X = X", which reads as circular reasoning and models nothing. | Emit the second equality only when simplification actually occurs. |
| 14 | 29 items (`t_quadratic_evaluate`, `t_sum_of_roots`) | S3, S6 | **P2** | Malformed notation in explanation (3) | `s3-c03-q02`: `"explanation":"y = 3² − 3×3 − 4 = 9 + -9 + -4 = -4."`, `"independentSolution":"3^2+-3*3+-4 = -4"`. `s6-c02-q02`: `"independentSolution":"8+-2+1 = 7"`. | `9 + -9 + -4` and `8+-2+1` are not acceptable written mathematics and directly contradict the sign conventions the same courses teach. | Normalise `+ -n` to `− n` when rendering. |
| 15 | 53 items | S2, S3, S5, S6 | **P2** | Unsimplified coefficients in the prompt (1) | 17× `"Solve for x: 5x + 17 = 1x + 61."` (`s2-c01-q03,q06,q10,q23,q25,q27,…`); 10× `"For the line y = 4x + 0, what is the value of y when x = 4?"` (`s2-c02-q06`), `"Given f(x) = 5x + 0, solve f(x) = 10."` (`s3-c02-q19`); 7× `"What is the amplitude of y = 4 sin(1x)?"` (`s5-c03-q11,q15,q16,q26,…`); 19× `"Profit is modeled by P = (20 − 3)q − 120…"` (`s6-c05-q01`). | `1x`, `+ 0` and `sin(1x)` are template-substitution artifacts that no textbook writes; `(20 − 3)q` leaves an arithmetic step unsimplified in a statement of the model. They signal machine generation and can confuse students who are being taught to simplify. | Suppress unit coefficients and zero constants at render time. |
| 16 | `t_ticket_count`: `s3-c01-q04,q07,q13,q28,q31,q43` (6 items) | S3 | **P2** | Context-impossible distractor (4) | `s3-c01-q04`: `"Tickets cost $12 each plus a one-time $6 booking fee. A group paid $138 in total. How many tickets did they buy?"`, `"options":["11","12","10","11.5"]`. Also `4.25`, `4.6`, `15.25`, `8.25`, `4.4`. | "11.5 tickets" cannot be bought; the option is eliminable on context alone. (It comes from dividing the total by the price without removing the fee — keep the error, round it.) | Round the fee-forgotten value to a whole number of tickets. |
| 17 | `t_opposite_abs`, 24 items (P6-c02) | P6 / G6 | **P2** | Content coverage far narrower than the standard | All 24 prompts collapse to one shape: `"What is the value of \|-N\| ?"` (13 distinct N; `\|-8\|` appears 5×, `\|-17\|` 5×). Distractor set is formulaic — `p6-c02-q04` `"options":["0","25","24","-24"]`, `p6-c02-q13` `"options":["9","-8","0","8"]`. | The template name promises "opposite" but no item asks for an additive inverse; no positive argument, no `\|0\|`, no fractions or decimals on the number line — while `CA.CCSS.Math.G6.NS` covers all of it. `"0"` as an option for `\|-24\|` is not a reachable student error. | Add opposite/additive-inverse, positive and rational arguments, and ordering-on-a-number-line items. |
| 18 | `t_z_score` 28 items; `t_sampling_mean` 23 items; `t_log_value` 22 items | S5, S6 | **P2** | Answer space too narrow to be diagnostic | z-score keys across all 28 items are only {1: 1, 2: 10, 3: 6, −1: 4, −2: 7} — every key is a small integer. `t_sampling_mean`: the key is always the stated population mean (`s5-c05-q02` and `s5-c05-q05` are the same prompt with the same four options reshuffled). All 22 `t_log_value` keys are integers. | Real z-scores and logs are rarely integers; a student can guess the answer set. `t_sampling_mean` also never tests the standard error, which is the harder half of the idea. | Include non-integer z-scores, and add a standard-error item to the sampling-distribution set. |
| 19 | `t_unit_rate`: `p6-c01-q02,q06,q10,q13,q14,q18,q31,q34,q37,q38` (10 of 29) | P6 | **P2** | Unrealistic scenario numbers | `"A car travels 36 miles in 3 hours at a steady speed."` → 12 mph. Also 24 mi/2 h = 12 mph, 60 mi/4 h = 15 mph, 90 mi/5 h = 18 mph. | A car at a steady 12 mph is not a believable context, and CA's framework emphasises reasonableness of modelling quantities. | Constrain the sampler to ~25–75 mph, or change the vehicle for slow rates. |
| 20 | `t_sig_figs`, 20 items (S6-c01) | S6 | **P2** | Notation ambiguity in the key | `s6-c01-q07`: `"A garden measures 12.3 m by 8.7 m. Compute the area and round it to two significant figures."` `"answer":"110"`, `"options":["120","110","100","107"]`. Rounding was independently re-verified for all 20 items — all correct. | `110` written plainly reads as three significant figures; the unambiguous 2-s.f. form is `1.1 × 10²`. A precision chapter should model precision notation. | Present the key in scientific notation, or state "give your answer to the nearest ten". |

---

## Systemic patterns (root causes)

1. **`standardIds` are positional, not semantic.** Chapters were tagged by walking the canonical CCSS domain list in
   order (S3 got N-RN, A-CED, A-REI, F-IF, G-GPE; S6 got N-Q, A-APR, F-IF, S-MD, Modeling) regardless of what the
   chapter actually contains. Where the chapter ordering happens to match the domain ordering (all of P6, all of S1,
   all of S4, all of S5) the tags are correct; where it does not (S2, S3, S6) they are wrong. 342 items.
2. **Metadata fields are rotated, not derived.** `difficulty` and `type` cycle Core→Foundation→Challenge→Exam and
   multiple-choice→fill-in→short-answer through each chapter's item list, so the same prompt lands on different
   labels. Confirmed: 106 prompts / 360 items carry conflicting Low/Medium/High difficulty.
3. **The parameter sampler is too small.** 152 prompts repeat, 310 items are duplicates, and eight chapters have a
   distinct-prompt pool under 60% of their item count (worst: S6-c01 at 9 distinct / 43 items).
4. **Distractors are generated arithmetically (`answer ± k`, `answer + 4`) rather than from an error model.** This
   produces the impossible probabilities in finding 10, the fractional ticket counts in 16, and the 350 diagnostic-free
   distractors in 11.
5. **Exact-value rendering leaks into decimal-instructed prompts.** The generator keeps rational arithmetic and prints
   a fraction when the value does not terminate, even when the prompt said "Using π ≈ 3.14" — the sector-area P0.
   Combined with the 1e-6 numeric tolerance in `lib/server/answerMatching.ts:answerMatches`, correct student work is
   graded wrong.
6. **Chapter titles over-promise.** "Transformations and Similarity" contains no similarity; "Statistical Inference and
   Claims" contains no inference beyond naming the mean of a sampling distribution; "Modeling with Evidence" is
   Grade 8 line-of-fit arithmetic.

---

## Defect rates

Rates below distinguish **exact counts** (computed over all 1500 items) from **projections** (extrapolated from the
350-item read sample). Where a defect is template- or chapter-scoped, the count is exact by construction.

| Defect class | Items | Rate | Basis |
|---|---|---|---|
| P0 — key form makes correct work be graded wrong (finding 1) | **5** | 0.33% | exact (all 16 `t_sector_area` items enumerated) |
| P1 — mis-scoped `standardIds` (3) | **342** | **22.8%** | exact (chapter × template cross-map over all 1500) |
| P1 — duplicate prompts inflating the pool (4) | **310** | **20.7%** | exact (1190 distinct prompts of 1500) |
| P1 — unreliable `difficulty` label (5) | **360** | **24.0%** | exact (106 prompts with conflicting Low/Med/High) |
| P1 — grade-level placement (6) | **105** | 7.0% | exact (`t_residual_linear` 63 + `t_predict_from_fit` 42) |
| P1 — chapter content ≠ chapter title (7) | **43** | 2.9% | exact (S2-c03) |
| P1 — single-answer / false-model concept chapters (8, 9) | **37** | 2.5% | exact (23 + 14) |
| P1 — nonsensical MC distractor, probability out of [0,1] (10) | **12** | 0.8% | exact |
| P1 — answer-form mismatch on MC (2) | **4** | 0.27% | exact |
| P2 — diagnostic-free `answer ± k` distractors (11) | **256 of 514 MC** | **49.8% of MC / 17.1% of pack** | exact (1542 distractors classified) |
| P2 — degenerate or malformed explanation (13, 14) | **69** | 4.6% | exact (40 + 29) |
| P2 — unsimplified coefficient artifacts (15) | **53** | 3.5% | exact |
| P2 — narrow content coverage / narrow key space (17, 18) | **97** | 6.5% | exact (24 + 28 + 23 + 22) |
| P2 — misc. context realism & notation (12, 16, 19, 20) | **47** | 3.1% | exact |

**Sampled-read rate (the honest extrapolation figure).** Of the 350 items I read in full, **241 carry at least one
P0/P1 finding (68.9%)** — dominated by the systemic tag/duplication/difficulty defects, which are pack-wide rather than
sample-specific. Excluding those three pack-wide classes, **31 of 350 (8.9%)** carry an item-level P0/P1 defect, which
projects to roughly **130 of 1500**. Union of all severities across all 1500, counting each item once:
**≈ 780 items (52%)** touch at least one finding, and **≈ 5 items (0.33%)** are outright P0.

---

## What I did NOT cover — be sceptical of silence here

- **1150 of 1500 items were never read individually.** For the 67 templates I read 2+ examples each and verified the
  math by hand, then extrapolated within the template. A template is not guaranteed uniform: a single bad parameter
  draw inside an unread item would not be caught. The templates I read most thinly (2 examples only) include
  `t_scale_area`, `t_integer_chain`, `t_solve_proportion`, `t_constant_of_proportionality`, `t_slope_two_points`,
  `t_distance_points`, `t_evaluate_y_mx_b`, `t_evaluate_linear_expr`, `t_one_step_equation`, `t_median_of_list`,
  `t_mean_of_list`, `t_prism_volume`, `t_marble_probability`, `t_doubling_growth`, `t_shifted_square`,
  `t_inverse_linear`, `t_break_even`, `t_profit_at_q`, `t_larger_root`, `t_discriminant`, `t_third_angle`,
  `t_exterior_angle`, `t_hypotenuse`, `t_fx_evaluate`, `t_fx_solve`, `t_midpoint`, `t_perpendicular_slope`,
  `t_amplitude`, `t_period_degrees`, `t_sample_proportion`, `t_avg_rate_of_change`, `t_kmh_to_ms`, `t_percent_of`.
- **The `zh` and `zhHans` translations were checked only for completeness (no empty/untranslated fields — 0 hits), not
  for mathematical accuracy.** A mistranslated Chinese prompt would not have been caught. This is a real gap: the pack
  ships three locales and two of them are unaudited.
- **`conceptIds`, `competencyTags`, `domainTags`, `evidenceCardIds`, `sourceIds` were not audited** beyond noticing that
  `conceptIds` are chapter-uniform (e.g. every P6-c01 item carries the same five concept ids including
  `statistical-variability`, which no ratio item exercises). That looks wrong but I did not quantify it.
- **I did not verify how the app renders these items** (LaTeX/fraction rendering, whether `314/75` displays as a
  fraction, whether the fill-in keypad can even produce `/`). The P0 in finding 1 is established from the pack plus
  `lib/server/answerMatching.ts`; the UI could make it better or worse.
- **I did not run the app or the existing gate myself**; I took the brief's statement that
  `scripts/audit-us-math-item-quality.mjs` reports CLEAN at face value and searched only outside its stated coverage.
- **No `git`-level or pack-provenance review.** `reviewNotes` on every item reads
  `"regenerated-2026-07-10-topic-grade-alignment"` and `manualQaStatus` is `"accepted-auto-sample"` — i.e. the manual
  QA on this pack was itself a sample, which is consistent with what I found.
