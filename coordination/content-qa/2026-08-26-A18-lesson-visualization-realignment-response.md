# A18 Response — Lesson Visualization Realignment curriculum-fit questions

- Date: 2026-08-26
- Answers: Claude (Opus 5), from reading the shipped template models rather than the lab titles
- Answering: `coordination/content-qa/2026-07-10-A18-lesson-visualization-realignment-review.md`, open since 2026-07-10
- Branch carrying the related fixes: `claude/hk-viz-defect-fixes`

The 2026-07-10 review asked four curriculum-fit questions and nothing answered
them. This record answers all four from what each template actually computes,
recommends an action for each, and marks which need a curriculum owner's
signature rather than an engineer's.

**Method.** For each topic I resolved the primary lab through
`getPrimaryVisualizationLabForTopic`, then read the template's state function in
`components/visualizations/configuredVisualizationLabModel.ts` and its render
branch in `ConfiguredVisualizationLab.tsx`. Template names are unreliable on
their own — `statistics-distribution` computes no statistics.

---

## 1. `functions` (S4) → `function-graph` · **Acceptable, narrow**

**What renders.** `y = ax² + c`. There is no linear term, so the axis of
symmetry is permanently the y-axis and the vertex never moves sideways
(`ConfiguredVisualizationLab.tsx`, `graphMode` is forced to 0 for this template).

**Fit.** The S4 objective is "Model input-output rules and connect them to
graphs." A quadratic is a legitimate vehicle for input→output and the
vertical-line test, so the mapping is not wrong — it is narrower than the lesson
implies.

**Action taken.** Lesson copy now says the model is `y = ax² + c` and that the
axis of symmetry stays on the y-axis, instead of promising a general function
comparer. **No mapping change recommended.**

## 2. `p6-speed` → `array-area` · **Acceptable as a rate model, not as a graph**

**What renders.** A rows × columns grid with `total = rows × columns`.

**Fit.** `distance = speed × time` is the same product structure, so the array is
a defensible model of a rate — one side is time, the other distance per unit
time, and the total is distance travelled. What it is *not* is a distance-time
graph, which is what the lesson previously promised.

**Action taken.** Lesson copy now reads the array as distance per unit time.
**No mapping change recommended** — none of the 18 templates plots a
distance-time graph, so switching would trade one mismatch for another. The real
fix is a speed bench (`s = d/t`, km/h ↔ m/s), item 3 on the new-bench list in
*Claude's Audit of Hong Kong Visualization Labs*.

## 3. `p6-percentages` → `fraction-bar`, analytics source `geometry` · **Template right, analytics label wrong — and not an HK problem**

**What renders.** A bar cut into `denominator` equal parts with `numerator`
shaded, plus an equivalent fraction. For percentages this is the correct model:
percent is part-of-whole.

**Fit.** The mapping is right. The reviewer's concern is the *analytics source*,
and that is a template-level mapping (`fraction-bar` → `geometry`) shared by
every fraction-bar topic on every track, not a per-topic HK decision.

**Action.** **No HK change.** Recommend a separate ticket to re-categorise
`fraction-bar` analytics away from `geometry`, owned by whoever owns the
analytics taxonomy, since it moves data for CA, AR, FL and Mainland too.

## 4. `statistics-s6` → `statistics-distribution` · **Weakest of the four; needs a curriculum decision**

**What renders.** Two numbers: a clamped integer `mean` and a `spread`
(`comparison / 2`, clamped to 0.5–4.5), drawn as a centre marker and a band.
There is **no data set, no variance, no standard deviation, no quartiles and no
z-score** anywhere in the template.

**Fit.** The topic is "normal distribution, sampling, and data summaries". The
model can carry *centre* and *spread* as ideas. It cannot show the normal
distribution, cannot show sampling, and cannot compute a standard deviation.
The previous lesson copy promised a z-score, which never existed.

**Action taken.** Lesson copy now states outright that the panel shows centre
and spread only, holds no data set, and that standard deviation and sampling
come from the lesson rather than the panel.

**Owner decision required.** Either (a) accept the narrowed scope with the
current copy, or (b) commission a distribution bench. `NormalDistributionLab`
already exists in the signature library with a mutation-tested audit and is the
natural answer — but assigning it makes this topic's lab English-only, which is
the open Traditional-Chinese question in the audit's §7 Track B. **This question
cannot be closed without that decision.**

---

## Correction to an earlier claim

*Claude's Audit of Hong Kong Visualization Labs* (2026-08-26) stated that
`statistics-s6` renders `calculus-rate-area`. **That was wrong.** It renders
`statistics-distribution`, as this review's table said all along.

The error came from an enumeration script that built a `Map` from
`visualizationLabCatalog` keyed on `topicId` without filtering
`primaryForTopic`. All five CAPSTONE labs reuse a Hong Kong topic id, and they
appear later in the catalogue, so `capstone-senior-function-calculus-stats-bridge`
(`calculus-rate-area`) silently overwrote the real HK entry. The product is
correct — capstone labs carry `primaryForTopic: false` — the measurement was not.

`components/visualizations/visualizationTopicOwnership.test.ts` now pins that
invariant: a capstone lab may share a topic id but may never become a topic's
primary. Verified by mutation — flipping the five `primaryForTopic: false` flags
to `true` fails five tests.

## Status

| Question | Verdict | Mapping change | Still needs an owner |
| --- | --- | --- | --- |
| `functions` | Acceptable, narrow | No | No |
| `p6-speed` | Acceptable as a rate model | No | No — needs a new bench, tracked separately |
| `p6-percentages` | Template right, analytics label wrong | No | Yes, but for the analytics taxonomy, not HK curriculum |
| `statistics-s6` | Weakest; copy now states the limit | No | **Yes** — tied to the Traditional-Chinese decision |
