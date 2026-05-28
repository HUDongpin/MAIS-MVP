# Mainland PEP High-School Exam Pattern RAG Decision

- Date: 2026-05-17
- Session: S10 with owner-granted S08/S18 implementation scope
- Topic: Safe high-school exam-pattern absorption for Mainland PEP RAG
- Status: Implemented as aggregated exam-pattern safe-card layer

## Decision

MAIS will absorb high-school exam papers and solutions only as aggregated item-pattern knowledge. The repository may store pattern cards that describe topic distribution, competency targets, difficulty bands, strategy tags, misconception tags, and original generation guidance.

The repository must not store source papers, extracted document text, source stems, answer wording, worked-solution wording, source figures, scoring wording, or page images.

## First Slice

The first slice adds aggregated pattern cards for:

- derivative applications and optimization
- trigonometric graphs
- conics and analytic geometry
- space vectors and solid geometry
- probability and statistics
- sequences and recursion
- counting principles and distributions
- bivariate data analysis
- function parameters
- line and circle coordinate methods
- legacy-stream calibration

Retrieval remains deterministic and dependency-free. It ranks by concept IDs, chapter, exam family, competency tags, item-type tags, difficulty band, and intent.

## Local Manifest Script

`npm run rag:exam-manifest -- <zip-path>` builds a local-only manifest under `.local/rag/` by default. The manifest is intentionally ignored by the repository and contains file metadata plus coarse classification only.

The script must not extract or persist document body text, answer text, worked solutions, figures, tables, or page content.

## Coordination Notes

- S07 owns future AI Tutor evidence-pack wiring.
- S08 owns shared type compatibility.
- S18 should review generated question batches for source distance and curriculum alignment.
- S10 should coordinate any future vector or embedding dependency.
