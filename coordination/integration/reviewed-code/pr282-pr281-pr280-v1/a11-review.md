# A11 review of the combined PR #282, #281, and #280 tree

Status: **pending-independent-review**. I am the same packaging session that wrote the A23 report. These two files are not independent reviews. The result is not `approved-for-ordinary-code-required-check`. `ordinaryCodeEligible` stays false.

Reviewed source `64e2fad979f2a936e8347843fe1952fc1cf059f2`, tooling `f88aaaecfa74f5688df019ee4a7906108865cdc7`, tooling digest `b0bce222b72a2e72819302dae0bb1ae9e44544bd003513f30aedca2412d31c81`, observation `3859d94c9dfa795d7c53bc7420f254965f37bf8a474a802786d3da0ec37e47a0`, checks `6de19a576536f7f71e99ddada6a7858258c1c2e1ec17139f901914b4e6d213d4`.

## What I inspected

- PR #282 head `4f6cc821491d4a604cb3461c6aa6caef0f942e73` (parent `dbc1d25dba753fb8b57afc78a2c79d0481b29240`, parent of that is main `fd2138127bdfe56981835c754c8bf944eabe7fb2`).
- PR #281 head `ab689091dcdcc2c31f92d1d2e8b7d3dbc3abcf02`, sole parent main.
- PR #280 head `487fdc5a4c6b552d09c69f1d53885e0f8bc8a519`, sole parent main.
- Ancestry-preserving merges, in order: M282 `1c6b7c87ee762012c10c32ac8bb4c12ae664c519` (tree equal to #282), M281 `8ddebc1549f919821198f71e123d1512acdf610d`, S `64e2fad979f2a936e8347843fe1952fc1cf059f2`.
- The only overlapping paths are `.github/workflows/ci.yml` (#282 and #281) and `lib/server/userStore.ts` (#282 and #280). `git merge-file` of each base/ours/theirs triple matches the committed bytes. Neither overlap equals only one side. Exclusive files keep the originating pull request blob.
- The merged workflow step list keeps the new auth-funnel job step from #281 and adds #282's two demo-seed test files to the California link step.

## Checks I ran on this tree

Restricted environment, no `POSTGRES_URL`.

- seed: 5 passed, 0 failed. stdout `5d6a57722c1eeb10399bfdeda1c09e9ded5f893b9a63c8e77799827764d228d3`.
- funnel: 9 passed, 0 failed. stdout `422ac9d5c232c926e118ea9eac1260cb011c8aefa19f21a0c0e009e235d872c1`.
- activity: 59 passed, 0 failed, including `dashboard and progress share saved-attempt accuracy outside the weekly window`. stdout `348ce0a7a5aecfc1a93d95b90164f7e642f85b12904df518c0b97631b8d50fc9`.
- `tsc --noEmit --incremental false`: exit 0, empty stdout and stderr.

The activity case uses 10 correct attempts on 2026-06-01 and 2 incorrect attempts on 2026-06-20, with the store clock fixed at 2026-06-20T10:00:00.000Z. 10/12 rounds to 83. The two in-window attempts are 30 seconds each, so weekly minutes are 1 and the headline stays 12 attempts. That matches the code: `accuracyPercentForAttempts(gradeAttempts)` uses every saved grade attempt, and `windowedAttempts` is only the weekly-minutes bucket.

## PR #282

`shouldBackfillDemoSeed` refuses the backfill whenever `VERCEL_ENV` is non-empty unless `MAIS_DEMO_SEED_BACKFILL` is `1` or `true` after trim and lower-casing. `yes` and `on` do not count. `HK_MATH_ENABLE_DEMO_USER` is not consulted. Unset `VERCEL_ENV` keeps the historical default-on behavior, including when `NODE_ENV` is `production`. That matches the pull request's stated local/dev/test/CI contract. It is a residual for any non-Vercel production process.

`retainRecordsUnlessNewDemoSeed` drops demo identities that are not already stored and keeps a stored row, including a submitted score of 9. `createInitialDatabase` and `normalizeDatabase` consult the same flag. I checked the gated collections in `userStore.ts`: guardian links, lesson progress, content-safety flags, classes, enrollments, assignments, submissions, messages, resources, assessments, reports, live sessions, reward ledger and redemptions, gamification events, campaigns, and forum threads. The persistence probe writes a temporary SQLite file and deletes `POSTGRES_URL`. I did not point it at a preview or production database.

## PR #281

`openFunnelDatabase` calls `mkdirSync` on the parent directory before `node:sqlite` opens the file. That is the cited 500: the Vercel default `/tmp/hk-math-lab` does not exist, and SQLite does not create it. On Vercel, a failed open of an implicit path falls back to `os.tmpdir()/hk-math-lab/auth-funnel-metrics.sqlite`. An explicit `AUTH_FUNNEL_DB_PATH` is rethrown. The route test covers anonymous GET 401 and the `register_step`/`account` POST returning 202 when that directory is absent.

The counters still live on ephemeral `/tmp`. A deploy or a cold instance starts empty, and two instances do not share the file. `POST` still does not catch a later SQLite error, so a full disk can still surface as 500. Issue #284 tracks the Postgres migration. This diff does not implement it. `openedForConfiguredPath` records the configured path even when the handle is the fallback file; that is stable for one process and does not make the file durable.

## PR #280

`loadStudentGradeActivityDatabaseFromPostgresProjection` is the previous dashboard projection, including `projection_attempts` merged with `practice_attempts` by id. Dashboard and progress both call it. Progress no longer applies the 7-day window to the accuracy headline. A null or undefined fast result still falls through to `readDatabase()`, which is the same falsy check the dashboard already used. Progress does not use the 15-second dashboard cache, so a cached dashboard can lag a fresh progress read inside that TTL. I did not execute this path against production Postgres.

## Binding

This report does not approve the tree for the ordinary-code required check. A second A11 session has to review the same source, tooling digest, observation, and checks bytes before any later admission can record approval.
