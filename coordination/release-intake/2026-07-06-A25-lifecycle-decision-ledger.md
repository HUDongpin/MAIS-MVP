# 2026-07-06 A25 Lifecycle Decision Ledger

Generated: 2026-07-06T15:46:50.282Z

Dirty map signature: `b26fe39c438a20cdbb9cf3943e3d000d9dc8dc04ccccedc13792c457c5942d3b`

Open decisions: 0

## Decisions

| ID | Status | Accountable owners | Required final states |
| --- | --- | --- | --- |
| root-dirty-packages | approved-evidence-archive | A25, A10, all effective owner work orders | reviewed commit; owner-approved discard; evidence archive; blocker |
| dirty-visualization-production-release | approved-evidence-archive-with-worktree-removal-blocker | A06, A22, A10 | reviewed package; owner-approved discard; evidence archive with worktree removal blocker; blocker |
| california-practice-beta-clean | approved-archive-tag | A21, A18, A04, A22 | PR candidate; archive tag; owner-approved branch retirement; blocker |
| s22-release-hygiene-2026-06-15 | approved-archive-tag | A22, A10 | PR candidate; archive tag; owner-approved branch retirement; blocker |

## Closure Rule

Strict lifecycle closure can pass only when every decision has a non-pending `decisionStatus`, evidence links remain current, and the related worktree/root state has been updated accordingly.
