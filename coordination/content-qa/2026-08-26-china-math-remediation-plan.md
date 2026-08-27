# China Math Remediation Plan (v2 — after adversarial review)

> [!IMPORTANT]
> **Superseded in part — read the re-baseline first.**
> This document was produced against branch `codex/edulab-mais`, which was **360+ commits behind
> `main`**. The shipped China corpus has since gone **17,700 → 11,700 items**: `bnu-primary`,
> `hjb-primary` and `hjb-high` were de-reached from `data/questions.ts` by `cf1a4822a9`.
> Every finding here has been re-measured against current main in
> **[`2026-08-27-china-math-audit-rebaseline.md`](./2026-08-27-china-math-audit-rebaseline.md)**,
> which records what SURVIVES, CHANGED, was FIXED, or is MOOT — including several claims in this
> document that did not reproduce. Do not schedule work from this file alone.
> **The operative plan is now** [`2026-08-27-china-math-plan-v3-path-b.md`](./2026-08-27-china-math-plan-v3-path-b.md), which supersedes this one: Path A is dead (two of its three slices are withdrawn) and the sequencing changed to platform-before-content.



- **Date:** 2026-08-26
- **Companion to:** `2026-08-26-china-math-full-audit-report.md`
- **Method:** 7 fix-scoping agents + 3 strategy reads + 2 adversarial critics (12 agents)
- **Artifact:** https://claude.ai/code/artifact/4639f2cc-22ab-49b6-b4ed-455c4ea685bc

> **v2 changes the plan, not just its detail.** Two adversarial critics were commissioned in the
> first run and failed on a session limit; re-run against the delivered plan, they overturned its
> ordering and its central claim of consensus. Read section 0 before section 1.

---

## 0. What adversarial review overturned

### O1 — The proposed Week 1 turns CI red and blocks every release
Items 4 (honest gate) and 5 (grader) were scheduled in the same week. Run together against a patched
grader built to the corrected spec, the gate reports the bank's **own shipped acceptedAnswers** as
grader-rejected — **149 defect rows (lenient) to 1,287 (strict)**, Hong Kong included.

Mechanism: China wrappers flatten `LocalizedText` into one array. `bnu-junior-ds-v1-s1-010` ships
`answer: "5个"` with `acceptedAnswers: ["5个","5","5items","5個"]`. A unit guard anchored on
`question.answer` rejects the sibling `5個` — traditional 個 is a different string. 250 rows carry a
CJK-unit key plus a bare-number alias; 226 plus a Latin-unit alias.

`test:question-bank` fails -> `npm run check` fails -> CI fails -> `RELEASE.md:69-74` blocks every
content release for every region. **The ratchet does not save you — it ratchets a different number.**
Fix needs a shared bilingual + simplified/traditional unit-equivalence table: **+1 day and a new
shared module**, not in the original budget.

### O2 — "All three strategies converged on Week 1" was manufactured
Only **two of five items** appear in all three stances' first phases — de-launder and
drop-dead-packs, together **1.0 of the 7.5 days**. The bleed-stop is absent entirely from one stance.
Two of three put the gate in week 1; one in week 2. Two of three treat the grader's unit half as
**blocked on an unanswered product question** ("should mainland primary assess 单位 when the key is a
bare number?" — 9,550 of 17,700 China keys are bare numbers), a blocker the delivered Week 1 did not
record. Each stance's own Week 1 also held something the delivered one dropped.

### O3 — The C1 retraction was right, with two figures corrected
Independently re-derived over 8,968 MC items (0 multi-matching, 0 unmatched). Corrections:
- **hjb-high is 2.7pp, not 0.0pp** — the strongest attacker is a split strategy (rank on numeric,
  position on non-numeric) that nobody computed.
- **A second shuffle-invariant leak exists: option length.** "Pick the longest option" wins
  **40/43 HK items (93.0%)** and 21/21 pep-junior. HK's shuffle gain is **~21.9pp, not ~31.8pp**.

### O4 — A cheaper move nobody proposed: drop one distractor per learner
Dropping one uniformly-random distractor per (learner, item) then shuffling destabilises the answer's
rank. Excess over chance falls **71.5 -> 32.3pp** (pep-high), 71.4 -> 33.4 (bnu-high),
56.2 -> 29.4 (hjb-high). `reduceQuestionChoices` (`lib/server/questionStore.ts:309-325`) already
exists but is deterministic and order-preserving, so it must be made learner-seeded. ~+1 day on the
shuffle's 7, for ~30pp on 2,745 items. Converts 4-option 高考-format items to 3-option — a product call.

### O5 — The bleed-stop is not trivial and breaks working answers
Flipping `mainlandPepPrimaryQuestions.ts:259` stops `hiddenAcceptedAliases` pushing the bare-number
alias: **350 pep-primary rows lose it**, so a P4 child typing `39` for key `39厘米` becomes newly
wrong. Its ceiling is **50 solid-name rows** ("stops shipping sphere"); full repair is 967 rows, not
2,400. Flipping `mainlandPepJuniorQuestions.ts:337` without `:376` desynchronises the shipped answer
from the gate's independent answer on **325 rows**. Persisted 错题本 rows are never backfilled
(`mistake_book_items.correct_answer` is `TEXT NOT NULL`, written raw).

### O6 — De-laundering breaks the type-check for HJB high
Runtime-free confirmed (`grep QaStatus app/ components/` = 0). But hjb-high has **no honest value**:
`manualQaStatus` is absent on 1500/1500 source rows while the output type declares `"approved"`.
Deleting the field makes `mainlandPepHighQuestionBank.test.ts:253` a **TS2339 compile error**, and
`test:question-bank` begins with a full `tsc` — the whole battery fails before any assertion runs.
Also it is **3 wrappers, not 5**: `hjb-junior` and `bnu-junior` are cosmetic (sources already
pass/approved).

### O7 — The shuffle opt-out list is 530 items, not 209
**272 items carry the option letter in both the option text and the answer** (`answer: "A. -1"`,
`options: ["A. -1","B. 1",...]`); 37 more have options literally `["A","B","C","D"]`; 263 name a
position in prose, overlapping by only 38. Union **530** — bnu-primary 168, hjb-junior 140,
hjb-primary 119, bnu-junior 75. **Four of the five slices the plan wanted to shuffle are exactly
these.** Grading survives on text matching, so nothing goes red — invisible to every gate, visible to
every learner.

---

## 1. Corrected order of work (~9 days, was 7.5)

The bleed-stop **creates** the Chinese-unit input domain the grader's guard operates on: grader alone
= 549 strict defect rows; bleed-stop-then-grader = 1,287, adding 738 rows never in the grader
scoper's corpus.

| # | Work item | Days | Why here |
|---|---|---:|---|
| 1 | **Governance — de-launder + drop dead packs, as ONE PR** | 1 | Same two files; cannot be parallel branches under one-worktree-one-branch. Publishes the true 6,000-row pending count. |
| 2 | **Grader** + shared bilingual unit-equivalence table | 4 | Everything downstream is measured through it. |
| 3 | **Bleed-stop**, re-measured against the shipped grader | 1 | Creates the grader's input domain — must not precede it. Include the 350 lost aliases and the `:376` desync. |
| 4 | **Honest gate** — baseline stamped **last** | 3 | Otherwise the ratchet is stamped on a tree that no longer exists by Friday. |

**In one line:** the delivered order was `bleed -> governance -> packs -> gate -> grader`. The correct
order is **`governance+packs -> grader -> bleed-stop -> gate`**. The gate moves from fourth to last;
the bleed-stop from first to third. The ratchet number **cannot be 19766** — recompute after 1-3 land.

**One clean win, independent of all of it:** PEP lesson practice sets, **pep-high only** — 22/22
topics yield 8 distinct items, route 45x faster (23.4ms -> 0.52ms), payload 397KB -> ~10KB, 0
assertions red. ~0.75 day.

---

## 2. Two findings that may invert the strategy

### 双减 makes Path A the regulatory-worst choice
Path A ships bnu-primary + hjb-primary + hjb-junior = **6,000 items that are 100% grades 1-9**, i.e.
entirely 义务教育阶段 — the category 双减 froze for online paid 学科类 tutoring. The slices Path A
**defers** (pep-high, bnu-high, hjb-high) are S4-S6 高中, regulated separately and more permissively.
**The engineering-optimal slice selection is the regulatory-worst one.**

### There may be no live learners at all
The only observable dataset holds **8 practice attempts and 1 mistake-book row** across 16 users,
every one from `debug-user` or a seed account. Both the audit's harm claim ("+0.08 mastery per false
correct") and the ship-first argument assume live learners. **One production
`SELECT count(*), count(distinct user_id) FROM practice_attempts` settles it in five minutes** — the
single highest-leverage missing number in the package.

### Also newly measured
- **The `zh` locale ships traditional characters to mainland children.** 9,608 of 17,700 China
  prompts render 繁體 under language `zh`, and `toggleLanguage` cycles en -> zh -> zh-Hans — one click.
  The audit's "zero traditional leakage" was true **only in zh-Hans**. Path A would ship 繁體 on
  3,232 of its 6,000 items.
- **Zero diagrams in the entire China corpus** — `diagram` set on 0 of 17,700, while 173 prompts
  reference 三视图 / 统计图 / 数轴 / 如图.
- **"328 of 453 test files never execute" was the wrong framing.** 213 are deliberately-excluded
  3D-lab tests. The real should-run gap is **115 files, 70 of them `lib/server/`**
  (`apiSurfaceSecurity`, `authLoginFlow`, `passwordResetDelivery`) — a **security and auth gap, not a
  content gap**.
- The **5.1% bnu-junior wrong-key rate is the most load-bearing number** in the package. Re-run it as
  a fresh stratified sample with a different adjudicator before betting a quarter.

---

## 3. Operational note — the git guard (CORRECTED 2026-08-26, post-verification)

An earlier draft of this plan reported the root git guard as dead and needing a one-line fix.
**That was wrong, and is retracted.**

`scripts/claude-root-git-guard.mjs` was already repaired on `origin/main` by **`ee9b5e63fe`**
("fix(guards): repoint canonical root at /Volumes/Starship after repo move"). Functionally verified
against main's version by piping simulated hook payloads: it blocks `git switch`, `git stash`,
`git reset --hard` and `git rebase` (exit 2) from the primary root, and correctly allows
`git stash list`, plain `git reset <paths>`, `git -C <dir> …`, and quoted mentions inside other
commands (exit 0).

**What is real:** the guard is inert *in a checkout sitting on a branch that predates that commit*,
because the hook executes the on-disk file from `$CLAUDE_PROJECT_DIR`. The audit checkout was on
`codex/edulab-mais`, **357 commits behind `origin/main`**, whose copy still carries
`/Users/dongpinhu/Desktop/MAIS-MVP` — a path that no longer exists, so the guard exits 0 for
everything. Measured on that branch: `git switch` / `stash` / `reset --hard` / `rebase` all
unblocked.

**So this is branch hygiene, not a code defect.** Writing the fix on the stale branch would
duplicate `ee9b5e63fe` and conflict with main. The remedy is to bring the branch up to date or work
from a checkout on main — a HEAD-moving operation in the primary root, which CLAUDE.md reserves for
the owner. `git worktree list` returns 91 entries, ~40 from the last four days, 4 detached HEADs.

**Before trusting the guard in any checkout**, run `sed -n '11p' scripts/claude-root-git-guard.mjs`
and confirm it names the current repo path.

**Correction to a related belief:** `package.json` is not frozen, it is *name-locked and body-pinned*.
No new script name can ever be added (deep-equal on the exact set at
`scripts/release-governance.test.mjs:2286`), but the **body** of an already-allowlisted script —
including `test:question-bank` and `check` — may change at the cost of recomputing one sha256 at
`:2293`. That is the legitimate route for wiring the 115 dead tests in.

---

## 4. Where this leaves the recommendation

The seven fixes are real and the scoping survived adversarial checking almost everywhere. What did
not survive is the sequencing and the consensus claim.

**Revised:** run the corrected four-item sequence (~9 days), ship the pep-high lesson fix alongside,
and do **not** commit to Path A or Path B until two questions are answered, because either answer can
invert the choice:

1. **Are there live learners?** One SQL query, five minutes. If none, the "ship to learn" argument
   dissolves and Path B is clearly correct.
2. **Is mainland China a licensed market for you, or are you serving HK and overseas Chinese
   families?** If the latter, 双减 does not bite and Path A is fine. If the former, Path A's 6,000
   K-9 items are the wrong 6,000 regardless of how clean they get.

Both are yours to answer and neither needs an engineer. Everything else can start Monday.

---

## 5. Still not covered

- **No fix was implemented.** Grader figures come from a patched prototype run against the real
  corpus, not a landed change.
- **The app was never driven in a browser.** 1,424 measured rendering hazards (604 raw newlines, 537
  markdown pipes, 283 unbraced LaTeX subscripts) are exactly what code inspection cannot confirm. One
  Playwright spec rendering 20 items per slice in all three locales closes it in under a day.
- **Legal exposure is named, not assessed** — textbook-brand marks in 36 bnu-high stems; PIPL minors'
  data obligations and ICP filing have no in-tree evidence either way.
- **Effort figures are engineer-days from people who read the code**, not commitments from the people
  who will do the work.

---

---

# APPENDIX — v1 plan as originally delivered

The sections below are the pre-review plan. They are retained for traceability; where section 0
above contradicts them, section 0 wins.

## 1. Corrections to the audit

### C1 — Shuffling options is NOT the highest-value fix; the distractor formula is
The audit said shuffling was "the single highest-value fix." Re-measured: it moves a zero-knowledge
learner 100%→96.5% (pep-high) and 100%→96.4% (bnu-high), and by **exactly 0.0pp** on hjb-high,
pep-primary and pep-junior. The distractor generator emits `{a−d, a, a+d, a+2d}`, so "pick the
2nd-smallest number" is shuffle-invariant: 1,549/1,620, 506/525, 517/600. The audit's 64.4% figure
conflated position bias with the arithmetic-progression distractors; only the first half is
order-dependent. Shipping the shuffle and closing the finding would be worse than not shipping it.

**But the shuffle is still worth doing — on the opposite slices.** bnu-primary 44.4%→29.5%,
hjb-junior 39.7%→27.5%, hjb-primary 37.2%→30.3%; plus HK (60.3% A), US_CA (56.3%), US_AR (56.8%).
Caveat: **262 items name options by position in their prose** (bnu-primary 98, hjb-primary 68,
hjb-junior 43, bnu-junior 41) and need an opt-out list.

### C2 — Three of the grader fixes are wrong as written
- **`²→^2` is a no-op.** `normalizeAnswer` calls `.normalize("NFKC")` first and NFKC already maps
  U+00B2 to `2` (`"x²".normalize("NFKC") === "x2"`). The glyph pass must run **before** normalize.
- **The unit strip over-accepts at the audit's location.** 295 of 567 unit-swap probes still pass
  (key `4个`, learner `4张`, via sibling alias `4items`). The guard must live in
  `questionAnswerMatches` anchored on `question.answer`, not in `answerMatches`.
- **Splitting on `、` grades wrong answers correct.** 99 China keys contain `、` and some are ordered
  (`bnu-primary-ds-v1-p2-090`: 「把下面长度按从短到长排列」, key `50厘米、80厘米、1米、2米`). Drop `、`;
  the claimed 46/65 win does not survive.

Corrected patch: fixes **1,485 China + 64 HK + 582 US items**, zero over-accepts across 24,000+
adversarial probes, all 10 existing tests pass untouched.

### C3 — Audit finding G3 was backwards
G3 said HJB high remediation "was completed and never wired in." Measured: v3r/v4r are **not**
remediations of v2 — disjoint id namespace, only 247/1500 shared prompts; strictly worse on recorded
QA status; **6× more monotonous** (40 skeletons vs 241); and switching deletes the 218 hand-authored
S4 items the auditor called the only material worth keeping. Their duplicate "fix" was prepending
`V4修复变式NNNN：` to every prompt — and `data/hjbQuestionLocalization.ts:12` strips exactly that
prefix before render (real gain 229→222).

**Keep v2, delete the other three imports** (6.4 MB server-bundle JSON). No pack of the four has a
single `pass`/`approved` row; only re-authoring makes this slice shippable.

### C4 — `answer: LocalizedText` would be a 20-day PR into a dead end
Measured ~950 LOC across 79 files / 322 call sites; 116 hand-authored literals to rewrite (92 where
`en` and `zh` genuinely differ); changes `AttemptFeedback.correctAnswer`, tripping two fail-silent
runtime guards and a `TEXT NOT NULL` column. **And it does not help Japan/Korea** — `LocalizedText`
is a hard-coded `{en, zh, zhHans}` record with no `ja`/`ko`. Do additive
`answerLocalized?: LocalizedText` (7d), and land a **2-line bleed-stop first**.

### C5 — Two more
- **The lesson-practice fix as prescribed yields nothing.** Porting the BNU quota selector produces
  8 structurally distinct items in **0 of 57 topics** (it sorts by id; templates are id-contiguous).
  25 of 57 topics cannot reach 8 distinct items at all.
- **`term-XXXX` is 72% bigger and in the wrong field.** The audit counted 1,914 in `acceptedAnswers`,
  which never reaches the browser. It also sits in `prompt.en` (2,754), `explanation.en` (2,839) and
  `options[].en` (361) — **3,286 distinct items that do ship to the client.**

---

## 2. Measured cost of each fix

| Fix | Verdict | Days | LOC | Sites | Do it? |
|---|---|---:|---:|---:|---|
| governance: de-launder QA status | contained | 0.5 | ~20 | 46 | **Now — provably free** |
| governance: drop dead HJB packs | contained | 0.5 | ~15 | 3 | **Now — 6.4 MB** |
| bleed-stop for `sphere` | trivial | 0.5 | 2 | 2 | **Now** |
| gate: honest reporting + ratchet | contained | 3 | 165 | 55 | **Now — keystone** |
| grader: CJK normalisation | contained | 3 | 240 | 16 | **Now** |
| PEP lesson practice sets | invasive | 2 | 170 | 14 | pep-high only |
| shuffle MC options | invasive | 7 | 320 | 24 | Allowlist |
| `answerLocalized?` (strategy b) | invasive | 7 | 420 | 322 | After gate |
| strip generator scaffolding | invasive | 9 | 320 | 18 | **Blocked — see below** |

### Why "strip scaffolding" is blocked, not merely expensive
**The scaffolding IS the de-duplicator.** `data/mainlandHjbJuniorQuestions.ts:78-115` appends
`变式 N` only when a stripped prompt already exists — 72 items in 25 groups (72−25 = 47, exactly the
audit's duplicate count). Strip it and hjb-junior drops 1,500→1,453 distinct prompts, failing a live
assertion. Six assertions break in total; stripping pep-high's prefixes takes rag-v3 pairwise-distinct
from 1,500 to 1,018. The strip does not create the duplication — it reveals it.

---

## 3. Week 1 — where all three strategies converged

~7.5 engineer-days. Two of the five items are provably free. None depends on the strategic fork.

| # | Work item | Days | Why first |
|---|---|---:|---|
| 1 | Bleed-stop — 2 lines (`mainlandPepPrimaryQuestions.ts`, `mainlandPepJuniorQuestions.ts`) | 0.5 | Stops shipping `sphere` to a 一年级 child today |
| 2 | De-launder QA status — delete hard-coded `"pass"` literals in 5 wrappers | 0.5 | `grep QaStatus app/ components/` = 0 hits; publishes the true 6,000-row pending count |
| 3 | Drop dead HJB packs — narrow to v2, delete 3 imports | 0.5 | 6.4 MB, no behaviour change |
| 4 | **Honest gate** — provenance tag, `unverified` status, ratcheting baseline | 3 | Keystone: every other fix is otherwise certified by the gate that certified `sphere` |
| 5 | Grader CJK normalisation — the corrected patch | 3 | 1,485 CN + 64 HK + 582 US items |

### The one thing that must not be got wrong
Ship the gate with a **ratcheting baseline, not a hard Green→Red flip**. Under honest accounting
**19,766 of 24,566 rows** flip to `unverified` — HK 989/989, US_CA 2,802/2,802, US_AR 3,000/3,000,
US_FL 75/75. `test:question-bank` is the minimum release battery (`RELEASE.md:69-74`), sits in
`npm run check`, and runs in CI, so a naive honest gate turns every release red for every region —
and under release pressure someone relaxes the assertion back, which is how the tautology survived
the first time. Assert zero for the four real defect statuses; assert `unverified <= 19766`
"may only go down."

Also decide **pep-high's classification explicitly and write it down**. Its 4,800 rows are the only
ones a solver derives from prompt text, but that solver and the generator were written against the
same ~20 English templates — it is a mirror, not a check.

---

## 4. Weeks 2–4 — the fork

**Path A — ship the three good slices (~14d).** bnu-primary, hjb-primary, hjb-junior already have
the expensive properties (skeleton reuse 1.01×/1.02×/1.06×, 189 of 335 mainland topics). Add
allowlisted shuffle (4d, 209 order-referencing items opted out), a second-pass answer runner scoped
to those 6,000 rows keyed on **prompt hash not id** (5d), fix the 35 named ids (2d), clear
`term-XXXX` debris (2d). Day-30 checkpoint: three slices with independently verified keys.

**Path B — fix the pipeline first (~13d).** Add `answerLocalized?` (7d) and an independent-answer
pilot (6d). Nothing ships in 30 days, but the next 17,700 items can be *known* right.

### Surfaced during scoping, in neither path
- **328 of 453 non-e2e test files are never executed** by any npm script, runner or CI workflow —
  including `lib/server/answerMatching.test.ts`, the grader's own test suite. The repo also holds
  318 markdown QA records and 140 audit scripts totalling **87,531 lines, none wired into CI**.
  Repair is ~3d and needs one pinned sha256 amended at `scripts/release-governance.test.mjs:2292`.
- **Public answer leak:** `lib/practiceMissionPreviewSample.ts` samples the full 24,566-item
  aggregate and renders the first two options on the public `/about` page. For pep-high, where the
  key is always option A, this advertises the answer as chip #1 on an unauthenticated page.

---

## 5. The decision only the owner can make

**Do we ship pep-high at 1,513 items and bnu-high at 561?** Stripping scaffolding reveals that
pep-high's 4,800 items are 1,513 real questions and bnu-high's 1,500 are 561. Six live test
assertions encode the inflated numbers. Every engineering path is blocked on this answer, because
until it is given, changing those assertions is just moving goalposts to match a bank nobody has
agreed to.

**Recommendation:** run Week 1 immediately, then take Path A — shipping three verified slices beats
a perfect pipeline with nothing behind it, *provided* the gate lands first so "verified" means
something. Path B's argument is real (Japan/Korea inherit the English-only grader and the
non-localizable answer field on day one), but Week 1 already lands the gate and the grader, which is
most of what Path B protects; `answerLocalized` can follow in month two without blocking a release.

---

## 6. What this analysis does not cover

- **Two adversarial critics did not run** — a completeness critic and a breakage critic were
  commissioned and both failed on a session limit. This plan has NOT had an independent pass asking
  what is missing or which fixes conflict if sequenced wrongly. Treat the sequencing as reasoned,
  not adversarially verified.
- **No fix was implemented or tested.** Every number is from reading and measuring the current tree.
- **The market question is untouched** — nothing here addresses 双减 / 教培 regulatory exposure for a
  paid K-12 math product in mainland China.
- **Effort figures are one competent engineer's days including tests**, from scopers who read the
  code — not commitments from the people who will do the work.
