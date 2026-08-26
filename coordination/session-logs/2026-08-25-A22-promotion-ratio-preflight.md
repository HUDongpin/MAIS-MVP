# A22 session — Grade 6 ratio Promotion Gate release-isolation preflight

## Session custody

- Owner / lane: `A22` production reliability and release engineering.
- Branch: `codex/a22-promotion-ratio-preflight-20260825`.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a22-promotion-ratio-preflight-20260825`.
- Baseline B0 SHA: `b6c7c347a49a813e454e707dd3c16399dcf29909`.
- Target PR: `pending` (composition PR owned by A23).
- Creation date: `2026-08-25` Asia/Hong_Kong.
- Expected closeout date: `2026-08-25` Asia/Hong_Kong.
- Declared write scope:
  - `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v1/inputs/evidence/a22-release-isolation.v1.json`
  - `coordination/session-logs/2026-08-25-A22-promotion-ratio-preflight.md`

## Clean authoring baseline proof

- Initial `git rev-parse HEAD`: `b6c7c347a49a813e454e707dd3c16399dcf29909`.
- Initial `git status --porcelain=v1 --untracked-files=all`: empty.
- The branch and worktree were created directly from B0 rather than from the dirty primary root or the uncommitted A23 implementation worktree.
- `npm run release:package-gate -- --json`: pass (`valid: true`, 8 release packages). Existing release and content-chain blocker-report states remain unchanged.
- Dependencies were reused through the ignored worktree-local `node_modules` symlink; no dependency or lockfile changed.

This proves only that the A22 evidence-authoring slice began on a clean B0 worktree. It is not the future Promotion Gate execution source, composition SHA, CI runner, independent replay checkout, or post-run clean proof.

## Historical A23 dirty observation boundary

The exact A23 v1 semantic contract names a `currentObservation`, but the bound values describe the uncommitted A23 implementation worktree before a composition commit:

- Evidence source path: `/Volumes/Starship/MAIS-MVP/.worktrees/a23-promotion-shadow-v1-20260825`.
- HEAD: `b6c7c347a49a813e454e707dd3c16399dcf29909`.
- Status entry count: `6`.
- Raw porcelain-v1 `-z` status SHA-256: `1d992eb2e1f951073d2bfcd1247f767c014a1cac661810fb675e43522bca42a1`.
- Clean: `false`; usable as execution source: `false`.

No independent `observedAt` timestamp is encoded in the v1 A22 semantic payload, so this session does not invent one. The digest/count was reproduced from the named A23 worktree during review, but it cannot be reconstructed from B0 alone because it describes untracked files outside the commit. It is therefore treated as a historical pre-commit snapshot and a protective blocker, not as current-clean proof and not as a condition that makes this evidence pass.

## Preflight policy and deployment checklist boundary

The preflight policy requires the eventual execution source to be a named Git worktree at a separately recorded committed execution SHA. It must have zero status entries before and after Shadow, retain the same HEAD throughout, and be checked out independently for A11 replay.

The Promotion Gate command is constrained to:

- Write only below a newly created OS temporary root.
- Perform no network, provider, database, production, Preview, or deployment operation.
- Snapshot source and forbidden paths before and after execution.
- Delete the three Shadow output kinds (`safe-card`, `practice`, `lesson`) during rollback rehearsal and prove they are absent.
- Remove the temporary root and prove no external side effects.

The deployment checklist remains intentionally incomplete:

- CI at the committed composition SHA: pending.
- Real Shadow execution: pending.
- A11 independent replay: pending.
- Runtime/source isolation pre/post proof: pending.
- Rollback rehearsal result: pending.
- Preview/deployment/live readback: outside scope and not attempted.

No checker-bundle digest or execution SHA is recorded here because neither is frozen in this preflight slice. Those values must be added only by a later immutable evidence version after the actual checker bundle and composition commit exist; this file must not guess or backfill them.

## A22 decision and boundaries

- Evidence phase: `preflight`.
- Preflight disposition: `awaiting-committed-clean-sha`.
- Evidence result `pass` means only that the versioned isolation policy is internally consistent and bound to B0, candidate digest `35c1d947840453fde081f80f32f1e0f47d080fdb6d2da2007f566084ebd780c7`, and checker version `promotion-gate-shadow-v1`.
- `shadowExecuted`: `false`.
- `rollbackRehearsed`: `false`.
- `replayCompleted`: `false`.
- `previewAttempted`: `false`.
- `deployAttempted`: `false`.
- `liveVerified`: `false`.
- No core, candidate, Manifest, Receipt, registry, runtime, CI workflow, deployment config, primary-root inventory, or production surface was edited.
- No Promotion Gate command, browser, Preview, provider, Vercel, database, deployment, or production/live write was attempted. The later authorized Git branch push is lifecycle transport, not Promotion Gate network execution or product release evidence.

## Machine verification and digests

- Current A23 `validatePromotionEvidence` accepted the exact A22 semantic contract against the three bound candidate artifacts.
- Raw evidence file SHA-256: `a9ed646f1e0c76b87c540fd941dc1202598e1388d28b794dfcdef949526c7855`.
- Stable-key canonical semantic payload SHA-256: `5f5ffecba953a9e62972eb15aabb7e7380848a4ee8ac38dd1b8d94bddf572ae1`.
- Independently recomputed aggregate candidate digest: `35c1d947840453fde081f80f32f1e0f47d080fdb6d2da2007f566084ebd780c7`.
- Recomputed raw-file and normalized-record SHA-256 values matched all three frozen candidate bindings.

## Closeout checklist

- [x] Clean B0 authoring baseline recorded separately from future execution proof.
- [x] Historical A23 dirty snapshot source, digest, count, and non-pass boundary recorded without inventing `observedAt`.
- [x] Clean pre/post, stable HEAD, temporary-root, rollback, and zero-side-effect requirements frozen.
- [x] Network/provider/database/production/Preview/deploy policy is fail-closed.
- [x] All six completion claims remain false.
- [x] Checker-bundle and execution-SHA fields deferred rather than guessed.
- [x] Machine evidence uses the current A23 `promotion-evidence.v1` and exact A22 semantic payload.
- [x] Raw evidence and semantic payload SHA-256 recorded.
- [ ] Exact commit, upstream, and post-commit clean status are recorded in the immutable parent handoff; a tracked file cannot include its own containing commit hash without changing that hash.
