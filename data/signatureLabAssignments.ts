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
  /** Further benches matching this topic's standards, shown as "related labs". Ported-only. */
  related?: SignatureLabId[];
  /** Why this primary was chosen. Required — the curation audit trail. */
  rationale: string;
};

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
    primary: "NumberBondLab",
    related: ["SubtractionLab", "StoryProblemLab"],
    rationale:
      "Realigned 2026-08-25 (California alignment audit, PR #143): NumberBondLab's K.OA.3/K.OA.4 decomposition work is this Compose-and-Decompose topic's namesake subject, so it anchors; SubtractionLab (K.OA.1's take-away half) moves to related. SubtractionLab's upstream K.OA.2 tag is paper coverage — its lesson has no word problems; StoryProblemLab is the bench that turns a word problem into the number sentence. Original CCSS join: K.OA.1-5."
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
    primary: "ShapesLab",
    related: ["ComposingShapesLab", "EqualSharesLab"],
    rationale:
      "Realigned 2026-08-25 (California alignment audit, PR #143): PositionLab teaches only K.G.1 relative-position words (its own header assigns the 1.G.A.1 name/attribute function to ShapesLab), so its upstream 1.G.1 tag is paper coverage a full grade below this topic; it is detached. ShapesLab (defining attributes and shape names, 1.G.1) anchors; ComposingShapesLab carries 1.G.2 and EqualSharesLab 1.G.3. Original CCSS join: 1.G.1-3."
  },
  "us-ca-math-p2-2-oa-fluency-arrays": {
    primary: "OddEvenLab",
    related: [],
    rationale:
      "CCSS join on 2.OA.1, 2.OA.2, 2.OA.3, 2.OA.4. 1 bench share this standard; OddEvenLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p2-2-nbt-three-digit-place-value": {
    primary: "ComparingLab",
    related: ["TwoDigitNumberLab", "PlaceValueStrategiesLab", "RegroupingSubtractionLab", "PlaceJumpLab", "MultiplesLab"],
    rationale:
      "Realigned 2026-08-25 (California alignment audit, PR #143): TwoDigitNumberLab is hard-capped at 0-99 (its header pitches 1.NBT.2), so its upstream 2.NBT.1 tag is paper coverage on a THREE-digit chapter; it moves to related as the bundling on-ramp. ComparingLab anchors instead: its hundreds/tens/ones digit dials over 0-999 are the three-digit register this chapter names, and compare-by-place is 2.NBT.4 directly. PlaceJumpLab remains the only bench for 2.NBT.8 (±10/±100 with the cascade at the nines). Original CCSS join: 2.NBT.1-9."
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
    primary: "LinesRaysSegmentsLab",
    related: ["AngleTurnLab", "AngleLab", "SymmetryLab"],
    rationale:
      "Realigned 2026-08-25 (California alignment audit, PR #143): AngleTurnLab's seven steps all teach 4.MD.C angle MEASURE (degrees as 1/360 turn, additivity, protractor), not 4.G.1; LinesRaysSegmentsLab is the 4.G.A.1-native bench (points, lines, rays, segments, parallel/perpendicular, right/acute/obtuse names) and anchors. AngleTurnLab and AngleLab stay related for the angle strand; SymmetryLab carries 4.G.3. Original CCSS join: 4.G.1-3."
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
    primary: "UnlikeDenominatorsLab",
    related: ["FractionAdditionLab", "FractionAsDivisionLab", "UnitFractionDivisionLab", "FractionMultiplicationLab", "DilationsLab", "ScalingLab"],
    rationale:
      "Realigned 2026-08-25 (California alignment audit, PR #143): FractionAdditionLab is by its own header a GRADE 4 like-denominator lab (4.NF.B.3) that deliberately never utters common denominator, so its upstream 5.NF.1 tag is paper coverage; UnlikeDenominatorsLab owns the re-cut that makes unlike pieces addable (5.NF.1, 5.NF.2) and anchors this grade-5 chapter. FractionAdditionLab stays related as the like-denominator on-ramp. Original CCSS join: 5.NF.1-7."
  },
  "us-ca-math-p5-5-md-volume-data": {
    primary: "UnitConversionLab",
    related: ["FractionLinePlotLab", "VolumeLab"],
    rationale:
      "CCSS join on 5.MD.1, 5.MD.2, 5.MD.3, 5.MD.4, 5.MD.5. 3 benches share these standards; UnitConversionLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p5-5-g-coordinate-shapes": {
    primary: "PointLab",
    related: ["QuadrilateralLab"],
    rationale:
      "CCSS join on 5.G.1, 5.G.2, 5.G.3, 5.G.4. PointLab anchors on the coordinate half (5.G.1/5.G.2). QuadrilateralLab was tagged 5.G.3/5.G.4 on 2026-07-25: its 'quadrilateral family' step IS the shape hierarchy the two classification standards ask for, and nothing on this topic had claimed them."
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
    primary: "SignedAdditionLab",
    related: ["AbsoluteValueLab", "RationalNumbersLab", "SignedNumbersLab"],
    rationale:
      "Realigned 2026-08-25 (California alignment audit, PR #143): AbsoluteValueLab's central model is the Algebra-1 function y=|mx+b| (its header files it under HS F-BF/F-IF), the wrong register for a grade-7 rational-number-operations chapter; SignedAdditionLab is anchored on 7.NS.A.1 directly (signed numbers as directed arrows, tip-to-tail addition, p+(−p)=0, p−q=p+(−q)) and anchors. AbsoluteValueLab stays related for the |p−q| distance connection. Original CCSS join: 7.NS.1-3."
  },
  "us-ca-math-s1-chapter-03": {
    primary: "DistributiveLab",
    related: ["CommutativeLab", "FormulaLab", "InequalityLab", "LikeTermsLab"],
    rationale:
      "Realigned 2026-08-25 (California alignment audit, PR #143): CommutativeLab's lesson is numeric operation tables and times-table fact pairs (1.OA.3/3.OA.5 register; its header files 7.EE.1 as later pay-off), so it must not anchor a grade-7 Linear Expressions chapter; DistributiveLab teaches expand/factor of linear expressions (3(x+2)=3x+6; 6.EE.3/7.EE.1) and anchors. LikeTermsLab carries 7.EE.2 (kept since 2026-07-25). Original CCSS join: 7.EE.1-4."
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
    primary: "ExponentRulesLab",
    related: ["RationalExponentLab", "RootsLab", "ScientificNotationLab", "ProportionalLab", "TwoVariableInequalityLab", "DilationsLab", "EquationLab", "SubstitutionLab", "SystemsOfEquationsLab", "IrrationalLab", "RationalNumbersLab"],
    rationale:
      "CCSS join on 8.EE.1-8, plus 8.NS.1-2 added to this chapter on 2026-07-25 (8.NS had no CA chapter, so the irrationals that radicals depend on were unreachable). 12 benches share these standards; ExponentRulesLab anchors the topic (fan-out) and the rest are offered as related labs. IrrationalLab and RationalNumbersLab carry 8.NS."
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
    primary: "CongruenceLab",
    related: ["TransformationsLab", "DilationsLab", "TransversalLab", "TriangleLab", "PythagorasLab", "RectangularPrismLab", "DistanceLab", "ConeLab", "CylinderLab", "PyramidLab", "SphereLab"],
    rationale:
      "CCSS join on 8.G.1, 8.G.2, 8.G.3, 8.G.4, 8.G.5, 8.G.6, 8.G.7, 8.G.8, 8.G.9. 12 benches share these standards; CongruenceLab anchors the topic (fan-out) and the rest are offered as related labs."
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
    primary: "ExponentialFunctionLab",
    related: ["LogarithmLab"],
    rationale:
      "F-LE.1-5 (linear vs exponential models). ExponentialFunctionLab's constant-ratio staircase is the defining contrast to linear growth, so it anchors the chapter; LogarithmLab (the exponential's inverse) rides along as related."
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
    primary: "BestFitLab",
    related: ["BoxPlotLab", "HistogramLab", "StandardDeviationLab", "VarianceLab", "NormalDistributionLab", "TableLab", "CorrelationLab", "LurkingVariableLab"],
    rationale:
      "Realigned 2026-08-25 (California alignment audit, PR #143): this chapter is 11-D.1 Data Modeling and Residuals, and BestFitLab is the bench that fits a model to data and reads residuals (S-ID.6, S-ID.7 — its header names S-ID.B.6b-c); BoxPlotLab's single-variable distribution work (S-ID.1-3) anchors the S3 statistics chapter and moves to related here. Original CCSS join: S-ID.1-9."
  },
  "us-ca-math-s5-chapter-05": {
    primary: "SamplingLab",
    related: ["SamplingDistributionLab"],
    rationale:
      "CCSS join on S-IC.1, S-IC.2, S-IC.3, S-IC.4, S-IC.5, S-IC.6. 2 benches share these standards; SamplingLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s6-chapter-01": {
    primary: "VectorLab",
    related: ["MatrixLab", "BestFitLab", "CompareFunctionsLab", "FormulaLab", "FunctionLab", "GraphStoryLab", "OptimizationLab"],
    rationale:
      "N-Q.1-3 (this chapter is 12-A.1 Quantities, Units, and Precision), plus N-VM.1-3, N-VM.6-12, A-REI.8 and A-REI.9 added on 2026-07-25 — vector and matrix quantities sit in the same CCSS Number & Quantity category and had no chapter at all. Until then the description scrape reduced this chapter to the bare 'Modeling' token and BestFitLab anchored it. VectorLab — a quantity with magnitude and direction, N-VM.1 — now anchors the quantities chapter; MatrixLab carries N-VM.6-12 and the matrix form of a linear system; the modeling benches stay related on the retained 'Modeling' tag."
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
    primary: "BestFitLab",
    related: ["CompareFunctionsLab", "FormulaLab", "FunctionLab", "GraphStoryLab", "OptimizationLab"],
    rationale:
      "Realigned 2026-08-25 (California alignment audit, PR #143): CompareFunctionsLab declares itself a GRADE 8 lab (8.F.A.2, extended by F-IF.9), too low a register to anchor a grade-12 Modeling capstone by default; BestFitLab (fit a model to data, judge the fit — the FORMULATE/VALIDATE steps of the modeling cycle, S-ID.B.6) anchors instead, with CompareFunctionsLab's model-selection step one chip away. Modeling (CCSS star category) join retained."
  },
};

export function getSignatureLabAssignment(topicId: string | null | undefined) {
  if (!topicId) return null;
  return signatureLabAssignments[topicId] ?? null;
}

export function hasSignatureLab(topicId: string | null | undefined) {
  return getSignatureLabAssignment(topicId) !== null;
}
