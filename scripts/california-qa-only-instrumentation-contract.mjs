import { createHash } from "node:crypto";
import path from "node:path";

export const CALIFORNIA_SIGNATURE_SOURCE_ROOT = path.join(
  "components",
  "visualizations",
  "signature"
);

export const CALIFORNIA_QA_ONLY_RESERVED_BYTE_FAMILIES = Object.freeze({
  canvasHeader: "california-canvas-graphics-runtime-instrumented",
  canvasRuntime: "__californiaCanvasGraphicsRuntime",
  controlNamespace: "data-ca-source-",
  legacyControlAttribute: "data-ca-signature-qa-site",
  noDeployTerminator: "NO_DEPLOY */"
});

export const CALIFORNIA_QA_ONLY_RESERVED_BYTE_TOKENS = Object.freeze(
  Object.values(CALIFORNIA_QA_ONLY_RESERVED_BYTE_FAMILIES)
);

export const CALIFORNIA_COMPOSED_CONTROL_MARKER = Object.freeze({
  blueprintSha256: "5deadcb36c89272a406da254185831760b5a859d1f4d0fb2cbc5caeb207e845b",
  componentCount: 186,
  controlsInstrumented: 1_854,
  productBytesUnchanged: true,
  productSourceSha256: "ea07bd1b1e7721bf61d24ddd67879b02b1b8e96d707208e621f56d721290a745",
  stagingSourceSha256: "62be8c26a7db8b25808b29eaae3d1e66d10ca6f954167b77e91846d3d1d2fc0a",
  purpose: "California signature browser QA only",
  releaseEligible: false
});

export const CALIFORNIA_COMPOSED_CANVAS_MARKER = Object.freeze({
  animationCancellations: 96,
  animationSchedules: 150,
  benches: 186,
  contextRegistrations: 190,
  instrumentationVersion: 1,
  noDeploy: true,
  paintInvocations: 2_372,
  productSourceSha256: "ea07bd1b1e7721bf61d24ddd67879b02b1b8e96d707208e621f56d721290a745",
  sourceContractSha256: "a1610353a2508e3e87ac377c080e975858575c1a9a251e012cb2d14b6a5eb371"
});

// This is the reviewed manifest order consumed by aggregateSourceDigest() in
// tests/e2e/california-signature-composed-staging.ts. Bench ids are the exact
// filename stems; retaining the manifest order here is necessary because five
// semantically grouped pairs intentionally differ from locale sort order.
export const CALIFORNIA_COMPOSED_BENCH_SOURCE_FILES = Object.freeze([
  "AbsoluteValueLab.jsx",
  "AddLab.jsx",
  "AngleLab.jsx",
  "AngleTurnLab.jsx",
  "ArcsinLab.jsx",
  "AreaLab.jsx",
  "ArrangementsLab.jsx",
  "AssociativeAdditionLab.jsx",
  "AssociativeMultiplicationLab.jsx",
  "BestFitLab.jsx",
  "BoxPlotLab.jsx",
  "CircleLab.jsx",
  "CircleTheoremsLab.jsx",
  "ClosureLab.jsx",
  "CommutativeLab.jsx",
  "CompareFunctionsLab.jsx",
  "ComparingLab.jsx",
  "CompassLab.jsx",
  "ComplexArithmeticLab.jsx",
  "ComplexPlaneLab.jsx",
  "ComposingShapesLab.jsx",
  "CompositionLab.jsx",
  "ConditionalLab.jsx",
  "ConeLab.jsx",
  "CongruenceLab.jsx",
  "CoordinateMethodsLab.jsx",
  "CorrelationLab.jsx",
  "CosecantFunctionLab.jsx",
  "CosineFunctionLab.jsx",
  "CotangentFunctionLab.jsx",
  "CountingLab.jsx",
  "CovariationLab.jsx",
  "CrossSectionLab.jsx",
  "CubeLab.jsx",
  "CylinderLab.jsx",
  "DataLab.jsx",
  "DecimalArithmeticLab.jsx",
  "DecimalLab.jsx",
  "DilationsLab.jsx",
  "DistanceLab.jsx",
  "DistributiveLab.jsx",
  "DivisionLab.jsx",
  "EliminationLab.jsx",
  "EllipseLab.jsx",
  "EqualAreasLab.jsx",
  "EqualSharesLab.jsx",
  "EqualSignLab.jsx",
  "EquationLab.jsx",
  "EquivalentFractionsLab.jsx",
  "ExpectedValueLab.jsx",
  "ExponentRulesLab.jsx",
  "ExponentialFunctionLab.jsx",
  "ExpressionLab.jsx",
  "ExtraneousLab.jsx",
  "FactorLab.jsx",
  "FactoringQuadraticsLab.jsx",
  "FormulaLab.jsx",
  "FractionAdditionLab.jsx",
  "FractionAsDivisionLab.jsx",
  "FractionDivisionLab.jsx",
  "FractionLab.jsx",
  "FractionLinePlotLab.jsx",
  "FractionMultiplicationLab.jsx",
  "FractionTimesWholeLab.jsx",
  "FunctionLab.jsx",
  "GeometricModelingLab.jsx",
  "GramsAndLitersLab.jsx",
  "GraphStoryLab.jsx",
  "GraphsLab.jsx",
  "GreatestCommonFactorLab.jsx",
  "HistogramLab.jsx",
  "HundredChartLab.jsx",
  "HyperbolaLab.jsx",
  "InequalityLab.jsx",
  "IntegerLab.jsx",
  "IrrationalLab.jsx",
  "LCMLab.jsx",
  "LengthComparisonLab.jsx",
  "LikeTermsLab.jsx",
  "LineFunctionLab.jsx",
  "LineParabolaLab.jsx",
  "LinePlotLab.jsx",
  "LinesRaysSegmentsLab.jsx",
  "LogarithmLab.jsx",
  "LongDivisionLab.jsx",
  "LurkingVariableLab.jsx",
  "MeanLab.jsx",
  "MeasurementLab.jsx",
  "MedianLab.jsx",
  "ModeLab.jsx",
  "MoneyLab.jsx",
  "MultiDigitMultiplicationLab.jsx",
  "MultiplesLab.jsx",
  "MultiplicationLab.jsx",
  "MultiplicativeComparisonLab.jsx",
  "NormalDistributionLab.jsx",
  "NumberBondLab.jsx",
  "NumberLab.jsx",
  "OddEvenLab.jsx",
  "OperationsLab.jsx",
  "OptimizationLab.jsx",
  "ParabolaLab.jsx",
  "ParallelogramLab.jsx",
  "PatternsLab.jsx",
  "PercentChangeLab.jsx",
  "PercentageLab.jsx",
  "PerpSlopeLab.jsx",
  "PiLab.jsx",
  "PiecewiseLab.jsx",
  "PlaceJumpLab.jsx",
  "PlaceValueStrategiesLab.jsx",
  "PointLab.jsx",
  "PolynomialArithmeticLab.jsx",
  "PolynomialFunctionLab.jsx",
  "PositionLab.jsx",
  "PowersOfTenLab.jsx",
  "PrimeFactorizationLab.jsx",
  "PrimeNumbersLab.jsx",
  "ProbabilityLab.jsx",
  "ProofChainLab.jsx",
  "ProportionalLab.jsx",
  "PyramidLab.jsx",
  "PythagorasLab.jsx",
  "PythagoreanIdentityLab.jsx",
  "QuadraticEquationLab.jsx",
  "QuadraticFunctionLab.jsx",
  "QuadraticPolynomialLab.jsx",
  "QuadrilateralLab.jsx",
  "RatioLab.jsx",
  "RationalExponentLab.jsx",
  "RationalFunctionLab.jsx",
  "RationalNumbersLab.jsx",
  "RectangleLab.jsx",
  "RectangularPrismLab.jsx",
  "RegroupingSubtractionLab.jsx",
  "RemainderTheoremLab.jsx",
  "RevolutionLab.jsx",
  "RootsLab.jsx",
  "RoundingLab.jsx",
  "SamplingDistributionLab.jsx",
  "SamplingLab.jsx",
  "ScaleDrawingLab.jsx",
  "ScalingLab.jsx",
  "ScatterPlotLab.jsx",
  "ScientificNotationLab.jsx",
  "SecantFunctionLab.jsx",
  "SequencesLab.jsx",
  "SetTheoryLab.jsx",
  "ShapesLab.jsx",
  "SignedAdditionLab.jsx",
  "SignedNumbersLab.jsx",
  "SineFunctionLab.jsx",
  "SortLab.jsx",
  "SphereLab.jsx",
  "StandardDeviationLab.jsx",
  "StatisticalQuestionLab.jsx",
  "StoryProblemLab.jsx",
  "SubstitutionLab.jsx",
  "SubtractionLab.jsx",
  "SymmetryLab.jsx",
  "SystemsOfEquationsLab.jsx",
  "TableLab.jsx",
  "TangentFunctionLab.jsx",
  "TeenNumbersLab.jsx",
  "TimeLab.jsx",
  "TransformationsLab.jsx",
  "TranslateLab.jsx",
  "TransversalLab.jsx",
  "TrapezoidLab.jsx",
  "TreeDiagramLab.jsx",
  "TriangleBuildLab.jsx",
  "TriangleLab.jsx",
  "TriangleSolveLab.jsx",
  "TrigRatioLab.jsx",
  "TwoDigitNumberLab.jsx",
  "TwoDistributionsLab.jsx",
  "TwoStepLab.jsx",
  "TwoVariableInequalityLab.jsx",
  "UndoLab.jsx",
  "UnitCircleLab.jsx",
  "UnitConversionLab.jsx",
  "UnitFractionDivisionLab.jsx",
  "UnlikeDenominatorsLab.jsx",
  "VariableLab.jsx",
  "VarianceLab.jsx",
  "VolumeLab.jsx"
]);

export const CALIFORNIA_COMPOSED_NON_BENCH_JSX_FILES = Object.freeze([
  "DerivativeLab.jsx",
  "IntegralLab.jsx",
  "LimitLab.jsx",
  "MatrixLab.jsx",
  "SeriesLab.jsx",
  "VectorLab.jsx"
]);

export const CALIFORNIA_COMPOSED_FINAL_SOURCE_SHA256 =
  "a3105d8baca6128db99af5181eddf12ac0e7af7cc18caaf1313b9920f0ebc716";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function computeCaliforniaComposedSourceSha256(sourceByFileName) {
  if (!(sourceByFileName instanceof Map)) {
    throw new TypeError("California composed source inventory must be a Map");
  }
  if (sourceByFileName.size !== CALIFORNIA_COMPOSED_BENCH_SOURCE_FILES.length) {
    throw new Error(
      `California composed source inventory count mismatch ` +
      `(expected=${CALIFORNIA_COMPOSED_BENCH_SOURCE_FILES.length}; actual=${sourceByFileName.size})`
    );
  }
  const entries = CALIFORNIA_COMPOSED_BENCH_SOURCE_FILES.map((fileName) => {
    const source = sourceByFileName.get(fileName);
    if (source === undefined) {
      throw new Error(`California composed source inventory is missing ${fileName}`);
    }
    const benchId = path.basename(fileName, ".jsx");
    return `${benchId}\0${sha256(source)}`;
  });
  return sha256(entries.join("\n"));
}
