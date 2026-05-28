# S18 Mainland PEP Primary DeepSeek 453 Manual Review

- Date: 2026-05-23
- Session ID: S18
- Workstream: Curriculum QA and content quality
- Scope: 453 Mainland PEP primary DeepSeek rows with `solver-gap / pending-s18-review` status only
- Source files: `coordination/content-qa/mainland-pep-primary-generated-bank-v1/solvability-audit.json`, `coordination/content-qa/mainland-pep-primary-generated-bank-v1/manual-review-results.csv`, `coordination/content-qa/mainland-pep-primary-generated-bank-v1/manual-review-queue.csv`, `coordination/content-qa/mainland-pep-primary-generated-bank-v1/questions.jsonl`
- Output CSV: `coordination/content-qa/2026-05-23-S18-mainland-pep-primary-deepseek-453-manual-review.csv`
- App status: offline candidate-only; not integrated into `data/questions.ts`, app routes, components, or production question bank
- Live LLM status: not used. `bl auth status` was attempted first but no `DASHSCOPE_API_KEY` was configured.

## Executive Summary

S18 completed a row-level manual content review for the 453 DeepSeek-generated Mainland PEP primary questions that remained outside deterministic solver coverage. Queue alignment passed: the 453 IDs match across the audit JSON, `manual-review-results.csv` pending rows, and `manual-review-queue.csv` required solver-gap rows.

Final manual review result: 424 approved, 5 rewrite, and 24 reject. Approved rows may move to a later S04/S08 candidate-integration evaluation only after owner approval; rewrite rows need a content repair task; reject rows must not enter the candidate pool.

## Queue Alignment

| Source | Expected | Actual | Status |
| --- |--- |--- |--- |
| solvability-audit.json rows with status=solver-gap | 453 | 453 | pass |
| manual-review-results.csv verdict=pending-s18-review | 453 | 453 | pass |
| manual-review-queue.csv reviewReason=required-solver-gap | 453 | 453 | pass |
| DeepSeek-vs-local blind queue | 480 | 480 | not used for this 453-row signoff because it includes a different sampling scope |

## Result Summary

| Verdict | Count |
| --- |--- |
| approve | 424 |
| rewrite | 5 |
| reject | 24 |

| Issue type | Count |
| --- |--- |
| answer-error | 19 |
| ambiguous-prompt | 6 |
| grade-mismatch | 1 |
| explanation-error | 1 |
| language-polish | 2 |
| none | 424 |

## By Grade

| Grade | Rows | Approve | Rewrite | Reject |
| --- |--- |--- |--- |--- |
| P1 | 58 | 54 | 2 | 2 |
| P2 | 74 | 72 | 2 | 0 |
| P3 | 71 | 66 | 0 | 5 |
| P4 | 90 | 86 | 1 | 3 |
| P5 | 73 | 68 | 0 | 5 |
| P6 | 87 | 78 | 0 | 9 |

## By Type

| Type | Rows | Approve | Rewrite | Reject |
| --- |--- |--- |--- |--- |
| multiple-choice | 198 | 191 | 0 | 7 |
| fill-in | 149 | 137 | 3 | 9 |
| short-answer | 106 | 96 | 2 | 8 |

## Rewrite Rows

| Question ID | Grade | Type | Issue | S18 note |
| --- |--- |--- |--- |--- |
| pep-primary-p1-lower-011 | P1 | fill-in | language-polish | Open fill-in answer is mathematically usable, but “下面哪种拼法” implies options; rewrite as “写出一种一定能拼成长方形的拼法”. |
| pep-primary-p1-lower-029 | P1 | fill-in | grade-mismatch | Math is correct, but a P1 item should not refer to 二（1）班; change the class label to 一（1）班 or remove it. |
| pep-primary-p2-upper-003 | P2 | short-answer | ambiguous-prompt | Cutting off a triangle corner can leave different shapes depending on the cut; constrain the cut path before using 4 angles as the answer. |
| pep-primary-p2-upper-040 | P2 | fill-in | language-polish | The intended false idea is correct, but the prompt says “下面哪个” without providing options; rewrite as “这个想法是否错误”. |
| pep-primary-p4-lower-024 | P4 | short-answer | explanation-error | Conclusion is correct for all isosceles cases, but the explanation only analyzes one angle arrangement; add a short all-cases justification. |

## Rejected Rows

| Question ID | Grade | Type | Issue | S18 note |
| --- |--- |--- |--- |--- |
| pep-primary-p1-upper-029 | P1 | fill-in | ambiguous-prompt | Missing referenced figure/options; the stored answer describes a ball rather than selecting a visible item. |
| pep-primary-p1-upper-046 | P1 | fill-in | ambiguous-prompt | Prompt asks how many windows are in a classroom but gives no countable information; stored answer 4 is not derivable. |
| pep-primary-p3-lower-011 | P3 | fill-in | answer-error | After moving 20 steps north and 15 steps east from the center, the position is northeast/north-east, not simply north. |
| pep-primary-p3-lower-014 | P3 | fill-in | answer-error | Excluding Feb 28 and including Mar 2 in leap year 2024 gives Feb 29, Mar 1, and Mar 2: 3 days, not 2. |
| pep-primary-p3-lower-021 | P3 | short-answer | answer-error | Facing east, two left turns face west, then a back turn faces east; stored answer west is wrong. |
| pep-primary-p3-lower-031 | P3 | multiple-choice | answer-error | Facing north, left turn faces west, then 180-degree turn faces east; answer field says west while explanation says east. |
| pep-primary-p3-upper-021 | P3 | short-answer | answer-error | 3:10 + 25 min + 1 h 40 min + 25 min = 5:40 pm, not 5:30 pm. |
| pep-primary-p4-upper-003 | P4 | short-answer | answer-error | With adjacent sides 8 and 12, a height of 9 cm can only correspond to the 8 cm base; area 108 cm² is geometrically impossible. |
| pep-primary-p4-upper-010 | P4 | multiple-choice | answer-error | The mistaken calculation gives dividend 954; 954 ÷ 36 = 26 remainder 18, so the answer field 27 is wrong. |
| pep-primary-p4-upper-015 | P4 | short-answer | answer-error | The dividend is 23×15+18=363; 363 ÷ 32 = 11 remainder 11, not remainder 15. |
| pep-primary-p5-lower-020 | P5 | fill-in | ambiguous-prompt | The three-view prompt omits the actual front/left/top views, so the minimum cube count cannot be independently determined. |
| pep-primary-p5-lower-021 | P5 | short-answer | answer-error | The stored answer starts with 2 but then lists four valid numbers; correct count is 4: 340, 430, 450, 540. |
| pep-primary-p5-lower-040 | P5 | fill-in | ambiguous-prompt | The described three views are internally inconsistent: front view only two horizontal squares conflicts with a left view requiring vertical height. |
| pep-primary-p5-upper-015 | P5 | short-answer | answer-error | The derived divisor is 10.8, but 12.6 ÷ 10.8 = 7/6 ≈ 1.167, not 1.05. |
| pep-primary-p5-upper-023 | P5 | fill-in | ambiguous-prompt | The height could correspond to either adjacent side, giving possible areas 30 or 40 cm²; the prompt does not determine a unique answer. |
| pep-primary-p6-upper-004 | P6 | multiple-choice | answer-error | The two route legs are not a 300-400-500 right triangle; the home-school displacement is about 608 m and the listed direction is wrong. |
| pep-primary-p6-upper-010 | P6 | multiple-choice | answer-error | The two bearings are nearly opposite, not perpendicular; the school-bookstore distance is about 498 m, not 360 m. |
| pep-primary-p6-upper-011 | P6 | fill-in | answer-error | If rope length L and trunk circumference C, L-C=2.4 and L/4=C, so C=0.8 m; 3.2 m is the rope length. |
| pep-primary-p6-upper-012 | P6 | short-answer | answer-error | The explanation correctly solves total books as 96, but the answer field says 160. |
| pep-primary-p6-upper-016 | P6 | multiple-choice | answer-error | The second 400 m bearing is opposite the first, so the route returns to the starting point; school is not due south. |
| pep-primary-p6-upper-022 | P6 | multiple-choice | answer-error | Vector check places the school north and slightly east of home; none of the listed options matches the stored answer. |
| pep-primary-p6-upper-024 | P6 | short-answer | answer-error | Solving (240+x)/(540+x)=0.6 gives x=210; the answer field says 60. |
| pep-primary-p6-upper-034 | P6 | multiple-choice | answer-error | The displacement is approximately east by north 40.9° / north by east 49.1°, not any exact listed option. |
| pep-primary-p6-upper-046 | P6 | fill-in | answer-error | North-east 30° and south-west 60° are not perpendicular; the distance is about 676.6 m, not 500 m. |

## Acceptance Notes

- Approved rows passed independent S18 review for mathematical correctness, answer-key agreement, explanation agreement, grade fit, simplified Chinese classroom wording, and source-distance status.
- Rewrite rows are not approved for app integration until the stated wording, grade-label, ambiguity, or explanation issue is repaired and rechecked.
- Rejected rows are blocked by answer errors, non-unique answers, missing visual information, or internally inconsistent geometry/direction data.
- This review does not promote any row into production. It only resolves the 453-row manual QA status for the offline DeepSeek candidate bank.

## Checks

- Queue alignment check passed: 453/453 IDs matched across the three authoritative files.
- CSV completeness check passed: 453/453 reviewed rows, with nonblank verdict and review notes on every row.
- Approved-row spot checks were included in the row-level manual review pass; no approved row carries an issue flag.
- Not run: `npm run type-check`, `npm run build`, browser checks, live LLM, OCR, textbook corpus, source image, or external solver. This was content-QA/reporting only and did not edit app/source question-bank files.

## Follow-up

- S18 or an owner-assigned content repair session should rewrite the 5 rewrite rows and regenerate/recheck those candidate rows.
- Reject rows should either be removed from the supplemental candidate pool or replaced by newly generated/reviewed items.
- S04/S08 should not integrate DeepSeek rows until owner approval confirms which approved rows, if any, should be promoted.
