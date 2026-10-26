Reviewer: independent-a11-pr296
reviewedAt: 2026-10-26T02:11:56.000Z
decision: approved-for-ordinary-code-required-check

A11 independent regression review of admission PR #296 for the ancestry-preserving merge of PR #295. I did not author PR #295, source S, tooling T, or the pending reports sealed in E. This decision is ordinary-code eligibility for source S and tooling T only. Merge, live promotion, preview, deploy, and production database writes remain unauthorized. The sealed package at E still records `pending-independent-review` and `ordinaryCodeEligible: false`. Its checker rejects `approved-for-ordinary-code-required-check`. This report is attached outside that tree because replacing either in-repository report requires a new evidence commit and a new review.

## Commit graph I verified

I read the commit objects with git.

- B `63b02c4ec6a4415af0056313e8ad384bf4b61ee1`, parents `b69384c4036fe347275b363768cd497c50c131b5` and `bf0443ed886fdd04be0f99ba0467f13bbf3079d6`, tree `ae2aa9f91cbae248a9789ddad5c464c91e7495de`.
- PR #295 parent `fbc0f7e53bf95d534d7665d2d7c4dc621556315d` has sole parent B. Tree `2a7aa7a4d5aea564fe4b6cc714d22c0f34a46673`. It changes only the monitor workflow cron.
- PR #295 head `50f323b0ee86437490ffbe2267fdd2f9709ab5de` has sole parent that commit. Tree `a155bf47370adee1fcd4c2ad00d50d15ea4e2bb9`. It changes only the schedule assertion.
- S `a7b7d104f2dfc93e8ab5282b5e90586e123f452c` has ordered parents B then the PR #295 head. Tree `a155bf47370adee1fcd4c2ad00d50d15ea4e2bb9`, equal to the PR #295 head. No squash.
- T `cd5eedb77f6cabb9ca627a38d15fce7713dbc84d` has sole parent S. Tree `f676edca97330fafdb31b7315c097e64b4202395`.
- E `bead6e80cc82f916ee3801581031bd5df9954eac` has sole parent T. Tree `e961c6f55cd893dc9329b6e475721f2ed345d249`.

`git diff --name-status` from B to S is exactly `.github/workflows/teacher-notice-health-monitor.yml` and `scripts/monitor-teacher-notice-health.test.mjs`. S..T is exactly the four tooling paths. T..E is exactly the seven evidence paths. `git diff --check` from B to E is clean.

## Digests I recomputed

Using `inventory`, `hash`, and `digest` from `scripts/promotion-reviewed-code-pr295.mjs` on a detached worktree at E:

- B..S inventory digest `c17f40a337ae7c18511bc1445616a1b3c50471ed9caeae9fcb7e801aa98711e5` (2 paths)
- S..T inventory digest `a333ef913eb7fd6ed16378e087018b2b12242fd121dd56f1511918135ca16a00` (4 paths)
- `expectedWorkflow` of the B promotion-shadow workflow equals the T workflow byte for byte.

Raw sha256 at E:

- `scripts/monitor-teacher-notice-health.mjs`: `81ebba2f812b9067e0b28231cb8c220b90751f5663fc3c866f54ba7b07205cdb`
- `.github/workflows/teacher-notice-health-monitor.yml`: `5b2fc8a0fe9b46723187851c7aacf7388c92e89f0bbb223120390846ca6ee234`
- `scripts/monitor-teacher-notice-health.test.mjs`: `f669fcf4e8996cd6a10766aad02d2ce2aea69316f26385799319948d660a67d4`
- `source-checks.json`: `af708ee467b49334ae97301ced2ccb468f06987de4f2f243c41e9a6c27d245b6`
- placeholder A11 decision `7aa005e577d6f0512f92bab694a51db9dd4ef16b45958abe6072b258d84e7361`, report `68af94637a7c14ad90c8c2a0aeeb792e1bae47a3521441890369ea80a52577b3`

Tooling raw sha256 at T, unchanged in E:

| Tooling file | Raw SHA-256 |
| --- | --- |
| .github/workflows/promotion-shadow.yml | b29ce1407044903299dcea0505832f5b13df700f984b897a14c022f0e62e23a6 |
| docs/pr295-reviewed-code-gate.md | ac7c9681cdfd0e3cd3495bdc5558066e246c42aa06cc203f2c9bd3effb85ce67 |
| scripts/promotion-reviewed-code-pr295.mjs | fdeb98d0b87ce6aade5541c5d968c7b1d4b616cccf7f0229b91de8510454de38 |
| scripts/promotion-reviewed-code-pr295.test.mjs | 9faf096b5735bef236859daacba123f02580823c9e99efd83b3bc2e97d062873 |

## Product behavior I inspected

`git diff B S` is the cron comment and one schedule line, plus the matching test assertion. The cron at S is `7 * * * *`. The previous value `3-59/5 * * * *` remains only as the restore instruction. Triggers stay `schedule` and `workflow_dispatch`. Permissions stay `contents: read` and `issues: write`. Concurrency stays `teacher-notice-production-health` with `cancel-in-progress: false`. The job timeout stays 5 minutes and the environment stays `production-health`.

`scripts/monitor-teacher-notice-health.mjs` is blob `34d8b50957af26e9bfdef6f343117b6bea4db0b4` at B, the PR #295 parent, the PR #295 head, S, T, and E. I read `validateHealthyPayload` and the call path. A pass still requires both approved origins, a credential of 32 to 512 non-whitespace characters, a GET that refuses redirects, a private no-store cache contract, no `set-cookie`, no Vercel cache HIT or STALE, a single `health` object, `status` `healthy`, an empty `reasons` array, `heartbeatStatus` `succeeded`, `candidateMatch` true, and `heartbeatAgeSeconds` as a safe integer from 0 through 900 inclusive. `901` still fails. Retries stay bounded to three attempts and only for network failure, 429, 502, 504, or 503. The alert drill still fails only after both origins are checked. The test file's five-minute worst-case bound is still present: `TEACHER_NOTICE_MONITOR_WORST_CASE_ORIGIN_MS < 5 * 60_000`. The only assertion that changed is `workflow.on.schedule` deep-equal to `[{ cron: "7 * * * *" }]`.

Minute 7 still sits off the delivery worker's minute 0/5 boundary. A healthy five-minute heartbeat observed at minute 7 is about two minutes old, inside the unchanged 900-second ceiling. The hourly cadence can leave an intervening failed heartbeat unobserved until the next probe. That latency is the temporary change named in the workflow comment. Restore `3-59/5 * * * *` after #273 closes. This review does not extend the hourly schedule past that point.

## Gate tooling I inspected

`PERMISSIONS` is all false, including `ordinaryCodeEligible` and `liveAllowed`. Review binding requires `pending-independent-a11` and `pending-independent-a23`, result `pending-independent-review`, and rejects `approved-for-ordinary-code-required-check` and `liveAllowed: true`. Evidence must be mode `100644`, added once, and a direct child of T. For this pull request, HEAD must be E. A later main push passes only when `before` is B, the ordered parents are B then E, and the tree equals E.

The B..T workflow diff adds two steps and nothing else. I aligned all 111 pre-existing step names and `if` conditions; none changed. The new selector is the first admission test and keeps `set -euo pipefail`, so a present marker that fails `select` does not fall through to the PR #293 contract. The new verify step has no `continue-on-error`. The upload step uses `actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02`, the same pin as the existing upload steps. Workflow `on` and `permissions: contents: read` are unchanged. No path filter was added. The historical baseline steps remain in the file, still gated on their own modes.

The sealed `check` result is `pending`. A green structural run is not this approval. I also sent a pull_request event numbered 295. `select` exited 2 with `PR295_EVENT_PR` and `liveAllowed: false`, and wrote no mode to stdout.

## Checks I ran

On the detached E worktree, Node v24.15.0:

- `node --test --test-reporter=tap scripts/promotion-reviewed-code-pr295.test.mjs`: 22 passed, 0 failed. stderr sha256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
- `node --test --test-reporter=tap scripts/monitor-teacher-notice-health.test.mjs`: 7 passed, 0 failed, including the stale age 901 case and the hourly schedule assertion. stderr sha256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
- `select` on the PR #296 event printed `reviewed-code-pr295`.
- `check` on that event exited 0 after materializing the tree. Decision result `pending`, `probeBlobUnchanged` true, evidence commit E, every permission false. decisionDigest `1ed56062e707efed86ac509cd732e3127bcbfad842ad6ab07dfcf48953c32133`. The rerun again counted 22 and 7 passes with empty stderr. TAP `duration_ms` differs between executions, so I am not binding a stdout hash.

I did not re-run Playwright, a production build, or the production health endpoints.

## Limits

Approved for the ordinary-code required check of this exact source and tooling pin. The in-repository package remains pending. A later admission can bind this report. It cannot be produced by editing E. A23 is still pending. The hourly probe can miss an intervening failed heartbeat until the next hour. A later byte that is not already in S, or a tooling file outside the four-path release, needs a new review.
