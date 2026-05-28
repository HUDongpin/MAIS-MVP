# S18 Mainland High Question QA: Seed-v1 vs RAG-v2

- Date: 2026-05-21
- Session ID: S18
- Workstream: Curriculum QA and content quality
- Scope: Compare MAIS-owned Mainland high-school generated question batches only
- Source-safety note: No original exam-paper, textbook, answer, solution, scan, OCR, image, or raw source text was read or stored.

## Executive Summary

This report compares `seed-v1` (900 questions) with `rag-v2` (900 questions). RAG-v2 is ahead by 2.3 overall points in the automated triage score.

The automated scorer is a triage tool, not a final pedagogical verdict. It highlights questions for S18 manual review by checking structural quality, RAG/topic fit, answerability, duplication risk, and source-copying artifacts.

## Score Summary

| Batch | Count | Quality | Knowledge match | Solvability | Overall |
| --- | --- | --- | --- | --- | --- |
| seed-v1 | 900 | 79.6 | 100 | 88.5 | 89.4 |
| rag-v2 | 900 | 86.5 | 100 | 88.5 | 91.7 |
| rag-v2 minus seed-v1 | 0 | 6.9 | 0 | 0 | 2.3 |

## Review Recommendation Counts

| Batch | Pass | Sample review | Manual review | Blocker review |
| --- | --- | --- | --- | --- |
| seed-v1 | 29 | 871 | 0 | 0 |
| rag-v2 | 43 | 857 | 0 | 0 |

## Grade-Level Summary

| Batch | Grade | Count | Quality | Knowledge match | Solvability | Overall |
| --- | --- | --- | --- | --- | --- | --- |
| seed-v1 | S4 | 300 | 84.6 | 100 | 91.4 | 92 |
| seed-v1 | S5 | 300 | 79.1 | 100 | 86.9 | 88.7 |
| seed-v1 | S6 | 300 | 75.3 | 100 | 87.3 | 87.5 |
| rag-v2 | S4 | 300 | 89.3 | 100 | 91.5 | 93.6 |
| rag-v2 | S5 | 300 | 84.8 | 100 | 86.9 | 90.6 |
| rag-v2 | S6 | 300 | 85.3 | 100 | 87.1 | 90.8 |

## Top Risk Flags

| Batch | Risk flag | Count |
| --- | --- | --- |
| seed-v1 | near-duplicate-template-cluster | 830 |
| seed-v1 | exact-prompt-duplicate | 649 |
| seed-v1 | answer-not-shown-in-explanation | 516 |
| rag-v2 | near-duplicate-template-cluster | 820 |
| rag-v2 | answer-not-shown-in-explanation | 518 |
| rag-v2 | exact-prompt-duplicate | 312 |

## Lowest-Scoring Rows For S18 Triage

| Batch | Question ID | Grade | Topic | Type | Overall | Risk flags |
| --- | --- | --- | --- | --- | --- | --- |
| seed-v1 | pep-high-s4-fi-005 | S4 | pep-high-s4-trigonometry | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-006 | S4 | pep-high-s4-plane-vectors | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-009 | S4 | pep-high-s4-statistics | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-010 | S4 | pep-high-s4-probability | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-015 | S4 | pep-high-s4-trigonometry | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-016 | S4 | pep-high-s4-plane-vectors | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-019 | S4 | pep-high-s4-statistics | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-020 | S4 | pep-high-s4-probability | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-025 | S4 | pep-high-s4-trigonometry | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-026 | S4 | pep-high-s4-plane-vectors | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-029 | S4 | pep-high-s4-statistics | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-030 | S4 | pep-high-s4-probability | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-035 | S4 | pep-high-s4-trigonometry | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-036 | S4 | pep-high-s4-plane-vectors | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-039 | S4 | pep-high-s4-statistics | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-040 | S4 | pep-high-s4-probability | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-045 | S4 | pep-high-s4-trigonometry | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-046 | S4 | pep-high-s4-plane-vectors | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-049 | S4 | pep-high-s4-statistics | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-050 | S4 | pep-high-s4-probability | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-055 | S4 | pep-high-s4-trigonometry | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-056 | S4 | pep-high-s4-plane-vectors | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-059 | S4 | pep-high-s4-statistics | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-060 | S4 | pep-high-s4-probability | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-065 | S4 | pep-high-s4-trigonometry | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-066 | S4 | pep-high-s4-plane-vectors | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-069 | S4 | pep-high-s4-statistics | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-070 | S4 | pep-high-s4-probability | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-075 | S4 | pep-high-s4-trigonometry | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |
| seed-v1 | pep-high-s4-fi-076 | S4 | pep-high-s4-plane-vectors | fill-in | 84.7 | exact-prompt-duplicate, near-duplicate-template-cluster, answer-not-shown-in-explanation |

## 180-Question Manual Sample Queue

Sampling rule: each batch and grade contributes 30 questions, prioritizing low scores while forcing coverage of derivatives, trigonometry, sequences, space vectors, probability/statistics, and conics where present.

| Batch | Grade | Question ID | Topic | Type | Overall | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| seed-v1 | S4 | pep-high-s4-fi-005 | pep-high-s4-trigonometry | fill-in | 84.7 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-006 | pep-high-s4-plane-vectors | fill-in | 84.7 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-009 | pep-high-s4-statistics | fill-in | 84.7 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-010 | pep-high-s4-probability | fill-in | 84.7 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-015 | pep-high-s4-trigonometry | fill-in | 84.7 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-016 | pep-high-s4-plane-vectors | fill-in | 84.7 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-019 | pep-high-s4-statistics | fill-in | 84.7 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-020 | pep-high-s4-probability | fill-in | 84.7 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-025 | pep-high-s4-trigonometry | fill-in | 84.7 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-026 | pep-high-s4-plane-vectors | fill-in | 84.7 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-029 | pep-high-s4-statistics | fill-in | 84.7 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-030 | pep-high-s4-probability | fill-in | 84.7 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-035 | pep-high-s4-trigonometry | fill-in | 84.7 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-036 | pep-high-s4-plane-vectors | fill-in | 84.7 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-039 | pep-high-s4-statistics | fill-in | 84.7 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-040 | pep-high-s4-probability | fill-in | 84.7 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-045 | pep-high-s4-trigonometry | fill-in | 84.7 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-046 | pep-high-s4-plane-vectors | fill-in | 84.7 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-001 | pep-high-s4-sets-logic | fill-in | 97.3 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-011 | pep-high-s4-sets-logic | fill-in | 97.3 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-021 | pep-high-s4-sets-logic | fill-in | 97.3 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-031 | pep-high-s4-sets-logic | fill-in | 97.3 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-041 | pep-high-s4-sets-logic | fill-in | 97.3 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-051 | pep-high-s4-sets-logic | fill-in | 97.3 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-061 | pep-high-s4-sets-logic | fill-in | 97.3 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-071 | pep-high-s4-sets-logic | fill-in | 97.3 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-081 | pep-high-s4-sets-logic | fill-in | 97.3 | sample-review |
| seed-v1 | S4 | pep-high-s4-fi-091 | pep-high-s4-sets-logic | fill-in | 97.3 | sample-review |
| seed-v1 | S4 | pep-high-s4-mc-001 | pep-high-s4-sets-logic | multiple-choice | 97.3 | sample-review |
| seed-v1 | S4 | pep-high-s4-mc-011 | pep-high-s4-sets-logic | multiple-choice | 97.3 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-001 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-002 | pep-high-s5-lines-circles | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-003 | pep-high-s5-conics | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-004 | pep-high-s5-sequences | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-005 | pep-high-s5-derivatives | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-006 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-007 | pep-high-s5-lines-circles | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-008 | pep-high-s5-conics | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-009 | pep-high-s5-sequences | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-010 | pep-high-s5-derivatives | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-011 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-012 | pep-high-s5-lines-circles | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-013 | pep-high-s5-conics | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-014 | pep-high-s5-sequences | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-015 | pep-high-s5-derivatives | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-016 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-017 | pep-high-s5-lines-circles | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-018 | pep-high-s5-conics | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-021 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-031 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-041 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-051 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-061 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-071 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-081 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-fi-091 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| seed-v1 | S5 | pep-high-s5-mc-001 | pep-high-s5-space-vectors | multiple-choice | 91.3 | sample-review |
| seed-v1 | S5 | pep-high-s5-mc-011 | pep-high-s5-space-vectors | multiple-choice | 91.3 | sample-review |
| seed-v1 | S5 | pep-high-s5-mc-021 | pep-high-s5-space-vectors | multiple-choice | 91.3 | sample-review |
| seed-v1 | S5 | pep-high-s5-mc-031 | pep-high-s5-space-vectors | multiple-choice | 91.3 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-001 | pep-high-s6-counting | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-002 | pep-high-s6-random-variables | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-003 | pep-high-s6-bivariate-data | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-004 | pep-high-s6-derivative-synthesis | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-005 | pep-high-s6-analytic-geometry-synthesis | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-006 | pep-high-s6-probability-statistics-synthesis | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-007 | pep-high-s6-exam-practice | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-008 | pep-high-s6-counting | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-009 | pep-high-s6-random-variables | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-010 | pep-high-s6-bivariate-data | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-011 | pep-high-s6-derivative-synthesis | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-012 | pep-high-s6-analytic-geometry-synthesis | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-013 | pep-high-s6-probability-statistics-synthesis | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-014 | pep-high-s6-exam-practice | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-015 | pep-high-s6-counting | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-016 | pep-high-s6-random-variables | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-017 | pep-high-s6-bivariate-data | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-019 | pep-high-s6-analytic-geometry-synthesis | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-021 | pep-high-s6-exam-practice | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-031 | pep-high-s6-bivariate-data | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-041 | pep-high-s6-probability-statistics-synthesis | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-051 | pep-high-s6-random-variables | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-061 | pep-high-s6-analytic-geometry-synthesis | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-071 | pep-high-s6-counting | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-081 | pep-high-s6-derivative-synthesis | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-fi-091 | pep-high-s6-exam-practice | fill-in | 84.7 | sample-review |
| seed-v1 | S6 | pep-high-s6-mc-001 | pep-high-s6-counting | multiple-choice | 91.3 | sample-review |
| seed-v1 | S6 | pep-high-s6-mc-011 | pep-high-s6-derivative-synthesis | multiple-choice | 91.3 | sample-review |
| seed-v1 | S6 | pep-high-s6-mc-021 | pep-high-s6-exam-practice | multiple-choice | 91.3 | sample-review |
| seed-v1 | S6 | pep-high-s6-mc-031 | pep-high-s6-bivariate-data | multiple-choice | 91.3 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-051 | pep-high-s4-plane-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-052 | pep-high-s4-plane-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-053 | pep-high-s4-plane-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-054 | pep-high-s4-plane-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-055 | pep-high-s4-plane-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-056 | pep-high-s4-plane-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-057 | pep-high-s4-plane-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-058 | pep-high-s4-plane-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-059 | pep-high-s4-plane-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-060 | pep-high-s4-plane-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-091 | pep-high-s4-probability | fill-in | 84.7 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-092 | pep-high-s4-probability | fill-in | 84.7 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-093 | pep-high-s4-probability | fill-in | 84.7 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-094 | pep-high-s4-probability | fill-in | 84.7 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-095 | pep-high-s4-probability | fill-in | 84.7 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-096 | pep-high-s4-probability | fill-in | 84.7 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-097 | pep-high-s4-probability | fill-in | 84.7 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-098 | pep-high-s4-probability | fill-in | 84.7 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-041 | pep-high-s4-trigonometry | fill-in | 90.7 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-071 | pep-high-s4-solid-geometry-intro | fill-in | 90.7 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-081 | pep-high-s4-statistics | fill-in | 90.7 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-021 | pep-high-s4-function-properties | fill-in | 91.3 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-031 | pep-high-s4-exp-log | fill-in | 91.3 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-mc-021 | pep-high-s4-function-properties | multiple-choice | 91.3 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-mc-031 | pep-high-s4-exp-log | multiple-choice | 91.3 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-011 | pep-high-s4-quadratic-inequalities | fill-in | 93.3 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-061 | pep-high-s4-complex-numbers | fill-in | 93.3 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-fi-001 | pep-high-s4-sets-logic | fill-in | 97.3 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-mc-001 | pep-high-s4-sets-logic | multiple-choice | 97.3 | sample-review |
| rag-v2 | S4 | pep-high-s4-rag2-mc-011 | pep-high-s4-quadratic-inequalities | multiple-choice | 100 | pass |
| rag-v2 | S5 | pep-high-s5-rag2-fi-001 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-002 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-003 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-004 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-005 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-006 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-007 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-008 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-009 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-010 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-011 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-012 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-013 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-014 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-015 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-016 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-017 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-018 | pep-high-s5-space-vectors | fill-in | 84.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-061 | pep-high-s5-sequences | fill-in | 84.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-071 | pep-high-s5-sequences | fill-in | 84.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-081 | pep-high-s5-derivatives | fill-in | 84.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-091 | pep-high-s5-derivatives | fill-in | 84.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-021 | pep-high-s5-lines-circles | fill-in | 90.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-031 | pep-high-s5-lines-circles | fill-in | 90.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-041 | pep-high-s5-conics | fill-in | 90.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-fi-051 | pep-high-s5-conics | fill-in | 90.7 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-mc-001 | pep-high-s5-space-vectors | multiple-choice | 91.3 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-mc-011 | pep-high-s5-space-vectors | multiple-choice | 91.3 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-mc-021 | pep-high-s5-lines-circles | multiple-choice | 97.3 | sample-review |
| rag-v2 | S5 | pep-high-s5-rag2-mc-031 | pep-high-s5-lines-circles | multiple-choice | 97.3 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-030 | pep-high-s6-bivariate-data | fill-in | 84.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-031 | pep-high-s6-bivariate-data | fill-in | 84.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-032 | pep-high-s6-bivariate-data | fill-in | 84.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-033 | pep-high-s6-bivariate-data | fill-in | 84.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-034 | pep-high-s6-bivariate-data | fill-in | 84.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-035 | pep-high-s6-bivariate-data | fill-in | 84.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-036 | pep-high-s6-bivariate-data | fill-in | 84.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-037 | pep-high-s6-bivariate-data | fill-in | 84.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-038 | pep-high-s6-bivariate-data | fill-in | 84.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-039 | pep-high-s6-bivariate-data | fill-in | 84.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-040 | pep-high-s6-bivariate-data | fill-in | 84.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-041 | pep-high-s6-bivariate-data | fill-in | 84.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-042 | pep-high-s6-bivariate-data | fill-in | 84.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-043 | pep-high-s6-bivariate-data | fill-in | 84.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-044 | pep-high-s6-derivative-synthesis | fill-in | 84.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-045 | pep-high-s6-derivative-synthesis | fill-in | 84.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-046 | pep-high-s6-derivative-synthesis | fill-in | 84.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-047 | pep-high-s6-derivative-synthesis | fill-in | 84.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-051 | pep-high-s6-derivative-synthesis | fill-in | 84.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-073 | pep-high-s6-probability-statistics-synthesis | fill-in | 84.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-081 | pep-high-s6-probability-statistics-synthesis | fill-in | 84.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-001 | pep-high-s6-counting | fill-in | 90.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-011 | pep-high-s6-counting | fill-in | 90.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-021 | pep-high-s6-random-variables | fill-in | 90.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-058 | pep-high-s6-analytic-geometry-synthesis | fill-in | 90.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-061 | pep-high-s6-analytic-geometry-synthesis | fill-in | 90.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-071 | pep-high-s6-analytic-geometry-synthesis | fill-in | 90.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-fi-091 | pep-high-s6-exam-practice | fill-in | 90.7 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-mc-001 | pep-high-s6-counting | multiple-choice | 91.3 | sample-review |
| rag-v2 | S6 | pep-high-s6-rag2-mc-011 | pep-high-s6-counting | multiple-choice | 91.3 | sample-review |

## Scoring Rubric

- **Quality score:** bilingual prompt/explanation presence, prompt clarity, duplicate/near-duplicate pressure, multiple-choice option quality, and source-copying artifact scan.
- **Knowledge match score:** grade/topic validity, safe RAG evidence availability, evidence-card ID validity, concept overlap with the topic, and difficulty presence.
- **Solvability score:** answer presence, explanation presence, prompt context, multiple-choice answer uniqueness, and whether non-choice explanations visibly reach the answer.

## S18 Manual Review Template

- Final gate decision: Pending S18 manual sample review.
- Manual-review pass criteria: no mathematical answer-key defects, topic match is plausible, Chinese terminology is suitable for Mainland learners, and no question resembles source material.
- Required action for blocker rows: inspect by question ID, fix the generator if a pattern-level issue exists, regenerate, rerun this comparison, then rerun `npm run test:question-bank`.

## Assumptions

- The baseline batch is the current repository's seed-v1 900-question Mainland high-school bank.
- The comparison uses only MAIS-owned generated questions and safe RAG metadata; it does not read original exam papers or textbook source text.
- Automated scores are triage signals. S18 human sampling remains the release-quality authority.
- No student-facing API or question payload shape is changed by this QA workflow.
