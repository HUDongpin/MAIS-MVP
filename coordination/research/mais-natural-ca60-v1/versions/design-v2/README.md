# MAIS Natural CA60 design registration v2

This directory is the active append-only pre-execution design registration for the California 60-cluster machine-reference pilot. Its registration hash is `a1b7d7ac6cf23b059dddc015c75b876d26a3576f9e5e3e07724ef8c5b8429de8`. The top-level v1 predecessor remains byte-identical and is bound by `predecessor-golden-hashes.json`.

## Current boundary

- `framePopulation`: all questions visible through the frozen `US_CA_MATH` authenticated-student runtime projections.
- `estimandPopulation`: only the egress-eligible subset of that frame.
- Sampling unit: one item from each of 60 distinct homology clusters.
- Reference source: `machine_reference_panel` using isolated Qwen A/B solve-label roles and one adjudicator. This is **not human gold**; same-model correlated error remains a named limitation.
- Evaluated provider: direct DeepSeek route only, with no fallback.
- Decision ceiling: `INCONCLUSIVE_MACHINE_REFERENCE`.
- Execution lifecycle status: `AUTHORIZATION_BLOCKED` until separately issued, unexpired, exact-hash-bound Qwen and DeepSeek authorizations exist.

No provider call, frame freeze, sample freeze, label production, live question mutation, deployment, or production claim is performed by this design package.

## A18 blocking clarification incorporated

`FALSE_ACCEPT_CORRECT_RESPONSE` is retained literally because the user froze the taxonomy string, but it has no coherent operational definition in v2. A raw occurrence is preserved, forces adjudication with `AMBIGUOUS_LITERAL_CODE_FALSE_ACCEPT_CORRECT_RESPONSE`, and the final reference label must be `SCHEMA_GAP` plus `UNRESOLVED_REFERENCE`. It cannot enter an accepted-code set, finding array, match record, P0 opportunity, false-negative count, or any metric. Activation requires a new pre-call design version with an explicit definition and examples.

Status codes (`NO_FINDING`, `UNASSESSABLE`, `SCHEMA_GAP`) likewise never enter finding matching. The metric key is unique `(itemId, family, code)`, and the finite missing-item counterfactual universe contains 16 operational defect codes.

## Immutable sequence

1. Design registration v2
2. Frame registration
3. Sample registration
4. Qwen authorization
5. Reference-label seal
6. DeepSeek authorization
7. Execution registration

Every downstream command must verify all upstream hashes and fail closed. A pre-call change creates a new version with `supersedes`; a post-call material change invalidates the old run for generalization, preserves all receipts, and restarts from the first registered item.

## Validation

Run:

```text
node --test coordination/research/mais-natural-ca60-v1/versions/design-v2/*.test.mjs
node coordination/research/mais-natural-ca60-v1/versions/design-v2/validate-design-registration.mjs --json
```

The validator is zero-network and the saved design itself forbids a first provider execution.
