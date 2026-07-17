# S23 Promotion Handoff - California Math RAG v2 Candidate

Package: `us-ca-math-rag-v2-candidate`
Date: 2026-06-19
Promotion owner: S23 integration and promotion

## What S21 Produced

S21 created a standards-spine candidate package from `$california-math-common-core`:

- `candidate-package.json`: complete candidate package with safe-card drafts, practice briefs, lesson briefs, gates, and source policy.
- `safe-card-drafts.json`: RAG v2 card drafts by grade, domain, and cluster.
- `s04-practice-question-briefs.json`: practice generation briefs for S04.
- `s05-textbook-lesson-briefs.json`: textbook/lesson generation briefs for S05.
- `s04-representative-practice-candidates.json`: original S04 candidate samples.
- `s05-representative-lesson-candidates.json`: original S05 lesson skeleton samples.
- `coverage-summary.json`: structural coverage counts and grade-button mapping.
- `s18-qa-review.md`: initial S18 candidate review boundary.

## Candidate Coverage

- Grade buttons: 11
- Domains: 67
- Clusters: 68
- Standard identifiers: 392
- RAG card drafts: 146

## Promotion Sequence

1. S18 completes representative source-safety and alignment spot checks.
2. S04 creates original California practice question candidates from the practice briefs.
3. S05 creates original California textbook/lesson modules from the lesson briefs.
4. S18 reviews the generated S04/S05 outputs for curriculum fit and math correctness.
5. S11 runs representative lesson/practice/browser regression on the integrated candidate surface.
6. S23 proposes the candidate-to-live slice only after S18 and S11 evidence is attached.

## Live Edit Boundary

No live `data/rag/usMath.ts`, question-bank, lesson, UI, or test file was edited by this package. Recommended promotion shape is a small adapter PR that maps `domain-safe-card-v2` and `cluster-safe-card-v2` records into the existing California safe-RAG profile after approval.

## Risks To Track

- Pre-K is a readiness lane based on California Preschool Learning Foundations, not Common Core.
- High school pathways require local course sequencing decisions before any "textbook" or "course" launch wording.
- Standards alignment alone is not a content-quality pass; generated questions and lessons still need independent answer and pedagogy QA.
