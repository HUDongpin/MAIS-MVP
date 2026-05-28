# S18 Mainland PEP Junior 900-Question Candidate QA Report

- Date: 2026-05-23
- Session ID: S18
- Workstream: Curriculum/content QA
- Candidate directory: `coordination/content-qa/mainland-pep-junior-generated-bank-v1/`
- Source policy: deterministic local generation from safe RAG cards only; no BL/LLM call; no source textbook or paper text.
- Release stance: candidate-only, not student-facing.
- QA result: Automated gate passed

## Coverage

| grade | count |
| --- | --- |
| S1 | 409 |
| S2 | 327 |
| S3 | 164 |

| status | count |
| --- | --- |
| pass | 900 |

## Gate Checks

- 900 total candidate rows.
- 11 curriculum safe-RAG cards covered.
- 33 knowledge-point/type cells covered with 27 or 28 rows each.
- 300 multiple-choice, 300 fill-in, and 300 short-answer rows.
- 99-row manual review queue generated with first/middle/last sampling per cell.
- Multiple-choice options are structurally unique with exactly one canonical answer.
- Prompt/options/explanation scan found no source-copying, page/OCR, or missing-visual artifacts.

## Recommendation

Keep this bank as a candidate QA asset until S18 manual review signs off the 99 sampled rows and any future public integration is coordinated with S04/S08/S12.
