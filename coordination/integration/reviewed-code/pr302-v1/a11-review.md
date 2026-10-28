# Formal independent A11 review of immutable PR302 source and tooling

Reviewer: /root/pr286_source_review

Reviewed at: 2026-10-28T21:28:21.570Z

Decision: approved-for-exact-pr302-required-check

Scope: exact-pr302-cron-configuration-required-check-only

This is a separately authored formal review of actual immutable tooling T. No blocking actionable finding remains in the exact source/tooling package. Earlier source and pre-freeze reviews are preserved as earlier records; neither is substituted for this actual-T decision.

## Exact binding

| Item | Independently verified value |
| --- | --- |
| Base B | 934c332427bab4ce49e39897bde7102c50a6ca93 |
| Source S | 08194177bac98d715d6fb90c114aa65ce3c7cf19 |
| Source tree | 04f0792e6f22e3c807aa97cb15f9666413fe7c5d |
| Source inventory digest | 7e47ee60806a4e2e2c6200920c1c0811777a2b2df26d7676d6970d4534c196a0 |
| Tooling T | 159c41d3be1943bc491fca0314ad5d36bcd25c08 |
| Tooling tree | 2f3f84fbe4314fe17f4199b5d2bf2bfa37432985 |
| Tooling inventory digest | 0cde4ce54643323ac7ea9f6245ef42a699db9ad88980847b5e95d9ae4aa4b048 |
| Source-check record raw SHA-256 | 11e9e3fa600dec1b869d7de1f87b1918fbd0ff4b1242bb6ccf20ce4cdc2a5f7b |

I verified the direct B -> S -> T parent chain, both trees, exact eight-source/four-tooling path inventories, raw file hashes and working-file equality to the committed blobs. The four immutable tooling files exactly match the corrected pre-freeze files. The assigned reviewers are A11 /root/pr286_source_review and A23 /root/pr300_a23; the formerly incorrect A23 template substitution is absent, and the explicit assigned-identity assertion executes in the fresh contract suite. HEAD, tree, hashes and clean tracked/untracked status were stable before and after all commands.

## Source and ownership assessment

The source retains the reviewed four-file PR269 scheduling/test change: scheduled /api/warm is removed; teacher-notice email and webhook maintenance run at */10; general /api/health runs at */30. Region, headers, endpoint code, authorization, provider configuration, worker batch limits, retry behavior and fifteen-minute operational-health thresholds are unchanged. The warm endpoint remains available to explicit diagnostics.

I rechecked the actual B/S workflow blobs and found identical complete parsed YAML for teacher-notice-health-monitor.yml. Only comments changed, accurately separating configured source cadence from deployed cadence and requiring future restoration-offset review. The hourly minute-7 schedule, steps, controls and permissions are unchanged. Historical checker/evidence files are not edited or reused as approval of this new source.

The owner-pathspec change is exactly vercel.json under the existing A10 configuration owner plus its resolution assertion. Reversing those two additions reconstructs the complete base owner manifest. The package-manifest change is only that path in the existing A22/A10 release-hygiene package and its update date. Reversing those changes reconstructs the base package manifest. Other owners, policy, checks and final states are unchanged. The complete ownership report retains five blocker-report dispositions; schema/coverage validity does not approve those packages or authorize staging. The earlier strict unmapped rejection remains historical failure evidence, and the zero-unmapped guard is not weakened.

The operational trade-off is intentional and remains unproved in production: fewer configured calls and lower scheduled processing capacity, less margin for backlog/delayed or long-running work, less pre-warming and slower general-health polling. The 1152 -> 336 calls/day and 96 -> 48 scheduled email claims/hour figures are calculations, not measured savings, deployed cadence or successful throughput. No queue, cold-start, provider-quota or production-health acceptance is inferred.

## Executable gate assessment

The checker admits exact S -> T -> E composition with four tooling paths and seven first-added evidence records. It binds source tree/inventory/current bytes, tooling tree/inventory/current bytes, exact raw source checks, independent reviewer identities, JSON/Markdown hashes and canonical review times. Same-repository PR302 requires exact B and E; prospective main requires ordered [B,E] parents and E's tree. Wrong events, forks, bases, descendants, source/tooling/evidence drift, extra paths, malformed/duplicate authority JSON, stale/future reviews and permission widening fail closed.

The actual Promotion workflow exactly equals deterministic insertion into S before PR301. Older selector branches, checkers, evidence, action pins and step controls are retained. A present invalid PR302 marker cannot fall through to older approval. Full materialization runs before and after child execution, followed by fresh preflight/currentness checks. Child environments omit inherited provider/database credentials, NODE_OPTIONS and NODE_PATH, and artifacts require a fresh private canonical temporary directory outside the repository.

Types must exit successfully with empty stdout and stderr. Ownership output must be strict JSON with valid, fully resolved and count-consistent coverage and empty stderr. verifyExecution compares the entire summary including the canonical digest of the complete report: 21fe3853bef4770dcb8dd4be118705e5fe6ea4e9f5532b2c621ee3b1298d3125. Changed owners, package identities, coverage rows or blocker dispositions therefore cannot hide behind unchanged counts. The fresh contract suite includes the associated negative cases and assigned-identity check.

All six admission permissions remain false. The generated decision explicitly keeps liveCronProven=false and measuredSavingsProven=false. These statements limit the outcome to exact ordinary-code required-check eligibility.

## Fresh independent actual-T execution

All six commands ran under Node v24.15.0, caller umask 077 and g.commandEnvironment. Every result was validated through g.verifyExecution, and raw stdout/stderr hashes are recorded in verification.json.

| Exact command | Fresh result |
| --- | --- |
| node --test --test-reporter=tap scripts/promotion-reviewed-code-pr302.test.mjs | 37 passed; zero failures, skips, cancellations or TODOs |
| node --max-old-space-size=6144 node_modules/typescript/bin/tsc --noEmit --incremental false | Exit 0; empty stdout/stderr |
| node --import tsx --test --test-reporter=tap app/api/cron/teacher-notice-resend-webhook-maintenance/route.test.ts app/api/health/route.test.ts lib/server/teacherNoticeEmailOutboxHandlers.test.ts | 24 passed; zero failures, skips, cancellations or TODOs |
| node --import tsx --test --test-reporter=tap lib/server/teacherNoticeOperationalHealth.test.ts | 6 passed; zero failures, skips, cancellations or TODOs |
| node --test --test-reporter=tap scripts/monitor-teacher-notice-health.test.mjs | 12 passed; zero failures, skips, cancellations or TODOs |
| node scripts/release-package-gate.mjs --json | Strict report accepted: 9 packages, 39 owner packages, 43 resolution assertions, 44 exact-path checks and 14 wildcard checks; complete digest matches |

I also reread the original committed-S source-check record and all five stdout/stderr pairs, recomputed their raw hashes and independently validated each result with the checker. Source execution time is after S and no later than T. These consumed source logs are distinct from the fresh actual-T command logs. git diff --check B T passed. No source file or Git state was changed.

## Material limits and pending acceptance

The actual-T local-materialization.json receipt binds 159c41d3be1943bc491fca0314ad5d36bcd25c08 and records blocked-local, ENAMETOOLONG and fullMaterialization=false on a historical long integration path. I inspected its actual bytes and recorded their hash in verification.json. I did not rerun, weaken or waive this guard. Actual final-E Ubuntu and any authorized main runs must pass the unchanged before-and-after full materialization checks. Passing scoped source hashes and offline tests does not replace that proof.

No final E exists in this review, and no final E/main or remote required-check acceptance is claimed. The parent's reported source ordinary-CI 7/7 result is source-only evidence and was not independently queried here. It does not establish final E/main acceptance. No live cron execution, deployed-cadence readback, measured billing saving, live provider/database operation, Preview, deployment, production-health recovery or historical authority transfer is asserted. Tests use injected/offline fixtures; no real service credentials were supplied.

This approval is solely approved-for-exact-pr302-required-check for the bound actual S/T pair. All six permissions remain false: historicalPromotionRevalidated, liveAllowed, previewAllowed, deployAllowed, wholePackAccepted and historicalAuthorityTransferred. It does not authorize merge, deployment, whole-package acceptance or live operation.

Independent logs and verification receipt reside in .local/pr302-admission/reviews/a11/. Earlier a11-pre and source-review records remain preserved separately.
