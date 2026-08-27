# Session log — California Codex-viz replacement (Claude)

- **Owner:** Dongpin HU (Peter), implemented by Claude (Fable 5) session
- **Branch:** `claude/ca-codex-viz-replacement`
- **Worktree:** `/Volumes/Starship/MAIS-claude-caviz-wt` (node_modules symlinked from root)
- **Base:** `origin/main` @ `b6c7c347a4` (Merge PR #133)
- **Target PR:** https://github.com/HUDongpin/MAIS-MVP/pull/143 (opened 2026-08-25)
- **Created:** 2026-08-25
- **Expected closeout:** 2026-09-01 (worktree removed same day the PR lands)

## Status (2026-08-25, end of implementation session)

Phases 1, 2a, and 4 are implemented, verified, and pushed as three commits
(`4518cfe20d` embed flip, `64abafcaf1` premium-3D descope, `633e5cfa1e`
truthfulness + plan doc). Gates: `tsc --noEmit` clean, `test:components` 384
pass, `test:visualizations` 163 pass, `test:signature-labs` green,
`audit:zh-hans:strict` exit 0; three/ suite compared byte-identical-harness
against a pristine origin/main baseline (144/6 → 146/5, no new failures, one
pre-existing failure healed). Live proof on the worktree dev server
(`mais-dev-claude-caviz-wt`, port 3430): the 1-A.1 lesson embed renders
AssociativeAdditionLab on canvas, and the retired s2-ch02 3D URL lands on the
hub with `?lab=us-ca-math-s2-chapter-02`.

Phases 2b/3 (new bench authoring) are follow-on `claude/bench-*` branches per
the plan's status table.

## Scope

Implements "Claude's Plan on Replacing Codex's Visualization Labs.md" (repo root, 2026-08-25):

1. **Phase 1** — flip the 76 US California lesson embeds from the Codex
   `ConfiguredVisualizationLab` template to the topic's Claude signature bench
   (`lessonVisualizationRegistry["signature-lab"]` in `components/lesson/LessonView.tsx`).
2. **Phase 2a** — descope California from the premium-3D launch registries, with
   the mechanically-required `threeDLaunchCoverageRequirement` band adjustment and
   a redirect for the 12 retired direct-route URLs.
3. **Phase 4** — truthfulness pass: student-note/safeguard copy describes what
   actually renders; retire dead Codex CA artifacts; update `signature/COVERAGE.md`.

Owner decisions applied (plan §5, recommendations adopted by "implement this plan"):
EN-only benches accepted inside localized chrome; lesson embeds show the primary
bench only; premium-3D CA routes descope now, Claude 3D benches rebuilt selectively later.

Out of this branch's scope: Phase 2b/3 new bench authoring (each new bench is its
own `claude/bench-*` branch per the plan).

## Constraints honored

- One session = this worktree = this branch; integration root untouched.
- No `git add -A`; only files authored this session are staged.
- `package.json` scripts frozen — no new npm scripts.
- A06/A22 evidence boundary untouched (`archive/a06-ca-visualization-labs-loop-wip-20260823`,
  residual `/Volumes/Starship/MAIS-ca-viz-labs-wt`, consumed browser receipt).
