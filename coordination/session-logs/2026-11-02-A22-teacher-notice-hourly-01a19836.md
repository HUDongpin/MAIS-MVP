# A22 / A11 — hourly teacher-notice scheduling

- Owner: Codex chat `01a19836-d9ec-7151-b60f-9481ac983f11`, borrowing A22 for scheduling and A11 for regression checks; A12 health contracts are included in the assigned fix.
- Branch: `codex/teacher-notice-hourly-20261102`.
- Worktree: `/Users/dongpinhu/.codex/worktrees/teacher-notice-low-frequency/MAIS-MVP`.
- Target PR: pending. The owner has now authorized committing, pushing, opening the PR, merging after checks/review, and production deployment after accumulated-main release review.
- Created: 2026-11-02 Asia/Taipei. Expected closeout: 2026-11-02 or after separately authorized integration/release.
- Baseline: `b56ede5c36f94d7ee8884048ce80e6f1afea8521`, verified against remote main.

## Assignment and evidence

The owner asked to resolve repeated GitHub teacher-notice health failures, authorized restoration, then required low Neon usage and explicitly selected hourly delivery. Production Vercel Cron Jobs is disabled; it still lists four five-minute schedules. The latest examined GitHub run, `41330125863`, reports only `scheduler-heartbeat-stale` on both approved domains. The production switch remains disabled until the lower-frequency configuration is deployed. Existing source already has three ten-/thirty-minute jobs, but that source configuration is not live.

## Bounded design and implementation plan

1. Schedule email delivery and webhook maintenance together at `0 * * * *`; remove scheduled generic health and warm calls. Retain the authenticated hourly monitor at minute 7. This changes configured Vercel cron invocations from 1,152/day in the observed deployment to 48/day, not measured Neon billing or compute savings.
2. Use a 75-minute operational age allowance (60-minute cadence plus 15-minute execution/scheduling margin) for heartbeat, due outbox, and unmatched events. Retain scheduler failures and adverse/terminal events for the same 75-minute observation window so hourly monitoring has overlap. Align standalone monitor and production acceptance validators. Keep failed/incomplete/missing/release-mismatched heartbeats, stale leases, adverse events and terminal failures unhealthy.
3. First change schedule and age-boundary tests and observe failures against baseline code. Then make the minimal configuration/policy changes and run targeted tests, backend checks, strict type checking and the applicable build gate, without production credentials or Neon queries.
4. Obtain an independent review of the resulting slice. Inventory the production-to-candidate runtime delta before any release request: the existing production workflow publishes the complete protected-main candidate, not a cron-only update.

Preserve authentication, provider routing, retry and lease limits, idempotency, retention, schema gates and the eight-attempt batch limit. The hourly delivery wait is nominal: backlog exceeding eight due items or provider retries can take longer. An hourly monitor with a 75-minute stale allowance can detect a missed run on the following probe; it is not immediate missed-run detection.

## Verification and disposition

The initial revised schedule/age tests produced 12 expected failures out of 86 against baseline implementation. After the fix, the targeted unit/SQLite/monitor/acceptance suite passed 94/94 with no failures or skips. Strict nonincremental `npm run type-check` passed.

Independent A11 review identified an additional hourly-cadence dependency: production acceptance only waited about ten minutes for a synthetic delivery and its workflow timed out after 45 minutes. Updated acceptance uses ten-minute polling, at most two baseline checks and nine delivery-progress checks, and a 110-minute workflow timeout. Delayed delivery after 65 minutes is observed at the 70-minute poll; exhaustion fails after 80 minutes. The added baseline test rejects after one ten-minute wait/four reads without creating or queueing a notice. Poll budgets outside 1–9 are rejected. After three expected RED failures for the timing change, the final acceptance suite passed 19/19. Independent re-review resolved the finding with no remaining blocking issue. These acceptance tests use mocked HTTP and sleep; no production acceptance was dispatched.

`PLAYWRIGHT_PORT=4387 PLAYWRIGHT_RUN_ID=teacher-notice-hourly-01a19836 HK_MATH_STORAGE_PROVIDER=sqlite POSTGRES_URL= DATABASE_URL= npm run test:backend` completed with exit 0, six tests passed, including its isolated production build. The local fixture and generated outputs are under this worktree's `.tmp/china-lesson-e2e-runtime/`; no Neon connection or live model/provider was used. `git diff --check` passed. The bounded A25 map found zero unmapped or ambiguous owner entries.

## Production source and remaining authorization

The current Vercel browser deployment is `dpl_FFLaTw49aaypxMgRka31BWjCJ3NN`, created 2026-09-16. Existing release run `35052633610`, artifact `10429524666`, binds it to source `c2df6da7478ada24ce4c1af0bc2383c1edc48228` and tree `651afb361b27964ce02ebec1532f06e6f8d02cae`, with historical provider content verification and promotion verified. This is a current deployment-ID observation correlated with a historical release record, not a fresh full provider-byte readback.

From that source to baseline main `b56ede5c36f94d7ee8884048ce80e6f1afea8521`, current staging rules select 242 changed deployment paths (39,210 added and 2,985 deleted lines plus one binary), excluding this new hourly slice. They include auth/privacy, learner persistence, curriculum, visualizations and AI regional policy. That inventory does not constitute review or approval of all those accumulated changes. Existing protected production tooling only publishes the complete current-main candidate, not an independent cron-only patch.

At the end of local implementation, changes were retained uncommitted for review. On 2026-11-02 the owner explicitly authorized commit, push, PR, merge after checks/review, and deployment after accumulated-main release review. This replaces the earlier authorization hold for those named operations; it does not bypass any check or authorize unrelated configuration, data deletion or cleanup. Current disposition: reviewed source slice prepared for its authorized commit. The generated A25 inventory snapshots remain local evidence outside that source commit.

No production switch, environment, database, GitHub issue, deployment or domain changes have yet been made. Production remains on its existing disabled cron configuration; live recovery is not achieved. Release review is checking accumulated auth/persistence, provider/runtime and content/promotion scopes independently before production execution.
