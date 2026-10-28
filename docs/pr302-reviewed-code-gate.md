# Exact PR302 cron and configuration admission

PR302 is the current-main successor to PR269. Its source removes scheduled warm calls, changes teacher email and webhook maintenance to ten-minute intervals, and changes general health polling to thirty minutes. The monitor workflow changes comments only; parsed YAML, hourly monitoring, permissions and steps are unchanged. The exact Vercel ownership entry repairs an observed strict-intake rejection without relaxing the zero-unmapped policy.

## Frozen source

- Base B: `934c332427bab4ce49e39897bde7102c50a6ca93`.
- Source S: `08194177bac98d715d6fb90c114aa65ce3c7cf19`, a direct child of B.
- Source tree: `04f0792e6f22e3c807aa97cb15f9666413fe7c5d`.
- B-to-S inventory: `7e47ee60806a4e2e2c6200920c1c0811777a2b2df26d7676d6970d4534c196a0`, exactly eight paths.
- Fresh committed-source check record SHA-256: `11e9e3fa600dec1b869d7de1f87b1918fbd0ff4b1242bb6ccf20ce4cdc2a5f7b`.

The eight paths are the original four schedule/test files, the production-monitor comment correction, the two existing ownership registers, and the new lifecycle record. The Vercel file resolves uniquely to A10, with one exact path and a corresponding resolution assertion and existing release-package membership. The original unmapped-map rejection is retained. All other owner rules, checks, policies and final states are unchanged. The original PR269 source and history remain recoverable; this is a reviewed port.

The retained red test run has three expected failures against the old configuration. After the port, 24 schedule/handler cases, six operational-health cases and twelve monitor cases pass without skips. Strict TypeScript passes. The full local governance result is 164 passed, eleven existing historical skips, zero failed; those skips are not new Promotion validation.

## Tooling and evidence partition

T directly follows S and changes exactly this document, the new checker/test and deterministic Promotion workflow insertions before PR301. E directly follows T and first-adds seven records under `coordination/integration/reviewed-code/pr302-v1/`: admission, source inventory/checks, and independently authored A11/A23 JSON/Markdown pairs. The formal reviewers inspect actual immutable T; a preliminary source review or synthetic test fixture is not substituted for that review.

Only same-repository PR302 at exact B/E is accepted. An authorized main merge must have ordered parents [B,E] and E's exact tree. Extra paths, forks, changed bases/heads, descendants, altered source/check/tooling/evidence bytes, stale/future reviews, malformed authority JSON and permission widening fail closed. Removing the three deterministic selector/mode/check/upload insertions reconstructs S's previous workflow byte-for-byte. A present invalid PR302 marker cannot fall back to an older approval.

The checker freshly runs 37 adversarial contracts, strict TypeScript, the exact 24/6/12 cases and the existing ownership/package validator. Test output requires complete TAP counts and names with no failures, cancellations, skips or TODOs. Type output must be empty. Ownership output must be strict JSON with valid, fully resolved coverage, matching counts and the fixed digest of its complete report. The report's existing blocker dispositions remain blocker dispositions; a valid schema/coverage result does not approve those packages. Its expected report digest is `21fe3853bef4770dcb8dd4be118705e5fe6ea4e9f5532b2c621ee3b1298d3125`.

The restricted child environment excludes inherited provider/database credentials, NODE_OPTIONS and NODE_PATH. Artifacts require a fresh private directory outside the repository. Full source materialization runs before and after execution, followed by renewed event/currentness checks. A local macOS path-length failure is not a waiver of the unchanged Ubuntu guards.

## Claim boundaries and ownership

All six permissions remain false. `liveCronProven=false` and `measuredSavingsProven=false` are explicit in the decision. Scheduled calls calculate to 1,152 -> 336 per day, while scheduled throughput also falls; this is not measured Neon idle time, billing savings, queue capacity or production health. No endpoint implementation, batch limit, retry policy, health threshold, provider environment or deployed schedule is changed by this source-only acceptance. Deployment remains a separate assignment.

Ordinary CI must independently pass on the final head and actual main, including the production build. This gate is an exact ordinary-code admission, not native content approval, historical Promotion revalidation, a Shadow Receipt or production acceptance.

A22/A10 owns the source/configuration slice with A11 test coordination and exact ownership-register repair. Independent reviewers are A11 `/root/pr286_source_review` and A23 `/root/pr300_a23`. Branch `codex/pr269-current-main-20261029` reuses `/Users/dongpinhu/.codex/worktrees/p286/MAIS-MVP`; target PR302 succeeds PR269. Created 2026-10-29 Asia/Taipei; closeout follows actual PR/main checks and evidence preservation. The remaining owner sequence is PR275 -> PR225, with historical sources deferred.
