# S18 Mainland PEP High RAG-v4 Candidate Solvability And Answer-Key Audit

- Date: 2026-05-23
- Session ID: S18
- Scope: 1500 candidate-only Mainland PEP high-school rag-v4 questions
- Output type: Deterministic content QA report; no live LLM, OCR, textbook corpus, or exam-paper source text
- Public rollout status: blocked until this automated gate and S18 manual sampling both pass

## Executive Summary

| Metric | Value |
| --- | --- |
| Candidate-only | true |
| Expected candidate questions | 1500 |
| Actual candidate questions | 1500 |
| Public Mainland PEP high-school questions | 3300 |
| S4 candidates | 500 |
| S5 candidates | 500 |
| S6 candidates | 500 |
| Duplicate IDs | 0 |
| Duplicate exact prompts | 0 |
| Passing rows | 1500 |
| Failing rows | 0 |
| Release recommendation | Green: all rag-v4 candidates are deterministically solvable and answer-key matched; S18 manual sampling is still required before public rollout. |

## Status Counts

| Status | Count |
| --- | --- |
| pass | 1500 |
| content-error | 0 |
| solver-gap | 0 |
| answer-mismatch | 0 |
| ambiguous-mc | 0 |
| grader-gap | 0 |

## Batch Counts

| Batch | Count |
| --- | --- |
| rag-v4 | 1500 |

## Inventory Issues

| Issue |
| --- |
| None |

## Sample Passing Rows

| questionId | track | batch | grade | topicId | type | storedAnswer | independentAnswer | status | severity | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pep-high-s4-rag4-mc-001 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-sets-logic | multiple-choice | 4 | 4 | pass | none | OK |
| pep-high-s4-rag4-mc-002 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-sets-logic | multiple-choice | 3 | 3 | pass | none | OK |
| pep-high-s4-rag4-mc-003 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-sets-logic | multiple-choice | 5 | 5 | pass | none | OK |
| pep-high-s4-rag4-mc-004 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-sets-logic | multiple-choice | 3 | 3 | pass | none | OK |
| pep-high-s4-rag4-mc-005 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-sets-logic | multiple-choice | 5 | 5 | pass | none | OK |
| pep-high-s4-rag4-mc-006 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-sets-logic | multiple-choice | 3 | 3 | pass | none | OK |
| pep-high-s4-rag4-mc-007 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-sets-logic | multiple-choice | 4 | 4 | pass | none | OK |
| pep-high-s4-rag4-mc-008 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-sets-logic | multiple-choice | 3 | 3 | pass | none | OK |
| pep-high-s4-rag4-mc-009 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-sets-logic | multiple-choice | 5 | 5 | pass | none | OK |
| pep-high-s4-rag4-mc-010 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-sets-logic | multiple-choice | 3 | 3 | pass | none | OK |
| pep-high-s4-rag4-mc-011 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-sets-logic | multiple-choice | 4 | 4 | pass | none | OK |
| pep-high-s4-rag4-mc-012 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-sets-logic | multiple-choice | 3 | 3 | pass | none | OK |
| pep-high-s4-rag4-mc-013 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-sets-logic | multiple-choice | 5 | 5 | pass | none | OK |
| pep-high-s4-rag4-mc-014 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-sets-logic | multiple-choice | 3 | 3 | pass | none | OK |
| pep-high-s4-rag4-mc-015 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-sets-logic | multiple-choice | 5 | 5 | pass | none | OK |
| pep-high-s4-rag4-mc-016 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-sets-logic | multiple-choice | 3 | 3 | pass | none | OK |
| pep-high-s4-rag4-mc-017 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-sets-logic | multiple-choice | 4 | 4 | pass | none | OK |
| pep-high-s4-rag4-mc-018 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-quadratic-inequalities | multiple-choice | 2 | 2 | pass | none | OK |
| pep-high-s4-rag4-mc-019 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-quadratic-inequalities | multiple-choice | 2 | 2 | pass | none | OK |
| pep-high-s4-rag4-mc-020 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-quadratic-inequalities | multiple-choice | 2 | 2 | pass | none | OK |
| pep-high-s4-rag4-mc-021 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-quadratic-inequalities | multiple-choice | 2 | 2 | pass | none | OK |
| pep-high-s4-rag4-mc-022 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-quadratic-inequalities | multiple-choice | 2 | 2 | pass | none | OK |
| pep-high-s4-rag4-mc-023 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-quadratic-inequalities | multiple-choice | 2 | 2 | pass | none | OK |
| pep-high-s4-rag4-mc-024 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-quadratic-inequalities | multiple-choice | 2 | 2 | pass | none | OK |
| pep-high-s4-rag4-mc-025 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-quadratic-inequalities | multiple-choice | 2 | 2 | pass | none | OK |
| pep-high-s4-rag4-mc-026 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-quadratic-inequalities | multiple-choice | 2 | 2 | pass | none | OK |
| pep-high-s4-rag4-mc-027 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-quadratic-inequalities | multiple-choice | 2 | 2 | pass | none | OK |
| pep-high-s4-rag4-mc-028 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-quadratic-inequalities | multiple-choice | 2 | 2 | pass | none | OK |
| pep-high-s4-rag4-mc-029 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-quadratic-inequalities | multiple-choice | 2 | 2 | pass | none | OK |
| pep-high-s4-rag4-mc-030 | MAINLAND_PEP_HIGH | rag-v4 | S4 | pep-high-s4-quadratic-inequalities | multiple-choice | 2 | 2 | pass | none | OK |

## Assumptions

- RAG-v4 is candidate-only and is not included in public mainlandPepHighQuestions.
- Solvable means the answer is derivable from checked-in prompt and options without external sources.
- Answer-key match means the independent answer matches answer or acceptedAnswers under MAIS answer normalization.
- Multiple-choice rows must have four unique options with exactly one option matching the independent answer.
- Fill-in and short-answer explanations must visibly reach the stored answer.
- No live LLM provider, OCR provider, textbook corpus, or exam-paper source text is used by this audit.
