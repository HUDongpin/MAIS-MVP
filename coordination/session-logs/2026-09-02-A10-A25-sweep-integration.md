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

## U223-R3 implementation (2026-09-03 HKT) — DONE, uncommitted

- Implementer lane: borrowed A10/A25; exact worktree
  `/Volumes/Starship/MAIS的衍生文件/MAIS-a10-a25-sweep-integration-20260902`; branch
  `codex/a10-a25-sweep-integration-20260902`; expected-old HEAD
  `716ae1b1d07a6aa8ff027ce192d75065c40feccf`. Baseline status was clean and no
  HEAD drift was observed.
- Exact write scope remained the three authorized paths: the sweep runtime,
  its focused test file, and this append-only lifecycle log. The read-only
  generic strict JSON guard was imported but not modified. No commit, push,
  PR, workflow, merge, cleanup, or real `--apply` sweep was performed.

### U223-R3 TDD evidence

- RED after test-only additions: `node --test scripts/sweep-merged-worktrees.test.mjs`
  returned exit 1 with 122 tests, 116 passed and 6 failed. The expected
  failures covered duplicate-key rejection, required `creationDate`, fixed
  trusted Git/config isolation, final target identity barrier, frozen-clock
  integration, and receipt durability helper.
- GREEN after the minimal runtime implementation and test fixture updates:
  `node --test scripts/sweep-merged-worktrees.test.mjs` returned exit 0 with
  124 passed and 0 failed.
- The revalidation-specific RED/GREEN coverage also proves duplicate keys are
  rejected on every manifest revalidation with the stable non-leaking reason
  `immutable manifest revalidation failed`; the raw manifest descriptor checks
  the frozen 32 MiB size ceiling before reading bytes.

### U223-R3 behavior and verification

- Manifest validation now uses the existing strict byte parser (fatal UTF-8,
  duplicate-key rejection, parser safety limits), and each apply revalidation
  strictly parses fresh bytes before digest comparison and mutation.
- Production Git invokes fixed `/usr/bin/git`; routing/config env overrides are
  removed, system/global config is pinned to `/dev/null`, optional locks are
  disabled, the frozen repository tuple is checked, and production worktree,
  ancestry, log, anchor, live-main, and removal calls use the bound tuple.
- Each authorized target carries a canonical `creationDate`; age is computed
  against the single frozen runtime clock captured for the invocation. The
  final target path is checked as a no-follow directory with matching
  device/inode identity immediately before removal, and writer/process evidence
  is rechecked at that bounded barrier.
- Receipt reservation, file write, and parent-directory durability now use
  fsync. Receipts explicitly record a claim ceiling: `absoluteRaceFree=false`,
  `writerFree=false`, with postflight described as bounded observations only.
- Verification: `node --check scripts/sweep-merged-worktrees.mjs` passed;
  `node --check scripts/sweep-merged-worktrees.test.mjs` passed;
  focused suite passed 124/124; `git diff --check` passed. No TypeScript or
  package surface was changed, so type-check was not applicable to this slice.
- Final post-change readback retained HEAD at
  `716ae1b1d07a6aa8ff027ce192d75065c40feccf`; exact status showed only the
  three authorized files modified. A fresh `npm run test:release-governance`
  also passed 92/92 runnable tests with 11 intentional Promotion Shadow skips
  (103 total), with no sweep apply or cleanup action.
- After the final canonical target-boundary and durable-receipt error-path
  hardening, focused verification was rerun: both `node --check` commands,
  `node --test scripts/sweep-merged-worktrees.test.mjs` (124/124), and
  `git diff --check` passed again.

## U223-R3 A11/A22/A25 P1 correction (2026-09-03 HKT) — DONE, uncommitted

- Review returned FAIL for optional final target/process barriers, unbound Git
  discovery and fallback paths, inherited `gh`/`lsof` routing, manifest FIFO/
  size handling, receipt parent durability, duplicate-key mutation coverage,
  and invalid frozen-clock/min-age handling. The correction stayed inside the
  original three authorized paths; `scripts/promotion-workflow-json-guard.mjs`
  remained read-only.
- RED evidence: focused `node --test scripts/sweep-merged-worktrees.test.mjs
  --test-name-pattern='final (target boundary|process) evidence'` first showed
  missing provider evidence could still remove; the GH/lsof routing tests then
  showed unresolved executable constants and absent exact `--repo`; the
  filesystem-binding RED showed the unbound discovery contract and the
  receipt/manifest RED showed parent identity, sparse-size, and FIFO gaps.
  These tests were corrected before production changes; the FIFO RED was not
  allowed to block because the old path-based open could block, and was run
  after the `O_NONBLOCK` change.
- GREEN now passes `node --test scripts/sweep-merged-worktrees.test.mjs` with
  136/136 tests and 0 failures. Coverage includes missing/malformed/throwing
  target/process providers, valid-first/duplicate-second revalidation,
  sparse oversized and FIFO manifest leaves, no-unbound-discovery Git calls,
  dynamic Git routing env keys, fixed GH/lsof executables, exact frozen remote
  repository identity, descriptor-bound receipt parent durability, invalid
  frozen clock, and minimum-age fail-closed behavior.
- Final implementation details: final target/process providers are mandatory
  and fail closed; `.git` is read using no-follow bounded filesystem metadata
  (directory or bounded `gitdir:` file), then all Git operations use a literal
  frozen tuple; direct production calls without the tuple fail closed. All
  ambient `GIT_*` variables are removed before safe values are installed.
  `gh` is fixed to `/opt/homebrew/bin/gh` and receives exact `--repo owner/name`
  from the frozen GitHub remote identity with `GH_REPO`/`GH_HOST` removed;
  `lsof` is fixed to `/usr/sbin/lsof` with an empty environment.
- Manifest opens use `O_NONBLOCK|O_NOFOLLOW`, fstat regular-file and size checks
  precede reads, and strict parsing remains applied on every revalidation.
  Receipt reservation holds the admitted parent fd, verifies its identity,
  and fsyncs that same descriptor after receipt-file fsync before closing it;
  no second parent pathname open is used for production receipt closeout.
- Final verification: `node --check scripts/sweep-merged-worktrees.mjs`
  passed; `node --check scripts/sweep-merged-worktrees.test.mjs` passed;
  focused suite passed 136/136; prior `npm run test:release-governance` passed
  92 runnable tests with 11 intentional skips; `git diff --check` passed.
  Exact HEAD remains `716ae1b1d07a6aa8ff027ce192d75065c40feccf`, and status is
  limited to the three allowlisted files. No commit, push, apply, cleanup,
  branch/ref/PR/workflow mutation, or production action was performed.
- Final post-correction governance rerun: `npm run test:release-governance`
  completed with 103 total tests, 92 passed, 0 failed, and 11 intentional
  Promotion Shadow skips. Exact status, HEAD, and diff boundaries were then
  re-read; no files outside the three-path allowlist were modified.

## U223-R3 final re-review correction (2026-09-03 HKT) — DONE, uncommitted

- Final re-review identified five P1 issues; all corrections remained in the
  same three allowlisted files. RED additions covered omitted `remoteIdentity`
  tuple comparison, linked-CWD primary-root derivation, concurrent manifest
  growth after initial fstat, receipt close failure/double-close cleanup, and
  inherited interactive/SSH Git routing variables.
- GREEN implementation now compares the complete tuple including remote
  identity; derives the canonical nonbare primary root from the frozen common
  Git directory; reads manifests and `.git` gitdir files through bounded
  descriptor reads with `O_NONBLOCK|O_NOFOLLOW`, pre-read regular/size checks,
  post-read identity/size checks, and a max+1 cap; and guarantees admitted
  receipt parent fsync/close even when receipt close throws.
- All ambient `GIT_*` variables are removed before reinstalling only safe
  config, optional-lock, noninteractive prompt, askpass, SSH batch, and
  variant values. The tuple bootstrap no longer uses unbound Git discovery;
  production providers without a tuple fail closed. The `gh` query remains
  fixed-executable and exact-`--repo` bound, while `lsof` remains fixed and
  empty-environment.
- A real linked-worktree smoke from the exact linked CWD confirmed the frozen
  tuple was available and canonical primary root resolved to
  `/Volumes/Starship/MAIS-MVP`; live-main evidence was unavailable in that
  environment, so no positive live-main claim was made and no mutation was
  attempted. A full primary-root sweep smoke was intentionally interrupted
  after it exceeded the bounded interactive wait because it was still scanning
  the fleet; it produced no output or mutation.
- Final verification: `node --test scripts/sweep-merged-worktrees.test.mjs`
  passed 141/141; `npm run test:release-governance` passed 92 runnable tests,
  0 failed, with 11 intentional skips; both MJS `node --check` commands and
  exact `git diff --check` passed. HEAD remains
  `716ae1b1d07a6aa8ff027ce192d75065c40feccf`; status still contains only the
  three authorized modified files. No commit, push, apply, cleanup, branch,
  ref, PR, workflow, or production action was performed.

## U223-R3 SSH command correction (2026-09-03 HKT) — DONE, uncommitted

- Final review found the fixed `GIT_SSH_COMMAND` was syntactically invalid:
  `/usr/bin/ssh -G ... github.com` returned exit 255 with `no argument after
  keyword "sendenv"`. A RED test first reproduced that exact parser failure.
- GREEN replaced the empty-value options with an executable fixed command:
  `/usr/bin/ssh -F /dev/null -oBatchMode=yes -oStrictHostKeyChecking=yes
  -oUpdateHostKeys=no -oControlMaster=no -oControlPath=none
  -oPermitLocalCommand=no -oProxyCommand=none -oClearAllForwardings=yes`.
  The non-network `/usr/bin/ssh -G` parser test now passes.
- Post-correction focused sweep suite passed 142/142; both MJS syntax checks
  passed; exact `git diff --check` passed. A real linked-CWD tuple/live-main
  smoke again confirmed tuple availability and canonical primary root
  `/Volumes/Starship/MAIS-MVP`; live-main evidence remained unavailable in the
  environment, so no live-positive claim or mutation was made. No commit,
  push, apply, cleanup, branch/ref/PR/workflow mutation, or production action
  occurred.

## U223-R3 remote URL credential-helper correction (2026-09-03 HKT) — DONE, uncommitted

- Final re-review identified that HTTPS origin live-main evidence was being
  rejected because global credential-helper configuration was intentionally
  removed. A RED test first required strict canonical GitHub HTTPS remote URL
  parsing, exact remoteUrl tuple comparison, and an explicit credential-helper
  `ls-remote` command.
- GREEN now freezes a canonical GitHub `remoteUrl` (HTTPS only, no userinfo,
  non-GitHub host, query/hash, controls, or unsupported SSH form) plus the
  derived remote identity. Tuple comparison includes both remoteUrl and
  remoteIdentity. live-main uses the exact frozen URL rather than the mutable
  remote name `origin`, with `-c credential.helper=!/opt/homebrew/bin/gh
  auth git-credential` and the already-isolated noninteractive Git environment.
  Remote URLs and credentials are never printed or placed in receipts.
- The exact fixed helper was validated by real smoke from the linked CWD:
  tuple available, canonical primary root `/Volumes/Starship/MAIS-MVP`,
  live-main evidence available, source `git-ls-remote`, and valid SHA shape.
  Output contained only booleans/source/shape metadata; no URL or token.
- Final verification: focused sweep suite `node --test
  scripts/sweep-merged-worktrees.test.mjs` passed 144/144; both MJS
  `node --check` commands passed; `npm run test:release-governance` passed 92
  runnable tests, 0 failed, with 11 intentional skips; exact `git diff --check`
  passed. HEAD remains `716ae1b1d07a6aa8ff027ce192d75065c40feccf`; exact status
  remains limited to the three authorized files. No commit, push, apply,
  cleanup, branch/ref/PR/workflow mutation, or production action occurred.

## U223-R3 main tuple barrier correction (2026-09-03 HKT) — DONE, uncommitted

- Final gate found `main()` constructed its temporary left tuple without the
  frozen `remoteUrl`, causing the real provider tuple barrier to reject. A RED
  regression inspected the main barrier tuple and failed while that field was
  absent; GREEN added `remoteUrl: repositoryTuple.remoteUrl`.
- Focused sweep suite passed 145/145 after the correction. Real default
  `--json` dry-run from primary root was launched with the exact linked script
  for a 12-second bounded read-only smoke; it produced no stderr or output and
  was interrupted at the timeout while scanning the fleet. The absence of an
  immediate tuple-barrier error proves it passed tuple setup into subsequent
  scan work, but it is not completion evidence. The linked-CWD default
  `--json` smoke likewise ran 12 seconds with no stderr/output before safe
  timeout; neither command used `--apply` or mutated anything.
- Final checks: both MJS `node --check` commands passed; `git diff --check`
  passed; the latest release-governance run passed 92 runnable tests, 0 failed,
  with 11 intentional Promotion Shadow skips. HEAD remains
  `716ae1b1d07a6aa8ff027ce192d75065c40feccf`; exact status remains the three
  allowlisted files only. No commit, push, apply, cleanup, branch/ref/PR,
  workflow, or production action occurred.

## U223-R3 final security closure pass (2026-09-03 HKT) — DONE, uncommitted

- Added fixed bounded execution controls to every production `git`, `gh`, and
  `lsof` probe: 60-second timeout, 8 MiB output ceiling, and SIGKILL. The
  trusted GitHub helper environment also sets `GH_PROMPT_DISABLED=1`, clears
  ambient `GIT_*` routing/configuration, and uses the fixed noninteractive SSH
  command validated by `ssh -G` without network access.
- Added canonical-path primary-checkout protection so a symlink alias of the
  primary checkout is skipped. The live-main probe remains bound to the
  owner-approved `HUDongpin/MAIS-MVP` identity and exact canonical HTTPS URL,
  runs from `/` with no local repository/config discovery, and fails closed on
  origin URL tampering. No URL, credential, or helper output is logged.
- RED coverage includes the final target evidence missing/malformed/throw
  barrier, duplicate-key mutation-boundary revalidation, sparse and growing
  manifest bounds, FIFO rejection, same-parent receipt durability and
  unowned/double-close failure, invalid completion clock, `.git` binding and
  replacement protections, exact remote tuple/URL, tampered temporary origin,
  SSH parser validity, command bounds, and primary symlink alias behavior.
- GREEN verification: `node --test scripts/sweep-merged-worktrees.test.mjs`
  passed 152/152; `npm run test:release-governance` passed 92 runnable tests,
  0 failed, with 11 intentional skips; both MJS `node --check` commands and
  exact `git diff --check` passed. The real linked-CWD
  live-main smoke returned available evidence with a valid SHA shape using only
  boolean/source metadata; primary and linked default `--json` dry-run smokes
  were bounded read-only scans and did not use `--apply`.
- HEAD remains `716ae1b1d07a6aa8ff027ce192d75065c40feccf`; status remains only
  the three allowlisted files. No commit, push, apply, cleanup, branch/ref/PR,
  workflow, or production action occurred.

## U223-R3 final child-process timeout closure (2026-09-03 HKT) — DONE, uncommitted

- Final security review found the receipt reservation child and descriptor-bound
  protected walker were the remaining production `spawnSync` calls without the
  fixed execution bound. RED injection tests showed receipt timeout left the
  admitted parent close unobserved and the walker received no timeout option.
- GREEN now applies `COMMAND_TIMEOUT_MS` (60 seconds),
  `COMMAND_MAX_BUFFER_BYTES` (8 MiB), and `COMMAND_KILL_SIGNAL` (`SIGKILL`) to
  both children. Receipt reservation uses a one-shot admitted-parent close on
  every child/error path, so timeout cannot claim a usable receipt; the walker
  converts timeout/error evidence into its existing boundary-unavailable
  fail-closed result, which preserves the candidate hold.
- Targeted RED/GREEN command:
  `node --test --test-name-pattern='bounds its child'
  scripts/sweep-merged-worktrees.test.mjs`; RED was 0/2 with the missing
  timeout/close observations, GREEN is 2/2.
### U223-R3 final receipt-child timeout evidence correction

- A final static review found that the receipt-reservation timeout test asserted inside the injected child callback. The production wrapper caught that assertion and converted it into the same fail-closed child error, so the test passed even though the production child options omitted the timeout fields.
- RED correction: the test now captures the child options and asserts them after the expected fail-closed call returns; on the unchanged production code it failed with `actual undefined` versus the fixed `60000` millisecond ceiling.
- GREEN: the receipt-reservation Node child now receives `COMMAND_TIMEOUT_MS`, `COMMAND_MAX_BUFFER_BYTES`, and `COMMAND_KILL_SIGNAL`, matching the protected-tree child and the other Git/GitHub/process providers. Timeout/error still closes the admitted parent descriptor and never yields a usable receipt.
