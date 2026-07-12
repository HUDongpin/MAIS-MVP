# 2026-07-03 A11 Bug 167-202 Real Bug Verification

- Agent: A11, QA and release quality
- Source report: `/Users/dongpinhu/Downloads/20260703_Deliverable Bug and QA Report (1).docx`
- Scope: Bug rows 167-202, verified against the current local checkout in `/Users/dongpinhu/Desktop/MAIS-MVP`
- Caveat: This checkout is a dirty integration inventory, not clean-release proof. A read-only production smoke against `https://mais.hk` was attempted, but production login did not return before the bounded run was stopped, so the verdicts below are local-current verification results.

## Executive Verdict

- Total bug rows checked: 36
- Real/current bugs to keep open: 20
- Duplicate or inconsistent report row with the underlying issue already real: 1
- Not current or not reproduced locally: 15

## Per-Bug Verdicts

| Bug | Verdict | A11 verification evidence |
| --- | --- | --- |
| 167 | Not current | Logged-out `/about` now shows `Start` / `Ready` and no `In progress` or round progress state. Focused source regression also passed. |
| 168 | Real/current | Logged-out `/student/roadmap` returns `/api/me` 401 but still renders an S3 current-grade path and progress-looking stats. Current local values are 0%, not the older 31% shown in the report screenshot. |
| 169 | Not reproduced | `/student/roadmap/primary` renders K and P1-P6 labels/routes. `components/learning/subwayNetworkMapGeometry.test.ts` passed 3/3. |
| 170 | Not current | Signed-in Nova Tutor voice panel no longer says the learner must sign in. It shows provider setup status under the offline fixture profile. |
| 171 | Not reproduced | Student dashboard/progress APIs returned 200 locally; `/personalized-learning` did not show progress-unavailable text. |
| 172 | Not reproduced | Missing loading animation was not reproduced. Treat as a UX enhancement only if a moving progress bar is newly required. |
| 173 | Not reproduced | Student Jon `/personalized-learning` did not show the JSON parse error; dashboard and adaptive APIs returned 200 JSON. |
| 174 | Not reproduced | Student Jon and Student Peter `/dashboard` did not show the JSON parse error; `/api/dashboard` returned 200 JSON. |
| 175 | Not concrete/current | Teacher Scott `/teacher/classes` form had no body overflow and no Notes/Create overlap; measured gap was about 16 px. |
| 176 | Real/current | `/teacher/assignments?filter=grading` still displays the All assignments active state and "Showing 0 / 0 - All assignments". |
| 177 | Real/current | `/teacher/assignments?filter=returned` still displays the All assignments active state and summary. |
| 178 | Real/current | `/teacher/assignments?filter=correction-review` still displays the All assignments active state and summary. |
| 179 | Not current as reported | Nova slow-provider fallback can appear under offline/slow provider conditions, but the signed-in voice input no longer incorrectly says "sign in". |
| 180 | Not reproduced | `/api/lessons/us-ca-math-p5-5-oa-expressions-patterns` returned 200 and the lesson page rendered content locally. |
| 181 | Not reproduced | Lesson completion/check flow for the representative P5 lesson saved successfully; the stuck `Saving` state from the screenshot did not reproduce. |
| 182 | Real/current | The P1 measure-data lesson prompt asks for a ribbon/string model, but the generated worked-example visual is a data/probability display. |
| 183 | Real/current | The shape-reasoning prompt asks for two equal-share rectangles; the visual is a generic gridded rectangle/triangle representation. |
| 184 | Real/current | The join story asks for 4 red and 3 blue counters; the visual uses generic 7/3 counting objects. |
| 185 | Real/current | The bird addition story maps to a generic algebra/scale-style visual instead of the requested birds/fence/tree scene. |
| 186 | Real/current | The cube train join model uses generic counting circles instead of 6 green cubes and 2 yellow cubes. |
| 187 | Duplicate/inconsistent | The row reuses the Bug 186 route but describes a different book-page expected visual. It is not independently valid as written, but the route's worked-example visual mismatch is already real under Bug 186. |
| 188 | Real/current | The apple-basket join story renders generic counting objects instead of the basket/apple scene. |
| 189 | Real/current | The fish join story maps to a spatial/vector/trig visual instead of the expected fish representation. |
| 190 | Real/current | The balloon take-away story uses generic counting objects instead of balloon removal. |
| 191 | Real/current | The crackers subtraction story maps to a generic algebra/scale-style visual instead of crackers. |
| 192 | Real/current | The cube-train take-away prompt maps to a generic geometry visual. |
| 193 | Real/current | The sticker take-away story uses generic counting objects instead of sticker removal. |
| 194 | Real/current | The counter cross-out story renders generic counting without the requested cross-out/removal state. |
| 195 | Real/current | The shell break-apart subtraction story maps to a generic algebra visual instead of shells/box. |
| 196 | Not reproduced | P5 expressions-patterns lab at 5/5 had `overflowCount=0`; no clipping was detected locally. |
| 197 | Not reproduced as P0 | 3D/visualization routes rendered visible content/fallback controls locally. Device-specific performance may still deserve a separate pass. |
| 198 | Not reproduced as broad malfunction | The S3 direct visualization route returned 200 and rendered visible fallback/control content. |
| 199 | Real/current, minor visual | S4 visualization label placement has measurable overlap at extreme slider values; the exact "crooked" wording is subjective, but the placement issue is real. |
| 200 | Real/current, minor visual | S4 visualization values/labels produced an overlap pair at high slider values. |
| 201 | Not reproduced | P5 expressions-patterns lab at 0/0 displayed `0 = 0` and left/right value 0; the reported five linear objects were not reproduced. |
| 202 | Real/current performance | Saving a visualization session returned 200 but took about 26.1 s locally, above the expected under-5-second target. The local result was not over one minute. |

## Checks Run

- Extracted and rendered the DOCX report to inspect all bug rows and embedded screenshots.
- Ran focused regression/source tests:
  - `./node_modules/.bin/tsx --test tests/e2e/reported-bug-source-regressions.test.ts components/home/aboutGamePathShowcaseLinks.test.ts components/visualizations/configuredVisualizationLabRegressions.test.ts components/visualizations/visualizationDiagnostics.test.ts components/lesson/workedExampleIllustrationMetadata.test.ts components/lesson/lessonCompletionChecklist.test.ts app/dashboard/dashboardPagePerformanceBoundary.test.ts app/teacher/teacherNavigationPerformanceBoundary.test.ts`
  - Result: 87/87 passed.
- Ran roadmap geometry tests:
  - `./node_modules/.bin/tsx --test components/learning/subwayNetworkMapGeometry.test.ts`
  - Result: 3/3 passed.
- Ran local browser/API probes on `http://127.0.0.1:3149` with isolated `NEXT_DIST_DIR=.tmp/a11-bug167-202-next`, demo-user auth, and offline fixture tutor provider.

## Routing Notes

- A03/A08 or A01/A12 should own the logged-out roadmap state decision for Bug 168, depending on whether the fix is route gating, anonymous defaults, or progress display policy.
- A13/A11 should own Bugs 176-178 because they are teacher assignment filter behavior and regression coverage.
- A05/A18/A21/A24 should route Bugs 182-195 together as worked-example illustration fidelity, with Bug 187 treated as a duplicate/inconsistent report row.
- A06/A22 should route Bugs 199-200 and 202 as visualization layout/performance issues.
