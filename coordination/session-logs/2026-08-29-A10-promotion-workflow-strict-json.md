# A10 Promotion Workflow Strict JSON Session Log

- Date: 2026-08-29
- Agent ID: A10
- Workstream: Tooling / CI governance
- Status: In progress
- Objective: Replace every non-comparator reachable plain `JSON.parse` in the Promotion Shadow workflow with one tracked, bounded, duplicate-key-rejecting current-checkout JSON guard.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a10-promotion-workflow-strict-json-20260829`
- Branch: `chore/a10-promotion-workflow-strict-json-20260829`
- Baseline HEAD: `baca84e77abae1e16cfd53d497c6f7ee734d4679`
- Live `origin/main` at start: `baca84e77abae1e16cfd53d497c6f7ee734d4679`
- Baseline worktree state: clean

## Authorized Write Scope

- `.github/workflows/promotion-shadow.yml`
- `scripts/promotion-workflow-json-guard.mjs`
- `scripts/promotion-workflow-json-guard.test.mjs`
- `scripts/release-governance.test.mjs`
- `coordination/session-logs/2026-08-29-A10-promotion-workflow-strict-json.md`

## Forbidden / Held Boundaries

- Do not modify `coordination/integration/promotion-gate-lib.mjs`.
- Do not modify the candidate, Manifest, canonical Receipt, closure, registry, checker, or reaffirmation artifacts.
- Do not run Shadow, deploy, merge, or push `main`.
- Preserve the exact semantic comparator program and its single allowed `JSON.parse`.
- Do not weaken CLI exit/result parity, run-ID, artifact, verification, or final-outcome enforcement.

## Plan

1. Add active workflow and strict-parser tests before implementation.
2. Run them against the baseline and record the expected RED.
3. Add one repo-local strict JSON byte parser with fatal UTF-8 and frozen byte/depth/work/node limits.
4. Route current validation, canonical Receipt copy, fresh/replay Receipts, verification reports, artifact preflight, and final outcome through the tracked current-checkout guard.
5. Run focused and full governance checks, then external discovery.
6. Self-review, exact-stage the authorized slice, commit without amend, recheck live drift, and push with upstream without force.

## Baseline Evidence

- `node --test --test-concurrency=1 scripts/release-governance.test.mjs`: 84 passed, 0 failed, 11 skipped.
- External discovery at the exact baseline: exit 2, result `blocked`, issue `WORKFLOW_JSON_PARSE_UNTRUSTED`.
- Baseline workflow contains 14 `JSON.parse` calls: one exact semantic comparator occurrence and 13 non-comparator occurrences.
- Baseline exact semantic comparator `run` SHA-256: `da19cda092e2f5b6ee2eb3a22c84c18e8a79bf27b95901f7ec419c6d01628d6e`.

## RED Evidence

- Active focused workflow policy test failed as intended before any production change: 1 test, 0 passed, 1 failed.
- The failure enumerated the baseline reachable sites: current validation, canonical Receipt resolution, fresh Receipt, replay Receipt, the exact comparator, verification, artifact preflight, and seven final-outcome parses. Expected: the exact comparator only.
- New guard suite failed as intended before the helper existed: 5 tests, 0 passed, 5 failed.
- Guard failures covered the wished-for API plus complete JSON grammar, fatal UTF-8, duplicate-key redaction at multiple depths, malformed/overflow rejection, and frozen resource limits.

## GREEN Evidence

- `node --test --test-concurrency=1 scripts/promotion-workflow-json-guard.test.mjs`: 5 passed, 0 failed.
- Focused active workflow policy test: 1 passed, 0 failed.
- `node --test --test-concurrency=1 scripts/release-governance.test.mjs`: 85 passed, 0 failed, 11 skipped (the baseline was 84 passed, 0 failed, 11 skipped).
- `git diff --check`: passed.
- `git diff --cached --check`: passed for the staged guard.
- `node --check scripts/promotion-workflow-json-guard.mjs`: passed.
- `actionlint`: unavailable on this host and absent from repository dependencies, so it was not run.
- Current workflow inspection finds exactly one plain `JSON.parse`, in `Compare canonical semantic Receipt digests`.
- Exact semantic comparator `run` SHA-256 remains `da19cda092e2f5b6ee2eb3a22c84c18e8a79bf27b95901f7ec419c6d01628d6e`.
- A pre-commit external discovery correctly stopped at `AUTHORITATIVE_BYTES_DRIFT` because the authorized workflow edit was not yet the current Git `HEAD`; final external discovery must run after the reviewed commit with that exact commit as `--expected-head`.

## Handoff

- Final state: Reviewed commit candidate; commit/push and post-commit discovery pending.
- Resulting branch commit: Pending; the exact post-commit SHA will be reported in the session handoff because a commit cannot contain its own SHA.
- Worktree lifecycle: Retain until parent integration decision.
