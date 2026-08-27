# A25 lifecycle record — China audit documentation branch

| Field | Value |
| --- | --- |
| Worktree | `/Volumes/Starship/MAIS-audit-docs-wt` |
| Branch | `docs/china-math-audit-2026-08` |
| Owner | Dongpin HU (Peter) — authored by Claude Code session on request |
| Target PR | **#193** — https://github.com/HUDongpin/MAIS-MVP/pull/193 |
| Creation date | 2026-08-27 |
| Expected closeout | on PR merge; remove the worktree the same day |
| Commit | `1dd412905b` (26 files, +16,645 lines, documentation only) |
| node_modules | symlink → `/Volumes/Starship/MAIS-MVP/node_modules` |

## Contents

- `2026-08-26-china-math-full-audit-report.md` + 12-file evidence directory
- `2026-08-26-china-math-remediation-plan.md`
- `2026-08-27-china-math-audit-rebaseline.md` + 7 per-family re-measurement reports
- `2026-08-27-china-math-audit-rebaseline.slice-index.json`

Both 2026-08-26 documents carry a supersession banner pointing at the re-baseline, because the
corpus they describe (17,700 items) no longer exists and several of their claims do not reproduce
on main.

## Why it was needed

The decision record for a quarter of proposed engineering existed only on `codex/edulab-mais` —
360+ commits behind main, and the one checkout whose git guard was inert because it predates
`ee9b5e63fe`. Unmerged, it could not be cited, reviewed or superseded normally.

## Verification

`npm run test:release-governance` → 102 tests, 91 pass, 0 fail with the files staged. The initial
run failed with `ERR_MODULE_NOT_FOUND: yaml`, which was a missing `node_modules` symlink in the new
worktree, not a governance violation — symlinking per the CLAUDE.md convention resolved it.

Directory convention confirmed: `coordination/content-qa/` already holds multi-MB JSON evidence
(largest existing file 9.68 MB); this change adds 1.1 MB.
