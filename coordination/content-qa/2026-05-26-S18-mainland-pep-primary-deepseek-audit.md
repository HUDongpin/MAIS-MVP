# S18 Mainland PEP Primary Deepseek-v4-pro QA Audit

- Date: 2026-05-26
- Session ID: S18
- Workstream: Curriculum QA and content quality
- Scope: Online Mainland PEP primary questions integrated through `data/questions.ts` as `mainlandPepPrimaryRagV1Questions`
- Model: `deepseek-v4-pro`
- API host: `api.deepseek.com`
- Started at: 2026-05-26T05:48:44.247Z
- Completed at: 2026-05-26T06:19:44.489Z
- Status: Completed - review required

## Executive Summary

- Deepseek-v4-pro reviewed 1200/1200 online Mainland PEP primary questions.
- Solvability: 1200 pass, 0 review, 0 fail.
- Answer match: 1200 pass, 0 review, 0 fail.
- Final recommendation: 1199 pass, 1 review-required.
- Single-question re-review was applied to 10 flagged or low-confidence rows.

## Summary Counts

| Metric | Count |
| --- | ---: |
| Expected online Mainland PEP primary questions | 1200 |
| Deepseek-v4-pro rows checked | 1200 |
| Pass rows | 1199 |
| Review-required rows | 1 |
| Unsolvable rows | 0 |
| Answer-mismatch rows | 0 |
| Option-mismatch rows | 1 |
| Ambiguous rows | 0 |
| Missing-context rows | 0 |
| Low-confidence rows | 0 |

## By Grade

| Grade | Count |
| --- | ---: |
| P1 | 200 |
| P2 | 200 |
| P3 | 200 |
| P4 | 200 |
| P5 | 200 |
| P6 | 200 |

## By Type

| Type | Count |
| --- | ---: |
| multiple-choice | 450 |
| fill-in | 450 |
| short-answer | 300 |

## Top Topic Counts

| Topic ID | Count |
| --- | ---: |
| `pep-primary-p1-lower-money-data-review` | 50 |
| `pep-primary-p1-lower-within-100-add-sub` | 50 |
| `pep-primary-p1-upper-number-sense` | 50 |
| `pep-primary-p1-upper-shapes-position-time` | 50 |
| `pep-primary-p2-lower-division-remainder` | 50 |
| `pep-primary-p2-lower-place-value-measurement-data` | 50 |
| `pep-primary-p2-upper-length-angles-observation` | 50 |
| `pep-primary-p2-upper-multiplication-arrays` | 50 |
| `pep-primary-p3-lower-area-decimals` | 50 |
| `pep-primary-p3-lower-statistics-review` | 50 |
| `pep-primary-p3-upper-measurement-time-geometry` | 50 |
| `pep-primary-p3-upper-operations-fractions` | 50 |
| `pep-primary-p4-lower-decimals-average` | 50 |
| `pep-primary-p4-lower-perimeter-area-lines` | 50 |
| `pep-primary-p4-upper-angles-geometry` | 50 |
| `pep-primary-p4-upper-large-numbers-multiplication` | 50 |
| `pep-primary-p5-lower-factors-fractions` | 50 |
| `pep-primary-p5-lower-volume-data` | 50 |
| `pep-primary-p5-upper-decimals-equations` | 50 |
| `pep-primary-p5-upper-polygon-area` | 50 |
| `pep-primary-p6-lower-negative-review` | 50 |
| `pep-primary-p6-lower-ratio-proportion-scale` | 50 |
| `pep-primary-p6-upper-coordinate-data` | 50 |
| `pep-primary-p6-upper-percent-fractions` | 50 |

## Review Queue

| Question ID | Grade | Type | Issue | Stored answer | Deepseek answer | Action | Note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `pep-primary-p6-u-mc-052` | P6 | multiple-choice | option_mismatch | (0, 0) | (0, 0) | fix-question | Stage A: 选项中有(0, 0)和(0, 0)1，后者可能是录入错误，正确答案应为(0, 0)。 / Stage B: 独立答案与题库答案一致，选项虽有异常但答案匹配 / 复审: 选项B为(0, 0)，选项A为(0, 0)1，后者明显为录入错误，正确答案(0, 0)对应选项B，题目可解，答案匹配。 |

## Resolution Update

- Status: Fixed after audit.
- Source fix: `data/mainlandPepPrimaryQuestions.ts` now deduplicates coordinate distractors before generic fallback options are used.
- Regression test: `lib/mainlandPepPrimaryQuestionBank.test.ts` asserts `pep-primary-p6-u-mc-052` options are `(-1, 0)`, `(0, 0)`, `(0, 1)`, `(1, 0)`.
- Refreshed input: `2026-05-26-S18-mainland-pep-primary-deepseek-audit-input.json` was regenerated after the fix and no longer contains `(0, 0)1`.
- Verification: targeted emitted primary question-bank test passed 6/6; `npm run test:question-bank` passed 48/48.

## Token Usage

| Prompt | Completion | Total |
| ---: | ---: | ---: |
| 251740 | 147203 | 398943 |

## Checks Run

- `npm run test:question-bank`: passed before live Deepseek run.
- Stage A blind input integrity: 1200 rows and 0 stored-answer/explanation fields.
- Deepseek-v4-pro Stage A solver: completed.
- Deepseek-v4-pro Stage B comparator: completed.
- Deepseek-v4-pro single-question re-review: completed for flagged/low-confidence rows.
- Post-run `npm run test:question-bank`: blocked during TypeScript compile by an out-of-scope `lib/server/eduhkOpenApi.test.ts` `ProcessEnv`/`NODE_ENV` typing error.

## Notes

- The API key was supplied only as a transient runtime secret and is not recorded in this artifact.
- This audit did not edit question-bank source files.
- Any future direct data fixes require owner authorization and S04/S18 coordination.
- Because the API key was pasted into chat, rotate it after this run if the key should remain production-grade.
