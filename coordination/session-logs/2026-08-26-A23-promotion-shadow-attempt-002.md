# 2026-08-26 A23 Promotion Shadow Attempt 002

- Owner: A23 Integration and promotion lead
- Branch: `codex/a23-promotion-shadow-attempt-002-20260826`
- Worktree: `.worktrees/a23-promotion-shadow-attempt-002-20260826`
- Target PR: pending; the earlier attempt-001 package remains isolated in draft PR #154
- Created: 2026-08-26 (Asia/Hong_Kong)
- Expected closeout: 2026-08-27
- Baseline: `origin/main@7f7c4859877c9808fb4bdf98287bb5645b6e751b`
- Declared slice: compose the reviewed Promotion Gate v1 implementation onto the refreshed baseline, dispose the observed legacy candidate/live conflicts through their owning lanes, freeze a new candidate version and immutable attempt, execute and independently replay Shadow, and record fail-closed CI/release evidence.
- Hard boundary: no Preview, deploy, provider, database, production routing, live promotion, credential access, or `liveAllowed=true` action is authorized.
- Preserve-first intake: A25 refresh `promotion-attempt-002-intake-20260826-b` completed from the shared inventory root before this worktree was created; the root remains dirty and is not an implementation or evidence source.

## Initial state

- Clean worktree created directly from the refreshed remote `main` SHA.
- Attempt 001 remains immutable and terminal `repair_required`; its manifest, receipt, and semantic digest will not be reused as attempt 002.
- Main branch protection currently requires only `validate`; `promotion-shadow-gate` is implemented on the earlier draft branch but is not yet a required check.

## Handoff / closeout

- Pending.
