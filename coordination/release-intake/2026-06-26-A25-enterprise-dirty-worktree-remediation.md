# 2026-06-26 A25 Enterprise Dirty-Worktree Remediation

- Agent: A25 git hygiene and release intake
- Scope: Execute accepted enterprise worktree/dirty-root remediation plan without staging, committing, branching, merging, rebasing, pushing, resetting, reverting, or deleting feature files.
- Baseline branch: `main`
- Baseline head: `cef544e0`

## Executive State

The stale worktree registry problem has been remediated: `git worktree prune --verbose` removed five stale registry entries that were previously confirmed by dry run.

The root dirty-tree problem is not a single safe commit. It is now converted into owner-scoped intake packages and release gates:

- Latest worktree dashboard: `coordination/release-intake/latest-A25-worktree-hygiene-dashboard.md`
- Latest worktree dashboard JSON: `coordination/release-intake/latest-A25-worktree-hygiene-dashboard.json`
- Latest owner pathspecs: `coordination/release-intake/latest-A25-owner-*.pathspec`
- Release-source gate: `node coordination/release-intake/assert-release-source-clean.mjs`
- Worktree lifecycle gate: `node coordination/release-intake/assert-worktree-lifecycle.mjs`
- Dashboard generator: `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
- Worktree evidence archiver: `node coordination/release-intake/archive-worktree-evidence.mjs`
- Branch evidence archiver: `node coordination/release-intake/archive-branch-evidence.mjs`
- Owner disposition queue: `coordination/release-intake/latest-A25-owner-disposition-queue.md`
- Owner pathspec current gate: `node coordination/release-intake/assert-owner-pathspecs-current.mjs`
- Secret/env quarantine gate: `node coordination/release-intake/assert-secret-env-quarantine.mjs`
- Disposition evidence current gate: `node coordination/release-intake/assert-disposition-evidence-current.mjs`
- Unmapped runtime owner proposals: `coordination/release-intake/latest-A25-unmapped-runtime-owner-proposals.md`
- Unmapped owner proposal current gate: `node coordination/release-intake/assert-unmapped-owner-proposals-current.mjs`
- Effective owner overlay: `coordination/release-intake/latest-A25-effective-owner-overlay.md`
- Effective owner overlay current gate: `node coordination/release-intake/assert-effective-owner-overlay-current.mjs`
- Effective disposition queue: `coordination/release-intake/latest-A25-effective-disposition-queue.md`
- Effective disposition queue current gate: `node coordination/release-intake/assert-effective-disposition-queue-current.mjs`
- Unmapped manual owner proposals: `coordination/release-intake/latest-A25-unmapped-manual-owner-proposals.md`
- Lifecycle decision ledger: `coordination/release-intake/latest-A25-lifecycle-decision-ledger.md`
- Lifecycle decision ledger gate: `node coordination/release-intake/assert-lifecycle-decision-ledger-current.mjs`
- Lifecycle decision request index: `coordination/release-intake/latest-A25-lifecycle-decision-request-index.md`
- Lifecycle decision request gate: `node coordination/release-intake/assert-lifecycle-decision-requests-current.mjs`
- Lifecycle closure runbook: `coordination/release-intake/latest-A25-lifecycle-closure-runbook.md`
- Lifecycle closure runbook gate: `node coordination/release-intake/assert-lifecycle-closure-runbook-current.mjs`
- Owner approval matrix: `coordination/release-intake/latest-A25-owner-approval-matrix.md`
- Owner approval matrix gate: `node coordination/release-intake/assert-owner-approval-matrix-current.mjs`
- Owner approval selection: `coordination/release-intake/latest-A25-owner-approval-selection.md`
- Final A25 dirty map after owner approval selection verification refresh: `1648` expanded entries.

## Eight-Point Execution Map

| Accepted suggestion | Execution status | Evidence | Remaining decision |
| --- | --- | --- | --- |
| 1. Treat root `main` as integration inventory only. | Implemented as an operating rule and release gate. | `latest-A25-worktree-hygiene-dashboard.md`; `assert-release-source-clean.mjs` rejects dirty root. | A22 must keep using clean worktree/clone/slice/pruned staging for release. |
| 2. Create formal dirty-tree intake board by owner. | Implemented. | 25 owner rows in `latest-A25-worktree-hygiene-dashboard.md`; 25 `latest-A25-owner-*.pathspec` files. | Owning agents must decide commit/discard/archive/defer per pathspec. |
| 3. Prune stale worktree metadata after approval. | Implemented. | `git worktree prune --verbose` removed five stale entries; post-prune dry run is empty. | None for stale registry; continue weekly A25 audit. |
| 4. Resolve dirty visualization worktree separately. | Evidence archived and owner final state recorded; no worktree removal performed. | Lifecycle ledger marks `dirty-visualization-production-release` as `approved-evidence-archive-with-worktree-removal-blocker`; evidence archive exists at `coordination/release-intake/2026-06-26-A25-worktree-evidence-visualization-production-release/`. | A06/A22/A10 still need separate explicit approval for any worktree removal, discard, reset, or package operation. |
| 5. Retire or merge old clean branch worktrees. | Evidence archived and owner archive state recorded; no Git tags or branch retirement performed. | Lifecycle ledger marks `california-practice-beta-clean` and `s22-release-hygiene-2026-06-15` as `approved-archive-tag`; branch evidence archives exist for both branches. | Creating real archive tags or retiring branches requires separate explicit tag/delete/branch instructions. |
| 6. Add release gates. | Implemented. | `assert-release-source-clean.mjs`; dirty root gate run failed as expected with 1272 dirty entries at that time. | A22 should run this before preview/production publish. |
| 7. Add worktree lifecycle policy. | Implemented as generated ledger, operating rules, and executable gate. | `latest-A25-worktree-hygiene-dashboard.md` records state, divergence, dirty count, path, and next action; `assert-worktree-lifecycle.mjs` verifies registry hygiene and supports strict mode. | A25 should refresh during daily/weekly hygiene. |
| 8. Standardize artifact quarantine. | Implemented as policy in dashboard and pathspec slicing. | Dashboard artifact-quarantine section; dirty map slice buckets separate docs/evidence, generated/RAG backlog, runtime, tests, release config, secret/env quarantine. | A10/A22 may later harden `.gitignore`/release scripts after reviewing existing dirty config changes. |

Additional execution queue evidence:

- `latest-A25-owner-disposition-queue.md` ranks 25 owner packages into P0/P1/P2/P3/P4 work queues.
- P0: unmapped runtime owner assignment.
- P1: A22 release engineering and A25 release-intake evidence packages.
- P2: A06 visualization, A12 backend/API, and A11 QA packages.
- `latest-A25-unmapped-runtime-owner-proposals.md` proposes candidate owners for all 100 P0 unmapped runtime entries.
- Proposal coverage: high 74, medium 26, low 0, none 0.
- Proposal owner buckets: 14.
- `latest-A25-effective-owner-overlay.md` applies those proposals as an execution overlay and leaves 0 remaining unmapped runtime entries in the effective queue.
- `latest-A25-unmapped-manual-owner-proposals.md` proposes owners for the remaining unmapped/manual bucket: 7 current entries, 5 proposed owner buckets, high 3 / medium 4 / none 0.
- `latest-A25-effective-disposition-queue.md` applies runtime + manual proposal overlays and leaves P0 = 0 in the effective execution queue.
- `latest-A25-owner-approval-selection.md` records the owner-selected final states for the four lifecycle decisions: `evidence archive`, `evidence archive with worktree removal blocker`, and two `archive tag` archive-state approvals.
- `latest-A25-lifecycle-decision-ledger.md` records 4 approved lifecycle decisions and 0 open decision approvals.
- `latest-A25-lifecycle-decision-request-index.md` turns those 4 lifecycle decisions into owner-facing request packets with evidence, allowed final states, related effective work orders, forbidden actions, and verification-before-closure steps.
- `latest-A25-lifecycle-closure-runbook.md` turns those 4 request packets into a post-approval closure workflow with allowed closure options, stop conditions, and strict gate requirements.
- `latest-A25-owner-approval-matrix.md` lists the exact four approvals, selected final states, required approval fields, and linked request packets.

## Current Worktree Registry After Prune

Valid registered worktrees now, with lifecycle gate evidence:

- `node coordination/release-intake/assert-worktree-lifecycle.mjs`: passes registry hygiene with 4 worktrees, 0 prunable entries, 2 dirty lifecycle items, and 2 clean-diverged lifecycle items.
- `node coordination/release-intake/assert-worktree-lifecycle.mjs --strict`: intentionally fails until the physical Git/worktree states are actually cleaned, archived, tagged, removed, or otherwise closed by separately authorized operations.
- `node coordination/release-intake/assert-lifecycle-decision-ledger-current.mjs --strict`: passes with 4 approved decisions and 0 open decision approvals.
- `node coordination/release-intake/assert-lifecycle-decision-requests-current.mjs --strict`: passes with 4 approved request packets and 0 open decision approvals.
- `node coordination/release-intake/assert-lifecycle-closure-runbook-current.mjs --strict`: passes with 4 approved closure plans and 0 open decision approvals.
- `node coordination/release-intake/assert-owner-approval-matrix-current.mjs --strict`: passes with 4 approval rows and 0 pending approvals.

| Branch | State | Path |
| --- | --- | --- |
| `main` | dirty active review required | `/Users/dongpinhu/Desktop/MAIS-MVP` |
| `codex/visualization-production-release` | dirty active review required | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/visualization-production-release` |
| `codex/california-practice-beta-clean` | clean branch diverged review | `/Users/dongpinhu/Desktop/MAIS-MVP-worktrees/MAIS-MVP-california-practice-beta-clean` |
| `codex/s22-release-hygiene-2026-06-15` | clean branch diverged review | `/Users/dongpinhu/Desktop/MAIS-MVP-worktrees/s22-release-hygiene-2026-06-15` |

Post-prune `git worktree prune --dry-run --verbose` produced no output, confirming no remaining prunable entries.

## Owner Intake Priority

Current highest-volume owner packages:

| Owner | Pathspec |
| --- | --- |
| A06 visualization lead | `coordination/release-intake/latest-A25-owner-a06-visualization-lead.pathspec` |
| A12 backend/API platform | `coordination/release-intake/latest-A25-owner-a12-backend-api-platform.pathspec` |
| A10 tooling, docs, and report | `coordination/release-intake/latest-A25-owner-a10-tooling-docs-and-report.pathspec` |
| A18 curriculum QA / A21 content pipeline | `coordination/release-intake/latest-A25-owner-a18-curriculum-qa-a21-content-pipeline.pathspec` |
| A25 git hygiene and release intake | `coordination/release-intake/latest-A25-owner-a25-git-hygiene-and-release-intake.pathspec` |
| Unmapped runtime owner review needed | `coordination/release-intake/latest-A25-owner-unmapped-runtime-owner-review-needed.pathspec` |
| A21 content pipeline and RAG operations | `coordination/release-intake/latest-A25-owner-a21-content-pipeline-and-rag-operations.pathspec` |
| A11 QA and release quality | `coordination/release-intake/latest-A25-owner-a11-qa-and-release-quality.pathspec` |

## Gates And Commands

- Refresh dirty map: `npm run release:dirty-map -- --reason "<reason>"`
- Generate owner/worktree dashboard: `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
- Check release source: `node coordination/release-intake/assert-release-source-clean.mjs`
- Check worktree lifecycle: `node coordination/release-intake/assert-worktree-lifecycle.mjs`
- Strict lifecycle closure check: `node coordination/release-intake/assert-worktree-lifecycle.mjs --strict`
- Check owner pathspec currency: `node coordination/release-intake/assert-owner-pathspecs-current.mjs`
- Check unmapped owner proposals: `node coordination/release-intake/assert-unmapped-owner-proposals-current.mjs`
- Check effective owner overlay: `node coordination/release-intake/assert-effective-owner-overlay-current.mjs`
- Check effective disposition queue: `node coordination/release-intake/assert-effective-disposition-queue-current.mjs`
- Check unmapped manual owner proposals: `node coordination/release-intake/assert-unmapped-manual-proposals-current.mjs`
- Generate lifecycle decision ledger: `node coordination/release-intake/generate-lifecycle-decision-ledger.mjs`
- Check lifecycle decision ledger: `node coordination/release-intake/assert-lifecycle-decision-ledger-current.mjs`
- Strict lifecycle decision closure check: `node coordination/release-intake/assert-lifecycle-decision-ledger-current.mjs --strict`
- Generate lifecycle decision requests: `node coordination/release-intake/generate-lifecycle-decision-requests.mjs`
- Check lifecycle decision requests: `node coordination/release-intake/assert-lifecycle-decision-requests-current.mjs`
- Strict lifecycle request closure check: `node coordination/release-intake/assert-lifecycle-decision-requests-current.mjs --strict`
- Generate lifecycle closure runbook: `node coordination/release-intake/generate-lifecycle-closure-runbook.mjs`
- Check lifecycle closure runbook: `node coordination/release-intake/assert-lifecycle-closure-runbook-current.mjs`
- Strict lifecycle closure runbook check: `node coordination/release-intake/assert-lifecycle-closure-runbook-current.mjs --strict`
- Generate owner approval matrix: `node coordination/release-intake/generate-owner-approval-matrix.mjs`
- Check owner approval matrix: `node coordination/release-intake/assert-owner-approval-matrix-current.mjs`
- Strict owner approval matrix check: `node coordination/release-intake/assert-owner-approval-matrix-current.mjs --strict`
- Check secret/env quarantine: `node coordination/release-intake/assert-secret-env-quarantine.mjs`
- Check disposition evidence currency: `node coordination/release-intake/assert-disposition-evidence-current.mjs`
- Archive dirty worktree evidence: `node coordination/release-intake/archive-worktree-evidence.mjs --worktree "<path>" --label "<label>"`
- Archive clean branch evidence: `node coordination/release-intake/archive-branch-evidence.mjs --branch "<branch>" --label "<label>"`
- Confirm no stale worktree registry entries: `git worktree prune --dry-run --verbose`

## Non-Goals In This Pass

- A25 did not decide feature/content correctness for owner packages.
- A25 did not stage, commit, branch, merge, rebase, push, reset, revert, or delete files.
- A25 did not delete the dirty visualization worktree or diverged clean branch worktrees.
- A25 did not alter real secret files or print secret values.
