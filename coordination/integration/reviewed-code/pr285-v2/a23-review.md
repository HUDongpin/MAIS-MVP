A23 independent review of PR285 v2

Result: approved-for-ordinary-code-required-check.
Reviewer identity: /root/pr285_v2_a23_review.
Reviewed at: 2026-10-21T05:55:43.448Z.

This review approves the exact source sync and frozen tooling below for preparing the independent ordinary-code required-check evidence child. It does not accept a future evidence commit, claim a completed native CI run, transfer historical authority, or authorize merge, integration, Preview, deployment, live content, whole-pack acceptance, or cleanup.

The reviewed identities are:

- Main base B: 00114a71813b589990e95a2ca44745c2650fa499.
- Preserved previous PR285 head: 2354960b2d00685cdea7c253c6d4bd0c9f0e48d1.
- Source sync R: 6efe84b8ea6cf119a288b561e441c5c3a3560a8e.
- Source tree: 29c8a78a58d1c950bba303607191acc0dd6157b5.
- Source inventory SHA-256: 3549f1339ad879dbdffad72aaac15eff238e74ab157a22b869edb885d24354f5.
- Tooling T: f58ae2452c807337d78da7feb24fefd5b7666382.
- Tooling tree: 45d862fe617af5e2d1b74e90bd4ae783777b0162.
- Tooling inventory SHA-256: 4ad649313f2369e970403ecdf2b31ab54a0ff3f56686d187a1bc26a845ec3782.
- Source-check record SHA-256: 4df321752ed6b9fb206486b0469663c86b84a37744db7bee0181c74709fc08bd.
- Observation SHA-256: 3859d94c9dfa795d7c53bc7420f254965f37bf8a474a802786d3da0ec37e47a0.

I independently read the actual T commit, its parent and tree, its four-path diff, the checker, tests, workflow and documentation. I independently recomputed the source and tooling inventories from Git blobs, modes and hashes, verified their digests and the supplied source-inventory record, and checked clean Git status. T is the direct single-parent child of R. R retains the ordered parents [previous PR285 head, B], with an exact 13-path difference from B. All non-workflow PR285 paths preserve the previous head's blob and mode; all other PR287 changed paths preserve B's blob and mode. The frozen PR285 v1 checker/evidence and PR287 checker/evidence are unchanged. The future pr285-v2 evidence directory is absent from T.

The four tooling paths are .github/workflows/promotion-shadow.yml, docs/pr285-v2-reviewed-code-gate.md, scripts/promotion-reviewed-code-pr285-v2.mjs and scripts/promotion-reviewed-code-pr285-v2.test.mjs. I compared the parsed workflow against previous PR285, B and R: all prior non-selector step sequences and job authority fields are preserved, and step names are unique. The new marker has priority and fails closed. The new current check, both historical chains, finalize and always-run enforcement are reachable under the new mode. No continue-on-error or fallback-to-an-older-mode was added.

The checker binds exact R parents/tree/inventory, the four T paths and tooling digest, and a unique first-added direct evidence child with exactly eight regular non-executable evidence files. Independent A11/A23 review bytes bind actual R and T. The PR event requires PR285, fixed base B and exact evidence head; a future main event requires ordered parents [B, evidence] and the same evidence tree. Actual ancestry, complete tree equality, clean status, index flags, materialization, literal Git targeting, replacement/graft rejection and current observation checks remain enforced. Current commands and final decision each retain the necessary complete-materialization and head-movement guards.

The current command contract preserves the five v1 groups and all four PR287 groups. I re-read and hash-verified the supplied original stdout/stderr files and passed all nine records through the frozen tooling's strict record/TAP verifier without re-running the tests. The reports contain 25 repair, 5 seed, 9 funnel, 59 activity, 22 PR287 admission, 33 PR287 build, 38 adjacent and 1 explicitly scoped governance test: 192 test leaves, with zero failed, skipped or todo results, plus a zero-exit type-check record. The original governance name filter remains its explicitly bounded one-test scope. Raw-output hashes and exact command arguments match the source-check record.

I also recomputed the retained runner-log hashes. The source composition log has 215 passing result lines and a matching 215/215 zero-failure, zero-skip summary; SHA-256 bb38e7762e9f408255403997e48c4e0fc74bd66d3e2943eee6138c8919ecb97d. The tooling log has 255 passing result lines and a matching 255/255 zero-failure, zero-skip summary; SHA-256 a2d5b27e0483dae70af814a23596910dd2837cc8c410a31c29327f6b887956fc. These are reviewed execution artifacts from the producing session, not tests newly executed by A23.

The dual historical path invokes the unchanged v1 verifier at 2354960b2d00685cdea7c253c6d4bd0c9f0e48d1 with its original PR285 event and the unchanged PR287 verifier at B with its original main-push event. PR287 retains its original PR283 E2 verifier and all consumers retain the fresh shared H037/execution native chain. Exact roots, checker bytes, event records, native exit status, stdout/artifact equality, schemas, scopes, source/tooling/evidence/final identities, historical anchors, all-false permissions and self-digests are checked. The closed-role bindHistoricalDecision helper is called only after the real frozen CLI succeeds. Both independently verified historical decisions are consumed by the final v2 decision; neither historical result substitutes for the current tree's proof.

I reviewed the added negative coverage for omitted/reordered/current records, changed exact arguments and hashes, self-rehashed forged TAP output, stale source/tooling/evidence/events, swapped historical roles, wrong native identities and anchors, elevated permissions, invalid or duplicate JSON, stdout/artifact mismatch, digest tampering, and missing/duplicated/swapped final historical branches. Synthetic fixtures are explicitly binding-only and do not replace native execution. I found no blocking defect or constraint loss in the reviewed T.

The original 1500-question bank remains SHA-256 4f677216d3d9aec1b8f93be87a2900ff5a63f62e45a7555458ac146955ac0766 and q014 remains 38000. G6-G12 question/topic loaders, the 228 non-live candidate and prior evidence remain unchanged through the exact tree/path boundaries and preserved observation contract.

Every permission remains false: ordinaryCodeEligible, liveAllowed, integrationAllowed, previewAllowed, deployAllowed, wholePackAccepted and historicalAuthorityTransferred. Full final-head current/native acceptance and CI remain required after the exact evidence child exists. This review does not claim local full-materialization acceptance or a successful Linux historical replay; the documented Mac materialization limitation remains unrelaxed. No source file, test, Git ref or remote comment was changed by this review. Only these two assigned local review records were written.
