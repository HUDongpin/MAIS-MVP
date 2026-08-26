# A25 session — Grade 6 ratio Promotion Gate release-intake evidence

## Session custody

- Owner / lane: `A25` Git hygiene and release intake.
- Explicitly authorized operations: create this branch/worktree, write only the two declared files, exact-stage, commit, and push this review slice.
- Branch: `codex/a25-promotion-ratio-evidence-20260825`.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a25-promotion-ratio-evidence-20260825`.
- Baseline SHA: `b6c7c347a49a813e454e707dd3c16399dcf29909`.
- Target PR: `pending` (composition PR owned by A23).
- Creation date: `2026-08-25` Asia/Hong_Kong.
- Expected closeout date: `2026-08-25` Asia/Hong_Kong.
- Declared write scope:
  - `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v1/inputs/evidence/a25-release-intake.v1.json`
  - `coordination/session-logs/2026-08-25-A25-promotion-ratio-evidence.md`

## Baseline proof

- Initial `git rev-parse HEAD`: `b6c7c347a49a813e454e707dd3c16399dcf29909`.
- Initial `git status --porcelain=v1 --untracked-files=all`: empty.
- `npm run release:package-gate -- --json`: pass (`valid: true`, 8 release packages). The existing `content-rag-candidate-chain` remains a `blocker report`; this session does not upgrade it to a release-ready state.
- Dependencies were reused through the ignored worktree-local `node_modules` symlink; no dependency or lockfile changed.

## Read-only intake verification

### Selected candidate source

The three exact candidate pathspecs were checked inside `/Volumes/Starship/MAIS-MVP/.worktrees/a23-promotion-shadow-v1-20260825`:

- All three resolve through `git ls-files --error-unmatch`.
- Scoped `git status --porcelain=v1 --untracked-files=all -- <three pathspecs>` is empty.
- Therefore the selected candidate sources are tracked and have zero staged, unstaged, or untracked changes at A23 HEAD `b6c7c347a49a813e454e707dd3c16399dcf29909`.
- This narrow pathspec fact does not make the whole A23 implementation worktree clean.

### A23 implementation worktree

- HEAD: `b6c7c347a49a813e454e707dd3c16399dcf29909`.
- Full porcelain-v1 `-z` status entry count: `6`.
- Raw status SHA-256: `1d992eb2e1f951073d2bfcd1247f767c014a1cac661810fb675e43522bca42a1`.
- The six entries are the five Promotion Gate implementation/schema files and the A23 session log listed in the machine evidence; all were untracked at this preflight observation.
- Decision: `wholeWorktreeReleaseSourceEligible: false`.

### Primary dirty root historical strict-gate observation

The machine payload preserves the A23 startup observation rather than pretending it is a clean or current release source:

- Snapshot time: `2026-08-24T17:25:23.195Z`.
- Branch / HEAD: `codex/edulab-mais` / `a444b0dcc6a86b7a679a48fe14703c98aa0f0cf6`.
- Dirty-map status signature: `48c14842fbbe976ca2471df3ee14233705aeaffb919e7edc60f95269834c7bc1`.
- Raw status SHA-256: `3a423cca663282895e47341ca316d0eea356d1e2b517310e5e92bc0165fa2f67`.
- Counts: 52 collapsed entries, 106 expanded entries, 2 tracked modifications, 104 untracked files, 56 strict unmapped entries, 0 ambiguous owner entries, and 0 secret-quarantine entries.
- The read-only `--assert-current --max-age-minutes 60 --json` invocation exited `1` with `strict-unmapped-owner-entries` during that observation.
- Source corroboration: the ignored `coordination/release-intake/latest-A25-dirty-tree-map.json` retains the same time, reason, status signature, and counts; the A23 session log records the same protective failure.

A later read-only root status check no longer had the historical raw digest and reported 108 collapsed entries. No new dirty-map report was generated in this A25 session. The historical observation is therefore an immutable preflight fact, not a claim that the root has stayed unchanged or become eligible. The root remains forbidden as a release or Receipt execution source.

## A25 decision and boundaries

- Evidence phase: `preflight-observation`.
- Review package disposition: `candidate-only-shadow-review`.
- Release disposition: `blocked-until-committed-clean-worktree`.
- Selected candidate pathspecs may be consumed from the frozen baseline, but neither the dirty primary root nor the uncommitted A23 implementation worktree may supply release or Receipt proof.
- A future A23 composition run must use a new named clean worktree at its committed execution SHA and independently prove clean pre/post status.
- No staging or mutation occurred outside this two-file A25 slice.
- No build, Preview, Vercel command, deploy, live readback, provider call, database operation, credential access, destructive cleanup, or production write occurred.
- This evidence is not A18 content approval, A11 replay evidence, A22 clean-execution proof, release authorization, or live authorization.

## Machine verification and digests

- Current A23 `validatePromotionEvidence` accepted the exact A25 semantic contract against the bound candidate artifacts.
- Raw evidence file SHA-256: `b39a77850ba7514dc936322167f0f354b0e2f707334bba803853fb8bccb9a102`.
- Stable-key canonical semantic payload SHA-256: `00c37fd79832c87e0412b0a3e929e2efc69aa50424e33e292e0ffae101ee6b18`.
- Independently recomputed aggregate candidate digest: `35c1d947840453fde081f80f32f1e0f47d080fdb6d2da2007f566084ebd780c7`.
- Recomputed raw-file and normalized-record SHA-256 values matched all three frozen candidate bindings.

## Closeout checklist

- [x] Exact baseline and initial clean status recorded.
- [x] Candidate pathspec cleanliness verified separately from whole-worktree cleanliness.
- [x] A23 implementation status count and digest reproduced.
- [x] Primary-root historical strict-gate facts and later drift boundary recorded.
- [x] Machine evidence uses the current A23 `promotion-evidence.v1` and exact A25 semantic payload.
- [x] Raw evidence and semantic payload SHA-256 recorded.
- [ ] Exact commit, upstream, and post-commit clean status are recorded in the immutable parent handoff; a tracked file cannot include its own containing commit hash without changing that hash.
