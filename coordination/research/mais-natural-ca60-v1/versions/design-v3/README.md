# MAIS Natural CA60 Design V3

`MAIS-NATURAL-CA60-V3` is an immutable, pre-execution research-design registration. It supersedes Design V2 append-only because adversarial review found gaps in cross-artifact reference sealing, full execution recomputation, runtime-frame/sample recomputation, and independent-review evidence. V2 remains immutable and is retained as `SUPERSEDED_NOT_EXECUTED`; no V1 or V2 byte was rewritten.

The frozen V3 registration root is `08e89a4d0c6736b48c1dde0048d8f620c35fc486e1d1feaf272e30a1aae4973d`. Its 23-schema canonical set root is `a9167ab56cff6afb6336cab2ed7c9d9bc8236a538935128ecfbb426fe7951120`, and the external statistical-power artifact self-hash is `4aa1761d345a94b90ed6168d509cdf5122f725145b6887d4d7f13b21e455549a`. See [PRE-EXECUTION-ERRATUM.md](./PRE-EXECUTION-ERRATUM.md) for the append-only V2→V3 correction record.

This package is design evidence only. No provider call, live California natural-question evaluation, authorization grant, frame freeze, sample freeze, reference labeling, DeepSeek result, or independent review has occurred. The lifecycle remains `AUTHORIZATION_BLOCKED`, and `firstProviderExecutionAllowed` is false.

## Claim boundary

The reference source is `machine_reference_panel`: isolated Qwen A/B roles plus conditional one-shot adjudication. It is not human gold, expert consensus, or an independent human review. Same-model correlated error remains a material validity limitation. A11 means independent code-path recomputation; A18 means taxonomy/method/claim-boundary review only.

The CA60 engine cannot output `PASS`, `APPROVED`, `PRODUCTION_READY`, or `LIMITED_GENERALIZATION_EVIDENCE`. Its successful integrity-preserving ceiling is `INCONCLUSIVE_MACHINE_REFERENCE`. A clear observed P0 false negative or a confidence interval decisively beyond the wrong side can yield `POLICY_REVISION_REQUIRED_MACHINE_REFERENCE`; protocol or execution breakage takes the higher-priority invalid/integrity statuses.

`FALSE_ACCEPT_CORRECT_RESPONSE` is retained exactly as the user's formal P0 taxonomy literal in V3. It belongs to `RESPONSE_ACCEPTANCE`, is metric-eligible, and has the singleton accepted-code set `["FALSE_ACCEPT_CORRECT_RESPONSE"]`. This V3 rule intentionally supersedes V2's pre-execution ambiguous-literal treatment.

## What V3 makes executable and fail-closed

- `SamplingFrameRowV2` and `SampleManifestV2` are the semantic execution schemas. Their V1 names remain available only for backward-compatible structural inspection; the V3 runner/verifier must reject them as execution substitutes.
- `RuntimeSourceEnumerationReceiptV1`, embedded in `RuntimeExtractionSnapshotV1`, binds the exact clean source/config tuple, extractor implementation and runner roots, raw protected-evidence root, all 13 K–12 projection invocation leaves, full inventory root, exclusions, serialization failures, and accounting equations. This is an evidence contract for a future extractor run; the design package does not self-prove source completeness and contains no runtime inventory.
- `validateSampleAgainstFrame` recomputes the source-enumeration and runtime-extraction roots, exact/template/near/source edges, connected components, blockers, stratum capacities, iterative Hamilton allocation, representative ranks, selection roots, tuple root, C0-12, freeze chronology, and any legal pre-result replacement. Sample and C0 selection use hash-bound RFC 8785/JCS array preimages with golden byte/digest vectors; artifact timestamps cannot reroll either selection.
- `validateReferenceLabelSealExecutionBundle` recomputes all A/B leaves, conditional deterministic agreement merges or single adjudication calls, actual item hashes, Qwen authorization/attempt chains, the 240–300 successful-call graph, and global agreement statistics.
- `validateDeepSeekExecutionBundleV1` recomputes all 60 item leaves, B-prime and C0 request/output contracts, completed-item markers, the 120 + 5×|C0| graph, authorization, attempts, tokens, latency, and cost.
- `validateFinalEvaluationBundle` recomputes observed and counterfactual ledgers, one-to-one matching, exactly 11 metrics, Wilson/bootstrap/worst-case bounds, metric statuses, and decision precedence. Supplied counts or bounds are never trusted.
- `validateIndependentReviewReceiptV1` and `canExportAggregateReport` require full protected-leaf recomputation, exact active roots, verifier source/dependency/import evidence, A11 `CONCURRED`, and A18 `NO_OBJECTION`; structural schema validation alone is insufficient.

The sample golden vector no longer uses an all-zero value that could be mistaken for an execution-time `designHash`. Its nonzero fixture hash `4b2c011701d713fd41162dbaaa452e5d8ed35ce3439e53db3a702f7ab9c2e7b8` is derived from an explicit `NON_EXECUTION_GOLDEN_VECTOR_INPUT` semantic object. In real frame/sample execution, `designHash` is always this registration's frozen `registrationHash`; the fixture is never a sampling seed and cannot authorize rerolling.

A11 concurrence also requires a distinct post-execution 13-grade source-enumeration rerun against the same frozen source/config/extractor tuple. The rerun must reproduce every grade invocation and aggregate inventory root while carrying a different raw-evidence root and receipt hash; chronology is `finalFinishedAt < rerun.enumeratedAt < A11.reviewedAt`. A copied primary receipt, a missing rerun, or a hash-only caller assertion fails closed and blocks export.

## Missingness and integrity

There is one unified nonresolved item universe:

`missingReceiptItemCount + unresolvedReferenceItemCount + invalidItemCount <= 3`

and `completeReceiptItemCount + missingReceiptItemCount = 60`. The categories may not double-count an item. Thus 57 complete + 3 missing + 0 unresolved + 0 invalid is integrity-valid; 57 complete + 3 missing + 1 unresolved is integrity-failed; and 59 complete + 1 missing + 2 unresolved is integrity-valid. Missing or unresolved items remain in adversarial endpoint denominators and never fabricate an observed P0 false negative.

For surface metrics, V3 enumerates exactly `2^r × 4^m` feasible worlds: the observed machine prediction is held fixed for each complete unresolved/invalid item, while a missing-receipt item has neither a trusted machine nor reference state. With `r + m <= 3`, there are at most 64 worlds, and each world receives its own one-sided 95% Wilson bound. Finding endpoints use the finite 17-code universe (P1 7, P2 4); exhaustive count tests for every `u=0..3` prove the frozen monotone closed form is equivalent to the finite adverse-addition universe.

If the unified nonresolved count exceeds three, V3 does not attempt an unregistered larger counterfactual universe. It emits an empty surface-world set, conservative no-decision bounds `[0,1]`, and derives `EXECUTION_INTEGRITY_FAILED` by precedence; this path is explicitly tested not to throw or exhaustively expand beyond the registered limit.

## Statistical ceiling

With perfect observed performance, the one-sided 95% Wilson sensitivity gate needs at least 25 reference-positive items and the specificity gate needs at least 52 reference-negative items: 77 in total, exceeding CA60. At `n=60, p≈0.50`, the two-sided 95% interval half-width is about 12 percentage points. Roughly 59 independent observed P0-positive opportunities are needed to put a zero-miss one-sided upper bound below 5%; approximately 400 independent clusters are initial planning scale for ±5 percentage-point worst-case precision. Thresholds may not be lowered after labels or results.

## Storage and execution boundary

Tracked design, schemas, validators, and offline tests live here. Any future protected frame, item text, raw provider output, label leaves, authorization, and receipts belong under `.local/mais-natural-ca60-v1/` with append-only, atomic, `0600` handling. This package does not alter the application, public API, live question bank, deployment, or credentials.
