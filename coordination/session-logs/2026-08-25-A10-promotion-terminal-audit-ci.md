# A10 Promotion Terminal Audit CI

- Owner: A10 Tooling, Docs, and Report
- Branch: `codex/a10-promotion-terminal-audit-ci-20260825`
- Target PR: https://github.com/HUDongpin/MAIS-MVP/pull/154
- Created: 2026-08-25
- Expected closeout: 2026-08-25
- Baseline: `d9dd84eb05e7920ec99f38223f61989ad5862b3d`
- Scope: `.github/workflows/promotion-shadow.yml`, its release-governance assertions, and this session log only.

## Purpose

Replace the PR-controlled current-checkout `promotion:validate` execution with an exact
current-HEAD audit executed from the externally pinned terminal audit v2 release
`ca89c923065a1b9dd6aee40fbc78326be13aae07`. Preserve the immutable historical
attempt replay and verification chain; do not retry the terminal attempt or expose any
live, deployment, provider, database, or network capability.

## Initial verification

- Release-governance red phase: six existing workflow assertions failed after the
  current-HEAD validation path was replaced.
- Updated release-governance suite: 94 pass, 0 fail before adding the detached-release
  executable negative test.
- The workflow retains read-only permissions, full-history checkout,
  `persist-credentials=false`, action SHA pins, isolated runner-temp outputs, exact
  artifact enumeration, and an always-run final outcome enforcer.

## Current status

Local implementation verification is complete:

- `node --test scripts/release-governance.test.mjs`: 95 pass, 0 fail.
- The added executable fixture rejects release-commit injection, an incorrect runner-temp
  target, a non-ancestor commit, and a pre-existing worktree collision; it accepts only a
  clean detached worktree at the exact ancestor release commit.
- The workflow parses as YAML, `git diff --check` passes, and current-checkout
  `promotion:validate` is absent from the workflow.

The final current-HEAD audit is intentionally post-commit evidence and will be recorded
in the PR/A25 closeout rather than by rewriting this log after its reviewable commit. The
immutable attempt remains `repair_required`; `liveAllowed=false`; no Shadow maturity
claim is permitted.
