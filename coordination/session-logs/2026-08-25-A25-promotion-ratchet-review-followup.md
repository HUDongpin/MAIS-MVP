# A25 follow-up — US California K-5 legacy Ratchet review

## Session custody

- Owner / lane: `A25` Git hygiene and release intake.
- Objective: provide the independent A25 authorization artifact for exactly one immutable historical candidate/live conflict in the Promotion Gate 30-day Ratchet.
- Branch: `codex/a25-promotion-ratio-evidence-20260825`.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a25-promotion-ratio-evidence-20260825`.
- Follow-up baseline SHA: `d41b11042d7ab7e793af8d3ce2f4433e3329889b`.
- Upstream at start: `origin/codex/a25-promotion-ratio-evidence-20260825` at the same SHA.
- Target PR: `pending` (composition PR owned by A23).
- Follow-up date and expected closeout date: `2026-08-25` Asia/Hong_Kong.
- Explicit authorization: exact-stage, commit, and push this two-file follow-up slice.

## Declared write scope

- `coordination/integration/evidence/legacy-us-ca-k5-a25-ratchet-review.v1.json`
- `coordination/session-logs/2026-08-25-A25-promotion-ratchet-review-followup.md`

No existing A25 preflight evidence, Manifest, Schema, Promotion Gate implementation, candidate content, live source, owner map, CI enforcement, or branch-protection setting is in this write scope.

## Preserve-first proof and plan

- Before editing, `git status --short --branch` reported the named branch tracking its expected upstream with no staged, unstaged, or untracked files.
- Local `HEAD` and upstream both resolved to the follow-up baseline SHA above.
- The applicable MAIS release-hygiene workflow was reviewed. This is a review-artifact slice only: no deploy, production publish, environment access, generated-content mixing, or destructive cleanup is authorized.
- Plan: write the exact five-field machine review, verify its raw digest and semantic boundary, inspect the two-file diff, exact-stage only these paths, commit, push, and prove clean local/remote alignment.

## Review decision and boundary

A25 approves the Ratchet baseline only for the exact historical conflict identified by all of the following immutable values:

- Package: `us-ca-k5-knowledge-point-practice-v1`.
- Owner authorization: `user-request-2026-08-25-promotion-shadow-v1`.
- Observed signature: `61204873801b869a7ce73b0e2363c61f045e360f1daa95442a51b43a830eb8f0`.
- Decision: `ratchet-baseline-approved`.

This review does not authorize any new or changed conflict. It does not extend the exception beyond the Gate-enforced continuous 30-day window, permit renewal, weaken digest or live-reachability anchoring, or convert a candidate package into a live-authorized package. Any changed manifest/content/anchor/signature, any additional candidate/live conflict, or an expired baseline remains a hard Gate failure.

## Verification and closeout

- Required raw SHA-256 of the exact pretty-printed JSON plus final LF: `e08590e2100c5a8136eeb942860db0bb130da9357e16de4b59b07ab17b7b076b`.
- JSON parse, exact ordered-field/value assertion, final-LF check, raw SHA-256 check, and scoped Git diff review are required before commit.
- Code, type, build, browser, and deployment tests are not applicable because this slice contains only a machine authorization record and its custody log.
- Final disposition: `reviewed commit`, subject to successful exact commit/push and clean local/remote readback recorded in the immutable parent handoff.
- Worktree lifecycle action: retain the named worktree clean for the still-pending A23 composition PR.
