# A10+A25 Sweep Integration

- Date: 2026-09-02 HKT
- Owner: A10+A25
- Mode: application-runtime integration slice; no deployment or cleanup execution
- Branch: `codex/a10-a25-sweep-integration-20260902`
- Worktree: `/Volumes/Starship/MAIS的衍生文件/MAIS-a10-a25-sweep-integration-20260902`
- Target PR: pending
- Creation date: 2026-09-02 HKT
- Expected closeout date: 2026-09-02 HKT
- Exact base/live `origin/main`: `be92640f4bb8933ed8a99ed7c1ea604428c6a56f`
- A10 source: `codex/a10-sweep-manifest-preview-20260829` at `a7d153ae21ba0f9b276c716e8f1bb1b86be7893f`
- A25 source: `codex/a25-sweep-unicode-status-binding-20260901` at `19cbdae90841dd8fcd26a96ca9f97cf72596e943`
- Exact slice:
  - `scripts/sweep-merged-worktrees.mjs`
  - `scripts/sweep-merged-worktrees.test.mjs`
  - this lifecycle log

## Baseline and source composition

The physical worktree began at the exact live-main base and was clean when
status was read with its linked Git directory and explicit `--work-tree`.
Ordinary Git discovery was not trusted because the shared repository config
contains an unrelated ambient `core.worktree` override. That ordinary output
was invalidated and no file it named was changed, restored, staged, or included.

The two source tips were treated as read-only. Their full histories were not
merged. The current-main implementation composes only the intended sweep
changes: A10's immutable, non-mutating manifest preview plus A25's Unicode-safe
CLI identity and exact physical worktree/status binding. Tests extend the A25
fixture so the worktree path itself contains a space, Unicode, a quote, and a
newline.

## Behavior

- A complete preview triplet (`--manifest`, `--manifest-sha256`, and
  `--expected-live-main-sha`) validates immutable manifest bytes, live-main
  binding, whole-fleet topology, and each target lock without `--apply`.
- Preview never reserves or writes a receipt and never calls the removal
  adapter. It exits nonzero when any exact manifest target is not retirable.
- Receipt paths remain apply-only.
- Worktree status and `check-ignore` resolve the target's physical Git
  directory, then use explicit `--git-dir`, `--work-tree`, and
  `core.worktree=<exact path>` arguments.
- Status uses porcelain v1 with NUL delimiters, so embedded newlines do not
  create false records and rename/copy source paths are not double-counted.
- CLI entrypoint identity uses a filesystem URL, so paths with Unicode do not
  bypass the fail-closed parser.

## TDD evidence

Production code was unchanged for both RED runs.

- Baseline RED: `node --test scripts/sweep-merged-worktrees.test.mjs` returned
  exit 1 with 75 tests: 74 passed and one failed. The Unicode-path CLI test
  observed exit 0 instead of the required fail-closed exit 1.
- Expanded RED after test-only edits: the same command returned exit 1 with 84
  tests: 74 passed and 10 failed. The failures covered the absent exact-status
  API, unbound `check-ignore`, preview argument rules, Unicode CLI execution,
  and preview execution/fail-closed behavior.
- GREEN after the minimal production composition: the same command returned
  exit 0 with 84 passed and 0 failed.
- Extended-path GREEN after strengthening the physical worktree fixture: the
  same command returned exit 0 with 84 passed and 0 failed.

## Verification evidence

- `node --check scripts/sweep-merged-worktrees.mjs`: exit 0.
- `node --check scripts/sweep-merged-worktrees.test.mjs`: exit 0.
- `node --test scripts/sweep-merged-worktrees.test.mjs`: 84 passed, 0 failed.
- `node --test --test-concurrency=1 scripts/release-governance.test.mjs`:
  96 tests; 85 passed, 0 failed, 11 pre-existing Promotion Shadow skips.
- Type-check: not applicable to this `.mjs` and Markdown-only slice; no
  TypeScript, dependency, package, or shared type file changed.
- `git diff --check`: required again over the complete slice before commit.
- Full `origin/main..HEAD` review and explicit remote readback: required after
  the authorized exact-path commit and ordinary upstream push.

## Claim ceiling and safety

The maximum claim is a locally tested, release-governance-verified, reviewed
commit on the named branch after exact-path staging and push readback. This is
not evidence that the change is on `main`, has passed remote CI, was deployed,
or has any live behavior. Build, provider configuration, deployment, route
readback, rollback, and monitoring are not applicable/not run for this slice.

No `--apply`, receipt reservation, worktree removal, branch/ref deletion,
force operation, reset, rebase, stash, PR mutation, merge, deploy, provider
call, or production action was performed.
