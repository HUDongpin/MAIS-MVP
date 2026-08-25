# A23 Promotion Gate plan evidence

## Session custody

- Owner / lane: `A23` integration and promotion.
- Branch: `codex/a23-promotion-plan-evidence-20260825`.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a23-promotion-plan-evidence-20260825`.
- Exact baseline: `beeba7d46d3856ec35bd1c497653c48bf50e654b`.
- Target PR: `pending` (`codex/a23-promotion-shadow-composition-20260825`).
- Creation date: `2026-08-25` Asia/Hong_Kong.
- Expected closeout date: `2026-08-25` Asia/Hong_Kong.

## Scope and decision boundary

- Added the machine-verifiable A23 Shadow operation plan for Promotion Unit `us-ca-math-rag-v2-g6-ratios-v1`.
- Bound the exact candidate digest `35c1d947840453fde081f80f32f1e0f47d080fdb6d2da2007f566084ebd780c7`, source commit, target baseline, Shadow-only authorizations, three temporary DTO outputs, and delete-and-verify rollback.
- Added A23 review of exactly the pre-authorized 492-question legacy conflict signature. This review does not authorize any new or changed conflict and does not extend the fixed expiry.
- No Manifest, Receipt, lifecycle state, candidate source, live aggregator, application, deployment, provider, database, credential, or branch-protection change is included.

## Verification

- A23 evidence raw SHA-256: `c594da73cbd82ff6dec9af425bb3bdb6eeec5b14466d6073e70603b51c2febbb`.
- A23 evidence canonical semantic SHA-256: `942d5a58fa64a9c296794e6ea49ea9c6ea9e2a11383346521304bf4a0570ff42`.
- Legacy review raw SHA-256: `414a3672b3770a4bbd993d756f2fb183390041bb8f620b8b5e7c715ece588b4f` (exact expected binding).
- The current A23 `validatePromotionEvidence` accepted the exact A23 semantic contract against the frozen candidate/artifact/lifecycle/authorization plan; its trust boundary remains a hash/path-bound self-declaration rather than human authentication.
- Exact JSON parsing, LF termination, byte equality with the independently prepared A23 draft, and `git diff --check` passed before staging.

## Handoff boundary

- Final action: reviewed commit for later `reviewedCommit` binding in the immutable Pilot Manifest.
- The actual Shadow result remains unproven until A23 executes from a later clean, committed phase-1 composition SHA and A11 independently replays it.
