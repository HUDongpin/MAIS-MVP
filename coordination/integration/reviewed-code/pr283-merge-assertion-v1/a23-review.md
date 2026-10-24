# Independent A23 review of the exact PR285 admission tooling

Reviewer: `/root/pr283_successor_scope_review`
Reviewed at: `2026-10-20T02:15:53.307Z`
Result: `approved-for-ordinary-code-required-check`

I independently reviewed source S `4ef2e1cada5bd872f9ce74f274cc22d8f7b5c0a1` and tooling T `79e10d7293e52bc4fbf26f02d378696d71694ca3` for the PR283 merge-assertion repair carried by PR285. I did not author the source or tooling. I approve this exact source/tooling pair for the required-check admission process described below. This review is not a completed admission decision: final evidence commit E, its current-head CI, and its native historical execution proof do not yet exist as accepted evidence in this review.

## Recomputed commit and byte bindings

The physical checkout is `/Users/dongpinhu/.codex/worktrees/pr283-merge-assertion/MAIS-MVP`. HEAD is T and the tracked/untracked Git status was clean at inspection. I reread the actual frozen commits rather than relying on the earlier pre-freeze review.

| Binding | Independently recomputed value |
| --- | --- |
| Baseline B | `f573ac62c97cb0716054bc516f7d5136491ca002` |
| S sole parent | B |
| S tree | `1915e22157f067e1cd6770a881feb12cee396ef6` |
| B..S inventory digest | `cb5b78568109506e494c0e0b88de3dba701b29b261de78bacaed875088c40302` |
| T sole parent | S |
| T tree | `189d6b1871d89bc0d9c1f7d33541a0198b38aab1` |
| S..T inventory digest | `83557e635301838f58f8657e9243ba67de27641bb26bb51e898f69684c86e145` |
| source-checks.json raw SHA-256 | `2ebf5dcaedce38dcdc320d3da40cd181c17fec5bee9b2bccdacab06d299cf4fd` |
| source-observation.json raw SHA-256 | `3859d94c9dfa795d7c53bc7420f254965f37bf8a474a802786d3da0ec37e47a0` |
| source-inventory.json raw SHA-256 | `9e4f4e5e8dd8b39188905045c94c33ba5cce217de00ec0d934ef7fc70f3f44b3` |

The source-inventory JSON equals the independently reconstructed B..S inventory. Inventory digests use raw blob SHA-256, Git mode and object ID for each before/after identity, sorted paths and recursively key-sorted compact JSON.

B..S contains exactly the two approved regular source files. S..T contains exactly the three subsequently approved regular tooling files. Their frozen raw SHA-256 values are:

| File | Raw SHA-256 |
| --- | --- |
| `docs/pr283-e2-reviewed-code-gate.md` | `3af35d0147591aa7288f417c57a875a174d15f82af40bed7aaf04cc8ef99c8a1` |
| `scripts/promotion-reviewed-code-pr283-e2.test.mjs` | `2c60dfa7d108f8f30b36e83add636b486bea2805c8ca40e9b38d3528cc2f37c1` |
| `.github/workflows/promotion-shadow.yml` | `d5b437deb67c66f7f9c4e46b691f53dbbe2152b388dd7d305523a14de71e7237` |
| `scripts/promotion-reviewed-code-pr283-merge-assertion.mjs` | `74768989747eb55ebe44fe355d41cf3d80ad887e8caffa2c21c7c86cb76ca6d9` |
| `scripts/promotion-reviewed-code-pr283-merge-assertion.test.mjs` | `e23bbbe8a454d8fb2fb52a4c8f4fa5eaa8de085626ea3904fb14c9944962a9d9` |

## Contract and implementation findings

No blocking findings remain in this exact tooling. The checker pins B, S, the complete S tree and source inventory, and PR285 with base B. T must be a direct child of S and change exactly the three approved tooling paths. E must directly follow T and add exactly eight new regular 100644 evidence files. The admission must have one first addition. Final HEAD must descend from E and preserve E's complete tree. An ancestry-preserving merge may therefore have a different commit SHA; an unreviewed tree may not inherit admission.

The checker uses literal checkout targeting, disables replacement objects and graft input, rejects graft files in both worktree and common Git directories, and rejects replacement refs and shallow history. Before actual execution it verifies full materialization, index flags, modes and blob bytes; it checks the preflight and head again afterward. Metadata-only sparse fixtures are explicitly rejected for runtime acceptance.

Independent A11 and A23 review records must bind the exact S, T, tooling digest, source inventory, observation and checks hash, reviewer identity and report bytes. The earlier source-only result `approved-for-independent-admission-preparation` is explicitly rejected. This formal review therefore adds tooling judgment and does not rewrite the earlier source-only record.

The new selector is first, checks both ordinary and symlink marker presence, and stops on an invalid selected marker. The old execution steps, triggers, job identity and permissions are preserved. No continue-on-error or fallback bypass was added. The new verify step uses always() within the selected mode.

The current proof carries the actual event head, source, tooling and admission commit. Finalization compares all of those against current preflight and verifies exact commands and report bytes. The TAP validator checks recursive suites, leaf counts and frozen title digests, per-scope plans and numbering, suite/test types, and one zero-failure/skip/todo summary. Diagnostic blocks accept only one duration and one type field, so hidden structural TAP records cannot be ignored.

The two issues raised during pre-freeze review are addressed. A complete-current-proof fixture reaches and rejects missing native artifacts with `ACTIVATION_ARTIFACT_SET`. Flat and nested diagnostic blocks now reject injected result, plan, subtest, duplicate type and failure fields. The actual five saved command outputs also parse under this frozen validator.

The historical leg remains native: baseline `03717842b19e8b8fa9a3a2dbecf1b359bb842233`, execution `ff709c0141ef8660604a20340b1c476bf2941f60`, original historical event, original checker bytes, original artifact set and its verify() routine. Its historical head is not rewritten into the new current head. The new decision binds that proof separately in historicalBaselineOnly. Current tests alone cannot substitute for it.

## Evidence consumed and verification limits

I read the producer's full-suite log, independently recomputed its raw SHA-256 `3543edd24ba698538728528930b7029c87438d4c9e26a11a794eeb513c10916d`, and confirmed the reported 193 tests passed with zero failures, cancellations, skips and todos. This run occurred before commit; all three tested tooling file hashes match the frozen T tree and working bytes. It is producer execution evidence, not a suite rerun by this reviewer.

I also compared the five records in runtime-validation/records.json with source-checks.json and invoked the frozen verifyTestRecords() on their existing stdout/stderr files. Exact command, output hashes, hierarchy, names, counts and zero-skip checks passed: repair regression 25, seed 5, funnel 9 in two suites, activity 59, and type-check exit 0. This invocation validated already captured reports; it did not rerun tests or manufacture runtime acceptance. All recorded stderr files and the type-check stdout are empty with SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

The source-checks file also reports general source CI run 39354309695 at S as successful. I bind that file's exact bytes, but did not independently query GitHub for that run in this review. It is not final-E CI. I have not consumed or claimed the concurrently running independent A11 result as my own execution evidence.

The copied source-observation is an expected, unchanged historical PR283 runtime observation. I verified its bytes; I did not recompute the final-E observation here. The new check/finalize/verify sequence still must recompute actual current-head observation and obtain native historical proof in final-head CI.

## Protected content and authority ceiling

The original Arkansas G6-G12 bank remains byte-identical to B, with raw SHA-256 `4f677216d3d9aec1b8f93be87a2900ff5a63f62e45a7555458ac146955ac0766`, 1500 questions and `us-ar-g6-g12-v1-g12-c04-q014.answer` equal to string `38000`. Both loader files retain their baseline Git blobs: G6-G12 expected live count zero and generated topic questions only from the K-G5 package. This is byte and static-source verification, not a new curriculum or live-runtime acceptance.

The old E2 checker and the E2, preceding v1, and original independent A23 evidence directories retain their exact baseline Git identities. The contract preserves all other baseline files through its exact S/T/E path partitions and final-tree lock.

Every formal gate permission remains false: ordinaryCodeEligible, liveAllowed, integrationAllowed, previewAllowed, deployAllowed, wholePackAccepted and historicalAuthorityTransferred. This review's result string approves the exact S/T for required-check admission; it does not change those permissions. No merge is authorized. No Shadow, content promotion, whole-pack acceptance, live operation, preview, deployment or production database write is approved or claimed.

The remaining required work is to freeze the exact eight-file E after both independent reviews, then run the current-head and native historical CI checks on that final head. A different source/tooling tree, stale review, failed check or extra path requires rejection or a new bounded review. Reviewer identity strings and hashes bind these record bytes; they do not cryptographically prove authorship. This report is the independent A23 review session's own judgment.
