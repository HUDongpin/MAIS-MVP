# Validation Summary - California Math RAG v2 Candidate

Package: `us-ca-math-rag-v2-candidate`

Date: 2026-06-19

Responsible sessions: S21 content pipeline, S18 curriculum QA, S11 QA readiness, S23 promotion

## Checks Run

- `node coordination/content-qa/us-ca-math-rag-v2-candidate/build-california-rag-v2-candidate.mjs`
  - Result: pass.
  - Output: 11 grade buttons, 67 domains, 68 clusters, 392 standard IDs, 146 safe-card drafts, 68 S04 practice briefs, 68 S05 lesson briefs, 5 S04 representative samples, 3 S05 representative samples.
- `python3 <california-math-common-core-skill-root>/quick_validate.py <california-math-common-core-skill-root>`
  - Result: pass with temporary local YAML shim because the system Python lacked PyYAML.
  - Output: `Skill is valid!`
- `node <california-math-common-core-skill-root>/scripts/validate-standard-index.mjs`
  - Result: pass.
  - Output: 11 grade buttons, 11 records, 67 domains, 392 standard entries.
- `rg` scan for exact screenshot/IXL preview phrases in this candidate directory.
  - Result: pass, no matches.
- `node <california-math-common-core-skill-root>/scripts/audit-mais-california-pack.mjs`
  - Result: pass.
  - Existing California K-G5 question pack: 1500 records, 0 errors, 0 warnings.
  - Existing California G6-G12 question pack: 1500 records, 0 errors, 0 warnings.
  - Existing California textbook pack: 35 records, 0 errors, 0 warnings.
- `node coordination/content-qa/us-ca-math-rag-v2-candidate/build-downstream-candidate-packs.mjs`
  - Result: pass.
  - Output: 68 S04 question candidates, 68 S05 lesson candidates, 0 validation errors, 0 validation warnings, 0 blocked source phrase hits.
- `node <california-math-common-core-skill-root>/scripts/audit-mais-california-pack.mjs coordination/content-qa/us-ca-math-rag-v2-candidate/s04-question-candidate-pack.json coordination/content-qa/us-ca-math-rag-v2-candidate/s05-lesson-candidate-pack.json`
  - Result: pass.
  - S04 question candidates: 68 records, 0 errors, 0 warnings.
  - S05 lesson candidates: 68 records, 0 errors, 0 warnings.
- `s18-representative-sample-review.md`
  - Result: representative S18 sample review recorded.
  - Sampled K, P1, P6, S2, and high-school algebra/probability rows passed math and structure review for candidate use.
- `node coordination/content-qa/us-ca-math-rag-v2-candidate/build-s11-candidate-review-page.mjs`
  - Result: pass.
  - Output: static candidate review page with 2 practice cards and 2 lesson cards.
- `node coordination/content-qa/us-ca-math-rag-v2-candidate/run-s11-candidate-preview-smoke.mjs`
  - Result: pass after rerun outside sandbox because Chromium launch was blocked by macOS sandbox permissions on first attempt.
  - Output: 2 practice cards, 2 lesson cards, 0 console errors, 0 page errors, screenshot saved under `review/`.

## Release Boundary

This validation supports candidate review only. It does not authorize direct live RAG replacement, practice launch, lesson launch, or complete California curriculum claims. S18, S04, S05, S11, and S23 gates still apply.

S23 current decision: do not promote to live yet. Promote the domain/cluster safe-card layer and S04/S05 content slices only after S18 full review, S11 browser regression on an integrated live/candidate app surface, and owner approval. The S11 static preview smoke is useful candidate evidence, but it is not live app route regression.
