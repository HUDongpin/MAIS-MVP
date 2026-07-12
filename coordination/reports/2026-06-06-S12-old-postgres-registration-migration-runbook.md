# 2026-06-06 S12 Old Postgres Registration Migration Runbook

## Purpose

This runbook turns the old quota-exhausted Postgres risk into an executable, secret-safe migration path once the old resource can be read again.

Scope is registration-focused:

- migrate non-conflicting historical `users`;
- migrate directly attached `student_profiles`, `user_settings`, and `learner_profiles`;
- migrate `guardian_links` only when both linked users are present after merge;
- skip admin users by default;
- skip any user with id, username, or email conflict against the fresh snapshot.

It does not claim full learning-history, assignment, teacher-console, analytics, or reward-ledger migration.

## Required Inputs

- Old quota-exhausted database admin export JSON, stored only under `.local/`, `.tmp/`, `tmp/`, `temp/`, or `/tmp`.
- Fresh current Production admin export JSON, captured immediately before merge/apply.
- Owner-approved old-resource read path and owner-approved fresh-resource write path.
- Maintenance window or quiet period, because the final apply writes the merged JSONB `app_state` row.

Do not put export snapshots in Git-tracked paths. Admin storage exports contain password hashes/salts and user data.

## Commands

1. Export old and fresh snapshots through approved admin/resource channels into ignored local storage, for example:

```bash
mkdir -p .local/postgres-migration
```

2. Dry-run the registration merge and print safe counts only:

```bash
node scripts/storage-admin-snapshot-merge.mjs \
  --old .local/postgres-migration/old-quota-export.json \
  --current .local/postgres-migration/fresh-current-export.json
```

3. Generate a merged local-only snapshot and a safe summary:

```bash
node scripts/storage-admin-snapshot-merge.mjs \
  --old .local/postgres-migration/old-quota-export.json \
  --current .local/postgres-migration/fresh-current-export.json \
  --out .local/postgres-migration/merged-registration-snapshot.json \
  --summary-out coordination/reports/2026-06-06-S12-old-postgres-registration-migration-summary.json
```

4. Apply only from an approved environment that can reach the fresh Postgres `POSTGRES_URL`:

```bash
node scripts/storage-admin-snapshot-merge.mjs \
  --old .local/postgres-migration/old-quota-export.json \
  --current .local/postgres-migration/fresh-current-export.json \
  --apply \
  --confirm-apply apply-merged-snapshot \
  --summary-out coordination/reports/2026-06-06-S12-old-postgres-registration-migration-apply-summary.json
```

The apply command refuses to write if the target `POSTGRES_URL` `app_state` no longer matches the `--current` snapshot, so re-export fresh current state if there has been any new registration or storage mutation.

## Post-Apply Verification

- Authenticated admin storage health returns `provider=postgres`, `status=durable-ready`, `durableReady=true`, and `usingTmpFallback=false`.
- Dry-run `GET /api/admin/storage/temporary-bootstrap-admins` still returns only counts.
- Sample migrated non-admin accounts can log in only through owner-approved smoke credentials or owner-approved account reset flows.
- Fresh post-recovery accounts created after the `--current` snapshot are not silently lost; if the apply command rejected due target mismatch, re-export current and rerun merge.

## Stop Conditions

- Old resource remains quota-exhausted or unavailable.
- Fresh Postgres is not reachable from the approved apply environment.
- Dry-run reports unexpected admin imports, high conflict counts, or imported user counts inconsistent with the expected historical registration window.
- The target app_state match check rejects the apply.
- Any command output would expose raw credentials, cookie values, database URLs, password hashes, or user-identifying rows.

## Checks Already Run

- `node scripts/storage-admin-snapshot-merge.mjs --self-test` passed.
- No production data was exported, merged, applied, staged, committed, or pushed in this pass.
