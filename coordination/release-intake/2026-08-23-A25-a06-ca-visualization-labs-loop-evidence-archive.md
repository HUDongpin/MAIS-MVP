# A25 evidence archive — California visualization labs loop WIP

- Generated: `2026-08-22T20:41:47Z` (`2026-08-23` Asia/Hong_Kong)
- Stage C final state: **evidence archive**
- Original branch: `codex/a06-ca-visualization-labs-loop`
- Original worktree: `/Volumes/Starship/MAIS-ca-viz-labs-wt`
- Original branch head: `b1b89d4cd5f2fc128275d6f84c6361c8ec12808f`
- Archive commit: `777f46db6ef16c209f3493f58ec1fb13df8daf94`
- GitHub archive ref: `origin/archive/a06-ca-visualization-labs-loop-wip-20260823`
- GitHub PR for the original branch: none
- Repository visibility: `PRIVATE`

## Decision

Preserve the exact 227-path California visualization/runtime/measurement tree as a private evidence archive. Do not open a PR from the old worktree, reuse its consumed authorization receipt, rerun Chrome, or claim exhaustive California acceptance.

The archive records 161,660 insertions and 2,011 deletions across production visualization components, learning-event/session persistence, shared provider state and analytics, generated catalogs, release tooling, and a very large measurement/authorization/oracle/browser harness. The original head is contained by live main, but only 30 of 227 resulting blobs exactly match current `origin/main`; 41 match the active `codex/a06-ca-viz-resume-20260819` branch. Neither is whole-tree absorption.

PR #136 integrated exactly one bounded California runtime slice (61 component paths) and explicitly excluded later California acceptance/archive commits and obsolete worktree-bound harness. The archived A22 handoff further records that the formal 102-identity browser attempt ended 0 passed, 2 failed, 100 skipped because system Chrome exited before a page/context existed; no producer-success receipt, terminal artifact manifest, or terminal seal exists. The receipt was consumed, and the handoff explicitly forbids reusing it or rerunning Chrome without new owner authorization.

## Owner grouping

| Owner lane | Archived concern |
|---|---|
| A06 | California visualization runtime, signature labs, 3D/Manim and route/display metadata |
| A08/A12/A15 | provider/analytics state, learning-event and visualization-session API/persistence |
| A11/A22 | acceptance runner, source/measurement oracles, authorization ledger and browser lifecycle |
| A10 | package/config/build/staging tooling |
| A18 | curriculum/semantic-contract review boundary |
| A25 | exact archive, private recovery ref, and closure evidence |

## Archive verification

- Credential scan: no private key or provider credential. The three `sk-...` regex hits were redacted before inspection and are lexical substrings inside the phrase `diagnostic-on-disk-...`, not secret values.
- Exact cached path count: 227.
- Live-main byte comparison: 30 of 227 paths equal `origin/main`; no whole-tree absorption.
- Active resume byte comparison: 41 of 227 paths equal `codex/a06-ca-viz-resume-20260819`; no whole-tree absorption.
- Archive commit and GitHub archive ref: identical at `777f46db6ef16c209f3493f58ec1fb13df8daf94`.
- Post-commit worktree status: clean.
- `git diff --check`: five preserved blank-at-EOF warnings in phase-4 compositor lifecycle/raster fixture files.
- Current-turn runtime/browser tests: NOT RUN by design; the A22 handoff denies receipt reuse and another Chrome invocation without new authorization.
- The active CA resume worktree/branch was read only and remains untouched.
- No browser authorization ledger, live data, provider, deployment, local branch, or GitHub remote branch was mutated except creation of this private archive commit/ref.

## Non-forced physical-closure result

At `2026-08-22T20:42:44Z`, a plain, non-forced `git worktree remove /Volumes/Starship/MAIS-ca-viz-labs-wt` removed the Git worktree registration, then stopped with `Permission denied` while deleting the physical directory. No `--force`, `chmod`, `rm`, retry, or permission mutation followed.

The residual directory is intentionally retained for A22/owner evidence review. Read-only inspection found:

- about 150 GB total, including about 149 GB under ignored `.tmp/` storage;
- 1,090,191 `.tmp/` files;
- 187 files outside `.tmp/` and the stale `.git` pointer: 184 exactly match the archive commit, zero differ from it, and three generated `tsconfig.dist-tmp-*.json` files are not in the archive commit;
- the original worktree is absent from `git worktree list`, while the physical path remains and can no longer be used as a Git worktree because its administrative entry is gone.

This does not change the Stage C final state: the 227-path Git payload is an evidence archive at `777f46db6ef16c209f3493f58ec1fb13df8daf94`. It does mean physical cleanup is **not complete**. The residual directory must not be deleted until A22/owner classifies the ignored measurement/authorization material and the three generated configs. The local branch and private GitHub archive ref remain recovery references.

## Recovery

```sh
git fetch origin archive/a06-ca-visualization-labs-loop-wip-20260823
git worktree add /Volumes/Starship/MAIS-ca-viz-labs-recovered-wt 777f46db6ef16c209f3493f58ec1fb13df8daf94
```

Future acceptance requires diagnosis outside the production ledger, a fresh source-bound request, a fresh owner-delegated receipt, exactly one newly authorized exhaustive invocation, and a corrected post-run verifier. Any product reuse must be rebased/sliced from fresh main and independently reviewed. Retain both archive refs and the physical residual until the evidence boundary above receives an A22/owner decision.
