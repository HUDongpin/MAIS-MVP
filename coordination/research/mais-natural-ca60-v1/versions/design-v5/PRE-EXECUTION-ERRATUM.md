# Pre-execution erratum: reference provider migration to GPT-5.6 Luna

- Erratum date: `2026-08-26` (`2026-08-25T16:39:10.000Z` in the frozen UTC timestamp).
- New candidate: `MAIS-NATURAL-CA60-V5`.
- Superseded candidate: `MAIS-NATURAL-CA60-V4`.
- Superseded disposition: `SUPERSEDED_NOT_EXECUTED`.
- Reason code: `OWNER_REPLACED_QWEN_WITH_OPENAI_GPT_5_6_LUNA_BEFORE_ANY_PROVIDER_CALL`.
- Active registration at assembly: `MAIS-NATURAL-CA60-V3`.

## Correction

The California 60-cluster machine-reference pilot will not use Qwen `qwen3.8-max`. The owner selected OpenAI GPT-5.6 Luna with the following design tuple:

```text
OPENAI_PROJECT_RESIDENCY = US_STORAGE_PROCESSING
OPENAI_REFERENCE_ENDPOINT = https://us.api.openai.com/v1/responses
OPENAI_REFERENCE_MODEL = gpt-5.6-luna
```

This erratum is additive. It does not edit V1, V2, V3, or V4; it does not rewrite any historical receipt or conclusion; and it does not assert that V4 ever executed. The exact V4 package is preserved by `predecessor-package-inventory-v4.json`.

## Evidence at supersession

At the time of the owner decision and V5 seal:

- Qwen provider attempts: `0`;
- OpenAI provider attempts: `0`;
- DeepSeek route-probe attempts: `0`;
- DeepSeek natural-item attempts: `0`;
- frozen frame: absent;
- frozen sample manifest: absent;
- machine-reference labels: absent;
- natural-item results: absent;
- independent V5 review receipt: absent; and
- current hash-bound provider authorization: absent.

Therefore no result, label, or provider receipt is reinterpreted by this migration.

## Authorization clarification

The owner message freezes the provider/model/residency/endpoint selection for design work. It cannot itself serve as the future live authorization receipt because it predates the final V5 registration hash and does not bind the future frame, sample, prompts, schemas, runner, adapter, egress screen, token cap, attempt cap, price snapshot, USD cap, issued-at, expires-at, or authorization evidence hash.

The V5 registration consequently remains fail closed: `activationAllowed=false`, `firstProviderExecutionAllowed=false`, and all current authorization hashes are `null`.

## Pre-independent-review candidate correction

Candidate revision 1 used `^[0-9a-f]{64}$` for `ProviderAuthorizationV2.runnerCommit`. That pattern represented a generic SHA-256 rather than the current repository's 40-hex Git SHA-1 object ID and would have made a real runner-commit binding impossible. Before A11 review, activation, authorization, credential access, or any provider event, candidate revision 2 changed only that pattern to `^[0-9a-f]{40}$` and recomputed every affected schema, registration, power, and package root.

The registration records revision 1's commit, registration hash, and package root with disposition `SUPERSEDED_PRE_INDEPENDENT_REVIEW`; the Git history preserves its bytes.

## Unchanged limits

The label source remains a same-model machine panel, not human gold. Correlated error remains a limitation. The CA60 structural feasibility result, P0/P1/P2 decision rules, confidence thresholds, `INCONCLUSIVE_MACHINE_REFERENCE` decision ceiling, and prohibition on formal `PASS` remain unchanged.
