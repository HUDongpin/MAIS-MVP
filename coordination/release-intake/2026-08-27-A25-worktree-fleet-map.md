# Worktree fleet map — 2026-08-27

- **Scope:** all 123 registered worktrees + 126 local branches in `/Volumes/Starship/MAIS-MVP`
- **Method:** 100% enumeration. Per worktree: dirty state, ancestry vs `origin/main`, tip containment in any other ref, and PR status joined from a single `gh pr list` over 186 PRs.
- **Nothing was removed.** This is a map; every removal below needs your go-ahead.

> **Snapshot caveat:** the fleet is actively changing — it grew from 121 to 123 worktrees during this session. Re-run the collection before acting on the lists.

## Summary

| Bucket | Worktrees | Action |
| --- | ---: | --- |
| Clean, commits already on `origin/main` | 52 | **retire now** |
| Clean, tip contained in another branch (superseded) | 22 | **retire now** |
| Clean, but tip holds unique commits (316 total) | 30 | worktree yes, **branch no** |
| Dirty — real uncommitted work | 7 | **do not touch** |
| Dirty — tool droppings only (`.codex/`, `.vercel`, `coordination/skills/`) | 3 | your call |
| Open PR | 7 | keep |
| Primary root + main reference worktree | 2 | keep |
| **Total** | **123** | |

**74 worktrees (60% of the fleet) can be retired right now with zero commit loss** — 67 inside `.worktrees/`, 4 under `/private/tmp`, 2 Starship siblings, 1 other.

### Age profile

Median HEAD-commit age is **1 day**; maximum is **24 days**. This is not old cruft accumulating — it is a recent, fast build-up, almost entirely from harness-created `.worktrees/` runs (93 of 123).

---

## 1. Safe to retire now (74)

Clean trees whose commits are either already on `origin/main` or fully contained in another branch. Removing these loses nothing.

Full list: `coordination/release-intake/2026-08-27-A25-worktree-fleet-map.retire-list.txt`

```bash
# review first — prints each path with its dirty count (should all be 0)
while read -r p; do printf "%s\t%s\n" "$(git -C "$p" status --porcelain 2>/dev/null | wc -l)" "$p"; done \
  < coordination/release-intake/2026-08-27-A25-worktree-fleet-map.retire-list.txt
```

Retire them one at a time (never `--force`, per CLAUDE.md):

```bash
while read -r p; do git worktree remove "$p"; done \
  < coordination/release-intake/2026-08-27-A25-worktree-fleet-map.retire-list.txt && git worktree prune
```

## 2. Worktree can go, branch must stay (30)

These trees are clean, so the worktree is removable — but the branch tip holds **316 commits that exist nowhere else**. Removing the worktree is safe; deleting the branch would lose work.

| Branch | Unique commits |
| --- | ---: |
| `codex/a11-natural-ca60-v5-r10-review-identity-anchor-20260827` | +45 |
| `codex/a11-natural-ca60-v5-r9-review-identity-anchor-20260826` | +41 |
| `codex/a11-natural-ca60-v5-r6-review-20260826` | +34 |
| `codex/a11-natural-ca60-v5-r5-review-20260826` | +31 |
| `codex/a11-natural-ca60-v5-r4-review-20260826` | +28 |
| `codex/a06-cube-midpoint-plane-proof-20260824` | +26 |
| `codex/a11-natural-ca60-v5-r3-review-20260826` | +26 |
| `codex/a11-natural-ca60-v5-r2-review-20260826` | +24 |
| `codex/a22-natural-ca60-frame-readiness-exec-v5-20260826` | +12 |
| `DETACHED` | +9 |
| `codex/a12-parent-messages-20260823` | +5 |
| `release/2026-08-25-content-train` | +5 |
| `i18n/zh-hans-ratchet` | +5 |
| `codex/a12-resend-webhook-verifier-20260823` | +4 |
| … and 25 more | |

Most of these are the `codex/a11-natural-ca60-v5-r*` review chain. It is **not** a clean linear stack — I tested containment pairwise and 7 of that family are contained in a newer tip while 7 carry divergent commits. Whoever owns the CA60 lane should decide which anchors to keep; the rest can be closed out together.

## 3. Dirty — do not remove (10)

CLAUDE.md forbids removing a worktree with staged, unstaged or untracked content. Seven hold real work:

| Branch | Tracked | Untracked | Notes |
| --- | ---: | ---: | --- |
| `codex/a01-home-hero-chromebook` | 1 | 0 | single component edit |
| `codex/a12-parent-postgres-hotpath-20260823` | 18 | 5 | largest — touches `ci.yml`, storage health, warm route |
| `codex/a13-teacher-report-target-20260823` | 2 | 4 | new `teacherOperationsRequestState` module + test |
| `codex/a16-rsi-lite-calibration-f0-f2-20260823` | 1 | 11 | whole `rsi-lite-calibration-v1/v2` dirs + a QA operating policy |
| `ops/production-observability` | 12 | 2 | matches the observability lane already in memory as uncommitted |
| `codex/a14-parent-action-ui-20260823` | 4 | 1 | parent console components + two e2e specs |
| `fix/hk-chinese-audit-coverage` | 0 | 1 | audit script + a new simplified-only character list |

Three more are dirty only with tool droppings — `.codex/`, `.vercel`, `coordination/skills/`. They are still "untracked content" so the rule still applies, but the content is disposable if you say so.

## 4. Open PRs — keep (7)

- `fix/hk-revive-bespoke-labs` — PR #179
- `i18n/ca-translation-scaffold` — PR #174
- `fix/hk-grading-and-topics` — PR #176
- `claude/hk-viz-defect-fixes` — PR #172
- `fix/k5-data-display-diagrams` — PR #160
- `codex/a12-a22-production-app-storage-schema-20260827` — PR #188
- `codex/a13-teacher-search-redirect-fix-20260826` — PR #167

---

## What actually caused this

93 of 123 worktrees live under `.worktrees/`, and the median tip is one day old. This is harness-created isolation worktrees from agent runs not being cleaned up on completion, not humans forgetting to tidy branches. The 52 already-merged ones are the clearest evidence: their work landed on `main` and the tree was simply left behind.

CLAUDE.md's rule — *"After a branch lands: prove its linked worktree is clean, then remove that worktree the same day"* — is being followed for the branch and skipped for the worktree. The durable fix is a post-merge sweep, not a one-off cleanup; otherwise this returns to ~120 within a fortnight.

**Also worth noting:** local `main` was 321 commits behind `origin/main` until this session fast-forwarded it, and 10 worktrees are in detached HEAD. Both are consistent with the same pattern.

---

# OUTCOME — cleanup executed 2026-08-27

Authorized by the owner. **74 of 74 removed; 0 skipped, 0 failed.** Each tree was re-checked clean
immediately before its own `git worktree remove` (no `--force` anywhere).

## Pre-removal safeguards

- **6 local sqlite dev databases preserved** before removal, sha256-verified byte-for-byte:
  `/Volumes/Starship/MAIS-worktree-archive/2026-08-27-sqlite/` (168 MB, with `MANIFEST.tsv`
  recording source worktree, branch, size, sha256 and mtime). Archive deliberately placed **outside**
  the repo so 168 MB of untracked sqlite does not pollute `git status`.
- Verified beforehand: zero write activity in 24h across all 74; no `.env.local` in any of them;
  and `git worktree remove` proven by canary experiment **not** to delete through a
  `node_modules` symlink.

## Post-cleanup verification

| Check | Result |
| --- | --- |
| Shared `node_modules` | intact (684 MB, `next` present) |
| Local branches | **128** — up from 126, none deleted (worktree removal does not touch refs) |
| 29 unique-commit branches | all present and reachable |
| Detached worktree `infallible-aryabhata-439ae9` | removed by another session, **not** by this batch; its commits are safe in `claude/infallible-aryabhata-439ae9` (local + origin) |
| 7 dirty worktrees with real work | 7/7 preserved |
| 3 dirty worktrees with tool droppings | 3/3 preserved |
| 8 open-PR worktrees | 8/8 preserved |
| Primary root | untouched — `codex/edulab-mais` @ `a0a325f18d` |
| `MAIS-main-wt` reference worktree | present |

## Fleet counts after cleanup

| Metric | Before | After |
| --- | ---: | ---: |
| Registered worktrees | 122 | **48** |
| Detached worktrees | 10 | 0 |
| Dirty worktrees | 10 | 10 |
| Local branches | 126 | 128 |

`origin/main` via live `git ls-remote`: `1112f9af33` — local ref `1112f9af33` (aligned).

## Disk reclaimed

| Volume | Before free | After free | Reclaimed |
| --- | ---: | ---: | ---: |
| `/Volumes/Starship` | 2.6 TiB | 2.8 TiB | ~128 GiB |
| Boot (`/System/Volumes/Data`) | **1.4 GiB** | **32 GiB** | ~45 GiB |

The boot volume had been at 100% for days and broke two agent runs with `ENOSPC` during the China
audit. It now has real headroom.

## The recurrence problem is unchanged

67 of the 74 removed were harness-created `.worktrees/` runs. Nothing in this cleanup prevents them
accumulating again — expect a return to ~120 within a fortnight without a post-merge sweep.
