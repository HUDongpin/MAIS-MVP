# MAIS-NATURAL-CA60-V5-R4 fresh A11 independent offline runner review

## Decision

`DISCREPANCY`

V5-R4 materially improves the immutable V5-R3 runner, but it is not safe to use as the execution-runner registration for a first provider request. Four critical trust-boundary failures permit provider dispatch outside the frozen reference-seal, C0-selection, or adjudication state. Seven additional high/medium findings leave authorization evidence, inventory identity, budget preview, decision integrity, recovery, workflow continuity, schema semantics, and one frozen agreement statistic incomplete.

This result does not change the frozen California frame/sample, rights/privacy screens, taxonomy, thresholds, P0/P1/P2 rules, statistical-power result, or `INCONCLUSIVE_MACHINE_REFERENCE` decision ceiling. It blocks provider activation. It does not authorize credential access, natural-question egress, a provider call, tokens, attempts, or USD spend.

## Exact reviewed evidence

- Registration commit: `6ded6504318c044ddec4b262bb053143a2aec802`
- Direct-parent runner source commit: `63fc224c0b67d6b26e5713938f33ccda6fe998b1`
- Registration self-hash: `2dd4b0e17d577f085aee33f9ada3a2de0f7db79b02b32524e9d6a05858a61dc6`
- Production source root: `23c631f7ebd1364bc3caec2f324f69fbf32bf8cd4e6ca31216c01661559a8565`
- Test source root: `3d84e6b961db20a216791a12c2c13323addc68e2d0a9dd5527f627599aab9233`
- Superseded V5-R3 registration: `1dd8514b93638db806942bb85b04d975f17ce0f3b19fb77bc88ca81101ac0911`
- Bound V5-R3 A11 discrepancy receipt: `2b8307b6547762499795952a2d4251cca033d70c6868586eb41bbc1409859faa` at commit `1bada03e41f140233fd49c2f7ebdbabf77c1dce0`
- Fresh V5-R4 A11 receipt: `32a59ad2dd12a80cf772acb1be1110683f5b56d718c66681426eef0c739e6abc`

The independent verifier uses Node built-ins and Git object bytes only. It does not import the A07 registration builder, canonicalizer, authorization guard, runner, scorer, or decision engine. It independently verified all 23 registration/source/binding checks with zero mismatches, including the exact 72-file production manifest, 5-file registered test manifest, direct-parent relation, source roots, all frozen design section hashes, frame/sample/C0/rights/privacy/taxonomy/labeling/analysis bindings, supersession chain, provider component hashes, requested provider tuples, and zero-authority state.

The tuple evidence proved here is limited to the frozen requested contracts:

- `OPENAI_DIRECT / gpt-5.6-luna / https://us.api.openai.com/v1/responses / US_STORAGE_PROCESSING`
- `DEEPSEEK_DIRECT / deepseek-v4-pro / https://api.deepseek.com/chat/completions / UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE`

It is not live provider, entitlement, account, billing, price, region, model-availability, or route proof.

## Test evidence

- Exact registered V5-R4 offline suite: `25/25` passed; `0` failed, cancelled, skipped, or todo.
- The registration artifact test exists outside the registered 5-file test manifest: `3/3` passed.
- Fresh A11 adversarial boundary tests: `4/4` passed. These are reproduction tests: they prove that forbidden or under-bound states are currently accepted, so their green status supports the discrepancies rather than concurrence.
- Independent Git-object verifier: `23/23` checks verified; `0` mismatches.

All tests used synthetic/local fixtures only. No credential, provider, internet, or protected natural-question input was used.

## Severity-ranked actionable findings

### Critical

#### `A11-R4-001` — DeepSeek B′ dispatch is not cryptographically gated by the actual sealed reference chain and `DeepSeekExecutionRegistrationV2`

The implementation contains a strong full reconstruction function, but the core request/permit/transport boundary never receives or validates the resulting execution registration. `buildProviderRequestArtifactV5R4` accepts a DeepSeek authorization plus a protected item and can construct `B_PRIME_CRITIQUE` directly; `runGuardedProviderAttemptV5R4` then validates only the general authorization/request artifacts before reserving and dispatching. The authorization guard requires only syntactically valid 64-hex reference hashes. The public planner also schedules the canary B′ roles without calling `validateDeepSeekExecutionRegistrationV5R4`.

This means a self-consistent authorization carrying fabricated reference hashes can reach the first DeepSeek dispatch without supplying the actual `MachineReferenceSealV3`, OpenAI attempt chain, seal-validation receipt, or fully rebuilt execution registration. The A11 adversarial test constructs a valid B′ request under exactly that state.

Evidence: `provider-request-v5-r4.mjs:294-333`; `guarded-provider-attempt-v5-r4.mjs:285-304`; `execution-state-v5-r4.mjs:103-124`; `route-authorization-v5-r4.mjs:193-198`; the unused full validator at `deepseek-execution-control-v5-r4.mjs:100-109`.

Required remediation: make the guarded request/permit/transport API require the exact, fully reconstructed `DeepSeekExecutionRegistrationV2`; rebuild its actual reference seal, OpenAI ledger, validation receipt, authorization, inventory, and chronology before the first DeepSeek reservation; bind the execution-registration hash into request, reservation, permit, event receipt, output, and scoring lineage.

#### `A11-R4-002` — DeepSeek C0 dispatch is not gated by the frozen selected-item set, and the trigger kernel drifts from the registered predicate contract

Every C0 role has an empty prior list in the core request builder. Consequently, a caller can directly construct and dispatch `C0_PRIME_ROLE_1` through `C0_PRIME_ROLE_5` for any inventory item, including an item outside the frozen random/mandatory union. The A11 adversarial test constructs a C0 request for fixture item 60 even though that item is not in the fixture's registered random set and no `DeepSeekC0ExecutionSetV2` exists.

The public resume planner is also insufficient as a security boundary: it accepts any schema-valid, self-hashed C0 set and uses its `selectedItemHashes` without invoking `validateDeepSeekC0ExecutionSetV5R4`. Scoring rebuilds the intended set only later and does not reject extra successful C0 calls outside that set. It also hardcodes `unauthorizedProviderCall=false`.

Separately, the registered kernel advertises a new source-input list rather than the frozen fields `localDeterministicEvidence`, `bPrimeCritique`, `bPrimeRevision`, and `validatedScope`. The implemented predicate derivation does not represent an explicit closed local-deterministic/validated-scope artifact with the frozen missing-or-malformed-to-trigger rule. This is a pre-execution method drift, not permission to alter the frozen design.

Evidence: `provider-request-v5-r4.mjs:42-50,294-333`; `execution-state-v5-r4.mjs:136-143`; `deepseek-execution-control-v5-r4.mjs:151-165,218-280`; `method-kernel-v5-r4.mjs:17-24`; frozen contract at `design-registration.json:1434-1465`; scorer flags at `scorer-v5-r4.mjs:349-375`.

Required remediation: require and fully rebuild the exact C0 execution set at the core guarded transport boundary; enforce item membership and trigger-input hash before any C0 reservation; reject all extra C0 attempts in the complete call graph; implement the frozen four-input predicate contract and unknown/malformed disposition exactly; bind the C0 set/decision hashes into every request and receipt.

#### `A11-R4-003` — `ADJUDICATOR` can be directly dispatched when the recomputed A/B trigger says no adjudication

The planner correctly avoids adjudication for exact agreement and later reference sealing would reject an extra successful adjudicator output. Those are downstream checks, not a dispatch guard. The core OpenAI request builder requires the four A/B prior outputs but never requires or reconstructs `OpenAIAdjudicationTriggerReceiptV1`. Once those four outputs exist, a caller can construct and send an adjudicator request even when the A/B labels exactly agree and `adjudicationRequired=false`.

The prohibited provider attempt has already occurred by the time later sealing rejects an extra success. A failed unnecessary attempt can remain in the ledger and still satisfy the seal's successful-output graph.

Evidence: `provider-request-v5-r4.mjs:35-41,232-258,294-333`; planner-only avoidance at `execution-state-v5-r4.mjs:77-96`; trigger reconstruction at `reference-label-seal-v5-r4.mjs:112-133`; core dispatch at `guarded-provider-attempt-v5-r4.mjs:285-304`.

Required remediation: require the exact locally rebuilt adjudication-trigger receipt at request construction, permit creation, and transport; allow `ADJUDICATOR` only when that receipt binds the same A/B outputs and says `adjudicationRequired=true`; reject any unnecessary reservation, failed attempt, or success as a material deviation.

#### `A11-R4-004` — Route, project, direct-billing, data-region, attempt, and price evidence remain caller-authored `CONFIRMED` assertions

`RouteEvidenceBundleV1` contains self-hashed leaves with `sourceLocatorHash` and `sourceBytesHash`, but validation never receives or recomputes the referenced raw console/account, billing, data-region, official-document, price, or route-attempt evidence. `sourceAttemptReceiptHash` may be `null`. A caller can therefore seal arbitrary hashes with `status=CONFIRMED`, copy internally consistent tuple fields, and pass authorization. The registered fixture does exactly this for account and billing leaves; the fresh A11 adversarial test confirms that the complete authorization validator accepts it without any source bytes.

The route-probe attempt is also a self-hashed claimed response rather than a receipt rebuilt from guarded raw request/response evidence. There is no public CLI route-probe command that produces the full authenticated chain. For DeepSeek, `UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE` is treated as the expected authorizable residency rather than a blocking unresolved state.

Evidence: `route-authorization-v5-r4.mjs:35-40,70-103,147-199`; `ProviderRouteEvidenceLeafV1.schema.json:2-4`; `ProviderPriceSnapshotV2.schema.json:2-6`; fixture construction at `runner-v5-r4-test-fixtures.mjs:225-258`; CLI command set at `runner-v5-r4-cli.mjs:7-11`.

Required remediation: persist and independently re-hash the exact permitted raw evidence bytes; rebuild route-attempt evidence from guarded request/response receipts; authenticate the owner/account/project and direct-billing source; bind the OpenAI project header identity; require a resolved DeepSeek data-region decision; and reject route authorization unless each evidence source and price rate can be independently reconstructed.

### High

#### `A11-R4-005` — Runtime inventory validation does not reconstruct the frozen manifest, C0 audit, or screen leaves

The inventory builder consumes the right upstream artifacts. The validator used at runtime does not. It receives only registration plus inventory and recomputes roots over item hashes and screen hashes. Those roots omit stratum, both analysis weights, inclusion probability, and `registeredRandomAudit`; the validator checks only that exactly 12 booleans are true. A self-sealed inventory can move the 12 random C0 selections and alter weights/strata/probabilities while retaining all registered roots. The A11 adversarial test demonstrates acceptance of exactly that mutation.

Evidence: correct builder at `execution-evidence-v5-r4.mjs:151-211`; insufficient runtime validator at `execution-evidence-v5-r4.mjs:214-234`; runtime trust at `runner-v5-r4-runtime.mjs:216-223`.

Required remediation: validate inventory only by rebuilding it from the actual protected sample manifest, registered C0 audit, and exact rights/privacy screen leaves; compare every ordered row field and the complete self-hash; remove the shallow validator from trust boundaries.

#### `A11-R4-006` — The 20% worst-case cost preview and rate snapshot are not independently derived

Authorization checks only that the caller-provided buffered value equals `worstCaseCostPreviewUsd × 1.2` and is below the cap. It does not derive the preview from the maximum role call graph, frozen per-request token reservations, and authenticated current rate snapshot. `ProviderPriceSnapshotV2` permits zero rates, and its source bytes are not authenticated under `A11-R4-004`. A zero or understated preview/rate can therefore satisfy the owner preflight gate even though the per-request ledger later enforces a different practical cost boundary.

Evidence: `route-authorization-v5-r4.mjs:188-191,202-215`; `ProviderPriceSnapshotV2.schema.json:2-6`; frozen 20% gate at `design-registration.json:1803-1811,1849-1855`.

Required remediation: independently derive provider-specific worst-case calls, input/output reservations, and USD from the authenticated snapshot; require positive applicable rates or an explicit independently verified zero-price entitlement; bind the computed preview into the owner grant and authorization.

#### `A11-R4-007` — Aggregate decision integrity and deviation flags are hardcoded rather than reconstructed from the complete attempt graph

The scorer sets `receiptChainValid=true`, `capsValid=true`, `terminalProviderFailure=false`, `materialDeviation=false`, `postResultDesignDrift=false`, and `unauthorizedProviderCall=false`. Some upstream validators reduce risk, but these values are not derived from an explicit complete expected call graph, authorization chronology, all failed/active attempts, canary chronology, or registration drift. In particular, extra successful C0 calls outside the rebuilt selection set can remain in the ledger and request-artifact set while item reduction ignores them; the final decision still claims no unauthorized call.

Evidence: `scorer-v5-r4.mjs:318-375`; expected full-call recomputation at `design-registration.json:1998-2005`; decision precedence at `design-registration.json:1180-1224`.

Required remediation: derive every integrity/deviation flag from raw immutable evidence; require the complete exact successful-call graph with no extras; represent active/terminal failures and canary/order violations explicitly; fail to `INVALID_FOR_GENERALIZATION` or `EXECUTION_INTEGRITY_FAILED` under the frozen precedence.

#### `A11-R4-008` — A crash after reservation or a stale ledger lock has no authenticated recovery transition

The ledger correctly persists a reservation before transport, but a process crash before completion leaves an active reservation. The planner then returns `ACTIVE_ATTEMPT_PENDING` indefinitely. A stale `.ledger.lock` likewise blocks verification, yet the public ledger API exposes only `reserve`, `complete`, and `verify`; there is no lease, expiry, owner identity, recovery receipt, or fail-closed reconciliation command. This contradicts the required resume behavior for unfinished roles.

Evidence: reservation-before-send at `guarded-provider-attempt-v5-r4.mjs:292-304`; active-state planner at `execution-state-v5-r4.mjs:58-64`; stale lock handling and API at `atomic-execution-ledger-v5-r4.mjs:169-200,293-300`.

Required remediation: add a separately registered, append-only recovery state machine that distinguishes never-dispatched, uncertain-after-dispatch, and completed attempts; bind lock ownership/lease evidence; consume attempts conservatively; resume only after an authenticated recovery receipt.

#### `A11-R4-009` — The public CLI cannot carry derived artifacts into the next workflow state

Runtime commands persist reference seals, seal validations, C0 sets, canary gates, aggregate scores, markers, and final verification receipts under content-addressed paths. They do not update or supersede the loaded `ProtectedWorkflowIndexV1` or its in-memory artifact map. A later CLI invocation reloads the old immutable index and cannot see the artifact just produced. The main CLI prints only the command receipt, discarding the detailed returned artifact hash/path, and there is no public command to append/supersede the workflow index. A normal C0-set or canary transition can therefore repeat or stall without manual, unregistered intervention.

Evidence: immutable map load at `runner-v5-r4-runtime.mjs:109-133`; derived persistence at `runner-v5-r4-runtime.mjs:172-181,266-280,321-337,388-409`; CLI output suppression at `runner-v5-r4-cli.mjs:93-107`.

Required remediation: implement an append-only workflow-index supersession/commit protocol, print and bind the new index hash/path in the command receipt, and prove across-process resume from each derived state with fixture tests.

### Medium

#### `A11-R4-010` — Conditional JSON Schema cardinality is silently ignored by the custom validator

The result-review and claim-review schemas use `allOf/if/then` branches whose nested `properties` set `maxItems` or `minItems` without repeating `type: array`. The custom validator applies array cardinality only when the current schema node itself has `type === "array"`. It therefore accepts both `CONCURRED` with nonempty discrepancy codes and `DISCREPANCY` with an empty list. The publication gate currently repeats the relevant semantic checks, which limits immediate export impact, but the advertised closed schema contract is false and other consumers can accept contradictory receipts.

Evidence: `schema-contract-v5-r4.mjs:103-163`; `IndependentExecutionResultReviewReceiptV1.schema.json:2-6`; `ClaimBoundaryReviewReceiptV2.schema.json:2-6`; A11 adversarial test.

Required remediation: implement annotation/applicator semantics correctly or use a standards-compliant JSON Schema 2020-12 validator; add negative tests for every conditional schema and keep the explicit publication checks as defense in depth.

#### `A11-R4-011` — Degenerate single-category Cohen's κ violates the frozen reporting rule

For a single observed category, `categoricalAgreement` obtains expected agreement of one and returns κ as `1`. The frozen denominator policy requires raw agreement and AC1 to be reported but κ to be `null` for this degenerate case. This is a registered statistical-method mismatch even though agreement statistics are descriptive rather than a performance gate.

Evidence: `reference-label-seal-v5-r4.mjs:173-196`; frozen rule at `design-registration.json:1066-1071`.

Required remediation: return `cohenKappa: null` when the paired raw-label category universe has fewer than two observed categories, retain raw agreement/AC1, and add the exact degenerate golden test before a new registration.

## Reassessment of the 13 V5-R3 findings

| V5-R3 finding | V5-R4 disposition | Current evidence |
| --- | --- | --- |
| `A11-R3-001` exact outbound bytes/blindness | Substantially addressed by protected-item reconstruction, exact field sets, immutable wire bytes, project header, and pre-credential rebuild. | No recurrence counted. |
| `A11-R3-002` atomic ledger cap semantics | Substantially addressed: item-role caps, active success capacity, and receipt-derived completion status are implemented. | Recovery remains `A11-R4-008`. |
| `A11-R3-003` caps/reservations | Partially addressed: provider maxima and conservative per-request reserves exist; owner worst-case preview remains caller-authored. | `A11-R4-006`. |
| `A11-R3-004` reference-seal/execution registration | Artifact reconstruction exists but is not enforced before core DeepSeek dispatch. | `A11-R4-001`. |
| `A11-R3-005` scoring inputs | Material reconstruction exists, but execution/deviation flags and exact no-extra-call graph remain hardcoded/incomplete. | `A11-R4-007`. |
| `A11-R3-006` frozen statistics | Main Wilson/bootstrap/missing-data kernel is restored; degenerate κ still drifts. | `A11-R4-011`. |
| `A11-R3-007` closed schemas/fresh A11 | Fresh A11 identity and top-level closure are enforced; conditional schema semantics remain broken. | `A11-R4-010`. |
| `A11-R3-008` inventory identity | Builder fixed; runtime validator still does not reconstruct manifest/C0/screens. | `A11-R4-005`. |
| `A11-R3-009` route evidence | Structured leaves exist, but raw evidence is not authenticated or independently rebuildable. | `A11-R4-004`, `A11-R4-006`. |
| `A11-R3-010` role/trigger lineage | Authoritative prior outputs improved; C0 and adjudication trigger state is not enforced at guarded dispatch. | `A11-R4-002`, `A11-R4-003`. |
| `A11-R3-011` attempt receipts/events | Substantially addressed: request/permit/timing/request-ID/usage/status and conservative post-dispatch failures are durable. | No recurrence counted. |
| `A11-R3-012` CLI/canary/verify/export | Full verification and publication block improved; core state bypasses and cross-process workflow continuation remain. | `A11-R4-001`–`003`, `A11-R4-009`. |
| `A11-R3-013` protected-root symlink escape | Static no-follow/inode/realpath defenses materially improve the prior defect. The implementation is not directory-handle/`openat` race-proof, but no deterministic additional finding was established in this offline review. | No separate actionable finding counted. |

## Required next state

All code-affecting findings require a new A07 runner source commit and a new append-only pre-first-provider superseding registration. V5-R4 must remain immutable and be marked discrepant; it must not be rewritten. Because the exact V5-R4 registration still records zero authority and zero provider events, the permissible transition is:

> `A07_OFFLINE_REMEDIATION_AND_MAIS_NATURAL_CA60_V5_R5_PRE_FIRST_PROVIDER_SUPERSEDING_REGISTRATION`

After that registration is frozen, a new fresh A11 review must independently recompute the new Git-object roots and rerun the offline/adversarial suite. Provider grants, credential checks, route probes, question egress, OpenAI labeling, DeepSeek canary execution, scoring, and publication all remain blocked until a later fresh review returns `CONCURRED` with zero findings and the owner separately creates the required live authorizations.

## Proved boundary

- Credential values/files, `.env`, and `All API Keys.docx` read: `0`
- OpenAI provider calls/events: `0`
- DeepSeek provider calls/events: `0`
- Network or internet requests: `0`
- Protected natural-question text read: `0`
- Natural questions egressed: `0`
- Reference labels or natural-question results created: `0`
- Tokens authorized or spent: `0`
- Attempts authorized or spent: `0`
- USD authorized or spent: `0`
- Live app, question bank, deployment, A07 worktree, or frozen V5-R4 artifact mutations: `0`

The proved state is exact-source offline review only. It is not `CA60_EXECUTED`; it cannot support `PASS`, `APPROVED`, `PRODUCTION_READY`, or `LIMITED_GENERALIZATION_EVIDENCE`.
