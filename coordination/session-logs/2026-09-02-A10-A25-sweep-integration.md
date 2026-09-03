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

## Post-review hardening (2026-09-02 HKT)

An independent review identified three related fail-closed gaps: ambient Git
environment variables could redirect target inspection; manifest hashing was
performed after UTF-8 string decoding; and read-only Git probes did not
explicitly disable optional locks. The remediation remains inside the same
three-path slice recorded above.

- Every production Git child now flows through one sanitized runner. It removes
  `GIT_DIR`, `GIT_WORK_TREE`, `GIT_COMMON_DIR`, `GIT_INDEX_FILE`,
  `GIT_OBJECT_DIRECTORY`, and `GIT_ALTERNATE_OBJECT_DIRECTORIES`, sets
  `GIT_OPTIONAL_LOCKS=0`, and supplies `--no-optional-locks`.
- Before target status or `check-ignore`, the runner resolves the physical
  target and separately verifies that `--show-toplevel` is that target,
  `--git-common-dir` is the expected common repository, and
  `--absolute-git-dir` is the target's registered Git directory.
- Immutable manifests are read as raw `Buffer` bytes. SHA-256 covers those raw
  bytes, JSON decoding uses a fatal UTF-8 `TextDecoder`, and every apply
  revalidation rereads and revalidates the raw bytes before its injected
  mutation boundary.
- Real temporary repositories exercise a dirty linked target whose path has
  spaces, Unicode, quotes, and a newline while all six Git routing variables
  point at a different repository/index. Separate status and `check-ignore`
  regressions prove the target and contaminating index bytes and nanosecond
  mtimes remain unchanged.

Hardening TDD:

- RED command: `node --test scripts/sweep-merged-worktrees.test.mjs`.
- RED result with tests changed and production unchanged at `6508a94bf56c90951d376eda0b1f97a777aa65f7`:
  90 tests, 85 passed, 5 failed. The failures were exact binding mismatch,
  missing sanitized/no-lock invocation, wrong-repository dirty count,
  malformed UTF-8 authorization acceptance, and missing apply-time fatal UTF-8
  revalidation.
- GREEN result after the minimal production change: 90 passed, 0 failed.

Fresh hardening verification:

- `node --check scripts/sweep-merged-worktrees.mjs`: passed.
- `node --check scripts/sweep-merged-worktrees.test.mjs`: passed.
- `node --test scripts/sweep-merged-worktrees.test.mjs`: 90 passed, 0 failed.
- `node --test --test-concurrency=1 scripts/release-governance.test.mjs`:
  96 tests; 85 passed, 0 failed, 11 intentional Promotion Shadow skips.
- Type-check remains not applicable because the exact slice contains only MJS
  and Markdown and changes no TypeScript/dependency/shared-type surface.
- No real sweep apply, receipt reservation, worktree removal, branch/ref
  mutation, PR, merge, deployment, provider call, rollback, or monitoring
  action was performed.

The claim ceiling remains a local-test and release-governance verified commit
on this pending-review branch after exact-path commit/push readback. It is not
`main`, CI, deployment, provider, route, live-behavior, rollback, or monitoring
evidence.

## U223-R2 implementation (2026-09-03 HKT) — Status DONE

- Implementer lane: borrowed A10/A25; exact worktree
  `/Volumes/Starship/MAIS的衍生文件/MAIS-a10-a25-sweep-integration-20260902`;
  branch `codex/a10-a25-sweep-integration-20260902`; expected-old HEAD
  `043ba215eaaa18d9bfb61520610d46192d82bc80`.
- Scope was limited to `scripts/sweep-merged-worktrees.mjs`,
  `scripts/sweep-merged-worktrees.test.mjs`,
  `scripts/release-build-gate.test.mjs`, and this append-only session log.
- A initial-clock TDD RED: the new test observed an uncaught injected
  `runtime.now()` exception. GREEN: `main()` now returns 1 with a controlled
  redacted initial-timestamp error before manifest read, receipt reservation,
  or mutation (the final test passes).
- B external-path TDD RED/GREEN: temporary fixtures covered a symlink parent,
  non-directory parent, unavailable boundary, receipt absence, production
  provider, and injected-main provider boundary failure. GREEN now walks every
  parent with no-follow `lstat` plus read/execute evidence, requires a regular
  manifest leaf, and accepts only an absent receipt leaf; unavailable or
  uncertain boundaries fail closed.
- C protected-ignored TDD RED/GREEN: symlink and fake unknown-node fixtures
  first demonstrated silent skip/filter behavior. GREEN now records each as a
  protected hit without following it, preserves those hits through
  `retainGitIgnored`, and therefore blocks retirement; `.git` remains the only
  dedicated traversal boundary.
- D RED evidence was the two existing release-build assertions failing under
  the Chinese worktree path because `.pathname` retained percent escapes.
  GREEN uses the exact `fileURLToPath(new URL("..", import.meta.url))` intent;
  release-build tests pass.
- RED/GREEN command evidence:
  - `node --test scripts/sweep-merged-worktrees.test.mjs --test-name-pattern='initial clock failure'`:
    98 pass, 1 fail RED; then 99 pass, 0 fail GREEN.
  - External-boundary and protected-node focused runs observed the specified
    RED failures before each minimal production change, then passed.
  - `node --test scripts/release-build-gate.test.mjs`: 7 pass, 0 fail GREEN.
  - `node --test scripts/sweep-merged-worktrees.test.mjs scripts/release-build-gate.test.mjs`:
    114 tests, 114 pass, 0 fail.
  - `npm run test:release-governance`: 103 tests, 92 pass, 0 fail, 11
    intentional Promotion Shadow skips.
  - `node --check` for all three MJS files: pass; `git diff --check`: pass.
- Self-review: no allowlist violation; no commit, push, remote/ref/PR/workflow
  change, real worktree removal, cleanup, receipt reservation, Shadow,
  deploy, provider call, or production action was performed.

## U223-R2 spec-review TOCTOU remediation (2026-09-03 HKT) — Status DONE

- Reviewer finding addressed: the prior external-path admission followed by
  path-based manifest read/receipt create left a TOCTOU gap. The remediation
  remains restricted to the same four allowlisted files and does not alter
  historical log content.
- RED fixtures first demonstrated that an admission hook replacing the
  manifest leaf or parent caused old absolute `readFileSync(path)` behavior to
  read replacement content, and old absolute `openSync(path, O_CREAT, ...)`
  behavior created a receipt below a replacement parent. A dedicated receipt
  symlink-parent fixture also fails closed.
- GREEN manifest path: external admission now records leaf dev/ino; the
  actual read opens the absolute path with `O_RDONLY|O_NOFOLLOW`, binds the fd
  with `fstatSync`, compares identity before reading, reads from the fd, and
  compares identity again after reading. Replacement leaf/parent tests now
  fail closed while the old absolute operation is proven to hit replacement
  content.
- GREEN receipt path: the provider revalidates the parent boundary and records
  parent dev/ino, then launches a minimal Node child with an explicit
  credential-stripped environment containing only PATH (no NODE_OPTIONS).
  Child cwd `statSync(".")` must match the admitted parent; relative leaf
  creation uses `O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW`, mode 0600. Child emits
  only controlled dev/ino JSON. The parent rejects stderr, nonzero status,
  malformed/invalid output, opens absolute path only with
  `O_WRONLY|O_NOFOLLOW`, compares fstat dev/ino before returning the fd, and
  leaves any uncertain empty reservation in place.
- TDD evidence:
  - TOCTOU RED focused run: 3 new race tests failed with missing expected
    exceptions under the old absolute path implementations; receipt static
    symlink-parent RED was also observed before GREEN.
  - TOCTOU GREEN focused run: 113 tests, 113 passed, 0 failed after fd/child
    binding implementation and test corrections.
  - `node --test scripts/sweep-merged-worktrees.test.mjs scripts/release-build-gate.test.mjs`:
    120 tests, 120 passed, 0 failed.
  - `npm run test:release-governance`: 103 tests, 92 passed, 0 failed, 11
    intentional Promotion Shadow skips.
  - `node --check` for all three MJS files and `git diff --check`: passed.
- Exact scope remains the four files named above. No commit, push, remote/ref/PR
  or workflow mutation, real removal/cleanup, receipt reservation outside
  OS-temp test fixtures, Shadow, deploy, provider, or production action was
  performed.
- A11 stale-Dirent remediation: a deterministic RED probe showed that the earlier Dirent-only traversal could enqueue a directory path and later follow it after replacement by a symlink. The walker now binds every queued directory to no-follow `lstat` device/inode identity, revalidates type and identity immediately before recursion, revalidates again after `readdir`, discards all entries observed through a drifting boundary, and permanently retains boundary-changed/unavailable holds. A task-owned fixture swaps the child after its first identity capture and proves the replacement path is never passed to `readdir`; external `.tmp` contents cannot influence the candidate decision.
- A11/A22 ABA closure: pre/post pathname identity comparison was insufficient because a temporary replacement could be restored before the second check. Directory enumeration now runs in a minimal credential-stripped child whose process CWD is the opened directory instance: it verifies that pinned CWD's device/inode before reading, then performs `readdirSync(".")` and `lstatSync(entry.name)` relative to that same kernel-held directory. A replacement selected before child startup fails the CWD identity check; replacement after startup cannot redirect `.`. Malformed/oversized/stderr/nonzero child evidence becomes a permanent boundary-unavailable hold. Tests lock the cwd-relative protocol and prove a pre-enumeration symlink replacement cannot expose external `.tmp` entries.
- Performance-safe descriptor implementation: the per-directory Node-child prototype was replaced before release because a real worktree scan exceeded 67 seconds. The final walker starts one isolated `/usr/bin/python3 -I` helper per worktree with an empty environment, opens its pinned CWD using `O_DIRECTORY | O_NOFOLLOW`, enumerates with `os.scandir(directory_fd)`, resolves metadata without following links, and recurses only through `os.open(name, ..., dir_fd=directory_fd)` children whose `fstat` identity matches the observed entry. A real scan completes in about 0.20 seconds. A deterministic ABA primitive fixture renames the original child aside, moves an empty replacement onto its pathname, and proves the held child descriptor still enumerates the original `.env.local` inode contents.
