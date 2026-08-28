# Natural evaluation response cards

Status: **normative response projection**. Select the one card matching the primary request, then use the state machine, provider, custody, and claim references for proof. Every card is offline/read-only: the response performs no credential access and no provider call. Cards never authorize provider activity and never contain protected sample data.

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

- Begin with: no credential access and no provider call.
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
- Derive the maximum claim from the immutable registered design profile and power artifact; reproduce the registered positive-plus-negative support arithmetic before comparing it with sample size.
- Preserve `INCONCLUSIVE_MACHINE_REFERENCE` when the registered design ceiling requires it, even under perfect observed classifications.
- Refuse production quality, content acceptance, Promotion, release, deployment, or live proof.
