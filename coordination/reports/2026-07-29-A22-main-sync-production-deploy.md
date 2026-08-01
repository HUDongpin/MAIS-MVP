# 2026-07-29 A22 main-sync production deploy — DEPLOYED

## Summary

Synced production (www.mais.ac / www.mais.hk) to origin/main, shipping PRs #69–#83:
the 2026-07-26 cleanup-session train (#69 lesson loading-boundary fix, #70 figure-audit
CI gate, #71 prod-certification orchestrator, #72 galaxy cross-grade backtracking,
#73 component-test CI gate, #74 FigureScroll, #75 student guided tour + dashboard
next-step panel, #76 US tutor RAG grounding, #77 teacher dashboard charts, #78 CA G1
demo seed, #80 evidence docs), #81 loading-guard lessons test, #82 prod-cert P1 fixes
(guest-tolerant `/api/auth/session-state` + nosniff header), and #83 (stage
`vercel.json` in the pruned deploy package).

**Two deploys were needed.** Take 1 (`dpl_EYB7xYVJfcaeVwKczNqqPXBDU6e8`) exposed that
`prepare-vercel-staging.mjs` had never copied `vercel.json` — meaning **no staged
production deploy had ever shipped the keep-warm cron (PR #61) or header config**;
Vercel reads regions/crons/headers from the uploaded tree. Fixed in PR #83; take 2
promoted.

## Release source

- Source: clean clone `/Users/dongpinhu/Desktop/MAIS-release-clone-20260725`
- Branch/HEAD: `main` @ `8e4587c195` (= `701a84000c` merge of PR #83 + A25 evidence)
- Clone tree clean at deploy time (A25 map: 0 dirty entries, evidence committed)

## Gates

- Full CI validation (workflow_dispatch, `full_validation=true`) on main head:
  run 30378926279 — **success** (validate + snapshot + visualization-browser +
  teacher-parent-e2e all green)
- Dry run `20260729-main-sync`: preflight + build gate + pruned staging — passed
  (3,116 files, forbidden paths 0); take-2 staging includes `vercel.json` (3,117)
- Disk guard initially failed (15.3 GB free): cleared 31 GB of stale `.tmp` build
  junk in the primary root + thinned the 2026-07-28 local Time Machine snapshot
  pinning the blocks → 50 GB free
- A25 dirty-tree maps refreshed: primary root (3,252 entries, 0 unmapped) and
  clean clone (0 entries) — evidence committed to main

## Deploy & promotion

- Take 2 deployment: `dpl_4yrFi8RFnJcdVJCER15ACzR18oaS`
  (`mais-31l5ob7an-peter-dongpin-hu-s-projects.vercel.app`), target=production, ● Ready
- Post-deploy AI-Tutor live latency smoke failed **environmentally** (same
  sandbox-TLS egress artifact as 2026-07-26; the certification run's tutor smoke
  passed against the live domain) — pipeline correctly did not auto-promote
- Manual promotion: `vercel promote dpl_4yrFi8RFnJcdVJCER15ACzR18oaS` — Success
- Smoke auth mode: `DASHBOARD_SMOKE_USE_DEMO_LOGIN=1` (demo fixtures, no credentials)

## Live-domain verification

- `/` 200 and `/login` 200 on both domains
- **`x-content-type-options: nosniff` present on both domains** (P1 closed)
- **`/api/auth/session-state` → 200 `{"user":null}`** for guests on both domains;
  `/api/me` unauthenticated → 401 (contract preserved)
- **Keep-warm cron registered for the first time**: `vercel crons ls` shows
  `/api/warm  */5 * * * *`

## Post-deploy certification

`npm run certify:production` (2026-07-28T17:24Z, report
`.tmp/prod-certification/2026-07-28T17-24-53.528Z/`): **CERTIFIED_WITH_FINDINGS** —
all P0 pass on both domains.

- **security-headers: PASS** both domains (hsts + nosniff) — previously-open P1 resolved
- **browser-console: PASS** landing/about/login, both domains, zero console errors —
  previously-open guest-401 P1 resolved
- smoke-ai-tutor-live: PASS (33s, success)
- keep-warm: warm hits 774–899ms (first hits 2.1–2.7s); dashboard-latency WARN
  (passed on retry — cold start immediately after promotion, before the first cron tick)

## Follow-ups

- None blocking. The dashboard-latency retry-WARN should self-resolve now that the
  cron actually ships; re-run `certify:production` after ≥15 minutes of cron ticks
  to confirm.
