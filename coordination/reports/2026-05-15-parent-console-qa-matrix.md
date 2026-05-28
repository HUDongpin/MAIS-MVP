# Parent Console Implementation QA Matrix

Date: 2026-05-15
Session: S11
Scope: Current parent console implementation in `/parent`, `components/parent/`, `/api/parent`, and existing QA automation.

## Executive Summary

The Parent Console is substantially implemented across access control, overview, child summaries, reports, messaging, child linking, and API privacy boundaries. Existing Playwright coverage already exercises the highest-risk data-changing flows: authorization, child linking, parent report filtering, parent-teacher messages, and separation from student private messages. The targeted desktop Parent Console suite passed, and the mobile overview smoke plus a supplemental mobile route smoke passed.

The main implementation caveat found during code review was in the shell child-focus control on dynamic child detail routes: `/parent/children/[studentId]` could render a selected child detail while the shell select still defaulted to the first linked child because the shell only read `studentId` from query params. S14 resolved this on 2026-05-15 by deriving the selected child from the dynamic detail route when the route ID belongs to a linked child. `npm run test:mvp` also failed during the audit, but the failure is unrelated to the Parent Console: `p1-counting-number-bonds` is missing a registered visualization block.

## Evidence Sources

| Source | Evidence used |
| --- | --- |
| `app/parent/*` | Parent pages for overview, child detail, reports, messages, connect, layout auth gating. |
| `components/parent/ParentShell.tsx` | Parent shell, navigation, child focus select, language/theme controls. |
| `components/parent/ParentViews.tsx` | Overview cards, child detail, reports view, message UI, connect form, empty states. |
| `app/api/parent/*` | Parent API routes for foundation, child summary, reports, messages, replies, child linking. |
| `lib/server/userStore.ts` | Parent data assembly, guardian links, report filtering, message creation/reply, invite linking. |
| `tests/e2e/parent-console.spec.ts` | Existing automated E2E coverage for auth, summaries, reports, linking, messaging, privacy boundaries. |
| `lib/mvpReadiness.test.ts` | Static readiness check for Parent Console route/API surface and authorization hooks. |

## Implementation Status Matrix

| Area | Status | Evidence | Gaps / risks | Suggested owner |
| --- | --- | --- | --- | --- |
| Access and role authorization | Implemented | `getParentFoundationForPage` redirects unauthenticated users to `/login?next=/parent`, redirects student/teacher roles away, and Parent API routes call `requireParentUser`. Existing E2E covers unauthenticated, parent, student, teacher, and API `403` behavior. | No current implementation gap found. | S12 if a future auth/API failure appears. |
| Parent shell, navigation, theme/language, child focus | Implemented with coverage gaps | Shell renders Overview, Reports, Messages, Connect child links, active state, Child focus select, `LanguageToggle`, and `ThemeToggle`. Empty no-child copy routes to `/parent/connect`. S14 fixed dynamic child detail selection so linked route IDs control the selected child on `/parent/children/[studentId]`. | Existing automation does not directly assert active nav, child switch URL behavior, or language/theme after toggles. Permanent coverage for direct second-child detail navigation is still recommended. | S11 for additional assertions. |
| Overview page `/parent` | Implemented | `ParentOverview` renders totals, each child pulse card, average mastery, 7-day minutes, recent tasks, points, weekly activity bars, Celebrate and Support guidance, and child detail links. Existing smoke/E2E checks cover core headings, child card, totals, and no page errors. | Weekly bar count and exact child-card metric labels are mostly code-reviewed rather than directly asserted. | S11 for coverage hardening if needed. |
| Child detail `/parent/children/[studentId]` | Implemented with shell caveat | Page uses `getParentChildSummary` after parent access validation. UI shows child pulse card, Support topics, Latest parent report, Recent assignments, and hides teacher/student-only operations. Existing E2E covers detail headings, summary metrics, and private/teacher-only text absence. | The page content is implemented, but shell child-focus selection risk remains for non-first linked child detail URLs. Recent assignments has no explicit empty-state copy if the list is empty. | S14 for UI polish; S11 for multi-child detail coverage. |
| Parent reports `/parent/reports` | Implemented | API filters `teacher_reports` to `type === "parent-summary"` and allowed child IDs. UI renders teacher-published summaries and no-summary empty state. Existing E2E checks report type filtering, `studentId` filtering, and absence of teacher report authoring actions. | No current implementation gap found. | S12 if report API filtering regresses; S14 for report UX polish. |
| Parent-teacher messages `/parent/messages` | Implemented | UI renders thread list, selected thread, reply box, Ask teacher form, categories, optional linked parent-summary report, and error messages. API creates parent threads, replies, and filters by guardian/linked child. Existing E2E covers empty subject API failure, create thread, teacher inbox context, teacher reply, parent follow-up, and separation from student-only messages. | Mobile three-column-to-single-column usability and category list visibility need targeted browser verification. UI required fields rely partly on native required validation plus API validation. | S14 for UX issues; S12 for message contract issues; S11 for mobile coverage. |
| Connect child `/parent/connect` | Implemented | UI uppercases invite code input, offers guardian/mother/father/other relationship options, handles invalid invite message, and redirects after valid link. Server link flow normalizes invite code, validates parent role, reactivates existing links, and avoids duplicate guardian links. Existing E2E covers invalid invite, valid invite, and idempotent repeat link. | Relationship alternatives other than guardian are implemented but not all individually asserted. | S11 for coverage hardening if needed. |
| Parent API and privacy boundaries | Implemented | Parent API routes use `requireParentUser`; summary/report/message functions enforce parent-child guardian access; parent messages use `guardian_id`; student messages filter out guardian threads. Existing E2E covers unauthorized API access, unlinked child summary `404`, linked child access, report filtering, and parent/student message separation. | No current implementation gap found. | S12 for API ownership. |
| Visual, accessibility, responsive behavior | Implemented with coverage gaps | Components use labels, buttons, navigation landmarks, focus-ring classes, and responsive Tailwind grids. Existing parent-console smoke passed on mobile for `/parent`. Supplemental Playwright API mobile smoke passed for `/parent`, `/parent/messages`, `/parent/connect`, `/parent/reports`, and `/parent/children/student-peter` with no page errors, no horizontal overflow, and non-empty main content. | Existing permanent E2E suite still lacks route-specific mobile assertions for messages/connect/reports/detail. | S11 for regression coverage; S14 for UI remediation. |
| Bilingual terminology | Implemented with coverage gap | Parent UI uses localized English/Traditional Chinese copy and existing decision notes define `Parent Console / 家長端` plus guardian terminology. | No targeted assertion confirms switching language on parent routes or checking all parent copy against terminology decisions. | S09 for terminology review; S11 for automation if needed. |

## Coverage Map Against Requested QA Plan

| Requested check group | Current implementation status | Current automated coverage |
| --- | --- | --- |
| 1. Access and permissions | Implemented | Strong: `parent-console.spec.ts` auth/API test. |
| 2. Shell/navigation/child focus | Implemented with coverage gaps | Moderate: nav and child focus visibility; S14 fixed route-derived selected child. Child switch/active state/language-theme coverage gaps remain. |
| 3. Overview summary | Implemented | Moderate: overview smoke plus API summary checks. |
| 4. Child detail | Implemented with shell caveat | Strong for detail sections and forbidden text absence; weak for multi-child shell selected state. |
| 5. Parent reports | Implemented | Strong for parent-summary filtering and no teacher actions. |
| 6. Parent-teacher messages | Implemented | Strong for API and cross-role flow; moderate for mobile/UI affordances. |
| 7. Connect child | Implemented | Strong for invalid/valid/idempotent linking; moderate for all relationship choices. |
| 8. Visual/accessibility/responsive | Implemented with coverage gaps | Basic overview smoke plus supplemental mobile route smoke passed; targeted permanent assertions still recommended. |

## Findings Register

| ID | Severity | Status | Finding | Evidence | Suggested owner |
| --- | --- | --- | --- | --- | --- |
| PC-QA-01 | P2 | Resolved 2026-05-15 | Child detail content could be for `/parent/children/[studentId]` while the shell Child focus select still defaulted to the first linked child if no `studentId` query param existed. | Fixed in `components/parent/ParentShell.tsx` by parsing the dynamic detail path and using the route student ID when it belongs to a linked child. Verified with a direct second-child detail route and parent-console desktop E2E. | S14 |
| PC-QA-02 | P3 | Open | Existing automation does not directly assert active nav state, child focus switching behavior, or language/theme toggle behavior on parent routes. | Coverage review of `tests/e2e/parent-console.spec.ts`. | S11 |
| PC-QA-03 | P3 | Open | Parent messages, reports, connect, and child detail mobile layouts passed a supplemental smoke but are not permanently asserted beyond the overview smoke path. | Existing mobile run only executes the non-serial overview smoke; supplemental Playwright API smoke checked these routes for no page errors, non-empty main content, and no horizontal overflow. | S11/S14 |
| PC-QA-04 | P3 | Open | Recent assignments section has no explicit empty-state copy when a child has no assignments. | `ParentChildDetail` maps `child.assignments` without an empty fallback. | S14 |

## Check Results

| Check | Result | Notes |
| --- | --- | --- |
| `npm run type-check` | Passed | TypeScript completed with no errors. |
| `npm run test:mvp` | Failed, unrelated to Parent Console | 21 passed, 1 failed: `production lessons reuse registered visualization lab mappings` reported `p1-counting-number-bonds: missing visualization block`. |
| `npx playwright test tests/e2e/parent-console.spec.ts --project=desktop-chrome` | Passed | 5 passed in 1.3 minutes. |
| `npx playwright test tests/e2e/parent-console.spec.ts --project=mobile-chrome` | Passed with expected skips | 1 passed, 4 skipped by the spec's desktop-only write-path guard. |
| Supplemental Playwright API mobile smoke | Passed | Checked `/parent`, `/parent/messages`, `/parent/connect`, `/parent/reports`, and `/parent/children/student-peter`; no page errors, no horizontal overflow, and non-empty main content. |

## Supplemental Mobile Smoke Results

| Route | Result | Notes |
| --- | --- | --- |
| `/parent` | Passed | Main content present; no horizontal overflow; headings included `Today’s home-school picture` and `Student Peter`. |
| `/parent/messages` | Passed | Main content present; no horizontal overflow; headings included `Threads` and `Ask teacher`. |
| `/parent/connect` | Passed | Main content present; no horizontal overflow; heading `Use a parent invite code`. |
| `/parent/reports` | Passed | Main content present; no horizontal overflow; heading `Teacher-published summaries`. |
| `/parent/children/student-peter` | Passed | Main content present; no horizontal overflow; headings included `Support topics`, `Latest parent report`, and `Recent assignments`. |

## Recommendations

1. Keep Parent Console marked as mostly implemented for MVP; the one concrete implementation mismatch from this audit, `PC-QA-01`, is now resolved.
2. Add S11 follow-up coverage for child focus switching, active nav state, language/theme smoke, and mobile layout checks on `/parent/messages`, `/parent/connect`, `/parent/reports`, and `/parent/children/[studentId]`.
3. Route UI fixes and empty-state polish to S14; route any future API/privacy regression to S12; route terminology audit to S09.
