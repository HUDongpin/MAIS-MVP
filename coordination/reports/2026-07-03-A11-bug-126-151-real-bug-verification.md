# 2026-07-03 A11 Bug 126-151 Real Bug Verification

- Agent: A11 QA and release quality lead.
- Source report: `/Users/dongpinhu/Downloads/20260702_Deliverable Bug and QA Report.docx`.
- Scope: verify whether Bugs 126-151 are real in the current `/Users/dongpinhu/Desktop/MAIS-MVP` checkout.
- Evidence source: current dirty integration inventory plus targeted local browser/API/source checks.
- Important release caveat: this is not clean-release or production-deploy proof. A25 dirty-tree intake found 3673 expanded status entries, so these verdicts are scoped to the current dirty root.
- Initial verification produced no code fixes, Git operations, staged files, commits, pushes, or secret values. A follow-up fix pass was then completed for the seven real bugs listed below; no Git staging/commit/push operations were performed.

## Executive Verdict

26 bug cards were checked.

- Real bugs: 7.
- Partial or needs focused follow-up: 2.
- Not reproduced as reported: 17.

Real bugs:

- Bug 127: Adventure Island entry after a correct 5-question round.
- Bug 138, 139, 140: Teacher assignment filters do not actually switch the active queue.
- Bug 142: Lesson AI audio readiness is too slow in the local provider path.
- Bug 143: Lesson answer options start lowercase.
- Bug 145: P5 worked-example visual is a generic algebra visual instead of the expected concrete group model.

Partial/follow-up:

- Bug 130: class creation works through the backend and after hydrated UI, but the form can fail if clicked before hydration.
- Bug 141: tied to Adventure Island progression; the reported 10-star expectation was not proven, but the post-round progression surface is not healthy because Bug 127 lands in locked state.

## Per-Bug Verdicts

| Bug | Verdict | Owner routing | Evidence |
| --- | --- | --- | --- |
| 126 | Not reproduced | A02/A15 | Personalized Learning showed animated `adaptive-galaxy-route-dash` loading; dashboard and adaptive APIs returned 200. |
| 127 | Real | A20/A12 | After 5/5 Practice Arena answers, CTA opened `/student/practice/games/adventure-island`, user stayed authenticated (`/api/me=200`), but stage phase was `locked`; local cold navigation took about 38s. |
| 128 | Not reproduced | A13 | `New assessment` link exists and reached `/teacher/assessments/new` with builder/new-assessment text. |
| 129 | Not reproduced | A13 | `New lesson kit` link exists and reached `/teacher/lesson-kits/new` with new/builder text. |
| 130 | Partial | A13/A12 | Direct authenticated `POST /api/teacher/classes` returned 201 and hydrated UI creation returned 201. A fast click before hydration fell through to a GET query-string submit and failed. |
| 131 | Not reproduced | A13/A12 | After logging out from Teacher Scott and logging in as Teacher Rhi, teacher shell showed Teacher Rhi and not Teacher Scott. |
| 132 | Not reproduced | A02 | `/api/dashboard?grade=P1` returned 200 with dashboard payload for Student Jon. |
| 133 | Not reproduced | A02/A15 | Personalized Learning loaded with dashboard 200 and adaptive-next 200, with no visible load error. |
| 134 | Not reproduced | A03 | Public primary roadmap showed labels K, P1, P2, P3, P4, P5, P6 and no bad SVG attributes. |
| 135 | Not reproduced | A03/A12 | Logged-out `/api/me` returned 401; primary roadmap did not show personal mastery/current-grade UI. |
| 136 | Not reproduced | A13 | Teacher class form had body horizontal overflow 0 and no compact-label overflow. |
| 137 | Not reproduced | A13 | Teacher assessments page had body horizontal overflow 0 and visible Actions header. |
| 138 | Real | A13 | `?filter=grading` URL was set, but active queue stayed null and page still showed `All assignments`. |
| 139 | Real | A13 | `?filter=correction-required` URL was set, but active queue stayed null and page still showed `All assignments`. |
| 140 | Real | A13 | `?filter=correction-review` URL was set, but active queue stayed null and page still showed `All assignments`. |
| 141 | Partial | A04/A20 | The report's exact 10-star expectation was not captured; source and Bug 127 evidence show this progression surface needs follow-up. Current design appears to use a 30-total progress model. |
| 142 | Real | A07/A19/A05 | Play audio button was visible; a short authenticated `/api/lesson-audio` readiness request returned 200 but took 35.6s. |
| 143 | Real | A05/A09 | First visible P5 lesson practice option texts were `yes`, `no`, `always`, `not enough information`; all start lowercase. |
| 144 | Not reproduced | A05/A08 | First P5 lesson practice question submitted with the known correct answer and returned attempt status 200, correct true. |
| 145 | Real | A05 | P5 worked example `(7 + 2) x 4` had generated visual kind `algebra`; report expected a concrete four-group/squares-circles model. |
| 146 | Not reproduced | A06 | Equation-balance tokens have `data-viz-fit-contract="pan-contained"`; reported-bug source regression passed. |
| 147 | Not reproduced | A06 | Equation-balance zero state renders empty markers rather than left/right tokens; source shows zero token path. |
| 148 | Not reproduced | A06 | Fraction-bar parts are clipped to the whole/equivalent bars via SVG clip paths; no source evidence of 2/2 overflow. |
| 149 | Not reproduced | A06/A08 | Report row repeats Bug 148 clipping wording. Mark-explored module IDs and card/page contracts passed visualization diagnostics; API route persists `moduleId`, `topicId`, `source`. |
| 150 | Not reproduced | A06 | Lab tiles use centered text, `line-clamp-4`, `break-words`, `overflow-wrap:anywhere`, and stable min-height sizing. |
| 151 | Not reproduced | A06 | Same tile contract as Bug 150 for K count-sequence lab; no source/layout contract break found. |

## Checks Run

- DOCX text/image/table extraction from `/Users/dongpinhu/Downloads/20260702_Deliverable Bug and QA Report.docx`.
- `npm run release:dirty-map -- --reason "A11 bug 126-151 verification baseline 2026-07-03" --run-id A11-bug-126-151-20260703`.
- Local isolated Next dev server on `http://127.0.0.1:3147` with `NEXT_DIST_DIR=.tmp/a11-bug-126-151-next`, demo auth, offline AI tutor fixture.
- Browser/API probes for Student Jon, Student Peter, Teacher Scott, and Teacher Rhi demo accounts.
- Direct class API verification: authenticated `POST /api/teacher/classes` returned 201 and subsequent GET included the created class.
- Hydrated teacher class UI verification: waited for network idle, submitted form, observed `POST /api/teacher/classes 201` and created class visible.
- `./node_modules/.bin/tsx --test tests/e2e/reported-bug-source-regressions.test.ts` passed 17/17.
- `./node_modules/.bin/tsx --test components/visualizations/visualizationDiagnostics.test.ts components/visualizations/visualizationLabPageRegressions.test.ts components/visualizations/visualizationControlSemantics.test.ts` passed 43/43.

## Fix Update

Fixed real bugs in the current dirty-root slice:

- Bug 127, A20-owned Adventure Island: Practice Arena now stores the completed five-question `PublicQuestion` snapshot with the unlock payload. Adventure Island prefers those stored round questions before the slow topic question fetch and renderer failures no longer demote a verified unlock back to `locked`.
- Bugs 138-140, A13-owned teacher assignments: the no-class fast path now normalizes and passes `activeFilter` plus zero queue counts, so `grading`, `correction-required`, and `correction-review` links do not fall back to `All assignments`.
- Bug 142, A07/A05-owned lesson audio: dynamic lesson audio now starts a bounded browser speech fallback after 2.2s if provider MP3 streaming/chunk loading has not produced first audio, aborting the slow provider attempt so the UI does not sit in loading past the reported threshold.
- Bug 143, A05/A09-owned lesson/practice option text: multiple-choice display text now capitalizes simple English answer options while leaving math expressions unchanged.
- Bug 145, A05-owned worked-example visual: upper-primary grouped expressions like `(7 + 2) x 4` now classify as a concrete counting model, preserve the grouped-expression focus text, and render four equal groups with square/circle counters.

Fix verification:

- `npx tsx --test app/teacher/teacherNavigationPerformanceBoundary.test.ts app/practice/practiceArenaPageRegressions.test.ts components/gamification/adventureIslandGamePersistence.test.ts components/practice/practiceOptionDisplayText.test.ts components/lesson/workedExampleIllustrationMetadata.test.ts components/lesson/lessonAudioFallback.test.ts` passed 24/24.
- `npm run type-check` remains red only in pre-existing A06 visualization/manim review-package tests; no printed error referenced the A13/A20/A07/A05 files changed in this fix pass.

## Limitations

- The current repository root is very dirty; A22 release conclusions must still come from a clean worktree, reviewed slice, clean clone, or pruned staging directory.
- A22-owned local visualization browser compilation hit `ENOSPC` while compiling the route. I stopped the A11 dev server and removed only the A11-owned temp cache/DB. Bugs 146-151 therefore rely on source and regression evidence rather than fresh screenshots.
- I did not mutate production `https://mais.hk`.
