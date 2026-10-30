# A11 independent review: exact PR305 ordinary-code admission

- Reviewer: /root/pr305_gate_a11 (A11).
- Reviewed at: 2026-10-30T07:02:53.576Z.
- Result: approved-for-exact-pr305-required-check.
- Scope: exact-pr305-diagram-inventory-required-check-only.
- Baseline B: 4501af09d87e44ab849283892bf6d1323ce0c4c6.
- Source S: d6a5455ec2e5d2f01c5f893c2129eaa0f4886651.
- Source tree: 06530773f3a2faeed7245896847627ef7c611d39.
- Source inventory digest: 1732c817dbc0224ed224749cd31fb1c6398e5800056e2d3b64a2e81a5730eab9.
- Tooling T: 555bc31960da2066dc4a9641626dd6a97cafbdf9.
- Tooling tree: 1ef4c0c61c55589ca725c9694a5f9ca6fe42c715.
- Tooling inventory digest: 9269fcc3c288fabe0f1c39564565ab8bcd3d6770e592094037f1ded9013d247d.
- Frozen source-checks raw SHA-256: 27afe6bf7288378b0cd37a34127465da4544e53d419d5440a78eea1bba5e4143.

## Decision and scope

No actionable P1/P2 finding remains in the exact four-file tooling delta reviewed here. The implementation admits the five-file diagram-inventory repair through its own ordinary-code required-check contract. This decision binds the actual committed T above; it is not an approval of a future or different T, an assertion of an evidence commit E, or a final CI/merge result.

I verified Git identity, sole-parent ancestry from T to S and from S to B, actual tree IDs, source/tooling inventory digests, exact path partitions, and the clean working tree directly. All four tooling working files matched their T Git blobs. The corrected documentation accurately distinguishes fixed gate-test count from the exact source/historical test-name bindings.

## Checks I performed

1. Fresh actual-T admission-contract execution: Node v24.15.0, command ["--test","--test-reporter=tap","scripts/promotion-reviewed-code-pr305.test.mjs"]. Started 2026-10-30T06:59:53.063Z; completed 2026-10-30T07:00:39.683Z; exit 0. Result: 42 tests passed, 0 failed, 0 cancelled, 0 skipped, 0 TODO, 0 suites. Result-name digest d703ad78419fe139114e50aa34a5b14d762f54c81174316367e89dccc20fe928. This run includes synthetic Git chains, event/ancestry/path partition negatives, dirty/aliased evidence and loader tests, malformed TAP/JSON checks, inventory mutations, exact workflow reconstruction, and frozen PR304 preservation checks. Synthetic reviews remain explicitly labelled fixtures; they are not the independent review evidence.
2. Verified source-checks.json against its frozen raw hash, its strict schema, exact command definitions, execution timestamp relative to S/T, and every producer-owned raw stdout/stderr hash. Reparsed all four original command outputs through the current validators. This is independent consumption and verification of frozen clean-S execution evidence; I did not rerun its TypeScript or 44/17 source suites during this formal pass.
3. Compared all nine discovered inventory row collections and every summary count against the immutable attempt-003 current inventory. They match. The fresh inventory command exercised by the 42-test suite also matches the full report digest 45748db4d56b2b03c45dadadd3592332d4a54c59c533e6bbb57ad33424cad607. Zero current failures remain separate from all ten original historical failure strings.
4. Reconstructed the complete workflow from S and confirmed exact equality. The PR305 selector precedes the inherited PR304 activation, both new Node entries remove NODE_OPTIONS/NODE_PATH, an invalid present marker fails closed, and all old steps/actions are retained.
5. Confirmed B-to-T Git equality for scripts/promotion-required-check-ca-textbook-successor.mjs, the entire coordination/integration/ca-textbook-successor subtree, and coordination/reports/2026-08-09-math-diagram-inventory.json. The unchanged suite still rejects PR305 through the old PR304 activation contract. The new checker independently rejects attempts to place historical checker/report/receipt/review/Manifest mutations in its tooling partition.
6. Verified repository HEAD remained T and the working tree remained clean after the fresh contract run. I made no repository, index, ref, branch, provider, credential or deployment changes.

## Frozen clean-S evidence consumed

- types: exit 0; empty stdout/stderr; no TypeScript diagnostics.
- diagram-regressions: 44 passed with exact result-name digest 62beef340a3bf3179e634ed05a929c7574ceb00c6ed603629fe051fef81646ec; no failures, cancellations, skips or TODOs.
- inventory: full report digest 45748db4d56b2b03c45dadadd3592332d4a54c59c533e6bbb57ad33424cad607; discovered-row digest 737169bdab539145ee20787a9fdb35454dbd503636985eae70b5d58ae70a46bf; 0 current failures; 10 historical failures with digest 2b698c56c86d913773780ea01ff3e4c73d325499992d3850ca9aa907a8307e7d.
- historical-activation: 17 passed with exact result-name digest da026388acb67cad60dfffb17b5b21e7b99f93ce9381a732f6124b34dc43fb20; no failures, cancellations, skips or TODOs. These are unchanged synthetic/pure activation-contract regressions, not native Shadow execution.

The producer-owned clean-S evidence is retained at /private/tmp/mais-pr305-admission-20261030 and was executed at 2026-10-30T06:35:57.959Z. I independently verified its bytes and semantic summaries. I did not independently rerun the broad 107-test historical Promotion collection; the parent's reported 106-pass/1-path-length-failure result is not recast here as my fresh verification.

## Local materialization limit and remaining checks

I attempted the unchanged full assertMaterializedTree(root,T). It stopped with ENAMETOOLONG during lstat on a 1030-byte absolute historical path. The exact relative path is:

coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/reaffirmations/parent-instance-proof-inline-20260827/reaffirmations/production-schema-diagnostic-20260827/reaffirmations/reviewed-main-runtime-graph-20260827/reaffirmations/production-schema-diagnostic-v2-tooling-20260827/reaffirmations/c0-i18n-content-legacy-byte-review-20260828/reaffirmations/session-privacy-ux-20260828/reaffirmations/pr220-strict-json-composition-20260830/reaffirmations/runtime-policy-exact-delta-20260901/reaffirmations/u224-r10/reaffirmations/g07/inputs/evidence/a04-practice-semantics.v2.6.json

The path's Git identity is 100644 blob a832f27e7f076082421fab44be61e4782e226970 and is identical at B, S and T. This demonstrates an inherited local macOS path limit; it does not demonstrate complete current-tree materialization. The failure and its Git provenance are retained separately. I did not alter the old path, suppress the check, or waive it.

The complete new check command against a real E and actual GitHub event has not been run by me: E does not yet exist, and local full-tree materialization is blocked as described. Both unchanged before/after full-materialization checks must pass in the clean Ubuntu runner. Actual final-head Promotion and other required remote CI remain pending; any remote failure still blocks their respective completion claim.

No native heavy Shadow, new native receipt validation/closure, application build, new browser matrix, production activation or deployment was performed. Existing historical globalInventoryPassed=false values remain unchanged. All six permissions are false: historicalPromotionRevalidated, liveAllowed, previewAllowed, deployAllowed, wholePackAccepted and historicalAuthorityTransferred. The review grants no historical authority transfer and no whole-pack/content/browser/production acceptance.

## Reviewer-owned evidence

- /private/tmp/mais-pr305-a11-review-20261030/identity-and-source-evidence.json
- /private/tmp/mais-pr305-a11-review-20261030/fresh-contract-result.json
- /private/tmp/mais-pr305-a11-review-20261030/gate-contract.stdout (SHA-256 afb2c0bce67992a4f73439a814a3a97dd0eb6a1f28373e8140614ae1b975b43c)
- /private/tmp/mais-pr305-a11-review-20261030/gate-contract.stderr (SHA-256 e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855)
- /private/tmp/mais-pr305-a11-review-20261030/materialization.json
- /private/tmp/mais-pr305-a11-review-20261030/materialization-path-provenance.json

Only this Markdown report and its paired A11 JSON decision are intended for exact-byte copying into the seven-file E evidence partition. Their review binding does not depend on an invented E identity.
