# Mainland HJB High Generated Bank V3 Remediated Quality Audit

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
| Release recommendation | Green: 1500/1500 rows are independently solvable and answer-key matched; proceed to S18 P2 remediation re-review before any app integration. |

## Chapter Failure Distribution

| Chapter | Failing Rows |
| --- | --- |
| None | 0 |

## Solver Coverage

| Solver Rule | Rows |
| --- | --- |
| arithmetic-sequence-term | 106 |
| three-number-mean | 80 |
| ellipse-c-squared | 64 |
| space-vector-norm-squared | 64 |
| two-point-slope | 64 |
| complex-real-part | 62 |
| remediated-triangle-area | 60 |
| remediated-mean-after-adding-value | 50 |
| cuboid-adjacent-face-area | 48 |
| single-draw-probability | 48 |
| linear-function-evaluation | 47 |
| plane-vector-dot-product | 46 |
| multiplication-rule-counting | 42 |
| trig-function-period | 42 |
| quadratic-derivative-evaluation | 38 |
| remediated-combination-with-observer | 38 |
| combination-choose-two | 37 |
| remediated-derivative-tangent-intercept | 37 |
| remediated-multiplication-rule-with-exception | 33 |
| remediated-ellipse-focal-distance-squared | 31 |
| remediated-parallel-line-value | 31 |
| remediated-space-vector-translation | 31 |
| remediated-cuboid-volume-sum | 28 |
| cuboid-volume | 27 |
| remediated-cuboid-adjacent-face-sum | 27 |
| remediated-two-red-without-replacement | 27 |
| exponential-function-evaluation | 25 |
| linear-inequality-bound | 25 |
| log-power-definition | 25 |
| remediated-exponential-linked-input | 25 |
| remediated-inequality-integer-count | 25 |
| remediated-log-linked-exponents | 25 |
| remediated-set-symmetric-difference | 25 |
| set-multiple-count | 25 |
| remediated-linear-function-increment | 23 |
| remediated-triangle-cosine-law | 23 |
| remediated-trig-max-count | 21 |
| remediated-plane-vector-identity | 16 |
| remediated-arithmetic-series-sum | 9 |

## Inventory Issues

| Issue |
| --- |
| None |

## QA Decision

- This quality audit verifies that each current offline fallback row can be solved from the prompt alone and that the independently computed answer matches the stored answer.
- This does not approve app integration. S18 P2 remediation re-review is still required for pedagogy, wording naturalness, grade fit, and topic richness.
