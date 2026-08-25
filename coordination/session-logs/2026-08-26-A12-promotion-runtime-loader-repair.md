# 2026-08-26 A12 Promotion Runtime Loader Repair

- Owner: A12 Backend/API platform lead
- Branch: `codex/a12-promotion-runtime-loader-repair-20260826`
- Worktree: `.worktrees/a12-promotion-runtime-loader-repair-20260826`
- Target PR: compose into draft PR #162 (`https://github.com/HUDongpin/MAIS-MVP/pull/162`)
- Created: 2026-08-26 (Asia/Hong_Kong)
- Expected closeout: 2026-08-27
- Baseline: `codex/a23-promotion-shadow-attempt-002-20260826@79396bb941758e28b5196eddce2be9ef75d3d671` (`origin/main@7f7c4859877c9808fb4bdf98287bb5645b6e751b` plus Promotion Gate and A04/A05/A03 remediation slices)
- Declared slice: remove backend dynamic-loader reachability for candidate-only BNU primary, HJB primary/high, and Florida question packages; replace the seeded California demo assessment's candidate question IDs with exact IDs from the retained hand-checked CCSS live practice package.
- Hard boundary: no candidate rewrite, live promotion, Preview, deploy, provider, database, credential, production write, or `liveAllowed=true` action is authorized.
- Preserve-first intake: A25 refresh `promotion-attempt-002-intake-20260826-b` completed before the parent A23 composition; the dirty shared root is not an implementation or evidence source.

## Initial state

- Static aggregates and lesson/roadmap paths have been de-reached by owner slices, but `lib/server/questionStore.ts` still contains literal dynamic imports for the removed packages, and the teacher-operations seed still names four IDs from the 492-question candidate-only package.

## Handoff / closeout

- Pending.
