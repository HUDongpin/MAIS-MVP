import { isAbsolute, relative, resolve } from "node:path";
import { isHKPassThroughLabId } from "../../components/visualizations/hk/hkVisualizationLabRegistry";
import {
  HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLAN_BY_SEQUENCE_ID,
} from "./hk-visualization-dependent-transition-plan-manifest.mjs";
import {
  HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_PLAN_HASH,
  HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_PLANS,
  HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_VERSION,
  auditHkVisualizationPassThroughCrossStatePaintedGeometryPair,
} from "./hk-visualization-pass-through-painted-geometry-pair-oracle.mjs";
import type {
  HkVisualizationDependentVisibleMathAggregateAncestryScaleSummary,
  HkVisualizationDependentVisibleMathTheme,
} from "./hk-visualization-dependent-visible-math-contract";
import {
  assertHkVisualizationDependentTransitionSequenceObservationShape,
  auditHkVisualizationPassThroughResetObservation,
  auditHkP6BudgetBoundaryObservation,
  auditHkP6AveragesLineGraphObservation,
  buildHkVisualizationPassThroughResetActionPlan,
  hashHkVisualizationPassThroughResetLayerPair,
  hashHkVisualizationDependentTransitionCanonicalVisibleBaseline,
  hashHkVisualizationDependentTransitionSequenceObservation,
  hkVisualizationDependentTransitionSequenceIdsForLab,
  HK_VISUALIZATION_DEPENDENT_TRANSITION_PHASE_IDS,
  HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_SCHEMA_VERSION,
  HK_VISUALIZATION_PASS_THROUGH_RESET_ACTION_COUNT,
  HK_VISUALIZATION_PASS_THROUGH_RESET_CONTRACT_VERSION,
  HK_VISUALIZATION_PASS_THROUGH_RESET_LAYER_IDS,
  type HkVisualizationDependentTransitionLanguage,
  type HkVisualizationDependentTransitionPhaseId,
  type HkVisualizationDependentTransitionSequenceId,
  type HkVisualizationDependentTransitionSequenceObservation,
  type HkP6BudgetBoundaryKind,
  type HkP6BudgetBoundaryObservation,
  type HkP6AveragesLineGraphObservation,
  type HkVisualizationPassThroughResetObservation,
  type HkVisualizationPassThroughResetLayerPair,
  type HkVisualizationPassThroughResetState,
} from "./hk-visualization-range-state-ledger";
import {
  buildHkVisualizationScrollObservationSet,
  calculateHkVisualizationAuditedExecutionMs,
  canonicalHkVisualizationJson,
  HK_VISUALIZATION_SCROLL_POSITION_AUDIT_IDS,
  HK_VISUALIZATION_STATE_CHUNK_CONTRACT_VERSION,
  sha256HkVisualizationCanonical,
  type HkVisualizationScrollObservationSet,
  type HkVisualizationStateCellPlan,
} from "./hk-visualization-state-chunk-contract";

export const HK_VISUALIZATION_BROWSER_SCROLL_AGGREGATE_VERSION =
  "hk-viz-browser-scroll-aggregate-v1" as const;
export const HK_VISUALIZATION_BROWSER_SCROLL_ANNOTATION_TYPE =
  "hk-viz-scroll-observation-aggregate" as const;
export const HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION =
  "hk-viz-browser-dependent-transition-aggregate-v2" as const;
export const HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_ANNOTATION_TYPE =
  "hk-viz-dependent-transition-aggregate" as const;
export const HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION =
  "hk-viz-browser-pass-through-oracle-aggregate-v1" as const;
export const HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_ANNOTATION_TYPE =
  "hk-viz-pass-through-oracle-aggregate" as const;
export const HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_AGGREGATE_VERSION =
  "hk-viz-browser-pass-through-painted-geometry-pair-aggregate-v1" as const;
export const HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_ANNOTATION_TYPE =
  "hk-viz-pass-through-painted-geometry-pair-aggregate" as const;
export const HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_AGGREGATE_VERSION =
  "hk-viz-browser-pass-through-reset-aggregate-v3" as const;
export const HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_ANNOTATION_TYPE =
  "hk-viz-pass-through-reset-aggregate" as const;
export const HK_VISUALIZATION_BROWSER_P6_AVERAGES_AGGREGATE_VERSION =
  "hk-viz-browser-p6-averages-aggregate-v1" as const;
export const HK_VISUALIZATION_BROWSER_P6_AVERAGES_ANNOTATION_TYPE =
  "hk-viz-p6-averages-boundary-aggregate" as const;
export const HK_VISUALIZATION_BROWSER_P6_BUDGET_AGGREGATE_VERSION =
  "hk-viz-browser-p6-budget-aggregate-v1" as const;
export const HK_VISUALIZATION_BROWSER_P6_BUDGET_ANNOTATION_TYPE =
  "hk-viz-p6-budget-boundary-aggregate" as const;

export type HkVisualizationBrowserRuntimePaths = Readonly<{
  artifactRoot: string;
  browserProfileRoot: string;
}>;

export function canonicalHkVisualizationBrowserRuntimePaths(
  paths: HkVisualizationBrowserRuntimePaths,
): HkVisualizationBrowserRuntimePaths {
  const starshipRoot = resolve("/Volumes/Starship");
  const canonical = (label: string, value: string) => {
    if (typeof value !== "string" || !value.trim() || !isAbsolute(value)) {
      throw new Error(`${label} must be a non-empty absolute path.`);
    }
    const absolute = resolve(value);
    const fromStarship = relative(starshipRoot, absolute);
    if (
      !fromStarship ||
      fromStarship.startsWith("..") ||
      isAbsolute(fromStarship)
    ) {
      throw new Error(`${label} must be an absolute Starship descendant.`);
    }
    return absolute;
  };
  const artifactRoot = canonical("artifactRoot", paths.artifactRoot);
  const browserProfileRoot = canonical(
    "browserProfileRoot",
    paths.browserProfileRoot,
  );
  if (artifactRoot === browserProfileRoot) {
    throw new Error(
      "artifactRoot and browserProfileRoot must be distinct Starship descendants.",
    );
  }
  const profileFromArtifact = relative(artifactRoot, browserProfileRoot);
  if (
    !profileFromArtifact ||
    profileFromArtifact.startsWith("..") ||
    isAbsolute(profileFromArtifact)
  ) {
    throw new Error("browserProfileRoot must be inside artifactRoot.");
  }
  return Object.freeze({ artifactRoot, browserProfileRoot });
}

export type HkVisualizationBrowserChunkStateReceipt = Readonly<{
  expectedSignature: string;
  observedSignature: string;
  phase: string;
  scrollObservationSet: HkVisualizationScrollObservationSet;
  startingObservedSignature: string;
  startingSignature: string;
  stateId: string;
  stateIndex: number;
}>;

export type HkVisualizationBrowserChunkReceipt = Readonly<{
  budgetTotalMs: number;
  cellExecutionHash: string;
  chunkId: string;
  end: number;
  pageInstanceId: string;
  planHash: string;
  recomputedCellExecutionHash: string;
  recomputedPlanHash: string;
  start: number;
  stateReceipts: readonly HkVisualizationBrowserChunkStateReceipt[];
}>;

export type HkVisualizationBrowserChunkAggregate = Readonly<{
  cellExecutionHash: string;
  chunkCount: number;
  executedStateIds: readonly string[];
  freshPageCount: number;
  planHash: string;
  plannedStateIds: readonly string[];
  scrollContainerCount: number;
  scrollObservationAggregateHash: string;
  scrollObservationCount: number;
  scrollObservationSetCount: number;
  scrollPositionAuditCount: number;
  stateCount: number;
}>;

export type HkVisualizationBrowserScrollObservationReceipt = Readonly<{
  observationSet: HkVisualizationScrollObservationSet;
  phase: string;
}>;

export type HkVisualizationBrowserScrollCellReceipt = Readonly<{
  cellId: string;
  scrollObservationPhasePlan: readonly string[];
  scrollObservationSets: readonly HkVisualizationBrowserScrollObservationReceipt[];
}>;

export type HkVisualizationBrowserScrollCellPlan = Readonly<{
  cellId: string;
  phases: readonly string[];
}>;

export type HkVisualizationBrowserScrollPlanInput = Readonly<{
  cellId: string;
  interactions: readonly Readonly<{
    action: string;
    status: "failed" | "passed" | "skipped";
  }>[];
  stateScanLedger: Readonly<{
    entries: readonly Readonly<{
      id: string;
      modeId: string;
      phase: string;
    }>[];
    executedStateIds: readonly string[];
    plannedStateIds: readonly string[];
  }>;
}>;

export type HkVisualizationBrowserScrollCellEvidence = Readonly<{
  auditedExecutionMs: number;
  cellId: string;
  observationSetHashes: readonly string[];
  phasePlanHash: string;
  phases: readonly string[];
  receiptAggregateHash: string;
  scheduleHashes: readonly string[];
  scrollContainerCount: number;
  scrollObservationCount: number;
  scrollObservationSetCount: number;
  scrollPositionAuditCount: number;
}>;

export type HkVisualizationBrowserScrollAggregate = Readonly<{
  aggregateHash: string;
  auditedExecutionMs: number;
  cellCount: number;
  cellIds: readonly string[];
  cells: readonly HkVisualizationBrowserScrollCellEvidence[];
  contractVersion: typeof HK_VISUALIZATION_BROWSER_SCROLL_AGGREGATE_VERSION;
  phasePlanAggregateHash: string;
  scrollContainerCount: number;
  scrollObservationAggregateHash: string;
  scrollObservationCount: number;
  scrollObservationSetCount: number;
  scrollPositionAuditCount: number;
}>;

export type HkVisualizationBrowserDependentTransitionCellReceipt = Readonly<{
  cellId: string;
  dependentTransitionSequenceObservations:
    readonly HkVisualizationDependentTransitionSequenceObservation[];
  labId: string;
  language: HkVisualizationDependentTransitionLanguage;
}>;

export type HkVisualizationBrowserDependentTransitionSequenceEvidence =
  Readonly<{
    canonicalFingerprint: string;
    canonicalVisibleBaselineHash: string;
    cellId: string;
    labId: string;
    language: HkVisualizationDependentTransitionLanguage;
    observationHash: string;
    phaseCount: 3;
    phaseIds: readonly HkVisualizationDependentTransitionPhaseId[];
    phaseObservationHashes: readonly string[];
    planHash: string;
    postSequenceRestorationHash: string;
    projectionMatrixHash: string;
    schemaVersion:
      typeof HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_SCHEMA_VERSION;
    sequenceAggregateHash: string;
    sequenceId: HkVisualizationDependentTransitionSequenceId;
    theme: HkVisualizationDependentVisibleMathTheme;
    visibleMathProjectionEvidence: Readonly<{
      ancestryScaleSummaries:
        readonly HkVisualizationDependentVisibleMathAggregateAncestryScaleSummary[];
      ancestryScaleSummariesHash: string;
      elementCounts: readonly number[];
      elementCountsHash: string;
      projectionCount: 5;
      projectionHashes: readonly string[];
      projectionHashesHash: string;
      topologyHash: string;
      totalElementCount: number;
    }>;
  }>;

export type HkVisualizationBrowserDependentTransitionCellEvidence = Readonly<{
  canonicalFingerprint: string;
  cellAggregateHash: string;
  cellId: string;
  labId: string;
  language: HkVisualizationDependentTransitionLanguage;
  phaseObservationCount: number;
  sequenceCount: number;
  sequenceIds: readonly HkVisualizationDependentTransitionSequenceId[];
  sequenceObservationHashes: readonly string[];
  sequences: readonly HkVisualizationBrowserDependentTransitionSequenceEvidence[];
  theme: HkVisualizationDependentVisibleMathTheme;
}>;

export type HkVisualizationBrowserDependentTransitionAggregate = Readonly<{
  aggregateHash: string;
  cellCount: number;
  cells: readonly HkVisualizationBrowserDependentTransitionCellEvidence[];
  contractVersion:
    typeof HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION;
  phaseObservationCount: number;
  scrollPackageAggregateHash: string;
  sequenceObservationCount: number;
  topologyHash: string;
}>;

type HkVisualizationBrowserOracleSelectorEvidence = Readonly<{
  count: number;
  learnerVisibleCount: number;
}>;

export type HkVisualizationBrowserRawPassThroughOracleObservation = Readonly<{
  activeModeIds: readonly string[];
  formulaText: string;
  labId: string;
  modelIdentity: Readonly<Record<string, unknown>>;
  modeSelectorEvidence: Readonly<Record<string, unknown>>;
  phase: string;
  rawRendererState: Readonly<{
    attribute: "data-viz-math-state" | "data-viz-state-json";
    selectorEvidence: HkVisualizationBrowserOracleSelectorEvidence;
    serializedState: string | null;
  }>;
  selectorEvidence: Readonly<
    Record<
      "formula" | "model" | "reset" | "root" | "state",
      HkVisualizationBrowserOracleSelectorEvidence
    >
  >;
  state: Readonly<Record<string, unknown>>;
  visibleEvidenceText: string;
  visibleMathMarks: Readonly<Record<string, readonly unknown[]>>;
  visibleNamedMarks: readonly string[];
}>;

export type HkVisualizationBrowserPassThroughOracleCellReceipt = Readonly<{
  cellId: string;
  labId: string;
  passThroughOracleObservations: readonly HkVisualizationBrowserRawPassThroughOracleObservation[];
}>;

export type HkVisualizationBrowserPassThroughOracleObservationEvidence =
  Readonly<{
    observationHash: string;
    phase: string;
    publicState: Readonly<{
      selectorEvidence: HkVisualizationBrowserOracleSelectorEvidence;
      state: Readonly<Record<string, unknown>>;
    }>;
    publicStateHash: string;
    rawRendererState: Readonly<{
      attribute: "data-viz-math-state" | "data-viz-state-json";
      selectorEvidence: HkVisualizationBrowserOracleSelectorEvidence;
      serializedState: string;
    }>;
    rawRendererStateHash: string;
    visibleGeometry: Readonly<{
      formulaText: string;
      visibleMathMarks: Readonly<Record<string, readonly unknown[]>>;
      visibleNamedMarks: readonly string[];
    }>;
    visibleGeometryHash: string;
  }>;

export type HkVisualizationBrowserPassThroughOracleCellEvidence = Readonly<{
  cellAggregateHash: string;
  cellId: string;
  kind: "dedicated" | "pass-through";
  labId: string;
  observationCount: number;
  observationHashes: readonly string[];
  observations: readonly HkVisualizationBrowserPassThroughOracleObservationEvidence[];
  phases: readonly string[];
}>;

export type HkVisualizationBrowserPassThroughOracleAggregate = Readonly<{
  aggregateHash: string;
  cellCount: number;
  cells: readonly HkVisualizationBrowserPassThroughOracleCellEvidence[];
  contractVersion: typeof HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION;
  observationCount: number;
  passThroughCellCount: number;
}>;

export type HkVisualizationBrowserPassThroughPaintedGeometryPairEndpointRef =
  Readonly<{
    observationHash: string;
    observationIndex: number;
    phase: string;
  }>;

export type HkVisualizationBrowserPassThroughPaintedGeometryLayerPair =
  Readonly<{
    afterHash: string;
    beforeHash: string;
    layer: "public" | "raw" | "visible";
    pairHash: string;
  }>;

export type HkVisualizationBrowserPassThroughPaintedGeometryPairEvidence =
  Readonly<{
    afterRef: HkVisualizationBrowserPassThroughPaintedGeometryPairEndpointRef;
    beforeRef: HkVisualizationBrowserPassThroughPaintedGeometryPairEndpointRef;
    cellId: string;
    labId: "statistics-s1" | "data-handling" | "advanced-functions";
    layerEndpointHashCount: 6;
    layerPairs:
      readonly HkVisualizationBrowserPassThroughPaintedGeometryLayerPair[];
    layerReceiptCount: 3;
    oraclePlanHash: typeof HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_PLAN_HASH;
    oracleVersion: typeof HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_VERSION;
    pairHash: string;
  }>;

export type HkVisualizationBrowserPassThroughPaintedGeometryPairCellEvidence =
  Readonly<{
    cellAggregateHash: string;
    cellId: string;
    endpointCount: 0 | 2;
    kind: "applicable" | "not-applicable";
    labId: string;
    layerEndpointHashCount: 0 | 6;
    layerReceiptCount: 0 | 3;
    pair: HkVisualizationBrowserPassThroughPaintedGeometryPairEvidence | null;
    pairCount: 0 | 1;
  }>;

export type HkVisualizationBrowserPassThroughPaintedGeometryPairAggregate =
  Readonly<{
    aggregateHash: string;
    cellCount: number;
    cells:
      readonly HkVisualizationBrowserPassThroughPaintedGeometryPairCellEvidence[];
    contractVersion:
      typeof HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_AGGREGATE_VERSION;
    endpointCount: number;
    layerEndpointHashCount: number;
    layerReceiptCount: number;
    oraclePackageAggregateHash: string;
    oraclePlanHash: typeof HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_PLAN_HASH;
    oracleVersion: typeof HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_VERSION;
    pairCount: number;
    scrollPackageAggregateHash: string;
  }>;

export type HkVisualizationBrowserPassThroughResetCellReceipt = Readonly<{
  cellId: string;
  labId: string;
  passThroughResetObservations: readonly HkVisualizationPassThroughResetObservation[];
}>;

export type HkVisualizationBrowserPassThroughResetEndpointReceipt = Readonly<{
  afterEndpoint: HkVisualizationBrowserPassThroughOracleObservationEvidence;
  beforeEndpoint: HkVisualizationBrowserPassThroughOracleObservationEvidence;
  layerEndpointHashCount: 6;
  layerPairs: readonly HkVisualizationPassThroughResetLayerPair[];
  layerReceiptCount: 3;
}>;

export type HkVisualizationBrowserPassThroughResetObservationEvidence = Readonly<{
  actionIndex: number;
  activationKey: "Enter" | "Space";
  actionKind: "restoring" | "canonical-noop";
  afterEndpoint: HkVisualizationBrowserPassThroughOracleObservationEvidence;
  afterFingerprint: string;
  afterState: HkVisualizationPassThroughResetState;
  beforeEndpoint: HkVisualizationBrowserPassThroughOracleObservationEvidence;
  beforeFingerprint: string;
  beforeState: HkVisualizationPassThroughResetState;
  canonicalFingerprint: string;
  expectedState: HkVisualizationPassThroughResetState;
  layerEndpointHashCount: 6;
  layerPairs: readonly HkVisualizationPassThroughResetLayerPair[];
  layerReceiptCount: 3;
  observationHash: string;
  phase: string;
}>;

export type HkVisualizationBrowserPassThroughResetCellEvidence = Readonly<{
  canonicalNoopActionCount: number;
  cellAggregateHash: string;
  cellId: string;
  kind: "dedicated" | "pass-through";
  labId: string;
  layerEndpointHashCount: number;
  layerReceiptCount: number;
  observationCount: number;
  observationHashes: readonly string[];
  observations: readonly HkVisualizationBrowserPassThroughResetObservationEvidence[];
  phases: readonly string[];
  restoringActionCount: number;
}>;

export type HkVisualizationBrowserPassThroughResetAggregate = Readonly<{
  aggregateHash: string;
  canonicalNoopActionCount: number;
  cellCount: number;
  cells: readonly HkVisualizationBrowserPassThroughResetCellEvidence[];
  contractVersion: typeof HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_AGGREGATE_VERSION;
  layerEndpointHashCount: number;
  layerReceiptCount: number;
  observationCount: number;
  passThroughCellCount: number;
  restoringActionCount: number;
}>;

export type HkVisualizationBrowserP6AveragesCellReceipt = Readonly<{
  cellId: string;
  labId: string;
  p6AveragesLineGraphObservations: readonly HkP6AveragesLineGraphObservation[];
  stateScanLedger: Readonly<{
    entries: readonly Readonly<{
      id: string;
      phase: string;
      reasons: readonly string[];
    }>[];
    executedStateIds: readonly string[];
    plannedStateIds: readonly string[];
  }>;
}>;

export type HkVisualizationBrowserP6AveragesBoundaryEvidence = Readonly<{
  boundary: "ordinary-positive" | "zero-shift";
  observation: HkP6AveragesLineGraphObservation;
  observationHash: string;
  phase: string;
}>;

export type HkVisualizationBrowserP6AveragesCellEvidence = Readonly<{
  boundaries: readonly HkVisualizationBrowserP6AveragesBoundaryEvidence[];
  boundaryCount: 2;
  cellAggregateHash: string;
  cellId: string;
  labId: "p6-ratio-proportion";
  phases: readonly string[];
}>;

export type HkVisualizationBrowserP6AveragesAggregate = Readonly<{
  aggregateHash: string;
  boundaryObservationCount: number;
  cellCount: number;
  cells: readonly HkVisualizationBrowserP6AveragesCellEvidence[];
  contractVersion: typeof HK_VISUALIZATION_BROWSER_P6_AVERAGES_AGGREGATE_VERSION;
}>;

export type HkVisualizationBrowserP6BudgetCellReceipt = Readonly<{
  cellId: string;
  labId: string;
  p6BudgetBoundaryObservations: readonly HkP6BudgetBoundaryObservation[];
  stateScanLedger: Readonly<{
    entries: readonly Readonly<{
      id: string;
      modeId: string;
      phase: string;
      reasons: readonly string[];
    }>[];
    executedStateIds: readonly string[];
    plannedStateIds: readonly string[];
  }>;
}>;

export type HkVisualizationBrowserP6BudgetBoundaryEvidence = Readonly<{
  boundary: HkP6BudgetBoundaryKind;
  modeId: "represent" | "solve" | "check";
  observation: HkP6BudgetBoundaryObservation;
  observationHash: string;
  phase: string;
}>;

export type HkVisualizationBrowserP6BudgetCellEvidence = Readonly<{
  boundaries: readonly HkVisualizationBrowserP6BudgetBoundaryEvidence[];
  boundaryCount: 9;
  cellAggregateHash: string;
  cellId: string;
  labId: "p6-pre-secondary-problem-solving";
  phases: readonly string[];
}>;

export type HkVisualizationBrowserP6BudgetAggregate = Readonly<{
  aggregateHash: string;
  boundaryObservationCount: number;
  cellCount: number;
  cells: readonly HkVisualizationBrowserP6BudgetCellEvidence[];
  contractVersion: typeof HK_VISUALIZATION_BROWSER_P6_BUDGET_AGGREGATE_VERSION;
}>;

const HK_P6_AVERAGES_LAB_ID = "p6-ratio-proportion" as const;
const HK_P6_BUDGET_LAB_ID = "p6-pre-secondary-problem-solving" as const;
const HK_P6_ZERO_SHIFT_REASON =
  "semantic-boundary:p6-series-shift-zero" as const;
const HK_P6_POSITIVE_SHIFT_REASON =
  "semantic-boundary:p6-series-shift-positive" as const;

function exactObjectKeys(
  label: string,
  value: unknown,
  expectedKeys: readonly string[],
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a plain object.`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (canonicalHkVisualizationJson(actual) !== canonicalHkVisualizationJson(expected)) {
    throw new Error(`${label} must contain exactly ${expected.join(", ")}.`);
  }
}

function nonEmpty(label: string, value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

function addSafe(label: string, left: number, right: number) {
  const sum = left + right;
  if (!Number.isSafeInteger(sum) || sum < 0) {
    throw new Error(`${label} overflowed the safe integer range.`);
  }
  return sum;
}

function canonicalClone<T>(label: string, value: T): T {
  try {
    return JSON.parse(canonicalHkVisualizationJson(value)) as T;
  } catch (error) {
    throw new Error(
      `${label} is not canonical JSON evidence: ${error instanceof Error ? error.message : String(error)}.`,
    );
  }
}

function parseCanonicalPassThroughRawState(
  label: string,
  serializedState: unknown,
) {
  if (typeof serializedState !== "string" || !serializedState) {
    throw new Error(`${label} must be one canonical plain-object JSON string.`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(serializedState);
  } catch {
    throw new Error(`${label} must be valid canonical JSON.`);
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    Object.getPrototypeOf(parsed) !== Object.prototype ||
    JSON.stringify(parsed) !== serializedState
  ) {
    throw new Error(`${label} must be one canonical plain-object JSON string.`);
  }
  return parsed;
}

function exactOracleSelectorEvidence(
  label: string,
  raw: unknown,
): HkVisualizationBrowserOracleSelectorEvidence {
  exactObjectKeys(label, raw, ["count", "learnerVisibleCount"]);
  const candidate = raw as Record<string, unknown>;
  for (const field of ["count", "learnerVisibleCount"] as const) {
    if (!Number.isSafeInteger(candidate[field]) || Number(candidate[field]) < 0) {
      throw new Error(`${label}.${field} must be a non-negative safe integer.`);
    }
  }
  if (candidate.count !== 1 || candidate.learnerVisibleCount !== 1) {
    throw new Error(
      `${label} must identify exactly one learner-visible selector; observed ${String(candidate.count)}/${String(candidate.learnerVisibleCount)}.`,
    );
  }
  return Object.freeze({
    count: candidate.count as number,
    learnerVisibleCount: candidate.learnerVisibleCount as number,
  });
}

function labIdFromCellId(cellId: string) {
  const segments = cellId.split("/");
  if (segments.length !== 5 || segments.some((segment) => !segment.trim())) {
    throw new Error(
      `Browser oracle cellId ${cellId} must be grade/lab/viewport/language/theme.`,
    );
  }
  return segments[1];
}

function dependentTransitionLanguageFromCellId(
  cellId: string,
): HkVisualizationDependentTransitionLanguage {
  const segments = cellId.split("/");
  if (segments.length !== 5 || segments.some((segment) => !segment.trim())) {
    throw new Error(
      `Browser dependent-transition cellId ${cellId} must be grade/lab/viewport/language/theme.`,
    );
  }
  const language = segments[3];
  if (language !== "en" && language !== "zh" && language !== "zh-Hans") {
    throw new Error(
      `Browser dependent-transition cellId ${cellId} has unsupported language ${language}.`,
    );
  }
  return language;
}

function dependentTransitionThemeFromCellId(
  cellId: string,
): HkVisualizationDependentVisibleMathTheme {
  const segments = cellId.split("/");
  if (segments.length !== 5 || segments.some((segment) => !segment.trim())) {
    throw new Error(
      `Browser dependent-transition cellId ${cellId} must be grade/lab/viewport/language/theme.`,
    );
  }
  const theme = segments[4];
  if (theme !== "dark" && theme !== "light") {
    throw new Error(
      `Browser dependent-transition cellId ${cellId} has unsupported theme ${theme}.`,
    );
  }
  return theme;
}

function requireDependentTransitionHash(label: string, value: unknown) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256.`);
  }
  return value;
}

const DEPENDENT_TRANSITION_VISIBLE_MATH_PROJECTION_SOURCES = Object.freeze([
  "canonical-visible-baseline",
  "phase:pre",
  "phase:clamp",
  "phase:expand",
  "post-sequence-restoration",
] as const);

function dependentTransitionVisibleMathProjectionEvidence(
  observation: HkVisualizationDependentTransitionSequenceObservation,
  language: HkVisualizationDependentTransitionLanguage,
  theme: HkVisualizationDependentVisibleMathTheme,
) {
  const sourcePlan =
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLAN_BY_SEQUENCE_ID[
      observation.sequenceId
    ];
  if (!sourcePlan) {
    throw new Error(
      `Browser dependent-transition sequence ${observation.sequenceId} has no exact source plan.`,
    );
  }
  const projections = Object.freeze([
    observation.canonicalVisibleBaseline.visibleMathProjection,
    ...observation.phases.map(({ visibleMathProjection }) =>
      visibleMathProjection
    ),
    observation.postSequenceRestoration.visibleMathProjection,
  ]);
  if (projections.length !== 5) {
    throw new Error(
      `Browser dependent-transition sequence ${observation.sequenceId} requires exact five visible-math projections.`,
    );
  }
  const ancestryScaleSummaries = Object.freeze(projections.map(
    ({ ancestryScaleSummary }) => Object.freeze(canonicalClone(
      "dependent-transition ancestry/scale summary",
      ancestryScaleSummary,
    )),
  ));
  const elementCounts = Object.freeze(
    projections.map(({ elementCount }) => elementCount),
  );
  const projectionHashes = Object.freeze(
    projections.map(({ hash }) => hash),
  );
  projectionHashes.forEach((hash, index) =>
    requireDependentTransitionHash(
      `dependent-transition visible-math projection[${index}].hash`,
      hash,
    )
  );
  const ancestryScaleSummariesHash = sha256HkVisualizationCanonical({
    contractVersion: observation.schemaVersion,
    kind: "dependent-transition-visible-math-ancestry-scale-summaries",
    sequenceId: observation.sequenceId,
    summaries: ancestryScaleSummaries,
  });
  const elementCountsHash = sha256HkVisualizationCanonical({
    contractVersion: observation.schemaVersion,
    elementCounts,
    kind: "dependent-transition-visible-math-element-counts",
    sequenceId: observation.sequenceId,
  });
  const projectionHashesHash = sha256HkVisualizationCanonical({
    contractVersion: observation.schemaVersion,
    hashes: projectionHashes,
    kind: "dependent-transition-visible-math-projection-hashes",
    sequenceId: observation.sequenceId,
  });
  const topologyHash = sha256HkVisualizationCanonical({
    contractVersion: observation.schemaVersion,
    kind: "dependent-transition-visible-math-projection-topology",
    projections: projections.map((projection, index) => ({
      ancestryScaleSummary: projection.ancestryScaleSummary,
      elementCount: projection.elementCount,
      hash: projection.hash,
      source: DEPENDENT_TRANSITION_VISIBLE_MATH_PROJECTION_SOURCES[index],
    })),
    sequenceId: observation.sequenceId,
  });
  const totalElementCount = elementCounts.reduce(
    (total, elementCount) =>
      addSafe("dependent-transition visible-math element count", total, elementCount),
    0,
  );
  const expected = sourcePlan.visibleMathProjectionTopologies[language][theme];
  const actualTopology = {
    ancestryScaleSummaries,
    ancestryScaleSummariesHash,
    elementCounts,
    elementCountsHash,
    projectionCount: 5,
    projectionHashes,
    projectionHashesHash,
    topologyHash,
    totalElementCount,
  };
  if (
    canonicalHkVisualizationJson(actualTopology) !==
      canonicalHkVisualizationJson(expected)
  ) {
    throw new Error(
      `Browser dependent-transition sequence ${observation.sequenceId} visible-math projection topology drifted for ${language}/${theme}.`,
    );
  }
  return Object.freeze({
    ancestryScaleSummaries,
    ancestryScaleSummariesHash,
    elementCounts,
    elementCountsHash,
    projectionCount: 5 as const,
    projectionHashes,
    projectionHashesHash,
    topologyHash,
    totalElementCount,
  });
}

function canonicalPassThroughOracleObservation(
  cellId: string,
  labId: string,
  expectedPhase: string,
  raw: HkVisualizationBrowserRawPassThroughOracleObservation,
  index: number,
): HkVisualizationBrowserPassThroughOracleObservationEvidence {
  const label = `browser pass-through oracle ${cellId} observation ${index}`;
  exactObjectKeys(label, raw, [
    "activeModeIds",
    "formulaText",
    "labId",
    "modelIdentity",
    "modeSelectorEvidence",
    "phase",
    "rawRendererState",
    "selectorEvidence",
    "state",
    "visibleEvidenceText",
    "visibleMathMarks",
    "visibleNamedMarks",
  ]);
  if (raw.labId !== labId) {
    throw new Error(`${label}.labId=${String(raw.labId)} mismatches ${labId}.`);
  }
  if (raw.phase !== expectedPhase) {
    throw new Error(
      `${label}.phase=${String(raw.phase)} differs from exact ordered phase ${expectedPhase}.`,
    );
  }
  if (!raw.state || typeof raw.state !== "object" || Array.isArray(raw.state)) {
    throw new Error(`${label}.state must be one public projected state object.`);
  }
  if (!raw.selectorEvidence || typeof raw.selectorEvidence !== "object") {
    throw new Error(`${label}.selectorEvidence must be an object.`);
  }
  const publicState = Object.freeze({
    selectorEvidence: exactOracleSelectorEvidence(
      `${label}.public state selector`,
      raw.selectorEvidence.state,
    ),
    state: Object.freeze(
      canonicalClone(`${label}.public projected state`, raw.state),
    ),
  });
  if (Object.keys(publicState.state).length === 0) {
    throw new Error(`${label}.public projected state must be non-empty.`);
  }

  exactObjectKeys(`${label}.rawRendererState`, raw.rawRendererState, [
    "attribute",
    "selectorEvidence",
    "serializedState",
  ]);
  if (
    raw.rawRendererState.attribute !== "data-viz-math-state" &&
    raw.rawRendererState.attribute !== "data-viz-state-json"
  ) {
    throw new Error(`${label}.raw renderer attribute is unsupported.`);
  }
  const serializedState = raw.rawRendererState.serializedState;
  if (typeof serializedState !== "string") {
    throw new Error(
      `${label}.raw renderer serializedState must be one canonical plain-object JSON string.`,
    );
  }
  parseCanonicalPassThroughRawState(
    `${label}.raw renderer serializedState`,
    serializedState,
  );
  const rawRendererState = Object.freeze({
    attribute: raw.rawRendererState.attribute,
    selectorEvidence: exactOracleSelectorEvidence(
      `${label}.raw renderer selector`,
      raw.rawRendererState.selectorEvidence,
    ),
    serializedState,
  });

  if (typeof raw.formulaText !== "string" || !raw.formulaText.trim()) {
    throw new Error(`${label}.visible formula text must be nonblank.`);
  }
  if (!Array.isArray(raw.visibleNamedMarks)) {
    throw new Error(`${label}.visibleNamedMarks must be an array.`);
  }
  const visibleNamedMarks = Object.freeze(
    raw.visibleNamedMarks.map((mark, markIndex) =>
      nonEmpty(`${label}.visibleNamedMarks[${markIndex}]`, mark),
    ),
  );
  if (visibleNamedMarks.length === 0) {
    throw new Error(`${label}.visibleNamedMarks must contain visible evidence.`);
  }
  if (
    !raw.visibleMathMarks ||
    typeof raw.visibleMathMarks !== "object" ||
    Array.isArray(raw.visibleMathMarks)
  ) {
    throw new Error(`${label}.visibleMathMarks must be an object.`);
  }
  const visibleMathMarks = Object.freeze(Object.fromEntries(
    Object.entries(raw.visibleMathMarks).map(([markName, marks]) => [
      markName,
      canonicalClone(`${label}.visibleMathMarks.${markName}`, marks),
    ]),
  ));
  if (Object.keys(visibleMathMarks).length === 0) {
    throw new Error(`${label}.visibleMathMarks must contain at least one group.`);
  }
  for (const [markName, marks] of Object.entries(visibleMathMarks)) {
    nonEmpty(`${label}.visible math mark name`, markName);
    if (!Array.isArray(marks)) {
      throw new Error(`${label}.visibleMathMarks.${markName} must be an array.`);
    }
    if (marks.length === 0) {
      throw new Error(`${label}.visibleMathMarks.${markName} must be non-empty.`);
    }
    marks.forEach((mark, markIndex) => {
      exactObjectKeys(`${label}.visibleMathMarks.${markName}[${markIndex}]`, mark, [
        "attributes",
        "tagName",
        "text",
      ]);
      const candidate = mark as Record<string, unknown>;
      nonEmpty(
        `${label}.visibleMathMarks.${markName}[${markIndex}].tagName`,
        candidate.tagName,
      );
      if (typeof candidate.text !== "string") {
        throw new Error(
          `${label}.visibleMathMarks.${markName}[${markIndex}].text must be a string.`,
        );
      }
      if (
        !candidate.attributes ||
        typeof candidate.attributes !== "object" ||
        Array.isArray(candidate.attributes) ||
        Object.values(candidate.attributes).some(
          (value) => value !== null && typeof value !== "string",
        )
      ) {
        throw new Error(
          `${label}.visibleMathMarks.${markName}[${markIndex}].attributes must contain only string/null values.`,
        );
      }
    });
  }
  const visibleGeometry = Object.freeze({
    formulaText: raw.formulaText,
    visibleMathMarks,
    visibleNamedMarks,
  });
  const publicStateHash = sha256HkVisualizationCanonical(publicState);
  const rawRendererStateHash = sha256HkVisualizationCanonical(rawRendererState);
  const visibleGeometryHash = sha256HkVisualizationCanonical(visibleGeometry);
  const evidenceWithoutHash = Object.freeze({
    phase: expectedPhase,
    publicState,
    publicStateHash,
    rawRendererState,
    rawRendererStateHash,
    visibleGeometry,
    visibleGeometryHash,
  });
  return Object.freeze({
    ...evidenceWithoutHash,
    observationHash: sha256HkVisualizationCanonical({
      cellId,
      contractVersion:
        HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-pass-through-oracle-observation",
      labId,
    }),
  });
}

function validateHkVisualizationBrowserPassThroughResetEndpoint(
  label: string,
  cellId: string,
  labId: string,
  phase: string,
  raw: unknown,
): HkVisualizationBrowserPassThroughOracleObservationEvidence {
  exactObjectKeys(label, raw, [
    "observationHash",
    "phase",
    "publicState",
    "publicStateHash",
    "rawRendererState",
    "rawRendererStateHash",
    "visibleGeometry",
    "visibleGeometryHash",
  ]);
  const endpoint = raw as HkVisualizationBrowserPassThroughOracleObservationEvidence;
  if (endpoint.phase !== phase) {
    throw new Error(`${label}.phase differs from the exact Reset action phase.`);
  }
  exactObjectKeys(`${label}.publicState`, endpoint.publicState, [
    "selectorEvidence",
    "state",
  ]);
  exactOracleSelectorEvidence(
    `${label}.publicState.selectorEvidence`,
    endpoint.publicState.selectorEvidence,
  );
  if (
    !endpoint.publicState.state
    || typeof endpoint.publicState.state !== "object"
    || Array.isArray(endpoint.publicState.state)
    || Object.keys(endpoint.publicState.state).length === 0
  ) {
    throw new Error(`${label}.publicState.state must be one non-empty object.`);
  }
  exactObjectKeys(`${label}.rawRendererState`, endpoint.rawRendererState, [
    "attribute",
    "selectorEvidence",
    "serializedState",
  ]);
  exactOracleSelectorEvidence(
    `${label}.rawRendererState.selectorEvidence`,
    endpoint.rawRendererState.selectorEvidence,
  );
  if (
    endpoint.rawRendererState.attribute !== "data-viz-math-state"
    && endpoint.rawRendererState.attribute !== "data-viz-state-json"
  ) {
    throw new Error(`${label}.rawRendererState.attribute is unsupported.`);
  }
  parseCanonicalPassThroughRawState(
    `${label}.rawRendererState.serializedState`,
    endpoint.rawRendererState.serializedState,
  );
  exactObjectKeys(`${label}.visibleGeometry`, endpoint.visibleGeometry, [
    "formulaText",
    "visibleMathMarks",
    "visibleNamedMarks",
  ]);
  if (
    typeof endpoint.visibleGeometry.formulaText !== "string"
    || !endpoint.visibleGeometry.formulaText.trim()
    || !Array.isArray(endpoint.visibleGeometry.visibleNamedMarks)
    || endpoint.visibleGeometry.visibleNamedMarks.length === 0
    || !endpoint.visibleGeometry.visibleMathMarks
    || typeof endpoint.visibleGeometry.visibleMathMarks !== "object"
    || Array.isArray(endpoint.visibleGeometry.visibleMathMarks)
    || Object.keys(endpoint.visibleGeometry.visibleMathMarks).length === 0
  ) {
    throw new Error(`${label}.visibleGeometry must contain full visible evidence.`);
  }
  const publicStateHash = sha256HkVisualizationCanonical(endpoint.publicState);
  const rawRendererStateHash = sha256HkVisualizationCanonical(
    endpoint.rawRendererState,
  );
  const visibleGeometryHash = sha256HkVisualizationCanonical(
    endpoint.visibleGeometry,
  );
  if (
    endpoint.publicStateHash !== publicStateHash
    || endpoint.rawRendererStateHash !== rawRendererStateHash
    || endpoint.visibleGeometryHash !== visibleGeometryHash
  ) {
    throw new Error(`${label} endpoint layer hash drifted.`);
  }
  const evidenceWithoutHash = Object.freeze({
    phase,
    publicState: endpoint.publicState,
    publicStateHash,
    rawRendererState: endpoint.rawRendererState,
    rawRendererStateHash,
    visibleGeometry: endpoint.visibleGeometry,
    visibleGeometryHash,
  });
  const observationHash = sha256HkVisualizationCanonical({
    cellId,
    contractVersion:
      HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION,
    evidence: evidenceWithoutHash,
    kind: "browser-pass-through-oracle-observation",
    labId,
  });
  if (endpoint.observationHash !== observationHash) {
    throw new Error(`${label}.observationHash drifted.`);
  }
  return endpoint;
}

export function buildHkVisualizationBrowserPassThroughResetEndpointReceipt(
  args: Readonly<{
    afterOracleObservation: HkVisualizationBrowserRawPassThroughOracleObservation;
    beforeOracleObservation: HkVisualizationBrowserRawPassThroughOracleObservation;
    cellId: string;
    labId: string;
    phase: string;
  }>,
): HkVisualizationBrowserPassThroughResetEndpointReceipt {
  const beforeEndpoint = canonicalPassThroughOracleObservation(
    args.cellId,
    args.labId,
    args.phase,
    args.beforeOracleObservation,
    0,
  );
  const afterEndpoint = canonicalPassThroughOracleObservation(
    args.cellId,
    args.labId,
    args.phase,
    args.afterOracleObservation,
    1,
  );
  const endpointHashes = Object.freeze({
    public: Object.freeze({
      afterHash: afterEndpoint.publicStateHash,
      beforeHash: beforeEndpoint.publicStateHash,
    }),
    raw: Object.freeze({
      afterHash: afterEndpoint.rawRendererStateHash,
      beforeHash: beforeEndpoint.rawRendererStateHash,
    }),
    visible: Object.freeze({
      afterHash: afterEndpoint.visibleGeometryHash,
      beforeHash: beforeEndpoint.visibleGeometryHash,
    }),
  });
  const layerPairs = Object.freeze(
    HK_VISUALIZATION_PASS_THROUGH_RESET_LAYER_IDS.map((layer) => {
      const pairWithoutHash = Object.freeze({
        afterHash: endpointHashes[layer].afterHash,
        beforeHash: endpointHashes[layer].beforeHash,
        layer,
      });
      return Object.freeze({
        ...pairWithoutHash,
        pairHash: hashHkVisualizationPassThroughResetLayerPair(pairWithoutHash),
      });
    }),
  );
  return Object.freeze({
    afterEndpoint,
    beforeEndpoint,
    layerEndpointHashCount: 6 as const,
    layerPairs,
    layerReceiptCount: 3 as const,
  });
}

export function validateHkVisualizationBrowserPassThroughResetEndpointReceipt(
  args: Readonly<{
    cellId: string;
    labId: string;
    phase: string;
    receipt: unknown;
  }>,
): HkVisualizationBrowserPassThroughResetEndpointReceipt {
  const label = `browser pass-through Reset endpoint receipt ${args.cellId}/${args.phase}`;
  exactObjectKeys(label, args.receipt, [
    "afterEndpoint",
    "beforeEndpoint",
    "layerEndpointHashCount",
    "layerPairs",
    "layerReceiptCount",
  ]);
  const receipt = args.receipt as HkVisualizationBrowserPassThroughResetEndpointReceipt;
  const beforeEndpoint = validateHkVisualizationBrowserPassThroughResetEndpoint(
    `${label}.beforeEndpoint`,
    args.cellId,
    args.labId,
    args.phase,
    receipt.beforeEndpoint,
  );
  const afterEndpoint = validateHkVisualizationBrowserPassThroughResetEndpoint(
    `${label}.afterEndpoint`,
    args.cellId,
    args.labId,
    args.phase,
    receipt.afterEndpoint,
  );
  if (
    receipt.layerReceiptCount !== 3
    || receipt.layerEndpointHashCount !== 6
    || !Array.isArray(receipt.layerPairs)
    || receipt.layerPairs.length !== 3
  ) {
    throw new Error(`${label} must contain exactly three pairs and six endpoint hashes.`);
  }
  const expectedHashes = {
    public: [beforeEndpoint.publicStateHash, afterEndpoint.publicStateHash],
    raw: [beforeEndpoint.rawRendererStateHash, afterEndpoint.rawRendererStateHash],
    visible: [beforeEndpoint.visibleGeometryHash, afterEndpoint.visibleGeometryHash],
  } as const;
  receipt.layerPairs.forEach((pair, index) => {
    exactObjectKeys(`${label}.layerPairs[${index}]`, pair, [
      "afterHash",
      "beforeHash",
      "layer",
      "pairHash",
    ]);
    const expectedLayer = HK_VISUALIZATION_PASS_THROUGH_RESET_LAYER_IDS[index];
    if (pair.layer !== expectedLayer) {
      throw new Error(`${label} layer pairs must be exact ordered public/raw/visible.`);
    }
    const [beforeHash, afterHash] = expectedHashes[expectedLayer];
    if (pair.beforeHash !== beforeHash || pair.afterHash !== afterHash) {
      throw new Error(`${label}.${expectedLayer} endpoint hash pair drifted.`);
    }
    if (pair.pairHash !== hashHkVisualizationPassThroughResetLayerPair(pair)) {
      throw new Error(`${label}.${expectedLayer} pair hash drifted.`);
    }
  });
  return receipt;
}

/**
 * Rebuild one emitted browser scroll receipt with the state-contract v3
 * implementation. This deliberately does not maintain a second scroll
 * algorithm in the adapter: all container, schedule, restore, positive-count,
 * six-audit, and nested-hash checks stay owned by the state contract.
 */
export function canonicalHkVisualizationBrowserScrollObservationReceipt(
  raw: HkVisualizationBrowserScrollObservationReceipt,
  label = "browser scroll observation receipt",
): HkVisualizationBrowserScrollObservationReceipt {
  exactObjectKeys(label, raw, ["observationSet", "phase"]);
  const phase = nonEmpty(`${label}.phase`, raw.phase);
  const observationSet = buildHkVisualizationScrollObservationSet({
    containers: raw.observationSet?.containers,
    observations: raw.observationSet?.observations,
  });
  if (
    canonicalHkVisualizationJson(raw.observationSet) !==
    canonicalHkVisualizationJson(observationSet)
  ) {
    throw new Error(
      `${label}.observationSet has count, order, schedule, or hash drift.`,
    );
  }
  return Object.freeze({ observationSet, phase });
}

/**
 * Builds the expected scroll-audit phases from the independent state and
 * interaction execution ledgers. It never reads the audit-entry list or the
 * emitted scroll receipts, so deleting/tampering with an audit call cannot
 * silently shrink both expected and actual evidence.
 */
export function buildHkVisualizationBrowserScrollCellPlan(
  input: HkVisualizationBrowserScrollPlanInput,
): HkVisualizationBrowserScrollCellPlan {
  const cellId = nonEmpty("browser scroll plan cellId", input.cellId);
  if (
    !input.stateScanLedger ||
    !Array.isArray(input.stateScanLedger.entries) ||
    !Array.isArray(input.stateScanLedger.plannedStateIds) ||
    !Array.isArray(input.stateScanLedger.executedStateIds) ||
    !Array.isArray(input.interactions)
  ) {
    throw new Error(
      `Browser scroll plan ${cellId} requires independent state and interaction ledgers.`,
    );
  }
  const entries = input.stateScanLedger.entries;
  const plannedStateIds = input.stateScanLedger.plannedStateIds;
  const executedStateIds = input.stateScanLedger.executedStateIds;
  if (
    canonicalHkVisualizationJson(entries.map(({ id }) => id)) !==
      canonicalHkVisualizationJson(plannedStateIds) ||
    canonicalHkVisualizationJson(executedStateIds) !==
      canonicalHkVisualizationJson(plannedStateIds)
  ) {
    throw new Error(
      `Browser scroll plan ${cellId} state ledger is missing, duplicated, extra, or out of order.`,
    );
  }
  const entryById = new Map<string, (typeof entries)[number]>();
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const id = nonEmpty(`browser scroll plan ${cellId} state ${index} id`, entry.id);
    nonEmpty(`browser scroll plan ${cellId} state ${id} modeId`, entry.modeId);
    nonEmpty(`browser scroll plan ${cellId} state ${id} phase`, entry.phase);
    if (entryById.has(id)) {
      throw new Error(`Browser scroll plan ${cellId} duplicated state ${id}.`);
    }
    entryById.set(id, entry);
  }
  const resetEntries = entries.filter(({ modeId }) => modeId === "reset");
  if (resetEntries.length !== 1) {
    throw new Error(
      `Browser scroll plan ${cellId} requires exactly one independently planned Enter reset state.`,
    );
  }
  const consumedStateIds = new Set<string>();
  const phases: string[] = [];
  const appendStatePhase = (stateId: string, action: string) => {
    const entry = entryById.get(stateId);
    if (!entry) {
      throw new Error(
        `Browser scroll plan ${cellId} ${action} references unknown state ${stateId}.`,
      );
    }
    if (consumedStateIds.has(stateId)) {
      throw new Error(
        `Browser scroll plan ${cellId} ${action} duplicated state ${stateId}.`,
      );
    }
    consumedStateIds.add(stateId);
    phases.push(entry.phase);
  };
  for (let index = 0; index < input.interactions.length; index += 1) {
    const interaction = input.interactions[index];
    const action = nonEmpty(
      `browser scroll plan ${cellId} interaction ${index} action`,
      interaction.action,
    );
    if (interaction.status !== "passed") {
      throw new Error(
        `Browser scroll plan ${cellId} interaction ${action} did not pass.`,
      );
    }
    if (action.startsWith("range-state:")) {
      appendStatePhase(action.slice("range-state:".length), action);
      continue;
    }
    // Mode transitions prepare the next independently planned range state.
    // Canonical full execution calls them with auditState=false.
    if (action.startsWith("keyboard-mode-")) continue;
    if (action === "keyboard-reset-Enter") {
      appendStatePhase(resetEntries[0].id, action);
      continue;
    }
    if (action === "keyboard-reset-Space") {
      phases.push("reset-space");
      continue;
    }
    if (action === "keyboard-reset-Space-idempotent") {
      phases.push("reset-space-idempotent");
      continue;
    }
    if (action === "3d-play-pause") {
      phases.push("3d-playback");
      continue;
    }
    if (action === "3d-timeline-keyboard") {
      phases.push("3d-timeline-home");
      continue;
    }
    if (action === "3d-reset-camera") {
      phases.push("3d-reset-camera");
      continue;
    }
    if (action === "fill-and-add-point") {
      phases.push("coordinate-add-point");
      continue;
    }
    if (action.startsWith("keyboard-")) {
      phases.push(`control-${action.slice("keyboard-".length)}`);
      continue;
    }
    const keyboardVertex = action.match(/^(.+)-(ArrowRight|ArrowUp)$/);
    if (keyboardVertex) {
      phases.push(`${keyboardVertex[1]}-${keyboardVertex[2].toLowerCase()}`);
      continue;
    }
    throw new Error(
      `Browser scroll plan ${cellId} interaction ${action} is unknown and has no independent audit-phase policy.`,
    );
  }
  if (consumedStateIds.size !== entries.length) {
    const missing = entries
      .filter(({ id }) => !consumedStateIds.has(id))
      .map(({ id }) => id);
    throw new Error(
      `Browser scroll plan ${cellId} is missing independently planned state/reset interactions: ${missing.join(",")}.`,
    );
  }
  if (phases.length === 0 || new Set(phases).size !== phases.length) {
    throw new Error(
      `Browser scroll plan ${cellId} phases must be non-empty and duplicate-free.`,
    );
  }
  return Object.freeze({ cellId, phases: Object.freeze(phases) });
}

export function aggregateHkVisualizationBrowserScrollObservationReceipts(
  expectedCells: readonly HkVisualizationBrowserScrollCellPlan[],
  rawCells: readonly HkVisualizationBrowserScrollCellReceipt[],
): HkVisualizationBrowserScrollAggregate {
  if (!Array.isArray(expectedCells) || !Array.isArray(rawCells)) {
    throw new Error("Browser scroll expected cells and receipts must be arrays.");
  }
  if (rawCells.length !== expectedCells.length) {
    throw new Error(
      `Browser scroll cell receipt count ${rawCells.length} differs from exact expected count ${expectedCells.length}.`,
    );
  }

  const seenExpectedCellIds = new Set<string>();
  const phasePlans: Array<{ cellId: string; phases: readonly string[] }> = [];
  const orderedReceipts: Array<{
    cellId: string;
    receipts: readonly HkVisualizationBrowserScrollObservationReceipt[];
  }> = [];
  const cells: HkVisualizationBrowserScrollCellEvidence[] = [];
  let auditedExecutionMs = 0;
  let scrollContainerCount = 0;
  let scrollObservationCount = 0;
  let scrollObservationSetCount = 0;
  for (let cellIndex = 0; cellIndex < expectedCells.length; cellIndex += 1) {
    const expectedCell = expectedCells[cellIndex];
    exactObjectKeys(`browser scroll cell plan ${cellIndex}`, expectedCell, [
      "cellId",
      "phases",
    ]);
    const expectedCellId = nonEmpty(
      `expectedCells[${cellIndex}].cellId`,
      expectedCell.cellId,
    );
    if (seenExpectedCellIds.has(expectedCellId)) {
      throw new Error(`Browser scroll cell plan duplicated ${expectedCellId}.`);
    }
    seenExpectedCellIds.add(expectedCellId);
    if (!Array.isArray(expectedCell.phases)) {
      throw new Error(
        `Browser scroll cell plan ${expectedCellId} phases must be an array.`,
      );
    }
    const seenExpectedPhases = new Set<string>();
    const expectedPhases: readonly string[] = Object.freeze(
      (expectedCell.phases as readonly unknown[]).map(
        (phase: unknown, phaseIndex: number) => {
        const canonicalPhase = nonEmpty(
          `browser scroll cell plan ${expectedCellId} phase ${phaseIndex}`,
          phase,
        );
        if (seenExpectedPhases.has(canonicalPhase)) {
          throw new Error(
            `Browser scroll cell plan ${expectedCellId} duplicated phase ${canonicalPhase}.`,
          );
        }
        seenExpectedPhases.add(canonicalPhase);
        return canonicalPhase;
        },
      ),
    );
    const rawCell = rawCells[cellIndex];
    exactObjectKeys(`browser scroll cell ${cellIndex}`, rawCell, [
      "cellId",
      "scrollObservationPhasePlan",
      "scrollObservationSets",
    ]);
    if (rawCell.cellId !== expectedCellId) {
      throw new Error(
        `Browser scroll cell ${cellIndex} has the wrong cellId or is out of order.`,
      );
    }
    if (!Array.isArray(rawCell.scrollObservationSets)) {
      throw new Error(
        `Browser scroll cell ${expectedCellId} observation receipts must be an array.`,
      );
    }
    if (
      !Array.isArray(rawCell.scrollObservationPhasePlan) ||
      canonicalHkVisualizationJson(rawCell.scrollObservationPhasePlan) !==
        canonicalHkVisualizationJson(expectedPhases)
    ) {
      throw new Error(
        `Browser scroll cell ${expectedCellId} runtime audit-entry phase plan differs from the independent exact phase plan.`,
      );
    }
    if (rawCell.scrollObservationSets.length !== expectedPhases.length) {
      throw new Error(
        `Browser scroll cell ${expectedCellId} receipt count ${rawCell.scrollObservationSets.length} differs from exact planned phase count ${expectedPhases.length}; an action or reset phase is missing or extra.`,
      );
    }
    const seenPhases = new Set<string>();
    const receipts: readonly HkVisualizationBrowserScrollObservationReceipt[] =
      Object.freeze(
      (rawCell.scrollObservationSets as readonly unknown[]).map(
        (rawReceipt: unknown, receiptIndex: number) => {
        const receipt = canonicalHkVisualizationBrowserScrollObservationReceipt(
          rawReceipt as HkVisualizationBrowserScrollObservationReceipt,
          `browser scroll cell ${expectedCellId} receipt ${receiptIndex}`,
        );
        if (seenPhases.has(receipt.phase)) {
          throw new Error(
            `Browser scroll cell ${expectedCellId} duplicated phase ${receipt.phase}.`,
          );
        }
        if (receipt.phase !== expectedPhases[receiptIndex]) {
          throw new Error(
            `Browser scroll cell ${expectedCellId} receipt ${receiptIndex} phase ${receipt.phase} differs from exact planned phase ${expectedPhases[receiptIndex]}; a phase is missing, extra, unknown, or out of order.`,
          );
        }
        seenPhases.add(receipt.phase);
        return receipt;
        },
      ),
    );
    const phases = Object.freeze(receipts.map(({ phase }) => phase));
    const phasePlanHash = sha256HkVisualizationCanonical({
      cellId: expectedCellId,
      contractVersion: HK_VISUALIZATION_BROWSER_SCROLL_AGGREGATE_VERSION,
      kind: "browser-scroll-phase-plan",
      phases: expectedPhases,
    });
    const observationSetHashes = Object.freeze(
      receipts.map(({ observationSet }) => observationSet.observationSetHash),
    );
    const scheduleHashes = Object.freeze(
      receipts.map(({ observationSet }) => observationSet.scheduleHash),
    );
    const cellScrollContainerCount = receipts.reduce(
      (sum, { observationSet }) =>
        addSafe(
          `browser scroll cell ${expectedCellId} container count`,
          sum,
          observationSet.containerCount,
        ),
      0,
    );
    const cellScrollObservationCount = receipts.reduce(
      (sum, { observationSet }) =>
        addSafe(
          `browser scroll cell ${expectedCellId} observation count`,
          sum,
          observationSet.observationCount,
        ),
      0,
    );
    const cellAuditedExecutionMs = receipts.reduce(
      (sum, { observationSet }) =>
        addSafe(
          `browser scroll cell ${expectedCellId} audited execution time`,
          sum,
          calculateHkVisualizationAuditedExecutionMs(
            observationSet.observationCount,
          ),
        ),
      0,
    );
    const cellScrollPositionAuditCount =
      cellScrollObservationCount *
      HK_VISUALIZATION_SCROLL_POSITION_AUDIT_IDS.length;
    if (!Number.isSafeInteger(cellScrollPositionAuditCount)) {
      throw new Error(
        `Browser scroll cell ${expectedCellId} audit count overflowed.`,
      );
    }
    const receiptAggregateHash = sha256HkVisualizationCanonical({
      cellId: expectedCellId,
      contractVersion: HK_VISUALIZATION_STATE_CHUNK_CONTRACT_VERSION,
      kind: "ordered-browser-scroll-observation-receipts",
      receipts,
    });
    const cellEvidence = Object.freeze({
      auditedExecutionMs: cellAuditedExecutionMs,
      cellId: expectedCellId,
      observationSetHashes,
      phasePlanHash,
      phases,
      receiptAggregateHash,
      scheduleHashes,
      scrollContainerCount: cellScrollContainerCount,
      scrollObservationCount: cellScrollObservationCount,
      scrollObservationSetCount: receipts.length,
      scrollPositionAuditCount: cellScrollPositionAuditCount,
    });
    cells.push(cellEvidence);
    phasePlans.push({ cellId: expectedCellId, phases: expectedPhases });
    orderedReceipts.push({ cellId: expectedCellId, receipts });
    auditedExecutionMs = addSafe(
      "browser scroll aggregate audited execution time",
      auditedExecutionMs,
      cellAuditedExecutionMs,
    );
    scrollContainerCount = addSafe(
      "browser scroll aggregate container count",
      scrollContainerCount,
      cellScrollContainerCount,
    );
    scrollObservationCount = addSafe(
      "browser scroll aggregate observation count",
      scrollObservationCount,
      cellScrollObservationCount,
    );
    scrollObservationSetCount = addSafe(
      "browser scroll aggregate set count",
      scrollObservationSetCount,
      receipts.length,
    );
  }
  const scrollPositionAuditCount =
    scrollObservationCount * HK_VISUALIZATION_SCROLL_POSITION_AUDIT_IDS.length;
  if (!Number.isSafeInteger(scrollPositionAuditCount)) {
    throw new Error("Browser scroll aggregate audit count overflowed.");
  }
  const frozenCells = Object.freeze(cells);
  const cellIds = Object.freeze(expectedCells.map(({ cellId }) => cellId));
  const phasePlanAggregateHash = sha256HkVisualizationCanonical({
    cells: phasePlans,
    contractVersion: HK_VISUALIZATION_BROWSER_SCROLL_AGGREGATE_VERSION,
    kind: "browser-scroll-phase-plans-by-cell",
  });
  const scrollObservationAggregateHash = sha256HkVisualizationCanonical({
    cells: orderedReceipts,
    contractVersion: HK_VISUALIZATION_STATE_CHUNK_CONTRACT_VERSION,
    kind: "ordered-browser-scroll-observation-receipts-by-cell",
  });
  const evidenceWithoutHash = Object.freeze({
    auditedExecutionMs,
    cellCount: cellIds.length,
    cellIds,
    cells: frozenCells,
    contractVersion: HK_VISUALIZATION_BROWSER_SCROLL_AGGREGATE_VERSION,
    phasePlanAggregateHash,
    scrollContainerCount,
    scrollObservationAggregateHash,
    scrollObservationCount,
    scrollObservationSetCount,
    scrollPositionAuditCount,
  });
  return Object.freeze({
    ...evidenceWithoutHash,
    aggregateHash: sha256HkVisualizationCanonical({
      contractVersion: HK_VISUALIZATION_BROWSER_SCROLL_AGGREGATE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-scroll-zero-failure-aggregate",
    }),
  });
}

/**
 * Builds one package-level outer receipt over the already audited v8
 * dependent-transition observations. Every scroll cell must appear once and
 * in order, while only the seven independently declared dependent labs may
 * contribute observations. The compact receipt retains independently
 * re-verifiable hashes for all 3 phases of every sequence.
 */
export function aggregateHkVisualizationBrowserDependentTransitionReceipts(
  scrollAggregate: HkVisualizationBrowserScrollAggregate,
  rawCells: readonly HkVisualizationBrowserDependentTransitionCellReceipt[],
): HkVisualizationBrowserDependentTransitionAggregate {
  if (!Array.isArray(rawCells)) {
    throw new Error(
      "Browser dependent-transition cell receipts must be an array.",
    );
  }
  if (rawCells.length !== scrollAggregate.cells.length) {
    throw new Error(
      `Browser dependent-transition cell count ${rawCells.length} differs from exact scroll cell count ${scrollAggregate.cells.length}.`,
    );
  }

  const cells: HkVisualizationBrowserDependentTransitionCellEvidence[] = [];
  let phaseObservationCount = 0;
  let sequenceObservationCount = 0;
  for (let cellIndex = 0; cellIndex < scrollAggregate.cells.length; cellIndex += 1) {
    const scrollCell = scrollAggregate.cells[cellIndex];
    const rawCell = rawCells[cellIndex];
    const label = `browser dependent-transition cell ${scrollCell.cellId}`;
    exactObjectKeys(label, rawCell, [
      "cellId",
      "dependentTransitionSequenceObservations",
      "labId",
      "language",
    ]);
    if (rawCell.cellId !== scrollCell.cellId) {
      throw new Error(`${label} differs from exact scroll cell order.`);
    }
    const labId = labIdFromCellId(scrollCell.cellId);
    const language = dependentTransitionLanguageFromCellId(scrollCell.cellId);
    const theme = dependentTransitionThemeFromCellId(scrollCell.cellId);
    if (rawCell.labId !== labId) {
      throw new Error(`${label} labId differs from exact cell identity.`);
    }
    if (rawCell.language !== language) {
      throw new Error(`${label} language differs from exact cell identity.`);
    }
    if (!Array.isArray(rawCell.dependentTransitionSequenceObservations)) {
      throw new Error(`${label} observations must be an array.`);
    }
    const expectedSequenceIds =
      hkVisualizationDependentTransitionSequenceIdsForLab(labId) as
        readonly HkVisualizationDependentTransitionSequenceId[];
    const observations:
      readonly HkVisualizationDependentTransitionSequenceObservation[] =
        rawCell.dependentTransitionSequenceObservations;
    if (observations.length !== expectedSequenceIds.length) {
      throw new Error(
        `${label} requires exact ${expectedSequenceIds.length} ordered dependent-transition observations; observed ${observations.length}.`,
      );
    }
    const observedSequenceIds = observations.map(
      ({ sequenceId }: HkVisualizationDependentTransitionSequenceObservation) =>
        sequenceId,
    );
    if (
      canonicalHkVisualizationJson(observedSequenceIds) !==
        canonicalHkVisualizationJson(expectedSequenceIds) ||
      new Set(observedSequenceIds).size !== observedSequenceIds.length
    ) {
      throw new Error(
        `${label} sequence IDs are missing, duplicated, foreign, or reordered.`,
      );
    }
    if (expectedSequenceIds.length === 0) continue;

    let canonicalFingerprint: string | null = null;
    const sequences:
      readonly HkVisualizationBrowserDependentTransitionSequenceEvidence[] =
      Object.freeze(
      observations.map((
        observation: HkVisualizationDependentTransitionSequenceObservation,
        sequenceIndex: number,
      ): HkVisualizationBrowserDependentTransitionSequenceEvidence => {
        const sequenceLabel = `${label} sequence ${sequenceIndex}`;
        assertHkVisualizationDependentTransitionSequenceObservationShape(
          observation,
        );
        const expectedSequenceId = expectedSequenceIds[sequenceIndex];
        if (observation.sequenceId !== expectedSequenceId) {
          throw new Error(
            `${sequenceLabel} sequence identity differs from exact per-lab order.`,
          );
        }
        if (observation.cellId !== rawCell.cellId) {
          throw new Error(
            `${sequenceLabel} cellId differs from exact receipt cell.`,
          );
        }
        if (observation.labId !== labId) {
          throw new Error(
            `${sequenceLabel} labId differs from exact receipt lab.`,
          );
        }
        if (observation.language !== language) {
          throw new Error(
            `${sequenceLabel} language differs from exact receipt language.`,
          );
        }
        if (
          observation.theme !== theme ||
          observation.canonicalVisibleBaseline.theme !== theme
        ) {
          throw new Error(
            `${sequenceLabel} theme differs from exact receipt cell.`,
          );
        }
        if (
          observation.schemaVersion !==
          HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_SCHEMA_VERSION
        ) {
          throw new Error(`${sequenceLabel} schema version drifted.`);
        }
        const phaseIds = Object.freeze(
          observation.phases.map(({ phase }) => phase),
        );
        if (
          phaseIds.length !== HK_VISUALIZATION_DEPENDENT_TRANSITION_PHASE_IDS.length ||
          canonicalHkVisualizationJson(phaseIds) !==
            canonicalHkVisualizationJson(
              HK_VISUALIZATION_DEPENDENT_TRANSITION_PHASE_IDS,
            )
        ) {
          throw new Error(
            `${sequenceLabel} phase IDs are not exact pre, clamp, expand order.`,
          );
        }
        requireDependentTransitionHash(
          `${sequenceLabel}.planHash`,
          observation.planHash,
        );
        const sourcePlan =
          HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLAN_BY_SEQUENCE_ID[
            observation.sequenceId
          ];
        if (
          !sourcePlan ||
          observation.planHash !== sourcePlan.planHash ||
          observation.domainId !== sourcePlan.domainId ||
          observation.labId !== sourcePlan.labId ||
          observation.modeId !== sourcePlan.modeId ||
          canonicalHkVisualizationJson(observation.modePreparation) !==
            canonicalHkVisualizationJson(sourcePlan.modePreparation) ||
          observation.schemaVersion !== sourcePlan.schemaVersion
        ) {
          throw new Error(`${sequenceLabel} source-plan hash drifted.`);
        }
        requireDependentTransitionHash(
          `${sequenceLabel}.observationHash`,
          observation.observationHash,
        );
        if (
          hashHkVisualizationDependentTransitionSequenceObservation(
            observation,
          ) !== observation.observationHash
        ) {
          throw new Error(
            `${sequenceLabel} observation content hash does not verify.`,
          );
        }
        const baseline = observation.canonicalVisibleBaseline;
        requireDependentTransitionHash(
          `${sequenceLabel}.canonicalVisibleBaseline.baselineHash`,
          baseline.baselineHash,
        );
        if (
          hashHkVisualizationDependentTransitionCanonicalVisibleBaseline(
            baseline,
          ) !== baseline.baselineHash
        ) {
          throw new Error(
            `${sequenceLabel} canonical visible baseline content hash does not verify.`,
          );
        }
        if (
          baseline.cellId !== rawCell.cellId ||
          baseline.language !== language ||
          baseline.planHash !== observation.planHash ||
          baseline.sequenceId !== observation.sequenceId
        ) {
          throw new Error(
            `${sequenceLabel} canonical visible baseline cross-binding drifted.`,
          );
        }
        const sequenceCanonicalFingerprint = nonEmpty(
          `${sequenceLabel}.canonicalFingerprint`,
          baseline.canonicalFingerprint,
        );
        if (
          observation.postSequenceRestoration.canonicalFingerprint !==
            sequenceCanonicalFingerprint ||
          observation.postSequenceRestoration.afterFingerprint !==
            sequenceCanonicalFingerprint ||
          observation.postSequenceRestoration.beforeFingerprint ===
            sequenceCanonicalFingerprint ||
          observation.postSequenceRestoration.canonicalVisibleBaselineHash !==
            baseline.baselineHash
        ) {
          throw new Error(
            `${sequenceLabel} restoration/canonical-baseline cross-binding drifted.`,
          );
        }
        if (
          canonicalFingerprint !== null &&
          canonicalFingerprint !== sequenceCanonicalFingerprint
        ) {
          throw new Error(
            `${sequenceLabel} canonical fingerprint differs across the exact cell sequences.`,
          );
        }
        canonicalFingerprint = sequenceCanonicalFingerprint;
        const phaseObservationHashes = Object.freeze(
          observation.phases.map((phase) =>
            sha256HkVisualizationCanonical({
              cellId: rawCell.cellId,
              contractVersion:
                HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION,
              kind: "browser-dependent-transition-phase-observation",
              labId,
              language,
              phase,
              sequenceId: observation.sequenceId,
            }),
          ),
        );
        if (
          new Set(phaseObservationHashes).size !==
          HK_VISUALIZATION_DEPENDENT_TRANSITION_PHASE_IDS.length
        ) {
          throw new Error(
            `${sequenceLabel} phase observation hashes must be distinct.`,
          );
        }
        const postSequenceRestorationHash =
          sha256HkVisualizationCanonical({
            cellId: rawCell.cellId,
            contractVersion:
              HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION,
            kind: "browser-dependent-transition-restoration-observation",
            labId,
            language,
            restoration: observation.postSequenceRestoration,
            sequenceId: observation.sequenceId,
          });
        const visibleMathProjectionEvidence =
          dependentTransitionVisibleMathProjectionEvidence(
            observation,
            language,
            theme,
          );
        const evidenceWithoutHash = Object.freeze({
          canonicalFingerprint: sequenceCanonicalFingerprint,
          canonicalVisibleBaselineHash: baseline.baselineHash,
          cellId: rawCell.cellId,
          labId,
          language,
          observationHash: observation.observationHash,
          phaseCount: 3 as const,
          phaseIds,
          phaseObservationHashes,
          planHash: observation.planHash,
          postSequenceRestorationHash,
          projectionMatrixHash: sourcePlan.projectionMatrixHash,
          schemaVersion:
            HK_VISUALIZATION_DEPENDENT_TRANSITION_SEQUENCE_SCHEMA_VERSION,
          sequenceId: observation.sequenceId,
          theme,
          visibleMathProjectionEvidence,
        });
        return Object.freeze({
          ...evidenceWithoutHash,
          sequenceAggregateHash: sha256HkVisualizationCanonical({
            contractVersion:
              HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION,
            evidence: evidenceWithoutHash,
            kind: "browser-dependent-transition-sequence",
          }),
        });
      }),
    );
    if (canonicalFingerprint === null) {
      throw new Error(`${label} lacks an exact canonical fingerprint.`);
    }
    const sequenceIds = Object.freeze(
      sequences.map(({ sequenceId }) => sequenceId),
    );
    const sequenceObservationHashes = Object.freeze(
      sequences.map(({ observationHash }) => observationHash),
    );
    const cellPhaseObservationCount = sequences.length *
      HK_VISUALIZATION_DEPENDENT_TRANSITION_PHASE_IDS.length;
    const evidenceWithoutHash = Object.freeze({
      canonicalFingerprint,
      cellId: rawCell.cellId,
      labId,
      language,
      phaseObservationCount: cellPhaseObservationCount,
      sequenceCount: sequences.length,
      sequenceIds,
      sequenceObservationHashes,
      sequences,
      theme,
    });
    cells.push(Object.freeze({
      ...evidenceWithoutHash,
      cellAggregateHash: sha256HkVisualizationCanonical({
        contractVersion:
          HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION,
        evidence: evidenceWithoutHash,
        kind: "browser-dependent-transition-cell",
      }),
    }));
    sequenceObservationCount = addSafe(
      "dependent-transition sequence observation count",
      sequenceObservationCount,
      sequences.length,
    );
    phaseObservationCount = addSafe(
      "dependent-transition phase observation count",
      phaseObservationCount,
      cellPhaseObservationCount,
    );
  }

  const frozenCells = Object.freeze(cells);
  const topologyHash = sha256HkVisualizationCanonical({
    cells: frozenCells.map(({ cellId, labId, language, sequences, theme }) => ({
      cellId,
      labId,
      language,
      sequences: sequences.map(({
        phaseIds,
        projectionMatrixHash,
        sequenceId,
        visibleMathProjectionEvidence,
      }) => ({
        phaseIds,
        projectionMatrixHash,
        sequenceId,
        visibleMathProjectionTopologyHash:
          visibleMathProjectionEvidence.topologyHash,
      })),
      theme,
    })),
    contractVersion:
      HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION,
    kind: "browser-dependent-transition-package-topology",
  });
  const evidenceWithoutHash = Object.freeze({
    cellCount: frozenCells.length,
    cells: frozenCells,
    contractVersion:
      HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION,
    phaseObservationCount,
    scrollPackageAggregateHash: scrollAggregate.aggregateHash,
    sequenceObservationCount,
    topologyHash,
  });
  return Object.freeze({
    ...evidenceWithoutHash,
    aggregateHash: sha256HkVisualizationCanonical({
      contractVersion:
        HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-dependent-transition-package",
    }),
  });
}

/**
 * Produces a compact, independently hashable three-layer oracle ledger for
 * every package cell. Pass-through observations must match the already
 * independently planned scroll phases exactly; dedicated cells must prove that
 * they emitted no pass-through evidence at all.
 */
export function aggregateHkVisualizationBrowserPassThroughOracleReceipts(
  scrollAggregate: HkVisualizationBrowserScrollAggregate,
  rawCells: readonly HkVisualizationBrowserPassThroughOracleCellReceipt[],
): HkVisualizationBrowserPassThroughOracleAggregate {
  if (!Array.isArray(rawCells)) {
    throw new Error("Browser pass-through oracle cell receipts must be an array.");
  }
  if (rawCells.length !== scrollAggregate.cells.length) {
    throw new Error(
      `Browser pass-through oracle cell count ${rawCells.length} differs from exact scroll cell count ${scrollAggregate.cells.length}.`,
    );
  }
  const cells: HkVisualizationBrowserPassThroughOracleCellEvidence[] = [];
  let observationCount = 0;
  let passThroughCellCount = 0;
  for (let index = 0; index < scrollAggregate.cells.length; index += 1) {
    const scrollCell = scrollAggregate.cells[index];
    const rawCell = rawCells[index];
    exactObjectKeys(`browser pass-through oracle cell ${index}`, rawCell, [
      "cellId",
      "labId",
      "passThroughOracleObservations",
    ]);
    if (rawCell.cellId !== scrollCell.cellId) {
      throw new Error(
        `Browser pass-through oracle cell ${index} differs from the exact scroll cell or is out of order.`,
      );
    }
    const labId = labIdFromCellId(scrollCell.cellId);
    if (rawCell.labId !== labId) {
      throw new Error(
        `Browser pass-through oracle ${scrollCell.cellId} labId mismatch: ${String(rawCell.labId)}.`,
      );
    }
    if (!Array.isArray(rawCell.passThroughOracleObservations)) {
      throw new Error(
        `Browser pass-through oracle ${scrollCell.cellId} observations must be an array.`,
      );
    }
    const rawObservations: readonly HkVisualizationBrowserRawPassThroughOracleObservation[] =
      rawCell.passThroughOracleObservations;
    const kind = isHKPassThroughLabId(labId) ? "pass-through" : "dedicated";
    if (kind === "dedicated" && rawObservations.length !== 0) {
      throw new Error(
        `Dedicated cell ${scrollCell.cellId} must carry exactly zero pass-through oracle observations.`,
      );
    }
    if (
      kind === "pass-through" &&
      rawObservations.length !== scrollCell.phases.length
    ) {
      throw new Error(
        `Pass-through cell ${scrollCell.cellId} observation count ${rawObservations.length} differs from exact scroll phase count ${scrollCell.phases.length}.`,
      );
    }
    const observations = Object.freeze(
      rawObservations.map((observation, observationIndex) =>
        canonicalPassThroughOracleObservation(
          scrollCell.cellId,
          labId,
          scrollCell.phases[observationIndex],
          observation,
          observationIndex,
        ),
      ),
    );
    const phases = Object.freeze(observations.map(({ phase }) => phase));
    const observationHashes = Object.freeze(
      observations.map(({ observationHash }) => observationHash),
    );
    const evidenceWithoutHash = Object.freeze({
      cellId: scrollCell.cellId,
      kind,
      labId,
      observationCount: observations.length,
      observationHashes,
      observations,
      phases,
    });
    cells.push(
      Object.freeze({
        ...evidenceWithoutHash,
        cellAggregateHash: sha256HkVisualizationCanonical({
          contractVersion:
            HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION,
          evidence: evidenceWithoutHash,
          kind: "browser-pass-through-oracle-cell",
        }),
      }),
    );
    observationCount = addSafe(
      "browser pass-through oracle observation count",
      observationCount,
      observations.length,
    );
    if (kind === "pass-through") passThroughCellCount += 1;
  }
  const evidenceWithoutHash = Object.freeze({
    cellCount: cells.length,
    cells: Object.freeze(cells),
    contractVersion:
      HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION,
    observationCount,
    passThroughCellCount,
  });
  return Object.freeze({
    ...evidenceWithoutHash,
    aggregateHash: sha256HkVisualizationCanonical({
      contractVersion:
        HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-pass-through-oracle-package",
    }),
  });
}

const HK_VISUALIZATION_PASS_THROUGH_PAINTED_GEOMETRY_LAYER_IDS =
  Object.freeze(["public", "raw", "visible"] as const);

function validatePassThroughOracleAggregateHash(
  aggregate: HkVisualizationBrowserPassThroughOracleAggregate,
) {
  exactObjectKeys("painted-geometry source oracle aggregate", aggregate, [
    "aggregateHash",
    "cellCount",
    "cells",
    "contractVersion",
    "observationCount",
    "passThroughCellCount",
  ]);
  if (
    aggregate.contractVersion !==
      HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION ||
    !Array.isArray(aggregate.cells) ||
    !Number.isSafeInteger(aggregate.cellCount) ||
    aggregate.cellCount !== aggregate.cells.length
  ) {
    throw new Error(
      "Painted-geometry source oracle aggregate contract/cell count drifted.",
    );
  }
  let observationCount = 0;
  let passThroughCellCount = 0;
  for (const [cellIndex, cell] of aggregate.cells.entries()) {
    exactObjectKeys(`painted-geometry source oracle cell ${cellIndex}`, cell, [
      "cellAggregateHash",
      "cellId",
      "kind",
      "labId",
      "observationCount",
      "observationHashes",
      "observations",
      "phases",
    ]);
    if (
      (cell.kind !== "dedicated" && cell.kind !== "pass-through") ||
      !Array.isArray(cell.observations) ||
      !Array.isArray(cell.phases) ||
      !Array.isArray(cell.observationHashes) ||
      !Number.isSafeInteger(cell.observationCount) ||
      cell.observationCount !== cell.observations.length ||
      cell.phases.length !== cell.observations.length ||
      !cell.phases.every(
        (phase: unknown, index: number) =>
          phase === cell.observations[index]?.phase,
      ) ||
      cell.observationHashes.length !== cell.observations.length ||
      !cell.observationHashes.every(
        (hash: unknown, index: number) =>
          hash === cell.observations[index]?.observationHash,
      )
    ) {
      throw new Error(
        `Painted-geometry source oracle ${cell.cellId} observation topology drifted.`,
      );
    }
    observationCount = addSafe(
      "painted-geometry source oracle observation count",
      observationCount,
      cell.observationCount,
    );
    if (cell.kind === "pass-through") passThroughCellCount += 1;
    for (const [observationIndex, observation] of cell.observations.entries()) {
      exactObjectKeys(
        `painted-geometry source oracle ${cell.cellId} observation ${observationIndex}`,
        observation,
        [
          "observationHash",
          "phase",
          "publicState",
          "publicStateHash",
          "rawRendererState",
          "rawRendererStateHash",
          "visibleGeometry",
          "visibleGeometryHash",
        ],
      );
      const {
        observationHash,
        ...observationEvidence
      } = observation;
      if (
        observation.publicStateHash !==
          sha256HkVisualizationCanonical(observation.publicState)
        || observation.rawRendererStateHash !==
          sha256HkVisualizationCanonical(observation.rawRendererState)
        || observation.visibleGeometryHash !==
          sha256HkVisualizationCanonical(observation.visibleGeometry)
        || observationHash !== sha256HkVisualizationCanonical({
          cellId: cell.cellId,
          contractVersion:
            HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION,
          evidence: observationEvidence,
          kind: "browser-pass-through-oracle-observation",
          labId: cell.labId,
        })
      ) {
        throw new Error(
          `Painted-geometry source oracle ${cell.cellId} observation hash drifted.`,
        );
      }
    }
    const { cellAggregateHash, ...cellEvidence } = cell;
    if (
      cellAggregateHash !== sha256HkVisualizationCanonical({
        contractVersion:
          HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION,
        evidence: cellEvidence,
        kind: "browser-pass-through-oracle-cell",
      })
    ) {
      throw new Error(
        `Painted-geometry source oracle ${cell.cellId} cell aggregate hash drifted.`,
      );
    }
  }
  if (
    !Number.isSafeInteger(aggregate.observationCount) ||
    aggregate.observationCount !== observationCount ||
    !Number.isSafeInteger(aggregate.passThroughCellCount) ||
    aggregate.passThroughCellCount !== passThroughCellCount
  ) {
    throw new Error(
      "Painted-geometry source oracle aggregate observation/pass-through counts drifted.",
    );
  }
  const { aggregateHash, ...aggregateEvidence } = aggregate;
  if (
    aggregateHash !== sha256HkVisualizationCanonical({
      contractVersion:
        HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION,
      evidence: aggregateEvidence,
      kind: "browser-pass-through-oracle-package",
    })
  ) {
    throw new Error("Painted-geometry source oracle aggregate hash drifted.");
  }
}

function passThroughPaintedGeometryStateMatches(
  state: Readonly<Record<string, unknown>>,
  expected: Readonly<Record<string, unknown>>,
) {
  if (
    !state ||
    typeof state !== "object" ||
    Array.isArray(state) ||
    (Object.getPrototypeOf(state) !== Object.prototype &&
      Object.getPrototypeOf(state) !== null)
  ) {
    return false;
  }
  const stateKeys = Object.keys(state).sort();
  const expectedKeys = Object.keys(expected).sort();
  return stateKeys.length === expectedKeys.length &&
    stateKeys.every((key, index) => key === expectedKeys[index]) &&
    expectedKeys.every((key) => Object.is(state[key], expected[key]));
}

function validatePassThroughPaintedGeometryResetChronology(
  label: string,
  phases: readonly string[],
  beforeIndex: number,
  afterIndex: number,
) {
  const indexesFor = (matches: (phase: string) => boolean) => phases
    .map((phase, index) => ({ index, phase }))
    .filter(({ phase }) => matches(phase))
    .map(({ index }) => index);
  const enterIndexes = indexesFor((phase) =>
    /^range-state:reset:hk-state:\d{5}$/.test(phase));
  const spaceIndexes = indexesFor((phase) => phase === "reset-space");
  const noopIndexes = indexesFor(
    (phase) => phase === "reset-space-idempotent",
  );
  if (
    enterIndexes.length !== 1 ||
    spaceIndexes.length !== 1 ||
    noopIndexes.length !== 1
  ) {
    throw new Error(
      `Painted-geometry pair ${label} requires exactly one ordered Reset Enter/Space/no-op phase trio.`,
    );
  }
  const [enterIndex] = enterIndexes;
  const [spaceIndex] = spaceIndexes;
  const [noopIndex] = noopIndexes;
  if (!(
    beforeIndex < afterIndex &&
    afterIndex < enterIndex &&
    enterIndex < spaceIndex &&
    spaceIndex < noopIndex
  )) {
    throw new Error(
      `Painted-geometry pair ${label} Reset chronology must satisfy before < after < Enter < Space < no-op.`,
    );
  }
}

function hashPassThroughPaintedGeometryLayerPair(
  pair: Omit<
    HkVisualizationBrowserPassThroughPaintedGeometryLayerPair,
    "pairHash"
  >,
) {
  return sha256HkVisualizationCanonical({
    contractVersion:
      HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_AGGREGATE_VERSION,
    evidence: pair,
    kind: "browser-pass-through-painted-geometry-layer-pair",
  });
}

/**
 * Resolves the independent exact3 two-state plans from the existing ordered
 * general-oracle endpoints. The pair receipt is compact: it retains endpoint
 * references and three ordered layer hash pairs, while the general-oracle
 * annotation remains the sole full endpoint store.
 */
export function aggregateHkVisualizationBrowserPassThroughPaintedGeometryPairReceipts(
  scrollAggregate: HkVisualizationBrowserScrollAggregate,
  oracleAggregate: HkVisualizationBrowserPassThroughOracleAggregate,
): HkVisualizationBrowserPassThroughPaintedGeometryPairAggregate {
  if (
    !scrollAggregate
    || !oracleAggregate
    || !Array.isArray(scrollAggregate.cells)
    || !Array.isArray(oracleAggregate.cells)
    || scrollAggregate.cells.length !== oracleAggregate.cells.length
  ) {
    throw new Error(
      "Painted-geometry pair scroll and oracle cell counts must match exactly.",
    );
  }
  for (let index = 0; index < scrollAggregate.cells.length; index += 1) {
    if (
      oracleAggregate.cells[index].cellId !== scrollAggregate.cells[index].cellId
    ) {
      throw new Error(
        `Painted-geometry pair oracle cell ${index} is cross-linked or out of scroll order.`,
      );
    }
  }
  validatePassThroughOracleAggregateHash(oracleAggregate);
  for (let index = 0; index < scrollAggregate.cells.length; index += 1) {
    const scrollCell = scrollAggregate.cells[index];
    const oracleCell = oracleAggregate.cells[index];
    const labId = labIdFromCellId(scrollCell.cellId);
    const expectedKind = isHKPassThroughLabId(labId)
      ? "pass-through"
      : "dedicated";
    if (
      oracleCell.cellId !== scrollCell.cellId ||
      oracleCell.labId !== labId ||
      oracleCell.kind !== expectedKind
    ) {
      throw new Error(
        `Painted-geometry pair oracle cell ${index} identity/kind is cross-linked or out of scroll order.`,
      );
    }
    if (expectedKind === "pass-through") {
      if (
        oracleCell.observationCount !== scrollCell.phases.length ||
        canonicalHkVisualizationJson(oracleCell.phases) !==
          canonicalHkVisualizationJson(scrollCell.phases)
      ) {
        throw new Error(
          `Painted-geometry pair oracle cell ${index} phases/observationCount differ from exact scroll authority.`,
        );
      }
    } else if (
      oracleCell.observationCount !== 0 ||
      oracleCell.observations.length !== 0 ||
      oracleCell.phases.length !== 0 ||
      oracleCell.observationHashes.length !== 0
    ) {
      throw new Error(
        `Painted-geometry pair dedicated oracle cell ${index} must retain exact zero source topology.`,
      );
    }
  }
  const cells: HkVisualizationBrowserPassThroughPaintedGeometryPairCellEvidence[] = [];
  let endpointCount = 0;
  let layerEndpointHashCount = 0;
  let layerReceiptCount = 0;
  let pairCount = 0;
  const planByLabId =
    HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_PLANS as Readonly<
      Record<string, Readonly<{
        afterState: Readonly<Record<string, unknown>>;
        beforeState: Readonly<Record<string, unknown>>;
        labId: string;
      }>>
    >;
  for (let cellIndex = 0; cellIndex < scrollAggregate.cells.length; cellIndex += 1) {
    const scrollCell = scrollAggregate.cells[cellIndex];
    const oracleCell = oracleAggregate.cells[cellIndex];
    const labId = labIdFromCellId(scrollCell.cellId);
    if (oracleCell.labId !== labId) {
      throw new Error(
        `Painted-geometry pair ${scrollCell.cellId} oracle labId drifted.`,
      );
    }
    const plan = planByLabId[labId];
    let pair: HkVisualizationBrowserPassThroughPaintedGeometryPairEvidence | null =
      null;
    if (plan) {
      const rangeCandidates: Array<{
        observation: HkVisualizationBrowserPassThroughOracleObservationEvidence;
        observationIndex: number;
      }> = oracleCell.observations.map(
        (
          observation: HkVisualizationBrowserPassThroughOracleObservationEvidence,
          observationIndex: number,
        ) => ({ observation, observationIndex }),
      ).filter((candidate: {
        observation: HkVisualizationBrowserPassThroughOracleObservationEvidence;
        observationIndex: number;
      }) => candidate.observation.phase.startsWith("range-state:"));
      const beforeCandidates = rangeCandidates.filter(({ observation }) =>
        passThroughPaintedGeometryStateMatches(
          observation.publicState.state,
          plan.beforeState,
        ));
      const afterCandidates = rangeCandidates.filter(({ observation }) =>
        passThroughPaintedGeometryStateMatches(
          observation.publicState.state,
          plan.afterState,
        ));
      if (beforeCandidates.length !== 1 || afterCandidates.length !== 1) {
        throw new Error(
          `Painted-geometry pair ${scrollCell.cellId} requires exactly one unique before and after range-state endpoint; observed ${beforeCandidates.length}/${afterCandidates.length}.`,
        );
      }
      const beforeEndpoint = beforeCandidates[0];
      const afterEndpoint = afterCandidates[0];
      if (beforeEndpoint.observationIndex >= afterEndpoint.observationIndex) {
        throw new Error(
          `Painted-geometry pair ${scrollCell.cellId} before endpoint must chronologically precede after.`,
        );
      }
      validatePassThroughPaintedGeometryResetChronology(
        scrollCell.cellId,
        scrollCell.phases,
        beforeEndpoint.observationIndex,
        afterEndpoint.observationIndex,
      );
      const segments = scrollCell.cellId.split("/");
      const issues = auditHkVisualizationPassThroughCrossStatePaintedGeometryPair({
        afterEndpoint,
        beforeEndpoint,
        cellId: scrollCell.cellId,
        labId,
        locale: segments[3],
        theme: segments[4],
        viewportId: segments[2],
      });
      if (issues.length > 0) {
        throw new Error(
          `Painted-geometry pair ${scrollCell.cellId} failed the shared oracle: ${issues.map(({ code, message }) => `${code}:${message}`).join(" | ")}.`,
        );
      }
      const beforeRef = Object.freeze({
        observationHash: beforeEndpoint.observation.observationHash,
        observationIndex: beforeEndpoint.observationIndex,
        phase: beforeEndpoint.observation.phase,
      });
      const afterRef = Object.freeze({
        observationHash: afterEndpoint.observation.observationHash,
        observationIndex: afterEndpoint.observationIndex,
        phase: afterEndpoint.observation.phase,
      });
      const endpointHashes = Object.freeze({
        public: Object.freeze([
          beforeEndpoint.observation.publicStateHash,
          afterEndpoint.observation.publicStateHash,
        ]),
        raw: Object.freeze([
          beforeEndpoint.observation.rawRendererStateHash,
          afterEndpoint.observation.rawRendererStateHash,
        ]),
        visible: Object.freeze([
          beforeEndpoint.observation.visibleGeometryHash,
          afterEndpoint.observation.visibleGeometryHash,
        ]),
      });
      const layerPairs = Object.freeze(
        HK_VISUALIZATION_PASS_THROUGH_PAINTED_GEOMETRY_LAYER_IDS.map(
          (layer) => {
            const [beforeHash, afterHash] = endpointHashes[layer];
            const evidence = Object.freeze({ afterHash, beforeHash, layer });
            return Object.freeze({
              ...evidence,
              pairHash: hashPassThroughPaintedGeometryLayerPair(evidence),
            });
          },
        ),
      );
      const pairEvidence = Object.freeze({
        afterRef,
        beforeRef,
        cellId: scrollCell.cellId,
        labId: labId as HkVisualizationBrowserPassThroughPaintedGeometryPairEvidence["labId"],
        layerEndpointHashCount: 6 as const,
        layerPairs,
        layerReceiptCount: 3 as const,
        oraclePlanHash:
          HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_PLAN_HASH,
        oracleVersion: HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_VERSION,
      });
      pair = Object.freeze({
        ...pairEvidence,
        pairHash: sha256HkVisualizationCanonical({
          contractVersion:
            HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_AGGREGATE_VERSION,
          evidence: pairEvidence,
          kind: "browser-pass-through-painted-geometry-pair",
        }),
      });
    }
    const cellPairCount = pair ? 1 as const : 0 as const;
    const cellEndpointCount = pair ? 2 as const : 0 as const;
    const cellLayerReceiptCount = pair ? 3 as const : 0 as const;
    const cellLayerEndpointHashCount = pair ? 6 as const : 0 as const;
    const cellEvidence = Object.freeze({
      cellId: scrollCell.cellId,
      endpointCount: cellEndpointCount,
      kind: pair ? "applicable" as const : "not-applicable" as const,
      labId,
      layerEndpointHashCount: cellLayerEndpointHashCount,
      layerReceiptCount: cellLayerReceiptCount,
      pair,
      pairCount: cellPairCount,
    });
    cells.push(Object.freeze({
      ...cellEvidence,
      cellAggregateHash: sha256HkVisualizationCanonical({
        contractVersion:
          HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_AGGREGATE_VERSION,
        evidence: cellEvidence,
        kind: "browser-pass-through-painted-geometry-pair-cell",
      }),
    }));
    endpointCount = addSafe("painted-geometry endpoint count", endpointCount,
      cellEndpointCount);
    layerEndpointHashCount = addSafe(
      "painted-geometry layer endpoint hash count",
      layerEndpointHashCount,
      cellLayerEndpointHashCount,
    );
    layerReceiptCount = addSafe("painted-geometry layer receipt count",
      layerReceiptCount, cellLayerReceiptCount);
    pairCount = addSafe("painted-geometry pair count", pairCount,
      cellPairCount);
  }
  const aggregateEvidence = Object.freeze({
    cellCount: cells.length,
    cells: Object.freeze(cells),
    contractVersion:
      HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_AGGREGATE_VERSION,
    endpointCount,
    layerEndpointHashCount,
    layerReceiptCount,
    oraclePackageAggregateHash: oracleAggregate.aggregateHash,
    oraclePlanHash:
      HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_PLAN_HASH,
    oracleVersion: HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_VERSION,
    pairCount,
    scrollPackageAggregateHash: scrollAggregate.aggregateHash,
  });
  return Object.freeze({
    ...aggregateEvidence,
    aggregateHash: sha256HkVisualizationCanonical({
      contractVersion:
        HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_AGGREGATE_VERSION,
      evidence: aggregateEvidence,
      kind: "browser-pass-through-painted-geometry-pair-package",
    }),
  });
}

function canonicalPassThroughResetState(
  label: string,
  raw: unknown,
): HkVisualizationPassThroughResetState {
  exactObjectKeys(label, raw, ["comparison", "height", "mode", "value"]);
  const candidate = raw as Record<string, unknown>;
  for (const key of ["comparison", "height", "mode", "value"] as const) {
    if (typeof candidate[key] !== "number" || !Number.isFinite(candidate[key])) {
      throw new Error(`${label}.${key} must be finite.`);
    }
  }
  return Object.freeze({
    comparison: candidate.comparison as number,
    height: candidate.height as number,
    mode: candidate.mode as number,
    value: candidate.value as number,
  });
}

/**
 * Canonicalizes the three Reset observations for every pass-through browser
 * cell and cross-binds each one to the already audited public/raw/visible
 * oracle observation at the same exact phase. Dedicated cells must emit zero.
 */
export function aggregateHkVisualizationBrowserPassThroughResetReceipts(
  scrollAggregate: HkVisualizationBrowserScrollAggregate,
  oracleAggregate: HkVisualizationBrowserPassThroughOracleAggregate,
  rawCells: readonly HkVisualizationBrowserPassThroughResetCellReceipt[],
): HkVisualizationBrowserPassThroughResetAggregate {
  if (!Array.isArray(rawCells)) {
    throw new Error("Browser pass-through Reset cell receipts must be an array.");
  }
  if (
    rawCells.length !== scrollAggregate.cells.length
    || oracleAggregate.cells.length !== scrollAggregate.cells.length
  ) {
    throw new Error(
      "Browser pass-through Reset, oracle, and scroll cell counts must match exactly.",
    );
  }
  const cells: HkVisualizationBrowserPassThroughResetCellEvidence[] = [];
  let canonicalNoopActionCount = 0;
  let layerEndpointHashCount = 0;
  let layerReceiptCount = 0;
  let observationCount = 0;
  let passThroughCellCount = 0;
  let restoringActionCount = 0;
  for (let cellIndex = 0; cellIndex < scrollAggregate.cells.length; cellIndex += 1) {
    const scrollCell = scrollAggregate.cells[cellIndex];
    const oracleCell = oracleAggregate.cells[cellIndex];
    const rawCell = rawCells[cellIndex];
    const label = `browser pass-through Reset cell ${scrollCell.cellId}`;
    exactObjectKeys(label, rawCell, [
      "cellId",
      "labId",
      "passThroughResetObservations",
    ]);
    if (
      rawCell.cellId !== scrollCell.cellId
      || oracleCell.cellId !== scrollCell.cellId
    ) {
      throw new Error(`${label} differs from exact scroll/oracle cell order.`);
    }
    const labId = labIdFromCellId(scrollCell.cellId);
    if (rawCell.labId !== labId || oracleCell.labId !== labId) {
      throw new Error(`${label} labId mismatched.`);
    }
    if (!Array.isArray(rawCell.passThroughResetObservations)) {
      throw new Error(`${label} observations must be an array.`);
    }
    const kind = isHKPassThroughLabId(labId) ? "pass-through" : "dedicated";
    if (oracleCell.kind !== kind) {
      throw new Error(`${label} oracle kind mismatched.`);
    }
    const expectedActions = kind === "pass-through"
      ? buildHkVisualizationPassThroughResetActionPlan(labId)
      : Object.freeze([]);
    if (rawCell.passThroughResetObservations.length !== expectedActions.length) {
      throw new Error(
        `${label} requires exact ${expectedActions.length} ordered Reset observations.`,
      );
    }
    const rawResetObservations: readonly HkVisualizationPassThroughResetObservation[] =
      rawCell.passThroughResetObservations;
    const observations: readonly HkVisualizationBrowserPassThroughResetObservationEvidence[] =
      Object.freeze(
        rawResetObservations.map((
          rawObservation: HkVisualizationPassThroughResetObservation,
          actionIndex: number,
        ) => {
        const action = expectedActions[actionIndex];
        exactObjectKeys(`${label} observation ${actionIndex}`, rawObservation, [
          "activationKey",
          "actionKind",
          "afterEndpoint",
          "afterFingerprint",
          "afterState",
          "beforeEndpoint",
          "beforeFingerprint",
          "beforeState",
          "canonicalFingerprint",
          "expectedState",
          "labId",
          "layerEndpointHashCount",
          "layerPairs",
          "layerReceiptCount",
          "phase",
        ]);
        const endpointReceipt =
          validateHkVisualizationBrowserPassThroughResetEndpointReceipt({
            cellId: scrollCell.cellId,
            labId,
            phase: rawObservation.phase,
            receipt: {
              afterEndpoint: rawObservation.afterEndpoint,
              beforeEndpoint: rawObservation.beforeEndpoint,
              layerEndpointHashCount: rawObservation.layerEndpointHashCount,
              layerPairs: rawObservation.layerPairs,
              layerReceiptCount: rawObservation.layerReceiptCount,
            },
          });
        const observation = Object.freeze({
          activationKey: rawObservation.activationKey,
          actionKind: rawObservation.actionKind,
          afterEndpoint: endpointReceipt.afterEndpoint,
          afterFingerprint: nonEmpty(
            `${label} observation ${actionIndex}.afterFingerprint`,
            rawObservation.afterFingerprint,
          ),
          afterState: canonicalPassThroughResetState(
            `${label} observation ${actionIndex}.afterState`,
            rawObservation.afterState,
          ),
          beforeEndpoint: endpointReceipt.beforeEndpoint,
          beforeFingerprint: nonEmpty(
            `${label} observation ${actionIndex}.beforeFingerprint`,
            rawObservation.beforeFingerprint,
          ),
          beforeState: canonicalPassThroughResetState(
            `${label} observation ${actionIndex}.beforeState`,
            rawObservation.beforeState,
          ),
          canonicalFingerprint: nonEmpty(
            `${label} observation ${actionIndex}.canonicalFingerprint`,
            rawObservation.canonicalFingerprint,
          ),
          expectedState: canonicalPassThroughResetState(
            `${label} observation ${actionIndex}.expectedState`,
            rawObservation.expectedState,
          ),
          labId: rawObservation.labId,
          layerEndpointHashCount: endpointReceipt.layerEndpointHashCount,
          layerPairs: endpointReceipt.layerPairs,
          layerReceiptCount: endpointReceipt.layerReceiptCount,
          phase: rawObservation.phase,
        }) satisfies HkVisualizationPassThroughResetObservation;
        if (
          !action
          || observation.labId !== labId
          || observation.activationKey !== action.activationKey
          || observation.actionKind !== action.actionKind
          || (
            action.actionIndex === 0
              ? !/^range-state:reset:hk-state:\d{5}$/.test(observation.phase)
              : observation.phase !== action.phase
          )
        ) {
          throw new Error(`${label} Reset action ${actionIndex} identity drifted.`);
        }
        const issues = auditHkVisualizationPassThroughResetObservation(
          observation,
        );
        if (issues.length > 0) {
          throw new Error(
            `${label} Reset action ${actionIndex} failed: ${issues.join(" | ")}.`,
          );
        }
        const matchingOracle = oracleCell.observations.filter(
          ({ phase }) => phase === observation.phase,
        );
        if (matchingOracle.length !== 1) {
          throw new Error(
            `${label} Reset action ${actionIndex} requires exactly one same-phase three-layer oracle observation.`,
          );
        }
        const oracle = matchingOracle[0];
        if (
          canonicalHkVisualizationJson(observation.afterEndpoint)
          !== canonicalHkVisualizationJson(oracle)
        ) {
          throw new Error(
            `${label} Reset action ${actionIndex} after endpoint did not bind the exact same-phase general oracle.`,
          );
        }
        const publicState = observation.afterEndpoint.publicState.state;
        const projectedTuple = canonicalPassThroughResetState(
          `${label} observation ${actionIndex} public tuple`,
          {
            comparison: publicState.comparison,
            height: publicState.height,
            mode: publicState.mode,
            value: publicState.value,
          },
        );
        if (
          canonicalHkVisualizationJson(projectedTuple)
            !== canonicalHkVisualizationJson(observation.afterState)
        ) {
          throw new Error(
            `${label} Reset action ${actionIndex} public state did not bind the exact after tuple.`,
          );
        }
        const evidenceWithoutHash = Object.freeze({
          actionIndex,
          activationKey: observation.activationKey,
          actionKind: observation.actionKind,
          afterEndpoint: observation.afterEndpoint,
          afterFingerprint: observation.afterFingerprint,
          afterState: observation.afterState,
          beforeEndpoint: observation.beforeEndpoint,
          beforeFingerprint: observation.beforeFingerprint,
          beforeState: observation.beforeState,
          canonicalFingerprint: observation.canonicalFingerprint,
          expectedState: observation.expectedState,
          layerEndpointHashCount: observation.layerEndpointHashCount,
          layerPairs: observation.layerPairs,
          layerReceiptCount: observation.layerReceiptCount,
          phase: observation.phase,
        });
        return Object.freeze({
          ...evidenceWithoutHash,
          observationHash: sha256HkVisualizationCanonical({
            cellId: scrollCell.cellId,
            contractVersion:
              HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_AGGREGATE_VERSION,
            evidence: evidenceWithoutHash,
            kind: "browser-pass-through-reset-observation",
            resetContractVersion:
              HK_VISUALIZATION_PASS_THROUGH_RESET_CONTRACT_VERSION,
          }),
        }) satisfies HkVisualizationBrowserPassThroughResetObservationEvidence;
        }),
      );
    const phases = Object.freeze(observations.map(({ phase }) => phase));
    if (
      phases.some((phase) => !scrollCell.phases.includes(phase))
      || new Set(phases).size !== phases.length
    ) {
      throw new Error(`${label} phases are absent from scroll evidence or duplicated.`);
    }
    const observationHashes = Object.freeze(
      observations.map(({ observationHash }) => observationHash),
    );
    const cellRestoringActionCount = observations.filter(
      ({ actionKind }) => actionKind === "restoring",
    ).length;
    const cellCanonicalNoopActionCount = observations.filter(
      ({ actionKind }) => actionKind === "canonical-noop",
    ).length;
    const cellLayerReceiptCount = observations.length * 3;
    const cellLayerEndpointHashCount = observations.length * 6;
    const evidenceWithoutHash = Object.freeze({
      canonicalNoopActionCount: cellCanonicalNoopActionCount,
      cellId: scrollCell.cellId,
      kind,
      labId,
      layerEndpointHashCount: cellLayerEndpointHashCount,
      layerReceiptCount: cellLayerReceiptCount,
      observationCount: observations.length,
      observationHashes,
      observations,
      phases,
      restoringActionCount: cellRestoringActionCount,
    });
    cells.push(Object.freeze({
      ...evidenceWithoutHash,
      cellAggregateHash: sha256HkVisualizationCanonical({
        contractVersion:
          HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_AGGREGATE_VERSION,
        evidence: evidenceWithoutHash,
        kind: "browser-pass-through-reset-cell",
      }),
    }));
    if (kind === "pass-through") passThroughCellCount += 1;
    observationCount = addSafe("Reset observation count", observationCount, observations.length);
    restoringActionCount = addSafe(
      "Reset restoring action count",
      restoringActionCount,
      cellRestoringActionCount,
    );
    canonicalNoopActionCount = addSafe(
      "Reset canonical no-op action count",
      canonicalNoopActionCount,
      cellCanonicalNoopActionCount,
    );
    layerReceiptCount = addSafe(
      "Reset layer receipt count",
      layerReceiptCount,
      cellLayerReceiptCount,
    );
    layerEndpointHashCount = addSafe(
      "Reset layer endpoint hash count",
      layerEndpointHashCount,
      cellLayerEndpointHashCount,
    );
  }
  const evidenceWithoutHash = Object.freeze({
    canonicalNoopActionCount,
    cellCount: cells.length,
    cells: Object.freeze(cells),
    contractVersion:
      HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_AGGREGATE_VERSION,
    layerEndpointHashCount,
    layerReceiptCount,
    observationCount,
    passThroughCellCount,
    restoringActionCount,
  });
  return Object.freeze({
    ...evidenceWithoutHash,
    aggregateHash: sha256HkVisualizationCanonical({
      contractVersion:
        HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_AGGREGATE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-pass-through-reset-package",
    }),
  });
}

function canonicalHkP6AveragesVisibility(
  label: string,
  raw: unknown,
) {
  exactObjectKeys(label, raw, [
    "ariaHiddenAncestor",
    "hiddenAncestor",
    "inertAncestor",
    "visuallyVisible",
  ]);
  const candidate = raw as Record<string, unknown>;
  for (const field of [
    "ariaHiddenAncestor",
    "hiddenAncestor",
    "inertAncestor",
    "visuallyVisible",
  ] as const) {
    if (typeof candidate[field] !== "boolean") {
      throw new Error(`${label}.${field} must be a boolean.`);
    }
  }
}

function canonicalHkP6AveragesObservation(
  cellId: string,
  raw: HkP6AveragesLineGraphObservation,
  index: number,
) {
  const label = `browser P6 averages ${cellId} observation ${index}`;
  exactObjectKeys(label, raw, [
    "dedicatedState",
    "flags",
    "meanLines",
    "phase",
    "points",
    "seriesBShift",
    "serializedDedicatedState",
    "segments",
    "tableRows",
    "visibility",
  ]);
  nonEmpty(`${label}.phase`, raw.phase);
  nonEmpty(`${label}.serializedDedicatedState`, raw.serializedDedicatedState);
  exactObjectKeys(`${label}.dedicatedState`, raw.dedicatedState, [
    "mode",
    "seriesBShift",
    "seriesCount",
    "values",
  ]);
  exactObjectKeys(`${label}.flags`, raw.flags, [
    "seriesCoincident",
    "seriesMeansEqual",
  ]);
  exactObjectKeys(`${label}.meanLines`, raw.meanLines, ["A", "B"]);
  exactObjectKeys(`${label}.meanLines.A`, raw.meanLines.A, ["value", "y"]);
  exactObjectKeys(`${label}.meanLines.B`, raw.meanLines.B, ["value", "y"]);
  exactObjectKeys(`${label}.points`, raw.points, ["A", "B"]);
  exactObjectKeys(`${label}.segments`, raw.segments, ["A", "B"]);
  if (!Array.isArray(raw.tableRows)) {
    throw new Error(`${label}.tableRows must be an array.`);
  }
  raw.tableRows.forEach((row, rowIndex) =>
    exactObjectKeys(`${label}.tableRows[${rowIndex}]`, row, [
      "hour",
      "seriesA",
      "seriesB",
    ]),
  );
  for (const series of ["A", "B"] as const) {
    if (!Array.isArray(raw.points[series])) {
      throw new Error(`${label}.points.${series} must be an array.`);
    }
    raw.points[series].forEach((point, pointIndex) =>
      exactObjectKeys(`${label}.points.${series}[${pointIndex}]`, point, [
        "hour",
        "value",
        "x",
        "y",
      ]),
    );
    if (!Array.isArray(raw.segments[series])) {
      throw new Error(`${label}.segments.${series} must be an array.`);
    }
    raw.segments[series].forEach((segment, segmentIndex) =>
      exactObjectKeys(
        `${label}.segments.${series}[${segmentIndex}]`,
        segment,
        [
          "fromHour",
          "fromValue",
          "toHour",
          "toValue",
          "x1",
          "x2",
          "y1",
          "y2",
        ],
      ),
    );
  }
  exactObjectKeys(`${label}.visibility`, raw.visibility, [
    "graph",
    "meanLines",
    "meanReadout",
    "points",
    "segments",
    "table",
    "tableRows",
  ]);
  canonicalHkP6AveragesVisibility(`${label}.visibility.graph`, raw.visibility.graph);
  canonicalHkP6AveragesVisibility(`${label}.visibility.table`, raw.visibility.table);
  canonicalHkP6AveragesVisibility(
    `${label}.visibility.meanReadout`,
    raw.visibility.meanReadout,
  );
  exactObjectKeys(`${label}.visibility.points`, raw.visibility.points, ["A", "B"]);
  exactObjectKeys(`${label}.visibility.segments`, raw.visibility.segments, ["A", "B"]);
  exactObjectKeys(`${label}.visibility.meanLines`, raw.visibility.meanLines, ["A", "B"]);
  if (!Array.isArray(raw.visibility.tableRows)) {
    throw new Error(`${label}.visibility.tableRows must be an array.`);
  }
  raw.visibility.tableRows.forEach((evidence, evidenceIndex) =>
    canonicalHkP6AveragesVisibility(
      `${label}.visibility.tableRows[${evidenceIndex}]`,
      evidence,
    ),
  );
  for (const group of ["points", "segments", "meanLines"] as const) {
    for (const series of ["A", "B"] as const) {
      const evidence = raw.visibility[group][series];
      if (!Array.isArray(evidence)) {
        throw new Error(`${label}.visibility.${group}.${series} must be an array.`);
      }
      evidence.forEach((entry, entryIndex) =>
        canonicalHkP6AveragesVisibility(
          `${label}.visibility.${group}.${series}[${entryIndex}]`,
          entry,
        ),
      );
    }
  }
  const observation = Object.freeze(
    canonicalClone(`${label} durable evidence`, raw),
  );
  const issues = auditHkP6AveragesLineGraphObservation(observation);
  if (issues.length > 0) {
    throw new Error(`${label} failed its numeric/geometry oracle: ${issues.join(" | ")}`);
  }
  return observation;
}

/**
 * Extracts the two independently named P6 semantic boundary states from each
 * P6 browser cell. The state ledger, scroll ledger, and raw geometry ledger
 * must all name the same zero-shift then ordinary-positive phases.
 */
export function aggregateHkVisualizationBrowserP6AveragesReceipts(
  scrollAggregate: HkVisualizationBrowserScrollAggregate,
  rawCells: readonly HkVisualizationBrowserP6AveragesCellReceipt[],
): HkVisualizationBrowserP6AveragesAggregate {
  if (!Array.isArray(rawCells)) {
    throw new Error("Browser P6 averages cell receipts must be an array.");
  }
  if (rawCells.length !== scrollAggregate.cells.length) {
    throw new Error(
      `Browser P6 averages cell count ${rawCells.length} differs from exact scroll cell count ${scrollAggregate.cells.length}.`,
    );
  }
  const cells: HkVisualizationBrowserP6AveragesCellEvidence[] = [];
  for (let cellIndex = 0; cellIndex < scrollAggregate.cells.length; cellIndex += 1) {
    const scrollCell = scrollAggregate.cells[cellIndex];
    const rawCell = rawCells[cellIndex];
    const label = `browser P6 averages cell ${scrollCell.cellId}`;
    exactObjectKeys(`${label} receipt`, rawCell, [
      "cellId",
      "labId",
      "p6AveragesLineGraphObservations",
      "stateScanLedger",
    ]);
    if (rawCell.cellId !== scrollCell.cellId) {
      throw new Error(`${label} differs from the exact scroll cell or is out of order.`);
    }
    const labId = labIdFromCellId(scrollCell.cellId);
    if (rawCell.labId !== labId) {
      throw new Error(`${label} labId mismatch: ${String(rawCell.labId)}.`);
    }
    if (!Array.isArray(rawCell.p6AveragesLineGraphObservations)) {
      throw new Error(`${label} observations must be an array.`);
    }
    if (labId !== HK_P6_AVERAGES_LAB_ID) {
      if (rawCell.p6AveragesLineGraphObservations.length !== 0) {
        throw new Error(`${label} is not P6 and must carry exactly zero P6 observations.`);
      }
      continue;
    }
    if (!scrollCell.cellId.startsWith(`P6/${HK_P6_AVERAGES_LAB_ID}/`)) {
      throw new Error(`${label} must be bound to the exact P6 grade/lab cell.`);
    }

    exactObjectKeys(`${label}.stateScanLedger`, rawCell.stateScanLedger, [
      "entries",
      "executedStateIds",
      "plannedStateIds",
    ]);
    const ledger: HkVisualizationBrowserP6AveragesCellReceipt["stateScanLedger"] =
      rawCell.stateScanLedger;
    if (
      !Array.isArray(ledger.entries) ||
      !Array.isArray(ledger.plannedStateIds) ||
      !Array.isArray(ledger.executedStateIds)
    ) {
      throw new Error(`${label} requires complete independent state ledgers.`);
    }
    const ledgerEntries: HkVisualizationBrowserP6AveragesCellReceipt["stateScanLedger"]["entries"] =
      ledger.entries;
    const entryIds: string[] = [];
    const entryPhases: string[] = [];
    ledgerEntries.forEach((entry, entryIndex) => {
      exactObjectKeys(`${label}.stateScanLedger.entries[${entryIndex}]`, entry, [
        "id",
        "phase",
        "reasons",
      ]);
      entryIds.push(nonEmpty(`${label}.entry ${entryIndex} id`, entry.id));
      entryPhases.push(nonEmpty(`${label}.entry ${entryIndex} phase`, entry.phase));
      if (!Array.isArray(entry.reasons) || entry.reasons.length === 0) {
        throw new Error(`${label}.entry ${entryIndex} reasons must be non-empty.`);
      }
      const reasons = entry.reasons.map((reason, reasonIndex) =>
        nonEmpty(`${label}.entry ${entryIndex} reason ${reasonIndex}`, reason),
      );
      if (new Set(reasons).size !== reasons.length) {
        throw new Error(`${label}.entry ${entryIndex} reasons must be duplicate-free.`);
      }
    });
    if (
      new Set(entryIds).size !== entryIds.length ||
      new Set(entryPhases).size !== entryPhases.length ||
      canonicalHkVisualizationJson(entryIds) !==
        canonicalHkVisualizationJson(ledger.plannedStateIds) ||
      canonicalHkVisualizationJson(ledger.executedStateIds) !==
        canonicalHkVisualizationJson(ledger.plannedStateIds)
    ) {
      throw new Error(`${label} state plan/execution is missing, duplicate, extra, or out of order.`);
    }
    const zeroEntries = ledgerEntries.filter(({ reasons }) =>
      reasons.includes(HK_P6_ZERO_SHIFT_REASON),
    );
    const positiveEntries = ledgerEntries.filter(({ reasons }) =>
      reasons.includes(HK_P6_POSITIVE_SHIFT_REASON),
    );
    if (zeroEntries.length !== 1 || positiveEntries.length !== 1) {
      throw new Error(
        `${label} requires exactly one zero-shift and one ordinary-positive independently planned boundary.`,
      );
    }
    const zeroEntryIndex = ledgerEntries.indexOf(zeroEntries[0]);
    const positiveEntryIndex = ledgerEntries.indexOf(positiveEntries[0]);
    if (zeroEntryIndex >= positiveEntryIndex) {
      throw new Error(`${label} must plan zero shift before ordinary positive shift.`);
    }
    const boundaryEntries = [zeroEntries[0], positiveEntries[0]] as const;
    const scrollPhaseIndexes = boundaryEntries.map((entry) =>
      scrollCell.phases.indexOf(entry.phase),
    );
    if (
      scrollPhaseIndexes.some((index) => index < 0) ||
      scrollPhaseIndexes[0] >= scrollPhaseIndexes[1]
    ) {
      throw new Error(
        `${label} scroll phases must contain zero then ordinary-positive boundary phases in order.`,
      );
    }

    const rawObservations: readonly HkP6AveragesLineGraphObservation[] =
      rawCell.p6AveragesLineGraphObservations;
    const observations = rawObservations.map(
      (observation, observationIndex) =>
        canonicalHkP6AveragesObservation(
          scrollCell.cellId,
          observation,
          observationIndex,
        ),
    );
    const observationPhases = observations.map(({ phase }) => phase);
    if (new Set(observationPhases).size !== observationPhases.length) {
      throw new Error(`${label} observation phases must be duplicate-free.`);
    }
    if (
      observationPhases.some((phase) => !scrollCell.phases.includes(phase))
    ) {
      throw new Error(`${label} contains an observation for an unknown scroll phase.`);
    }
    const boundaryObservations = boundaryEntries.map((entry) =>
      observations.filter(({ phase }) => phase === entry.phase),
    );
    if (boundaryObservations.some((matches) => matches.length !== 1)) {
      throw new Error(`${label} must observe each planned P6 boundary exactly once.`);
    }
    const rawBoundaryIndexes = boundaryObservations.map(([observation]) =>
      observations.indexOf(observation),
    );
    if (rawBoundaryIndexes[0] >= rawBoundaryIndexes[1]) {
      throw new Error(`${label} observations must record zero before ordinary positive.`);
    }
    if (boundaryObservations[0][0].seriesBShift !== 0) {
      throw new Error(`${label} zero-shift boundary must record seriesBShift=0.`);
    }
    if (!(boundaryObservations[1][0].seriesBShift > 0)) {
      throw new Error(`${label} ordinary-positive boundary must record seriesBShift>0.`);
    }
    const boundaries = Object.freeze(
      boundaryEntries.map((entry, boundaryIndex) => {
        const boundary = boundaryIndex === 0 ? "zero-shift" : "ordinary-positive";
        const observation = boundaryObservations[boundaryIndex][0];
        const evidenceWithoutHash = Object.freeze({
          boundary,
          observation,
          phase: entry.phase,
        });
        return Object.freeze({
          ...evidenceWithoutHash,
          observationHash: sha256HkVisualizationCanonical({
            cellId: scrollCell.cellId,
            contractVersion: HK_VISUALIZATION_BROWSER_P6_AVERAGES_AGGREGATE_VERSION,
            evidence: evidenceWithoutHash,
            kind: "browser-p6-averages-boundary-observation",
            labId: HK_P6_AVERAGES_LAB_ID,
          }),
        });
      }),
    );
    const evidenceWithoutHash = Object.freeze({
      boundaries,
      boundaryCount: 2 as const,
      cellId: scrollCell.cellId,
      labId: HK_P6_AVERAGES_LAB_ID,
      phases: Object.freeze(boundaries.map(({ phase }) => phase)),
    });
    cells.push(
      Object.freeze({
        ...evidenceWithoutHash,
        cellAggregateHash: sha256HkVisualizationCanonical({
          contractVersion: HK_VISUALIZATION_BROWSER_P6_AVERAGES_AGGREGATE_VERSION,
          evidence: evidenceWithoutHash,
          kind: "browser-p6-averages-cell",
        }),
      }),
    );
  }
  if (cells.length > 1) {
    throw new Error("A machine package may contain at most one P6 averages cell.");
  }
  const evidenceWithoutHash = Object.freeze({
    boundaryObservationCount: cells.length * 2,
    cellCount: cells.length,
    cells: Object.freeze(cells),
    contractVersion: HK_VISUALIZATION_BROWSER_P6_AVERAGES_AGGREGATE_VERSION,
  });
  return Object.freeze({
    ...evidenceWithoutHash,
    aggregateHash: sha256HkVisualizationCanonical({
      contractVersion: HK_VISUALIZATION_BROWSER_P6_AVERAGES_AGGREGATE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-p6-averages-package",
    }),
  });
}

const HK_P6_BUDGET_BOUNDARY_CONTRACT = Object.freeze(
  (["represent", "solve", "check"] as const).flatMap((modeId) =>
    ([
      "positive-remaining",
      "exact-zero",
      "positive-overspend",
    ] as const).map((boundary) =>
      Object.freeze({
        boundary,
        modeId,
        reason: `semantic-boundary:p6-budget-${boundary}` as const,
      }),
    ),
  ),
);

function canonicalHkP6BudgetObservation(
  cellId: string,
  raw: HkP6BudgetBoundaryObservation,
  index: number,
) {
  const label = `browser P6 budget ${cellId} observation ${index}`;
  exactObjectKeys(label, raw, [
    "boundary",
    "dedicatedState",
    "derived",
    "phase",
    "serializedDedicatedState",
    "surface",
  ]);
  nonEmpty(`${label}.phase`, raw.phase);
  nonEmpty(`${label}.serializedDedicatedState`, raw.serializedDedicatedState);
  exactObjectKeys(`${label}.dedicatedState`, raw.dedicatedState, [
    "budget",
    "count",
    "extraCost",
    "unitPrice",
    "workflowStep",
  ]);
  exactObjectKeys(`${label}.derived`, raw.derived, [
    "itemCost",
    "overspend",
    "remaining",
    "totalSpending",
    "withinBudget",
  ]);
  if (!raw.surface || typeof raw.surface !== "object" || Array.isArray(raw.surface)) {
    throw new Error(`${label}.surface must be one visible workflow surface.`);
  }
  const observation = Object.freeze(canonicalClone(`${label} durable evidence`, raw));
  let issues: readonly string[];
  try {
    issues = auditHkP6BudgetBoundaryObservation(observation);
  } catch (error) {
    throw new Error(
      `${label} budget oracle failed closed: ${error instanceof Error ? error.message : String(error)}.`,
    );
  }
  if (issues.length > 0) {
    throw new Error(`${label} failed its arithmetic/geometry oracle: ${issues.join(" | ")}`);
  }
  return observation;
}

/** Binds all nine P6 budget semantic states to independent state + scroll ledgers. */
export function aggregateHkVisualizationBrowserP6BudgetReceipts(
  scrollAggregate: HkVisualizationBrowserScrollAggregate,
  rawCells: readonly HkVisualizationBrowserP6BudgetCellReceipt[],
): HkVisualizationBrowserP6BudgetAggregate {
  if (!Array.isArray(rawCells)) {
    throw new Error("Browser P6 budget cell receipts must be an array.");
  }
  if (rawCells.length !== scrollAggregate.cells.length) {
    throw new Error(
      `Browser P6 budget cell count ${rawCells.length} differs from exact scroll cell count ${scrollAggregate.cells.length}.`,
    );
  }
  const cells: HkVisualizationBrowserP6BudgetCellEvidence[] = [];
  for (let cellIndex = 0; cellIndex < scrollAggregate.cells.length; cellIndex += 1) {
    const scrollCell = scrollAggregate.cells[cellIndex];
    const rawCell = rawCells[cellIndex];
    const label = `browser P6 budget cell ${scrollCell.cellId}`;
    exactObjectKeys(`${label} receipt`, rawCell, [
      "cellId",
      "labId",
      "p6BudgetBoundaryObservations",
      "stateScanLedger",
    ]);
    if (rawCell.cellId !== scrollCell.cellId) {
      throw new Error(`${label} differs from the exact scroll cell or is out of order.`);
    }
    const labId = labIdFromCellId(scrollCell.cellId);
    if (rawCell.labId !== labId) {
      throw new Error(`${label} labId mismatch: ${String(rawCell.labId)}.`);
    }
    if (!Array.isArray(rawCell.p6BudgetBoundaryObservations)) {
      throw new Error(`${label} observations must be an array.`);
    }
    if (labId !== HK_P6_BUDGET_LAB_ID) {
      if (rawCell.p6BudgetBoundaryObservations.length !== 0) {
        throw new Error(`${label} is not P6 budget and must carry exactly zero observations.`);
      }
      continue;
    }
    if (!scrollCell.cellId.startsWith(`P6/${HK_P6_BUDGET_LAB_ID}/`)) {
      throw new Error(`${label} must be bound to the exact P6 grade/lab cell.`);
    }
    exactObjectKeys(`${label}.stateScanLedger`, rawCell.stateScanLedger, [
      "entries",
      "executedStateIds",
      "plannedStateIds",
    ]);
    const ledger: HkVisualizationBrowserP6BudgetCellReceipt["stateScanLedger"] =
      rawCell.stateScanLedger;
    if (
      !Array.isArray(ledger.entries) ||
      !Array.isArray(ledger.plannedStateIds) ||
      !Array.isArray(ledger.executedStateIds)
    ) {
      throw new Error(`${label} requires complete independent state ledgers.`);
    }
    const entries: HkVisualizationBrowserP6BudgetCellReceipt["stateScanLedger"]["entries"] =
      ledger.entries;
    const entryIds: string[] = [];
    const entryPhases: string[] = [];
    entries.forEach((entry, entryIndex) => {
      exactObjectKeys(`${label}.stateScanLedger.entries[${entryIndex}]`, entry, [
        "id",
        "modeId",
        "phase",
        "reasons",
      ]);
      entryIds.push(nonEmpty(`${label}.entry ${entryIndex} id`, entry.id));
      entryPhases.push(nonEmpty(`${label}.entry ${entryIndex} phase`, entry.phase));
      nonEmpty(`${label}.entry ${entryIndex} modeId`, entry.modeId);
      if (!Array.isArray(entry.reasons) || entry.reasons.length === 0) {
        throw new Error(`${label}.entry ${entryIndex} reasons must be non-empty.`);
      }
      const reasons = entry.reasons.map((reason, reasonIndex) =>
        nonEmpty(`${label}.entry ${entryIndex} reason ${reasonIndex}`, reason),
      );
      if (new Set(reasons).size !== reasons.length) {
        throw new Error(`${label}.entry ${entryIndex} reasons must be duplicate-free.`);
      }
    });
    if (
      new Set(entryIds).size !== entryIds.length ||
      new Set(entryPhases).size !== entryPhases.length ||
      canonicalHkVisualizationJson(entryIds) !==
        canonicalHkVisualizationJson(ledger.plannedStateIds) ||
      canonicalHkVisualizationJson(ledger.executedStateIds) !==
        canonicalHkVisualizationJson(ledger.plannedStateIds)
    ) {
      throw new Error(`${label} state plan/execution is missing, duplicate, extra, or out of order.`);
    }
    const semanticEntries = entries.filter(({ reasons }) =>
      reasons.some((reason) => reason.startsWith("semantic-boundary:p6-budget-")),
    );
    if (semanticEntries.length !== HK_P6_BUDGET_BOUNDARY_CONTRACT.length) {
      throw new Error(`${label} requires exactly nine independently planned budget boundaries.`);
    }
    HK_P6_BUDGET_BOUNDARY_CONTRACT.forEach((expected, boundaryIndex) => {
      const entry = semanticEntries[boundaryIndex];
      if (
        entry.modeId !== expected.modeId ||
        !entry.reasons.includes(expected.reason) ||
        entry.reasons.filter((reason) =>
          reason.startsWith("semantic-boundary:p6-budget-"),
        ).length !== 1
      ) {
        throw new Error(
          `${label} budget state ${boundaryIndex} must be ${expected.modeId}:${expected.boundary}.`,
        );
      }
    });
    const scrollIndexes = semanticEntries.map(({ phase }) =>
      scrollCell.phases.indexOf(phase),
    );
    if (
      scrollIndexes.some((index) => index < 0) ||
      scrollIndexes.some((index, position) =>
        position > 0 && index <= scrollIndexes[position - 1],
      )
    ) {
      throw new Error(`${label} scroll phases must contain all nine budget boundaries in order.`);
    }
    const rawObservations: readonly HkP6BudgetBoundaryObservation[] =
      rawCell.p6BudgetBoundaryObservations;
    const observations = rawObservations.map((observation, observationIndex) =>
      canonicalHkP6BudgetObservation(scrollCell.cellId, observation, observationIndex),
    );
    const observationPhases = observations.map(({ phase }) => phase);
    const exactSemanticPhases = semanticEntries.map(({ phase }) => phase);
    if (
      observations.length !== HK_P6_BUDGET_BOUNDARY_CONTRACT.length ||
      new Set(observationPhases).size !== observationPhases.length ||
      canonicalHkVisualizationJson(observationPhases) !==
        canonicalHkVisualizationJson(exactSemanticPhases)
    ) {
      throw new Error(
        `${label} observation phases must equal the exact nine ordered semantic boundary phases with no missing, extra, duplicate, or reordered phase.`,
      );
    }
    const boundaries = Object.freeze(
      HK_P6_BUDGET_BOUNDARY_CONTRACT.map((expected, boundaryIndex) => {
        const entry = semanticEntries[boundaryIndex];
        const matches = observations.filter(({ phase }) => phase === entry.phase);
        if (matches.length !== 1) {
          throw new Error(`${label} must observe each planned budget boundary exactly once.`);
        }
        const observation = matches[0];
        if (
          observation.boundary !== expected.boundary ||
          observation.dedicatedState.workflowStep !== expected.modeId
        ) {
          throw new Error(
            `${label} observation ${boundaryIndex} must bind ${expected.modeId}:${expected.boundary}.`,
          );
        }
        const evidenceWithoutHash = Object.freeze({
          boundary: expected.boundary,
          modeId: expected.modeId,
          observation,
          phase: entry.phase,
        });
        return Object.freeze({
          ...evidenceWithoutHash,
          observationHash: sha256HkVisualizationCanonical({
            cellId: scrollCell.cellId,
            contractVersion: HK_VISUALIZATION_BROWSER_P6_BUDGET_AGGREGATE_VERSION,
            evidence: evidenceWithoutHash,
            kind: "browser-p6-budget-boundary-observation",
            labId: HK_P6_BUDGET_LAB_ID,
          }),
        });
      }),
    );
    const evidenceWithoutHash = Object.freeze({
      boundaries,
      boundaryCount: 9 as const,
      cellId: scrollCell.cellId,
      labId: HK_P6_BUDGET_LAB_ID,
      phases: Object.freeze(boundaries.map(({ phase }) => phase)),
    });
    cells.push(Object.freeze({
      ...evidenceWithoutHash,
      cellAggregateHash: sha256HkVisualizationCanonical({
        contractVersion: HK_VISUALIZATION_BROWSER_P6_BUDGET_AGGREGATE_VERSION,
        evidence: evidenceWithoutHash,
        kind: "browser-p6-budget-cell",
      }),
    }));
  }
  if (cells.length > 1) {
    throw new Error("A machine package may contain at most one P6 budget cell.");
  }
  const evidenceWithoutHash = Object.freeze({
    boundaryObservationCount: cells.length * 9,
    cellCount: cells.length,
    cells: Object.freeze(cells),
    contractVersion: HK_VISUALIZATION_BROWSER_P6_BUDGET_AGGREGATE_VERSION,
  });
  return Object.freeze({
    ...evidenceWithoutHash,
    aggregateHash: sha256HkVisualizationCanonical({
      contractVersion: HK_VISUALIZATION_BROWSER_P6_BUDGET_AGGREGATE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-p6-budget-package",
    }),
  });
}

export function aggregateHkVisualizationBrowserChunkReceipts(
  plan: HkVisualizationStateCellPlan,
  receipts: readonly HkVisualizationBrowserChunkReceipt[],
): HkVisualizationBrowserChunkAggregate {
  if (!Array.isArray(receipts)) {
    throw new Error("Browser chunk receipts must be an array.");
  }
  if (receipts.length !== plan.chunks.length) {
    throw new Error(
      `Browser chunk receipt count ${receipts.length} differs from exact plan count ${plan.chunks.length}.`,
    );
  }

  const pageInstanceIds = new Set<string>();
  const executedStateIds: string[] = [];
  const seenStateIds = new Set<string>();
  const scrollObservationReceipts: HkVisualizationBrowserScrollObservationReceipt[] = [];
  for (let chunkIndex = 0; chunkIndex < plan.chunks.length; chunkIndex += 1) {
    const expectedChunk = plan.chunks[chunkIndex];
    const receipt = receipts[chunkIndex];
    const label = `browser chunk ${chunkIndex}`;
    if (receipt.chunkId !== expectedChunk.chunkId) {
      throw new Error(`${label} has the wrong chunkId or is out of order.`);
    }
    if (
      receipt.start !== expectedChunk.start ||
      receipt.end !== expectedChunk.end
    ) {
      throw new Error(
        `${label} must preserve exact range [${expectedChunk.start},${expectedChunk.end}); observed [${receipt.start},${receipt.end}).`,
      );
    }
    if (receipt.planHash !== plan.planHash) {
      throw new Error(`${label} has the wrong plan hash.`);
    }
    if (receipt.cellExecutionHash !== plan.cellExecutionHash) {
      throw new Error(`${label} has the wrong cell execution hash.`);
    }
    if (receipt.recomputedPlanHash !== plan.planHash) {
      throw new Error(`${label} has the wrong recomputed plan hash.`);
    }
    if (receipt.recomputedCellExecutionHash !== plan.cellExecutionHash) {
      throw new Error(
        `${label} has the wrong recomputed cell execution hash.`,
      );
    }
    if (receipt.budgetTotalMs !== expectedChunk.budget.totalMs) {
      throw new Error(
        `${label} budget ${receipt.budgetTotalMs}ms differs from exact v2 budget ${expectedChunk.budget.totalMs}ms.`,
      );
    }
    if (
      typeof receipt.pageInstanceId !== "string" ||
      !receipt.pageInstanceId.trim()
    ) {
      throw new Error(`${label} has an empty pageInstanceId.`);
    }
    if (pageInstanceIds.has(receipt.pageInstanceId)) {
      throw new Error(
        `${label} reused pageInstanceId ${receipt.pageInstanceId}; every chunk requires a fresh page.`,
      );
    }
    pageInstanceIds.add(receipt.pageInstanceId);

    const expectedStates = plan.states.slice(
      expectedChunk.start,
      expectedChunk.end,
    );
    if (receipt.stateReceipts.length !== expectedStates.length) {
      throw new Error(
        `${label} state receipt count ${receipt.stateReceipts.length} differs from exact count ${expectedStates.length}; a state is missing or extra.`,
      );
    }
    for (
      let localStateIndex = 0;
      localStateIndex < expectedStates.length;
      localStateIndex += 1
    ) {
      const expectedState = expectedStates[localStateIndex];
      const stateReceipt = receipt.stateReceipts[localStateIndex];
      const stateLabel = `${label} state ${expectedState.id}`;
      if (stateReceipt.stateId !== expectedState.id) {
        throw new Error(`${stateLabel} has the wrong stateId or is out of order.`);
      }
      if (seenStateIds.has(stateReceipt.stateId)) {
        throw new Error(`${stateLabel} is duplicated.`);
      }
      seenStateIds.add(stateReceipt.stateId);
      if (stateReceipt.stateIndex !== expectedState.index) {
        throw new Error(`${stateLabel} has the wrong stateIndex.`);
      }
      if (stateReceipt.expectedSignature !== expectedState.expectedSignature) {
        throw new Error(`${stateLabel} has the wrong expected signature.`);
      }
      if (stateReceipt.observedSignature !== expectedState.expectedSignature) {
        throw new Error(`${stateLabel} has the wrong observed signature.`);
      }
      if (stateReceipt.startingSignature !== expectedState.startingSignature) {
        throw new Error(`${stateLabel} has the wrong starting signature.`);
      }
      if (
        stateReceipt.startingObservedSignature !==
        expectedState.startingSignature
      ) {
        throw new Error(
          `${stateLabel} has the wrong starting observed signature.`,
        );
      }
      const expectedPhase = `range-state:${expectedState.modeId}:${expectedState.id}`;
      if (stateReceipt.phase !== expectedPhase) {
        throw new Error(`${stateLabel} has the wrong scroll observation phase.`);
      }
      scrollObservationReceipts.push(
        canonicalHkVisualizationBrowserScrollObservationReceipt(
          {
            observationSet: stateReceipt.scrollObservationSet,
            phase: stateReceipt.phase,
          },
          `${stateLabel} scroll observation`,
        ),
      );
      executedStateIds.push(stateReceipt.stateId);
    }
  }

  const plannedStateIds = plan.states.map(({ id }) => id);
  if (
    executedStateIds.length !== plannedStateIds.length ||
    plannedStateIds.some((id, index) => executedStateIds[index] !== id)
  ) {
    throw new Error(
      "Browser chunks must execute every exact planned state once in plan order with no gap, overlap, or duplicate.",
    );
  }
  if (scrollObservationReceipts.length !== plannedStateIds.length) {
    throw new Error(
      "Browser chunks must bind exactly one nested scroll observation set to every state.",
    );
  }
  const scrollContainerCount = scrollObservationReceipts.reduce(
    (sum, { observationSet }) =>
      addSafe(
        "browser chunk scroll container count",
        sum,
        observationSet.containerCount,
      ),
    0,
  );
  const scrollObservationCount = scrollObservationReceipts.reduce(
    (sum, { observationSet }) =>
      addSafe(
        "browser chunk scroll observation count",
        sum,
        observationSet.observationCount,
      ),
    0,
  );
  const scrollPositionAuditCount =
    scrollObservationCount * HK_VISUALIZATION_SCROLL_POSITION_AUDIT_IDS.length;
  const scrollObservationAggregateHash = sha256HkVisualizationCanonical({
    contractVersion: HK_VISUALIZATION_STATE_CHUNK_CONTRACT_VERSION,
    kind: "ordered-browser-chunk-scroll-observation-receipts",
    receipts: scrollObservationReceipts,
  });
  return Object.freeze({
    cellExecutionHash: plan.cellExecutionHash,
    chunkCount: plan.chunks.length,
    executedStateIds: Object.freeze(executedStateIds),
    freshPageCount: pageInstanceIds.size,
    planHash: plan.planHash,
    plannedStateIds: Object.freeze(plannedStateIds),
    scrollContainerCount,
    scrollObservationAggregateHash,
    scrollObservationCount,
    scrollObservationSetCount: scrollObservationReceipts.length,
    scrollPositionAuditCount,
    stateCount: plannedStateIds.length,
  });
}
