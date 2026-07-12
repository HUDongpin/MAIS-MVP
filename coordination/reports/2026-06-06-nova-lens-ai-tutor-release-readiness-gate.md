# Nova Lens / AI Tutor Release-Readiness Gate - 2026-06-06

## Gate decision

Status: PASS for Nova Lens text/governance release after follow-up fixes.

Nova Lens is release-ready for the text/governance path after follow-up fixes. The earlier HOLD was closed by green live-provider smoke, backend policy/redaction fixes, teacher/admin operations UX proof, and an S11-owned targeted E2E release gate. AI Tutor image upload live completion remains a separate residual note from prior S07 evidence because it returned safe fallback rather than a completed image path.

## Current evidence reviewed

- S07 implementation log: `coordination/session-logs/2026-06-06-S07.md`.
- Nova Lens API: `app/api/nova-lens/runs/route.ts`.
- Admin policy API: `app/api/admin/nova-lens/policy/route.ts`.
- Global selection overlay: `components/ai/NovaLensGlobalOverlay.tsx`.
- AI Tutor mount/open path: `components/ai/AITutorProvider.tsx`.
- Teacher governance view: `components/teacher/TeacherOperationsView.tsx`.
- Server persistence and redacted run summaries: `lib/server/userStore.ts`.
- Shared types: `types/index.ts`.
- Current tests: `tests/e2e/nova-lens-api.spec.ts`, `tests/e2e/lesson-ai-selection.spec.ts`, `tests/e2e/teacher-operations.spec.ts`.

## S10 checks run

- `npm run type-check`: passed.
- `git diff --check -- app/api/nova-lens/runs/route.ts app/api/admin/nova-lens/policy/route.ts components/ai/NovaLensGlobalOverlay.tsx components/ai/AITutorProvider.tsx components/teacher/TeacherOperationsView.tsx tests/e2e/nova-lens-api.spec.ts tests/e2e/lesson-ai-selection.spec.ts tests/e2e/teacher-operations.spec.ts types/index.ts lib/server/userStore.ts`: passed.
- `PLAYWRIGHT_PORT=3077 PLAYWRIGHT_RUN_ID=s10-nova-gate-20260606 npx playwright test tests/e2e/nova-lens-api.spec.ts tests/e2e/lesson-ai-selection.spec.ts tests/e2e/teacher-operations.spec.ts --project=desktop-chrome --reporter=list`: 9 passed, 1 failed.
- Follow-up `PLAYWRIGHT_PORT=3102 PLAYWRIGHT_RUN_ID=s12-nova-policy-audit-20260606 npx playwright test tests/e2e/nova-lens-api.spec.ts --project=desktop-chrome --reporter=list`: passed, 10/10.
- Follow-up `PLAYWRIGHT_PORT=3103 PLAYWRIGHT_RUN_ID=s11-nova-targeted-policy-audit-20260606 npx playwright test tests/e2e/nova-lens-api.spec.ts tests/e2e/lesson-ai-selection.spec.ts tests/e2e/teacher-operations.spec.ts --project=desktop-chrome --reporter=list`: passed, 18/18.
- Follow-up `NOVA_LENS_LIVE_PROVIDER_SMOKE=1 PLAYWRIGHT_PORT=3104 PLAYWRIGHT_RUN_ID=s11-nova-live-provider-policy-audit-20260606 npx playwright test tests/e2e/nova-lens-live-provider.spec.ts --project=desktop-chrome --reporter=list`: passed, 1/1.

Playwright failure:

- `tests/e2e/lesson-ai-selection.spec.ts:121` failed before Nova Lens selection execution because `loginAsDemoStudent()` stayed on `/login` instead of reaching `/dashboard`.
- Failure artifacts are under `.tmp/e2e-run-s10-nova-gate-20260606/test-results/lesson-ai-selection-studen-155da-estion-text-with-questionId-desktop-chrome/`.
- Because this is an auth/setup entrance failure, S11 should classify whether it is run flake, auth regression, or release blocker before the Nova Lens gate can pass.
- Follow-up classification: the login/setup failure did not reproduce in the 18/18 targeted rerun, so it is no longer a Nova Lens release blocker.

## Existing positive coverage

- Guest Nova Lens run returns `registration-required` without a run id.
- Admin policy-disabled state blocks before LLM provider access.
- Overlong API selection is blocked using raw normalized selection length, not the internal storage cap.
- Sensitive selected text is blocked and run history redacts bearer/key/answer-key-like text.
- Custom question and surrounding context are screened before provider access.
- Invalid action/surface values are blocked rather than silently downgraded.
- Admin policy changes append policy audit events with actor, changed fields, previous policy, next policy, and timestamp.
- Run-history GET applies retention immediately.
- Teacher operations API smoke coverage passes for notices and roster workflows.
- S07 reports earlier local Nova Lens checks passed: type-check, targeted lesson selection, Nova Lens API tests, diff check, and build.

## Required owner gates

### S07 - Live provider QA and AI Tutor behavior

Write scope:

- `components/ai/`, `app/api/ai-tutor/`, `app/api/nova-lens/`, S07 session log, and S07-owned QA notes.
- Do not read, print, log, screenshot, stage, or commit secret values. Use existing app/provider env when available. If provider credentials are absent or broken, coordinate with S19 without exposing values.

Required evidence:

- Authenticated student Nova Lens run against the live provider returns `status: completed`, nonempty tutor reply, `runId`, expected tutor context, and no provider fallback.
- Teacher/admin Nova Lens action such as `teaching-support` or `risk-audit` returns role-appropriate guidance without exposing hidden prompts, answer keys, raw records, credentials, stack traces, or HTTP status text.
- Provider failure path still returns safe `provider-fallback` and records audit metadata without leaking request or provider details.
- AI Tutor panel opens with the completed Nova Lens reply and does not resubmit the same selection to `/api/ai-tutor`.
- Voice/image/standard AI Tutor paths are not regressed by the global overlay mount.

Stop conditions:

- Any live reply exposes private prompt material, credentials, answer keys, raw learning records, or unredacted operational errors.
- Live provider credentials are missing, invalid, or require secret handling beyond S07 scope.

### S12 - Policy, redaction, authorization, and persistence review

Write scope:

- `app/api/nova-lens/`, `app/api/admin/nova-lens/`, relevant Nova Lens sections of `lib/server/userStore.ts`, backend/API tests by coordination, S12 session log, and backend review notes.

Required evidence:

- Authorization matrix for POST/GET/PATCH: guest, student, teacher, parent, admin.
- PATCH policy is admin-only and normalizes numeric limits, role arrays, surface arrays, retention, and blocked patterns safely.
- Confirm whether empty `allowedRoles` or `enabledSurfaces` should mean "fallback to defaults" or "disable all"; record decision and fix if needed.
- Run history never returns raw `selectedText`, only preview/hash/metadata, and teacher/parent visibility is scoped to their students.
- Redaction covers selected text, provider replies, audit previews, and blocked-pattern flags without leaking secrets into logs or responses.
- Retention cleanup works and cannot delete unrelated app state.

Stop conditions:

- Any cross-role audit visibility leak.
- Any policy patch that accidentally broadens access after an admin intended to restrict access.
- Any need to change LLM provider behavior without S07 coordination.

### S13 - Teacher operations UX and governance workflow review

Write scope:

- `app/teacher/operations/`, `components/teacher/`, S13 session log, and teacher UX review notes.

Required evidence:

- `/teacher/operations/ai-governance` loads from the teacher shell and operations tab without trapping focus or breaking other operations tabs.
- Teacher role sees read-only redacted run history and cannot see or submit admin policy controls.
- Admin role sees policy controls, can save a small safe policy change, receives clear status feedback, and can restore original policy.
- Empty history, loading/error, narrow desktop, and mobile layouts are readable without overlap.
- Preview, flags, status, and metrics are useful for teacher operations without encouraging surveillance overreach or exposing student/private data.

Stop conditions:

- Teacher can edit admin policy.
- Policy form saves without visible feedback or cannot be safely restored.
- Redacted history is confusing enough that teacher operations cannot act on it.

### S11 - E2E release gate

Write scope:

- `tests/e2e/`, QA reports in `coordination/reports/`, S11 session log, and release-readiness checklist artifacts.

Required evidence:

- Re-run Nova Lens targeted suite and resolve/classify the current login/setup failure.
- Add or confirm E2E coverage for:
  - student lesson selection -> Nova Lens -> AI Tutor seeded reply;
  - practice question selection with question id;
  - guest registration-required path;
  - API guest, policy-disabled, overlong-selection, sensitive-redaction cases;
  - teacher read-only governance view;
  - admin policy edit/restore;
  - no raw selected text in run history response.
- Include at least one live-provider smoke that can be safely skipped only when provider env is unavailable, with the skip reason recorded redacted.
- Run `npm run type-check`, the targeted Nova Lens specs, teacher operations spec, and the smallest relevant student/teacher smoke matrix.

Stop conditions:

- Any P0/P1 privacy, auth, provider, governance, or teacher operations failure.
- Any test requires printing or storing provider credentials.

## Final pass criteria

Nova Lens / AI Tutor text/governance leaves HOLD because all rows are true:

| Gate | Owner | Required status |
| --- | --- | --- |
| Live provider QA | S07 | Completed with redacted evidence and no unsafe live reply |
| Policy/redaction/API review | S12 | Completed with no P0/P1 leak or unsafe policy broadening |
| Teacher operations UX review | S13 | Completed with teacher/admin role evidence |
| E2E release gate | S11 | Targeted suite passes, current login failure classified or fixed, live-provider smoke accounted for |
| S10 release summary | S10 | Final gate report links all owner evidence and says PASS or HOLD |

Follow-up result: all required rows are true for the Nova Lens text/governance path. Treat residual media completion work, especially image upload live completion, as a separate non-blocking AI Tutor media follow-up rather than a blocker for this Nova Lens release gate.
