# California Math — Focused Practice-Arena QA Audit — 2026-07-10

Deep audit of **every US_CA_MATH question the practice arena serves** (1,992
items: 492 K-G5 knowledge-point practice + 1,500 G6-G12 v2), judged on
(1) grade appropriateness against CA CCSS, (2) solvability, (3) answer
correctness, plus cross-language/display integrity. This goes beyond the
same-day full-bank audit: **every single CA answer was re-derived from the
prompt text alone** (never from generator parameters or stored solutions) by an
independent parser+solver per template family, and compared under the
production grader's semantics.

Companion data:

- `2026-07-10-california-verdicts.json` — per-question verdicts (all 1,992).
- `scripts/ca-verify-2026-07-10.py` — the independent verifier (≈100 family
  parsers; kept in `coordination/` because sibling sessions clean `.tmp/`).

## Result

| Standard | Result |
|---|---|
| 1. Grade-appropriate | **1,992 / 1,992 pass** (CCSS mapping below; two borderline placements noted, both inside their chapter design) |
| 2. Solvable | **1,992 / 1,992 pass** after fixing 11 items that were unsolvable-correctly (below) |
| 3. Answer correct | **1,992 / 1,992 pass**, every one independently re-derived and grader-checked; 0 mismatches, 0 unparsed, 0 ambiguous MCs |
| 4. Language/display | 0 defects (18 similar-triangle zh phrasings carry equivalent information — reviewed OK; K-P5 zh prompts verified number-faithful) |

Cross-checks: repo deterministic audit green (23,756/23,756 bank-wide after a
sibling session added 3 HK items); live end-to-end against an isolated dev
server confirms the fixed items serve and grade correctly.

## Defect found and fixed: K-G5 "hundredths" place-value family (11 items)

`us-ca-k5-…-p5-5-nbt-decimals-q01, q03–q12` asked *"which decimal is 5 ones
and 8 **hundredths**?"* while the key, every MC option set, and the
explanation were all built for **tenths** (key `5.8`; the mathematically
correct `5.08` was **not among the options** — so the item was unsolvable-
correctly and rewarded a wrong answer). Same bug in the Chinese fields
(8 个百分之一 keyed as 5.8). This is a genuine generator wording error in the
owner-approved K-G5 package that all previous audits missed (the repo audit
compares the key against `independentAnswer`, which shared the same bug).

**Fix applied** (minimal, preserves the item design and difficulty): reworded
the ask to *tenths* / *十分之一* in en/zh/zhHans, aligned explanations and
`independentSolution`, keys and options untouched; `reviewNotes` documents the
change per item. Verified live: the fixed item serves "8 tenths", grades 5.8
correct and 5.08 incorrect.

## Method

1. Exported the 1,992 CA questions through the production store
   (`getPublicQuestionsFromStore` + `getQuestionForAttemptFromStore`).
2. Wrote ~100 prompt-text parsers covering every template family in both CA
   banks (41 K-G5 knowledge-point families incl. picture-graph comparisons,
   coin counts, teen-number models, clock arithmetic, number-line fractions,
   equivalent fractions, transitive length; and all 70 regenerated G6-G12
   families). Each parser recomputes the answer with exact arithmetic from the
   words a student reads.
3. Compared each recomputed answer against key+aliases under grader semantics;
   for every MC also verified **exactly one** option grades correct.
4. Language fidelity: all numeric values in zh/zhHans prompts checked against
   the English (knowledge-point code prefixes like "1-H.1" excluded — zh
   renders them as prose).
5. CCSS bounds: every parsed K-P5 answer checked against grade-level number
   ranges (K ≤ 20, G1 ≤ 120, G2 ≤ 1,000, …) — 0 violations; every K prompt
   keeps all quantities ≤ 20.
6. Iterated the verifier until 0 unparsed / 0 solver-declined: coverage is
   100% of 1,992 — nothing was passed on trust.

## CCSS grade-placement map (standard 1)

K-G5 knowledge points align 1:1 with their encoded CCSS domains
(`k-cc/k-oa/k-nbt/k-g/k-md`, `p1-1-oa` … `p5-5-g`), verified at content level:
K counting/compare/compose within 20 (K.CC/K.OA/K.NBT), G1 join/take-away
within 10-20 + tens/ones (1.OA/1.NBT/1.MD/1.G), G2 arrays/3-digit place
value/money-time (2.OA/2.NBT/2.MD/2.G), G3 mult-div facts/fractions/area-
perimeter-time (3.OA/3.NF/3.MD/3.G), G4 factors/multi-digit/fraction-decimal/
conversions-angles (4.OA/4.NBT/4.NF/4.MD/4.G), G5 expressions/decimals place
value/fraction ops/volume/coordinates (5.OA/5.NBT/5.NF/5.MD/5.G).

G6-G12 chapters: G6 = 6.RP/6.NS/6.EE/6.G/6.SP (unit rates, percent-of,
integer compare, |x|, expressions, one-step equations, prism volume, triangle
area, mean/median); G7 = 7.RP/7.NS/7.EE/7.G/7.SP (proportions, k=y/x, integer
chains, fraction products, two-step/distribute equations, scale drawings,
circumference, probability); G8 = 8.EE/8.F/8.G/8.SP (variables-both-sides,
sum-difference systems, slope, y-value of y=mx+b — function-notation-free,
translations/reflections, Pythagorean theorem, distance, fit-line
predictions); Math I = A-CED/F-IF (context equations, f(x) notation and
evaluation, quadratic evaluation); Math II = G-CO/G-SRT/G-C/A-REI.4/S-CP
(triangle angles, similarity, tan ratios, arcs/sectors, factoring roots,
discriminant, conditional probability); Math III = F-BF/F-LE/F-TF/S-ID/S-IC
(shifts, inverses, doubling growth, logs, amplitude/period, residuals, SSE
comparison, sampling); G12 = N-Q/A-APR/F-IF.6/S-MD/S-ID.4 (unit conversion,
significant figures, polynomial evaluation/roots, average rate of change,
vertex maxima, expected value, z-scores, break-even modeling).

Two borderline placements, both consistent with their owner-defined chapter
titles and kept: numeric residuals appear at G8 ("Bivariate Data and Claims" —
CCSS treats residuals formally at Math III, informally with 8.SP fit lines)
and quadratic evaluation/vertex at Math I ("Linear and Quadratic Models" —
full quadratic treatment is Math II).

## Parser-calibration notes (for the record)

All 44 initially-reported mismatches outside the decimals family were verifier
false positives, resolved by tightening parsers (count-only-the-subset asks,
picture-graph comparisons, dimes+pennies, left/right-group answer wording,
"which model shows 15" option matching); the stored keys were correct in every
one of those cases and were left untouched.
