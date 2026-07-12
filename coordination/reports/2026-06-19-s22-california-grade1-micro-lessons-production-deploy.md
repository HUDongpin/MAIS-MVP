# S22 California Grade 1 H/L Micro-Lessons Production Deploy

Date: 2026-06-19 HKT

Responsible session: S22 production reliability and release engineering.

## Scope

- Release slice for the 12 California Grade 1 addition/subtraction micro-lessons:
  - `1-H.1` through `1-H.6`
  - `1-L.1` through `1-L.6`
- Runtime overlay files:
  - `data/usCaliforniaLessons.ts`
  - `data/usCaliforniaTopics.ts`
  - `data/usCaliforniaMicroLessons.ts`
- Excluded from runtime publish:
  - `coordination/`
  - `tests/`
  - session logs
  - candidate QA package artifacts
  - local and secret files

## Clean Slice

- Base: `.tmp/vercel-staging/ca-k5-clean-slice-20260619`
- New slice: `.tmp/vercel-staging/ca-grade1-micro-lessons-clean-slice-20260619T131407Z`
- File count: 3017
- Size: 674M
- Forbidden path scan: no `.env`, `.env.local`, `.git`, `coordination/`, `.local/`, or `node_modules/` paths found.
- Micro-lesson code scan: 12 codes found, first `1-H.1`, last `1-L.6`.

## Verification

- Root targeted lesson tests: pass, 4/4.
- Root S11 route regression: pass, 1/1.
- Root `npm run type-check`: pass.
- Root `npm run build`: pass, 141 pages.
- Clean slice `npm run build`: pass, 141 pages.
- Clean slice `npm run type-check`: not accepted as a release gate for this slice because historical `lib/*QuestionBank.test.ts` files reference coordination/scripts dependencies intentionally excluded from the clean runtime slice.

## Deployment Evidence

- Command: `vercel deploy .tmp/vercel-staging/ca-grade1-micro-lessons-clean-slice-20260619T131407Z -y --prod --scope peter-dongpin-hu-s-projects --project mais-mvp --no-wait`
- Deployment ID: `dpl_AVqXfXQEAsqZU27KDbRQ2PBCeMNN`
- Deployment URL: `https://mais-blmmn42us-peter-dongpin-hu-s-projects.vercel.app`
- Final inspect status: Ready
- Production aliases verified by `vercel inspect`:
  - `https://www.mais.hk`
  - `https://mais.hk`
  - `https://mais-mvp.vercel.app`
  - `https://mais-mvp-peter-dongpin-hu-s-projects.vercel.app`
  - `https://mais-mvp-hudongpin-7372-peter-dongpin-hu-s-projects.vercel.app`

## Release Decision

Published. The release used a clean runtime slice rather than the dirty root workspace.
