# S12 Nova Lens Backend Gate - 2026-06-06

Status: PASS after follow-up fixes.

S12 found and fixed one P1 backend governance issue: `PATCH /api/admin/nova-lens/policy` previously treated empty or all-invalid `allowedRoles` / `enabledSurfaces` as a fallback to default all roles/all surfaces. Empty arrays now mean disable-all for that dimension; missing fields still keep the current policy.

S12 also fixed policy flag redaction so custom blocked-pattern text is not echoed in run responses/history, and aligned parent run-history route access with the existing active-guardian scoped store visibility rule.

Follow-up closure fixed the remaining backend P1 risks recorded in the initial HOLD:

- Sensitive `customQuestion` and `context.surroundingText` are screened before provider access and blocked responses redact tutor context.
- Invalid `action` and `surface` values are blocked with policy flags instead of silently downgraded to safe-looking defaults.
- Run-history GET applies retention immediately, so policy changes do not leave expired runs visible until the next recorded run.
- Admin policy PATCH now appends immutable policy-change audit events with actor id, changed fields, previous policy, next policy, and timestamp. GET `/api/admin/nova-lens/policy` returns recent admin-only audit events.

Backend review evidence:

- `POST /api/nova-lens/runs`: guest receives `registration-required`; authenticated student/teacher/parent/admin runs are constrained by enabled policy, allowed roles, enabled surfaces, selected-text length, blocked patterns, and role action set.
- `GET /api/nova-lens/runs`: guest 401; student 403; teacher scoped to enrolled students; parent scoped to active guardian-linked students; admin can view all redacted summaries.
- `GET/PATCH /api/admin/nova-lens/policy`: admin-only; non-admin roles are rejected.
- Run history returns selected-text preview/hash/metadata, never raw `selectedText`.
- Sensitive selected-text previews are redacted before persistence. Sensitive replies are sanitized/blocked. Blocked-pattern flags now avoid echoing admin pattern text.
- Retention cleanup is limited to `database.nova_lens_runs`; history listing also filters expired Nova Lens runs without deleting unrelated app state.
- Policy-change audit history is append-only in `database.nova_lens_policy_events` and contains policy metadata only, not raw student selections or run records.

Files changed:

- `app/api/nova-lens/runs/route.ts`
- `app/api/admin/nova-lens/policy/route.ts`
- `lib/server/userStore.ts`
- `types/index.ts`
- `tests/e2e/nova-lens-api.spec.ts`
- `coordination/session-logs/2026-06-06-S12.md`

Checks:

- `npm run type-check`: passed after follow-up fixes.
- `git diff --check -- app/api/nova-lens/runs/route.ts lib/server/userStore.ts tests/e2e/nova-lens-api.spec.ts coordination/session-logs/2026-06-06-S12.md`: passed.
- Pre-fix targeted Playwright reproduced the policy-broadening failure.
- Initial post-fix targeted Playwright did not complete because the configured webServer timed out after 240000 ms during startup.
- `PLAYWRIGHT_PORT=3102 PLAYWRIGHT_RUN_ID=s12-nova-policy-audit-20260606 npx playwright test tests/e2e/nova-lens-api.spec.ts --project=desktop-chrome --reporter=list`: passed, 10/10.
- `PLAYWRIGHT_PORT=3103 PLAYWRIGHT_RUN_ID=s11-nova-targeted-policy-audit-20260606 npx playwright test tests/e2e/nova-lens-api.spec.ts tests/e2e/lesson-ai-selection.spec.ts tests/e2e/teacher-operations.spec.ts --project=desktop-chrome --reporter=list`: passed, 18/18.

Release blocker:

- None remaining for the S12 Nova Lens backend gate from this review.
- No secrets were read, printed, logged, staged, or committed.
