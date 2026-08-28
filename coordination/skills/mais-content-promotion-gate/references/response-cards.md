# Promotion response cards

Status: **normative response projection**. Select one card, then use repository-native discovery/schema/checker evidence. A card is not a Manifest, Receipt, Closure, Registry, authorization, or live proof. Named dated facts stay in their case study.

## PRO-1 Named dated attempt or re-affirmation audit

- Read the named dated Promotion case study before answering; label its facts dated and non-normative.
- Report the workflow-selected active Manifest and canonical Receipt by redacted reference/hash and keep the direct base Manifest/Receipt/Closure/Registry in a separate historical layer.
- Preserve every case-study-recorded relation flag, lifecycle/currentness state, Receipt verification result, blocker, and evidence-record count; do not replace recorded facts with unknown merely because the prompt abbreviates them.
- Report base attempt and active revision separately, including unchanged candidate/source/checker facts, baseline change, and `historicalClosureOverwritten:false` when the case study records them.
- If the machine direct-parent descriptor is absent, retain `relation: unresolved-reaffirmation`, `status: blocked`, `currentness: stale`, and active `lifecycleState: shadow_ready`; do not transfer the base `shadow_passed`.
- Keep canonical Receipt digest/check verification, repository-native validate authority, canonical/fresh/replay comparison, and Closure/Registry finalization as four distinct layers.
- Preserve the base Closure/Registry only as `historical-direct-base`.
- Keep `liveBoundary` blocked/unproven and `liveAllowed:false`.
- Count role files as bound evidence records, never independent reviewers without identity proof.
- Emit only redacted references, hashes, fixed states, counts, blockers, and the exact resume gate.

## PRO-2 Candidate or evidence mutation

- Any candidate byte or semantic change invalidates the old Receipt.
- Never edit a frozen Manifest, Receipt, Closure, Registry, or hash in place.
- A candidate/checker change requires a new immutable candidate/version/attempt and fresh applicable QA, currentness, Shadow, replay, and closure evidence.
- An evidence-only correction may append a new corrected evidence record without changing candidate/checker semantics.
- A baseline-only re-affirmation is allowed only for independently reviewed, candidate-unrelated baseline drift and must remain append-only.
- Do not stage, commit, push, integrate, deploy, or claim live proof from this disposition.

## PRO-3 Historical Receipt after runtime drift

- Classify the prior Receipt `currentness: historical-only`, never current.
- A historically passing Receipt cannot authorize the changed runtime baseline.
- Require independent proof that the baseline delta is unrelated to candidate semantics before any re-affirmation.
- For any authorized append-only re-affirmation, require evidence first, then one binding/execution commit, then later independent Receipt/finalization evidence. Reject a self-referential descriptor and any monolithic rewrite that tries to create evidence, binding, execution, and finalization in one mutable step.
- Candidate-related or checker-related drift requires a replacement immutable attempt, not re-affirmation.
- Preserve old Receipt/Closure/Registry bytes and history.
- Do not claim current Shadow, integration, release, deployment, or live authority.

## PRO-4 Canonical/fresh/replay comparison

- Validate every Receipt against the exact discovered closed checker-bound schema and the generic non-live Promotion governance grammar before comparing.
- Reject consistently rehashed production/deploy/approval claims; rehashing never converts them into non-live evidence.
- Raw Receipt digests may differ because run identity/time is excluded from closed semantics. Equal bindings plus equal recomputed semantic digests may pass only with distinct run identities.
- Equal bindings plus different semantic digest fails. Host-path contamination and malformed exact full commit SHA fail closed.
- Emit the bounded comparison fields `receiptSha256`, `semanticDigest`, `rawDigest`, and `bindingDigest`. `comparisonDigest` is required for `pass`; for `fail`, preserve it when the authoritative comparator returns it and label it bounded non-authoritative diagnostic evidence.
- Preserve every returned `issues[].code` value verbatim. The comparator's closed codes are `RUN_ID_NOT_DISTINCT`, `RECEIPT_BINDING_MISMATCH`, `SEMANTIC_RECEIPT_UNVERIFIED`, and `SEMANTIC_RECEIPT_MISMATCH`; discovery/validation errors retain their own returned fixed code rather than being translated into prose.
- Never emit raw paths or run IDs.
- Route an independently reissuable typo with unchanged candidate/source/baseline/checker as evidence-only correction.
- Route checker/projection semantic defects to a new checker release and immutable attempt; baseline re-affirmation cannot cure them.
- Do not claim Closure, handoff, deployment, or live proof.

## PRO-5 Shadow-to-live request

- Begin with: no deploy, no provider-configuration access or network call, and no live claim.
- A valid Shadow result is non-live only: keep `lifecycleState: shadow_passed`, `liveAllowed:false`, and `liveBoundary: unproven|blocked` subject to currentness.
- Shadow rollback proves only runner-owned temporary-output isolation, never database/content/route/deployment/production rollback or monitoring.
- Return a structured blocked handoff, not only a prose field list. Bind every known value and mark each missing binding with a fixed blocker.
- The handoff projection includes candidate/source/baseline/checker bindings, Manifest/Receipt/Closure/Registry/CI hashes, `lifecycleState`, `currentness`, `liveBoundary`, the complete `attemptRelation`, and canonical/fresh/replay `receiptComparison`.
- Bind one intended release SHA and separate live-surface-owner, A11, A22, A25, and owner production target/action authorization records; include a redacted target-pathspec binding.
- Keep rollback, same-SHA route readback, required-behavior verification, and monitoring as release requirements.
- Route the exact-SHA handoff to `mais-release-hygiene-deploy-workflow`; Promotion itself never deploys or marks live.
