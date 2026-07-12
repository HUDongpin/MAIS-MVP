# 2026-06-26 A25 Worktree Disposition Matrix

- Agent: A25 git hygiene and release intake
- Purpose: Turn remaining non-root worktrees into explicit disposition decisions.
- Baseline root: `main` at `cef544e0`

## Summary

After stale registry prune, the Git worktree registry contains 4 valid worktrees and 0 prunable entries.

| Worktree | State | Evidence | Recommended disposition |
| --- | --- | --- | --- |
| `/Users/dongpinhu/Desktop/MAIS-MVP` | Dirty root integration inventory | 1329 expanded dirty entries in latest A25 map | Do not release or develop from root. Process owner pathspecs. |
| `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/visualization-production-release` | Dirty active review required | 16 dirty entries; branch is 12 commits behind `main` | A06/A22 decide: package visual reset/theme changes, archive patch, or approve discard. |
| `/Users/dongpinhu/Desktop/MAIS-MVP-worktrees/MAIS-MVP-california-practice-beta-clean` | Clean branch diverged review | `fb6776be` only ahead commit; behind `main` by 12 | Treat as large A21/A18/A04/A22 content/release candidate, not a casual merge. |
| `/Users/dongpinhu/Desktop/MAIS-MVP-worktrees/s22-release-hygiene-2026-06-15` | Clean branch diverged review | `6fc558bd` only ahead commit; behind `main` by 12 | Treat as A22/A10 release-tooling PR/archive candidate. |

## Dirty Visualization Worktree

Branch: `codex/visualization-production-release`

Evidence archive:

- `coordination/release-intake/2026-06-26-A25-worktree-evidence-visualization-production-release/`
- `tracked-diff.patch`: binary-safe patch for tracked changes.
- `untracked-files.tar.gz`: archive of the 15 untracked files.
- `untracked-manifest.json`: size and SHA-256 manifest for untracked payload.

Tracked diff:

```text
components/visualizations/FunctionGraphExplorer.tsx | 194 ++++++++++++++++++---
1 file changed, 165 insertions(+), 29 deletions(-)
```

Dirty status:

```text
 M components/visualizations/FunctionGraphExplorer.tsx
?? components/visualizations/VisualizationResetButton.tsx
?? components/visualizations/visualizationTheme.ts
?? coordination/release-intake/2026-06-16-S22-visualization-production-release-intake.md
?? coordination/session-logs/2026-06-14-S06-full-dom-semantic-mark-scan.cjs
?? coordination/session-logs/2026-06-14-S06-visualization-enterprise-gate-manifest.json
?? coordination/session-logs/2026-06-14-S06-visualization-lab-health-index.json
?? coordination/session-logs/2026-06-16-S22-clean-release-candidate-targeted-quadratic-boundary-scan.csv
?? coordination/session-logs/2026-06-16-S22-clean-release-candidate-targeted-quadratic-boundary-scan.json
?? coordination/session-logs/2026-06-16-S22-clean-release-candidate-targeted-quadratic-boundary-scan.md
?? coordination/session-logs/2026-06-16-S22-visualization-production-release.md
?? scripts/deploy-vercel-preview.mjs
?? scripts/deploy-vercel-production.mjs
?? scripts/prepare-vercel-staging.mjs
?? scripts/release-env-guard.mjs
?? tsconfig.next.json
```

Recommended next action:

- A06 reviews `FunctionGraphExplorer.tsx`, `VisualizationResetButton.tsx`, and `visualizationTheme.ts`.
- A22/A10 review release scripts/config entries if they are still needed; otherwise exclude them from visualization packaging.
- Do not merge this branch as-is because it is 12 commits behind `main` and mixes visualization UI with release tooling artifacts.
- Because the evidence archive now exists, A06/A22 can safely compare, recover, or archive this worktree before any owner-approved cleanup.

## California Practice Beta Clean Worktree

Branch: `codex/california-practice-beta-clean`

Evidence archive:

- `coordination/release-intake/2026-06-26-A25-branch-evidence-california-practice-beta-clean/`
- Full patch intentionally omitted because the branch head commit changes 253,340 lines.
- Use the branch/commit itself or an archive tag as the source of truth if the owner chooses to preserve it.

Ahead commit:

```text
fb6776be Deploy California math practice beta from clean source
```

Diff profile against `main`:

```text
24 files changed, 253322 insertions(+), 18 deletions(-)
```

Notable scope:

- Very large generated content packages under `data/generated-content/`.
- California question/topic/runtime content under `data/usCalifornia*`.
- Release/tooling changes touching `.vercelignore`, `next.config.ts`, `package.json`, `playwright.config.ts`, and staging scripts.
- E2E coverage including `tests/e2e/california-student-assignment-flow.spec.ts`.

Recommended next action:

- A21/A18 validate generated-content provenance and curriculum QA status.
- A04/A03/A05 review live runtime content integration surfaces.
- A22 validates release-size and clean-source deployment impact.
- Do not merge as one broad dirty-root closure package without content QA and release gates.

## S22 Release Hygiene Clean Worktree

Branch: `codex/s22-release-hygiene-2026-06-15`

Evidence archive:

- `coordination/release-intake/2026-06-26-A25-branch-evidence-s22-release-hygiene-2026-06-15/`
- Full patch is included because the branch head commit changes 1,483 lines.

Ahead commit:

```text
6fc558bd Add release hygiene guards and staging workflow
```

Diff profile against `main`:

```text
11 files changed, 1475 insertions(+), 8 deletions(-)
```

Notable scope:

- `.gitignore`, `.vercelignore`, `next.config.ts`, `package.json`, `playwright.config.ts`.
- Release scripts: cleanup, preview deploy, production deploy, staging preparation, env guard.
- `tsconfig.next.json`.

Recommended next action:

- A22/A10 compare this branch against current dirty-root release tooling files.
- If still applicable, turn it into a focused release-tooling PR or archive tag.
- Do not delete the branch until A22 confirms whether current production/staging scripts supersede it.

## Lifecycle Policy

- Every active worktree must have an owner ID, branch name, creation/review date, and intended final state.
- Temporary release verification worktrees should expire within 7 days unless renewed.
- Active feature worktrees should be reviewed within 14 days.
- Diverged clean worktrees older than 30 days should become PRs, archive tags, or owner-approved retirements.
- A25 should run `git worktree list --porcelain`, `git worktree prune --dry-run --verbose`, and `node coordination/release-intake/worktree-hygiene-dashboard.mjs` during weekly hygiene.
