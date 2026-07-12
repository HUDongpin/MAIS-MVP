# A11 Student Regression Split

- Date: 2026-06-27
- Agent ID: A11
- Source run/artifacts:
  - `coordination/reports/2026-06-27-A11-bug-52-87-source-corrected-verification.md`
  - Local route probes from the A11 bug 52-80 source-corrected verification run
- Overall gate status: Red for confirmed About/primary-roadmap issues; Yellow for missing-source Practice/Lesson items; Green/not reproduced for the sampled Visualization Lab routes
- Summary: The current evidence should be routed as small owner packages. A11 should not treat the reported student gate as one broad fix bucket.

| Package | Owning agent | Failure cluster | Evidence | Suggested targeted command | Stop condition |
| --- | --- | --- | --- | --- | --- |
| A01 shell/auth | A01 + A20/A04 for actual game destinations | Bugs 52 and 53: About page Adventure Island and Fishing Master calls to action are visible text, not links/buttons. | A11 report found no `a` or `button` inside `#about-game-path`; source points to `components/home/AboutGamePathShowcase.tsx`. | `npx playwright test tests/e2e/home-functional.spec.ts --project=desktop-chrome` after A01/A20/A04 fix. | Stop if owner wants the About section to remain a non-clickable marketing preview instead of a launch surface. |
| A02 dashboard/progress/adaptive display | A02 + A15 only if later evidence appears | No confirmed dashboard/progress/adaptive display defect from the 52-80 source-corrected pass. | A11 source-corrected report did not route any confirmed item to A02. | Not applicable until a dashboard/adaptive display failure is reproduced. | Stop if a future red gate bundles dashboard semantics with adaptive engine behavior; split A02 display from A15 semantics. |
| A03 roadmap | A03 + A09 only if labels/copy are touched | Bugs 55, 56, 64, and narrower 71: primary P6 subway geometry is broken by seven primary grades sharing six `gradeXs` coordinates. | A11 report found `data/grades.ts` has K plus P1-P6 while `components/learning/SubwayNetworkMap.tsx` has six coordinates, causing P6 `undefined`/`NaN` geometry and misplaced index labels. | `npx playwright test tests/e2e/student-smoke.spec.ts tests/e2e/reported-bug-regressions.spec.ts --project=desktop-chrome --grep "roadmap|subway|P6"` if/when matching tests exist; otherwise add focused A03 source/browser coverage inside the A03 package. | Stop if fixing P6 requires redesigning the whole primary map layout or changing grade taxonomy beyond A03 scope. |
| A04 Practice Arena | A04 + A15 when adaptive/OCR suggestion semantics are involved | Bug 72: handwriting suggestion claim is not verifiable from the report alone. | A11 report says exact handwriting stroke/image, question ID, OCR payload, or suggestion API response is missing. | No regression command until artifact is supplied. With artifact, route to A04 source test plus targeted Practice Arena Playwright. | Stop until owner supplies the original handwriting artifact/question ID or an API payload. |
| A05 lessons/textbooks | A05 + A07/A12 for audio/provider; A18/A21/A23 when content packages are involved | Bug 73 not reproduced; bug 74 not verifiable without stable lesson/question ID. | A11 local `/student/lessons` probe showed AI audio UI and `/api/lesson-audio` returned HTTP 200 `audio/mpeg`; fractional answer issue lacks stable source. | For audio monitoring after provider changes: `npx playwright test tests/e2e/lesson-ai-selection.spec.ts --project=desktop-chrome`. For content answer issue, no command until lesson/question ID is supplied. | Stop if live provider credentials or production-only state would be required without A19/A22 coordination. |
| A06 Visualization Lab | A06 | Bugs 76-80 were not reproduced in local headless smoke; low-end 3D performance remains possible but unproven. | A11 report: S1 equation balance, S6 graphing, and S5 3D routes returned 200 with expected surfaces and no invalid SVG attributes; headless Chromium logged WebGL performance warnings. | `npx playwright test tests/e2e/visualization-values.spec.ts tests/e2e/production-visualization-values.spec.ts --project=desktop-chrome` after A06 closure slice; add low-end performance capture only if owner requests. | Stop if the owner wants device-specific performance QA; route to A06/A22 with a specified device/profile. |
| A09 copy/accessibility selectors | A09 with the owning feature session | No standalone A09 selector/copy defect confirmed. | A11 report routes labels/selectors only as supporting ownership if A01 or A03 changes visible labels. | Run affected owner package checks after copy/accessibility edits. | Stop if a copy-only fix would change product behavior. |
| A15 adaptive semantics | A15 + A02/A04 when UI surfaces consume adaptive state | Only potential linkage is bug 72 if the handwriting/OCR suggestion uses adaptive answer semantics. | Missing artifact prevents fair reproduction. | No command until artifact is supplied; then run A15 adaptive tests and A04 Practice Arena targeted checks. | Stop until the input artifact/API payload exists. |

## Cross-Package Blockers

- Bugs 81-87 are absent from the supplied 6/26 source document and cannot be routed without another source.
- Bug 72 needs original handwriting/OCR evidence before A04/A15 can reproduce.
- Bug 74 needs a stable lesson slug and question ID before A05/A18 can evaluate content correctness.
- A06 low-end 3D performance needs an explicit device/browser profile if the owner wants to pursue it.

## Checks To Rerun After Fixes

- A01/A20/A04 About routing: home/about route Playwright smoke plus game destination smoke.
- A03 primary P6 roadmap: targeted roadmap source test plus browser route check for K, P1-P6 geometry and jump behavior.
- A04/A15 handwriting suggestion: artifact-specific Practice Arena/API regression after artifact is supplied.
- A05/A07/A12 lesson audio: targeted lesson audio/provider smoke only when provider route or UI changes.
- A06 visualization: visualization values/overlap/persistence checks after A06 closure slice.

## Owner Decisions Needed

- Confirm whether `/about` should launch Adventure Island and Fishing Master or remain non-clickable.
- Provide missing source cards for bugs 81-87 if those should be routed.
- Provide exact handwriting/question artifact for bug 72.
- Provide exact lesson slug/question ID for bug 74.
- Decide whether low-end 3D Visualization Lab performance should become a dedicated A06/A22 package.

