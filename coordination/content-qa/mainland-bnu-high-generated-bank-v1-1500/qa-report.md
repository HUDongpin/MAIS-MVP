# Mainland BNU High Generated Bank V1 Candidate QA Report

- Date: 2026-05-27
- Session ID: S18
- Generator: DeepSeek API via local server-side `LLM_API_KEY` or `OPENAI_API_KEY` from `.env.local`
- Model: `deepseek-v4-pro`
- API host: `api.deepseek.com`
- Started: 2026-05-27T12:37:06.003Z
- Finished: 2026-05-27T13:30:27.482Z
- Verdict: Needs remediation before use.

## Scope

- Generated 1500 original Simplified Chinese questions for Mainland Beijing Normal University Press high-school mathematics.
- Distribution target: 500 questions per S4, S5, and S6 grade.
- This package is candidate-only. It must not be connected to public practice, lessons, APIs, adaptive recommendations, or production data in this task.
- RAG evidence source: 23 committed BNU high-school textbook safe cards and 57 committed BNU high-school assessment-pattern cards.
- Coverage plan rows: 1500.

## Secret Hygiene

- The script read the provider key locally and sent it only as an Authorization header.
- No API key, request header, raw prompt transcript, source file path, OCR text, page image, page number, or source locator is written into these artifacts.
- Batch cache files contain parsed generated questions only.

## Count Checks

- Total questions: 1500 / 1500.
- Duplicate IDs: none.
- Duplicate exact prompts: 63.
- Missing evidence rows: 0.
- Source-distance risk rows: 0.
- Malformed multiple-choice rows: 0.
- Missing accepted-answer rows: 0.
- Missing explanation rows: 0.

## Grade Counts

- S4: 500 / 500
- S5: 500 / 500
- S6: 500 / 500

## Type Quota Checks

- S4 multiple-choice: 175 / 175
- S4 fill-in: 150 / 150
- S4 short-answer: 175 / 175
- S5 multiple-choice: 175 / 175
- S5 fill-in: 150 / 150
- S5 short-answer: 175 / 175
- S6 multiple-choice: 175 / 175
- S6 fill-in: 150 / 150
- S6 short-answer: 175 / 175

## Difficulty Quota Checks

- S4 Foundation: 150 / 150
- S4 Core: 230 / 230
- S4 Exam: 90 / 90
- S4 Challenge: 30 / 30
- S5 Foundation: 90 / 90
- S5 Core: 230 / 230
- S5 Exam: 130 / 130
- S5 Challenge: 50 / 50
- S6 Foundation: 50 / 50
- S6 Core: 180 / 180
- S6 Exam: 190 / 190
- S6 Challenge: 80 / 80

## Manual QA Status

- `mathQaStatus`, `terminologyQaStatus`, and `manualQaStatus` remain `pending-s18-review`.
- Required next step for candidate QA: run `node coordination/content-qa/mainland-bnu-high-generated-bank-v1-1500/audit-solvability.mjs`.
- Any later app integration requires explicit S04/S18 coordination and separate question-bank tests.
