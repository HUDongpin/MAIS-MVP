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


## 2026-09-07 HKT — Current-main path fixture validation

The ordinary merge of main `e3df2bde40114ec34b7414acf68e33e2e8803905` retains the original acceptance-key and migration-script fixes. On that main, the Playwright path-safety test derived its checkout root from an encoded URL pathname, so a real Chinese directory caused 30 tooling failures before the intended config assertions. This revision uses `fileURLToPath` at that one fixture root; the 30 test calls and 92 assertions remain unchanged.

In the same isolated checkout named `中 文`, the original tooling entry produced 46 passes and 30 failures. The corrected entry passed all 76 tooling checks and then all 404 runtime tests with zero skips. An independent review reproduced four normal/escape boundary cases and verified exact assertion AST identity and unchanged frozen checker bytes. Root evidence is held in the authorized external recovery run under `B2-playwright-path-validation` and `B2-playwright-path-independent-review.json`.

The older frozen v2.6 promotion test also has a Unicode-path limitation; its eight-file immutable checker bundle was not edited. The actual merged main `fda1be8e0d0b9946f4dc175ab6185fa4dbdb1ac9` passed its original public Promotion entry 106/106 in a clean ASCII checkout and its GitHub main gates. That independent path result does not change the recorded failure on the Unicode physical main directory.
