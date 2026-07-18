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
export const signatureLabIds = ["AbsoluteValueLab", "AddLab", "AngleLab", "AngleTurnLab", "ArcsinLab", "AreaLab", "ArrangementsLab", "AssociativeAdditionLab", "AssociativeMultiplicationLab", "BestFitLab", "BoxPlotLab", "CircleLab", "CircleTheoremsLab", "CommutativeLab", "CompareFunctionsLab", "ComparingLab", "CompassLab", "ComplexPlaneLab", "ComposingShapesLab", "ConditionalLab", "ConeLab", "CongruenceLab", "CorrelationLab", "CosecantFunctionLab", "CosineFunctionLab", "CotangentFunctionLab", "CountingLab", "CovariationLab", "CrossSectionLab", "CubeLab", "CylinderLab", "DataLab", "DecimalArithmeticLab", "DecimalLab", "DerivativeLab", "DilationsLab", "DistanceLab", "DistributiveLab", "DivisionLab", "EllipseLab", "EqualAreasLab", "EqualSharesLab", "EqualSignLab", "EquationLab", "EquivalentFractionsLab", "ExpectedValueLab", "ExponentRulesLab", "ExponentialFunctionLab", "ExpressionLab", "ExtraneousLab", "FactorLab", "FactoringQuadraticsLab", "FormulaLab", "FractionAdditionLab", "FractionAsDivisionLab", "FractionDivisionLab", "FractionLab", "FractionLinePlotLab", "FractionMultiplicationLab", "FractionTimesWholeLab", "FunctionLab", "GramsAndLitersLab", "GraphStoryLab", "GraphsLab", "GreatestCommonFactorLab", "HistogramLab", "HundredChartLab", "HyperbolaLab", "InequalityLab", "IntegerLab", "IntegralLab", "IrrationalLab", "LCMLab", "LengthComparisonLab", "LikeTermsLab", "LimitLab", "LineFunctionLab", "LineParabolaLab", "LinePlotLab", "LinesRaysSegmentsLab", "LogarithmLab", "LongDivisionLab", "LurkingVariableLab", "MatrixLab", "MeanLab", "MeasurementLab", "MedianLab", "ModeLab", "MoneyLab", "MultiDigitMultiplicationLab", "MultiplesLab", "MultiplicationLab", "MultiplicativeComparisonLab", "NormalDistributionLab", "NumberBondLab", "NumberLab", "OddEvenLab", "OperationsLab", "OptimizationLab", "ParabolaLab", "ParallelogramLab", "PatternsLab", "PercentChangeLab", "PercentageLab", "PerpSlopeLab", "PiLab", "PiecewiseLab", "PlaceValueStrategiesLab", "PointLab", "PolynomialArithmeticLab", "PolynomialFunctionLab", "PositionLab", "PowersOfTenLab", "PrimeFactorizationLab", "PrimeNumbersLab", "ProbabilityLab", "ProofChainLab", "ProportionalLab", "PyramidLab", "PythagorasLab", "PythagoreanIdentityLab", "QuadraticEquationLab", "QuadraticFunctionLab", "QuadraticPolynomialLab", "QuadrilateralLab", "RatioLab", "RationalExponentLab", "RationalFunctionLab", "RationalNumbersLab", "RectangleLab", "RectangularPrismLab", "RegroupingSubtractionLab", "RemainderTheoremLab", "RevolutionLab", "RootsLab", "RoundingLab", "SamplingDistributionLab", "SamplingLab", "ScaleDrawingLab", "ScalingLab", "ScatterPlotLab", "ScientificNotationLab", "SecantFunctionLab", "SequencesLab", "SeriesLab", "SetTheoryLab", "ShapesLab", "SignedAdditionLab", "SignedNumbersLab", "SineFunctionLab", "SortLab", "SphereLab", "StandardDeviationLab", "StatisticalQuestionLab", "SubstitutionLab", "SubtractionLab", "SymmetryLab", "SystemsOfEquationsLab", "TableLab", "TangentFunctionLab", "TeenNumbersLab", "TimeLab", "TransformationsLab", "TranslateLab", "TransversalLab", "TrapezoidLab", "TreeDiagramLab", "TriangleBuildLab", "TriangleLab", "TriangleSolveLab", "TrigRatioLab", "TwoDigitNumberLab", "TwoDistributionsLab", "TwoStepLab", "TwoVariableInequalityLab", "UndoLab", "UnitCircleLab", "UnitConversionLab", "UnitFractionDivisionLab", "UnlikeDenominatorsLab", "VariableLab", "VarianceLab", "VectorLab", "VolumeLab"] as const;
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
    primary: "SubtractionLab",
    related: ["NumberBondLab"],
    rationale:
      "CCSS join on K.OA.1, K.OA.2, K.OA.3, K.OA.4, K.OA.5. 2 benches share these standards; SubtractionLab anchors the topic (fan-out) and the rest are offered as related labs."
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
    related: ["NumberLab", "TeenNumbersLab", "TwoDigitNumberLab", "ComparingLab", "PlaceValueStrategiesLab", "RegroupingSubtractionLab"],
    rationale:
      "CCSS join on 1.NBT.1, 1.NBT.2, 1.NBT.3, 1.NBT.4, 1.NBT.5, 1.NBT.6. 7 benches share these standards; HundredChartLab anchors the topic (fan-out) and the rest are offered as related labs."
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
    related: ["ComparingLab", "PlaceValueStrategiesLab", "RegroupingSubtractionLab"],
    rationale:
      "CCSS join on 2.NBT.1, 2.NBT.2, 2.NBT.3, 2.NBT.4, 2.NBT.5, 2.NBT.6, 2.NBT.7, 2.NBT.8, 2.NBT.9. 4 benches share these standards; TwoDigitNumberLab anchors the topic (fan-out) and the rest are offered as related labs."
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
      "CCSS join on 3.OA.1, 3.OA.2, 3.OA.3, 3.OA.4, 3.OA.5, 3.OA.6, 3.OA.7, 3.OA.8, 3.OA.9. 8 benches share these standards; MultiplicationLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p3-3-nbt-arithmetic": {
    primary: "RoundingLab",
    related: [],
    rationale:
      "CCSS join on 3.NBT.1, 3.NBT.2, 3.NBT.3. 1 bench share this standard; RoundingLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p3-3-nf-fraction-meaning": {
    primary: "FractionLab",
    related: [],
    rationale:
      "CCSS join on 3.NF.1, 3.NF.2, 3.NF.3. 1 bench share this standard; FractionLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p3-3-md-time-data-area-perimeter": {
    primary: "TimeLab",
    related: ["GramsAndLitersLab", "GraphsLab", "AreaLab", "MultiplicationLab", "RectangleLab"],
    rationale:
      "CCSS join on 3.MD.1, 3.MD.2, 3.MD.3, 3.MD.4, 3.MD.5, 3.MD.6, 3.MD.7, 3.MD.8. 6 benches share these standards; TimeLab anchors the topic (fan-out) and the rest are offered as related labs."
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
    related: ["MoneyLab", "FractionLinePlotLab", "AngleTurnLab"],
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
    related: ["PowersOfTenLab", "RoundingLab", "MultiDigitMultiplicationLab", "DecimalArithmeticLab"],
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
    primary: "UnitConversionLab",
    related: ["FractionLinePlotLab", "VolumeLab"],
    rationale:
      "CCSS join on 5.MD.1, 5.MD.2, 5.MD.3, 5.MD.4, 5.MD.5. 3 benches share these standards; UnitConversionLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p5-5-g-coordinate-shapes": {
    primary: "PointLab",
    related: [],
    rationale:
      "CCSS join on 5.G.1, 5.G.2, 5.G.3, 5.G.4. 1 bench share this standard; PointLab anchors the topic (fan-out) and the rest are offered as related labs."
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
    related: ["DistributiveLab", "EquivalentFractionsLab", "GreatestCommonFactorLab", "LCMLab", "PrimeFactorizationLab", "IntegerLab", "PointLab", "RationalNumbersLab", "AbsoluteValueLab"],
    rationale:
      "CCSS join on 6.NS.1, 6.NS.2, 6.NS.3, 6.NS.4, 6.NS.5, 6.NS.6, 6.NS.7, 6.NS.8. 10 benches share these standards; FractionDivisionLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-p6-chapter-03": {
    primary: "OperationsLab",
    related: ["ExpressionLab", "FormulaLab", "TranslateLab", "CommutativeLab", "DistributiveLab", "LikeTermsLab", "InequalityLab", "VariableLab", "CovariationLab"],
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
    related: ["DistributiveLab", "FormulaLab", "InequalityLab"],
    rationale:
      "CCSS join on 7.EE.1, 7.EE.2, 7.EE.3, 7.EE.4. 4 benches share these standards; CommutativeLab anchors the topic (fan-out) and the rest are offered as related labs."
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
    related: ["RationalExponentLab", "RootsLab", "ScientificNotationLab", "ProportionalLab", "TwoVariableInequalityLab", "DilationsLab", "EquationLab", "SubstitutionLab", "SystemsOfEquationsLab"],
    rationale:
      "CCSS join on 8.EE.1, 8.EE.2, 8.EE.3, 8.EE.4, 8.EE.5, 8.EE.6, 8.EE.7, 8.EE.8. 10 benches share these standards; ExponentRulesLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s2-chapter-02": {
    primary: "FunctionLab",
    related: ["CompareFunctionsLab", "LineFunctionLab", "GraphStoryLab"],
    rationale:
      "CCSS join on 8.F.1, 8.F.2, 8.F.3, 8.F.4, 8.F.5. 4 benches share these standards; FunctionLab anchors the topic (fan-out) and the rest are offered as related labs."
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
    related: [],
    rationale:
      "CCSS join on A-CED.1, A-CED.2, A-CED.3, A-CED.4. 1 bench share this standard; FormulaLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s3-chapter-02": {
    primary: "FunctionLab",
    related: ["SequencesLab", "AbsoluteValueLab", "PiecewiseLab", "PolynomialFunctionLab", "QuadraticFunctionLab", "QuadraticPolynomialLab", "RationalFunctionLab", "CompareFunctionsLab"],
    rationale:
      "CCSS join on F-IF.1, F-IF.2, F-IF.3, F-IF.4, F-IF.5, F-IF.6, F-IF.7, F-IF.8, F-IF.9. 9 benches share these standards; FunctionLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s3-chapter-03": {
    primary: "ExponentialFunctionLab",
    related: ["LogarithmLab"],
    rationale:
      "F-LE.1-5 (linear vs exponential models). ExponentialFunctionLab's constant-ratio staircase is the defining contrast to linear growth, so it anchors the chapter; LogarithmLab (the exponential's inverse) rides along as related."
  },
  "us-ca-math-s3-chapter-04": {
    primary: "GraphStoryLab",
    related: ["BestFitLab", "CompareFunctionsLab", "FormulaLab", "FunctionLab", "OptimizationLab"],
    rationale:
      "Modeling (CCSS star category). GraphStoryLab has the student translate a real situation into a graph — the FORMULATE step of the modeling cycle — anchoring this Algebra-1 modeling chapter; the other modeling-cycle benches (fit, function, formula, optimise) are related."
  },
  "us-ca-math-s3-chapter-05": {
    primary: "BoxPlotLab",
    related: ["HistogramLab", "StandardDeviationLab", "VarianceLab", "NormalDistributionLab", "TableLab", "BestFitLab", "CorrelationLab", "LurkingVariableLab"],
    rationale:
      "Chapter anchors on S-ID.1-3 (distribution shape, centre, spread). BoxPlotLab is the only candidate that shows centre AND spread in one object, so it carries the chapter's core idea; the other candidates become related."
  },
  "us-ca-math-s4-chapter-01": {
    primary: "CongruenceLab",
    related: ["ProofChainLab", "CompassLab"],
    rationale:
      "CCSS join on G-CO.1, G-CO.2, G-CO.3, G-CO.4, G-CO.5, G-CO.6, G-CO.7, G-CO.8, G-CO.9, G-CO.10, G-CO.11, G-CO.12, G-CO.13. 3 benches share these standards; CongruenceLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s4-chapter-02": {
    primary: "DilationsLab",
    related: ["TrigRatioLab", "TriangleSolveLab"],
    rationale:
      "CCSS join on G-SRT.1, G-SRT.2, G-SRT.3, G-SRT.4, G-SRT.5, G-SRT.6, G-SRT.7, G-SRT.8, G-SRT.9, G-SRT.10, G-SRT.11. 3 benches share these standards; DilationsLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s4-chapter-03": {
    primary: "CircleTheoremsLab",
    related: [],
    rationale:
      "CCSS join on G-C.1, G-C.2, G-C.3, G-C.4, G-C.5. 1 bench share this standard; CircleTheoremsLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s4-chapter-04": {
    primary: "QuadraticEquationLab",
    related: ["FactoringQuadraticsLab", "QuadraticPolynomialLab"],
    rationale:
      "CCSS join on A-SSE.1, A-SSE.2, A-SSE.3, A-SSE.4. 3 benches share these standards; QuadraticEquationLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s4-chapter-05": {
    primary: "ConditionalLab",
    related: ["SetTheoryLab", "ArrangementsLab"],
    rationale:
      "CCSS join on S-CP.1, S-CP.2, S-CP.3, S-CP.4, S-CP.5, S-CP.6, S-CP.7, S-CP.8, S-CP.9. 3 benches share these standards; ConditionalLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s5-chapter-01": {
    primary: "SequencesLab",
    related: ["AbsoluteValueLab", "UndoLab"],
    rationale:
      "CCSS join on F-BF.1, F-BF.2, F-BF.3, F-BF.4, F-BF.5. 3 benches share these standards; SequencesLab anchors the topic (fan-out) and the rest are offered as related labs."
  },
  "us-ca-math-s5-chapter-02": {
    primary: "ExponentialFunctionLab",
    related: ["LogarithmLab"],
    rationale:
      "F-LE.1-5 (construct & compare linear/exponential models). Same anchor as S3 ch03: the exponential's constant-ratio growth carries the standard; related benches follow."
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
    primary: "BestFitLab",
    related: ["CompareFunctionsLab", "FormulaLab", "FunctionLab", "GraphStoryLab", "OptimizationLab"],
    rationale:
      "Modeling (CCSS star category). BestFitLab fits a model to data and reads its residual — the ESTIMATE/VALIDATE steps of the modeling cycle — anchoring this chapter; formulating and optimising benches are related."
  },
  "us-ca-math-s6-chapter-02": {
    primary: "PolynomialArithmeticLab",
    related: ["PolynomialFunctionLab", "RemainderTheoremLab", "RationalFunctionLab"],
    rationale:
      "CCSS join on A-APR.1, A-APR.2, A-APR.3, A-APR.4, A-APR.5, A-APR.6, A-APR.7. 4 benches share these standards; PolynomialArithmeticLab anchors the topic (fan-out) and the rest are offered as related labs."
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
    primary: "CompareFunctionsLab",
    related: ["BestFitLab", "FormulaLab", "FunctionLab", "GraphStoryLab", "OptimizationLab"],
    rationale:
      "Modeling (CCSS star category). CompareFunctionsLab is model selection — choosing the function family that best fits the situation, the INTERPRET step of the modeling cycle; fit, formula, and optimisation benches are related."
  },
};

export function getSignatureLabAssignment(topicId: string | null | undefined) {
  if (!topicId) return null;
  return signatureLabAssignments[topicId] ?? null;
}

export function hasSignatureLab(topicId: string | null | undefined) {
  return getSignatureLabAssignment(topicId) !== null;
}
