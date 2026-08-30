# A10 Promotion Workflow Strict JSON Session Log

- Date: 2026-08-29
- Agent ID: A10
- Owner: A10 — Tooling / CI governance
- Workstream: Tooling / CI governance
- Status: Core implementation committed and pushed; regression-fixture repair verified and scoped to this exact two-file follow-up commit; downstream reviews and lifecycle closeout pending
- Objective: Replace every non-comparator reachable plain `JSON.parse` in the Promotion Shadow workflow with one tracked, bounded, duplicate-key-rejecting current-checkout JSON guard.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a10-promotion-workflow-strict-json-20260829`
- Branch: `chore/a10-promotion-workflow-strict-json-20260829`
- Creation date: 2026-08-29 HKT
- Target PR: `pending (downstream A23 integration)`
- Expected closeout date: 2026-08-30 HKT
- Baseline HEAD: `baca84e77abae1e16cfd53d497c6f7ee734d4679`
- Live `origin/main` at start: `baca84e77abae1e16cfd53d497c6f7ee734d4679`
- Baseline worktree state: clean

## Authorized Write Scope

- `.github/workflows/promotion-shadow.yml`
- `scripts/promotion-workflow-json-guard.mjs`
- `scripts/promotion-workflow-json-guard.test.mjs`
- `scripts/promotion-shadow-workflow-v2.test.mjs` (2026-08-30 continuation: current-checkout workflow fixture only)
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

## 2026-08-30 Continuation Evidence

- Root-cause reproduction: `node --test --test-concurrency=1 scripts/promotion-shadow-workflow-v2.test.mjs` produced 2 passes and 1 failure because the unchanged local fixture executed the hardened workflow step without GitHub Actions' required `GITHUB_WORKSPACE` environment contract.
- The production workflow and strict guard were not weakened. The minimal test-only repair supplies the current `repoRoot` as `GITHUB_WORKSPACE` to that spawned workflow step.
- Focused regression after the repair: 3 passed, 0 failed.
- `npm run test:promotion-gate`: 40 passed, 0 failed.
- `node --test --test-concurrency=1 scripts/release-governance.test.mjs`: 85 passed, 0 failed, 11 contextual skips.
- `node --test --test-concurrency=1 scripts/promotion-workflow-json-guard.test.mjs`: 5 passed, 0 failed.
- `npm run type-check`: passed.
- `git diff --check`: passed.
- Evidence boundary: these are local results for the current worktree bytes. This exact follow-up commit contains only the fixture repair and this log update; no GitHub workflow or required check was triggered.

## 2026-08-30 Quality Review Follow-up

- Independent composition quality review found one blocking issue: the strict JSON guard's five behavioral tests were not executed by any required Promotion or CI command, so future guard-internal regressions could retain static call-site wiring while weakening parser behavior.
- TDD RED: the focused release-governance assertion failed only because `test:promotion-gate` omitted `scripts/promotion-workflow-json-guard.test.mjs`.
- Minimal fix: add that exact behavioral suite to the existing `test:promotion-gate` Node test command and freeze the required wiring in `scripts/release-governance.test.mjs`.
- Focused governance assertion: 1 passed, 0 failed after the fix.
- Required Promotion gate: 45 passed, 0 failed, including all five strict JSON guard tests.
- Release-governance: 85 passed, 0 failed, 11 contextual skips.
- `npm run type-check`: passed.
- `git diff --check`: passed.
- Follow-up scope: `package.json`, `scripts/release-governance.test.mjs`, and this append-only A10 session log. No Shadow, workflow dispatch, PR #220 update, main merge, deployment, production mutation, or remote deletion occurred.

## Ownership And Collaboration Status

- `coordination/release-intake/owner-pathspecs.json` assigns `.github/workflows/promotion-shadow.yml` exactly to A10 and routes coordination to A11, A22, and A23. Its broad A10 tooling/docs/config entry also covers `scripts/**` and `coordination/**`.
- There is no dedicated owner-pathspec entry for this complete strict-JSON session slice as a named package. The user's exact task authorization assigned the workflow, guard, tests, and this session log to A10 for this slice; shared-file reviewers remain pending.
- A11 specification / CI evidence review: pending; no A11 approval is claimed.
- A22 release / isolation review: pending; no A22 approval or release-readiness decision is claimed.
- A23 downstream binding / integration: pending; target PR remains `pending (downstream A23 integration)` and no integration approval is claimed.
- A25 branch/worktree lifecycle closeout: pending; no cleanup or closeout approval is claimed.

## Handoff

- Final state: Reviewed core implementation commit pushed; verified regression-fixture follow-up is scoped to this exact two-file commit; downstream review and integration remain pending.
- Implementation commit: `e78f5b6dc9ca288d5aaf2db127b9c2b394528602`.
- Post-implementation external discovery: original `WORKFLOW_JSON_PARSE_UNTRUSTED` is cleared; the next fail-closed blocker is `WORKFLOW_STRUCTURE_INVALID`.
- Follow-up scope: `scripts/promotion-shadow-workflow-v2.test.mjs` plus this session log only; no Shadow, workflow dispatch, merge, deployment, production action, or PR #220 remote-head update occurred.
- Worktree lifecycle: Retain through pending A11/A22/A23 review and A25 lifecycle closeout; expected closeout date is 2026-08-30 HKT.
