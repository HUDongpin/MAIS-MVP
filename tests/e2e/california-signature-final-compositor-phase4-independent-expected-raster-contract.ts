import type {
  CaliforniaSignatureFinalCompositorPhase4ProjectName
} from "./california-signature-final-compositor-phase4-real-driver-contract";

export const CALIFORNIA_PHASE4_INDEPENDENT_EXPECTED_RASTER_SCHEMA_VERSION = 1;
export const CALIFORNIA_PHASE4_INDEPENDENT_EXPECTED_RASTER_DIRECTORY_PREFIX =
  "california-phase4-independent-expected-raster-";
export const CALIFORNIA_PHASE4_INDEPENDENT_EXPECTED_RASTER_MANIFEST_FILE_NAME =
  "independent-expected-raster-manifest.json";
export const CALIFORNIA_PHASE4_INDEPENDENT_EXPECTED_RASTER_CLASS_COUNT = 4;

export type CaliforniaPhase4IndependentExpectedRasterEntry = {
  backingHeight: number;
  backingWidth: number;
  bindingKey: string;
  classId: string;
  entrySha256: string;
  pixelAudit: {
    comparisonSha256: string;
    decodedRgbaSha256: string;
    declaredRgbaSha256: string;
    mismatchPixelCount: number;
  };
  pixelByteCount: number;
  projectName: CaliforniaSignatureFinalCompositorPhase4ProjectName;
  rgbaFileName: string;
  rgbaSha256: string;
  targetSha256: string;
};

export type CaliforniaPhase4IndependentExpectedRasterManifest = {
  acceptedBuildId: string;
  acceptedBuildReceiptSha256: string;
  calibrationTargetPlanSha256: string;
  entries: readonly CaliforniaPhase4IndependentExpectedRasterEntry[];
  entryCount: typeof CALIFORNIA_PHASE4_INDEPENDENT_EXPECTED_RASTER_CLASS_COUNT;
  entryOrderSha256: string;
  expiresAtUnixMs: number;
  formalExecutionAuthorized: false;
  independentExpectedRasterAvailable: true;
  issuedAtUnixMs: number;
  manifestSha256: string;
  producer: {
    browserScreenshotReadback: false;
    producerExecutableSha256: string;
    producerSourceSha256: string;
    renderer: "independent-reference-renderer";
    samePageCanvasReadback: false;
  };
  reviewerReceiptSha256: string;
  schemaVersion: typeof CALIFORNIA_PHASE4_INDEPENDENT_EXPECTED_RASTER_SCHEMA_VERSION;
  sourceSnapshotSha256: string;
  status: "reviewed-independent-expected-raster-v1";
  worktreeRoot: "/Volumes/Starship/MAIS-ca-viz-labs-wt";
};

export type CaliforniaPhase4IndependentExpectedRasterAvailability = {
  blocker: "independent-reviewed-four-class-expected-raster-unavailable";
  classCount: typeof CALIFORNIA_PHASE4_INDEPENDENT_EXPECTED_RASTER_CLASS_COUNT;
  formalExecutionAuthorized: false;
  independentExpectedRasterAvailable: false;
};
