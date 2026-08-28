# Provider Authority Contract

Status: **normative**.

## ProviderGrantBindingV1

Reference and evaluated execution use separate closed bindings. Each binding contains exactly:

- `role`: `REFERENCE_PROVIDER` or `EVALUATED_PROVIDER`;
- redacted positive-grammar `providerAdapterId` and `modelId`;
- trusted `routeAnchorSha256`;
- `phase`: `REFERENCE_LABELING` or `EVALUATED_RUN`;
- `credentialScopeSha256` and `privacyRightsScopeSha256`—never credential values or authorization prose;
- `savePolicy`: `SAVE_NOTHING` or `SAVE_REDACTED_HASHES_ONLY`;
- `redactionPolicy: REDACT_PROTECTED_CONTENT_AND_RAW_RESPONSES`;
- exact protocol registration, sample manifest, runner registration/closure/commit identities;
- canonical `issuedAt` and `expiresAt`;
- positive attempt, token, USD, and concurrency caps;
- `grantReceiptSha256`.

No `grantFresh` field exists. Freshness is derived from current time, real timestamp validity/order, unexpired grant, active direct-parent receipt, route order, and exact equality with current material bindings.

`EVALUATED_RUN` is the evaluated-provider grant role/phase binding, not an activity-ledger shortcut. Its bounded allowance covers the registered canary and full run, whose `EVALUATED_CANARY` and `EVALUATED_RUN` ledger events and reconciliation receipts remain distinct. Canary usage consumes the same evaluated grant caps and cannot be reused as full-run evidence.

## Three-Way Equality

For each execution role, the entire grant tuple—including role, provider/model/route, credential/privacy scopes, save/redaction policy, identities, issue/expiry, caps, and receipt—must be equal in:

1. `reference.grantBinding` or `evaluated.grantBinding`;
2. the matching `sourceRights.*GrantBinding`;
3. the active authorization graph node's `providerGrantBinding`.

The graph authorization node receipt equals `grantReceiptSha256`, its expiry equals grant expiry, and its binding digest covers the complete grant. A nonnull opaque hash alone is insufficient.

## Phase and Authority Partition

Keep freeze rights, reference execution, evaluated execution, and aggregate export separate. `authority.required/proven/missing` is a true partition over fixed positive codes. `EXECUTE_OR_RESUME` requires a nonempty authority set and the relevant provider code proven. Missing or expired authority blocks; audit mode does not waive expiry.

`sourceRights` has three exact projections. `NOT_REVIEWED` has null scope/grants and all authorization flags false. `AUTHORIZED_FOR_FREEZE` requires both the source-rights receipt hash and source-scope hash, keeps both provider grants null, and keeps all provider/spend flags false. `AUTHORIZED_FOR_PROVIDER_EGRESS` retains both scope hashes, requires all three flags true, and requires at least one phase-specific grant; each reference/evaluated grant is structurally constrained to its matching role and phase before the resolver checks full three-way equality.

Reference execution cannot authorize evaluated execution. Evaluated preflight/authorization remains after reference seal. Neither provider grant authorizes aggregate publication.

## Preflight Has Zero Natural Egress

`PROVIDER_PREFLIGHT` may verify redacted route, entitlement, price, and cap feasibility only. It must contain no execution grant, no provider-egress right, and `naturalTextEgressAuthorized:false` for both roles. A prepared request, credential presence, configured endpoint, provider documentation, or synthetic success is not execution authority.

## Time, Currentness, and Caps

The validator checks:

- canonical millisecond timestamps with real calendar validity;
- issue time is not future, is no earlier than route evidence, and is no later than the authorization receipt;
- expiry is later than issue and authorization, and later than the current audit time;
- top authority expiry equals the earliest active grant expiry;
- grant identities equal current protocol/sample/runner material;
- any broader prompt/schema/taxonomy/scorer drift makes the grant stale through material-currentness;
- reference-phase usage remains within its grant caps, and evaluated-canary plus evaluated-full-run usage remains within the evaluated grant caps both per subphase and in aggregate.

Post-activity material drift forces `NEW_REGISTRATION_REQUIRED`; an old grant cannot be refreshed by rewriting its tuple.

## Credential and Dispatch Boundary

The template is a request scaffold only. It never authorizes access. Only a separately authorized provider-owned session may consult an owner-approved credential source for an exact phase. Real values remain transient and must never be printed, copied, hashed for publication, logged, staged, committed, or included in a packet.

The bundled scripts never read credentials or contact a provider. If execution is separately authorized, dispatch belongs to the exact registered repository runner and adapter covered by current runner closure/review and custody receipts. Never copy a provider client into this skill or treat `EXECUTE_OR_RESUME` as implicit dispatch permission.
