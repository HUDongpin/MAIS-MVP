# Mainland HJB High Generated Bank V3 Remediated Solvability And Answer-Shape Audit

- Date: 2026-05-24
- Session ID: S18
- Scope: 1500 offline Mainland Shanghai Education Press / HuJiaoBan high-school candidate questions
- Output type: Row-level deterministic structure/source-distance/answer-shape audit; no live LLM, OCR, external textbook corpus, or exam-paper source text

## Executive Summary

| Metric | Value |
| --- | --- |
| Expected questions | 1500 |
| Actual questions | 1500 |
| S4 questions | 500 |
| S5 questions | 500 |
| S6 questions | 500 |
| Passing rows | 1500 |
| Rows requiring review | 0 |
| P0 rows | 0 |
| P1 rows | 0 |
| P2 rows | 0 |
| Manual review queue rows | 150 |
| Cross-prior-package duplicate check | Checked 7500 prior HJB high rows; duplicate exact prompts 0. |
| Release recommendation | Green automated package checks: structure, source-distance wording, answer-shape, duplicate, and quota checks passed; S18 P2 remediation re-review remains required before app integration. |

## Type Counts

| Type | Count |
| --- | --- |
| multiple-choice | 600 |
| fill-in | 525 |
| short-answer | 375 |

## Difficulty Counts

| Difficulty | Count |
| --- | --- |
| Foundation | 375 |
| Core | 600 |
| Challenge | 375 |
| Exam | 150 |

## Inventory Issues

| Issue |
| --- |
| None |

## Manual Review Status

- Original V3 P2 rows and the remediated Challenge/Exam sweep must be manually re-reviewed before app integration.
- A 150-row structure pass sample is queued by this audit; the separate remediation queue contains the mandatory V3 P2 recheck and targeted Challenge/Exam sweep.
- This audit does not claim full human mathematical proof of every item; it verifies deterministic packaging, source-distance wording, answer shape, duplicates, and quota readiness.

## Retest

- After any edit to `questions.jsonl`, rerun `node coordination/content-qa/mainland-hjb-high-generated-bank-v3-remediated/audit-solvability.mjs`.
- Before any future production integration, coordinate with S04/S08 and run production question-bank checks after conversion.
