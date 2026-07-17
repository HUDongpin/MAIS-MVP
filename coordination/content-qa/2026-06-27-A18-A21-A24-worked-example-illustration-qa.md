# 2026-06-27 A18/A21/A24 Worked Example Illustration QA

## Scope

- Request: add a suitable illustration image under every unit worked example across all curriculum, including California curriculum.
- A05 surface: generic `LessonView` worked-example blocks plus California middle/high textbook pages.
- A21/A24 implementation: deterministic, original MAIS SVG illustration renderer for missing worked-example visuals; existing approved catalog images remain in use. California high-school exact-layer paths remain candidate metadata because the referenced public SVG files are absent in this checkout.
- A18 QA decision: `approved-for-integration-review` for the deterministic renderer and placement changes. Browser regression and release gates remain A11/A22-owned.

## Coverage Counts

| Surface | Worked-example units covered | Visual source |
| --- | ---: | --- |
| Generic lesson seeds in `productionLessonSeeds` | 490 | Approved catalog image where present; deterministic SVG fallback otherwise |
| California middle-school replacement textbook page | 15 | Deterministic SVG worked-example illustration |
| California middle-school original textbook page | 15 | Deterministic SVG worked-example illustration |
| California high-school textbook pages | 40 | Deterministic SVG worked-example illustration; candidate exact-layer paths retained in data for future restoration |

## Fallback Template Distribution

| Template | Lesson seed count |
| --- | ---: |
| ratio-rate-percent | 114 |
| geometry | 86 |
| modeling-review | 60 |
| coordinate-function | 48 |
| data-probability | 40 |
| counting | 36 |
| algebra | 33 |
| fraction | 24 |
| place-value | 18 |
| measurement-money-time | 18 |
| spatial-vector-trig | 14 |

## QA Checks

- Theme alignment: metadata classifier maps each worked-example topic/content to a domain visual template.
- Grade and age fit: metadata derives age band from the lesson topic grade where available, or the explicit California textbook grade.
- Source safety: all fallback visuals are original inline SVG primitives; no IXL/CDE/textbook screenshots, proprietary layouts, or source diagrams are copied.
- Exact-layer boundary: fallback visuals are conceptual support images and are not the sole answer source. California high-school candidate exact-layer metadata was not treated as a live asset because the referenced files are missing from `public/`.
- Accessibility: each fallback visual has SVG `role="img"`, a generated title, visible caption, and QA status data attributes.

## Remaining Gates

- A11 should run browser placement checks on representative lessons across HK, Mainland BNU, Mainland PEP high, US Florida, California K-5, and California middle-school pages.
- A22 should include the changed lesson routes in the next clean release slice before production deployment.
- A18 final human acceptance is still needed if the owner wants the fallback visuals to be treated as a full production art direction rather than integration-ready support visuals.

## Checks Run

| Check | Result |
| --- | --- |
| `npx tsx --test --test-name-pattern "worked-example illustration renderer|California textbook worked examples" lib/mvpReadiness.test.ts` | Pass: 2/2 focused QA tests |
| `npm run type-check` | Red from pre-existing unrelated A06 manim type drift and generated `tmp/`/`/var/folders` Next validator files referencing deleted `app/student/lessons/page.js`; no A05/A18/A21/A24 worked-example illustration errors remained after local fixes |
| `npm run test:mvp` | Red before execution from the same generated validator compile blockers |
| Playwright smoke, `/student/lessons/pep-high-s4-sets-logic` | Pass: generated worked-example figure present, `data-visual-kind="algebra"`, `data-age-band="upper-secondary"` |
| Playwright smoke, `/student/lessons/california-middle-school-textbook` | Pass for worked examples: 15 generated figures across 15 lessons; existing concept PNG 404s remain separate |
| Playwright smoke, `/student/lessons/california-high-school-textbook` | Pass for worked examples: 40 generated figures across 40 examples; no horizontal overflow on desktop or 390px mobile viewport. Existing chapter concept PNG 404s remain separate |

## Known Non-Slice Issues Observed

- California middle-school concept PNGs under `/lesson-illustrations/us-ca-middle-school/candidates/` are missing and produce 404s.
- California high-school chapter concept PNGs under `/lesson-illustrations/us-ca-high-school/` are missing and produce 404s.
- The repository root has broad unrelated dirty-tree drift; these changes should be reviewed as a narrow lesson-illustration slice before any A22 release work.
