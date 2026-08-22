import {
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY,
  type CaliforniaSignatureFinalCompositorReviewedMaximumDimensions
} from "./california-signature-final-compositor-measurement-lifecycle";
import type {
  CaliforniaSignatureFinalCompositorCapacitySourceIdentity,
  CaliforniaSignatureFinalCompositorClassCounter,
  CaliforniaSignatureFinalCompositorExecutionGroupSummary
} from "./california-signature-final-compositor-capacity-plan";

const PHASE3_SAMPLE_COUNT_PER_RECEIPT =
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY.warmupCount +
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY.measuredSampleCount;

/**
 * Current-source compatibility alarms only. The executable test campaign also
 * derives and binds the complete source identity, execution-group digest,
 * dimension registry, work-unit digest, project counters, and class plans.
 */
export const CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE3_EXACT_COUNTERS = Object.freeze({
  baselineReceiptCount: 4_650,
  baselineStageAcknowledgementCount: 4_650 * PHASE3_SAMPLE_COUNT_PER_RECEIPT * 5,
  calibrationArtifactSetCount: 4 * PHASE3_SAMPLE_COUNT_PER_RECEIPT,
  calibrationReceiptCount: 4,
  canvasCropCount: 1_049_268,
  canvasGroupCount: 4_464,
  canvasReceiptCount: 1_031_016,
  dimensionClassCount: 4,
  evidenceRecordCount: 1_127_995,
  executionGroupCount: 4_650,
  measurementReceiptCount: 4_654,
  rawSampleCount: 4_654 * PHASE3_SAMPLE_COUNT_PER_RECEIPT
} as const);

export type CaliforniaSignatureFinalCompositorPhase3CampaignSourcePlan = {
  canvasGroupCount: number;
  executionGroupOrderSha256: string;
  executionGroups: CaliforniaSignatureFinalCompositorExecutionGroupSummary[];
  sourceIdentity: CaliforniaSignatureFinalCompositorCapacitySourceIdentity;
};

export type CaliforniaSignatureFinalCompositorPhase3AuthoritativeSourceIdentities = {
  dimensionRegistrySha256: string;
  receiptsSha256: string;
  reviewedClassesSha256: string;
  sourceContractSha256: string;
  sourceIdentitySha256: string;
  sourceSha256: string;
  sourceSnapshotSha256: string;
  summarySha256: string;
  workUnitsSha256: string;
};

export type CaliforniaSignatureFinalCompositorPhase3CurrentSourceReceipt = {
  schemaVersion: 1;
  sourceIdentities: CaliforniaSignatureFinalCompositorPhase3AuthoritativeSourceIdentities;
  sourcePlan: CaliforniaSignatureFinalCompositorPhase3CampaignSourcePlan;
  sourceReceiptSha256: string;
  status: "authoritative-current-source-plan-v1";
};

export type CaliforniaSignatureFinalCompositorPhase3ProducerIdentity = {
  acceptedBuildId: string;
  acceptedBuildReceiptSha256: string;
  browserExecutableSha256: string;
  browserIdentitySha256: string;
  dependencySha256: string;
  environmentDiscoveryFileSha256: string;
  environmentSha256: string;
  machineSha256: string;
  sharpLibvipsSha256: string;
  sourceBuildSha256: string;
  sourceSnapshotSha256: string;
};

export type CaliforniaSignatureFinalCompositorPhase3BaselineSampleContext = {
  group: CaliforniaSignatureFinalCompositorExecutionGroupSummary;
  kind: "measured" | "warmup";
  ordinal: number;
};

export type CaliforniaSignatureFinalCompositorPhase3CalibrationSampleContext = {
  dimensionClass: CaliforniaSignatureFinalCompositorClassCounter;
  kind: "measured" | "warmup";
  ordinal: number;
};

export type CaliforniaSignatureFinalCompositorPhase3BaselineOutcome = {
  browserContextIdentitySha256: string;
  finalCompositorExcluded: true;
  groupKey: string;
  stages: readonly {
    acknowledgementSha256: string;
    completed: true;
    stage: "navigation" | "hydrate" | "replay" | "layout" | "real-reset";
  }[];
};

export type CaliforniaSignatureFinalCompositorPhase3CalibrationOutcome = {
  browserContextIdentitySha256: string;
  comparisonSha256: string;
  decodeSha256: string;
  finalCompositorIncluded: true;
  maximumDimensions: CaliforniaSignatureFinalCompositorReviewedMaximumDimensions;
  mismatchPixelCount: 0;
  screenshotByteCount: number;
  screenshotSha256: string;
  stage: "final-compositor";
};

export type CaliforniaSignatureFinalCompositorPhase3MeasurementDriver = {
  runBaselineSample(
    context: CaliforniaSignatureFinalCompositorPhase3BaselineSampleContext
  ): Promise<CaliforniaSignatureFinalCompositorPhase3BaselineOutcome>;
  runCalibrationSample(
    context: CaliforniaSignatureFinalCompositorPhase3CalibrationSampleContext
  ): Promise<CaliforniaSignatureFinalCompositorPhase3CalibrationOutcome>;
};

export type CaliforniaSignatureFinalCompositorPhase3PlanBinding = {
  classDistributionSha256: string;
  classPlans: readonly {
    classId: string;
    classPlanSha256: string;
    cropCount: number;
    maximumDimensions: CaliforniaSignatureFinalCompositorReviewedMaximumDimensions;
    projectName: string;
    reviewedClassSha256: string;
    reviewedPoliciesSha256: string;
  }[];
  classRegistryOrderSha256: string;
  counters: typeof CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE3_EXACT_COUNTERS;
  dimensionRegistrySha256: string;
  executionGroupOrderSha256: string;
  executionGroupsSha256: string;
  executionPlanSha256: string;
  receiptsSha256: string;
  reviewedClassesSha256: string;
  sourceContractSha256: string;
  sourceReceiptSha256: string;
  sourceIdentitySha256: string;
  sourceSha256: string;
  sourceSnapshotSha256: string;
  summarySha256: string;
  workUnitsSha256: string;
};

export type CaliforniaSignatureFinalCompositorPhase3CampaignSeal = {
  capacityAuthorization: {
    artifact24hPassed: false;
    blockers: readonly string[];
    formal72hPassed: false;
    laneManifestReviewed: false;
    measurementReceiptsReviewed: false;
    runnerIntegrated: false;
  };
  counters: typeof CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE3_EXACT_COUNTERS;
  executionPlan: CaliforniaSignatureFinalCompositorPhase3PlanBinding;
  formalExecutionAuthorized: false;
  producerIdentity: CaliforniaSignatureFinalCompositorPhase3ProducerIdentity;
  producerIdentitySha256: string;
  receiptSequenceSha256: string;
  receiptStream: {
    byteCount: number;
    fileName: "phase3-measurement-receipts.ndjson";
    fileSha256: string;
    lineCount: number;
  };
  schemaVersion: 1;
  sealSha256: string;
  status: "diagnostic-phase3-measurement-campaign";
  timingPolicy: typeof CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY;
  timingPolicySha256: string;
  timingProcedureSha256: string;
};

export type CaliforniaSignatureFinalCompositorPhase3CampaignPublication = {
  directoryPath: string;
  receiptStreamFilePath: string;
  seal: CaliforniaSignatureFinalCompositorPhase3CampaignSeal;
  sealFilePath: string;
  sealFileSha256: string;
};

/**
 * Production remains a deliberately non-executable HOLD. The synthetic
 * campaign engine is structurally isolated outside production and is not
 * reachable from this module, even if process environment or argv are forged.
 */
export function prepareCaliforniaSignatureFinalCompositorPhase3MeasurementCampaign(): never {
  if (arguments.length !== 0) {
    throw new Error(
      "California Phase3 measurement campaign takes no caller-authored environment, samples, or plan"
    );
  }
  throw new Error(
    "California Phase3 measurement campaign HOLD: root has not supplied an accepted BUILD_ID " +
    "and the lifecycle-owned physical browser executable is not yet reviewed"
  );
}
