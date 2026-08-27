# A22 Production exact-SHA check policy

- Owner/lane: A22 production reliability and release engineering
- Branch: `codex/a22-production-check-policy-20260827`
- Baseline: protected `main` at `3d851ec2c03b04973d65bac78705e53d5e1adb90`
- Target PR: pending
- Created: 2026-08-27 HKT
- Expected closeout: 2026-08-27 HKT after merge and production certification

## Scope

Production release run `33002079501` completed the isolated 6144 MB release
build and then failed closed before schema apply because the exact-SHA GitHub
candidate verifier still allowed only the seven CI job names in branch
protection. Protected `main` now intentionally requires two GitHub Actions
contexts: `validate` and `promotion-shadow-gate`.

This slice preserves the seven-job, one-trusted-CI-run requirement and adds an
independent exact-SHA proof for the protected Promotion Shadow check. The
promotion check must be the latest completed successful check from the GitHub
Actions app and must bind to a completed successful `main` run of the fixed
`.github/workflows/promotion-shadow.yml` workflow. Missing, stale, failed,
incomplete, wrong-app, wrong-workflow, wrong-event, wrong-repository, or extra
protected contexts fail closed. No branch protection, workflow, application,
database, provider, deployment, or secret configuration is changed here.

Post-failure read-only schema preflight run `33003033844` confirmed PostgreSQL
17 and unchanged empty outbox, webhook, and heartbeat states. No schema
mutation or alias promotion occurred in the failed deployment.

## Verification

- Focused RED: 10 passed and 8 failed against the stale verifier, including
  the current two-context branch-protection fixture.
- Focused GREEN: `scripts/github-candidate-checks.test.mjs` passed 18/18.
- Production deploy, workflow, and candidate-verifier tests passed 34/34.
- Release governance passed 91 tests with 11 explicit skips and 0 failures.
- `npm run type-check`: passed.
- `git diff --check`: passed.
- Live read-only GitHub verification against baseline SHA/tree passed and bound
  all seven CI jobs to run `32998096662`, plus `promotion-shadow-gate` to its
  independent trusted run `32998096686`.

## Handoff

Review and merge this exact three-path slice. After merge, use the new protected
`main` SHA to regenerate fresh build, CI, Promotion, environment, and read-only
schema evidence before retrying the serialized production release. Do not
reuse the baseline SHA's build attestation or schema confirmation.
