# 2026-07-02 A25 Owner Approval Matrix

Generated: 2026-07-02T15:29:27.350Z

Dirty map signature: `aab9818713f7df7ad2d9e281c7534227bc41a877b346ef4339ea49f3b0123cb2`

Expanded dirty entries: 3505

Approval rows: 4

Pending approvals: 0

## Matrix

| Decision ID | Approval status | Accountable owners | Allowed final states | Request packet |
| --- | --- | --- | --- | --- |
| root-dirty-packages | approved | A25, A10, all effective owner work orders | reviewed commit; owner-approved discard; evidence archive; blocker | `coordination/release-intake/latest-A25-lifecycle-decision-request-root-dirty-packages.md` |
| dirty-visualization-production-release | approved | A06, A22, A10 | reviewed package; owner-approved discard; evidence archive with worktree removal blocker; blocker | `coordination/release-intake/latest-A25-lifecycle-decision-request-dirty-visualization-production-release.md` |
| california-practice-beta-clean | approved | A21, A18, A04, A22 | PR candidate; archive tag; owner-approved branch retirement; blocker | `coordination/release-intake/latest-A25-lifecycle-decision-request-california-practice-beta-clean.md` |
| s22-release-hygiene-2026-06-15 | approved | A22, A10 | PR candidate; archive tag; owner-approved branch retirement; blocker | `coordination/release-intake/latest-A25-lifecycle-decision-request-s22-release-hygiene-2026-06-15.md` |

## Approval Templates

## root-dirty-packages

```json
{
  "id": "root-dirty-packages",
  "selectedFinalState": "evidence archive",
  "ownerDecision": "Owner selected conservative non-destructive evidence archive final state.",
  "approvedBy": "owner via Codex thread",
  "approvedAt": "2026-06-26T11:11:01Z",
  "evidenceLinks": [
    "coordination/release-intake/latest-A25-owner-approval-selection.md"
  ]
}
```

## dirty-visualization-production-release

```json
{
  "id": "dirty-visualization-production-release",
  "selectedFinalState": "evidence archive with worktree removal blocker",
  "ownerDecision": "Owner selected conservative non-destructive evidence archive with worktree removal blocker final state.",
  "approvedBy": "owner via Codex thread",
  "approvedAt": "2026-06-26T11:11:01Z",
  "evidenceLinks": [
    "coordination/release-intake/latest-A25-owner-approval-selection.md"
  ]
}
```

## california-practice-beta-clean

```json
{
  "id": "california-practice-beta-clean",
  "selectedFinalState": "archive tag",
  "ownerDecision": "Owner selected conservative non-destructive archive tag final state. A25 records this as an archive-state approval and does not create a Git tag without separate explicit tag instruction.",
  "approvedBy": "owner via Codex thread",
  "approvedAt": "2026-06-26T11:11:01Z",
  "evidenceLinks": [
    "coordination/release-intake/latest-A25-owner-approval-selection.md"
  ]
}
```

## s22-release-hygiene-2026-06-15

```json
{
  "id": "s22-release-hygiene-2026-06-15",
  "selectedFinalState": "archive tag",
  "ownerDecision": "Owner selected conservative non-destructive archive tag final state. A25 records this as an archive-state approval and does not create a Git tag without separate explicit tag instruction.",
  "approvedBy": "owner via Codex thread",
  "approvedAt": "2026-06-26T11:11:01Z",
  "evidenceLinks": [
    "coordination/release-intake/latest-A25-owner-approval-selection.md"
  ]
}
```

## Rules

- This matrix records owner-selected lifecycle final states when latest-A25-owner-approval-selection.json is present.
- It does not authorize any separate Git operation by itself.
- A25 must not stage, commit, branch, push, tag, delete, reset, revert, clean, remove worktrees, or deploy from this matrix alone.
- archive tag is recorded as an archive-state approval only; creating a real Git tag requires a separate explicit tag instruction.
- Each approval must name the exact decision ID, selected final state, approver, timestamp, and evidence links.
- Strict decision-ledger/request/runbook/matrix gates can pass after approvals are recorded; strict physical worktree lifecycle remains red until the related Git state is actually cleaned, archived, tagged, removed, or otherwise closed by separately authorized operations.
