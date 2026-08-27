# A12/A22 production legacy snapshot diagnostic

- Session slice: `codex/a12-a22-legacy-snapshot-diagnostic-20260828`
- Baseline: `3572ecf69144fa344979fae73f3656a83cb7597d`
- Owner: A12 backend/API platform with A22 production reliability
- Target PR: pending
- Created: 2026-08-28
- Expected closeout: 2026-08-28 after protected-main read-only preflight diagnosis

## Scope and assumption

The exact protected-main production schema preflight run `33104101103`
reached the real PostgreSQL provider and failed closed with
`reason: app-storage-partial` and `component: legacy-snapshot-contract`.
No schema mutation or deployment ran.

This slice makes only that final snapshot classification more precise. It
distinguishes an invalid state row/revision, missing required top-level
collections, malformed collection types, and a remaining record-level legacy
contract. The probe uses allowlisted collection names, returns only one fixed
component, and never emits a payload value, row, credential, database target,
or provider diagnostic.

## Verification

- The focused regression was observed red before implementation because the
  pure classifier export did not exist.
- Focused regression after implementation: pass.
- Production schema gate: `25/25` pass.
- `npm run type-check`: pass.
- `npm run test:postgres-readiness`: runner `1/1`; readiness suite `57/57`.
- `npm run test:parent-console`: tooling `76/76`; runtime `403/403`; zero
  skipped and zero failed.
- PostgreSQL 16 integration assertions cover missing collection, malformed
  collection, and invalid revision classifications. Local direct access to the
  production provider timed out before opening a transaction, so the protected
  GitHub PostgreSQL 16 job and the serialized protected-main read-only preflight
  remain the authoritative execution gates.

No production row, secret, cookie, database URL, notification payload, or
guardian identifier is recorded in this handoff.
