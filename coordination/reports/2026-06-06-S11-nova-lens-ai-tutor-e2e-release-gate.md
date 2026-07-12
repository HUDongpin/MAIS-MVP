# S11 Nova Lens / AI Tutor E2E Release Gate - 2026-06-06

## Final recommendation

Status: PASS after follow-up rerun.

The earlier Playwright release-harness startup timeout was cleared by later isolated reruns. The targeted Nova Lens release suite now executes successfully, the original login/setup failure did not reproduce, teacher/admin governance restore is proven, and the gated live-provider smoke passed with redacted output.

## Scope

- Session: S11, QA and release quality.
- Write scope used: `tests/e2e/`, `coordination/session-logs/2026-06-06-S11.md`, `coordination/reports/`.
- No product/source files in `app/`, `components/`, `lib/`, or `data/` were edited.
- No secret values were printed, logged, staged, or committed.

## Coverage status

Confirmed existing or added E2E coverage:

- Student lesson selection -> Nova Lens -> AI Tutor seeded reply: `tests/e2e/lesson-ai-selection.spec.ts`.
- Nova Lens seeded reply does not resubmit the same selection to `/api/ai-tutor`: added assertion in `tests/e2e/lesson-ai-selection.spec.ts`.
- Practice question selection with `questionId`: `tests/e2e/lesson-ai-selection.spec.ts`.
- Guest registration-required selection path: `tests/e2e/lesson-ai-selection.spec.ts` and `tests/e2e/nova-lens-api.spec.ts`.
- API guest, policy-disabled, overlong, sensitive-redaction, empty role/surface policy, scoped run history, and no raw `selectedText` in history: `tests/e2e/nova-lens-api.spec.ts`.
- API custom-question/surrounding-context screening, invalid action/surface blocking, retention-on-read, and admin policy audit events: `tests/e2e/nova-lens-api.spec.ts`.
- Teacher operations notice/roster smoke: `tests/e2e/teacher-operations.spec.ts`.
- Teacher read-only governance UI and admin policy edit/restore UI: added focused assertions in `tests/e2e/teacher-operations.spec.ts`.
- Live-provider Nova Lens smoke path: added `tests/e2e/nova-lens-live-provider.spec.ts`, gated by `NOVA_LENS_LIVE_PROVIDER_SMOKE=1` and skipped with redacted reason when not enabled or provider env is unavailable.

## Checks run

1. `PLAYWRIGHT_PORT=3078 PLAYWRIGHT_RUN_ID=s11-nova-gate-baseline-20260606 npx playwright test tests/e2e/nova-lens-api.spec.ts tests/e2e/lesson-ai-selection.spec.ts tests/e2e/teacher-operations.spec.ts --project=desktop-chrome --reporter=list`
   - Result: failed before test execution.
   - Evidence: `Error: Timed out waiting 240000ms from config.webServer.`
   - Artifact root: `.tmp/e2e-run-s11-nova-gate-baseline-20260606/`.
   - `.tmp/e2e-run-s11-nova-gate-baseline-20260606/test-results/.last-run.json` reports `failedTests: []`.
   - `.tmp/e2e-run-s11-nova-gate-baseline-20260606/next-dist/diagnostics/build-diagnostics.json` showed build stage `type-checking`.

Follow-up checks:

5. `PLAYWRIGHT_PORT=3103 PLAYWRIGHT_RUN_ID=s11-nova-targeted-policy-audit-20260606 npx playwright test tests/e2e/nova-lens-api.spec.ts tests/e2e/lesson-ai-selection.spec.ts tests/e2e/teacher-operations.spec.ts --project=desktop-chrome --reporter=list`
   - Result: passed, 18/18.
   - Classification: the earlier S10 `loginAsDemoStudent()` setup failure did not reproduce in the targeted rerun.

6. `NOVA_LENS_LIVE_PROVIDER_SMOKE=1 PLAYWRIGHT_PORT=3104 PLAYWRIGHT_RUN_ID=s11-nova-live-provider-policy-audit-20260606 npx playwright test tests/e2e/nova-lens-live-provider.spec.ts --project=desktop-chrome --reporter=list`
   - Result: passed, 1/1.
   - Evidence: authenticated student and admin Nova Lens runs completed without provider fallback or sensitive leakage.

7. `PLAYWRIGHT_PORT=3102 PLAYWRIGHT_RUN_ID=s12-nova-policy-audit-20260606 npx playwright test tests/e2e/nova-lens-api.spec.ts --project=desktop-chrome --reporter=list`
   - Result: passed, 10/10.

2. `npm run type-check`
   - First result: failed on an S11 E2E type issue in `tests/e2e/mainland-pep-junior-lessons-smoke.spec.ts`.
   - Fix: added an explicit `number` guard before passing the expected topic count to `toHaveLength`.
   - Final result: passed.

3. `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:9 npx playwright test tests/e2e/nova-lens-live-provider.spec.ts --project=desktop-chrome --reporter=list`
   - Result: 1 skipped.
   - Redacted skip reason: `NOVA_LENS_LIVE_PROVIDER_SMOKE` was not enabled; no provider credential values printed or logged.

4. `git diff --check -- tests/e2e/lesson-ai-selection.spec.ts tests/e2e/teacher-operations.spec.ts tests/e2e/nova-lens-live-provider.spec.ts tests/e2e/mainland-pep-junior-lessons-smoke.spec.ts`
   - Result: passed.

## Classification

- S10 login/setup failure: not reproduced in follow-up targeted suite.
- S11 fresh reproduction attempt: the initial attempt was blocked before tests ran by Playwright web-server startup timeout.
- Current release-gate classification: PASS for the Nova Lens / AI Tutor targeted E2E gate after successful follow-up reruns.

## Files changed

- `tests/e2e/lesson-ai-selection.spec.ts`: added no-resubmit assertion for seeded Nova Lens AI Tutor reply.
- `tests/e2e/teacher-operations.spec.ts`: added teacher read-only governance UI and admin policy edit/restore coverage.
- `tests/e2e/nova-lens-live-provider.spec.ts`: added gated live-provider Nova Lens smoke path with redacted skip handling.
- `tests/e2e/nova-lens-api.spec.ts`: added governance regression coverage for policy audit events, custom context screening, invalid action/surface blocking, and retention-on-read.
- `tests/e2e/mainland-pep-junior-lessons-smoke.spec.ts`: tiny S11 E2E type guard fix so `npm run type-check` passes.
- `coordination/reports/2026-06-06-S11-nova-lens-ai-tutor-e2e-release-gate.md`: this gate report.
- `coordination/session-logs/2026-06-06-S11.md`: handoff appended.

## Owner handoffs

- S22/S10: the earlier isolated web-server startup timeout remains worth monitoring as a harness reliability issue, but it is no longer blocking this Nova Lens gate.
- S12/S07/S13: targeted API policy/redaction, AI Tutor seeded reply behavior, teacher/admin governance, and live-provider smoke all have green follow-up evidence.
- S07/S19: continue to run `NOVA_LENS_LIVE_PROVIDER_SMOKE=1` only when approved provider env is available; keep credential values out of output.
