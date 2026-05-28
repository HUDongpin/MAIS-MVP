# S18 Mainland BNU Junior Generated Bank V1 Candidate Audit

- Date: 2026-05-27
- Session ID: S18
- Scope: Mainland Beijing Normal University Press S1-S3 generated candidate question bank
- Result: candidate-auto-gate-passed
- Total questions: 1500
- Pass rows: 1500
- Failing rows: 0
- Duplicate IDs / prompts: 0 / 0
- Manual review queue: 300 rows

## Grade Counts

| grade | count |
| --- | --- |
| S1 | 500 |
| S2 | 500 |
| S3 | 500 |

## Type Counts

| type | count |
| --- | --- |
| multiple-choice | 525 |
| short-answer | 525 |
| fill-in | 450 |

## Difficulty Counts

| difficulty | count |
| --- | --- |
| Core | 695 |
| Foundation | 290 |
| Exam | 385 |
| Challenge | 130 |

## Inventory Issues

- None

## Assumptions

- This audit validates generated JSONL/CSV/JSON as a candidate-only package before any public practice integration.
- DeepSeek-generated free-form math is checked structurally here; the 300-row queue records the required S18 manual review set.
- The generated content uses committed safe-RAG cards only; no OCR, textbook body text, paper prompt text, source image, or source locator is used by this audit.
- Production integration remains blocked until a separate owner-approved S04/S18 integration task.
