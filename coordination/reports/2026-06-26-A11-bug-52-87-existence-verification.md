# A11 Bug 52-87 Existence Verification

- Date: 2026-06-26
- Agent: A11 QA and release quality
- Source: `_Deliverables and Reporting_Template .docx`
- Scope: Bug entries 52 through 87 only
- Write scope used: `coordination/reports/`

## Summary

Reviewed 36 reported entries, mapped from the first structured bug row after the 51-entry evaluation already present in `coordination/reports/2026-06-22-bug-description-evaluation-en.docx`.

- Confirmed current issues: 3 entries: bugs 55, 62, 65.
- Not reproduced / does not exist as reported in the current local checkout: 24 entries.
- Not verifiable as real bug claims because the rows lack actionable title, expected result, and actual result: 9 entries: bugs 79-87.

## Evidence

- Parsed the DOCX via OOXML text/media order. The first 51 raw report entries were excluded; the next 36 structured rows were treated as bugs 52-87.
- Ran local Next dev server on `127.0.0.1:3137` with isolated `.tmp/a11-bug-52-87-*` runtime paths and no provider secrets.
- Ran Playwright route/DOM probes for the affected visualization labs, Practice Arena, teacher routes, lesson completion API, and Adventure Island route.
- Ran direct answer-grading check: current grader accepts `90`, `90 degree`, `90 degrees`, and `90°` for stored answer `90`.
- Ran direct teacher resource upload smoke: `/api/teacher/resources` returned HTTP 201 with Teacher Scott.

## Findings

| Bug | Area | Status | A11 finding |
| --- | --- | --- | --- |
| 52 | S6 Visualization Lab UI design | Not reproduced | The S6 lab route hydrates to `12-D.1 Function Analysis and Rates` with marks/buttons. The report mixes P1/fraction wording with an S6 function URL, so the UI-design claim is not actionable as written. |
| 53 | P1 equation-balance buttons | Not reproduced | Lab loads with 13 marks, two sliders, and `Left side / Right side / Balance` buttons. Clicking each button toggles `data-viz-mode-active` correctly. |
| 54 | K teen-number buttons | Not reproduced | Lab loads with 10 marks, two sliders, and `Tens / Ones / Total` buttons. Clicking each button toggles active state correctly. |
| 55 | S1 probability percent display | Confirmed, narrow | The lab shows `P(success) = 5/9 = 0.56`; no percent sign is shown. This is real if the expected display is percentage notation rather than decimal probability. |
| 56 | P2 measure/money/time wrong values | Not reproduced | Clock/Money/Data modes load and switch; no invalid values were found in the DOM smoke. The report needs a concrete wrong-value example to prove a math bug. |
| 57 | S6 equation not shown | Not reproduced | S6 function lab renders function formula/graph marks. The row also mixes K/3-B.1 wording with an S6 route, so the claim is stale or misfiled. |
| 58 | K quadratic floor line | Not reproduced | Reported coefficient `0.33` cannot be selected; the slider clamps to min `1`, displaying `a=0.17`. Function path stays inside the graph frame. |
| 59 | K wave floor line | Not reproduced | Reported value rounds to slider value `6`, displaying `A=4.8`; function path stays inside frame. |
| 60 | K log roof line | Not reproduced | Reported value rounds to slider value `2`, displaying `k=0.4`; function path stays inside frame. |
| 61 | Practice questions not loading | Not reproduced | Student Shirleen `/practice` Start Mission path loads a five-question round; page text showed `QUESTION 1 OF 5` and no page errors. |
| 62 | Practice progress not saved | Confirmed display persistence issue | Attempts are posted to `/api/attempts`, but visible round/progress state is initialized from empty React state on mount (`completedAdaptiveQuestionIds`, `adaptiveAnswerResults`, `freeSelectionQuestionResults`) and `adventureProgressValue` is computed from that state, so a browser refresh drops the displayed round/progress state even if server-side attempts exist. |
| 63 | Teacher resource upload | Not reproduced | Teacher Scott upload POST returned HTTP 201; the resource route is functional locally. |
| 64 | `90 degrees` rejected | Not reproduced | Direct grader check accepted `90 degrees`, `90 degree`, and `90°` for answer `90`. |
| 65 | Adventure Island progress unsaved | Confirmed symptom | `/student/practice/games/adventure-island` currently shows `0 attempts`, `0% accuracy`, `+35 points`, and locked-state copy. Likely context/persistence handoff issue. |
| 66 | S6 angle/curriculum display | Not reproduced | Current S6 lab is function-family, not `mais-manim-angle-geometry`; the row appears to target the wrong module for the URL. |
| 67 | S4 squares ignore emphasis | Not reproduced | Squares mode renders colored leg/hypotenuse squares with nonzero opacity and active mode state. |
| 68 | S4 right-triangle size, a=9 b=9 | Not reproduced | Marks stay within the SVG canvas; hypotenuse square bounds were `x=174..354`, `y=38..218`. |
| 69 | S4 missing geometry values, a=7 b=7 | Not reproduced | Values render in DOM (`49 + 49 = 98`, `c = 9.9`) and marks are present. |
| 70 | S4 value placement overlap | Not reproduced | Default S4 squares mode renders expected marks/labels with no invalid text; screenshot-only overlap claim was not reproduced by DOM evidence. |
| 71 | S4 similarity placement, a=9 b=7 | Not reproduced | Similar triangle bounds were `x=438..582`, `y=136..248`, inside the SVG frame. |
| 72 | S4 selected button emphasis | Not reproduced | Mode buttons have distinct active states; source uses per-index active classes. |
| 73 | S4 circle angle A=180 overflow | Not reproduced | Exact 180-degree probe rendered angle ray and arc marks without invalid text; ray endpoint remained inside SVG coordinates. |
| 74 | Duplicate of 73 | Not reproduced | Same claim and duplicate screenshot as bug 73; same result. |
| 75 | S4 equal angles label overlap | Not reproduced | Compare A/B with A=72, B=72 renders combined equal-angle label `A&B`. |
| 76 | P1 cube-train value overlap | Not reproduced | 3 by 9 cube-train lab loads with 29 marks and expected `3 x 9 = 27` text; no invalid DOM state found. |
| 77 | P1 cube-train text alignment | Not reproduced | Area mode activates correctly and renders 22 marks including area highlight/outline. |
| 78 | S2 statistics value placement | Not reproduced | Mean `10` is accepted; mean marker is clamped inside graph (`data-viz-x=548`, raw x `562`) with no invalid text. |
| 79 | Lesson completion row | Not verifiable | Row is malformed: no title/expected/actual. The lesson route loads and completion POST returned 200 in smoke evidence. |
| 80 | Lesson completion row | Not verifiable | Same malformed `/student/lessons/us-ca-math-p1-1-oa-add-subtract` claim family; no actionable assertion. |
| 81 | Lesson completion row | Not verifiable | Same malformed lesson row; no actionable assertion. |
| 82 | Lesson completion row | Not verifiable | Same malformed lesson row; no actionable assertion. |
| 83 | Lesson completion row | Not verifiable | Same malformed lesson row; no actionable assertion. |
| 84 | Teacher assignments row | Not verifiable | Row lacks expected/actual. `/teacher/assignments?filter=grading` loads. |
| 85 | Teacher assignments row | Not verifiable | Same malformed teacher-assignment family; no actionable assertion. |
| 86 | Teacher assignments row | Not verifiable | Same malformed teacher-assignment family; no actionable assertion. |
| 87 | Teacher operations collaboration | Not verifiable | Row lacks expected/actual. `/teacher/operations/collaboration` loads. |

## Routing

- A04 should own a targeted mutating replay for bug 62.
- A20 should own the Adventure Island persistence/context handoff for bug 65, with A12 if backend persistence is involved.
- A06 should only revisit bug 55 if the product requirement is percent notation rather than decimal probability.
- A23/A25 should treat bugs 79-87 as report-quality defects rather than live app defects until the reporter supplies expected/actual behavior.

## Checks Not Run

- No full all-correct Practice Arena playthrough was run because it mutates student attempt state; bug 62's existence was confirmed from the current progress-state implementation instead.
- No screenshot-based visual diff was produced; DOM hooks and route text were used for this existence pass.
