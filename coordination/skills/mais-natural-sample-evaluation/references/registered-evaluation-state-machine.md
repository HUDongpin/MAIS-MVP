# Registered Evaluation State Machine

Status: **normative**. This contract is version-agnostic. Historical round names or repository labels never define state.

## Modes

Begin with `AUDIT_STATUS` unless the request and current receipt lineage support one narrower mode:

1. `AUDIT_STATUS` resolves evidence and blockers without mutation.
2. `DESIGN_OR_FREEZE` registers protocol/source/frame/sample evidence. Provider egress is forbidden.
3. `PROVIDER_PREFLIGHT` verifies redacted route/readiness evidence. Natural-text egress is forbidden.
4. `EXECUTE_OR_RESUME` describes eligibility to delegate to the exact repository runner after an exact fresh grant and full custody chain.
5. `RECOVER` reconciles activity with zero HTTP.
6. `SCORE_REVIEW_EXPORT` scores, reviews, and validates a strict aggregate.

The four bundled scripts remain offline and read-only in every mode. A mode is an intent boundary, not authorization.

## Normal Lifecycle and Exact Next Gate

| Receipt milestone | Resolved state | Exact next allowed action |
|---|---|---|
| none | `UNREGISTERED` | `REGISTER_PROTOCOL` |
| `PROTOCOL_REGISTRATION` | `PROTOCOL_REGISTERED` | `ACTIVATE_PROTOCOL` |
| `PROTOCOL_ACTIVATION` | `PROTOCOL_ACTIVATED` | `PIN_SOURCE_BASELINE` |
| `SOURCE_BASELINE` | `SOURCE_BASELINE_PINNED` | `AUTHORIZE_SOURCE_RIGHTS` |
| `SOURCE_RIGHTS` | `RIGHTS_AND_LINEAGE_AUTHORIZED` | `VERIFY_FRAME_READINESS` |
| `FRAME_READINESS` | `FRAME_READINESS_VERIFIED` | `FREEZE_FRAME_AND_SAMPLE` |
| `FRAME_FREEZE` | `FRAME_FROZEN` | `FREEZE_FRAME_AND_SAMPLE` |
| `SAMPLE_FREEZE` | `SAMPLE_FROZEN` | `RUN_INDEPENDENT_FREEZE_REVIEW` |
| `FREEZE_REVIEW` | `FREEZE_INDEPENDENTLY_VERIFIED` | `REGISTER_RUNNER` |
| `RUNNER_REGISTRATION` | `RUNNER_REGISTERED` | `RUN_RUNNER_CLOSEOUT` |
| `RUNNER_CLOSEOUT` | `RUNNER_CLOSEOUT_RECORDED` | `RUN_INDEPENDENT_RUNNER_REVIEW` |
| `RUNNER_REVIEW` | `RUNNER_INDEPENDENTLY_VERIFIED` | `CREATE_CONTROLLED_CUSTODY_HANDOFF` when custody contexts differ; otherwise `REQUEST_REFERENCE_PREFLIGHT_AUTHORIZATION` |
| conditional `CUSTODY_HANDOFF` | `CUSTODY_HANDOFF_VERIFIED` | `REQUEST_REFERENCE_PREFLIGHT_AUTHORIZATION` |
| `REFERENCE_PREFLIGHT` | `REFERENCE_PREFLIGHT_AUTHORIZED` | `REGISTER_REFERENCE_ROUTE_EVIDENCE` |
| `REFERENCE_ROUTE` | `REFERENCE_ROUTE_TRUSTED` | `REQUEST_REFERENCE_EXECUTION_AUTHORIZATION` |
| `REFERENCE_AUTHORIZATION` | `REFERENCE_EXECUTION_AUTHORIZED` | `RUN_REFERENCE_LABELING` |
| `REFERENCE_LABELING` | `REFERENCE_LABELING_COMPLETE` | `SEAL_REFERENCE` |
| `REFERENCE_SEAL` | `REFERENCE_SEALED` | `REQUEST_EVALUATED_PREFLIGHT_AUTHORIZATION` |
| `EVALUATED_PREFLIGHT` | `EVALUATED_PREFLIGHT_AUTHORIZED` | `REGISTER_EVALUATED_ROUTE_EVIDENCE` |
| `EVALUATED_ROUTE` | `EVALUATED_ROUTE_TRUSTED` | `REQUEST_EVALUATED_EXECUTION_AUTHORIZATION` |
| `EVALUATED_AUTHORIZATION` | `EVALUATED_EXECUTION_AUTHORIZED` | `FREEZE_EVALUATED_EXECUTION_REGISTRATION` |
| `EVALUATED_EXECUTION_REGISTRATION` | `EVALUATED_EXECUTION_REGISTRATION_FROZEN` | `RUN_EVALUATED_CANARY` |
| `EVALUATED_CANARY` | `EVALUATED_CANARY_COMPLETE` | `RESUME_EVALUATED_RUN` |
| `EVALUATED_RUN` | `EVALUATED_RUN_COMPLETE` | `RECONCILE_ACTIVITY_OFFLINE` |
| current phase reconciliations plus `ACTIVITY_SUMMARY` | `ACTIVITY_RECONCILED` | `SCORE_RESULTS` |
| `SCORE` | `SCORED` | `SEAL_RESULT` |
| `RESULT_SEAL` | `RESULT_SEALED` | `RUN_FINAL_INDEPENDENT_REVIEW` |
| `FINAL_REVIEW` | `FINAL_INDEPENDENT_REVIEWED` | `RUN_CLAIM_BOUNDARY_REVIEW` |
| `CLAIM_REVIEW` | `CLAIM_BOUNDARY_REVIEWED` | `REQUEST_AGGREGATE_EXPORT_AUTHORIZATION` |
| `AGGREGATE_EXPORT_AUTHORIZATION` | `AGGREGATE_EXPORT_AUTHORIZED` | `EXPORT_REDACTED_AGGREGATE` |
| `AGGREGATE_EXPORT` | `CLOSED` | `CLOSE` |

The four review milestones in this table describe only a `CONCURRED` outcome. `OBJECTED` and an applicable `BLOCKED` outcome are terminal for the current registration: resolve `UNREVIEWABLE`, allow only `STOP_BLOCKED`, preserve the last pre-approval content/runner/result state, and do not append a later positive milestone. A null/`MISSING` `BLOCKED` projection is valid only when that exact review is the next applicable gate; a signed `BLOCKED` or `OBJECTED` receipt must carry the same current receipt, signature, identity-anchor, and reviewed-binding closure required for `CONCURRED`.

Auxiliary `MATERIAL_CURRENTNESS`, phase reservation/attempt/completion/egress/reconciliation, and `ACTIVITY_SUMMARY` nodes do not let a packet skip a milestone. Evaluated canary and full run use different activity kinds, phase projections, and reconciliation receipts. Canary activity and its reconciliation must precede `EVALUATED_CANARY`; every full-run reservation, attempt, completion, and egress must occur strictly after that canary receipt and before a distinct full-run reconciliation, which must precede `EVALUATED_RUN`. The run receipt binds the canary receipt, full-run reconciliation, and full-run coverage digest. A future status, future receipt, or future action on a truncated graph is invalid. A complete graph paired with a `NOT_STARTED` top-level field is also invalid.

## Exception States

Closed positive enums include `MATERIAL_REFREEZE_REQUIRED`, `BLOCKED_MISSING_EVIDENCE`, `BLOCKED_AUTHORITY`, `BLOCKED_ROUTE_AUTHENTICITY`, `BLOCKED_CUSTODY`, `BLOCKED_DIRTY_SOURCE`, `BLOCKED_SEQUENCE`, `INTERRUPTED_RECONCILIATION_REQUIRED`, `INVALID_HASH_OR_SIGNATURE`, `UNREVIEWABLE`, and `NEW_REGISTRATION_REQUIRED`.

A complete receipt graph does not override a blocker. Terminal semantic blockers, declared blockers, or non-passing checks must lower the effective state from `CLOSED`; they may never leave `CLOSE` as the next action. Missing external evidence maps to `BLOCKED_MISSING_EVIDENCE` / `SUPPLY_MISSING_EVIDENCE`; exhausted execution caps map to `BLOCKED_SEQUENCE` / `STOP_BLOCKED`.

`RECOVER` always maps to `RECONCILE_ACTIVITY_OFFLINE`. Expired execution authority maps to `BLOCKED_AUTHORITY` and `RENEW_PROVIDER_GRANT`, including in `AUDIT_STATUS`; audit mode cannot turn stale authority into fresh authority.

## Receipt-Lineage Truth

`receiptGraph` is append-only and direct-parent linear in the safe envelope:

- sequence starts at zero;
- the first parent is null;
- every later parent equals the immediately prior receipt hash;
- each node has a fixed `subject` and `bindingDigestSha256` computed from the exact top-level artifact it attests;
- every milestone receipt equals its mapped top-level receipt field;
- graph presence and all top-level statuses/receipts are bidirectionally consistent;
- signed review/authorization nodes require `VERIFIED` plus an identity-anchor hash;
- provider authorization nodes carry the full `ProviderGrantBindingV1`, not merely an opaque authorization hash.

The validator checks real canonical timestamp validity, monotonic order, no future observation/issue time, issue-after-route, issue-before-authorization, and expiry-after-issue/authorization. Branch names, README prose, historical status fields, and mutable pointers are not state truth.

`RUNNER_INDEPENDENTLY_VERIFIED` is never inferred from a worktree suffix, README, closeout label, or signature alone. A status report must explicitly cite the exact runner registration, closure, and commit hashes; their direct-parent receipt links and binding digests; and the current signed independent runner-review receipt. If any part of that derivation is missing or stale, retain the earlier runner state or block rather than abbreviating the proof as “receipt-derived.”

## Material Currentness

`materialCurrentness` contains closed `registeredBindings` and `currentBindings` for protocol registration, sample manifest, prompt manifest, evidence schema, taxonomy, runner registration/closure/commit, and scorer. The content-addressed protocol registration binds a version-independent design-profile identifier, immutable power-artifact hash, and registered claim ceiling. `registeredInferenceFrame` binds the same inferential material plus sample size, design profile, power artifact, and claim ceiling. A successor design registers new values and a new protocol receipt; it is never rejected merely because an older dated case study used a lower ceiling.

The first provider activity is derived from the first active reservation/attempt/completion/egress node. It is not self-reported.

- Exact equality with no stale artifacts is `CURRENT`.
- Drift before provider activity is `PRE_ACTIVITY_DRIFT` and requires a new freeze/registration path. Old reviews, grants, results, and exports are not reusable.
- Drift after provider activity is `POST_ACTIVITY_DRIFT`; the effective state must be `NEW_REGISTRATION_REQUIRED`. Preserve old receipts and list invalidated registration receipts. Never patch an old self-hash or rewrite lineage.

## Design, Provider Sequence, and Completion

Pre-register the design profile and power artifact together with inference frame, eligibility, homology rule, sampling, role isolation, estimands, unresolved treatment, provider order, custody, metrics provenance, and claim ceiling. Frozen frame counts and sample size are nonnull and internally consistent. Selection is result-blind and reroll-free.

Reference preflight, route, execution, labeling, and seal remain separate. Evaluated preflight cannot begin before reference seal; evaluated authorization, execution registration, canary, and run remain separate. A canary reconciliation cannot satisfy the full-run gate. Scoring requires current reference, canary, and full-run reconciliations plus the aggregate activity summary. A sealed result requires current natural provenance, and export requires current final/claim review plus distinct aggregate authorization.

`CLOSED` closes only this registered evidence cycle. It proves no A18 content acceptance, A23 promotion, A11 regression, A22 release/deployment, or live-product behavior.
