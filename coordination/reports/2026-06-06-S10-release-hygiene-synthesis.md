# S10 Release Hygiene Synthesis

- Date: 2026-06-06
- Session ID: S10
- Role: tooling, docs, reporting, and release coordination
- Objective: synthesize S25/S22 release hygiene work for California Math Practice Beta.
- Scope used: `coordination/reports/` only.
- Production/Git action: none.

## Bottom Line

The highest risk is confirmed: California Math Practice Beta is live on `mais.hk`, but the release provenance is a pruned staging snapshot from a dirty worktree rather than a clean commit.

This pass produced the release hygiene control documents needed for the next action:

- S25 owner map and slice recommendation: `coordination/release-intake/2026-06-06-S25-release-hygiene-dirty-tree-owner-map.md`
- S22 production/redeploy/rollback evidence: `coordination/reports/2026-06-06-S22-california-beta-redeploy-rollback-evidence.md`
- S10 synthesis: this file

## Current Decision State

| Question | Current answer |
| --- | --- |
| Is California Math Practice Beta live? | Yes, `mais.hk` serves deployment `dpl_2uWqtZawpLqnGiFj8XDPxQm8jxF1`. |
| Is the public label correct in the checked live chunk? | Yes, live register chunk contains `California Math Practice Beta`; no `California Curriculum` match in that chunk. |
| Is the deployment source a clean commit? | No. S23 records a pruned staging snapshot from a dirty workspace. |
| Is rollback evidence available? | Yes, previous Ready production deployment is `dpl_CKhgWvTjNQxmNz5dEHzS1mWwne8Y`. |
| Should rollback happen now? | Not from this report alone. Use rollback only for production P0/P1 behavior or owner decision. |
| Is clean redeploy ready? | Not yet. Needs S25 clean slice approval, review, commit, checks, then deploy. |

## Recommended Morning Action Order

1. Owner approves the intended slice boundary.
2. S25 or assigned Git hygiene owner creates a clean branch or PR plan without staging unrelated files.
3. S22 confirms whether the S22 build hygiene slice is required for a clean California build.
4. S04/S10/S09 review the large California practice/register copy and runtime diffs.
5. S11 reruns focused California E2E on the clean source.
6. S22 redeploys from the clean source and records fresh inspect/chunk evidence.

## Do Not Include In California Clean Slice

- `public/question-illustrations/mainland-pep-junior/`
- broad `coordination/content-qa/` candidate and private corpus paths
- California middle-school textbook review route/assets unless the owner intentionally expands the release beyond Practice Beta
- local generated directories such as `.next-*`, `.s11-*`, and temp Playwright config files

## Owner Decisions Needed

1. Approve whether the first clean source target is Practice Beta only or Practice Beta plus S22 build hygiene.
2. Decide whether S25 may stage/commit/branch the clean slices. No Git mutation has been performed yet.
3. Decide rollback only if production health requires it. The exact rollback target is available in the S22 evidence report.

## Checks Run For This Synthesis

- `git status --porcelain=v1` inventory and top-directory counts.
- Owner/session classification using AGENTS.md paths.
- `curl -I https://mais.hk/`.
- `curl` live `/register` chunk scan.
- `vercel inspect` for current, preview, and prior production deployments.
- `vercel ls` and `vercel alias ls` for deployment and alias evidence.

## Checks Not Run

- No `npm run build`, `npm run type-check`, or Playwright run in this reporting pass because no production source files were edited.
- No Vercel deployment, rollback, or promotion was performed.

