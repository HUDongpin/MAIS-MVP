# A21 MAIS Natural CA60 V5 frame-readiness session

## Session identity

- Lane: `A21` runtime frame, local screening, cluster, and sample tooling.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a21-natural-ca60-frame-v5-20260826`.
- Branch: `codex/a21-natural-ca60-frame-v5-20260826`.
- Base/V5 activation commit: `53b596a8821b5aca66f73a314cf04e2fc613d71d`.
- Target PR: `pending`.
- Creation date: `2026-08-26`.
- Expected closeout date: `2026-08-27`.

## Write scope

- package-local implementation and tests under
  `coordination/content-qa/mais-natural-ca60-v1/`
- package-local closed schemas
- this A21 session log
- local protected artifacts under `.local/mais-natural-ca60-v1/` only after the
  runner is committed and executed from a clean exact-SHA worktree

## Boundary

- Read the same California runtime source used by `questionStore.ts` without
  mutating the live question bank.
- Produce no provider call, credential read, route probe, question egress,
  reference label, DeepSeek result, or formal decision.
- Treat rights and the frozen fine-grained lineage rule as owner-hash gates.
- Until those exact roots are approved, report readiness and a decision request;
  do not claim that the frame or sample is frozen.

## Implemented slice

- Added a clean-exact-SHA CLI that hashes its committed source closure before
  reading the California runtime inventory.
- Added full-inventory homology integration, conservative source-rights
  classification, local PII/secret screening, and aggregate-only readiness
  receipts.
- Added protected, append-only/idempotent custody with `0700` directories and
  `0600` files under `.local/mais-natural-ca60-v1/`.
- Finalized the custody-bearing readiness receipt before building the owner
  decision request, so the request binds the exact persisted receipt hash.
- Added closed JSON Schemas for the readiness receipt, rights policy, and owner
  decision request.

## Local descriptive result before clean execution

- Runtime-visible items: `2,802`.
- Full-frame homology clusters: `694`; singleton clusters: `147`.
- Frame failures and blocking cluster anomalies: `0` in this local diagnostic.
- Conservative potential egress subset: `482` text-only items in `106`
  independent clusters across `7` nonempty strata.
- Provider requests, credential reads, and natural-question egress: `0`.
- This is not the clean-SHA A22 receipt and does not freeze the frame or sample.

## Verification

- `frame-readiness-v5.test.ts`: `7/7` passed.
- Existing clustering audit: `4/4` passed.
- Existing runtime extractor/integration set: `7/7` passed.
- `npm run type-check`: passed.
- Whitespace checks: passed for the tracked README and every new exact path.

## Handoff

Final package state for this A21 slice: `reviewed commit` once the exact paths
below are committed on this branch. The next authorized step is an A22 clean
worktree execution of the committed CLI with a canonical fixed timestamp. That
execution may publish aggregate counts/hashes and the exact owner decision
request only; it remains forbidden from reading credentials or contacting a
provider.
