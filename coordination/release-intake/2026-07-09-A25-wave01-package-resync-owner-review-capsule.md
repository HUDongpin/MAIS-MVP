# A25 Wave01 Package Resync Owner Review Capsule

Generated: 2026-07-09T14:09:04.588Z

Dirty map signature: `b3d232fd2b9ef81d4efc95903d2e3b316db664d6e9ec6ab366181395b3966be7`

Expanded dirty entries: 6604

This capsule is evidence-only. It packages the seven Wave01 package-worktree resync requests for owner review, but it does not create authorization files, record approval, authorize merge, authorize cleanup, execute restore, execute clean, stage, commit, discard, tag, push, prune, deploy, remove worktrees, or delete files.

## Summary

- Review round: `wave01-package-resync-authorizations`
- Ready for owner decision: yes
- Rows: 1
- Pending rows: 1
- Authorized rows: 0
- Package-only rows: 1
- Worktree-present rows: 1
- Restore rows: 1
- Clean rows: 0
- Clean-ready rows: 0
- Held rows: 1
- Clean file bytes: 0
- Copyable authorization texts: 1
- Acceptance checks: 13/13
- Source currentness failures: 0
- Cleanup-authorized rows: 0
- Executable rows: 0

## Review Inputs

| ID | Path | Exists | Description |
| --- | --- | --- | --- |
| dirty-map | `coordination/release-intake/latest-A25-dirty-tree-map.json` | yes | Current dirty-tree inventory. |
| governance-readiness-json | `coordination/release-intake/latest-A25-wave01-governance-readiness.json` | yes | Wave01 readiness and package-only resync recommendation source. |
| governance-readiness-md | `coordination/release-intake/latest-A25-wave01-governance-readiness.md` | yes | Human-readable Wave01 readiness packet. |
| approval-requests | `coordination/release-intake/latest-A25-wave01-package-resync-approval-requests.json` | yes | Exact approval request rows. |
| execution-packet | `coordination/release-intake/latest-A25-wave01-package-resync-execution-packet.json` | yes | Exact command packet, still non-executable. |
| evidence-pack | `coordination/release-intake/latest-A25-wave01-package-resync-evidence-pack.json` | yes | Root/worktree evidence digest for each row. |
| authorization-template | `coordination/release-intake/latest-A25-wave01-package-resync-owner-authorization-template.json` | yes | Owner authorization text template. |
| authorizations-starter | `coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations-starter.json` | yes | Blank owner authorization starter. |
| authorizations-input | `coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations.json` | yes | Owner input file for Wave01 approvals. |

## Approval Rows

| Order | Approval ID | Owner | Path | Action | Authorized | Executable |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `wave01-resync-01-tsconfig-json` | A10 tooling, docs, and report | `tsconfig.json` | owner-approved-package-restore | no | no |

## Impact Digest

This section summarizes the exact file impact if the owner later approves the Wave01 commands. It is not an execution instruction.

### Restore Impact: `tsconfig.json`

- Diffstat: `tsconfig.json \| 26 +++++++++++++++++++++++++-  1 file changed, 25 insertions(+), 1 deletion(-)`
- Current worktree bytes: 1093
- Current worktree line count: 65

```diff
diff --git a/tsconfig.json b/tsconfig.json
index 73b128b79..b0bce64c0 100644
--- a/tsconfig.json
+++ b/tsconfig.json
@@ -35,6 +35,30 @@
     "next-env.d.ts"
   ],
   "exclude": [
-    "node_modules"
+    "node_modules",
+    ".next-*",
+    ".next-*/**/*",
+    ".s??-*",
+    ".s??-*/**/*",
+    ".tmp",
+    ".tmp/**/*",
+    "tmp",
+    "tmp/**/*",
+    "temp",
+    "temp/**/*",
+    "output",
+    "output/**/*",
+    "outputs",
+    "outputs/**/*",
+    "coverage",
+    "coverage/**/*",
+    "playwright-report",
+    "playwright-report/**/*",
+    "test-results",
+    "test-results/**/*",
+    "var",
+    "var/**/*",
+    "MAIS-MVP-*",
+    "MAIS-MVP-*/**/*"
   ]
 }
```


### Clean Impact

| Path | Bytes | Lines | Exists in worktree |
| --- | ---: | ---: | --- |


## Partial Approval Recommendation

Strategy: `approve-a25-clean-rows-hold-tsconfig-restore`

Owner decision text: Approve only the six Wave01 A25 dirty-map artifact clean rows; hold wave01-resync-01-tsconfig-json for A10/A22 release-hygiene review.

Boundary: This recommendation is evidence-only and does not authorize git clean, git restore, cleanup, merge, push, deploy, branch deletion, or worktree removal.

### Clean-Ready Rows

| Approval ID | Path | Bytes | Exact command |
| --- | --- | ---: | --- |


### Held Rows

| Approval ID | Path | Diffstat | Hold reason |
| --- | --- | --- | --- |
| `wave01-resync-01-tsconfig-json` | `tsconfig.json` | `tsconfig.json \| 26 +++++++++++++++++++++++++-  1 file changed, 25 insertions(+), 1 deletion(-)` | The tsconfig change adds release/build artifact excludes and may be useful; do not restore it without A10/A22 review. |

## Acceptance Checks

| # | Check | Status | Meaning | Evidence |
| ---: | --- | --- | --- | --- |
| 1 | `source-currentness-green` | pass | Source artifacts are current against the dirty map | sourceCurrentnessFailures=0 |
| 2 | `seven-resync-rows` | pass | Wave01 package-resync rows reflect the current remaining scope | rows=1 |
| 3 | `all-package-only` | pass | Every row is package-worktree-only, not a root cleanup instruction | packageOnly=1/1 |
| 4 | `non-executable` | pass | No row is executable or cleanup-authorized | executable=0 cleanup=0 |
| 5 | `authorization-input-safe-state` | pass | Wave01 owner authorization input covers all current rows and remains non-executable | pending=1 authorized=0 executable=0 |
| 6 | `approval-ids-match` | pass | Approval IDs match across request, execution, evidence, template, and starter artifacts | approvalIds=1 |
| 7 | `worktree-evidence-present` | pass | Every row still has worktree-side evidence present | worktreePresent=1/1 |
| 8 | `command-shapes-allowlisted` | pass | Exact commands are limited to the held tsconfig restore and A25 dirty-map artifact cleans | restore=1 clean=0 |
| 9 | `impact-digest-present` | pass | Owner review includes concrete restore/clean impact evidence | restore=1 clean=0 cleanBytes=0 |
| 10 | `required-authorization-texts-present` | pass | Every row has copyable exact authorization text with approvalId and command | texts=1/1 |
| 11 | `pre-post-checks-present` | pass | Every row names pre-execution and post-execution checks | rowsWithChecks=1/1 |
| 12 | `governance-readiness-still-blocked` | pass | Wave01 governance remains blocked and therefore must not be auto-merged | commitReady=false packageResync=1 |
| 13 | `review-input-files-present` | pass | All named review input artifacts exist | present=9/9 |

## Copyable Authorization Texts

These texts are review templates only. They become active only after the owner records approval in the Wave01 owner-authorization input and the validators accept it.

Target authorization file: `coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations.json`

### 1. `wave01-resync-01-tsconfig-json`

```text
Authorize approvalId=wave01-resync-01-tsconfig-json; worktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance; path=tsconfig.json; selectedAction=owner-approved-package-restore; command=git restore --source=HEAD -- tsconfig.json; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>
```


## Validation Commands

- `node coordination/release-intake/assert-wave01-governance-readiness-current.mjs`
- `node coordination/release-intake/assert-wave01-package-resync-approval-requests-current.mjs`
- `node coordination/release-intake/assert-no-staged-changes.mjs --json`
- `git -C /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance status --short -- tsconfig.json`
- `npm run release:dirty-map -- --reason "A25 Wave 01 resync execution wave01-resync-01-tsconfig-json"`
- `node coordination/release-intake/generate-wave01-governance-readiness.mjs`
- `node coordination/release-intake/generate-wave01-package-resync-approval-requests.mjs`
- `node coordination/release-intake/generate-wave01-package-resync-execution-packet.mjs`
- `node coordination/release-intake/assert-wave01-package-resync-execution-packet-current.mjs`
- `node coordination/release-intake/assert-next-owner-authorizations-current.mjs`
- `node coordination/release-intake/generate-next-owner-authorization-execution-preview.mjs`
- `node coordination/release-intake/assert-next-owner-authorization-execution-preview-current.mjs`
- `node coordination/release-intake/assert-owner-package-blocker-report-records-current.mjs`
- `node coordination/release-intake/assert-owner-closure-input-readiness-current.mjs`

## Validation Hold

- Status: waiting-for-owner-compose-deletion-confirmation
- Active worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A10-A22-A08-A12-A06-compose-20260628`
- Reason: Owner reported active exact deletion in this compose worktree; linked-worktree archive, Wave 06, aggregate remediation, and completion-audit refreshes should wait for owner confirmation.
- Resume condition: Owner confirms exact deletion in the compose worktree is complete.

## Boundary

Every row remains non-executable. A separate owner instruction naming exact approval IDs and exact commands is still required before any restore, clean, merge, cleanup, or physical lifecycle action can run.
