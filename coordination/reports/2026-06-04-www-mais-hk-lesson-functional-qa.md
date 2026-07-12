# www.mais.hk Lesson Functional QA

- Date: 2026-06-04 10:11 HKT
- Session: S11 QA and release quality
- Target: `https://www.mais.hk/lesson`
- Primary resolved guest lesson: `https://www.mais.hk/lesson/quadratic-functions`
- Scope: Live production functional QA for visible Lesson page behavior. No feature code was edited.

## Executive Summary

Most visible Lesson page functionality passed on production: guest routing, content rendering after the galaxy intro, language/theme controls, Learning Galaxy, visualization sliders, guest checklist/login gating, practice input modes, math keyboard, handwriting board, photo attach/remove, Nova Lens selection help, AI Tutor panel opening, navigation links, back-to-top, mobile layout, authenticated answer checking, Check all answers, and the 5/5 practice summary.

One confirmed P1 bug was found:

1. **P1-01: `Mark lesson complete` / `/api/lesson-progress` does not mark production lessons complete and can lower visible mastery.**
   A direct authenticated production API call with `action:"complete"` returned HTTP 200 but reported `status:"not-started"` and `mastery:0`. In the browser flow, the visible Lesson mastery changed from `49%` to `25%` after clicking `Mark lesson complete`.

## Coverage Matrix

| Area | Result | Evidence |
| --- | --- | --- |
| Guest `/lesson` entry | Pass | `/lesson` resolved to `/lesson/quadratic-functions` after the galaxy intro. |
| Lesson API payload | Pass | `GET /api/lessons/quadratic-functions` returned blocks: concept, worked-example, checklist, visualization, practice, extension; 10 linked practice questions; first 5 rendered on page. |
| Content/math render | Pass | No `.katex-error`; no `undefined` / `NaN` tokens observed after full load. |
| Language selector | Pass | English, Traditional Chinese, and Simplified Chinese states changed visible Lesson copy. |
| Theme toggle | Pass | Document dark class toggled and restored. |
| Learning Galaxy | Pass | Directory opened; 4 directory buttons and 1 module link observed. |
| Visualization | Pass | Three range sliders changed values: `1->1.1`, `-2->-1.9`, `-3->-2.9`; derived values remained visible. |
| Guest checklist | Pass | Checkbox toggled locally; completion stayed gated with login guidance. |
| Guest practice login gate | Pass | Selecting an answer enabled `Log in to check answers`; clicking showed login-required feedback instead of submitting. |
| Practice input modes | Pass | Textbox fill/reset, math keyboard, handwriting board, and photo attach/remove all worked. |
| Nova Lens text selection | Pass | Selection popover appeared with 4 quick-help buttons; guest help opened registration-required AI Tutor path without sending a live LLM prompt. |
| AI Tutor launcher | Pass | Floating AI Tutor button opened the panel; no prompt was submitted. |
| Navigation links | Pass | `/adaptive-learning`, `/visualization-lab`, `/practice?lesson=quadratic-functions`, `/learning-path`, `/login`, and `/register` returned 200. |
| Back to top | Pass | Scroll returned from page bottom to top. |
| Mobile layout | Pass | 390x844 guest viewport had `scrollWidth=390`, `clientWidth=390`, `overflow=0`; sliders and practice textbox were usable. |
| Authenticated answer checking | Pass | Disposable student answered first visible question individually and remaining 4 via `Check all answers`; all five `/api/attempts` returned 200 with `correct:true`. |
| Practice summary | Pass | Summary dialog showed `ACCURACY 100%`, `5/5 correct`, timing metrics, `Go to Practice Arena`, `Mistake Book`, and `Back to lesson`. |
| Lesson completion | **Fail P1** | See P1-01 below. |

## P1-01: Lesson Completion Does Not Persist Completed Status

### Status

Confirmed P1 on production.

### Impact

Students can click `Mark lesson complete`, but production does not persist a completed Lesson state. This breaks a core Lesson workflow and can actively reduce the visible mastery value, which undermines student progress tracking, dashboard/roadmap state, teacher/parent progress views, and adaptive follow-up signals.

### Direct API Reproduction

Using a disposable authenticated student account:

```bash
POST https://www.mais.hk/api/lesson-progress
Content-Type: application/json

{
  "slug": "quadratic-functions",
  "action": "complete",
  "checklistState": {
    "quadratic-functions-checklist-0": true
  }
}
```

Observed production response:

- HTTP status: `200`
- Returned lesson fields included `status:"not-started"` and `mastery:0`

Expected:

- HTTP status `200`
- Returned lesson should be completed, with mastery at least `85%`.

### Browser Reproduction

1. Register or log in as an S3 HK disposable student.
2. Open `https://www.mais.hk/lesson/quadratic-functions`.
3. Observe initial visible mastery: `Mastery: 49%`.
4. Tick the first checklist item.
5. Click `Mark lesson complete`.
6. Observe `/api/lesson-progress` returns `200`.
7. Observe returned lesson fields include `status:"in-progress"` and `mastery:25`.
8. Observe visible page changes to `Mastery: 25%`.

Expected:

- Completion should set completed status and visible mastery should increase to at least `85%`, not drop.

### Evidence Notes

- Current local workspace source in `lib/server/userStore.ts` appears to intend the correct behavior:
  `action === "complete"` maps to `status = "completed"` and mastery at least `85`.
- Live production behavior contradicts that local source, so this may be a stale deployment or a deployed server implementation/configuration mismatch.

### Suggested Owner

- Primary: S05 Lesson lead for user-facing Lesson completion behavior.
- Coordinate: S12 backend/API platform if production `/api/lesson-progress` implementation or deployment parity is the root cause.
- Coordinate: S22 release engineering if this is a stale/incorrect production deployment.

### Suggested Verification After Fix

1. Re-run direct production API check for `action:"complete"` and verify `status:"completed"` plus `mastery >= 85`.
2. Re-run browser check and verify visible text updates to `Mastery: 85%` or higher.
3. Re-open the lesson after reload and verify completed state persists.
4. Verify dashboard/roadmap/adaptive next-step state reflects the completed lesson.

## Watchlist

- The first page-side login setup can emit expected anonymous/pre-login 401s for `/api/me` and sometimes background Lesson calls before the session is established. After page-side login was established, the core progress update and attempts endpoints returned 200. Do not classify pre-login setup noise as a product bug without reproducing it in a normal user login flow.
- The production Lesson API returns 10 linked practice questions while the Lesson page renders the first 5. This matched the current page behavior and did not break the visible flow, but product owners may want to document whether the API is an internal pool or should match rendered count.
- Guest `/lesson` has a visible galaxy intro/loading phase. Automated checks should wait for `article[data-question-id]`, checklist, and visualization sliders before asserting full content.

## Checks Run

- Playwright CLI:
  - `open https://www.mais.hk/lesson`
  - `snapshot`
  - `console`
  - `requests`
- Node/Playwright browser automation against production:
  - Guest desktop functional matrix.
  - Guest Nova Lens selection flow.
  - Authenticated disposable-student Lesson progress and practice flow.
  - Mobile guest layout/input spot check at `390x844`.
- Direct production API checks:
  - `GET /api/lessons/quadratic-functions`
  - `POST /api/lesson-progress` with `action:"complete"`
  - `POST /api/attempts` through browser Lesson cards

## Checks Not Run

- Not run: local `npm run type-check` or `npm run build`; this was production QA/report-only work with no feature code edits.
- Not run: live LLM prompt submission; Nova Lens guest flow was verified through the registration-required path to avoid unnecessary live provider calls.
