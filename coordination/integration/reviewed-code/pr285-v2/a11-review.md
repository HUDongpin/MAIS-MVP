# Independent A11 review of PR285 v2 frozen R and T

Reviewer: /root/a11_pr283_source_admission
Role: A11
Reviewed at: 2026-10-21T05:56:33.574Z
Result: approved-for-ordinary-code-required-check

This approval covers the actual frozen source sync R and tooling T below for the bounded PR285 v2 ordinary-code required check. No blocking finding remains in the reviewed R/T implementation. It is preparation approval only: no future evidence commit, final-head CI, current native observation, historical native-chain acceptance, merge, preview, deployment or live/content acceptance is approved by this report.

## Exact identities and inventories

- New base B: 00114a71813b589990e95a2ca44745c2650fa499.
- Previous PR285 E: 2354960b2d00685cdea7c253c6d4bd0c9f0e48d1.
- Source R: 6efe84b8ea6cf119a288b561e441c5c3a3560a8e; tree 29c8a78a58d1c950bba303607191acc0dd6157b5; ordered parents [previous PR285 E, B].
- Tooling T: f58ae2452c807337d78da7feb24fefd5b7666382; tree 45d862fe617af5e2d1b74e90bd4ae783777b0162; sole parent R.
- Source inventory digest: 3549f1339ad879dbdffad72aaac15eff238e74ab157a22b869edb885d24354f5.
- Tooling inventory digest: 4ad649313f2369e970403ecdf2b31ab54a0ff3f56686d187a1bc26a845ec3782.
- Source checks SHA-256: 4df321752ed6b9fb206486b0469663c86b84a37744db7bee0181c74709fc08bd.
- Expected observation SHA-256: 3859d94c9dfa795d7c53bc7420f254965f37bf8a474a802786d3da0ec37e47a0.
- Source-inventory file SHA-256: 308ac1eb4a21fe245d35f6087b7105a43a6d3898bd63a723f0d08ee6d5f3c89e.

I independently computed the B-to-R and R-to-T inventories directly from Git names, modes, object IDs and raw blob SHA-256 values. B-to-R contains exactly 13 paths and preserves the previous two-file repair and evidence. R-to-T contains exactly these four authorized paths, all mode 100644; materialized bytes match the committed blobs:

| Path | SHA-256 |
| --- | --- |
| .github/workflows/promotion-shadow.yml | f2ab185d736ebeb6ca6c52f5715ebdac1dcb970d40cd40f96102cd7cf930bfb7 |
| docs/pr285-v2-reviewed-code-gate.md | 05d092d5095cf1e36c2c838b532c9144f9b9dec8e2221440837fb490ac0163fb |
| scripts/promotion-reviewed-code-pr285-v2.mjs | d0f0b8135e4678acd551973ea14ca7a9ea080b4133d091e929941cfc813a613d |
| scripts/promotion-reviewed-code-pr285-v2.test.mjs | be6bc2df09ff37d724ad3d1ee9393e4c8cd2ccf845de261646cd27c6d2d036d5 |

## Independent verification performed

- Executed node --test scripts/promotion-reviewed-code-pr285-v2.test.mjs on actual T: exit 0; 40 passed; zero failed, cancelled, skipped or todo; duration 72635.729917 ms; Node v24.15.0.
- Own complete raw log: .local/pr285-v2/a11-tooling-tests.log; SHA-256 d7fe2f77632377e2ad6249fe48699badf11ec05810d6447808394cfc26603cee.
- Both new scripts passed node --check; the committed R-to-T diff passed git diff --check.
- Independently loaded all nine supplied current command records and their 18 stdout/stderr files from .local/pr285-v2/current-nine. The frozen production verifyTestRecords accepted their exact command order, arguments, exit codes, raw hashes and strict TAP structures. Coverage is repair 25, seed 5, funnel 9 leaves in 2 suites, activity 59, PR287 admission 22, build lifecycle 33, adjacent build/cleanup 38, scoped governance 1, plus the successful type check: 192 test leaves plus types.
- I independently read and hash-verified the supplied 215/215 source-composition log (bb38e7762e9f408255403997e48c4e0fc74bd66d3e2943eee6138c8919ecb97d) and 255/255 tooling-contract log (a2d5b27e0483dae70af814a23596910dd2837cc8c410a31c29327f6b887956fc). Both record zero failures, cancellations, skips and todo. These are consumed coordinator execution records, not my own 215/255-test reruns. The nine native command executions are also consumed records; my independent execution was the 40-test v2 suite.
- Independently compared the current workflow with previous PR285 E, new main B and R: every prior non-selector step object and relative order is preserved, all relevant trigger/job/permission settings match, no step names or IDs are duplicated, and no continue-on-error is introduced.
- Rechecked the original question-pack bytes at T: SHA-256 4f677216d3d9aec1b8f93be87a2900ff5a63f62e45a7555458ac146955ac0766, 1500 questions, q014 answer 38000. The loader files and PR287 checker/test/binding match B, and all nonworkflow previous-PR285 source/evidence blobs match old E. Exact path partitions preserve remaining inherited source and evidence.

## Review judgment and resolved gaps

The checker binds actual R ancestry, ordered parents, complete tree and inventory; exact T/E path partitions and modes; unique first addition of new evidence; PR285 with the fixed new base and exact evidence head; future merge parent order and evidence tree; independent reviewer/source/tooling/report bytes; and all-false permissions. Grafts, replacement refs, dirty files, aliases, hidden index flags and extra source/evidence changes fail closed. Sparse metadata fixtures explicitly remain ineligible for full runtime acceptance.

The first five current command records reuse the unchanged v1 validator. Four PR287 groups receive strict additional TAP checks, including exact native title digests/counts, zero skips/failures/todos, complete plans/results and closed passing diagnostics. The existing one-test governance name-pattern is preserved and is not represented as a full governance-suite run.

The earlier coverage gaps are resolved. A complete nine-group positive is followed by omitted, reordered, renamed, wrong-command, bad-hash, nonzero-exit, duplicated and self-rehashed forged-output negatives. verifyCurrentProof is used by production finalization and rejects stale source/tooling/evidence/event bindings using otherwise valid records.

bindHistoricalDecision is used by verifyHistoricalProofs only after a successful own-root frozen CLI verification and reading its saved decision. It accepts only the closed old/main roles and exact schema, event, source, tooling, evidence/final IDs, historical anchor, review hashes where applicable, permissions and decision digest. Tests cover valid bindings, branch swaps, wrong/rehashed identities, elevated permissions, malformed or duplicate JSON, bad digests and stdout-versus-artifact differences. Final-decision equality rejects omitted, duplicated or swapped branch descriptors. These synthetic binding fixtures are explicitly not native acceptance evidence.

The production historical helper requires clean, fully materialized old PR285, new-main PR287, PR283 E2 and native-baseline roots at fixed commits. It runs the unchanged v1 CLI with the old PR event and the unchanged PR287 CLI with its original main push event. Their historical consumers retain the original native baseline/execution chain. Both proof branches are required; the pure binder never substitutes for execution. The v2 selector precedes both old modes and fails closed; unconditional final enforcement remains enabled.

## Remaining acceptance conditions and limits

- New E does not exist at review time. Its exact eight-file evidence composition, sole parent T, first-addition history, and byte-identical copies of both independent decisions/reports must still be verified.
- The full current plus both historical native chain has not been executed by this reviewer. Full local historical-native acceptance is not established; the coordinator reports local macOS limitations. Final-head CI must execute the actual fully materialized chain without substitutes, skips or relaxed gates.
- The expected observation is the immutable historical baseline observation. Fresh current policy/reachability observation must be recomputed for actual final E. Synthetic fixtures and report parsing do not establish that observation.
- Final-E ordinary CI, historical/current checks, finalization, enforcement and official artifact readback remain pending. Earlier CI for old E, PR287 or R cannot stand in for E. No remote CI query was performed by this reviewer in this review.
- Build lifecycle tests use controlled fixtures and do not establish a real production application build or deployment.
- Every contract permission remains false: ordinaryCodeEligible, liveAllowed, integrationAllowed, previewAllowed, deployAllowed, wholePackAccepted and historicalAuthorityTransferred. No merge, preview, deployment, production mutation, live-content promotion, 228-candidate acceptance, whole-pack acceptance or cleanup is authorized here.
- I made no tracked source changes and no project Git ref/index mutations. Persistent writes are confined to this report, its decision and my own raw test log. The worktree remained clean at T after independent tests and validation.
