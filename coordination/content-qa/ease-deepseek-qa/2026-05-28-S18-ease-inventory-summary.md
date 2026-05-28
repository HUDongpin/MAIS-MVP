# EASE Question Inventory Summary

- Date: 2026-05-28
- Session ID: S18
- Source: `data/ease/ease_questions_all.json`
- Total questions: 9339
- Metadata total: 9339
- Duplicate ID rows: 0
- Missing required-field rows: 1
- Missing answer-key rows: 73
- Rows with question images/placeholders: 1000
- Missing local image files: 0
- AI-solve true rows: 8495

## Counts By Question Type

| Question type | Count |
| --- | ---: |
| FRQ | 6797 |
| MCQ | 2394 |
| BFQ | 148 |

## Counts By Level

| Level | Count |
| --- | ---: |
| junior_secondary | 7502 |
| senior_secondary | 1479 |
| primary | 356 |
| unknown | 2 |

## Counts By Grade

| Grade | Count |
| --- | ---: |
| 7 | 4883 |
| 8 | 1977 |
| 9 | 642 |
| 11 | 639 |
| 10 | 620 |
| 4 | 282 |
| 12 | 220 |
| 3 | 58 |
| 5 | 14 |
| 2 | 2 |
| unknown | 2 |

## Notes

- This inventory does not call DeepSeek and does not inspect or write real secret files.
- Rows with `standardAnswer` equal to `<not provided from school>` must receive `answerMatchStatus=missing-answer-key` in model QA.
- Image rows are text-checked only unless a separate vision/OCR workflow is approved.
