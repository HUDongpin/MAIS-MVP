reviewerIdentity: /root/a23_pr282_pr281_pr280_review
reviewedAt: 2026-10-18T20:18:49.000Z
decision: approved-for-later-ordinary-code-admission

Independent A23 review of the combined PR #282, PR #281, and PR #280 source packaged in PR #283. I did not author the source, the tooling, or the pending evidence. This review accepts exact source S and tooling T for a later ordinary-code admission. The pending package decision stays `pending`. Every permission stays false. Merge, preview, deploy, and production database writes stay unauthorized.

## Where this report sits

Evidence commit E `ba5acef1091b73f580a372b747dde1c380ae1640` is the unique `git log --diff-filter=A` addition of the seven files in `EVIDENCE_PATHS`. Its tree is `afe2e5d76ac9bd17ad1b5d9df4973190abca2fe0`. The checker admits a HEAD that descends from E and equals that full tree. The pending identity is `pending-independent-a23` and the pending result is `pending-independent-review`. The checker rejects `approved-for-ordinary-code-required-check` and rejects `ordinaryCodeEligible: true`.

The gate text requires a new evidence commit for a replacement report. These two files are that independent record. The seven pending evidence files, the checker, the workflow, and the source blobs are unchanged from E. This commit's tree differs from E, so the current `promotion-shadow-gate` job fails closed on it. I left that failure in place. Turning the rejection off would weaken the tree lock.

## Recomputed bindings

I recomputed these with `inventory()`, `hash`, `assertMergedSources`, and `assertPreservedContracts` from `scripts/promotion-reviewed-code-pr282-pr281-pr280.mjs` at E, and with `stable()` from `scripts/promotion-required-check-legacy-successor-v1.mjs`. File hashes are raw SHA-256.

| Binding | Recomputed value | Matches the claim |
| --- | --- | --- |
| B `fd2138127bdfe56981835c754c8bf944eabe7fb2` tree | `6a9f587910619e2937270f80dba2a295e603cb56` | yes |
| S282 parent `dbc1d25dba753fb8b57afc78a2c79d0481b29240` sole parent | B | yes |
| S282 `4f6cc821491d4a604cb3461c6aa6caef0f942e73` sole parent | S282 parent; tree `c8acd01b25fae638c4e79b82ad89db4839322c06` | yes |
| M282 `1c6b7c87ee762012c10c32ac8bb4c12ae664c519` parents | B then S282; tree equal to S282 | yes |
| S281 `ab689091dcdcc2c31f92d1d2e8b7d3dbc3abcf02` sole parent | B; tree `9d743cda5bc66fa78ac4e72c79b140a3da88423c` | yes |
| M281 `8ddebc1549f919821198f71e123d1512acdf610d` parents | M282 then S281; tree `33c972c3c8235a7e8e35f4e98b0394a025fb9be3` | yes |
| S280 `487fdc5a4c6b552d09c69f1d53885e0f8bc8a519` sole parent | B; tree `f43394f19026bf09d0c902dac3aebaba9aa1bc40` | yes |
| S `64e2fad979f2a936e8347843fe1952fc1cf059f2` parents | M281 then S280; tree `c792eb31abf1622800d54fd5a36082c318f09889` | yes |
| PR #282 inventory, B..S282 | `8e148c204a9509f6116fa7892bcdb4750aad8857fbdc501e25ee292d68f04e13` | yes |
| PR #281 inventory, B..S281 | `ecb5feaea46f31a3a1d83d008f8875cb129ca0db6727f1b16d717a7c61711691` | yes |
| PR #280 inventory, B..S280 | `dff0cb6fc8b0c3283040433530ad7a61ec3d873f5688facb91dc3163204abe5a` | yes |
| Integration inventory, B..S | `aab98d55161b36e3972d12f4991131548db2c94775f96a4aedd48edab4572419` | yes |
| T `f88aaaecfa74f5688df019ee4a7906108865cdc7` sole parent | S; tree `97ef75f38cf5afc2e47ee6bf01062b0c44ba5edb` | yes |
| Tooling inventory, S..T | `b0bce222b72a2e72819302dae0bb1ae9e44544bd003513f30aedca2412d31c81` | yes |
| `source-observation.json` raw SHA-256 | `3859d94c9dfa795d7c53bc7420f254965f37bf8a474a802786d3da0ec37e47a0` | yes |
| `source-checks.json` raw SHA-256 | `6de19a576536f7f71e99ddada6a7858258c1c2e1ec17139f901914b4e6d213d4` | yes |
| Pending A23 report / decision at E | `f5d7952348a141882e5e725d38f8521d13bc0241f0ad3ecba96de1e1eb67a46b` / `72fee624512466a2e94182f5720fdeab36106c486f49b6c522579e844952f552` | yes, unchanged |
| Pending A11 report / decision at E | `3218d8fe21bb405a1b26775031d40443bf3b6285003e5614d31724b82a7f5f09` / `b0cab5c96f90d7c272b3b8fc2280bbb48db5481621867eeb8f1f8412cb34bc60` | yes, unchanged |

Git checks that accompany those digests:

- B, S282, S281, and S280 are ancestors of S. S is the parent of T. T is the parent of E. E is the parent of the commit that adds this report.
- `git diff S T` is exactly the four regular `100644` paths in `CODE_PATHS`.
- `git diff T E` is exactly the seven regular `100644` evidence paths. The marker is absent on T.
- `git diff B S` is the 13-path union: 8 from #282, 4 from #281, 3 from #280, minus the two overlaps.
- Overlap `.github/workflows/ci.yml` blob at S is `4cf391946f0b2c72ca946cab5f5f32cad279e612`. Overlap `lib/server/userStore.ts` blob at S is `cb47cf71ccc4dfe80e85cdd6a13aecbcb1a86a5f`. `assertMergedSources` accepted both `git merge-file` results and rejected a result that equals only one side. Exclusive files keep the originating blob.
- `assertPreservedContracts` accepted S and E. Prior reviewed-code checkers, tests, docs, evidence directories, the PR #201 candidate leg, and the legacy successor script are byte-identical to B.
- The checker constant `PULL_REQUEST` is `283`. The tests reject event numbers 282, 281, 280, 276, 272, and 259.

## Promotion-shadow-gate

I compared the workflow YAML at T with B. The workflow `on` block is `pull_request` plus `push` to `main`. It has no `paths` filter and no `workflow_dispatch`. Job `promotion-shadow-gate` has the same name, permissions, environment, and runner, and it has no job-level `if`. No step sets `continue-on-error`.

The selector still starts with `set -euo pipefail`. The new marker test is first, then the PR #276 v3 marker. `mode=$(...)` sits in the `then` branch. The mode whitelist adds `reviewed-code-pr282-pr281-pr280` and still lists every older mode. There is no `|| true` fallback.

Every previous step other than the selector is byte-identical: 74 steps matched by name and body, 0 missing, 0 changed. The seven new steps are the contract test, current check, historical baseline prepare, historical verify, finalize, enforce, and artifact upload. They run only when the mode is `reviewed-code-pr282-pr281-pr280`. The enforce step uses `always()` and calls `verify`. The historical prepare step checks out `03717842b19e8b8fa9a3a2dbecf1b359bb842233`, runs `npm ci --ignore-scripts` there, and checks out execution `ff709c0141ef8660604a20340b1c476bf2941f60`. The synthetic event is still number 259 with base and head equal to that historical commit. The unit suite's malformed-marker test exits non-zero with empty stdout, so a present invalid marker does not fall through to v3.

The decision result constant is `pending`. The scope is `exact-pr282-pr281-pr280-pending-independent-review`. `PERMISSIONS` keeps `ordinaryCodeEligible`, `liveAllowed`, `integrationAllowed`, `previewAllowed`, `deployAllowed`, `wholePackAccepted`, and `historicalAuthorityTransferred` false. The decision verifier rejects a `pass` result and a rehashed `liveAllowed: true`.

## What this source is

PR #282 stops new stable-id demo seed writes whenever `VERCEL_ENV` is non-empty, including preview, unless `MAIS_DEMO_SEED_BACKFILL` is `1` or `true` after trim and lower-casing. `yes` and `on` stay off. `HK_MATH_ENABLE_DEMO_USER` does not override the refusal. `createInitialDatabase` and `normalizeDatabase` consult the same flag. With the flag off, `omitUnstoredDemoSeedRecords` keeps a stored demo row and drops a demo identity that is not already stored. Already stored rows are retained. I found no production SQL migration on B..E.

PR #281 makes `openFunnelDatabase` create the parent directory before `node:sqlite` opens the file. On Vercel, a failed open of an implicit path falls back to `os.tmpdir()/hk-math-lab/auth-funnel-metrics.sqlite`. An explicit `AUTH_FUNNEL_DB_PATH` is rethrown. The merged CI workflow keeps that new auth-funnel step and adds #282's two demo-seed test files to the California link step.

PR #280 shares `loadStudentGradeActivityDatabaseFromPostgresProjection` between dashboard and progress. Headline accuracy and total attempts use every saved grade attempt. The requested window scopes weekly study minutes. The added activity test fixes the clock at `2026-06-20T10:00:00.000Z`, with 10 correct attempts on 2026-06-01 and 2 incorrect attempts on 2026-06-20, and expects 83 percent, 12 attempts, and 1 weekly minute.

No lesson directory, candidate pack, question bank, or publication route is in B..S. The runtime observation covers 3,893 files against the PR #276 v3 observation's 3,888. Canonical audit JSON is identical, including audit digest `e340d3f2cc3ae20e4e5a7ffaef12b642a2e3811138fd161714d8bb7a837abc91`. Reachable paths move from 1,502 to 1,503 and edges from 3,686 to 3,687, which matches one newly imported server module. I recomputed `observePreparation` on E. `stable(observation)` equals `stable` of the bound file. The raw file hash is the bound observation SHA-256.

## What I executed

On the E worktree, Node v22.14.0, with `POSTGRES_URL` unset. GitHub CI for the same E tree used Node 24 and was already green before this commit. I did not rerun that GitHub historical baseline, `npm run test:promotion-gate`, Playwright, or the legacy successor evaluator. I did not open a production or preview database.

- Contract suite `scripts/promotion-reviewed-code-pr282-pr281-pr280.test.mjs`: 15 passed, 0 failed.
- Seed: `node --import tsx --test lib/server/demoSeedBackfill.test.ts lib/server/demoSeedBackfillPersistence.test.ts`: 5 passed, 0 failed. stdout `fbc42cc2139cdc07c16515de8c8e97fa1579d5f149499459119562aa020bfe87`, stderr empty.
- Funnel: `node --import tsx --test --test-concurrency=1 lib/server/authFunnelMetrics.test.ts app/api/auth/funnel/route.test.ts`: 9 passed, 0 failed. stdout `9c4acda76ab932e5639f3dd19b45a38f40933bb2807bb44e2e9d4feb40a42a39`, stderr empty.
- Activity: `node --import tsx --test lib/server/userStoreStudentActivityPersistence.test.ts`: 59 passed, 0 failed, including `dashboard and progress share saved-attempt accuracy outside the weekly window`. stdout `9f5e85ae3996ef359d538dc593810d90daba2e167a987ad87a98baa8a27e0539`, stderr empty.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: exit 0, empty stdout and stderr (`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`).

The bound `source-checks.json` stdout hashes differ from these rerun hashes because the runner prints `duration_ms`. The pass counts match. I left that file unchanged. The persistence probe writes a temporary SQLite file and deletes `POSTGRES_URL`.

## Residuals a later admission still has to carry

- Unset `VERCEL_ENV` keeps the historical demo-seed backfill, including when `NODE_ENV` is `production`. That is the tested local, dev, test, and CI behavior. Any non-Vercel production process is outside the Vercel refusal.
- Signup funnel counters on Vercel remain on ephemeral `/tmp`. A deploy or a cold instance starts empty. Issue #284 is absent from this tree. A later SQLite error on `POST` can still surface as 500. `openedForConfiguredPath` remembers the configured path for the process even when the handle is the fallback file.
- Progress does not use the dashboard's 15-second cache, so a cached dashboard can lag a fresh progress read inside that TTL. A null or undefined fast result falls through to `readDatabase()`, the same falsy check the dashboard already used.
- Stored demo rows are retained. This tree does not delete them.

## Authority

`liveAllowed` is false. This report does not set `ordinaryCodeEligible`. The owner's merge order stays: leave #282, #281, and #280 unmerged until a later admission records independent A11 and A23 approval of this same source, then merge that later admission with an ancestry-preserving merge. Squash and rebase do not satisfy the package. I authorize no preview smoke that writes the shared production database.

The known external-review limit remains. Identity strings and hashes bind these bytes. They do not cryptographically prove authorship. This file is the independent A23 session's own report.
