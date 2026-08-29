# A22 Classroom Load Staging-Only Forward-Port

- Date: 2026-08-29
- Agent ID / owner: A22
- Workstream: Release engineering; classroom-concurrency staging smoke
- Branch: `codex/classroom-load-staging-only-20260829`
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a22-classroom-load-staging-only-20260829`
- Target PR: pending
- Creation date: 2026-08-29 HKT
- Expected closeout date: 2026-08-30 HKT
- Baseline: live `origin/main` at `baca84e77abae1e16cfd53d497c6f7ee734d4679`
- Source-only reference: old commit `eb77c9310dae91f87db6ba2982d7e5b61cd2ff9f`; no cherry-pick and no old branch/worktree mutation
- Status: Completed after independent-review follow-up; ready for one reviewed follow-up commit and normal push

## Objective

Forward-port only the valuable classroom-concurrency smoke onto current `main`, with remote execution restricted to an exact staging-host allowlist and local loopback labeled as non-staging verification.

## Exact write scope

- `scripts/classroom-load-smoke.mjs`
- `scripts/classroom-load-smoke.test.mjs`
- `package.json`
- `scripts/release-governance.test.mjs`
- `RELEASE.md`
- `coordination/session-logs/2026-08-29-A22-classroom-load-staging-only.md`

## Explicit exclusions

- `scripts/dashboard-latency-smoke.mjs`
- `scripts/prod-certification.test.mjs`
- Production certification or deployment integration
- Live/staging execution, deploys, provider/API writes, credentials, or secret values
- `main`, `perf/classroom-load-smoke`, and its old linked worktree

## Baseline evidence

- New worktree started clean at the exact live-main SHA.
- `node --test --test-concurrency=1 scripts/release-governance.test.mjs scripts/prod-certification.test.mjs`: exit 0; 119 tests, 108 pass, 11 skip, 0 fail.

## TDD evidence

- RED: `node --test scripts/classroom-load-smoke.test.mjs` exited 1 with 9 tests: 1 pass and 8 expected assertion failures. Failures proved current `main` lacked the standalone smoke/package/doc contract and the required target policy, redirect lock, bounded config, current-API request builders, aggregation, and redacted report exports. No network, credential, or syntax error caused the RED.
- GREEN:
  - `node --test scripts/classroom-load-smoke.test.mjs`: exit 0; 9/9 pass.
  - `node scripts/classroom-load-smoke.mjs --self-test`: exit 0; PASS.
  - `node --test --test-concurrency=1 scripts/release-governance.test.mjs`: exit 0; 95 tests, 84 pass, 11 skip, 0 fail.
  - `node --test scripts/prod-certification.test.mjs`: exit 0; 24/24 pass.
  - `npm run type-check`: exit 0.
  - `node --check scripts/classroom-load-smoke.mjs`: exit 0.
  - `node --check scripts/classroom-load-smoke.test.mjs`: exit 0.
  - `git diff --check` and `git diff --cached --check`: exit 0.

## Handoff

- Files changed:
  - `RELEASE.md`
  - `coordination/session-logs/2026-08-29-A22-classroom-load-staging-only.md`
  - `package.json`
  - `scripts/classroom-load-smoke.mjs`
  - `scripts/classroom-load-smoke.test.mjs`
  - `scripts/release-governance.test.mjs`
- Checks run: Recorded above, including the current-main baseline and TDD RED/GREEN.
- Checks not run: No local workload, staging workload, live workload, deploy, browser smoke, provider call, or API write was run by assignment.
- Security boundary: Remote mode requires an explicit exact staging-host allowlist; known production hosts have no bypass; redirects remain on the requested origin; secrets and custom identity values never enter reports or logs; local output is permanently marked non-staging evidence.
- Explicitly unchanged: `scripts/dashboard-latency-smoke.mjs`, `scripts/prod-certification.test.mjs`, `package-lock.json`, production certification/deployment sources, `main`, and the old branch/worktree.
- Residual review needs: A10/A22 should review the runbook/package-governance slice and A11 should review the source-policy/unit coverage before PR merge. A separately authorized staging run with a disposable staging-only identity is still required before this command can provide staging capacity evidence; default p95 budgets also remain subject to release-owner acceptance.
- Dirty state final action: Reviewed commit containing exactly the six files above; final SHA and push result are recorded on the branch and in the owner response.
- Worktree lifecycle action: Retain clean with upstream pending PR review.

## Independent CHANGES_REQUESTED follow-up

- Review state: Two independent reviews returned `CHANGES_REQUESTED` with Important findings.
- Follow-up base/local/upstream/live remote SHA: `dd4a63678d9d42a92a48924441523e0c99b484a9`.
- Follow-up commit SHA: Recorded on the branch and in the owner response after this log is committed; a Git commit cannot contain its own final SHA.

### Findings fixed

1. Remote staging rejects noncanonical explicit HTTPS ports; canonical `:443` remains the standard origin.
2. `test:release-governance` now directly executes the classroom unit/source-policy test, and both governance exact-command assertions plus the frozen command hash are updated.
3. Every HTTP body uses an endpoint-specific streaming byte limit. Oversized/invalid `Content-Length`, oversized unknown-length streams, and timeouts return fixed redacted categories; readers are canceled/released and raw bodies/errors do not enter failures or reports.
4. Report persistence now uses an exact real `0700` artifact directory, exclusive/no-follow `0600` same-directory temp file, file-handle validation, bounded write, fsync/close, atomic rename, and final regular-file/link-count/mode verification. Symlinked parent components fail closed; pre-existing final symlink/hardlink targets remain unmodified.
5. Reports require exactly `attempts`, `lesson-progress`, and `dashboard`, with no duplicates/extras and exactly `seatConcurrency * rounds` samples per endpoint; partial or inconsistent topology fails closed.
6. The runner, CLI, environment, report, and runbook now use `seatConcurrency`, `--seat-concurrency`, and `CLASSROOM_LOAD_SEAT_CONCURRENCY`, declaring `loadShape: single-identity-seat-fanout` and `distinctIdentities: 1` without claiming distinct-student/database fanout.
7. Credential login is immediately rebound through session-state; cookie auth is likewise validated. Session-state is checked again outside measured traffic at every round boundary, and a mismatch stops before workload discovery or any measured write.
8. The 301/302/303/307/308 write redirect matrix, missing/invalid Location, redirect cap, cancellation, cross-origin rejection, and fixed codes are covered.
9. Production deny/no-bypass/no-integration and current API expected-user contracts remain unchanged.

### Follow-up TDD and verification

- RED: `node --test scripts/classroom-load-smoke.test.mjs` exited 1 with 16 tests: 4 pass and 12 expected failures corresponding to the review findings above.
- Focused GREEN: the same command exited 0 with 16/16 pass.
- Intermediate active-CI run exposed one second stale exact-command assertion in `scripts/release-governance.test.mjs`; after updating that active assertion, the full command passed.
- `node scripts/classroom-load-smoke.mjs --self-test`: exit 0; PASS.
- `npm run test:release-governance`: exit 0; output visibly ran all 16 classroom tests; 118 total, 107 pass, 11 skip, 0 fail.
- `node --test scripts/prod-certification.test.mjs`: exit 0; 24/24 pass.
- `npm run type-check`: exit 0.
- Both Node syntax checks, package JSON parse, `git diff --check`, and `git diff --cached --check`: exit 0.
- No local/staging/live workload, deploy, provider action, API write, or worktree artifact was produced.

### Follow-up scope and residual review

- Exact six-file scope remains the runner, runner test, package command, release-governance test, release runbook, and this A22 log.
- `scripts/dashboard-latency-smoke.mjs`, `scripts/prod-certification.test.mjs`, `package-lock.json`, production certification/deployment code, `main`, and the old branch/worktree remain unchanged.
- Residual review: A10/A22 runbook/package review and A11 security/test review remain required before merge. A separately authorized exact-staging run on one disposable identity remains required for capacity evidence.

## Remaining Important: artifact parent-directory TOCTOU

- Fresh-review base/local/upstream/live remote SHA: `7bf436ac9c6433e45d71740b7888f6900fb99e6f`.
- Final TOCTOU follow-up commit SHA: Recorded on the branch and in the owner response after this log is committed; a Git commit cannot contain its own final SHA.
- Scope: `scripts/classroom-load-smoke.mjs`, `scripts/classroom-load-smoke.test.mjs`, and this A22 log only. Package, governance, runbook, production, dashboard, and lock files are unchanged.

### RED

- `node --test scripts/classroom-load-smoke.test.mjs`: exit 1; 19 tests, 17 pass and 2 expected failures.
- Expected failures:
  - Existing writer did not reject a current-user-owned `.tmp` with mode `0777` before artifact creation.
  - Existing writer had no exported cwd-bound isolated child launcher, so the deterministic parent-directory swap attack was not contained by a kernel-bound working directory.
- The newly committed two-round continuity regression passed during RED: an identity swap before round 2 leaves exactly round 1's attempt/progress/dashboard measured calls and writes no report.

### Fix

- Repository root and `.tmp` are bound as current-user-owned real directories and rejected when group/other writable.
- Directory identity uses exact `dev`, `ino`, `uid`, and mode. Artifact directory mode is exactly `0700`.
- Directory creation and artifact publication use isolated child Node processes with `cwd` bound to the validated parent/artifact vnode. Each child immediately `lstat(".")` and compares the expected identity before any write.
- The cwd-bound preparation steps create/validate `.tmp` and `classroom-load-smoke` using relative names only; no checked parent pathname is reused for a write.
- The publication child accepts a bounded stdin payload, uses only relative temp/final names, opens temp with `O_CREAT|O_EXCL|O_NOFOLLOW` at `0600`, verifies regular file plus `nlink === 1`, performs bounded writes, fsyncs/closes, atomically renames, reopens final with `O_NOFOLLOW`, and verifies exact size/digest/stat.
- Child stdout/stderr are bounded. Success/failure output is fixed and contains no payload or raw error.
- Parent rebinds the nominal artifact path after publication, compares exact directory identity, launches a separate cwd-bound verifier for exact final bytes/stat, and rebinds once more before returning.
- Deterministic adversarial test renames the validated artifact directory and installs an outside symlink immediately before publication child launch. The child returns fixed identity mismatch; neither the outside target nor renamed original directory receives a report.

### GREEN

- Focused `node --test scripts/classroom-load-smoke.test.mjs`: exit 0; 19/19 pass.
- `node scripts/classroom-load-smoke.mjs --self-test`: exit 0; PASS.
- `npm run test:release-governance`: exit 0; 121 total, 110 pass, 11 skip, 0 fail; all 19 classroom tests ran through the active command.
- `node --test scripts/prod-certification.test.mjs`: exit 0; 24/24 pass.
- `npm run type-check`: exit 0.
- Both Node syntax checks and `git diff --check`: exit 0.
- No local/staging/live workload, report artifact, deploy, provider action, or API write was produced.
