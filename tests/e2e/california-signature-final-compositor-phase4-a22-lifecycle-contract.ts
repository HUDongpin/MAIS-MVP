import type {
  CaliforniaSignatureFinalCompositorPhase3PlanBinding,
  CaliforniaSignatureFinalCompositorPhase3ProducerIdentity
} from "./california-signature-final-compositor-phase3-measurement-campaign";
import type {
  CaliforniaSignatureFinalCompositorPhase4AcceptedBuildReceipt,
  CaliforniaSignatureFinalCompositorPhase4AuthenticatedPlan,
  CaliforniaSignatureFinalCompositorPhase4BrowserIdentity,
  CaliforniaSignatureFinalCompositorPhase4LifecycleCheckpoint,
  CaliforniaSignatureFinalCompositorPhase4ProductionBuildIdentity,
  CaliforniaSignatureFinalCompositorPhase4ServerIdentity,
  CaliforniaSignatureFinalCompositorPhase4SharpIdentity
} from "./california-signature-final-compositor-phase4-real-driver-contract";

export const CALIFORNIA_PHASE4_A22_LIFECYCLE_SCHEMA_VERSION = 1;
export const CALIFORNIA_PHASE4_A22_LIFECYCLE_DIRECTORY_PREFIX =
  "california-phase4-a22-lifecycle-";
export const CALIFORNIA_PHASE4_A22_LIFECYCLE_PUBLICATION_FILE_NAME =
  "diagnostic-lifecycle-publication.json";
export const CALIFORNIA_PHASE4_A22_LIFECYCLE_MAX_AGE_MS = 5 * 60 * 1_000;

export const CALIFORNIA_PHASE4_EXPECTED_RASTER_BLOCKER =
  "independent-reviewed-four-class-expected-raster-unavailable" as const;

export type CaliforniaPhase4A22HeldFileIdentity = {
  ctimeNs: string;
  dev: string;
  ino: string;
  mode: number;
  mtimeNs: string;
  nlink: number;
  size: number;
};

export type CaliforniaPhase4A22HeldFileRead = {
  bytes: Buffer;
  fileName: string;
  fstatAfter: CaliforniaPhase4A22HeldFileIdentity;
  fstatBefore: CaliforniaPhase4A22HeldFileIdentity;
  lstat: CaliforniaPhase4A22HeldFileIdentity;
  realPath: string;
  requestedPath: string;
};

export type CaliforniaPhase4A22HeldDirectoryIdentity = {
  directoryPath: string;
  directoryRealPath: string;
  identity: CaliforniaPhase4A22HeldFileIdentity;
};

export type CaliforniaPhase4A22LifecycleSourceBinding = {
  authenticatedPlan: CaliforniaSignatureFinalCompositorPhase4AuthenticatedPlan;
  executionPlan: CaliforniaSignatureFinalCompositorPhase3PlanBinding;
  sourceManifestSha256: string;
  sourcePlanSha256: string;
  sourceReceiptSha256: string;
  sourceSnapshotSha256: string;
};

export type CaliforniaPhase4A22LifecycleSnapshot = {
  acceptedBuildReceipt: CaliforniaSignatureFinalCompositorPhase4AcceptedBuildReceipt;
  browser: CaliforniaSignatureFinalCompositorPhase4BrowserIdentity;
  checkpoint: CaliforniaSignatureFinalCompositorPhase4LifecycleCheckpoint;
  productionBuild: CaliforniaSignatureFinalCompositorPhase4ProductionBuildIdentity;
  producerIdentity: CaliforniaSignatureFinalCompositorPhase3ProducerIdentity;
  server: CaliforniaSignatureFinalCompositorPhase4ServerIdentity;
  sharp: CaliforniaSignatureFinalCompositorPhase4SharpIdentity;
  source: CaliforniaPhase4A22LifecycleSourceBinding;
  storageStateSha256: string;
};

export type CaliforniaPhase4A22LifecyclePublication = {
  acceptedBuildId: string;
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
  independentExpectedRasterAvailable: false;
  independentExpectedRasterBlocker:
    typeof CALIFORNIA_PHASE4_EXPECTED_RASTER_BLOCKER;
  issuedAtUnixMs: number;
  lifecycleArtifactFileSha256: string;
  lifecycleArtifactIdentitySha256: string;
  machineSha256: string;
  producerIdentitySha256: string;
  publicationSha256: string;
  schemaVersion: typeof CALIFORNIA_PHASE4_A22_LIFECYCLE_SCHEMA_VERSION;
  serverBaseUrl: string;
  serverProcessIdentitySha256: string;
  serverReadinessReceiptSha256: string;
  sharpLibvipsSha256: string;
  sourceBuildSha256: string;
  sourceManifestSha256: string;
  sourcePlanSha256: string;
  sourceReceiptSha256: string;
  sourceSnapshotSha256: string;
  status: "diagnostic-a22-lifecycle-publication-v1";
  storageStateSha256: string;
  worktreeRoot: "/Volumes/Starship/MAIS-ca-viz-labs-wt";
};

export type CaliforniaPhase4A22LifecycleLease = {
  checkpoint(): Promise<CaliforniaPhase4A22LifecyclePublication>;
  close(): Promise<void>;
  formalExecutionAuthorized: false;
  independentExpectedRasterAvailable: false;
  publication: CaliforniaPhase4A22LifecyclePublication;
};

