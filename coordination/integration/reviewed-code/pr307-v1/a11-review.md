# Independent A11 review — exact PR307 required-check admission

- Reviewer: /root/low_frequency_release
- Reviewed at: 2026-11-02T02:42:55.442Z
- Decision: approved-for-exact-pr307-required-check
- Scope: exact-pr307-hourly-teacher-notice-required-check-only

## Identity and immutable scope

I reviewed tooling T b898a6b331a6bc7f0156aad9b71b04007e3767bc, tree a08d1ded09caeabe2f60a3efb326381891e550ae, directly parented by source S 462cf236fc599d332deb77c62bb9bb45b5f65465. I did not author S or T. Source owner /root and tooling author /root/health_diagnosis are distinct from this reviewer. This is an independent source/tooling eligibility decision for the exact PR307 required check; it is not review of an invented future evidence commit, a historical Promotion rerun, or production authorization.

Source S is directly parented by B b56ede5c36f94d7ee8884048ce80e6f1afea8521, with tree 464ba82371c91a37de03d819e03adc4b8ce389d9. Its exact 17-path inventory digest recomputes to ab48a5bc2331532a91558d5f5b2ef9d7bd67bb428286712dd8e5853961469889. T changes exactly the five declared tooling paths and has inventory digest 38026fa8525cb75decf2506696f8b811220b735bebadafb9d8e72d274a019fc5. I independently recomputed these inventories against Git, compared their before/after modes, object IDs and raw hashes, and read all changed tooling bytes. The checkout was clean at T before and after my checks.

## Source-check evidence

The strict-parsed source-check file has raw SHA-256 62aef65d947cf0e4d7475c695b92974f701f5a66448d02bc3630ce1e78db1894. I rehashed each referenced stdout/stderr file and parsed the actual TAP output against the fixed command, count and test-name contract. Its strict nonincremental TypeScript result is empty stdout/stderr; hourly regressions pass 98 tests and the unchanged historical activation contract passes 17 tests, without failures, skips, cancellations or TODOs. These are previously recorded clean-S offline checks, not a new live probe or execution of historical native Shadow.

The new checker re-executes the same fixed source commands at the final admitted head, in addition to its own contract tests. Child environments are allowlisted and omit credential/database/provider variables and inherited Node loader variables. Exit status, signal, parsed TAP accounting, exact source test counts/names, and type-check output are validated. Fresh artifacts must be in an empty private canonical runner-temp directory outside the repository, and tracked-tree materialization/currentness is checked before and after execution.

## S → T → E and event controls

I inspected the complete checker and all 45 contract tests. The checker fixes B/S and S's inventory, permits only the five T paths, requires T's direct S parent, and binds the actual T commit/tree/inventory into both independent reviews. Future evidence E must directly follow T, first-add exactly seven prescribed records, retain the same complete E tree, and bind each review/report hash and timestamp. The review identities A11 /root/low_frequency_release and A23 /root/content_release_review are fixed and distinct. Extra paths, stale/shared identities, source or tooling drift, duplicate/unknown authority keys, links, hidden index flags, replace/graft/shallow history, inherited loaders and unsupported permission claims are rejected.

The PR event is restricted to same-repository PR307 with exact B/E and main target. The push path requires exact before B, main ref, ordered B/E parents and E-equivalent tree. Empty descendants and altered merge compositions cannot reuse E. A present invalid new marker fails before any older selector fallback. The evidence commit does not exist at this review stage; final-head GitHub execution remains required after it is sealed.

## Preservation and CI runner repair

The Promotion workflow equals the deterministic addition of the PR307 selector, allowlisted mode, verification step and pinned artifact upload. Removing those additions reconstructs S's workflow bytes. Prior selectors, commands, steps, checker code, reports and Receipts are not edited or repurposed. The historical native activation suite remains a contract check; the decision explicitly records historicalNativeExecuted false.

The CI diff changes only visualization-browser and teacher-parent-e2e runs-on values from ubuntu-latest to ubuntu-24.04. I independently compared parsed YAML: every other job field and top-level control is equal. Installed playwright-core is 1.59.1; its native dependency data contains Ubuntu 24.04 targets and no Ubuntu 26.04 target. This is bounded runner compatibility repair. Browser tests themselves still require fresh actual runs on the selected image; no package upgrade, skip, permission widening or altered event matrix was admitted.

## Independent execution and limits

I independently executed the 45 PR307 contract tests under the checker's sanitized child environment. Result: 45 passed, 0 failed, 0 skipped, 0 cancelled, 0 TODO, exit 0, null signal, empty stderr. Test-name digest: 3e90d477d6272b23209e0e510482f0fe1fa769dc176648a9eb97ce35f24ee42a. Independent stdout SHA-256: 21f32e504eb8b9bff22eae1539af743467a29df5d194beee95cb8e9e04f29fd7; stderr SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855. This run covers successful synthetic S/T/E shape plus negative source/path/event/review/permission/materialization/loader/CI mutations. Synthetic approvals are test fixtures only.

The inherited full materialization helper has a disclosed local macOS long-path limitation in this checkout. I do not treat selected-path/hash checks or the synthetic contract pass as a completed final E admission. The real Linux workflow must still run the full final-head checker, type check, source regressions and browser jobs. No live Neon, provider, deployment, Preview or production-acceptance operation was performed.

## Disposition

No actionable blocker was found in the reviewed T implementation or its declared bounded scope. I approve this exact T for independently sealed PR307 required-check evidence, subject to actual final-head execution. All six permissions remain false: historicalPromotionRevalidated, liveAllowed, previewAllowed, deployAllowed, wholePackAccepted and historicalAuthorityTransferred. This report neither changes those permissions nor grants acceptance to unrelated accumulated main changes or current production.
