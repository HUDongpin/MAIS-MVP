# S21 Generation Report - California Math RAG v2 Candidate

Package: `us-ca-math-rag-v2-candidate`
Date: 2026-06-19
Owner: S21 content pipeline
Input skill: `$california-math-common-core`

## Objective

Use the global California math skill as a standards-spine replacement candidate for the current broad California RAG cards, while keeping all live app data untouched until S18/S11/S23 gates pass.

## Produced Artifacts

- `safe-card-drafts.json`: 146 retrieval card drafts across grade, domain, and cluster levels.
- `s04-practice-question-briefs.json`: 68 practice-generation briefs for S04.
- `s05-textbook-lesson-briefs.json`: 68 lesson/textbook-generation briefs for S05.
- `coverage-summary.json`: structural coverage and promotion-readiness metadata.
- `s04-representative-practice-candidates.json`: original S04 candidate samples for S18/S11 review selection.
- `s05-representative-lesson-candidates.json`: original S05 lesson skeleton samples for S18/S11 review selection.
- `candidate-package.json`: combined package for review and later adapter work.
- `s18-qa-review.md`: source-safety and curriculum QA boundary.
- `s23-promotion-handoff.md`: candidate-to-live promotion plan.
- `s11-regression-readiness.md`: regression preconditions and representative smoke paths.

## Coverage Result

- Grade-button records: 11
- Domains: 67
- Clusters: 68
- Canonical standard IDs: 392
- S04 representative samples: 5
- S05 representative samples: 3

## Live-RAG Replacement Strategy

This package should replace the current California RAG in two stages:

1. Use `domain-safe-card-v2` cards as a drop-in deeper replacement for broad grade/domain safe cards.
2. Add `cluster-safe-card-v2` cards as retrieval expansion for practice, lesson, remediation, and QA workflows.

No `data/rag/usMath.ts`, `lib/rag/usMath.ts`, live question-bank, live lesson, UI, or E2E test file was edited in this generation step.
