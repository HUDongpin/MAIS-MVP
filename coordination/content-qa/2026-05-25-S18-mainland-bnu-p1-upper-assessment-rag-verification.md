# Mainland BNU P1 Upper Assessment RAG Verification

- Date: 2026-05-25
- Session ID: S18
- Scope: BNU P1 upper assessment-pattern safe RAG
- Status: Implemented and RAG-tested

## Summary

S18 safely absorbed the owner-provided BNU Grade 1 upper assessment archives into MAIS as aggregate assessment-pattern evidence only. No source archive, source document, source path, source filename, member listing, extracted body text, answer wording, worked response, OCR output, page image, locator, or embedding payload was committed.

## Local Manifest Result

The ignored local manifest was generated under `.local/rag/mainland-bnu-primary-p1-upper-assessments/`.

| Metric | Result |
| --- | ---: |
| Archives inspected | 2 |
| Metadata entries | 237 |
| Current-scope student evidence entries | 78 |
| Legacy/reference-only entries | 80 |
| `.docx` entries | 204 |
| `.doc` entries | 33 |
| Student-assessment role entries | 97 |
| Response-support role entries | 113 |
| Answer-card role entries | 27 |
| Duplicate logical groups | 12 |

Observed safe-pattern signals covered all eight planned BNU P1 upper cards: school readiness/number sense, within-5 operations, classification, within-10 operations, solid shapes, monthly integrated review, midterm integrated review, and final integrated review.

## Safety Review

The local manifest and QA report were scanned for forbidden committed-surface indicators: `sourcePath`, `sourceArchiveName`, `entryPath`, `fileName`, absolute user paths, downloads paths, source folder labels, macOS resource folders, and body sentinel text. No violations were found.

Committed safe cards contain only broad unit labels, concept IDs, competency tags, item-type tags, strategy tags, misconception tags, pattern summaries, and original MAIS generation guidance. The retrieval layer attaches assessment-pattern cards only for assessment-like intents and keeps normal tutor explanation on textbook-safe cards.

## Verification

- Passed: `python3 scripts/build-mainland-bnu-primary-assessment-manifest.py --self-test`
- Passed: local manifest run against the two private owner-provided archives
- Passed: local manifest safety scan
- Passed: `npm run test:rag` with 161/161 tests passing
- Passed: `npm run type-check`
- Passed: `npm run build`

## Risks And Boundaries

- This is not a student-facing question bank and does not authorize source-paper reconstruction.
- Legacy/reference-only entries are not production-card evidence without a separate S18 curriculum-version review.
- No OCR, SimpleTex, live LLM extraction, or embedding creation was run for this intake.
