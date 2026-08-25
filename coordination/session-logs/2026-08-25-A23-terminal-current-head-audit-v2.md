# A23 Terminal Current-HEAD Audit v2

- Owner: A23 Integration and Promotion
- Branch: `codex/a23-terminal-current-head-audit-v2-20260825`
- Target PR: https://github.com/HUDongpin/MAIS-MVP/pull/154
- Created: 2026-08-25
- Expected closeout: 2026-08-25
- Baseline: `602b503b9f124e4c499fd4ca2bbfcb16f540b081`
- Policy genesis: `36a4d732e6d0e2b8fdb48fbb7bf25a2924ab5cce`
- Scope: additive v2 terminal current-HEAD audit only; v1 releases, Promotion Gate core, immutable attempt artifacts, workflow, package files, and all live surfaces are read-only.

## Purpose

Close the independent-review findings without rewriting the frozen v1 audit:

1. Bind candidate source and target baseline commits to the audited HEAD and compare source candidate bytes.
2. Bind target-HEAD audit/core bundle bytes to a separately pinned ledger-only release.
3. Bind the immutable policy to a single-path genesis commit and fixed raw/self digests.
4. Require top-level report proofs to equal their ordered check evidence.
5. Produce a real post-state proof after any guardable target failure.
6. Reject import aliases, computed promotion calls, global capabilities, and frozen-core capability aliases.

## Initial verification

- `node --test coordination/integration/current-head-audit/promotion-terminal-audit-v2.test.mjs`: 58 pass, 0 fail, 1 opt-in real-audit skip.
- JSON Schema draft 2020-12 validation is executed with Ajv for positive policy/report fixtures and nested negative cases.
- No Shadow retry, Receipt replay, Preview, deployment, provider, database, network, live registry import, or production write is implemented.

## Current status

Implementation is ready for an exact-path commit. The v2 release ledger and real two-run audit must be produced only after the implementation commit is frozen. Maturity remains `not-shadow-mature`; `liveAllowed=false`.
