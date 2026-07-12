# Parent Console Remediation and Regression Gate

- Date: 2026-06-06
- Session: S11 QA and release quality
- Source audit: `coordination/reports/2026-06-06-parent-console-p0-p2-bug-audit.md`
- Scope of this artifact: remediation intake, acceptance gates, and S11 regression plan
- Product-code changes: none

## Current State

S11 completed the Parent Console bug hunt and confirmed 10 current P1/P2 bugs with no confirmed P0. Product remediation is still outstanding.

S11 must not fix the bugs directly because the affected files are outside QA write scope:

- S14-owned UI: `app/parent/`, `components/parent/`
- S12-owned API/storage: `app/api/parent/`, `lib/server/userStore.ts`

Safe S11 work remaining is to preserve the findings as release gates and define exact verification criteria for S12/S14 fixes.

## Remediation Queue

| Audit ID | Priority | Owner | Fix Area | Must Be True Before Close |
| --- | --- | --- | --- | --- |
| PC-P1-001 | P1 | S12 | Child-link invite code model | A valid parent invite code is a stored random secret, not derivable from `studentId`; deterministic `SHA1("parent-link:" + studentId)` codes no longer link new students. |
| PC-P1-002 | P1 | S14/S12 | Parent-safe review lesson receipts | Parent-safe review lesson cards expose a working confirm-receipt action, and the linked recipient status changes from pending to acknowledged. |
| PC-P1-003 | P1 | S14 | ParentShell navigation | Every ParentShell nav item preserves the currently selected `studentId` unless the target intentionally changes child context. |
| PC-P2-004 | P2 | S12/S14 | Notice filtering | `/api/parent/notices?studentId=<id>` and `/parent/notices?studentId=<id>` return/show only notices for the selected linked child. |
| PC-P2-005 | P2 | S14/S12 | Notice recipient deep links | `/parent/notices?recipientId=<id>` locates the exact recipient notice and exposes the correct receipt state/action without relying on manual scanning. |
| PC-P2-006 | P2 | S12 | Message thread deep links | `/api/parent/messages?thread=<accessibleThread>` selects that thread even in multi-child families, or returns a clear not-found state for inaccessible threads. |
| PC-P2-007 | P2 | S14 | Message URL state | Clicking a thread updates the browser URL with stable `studentId` and `thread` params. Refresh/share/back-forward preserve the selected thread. |
| PC-P2-008 | P2 | S14 | Message state isolation | Changing the right-side compose child never changes or clears the currently selected left-side thread. |
| PC-P2-009 | P2 | S12/S14 | Message default scope | Direct `/parent/messages` either shows all linked-child threads or clearly scopes the page to one child with no hidden unread/active thread ambiguity. |
| PC-P2-010 | P2 | S12 | Child-link relationship validation | Invalid `relationship` enum values return 400 and never silently coerce to `guardian`. |

## S11 Regression Gates

After S12/S14 fixes land, S11 should add or update focused regression coverage in `tests/e2e/` for these cases:

1. Multi-child invite-code security:
   - Register a new student.
   - Compute the old deterministic code from `studentId`.
   - Assert `/api/parent/children/link` rejects it unless it is the stored teacher-issued code.

2. Relationship validation:
   - POST `/api/parent/children/link` with a valid invite code and invalid `relationship`.
   - Assert HTTP 400.
   - Assert no relationship mutation occurred.

3. Navigation child-focus preservation:
   - Link a second child.
   - Visit `/parent?studentId=<second>`.
   - Click Overview, Reports, Messages, Notices, and Connect links.
   - Assert selected child and URL query remain correct where child context applies.

4. Notices child filtering:
   - Send distinct notices to first-child and second-child classes.
   - Assert `/api/parent/notices?studentId=<second>` excludes first-child notice.
   - Assert `/parent/notices?studentId=<second>` UI excludes first-child notice.

5. Notices recipient deep link:
   - Send a notice and capture one `recipientId`.
   - Visit `/parent/notices?recipientId=<recipientId>`.
   - Assert the target notice is visible, focused/uniquely identifiable, and the confirm action targets that recipient.

6. Parent-safe receipt confirmation:
   - Create or seed a parent-safe review lesson notice with pending acknowledgement.
   - Assert parent-safe card has `Confirm receipt`.
   - Click it and assert pending changes to acknowledged.

7. Message default scope:
   - Create parent threads for two linked children.
   - Visit `/parent/messages`.
   - Assert product decision is honored: all threads visible, or a clear selected-child scope with no hidden-thread ambiguity.

8. Message thread deep link:
   - Create a second-child thread.
   - Visit `/parent/messages?thread=<secondThreadId>` and call `/api/parent/messages?thread=<secondThreadId>`.
   - Assert the second-child thread is selected.

9. Message URL state:
   - Visit `/parent/messages?studentId=<second>`.
   - Click a second-child thread.
   - Assert URL includes `thread=<threadId>`.
   - Reload and assert the same thread remains selected.

10. Compose-child/thread state isolation:
    - Select a second-child thread.
    - Change the compose form child to first child.
    - Re-click the second-child thread and assert it remains visible.

## Suggested Verification Commands

Run after product fixes and before closing the parent-console queue:

```bash
PLAYWRIGHT_PORT=<unique-port> PLAYWRIGHT_RUN_ID=s11-parent-regression-<date> npx playwright test tests/e2e/parent-console.spec.ts --project=desktop-chrome --project=mobile-chrome --reporter=line
```

```bash
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_ISOLATED_FORCE_DEV=1 PLAYWRIGHT_RUN_ID=s11-parent-stress-<date> npx playwright test tests/e2e/parent-console-stress.spec.ts --project=desktop-chrome --project=mobile-chrome --reporter=line
```

```bash
node .tmp/s11-parent-multichild-probe.mjs
```

The `.tmp` probe is an evidence helper, not a committed release gate. S11 should promote its stable checks into `tests/e2e/` after S12/S14 fixes are available.

## Blockers for S11

S11 cannot safely implement the fixes themselves under the current assignment because the required edits touch S12/S14-owned product/API files. The next safe action for implementation is owner assignment or handoff acceptance by:

- S12 for backend/API/storage contract changes.
- S14 for parent console UI and URL-state changes.

Until those fixes land, S11 can only maintain the QA evidence, keep the regression plan current, and rerun probes when asked.
