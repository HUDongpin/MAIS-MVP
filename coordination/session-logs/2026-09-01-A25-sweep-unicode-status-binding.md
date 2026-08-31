# A25 Sweep Unicode Entrypoint And Exact-Status Binding

- Date: 2026-09-01 HKT
- Agent ID: A25, with A10 tooling scope
- Mode: local Git hygiene tooling; dry-run only
- Branch: `codex/a25-sweep-unicode-status-binding-20260901`
- Exact base: `baca84e77abae1e16cfd53d497c6f7ee734d4679`
- Target PR: pending; no PR creation or update authorized
- Expected closeout date: 2026-09-01 HKT

## Trigger and root cause

After registered worktrees moved beneath `MAIS的衍生文件`, invoking `node scripts/sweep-merged-worktrees.mjs --json` returned exit `0` with no output. The CLI guard compared percent-encoded `import.meta.url` with a raw filesystem `process.argv[1]`, so `main()` was never called on a Unicode path.

The production status adapter also used ambient `git -C <worktree> status`. The shared common repository currently has an unrelated `core.worktree` setting, and prior exact audits proved that ambient status can read the wrong checkout. Line-delimited porcelain also cannot count a filename containing a newline safely.

## TDD evidence

- Existing RED: the CLI bypass test failed `0 !== 1` on the migrated Unicode path, proving the script silently skipped its fail-closed CLI parser.
- Added RED: exact-status provider was absent; an integration fixture with an intentionally wrong ambient `core.worktree` failed.
- Added RED: `check-ignore` did not accept an injected exact Git boundary and could not prove its worktree binding.
- GREEN: CLI identity now compares against `pathToFileURL(resolve(process.argv[1])).href`.
- GREEN: status resolves the exact worktree gitdir, supplies explicit `--git-dir`, `--work-tree`, and `-c core.worktree=<exact-path>`, and parses `--porcelain=v1 -z` without over-counting rename source paths.
- GREEN: ignored-evidence classification uses the same exact Git binding and remains fail-closed when gitdir or check-ignore evidence is unavailable.

## Verification

- `node --test scripts/sweep-merged-worktrees.test.mjs`: 78 passed, 0 failed.
- `node --check scripts/sweep-merged-worktrees.mjs`: passed.
- `node --check scripts/sweep-merged-worktrees.test.mjs`: passed.
- `node --test --test-concurrency=1 scripts/release-governance.test.mjs`: 95 tests; 84 passed, 0 failed, 11 existing skips.
- Live fleet dry-run, with no `--apply`: live main evidence available at `baca84e...`; exhaustive GitHub open-PR evidence available; 68 registered worktrees inspected; 0 retire actions.
- Dry-run reason distribution: 66 owner/task custody unavailable, one protected primary checkout, one protected default-branch checkout.

## Safety and claim ceiling

- No manifest was supplied, so no worktree acquired owner/task authorization.
- No `--apply`, worktree removal, branch deletion, remote deletion, reset, rebase, stash, force operation, workflow dispatch, PR update, merge, Shadow, deployment, provider call, or production action occurred.
- The live dry-run proves only that the repaired script executes, binds status to the exact worktree, and fails closed without custody. It does not authorize any cleanup target.
- Intended terminal state: `reviewed commit` for the exact script, test, and this session log.
