# S18 Mainland PEP Junior 1200-Question V2 QA Report

- Date: 2026-05-23
- Session ID: S18
- Workstream: Curriculum/content QA
- Candidate directory: `coordination/content-qa/mainland-pep-junior-generated-bank-v2-1200/`
- Source policy: deterministic local generation from safe RAG cards only; no BL/LLM call; no source textbook or paper text.
- Release stance: automated QA and S18 sample review passed; ready for the owner-authorized public integration in this task.
- QA result: Automated gate passed

## Coverage

| grade | count |
| --- | --- |
| S1 | 400 |
| S2 | 400 |
| S3 | 400 |

| semester | count |
| --- | --- |
| S1-upper | 200 |
| S1-lower | 200 |
| S2-upper | 200 |
| S2-lower | 200 |
| S3-upper | 200 |
| S3-lower | 200 |

| difficulty | count |
| --- | --- |
| Foundation | 230 |
| Core | 610 |
| Exam | 280 |
| Challenge | 80 |

| status | count |
| --- | --- |
| pass | 1200 |

## Gate Checks

- 1200 total candidate rows.
- S1, S2, and S3 each have 400 rows; each grade has 200 upper-semester and 200 lower-semester rows.
- 400 multiple-choice, 400 fill-in, and 400 short-answer rows.
- Difficulty quotas match the owner plan: S1 130/210/50/10, S2 70/230/80/20, S3 30/170/150/50 for Foundation/Core/Exam/Challenge.
- 11 curriculum safe-RAG cards covered.
- 33 knowledge-point/type cells covered using the fixed semester/topic quota algorithm.
- 132-row manual review queue and S18 review-results CSV generated with first/middle/last/high-risk sampling per cell.
- Multiple-choice options are structurally unique with exactly one canonical answer.
- Prompt/options/explanation scan found no source-copying, page/OCR, or missing-visual artifacts.

## Recommendation

Promote this v2 bank to the public Mainland PEP junior question aggregate for the owner-authorized implementation. Keep the v1 900-question candidate pack as historical QA context only.
