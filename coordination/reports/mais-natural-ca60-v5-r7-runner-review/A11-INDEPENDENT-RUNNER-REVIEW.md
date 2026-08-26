# A11 independent offline runner review — MAIS-NATURAL-CA60-V5-R7

## Decision

`DISCREPANCY`

The immutable V5-R7 registration is authentic as a Git-object package, and R7 materially improves semantic dispatch, canary/C0 construction, raw-response reconstruction, command journaling, aggregate recomputation, and zero-authority defaults. It is nevertheless not implementation-ready for a first provider request. A11 independently confirmed eight actionable findings: five critical, two high, and one medium.

The blocking defects are not point-estimate disagreements. The registered scorer still cannot implement the frozen 57–60-item unified-nonresolved protocol, uses the wrong bootstrap PRNG/statistical kernel, cannot persist an authoritative terminal `EXECUTION_INTEGRITY_FAILED` decision, and does not materialize the required 60 sealed item results. In addition, the activation path can accept a caller-sealed fake A11 concurrence and caller-authored route/account/billing/region/price/probe evidence.

This review does not authorize credential access, provider calls, natural-question egress, tokens, attempts, or USD. V5-R7 remains immutable and provider execution remains blocked. Any remediation requires a new append-only V5-R8 registration and another fresh A11 review.

## Reviewed immutable identity

| Binding | Independently verified value |
| --- | --- |
| Registration commit | `aa07d9b72cf06fbcf100ed0f6bf358fedd94222d` |
| Direct-parent runner source commit | `237413734a41431e51c8a29ecef6628b67bbafb1` |
| Registration self-hash | `97b65940b0573064b4d1206e1f80dfb555c1a41e6c782e7439f9ec53df66b003` |
| Production source root | `7657d0f6682da71d7935405dfb3dd5c899b2f96735042f9639431dc3900b1bf7` |
| Test source root | `f5f3f9b88c4851d2adbb5f8792aaf7646d091b30db3697eb6f1e93be81b37c00` |
| Transitive import-closure root | `d68081aabcb3b6a738117970607f9d9edf240ef3dd04fdbdfabd73b29a2b4866` |
| V5-R6 registration superseded | `2e178ea6680974d358830a2b3f71e0ccbaa7827793b972bb2ae10fd2aaed994f` |
| Bound V5-R6 A11 discrepancy receipt | `e86623510105b80736298206b26e94ddd5b7b727861d0212fd52cfde4592cf33` |
| Owner offline-implementation authorization text hash | `8f9767f1bb087656d57ab7885f621ef449eff61ea89aaead8bd34bf27f30f74f` |
| This A11 V5-R7 review receipt self-hash | `20d261e83982b29323383eec56c1df99e4f6b45fa7051482a47860e8bcaadd91` |

The independent verifier uses Node built-ins and immutable Git object bytes. It does not import the A07 registration builder, source-closure implementation, runner, activation/authorization guard, scorer, or decision engine. It verified `23/23` checks with zero mismatches: exact single-add path history, direct parent, source lineage, self-hash, all 178 production rows, all 201 test rows, 14 production entry points, 404 relative-import edges, all three roots, zero current-byte drift, exact V5-R6 supersession/review binding, frozen design/frame/sample/rights/privacy/taxonomy/threshold/P0-P2/decision-ceiling bindings, component hashes, provider tuples, zero authority/activity, claim ceiling, and inclusion of the A07 session log.

The exact provider tuples registered in zero-authority state are:

- OpenAI reference: `OPENAI_DIRECT` / `gpt-5.6-luna` / `https://us.api.openai.com/v1/responses` / `US_STORAGE_PROCESSING`.
- DeepSeek evaluation: `DEEPSEEK_DIRECT` / `deepseek-v4-pro` / `https://api.deepseek.com/chat/completions`; residency is still `UNRESOLVED`, so the immutable registration is not live-dispatch eligible.

Git-object authenticity proves which bytes were registered. It does not prove those bytes correctly implement the frozen design; the adversarial review below evaluates that separate boundary.

## Severity-ranked actionable findings

### Critical

#### `A11-R7-001` — Frozen 57–60-item unified-nonresolved analysis and per-item result custody are not implemented

The frozen design permits integrity-valid cases such as `57 complete + 3 missing` and `59 complete + 1 missing + 2 unresolved`, requires a single unified nonresolved universe, exact feasible surface worlds, unidentified `[0,1]` finding bounds when reference findings are unresolved, and forbids imputation ([design registration](../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json), lines 1148–1173 and 2002–2017). R7 instead requires a `COMPLETE_VALID` graph and the exact full `120 + 5×|C0|` successful-call count before scoring ([runtime](../../content-qa/mais-natural-ca60-v1/runner-v5-r7-runtime.mjs), lines 1125–1140). Therefore every frozen-valid 57–59-item case is rejected before the registered analysis can run.

Even in a nominal 60-item path, a machine-output reduction error increments a counter but substitutes `machineFindings=[]`; unresolved reference labels stay in ordinary item rows, and reference/machine counts are summed even when the same item can occupy both categories ([scorer verifier](../../content-qa/mais-natural-ca60-v1/scorer-verifier-v5-r7.mjs), lines 147–197). The inherited V3 scorer then treats empty findings as observed TN/FN rather than enumerating feasible worlds. This conflicts with the emitted `missingDataImputedAsNegative: false` claim.

R7 also persists only the scoring input, base aggregate, and aggregate receipt, then hardcodes `naturalQuestionResultCount: 60`; it creates neither 60 sealed `ItemEvaluationResultV1` artifacts nor item completion markers ([runtime](../../content-qa/mais-natural-ca60-v1/runner-v5-r7-runtime.mjs), lines 1187–1204). The frozen cross-artifact contract requires exact item lineage, complete markers, and 60 item results.

Required remediation: implement the unified 60-item state model; accept only the registered 57–60 integrity-valid combinations; never coerce nonresolution to negative; materialize sealed item-result/completion artifacts; exhaustively enumerate the bounded surface worlds; return `[0,1]/UNDERPOWERED` for unidentified reference-finding estimands; and prove no item is double-counted.

#### `A11-R7-002` — The registered statistical kernel and deterministic matching order diverge from the frozen method

`scorer-verifier-v5-r7.mjs` delegates to `scoreNaturalCaV5R3` ([lines 200–238](../../content-qa/mais-natural-ca60-v1/scorer-verifier-v5-r7.mjs)). That kernel seeds a stateful PRNG from only the first 32 hash bits and advances a Mulberry-style integer state; its bootstrap returns only family, exact, and precision bounds ([V3 scorer](../../content-qa/mais-natural-ca60-v1/scorer-v5-r3.mjs), lines 34–115). It also uses ordinary locale string ordering for tie resolution.

The frozen design requires metric-separated counter-based SHA-256 with rejection sampling, three fixed golden vectors (`8`, `13`, `21`), 10,000 item-cluster replicates, and the most conservative Wilson/bootstrap/worst-case bound for every applicable endpoint, including P1 and P2 ([design registration](../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json), lines 1086–1125). R7 has no implementation or registered negative test for those vectors, P1/P2 bootstrap coverage, or frozen code-sort-order tie resolution.

Required remediation: replace the inherited scorer with an independently testable V5-native implementation of the literal PRNG, rejection algorithm, golden vectors, frozen one-to-one matching/tie order, Wilson intervals, all required cluster-bootstrap metrics, missing-data worlds, endpoint states, and decision precedence.

#### `A11-R7-003` — Terminal execution failure cannot produce an authoritative `EXECUTION_INTEGRITY_FAILED` receipt

When scoring evidence is incomplete, the runtime returns an unsealed `INCOMPLETE_EXECUTION_NO_METRIC_INFERENCE` object plus a `terminalEvidenceCode`; it does not append a score, final-evaluation, or decision receipt ([runtime](../../content-qa/mais-natural-ca60-v1/runner-v5-r7-runtime.mjs), lines 1162–1185). `verify` then requires an existing aggregate score and cannot reconstruct the terminal result (lines 1210–1237). The CLI command receipt does not retain `terminalEvidenceCode`.

The frozen decision policy requires `EXECUTION_INTEGRITY_FAILED` for fewer than 57 complete receipts, more than three unified nonresolved/invalid items, or provider/network failure preventing completion ([design registration](../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json), lines 1199–1207). A blocked in-memory command result is not an authoritative final research decision.

Required remediation: deterministically derive and append a closed terminal evidence/decision receipt from immutable ledger and attempt-graph evidence; make `verify` independently reconstruct it; preserve the exact terminal cause through the command journal and CLI receipt; and never infer metrics for an integrity-failed run.

#### `A11-R7-004` — A minimal caller-sealed fake A11 concurrence satisfies the activation prerequisite

The frozen design requires process evidence for the verifier source tree, dependency lock, static import graph, forbidden-primary-scorer scan, command runtime, baseline commit, recomputed source enumeration, and independent enumeration receipt ([design registration](../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json), lines 2020–2031). `IndependentExecutionRunnerReviewReceiptV5` contains none of those fields and forbids additional fields ([review schema](../../content-qa/mais-natural-ca60-v1/schemas/IndependentExecutionRunnerReviewReceiptV5.schema.json), lines 5–31). The production validator checks only self-hash, `CONCURRED/0`, exact registration roots, the eleven prior IDs, and chronology ([execution evidence](../../content-qa/mais-natural-ca60-v1/execution-evidence-v5-r7.mjs), lines 279–294).

The A11 adversarial suite independently constructed a minimal self-hashed `CONCURRED` receipt with none of the eight required process fields. Production validation returned `[]`. Because public `register --review` adopts that receipt, the independent-review gate is locally forgeable.

Required remediation: define a new closed review schema that binds every frozen process-evidence root and an independently trusted reviewer/custody identity; load and recompute the referenced evidence; reject merely caller-self-hashed concurrence; and migrate the workflow index append-only.

#### `A11-R7-005` — Route/account/billing/region/price/probe evidence remains caller-authored

Capture accepts any nonempty caller-supplied hostname and a subject hash copied from caller-supplied JSON ([evidence attestation](../../content-qa/mais-natural-ca60-v1/evidence-attestation-v5-r7.mjs), lines 62–86). Probe authorization/raw/binding/request references need only be hash-shaped and are never loaded or rebuilt (lines 89–130). Owner attestation accepts any nonempty `attestedBy` and ordinary self-hash (lines 134–153), without a signature or trusted owner-decision root.

The A11 adversarial suite constructed arbitrary local JSON claims, repeated-character hashes, a `caller://` locator, and `attestedBy: "OWNER"`; production validation accepted the bundle as `OWNER_ATTESTED_PARSED_RAW_SOURCES_PLUS_GUARDED_ZERO_CONTENT_PROBE`. Thus console/account identity, direct billing, region, rates, and route-probe authenticity are still assertions rather than independently authenticated evidence. This recurs `A11-R6-004`.

Required remediation: require independently retrievable and authenticated source bytes/attempt receipts; bind an exact provider account/project and direct-billing subject; validate trusted owner authorization; rebuild the zero-content probe from its guarded request/event/raw/binding chain; and treat unavailable provenance as unresolved rather than confirmed.

### High

#### `A11-R7-006` — Interrupted attempt custody has no public reconciliation path

The atomic ledger contains an internal `recoverIntentBoundCompletion` method requiring exact recovery authorization ([ledger](../../content-qa/mais-natural-ca60-v1/atomic-execution-ledger-v5-r7.mjs), lines 250–290), but neither the public CLI nor runtime exposes a recovery/reconciliation transition ([CLI](../../content-qa/mais-natural-ca60-v1/runner-v5-r7-cli.mjs), lines 13–29 and 159–207). A crash can therefore leave an active reservation, an intent-bound completion awaiting ledger insertion, or a durable completion without the final resolved-attempt receipt. `--resume` does not reconcile these states.

The last case is particularly unsafe: later planning can see a successful compatibility completion and dispatch a later role before attempt-graph reconstruction rejects the missing resolved receipt. A custody gap must fail closed before any new HTTP activity, not only at later scoring.

Required remediation: expose an explicit owner-authorized, zero-HTTP reconciliation command; reconstruct intent/completion/resolved-receipt state from protected custody; bind a journaled recovery receipt; reject every later dispatch until reconciliation completes; and add crash injection after reservation, intent, completion, and final receipt.

#### `A11-R7-007` — Attempt-graph reconstruction accepts dangling evidence as `COMPLETE_VALID`

R7 maps requests, audits, permits, raw artifacts, bindings, intents, and resolved receipts, but validates only objects reached from ledger reservations. Its orphan check covers only resolved receipts ([attempt graph](../../content-qa/mais-natural-ca60-v1/attempt-graph-v5-r7.mjs), lines 110–150 and 319–327). The A11 adversarial test passed an empty ledger plus one `{selfHash, fabricated:true}` raw artifact; the production reconstructor returned `graphStatus = COMPLETE_VALID` and no lineage errors.

This violates the frozen rule that extra, duplicated, unauthorized, or unbound attempts/evidence fail closed. The receipt may hash the dangling collection root, but it labels the graph complete rather than rejecting the unexplained evidence.

Required remediation: require exact bidirectional set equality between ledger/event edges and every supplied evidence collection; reject all unreferenced request/audit/permit/raw/binding/intent/output/completion/receipt artifacts; and add orphan tests for each type.

### Medium

#### `A11-R7-008` — The registered A07 session log is not a completed closeout record

The repository contract requires changed files, run and omitted checks, assumptions, risks, blockers/follow-up, a final-state enum, and a worktree lifecycle action ([AGENTS.md](../../../AGENTS.md), lines 237–247). Provider changes must run `npm run type-check`, or record why it was not run and the remaining risk (lines 349 and 358).

The registered A07 log records pre-registration `40 passed / 0 failed / 2 skipped`, then leaves the post-registration suite and loader rerun as a future handoff step ([A07 log](../../session-logs/2026-08-26-A07-mais-natural-ca60-v5-r7.md), lines 34–51). It omits the exact final source/registration commits and roots, files-changed inventory, omitted-check reason, assumptions, risks, final-state enum, and lifecycle action. It also does not record type-check or why it was omitted. This only partially closes `A11-R6-011`.

Required remediation: preserve the immutable R7 source/registration and append a complete A07 closeout record to the next superseding slice, including exact identities, check results/omissions, risks, final disposition, upstream, and worktree action.

## Reassessment of all V5-R6 findings

| V5-R6 finding | V5-R7 disposition |
| --- | --- |
| `A11-R6-001` normal canary/C0 and complete score unreachable | Partially closed. Normal canary/C0 construction exists, but frozen 57–60 scoring, unified nonresolution, native statistics, item results, and terminal receipt remain open as `A11-R7-001`–`003`. |
| `A11-R6-002` C0 dispatch bypass | Closed for the reviewed semantic authority and selected-set path. Exact C0 membership is rebuilt at the core permit boundary. |
| `A11-R6-003` fabricated aggregate verify | Structural aggregate fabrication is closed: `verify` recomputes from raw evidence. The native scoring method it recomputes is nevertheless wrong (`A11-R7-001`, `002`). |
| `A11-R6-004` caller-authored route evidence | Recurs as `A11-R7-005`. |
| `A11-R6-005` raw custody and atomic completion | Raw replay/seal authority is materially closed; interrupted completion/resolved-receipt reconciliation remains open as `A11-R7-006`. |
| `A11-R6-006` false zero-activity command receipts | Closed for the reviewed journal paths. Unknown activity fails closed rather than becoming exact zero. |
| `A11-R6-007` transition journal erases durable transition | Closed for the reviewed write-ahead/multi-transition path. |
| `A11-R6-008` fresh-review adoption unreachable | CLI adoption is reachable, but the accepted review object is forgeable (`A11-R7-004`). |
| `A11-R6-009` incomplete attempt graph | Materially improved, but dangling evidence is still accepted (`A11-R7-007`). |
| `A11-R6-010` cost preview declaration only | Cost arithmetic and 20% buffer are closed; price/account/route provenance remains untrusted (`A11-R7-005`). |
| `A11-R6-011` missing A07 log | A log is now included in the registered test manifest, but it is not a completed closeout (`A11-R7-008`). |

## Independent review axes

The required Standards and Specification axes were performed independently and are presented separately. The synthesis above maps overlapping defects to stable A11-R7 IDs; it does not silently re-rank or suppress either axis.

### Standards axis

Decision: `DISCREPANCY`.

It reported:

1. Critical — frozen 57–59/nonresolved analysis is unreachable and nonresolution is coerced to negative (`A11-R7-001`).
2. Critical — the counter-SHA256/bootstrap/tie-order contract regressed to the V3 kernel (`A11-R7-002`).
3. Critical — route evidence remains caller-authored (`A11-R7-005`).
4. High — the graph accepts dangling evidence (`A11-R7-007`).
5. High — the A11 receipt omits mandatory independent process evidence (`A11-R7-004`; synthesized as Critical because it can unlock later credential access).
6. Medium — the A07 closeout log remains incomplete (`A11-R7-008`).

The Standards axis also confirmed zero-authority defaults, absent live bindings, immutable registration history, and the exact OpenAI/DeepSeek tuples.

### Specification axis

Decision: `DISCREPANCY`.

It reported:

1. Critical — complete/terminal scoring does not implement the frozen 57–60 protocol, missing-data worlds, native statistics, item results, or final integrity receipt (`A11-R7-001`–`003`).
2. Critical — fresh A11 concurrence is self-forgeable (`A11-R7-004`).
3. Critical — route/probe/owner evidence is parsed but not authenticated (`A11-R7-005`).
4. High — interrupted attempt recovery is not publicly reachable (`A11-R7-006`).

The Specification axis separately confirmed material fixes in semantic dispatch, canary/C0 selection, A/B/adjudication blindness, DeepSeek reference blindness, raw replay, journal accounting, and aggregate recomputation.

## Offline verification results

| Check | Result |
| --- | --- |
| Independent Git-object verifier | `23/23` verified; `0` mismatch |
| Registered V5-R7 fast fixture suites | `42/42` passed; `0` failed/skipped/todo |
| Registered raw-reference fixture | A11 targeted the 4-attempt partial path: `1/1` passed; the full 240-attempt case was not rerun by A11 and root/A07 evidence is excluded from A11 totals |
| A11 adversarial boundary suite | `8/8` passed; `0` failed/skipped/todo; each green test reproduces a discrepancy boundary |
| Production/test/closure counts | `178 / 201 / 404` |
| Current registered-byte drift | `0` production paths; `0` test paths |
| Registration path mutation count | `1`, exact single add |

The registered suite being green is not a concurrence signal: registered fixtures intentionally accept the caller-authored route and minimal review constructions that the A11 adversarial suite proves unsafe.

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

V5-R7 must not produce `PASS`, `APPROVED`, `PRODUCTION_READY`, or `LIMITED_GENERALIZATION_EVIDENCE`. It has executed no natural question and produced no natural-question result. Even a future valid CA60 run remains capped at `INCONCLUSIVE_MACHINE_REFERENCE` under the frozen structural-power and decision-ceiling rules.

Preserve the V5-R7 source, registration, and this `DISCREPANCY` receipt. A07 should remediate only in a new source commit and append-only V5-R8 registration, then request a fresh independent A11 review. No credential access, egress authorization, token/attempt/USD grant, canary, or provider call may proceed on V5-R7.
