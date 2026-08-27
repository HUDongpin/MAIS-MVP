# China Math Plan v3 — Path B (platform before content)

- **Date:** 2026-08-27
- **Supersedes:** `2026-08-26-china-math-remediation-plan.md` (v2)
- **Built on:** `2026-08-27-china-math-audit-rebaseline.md`
- **Status:** operative plan, **conditional on one unconfirmed number** — see the banner below

> [!NOTE]
> **CONDITION RESOLVED 2026-08-27 — Path B confirmed, and its justification changed.**
>
> The production `practice_attempts` count was run against Neon
> (`ep-odd-forest-aomhzy1n`, ap-southeast-1) over Neon's SQL-over-HTTPS transport, because the
> Postgres wire protocol is blocked from the dev sandbox. Credentials were pulled to a scratch
> path, used read-only, then shredded; `.env.local` was verified unchanged by hash.
>
> | Measure | Production |
> |---|---:|
> | practice attempts, all time | **647** |
> | distinct learners | **13** (of **47** registered users) |
> | activity window | 2026-06-22 → 2026-08-15 |
> | attempts in the last 7 days | **0** |
> | attempts on **China** content, ever | **0** |
> | breakdown | US 616 · CCSS 31 · **China 0** |
> | mistake-book items | 96, **none China** |
>
> **For China this settles it.** Not one learner has ever answered a `pep-`, `bnu-` or `hjb-`
> question in production. The 198 English answer keys, the 66.6%-guessable MC bank and the 87
> confirmed wrong keys have been seen by **nobody**. Path B is correct and the China content work
> is correctly deferred.
>
> **But the platform findings now have a live audience, and it is the US one.** 616 real US
> attempts and 96 mistake-book rows went through the same blind gate, the same unshuffled options
> (US_CA 56.3% / US_AR 56.8% correct-option bias) and the same grader. **P0 is no longer
> prophylactic work for Japan and Korea — it is remediation for the content that actually has
> users.** That strengthens P0 and weakens nothing.
>
> Two caveats. 402 of the 647 attempts (62%) come from three named seed accounts
> (`student-shirleen-us`, `student-jon-us-ca-super`, `teacher-scott-us`); of the ten UUID accounts,
> nine have a single-day activity window, which reads as trial sessions rather than a retained
> cohort. And the product is currently **dormant** — zero attempts in seven days, 34 of 47
> registered users have never attempted anything.

---

## 1. Why the plan changed

Two things happened after v2 was written.

**The corpus moved.** `cf1a4822a9` de-reached three unapproved packs, taking China from 17,700 to
**11,700 shipped items** and withdrawing `bnu-primary`, `hjb-primary` and `hjb-high`. v2's
recommended **Path A — "ship bnu-primary, hjb-primary, hjb-junior" — lost two of its three slices**
and is dead as written.

**The harm argument lost its subject.** v2, and the audit before it, justified urgency on damage to
learners: "every false correct writes +0.08 mastery", a P1 child shown `sphere`, a 错题本 poisoned
with English. On the available evidence there is no such child yet. That does not make the defects
acceptable — it changes *when* they are cheapest to fix, and the answer is **now, before the next
country inherits them**.

## 2. The plan

### P0 — platform, before any Japan or Korea content is generated

These three are the ones a new locale inherits on day one. They are the whole reason Path B exists.

| # | Work | Effort | Note |
|---|---|---:|---|
| 1 | **Honest gate** — provenance tag, `unverified` status, ratcheting baseline | 3d **+ test rewrite in the same PR** | `lib/fullQuestionBankSolvability.test.ts:35` asserts `passRows === expectedFullQuestionBankCount` and `failingRows === []` with **no independence assertion**, so it blocks the fix and cannot be a follow-up. **The ratchet number is not 19,766** — recompute against 16,499. Also close the new hole: the withdrawal set `expectedMainland{BnuPrimary,HjbPrimary,HjbHigh}QuestionCount = 0` and the tests now assert those zeros, so **suppression is recorded as a satisfied expectation** rather than as withheld content. |
| 2 | **CJK grader normalisation** + shared bilingual unit-equivalence table | 4d | Rewrite the justification: the v2 figure of 31.3% is bad arithmetic. The defensible numbers are **7,301/7,307** bare-numeric keys + 个, and **7,307/7,307** for the taught 「答：X个。」 sentence. Load-bearing order: Chinese units (7,307) → ideographic 。 (168, *not* covered by `f0ed7749cc`) → `√`/`sqrt` (188) → `或` sets (33). **Drop** the `²` sub-item (a no-op under NFKC, 15 items) and the `、` split (**zero** live instances, and it would grade a wrongly-ordered 排列 answer correct). Implement in `questionAnswerMatches` anchored on `question.answer`: **548 items have a key that *is* number+unit**, so a symmetric strip in `answerMatches` is a regression. |
| 3 | **`answerLocalized?: LocalizedText`** (additive, strategy b) | 7d | Not `answer: LocalizedText` — that is ~950 LOC across 79 files, 322 call sites, and **does not help Japan or Korea**, because `LocalizedText` is a hard-coded `{en, zh, zhHans}` record with no `ja`/`ko`. Land the gate first so its anchor contract is written down. |
| 4 | **Bleed-stop** for the 198 non-Chinese keys | 1d | 198/198 intact, 40 with keys that are not among the displayed options. **Must follow the grader, not lead it** — it moves 967 keys from Latin to CJK units and so *creates* the domain the grader's guard operates on. Re-verify O5's caveats (350 rows lose their bare-number alias; `:376` desync on 325 rows) rather than inheriting them. |

**Ordering is not negotiable:** `governance → grader → bleed-stop → gate last`. The gate's baseline
must be stamped after 1–3 land, or the ratchet describes a tree that no longer exists.
**Do not run the gate and grader in the same week** — v2's O1 measured 149–1,287 defect rows
including Hong Kong, enough to turn `test:question-bank` → `npm run check` → CI red for every
region. That estimate was computed on 17,700 and **must be re-measured on 11,700 before scheduling**.

### P1 — learner-visible cleanup: cheap, and no longer urgent

| # | Work | Effort | Note |
|---|---|---:|---|
| 5 | **`hjbQuestionLocalization.ts`** — single-file fix + re-derive | ~1d | `:687` mints every `term-XXXX` placeholder; `:754-771` pushes it into the grading key. One file clears **415** `acceptedAnswers` rows and **1,277** client-rendered hjb-junior rows, **and inoculates all three withdrawn packs** before any re-promotion. Highest ratio in the plan. |
| 6 | **Strip generator scaffolding** from prompts and explanations | ~4d | **3,972** prompt labels (bnu-high 1,500/1,500 `题组`; pep-high 2,400/4,800) and **2,515** explanation tails with 54 pure-ASCII English error tags. 100% intact on main; the largest block of learner-visible garbage. Note it *reveals* duplication rather than creating it — see P2. |
| 7 | **`/about` answer leak** | ~0.5d *(est.)* | Payload was fixed; the leak was not. **30 of 30** pep-high preview items still show the correct answer as chip #1 on an unauthenticated page. |
| 8 | **繁體 under the `zh` locale** | **unscoped** | **4,486 items** render traditional characters under `zh`, which `toggleLanguage` reaches in one click (`i18n.ts:516-519` returns `value.zh` unmodified). bnu-high 1,500/1,500, bnu-junior 1,497/1,500, hjb-junior 1,489/1,500; all three PEP slices clean. zh-Hans is genuinely clean. **Nobody has scoped this — do that first.** |
| 9 | **PEP lesson `practiceQuestionIds`, pep-high only** | 0.75d | 22/22 topics yield 8 structurally distinct items; route 45× faster; payload 397 KB → ~10 KB; **0 assertions go red**. Verified still valid on main: 57/57 seeds ship `undefined`, pep-high mean 218.2 questions vs 8 for BNU/HJB — exactly 20–40×. Do **not** port the BNU quota selector: it yields 8 distinct items in **0 of 57** topics. |

### P2 — content, deferred pending a market decision

- **Regenerate distractors.** This is the load-bearing fix, not shuffling. `{a−d, a, a+d, a+2d}` means
  "pick the 2nd-smallest" scores 95.62% / 96.38% on pep-high / bnu-high *after* a shuffle. Shuffling
  alone now buys ~9.7pp on the shipped bank, because the two slices where it actually paid
  (bnu-primary 44.4%→29.5%, hjb-primary 37.2%→30.3%) are withdrawn. Opt-out list is **~157** shipped
  items, not 530.
- **pep-primary pool rebuild** (49% duplicates, 724 distinct prompts, one item served 13×) and
  **bnu-high re-author** (561 distinct of 1,500). Neither can be patched item-by-item.
- **pep-high:** dropping seed-v1 + rag-v2 removes 100% of raw duplicates in one line — but **68.5%
  mathematical repetition and 63.2× post-strip skeleton reuse survive that drop untouched.**
- **Thicken the PEP spine.** Escalated: China's spine went **335 → 138 topics** because the
  withdrawal removed the two granular publishers. PEP is now essentially the whole China spine.
- **87 named wrong keys** (minus 47 that went with the withdrawn packs), and re-solving bnu-junior
  and hjb-junior — both still ship.

## 3. Path A′ is retained, but as a gated re-promotion sequence, not a shipping track

`bnu-primary` and `hjb-primary` remain the best content the product has: 1.01× and 1.03× skeleton
reuse, **zero internal duplication**, 97 + 70 topics tracking the 北师大版 and 沪教版 volume sequences,
and the **only 综合与实践 content in the library** (that 课标 领域 is now at zero product-wide).
Their withdrawal is why the shipped duplication rate *rose* 7.0% → 8.5%.

But re-promotion re-imports, unmodified: 4,500 laundered QA rows, 1,480 `term-XXXX` rows, 1,439
traditional `acceptedAnswers` rows, 22 named wrong keys, 287 shuffle-opt-out items, 196 slug-bearing
lessons, and 44.4% / 37.2% A-bias.

**Gate conditions, in order.** Any re-promotion that runs before condition 1 restores 4,500
tautologically-verified rows with no gate objection whatsoever.

1. P0 item 1 landed — the honest gate.
2. P1 item 5 landed — `hjbQuestionLocalization.ts`, which clears the residue across all three packs.
3. The two wrappers' hard-coded `"pass"/"approved"` repaired
   (`mainlandBnuPrimaryQuestions.ts:143-145`, `mainlandHjbPrimaryQuestions.ts:108-110`).
4. The 22 named keys fixed and the slug interpolation repaired in the two lesson generators.
5. *Then* re-promote.

## 4. What Path B defers, and what that costs

- **No China content ships in the next quarter.** If a partner, pilot or investor commitment depends
  on shipping mainland content, Path B misses it — that is the real cost and it is a business call.
- **The 87 named wrong keys stay live** on the six shipped slices. Acceptable only while the learner
  count is ~zero; unacceptable the moment it is not.
- **`hjb-junior` stays unshipped-in-spirit** — it is live but carries 1,277 `term-XXXX` items,
  1,489/1,500 traditional-under-`zh`, 107 letter-in-both MC items, 72 `变式 N` labels, 8 named wrong
  keys, and 22 lessons that are one mad-libs skeleton still flagged `productionReady: true`.

## 5. What flips this back

Re-read this section before starting P2. **Any one of these inverts the sequencing:**

1. **The production `practice_attempts` count comes back non-trivial.** Then real learners are
   meeting the 66.6% guessable bank and the 198 English keys today, the 87 wrong keys become
   time-critical, and P1 items 5–8 move ahead of P0 item 3.
2. **A commercial commitment to ship mainland content lands.** Then Path A′'s gate conditions become
   the critical path and should be resourced in parallel, not in sequence.
3. **The market answer is "mainland-licensed".** Then note that Path A′'s two packs are **100%
   grades 1–9** — the 义务教育 band 双减 froze for paid online tutoring — while the least-restricted
   band (高中: pep-high, bnu-high) is the worst content in the library. That combination may argue
   for re-authoring 高中 rather than re-promoting 小学.

## 5b. The US corpus was never audited — and it is the one with users

Every finding in this package was measured on China content. Production says the only content with
learners is **US** (616 attempts) and **CCSS** (31). The platform defects are shared, and the
US-specific numbers already measured in passing are not reassuring:

- **Gate:** US_CA 2,802/2,802 and US_AR 3,000/3,000 rows self-verify. The "64 genuinely independent
  US_AR rows" that once looked like a counterexample re-measured at 17, none of them an independent
  derivation.
- **Option-position bias:** US_CA **56.3%** over 1,144 MC items, US_AR **56.8%** over 1,110 — worse
  than chance by more than 30 points, on the content real learners used.
- **Grader:** `f0ed7749cc` fixed the US-shaped cases (608 CA checkpoint questions). No equivalent
  audit of US answer-key correctness, duplication, or curriculum coverage has ever been run.

**Recommendation:** after P0 lands, run the same audit harness against the US corpus before any
further China content work. The scripts and the workflow already exist; the corpus dump is the only
new input. It is the cheapest high-value audit available, and it is the only one whose findings
currently describe a learner's actual experience.

## 6. Japan and Korea

The gating condition for the next locale is **P0 items 1–3**, in that order. Concretely:

- The gate must be able to fail before a new track is added, or `japan`/`korea` default to
  `self-derived` and inherit Green silently — the same `independentAnswerFor()` switch is where a
  new country wires in.
- `answerLocalized?` must exist, and its shape must admit `ja`/`ko`. `LocalizedText` today cannot.
- The grader's unit table must be structured for extension: Japanese counters (個, 円, センチメートル)
  and Korean (개, 원, 센티미터) fail exactly as 张 and 个 do. `f0ed7749cc` is the right shape to
  extend — scalar leniencies in `parseScalarAnswer`, algebraic strings intact in `normalizeAnswer`.

## 7. Still unverified — do not bet a quarter on these

- **The production learner count.** The premise of this entire plan. Unrun.
- **The 5.1% bnu-junior wrong-key rate** and its extrapolation (~75 + ~45 unidentified keys). The
  plan's own most load-bearing number; still one sample by one agent. Re-run stratified with a
  different adjudicator before resourcing item P2/87-keys.
- **pep-high's mathematical correctness.** 4,800/4,800 rows agree with a prompt-parsing solver that
  was written against the same ~20 templates as the generator. A 100.0% match between two
  expressions of one generator is not corroboration. Classify pep-high explicitly and write the
  classification into the gate's assumptions block.
- **Rendering.** The app has never been driven in a browser. The 1,424 measured rendering hazards —
  604 raw newlines, 537 markdown pipes, 283 unbraced LaTeX subscripts — and the 繁體 count are
  code-inspection results, not observed pixels. One Playwright spec rendering 20 items per slice in
  all three locales closes this in under a day.
- **O1's CI-red range (149–1,287 rows)** and the distractor-drop arithmetic — both computed on 17,700.
- **Legal exposure** — textbook-brand marks in 36 bnu-high stems, PIPL minors' obligations, ICP
  filing. Named, never assessed.
