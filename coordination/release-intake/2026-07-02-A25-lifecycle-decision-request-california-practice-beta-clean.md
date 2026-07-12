# 2026-07-02 A25 Lifecycle Decision Request: Clean diverged California practice beta worktree

Generated: 2026-07-02T15:29:27.248Z

Decision ID: `california-practice-beta-clean`

Dirty map signature: `aab9818713f7df7ad2d9e281c7534227bc41a877b346ef4339ea49f3b0123cb2`

Expanded dirty entries: 3505

Status: `approved-archive-tag`

Current state: `open`

Accountable owners: A21, A18, A04, A22

## Evidence

```json
{
  "branch": "codex/california-practice-beta-clean",
  "divergence": {
    "behind": 12,
    "ahead": 1
  },
  "evidenceArchive": "coordination/release-intake/2026-06-26-A25-branch-evidence-california-practice-beta-clean/README.md"
}
```

## Owner Decision Menu

Allowed final states:

- PR candidate
- archive tag
- owner-approved branch retirement
- blocker

## Related Effective Work Orders

| Owner | Priority | Entries | Work order | Pathspec |
| --- | ---: | ---: | --- | --- |
| A22 production reliability and release engineering | 1 | 67 | `coordination/release-intake/latest-A25-effective-work-order-a22-production-reliability-and-release-engineering.md` | `coordination/release-intake/latest-A25-effective-owner-a22-production-reliability-and-release-engineering.pathspec` |
| A18 curriculum QA / A21 content pipeline | 3 | 138 | `coordination/release-intake/latest-A25-effective-work-order-a18-curriculum-qa-a21-content-pipeline.md` | `coordination/release-intake/latest-A25-effective-owner-a18-curriculum-qa-a21-content-pipeline.pathspec` |
| A21 content pipeline and RAG operations | 3 | 74 | `coordination/release-intake/latest-A25-effective-work-order-a21-content-pipeline-and-rag-operations.md` | `coordination/release-intake/latest-A25-effective-owner-a21-content-pipeline-and-rag-operations.pathspec` |
| A04 practice lead | 3 | 56 | `coordination/release-intake/latest-A25-effective-work-order-a04-practice-lead.md` | `coordination/release-intake/latest-A25-effective-owner-a04-practice-lead.pathspec` |

## Approval Record Template

```json
{
  "decisionId": "california-practice-beta-clean",
  "selectedFinalState": "",
  "ownerDecision": "",
  "approvedBy": "",
  "approvedAt": "",
  "evidenceLinks": [],
  "requiredFollowUpGate": "Rerun A25 normal and strict lifecycle gates after the approved action is applied."
}
```

## Forbidden Without Explicit Owner Approval

- Do not stage, commit, branch, merge, rebase, push, delete, reset, revert, clean, or deploy without explicit owner approval.
- Do not publish from the dirty root.
- Do not mix runtime code, generated content backlog, test evidence, and coordination evidence into one release slice.
- Do not discard dirty worktree or branch evidence without a recorded owner decision.

## Verification Before Closure

- Refresh the A25 dirty map.
- Regenerate effective owner overlay, effective disposition queue, lifecycle ledger, and lifecycle decision requests.
- Run A25 normal gates.
- Run strict lifecycle gates; strict gates must pass before marking this decision closed.

## A25 Note

Large generated-content branch; do not merge casually. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag. Owner-selected final state: archive tag.
