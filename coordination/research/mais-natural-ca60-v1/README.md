# MAIS-NATURAL-CA60-V1 frozen design registration

`MAIS-NATURAL-CA60-V1` is an immutable, pre-execution research design for a California-only natural-item pilot. Its target population is the California mathematics subset that is both visible in the frozen runtime inventory and eligible for provider egress under a future, separately signed authorization. The sampling unit is a distinct homology cluster, and the frozen target is 60 clusters allocated across three response forms (`FREE_RESPONSE`, `MULTIPLE_CHOICE`, `STRUCTURED_RESPONSE`) by three difficulties (`EASY`, `MEDIUM`, `HARD`).

The machine-reference workflow assigns Qwen `qwen3.8-max` only the role `MACHINE_REFERENCE` and DeepSeek `deepseek-v4-pro` only the role `EVALUATED_PROVIDER`. This is not human-gold evidence. It does not establish human correctness, curriculum acceptance, provider superiority, live-product readiness, or production behavior.

## Decision boundary

The CA60 decision ceiling is exactly `INCONCLUSIVE_MACHINE_REFERENCE`. This package makes no `PASS`, `APPROVED`, production, or promotion claim. In particular:

- the frozen sensitivity opportunity requires at least 25 resolved machine-reference-positive clusters with all successes for a one-sided 95% Wilson lower bound of at least 0.90;
- the frozen specificity opportunity requires at least 52 resolved machine-reference-negative clusters with all successes for a one-sided 95% Wilson lower bound of at least 0.95;
- `25 + 52 = 77 > 60`, so CA60 cannot make the `LIMITED_MACHINE_REFERENCE` conclusion available even under all-success outcomes;
- unresolved items are reported and excluded from binary denominators under the frozen rule, never silently relabeled; and
- approximately 400 independent homology clusters is planning guidance for worst-case ±5 percentage-point precision, not a claim about CA60.

## What is frozen now

- [`design-contract.mjs`](./design-contract.mjs) is the executable source of the design constants, taxonomy, canonicalization, hashing, and structural invariants.
- [`design-registration.json`](./design-registration.json) is the immutable design registration. Its `registrationHash` is SHA-256 over RFC 8785-compatible canonical JSON with `registrationHash` omitted.
- [`statistical-power.json`](./statistical-power.json) records code-reproducible Wilson, structural-impossibility, zero-miss, and planning calculations bound to the design hash.
- [`schemas/`](./schemas/) contains the nine versioned schemas for future frame, sample, authorization, execution, evaluation, and review artifacts.
- [`validate-design-registration.mjs`](./validate-design-registration.mjs) is a zero-network, read-only drift validator.

The design registration is not a sampling-frame registration, sample manifest, provider authorization, provider execution record, final evaluation, or independent review. Those are future, distinct artifacts in the frozen chain. `firstProviderExecutionAllowed` is `false`; this package neither reads credentials nor contacts a provider.

## Frozen sampling and labeling summary

Eligible prompts are normalized with Unicode NFKC and converted to a template skeleton. Homology edges require both trigram Jaccard ≥0.90 and normalized edit similarity ≥0.92; connected components are the clusters. A component representing strictly more than 5% of the eligible frame or bridging strictly more than two topics blocks the frame for review. The nine cells use Hamilton largest-remainder allocation with a minimum of two clusters per cell. Selection is ordered by the frozen SHA-256 formula and cannot be rerolled or replaced after any label or result is known.

Raw labels remain immutable and final labels occupy separate fields. Material error codes map to a frozen severity and binary-label interpretation; ambiguity, missing evidence, or unresolved adjudication remains `UNRESOLVED`. Machine provenance and human independent-review provenance are never conflated.

## Validation

Run locally with no dependencies and no network access:

```sh
node --test coordination/research/mais-natural-ca60-v1/*.test.mjs
node coordination/research/mais-natural-ca60-v1/validate-design-registration.mjs
node coordination/research/mais-natural-ca60-v1/validate-design-registration.mjs --json
```

The CLI writes no artifact. A nonzero exit reports registration, hash, schema, threshold, power, chronology, or vocabulary drift.
