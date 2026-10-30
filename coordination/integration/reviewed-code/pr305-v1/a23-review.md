# A23 independent review of the exact PR305 tooling commit

Reviewer: /root/pr305_gate_a23. Role: A23. Reviewed at: 2026-10-30T07:01:41.339Z.

Result: approved-for-exact-pr305-required-check. No P1 or P2 finding remains in the reviewed implementation. This decision is limited to the PR305 ordinary audit-tooling admission and the immutable commit identified below.

## Immutable bindings

- Baseline B: 4501af09d87e44ab849283892bf6d1323ce0c4c6.
- Source S: d6a5455ec2e5d2f01c5f893c2129eaa0f4886651. Source tree: 06530773f3a2faeed7245896847627ef7c611d39.
- B-to-S inventory digest: 1732c817dbc0224ed224749cd31fb1c6398e5800056e2d3b64a2e81a5730eab9.
- Tooling T: 555bc31960da2066dc4a9641626dd6a97cafbdf9. Tooling tree: 1ef4c0c61c55589ca725c9694a5f9ca6fe42c715.
- S-to-T inventory digest: 9269fcc3c288fabe0f1c39564565ab8bcd3d6770e592094037f1ded9013d247d.
- Frozen source-check bytes SHA-256: 27afe6bf7288378b0cd37a34127465da4544e53d419d5440a78eea1bba5e4143.

I obtained these identities from Git and recomputed the inventories. The supplied formal-review-input.json was a convenience reference, not the authority for this decision. T has S as its sole parent; S has B as its sole parent. The assigned checkout was clean at T. The committed source and tooling files matched their materialized bytes, with regular non-aliased files. Evidence E did not exist at review time and is not pre-approved by this record.

## Independently performed review and verification

I read the checker, contract tests, full workflow delta and final gate document. I independently recomputed the exact five-path B-to-S source inventory and four-path S-to-T tooling inventory, verified source bytes were unchanged by T, checked that all seven designated E files were absent at T, and ran the scoped Git whitespace check successfully. The four tooling files have mode 100644 and these SHA-256 values:

| File | SHA-256 |
| --- | --- |
| .github/workflows/promotion-shadow.yml | 827ab73fab74edbee61d3257db901d6cf7d6abdb00029d330266273b902e1757 |
| docs/pr305-reviewed-code-gate.md | 4f0ae4b6250b9b70f1420118d726f6f88b777ee9493b3cece6079788d37c0333 |
| scripts/promotion-reviewed-code-pr305.mjs | cbc020b5499d2b5084ac4710575dd33df180d1b1a16b41e66d30092123943c39 |
| scripts/promotion-reviewed-code-pr305.test.mjs | 0f76d56dae17376bbfd2717a5e0a6b085286ae57d9ec9bbd84fa1428b3e19632 |

The complete committed workflow equals the deterministic three-insertion transformation of the frozen S workflow. PR305 selection precedes the inherited PR304 marker; presence includes a symlink marker. Invalid PR305 authority returns a failure from the assignment under set -e and has no fallback path to PR304. The old selector, old allowed modes, old steps, action pins and job permissions are retained under reconstruction. Both new Node entry points remove NODE_OPTIONS and NODE_PATH.

I checked the exact T/E partition and chronology enforcement, strict duplicate-safe authority JSON, fixed independent reviewer identities, report/decision raw-byte bindings, source/tooling drift rejection, and same-repository event constraints. The PR branch must equal the single E commit on the exact B base. Main is admitted only as an ordered [B,E] merge with the exact E tree. Same-tree descendants and permission widening are rejected. The final document now accurately distinguishes exact source-test names/counts from the fixed gate-contract count whose complete test bytes are bound by T.

Git shows no B-to-T changes to the PR304 activation checker, the entire ca-textbook-successor subtree, or the August historical inventory report. I separately verified the three report byte hashes and retained failure counts: August 0, baseline 8, current 10. The fresh source inventory has the same nine discovered row collections and summary as the pinned current report, with exactly the same ten historical failure strings. Zero current failures does not rewrite the historical globalInventoryPassed=false or any frozen receipt.

## Consumed execution evidence and attribution

The parent session executed the four clean-S commands and produced source-checks.json at 2026-10-30T06:35:57.959Z, before T committed at 2026-10-30T06:56:18.000Z. I consumed the retained raw outputs, independently verified every stdout/stderr SHA-256, ran the checker parsers over those outputs, and verified the fixed source-check hash and chronology. These are consumed executions, not new executions by A23:

- Strict TypeScript: exit 0 and empty stdout/stderr.
- Diagram source/coverage regressions: 44 passed; exact test-name digest matched; no failures, cancellations, skips or TODOs.
- Inventory CLI: zero current failures; ten unchanged historical failures; full report digest 45748db4d56b2b03c45dadadd3592332d4a54c59c533e6bbb57ad33424cad607; discovered-row digest 737169bdab539145ee20787a9fdb35454dbd503636985eae70b5d58ae70a46bf.
- Unchanged PR304 activation-contract tests: 17 passed with the fixed name digest and no failures, cancellations, skips or TODOs. These are synthetic/pure regression tests, not native Shadow execution.

I also parsed the retained pre-T contract log: 42 passed, zero failures/cancellations/skips/TODOs. This log is parent-executed evidence for the reviewed checker/test implementation; I did not rerun a broad suite. A11 owns its separately requested fresh actual-T contract run, and no outcome from that independent run is asserted here. The broad general Promotion log is consumed as 106 passed and one unpassed local legacy v2 Manifest test, not a fully passing suite.

## Explicit limitations and permissions

I independently reproduced the local path limitation without running native operations: the unchanged legacy Manifest absolute path is 1028 bytes and its Receipt path is 1034 bytes in this checkout. Local lstat reports ENAMETOOLONG, errno -63; both T Git blobs exist. This corroborates the recorded AUTHORITATIVE_PATH_UNSAFE failure. It does not waive the legacy assertion or the new checker full-tree materialization checks. The actual final E admission and before/after materialization on Ubuntu, final-head CI and any later main event remain to be established separately.

A23 did not execute a native Shadow check, full application build, provider call, live probe, deployment or Git mutation. This review does not approve a future E, final remote result, main merge, new content acceptance, production activation, or historical authority transfer. The parent may transport these independently authored report and decision bytes unchanged into the constrained evidence phase. All six permissions remain false: historicalPromotionRevalidated, liveAllowed, previewAllowed, deployAllowed, wholePackAccepted and historicalAuthorityTransferred.
