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

The v2 implementation and ledger are frozen without rewriting either v1 or the immutable Promotion attempt:

- Implementation commit: `87679c4f229d3befc8e858fe3a671e534e72ea2f`.
- Ledger-only release commit: `ca89c923065a1b9dd6aee40fbc78326be13aae07`.
- Audit bundle digest: `f8cbd2f42ce8b0090dcc0cb2d4a79dfcffce79a21c2274de3cbf0c5e7653d052`.
- Frozen core bundle digest: `517f670a46ce82be60b11ee1b179f63e274517ca5f431d95be58805fa96ededf`.

## Exact release verification

The release was checked from a separate clean detached worktree at
`ca89c923065a1b9dd6aee40fbc78326be13aae07`, with its own `npm ci --ignore-scripts`
dependency installation:

- `promotion-terminal-audit-v2.test.mjs` with the real-audit opt-in: 59 pass, 0 fail, 0 skipped.
- `promotion-gate.test.mjs`: 120 pass, 0 fail, 0 skipped.
- Two direct CLI runs both returned the required `fail` / exit `1` with primary reason
  `LEGACY_NEW_CONFLICT`, 15 new conflicts, and one opaque conflict retained as the
  secondary `LEGACY_DISCOVERY_INCOMPLETE` condition.
- Raw audit digests differed (`c861ab37dd0a6a66086499abdcf1b5a3b72e66f23e6b5318dfa061c8a8fbb72f`
  and `c5b499755224f91780e4e2784edb216da8a75d38336e6618de0cb5fb28b6d778`),
  while both semantic audit digests were
  `a0fff2329eec0c60f7a5e178c52040882ee5daa0348b60a222aac1f467cbad50`.
- Both reports proved identical pre/post HEAD, clean status, stable index and candidate
  digest, and `observedPersistentRepositoryMutationCount=0`.
- A deliberately malformed absolute `--policy` invocation was rejected as `PATH_UNSAFE`;
  the public CLI contract accepts only a repository-relative policy path.

The immutable attempt remains `repair_required`. Maturity remains
`not-shadow-mature`; `liveAllowed=false`. This closeout log is deliberately outside the
frozen audit bundle; its own log-only commit must receive one final current-HEAD audit
before handoff.
