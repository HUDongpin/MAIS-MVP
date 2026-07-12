# A22 Top Clean Candidate Review Packet

Generated: 2026-07-07T15:08:04.523Z

Dirty map signature: `84e0553381630f5c29322b7cd071032a65d4d5b479cd222bba15314f9269b4e0`

Expanded dirty entries: 5717

This packet is evidence-only. It packages the top A22 clean-source candidate for review using archived evidence that already exists in release-intake. It does not select a release source, run type-check, run build, run regression, create a clone, create or remove a worktree, stage, commit, merge, push, deploy, delete, reset, restore, clean, prune, record owner approval, record execution instruction, or authorize cleanup.

## Summary

- Packet status: git-evidence-ready-promotion-blocked
- Top candidate branch: `codex/A22-us-region-alignment`
- Top candidate path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`
- Promotion lane: clean-diverged-slice-review
- Divergence: behind 2, ahead 1
- Git/archive evidence ready: yes
- Promotion eligible now: no
- Release source selected: no
- Changed files: 4
- Focused smoke passed: yes
- Type-check passed: no
- Type-check error lines: 652
- Build passed: no
- Build exit status: 1
- Build failure category: webpack-module-not-found
- Build module blockers confirmed: 5/5
- Build blockers routed: yes
- Build blocker route groups: 3
- Build blocker root parity rows: 5
- Root-parity extraction plan: reviewable-non-executable
- Root-parity extraction units: 4
- Root-parity blocker rows covered: 5
- Root-parity sources available: 4
- Root-parity candidate targets missing: 4
- Root-parity instruction request: waiting-for-owner-execution-instruction
- Root-parity instruction rows: 4
- Root-parity ready-for-owner instruction rows: 4
- Root-parity instruction intake: waiting-for-owner-input
- Root-parity owner input blank: yes
- Root-parity intake proposed instruction rows: 0
- Root-parity intake waiting owner-input checks: 3
- Root-parity instruction recording: dry-run-blocked-owner-input
- Root-parity recording proposed instruction rows: 0
- Root-parity recording recorded instruction rows: 0
- Root-parity guarded extraction: dry-run-blocked-missing-recorded-instructions
- Root-parity guarded recorded instruction rows: 0
- Root-parity guarded candidate targets missing: 4
- Root-parity guarded candidate git status rows: 0
- Root-parity guarded root copy rows: 0
- Root-parity guarded candidate mutation rows: 0
- Root-parity owner action packet: waiting-for-owner-action
- Root-parity owner action rows: 4
- Root-parity owner action recommended rows: 4
- Root-parity owner action input blank: yes
- Root-parity owner action recorded instruction rows: 0
- Root-parity owner action root copy rows: 0
- Root-parity owner action candidate mutation rows: 0
- Root-parity owner action acceptance docket: waiting-for-owner-action
- Root-parity owner action acceptance rows: 4
- Root-parity owner action accepted rows: 0
- Root-parity owner action acceptance input blank: yes
- Root-parity owner action acceptance recorded instruction rows: 0
- Root-parity owner action acceptance root copy rows: 0
- Root-parity owner action acceptance candidate mutation rows: 0
- Build .next present: yes
- Build .next size: 948 MiB
- Validation rows passed: 11/16
- Missing promotion gate rows: 5
- Pending canonical authorization rows: 42
- Direct failed merge checks: 5
- Cleanup-authorized rows: 0
- Executable rows: 0

## Archived Evidence

| Key | Path | Exists | Lines | SHA matches manifest |
| --- | --- | --- | ---: | --- |
| `status` | `coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.status.txt` | yes | 1 | n/a |
| `aheadLog` | `coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.ahead-log.txt` | yes | 1 | n/a |
| `nameStatus` | `coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.name-status.txt` | yes | 4 | n/a |
| `diffstat` | `coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.diffstat.txt` | yes | 5 | n/a |
| `patch` | `coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.patch` | yes | 170 | yes |
| `untracked` | `coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.untracked.txt` | yes | 1 | n/a |
| `metadata` | `coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.metadata.json` | yes | 20 | n/a |

## Changed Files

| Status | Path |
| --- | --- |
| A | `coordination/reports/2026-06-29-A22-us-region-alignment.md` |
| A | `coordination/session-logs/2026-06-29-A22-us-region-alignment.md` |
| A | `scripts/vercel-region-config.test.mjs` |
| A | `vercel.json` |

## Validation Matrix

| ID | Owner | Status | Passed | Detail |
| --- | --- | --- | --- | --- |
| `git-archive-evidence` | A25 git hygiene and release intake | passed | yes | Top clean candidate has archived status, ahead-log, name-status, diffstat, patch, and untracked evidence. |
| `resync-review` | A22 production reliability and release engineering | blocked | no | Top candidate is behind main by 2 commit(s); review or resync is required before promotion. |
| `candidate-change-scope-review` | A22 production reliability and release engineering | ready-for-human-review | yes | 4 changed file(s) are captured for human review; this does not validate runtime behavior. |
| `candidate-type-check` | A22 production reliability and release engineering | failed | no | Candidate-specific npm run type-check failed with 652 TypeScript error line(s). |
| `candidate-build` | A22 production reliability and release engineering | failed | no | Candidate-specific npm run build failed with 5/5 confirmed module-resolution blocker row(s). |
| `candidate-build-blocker-routing` | A25 git hygiene and release intake, coordinating A22 build blockers | passed | yes | A22 build blockers are routed to 3 owner group(s); routing remains non-executable. |
| `candidate-root-parity-extraction-plan` | A25 git hygiene and release intake, coordinating A06/A20/A05 owner extraction review | passed | yes | Root parity extraction plan covers 5 blocker row(s) across 4 owner-reviewed extraction unit(s). |
| `candidate-root-parity-extraction-instruction-request` | A25 git hygiene and release intake, coordinating A22/A06/A20/A05 extraction instruction review | passed | yes | Root-parity extraction instruction request prepares 4 owner instruction row(s), still non-executable. |
| `candidate-root-parity-extraction-instruction-intake` | A25 git hygiene and release intake, coordinating A22 owner input readiness | passed | yes | Owner input scaffold is current and waiting; 3 owner-input check(s) remain waiting. |
| `candidate-root-parity-extraction-instruction-recording` | A25 git hygiene and release intake, coordinating A22 extraction instruction recording | passed | yes | Recording dry-run is fail-closed at dry-run-blocked-owner-input with 0 recorded row(s). |
| `candidate-root-parity-guarded-extraction` | A25 git hygiene and release intake, coordinating A22 guarded extraction preflight | passed | yes | Guarded extraction dry-run is fail-closed at dry-run-blocked-missing-recorded-instructions with 0 candidate mutation row(s). |
| `candidate-root-parity-owner-action-packet` | A25 git hygiene and release intake, coordinating A22/A06/A20/A05 owner action focus | passed | yes | Owner action packet narrows 4 root-parity row(s) into selectedAction preview text, still non-executable. |
| `candidate-root-parity-owner-action-acceptance-docket` | A25 git hygiene and release intake, coordinating A22 owner action acceptance validation | passed | yes | Owner action acceptance docket keeps 4 root-parity row(s) waiting for owner input, still non-executable. |
| `candidate-focused-regression` | A11 QA and A22 production reliability | passed | yes | Focused Vercel region smoke passed in the top clean candidate worktree without dirtying it. |
| `clean-source-promotion-instruction` | Owner | not-authorized | no | No explicit owner instruction selects this candidate as the clean release source. |
| `merge-instruction` | Owner | not-authorized | no | No separate owner merge instruction is recorded. |

## Required Next Evidence Before Promotion

- A22 resync/review decision for the branch being behind main
- candidate-specific npm run type-check evidence
- candidate-specific npm run build green evidence after module blockers are fixed
- A22 build-blocker owner routing evidence stays current until the module blockers are fixed
- A22 root-parity extraction plan stays current until owners apply or reject each parity unit
- A22 root-parity extraction instruction request stays current until owners approve or reject each extraction unit
- A22 root-parity extraction instruction intake stays current until owner input is recorded and separately applied
- A22 root-parity extraction instruction recording dry-run stays current until owner input is complete and separately applied
- A22 root-parity guarded extraction dry-run stays current until recorded instructions exist and a separate owner apply is authorized
- A22 root-parity owner action packet stays current until the owner approves, rejects, or edits each selectedAction preview
- A22 root-parity owner action acceptance docket stays current until owner input is accepted into a separate recording dry-run
- candidate-specific focused regression smoke evidence
- explicit owner clean-source promotion instruction
- A22 clean-source selection record
- separate owner merge instruction

## Safe Validation Commands

- `npm run release:dirty-map -- --assert-current --max-age-minutes 60`
- `node coordination/release-intake/assert-a22-clean-source-candidate-promotion-packet-current.mjs`
- `node coordination/release-intake/assert-a22-top-clean-candidate-typecheck-current.mjs`
- `node coordination/release-intake/assert-a22-top-clean-candidate-build-snapshot-current.mjs`
- `node coordination/release-intake/assert-a22-top-clean-candidate-build-blocker-routing-current.mjs`
- `node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-plan-current.mjs`
- `node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-request-current.mjs`
- `node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-intake-current.mjs`
- `node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-recording-current.mjs`
- `node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-guarded-extraction-current.mjs`
- `node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-owner-action-packet-current.mjs`
- `node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-owner-action-acceptance-docket-current.mjs`
- `node coordination/release-intake/assert-a22-top-clean-candidate-review-packet-current.mjs`

## Boundary

This packet makes the top candidate reviewable, not deployable. It keeps promotion, merge, deployment, cleanup, destructive Git, and physical lifecycle cleanup non-executable.
