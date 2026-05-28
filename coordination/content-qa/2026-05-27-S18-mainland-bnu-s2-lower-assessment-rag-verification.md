# S18 Mainland BNU S2 Lower Assessment RAG Verification

- Date: 2026-05-27
- Session ID: S18
- Scope: 北师大版八年级下册 unit-test and midterm/final assessment materials for `MAINLAND_BNU` junior-secondary Safe-RAG.
- Decision: Approved as safe assessment-pattern cards only. Not approved as an original-question bank, answer key bank, OCR corpus, source-document search index, or embedding store.

## Coverage Confirmed

- Source archive prescan/run: 2 owner-provided ZIP archives under local Downloads.
- Manifested local-only entries: 196.
- Unit archive: 108 files.
- Midterm/final archive: 88 files.
- File type counts: 168 `.docx`, 24 `.doc`, 4 `.pdf`.
- Safe student-assessment candidates: 92.
- Support-only answer/solution/answer-card artifacts excluded from pattern mining: 104.
- S18 review/quarantine files from filename metadata classification: 0.

## Safe Cards

Committed BNU junior assessment-pattern coverage includes:

- `bnu-junior-s2-lower-assessment-triangle-proof-unit`
- `bnu-junior-s2-lower-assessment-inequalities-unit`
- `bnu-junior-s2-lower-assessment-transformations-unit`
- `bnu-junior-s2-lower-assessment-factorization-unit`
- `bnu-junior-s2-lower-assessment-algebraic-fractions-unit`
- `bnu-junior-s2-lower-assessment-parallelograms-unit`
- `bnu-junior-s2-lower-assessment-midterm-integrated`
- `bnu-junior-s2-lower-assessment-final-integrated`

These cards summarize aggregated assessment patterns, concept coverage, common misconceptions, solution-strategy tags, and generation guardrails. They do not contain protected original stems, answer keys, worked responses, diagrams, tables, page references, source file names, source paths, OCR text, hashes, or embeddings in committed files.

## Local Manifest

- Script: `scripts/build-mainland-bnu-junior-assessment-manifest.py`.
- S2 lower local output: `.local/rag/mainland-bnu-junior-s2-lower-assessments/`, generated with explicit `--expected-slot S2:lower`.
- Local output policy: metadata-only, ignored/local; do not commit the source archives or `.local/` manifest artifacts.
- Safety scan over local output found no source archive paths, member names, file-name fields, source paths, source files, body sentinel, or Downloads path strings.

## RAG Behavior

- S2 lower unit queries retrieve the six expected unit cards.
- S2 lower midterm/final queries retrieve the two expected integrated review cards.
- BNU junior evidence packs include the BNU assessment-pattern layer only for `generate-question`, `exam-practice`, `diagnose-mistake`, and `assessment-design`.
- `tutor-explain` remains textbook-only plus ordinary curriculum evidence and does not include the assessment-pattern layer.
- BNU, PEP, and HJB publisher layers remain separated; only the shared Mainland zhongkao layer is appended for assessment-like BNU junior intents.

## Use Boundary

Allowed future use:

- Generate new MAIS-authored assessment items from pattern summaries.
- Build diagnostic plans, misconception checks, and revision plans.
- Design assessment blueprints aligned with the six 八下 unit areas.

Not allowed without a separate owner-approved S04/S07/S12/S19 plan:

- Exposing original papers or answers in product search.
- Creating a student-facing item bank by extracting original source text.
- Cloud OCR, SimpleTex, live LLM extraction, private vectorization, or external knowledge-base upload.
- Logging real source file names, source paths, hashes, OCR text, or embeddings in committed reports.

## Checks

- Passed: `python3 -m py_compile scripts/build-mainland-bnu-junior-assessment-manifest.py`.
- Passed: `python3 scripts/build-mainland-bnu-junior-assessment-manifest.py --self-test`, including the S2 lower fixture.
- Passed: local manifest run against the two 八年级数学下册 archives with `--expected-slot S2:lower`, 196 metadata-only entries.
- Passed: local forbidden-source-artifact scan for source paths/member names/body sentinel.
- Passed: `npm run test:rag` with 209/209 RAG tests passing.
- Passed: `npm run type-check`.
- Passed: `npm run build`.
