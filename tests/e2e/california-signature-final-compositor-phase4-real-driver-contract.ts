import type {
  CaliforniaSignatureFinalCompositorClassCounter,
  CaliforniaSignatureFinalCompositorExecutionGroupSummary
} from "./california-signature-final-compositor-capacity-plan";
import type {
  CaliforniaSignatureFinalCompositorPhase3BaselineOutcome,
  CaliforniaSignatureFinalCompositorPhase3BaselineSampleContext,
  CaliforniaSignatureFinalCompositorPhase3CalibrationOutcome,
  CaliforniaSignatureFinalCompositorPhase3CalibrationSampleContext,
  CaliforniaSignatureFinalCompositorPhase3MeasurementDriver,
  CaliforniaSignatureFinalCompositorPhase3PlanBinding,
  CaliforniaSignatureFinalCompositorPhase3ProducerIdentity
} from "./california-signature-final-compositor-phase3-measurement-campaign";

export const CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_SCHEMA_VERSION = 2;
export const CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_RECEIPT_FILE_NAME =
  "accepted-production-build.json";
export const CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_RECEIPT_DIRECTORY_PREFIX =
  "california-phase4-accepted-build-";
export const CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_MAX_RECEIPT_LIFETIME_MS =
  5 * 60 * 1_000;

export const CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_BASELINE_STAGE_SEQUENCE =
  Object.freeze(["navigation", "hydrate", "replay", "layout", "real-reset"] as const);

export const CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_BROWSER_LAUNCH_ARGS =
  Object.freeze([
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-dev-shm-usage",
    "--disable-features=Translate,BackForwardCache",
    "--force-color-profile=srgb",
    "--no-first-run"
  ] as const);

export const CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_PROJECT_CONTEXTS =
  Object.freeze({
    "desktop-chrome": Object.freeze({
      deviceScaleFactor: 1,
      hasTouch: false,
      isMobile: false,
      screen: Object.freeze({ height: 1080, width: 1920 }),
      viewport: Object.freeze({ height: 1100, width: 1440 })
    }),
    "mobile-chrome": Object.freeze({
      deviceScaleFactor: 2.75,
      hasTouch: true,
      isMobile: true,
      screen: Object.freeze({ height: 851, width: 393 }),
      viewport: Object.freeze({ height: 727, width: 393 })
    })
  } as const);

export type CaliforniaSignatureFinalCompositorPhase4ProjectName =
  keyof typeof CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_PROJECT_CONTEXTS;
export type CaliforniaSignatureFinalCompositorPhase4BaselineStage =
  typeof CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_BASELINE_STAGE_SEQUENCE[number];

export type CaliforniaSignatureFinalCompositorPhase4AcceptedBuildReceipt = {
  acceptedBuildId: string;
  acceptedBuildIdFileSha256: string;
  acceptedBuildManifestSha256: string;
  acceptedBuildReceiptSha256: string;
  browserExecutableSha256: string;
  browserIdentitySha256: string;
  calibrationTargetPlanSha256: string;
  dependencySha256: string;
  dimensionRegistrySha256: string;
  environmentDiscoveryFileSha256: string;
  environmentSha256: string;
  executionGroupSubsetSha256: string;
  executionPlanSha256: string;
  expiresAtUnixMs: number;
  formalExecutionAuthorized: false;
  issuedAtUnixMs: number;
  lifecycleAuthoritySha256: string;
  machineSha256: string;
  schemaVersion: typeof CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_SCHEMA_VERSION;
  server: CaliforniaSignatureFinalCompositorPhase4ServerIdentity;
  sharpLibvipsSha256: string;
  sourceBuildSha256: string;
  sourceManifestSha256: string;
  sourceReceiptSha256: string;
  sourceSnapshotSha256: string;
  status: "accepted-production-build-server-v2";
  storageState: { filePath: string; fileSha256: string };
  worktreeRoot: "/Volumes/Starship/MAIS-ca-viz-labs-wt";
};

export type CaliforniaSignatureFinalCompositorPhase4PrivateReceiptRead = {
  bytes: Buffer;
  directoryMode: number;
  directoryPath: string;
  directoryRealPath: string;
  fileMode: number;
  filePath: string;
  fileRealPath: string;
  fileSha256: string;
  linkCount: number;
};

export type CaliforniaSignatureFinalCompositorPhase4ProductionBuildIdentity = {
  acceptedBuildId: string;
  acceptedBuildIdFileSha256: string;
  acceptedBuildManifestSha256: string;
  sourceBuildSha256: string;
};

export type CaliforniaSignatureFinalCompositorPhase4SourceIdentity = {
  sourceManifestSha256: string;
  sourceSnapshotSha256: string;
};

export type CaliforniaSignatureFinalCompositorPhase4ServerIdentity = {
  acceptedBuildId: string;
  baseUrl: string;
  processId: number;
  processIdentitySha256: string;
  readinessReceiptSha256: string;
};

export type CaliforniaSignatureFinalCompositorPhase4BrowserIdentity = {
  browserExecutablePath: string;
  browserExecutableSha256: string;
  browserIdentitySha256: string;
  playwrightVersion: string;
};

export type CaliforniaSignatureFinalCompositorPhase4SharpIdentity = {
  dependencySha256: string;
  libvipsVersion: string;
  sharpLibvipsSha256: string;
  sharpVersion: string;
};

export type CaliforniaSignatureFinalCompositorPhase4ProcessIdentity = {
  nodeVersion: string;
  parentProcessId: number;
  processId: number;
  processStartedAtMonotonicNs: string;
};

export type CaliforniaSignatureFinalCompositorPhase4LifecycleCheckpoint = {
  acceptedBuildId: string;
  acceptedBuildIdFileSha256: string;
  acceptedBuildManifestSha256: string;
  acceptedBuildReceiptSha256: string;
  browserExecutableSha256: string;
  browserIdentitySha256: string;
  dependencySha256: string;
  environmentDiscoveryFileSha256: string;
  environmentSha256: string;
  expiresAtUnixMs: number;
  lifecycleAuthoritySha256: string;
  machineSha256: string;
  serverBaseUrl: string;
  serverProcessIdentitySha256: string;
  serverReadinessReceiptSha256: string;
  sharpLibvipsSha256: string;
  sourceBuildSha256: string;
  sourceManifestSha256: string;
  sourceSnapshotSha256: string;
};

export type CaliforniaSignatureFinalCompositorPhase4CalibrationTarget = {
  axisId: string;
  backingSize: { height: number; width: number };
  benchId: string;
  bindingKey: string;
  canvasIndex: number;
  classId: string;
  clipSize: { height: number; width: number };
  cssSize: { height: number; width: number };
  groupKey: string;
  labId: string;
  projectName: CaliforniaSignatureFinalCompositorPhase4ProjectName;
  reviewedClassSha256: string;
  reviewedPoliciesSha256: string;
  targetSha256: string;
};

export type CaliforniaSignatureFinalCompositorPhase4CalibrationComparison = {
  comparisonSha256: string;
  currentPixelsSha256: string;
  expectedPixelsSha256: string;
  mismatchPixelCount: number;
};

export type CaliforniaSignatureFinalCompositorPhase4AuthenticatedPlan = {
  calibrationTargets: readonly CaliforniaSignatureFinalCompositorPhase4CalibrationTarget[];
  calibrationTargetPlanSha256: string;
  executionGroups: readonly CaliforniaSignatureFinalCompositorExecutionGroupSummary[];
  executionGroupSubsetSha256: string;
  executionPlan: CaliforniaSignatureFinalCompositorPhase3PlanBinding;
};

export type CaliforniaSignatureFinalCompositorPhase4BaselineStageEvidence = {
  browserContextIdentitySha256: string;
  completed: true;
  evidenceSha256: string;
  projectName: CaliforniaSignatureFinalCompositorPhase4ProjectName;
  stage: CaliforniaSignatureFinalCompositorPhase4BaselineStage;
};

export type CaliforniaSignatureFinalCompositorPhase4DecodedPixels = {
  height: number;
  pixels: Uint8Array;
  width: number;
};

export type CaliforniaSignatureFinalCompositorPhase4CapturedCalibration = {
  browserContextIdentitySha256: string;
  observedTarget: CaliforniaSignatureFinalCompositorPhase4CalibrationTarget;
  screenshot: Buffer;
};

export type CaliforniaSignatureFinalCompositorPhase4PhysicalSession = {
  browserContextIdentitySha256ByProject: Readonly<
    Record<CaliforniaSignatureFinalCompositorPhase4ProjectName, string>
  >;
  captureMaximumEnvelope(
    context: CaliforniaSignatureFinalCompositorPhase3CalibrationSampleContext,
    target: CaliforniaSignatureFinalCompositorPhase4CalibrationTarget
  ): Promise<CaliforniaSignatureFinalCompositorPhase4CapturedCalibration>;
  close(): Promise<void>;
  captureIndependentExpectedPixels(
    context: CaliforniaSignatureFinalCompositorPhase3CalibrationSampleContext,
    target: CaliforniaSignatureFinalCompositorPhase4CalibrationTarget
  ): Promise<CaliforniaSignatureFinalCompositorPhase4DecodedPixels>;
  compareIndependentPixels(
    expected: CaliforniaSignatureFinalCompositorPhase4DecodedPixels,
    current: CaliforniaSignatureFinalCompositorPhase4DecodedPixels,
    context: CaliforniaSignatureFinalCompositorPhase3CalibrationSampleContext,
    target: CaliforniaSignatureFinalCompositorPhase4CalibrationTarget
  ): Promise<CaliforniaSignatureFinalCompositorPhase4CalibrationComparison>;
  decodeScreenshot(
    screenshot: Buffer,
    context: CaliforniaSignatureFinalCompositorPhase3CalibrationSampleContext,
    target: CaliforniaSignatureFinalCompositorPhase4CalibrationTarget
  ): Promise<CaliforniaSignatureFinalCompositorPhase4DecodedPixels>;
  runBaselineStage(
    context: CaliforniaSignatureFinalCompositorPhase3BaselineSampleContext,
    stage: CaliforniaSignatureFinalCompositorPhase4BaselineStage
  ): Promise<CaliforniaSignatureFinalCompositorPhase4BaselineStageEvidence>;
};

/**
 * This authority type documents the future A22 hand-off. Production Phase4 has
 * no authority constructor and therefore remains HOLD. Test support owns a
 * WeakMap-branded implementation to exercise the fail-closed driver contract.
 */
export type CaliforniaSignatureFinalCompositorPhase4LifecycleAuthority = {
  authenticatedPlan: CaliforniaSignatureFinalCompositorPhase4AuthenticatedPlan;
  checkpoint(label: string): Promise<CaliforniaSignatureFinalCompositorPhase4LifecycleCheckpoint>;
  inspectPhysicalChrome(): Promise<CaliforniaSignatureFinalCompositorPhase4BrowserIdentity | null>;
  inspectSharp(): Promise<CaliforniaSignatureFinalCompositorPhase4SharpIdentity | null>;
  launchPhysicalChrome(options: {
    acceptedReceipt: CaliforniaSignatureFinalCompositorPhase4AcceptedBuildReceipt;
    authenticatedPlan: CaliforniaSignatureFinalCompositorPhase4AuthenticatedPlan;
    browser: CaliforniaSignatureFinalCompositorPhase4BrowserIdentity;
    server: CaliforniaSignatureFinalCompositorPhase4ServerIdentity;
    sharp: CaliforniaSignatureFinalCompositorPhase4SharpIdentity;
  }): Promise<CaliforniaSignatureFinalCompositorPhase4PhysicalSession>;
  nowMonotonicNs(): bigint;
  nowUnixMs(): number;
  processIdentity(): CaliforniaSignatureFinalCompositorPhase4ProcessIdentity;
  readAcceptedBuildReceipt(): Promise<CaliforniaSignatureFinalCompositorPhase4PrivateReceiptRead>;
  readProductionBuild(): Promise<CaliforniaSignatureFinalCompositorPhase4ProductionBuildIdentity | null>;
  sourceReceiptSha256: string;
};

export type CaliforniaSignatureFinalCompositorPhase4RealDriverLease = {
  acceptedBuildReceiptSha256: string;
  close(): Promise<void>;
  driver: CaliforniaSignatureFinalCompositorPhase3MeasurementDriver;
  formalExecutionAuthorized: false;
  processIdentitySha256: string;
  producerIdentity: CaliforniaSignatureFinalCompositorPhase3ProducerIdentity;
};

export type {
  CaliforniaSignatureFinalCompositorClassCounter,
  CaliforniaSignatureFinalCompositorExecutionGroupSummary,
  CaliforniaSignatureFinalCompositorPhase3BaselineOutcome,
  CaliforniaSignatureFinalCompositorPhase3CalibrationOutcome
};
