# A25 Dirty-Worktree Final-State Owner Decision Packet

Generated: 2026-07-02T15:38:55.274Z

Dirty map signature: `aab9818713f7df7ad2d9e281c7534227bc41a877b346ef4339ea49f3b0123cb2`

Expanded dirty entries: 3505

Selection target: `coordination/release-intake/latest-A25-dirty-worktree-final-state-selection.json`

Decision rows needing approval: 57

- P1 owner-package release gates: 2
- P2 owner-package shared/runtime blockers: 3
- P3 owner-package decisions: 6
- P4 owner-package decisions: 13
- Physical root lifecycle: 1
- Dirty linked worktrees: 27
- Clean-diverged linked branches: 5

This packet is approval support only. It does not approve any final state and does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, or worktree removal. To unblock the strict final-state gate, the owner or owning agents must copy the selected rows into `coordination/release-intake/latest-A25-dirty-worktree-final-state-selection.json` with exact allowed final states, approver, timestamp, owner decision, and reviewed evidence.

| Ledger ID | Group | Owner or branch | Current blocker | Allowed final states |
| --- | --- | --- | --- | --- |
| `owner-package:a25-git-hygiene-and-release-intake` | P1 owner-package release gates | A25 git hygiene and release intake | root package has 1768 dirty entries | reviewed commit; owner-approved exact-path discard; evidence archive; blocker |
| `owner-package:a22-production-reliability-and-release-engineering` | P1 owner-package release gates | A22 production reliability and release engineering | root package has 67 dirty entries | reviewed commit; owner-approved exact-path discard; evidence archive; blocker |
| `owner-package:a06-visualization-lead` | P2 owner-package shared/runtime blockers | A06 visualization lead | root package has 445 dirty entries | reviewed commit; owner-approved exact-path discard; evidence archive; blocker |
| `owner-package:a12-backend-api-platform` | P2 owner-package shared/runtime blockers | A12 backend/API platform | root package has 175 dirty entries | reviewed commit; owner-approved exact-path discard; evidence archive; blocker |
| `owner-package:a11-qa-and-release-quality` | P2 owner-package shared/runtime blockers | A11 QA and release quality | root package has 62 dirty entries | reviewed commit; owner-approved exact-path discard; evidence archive; blocker |
| `owner-package:a10-tooling-docs-and-report` | P3 owner-package decisions | A10 tooling, docs, and report | root package has 395 dirty entries | reviewed commit; owner-approved exact-path discard; evidence archive; blocker |
| `owner-package:a18-curriculum-qa-a21-content-pipeline` | P3 owner-package decisions | A18 curriculum QA / A21 content pipeline | root package has 138 dirty entries | reviewed commit; owner-approved exact-path discard; evidence archive; blocker |
| `owner-package:a05-lesson-lead` | P3 owner-package decisions | A05 lesson lead | root package has 126 dirty entries | reviewed commit; owner-approved exact-path discard; evidence archive; blocker |
| `owner-package:a21-content-pipeline-and-rag-operations` | P3 owner-package decisions | A21 content pipeline and RAG operations | root package has 74 dirty entries | reviewed commit; owner-approved exact-path discard; evidence archive; blocker |
| `owner-package:a04-practice-lead` | P3 owner-package decisions | A04 practice lead | root package has 56 dirty entries | reviewed commit; owner-approved exact-path discard; evidence archive; blocker |
| `owner-package:a03-curriculum-roadmap-lead` | P3 owner-package decisions | A03 curriculum roadmap lead | root package has 30 dirty entries | reviewed commit; owner-approved exact-path discard; evidence archive; blocker |
| `owner-package:a13-teacher-console` | P4 owner-package decisions | A13 teacher console | root package has 36 dirty entries | reviewed commit; owner-approved exact-path discard; evidence archive; blocker |
| `owner-package:a01-app-shell-lead` | P4 owner-package decisions | A01 app shell lead | root package has 31 dirty entries | reviewed commit; owner-approved exact-path discard; evidence archive; blocker |
| `owner-package:a02-dashboard-lead` | P4 owner-package decisions | A02 dashboard lead | root package has 21 dirty entries | reviewed commit; owner-approved exact-path discard; evidence archive; blocker |
| `owner-package:a20-game-design-and-game-based-learning` | P4 owner-package decisions | A20 game design and game-based learning | root package has 16 dirty entries | reviewed commit; owner-approved exact-path discard; evidence archive; blocker |
| `owner-package:a07-ai-tutor-lead` | P4 owner-package decisions | A07 AI tutor lead | root package has 12 dirty entries | reviewed commit; owner-approved exact-path discard; evidence archive; blocker |
| `owner-package:a08-state-and-analytics-lead` | P4 owner-package decisions | A08 state and analytics lead | root package has 11 dirty entries | reviewed commit; owner-approved exact-path discard; evidence archive; blocker |
| `owner-package:a15-adaptive-engine-lead` | P4 owner-package decisions | A15 adaptive engine lead | root package has 9 dirty entries | reviewed commit; owner-approved exact-path discard; evidence archive; blocker |
| `owner-package:a24-illustration-exact-layer` | P4 owner-package decisions | A24 illustration exact-layer | root package has 8 dirty entries | reviewed commit; owner-approved exact-path discard; evidence archive; blocker |
| `owner-package:a14-parent-console` | P4 owner-package decisions | A14 parent console | root package has 7 dirty entries | reviewed commit; owner-approved exact-path discard; evidence archive; blocker |
| `owner-package:a16-research-and-learning-science` | P4 owner-package decisions | A16 research and learning science | root package has 6 dirty entries | reviewed commit; owner-approved exact-path discard; evidence archive; blocker |
| `owner-package:a09-copy-i18n-accessibility` | P4 owner-package decisions | A09 copy, i18n, accessibility | root package has 5 dirty entries | reviewed commit; owner-approved exact-path discard; evidence archive; blocker |
| `owner-package:a17-gamification-and-motivation` | P4 owner-package decisions | A17 gamification and motivation | root package has 5 dirty entries | reviewed commit; owner-approved exact-path discard; evidence archive; blocker |
| `owner-package:a23-integration-and-promotion-lead` | P4 owner-package decisions | A23 integration and promotion lead | root package has 2 dirty entries | reviewed commit; owner-approved exact-path discard; evidence archive; blocker |
| `physical:root-main` | Physical root lifecycle | main | dirty 3505 | reviewed owner package commit; owner-approved exact-path discard; evidence archive with release-source blocker; blocker |
| `physical:codex-a01-app-shell-closure` | Dirty linked worktrees | codex/A01-app-shell-closure | dirty 26 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a01-shell-lazy-load` | Dirty linked worktrees | codex/A01-shell-lazy-load | dirty 8 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a02-a15-dashboard-adaptive-closure` | Dirty linked worktrees | codex/A02-A15-dashboard-adaptive-closure | dirty 30 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a03-roadmap-closure` | Dirty linked worktrees | codex/A03-roadmap-closure | dirty 30 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a04-practice-closure` | Dirty linked worktrees | codex/A04-practice-closure | dirty 56 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a05-lesson-closure` | Dirty linked worktrees | codex/A05-lesson-closure | dirty 126 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a06-manim-three-closure` | Dirty linked worktrees | codex/A06-manim-three-closure | dirty 351 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a06-visualization-closure` | Dirty linked worktrees | codex/A06-visualization-closure | dirty 437 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a07-a15-a08-ai-adaptive-types` | Dirty linked worktrees | codex/A07-A15-A08-ai-adaptive-types | dirty 30 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a07-ai-tutor-classroom-switches` | Dirty linked worktrees | codex/A07-ai-tutor-classroom-switches | dirty 82 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a07-ai-tutor-closure` | Dirty linked worktrees | codex/A07-ai-tutor-closure | dirty 12 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a08-a12-shared-contract-closure` | Dirty linked worktrees | codex/A08-A12-shared-contract-closure | dirty 185 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a09-copy-i18n-accessibility-closure` | Dirty linked worktrees | codex/A09-copy-i18n-accessibility-closure | dirty 5 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a10-a22-a08-a12-a06-compose-20260628` | Dirty linked worktrees | codex/A10-A22-A08-A12-A06-compose-20260628 | dirty 744 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a10-a22-release-governance` | Clean-diverged linked branches | codex/A10-A22-release-governance | behind 0, ahead 2 | owner-approved PR or review package; archive-state record; owner-approved branch or worktree retirement; blocker |
| `physical:codex-a11-regression-evidence-closure` | Dirty linked worktrees | codex/A11-regression-evidence-closure | dirty 62 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a12-google-oauth-login` | Dirty linked worktrees | codex/A12-google-oauth-login | dirty 16 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a12-userstore-storage-contract` | Dirty linked worktrees | codex/A12-userstore-storage-contract | dirty 170 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a13-a14-console-closure` | Dirty linked worktrees | codex/A13-A14-console-closure | dirty 43 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a16-research-evidence-closure` | Dirty linked worktrees | codex/A16-research-evidence-closure | dirty 6 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a17-a20-game-motivation-closure` | Dirty linked worktrees | codex/A17-A20-game-motivation-closure | dirty 21 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a18-a21-content-evidence-closure` | Dirty linked worktrees | codex/A18-A21-content-evidence-closure | dirty 222 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a19-vercel-postgres-region` | Clean-diverged linked branches | codex/A19-vercel-postgres-region | behind 0, ahead 8 | owner-approved PR or review package; archive-state record; owner-approved branch or worktree retirement; blocker |
| `physical:codex-a22-missing-module-release-slice` | Dirty linked worktrees | codex/A22-missing-module-release-slice | dirty 1016 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a22-next-15-5-19-audit` | Dirty linked worktrees | codex/A22-next-15-5-19-audit | dirty 4 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a22-p1-release-hygiene-security` | Dirty linked worktrees | codex/A22-p1-release-hygiene-security | dirty 27 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a22-us-region-alignment` | Clean-diverged linked branches | codex/A22-us-region-alignment | behind 0, ahead 1 | owner-approved PR or review package; archive-state record; owner-approved branch or worktree retirement; blocker |
| `physical:codex-a25-dirty-closure-governance` | Dirty linked worktrees | codex/A25-dirty-closure-governance | dirty 1018 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-a25-full-dirty-compose-verification` | Dirty linked worktrees | codex/A25-full-dirty-compose-verification | dirty 2423 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-visualization-production-release` | Dirty linked worktrees | codex/visualization-production-release | dirty 16 | owner-reviewed commit or package extraction; owner-approved exact-path discard; evidence archive with retained-worktree blocker; owner-approved worktree removal after dirty state closure; blocker |
| `physical:codex-california-practice-beta-clean` | Clean-diverged linked branches | codex/california-practice-beta-clean | behind 12, ahead 1 | owner-approved PR or review package; archive-state record; owner-approved branch or worktree retirement; blocker |
| `physical:codex-s22-release-hygiene-2026-06-15` | Clean-diverged linked branches | codex/s22-release-hygiene-2026-06-15 | behind 12, ahead 1 | owner-approved PR or review package; archive-state record; owner-approved branch or worktree retirement; blocker |

## owner-package:a25-git-hygiene-and-release-intake

- Action group: P1 owner-package release gates
- Source kind: owner-package
- Owner or branch: A25 git hygiene and release intake
- Package/lifecycle kind: release-hygiene
- Current blocker: root package has 1768 dirty entries
- Evidence to review:
  - `coordination/release-intake/latest-A25-effective-owner-a25-git-hygiene-and-release-intake.pathspec`
  - `coordination/release-intake/latest-A25-effective-work-order-a25-git-hygiene-and-release-intake.md`
  - `coordination/release-intake/latest-A25-owner-package-approval-requests.json`
- Allowed final states:
  - reviewed commit
  - owner-approved exact-path discard
  - evidence archive
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "owner-package:a25-git-hygiene-and-release-intake",
  "sourceKind": "owner-package",
  "approvalId": "a25-git-hygiene-and-release-intake",
  "owner": "A25 git hygiene and release intake",
  "branch": "",
  "path": "",
  "packageKind": "release-hygiene",
  "priority": 1,
  "entries": 1768,
  "currentBlocker": "root package has 1768 dirty entries",
  "allowedFinalStates": [
    "reviewed commit",
    "owner-approved exact-path discard",
    "evidence archive",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-effective-owner-a25-git-hygiene-and-release-intake.pathspec",
    "coordination/release-intake/latest-A25-effective-work-order-a25-git-hygiene-and-release-intake.md",
    "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## owner-package:a22-production-reliability-and-release-engineering

- Action group: P1 owner-package release gates
- Source kind: owner-package
- Owner or branch: A22 production reliability and release engineering
- Package/lifecycle kind: release-hygiene
- Current blocker: root package has 67 dirty entries
- Evidence to review:
  - `coordination/release-intake/latest-A25-effective-owner-a22-production-reliability-and-release-engineering.pathspec`
  - `coordination/release-intake/latest-A25-effective-work-order-a22-production-reliability-and-release-engineering.md`
  - `coordination/release-intake/latest-A25-owner-package-approval-requests.json`
- Allowed final states:
  - reviewed commit
  - owner-approved exact-path discard
  - evidence archive
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "owner-package:a22-production-reliability-and-release-engineering",
  "sourceKind": "owner-package",
  "approvalId": "a22-production-reliability-and-release-engineering",
  "owner": "A22 production reliability and release engineering",
  "branch": "",
  "path": "",
  "packageKind": "release-hygiene",
  "priority": 1,
  "entries": 67,
  "currentBlocker": "root package has 67 dirty entries",
  "allowedFinalStates": [
    "reviewed commit",
    "owner-approved exact-path discard",
    "evidence archive",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-effective-owner-a22-production-reliability-and-release-engineering.pathspec",
    "coordination/release-intake/latest-A25-effective-work-order-a22-production-reliability-and-release-engineering.md",
    "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## owner-package:a06-visualization-lead

- Action group: P2 owner-package shared/runtime blockers
- Source kind: owner-package
- Owner or branch: A06 visualization lead
- Package/lifecycle kind: runtime
- Current blocker: root package has 445 dirty entries
- Evidence to review:
  - `coordination/release-intake/latest-A25-effective-owner-a06-visualization-lead.pathspec`
  - `coordination/release-intake/latest-A25-effective-work-order-a06-visualization-lead.md`
  - `coordination/release-intake/latest-A25-owner-package-approval-requests.json`
- Allowed final states:
  - reviewed commit
  - owner-approved exact-path discard
  - evidence archive
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "owner-package:a06-visualization-lead",
  "sourceKind": "owner-package",
  "approvalId": "a06-visualization-lead",
  "owner": "A06 visualization lead",
  "branch": "",
  "path": "",
  "packageKind": "runtime",
  "priority": 2,
  "entries": 445,
  "currentBlocker": "root package has 445 dirty entries",
  "allowedFinalStates": [
    "reviewed commit",
    "owner-approved exact-path discard",
    "evidence archive",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-effective-owner-a06-visualization-lead.pathspec",
    "coordination/release-intake/latest-A25-effective-work-order-a06-visualization-lead.md",
    "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## owner-package:a12-backend-api-platform

- Action group: P2 owner-package shared/runtime blockers
- Source kind: owner-package
- Owner or branch: A12 backend/API platform
- Package/lifecycle kind: runtime
- Current blocker: root package has 175 dirty entries
- Evidence to review:
  - `coordination/release-intake/latest-A25-effective-owner-a12-backend-api-platform.pathspec`
  - `coordination/release-intake/latest-A25-effective-work-order-a12-backend-api-platform.md`
  - `coordination/release-intake/latest-A25-owner-package-approval-requests.json`
- Allowed final states:
  - reviewed commit
  - owner-approved exact-path discard
  - evidence archive
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "owner-package:a12-backend-api-platform",
  "sourceKind": "owner-package",
  "approvalId": "a12-backend-api-platform",
  "owner": "A12 backend/API platform",
  "branch": "",
  "path": "",
  "packageKind": "runtime",
  "priority": 2,
  "entries": 175,
  "currentBlocker": "root package has 175 dirty entries",
  "allowedFinalStates": [
    "reviewed commit",
    "owner-approved exact-path discard",
    "evidence archive",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-effective-owner-a12-backend-api-platform.pathspec",
    "coordination/release-intake/latest-A25-effective-work-order-a12-backend-api-platform.md",
    "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## owner-package:a11-qa-and-release-quality

- Action group: P2 owner-package shared/runtime blockers
- Source kind: owner-package
- Owner or branch: A11 QA and release quality
- Package/lifecycle kind: regression-evidence
- Current blocker: root package has 62 dirty entries
- Evidence to review:
  - `coordination/release-intake/latest-A25-effective-owner-a11-qa-and-release-quality.pathspec`
  - `coordination/release-intake/latest-A25-effective-work-order-a11-qa-and-release-quality.md`
  - `coordination/release-intake/latest-A25-owner-package-approval-requests.json`
- Allowed final states:
  - reviewed commit
  - owner-approved exact-path discard
  - evidence archive
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "owner-package:a11-qa-and-release-quality",
  "sourceKind": "owner-package",
  "approvalId": "a11-qa-and-release-quality",
  "owner": "A11 QA and release quality",
  "branch": "",
  "path": "",
  "packageKind": "regression-evidence",
  "priority": 2,
  "entries": 62,
  "currentBlocker": "root package has 62 dirty entries",
  "allowedFinalStates": [
    "reviewed commit",
    "owner-approved exact-path discard",
    "evidence archive",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-effective-owner-a11-qa-and-release-quality.pathspec",
    "coordination/release-intake/latest-A25-effective-work-order-a11-qa-and-release-quality.md",
    "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## owner-package:a10-tooling-docs-and-report

- Action group: P3 owner-package decisions
- Source kind: owner-package
- Owner or branch: A10 tooling, docs, and report
- Package/lifecycle kind: release-hygiene
- Current blocker: root package has 395 dirty entries
- Evidence to review:
  - `coordination/release-intake/latest-A25-effective-owner-a10-tooling-docs-and-report.pathspec`
  - `coordination/release-intake/latest-A25-effective-work-order-a10-tooling-docs-and-report.md`
  - `coordination/release-intake/latest-A25-owner-package-approval-requests.json`
- Allowed final states:
  - reviewed commit
  - owner-approved exact-path discard
  - evidence archive
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "owner-package:a10-tooling-docs-and-report",
  "sourceKind": "owner-package",
  "approvalId": "a10-tooling-docs-and-report",
  "owner": "A10 tooling, docs, and report",
  "branch": "",
  "path": "",
  "packageKind": "release-hygiene",
  "priority": 3,
  "entries": 395,
  "currentBlocker": "root package has 395 dirty entries",
  "allowedFinalStates": [
    "reviewed commit",
    "owner-approved exact-path discard",
    "evidence archive",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-effective-owner-a10-tooling-docs-and-report.pathspec",
    "coordination/release-intake/latest-A25-effective-work-order-a10-tooling-docs-and-report.md",
    "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## owner-package:a18-curriculum-qa-a21-content-pipeline

- Action group: P3 owner-package decisions
- Source kind: owner-package
- Owner or branch: A18 curriculum QA / A21 content pipeline
- Package/lifecycle kind: runtime
- Current blocker: root package has 138 dirty entries
- Evidence to review:
  - `coordination/release-intake/latest-A25-effective-owner-a18-curriculum-qa-a21-content-pipeline.pathspec`
  - `coordination/release-intake/latest-A25-effective-work-order-a18-curriculum-qa-a21-content-pipeline.md`
  - `coordination/release-intake/latest-A25-owner-package-approval-requests.json`
- Allowed final states:
  - reviewed commit
  - owner-approved exact-path discard
  - evidence archive
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "owner-package:a18-curriculum-qa-a21-content-pipeline",
  "sourceKind": "owner-package",
  "approvalId": "a18-curriculum-qa-a21-content-pipeline",
  "owner": "A18 curriculum QA / A21 content pipeline",
  "branch": "",
  "path": "",
  "packageKind": "runtime",
  "priority": 3,
  "entries": 138,
  "currentBlocker": "root package has 138 dirty entries",
  "allowedFinalStates": [
    "reviewed commit",
    "owner-approved exact-path discard",
    "evidence archive",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-effective-owner-a18-curriculum-qa-a21-content-pipeline.pathspec",
    "coordination/release-intake/latest-A25-effective-work-order-a18-curriculum-qa-a21-content-pipeline.md",
    "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## owner-package:a05-lesson-lead

- Action group: P3 owner-package decisions
- Source kind: owner-package
- Owner or branch: A05 lesson lead
- Package/lifecycle kind: runtime
- Current blocker: root package has 126 dirty entries
- Evidence to review:
  - `coordination/release-intake/latest-A25-effective-owner-a05-lesson-lead.pathspec`
  - `coordination/release-intake/latest-A25-effective-work-order-a05-lesson-lead.md`
  - `coordination/release-intake/latest-A25-owner-package-approval-requests.json`
- Allowed final states:
  - reviewed commit
  - owner-approved exact-path discard
  - evidence archive
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "owner-package:a05-lesson-lead",
  "sourceKind": "owner-package",
  "approvalId": "a05-lesson-lead",
  "owner": "A05 lesson lead",
  "branch": "",
  "path": "",
  "packageKind": "runtime",
  "priority": 3,
  "entries": 126,
  "currentBlocker": "root package has 126 dirty entries",
  "allowedFinalStates": [
    "reviewed commit",
    "owner-approved exact-path discard",
    "evidence archive",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-effective-owner-a05-lesson-lead.pathspec",
    "coordination/release-intake/latest-A25-effective-work-order-a05-lesson-lead.md",
    "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## owner-package:a21-content-pipeline-and-rag-operations

- Action group: P3 owner-package decisions
- Source kind: owner-package
- Owner or branch: A21 content pipeline and RAG operations
- Package/lifecycle kind: regression-evidence
- Current blocker: root package has 74 dirty entries
- Evidence to review:
  - `coordination/release-intake/latest-A25-effective-owner-a21-content-pipeline-and-rag-operations.pathspec`
  - `coordination/release-intake/latest-A25-effective-work-order-a21-content-pipeline-and-rag-operations.md`
  - `coordination/release-intake/latest-A25-owner-package-approval-requests.json`
- Allowed final states:
  - reviewed commit
  - owner-approved exact-path discard
  - evidence archive
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "owner-package:a21-content-pipeline-and-rag-operations",
  "sourceKind": "owner-package",
  "approvalId": "a21-content-pipeline-and-rag-operations",
  "owner": "A21 content pipeline and RAG operations",
  "branch": "",
  "path": "",
  "packageKind": "regression-evidence",
  "priority": 3,
  "entries": 74,
  "currentBlocker": "root package has 74 dirty entries",
  "allowedFinalStates": [
    "reviewed commit",
    "owner-approved exact-path discard",
    "evidence archive",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-effective-owner-a21-content-pipeline-and-rag-operations.pathspec",
    "coordination/release-intake/latest-A25-effective-work-order-a21-content-pipeline-and-rag-operations.md",
    "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## owner-package:a04-practice-lead

- Action group: P3 owner-package decisions
- Source kind: owner-package
- Owner or branch: A04 practice lead
- Package/lifecycle kind: runtime
- Current blocker: root package has 56 dirty entries
- Evidence to review:
  - `coordination/release-intake/latest-A25-effective-owner-a04-practice-lead.pathspec`
  - `coordination/release-intake/latest-A25-effective-work-order-a04-practice-lead.md`
  - `coordination/release-intake/latest-A25-owner-package-approval-requests.json`
- Allowed final states:
  - reviewed commit
  - owner-approved exact-path discard
  - evidence archive
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "owner-package:a04-practice-lead",
  "sourceKind": "owner-package",
  "approvalId": "a04-practice-lead",
  "owner": "A04 practice lead",
  "branch": "",
  "path": "",
  "packageKind": "runtime",
  "priority": 3,
  "entries": 56,
  "currentBlocker": "root package has 56 dirty entries",
  "allowedFinalStates": [
    "reviewed commit",
    "owner-approved exact-path discard",
    "evidence archive",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-effective-owner-a04-practice-lead.pathspec",
    "coordination/release-intake/latest-A25-effective-work-order-a04-practice-lead.md",
    "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## owner-package:a03-curriculum-roadmap-lead

- Action group: P3 owner-package decisions
- Source kind: owner-package
- Owner or branch: A03 curriculum roadmap lead
- Package/lifecycle kind: runtime
- Current blocker: root package has 30 dirty entries
- Evidence to review:
  - `coordination/release-intake/latest-A25-effective-owner-a03-curriculum-roadmap-lead.pathspec`
  - `coordination/release-intake/latest-A25-effective-work-order-a03-curriculum-roadmap-lead.md`
  - `coordination/release-intake/latest-A25-owner-package-approval-requests.json`
- Allowed final states:
  - reviewed commit
  - owner-approved exact-path discard
  - evidence archive
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "owner-package:a03-curriculum-roadmap-lead",
  "sourceKind": "owner-package",
  "approvalId": "a03-curriculum-roadmap-lead",
  "owner": "A03 curriculum roadmap lead",
  "branch": "",
  "path": "",
  "packageKind": "runtime",
  "priority": 3,
  "entries": 30,
  "currentBlocker": "root package has 30 dirty entries",
  "allowedFinalStates": [
    "reviewed commit",
    "owner-approved exact-path discard",
    "evidence archive",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-effective-owner-a03-curriculum-roadmap-lead.pathspec",
    "coordination/release-intake/latest-A25-effective-work-order-a03-curriculum-roadmap-lead.md",
    "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## owner-package:a13-teacher-console

- Action group: P4 owner-package decisions
- Source kind: owner-package
- Owner or branch: A13 teacher console
- Package/lifecycle kind: runtime
- Current blocker: root package has 36 dirty entries
- Evidence to review:
  - `coordination/release-intake/latest-A25-effective-owner-a13-teacher-console.pathspec`
  - `coordination/release-intake/latest-A25-effective-work-order-a13-teacher-console.md`
  - `coordination/release-intake/latest-A25-owner-package-approval-requests.json`
- Allowed final states:
  - reviewed commit
  - owner-approved exact-path discard
  - evidence archive
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "owner-package:a13-teacher-console",
  "sourceKind": "owner-package",
  "approvalId": "a13-teacher-console",
  "owner": "A13 teacher console",
  "branch": "",
  "path": "",
  "packageKind": "runtime",
  "priority": 4,
  "entries": 36,
  "currentBlocker": "root package has 36 dirty entries",
  "allowedFinalStates": [
    "reviewed commit",
    "owner-approved exact-path discard",
    "evidence archive",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-effective-owner-a13-teacher-console.pathspec",
    "coordination/release-intake/latest-A25-effective-work-order-a13-teacher-console.md",
    "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## owner-package:a01-app-shell-lead

- Action group: P4 owner-package decisions
- Source kind: owner-package
- Owner or branch: A01 app shell lead
- Package/lifecycle kind: runtime
- Current blocker: root package has 31 dirty entries
- Evidence to review:
  - `coordination/release-intake/latest-A25-effective-owner-a01-app-shell-lead.pathspec`
  - `coordination/release-intake/latest-A25-effective-work-order-a01-app-shell-lead.md`
  - `coordination/release-intake/latest-A25-owner-package-approval-requests.json`
- Allowed final states:
  - reviewed commit
  - owner-approved exact-path discard
  - evidence archive
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "owner-package:a01-app-shell-lead",
  "sourceKind": "owner-package",
  "approvalId": "a01-app-shell-lead",
  "owner": "A01 app shell lead",
  "branch": "",
  "path": "",
  "packageKind": "runtime",
  "priority": 4,
  "entries": 31,
  "currentBlocker": "root package has 31 dirty entries",
  "allowedFinalStates": [
    "reviewed commit",
    "owner-approved exact-path discard",
    "evidence archive",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-effective-owner-a01-app-shell-lead.pathspec",
    "coordination/release-intake/latest-A25-effective-work-order-a01-app-shell-lead.md",
    "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## owner-package:a02-dashboard-lead

- Action group: P4 owner-package decisions
- Source kind: owner-package
- Owner or branch: A02 dashboard lead
- Package/lifecycle kind: runtime
- Current blocker: root package has 21 dirty entries
- Evidence to review:
  - `coordination/release-intake/latest-A25-effective-owner-a02-dashboard-lead.pathspec`
  - `coordination/release-intake/latest-A25-effective-work-order-a02-dashboard-lead.md`
  - `coordination/release-intake/latest-A25-owner-package-approval-requests.json`
- Allowed final states:
  - reviewed commit
  - owner-approved exact-path discard
  - evidence archive
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "owner-package:a02-dashboard-lead",
  "sourceKind": "owner-package",
  "approvalId": "a02-dashboard-lead",
  "owner": "A02 dashboard lead",
  "branch": "",
  "path": "",
  "packageKind": "runtime",
  "priority": 4,
  "entries": 21,
  "currentBlocker": "root package has 21 dirty entries",
  "allowedFinalStates": [
    "reviewed commit",
    "owner-approved exact-path discard",
    "evidence archive",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-effective-owner-a02-dashboard-lead.pathspec",
    "coordination/release-intake/latest-A25-effective-work-order-a02-dashboard-lead.md",
    "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## owner-package:a20-game-design-and-game-based-learning

- Action group: P4 owner-package decisions
- Source kind: owner-package
- Owner or branch: A20 game design and game-based learning
- Package/lifecycle kind: runtime
- Current blocker: root package has 16 dirty entries
- Evidence to review:
  - `coordination/release-intake/latest-A25-effective-owner-a20-game-design-and-game-based-learning.pathspec`
  - `coordination/release-intake/latest-A25-effective-work-order-a20-game-design-and-game-based-learning.md`
  - `coordination/release-intake/latest-A25-owner-package-approval-requests.json`
- Allowed final states:
  - reviewed commit
  - owner-approved exact-path discard
  - evidence archive
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "owner-package:a20-game-design-and-game-based-learning",
  "sourceKind": "owner-package",
  "approvalId": "a20-game-design-and-game-based-learning",
  "owner": "A20 game design and game-based learning",
  "branch": "",
  "path": "",
  "packageKind": "runtime",
  "priority": 4,
  "entries": 16,
  "currentBlocker": "root package has 16 dirty entries",
  "allowedFinalStates": [
    "reviewed commit",
    "owner-approved exact-path discard",
    "evidence archive",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-effective-owner-a20-game-design-and-game-based-learning.pathspec",
    "coordination/release-intake/latest-A25-effective-work-order-a20-game-design-and-game-based-learning.md",
    "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## owner-package:a07-ai-tutor-lead

- Action group: P4 owner-package decisions
- Source kind: owner-package
- Owner or branch: A07 AI tutor lead
- Package/lifecycle kind: runtime
- Current blocker: root package has 12 dirty entries
- Evidence to review:
  - `coordination/release-intake/latest-A25-effective-owner-a07-ai-tutor-lead.pathspec`
  - `coordination/release-intake/latest-A25-effective-work-order-a07-ai-tutor-lead.md`
  - `coordination/release-intake/latest-A25-owner-package-approval-requests.json`
- Allowed final states:
  - reviewed commit
  - owner-approved exact-path discard
  - evidence archive
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "owner-package:a07-ai-tutor-lead",
  "sourceKind": "owner-package",
  "approvalId": "a07-ai-tutor-lead",
  "owner": "A07 AI tutor lead",
  "branch": "",
  "path": "",
  "packageKind": "runtime",
  "priority": 4,
  "entries": 12,
  "currentBlocker": "root package has 12 dirty entries",
  "allowedFinalStates": [
    "reviewed commit",
    "owner-approved exact-path discard",
    "evidence archive",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-effective-owner-a07-ai-tutor-lead.pathspec",
    "coordination/release-intake/latest-A25-effective-work-order-a07-ai-tutor-lead.md",
    "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## owner-package:a08-state-and-analytics-lead

- Action group: P4 owner-package decisions
- Source kind: owner-package
- Owner or branch: A08 state and analytics lead
- Package/lifecycle kind: runtime
- Current blocker: root package has 11 dirty entries
- Evidence to review:
  - `coordination/release-intake/latest-A25-effective-owner-a08-state-and-analytics-lead.pathspec`
  - `coordination/release-intake/latest-A25-effective-work-order-a08-state-and-analytics-lead.md`
  - `coordination/release-intake/latest-A25-owner-package-approval-requests.json`
- Allowed final states:
  - reviewed commit
  - owner-approved exact-path discard
  - evidence archive
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "owner-package:a08-state-and-analytics-lead",
  "sourceKind": "owner-package",
  "approvalId": "a08-state-and-analytics-lead",
  "owner": "A08 state and analytics lead",
  "branch": "",
  "path": "",
  "packageKind": "runtime",
  "priority": 4,
  "entries": 11,
  "currentBlocker": "root package has 11 dirty entries",
  "allowedFinalStates": [
    "reviewed commit",
    "owner-approved exact-path discard",
    "evidence archive",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-effective-owner-a08-state-and-analytics-lead.pathspec",
    "coordination/release-intake/latest-A25-effective-work-order-a08-state-and-analytics-lead.md",
    "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## owner-package:a15-adaptive-engine-lead

- Action group: P4 owner-package decisions
- Source kind: owner-package
- Owner or branch: A15 adaptive engine lead
- Package/lifecycle kind: runtime
- Current blocker: root package has 9 dirty entries
- Evidence to review:
  - `coordination/release-intake/latest-A25-effective-owner-a15-adaptive-engine-lead.pathspec`
  - `coordination/release-intake/latest-A25-effective-work-order-a15-adaptive-engine-lead.md`
  - `coordination/release-intake/latest-A25-owner-package-approval-requests.json`
- Allowed final states:
  - reviewed commit
  - owner-approved exact-path discard
  - evidence archive
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "owner-package:a15-adaptive-engine-lead",
  "sourceKind": "owner-package",
  "approvalId": "a15-adaptive-engine-lead",
  "owner": "A15 adaptive engine lead",
  "branch": "",
  "path": "",
  "packageKind": "runtime",
  "priority": 4,
  "entries": 9,
  "currentBlocker": "root package has 9 dirty entries",
  "allowedFinalStates": [
    "reviewed commit",
    "owner-approved exact-path discard",
    "evidence archive",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-effective-owner-a15-adaptive-engine-lead.pathspec",
    "coordination/release-intake/latest-A25-effective-work-order-a15-adaptive-engine-lead.md",
    "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## owner-package:a24-illustration-exact-layer

- Action group: P4 owner-package decisions
- Source kind: owner-package
- Owner or branch: A24 illustration exact-layer
- Package/lifecycle kind: runtime
- Current blocker: root package has 8 dirty entries
- Evidence to review:
  - `coordination/release-intake/latest-A25-effective-owner-a24-illustration-exact-layer.pathspec`
  - `coordination/release-intake/latest-A25-effective-work-order-a24-illustration-exact-layer.md`
  - `coordination/release-intake/latest-A25-owner-package-approval-requests.json`
- Allowed final states:
  - reviewed commit
  - owner-approved exact-path discard
  - evidence archive
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "owner-package:a24-illustration-exact-layer",
  "sourceKind": "owner-package",
  "approvalId": "a24-illustration-exact-layer",
  "owner": "A24 illustration exact-layer",
  "branch": "",
  "path": "",
  "packageKind": "runtime",
  "priority": 4,
  "entries": 8,
  "currentBlocker": "root package has 8 dirty entries",
  "allowedFinalStates": [
    "reviewed commit",
    "owner-approved exact-path discard",
    "evidence archive",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-effective-owner-a24-illustration-exact-layer.pathspec",
    "coordination/release-intake/latest-A25-effective-work-order-a24-illustration-exact-layer.md",
    "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## owner-package:a14-parent-console

- Action group: P4 owner-package decisions
- Source kind: owner-package
- Owner or branch: A14 parent console
- Package/lifecycle kind: runtime
- Current blocker: root package has 7 dirty entries
- Evidence to review:
  - `coordination/release-intake/latest-A25-effective-owner-a14-parent-console.pathspec`
  - `coordination/release-intake/latest-A25-effective-work-order-a14-parent-console.md`
  - `coordination/release-intake/latest-A25-owner-package-approval-requests.json`
- Allowed final states:
  - reviewed commit
  - owner-approved exact-path discard
  - evidence archive
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "owner-package:a14-parent-console",
  "sourceKind": "owner-package",
  "approvalId": "a14-parent-console",
  "owner": "A14 parent console",
  "branch": "",
  "path": "",
  "packageKind": "runtime",
  "priority": 4,
  "entries": 7,
  "currentBlocker": "root package has 7 dirty entries",
  "allowedFinalStates": [
    "reviewed commit",
    "owner-approved exact-path discard",
    "evidence archive",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-effective-owner-a14-parent-console.pathspec",
    "coordination/release-intake/latest-A25-effective-work-order-a14-parent-console.md",
    "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## owner-package:a16-research-and-learning-science

- Action group: P4 owner-package decisions
- Source kind: owner-package
- Owner or branch: A16 research and learning science
- Package/lifecycle kind: coordination-evidence
- Current blocker: root package has 6 dirty entries
- Evidence to review:
  - `coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec`
  - `coordination/release-intake/latest-A25-effective-work-order-a16-research-and-learning-science.md`
  - `coordination/release-intake/latest-A25-owner-package-approval-requests.json`
- Allowed final states:
  - reviewed commit
  - owner-approved exact-path discard
  - evidence archive
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "owner-package:a16-research-and-learning-science",
  "sourceKind": "owner-package",
  "approvalId": "a16-research-and-learning-science",
  "owner": "A16 research and learning science",
  "branch": "",
  "path": "",
  "packageKind": "coordination-evidence",
  "priority": 4,
  "entries": 6,
  "currentBlocker": "root package has 6 dirty entries",
  "allowedFinalStates": [
    "reviewed commit",
    "owner-approved exact-path discard",
    "evidence archive",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec",
    "coordination/release-intake/latest-A25-effective-work-order-a16-research-and-learning-science.md",
    "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## owner-package:a09-copy-i18n-accessibility

- Action group: P4 owner-package decisions
- Source kind: owner-package
- Owner or branch: A09 copy, i18n, accessibility
- Package/lifecycle kind: runtime
- Current blocker: root package has 5 dirty entries
- Evidence to review:
  - `coordination/release-intake/latest-A25-effective-owner-a09-copy-i18n-accessibility.pathspec`
  - `coordination/release-intake/latest-A25-effective-work-order-a09-copy-i18n-accessibility.md`
  - `coordination/release-intake/latest-A25-owner-package-approval-requests.json`
- Allowed final states:
  - reviewed commit
  - owner-approved exact-path discard
  - evidence archive
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "owner-package:a09-copy-i18n-accessibility",
  "sourceKind": "owner-package",
  "approvalId": "a09-copy-i18n-accessibility",
  "owner": "A09 copy, i18n, accessibility",
  "branch": "",
  "path": "",
  "packageKind": "runtime",
  "priority": 4,
  "entries": 5,
  "currentBlocker": "root package has 5 dirty entries",
  "allowedFinalStates": [
    "reviewed commit",
    "owner-approved exact-path discard",
    "evidence archive",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-effective-owner-a09-copy-i18n-accessibility.pathspec",
    "coordination/release-intake/latest-A25-effective-work-order-a09-copy-i18n-accessibility.md",
    "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## owner-package:a17-gamification-and-motivation

- Action group: P4 owner-package decisions
- Source kind: owner-package
- Owner or branch: A17 gamification and motivation
- Package/lifecycle kind: runtime
- Current blocker: root package has 5 dirty entries
- Evidence to review:
  - `coordination/release-intake/latest-A25-effective-owner-a17-gamification-and-motivation.pathspec`
  - `coordination/release-intake/latest-A25-effective-work-order-a17-gamification-and-motivation.md`
  - `coordination/release-intake/latest-A25-owner-package-approval-requests.json`
- Allowed final states:
  - reviewed commit
  - owner-approved exact-path discard
  - evidence archive
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "owner-package:a17-gamification-and-motivation",
  "sourceKind": "owner-package",
  "approvalId": "a17-gamification-and-motivation",
  "owner": "A17 gamification and motivation",
  "branch": "",
  "path": "",
  "packageKind": "runtime",
  "priority": 4,
  "entries": 5,
  "currentBlocker": "root package has 5 dirty entries",
  "allowedFinalStates": [
    "reviewed commit",
    "owner-approved exact-path discard",
    "evidence archive",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-effective-owner-a17-gamification-and-motivation.pathspec",
    "coordination/release-intake/latest-A25-effective-work-order-a17-gamification-and-motivation.md",
    "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## owner-package:a23-integration-and-promotion-lead

- Action group: P4 owner-package decisions
- Source kind: owner-package
- Owner or branch: A23 integration and promotion lead
- Package/lifecycle kind: coordination-evidence
- Current blocker: root package has 2 dirty entries
- Evidence to review:
  - `coordination/release-intake/latest-A25-effective-owner-a23-integration-and-promotion-lead.pathspec`
  - `coordination/release-intake/latest-A25-effective-work-order-a23-integration-and-promotion-lead.md`
  - `coordination/release-intake/latest-A25-owner-package-approval-requests.json`
- Allowed final states:
  - reviewed commit
  - owner-approved exact-path discard
  - evidence archive
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "owner-package:a23-integration-and-promotion-lead",
  "sourceKind": "owner-package",
  "approvalId": "a23-integration-and-promotion-lead",
  "owner": "A23 integration and promotion lead",
  "branch": "",
  "path": "",
  "packageKind": "coordination-evidence",
  "priority": 4,
  "entries": 2,
  "currentBlocker": "root package has 2 dirty entries",
  "allowedFinalStates": [
    "reviewed commit",
    "owner-approved exact-path discard",
    "evidence archive",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-effective-owner-a23-integration-and-promotion-lead.pathspec",
    "coordination/release-intake/latest-A25-effective-work-order-a23-integration-and-promotion-lead.md",
    "coordination/release-intake/latest-A25-owner-package-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:root-main

- Action group: Physical root lifecycle
- Source kind: physical-lifecycle
- Owner or branch: main
- Package/lifecycle kind: root-owner-package
- Current blocker: dirty 3505
- Evidence to review:
  - `coordination/release-intake/latest-A25-dirty-tree-map.md`
  - `coordination/release-intake/latest-A25-effective-disposition-queue.md`
  - `coordination/release-intake/latest-A25-owner-disposition-queue.md`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - reviewed owner package commit
  - owner-approved exact-path discard
  - evidence archive with release-source blocker
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:root-main",
  "sourceKind": "physical-lifecycle",
  "approvalId": "root-main",
  "owner": "A25, A10, A22, effective file owners",
  "branch": "main",
  "path": "/Users/dongpinhu/Desktop/MAIS-MVP",
  "packageKind": "root-owner-package",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 3505",
  "allowedFinalStates": [
    "reviewed owner package commit",
    "owner-approved exact-path discard",
    "evidence archive with release-source blocker",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/latest-A25-dirty-tree-map.md",
    "coordination/release-intake/latest-A25-effective-disposition-queue.md",
    "coordination/release-intake/latest-A25-owner-disposition-queue.md",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a01-app-shell-closure

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A01-app-shell-closure
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 26
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A01-app-shell-closure.status.txt`
  - `coordination/release-intake/archive/codex-A01-app-shell-closure.diffstat.txt`
  - `coordination/release-intake/archive/codex-A01-app-shell-closure.patch`
  - `coordination/release-intake/archive/codex-A01-app-shell-closure.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a01-app-shell-closure",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a01-app-shell-closure",
  "owner": "A01",
  "branch": "codex/A01-app-shell-closure",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A01-app-shell-closure",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 26",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A01-app-shell-closure.status.txt",
    "coordination/release-intake/archive/codex-A01-app-shell-closure.diffstat.txt",
    "coordination/release-intake/archive/codex-A01-app-shell-closure.patch",
    "coordination/release-intake/archive/codex-A01-app-shell-closure.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a01-shell-lazy-load

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A01-shell-lazy-load
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 8
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A01-shell-lazy-load.status.txt`
  - `coordination/release-intake/archive/codex-A01-shell-lazy-load.diffstat.txt`
  - `coordination/release-intake/archive/codex-A01-shell-lazy-load.patch`
  - `coordination/release-intake/archive/codex-A01-shell-lazy-load.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a01-shell-lazy-load",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a01-shell-lazy-load",
  "owner": "A01",
  "branch": "codex/A01-shell-lazy-load",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A01-shell-lazy-load",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 8",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A01-shell-lazy-load.status.txt",
    "coordination/release-intake/archive/codex-A01-shell-lazy-load.diffstat.txt",
    "coordination/release-intake/archive/codex-A01-shell-lazy-load.patch",
    "coordination/release-intake/archive/codex-A01-shell-lazy-load.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a02-a15-dashboard-adaptive-closure

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A02-A15-dashboard-adaptive-closure
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 30
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A02-A15-dashboard-adaptive-closure.status.txt`
  - `coordination/release-intake/archive/codex-A02-A15-dashboard-adaptive-closure.diffstat.txt`
  - `coordination/release-intake/archive/codex-A02-A15-dashboard-adaptive-closure.patch`
  - `coordination/release-intake/archive/codex-A02-A15-dashboard-adaptive-closure.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a02-a15-dashboard-adaptive-closure",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a02-a15-dashboard-adaptive-closure",
  "owner": "A02, A15",
  "branch": "codex/A02-A15-dashboard-adaptive-closure",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A02-A15-dashboard-adaptive-closure",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 30",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A02-A15-dashboard-adaptive-closure.status.txt",
    "coordination/release-intake/archive/codex-A02-A15-dashboard-adaptive-closure.diffstat.txt",
    "coordination/release-intake/archive/codex-A02-A15-dashboard-adaptive-closure.patch",
    "coordination/release-intake/archive/codex-A02-A15-dashboard-adaptive-closure.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a03-roadmap-closure

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A03-roadmap-closure
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 30
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A03-roadmap-closure.status.txt`
  - `coordination/release-intake/archive/codex-A03-roadmap-closure.diffstat.txt`
  - `coordination/release-intake/archive/codex-A03-roadmap-closure.patch`
  - `coordination/release-intake/archive/codex-A03-roadmap-closure.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a03-roadmap-closure",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a03-roadmap-closure",
  "owner": "A03",
  "branch": "codex/A03-roadmap-closure",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A03-roadmap-closure",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 30",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A03-roadmap-closure.status.txt",
    "coordination/release-intake/archive/codex-A03-roadmap-closure.diffstat.txt",
    "coordination/release-intake/archive/codex-A03-roadmap-closure.patch",
    "coordination/release-intake/archive/codex-A03-roadmap-closure.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a04-practice-closure

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A04-practice-closure
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 56
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A04-practice-closure.status.txt`
  - `coordination/release-intake/archive/codex-A04-practice-closure.diffstat.txt`
  - `coordination/release-intake/archive/codex-A04-practice-closure.patch`
  - `coordination/release-intake/archive/codex-A04-practice-closure.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a04-practice-closure",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a04-practice-closure",
  "owner": "A04",
  "branch": "codex/A04-practice-closure",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A04-practice-closure",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 56",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A04-practice-closure.status.txt",
    "coordination/release-intake/archive/codex-A04-practice-closure.diffstat.txt",
    "coordination/release-intake/archive/codex-A04-practice-closure.patch",
    "coordination/release-intake/archive/codex-A04-practice-closure.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a05-lesson-closure

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A05-lesson-closure
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 126
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A05-lesson-closure.status.txt`
  - `coordination/release-intake/archive/codex-A05-lesson-closure.diffstat.txt`
  - `coordination/release-intake/archive/codex-A05-lesson-closure.patch`
  - `coordination/release-intake/archive/codex-A05-lesson-closure.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a05-lesson-closure",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a05-lesson-closure",
  "owner": "A05",
  "branch": "codex/A05-lesson-closure",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A05-lesson-closure",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 126",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A05-lesson-closure.status.txt",
    "coordination/release-intake/archive/codex-A05-lesson-closure.diffstat.txt",
    "coordination/release-intake/archive/codex-A05-lesson-closure.patch",
    "coordination/release-intake/archive/codex-A05-lesson-closure.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a06-manim-three-closure

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A06-manim-three-closure
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 351
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A06-manim-three-closure.status.txt`
  - `coordination/release-intake/archive/codex-A06-manim-three-closure.diffstat.txt`
  - `coordination/release-intake/archive/codex-A06-manim-three-closure.patch`
  - `coordination/release-intake/archive/codex-A06-manim-three-closure.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a06-manim-three-closure",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a06-manim-three-closure",
  "owner": "A06",
  "branch": "codex/A06-manim-three-closure",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-manim-three-closure",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 351",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A06-manim-three-closure.status.txt",
    "coordination/release-intake/archive/codex-A06-manim-three-closure.diffstat.txt",
    "coordination/release-intake/archive/codex-A06-manim-three-closure.patch",
    "coordination/release-intake/archive/codex-A06-manim-three-closure.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a06-visualization-closure

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A06-visualization-closure
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 437
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A06-visualization-closure.status.txt`
  - `coordination/release-intake/archive/codex-A06-visualization-closure.diffstat.txt`
  - `coordination/release-intake/archive/codex-A06-visualization-closure.patch`
  - `coordination/release-intake/archive/codex-A06-visualization-closure.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a06-visualization-closure",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a06-visualization-closure",
  "owner": "A06, A22",
  "branch": "codex/A06-visualization-closure",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-visualization-closure",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 437",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A06-visualization-closure.status.txt",
    "coordination/release-intake/archive/codex-A06-visualization-closure.diffstat.txt",
    "coordination/release-intake/archive/codex-A06-visualization-closure.patch",
    "coordination/release-intake/archive/codex-A06-visualization-closure.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a07-a15-a08-ai-adaptive-types

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A07-A15-A08-ai-adaptive-types
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 30
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A07-A15-A08-ai-adaptive-types.status.txt`
  - `coordination/release-intake/archive/codex-A07-A15-A08-ai-adaptive-types.diffstat.txt`
  - `coordination/release-intake/archive/codex-A07-A15-A08-ai-adaptive-types.patch`
  - `coordination/release-intake/archive/codex-A07-A15-A08-ai-adaptive-types.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a07-a15-a08-ai-adaptive-types",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a07-a15-a08-ai-adaptive-types",
  "owner": "A07, A08, A15",
  "branch": "codex/A07-A15-A08-ai-adaptive-types",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-A15-A08-ai-adaptive-types",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 30",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A07-A15-A08-ai-adaptive-types.status.txt",
    "coordination/release-intake/archive/codex-A07-A15-A08-ai-adaptive-types.diffstat.txt",
    "coordination/release-intake/archive/codex-A07-A15-A08-ai-adaptive-types.patch",
    "coordination/release-intake/archive/codex-A07-A15-A08-ai-adaptive-types.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a07-ai-tutor-classroom-switches

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A07-ai-tutor-classroom-switches
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 82
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A07-ai-tutor-classroom-switches.status.txt`
  - `coordination/release-intake/archive/codex-A07-ai-tutor-classroom-switches.diffstat.txt`
  - `coordination/release-intake/archive/codex-A07-ai-tutor-classroom-switches.patch`
  - `coordination/release-intake/archive/codex-A07-ai-tutor-classroom-switches.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a07-ai-tutor-classroom-switches",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a07-ai-tutor-classroom-switches",
  "owner": "A07",
  "branch": "codex/A07-ai-tutor-classroom-switches",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-ai-tutor-classroom-switches",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 82",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A07-ai-tutor-classroom-switches.status.txt",
    "coordination/release-intake/archive/codex-A07-ai-tutor-classroom-switches.diffstat.txt",
    "coordination/release-intake/archive/codex-A07-ai-tutor-classroom-switches.patch",
    "coordination/release-intake/archive/codex-A07-ai-tutor-classroom-switches.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a07-ai-tutor-closure

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A07-ai-tutor-closure
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 12
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A07-ai-tutor-closure.status.txt`
  - `coordination/release-intake/archive/codex-A07-ai-tutor-closure.diffstat.txt`
  - `coordination/release-intake/archive/codex-A07-ai-tutor-closure.patch`
  - `coordination/release-intake/archive/codex-A07-ai-tutor-closure.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a07-ai-tutor-closure",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a07-ai-tutor-closure",
  "owner": "A07",
  "branch": "codex/A07-ai-tutor-closure",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-ai-tutor-closure",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 12",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A07-ai-tutor-closure.status.txt",
    "coordination/release-intake/archive/codex-A07-ai-tutor-closure.diffstat.txt",
    "coordination/release-intake/archive/codex-A07-ai-tutor-closure.patch",
    "coordination/release-intake/archive/codex-A07-ai-tutor-closure.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a08-a12-shared-contract-closure

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A08-A12-shared-contract-closure
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 185
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A08-A12-shared-contract-closure.status.txt`
  - `coordination/release-intake/archive/codex-A08-A12-shared-contract-closure.diffstat.txt`
  - `coordination/release-intake/archive/codex-A08-A12-shared-contract-closure.patch`
  - `coordination/release-intake/archive/codex-A08-A12-shared-contract-closure.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a08-a12-shared-contract-closure",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a08-a12-shared-contract-closure",
  "owner": "A08, A12",
  "branch": "codex/A08-A12-shared-contract-closure",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A08-A12-shared-contract-closure",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 185",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A08-A12-shared-contract-closure.status.txt",
    "coordination/release-intake/archive/codex-A08-A12-shared-contract-closure.diffstat.txt",
    "coordination/release-intake/archive/codex-A08-A12-shared-contract-closure.patch",
    "coordination/release-intake/archive/codex-A08-A12-shared-contract-closure.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a09-copy-i18n-accessibility-closure

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A09-copy-i18n-accessibility-closure
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 5
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A09-copy-i18n-accessibility-closure.status.txt`
  - `coordination/release-intake/archive/codex-A09-copy-i18n-accessibility-closure.diffstat.txt`
  - `coordination/release-intake/archive/codex-A09-copy-i18n-accessibility-closure.patch`
  - `coordination/release-intake/archive/codex-A09-copy-i18n-accessibility-closure.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a09-copy-i18n-accessibility-closure",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a09-copy-i18n-accessibility-closure",
  "owner": "A09",
  "branch": "codex/A09-copy-i18n-accessibility-closure",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A09-copy-i18n-accessibility-closure",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 5",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A09-copy-i18n-accessibility-closure.status.txt",
    "coordination/release-intake/archive/codex-A09-copy-i18n-accessibility-closure.diffstat.txt",
    "coordination/release-intake/archive/codex-A09-copy-i18n-accessibility-closure.patch",
    "coordination/release-intake/archive/codex-A09-copy-i18n-accessibility-closure.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a10-a22-a08-a12-a06-compose-20260628

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A10-A22-A08-A12-A06-compose-20260628
- Package/lifecycle kind: dirty-diverged-worktree
- Current blocker: dirty 744
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.status.txt`
  - `coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.diffstat.txt`
  - `coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.patch`
  - `coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.untracked.txt`
  - `coordination/release-intake/archive/2026-06-30-A25-dirty-diverged-branch-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.dirty-diverged.ahead-log.txt`
  - `coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.dirty-diverged.diffstat.txt`
  - `coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.dirty-diverged.patch`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a10-a22-a08-a12-a06-compose-20260628",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a10-a22-a08-a12-a06-compose-20260628",
  "owner": "A06, A08, A10, A12, A22",
  "branch": "codex/A10-A22-A08-A12-A06-compose-20260628",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A10-A22-A08-A12-A06-compose-20260628",
  "packageKind": "dirty-diverged-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 744",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.status.txt",
    "coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.diffstat.txt",
    "coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.patch",
    "coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.untracked.txt",
    "coordination/release-intake/archive/2026-06-30-A25-dirty-diverged-branch-archive-manifest.md",
    "coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.dirty-diverged.ahead-log.txt",
    "coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.dirty-diverged.diffstat.txt",
    "coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.dirty-diverged.patch",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a10-a22-release-governance

- Action group: Clean-diverged linked branches
- Source kind: physical-lifecycle
- Owner or branch: codex/A10-A22-release-governance
- Package/lifecycle kind: clean-diverged-branch
- Current blocker: behind 0, ahead 2
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.status.txt`
  - `coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.ahead-log.txt`
  - `coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.name-status.txt`
  - `coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.diffstat.txt`
  - `coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.patch`
  - `coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-approved PR or review package
  - archive-state record
  - owner-approved branch or worktree retirement
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a10-a22-release-governance",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a10-a22-release-governance",
  "owner": "A10, A22",
  "branch": "codex/A10-A22-release-governance",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A10-A22-release-governance",
  "packageKind": "clean-diverged-branch",
  "priority": null,
  "entries": null,
  "currentBlocker": "behind 0, ahead 2",
  "allowedFinalStates": [
    "owner-approved PR or review package",
    "archive-state record",
    "owner-approved branch or worktree retirement",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md",
    "coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.status.txt",
    "coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.ahead-log.txt",
    "coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.name-status.txt",
    "coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.diffstat.txt",
    "coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.patch",
    "coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a11-regression-evidence-closure

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A11-regression-evidence-closure
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 62
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A11-regression-evidence-closure.status.txt`
  - `coordination/release-intake/archive/codex-A11-regression-evidence-closure.diffstat.txt`
  - `coordination/release-intake/archive/codex-A11-regression-evidence-closure.patch`
  - `coordination/release-intake/archive/codex-A11-regression-evidence-closure.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a11-regression-evidence-closure",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a11-regression-evidence-closure",
  "owner": "A11",
  "branch": "codex/A11-regression-evidence-closure",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A11-regression-evidence-closure",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 62",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A11-regression-evidence-closure.status.txt",
    "coordination/release-intake/archive/codex-A11-regression-evidence-closure.diffstat.txt",
    "coordination/release-intake/archive/codex-A11-regression-evidence-closure.patch",
    "coordination/release-intake/archive/codex-A11-regression-evidence-closure.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a12-google-oauth-login

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A12-google-oauth-login
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 16
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A12-google-oauth-login.status.txt`
  - `coordination/release-intake/archive/codex-A12-google-oauth-login.diffstat.txt`
  - `coordination/release-intake/archive/codex-A12-google-oauth-login.patch`
  - `coordination/release-intake/archive/codex-A12-google-oauth-login.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a12-google-oauth-login",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a12-google-oauth-login",
  "owner": "A12",
  "branch": "codex/A12-google-oauth-login",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A12-google-oauth-login",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 16",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A12-google-oauth-login.status.txt",
    "coordination/release-intake/archive/codex-A12-google-oauth-login.diffstat.txt",
    "coordination/release-intake/archive/codex-A12-google-oauth-login.patch",
    "coordination/release-intake/archive/codex-A12-google-oauth-login.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a12-userstore-storage-contract

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A12-userstore-storage-contract
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 170
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A12-userstore-storage-contract.status.txt`
  - `coordination/release-intake/archive/codex-A12-userstore-storage-contract.diffstat.txt`
  - `coordination/release-intake/archive/codex-A12-userstore-storage-contract.patch`
  - `coordination/release-intake/archive/codex-A12-userstore-storage-contract.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a12-userstore-storage-contract",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a12-userstore-storage-contract",
  "owner": "A12",
  "branch": "codex/A12-userstore-storage-contract",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A12-userstore-storage-contract",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 170",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A12-userstore-storage-contract.status.txt",
    "coordination/release-intake/archive/codex-A12-userstore-storage-contract.diffstat.txt",
    "coordination/release-intake/archive/codex-A12-userstore-storage-contract.patch",
    "coordination/release-intake/archive/codex-A12-userstore-storage-contract.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a13-a14-console-closure

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A13-A14-console-closure
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 43
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A13-A14-console-closure.status.txt`
  - `coordination/release-intake/archive/codex-A13-A14-console-closure.diffstat.txt`
  - `coordination/release-intake/archive/codex-A13-A14-console-closure.patch`
  - `coordination/release-intake/archive/codex-A13-A14-console-closure.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a13-a14-console-closure",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a13-a14-console-closure",
  "owner": "A13, A14",
  "branch": "codex/A13-A14-console-closure",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 43",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A13-A14-console-closure.status.txt",
    "coordination/release-intake/archive/codex-A13-A14-console-closure.diffstat.txt",
    "coordination/release-intake/archive/codex-A13-A14-console-closure.patch",
    "coordination/release-intake/archive/codex-A13-A14-console-closure.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a16-research-evidence-closure

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A16-research-evidence-closure
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 6
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A16-research-evidence-closure.status.txt`
  - `coordination/release-intake/archive/codex-A16-research-evidence-closure.diffstat.txt`
  - `coordination/release-intake/archive/codex-A16-research-evidence-closure.patch`
  - `coordination/release-intake/archive/codex-A16-research-evidence-closure.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a16-research-evidence-closure",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a16-research-evidence-closure",
  "owner": "A16",
  "branch": "codex/A16-research-evidence-closure",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A16-research-evidence-closure",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 6",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A16-research-evidence-closure.status.txt",
    "coordination/release-intake/archive/codex-A16-research-evidence-closure.diffstat.txt",
    "coordination/release-intake/archive/codex-A16-research-evidence-closure.patch",
    "coordination/release-intake/archive/codex-A16-research-evidence-closure.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a17-a20-game-motivation-closure

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A17-A20-game-motivation-closure
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 21
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A17-A20-game-motivation-closure.status.txt`
  - `coordination/release-intake/archive/codex-A17-A20-game-motivation-closure.diffstat.txt`
  - `coordination/release-intake/archive/codex-A17-A20-game-motivation-closure.patch`
  - `coordination/release-intake/archive/codex-A17-A20-game-motivation-closure.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a17-a20-game-motivation-closure",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a17-a20-game-motivation-closure",
  "owner": "A17, A20",
  "branch": "codex/A17-A20-game-motivation-closure",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A17-A20-game-motivation-closure",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 21",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A17-A20-game-motivation-closure.status.txt",
    "coordination/release-intake/archive/codex-A17-A20-game-motivation-closure.diffstat.txt",
    "coordination/release-intake/archive/codex-A17-A20-game-motivation-closure.patch",
    "coordination/release-intake/archive/codex-A17-A20-game-motivation-closure.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a18-a21-content-evidence-closure

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A18-A21-content-evidence-closure
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 222
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A18-A21-content-evidence-closure.status.txt`
  - `coordination/release-intake/archive/codex-A18-A21-content-evidence-closure.diffstat.txt`
  - `coordination/release-intake/archive/codex-A18-A21-content-evidence-closure.patch`
  - `coordination/release-intake/archive/codex-A18-A21-content-evidence-closure.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a18-a21-content-evidence-closure",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a18-a21-content-evidence-closure",
  "owner": "A18, A21",
  "branch": "codex/A18-A21-content-evidence-closure",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A18-A21-content-evidence-closure",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 222",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A18-A21-content-evidence-closure.status.txt",
    "coordination/release-intake/archive/codex-A18-A21-content-evidence-closure.diffstat.txt",
    "coordination/release-intake/archive/codex-A18-A21-content-evidence-closure.patch",
    "coordination/release-intake/archive/codex-A18-A21-content-evidence-closure.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a19-vercel-postgres-region

- Action group: Clean-diverged linked branches
- Source kind: physical-lifecycle
- Owner or branch: codex/A19-vercel-postgres-region
- Package/lifecycle kind: clean-diverged-branch
- Current blocker: behind 0, ahead 8
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.status.txt`
  - `coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.ahead-log.txt`
  - `coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.name-status.txt`
  - `coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.diffstat.txt`
  - `coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.patch`
  - `coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-approved PR or review package
  - archive-state record
  - owner-approved branch or worktree retirement
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a19-vercel-postgres-region",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a19-vercel-postgres-region",
  "owner": "A19",
  "branch": "codex/A19-vercel-postgres-region",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A19-vercel-postgres-region",
  "packageKind": "clean-diverged-branch",
  "priority": null,
  "entries": null,
  "currentBlocker": "behind 0, ahead 8",
  "allowedFinalStates": [
    "owner-approved PR or review package",
    "archive-state record",
    "owner-approved branch or worktree retirement",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md",
    "coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.status.txt",
    "coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.ahead-log.txt",
    "coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.name-status.txt",
    "coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.diffstat.txt",
    "coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.patch",
    "coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a22-missing-module-release-slice

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A22-missing-module-release-slice
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 1016
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A22-missing-module-release-slice.status.txt`
  - `coordination/release-intake/archive/codex-A22-missing-module-release-slice.diffstat.txt`
  - `coordination/release-intake/archive/codex-A22-missing-module-release-slice.patch`
  - `coordination/release-intake/archive/codex-A22-missing-module-release-slice.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a22-missing-module-release-slice",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a22-missing-module-release-slice",
  "owner": "A22",
  "branch": "codex/A22-missing-module-release-slice",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-missing-module-release-slice",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 1016",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A22-missing-module-release-slice.status.txt",
    "coordination/release-intake/archive/codex-A22-missing-module-release-slice.diffstat.txt",
    "coordination/release-intake/archive/codex-A22-missing-module-release-slice.patch",
    "coordination/release-intake/archive/codex-A22-missing-module-release-slice.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a22-next-15-5-19-audit

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A22-next-15-5-19-audit
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 4
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A22-next-15-5-19-audit.status.txt`
  - `coordination/release-intake/archive/codex-A22-next-15-5-19-audit.diffstat.txt`
  - `coordination/release-intake/archive/codex-A22-next-15-5-19-audit.patch`
  - `coordination/release-intake/archive/codex-A22-next-15-5-19-audit.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a22-next-15-5-19-audit",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a22-next-15-5-19-audit",
  "owner": "A22",
  "branch": "codex/A22-next-15-5-19-audit",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-next-15-5-19-audit",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 4",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A22-next-15-5-19-audit.status.txt",
    "coordination/release-intake/archive/codex-A22-next-15-5-19-audit.diffstat.txt",
    "coordination/release-intake/archive/codex-A22-next-15-5-19-audit.patch",
    "coordination/release-intake/archive/codex-A22-next-15-5-19-audit.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a22-p1-release-hygiene-security

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A22-p1-release-hygiene-security
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 27
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A22-p1-release-hygiene-security.status.txt`
  - `coordination/release-intake/archive/codex-A22-p1-release-hygiene-security.diffstat.txt`
  - `coordination/release-intake/archive/codex-A22-p1-release-hygiene-security.patch`
  - `coordination/release-intake/archive/codex-A22-p1-release-hygiene-security.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a22-p1-release-hygiene-security",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a22-p1-release-hygiene-security",
  "owner": "A22",
  "branch": "codex/A22-p1-release-hygiene-security",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-p1-release-hygiene-security",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 27",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A22-p1-release-hygiene-security.status.txt",
    "coordination/release-intake/archive/codex-A22-p1-release-hygiene-security.diffstat.txt",
    "coordination/release-intake/archive/codex-A22-p1-release-hygiene-security.patch",
    "coordination/release-intake/archive/codex-A22-p1-release-hygiene-security.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a22-us-region-alignment

- Action group: Clean-diverged linked branches
- Source kind: physical-lifecycle
- Owner or branch: codex/A22-us-region-alignment
- Package/lifecycle kind: clean-diverged-branch
- Current blocker: behind 0, ahead 1
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.status.txt`
  - `coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.ahead-log.txt`
  - `coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.name-status.txt`
  - `coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.diffstat.txt`
  - `coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.patch`
  - `coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-approved PR or review package
  - archive-state record
  - owner-approved branch or worktree retirement
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a22-us-region-alignment",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a22-us-region-alignment",
  "owner": "A22",
  "branch": "codex/A22-us-region-alignment",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment",
  "packageKind": "clean-diverged-branch",
  "priority": null,
  "entries": null,
  "currentBlocker": "behind 0, ahead 1",
  "allowedFinalStates": [
    "owner-approved PR or review package",
    "archive-state record",
    "owner-approved branch or worktree retirement",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md",
    "coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.status.txt",
    "coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.ahead-log.txt",
    "coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.name-status.txt",
    "coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.diffstat.txt",
    "coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.patch",
    "coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a25-dirty-closure-governance

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A25-dirty-closure-governance
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 1018
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A25-dirty-closure-governance.status.txt`
  - `coordination/release-intake/archive/codex-A25-dirty-closure-governance.diffstat.txt`
  - `coordination/release-intake/archive/codex-A25-dirty-closure-governance.patch`
  - `coordination/release-intake/archive/codex-A25-dirty-closure-governance.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a25-dirty-closure-governance",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a25-dirty-closure-governance",
  "owner": "A25",
  "branch": "codex/A25-dirty-closure-governance",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 1018",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A25-dirty-closure-governance.status.txt",
    "coordination/release-intake/archive/codex-A25-dirty-closure-governance.diffstat.txt",
    "coordination/release-intake/archive/codex-A25-dirty-closure-governance.patch",
    "coordination/release-intake/archive/codex-A25-dirty-closure-governance.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-a25-full-dirty-compose-verification

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/A25-full-dirty-compose-verification
- Package/lifecycle kind: dirty-linked-worktree
- Current blocker: dirty 2423
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-A25-full-dirty-compose-verification.status.txt`
  - `coordination/release-intake/archive/codex-A25-full-dirty-compose-verification.diffstat.txt`
  - `coordination/release-intake/archive/codex-A25-full-dirty-compose-verification.patch`
  - `coordination/release-intake/archive/codex-A25-full-dirty-compose-verification.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-a25-full-dirty-compose-verification",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-a25-full-dirty-compose-verification",
  "owner": "A25",
  "branch": "codex/A25-full-dirty-compose-verification",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-full-dirty-compose-verification",
  "packageKind": "dirty-linked-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 2423",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-A25-full-dirty-compose-verification.status.txt",
    "coordination/release-intake/archive/codex-A25-full-dirty-compose-verification.diffstat.txt",
    "coordination/release-intake/archive/codex-A25-full-dirty-compose-verification.patch",
    "coordination/release-intake/archive/codex-A25-full-dirty-compose-verification.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-visualization-production-release

- Action group: Dirty linked worktrees
- Source kind: physical-lifecycle
- Owner or branch: codex/visualization-production-release
- Package/lifecycle kind: dirty-diverged-worktree
- Current blocker: dirty 16
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md`
  - `coordination/release-intake/archive/codex-visualization-production-release.status.txt`
  - `coordination/release-intake/archive/codex-visualization-production-release.diffstat.txt`
  - `coordination/release-intake/archive/codex-visualization-production-release.patch`
  - `coordination/release-intake/archive/codex-visualization-production-release.untracked.txt`
  - `coordination/release-intake/archive/2026-06-30-A25-dirty-diverged-branch-archive-manifest.md`
  - `coordination/release-intake/archive/codex-visualization-production-release.dirty-diverged.ahead-log.txt`
  - `coordination/release-intake/archive/codex-visualization-production-release.dirty-diverged.diffstat.txt`
  - `coordination/release-intake/archive/codex-visualization-production-release.dirty-diverged.patch`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-reviewed commit or package extraction
  - owner-approved exact-path discard
  - evidence archive with retained-worktree blocker
  - owner-approved worktree removal after dirty state closure
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-visualization-production-release",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-visualization-production-release",
  "owner": "A06, A22",
  "branch": "codex/visualization-production-release",
  "path": "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/visualization-production-release",
  "packageKind": "dirty-diverged-worktree",
  "priority": null,
  "entries": null,
  "currentBlocker": "dirty 16",
  "allowedFinalStates": [
    "owner-reviewed commit or package extraction",
    "owner-approved exact-path discard",
    "evidence archive with retained-worktree blocker",
    "owner-approved worktree removal after dirty state closure",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    "coordination/release-intake/archive/codex-visualization-production-release.status.txt",
    "coordination/release-intake/archive/codex-visualization-production-release.diffstat.txt",
    "coordination/release-intake/archive/codex-visualization-production-release.patch",
    "coordination/release-intake/archive/codex-visualization-production-release.untracked.txt",
    "coordination/release-intake/archive/2026-06-30-A25-dirty-diverged-branch-archive-manifest.md",
    "coordination/release-intake/archive/codex-visualization-production-release.dirty-diverged.ahead-log.txt",
    "coordination/release-intake/archive/codex-visualization-production-release.dirty-diverged.diffstat.txt",
    "coordination/release-intake/archive/codex-visualization-production-release.dirty-diverged.patch",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-california-practice-beta-clean

- Action group: Clean-diverged linked branches
- Source kind: physical-lifecycle
- Owner or branch: codex/california-practice-beta-clean
- Package/lifecycle kind: clean-diverged-branch
- Current blocker: behind 12, ahead 1
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md`
  - `coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged.status.txt`
  - `coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged.ahead-log.txt`
  - `coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged.name-status.txt`
  - `coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged.diffstat.txt`
  - `coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged.patch`
  - `coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-approved PR or review package
  - archive-state record
  - owner-approved branch or worktree retirement
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-california-practice-beta-clean",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-california-practice-beta-clean",
  "owner": "A21, A18, A04, A22",
  "branch": "codex/california-practice-beta-clean",
  "path": "/Users/dongpinhu/Desktop/MAIS-MVP-worktrees/MAIS-MVP-california-practice-beta-clean",
  "packageKind": "clean-diverged-branch",
  "priority": null,
  "entries": null,
  "currentBlocker": "behind 12, ahead 1",
  "allowedFinalStates": [
    "owner-approved PR or review package",
    "archive-state record",
    "owner-approved branch or worktree retirement",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md",
    "coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged.status.txt",
    "coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged.ahead-log.txt",
    "coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged.name-status.txt",
    "coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged.diffstat.txt",
    "coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged.patch",
    "coordination/release-intake/archive/codex-california-practice-beta-clean.clean-diverged.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```

## physical:codex-s22-release-hygiene-2026-06-15

- Action group: Clean-diverged linked branches
- Source kind: physical-lifecycle
- Owner or branch: codex/s22-release-hygiene-2026-06-15
- Package/lifecycle kind: clean-diverged-branch
- Current blocker: behind 12, ahead 1
- Evidence to review:
  - `coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md`
  - `coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.status.txt`
  - `coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.ahead-log.txt`
  - `coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.name-status.txt`
  - `coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.diffstat.txt`
  - `coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.patch`
  - `coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.untracked.txt`
  - `coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json`
- Allowed final states:
  - owner-approved PR or review package
  - archive-state record
  - owner-approved branch or worktree retirement
  - blocker
- Copyable selection row:

```json
{
  "ledgerId": "physical:codex-s22-release-hygiene-2026-06-15",
  "sourceKind": "physical-lifecycle",
  "approvalId": "codex-s22-release-hygiene-2026-06-15",
  "owner": "A22, A10",
  "branch": "codex/s22-release-hygiene-2026-06-15",
  "path": "/Users/dongpinhu/Desktop/MAIS-MVP-worktrees/s22-release-hygiene-2026-06-15",
  "packageKind": "clean-diverged-branch",
  "priority": null,
  "entries": null,
  "currentBlocker": "behind 12, ahead 1",
  "allowedFinalStates": [
    "owner-approved PR or review package",
    "archive-state record",
    "owner-approved branch or worktree retirement",
    "blocker"
  ],
  "selectedFinalState": "<choose one exact allowedFinalStates value>",
  "approvedBy": "<owner or owning agent>",
  "approvedAt": "<ISO-8601 timestamp>",
  "ownerDecision": "<short reason and exact scope>",
  "evidenceReviewed": [
    "coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md",
    "coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.status.txt",
    "coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.ahead-log.txt",
    "coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.name-status.txt",
    "coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.diffstat.txt",
    "coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.patch",
    "coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.untracked.txt",
    "coordination/release-intake/latest-A25-physical-lifecycle-approval-requests.json"
  ],
  "notes": "<checks, risks, and any exact paths for discard/removal>"
}
```
