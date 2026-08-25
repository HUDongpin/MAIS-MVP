# 2026-08-26 A04 Promotion Legacy Live Repair

- Owner: A04 Practice lead
- Branch: `codex/a04-promotion-legacy-live-repair-20260826`
- Worktree: `.worktrees/a04-promotion-legacy-live-repair-20260826`
- Target PR: compose into draft PR #162 (`https://github.com/HUDongpin/MAIS-MVP/pull/162`)
- Created: 2026-08-26 (Asia/Hong_Kong)
- Expected closeout: 2026-08-27
- Baseline: `codex/a23-promotion-shadow-attempt-002-20260826@2f6b6d192d024c2e6a16811f81ca7e4faa7e4375` (`origin/main@7f7c4859877c9808fb4bdf98287bb5645b6e751b` plus the reviewed Promotion Gate composition)
- Declared slice: remove live reachability for candidate-only or incompletely approved practice packages identified by the fail-closed Promotion Gate audit; retain only exact owner-approved runtime packages; add focused regression assertions.
- Explicit package scope: mainland BNU primary v1/v2, mainland HJB primary v1, mainland HJB high v1/v2/v3/v4, Arkansas G6-G12 v1, Florida middle-school v1, and the California 492-question knowledge-point package.
- Hard boundary: candidate source packages remain immutable; no content rewrite, live promotion, Preview, deploy, provider, database, credential, production write, or `liveAllowed=true` action is authorized.
- Preserve-first intake: A25 refresh `promotion-attempt-002-intake-20260826-b` completed before the parent A23 worktree was created; the shared root is not used as an implementation or evidence source.

## Initial state

- The worktree was created cleanly from the exact A23 composition commit.
- Promotion Gate discovery on current `main` reports sixteen unregistered candidate/live conflicts plus one opaque conflict and the known 492-question conflict. This slice addresses A04-owned runtime reachability; exact approved exceptions remain subject to A18/A23 digest-bound resolution records.

## Handoff / closeout

- Pending.
