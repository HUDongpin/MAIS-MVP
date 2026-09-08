# TEMPLATE_ONLY_NOT_AUTHORIZATION

Output language / 输出语言: follow the user's language; keep machine enums and JSON field names in English.

This redacted handoff records an evidence boundary. It does not approve content, provider execution, promotion, release, deployment, publication, or live behavior.

## Observation

- Observed at: canonical UTC-millisecond timestamp
- Evidence class: `natural-sample-evaluation`
- Mode: one approved enum value
- Receipt-derived lifecycle state: fixed state enum
- Repository HEAD/clean state: hash and boolean only

## Bound Evidence

- Protocol registration SHA-256: lowercase hash
- Registered design-profile ID and power-artifact SHA-256: redacted logical ID plus lowercase hash
- Sample manifest SHA-256: lowercase hash
- Runner registration/review SHA-256: lowercase hashes
- Receipt-lineage terminal SHA-256: lowercase hash
- Material-currentness receipt and binding digest: lowercase hashes
- Registered inference-frame SHA-256: lowercase hash
- Independent freeze/runner/final/claim review states: fixed enums

## Authority and Activity

- Required/proven/missing authority counts: nonnegative counts
- Fixed blocker codes: closed list only
- Attempts: known count or `unknown/null`
- Completed calls: known count or `unknown/null`
- Egress: known count or `unknown/null`
- Reference/evaluated-canary/evaluated-full-run tokens, USD cost, and peak concurrency: separately reconciled aggregates or unknown/null
- Canary/full-run reconciliation and coverage binding: distinct lowercase hashes
- Unknown categories: closed list only

## Custody Boundary

- Protected custody metadata hash-bound: yes/no
- `0700` directory / `0600` files / symlink-free: yes/no
- Sample/runner custody contexts equal: yes/no (derived from hashes; do not include paths)
- Cross-custody handoff status: `NOT_REQUIRED`, `REQUIRED`, or `VERIFIED`
- Handoff receipt/source/destination reference SHA-256 values: hashes only
- Protected content copied to public area: **false**

## Claim Boundary

- Registered claim ceiling: fixed scalar enum
- Run provenance: `natural-registered` or `synthetic-fixture`
- Result conclusion and metrics provenance: fixed enums plus aggregate counts only
- Result/claim/aggregate binding digests: lowercase hashes
- Human-gold claim allowed: **false**
- Content acceptance claim allowed: **false**
- Promotion/release/deployment/live claim allowed: **false**
- Exact next allowed action and owner lane: fixed action plus redacted lane
- Explicitly unproved boundaries: concise list

Never include question text, answers, item IDs, exact protected paths, credentials, account/project identifiers, authorization text, raw provider bodies, reasoning, billing details, or personal identifiers.
