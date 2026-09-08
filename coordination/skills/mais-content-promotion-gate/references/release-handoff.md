# Release handoff

Promotion ends at a redacted, exact-binding handoff. It never deploys.

Use `assets/live-release-handoff.template.md` and include only:

- candidate digest;
- source commit;
- target baseline commit;
- checker version hash and checker bundle digest;
- checker release commit, registered execution commit, independently bound Receipt storage and finalization commits, exact direct-parent Manifest hash, and execution -> storage -> finalization -> intended-release ancestry facts;
- Manifest, canonical Receipt, Closure, Registry, and CI artifact SHA-256 values with redacted references;
- official `lifecycleState`;
- `currentness` and `liveBoundary`;
- base attempt/revision relationship;
- canonical/fresh/replay semantic comparison;
- three distinct run identities plus recomputed semantic-digest status;
- one intended release SHA; distinct exact-SHA live-surface-owner, A11, A22, and A25 evidence records; explicit owner authorization for the production deploy target/action; and a redacted target-pathspec reference with its deterministic binding digest;
- remaining blockers and exact resume gate;
- rollback requirements.

Do not include raw candidate IDs, file paths, PR/run URLs, provider identifiers, credentials, or content bodies.

For a requested formal handoff, populate every template field from verified evidence. Do not replace source/baseline/checker bindings, attempt/revision relation, or canonical/fresh/replay comparison with “exact bindings complete.” If a required value is absent, keep the handoff blocked and identify that field as the resume gate. Ordinary explanations of the Shadow/live boundary may summarize it without creating a handoff or enumerating every missing field.

The formal handoff retains `bindings.candidateDigest`, `bindings.sourceCommit`, `bindings.targetBaselineCommit`, `bindings.checkerVersionSha256`, `bindings.checkerBundleDigest`, `bindings.checkerReleaseCommit`, `lifecycleState`, `currentness`, `liveBoundary`, and the complete `attemptRelation` projection in `discovery-and-routing.md`. Its complete `receiptComparison` includes `canonical`, `fresh`, `replay`, `bindingsEqual`, `semanticDigestsEqual`, `rawDigestsEqual`, `runIdsDistinct`, `semanticDigestsVerified`, and `comparisonStatus`; `comparisonDigest` is required when status is `pass`. Missing bindings stay visible even when another blocker already prevents deployment.

## Handoff gate

Handoff to `mais-release-hygiene-deploy-workflow` only when:

1. repository-native validation and Receipt verification return complete exact non-live bindings at the intended release SHA;
2. closed canonical/fresh/distinct-replay comparison passes and the Shadow Closure/Registry is verified for `active-attempt`; a valid `historical-direct-base` Closure remains evidence but cannot authorize the active revision or a release handoff;
3. live-intent owner authorization and target pathspec are explicit;
4. integration and A11/A22 regression evidence bind the same intended release SHA;
5. live blockers and rollback/monitoring requirements remain visible.

The live-surface owner's exact-SHA evidence is distinct from owner target/action authorization and from A11, A22, and A25 evidence. Report the five records separately and require every record to bind one intended release SHA. Recompute `targetPathspecDigest` from the exact object `{ releaseSha, target, action, targetPathspecRef }`; the redacted reference, not a raw path or pathspec value, is the public field.

The release skill owns dirty-tree slicing, clean build/CI source, environment/provider readiness, Vercel preview/production, same-SHA deployment readback, browser/live verification, production rollback, and monitoring. Name `mais-release-hygiene-deploy-workflow` as the next owner for each of those operations. A deployment success may be returned as new evidence, but the current Promotion gate cannot convert it into a live state by itself. Conversely, release hygiene must route exact candidate/Manifest/Receipt/currentness questions back here; it must not recreate or reinterpret Promotion semantics.

The machine-readable handoff schema declares `x-resolver-enforced=promotion-gate-handoff-v1`. Shape validation alone cannot accept a release handoff. The public async validator unconditionally loads this package's fixed bundled schema; it does not accept a caller schema. It also requires a separate non-public exact transport object containing the canonical Receipt repository-relative path, SHA-256, execution/storage commits, Git mode, and object ID. The path is never copied into the redacted envelope or handoff. The validator independently reads repository `HEAD`, requires `releaseSha`, `repository.head`, every release evidence record, and owner authorization to bind that same commit; proves the live-owner and role/authorization records distinct; recomputes the target-pathspec digest; cross-binds all candidate/source/baseline/checker and Manifest/Receipt/Closure/Registry identities; proves the Receipt absent at execution and the exact regular blob bytes/mode/object at storage; verifies commit existence; and proves execution -> storage -> finalization -> actual release ancestry. It then resolves the current tracked Promotion workflow and selected Manifest, verifies the Manifest-bound raw ledger and immutable checker release bundle, selects the unique closed Receipt schema from repository bytes, validates the stored Receipt, and recomputes its native self-digests, semantic/raw/binding digests, passing result, non-live boundary, and exact Manifest/execution/checker projection. A caller-provided schema, summary, pass flag, or rehashed arbitrary JSON object has no authority. Storage and finalization may name one commit only when both bind the same verified transport commit; execution must be distinct. The builder calls this same validator and returns only after full fixed-schema and repository capability validation. Normal read-only audit leaves storage/finalization null; only explicit verified Receipt transport/finalizer evidence may populate them, and a complete release handoff is impossible while either is null. Unsupported JSON Schema assertion keywords fail closed; `not` is enforced.

If any binding differs, the workflow selector is ambiguous, currentness is stale, Closure scope is historical, or live authorization is missing, emit a blocked handoff and stop.
