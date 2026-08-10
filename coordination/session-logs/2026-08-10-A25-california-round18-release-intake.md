# 2026-08-10 A25 California Round 18 release intake

## Session identity

- Lane: A25 Git hygiene and release intake
- Coordinated review: A10 tooling/reporting, A11 regression quality, A18 curriculum/content acceptance, A22 release reliability
- Assignment: non-destructive release intake for `/Volumes/Starship/MAIS-ca-content-qa-wt`
- Outcome: proposal complete; awaiting owner approval

## Guardrails observed

No staging, commit, branch creation or switch, push, pull request, artifact
cleanup, server mutation, preview, deployment, reset, restore, stash, or rebase
was performed. The A25 intake authored only this session log and the two
owner-authorized release-intake evidence artifacts below; A18's terminal content
report was updated separately as content-QA evidence.

## Evidence baseline

- Branch: `content/us-ca-math-lesson-qa`
- HEAD: `295b8c2929a30aaacb096bec1d7bcf6e44044ff1`
- Verified read-only remote main: `bd0928ef52ff000976d9abab279bc79fc1aef1ae`
- Merge base: `1d81110c60df2695917947f3198df06b5bc384ba`
- Divergence: 38 main-only / 90 source-only commits
- Current dirty overlay: 275 tracked modifications, 40 untracked, 0 staged,
  315 total; porcelain SHA-256
  `38322bbd13b15010919e9a24beee427c35dec57f4562152c08878e90c0408813`
- Clean-candidate cumulative final state from the merge base: 333 tracked
  paths plus 40 untracked = 373 total; 304 modified, 28 added, 1 deleted;
  sorted path-list SHA-256
  `aaab977293c034be9bd4ca765ac932341a5e56924d782fad9d32637ecaccefe2`
- Package accounting: 12 cumulative packages, 373 assigned paths, 0
  unassigned, 0 duplicated
- Fresh no-report dirty map: 315 entries, 15 unblocked unmapped, 0 ambiguous,
  signature
  `44ec3a15b8f3a5d5e289e177fa63f74a8b16c46756946bd0f1fabc8347a0c73e`

## Authored evidence

- `coordination/release-intake/2026-08-10-A25-california-round18-proposed-packages.json`
- `coordination/reports/2026-08-10-A25-california-round18-release-intake.md`
- `coordination/session-logs/2026-08-10-A25-california-round18-release-intake.md`
- `coordination/release-intake/latest-A25-dirty-tree-map.json` (ignored
  no-report gate output retained in place)

These are A25/A10/A22 evidence only and are excluded from deployable runtime.

## Coordinated findings

- A25: twelve exact owner/path packages account for all 373 cumulative paths.
  The 315-path dirty overlay alone is insufficient for a clean reconstruction.
  The canonical routing registry still needs owner-approved rules for 15
  unmapped paths and more-specific California QA-script ownership.
- A10/A22: a clean candidate must start from freshly verified `origin/main`; endpoint copying is unsafe. Four paths require hunk-level three-way resolution. Current-main Next/PostCSS/lockfile state must be preserved and installed candidate-locally.
- A11/A18: the durability gap covers 18 untracked Round 18 test/audit
  artifacts. The explicit static manifest is 119/119. The current broad
  cross-surface gate is 18/18. Source/pack parity and explanation review remain
  separate A18 authority gates.
- A22: the strict worktree-lifecycle gate currently has 28 open decisions—19
  dirty and 9 clean-diverged—and remains red. The durable browser wrapper and
  count-enforcing static runner are proposed, not implemented.
- Owner/A22 storage boundary: all E2E execution must be Starship-only. Before
  launching a build, server, or browser, the wrapper must fail closed unless
  the candidate, physical dependencies, build output, temporary directories,
  Playwright browser/cache, reports, screenshots, traces, videos, logs,
  storage state, test databases, and every writable runtime artifact resolve
  under `/Volumes/Starship/`; system `/tmp`, user Library/cache, external
  symlink targets, and other internal-disk fallbacks are prohibited.
- A18: the displayed California lesson content PASS remains scoped to the tested dirty working-tree snapshot and does not by itself establish release readiness.

## Handoff

Owner approval is required before modifying canonical package routing or performing any Git packaging. The recommended decision order is:

1. Approve/revise/reject `CA-R18-01` through `CA-R18-12` and their dispositions.
2. Approve owner-pathspec and California QA-script routing updates.
3. Decide whether visualization catalog changes land with or separately from the minimal quarantine contract.
4. Approve the count-enforced 119-test static runner, A18 content-authority
   commands, isolated A22 browser wrapper, current 18/18 cross-surface gate, and
   depth no-regression contract. The two proposed runners would expand the
   current cumulative path count from 373 to 375 and require refreshed A25 proof.
   The browser wrapper must include the owner-mandated fail-closed Starship-only
   filesystem preflight before any E2E process starts.
5. Decide the discard/archive state of the unreachable Grade 1 PNG and historical evidence.
6. Issue a separate authorization if package worktrees, exact staging, commits, candidate composition, PR, preview, cleanup, or deployment are desired.

Current release-intake verdict: **NO-GO beyond proposal/evidence; authoritative QA snapshot preserved.**
