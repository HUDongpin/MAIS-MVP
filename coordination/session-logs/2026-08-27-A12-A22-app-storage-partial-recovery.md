# 2026-08-27 A12/A22 App-Storage Partial Recovery

- Owners: `A12` shared storage architecture and `A22` production reliability/release engineering
- Branch: `codex/a12-a22-app-storage-partial-recovery-20260827`
- Baseline: protected `main@5e29275c685ea72697ee18cbe05910bb5a6ad0b2`
- Trigger evidence: protected read-only release run `33063872393` bound the exact baseline, completed production inspection, and failed closed at `evidence-build` with the allowlisted reason `app-storage-partial`; deploy was skipped.

## Objective

Identify the exact fail-closed app-storage subcondition without exposing catalog values, credentials, database identity, or snapshot data. Then add only the specifically attested transactional compatibility path needed to reach the canonical readiness-marker contract and restore login availability through the protected exact-main release workflow.

## Declared write scope

- `lib/server/userStore.ts`
- Focused app-storage readiness and PostgreSQL integration tests
- `scripts/teacher-notice-production-schema-gate.mjs`
- `scripts/teacher-notice-production-schema-gate.test.mjs`
- `scripts/nova-postgres-integration-worker.ts` only for local-test evidence plumbing
- This session log

## Safety boundaries

- No production mutation while the state remains `partial`.
- No raw PostgreSQL catalog rows, function bodies, hashes derived from production, relation counts, snapshot values, URLs, credentials, or provider diagnostics may enter CI output or Git.
- A diagnostic may emit only a fixed allowlisted contract category such as legacy physical relations, required catalog, compatibility trigger/function, hot-auth catalog, orphan readiness artifact, or snapshot validity.
- Any unknown or unvalidated diagnostic remains the generic `app-storage-partial` reason.
- Production mutation and deployment remain restricted to the existing serialized protected-main workflow with exact confirmation, same-connection postflight, independent postflight, and same-SHA promotion.

## Plan

1. Refactor the read-only production inspector to retain a fixed allowlisted partial category while preserving the existing public state-only API.
2. Bind only validated categories into the production schema gate's already-redacted failure reason.
3. Add unit and isolated PostgreSQL 16 regression coverage proving exact legacy states still succeed and deliberate source/config/catalog drift remains partial with the correct safe category.
4. Merge through protected PR checks, verify exact-main CI and Promotion Shadow, and rerun the read-only protected preflight.
5. Implement or select only the migration authorized by the newly attested category, then repeat protected review, preflight, transactional apply, postflight, exact-SHA deploy, login/session verification, and separate auth-funnel repair.
