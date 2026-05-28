# Mainland PEP Junior GPT Image2 Illustration Pipeline

This directory implements the S18/S10 offline asset-generation plan for the 2026-05-27 Mainland PEP junior illustration-needs audit.

## Flow

1. `node prepare-prompts.mjs`
   - Reads the S18 template-family and question CSVs.
   - Validates 20 core template families and 691 core questions.
   - Writes `prompts.json`, `prompts.csv`, and `manifest.json`.
2. `node generate-base-images.mjs --dry-run`
   - Reviews planned GPT Image2 calls without spending API credits.
   - Use `OPENAI_API_KEY=... node generate-base-images.mjs --live --limit=3` for a pilot after owner approval.
3. `node select-base-images.mjs --template=<id> --candidate=<1-3>`
   - Copies the approved candidate to `public/question-illustrations/mainland-pep-junior/base/<templateFamilyId>.png`.
4. `node render-question-overlays.mjs`
   - Renders deterministic overlays to `public/question-illustrations/mainland-pep-junior/questions/<questionId>.png` when approved base images exist.
5. `node audit-generated-images.mjs --allow-pending`
   - Writes `qa-report.md` and records the latest audit in `manifest.json`.

## Safety Notes

- The scripts do not modify source question-bank data or app rendering.
- Live OpenAI calls require `--live` and `OPENAI_API_KEY`; dry-run is the default.
- Candidate generation is capped at 3 images per template family.
- `gpt-image-2` bases use white opaque backgrounds because transparent-background requests are not supported for this model.
