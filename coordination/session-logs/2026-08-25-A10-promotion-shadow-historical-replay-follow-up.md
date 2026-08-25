# A10 follow-up — canonical execution commit replay in CI

## Session custody

- Owner / lane: `A10` tooling and CI coordination.
- Branch: `codex/a10-promotion-shadow-fetch-depth-20260825`.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a10-promotion-shadow-fetch-depth-20260825`.
- Exact baseline: `7efba2dfcd9429e0e99e423c14239f40090e168e` (`docs(promotion): record independent Ajv gate replay`).
- Target PR: `pending` (A23 clean composition PR).
- Creation date: `2026-08-25` Asia/Hong_Kong.
- Expected closeout date: `2026-08-25` Asia/Hong_Kong.
- Exact write scope:
  - `.github/workflows/promotion-shadow.yml`
  - `scripts/release-governance.test.mjs`
  - `coordination/session-logs/2026-08-25-A10-promotion-shadow-historical-replay-follow-up.md`

## Problem and evidence boundary

A canonical failed/blocked Receipt binds the clean commit on which its immutable attempt ran. Committing the terminal lifecycle registry and decision afterward necessarily advances the PR HEAD. Running `promotion:verify-receipt` only at that newer HEAD therefore cannot lawfully prove the historical Receipt, because the core verifier requires the exact clean `worktreeProof.executionCommit`.

The workflow now keeps two distinct claims:

- Current checkout HEAD runs the Promotion Gate unit/security suite and `promotion:validate`, so checker, Schema, Manifest, evidence, lifecycle, history, and drift changes remain visible and fail closed.
- Canonical Receipt replay occurs in a new detached clean worktree at the exact committed execution SHA recorded by that Receipt. This proves only reproducibility at the canonical attempt commit; it does not bless the newer terminal registry commit or convert a failed attempt into a pass.

## Historical replay control flow

After current-HEAD validation, all historical preparation, installation, Shadow, semantic comparison, verification, and artifact steps use `if: ${{ always() }}`. None uses `continue-on-error`, so any current validation, parsing, Git proof, install, replay, comparison, or verifier error remains a red `promotion-shadow-gate` result.

The workflow:

1. Reads the canonical Receipt from its absolute current-checkout path and proves its working bytes equal `HEAD:<receipt-path>`.
2. Requires exact `manifest` and `worktreeProof` key sets, exact Manifest-path equality, a lowercase SHA-256 manifest digest, and exactly 40 lowercase hexadecimal characters for `executionCommit`.
3. Copies those committed Receipt bytes to exactly `$RUNNER_TEMP/promotion-canonical-receipt.v1.json` using exclusive `wx` creation with mode `0600`; it rejects a symlinked source, any target collision, non-regular/multi-link/wrong-mode output, or source/copy byte and SHA-256 mismatch.
4. Requires the execution object to exist as a commit and to be an ancestor of current HEAD.
5. Creates exactly `$RUNNER_TEMP/promotion-shadow-execution` with `git worktree add --detach`, then proves its HEAD, detached state, and clean status.
6. Runs `npm ci`, both distinct-ID Shadow commands, and all three Receipt verifiers with that historical worktree as `working-directory`. Fresh/replay Receipts remain absolute runner-temp files; canonical verification receives the runner-temp copy, preserving the core verifier's narrow external-input root.
7. Compares only `semanticReceiptDigest`, asserts all three verifier envelopes, and retains the validation report, two raw Receipts, and three verifier reports through the existing always-run artifact upload.

No cleanup step was added. GitHub's job workspace is ephemeral, and omitting destructive cleanup prevents cleanup behavior from obscuring the primary gate result. A pre-existing historical-worktree or canonical-copy target instead fails closed.

## TDD and local verification

- Initial RED: three new focused tests failed `0/3` because the absolute canonical binding, resolver, and historical worktree steps did not exist.
- Historical execution GREEN: the three tests passed `3/3` after implementation. Executable fixtures proved committed-byte binding, exact keys, Manifest-path parity, 40-hex filtering, command-injection rejection, commit existence/ancestry, non-ancestor rejection, fixed-path collision rejection, detached checkout, exact historical HEAD, and clean status.
- Copy-boundary RED: two focused tests failed `0/2` because the fixed runner-temp canonical copy did not yet exist.
- Copy-boundary GREEN: the focused Promotion Shadow suite passed `8/8`, including symlink-source, copy-target collision, and source/committed byte-mismatch cases. The valid fixture proved byte-identical `0600` output.
- Parsed workflow shape is 17 steps and 14 shell blocks; all 14 shell blocks pass `bash -n`.
- Full `scripts/release-governance.test.mjs` passed `92/92` with zero failures.
- Staged-diff, commit, upstream, and clean-status evidence are recorded after final verification.

## No-live boundary

This slice contains no Preview, deploy, Vercel, provider, application-network, database, production, live-registry, alias, candidate, Manifest, Receipt, Schema, core, or branch-protection mutation. `npm ci` is dependency installation from the committed historical lockfile, not application/provider execution. Local structural and fixture tests do not prove a hosted GitHub Actions run or uploaded artifacts; those require the later composition PR run.
