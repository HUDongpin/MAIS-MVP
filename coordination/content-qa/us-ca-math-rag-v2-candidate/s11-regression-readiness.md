# S11 Regression Readiness - California Math RAG v2 Candidate

Package: `us-ca-math-rag-v2-candidate`
Date: 2026-06-19
Regression owner: S11 QA and release quality
Current status: not run, blocked until candidate integration exists

## Why S11 Cannot Run Full Regression Yet

The package is not wired into a route, live RAG adapter, practice bank, or lesson surface. Running browser regression now would only test the existing product, not this candidate package.

## Preconditions Before S11 Runs

1. S18 approves source-safety and representative alignment checks.
2. S23 defines the candidate integration slice.
3. S04 or S05 integrates a small approved sample into a non-live branch or review surface.
4. The integrated surface exposes enough metadata to verify `US_CA_MATH`, `CA.CCSS.Math.*`, source IDs, and candidate-only/release wording.

## Representative Regression Matrix

- Kindergarten/P1 practice path: verify California track selection, standard metadata, and original item text.
- Grade 6 or Grade 7 practice path: verify middle-school domain retrieval and remediation hints.
- High-school lesson path: verify high-school domain/category metadata and no overclaiming of complete course launch.
- RAG retrieval inspection: verify v2 cards retrieve by grade, domain, cluster, and standard ID.
- Release wording smoke: verify public UI says practice beta or standards-aligned candidate where appropriate.

## Candidate Coverage Available For Test Selection

- Grade buttons available: 11
- Domain cards available: 67
- Cluster cards available: 68
- S04 briefs available: 68
- S05 briefs available: 68
- S04 representative candidate samples: 5
- S05 representative candidate samples: 3
- S04 representative candidate samples: 5
- S05 representative candidate samples: 3

## Stop Condition

If any integrated sample contains copied IXL preview/item text, copied official standard prose, invalid `CA.CCSS.Math.*` IDs, or complete-curriculum launch wording, S11 should fail the candidate and return it to S18/S21/S23.
