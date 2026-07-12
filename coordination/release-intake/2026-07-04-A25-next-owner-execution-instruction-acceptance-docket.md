# A25 Next Owner Execution Instruction Acceptance Docket

Generated: 2026-07-04T15:54:16.195Z

Dirty map signature: `0ed815279a9afc7897df7ef48f2e250da494e4a227adc0a6da14547ba9048571`

Expanded dirty entries: 4323

This docket is evidence-only. It defines how the next owner execution instruction will be accepted, but it does not record an execution instruction and does not authorize staging, committing, merging, cleanup, worktree removal, branch deletion, reset, clean, push, deploy, or Vercel release.

## Summary

- Acceptance rows: 1
- Ready instruction request rows: 1
- Effective pending ready instruction rows: 1
- Instruction rows in file: 0
- Valid instruction rows: 0
- Owner-input instruction rows: 0
- Owner-input valid instruction rows: 0
- Pre-execution validation ready: yes
- Passing acceptance checks: 9/9
- Cleanup-authorized rows: 0
- Executable rows: 0

## Acceptance Rows

| Approval ID | Status | Commands | Package files | Owner instruction rows | Package fingerprint SHA256 |
| --- | --- | ---: | ---: | ---: | --- |
| `a16-root-pathspec-commit-execution` | waiting-for-owner-execution-instruction | 2 | 6 | 0 | `005a792e0e2438bbade0462d03c740dc6a542b8152935a0ed5e6b11caf5a9fac` |

## Acceptance Checks

| Check | Status | Detail |
| --- | --- | --- |
| `source-current` | pass | source currentness failures=0 |
| `one-ready-request-row` | pass | ready request rows=1 |
| `pending-ready-instruction-row` | pass | pending=1, ownerInputReady=1 |
| `no-recorded-execution-instruction-yet` | pass | Current state is request-only until the owner records a separate execution instruction. |
| `a16-pre-execution-ready` | pass | pre-execution checks=13/13 |
| `six-file-a16-package` | pass | package files=6 |
| `two-exact-git-commands` | pass | exact commands=2 |
| `copyable-execution-text-complete` | pass | Request row carries the exact owner-facing execution instruction text. |
| `non-executable-boundary` | pass | Acceptance docket does not authorize cleanup or executable rows. |

## Acceptance Row: a16-root-pathspec-commit-execution

Status: waiting-for-owner-execution-instruction

Target input file: `coordination/release-intake/latest-A25-next-owner-execution-instructions.json`

Expected instruction id: `a16-root-pathspec-commit-execution-execution-instruction`

Expected owner execution text:

```text
Authorize separate execution for approvalIds=a16-research-and-learning-science,codex-a16-research-evidence-closure; cwd=/Users/dongpinhu/Desktop/MAIS-MVP; commandSequence="git add --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec" then "git commit -m 'Add A16 research evidence package'"; approvedBy=dongpinhu; approvedAt=<ISO-8601>; notes=Stage and commit only the 6 A16 research evidence files listed in coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec. No cleanup, worktree removal, branch deletion, reset, clean, push, deploy, broad staging, or unrelated dirty-root inventory is authorized.
```

Exact command sequence:

1. `git add --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec`
2. `git commit -m "Add A16 research evidence package"`

Required evidence:

- `coordination/release-intake/latest-A25-next-owner-execution-instruction-request-packet.json`
- `coordination/release-intake/latest-A25-a16-execution-instruction-owner-input.json`
- `coordination/release-intake/latest-A25-a16-pre-execution-validation-report.json`
- `coordination/release-intake/latest-A25-next-owner-authorized-command-manifest.json`

Acceptance criteria:

- Owner instruction row must match the draft approvalId, instructionId, owner, candidateId, targetCwd, package files, package fingerprints, and exact command sequence.
- executionText must include the copyable A16 separate-execution text, both source approval IDs, target cwd, both exact Git commands, and the no-cleanup/no-broad-staging exclusions.
- evidenceReviewed must include canonical A16 authorization, A16 execution docket, A16 pre-execution validation report, and A16 input scaffold evidence.
- cleanupAuthorized and executableNow must remain false; separate owner instruction permits only the listed stage/commit sequence after pre-checks pass.
- Required pre-execution checks and post-execution checks must remain attached to the accepted instruction row.


## Boundary

- Records execution instruction: false.
- Stage authorized: false.
- Commit authorized: false.
- Merge authorized: false.
- Cleanup authorized: false.
- Executable now: false.
- Destructive Git authorized: false.
- Deploy authorized: false.
- Requires separate owner execution instruction: true.
