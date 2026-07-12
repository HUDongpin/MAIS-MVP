# 2026-06-06 S12 Postgres Residual Risk Closure

## Scope

- Session: S12.
- Objective: reduce the two residual risks after S19 restored production auth/storage on fresh Postgres.
- Secret handling: no database URL, Vercel token, cookie value, admin password, smoke password, raw credential, or secret value was printed, copied, stored, staged, committed, or pushed.

## Current Findings

- Production is no longer connected to the old quota-exhausted project resource from the MAIS Vercel project view.
- The currently connected project resource is `mais-mvp-postgres-rescue`, status available.
- Production environment variable names still include the expected Postgres variables and `HK_MATH_STORAGE_PROVIDER`.
- `MAIS_BOOTSTRAP_ADMIN_*` variable names are not visible in the current Production env listing.
- Local direct SQL maintenance is blocked: all checked Postgres URL variable classes returned `CONNECT_TIMEOUT` from this local environment, matching S19's earlier local-connect blocker.

## Code Closure Added

S12 added an approved admin-only maintenance path for temporary bootstrap admin hygiene:

- `GET /api/admin/storage/temporary-bootstrap-admins`
  - Admin-only.
  - Dry-run only.
  - Returns only cutoff, matched count, and whether the authenticated admin would match.
- `POST /api/admin/storage/temporary-bootstrap-admins`
  - Admin-only.
  - Defaults to dry-run unless `dryRun:false` and `confirm:"delete-temporary-bootstrap-admins"` are both present.
  - Uses default cutoff `2026-06-06T09:00:00.000Z`.
  - Rejects any requested cutoff earlier than that recovery-window floor.
  - Matches only `role=admin`, `id` beginning with `admin-`, and `created_at` on/after the cutoff.
  - Requires `allowSelfRemoval:true` if the authenticated admin is also a cleanup candidate.
  - Removes only matching user records and directly attached profile/settings/membership/password-reset rows.
  - Returns counts only; it does not return usernames, emails, IDs, password hashes, or credentials.

S12 also added a registration-focused old-to-fresh snapshot merge tool:

- `scripts/storage-admin-snapshot-merge.mjs`
  - Defaults to dry-run and prints safe counts only.
  - Skips admin users by default.
  - Skips any user with id, username, or email conflict against the fresh snapshot.
  - Writes full merged snapshots only to ignored local/temp roots.
  - Can apply to `POSTGRES_URL` only with `--apply --confirm-apply apply-merged-snapshot`.
  - Refuses live apply if target `app_state` no longer matches the supplied fresh `--current` snapshot.

## Operational Status

- The production admin-smoke cleanup was not executed in this pass because the new route is not deployed to Production and direct local Postgres maintenance cannot connect.
- Do not deploy the current dirty worktree just for this route without S19/S22 production-deploy approval.
- Once deployed through the normal release path, S12 can run:
  - admin dry-run against `GET /api/admin/storage/temporary-bootstrap-admins`;
  - if matched count is limited to the expected temporary bootstrap records, `POST` with the confirmation string and `dryRun:false`;
  - if using the temporary admin itself, include `allowSelfRemoval:true`, then immediately verify the session no longer authorizes admin health.

## Old Resource Migration Status

- Historical registrations that only exist in the old quota-exhausted database still require old-resource quota restoration or an owner-approved Neon/Vercel resource-side export path.
- No migration/export was attempted from the old resource in this pass because the old resource is not connected in the project view and no approved working SQL/export channel was available.
- Runbook: `coordination/reports/2026-06-06-S12-old-postgres-registration-migration-runbook.md`.

## Checks

- Passed: `git diff --check -- lib/server/userStore.ts app/api/admin/storage/temporary-bootstrap-admins/route.ts`.
- Passed: `npm run type-check`.
- Passed: `node scripts/storage-admin-snapshot-merge.mjs --self-test`.
- Passed: added-line redaction scan found no credentialed URLs, database URLs, cookies, bearer tokens, Vercel tokens, or assigned secret literals.
- Passed: Vercel project resource name/status check, redacted to resource names only.
- Blocked: direct local Postgres read/write check, all URL variable classes returned `CONNECT_TIMEOUT`.

## Handoff

- S12: maintenance code path is ready for normal review/deploy.
- S19/S22: approve and coordinate a Production deployment before S12 executes cleanup in production.
- Owner/S19: restore old quota-exhausted Neon resource or provide an approved old-resource export channel before any historical registration migration can proceed.

## Continuation Recheck

- Current Vercel resource view still lists `mais-mvp-postgres-rescue` as the connected available Neon resource for `mais-mvp`.
- Current Production env-name view has `POSTGRES_URL` and `HK_MATH_STORAGE_PROVIDER`; it has no visible `MAIS_BOOTSTRAP_ADMIN_*` names.
- Minimal local `POSTGRES_URL` query still fails with error class `CONNECT_TIMEOUT`, so direct local DB cleanup/apply remains blocked by connectivity.
- The old quota-exhausted resource is still not available through the current project resource view; migration remains waiting on an owner-approved old-resource export channel.
- External blocker report: `coordination/blockers/2026-06-06-S12-postgres-residual-risk-external-blockers.md`.
