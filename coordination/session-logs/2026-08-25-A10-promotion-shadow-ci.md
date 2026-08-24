# A10 Promotion Shadow CI session log

## Session metadata

- Owner: `A10`
- Branch: `codex/a10-promotion-shadow-ci-20260825`
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a10-promotion-shadow-ci-20260825`
- Target PR: `pending`
- Creation date: `2026-08-25`
- Expected closeout date: `2026-08-26`
- Baseline: `b6c7c347a49a813e454e707dd3c16399dcf29909`

## Exact session slice

- `package.json`
- `scripts/release-governance.test.mjs`
- `.github/workflows/promotion-shadow.yml`
- `coordination/release-intake/owner-pathspecs.json`
- `coordination/session-logs/2026-08-25-A10-promotion-shadow-ci.md`

No `coordination/integration/**` file was edited. The workflow consumes the A23-owned frozen interface and planned real-pilot artifacts after that independently reviewed slice is integrated.

## TDD evidence

RED was observed before implementation:

- `node --test --test-concurrency=1 --test-name-pattern='Promotion Shadow' scripts/release-governance.test.mjs` — `0/2` passed. The Git-index `package.json` returned `undefined` for all four required commands, and `.github/workflows/promotion-shadow.yml` did not exist.
- `node --test --test-concurrency=1 --test-name-pattern='default package gate and exact owner mappings are valid' scripts/release-governance.test.mjs` — failed with `Missing exact owner pathspec: .github/workflows/promotion-shadow.yml`.
- After staging only `package.json` for the index-based contract, the P0 digest assertion failed closed with actual digest `1cc382fe95fb1fbf4cf0c167e1a22c32398697c17b5bb6cca102dd8a8133dc7d` against the prior frozen digest. The reviewed digest was then updated to that exact value.
- A focused follow-up test required verification of the committed canonical receipt and failed until the exact existing `promotion:verify-receipt -- --receipt ... --json` interface was added.

GREEN evidence:

- `node --test --test-concurrency=1 --test-name-pattern='Promotion Shadow npm commands|Promotion Shadow CI|default package gate and exact owner mappings|shared owner resolver selects one most-specific owner|P0 package delta' scripts/release-governance.test.mjs` — `5/5` passed.
- `npm run test:release-governance` — `86/86` passed.
- YAML parsed with the repository's pinned `yaml@2.9.0`; it resolved workflow name `promotion-shadow-gate`, triggers `pull_request`, `push`, and `workflow_dispatch`, main-only push, job name `promotion-shadow-gate`, and 10 steps. Every `run` block also passed `bash -n`. `actionlint` was not installed locally.
- `npm run type-check` — passed (`tsc --noEmit --incremental false`).
- `npm run release:package-gate -- --json` — passed with `valid: true`, 8 release packages, 37 owner-path packages, and 25 exact resolution checks; `.github/workflows/promotion-shadow.yml` resolved unambiguously to `A10`.

## Promotion interface boundary

- Manifest: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v1/promotion-manifest.v1.json`
- Canonical receipt: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v1/shadow-receipt.v1.json`
- Fresh and replay receipts are runner-temporary artifacts with distinct run IDs. The workflow compares only `semanticReceiptDigest`, validates its lowercase SHA-256 shape, verifies fresh/replay/canonical receipts, and uploads the two runner-generated receipts. Raw receipts may legitimately differ through run ID, timestamp, or CI metadata, so raw inequality is diagnostic rather than a flaky hard gate.
- This baseline does not yet contain the A23 CLI, real manifest, or canonical receipt. Therefore this A10 slice proves the npm, workflow, frozen-digest, YAML, and owner-routing contracts; executing the Promotion Gate itself remains an explicit integration dependency on the A23 slice.

## No-live/deploy boundary

This slice authorizes only fail-closed, no-provider shadow validation. It contains no preview, deploy, production, live-promotion, provider, or remote-write command, performs no candidate-to-live mutation, does not deploy, and will not be pushed by this session.
