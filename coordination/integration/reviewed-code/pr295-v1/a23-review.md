# Independent A23 review of the exact PR #295 schedule admission

Reviewer: `/root/a23_pr296_review`
reviewedAt: 2026-10-26T02:25:38.801Z
decision: approved-for-later-ordinary-code-admission

Independent A23 review of admission pull request #296, evidence commit E `bead6e80cc82f916ee3801581031bd5df9954eac`, covering source pull request #295. I did not author the source, the tooling, or the pending evidence. I accept exact source S and tooling T for a later ordinary-code admission. The sealed package decision stays `pending`. Every sealed permission stays false. Merge, preview, deploy, and production-database writes stay unauthorized.

Critical findings: none. Important findings: none.

## Where this report sits

E is the only `git log --diff-filter=A` addition of `coordination/integration/reviewed-code/pr295-v1/admission.json`. Its tree is `e961c6f55cd893dc9329b6e475721f2ed345d249`. For `pull_request`, the checker admits only head E on pull request 296 with base `63b02c4ec6a4415af0056313e8ad384bf4b61ee1`. For `push`, it admits only a main update whose ordered parents are that base and E and whose tree equals E.

The sealed identities are `pending-independent-a11` and `pending-independent-a23`. The sealed result is `pending-independent-review`. The checker rejects `approved-for-ordinary-code-required-check` and rejects `liveAllowed: true`. `docs/pr295-reviewed-code-gate.md` says a replacement report requires a new evidence commit, and editing these reports in place fails closed.

These two records are that independent review. They are outside E. A commit that adds them on `cursor/pr295-reviewed-code-admission-d1f6` makes the head tree differ from E, so the current `promotion-shadow-gate` job fails closed. I am leaving the lock as the checker implements it, and I am not pushing onto that branch. Disabling the rejection would weaken the tree lock.

## Recomputed bindings

Inventory digests use `inventory()` and `digest()` from `scripts/promotion-reviewed-code-pr295.mjs` at E, which delegate to the PR #282 inventory helper. Each entry carries Git mode, blob id, and raw SHA-256. File hashes below are raw SHA-256 of the git blob.

| Binding | Recomputed value | Matches the sealed claim |
| --- | --- | --- |
| Base B `63b02c4ec6a4415af0056313e8ad384bf4b61ee1` tree | `ae2aa9f91cbae248a9789ddad5c464c91e7495de` | yes |
| PR #295 parent `fbc0f7e53bf95d534d7665d2d7c4dc621556315d` sole parent | B | yes |
| PR #295 `50f323b0ee86437490ffbe2267fdd2f9709ab5de` sole parent | that parent; tree `a155bf47370adee1fcd4c2ad00d50d15ea4e2bb9` | yes |
| S `a7b7d104f2dfc93e8ab5282b5e90586e123f452c` parents | B then PR #295; tree equal to PR #295 | yes |
| B..S inventory digest | `c17f40a337ae7c18511bc1445616a1b3c50471ed9caeae9fcb7e801aa98711e5` | yes |
| T `cd5eedb77f6cabb9ca627a38d15fce7713dbc84d` sole parent | S; tree `f676edca97330fafdb31b7315c097e64b4202395` | yes |
| S..T inventory digest | `a333ef913eb7fd6ed16378e087018b2b12242fd121dd56f1511918135ca16a00` | yes |
| E sole parent | T; tree `e961c6f55cd893dc9329b6e475721f2ed345d249` | yes |
| `source-checks.json` raw SHA-256 | `af708ee467b49334ae97301ced2ccb468f06987de4f2f243c41e9a6c27d245b6` | yes |
| Pending A23 report / decision at E | `c26de1dd8224b7fead7a078bea2bc01759dbe453c2896c8ca6736bcc18a0b52a` / `1ed65d4212b253dbe336fffa6d180a81f1669af4b0bc11fdf3e60fe9f2e977d6` | yes |
| Pending A11 report / decision at E | `68af94637a7c14ad90c8c2a0aeeb792e1bae47a3521441890369ea80a52577b3` / `7aa005e577d6f0512f92bab694a51db9dd4ef16b45958abe6072b258d84e7361` | yes |
| Probe blob at B, S, PR #295, and E | `34d8b50957af26e9bfdef6f343117b6bea4db0b4` | yes |

`git diff --name-only S 50f323b0` is empty. `git diff --check B E` is clean. B..S is exactly two regular `100644` paths. S..T is exactly the four regular `100644` tooling paths. T..E is exactly the seven regular `100644` evidence paths. The marker is absent on T.

| Tooling file | Raw SHA-256 |
| --- | --- |
| `.github/workflows/promotion-shadow.yml` | `b29ce1407044903299dcea0505832f5b13df700f984b897a14c022f0e62e23a6` |
| `docs/pr295-reviewed-code-gate.md` | `ac7c9681cdfd0e3cd3495bdc5558066e246c42aa06cc203f2c9bd3effb85ce67` |
| `scripts/promotion-reviewed-code-pr295.mjs` | `fdeb98d0b87ce6aade5541c5d968c7b1d4b616cccf7f0229b91de8510454de38` |
| `scripts/promotion-reviewed-code-pr295.test.mjs` | `9faf096b5735bef236859daacba123f02580823c9e99efd83b3bc2e97d062873` |

| Source path | After raw SHA-256 |
| --- | --- |
| `.github/workflows/teacher-notice-health-monitor.yml` | `5b2fc8a0fe9b46723187851c7aacf7388c92e89f0bbb223120390846ca6ee234` |
| `scripts/monitor-teacher-notice-health.test.mjs` | `f669fcf4e8996cd6a10766aad02d2ce2aea69316f26385799319948d660a67d4` |

## Merge composition and source behavior

S keeps both parents. The first parent is current main. The second parent is the reviewed PR #295 head. The merge tree equals that head, so the merge added no third-party bytes. The parent commit changes only the health workflow. The head commit changes only the schedule assertion. No squash and no rebase.

The cron moves from `3-59/5 * * * *` to `7 * * * *`. `workflow_dispatch` remains, including the boolean `alert_drill` input defaulting to false. Workflow permissions remain `contents: read` and `issues: write`. The test assertion matches the new cron. Both files say to restore `3-59/5 * * * *` after #273 closes. On 2026-10-26, issue #273 "MAIS teacher-notice production health alert" is open, and issue #294 requesting this relief is open.

`scripts/monitor-teacher-notice-health.mjs` is byte-identical to base. Its git blob is `34d8b50957af26e9bfdef6f343117b6bea4db0b4` and its raw SHA-256 is `81ebba2f812b9067e0b28231cb8c220b90751f5663fc3c866f54ba7b07205cdb`. `validateHealthyPayload` still requires `health.status` `healthy`, an empty `reasons` array, `heartbeatStatus` `succeeded`, `candidateMatch` true, and `heartbeatAgeSeconds` in the closed range 0 through `15 * 60`. The hourly sample can miss a failed heartbeat that a later success overwrites before the next hour. That is the temporary suspension of the five-minute sampling property, written in the admitted comments. The pass/fail criteria are unchanged. Restoration is a comment in those bytes. This checker does not schedule it.

## Promotion-shadow-gate

I compared the workflow blob at T with B. `expectedWorkflow(B)` equals the T blob. The header through the name `Select exact Promotion contract` is byte-identical, including `pull_request` plus `push` to `main`, no `paths` filter, no `workflow_dispatch`, job name `promotion-shadow-gate`, `contents: read`, `ubuntu-latest`, no job-level `if`, and `fetch-depth: 0`. The bytes after the step name `Verify exact PR293 historical documents and ownership configuration` are byte-identical to B.

`continue-on-error` occurs zero times at B and zero times at T. The base workflow has 111 steps. T has those 111 plus two: `Verify exact PR295 teacher-notice schedule admission` and `Upload exact PR295 reviewed-code admission proof`. None were removed. The mode allowlist grows from 15 entries to 16 by adding `reviewed-code-pr295` only. The new check step is gated on that mode and has no `continue-on-error`. The upload step uses `always()` and `actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02`, the same pin as the existing upload steps. Historical baseline `03717842b19e8b8fa9a3a2dbecf1b359bb842233` still occurs 36 times, and execution `ff709c0141ef8660604a20340b1c476bf2941f60` still occurs 14 times.

The new marker test is first and includes a symlink (`-e` or `-L`). `mode=$(...)` sits in the `then` branch under `set -euo pipefail`. A direct bash probe of a failing command in that position exited 1 and did not execute the following statements. On the real E worktree, `select` printed `reviewed-code-pr295`. The same command with head S exited 2, wrote no stdout, and returned `PR295_EVENT_PR`.

The decision constant is `pending`. The scope is `exact-pr295-teacher-notice-health-schedule-pending-independent-review`. The sealed permissions keep `ordinaryCodeEligible`, `liveAllowed`, `integrationAllowed`, `previewAllowed`, `deployAllowed`, `wholePackAccepted`, and `historicalAuthorityTransferred` false. I did not re-execute the historical native shadow. This package writes no Shadow Receipt and does not transfer historical authority. Preserving those steps for their own modes, and failing closed when this marker is present but the tree is not E, is the PR #293 additive shape. It is not a bypass of the older contracts.

## What I executed

Checkout `/tmp/pr296-review` at E, clean tracked status. Node v22.23.4. `yaml@2.9.0` was present only as an ignored `node_modules` package so the monitor test could load. I did not rerun Playwright, `npm ci`, the historical baseline, or a production or preview database.

`node scripts/promotion-reviewed-code-pr295.mjs check` on this tree returned exit 0. It materialized the full tree and reran both suites. The decision result is `pending`. Local decision digest `4cfa0318b44ee2d85ac913431f704f754cb5353a3886182fbb4ec4d23261c2a5`. Contract stdout `eaf2b2af75bb11ab195726fa63316e40218748a774373005f5b45dc19b79acba`. Monitor stdout `c91b251c9c2c246da3d3a19a65c3770434722fb3bc1690d81e4099cfc275fa5e`. Both stderr hashes are `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. Counts are 22/22 and 7/7, with zero failures, skips, and todos. The contract suite includes the negative cases for an extra runtime file, a changed probe, `continue-on-error` injected into an old step, extra evidence, crossed reviewer identities, a foreign tooling commit, an approval result, `liveAllowed: true`, duplicate JSON keys, failed recorded counts, a later amendment, a dirty tree, a sparse index, replacement refs, grafts, an aliased root, a symlink marker, and forged TAP.

GitHub `promotion-shadow-gate` run `40256763016` on E succeeded. Its decision result is `pending`, evidence E, schedule `7 * * * *`, `probeBlobUnchanged` true, and the same seven permissions false. Its decision digest is `88e480d6b80e3f59b6eef39a9d70a8dacb39f4874a6f26ed7d36b82314a49c39`. Node 24 stdout hashes differ from the local run because `duration_ms` differs: contract `0b456f37c2ca66236784f039f09f6e2e02774a0e07d5e9480224f7244bb6b567`, monitor `6605b92f0355dbcf0a6ff13a588304c863dddb52586638dd5c4343cc0a26b1fc`. Pass counts match. Stderr is the empty hash above. That green job is the pending structural check. It is not ordinary-code eligibility.

The separate CI run `40256762996` on E had succeeded for `snapshot`, `postgres-integration`, `visualization-browser`, `teacher-notice-outbox-postgres16`, `resend-webhook-postgres-integration`, and `teacher-parent-e2e` when this report was frozen. `validate` job `121360239343` in run `40256762996` succeeded at `2026-10-26T02:23:33Z`.

## Residuals a later admission still has to carry

- The hourly cron is a coarser sample. A failure that recovers before minute 7 of the next hour is invisible to this schedule. The 15-minute heartbeat ceiling inside the unchanged probe still applies to whatever sample it does see.
- Restore `3-59/5 * * * *` and the matching assertion after #273 closes on a healthy run. This package records that sentence. It does not enforce the clock.
- The in-repository A11 and A23 files remain packaging placeholders. A later evidence commit has to bind this report by its exact bytes and result `approved-for-later-ordinary-code-admission`. Editing E cannot produce that binding.
- A separate A11 comment was already on PR #296 when this text was frozen. I did not use that comment as execution evidence, and this decision is not that review.

## Authority

`liveAllowed` is false. This report does not set `ordinaryCodeEligible`. The owner's merge of #296, if any, stays a separate authorization and must be an ancestry-preserving merge of this exact tree. Squash and rebase do not satisfy the package. I authorize no preview and no production-database write.

The known external-review limit remains. Identity strings and hashes bind these bytes. They do not cryptographically prove authorship. This file is the independent A23 session's own report.
