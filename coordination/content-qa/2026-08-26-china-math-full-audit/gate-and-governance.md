# Gate integrity, duplication and QA governance (lead auditor)

## Coverage
- 100% programmatic, all 17,700 China items + the repo's own audit gate.
- Verified by executing `buildFullQuestionBankSolvabilityAudit()` from
  `lib/questionBankSolvability.ts` and comparing its row-level fields.

## Findings

### G1 — The content-quality gate verifies every China answer key against a copy of itself
- severity: **blocker**
- category: data-integrity
- affected: all 17,700 China items (and 24,502 of 24,566 platform-wide)
- evidence: `lib/questionBankSolvability.ts:611`
  `isExpectedAnswerRepresented(question, independentAnswer)` checks the
  "independent" answer against `question.answer`. But six of nine mainland
  wrappers set `independentAnswer: question.answer` verbatim —
  `data/mainlandBnuPrimaryQuestions.ts:146`, `mainlandBnuJuniorQuestions.ts:130`,
  `mainlandBnuHighQuestions.ts:117`, `mainlandHjbPrimaryQuestions.ts:111`,
  `mainlandHjbJuniorQuestions.ts:162`, `mainlandHjbHighQuestions.ts:110`.
  Measured: `storedAnswer === independentAnswer` for **17,700 / 17,700 (100.0%)**
  China rows.
  Gate output today: `passRows: 24566, failingRows: 0`,
  `statusCounts: {"pass":24566,"content-error":0,"answer-mismatch":0,...}`,
  `releaseRecommendation: "Green: all current questions are deterministically
  solvable and answer-key matched."`
  Smoking gun row:
  > `{"questionId":"pep-primary-p1-u-mc-051","grade":"P1","storedAnswer":"sphere",`
  > `"independentAnswer":"sphere","status":"pass","severity":"none","notes":["OK"]}`
  That is a 一年级 item whose answer key is the English word "sphere" while its
  four options are 正方体/圆柱/球/长方体. The gate certifies it OK.
- why: An audit that compares a value to itself has no power to detect anything.
  Every "answer-key matched" claim in the S18 audit history for China content is
  vacuous. This is why the defects below survived multiple review rounds.
- fix: `independentAnswer` must be produced by a solver that never reads
  `question.answer` — symbolic evaluation (sympy) for computable items, and a
  second model pass for the rest. Until then the gate must report these rows as
  `unverified`, not `pass`, and `releaseRecommendation` must not return Green
  while any track is 100% self-verified. Add a regression test asserting
  `storedAnswer !== independentAnswer` for a required fraction of rows.

### G2 — QA status is laundered from "pending review" to "pass" in the export layer
- severity: **blocker**
- category: data-integrity
- affected: 4,500 items (BNU primary 3,000; HJB primary 1,500)
- evidence: every item in `mainland-bnu-primary-generated-bank-v1-1500`,
  `-v2-1500` and `mainland-hjb-primary-generated-bank-v1-1500` carries
  `mathQaStatus: "pending-s18-review"`, `terminologyQaStatus: "pending-s18-review"`,
  `manualQaStatus: "pending-s18-review"`, with `reviewNotes` stating
  "candidate QA package only, **not approved for public integration**".
  The export layer overwrites those values with literals:
  `data/mainlandBnuPrimaryQuestions.ts:143-145` and
  `data/mainlandHjbPrimaryQuestions.ts:107-109` hard-code
  `mathQaStatus: "pass", terminologyQaStatus: "pass", manualQaStatus: "approved"`.
- why: The source pack says "never reviewed, do not publish"; the app's own
  metadata says "reviewed and approved". Any dashboard, gate or release check
  reading the metadata sees green. The content is live in `data/questions.ts`.
- fix: Delete the hard-coded literals and propagate the pack's real status.
  Gate publication on the propagated status, so `pending-*` content cannot reach
  `questions.ts` without an explicit, recorded override.

### G3 — HJB high ships the un-remediated pack; two remediated packs are bundled but dead
- severity: major
- category: data-integrity
- affected: 1,500 live HJB high items; ~4.3 MB of dead JSON imported
- evidence: `data/mainlandHjbHighQuestions.ts:129`
  `export const mainlandHjbHighQuestions: Question[] = mainlandHjbHighV2Questions;`
  v2 carries `mathQaStatus: "pending-manual"` on 1,468 of 1,500 items.
  v3-remediated and v4-remediated are imported at lines 3-4 and exported as
  unused symbols. v4 carries 633 items marked `pending-manual-re-review`.
- why: Remediation work was completed and never wired in, while the imports
  still cost bundle weight. Learners get the pre-remediation content.
- fix: Decide which pack is canonical, point the export at it, and delete the
  imports of the packs that are not shipped.

### G4 — 1,246 China items (7.0%) are literal duplicates of another item
- severity: major
- category: variety
- affected: measured on prompt + option-set identity (label prefixes stripped,
  options order-normalised) — 380 groups / 1,246 items
- evidence: per-slice duplication rate —
  | slice | duplicated items | % of slice |
  |---|---|---|
  | pep-primary | 588 | **49.0%** |
  | hjb-high | 229 | 15.3% |
  | pep-high | 399 | 8.3% |
  | bnu-primary | 10 | 0.3% |
  | hjb-primary | 10 | 0.7% |
  | bnu-junior | 5 | 0.3% |
  | hjb-junior | 5 | 0.3% |
- why: Half of the 人教版 primary bank is padding. A P1–P6 learner working
  through PEP practice meets the same item twice on average.
- fix: De-duplicate on prompt+options identity before publication; add the check
  to the gate as a hard failure above a threshold.

### G5 — 54 identical items are served at two different grade levels
- severity: major
- category: curriculum-alignment
- affected: 54 groups, concentrated in hjb-high (S5 ↔ S6)
- evidence:
  > `一组数据为8，13，18，求这组数据的平均数。`
  > served as `hjb-high-ds-v2-s5-171` (高二) **and** `hjb-high-ds-v2-s6-255` (高三)
  > `长方体中同一顶点出发的两条互相垂直棱长分别为5和17，这两条棱围成的矩形面积是多少？`
  > served as `hjb-high-ds-v2-s5-001` **and** `hjb-high-ds-v2-s6-450`
- why: Grade tags are not meaningful if the same item is both 高二 and 高三
  content. It also means the 高三 bank — the 高考 year — is partly filled with
  a mean-of-three-integers exercise that belongs in 小学.
- fix: Enforce one grade per item; re-derive grade from the topic spine.

### G6 — 15 identical items are served under two different publishers
- severity: minor
- category: data-integrity
- affected: 15 groups spanning BNU and HJB (mostly S1 同类项 / 三角形 items)
- evidence: `下列各组式子中，是同类项的是（）` appears as
  `bnu-junior-ds-v1-s1-085` and `hjb-junior-ds-v2-s1-001`.
- why: Publisher-specific banks are the product promise ("your textbook").
  Shared items weaken that claim, though the mathematics is not wrong.
- fix: Accept as a known limitation, or diversify the overlapping items.

### G7 — Answer-key string format is inconsistent across the corpus
- severity: major
- category: answer-key
- affected: corpus-wide; observed in every secondary slice
- evidence: for structurally identical MC items the key is variously
  `"B.2a²b与-5a²b"` (option letter + text), `"-5与0.8"` (bare text),
  `"C.\\(x^2-4y^2\\)"` (letter + LaTeX), `"x^2-4y^2"` (bare LaTeX).
  A units case: `一个正方体的棱长总和是48厘米，它的体积是多少立方厘米？` is keyed
  `"64立方厘米"` in `bnu-primary-ds-v2-p5-170` and `"64"` in
  `hjb-primary-ds-v1-p5-210` — the same item, two key formats.
- why: The key is rendered directly to teachers
  (`components/teacher/TeacherPrepViews.tsx:521`,
  `TeacherReviewLessonView.tsx:463`) and to students as `correctAnswer` on a
  wrong attempt (`lib/server/answerGrading.ts`). Inconsistent formats mean
  teachers see "B.…" on one item and bare text on the next, and grading
  normalisation has to absorb the variance.
- fix: Define one canonical key format per question type and normalise the
  whole corpus to it; assert the format in the gate.

## Slice health verdict
The China banks cannot be certified from the existing evidence trail, because
the gate that produced that evidence trail is non-functional (G1) and the status
metadata it reads was overwritten (G2). Everything the S18 audit history says
about China answer-key quality needs to be re-established from scratch.

---

## Root-cause analysis (added after mechanism investigation)

### R1 — PEP high duplication is confined to two legacy generations still shipped
- severity: major (but a one-line fix)
- category: variety
- affected: 580 duplicated prompts in pep-high
- evidence: `data/mainlandPepHighQuestions.ts` exports the concatenation of four
  generations: `seed-v1 + rag-v2 + rag-v3 + rag-v4` (900 + 900 + 1500 + 1500 =
  4800). Measured distinct prompts per generation:
  | generation | items | distinct prompts | internal duplication |
  |---|---|---|---|
  | seed-v1 | 900 | 476 | **47.1%** |
  | rag-v2 | 900 | 744 | 17.3% |
  | rag-v3 | 1500 | 1500 | 0% |
  | rag-v4 | 1500 | 1500 | 0% |
  Cross-generation overlap is **zero** (0/900, 0/1500, 0/1500 prompts shared with
  seed-v1) and **no prompt carries conflicting answer keys**.
- why: The two newest generations are clean. All 580 duplicates live in the two
  oldest, which are still shipped alongside them.
- fix: Export `rag-v3 + rag-v4` only. That removes all 580 duplicates and 1,800
  legacy items at no cost to the clean content. Note this is the opposite of the
  choice made for HJB high (G3), which ships only the *oldest* pack — the two
  publishers are handled by contradictory policies in the same codebase.

### R2 — PEP primary re-serves the same draft up to 13 times, across question types
- severity: **blocker**
- category: variety
- affected: 1,200 pep-primary items → only **724 distinct prompts** (39.7%
  duplication by prompt; 49.0% by prompt+options identity)
- evidence: `data/mainlandPepPrimaryQuestions.ts` generates items by cycling
  `draftForFamily(family, type, itemIndex)` over a small per-family draft pool.
  The id stride makes it visible — the same prompt recurs every 4th id:
  > `下面描述的是哪种立体图形：相对的面是长方形？` — served **13 times** as
  > `pep-primary-p1-u-fi-092, -096, -100, -mc-052, -056, -060, …`
  > i.e. the same question delivered both as 填空题 and as 选择题, all in P1.
  > `把30升饮料按2:3分成两部分，较大的部分是多少升？` — 10 times (P6)
  > `把一个整体平均分成6份，其中涂色3份。涂色部分占几分之几？` — 10 times (P3)
  No duplicate group spans more than one grade, and no group has conflicting
  answers — the defect is pure repetition, not contradiction.
  Compounding: the P1 group above is one of the 65 items whose answer key is the
  English word (`"cuboid"`), so that single defective item is served 13 times.
- why: 人教版 is the most widely used textbook in mainland China and this is its
  primary-school bank. A learner meets the same item repeatedly within one topic.
- fix: The draft pools must be expanded before the item count is, not cycled.
  Cap generation at the size of the distinct draft pool and fail the build when
  `items > distinctDrafts`.

### R3 — Source-material density predicts, but does not determine, bank quality
- severity: informational (drives the remediation strategy)
- category: pedagogy
- evidence: the packs are generated from `data/rag/mainland*.ts` "safe
  abstraction" cards — `sourceKind: "safe-abstraction"`, each carrying a
  `safeSummary` plus `generationGuidance` and `prohibitedReuseNotes` that
  explicitly forbid reproducing publisher wording. These are *not* textbook
  content. Measured items generated per distinct evidence card:
  | slice | items | evidence cards | items/card | distinct skeletons | dup rate |
  |---|---|---|---|---|---|
  | pep-junior | 1200 | 11 | **109.1** | **39** (30.8× reuse) | — |
  | hjb-high | 1500 | 21 | 71.4 | 241 (6.2×) | 15.3% |
  | hjb-junior | 1500 | 22 | 68.2 | **1403** (1.07×) | 0.3% |
  | bnu-high | 1500 | 23 | 65.2 | 78 (19.2×) | — |
  | bnu-junior | 1500 | 35 | 42.9 | 1485 (1.01×) | 0.3% |
  | hjb-primary | 1500 | 70 | 21.4 | 1459 (1.03×) | 0.7% |
  | bnu-primary | 3000 | 97 | 15.5 | 2946 (1.02×) | 0.3% |
  PEP's whole spine is the thinnest: `data/rag/mainlandPepPrimary.ts` holds
  **13 cards** for all of P1–P6 and `mainlandPepJunior.ts` **11 cards** for
  初一–初三, against BNU's 97 primary cards.
- why: The two extremes make the causal story precise. pep-junior generated 1,200
  items from 11 cards and collapsed to 39 skeletons. But **hjb-junior generated
  1,500 items from 22 cards and produced 1,403 distinct skeletons** — so thin
  source does not force monotony; it only makes it likely when the generation
  method is templated rather than genuinely generative. The three worst slices
  (pep-primary, pep-junior, pep-high seed-v1) are the ones built by hard-coded
  TypeScript template functions; the healthy ones came from per-item model
  generation against the same kind of card.
- fix: Two independent levers, both needed. (a) Thicken the PEP spine — 13 cards
  cannot represent 12 半学期 of 人教版; target parity with BNU's 97. (b) Retire
  the TypeScript template generators for PEP primary/high in favour of the
  per-item generation path that produced hjb-junior and bnu-primary.

## Implication for the Japan / Korea rollout
G1 is **not China-specific**: measured platform-wide, **24,502 of 24,566 rows
(99.7%)** are "verified" against a copy of their own answer key — HK 989/989,
US_CA 2802/2802, US_FL 75/75, China 17700/17700; only US_AR has any genuinely
independent answers (64 rows, 2.1%). A new country onboarded onto this pipeline
inherits a release gate that returns Green without checking anything. The gate,
the status propagation (G2) and a duplication threshold (G4/R2) should be fixed
before 日本 or 한국 content is generated, not after.

### R4 — `answer` is the only learner-facing content field that is not localizable
- severity: **blocker** (type-level root cause of the English answer-key defect)
- category: data-integrity
- affected: every question on the platform; 132 China items visibly broken today
- evidence: `types/index.ts:1804-1808`
  ```ts
  prompt: LocalizedText;      // { en, zh, zhHans }
  options?: LocalizedText[];  // { en, zh, zhHans }
  answer: string;             // <-- bare string
  explanation: LocalizedText; // { en, zh, zhHans }
  ```
  `prompt`, `options` and `explanation` all pass through
  `textForLanguage()` (`lib/i18n.ts:516`), which selects `zhHans` and otherwise
  auto-converts via `traditionalToSimplified` + the PRC glossary. `answer` has no
  language dimension, so it is rendered verbatim wherever it appears.
- why: This is why `pep-primary-p1-u-mc-051` shows a 一年级 learner the word
  "sphere". The field cannot hold a Chinese form, so the generator's English
  canonical value is what reaches the screen. It is not a content mistake that
  slipped through — the type makes the correct behaviour unrepresentable.
  Confirmed render sites, all raw:
  - student, practice, after a wrong answer — `app/practice/page.tsx:2593`
    (`正確答案：{result.correctAnswer}`, fed by
    `lib/server/answerGrading.ts` → `correctAnswer: question.answer`)
  - student, 错题本 — `app/mistake-book/page.tsx:442` (persisted, so the English
    string becomes a permanent record in the learner's mistake history)
  - student, assessment review — `app/student/assessments/[assessmentId]/page.tsx:208`
  - teacher lesson prep — `components/teacher/TeacherPrepViews.tsx:521`
  - teacher lesson review — `components/teacher/TeacherReviewLessonView.tsx:463`
  - teacher assessment analytics — `components/teacher/TeacherResourceAssessmentViews.tsx:1531`
- fix: Promote `answer` to `LocalizedText` (or add `answerLocalized`) and render
  it through `textForLanguage`. Until then, backfill the 132 known items and add
  a gate rule failing any zh-Hans item whose `answer` contains Latin letters
  outside a math-symbol allowlist. **Do this before generating 日本 / 한국
  content** — those locales inherit the same untranslatable field.
