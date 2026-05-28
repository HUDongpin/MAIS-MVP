# EASE DeepSeek V4 Pro QA Dry Run

- Date: 2026-05-28
- Session ID: S18
- API calls made: 0
- Prompt samples written: 5
- Inventory total questions: 9339
- Missing answer-key rows: 73
- Rows with question images/placeholders: 1000

## Prompt Sample IDs

- `40` (MCQ, image=false, missingAnswerKey=false)
- `100000043` (BFQ, image=false, missingAnswerKey=false)
- `10629` (FRQ, image=false, missingAnswerKey=false)
- `192` (FRQ, image=true, missingAnswerKey=false)
- `10357` (FRQ, image=true, missingAnswerKey=true)

## Next Commands

- Pilot: `LLM_API_KEY=<rotated-key> node coordination/content-qa/ease-deepseek-qa/ease-deepseek-v4-pro-qa.mjs --pilot --sample-size 100 --batch-size 5 --concurrency 2`
- Full: `LLM_API_KEY=<rotated-key> node coordination/content-qa/ease-deepseek-qa/ease-deepseek-v4-pro-qa.mjs --full --batch-size 5 --concurrency 2`
