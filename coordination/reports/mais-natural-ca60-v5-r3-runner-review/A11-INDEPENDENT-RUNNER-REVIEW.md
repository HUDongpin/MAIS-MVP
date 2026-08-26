# MAIS-NATURAL-CA60-V5-R3 fresh A11 independent offline runner review

- Reviewer lane: `A11`
- Review date: `2026-08-26`
- Exact registration commit: `379f9e804011983630a3bca5630156046667686d`
- Exact bound runner source commit: `5e7aac8d5bc15f73e1eba29a40b2c6e9d3baa141`
- Registration self-hash: `1dd8514b93638db806942bb85b04d975f17ce0f3b19fb77bc88ca81101ac0911`
- Production source root: `2c7e3fb49dd8e66e2ac6298100816903954c4d9f43448cb09e3c8a788ee4ab52`
- Test source root: `19de508acd5af7d9a9ac4640dc43c36c23ccf7a0fa0f10a8dba51c92b8aa9dac`
- A11 receipt self-hash: `2b8307b6547762499795952a2d4251cca033d70c6868586eb41bbc1409859faa`
- Decision: **`DISCREPANCY`**
- Actionable findings: **13** (`CRITICAL`: 6, `HIGH`: 7, `MEDIUM`: 0, `LOW`: 0)

## Outcome

The V5-R3 registration is internally hash-consistent. It correctly binds the exact Git-object source manifests, the V5 design, frozen CA60 frame/sample roots, rights/privacy screens, taxonomy, labeling/adjudication method, statistical-analysis hash, decision ceiling, V5-R2 discrepancy, provider-contract erratum, exact selected provider tuples, and a zero-authority state.

The registered runtime is nevertheless not implementation-ready for natural-question provider execution. Several fail-closed properties are declarations rather than properties of the bytes that will be dispatched or scored. In particular, the guard does not reconstruct and authenticate the actual provider request, the atomic ledger applies the two-attempt role cap across the entire 60-item run, and the scorer does not implement the frozen bootstrap and missing-data method.

This receipt therefore cannot be used as the `CONCURRED` fresh A11 gate. No provider authorization, credential read, natural-question egress, canary, aggregate result, or publication may rely on V5-R3. The existing registration and this discrepancy evidence remain immutable.

## Independently verified evidence

The A11 verifier uses only Node built-ins. It reads the registration and all 56 registered production/test sources from exact Git object bytes and does not import the A07 registration builder, runner, authorization guard, scorer, decision engine, canonicalizer, or hash implementation.

- Registration commit parent equals the bound runner commit: verified.
- Registration JCS/SHA-256 self-hash: verified.
- Exact 42-file production manifest and root: verified.
- Exact 14-file test manifest and root: verified.
- V5 design registration hash, all 14 section hashes, frozen-contract root, and active-design pointer: verified.
- Provider-sequencing and owner-decision hashes: verified.
- Frame registration, sampling frame, sample manifest, sample-selection root, sample payload set, rights/privacy roots, rights policy, lineage rule, taxonomy, labeling/adjudication, threshold/decision/power, and decision-ceiling bindings: verified.
- V5-R2 supersedes hash, immutable V5-R2 A11 discrepancy receipt, and append-only provider-contract erratum chain: verified.
- Every registered provider component hash: verified independently from Git object bytes.
- OpenAI tuple `OPENAI_DIRECT / gpt-5.6-luna / https://us.api.openai.com/v1/responses / US_STORAGE_PROCESSING`: verified as the frozen requested tuple, **not** as live project/route proof.
- DeepSeek tuple `DEEPSEEK_DIRECT / deepseek-v4-pro / https://api.deepseek.com/chat/completions`: verified as the frozen requested tuple, **not** as live route, billing, model-availability, or data-region proof.
- All false/zero fields in the registration authority state: verified.
- Independent verifier: `23/23` checks verified, `0` mismatches.
- Exact registered offline fixture suite: `58/58` tests passed; `0` failed, cancelled, skipped, or todo.

Passing fixture tests establish only the behavior exercised by those fixtures. They do not cure uncovered contract violations and do not establish credentials, entitlement, provider availability, project identity, data residency, current rates, billing origin, natural-question execution, labels, results, or QA validity.

## Reassessment of all V5-R2 findings

| Prior finding | V5-R3 disposition | Current evidence |
| --- | --- | --- |
| `A11-R2-001` fresh A11 review could not bind | **Partially addressed**: a V2 receipt and hash binding exist, but the runtime validator does not enforce `reviewerLane=A11`, design/runner identity, schema closure, or strict post-registration chronology. | `A11-R3-007` |
| `A11-R2-002` caller-supplied budget state | **Partially addressed**: an atomic ledger exists, but role, success, token, USD, and completion semantics remain unsound. | `A11-R3-002`, `A11-R3-003` |
| `A11-R2-003` incomplete provider events | **Partially addressed**: post-dispatch receipts exist, but network failure is undercounted and request/provider/timing evidence is discarded. | `A11-R3-011` |
| `A11-R2-004` unauthenticated DeepSeek execution registration | **Partially addressed**: the registration is self-hashed, but the actual reference seal and attempt chain are not supplied or validated. | `A11-R3-004` |
| `A11-R2-005` weak prior-role lineage | **Partially addressed**: self-hashes and matching fields are checked, but membership in the authoritative completion ledger is not proven. | `A11-R3-010` |
| `A11-R2-006` route receipt builders absent | **Partially addressed**: builders/storage exist, but they accept opaque evidence hashes and booleans without authenticating the referenced evidence. | `A11-R3-009` |
| `A11-R2-007` static CLI | **Partially addressed**: commands are wired to runtime functions, but verify/export/canary semantics are insufficient. | `A11-R3-012` |
| `A11-R2-008` caller-selected resume/trigger state | **Partially addressed**: trigger receipts exist, but C0 selection/engine and prior artifacts are not bound to frozen authoritative records. | `A11-R3-008`, `A11-R3-010` |
| `A11-R2-009` stale `Qwen` wording | **Addressed as wording governance** by immutable non-semantic erratum `f9fad74c…`; actual reference blindness still fails at request enforcement. | `A11-R3-001` |
| `A11-R2-010` open registration schema | **Schema artifact addressed**, but closed schemas are not invoked by the runtime guards; a valid self-hash is treated as schema validity. | `A11-R3-007` |
| `A11-R2-011` non-atomic append | **Addressed for ledger entries** by immutable temp-file write, fsync, rename, permission check, and directory fsync. | No recurrence; protected-path issue is separately `A11-R3-013`. |

## Severity-ranked actionable findings

### Critical

#### `A11-R3-001` — Dispatched bytes are not bound to the frozen item, allowlist, adapter, or blindness contract

The guard validates declared allowlist strings, a request self-hash, claimed item identifiers, and caller-supplied `referenceInputCount`/`deepSeekInputCount`. It never validates the request against a closed request schema, binds `adapterTransformHash` to the registered component, rebuilds the logical/wire request from the frozen item payload, or checks the actual outbound fields against the allowlist/denylist. A caller can self-seal a different `wireRequest` under an eligible item hash while keeping the counters at zero. This defeats both natural-item egress integrity and DeepSeek/OpenAI process isolation.

Evidence: `authorization-guard-v5-r3.mjs:79-123`; `provider-request-adapters-v5-r3.mjs:20-38,51-87`; `live-provider-http-v5-r3.mjs:38-61`; the success fixture accepts a manually self-sealed request at `guarded-provider-attempt-v5-r3.test.mjs:164-223`.

Required remediation: derive the exact outbound bytes from a protected, manifest-bound item; validate the closed role request schema; bind the exact adapter/prompt/schema hashes; compare the wire-body hash before and after permit construction; enforce actual field-level allow/deny policy; and prove reference/DeepSeek artifact counts from the payload rather than trusting counters.

#### `A11-R3-002` — Atomic ledger cap semantics make CA60 non-executable and permit concurrent success-cap overshoot

`maximumAttemptsPerRole` is counted by `entry.role` across the entire provider ledger, not by `(itemHash, role)`. After two `A_SOLVE` reservations on any two items, every remaining `A_SOLVE` is rejected. The successful-call check counts only completed successes, so multiple active reservations can all succeed when only one success slot remains. Completion also accepts a caller-provided status rather than requiring equality with the provider-event receipt.

Evidence: `atomic-execution-ledger-v5-r3.mjs:118-130,158-183`.

Required remediation: scope the role-attempt cap to exact item and role, atomically reserve potential successful-call capacity, reconcile release/consumption rules, and derive completion status exclusively from the validated receipt.

#### `A11-R3-003` — Authorization caps and token/USD reservations are not constrained to the frozen design or actual request

The guard only requires owner-grant values to equal authorization values. It does not cap them against the frozen OpenAI/DeepSeek hard limits, enforce the exact provider role set, require each role's output reservation to equal the frozen `8192` output cap, prove that input reservations cover the actual wire request, or reject observed usage above reservation. A self-hashed grant can therefore enlarge hard caps or reserve unrealistically small token/USD amounts.

Evidence: `execution-integrity-v5-r3.mjs:193-217,235-285`; `authorization-guard-v5-r3.mjs:83-90`; frozen limits at `design-registration.json:1327-1339,1422-1433`.

Required remediation: derive provider-specific roles and hard maxima from the frozen design, calculate conservative per-request reservations from the exact wire body and frozen output maximum, include active reservations in every cap, and fail closed on usage/reservation inconsistency.

#### `A11-R3-004` — DeepSeek execution registration does not authenticate the real reference seal or attempt chain

The builder and validator accept syntactically valid `referenceSealHash` and `referenceAttemptChainHash` values. They do not receive a `MachineReferenceSealV2`, rebuild its 60-item label root, verify the terminal OpenAI ledger chain, prove the authorization and inventory used for labeling, or enforce seal chronology before DeepSeek authorization. A fabricated pair of hashes can satisfy the execution-registration gate.

Evidence: `execution-integrity-v5-r3.mjs:288-333`.

Required remediation: validate the complete sealed reference artifact, all final labels and terminal ledger entries, the exact registration/inventory/authorization bindings, and strict chronology before constructing or accepting DeepSeek execution registration.

#### `A11-R3-005` — Scoring findings and integrity flags are caller-authored rather than reconstructed from sealed raw evidence

Runtime checks only top-level hashes, minimum item count, and cluster membership. The scorer then trusts each caller-supplied `referenceFindings`, `machineFindings`, `executionIntegrityValid`, `labelLeakageDetected`, and unresolved count. No reducer reconstructs reference findings from the reference seal or machine findings from B′/C0 outputs and their completed attempt chain. An unrelated self-hashed scoring input can therefore generate an aggregate decision.

Evidence: `runner-v5-r3-runtime.mjs:192-208`; `scorer-v5-r3.mjs:140-162,193-211`.

Required remediation: build the scoring input only from verified sealed artifacts; validate every item/result/attempt lineage and schema; recompute integrity, leakage, unresolved, and missing states; and reject caller overrides.

#### `A11-R3-006` — Scorer diverges from the frozen statistical algorithm

The implementation uses a 32-bit stateful PRNG seeded from the first eight registration-hash hex characters, rather than the frozen counter-based SHA-256 64-bit rejection sampler and golden vectors. It uses locale-dependent finding sorting instead of the frozen taxonomy order, omits metric-domain separation and P1/P2 bootstrap decision bounds, invents denominator minima for finding metrics, applies a simple adverse denominator formula instead of exact feasible surface worlds/unidentified finding bounds, and omits the inventory-weighted Kish descriptive result.

Evidence: `scorer-v5-r3.mjs:34-137,193-201`; frozen method at `design-registration.json:1073-1173`.

Required remediation: implement the frozen PRNG/golden vectors, metric-specific item-cluster bootstrap, exact matching order, Wilson/bootstrap/worst-case combination, exact missing-data worlds/unidentified finding rule, frozen denominator semantics, and Kish descriptive calculation without changing thresholds after results.

### High

#### `A11-R3-007` — Closed schemas and fresh-A11 attribution are not operationally enforced

The generic self-hash validator proves only canonical content integrity. The fresh review validator checks schema-name text, roots, decision, and hashes but omits `reviewerLane=A11`, `designId`, `runnerVersion`, exact schema fields, and strict `reviewedAt > registeredAt`. Other authorization, route, price, and execution artifacts are likewise not passed through the published JSON Schemas. A self-hashed incomplete or extra-field artifact can pass implementation checks despite failing its schema.

Evidence: `execution-integrity-v5-r3.mjs:50-54,150-169`; `authorization-guard-v5-r3.mjs:53-123`.

Required remediation: invoke closed compiled schemas at every trust boundary, enforce exact registered artifact identity and active pointer, require `reviewerLane=A11` and exact V5-R3 identity, and use strict post-registration chronology.

#### `A11-R3-008` — Execution inventory is not bound to exact manifest row identity, cluster mapping, order, or canary

Inventory roots cover the 60 item hashes and screen-evidence hashes, but the builder accepts arbitrary unique pseudonyms and cluster IDs. It copies `sampleManifestHash` without consuming the manifest rows or `sampleSelectionContentRootHash`; it also sorts by item hash and discards manifest order. This does not prove one-cluster-one-item identity or that the registered first item is the canary.

Evidence: `execution-integrity-v5-r3.mjs:60-119`; `runner-v5-r3-cli.mjs:51-88`.

Required remediation: construct inventory from the protected frozen manifest and verify each exact `(order, itemHash, pseudonym, clusterId)` mapping plus the sample-selection root; bind canary item/order and block later items until its integrity gate completes.

#### `A11-R3-009` — Route receipts are self-hashed assertions, not authenticated route/project/billing evidence

The route builders accept arbitrary 64-hex evidence and attempt hashes plus booleans, then derive `CONFIRMED`. The authorization guard validates only that self-hashed receipt and its claimed tuple/status; it does not receive or validate the provider-attempt receipt, console/project-residency evidence, direct billing evidence, data-region evidence, or price source. No CLI route-preflight/probe execution command constructs this full evidence chain.

Evidence: `execution-integrity-v5-r3.mjs:394-455`; `authorization-guard-v5-r3.mjs:66-73`.

Required remediation: independently validate each referenced artifact and zero-natural-content attempt, exact project/header identity, entitlement/model observation, data region/direct billing, price source/freshness, and receipt chronology before permitting authorization.

#### `A11-R3-010` — Prior-role, adjudication, and C0 lineage are not tied to the authoritative ledger or frozen trigger set

Any self-hashed artifact/attempt pair with matching fields can pass prior-role validation; schema, provider tuple, authorization, inventory, and presence in the authoritative completion ledger are not checked. C0 trigger construction accepts arbitrary self-hashed random/mandatory trigger receipts and any trigger-engine hash, without binding the registered `c0RandomAuditHash` or frozen mandatory-predicate engine.

Evidence: `execution-integrity-v5-r3.mjs:336-390`; `openai-live-reference-runner-v5-r3.mjs:51-65`.

Required remediation: resolve dependencies only from protected ledger entries and sealed same-item outputs; validate schemas/authorization/tuple/role; bind the registered random-audit selection and frozen mandatory trigger engine; and make trigger decisions non-caller-selectable.

#### `A11-R3-011` — Attempt receipts omit required transport evidence and undercount dispatched failures

The transport computes a request-body hash and captures the provider request ID, but neither reaches `ProviderEventReceiptV3`; the receipt also lacks request-artifact hash, start timestamp, finish timestamp, and latency. Runtime calculates `completedAt` before dispatch. A fetch exception records `httpRequestCount=1` but `providerEventCount=0`, undercounting an uncertain post-dispatch event. Ledger completion accepts caller-supplied `attemptStatus` without requiring it to equal the embedded receipt.

Evidence: `live-provider-http-v5-r3.mjs:38-86`; `guarded-provider-attempt-v5-r3.mjs:55-68,102-127`; `atomic-execution-ledger-v5-r3.mjs:158-183`; `runner-v5-r3-runtime.mjs:97-113`.

Required remediation: pre-record dispatch, bind request and permit hashes, preserve request ID and exact timing/latency, count every uncertain-after-dispatch outcome conservatively, and make the receipt the sole completion-status authority.

#### `A11-R3-012` — CLI verify, aggregate export, and canary gates are bypassable

`verify` checks only the context self-hash plus a few registration/inventory properties, not the exact registration hash, ledger, reference seal, execution registration, item outputs, score, or independent review. Aggregate export accepts an unsealed object whose only relevant field is `decision: CONCURRED`, does not bind the A11 receipt or A18 claim-boundary review, and does not bind the aggregate report to scoring evidence. CLI passes `--canary 1`/`--resume` through as unused argv; the execution engine neither proves manifest-row-one canary selection nor gates the other 59 items.

Evidence: `runner-v5-r3-runtime.mjs:146-171,219-221`; `runner-v5-r3-cli.mjs:51-88`.

Required remediation: implement full-chain verification and independent-review/claim-boundary publication gates, and model canary/resume as registered state transitions rather than ignored command-line text.

#### `A11-R3-013` — Protected-root confinement follows symlinks outside protected storage

Context and ledger paths are checked only with lexical `path.resolve`/`path.relative`; `stat`, `readFile`, and later filesystem operations follow symlinks. A symlink inside the protected root can redirect reads or ledger writes outside the intended `.local` custody boundary.

Evidence: `runner-v5-r3-runtime.mjs:18-43`.

Required remediation: resolve and verify real paths for the root and every existing parent, reject symlinks with `lstat`/no-follow semantics, create files relative to a trusted directory handle where possible, and test symlink/race escape cases.

## Required closure and next permissible state

All code-affecting findings require a new A07 runner commit and a new append-only **pre-first-provider superseding registration**, followed by another fresh A11 review. Because V5-R3 records zero provider events and no authorization, this is a pre-execution supersession; V5-R3 must remain preserved, not overwritten.

The current next permissible state is:

> `A07_OFFLINE_REMEDIATION_AND_NEW_PRE_FIRST_PROVIDER_SUPERSEDING_REGISTRATION`

It is not permissible to issue provider execution authorization, read credentials, run a route probe containing natural content, label a natural item, run the registered canary, score, export an aggregate conclusion, or describe the route as validated. The frozen frame/sample, rights/privacy screens, taxonomy, thresholds, P0/P1/P2 rules, and `INCONCLUSIVE_MACHINE_REFERENCE` ceiling remain unchanged.

## Proved boundary

- Credential values or credential files read: `0`
- Environment/`.env`/`All API Keys.docx` reads: `0`
- OpenAI provider calls/events: `0`
- DeepSeek provider calls/events: `0`
- Natural-question text read by this review: `0`
- Natural questions egressed: `0`
- Reference labels or natural-question results created: `0`
- Tokens authorized or spent: `0`
- Attempts authorized or spent: `0`
- USD authorized or spent: `0`
- Live question-bank, app, deployment, or A07 artifact mutations: `0`

The evidence boundary is therefore: exact-source offline review only. The research state remains frozen CA60 frame/sample plus a discrepant, non-authorized V5-R3 runner registration. It is not `CA60_EXECUTED`, does not support `PASS`, and does not support `LIMITED_GENERALIZATION_EVIDENCE`.
