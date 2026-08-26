# A25 Promotion Shadow CI Closeout

- Owner: A25 Git Hygiene and Release Intake
- Branch: `codex/a25-promotion-shadow-ci-closeout-20260825`
- Target PR: https://github.com/HUDongpin/MAIS-MVP/pull/154
- Created: 2026-08-25
- Expected closeout: 2026-08-25
- Baseline: `03175a9974c52efe9112d3d91c483002749926e4`
- Scope: one append-only release-intake addendum plus this session log; no prior disposition, implementation, workflow, candidate, live, or production file is modified.

## Observed disposition

GitHub Actions run `32853089474` executed the current PR merge ref with the terminal
audit v2 release pinned to `ca89c923065a1b9dd6aee40fbc78326be13aae07`.
Every workflow step through exact six-file artifact upload passed. The final outcome
enforcer alone returned exit 1 because the current-HEAD audit was blocked and all three
historical Receipt verification envelopes authentically retained the failed attempt.

The current merge ref is not current against the attempt baseline:

- `TARGET_BASELINE_PROJECTION_STALE`: 3,670 reviewed projection files versus 3,696
  current files.
- `RUNTIME_GRAPH_POLICY_MISMATCH`: observed graph digest differs from the reviewed
  registry, so current legacy discovery remains dependency-blocked.
- The exact historical execution commit still deterministically returns
  `LEGACY_NEW_CONFLICT` with 15 new and one opaque conflict; fresh, replay, and canonical
  semantic Receipt digest is `e7be6e6db1031794b6522bedd7cc87496b2efa8832abf81ed43d58cf6a4f3316`.

## Final boundary

The A23 terminal-audit v2 and A10 CI-runtime packages are `reviewed commit`. The
candidate/current-baseline package remains `blocker report`. PR 154 stays draft and
blocked. The immutable attempt stays `repair_required`; parent package stays
`candidate-only`; `liveAllowed=false`; maturity stays `not-shadow-mature`. Any repair
requires a new candidate version, manifest, baseline review, and attempt.

## Verification

- `node --test scripts/release-governance.test.mjs`: 95 pass, 0 fail.
- Addendum JSON parses successfully and its stable self-digest (excluding
  `recordDigest`) is
  `b7c6d63f30630c7ab21002b6d2b89e957b0c60610646ac2e203a40a7678d90a9`.
- Source disposition raw SHA-256 remains
  `8c9b2f828d13af098a276c79555e013a2327af9e57f1e3a88c79da3cead9eb3b`;
  it was not edited.
