# S18 Mainland BNU S1 Lower Assessment Safe-RAG Verification

- Date: 2026-05-27
- Session ID: S18
- Workstream: Curriculum QA and content quality
- Target: Mainland BNU junior secondary S1 lower assessment-pattern Safe-RAG
- Status: Completed

## Scope

This verification covers the safe abstraction layer built from two owner-provided Grade 7 lower BNU assessment archive sets. The committed RAG layer stores only aggregated assessment patterns and generation guidance. It does not store original question stems, answer text, worked responses, diagrams, tables, layout, item order, source paths, source member names, page locators, OCR output, hashes, embeddings, or vector payloads.

## Local Manifest Summary

The metadata-only local manifest was generated under `.local/rag/mainland-bnu-junior-s1-lower-assessments/`, which remains ignored local output.

- Files classified: 328
- Extension counts: 324 Word documents and 4 PDFs
- Safe student-assessment candidates: 81
- Support-only artifacts excluded from pattern mining: 159
- Legacy-reference-only artifacts: 56
- Needs S18 review: 32
- Quarantined files: 0
- Target pattern slots covered: 11 of 11

Observed target slots:

- Unit: 整式的乘除
- Unit: 相交线与平行线
- Unit: 概率初步
- Unit: 三角形
- Unit: 生活中的轴对称
- Unit: 变量之间的关系
- Monthly/stage: 第 1-2 单元综合
- Midterm: 第 1-3 单元综合
- Midterm: 第 1-4 单元综合
- Final: 第 1-6 单元综合
- Challenge/review: 期中期末高阶综合

## Committed Safe Cards

The committed BNU junior assessment-pattern layer includes 11 S1 lower cards:

- 6 unit-test cards for the S1 lower BNU units
- 1 monthly/stage integrated card
- 2 midterm integrated cards
- 1 full-semester final integrated card
- 1 challenge/review card

Each card is source-distant and contains only `unitTitles`, `conceptIds`, `competencyTags`, `skillTags`, `itemTypeTags`, `solutionStrategyTags`, `misconceptionTags`, `patternSummary`, `generationGuidance`, and reuse-prohibition notes.

## Safety Result

Passed:

- No committed original stems, answer bodies, worked-response bodies, table/diagram bodies, layouts, item order, source paths, page locators, OCR text, hashes, embeddings, or vector payloads.
- Answer/solution support and answer-card artifacts are excluded from pattern mining in the local manifest.
- The committed RAG evidence text instructs callers not to copy, translate, paraphrase, approximate, or reconstruct protected source materials.
- The shared Mainland zhongkao layer remains separate from the BNU publisher-specific assessment layer.

Remaining caution:

- The 32 `needs-s18-review` local entries are metadata-only and not used as direct committed evidence. They should remain local until S18 manually approves any future safe abstraction influence.

## Checks

- `python3 -m py_compile scripts/build-mainland-bnu-junior-assessment-manifest.py`: passed
- `python3 scripts/build-mainland-bnu-junior-assessment-manifest.py --self-test`: passed
- Local manifest run: passed, 328 metadata-only entries
- Local output safety scan: passed for source paths, source member fields, source archive labels, hash fields, OCR/body sentinel, and vector payload markers
- Committed RAG safety scan: passed for source-answer/layout/PDF/Word source artifact terms in BNU junior assessment data/evidence helpers
- `npm run test:rag`: passed, 209/209 tests
- `npm run type-check`: passed
- `npm run build`: passed

## Decision

Approve the S1 lower BNU assessment-pattern Safe-RAG layer for use in original MAIS-authored assessment design, diagnostic planning, review planning, and future question drafting. Do not treat this as item-bank ingestion, source-paper search, answer-key storage, OCR ingestion, or vector upload.
