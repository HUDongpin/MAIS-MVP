# A22 deploy v3 evidence parser

## Session identity

- Owner lane: A22 production reliability and release engineering.
- Branch: `codex/a22-deploy-v3-evidence-parser-20260828`.
- Worktree:
  `/Volumes/Starship/MAIS-MVP/.worktrees/a22-deploy-v3-evidence-parser-20260828`.
- Baseline: protected `main` commit
  `cb91c17be17c5dde9655307bcf3bbf4d0cc174d9`, tree
  `4cc0cea5a077f2949d1c9e011d7726bd7e520daf`.
- Target PR: pending.
- Created: 2026-08-28.
- Expected closeout: 2026-08-28 after independent review, exact-head and
  post-merge gates, production source-parity deployment, and live login
  revalidation.

## Admitted discrepancy

Protected-main production deploy run `33157450054` applied the confirmed
`app-storage-repair-parent-session-lifecycle-v3` database operation, then the
deploy wrapper rejected the safe apply evidence before any Vercel deploy or
promotion began. Safe localization proved:

- the schema gate command itself did not fail;
- the wrapper evidence parser rejected the result;
- neither Vercel deploy nor Vercel promotion started.

The v3 schema-gate implementation and tests were present, but
`scripts/deploy-vercel-production.mjs` still admitted app-storage states and
operation plans only through v2. A later exact-state deploy run `33158652838`
used an empty operation plan, deployed the same `cb91c17b...` candidate, and
completed successfully. This session repairs the parser discrepancy without
changing database, login, application runtime, or workflow behavior.

## Exact parser contract

- Admit only the new app-storage state
  `legacy-parent-session-lifecycle-no-readiness-marker`.
- Map that state only to
  `app-storage-repair-parent-session-lifecycle-v3`.
- Admit the v3 operation alone and in the same eleven already-supported,
  independently derived outbox, webhook, and heartbeat combinations as the v2
  repair.
- Continue rejecting a v3 state paired with a v1 or v2 repair operation.
- Keep every existing state, operation order, target binding, postflight
  validation, confirmation stripping, and fail-closed parser check unchanged.

## Verification

- TDD red phase: the focused parser test failed at the exact new v3 apply
  evidence case with `Teacher notice production schema gate evidence was
  invalid`; the other 19 focused tests passed.
- TDD green phase: deploy parser plus Postgres fast-path contract 20 passed,
  0 failed.
- Production schema/workflow gate: 50 passed, 0 failed.
- Release governance: 91 passed, 11 explicit skips, 0 failed.
- `npm run type-check`: pass.
- `node --check scripts/deploy-vercel-production.mjs`: pass.
- `git diff --check`: pass.
- Independent pre-commit review: no actionable findings. The reviewer verified
  that the twelve v3 plans exactly cover the reachable planner space in
  canonical order, the new state maps uniquely to v3, v1/v2 mismatches fail
  expected-plan equality, and SHA/tree/project/team/target, closed-plan,
  confirmation-stripping, and both exact-postflight checks remain unchanged.
  The reviewer independently reran the focused tests (20 passed), syntax, and
  diff checks, and confirmed zero runtime/workflow diff. Reviewed code/test
  diff SHA-256:
  `04f7c464f41be9a98c37e4e640d8b13f73a90f523946724e20c573347a800ea8`.

Commit identity, CI, merge, production source parity, and post-deploy live
login remain open at this point.
