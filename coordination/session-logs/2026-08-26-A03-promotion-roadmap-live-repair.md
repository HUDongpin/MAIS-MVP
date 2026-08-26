# 2026-08-26 A03 Promotion Roadmap Live Repair

- Owner: A03 Curriculum roadmap lead
- Branch: `codex/a03-promotion-roadmap-live-repair-20260826`
- Worktree: `.worktrees/a03-promotion-roadmap-live-repair-20260826`
- Target PR: compose into draft PR #162 (`https://github.com/HUDongpin/MAIS-MVP/pull/162`)
- Created: 2026-08-26 (Asia/Hong_Kong)
- Expected closeout: 2026-08-27
- Baseline: `codex/a23-promotion-shadow-attempt-002-20260826@4ae168b45ad8a72bd65353dafaf9b5205d7497df` (`origin/main@7f7c4859877c9808fb4bdf98287bb5645b6e751b` plus Promotion Gate, A04, and A05 remediation slices)
- Declared slice: remove HJB primary and high candidate-backed topics from the live roadmap graph while retaining the independently approved HJB junior route.
- Hard boundary: no candidate rewrite, live promotion, Preview, deploy, provider, database, credential, production write, or `liveAllowed=true` action is authorized.
- Preserve-first intake: A25 refresh `promotion-attempt-002-intake-20260826-b` completed before the parent A23 composition; the dirty shared root is not an implementation or evidence source.

## Initial state

- A04 removed HJB primary/high from public question/topic aggregates, and A05 removed their live lesson seeds. `data/mainlandHjbRoadmap.ts` still imported both candidate-backed topic modules, preserving a separate runtime path that must fail closed.

## Handoff / closeout

- Removed both HJB primary and HJB high topic/metadata imports from `data/mainlandHjbRoadmap.ts`; the live HJB roadmap now derives only from the independently approved HJB junior V2 topic set.
- `npm ci` completed (dependency audit separately reports 1 moderate and 4 high advisories; no dependency mutation was attempted).
- `npm run type-check` passed.
- A direct TypeScript runtime inspection reported exactly 22 HJB junior roadmap topics and zero primary or high topics.
- Candidate source files were not modified. Broad roadmap assertion updates remain A11-owned and must prove both absence of retired candidate routes and retention of the junior route.
- No live promotion, Preview, deployment, provider, database, credential, or production write occurred; `liveAllowed` remains false.
