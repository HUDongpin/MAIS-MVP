# Mainland HJB Primary P1 Upper Assessment Safe-RAG Decision

- Date: 2026-05-24
- Session: S18 with owner-approved S08/S10 implementation scope
- Topic: Safe absorption of owner-provided Shanghai Education Press Grade 1 upper unit, midterm, and final assessment archives
- Status: Implemented as primary P1 upper assessment-pattern safe cards and local-only metadata tooling

## Decision

MAIS will absorb the owner-provided Shanghai Education Press Grade 1 upper assessment archives only as aggregated assessment-pattern guidance for `MAINLAND_HJB` primary P1 upper support.

The repository may store broad assessment families, unit labels, concept IDs, competency tags, item-type tags, common misconception tags, pattern summaries, and original MAIS generation guidance.

The repository must not store source archives, extracted document body text, source item wording, answer text, worked-solution text, tables, figures, page images, page locators, source paths, OCR output, embedding payloads, or any recoverable A3/A4 or response-support variant structure inside RAG evidence.

## Implemented Slice

This slice adds eight P1 upper assessment-pattern safe cards for:

- school-readiness and mathematical learning routines
- solid-shape recognition and sorting
- number sense within 10
- addition and subtraction within 10
- number sense within 20
- non-regrouping addition and subtraction within 20
- midterm integrated review
- final and oral-calculation integrated review

These cards support original MAIS assessment design, diagnostics, and future candidate question drafting only. They do not authorize public question-bank launch or reconstruction of any source assessment.

## Local Manifest Tool

`npm run rag:mainland-hjb-primary-assessment-manifest -- <zip-paths> --expected-slot P1:upper` builds local-only metadata artifacts under `.local/rag/mainland-hjb-primary-assessments/` by default.

The script records archive-entry metadata, hashes, grade-semester classification, coarse assessment-family signals, source-role classification, and duplicate-variant groups only. It does not persist source paths, document text, source item wording, answer text, worked-solution text, page images, OCR output, page locators, or embeddings.

## Coordination Notes

- S18 owns curriculum/content QA and source-distance review.
- S08 owns shared type and deterministic retrieval compatibility.
- S10 owns package script and RAG gate coordination.
- S04/S05/S07/S15 should not generate or expose student-facing practice, lesson, AI Tutor, or adaptive content from this layer without a separate source-distance and content-quality approval.
