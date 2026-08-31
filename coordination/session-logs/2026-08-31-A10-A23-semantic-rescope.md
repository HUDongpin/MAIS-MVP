# A10/A23 — Promotion required-check semantic rescope

## Session identity and authorization

- Lane: isolated A10/A23 composition; A11/A22/A25 are independent review lanes.
- Repository: `/Volumes/Starship/mais-a23-selective-composition-20260830`.
- Branch: `a23/selective-composition-20260830`.
- Semantic-rescope base: `968df4effda7d36301df037f4328e8209334e388`.
- Implementation commits before the workflow-wiring commit:
  - `401d50d9537fc86f4ca9a08dfa9886af7679f21c` — bind semantic rescope to Git event diff;
  - `116db7e3` — fail closed on incomplete Git diff evidence;
  - `cae4c05d` — prove current-head semantic safety;
  - `a180d370` — bind tracked semantic authorities.
- The final CLI/workflow/enforcement changes and this log are bound by the commit containing this file.

The owner authorized the local semantic rescope and independent review. The owner did **not** authorize workflow dispatch, a PR #220 update, live branch-protection mutation, Promotion Shadow execution, merge to `main`, deployment, or any live/provider write. None of those actions occurred. Every decision emitted by this slice fixes `liveAllowed=false`, `integrationAllowed=false`, `previewAllowed=false`, and `deployAllowed=false`.

## Three-layer required-check model

1. **Event and authority layer** — bind the exact GitHub PR/push event, checked-out head, non-shallow base/head ancestry, two independently generated NUL-safe diff byte streams, and the complete tracked authority graph (Manifest, canonical Receipt, checker release, candidate, evidence, registry, approvals, and projections).
2. **Current-head semantic layer** — run the native v2 semantic and runtime/legacy proof at the exact event head. Frozen graph equality is treated separately: the known 34-runtime/4-test baseline and 3589-to-3590 graph drift can be recorded, but can never mask a semantic failure.
3. **Canonical enforcement layer** — bind current validation plus three distinct passing non-live Receipts and three verifications to one Manifest, semantic Receipt digest, binding, and execution commit. Emit one strict, self-digested decision and independently recompute all evidence during final verification.

The only rescope pass code for a baseline-drifted historical pilot is `historical_pilot_intact_semantic_runtime_safe`, and only when the event changes no promotion-controlled path and current-head semantics are safe. Promotion-controlled drift remains blocked unless full validation passes.

## TDD evidence

The original RED command was:

```text
node --test --test-concurrency=1 scripts/promotion-required-check-semantic-rescope.test.mjs
tests 15; pass 0; fail 15
ERR_MODULE_NOT_FOUND: scripts/promotion-required-check-semantic-rescope.mjs
```

Those 15 fixtures covered event/base/head binding, incomplete Git evidence, NUL-safe paths, deterministic authority union, controlled drift, semantic failure, the narrowly named non-live result, unavailable scanning, current-head binding, PR #220 graph evidence, strict decision/replay, final enforcement, review routing, workflow trigger guards, and all controlled source classes.

Additional RED/GREEN increments covered:

- real PR/push event collection and stable failures for shallow, missing-commit, non-ancestor, inconsistent, unsafe-path, and invalid-UTF-8 evidence;
- strict tracked-HEAD JSON authorities and symlink/working-byte drift;
- native current-head semantic proof, baseline/graph separation, and dirty/wrong-head rejection;
- deterministic authority-graph expansion, including a tracked JSON fixture larger than 4 MiB;
- exact canonical Receipt/replay/verification equivalence, distinct run identities, Receipt-to-verification execution-commit binding, and non-live invariants;
- strict complete-decision recomputation and mutation rejection;
- bounded CLI command surface, exact decision location, exclusive mode-0600 output, strict JSON, and absence of network/arbitrary process/live commands;
- workflow trigger, exact checkout, artifact-set, semantic evaluator, and final verifier wiring.

## Fresh local GREEN evidence

All commands used a task-owned `TMPDIR` under `/Volumes/Starship`; no default-system-temp writes were required.

```text
node --test --test-concurrency=1 \
  scripts/promotion-required-check-semantic-rescope.test.mjs \
  scripts/promotion-shadow-workflow-v2.test.mjs
tests 33; pass 33; fail 0

npm run test:promotion-gate
tests 75; pass 75; fail 0

npm run test:release-governance
tests 103; pass 92; skipped 11; fail 0

npm run type-check
exit 0

git diff --check
exit 0
```

The 11 release-governance skips pre-existed and are explicitly reported; they are not counted as passing evidence.

After the first workflow-wiring commit, A11 independently reran release governance against the new committed Git object and exposed a necessary RED that the pre-commit run could not see: the reviewed `test:promotion-gate` command body had intentionally gained the semantic-rescope test, while the self-contained P0 golden digest still identified the prior command body. The observed mismatch was `84d0f274…` versus `61bf6300…`. The exact golden was updated to the reviewed new command-body digest in a follow-up commit; the final post-commit verification must therefore be evaluated at the final HEAD, not inferred from the earlier pre-commit green run.

## Exact PR #220 offline semantic probe

The bounded CLI was evaluated and then independently verified against a clean, non-shallow, detached temporary clone at exact PR head `4399e669d007751bb1b716a257004f04c5b10846`. It used the archived GitHub-run current-validation, fresh/replay Receipts, and three verification artifacts plus the canonical Receipt tracked in that exact head. It made no network, provider, deployment, Shadow, or GitHub mutation.

Result:

```text
schemaVersion: promotion-required-check-enforcement-decision.v1
result: pass
code: historical_pilot_intact_semantic_runtime_safe
base: baca84e77abae1e16cfd53d497c6f7ee734d4679
head: 4399e669d007751bb1b716a257004f04c5b10846
changedPathCount: 4
changedPathsDigest: e20234c1fe6b97bd1272fd8a500a2c44e6a0efa3cf5d9b29a21eb6941b643036
promotionControlledPathCount: 0
authorityPathsDigest: 1f90f72b36b0fe9191052c1a4c236b85fd12be3b835ec73d875b697f1f0766a4
authorityBindingsDigest: d9e8c338a7e0436039f396baa7917984c6d9b9cf07aed3a525e8271083b950a3
runtimeChangedPathCount: 34
runtimeChangedPathsDigest: 5fc6fcc9d6c13c4ebee4858ae91877e9a1e31f27322df56f6954d0f4bb2cc5d8
allowedTestOnlyPathCount: 4
allowedTestOnlyPathsDigest: fbca4125ea52c447a1961319d6b3207da9d4a4f4e2d713a96aa9326bf700a604
runtimePolicyDigest: 43cd05fdb8cc9accb085cc0dcb83d047ea73659f4e21440b6755395245dea8b5
canonicalAuditDigest: e340d3f2cc3ae20e4e5a7ffaef12b642a2e3811138fd161714d8bb7a837abc91
canonicalExecutionCommit: 9118aa23f7413e4c5dc0ffc4a381ab09c87d220d
graphEdges: 3589 expected / 3590 observed
decisionDigest: 38b0b14c07cd08d51e108c27662e1c720fafd05111f8fdf7aca005fc917aef5c
decisionFileSha256: 660550648aeb885433ca614da86a68c181a54b922a7c644cb16d4708fb6b6cc8
reviewQueue: A23, A25
liveAllowed: false
```

## Frozen external design evidence

The earlier frozen manifests are outside the repository and must be reviewed by exact archive path, not searched for inside the clone:

- `/Volumes/Starship/MAIS-worktree-archive/2026-08-29-deep-cleanup/a23-required-check-semantic-rescope-v2-20260831T025500HKT/MANIFEST.sha256`
- `/Volumes/Starship/MAIS-worktree-archive/2026-08-29-deep-cleanup/a11-semantic-rescope-coverage-audit-20260831T032000HKT/MANIFEST.sha256`

The implementation postflight archive and its manifest are created only after the final local commit so they can bind the exact final SHA.

## Claim ceiling and review status

This proves only a local required-check implementation and an offline exact-head semantic decision. It does not prove that GitHub has executed the changed workflow, that branch protection has changed, that PR #220 is updated or mergeable, that Shadow ran, that a deployment exists, or that live behavior/provider state is valid.

A11/A22/A25 must independently review the final commit range and external evidence before custody can be called complete. Any missing signature remains `PENDING/BLOCKED`; local self-review cannot substitute for an independent lane.

## Composition quality follow-up (reviewer-requested)

The quality-review RED added an executable negative-path contract for the CLI artifact resolver. It initially failed because the resolver export was absent. The GREEN implementation now binds every local artifact option to its exact canonical basename under the canonical absolute `artifact-root`, binds `canonical-receipt-copy` to the sibling canonical Receipt path, rejects a symlink or noncanonical root, and rejects outside/mismatched artifact paths before evidence reads. `event-path` remains the explicitly documented GitHub-owned external exception; tracked Manifest and canonical Receipt authority continues through the tracked reader.

Fresh focused RED/GREEN evidence at the follow-up HEAD:

```text
node --test --test-concurrency=1 scripts/promotion-required-check-semantic-rescope.test.mjs
tests 29; pass 29; fail 0
```

This remains a local required-check implementation and evidence-boundary proof only. It does not authorize or prove GitHub execution, PR update, branch protection, Promotion Shadow, integration, deployment, provider behavior, or live state.
