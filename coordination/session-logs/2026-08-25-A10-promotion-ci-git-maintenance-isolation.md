# A10 Promotion CI Git Maintenance Isolation

- Owner: A10 Tooling, Docs, and Report
- Branch: `codex/a10-promotion-ci-git-maintenance-isolation-20260825`
- Target PR: https://github.com/HUDongpin/MAIS-MVP/pull/154
- Created: 2026-08-25
- Expected closeout: 2026-08-25
- Baseline: `3f78438b8ecc9c4d83653038c1944d9df5c3e7f4`
- Scope: `.github/workflows/promotion-shadow.yml`, its release-governance assertion,
  and this session log only.

## Observed failure

GitHub Actions run `32855566941`, job `97826567451`, executed all 120 frozen
Promotion Gate core tests. The evidence-currentness test completed its assertions but
failed during temporary repository cleanup with `ENOTEMPTY` while removing
`.git/objects/pack`; the suite reported 119 pass and one teardown failure. The same
exact frozen release passed 120/120 in the preceding CI run, so this is a detached Git
auto-maintenance race rather than a Promotion Gate semantic result. It is nevertheless
treated as a real CI reproducibility defect and is not waived or retried into green.

## Correction

The job now supplies inherited Git configuration that disables automatic GC,
automatic maintenance, and both detached variants for every checkout and synthetic
Git subprocess. This prevents a background object-pack writer from outliving the
awaited Git command and racing recursive teardown. The workflow still executes the
unaltered frozen terminal-audit release
`ca89c923065a1b9dd6aee40fbc78326be13aae07`; no test, checker bundle, policy,
Manifest, Receipt, candidate, or terminal disposition is rewritten.

The release-governance suite pins all nine Git environment entries so a later workflow
change cannot silently remove this isolation. There is no automatic test retry, ignored
failure, `continue-on-error`, live command, deployment capability, provider access,
database access, or network operation.

## Local verification

- `node --test scripts/release-governance.test.mjs`: 95 pass, 0 fail.
- Frozen terminal-audit v2 tests with the CI Git environment: 58 pass, 0 fail, one
  intentionally opt-in current-HEAD case skipped.
- Frozen Promotion Gate core tests with the CI Git environment: 120 pass, 0 fail.

The immutable attempt remains `repair_required`; the parent package remains
`candidate-only`; `liveAllowed=false`; maturity remains `not-shadow-mature`. GitHub
CI evidence for this corrective commit must be captured after push and cannot be
manufactured in this pre-commit log.
