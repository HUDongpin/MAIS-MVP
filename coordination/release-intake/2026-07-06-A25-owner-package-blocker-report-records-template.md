# A25 Owner Package Blocker Report Records Template

Generated: 2026-07-06T15:50:17.197Z

Dirty map signature: `b26fe39c438a20cdbb9cf3943e3d000d9dc8dc04ccccedc13792c457c5942d3b`

Expanded dirty entries: 5183

Source starter generated: 2026-07-06T15:50:17.108Z

Target owner-filled records file: `coordination/release-intake/latest-A25-owner-package-blocker-report-records.json`

This template is coordination evidence only. It does not create the target records file, does not record reports on behalf of owners, and does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any physical cleanup.

## Summary

- Template rows: 10
- Blank owner decision rows: 10
- Cleanup-authorized rows: 0
- Executable rows: 0

## Owner Rows

| Report ID | Agent | Owner | Package rows | Pending template | Executable |
| --- | --- | --- | ---: | --- | --- |
| `owner-package-blocker-report-a06` | A06 | A06 visualization lead | 14 | `coordination/release-intake/latest-A25-pending-owner-blocker-report-a06.md` | no |
| `owner-package-blocker-report-a13` | A13 | A13 teacher console lead | 13 | `coordination/release-intake/latest-A25-pending-owner-blocker-report-a13.md` | no |
| `owner-package-blocker-report-a18` | A18 | A18 curriculum QA and content quality lead | 4 | `coordination/release-intake/latest-A25-pending-owner-blocker-report-a18.md` | no |
| `owner-package-blocker-report-a03` | A03 | A03 curriculum roadmap lead | 3 | `coordination/release-intake/latest-A25-pending-owner-blocker-report-a03.md` | no |
| `owner-package-blocker-report-a04` | A04 | A04 practice lead | 2 | `coordination/release-intake/latest-A25-pending-owner-blocker-report-a04.md` | no |
| `owner-package-blocker-report-a20` | A20 | A20 game design and game-based learning lead | 8 | `coordination/release-intake/latest-A25-pending-owner-blocker-report-a20.md` | no |
| `owner-package-blocker-report-a15` | A15 | A15 adaptive engine lead | 2 | `coordination/release-intake/latest-A25-pending-owner-blocker-report-a15.md` | no |
| `owner-package-blocker-report-a11` | A11 | A11 QA and release quality lead | 1 | `coordination/release-intake/latest-A25-pending-owner-blocker-report-a11.md` | no |
| `owner-package-blocker-report-a12` | A12 | A12 backend/API platform lead | 2 | `coordination/release-intake/latest-A25-pending-owner-blocker-report-a12.md` | no |
| `owner-package-blocker-report-a07` | A07 | A07 AI tutor lead | 1 | `coordination/release-intake/latest-A25-pending-owner-blocker-report-a07.md` | no |

## Target File Shape

Create or update `coordination/release-intake/latest-A25-owner-package-blocker-report-records.json` with this structure, filling only real owner-reviewed records:

```json
{
  "dirtyMapStatusSignature": "b26fe39c438a20cdbb9cf3943e3d000d9dc8dc04ccccedc13792c457c5942d3b",
  "expandedStatusEntries": 5183,
  "sourceTemplateGeneratedAt": "2026-07-06T15:50:17.197Z",
  "cleanupAuthorized": false,
  "executableNow": false,
  "records": [
    {
      "...": "copy one row from the template records array",
      "reportStatus": "recorded-owner-blocker",
      "reportedBy": "<owner agent id or owner name>",
      "reportedAt": "<ISO-8601>",
      "blockerSummary": "<what remains blocked and why>",
      "ownerDecision": "<resolved | partially-resolved | blocked, with exact scope>",
      "evidenceReviewed": [
        "coordination/release-intake/latest-A25-owner-package-blocker-report-starter.json",
        "coordination/release-intake/latest-A25-pending-owner-blocker-report-aXX.md"
      ],
      "nextAction": "<specific next step>",
      "cleanupAuthorized": false,
      "executableNow": false
    }
  ]
}
```
