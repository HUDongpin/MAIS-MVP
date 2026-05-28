# Mainland HJB High Generated Bank V3 Manual QA Status

- Date: 2026-05-24
- Session ID: S18
- Scope: Union of solvability and quality manual-review queues.
- Decision: manual-sampling-blocked-pending-p2-remediation

## Executive Summary

| Metric | Value |
| --- | --- |
| Manual reviewed rows | 162 |
| Manual pass rows | 32 |
| P0 rows | 0 |
| P1 rows | 0 |
| P2 rows | 130 |
| P2 rate | 80.25% |
| App integration status | Not approved |

## Queue By Grade

| Grade | Rows |
| --- | --- |
| S4 | 54 |
| S5 | 54 |
| S6 | 54 |

## Queue By Type

| Type | Rows |
| --- | --- |
| multiple-choice | 68 |
| fill-in | 61 |
| short-answer | 33 |

## Queue By Difficulty

| Difficulty | Rows |
| --- | --- |
| Foundation | 47 |
| Core | 61 |
| Challenge | 37 |
| Exam | 17 |

## P2 Issue Counts

| Issue | Rows |
| --- | --- |
| p2-template-family-overuse | 116 |
| p2-challenge-exam-too-routine | 22 |
| p2-trig-advanced-row-is-basic-period-recall | 4 |

## Manual Gate

- The V3 package is source-safe and auto-solvable, but the manual queue shows excessive template-family repetition and too-routine Challenge/Exam items.
- Promotion remains blocked until P2 remediation rewrites the remediation queue and a fresh S18 manual re-review records P0/P1 = 0 and P2 <= 5%.
- Do not connect this package to production question-bank data, App UI, API, or release workflows.
