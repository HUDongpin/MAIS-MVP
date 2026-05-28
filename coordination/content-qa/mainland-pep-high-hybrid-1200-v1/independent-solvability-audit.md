# Mainland PEP High Hybrid 1200 Independent Solvability Audit

- Date: 2026-05-23
- Session ID: S18
- Input: `questions.candidate.jsonl`
- Scope: candidate-only independent answer recomputation; no production integration
- Source-safety note: no live LLM, OCR, textbook body text, exam stem, official solution, source locator, image, or external question bank used.

## Executive Summary

- Total rows: 1200
- Attempted rows: 1200
- Pass rows: 1200
- Failing rows: 0
- Duplicate IDs: 0
- Duplicate exact prompts: 0
- Inventory issues: 0
- Independent review queue rows: 220
- Release recommendation: blocked-human-review

## Status Counts

| Status | Count |
| --- | ---: |
| pass | 1200 |

## Grade Status Counts

| Grade | Pass | Non-pass |
| --- | ---: | ---: |
| S4 | 400 | 0 |
| S5 | 400 | 0 |
| S6 | 400 | 0 |

## Type Status Counts

| Type | Pass | Non-pass |
| --- | ---: | ---: |
| multiple-choice | 360 | 0 |
| fill-in | 360 | 0 |
| short-answer | 480 | 0 |

## Topic Status Counts

| Topic | Pass | Non-pass |
| --- | ---: | ---: |
| pep-high-s4-complex-numbers | 40 | 0 |
| pep-high-s4-exp-log | 40 | 0 |
| pep-high-s4-function-properties | 40 | 0 |
| pep-high-s4-plane-vectors | 40 | 0 |
| pep-high-s4-probability | 40 | 0 |
| pep-high-s4-quadratic-inequalities | 40 | 0 |
| pep-high-s4-sets-logic | 40 | 0 |
| pep-high-s4-solid-geometry-intro | 40 | 0 |
| pep-high-s4-statistics | 40 | 0 |
| pep-high-s4-trigonometry | 40 | 0 |
| pep-high-s5-conics | 80 | 0 |
| pep-high-s5-derivatives | 80 | 0 |
| pep-high-s5-lines-circles | 80 | 0 |
| pep-high-s5-sequences | 80 | 0 |
| pep-high-s5-space-vectors | 80 | 0 |
| pep-high-s6-analytic-geometry-synthesis | 57 | 0 |
| pep-high-s6-bivariate-data | 57 | 0 |
| pep-high-s6-counting | 57 | 0 |
| pep-high-s6-derivative-synthesis | 57 | 0 |
| pep-high-s6-exam-practice | 58 | 0 |
| pep-high-s6-probability-statistics-synthesis | 57 | 0 |
| pep-high-s6-random-variables | 57 | 0 |

## Inventory Issues

- None.

## Non-Pass Rows

- None.

## Human Review Requirement

- Complete every row in `manual-review-results.csv` before promotion.
- Do not use manual notes to bypass solver gaps; fix the solver or candidate row and rerun this audit.
