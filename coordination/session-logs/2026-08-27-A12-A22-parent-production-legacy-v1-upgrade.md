# A12/A22 Parent production legacy compatibility upgrade

- Session slice: `codex/a12-a22-legacy-compat-upgrade-20260827`
- Baseline: `889e0f1f23ca46b7f1553c3af07f4a317b1cd4c1`
- Owner: A12 backend/API platform with A22 production reliability
- Target PR: pending
- Created: 2026-08-27
- Expected closeout: 2026-08-27 after protected-main integration and production gate completion

## Scope

The production read-only schema preflight identified the exact historical
`sync_ai_tutor_compatibility_from_state` function fingerprint with the eight
canonical pre-readiness relations, complete snapshot, hot-auth v4 contract,
one canonical compatibility trigger, and no readiness-marker artifacts.

This slice adds a distinct fail-closed state and versioned operation for that
single reviewed historical contract. The operation acquires the existing
exclusive advisory and table locks, re-attests the full catalog and snapshot,
replaces the compatibility function with the existing canonical implementation,
installs the readiness marker contract, and post-attests the exact schema in one
transaction. Canonical marker-only completion remains a separate operation.

## Verification

- `npm run type-check`: pass.
- Parent console runtime gate: 400/400 pass, 0 skip.
- Focused storage and production-schema tests: 75/75 pass.
- Fresh PostgreSQL 16.15 integration: 11/11 pass, including exact historical
  fingerprint recognition, function-source drift rejection, function-config
  drift rejection, rollback without marker artifacts, repeated-operation
  rejection, and unchanged snapshot payload digest, revision, and timestamp.
- `npm run build`: pass; local build ID `GBCbGPauXuciqk63SW0Kl`.
- `git diff --check`: pass; no tracked `next-env.d.ts` change.

No credential value, database URL, notification payload, family identifier, or
provider diagnostic is recorded in this handoff.
