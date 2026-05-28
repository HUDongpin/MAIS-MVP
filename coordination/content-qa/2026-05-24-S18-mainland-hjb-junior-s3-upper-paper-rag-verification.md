# S18 Mainland HJB Junior S3 Upper Paper Safe-RAG Verification

- Date: 2026-05-24
- Session ID: S18
- Scope: owner-provided 九年级数学上册（沪教版） unit-test and midterm/final paper archives
- Verdict: Pass for safe paper-pattern RAG absorption; no student-facing question bank or source-corpus RAG was created.

## Safety Boundary

- Committed RAG content is limited to aggregated paper-pattern cards for S3 upper units: 相似三角形、锐角的三角比、二次函数、期中综合、期末综合。
- The manifest builder writes metadata only under ignored `.local/rag/mainland-hjb-junior-s3-upper-papers/`.
- No source ZIP, extracted document, OCR/body text, prompt wording, worked-response wording, answer text, scoring wording, page image, page locator, source member location, or vector payload is committed.
- The committed safe cards contain only concept tags, competency tags, skill tags, item-type tags, pattern summaries, solution-strategy tags, misconception tags, generation guidance, and reuse restrictions.

## Local Manifest QA

- Local manifest files generated: `.local/rag/mainland-hjb-junior-s3-upper-papers/manifest.json` and `.local/rag/mainland-hjb-junior-s3-upper-papers/qa-report.md`.
- Archives inspected: 2.
- Effective files manifested: 112.
- Hidden/macOS archive entries excluded: 123.
- Extension counts: `.docx: 78`, `.doc: 29`, `.pdf: 5`.
- Source-role counts: `assessment-form: 52`, `worked-response-support: 49`, `response-sheet: 6`, `key-support: 3`, `portable-assessment: 2`.
- Alignment status counts: `aligned: 52`, `aligned-support: 56`, `quarantine: 4`.
- Target unit coverage is complete for `S3:upper`: 相似三角形 36, 锐角的三角比 34, 二次函数 24, 期中综合 64, 期末综合 64.
- Duplicate member-hash groups: 0.
- Manual-review queue entries: 4.
- Quarantine reason: `圆与正多边形: 4`, kept out of S3 upper paper-pattern RAG because the requested scope is 九上第 24-26 章 and term-review papers.

## RAG QA

- Added five S3 upper HJB junior paper-pattern safe cards:
  - `hjb-junior-s3-upper-paper-similar-triangles-unit`
  - `hjb-junior-s3-upper-paper-acute-trigonometry-unit`
  - `hjb-junior-s3-upper-paper-quadratic-functions-unit`
  - `hjb-junior-s3-upper-paper-midterm-integrated`
  - `hjb-junior-s3-upper-paper-final-integrated`
- S3 upper queries retrieve the expected HJB paper-pattern cards for 相似三角形、锐角的三角比、二次函数、九年级上册期中综合、九年级上册期末综合。
- HJB junior evidence packs now include the S3 upper textbook layer and paper-pattern layer together.
- Retrieval stays scoped by publisher, grade, and semester: S3 upper HJB cards do not leak into S3 lower, S2, or Mainland PEP junior paper-pattern results.
- Safety tests assert HJB junior cards and evidence avoid source-material artifacts such as document extensions, page references, original/source wording, answer/solution/OCR/source path/embedding wording, screenshots, and source-reuse markers.

## Checks

- `python3 scripts/build-mainland-hjb-junior-paper-manifest.py --self-test`: passed.
- `python3 scripts/build-mainland-hjb-junior-paper-manifest.py --expected-slot S3:upper --out-dir .local/rag/mainland-hjb-junior-s3-upper-papers <two owner archives>`: passed with 112 metadata-only entries.
- `python3 scripts/build-mainland-pep-primary-paper-manifest.py --self-test`: passed after a one-line stabilization so the self-test no longer infers grade from random temporary directory paths.
- `npm run test:rag`: passed; manifest self-tests passed and 108/108 RAG Node tests passed.
- `npm run type-check`: passed.

## Follow-Up

- Keep the 4 quarantined 圆与正多边形 entries local-only unless the owner separately assigns S3 lower / circle paper-pattern intake.
- Do not generate or publish student-facing HJB S3 upper practice directly from source archives. Any future generated practice should be MAIS-original and go through separate S18 source-distance and math QA before S04/S05/S08 integration.
