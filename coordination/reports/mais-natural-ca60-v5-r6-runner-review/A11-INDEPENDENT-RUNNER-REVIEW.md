# A11 independent offline runner review — MAIS-NATURAL-CA60-V5-R6

## Decision

`DISCREPANCY`

The immutable V5-R6 registration is internally authentic as a Git-object package, but the registered runner is not implementation-ready for a first provider request. A11 independently reproduced eleven actionable findings: four critical, six high, and one medium. The most consequential defects are that a normal successful DeepSeek path cannot materialize the frozen canary/C0 state or a complete frozen-metric score; the outer R6 DeepSeek dispatch guard accepts planner-bypassing caller-authored C0/gate objects; and `verify` accepts a fabricated self-hashed complete score without independently recomputing integrity or metrics.

This review does not authorize credential access, provider calls, natural-question egress, tokens, attempts, or USD. V5-R6 remains immutable and provider execution remains blocked. A new append-only pre-first-provider superseding registration is required after remediation and another fresh A11 review.

## Reviewed immutable identity

| Binding | Independently verified value |
| --- | --- |
| Registration commit | `bd96d0bab3c26364c0cf1655be684cac23c991a8` |
| Direct-parent runner source commit | `1cd532728567e346bb2ee07c3af700a9c8ac8d85` |
| Registration self-hash | `2e178ea6680974d358830a2b3f71e0ccbaa7827793b972bb2ae10fd2aaed994f` |
| Production source root | `4290a0ada241bef51af7682ddd2772d7643e5d59dc179f3f52bd0c9e3586363e` |
| Test source root | `3975d9da7d61ef54f21e1e36fa82c31e86fa78b9f05dd0e1f1c091e72d45ac75` |
| Transitive import-closure root | `affe8c375ccf44a8fbf1a6aef820ef771a8c19887c9158c8520e1c53ee606518` |
| V5-R5 registration superseded | `6c96a27da2ce36c69d4190db3b6a2fde59c430a250c85417ef2526b25da2bbce` |
| Bound V5-R5 A11 discrepancy receipt | `e25f8212ae0d150d5a690f4f13942922752730d606ab85ebb730a6c780854b39` |
| Owner offline-implementation authorization text hash | `8f9767f1bb087656d57ab7885f621ef449eff61ea89aaead8bd34bf27f30f74f` |

The independent verifier used Node built-ins plus immutable Git object bytes. It did not import the A07 registration builder, source-closure implementation, runner, authorization guard, scorer, or decision engine. It verified all 20 checks: the registration commit is an exact single-file add; its direct parent is exact; the registration self-hash is exact; all 142 production rows, 8 test rows, 15 entry points, 308 relative-import edges, and all three roots recompute exactly; current production bytes have zero drift; frozen design/frame/sample/rights/privacy/taxonomy/threshold/P0-P2/decision-ceiling bindings match V5-R5; and the registration records zero authority and activity.

The exact provider tuples are registered as:

- OpenAI reference: `OPENAI_DIRECT` / `gpt-5.6-luna` / `https://us.api.openai.com/v1/responses` / `US_STORAGE_PROCESSING` / `US`.
- DeepSeek evaluation: `DEEPSEEK_DIRECT` / `deepseek-v4-pro` / `https://api.deepseek.com/chat/completions`; residency remains `UNRESOLVED` in the immutable zero-authority registration and therefore is not live-dispatch eligible.

Git-object authenticity proves what bytes were registered; it does not prove that those bytes correctly implement the frozen protocol. The adversarial review below evaluates that separate boundary.

## Severity-ranked actionable findings

### Critical

#### `A11-R6-001` — Normal canary/C0 completion and complete frozen-metric scoring are unreachable

The runtime only imports and invokes the terminal missing-evidence C0 builders and the incomplete-execution scorer. It never constructs the normal exact four-input canary predicate, canary gate, successful-run C0 set, per-item results, one-to-one finding match, Wilson/bootstrap/worst-case bounds, or complete metric decision. During DeepSeek execution it merely reads optional `CANARY_C0_PREDICATE`, `CANARY_GATE`, and `DEEPSEEK_C0_EXECUTION_SET` artifacts; no registered CLI transition creates them. After the canary B-prime calls, planning therefore blocks for a missing predicate. After a hypothetical complete run, `score` still calls `materializeTerminalDeepSeekDecision`, supplies `null` critique and revision evidence for every item, defaults the terminal cause to `ATTEMPT_CAP_EXHAUSTED`, expects five C0 roles for all 60 items, and can emit only `INCOMPLETE_EXECUTION_NO_METRIC_INFERENCE`.

Evidence: `runner-v5-r6-runtime.mjs` lines 422-431 and 629-710; `scorer-v5-r6.mjs` lines 93-137. The A11 adversarial suite proves the absence of normal builders and the terminal-only scorer exports.

Required remediation: add a deterministic, state-bound normal path that derives the canary predicate and gate from successful B-prime evidence, freezes the exact registered random-plus-mandatory C0 set from the four registered inputs, completes all selected C0 roles, constructs item results, and independently derives every frozen metric, interval, endpoint state, and overall decision. Terminal failure codes must be derived from immutable attempt evidence, not supplied as a global default.

#### `A11-R6-002` — Outer R6 C0 dispatch bypasses the frozen execution/C0 authority

The outer guard validates the general activation tuple, then calls the low-level V5 compatibility kernel directly. That kernel's action selector consumes `canaryGate.state`, `c0ExecutionSet.selectedItemHashes`, and decision hashes without first running the V5 semantic state-bound validator. The outer audit records `input.c0ExecutionSet?.selfHash ?? null` and `input.canaryGate?.selfHash ?? null`, so a caller can provide plain, unvalidated objects and still obtain a valid closed `StateBoundDispatchAuditReceiptV2` for `C0_PRIME_ROLE_1` with both authority hashes `null`.

Evidence: `guarded-provider-attempt-v5-r6.mjs` lines 90-181. The A11 adversarial test completes all non-canary B-prime roles in a fixture ledger, supplies only `{state: "CANARY_INTEGRITY_CLEARED_NO_TUNING"}` and a plain selected-item/decision object, and successfully constructs the C0 dispatch audit.

The general activation guard does bind the R6 DeepSeek execution registration, reference seal, reference-attempt chain, authorization, route, inventory, and residency for B-prime requests. The actionable bypass is specifically that the core C0 dispatch boundary does not cryptographically and semantically validate the exact canary gate and `DeepSeekC0ExecutionSetV4` before producing an outer dispatch authority.

Required remediation: the outer planner and permit boundary must independently validate and rebuild the execution registration, canary predicate/gate, exact selected C0 set, selected-item membership, and decision receipt for every C0 request. Null semantic hashes must never authorize a C0 dispatch.

#### `A11-R6-003` — `verify` accepts fabricated complete aggregate results

`NaturalCaAggregateScoreReceiptV4` closes the outer object but defines `executionIntegrityEvidence` and `metricResults` only as generic objects. Its validator checks schema plus self-hash; it does not bind the embedded integrity object to `executionIntegrityEvidenceHash`, reconstruct item results, validate the attempt graph, recompute matching/metrics/intervals, or recompute the decision. Runtime `verify` merely invokes this validator and accepts the result.

The A11 adversarial suite built a self-hashed receipt with `analysisStatus = COMPLETE_FROZEN_METRIC_ANALYSIS`, `executionIntegrityEvidence = {fabricated:true}`, `metricResults = {fabricated:true}`, and an unrelated integrity hash. Production validation returned no errors.

Evidence: `schemas/NaturalCaAggregateScoreReceiptV4.schema.json`; `scorer-v5-r6.mjs` lines 136-138; `runner-v5-r6-runtime.mjs` lines 713-725.

Required remediation: close the nested schemas and implement a read-only verifier that reconstructs the attempt graph, raw/parsed outputs, C0 set, item results, one-to-one matching, metrics, intervals, endpoint statuses, and decision from sealed upstream artifacts. Validation must reject any mismatch between embedded objects, their hashes, and independently rebuilt results.

#### `A11-R6-004` — Route/account/billing/region/price/probe evidence is still caller-authored

V5-R6 now retains and hashes raw source text, which is useful custody. It does not parse those bytes to derive the account/project identity, direct-billing confirmation, data region, price rates, or route-probe result. Those claims remain separate caller inputs. `authenticatedSessionEvidenceHash`, `ownerAttestationReceiptHash`, `guardedProviderEventReceiptHash`, and `zeroNaturalContentRequestHash` are only checked for hash-shaped presence; their referenced evidence is neither supplied nor rebuilt. Consequently arbitrary JSON that contains only fixture names can be sealed as all five source kinds while the caller separately asserts direct billing, US region, subject identity, prices, and successful probe; production validation returns no errors and labels it `EXTERNALLY_ATTESTED_AND_REPLAYABLE`.

Evidence: `route-evidence-custody-v5-r6.mjs` lines 79-303. The registered fixtures themselves use arbitrary offline JSON bodies and random provenance hashes; the independent adversarial test proves those bodies contain none of the asserted billing, subject, or rate facts while the bundle validates.

Required remediation: define closed source-specific parsers and independently rebuild each claim from authenticated console/account, billing, region, official-rate, and guarded probe evidence. Validate the referenced session, owner-attestation, event, and zero-content request receipts—not only their hash syntax—and bind the derived tuple and rates into activation.

### High

#### `A11-R6-005` — Raw-response custody is not the authoritative reference-seal reconstruction and is not atomic with attempt completion

V5-R6 materially improves R5 by preserving full raw response bytes and a replay binding before compatibility-ledger completion. However, the reference-seal reconstruction accepts only the compatibility ledger and role outputs; it accepts no raw response artifacts or raw-binding receipts and performs no independent raw reparse, yet hardcodes `FULL_RAW_LEDGER_RECONSTRUCTION_VALID_AND_BOUND_TO_R6`. In addition, the compatibility ledger is completed before the resolved-attempt receipt is appended, leaving a crash/failure window in which an attempt is completed but the authoritative outer receipt is absent.

Evidence: `reference-execution-freeze-v5-r6.mjs` lines 70-155; `guarded-provider-attempt-v5-r6.mjs` lines 547-689. The adversarial suite verifies both structural facts.

Required remediation: make raw artifacts and binding receipts mandatory inputs to seal/review reconstruction, independently reparse every A/B/adjudicator output, and atomically journal raw body, binding, provider event, role output, completion, and resolved-attempt receipt so no completion can outlive missing outer evidence.

#### `A11-R6-006` — Post-provider failures can produce false zero-activity command receipts

If a provider attempt occurs and a later workflow/journal step fails, the runtime returns `blocked` with only the journal and omits the already observed counts. The CLI's catch boundary also unconditionally writes zero provider events, HTTP requests, credential reads, and egress. A machine-readable command receipt can therefore say `providerCommandInvoked: false` after real provider-side activity.

Evidence: `runner-v5-r6-runtime.mjs` lines 475-530; `runner-v5-r6-cli.mjs` lines 167-179. The A11 adversarial test simulates a provider event followed by persistence failure and obtains a zero-activity receipt.

Required remediation: activity counters and attempt identities must be captured in an outer durable journal before dispatch and recovered on every error path. Exceptions must never synthesize zero; unknown counts should fail closed as integrity-unknown while retaining all known activity.

#### `A11-R6-007` — The transition journal can erase an already durable transition

`runJournaledTransitionSequenceV5R6` runs a step—which may durably advance the workflow index—then persists its subreceipt, then appends that subreceipt to memory. If subreceipt persistence fails, the final journal sees zero entries and reports `FAILED_BEFORE_DURABLE_TRANSITION` with a null last index even though the workflow transition already committed.

Evidence: `transition-journal-v5-r6.mjs` lines 85-107. The A11 adversarial test records one durable transition, forces subreceipt persistence to fail, and observes a final committed count of zero.

Required remediation: use a write-ahead transition intent plus recoverable reconciliation, or atomically commit transition and subreceipt; on recovery, derive durable state from the protected workflow index rather than in-memory append order.

#### `A11-R6-008` — Fresh V5-R6 review adoption is not reachable from the public CLI

The versioned workflow-index builder can represent `FRESH_RUNNER_REVIEW_V5_R6`, which fixes the earlier unique-kind collision at the library level. The public `register` command nevertheless maps to `verifyFrozenUpstream`; it performs no workflow supersession/adoption transition and the CLI exposes no fresh-review argument. A newly created V4 receipt cannot be installed through the documented command surface.

Evidence: `runner-v5-r6-cli.mjs` lines 100-163. The adversarial test provides both a verification engine and an adoption engine; `register` invokes only verification and commits no transition.

Required remediation: implement an exact-hash, append-only `register`/adopt transition for the current fresh review, with V1-to-V2/V5-R4-to-V5-R6 migration tests and collision-safe supersession.

#### `A11-R6-009` — Attempt graph does not independently enforce dispatch-audit validity, canary, or order

The runtime projects completed calls by treating an audit as state-bound solely when its `schemaVersion` string matches; it does not validate/self-hash/rebuild the audit at scoring time. It then hardcodes `canaryOrOrderViolation: false`. The integrity scorer therefore cannot detect a planner-bypassing extra attempt, canary-order violation, or malformed audit from the sealed attempt graph.

Evidence: `runner-v5-r6-runtime.mjs` lines 175-191; `scorer-v5-r6.mjs` lines 26-85. The adversarial suite verifies the hard-coded projection.

Required remediation: reconstruct every reservation/completion/audit/permit/request/raw/event/output edge, derive manifest and role order, enforce canary-first/no-tuning, and mark every extra, duplicate, failed, unbound, or out-of-order attempt from evidence rather than caller booleans.

#### `A11-R6-010` — Cost preview is a self-hashed cap declaration, not an independent buffered cost computation

The activation guard accepts any self-hashed object whose cap fields equal the authorization. It does not require the registered cost-preview schema, a price-evidence binding, maximum per-role token arithmetic, worst-case successful-call composition, 20% buffer, currency, or a recomputed worst-case USD amount. The production fixture's accepted preview omits `worstCaseCostPreviewUsd`, `bufferMultiplier`, and `priceEvidenceHash` entirely.

Evidence: `activation-guard-v5-r6.mjs` lines 86-100; `runner-v5-r6-test-fixtures.mjs` in `buildResolvedActivationFixtureV5R6`. The A11 adversarial test confirms the minimal declaration passes activation.

Required remediation: validate a closed cost-preview receipt and independently recompute worst-case Qwen-replacement/OpenAI and DeepSeek calls, per-role token maxima, captured rates, 20% buffer, provider-specific caps, and fail-closed comparisons.

### Medium

#### `A11-R6-011` — The A07 V5-R6 source slice lacks the required session log and handoff

The exact diff from the integrated V5-R5 review commit `727e440a0897ae7b0caa4fff18853482a5af3b39` through source commit `1cd532728567e346bb2ee07c3af700a9c8ac8d85` adds the V5-R6 source, schemas, tests, and registration builder but no `coordination/session-logs/` entry. This violates the repository contract that every session declares its lane, branch/worktree ownership, target PR, expected closeout, checks, and handoff.

Required remediation: append an A07 session log/handoff for the immutable slice without rewriting V5-R6 evidence, and include the corresponding R7 source-session record before closeout.

## Reassessment of all nine V5-R5 findings

| V5-R5 finding | V5-R6 disposition | Current evidence |
| --- | --- | --- |
| `A11-R5-001` DeepSeek positive plan/request residency contradiction | Closed in the request/activation tuple path. | A route-resolved DeepSeek fixture reaches a positive request. This does not close C0 authority or normal-run reachability (`A11-R6-001`, `A11-R6-002`). |
| `A11-R5-002` terminal B-prime/C0/integrity decision unreachable | Partially closed, with a new critical regression. | A terminal incomplete decision is now constructible, but all missing evidence is globally defaulted and the normal successful path is absent (`A11-R6-001`). |
| `A11-R5-003` caller-authored route evidence | Recurs. | Raw bytes are retained, but claims are not derived from them and referenced provenance receipts are not rebuilt (`A11-R6-004`). |
| `A11-R5-004` legacy fresh-review kind collision | Library representation closed; CLI adoption still unreachable. | `FRESH_RUNNER_REVIEW_V5_R6` exists, but no public command installs it (`A11-R6-008`). |
| `A11-R5-005` active registration not pinned | Closed. | Independent Git-object verifier proves exact single-add path, commit, direct parent, self-hash, and loader binding. |
| `A11-R5-006` inherited execution-critical source omitted | Closed for registered inventory. | Independent traversal matches 142 production paths and 308 edges with zero current drift. |
| `A11-R5-007` raw provider response discarded | Partially closed. | Raw bytes are retained/reparsable, but are not authoritative seal inputs and completion is not atomic with the resolved receipt (`A11-R6-005`). |
| `A11-R5-008` multi-transition partial-failure custody | Recurs in two forms. | Journal/subreceipt ordering loses durable state and error paths can falsely report zero activity (`A11-R6-006`, `A11-R6-007`). |
| `A11-R5-009` extra failed calls omitted | Narrow extra-call logic improved; complete integrity reconstruction remains open. | Runtime hardcodes state/order conclusions and does not independently validate the full attempt graph (`A11-R6-009`). |

## Independent review axes

The two required review axes were performed independently and are presented separately. Consolidation maps duplicate underlying defects to one A11 finding ID; it does not hide or silently re-rank either axis.

### Standards axis

Decision: `DISCREPANCY`.

It reported six hard findings:

1. Critical — route provenance remains self-attested/unparsed (`A11-R6-004`).
2. Critical — successful execution has no normal scoring path (`A11-R6-001`).
3. High — raw custody is not atomic or seal-authoritative (`A11-R6-005`).
4. High — partial provider failures can yield false zero-activity receipts (`A11-R6-006`).
5. High — journal ordering can lose a durable transition (`A11-R6-007`).
6. High — attempt-order integrity is hardcoded rather than derived (`A11-R6-009`).

It separately identified the missing A07 session log/handoff, consolidated as `A11-R6-011`.

### Specification axis

Decision: `DISCREPANCY`.

It reported seven findings:

1. Critical — outer R6 C0 dispatch bypasses exact frozen state validation (`A11-R6-002`).
2. Critical — successful run cannot form the canary predicate/gate, normal C0 set, or complete score (`A11-R6-001`).
3. Critical — `verify` accepts a fabricated complete score (`A11-R6-003`).
4. High — route provenance remains caller-authored (`A11-R6-004`).
5. High — raw response custody is absent from reference-seal reconstruction (`A11-R6-005`).
6. High — public fresh-review adoption is unreachable (`A11-R6-008`).
7. High — terminal evidence is defaulted rather than derived from the actual failure (`A11-R6-001`).

The main A11 lane independently reproduced these issues and added the cost-preview regression (`A11-R6-010`) plus the repository-process finding (`A11-R6-011`).

## Offline verification results

| Check | Result |
| --- | --- |
| Independent Git-object verifier | `20/20` verified; `0` mismatch |
| Registered V5-R6 fixture suites | `24/24` passed; `0` failed/skipped/todo |
| A11 adversarial boundary suite | `11/11` passed; `0` failed/skipped/todo; each green test reproduces a discrepancy boundary |
| Production/test/closure counts | `142 / 8 / 308` |
| Production byte drift from reviewed source commit | `0` paths |
| Registration path mutation count | `1`, exact single add |

The registered fixture suite being green is not a concurrence signal: multiple registered fixtures encode caller-authored route claims and a minimal cost declaration, while the A11 suite tests the missing semantic boundaries directly.

## Proved zero-authority boundary

| Activity | Count |
| --- | ---: |
| Credential files or credential values read | 0 |
| `.env` / environment secret values read | 0 |
| `All API Keys.docx` read | 0 |
| Protected `.local` artifacts read | 0 |
| Protected natural-question bodies read | 0 |
| OpenAI calls | 0 |
| DeepSeek calls | 0 |
| Other network/provider requests | 0 |
| Natural questions egressed | 0 |
| Tokens authorized or spent | 0 |
| Attempts authorized or spent | 0 |
| USD authorized or spent | 0 |
| Live content/app/deployment mutations | 0 |

The final Git push of this evidence-only A11 branch is repository closeout, not a provider/network execution and carries no natural-question or credential material.

## Claim boundary and required next state

V5-R6 must not produce `PASS`, `APPROVED`, `PRODUCTION_READY`, or `LIMITED_GENERALIZATION_EVIDENCE`. It has executed no natural question and produced no natural-question result. Even a future valid CA60 run remains capped at `INCONCLUSIVE_MACHINE_REFERENCE` under the frozen structural-power and decision-ceiling rules.

All eleven findings affect either execution semantics, independently rebuildable evidence, or the mandatory session contract. A07 must preserve this V5-R6 registration and A11 receipt, remediate on a new source commit, freeze a new append-only pre-first-provider superseding registration, and request a fresh independent A11 review. No provider authorization or call may proceed on V5-R6.
