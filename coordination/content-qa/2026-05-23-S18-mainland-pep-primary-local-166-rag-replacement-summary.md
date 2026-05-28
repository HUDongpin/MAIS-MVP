# S18 Mainland PEP Primary Local 166 Same-ID RAG Replacement Audit

- Date: 2026-05-23
- Session ID: S18
- Workstream: Curriculum/content QA
- Scope: Same-ID deterministic local RAG replacement for 166 Mainland PEP primary local rows previously marked `rewrite`
- Public primary local RAG count: 1200
- Replacement IDs restored: 166/166
- Result: pass

## Distribution

| Grade | Replacement rows |
| --- | --- |
| P1 | 27 |
| P2 | 30 |
| P3 | 30 |
| P4 | 30 |
| P5 | 30 |
| P6 | 19 |

| Type | Replacement rows |
| --- | --- |
| multiple-choice | 47 |
| fill-in | 82 |
| short-answer | 37 |

| Topic | Rows | Prompt frames |
| --- | --- | --- |
| pep-primary-p1-upper-shapes-position-time | 7 | 3 |
| pep-primary-p1-upper-number-sense | 2 | 2 |
| pep-primary-p1-lower-within-100-add-sub | 11 | 3 |
| pep-primary-p1-lower-money-data-review | 7 | 3 |
| pep-primary-p2-upper-multiplication-arrays | 4 | 3 |
| pep-primary-p2-upper-length-angles-observation | 8 | 3 |
| pep-primary-p2-lower-division-remainder | 12 | 3 |
| pep-primary-p2-lower-place-value-measurement-data | 6 | 3 |
| pep-primary-p3-upper-measurement-time-geometry | 10 | 3 |
| pep-primary-p3-upper-operations-fractions | 2 | 2 |
| pep-primary-p3-lower-area-decimals | 6 | 3 |
| pep-primary-p3-lower-statistics-review | 12 | 3 |
| pep-primary-p4-upper-large-numbers-multiplication | 4 | 3 |
| pep-primary-p4-upper-angles-geometry | 8 | 3 |
| pep-primary-p4-lower-decimals-average | 12 | 3 |
| pep-primary-p4-lower-perimeter-area-lines | 6 | 3 |
| pep-primary-p5-upper-decimals-equations | 12 | 3 |
| pep-primary-p5-upper-polygon-area | 6 | 3 |
| pep-primary-p5-lower-factors-fractions | 9 | 3 |
| pep-primary-p5-lower-volume-data | 3 | 3 |
| pep-primary-p6-upper-percent-fractions | 12 | 3 |
| pep-primary-p6-lower-ratio-proportion-scale | 7 | 3 |

## QA Gates

| Gate | Result |
| --- | --- |
| 166 replacement IDs present in public bank | pass |
| Public primary local RAG count is 1200 | pass |
| Deterministic answer check | pass |
| Multiple-choice unique answer check | pass |
| Source-distance / forbidden artifact scan | pass |
| Exact prompt duplicate scan | pass |
| Topic families with at least 3 replacement rows use 3 prompt frames | pass |

## Failing Rows

- None.

## Risks And Follow-Up

- This audit verifies deterministic replacement mechanics, answer-key agreement, source-safety scan, and duplicate-prompt absence.
- It does not replace a future S18 human sample after the replacement set is promoted; the next QA pass should sample the restored 1200-bank with emphasis on the 166 replacement rows and adjacent topic clusters.
- Historical S18 manual-review artifacts are retained as evidence of why these IDs were replaced.
