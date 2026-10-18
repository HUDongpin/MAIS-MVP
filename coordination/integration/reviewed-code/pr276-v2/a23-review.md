# Independent A23 review of PR276 v2 frozen source and tooling

Reviewer: /root/a23_pr276_review.
Reviewed at: 2026-10-18T14:15:31.479Z.
Decision: approved-for-ordinary-code-required-check for the exact S2/T2 and new A11 evidence below. This approves assembling the closed E2 evidence child. It is not Linux acceptance, a passing final required check, merge completion or production deployment. The v1 Linux failure remains a failure, and the owner's separate release authorization must pass its protected workflow.

## Exact reviewed chain

- PR/main event base B: 656ac319b2ad5812d31ad952cbb18430b5e58065.
- Original source S1: a05d123e75139eeb36e0ca3b564652880fa38545.
- Published v1 E1 / repair parent: 5303de58d090b62967e45ec09d11fe331263f628; tree c908bfec08edf28d5e23c947c6892c28f4f8d072.
- Repair S2: 9938db3f952d6715bca9fbe732da82a184f845df; sole parent E1; tree 677eb4bd7bd50febd15c75638d8465dbe1f3fe02.
- Tooling T2: 2920e9fcab4c01b42d7dbc525ed5f0e5d1356b77; sole parent S2; tree 04f72c6dbfe6b4ee45d98cc9894167403a37f327.
- E1-to-S2 repair inventory digest: 06f8cce914143b162d190a2d86837d2ce0bb7d894801dd85b8cf9a6871486c1d.
- S2-to-T2 tooling inventory digest: 5eef354b755027a34e248e919449e162e3df6cdda090e3619bd43ba35dd6a59d.
- Fresh T2 observation SHA-256: bb0d964567026e41f29dfd8d747ae2c3f971900a2f32ac5a1ba0694f8c4d3766.
- New source-checks SHA-256: 646c609810fdaa0870f83c5dbed364b00dc443457895c408964552b2b8acdefe.
- Frozen v2 checker SHA-256: 70032503f3b238e4a0023ce7e5fc17aad1fdd7a9cd2c0f4d6d0fd585cfa7365d.

I independently examined the actual frozen Git objects, source diff, checker, tests, browser specification, workflow and documentation. Both the primary checkout and the external verification clone identify the same clean T2. I recomputed both inventories and verified the source/tooling paths, parents, trees, bytes and modes in both checkouts. The seven E2 evidence files were absent at T2. This is a new review of real S2/T2 and current execution evidence; no v1 preparation or approval has been relabelled.

## Source repair and preserved first attempt

S2 changes only components/home/PedaNovaHomeHero.tsx, adding a photo bottom: 13rem override inside the existing max-width: 639px media rule. Its SHA-256 is 6a8c14fd875ba98e2756ff291be1a70b1d0406bbbc6474254d39437e955f842a. The original 12rem default remains for 640px-and-wider layouts. The source diff does not change wording, font classes, headline/CTA placement or the selected PNG. That PNG remains SHA-256 d6948dc05110a84a859207727f1ae8642a9612321fb0021a34ae5a49f8bc9889, and the browser specification remains SHA-256 45c97c22994e722ce702d3514d5e08e9b10d2ab5ae6966b739b3444201b96edc with all 31 cases and original 7px thresholds intact.

I read and rehashed the provided real Linux v1 browser artifact for run 39130914904. It records 28 passing cases and failures for English 320x568, English 390x844 and dark 390x844 at the photo/headline gap assertion. Its SHA-256 is 03a0850fcb44749a39887ae1e54c620ef4b84a0f12b059664bd50d0ebc5cdb4e. The failed tests stop at that assertion before their later captured-error assertion; the artifact therefore establishes the reported gap failures, not absence of every other possible page error. The new one-rem photo reduction targets the measured problem, while fresh Linux CI must confirm the repair. Mac results do not supersede this failure.

All 18 preserved path/tree bindings match E1, including the original PNG, unchanged 31-case spec, v1 checker/test/document/evidence and older contracts. All original v1 review and check bytes remain unchanged. My v1 report still hashes to 63e19b757aa024ab6c023221b7ecb48072a34de226395f20f4fc7b4e6674b474; it records the earlier conditional review and does not become Linux success through this v2 report.

## Contract judgment

No unresolved contract finding remains. The new admission requires sourceParent=E1 separately from event base B, pins E1's tree and S1 ancestry/image, requires S2's sole parent E1 and exactly the one-path repair inventory, and requires T2's sole parent S2 with exactly four tooling paths. E2 must directly follow T2 and first-add exactly seven regular evidence files with new A11/A23 decisions. The accepted final HEAD must descend E2 and equal its whole tree. Wrong source parent, PR/base, extra files, altered old evidence, changed bytes/modes, hidden/sparse/dirty materialization, forged review bindings or expanded permissions are rejected. Production constants have no CLI/environment override; fixture substitutions are confined to temporary synthetic repositories.

I independently compared workflow structure and executable step bodies. All 51 pre-existing non-selector steps, top-level controls and job settings remain unchanged; seven v2 steps are additive. The v2 existence/symlink marker is checked first and failure does not fall through. The job name remains promotion-shadow-gate. All five contract suites, current types/browser commands, runtime observation, historical evaluation, finalization and always-enforced final verification remain present. The native historical baseline and execution identities remain 03717842b19e8b8fa9a3a2dbecf1b359bb842233 and ff709c0141ef8660604a20340b1c476bf2941f60. No assertion, threshold, retry rule, earlier contract or historical authority was weakened.

## Fresh A11 evidence independently consumed

I inspected the A11 execution and observation scripts, strict-parsed the final records, recomputed all 29 artifactHashes entries and five retained failure/reproduction artifact hashes, and verified the new A11 report/decision schema and exact S2/T2/check/report bindings. I invoked the frozen production verifyTestRecords and verifyBrowserReport on the actual command records and output bytes; both passed. The A11 report SHA-256 is 24f1f5204213d68e6e9f5bb861d27450136697b3ed26354b16530db420f5a99f; its decision SHA-256 is 2ed08ce55faafde5ffbb0cc9bbfb7c5cb37b7b828beb25d80a20615279c47293.

- Five contract suites: 94 passed, zero failed, skipped, cancelled or todo. These are checker-behavior fixtures, not production acceptance.
- Exact nonincremental TypeScript command: exit 0 with empty stdout/stderr.
- Original browser command: one fresh isolated production build in the clean external clone, then 31 first-attempt passes with zero skips, retries, flakes or unexpected results. Raw stdout SHA-256: ad38d41567c7d0b7fef3c2c183e0188c18bf923ca583b9434715f6650d67efa7. All strict page/console/HTTP/asset assertions passed in this local run. I decoded the actual layout attachments and confirmed phone photo bottoms of 549px and 581px and local gaps of 41.390625px and 33.796875px. These verify the intended effect on macOS, not Linux font parity.
- Fresh unchanged observePreparation ran at T2 and matches the frozen observation and canonical audit. I independently read and strict-parsed the native historical manifest in the external clone, verified its expected hash and registry binding, and checked the resulting observation. Equality with the earlier observation is a fresh result, not transferred authority.
- The A11 before/after descriptor-relative inventories are identical. I independently matched all 11,694 path/mode/Git-blob records against T2's complete Git tree and recomputed their digest 88039f25502acd1e71064daf3ee698dc3aeed1bd559921b0c2f828806abd75f9. The inspected helper enforces O_NOFOLLOW traversal, regular files, modes, stable fstat, all-H index flags, clean status and stable HEAD. Its script SHA-256 is 141ded07c8fe6eea496db6c085764e236fb237d7e482115ac9b20337ff6fd542. I consumed and verified these physical byte-read receipts rather than duplicating the heavy suites or their build.

## Remaining acceptance boundaries

The full native materialization helper still reports macOS ENAMETOOLONG; its retained stderr SHA-256 is 11e1b9385b612f18b70709ef3f25c40c222616040b71bbd95fcb2db65162706a. It is not a pass. Native reading of this particular historical manifest and observation succeeded in the shorter external clone, so the prepared fd-manifest fallback was not executed. The local descriptor-relative full-tree evidence does not replace native Linux CI.

The earlier preparation React418 remains recorded and unexplained. I reverified the original report, trace, error context and bounded non-reproduction report hashes. The phone-gap repair does not establish a hydration fix; a recurrence must remain a failing assertion. No suppression or retry-based acceptance is authorized.

Final E2 and any merge must still pass the genuine event-bound Linux required check, including repaired phone layout, full native materialization, fresh current-head browser/types and observation, unchanged historical non-live verification/Shadow and final proof verification. No GitHub or deployment pass is inferred from this local review. Any new source, tooling, evidence or base change requires the contract's applicable new binding and review. In-repository identities/hashes bind evidence content; they are not cryptographic authentication of an external approval.

Permissions remain ordinaryCodeEligible=true; liveAllowed=false; integrationAllowed=false; previewAllowed=false; deployAllowed=false; wholePackAccepted=false; historicalAuthorityTransferred=false. I authored only the new A23 v2 report/decision under the assigned temporary directory. I did not change source, old reports, Git state, credentials or production, and both reviewed checkouts remain clean at T2.
