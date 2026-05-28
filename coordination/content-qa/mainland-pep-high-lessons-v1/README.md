# Mainland PEP High-School Generated Lesson Pack

This folder contains the approved generated教材 pack for the MAIS `MAINLAND_PEP_HIGH` curriculum track.

The current pack has S18/S09/S05 approval and is consumed by `data/mainlandPepHighLessons.ts` for Lesson-section integration.

## Files

- `generate-lessons.mjs`: deterministic generator using the committed safe RAG API.
- `validate-lessons.mjs`: schema/source-safety/bilingual/duplicate validator.
- `lessons.json`: aggregate machine-readable draft pack.
- `lessons/*.md`: human-readable lesson drafts.
- `index.md`: review inventory.
- `qa-report.md`: generated validation and review-status report.

## Regenerate

```bash
node coordination/content-qa/mainland-pep-high-lessons-v1/generate-lessons.mjs
node coordination/content-qa/mainland-pep-high-lessons-v1/validate-lessons.mjs
```
