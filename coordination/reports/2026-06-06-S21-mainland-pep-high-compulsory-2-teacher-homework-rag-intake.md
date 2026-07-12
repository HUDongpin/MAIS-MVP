# S21 Mainland PEP High Compulsory 2 Teaching Resources RAG Intake

- Date: 2026-06-06
- Session: S21 content pipeline and RAG operations
- Source archive: owner-provided `高中数学必修第二册（人教A版）.zip`
- Package: `mainland-pep-high-compulsory-2-teacher-homework-2026-06-06`

## Result

Completed local-private RAG intake for the Compulsory 2 archive. The source materials were parsed into ignored local document records, text chunks, and a keyword index. Committed artifacts contain only aggregate counts and source-distant safe-card drafts.

## Intake Counts

- Zip entries: 8850
- Visible supported source files: 4326
- Source type split: 4261 DOCX, 53 PPTX, 12 PDF
- Files with extracted text: 4310
- Local-private chunks: 18363
- Extracted text characters stored locally only: 37453083
- Extraction errors: 16 corrupt/non-zip DOCX payloads
- Safe-card drafts: 5

## Coverage

- Chapters represented: 平面向量及其应用, 复数, 立体几何初步, 统计, 概率, plus 16 mixed-review/error-adjacent records.
- Major resource kinds represented: 教师版, 学生版, 同步讲义, 同步讲义练习, 举一反三, 期中期末检测, 题型分类归纳, 培优讲义+练习, 必刷题, 考试满分全攻略, 分层作业, 导学案, 单元测试, 课件.
- Aggregate document features: 7822 tables, 1489147 embedded image references, 507635 Word math objects, 1986 PPT slides, 321 PDF pages.

## Files

- Local ignored raw/private corpus: `.local/rag/mainland-pep-high-compulsory-2-teacher-homework-2026-06-06/`
- Package-local builder and safe artifacts: `coordination/content-qa/mainland-pep-high-compulsory-2-teacher-homework-rag-intake/`
- Safe artifacts: `intake-summary.json`, `safe-card-drafts.json`, `qa-report.md`

## Safety Boundary

- Raw source text, source filenames, archive member paths, checksums, source IDs, chunk payloads, and embeddings are not committed.
- Raw retrieval chunks are local-only under ignored `.local/rag/`.
- The source Office/PDF files were read from the owner-provided zip but not copied into the repository or `.local/rag/`.
- This package is not approved for direct publication or live RAG integration without S18 source-distance/curriculum sampling and S23 promotion planning.

## Checks

- Passed builder self-test.
- Passed Python compile.
- Passed full intake run.
- Passed line-count verification: 4326 document records and 18363 chunk records.
- Passed committed-output raw-field safety scan.
- Passed `.local/` git-ignore check.

## Follow-Up

- S18: sample chapter and resource-type coverage, especially high-density overlapping chapter matches for 复数/立体几何/平面向量, and review extraction-error impact.
- S23: decide whether safe-card drafts or private retrieval chunks should be promoted into live RAG, and coordinate any `data/rag` or `lib/rag` changes with the owning sessions.
