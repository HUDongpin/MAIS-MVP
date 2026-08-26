# MAIS-NATURAL-CA60-V5-R8 — Fresh A11 Independent Offline Runner Review

## Decision

`DISCREPANCY`

The immutable V5-R8 registration and its Git-object source/test manifests are internally authentic, the registered offline suite passes, and the current registration remains fail-closed with zero live authority. The implementation does not yet satisfy the frozen execution contract: eight actionable discrepancies remain. Therefore A11 did not create any artifact at the seven production `R8_REVIEW_PATHS`, did not issue `CONCURRED`, and did not unlock workflow adoption or provider execution. A new append-only V5-R9 runner registration is required after remediation and a new fresh A11 review.

Reviewed immutable identities:

- Registration commit: `ab8e8e8f74fc4f9cffd4dc865b65d800783db4b8`
- Direct-parent runner source commit: `94abd3f1907a43e8378c181d56d8389a1de08020`
- Registration self-hash: `ea5cb617a77a2521e473846c35267f419723fd9bf6c0ca8bef8cd6fc9fa46160`
- Production source root: `121fd08aaf4ba08ffc9fb91f5f992116aaaffc926960bcb9082a9c2e486131d9`
- Test source root: `a2673d551d3bbde11389f9d870e7d081bb80a95e75196af90780c5d21c642b54`
- Import-closure root: `8e048d2d6f7f60e17adea7c6076dc050df6192c65dd6273edc9d45d602cc6a91`
- Runtime source-enumeration root: `6a27196d501cc26661b57698ce80ca14a3c5eb49cde6a53e23648a23d8414e56`

The exact registered provider tuples remain:

- OpenAI reference: `OPENAI_DIRECT / gpt-5.6-luna / https://us.api.openai.com/v1/responses / US_STORAGE_PROCESSING`.
- DeepSeek evaluation: `DEEPSEEK_DIRECT / deepseek-v4-pro / https://api.deepseek.com/chat/completions / UNRESOLVED`.

Git-object authenticity proves which bytes were registered. It does not prove that those bytes implement the frozen protocol correctly; the findings below address that separate boundary.

## Severity-ranked actionable findings

### Critical

#### `A11-R8-001` — The registered public workflow is not future-reachable

The public CLI constructs `createRunnerRuntimeV5R8()` with default dependencies. Those defaults set both `providerAttemptExecutor` and `providerAttemptPlanner` to `null`; no registered source implements the required `V5_R8_NATIVE_EXACT_PROVIDER_ATTEMPT_EXECUTOR` wrapper. Even after future authorization and route evidence, provider commands therefore stop at `NATIVE_PROVIDER_ATTEMPT_EXECUTOR_NOT_BOUND_ZERO_HTTP` ([runtime](../../content-qa/mais-natural-ca60-v1/runner-v5-r8-runtime.mjs), lines 195–206 and 300–318; [CLI](../../content-qa/mais-natural-ca60-v1/runner-v5-r8-cli.mjs), lines 124–186).

The same runtime exposes permanent blocked stubs for `seal-reference-labels` and `freeze-deepseek-registration`, rather than implementations conditional on a completed OpenAI graph and valid authority ([runtime](../../content-qa/mais-natural-ca60-v1/runner-v5-r8-runtime.mjs), lines 471–493). Thus the registered workflow cannot progress from OpenAI labeling through reference sealing, DeepSeek registration, canary/resume, scoring, verification, and export without a future source/registration change.

Required remediation: provide one registered native planner/executor that constructs, persists, dispatches, resolves, and journals exact attempts; implement conditional reference sealing and DeepSeek registration; exercise the entire offline fixture workflow through the public CLI, including the normal successful C0 set and complete-score path.

#### `A11-R8-002` — The side-effecting adapter can bypass Git-custodied A11 review loading

The CLI adoption path now loads review/process artifacts from an exact single-add direct-child Git commit. However, the registered `native-provider-adapter-v5-r8.mjs` exports a side-effecting `send()` that accepts caller-supplied activation input and directly calls the pure activation validator before credential read/HTTP ([native adapter](../../content-qa/mais-natural-ca60-v1/native-provider-adapter-v5-r8.mjs), lines 90–128). That boundary never invokes the Git-object review loader.

The review validator recomputes caller-supplied manifests and process receipts, but its decisive Git facts remain ordinary fields: `verifiedFromGitObjects`, mutation count, parent, commit, and receipt hash ([review evidence](../../content-qa/mais-natural-ca60-v1/review-evidence-v5-r8.mjs), lines 136–177). The A11 adversarial test constructs a fully schema-valid fake `CONCURRED/0` review, self-declares lane `A11`, supplies those Git-shaped fields, and receives no review-validation errors. No trusted reviewer identity, signed review, or verified commit signer is bound.

Current R8 is still safe because route anchors and live authority are absent. A future activation would nevertheless have an alternate core transport boundary that is weaker than the public Git-custodied path. This leaves `A11-R7-004` only partially closed.

Required remediation: make the side-effecting adapter accept only an opaque activation capability produced by the exact Git-object loader/guard, or perform the exact Git-object loading and trusted reviewer authentication at the final transport boundary; bind a trusted A11 identity/custody key rather than a caller role string.

#### `A11-R8-003` — Signed route evidence authenticates unsupported summaries, not source/probe custody

R8 verifies an Ed25519 signature against a future pinned trust anchor, which is an improvement. But it validates five caller-provided, self-hashed summary objects using Boolean/string/hash-shaped fields such as `authenticatedSource`, HTTPS `sourceLocator`, `contentSha256`, and five zero-content-probe leaf hashes ([route evidence](../../content-qa/mais-natural-ca60-v1/trusted-provider-evidence-v5-r8.mjs), lines 71–125). It does not load source bytes, recompute their content hashes, load the request/event/raw/binding/resolved-attempt artifacts, or rebuild the probe graph.

The adversarial test generates a keypair, pins the public key, signs arbitrary account/billing/region/price/probe summaries with no source bytes or graph leaves, and production validation returns no errors. The signature proves who signed the summaries; it does not prove the summaries' underlying evidence. This does not satisfy the explicit `A11-R7-005` remediation requirement for independently retrievable authenticated bytes and rebuilt guarded attempt custody.

The current registration correctly remains `ROUTE_AUTHENTICITY_BLOCKED_NO_PINNED_TRUST_ANCHOR`; an anchor-only superseding registration must not be treated as sufficient.

Required remediation: persist/load exact authenticated source bytes or provider-native signed exports; recompute every `contentSha256`; load the exact probe request/event/raw/binding/resolved receipts; reconstruct and verify its zero-natural-content attempt graph; sign the complete evidence root and bind the verified provider account/project/billing subject.

#### `A11-R8-004` — Terminal failure receipt is not derived from actual immutable partial custody

On any scoring exception, the runtime defaults to caller-provided `context.terminalEvidenceBase`, hardcodes one generic cause code, and calls `buildTerminalMissingItemResultsV5R8` ([runtime](../../content-qa/mais-natural-ca60-v1/runner-v5-r8-runtime.mjs), lines 195–205 and 400–418). That function synthesizes all 60 items as `MISSING_RECEIPT`, even when immutable attempt/ledger evidence proves that some items completed ([scorer verifier](../../content-qa/mais-natural-ca60-v1/scorer-verifier-v5-r8.mjs), lines 157–207).

The terminal schema binds the synthetic item-result set, but not an attempt-graph root, ledger root, or command-journal root. Verification repeats the same all-missing construction from the same caller base. This can conservatively return `EXECUTION_INTEGRITY_FAILED`, but it does not truthfully preserve 60-item completed/failed/missing custody or independently reconstruct the exact terminal cause. `A11-R7-003` remains open.

Required remediation: build the terminal item rows and cause codes from immutable ledger, all-attempt graph, role outputs, command journal, and persisted item markers; retain every provable completed/unresolved item; bind those roots in the terminal receipt; independently rebuild them during `verify`; perform no metric inference for integrity-failed runs.

#### `A11-R8-005` — Decision-critical integrity facts remain caller-controlled scoring flags

The scorer copies `receiptChainValid`, `providerTupleValid`, `capsValid`, `terminalProviderFailure`, `materialDeviation`, `postResultDesignDrift`, and `unauthorizedProviderCall` directly from input; label leakage is only partly recomputed ([scorer verifier](../../content-qa/mais-natural-ca60-v1/scorer-verifier-v5-r8.mjs), lines 410–439). The default runtime obtains that input from `context.scoringInput`, and `verify` calls the same builder again ([runtime](../../content-qa/mais-natural-ca60-v1/runner-v5-r8-runtime.mjs), lines 195–205 and 385–458).

These flags determine invalidation and execution-integrity precedence in the statistical kernel. A caller can therefore present favorable booleans instead of the scorer reconstructing receipt-chain continuity, tuple/origin/model, cap consumption, provider failure, registration drift, and authorization status from immutable raw evidence. Reusing the same caller values during `verify` is not independent verification.

Required remediation: eliminate caller-supplied decision facts; recompute each flag from the sealed registration, authorization, route, append-only receipt/ledger graph, cost ledger, timestamps, provider observations, and request payloads; independently rebuild them in `verify`.

### High

#### `A11-R8-006` — Interrupted-attempt recovery is not safely reachable from reloaded custody

The zero-HTTP reconciliation algorithm exists, but the shipped CLI requires a `loadRecoveryInput` dependency that the default runtime does not expose, so `reconcile-interrupted-attempt` returns `RECOVERY_INPUT_LOADER_NOT_BOUND` ([CLI](../../content-qa/mais-natural-ca60-v1/runner-v5-r8-cli.mjs), lines 124–156). The protected-index loader does not reconstruct `attemptCustodyByProvider`; missing custody silently becomes empty ([workflow index](../../content-qa/mais-natural-ca60-v1/workflow-index-v5-r8.mjs), lines 104–137; [runtime](../../content-qa/mais-natural-ca60-v1/runner-v5-r8-runtime.mjs), lines 123–129). Runtime reconciliation persists through stores supplied inside the recovery input but does not append a workflow transition or update the loaded context ([runtime](../../content-qa/mais-natural-ca60-v1/runner-v5-r8-runtime.mjs), lines 341–360).

Additionally, `validateResumeCustodyV5R8` checks reservations, orphan intents, and orphan resolved receipts, but does not reject an orphan `DISPATCH_COMPLETED` ledger entry. The A11 in-memory negative fixture supplies only such a completion and receives `[]` ([attempt recovery](../../content-qa/mais-natural-ca60-v1/attempt-recovery-v5-r8.mjs), lines 241–267). A later dispatch can therefore pass the pre-HTTP resume check before complete attempt-graph validation exposes the inconsistency. `A11-R7-006` remains open.

Required remediation: reconstruct every provider's reservation/intent/completion/resolved custody from protected artifacts on each load; reject orphan completions; provide a default exact recovery loader; append a journaled workflow transition and refresh context only after atomic recovery; prove crash recovery at every transition before allowing another dispatch.

#### `A11-R8-007` — Finding IDs are incorrectly required to be globally unique across all items

The frozen key for finding denominators/matching is `UNIQUE(itemId,findingId,family,code)`, so the same local finding ID may legitimately occur on different items ([design registration](../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json), lines 1056–1065 and 1073–1083). The item reducer correctly scopes finding-ID uniqueness to one item.

The statistical kernel instead maintains one global reference-ID set and one global machine-ID set and rejects any repeated `findingId` across the run ([statistical kernel](../../content-qa/mais-natural-ca60-v1/statistical-kernel-v5-r8.mjs), lines 131–149 and 251–261). A normal convention such as `F1` per item can therefore make an otherwise valid 60-item run unscoreable. This is a hard divergence in the claimed `A11-R7-001/002` remediation.

Required remediation: enforce uniqueness on the exact frozen composite key, or on `itemId + findingId` before validating family/code consistency; add a negative/positive fixture with the same local finding ID on two distinct items.

### Medium

#### `A11-R8-008` — The registered A07 closeout remains conditional and pre-registration

The A07 log materially improves inventory, assumptions, risks, omitted live checks, type-check evidence, upstream, and lifecycle planning. However, it records only the pre-registration `24 passed / 2 skipped` suite and says the two registration-dependent tests “must pass” later ([A07 log](../../session-logs/2026-08-26-A07-mais-natural-ca60-v5-r8.md), lines 52–61). Its final disposition remains conditional—`reviewed commit` once source/registration commits are created—and contains neither the exact final source/registration identities nor the post-registration 26/26 result (lines 83–89).

Those immutable commits now exist. The registered session record is therefore not a completed final-state/lifecycle closeout and leaves `A11-R7-008` open.

Required remediation: in the next append-only source slice, record the exact predecessor/final identities, post-registration test result, final-state enum, clean/dirty status, upstream/push evidence, retained worktree action, and any omitted checks/risks.

## Reassessment of all V5-R7 findings

| V5-R7 finding | V5-R8 disposition |
| --- | --- |
| `A11-R7-001` | Partially closed. The 60-row/unified-nonresolved/item-marker model exists, but the global finding-ID defect in `A11-R8-007` makes valid inputs unscoreable. |
| `A11-R7-002` | Partially closed. Native counter-SHA256, golden vectors, 10,000 bootstrap replicates and matching order exist; exact finding-key semantics remain wrong in `A11-R8-007`. |
| `A11-R7-003` | Open as `A11-R8-004`; terminal evidence does not reconstruct actual immutable partial custody. |
| `A11-R7-004` | Partially closed. Exact Git loading exists in the public adoption path; the direct adapter boundary remains caller-assertable as `A11-R8-002`. |
| `A11-R7-005` | Open as `A11-R8-003`; signatures bind summaries rather than reconstructed source/probe evidence. |
| `A11-R7-006` | Open as `A11-R8-006`; recovery is not wired to the default CLI/reloaded custody and orphan completions pass. |
| `A11-R7-007` | Closed in the full attempt-graph reconstructor: bidirectional exact-set checks reject dangling evidence collections. |
| `A11-R7-008` | Open as `A11-R8-008`; registered closeout remains conditional/pre-registration. |

`A11-R8-001` and `A11-R8-005` are additional end-to-end reachability and decision-integrity findings revealed by the fresh review.

## Verification performed

- Independent Git-object registration verifier: all checks passed; exact single-add registration, direct parent, registration self-hash, 202-row production manifest, 211-row test manifest, 411-edge import closure, roots, supersession, frozen bindings, tuples, zero authority, and ceilings matched.
- Registered V5-R8 offline suite: `26 passed / 0 failed / 0 skipped / 0 todo`.
- A11 adversarial boundary suite: `8 passed / 0 failed / 0 skipped / 0 todo`.
- The independent verifier uses Node built-ins and Git object bytes only. It imports none of the A07 registration builder, activation guard, runner, scorer, statistical kernel, or decision engine.
- The adversarial suite invokes pure validators/runtime fixtures only. It injects no fetch or credential reader and makes no network/provider call.

## Proved boundary and activity accounting

- Credentials, environment values, `.env*`, and `All API Keys.docx` read: `0`.
- Protected `.local` natural artifacts and natural-question bodies read: `0`.
- OpenAI / DeepSeek / provider API / research-network calls: `0`; the separately authorized Git branch push is closeout transport, not provider execution or data egress.
- Natural-question egress: `0`.
- Tokens / provider attempts / USD authorized or consumed: `0 / 0 / 0`.
- Reference labels / natural-question results produced: `0 / 0`.
- Live question bank, app, API, deployment, R8 source, and R8 registration mutations: `0`.

The current evidence proves an immutable offline implementation was reviewed and remains blocked. It does not prove provider availability, billing, endpoint/model behavior, natural-question correctness, human validity, successful execution, deployment readiness, or generalized machine-QA effectiveness.

The frozen California-60 ceiling remains intact: even a future valid complete run cannot emit `PASS`, `APPROVED`, `PRODUCTION_READY`, or `LIMITED_GENERALIZATION_EVIDENCE`; its normal maximum remains `INCONCLUSIVE_MACHINE_REFERENCE`.
