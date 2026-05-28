# Mainland HJB High Generated Bank V4 Quality Audit

- Date: 2026-05-24
- Session ID: S18
- Scope: 1500 offline Shanghai Education Press / HuJiaoBan high-school candidate questions
- QA focus: independent solvability and answer-key match
- Method: deterministic row-level solver; no live LLM, OCR, external textbook corpus, source body text, or stored answer leakage into solving

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
| Manual review queue rows | 150 |
| Release recommendation | Green: 1500/1500 rows are independently solvable and answer-key matched; proceed to S18 manual sampling before any app integration. |

## Chapter Failure Distribution

| Chapter | Failing Rows |
| --- | --- |
| None | 0 |

## Solver Coverage

| Solver Rule | Rows |
| --- | --- |
| three-number-mean | 130 |
| arithmetic-sequence-term | 115 |
| ellipse-c-squared | 95 |
| space-vector-norm-squared | 95 |
| two-point-slope | 95 |
| triangle-side-product | 83 |
| combination-choose-two | 75 |
| cuboid-adjacent-face-area | 75 |
| multiplication-rule-counting | 75 |
| quadratic-derivative-evaluation | 75 |
| single-draw-probability | 75 |
| linear-function-evaluation | 70 |
| trig-function-period | 63 |
| complex-real-part | 62 |
| plane-vector-dot-product | 62 |
| cuboid-volume | 55 |
| exponential-function-evaluation | 50 |
| linear-inequality-bound | 50 |
| log-power-definition | 50 |
| set-multiple-count | 50 |

## Inventory Issues

| Issue |
| --- |
| None |

## QA Decision

- This quality audit verifies that each current offline fallback row can be solved from the prompt alone and that the independently computed answer matches the stored answer.
- This does not approve app integration. S18 manual sampling is still required for pedagogy, wording naturalness, grade fit, and topic richness.
