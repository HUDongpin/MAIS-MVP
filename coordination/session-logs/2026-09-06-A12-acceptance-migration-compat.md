# A12/A11 acceptance and migration test compatibility — 2026-09-06

Owner: A12 with focused A11 validation. Baseline:
`7f692278989b4bf45496d239bccb9263326b5453`.
Branch: `codex/a12-acceptance-migration-compat-20260906`.
Target PR: pending. Expected closeout: 2026-09-07 after main acceptance.

The source branch `codex/a11-a22-parent-acceptance-idempotency-key-20260829`
contained two omitted commits, `470fe3220d6c96aead9f4c5ba2f6c270a4a58f14`
and `c68b1c4ddacd1d2378d0edf7a607f61b1401ea4e`. Their final two-file change
is ported exactly. Acceptance keys use a colon rather than a slash, matching
the existing server character contract. Mock orchestration verifies that
create and reply keys are stable on replay and all three kinds are distinct.
The notice request occurs once in this mock; no notice replay or database
idempotency claim is made.
No production acceptance run is performed by this change.

During the independent Resend source-coverage review, three inherited migration
test subprocess assertions failed in the Chinese worktree path. The test passed
URL-encoded pathname strings to Node. Using `fileURLToPath` for the two script
URLs preserves spaces and non-ASCII filesystem paths. Runtime migration,
maintenance, storage confirmation and target guards are unchanged.

Fresh validation:

- Acceptance test-first run: 11 passed, 1 failed on the old key behavior;
  after the one-character separator repair, 12/12 passed.
- Exact main runtime plus the migration test in an external Chinese-and-space
  path: baseline 56/59, then repaired test 59/59, zero skips. The first fixture
  omitted `vercel.json` and had an additional unrelated fixture failure; its
  logs were retained and the completed fixture was used for these counts.
- All runs used mock transports or disposable local fixtures. No real provider,
  production database, environment placement or deployment was requested.

The original branches remain until their PR/main outcome and recoverable source
custody are accepted. External source bindings and original red/green logs are
held under the convergence run's `B2-validation/` directory.
