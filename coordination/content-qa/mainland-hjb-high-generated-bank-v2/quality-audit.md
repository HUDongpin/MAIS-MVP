# Mainland HJB High Generated Bank V2 Quality Audit

- Date: 2026-05-24
- Session ID: S18
- Scope: 1500 offline Shanghai Education Press / HuJiaoBan high-school candidate questions
- QA focus: independent solvability and answer-key match
- Physical source directory: `mainland-hjb-high-generated-bank-v2`; business, QA, app, and batch metadata label this package V2
- Method: deterministic row-level prompt-only solver plus red-flag scan; no live LLM, OCR, external textbook corpus, source body text, or stored answer leakage into solving

## Executive Summary

| Metric | Value |
| --- | --- |
| Expected questions | 1500 |
| Actual questions | 1500 |
| Solvable rows | 1500 |
| Solvable rate | 100.00% |
| Answer-matched rows | 1500 |
| Answer-match rate | 100.00% |
| Solver gaps | 0 |
| Answer mismatches | 0 |
| MC option failures | 0 |
| P0 rows | 0 |
| P1 rows | 0 |
| P2 rows | 0 |
| Approved rows | 1500 |
| Rewrite/remove rows | 0 |
| Second-review rows | 0 |
| Manual review queue rows | 370 |
| Manual reviewed rows | 370 |
| Release recommendation | Green: 1500/1500 V2 rows are independently solvable, answer-key matched, and S18 manual queue approved; proceed to S04/S08 integration planning only. |

## Chapter Failure Distribution

| Chapter | Failing Rows |
| --- | --- |
| None | 0 |

## Issue Code Distribution

| Issue Code | Rows |
| --- | --- |
| None | 0 |

## Solver Coverage

| Solver Rule | Rows |
| --- | --- |
| manual-review | 370 |
| three-number-mean | 120 |
| arithmetic-sequence-term | 111 |
| ellipse-c-squared | 93 |
| space-vector-norm-squared | 92 |
| two-point-slope | 92 |
| multiplication-rule-counting | 66 |
| cuboid-adjacent-face-area | 63 |
| single-draw-probability | 62 |
| quadratic-derivative-evaluation | 61 |
| complex-real-part | 60 |
| combination-choose-two | 59 |
| triangle-side-product | 58 |
| plane-vector-dot-product | 55 |
| trig-function-period | 53 |
| cuboid-volume | 43 |
| linear-function-evaluation | 30 |
| log-power-definition | 6 |
| exponential-function-evaluation | 3 |
| set-multiple-count | 2 |
| linear-inequality-bound | 1 |

## Inventory Issues

| Issue |
| --- |
| None |

## Manual QA Requirements

- 100% of rows with `decision != approve` must receive independent human solving before promotion.
- The pass-sample queue adds 50 approved rows per grade, forcing grade/type/difficulty/chapter coverage and prioritizing Exam/Challenge rows.
- If manual sampling finds a serious mathematical error rate above 1% in any grade/topic/type bucket, expand that bucket to 100% manual review.
- App integration remains blocked until P0/P1 unresolved rows are 0 and both final solvability and final answer-match rates are 100%.
