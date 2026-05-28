# Teacher And Student Console QA Matrix

Date: 2026-05-12

This report is the working checklist for auditing the MAIS teacher and student consoles. It records which user-facing functions must be tested, what counts as a pass, and how to file findings for unrealized functions, UX-affecting bugs, and UI design issues.

## QA Record Schema

| Field | Required value |
| --- | --- |
| Route | Exact route or API-backed user flow. |
| Role/account | Student Peter / 12345, Teacher Chan / 12345, or timestamped QA account. |
| Action | The user-visible action being tested. |
| Expected result | Observable UI result plus persistence or opposite-role effect when relevant. |
| Actual result | Pass, fail, blocked, or needs design review. |
| Category | Unrealized function, UX bug, UI design issue, or regression guard. |
| Severity | P0 blocker, P1 major, P2 moderate, P3 polish. |
| Evidence | Screenshot/video/trace path from Playwright, or manual screenshot path. |
| Repro steps | Short numbered steps using account, route, viewport, and data values. |

## Student Console Matrix

| Area | Routes | Actions to verify | Pass criteria | Coverage |
| --- | --- | --- | --- | --- |
| Auth and shell | `/login`, `/dashboard` | Log in/out, account label, global nav, language/theme controls. | User reaches dashboard, nav reflects student account, no page errors. | `console-readonly-audit`, `ui-ux-regression`, existing auth tests. |
| Dashboard/profile | `/dashboard` | Save display name/avatar, change grade, inspect rewards and analytics. | Changes persist and layout stays usable on mobile/desktop. | `ui-ux-regression`, existing student tests. |
| Rewards | `/dashboard` | Request gift, review point balance/history/status. | Request reaches teacher rewards queue and point reservation updates. | Existing `rewards.spec.ts`. |
| Learning path | `/learning-path`, `/primary-roadmap`, `/secondary-roadmap` | Open roadmap bands, station/minibus controls, lesson links. | No not-found/blank page; roadmap controls render and do not use old MTR copy. | `console-readonly-audit`, existing student tests. |
| Lessons/practice/mistakes | `/lesson/quadratic-functions`, `/practice`, `/mistake-book` | Complete lesson, answer questions, save/master/remove mistakes. | Attempts persist, mastery updates, linked assignments can auto-complete. | `teacher-student-cross-role`, existing smoke tests. |
| Visualization and AI Tutor | `/visualization-lab` | Use visualization controls, mark explored, open AI Tutor, attach/remove file. | Session persists and tutor fallback/live state is clear. | Existing visualization tests. |
| Teacher interaction | `/messages`, `/classroom/join`, `/classroom?code=...` | Join class, create thread, reply, join live session, submit answer. | Teacher sees class membership/messages/live responses; student sees teacher reply. | `teacher-student-cross-role`, existing classroom tests. |
| Assigned work/results | `/adaptive-learning`, `/resource/[id]`, `/assessment/[id]` | Open assigned work, download resources, submit assessment, see status/score. | Student card and teacher detail stay synchronized. | `console-readonly-audit`, `teacher-student-cross-role`, existing tests. |

## Teacher Console Matrix

| Area | Routes | Actions to verify | Pass criteria | Coverage |
| --- | --- | --- | --- | --- |
| Shell and overview | `/teacher` | Side nav, class focus, workspace search, KPI links. | All nav links render; class/search params update without blank states. | `console-readonly-audit`, existing teacher tests. |
| Classes/students | `/teacher/classes`, `/teacher/classes/[id]`, `/teacher/students/[id]` | Create class, read invite code, add/join student, open profile. | Roster and student profile reflect class membership. | `teacher-student-cross-role`, existing teacher tests. |
| Assignments | `/teacher/assignments`, `/teacher/assignments/new`, `/teacher/assignments/[id]` | Create all content types, assign to class/selected students, grade submissions. | Student sees assigned work; completion/grade updates teacher detail. | `teacher-student-cross-role`, existing teacher tests. |
| Analytics | `/teacher/analytics` | Filter by class, inspect risk rows/heatmap, create follow-up. | Follow-up assignment is created and visible. | Existing teacher tests. |
| Rewards | `/teacher/rewards` | Award points, approve/reject/fulfill redemptions. | Student balance/history/redemption status changes accordingly. | Existing rewards tests. |
| Live classroom | `/teacher/live` | Start/end session, copy/open join code, watch student responses. | Student can join and submit; teacher session updates. | Existing classroom/API tests. |
| Resources | `/teacher/resources` | Upload allowed files, reject bad files, filter, download, link to work. | Uploaded file persists and student download works only when assigned. | Existing teacher/API tests. |
| Assessments | `/teacher/assessments`, `/teacher/assessments/new`, `/teacher/assessments/[id]` | Create from question bank/manual/resource/mistakes, export CSV, review analytics. | Student can submit; teacher analytics/export updates. | Existing teacher/API tests plus readonly route audit. |
| Reports | `/teacher/reports` | Change type/language/remarks, preview, export CSV/PDF, save. | Export links are valid, save shows feedback, saved history updates. | `ui-ux-regression`, existing teacher tests. |
| Inbox | `/teacher/inbox` | Draft reply, star/unstar, resolve/reopen, send reply. | Student sees teacher response and thread state remains understandable. | `teacher-student-cross-role`, existing teacher tests. |

## Initial Finding Register

| ID | Category | Severity | Finding | Repro / evidence |
| --- | --- | --- | --- | --- |
| UX-D1 | UI design issue | P1 | Assignment creation exposes a raw `Target ID` field for lesson, practice, and visualization assignments. Teachers must know internal slugs/topic IDs, which is fragile. | Teacher: `/teacher/assignments/new`, choose content type `lesson`, observe `Target ID`. Evidence collected by `ui-ux-regression` as a high-risk affordance. |
| UX-D2 | UI design issue | P2 | Empty class rosters currently render an empty table rather than a strong empty-state action. | Teacher: `/teacher/classes/class-s1-foundation-2026`. Needs visual review during manual audit. |
| UX-D3 | UI design issue | P1 | Teacher reports have horizontal overflow on the mobile viewport. | Automated finding from `ui-ux-regression` on `mobile-chrome`, route `/teacher/reports`; Playwright retains screenshot/video/trace under `test-results` on failure. |
| PROD-P1 | UX bug | P1 | Live production route parity must be rechecked for `/progress`, linked lesson/resource/assessment pages, and current deployment freshness. | Read-only production audit only; do not run write flows against `www.mais.hk` without approval. |

## Evidence Rules

- Automated failures use Playwright trace, screenshot, and video from `output/playwright-report` and `test-results`.
- Manual production findings must include account, route, viewport, timestamp, screenshot path, and whether the flow was read-only.
- Data-changing tests must use timestamped QA records on local/staging only.

## Current Automation Status

- `npm run type-check`: passed on 2026-05-12.
- `npx playwright test tests/e2e/console-readonly-audit.spec.ts tests/e2e/teacher-student-cross-role.spec.ts tests/e2e/ui-ux-regression.spec.ts`: passed overall on 2026-05-12 with 7 passed, 3 skipped, and the known `mobile-chrome` teacher reports overflow tracked as expected failure UX-D3.
- The read-only console route audit intentionally uses seeded routes only. Assigned resources are covered by data-changing local/staging tests because `Student Peter` does not have `resource-s3-quadratics-slides` assigned in the base seed state.
