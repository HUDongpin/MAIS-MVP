# Exact PR307 hourly teacher-notice admission

PR307 changes teacher-notice scheduling to two aligned hourly workers, keeps the monitor hourly, and aligns operational windows and sparse production-acceptance waits. Its frozen source is rejected by the inherited PR306 selector with `PR306_EVIDENCE_TREE`. This new ordinary-code admission binds only PR307's exact source, tooling and independent evidence. It preserves every prior gate and grants no deployment, live, preview, historical promotion, or whole-pack authority; all six permission flags remain false.

## Source and custody

- Source owner: `/root`; tooling author: `/root/health_diagnosis`, borrowing A22. Independent reviewers: A11 `/root/low_frequency_release` and A23 `/root/content_release_review`.
- Source PR: [#307](https://github.com/HUDongpin/MAIS-MVP/pull/307).
- Tooling branch: `codex/pr307-hourly-admission-20261102`; worktree: `/Users/dongpinhu/.codex/worktrees/pr307-hourly-admission/MAIS-MVP`.
- Created: 2026-11-02 Asia/Taipei; expected closeout: 2026-11-02 or after parent-coordinated review/integration. Retain the worktree pending that disposition; no cleanup is authorized by this record.
- Base B: `b56ede5c36f94d7ee8884048ce80e6f1afea8521`.
- Source S, directly parented by B: `462cf236fc599d332deb77c62bb9bb45b5f65465`; tree: `464ba82371c91a37de03d819e03adc4b8ce389d9`.
- The frozen B-to-S inventory has exactly 17 paths; digest: `ab48a5bc2331532a91558d5f5b2ef9d7bd67bb428286712dd8e5853961469889`.
- Clean-S source-check bytes: `62aef65d947cf0e4d7475c695b92974f701f5a66448d02bc3630ce1e78db1894`. Raw stdout/stderr and the exact check/inventory JSON are retained outside Git for the reviewers and subsequent evidence assembly.

## Tooling and evidence

T directly follows S and changes exactly five paths: this document, the new PR307 checker and its test, `.github/workflows/promotion-shadow.yml`, and `.github/workflows/ci.yml`. The Promotion workflow change adds a selector before PR306, one accepted mode, and conditional verification/upload steps. Removing these deterministic additions reconstructs S's workflow byte-for-byte. Existing checker code and all historical receipts/reviews remain unchanged.

The CI change pins only `visualization-browser` and `teacher-parent-e2e` from `ubuntu-latest` to `ubuntu-24.04`. PR307 [run 41377592917](https://github.com/HUDongpin/MAIS-MVP/actions/runs/41377592917), including job 125061142878, failed at Playwright dependency installation on Ubuntu 26.04 before browser tests executed. The installed [Playwright 1.59.1 requirements](https://github.com/microsoft/playwright/blob/v1.59.1/docs/src/intro-js.md) list Ubuntu 22.04/24.04, and its native dependency map has no Ubuntu 26.04 entry. No package upgrade, test skip, job/event/permission change, or broader runner change is included. The checker reconstructs the exact two-line CI delta, and tests compare parsed YAML for every job and top-level control.

A11 and A23 must review the actual immutable T and author their own decision/report binding S, its tree/inventory, T, its tree/inventory, source-check bytes, and report bytes. These reviews are not supplied by the tooling author. E must directly follow T and first-add exactly seven records under `coordination/integration/reviewed-code/pr307-v1/`: admission, source inventory, source checks, and the two reviewers' JSON/Markdown pairs. Future T/E hashes are not invented or predeclared. Synthetic test reviews are explicitly fixtures and are never actual approval evidence.

The checker accepts only same-repository PR307 at exact B/E, or a separately authorized main merge with ordered B/E parents and the same E tree. Changed or forked events, moved base/head, unrelated descendants, extra source/tooling/evidence paths, modified permissions, stale/shared reviewers, duplicate authority keys, aliases, hidden index flags, loaders, and altered workflow controls fail closed.

## Validation boundaries

The clean-S checks executed with an allowlisted offline child environment on Node 24: strict nonincremental TypeScript; 98 hourly scheduling, health, heartbeat, SQLite, monitor and acceptance tests; and the unchanged 17 native activation contract tests. These are contract tests, not execution of historical native promotion. The source-check JSON binds exact arguments, counts, names and stdout/stderr hashes. No credentials, provider calls, production acceptance, Neon queries or other live probes were used.

Fresh admission execution requires the PR307 contract suite plus those source commands, with exact successful counts/names, no skips/cancellations/TODOs, and empty type-check output. The contract suite is bounded to 600 seconds, type-check to 300 seconds, and each remaining command to 180 seconds; the workflow step allows 25 minutes. Artifacts go to a fresh private canonical runner-temp directory. Full tracked-tree materialization and currentness are checked before and after execution.

Local source verification used clean HEAD/status and exact bytes for all 17 source paths. The inherited full-tree materialization helper reaches macOS `ENAMETOOLONG` on an unchanged deeply nested historical evidence path in this managed worktree; that limitation does not relax the final Ubuntu materialization requirement. The source checks and admission unit contracts can execute locally, but full final-head CI remains required. The two Linux browser jobs must be rerun on their pinned image; a YAML comparison alone is not browser acceptance.

Local validation recorded the missing-checker and unsupported-browser-image assertions failing before implementation, then all 45 PR307 contract tests passing with zero failures/skips and empty stderr. JavaScript syntax and whitespace checks passed. This local result does not replace final-head GitHub execution.

The new hourly schedule is not live merely because this check passes. Production configuration, accumulated-release review, deployment, scheduler enablement, observed scheduled executions, GitHub health recovery, and any provider readiness remain separate evidence and authorization boundaries.
