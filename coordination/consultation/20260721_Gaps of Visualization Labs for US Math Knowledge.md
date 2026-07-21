# Gaps of Visualization Labs for US Math Knowledge (CCSS)

**Date:** 2026-07-21
**Platform:** MAIS-MVP — [www.mais.ac](https://www.mais.ac)
**Scope:** Coverage of CCSS Mathematics (K-8 standard-level + High School) by the current visualization-lab library.

---

## How this was computed (reproducible)

- **Denominator (all CCSS standards):** `data/ccss/grades-k2.ts`, `grades-35.ts`, `grades-68.ts`, `grade-hs.ts` — the canonical registry MAIS ships (`{ id, description }`). **229 K-8 standards + 148 HS standards.**
- **Numerator (lab coverage):** every `standardIds: [...]` entry in `data/visualizationLabs.ts` + `data/signatureLabCcssOverrides.ts`, plus all CCSS codes embedded across the **~180 signature labs** in `components/visualizations/`.
- **Gap = a canonical standard that appears in *zero* lab.** Each gap below was double-checked to confirm no lab or catalog file references it.
- HS codes required format normalization (canonical `F-IF.7` vs lab `HSF-IF.C.7`) before diffing.

> ⚠️ **Important caveat — "coverage" here means *association*, not *depth*.** A standard counts as "covered" if any lab lists it. A lab may list several loosely-related standards, so true **pedagogical** coverage (a *dedicated, conceptually-faithful* visualization per skill) is thinner than these percentages suggest. The table below captures **hard gaps** (zero association); a separate depth audit would surface **soft gaps** (associated but no dedicated lab). Titles are CCSS paraphrases for UI, not legal standard text.

---

## Executive summary

**Your observation is correct — the distribution is uneven — but the magnitude is smaller and more localized than it may look.** The lab library is **saturated at the bottom (K-5) and top (HS)** and has a **trough in the middle grades (6-8)**.

| Grade | Standards | Covered | Coverage | Gaps |
|---|---|---|---|---|
| K | 22 | 22 | **100%** | 0 |
| 1 | 21 | 21 | **100%** | 0 |
| 2 | 26 | 26 | **100%** | 0 |
| 3 | 25 | 25 | **100%** | 0 |
| 4 | 28 | 28 | **100%** | 0 |
| 5 | 26 | 26 | **100%** | 0 |
| **6** | 29 | 24 | **83%** | **5** |
| **7** | 24 | 18 | **75%** | **6** |
| **8** | 28 | 26 | **93%** | **2** |
| HS | 148 | ~148 | **~100%** (association) | 0 hard |
| **K-8 total** | **229** | **216** | **94%** | **13** |

**Takeaways:**
- **All 13 hard gaps are in middle school (Grades 6-8).** Grade 7 is the weakest band (75%).
- Gaps cluster in **three domains: Expressions & Equations (EE), The Number System (NS), and Grade-7 Statistics & Probability / Ratios (SP, RP).**
- **For the January elementary pilot (Grade 1), lab coverage is *not* a blocker — K-5 is 100%.** These gaps matter when you **scale into middle school.**

---

## The gap table — concepts with no visualization lab

*Grade 6-8 CCSS standards not covered by any current lab. "Nearest existing lab" shows why most of these are **extend-an-adjacent-lab** work, not build-from-scratch.*

| # | Standard | Grade · Domain | Concept (CCSS paraphrase) | Nearest existing lab | Suggested action |
|---|---|---|---|---|---|
| 1 | **6.EE.B.7** | G6 · Expressions & Equations | Solve equations of the form `x + p = q` and `px = q` | `EquationLab`, `TwoStepLab` | Add one-step equation mode (bar/balance model) |
| 2 | **6.EE.B.8** | G6 · Expressions & Equations | Write an inequality for a constraint; graph its solutions | `InequalityLab` | Add one-variable inequality → number-line solution graphing |
| 3 | **6.G.A.3** | G6 · Geometry | Draw polygons in the coordinate plane; find side lengths | `CoordinatePlaneDemo`, `DistanceLab` | Plot vertices → compute side lengths on the grid |
| 4 | **6.NS.B.2** | G6 · The Number System | Fluently divide multi-digit numbers (standard algorithm) | `LongDivisionLab` | Re-scope/tag `LongDivisionLab` to multi-digit fluency |
| 5 | **6.NS.B.3** | G6 · The Number System | Fluently add, subtract, multiply, divide decimals | `DecimalArithmeticLab` | Extend to all four decimal operations + place-value alignment |
| 6 | **7.EE.A.2** | G7 · Expressions & Equations | Rewrite an expression to show how quantities relate | `ExpressionLab`, `DistributiveLab` | Show equivalent forms revealing structure (e.g., `1.05x` = "5% more") |
| 7 | **7.EE.B.3** | G7 · Expressions & Equations | Solve multistep problems with rational numbers | `TwoStepLab` | Extend to multistep with rationals |
| 8 | **7.NS.A.3** | G7 · The Number System | Solve real-world problems with rational-number operations | `RationalNumbersLab`, `SignedNumbersLab` | Add applied word-problem visual layer |
| 9 | **7.RP.A.1** | G7 · Ratios & Proportional Rel. | Compute unit rates, including **ratios of fractions** | `RatioLab`, `ProportionalLab` | Add complex unit-rate mode (fraction ÷ fraction) |
| 10 | **7.SP.A.2** | G7 · Statistics & Probability | Use data from a sample to draw inferences | `SamplingLab`, `SamplingDistributionLab` | Add sample→inference simulation |
| 11 | **7.SP.C.7** | G7 · Statistics & Probability | Develop a probability model and use it | `ProbabilityLab`, `TreeDiagramLab` | Add model-building (uniform vs empirical) mode |
| 12 | **8.EE.A.4** | G8 · Expressions & Equations | Perform **operations** with numbers in scientific notation | `ScientificNotationLab` | Extend from representation → arithmetic in sci. notation |
| 13 | **8.F.A.3** | G8 · Functions | Know that `y = mx + b` defines a **linear** function | `LineFunctionLab`, `CompareFunctionsLab` | Add "is this linear?" classifier view (linear vs non-linear) |

---

## Pattern analysis — where the unevenness lives

**By domain (the 13 gaps):**

| Domain | Gaps | Standards |
|---|---|---|
| **Expressions & Equations (EE)** | 5 | 6.EE.B.7, 6.EE.B.8, 7.EE.A.2, 7.EE.B.3, 8.EE.A.4 |
| **The Number System (NS)** | 3 | 6.NS.B.2, 6.NS.B.3, 7.NS.A.3 |
| **Statistics & Probability (SP)** | 2 | 7.SP.A.2, 7.SP.C.7 |
| **Geometry (G)** | 1 | 6.G.A.3 |
| **Ratios & Proportional (RP)** | 1 | 7.RP.A.1 |
| **Functions (F)** | 1 | 8.F.A.3 |

**Three structural observations:**
1. **The trough is middle-school pre-algebra.** EE (solving equations/inequalities, rewriting expressions) and NS (fluency with rational numbers/decimals) — the algebra-readiness bridge — is the softest zone. These are the concepts most students struggle with, so the gap is pedagogically significant when you scale to G6-8.
2. **"Fluency/procedure" standards are under-represented** (6.NS.B.2/B.3, 8.EE.A.4). The library is strong on *conceptual* labs but thinner on *procedural fluency* visualizers — expected, since fluency is harder to make visual.
3. **Most gaps are extend-not-build.** Every one of the 13 has an adjacent existing lab. Several (e.g., #4 `LongDivisionLab`, #5 `DecimalArithmeticLab`, #12 `ScientificNotationLab`) may be **tagging gaps** — the concept is likely visualized but the specific standard code isn't in the lab's `standardIds`. Verify before building new.

---

## Recommended priority (if/when you scale to middle school)

Since the pilot is elementary (fully covered), treat these as **post-pilot / scaling** work. Within them:

- **First — quick wins (tagging/extend, ~days each):** #4, #5, #12 — likely already visualized; confirm and extend `standardIds`.
- **Second — high student-struggle, high visual payoff:** #2 (inequalities on a number line), #9 (unit rates with fractions), #1 (one-step equations via balance model), #13 (linear vs non-linear).
- **Third — applied/statistical (more design work):** #10, #11 (sampling & probability models), #7, #8 (multistep rational-number applications).

---

## Caveats & recommended next step

- **Hard gaps (this table) are a floor, not a ceiling.** A **depth audit** — scoring each of the 216 "covered" standards for whether it has a *dedicated, conceptually-faithful* lab (not just an association) — would reveal additional **soft gaps**, likely also concentrated in G6-8.
- **HS shows ~100% association coverage**, consistent with the library's heavy weighting toward advanced topics (calculus, trig, conics, complex plane, matrices, vectors). A standard-level HS *depth* audit is still worthwhile before opening HS content.
- **This is CCSS coverage.** Per the earlier consultation, **Texas (TEKS)** and **Colorado (CAS)** are separate frameworks — a TEKS/CAS coverage pass would be a distinct analysis.

---

*Prepared by Claude (Claude Code, Opus 4.8) on 2026-07-21. Computed from `data/ccss/*` (canonical standards) vs `data/visualizationLabs.ts` + `data/signatureLabCcssOverrides.ts` + `components/visualizations/` (lab coverage). Every gap verified to have zero lab references.*
