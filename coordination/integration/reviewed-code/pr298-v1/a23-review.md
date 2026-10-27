# A23 independent review — exact PR298 monitor admission

Reviewer: /root/promotion_diagnosis
Reviewed at: 2026-10-27T04:56:20.000Z
Decision: approved-for-exact-pr298-required-check
Scope: exact-pr298-monitor-diagnostics-required-check-only

## Exact reviewed objects

- Base B: 62e471134682d26c367667dca8ecc1d96acd1ed8
- Source S: fe94ba0e79c10451760c874785a0560a7ecafa43
- Source tree: f4ae9bec0f6d5cc666efc5194121f9c01a417564
- Source inventory digest: 0c5df6d70dce564a584f3f9a757c24fc91c6825ec5e6ea38e8c4d08142d7867b
- Tooling T: 2f76b807aade16ed020af15d1c6fc2f74337168e
- Tooling tree: 7c40e396b2ab0fce8a6028c7653f6c524873af80
- Tooling inventory digest: 49a3af42bd0fdff4abcbf42e445731966dfd8f23b78f209c3e48644908ee6cb9
- Frozen source-check bytes SHA-256: 4c239f77a99e21a0c7cd1d9c89f0641558fe2bf778d1dd7ab825baec2e10cd90

This report was authored by the independent A23 reviewer after T existed. I inspected the actual Git objects, the four committed tooling files and their candidate hashes, the frozen source inventory/checks, the original source TAP output, and the relevant preserved helper and workflow contracts. No blocking finding remains in this bounded source/tooling review.

## Governance and correctness findings

1. S has exactly the ordered parents [fa788aa4050a4ef430ae7f6079ad8dfeb9f812c9, B]. B to S changes only the monitor script and its test. Their after-blobs equal the owner-approved original monitor blobs; the exact source tree and inventory digest were independently recalculated.
2. T is an actual single child of S. Its delta contains exactly the four authorized tooling paths, all committed mode 100644 and byte-for-byte equal to the independently reviewed pre-freeze candidate. The tooling tree and inventory digest above were independently recalculated. Working-tree status remained clean after verification.
3. The checker requires E to be a direct child of this T adding exactly seven new evidence files. It binds source/tree/inventory, source-check bytes, tooling commit/tree/inventory, both actual review JSON/Markdown pairs, distinct fixed identities, report hashes, and canonical review timing. Synthetic fixture reports are test data, not actual independent evidence. This report supplies only A23's real review; it does not speak for A11.
4. PR admission requires same-repository PR298, exact base B, and head E. Descendants, another PR, changed base, altered evidence, duplicate JSON, wrong independent identity, pending or widened decision scopes and permission changes fail closed. A supported future main event must have ordered parents [B,E], the E tree, and exact before/after binding. That event verifier is not merge authorization.
5. The workflow is precisely the deterministic addition of the PR298 selector, allowed mode, and verification/upload steps to S's workflow. All previous steps, conditions, action pins, permissions and gates remain intact. A failed selected PR298 checker stops under set -e; it cannot fall back to a historical approval. No old checker or admission bytes are rewritten by S or T.
6. The new check reruns only its adversarial contracts and the twelve offline monitor contracts. The monitor tests inject fake HTTP responses and synthetic credentials. The child environment omits health credentials, provider keys, database URLs, NODE_OPTIONS and NODE_PATH. No live health, database, provider, schema, Shadow or deployment operation is part of this admission execution.
7. Artifacts require a fresh canonical empty temporary directory outside the repository with mode 0700; outputs use exclusive creation with mode 0600. Strict JSON, topology, clean state and currentness checks remain. The unchanged materialization guard runs before and after execution. No receipt, placeholder decision or fabricated health result is used as approval.
8. All six permission flags remain false. The produced decision explicitly reports liveHealthProven false. This admission establishes no production-health recovery, historical promotion revalidation, whole-pack acceptance or transfer of historical authority.

## Independent verification on immutable T

- Gate contracts rerun: 32 passed, 0 failed, 0 skipped; exact parsed result-name digest cb0ac9f575e20317351385aa7f2222c16bafca425b010800951b1345741f1e28.
- Monitor contracts rerun: 12 passed, 0 failed, 0 skipped; exact parsed result-name digest 313e118d45e2228d944397fd319158d451ac0b022d44964f4d5f84dc5db47bf1.
- Final gate TAP SHA-256: 66a11a9425a919c3067a201b6ff676ffbd1c8344d1f456d8880a1988726b9231.
- Final monitor TAP SHA-256: 9bc4b3d3bbe468efb1d87b6d69c1c2a45c80a16a34fc60b21e276f1e0a40ef91.
- Both final stderr captures were empty (SHA-256 e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855).
- Original frozen source TAP SHA-256 7014e069fcfdfc882192372a33fb4224e6aefa9f0039075282e684b8fca6279b matched source-checks.json and parsed to the same exact twelve monitor contracts.
- All four T candidate hashes, source parents, source inventory, tooling inventory, workflow reconstruction, Git cleanliness and regular candidate file modes/link counts were rechecked directly.

## Evidence limits and retained boundaries

E does not yet exist at this review. Actual E preflight, its GitHub PR event, ordinary CI and final admission execution are therefore not reported as passed. The unchanged full materialization guard was invoked locally and stopped with ENAMETOOLONG on the existing macOS checkout's historical long paths. That environment limitation is recorded, not waived: the final E must still satisfy the unchanged full materialization/currentness guard on Ubuntu CI. Sparse synthetic topology tests do not establish full-tree acceptance.

This approval is for the exact PR298 required-check package reviewed above. It is not a native Shadow receipt, broad runtime/content acceptance, a production-health recovery finding, permission to merge PR298, preview/deploy authorization, or authorization for a production schema/database/provider operation. Historical gates and evidence remain unchanged. Any changed source, tooling or evidence composition requires review under its actual scope.

No project source, Git refs, GitHub state, credentials or production data were mutated during this review. Test-created disposable fixture repositories were confined to temporary storage. The parent must copy these final review bytes unchanged into E.
