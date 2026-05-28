# S18 Full Question Bank Solvability And Answer-Key Audit

- Date: 2026-05-26
- Session ID: S18
- Scope: 285 HK questions plus 1200 Mainland PEP primary questions plus 1200 Mainland PEP junior questions plus 4800 Mainland PEP high-school questions plus 1500 Mainland HJB primary V1 questions plus 6000 Mainland HJB high-school approved questions
- Output type: Deterministic content QA report; no live LLM or external math service

## Executive Summary

| Metric | Value |
| --- | --- |
| Total questions | 16485 |
| HK questions | 285 |
| Mainland PEP primary questions | 1200 |
| Mainland PEP junior questions | 1200 |
| Mainland PEP high questions | 4800 |
| Mainland HJB junior V2 questions | 1500 |
| Mainland HJB primary V1 questions | 1500 |
| Mainland HJB high approved questions | 6000 |
| Passing rows | 16485 |
| Failing rows | 0 |
| Release recommendation | Green: all current questions are deterministically solvable and answer-key matched. |

## Status Counts

| Status | Count |
| --- | --- |
| pass | 16485 |
| content-error | 0 |
| solver-gap | 0 |
| answer-mismatch | 0 |
| ambiguous-mc | 0 |
| grader-gap | 0 |

## Batch Counts

| Batch | Count |
| --- | --- |
| hk | 285 |
| primary-rag-v1 | 1200 |
| junior-rag-v2-1200 | 1200 |
| seed-v1 | 900 |
| rag-v2 | 900 |
| rag-v3 | 1500 |
| rag-v4 | 1500 |
| hjb-junior-v2-1500 | 1500 |
| hjb-primary-v1 | 1500 |
| hjb-v1 | 1500 |
| hjb-v2 | 1500 |
| hjb-v3-remediated | 1500 |
| hjb-v4-remediated | 1500 |

## Sample Passing Rows

| questionId | track | batch | grade | topicId | type | storedAnswer | independentAnswer | status | severity | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| q1 | HK | hk | S1 | integers | multiple-choice | 5 | 5 | pass | none | OK |
| q2 | HK | hk | S1 | algebra-basics | fill-in | 5x | 5x | pass | none | OK |
| q3 | HK | hk | S2 | coordinates | multiple-choice | IV | IV | pass | none | OK |
| q4 | HK | hk | S2 | linear-equations | fill-in | 4 | 4 | pass | none | OK |
| q5 | HK | hk | S3 | quadratic-patterns | multiple-choice | x = 2 | x = 2 | pass | none | OK |
| q6 | HK | hk | S3 | trigonometry-basics | short-answer | 3/5 | 3/5 | pass | none | OK |
| q7 | HK | hk | S4 | functions | multiple-choice | 7 | 7 | pass | none | OK |
| q8 | HK | hk | S4 | coordinate-geometry | short-answer | 3 | 3 | pass | none | OK |
| q9 | HK | hk | S5 | probability-s5 | multiple-choice | 1/2 | 1/2 | pass | none | OK |
| q10 | HK | hk | S5 | differentiation-intro | short-answer | 2x | 2x | pass | none | OK |
| q11 | HK | hk | S6 | calculus | multiple-choice | Local maximum | Local maximum | pass | none | OK |
| q12 | HK | hk | S6 | statistics-s6 | fill-in | 2 | 2 | pass | none | OK |
| q13 | HK | hk | S1 | angles | multiple-choice | 115° | 115° | pass | none | OK |
| q14 | HK | hk | S1 | ratios | short-answer | 2:3 | 2:3 | pass | none | OK |
| q15 | HK | hk | S1 | statistics-s1 | short-answer | 7 | 7 | pass | none | OK |
| q16 | HK | hk | S2 | transformations | multiple-choice | (-3, -2) | (-3, -2) | pass | none | OK |
| q17 | HK | hk | S2 | probability-s2 | multiple-choice | 2/5 | 2/5 | pass | none | OK |
| q18 | HK | hk | S3 | polynomials | short-answer | x^2 + 5x + 6 | x^2 + 5x + 6 | pass | none | OK |
| q19 | HK | hk | S3 | circles | multiple-choice | 50° | 50° | pass | none | OK |
| q20 | HK | hk | S4 | more-algebra | short-answer | x^2 | x^2 | pass | none | OK |

## Assumptions

- Solvable means the answer is derivable from checked-in prompt, options, and diagram data without external sources.
- Answer-key match means the independent answer matches answer or acceptedAnswers under MAIS answer normalization.
- Mainland PEP primary questions are checked by deterministic family audit rules derived from question metadata, not by reading stored answers.
- Mainland PEP junior questions are checked against the S18-reviewed deterministic v2 1200-question generation metadata.
- Mainland PEP high-school questions are checked by prompt-derived solver rules, not by reusing the original generator draft values.
- Mainland HJB junior V2 1500 questions are included from the S18-approved post-repair production question pack.
- Mainland HJB primary V1 questions are included from the S18 DeepSeek-v4-pro-remediated QA-green production question pack.
- Mainland HJB high-school approved V1, V2, V3-remediated, and V4-remediated questions are included from reviewed production question packs.
- No live LLM provider, OCR provider, textbook corpus, or exam-paper source text is used by this audit.
