# 2026-07-31 A25 Release-Hygiene Backlog Slice

Generated at: 2026-07-31
Agents: A25 git hygiene and release intake; A22 production reliability; A10 tooling/docs
Basis: live `git status --porcelain -uall` on the primary root, branch `feat/ai-tutor-transcript-visibility`
Supersedes the disposition guidance in `latest-A25-dirty-tree-map.md` (that map inventories and buckets by
owner; this one buckets by **disposition**, derived from reference analysis).

## Live counts (this scan)

| Metric | Value |
| --- | ---: |
| Untracked status entries (collapsed) | 2,451 |
| Untracked files (expanded) | 3,257 |
| Tracked modified / deleted | 0 / 0 |
| Total untracked bytes | ~285 MB |

`public/` holds 3,208 of the 3,257 files. The remaining 49 are code, tests, docs and coordination evidence.

## Method

Disposition is decided by one question per path: **does tracked, shipped code reference it?**
References were resolved with `git grep` restricted to `app/ components/ data/ lib/` (runtime scope),
deliberately excluding `coordination/` — A25 evidence files name almost every path in the repo and
would produce false positives.

---

## Bucket A — referenced and needed → COMMIT

**136 files, ~87 MB.**

### A1. Production-referenced lesson illustrations (94 files, ~87 MB)

These are assets that **shipped production code already points at**, and the working copy on this
laptop is the only copy in existence.

| Path | Files | Size | Referenced by |
| --- | ---: | ---: | --- |
| `public/lesson-illustrations/us-ca-middle-school/` | 30 | 30.7 MB | `components/lesson/CaliforniaMiddleSchoolTextbookPage.tsx:77,81`, `CaliforniaMiddleSchoolReplacementTextbookPage.tsx:60` |
| `public/lesson-illustrations/us-ca-high-school/` | 60 | 53.8 MB | `data/usCaliforniaHighSchoolLessonIllustrations.ts` |
| `public/lesson-illustrations/us-ar-middle-school/` | 4 | 2.7 MB | `data/usArkansasMiddleSchoolLessonIllustrations.ts` |

The CA middle-school component builds paths directly:

```
/lesson-illustrations/us-ca-middle-school/candidates/<key>-concept.png
/lesson-illustrations/us-ca-middle-school/exact-layer-renders/<key>-exact-layer.png
```

Both directories exist on disk (15 files each) and are untracked. `.vercelignore:45` explicitly keeps
`lesson-illustrations` because they "are referenced" — so a clean clone deploy ships the code and
omits the images.

**This is the real disk-failure exposure**, and it is ~87 MB, not the four files flagged in the report.

### A2. Evidence, docs and tests (42 files, ~250 KB)

| Path | Files | Note |
| --- | ---: | --- |
| `coordination/blockers/*.md` | 16 | Open blocker records (SimpleTex creds, Postgres prod env, storage) |
| `coordination/release-intake/*` | 7 | Prior dirty-tree maps + daily report check |
| `coordination/reports/*.docx`, `build_*.py` | 5 | President reports 07-27 → 07-30 + generator |
| `coordination/session-logs/2026-07-28-A10.md` | 1 | Session log |
| `tests/e2e/*-stress.spec.ts` | 4 | `parent-console-stress.spec.ts` is named in `playwright.config.ts:42` (`isolatedStatefulSpecs`) — tracked config referencing an untracked file |
| `docs/LEARNING_DESIGN.md` | 1 | 237 lines, never tracked, no references — orphan but genuine authored content; 15 KB is cheap insurance |
| `Technical-Review/` | 8 | Advisory report, backlog xlsx, readiness checklist — external deliverables, 200 KB |

---

## Bucket B — unreferenced content backlog → OFF-REPO (Blob/CDN)

**3,113 files, ~157 MB.** Generated content that no shipped code path renders. Keep the bytes, move
them out of the working tree.

| Path | Files | Size | Why unreferenced |
| --- | ---: | ---: | --- |
| `public/question-illustrations/mainland-pep-junior/questions/` | 2,400 | 40.0 MB | **Inert by gate.** `lib/mainlandPepQuestionAssets.ts:15` sets `mainlandPepQuestionIllustrationApprovals = []`, and `mainlandPepQuestionAssetFor()` returns `null` at line 64 unless an approval matches. Zero of these render today. Already excluded by `.vercelignore:46`. |
| `public/lesson-illustrations/us-tx-high-school/` | 40 | 77.6 MB | TEKS port not shipped — tutor track sets still exclude `US_TX_MATH` |
| `public/lesson-illustrations/us-tx-primary/` | 601 | 33.3 MB | same |
| `public/lesson-illustrations/us-tx-middle-school/` | 15 | 29.9 MB | same |
| `public/lesson-illustrations/mainland-pep-primary-v2-refresh/` | 52 | 8.3 MB | refresh candidates, no runtime reference |
| `public/forum-assets/` | 5 | 8.5 MB | zero runtime references |

The Texas set (656 files, 141 MB) is pre-built content for the planned TEKS port. It is an **asset**,
not junk — archive it somewhere durable before it leaves the tree.

---

## Bucket C — dead → DELETE or IGNORE

**8 files, ~2.5 MB.**

### The four files flagged as "laptop-only, a disk failure loses them"

Three of the four are dead code, not irreplaceable work. Each was checked against git history and
against every importer in `app/ components/ data/ lib/`.

| File | Verdict | Evidence |
| --- | --- | --- |
| `components/visualizations/RoadmapVisualizationSuite.tsx` | **Dead — delete** | Deliberately deleted in `9961e31a48` ("perf(lesson): stop shipping question banks to the client"). **Zero importers** anywhere in the repo, tracked or untracked. The disk copy differs from the pre-deletion blob by one edit — it swaps the `topics`-derived label map for `visualizationLabelsByTopicId`, i.e. it is the half-done perf refactor that the commit resolved by deleting the file instead. `AGENTS.md:104` still lists it as an A03-owned production file: **that line is stale and should be dropped.** |
| `app/visualization-lab/VisualizationLabBackToTopButton.tsx` | **Dead — delete** | **Byte-identical** to the pre-deletion blob from `4564bd6766` ("chore: remove stale QA evidence and app deletions"). The live component is tracked at `components/visualizations/VisualizationLabBackToTopButton.tsx`. This is a stale copy at the old path — the resurrection artifact the session contract warns about. |
| `app/api/teacher/rewards/route.ts` | **Dead — delete** | Never tracked. Superseded: `components/teacher/TeacherRewardsView.tsx:198` calls `/api/teacher/reward-awards`, and `:233` calls `/api/teacher/rewards/redemptions/:id`. Nothing calls bare `/api/teacher/rewards`. Its sibling routes (`award/`, `redemptions/[requestId]/`) are both tracked. |
| `docs/LEARNING_DESIGN.md` | **Keep — Bucket A2** | Never tracked, no references, but 237 lines of genuine design content. |

Note on the 2026-06-29 production build failure (`coordination/reports/2026-06-29-A22-us-region-alignment.md:45`),
which named `VisualizationLabBackToTopButton` among missing modules: that drift is **already resolved**.
All four other modules from that list (`data/mathVirusBlaster`, `data/mightyTankBattle`,
`data/usCaliforniaHighSchoolLessonIllustrations`, `lib/server/aiGovernance`) are tracked today, and the
back-to-top button was fixed by moving it into `components/`. The untracked `app/` copy is residue.

### Also dead

| Path | Files | Size | Evidence |
| --- | ---: | ---: | --- |
| `components/visualizations/assets/lab-quest-island-map{,-en}{,-4k}.{png,webp}` | 4 | 2.4 MB | Zero references in any `.ts`/`.tsx`/`.json` outside A25 evidence JSON |

**Recoverability caveat.** The three dead code files above are all recoverable from git history
(`git show <sha>^:<path>`), so deleting them is safe. The four island-map images were **never tracked** —
deleting them destroys the only copy. Route them to the Bucket B archive instead of `rm`.

---

## Disposition summary

| Bucket | Files | Size | Action |
| --- | ---: | ---: | --- |
| A — referenced and needed | 136 | ~87 MB | commit |
| B — unreferenced content backlog | 3,113 | ~157 MB | move to Blob/CDN, then `.gitignore` |
| C — dead | 8 | ~2.5 MB | delete |
| **Total** | **3,257** | **~285 MB** | |

## Open decision for the owner

Bucket A1 puts ~87 MB of PNG/SVG into git history permanently. Three options:

1. **Plain commit** — simplest, clone size grows ~87 MB forever.
2. **Git LFS** — keeps clones small, adds an LFS dependency to CI and to every deploy path.
3. **Blob/CDN + committed manifest** — smallest repo, but the CA middle/high-school components must
   change from hardcoded `/lesson-illustrations/...` paths to resolved URLs. That is a code change in
   A03/A24-owned files, not a hygiene commit.

Option 1 unblocks the A25→A22 lifecycle today; option 3 is the better end state and is a follow-up.

## Sequencing

Bucket C first (deletions shrink the map), then B (relocate + ignore), then A (commit) — so the
post-change dirty-tree map is regenerated exactly once, against a tree that is already clean.

Per `CLAUDE.md`, staging must be path-scoped: no `git add -A`, no `git add .`.
