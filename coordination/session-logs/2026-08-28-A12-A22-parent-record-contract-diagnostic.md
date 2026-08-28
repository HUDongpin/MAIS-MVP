# A12/A22 parent record-contract diagnostic

## Session identity

- Owner lanes: A12 backend/API platform and A22 production reliability.
- Branch: `codex/a12-a22-parent-record-contract-diagnostic-20260828`.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a12-a22-parent-record-contract-diagnostic-20260828`.
- Baseline: protected `main` commit `9bf9cfb99f75a0dbc5a298e0d6aae74594571890`.
- Target PR: pending.
- Created: 2026-08-28.
- Expected closeout: 2026-08-28 after merge, post-merge gates, and production read-only diagnosis.

## Assumption and scope

Production collection-gap diagnosis proved that `guardian_invitations` is the
only structurally missing collection. The current full snapshot contract still
rejected an in-memory v2 addition, so this slice tests the narrower historical
hypothesis that legacy parent-access bearer-code fields remain in otherwise
valid records.

This slice is diagnostic-only. It does not add a mutation, confirmation,
deployment, schema operation, or production write path.

## Changes

- Add a protected-main workflow mode named
  `parent-access-record-diagnostic`.
- Read the single canonical app snapshot in a PostgreSQL
  `REPEATABLE READ, READ ONLY` transaction under the shared storage-contract
  advisory lock.
- Require the exact known structural state: every current array/object is
  present and well-typed except the absent `guardian_invitations` array.
- In memory only, add the independent empty invitation collection and remove
  the two legacy fields that the guardian-invitation migration deprecated.
- Evaluate that virtual payload with the canonical current snapshot contract.
- Emit only exact candidate SHA/tree binding, an allowlisted list containing
  zero or more of the two field paths, and `virtualRepairComplete`.
- Reject extra keys, unknown field names, duplicate or reordered field names,
  invalid production environment binding, or ambiguous snapshot structure.
- Preserve and restore the production app-storage environment allowlist around
  the canonical contract evaluation.

No snapshot payload, record value, invite value, row identifier, count, target
URL, credential, or confirmation is emitted.

## Verification

- Red phase:
  - schema-gate test failed because the diagnostic export did not exist;
  - workflow tests failed because the new mode and job did not exist.
- `npm run type-check`: pass.
- `node --import tsx --test scripts/teacher-notice-production-schema-gate.test.mjs`:
  33 passed, 0 failed.
- `node --test scripts/production-deploy-workflow.test.mjs`:
  9 passed, 0 failed.
- Real isolated PostgreSQL 16.15:
  `lib/server/userStoreNovaPostgresIntegration.test.ts` passed 13/13,
  including digest/revision/timestamp no-change proof for this diagnostic.
- `node --test scripts/postgres-schema-fast-path.test.mjs scripts/run-postgres-readiness-tests.test.mjs`:
  11 passed, 0 failed.
- `npm run test:release-governance`:
  91 passed, 11 explicit skips, 0 failed.
- `node --check scripts/teacher-notice-production-schema-gate.mjs`: pass.
- `git diff --check`: pass.

The temporary PostgreSQL cluster was stopped and removed after verification.

## Remaining gate

Commit and push this exact slice, open a PR, require all exact-SHA CI and
Promotion gates, merge, re-run post-merge gates, and only then dispatch the
new read-only production diagnosis. Production mutation and deployment remain
closed until that evidence proves an exact safe repair.
