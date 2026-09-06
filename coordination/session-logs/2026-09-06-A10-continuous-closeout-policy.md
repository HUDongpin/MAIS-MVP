# Continuous closeout policy integration — 2026-09-06

- Owner: A10/A25 convergence controller, task `01a075a1-07c9-7620-ac2c-2f1e9d330b78`.
- Branch: `codex/a10-lifecycle-closeout-docs-20260906`.
- Worktree: `/Volumes/Starship/MAIS的衍生文件/MAIS-dirty-convergence-wt` (existing integration worktree reused).
- Target PR: pending. Created: 2026-09-06. Expected closeout date: 2026-09-06, after this policy slice is merged and its source is accepted; reuse the integration worktree for the next reviewed slice.
- Baseline: main `1402ff96e61e994f3c2a834022ec3b7f2f00bfc3`.
- Scope: `AGENTS.md`, `CLAUDE.md`, this session log. No runtime or guard implementation change.

The primary-root history at `9fd2aabb1e1f0bddeebfbb597261ccae4373982e` contained continuous branch/worktree closeout clauses and lifecycle handoff fields that main had not yet received. This ports those owner-supplied coordination terms while retaining main's verified `/Volumes/Starship/MAIS-MVP` physical paths.

The policy records branch ownership and expected closeout, limits first upstream push to an already-authorized reviewable branch, retains open-PR and dirty sources, sends ownerless old branches for review, prohibits destructive shortcuts, and requires fresh post-cleanup counts and live-main verification. It preserves the distinction between mechanical guardrails and procedural requirements.

Acceptance of this policy is not acceptance or deletion authority for other historical source files. The broader convergence controller continues their individual evidence and semantic disposition records.
