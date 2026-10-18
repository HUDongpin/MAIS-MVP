Reviewer: independent-a11-pr283
reviewedAt: 2026-10-18T20:19:56.000Z
decision: approved-for-ordinary-code-required-check

A11 independent regression review of the ordinary-code package for the ancestry-preserving union of PR #282, PR #281, and PR #280, plus the admission tooling that pins that union. I did not author those pull requests or the pending reports already stored at E. This decision is ordinary-code eligibility for source S and tooling T only. Merge, live promotion, preview, deploy, and production database writes remain unauthorized. The sealed package at E still records `pending-independent-review` and `ordinaryCodeEligible: false`. Its checker rejects `approved-for-ordinary-code-required-check`. This report is attached outside that tree because replacing either in-repository report requires a new evidence commit and a new review.

## Commit graph I verified

I read the commit objects with git.

- B `fd2138127bdfe56981835c754c8bf944eabe7fb2`, parents `39cb64c9d9719ec39c8b4c244bc8d6818ee6a87d` and `0004a9532cba69216cdeb19dadcc3649ffa74737`, tree `6a9f587910619e2937270f80dba2a295e603cb56`.
- S282 parent `dbc1d25dba753fb8b57afc78a2c79d0481b29240` has sole parent B. Tree `e5656e691ea20d0627241a76b33d3d798b81ec12`.
- S282 `4f6cc821491d4a604cb3461c6aa6caef0f942e73` has sole parent that commit. Tree `c8acd01b25fae638c4e79b82ad89db4839322c06`.
- M282 `1c6b7c87ee762012c10c32ac8bb4c12ae664c519` has parents B then S282. Its tree equals S282.
- S281 `ab689091dcdcc2c31f92d1d2e8b7d3dbc3abcf02` has sole parent B. Tree `9d743cda5bc66fa78ac4e72c79b140a3da88423c`.
- M281 `8ddebc1549f919821198f71e123d1512acdf610d` has parents M282 then S281. Tree `33c972c3c8235a7e8e35f4e98b0394a025fb9be3`.
- S280 `487fdc5a4c6b552d09c69f1d53885e0f8bc8a519` has sole parent B. Tree `f43394f19026bf09d0c902dac3aebaba9aa1bc40`.
- S `64e2fad979f2a936e8347843fe1952fc1cf059f2` has parents M281 then S280. Tree `c792eb31abf1622800d54fd5a36082c318f09889`.
- T `f88aaaecfa74f5688df019ee4a7906108865cdc7` has sole parent S. Tree `97ef75f38cf5afc2e47ee6bf01062b0c44ba5edb`.
- E `ba5acef1091b73f580a372b747dde1c380ae1640` has sole parent T. Tree `afe2e5d76ac9bd17ad1b5d9df4973190abca2fe0`. HEAD is E and the worktree was clean.

`git diff --name-only` from B to S is 13 paths: the 8 paths of B..S282, the 4 paths of B..S281, and the 3 paths of B..S280, minus the two overlaps `.github/workflows/ci.yml` and `lib/server/userStore.ts`. S..T is exactly the four tooling paths. T..E is exactly the seven evidence paths. `git diff --check` from B to E is clean. I recomputed `git merge-file` for both overlaps from the B / S282 / incoming triples. Both merges exited 0 and the bytes equal the blobs at S.

`dbc1d25d` refused the backfill only when `VERCEL_ENV` was exactly `production`, and its test still allowed `preview`. S282 `4f6cc821` is the commit that refuses every non-empty `VERCEL_ENV`. The admitted source is that commit, not the production-only parent.

## Digests I recomputed

Using `inventory` and `hash` from `scripts/promotion-reviewed-code-pr282-pr281-pr280.mjs` and `stable` from `scripts/promotion-required-check-legacy-successor-v1.mjs`:

- B..S282: `8e148c204a9509f6116fa7892bcdb4750aad8857fbdc501e25ee292d68f04e13` (8 paths)
- B..S281: `ecb5feaea46f31a3a1d83d008f8875cb129ca0db6727f1b16d717a7c61711691` (4 paths)
- B..S280: `dff0cb6fc8b0c3283040433530ad7a61ec3d873f5688facb91dc3163204abe5a` (3 paths)
- B..S: `aab98d55161b36e3972d12f4991131548db2c94775f96a4aedd48edab4572419` (13 paths)
- S..T: `b0bce222b72a2e72819302dae0bb1ae9e44544bd003513f30aedca2412d31c81` (4 paths)

Raw file sha256 at E:

- `source-observation.json`: `3859d94c9dfa795d7c53bc7420f254965f37bf8a474a802786d3da0ec37e47a0`
- `source-checks.json`: `6de19a576536f7f71e99ddada6a7858258c1c2e1ec17139f901914b4e6d213d4`

`assertMergedSources` and `assertPreservedContracts` passed for S and for HEAD. I also ran `observePreparation` on this worktree. `stable(observation)` equals `stable` of the pinned observation file. Covered file count is 3893. Canonical audit digest is `e340d3f2cc3ae20e4e5a7ffaef12b642a2e3811138fd161714d8bb7a837abc91`.

The recorded check log hashes are seed `5d6a57722c1eeb10399bfdeda1c09e9ded5f893b9a63c8e77799827764d228d3`, funnel `422ac9d5c232c926e118ea9eac1260cb011c8aefa19f21a0c0e009e235d872c1`, activity `348ce0a7a5aecfc1a93d95b90164f7e642f85b12904df518c0b97631b8d50fc9`, and empty type stdout/stderr `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. My fresh stdout bytes are a new execution. I am not claiming they equal those logs.

## Product behavior I inspected

PR #282, `git diff B S282`, with the merged `userStore.ts` bytes checked against `git merge-file`:

- `shouldBackfillDemoSeed` trims `VERCEL_ENV`. Any non-empty value, including `production`, `preview`, `development`, and any other deployment name, returns true only when `MAIS_DEMO_SEED_BACKFILL` trims and lower-cases to `1` or `true`. `yes`, `on`, empty, `0`, and `false` stay off. `HK_MATH_ENABLE_DEMO_USER` is not read by this function.
- Unset, empty, or whitespace-only `VERCEL_ENV` keeps the historical default-on path, including when `NODE_ENV` is `production`, unless the flag is explicitly `0` or `false`. That is the stated local, dev, test, and CI contract.
- `createInitialDatabase` uses the flag before it builds example accounts, guardian links, lesson progress, safety flags, classes, enrollments, assignments, submissions, messages, resources, assessments, reports, live sessions, reward ledger and redemptions, gamification events, campaigns, and forum threads. `normalizeDatabase` passes `allowDemoSeedBackfill && shouldSeedDemoUser()` into the seed normalizers, skips `syncDemoAccountsFromAuthSessionPersistence` when the flag is off, and returns `omitUnstoredDemoSeedRecords` instead of the raw normalized snapshot.
- Several seeders still emit rows when the public demo-user flag is false. Class records, assignments, assessments, and the California Jon and Shirleen enrollment and submission rows are in that set. `demoSeedRecordIdentity` collects those ids with the demo-user flag forced on, and `retainRecordsUnlessNewDemoSeed` drops a demo id that is not already stored. A stored row, including a submitted score of 9, is kept. Already stored demo rows are not deleted.
- `databaseNeedsPersistenceSync` asks for a demo-account sync only when `shouldBackfillDemoSeed()` is true. `ensureInitialPostgresState` writes `createInitialDatabase()`, which is on the same flag. The persistence probe writes a temporary SQLite file and deletes `POSTGRES_URL`.

I added one local probe that is not part of the pinned tree. It opened SQLite with an existing snapshot containing one non-demo student and one custom enrollment, with `VERCEL_ENV=preview`, `HK_MATH_ENABLE_DEMO_USER=true`, `NODE_ENV=production`, and `MAIS_DEMO_SEED_BACKFILL` unset. After login attempts, Jon and Peter were `invalid`, the real student and custom enrollment remained, and the written payload contained none of `student-jon`, `student-peter`, `Student Jon`, `HK Student Peter`, `safety-flag-demo`, `class-us-ca`, `class-s3a`, `shirleen`, `Teacher Scott`, or `Teacher Rhi`. Lesson progress was created only for the real student. Topics, questions, and the reward catalog were still initialized. Those are curriculum and catalog rows, not student accounts.

PR #281:

- `openFunnelDatabase` calls `mkdirSync` on the parent directory before `node:sqlite` opens the file. That is the cited signup 500: the Vercel default directory does not exist, and SQLite does not create it.
- On Vercel, a failed open of an implicit path falls back to `os.tmpdir()/hk-math-lab/auth-funnel-metrics.sqlite` only for the SQLite cant-open errors the helper recognizes. An explicit `AUTH_FUNNEL_DB_PATH` is rethrown. The route test covers anonymous GET 401 and the `register_step` / `account` POST returning 202 when that directory is absent. The metrics test covers a missing parent, a non-writable main-database directory, and a non-writable explicit path.
- Accepted event details stay on the closed vocabulary. The counters do not store names, emails, or free text. GET remains admin-only. POST is still unauthenticated and rate-limited, and a later SQLite error after the directory exists can still surface as 500. The file remains ephemeral `/tmp` on Vercel. Durability is #284 and is not in this tree.

PR #280:

- `loadStudentGradeActivityDatabaseFromPostgresProjection` is the previous dashboard query. It keeps `user_id` predicates on attempts, mistakes, progress, and events, and merges `projection_attempts` with `practice_attempts` by id. Dashboard and progress both call it. Progress no longer applies the 7-day window to the accuracy headline or the attempt count. `windowedAttempts` still fills weekly minutes.
- A null or undefined fast result falls through to `readDatabase()`, the same falsy check the dashboard already used. Progress does not use the 15-second dashboard cache, so a cached dashboard can lag a fresh progress read inside that TTL.
- The new activity case uses 10 correct attempts on 2026-06-01 and 2 incorrect attempts on 2026-06-20, with the store clock fixed at 2026-06-20T10:00:00.000Z. 10/12 rounds to 83. The two in-window attempts are 30 seconds each, so weekly minutes are 1 and the headline stays 12 attempts. I did not execute this path against production Postgres.

## Gate tooling I inspected

`PERMISSIONS` is all false, including `ordinaryCodeEligible`. `verifyDecision` rejects a decision whose result is `pass`, whose scope is the PR #270 scope, or whose recomputed object sets `liveAllowed` true. Review binding requires `reviewerIdentity` `pending-independent-a11` / `pending-independent-a23`, result `pending-independent-review`, and rejects `approved-for-ordinary-code-required-check`. Evidence must be mode `100644`, added once, and a direct child of T. HEAD must descend from E and equal E's tree. A one-byte product change, an extra public file, an extra tooling file, a symlink, a dirty report, and a deleted-then-re-added admission fail closed.

`.github/workflows/promotion-shadow.yml` selects this mode only when `coordination/integration/reviewed-code/pr282-pr281-pr280-v1/admission.json` exists or is a symlink, and that test is before the PR #276 v3 marker. The selector keeps `set -euo pipefail`. A malformed present marker cannot fall through: the unit test runs the selector and expects a non-zero status with empty stdout. Every older named step is unchanged. The new steps add the mode string to the allowlist and do not set `continue-on-error`. The enforce step uses `always()` so a failed earlier step still runs the verifier. Workflow permissions stay `contents: read`. The upload action pin matches the existing upload steps. Historical baseline commit `03717842b19e8b8fa9a3a2dbecf1b359bb842233` is still checked out and evaluated. No path filter, manual workflow, or skipped required job was added.

## Checks I ran

On the E worktree:

- `node --test scripts/promotion-reviewed-code-pr282-pr281-pr280.test.mjs`: 15 passed, 0 failed. stdout `6249c818cd9ab734c3a24136c0163260b9e9cb76c6718d97880820b02af6fe9c`.
- `node --import tsx --test lib/server/demoSeedBackfill.test.ts lib/server/demoSeedBackfillPersistence.test.ts`: 5 passed, 0 failed, including the production and preview SQLite refusal. stdout `26c4327d641fa1626c017d4bcc698ca13a03d0d9036f241e442d7609c1ddde43`.
- `node --import tsx --test --test-concurrency=1 lib/server/authFunnelMetrics.test.ts app/api/auth/funnel/route.test.ts`: 9 passed, 0 failed. stdout `ef39aa56e64aa4b561ec256a8d674a07418c1372f20ca6a5cfd1c75f58b16237`.
- `node --import tsx --test lib/server/userStoreStudentActivityPersistence.test.ts`: 59 passed, 0 failed, including `dashboard and progress share saved-attempt accuracy outside the weekly window`. stdout `f6b57be73c9c7f01fcaf9db330f2c5ce5d04615b5779f840970ed77ba657f0f1`.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: exit 0. stdout and stderr are empty. Their sha256 is `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
- `observePreparation` matched the pinned observation, as recorded above.

Stderr for the four node test commands and the type check was empty except that the seed command's stdout contains the Node SQLite experimental warning. I did not re-run Playwright, a production build, or any production or preview database.

## Limits

Approved for the ordinary-code required check of this exact source and tooling pin. The in-repository package remains pending. A later admission can bind this report. It cannot be produced by editing E. Rows already stored under demo ids stay stored. A non-Vercel process with `VERCEL_ENV` unset still backfills unless the flag is explicitly off. Setting `MAIS_DEMO_SEED_BACKFILL` to `1` or `true` writes demo rows on production and preview. The auth-funnel SQLite file is still ephemeral. A later byte that is not already in S, or a tooling file outside the four-path release, needs a new review.
