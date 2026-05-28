# Mainland HJB High Generated Bank V3 QA Report

- Date: 2026-05-24
- Session ID: S18
- Generator: deterministic MAIS safe-template fallback
- Live model: not used
- bl preflight: available, exit 3, No API key found.
- Started: 2026-05-24T12:49:04.648Z
- Finished: 2026-05-24T12:49:04.779Z
- Verdict: Auto structure/count/schema QA passed for candidate-only package; manual S18 review still required before app integration.

## Scope

- Generated 1500 original Simplified Chinese candidate questions for Mainland Shanghai Education Press / HuJiaoBan high-school mathematics.
- Distribution target: 500 questions per S4, S5, and S6 grade.
- Package version: V3 candidate package; it sits alongside V1, V2, V4, and V4-remediated artifacts.
- This package is offline and candidate-only. It does not edit production question-bank files, app UI, API routes, source archives, extracted source text, OCR, screenshots, page notes, or embeddings.
- RAG evidence source: 21 committed HJB textbook safe cards, 63 committed HJB assessment-pattern cards, and 19 shared Mainland senior-secondary exam-pattern cards.
- Coverage plan rows: 1500.

## Provider Hygiene

- `bl auth status --output json` was used only as a redacted preflight.
- No DashScope prompt, DeepSeek prompt, provider request, API key, request header, source file path, OCR text, page image, page number, or source locator is written into these artifacts.
- Live provider generation is deliberately disabled for this candidate-only scope.

## Count Checks

- Total questions: 1500 / 1500.
- Duplicate IDs: none.
- Duplicate exact prompts inside V3: 0.
- Cross-bank exact prompt duplicate check: checked 6000 prior rows; duplicates 0.
- Missing evidence rows: 0.
- Malformed multiple-choice rows: 0.

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

- `mathQaStatus`: `pending-manual` for every row.
- `terminologyQaStatus`: `pending-manual` for every row.
- Required next step before app integration: S18 manual review of the generated queue and owner approval for any production wiring.

## Files

- `questions.jsonl`
- `questions.csv`
- `question-pack.json`
- `coverage-matrix.csv`
- `qa-report.md`
- `generate-with-bl.mjs`
- `audit-solvability.mjs`
- `audit-quality.mjs`
