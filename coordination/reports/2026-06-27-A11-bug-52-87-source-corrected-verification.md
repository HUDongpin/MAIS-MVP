# A11 Bug 52-87 Source-Corrected Existence Verification

- Date: 2026-06-27
- Agent: A11 QA and release quality
- Source checked: `/Users/dongpinhu/Downloads/Deliverables and Reporting - 6_26.docx`
- Scope requested: bugs 52 through 87
- Write scope used: `coordination/reports/`, `coordination/session-logs/`

## Source Correction

This pass uses the user-supplied 6/26 attachment, not the older `_Deliverables and Reporting_Template .docx` name recorded in the 2026-06-26 A11 note.

After rendering the DOCX to PDF/text, the attachment exposes 29 detailed bug cards after the prior 51-entry evaluation. If numbered continuously after those 51 entries, this source covers bugs 52-80 only. Bugs 81-87 are absent from this DOCX: there are no titles, steps, expected results, actual results, or evidence cards for those seven numbers.

## Verdict

- Confirmed current bugs: 5 entries: 52, 53, 55, 56, 64.
- Partially confirmed as a narrower current defect: 1 entry: 71.
- Not reproduced in the current local app: 21 entries.
- Not verifiable from the report because the exact input/artifact is missing: 2 entries: 72, 74.
- Absent from the supplied source: 7 entries: 81-87.

## Evidence Used

- Rendered `/Users/dongpinhu/Downloads/Deliverables and Reporting - 6_26.docx` with the local Documents tool, then extracted rendered PDF text from `.tmp/a11-docx-render-6-26/rendered.txt`.
- Ran the local Next dev server on `127.0.0.1:3138` with `HK_MATH_DB_DIR=.tmp/a11-bug-52-80-db`.
- Used Playwright DOM probes for `/about`, `/student/roadmap/primary`, `/student/roadmap/secondary`, `/student/roadmap`, `/practice`, `/student/lessons`, and the reported Visualization Lab routes.
- Used source inspection for the About game path, subway map geometry, grade data, and equation-balance zero-state rendering.

## Findings

| Bug | Report card | Status | A11 finding |
| --- | --- | --- | --- |
| 52 | About - Adventure Island routing | Confirmed | `/about` renders Adventure Island "Start Game" and locked copy as `span` elements, not clickable links/buttons. The Playwright probe found no `a` or `button` inside `#about-game-path`. Source: `components/home/AboutGamePathShowcase.tsx` uses spans for the preview/action text. |
| 53 | About - Fishing routing | Confirmed | Same About section issue for Fishing Master: the visible action/status text is non-clickable, so the routing behavior is missing. |
| 54 | Primary Subway - Road map scaling | Not reproduced as written | The card's expected/actual text appears copied from the About routing bug ("Button reroutes to adventure island" / "Text highlighted"). I did not reproduce a separate zoom-scaling bug. The real primary-map defect found in this area is the P6 geometry issue covered by bugs 55, 56, 64, and 71. |
| 55 | Primary Subway - Index label location | Confirmed | The route-index panel is 470 px wide from x=54 to x=524, but the primary P6 bottom-row entry is placed at x=498..542 and text x=520, pushing the P6 label to the edge/outside. |
| 56 | Primary Subway - A route not loaded properly in the map | Confirmed | `primaryGrades` has 7 entries (`K`, `P1`-`P6`) but `gradeXs` has only 6 coordinates. Browser evidence on `/student/roadmap/primary` showed P6-related SVG attributes containing `undefined`/`NaN`, including route path data. |
| 57 | Student Roadmap - Other user's progress when loading | Not reproduced | Logged in as demo Student Shirleen and loaded `/student/roadmap`; the route returned 200. I did not see collaborator/default-progress leakage in the sampled page text. |
| 58 | Primary Subway - Kindergarten button wrong map location | Not reproduced | The K button scrolls toward the K route cluster. The reported expectation says "top-left corner", but the current product behavior centers the selected grade route; no runtime failure was found for K. |
| 59 | Primary Subway - Primary 1 button wrong map location | Not reproduced | P1 button scrolls to the P1 route cluster. No invalid geometry for P1. |
| 60 | Primary Subway - Primary 2 button wrong map location | Not reproduced | P2 button scrolls to the P2 route cluster. No invalid geometry for P2. |
| 61 | Primary Subway - Primary 3 button wrong map location | Not reproduced | P3 button scrolls to the P3 route cluster. No invalid geometry for P3. |
| 62 | Primary Subway - Primary 4 button wrong map location | Not reproduced | P4 button scrolls to the P4 route cluster. No invalid geometry for P4. |
| 63 | Primary Subway - Primary 5 button wrong map location | Not reproduced | P5 button scrolls to the P5 route cluster. No invalid geometry for P5. |
| 64 | Primary Subway - Primary 6 button wrong map location | Confirmed | P6 is the real broken primary grade. Source calls `scrollToMapPoint(gradeXs[gradeIndex], ...)`; for grade index 6, `gradeXs[6]` is undefined. Browser evidence showed P6 center landing around a non-P6 map area and P6 route geometry emitted `NaN`/`undefined`. |
| 65 | Secondary Subway - Secondary 1 button wrong map location | Not reproduced | Secondary has exactly 6 grades and `gradeXs` has 6 coordinates. The S1 button scrolls to the S1 route cluster, with no invalid SVG attributes. |
| 66 | Secondary Subway - Secondary 2 button wrong map location | Not reproduced | S2 button scrolls to the S2 route cluster; no invalid geometry. |
| 67 | Secondary Subway - Secondary 3 button wrong map location | Not reproduced | S3 button scrolls to the S3 route cluster; no invalid geometry. |
| 68 | Secondary Subway - Secondary 4 button wrong map location | Not reproduced | S4 button scrolls to the S4 route cluster; no invalid geometry. |
| 69 | Secondary Subway - Secondary 5 button wrong map location | Not reproduced | S5 button scrolls to the S5 route cluster; no invalid geometry. |
| 70 | Secondary Subway - Subway buttons overlapping / S6 wrong location | Not reproduced | S6 button scrolls to the S6 route cluster and the secondary SVG did not emit invalid geometry. No secondary button overlap was found in this pass. |
| 71 | Primary Subway - Overlapping subway points | Partially confirmed | I did not prove a broad "overlapping points" condition, but the same primary P6 coordinate defect can break or collapse P6 route geometry. Treat this as a narrower A03-owned primary P6 map geometry bug, not a general all-primary overlap bug. |
| 72 | Practice arena - Improve suggestion answers | Not verifiable | `/practice` loaded, but the report does not include the exact handwriting stroke/image, question ID, OCR payload, or suggestion API response. The specific "14 vs 2" suggestion claim cannot be fairly reproduced from the card alone. |
| 73 | Lessons - AI Voice unavailable | Not reproduced | `/student/lessons` loaded with AI audio guide UI. Direct POST to `/api/lesson-audio` returned HTTP 200 with `audio/mpeg` locally. |
| 74 | Lessons - English fractional answer | Not verifiable | The report points to Unit 1 / Practice check / Question 3 and answer `2/9`, but does not provide a stable lesson slug or question ID. Source search did not identify a single current live item to validate. |
| 75 | Lessons - User Interface load | Not reproduced | Local `/student/lessons` loaded in about 5.8 seconds during the probe, close to the expected 5 seconds and far below the reported 30 seconds. |
| 76 | Visualization Lab - Module objects alignment | Not reproduced | The actual query route `/student/tools/visualizations?grade=S1&lab=us-ca-math-s1-chapter-03` returned 200. With sliders set through Playwright to 9/9, the lab rendered `9 = 9; diff = 0`, 22 marks, 18 token marks, and no invalid SVG attributes. |
| 77 | Visualization Lab - Module graphing values | Not reproduced | The reported S6 route returned 200, rendered `12-D.1 Function Analysis and Rates`, one visualization surface, five marks, and no invalid SVG attributes. |
| 78 | Visualization Lab - Module objects = 0 | Not reproduced | With S1 sliders set to 0/0 through Playwright, the lab rendered `0 = 0; diff = 0`, zero token marks, and two explicit empty markers. Source intentionally renders empty markers for zero-left/zero-right, so this is not a broken zero-state. |
| 79 | Visualization Lab - 3D Module loaded improperly/delay | Not reproduced in local headless smoke | The S5 3D route returned 200, rendered one canvas, one visualization surface, no "loading" state, and no invalid SVG attributes. Headless Chromium did log WebGL performance warnings, so a separate low-end-device performance pass may still be useful. |
| 80 | Visualization Lab - 3D Module improper animation | Not reproduced in local headless smoke | The S5 3D route rendered a canvas and controls; headless smoke cannot judge animation aesthetics fully, but it did not reproduce missing graph/controls or a stuck loading state. |
| 81 | No card in supplied DOCX | Absent from source | The 6/26 attachment does not contain an 81st bug card after continuous numbering from the first 51 entries. |
| 82 | No card in supplied DOCX | Absent from source | Same source absence. |
| 83 | No card in supplied DOCX | Absent from source | Same source absence. |
| 84 | No card in supplied DOCX | Absent from source | Same source absence. |
| 85 | No card in supplied DOCX | Absent from source | Same source absence. |
| 86 | No card in supplied DOCX | Absent from source | Same source absence. |
| 87 | No card in supplied DOCX | Absent from source | Same source absence. |

## Code Evidence Highlights

- About game path: `components/home/AboutGamePathShowcase.tsx` renders the Adventure/Fishing action text as spans, so `/about` has no clickable game-routing control for those cards.
- Primary map coordinate mismatch: `data/grades.ts` defines 7 primary grades, while `components/learning/SubwayNetworkMap.tsx` defines 6 `gradeXs` values and indexes them by grade index.
- Primary map affected call sites: P6 uses the missing `gradeXs[6]` in `getRoutePoints`, `jumpToGrade`, focused-grade calculations, and grade terminal rendering.
- Equation-balance zero state: `components/visualizations/ConfiguredVisualizationLab.tsx` intentionally renders empty markers when left/right values are zero and renders no token objects.

## Routing Recommendations

- A01-owned About surface, with A20/A04 game-route coordination: fix or clarify Adventure Island and Fishing Master routing from `/about` if the About cards are meant to launch those challenges.
- A03-owned roadmap surface: fix the primary P6 map coordinate model by aligning `gradeXs`, route index layout, mini-map, and grade jump behavior with all 7 primary grades.
- A04-owned Practice Arena and A15-owned adaptive/OCR suggestion behavior: require a captured handwriting input or API payload before treating bug 72 as real.
- A05-owned Lessons and A07/A12-owned audio/provider behavior: no AI voice outage reproduced locally; keep production/provider monitoring separate.
- A06-owned Visualization Lab: no S1/S6/S5 functional break reproduced; low-end 3D performance remains a possible optimization investigation, not confirmed as this report's bug.
- A10/A25-owned reporting intake: treat requested bugs 81-87 as source/report-quality issues unless the owner supplies another attachment containing those seven entries.

## Checks Not Run

- I did not test production `https://mais.hk`; this was a local current-checkout existence pass.
- I did not perform a visual screenshot diff or low-end-device 3D performance capture.
- I did not mutate a live learner's full Practice Arena attempt history.
- I did not verify bug 72 without the original handwriting artifact or bug 74 without a stable lesson/question ID.
