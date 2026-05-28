# Mainland BNU Junior Generated Bank V1 Candidate QA Report

- Date: 2026-05-27
- Session ID: S18
- Generator: DeepSeek API via project server-side `LLM_API_KEY` or `OPENAI_API_KEY` from local `.env.local`
- Model: `deepseek-v4-pro`
- API host: `api.deepseek.com`
- Started: 2026-05-27T17:06:22.088Z
- Finished: 2026-05-27T17:13:14.287Z
- Verdict: Auto structure/count/schema QA passed for the offline package. Final `audit-solvability.mjs` auto gate also passed; see `s18-promotability-decision.md`. Candidate remains pending S18 manual review before any app integration.

## Scope

- Generated 1500 original Simplified Chinese questions for Mainland Beijing Normal University Press junior-secondary mathematics.
- Distribution target: 500 questions per S1, S2, and S3 grade.
- This package is candidate-only. It must not be connected to public practice, lessons, APIs, or production data in this task.
- RAG evidence source: 35 committed BNU junior textbook safe cards, 52 committed BNU junior assessment-pattern cards, and 15 shared Mainland junior zhongkao pattern cards.
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

- S1: 500 / 500
- S2: 500 / 500
- S3: 500 / 500

## Type Quota Checks

- S1 multiple-choice: 175 / 175
- S1 fill-in: 150 / 150
- S1 short-answer: 175 / 175
- S2 multiple-choice: 175 / 175
- S2 fill-in: 150 / 150
- S2 short-answer: 175 / 175
- S3 multiple-choice: 175 / 175
- S3 fill-in: 150 / 150
- S3 short-answer: 175 / 175

## Difficulty Quota Checks

- S1 Foundation: 165 / 165
- S1 Core: 245 / 245
- S1 Exam: 70 / 70
- S1 Challenge: 20 / 20
- S2 Foundation: 85 / 85
- S2 Core: 260 / 260
- S2 Exam: 115 / 115
- S2 Challenge: 40 / 40
- S3 Foundation: 40 / 40
- S3 Core: 190 / 190
- S3 Exam: 200 / 200
- S3 Challenge: 70 / 70

## Manual QA Status

- `mathQaStatus`, `terminologyQaStatus`, and `manualQaStatus` remain `pending-s18-review`; `audit-solvability.mjs` wrote the final auto-gate decision to `s18-promotability-decision.md`.
- Rows with obvious self-contradiction, missing visual references, source-reference wording, or malformed answer design are rejected during generation retries and rechecked by the audit.
- Required next step for candidate QA after the auto gate: complete the S18 manual review queue before any product integration.
