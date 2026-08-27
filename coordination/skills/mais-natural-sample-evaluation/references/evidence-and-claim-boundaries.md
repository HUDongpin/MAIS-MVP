# Evidence and Claim Boundaries

Status: **normative**. `assets/natural-evaluation-state.schema.json` is the self-contained machine-readable companion.

## Common EvidenceEnvelopeV1

The common interface is preserved exactly:

- `schemaVersion: "1.0"`, string `skill`, string `mode`, and canonical UTC-millisecond `observedAt`;
- closed nullable `repository: {head, branch, clean}`;
- `evidenceClass: "natural-sample-evaluation"`;
- nonempty `sourceIdentity[]`, each closed to `logicalId`, optional lowercase SHA-256, and optional 40-character commit;
- string `resolvedState`;
- closed `authority: {required[], proven[], missing[], expiresAt?}`;
- closed `checks: [{id,status,evidenceRef?}]`, with common status `pass|fail|blocked|unknown`;
- fixed Natural `blockers[]`, string `claimCeiling`, string `nextAllowedAction`, unique lowercase `evidenceHashes[]`;
- closed `redaction` with `protectedContentIncluded:false`, `credentialsIncluded:false`, and `rawProviderResponsesIncluded:false`.

`observedAt` and every expiry/issue timestamp use `YYYY-MM-DDTHH:mm:ss.sssZ`. The semantic validator rejects impossible calendar dates and future observations even if a string matches the regex.

The common identifier definitions remain broad for suite parity. A Natural semantic overlay constrains source logical IDs, authority codes, check IDs, evidence references, blockers, lifecycle states, actions, roles, conclusions, and provenance to positive enums or hash-ref grammars. Arbitrary `PASS`, `APPROVED`, release, promotion, deploy, live, or ship synonyms are not accepted as Natural state truth.

## Closed Natural Extension

The extension requires:

- `protocol`, `sourceRights`, `frame`, `sampleFreeze`, and `runner`;
- `reference` and `evaluated` provider phase state;
- `materialCurrentness.registeredBindings/currentBindings`, first-activity evidence, and invalidated registrations;
- `runProvenance: natural-registered|synthetic-fixture` and a hash-bound `registeredInferenceFrame`;
- reconciled overall and per-phase `activity`;
- provenance-bound `result` and `metrics`;
- four arms of `independentReview`;
- result/claim/provenance-bound `aggregateExport`;
- append-only `receiptGraph` nodes with exact subject and binding digest.

Every nonnull SHA-256 field and hash-valued evidence reference must appear in `evidenceHashes`, and every declared evidence hash must be bound somewhere in the packet. Coverage is exact in both directions; it does not replace semantic receipt binding.

## Receipt and Review Boundaries

For every milestone, all three must agree:

1. the active graph node receipt and binding digest;
2. the mapped top-level receipt/status;
3. the current exact artifact identity.

`CONCURRED` always requires `signatureStatus: VERIFIED`, a nonnull receipt, a nonnull identity anchor equal to the graph anchor, and a reviewed-bindings digest for the applicable current freeze/runner/result/claim artifact. `OBJECTED` uses the same complete signed-evidence projection. `PENDING` is exactly null hashes plus `MISSING`; `NOT_REQUIRED` is exactly null hashes plus `NOT_REQUIRED`. `BLOCKED` is either the complete null/`MISSING` projection or a complete verified signed-evidence projection—never a half-signed hybrid.

Only `CONCURRED` advances the corresponding positive milestone. A signed `OBJECTED` or an applicable signed/unsigned `BLOCKED` outcome resolves to `UNREVIEWABLE` with `STOP_BLOCKED`; it leaves freeze at `FROZEN`, runner at `CLOSEOUT_RECORDED`, and export at `NOT_REQUESTED` as applicable. The outcome is part of the immutable review receipt body. No later positive lifecycle milestone may follow a negative review receipt.

Reviewer separation is role-driven across every active signer whose role ends in `_REVIEWER`, including `CUSTODY_HANDOFF_REVIEWER`. Reviewer identity anchors must be pairwise distinct and must not equal any active provider-preflight, provider-execution, or aggregate-export `_AUTHORIZER` anchor.

The identity anchor proves only the review artifact binding. It does not prove government identity, independent human gold, provider authority, or content correctness outside the registered review scope.

## Activity and Result Evidence

Overall attempts, completed calls, and egress are either known nonnegative counts with a current `ACTIVITY_SUMMARY` receipt or `known:false,count:null,receiptSha256:null`. The reference, evaluated-canary, and evaluated-full-run ledgers separately record reservations, attempts, completions, egress, tokens, USD cost, and peak concurrency. A known phase metric must equal graph-event totals and cite that phase's current reconciliation receipt. Evaluated canary and full run share one grant cap, so their usage is also checked in aggregate.

Known zero is not an assertion. It is accepted only when reference and evaluated zero reconciliation nodes precede a current activity summary. Reservation-only interruption remains unknown and blocks resume, score, and export. Causal inequalities are checked at every append-only phase prefix—not merely at the final total: attempts may never exceed reservations, and completions or egress may never exceed attempts. Reconciliation is terminal for that phase lineage; a later phase event invalidates it.

Natural results bind the current material digest, registered inference-frame hash, score/result receipts, result conclusion, metrics manifest, sample size, success/failure counts, and `natural-registered` provenance. Aggregate authorization additionally binds the sealed result receipt, claim-review digest, natural metrics provenance, aggregate metrics digest, allowlist, and publication decision.

`synthetic-fixture` may validate structure only. It cannot produce a closed natural result, final natural review, claim review, or aggregate export.

## Safe Validator and Output

Run:

```sh
node scripts/verify-evidence-envelope.mjs PACKET.json
```

The validator is dependency-free, offline, and read-only. It rejects unknown properties, unsafe fields, malformed hashes/times, positive-grammar violations, graph or receipt drift, top-level/graph inconsistency, material drift reuse, invalid provider grants, custody mismatch, unknown-as-zero activity, stale reconciliation, cap exceedance, review/identity mismatch, provenance drift, and ceiling overclaim.

Output contains fixed issue codes and trusted paths only. An unknown or protected key is reported at a trusted parent or `#[redacted]`; neither its name nor value is echoed. Every successful or blocked CLI output declares `contentAddressScope: packet-local-internal-closure`, `issuerAuthenticity: not-verified-by-offline-validator`, and `providerAuthorityGranted: false`. Resolver authority counts are named `declaredAuthority`; they summarize packet declarations and never assert external proof. Safe exports omit branch/source/provider/custody identities and return only aggregates, states, hashes, and explicit false redaction flags.

## Proof Boundaries

- clean Git identity does not prove runtime frame correctness;
- registration does not prove activation, freshness, or execution authority;
- freeze rights do not authorize provider egress, credentials, or spend;
- credential presence does not prove route/model entitlement;
- preflight never authorizes natural-text egress;
- runner concurrence does not prove provider behavior;
- reference seal is machine reference, not human gold;
- canary is not full-run, score, review, or export proof; its activity and reconciliation cannot be reused for the full-run receipt;
- score is not final review or publication authority;
- a natural aggregate does not accept sampled or unsampled items;
- this evidence never proves promotion, regression, release, deployment, or live behavior.

## Claim Ceiling and Routing

`claimCeiling` must equal the immutable registered ceiling. Values are `NO_EVALUATION_CLAIM`, `INCONCLUSIVE_MACHINE_REFERENCE`, and `AGGREGATE_MACHINE_REFERENCE_ONLY`. `resultConclusion` may not exceed it. The protocol registration and registered inference frame must bind the same design-profile identifier, immutable power-artifact hash, and ceiling. A dated project's ceiling is evidence about that registration only; it is not a family-name hard-code and does not constrain a successor design with a new registration.

Before a `PROTOCOL_REGISTRATION` receipt exists, the only publishable ceiling is `NO_EVALUATION_CLAIM`. Any design-profile or power-analysis values present in an unregistered packet are non-authoritative planning inputs; they are not a registered claim and the resolver must not present a nontrivial ceiling from them.

Route exact candidate machine QA to RSI, question correctness/rights to A18, candidate promotion to A23, product regression to A11, and release/deployment/live proof to A22. Natural evaluation evidence can be a bounded input; it cannot replace those owners' evidence.
