# A10 immutable sweep-manifest preview

- Owner: A10, with A25 safety-policy review
- Task: add a byte-locked, non-mutating manifest preview to the local worktree sweep
- Branch: `codex/a10-sweep-manifest-preview-20260829`
- Baseline: live `origin/main` at `baca84e77abae1e16cfd53d497c6f7ee734d4679`
- Created: 2026-08-29 HKT
- Target PR: pending
- Expected closeout: 2026-08-29
- Scope:
  - `scripts/sweep-merged-worktrees.mjs`
  - `scripts/sweep-merged-worktrees.test.mjs`
  - this session log

## Problem

The default dry-run did not read an authorization manifest. Owner/task custody
therefore remained unavailable for every worktree, while the first invocation
that could validate an exact manifest was also the destructive `--apply`
invocation. That prevented A25 from validating a byte-locked allowlist in a
separate, non-mutating review step.

## Change

The CLI now accepts a complete preview-only authorization triplet without
`--apply`:

```text
--manifest <absolute-path>
--manifest-sha256 <expected-digest>
--expected-live-main-sha <expected-sha>
```

Preview validates the immutable manifest bytes, independently supplied digest,
live `git ls-remote` evidence, manifest/live/expected main equality, target
count, owner/task custody, closeout date, allowed action, detached anchors,
whole-fleet fingerprint, and each exact path/branch/HEAD/topology lock. It
rejects partial preview inputs and reserves `--receipt` for `--apply`.

The preview path returns before receipt reservation and before the removal
adapter. It does not call `git worktree remove`, does not delete branches or
remote refs, and does not use force.

Machine-readable output includes `previewReady`. A manifest preview exits
nonzero unless every exact manifest target is currently classified
`retire`; a dirty, protected, process-held, open-PR, or otherwise blocked
target therefore cannot be mistaken for a successful cleanup approval.

## TDD evidence

- RED: focused sweep suite reported 4 expected failures after preview tests were
  added and before production code changed.
- GREEN: focused sweep suite passed `81/81`.
- Combined sweep plus release-governance suite passed with `0` failures; the
  only skips were the 11 pre-existing Promotion Shadow contract skips.
- `node --check scripts/sweep-merged-worktrees.mjs`: pass.
- `node --check scripts/sweep-merged-worktrees.test.mjs`: pass.
- `git diff --check`: pass.

No `--apply` command was run against the live fleet, no receipt was created,
and no worktree, branch, file, remote ref, PR, deployment, provider state, or
production state was removed or modified by the audit.

## Review state

Independent standards, spec, quality, and security review returned `PASS`
with no Critical or Important issue. The one Minor observation was that an
initial preview implementation returned exit 0 even when a manifest target was
classified `skip`. It was resolved with `previewReady`, a nonzero blocked
preview exit, and a regression test before closeout.
