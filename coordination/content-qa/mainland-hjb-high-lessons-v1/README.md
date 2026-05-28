# Mainland HJB High-School Generated Lesson Pack

This folder contains the generated MAIS Lesson pack for Shanghai Education Press / HuJiaoBan high-school mathematics.

The package is generated only from committed safe RAG cards:

- `data/rag/mainlandHjbHigh.ts`
- `data/rag/mainlandHjbHighExamPatterns.ts`
- shared Mainland senior-secondary exam-pattern cards

It does not contain source PDF text, OCR text, page locators, textbook examples, answer keys, source diagrams, embeddings, or copied layouts.

## Files

- `generate-lessons.mjs`: deterministic safe-RAG lesson generator.
- `validate-lessons.mjs`: schema, source-safety, bilingual, and teacher-guide validator.
- `verify-qa-acceptance.mjs`: S18 full-package QA acceptance gate for coverage, copyright/source safety, teacher-guide presence, website integration, and HJB question-bank gating.
- `lessons.json`: machine-readable Lesson pack consumed by production data mapping.
- `index.md`: human-readable review inventory.
- `qa-report.md`: validation and release-gate report.
- `validation-report.json`: machine-readable validation report.
- `qa-acceptance-report.md`: S18 QA acceptance summary.
- `qa-acceptance-report.json`: machine-readable QA acceptance result.
- `manual-review-results.csv`: 21/21 manual review record.

## Regenerate

```bash
node coordination/content-qa/mainland-hjb-high-lessons-v1/generate-lessons.mjs
node coordination/content-qa/mainland-hjb-high-lessons-v1/validate-lessons.mjs
node coordination/content-qa/mainland-hjb-high-lessons-v1/verify-qa-acceptance.mjs
```
