# A25 evidence archive — China visualization labs loop WIP

- Generated: `2026-08-25T07:32:29Z` (`2026-08-25` Asia/Hong_Kong)
- Stage C final state: **evidence archive**
- Original branch: `codex/a06-china-visualization-labs-loop`
- Original worktree: `/Volumes/Starship/MAIS-china-viz-labs-wt`
- Original branch head: `f865cadd51220bd5da2acc5f9659ba55d72a887a`
- Archive commit: `eedf0977047369a54ef4694201ecb647d713d090`
- GitHub archive ref: `origin/archive/a06-china-visualization-labs-loop-wip-20260825`
- GitHub PR for the original branch: none
- Repository visibility: `PRIVATE`

## Decision

Preserve the exact 127-path China visualization-labs WIP tree as a private evidence archive, completing the loop closeout symmetrically with the CA and HK siblings (`origin/archive/a06-ca-visualization-labs-loop-wip-20260823`, `origin/archive/a06-hk-visualization-labs-loop-wip-20260823`), which had archive refs and intake records while the China loop had neither. Do not open a PR from this ref and do not claim China curriculum or browser acceptance.

The committed A25 stop-and-preserve record on the original branch (`f865cadd51`) declared the loop STOPPED, the branch a sanitized review/archive checkpoint only (65 semantic-oracle labs still repair-required, C5 frozen-hash chain on HOLD), and explicitly designated the ~127 uncommitted worktree paths as preserved-in-worktree. This archive moves that preservation from a local disk to a private origin ref. It is not a reviewable A06 feature slice: it mixes shared-host wiring, new session outbox/LRS delivery modules, divergent HK primary/secondary lab variants, sqlite mutation-boundary/compaction/concurrency tests, the A18 semantic-oracle ledger and 65-red remediation blueprint, 15 coordination session logs (2026-08-20/21), and a `package.json` test-script addition known to violate the frozen-scripts CI gate if ever PRed.

## Ownership and provenance of the 127 paths

Per the 2026-08-25 cleanup audit's per-path hash check against every origin ref:

| Group | Count | Notes |
|---|---|---|
| Byte-identical to the HK archive ref | 25 | shared types/data/catalog files (`types/index.ts`, `data/questions.ts`, `data/topics.ts`, visualizationSessionCatalog, …) |
| Byte-identical to the CA archive ref | 2 | `Navbar.tsx` + its test |
| Local-only (no copy on any origin ref before this archive) | 100 | shared-host wiring, outbox/LRS modules, HK lab variants, A18 semantic-oracle ledger + remediation files, session logs, release-gate runner |

| Owner lane | Archived concern |
|---|---|
| A06 | mainland lab components/models, shared visualization hosts, three/ canvas files |
| A18 | mainland semantic-oracle ledger and 65-red remediation blueprint (`coordination/content-qa/`) |
| A08/A12 | session API routes, learning-events/LRS delivery, userStore persistence files |
| A11/A22 | acceptance/e2e session-durability tests, playwright config, release-gate runner scripts |
| A25 | this archive, private recovery ref, and closure evidence |

## Archive verification

- Secret-pattern scan over all 127 dirty paths (private-key headers, AWS/OpenAI/GitHub/Slack token shapes): 0 hits.
- Staged path count == dirty path count == 127 (staged via explicit `--pathspec-from-file` list; no `git add -A`).
- Archive commit and GitHub archive ref: identical at `eedf0977047369a54ef4694201ecb647d713d090`; parent is the original branch head `f865cadd51`.
- Post-commit worktree status: clean.
- Original branch head remains on `origin/codex/a06-china-visualization-labs-loop` and inside `origin/archive/a23-closeouts-main-merge-20260823`; the original branch ref was not moved or deleted.
- Plain non-forced `git worktree remove /Volumes/Starship/MAIS-china-viz-labs-wt` succeeded after the clean check; the path and registration are absent.
- Current-turn runtime/browser/content tests: NOT RUN; this is a stale-main, mixed-owner evidence archive, not an integration/release candidate.
- No GitHub remote branch was deleted.

## Recovery

```sh
git fetch origin archive/a06-china-visualization-labs-loop-wip-20260825
git worktree add /Volumes/Starship/MAIS-china-viz-labs-recovered-wt eedf0977047369a54ef4694201ecb647d713d090
```

Any future promotion must start from fresh main and follow the stop-and-preserve handoff's checklist: hunk-level reconciliation of shared hosts, resolution of the 65 semantic-oracle findings, C5 hash renewal, A18/A11/A22 sign-off, and removal of the frozen-scripts-violating `package.json` additions.

## Post-archive closure

At `2026-08-25T07:32Z`, after verifying identical local/remote archive tips and clean status, the worktree was removed with plain non-forced removal. Local branches `archive/a06-china-visualization-labs-loop-wip-20260825` (tracking the archive ref) and `codex/a06-china-visualization-labs-loop` (at `f865cadd51`, on origin twice) remain. No local or GitHub remote branch was deleted.
