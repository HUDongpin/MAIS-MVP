# 2026-06-26 A25 Effective Work Order - A21 content pipeline and RAG operations

- Owner: A21 content pipeline and RAG operations
- Priority: P3
- Reason: Generated/RAG backlog package.
- Entries: 74
- From P0 proposals: 0
- Dominant slice: generated/content/RAG backlog: 65
- Pathspec: `coordination/release-intake/latest-A25-effective-owner-a21-content-pipeline-and-rag-operations.pathspec`

## Required Final State

Reviewed commit, owner-approved discard, evidence archive, or blocker.

## Suggested Commands

```bash
git status --short --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a21-content-pipeline-and-rag-operations.pathspec
git diff --stat --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a21-content-pipeline-and-rag-operations.pathspec
```

## Status Buckets

- `M`: 39
- `??`: 35

## P0 Proposal Confidence

- No P0 proposal entries in this package.

## Path Sample

- `M` `data/generated-content/mainland-bnu-junior-generated-bank-v1-1500/approved-question-pack.json`
- `M` `data/generated-content/mainland-hjb-junior-generated-bank-v2-1500/question-pack.json`
- `M` `data/generated-content/mainland-pep-high-lessons-v1/lessons.json`
- `M` `data/rag/mainlandPepHigh.ts`
- `M` `data/rag/mainlandPepJunior.ts`
- `M` `data/rag/mainlandPepJuniorPaperPatterns.ts`
- `M` `data/rag/usMath.ts`
- `M` `lib/rag/hongKongDseEph.ts`
- `M` `lib/rag/hongKongDseMath.ts`
- `M` `lib/rag/hongKongDseUp.ts`
- `M` `lib/rag/hongKongMath.ts`
- `M` `lib/rag/hongKongMathEdB.ts`
- `M` `lib/rag/mainlandBnuHigh.ts`
- `M` `lib/rag/mainlandBnuHighAssessmentPatterns.ts`
- `M` `lib/rag/mainlandBnuJunior.ts`
- `M` `lib/rag/mainlandBnuJuniorAssessmentPatterns.ts`
- `M` `lib/rag/mainlandBnuPrimary.ts`
- `M` `lib/rag/mainlandBnuPrimaryAssessmentPatterns.ts`
- `M` `lib/rag/mainlandHjbHigh.ts`
- `M` `lib/rag/mainlandHjbHighExamPatterns.ts`
- `M` `lib/rag/mainlandHjbJunior.ts`
- `M` `lib/rag/mainlandHjbJuniorAssessmentPatterns.ts`
- `M` `lib/rag/mainlandHjbJuniorPaperPatterns.ts`
- `M` `lib/rag/mainlandHjbPrimary.ts`
- `M` `lib/rag/mainlandHjbPrimaryAssessmentPatterns.ts`
- `M` `lib/rag/mainlandJuniorZhongkaoExamPatterns.ts`
- `M` `lib/rag/mainlandPep.test.ts`
- `M` `lib/rag/mainlandPep.ts`
- `M` `lib/rag/mainlandPepHigh.test.ts`
- `M` `lib/rag/mainlandPepHigh.ts`
- `M` `lib/rag/mainlandPepHighExamPatterns.ts`
- `M` `lib/rag/mainlandPepJuniorExamPatterns.ts`
- `M` `lib/rag/mainlandPepJuniorPaperPatterns.ts`
- `M` `lib/rag/mainlandPepPrimaryExamPatterns.ts`
- `M` `lib/rag/usMath.test.ts`
- `M` `lib/rag/usMath.ts`
- `M` `scripts/audit-mainland-pep-roadmap.ts`
- `M` `scripts/build-mainland-pep-junior-paper-manifest.py`
- `M` `scripts/build-us-math-safe-library-manifest.py`
- `??` `data/generated-content/hk-ease-practice-bank-v1/question-pack.json`
- `??` `data/generated-content/mainland-bnu-junior-lessons-v1/lessons.json`
- `??` `data/generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json`
- `??` `data/generated-content/us-ar-math-k-g5-generated-bank-v1-1500/question-pack.json`
- `??` `data/generated-content/us-ar-math-textbooks-v1/textbook-pack.json`
- `??` `data/generated-content/us-ca-k5-knowledge-point-practice-v1/question-pack.json`
- `??` `data/generated-content/us-ca-math-g6-g12-generated-bank-v2-1500/question-pack.json`
- `??` `data/generated-content/us-ca-math-k-g5-generated-bank-v3-deepseek-1500/question-pack.json`
- `??` `data/generated-content/us-ca-math-k-g5-textbooks-v1/lessons.json`
- `??` `data/generated-content/us-ca-math-middle-school-textbooks-v2/live-lessons.json`
- `??` `data/generated-content/us-ca-math-textbooks-v1/textbook-pack.json`
- `??` `data/generated-content/us-fl-math-middle-school-textbooks-v1/textbook-pack.json`
- `??` `data/rag/hongKongEaseQuestions.ts`
- `??` `data/rag/hongKongModernPrimary.ts`
- `??` `data/rag/hongKongUpJunior.ts`
- `??` `data/rag/hongKongUpJuniorEnglish.ts`
- `??` `data/rag/hongKongUpJuniorResources.ts`
- `??` `lib/rag/hongKongEaseQuestions.test.ts`
- `??` `lib/rag/hongKongEaseQuestions.ts`
- `??` `lib/rag/hongKongModernPrimary.test.ts`
- `??` `lib/rag/hongKongModernPrimary.ts`
- `??` `lib/rag/hongKongUpJunior.test.ts`
- `??` `lib/rag/hongKongUpJunior.ts`
- `??` `lib/rag/hongKongUpJuniorEnglish.test.ts`
- `??` `lib/rag/hongKongUpJuniorResources.test.ts`
- `??` `lib/rag/hongKongUpJuniorResources.ts`
- `??` `lib/rag/illustrationTextMatchStandard.ts`
- `??` `scripts/audit-mainland-high-rag-v4-candidate-solvability.ts`
- `??` `scripts/build-hk-up-junior-english-exercise-manifest.py`
- `??` `scripts/build-hk-up-junior-english-textbook-manifest.py`
- `??` `scripts/build-hk-up-junior-resource-manifest.py`
- `??` `scripts/build-hk-up-junior-textbook-manifest.py`
- `??` `scripts/build-us-ca-private-raw-corpus.py`
- `??` `scripts/query-us-ca-private-raw-corpus.py`
- `??` `scripts/storage-admin-snapshot-merge.mjs`
