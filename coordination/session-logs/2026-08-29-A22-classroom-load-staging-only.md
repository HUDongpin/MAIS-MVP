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
- Status: Completed; ready for reviewed commit and first upstream push

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
