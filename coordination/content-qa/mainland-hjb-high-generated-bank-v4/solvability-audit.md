# Mainland HJB High Generated Bank V4 Solvability And Answer-Shape Audit

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
| Cross-v1/v2 duplicate check | Checked 3000 v1/v2 rows; duplicate exact prompts 0. |
| Release recommendation | Green candidate package: automated structure, source-distance wording, answer-shape, duplicate, and quota checks passed; S18 manual sampling remains required before app integration. |

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

- All auto-issue rows must be manually rewritten or approved before app integration.
- A 150-row pass sample is queued: 50 rows each for S4, S5, and S6.
- This audit does not claim full human mathematical proof of every item; it verifies deterministic packaging, source-distance wording, answer shape, duplicates, and quota readiness.

## Retest

- After any edit to `questions.jsonl`, rerun `node coordination/content-qa/mainland-hjb-high-generated-bank-v4/audit-solvability.mjs`.
- Before any future production integration, coordinate with S04/S08 and run production question-bank checks after conversion.
