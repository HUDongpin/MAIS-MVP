# EASE DeepSeek V4 Pro QA Runner

S18 content-QA tool for checking `data/ease/ease_questions_all.json` with `deepseek-v4-pro`.

## Scope

- Source JSON is read-only.
- Output artifacts stay in this directory.
- The runner checks:
  - whether each question is solvable from the text-only EASE export;
  - whether `standardAnswer` matches the question;
  - whether image-dependent rows require a separate vision/OCR pass.
- The runner never writes API keys, bearer tokens, request headers, or raw provider transcripts.

## Commands

Dry run, no API calls:

```bash
node coordination/content-qa/ease-deepseek-qa/ease-deepseek-v4-pro-qa.mjs --dry-run
```

Pilot run after S19/owner rotates the exposed key:

```bash
LLM_API_KEY=<rotated-key> node coordination/content-qa/ease-deepseek-qa/ease-deepseek-v4-pro-qa.mjs --pilot --sample-size 100 --batch-size 5 --concurrency 2
```

Full run:

```bash
LLM_API_KEY=<rotated-key> node coordination/content-qa/ease-deepseek-qa/ease-deepseek-v4-pro-qa.mjs --full --batch-size 5 --concurrency 2
```

Rebuild a full report from cached batches without new API calls:

```bash
LLM_API_KEY=<rotated-key> node coordination/content-qa/ease-deepseek-qa/ease-deepseek-v4-pro-qa.mjs --full --summarize
```

## Outputs

Inventory and dry-run:

- `YYYY-MM-DD-S18-ease-inventory-summary.json`
- `YYYY-MM-DD-S18-ease-inventory-summary.md`
- `YYYY-MM-DD-S18-ease-deepseek-v4-pro-qa-dry-run-prompts.json`
- `YYYY-MM-DD-S18-ease-deepseek-v4-pro-qa-dry-run.md`

Pilot/full QA:

- `YYYY-MM-DD-S18-ease-deepseek-v4-pro-qa.json`
- `YYYY-MM-DD-S18-ease-deepseek-v4-pro-qa.csv`
- `YYYY-MM-DD-S18-ease-deepseek-v4-pro-qa.md`
- Pilot/range runs add the scope suffix before the extension.
- Batch checkpoints are saved under `batches/`; provider/schema failures are also copied to `errors/`.

## Verdict Schema

- `solvabilityStatus`: `pass | unsolvable | ambiguous | image-context-required | api-error`
- `answerMatchStatus`: `pass | mismatch | missing-answer-key | not-checkable`
- `severity`: `P0 | P1 | P2 | none`

Rows with `standardAnswer` equal to `<not provided from school>` are always reported as `missing-answer-key` for answer consistency, even when DeepSeek can derive an independent answer.
