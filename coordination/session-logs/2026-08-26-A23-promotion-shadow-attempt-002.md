# 2026-08-26 A23 Promotion Shadow Attempt 002

- Owner: A23 Integration and promotion lead
- Branch: `codex/a23-promotion-shadow-attempt-002-20260826`
- Worktree: `.worktrees/a23-promotion-shadow-attempt-002-20260826`
- Target PR: draft PR #162 (`https://github.com/HUDongpin/MAIS-MVP/pull/162`); the earlier attempt-001 package remains isolated in draft PR #154
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
- The reviewed attempt-001 implementation merged cleanly onto the refreshed baseline. The first current-main core run passed 118/120 tests; the two expected fail-closed assertions expose runtime-graph growth (3666 to 3692 covered files) and candidate-like discovery growth (36 to 37 packages). No frozen golden was relaxed.

## Handoff / closeout

- Runtime de-reach owner slices were composed through target baseline `d7ce01d9406d717451b7c43b6d7c48d70fd99ec1`; the 492-question package and 14 other unapproved historical candidates are no longer reachable from the registered runtime graph.
- Three remaining candidate/live correlations are exact approved projections (BNU high, BNU junior, and California middle-school lessons) with distinct approval records; the v2 registry will bind those bytes and fail on drift.
- A fresh v2 ratios candidate (`us-ca-math-rag-v2-g6-ratios-v2-candidate`) and independent A21/A18/A04/A05/A24 evidence were composed. Candidate digest: `c83c47392c79256ee47726dafe3c53b72e5e7454edcb313a421eb3b32066cbf6`.
- The additive v2 checker, schemas, CLI core, pure Shadow adapter, receipt digest rules, isolation/rollback code, and first security test set are implemented under `coordination/integration/v2/`. It has no Preview, deploy, provider, database, or live command.
- Pending: immutable checker release ledger, 18-entry resolution registry, A23/A11/A22/A25 evidence, manifest freeze, real Shadow run, independent replay, CI enforcement, and final closeout.
