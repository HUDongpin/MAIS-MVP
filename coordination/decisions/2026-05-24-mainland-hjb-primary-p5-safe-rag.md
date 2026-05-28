# Mainland HJB Primary P5 Textbook Safe-RAG Decision

- Date: 2026-05-24
- Session: S18 with owner-approved S08/S10 implementation scope
- Topic: Safe absorption of owner-provided Shanghai Education Press Grade 5 upper/lower mathematics PDFs
- Status: Implemented as primary P5 safe abstraction cards and local-only metadata tooling

## Decision

MAIS will absorb the owner-provided Shanghai Education Press Grade 5 upper/lower textbooks only as safe abstraction knowledge for `MAINLAND_HJB` primary P5 support.

The repository may store broad unit labels, concept IDs, competency tags, skill tags, safe summaries, misconception tags, and original MAIS generation guidance.

The repository must not store source PDFs, extracted PDF body text, OCR text, exercises, worked examples, answers, tables, figures, page images, page locators, source paths, source filenames inside evidence packs, or embedding payloads.

## Implemented Slice

This slice adds P5 upper/lower HJB primary safe cards for:

- decimal multiplication, division, and estimation
- letters, quantitative relationships, and simple equations
- plane-figure area through decomposition and transformation
- data organization and averages
- factors, multiples, and number structure
- fraction equivalence, simplifying, common denominators, and addition/subtraction
- cuboids, cubes, surface area, and volume
- statistical displays and mixed applications

These cards support original MAIS explanations, diagnostics, lesson support, and assessment planning only. They do not authorize public question-bank launch or textbook exercise reconstruction.

## Local Manifest Tool

`npm run rag:mainland-hjb-primary-manifest -- <pdf-paths>` builds local-only metadata artifacts under `.local/rag/mainland-hjb-primary/` by default.

The script records file metadata, hashes, grade-semester classification, page-count status, and aggregate text-layer status only. It does not persist source paths, document text, OCR text, page-level content, page locators, or embeddings.

## Coordination Notes

- S18 owns curriculum/content QA and source-distance review.
- S08 owns shared type and deterministic retrieval compatibility.
- S10 owns package script and RAG gate coordination.
- S04/S05/S07 should not generate or expose student-facing content from this layer without a separate source-distance and content-quality approval.
