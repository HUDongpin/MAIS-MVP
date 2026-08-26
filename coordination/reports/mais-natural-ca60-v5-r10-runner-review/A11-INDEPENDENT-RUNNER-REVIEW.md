# MAIS-NATURAL-CA60-V5-R10 — Fresh A11 Independent Offline Runner Review

## Decision

`DISCREPANCY`

The V5-R10 registration, direct-parent runner source, A07 closeout, Git-object source manifests, roots, frozen research bindings, provider tuples, zero-authority state, and claim ceiling are authentic. Most of the nine registered remediations are materially present. Two actionable discrepancies prevent an honest `CONCURRED / 0 findings` result:

1. the real native reference-seal path cannot satisfy its own closed schemas; and
2. the four required fresh-review process-evidence schemas still force the reviewed runner version to `V5-R8`.

The signed review receipt therefore records `DISCREPANCY / 2 findings`. It does not unlock workflow adoption or provider execution. V5-R10 must be append-only superseded before any provider call.

Reviewed immutable identities:

- Exact closeout commit: `39f5a607dd64d71b18f1ce2cfd904a3c440977b0`.
- Exact registration commit: `f3605158d12b601a6ec6b73a39998f156c4a49f3`.
- Exact direct-parent runner source commit: `43e88fa73acb38eca7926360f37c72d9115641f3`.
- Registration self-hash: `99b298b415d42756e8c3cc9b513e0b5ef6b33c8fe184ba98247fccc9eca8d9ed`.
- Production source root: `7b32c219d780de58609f8d9d37867a6b85ca654c47065691bae2513b49bb12aa`.
- Test source root: `28598960ffb4172f46a5b64a457a9b907645acbfd50d3b0a1c85e898c22a25e3`.
- Import-closure root: `dff99b2a49e03f0b09c189778014604fe86e0f6d05c12d06e5543f4fac7a814f`.
- Runtime source-enumeration root: `f493ecb64f32d67c6a88cc7a8d9e9d3f0105254019d14612de86858d5beb3c7f`.
- Signed A11 review receipt self-hash: `e8aeaf8b5d4567a5e2f936baacea0ecd64487a00ab976a9f3106e35869ef9bde`.

The exact registered provider tuples remain:

- OpenAI reference: `OPENAI_DIRECT / gpt-5.6-luna / https://us.api.openai.com/v1/responses / US_STORAGE_PROCESSING`.
- DeepSeek evaluation: `DEEPSEEK_DIRECT / deepseek-v4-pro / https://api.deepseek.com/chat/completions / UNRESOLVED`.

Git-object authenticity proves which bytes were registered. It does not prove that the registered bytes implement a future-reachable native workflow; the findings below address that separate boundary.

## Severity-ranked findings

### `A11-R10-001` — Critical — Native reference sealing is unreachable under the closed schema contract

The real `seal-reference-labels` runtime method calls `buildRawAuthoritativeMachineReferenceSealV5R10`, then calls `buildRawAuthoritativeReferenceValidationV5R10`. Both builders create and immediately validate self-hashed artifacts:

- the builder emits `MachineReferenceSealV6.sealReconstructionStatus = FULL_RAW_RESPONSE_REPARSE_AND_ATTEMPT_GRAPH_RECONSTRUCTION_BOUND_TO_R9`, while the registered closed `MachineReferenceSealV6` schema requires the corresponding `...BOUND_TO_R7` value;
- the builder emits `ReferenceSealValidationReceiptV4.validationStatus = RAW_AUTHORITATIVE_ATTEMPT_GRAPH_REBUILT_AND_BOUND_TO_R9`, while its closed schema requires `...BOUND_TO_R7`.

Because the builders call the closed-schema assertion immediately, reaching this native path necessarily throws before a V5-R10 reference seal or validation receipt can be frozen. This keeps the actual registered workflow from progressing to DeepSeek execution registration.

The registered “public workflow” fixture does not expose the failure. It injects a substitute `sealReferenceLabels` function that only flips an in-memory Boolean. The retained 240-response test in the registered suite exercises `buildRawAuthoritativeMachineReferenceSealV5R7`, not the V5-R10 builder. Thus the `52 / 0 / 0` A07 closeout suite and the native reachability claim are different evidence boundaries.

This finding means `A11-R8-001` is not fully closed.

Required remediation: add new closed V5-R11 reference seal/validation schemas or make the V5-R11 builders match exact versioned schema constants; update the runtime to use them; add an offline test that drives the default native runtime—not a substituted handler—through all 240 raw-reparsed reference calls, native seal creation, validation, and DeepSeek registration freeze. Freeze this in a new direct-parent source/registration/closeout/review chain.

### `A11-R10-002` — High — Fresh-review process evidence is schema-locked to V5-R8

The V5-R10 review contract requires four machine-readable process receipts:

- `IndependentStaticImportGraphReceiptV1`;
- `ForbiddenPrimaryScorerPathScanReceiptV1`;
- `IndependentCommandRuntimeReceiptV1`; and
- `IndependentSourceEnumerationReceiptV1`.

All four schemas define the field named `runnerVersion` with `const: V5-R8`. The V5-R10 schema catalog inherits those schemas through the V5-R9 catalog, and `review-evidence-v5-r10.mjs` requires those exact schema names. A truthful artifact with `runnerVersion: V5-R10` therefore fails closed validation; a closed artifact must carry the stale `V5-R8` identifier.

The four process artifacts in this discrepancy package retain the schema-required legacy value so their exact self-hashes and process root remain mechanically checkable. The V5-R10 review receipt and Ed25519 signature payload correctly bind V5-R10, the exact registration commit, and the exact source roots. This preserves evidence but does not cure the semantic schema drift.

The source contains additional non-gating R9 residue (`ONLY_AFTER_R9...` activation wording and internal R9-bound workflow names). Those residues reinforce the need for a clean versioned contract but are consolidated into this finding rather than counted separately.

Required remediation: create new process-evidence schema versions whose `runnerVersion` is V5-R11 (or replace the misleading field with an explicit process-schema version plus a separately required reviewed-runner version); bind only those new schemas in the V5-R11 review catalog and add negative tests that reject stale V5-R8/V5-R9 identifiers.

## Reassessment of all registered remediation IDs

| Registered remediation | A11 disposition | Evidence boundary |
| --- | --- | --- |
| `A11-R8-001` | `NOT_CLOSED` | Default native planner/executor and runtime methods exist, but the real reference-seal builder/schema mismatch in `A11-R10-001` prevents native completion. |
| `A11-R8-002` | `CLOSED` | Final adapter reloads exact Git registration, A07 closeout, signed A11 review and identity before credential read/HTTP, then overlays caller input with exact custody. |
| `A11-R8-003` | `CLOSED` | Route evidence requires retained structured account/billing/region/price bytes plus the exact ten-artifact zero-natural-content probe graph and pinned signer. Current registration has no anchor and remains blocked. |
| `A11-R8-004` | `CLOSED` | Terminal evidence is rebuilt from immutable attempt/ledger/journal/item custody and preserves completed/failed/missing states and bound roots. |
| `A11-R8-005` | `CLOSED` | Decision-critical integrity facts are reconstructed from raw custody; adversarial caller flags do not affect the result. |
| `A11-R8-006` | `CLOSED` | Interrupted recovery is wired to reloaded protected custody, rejects orphan completion/missing prepared bytes, forbids transport/credential dependencies, journals recovery, and remains zero-HTTP. |
| `A11-R8-007` | `CLOSED` | The frozen composite key includes item ID, finding ID, family and code; the same local finding ID is accepted on distinct items. |
| `A11-R8-008` | `CLOSED` | Exact A07 closeout receipt/log were added together at the direct child of registration and bind source, registration, roots, 52/0/0, upstream, clean state, omissions and `REVIEWED_COMMIT`. |
| `A11-R9-001` | `CLOSED` | The final-adapter phase assertion accepts the valid pre-review A07-closeout stop while still proving zero credential reads and zero HTTP. |

## Independent recomputation and tests

- The A11 verifier uses Node built-ins and immutable Git objects only. It imports none of the A07 builder, primary runner, activation guard, scorer, statistical kernel, decision engine, or provider adapter.
- It independently reconstructed a 229-path production closure with 495 relative-import edges and a 261-path registered test closure; manifests, byte lengths, SHA-256 values, production/test/import/enumeration roots and current registered bytes matched exactly.
- It independently verified the single-add registration, exact source → registration → closeout parent chain, R9 supersession/failure receipt, frozen bindings, provider tuples, zero authority, identity anchor, and A07 closeout.
- Independent verifier result: 13 verified checks and 2 expected actionable mismatches, exit `0` under its explicit `DISCREPANCY` contract.
- A11 adversarial boundary suite: `10 passed / 0 failed / 0 skipped`.
- Fresh exact 14-entrypoint registered offline suite: `52 passed / 0 failed / 0 skipped / 0 cancelled / 0 todo` in `2,154,476.873542 ms`. This independently repeated the immutable A07 closeout result; it did not exercise the incompatible V5-R10 native seal builder identified above.
- The review receipt and exact signature payload validate against `IndependentExecutionRunnerReviewReceiptV8`; the Ed25519 signature verifies against the pinned public identity. The protected private key was used programmatically once, remained mode `0600`, and was not printed, copied, committed, or returned.

## Seven registered review artifacts and process evidence

All seven registration-required review paths are first-added together in the eventual A11 direct-child review commit. The review receipt is deliberately `DISCREPANCY`, so the production loader must reject it as an activation gate; the artifacts must not be overwritten to manufacture concurrence.

- `independent-runner-review-receipt.json`
- `verifier-source-manifest.json`
- `dependency-lock-manifest.json`
- `independent-static-import-graph-receipt.json`
- `forbidden-primary-scorer-path-scan-receipt.json`
- `independent-command-runtime-receipt.json`
- `independent-source-enumeration-receipt.json`

Process evidence root: `d52c33695f4eb5924cbbfc9304ff392587b31af6f12bd159d8c830eeeafa983a`.

## Proved boundary and activity accounting

- Provider credentials, environment values, `.env*`, and `All API Keys.docx` read: `0`.
- Protected natural-question artifacts and natural-question bodies read: `0`.
- OpenAI / DeepSeek / provider API / HTTP / route-probe calls: `0`.
- Natural-question egress: `0`.
- Provider tokens / attempts / USD authorized or consumed: `0 / 0 / 0`.
- Reference labels / natural-question results produced: `0 / 0`.
- Live question bank, app, API, deployment, R10 source, registration, and closeout mutations: `0`.

The separately authorized Git push carries only review evidence; it is not provider activity or natural-question egress.

This review proves a preserved, authentic offline registration was independently examined and remains blocked. It does not prove credentials, account/billing/region facts, endpoint availability, model identity, provider behavior, natural-question accuracy, deployment readiness, human validity, or generalized machine-QA effectiveness.

The California-60 claim ceiling remains unchanged. No current or future CA60 result under this registration may be reported as `PASS`, `APPROVED`, `PRODUCTION_READY`, or `LIMITED_GENERALIZATION_EVIDENCE`; the normal maximum after a valid complete run remains `INCONCLUSIVE_MACHINE_REFERENCE`.
