# A22 production schema preflight diagnostics — 2026-08-26

- Owner: A22 production reliability and release engineering
- Branch: `codex/a22-production-schema-preflight-diagnostics-20260826`
- Target PR: pending
- Baseline: protected `main` at `00f14a8fc3a8b7896126085c5e349c96474a903b`
- Expected closeout: 2026-08-26

## Scope

Add privacy-safe, allowlisted stage diagnostics to the teacher-notice production
schema gate. The diagnostic must identify the failing component boundary without
serializing provider errors, database URLs, credentials, database identifiers, or
other raw exception content. No schema behavior, authorization, confirmation, or
mutation condition is relaxed.

## Trigger evidence

- Production schema-preflight run `32960580718`, attempts 1 and 2, both bound to
  baseline SHA `00f14a8fc3a8b7896126085c5e349c96474a903b`.
- Both attempts completed checkout, protected-main binding, Node setup, and locked
  dependency installation, then failed in the read-only schema-preflight step.
- The deploy job was skipped and no production database mutation occurred.
- The repeated failure makes a transient provider error unlikely, while the
  intentionally redacted top-level error did not identify the failing boundary.

## Test evidence

- RED: the focused schema-gate test failed because the safe stage accessor did not
  exist.
- GREEN: `node --import tsx --test scripts/teacher-notice-production-schema-gate.test.mjs`
  passed 18/18 after implementation.

## Handoff

After review and protected-main integration, rerun schema-preflight exactly once.
Use only the emitted allowlisted `stage` field to locate the root-cause boundary;
do not expose or persist the confirmation string or provider/database secrets.
