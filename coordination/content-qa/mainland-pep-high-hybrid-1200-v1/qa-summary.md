# Mainland PEP High Hybrid 1200 Candidate QA Summary

- Date: 2026-05-23
- Session ID: S18
- Scope: Review-only Mainland PEP high-school S4-S6 candidate pack
- Candidate package: `mainland-pep-high-hybrid-1200-v1`
- Hybrid mode: `bl`/DashScope attempted first, no API key found; deterministic rule fallback generated all rows.
- Source-safety boundary: used committed MAIS safe RAG and exam-pattern metadata only; no textbook body text, exam stem, official solution wording, OCR, image, source locator, page number, or secret was read or stored.
- Official curriculum reference for human reviewers: https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517519489596282.pdf

## Executive Summary

- QA status: auto-qa-passed-human-review-required
- Total questions: 1200 / 1200
- Duplicate IDs: 0
- Duplicate exact prompts: 0
- Manual review queue rows: 220
- Started at: 2026-05-23T14:03:17.221Z
- Finished at: 2026-05-23T14:03:17.278Z

## Grade And Type Counts

| Grade | Total | Multiple choice | Fill-in | Short answer |
| --- | ---: | ---: | ---: | ---: |
| S4 | 400 | 120 | 120 | 160 |
| S5 | 400 | 120 | 120 | 160 |
| S6 | 400 | 120 | 120 | 160 |

## Grade And Difficulty Counts

| Grade | Foundation | Core | Challenge | Exam |
| --- | ---: | ---: | ---: | ---: |
| S4 | 80 | 180 | 100 | 40 |
| S5 | 60 | 160 | 120 | 60 |
| S6 | 40 | 120 | 140 | 100 |

## Topic Coverage

| Grade | Topic | Expected | Actual | MC | FI | SA |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| S4 | pep-high-s4-sets-logic | 40 | 40 | 12 | 12 | 16 |
| S4 | pep-high-s4-quadratic-inequalities | 40 | 40 | 12 | 12 | 16 |
| S4 | pep-high-s4-function-properties | 40 | 40 | 12 | 12 | 16 |
| S4 | pep-high-s4-exp-log | 40 | 40 | 12 | 12 | 16 |
| S4 | pep-high-s4-trigonometry | 40 | 40 | 12 | 12 | 16 |
| S4 | pep-high-s4-plane-vectors | 40 | 40 | 12 | 12 | 16 |
| S4 | pep-high-s4-complex-numbers | 40 | 40 | 12 | 12 | 16 |
| S4 | pep-high-s4-solid-geometry-intro | 40 | 40 | 12 | 12 | 16 |
| S4 | pep-high-s4-statistics | 40 | 40 | 12 | 12 | 16 |
| S4 | pep-high-s4-probability | 40 | 40 | 12 | 12 | 16 |
| S5 | pep-high-s5-space-vectors | 80 | 80 | 24 | 24 | 32 |
| S5 | pep-high-s5-lines-circles | 80 | 80 | 24 | 24 | 32 |
| S5 | pep-high-s5-conics | 80 | 80 | 24 | 24 | 32 |
| S5 | pep-high-s5-sequences | 80 | 80 | 24 | 24 | 32 |
| S5 | pep-high-s5-derivatives | 80 | 80 | 24 | 24 | 32 |
| S6 | pep-high-s6-counting | 57 | 57 | 17 | 17 | 23 |
| S6 | pep-high-s6-random-variables | 57 | 57 | 17 | 17 | 23 |
| S6 | pep-high-s6-bivariate-data | 57 | 57 | 17 | 17 | 23 |
| S6 | pep-high-s6-derivative-synthesis | 57 | 57 | 17 | 17 | 23 |
| S6 | pep-high-s6-analytic-geometry-synthesis | 57 | 57 | 17 | 17 | 23 |
| S6 | pep-high-s6-probability-statistics-synthesis | 57 | 57 | 17 | 17 | 23 |
| S6 | pep-high-s6-exam-practice | 58 | 58 | 18 | 18 | 22 |

## Auto-QA Issues

- None.

## Human Review Gate

- S18 must manually solve/review at least 10 questions per topic, plus every auto-flagged row.
- Candidate rows must not be promoted into `data/mainlandPepHighQuestions.ts` until manual review passes and owner explicitly approves production integration.
- S04/S08 coordination is required before any formal question-bank integration.
