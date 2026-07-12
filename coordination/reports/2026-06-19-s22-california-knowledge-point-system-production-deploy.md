# S22 California Knowledge-Point System Production Deploy

Date: 2026-06-19 HKT

Responsible sessions:

- S18 curriculum QA and source-safety.
- S05 live lesson integration.
- S11 route regression.
- S22 production reliability and release engineering.

## Scope

- Updated live California math curriculum titles to use MAIS knowledge-point display titles.
- Covered 76 current live California lesson seeds across K, P1-P6, and S1-S6.
- Kept official California/Common Core standard identifiers separate in standard/coverage metadata.
- Runtime overlay files:
  - `data/usCaliforniaKnowledgePoints.ts`
  - `data/usCaliforniaTopics.ts`
  - `data/usCaliforniaLessons.ts`
- Regression-only file:
  - `data/usCaliforniaLessons.test.ts`
  - `tests/e2e/california-k5-textbook-lessons.spec.ts`

## Title System

- Example elementary titles:
  - `K-A.1 Kindergarten Counting and Cardinality: Count Sequence`
  - `1-H.1 Picture Join Stories to Ten`
  - `5-E.1 Grade 5 Geometry: Coordinate Shapes`
- Example middle/high titles:
  - `6-A.1 Ratios, Rates, and Percent Reasoning`
  - `8-D.1 Pythagorean Reasoning and Coordinate Geometry`
  - `12-E.1 Capstone Modeling`

## Verification

- Targeted CA data regression: pass, 5/5.
- `npm run type-check`: pass.
- `npm run test:question-bank`: pass, 75/75.
- Focused CA Playwright route regression: pass, 2/2.
- Root `npm run build`: pass, 141 pages.
- Clean slice `npm run build`: pass, 141 pages.

## Clean Slice

- Base: `.tmp/vercel-staging/ca-grade1-micro-lessons-clean-slice-20260619T131407Z`.
- New slice: `.tmp/vercel-staging/ca-knowledge-point-system-clean-slice-20260619T134255Z`.
- Forbidden path scan: no `.env`, `.env.local`, `.git`, `coordination/`, `.local/`, or `node_modules/`.
- File count after removing inherited `.next`: 3018.
- Size after removing inherited `.next`: 674M.

## Deployment Evidence

- Command: `vercel deploy .tmp/vercel-staging/ca-knowledge-point-system-clean-slice-20260619T134255Z -y --prod --scope peter-dongpin-hu-s-projects --project mais-mvp --no-wait`
- Deployment ID: `dpl_9PQAYFexX62mobnxFRZwPoEZyyAv`
- Deployment URL: `https://mais-rm0iyc5ic-peter-dongpin-hu-s-projects.vercel.app`
- Final inspect status: Ready
- Production aliases verified:
  - `https://www.mais.hk`
  - `https://mais.hk`
  - `https://mais-mvp.vercel.app`
  - `https://mais-mvp-peter-dongpin-hu-s-projects.vercel.app`
  - `https://mais-mvp-hudongpin-7372-peter-dongpin-hu-s-projects.vercel.app`

## Residual Notes

- Deployment used a clean runtime slice, not the dirty root workspace.
- No Git staging, commit, branch, push, reset, or cleanup was performed.
