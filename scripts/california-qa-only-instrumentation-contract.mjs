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
  blueprintSha256: "6a58b21dcd064aba6ac2e9682e67ff461a723a0652fd41e2f228441d5243ad8d",
  componentCount: 188,
  controlsInstrumented: 1_872,
  productBytesUnchanged: true,
  productSourceSha256: "7cac88382bbdcaee2a940615a79b2b308b800d816868d4f6029638a81cd3e351",
  stagingSourceSha256: "c4632942f8899bb29223d5c6d3fe45a98c24bf3cdaa9031f3625dd028e6e89c0",
  purpose: "California signature browser QA only",
  releaseEligible: false
});

export const CALIFORNIA_COMPOSED_CANVAS_MARKER = Object.freeze({
  animationCancellations: 96,
  animationSchedules: 150,
  benches: 188,
  contextRegistrations: 192,
  instrumentationVersion: 1,
  noDeploy: true,
  paintInvocations: 2_385,
  productSourceSha256: "7cac88382bbdcaee2a940615a79b2b308b800d816868d4f6029638a81cd3e351",
  sourceContractSha256: "dd77f04df69deba79c675f5503039b934e63feb6de26731ff60f7c00da74f96b"
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
  "MatrixLab.jsx",
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
  "VectorLab.jsx",
  "VolumeLab.jsx"
]);

export const CALIFORNIA_COMPOSED_NON_BENCH_JSX_FILES = Object.freeze([
  "DerivativeLab.jsx",
  "IntegralLab.jsx",
  "LimitLab.jsx",
  "SeriesLab.jsx"
]);

export const CALIFORNIA_COMPOSED_FINAL_SOURCE_SHA256 =
  "841c759831bc70b10714ed01e59f094a050ec89b7fc6bfa849ae4cde086cf462";

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
