# A11 independent commit-bound review for PR275

Reviewer identity: /root/pr275_a11_review
Role: A11 independent verification and regression review
Reviewed at: 2026-10-18T13:18:39.490Z
Result: approved-for-ordinary-code-required-check
Live allowed: false

This is a new review of the real frozen S and T below. Earlier uncommitted preparation reviews are historical context and are not reused as this approval. This result establishes only ordinary-code required-check eligibility for the exact PR275 composition. It does not assert that E, remote CI, native Promotion, Shadow, merge, deployment, live use or whole-pack acceptance has completed.

## Exact bindings

- BASE B: 656ac319b2ad5812d31ad952cbb18430b5e58065.
- SOURCE S: f58fd25d913de68e75796b66e15247c199cdb99c, with exactly B as its sole parent.
- Source tree: fd382a7974f248e459c57654aa881ed6a40e34b7.
- Source inventory digest: 8650aefefcffef3babf6933dae2ea15f8157e758c22a38db83cc30980c6f6c7e.
- TOOLING T: 7027d95fa0c8d6300a24d6da2dbb5c0d7aac4546, with exactly S as its sole parent.
- Tooling tree: 44c9afb54b9f2420d3724c05b9a8def9830e460a.
- Tooling inventory digest: 3d06806b699bdfb9fb9f7154ad008c75758b867e758294671c9764e6c50abefa.
- Observation raw SHA-256: 728f20e13198c00375e816d4b34363bf418790a12668fdd80b7c1467727d4758.
- Source checks raw SHA-256: 84f6a79fd8c26dce226dd950307d6d2b44bca57853347f894a522539f661d79b.

I inspected raw S/T commit objects, independently recomputed both inventories from actual Git objects, and confirmed T changes exactly the four authorized tooling paths. The real review checkout was clean at T. I compared 94 source/protected files with their frozen B/S objects and working bytes, without drift. PR274 under the historical pr264 names and the earlier PR259, PR270/PR271 and native legacy contracts remain unchanged.

| Frozen file | SHA-256 |
| --- | --- |
| scripts/promotion-reviewed-code-pr275.mjs | 111732cb9424079e132f1989664f745dc59c95e7e35564ca71b7600477539dad |
| scripts/promotion-reviewed-code-pr275.test.mjs | 025ffca3fe1d8707b2991ca45b124dcb3f9e0dd0ce76d26925c0aed80ffe9035 |
| .github/workflows/promotion-shadow.yml | 119dd36ab9809f6382c5f65077e7d551fe6ed49ae805a9a5937968072ac37576 |
| docs/pr275-reviewed-code-gate.md | 732393d7b7d53a39dbebd352c673f88a748edca9d0274f7b107a25a552d84b76 |

## Independent verification performed for frozen T

I freshly executed the exact evidence and model/source commands exported by this T checker. They passed 49/49 and 35/35 respectively, with zero failures, cancellations, skips or todos. Genuine TAP reports matched the exact frozen title sets. My independent evidence stdout hash was 429606cc88b132a71ea12b2f29d44668b7161497180e4308e09099f9de74df6b; model/source stdout hash was 88ba3522093ae91c9cd34d053b61e2b7c344475943996244e9117abe06c3507c. Both stderr streams were empty. These are separate independent executions, not the coordinator's frozen raw reports.

A bounded 16-case contract run passed 16/16, with zero failures, cancellations, skips or todos. It exercised source ancestry, extra tooling, sparse materialization, browser proof coverage and errors, exact command/output binding, workflow preservation, missing current/native proof, decision permission comparison, actual shell selection and failure without fallback, wrong source/tree/parents/extra evidence, exact 49/35 completeness, preserved contracts, and extra/noncanonical TAP. The separate untracked-Git-graft negative test passed 1/1 with zero skips. These are two bounded runs; I do not claim to have independently run all 27 contract cases.

I additionally constructed and rejected 46 malformed proof variants: 17 for each TAP suite (including invalid UTF-8), and 12 browser variants. They included empty/missing results, substituted names, wrong counts, duplicate numbers/statistics, case-insensitive skip/todo and bailout records, extra bare/indented results, commented/indented extra plans, repeated version headers, noncanonical result casing, browser filename suffix collisions/wrong paths, singular and array errors, retry, missing mode, wrong title/project, skips, flakes, unexpected results and report errors. Synthetic positive formats tested only validator behavior and are not acceptance evidence.

The source review confirmed that a passed historical package ID cannot certify a new run without independently supplied immutable source context, clean source status, exact lab set and matching execution configuration. Validation consumes retained snapshots and rejects missing/inherited/sparse binding cases; the broader A11/A22 follow-up gate remains red. The synthetic handoff-fixture adjustment does not create real browser acceptance.

## Frozen artifacts personally inspected

After the coordinator declared collection complete, I personally parsed source-checks.json through the strict JSON parser, recomputed its raw hash, checked S/T/tree/inventory bindings against Git, recomputed every stdout/stderr hash, and ran verifyTestRecords on the actual files. I inspected each execution record, exact arguments, exit/signal/error, ordered timestamps, package-lock hash, environment, result counts and browser JSON.

The local toolchain was Node v24.15.0 on darwin/arm64. The package-lock SHA-256 was 58fe996a95695b26e705e29eafb6d45de9f5444ebbd29e70e9af2895c3137767. The recorded provider profile is offline-fixture; browser channel is empty for bundled Chromium; run ID is pr275-frozen-T-7027d95fa0c8d6300a24d6da2dbb5c0d7aac4546; port is 3395. No credential or provider call was made by this reviewer.

| Check | Personally verified frozen result | Frozen stdout SHA-256 |
| --- | --- | --- |
| evidence | 49/49; zero skips, cancellations or todos | 3c49f90b81ab570711b6f0ecf28df737382f3de0943af58e43c80487cb9648e3 |
| models | 35/35; zero skips, cancellations or todos | 8067d5bd4bc2a3116b46ee8b6f0fdf9633b051cf6df40aedeb977d85c589713a |
| types | Exit 0; non-incremental; empty stdout/stderr | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| browser | Translate/Reflect/Dilate 3/3; one attempt each; zero retries/skips/flakes/unexpected results/errors | 99a60ad40c56d5686be15c735414c67fe3a175fd14dff6809044336d8b869ceb |

Every frozen stderr hash is e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (empty). The coordinator executed the browser session and type check. I personally inspected and validated their raw proof; I did not launch a competing browser/server or claim to have independently repeated that session.

## Definitive independent source observation

The short-path detached verification copy was /private/tmp/p275T-pcu37jzy at exact T, as recorded in the verification-copy receipt. My first read-only observeCurrent call overlapped the coordinator's browser build and was rejected with REVIEWED_CODE_SOURCE_BYTES at its post-observation materialization check. The coordinator identified the existing next-env.d.ts generation/restore wrapper as the concurrent writer. That rejected observation is not approval evidence. I did not restore or edit any file.

After the browser finished and the coordinator declared the copy stable, I performed a definitive independent observeCurrent from 2026-10-18T13:13:58.844Z to 2026-10-18T13:14:25.842Z. It passed full tracked-byte/mode/index-flag materialization before and after observation, runtime-policy and canonical-audit equality, clean status and unchanged HEAD. The returned runtimePolicyDigest was 9c2813f775c5da90fe140b7cd0d4e27a18f30aba9c8c4c337a31e1fb959ae36a and canonicalAuditDigest was e340d3f2cc3ae20e4e5a7ffaef12b642a2e3811138fd161714d8bb7a837abc91. Both match the frozen observation and completed source-checks record. Existing conflict classifications remain present; equality is not content or whole-pack acceptance.

## Gate and authority assessment

No remaining in-scope blocking defect was found. T must be a direct child of S; E must first-add exactly seven evidence files as a direct child of T; execution must preserve the exact E tree and the required PR/base or main-push ancestry. Literal Git binding, disabled replacement refs and GIT_GRAFT_FILE=/dev/null prevent local graph redirection. Dirty, hidden/sparse and byte/mode drifted materialization is rejected. Reviewer, report, checks and observation digests are bound. Stored reviewer identities/hashes bind content; they are not cryptographic authentication of a human reviewer.

All 44 previous non-selector workflow steps, triggers, permissions and job environment remain unchanged. PR275 marker selection occurs first, including dangling symlinks; failure cannot fall through to an older route. No continue-on-error or blanket gate skip is introduced. Final enforcement uses always() for the selected route. Finalization requires current proof and the private historical native artifact set, checks the fixed historical baseline/checker, and invokes its verify function. Missing current/native proof is rejected. Historical evaluation, fresh Shadow and distinct replay remain required; local T results do not substitute for them.

ordinaryCodeEligible is the only true permission. liveAllowed, integrationAllowed, previewAllowed, deployAllowed, wholePackAccepted and historicalAuthorityTransferred remain false. This review does not authorize merge, deployment, cleanup, live data/content use or acceptance of the separately tracked downstream Manim work.

## Disposition and remaining limits

Approved for ordinary-code required-check eligibility for this exact S/T and frozen observation/check hashes, subject to the unchanged checker validating the complete E composition and all mandatory current-head/native evidence. Future E, exact-E remote CI, historical native validation, fresh Shadow, distinct replay and final enforcement are not claimed completed. Those results must be obtained on the published E head.

I changed no project source or Git refs, staged or committed nothing, used no credentials, started no server and performed no cleanup. My only assigned persistent writes are this report and its paired A11 decision in the local review staging directory.
