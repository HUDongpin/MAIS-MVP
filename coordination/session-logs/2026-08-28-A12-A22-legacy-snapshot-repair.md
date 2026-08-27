# A12/A22 production legacy snapshot missing-collection repair

- Session slice: `codex/a12-a22-legacy-snapshot-repair-20260828`
- Baseline: `56b4c1bb644725effe14d58cca0596202a36c7eb`
- Owner: A12 backend/API platform with A22 production reliability
- Target PR: pending
- Created: 2026-08-28
- Expected closeout: 2026-08-28 after protected-main schema preflight and release

## Production evidence and interpretation

The exact protected-main read-only preflight run `33110288448` reached the real
PostgreSQL provider and failed closed with `reason: app-storage-partial` and
`component: legacy-snapshot-missing-collections`. The deploy job was skipped;
no schema or application mutation ran.

Following the explicitly requested Andrej Karpathy coding guidance, this slice
uses the smallest repair consistent with that evidence. It adds only missing
top-level empty collection containers. It preserves every existing key and
value, refuses malformed state, refuses missing hot-auth or compatibility-
projection collections, and requires the repaired payload to satisfy the full
current snapshot contract before any write is admitted.

## Safety boundary

- Read-only inspection returns the new state only when the additive repair is
  provably complete under the exact validated production seed/storage env.
- The existing marker-only legacy operations remain snapshot-preserving and
  contain no `UPDATE public.app_state`.
- The new operation runs in its own exclusive advisory/table/row-lock
  transaction, uses revision CAS, checks returned payload/revision/identity,
  upgrades an exact legacy-v1 compatibility trigger when required, validates
  the full payload, installs the shared marker contract, and attests the new
  revision last.
- Any high-risk missing collection, record drift, concurrent revision change,
  trigger rewrite, catalog drift, or postflight mismatch rolls back the whole
  transaction.

## Verification

- The pure additive-repair test was observed red before implementation because
  the repair hook did not exist.
- The production-plan and deployment-evidence tests were observed red before
  the new state/operation existed.
- The production-env binding test was observed red before read-only inspection
  ran inside the validated production configuration.
- `npm run type-check`: pass.
- Production schema gate: `25/25` pass.
- Deployment evidence suite: `10/10` pass.
- PostgreSQL fast-path suite: `10/10` pass.
- `npm run test:postgres-readiness`: runner `1/1`; readiness suite `58/58`.
- `npm run test:parent-console`: tooling `76/76`; runtime `403/403`; zero
  skipped and zero failed.
- PostgreSQL 16 integration coverage includes safe additive repair, high-risk
  rejection, exact postflight, revision increment, payload digest preservation,
  marker attestation, and repeated-plan rejection. Local Docker did not answer
  the bounded probe, so PR CI remains the authoritative real PostgreSQL result.

No production row, secret, cookie, database URL, notification payload, or
guardian identifier is recorded in this handoff.
