# Mainland HJB Primary P6 Textbook Safe-RAG Decision

- Date: 2026-05-24
- Session: S18 with owner-approved S08/S10 implementation scope
- Topic: Safe absorption of owner-provided Shanghai Education Press Grade 6 upper/lower mathematics PDFs
- Status: Implemented as primary P6 safe abstraction cards and local-only metadata tooling

## Decision

MAIS will absorb the owner-provided Shanghai Education Press Grade 6 upper/lower textbooks only as safe abstraction knowledge for `MAINLAND_HJB` primary P6 support.

The repository may store broad unit labels, concept IDs, competency tags, skill tags, safe summaries, misconception tags, and original MAIS generation guidance.

The repository must not store source PDFs, extracted PDF body text, OCR text, exercises, worked examples, answers, tables, figures, page images, page locators, source paths, source filenames inside evidence packs, or embedding payloads.

## Implemented Slice

The first slice adds P6 upper/lower HJB primary safe cards for:

- divisibility, factors, multiples, and number classification
- fractions and fraction operations
- ratio and proportion
- circles and sectors
- rational numbers and number-line reasoning
- linear equations, simple systems, and inequalities
- segments and angles
- cuboids, nets, surface area, and volume

These cards support original MAIS explanations, diagnostics, lesson support, and assessment planning only. They do not authorize public question-bank launch or textbook exercise reconstruction.

## Local Manifest Tool

`npm run rag:mainland-hjb-primary-manifest -- <pdf-paths>` builds local-only metadata artifacts under `.local/rag/mainland-hjb-primary-p6/` by default.

The script records file metadata, hashes, grade-semester classification, page-count status, and aggregate text-layer status only. It does not persist source paths, document text, OCR text, page-level content, page locators, or embeddings.

## Coordination Notes

- S18 owns curriculum/content QA and source-distance review.
- S08 owns shared type and deterministic retrieval compatibility.
- S10 owns package script and RAG gate coordination.
- S12 should only be involved if this layer is later wired into adaptive runtime evidence retrieval.
- S04/S05/S07 should not generate or expose student-facing content from this layer without a separate source-distance and content-quality approval.
