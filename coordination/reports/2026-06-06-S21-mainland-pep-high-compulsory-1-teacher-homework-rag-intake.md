# S21 Mainland PEP High Compulsory 1 Teaching Resources RAG Intake

- Date: 2026-06-06
- Session: S21
- Objective: Absorb owner-provided teaching plans, guided-learning sheets, layered homework, practice, and test resources from `高中数学必修第一册（人教A版）.zip` into the Mainland PEP High Compulsory 1 RAG intake layer.

## Result

Completed as local-private raw RAG intake plus committed source-distant summary.

- Archive entries inspected: 1100
- Visible source files after metadata filtering: 541
- Ingested `.docx` files: 528
- Documents with extracted text: 528
- Local-private chunks: 1430
- Extracted local text characters: 2821902
- Extraction errors: 0
- Safe-card drafts: 5

Not ingested in this DOCX pass:

- 1 PDF textbook-exercise-answer file
- 12 `.downloading` incomplete BaiduYun placeholder files

## Outputs

Committed safe artifacts:

- `coordination/content-qa/mainland-pep-high-compulsory-1-teacher-homework-rag-intake/build_teacher_homework_rag.py`
- `coordination/content-qa/mainland-pep-high-compulsory-1-teacher-homework-rag-intake/intake-summary.json`
- `coordination/content-qa/mainland-pep-high-compulsory-1-teacher-homework-rag-intake/safe-card-drafts.json`
- `coordination/content-qa/mainland-pep-high-compulsory-1-teacher-homework-rag-intake/qa-report.md`

Local ignored raw RAG artifacts:

- `.local/rag/mainland-pep-high-compulsory-1-teacher-homework-2026-06-06/manifest.local.json`
- `.local/rag/mainland-pep-high-compulsory-1-teacher-homework-2026-06-06/documents.local.jsonl`
- `.local/rag/mainland-pep-high-compulsory-1-teacher-homework-2026-06-06/chunks/chunks.local.jsonl`
- `.local/rag/mainland-pep-high-compulsory-1-teacher-homework-2026-06-06/keyword-index.local.json`
- `.local/rag/mainland-pep-high-compulsory-1-teacher-homework-2026-06-06/README.md`

## Coverage

The DOCX intake covers:

- `高分必刷常考题型专练`: 118 files
- `导学案`: 104 files
- `分层作业`: 102 files
- `考点培优讲义`: 72 files
- `考试满分全攻略`: 52 complete DOCX files
- `单元测试`: 40 files
- `基础知识考点`: 40 files

Chapter signals were mapped to:

- 函数的概念与性质
- 一元二次函数、方程和不等式
- 集合与常用逻辑用语
- 三角函数
- 指数函数与对数函数

## Safety Boundary

- Raw source text is local-only under `.local/rag/` and ignored by Git.
- Committed artifacts contain aggregate counts and source-distant safe-card drafts only.
- No live `data/rag`, `lib/rag`, lesson source, question source, app, API, or provider behavior was changed.
- Source `.docx` files were read from the owner-provided zip but not duplicated into `.local/rag/`, preserving disk space.

## Checks

- Passed: builder self-test.
- Passed: Python compile.
- Passed: full intake run.
- Passed: local line-count verification.
- Passed: committed-output safety scan for raw fields.
- Passed: `.local/` git-ignore check for raw local artifacts.

## Follow-Up

- S18 should sample raw chunks through the local-private path for curriculum/source-distance QA before production use.
- S23 should plan promotion if these safe-card drafts or a private retrieval adapter should feed live RAG.
- The 1 PDF and 12 incomplete `.downloading` entries need a separate owner decision if they should be completed/extracted in a future pass.
