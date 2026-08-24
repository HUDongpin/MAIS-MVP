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

## Post-commit spec review fix

Review of commit `f5fe6a23e053aad2bbbe651985d829d5e22cd3e8` found two material gaps:

- P1: the artifact upload contained only fresh/replay receipts and omitted the required validation/check report.
- P2: the governance test could be satisfied by the phrases `legacy 492-question ratchet` and `selected-candidate live reachability` appearing only in a display name; it did not execute a fail-closed assertion over the validation JSON.

The fix captures pure `promotion:validate --json` stdout at `$RUNNER_TEMP/promotion-validation-report.v1.json`, executes a dedicated assertion over the frozen `promotion-validation.v1` envelope, and uploads that report with both receipts. The assertion requires exact envelope and per-check fields, `result: pass`, lowercase 64-hex manifest/candidate digests, candidate-digest parity with the manifest, and the exact ordered unique set of eight passing check IDs including `live-reachability` and `legacy-ratchet`.

Review-fix TDD evidence:

- RED: `node --test --test-concurrency=1 --test-name-pattern='Promotion Shadow' scripts/release-governance.test.mjs` — `1/3` passed and `2/3` failed because `PROMOTION_VALIDATION_REPORT` and the executable validation-report assertion step were absent.
- Follow-up RED: the focused validation-report test failed because reversing the manifest's `allowlistedCheckIds` still exited zero; the assertion did not yet prove report-to-manifest check-order parity.
- GREEN: the targeted Promotion Shadow command passed `3/3`, and the focused validation-report test passed after adding the parity check. Its executable fixture matrix accepted the exact valid envelope and rejected wrong schema, failed envelope, malformed digest, candidate mismatch, failed legacy ratchet, failed live reachability, duplicate/missing checks, unexpected check fields, and manifest allowlist order drift.
- `npm run test:release-governance` — `87/87` passed.
- YAML parsing confirmed 11 total workflow steps and 8 shell `run` blocks; all 8 `run` blocks passed `bash -n`. The upload path contains the validation report and both runner-generated receipts.
- `npm run release:package-gate -- --json` — `valid: true` with the same 8 release packages, 37 owner-path packages, and 25 resolution checks.
- `npm run type-check` — passed (`tsc --noEmit --incremental false`).

## Promotion interface boundary

- Manifest: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v1/promotion-manifest.v1.json`
- Canonical receipt: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v1/shadow-receipt.v1.json`
- The validation report plus fresh and replay receipts are runner-temporary artifacts; the receipts use distinct run IDs. The workflow compares only `semanticReceiptDigest`, validates its lowercase SHA-256 shape, verifies fresh/replay/canonical receipts, and uploads the validation report with both runner-generated receipts. Raw receipts may legitimately differ through run ID, timestamp, or CI metadata, so raw inequality is diagnostic rather than a flaky hard gate.
- This baseline does not yet contain the A23 CLI, real manifest, or canonical receipt. Therefore this A10 slice proves the npm, workflow, frozen-digest, YAML, and owner-routing contracts; executing the Promotion Gate itself remains an explicit integration dependency on the A23 slice.

## No-live/deploy boundary

This slice authorizes only fail-closed, no-provider shadow validation. It contains no preview, deploy, production, live-promotion, provider, or remote-write command, performs no candidate-to-live mutation, does not deploy, and will not be pushed by this session.
