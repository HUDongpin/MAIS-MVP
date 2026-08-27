# CA math content — lead-session content findings (independently measured)

## L1 [P1, arguably P0] `ccss-textbook-practice-v1` (810 LIVE items, K–G12) has NO Chinese translation at all
Measured across all 810 items:
- `prompt.zh === prompt.en` for **810/810 (100%)**; `prompt.zhHans` likewise.
- **725** prompts contain English prose and contain **zero** Chinese characters.
- **590** explanations are untranslated English prose.
- **349** items have at least one word-bearing multiple-choice option left in English.
Example (`ccss-textbook-practice-v1-...-q01`): `{"en":"A full ten-frame is completely filled. How many counters is that?","zh":"A full ten-frame is completely filled. How many counters is that?","zhHans":"...same..."}`.

Blast radius: this pack is 336 of the 828 live K–5 practice items (41%) and 474 of the 1,974 live G6–G12 items (24%). A Chinese-medium student hits a fully English item roughly 1 time in 3.
The other two live packs are fully translated (0 untranslated fields in the 492-item K–5 pack; 6 items with an untranslated option in the 1,500-item G6–G12 pack).

## L2 [P1] The only translation audit in the repo cannot see any of it, and does not run in CI
- `scripts/audit-zh-hans.mjs:8` — `const scanRoots = ["app", "components", "data", "lib", "types"]` with `sourceExtensions = {.ts, .tsx}`. It parses `zh:` string literals out of **TypeScript source only**. Every question pack is `data/generated-content/**/**.json`, so **no pack item is ever scanned**.
- `audit:zh-hans`, `check:hk-zh` are absent from `.github/workflows/ci.yml`.
So the 810 untranslated live items are invisible twice over: wrong file type for the auditor, and the auditor is not enforced.

## L3 [P1] 100% of the live K–5 practice pack ships an internal authoring label in the student-facing prompt
All **492/492** English prompts begin with a knowledge-point scaffold label, e.g.
`"Count Sequence checkpoint: Count the collection: 10 cubes are on a mat. How many objects are on the mat?"`
`"Shapes Position checkpoint: A flat shape has 3 straight sides and 3 corners. What shape is it?"`
`data/usCaliforniaQuestions.ts` `sanitizeStudentText` strips `Activity N:` and `DeepSeek practice:` prefixes but has no rule for `<Knowledge Point> checkpoint:`, so it reaches the student verbatim.
The Chinese variant carries a *different* label (`幼兒園數數與數量練習：` = "Kindergarten Counting and Cardinality practice"), so the en and zh scaffolds do not even agree.

## L4 [P0 pedagogy] Kindergarten "counting" items state the count in the prompt — there is nothing to count
All 12 `k-cc-count-sequence` items read `"Count the collection: N <objects> are on a mat. How many objects are on the mat?"` with key `N`. The number is given in the sentence; no collection is rendered. The task tests reading, not cardinality — it cannot assess K.CC.A.1–A.3 as claimed in `standardIds`.
Same defect class: `k-md-attributes-data-q01/q05/q09` — `"A tray has 5 circle buttons and 4 square buttons. How many buttons are square buttons?"` → key `4`, restated in the prompt.
Root cause is documented in the pack's own QA report: *"No answer-critical visuals are included."* The items were written to work without a visual by inlining the data the visual was supposed to carry, which removes the mathematics.
Mechanical echo scan (numeric-answer items whose key appears verbatim in the prompt): K–5 knowledge-point 46/297 (15.5%), ccss-textbook K–5 slice 16/207 (7.7%), G6–G12 198/1315 (15.1%). NOTE: this scan over-counts — legitimate *selection* tasks ("Which is greater, 42 or 38?", "Which number is the least: −14, 12, or −9?") necessarily restate the answer. The genuinely broken subset is the counting/measuring family above; treat the raw percentages as an upper bound and the K counting family as confirmed.

## L5 [P2] Per-knowledge-point variety is below the pack's headline metric
The pack advertises `counts.questionsPerKnowledgePoint: 12`. Measured distinct English prompts per knowledge point across all 41 KPs:
- 25 KPs genuinely have 12 distinct prompts.
- 16 KPs have fewer: histogram 11→5 KPs, 10→9 KPs, 9→1 KP, **4→1 KP**.
- 34 redundant items in total (6.9% of the pack).
Worst case `us-ca-math-k-k-g-shapes-position` (Kindergarten): 12 items are **4 distinct questions repeated 3×** — q01≡q05≡q09, q02≡q06≡q10, q03≡q07≡q11, q04≡q08≡q12, identical prompt and identical key, differing only in item `type` (multiple-choice / fill-in / short-answer). `us-ca-math-p2-2-g-partition-shapes` is 12→9. Nine Grade-1 KPs sit at 12→10.
So a K student practising "Shapes & Position" sees the same four questions three times each.

## L6 Negative results (classes checked and found clean)
- **No contradictory answer keys**: across all three live packs, every identical-prompt group shares an identical key. 0 conflicts.
- **No cross-pack duplication**: 0 identical prompts between any pair of the three live packs.
- **Bilingual completeness of the other two packs**: the 492-item K–5 pack has 0 missing/echoed zh or zhHans fields anywhere (prompt, options, explanation); the 1,500-item G6–G12 pack has 0 echoed prompts and only 6 items with an untranslated option.

---

# ROOT CAUSES — traced to source in `scripts/build-ccss-practice-pack.mjs`

## R1. The 810 untranslated items are one 3-line function
```js
// scripts/build-ccss-practice-pack.mjs:169
function L(en) {
  return { en, zh: en, zhHans: en };
}
```
Applied to every localized field at build time: `prompt: L(question.prompt)`, `options: options.map(L)`, `explanation: L(question.explanation)`.
The pack was never translated at all — the builder stubs `zh`/`zhHans` with the English string. This is a one-function fix plus a translation pass, not 810 individual repairs. **Verified at source.**

## R2. The P0 multi-correct item is produced by the option-padder, not by the upstream author
The MAIS bank requires exactly 4 options; upstream CCSS-Math-Textbook practice has 3 (479 items) or 2 (10 items). The builder pads every one of the 489 MC items:
```js
// scripts/build-ccss-practice-pack.mjs:150 — first candidate is answer + 1
const candidates = [answer + 1, answer - 1, answer + 2, answer * 2, ...];
```
For `inequalities-q01` ("Which value makes x > 3 true?", key `5`) this synthesized `6` — which also satisfies `x > 3`. The padder checks only for *duplicate* options (line 231), never for a second *correct* one.
Systemic sweep I ran: of all MC items in the pack whose prompt encodes a machine-checkable inequality, exactly **1 of 1** has more than one correct option (this item). The same sweep over the 1,500-item G6–G12 pack: **0**. So the mechanism is systemic (applied to 489/489 items) but the realized defect here is a single item. Fix the padder, then re-audit; do not assume more are hiding.

## R3. `difficulty` is assigned by grade band, at source
```js
difficulty: lowGrades.has(grade) ? "Low" : highGrades.has(grade) ? "High" : "Medium"
```
So the pack's 138/393/279 Low/Medium/High split is literally K–P2 / P3–S2 / S3–S6. There is **zero within-grade difficulty discrimination** in 810 live items — any adaptive-difficulty feature reading this field is reading a re-encoding of grade level.

## R4. `manualQaStatus` is hardcoded by the builder, not earned per item
`manualQaStatus: "accepted-ccss-textbook-hand-check"` sits in the shared `base` object stamped onto all 810 items. The upstream hand-check covers the stem, key and explanation — but the option sets are machine-generated *after* that stamp is applied, and `acceptedAnswers: [answerText]` is always a single string. So the provenance label overstates what was reviewed, and it is what let the padder-generated P0 through.
