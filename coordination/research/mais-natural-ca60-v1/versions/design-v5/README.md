# MAIS Natural CA60 Design V5

`MAIS-NATURAL-CA60-V5` is the append-only provider-migration registration for the California 60-cluster machine-reference pilot. It freezes the owner's reference-provider selection as:

```text
provider = OPENAI_DIRECT
projectResidency = US_STORAGE_PROCESSING
endpoint = https://us.api.openai.com/v1/responses
model = gpt-5.6-luna
apiSurface = RESPONSES_API_V1
```

V5 is a sealed candidate, not an active execution registration. Its lifecycle is `SEALED_CANDIDATE_PENDING_INDEPENDENT_REVIEW`; `activationAllowed=false`, `firstProviderExecutionAllowed=false`, and `providerEventCount=0`. The mutable active pointer remains on V3 until an A11 independent review concurs and a separately reviewed pointer update occurs.

## What changed

The unexecuted Qwen V4 candidate is recorded as `SUPERSEDED_NOT_EXECUTED`. Its bytes were not edited. `predecessor-package-inventory-v4.json` exact-binds every V4 file, its byte length, and its SHA-256 hash. V5 then changes only the registered reference-provider surface:

- Qwen `qwen3.8-max` becomes OpenAI `gpt-5.6-luna`;
- the route becomes `https://us.api.openai.com/v1/responses`;
- the project-residency selection becomes `US_STORAGE_PROCESSING`;
- the request contract becomes a non-streaming Responses API request with `store=false`, `background=false`, no tools, no conversation, no `previous_response_id`, `reasoning.effort=high`, `reasoning.context=current_turn`, and strict role-bound JSON Schema output;
- the five A/B/adjudicator prompt and schema contracts receive new V5 hashes;
- provider authorization, attempt, logical-request, wire-evidence, route-preflight, and role-output schemas receive explicit V5/V2 interfaces; and
- provider-named chronology and blindness rules now refer to the OpenAI reference panel.

The sampling design, inclusion/exclusion criteria, homology clustering, 60-cluster allocation, taxonomy, P0/P1/P2 rules, adjudication triggers, statistical method, thresholds, and claim ceiling remain frozen to their V4 method semantics. Their V4 section hashes are listed under `composition.inheritedMethodSections`; any drift outside the enumerated provider-migration surface invalidates the composition.

## What this does not authorize

The owner's provider, endpoint, and residency selection is recorded as `DESIGN_SELECTION_ONLY_NOT_LIVE_EXECUTION_AUTHORIZATION`. It does not authorize credential access, question egress, a route probe, reference labeling, DeepSeek evaluation, or provider spend. No current authorization hash, frame hash, sample hash, route-preflight receipt, credential-readiness receipt, price snapshot, label seal, or execution registration exists in this package.

Before any OpenAI request, all of the following still must exist and validate:

1. A11 concurrence on the exact V5 registration and an active-pointer update.
2. A21 runner migration from `label-qwen` to `label-openai`, including an OpenAI Responses adapter and updated receipt enforcement.
3. A clean runtime source binding, rights/privacy evidence, frozen California frame, and frozen 60-cluster manifest.
4. A separate, hash-bound OpenAI route-preflight authorization and non-natural-text preflight receipt proving the selected project/route/model combination is available.
5. A19 credential-readiness receipt that records only redacted `present/missing` status.
6. A current route-specific price snapshot and worst-case cost calculation with the registered 20% buffer.
7. A current, expiring OpenAI reference authorization bound to all registration, frame, sample, prompt, schema, runner, adapter, egress, token, attempt, and USD roots.

DeepSeek remains the evaluated provider. Its independent authorization and direct-route evidence remain separate and non-transferable.

## Official capability evidence boundary

V5 records official OpenAI documentation URLs for three narrow capability assertions: the `gpt-5.6-luna` model ID supports the Responses API and Structured Outputs; the Responses API accepts the registered reasoning fields; and OpenAI documents a US storage-and-processing route prefix. These documentation references do not prove owner-project entitlement, current availability, actual routing, billing, current price, or authorization. Those facts remain later-bound to provider/console evidence and receipts.

## Decision boundary

The pilot remains machine-reference evidence, not human gold. A, B, and the adjudicator all use the same GPT-5.6 Luna model, so correlated model error remains possible and agreement cannot establish human validity.

The decision ceiling remains exactly `INCONCLUSIVE_MACHINE_REFERENCE`. CA60 cannot simultaneously supply the minimum 25 positive and 52 negative opportunities required by the frozen surface confidence gates because `25 + 52 = 77 > 60`. The package must not output `PASS`, `APPROVED`, `PRODUCTION_READY`, or `LIMITED_GENERALIZATION_EVIDENCE`. Thresholds cannot be lowered after labels or results.

## Tracked artifacts

- `design-contract.mjs` deterministically composes the full V5 registration from the immutable V4 method package plus explicit provider overrides.
- `design-registration.json` is the sealed V5 candidate with a self-verifying RFC 8785/JCS-style SHA-256 registration hash.
- `predecessor-package-inventory-v4.json` records the exact immutable V4 package and its `SUPERSEDED_NOT_EXECUTED` disposition.
- `statistical-power.json` binds the structural-impossibility and minimum-precision judgment to the V5 registration hash.
- `schemas/` contains nine closed root schemas for V5 registration, power, predecessor inventory, provider authorization/attempt/request/wire evidence, OpenAI route preflight, and OpenAI role output.
- `validate-design-registration.mjs` performs read-only, zero-network, zero-credential, zero-question validation and fails closed on drift.
- `PRE-EXECUTION-ERRATUM.md` records the additive provider supersession without rewriting prior artifacts.

## Offline verification

From the repository root:

```sh
node --test coordination/research/mais-natural-ca60-v1/versions/design-v5/*.test.mjs
node coordination/research/mais-natural-ca60-v1/versions/design-v5/validate-design-registration.mjs
node coordination/research/mais-natural-ca60-v1/versions/design-v5/validate-design-registration.mjs --json
```

`--require-active` is intentionally expected to fail until the independent-review and active-pointer gates are completed.
