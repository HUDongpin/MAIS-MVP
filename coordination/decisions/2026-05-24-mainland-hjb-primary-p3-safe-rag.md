# Mainland HJB Primary P3 Textbook Safe-RAG Decision

- Date: 2026-05-24
- Session: S18 with owner-approved S08/S10 implementation scope
- Topic: Safe absorption of owner-provided Shanghai Education Press Grade 3 upper/lower mathematics PDFs
- Status: Implemented as primary P3 safe abstraction cards and local-only metadata tooling

## Decision

MAIS will absorb the owner-provided Shanghai Education Press Grade 3 upper/lower textbooks only as safe abstraction knowledge for `MAINLAND_HJB` primary P3 support.

The repository may store broad unit labels, concept IDs, competency tags, skill tags, safe summaries, misconception tags, and original MAIS generation guidance.

The repository must not store source PDFs, extracted PDF body text, OCR text, exercises, worked examples, answers, tables, figures, page images, page locators, source paths, source-recoverable filenames inside evidence packs, or embedding payloads.

## Version Note

The Grade 3 upper-volume layer currently uses the owner's temporary old-textbook version. The owner expects the new and old Grade 3 upper volumes not to differ materially for current safe-card use, but the upper-volume card guidance must remain marked as temporary old-volume alignment until the replacement source is supplied.

## Implemented Slice

The first P3 slice adds HJB primary safe cards for:

- upper review, place value, and operation relationships
- multiplication and division extension, including remainders and comparison language
- time and elapsed-time reasoning
- multiplication by one-digit numbers
- rectangle, square, and perimeter reasoning
- introductory fractions
- lower multiplication/division consolidation and two-digit operation work
- introductory decimals
- area, perimeter, and unit-square measurement
- simple data organization and statistics
- upper/lower review and math-square exploration

These cards support original MAIS explanations, diagnostics, lesson support, and assessment planning only. They do not authorize public question-bank launch, lesson-body generation, adaptive recommendation changes, or textbook exercise reconstruction.

## Local Manifest Tool

`npm run rag:mainland-hjb-primary-manifest -- --out-dir .local/rag/mainland-hjb-primary-p3 <owner-pdf-paths>` builds local-only metadata artifacts under ignored `.local/` storage.

The script records file metadata, hashes, grade-semester classification, page-count status, and aggregate text-layer status only. It does not persist source paths, document body text, OCR text, page-level content, page locators, page images, or embeddings.

## Coordination Notes

- S18 owns curriculum/content QA and source-distance review.
- S08 owns shared type and deterministic retrieval compatibility.
- S10 owns package script and RAG gate coordination.
- S07 can consume this layer through existing `MAINLAND_HJB` primary AI Tutor evidence routing.
- S04/S05/S15 should not generate or expose student-facing P3 questions, lessons, or adaptive recommendations from this layer without separate source-distance and content-quality approval.
