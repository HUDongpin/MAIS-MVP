# HJB Primary Question Illustrations V1

S18 content-QA generation package for Shanghai Education Publishing House primary math question illustrations.

## Scope

- Source inventory: `coordination/content-qa/hjb-primary-illustration-audit/question-illustration-inventory.json`
- Queue: `1145` questions
- A_required: `607`
- B_strong_recommended: `538`
- C_optional_or_text_only: deferred
- Output candidates stay in this package under `candidates/`; nothing is copied to `public/` and no question-bank source files are modified.

## Build and Dry Run

```bash
node coordination/content-qa/hjb-primary-question-illustrations-v1/build-generation-queue.mjs
node coordination/content-qa/hjb-primary-question-illustrations-v1/generate-gpt-image2-candidates.mjs --dry-run --tier A_required --limit 30
```

## Codex Built-In GPT Image 2 Route

This is the default route for candidate generation. It does not require `OPENAI_API_KEY`: Codex generates one image at a time with the built-in `image_gen` tool, and this script imports the newest generated file from `${CODEX_HOME:-$HOME/.codex}/generated_images`.

Check current status:

```bash
node coordination/content-qa/hjb-primary-question-illustrations-v1/generate-gpt-image2-candidates.mjs --built-in-status
```

Print the next prompts for Codex built-in generation:

```bash
node coordination/content-qa/hjb-primary-question-illustrations-v1/generate-gpt-image2-candidates.mjs --next-built-in --count 30
```

For each returned item, send `prompt` to Codex built-in GPT Image 2, then immediately run the returned `importCommand`, for example:

```bash
node coordination/content-qa/hjb-primary-question-illustrations-v1/generate-gpt-image2-candidates.mjs \
  --import-latest \
  --import-question-id hjb-primary-ds-v1-p1-001
```

Manual import from an explicit generated file is also supported:

```bash
node coordination/content-qa/hjb-primary-question-illustrations-v1/generate-gpt-image2-candidates.mjs \
  --import-source /Users/dongpinhu/.codex/generated_images/.../image.png \
  --import-question-id hjb-primary-ds-v1-p1-001
```

If a main candidate already exists, import preserves it as `questionId-v1.png`, `questionId-v2.png`, etc., and the newest candidate becomes `questionId.png`.

Rebuild review artifacts without generating or importing:

```bash
node coordination/content-qa/hjb-primary-question-illustrations-v1/generate-gpt-image2-candidates.mjs --rebuild-review
```

Generation order is fixed: `needs-regeneration` / failed rows first, then a 30-image A_required smoke batch with 2 rows per `visualCategory`, then the rest of A_required, then B_strong_recommended. Stop every 30 generated images for S18 review in `review/index.html` and `manual-review.csv`.

## OpenAI API Fallback Route

Real GPT Image2 generation requires an owner-approved `OPENAI_API_KEY` in the shell environment and budget approval. Do not write the key into project files, logs, reports, or screenshots.

```bash
OPENAI_API_KEY=... node coordination/content-qa/hjb-primary-question-illustrations-v1/generate-gpt-image2-candidates.mjs --tier A_required --limit 30 --resume --skip-existing
```

Defaults: `model=gpt-image-2`, `size=1024x1024`, `quality=medium`, `output_format=png`, `moderation=auto`, `concurrency=1`.

## Review

- Review page: `review/index.html`
- Review spreadsheet: `manual-review.csv`
- Manifest: `candidate-manifest.json`

S18 should check mathematical objects/counts/shape relations, age suitability, copyright safety, and text/rendering errors. Items needing exact labels, numbers, axis text, coordinates, prices, or clock numerals are marked `needsDeterministicOverlay=true` for later SVG/Canvas overlay.
