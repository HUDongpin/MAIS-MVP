# Protected Custody and Recovery

Status: **normative**.

## Protected Material

Natural frame rows, sample manifests, item payloads, role labels, provider requests/responses, and per-item results remain protected. Tracked/public evidence contains only hashes, redacted logical references, counts, fixed states, and aggregate metrics. Never publish question text, answers, item identifiers, exact protected locations, request/response bodies, reasoning, credentials, or personal/account data.

## Custody Metadata and Derived Need

The safe packet binds a custody metadata receipt, a protected-root reference hash, a custody-context hash, verified `0700` directory mode, verified `0600` file mode, verified symlink-free status, and `contentExposed:false`.

Handoff need is never self-reported. The validator derives it:

```text
sample custodyContextSha256 != runner custodyContextSha256
```

Equal nonnull contexts require `NOT_REQUIRED` and all handoff artifact fields null/not-applicable. Different contexts require `REQUIRED` until an active verified handoff node exists. Different contexts without that receipt are blocked in every audit and block execution eligibility.

## Exact Cross-Custody Handoff

A `VERIFIED` handoff and its active `CUSTODY_HANDOFF` graph node bind exactly:

- current sample manifest hash;
- exact runner registration and source-closure hashes;
- source and destination custody-context reference hashes;
- `SAMPLE_CUSTODIAN` sender and `RUNNER_CUSTODIAN` receiver roles;
- `CONTROLLED_COPY` or `CONTROLLED_MOUNT`;
- verified `0700`, `0600`, and symlink-free results;
- verified signature, identity-anchor hash, and handoff receipt;
- `contentCopiedToPublicArea:false`.

The node's receipt equals the top-level receipt and its binding digest covers the complete handoff tuple. A handoff is not provider, credential, spend, Git, publication, or content-acceptance authority.

`audit-protected-custody.mjs` reads only packet metadata. It never opens a protected root, enumerates item files, or prints a path.

## Activity Ledger

Each ledger phase (`REFERENCE_LABELING`, `EVALUATED_CANARY`, and `EVALUATED_RUN`) has distinct append-only kinds for reservation, attempt, completion, egress, and reconciliation. Event kind, phase, typed deltas, receipt, direct parent, time, and binding digest must agree. Evaluated-canary reconciliation precedes the canary milestone. Full-run activity begins strictly after that milestone and ends at a different full-run reconciliation before the run milestone.

The current reconciliation must follow every active phase event. Known phase metrics—reservations, attempts, completed calls, egress, tokens, USD cost, and peak concurrency—must equal event totals and cite that reconciliation receipt. Overall attempts/completions/egress cite the later current activity-summary receipt.

Known zero requires separate zero-delta reconciliation receipts for all three ledger phases plus a current summary. Without them, zero is not evidence. At every receipt prefix, completions and egress cannot exceed attempts, and attempts cannot exceed reservations; a later balanced total cannot cure an earlier impossible prefix. Reconciliation must be the terminal event for its phase. Reference usage is checked against its exact grant caps; evaluated-canary and evaluated-full-run usage is checked both separately and in aggregate against the one evaluated-execution grant.

## Reservation-Only Interruption

A reservation is provider activity for material-currentness and cap accounting, even when provider delivery is unknown. If no current reconciliation exists:

- phase and overall counters are unknown/null, never zero;
- `activity.unknown.categories` is the exact packet-derived union across every active unreconciled phase, not a caller-selected explanation list;
- state is `INTERRUPTED_RECONCILIATION_REQUIRED`;
- next action is `RECONCILE_ACTIVITY_OFFLINE`;
- resume, score, review, and export remain blocked.

The resolver derives categories from the actual append-only event prefix and the corresponding unknown phase metrics. A positive reservation with no attempt requires `ATTEMPT_RESERVATION_ONLY`. An unresolved attempt/delivery dimension requires `PROVIDER_DELIVERY_UNKNOWN`; unknown completed calls, egress, token use, cost, and peak concurrency require `COMPLETION_UNKNOWN`, `EGRESS_UNKNOWN`, `TOKEN_USAGE_UNKNOWN`, `COST_UNKNOWN`, and `CONCURRENCY_UNKNOWN`, respectively. The union is exact: omitting any applicable category yields `ACTIVITY_UNKNOWN_CATEGORIES_INCOMPLETE`, while an inapplicable or unknown extra yields `ACTIVITY_UNKNOWN_CATEGORIES_UNSUPPORTED`. These categories describe epistemic state only; they neither prove provider activity nor authorize a retry.

Do not delete reservations to recover cap budget.

## Zero-HTTP Recovery

`RECOVER` is always offline. It reconstructs state from protected journals and safe receipt hashes without retrying, probing a provider, refreshing a token, or reading raw response bodies. Bundled scripts contain no provider client.

After reconciliation, re-check current material bindings, grant freshness, route anchor, remaining per-phase caps, custody, reference seal, and repository runner identity. Recovery never refreshes authority automatically and never mutates a frozen registration.
