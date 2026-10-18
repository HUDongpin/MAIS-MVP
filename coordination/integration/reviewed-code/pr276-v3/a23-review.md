# Independent A23 review of the exact PR276/PR277 composition

Reviewer: /root/a23_pr276_review.
Reviewed at: 2026-10-18T15:30:36.787Z.
Decision: approved-for-ordinary-code-required-check for the exact C/T3 and new evidence below. This approves assembling the seven-file E3 evidence child. It does not assert E3 exists, that combined-tree Linux CI has passed, that a merge is complete, or that production has been deployed. Both earlier admissions remain immutable and keep their original scopes.

## Frozen identities and composition

- Shared ancestor: 656ac319b2ad5812d31ad952cbb18430b5e58065.
- Homepage E2: b8cecebf0fe9d6e296d24af6007f850f92fba4bd; tree 14bd331c869cead154e1900e7d00e58fd3ea57d6.
- New main/event base M277: 39cb64c9d9719ec39c8b4c244bc8d6818ee6a87d; tree 580f3fa6e4aa6970406bb41e949e3d002ac8a1f0.
- Combined source C: b8bba0fc661affd4ee0a71acd341280a2ab38cc4; tree d40dfd26310497a7cd118887a11dded04f99fc6e; exact ordered parents E2 then M277.
- Tooling T3: ffc99bcfedd7d5a017d130eec58e3becc2978a26; tree 4ee988298c4f4e620c840807847ebf7ed6ba9de2; sole parent C.
- M277-to-C source inventory digest: 0a2677b019c733ed24e2b134a34c840b11f147c230763e3fc48ab98c68a02290.
- C-to-T3 tooling inventory digest: d38fba246ff277f36fdb6dd7e85792ed623d4e68961d3be1e8b3d5c4dbf2148d.
- Fresh combined observation SHA-256: 90408097b338eebafb1378c71ded0a402cd973e43b131eab408dde3c90c48e2f.
- New source-checks SHA-256: fa11f4e9c180829634386db372ed7cf946b1fef4300ec921bfd579b24db903a0.
- Frozen v3 checker SHA-256: 6707718efe8610182147b36849dd49f0dbad4ca34d870d04e9669c8254250327.

I independently inspected actual Git objects and frozen implementation bytes, recomputed both inventories, and verified the exact source/tooling parents, trees, paths and modes. C preserves the 23 non-workflow PR276 changes from E2 and the 30 non-workflow PR277 additions from M277. The only shared/reconciled path is the workflow; the source union contains exactly 54 changed paths against the shared ancestor. T3 changes exactly four tooling paths, and the seven future E3 paths were absent at T3. Both the primary checkout and current verification clone identify clean T3; the distinct frozen-main clone identifies clean M277.

The homepage component and PNG retain their E2 bytes, including the phone spacing repair. The PR201 228-row package, A18 evidence, original bank and all earlier review/checker/evidence files remain unchanged. The candidate is not enabled. I verified all 29 preserved path/tree bindings and compared workflow structure directly against both parents and C: all 51 M277 non-selector steps, all 58 E2 non-selector steps and their 65-step union remain unchanged, with nine additive v3 steps. Top-level/job controls and permissions are preserved.

## Findings resolved before freeze

No unresolved code or contract finding remains. I identified two preparation defects and verified their corrections in the actual T3 bytes and fresh test evidence.

The original v3 draft sent the candidate SQLite path and NODE_ENV=test to the browser command, which would conflict with Playwright's run-owned path validation. Frozen commandEnvironment now scopes those settings to pr277-* commands. Browser execution receives neither override and no external-artifact bypass. A real Playwright --list regression loads the actual configuration, and the fresh full browser run uses the same exported environment function successfully.

The inherited negative fixture originally inserted obsolete sourceParent and expected a semantic scope error, while the closed v3 schema correctly rejected the unknown key. Frozen T3 instead mutates homepageEvidence=BASE and tests the actual v3 semantic binding. The earlier 23/24 failure is retained with stdout SHA-256 e74e4b293c1a105a54d9d22eca24abed8cf4f45236b9b1c1f8b54ae30bab2f0e; it is not relabelled as a pass.

## Exact authority boundaries

The source checker pins both parent tips/trees and the complete C tree, enforces the exact non-workflow byte/mode union, and binds the fixed source inventory. T3 and E3 must be direct children with their closed path sets; E3 must first-add seven regular evidence files with genuine new A11/A23 records. The accepted final HEAD must descend E3 and equal its complete tree. PR276 events bind M277 as the exact base. Wrong parents, extra paths, changed old records, hidden/sparse/dirty source, forged review bindings, stale event bases or expanded permissions fail closed. A present invalid v3 marker cannot fall back.

The unchanged PR201 validateContent and pure assertObservation functions are used for the combined current tree. The full original PR201 contract suite runs in a separate pinned M277 checkout because its real-root scope test correctly rejects a combined tree. The new checker verifies that checkout's identity, cleanliness and complete materialization before and after execution and again during finalization. Its SHA/tree and output bytes are separately bound; this is old-contract evidence, not current combined-tree acceptance.

The exact original grading/isolation arguments run at current T3. TypeScript and the unchanged 31-case homepage browser specification also run at current T3. I verified the command working-directory and environment selection in the launcher and actual execution records. The new workflow executes its own unchanged pinned PR262 fetch before historical replay, and preserves the original historical baseline 03717842b19e8b8fa9a3a2dbecf1b359bb842233 and execution ff709c0141ef8660604a20340b1c476bf2941f60. Final verification remains mandatory.

## Fresh evidence independently consumed

I strict-parsed the final records, independently recomputed all 46 artifactHashes entries and six retained failure/reproduction artifact hashes, inspected the actual launch/observation/materialization helpers, and verified A11's exact review schema and bindings. I invoked the frozen v3 verifyTestRecords and verifyBrowserReport functions on the five real command records and raw output bytes; both passed. A11 report SHA-256: 3bacc8ebc6a953588aad280a05911e7469a82876992287f72de116c96151da3c. A11 decision SHA-256: 5b5c888def1fb907eff88c151b15f1ae4a44b1c22593b8fa84fdde9ae78a4ac0.

- At current T3, six old/new contract suites passed 119/119, with zero failures, skips, cancellations or todo results.
- At the separate M277 snapshot, the complete unchanged PR201 suite passed 22/22 without filtering or weakened assertions.
- At current T3, the two grading tests passed, covering all 228 rows and 1,281 historical answer cases plus q018 year/bare-time behavior. All three original candidate-isolation/q018/q014 tests passed.
- Current nonincremental TypeScript exited 0.
- The exact browser command performed one fresh isolated production build and passed all 31 cases on their first attempt, with zero skips, retries, flakes or unexpected results. Raw browser stdout SHA-256: f6fc0b3ad47dc3a0e0037661cb18470e22bcbbb00f9dee2876a0496cd2ba53f5. The current execution record confirms no browser NODE_ENV or SQLite-path override.
- Fresh current content validation confirms 228 revised and 1,272 untouched rows, original A18/hash bindings and q014=38000 outside the selected rows. Fresh observation matches the new 90408097... bytes, covering 3,888 files versus E2's 3,887. Only the permitted coverage fields change; runtime reachability and canonical audit remain unchanged. I independently checked the observation guard, native historical-manifest read/hash and registry/canonical-audit bindings.

I verified both complete before/after inventories and independently matched every path, mode and Git blob record against the corresponding frozen Git tree: 11,734 files at T3, inventory digest 35517d89a48aaaa0bdfd3858548dd69b169554753261613ca932a97f7ca99059; 11,709 files at M277, digest 1e5cc60ed5c94fc224b451df32855b93904313f5b9bd36bdf381cc702903c962. Both inventories are unchanged after execution. The inspected descriptor-relative helper enforces O_NOFOLLOW, regular files, modes, stable fstat, all-H index flags, clean status and unchanged HEAD. I consumed these physical-read receipts without duplicating the heavy builds or suites.

## Preserved history and remaining gates

Both native materialization attempts reached macOS ENAMETOOLONG. The current-root stderr hashes to 982aa1edd8371a204f9c3ccf77074de6da0bd961d83bf2b446d1c83a80a448ab; the pinned-M277 stderr hashes to 3d79c1026afd9177fd457b2d1bb961d86c2b548afe3b9bb86f1ef7b5a12f33d3. They remain failures/limitations, not native passes. Native historical-manifest reading and current observation succeeded. Local descriptor-relative proof does not replace successful native Linux materialization for both roots.

The original v1 Linux 28/31 spacing failure and earlier unexplained React418 remain preserved. I also revalidated the retained E2 CI current/decision hashes, digest and old command/browser proof using the original v2 validators. That evidence binds E2 only and is not reused as current C/T3 acceptance. The hydration issue is not claimed fixed; any recurrence remains a strict failure.

New E3 and the eventual merge must freshly pass native Linux CI for both materialized roots, current content/policy/grading/isolation/types/browser proofs, the pinned historical fetch and unchanged historical verification/Shadow, and the final combined decision. Earlier passes do not fill these requirements. Any change to C, T3, evidence or main base requires the applicable new binding and review. This report supplies no production schema, enabled-mail health, deployment or live-readback acceptance.

Permissions remain ordinaryCodeEligible=true; mergeAllowed=false; liveAllowed=false; integrationAllowed=false; previewAllowed=false; deployAllowed=false; wholePackAccepted=false; historicalAuthorityTransferred=false. The owner's separate release authority remains governed by the protected release workflow. I authored only this new A23 v3 report/decision; old reports, repository source, Git state, credentials and production were not changed. Final readback confirms the primary/current roots remain clean at T3 and the frozen-main root remains clean at M277.
