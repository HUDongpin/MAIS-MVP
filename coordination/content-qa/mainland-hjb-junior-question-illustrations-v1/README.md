# Mainland HJB Junior Question Image2 Production Package

Date: 2026-05-27  
Owner session: S18  
Scope: candidate-only GPT Image2 generation for current `MAINLAND_HJB` junior S1-S3 must-have question illustrations.

## Files

- `image2-generation-queue.jsonl` - 823 must-have generation rows from `gpt-image2-candidates.json`.
- `run-image2-generation.mjs` - resumable GPT Image2 generator using OpenAI Images API.
- `image2-generation-results.json` - generation status manifest.
- `manual-review.csv` - S18 QA decision sheet.
- `review/index.html` - local review gallery.
- `adopt-approved-image2-assets.mjs` - copies only approved rows into `approved/`.
- `approved-question-illustrations.json` - approved asset manifest for later integration planning.

## Commands

```bash
node coordination/content-qa/mainland-hjb-junior-question-illustrations-v1/build-image2-production-package.mjs
node coordination/content-qa/mainland-hjb-junior-question-illustrations-v1/run-image2-generation.mjs --phase pilot --dry-run
node coordination/content-qa/mainland-hjb-junior-question-illustrations-v1/run-image2-generation.mjs --phase all --dry-run
```

After S19/owner-approved credentials are present:

```bash
OPENAI_API_KEY=... node coordination/content-qa/mainland-hjb-junior-question-illustrations-v1/run-image2-generation.mjs --phase pilot
```

For cautious smoke testing:

```bash
OPENAI_API_KEY=... IMAGE2_LIMIT=1 node coordination/content-qa/mainland-hjb-junior-question-illustrations-v1/run-image2-generation.mjs --phase pilot
```

After reviewing generated images, set `qaStatus=approved` in `manual-review.csv`, then run:

```bash
node coordination/content-qa/mainland-hjb-junior-question-illustrations-v1/adopt-approved-image2-assets.mjs
```

## Defaults

- Model: `gpt-image-2`
- Size: `1536x1024`
- Quality: `high`
- Format: `png`
- Concurrency: `1`
- Minimum delay: `15000ms`
- Retries: `4`

## QA Rules

Allowed `qaStatus` values: `pending`, `approved`, `needs-regenerate`, `deterministic-redraw-needed`, `rejected`.

Generated images must not reveal final answers, copy textbook/exam layouts, include watermarks, or add unstated mathematical conditions.
