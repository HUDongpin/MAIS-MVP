# Mainland PEP Primary Generated Bank V1 QA Report

- Date: 2026-05-23
- Session ID: S18
- Generator: DeepSeek API via project server-side `LLM_API_KEY` from local `.env.local`
- Model: `deepseek-v4-pro`
- API host: `api.deepseek.com`
- Started: 2026-05-22T20:56:18.499Z
- Finished: 2026-05-22T20:56:18.531Z
- Verdict: Auto structure/count/schema QA passed for the offline content package; manual S18 sampling still required before app integration.

## Scope

- Generated 600 original Simplified Chinese questions for Mainland PEP primary mathematics.
- Distribution target: 100 questions per P1-P6 grade, 50 per semester.
- This package is offline only. It does not edit `data/questions.ts`, `types/index.ts`, app UI, API routes, source archives, extracted text, OCR, screenshots, page notes, or embeddings.
- RAG evidence source: 13 committed primary curriculum safe cards and 62 committed primary exam-pattern safe cards.

## DeepSeek Secret Hygiene

- The script read `LLM_API_KEY` locally and sent it only as an Authorization header.
- No API key, request header, raw prompt transcript, source file path, OCR text, page image, page number, or source locator is written into these artifacts.
- Batch cache files contain parsed generated questions only.

## Count Checks

- Total questions: 600 / 600.
- Duplicate IDs: none.
- Missing evidence rows: 0.
- Source-distance risk rows: 0.
- Math red-flag rows: 0.
- Malformed multiple-choice rows: 0.
- Missing accepted-answer rows: 0.
- Missing explanation rows: 0.

## Grade Counts

- P1: 100 / 100
- P2: 100 / 100
- P3: 100 / 100
- P4: 100 / 100
- P5: 100 / 100
- P6: 100 / 100

## Semester Counts

- P1 upper: 50 / 50
- P1 lower: 50 / 50
- P2 upper: 50 / 50
- P2 lower: 50 / 50
- P3 upper: 50 / 50
- P3 lower: 50 / 50
- P4 upper: 50 / 50
- P4 lower: 50 / 50
- P5 upper: 50 / 50
- P5 lower: 50 / 50
- P6 upper: 50 / 50
- P6 lower: 50 / 50

## Type Quota Checks

- P1 upper multiple-choice: 20 / 20
- P1 upper fill-in: 18 / 18
- P1 upper short-answer: 12 / 12
- P1 lower multiple-choice: 20 / 20
- P1 lower fill-in: 18 / 18
- P1 lower short-answer: 12 / 12
- P2 upper multiple-choice: 20 / 20
- P2 upper fill-in: 18 / 18
- P2 upper short-answer: 12 / 12
- P2 lower multiple-choice: 20 / 20
- P2 lower fill-in: 18 / 18
- P2 lower short-answer: 12 / 12
- P3 upper multiple-choice: 20 / 20
- P3 upper fill-in: 18 / 18
- P3 upper short-answer: 12 / 12
- P3 lower multiple-choice: 20 / 20
- P3 lower fill-in: 18 / 18
- P3 lower short-answer: 12 / 12
- P4 upper multiple-choice: 20 / 20
- P4 upper fill-in: 18 / 18
- P4 upper short-answer: 12 / 12
- P4 lower multiple-choice: 20 / 20
- P4 lower fill-in: 18 / 18
- P4 lower short-answer: 12 / 12
- P5 upper multiple-choice: 20 / 20
- P5 upper fill-in: 18 / 18
- P5 upper short-answer: 12 / 12
- P5 lower multiple-choice: 20 / 20
- P5 lower fill-in: 18 / 18
- P5 lower short-answer: 12 / 12
- P6 upper multiple-choice: 20 / 20
- P6 upper fill-in: 18 / 18
- P6 upper short-answer: 12 / 12
- P6 lower multiple-choice: 20 / 20
- P6 lower fill-in: 18 / 18
- P6 lower short-answer: 12 / 12

## Difficulty Quota Checks

- P1 Foundation: 55 / 55
- P1 Core: 35 / 35
- P1 Challenge: 8 / 8
- P1 Exam: 2 / 2
- P2 Foundation: 45 / 45
- P2 Core: 40 / 40
- P2 Challenge: 12 / 12
- P2 Exam: 3 / 3
- P3 Foundation: 35 / 35
- P3 Core: 45 / 45
- P3 Challenge: 15 / 15
- P3 Exam: 5 / 5
- P4 Foundation: 35 / 35
- P4 Core: 45 / 45
- P4 Challenge: 15 / 15
- P4 Exam: 5 / 5
- P5 Foundation: 25 / 25
- P5 Core: 50 / 50
- P5 Challenge: 18 / 18
- P5 Exam: 7 / 7
- P6 Foundation: 25 / 25
- P6 Core: 50 / 50
- P6 Challenge: 18 / 18
- P6 Exam: 7 / 7

## Manual QA Status

- `mathQaStatus`: kept as `pending-manual` for ordinary rows because full human-style solving of 600 items is a separate S18 review pass.
- Rows with obvious self-contradiction, under-specified visual references, answer-design caveats, or model-admitted design issues are marked `needs-review-auto-red-flag`.
- `terminologyQaStatus`: kept as `pending-manual`; the generation prompt requires Simplified Chinese Mainland mathematics terminology.
- Required next step before app integration: S18 sample at least 15 questions per grade for mathematical correctness, grade fit, source distance, and terminology.

## Files

- `questions.jsonl`
- `questions.csv`
- `coverage-matrix.csv`
- `qa-report.md`
- `generate-with-deepseek.mjs`
- `batches/*.json` resumable parsed batch cache
