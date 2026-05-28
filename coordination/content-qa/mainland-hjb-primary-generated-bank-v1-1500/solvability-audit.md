# S18 Mainland HJB Primary Generated Bank V1 Candidate Solvability Audit

- Date: 2026-05-25
- Session ID: S18
- Scope: Mainland Shanghai Education Press / HuJiaoBan P1-P6 generated question bank
- Result: candidate-qa-green
- Total questions: 1500
- Pass rows: 1500
- Failing rows: 0
- Duplicate IDs / prompts: 0 / 0
- Manual review queue: 300 rows

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

## Assumptions

- This audit validates generated JSONL/CSV/JSON as a candidate QA package only.
- DeepSeek-generated free-form math is checked structurally here; the 300-row queue records the required S18 pass-sample review set.
- The generated content uses committed safe-RAG cards only; no OCR, textbook body text, paper prompt text, source image, or source locator is used by this audit.
- This task does not approve production integration. A later owner-authorized S04/S08/S18 integration task must make that decision separately.
