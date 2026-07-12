# 2026-07-11 A25 Lifecycle Closure Runbook

Generated: 2026-07-10T17:07:21.087Z

Dirty map signature: `e30d647e1b51432945713f42ac78b0a2466fcb17192de0235a801ac877a0801f`

Expanded dirty entries: 7636

Open lifecycle decisions: 0

## Decision Index

| Decision ID | Status | Accountable owners | Request packet |
| --- | --- | --- | --- |
| root-dirty-packages | approved-evidence-archive | A25, A10, all effective owner work orders | `coordination/release-intake/latest-A25-lifecycle-decision-request-root-dirty-packages.md` |
| dirty-visualization-production-release | approved-evidence-archive-with-worktree-removal-blocker | A06, A22, A10 | `coordination/release-intake/latest-A25-lifecycle-decision-request-dirty-visualization-production-release.md` |
| california-practice-beta-clean | approved-archive-tag | A21, A18, A04, A22 | `coordination/release-intake/latest-A25-lifecycle-decision-request-california-practice-beta-clean.md` |
| s22-release-hygiene-2026-06-15 | approved-archive-tag | A22, A10 | `coordination/release-intake/latest-A25-lifecycle-decision-request-s22-release-hygiene-2026-06-15.md` |

## Global Closure Gates

- `npm run release:dirty-map -- --assert-current --max-age-minutes 60 --json`
- `node coordination/release-intake/assert-effective-disposition-queue-current.mjs`
- `node coordination/release-intake/assert-lifecycle-decision-ledger-current.mjs`
- `node coordination/release-intake/assert-lifecycle-decision-requests-current.mjs`
- `node coordination/release-intake/assert-lifecycle-closure-runbook-current.mjs`
- `node coordination/release-intake/assert-worktree-lifecycle.mjs --strict`
- `node coordination/release-intake/assert-lifecycle-decision-ledger-current.mjs --strict`
- `node coordination/release-intake/assert-lifecycle-decision-requests-current.mjs --strict`
- `node coordination/release-intake/assert-lifecycle-closure-runbook-current.mjs --strict`

## Global Stop Conditions

- Owner approval is absent for a destructive Git operation.
- Dirty root is requested as a release source.
- A request packet, evidence archive, or pathspec is stale.
- A cleanup action would mix runtime code, content backlog, test evidence, and coordination evidence.
- Strict lifecycle gates still report open decisions.

## root-dirty-packages

Status: `approved-evidence-archive`

Accountable owners: A25, A10, all effective owner work orders

Request packet: `coordination/release-intake/latest-A25-lifecycle-decision-request-root-dirty-packages.md`

Allowed closure options:

- Owner-reviewed commit: each effective owner works from its pathspec package, validates its own scope, and commits only that approved slice from an isolated branch/worktree.
- Owner-approved discard: owner provides explicit written approval for exact paths; A25 archives evidence first, then a separately authorized Git operation may discard that slice.
- Evidence archive: keep package out of runtime release and preserve pathspec/work-order evidence as the final state.
- Blocker: owner records why the package cannot be committed, discarded, or archived yet.

Required approval fields:

- selectedFinalState
- ownerDecision
- approvedBy
- approvedAt
- evidenceLinks

Non-destructive before approval:

- Refresh dirty map and lifecycle evidence.
- Confirm request packet is current.
- Confirm evidence archives remain current.
- Do not stage, commit, branch, push, delete, reset, revert, clean, or deploy.

After approval verification:

- Apply only the owner-approved action, in the owner-approved scope.
- Refresh dirty map and dependent A25 artifacts.
- Run normal A25 gates.
- Run strict lifecycle gates and confirm this decision no longer appears as pending.

Related work orders:

- `coordination/release-intake/latest-A25-effective-work-order-a25-git-hygiene-and-release-intake.md`
- `coordination/release-intake/latest-A25-effective-work-order-a22-production-reliability-and-release-engineering.md`
- `coordination/release-intake/latest-A25-effective-work-order-a06-visualization-lead.md`
- `coordination/release-intake/latest-A25-effective-work-order-a12-backend-api-platform.md`
- `coordination/release-intake/latest-A25-effective-work-order-a11-qa-and-release-quality.md`
- `coordination/release-intake/latest-A25-effective-work-order-a10-tooling-docs-and-report.md`
- `coordination/release-intake/latest-A25-effective-work-order-a05-lesson-lead.md`
- `coordination/release-intake/latest-A25-effective-work-order-a21-content-pipeline-and-rag-operations.md`
- `coordination/release-intake/latest-A25-effective-work-order-a04-practice-lead.md`
- `coordination/release-intake/latest-A25-effective-work-order-a18-curriculum-qa-a21-content-pipeline.md`
- `coordination/release-intake/latest-A25-effective-work-order-a03-curriculum-roadmap-lead.md`
- `coordination/release-intake/latest-A25-effective-work-order-a24-illustration-exact-layer.md`
- `coordination/release-intake/latest-A25-effective-work-order-a13-teacher-console.md`
- `coordination/release-intake/latest-A25-effective-work-order-a01-app-shell-lead.md`
- `coordination/release-intake/latest-A25-effective-work-order-a02-dashboard-lead.md`
- `coordination/release-intake/latest-A25-effective-work-order-a20-game-design-and-game-based-learning.md`
- `coordination/release-intake/latest-A25-effective-work-order-a07-ai-tutor-lead.md`
- `coordination/release-intake/latest-A25-effective-work-order-a08-state-and-analytics-lead.md`
- `coordination/release-intake/latest-A25-effective-work-order-a15-adaptive-engine-lead.md`
- `coordination/release-intake/latest-A25-effective-work-order-a14-parent-console.md`
- `coordination/release-intake/latest-A25-effective-work-order-manual-a10-a25-owner-assignment-required.md`
- `coordination/release-intake/latest-A25-effective-work-order-a09-copy-i18n-accessibility.md`
- `coordination/release-intake/latest-A25-effective-work-order-a17-gamification-and-motivation.md`
- `coordination/release-intake/latest-A25-effective-work-order-a23-integration-and-promotion-lead.md`
- `coordination/release-intake/latest-A25-effective-work-order-a13-teacher-console-lead.md`
- `coordination/release-intake/latest-A25-effective-work-order-a18-curriculum-qa-and-content-quality-lead.md`

## dirty-visualization-production-release

Status: `approved-evidence-archive-with-worktree-removal-blocker`

Accountable owners: A06, A22, A10

Request packet: `coordination/release-intake/latest-A25-lifecycle-decision-request-dirty-visualization-production-release.md`

Allowed closure options:

- Reviewed package: A06/A22 inspect the archived patch and dirty worktree, then decide whether to produce a PR/review package.
- Owner-approved discard: A06/A22/A10 approve exact discard/removal after confirming the archive is current.
- Evidence archive with worktree removal blocker: preserve archive and leave cleanup blocked if semantic review is incomplete.
- Blocker: record missing evidence, ownership disagreement, or release-risk reason.

Required approval fields:

- selectedFinalState
- ownerDecision
- approvedBy
- approvedAt
- evidenceLinks

Non-destructive before approval:

- Refresh dirty map and lifecycle evidence.
- Confirm request packet is current.
- Confirm evidence archives remain current.
- Do not stage, commit, branch, push, delete, reset, revert, clean, or deploy.

After approval verification:

- Apply only the owner-approved action, in the owner-approved scope.
- Refresh dirty map and dependent A25 artifacts.
- Run normal A25 gates.
- Run strict lifecycle gates and confirm this decision no longer appears as pending.

Related work orders:

- `coordination/release-intake/latest-A25-effective-work-order-a22-production-reliability-and-release-engineering.md`
- `coordination/release-intake/latest-A25-effective-work-order-a06-visualization-lead.md`
- `coordination/release-intake/latest-A25-effective-work-order-a10-tooling-docs-and-report.md`

## california-practice-beta-clean

Status: `approved-archive-tag`

Accountable owners: A21, A18, A04, A22

Request packet: `coordination/release-intake/latest-A25-lifecycle-decision-request-california-practice-beta-clean.md`

Allowed closure options:

- PR candidate: owning sessions review the branch archive and produce a clean PR or reviewed slice.
- Archive tag: owner records the branch as preserved evidence and blocks merge/deploy use.
- Owner-approved branch retirement: owner approves branch/worktree retirement after evidence is current.
- Blocker: record why the branch cannot be promoted, archived, or retired yet.

Required approval fields:

- selectedFinalState
- ownerDecision
- approvedBy
- approvedAt
- evidenceLinks

Non-destructive before approval:

- Refresh dirty map and lifecycle evidence.
- Confirm request packet is current.
- Confirm evidence archives remain current.
- Do not stage, commit, branch, push, delete, reset, revert, clean, or deploy.

After approval verification:

- Apply only the owner-approved action, in the owner-approved scope.
- Refresh dirty map and dependent A25 artifacts.
- Run normal A25 gates.
- Run strict lifecycle gates and confirm this decision no longer appears as pending.

Related work orders:

- `coordination/release-intake/latest-A25-effective-work-order-a22-production-reliability-and-release-engineering.md`
- `coordination/release-intake/latest-A25-effective-work-order-a21-content-pipeline-and-rag-operations.md`
- `coordination/release-intake/latest-A25-effective-work-order-a04-practice-lead.md`
- `coordination/release-intake/latest-A25-effective-work-order-a18-curriculum-qa-a21-content-pipeline.md`
- `coordination/release-intake/latest-A25-effective-work-order-a18-curriculum-qa-and-content-quality-lead.md`

## s22-release-hygiene-2026-06-15

Status: `approved-archive-tag`

Accountable owners: A22, A10

Request packet: `coordination/release-intake/latest-A25-lifecycle-decision-request-s22-release-hygiene-2026-06-15.md`

Allowed closure options:

- PR candidate: owning sessions review the branch archive and produce a clean PR or reviewed slice.
- Archive tag: owner records the branch as preserved evidence and blocks merge/deploy use.
- Owner-approved branch retirement: owner approves branch/worktree retirement after evidence is current.
- Blocker: record why the branch cannot be promoted, archived, or retired yet.

Required approval fields:

- selectedFinalState
- ownerDecision
- approvedBy
- approvedAt
- evidenceLinks

Non-destructive before approval:

- Refresh dirty map and lifecycle evidence.
- Confirm request packet is current.
- Confirm evidence archives remain current.
- Do not stage, commit, branch, push, delete, reset, revert, clean, or deploy.

After approval verification:

- Apply only the owner-approved action, in the owner-approved scope.
- Refresh dirty map and dependent A25 artifacts.
- Run normal A25 gates.
- Run strict lifecycle gates and confirm this decision no longer appears as pending.

Related work orders:

- `coordination/release-intake/latest-A25-effective-work-order-a22-production-reliability-and-release-engineering.md`
- `coordination/release-intake/latest-A25-effective-work-order-a10-tooling-docs-and-report.md`

