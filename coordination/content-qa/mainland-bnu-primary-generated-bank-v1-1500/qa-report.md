# Mainland BNU Primary Generated Bank V1 Candidate QA Report

- Date: 2026-05-26
- Session ID: S18
- Generator: DeepSeek API via project server-side `LLM_API_KEY` or `OPENAI_API_KEY` from local `.env.local`
- Model: `deepseek-v4-pro`
- API host: `api.deepseek.com`
- Started: 2026-05-26T14:40:45.018Z
- Finished: 2026-05-26T14:40:45.140Z
- Verdict: Auto structure/count/schema QA passed for the offline candidate package; S18 audit-solvability gate still required before any future integration decision.

## Scope

- Generated 1500 original Simplified Chinese questions for Mainland Beijing Normal University Press primary mathematics.
- Distribution target: 250 questions per P1, P2, P3, P4, P5, and P6.
- This package is candidate-only. It must not be connected to public practice, lessons, APIs, or production data in this task.
- RAG evidence source: 97 committed BNU primary textbook safe cards and 126 committed BNU primary assessment-pattern cards.
- This package does not reference junior zhongkao evidence and does not require a primary paper-pattern layer.
- Coverage plan rows: 1500.

## Secret Hygiene

- The script read the provider key locally and sent it only as an Authorization header.
- No API key, request header, raw prompt transcript, source file path, OCR text, page image, page number, or source locator is written into these artifacts.
- Batch cache files contain parsed generated questions only.

## Count Checks

- Total questions: 1500 / 1500.
- Duplicate IDs: none.
- Duplicate exact prompts: 0.
- Missing evidence rows: 0.
- Source-distance risk rows: 0.
- Malformed multiple-choice rows: 0.
- Missing accepted-answer rows: 0.
- Missing explanation rows: 0.

## Grade Counts

- P1: 250 / 250
- P2: 250 / 250
- P3: 250 / 250
- P4: 250 / 250
- P5: 250 / 250
- P6: 250 / 250

## Type Quota Checks

- P1 multiple-choice: 100 / 100
- P1 fill-in: 90 / 90
- P1 short-answer: 60 / 60
- P2 multiple-choice: 100 / 100
- P2 fill-in: 90 / 90
- P2 short-answer: 60 / 60
- P3 multiple-choice: 100 / 100
- P3 fill-in: 90 / 90
- P3 short-answer: 60 / 60
- P4 multiple-choice: 100 / 100
- P4 fill-in: 90 / 90
- P4 short-answer: 60 / 60
- P5 multiple-choice: 100 / 100
- P5 fill-in: 90 / 90
- P5 short-answer: 60 / 60
- P6 multiple-choice: 100 / 100
- P6 fill-in: 90 / 90
- P6 short-answer: 60 / 60

## Difficulty Quota Checks

- P1 Foundation: 138 / 138
- P1 Core: 87 / 87
- P1 Exam: 5 / 5
- P1 Challenge: 20 / 20
- P2 Foundation: 113 / 113
- P2 Core: 100 / 100
- P2 Exam: 7 / 7
- P2 Challenge: 30 / 30
- P3 Foundation: 88 / 88
- P3 Core: 112 / 112
- P3 Exam: 12 / 12
- P3 Challenge: 38 / 38
- P4 Foundation: 88 / 88
- P4 Core: 112 / 112
- P4 Exam: 12 / 12
- P4 Challenge: 38 / 38
- P5 Foundation: 63 / 63
- P5 Core: 125 / 125
- P5 Exam: 17 / 17
- P5 Challenge: 45 / 45
- P6 Foundation: 63 / 63
- P6 Core: 125 / 125
- P6 Exam: 17 / 17
- P6 Challenge: 45 / 45

## Manual QA Status

- `mathQaStatus`, `terminologyQaStatus`, and `manualQaStatus` remain `pending-s18-review` after generation; this task does not approve public integration.
- Rows with obvious self-contradiction, missing visual references, source-reference wording, or malformed answer design are rejected during generation retries and rechecked by the audit.
- Required next step for candidate QA: run `node coordination/content-qa/mainland-bnu-primary-generated-bank-v1-1500/audit-solvability.mjs`.
