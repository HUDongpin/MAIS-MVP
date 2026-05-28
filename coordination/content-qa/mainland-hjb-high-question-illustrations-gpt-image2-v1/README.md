# Mainland HJB High GPT Image2 Question Illustrations V1

Review-only generation package for 3,813 P1/P2 Mainland HJB high-school question illustration candidates.

## Generated Files

- `question-illustration-plan.json`: full manifest.
- `prompts/smoke-by-template.jsonl`: one row per reusable template key.
- `prompts/chunk-*.jsonl`: full GPT Image2 batch prompts, 50 jobs per chunk.
- `manual-review.csv`: manual QA decisions.
- `index.md` / `index.html`: lightweight review indexes.
- `validation-report.json`: package and image-generation validation status.

## Commands

Codex built-in route smoke queue:

```bash
node coordination/content-qa/mainland-hjb-high-question-illustrations-gpt-image2-v1/codex-built-in-review-package.mjs next --mode smoke
```

After Codex built-in `image_gen` creates a PNG under `$CODEX_HOME/generated_images/...`, import it:

```bash
node coordination/content-qa/mainland-hjb-high-question-illustrations-gpt-image2-v1/codex-built-in-review-package.mjs import \
  --question-id <questionId> \
  --source <absolute-path-to-codex-generated-png>
```

Refresh package validation and indexes:

```bash
node coordination/content-qa/mainland-hjb-high-question-illustrations-gpt-image2-v1/codex-built-in-review-package.mjs rebuild
```

Record manual QA status without editing CSV by hand:

```bash
node coordination/content-qa/mainland-hjb-high-question-illustrations-gpt-image2-v1/codex-built-in-review-package.mjs review \
  --question-id <questionId> \
  --status approved|revise|reject \
  --notes "<review notes>"
```

Smoke dry-run through the package runner:

```bash
node coordination/content-qa/mainland-hjb-high-question-illustrations-gpt-image2-v1/run-gpt-image2-generation.mjs --mode smoke --dry-run
```

Real smoke after `OPENAI_API_KEY` is available:

```bash
node coordination/content-qa/mainland-hjb-high-question-illustrations-gpt-image2-v1/run-gpt-image2-generation.mjs --mode smoke
```

Full generation after smoke QA:

```bash
node coordination/content-qa/mainland-hjb-high-question-illustrations-gpt-image2-v1/run-gpt-image2-generation.mjs --mode full
```

The runner skips existing PNG files by default. Add `--force` only when approved images should be regenerated.

Direct CLI command for one prompt file, if needed:

```bash
python3 /Users/dongpinhu/.codex/skills/.system/imagegen/scripts/image_gen.py generate-batch \
  --input coordination/content-qa/mainland-hjb-high-question-illustrations-gpt-image2-v1/prompts/chunk-001.jsonl \
  --out-dir coordination/content-qa/mainland-hjb-high-question-illustrations-gpt-image2-v1/candidates \
  --model gpt-image-2 --size 1536x864 --quality medium --output-format png \
  --concurrency 3 --max-attempts 4 --no-augment
```

## Counts

- Manifest rows: 3813
- Prompt chunks: 77
- Smoke rows: 33

Do not copy any candidates into `public/` or product data until manual QA is complete and a separate integration plan is approved.
