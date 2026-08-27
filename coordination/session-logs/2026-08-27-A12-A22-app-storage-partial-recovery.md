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

## Read-only diagnostic implementation

- Added a typed production-schema inspection result containing the existing coarse state plus one nullable, fixed allowlisted partial category. The original state-only export remains as a compatibility wrapper.
- Split the eight-relation no-marker inspection into fail-closed checks for physical relations, required catalog, compatibility trigger/function, hot-auth catalog, orphan readiness artifacts, and the single legacy snapshot.
- Added fixed categories for the nine-relation canonical path covering required catalog, invalidation contract, readiness marker, and hot-auth catalog. Unexpected relation sets retain a separate fixed category.
- The protected gate accepts only those fixed enum values. Unknown values are rejected during PostgreSQL inspection validation and become the existing redacted `unknown` failure; omitted values retain the generic `app-storage-partial` fallback.
- Successful preflight evidence, confirmation digests, operation names, and mutation behavior remain unchanged. No production value, count, source, hash, URL, identity, or credential is included in the diagnostic contract.

## Local verification

- Focused production-schema gate tests: `25/25` passed.
- PostgreSQL schema fast-path tests: `9/9` passed.
- PostgreSQL readiness tests: `57/57` passed.
- Release-governance tests: `91/91` passed with `11` deliberate skips.
- TypeScript type-check passed.
- Full optimized Next.js production build passed, including generation of all `202` static pages.
- The real PostgreSQL 16 integration assertions cover exact canonical, canonical without marker, exact legacy-v1, physical-relation drift, function-source drift, and function-search-path drift. A local Docker image pull did not complete, so the required GitHub `postgres-integration` job remains the authoritative execution of those assertions; no container or image was left running locally.
- Parent-console tests passed `75/76`. The sole macOS-only failure is an existing path-safety expectation ordering difference involving the resolved `/private/tmp` path. The three responsible configuration/test files are byte-identical to protected `main`, and the exact baseline's Ubuntu parent-console job is green; no unrelated change was made.

## Next protected step

Open the diagnostic PR and require all branch checks plus Promotion Shadow on its exact head. After merge, require exact-main CI and Promotion Shadow before dispatching another read-only protected schema preflight. Production mutation remains prohibited until that run returns a specifically authorized operation and confirmation.
