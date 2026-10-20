# A22/A10 — Build attestation ordering and scoped rule updates

- Owner: Codex session `01a159ed`, borrowing A22 (build tooling) and A10 (rules).
- Branch: `codex/build-attestation-rules-20261020`.
- Worktree: `/Users/dongpinhu/.codex/worktrees/build-attestation-rules/MAIS-MVP`.
- Verified baseline: `f573ac62c97cb0716054bc516f7d5136491ca002`, matching live `origin/main` at task start.
- Creation date: 2026-10-20 (Asia/Hong_Kong).
- Expected closeout review date: 2026-10-21; retain until review and separately authorized closeout.
- Target PR at worktree creation: pending. The initial assignment authorized edits and local verification; publication authorization was added after the implementation handoff below.

## Assigned scope

1. Fix build-source attestation ordering in `scripts/next-clean-build.mjs` and add regression coverage in `scripts/next-clean-build.test.mjs`.
2. Port the effective rule changes to `AGENTS.md` and `CLAUDE.md` from current main, preserving current-main closeout and scope language.
3. Preserve the exact historical batch text in `coordination/agent-guidance/A10-rule-copy-preserve-and-align-20260908.md` and link it from `AGENTS.md`.

The primary checkout and all historical evidence remain in place. No whole-branch merge or unrelated old configuration is included.

## Validation

- Baseline: `node --test scripts/next-clean-build.test.mjs` — 26 passed, 0 failed.
- RED: the seven added lifecycle cases run against the original implementation produced 30 passes / 3 failures. Failures reproduced false clean/stable flags after sidecar restoration, false stability for an unchanged preexisting dirty source, and premature replacement of prior attestation before restoration failed.
- GREEN: `node --test scripts/next-clean-build.test.mjs` — 33 passed, 0 failed. Temporary Git repositories and a simulated Next executable exercise the actual snapshots, restoration, and attestation writer; this is not a real Next application build.
- Adjacent harness checks: `node --test --test-concurrency=1 scripts/cleanup-generated-artifacts.test.mjs scripts/release-build-gate.test.mjs scripts/check-stray-generated-types.test.mjs scripts/vercel-staging-build-gate.test.mjs` — 38 passed, 0 failed.
- Targeted coordination contract: `node --test --test-name-pattern='^package and coordination contracts preserve security versions and closure rules$' scripts/release-governance.test.mjs` — 1 passed, 0 failed.
- `git diff --check` passed. All five relative Markdown link occurrences in the two root rule documents resolve.
- Historical batch file matches the primary checkout bytes and the complete original block in `3f0dcc0db4:AGENTS.md`. SHA-256: `a890f30193add38e4ee477dcf298077b5b45c7703a4cc29d0c0da9b165385f23`.
- Current-main CLAUDE same-day closeout requirement and final scope/authority disclaimer remain verbatim.
- Dependencies: reuse the primary checkout's existing `node_modules` through a local ignored symlink; no dependency files changed.
- No application build, application type-check, provider call, CI run, release-readiness claim, or deployment was performed. This change is limited to the build harness and rule text.

## Preservation and handoff

- All 514 preexisting dirty-file entries captured in the primary checkout were rechecked; none was missing or had changed content. Its HEAD remains `3f0dcc0db4b738d054322e149ae7cbb1587428ba`.
- Live remote main remains `f573ac62c97cb0716054bc516f7d5136491ca002` at postflight.
- The reviewable edits are the five assigned source/rule files plus this required worktree lifecycle note.
- No staging, commit, push, merge, cleanup, or old-branch integration was performed in the project. Synthetic temporary Git commits exist only inside test fixtures.
- Independent read-only review found no actionable correctness or regression issues. The reviewer independently checked the baseline, changed scope, preserved document bytes, links, and whitespace; test results were consumed, not independently rerun. Its stale-log observation was resolved by recording the completed checks above.
- Implementation handoff status: local implementation, targeted checks, and review complete; changes retained uncommitted for review at that stage.

## Owner-authorized PR publication

After reviewing the implementation handoff, the owner explicitly authorized committing this change to the isolated branch, pushing it, and opening a PR against `main`, limited to these six files:

- `scripts/next-clean-build.mjs`
- `scripts/next-clean-build.test.mjs`
- `AGENTS.md`
- `CLAUDE.md`
- `coordination/agent-guidance/A10-rule-copy-preserve-and-align-20260908.md`
- `coordination/session-logs/2026-10-20-A22-A10-build-attestation-rules-01a159ed.md`

All historical evidence must remain in place. Merge, deployment, old-branch integration, and cleanup remain outside this authorization. The resulting commit and PR identity are recorded by the published Git branch and GitHub PR; this note records the scope before publication.

Staging exposes one existing formatting exception that the earlier unstaged diff check did not include: the newly tracked historical batch copy has a terminal blank line at line 95. Its original bytes and SHA-256 are deliberately preserved. The staged whitespace check for the other five files passes; the full six-file check reports only this historical-copy warning.
