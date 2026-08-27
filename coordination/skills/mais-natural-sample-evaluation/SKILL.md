---
name: mais-natural-sample-evaluation
description: Use this skill whenever MAIS needs to design, freeze, audit, execute, recover, score, or independently review a runtime-visible natural-question sample evaluation, including frame/sample custody, machine-reference sealing, evaluated-provider canaries, receipt-graph currentness, or aggregate-only reporting. Trigger even when the user only asks whether a natural evaluation is ready or resumable. Do not use it for RSI synthetic machine-QA, exact-package A18 content acceptance, candidate promotion, regression, release, deployment, or live-product proof.
---

# MAIS Natural Sample Evaluation

Use this skill to build or audit **bounded natural-population evaluation evidence**. It never grants content acceptance, promotion, release, deployment, or live-product proof.

## Default Posture

- Start in `AUDIT_STATUS`: offline, read-only, redacted, and no credential access.
- Treat branch names, README prose, historical status fields, configured providers, and old green tests as leads—not current state truth.
- Resolve currentness from the active append-only receipt lineage: exact top-level receipt mappings, direct-parent links, node subjects/binding digests, signatures, real timestamp order, expiry, caps, and current material identity.
- Treat natural questions, item identifiers, exact protected paths, raw provider responses, credentials, and account details as protected data. Never copy them into chat, Git, templates, reports, or safe exports.
- The bundled scripts never call a provider, read credentials, or open protected content.
- A provider run requires a fresh, exact, phase-specific `ProviderGrantBindingV1` copied identically into provider state, source-rights state, and the active authorization node, plus the complete runner, route, activity, material-currentness, and custody chain immediately before the registered repository runner is invoked.

## Route Before Acting

Use this skill for runtime-visible natural-question frame and sample evaluation. Route adjacent work elsewhere:

- Frozen candidate deterministic/B-prime/C0-prime machine QA -> RSI machine-QA workflow.
- Exact question correctness, answer quality, curriculum alignment, rights, or final content acceptance -> A18 content QA.
- Candidate-to-live selection, Shadow, integration, or promotion -> A23 promotion workflow.
- Product regression -> A11 QA.
- Build, release, deployment, rollback, or production readback -> A22 release workflow.

Read `references/evidence-and-claim-boundaries.md` when a request mixes lanes.

Before answering any of the five core Natural scenario families, read `references/response-cards.md`, select exactly one primary card, and use every applicable line as the outward-response checklist. The card controls response completeness; the state machine and offline tools control proof.

Read the applicable normative source before answering a status or readiness question:

- any receipt-backed status, currentness, mutation, or next-gate audit -> `references/registered-evaluation-state-machine.md`;
- provider preflight, grant, execution, or resume eligibility -> `references/provider-authority-contract.md`;
- custody, known/unknown activity, interruption, recovery, or resume -> `references/protected-custody-and-recovery.md`;
- a named dated California or other project-specific natural-evaluation snapshot -> its dated non-normative case-study reference; for the bundled example, use `references/mais-ca60-case-study.md`.

## Complete Audit Response

For a status, execution, recovery, or scientific-claim audit, do not stop after the first blocker and do not compress a closed tuple into “fresh grant,” “current receipts,” or “reconcile activity.” Report every applicable redacted contract fact supported by the supplied evidence:

1. Start with `mode: AUDIT_STATUS` unless another mode is actually authorized. Derive and name the resolved state from canonical hashes, exact direct parents, binding digests, review receipts, real time order, and current material; branch/worktree suffixes and prose remain non-authoritative.
   When the resolved state is `RUNNER_INDEPENDENTLY_VERIFIED`, spell out that derivation in the answer: exact runner registration/closure/commit hashes, their direct-parent lineage and binding digests, and the current signed independent runner-review receipt jointly prove the state. Saying only “receipt-derived” or citing a signed review is incomplete.
2. State separately what frame/sample freeze, runner review, provider execution, scoring, and export evidence proves. For a named dated case, preserve its recorded deviations, blockers, and receipt-backed facts rather than generalizing from “no provider result.”
3. Apply a closed activity-evidence decision. Report attempts, completed calls, and egress as known zero when—and only when—current per-phase zero reconciliations and the current activity-summary receipt prove zero. Do not downgrade receipt-proven zero to unknown merely because provider execution is unstarted. If that current reconciliation-and-summary chain is missing, the generic result is exactly `attempts: {known:false,count:null}`, `completedCalls: {known:false,count:null}`, and `egress: {known:false,count:null}`, plus `activity.unknown.present:true` with the exact packet-derived categories; never infer zero from absence of visible calls.
   When a prompt names a dated case study and supplies no contradictory current evidence, preserve each explicitly recorded receipt-backed activity fact as dated evidence: do not downgrade it to unknown merely because the prompt does not repeat the receipt identifiers. If current repository evidence is actually inspected and contradicts or invalidates the dated chain, report that new evidence and its currentness boundary instead.
4. For provider eligibility, enumerate the complete `ProviderGrantBindingV1`: role, adapter, model, route anchor, phase, credential and privacy-rights scopes, save/redaction policy, protocol/sample/runner identities, issue/expiry, receipt, and positive attempt/token/USD/concurrency caps. Require exact three-way tuple equality across provider state, source-rights state, and the active authorization node; derive freshness; keep reference and evaluated grants separate; and reject retroactive authorization or receipt repair explicitly.
5. When custody contexts differ, require the controlled hash-bound handoff before protected sample use. Do not invent a custody mismatch when the supplied hashes do not establish one.
6. For post-activity sample, prompt, or other registered-material drift, return `NEW_REGISTRATION_REQUIRED`, preserve the append-only old lineage, invalidate all affected reviews/grants/results/exports, and require the protocol-defined restart. Do not call a provider, inspect protected content, or treat a replacement self-hash as legitimacy.
7. In `RECOVER`, state zero HTTP, conservatively retain the reservation in cap accounting, emit `INTERRUPTED_RECONCILIATION_REQUIRED` / `RECONCILE_ACTIVITY_OFFLINE`, and require an append-only reconciliation receipt before reassessing material currentness, grant freshness, remaining caps, custody, and resume eligibility. Do not use prose-only “unknown/null”: emit `attempts: {known:false,count:null}`, `completedCalls: {known:false,count:null}`, and `egress: {known:false,count:null}`, plus `activity.unknown.present:true` and the exact fixed packet-derived categories.
8. For a synthetic fixture, refuse natural result/final-review/claim-review/export closure. For any named registered design, reproduce the positive-plus-negative support arithmetic from its immutable power artifact and compare that sum to the registered sample size; do not hard-code one case study's numbers into general policy.

## Choose One Mode

1. `AUDIT_STATUS` — resolve current state and blockers only. This is the default.
2. `DESIGN_OR_FREEZE` — register/activate a protocol, pin source rights, build a frame, freeze a homology-aware sample, and obtain independent freeze review. Provider egress remains forbidden.
3. `PROVIDER_PREFLIGHT` — under a separate narrow authorization, verify only redacted provider route/entitlement/price/cap readiness; send no natural content.
4. `EXECUTE_OR_RESUME` — only after an exact fresh grant and complete custody lineage; delegate execution to the exact registered repository runner. Bundled scripts still remain offline.
5. `RECOVER` — reconcile interrupted activity without HTTP; never retry automatically.
6. `SCORE_REVIEW_EXPORT` — score, independently review, claim-review, and export only an authorized strict aggregate.

Read `references/registered-evaluation-state-machine.md` before any receipt-backed status audit or other mode. A route-only question with no evidence interpretation may omit it.

## Required Sequence

1. Freeze the protocol identity, design-profile identifier, power artifact hash, and registered claim ceiling.
2. Pin the exact clean source baseline and a bounded source-rights receipt.
3. Verify the runtime-visible frame; exclude synthetic/test/candidate material.
4. Freeze a deterministic, homology-aware sample under protected custody; forbid rerolls.
5. Obtain independent freeze review.
6. Register the exact runner source closure, record closeout, and obtain an independent signed review.
7. Separately authorize the reference-provider preflight, route evidence, and execution.
8. Complete and seal machine-reference labels before exposing any evaluated-provider phase.
9. Separately authorize evaluated-provider preflight, route evidence, execution registration, canary, and full run. Canary activity and reconciliation must close before the canary receipt; full-run activity must begin strictly after that receipt and close under a distinct reconciliation before the run receipt.
10. Reconcile reference, evaluated-canary, and evaluated-full-run reservations, attempts, completions, egress, tokens, USD, and concurrency before resume or scoring; known zero requires distinct current zero reconciliations plus a summary receipt.
11. Score and seal a provenance-bound result, obtain fresh independent result review, review the scientific claim boundary, and separately authorize a result/claim-bound strict aggregate export.

`registeredBindings` and `currentBindings` explicitly cover protocol, sample, prompt, evidence schema, taxonomy, runner registration/closure/commit, and scorer. Drift before provider activity requires new freeze/registration evidence and invalidates old reviews. Drift after the first active reservation/attempt/completion/egress node requires `NEW_REGISTRATION_REQUIRED`; old reviews, grants, results, and exports cannot be reused. Do not repair a frozen lineage in place.

## Validate and Resolve Evidence

Use the self-contained schema and offline tools:

```sh
node scripts/verify-evidence-envelope.mjs PACKET.json
node scripts/resolve-evaluation-state.mjs PACKET.json
node scripts/audit-protected-custody.mjs PACKET.json
node scripts/validate-redacted-export.mjs PACKET.json
```

All four support `--help`. Exit code `0` means the requested offline check passed; `2` means blocked or invalid; `3` means a tool/read failure. Never waive a validator result manually.

Read `references/evidence-and-claim-boundaries.md` before constructing or interpreting a packet.

## Provider and Custody Hard Stop

Availability is not authority. Credential presence, provider configuration, a route string, a runner review, or an earlier owner statement does not permit a call.

Before repository execution is even eligible, require:

- the active protocol/sample/runner hashes;
- source rights that explicitly include the current provider phase;
- a trusted route-evidence anchor;
- a phase-specific binding with canonical issue/expiry times derived fresh at validation time—never a self-reported `grantFresh` flag;
- exact provider-adapter/model/role/route, credential-scope/privacy-rights, save/redaction-policy, protocol/sample/runner, receipt, and positive attempt/token/USD/concurrency bindings;
- a clean, tracked exact runner closure;
- known or reconciled activity counts;
- a controlled cross-custody handoff receipt when runner and protected sample are held in different custody contexts.

The reference must be sealed before evaluated-provider preflight or execution. Unknown delivery, completion, egress, token use, cost, or concurrency is represented as unknown—not zero—and forces offline reconciliation.

Read `references/provider-authority-contract.md` before provider preflight or execution. Read `references/protected-custody-and-recovery.md` before custody handoff, recovery, or resume.

## Claim Ceiling

Allowed outputs are bounded evidence statements, such as:

- the exact packet is structurally valid, blocked, or invalid;
- the current lifecycle state and next allowed action;
- dated aggregate machine-reference metrics within the registered frame;
- a registered ceiling such as `INCONCLUSIVE_MACHINE_REFERENCE`.

Forbidden outputs include:

- human-gold claims from a correlated machine panel;
- a sampled item or unsampled bank item being content-approved;
- PASS, production readiness, promotion, release, deployment, or live-product proof;
- generalization outside the registered inference frame.

`synthetic-fixture` may validate structure only. It cannot close a natural result, final/claim review, or aggregate export. Every natural design derives its maximum conclusion from the immutable registration-bound design profile, power artifact, and registered claim ceiling; dated project-specific maxima are case-study facts, not universal policy.

## Safe Outputs

Return only hashes, redacted logical references, fixed state/blocker codes, aggregate counts/metrics, authorization completeness, activity known/unknown state, review states, claim ceiling, and the exact next gate. Use `validate-redacted-export.mjs` for an outward-facing aggregate.

Interpret every successful or blocked bundled-CLI result under its explicit boundary fields: packet-local content-address closure is not issuer authentication, and the offline validator never grants provider authority. `declaredAuthority` counts are packet declarations only, not external proof.

Never output natural text, answers, item IDs, exact protected paths, provider request/response bodies, reasoning, credentials, account/project identifiers, billing details, raw research rows, or private identities.

## Resources

- `references/response-cards.md` — normative, scenario-specific outward-response completeness cards.
- `references/registered-evaluation-state-machine.md` — normative modes, state machine, transitions, and mutation rules.
- `references/evidence-and-claim-boundaries.md` — normative `EvidenceEnvelopeV1`, routing, review, and proof/claim boundaries.
- `references/protected-custody-and-recovery.md` — normative custody handoff, activity, and zero-HTTP recovery controls.
- `references/provider-authority-contract.md` — normative provider phase, grant, credential, route, and dispatch controls.
- `references/mais-ca60-case-study.md` — dated, non-normative current example; never treat it as policy or fresh status.
- `assets/natural-evaluation-state.schema.json` — self-contained machine-readable contract.
- `assets/project-adapter-map.template.md` — project binding scaffold only.
- `assets/provider-grant-request.template.md` — provider grant request scaffold only.
- `assets/claim-boundary-handoff.template.md` — redacted custody/evidence/claim handoff scaffold only.

Every template is marked `TEMPLATE_ONLY_NOT_AUTHORIZATION` and cannot itself prove authority.

## Stop Conditions

Stop before execution or export when any required top-level/graph receipt equality, subject/binding digest, direct parent, signature/identity anchor, timestamp order, expiry, grant tuple, cap, rights scope, route anchor, material currentness, runner identity, custody receipt, activity reconciliation, provenance, result binding, independent review, claim review, or export authorization is missing or mismatched. Also stop when the requested conclusion exceeds the registered claim ceiling.

Do not solve a blocker by editing old receipts, treating unknown activity as zero, copying protected data, borrowing authorization across providers/phases, running an unregistered adapter, weakening the schema, relabeling a preflight/canary as a completed evaluation, or reusing canary activity/reconciliation as full-run evidence.
