# S18 Mainland BNU Primary Generated Bank V2 Candidate Solvability Audit

- Date: 2026-05-26
- Session ID: S18
- Scope: Mainland Beijing Normal University Press P1-P6 generated question bank
- Result: candidate-qa-green
- Total questions: 1500
- Pass rows: 1500
- Failing rows: 0
- Duplicate IDs / prompts: 0 / 0
- V1 prompt reference keys: 1546
- Manual review queue: 300 rows
- Manual review status counts: approved 300

## Grade Counts

| grade | count |
| --- | --- |
| P1 | 250 |
| P2 | 250 |
| P3 | 250 |
| P4 | 250 |
| P5 | 250 |
| P6 | 250 |

## Type Counts

| type | count |
| --- | --- |
| multiple-choice | 600 |
| fill-in | 540 |
| short-answer | 360 |

## Difficulty Counts

| difficulty | count |
| --- | --- |
| Foundation | 553 |
| Core | 661 |
| Challenge | 216 |
| Exam | 70 |

## Inventory Issues

- None

## Manual Review Closure

| status | count |
| --- | --- |
| approved | 300 |

- All 300 S18 manual sample rows are approved.

## Assumptions

- This audit validates generated JSONL/CSV/JSON as a candidate QA package only.
- DeepSeek-generated free-form math is checked structurally here; the 300-row queue records the required S18 pass-sample review set.
- The generated content uses committed safe-RAG cards only; no OCR, textbook body text, paper prompt text, source image, or source locator is used by this audit.
- V2 candidates are checked against the BNU primary v1 prompt reference set for exact and high-similarity prompt reuse.
- This task does not approve production integration. A later owner-authorized S04/S08/S18 integration task must make that decision separately.
