# A25 Owner Closure Work Order Bundle

Generated: 2026-07-10T15:57:42.401Z

Queue source: `coordination/release-intake/latest-A25-owner-closure-action-queue.json`

Dirty map signature: `37c9d353a7710b8e92d3d766006b7230936ca194044a47770a99ab12d7c6cef1`

Expanded dirty entries: 7221

This bundle is coordination evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any physical cleanup.

## Summary

- Owners: 25
- Pending items: 130
- Owner package assignments: 11
- Blocker report starters: 11
- Recorded blocker reports: 11
- Pending blocker reports: 0
- Authorization starters: 87
- A22 generated-artifact residual authorizations: 4
- Next-owner focus batch status: no-focus-batch
- Next-owner focus batch rows: 0
- Next-owner focus batch accepted rows: 0
- Next-owner focus batch pending rows: 0
- Next-owner focus batch held rows: 0
- Next-owner focus batch held policy rows: 1
- Next-owner focus batch owner-input visible rows: 0
- Next-owner focus batch canonical draft visible rows: 0
- Next-owner focus batch canonical authorization visible rows: 0
- Next-owner focus batch recording-intake status: no-focus-batch
- Next-owner focus batch recording accepted rows: 0
- Next-owner focus batch recording pending rows: 0
- Next-owner focus batch recording owner-input visible rows: 0
- Next-owner focus batch recording failed checks: 0
- Next-owner focus batch recording post-input validation commands: 5
- Next-owner focus batch recording deferred aggregate validation commands: 8
- Remaining completion assignments: 28
- Validation hold: waiting-for-owner-compose-deletion-confirmation
- Safe post-input validation commands: 5
- Deferred aggregate validation commands: 8
- Cleanup-authorized rows: 0
- Executable rows: 0

## Validation Hold

- Status: waiting-for-owner-compose-deletion-confirmation
- Active owner worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A10-A22-A08-A12-A06-compose-20260628`
- Reason: Owner reported active exact deletion in this compose worktree; linked-worktree archive, Wave 06, aggregate remediation, and completion-audit refreshes should wait for owner confirmation.
- Resume condition: Owner confirms exact deletion in the compose worktree is complete.

Safe post-input validation commands:

- `node coordination/release-intake/assert-next-owner-authorizations-current.mjs`
- `node coordination/release-intake/generate-next-owner-authorization-execution-preview.mjs`
- `node coordination/release-intake/assert-next-owner-authorization-execution-preview-current.mjs`
- `node coordination/release-intake/assert-owner-package-blocker-report-records-current.mjs`
- `node coordination/release-intake/assert-owner-closure-input-readiness-current.mjs`

Deferred aggregate validation commands:

- `node coordination/release-intake/refresh-linked-worktree-archive-evidence.mjs`
- `node coordination/release-intake/assert-linked-worktree-archive-evidence-current.mjs`
- `node coordination/release-intake/generate-wave06-final-root-lifecycle-readiness.mjs`
- `node coordination/release-intake/assert-wave06-final-root-lifecycle-readiness-current.mjs`
- `node coordination/release-intake/refresh-dirty-worktree-remediation-evidence.mjs --reason "owner input action packet post-input verification"`
- `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- `node coordination/release-intake/generate-dirty-worktree-remediation-completion-audit.mjs`
- `node coordination/release-intake/assert-dirty-worktree-remediation-completion-audit-current.mjs`

## Next Owner Authorization Focus Batch

Status: no-focus-batch

These rows are the current owner-facing authorization focus when present. They remain non-executable until the owner records matching canonical authorization rows and later separate execution instructions where required.

Owner-input visible rows: 0/0

Recording intake status: no-focus-batch

Recording accepted rows: 0

Recording pending rows: 0

Held policy approval IDs:

- `wave01-resync-01-tsconfig-json`

Recording failed checks: 0

| Agent | Owner | Focus rows | Work order |
| --- | --- | ---: | --- |
| none | n/a | 0 | n/a |

| Agent | Owner | Pending | Package assignments | Report starters | Recorded reports | Pending reports | Auth starters | A22 residual auth | Focus auth | Completion assignments | Work order |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| A01 | A01 app shell lead | 4 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 1 | `coordination/release-intake/latest-A25-owner-closure-work-order-a01.md` |
| A02 | A02 dashboard lead | 3 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 1 | `coordination/release-intake/latest-A25-owner-closure-work-order-a02.md` |
| A03 | A03 curriculum roadmap lead | 4 | 1 | 1 | 1 | 0 | 2 | 0 | 0 | 1 | `coordination/release-intake/latest-A25-owner-closure-work-order-a03.md` |
| A04 | A04 practice lead | 5 | 1 | 1 | 1 | 0 | 3 | 0 | 0 | 1 | `coordination/release-intake/latest-A25-owner-closure-work-order-a04.md` |
| A05 | A05 lesson lead | 6 | 0 | 0 | 0 | 0 | 5 | 0 | 0 | 1 | `coordination/release-intake/latest-A25-owner-closure-work-order-a05.md` |
| A06 | A06 visualization lead | 7 | 1 | 1 | 1 | 0 | 5 | 0 | 0 | 1 | `coordination/release-intake/latest-A25-owner-closure-work-order-a06.md` |
| A07 | A07 AI tutor lead | 6 | 1 | 1 | 1 | 0 | 4 | 0 | 0 | 1 | `coordination/release-intake/latest-A25-owner-closure-work-order-a07.md` |
| A08 | A08 state and analytics lead | 5 | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 1 | `coordination/release-intake/latest-A25-owner-closure-work-order-a08.md` |
| A09 | A09 copy, i18n, accessibility | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | `coordination/release-intake/latest-A25-owner-closure-work-order-a09.md` |
| A10 | A10 tooling, docs, and report | 8 | 0 | 0 | 0 | 0 | 6 | 0 | 0 | 2 | `coordination/release-intake/latest-A25-owner-closure-work-order-a10.md` |
| A11 | A11 QA and release quality lead | 6 | 1 | 1 | 1 | 0 | 3 | 0 | 0 | 2 | `coordination/release-intake/latest-A25-owner-closure-work-order-a11.md` |
| A12 | A12 backend/API platform lead | 7 | 1 | 1 | 1 | 0 | 5 | 0 | 0 | 1 | `coordination/release-intake/latest-A25-owner-closure-work-order-a12.md` |
| A13 | A13 teacher console lead | 5 | 1 | 1 | 1 | 0 | 3 | 0 | 0 | 1 | `coordination/release-intake/latest-A25-owner-closure-work-order-a13.md` |
| A14 | A14 parent console | 3 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | `coordination/release-intake/latest-A25-owner-closure-work-order-a14.md` |
| A15 | A15 adaptive engine lead | 5 | 1 | 1 | 1 | 0 | 3 | 0 | 0 | 1 | `coordination/release-intake/latest-A25-owner-closure-work-order-a15.md` |
| A16 | A16 | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | `coordination/release-intake/latest-A25-owner-closure-work-order-a16.md` |
| A17 | A17 gamification and motivation | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | `coordination/release-intake/latest-A25-owner-closure-work-order-a17.md` |
| A18 | A18 curriculum QA and content quality lead | 6 | 1 | 1 | 1 | 0 | 4 | 0 | 0 | 1 | `coordination/release-intake/latest-A25-owner-closure-work-order-a18.md` |
| A19 | A19 | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | `coordination/release-intake/latest-A25-owner-closure-work-order-a19.md` |
| A20 | A20 game design and game-based learning lead | 4 | 1 | 1 | 1 | 0 | 2 | 0 | 0 | 1 | `coordination/release-intake/latest-A25-owner-closure-work-order-a20.md` |
| A21 | A21 content pipeline and RAG operations | 5 | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 1 | `coordination/release-intake/latest-A25-owner-closure-work-order-a21.md` |
| A22 | A22 production reliability and release engineering | 18 | 0 | 0 | 0 | 0 | 12 | 2 | 0 | 4 | `coordination/release-intake/latest-A25-owner-closure-work-order-a22.md` |
| A23 | A23 integration and promotion lead | 2 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 1 | `coordination/release-intake/latest-A25-owner-closure-work-order-a23.md` |
| A24 | A24 illustration exact-layer | 2 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 1 | `coordination/release-intake/latest-A25-owner-closure-work-order-a24.md` |
| A25 | A25 git hygiene and release intake lead | 13 | 1 | 1 | 1 | 0 | 6 | 2 | 0 | 4 | `coordination/release-intake/latest-A25-owner-closure-work-order-a25.md` |
