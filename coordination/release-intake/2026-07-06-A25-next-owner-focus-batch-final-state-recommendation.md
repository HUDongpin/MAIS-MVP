# A25 Next Owner Focus Batch Final-State Recommendation

- Generated: 2026-07-06T11:29:26+0800
- Agent: A25 git hygiene and release intake
- Scope: recommendation only for the current five-row next-owner authorization focus batch
- Boundary: this artifact does not authorize staging, committing, merging, restoring, cleaning, deleting, worktree removal, branch deletion, pushing, deployment, or any physical cleanup.

## Current Evidence

- Dirty map is current with expanded status entries 5064.
- A25 current cleanup snapshot is incomplete and still blocked-before-merge.
- Closure loop active step is validate.
- Pending canonical authorization rows: 64.
- Current next-owner focus batch rows: 5.
- Current cleanupAuthorizedRows: 0.
- Current executableRows: 0.
- A25 dirty-worktree remediation aggregate gate passes currentness checks, but completion is still false.
- A22 release source clean is false; dirty root remains inventory-only.

## Focus Batch Recommendation

| Approval ID | Owner | Entries | Current evidence | Recommended selectedFinalState | Rationale |
| --- | --- | ---: | --- | --- | --- |
| `a25-git-hygiene-and-release-intake` | A25 git hygiene and release intake | 3354 | release-intake evidence package; all status entries are untracked coordination evidence | `evidence archive` | This is not a runtime release slice. Treat it as evidence/archive material until an explicit commit/archive/discard package is selected. |
| `a22-production-reliability-and-release-engineering` | A22 production reliability and release engineering | 68 | release config/scripts plus release reports; `.vercelignore` and `playwright.config.ts` are modified; release source clean is false | `blocker` | A22 package is not yet a clean release source. Do not treat this as deploy authorization or reviewed release slice. |
| `a06-visualization-lead` | A06 visualization lead | 460 | runtime visualization package; matrix records failed typeCheck, visualizationNodeTests, and visualizationPlaywright | `blocker` | A06 needs owner-isolated remediation and passing targeted checks before reviewed commit or merge. |
| `a12-backend-api-platform` | A12 backend/API platform | 175 | backend/API package; recorded blocker says routing/worktree repair and A07/A12 split are still needed | `blocker` | A12 cannot safely close until the assignment is routed to an actual approved A12 worktree and cross-owner API ownership is split. |
| `a11-qa-and-release-quality` | A11 QA and release quality | 62 | regression package; recorded blocker says type-check and regression Playwright remain blocked by upstream/non-A11 scope errors | `blocker` | A11 cannot certify regression evidence until upstream owners and scope boundaries are resolved. |

## Copy-Ready Owner Authorization Drafts

These drafts fill only the recommended `selectedFinalState`. They remain owner-input text. They still require the owner to review, set `approvedBy`, set `approvedAt`, and record them in `coordination/release-intake/latest-A25-next-owner-authorizations.json`.

- Authorize approvalId=a25-git-hygiene-and-release-intake for owner=A25 git hygiene and release intake; selectedFinalState=evidence archive; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a25-git-hygiene-and-release-intake.pathspec, coordination/release-intake/latest-A25-effective-work-order-a25-git-hygiene-and-release-intake.md, coordination/release-intake/2026-07-06-A25-next-owner-focus-batch-final-state-recommendation.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=Release-intake evidence/archive final state only; no commit, merge, cleanup, discard, push, deploy, or physical Git command is authorized.
- Authorize approvalId=a22-production-reliability-and-release-engineering for owner=A22 production reliability and release engineering; selectedFinalState=blocker; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a22-production-reliability-and-release-engineering.pathspec, coordination/release-intake/latest-A25-effective-work-order-a22-production-reliability-and-release-engineering.md, coordination/release-intake/2026-07-06-A25-next-owner-focus-batch-final-state-recommendation.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=Blocked pending A22 clean-source release package and release-source clean gate; no deploy, cleanup, merge, push, or physical Git command is authorized.
- Authorize approvalId=a06-visualization-lead for owner=A06 visualization lead; selectedFinalState=blocker; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a06-visualization-lead.pathspec, coordination/release-intake/latest-A25-effective-work-order-a06-visualization-lead.md, coordination/release-intake/2026-07-06-A25-next-owner-focus-batch-final-state-recommendation.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=Blocked pending A06 owner-isolated remediation and passing typeCheck, visualizationNodeTests, and visualizationPlaywright; no merge, cleanup, discard, push, deploy, or physical Git command is authorized.
- Authorize approvalId=a12-backend-api-platform for owner=A12 backend/API platform; selectedFinalState=blocker; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a12-backend-api-platform.pathspec, coordination/release-intake/latest-A25-effective-work-order-a12-backend-api-platform.md, coordination/release-intake/2026-07-06-A25-next-owner-focus-batch-final-state-recommendation.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=Blocked pending A25/A10 routing repair and A07/A12 cross-owner split; no merge, cleanup, discard, push, deploy, or physical Git command is authorized.
- Authorize approvalId=a11-qa-and-release-quality for owner=A11 QA and release quality; selectedFinalState=blocker; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a11-qa-and-release-quality.pathspec, coordination/release-intake/latest-A25-effective-work-order-a11-qa-and-release-quality.md, coordination/release-intake/2026-07-06-A25-next-owner-focus-batch-final-state-recommendation.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=Blocked pending upstream owner fixes and A11 regression scope resolution; no merge, cleanup, discard, push, deploy, or physical Git command is authorized.

## Post-Owner-Input Validation

After the owner records these rows in the canonical authorization input, run:

```bash
node coordination/release-intake/assert-next-owner-authorizations-current.mjs
node coordination/release-intake/generate-next-owner-authorization-execution-preview.mjs
node coordination/release-intake/assert-next-owner-authorization-execution-preview-current.mjs
node coordination/release-intake/assert-owner-package-blocker-report-records-current.mjs
node coordination/release-intake/assert-owner-closure-input-readiness-current.mjs
```

Do not run deferred aggregate closure commands until the current compose-worktree deletion hold is explicitly cleared by the owner.
