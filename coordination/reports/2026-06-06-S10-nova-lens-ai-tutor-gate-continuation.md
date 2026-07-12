# S10 Nova Lens / AI Tutor Gate Continuation

Date: 2026-06-06 HKT

## Decision

Status: **PASS** for the Nova Lens text/governance release gate.

The continuation closed the remaining S11/S22 production-runner blocker. The full targeted production Playwright suite now exits cleanly with 18/18 passing on current source. This aligns with the earlier S07/S11/S12/S13 final gate reports: live Nova Lens provider smoke is green, backend policy/redaction is green, teacher/admin governance UX is green, and targeted E2E coverage is green.

AI Tutor image upload live completion remains a separate non-blocking media follow-up from prior S07 evidence because it returned safe fallback, not unsafe output. It is not a blocker for the Nova Lens text/governance release path.

## Changes Made

- Fixed `components/ai/AITutorProvider.tsx` so an explicit `openTutor(..., { initialReply })` request from Nova Lens is not overwritten by late AI Tutor draft initialization.
- Added an API-login helper for Nova Lens E2E student cases, keeping the gate focused on Nova Lens instead of the slower login UI path.
- Increased `lesson-ai-selection.spec.ts` cold UI test timeout to 60s after production Playwright showed the first browser context setup can consume the default 30s before test steps begin.
- Hardened the admin governance E2E wait so it waits for the loaded policy input, not just the page heading.
- Added a narrow retry around the E2E API-login helper for transient transport errors such as `ECONNRESET`, after the production run hit a one-off API request reset before any Nova Lens assertion.

## Green Evidence

- `npm run type-check`: passed after the S07/S11 edits.
- `git diff --check` on touched continuation files: passed.
- Manual dev-server API probes:
  - guest `/api/nova-lens/runs`: 200 registration-required.
  - demo student/teacher login APIs: 200.
  - teacher/admin `/api/nova-lens/runs?limit=80`: 200 with `{ policy, runs }`.
  - admin `/api/admin/nova-lens/policy`: 200.
- `tests/e2e/nova-lens-api.spec.ts` against isolated dev server: 10/10 passed on current source, including immutable policy audit events.
- `tests/e2e/lesson-ai-selection.spec.ts` against isolated dev server: 4/4 passed.
- `tests/e2e/teacher-operations.spec.ts` against isolated dev server: 4/4 passed.
- Production Playwright webServer no longer timed out at startup. The full targeted production run entered tests and reached 16/17 passed; the only failure was the first test timing out during browser context setup before app steps ran.
- After the 60s timeout change, the production lesson-only run displayed all 4 lesson selection tests passing. The Playwright runner then hung during teardown and was killed, so this is body-level evidence rather than a clean process-exit pass.
- A later production-skip full-suite run used a stale reused production dist and failed the new immutable audit event assertion; a fresh current-source dev run then passed the API suite 10/10, so the stale dist failure is not current source evidence.
- Final continuation production run:
  - Command: `env PLAYWRIGHT_RUN_ID=s10-nova-gate-production-clean-retry PLAYWRIGHT_PORT=3137 LLM_API_KEY= OPENAI_API_KEY= DEEPSEEK_API_KEY= QWEN_API_KEY= npx playwright test tests/e2e/nova-lens-api.spec.ts tests/e2e/lesson-ai-selection.spec.ts tests/e2e/teacher-operations.spec.ts --project=desktop-chrome --reporter=list --trace=off`
  - Result: passed, 18/18, clean process exit in 2.9m.
  - Covered: lesson selection, practice selection with `questionId`, guest registration-required tutor path, Nova Lens policy/redaction/API governance, immutable policy audit events, retention-on-read, teacher read-only governance, and admin policy save/restore.
  - Cleanup: port 3137 was clear after the run, and `tsconfig.json` had no continuation diff.

## Remaining Risks

- No hard blockers remain for Nova Lens text/governance release readiness.
- Keep the earlier isolated Playwright startup/teardown oddities on the S22 harness reliability watchlist, but they did not reproduce in the final targeted production gate.
- This continuation did not read, print, or run live provider secrets. It relies on the already-recorded S07/S11 live-provider smoke evidence, which reports authenticated student and admin Nova Lens runs completing without provider fallback or sensitive leakage.
