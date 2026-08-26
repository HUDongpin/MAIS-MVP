# 2026-08-27 A07 — MAIS-NATURAL-CA60-V5-R9 pre-execution validation failure

## Exact frozen identities

- Runner source commit: `39bad6c07135bd834f4fc1f673ebae1f8252c0da`.
- Immutable registration commit: `690ed6a07c8599c691f9fbbc962dd43f192042cb`.
- Registration self-hash: `96f4107ccf393c4b287c9245f1679962ed5e5984ef476a9267a43b98629615f7`.
- Production source root: `5a247697b38aec540772b6640d51bb134ee33aa2af56b09cefece9a5e19df391`.
- Test source root: `f9a0c1f05251f62b52ca1f85c4f8271549d11ccca97b6f256954a5f794688a4b`.
- Import-closure root: `b76d0d664d9d3b1d40e3a3b0c70e85809e2cdc265e986241709f136a93d35625`.

## Post-registration result

The exact registered suite completed with `52 tests / 51 passed / 1 failed / 0 skipped`.
The 240-role retained-raw reconstruction passed. The only failure was
`R9_FINAL_ADAPTER_RELOADS_IMMUTABLE_GIT_CUSTODY_BEFORE_CREDENTIAL_ACCESS`.

The adapter behaved fail-closed and stopped before credential access. The test nevertheless failed
because its expected-error regex accepted registration/Git errors but not the exact, valid
`A07 closeout receipt and session log require one shared immutable add commit` error that becomes
authoritative after registration and before closeout.

This is a phase-dependent test-contract defect, not evidence of credential access, provider execution,
question egress, or a natural-question result. It still prevents a truthful R9 closeout because the
registered post-registration suite did not have zero failures.

## Disposition and boundary

- Final state: `BLOCKER_REPORT`.
- Research disposition: `SUPERSEDED_NOT_EXECUTED`.
- R9 must not receive an A07 `REVIEWED_COMMIT` closeout or fresh signed A11 concurrence.
- R9 must not be edited in place. A pre-first-provider append-only R10 registration must preserve this
  receipt and remediate the phase-sensitive test before a new source/registration/closeout/review chain.
- Credentials, `.env*`, and `All API Keys.docx` read: `0`.
- Provider calls / HTTP requests / natural-question reads / natural-question egress: `0 / 0 / 0 / 0`.
- Tokens / attempts / USD authorized or spent: `0 / 0 / 0`.
- Reference labels / natural-question results: `0 / 0`.
- Live content, app, API, deployment, or question-bank mutation: `0`.
- Decision ceiling remains `INCONCLUSIVE_MACHINE_REFERENCE`; no `PASS`, `APPROVED`,
  `PRODUCTION_READY`, or `LIMITED_GENERALIZATION_EVIDENCE` claim is permitted.

Machine-readable preservation receipt:
`coordination/reports/mais-natural-ca60-v5-r9-pre-execution-failure-a07/r9-pre-execution-failure-receipt.json`.
