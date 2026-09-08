# Natural evaluation response cards

Status: **normative evidence projection**. Apply the cards relevant to the request, combining them when needed, and use the state machine, provider, custody, and claim references for proof. These cards do not require a fixed opening sentence, one card per answer, or repetition of every artifact field in ordinary prose. Every card is offline/read-only: no credential access or provider call. Cards never authorize provider activity or contain protected sample data.

## Formal audit completeness and ordinary answers

For a formal status, execution-eligibility, recovery, or scientific-claim audit, record every applicable redacted contract fact supported by the evidence, including all blockers rather than stopping at the first one. Do not replace complete machine fields with phrases such as “fresh grant” or “current receipts.” Ordinary explanations and status summaries may cite that evidence and report the conclusion, material blockers/unknowns, and exact next gate; the underlying validation and claim boundaries still apply.

- Record the authorized mode and receipt-derived state. A formal `RUNNER_INDEPENDENTLY_VERIFIED` audit binds exact runner registration/closure/commit hashes, their direct-parent lineage and binding digests, and the current signed independent runner-review receipt.
- Distinguish frame/sample freeze, runner review, provider execution, scoring, and export evidence. Preserve named dated deviations, blockers, and receipt-backed facts as dated evidence. Current-status claims or current actions require relevant current verification.
- For provider eligibility, record the complete `ProviderGrantBindingV1` and its exact three-way equality, freshness, separate provider roles, and caps under the provider contract. Reject retroactive authorization or receipt repair.
- Determine custody-handoff need from actual context hashes, never an invented mismatch. Preserve the controlled handoff requirement when those contexts differ.
- When current per-phase zero reconciliations and the activity-summary receipt prove zero, retain known-zero attempts, completed calls, and egress. Without that current reconciliation-and-summary chain, record exactly `attempts: {known:false,count:null}`, `completedCalls: {known:false,count:null}`, `egress: {known:false,count:null}`, and `activity.unknown.present:true` with the packet-derived category union. Lack of visible calls is not proof of zero.
- Apply post-activity drift, interruption, synthetic-provenance, and registered-ceiling rules from the cards below. For a registered scientific claim, record the positive-plus-negative support arithmetic from the immutable power artifact and its comparison with registered sample size; do not hard-code one dated design's numbers into general policy.

## NAT-1 Named dated status audit

- Use `mode: AUDIT_STATUS`; read the named dated case study before answering.
- Derive `RUNNER_INDEPENDENTLY_VERIFIED` only from exact runner registration/closure/commit hashes, direct-parent lineage and binding digests, and the current signed independent review receipt—not from branch names or prose.
- Separate frame/sample freeze, independent freeze review, runner registration/closeout/review, provider execution, scoring, and export states.
- Preserve every explicitly recorded dated receipt-backed fact. If the case study records known-zero attempts/completed calls/egress and no contradictory current evidence is supplied, do not replace those values with unknown.
- Keep route authenticity and provider authority as separate blockers; do not invent custody mismatch.
- If receipt-backed custody contexts differ and the required handoff is not verified, state exactly `nextAllowedAction: CREATE_CONTROLLED_CUSTODY_HANDOFF`.
- Otherwise—custody contexts are equal/not required, or the required handoff is already verified—state exactly `nextAllowedAction: REQUEST_REFERENCE_PREFLIGHT_AUTHORIZATION` and zero natural-text egress.
- Preserve the registered scientific ceiling, including `INCONCLUSIVE_MACHINE_REFERENCE` when the named design says so.
- Refuse PASS, human gold, content acceptance, Promotion, release, deployment, or live proof.
- Emit no natural text, item ID, protected path, provider body, credential, or account identifier.

## NAT-2 Provider execution requested without authority

- Without the required execution authority, make no credential access or provider call; report the actual missing authority and next gate.
- Credential presence and runner concurrence are not execution authority.
- Require the exact phase-specific `ProviderGrantBindingV1`: role, provider adapter, model, route anchor, phase, credential/privacy/rights scopes, save/redaction policy, protocol/sample/runner identity, issue/expiry, receipt, and positive attempt/token/USD/concurrency caps.
- Require byte-identical three-way binding across provider state, source-rights state, and the active authorization node; derive freshness instead of trusting a flag.
- Require a controlled hash-bound custody handoff when sample and runner custody contexts differ.
- Keep reference-provider and evaluated-provider grants separate; evaluated work begins only after reference seal.
- Reject retroactive authorization and receipt repair.
- Return fixed redacted blockers and the narrowest lawful preflight/custody next gate.

## NAT-3 Registered-material drift

- Treat sample, prompt, runner, scorer, or other registered-material drift after activity as material identity drift.
- Return `NEW_REGISTRATION_REQUIRED` or `INVALID_HASH_OR_SIGNATURE`; never rewrite a frozen hash or old receipt.
- Preserve the append-only old lineage and all recorded activity.
- Invalidate affected freeze/runner/final reviews, grants, labels/results, and export for changed bytes.
- Require a new immutable registration and the protocol-defined restart decision.
- Make no provider call, protected-content read, or legitimacy inference from a replacement self-hash.

## NAT-4 Interrupted execution recovery

- Use `mode: RECOVER`; perform zero HTTP and no credential refresh, route probe, or retry.
- A reservation remains activity for currentness and cap accounting.
- Emit exactly `attempts: {known:false,count:null}`, `completedCalls: {known:false,count:null}`, and `egress: {known:false,count:null}`; never use zero.
- Emit `activity.unknown.present:true` and the exact packet-derived fixed category union, including every applicable delivery, completion, egress, token, cost, concurrency, and reservation-only category.
- Return `INTERRUPTED_RECONCILIATION_REQUIRED` with `RECONCILE_ACTIVITY_OFFLINE`.
- Require an append-only reconciliation receipt before reassessing material currentness, grant freshness, remaining caps, custody, reference seal, and resume eligibility.
- Emit no protected request/response content.

## NAT-5 Synthetic fixture or scientific ceiling

- Label the run `synthetic-fixture`, never a natural provider result.
- Synthetic score, result seal, final review, claim review, or export nodes cannot close natural evidence.
- Emit no item IDs, question text, protected paths, credentials, raw responses, or provider reasoning.
- Do not create a natural aggregate export from synthetic provenance.
- Derive the maximum claim from the immutable registered design profile and power artifact. A formal claim audit records the registered positive-plus-negative support arithmetic and comparison with sample size; an ordinary explanation may cite that calculation.
- Preserve `INCONCLUSIVE_MACHINE_REFERENCE` when the registered design ceiling requires it, even under perfect observed classifications.
- Refuse production quality, content acceptance, Promotion, release, deployment, or live proof.
