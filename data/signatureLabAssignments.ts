/**
 * Curated mapping from a MAIS topic/lab id to one or more "signature labs" —
 * canvas benches ported from the Claude Math Visual library.
 *
 * A topic listed here renders its signature lab (the `primary`) instead of the
 * shared `ConfiguredVisualizationLab` template. A topic absent here keeps the
 * template renderer, so coverage is explicit and revertible per line.
 *
 * ## Fan-out mapping (owner's chosen strategy)
 *
 * One MAIS topic hosts MANY benches. The two libraries carve up mathematics at
 * different grain (MAIS: one lab per topic; Claude Math Visual: one bench per
 * concept), so a CCSS-standard join returns several benches for most topics.
 * Rather than discard the extras, every bench that carries a topic's standard is
 * attached: one is `primary` (it renders and anchors the topic); the rest are
 * `related` (offered to the student). This is how all reachable benches become
 * embedded even though there are far fewer CA topics than benches.
 *
 * Generated from `scripts/build-signature-lab-candidates.ts` (a CCSS join,
 * enriched by `data/signatureLabCcssOverrides.ts`). Phase-0 topics and the two
 * F-LE topics keep hand-written primaries/rationales; every already-rendering
 * primary is pinned so coverage only ever grows. `related` only names ported
 * benches. Do not hand-edit; re-run the generator.
 */

/** Every ported bench in `components/visualizations/signature/`. */
export const signatureLabIds = ["AbsoluteValueLab", "AddLab", "AngleLab", "AngleTurnLab", "ArcsinLab", "AreaLab", "ArrangementsLab", "AssociativeAdditionLab", "AssociativeMultiplicationLab", "BestFitLab", "BoxPlotLab", "CircleLab", "CircleTheoremsLab", "ClosureLab", "CommutativeLab", "CompareFunctionsLab", "ComparingLab", "CompassLab", "ComplexArithmeticLab", "ComplexPlaneLab", "ComposingShapesLab", "CompositionLab", "ConditionalLab", "ConeLab", "CongruenceLab", "CoordinateMethodsLab", "CorrelationLab", "CosecantFunctionLab", "CosineFunctionLab", "CotangentFunctionLab", "CountingLab", "CovariationLab", "CrossSectionLab", "CubeLab", "CylinderLab", "DataLab", "DecimalArithmeticLab", "DecimalLab", "DerivativeLab", "DilationsLab", "DistanceLab", "DistributiveLab", "DivisionLab", "EllipseLab", "EqualAreasLab", "EqualSharesLab", "EqualSignLab", "EliminationLab", "EquationLab", "EquivalentFractionsLab", "ExpectedValueLab", "ExponentRulesLab", "ExponentialFunctionLab", "ExpressionLab", "ExtraneousLab", "FactorLab", "FactoringQuadraticsLab", "FormulaLab", "FractionAdditionLab", "FractionAsDivisionLab", "FractionDivisionLab", "FractionLab", "FractionLinePlotLab", "FractionMultiplicationLab", "FractionTimesWholeLab", "FunctionLab", "GeometricModelingLab", "GramsAndLitersLab", "GraphStoryLab", "GraphsLab", "GreatestCommonFactorLab", "HistogramLab", "HundredChartLab", "HyperbolaLab", "InequalityLab", "IntegerLab", "IntegralLab", "IrrationalLab", "LCMLab", "LengthComparisonLab", "LikeTermsLab", "LimitLab", "LineFunctionLab", "LineParabolaLab", "LinePlotLab", "LinesRaysSegmentsLab", "LogarithmLab", "LongDivisionLab", "LurkingVariableLab", "MatrixLab", "MeanLab", "MeasurementLab", "MedianLab", "ModeLab", "MoneyLab", "MultiDigitMultiplicationLab", "MultiplesLab", "MultiplicationLab", "MultiplicativeComparisonLab", "NormalDistributionLab", "NumberBondLab", "NumberLab", "OddEvenLab", "OperationsLab", "OptimizationLab", "ParabolaLab", "ParallelogramLab", "PatternsLab", "PercentChangeLab", "PercentageLab", "PerpSlopeLab", "PiLab", "PiecewiseLab", "PlaceJumpLab", "PlaceValueStrategiesLab", "PointLab", "PolynomialArithmeticLab", "PolynomialFunctionLab", "PositionLab", "PowersOfTenLab", "PrimeFactorizationLab", "PrimeNumbersLab", "ProbabilityLab", "ProofChainLab", "ProportionalLab", "PyramidLab", "PythagorasLab", "PythagoreanIdentityLab", "QuadraticEquationLab", "QuadraticFunctionLab", "QuadraticPolynomialLab", "QuadrilateralLab", "RatioLab", "RationalExponentLab", "RationalFunctionLab", "RationalNumbersLab", "RectangleLab", "RectangularPrismLab", "RegroupingSubtractionLab", "RemainderTheoremLab", "RevolutionLab", "RootsLab", "RoundingLab", "SamplingDistributionLab", "SamplingLab", "ScaleDrawingLab", "ScalingLab", "ScatterPlotLab", "ScientificNotationLab", "SecantFunctionLab", "SequencesLab", "SeriesLab", "SetTheoryLab", "ShapesLab", "SignedAdditionLab", "SignedNumbersLab", "SineFunctionLab", "SortLab", "SphereLab", "StandardDeviationLab", "StatisticalQuestionLab", "StoryProblemLab", "SubstitutionLab", "SubtractionLab", "SymmetryLab", "SystemsOfEquationsLab", "TableLab", "TangentFunctionLab", "TeenNumbersLab", "TimeLab", "TransformationsLab", "TranslateLab", "TransversalLab", "TrapezoidLab", "TreeDiagramLab", "TriangleBuildLab", "TriangleLab", "TriangleSolveLab", "TrigRatioLab", "TwoDigitNumberLab", "TwoDistributionsLab", "TwoStepLab", "TwoVariableInequalityLab", "UndoLab", "UnitCircleLab", "UnitConversionLab", "UnitFractionDivisionLab", "UnlikeDenominatorsLab", "VariableLab", "VarianceLab", "VectorLab", "VolumeLab"] as const;
export type SignatureLabId = (typeof signatureLabIds)[number];

export type SignatureLabAssignment = {
  /** The bench that renders for this topic. */
  primary: SignatureLabId;
  /** Assignment-local verified CCSS overlap when the port's older header omits the newer grade-band application. */
  primaryCoreStandardIds?: readonly string[];
  /** Further benches matching this topic's standards, shown as "related labs". Ported-only. */
  related?: SignatureLabId[];
  /** Why this primary was chosen. Required — the curation audit trail. */
  rationale: string;
};

/**
 * Compact client-safe projection of the CCSS lessons actually assigned to each
 * California topic. `visualizationLabs.ts` is imported by a client surface, so
 * it must not pull the 270-lesson registry and read-aloud narrations merely to
 * render standard chips. The contract test compares every entry with
 * `ccssLessonMetasForTopic`; drift fails CI instead of reaching learners.
 */
export const californiaAssignedCoreStandardsByTopic: Readonly<Record<string, readonly string[]>> = {
  "us-ca-math-k-k-cc-count-sequence": ["K.CC.A.1","K.CC.A.2","K.CC.B.4","K.CC.B.5","K.CC.A.3"],
  "us-ca-math-k-k-cc-cardinality-compare": ["K.CC.B.4","K.CC.B.5","K.CC.A.3","K.CC.C.6","K.CC.C.7"],
  "us-ca-math-k-k-oa-compose-decompose": ["K.OA.A.1","K.OA.A.2","K.OA.A.3","K.OA.A.4","K.OA.A.5"],
  "us-ca-math-k-k-nbt-teen-numbers": ["K.NBT.A.1"],
  "us-ca-math-k-k-md-attributes-data": ["K.MD.A.1","K.MD.A.2","K.MD.B.3"],
  "us-ca-math-k-k-g-shapes-position": ["K.G.A.1","K.G.A.2","K.G.A.3","K.G.B.4","K.G.B.5","K.G.B.6"],
  "us-ca-math-p1-1-oa-add-subtract": ["1.OA.A.1","1.OA.A.2","1.OA.B.4","1.OA.C.5","1.OA.C.6","1.OA.B.3","1.OA.D.7","1.OA.D.8"],
  "us-ca-math-p1-1-nbt-place-value": ["1.NBT.A.1","1.NBT.B.2","1.NBT.C.5","1.NBT.B.3","1.NBT.C.4","1.NBT.C.6"],
  "us-ca-math-p1-1-md-measure-data": ["1.MD.A.1","1.MD.A.2","1.MD.B.3","1.MD.C.4"],
  "us-ca-math-p1-1-g-shape-reasoning": ["1.G.A.1","1.G.A.2","1.G.A.3"],
  "us-ca-math-p2-2-oa-fluency-arrays": ["2.OA.A.1","2.OA.B.2","2.OA.C.3","2.OA.C.4"],
  "us-ca-math-p2-2-nbt-three-digit-place-value": ["2.NBT.A.1","2.NBT.A.3","2.NBT.A.2","2.NBT.A.4","2.NBT.B.5","2.NBT.B.6","2.NBT.B.7","2.NBT.B.9","2.NBT.B.8"],
  "us-ca-math-p2-2-md-measure-data-money-time": ["2.MD.A.1","2.MD.A.2","2.MD.A.3","2.MD.A.4","2.MD.B.5","2.MD.B.6","2.MD.C.7","2.MD.C.8","2.MD.D.9","2.MD.D.10"],
  "us-ca-math-p2-2-g-partition-shapes": ["2.G.A.1","2.G.A.2","2.G.A.3"],
  "us-ca-math-p3-3-oa-mult-div": ["3.OA.A.2","3.OA.B.6","3.OA.A.3","3.OA.A.4","3.OA.B.5","3.OA.C.7","3.OA.D.8","3.OA.D.9","3.MD.C.7","3.OA.A.1"],
  "us-ca-math-p3-3-nbt-arithmetic": ["3.NBT.A.1","3.NBT.A.2","3.NBT.A.3"],
  "us-ca-math-p3-3-nf-fraction-meaning": ["3.NF.A.1","3.NF.A.2","3.NF.A.3"],
  "us-ca-math-p3-3-md-time-data-area-perimeter": ["3.MD.A.1","3.MD.A.2","3.MD.B.3","3.MD.B.4","3.MD.C.5","3.MD.C.6","3.MD.C.7","3.OA.A.1","3.MD.D.8"],
  "us-ca-math-p3-3-g-categories": ["3.G.A.1","3.G.A.2"],
  "us-ca-math-p4-4-oa-factors-patterns": ["4.OA.A.1","4.OA.A.2","4.OA.A.3","4.OA.B.4","4.OA.C.5"],
  "us-ca-math-p4-4-nbt-multi-digit": ["4.NBT.A.1","4.NBT.A.2","4.NBT.A.3","4.NBT.B.4","4.NBT.B.5","4.NBT.B.6"],
  "us-ca-math-p4-4-nf-fraction-decimal": ["4.NF.A.1","4.NF.A.2","4.NF.B.3","4.NF.B.4","4.NF.C.5","4.NF.C.6","4.NF.C.7"],
  "us-ca-math-p4-4-md-conversion-angles": ["4.MD.A.1","4.MD.A.2","4.MD.A.3","4.MD.B.4","4.MD.C.5","4.MD.C.6","4.MD.C.7"],
  "us-ca-math-p4-4-g-lines-shapes": ["4.G.A.1","4.G.A.2","4.G.A.3"],
  "us-ca-math-p5-5-oa-expressions-patterns": ["5.OA.A.1","5.OA.A.2","5.OA.B.3"],
  "us-ca-math-p5-5-nbt-decimals": ["5.NBT.A.1","5.NBT.A.2","5.NBT.A.3","5.NBT.A.4","5.NBT.B.5","5.NBT.B.6","5.NBT.B.7"],
  "us-ca-math-p5-5-nf-operations": ["5.NF.A.1","5.NF.A.2","5.NF.B.3","5.NF.B.4","5.NF.B.5","5.NF.B.6","5.NF.B.7"],
  "us-ca-math-p5-5-md-volume-data": ["5.MD.A.1","5.MD.B.2","5.MD.C.3","5.MD.C.4","5.MD.C.5"],
  "us-ca-math-p5-5-g-coordinate-shapes": ["5.G.A.1","5.G.A.2","5.G.B.3","5.G.B.4"],
  "us-ca-math-p6-chapter-01": ["6.RP.A.1","6.RP.A.3","6.RP.A.2"],
  "us-ca-math-p6-chapter-02": ["6.NS.A.1","6.NS.B.2","6.NS.B.3","6.NS.B.4","6.NS.C.5","6.NS.C.6","6.NS.C.8","6.NS.C.7"],
  "us-ca-math-p6-chapter-03": ["6.EE.A.1","6.EE.A.2","6.EE.B.6","6.EE.A.3","6.EE.A.4","6.EE.B.5","6.EE.B.7","6.EE.B.8","6.EE.C.9"],
  "us-ca-math-p6-chapter-04": ["6.G.A.1","6.G.A.2","6.G.A.3","6.G.A.4"],
  "us-ca-math-p6-chapter-05": ["6.SP.A.1","6.SP.A.2","6.SP.A.3","6.SP.B.5","6.SP.B.4"],
  "us-ca-math-s1-chapter-01": ["7.RP.A.1","7.RP.A.2","7.RP.A.3"],
  "us-ca-math-s1-chapter-02": ["7.NS.A.1","7.NS.A.2","7.NS.A.3"],
  "us-ca-math-s1-chapter-03": ["7.EE.A.1","7.EE.A.2","7.EE.B.3","7.EE.B.4"],
  "us-ca-math-s1-chapter-04": ["7.G.A.1","7.G.A.2","7.G.A.3","7.G.B.4","7.G.B.5","7.G.B.6"],
  "us-ca-math-s1-chapter-05": ["7.SP.A.1","7.SP.A.2","7.SP.B.3","7.SP.B.4","7.SP.C.5","7.SP.C.6","7.SP.C.7","7.SP.C.8"],
  "us-ca-math-s2-chapter-01": ["8.NS.A.1","8.NS.A.2","8.EE.C.7","8.EE.C.8"],
  "us-ca-math-s2-chapter-02": ["8.EE.B.5","8.EE.B.6","8.F.A.3","8.F.A.1","8.F.A.2","8.F.B.4","8.F.B.5"],
  "us-ca-math-s2-chapter-03": ["8.G.A.1","8.G.A.3","8.G.A.2","8.G.A.4","8.G.A.5"],
  "us-ca-math-s2-chapter-04": ["8.EE.A.1","8.EE.A.2","8.EE.A.3","8.EE.A.4","8.G.B.6","8.G.B.7","8.G.B.8","8.G.C.9"],
  "us-ca-math-s2-chapter-05": ["8.SP.A.1","8.SP.A.2","8.SP.A.3","8.SP.A.4"],
  "us-ca-math-s3-chapter-01": ["N-RN.1","N-RN.2","N-RN.3","A-CED.1","A-CED.2","A-CED.3","A-CED.4"],
  "us-ca-math-s3-chapter-02": ["F-IF.1","F-IF.2","F-IF.3","F-IF.4","F-IF.5","F-IF.6","F-IF.7","F-IF.8","F-BF.3","F-IF.9"],
  "us-ca-math-s3-chapter-03": ["A-REI.1","A-REI.3","A-SSE.1","A-SSE.2","A-SSE.3","A-REI.2","A-REI.4","A-REI.5","A-REI.6","A-REI.7","A-REI.8","A-REI.9","A-REI.10","A-REI.11","A-REI.12"],
  "us-ca-math-s3-chapter-04": ["G-GPE.1","G-GPE.2","G-GPE.3","G-GPE.4","G-GPE.5","G-GPE.6","G-GPE.7"],
  "us-ca-math-s3-chapter-05": ["S-ID.1","S-ID.2","S-ID.3","S-ID.4","S-ID.5","S-ID.6","S-ID.7","S-ID.8","S-ID.9"],
  "us-ca-math-s4-chapter-01": ["G-CO.1","G-CO.2","G-CO.4","G-CO.5","G-CO.3","G-CO.6","G-CO.7","G-CO.8","G-CO.9","G-CO.10","G-CO.11","G-CO.12","G-CO.13"],
  "us-ca-math-s4-chapter-02": ["G-SRT.1","G-SRT.2","G-SRT.3","G-SRT.4","G-SRT.5","G-SRT.6","G-SRT.7","G-SRT.8","G-SRT.9","G-SRT.10","G-SRT.11"],
  "us-ca-math-s4-chapter-03": ["G-C.1","G-C.2","G-C.3","G-C.4","G-C.5","G-GMD.1","G-GMD.2","G-GMD.3","G-GMD.4"],
  "us-ca-math-s4-chapter-04": ["A-SSE.1","A-SSE.2","A-SSE.3","A-SSE.4"],
  "us-ca-math-s4-chapter-05": ["S-CP.1","S-CP.2","S-CP.5","S-CP.3","S-CP.6","S-CP.4","S-CP.7","S-CP.8","S-CP.9"],
  "us-ca-math-s5-chapter-01": ["F-IF.7","F-IF.8","F-BF.3","F-BF.1","F-BF.2","F-BF.4","F-BF.5"],
  "us-ca-math-s5-chapter-02": ["F-LE.1","F-LE.3","F-LE.2","F-LE.5","F-LE.4"],
  "us-ca-math-s5-chapter-03": ["F-TF.1","F-TF.2","F-TF.3","F-TF.4","F-TF.5","F-TF.6","F-TF.7","F-TF.8","F-TF.9"],
  "us-ca-math-s5-chapter-04": ["S-ID.1","S-ID.2","S-ID.3","S-ID.4","S-ID.5","S-ID.6","S-ID.7","S-ID.8","S-ID.9"],
  "us-ca-math-s5-chapter-05": ["S-IC.1","S-IC.2","S-IC.3","S-IC.4","S-IC.5","S-IC.6"],
  "us-ca-math-s6-chapter-01": ["N-Q.1","N-Q.2","N-Q.3"],
  "us-ca-math-s6-chapter-02": ["N-CN.1","N-CN.2","N-CN.3","N-CN.4","N-CN.5","N-CN.6","N-CN.7","N-CN.8","N-CN.9","A-APR.1","A-APR.2","A-APR.3","A-APR.4","A-APR.5","A-APR.6","A-APR.7"],
  "us-ca-math-s6-chapter-03": ["S-MD.1","S-MD.2","S-MD.3","S-MD.4","S-MD.5","S-MD.6","S-MD.7"],
  "us-ca-math-s6-chapter-04": ["F-IF.1","F-IF.2","F-IF.3","F-IF.4","F-IF.5","F-IF.6","F-IF.7","F-IF.8","F-BF.3","F-IF.9"],
  "us-ca-math-s6-chapter-05": ["N-VM.1","N-VM.2","N-VM.3","N-VM.4","N-VM.5","N-VM.6","N-VM.7","N-VM.8","N-VM.9","N-VM.10","N-VM.11","N-VM.12","G-MG.1","G-MG.2","G-MG.3"]
};

export function getCaliforniaAssignedCoreStandardIds(topicId: string | null | undefined): readonly string[] {
  if (!topicId) return [];
  return californiaAssignedCoreStandardsByTopic[topicId] ?? [];
}

export const signatureLabAssignments: Record<string, SignatureLabAssignment> = {
  "us-ca-math-k-k-cc-count-sequence": {
    primary: "HundredChartLab",
    related: ["CountingLab", "TeenNumbersLab"],
    rationale:
      "CCSS join on K.CC.1, K.CC.2, K.CC.3. 3 benches share these standards; HundredChartLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-k-k-cc-cardinality-compare": {
    primary: "CountingLab",
    related: ["ComparingLab"],
    rationale:
      "CCSS join on K.CC.4, K.CC.5, K.CC.6, K.CC.7. 2 benches share these standards; CountingLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-k-k-oa-compose-decompose": {
    primary: "SubtractionLab",
    related: ["NumberBondLab", "StoryProblemLab"],
    rationale:
      "CCSS join on K.OA.1, K.OA.2, K.OA.3, K.OA.4, K.OA.5. 3 benches share these standards; SubtractionLab anchors the topic (fan-out) and the rest are offered as related labs. StoryProblemLab was ported on 2026-07-25 and is the only bench that turns a word problem into the number sentence — K.OA.2's own subject."
  },
  "us-ca-math-k-k-nbt-teen-numbers": {
    primary: "TeenNumbersLab",
    related: [],
    rationale:
      "Sole CCSS candidate (K.NBT.1). Bench is purpose-built for teen numbers as ten-and-some-ones."
  },
  "us-ca-math-k-k-md-attributes-data": {
    primary: "LengthComparisonLab",
    related: ["SortLab", "PositionLab"],
    rationale:
      "CCSS join on K.MD.1, K.MD.2, K.MD.3. 3 benches share these standards; LengthComparisonLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-k-k-g-shapes-position": {
    primary: "PositionLab",
    related: ["ShapesLab", "ComposingShapesLab"],
    rationale:
      "CCSS join on K.G.1, K.G.2, K.G.3, K.G.4, K.G.5, K.G.6. 3 benches share these standards; PositionLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p1-1-oa-add-subtract": {
    primary: "AssociativeAdditionLab",
    related: ["AddLab", "CommutativeLab", "NumberBondLab", "SubtractionLab", "EqualSignLab"],
    rationale:
      "CCSS join on 1.OA.1, 1.OA.2, 1.OA.3, 1.OA.4, 1.OA.5, 1.OA.6, 1.OA.7, 1.OA.8. 6 benches share these standards; AssociativeAdditionLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p1-1-nbt-place-value": {
    primary: "HundredChartLab",
    related: ["NumberLab", "TeenNumbersLab", "TwoDigitNumberLab", "ComparingLab", "PlaceValueStrategiesLab", "RegroupingSubtractionLab", "PlaceJumpLab"],
    rationale:
      "CCSS join on 1.NBT.1, 1.NBT.2, 1.NBT.3, 1.NBT.4, 1.NBT.5, 1.NBT.6. 7 benches share these standards; HundredChartLab anchors the topic (fan-out) and the rest are offered as related labs. PlaceJumpLab was ported on 2026-07-25 and is the only bench for 1.NBT.5 — ten more / ten less as a one-column jump."
  },
  "us-ca-math-p1-1-md-measure-data": {
    primary: "LengthComparisonLab",
    related: ["TimeLab"],
    rationale:
      "CCSS join on 1.MD.1, 1.MD.2, 1.MD.3, 1.MD.4. 2 benches share these standards; LengthComparisonLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p1-1-g-shape-reasoning": {
    primary: "PositionLab",
    related: ["ShapesLab", "ComposingShapesLab", "EqualSharesLab"],
    rationale:
      "CCSS join on 1.G.1, 1.G.2, 1.G.3. 4 benches share these standards; PositionLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p2-2-oa-fluency-arrays": {
    primary: "OddEvenLab",
    related: [],
    rationale:
      "CCSS join on 2.OA.1, 2.OA.2, 2.OA.3, 2.OA.4. 1 bench share this standard; OddEvenLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p2-2-nbt-three-digit-place-value": {
    primary: "TwoDigitNumberLab",
    related: ["ComparingLab", "PlaceValueStrategiesLab", "RegroupingSubtractionLab", "PlaceJumpLab", "MultiplesLab"],
    rationale:
      "CCSS join on 2.NBT.1, 2.NBT.2, 2.NBT.3, 2.NBT.4, 2.NBT.5, 2.NBT.6, 2.NBT.7, 2.NBT.8, 2.NBT.9. 4 benches share these standards; TwoDigitNumberLab anchors the topic (fan-out) and the rest are offered as related labs. PlaceJumpLab was ported on 2026-07-25 and is the only bench for 2.NBT.8 — mentally add or subtract 10 or 100, including the cascade at the nines."
  },
  "us-ca-math-p2-2-md-measure-data-money-time": {
    primary: "MeasurementLab",
    related: ["TimeLab", "MoneyLab", "LinePlotLab", "GraphsLab"],
    rationale:
      "CCSS join on 2.MD.1, 2.MD.2, 2.MD.3, 2.MD.4, 2.MD.5, 2.MD.6, 2.MD.7, 2.MD.8, 2.MD.9, 2.MD.10. 5 benches share these standards; MeasurementLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p2-2-g-partition-shapes": {
    primary: "ShapesLab",
    related: ["EqualSharesLab"],
    rationale:
      "CCSS join on 2.G.1, 2.G.2, 2.G.3. 2 benches share these standards; ShapesLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p3-3-oa-mult-div": {
    primary: "MultiplicationLab",
    related: ["DivisionLab", "AssociativeAdditionLab", "AssociativeMultiplicationLab", "CommutativeLab", "DistributiveLab", "TwoStepLab", "PatternsLab"],
    rationale:
      "CCSS join on 3.OA.1, 3.OA.2, 3.OA.3, 3.OA.4, 3.OA.5, 3.OA.6, 3.OA.7, 3.OA.8, 3.OA.9. 8 benches share these standards; MultiplicationLab anchors the topic (fan-out) and the rest are offered as related labs. DivisionLab was tagged 3.OA.4 on 2026-07-25 — finding the missing side of the array IS determining the unknown number in a multiplication equation, and it already carried 3.OA.6 (division as an unknown-factor problem). 3.OA.3 (one-step word problems) and 3.OA.7 (fluency from memory) still have no bench and remain build work."
  },
  "us-ca-math-p3-3-nbt-arithmetic": {
    primary: "RoundingLab",
    related: ["PlaceValueStrategiesLab", "RegroupingSubtractionLab"],
    rationale:
      "CCSS join on 3.NBT.1, 3.NBT.2, 3.NBT.3. RoundingLab anchors on 3.NBT.1. The other two were tagged 3.NBT.2 on 2026-07-25: both already teach place-value add/subtract within 1000 (they carry 2.NBT.7 and 4.NBT.4, which 3.NBT.2 sits between), so the standard had a visual all along and no lab claimed it. 3.NBT.3 (one-digit x multiples of 10) still has no bench anywhere — build work, deliberately not faked with a near-miss tag."
  },
  "us-ca-math-p3-3-nf-fraction-meaning": {
    primary: "FractionLab",
    related: ["RationalNumbersLab", "EquivalentFractionsLab"],
    rationale:
      "CCSS join on 3.NF.1, 3.NF.2, 3.NF.3. FractionLab anchors on 3.NF.1 — it owns the area / part-whole bar and, by the library's distinctness rule, deliberately refuses the number line. That is why 3.NF.2 needs RationalNumbersLab, whose whole centrepiece is 'cut the unit into q, step p' on a number line; 3.NF.3 (equivalence and comparison) needs EquivalentFractionsLab's name lattice. Both tagged 2026-07-25."
  },
  "us-ca-math-p3-3-md-time-data-area-perimeter": {
    primary: "TimeLab",
    related: ["GramsAndLitersLab", "GraphsLab", "AreaLab", "MultiplicationLab", "RectangleLab", "FractionLinePlotLab", "LinePlotLab"],
    rationale:
      "CCSS join on 3.MD.1, 3.MD.2, 3.MD.3, 3.MD.4, 3.MD.5, 3.MD.6, 3.MD.7, 3.MD.8. 8 benches share these standards; TimeLab anchors the topic (fan-out) and the rest are offered as related labs. Three tags were added 2026-07-25: AreaLab already taught 3.MD.5/3.MD.6 (area as an attribute, measured by counting unit squares) as its centrepiece but only claimed 3.MD.7; 3.MD.4 needs both new benches — FractionLinePlotLab for the halves/quarters scale and LinePlotLab for the measure-then-mark action."
  },
  "us-ca-math-p3-3-g-categories": {
    primary: "EqualAreasLab",
    related: ["QuadrilateralLab"],
    rationale:
      "CCSS join on 3.G.1, 3.G.2. 2 benches share these standards; EqualAreasLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p4-4-oa-factors-patterns": {
    primary: "MultiplicativeComparisonLab",
    related: ["DivisionLab", "FactorLab", "MultiplesLab", "PrimeNumbersLab", "PatternsLab"],
    rationale:
      "CCSS join on 4.OA.1, 4.OA.2, 4.OA.3, 4.OA.4, 4.OA.5. 6 benches share these standards; MultiplicativeComparisonLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p4-4-nbt-multi-digit": {
    primary: "ComparingLab",
    related: ["RoundingLab", "PlaceValueStrategiesLab", "MultiDigitMultiplicationLab", "DivisionLab", "LongDivisionLab"],
    rationale:
      "CCSS join on 4.NBT.1, 4.NBT.2, 4.NBT.3, 4.NBT.4, 4.NBT.5, 4.NBT.6. 6 benches share these standards; ComparingLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p4-4-nf-fraction-decimal": {
    primary: "EquivalentFractionsLab",
    related: ["FractionAdditionLab", "FractionTimesWholeLab", "UnlikeDenominatorsLab", "DecimalLab"],
    rationale:
      "CCSS join on 4.NF.1, 4.NF.2, 4.NF.3, 4.NF.4, 4.NF.5, 4.NF.6, 4.NF.7. 5 benches share these standards; EquivalentFractionsLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p4-4-md-conversion-angles": {
    primary: "UnitConversionLab",
    related: ["MoneyLab", "FractionLinePlotLab", "AngleTurnLab", "RectangleLab"],
    rationale:
      "CCSS join on 4.MD.1, 4.MD.2, 4.MD.3, 4.MD.4, 4.MD.5, 4.MD.6, 4.MD.7. 4 benches share these standards; UnitConversionLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p4-4-g-lines-shapes": {
    primary: "AngleTurnLab",
    related: ["AngleLab", "LinesRaysSegmentsLab", "SymmetryLab"],
    rationale:
      "CCSS join on 4.G.1, 4.G.2, 4.G.3. 4 benches share these standards; AngleTurnLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p5-5-oa-expressions-patterns": {
    primary: "OperationsLab",
    related: ["PatternsLab"],
    rationale:
      "CCSS join on 5.OA.1, 5.OA.2, 5.OA.3. 2 benches share these standards; OperationsLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p5-5-nbt-decimals": {
    primary: "DecimalLab",
    related: ["PowersOfTenLab", "RoundingLab", "MultiDigitMultiplicationLab", "DecimalArithmeticLab", "LongDivisionLab"],
    rationale:
      "CCSS join on 5.NBT.1, 5.NBT.2, 5.NBT.3, 5.NBT.4, 5.NBT.5, 5.NBT.6, 5.NBT.7. 5 benches share these standards; DecimalLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p5-5-nf-operations": {
    primary: "FractionAdditionLab",
    related: ["UnlikeDenominatorsLab", "FractionAsDivisionLab", "UnitFractionDivisionLab", "FractionMultiplicationLab", "DilationsLab", "ScalingLab"],
    rationale:
      "CCSS join on 5.NF.1, 5.NF.2, 5.NF.3, 5.NF.4, 5.NF.5, 5.NF.6, 5.NF.7. 7 benches share these standards; FractionAdditionLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p5-5-md-volume-data": {
    primary: "VolumeLab",
    related: ["UnitConversionLab", "FractionLinePlotLab"],
    rationale:
      "The rendered core covers 5.MD.A.1, 5.MD.B.2, and 5.MD.C.3-5. UnitConversionLab was standards-valid but pedagogically miscentered for a page titled Volume and Data; VolumeLab now anchors the core unit-cube and volume work, while unit conversion and line-plot operations remain available as related benches."
  },
  "us-ca-math-p5-5-g-coordinate-shapes": {
    primary: "PointLab",
    related: ["QuadrilateralLab"],
    rationale:
      "CCSS join on 5.G.1, 5.G.2, 5.G.3, 5.G.4. PointLab anchors on the coordinate half (5.G.1/5.G.2). QuadrilateralLab was tagged 5.G.3/5.G.4 on 2026-07-25: its 'quadrilateral family' step IS the shape hierarchy the two classification standards ask for, and nothing on this topic had claimed them."
  },
  "us-ca-math-p1-1-h1-picture-join-stories-to-10": {
    primary: "SubtractionLab",
    related: ["AddLab", "NumberBondLab"],
    rationale:
      "CCSS join on 1.OA.1, 1.OA.5, 1.OA.6. 3 benches share these standards; SubtractionLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p1-1-h2-picture-story-addition-equations": {
    primary: "EqualSignLab",
    related: ["AddLab"],
    rationale:
      "CCSS join on 1.OA.1, 1.OA.7, 1.OA.8. 2 benches share these standards; EqualSignLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p1-1-h3-cube-train-join-models-to-10": {
    primary: "SubtractionLab",
    related: ["AddLab", "NumberBondLab"],
    rationale:
      "CCSS join on 1.OA.1, 1.OA.5, 1.OA.6. 3 benches share these standards; SubtractionLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p1-1-h4-join-stories-within-10": {
    primary: "NumberBondLab",
    related: ["AddLab", "SubtractionLab"],
    rationale:
      "CCSS join on 1.OA.1, 1.OA.6. 3 benches share these standards; NumberBondLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p1-1-h5-model-equation-join-stories-to-10": {
    primary: "SubtractionLab",
    related: ["AddLab", "EqualSignLab"],
    rationale:
      "CCSS join on 1.OA.1, 1.OA.5, 1.OA.7. 3 benches share these standards; SubtractionLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p1-1-h6-equation-match-join-stories-to-10": {
    primary: "EqualSignLab",
    related: ["AddLab"],
    rationale:
      "CCSS join on 1.OA.1, 1.OA.7, 1.OA.8. 2 benches share these standards; EqualSignLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p1-1-l1-picture-take-away-stories-to-10": {
    primary: "SubtractionLab",
    related: ["AddLab", "NumberBondLab"],
    rationale:
      "Take-away story lesson; SubtractionLab's count-back model matches the lesson's representation directly."
  },
  "us-ca-math-p1-1-l2-picture-story-subtraction-equations": {
    primary: "SubtractionLab",
    related: ["AddLab", "EqualSignLab"],
    rationale:
      "CCSS join on 1.OA.1, 1.OA.4, 1.OA.7. 3 benches share these standards; SubtractionLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p1-1-l3-cube-train-take-away-models-to-10": {
    primary: "SubtractionLab",
    related: ["AddLab", "NumberBondLab"],
    rationale:
      "Cube-train take-away; same count-back model. Reuses the P1 L1 bench rather than duplicating it."
  },
  "us-ca-math-p1-1-l4-take-away-stories-within-10": {
    primary: "SubtractionLab",
    related: ["AddLab", "NumberBondLab"],
    rationale:
      "Take-away within 10; identical model to L1/L3."
  },
  "us-ca-math-p1-1-l5-model-equation-take-away-stories-to-10": {
    primary: "SubtractionLab",
    related: ["AddLab", "EqualSignLab"],
    rationale:
      "CCSS join on 1.OA.1, 1.OA.4, 1.OA.5, 1.OA.7. 3 benches share these standards; SubtractionLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p1-1-l6-break-apart-subtraction-equations-to-10": {
    primary: "SubtractionLab",
    related: ["AddLab", "EqualSignLab"],
    rationale:
      "CCSS join on 1.OA.1, 1.OA.4, 1.OA.7, 1.OA.8. 3 benches share these standards; SubtractionLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p6-chapter-01": {
    primary: "RatioLab",
    related: ["PercentageLab", "UnitConversionLab"],
    rationale:
      "CCSS join on 6.RP.1, 6.RP.2, 6.RP.3. 3 benches share these standards; RatioLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p6-chapter-02": {
    primary: "FractionDivisionLab",
    related: ["DistributiveLab", "EquivalentFractionsLab", "GreatestCommonFactorLab", "LCMLab", "PrimeFactorizationLab", "IntegerLab", "PointLab", "RationalNumbersLab", "AbsoluteValueLab", "LongDivisionLab", "DecimalArithmeticLab"],
    rationale:
      "CCSS join on 6.NS.1, 6.NS.2, 6.NS.3, 6.NS.4, 6.NS.5, 6.NS.6, 6.NS.7, 6.NS.8. 10 benches share these standards; FractionDivisionLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p6-chapter-03": {
    primary: "OperationsLab",
    related: ["ExpressionLab", "FormulaLab", "TranslateLab", "CommutativeLab", "DistributiveLab", "LikeTermsLab", "InequalityLab", "VariableLab", "CovariationLab", "EquationLab"],
    rationale:
      "CCSS join on 6.EE.1, 6.EE.2, 6.EE.3, 6.EE.4, 6.EE.5, 6.EE.6, 6.EE.7, 6.EE.8, 6.EE.9. 10 benches share these standards; OperationsLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p6-chapter-04": {
    primary: "VolumeLab",
    related: ["ParallelogramLab", "TrapezoidLab", "CubeLab", "RectangularPrismLab"],
    rationale:
      "CCSS join on 6.G.1, 6.G.2, 6.G.3, 6.G.4. 5 benches share these standards; VolumeLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p6-chapter-05": {
    primary: "StatisticalQuestionLab",
    related: ["DataLab", "MedianLab", "ModeLab", "BoxPlotLab", "HistogramLab", "MeanLab", "VarianceLab"],
    rationale:
      "CCSS join on 6.SP.1, 6.SP.2, 6.SP.3, 6.SP.4, 6.SP.5. 8 benches share these standards; StatisticalQuestionLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s1-chapter-01": {
    primary: "ProportionalLab",
    related: ["PercentChangeLab"],
    rationale:
      "CCSS join on 7.RP.1, 7.RP.2, 7.RP.3. 2 benches share these standards; ProportionalLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s1-chapter-02": {
    primary: "AbsoluteValueLab",
    related: ["SignedAdditionLab", "RationalNumbersLab", "SignedNumbersLab"],
    rationale:
      "CCSS join on 7.NS.1, 7.NS.2, 7.NS.3. 4 benches share these standards; AbsoluteValueLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s1-chapter-03": {
    primary: "CommutativeLab",
    related: ["DistributiveLab", "FormulaLab", "InequalityLab", "LikeTermsLab"],
    rationale:
      "CCSS join on 7.EE.1, 7.EE.2, 7.EE.3, 7.EE.4. 5 benches share these standards; CommutativeLab anchors the topic (fan-out) and the rest are offered as related labs. LikeTermsLab was joined by 7.EE.2 but omitted from this list until 2026-07-25, leaving 7.EE.2 with no bench."
  },
  "us-ca-math-s1-chapter-04": {
    primary: "ScaleDrawingLab",
    related: ["TriangleBuildLab", "TriangleSolveLab", "CrossSectionLab", "PiLab", "TransversalLab", "RectangularPrismLab"],
    rationale:
      "CCSS join on 7.G.1, 7.G.2, 7.G.3, 7.G.4, 7.G.5, 7.G.6. 7 benches share these standards; ScaleDrawingLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s1-chapter-05": {
    primary: "SamplingLab",
    related: ["TwoDistributionsLab", "ProbabilityLab", "TreeDiagramLab"],
    rationale:
      "CCSS join on 7.SP.1, 7.SP.2, 7.SP.3, 7.SP.4, 7.SP.5, 7.SP.6, 7.SP.7, 7.SP.8. 4 benches share these standards; SamplingLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s2-chapter-01": {
    primary: "RationalNumbersLab",
    related: ["IrrationalLab", "EquationLab", "SubstitutionLab", "SystemsOfEquationsLab"],
    rationale:
      "The rendered lesson core is 8.NS.A.1-2 and 8.EE.C.7-8. RationalNumbersLab directly anchors rational/irrational classification and placement, followed by the equation and system benches that match the remaining rendered standards; the former ExponentRulesLab primary addressed 8.EE.A.1, which is not in this page's assigned core."
  },
  "us-ca-math-s2-chapter-02": {
    primary: "FunctionLab",
    related: ["CompareFunctionsLab", "LineFunctionLab", "GraphStoryLab", "CompositionLab"],
    rationale:
      "CCSS join on 8.F.1, 8.F.2, 8.F.3, 8.F.4, 8.F.5. 5 benches share these standards; FunctionLab anchors the topic (fan-out) and the rest are offered as related labs. CompositionLab was ported on 2026-07-25; it takes 8.F.1 (one input, exactly one output) as its on-ramp before chaining two machines."
  },
  "us-ca-math-s2-chapter-03": {
    primary: "CongruenceLab",
    related: ["TransformationsLab", "DilationsLab", "TransversalLab", "TriangleLab", "PythagorasLab", "RectangularPrismLab", "DistanceLab", "ConeLab", "CylinderLab", "PyramidLab", "SphereLab"],
    rationale:
      "CCSS join on 8.G.1, 8.G.2, 8.G.3, 8.G.4, 8.G.5, 8.G.6, 8.G.7, 8.G.8, 8.G.9. 12 benches share these standards; CongruenceLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s2-chapter-04": {
    primary: "PythagorasLab",
    related: ["ExponentRulesLab", "RootsLab", "ScientificNotationLab", "DistanceLab", "RectangularPrismLab", "ConeLab", "CylinderLab", "PyramidLab", "SphereLab"],
    rationale:
      "The rendered lesson core is 8.EE.A.1-4 and 8.G.B.6-8 plus 8.G.C.9. PythagorasLab anchors the geometry progression, while exponent, root, scientific-notation, distance, and volume benches cover the rest; the former CongruenceLab primary addressed 8.G.A.1-2, which is not in this page's assigned core."
  },
  "us-ca-math-s2-chapter-05": {
    primary: "BestFitLab",
    related: ["ScatterPlotLab", "TableLab"],
    rationale:
      "CCSS join on 8.SP.1, 8.SP.2, 8.SP.3, 8.SP.4. 3 benches share these standards; BestFitLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s3-chapter-01": {
    primary: "FormulaLab",
    related: ["InequalityLab", "SubstitutionLab", "SystemsOfEquationsLab", "TwoVariableInequalityLab", "EquationLab", "CovariationLab", "EliminationLab"],
    rationale:
      "CCSS join on A-CED.1-4, plus A-REI.1, A-REI.3, A-REI.6, A-REI.10 and A-REI.12 added to this chapter on 2026-07-25 (A-REI has no CA chapter, so solving the constraint you just created had no lab). FormulaLab still anchors — building and rearranging the formula is the A-CED move. EquationLab carries A-REI.1 (its balance justifies each undo-step, which is exactly what that standard asks a student to explain); SystemsOfEquationsLab carries A-REI.10 (its 'each equation is a whole line' step states that the graph IS the solution set); CovariationLab carries A-CED.2 (situation to table to graph to equation)."
  },
  "us-ca-math-s3-chapter-02": {
    primary: "FunctionLab",
    related: ["SequencesLab", "AbsoluteValueLab", "PiecewiseLab", "PolynomialFunctionLab", "QuadraticFunctionLab", "QuadraticPolynomialLab", "RationalFunctionLab", "CompareFunctionsLab"],
    rationale:
      "CCSS join on F-IF.1-9, plus A-REI.11 added to this chapter on 2026-07-25 — reading the x-values where f(x) = g(x) off the graph is function interpretation, and AbsoluteValueLab (already related here) is the bench that teaches it. 9 benches share these standards; FunctionLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s3-chapter-03": {
    primary: "EquationLab",
    related: ["ExpressionLab", "FactoringQuadraticsLab", "ExtraneousLab", "QuadraticEquationLab", "EliminationLab", "SystemsOfEquationsLab", "LineParabolaLab", "MatrixLab", "TwoVariableInequalityLab"],
    rationale:
      "The rendered lesson core is A-REI.1-12 plus A-SSE.1-3. EquationLab anchors equivalence-preserving solution steps, with expression structure, radical/quadratic equations, elimination, systems, matrices, and graphing benches covering the remaining core; the former F-LE exponential primary belonged to a different assigned lesson family."
  },
  "us-ca-math-s3-chapter-04": {
    primary: "CircleLab",
    related: ["ParabolaLab", "EllipseLab", "HyperbolaLab", "PerpSlopeLab", "CoordinateMethodsLab", "GraphStoryLab", "BestFitLab", "CompareFunctionsLab", "FormulaLab", "FunctionLab", "OptimizationLab"],
    rationale:
      "G-GPE.1-7 (this chapter is 9-D.1 Coordinate Geometry Methods). Until 2026-07-25 the chapter's description scrape reduced its alignment to the bare 'Modeling' token, so it joined only modeling benches and GraphStoryLab anchored a coordinate-geometry chapter. With the domain restored, CircleLab — the equation of a circle derived from the distance formula, G-GPE.1 — is the chapter's entry point and anchors it; the conics (G-GPE.2/.3) and the slope criteria (G-GPE.5) are related, and the modeling benches stay related on the retained 'Modeling' tag. CoordinateMethodsLab is MAIS-authored and carries G-GPE.6/.7 (partition a directed segment in a ratio; perimeter and area straight from the corners) — the two G-GPE standards no ported bench taught."
  },
  "us-ca-math-s3-chapter-05": {
    primary: "BoxPlotLab",
    related: ["HistogramLab", "StandardDeviationLab", "VarianceLab", "NormalDistributionLab", "TableLab", "BestFitLab", "CorrelationLab", "LurkingVariableLab"],
    rationale:
      "Chapter anchors on S-ID.1-3 (distribution shape, centre, spread). BoxPlotLab is the only candidate that shows centre AND spread in one object, so it carries the chapter's core idea; the other candidates become related."
  },
  "us-ca-math-s4-chapter-01": {
    primary: "CongruenceLab",
    related: ["ProofChainLab", "CompassLab", "TransformationsLab", "ParallelogramLab", "TriangleLab"],
    rationale:
      "CCSS join on G-CO.1-13. CongruenceLab anchors the topic (fan-out). Three benches were tagged into this chapter on 2026-07-25, each for a standard it already taught and no lab claimed: TransformationsLab for G-CO.2 (its 'rules, in one place' step gives the coordinate rules — transformations as functions of the plane) and G-CO.5 ('moves compose', a sequence carrying one figure onto another); ParallelogramLab for G-CO.3 (the half-turn that carries the figure onto itself) and G-CO.11 (opposite sides and angles, from that same symmetry); TriangleLab for G-CO.10 (the angle-sum theorem, first in that standard's own list). G-CO.1/.4/.6-.9/.12/.13 still have no bench."
  },
  "us-ca-math-s4-chapter-02": {
    primary: "DilationsLab",
    related: ["TrigRatioLab", "TriangleSolveLab"],
    rationale:
      "CCSS join on G-SRT.1, G-SRT.2, G-SRT.3, G-SRT.4, G-SRT.5, G-SRT.6, G-SRT.7, G-SRT.8, G-SRT.9, G-SRT.10, G-SRT.11. 3 benches share these standards; DilationsLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s4-chapter-03": {
    primary: "CircleTheoremsLab",
    related: ["PyramidLab", "SphereLab", "CrossSectionLab", "RevolutionLab", "GeometricModelingLab"],
    rationale:
      "CCSS join on G-C.1-5, plus G-GMD.1, G-GMD.3 and G-GMD.4 added to this chapter on 2026-07-25: G-GMD.1 is the informal argument for circumference, circle area and the volume of a cylinder/pyramid/cone, so it belongs with circle measurement rather than in a chapter of its own. CircleTheoremsLab still anchors; the solids and cross-section benches are related. G-MG.1/.2/.3 joined the same chapter with GeometricModelingLab, a MAIS-authored bench: once the solids' measures exist, modelling a real object as one of them, weighing it by density, and choosing the least-metal design are the questions that follow — and G-MG had no bench and no chapter anywhere."
  },
  "us-ca-math-s4-chapter-04": {
    primary: "QuadraticEquationLab",
    related: ["FactoringQuadraticsLab", "QuadraticPolynomialLab", "LineParabolaLab"],
    rationale:
      "CCSS join on A-SSE.1-4, plus A-REI.4 and A-REI.7 added to this chapter on 2026-07-25 — solving the quadratic and the linear-quadratic system is this chapter's work, and QuadraticEquationLab (already the primary) was teaching A-REI.4 with no alignment recording it. LineParabolaLab carries A-REI.7."
  },
  "us-ca-math-s4-chapter-05": {
    primary: "ConditionalLab",
    related: ["SetTheoryLab", "ArrangementsLab"],
    rationale:
      "CCSS join on S-CP.1, S-CP.2, S-CP.3, S-CP.4, S-CP.5, S-CP.6, S-CP.7, S-CP.8, S-CP.9. 3 benches share these standards; ConditionalLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s5-chapter-01": {
    primary: "SequencesLab",
    related: ["AbsoluteValueLab", "UndoLab", "CompositionLab"],
    rationale:
      "CCSS join on F-BF.1, F-BF.2, F-BF.3, F-BF.4, F-BF.5. 4 benches share these standards; SequencesLab anchors the topic (fan-out) and the rest are offered as related labs. CompositionLab was ported on 2026-07-25 and carries F-BF.1b/1c (combine and compose standard function types) — the half of F-BF.1 that UndoLab (the inverse) does not."
  },
  "us-ca-math-s5-chapter-02": {
    primary: "ExponentialFunctionLab",
    related: ["LogarithmLab", "RationalExponentLab", "ExtraneousLab", "ClosureLab"],
    rationale:
      "F-LE.1-5 (construct & compare linear/exponential models), plus N-RN.1, N-RN.2 and A-REI.2 added to this chapter on 2026-07-25: rational exponents are what make b^x meaningful for non-integer x, and radical equations are where extraneous roots appear. Same anchor as S3 ch03 — the exponential's constant-ratio growth carries F-LE; RationalExponentLab and ExtraneousLab carry the additions. N-RN.3 joined on 2026-07-25 with ClosureLab, a MAIS-authored bench: rational exponents put irrational numbers into play, and N-RN.3 is what happens when you combine one with a rational."
  },
  "us-ca-math-s5-chapter-03": {
    primary: "UnitCircleLab",
    related: ["CosecantFunctionLab", "CosineFunctionLab", "CotangentFunctionLab", "SecantFunctionLab", "SineFunctionLab", "TangentFunctionLab", "ArcsinLab", "PythagoreanIdentityLab"],
    rationale:
      "CCSS join on F-TF.1, F-TF.2, F-TF.3, F-TF.4, F-TF.5, F-TF.6, F-TF.7, F-TF.8, F-TF.9. 9 benches share these standards; UnitCircleLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s5-chapter-04": {
    primary: "BoxPlotLab",
    related: ["HistogramLab", "StandardDeviationLab", "VarianceLab", "NormalDistributionLab", "TableLab", "BestFitLab", "CorrelationLab", "LurkingVariableLab"],
    rationale:
      "CCSS join on S-ID.1, S-ID.2, S-ID.3, S-ID.4, S-ID.5, S-ID.6, S-ID.7, S-ID.8, S-ID.9. 9 benches share these standards; BoxPlotLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s5-chapter-05": {
    primary: "SamplingLab",
    related: ["SamplingDistributionLab"],
    rationale:
      "CCSS join on S-IC.1, S-IC.2, S-IC.3, S-IC.4, S-IC.5, S-IC.6. 2 benches share these standards; SamplingLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s6-chapter-01": {
    primary: "UnitConversionLab",
    primaryCoreStandardIds: ["N-Q.1"],
    related: ["FormulaLab"],
    rationale:
      "The rendered lesson core is N-Q.1-3: quantities, units, scale, and appropriate precision. UnitConversionLab is the direct concept match for unit factors and equivalent measures, with FormulaLab as a supporting representation bench; the former VectorLab primary addressed N-VM, which is assigned to the Grade 12 capstone page instead."
  },
  "us-ca-math-s6-chapter-02": {
    primary: "PolynomialArithmeticLab",
    related: ["PolynomialFunctionLab", "RemainderTheoremLab", "RationalFunctionLab", "ComplexPlaneLab", "ComplexArithmeticLab"],
    rationale:
      "CCSS join on A-APR.1-7, plus the N-CN standards added to this chapter on 2026-07-25 — a polynomial's roots are where complex numbers become unavoidable, and N-CN had no CA chapter. PolynomialArithmeticLab anchors the topic (fan-out). ComplexPlaneLab carries N-CN.1/.2/.7/.9 (the quarter-turn and the roots); ComplexArithmeticLab is MAIS-authored and carries N-CN.3/.4/.5/.6 (modulus, conjugate, quotient, polar form, distance and midpoint) — the metric of the plane, which no ported bench taught."
  },
  "us-ca-math-s6-chapter-03": {
    primary: "ExpectedValueLab",
    related: [],
    rationale:
      "CCSS join on S-MD.1, S-MD.2, S-MD.3, S-MD.4, S-MD.5, S-MD.6, S-MD.7. 1 bench share this standard; ExpectedValueLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s6-chapter-04": {
    primary: "FunctionLab",
    related: ["SequencesLab", "AbsoluteValueLab", "PiecewiseLab", "PolynomialFunctionLab", "QuadraticFunctionLab", "QuadraticPolynomialLab", "RationalFunctionLab", "CompareFunctionsLab"],
    rationale:
      "CCSS join on F-IF.1, F-IF.2, F-IF.3, F-IF.4, F-IF.5, F-IF.6, F-IF.7, F-IF.8, F-IF.9. 9 benches share these standards; FunctionLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s6-chapter-05": {
    primary: "VectorLab",
    related: ["MatrixLab", "GeometricModelingLab"],
    rationale:
      "The rendered lesson core is N-VM.1-12 plus G-MG.1-3. VectorLab anchors the vector sequence, followed by matrix operations/transformations and geometric modeling; the former CompareFunctionsLab primary addressed function comparison rather than this page's assigned vector-matrix core."
  },
};

export function getSignatureLabAssignment(topicId: string | null | undefined) {
  if (!topicId) return null;
  return signatureLabAssignments[topicId] ?? null;
}

export function hasSignatureLab(topicId: string | null | undefined) {
  return getSignatureLabAssignment(topicId) !== null;
}
