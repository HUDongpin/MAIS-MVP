# MAIS-MVP Parent Console Robustness Stress QA

- Date: 2026-06-02
- Session: S11 QA and release quality
- Scope: `/parent`, `/parent/children/[studentId]`, `/parent/reports`, `/parent/messages`, `/parent/connect`, and `/api/parent/*`
- Feature-code changes: None
- Production credentials/live providers: Not used

## Executive Summary

S11 implemented the Parent Console stress harness but did not run or trust E2E results because the required isolation and build gates failed.

Two unrelated MAIS-MVP Next dev servers were already listening on local ports, and repeated `npm run build` attempts showed nondeterministic `.next` page-module artifact failures. This reproduces and sharpens the baseline concern: Parent Console stress results are not trustworthy until the local Next/build harness is isolated.

No Parent Console product P0/P1 issue was verified in this run because E2E execution was intentionally blocked before the browser/API stress phase.

## Harness Added

- Added `tests/e2e/parent-console-stress.spec.ts`.
- Expanded `tests/e2e/isolated-app.ts` so isolated app runs can use an explicit DB path and preflight the chosen port plus SQLite file holders.
- The stress spec includes:
  - Desktop/mobile page navigation and no `pageerror`/console error/5xx checks.
  - Parent API auth-role matrix for anonymous, student, teacher, parent, and admin.
  - Invalid JSON, missing fields, wrong types, malformed invite codes, lowercase/whitespace invite code, repeated child linking, invalid thread/category/report cases.
  - Privacy checks for student private threads and another parent's linked child.
  - Pending/revoked guardian-link restart checks.
  - Concurrent parent message creation and restart-after-mutation persistence.
  - Same-SQLite multi-process preflight guard.

## Checks Run

| Check | Result | Notes |
| --- | --- | --- |
| `npm run type-check` | Passed | Ran after adding the stress suite. |
| `npm run type-check` | Passed | Reran after adding the active Next-server preflight. |
| Shared preflight for `127.0.0.1:3020` and `.tmp/e2e/hk-math-db.sqlite` | Passed | No listener on `3020`; no holder for the shared E2E DB. |
| `npm run build` attempt 1 | Failed | `PageNotFoundError: Cannot find module for page: /_not-found`. |
| `npm run build` attempt 2 | Passed | First clean build. |
| `npm run build` attempt 3 | Failed | Exit code `143` during validation; no TypeScript diagnostic. |
| `npm run build` attempt 4 | Passed | First clean build in a new sequence. |
| `npm run build` attempt 5 | Failed | Missing page modules for multiple API routes during page-data collection. |
| Existing `tests/e2e/parent-console.spec.ts` | Not run | Blocked because two consecutive clean builds were not achieved. |
| New `tests/e2e/parent-console-stress.spec.ts` | Not run | Blocked by failed build gate and active same-repo Next dev servers. |

## Open Findings

| ID | Severity | Owner | Area | Repro Steps | Expected | Actual |
| --- | --- | --- | --- | --- | --- | --- |
| PC-STRESS-001 | P1 | S10 | Test/build harness | Run `ps -axo pid,ppid,stat,command \| rg -i 'next (build\|start\|dev)\|npm run (build\|start\|dev)\|node .*next'` before Parent Console stress. | No other MAIS-MVP Next server should be listening before stress. | Active MAIS-MVP dev servers were found on `127.0.0.1:3024` and `127.0.0.1:3944`, with `node .../MAIS-MVP/node_modules/.bin/next dev --turbo` processes. |
| PC-STRESS-002 | P1 | S10 | Production build harness | Run `npm run build` repeatedly in the current workspace. | Two consecutive clean production builds before E2E. | Attempts alternated between pass, SIGTERM `143`, and `PageNotFoundError` missing modules such as `/_not-found`, `/api/admin/storage/health`, `/api/ai-tutor/status`, and `/api/assessments/[assessmentId]`. |

## Product Issue Status

No reproducible Parent Console product P0/P1 issue was opened from this run. The stress suite is ready to exercise product behavior once the harness is isolated.

Potential lower-severity API robustness cases are encoded in the new stress suite but remain unverified in this run:

- Invalid parent message category should be rejected instead of silently coerced.
- Invalid parent report ID should be rejected instead of silently ignored.
- Invalid parent message `thread` query should not silently select an unrelated thread.

## Recommended Next Run

1. Coordinate with S10/active sessions to stop or move the existing MAIS-MVP Next dev servers on ports `3024` and `3944`.
2. Confirm no same-repo Next listeners and no shared DB holder:
   `lsof -nP -iTCP -sTCP:LISTEN` and `lsof -nP -- .tmp/e2e/hk-math-db.sqlite*`.
3. Run `npm run build` until two consecutive runs pass.
4. Run existing Parent Console E2E:
   `PLAYWRIGHT_PORT=<unique-port> npx playwright test tests/e2e/parent-console.spec.ts --project=desktop-chrome --project=mobile-chrome`.
5. Run the isolated stress suite:
   `PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test tests/e2e/parent-console-stress.spec.ts --project=desktop-chrome --project=mobile-chrome`.

## Handoff

- S10: Owns build/test harness isolation and should decide how to retire or coordinate active local Next dev servers before the next QA run.
- S12: No backend/API product blocker verified yet; review future stress failures for validation/privacy semantics.
- S14: No parent UI product blocker verified yet; review future stress failures for page/mobile/browser issues.
