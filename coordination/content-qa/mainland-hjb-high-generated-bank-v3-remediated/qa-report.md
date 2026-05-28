# Mainland HJB High Generated Bank V3 Remediated QA Package

- Date: 2026-05-24
- Session ID: S18
- Package status: candidate-only-remediation-qa-green-pending-owner-approval
- Baseline: frozen `mainland-hjb-high-generated-bank-v3`

## Inventory

| Metric | Value |
| --- | --- |
| Total questions | 1500 |
| S4 questions | 500 |
| S5 questions | 500 |
| S6 questions | 500 |
| Manual re-review queue rows | 200 |
| Completed manual re-review rows | 200 |
| Manual P0/P1/P2 rows | 0 / 0 / 0 |

## Per-grade Type Quotas

| Grade | Multiple-choice | Fill-in | Short-answer |
| --- | --- | --- | --- |
| S4 | 200 | 175 | 125 |
| S5 | 200 | 175 | 125 |
| S6 | 200 | 175 | 125 |

## Per-grade Difficulty Quotas

| Grade | Foundation | Core | Challenge | Exam |
| --- | --- | --- | --- | --- |
| S4 | 125 | 200 | 125 | 50 |
| S5 | 125 | 200 | 125 | 50 |
| S6 | 125 | 200 | 125 | 50 |

## Decision

- P2 remediation rebuilt the V3 candidate package offline while preserving V3 IDs, topic metadata, quotas, and safe-RAG trace fields.
- Automated solvability and quality audits are green, and S18 200-row manual re-review recorded P0/P1/P2 = 0/0/0.
- This clears the V3 candidate QA blocker only; it does not approve app integration. Keep V1 as production default until owner-approved S04/S08 integration planning.
