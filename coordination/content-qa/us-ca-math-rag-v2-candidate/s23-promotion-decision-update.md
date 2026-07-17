# S23 Promotion Decision Update - S04/S05 Candidate Packs

Date: 2026-06-19
Upstream package: `us-ca-math-rag-v2-candidate`

## Decision

Do not promote to live app yet.

## New Evidence

- S04 candidate question pack generated: 68 questions.
- S05 candidate lesson pack generated: 68 lessons.
- S18 automated candidate QA: 0 errors, 0 warnings.
- Source-safety exact phrase scan: 0 blocked phrase hits.
- S11 static candidate preview browser smoke: pass with 2 practice cards, 2 lesson cards, 0 console errors, and 0 page errors.

## Promotion Candidate After Gates

After S18 full human review and S11 browser regression on an integrated app surface, S23 can consider two separate live slices:

1. RAG slice: promote domain/cluster safe-card drafts as California RAG v2 retrieval expansion.
2. Content slice: promote only the S04/S05 rows that pass human QA, answer validation, source-distance review, and route regression.

Representative samples and unreviewed generated rows must remain candidate-only.
