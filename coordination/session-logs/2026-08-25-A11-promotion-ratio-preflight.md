# A11 session — Grade 6 ratio Promotion Gate preflight evidence

## Session custody

- Owner / borrowed lane: `A11` QA and release quality.
- Branch: `codex/a11-promotion-ratio-preflight-20260825`.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a11-promotion-ratio-preflight-20260825`.
- Baseline SHA: `b6c7c347a49a813e454e707dd3c16399dcf29909`.
- Target PR: `pending` (composition PR owned by A23).
- Creation date: `2026-08-25` Asia/Hong_Kong.
- Expected closeout date: `2026-08-25` Asia/Hong_Kong.
- Declared write scope:
  - `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v1/inputs/evidence/a11-targeted-regression.v1.json`
  - `coordination/session-logs/2026-08-25-A11-promotion-ratio-preflight.md`

## Baseline proof

- Initial `git rev-parse HEAD`: `b6c7c347a49a813e454e707dd3c16399dcf29909`.
- Initial `git status --porcelain=v1 --untracked-files=all`: empty.
- `npm run release:package-gate -- --json`: pass (`valid: true`, 8 release packages). Existing `regression-evidence-routing-A11` and `content-rag-candidate-chain` packages remain baseline `blocker report` states.
- Dependencies were reused through the ignored worktree-local `node_modules` symlink; no dependency or lockfile changed.

## Testing strategy and evidence levels

This session separates the Promotion Gate test pyramid so that a lower-level result cannot satisfy a higher-level claim:

| Level | Required coverage | Current status | Claim boundary |
| --- | --- | --- | --- |
| Unit / contract | Schema, state transitions, evidence bindings, path safety, digest drift, rollback, live reachability, forbidden diffs, legacy Ratchet, and negative cases | Required by `npm run test:promotion-gate`; not executed as final evidence in this preflight slice | A23 implementation tests cannot substitute for A11 independent replay |
| Integration / replay | Validate the real Manifest, execute two clean Shadow runs with distinct run IDs, compare semantic Receipt digests, and verify both Receipts | Required after the committed composition SHA exists | This preflight contains no Receipt and makes no replay-complete claim |
| E2E / live regression | Verify unchanged live Practice/Lesson/RAG behavior at the exact execution baseline if and when the later plan authorizes it | Not completed | No Preview, deployment, production readback, or live-app proof |

Coverage target for the eventual replay is exact, not percentage-based: all eight ordered hard checks must return `pass`; two `promotion-receipt.v1` outputs must verify; selected candidate IDs must remain unreachable from registered live entrypoints; and the legacy Ratchet must pass.

## Historical static preview audit

The tracked historical report is:

`coordination/content-qa/us-ca-math-rag-v2-candidate/s11-candidate-preview-smoke.json`

Read-only verification at the frozen baseline found:

- Raw file SHA-256: `653c9f6c15d7ec604aa55a4231178d7f45fea98d40cb7c4683c9731e21a1eca9`.
- Reported status: `pass`.
- Reported preview contents: 2 practice cards and 2 lesson cards.
- Reported console errors: 0; page errors: 0.
- `liveAppRegression`: `false`.
- Referenced HTML `coordination/content-qa/us-ca-math-rag-v2-candidate/review/index.html`: absent.
- Referenced PNG `coordination/content-qa/us-ca-math-rag-v2-candidate/review/s11-candidate-preview-smoke.png`: absent.

Because the HTML and screenshot are absent, the old JSON cannot be visually replayed or independently corroborated. Its own boundary also says it is a static candidate preview and that live app regression remains pending. It is retained only as historical context and is explicitly `usableAsFinalPilotProof: false`.

## Frozen preflight and post-run contract

Before any A11 completion claim, the composition SHA must provide all of the following:

1. `npm run test:promotion-gate` passes the synthetic and real-shaped test suite.
2. The real Pilot Manifest validates.
3. A real Shadow run completes in a clean named worktree.
4. A11 independently repeats the run at the exact execution commit.
5. Both Receipts pass `verify-receipt`.
6. Both Receipts have distinct run IDs and the same `semanticReceiptDigest`.
7. Raw Receipt digest inequality is not required because volatile metadata may be controlled; semantic equality is the required reproducibility invariant.
8. The ordered hard checks are exactly: `manifest-contract`, `candidate-integrity`, `evidence-currentness`, `mapping-compatibility`, `rollback-rehearsal`, `live-reachability`, `forbidden-diff`, and `legacy-ratchet`.
9. Selected candidate reachability is `false`, and legacy Ratchet result is `pass`.

The legacy expectation was independently read from `data/generated-content/us-ca-k5-knowledge-point-practice-v1/question-pack.json`: 492 questions and 492 unique IDs.

## A11 preflight decision and boundaries

- Evidence phase: `preflight`.
- Evidence result: `pass` means this bounded test/replay contract is internally consistent and bound to the frozen candidate digest; it does not mean the tests or replay have already run.
- `finalReplayCompleted`: `false`.
- `liveAppRegressionCompleted`: `false`.
- `previewVerified`: `false`.
- `deploymentVerified`: `false`.
- A11 must not reuse A23 self-reported results as independent proof.
- No core, candidate, Manifest, Receipt, live registry, root inventory, test implementation, deployment configuration, or production surface was edited.
- No browser, Preview, provider, Vercel, database, network, deployment, or live write was attempted.

## Machine verification and digests

- Current A23 `validatePromotionEvidence` accepted the exact A11 semantic contract against the three bound candidate artifacts.
- Raw evidence file SHA-256: `c2eee55f08ec3d63a1549565be3a84ca3769a746524ca502f90a2db0a1190bae`.
- Stable-key canonical semantic payload SHA-256: `cf60d0bdb8e23915cc047963ae8a1f8c28de6aca7c4337bd41bae1357c138e66`.
- Independently recomputed aggregate candidate digest: `35c1d947840453fde081f80f32f1e0f47d080fdb6d2da2007f566084ebd780c7`.
- Recomputed raw-file and normalized-record SHA-256 values matched all three frozen candidate bindings.

## Closeout checklist

- [x] Historical static report digest and fields verified.
- [x] Missing referenced HTML and PNG confirmed.
- [x] Eight-check replay boundary and two-Receipt requirement frozen.
- [x] Legacy 492 question / 492 unique-ID expectation independently verified.
- [x] All completion claims remain false.
- [x] Machine evidence uses the current A23 `promotion-evidence.v1` and exact A11 semantic payload.
- [x] Raw evidence and semantic payload SHA-256 recorded.
- [ ] Exact commit, upstream, and post-commit clean status are recorded in the immutable parent handoff; a tracked file cannot include its own containing commit hash without changing that hash.
