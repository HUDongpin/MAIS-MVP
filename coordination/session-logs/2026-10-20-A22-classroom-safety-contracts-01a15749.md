# A22 — classroom smoke safety contracts

- Owner: A22 lane borrow / chat `01a15749-49b4-7b63-adb1-38e7a0df0dca`.
- Branch: `codex/a22-classroom-safety-contracts-20261020`.
- Worktree: `/Users/dongpinhu/.codex/worktrees/classroom-safety-contracts/MAIS-MVP`.
- Baseline: live `origin/main` at `f573ac62c97cb0716054bc516f7d5136491ca002`.
- Target PR: pending; no commit or push assigned.
- Creation date: 2026-10-20, Asia/Hong_Kong.
- Expected closeout date: 2026-10-20 for local handoff; retain the worktree and uncommitted slice for owner review.
- Preparation authority: the current owner-supplied project contract permits task-local branch/worktree creation for implementation; the older contract in the frozen baseline does not withdraw that current authorization.

## Assigned scope

Implement the owner's four classroom smoke requirements:

1. Rejected CLI arguments must not echo synthetic passwords, cookies, or other supplied values.
2. Identity changes, expired sessions, and failed identity checks must stop subsequent rounds and prevent a successful report.
3. Reject invalid numeric configuration without silently changing it; distinguish local from Preview evidence and report virtual seats and actual identities accurately.
4. Reject an oversized serialized report before filesystem side effects, preserving an existing report.

Owned paths: `scripts/classroom-load-smoke.mjs`, its existing test file, the relevant classroom runbook in `RELEASE.md`, and this log. Preserve Preview validation before credential use, current persistence acknowledgements, curriculum scope, redirect refusal, and existing artifact safeguards.

The old staging branch and all custody archives are read-only references. This task does not authorize stage/commit/push/merge, deployment, branch/worktree deletion, credential changes, or live workload execution.

## Verification plan and baseline

- Clean native worktree created at the exact baseline, then given the task branch.
- Existing classroom suite: 47 passed, 0 failed, 0 skipped.
- Runtime: Node v24.15.0. The classroom tests need only built-in Node modules. The broader checks additionally use the locked `yaml` and TypeScript packages; see verification below.
- Tests use synthetic inputs and task-owned loopback services; an OS network sandbox denies external network access.
- First add and observe failing behavior tests for each requested contract; then repair each behavior and run the existing classroom and release-governance checks.
- Baseline output: `.tmp/classroom-safety-contracts/baseline-classroom.log`.

## Implementation and RED/GREEN evidence

- Rejected CLI arguments now use a fixed error message. Real CLI probes first failed because password/cookie/username/unknown argument values reached output, then passed with all synthetic values absent.
- Numeric configuration accepts only safe integers within the existing bounds. Decimal string input is required, missing values retain defaults, and empty/fractional/out-of-range input fails. The old self-test expectations for clamping were replaced with explicit rejection assertions as part of the owner's requested contract change.
- Login sessions are checked through the existing strict `/api/me` resolver before discovery; cookie authentication already supplies that first check. Before every round, each distinct cookie session is rechecked against its bound user ID and origin. Contradictory identities for a shared cookie fail before discovery. Checks are excluded from measured traffic, and failures propagate before report publication.
- Reports retain the existing fields and add `executionEnvironment` and `continuity`. Distinct identities are counted from verified user IDs, separately from virtual-seat concurrency and login count. Local human-readable output has an explicit local-only marker and labels seats.
- Serialization and the existing 8 MiB UTF-8 limit are checked before artifact directory resolution, locks, or temporary files. The writer implementation, persistence acknowledgement, Preview/credential ordering, and declared non-cooperative filesystem race limits remain intact.

RED evidence in `.tmp/classroom-safety-contracts/`:

- `red-arguments.log`: real CLI value echoes and silently adjusted numeric input.
- `red-continuity-report.log`: 11 failing checks exposed missing identity rejection and report fields.
- `red-report-size.log`: both absent-directory and existing-report scenarios observed filesystem mutations before oversized output was rejected. The exact byte boundary remained writable.

The added tests exercise real CLI processes, loopback HTTP login/session/workload requests, the actual Preview binding logic with synthetic provider responses, and real filesystem writes with mutation observation. Multibyte content proves the size limit is in UTF-8 bytes. Existing offline fixtures were updated to return explicit valid session identities; no validation bypass, test skip, timeout relaxation, or removed security assertion was added.

## Final verification

- `npm run test:release-governance`: PASS; 173 tests, 162 passed, 0 failed, 11 existing skips. This includes all 69 classroom tests and the build-gate tests.
- `npm run test:prod-certification`: PASS; 24 passed, 0 failed, 0 skipped. This is the tool's unit suite, not live production certification.
- `node --check` for both changed scripts: PASS.
- `git diff --check`: PASS.
- The first broader-suite attempts could not import `yaml` / `typescript` in the fresh worktree. No code was changed to hide those errors. A worktree-local ignored `node_modules` symlink reuses `/Volumes/Starship/MAIS-MVP/node_modules`; `yaml` 2.9.0 and TypeScript 5.8.3 were confirmed against this baseline's lockfile. No package manifest, lockfile, or dependency contents were changed.
- Final suite logs: `.tmp/classroom-safety-contracts/release-governance-with-deps.log` and `.tmp/classroom-safety-contracts/prod-certification-tests-with-deps.log`. Earlier failed setup logs are retained.
- No application build/type-check was run: the changed runtime is a manual `.mjs` tool with no application, TypeScript, package, or build-configuration changes. No real Preview, production, provider, or database workload was run.

## Independent A11 review

The `classroom_contract_review` reviewer inspected the uncommitted runner, test file, and runbook against the baseline, without editing the slice. It returned **ready for local handoff, no actionable Critical/Important/Minor findings**.

The reviewer independently ran 22 selected new behavior tests (all passed), plus two in-memory cases: a shared cookie/user is checked once per phase; a shared cookie with contradictory user IDs is rejected before discovery, workload, or reporting. The broader suite results above were produced by this A22 session and consumed by the reviewer, not rerun by that reviewer.

Reviewed source SHA-256:

- `scripts/classroom-load-smoke.mjs`: `5a8839270dcf26dae461ef6001b52756c54b00441d011fa365b4606bde0c1d5c`
- `scripts/classroom-load-smoke.test.mjs`: `ea0e57b035af06d6843d8905378a2ecdef3c4ee46ea573720b27d042b4e6347f`
- `RELEASE.md`: `34f0e60c9a7a0b48a4402ffadfc8f825b054114fec4e02de860eb0d7ff08defd`

## Final disposition

Completed; changes retained uncommitted for review. The three scoped tracked files and this new lifecycle log are the reviewable slice. The worktree, its owned test output, and the dependency symlink are retained. No commit, push, PR, merge, deployment, branch/worktree deletion, or custody-archive change was performed. The old staging remote remains outside this implementation's mutation scope.
