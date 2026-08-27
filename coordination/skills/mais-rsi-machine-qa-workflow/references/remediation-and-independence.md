# Remediation and Independence

Status: **normative**.

## Separation of Duties

No single context may discover a candidate defect, change the candidate, and certify that same change as clean. Preserve these separations:

- Machine QA identifies bounded findings.
- The owning content-production lane proposes candidate changes.
- A fresh machine-QA context rechecks the new candidate.
- A18 independently adjudicates content quality and curriculum acceptance.
- A23, A11, and A22 own later promotion, regression, and release evidence.

B-prime finding revision is not candidate remediation. It revises the reviewer's finding set while candidate bytes remain frozen.

## D-Prime Remediation Cycle

If any candidate byte or bound input changes:

1. End the old review cycle.
2. Issue a new candidate ID and monotonically distinct version.
3. Compute a new candidate SHA-256 and candidate-manifest SHA-256.
4. Record `priorCandidate {id, version, sha256}` and a distinct `newCandidate {id, version, sha256}` equal to the root identity.
5. Record authoritative `priorReceiptBindings` with a closed canonical prior-envelope body/SHA-256, a closed `VERIFIED` external-comparison anchor and its canonical receipt identity, exact canonical prior `activeReceiptManifest` body/digest, explicit prior C0 required/status state, and complete prior deterministic, B-prime critique/revision, exact-five C0-prime when required, and independent-review bound-receipt set.
6. Mechanically derive the prior active set from that closed manifest as the exact six-domain output, validation-receipt, validation-projection, canonical-result, artifact, and bound-receipt hashes for every active slot. Require the prior-envelope body to contain that exact set and bind its canonical digest through the prior trust anchor. Set nonempty, unique `invalidatedReceiptHashes` to exact set equality with it; omission of any domain from any prior C0 slot, or any extra hash, blocks D-prime.
7. Create `newReceiptBindings` for the complete candidate/control plane, exact current active-manifest digest, deterministic, B-prime critique/revision, required C0-prime role receipts, independent review, and a new D-prime validation receipt.
8. Set `freshContext: true`; create a closed `DPrimeValidationReceiptBodyV1` binding both candidates, both active manifests, canonical invalidated/current six-domain set digests, deterministic/B-prime/C0/independent-review bindings, freshness, and redaction. Domain-separate its canonical `validationReceiptSha256`, copy it exactly to `newReceiptBindings.dPrimeValidationReceiptSha256`, cover it and its set digests in `evidenceHashes`, and prove it is distinct from identity, manifest, authorization, trust, proof, check, prior, invalidated, and current-active hashes.
9. Prove that all six active domains—output, validation receipt, validation projection, canonical result, artifact, and bound receipt—are pairwise distinct as required and disjoint from both prior/invalidation sets, and that the top-level review receipts and finding counts equal the new canonical bindings. Cover every current hash-bearing reference—checks, authorization, proofs, evidence hashes, validation projections, result bodies, binding artifacts/digests, manifest hashes, prior-envelope identity, and trust-anchor identity—and prove each is disjoint from the invalidated set.
10. Re-freeze policy, protocol, code, taxonomy, schema, prompt, projection, C0 trigger assessment, and resource-cap identities.
11. Recheck the canonical redacted live-authorization projection and digest against the new identity; old authorization does not transfer unless it explicitly binds the new full control plane, exact runner triple, scopes, caps, and unexpired time window.
12. Rerun deterministic checks.
13. Run B-prime from fresh context with no concealed gold or prior provider reasoning; prove critique-before-revision by binding both top-level and revision-result predecessor fields to the critique bound receipt with `critiqueThenRevision: true` and `freshContext: true`.
14. Reevaluate every C0-prime trigger from the closed control-plane assessment and run all five fixed role keys when required.
15. Attach a passed `independentReviewState` with `freshContext: true`, the new candidate hash, and a distinct receipt hash, and copy that hash into `newReceiptBindings`.
16. Create a new evidence envelope and handoff with new proof-boundary receipts.

The restarted packet still obeys the global independence rule: deterministic, B-prime critique, B-prime revision, every active C0-prime role, and independent-review receipt hashes are pairwise distinct. Every passed proof-boundary hash is also pairwise distinct and disjoint from that complete active receipt set. D-prime disjointness from prior receipts is an additional rule, not a substitute for this within-packet rule.

Do not patch an old receipt, retain an old self-hash, leave an invalidated receipt or check ref active, or relabel a mutated candidate as unchanged. Independently of the caller-controlled mutation flag, the mandatory active manifest recomputes every bound receipt against the complete control plane. `currentness.candidateUnchanged: true` means the **new** frozen candidate has not changed since the D-prime restart; it does not erase mutation history.

An audit response must not compress that rule into “the old receipt is superseded.” It must say that the canonical `activeReceiptManifest` rejects retained old receipts even when `candidateMutated` remains falsely set to `false`, and that each slot's `resultSha256` derives from the closed redacted result body with fixed status/count/output-digest fields and the exact complete control plane. Rehashing only an outer receipt or wrapper therefore cannot preserve an old result digest.

Canonical hashes do not authenticate the prior-envelope issuer. The prior anchor records an external comparison and makes the evidence source visible by canonical receipt identity. If both the prior envelope and its external anchor are replaced, that new identity is a different untrusted prior evidence source, not continuity; continuity resumes only after comparison to the externally trusted prior-envelope storage/identity receipt. The validator does not perform that external trust decision or signature verification.

## Fresh-Context Minimum

A fresh review context must not receive:

- concealed synthetic arm, variant, latent-bundle, defect, gold, or seed fields;
- prior provider chain-of-thought/reasoning;
- the expected finding list as an instruction;
- a claim that the prior candidate was accepted;
- raw authorization or credential values.

It may receive the frozen candidate projection, normative policy, closed taxonomy, role instructions, deterministic tool evidence permitted by the protocol, and typed `finding-<16 lowercase hex>` prior identifiers only where the registered protocol requires comparison.

## Independence Limitations

Fresh context reduces direct conversational leakage; it does not prove statistical independence, model-family diversity, or human expert independence. Record shared provider/model/prompt/tool dependencies as limitations.

The following are not independent rechecks:

- replaying the same response;
- asking the same context to say it is confident;
- repairing a JSON parse without rerunning substantive inspection;
- changing only the verdict label;
- feeding a prior finding list to a reviewer and counting agreement as discovery;
- using deterministic rules derived from concealed gold against the same calibration sample without disclosure.

## Remediation Handoff

The redacted handoff states:

- old and new typed candidate identities/hashes;
- the authoritative prior envelope/receipt manifest and fixed trust status/receipt-identity hash, exact-equal invalidated-receipt hash set, and fresh receipt bindings;
- proof that the fresh D-prime validation receipt and all new active receipts are disjoint from both the prior and invalidated sets;
- which findings remain open by code/severity/count;
- which checks and roles were rerun;
- the passed fresh independent-review receipt;
- seven independent evidence-location proof boundaries;
- deviations and independence limitations;
- current `machineDisposition`;
- next owner and exact resume gate.

It never includes raw question text, answers, gold rows, provider reasoning, secret values, or a content-approval claim.
