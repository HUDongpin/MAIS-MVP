# MAIS-NATURAL-CA60-V5-R5 fresh A11 independent offline runner review

## Decision

`DISCREPANCY`

V5-R5 materially closes most V5-R4 trust-boundary defects, but it is not implementation-ready for a first provider request. The fresh A11 review identified nine actionable findings: three critical, five high, and one medium. In particular, the DeepSeek planner can produce a valid next action while every authorization carrying the route-resolved residency required by the V5-R5 activation guard is rejected by the inherited V5-R4 request builder. The run also cannot convert an exhausted B-prime role into the frozen missing/malformed-to-`TRIGGER` C0 state and authoritative `EXECUTION_INTEGRITY_FAILED` decision.

This review does not change the frozen California frame/sample, rights/privacy screens, taxonomy, label/adjudication method, thresholds, P0/P1/P2 rules, statistical-power result, or `INCONCLUSIVE_MACHINE_REFERENCE` decision ceiling. It blocks activation. It does not authorize credential access, question egress, a provider call, tokens, attempts, or USD spend.

## Exact reviewed evidence

- Registration commit: `12d65e6d7bf3f4e7da2010b973df0d08fb3a3c4f`
- Direct-parent runner source commit: `440ee182e9841676495bc884ac4bf0eda7cf3985`
- Registration self-hash: `6c96a27da2ce36c69d4190db3b6a2fde59c430a250c85417ef2526b25da2bbce`
- Production source root: `ffe4c963bf30a7259dd6804d8ee5327e57e6f6a1d479ab0c83642f4141113ec5`
- Test source root: `a40436909a6779154f020f828a45ecfb0d9bd86e02bcee6f8ddffecd89268a72`
- Compatibility-base V5-R4 source commit: `63fc224c0b67d6b26e5713938f33ccda6fe998b1`
- Compatibility production root: `23c631f7ebd1364bc3caec2f324f69fbf32bf8cd4e6ca31216c01661559a8565`
- Compatibility test root: `3d84e6b961db20a216791a12c2c13323addc68e2d0a9dd5527f627599aab9233`
- Superseded V5-R4 registration: `2dd4b0e17d577f085aee33f9ada3a2de0f7db79b02b32524e9d6a05858a61dc6` at `6ded6504318c044ddec4b262bb053143a2aec802`
- Bound V5-R4 A11 discrepancy receipt: `32a59ad2dd12a80cf772acb1be1110683f5b56d718c66681426eef0c739e6abc` at `2bfd5ba703ecf1509a3ac47430fe6f06b80077f7`
- Owner offline-runner implementation authorization text hash: `8f9767f1bb087656d57ab7885f621ef449eff61ea89aaead8bd34bf27f30f74f`
- Fresh V5-R5 A11 receipt: `e25f8212ae0d150d5a690f4f13942922752730d606ab85ebb730a6c780854b39`

The independent verifier uses Node built-ins and immutable Git-object bytes only. It does not import the A07 registration builder, canonicalizer, authorization guard, runner, scorer, or decision engine. It independently passed 25/25 checks with zero mismatches: exact commit-parent relation, registration self-hash, all 41 R5 production rows and six R5 test rows, both source roots, all 72 compatibility production rows and five compatibility test rows, frozen design section hashes, frame/sample/C0/rights/privacy/taxonomy/labeling/analysis bindings, supersession and review roots, owner authorization text hash, component hashes, requested provider entrypoints, and zero-authority state.

The verifier traversed 232 relative-import edges from the registered R5 production modules. Every inherited edge was present in the compatibility manifest, and current bytes had zero compatibility drift and zero missing paths. That proves the exact reviewed Git objects; it does not cure the runtime omission in `A11-R5-006`, where the production loader itself never re-verifies those inherited manifests.

The requested tuple evidence proved here is limited to the frozen offline contracts:

- `OPENAI_DIRECT / gpt-5.6-luna / https://us.api.openai.com/v1/responses / US_STORAGE_PROCESSING`
- `DEEPSEEK_DIRECT / deepseek-v4-pro / https://api.deepseek.com/chat/completions / UNRESOLVED`

It is not provider availability, entitlement, account, direct-billing, price, project, data-region, residency, or live-route proof.

## Test evidence

- Exact registered V5-R5 suite plus registration artifact test: `23/23` passed; `0` failed, cancelled, skipped, or todo.
- Fresh A11 adversarial boundary suite: `9/9` passed. These are reproduction tests: each green test proves a discrepant state is accepted, unreachable, discarded, or under-bound; green does not mean concurrence.
- Independent Git-object verifier: `25/25` checks verified; `0` mismatches.
- Fresh `IndependentExecutionRunnerReviewReceiptV3`: independent self-hash matched; registered closed-schema validation returned zero errors.

All tests used synthetic/local fixtures and Git-object bytes only. No credential, environment-secret value, provider, internet, protected natural-question body, or protected `.local` artifact was used.

## Severity-ranked actionable findings

### Critical

#### `A11-R5-001` — DeepSeek positive planning cannot reach a route-resolved request

The new planner correctly returns `NEXT_ACTION` for the canary B-prime critique, but runtime delegates request construction to the inherited V5-R4 builder. That builder hard-codes DeepSeek residency as `UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE` and rejects any authorization with a different value (`provider-request-v5-r4.mjs:52-67,315-318`; runtime call at `runner-v5-r5-runtime.mjs:357-362`). V5-R5 route authorization and activation require a non-unknown, non-pending, non-unresolved DeepSeek residency and data region (`route-authorization-v5-r5.mjs:123-131`; `activation-guard-v5-r5.mjs:208-211`). The inherited `ProviderAuthorizationV4` schema also cannot represent an arbitrary resolved DeepSeek residency.

The A11 test proves both halves: the planner returns the first B-prime action; the legacy unresolved authorization can build a request; the same self-hashed authorization changed to a route-resolved value is rejected before transport. Therefore a valid V5-R5 DeepSeek authorization cannot reach the request/transport boundary.

Required remediation: add a V5-R6-native closed DeepSeek authorization and request contract that binds the exact authenticated route-evidence receipt, resolved residency/data region, execution registration, reference-seal lineage, C0 state, and exact endpoint/model. Remove the stale unresolved tuple from request construction. Prove the full positive canary path with an offline fixture through request bytes, dispatch audit, permit, event, completion, and workflow transition.

#### `A11-R5-002` — Exhausted or missing B-prime output cannot materialize C0 `TRIGGER` or an authoritative integrity decision

The frozen rule states that unknown, malformed, or missing C0 predicate evidence has disposition `TRIGGER`. The R5 predicate builder first requires both successful B-prime output identities, so `null` or absent output throws before it can create malformed evidence (`c0-trigger-v5-r5.mjs:45-53`). Runtime creates predicates only after all base roles succeed (`runner-v5-r5-runtime.mjs:276-303`), while the planner throws after two failed attempts (`state-bound-dispatch-v5-r5.mjs:59-65`). Scoring then unconditionally requires the full C0 set, canary predicate/gate, and per-item B-prime outputs (`runner-v5-r5-runtime.mjs:464-516`); any absence is caught as `SCORING_BLOCKED`, so the scorer's `EXECUTION_INTEGRITY_FAILED` derivation is unreachable (`runner-v5-r5-runtime.mjs:519-535`).

Required remediation: represent terminal missing/malformed B-prime evidence as an explicit, self-hashed, item-bound four-input predicate with `TRIGGER`; conservatively materialize the C0 selection set or a terminal selection receipt; let item reduction mark missing receipts; and always emit the registered final integrity decision even when provider/network/schema failures prevent a complete role graph.

#### `A11-R5-003` — Route, account, billing, region, price, and probe evidence remains caller-authored

`buildAuthenticatedRouteEvidenceV5R5` improves raw-byte custody inside the receipt, but its source bytes, source locator, source kind, subject identity, timestamps, and claims are all supplied by the caller (`route-authorization-v5-r5.mjs:47-79`). Validation re-hashes and re-parses those same caller bytes (`:82-107`) and then treats their assertions as external truth (`:110-164`). There is no authenticated import/capture receipt, provider or owner signature, console/account export binding, guarded route-probe receipt, or independently resolvable source locator. Evidence-kind/source-kind pairing is not enforced.

The A11 test submits five arbitrary JSON blobs, labels all five as `PROVIDER_CONSOLE_EXPORT`, and self-asserts project identity, direct billing, US storage/region, successful probe, and positive prices. The result validates with zero errors. Internal hash consistency is not source authenticity.

Required remediation: define protected evidence-capture receipts whose raw bytes are produced by an owner-controlled or provider-authenticated import path; bind account/project identity and billing export provenance; rebuild route-probe evidence from guarded request/response attempts; enforce evidence-kind/source-kind constraints; and make every rate/region/identity claim independently replayable from captured source bytes. Until then, route/account/billing/data-region/price status cannot be `CONFIRMED` for activation.

### High

#### `A11-R5-004` — Legacy `FRESH_RUNNER_REVIEW` cannot be replaced by the required V5-R5 review

V1-to-V2 adoption copies every legacy entry (`workflow-index-v5-r5.mjs:43-52`). The V2 builder then forbids duplicate kinds across the whole chain (`:65-67`). `adoptR5WorkflowIndex` appends only `ACTIVE_RUNNER_REGISTRATION`, while subsequent loading requires `FRESH_RUNNER_REVIEW` to validate against V5-R5. If the V1 index already contains the V5-R4 review under that allowed kind, appending the V5-R5 V3 review deterministically fails with `workflow artifact kinds must be unique across the supersession chain`.

Required remediation: implement explicit immutable supersede-by-kind/versioned-kind semantics, retain the legacy review as history, resolve the active review by an authenticated supersession pointer, and test the actual V1-with-V5-R4-review migration before any activation.

#### `A11-R5-005` — The production loader does not pin the exact active V5-R5 registration commit and self-hash

The loader fixes only the path. It resolves the registration commit dynamically as the latest commit touching that path (`execution-evidence-v5-r5.mjs:156-168,180-199`). Neither the exact registration commit `12d65e...` nor self-hash `6c96a2...` exists as an R5 constant in the loader. A later internally self-consistent edit at the same path can therefore become the accepted active registration rather than forcing a new versioned path and superseding registration.

Required remediation: pin the exact active registration commit and self-hash in an immutable activation kernel, require its direct parent and Git-object bytes, reject later path mutation, and use a new path/version for every superseding registration.

#### `A11-R5-006` — Runtime source verification omits the inherited execution-critical manifest

The R5 registration records a 41-row R5 delta manifest and two compatibility root strings. Execution-critical R5 modules import inherited R4 adapters, request construction, ledger, storage, schema, method, and design code. The loader verifies Git-object bytes only for the active R5 production/test manifests (`execution-evidence-v5-r5.mjs:171-202`); for the compatibility base it only compares the two root strings already present in the R4 registration (`:120-122`). It never independently reads the 72 inherited production rows or five inherited test rows from the fixed base commit.

The A11 verifier independently completed that missing step and found zero drift/missing paths for this exact review. Runtime activation should not depend on an external reviewer having done so once.

Required remediation: either place the complete transitive source closure in the new production manifest, or make the exact registration loader re-read and hash every compatibility row from the fixed base source commit, prove current execution bytes equal those hashes, and bind the combined closure root into activation and review receipts.

#### `A11-R5-007` — Complete raw provider response bytes are discarded after parsing

Transport reads the complete response, decodes it, and computes `responseBodyHash` (`guarded-provider-attempt-v5-r5.mjs:182-214`). The durable `ProviderEventReceiptV4` stores only the hash (`:274-290`), while `ProviderRoleOutputV1` stores only the parsed payload (`:292-303`). Runtime persists the event, completion, and parsed role output, but no raw response artifact (`runner-v5-r5-runtime.mjs:377-383`). Neither closed schema has a raw-byte custody pointer.

Consequently, a fresh independent verifier cannot replay the provider parser, verify the parsed payload against the exact response envelope, recover fields omitted by the parser, or rebind A/B/adjudicator raw outputs before reference sealing and scoring. A response hash without retained bytes is not replayable evidence.

Required remediation: atomically persist the complete raw response bytes in protected append-only storage before successful completion, bind a content-addressed raw-response artifact into the event/completion/output/workflow chain, enforce `0600`/no-Git custody, and require independent reparse/rebinding before reference seal, score, and final verification.

#### `A11-R5-008` — Multi-transition provider steps lose committed-state custody on partial failure

A provider step can commit a request transition, then a dispatch-audit transition, then an event/completion/output transition (`runner-v5-r5-runtime.mjs:363-383`). An exception after the first or second durable transition is caught and returned as a generic blocked result with none of those transition objects (`:387`). CLI receipts retain only a flattened first/last summary when every transition is returned (`runner-v5-r5-cli.mjs:20-63`); their engine-failure catch has no way to recover already committed transition hashes (`:149-154`).

The A11 test simulates a durable intermediate transition followed by an exception. The command receipt reports `stateTransitionCommitted=false`, null prior/next index hashes, no derived hashes, and no transition path.

Required remediation: journal every transition as its own append-only command subreceipt; on failure, return/recover all already committed index and artifact hashes; make resume start from the last durable transition; and test exceptions after each of request, audit, reservation, event, completion, and role-output persistence.

### Medium

#### `A11-R5-009` — Integrity reconstruction can ignore extra failed out-of-graph provider calls

The scorer checks call order and expected membership only for successful completions (`scorer-v5-r5.mjs:320-339`). The final integrity kernel derives extras from `successful` calls only and defines unauthorized execution as non-state-bound calls or extra successful calls (`:444-461`). A caller-authored, self-hashed audit with matching high-level identity can make an extra failed call appear state-bound; because its key is never compared to the expected graph, it can disappear from `unauthorizedProviderCall` and `materialDeviation`.

Required remediation: compare every completed attempt, regardless of outcome, to the exact permitted item-role-attempt graph and locally rebuilt dispatch plan; bind retry ordinal and plan hash; and classify any out-of-graph attempt as an unauthorized provider call under the frozen precedence.

## Reassessment of the 11 V5-R4 findings

| V5-R4 finding | V5-R5 disposition | Current evidence |
| --- | --- | --- |
| `A11-R4-001` DeepSeek reference-seal/execution-registration dispatch binding | Core state-bound dispatch substantially fixed. | No direct bypass recurrence; positive execution is nevertheless blocked by `A11-R5-001`. |
| `A11-R4-002` C0 set/four-input/dispatch binding | Exact four-field input and selected-set guard fixed for successful B-prime outputs. | Terminal missing/malformed path remains `A11-R5-002`. |
| `A11-R4-003` unnecessary adjudicator dispatch | Core guard now requires the locally recomputed trigger and planner agreement. | No recurrence found. |
| `A11-R4-004` route/account/billing/region/price provenance | Raw bytes are now embedded and re-hashed, but remain caller-authored. | Recurs as `A11-R5-003`. |
| `A11-R4-005` inventory identity | Runtime validator rebuilds the ordered manifest/C0/screen inputs. | No recurrence found. |
| `A11-R4-006` independent cost preview | Positive rates, full call maxima, token allocation, and 20% buffer are recomputed. | Arithmetic closed; provenance remains poisoned by `A11-R5-003`. |
| `A11-R4-007` hard-coded integrity/deviation flags | Most flags now derive from ledgers/audits/attempts. | Extra failed calls remain under-counted in `A11-R5-009`; terminal scoring is unreachable in `A11-R5-002`. |
| `A11-R4-008` interrupted/stale recovery | Explicit owner-authorized recovery receipts and conservative completion exist. | No recurrence found in registered fixtures. |
| `A11-R4-009` cross-process workflow persistence | V2 append-only index transitions materially improve persistence. | Legacy review migration and partial-transition custody remain `A11-R5-004` and `A11-R5-008`. |
| `A11-R4-010` conditional closed-schema semantics | Negative conditional-schema tests pass. | No recurrence found. |
| `A11-R4-011` degenerate agreement | Single-category Cohen's kappa is `null`; raw agreement/AC1 remain available. | No recurrence found. |

## Independent review axes

The review skill required separate Standards and Spec axes. Their conclusions are preserved independently rather than silently merged or re-ranked.

### Standards axis

Decision: `DISCREPANCY`.

It reported five items: high legacy `FRESH_RUNNER_REVIEW` collision; high unpinned active registration identity; high non-transitive/runtime-unverified inherited source inventory; high caller-authored route evidence; and medium omission of extra failed calls. These correspond to consolidated findings `A11-R5-004`, `A11-R5-005`, `A11-R5-006`, `A11-R5-003`, and `A11-R5-009`.

### Spec/adversarial axis

Decision: `DISCREPANCY`.

It reported critical DeepSeek planner/request residency contradiction; critical terminal B-prime/C0/integrity-decision unreachability; high legacy fresh-review collision; and high incomplete source-inventory binding. It separately noted caller-self-attested route evidence. These correspond to consolidated findings `A11-R5-001`, `A11-R5-002`, `A11-R5-004`, `A11-R5-006`, and `A11-R5-003`.

The main A11 lane independently reproduced those findings and added raw-response custody/replay and multi-transition failure custody as `A11-R5-007` and `A11-R5-008`.

## Required next state

All nine findings affect registered execution behavior or its trust boundary. They require a new A07 source commit and a new append-only pre-first-provider superseding runner registration. V5-R5 must remain immutable and retain this `DISCREPANCY` receipt; it must not be rewritten.

The permissible transition is:

> `A07_OFFLINE_REMEDIATION_AND_MAIS_NATURAL_CA60_V5_R6_PRE_FIRST_PROVIDER_SUPERSEDING_REGISTRATION`

After V5-R6 is frozen, a fresh A11 lane must independently recompute the new Git-object roots and rerun registered plus adversarial fixtures. Provider grants, credential checks, route probes, natural-question egress, OpenAI labeling, DeepSeek canary execution, scoring, verification, and publication remain blocked until a later fresh review returns `CONCURRED` with zero actionable findings and the owner separately grants the exact live authorities.

## Proved boundary

- Credential files/values, `.env`, and `All API Keys.docx` read: `0`
- OpenAI provider calls/events: `0`
- DeepSeek provider calls/events: `0`
- Internet/network requests: `0`
- Protected natural-question bodies or `.local` protected artifacts read: `0`
- Natural questions egressed: `0`
- Reference labels or natural-question results created: `0`
- Tokens authorized or spent: `0`
- Attempts authorized or spent: `0`
- USD authorized or spent: `0`
- Live app, question bank, deployment, A07 source worktree, or immutable V5-R5 source/registration mutations: `0`
- Git commit or push performed by this review: `0`

The proved state is exact-source offline review only. It is not `CA60_EXECUTED`; it cannot support `PASS`, `APPROVED`, `PRODUCTION_READY`, or `LIMITED_GENERALIZATION_EVIDENCE`.
