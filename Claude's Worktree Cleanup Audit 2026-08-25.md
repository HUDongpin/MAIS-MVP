# Worktree & Branch Cleanup Audit — 2026-08-25

**Scope:** visualization labs, lab verification, and US-curriculum alignment work — plus everything else registered in this checkout, since removal safety can only be judged repo-wide.
**Method:** 41 registered worktrees and ~80 local branches scanned mechanically; 39 worktrees deep-audited by 17 parallel agents (dirty-file inspection, patch-containment vs `origin/main`, remote-ref containment per tip, PR mapping); every "remove now" verdict re-verified adversarially.

---

## TL;DR

| Category | Count | Meaning |
|---|---|---|
| 🟢 **Remove today** | 9 worktrees | Zero unique work at risk; 7 verified spotless, 2 need a one-line junk restore first |
| 🔴 **Push first (urgent)** | 1 line of work | The TypeScript math kernel — **25 commits on zero origin refs, only copy is local** |
| 🟡 **Harvest evidence, then remove** | 9 worktrees | Branch tips are safe, but unduplicated verification receipts / small fixes live only in the working tree |
| 🟠 **Needs your decision** | 13 worktrees | Real unmerged work: land it, archive it, or explicitly abandon it |
| 🔵 **Keep** | ~20 worktrees | Open PRs #142–#147 and the active 2026-08-25 promotion-gate batch |
| ⚪ **Branch-only deletions** | 11 local branches | No worktree; byte-identical to `origin/archive/*` refs |

Single most urgent action: `git -C /Volumes/Starship/MAIS-math-kernel-wt push -u origin codex/a06-math-kernel-ts-20260823` — one push protects 25 commits (+23k lines) currently existing only on this disk.

---

## 1 · 🟢 Remove today (9 worktrees)

All verified: no unique commits anywhere but on `origin`, and no dirty content beyond disposable junk (generated `next-env.d.ts`, duplicate `.codex/hooks.json` copies, a worktree-local launch entry).

| Worktree | Branch | Why it's safe |
|---|---|---|
| `.worktrees/a06-ca-viz-resume-20260819` | `codex/a06-ca-viz-resume-20260819` | **CA viz session self-closed 2026-08-22**; its 3 commits (CA acceptance harness + closeout doc) are on its own origin ref **and** two `origin/archive/a23-closeouts-*` refs; the Codex CA labs it tested are being retired by PR #143. Only dirt: generated `next-env.d.ts` pointer |
| `.claude/worktrees/elated-burnell-b988cb` | `claude/elated-burnell-b988cb` | AR tag fix is an **ancestor of open PR #147** (dazzling-villani) and of hungry-lehmann; lands with #147. Worktree spotless |
| `.claude/worktrees/cool-lamarr-a66bd6` | `fix/starship-canonical-root` | **PR #92 merged.** Dirt = worktree-local launch entry + generated file + duplicate hooks.json |
| `.claude/worktrees/happy-lamport-055156` | `security/ai-tutor-voice-moderation` | **PR #135 merged**, remote branch already pruned. Dirt = duplicate hooks.json |
| `.claude/worktrees/fervent-murdock-e2535c` | (detached, PR #93 merged) | Tip in `origin/main` **and** a dedicated archive ref. Dirt = duplicate hooks.json |
| `MAIS-qwen-3-8-max-prod-wt` | (detached, PR #124 merge) | Fully clean; tip in `origin/main` + archive ref |
| `.worktrees/a08-parent-auth-state-20260823` | `codex/a08-…` | Never diverged — tip is a main-history commit; work continued on the v3/v4 lines |
| `.worktrees/a14-parent-ui-reliability-20260823` | `codex/a14-…-reliability` | Same: zero commits ever made |
| `.worktrees/a23-parent-full-remediation-20260823` | `codex/a23-…` | Same: superseded by v3/v4 (PR #142 open on v4) |

**Ready-to-run batch** (from the primary root; `git restore` is guard-permitted; no `--force` anywhere):

```bash
cd /Volumes/Starship/MAIS-MVP
# junk cleanup so plain worktree-remove succeeds
git -C .worktrees/a06-ca-viz-resume-20260819 restore next-env.d.ts
git -C .claude/worktrees/cool-lamarr-a66bd6 restore .claude/launch.json next-env.d.ts
rm .claude/worktrees/cool-lamarr-a66bd6/.codex/hooks.json && rmdir .claude/worktrees/cool-lamarr-a66bd6/.codex
rm .claude/worktrees/happy-lamport-055156/.codex/hooks.json && rmdir .claude/worktrees/happy-lamport-055156/.codex
rm .claude/worktrees/fervent-murdock-e2535c/.codex/hooks.json && rmdir .claude/worktrees/fervent-murdock-e2535c/.codex
# remove the 9 worktrees
git worktree remove .worktrees/a06-ca-viz-resume-20260819
git worktree remove .claude/worktrees/elated-burnell-b988cb
git worktree remove .claude/worktrees/cool-lamarr-a66bd6
git worktree remove .claude/worktrees/happy-lamport-055156
git worktree remove .claude/worktrees/fervent-murdock-e2535c
git worktree remove /Volumes/Starship/MAIS-qwen-3-8-max-prod-wt
git worktree remove .worktrees/a08-parent-auth-state-20260823
git worktree remove .worktrees/a14-parent-ui-reliability-20260823
git worktree remove .worktrees/a23-parent-full-remediation-20260823
git worktree prune
# their now-orphaned local branches (plain -d; each tip proven on origin)
git branch -d codex/a06-ca-viz-resume-20260819 claude/elated-burnell-b988cb \
  fix/starship-canonical-root security/ai-tutor-voice-moderation \
  codex/a08-parent-auth-state-20260823 codex/a14-parent-ui-reliability-20260823 \
  codex/a23-parent-full-remediation-20260823
```

Optional remote pruning: `origin/fix/starship-canonical-root` (merged via #92) and `origin/codex/a06-ca-viz-resume-20260819` (retained by two archive refs) can also be deleted; `origin/claude/elated-burnell-b988cb` only **after** PR #147 merges. Per the session contract, record the fresh branch/worktree counts after the batch.

---

## 2 · 🔴 Push first — local-only work at risk

| Work | Where | Exposure | Action |
|---|---|---|---|
| **TS exact math kernel — 25 commits, 104 files, +23,248 lines** | `MAIS-math-kernel-wt` and `mais-cube-midpoint-plane-proof-wt` (both pinned at `fc99e39e54`) | `git branch -r --contains` → **empty**. Zero origin copies | `git -C /Volumes/Starship/MAIS-math-kernel-wt push -u origin codex/a06-math-kernel-ts-20260823`. One push protects both branches. Afterwards the clean `MAIS-math-kernel-wt` is redundant (remove it same day); keep the cube-midpoint worktree — it's the live continuation and holds 8 uncommitted demo-lab files that should also be committed and pushed |
| Resend webhook verifier — 1 unpushed commit | `.worktrees/a12-resend-webhook-verifier-20260823` | Origin ref exists but tip is 1 ahead | `git -C .worktrees/a12-resend-webhook-verifier-20260823 push` |
| **Parent-console 2026-08-23 batch — 11 branches with local-only tips** (a11-parent-gates ×2 cmts, a12-guardian-invites ×3, a12-messages ×5, a12-privacy-api ×1, a12-session-revocation ×3, a12-teacher-notice-outbox ×21, a13-report-target ×2, a14-ui-final ×4, a23-integration-v2 ×2, parent-gap-ack-report ×10) | `.worktrees/a12-*`, `a13-*`, `a14-parent-ui-final`, `a23-parent-integration-v2` | No same-name origin refs at all | Out of this cleanup's scope, but flagging per contract: PR #142 (v4 line) likely supersedes much of it, yet supersession is unproven per-branch. Either batch-push them as archive refs or get an explicit supersession sign-off after #142 merges. **Do not delete any of these now** |

---

## 3 · 🟡 Harvest, then remove (9 worktrees)

Every branch tip here equals `origin/main` (or is fully pushed) — the *commits* are safe. What blocks removal is unduplicated content sitting untracked in the working trees.

### RSI-Lite calibration verification chain (7 worktrees)

Each holds the **only copy** of its lane's independent receipts. Notably: `a18-review-v111` holds the receipt that owner waiver **A18-HW-1 hash-binds** (losing it breaks waiver verifiability); `a22-isolation-v111` holds the complete A22 F3 blocker→repair→approval chain; `a25-preflight-v111` additionally has 6 git-**ignored** `.local/` F3 authorization receipts that would vanish silently on removal.

| Worktree | Unique evidence |
|---|---|
| `a11-rsi-independent-replay-20260823` | A11 first-round + v2 runner-replay receipts, session log |
| `a11-rsi-independent-replay-v111-20260823` | A11 v111 + F3 v3–v6 receipt chain |
| `a18-rsi-independent-review-20260823` | A18 review that found the 351+154 CA violations forcing 1.1.0→1.1.1 |
| `a18-rsi-independent-review-v111-20260823` | **A18-HW-1 waiver-bound receipt** |
| `a22-rsi-independent-isolation-20260823` | A22 needs-repair + v2 receipts, five-role isolation replays |
| `a22-rsi-independent-isolation-v111-20260823` | A22 F3 v3–v6 chain (release-engineering half of F3 gating) |
| `a25-rsi-independent-preflight-v111-20260823` | 11 A25 intake receipt files + 6 git-ignored `.local` F3 receipts |

**Recommended harvest:** copy each worktree's `coordination/` tree (plus a25's `.local` receipts) into `/Volumes/Starship/MAIS-MVP/.local/evidence-archives/rsi-lite-cal-v1/<lane>/` with a `MANIFEST.sha256`, mirroring the existing `mais-natural-ca60-v1` durable archive. Then remove all 7 worktrees and `git branch -d` all 7 branches (zero unique commits each). I can script the whole harvest + verify + remove sequence on request.

### The other two

| Worktree | Situation | Action |
|---|---|---|
| `.worktrees/a25-natural-ca60-intake-20260824` | Both report files **md5-verified identical** to the durable store; tar attested PASS | Optionally copy the 2 reports into root `coordination/release-intake/` for discoverability, then remove + `branch -d`. (Its own report asks for owner authorization — this report is your authorization vehicle) |
| `MAIS-hk-ease-v2-qa-wt` | HK stop-and-preserve branch fully on origin; 4 untracked mainland files are hash-identical to the archive ref — but **six 2026-08-11 S18 full-bank audit reports exist only here** | Commit the six S18 reports onto the same preservation branch and push, delete the 4 duplicate mainland files, then remove worktree (branch stays as the HK archive) |
| `.claude/worktrees/nervous-borg-384852` | Branch redundant (tip on 8 origin refs), but holds an **uncommitted, unduplicated sqlite bootstrap race fix** in `lib/server/userStore.ts` (+10/−7: busy_timeout before WAL, idempotent schema_migrations insert) | Worth landing: commit as a small `fix/sqlite-bootstrap-race` PR (stage only that file — it's a shared hotspot), then remove worktree + `branch -d` |

---

## 4 · 🟠 Needs your decision (13 worktrees)

The in-scope items first — each with my recommendation.

### Visualization labs

**`MAIS-china-viz-labs-wt` — `codex/a06-china-visualization-labs-loop`** — the big one.
The 4 checkpoint commits (~137k lines) are safely on two origin refs. But the worktree carries 127 dirty paths of which **100 exist nowhere else** — shared-host wiring, new outbox/LRS modules, HK lab variants, the A18 semantic-oracle ledger, the 65-red remediation blueprint, and 10 session logs — and the committed A25 stop-and-preserve record *explicitly designates this worktree as their preservation site*. The CA and HK sibling loops each got an `origin/archive/*-wip-20260823` ref plus a release-intake evidence pair; **the China loop got neither**. Its closeout is incomplete.
**Recommendation (A):** mirror the sibling treatment — new `archive/a06-china-visualization-labs-loop-wip-20260825` branch, stage the 127 paths by name (file lists are saved in my scratchpad), commit, push, write the matching release-intake evidence pair, then remove the worktree. Alternatives: (B) resume the promotion checklist from the handoff doc, or (C) recorded abandonment (loses the semantic-oracle ledger — not recommended).

**`MAIS-trig-unit-wave-redesign-wt`** — zero commits; all value is 19 uncommitted files: a staged-caption redesign of the trig unit-wave 3D scene + video pipeline. Sole copy; **not** superseded by PR #143 (which is CA-scoped and doesn't touch the scene registry). **Recommendation:** commit on its branch and `push -u` (archive-or-continue can be decided later; the push removes the risk).

**`mais-manim-v3-implementation-wt`** (~/Documents/Codex/2026-08-23) — zero commits; ~54 uncommitted files forming the Manim v3 RC: a WebM video-export pipeline + a teacher authoring feature. Sole copy. Note: it adds a `manim:mp4` package script, which the frozen-scripts CI gate will reject as-is. **Recommendation:** commit + `push -u` now to protect it; split into two PRs later (pipeline vs authoring) and drop/gate the package script.

### US-curriculum alignment (California + Arkansas)

**`.claude/worktrees/funny-jackson-e79346` — `claude/funny-jackson-e79346`** — the **completed** CA S2–S6 array-shift fix (~2,146 lines across the CA question/textbook packs), pushed but **has no PR**, and it strictly contains PR #144's commit. **Recommendation:** open a PR from funny-jackson and close #144 as superseded — cleanest path; merging #144 alone leaves S2–S5 wrong.

**`.claude/worktrees/hungry-lehmann-b78f72`** — the AR g9-ch04/05 + g12-ch03 regeneration (~4,690 lines), pushed, **no PR**, and it rewrites the same AR `question-pack.json` as PRs #146/#147. **Recommendation:** merge #145 → #146 → #147 first, then rebase hungry-lehmann onto main, resolve the pack conflicts, and open its PR. (Worktree removable once its PR exists.)

**`MAIS-ca-content-qa-wt` — `content/us-ca-math-lesson-qa`** — 99 commits (QA rounds 9–17, Aug 2–11), fully pushed, no PR, **divergent history**: main's question-pack lineage (the one PRs #144/#146 patch) never took these edits, and main has since moved 120 commits with overlapping fixes. **Recommendation: selective harvest** — cherry-pick the ~25 `audit-us-ca-*` gate scripts plus the a11y/grading fixes onto a fresh branch off main; don't attempt a full reconcile (conflict-heavy, content already re-fixed on main). The worktree is clean, so after harvesting, remove it; the branch stays on origin either way.

### Verification loops

**`MAIS-a11-practice-pager-two-door-e2e-wt`** — 6 pushed commits of *follow-on* two-door e2e work (not a duplicate of merged #141; it builds on top of it), incl. two user-visible round-state fixes in `page.tsx`/`PracticeQuestionCard`. **Recommendation:** land — merge main in, reconcile `practice-pager.spec.ts` with #117's additions, open a PR. Archive is acceptable if the two-door area is done moving.

**`MAIS-15-bug-product-wt` — `codex/a04-a05-fix-15-product-bugs`** — 34 pushed commits; the 15 bug fixes are **not** on main (only the math-keyboard fix landed separately as #117). Distinct line from the archived `a05-15-bug-loop`. **Recommendation:** split and land — product fixes first, the large e2e expansion second; expect conflicts vs #117 in the keyboard files.

**`.worktrees/a16-rsi-lite-calibration-f0-f2-20260823`** — author lane of the RSI program; closeout **explicitly blocked** by the A25 intake report (pending owner git authorization + a fixture secret-scan concern). Holds an uncommitted AGENTS.md governance amendment + machine-QA policy docs. **Recommendation:** decide whether to PR the policy docs (resolving the secret-scan flag first); until then this worktree stays.

### Adjacent (flagged for completeness)

| Worktree | Situation | My lean |
|---|---|---|
| `.worktrees/a18-hk-safe-closeout-20260822` | 1,449-line tested visualization session outbox (2 commits, pushed, no PR); main has an older semantically-equivalent contract file | Land it (small rebase), else declare the origin ref archival and remove the clean worktree |
| `MAIS-china-all-math-qa-wt` | Checkpoint safely on origin, but 4 uncommitted product fixes (LocalizedText correct-answer, CalculusStatsLab mode-lock, zh volume-term fix, HK ledger test) exist only here | Extract each as a small PR from fresh main, then archive-close the worktree |
| `MAIS-parent-action-ui-wt` | A25 blocker report withholds removal authorization; 5 uncommitted files; `parentNavIcons.tsx` is byte-identical on the PR #142 branch (supersession likely but not byte-proven for the other 4) | Commit the 5 files to an archive ref now (cheap safety), decide after #142 merges |
| `.claude/worktrees/confident-archimedes-43307f` | Gamification reward fix pushed to origin, no PR; its premise (manual complete button removed) never landed, and `userStore.ts` has been heavily refactored since | Re-implement on fresh main using the pushed commit as spec, or record abandonment |

---

## 5 · 🔵 Keep (active work)

| Worktree | Branch / PR | Note |
|---|---|---|
| `MAIS-claude-caviz-wt` | **PR #143** (CA Codex-viz replacement) | Phases 2b/3 still open. Remove worktree + launch.json entry after merge |
| `.claude/worktrees/eager-dhawan-4c9854` | **PR #144** | Subset of funny-jackson — see §4 decision |
| `.claude/worktrees/brave-chatterjee-06ae8c` | **PR #145** | AR K–G5 CCSS remap |
| `.claude/worktrees/elastic-meninsky-febf37` | **PR #146** | AR review-focus leak fix (61 prompts) |
| `.claude/worktrees/dazzling-villani-8bb6ec` | **PR #147** | AR g8 regeneration |
| `.worktrees/a23-parent-full-remediation-20260823-v3` + PR #142's v4 line | **PR #142** | Parent remediation |
| 12 × `.worktrees/*promotion*-20260825` | own origin refs, in sync | Today's active promotion-gate batch — untouched by this audit |
| `MAIS-observability-wt`, `MAIS-phase0-auth-wt`, `MAIS-zh-hans-wt`, `MAIS-nova-tutor-wt`, `MAIS-classroom-load-wt`, `MAIS-child-legal-wt`, `MAIS-home-hero-wt` | standing branches (memory-tracked) | Each awaiting merge/env decisions outside this audit's scope |

⚠️ **AR merge-order warning:** #146, #147, and hungry-lehmann all rewrite the same AR `question-pack.json`; #147's tip commit overlaps #146's fix. Suggested order: **#145 → #146 → #147 → rebase hungry-lehmann → its PR**. On the CA side: funny-jackson PR replaces #144.

---

## 6 · ⚪ Branch-only deletions (no worktree attached)

All 11 verified **byte-identical to an `origin/archive/*` ref** — the local copies add nothing:

`codex/a06-ca-visualization-labs-loop` · `codex/a06-hk-visualization-labs-loop` · `codex/a05-15-bug-loop` · `codex/a04-practice-two-doors` · `codex/a18-hk-all-math-lesson-qa` · `worktree-lesson-remove-viz-completion` · `feat/tutor-moderation-provider` · `codex/next16-3-parity` · `codex/a01-a12-google-oauth-loop` · `codex/a23-closeouts-main-merge-20260822` · `codex/a23-closeouts-main-ready-20260822`

```bash
git branch -D codex/a06-ca-visualization-labs-loop codex/a06-hk-visualization-labs-loop \
  codex/a05-15-bug-loop codex/a04-practice-two-doors codex/a18-hk-all-math-lesson-qa \
  worktree-lesson-remove-viz-completion feat/tutor-moderation-provider \
  codex/next16-3-parity codex/a01-a12-google-oauth-loop \
  codex/a23-closeouts-main-merge-20260822 codex/a23-closeouts-main-ready-20260822
```

(`-D` because upstreams point at archive refs, so `-d` would refuse; every tip was hash-verified on origin. This is an explicit, itemized list — not a wildcard bulk delete.)

Also: `feat/legal-accessibility-foundation` is on origin twice (own ref + archive ref) — local copy deletable at your option. Local `main` is stale (behind 50; its one extra commit `a444b0dcc6` rides into `origin/main` when any of PRs #144–#147 merges) — leave it, or fast-forward it from a worktree, never from the primary root.

---

## 7 · Primary-root housekeeping

- `.tmp-ca-viz-r21/` (3.6 MB) — tsx transpile **cache** from the Aug-21 CA QA round 21. Fully regenerable: `rm -rf /Volumes/Starship/MAIS-MVP/.tmp-ca-viz-r21`.
- ~50 untracked `coordination/release-intake/*` evidence files (incl. the CA/HK viz-loop archives and A25 reports) — these are the *only* copies of several A25 intake records and are not on `origin/main`. Worth landing via a small docs PR, or folding into the evidence-archive store, so root dirt stops accumulating.
- Modified `AGENTS.md`, `CLAUDE.md`, `.claude/launch.json` in the root — belong to a live session; not touched by this audit.

---

## Suggested next steps (in order)

1. **Push the math kernel** (one command, §2) — erases the only true data-loss risk found.
2. **Run the §1 removal batch** — 9 worktrees + 7 branches gone with zero risk; record the fresh counts per the session contract. I can execute this on your go-ahead.
3. **Decide the CA PR strategy** (§4): my recommendation — open the funny-jackson PR, close #144, then merge AR in the order #145 → #146 → #147, rebase hungry-lehmann, PR it.
4. **Authorize the RSI evidence harvest** (§3) — I can script the copy + manifest + verify + remove sequence for all 7 worktrees in one pass.
5. **Approve the China viz-loop archive branch** (§4, option A) — completes the loop closeout symmetrically with CA/HK, then that big worktree can go.
6. Work the remaining decision queue (§4) one item at a time — trig/manim pushes are 2-minute wins; ca-content-qa harvest and the 15-bug/two-door landings are the larger jobs.

*Generated by Claude from a 17-agent audit; every REMOVE verdict was independently re-verified against live `git status` and remote-containment checks before inclusion.*

---

## Closeout record — steps 1 & 2 executed 2026-08-25

**Step 1 done.** `codex/a06-math-kernel-ts-20260823` pushed to origin (`fc99e39e54`, all 25 kernel commits); verified via `git branch -r --contains`. Both local kernel branches are now protected. `MAIS-math-kernel-wt` is now clean **and** redundant — removable whenever convenient (the cube-midpoint worktree carries the live continuation).

**Step 2 done.** All 9 worktrees removed with plain `git worktree remove` (no `--force`) after fresh spotless checks; junk restored/deleted first (each deleted `.codex/hooks.json` re-verified byte-identical to the root's tracked copy via `cmp` before deletion). One incident: the `a06-ca-viz-resume` directory deletion initially failed on **read-only `frozen-source` snapshots** inside its git-ignored `.tmp/ca-viz-acceptance-*` caches; the worktree was already deregistered, and the residual cache-only directory was unlocked (`chmod -R u+w`) and deleted after confirming it held only regenerable acceptance-run snapshots and stale copies of origin-safe tracked files.

7 orphaned local branches deleted: `codex/a06-ca-viz-resume-20260819`, `claude/elated-burnell-b988cb`, `fix/starship-canonical-root`, `security/ai-tutor-voice-moderation` (explicit single `-D`; upstream already pruned, containment in `origin/main` re-proven immediately before), `codex/a08-parent-auth-state-20260823`, `codex/a14-parent-ui-reliability-20260823`, `codex/a23-parent-full-remediation-20260823`.

**Fresh counts (per session contract, live remote query used):**

| Metric | Value |
|---|---|
| Local branches | 81 |
| Registered worktrees | 68 (was 77 before the batch) |
| Dirty worktrees | 26 |
| Detached worktrees | 0 (both former detached worktrees removed) |
| `origin/main` (live `ls-remote`) | `b6c7c347a4` — local `origin/main` ref in sync |
| Local `main` | 50 behind / 1 ahead (`a444b0dcc6`, rides in via PRs #144–#147) |

Correction to the original TL;DR: the pre-batch registry held **77** worktrees, not 41 (miscount in the summary prose; the audit itself covered the full registry).

**Step 4 (RSI evidence harvest) done — executed 2026-08-25, owner-accepted.**
All 7 RSI worktrees' unduplicated evidence harvested into `/Volumes/Starship/MAIS-MVP/.local/evidence-archives/rsi-lite-cal-v1/<lane>/` (+ `PROVENANCE.md` at the store root), mirroring the `mais-natural-ca60-v1` durable archive: **399 files** across lanes `a11-replay-v100` (61), `a11-replay-v111` (67), `a18-review-v100` (55), `a18-review-v111` (63), `a22-isolation-v100` (63), `a22-isolation-v111` (72), `a25-preflight-v111` (18 — includes the six git-ignored `.local` F3 v4/v5/v6 intake receipts). Each lane's `MANIFEST.sha256` was computed from the source bytes and re-checked against the copies (`shasum -a 256 -c` — all pass, counts match). A final per-file guard then re-proved every remaining untracked file was hash-present in its lane manifest **before** originals were deleted; all 7 worktrees went porcelain-clean and were removed with plain `git worktree remove` (no `--force` needed anywhere). All 7 branches deleted after verifying each tip equaled the live `origin/main` tip `b6c7c347a4`. The a11-v111 worktree's 18MB git-ignored `.local` replay store was discarded per the audit's "regenerable working state" call (its receipts are in the archive).

**Fresh counts after the harvest batch (live remote query used):**

| Metric | Value |
|---|---|
| Local branches | 74 |
| Registered worktrees | 61 |
| Dirty worktrees | 19 |
| Detached worktrees | 0 |
| `origin/main` (live `ls-remote`) | `b6c7c347a4` — local ref in sync |

**§3 remainder done — executed 2026-08-25, owner-directed.**

1. **hk-ease S18 reports:** the six 2026-08-11 S18 full-bank audit reports committed onto the preservation branch as `027f0c1be2` (591,682 insertions) and pushed to `origin/codex/a18-hk-ease-v2-qa`; the four `components/visualizations/mainland/` files were re-hash-verified byte-identical to the `origin/archive/a06-hk-visualization-labs-loop-wip-20260823` blobs and deleted; worktree went clean and was removed. The branch stays (local == origin) as the HK archival line.
2. **nervous-borg sqlite fix → [PR #148](https://github.com/HUDongpin/MAIS-MVP/pull/148).** The uncommitted `userStore.ts` bootstrap-race fix was re-applied onto current `origin/main` (offset +34, clean) in a new worktree `/Volumes/Starship/MAIS-sqlite-bootstrap-race-wt`, branch `fix/sqlite-bootstrap-race` (owner: Claude cleanup session; created 2026-08-25; target PR #148; expected closeout: remove worktree + branch after merge). Verified before commit: an 8-process concurrency smoke of the exact bootstrap sequence (all succeed, exactly one `schema_migrations` row) and a full `tsc --noEmit` pass. The nervous-borg worktree's copy was then discarded, the worktree removed, and `claude/nervous-borg-384852` deleted (tip survives on 8 origin refs).
3. **a25-natural-ca60-intake:** both report files re-verified byte-identical (`cmp`) to the durable store, copied into the primary root's `coordination/release-intake/` for discoverability, the worktree's duplicate `.local` tar discarded, worktree removed, branch deleted (tip == `origin/main`).

**Fresh counts (live remote query used):** 73 local branches · 59 registered worktrees · 16 dirty · 0 detached · `origin/main` = `b6c7c347a4`, local ref in sync.

**§4 first tranche done — executed 2026-08-25, owner-directed.**

1. **China viz-labs archive branch (option A) complete.** All 127 dirty paths (fresh count matched the audit exactly; secret-pattern scan: 0 hits) staged via an explicit pathspec file — no `add -A` — onto new branch `archive/a06-china-visualization-labs-loop-wip-20260825`, committed as `eedf097704` on top of the original head `f865cadd51`, and pushed; local and remote archive tips verified identical. The worktree went porcelain-clean and was removed with plain non-forced removal. The original branch `codex/a06-china-visualization-labs-loop` is untouched (still on origin twice). The matching intake pair `coordination/release-intake/2026-08-25-A25-a06-china-visualization-labs-loop-evidence-archive.{md,json}` was written in the primary root, completing the closeout symmetrically with the CA/HK siblings.
2. **Trig unit-wave redesign protected.** All 19 sole-copy files committed on `codex/a06-trig-unit-wave-redesign-20260823` and pushed (`push -u`, new origin ref); worktree clean. Fate (continue vs archive) remains an open A06 decision, but nothing is at risk.
3. **Manim v3 RC protected.** All 77 sole-copy paths (video-export pipeline + teacher authoring) committed on `codex/a06-mais-manim-v3-rc-20260823` and pushed (`push -u`, new origin ref); worktree clean. The commit message records the known frozen-scripts violation (`manim:mp4`) and the split-into-two-PRs guidance for any future landing.

**Fresh counts (live remote query used):** 74 local branches · 58 registered worktrees · 13 dirty · 0 detached · `origin/main` = `b6c7c347a4`, local ref in sync.

**§6 branch-only deletions + math-kernel worktree done — executed 2026-08-25, owner-directed.**

- All 11 archive-synced local branches were freshly re-verified byte-identical to their `origin/archive/*` refs (the a23-closeouts pair proved exact-SYNC too) and confirmed unattached to any worktree, then deleted individually (`-d` first, `-D` fallback; each deletion line records the recoverable hash). Every tip remains recoverable from its archive ref.
- `MAIS-math-kernel-wt` verified porcelain-clean with its tip `fc99e39e54` confirmed on `origin/codex/a06-math-kernel-ts-20260823`, then removed with plain non-forced removal. The local branch is kept (tracking its origin ref) until the A06 PR decision consolidates the two kernel branch names; the cube-midpoint worktree remains the live continuation at the same tip (its 8 untracked demo files are still an open §4 item).

**Fresh counts (live remote query used):** 63 local branches · 57 registered worktrees · 13 dirty · 0 detached · `origin/main` = `b6c7c347a4`, local ref in sync.

**CA/AR PR strategy executed — 2026-08-25, owner-accepted sequence.**

1. **CA:** [PR #149](https://github.com/HUDongpin/MAIS-MVP/pull/149) opened from funny-jackson, #144 closed as superseded (it had zero reviews), #149 **merged**. Two complications surfaced and were fixed en route: (a) the worktree had been parked on a detached HEAD by an earlier session — the branch was fast-forwarded onto the new commits; (b) CI's `validate` gate failed because the corrected S6 ch-04 data (function → rate of change) now derives template `calculus-rate-area` while the hand-maintained premium direct-route maps still said `function-family` — both map entries were realigned per the smoke test's own remediation note, verified locally (visualization gate 158/158) before pushing.
2. **AR train:** #145 merged → #146 merged → #147 integrated (merged main into the branch; all 35 question-pack conflicts confined to the regenerated g8-c03/c04 items, resolved by keeping the regenerated versions; #146's stripping elsewhere auto-merged intact) and **merged** → hungry-lehmann integrated (clean auto-merge), opened as [PR #150](https://github.com/HUDongpin/MAIS-MVP/pull/150), **merged**.
3. **Bonus find:** the #147 conflict audit revealed **5 leaked "Review focus" prompts on main that #146's 61-prompt strip had missed** (g09-c04-q025, g09-c05-q005/q008/q011/q025) — exactly the failure mode the leak memory warned about. All five sat in chapters #150 regenerates; they are now gone.
4. **Final leak gate on merged main:** 0 English markers and 0 translated-marker candidates in the AR pack; 0 English markers in every other generated question-pack.
5. **Closeouts:** all six PR worktrees removed (eager-dhawan, brave-chatterjee, elastic-meninsky, dazzling-villani, funny-jackson, hungry-lehmann) with local branches deleted after containment proofs; remote heads gone (4 auto-deleted on merge, eager-dhawan + elated-burnell deleted explicitly).

**Fresh counts (live remote query used):** 57 local branches · 53 registered worktrees · 12 dirty · 2 detached (both NEW `.worktrees/*promotion-shadow*-20260825` worktrees created by the concurrent promotion sessions mid-sequence — active work, not cleanup candidates) · `origin/main` = `853ca179f9` (#150 merge), local ref in sync. Local `main` remains stale by design; the `a444b0dcc6` launch-config commit reached `origin/main` via #149 as predicted.

**§4 second tranche executed — 2026-08-25, owner-accepted order (two-door → 15-bug triage → PR-A/PR-B → hk closeout → ca-content-qa Phase A).**

1. **hk-safe-closeout:** worktree removed, local branch deleted; `origin/codex/a18-hk-safe-closeout-20260822` declared the archival copy. Decision revised from the audit's "land it" lean on fresh evidence: main has **zero consumers** of the session outbox (its consumers are all archived loops), and a newer divergent outbox variant lives in the China archive — landing waits for whichever viz-session workstream gets promoted.
2. **Two-door landed as [PR #155](https://github.com/HUDongpin/MAIS-MVP/pull/155), merged.** Spec reconciled with #117's conventions; validated locally 14/14 on the isolated production build. En route, found that the repo's default `channel: chrome` cannot launch system Chrome on this host (`kill EPERM`) — local e2e needs `PLAYWRIGHT_BROWSER_CHANNEL=""` for bundled chromium. Worktree/branch closed out.
3. **15-bug landed as two PRs after a 7-agent per-commit triage** (26 still-needed / 1 superseded by #117 / 7 folded): **[PR #156](https://github.com/HUDongpin/MAIS-MVP/pull/156)** — final-state harvest of the 35 product files (two-pane lesson navigation, unit stop states/avatar, roadmap history, tape-diagram/making-ten fixes, 3s auto-advance, compact keyboard, exact BigInt calculator engine), with the keyboard trio superseding #117's extraction, ConfiguredVisualizationLab kept at main's shape (its footer-slot removal predated main's CA presentation slice), and the `PracticeQuestionCard` slice 3-wayed after #155; validated tsc + 129/129 units. **[PR #157](https://github.com/HUDongpin/MAIS-MVP/pull/157)** — the 3,323-line e2e expansion, 3-wayed over #117/#155, with 3 stale flat-heading assertions updated to the shipped "Practice check" part heading (source branch was archived mid-stabilization); validated by a full three-spec local run (42 pass + the 3 fixed + 2 confirmed flakes passing in isolation). Both merged; both 15-bug worktrees removed; local branch deleted (origin ref retained as the archive).
4. **ca-content-qa Phase A landed as [PR #153](https://github.com/HUDongpin/MAIS-MVP/pull/153), merged:** 25 audit gates harvested onto main (readaloud + page-runtime deferred pending ports), fresh-run findings recorded in the PR (4 gates PASS; **Phase B backlog confirmed**: 447 lesson-content defects, 165 interaction-copy defects, 29+20 K-5 textbook blockers, checkpoint-grading rejecting correct forms, pack gradeSpan mismatch). Both CA worktrees removed; the 99-commit QA history stays archived on `origin/content/us-ca-math-lesson-qa`.

**Fresh counts (live remote query used):** 60 local branches · 56 registered worktrees · 13 dirty · 2 detached (the concurrent promotion pair) · `origin/main` = `26e46157e4` (#157 merge), local ref in sync. Note: concurrent sessions added lanes during this pass, so counts move non-monotonically vs. this session's deltas.

**Final tranche executed — 2026-08-25 evening, owner-accepted (#148/#151 → quick wins → #143 reconcile → release prep).**

1. **#148 and #151 merged** (both green). #148's worktree/branch closed out; #151 completes the AR leak story entirely.
2. **Cube-midpoint protected:** the 8 sole-copy demo files committed and pushed; `origin/codex/a06-cube-midpoint-plane-proof-20260824` now holds the full 26-commit kernel+demo line. Worktree stays as the live A06 continuation.
3. **China-QA salvage:** all four deferred fix slices first preserved verbatim on the archival branch (appendix commit `75e13af3a8`), worktree retired; then the two main-portable slices landed as [PR #158](https://github.com/HUDongpin/MAIS-MVP/pull/158) — CalculusStatsLab topic-locked modes (helper extracted to a `.ts` module because the viz gate compiles tests but not `.tsx`; gate 159/159) and the zh unit-cube term fix (單位正方體→單位立方體, all 6+6 occurrences). The LocalizedText pair and HK ledger test are checkpoint-dependent (main's `Question.answer` is a plain string) and deliberately stay archived.
4. **#143 reconciled and validated, merge on owner's word:** merged main into the branch; the only conflict was delete-vs-modify in the premium maps (#149 modified entries #143 retires — retirements win); LessonView (bench embeds over the #156 two-pane restructure) auto-merged. Validated: viz gate 163/163, lesson units 32/32, tsc clean. Pushed as `027f45c61c`.
5. **Release checkpoint prep — complete to the decision point.** Release branch `release/2026-08-25-content-train` (worktree `/Volumes/Starship/MAIS-release-checkpoint-wt`, owner: this session, PR: none — deploy vehicle, created 2026-08-25, closeout after the deploy decision) at main tip + committed A25 map. **Content gates green:** type-check ✓ · `test:mvp` 32/32 · `test:question-bank` 98/98 · CA lessons 15/17 with **both failures bisect-proven pre-existing** on pre-train main (stale assertions owned by the A01/A05 lanes). **Findings:** (a) the primary root's HEAD predates PR #92, so root-run release tooling still resolves the old Desktop canonical paths — run release tooling from a current-main worktree, and consider updating the root's branch; (b) the earlier dirty-map "invalid write target" failure was a fail-closed concurrent-writer race, not a defect — reruns succeed; (c) **the A25 strict worktree-lifecycle gate (shipped 2026-07-11) blocks every runtime release path — production and preview — whenever any other lane is live**, counting even the release branch itself; the runbook's own precedent (the 2026-07-13 deploy, two days after the gate landed) is a recorded owner exception. **The deploy therefore needs your explicit go with a recorded exception** (or a tooling fix teaching the gate a decision ledger — recommended as a small follow-up PR). Nothing was deployed.

**Phase B first tranche executed and merged — [PR #159](https://github.com/HUDongpin/MAIS-MVP/pull/159), 2026-08-25.**

1. **Grading now accepts standard typed forms of a correct answer.** The checkpoint-grading gate exposed five formatting-only rejection classes (`+9`, `9.`, terminal punctuation like `marker.`/`f.`/`1.5.`, digit-grouping commas `5,523`, bare leading decimals `.7`); fixed in `parseScalarAnswer` + one added string variant, with a coordinate-pair guard so `3,4` stays distinct from 34. The gate went fully green: **608/608 linked checkpoint questions**, wrong answers still rejected.
2. **K-5 pack repaired.** `divide-two-digit-q02` stored the truncated 21 for a prompt demanding rounding (21.6 → 22) — answer, explanation, and independent-solution record all corrected (the us-math-items audit's cross-check caught the independent record on CI; local pipe had masked its exit code — check exit codes directly, not through `tail`). The 19 "unreviewed" ledger entries were re-derived by a 5-solver independent panel from student-visible content only: **all 19 stored answers proved correct**; ledger expectations and SHA fingerprints refreshed (one entry had been written for an older version of its question).
3. **Documented remainder:** the independent gate holds at 9 blocking, all one class — its per-question solvers demand data-display diagrams (picture/bar graph, line plots) the content never had, and three questions were re-authored into designs the solvers no longer describe. Restore-the-designs vs re-target-the-solvers is an A05/A18 content decision, spawned as a task chip.

**Final counts (live remote query):** 61 local branches · 56 registered worktrees · 13 dirty · 2 detached (concurrent promotion pair) · `origin/main` = `12d9869464` (#159 merge), local ref in sync.

**Owner decisions executed — 2026-08-25 evening: #143 merged; deploy run under the recorded exception.**

1. **#143 MERGED** — the CA Codex-labs → Claude signature-bench replacement (phases 1/2a/4) is on main. Caviz worktree, branch, and its dangling `launch.json` entry all closed out per the standing memory note. Phases 2b/3 (bench authoring) continue from main.
2. **Deploy executed to the fail-closed boundary.** The owner exception is recorded in `coordination/reports/2026-08-25-A22-owner-approved-content-train-production-deploy.md` (committed on `release/2026-08-25-content-train` with the map, the exception-input guard change — `MAIS_OWNER_LIFECYCLE_EXCEPTION_RECORD`, guard tests 3/3 — and the non-strict wrapper). Dry run green (`forbiddenPathCount: 0`, 3,243 staged files, build gate passed). The production run created the deployment (`mais-mvp-…vercel.app`), passed the dashboard smoke on demo login, and stopped exactly where it should: **the AI Tutor live-latency gate requires owner live credentials** — production correctly has no demo user (verified against the prod env), so the demo probe 401s. **Live domains are untouched** (previous deployment still serving). The record contains the one owner-run command that completes promotion; the executor deliberately does not handle credentials.

**Still open:** the owner-run promotion command (in the release record) · Phase B continuation ([PR #160](https://github.com/HUDongpin/MAIS-MVP/pull/160) from the design chip is already open per the other session, plus the 29 human-review explanation flags and the 447/165-defect campaigns) · a16 author lane · parent lane (#142 red, parent-action-ui, frozen local-only tips) · confident-archimedes · the two stale CA gate assertions (A01/A05).
