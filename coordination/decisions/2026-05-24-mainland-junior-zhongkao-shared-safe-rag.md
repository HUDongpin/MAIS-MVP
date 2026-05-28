# Mainland Junior Zhongkao Shared Safe-RAG Decision

- Date: 2026-05-24
- Session: S18 with owner-approved S08/S10 implementation scope
- Topic: Safe absorption of owner-provided nationwide Mainland junior zhongkao papers
- Status: Implemented as a shared aggregated zhongkao pattern layer

## Decision

MAIS will absorb nationwide Mainland junior zhongkao materials once as a shared S1-S3 zhongkao exam-pattern layer. PEP, BNU, HJB, and future Mainland textbook editions may reference this shared layer while keeping their textbook sequencing, publisher-specific paper patterns, question banks, and lessons separate.

The repository may store only source-distant safe abstractions: year range, regional exam-family coverage, unit-title clusters, concept IDs, competency tags, item-type tags, difficulty bands, strategy tags, misconception tags, and original MAIS generation guidance.

The repository must not store source archives, extracted prompt wording, answer text, worked-response wording, scoring wording, tables, figures, page images, OCR text, source member paths, page locators, or embedding payloads.

## Implemented Slice

- Added `mainlandJuniorZhongkaoExamPatterns` as the committed shared safe-card layer for 2021-2025 S1-S3 Mainland zhongkao patterns.
- Kept `mainlandPepJuniorExamPatterns` as the PEP compatibility export derived from the shared layer.
- Added shared zhongkao retrieval/evidence helpers and wired HJB junior evidence packs to include the shared layer.
- Kept BNU as a pending publisher track; no BNU student-facing content was added.

## Local Manifest Tool

`npm run rag:mainland-junior-zhongkao-manifest -- <archive-paths>` builds ignored metadata-only artifacts under `.local/rag/mainland-junior-zhongkao-exams/`.

The tool records archive/file hashes, byte sizes, extensions, year signals, region signals, source-role signals, duplicate status, and quarantine status only. It does not persist document body text, answer text, worked solutions, OCR output, page images, source member paths, or embeddings.

## Deduplication Result

The owner-provided archive run classified 2247 files:

- `skip_exact_duplicate`: 10
- `same_exam_variant`: 1802
- `covered_by_existing_card`: 69
- `historical_reference`: 357
- `quarantine`: 9

The 2014-2020 records remain metadata-only historical trend references. The 2021-2025 non-duplicate records are covered by the shared safe-card layer unless S18 later identifies a new, source-distant pattern worth adding.

## Coordination Notes

- S18 owns curriculum/content QA and source-distance review.
- S08 owns shared types and deterministic retrieval compatibility.
- S10 owns package-script and RAG-gate coordination.
- S04/S05 should not generate or promote student-facing questions or lessons from this layer without separate S18 source-distance and math-quality approval.
