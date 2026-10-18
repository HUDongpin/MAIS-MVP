# Exact PR276 and PR277 composition admission

PR276 E2 passed native PR CI and the required gate (runs 39135396618 and 39135396635, including all 31 homepage cases with zero retries). Before merge, protected main advanced through PR277. Its candidate-only admission and PR276's homepage admission each bind their own full tree. Neither can admit the combined tree, and neither old contract or review is changed by this extension.

## Frozen source composition

- Shared ancestor: `656ac319b2ad5812d31ad952cbb18430b5e58065`.
- PR276 E2: `b8cecebf0fe9d6e296d24af6007f850f92fba4bd`, tree `14bd331c869cead154e1900e7d00e58fd3ea57d6`.
- New protected-main base M277: `39cb64c9d9719ec39c8b4c244bc8d6818ee6a87d`, tree `580f3fa6e4aa6970406bb41e949e3d002ac8a1f0`.
- Combined source C: `b8bba0fc661affd4ee0a71acd341280a2ab38cc4`, tree `d40dfd26310497a7cd118887a11dded04f99fc6e`, with exact ordered parents E2 then M277.
- M277-to-C inventory: `0a2677b019c733ed24e2b134a34c840b11f147c230763e3fc48ab98c68a02290`.
- Fresh combined observation: `90408097b338eebafb1378c71ded0a402cd973e43b131eab408dde3c90c48e2f`.

Every non-workflow path is the exact byte/mode/blob union of its originating branch: 23 PR276 paths and 30 PR277 paths. The sole overlap is the workflow; C preserves every non-selector step from both versions. C's full tree is pinned. The homepage component and selected PNG are unchanged from the already-tested E2. No candidate is enabled.

The new observation covers 3,888 files, exactly one more than E2. The unchanged PR201 pure observation guard requires the newly frozen combined observation, the one-file coverage delta, and identical E2 runtime reachability and canonical audit. The unchanged PR201 content validator verifies all reviewed 228 rows, the 1,272 untouched rows, A18 hashes, the original bank and q014's dollar-scale answer.

## New C/T3/E3 admission

T3 is C's direct child and changes exactly this document, the v3 checker/test and the workflow. E3 is T3's direct child and first-adds the seven evidence files under `coordination/integration/reviewed-code/pr276-v3`. Genuine new A11/A23 reviews bind C/T3, source/tooling inventories, observation and fresh check bytes. The entire candidate tree must equal E3; a different PR, changed main base, extra file, altered old evidence, forged review or expanded permission fails closed. A present invalid v3 marker cannot fall back to an older contract.

## Required execution and separate proof scopes

The actual combined tree runs nonincremental TypeScript, all 31 unchanged homepage browser cases on a fresh isolated production build with zero retries, and the unchanged PR201 grading and candidate-isolation command arguments. Both preflight/current and final checks preserve clean, fully materialized source with no hidden index flags. Current content hashes, candidate isolation and the combined observation are recomputed.

The entire unchanged PR201 contract suite runs in a distinct, clean, fully materialized checkout pinned to M277. Its real-root local-slice test correctly refuses combined code, so the test is neither filtered nor weakened. Its command/output bytes and exact M277 SHA/tree are separately bound in the current proof; the frozen checkout is verified again after execution and during finalization. This is preserved-contract evidence only, not combined-tree acceptance.

The new workflow mode executes its own copy of the exact pinned PR262 source fetch before the unchanged historical baseline evaluation. Historical artifacts remain separately bound to their original source and cannot grant current live or deployment authority. Every older workflow step/checker/test/evidence remains immutable. Full Linux CI must pass the native materialization and current checks; descriptor-relative local diagnostics do not replace that CI.

The new admission grants only ordinary-code eligibility. Merge, live, integration, Preview, deployment, whole-pack and historical-transfer permission fields stay false. The owner's separate merge/deploy authorization remains valid; final protected-main checks, production schema preflight, and disposition of the pre-existing enabled-mail health incident remain release requirements.
