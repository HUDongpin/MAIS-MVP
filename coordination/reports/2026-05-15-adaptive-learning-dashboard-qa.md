# Adaptive Learning Progress Dashboard QA

- Date: 2026-05-15
- Session ID: S11
- Workstream: QA and release quality
- Status: Completed; parent UI blocker resolved after clean rebuild
- Scope: Student, teacher, and parent validation of Adaptive Learning Progress visibility, consistency, and explainability.

## Executive Result

Adaptive Learning Progress is substantially implemented for the student adaptive page and teacher analytics surfaces, and the cross-role data APIs are consistent in an isolated QA database. The main product gap is naming/surface placement: the student `/dashboard` does not embed the Adaptive Learning Progress panel; the complete panel is on `/adaptive-learning`.

Parent data APIs passed, and a 2026-05-16 clean rebuild resolved the previous parent UI route blocker. `/parent`, `/parent/children/student-peter`, and `/parent/reports` now pass the desktop parent-console regression after regenerating `.next`.

## 2026-05-16 Resolution Update

- S12/S11 stopped the active MAIS-MVP Next dev process, removed generated build output `.next/` and `.tmp/e2e/`, then rebuilt from source.
- `npm run build` passed from a clean `.next`; the previous `lib/server/userStore.ts:4671` error did not reproduce.
- Build artifacts were regenerated successfully: `.next/BUILD_ID`, `.next/routes-manifest.json`, and `.next/server/pages/_document.js`.
- Parent console Playwright regression passed on desktop Chrome: 5/5 tests.
- No source files were changed; the issue is classified as stale/corrupt Next generated output from an interrupted or inconsistent runtime state.

## Student Results

- `/dashboard` passed for student overview: visible `Welcome back, Student Peter`, grade, overall mastery, profile/motivation surfaces.
- `/dashboard` gap: it does not show `Adaptive engine`, `Skill mastery map`, or the full Adaptive Learning Progress panel.
- `/adaptive-learning` passed: visible `Live analytics`, `Adaptive engine`, `Recommended focus`, `Engine status`, `Target snapshot`, `Due reviews`, `Skill mastery map`, `Teacher-assigned work`, analytics report, grade topics, and progress details.
- Unauthenticated `/adaptive-learning` passed: UI shows `Log in to view adaptive recommendations`; API `GET /api/adaptive-learning/next?grade=s3` returned `401`.
- Practice update check passed in local dev data: submitting 5 adaptive question attempts changed adaptive evidence from `Attempts: 47` to `Attempts: 52`, and student dashboard accuracy moved from `22%` to `21%`.

Final isolated API evidence with LLM env disabled:

| Surface | Result |
| --- | --- |
| `GET /api/dashboard?grade=s3` | `200`, overall mastery `31`, weak topics: Trigonometry Basics `0`, Circles `0`, Quadratic Patterns `49` |
| `GET /api/adaptive-learning/next?grade=s3` | `200`, action `repair`, skill `Polynomials foundation`, confidence `thin`, engine `deterministic`, LLM status `disabled`, skill map count `12` |

## Teacher Results

- `/teacher` passed: visible `Teacher dashboard`, `Today’s teaching queue`, `Needs attention`, `Class learning status`, `Mastery heatmap`, and `Action queue`.
- `/teacher/analytics` passed: visible `Learning analytics`, `Average mastery`, `At-risk students`, `Topic mastery heatmap`, `Student risk list`, `Intervention groups`.
- `/teacher/students/student-peter` passed: visible `Student Peter`, `Mastery`, `Progress`, `Assignments`, `Mistakes`, `Recent attempts`.
- Teacher API passed: `GET /api/teacher/dashboard` returned `200`.

Teacher data evidence:

| Surface | Evidence |
| --- | --- |
| S3A class summary | average mastery `31`, at-risk students `1` |
| Heatmap | Polynomials `74`, Quadratic Patterns `49` with `1/1` weak student |
| Student detail | Student Peter mastery `31`; progress shows Trigonometry Basics `0`, Circles `0`, Quadratic Patterns `49`, Polynomials `74` |

## Parent Results

- Parent APIs passed:
  - `GET /api/parent/children/student-peter/summary` returned `200`.
  - Parent child average mastery is `31`, matching student/teacher aggregate direction.
  - Support topics include Quadratic Patterns `49`, matching the teacher weak-topic heatmap.
  - Latest parent report preview exists with report average mastery `68` and suggested practice items.
- Parent auth boundaries passed:
  - Anonymous child summary returned `403`.
  - Unknown/unlinked child summary returned `404`.
  - Parent access to `GET /api/teacher/dashboard` returned `403`.
- Parent UI routes now pass after clean rebuild:
  - `/parent` renders the family learning hub / home-school overview.
  - `/parent/children/student-peter` renders support topics, latest parent report, and recent assignments.
  - `/parent/reports` renders teacher-published summaries.
  - The earlier 500s were tied to missing/stale `.next` artifacts, not parent API data.

## Findings

1. `P1` Dashboard placement gap: Adaptive Learning Progress is implemented on `/adaptive-learning`, but not embedded in `/dashboard`.
   - Product impact: if the requirement means the student Dashboard itself must carry the Adaptive Learning Progress panel, current implementation is incomplete.
   - Suggested owner: S02 with S15 coordination.

2. `Resolved P1` Parent UI QA blocker cleared by clean rebuild.
   - Parent APIs and parent UI browser regression now pass.
   - No parent UI source changes were required.

3. `Resolved P1` Clean `npm run build` passes.
   - The previous `lib/server/userStore.ts:4671:51` failure did not reproduce after removing `.next/` and rebuilding.
   - Keep an eye on this area if the provisioning helper is touched again, but no source patch is needed now.

4. `P2` Initial dev server instability affected long browser runs.
   - Observed Next dev Fast Refresh/runtime artifact loss after repeated route/API compilation.
   - This may be a local generated-output state issue, but it prevented stable parent route verification.

## Acceptance Criteria Status

| Criterion | Status |
| --- | --- |
| Student sees full adaptive recommendation, skill map, review queue, evidence | Pass on `/adaptive-learning`; gap on `/dashboard` |
| Teacher sees student/class mastery, risks, intervention signals | Pass |
| Parent sees child mastery, support topics, report summary | Pass after clean rebuild |
| Three roles show consistent mastery/support direction | Pass via isolated APIs: student `31`, teacher S3A `31`, parent child `31`; Quadratic Patterns appears as weak/support topic |
| Unauthorized access does not leak progress | Pass for adaptive, teacher dashboard, parent child summary |

## Checks

| Check | Result |
| --- | --- |
| Browser QA: student `/dashboard` and `/adaptive-learning` | Pass with dashboard placement gap |
| Browser QA: teacher `/teacher`, `/teacher/analytics`, `/teacher/students/student-peter` | Pass |
| Browser QA: parent `/parent`, `/parent/children/student-peter`, `/parent/reports` | Pass via `tests/e2e/parent-console.spec.ts` desktop regression |
| API QA: student dashboard/adaptive, teacher dashboard, parent child summary | Pass |
| `npm run type-check` | Pass |
| `npm run test:analytics` | Pass, 21/21 |
| `npm run build` | Pass after clean rebuild |
| `npx playwright test tests/e2e/parent-console.spec.ts --project=desktop-chrome` | Pass, 5/5 |

## Handoff

- Treat Adaptive Learning Progress as implemented on `/adaptive-learning`, not on the student `/dashboard`.
- Parent UI/build blocker is resolved after clean rebuild; no source change was required.
- If the artifact issue returns, first stop project Next processes and regenerate `.next/` before patching source.
- Keep LLM-provider calls disabled for repeatable QA unless the owner explicitly approves live provider smoke testing.
