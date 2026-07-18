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
 * Benches intentionally NOT listed here have no CA K-12 home: conic sections and
 * coordinate-geometry benches (G-GPE / G-GMD), matrices & vectors (N-VM),
 * complex numbers (N-CN), radical/rational-equation benches (A-REI.A/C),
 * irrationals (8.NS — absent from the CA topic set), and the pure-calculus
 * benches (Derivative, Integral, Limit, Series) — none of those standard
 * families appear in any California topic in `visualizationLabCatalog`.
 * (OptimizationLab is the exception: it is tagged "Modeling" below, since
 * optimising a quantity is a modeling activity the CA Modeling chapters carry.)
 */
export const signatureLabCcssOverrides: Record<string, string[]> = {
  // --- Elementary number & operations -------------------------------------
  AddLab: ["1.OA.A.1"], //            addition on the number line → P1 OA
  NumberLab: ["1.NBT.B.2"], //        place value / base-ten blocks → P1 NBT
  MultiplesLab: ["4.OA.B.4"], //      skip-count multiples → P4 factors & patterns
  FactorLab: ["4.OA.B.4"], //         rectangle-array factors → P4 factors & patterns
  PrimeFactorizationLab: ["6.NS.B.4"], // factor tree → P6 ch02 (GCF/LCM)
  GreatestCommonFactorLab: ["6.NS.B.4"], // common-factor line → P6 ch02

  // --- Measurement & geometry (elementary) --------------------------------
  AreaLab: ["3.MD.C.7"], //           area meaning & rectangle formula → P3 MD
  RectangleLab: ["3.MD.C.7", "3.MD.D.8"], // area vs perimeter → P3 MD
  QuadrilateralLab: ["3.G.A.1"], //   classify quadrilaterals → P3 G categories
  AngleLab: ["4.G.A.1"], //           angle as two rays / turn → P4 lines & shapes
  TrapezoidLab: ["6.G.A.1"], //       trapezoid area → P6 ch04 (area of quads)
  ParallelogramLab: ["6.G.A.1"], //   parallelogram area/props → P6 ch04
  CubeLab: ["6.G.A.4"], //            cube nets, surface area → P6 ch04

  // --- Expressions & variables (grade 6) ----------------------------------
  VariableLab: ["6.EE.B.6"], //       variable as a number on a walk → P6 ch03
  ExpressionLab: ["6.EE.A.2"], //     two-colour expression walk → P6 ch03

  // --- Grade 8: functions & geometry --------------------------------------
  LineFunctionLab: ["8.F.B.4"], //    slope triangle, rate of change → S2 ch02
  TriangleLab: ["8.G.A.5"], //        triangle angle sum = 180 → S2 ch03/04
  CylinderLab: ["8.G.C.9"], //        cylinder volume → S2 ch03/04
  DistanceLab: ["8.G.B.8"], //        distance formula via Pythagoras → S2 ch03/04

  // --- High-school algebra & functions ------------------------------------
  QuadraticFunctionLab: ["F-IF.C.7"], //   vertex-form parabola graph → S3 ch02
  ExponentialFunctionLab: ["F-LE.A.1"], // constant-ratio growth → S3 ch03 / S5 ch02
  LogarithmLab: ["F-LE.A.4"], //           log as inverse of exponential → S3 ch03 / S5 ch02
  FactoringQuadraticsLab: ["A-SSE.B.3"], // factor a quadratic to reveal zeros → S4 ch04

  // --- Trigonometric functions (F-TF) → S5 ch03 ---------------------------
  SineFunctionLab: ["F-TF.B.5"],
  CosineFunctionLab: ["F-TF.B.5"],
  TangentFunctionLab: ["F-TF.B.5"],
  SecantFunctionLab: ["F-TF.B.5"],
  CosecantFunctionLab: ["F-TF.B.5"],
  CotangentFunctionLab: ["F-TF.B.5"],

  // --- Probability & statistics -------------------------------------------
  SetTheoryLab: ["S-CP.A.1"], //           events as subsets of a sample space → S4 ch05
  SamplingDistributionLab: ["S-IC.B.4"], // sampling distribution of a statistic → S5 ch05

  // --- Modeling (CCSS ★) → the three CA "Modeling" chapters ---------------
  // "Modeling" is a cross-cutting CCSS category, not a numbered content
  // standard, so no upstream bench carries it. These benches each embody a
  // phase of the modeling cycle (formulate → compute → interpret → validate).
  // normalizeCcss("Modeling") === "Modeling", which is exactly the lone
  // standard that us-ca-math-{s3-chapter-04, s6-chapter-01, s6-chapter-05}
  // carry, so tagging them "Modeling" attaches them to all three via the same
  // join (merged with each bench's existing content standards, not replacing).
  GraphStoryLab: ["Modeling"], //          formulate: real situation → graph
  BestFitLab: ["Modeling"], //             estimate/validate: fit a model to data
  FunctionLab: ["Modeling"], //            formulate: model with a function
  CompareFunctionsLab: ["Modeling"], //    interpret: choose the best-fitting model
  FormulaLab: ["Modeling"], //             formulate: build / rearrange a formula
  OptimizationLab: ["Modeling"] //         compute: optimise a quantity in a model
};
