# 2026-08-26 A05 Promotion Legacy Live Repair

- Owner: A05 Lesson lead
- Branch: `codex/a05-promotion-legacy-live-repair-20260826`
- Worktree: `.worktrees/a05-promotion-legacy-live-repair-20260826`
- Target PR: compose into draft PR #162 (`https://github.com/HUDongpin/MAIS-MVP/pull/162`)
- Created: 2026-08-26 (Asia/Hong_Kong)
- Expected closeout: 2026-08-27
- Baseline: `codex/a23-promotion-shadow-attempt-002-20260826@1ee83f20c5a6a74731d234acc990e1bb6f315f97` (`origin/main@7f7c4859877c9808fb4bdf98287bb5645b6e751b` plus Promotion Gate and A04 remediation slices)
- Declared slice: remove lesson/runtime reachability for candidate-only or non-currently-certified BNU primary, HJB primary/high, Arkansas middle-school, California K-G5/micro-lesson, old California review-textbook, and Florida middle-school packages; preserve immutable candidate source files and already-approved California middle-school v2 content.
- Hard boundary: no candidate content rewrite, live promotion, Preview, deploy, provider, database, credential, production write, or `liveAllowed=true` action is authorized.
- Preserve-first intake: A25 refresh `promotion-attempt-002-intake-20260826-b` completed before the parent A23 composition; the dirty shared root is not an implementation or evidence source.

## Initial state

- The worktree was created cleanly from the exact post-A04 A23 composition commit.
- A18's exact-byte audit found current K-G5 textbook drift, no Arkansas/Florida final approval, HJB publication withheld, and no machine-verifiable micro-lesson projection. These packages must be absent from live lesson entrypoints until a new exact promotion closes them.

## Handoff / closeout

- Removed candidate-backed lesson seeds from the live lesson aggregate for BNU primary, HJB primary/high, Arkansas middle school, and Florida middle school. Approved BNU high/junior and HJB junior lesson paths remain unchanged.
- Removed all runtime imports and projections for the drifted California K-G5 textbook candidate and the non-machine-verifiable micro-lesson candidate. Their topic, coverage, and lesson-seed compatibility exports are explicitly empty; candidate artifacts remain preserved for future exact review.
- Repointed the noindex California middle-school review route from the unapproved v1 review package to the exact approved v2 replacement component already used by the student and canonical lesson routes.
- Verification:
  - `npm ci` completed (dependency audit separately reports 1 moderate and 4 high advisories; no dependency mutation was attempted).
  - `npm run type-check` passed.
  - Loading the compiled production lesson aggregate produced 251 live seeds, including 64 California seeds, and loaded none of the forbidden BNU-primary, HJB-primary/high, Arkansas-textbook, Florida-textbook, California K-G5 textbook, or California micro-lesson modules.
  - `npm run test:mvp` completed 30/32 tests; the two red tests explicitly encode the retired Arkansas-live and old global illustration-count assumptions. They are handed to A11 for independent update and are not represented as a green gate.
- Remaining composition dependencies: A03 must remove HJB primary/high roadmap imports; A12 must remove dynamic candidate question loaders and stale California demo IDs; A11 must replace old live assertions with fail-closed absence and approved-content retention checks.
- No generated candidate JSON, approved v2 lesson JSON, live credentials, provider, deployment, database, or production state was modified. `liveAllowed` remains false.
