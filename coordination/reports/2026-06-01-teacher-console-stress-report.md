# Teacher Console Stress QA Report

- Report date: 2026-06-02
- Reporting window target: 2026-06-01 overnight plan
- Session: S11 QA and release quality
- Scope: Teacher Console pages, `app/api/teacher/*`, `/api/assignments`, and teacher question generation provider path
- Code-change policy: S11 test/report assets only. No teacher feature code, API business logic, shared types, package/config files, real env files, or generated output were edited.

## Executive Summary

S11 implemented the requested Teacher Console stress assets and ran the initial stress passes with local isolated data. The final production build completed successfully, so there is no confirmed current P0 build blocker. However, earlier build attempts were nondeterministic, and the stress runs exposed P1 runtime stability risks: the isolated app stopped accepting connections during browser navigation, and the API stress suite hit a socket hang up during 50-way class creation.

The 8-hour soak was not started because the acceptance gate requires the app to survive initial page/API stress first. Running a long soak after the isolated server had already refused connections would produce noisy evidence rather than a useful overnight signal.

No secrets, API keys, or cookie values are intentionally written in this report. Some Playwright artifacts may contain local auth cookies in request call logs; keep `test-results/` internal and do not share those artifacts externally without redaction.

## Assets Added Or Changed

- `tests/e2e/teacher-console-stress.spec.ts`
  - Browser-level route matrix, interaction checks, hostile long text, repeated actions, download/export checks, and mobile-compatible coverage.
- `tests/e2e/teacher-console-api-stress.spec.ts`
  - API auth/role probes, invalid payload checks, export/download probes, `/api/assignments`, concurrency gradients, Live classroom paths, and EdUHK question-generation provider path.
- `tests/e2e/isolated-app.ts`
  - Added `liveProviders: true` support so provider env vars are not blanked for explicit live-provider checks.
  - Hardened isolated shutdown to terminate exact spawned process trees instead of using a broad negative process-group kill.
- `coordination/reports/2026-06-01-teacher-console-stress-report.md`
  - This report.
- `coordination/session-logs/2026-06-02-S11.md`
  - S11 handoff log.

## Environment

- Local isolated app mode with demo seed and isolated SQLite test database.
- Auto-selected Playwright ports for isolated app runs.
- `PLAYWRIGHT_ISOLATED_FORCE_DEV=1` used for the new stress suites after production build instability was observed during preflight.
- Live provider mode was enabled only for the EdUHK question-generation path. S11 did not read or print secret values.

## Commands And Results

| Command | Result |
| --- | --- |
| `command -v npx` | Passed. |
| `npm run type-check` | Passed after test/helper changes. |
| `npm run build` | Final rerun passed. Earlier attempts showed one `143` exit and one `ENOENT .next/build-manifest.json` failure before the final clean pass. |
| `PLAYWRIGHT_PORT=3742 npx playwright test tests/e2e/teacher-console-button-matrix.spec.ts tests/e2e/teacher-workspace.spec.ts tests/e2e/teacher-student-cross-role.spec.ts --project=desktop-chrome --reporter=line --retries=0` | Failed: 13 passed, 2 failed, 1 skipped, 1 did not run. |
| `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_ISOLATED_FORCE_DEV=1 npx playwright test tests/e2e/teacher-console-api-stress.spec.ts --project=desktop-chrome --grep "auth, role boundaries" --reporter=line --retries=0` | Failed on 50-way class create with `socket hang up`. |
| `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_ISOLATED_FORCE_DEV=1 npx playwright test tests/e2e/teacher-console-stress.spec.ts --project=desktop-chrome --reporter=line --retries=0` | Failed with `net::ERR_CONNECTION_REFUSED` at `/teacher/assignments/new`. |
| `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_ISOLATED_FORCE_DEV=1 npx playwright test tests/e2e/teacher-console-stress.spec.ts --project=mobile-chrome --reporter=line --retries=0` | Inconclusive: process exited abnormally without a Playwright summary. |
| `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_ISOLATED_FORCE_DEV=1 npx playwright test tests/e2e/teacher-console-api-stress.spec.ts --project=desktop-chrome --grep "EdUHK" --reporter=line --retries=0` | Passed twice. Exact provider HTTP status attachments were not retained for passing tests. |

## Coverage Attempted

### Teacher Pages

The browser stress suite targets:

- `/teacher`
- `/teacher/classes`
- `/teacher/classes/[classId]`
- `/teacher/students/[studentId]`
- `/teacher/analytics`
- `/teacher/rewards`
- `/teacher/live`
- `/teacher/assignments`
- `/teacher/assignments/new`
- `/teacher/assignments/[assignmentId]`
- `/teacher/resources`
- `/teacher/assessments`
- `/teacher/assessments/new`
- `/teacher/assessments/[assessmentId]`
- `/teacher/reports`
- `/teacher/inbox`

Desktop execution reached `/teacher/assignments/new` before the isolated app refused connections.

### API Areas

The API stress suite targets the Teacher Console route families for dashboard, classes, students, assignments, submissions, resources, assessments, reports, inbox, rewards, gamification, analytics, live classroom, question generation, plus the shared student assignment read route `/api/assignments`.

The first full API stress path completed auth/role probes, invalid JSON/payload probes, upload/export/download probes, `/api/assignments`, 5-way class creation, and 20-way assignment creation before failing at 50-way class creation.

### External Provider Path

The EdUHK question-generation path completed two live-provider-mode stress passes. If credentials were present, provider cost and rate-limit usage may have been incurred. No provider secret values were read or logged by S11. The test accepted either successful generation or graceful provider/config errors; no assertion failure or secret-looking output was observed.

## Findings

### P1 - Build/test harness instability before final clean build

- Area: S10 build/test harness, local Next artifact isolation
- Expected: `npm run build` should be repeatable in a dirty worktree without stale `.next` module errors when no feature code changes are made by S11.
- Actual: Earlier build attempts produced one fast `143` exit and one `ENOENT .next/build-manifest.json` failure. A final rerun completed successfully.
- Impact: The final build is green, but nondeterministic build artifacts reduce confidence in production-mode E2E when other same-repo processes or stale generated output are present.
- Recommended owner: S10.
- Recommended next step: Re-run two consecutive clean production builds in a quiet local window before using production-mode Playwright as a release gate.

### P1 - API stress: 50-way class create caused socket hang up

- Area: `/api/teacher/classes`, backend/server/storage stability
- Expected: 50 concurrent class creation requests should return controlled 2xx/4xx responses, or at minimum no process-level connection reset.
- Actual: The stress run failed with `apiRequestContext.post: socket hang up` during the `50-way class create` phase.
- Evidence:
  - `test-results/teacher-console-api-stress-16286-s-stay-below-unexpected-5xx-desktop-chrome/error-context.md`
  - `test-results/teacher-console-api-stress-16286-s-stay-below-unexpected-5xx-desktop-chrome/trace.zip`
- Notes: The call log artifact may include a local auth cookie. Do not share externally without redaction.
- Recommended owner: S12 for backend/storage/API behavior, with S13 for teacher workflow impact.
- Recommended next step: Reproduce with server logs enabled and inspect SQLite write contention, request-body validation, and error handling around teacher class creation.

### P1 - Browser stress: isolated app refused connections at assignment creation route

- Area: Teacher Console page/runtime stability
- Expected: The 16-page route matrix should navigate all Teacher Console pages without unhandled page errors, 5xx responses, or server exit.
- Actual: Desktop stress failed with `page.goto: net::ERR_CONNECTION_REFUSED` at `http://127.0.0.1:<isolated-port>/teacher/assignments/new`.
- Evidence:
  - `test-results/teacher-console-stress-tea-c463f-nputs-exports-and-downloads-desktop-chrome/error-context.md`
  - `test-results/teacher-console-stress-tea-c463f-nputs-exports-and-downloads-desktop-chrome/test-failed-1.png`
  - `test-results/teacher-console-stress-tea-c463f-nputs-exports-and-downloads-desktop-chrome/video.webm`
  - `test-results/teacher-console-stress-tea-c463f-nputs-exports-and-downloads-desktop-chrome/trace.zip`
- Recommended owner: S10 for harness/process stability first, then S12/S13 if reproduced as product runtime failure.
- Recommended next step: Re-run desktop route matrix after S10 confirms isolated process lifecycle and clean `.next` state; capture Next stdout/stderr around the refusal.

### P2 - Existing baseline: student messaging status copy/test mismatch

- Area: `tests/e2e/teacher-student-cross-role.spec.ts`
- Expected by test: row text matching `/not-started/i`.
- Actual UI text observed by the test: `Not started-No recordSave`.
- Evidence:
  - `test-results/teacher-student-cross-role-a20e6-messaging-stay-synchronized-desktop-chrome/error-context.md`
- Impact: Likely selector/copy expectation brittleness, not a confirmed product crash.
- Recommended owner: S11 for test expectation cleanup, or S13 if the UI copy/spacing should change.

### P2 - Existing baseline: resource upload assertion hits duplicate visible title

- Area: `tests/e2e/teacher-workspace.spec.ts`
- Expected by test: unique `page.getByText(resourceTitle)`.
- Actual: Strict mode violation because the uploaded resource title resolved to two visible elements.
- Evidence:
  - `test-results/teacher-workspace-teacher--1f6fe-ources-and-assessments-work-desktop-chrome/error-context.md`
- Impact: Likely selector brittleness or legitimate duplicate rendering to review; not a confirmed upload failure.
- Recommended owner: S11 for selector hardening, S13 if duplicate UI rendering is not intended.

### P2 - Mobile stress inconclusive

- Area: mobile Teacher Console stress
- Expected: Playwright summary with pass/fail artifacts.
- Actual: The mobile run exited abnormally with no final Playwright summary. The related output directory was empty, while a transient video artifact remained under `test-results/.playwright-artifacts-0/`.
- Impact: Mobile robustness is not certified by this run.
- Recommended owner: S10/S11.
- Recommended next step: Re-run mobile after fixing isolated process lifecycle and after the desktop route/API P1 items are stable.

## Checks Not Run

- Full 8-hour overnight soak: not run because initial API/browser stress uncovered P1 runtime instability first.
- Remaining API stress phases after the 50-way class creation failure inside the broad API test: not reached in that run.
- Full mobile pass: inconclusive because the test process ended without a summary.
- No live AI Tutor content-generation quality test was run beyond the scoped teacher EdUHK route path.

## Acceptance Criteria Status

| Criterion | Status |
| --- | --- |
| 0 production build failure | Partially met. Final build passed, but earlier same-session build instability remains P1 risk. |
| 0 unhandled page error / server refusal | Not met. Desktop stress hit connection refused. |
| 0 unexpected 500 / process-level API failure | Not met. API stress hit socket hang up during 50-way class creation. |
| 0 auth bypass | No bypass observed in the completed auth/role probes. |
| 0 secret leakage | No secret values intentionally logged by S11. Playwright artifacts may contain local auth cookies and must remain internal. |
| Critical teacher workflows remain usable after stress | Not certified. Initial stress failed before soak. |

## Owner Recommendations

- S10: Stabilize local isolated Next lifecycle and build artifact isolation; require two consecutive clean `npm run build` runs before production-mode E2E gates.
- S12: Investigate `/api/teacher/classes` under high write concurrency and ensure controlled responses instead of socket resets.
- S13: Review teacher workflow impact for class creation and assignment creation page reachability once S10/S12 isolate the runtime cause.
- S11: Harden the two existing baseline test assertions and re-run desktop/mobile stress after the P1 lifecycle/API issues are addressed.
- S19/S07: If exact live provider behavior is required, provide a quiet provider-smoke window and cost/rate-limit budget; S11 should continue redacting all env values.
