# A12/A22 Parent Production Instance-Proof Session

- Owner lanes: A12 backend/API platform and A22 production reliability
- Branch: `codex/a12-a22-parent-instance-proof-20260827`
- Worktree: `.worktrees/a12-a22-parent-instance-proof-20260827`
- Baseline: `a8f910490b0120726e3797d1d4156c39a902cadd` (`origin/main` at creation)
- Target PR: pending
- Created: 2026-08-27
- Expected closeout: 2026-08-27
- Dependency state: clean `npm ci` from the baseline `package-lock.json`

## Scope

Add a production-only, secret-authorized, opaque per-process proof header to
successful parent message create/reply responses. The proof exists solely to
demonstrate that one database idempotency key is enforced across distinct
production execution processes. Ordinary, unauthenticated, identity-conflicted,
non-production, wrongly authorized, and failed requests receive no proof header.

## Evidence

- Focused parent message route tests: 6/6 passed.
- Parent tooling contracts: 76/76 passed.
- Complete parent Node gate: 401/401 passed, zero skipped.
- `npm run type-check`: passed.
- Fresh `npm run build`: passed; generated `next-env.d.ts` preimage restored.
- Runtime policy: the first separate-helper layout was correctly rejected with
  `V2_RUNTIME_GRAPH_DRIFT` because it added one covered/reachable module and two
  dependency edges. That rejected append-only evidence remains an audit record.
  The implementation was then moved into the already imported auth module;
  the canonical observer reports zero changed runtime-policy fields, and the
  focused tests, complete 401-test gate, type-check, and fresh build passed
  again after the refactor.

No credential value is stored in this log or in the implementation.
