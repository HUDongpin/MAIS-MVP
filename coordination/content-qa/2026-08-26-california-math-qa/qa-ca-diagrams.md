# California math visual layer — QA audit

Repo: `/Volumes/Starship/MAIS-MVP` @ branch `codex/edulab-mais`
Scope: CA illustration data, CA practice figures, CA lesson `illustration` fields,
CA renderer components, the two audit scripts, `tests/e2e/math-diagram-boundary.spec.ts`.
Method: read-only. Every number below was recomputed from the SVG path/coordinate data
or from the raster pixels, not taken from the label.

---

## 0. What actually exists (inventory)

| Surface | Declared specs | Assets on disk | Verified |
|---|---|---|---|
| CA HS worked examples (`data/usCaliforniaHighSchoolLessonIllustrations.ts`) | 40 across 20 chapters | 40 `worked-example-N.svg` + 20 `concept.webp` | 40/40 arithmetic + 40/40 SVG geometry |
| CA HS chapter concept backgrounds | 20 | 20 `.webp` | existence only (declared decorative) |
| CA K–5 lesson illustrations (`data/usCaliforniaLessonIllustrations.ts`) | 2 (1 topic) | 1 PNG + 1 SVG | 2/2 (pixel-counted / element-counted) |
| CA practice figures (`data/usCaliforniaPracticeFigures.ts`) | 10 ten-frames | n/a (deterministic SVG) | 10/10 |
| CA K–5 textbook lessons `illustration` | 29 records, **0 figures** | – | 29/29 enumerated |
| CA middle-school live lessons `illustration` | 15 records, **0 figures**, 15 `plannedAssets` | – | 15/15 enumerated |
| CA middle-school live worked-example visuals (student route) | 15 generated | – | 15/15 |

**87 figure specs verified out of 87 that exist**, plus 44 lesson `illustration` records enumerated.

---

## 1. Findings table

Severity: **P0** = mathematically false figure, figure contradicting its text, or a declared figure that renders as nothing.
**P1** = missing where needed / inaccessible / untranslated. **P2** = polish.

### P0 — mathematically false

| # | Figure id | Attached to | Sev | Defect class | Spec excerpt | Why it is wrong | Suggested fix |
|---|---|---|---|---|---|---|---|
| 1 | `us-ca-math-p1-1-oa-add-subtract-concept` (ten-frame panel) | CA G1 lesson `us-ca-math-p1-1-oa-add-subtract`, slot `concept`; asset `/lesson-illustrations/us-ca-k5/grade1-operations-algebraic-thinking/add-subtract-stories-single-panel-source-hd.png` | **P0** | false quantity in figure | panel labelled `ten-frame … = 11` | The drawn ten-frame holds **7 blue + 3 green = 10** counters and is labelled `= 11`. A single ten-frame cannot show 11. It also teaches that a full frame equals 11. | Redraw as a double ten frame (10 + 1) or as 8 blue + 3 green over two frames. Regenerate deterministically — this is a raster with `preserveRasterFidelity: true`. |
| 2 | same figure (part–part–whole trays) | same | **P0** | figure ↔ text mismatch + false sum | story: "Lena has 8 blue stickers … A friend gives her 3 green stickers"; whole card reads `11` | The blue "part" tray draws **9** counters (5 + 4), not 8. 9 + 3 = 12, but the whole is labelled 11. Three mutually inconsistent claims in one panel. | Redraw the blue tray with 8 counters. |
| 3 | same figure (hand-off card) | same | **P0** | figure ↔ text mismatch | "A friend gives her **3** green stickers" | The card being handed across the desk carries **4** green counters. | Redraw with 3. |
| 4 | `worked-example-2.svg`, `us-ca-math-s3-chapter-03` | HS worked example `us-ca-math-s3-chapter-03-repair-worked-02`, kind `quadratic-graph` | **P0** | curve does not match its equation | prompt `h(t) = -16t^2 + 48t + 5`; marker text `vertex t=1.5, h=41` | Axes are `x∈[-1,16]`, `y∈[-10,50]` (y-axis line at px 127.18 = t 0; x-axis at px 610.67 = y 0). The vertex marker sits at px **436 → t = 7.5**, and the drawn parabola is `41 − 0.64(t−7.5)²`, not `−16(t−1.5)² + 41`. A student reads the maximum at t ≈ 7.5 and sees the ball still airborne at t = 15 (real ground contact ≈ t = 3.1). | Plot the actual function; set the x-window from the real vertex, not from the plot midpoint. |
| 5 | `worked-example-2.svg`, `us-ca-math-s6-chapter-05` | `us-ca-math-s6-chapter-05-repair-worked-02`, kind `quadratic-graph` | **P0** | curve contradicts its own label | prompt `R(p) = p(120 - 4p)`; marker text `max 900 at p=15` | Axes `x∈[0,16]` (y-axis at px 86), `y∈[-50,950]` (x-axis at px 648). Curve peaks at px **414.1 → p = 7.5** and returns to 0 at p = 15. The label says the max is at p = 15 while the drawing puts it at 7.5 and puts *zero* revenue at 15. Same "vertex forced to the domain midpoint" bug as #4. | As #4. |
| 6 | `worked-example-1.svg`, `us-ca-math-s5-chapter-02` | `us-ca-math-s5-chapter-02-repair-worked-01`, kind `function-graph` | **P0** | wrong figure entirely (copy-paste) | prompt `P(t) = 500(1.08)^t. Estimate P(3).` | The whole "Deterministic Visual Layer" is byte-identical to `us-ca-math-s3-chapter-02/worked-example-1.svg`: a **straight line** from (0, 5) to (8, 21) with the point label **`f(8)=21`**. An exponential problem is illustrated with a linear graph carrying another chapter's numbers, on a y-axis topping out at 130 while P(3) ≈ 630. `diff` shows only the title/desc/prompt/answer text differs. | Regenerate; add a gate that the plotted series be derived from the example's own expression. |
| 7 | `worked-example-1.svg`, `us-ca-math-s4-chapter-02` | `…-repair-worked-01`, kind `geometry-diagram` | **P0** | figure contradicts the answer | prompt "Triangle ABC 3,4,5. Triangle DEF 6,8,10. Find the scale factor"; answer `scale factor = 2` | The two drawn polygons are `160,670 420,670 255,410` and `500,670 760,670 595,410` — **identical size** (base 260, height 260). The figure shows a scale factor of 1 next to the answer 2. No side is labelled 3/4/5 or 6/8/10. | Draw DEF at twice ABC's linear size and label the six sides. |
| 8 | `worked-example-2.svg`, `us-ca-math-s4-chapter-02` | `…-repair-worked-02`, kind `geometry-diagram` | **P0** | figure is not the stated shape | prompt "A right triangle has legs 9 and 12" | The template reuses the same two polygons. Side lengths from the coordinates: 276.8, 307.9, 260 — **no right angle, not similar to 9-12-15**, and neither triangle carries a 9, 12 or 15 label. The A/B/C/D/E/F vertex labels are also foreign to this prompt. | Draw one right triangle with legs in 3:4 ratio and a right-angle mark; label 9, 12, 15. |
| 9 | `worked-example-1.svg` and `worked-example-2.svg`, `us-ca-math-s4-chapter-03` | `…-repair-worked-01/02`, kind `circle-diagram` | **P0** | unresolved placeholder + missing construction | literal figure text: `r = 6 or 5` and `60 deg / tangent` | Both examples share one hardcoded circle (`cx=300 cy=500 r=132`) with an unsubstituted placeholder label **"r = 6 or 5"** and **"60 deg / tangent"**. Ex. 2 (tangent length 12 from an external point 13 with radius 5) has **no tangent line, no external point, no right angle at the point of tangency, and no 13** anywhere. The drawn radius is 132 px for both r = 6 and r = 5. | Two separate figures: (a) sector with r = 6 and a 60° central angle, (b) circle + external point + tangent + right-angle mark labelled 5, 12, 13. |
| 10 | `us-ca-math-s4-chapter-03-repair-worked-02` prompt text | HS ch. S4-03 | **P0** | mathematically impossible premise | `"A tangent point is 13 units from the circle center, and the radius is 5."` | A point of tangency lies **on** the circle, so its distance from the centre is exactly the radius, 5 — it cannot be 13. The intended object is the external point. | Reword: "An external point is 13 units from the centre; the radius is 5." |
| 11 | `worked-example-1/2.svg` `us-ca-math-s5-chapter-05`, `worked-example-2.svg` `us-ca-math-s6-chapter-01` | 3 examples, kind `interval-diagram` | **P0** | endpoint openness inverted / unlabelled | drawn as `circle r=14 fill=#ffffff` (open) at left, `fill=#2563eb` (closed) at right; endpoint texts are literally `left` and `right` | All three share one hardcoded segment. For the two **closed** confidence intervals `[0.48, 0.64]` and `[69, 75]` the left endpoint is drawn **open**. For `[12.35, 12.45)` — closed left, open right — the drawing is **exactly inverted**. No numeric endpoint is drawn at all; the ticks read "left"/"right". The interval-openness convention is the entire teaching point of these three examples. | Emit endpoint markers from the interval's own closed/open flags and print the endpoint values. |
| 12 | all 40 `exactLayerSrc` files + all 15 declared `kind` values | every CA HS worked example | **P0** | declared figure renders as nothing | `"kind": "circle-diagram", "renderer": "svg", "exactLayerSrc": "/lesson-illustrations/us-ca-high-school/.../worked-example-1.svg"` | `grep -rn "exactLayerSrc" components/ app/ lib/ tests/` returns **zero** consumers. Both CA HS pages ignore `kind`, `renderer` and `exactLayerSrc` and instead call `<WorkedExampleIllustration content={prompt+answer+steps} …/>`, which **re-infers** a kind from the English text. All 40 collapse onto 2 generic scenes (35 `coordinate-function`, 5 `ratio-rate-percent`). Every one of the 15 authored kinds is discarded and the 40 authored SVGs are dead assets. | Either render `exactLayerSrc`, or delete the `kind`/`renderer`/`exactLayerSrc` fields so the data stops implying a contract nothing honours. |
| 13 | `CoordinateFunctionScene` (components/lesson/WorkedExampleIllustration.tsx:349) | 35 CA HS + 2 CA middle-school worked examples | **P0** | hardcoded false data beside the problem | `{[1,2,3].map(row => … {row} … {row * 2 + 1})}` and a fixed 5-point polyline | The scene always draws the same rising straight line and the same input→output table **1→3, 2→5, 3→7** (i.e. y = 2x + 1). It is placed next to "Find the vertex of x² − 6x + 5", "arc length in terms of pi", "Triangle ABC ≅ DEF by SAS", "P(t) = 500(1.08)^t", "area = 3.6 m²". Each of those students is shown a linear graph and a table of a function that is not theirs. A quadratic illustrated by a straight line is a false claim about the function's shape. | Kind-dispatch off the authored `kind`, or drop the fabricated table/graph and show only the step tiles. |
| 14 | live middle-school lesson `us-ca-math-middle-school-textbooks-v2-s2-8-ns-real-numbers` | route `/student/lessons/california-middle-school-textbook` | **P0** | figure prints a false equation | focus badge renders **`2 = 64`** | `extractFocusText` (workedExampleIllustrationMetadata.ts:393) matches `-?\d+(…op…\d+){1,4}` with `^` absent from the operator class, so `8^2 = 64` is truncated to `2 = 64`. The generated figure displays the literal statement "2 = 64" as its "Worked focus". | Exclude `^`/superscripts from the match, or require the whole matched span to be a balanced expression. |
| 15 | live lesson `…-s2-8-g-transformations-pythagorean-volume` | same route | **P0** | figure badge contradicts the answer | prompt "legs 9 and 12 … hypotenuse?"; badge renders **`2 + 12`** | Same truncation of `9^2 + 12^2`. The badge asserts 2 + 12 (= 14) beside the answer 15. The accompanying `GeometryScene` also draws an **isosceles** triangle (`M620 405 L810 150 L1000 405 Z`, apex on the perpendicular bisector) for a stated **right** triangle. | Fix the extractor; give the geometry scene a right-triangle variant. |
| 16 | live lesson `…-s1-7-g-scale-circles-angles` | same route | **P0** | badge shows the wrong formula | circle area, r = 4, π = 3.14 → 50.24; badge renders **`3.14 x 4`** | `3.14 × 4^2` truncates to `3.14 × 4` = 12.56, i.e. it shows πr instead of πr² as the figure's focus. Scene chosen is `ratio-rate-percent` (a percent bar) for a circle-area problem. | As above; route circle problems to a geometry scene. |
| 17 | live lesson `…-s2-8-f-function-relationships` | same route | **P0** | badge shows the numerator as the rate | "Function B passes through (0,5) and (4,13)"; badge renders **`13 - 5`** | The rate of change is (13−5)/(4−0) = 2. The figure's focus badge shows `13 - 5` (= 8), four times the true rate, on a problem whose whole task is comparing rates. | Extract the computed answer, not the first arithmetic-looking substring. |

### P1 — missing where needed / inaccessible / untranslated

| # | Figure id | Attached to | Sev | Defect class | Detail | Suggested fix |
|---|---|---|---|---|---|---|
| 18 | both entries in `data/usCaliforniaLessonIllustrations.ts` | CA G1 `us-ca-math-p1-1-oa-add-subtract` | **P1** | untranslated alt/caption | `function localized(en: string): LocalizedText { return { en, zh: en, zhHans: en }; }` — `alt` and `caption` are the **English string in all three locales**. A zh/zhHans learner gets English alt text. | Author real zh/zhHans strings; delete the `localized()` identity helper. |
| 19 | `lena-7-plus-4-stickers-worked-example.svg` | same lesson, slot `worked-example` | **P1** | untranslated figure text | Math is **correct** (7 blue stars + 4 green stars = 11 stars drawn; "7 stickers + 4 more stickers = 11 stickers"). But every string is baked in English inside the SVG ("Lena starts with 7 stickers", "gets 4 more", "Now Lena has 11 stickers"). | Emit locale variants, or move the text out of the asset into localized captions. |
| 20 | `WorkedExampleIllustration` alt/caption | every CA HS + CA middle-school generated figure (55) | **P1** | monolingual, self-certified | `alt: \`${title} worked example illustration using a ${label}.\`` — English template, no `language` prop anywhere in the component. The SVG also prints English chrome to students: "Worked example visual" / "coordinate function - upper secondary". Metadata hardcodes `qa: { answerCritical: false, gradeFit: "pass", status: "qa-pass" }` with no check performed. | Thread `language` through; stop asserting `qa-pass` in a data literal. |
| 21 | `CaliforniaHighSchoolTextbookStudentPage.tsx:60` | 20 CA HS chapter concepts | **P1** | authored alt discarded | `alt={\`Concept visual for ${chapter.title.en}\`}` ignores the authored trilingual `chapter.concept.alt`. The review page (`CaliforniaHighSchoolTextbookPage.tsx:74`) uses `chapter.concept.alt.en` — also English-only. | Use `alt[language]`. |
| 22 | 48 live CA practice questions | `usCaliforniaQuestions` (2802 live CA questions, **10** carry a diagram) | **P1** | stem names a visual, no figure | See §3 for the id list. Includes `…-k-k-nbt-teen-numbers-q09` — *"A ten-frame shows 10 counters and 2 more counters"* — while q01 and q05 of the same knowledge point **do** get ten-frames. Also 18 fraction-area items ("A rectangle is split into 7 equal parts. 1 part is shaded") and 3 number-line-fraction items. | Extend `usCaliforniaPracticeFigureSpecs` with `plane-figure`/`number-line` archetypes and matching reconciliation rules in `lib/practiceFigureAudit.ts`. |
| 23 | 29 CA K–5 lesson records | `us-ca-math-k-g5-textbooks-v1/lessons.json` | **P1** | zero figures | Every record is `{"visualPolicy":"text-only-v1","plannedAssets":[]}`. 12 of the 29 lesson texts name a representation ("A ten-frame bus fills all 10 seats, and 4 more students wait beside it", "A class shares same-size granola bars and marks the pieces on a number line"). | Author the 12 named representations as deterministic SVG. |
| 24 | 15 CA middle-school lesson records | `us-ca-math-middle-school-textbooks-v2/live-lessons.json` | **P1** | zero figures, 15 acknowledged | Every record is `"visualPolicy":"text-only-v2"` with one `plannedAssets` entry at `needTier: "future-live-enhancement"` (double number line, vertical number line, prism/unit-cube, dot plot + summary table, scale table, signed number line, inequality number line, labeled circle, tree diagram, …). 13 of 15 lesson texts instruct the learner to *"Use vertical number line to explain the reasoning"* etc. — for a representation the page never shows. This route **is** student-facing (`/student/lessons/california-middle-school-textbook`). | Build the 15 planned assets, or stop telling the student to use a representation that is absent. |
| 25 | `worked-example-2.svg`, `us-ca-math-s5-chapter-03` | `…-repair-worked-02`, kind `trig-graph` | **P1** | misleading reference line | The cosine curve itself is **exact** (verified at x = 0, 3, 6, 12 against `4cos(πx/6)+1`). But the dashed teal line is drawn at y = **5**, which for this function is the *maximum*, not the midline (midline y = 1). The identical dashed element means "midline" in `worked-example-1` of the same chapter. | Compute the midline from the function, or label the dashed line. |
| 26 | `worked-example-1.svg` s3-ch02, s6-ch04 (×2), s5-ch01 | 4 HS `function-graph` examples | **P1** | scale renders the concept invisible | y-window is `[-10, 130]` while the plotted values span 5–21, 3–24 and 2–18. The "graph" occupies 11–13 % of the plot height, so `f(8)=21`, the average rate of change and the parabola vertex all read as a flat line hugging the x-axis. | Auto-fit the y-window to the plotted series. |
| 27 | `CaliforniaHighSchoolTextbookStudentPage` | – | **P1** | dead surface | Not mounted on any route; `lib/californiaGradeAware.test.ts:69-70` asserts it is absent from the public and student routes. The only live CA HS surface is the noindex QA route `/lesson/california-high-school-textbook/review`. | Delete, or mount and fix the figures first. |

### P2 — polish

| # | Figure id | Sev | Detail |
|---|---|---|---|
| 28 | `worked-example-1/2.svg` `us-ca-math-s3-chapter-04` (`coordinate-plane`) | P2 | Plotting is **exact** (A(−2,3)→px 213.27/491.69, B(4,7)→595.09/393.23, midpoint (1,5)→404.18/442.46 all reconcile against the drawn axes). But the midpoint dot is labelled just `midpoint`, not `(1, 5)`; ex. 2 invents vertex names `A`/`B` the prompt never uses, draws a **segment** where the prompt asks for a **line**, and never shows `y = 2x − 4`. |
| 29 | all 16 HS cartesian figures | P2 | Only three axis labels per figure (x-min, x-max, y-max), placed at the frame corners rather than on the axes. There are no tick values, so nothing on the plot is actually readable to a coordinate. |
| 30 | `worked-example-1.svg` `us-ca-math-s6-chapter-01` (`units-diagram`) | P2 | Rectangle is `420 × 260` px for `2.4 m × 1.5 m`: aspect 1.615 vs. 1.600, ~1 % off. Acceptable but not exact. |
| 31 | `us-ca-math-p1-1-oa-add-subtract-concept` | P2 | `caption: localized("")` — empty caption. Also grade-appropriateness: one Grade 1 panel carries five simultaneous representations (story bubble, part–part–whole trays, ten-frame, a 0–20 number line, three equations) — dense for a 6-year-old, and the hand-off direction reads as Lena *giving* rather than *receiving*. |
| 32 | 20 `concept.webp` | P2 | `alt` is the reviewer-facing string "…concept background for internal review" / "…僅供內部審查" and would ship verbatim to a student if the route were promoted. |
| 33 | exact-layer templates for `equation-flow`, `data-model`, `probability-table`, `probability-tree`, `decision-table` (15 files) | P2 | All five kinds render the **identical** generic "Exact item / Value" two-column table. A `probability-tree` renders a table, not a tree; a `data-model` renders a table, not a model. The `kind` field is decorative even inside the exact layer. |
| 34 | `components/practice/QuestionFigure.tsx:479-483` | P2 | Kind dispatch is a chain of `{diagram.kind === "x" ? <X/> : null}` with no `default`. A kind added to `QuestionDiagram` without a branch renders the outer `role="img"` shell with **no content** — blank space. TypeScript currently prevents it, but the shape invites the failure. |

---

## 2. kind → renderer mapping

### 2a. CA high-school `kind` (data/usCaliforniaHighSchoolLessonIllustrations.ts)

There is **no renderer that reads this field**. `CaliforniaHighSchoolTextbookPage.tsx:88` and
`CaliforniaHighSchoolTextbookStudentPage.tsx:74` pass only `content`/`grade`/`title`/`topicId`
to `WorkedExampleIllustration`, which re-infers a kind from English text.

| declared `kind` | n | `renderer` field | renderer branch that reads it | what the student actually gets |
|---|---|---|---|---|
| `function-graph` | 7 | svg | **none** | `coordinate-function` ×5, `ratio-rate-percent` ×2 |
| `data-model` | 5 | svg | **none** | `coordinate-function` ×5 |
| `equation-flow` | 4 | svg-katex | **none** | `coordinate-function` ×4 |
| `quadratic-graph` | 4 | svg | **none** | `coordinate-function` ×4 |
| `interval-diagram` | 3 | svg | **none** | `ratio-rate-percent` ×1, `coordinate-function` ×2 |
| `coordinate-plane` | 2 | svg | **none** | `coordinate-function` ×2 |
| `geometry-proof` | 2 | svg | **none** | `coordinate-function` ×2 |
| `geometry-diagram` | 2 | svg | **none** | `ratio-rate-percent` ×1, `coordinate-function` ×1 |
| `circle-diagram` | 2 | svg | **none** | `coordinate-function` ×2 |
| `trig-graph` | 2 | svg | **none** | `coordinate-function` ×2 |
| `polynomial-graph` | 2 | svg-katex | **none** | `coordinate-function` ×2 |
| `decision-table` | 2 | svg | **none** | `coordinate-function` ×1, `ratio-rate-percent` ×1 |
| `probability-table` | 1 | svg | **none** | `coordinate-function` ×1 |
| `probability-tree` | 1 | svg | **none** | `coordinate-function` ×1 |
| `units-diagram` | 1 | svg-katex | **none** | `coordinate-function` ×1 |
| **total** | **40** | | **0/15 kinds honoured** | 35 `coordinate-function`, 5 `ratio-rate-percent` |

### 2b. Practice diagram kinds (types/index.ts `QuestionDiagram`) — healthy

| kind | renderer branch | CA usage |
|---|---|---|
| `coordinate-grid` | `CoordinateGridFigure` (QuestionFigure.tsx:479) | 0 |
| `plane-figure` | `PlaneFigureView` (:480) | 0 |
| `number-line` | `NumberLineView` (:481) | 0 |
| `solid-figure` | `SolidFigureView` (:482) | 0 |
| `ten-frame` | `TenFrameView` (:483) | **10** |

5/5 kinds have a renderer. Alt text is trilingual (`questionDiagramAltText`, lib/questionFigure.ts:1499)
and `language` is threaded from `PracticeQuestionCard.tsx:615`. Note: the `data-display` kind
referenced in project history lives on branch `fix/k5-data-display-diagrams` (PR #160) and is
**not present** on `codex/edulab-mais` — `QuestionDiagram` here has exactly the 5 kinds above.

### 2c. `WorkedExampleIllustration` internal kinds — all 11 have a scene

`algebra, coordinate-function, counting, data-probability, fraction, geometry,
measurement-money-time, modeling-review, place-value, ratio-rate-percent, spatial-vector-trig`
→ each mapped in `IllustrationScene` (WorkedExampleIllustration.tsx:961-973). No blank-render risk here.
The failure is *selection*, not coverage.

---

## 3. Coverage: orphans and gaps

### Orphans (figure defined, attached to nothing renderable)

| Orphan set | Count | Evidence |
|---|---|---|
| CA HS exact-layer SVGs (`worked-example-1.svg`, `worked-example-2.svg` × 20 chapters) | **40** | `exactLayerSrc` has 0 consumers in `components/`, `app/`, `lib/`, `tests/` |
| CA HS `concept.webp` on the student route | 20 | only rendered by the noindex review route; `CaliforniaHighSchoolTextbookStudentPage` is unmounted |
| `CaliforniaHighSchoolTextbookStudentPage` | 1 component | no `app/` import; `lib/californiaGradeAware.test.ts:69-70` asserts its absence |
| Practice figure specs with no live question | **0** | all 10 `questionId`s resolve |

### Gaps (visual referenced, no figure)

**Lessons — 25 of 44 CA lesson records name a representation they never show; 44 of 44 have zero figures.**

K–5 (12 of 29): `k-k-nbt-teen-numbers`, `p1-1-oa-add-subtract`, `p1-1-md-measure-data`,
`p2-2-oa-fluency-arrays`, `p2-2-md-measure-data-money-time`, `p3-3-oa-mult-div`,
`p3-3-nf-fraction-meaning`, `p3-3-md-time-data-area-perimeter`, `p4-4-nf-fraction-decimal`,
`p4-4-g-lines-shapes`, `p5-5-md-volume-data`, `p5-5-g-coordinate-shapes`
(all prefixed `us-ca-k-g5-tx-v1-`).

Middle school (13 of 15): `p6-6-rp-ratios`, `p6-6-ns-rational-numbers`, `p6-6-g-area-volume`,
`p6-6-sp-distributions`, `s1-7-rp-proportions`, `s1-7-ns-rational-operations`,
`s1-7-ee-linear-expressions`, `s1-7-g-scale-circles-angles`, `s1-7-sp-inference-probability`,
`s2-8-ns-real-numbers`, `s2-8-ee-exponents-linear-systems`, `s2-8-f-function-relationships`,
`s2-8-g-transformations-pythagorean-volume`
(all prefixed `us-ca-math-middle-school-textbooks-v2-`).

**Practice — 48 of 2802 live CA questions reference a visual with no `diagram`.**
By grade: K 3, P1 20, P2 1, P3 6, P4 6, P5 6, P6 1, S1 1, S3 2, S5 1, S6 1.
All ids are prefixed `us-ca-k5-knowledge-point-practice-v1-`. Highest-value clusters:

- `…-us-ca-math-k-k-nbt-teen-numbers-q09` — "A ten-frame shows 10 counters and 2 more counters"
- 18 fraction-area items: `…-p3-3-nf-fraction-meaning-q04/q08/q12`, `…-p4-4-nf-fraction-decimal-q03/q05/q06/q07/q10/q11`, `…-p5-5-nf-operations-q03/q05/q06/q07/q10/q11`
- 3 fraction-on-a-number-line items: `…-p3-3-nf-fraction-meaning-q01/q05/q09`
- 15 ten-frame take-away items across `p1-1-l1…l5` (`…-q04/q08/q12` in each)

Figure coverage rate: **10 / 2802 = 0.36 %** of live CA questions carry a diagram.

---

## 4. Existing audits — verbatim output

### `node scripts/audit-lesson-illustration-assets.mjs`

```
audit:lesson-illustrations PASS — 284 asset(s) across 5 live export(s) in 9 manifest(s); 4 withdrawn draft export(s) skipped.
```

### `npx tsx scripts/audit-math-diagram-inventory.ts` (CA-relevant lines + verdict)

```
audit:math-diagram-inventory
  lessonRouteCount: 490
  ccssLessonCount: 270
  ...
  practiceFigureCount: 27
  ...
  liveAssetReferenceCount: 299
  uniqueLiveAssetCount: 239
  publicSvgCount: 1553
  semanticAngleMarkCount: 16
  mathAngleContractCount: 16
  standaloneDiagramRouteCount: 4
  semanticSvgMissingViewBoxCount: 0

PASS: every live inventoried surface has a reachable owner and required source/viewBox contract; 4 ported non-live signature benches remain intentionally unassigned
```

### `buildPracticeFigureAuditReport()` (lib/practiceFigureAudit.ts) — CA-only gate

```
# Practice figure audit — us-ca-practice-figures-v1

- Checked: 10
- Passed: 10
- Failed: 0

| Question | Archetype | Grade | Standards | Issues |
| --- | --- | --- | --- | --- |
| us-ca-k5-knowledge-point-practice-v1-us-ca-math-k-k-cc-count-sequence-q01 | ten-frame | K | K.CC.A.3, K.CC.B.4, K.CC.B.5 | pass |
| us-ca-k5-knowledge-point-practice-v1-us-ca-math-k-k-cc-count-sequence-q09 | ten-frame | K | K.CC.A.3, K.CC.B.5 | pass |
| us-ca-k5-knowledge-point-practice-v1-us-ca-math-k-k-oa-compose-decompose-q02 | ten-frame | K | K.OA.A.1, K.OA.A.3 | pass |
| us-ca-k5-knowledge-point-practice-v1-us-ca-math-k-k-oa-compose-decompose-q04 | ten-frame | K | K.OA.A.1, K.OA.A.3 | pass |
| us-ca-k5-knowledge-point-practice-v1-us-ca-math-k-k-oa-compose-decompose-q10 | ten-frame | K | K.OA.A.1, K.OA.A.3 | pass |
| us-ca-k5-knowledge-point-practice-v1-us-ca-math-k-k-nbt-teen-numbers-q01 | ten-frame | K | K.NBT.A.1 | pass |
| us-ca-k5-knowledge-point-practice-v1-us-ca-math-k-k-nbt-teen-numbers-q05 | ten-frame | K | K.NBT.A.1 | pass |
| us-ca-k5-knowledge-point-practice-v1-us-ca-math-p1-1-h1-picture-join-stories-to-10-q01 | ten-frame | P1 | 1.OA.A.1, 1.OA.C.5, 1.OA.C.6 | pass |
| us-ca-k5-knowledge-point-practice-v1-us-ca-math-p1-1-h1-picture-join-stories-to-10-q02 | ten-frame | P1 | 1.OA.A.1, 1.OA.C.6 | pass |
| us-ca-k5-knowledge-point-practice-v1-us-ca-math-p1-1-h2-picture-story-addition-equations-q01 | ten-frame | P1 | 1.OA.A.1, 1.OA.D.7 | pass |
```

### What the audits check that I did not

- `audit-lesson-illustration-assets.mjs`: manifest→`public/` **existence** for all 9 `*LessonIllustrations.ts`
  manifests (284 assets), and correct use of the `*Drafts`/`*Withdrawal` retirement pattern.
- `audit-math-diagram-inventory.ts`: route/owner reachability for 490 lesson routes and 689 visualization
  labs, `viewBox` presence on semantic SVGs, the CCSS finite-button-state control protocol, unsafe
  `<button>` types, 3-D declaration vs. effective renderer, and minimum coverage baselines (a ratchet).
- `tests/e2e/math-diagram-boundary.spec.ts`: runtime **geometric overflow/clipping** of diagrams across
  language × theme × viewport, layout stability, and canvas paint boundaries. I did not run it (needs a
  built app and browsers).

### What I checked that they do not

- Whether the figure's **mathematics** matches its text (no audit does this outside `practiceFigureAudit`,
  which covers only the 10 ten-frames).
- Exact-layer SVG **coordinate reconstruction** (recovering each figure's axis mapping from the drawn
  axis lines and re-deriving every plotted point).
- **Pixel counting** of the raster K–5 concept illustration.
- **`kind` → rendered-kind alignment** — nothing anywhere compares the authored `kind` with what
  `WorkedExampleIllustration` infers.
- **Orphan direction**: `audit-lesson-illustration-assets.mjs` proves *manifest → asset*; it never asks
  whether an asset (or field, like `exactLayerSrc`) is referenced by any component.
- **Bilingual alt coverage** of illustration manifests and generated figures.
- **Coverage gaps**: lessons/questions whose text names a visual that does not exist.

---

## 5. Not verifiable without running the app

- Pixel content of the 20 CA HS `concept.webp` chapter backgrounds (declared decorative,
  `s09Decision: "human-cleared-no-readable-student-copy"`, but unverified here).
- Rendered appearance of `CoordinateFunctionScene` / `RatioRatePercentScene` at real scale — whether the
  `FocusBadge` `textLength` compression makes "2 = 64" legible or illegible, and whether the step tiles
  overlap on narrow viewports.
- `tests/e2e/math-diagram-boundary.spec.ts` results (needs a production build + Playwright browsers;
  project memory notes local runs need `PLAYWRIGHT_BROWSER_CHANNEL=""`).
- Dark-mode and zh/zhHans rendering of the ten-frame figures and their legends.
- Whether `/lesson/california-high-school-textbook/review` renders without error.
- Ten-frame wrap behaviour on a real narrow phone (the `basis-[13rem]` flex-wrap path).
