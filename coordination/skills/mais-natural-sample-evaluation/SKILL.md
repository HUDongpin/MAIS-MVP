---
name: mais-natural-sample-evaluation
description: Design or audit registered MAIS natural-question sample evaluations, including status, recovery, provider eligibility, and aggregate claims. Use for runtime-visible natural populations, not synthetic QA, item acceptance, promotion, or release.
---

# MAIS Natural Sample Evaluation

Build or audit **bounded natural-population evaluation evidence**. This skill never grants content acceptance, promotion, regression, release, deployment, or live-product proof. Start in `AUDIT_STATUS`: offline, read-only, redacted, with no credential access. Another mode requires the assigned scope and its current evidence/authorization chain.

## Route the request

Choose the applicable mode; a conceptual or route-only explanation needs no packet, new evidence, provider call, or full protocol walkthrough. Read the linked references only when the request reaches their conditions. Their normative requirements remain binding for that operation.

| Request | Mode and required reference |
| --- | --- |
| Receipt-backed status, readiness, currentness, or next gate | `AUDIT_STATUS` — [registered-evaluation-state-machine.md](references/registered-evaluation-state-machine.md) |
| Register/activate a protocol, pin rights, build a frame, or freeze/review a sample | `DESIGN_OR_FREEZE` — the state machine; provider egress remains forbidden |
| Redacted provider route, entitlement, price, or cap readiness | `PROVIDER_PREFLIGHT` — [provider-authority-contract.md](references/provider-authority-contract.md) and the state machine; separate narrow authority, zero natural-text egress |
| Provider execution or resume eligibility | `EXECUTE_OR_RESUME` — provider contract, state machine, and [protected-custody-and-recovery.md](references/protected-custody-and-recovery.md); dispatch belongs only to the exact registered repository runner |
| Custody handoff or interrupted activity | `RECOVER` for interruption — custody/recovery contract and state machine; zero HTTP, no automatic retry |
| Score, independently review, assess a scientific claim, or export | `SCORE_REVIEW_EXPORT` — [evidence-and-claim-boundaries.md](references/evidence-and-claim-boundaries.md) and the state machine; export requires separate authorization |

Read the evidence/claim contract when constructing or interpreting a packet or mixing evidence lanes. Use [response-cards.md](references/response-cards.md) for relevant scenario requirements and formal audit projections; combine applicable cards when a request crosses scenarios. Ordinary prose may summarize verified evidence instead of reciting every field. Formal artifacts and explicitly requested field-by-field audits retain the complete contract.

For a named dated experiment snapshot, read [mais-ca60-case-study.md](references/mais-ca60-case-study.md). Preserve its facts as dated, non-normative evidence; revalidate relevant current evidence before making a current-status claim or authorizing a current action.

Adjacent requests route to their owners: frozen deterministic/B-prime/C0-prime candidate QA to RSI; exact correctness, answers, curriculum, rights, and acceptance to A18; candidate selection/Shadow/integration to A23; product regression to A11; build, deployment, rollback, and live readback to A22. A Natural result cannot replace those gates.

## Boundaries that apply across modes

- Resolve currentness from the active append-only receipt lineage, exact hashes/parents/binding digests, signed review evidence, real timestamps, expiry, caps, and current material. Branch labels, README prose, configured providers, and old green tests are only leads.
- Keep protocol/sample/runner identity, source rights, provider phases, reference seal, canary/full-run reconciliation, scoring, independent review, claim ceiling, and export authority separate. Follow the state machine's actual dependency order; do not turn an explanation into execution of the lifecycle.
- A provider call needs a fresh, exact phase-specific `ProviderGrantBindingV1` identical in provider state, source-rights state, and the active authorization node, plus current runner, route, material, activity, and custody evidence. Credential presence, an earlier general owner statement, or runner concurrence cannot replace that binding. Preserve the reference/evaluated provider separation and attempt/token/USD/concurrency caps.
- Frozen evidence is append-only. Material drift invalidates affected evidence; post-activity drift requires `NEW_REGISTRATION_REQUIRED`. Never repair old receipts/self-hashes, borrow grants across phases/providers, reroll the sample, or waive a failed validator manually.
- Unknown activity is unknown, not zero. Receipt-proven zero remains zero within its dated/current evidence boundary. Interrupted recovery is offline and conservatively retains reservations; reconciliation precedes any reassessment of resume eligibility.
- Natural text, answers, item IDs, exact protected paths, provider bodies/reasoning, credentials, account/project identifiers, billing details, raw research rows, and private identities stay out of chat, Git, templates, reports, and safe exports. Custody tools inspect redacted metadata only.
- `synthetic-fixture` proves structure only and cannot close a natural result, final/claim review, or export. Machine reference is not human gold. Claims stay within the immutable design profile, power artifact, inference frame, and registered ceiling.

## Offline tools and outputs

Run the applicable bundled tool from this skill directory; all support `--help`, remain offline/read-only, and never read credentials or protected content:

| Evidence task | Command |
| --- | --- |
| Packet structure and semantic contract | `node scripts/verify-evidence-envelope.mjs PACKET.json` |
| Receipt-derived state and next gate | `node scripts/resolve-evaluation-state.mjs PACKET.json` |
| Custody metadata/handoff | `node scripts/audit-protected-custody.mjs PACKET.json` |
| Authorized outward aggregate export | `node scripts/validate-redacted-export.mjs PACKET.json` |

Exit `0` means the requested offline check passed, `2` blocked/invalid, and `3` a tool/read failure. Packet-local content-address closure is not issuer authentication; `declaredAuthority` counts are declarations, and no offline validator grants provider authority.

Report the requested conclusion, current or dated evidence boundary, actual blockers/unknowns, and exact next allowed gate. Formal packets use [natural-evaluation-state.schema.json](assets/natural-evaluation-state.schema.json); formal handoffs use [claim-boundary-handoff.template.md](assets/claim-boundary-handoff.template.md). The [project adapter map](assets/project-adapter-map.template.md) and [provider grant request](assets/provider-grant-request.template.md) are scaffolds only: `TEMPLATE_ONLY_NOT_AUTHORIZATION`.

Before execution or export, any missing/mismatched required receipt, signature/identity anchor, direct parent, subject/binding digest, timestamp/expiry, grant/cap/rights/route, material/runner/custody/activity, provenance/result/review/claim/export binding blocks that action. A claim above the registered ceiling also blocks. Preserve unaffected authorized work and explain the remaining gate; never relabel a preflight/canary as a completed evaluation or reuse canary evidence for the full run.
