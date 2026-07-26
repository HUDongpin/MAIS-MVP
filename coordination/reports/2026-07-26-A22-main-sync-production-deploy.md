# 2026-07-26 A22 main-sync production deploy — DEPLOYED

## Summary

Synced production (www.mais.ac / www.mais.hk) to origin/main, shipping PRs #61–#68:
login-perf fixes (PR #61: /about slimming, /api/warm + keep-warm cron, async pbkdf2),
the lesson-practice ↔ Practice Arena alignment train (PRs #62–#66), the
source-regressions suite + loading.tsx SSR-flake fixes (PR #67), and TEKS docs (PR #68,
docs-only, excluded from staging).

## Release source

- Source: clean clone `/Users/dongpinhu/Desktop/MAIS-release-clone-20260725`
- Branch/HEAD: `main` @ `a0e05d99d6` (= `04cdfe8919` merge of PR #68 + A25 evidence commit)
- Clone in sync with origin/main at deploy time (0/0 divergence)

## Gates

- Full CI validation (workflow_dispatch, `full_validation=true`) on main head
  `04cdfe8919`: run 30197091706 — **success** (16m+ type-check, focused tests, prod build)
- A25 dirty-tree map: `2026-07-26-A25-dirty-tree-map-20260726T094729Z` — 0 expanded
  entries, 0 unmapped, 0 ambiguous; committed+pushed as `a0e05d99d6`
- A22 clean-source gate: passed (clean-worktree, tree clean)
- A25 strict worktree-lifecycle gate: passed
- Dry run `--run-id 20260726-main-sync`: **green** — localBuildGate passed (235/235
  pages, all required outputs present), stagingFileCount 3110, stagingTotalBytes
  259,044,854, **forbiddenPathCount 0**

## Deploy & promotion

- Deployment: `dpl_6NZybmzyPW2qbqkJQo4UbzvpJ4Gj`
  (`mais-j9ozfpuwk-peter-dongpin-hu-s-projects.vercel.app`), target=production,
  built ● Ready
- Post-deploy AI-Tutor live latency smoke failed **environmentally** (sandbox TLS to
  fresh *.vercel.app host — documented egress-proxy artifact); pipeline correctly did
  not auto-promote (`--skip-domain` left live aliases untouched)
- Manual promotion: `vercel promote dpl_6NZybmzyPW2qbqkJQo4UbzvpJ4Gj --scope
  team_i9xhhYXUeYBOCLcfWBjTqlYG` — Success
- Live-domain verification (real smoke, both domains): `/` 200, `/login` 200,
  `/api/warm` **200** (was 404), `/about` **328KB / ~2s** (was 18.9MB / 30.8s),
  build parity confirmed

## Post-deploy certification

`npm run certify:production` (2026-07-26T10:20Z, report
`.tmp/prod-certification/2026-07-26T10-20-45.402Z/` in the prod-cert worktree):
**CERTIFIED_WITH_FINDINGS** — all P0 pass. Resolved vs 2026-07-26 morning run:
/about budgets now PASS (321KB HTML / 195KB RSC), /api/warm 200 both domains,
keep-warm second hits 126–176ms. Remaining pre-existing P1 findings (unchanged):
missing `x-content-type-options` header on both domains; guest-page 401 console
error on landing/about. Dashboard smokes passed on retry (first-attempt cold start;
keep-warm cron had not yet ticked against the fresh deployment).

## Rollback

Vercel promotion swap back to previous production deployment
(`dpl_DzwdoTxD5T93QPua3ZqskFTQ2QzK`, 2026-07-25) — no code revert needed.
