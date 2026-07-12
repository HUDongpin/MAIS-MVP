# 2026-06-19 S11 Dashboard Roadmap Lesson Check

Session: S11 QA and release quality lead
Status: red with routed findings

## Scope

- Dashboard, progress, adaptive learning display.
- Student roadmap and learning path entry plus primary/secondary map controls.
- Student lesson/textbook pages, representative API payloads, images, teacher-guide hiding, and pollution text checks for HK, California, and Mainland PEP.

## Checks Run

- `PLAYWRIGHT_PORT=3911 PLAYWRIGHT_RUN_ID=s11-dashboard-progress-adaptive-20260619 npx playwright test tests/e2e/student-frontend.spec.ts --project=desktop-chrome --reporter=list -g "US adaptive page shows live California route|dashboard, progress, roadmap, lessons, resources, assessments, and messages render functional UI"`
  - Result: 1 failed, 1 passed. The outer process was interrupted after Playwright hung during shutdown; the test result summary and failure artifact were already emitted.
- Local diagnostic dev server on `http://127.0.0.1:3920` with live LLM provider env values overridden empty for this QA run.
- Inline Playwright diagnostic script against the local dev server for profile save, Signal bay export, progress, adaptive page, roadmap controls, representative lesson pages, and textbook pages.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3920 PLAYWRIGHT_RUN_ID=s11-ca-textbook-existing-20260619 npx playwright test tests/e2e/california-k5-textbook-lessons.spec.ts tests/e2e/california-middle-school-textbook-english-only.spec.ts tests/e2e/california-high-school-textbook-student-release.spec.ts --project=desktop-chrome --reporter=list`
  - Result: 4 passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3920 PLAYWRIGHT_RUN_ID=s11-mainland-lesson-existing-20260619 npx playwright test tests/e2e/mainland-pep-primary-lessons.spec.ts --project=desktop-chrome --reporter=list -g "serves all P1-S6 Mainland PEP lesson payloads|shows approved Mainland PEP junior Lesson illustrations|shows approved Mainland PEP primary Lesson illustrations"`
  - Result: 3 passed.

## Routed Findings

1. P1 - S15 adaptive semantics, with S04 question source and S02 display as consumers: US California P1 adaptive API returns a live `US_CA_MATH` topic but zero questions.
   - Evidence: `/api/adaptive-learning/next?grade=P1` returned 200, `topic.curriculumTrack = "US_CA_MATH"`, `topicId = "us-ca-math-p1-1-oa-add-subtract"`, `questions.length = 0`.
   - Existing focused spec failed at `tests/e2e/student-frontend.spec.ts:84`.
   - Static context: `data/usCaliforniaTopics.ts` has `californiaK5LiveContentStatus.practiceLive: false`, so P1 topics can be live while P1 practice questions are downlisted.
   - The page did not show the old "not open/unavailable" copy in the diagnostic run, but the adaptive route is not actionable because no questions are returned.

2. P1 - S03 roadmap: primary/secondary roadmap pages render 200 and expose Fit Map, zoom, grade buttons, full-screen controls, and Mini map, but SVG coordinate rendering is polluted by `undefined`/`NaN` and station detail interaction is unreliable.
   - Evidence from HK S3 diagnostic route sweep: `/student/roadmap/primary` and `/student/roadmap/secondary` each rendered their headings and controls.
   - Browser console captured 739 roadmap SVG errors, including `<path> attribute d: Expected number, "M undefined 250 L ..."`, `<circle> attribute cx: Expected length, "NaN"`, `<text> attribute x: Expected length, "NaN"`, and `<rect> attribute x: Expected length, "NaN"`.
   - Clicking visible `[data-station-key]` nodes did not keep a selected Minibus detail panel visible in the diagnostic script.
   - S01 navigation shell is not the observed owner: the landing page returned 200 and the links to `/student/roadmap/primary` and `/student/roadmap/secondary` were present.

3. P2 - S05 lesson/S18 content QA: California K lesson student UI hides teacher guide, but the authenticated student API payload still includes a `teacher-guide` block.
   - Evidence: `/api/lessons/us-ca-math-k-k-cc-count-sequence` returned `blockTypes = ["concept", "worked-example", "checklist", "practice", "extension", "teacher-guide"]`.
   - The student page did not visibly render "Teacher guide" in the checked route.
   - Recommendation: decide whether student API responses should redact teacher-only blocks, not just hide them in React.

4. P2 - S05 lesson/S18 content QA: California middle-school student textbook route is intentionally text-only and exposes internal QA wording.
   - Evidence: `/student/lessons/california-middle-school-textbook` rendered 0 `<img>` elements in the diagnostic script. Public assets exist under `public/lesson-illustrations/us-ca-middle-school/`, and image-capable review code exists in `components/lesson/CaliforniaMiddleSchoolTextbookPage.tsx`.
   - The student component includes visible package copy `S18 reviewed`.
   - Existing spec currently approves the text-only route: `california-middle-school-textbook-english-only.spec.ts` passed.
   - Recommendation: S05/S18 should confirm whether text-only is acceptable for the student release. If student illustrations are required, promote safe images from the review/image-capable surface and remove internal QA labels from student copy.

## Green Evidence

- S02 dashboard/progress: welcome/Learning course were covered by the passing focused student workflow; disposable profile/avatar save persisted (`avatarId = sigma`); Signal bay opened; Excel export downloaded `learning-analytics-S2.xlsx`; Progress page showed `Weekly learning activity` and `Mastery map`.
- S02/S15 display: California adaptive page no longer showed "This curriculum is not open in MAIS yet" or "Adaptive route unavailable for this course" in the diagnostic run, even though the API question set was empty.
- S05/S18 lessons: representative HK `linear-equations`, California K `us-ca-math-k-k-cc-count-sequence`, Mainland PEP primary, junior, and high lessons returned 200 API payloads and rendered student lesson titles, next item controls, lesson practice where expected, and no visible `undefined`/`NaN`/`OCR`/`source locator` pollution.
- S05/S18 Mainland PEP: existing broad spec passed for all P1-S6 Mainland PEP lesson payloads, representative pages, practice APIs, and approved primary/junior lesson illustrations.
- S05/S18 California: existing specs passed for high-school textbook student page with 60 images and no internal release labels, K-5 textbook lesson route, middle-school English-only route, and US practice beta copy.

## Not Run

- Full `tests/e2e/lesson-all.spec.ts` all-slug browser sweep.
- Mobile roadmap/lesson checks.
- Production or Vercel parity checks.
- Formal S18 math correctness approval beyond browser/API pollution and existing QA-gate specs.

## Handoff

- S15/S04 should repair or intentionally suppress US California K-5 adaptive question selection while K-5 practice remains downlisted.
- S03 should debug roadmap coordinate generation and selected-station/minibus detail behavior before the roadmap surface is treated as green.
- S05/S18 should decide whether student-facing California middle-school textbook pages must include illustrations and whether `S18 reviewed` belongs on student copy.
- S05/S12/S18 should decide whether teacher-guide blocks should be removed from authenticated student lesson API payloads.
