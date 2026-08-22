# A18 Displayed-255 Explanation Adjudication — HOLD Implementation Contract

**Status:** HOLD — decision and implementation specification only

**Audit date:** 2026-08-13 (Asia/Hong_Kong)

**Authoritative audit surface:** `/Volumes/Starship/MAIS-hk-content-qa-wt`

**Recipient explicitly not authorized:** `/Volumes/Starship/MAIS-hk-viz-labs-wt`

This artifact binds the completed independent A18 review of the 61 learner-visible
explanations selected by the current 51 × 5 Hong Kong lesson surface. It does not
authorize copying, merging, staging, committing, building, running Playwright, or
writing any recipient file. A06/A23 must explicitly accept a later frozen closure
before intake.

## 1. Source and preimage binding

The adjudication was performed against these exact source bytes:

```text
3f8f12c4d3fd2efe938d1b07cab6289315f108dd  Git HEAD/base
bf630d7030ded9537005c96ca0c7043698c72a0b25b70bca68b618f480347270  data/questions.ts
3f650ac862f5f6f230e660e616e1ef8597bda50763fb9a1ee041671113e7b679  data/lessons.ts
7c415c8a8e22ee6d793a3a7a8fd2c12e79d858adc880236516ad5113e490d054  data/topics.ts
d7666aac9d37b0e08729253422bc9ffd15475c19c9d6b87a9d3d0f81d0ffa381  lib/practiceQuestionDeduping.ts
f2326d600bec036885c2a78f5e1ff2ee5188e38622c9e9a92be76b8412c6e439  components/lesson/StudentLessonPage.tsx
aae31b33f203e3ac66537419480e28f5f55408193209ee79f49cdb3b30292c4b  components/lesson/LessonView.tsx
7173bb8753cf12824dd272a0ee2e37f00f5bea91119351d92ec727bb4edf3ffe  lib/server/answerMatching.ts
6e65409f18902bf1e905501396a82ec0c982ea851ed2d314bdf5c542ba4023e5  lib/server/questionResponseContracts.ts
```

The first independent reconstruction encoded each row as
`NN<TAB>grade<TAB>topicId<TAB>id1,...,id5<LF>` and produced:

```text
51 rows; 8,869 bytes
SHA-256 70e1a1b6ad70d319eb38bc34871a8c453e9629876740440322696d702c5528d0
```

The second independent reconstruction encoded each row as
`grade|topicId|production-route-slug|id1,...,id5<LF>` and produced:

```text
51 rows
SHA-256 5562f9c6abce1d208378ad5ad2c7bc07b6c0adf3bf0f02f9ecfd0e3dda3281b2
```

Both reconstructions found exactly 255 unique displayed IDs, five per lesson,
and `displayed255 ∩ EASE701 = []`.

After this adjudication, A18 independently changed only the S6 z-score extension
inside `data/lessons.ts`; that later lesson-copy change does not alter the 61 IDs or
the `data/questions.ts` preimage bound here. Any implementation package must still
reconstruct the displayed 255 from its own final bytes rather than assuming that
the selection is unchanged.

## 2. Generator contract

Extend the topic drill data with a content-owned common-check override:

```ts
type TopicDrill = {
  firstStep: Question["prompt"];
  firstStepExplanation?: Question["explanation"];
  // Existing key-fact and guided-example fields remain unchanged.
  commonCheck: Question["prompt"];
  commonCheckExplanation?: Question["explanation"];
};
```

For the 49 IDs listed in section 4, the safe generic fallbacks are exactly:

```ts
firstStepExplanation ?? {
  en: `${drill.firstStep.en}. ${drill.keyFactExplanation.en}`,
  zh: `${drill.firstStep.zh}。${drill.keyFactExplanation.zh}`,
}

commonCheckExplanation ?? {
  en: `${drill.commonCheck.en}. ${drill.keyFactExplanation.en}`,
  zh: `${drill.commonCheck.zh}。${drill.keyFactExplanation.zh}`,
}
```

Do not apply these two fallbacks to the 12 IDs in section 3. Their selected
strategy/check and key fact do not support one another without bespoke reasoning.

## 3. Exact bespoke bilingual overrides

The wording below is authoritative for implementation review. Mathematical
expressions may be wrapped with the repository's existing `math(...)` helper,
but the learner-visible meaning must remain byte-for-meaning equivalent.

### 3.1 Five `firstStepExplanation` overrides

#### `supp-p5-volume-first-step-v2`

Revise `firstStep`:

- EN: `Identify the volume and dimensions, then decide which quantity is unknown before choosing the operation`
- ZH: `先辨認體積和各個尺寸，再找出未知量，然後選擇運算`

Set `firstStepExplanation`:

- EN: `Here height is unknown. From V = lwh, divide the volume by the base area: h = 48 ÷ (4 × 3) = 4 cm.`
- ZH: `這題的未知量是高。由 V = lwh，用體積除以底面積：h = 48 ÷（4 × 3）= 4 厘米。`

#### `supp-p5-charts-averages-first-step-v2`

Set `firstStepExplanation`:

- EN: `Use the legend to match 9 to Class A and 6 to Class B in the same category; then add 9 + 6 = 15 votes.`
- ZH: `先按圖例把同一類別中的 9 票配對到甲班、6 票配對到乙班，再計算 9 + 6 = 15 票。`

#### `supp-p6-ratio-proportion-first-step-v2`

Revise `firstStep`:

- EN: `For a mean, divide the total by the number of data values; for a broken-line graph, read the axis labels, scales, units, and data order first`
- ZH: `求平均數時用總和除以數據個數；閱讀折線圖時先看坐標軸標籤、刻度、單位和數據次序`

Set `firstStepExplanation`:

- EN: `For 6, 8, 10, the mean is (6 + 8 + 10) ÷ 3 = 8. On a broken-line graph, the axis labels, scales, units, and point order determine what each segment represents.`
- ZH: `對 6、8、10，平均數是（6 + 8 + 10）÷ 3 = 8。閱讀折線圖時，坐標軸標籤、刻度、單位和各點次序決定每條線段所表示的意思。`

#### `supp-statistics-s1-first-step-v2`

Revise `firstStep`:

- EN: `Identify whether the question asks for a measure of centre or spread; order the data when finding the median`
- ZH: `先辨認題目要求集中趨勢還是離散程度；求中位數時把數據排序`

Set `firstStepExplanation`:

- EN: `The range is a measure of spread, not an average: 12 − 3 = 9. For the median, order the data before selecting the middle value.`
- ZH: `全距是離散程度的量度，不是平均數：12 − 3 = 9。求中位數時，先把數據排序，再找中間值。`

#### `supp-differentiation-intro-first-step-v2`

Set `firstStepExplanation`:

- EN: `A derivative describes gradient or rate of change. For x^n, the power rule calculates the derivative: d/dx(x^n) = nx^(n−1).`
- ZH: `導數表示斜率或變化率。對 x^n，冪法則可求出導數：d/dx(x^n) = nx^(n−1)。`

### 3.2 Seven `commonCheckExplanation` overrides

#### `supp-ratios-common-check-v2`

- EN: `When scaling a ratio, every term must use the same multiplier. For 3:5, multiplying both terms by the one-part value 5 gives shares 15:25, which still has ratio 3:5.`
- ZH: `縮放一個比時，每一項都必須使用同一倍數。對 3:5，把兩項同乘每份的數值 5，得 15:25，所得比仍是 3:5。`

#### `supp-statistics-s1-common-check-v2`

- EN: `Sort the data first: 2, 5, 9. The middle value is then 5, so the median is 5.`
- ZH: `先把數據排序為 2、5、9。中間值是 5，所以中位數是 5。`

#### `supp-polynomials-common-check-v2`

- EN: `Expand the proposed factors and simplify; the result must reproduce every term of the original polynomial. For example, x(x + 4) = x^2 + 4x.`
- ZH: `把所擬因式展開並化簡，結果必須重現原多項式的每一項。例如，x(x + 4) = x^2 + 4x。`

#### `supp-identities-square-patterns-common-check`

- EN: `Expand both factors and check every term and sign. For example, (a − b)^2 = (a − b)(a − b) ≡ a^2 − 2ab + b^2; the two ab terms combine to −2ab.`
- ZH: `展開兩個因式並檢查每一項和正負號。例如，（a − b）^2 =（a − b）（a − b）≡ a^2 − 2ab + b^2；兩個 ab 項合併為 −2ab。`

#### `supp-circles-common-check-v2`

- EN: `Mark every radius from the centre; radii of the same circle are equal. At a point of contact, also mark the 90° angle between the radius and the tangent.`
- ZH: `標示由圓心連到圓周的每條半徑；同一圓的半徑相等。在接觸點亦要標示半徑與切線之間的 90° 角。`

#### `supp-calculus-common-check-v2`

- EN: `At a stationary point, compare the sign of f'(x) immediately before and after it: + to − gives a local maximum, − to + gives a local minimum, and no sign change gives neither.`
- ZH: `在駐點處，比較其前後 f'(x) 的正負：由正變負是局部極大值，由負變正是局部極小值；若沒有變號，則兩者都不是。`

#### `supp-exam-revision-common-check-v2`

- EN: `Use minutes per mark to set the working-time budget, then reserve a separate final checking period; give priority in that period to high-mark answers.`
- ZH: `先按每分所需分鐘設定作答時間預算，再另外預留最後檢查時間；檢查時優先核對高分題。`

## 4. Exact 49 generic-safe IDs

The generic fallback in section 2 is approved only for these IDs.

### 4.1 First-step explanations: 36 IDs

```text
supp-p3-multiplication-division-first-step-v2
supp-p3-fractions-intro-first-step-v2
supp-p3-measurement-first-step-v2
supp-p3-geometry-patterns-first-step-v2
supp-p4-large-numbers-first-step-v2
supp-p4-decimals-first-step-v2
supp-p4-perimeter-area-first-step-v2
supp-p5-fractions-operations-first-step-v2
supp-p5-rates-first-step-v2
supp-p6-percentages-first-step-v2
supp-p6-speed-first-step-v2
supp-p6-pre-secondary-problem-solving-first-step-v2
supp-integers-first-step-v2
supp-algebra-basics-first-step-v2
supp-angles-first-step-v2
supp-ratios-first-step-v2
supp-linear-equations-first-step-v2
supp-coordinates-first-step-v2
supp-transformations-first-step-v2
supp-probability-s2-first-step-v2
supp-polynomials-first-step-v2
supp-identities-square-patterns-first-step
supp-trigonometry-basics-first-step-v2
supp-arc-length-sector-area-first-step
supp-functions-first-step-v2
supp-coordinate-geometry-first-step-v2
supp-circles-first-step-v2
supp-more-algebra-first-step-v2
supp-data-handling-first-step-v2
supp-advanced-functions-first-step-v2
supp-trigonometry-s5-first-step-v2
supp-probability-s5-first-step-v2
supp-calculus-first-step-v2
supp-statistics-s6-first-step-v2
supp-exam-revision-first-step-v2
supp-mixed-problem-solving-first-step-v2
```

### 4.2 Common-check explanations: 13 IDs

```text
supp-integers-common-check-v2
supp-algebra-basics-common-check-v2
supp-linear-equations-common-check-v2
supp-probability-s2-common-check-v2
supp-trigonometry-basics-common-check-v2
supp-arc-length-sector-area-common-check
supp-more-algebra-common-check-v2
supp-advanced-functions-common-check-v2
supp-trigonometry-s5-common-check-v2
supp-probability-s5-common-check-v2
supp-differentiation-intro-common-check-v2
supp-statistics-s6-common-check-v2
supp-mixed-problem-solving-common-check-v2
```

## 5. Exact hard-negative authoring phrases

All 61 final learner-visible explanations must reject these eight substrings:

```text
The topic's key fact shows why this structure matters
The alternatives instead encode these specific misconceptions
This check is consistent with both the key fact
the other checks would preserve a topic-specific error rather than expose it
本課題的關鍵知識說明這個結構為何重要
其餘選項分別包含以下具體誤解
這項檢查同時符合關鍵知識
其餘檢查會保留本課題的具體錯誤，而不能揭示錯誤
```

These are assessment-authoring statements, not learner-facing mathematical
reasoning. A test that only removes the literal phrases without verifying the
meaning of the 12 bespoke rows is insufficient.

## 6. Three superseded distractor pairs

The following old EN/ZH distractor pairs must be absent after repair.

### `supp-linear-equations-first-step-v2`

Superseded:

- EN: `Divide by the coefficient before undoing an added constant`
- ZH: `未消去所加常數，便先除以係數`

Approved replacement:

- EN: `Divide only the variable term by its coefficient while leaving the constant and the other side unchanged.`
- ZH: `只把含變量的一項除以係數，常數項和方程另一邊保持不變。`

### `supp-trigonometry-s5-first-step-v2`

Superseded:

- EN: `List periodic solutions before checking the required interval`
- ZH: `未檢查題目指定區間，便先列出週期解`

Approved replacement:

- EN: `Give only one principal value and never generate or check the other solutions in the required interval.`
- ZH: `只寫一個主值，不列出或檢查指定區間內的其他解。`

### `supp-differentiation-intro-first-step-v2`

Superseded:

- EN: `Reduce the exponent before multiplying by the original exponent`
- ZH: `未乘原來指數，便先把指數減一`

Approved replacement:

- EN: `Reduce the exponent by one but never multiply by the original exponent.`
- ZH: `只把指數減一，卻沒有乘以原來的指數。`

## 7. Required ID-scoped semantic gates

In addition to exact-set and hard-negative checks, the implementation must prove:

1. S1 statistics first-step feedback distinguishes centre from spread and never
   calls range an average.
2. S1 statistics common-check feedback justifies the median by sorting, not by
   citing a range calculation.
3. P5 volume identifies the unknown and chooses multiplication or division from
   `V = lwh`.
4. P5 compound-chart feedback binds the legend, both series, and the same category
   before arithmetic.
5. P6 broken-line feedback names labels, scales, units, and point/data order;
   reject `ordered axes` and `有序坐標軸`.
6. Ratio scaling demonstrates one common multiplier rather than only adding the
   ratio terms.
7. Polynomial and identity checks actually expand the expressions.
8. Circle checking includes both equal radii and the tangent-radius right angle.
9. Calculus checking includes both sign-change directions and the no-change case.
10. Exam-revision checking distinguishes working-time budget from separately
    reserved checking time.

## 8. Acceptance boundary

This report approves wording for implementation review only. It does not clear:

- the other displayed-255 content, response-contract, geometry, or figure issues;
- the 701-row EASE bank;
- QuestionFigure answer leakage;
- the final 51 × 5 selection after source changes;
- browser rendering, interaction, accessibility, state isolation, build, release,
  commit, push, merge, deployment, or the overall Hong Kong curriculum goal.

After implementation, A18 must reconstruct the final 255 from production source,
reconfirm `displayed255 ∩ EASE701 = []`, review all 61 final EN/ZH explanations,
and run a new independent full 255-row semantic sweep.
