/**
 * MAIS-side supplemental CCSS tags for Claude Math Visual benches.
 *
 * Many benches ship in the upstream library with no `ccss` array in `labs.json`
 * (they predate the tagging pass, or were authored as concept demos rather than
 * standard-aligned lessons). `build-signature-lab-candidates.ts` can only join a
 * bench to a California topic on a shared CCSS id, so an untagged bench is
 * unreachable — a metadata gap, not a coverage gap, exactly as that script's own
 * note warns.
 *
 * This file closes the gap WITHOUT editing the upstream library: the candidate
 * script merges these codes into the bench metadata before the join. Each entry
 * is a standard the bench genuinely teaches AND that a CA catalog topic actually
 * carries (verified against each topic's `standardIds`), so the join stays
 * honest — the bench lands on a topic whose standard it really addresses.
 *
 * Benches intentionally NOT listed here have no CA K-12 home. That set shrank on
 * 2026-07-25: `californiaChapterSupplementalStandards` in `data/visualizationLabs.ts`
 * gave G-GPE, G-GMD, N-VM, N-CN, N-RN, A-REI and 8.NS a chapter to live on, so the
 * conic, coordinate-geometry, matrix, vector, complex-plane, rational-exponent and
 * irrational benches are now reachable. What remains homeless is the pure-calculus
 * set (Derivative, Integral, Limit, Series): CCSS-M has no calculus standards, so
 * there is nothing to join on.
 * (OptimizationLab is the exception: it is tagged "Modeling" below, since
 * optimising a quantity is a modeling activity the CA Modeling chapters carry.)
 */
export const signatureLabCcssOverrides: Record<string, string[]> = {
  // --- Elementary number & operations -------------------------------------
  AddLab: ["1.OA.A.1"], //            addition on the number line → P1 OA
  NumberLab: ["1.NBT.B.2"], //        place value / base-ten blocks → P1 NBT
  // 2.NBT.A.2 added 2026-07-25: the skip-count number line IS "count within
  // 1000; skip-count by 5s, 10s and 100s" — G2's own standard, unclaimed until now.
  MultiplesLab: ["2.NBT.A.2", "4.OA.B.4"], // skip-count multiples → P2 NBT, P4 factors & patterns
  FactorLab: ["4.OA.B.4"], //         rectangle-array factors → P4 factors & patterns
  PrimeFactorizationLab: ["6.NS.B.4"], // factor tree → P6 ch02 (GCF/LCM)
  GreatestCommonFactorLab: ["6.NS.B.4"], // common-factor line → P6 ch02

  // --- Grade 3: the band the 2026-07-25 depth audit found weakest -----------
  // Every tag below is a standard the bench's own lesson already teaches; it was
  // simply never claimed, so Grade 3 read as 40% paper-only. What is NOT here is
  // as deliberate: 3.OA.A.3 (one-step x/÷ word problems), 3.OA.C.7 (fluency from
  // memory) and 3.NBT.A.3 (one-digit x multiples of 10) have no bench in the
  // library at all — they are build work, and tagging a near-miss would put the
  // paper coverage straight back.
  DivisionLab: ["3.OA.A.4"], //        the unknown factor, as the missing side of the array → P3 OA
  RegroupingSubtractionLab: ["3.NBT.A.2"], // break-a-ten subtraction within 1000 → P3 NBT
  PlaceValueStrategiesLab: ["3.NBT.A.2"], // place-value addition within 1000 → P3 NBT
  RationalNumbersLab: ["3.NF.A.2"], // "cut the unit into q, step p" — the only fraction-on-a-number-line bench → P3 NF
  EquivalentFractionsLab: ["3.NF.A.3"], // the name lattice: equivalence and comparison → P3 NF
  FractionLinePlotLab: ["3.MD.B.4"], // line plot on a halves/quarters/eighths scale → P3 MD
  LinePlotLab: ["3.MD.B.4"], //        measure-then-mark: the data-generating half of the same standard → P3 MD

  // --- Measurement & geometry (elementary) --------------------------------
  // 3.MD.C.5/.C.6 added 2026-07-25: AreaLab's centrepiece is "area IS a count of
  // unit squares" and its interior literally tiles with 1x1 squares — that is
  // C.5 (area as an attribute, the unit square) and C.6 (measure by counting)
  // before it is C.7 (the formula). Grade 3's own area standards, unowned until now.
  AreaLab: ["3.MD.C.5", "3.MD.C.6", "3.MD.C.7"], // area meaning & rectangle formula → P3 MD
  // 4.MD.A.3 added 2026-07-25: "apply the area and perimeter formulas for
  // rectangles" is this bench's entire subject, one grade above where it sat.
  RectangleLab: ["3.MD.C.6", "3.MD.C.7", "3.MD.D.8", "4.MD.A.3"], // area vs perimeter, tiles inside → P3/P4 MD
  // 5.G.B.3/.B.4 added 2026-07-25: the "quadrilateral family" step IS the shape
  // hierarchy — attributes of a category belonging to all its subcategories.
  QuadrilateralLab: ["3.G.A.1", "5.G.B.3", "5.G.B.4"], // classify quadrilaterals → P3 G categories, P5 G
  AngleLab: ["4.G.A.1"], //           angle as two rays / turn → P4 lines & shapes
  TrapezoidLab: ["6.G.A.1"], //       trapezoid area → P6 ch04 (area of quads)
  // G-CO.3/.11 added 2026-07-25: "the half-turn — one symmetry explains it all"
  // IS a rotation carrying the figure onto itself (G-CO.3), and the steps that
  // establish opposite sides equal / opposite angles equal are G-CO.11's own
  // theorem list. The bench proves them; only the area tag was ever claimed.
  ParallelogramLab: ["6.G.A.1", "G-CO.C.3", "G-CO.C.11"], // parallelogram area/props → P6 ch04, S4 ch01
  CubeLab: ["6.G.A.4"], //            cube nets, surface area → P6 ch04

  // --- Expressions & variables (grade 6) ----------------------------------
  VariableLab: ["6.EE.B.6"], //       variable as a number on a walk → P6 ch03
  ExpressionLab: ["6.EE.A.2"], //     two-colour expression walk → P6 ch03

  // --- Grade 8: functions & geometry --------------------------------------
  // 8.F.A.3 added 2026-07-25: the bench IS y = mx + b with m and b as dials —
  // "interpret y = mx + b as defining a linear function" is its first two steps.
  LineFunctionLab: ["8.F.A.3", "8.F.B.4"], // slope triangle, rate of change → S2 ch02
  // G-CO.10 added 2026-07-25: "the angle-sum theorem" step is the first theorem
  // in G-CO.10's own list (interior angles of a triangle sum to 180°).
  TriangleLab: ["8.G.A.5", "G-CO.C.10"], // triangle angle sum = 180 → S2 ch03/04, S4 ch01
  CylinderLab: ["8.G.C.9"], //        cylinder volume → S2 ch03/04
  DistanceLab: ["8.G.B.8"], //        distance formula via Pythagoras → S2 ch03/04

  // --- High-school algebra & functions ------------------------------------
  QuadraticFunctionLab: ["F-IF.C.7"], //   vertex-form parabola graph → S3 ch02
  // F-LE.2/.5 added 2026-07-25: steps "a — the initial value", "b — growth or
  // decay" and "Growth & decay as a percent" are parameter interpretation
  // (F-LE.5); the calibration challenge has the student build a·b^x + k to match
  // a given curve, which is F-LE.2's "construct ... given a graph".
  ExponentialFunctionLab: ["F-LE.A.1", "F-LE.A.2", "F-LE.B.5"], // constant-ratio growth → S3 ch03 / S5 ch02
  LogarithmLab: ["F-LE.A.4"], //           log as inverse of exponential → S3 ch03 / S5 ch02
  FactoringQuadraticsLab: ["A-SSE.B.3"], // factor a quadratic to reveal zeros → S4 ch04

  // --- Coordinate geometry / conic sections (G-GPE) → S3 ch04 --------------
  // Untagged upstream, but each bench's own description names the standard's
  // exact object: centre-radius form, focus-and-directrix, standard-form
  // ellipse/hyperbola. S3 ch04 "Coordinate Geometry Methods" is declared G-GPE.
  CircleLab: ["G-GPE.A.1"], //             (x-h)² + (y-k)² = r² from the distance formula
  ParabolaLab: ["G-GPE.A.2"], //           parabola from focus and directrix
  EllipseLab: ["G-GPE.A.3"], //            standard-form ellipse
  HyperbolaLab: ["G-GPE.A.3"], //          standard-form hyperbola

  // --- Trigonometric functions (F-TF) → S5 ch03 ---------------------------
  SineFunctionLab: ["F-TF.B.5"],
  CosineFunctionLab: ["F-TF.B.5"],
  TangentFunctionLab: ["F-TF.B.5"],
  SecantFunctionLab: ["F-TF.B.5"],
  CosecantFunctionLab: ["F-TF.B.5"],
  CotangentFunctionLab: ["F-TF.B.5"],

  // --- Probability & statistics -------------------------------------------
  // S-CP.7 added 2026-07-25: the "Counting: inclusion-exclusion" step is the
  // Addition Rule, |A ∪ B| = |A| + |B| − |A ∩ B|. The bench states it over
  // counts; on the uniform sample space it is tagged for (S-CP.A.1) that is the
  // probability rule, and it sits on the Conditional Probability chapter.
  SetTheoryLab: ["S-CP.A.1", "S-CP.B.7"], // events as subsets of a sample space → S4 ch05
  SamplingDistributionLab: ["S-IC.B.4"], // sampling distribution of a statistic → S5 ch05

  // --- 2026-07-25 tier-D sweep: benches that taught a standard but never -----
  //     claimed it. Same rule as everywhere in this file — the tag goes on only
  //     when the bench's own lesson does the thing the standard asks.
  // (MultiplesLab, RectangleLab, QuadrilateralLab and BestFitLab also gained a
  // tag in this sweep — their entries live above/below, since a duplicate key
  // here would be silently overwritten by the later one.)
  DecimalLab: ["4.NF.C.7"], //             step "Comparing — don't count digits", tenths vs hundredths
  LongDivisionLab: ["5.NBT.B.6", "6.NS.B.2"], // the standard algorithm, divide-multiply-subtract-bring down
  DecimalArithmeticLab: ["6.NS.B.3"], //   column alignment: the standard algorithm for decimals
  EquationLab: ["6.EE.B.7", "A-REI.A.1"], // x + p = q and px = q by undo-steps; each step justified on the balance
  InequalityLab: ["6.EE.B.8"], //          "a whole set of answers" + the ray on the number line
  SystemsOfEquationsLab: ["A-REI.D.10"], // "one linear equation has infinitely many solutions — the entire line"
  CovariationLab: ["A-CED.A.2"], //        plant / candle / savings jar → table, graph, equation windows
  TransformationsLab: ["G-CO.A.2", "G-CO.B.5"], // transformations as coordinate rules; "moves compose"
  ConditionalLab: ["S-CP.B.6"], //         P(A|B) as the fraction of B's outcomes that are also A
  ExpectedValueLab: ["S-MD.B.5"], //       payoffs x probabilities, and tuning a game to fair
  VectorLab: ["N-VM.B.4", "N-VM.B.5"], //  "tip to tail" is vector addition; "scaling and undoing" is c·v and −v
  ComplexPlaneLab: ["N-CN.C.9"], //        the closed shop: with a + bi admitted, every quadratic has its roots

  // --- Benches MAIS authored to close audited gaps (2026-07-25) ------------
  // Not ports: written for standards the depth audit found had no bench at all.
  // Each ships with its own mutation-tested audit beside it.
  ComplexArithmeticLab: ["N-CN.A.3", "N-CN.B.4", "N-CN.B.5", "N-CN.B.6"], // modulus, conjugate, quotient, polar, distance & midpoint → S6 ch02
  GeometricModelingLab: ["G-MG.A.1", "G-MG.A.2", "G-MG.A.3"], // model an object as a solid, density, and a least-metal design → S4 ch03
  CoordinateMethodsLab: ["G-GPE.B.6", "G-GPE.B.7"], // partition a directed segment in a ratio; perimeter and area from coordinates → S3 ch04
  ClosureLab: ["N-RN.B.3"], //             rational + irrational, and the closure argument that forces it → S5 ch02
  EliminationLab: ["A-REI.C.5"], //        the solution is invariant under E₂ → E₂ + k·E₁ → S3 ch01

  // --- Modeling (CCSS ★) → the three CA "Modeling" chapters ---------------
  // "Modeling" is a cross-cutting CCSS category, not a numbered content
  // standard, so no upstream bench carries it. These benches each embody a
  // phase of the modeling cycle (formulate → compute → interpret → validate).
  // normalizeCcss("Modeling") === "Modeling", which is exactly the lone
  // standard that us-ca-math-{s3-chapter-04, s6-chapter-01, s6-chapter-05}
  // carry, so tagging them "Modeling" attaches them to all three via the same
  // join (merged with each bench's existing content standards, not replacing).
  GraphStoryLab: ["Modeling"], //          formulate: real situation → graph
  // S-ID.C.7 added 2026-07-25 (kept on this single entry — a second BestFitLab
  // key would silently overwrite this one): the "reading the model" step is the
  // slope and intercept of the fitted line, read in the data's own terms.
  BestFitLab: ["Modeling", "S-ID.C.7"], //  estimate/validate: fit a model to data
  FunctionLab: ["Modeling"], //            formulate: model with a function
  CompareFunctionsLab: ["Modeling"], //    interpret: choose the best-fitting model
  FormulaLab: ["Modeling"], //             formulate: build / rearrange a formula
  OptimizationLab: ["Modeling"] //         compute: optimise a quantity in a model
};
