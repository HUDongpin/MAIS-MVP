# S18 Mainland HJB Junior Generated Bank V2 Candidate Solvability Audit

- Date: 2026-05-27
- Session ID: S18
- Scope: Mainland Shanghai Education Press / HuJiaoBan S1-S3 generated question bank
- Result: candidate-qa-green
- Total questions: 1500
- Pass rows: 1500
- Failing rows: 0
- Duplicate IDs / prompts: 0 / 0
- Manual review queue: 150 rows

## Grade Counts

| grade | count |
| --- | --- |
| S1 | 500 |
| S2 | 500 |
| S3 | 500 |

## Type Counts

| type | count |
| --- | --- |
| multiple-choice | 600 |
| fill-in | 525 |
| short-answer | 375 |

## Difficulty Counts

| difficulty | count |
| --- | --- |
| Core | 755 |
| Foundation | 295 |
| Exam | 350 |
| Challenge | 100 |

## Inventory Issues

- None

## Assumptions

- This audit validates generated JSONL/CSV/JSON as the owner-authorized HJB junior production package.
- DeepSeek-generated free-form math is checked structurally here; the 150-row queue records the completed S18 pass-sample review set.
- The generated content uses committed safe-RAG cards only; no OCR, textbook body text, paper prompt text, source image, or source locator is used by this audit.
- Owner-authorized S04/S08/S18 integration may expose this package through publisher-scoped Lesson, Practice, and API surfaces.
