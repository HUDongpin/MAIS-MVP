# S18 Mainland PEP Primary Local 1200 Manual Sample Review

- Date: 2026-05-23
- Session ID: S18
- Workstream: Curriculum/content QA
- Scope: 180-row manual-sample review for the local deterministic `primary-rag-v1` Mainland PEP primary 1200-question bank
- Source bank: `mainlandPepPrimaryRagV1Questions` / `local-1200` rows from the S18 DeepSeek-vs-local quality report
- App/source edits: none
- Final recommendation: not ready: math-safe but diversity-not-ready

## Executive Summary

- Sample size: 180/1200 (15%).
- Coverage: all 24 populated `grade × semester × type` cells have at least 6 reviewed rows; 12 source-empty cells are documented below.
- Manual math status: 180 pass, 0 fail, 0 uncertain.
- Answer-key status: 180 pass; no ambiguous multiple-choice answer was found in the sample.
- Source distance: 180 pass; no source-copying artifact was found in sampled prompt/options/explanations.
- Release risk: 166 sampled rows require rewrite due to dense template repetition; 14 rows have minor polish notes; 0 rows are hard blockers.
- Judgment: the 1200 bank is mathematically safe in this sample, but the sampled rows confirm broad template-density risk across multiple topic families.

## Sampling Adjustment From Original Plan

- The original 36-cell sampling plan assumed every `grade × semester × type` cell had questions.
- Actual local-1200 distribution has 12 empty cells: upper-semester short-answer is absent for P1-P6, and lower-semester multiple-choice is absent for P1-P6.
- To preserve the 180-row target without fabricating rows, the balanced sample was adjusted to 6 rows per populated cell: 24 populated cells × 6 = 144 coverage rows, plus 36 risk-weighted rows.
- Source-empty cells: P1/upper/short-answer, P1/lower/multiple-choice, P2/upper/short-answer, P2/lower/multiple-choice, P3/upper/short-answer, P3/lower/multiple-choice, P4/upper/short-answer, P4/lower/multiple-choice, P5/upper/short-answer, P5/lower/multiple-choice, P6/upper/short-answer, P6/lower/multiple-choice.

## Final Decision Counts

| Decision | Count |
| --- | --- |
| approve | 0 |
| approve-with-minor-polish | 14 |
| rewrite | 166 |
| block | 0 |

## Grade Summary

| Grade | Sample | Approve | Minor polish | Rewrite | Block |
| --- | --- | --- | --- | --- | --- |
| P1 | 30 | 0 | 3 | 27 | 0 |
| P2 | 30 | 0 | 0 | 30 | 0 |
| P3 | 30 | 0 | 0 | 30 | 0 |
| P4 | 30 | 0 | 0 | 30 | 0 |
| P5 | 30 | 0 | 0 | 30 | 0 |
| P6 | 30 | 0 | 11 | 19 | 0 |

## Blocker List

- None. No sampled row had math failure, ambiguous answer key, source-distance failure, or major grade-fit issue.

## Template Diversity Judgment

- Topic families sampled: 24.
- Topic families with at least one `repetitive-blocking` sampled row: 21.
- The dominant issue is not correctness; it is that many rows use the same canonical prompt frame with only numbers or surface context changed.
- Recommendation: keep the bank as the math-safe baseline, but do not make a broad external production-readiness claim until a diversity rewrite or de-templating pass is completed for high-density clusters.

| Topic | Sample | Acceptable | Usable repetitive | Blocking repetitive |
| --- | --- | --- | --- | --- |
| pep-primary-p2-lower-division-remainder | 12 | 0 | 0 | 12 |
| pep-primary-p3-lower-statistics-review | 12 | 0 | 0 | 12 |
| pep-primary-p4-lower-decimals-average | 12 | 0 | 0 | 12 |
| pep-primary-p5-upper-decimals-equations | 12 | 0 | 0 | 12 |
| pep-primary-p6-upper-percent-fractions | 12 | 0 | 0 | 12 |
| pep-primary-p1-lower-within-100-add-sub | 11 | 0 | 0 | 11 |
| pep-primary-p3-upper-measurement-time-geometry | 10 | 0 | 0 | 10 |
| pep-primary-p5-lower-factors-fractions | 9 | 0 | 0 | 9 |
| pep-primary-p2-upper-length-angles-observation | 8 | 0 | 0 | 8 |
| pep-primary-p4-upper-angles-geometry | 8 | 0 | 0 | 8 |
| pep-primary-p1-lower-money-data-review | 7 | 0 | 0 | 7 |
| pep-primary-p6-lower-ratio-proportion-scale | 7 | 0 | 0 | 7 |
| pep-primary-p2-lower-place-value-measurement-data | 6 | 0 | 0 | 6 |
| pep-primary-p3-lower-area-decimals | 6 | 0 | 0 | 6 |
| pep-primary-p4-lower-perimeter-area-lines | 6 | 0 | 0 | 6 |
| pep-primary-p5-upper-polygon-area | 6 | 0 | 0 | 6 |
| pep-primary-p2-upper-multiplication-arrays | 4 | 0 | 0 | 4 |
| pep-primary-p4-upper-large-numbers-multiplication | 4 | 0 | 0 | 4 |
| pep-primary-p5-lower-volume-data | 3 | 0 | 0 | 3 |
| pep-primary-p1-upper-number-sense | 2 | 0 | 0 | 2 |
| pep-primary-p3-upper-operations-fractions | 2 | 0 | 0 | 2 |
| pep-primary-p1-upper-shapes-position-time | 10 | 3 | 7 | 0 |
| pep-primary-p6-lower-negative-review | 5 | 1 | 4 | 0 |
| pep-primary-p6-upper-coordinate-data | 6 | 1 | 5 | 0 |

## Release Gate Result

- Math/answer/source gate: pass in the 180-row sample.
- Minor language/explanation gate: not release-blocking, but the `第N小组` prefix should be removed or naturalized before student-facing polish.
- Template gate: fail for broad launch. The bank is `math-safe but diversity-not-ready` because repetitive-blocking rows appear across multiple topic families.
- S04/S08 integration recommendation: do not treat the full 1200 as final production content yet. Use it as the controlled baseline only after a diversity remediation plan is accepted, or expose a smaller curated subset first.

## Generated Artifacts

- Sample queue: `coordination/content-qa/2026-05-23-S18-mainland-pep-primary-local-1200-manual-sample-queue.csv`
- Review results: `coordination/content-qa/2026-05-23-S18-mainland-pep-primary-local-1200-manual-review-results.csv`
- Summary: `coordination/content-qa/2026-05-23-S18-mainland-pep-primary-local-1200-manual-review-summary.md`

## Checks

- Generated queue has exactly 180 unique local-1200 question IDs.
- Generated queue covers all 24 populated `grade × semester × type` cells and documents the 12 source-empty cells.
- Review result rows have all rubric fields populated.
- No live LLM, OCR, textbook corpus, source image, or external solver was used.
- Required project gates should be run after artifact generation: `npm run test:question-bank` and `npm run test:rag`.

## Assumptions

- Existing deterministic answer verification is trusted as the automated math baseline.
- This pass records content QA decisions only; source question edits require a separate owner-approved remediation task.
- `rewrite` rows are not hard correctness blockers; they mean the sampled row is mathematically usable but should not be part of a broad launch without de-templating.
