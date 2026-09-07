# RSI response cards

Status: **scenario decision coverage**. Use the sections matching the actual request, combining them when needed. The detailed references, schema, and validator govern evidence completeness; a card is neither evidence nor authorization. Formal artifacts retain every applicable contract field. Ordinary answers may summarize passed checks and cite evidence, while stating the conclusion, observed blockers/gaps, material unverified claims, and exact next action. Expand fields when they explain a failure or the user requests a detailed audit; do not turn this checklist into mandatory recital. Do not copy case-study values into generic policy.

## RSI-1 Incomplete C0 packet

Use when C0 is required but one or more role receipts are missing.

- State `evidenceClass: exact-package-machine-review`, `machineDisposition: blocked`, `claimCeiling: machine-evidence-only`, and the exact resume transition.
- All five canonical C0 roles are mandatory whenever `c0Required:true`; a single missing role blocks completeness.
- Require the closed control-plane `c0TriggerAssessment`; every registered trigger must be assessed, and P0/P1 answer, math, coverage, or schema risk derives `c0Required: true`.
- Name the exact missing role from the fixed five-role set; do not invent its result.
- For every active slot require the closed result body and canonical `ValidationReceiptBodyV1`: nonempty response bytes; response/output digest equality; passed parse, projection, schema, role, taxonomy, and coverage; slot-derived expected/observed role; surface count/set-hash parity; current schema/taxonomy/control-plane bindings; three false redaction flags; and result/artifact/bound-receipt derivation.
- Explicitly reject SHA-256 of empty bytes as evidence.
- Require globally unique deterministic, B-prime critique/revision, C0, and independent-review receipts, with every passed proof hash disjoint from the active set.
- A passed `independentReviewState` never compensates for incomplete C0.
- Keep all seven proof boundaries independent; a missing active role blocks `receipt`, and no local/commit/main/CI/deployment/live status is inferred.
- Refuse A18 acceptance, Promotion, regression, release, deployment, and live claims.
- Resume only with the valid fresh-context missing-role receipt followed by whole-packet revalidation.

## RSI-2 Named synthetic calibration

Use when a prompt names a dated RSI calibration.

- Read the dated case study and label every metric as `synthetic-calibration`, dated, and non-normative.
- Preserve its recorded unit of analysis, deviations, stream behavior, and repeatability boundary.
- Never reinterpret injected defect surfaces as natural bad questions and never calculate a natural-bank clean rate.
- Route natural-population estimation to `mais-natural-sample-evaluation`.
- Route exact-item/package acceptance to A18; synthetic evidence never approves content or goes live.

## RSI-3 Live-provider request

Use whenever a provider call is requested or implied.

- Verify the current task's exact authorization and the preflight conditions below before a call. If authorization is absent, expired, stale, mismatched, or over scope, stop before calling and report the missing resume gate. If the existing authorization is still valid, exactly matches the run, and every preflight condition passes, execute only the explicitly assigned run without asking for the same authorization again. Do not access credential sources; the permitted runner uses only its authorized runtime secret reference without disclosure.
- Configuration, model availability, or credential presence is not authorization.
- Block expired, stale, candidate-mismatched, control-plane-mismatched, or retroactively repaired authority.
- Require the complete redacted authorization projection, recomputed `authorization.authorizationSha256`, and exact provider/model/roles, credential/privacy/egress scopes, runner, caps, and time window.
- Require the source-bound `VERIFIED` comparison anchor; its canonical receipt identity binds the exact authorization digest and changes with the projection. Packet hashes do not authenticate an issuer.
- Require one canonical executable-code-manifest digest across identity, authorization, live execution, and runtime; bind current commit/runtime, exact `package.json`, exact `package-lock.json`, the tracked `100755` executable entrypoint, and a sorted unique recursive static local closure with exact HEAD and working-tree bytes/modes.
- Reject symlink, submodule, untracked, dynamic, unresolved, custom-loader, outside, omitted, extra, or dirty dependencies.
- Require declared and observed repository `clean:true`. The packet must be outside the runtime repository or in verified Git-ignored quarantine, and the packet is never subtracted from Git status.
- Derive performed roles exactly from B-prime and the canonical required/complete C0 state; allowed roles may only be a superset.
- Require common authority code `LIVE_AUTHORIZATION_RECEIPT` and authorization-digest coverage in `evidenceHashes`.
- Reject every retroactive authorization or receipt repair. A failed authority check requires renewed exact authorization and preflight; an already valid grant is not a failure merely because a new response is being written. Record actual execution results afterward rather than invent completed receipts during preflight.

## RSI-4 Candidate mutation and D-prime

Use when any candidate byte or bound input changes.

- Treat the edit as a new immutable candidate ID/version/hash; never call it a tiny exception.
- The canonical active manifest invalidates retained old receipts even when `candidateMutated:false`.
- Each `resultSha256` derives from its closed result body, so an outer-wrapper rehash cannot preserve the old result.
- Bind distinct prior/new candidates and the complete `priorReceiptBindings`: exact prior envelope/body/hash, prior active manifest/body/hash, prior C0 required/status, prior active receipts, and the source-bound `VERIFIED` prior comparison. Replacing both body and anchor is a new untrusted source until externally reverified.
- Make `invalidatedReceiptHashes` exactly equal the complete prior six-domain active set for every active slot.
- Bind fresh deterministic, B-prime, required C0, and independent receipts to the new candidate/control plane.
- Every fresh current deterministic, B-prime, required-C0, independent-review, and check hash reference is disjoint from prior and invalidated receipts.
- B-prime is critique before fresh revision with predecessor equality, `critiqueThenRevision: true`, and B-prime `freshContext: true`.
- Put the fresh D-prime validation receipt in `newReceiptBindings.dPrimeValidationReceiptSha256`; keep it disjoint from identity, manifest, authorization, trust, proof, check, prior, invalidated, and current-active domains.
- Require `deterministic.findingCount` and `bPrime.findingCount` to equal their bound active deterministic and revision-result counts.
- Require the complete new active receipt set to be pairwise distinct and every passed proof hash to be disjoint from it.
- Require `independentReviewState.status: passed`, `freshContext: true`, and the new-candidate binding.
- The complete disposition enum is only `machineDisposition: candidate-only | needs-repair | blocked`.
- Refuse `approved-for-integration-review`; A18 owns acceptance.
- Keep receipt proof unverified or failed until the complete new packet validates.
- State the exact repair/revalidation/A18 handoff transition without upgrading any other proof boundary.

## RSI-5 Unsafe or approval-bearing receipt

Use when input contains protected aliases, raw provider material, credentials, unsafe prose, or forbidden approval/readiness state.

- Follow the safe-summary tool; never reproduce protected property names, values, input-controlled IDs, or unsafe semantic fields.
- A self-hash proves canonical-value integrity only.
- For the rejected current receipt, emit only the fixed blocked/invalid boundary, issue codes, self-hash validity, and summary version; omit claimCeiling, invalid disposition, IDs, hashes, independent review, and proof states.
- Apply the closed positive generic-receipt inventory; unknown verdicts and protected aliases block even under a valid self-hash.
- Field-specific positive grammars govern every full-packet string. Context-specific authority, blocker, check, deviation, and C0 registries reject generalized approval/readiness codes.
- Generic and full packets use the same class/status/disposition/action/proof/review resolver. Consistent blocked/invalid safe output exits `2`; contradictory tuples suppress semantic output and exit `2`.
- A valid full-packet trust projection exposes only fixed `status` and canonical `receiptIdentitySha256`, never issuer/account/source details and never provider authority.
- Exact-package `candidate-only` maps only to `handoff-to-a18`; `needs-repair` maps only to `repair-candidate`.
- Synthetic `candidate-only` maps only to `record-calibration-result`; synthetic `needs-repair` maps only to `revise-machine-qa-policy`; synthetic evidence never routes to A18.
- For a rejected exact-package receipt, record A18 only as the blocked downstream owner for redacted machine evidence: do not transmit the rejected receipt; route only a later sanitized, independently validated exact-package `candidate-only` packet to A18 without claiming A18 acceptance.
- For rejected synthetic evidence, keep the calibration-only transition; synthetic evidence never routes to A18 and never records A18 as an owner.
- Do not infer provider authority, integration, promotion, release, deployment, or live proof.
