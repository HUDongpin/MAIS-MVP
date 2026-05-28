# S18 Mainland HJB Junior S2 Upper Paper Safe-RAG Verification

- Date: 2026-05-24
- Session ID: S18
- Scope: owner-provided Grade 8 upper Shanghai Education Press / HuJiaoBan unit-test and midterm/final archives
- Verdict: Pass for safe paper-pattern RAG absorption; no student-facing question bank or source-corpus RAG was created.

## Safety Boundary

- Committed RAG content is limited to aggregated paper-pattern cards for S2 upper units: 实数, 二次根式, 一元二次方程, 直角三角形/勾股定理, 期中综合, and 期末综合.
- The manifest builder writes metadata only under ignored `.local/rag/mainland-hjb-junior-papers/`.
- No source ZIP, extracted document, OCR/body text, prompt wording, worked response, answer text, scoring wording, page image, page locator, source member location, or vector payload is committed.
- The committed safe cards contain only concept tags, competency tags, skill tags, item-type tags, pattern summaries, solution-strategy tags, misconception tags, generation guidance, and reuse restrictions.

## Local Manifest QA

- Local manifest files generated: `.local/rag/mainland-hjb-junior-papers/manifest.json` and `.local/rag/mainland-hjb-junior-papers/qa-report.md`.
- Effective files manifested: 154.
- Extension counts: `.docx: 117`, `.doc: 30`, `.pdf: 7`.
- Source-role counts: `assessment-form: 74`, `worked-response-support: 55`, `key-support: 13`, `response-sheet: 10`, `portable-assessment: 2`.
- Alignment status counts: `aligned: 51`, `aligned-support: 53`, `quarantine: 50`.
- Target unit coverage is complete for `S2:upper`: 一元二次方程 32, 二次根式 28, 实数 28, 期中综合 56, 期末综合 56, 直角三角形 30.
- Duplicate member-hash groups: 0.
- Manual-review queue entries: 50.
- Manual-review reasons are conservative: chapter-numbering review for old/alternate chapter systems, old-course function signals, or insufficient HJB S2 upper unit signal.
- Literal safety scan found no manifest hits for source entry names, source archive labels, source path labels, OCR markers, embedding markers, page locator markers, raw chapter filename markers, student/solution-version labels, or original-paper labels.

## RAG QA

- Added or preserved HJB junior paper-pattern retrieval for S1 lower, S2 lower, and the new S2 upper cards.
- S2 upper queries retrieve the expected HJB paper-pattern cards for the six target unit/comprehensive families.
- HJB paper-pattern retrieval stays publisher-isolated from PEP junior paper patterns.
- HJB junior evidence packs now include a textbook layer and a paper-pattern layer while keeping raw source materials out of evidence text.
- Safety tests assert HJB junior cards and evidence avoid source-material artifacts such as document extensions, page references, original/answer/solution/OCR/source path/embedding wording, screenshots, and source-reuse markers.

## Checks

- `python3 scripts/build-mainland-hjb-junior-paper-manifest.py --self-test`: passed.
- `python3 scripts/build-mainland-hjb-junior-paper-manifest.py <owner S2 upper archives>`: passed with 154 metadata-only entries.
- `npm run test:rag`: passed; 106/106 RAG Node tests passed after all manifest self-tests.
- `npm run type-check`: passed.

## Follow-Up

- Keep the 50 manual-review entries local-only until S18 confirms their edition/chapter mapping.
- Do not generate or publish student-facing HJB S2 upper practice directly from source archives. Any future generated practice should be MAIS-original and go through separate S18 source-distance and math QA before S04/S05/S08 integration.
