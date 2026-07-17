# S23 Promotion Decision - California Math RAG v2 Candidate

Package: `us-ca-math-rag-v2-candidate`

Date: 2026-06-19

Decision owner: S23 integration and promotion

## Decision

Do not promote to live app yet.

## Reason

The S21 candidate package is structurally complete and validated as a safe candidate, but live promotion still requires downstream gates:

- S18 representative source-safety, alignment, and math QA signoff.
- S04 review or generation of original practice question candidates.
- S05 review or generation of original lesson/textbook module candidates.
- S11 browser/regression evidence on an integrated candidate surface.
- Owner approval for the exact live adapter slice.

## Promotion-Ready Subset After Gates

After the gates pass, S23 should first promote the domain and cluster safe-card layer, not the representative sample items:

- Promote `domain-safe-card-v2` records as the deeper replacement for broad California RAG domain cards.
- Promote `cluster-safe-card-v2` records as retrieval expansion for practice, lesson, remediation, and QA workflows.
- Keep `s04-representative-practice-candidates.json` and `s05-representative-lesson-candidates.json` as review samples until S18 approves generated content.

## Current Public Wording

Use "California Math Practice Beta" or "California standards-aligned practice coverage." Do not claim a complete California curriculum, official California course, or fully launched California lessons from this package alone.
