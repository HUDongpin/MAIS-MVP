# Mainland HJB Junior S3 Lower Paper Safe-RAG Verification

- Date: 2026-05-24
- Session ID: S18
- Workstream: Curriculum QA and content quality
- Scope: 九年级数学下册（沪教版） owner-provided unit-test and term-review archives
- Intake policy: safe abstraction only; no source documents, document body text, prompt wording, worked-response wording, answer wording, scoring wording, page images, OCR output, page locators, archive member paths, source paths, or embeddings are committed.

## Metadata-Only Manifest Result

- Command: `npm run rag:mainland-hjb-junior-paper-manifest -- --expected-slot S3:lower --out-dir .local/rag/mainland-hjb-junior-s3-lower-papers <owner archives>`
- Output location: ignored local-only `.local/rag/mainland-hjb-junior-s3-lower-papers/`
- Archives inspected: 2
- Files manifested: 70
- Aligned files: 39
- Aligned support files: 25
- Quarantined files: 6
- Hidden/macOS archive entries excluded: 95
- Ignored visible files: 0
- Expected slot coverage: `S3:lower = 64`
- Target units complete: true
- Target unit coverage: 圆与正多边形 34; 统计初步 14; 期中综合 46; 期末综合 37
- Extension counts: `.docx = 58`; `.doc = 12`
- Source-role counts: assessment-form 43; worked-response-support 27
- Quarantine reason: `chapter-numbering-review = 6`

## Committed Safe Cards

- Added four HJB junior S3 lower paper-pattern safe cards:
  - `hjb-junior-s3-lower-paper-circle-regular-polygons-unit`
  - `hjb-junior-s3-lower-paper-statistics-introduction-unit`
  - `hjb-junior-s3-lower-paper-midterm-integrated`
  - `hjb-junior-s3-lower-paper-final-integrated`
- Cards contain only aggregated unit, assessment-family, material-kind, competency, item-type, strategy, misconception, and original-generation guidance.
- These cards do not authorize copying, rewriting, translating, closely paraphrasing, or approximating any protected source prompt, worked response, answer wording, scoring wording, table, diagram, layout, or item order.

## QA Gates

- `python3 scripts/build-mainland-hjb-junior-paper-manifest.py --self-test`: passed.
- `npm run rag:mainland-hjb-junior-paper-manifest -- --expected-slot S3:lower ...`: passed and wrote ignored local metadata only.
- `npm run test:rag`: passed with manifest self-tests and 110/110 Node RAG tests.
- `npm run type-check`: passed.

## Decision

S18 accepts this S3 lower package for RAG evidence-layer use as safe paper-pattern guidance only. It is not a source corpus, not a question bank, not a lesson package, and not a license to reuse source wording. Any future student-facing HJB S3 lower practice must be newly authored by MAIS, then separately reviewed for originality, mathematical correctness, Simplified Chinese quality, and grade fit before production integration.
