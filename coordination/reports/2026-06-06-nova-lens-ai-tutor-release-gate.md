# Nova Lens / AI Tutor Release-Readiness Gate

- Date: 2026-06-06 Asia/Hong_Kong
- Coordinator: S10
- Release state: HOLD
- Scope: Nova Lens global overlay, AI Tutor provider handoff, Nova Lens run API, admin policy API, audit history, and teacher operations AI governance view.
- Rule: Do not release this feature until S07, S12, S13, and S11 each record a green handoff for their gate below. Any P0 or unresolved P1 keeps the feature held.

## Surfaces In Scope

- `components/ai/NovaLensGlobalOverlay.tsx`
- `components/ai/AITutorProvider.tsx`
- `app/api/ai-tutor/route.ts`
- `app/api/ai-tutor/status/route.ts`
- `app/api/ai-tutor/voice/route.ts`
- `app/api/nova-lens/runs/route.ts`
- `app/api/admin/nova-lens/policy/route.ts`
- `components/teacher/TeacherOperationsView.tsx`
- `app/teacher/operations/`
- `tests/e2e/nova-lens-api.spec.ts`
- `tests/e2e/ai-tutor-live-text.spec.ts`
- `tests/e2e/ai-tutor-deepseek.spec.ts`
- `tests/e2e/teacher-operations.spec.ts`

## Immediate Owner Assignments

### S07 - Live Provider QA

Write output: `coordination/session-logs/2026-06-06-S07.md`

Required checks:

- Confirm AI Tutor provider readiness with redacted status only. Do not print secret values from `.env.local`, Vercel, or `All API Keys.docx`.
- Confirm `/api/ai-tutor/status` reports the intended provider/model without exposing credentials.
- Exercise a normal Nova Lens run with a signed-in student on a math selection and verify a live or safe fallback response.
- Exercise teacher/admin Nova Lens actions, especially `teaching-support`, `risk-audit`, and `rewrite-follow-up`.
- Exercise blocked/sensitive prompts: system prompt extraction, answer-key request, bearer/API-key shaped text, database/raw-record request, and long selection.
- Verify provider replies never expose hidden prompts, credentials, authorization headers, raw database context, answer keys, stack traces, or provider HTTP details.
- Verify blocked/sensitive Nova Lens runs do not create an unsafe AI Tutor conversation artifact or retrigger provider calls.

Pass criteria:

- Live provider path is available or a documented provider-fallback path is safe, intentional, and user-readable.
- No secret-like or hidden-context text appears in UI, API response, run history, console output, or session logs.
- Any provider/env blocker is recorded with variable names and redacted status only.

### S12 - Policy, Redaction, Authorization, And Audit API Review

Write output: `coordination/session-logs/2026-06-06-S12.md`

Required checks:

- Inventory `GET/POST /api/nova-lens/runs` and `GET/PATCH /api/admin/nova-lens/policy`.
- Verify auth matrix:
  - guest POST returns `registration-required` and does not call the provider.
  - student/parent/teacher/admin role policy is enforced before provider access.
  - only admin can read or patch `/api/admin/nova-lens/policy`.
  - only teacher/admin can call `GET /api/nova-lens/runs`.
  - teacher run-history visibility is limited to students in that teacher's classes.
  - admin history visibility is global.
  - student/parent cannot read the governance run-history endpoint.
- Verify policy normalization clamps allowed roles, enabled surfaces, max selection length, retention days, and blocked patterns.
- Verify run history stores only `selectedTextHash` and redacted `selectedTextPreview`, never raw selected text.
- Verify `allowedScopes` and `deniedScopes` are correct for student, parent, teacher, and admin flows.
- Verify `retentionDays` is actually applied when runs are recorded.
- Check whether blocked/sensitive response context returns raw selected text only to the requester and does not persist it in shared history or teacher governance surfaces.

Pass criteria:

- Role and data-scope boundaries are explicit and tested.
- Redaction applies to both audit history and provider output.
- Any raw text persistence or cross-role exposure is P0.

### S13 - Teacher Operations UX Review

Write output: `coordination/session-logs/2026-06-06-S13.md`

Required checks:

- Review `/teacher/operations?tab=ai-governance` or equivalent route state.
- Confirm admin users see policy edit controls and teachers see read-only redacted history.
- Confirm non-admin teachers cannot save policy by UI or API path.
- Confirm run table communicates status, flags, role, surface, and preview without exposing raw selected text.
- Confirm bilingual copy, loading/error states, refresh behavior, empty state, and save feedback are clear.
- Confirm mobile/table overflow remains usable and does not hide policy controls or audit rows.
- Confirm keyboard and screen-reader labels exist for policy controls and refresh/save actions.

Pass criteria:

- A teacher can understand what Nova Lens did, why a run was blocked/fallback/completed, and when to escalate.
- An admin can safely adjust policy without ambiguity.
- No governance UI makes raw private content inspectable.

### S11 - E2E Release Gate

Write output: `coordination/session-logs/2026-06-06-S11.md` and optional QA report under `coordination/reports/`

Required tests or equivalent documented blockers:

- `npm run type-check`
- `npx playwright test tests/e2e/nova-lens-api.spec.ts --project=chromium`
- `npx playwright test tests/e2e/teacher-operations.spec.ts --project=chromium`
- AI Tutor live/provider gate: `tests/e2e/ai-tutor-live-text.spec.ts` or `tests/e2e/ai-tutor-deepseek.spec.ts`, depending on available redacted provider configuration.
- Add or confirm an E2E assertion that teacher operations AI governance loads and that non-admin teacher policy changes are not possible.
- Add or confirm an E2E assertion that student/parent cannot read run history.

Pass criteria:

- Targeted Nova Lens API gate passes.
- Teacher operations governance gate passes or has a precise P0/P1 blocker.
- Live provider QA is green or blocked only on documented redacted provider/env readiness.
- No console/network evidence of secrets, raw selected text in shared history, or hidden prompt leakage.

## Release Blockers Until Proven Green

- P0: Any role can read or patch policy outside its allowed access.
- P0: Student/parent can read shared run history.
- P0: Teacher can see runs for students outside assigned classes.
- P0: Raw selected text, answer keys, hidden prompts, bearer tokens, API-key shaped strings, database context, or authorization headers appear in shared history, provider output, logs, screenshots, or reports.
- P0: Guest or blocked policy path calls the live provider.
- P0: Sensitive/blocked run gets persisted into AI Tutor conversation or governance history in a raw form.
- P1: Teacher operations UI lacks a tested governance route or tab.
- P1: Admin policy edit controls lack clear feedback or validation.
- P1: Retention policy is not tested.
- P1: Live provider fallback copy is unclear or fails bilingual expectations.
- P1: Policy/sensitive scanning covers only selected text; it must also cover custom questions and surrounding context before provider access.
- P1: Empty admin `allowedRoles` or `enabledSurfaces` arrays can normalize back to defaults, risking accidental all-role/all-surface access.
- P1: Parent Nova Lens history contract is inconsistent: storage helper has parent-linked visibility, but the route blocks parents.
- P1: Retention is enforced only when a new run is recorded; history reads can show stale runs after retention changes.
- P1: Policy changes lack immutable policy-change audit history.

## Current S10 Read-Only Findings

- Existing API E2E already covers guest registration-required mode, admin policy disable, overlong selection blocking, and redacted admin history.
- Existing teacher operations E2E covers notice/roster operations, but S10 did not find a direct AI governance panel assertion in the first pass.
- `recordNovaLensRun` prunes old runs using `policy.retention_days` when a new run is recorded.
- `listNovaLensRunsForUser` uses role-aware visibility, including teacher class visibility and admin global visibility.
- `GET /api/nova-lens/runs` currently restricts endpoint access to teacher/admin before applying per-run visibility.
- The overlay passes selected text into the AI Tutor panel as the requester's visible initial input; S07/S12 must verify blocked/sensitive selections are not persisted or shared unsafely.

## Handoff State

- S10 spawned S07, S12, S13, and S11 worker agents with disjoint scopes and this release gate as the coordination target.
- S10 did not edit Nova Lens or AI Tutor feature code.
- S10 ran `npm run type-check`; result: passed.
- S07 completed live provider QA; result: NO-GO today. DeepSeek direct redacted probe passed, and `/api/ai-tutor/status` reported configured live `deepseek-v4-pro`, but Nova Lens API E2E failed on the test DB/admin-promotion helper (`no such table: app_state`), the live role/language matrix did not complete in the gate window, and final type-check was blocked by an unrelated strict-null error in `tests/e2e/mainland-pep-junior-lessons-smoke.spec.ts`.
- S07 made one S07-owned mitigation in `components/ai/NovaLensGlobalOverlay.tsx`: blocked Nova Lens runs no longer echo raw selected text or raw selection context into the AI Tutor panel/draft. Server-side blocked-response minimization remains required.
- S12 completed backend/API governance review; result: not release-ready. `npm run type-check` passed, but Nova Lens API E2E gate did not pass in this workspace: first run was 3/4 with the redaction-history case timing out, then reruns were blocked by `ENOSPC` and Playwright web-server startup timeout.
- S12 recorded backend/API blockers: selected-text-only policy scanning, empty role/surface arrays normalizing back to broad defaults, parent history route/storage contract mismatch, retention enforced only on write, and missing immutable policy-change audit history.
- S13 completed teacher operations UX review; result: not release-ready. No confirmed P0 UI leak, but P1 blockers remain: teacher-operations E2E failed once at `POST /api/teacher/notices` with `ECONNRESET`, rerun/mobile pass was blocked by local `ENOSPC`, and existing E2E does not assert `/teacher/operations/ai-governance` teacher-vs-admin behavior.
- S13 flagged an S12/S07 decision point: `GET /api/nova-lens/runs` includes full Nova Lens policy data for non-admin teachers; confirm whether that payload scope is intended for read-only governance.
- S11 completed E2E release gate report; result: HOLD. S11 added/confirmed focused E2E coverage for Nova Lens seeded reply no-resubmit behavior, teacher read-only governance UI, admin policy edit/restore UI, and a gated live-provider Nova Lens smoke path. `npm run type-check` passed after a tiny S11 E2E type guard fix, and `git diff --check` passed for touched E2E files.
- S11 targeted suite did not pass: `nova-lens-api`, `lesson-ai-selection`, and `teacher-operations` failed before test execution because Playwright web-server startup timed out at 240s while Next remained in build/type-checking. The live provider smoke skipped safely because `NOVA_LENS_LIVE_PROVIDER_SMOKE` was not enabled.
- Final release state remains HOLD / NO-GO.
