# S18 Representative Sample Review - California RAG v2 Downstream Candidates

Date: 2026-06-19

Reviewer role: S18 curriculum QA

Upstream owner: S21 content pipeline

Practice owner: S04 practice lead

Lesson owner: S05 lesson lead

## Scope

This is a representative QA sample, not a production approval. It checks source-safety, standards alignment, and math correctness for selected S04/S05 candidate rows generated from `$california-math-common-core`.

## Practice Sample Checks

| Candidate ID | Grade | Cluster | Math Check | Verdict |
| --- | --- | --- | --- | --- |
| `s04-ca-rag-v2-q003-k-cc-cardinality-compare` | K | `K.CC.cardinality-compare` | 7 green tiles vs 4 yellow tiles gives `7 - 4 = 3`, so green has 3 more. | Pass |
| `s04-ca-rag-v2-q008-1-oa-add-subtract` | P1 | `1.OA.add-subtract` | `9 + 6 = 15`; `15 - 4 = 11`. | Pass |
| `s04-ca-rag-v2-q031-6-rp-ratios` | P6 | `6.RP.ratios` | Fruit scales from 5 to 20 by factor 4; oats scale from 3 to `3 x 4 = 12`. | Pass |
| `s04-ca-rag-v2-q043-8-f-function-relationships` | S2 | `8.F.function-relationships` | y-values increase by 3 and `y = 4` when `x = 0`, so rule is `y = 3x + 4`. | Pass |
| `s04-ca-rag-v2-q050-a-sse-structure` | S3-S6 | `A-SSE.structure` | Common factor of `6x^2 + 15x` is `3x`; result `3x(2x + 5)` expands correctly. | Pass |
| `s04-ca-rag-v2-q067-s-md-decisions` | S3-S6 | `S-MD.decisions` | Expected value is `10 x 1/4 + 0 x 3/4 = 2.5`. | Pass |

## Lesson Sample Checks

| Candidate ID | Grade | Cluster | Lesson Structure Check | Verdict |
| --- | --- | --- | --- | --- |
| `s05-ca-rag-v2-lesson-003-k-cc-cardinality-compare` | K | `K.CC.cardinality-compare` | Includes objective, prerequisite check, concept explanation, worked example, guided practice, independent practice, remediation, and teacher notes. | Pass for review |
| `s05-ca-rag-v2-lesson-031-6-rp-ratios` | P6 | `6.RP.ratios` | Worked example matches the validated ratio question; remediation targets additive-vs-multiplicative confusion. | Pass for review |
| `s05-ca-rag-v2-lesson-050-a-sse-structure` | S3-S6 | `A-SSE.structure` | Worked example matches validated factoring item; teacher notes preserve candidate-only/source-safety boundary. | Pass for review |
| `s05-ca-rag-v2-lesson-066-s-cp-probability` | S3-S6 | `S-CP.probability` | Probability lesson has concept explanation, worked example, independent practice, and remediation fields; route rendering still untested. | Pass for review |

## Source-Safety Result

The sampled rows use original MAIS-authored values and contexts. No copied IXL preview text, screenshot item text, official standard prose, answer key, or proprietary layout was identified in the sample.

## S18 Verdict

Status: `candidate-only`.

The sampled S04/S05 rows pass representative math and structure review and are suitable for downstream manual review or candidate-route planning. They are not approved for live student use. S18 full-package human review and S11 browser regression remain required before S23 can consider promotion.
