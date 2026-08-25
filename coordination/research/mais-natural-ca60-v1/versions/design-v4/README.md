# MAIS Natural CA60 Design V4

`MAIS-NATURAL-CA60-V4` is a pre-execution registration candidate for the California 60-cluster machine-reference pilot. Its lifecycle is `DRAFT_OWNER_DECISIONS_PENDING`, `freezeAllowed=false`, and it has no authoritative `frozenAt`, `registrationHash`, section-root set, or schema-root set. The mutable ACTIVE pointer remains on V3. V4 only proposes to supersede V3 after the owner freezes an exact Qwen endpoint and data region, every derived root is recomputed, frozen-candidate validation succeeds, and an independent review concurs. V1, V2, and V3 bytes remain unchanged.

V4 records the exact 45-file V3 package inventory in `predecessor-package-inventory-v3.json`. Its inventory root is `0aa952f44ee0558b0b5054b04bb669951e63e7c63a74a5a68881e70a3a5da471`, and the V3 registration byte SHA-256 is `3299e95244540942ad82f6a616ace4d64be3a74ff1ba78172aeb6a34088f7939`.

## Current evidence boundary

This tracked package contains design, statistical-power, schema, and offline-validation evidence only. It records:

- no frame freeze;
- no sample freeze;
- no current provider authorization;
- no provider call;
- no machine-reference label;
- no natural-question result;
- no independent review receipt.

`providerEventCount=0` and `firstProviderExecutionAllowed=false`. Authorization wording in the candidate is a template only: every template has `isCurrentAuthorization=false` and grants no execution. `QWEN_ENDPOINT_AND_DATA_REGION_OWNER_DECISION_PENDING` is an active blocker.

Publication authorization is separately `BLOCKED_PENDING_A21_PROTECTED_CUSTODY_REGISTRY`, with blocker `EXECUTION_CUSTODY_REGISTRY_NOT_IMPLEMENTED`. This is an execution/publication blocker, not an additional design-freeze blocker: the only current design-freeze decision code remains the Qwen endpoint/data-region owner decision. Until an A21 runner creates an out-of-band protected custody registry and exact-pins every registered execution, final, and review head, the review gate is a consistency validator only and is not publication authorization. Caller-supplied custody roots are never trusted, and aggregate export remains unavailable fail closed.

The implementation baseline is separate from the runtime source. A clean, exact runtime source commit, runtime configuration, transitive source-module manifest, three-route parity receipt, rights table, asset ledger, fine-lineage approval, frame, and sample must all be bound later. The current dirty integration root is not eligible for frame freeze.

DeepSeek direct billing and data region are `UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE`. Full DeepSeek authorization must remain blocked until a separately authorized, static, non-natural-text route probe supplies the required evidence. The probe consumes DeepSeek attempts, tokens, and USD caps. No price is hard-coded.

## Proposed freeze chronology

If the owner route decision is supplied and V4 is validly sealed, the proposed order is:

1. Owner decision on the exact Qwen endpoint and data region.
2. Recomputed and independently reviewed Design V4 freeze.
3. Later-bound clean runtime source.
4. Frame and sample.
5. Qwen authorization.
6. Nonzero Qwen reference attempt history.
7. Reference-label seal.
8. Separate DeepSeek route-probe authorization and receipt.
9. Full DeepSeek authorization bound to the route probe, reference seal, and Qwen attempt chain.
10. Execution registration.
11. First DeepSeek natural-item attempt.
12. Completed execution evidence is exact-pinned by the A21 protected custody registry and its trusted runner evidence.
13. A11 independent review and A18 claim-boundary review bind that exact registry state.
14. Aggregate publication authorization becomes eligible for a separate implementation review; review consistency alone never authorizes export.

An execution registration therefore cannot truthfully claim zero provider history: Qwen reference attempts and the DeepSeek route probe necessarily precede it. It must, however, record zero DeepSeek natural-item attempts before registration.

## Decision and claim boundaries

The overall decision ceiling is `INCONCLUSIVE_MACHINE_REFERENCE`. The substantive claim-scope ceiling is `CALIFORNIA_RUNTIME_EGRESS_ELIGIBLE_MACHINE_REFERENCE_PILOT_ONLY`. These are different fields and must not be conflated.

The proposed reference source remains a same-model Qwen machine panel with `labelSourceType=machine_reference_panel`, not human gold or expert consensus. Same-model correlated error is an explicit limitation. The precommitted 17-code taxonomy retains `FALSE_ACCEPT_CORRECT_RESPONSE` as a metric-eligible P0. The package cannot output `PASS`, `APPROVED`, `PRODUCTION_READY`, or `LIMITED_GENERALIZATION_EVIDENCE`.

CA60 remains structurally unable to satisfy the precommitted sensitivity and specificity confidence gates simultaneously: perfect sensitivity needs at least 25 positive opportunities and perfect specificity needs at least 52 negative opportunities, totaling 77 items. The threshold subsection is timestamped and hashed as candidate content, but the registration as a whole is not frozen. A future valid freeze must preserve these thresholds; they cannot be lowered after labels or results.

## Persisted artifacts and storage

The 45-file standalone schema inventory has an exact filename/title/`$id`/root-`schemaVersion` mapping. A separate machine-readable emitted-artifact map is derived from a mechanical scan of all production `schemaVersion` literals and root JSON artifacts. Every persisted version resolves either to a standalone schema root or to an exact JSON Pointer inside a closed parent definition; unknown persisted artifact kinds fail closed. V4 covers predecessor and pre-execution state, runtime source leaves and receipts, dependency-closure/source-module evidence, runtime configuration, three-route parity, frame freeze/failures, rights, assets, clusters, lineage approval, C0 selection, logical/wire requests, route probe, credential readiness, persistence proof, missing receipts, scorer ledgers, and review/public-report leaves.

For a pre-result sample replacement, the proposed authority-history root commits to the exact full append-order history as `SHA256(JCS(exact full replacementHistory array in append order))`; a projection over only selected authority fields is insufficient. Exact-next-rank proof still requires full-frame recomputation and is not inferred from the local manifest-chain check alone.

Future protected frame rows, item text, raw provider bytes, labels, authorizations, and receipts belong under `.local/mais-natural-ca60-v1/` with append-only, atomic, `0600`, file/directory fsync, redaction, and secret-sentinel proof. This package does not modify the application, public API, live question bank, deployment, Git history, or credentials.
