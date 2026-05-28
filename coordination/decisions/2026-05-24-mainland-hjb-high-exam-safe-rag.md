# Mainland HJB High-School Assessment Safe-RAG Decision

- Date: 2026-05-24
- Session: S18 with owner-granted S08/S10 implementation scope
- Topic: Safe absorption of Shanghai Education Press selective-compulsory-one assessment materials
- Status: Implemented as aggregated assessment-pattern safe cards

## Decision

MAIS will absorb the owner-provided Shanghai Education Press high-school assessment bundle only as aggregated assessment-pattern knowledge.

The repository may store assessment family, volume scope, chapter coverage, concept IDs, competency tags, item-type tags, difficulty bands, strategy tags, misconception tags, and original MAIS generation guidance.

The repository must not store source assessment files, extracted body text, prompt wording, response wording, scoring wording, tables, figures, page images, page locators, source file paths, or embedding payloads.

## Implemented Slice

The first slice adds HJB senior-secondary assessment-pattern cards for:

- selective-compulsory-one unit checks across lines, conics, space vectors, and sequences
- midterm and final full-volume assessment patterns
- line-and-conic, space-vector, and sequence synthesis patterns
- one cross-volume review card for statistics, probability, solid geometry, and space-vector readiness

The cross-volume card is review-only and must not be counted as selective-compulsory-one coverage completion.

## Local Manifest Tool

`npm run rag:mainland-hjb-high-exam-manifest -- <archive-paths>` builds local-only metadata artifacts under `.local/rag/mainland-hjb-high-exams/` by default.

The script records archive-entry metadata, hashes, coarse assessment-family classification, volume scope, chapter signals, and safe draft-card signals only. It does not persist document body text or page-level content.

## Coordination Notes

- S18 owns curriculum/content QA and source-distance review.
- S08 owns shared types and deterministic retrieval compatibility.
- S10 owns package script and RAG gate coordination.
- S07 should own any future AI Tutor prompt/context wiring.
- S04/S05 should not generate student-facing questions or lessons from these cards without a separate source-distance and content-quality approval.
