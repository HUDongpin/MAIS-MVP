# A23 independent frozen S/T review for PR275

## Decision and identity

Result: approved-for-ordinary-code-required-check. No remaining in-scope blocking finding was identified in this independent review of the exact source/tooling composition and the frozen local check package.

Reviewer identity: /root/pr275_gate_review.
Reviewed at: 2026-10-18T13:17:02.803Z.
This is a new review of the real committed S and T. Earlier uncommitted preparation reviews are historical and are not used as this decision.

## Exact reviewed bindings

- Base B: 656ac319b2ad5812d31ad952cbb18430b5e58065.
- Source S: f58fd25d913de68e75796b66e15247c199cdb99c; its sole parent is B.
- Source tree: fd382a7974f248e459c57654aa881ed6a40e34b7.
- Source inventory digest: 8650aefefcffef3babf6933dae2ea15f8157e758c22a38db83cc30980c6f6c7e.
- Tooling T: 7027d95fa0c8d6300a24d6da2dbb5c0d7aac4546; its sole parent is S.
- Tooling tree: 44c9afb54b9f2420d3724c05b9a8def9830e460a.
- Tooling inventory digest: 3d06806b699bdfb9fb9f7154ad008c75758b867e758294671c9764e6c50abefa.
- Observation raw SHA-256: 728f20e13198c00375e816d4b34363bf418790a12668fdd80b7c1467727d4758.
- Source-checks raw SHA-256: 84f6a79fd8c26dce226dd950307d6d2b44bca57853347f894a522539f661d79b.

The four source paths are the browser evidence module, its tests, the one synthetic Manim handoff-fixture compatibility change, and the retained historical A11 session log. The exact source path, mode, object and raw-byte inventories were independently recalculated and matched the frozen source-checks record. T changes only the new PR275 checker, its tests, its documentation and the additive Promotion workflow. All four tooling entries have mode 100644.

Independently recalculated tooling file SHA-256 values:

- scripts/promotion-reviewed-code-pr275.mjs: 111732cb9424079e132f1989664f745dc59c95e7e35564ca71b7600477539dad.
- scripts/promotion-reviewed-code-pr275.test.mjs: 025ffca3fe1d8707b2991ca45b124dcb3f9e0dd0ce76d26925c0aed80ffe9035.
- docs/pr275-reviewed-code-gate.md: 732393d7b7d53a39dbebd352c673f88a748edca9d0274f7b107a25a552d84b76.
- .github/workflows/promotion-shadow.yml: 119dd36ab9809f6382c5f65077e7d551fe6ed49ae805a9a5937968072ac37576.

## Independent contract inspection and execution

The review confirmed exact S/T parents, fixed source inventory, exact four-path T delta, and future E requirements: E must be the direct child of T, first-add only the seven declared evidence files, and remain the complete execution tree. PR events bind PR275 and exact B; main-push admission retains the required ancestry and evidence tree. Dirty/sparse/hidden source, altered bytes or modes, duplicate/re-added markers, unsupported event composition, modified prior contracts, mismatched review/report/check bindings and permission expansion remain rejected. Git replacement objects and graft-file ancestry overrides are disabled in the new checker.

The PR274 checker, tests, documentation and evidence remain byte-identical, as do the earlier preserved contracts. I independently checked 94 protected/source files. All 44 pre-existing non-selector workflow steps are identical and retain their original order. The shared job triggers, permissions and environment are unchanged. A present or dangling-symlink PR275 marker selects the new checker first; a rejection cannot fall through. The required final verify step uses always(), and no continue-on-error or generic exemption is introduced.

The historical baseline remains 03717842b19e8b8fa9a3a2dbecf1b359bb842233 with frozen execution ff709c0141ef8660604a20340b1c476bf2941f60. The new workflow still requires historical evaluation, and decision finalization independently verifies the exact historical artifact set, baseline root/event/checker and native proof. Current source tests alone cannot produce the final ordinary-code decision.

I independently executed the full new contract suite at T: 27/27 passed, zero failures, cancellations, skips or todos. These include isolated synthetic S/T/E topology, wrong-parent/tree/evidence, graft/replace-ref, metadata/materialization, old-contract preservation, selector and missing-native-proof counterexamples. Synthetic fixture commits were confined to temporary repositories and do not constitute real admission.

I independently executed the exact evidence and model/source commands under the checker-style minimal environment: 49/49 and 35/35 passed, with their actual TAP output accepted by the frozen validators. Thirty additional malformed proof mutations were rejected, including bailout and mixed-case directives, wrong/duplicate names, duplicate/malformed/indented result or plan records, duplicate headers and empty proof. Ten additional invalid event-binding compositions were rejected; two valid synthetic event controls passed. No browser/server was started by this reviewer.

## Personal inspection of the frozen T check package

After collection completion was explicitly reported, I personally read the complete frozen source-checks JSON, checked its raw hash, compared its source/tooling inventories with the Git objects, and verified every recorded command against the actual stdout/stderr bytes and execution JSON. The records bind the exact T commit and dependency lock hash. The package reports offline provider configuration, no credentials and no provider calls; I did not access credentials or call providers.

- Evidence TAP: 49/49, no skips/failures/cancellations/todos; stdout SHA-256 3c49f90b81ab570711b6f0ecf28df737382f3de0943af58e43c80487cb9648e3.
- Model/source TAP: 35/35, no skips/failures/cancellations/todos; stdout SHA-256 8067d5bd4bc2a3116b46ee8b6f0fdf9633b051cf6df40aedeb977d85c589713a.
- Non-incremental TypeScript: exit 0, null signal/error, empty stdout/stderr.
- Browser: exact Translate, Reflect and Dilate cases, desktop-chrome, one worker and zero retries; 3/3 passed with no skipped, flaky or unexpected results, no singular result errors and empty report/result error arrays. The actual report root is the recorded short verification checkout. stdout SHA-256 99a60ad40c56d5686be15c735414c67fe3a175fd14dff6809044336d8b869ceb.

All four execution records have exit code 0, null signal/error and empty stderr. The browser ran from 2026-10-18T13:09:56.267Z to 2026-10-18T13:12:20.396Z with the recorded empty browser-channel setting for bundled Chromium. I inspected the raw browser report and did not substitute the earlier installed-Chrome preparation run.

After the browser finished and source-changing commands stopped, I independently ran observeCurrent against exact T in /private/tmp/p275T-pcu37jzy from 2026-10-18T13:13:18.650Z to 2026-10-18T13:13:41.991Z. The checker validated full tracked materialization before and after observation, clean status and unchanged HEAD. Runtime policy digest 9c2813f775c5da90fe140b7cd0d4e27a18f30aba9c8c4c337a31e1fb959ae36a and canonical audit digest e340d3f2cc3ae20e4e5a7ffaef12b642a2e3811138fd161714d8bb7a837abc91 match the frozen T record. This definitive post-browser observation supersedes the interim concurrent readback. Main worktree HEAD and clean status were rechecked at T before finalizing this report.

## Scope and remaining gates

This decision approves only ordinary-code required-check eligibility for this exact S/T composition and frozen observation/check package. It is not a claim that the future E head has passed remote CI or historical native Promotion. E and its exact-head CI/Promotion must still be assembled and executed; current checks, historical native evaluation, fresh Shadow/replay and final verification remain mandatory. If S, T, source-checks or observation bytes change, this decision does not transfer.

liveAllowed=false. integrationAllowed=false. previewAllowed=false. deployAllowed=false. wholePackAccepted=false. historicalAuthorityTransferred=false. No merge, deployment, live content promotion, cleanup or approval of unrelated baseline issues is granted. The previously recorded downstream Manim failures and historical path-length observations are not relabelled as passing by this review.

The reviewer did not edit source/tooling or perform real-repository stage/commit/push/ref operations. Only this report and its paired JSON decision are written for the coordinator to copy unchanged into the declared E paths. In-repository reviewer identities and hashes bind this agent-produced report; they are not cryptographic evidence of an external human approval.
