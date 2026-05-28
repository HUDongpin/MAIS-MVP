# Mainland HJB High Generated Bank V4 QA Report

- Date: 2026-05-24
- Session ID: S18
- Generator: deterministic MAIS safe-template fallback
- Model: not used for generated rows
- API host: not used for generated rows
- Started: 2026-05-24T05:10:30.377Z
- Finished: 2026-05-24T05:10:30.449Z
- Verdict: Auto structure/count/schema QA passed for the offline package; manual S18 sampling still required before app integration.

## Scope

- Generated 1500 original Simplified Chinese questions for Mainland Shanghai Education Press / HuJiaoBan high-school mathematics.
- Distribution target: 500 questions per S4, S5, and S6 grade.
- Package version: V4 offline candidate package; intended to sit alongside the previously generated V1/V2 packages.
- This package is offline only. It does not edit `data/questions.ts`, `types/index.ts`, app UI, API routes, source archives, extracted text, OCR, screenshots, page notes, or embeddings.
- RAG evidence source: 21 committed HJB textbook safe cards, 63 committed HJB assessment-pattern cards, and 19 shared Mainland senior-secondary exam-pattern cards.
- Coverage plan rows: 1500.

## DeepSeek Secret Hygiene

- Live DeepSeek batches were skipped for this local fallback run, so generated rows were produced by the local deterministic fallback.
- No API key, request header, raw prompt transcript, source file path, OCR text, page image, page number, or source locator is written into these artifacts.
- The DeepSeek generator remains in this package for a later provider-stable rerun.

## Count Checks

- Total questions: 1500 / 1500.
- Duplicate IDs: none.
- Duplicate exact prompts: 0.
- Missing evidence rows: 0.
- Source-distance risk rows: 0.
- Malformed multiple-choice rows: 0.
- Missing accepted-answer rows: 0.
- Missing explanation rows: 0.
- Deterministic batch-fallback rows: 1500.
- Cross-v1/v2 exact prompt duplicate check: checked 3000 prior rows; duplicates 0.

## Grade Counts

- S4: 500 / 500
- S5: 500 / 500
- S6: 500 / 500

## Type Quota Checks

- S4 multiple-choice: 200 / 200
- S4 fill-in: 175 / 175
- S4 short-answer: 125 / 125
- S5 multiple-choice: 200 / 200
- S5 fill-in: 175 / 175
- S5 short-answer: 125 / 125
- S6 multiple-choice: 200 / 200
- S6 fill-in: 175 / 175
- S6 short-answer: 125 / 125

## Difficulty Quota Checks

- S4 Foundation: 125 / 125
- S4 Core: 200 / 200
- S4 Challenge: 125 / 125
- S4 Exam: 50 / 50
- S5 Foundation: 125 / 125
- S5 Core: 200 / 200
- S5 Challenge: 125 / 125
- S5 Exam: 50 / 50
- S6 Foundation: 125 / 125
- S6 Core: 200 / 200
- S6 Challenge: 125 / 125
- S6 Exam: 50 / 50

## Manual QA Status

- `mathQaStatus`: kept as `pending-manual` for ordinary rows because full human-style solving of 1500 high-school items is a separate S18 review pass.
- Rows with obvious self-contradiction, missing visual references, source-reference wording, or malformed answer design are rejected during generation retries and rechecked by `audit-solvability.mjs`.
- `terminologyQaStatus`: kept as `pending-manual`; the generation prompt requires Simplified Chinese Mainland high-school mathematics terminology.
- Required next step before app integration: S18 sample at least 50 questions per grade and review 100% of any auto-red-flag rows.

## Files

- `questions.jsonl`
- `questions.csv`
- `coverage-matrix.csv`
- `qa-report.md`
- `generate-with-deepseek.mjs`
- `audit-solvability.mjs`
- `batches/*.json` resumable parsed batch cache
