# 2026-08-24 A16 — RSI-Lite calibration v2 candidate protocol

## Session slice

- Lane: A16 research and learning science.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a16-rsi-lite-calibration-f0-f2-20260823`
- Branch: `codex/a16-rsi-lite-calibration-f0-f2-20260823`
- Baseline: `b6c7c347a49a813e454e707dd3c16399dcf29909`
- Write scope: new `coordination/content-qa/rsi-lite-calibration-v2/` package and this session log.
- Frozen boundary: no edits to `rsi-lite-calibration-v1/` or protected F3 receipts/results/report.

## Owner decision captured

DeepSeek may serve as a machine quality reviewer. The new protocol keeps frozen MAIS questions as inputs and does not assign question generation to DeepSeek.

This decision does not authorize live provider calls, the formal 168-call core, 21 repeat calls, deployment, Git commit, or Git push.

## Work completed

- Added region-balanced 24 matched-triplet design: CA/HK/Mainland eight bundles each.
- Defined A′/B′/C0′ and omitted C.
- Fixed bilingual projection `type` preservation in v2.
- Added a closed per-role taxonomy and contextual `MISSING_OPTIONS` validation.
- Added deterministic F8 detection.
- Added surface, family, and accepted-code-plus-family scoring.
- Added stochastic request/response records and repeat-pair integrity checks.
- Added a 180-question independent natural-sample plan without a per-question human release gate.
- Proposed a separate $25 / 220-call / 40M-token owner envelope; proposal only.

## TDD evidence

- Initial RED: 20 tests, 0 passed, 20 failed because all v2 modules were absent.
- First GREEN: 20 tests, 20 passed.
- Code-vs-family RED: three targeted scoring assertions failed because the exact accepted-code layer was absent.
- Role-aggregation RED: one targeted protocol assertion failed because arm aggregation was not yet registered.
- Subsequent targeted tests passed after minimal implementations.

Final full verification and frozen-v1 integrity checks are recorded at handoff time; no completion claim is made in this entry before those commands run.

## Final verification evidence

- Fresh v2 suite: 23 tests passed, 0 failed.
- Syntax: all five production `.mjs` modules passed `node --check`.
- Offline design audit: 0 issues; 24 bundles; 72 package runs; 168 core calls; 21 repeat calls; proposed caps $25 / 220 attempts / 40,000,000 tokens; all live/formal/deploy/Git authorization flags false.
- Live-boundary scan: no `fetch`, API endpoint, API-key environment read, file writer, child-process runner, F3 runner, formal runner, or campaign runner pattern in v2 `.mjs` files (`rg` exit 1 means no matches).
- v1 focused regression: 31/32 passed inside the managed sandbox; the single C isolation test failed only because nested `sandbox-exec` was denied. The exact isolated test passed 1/1 when rerun outside the outer sandbox.
- Frozen F3 report SHA-256 remained `8477c1412adcb9ca162abc5b8e9875a4a8080fa5fcfd7234eb8e39f0f4918f7b`.
- Frozen scoring receipt remained `d38b7a749f957f553ec629ad5da0c3dd3820fa745482832a99b7b2f03751da9d`, 48 runs, complete.
- Frozen campaign receipt remained `b93ac1f8e42e197b70aea93bea401d5e05d5a3abf697e8fac31fc4c797831bfa`, 48 receipts, complete.
- No live provider call, secret read, deployment, Git staging, commit, or push occurred.

## Handoff boundary

Verdict: `candidate-only / protocol-built / live-execution-not-authorized`.

Next authorized work, if requested, is bundle construction and offline isomorphism validation in a separately declared A16/A18/A21 slice. Live DeepSeek execution requires a new explicit authorization and a newly signed budget envelope.
