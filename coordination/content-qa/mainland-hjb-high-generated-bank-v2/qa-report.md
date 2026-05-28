# Mainland HJB High Generated Bank V2 QA Report

- Date: 2026-05-24
- Session ID: S18
- Generator: DeepSeek API via project server-side `LLM_API_KEY` from local `.env.local`
- Model: `deepseek-v4-pro`
- API host: `api.deepseek.com`
- Started: 2026-05-24T04:58:15.272Z
- Finished: 2026-05-24T04:58:15.357Z
- Verdict: Green after remediation. Auto structure/count/schema QA passed, the 32 P0 rows were remediated in place, and the final V2 quality audit approved 1500/1500 rows with 0 P0/P1/P2 and 0 failing rows.

## Scope

- Generated 1500 original Simplified Chinese questions for Mainland Shanghai Education Press / HuJiaoBan high-school mathematics.
- Distribution target: 500 questions per S4, S5, and S6 grade.
- Package version: V2 additional offline candidate package.
- Version naming: `mainland-hjb-high-generated-bank-v1` is the prior production/lesson pilot package. `mainland-hjb-high-generated-bank-v2` is the current V2 candidate package. Use V2 consistently in QA reports, release notes, product copy, app exports, and batch metadata.
- This package was offline-only during generation and QA. The owner-approved V2 integration now converts it through `question-pack.json` and wires it into the Mainland HJB high-school question export; it still does not edit source archives, extracted text, OCR, screenshots, page notes, embeddings, API routes, or real `.env*` files.
- RAG evidence source: 21 committed HJB textbook safe cards, 63 committed HJB assessment-pattern cards, and 19 shared Mainland senior-secondary exam-pattern cards.
- Coverage plan rows: 1500.

## DeepSeek Secret Hygiene

- The script read `LLM_API_KEY` locally and sent it only as an Authorization header for live DeepSeek batches.
- 1220 row(s) were produced by deterministic batch fallback after a live batch repeatedly failed validation.
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
- Deterministic batch-fallback rows: 1220.
- Cross-v1 exact prompt duplicate check: checked 1500 prior rows; duplicates 0.

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

- `mathQaStatus`: kept as `pending-manual` in source rows. The final V2 quality QA pass reviewed the 370-row quality queue and records 1500 approved rows with 0 rewrite/remove rows after the 32-row remediation ledger was applied.
- Rows with obvious self-contradiction, missing visual references, source-reference wording, or malformed answer design are rejected during generation retries and rechecked by `audit-solvability.mjs`.
- `terminologyQaStatus`: kept as `pending-manual`; the generation prompt requires Simplified Chinese Mainland high-school mathematics terminology.
- Required pre-integration QA is complete: `audit-solvability.mjs` and `audit-quality.mjs` now pass with 1500/1500 rows approved, 0 failing rows, and 0 inventory issues.

## Files

- `questions.jsonl`
- `question-pack.json`
- `questions.csv`
- `coverage-matrix.csv`
- `qa-report.md`
- `generate-with-deepseek.mjs`
- `audit-solvability.mjs`
- `audit-quality.mjs`
- `p0-remediation-ledger.md`
- `batches/*.json` resumable parsed batch cache
