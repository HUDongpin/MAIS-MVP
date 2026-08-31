# A22 Classroom Forward-Port Unicode-Path Test Repair

- Date: 2026-09-01 HKT
- Agent ID: A22
- Mode: `application-runtime-release` / `release-readiness-evaluation`
- Branch: `codex/a22-classroom-unicode-path-test-20260901`
- Exact base: `9e68e54b314ed4bad4d501b9a830988463c8fa52`
- Upstream target: pending until an exact reviewed commit exists
- Expected closeout date: 2026-09-01 HKT
- Scope: test-only portability repair for the already-reviewed classroom-load staging forward-port

## Root cause

After the A22 standalone clone moved beneath `MAIS的衍生文件`, the release-build-gate test computed `repoRoot` from `new URL(...).pathname`. URL pathname bytes retain percent encoding, while the production module correctly derives its filesystem root with `fileURLToPath()`. The test therefore compared an encoded expected path with the decoded filesystem path and failed only on the migrated Unicode location.

The first fresh run also exposed two environmental facts that are not product regressions:

- the system temporary volume had only about 114 MiB free, so the classroom self-test initially failed at `mkdtemp` with `ENOSPC` before product logic ran;
- the standalone clone intentionally had no `node_modules`, so `release-governance.test.mjs` initially could not import `yaml`.

The rerun used a task-specific Starship `TMPDIR`. For dependency reads, it temporarily linked the exact-lockfile-matching clean `MAIS-main-wt/node_modules`; the link was removed immediately after testing. No dependency, lockfile, shared module, source branch, provider, URL, workflow, PR, deployment, or production state was changed.

## TDD evidence

- RED on exact base `9e68e54b...`: `release-build-gate.test.mjs` failed its two repository-root assertions. Expected paths contained percent-encoded `MAIS%E7%9A%84...`; actual paths contained decoded `MAIS的衍生文件`.
- Root-cause comparison: `scripts/release-build-gate.mjs` and `scripts/release-governance.test.mjs` already use `fileURLToPath`; only `scripts/release-build-gate.test.mjs` used raw URL pathname.
- GREEN: import `fileURLToPath` and derive `repoRoot` with `fileURLToPath(new URL("..", import.meta.url))`.

## Fresh checks

- `node --test scripts/release-build-gate.test.mjs`: 7 passed, 0 failed.
- `npm run test:release-governance`: 102 tests; 91 passed, 0 failed, 11 existing skips.
- `npm run smoke:classroom-load -- --self-test`: passed; no real URL contacted.
- `npm run test:prod-certification`: 24 passed, 0 failed; unit tests only.
- `npm run type-check`: passed.
- The temporary `node_modules` symlink was removed; the physical worktree returned to source-only status.

## Claim ceiling

This repairs and verifies Unicode-path portability of the local release-governance tests on top of the exact staging-only forward-port. It proves no real classroom load run, CI, Preview identity, provider configuration, production behavior, workflow dispatch, PR update, merge, deploy, rollback, monitoring, Shadow, or live state.

## Final-state intent

- Exact source path: `scripts/release-build-gate.test.mjs`
- Evidence path: this session log
- Intended terminal state: `reviewed commit`
- No remote ref deletion, force operation, broad staging, reset, rebase, stash, or cleanup is authorized or performed.
