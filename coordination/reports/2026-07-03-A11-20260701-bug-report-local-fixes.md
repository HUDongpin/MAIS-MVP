# A11 20260701 Bug Report Local Fix Handoff

- Agent: A11 QA and release quality lead, coordinating local fixes with A01/A02/A05/A06/A20-owned surfaces.
- Date: 2026-07-03 Asia/Hong_Kong.
- Scope: local dirty-root fix pass only. No deploy, staging, commit, branch, push, reset, or unrelated revert.
- Source report: `/Users/dongpinhu/Downloads/20260701_Deliverable Bug and QA Report.docx`.

## Fixed Locally

| Bug | Local result | Files |
| --- | --- | --- |
| 126 | `/student/assignments` now has a route loading shell and loading branch with final `My assignments` heading. Personalized Learning prefetches/prewarms the assignments route, and the `All assignments` CTA opens deterministically. | `app/student/assignments/loading.tsx`, `components/dashboard/StudentAssignmentsView.tsx`, `components/dashboard/AdaptiveLearningContent.tsx` |
| 127 | About curriculum top stat now routes to the public student roadmap. | `components/home/HeroSection.tsx`, `tests/e2e/home-functional.spec.ts`, `tests/e2e/reported-bug-source-regressions.test.ts` |
| 128/129 | About games top stat now routes directly to Adventure Island instead of generic Practice Arena. | `components/home/HeroSection.tsx`, `tests/e2e/reported-bug-source-regressions.test.ts` |
| 132 | California elementary lessons now keep the quick self-check completion checklist visible. | `components/lesson/lessonCompletionChecklist.ts`, `components/lesson/lessonCompletionChecklist.test.ts` |
| 134 | Fraction-bar shaded overlays now use unique SVG clip paths that match the rounded whole/equivalent bar outlines. | `components/visualizations/ConfiguredVisualizationLab.tsx`, `components/visualizations/configuredVisualizationLabRegressions.test.ts` |
| 137 | 3D labs now mark the progressive surface usable immediately when the 2D fallback/3D wrapper is mounted, while the real canvas readiness remains separately exposed. | `components/visualizations/ConfiguredVisualizationLab.tsx`, `components/visualizations/configuredVisualizationLabRegressions.test.ts` |

## Verification

- `npx tsx --test tests/e2e/reported-bug-source-regressions.test.ts components/lesson/lessonCompletionChecklist.test.ts components/visualizations/configuredVisualizationLabRegressions.test.ts`: 38 passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3037 PLAYWRIGHT_BROWSER_CHANNEL=chrome npx playwright test tests/e2e/reported-bug-regressions.spec.ts --project=desktop-chrome --grep "student assignments route|personalized learning All assignments"`: 2 passed.
- Local browser smoke on `/about` and `/student/lessons/us-ca-math-p1-1-oa-add-subtract`: curriculum href `/student/roadmap`, games href `/student/practice/games/adventure-island`, lesson checklist heading `Quick self-check`, checkbox count `3`.
- Local browser smoke on visualization labs: fraction clipping present for `bnu-primary-p5-lower-fraction-division`; 3D progressive surface for `pep-high-s4-plane-vectors` reported `data-viz-three-ready="true"` and `data-viz-three-canvas-ready="false"` during progressive load.

## Notes

- This is local-only evidence from `http://127.0.0.1:3037`; no production deployment was performed.
- A22-style generated-artifact dry run was executed before cleanup. To recover from local `ENOSPC`, generated caches `.next` and `.tmp/20260701-bug-verify-next` were removed; source files and Git state were not cleaned or reset.
- The root remains dirty with many unrelated owner/agent changes. This report only claims the focused bug-fix slice above.
