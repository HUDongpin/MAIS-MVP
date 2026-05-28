# Mainland HJB High Generated Bank V4 Manual QA Summary

- Date: 2026-05-24
- Session ID: S18
- Scope: 150-row manual sample from the V4 offline candidate bank, with 50 rows each for S4, S5, and S6.
- Decision: manual-sampling-blocked-pending-p2-remediation

## Executive Summary

| Metric | Value |
| --- | --- |
| Manual sample rows | 150 |
| P0 rows | 0 |
| P1 rows | 0 |
| P2 rows | 59 |
| P2 rate | 39.33% |
| Acceptance threshold | P0/P1 = 0 and P2 <= 5% |
| Gate result | Blocked: P2 rate exceeds threshold |

## P2 Issue Distribution

| Issue code | Count |
| --- | --- |
| answer-normalization-p2 | 4 |
| difficulty-rigor-p2 | 51 |
| unused-condition-p2 | 7 |

## P2 By Grade

| Grade | Count |
| --- | --- |
| S4 | 21 |
| S5 | 22 |
| S6 | 16 |

## P2 By Type

| Type | Count |
| --- | --- |
| fill-in | 17 |
| multiple-choice | 23 |
| short-answer | 19 |

## P2 By Difficulty

| Difficulty | Count |
| --- | --- |
| Challenge | 34 |
| Core | 4 |
| Exam | 17 |
| Foundation | 4 |

## QA Decision

- Mathematical correctness, answer derivation, multiple-choice uniqueness, source-distance hygiene, and Simplified Chinese terminology pass for the sampled rows.
- The package is still blocked from app integration because 59/150 sampled rows carry P2 quality issues, mainly over-simple Challenge/Exam rows.
- Keep the V4 bank candidate-only until the P2 remediation queue is rewritten or the owner explicitly accepts the current deterministic template depth for a limited internal demo.
