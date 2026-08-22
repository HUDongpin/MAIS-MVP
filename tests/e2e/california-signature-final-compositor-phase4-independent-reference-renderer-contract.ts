export const CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_RENDERER_SCHEMA_VERSION = 1;
export const CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_RENDERER_CLASS_COUNT = 4;

export type CaliforniaPhase4IndependentReferenceProjectName =
  | "desktop-chrome"
  | "mobile-chrome";

export type CaliforniaPhase4IndependentReferenceTarget = {
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
  projectName: CaliforniaPhase4IndependentReferenceProjectName;
  reviewedClassSha256: string;
  reviewedPoliciesSha256: string;
  targetSha256: string;
};

export type CaliforniaPhase4IndependentAbsoluteValueScene = {
  backgroundRgba: readonly [number, number, number, number];
  curveRgba: readonly [number, number, number, number];
  gridRgba: readonly [number, number, number, number];
  insideIntercept: 0;
  insideLineRgba: readonly [number, number, number, number];
  insideSlope: 1;
  kind: "absolute-value-fold";
  sceneId: "absolute-value-fold-m1-b0-complete-v1";
  world: { xMax: 8; xMin: -8; yMax: 8; yMin: -8 };
};

export type CaliforniaPhase4IndependentShapeScene = {
  backgroundRgba: readonly [number, number, number, number];
  badgeRgba: readonly [number, number, number, number];
  closed: true;
  equalSides: true;
  gridRgba: readonly [number, number, number, number];
  halfExtentWorldMilli: 3_677;
  kind: "square-defining-attributes";
  outlineRgba: readonly [number, number, number, number];
  sceneId: "square-equal-closed-turn0-size3-v1";
  sides: 4;
  turnDegrees: 0;
  worldRadiusMilli: 10_600;
};

export type CaliforniaPhase4IndependentReferenceScene =
  | CaliforniaPhase4IndependentAbsoluteValueScene
  | CaliforniaPhase4IndependentShapeScene;

export type CaliforniaPhase4IndependentReferenceSceneEntry = {
  scene: CaliforniaPhase4IndependentReferenceScene;
  target: CaliforniaPhase4IndependentReferenceTarget;
};

export type CaliforniaPhase4IndependentReferenceRaster = {
  backingHeight: number;
  backingWidth: number;
  bindingKey: string;
  classId: string;
  pixelByteCount: number;
  projectName: CaliforniaPhase4IndependentReferenceProjectName;
  readPixels(): Uint8Array;
  rgbaSha256: string;
  sceneId: CaliforniaPhase4IndependentReferenceScene["sceneId"];
  sceneSha256: string;
  targetSha256: string;
};

export type CaliforniaPhase4IndependentReferenceSourceFile = {
  byteCount: number;
  ctimeNs: string;
  dev: string;
  fileName: string;
  fileSha256: string;
  ino: string;
  mode: number;
  mtimeNs: string;
  nlink: number;
  path: string;
  realPath: string;
};

export type CaliforniaPhase4IndependentReferenceExecutableFile = {
  byteCount: number;
  ctimeNs: string;
  dev: string;
  fileSha256: string;
  ino: string;
  mode: number;
  mtimeNs: string;
  nlink: number;
  path: string;
  realPath: string;
};

export type CaliforniaPhase4IndependentReferenceDiagnosticOnDiskSnapshot = {
  nodeExecutable: CaliforniaPhase4IndependentReferenceExecutableFile;
  snapshotSha256: string;
  sourceFiles: readonly CaliforniaPhase4IndependentReferenceSourceFile[];
};

export type CaliforniaPhase4IndependentReferenceDiagnosticOnDiskCheckpoints = {
  afterOperationSnapshotSha256: string;
  beforeOperationSnapshotSha256: string;
  checkpointSha256: string;
  moduleLoadSnapshot: CaliforniaPhase4IndependentReferenceDiagnosticOnDiskSnapshot;
  scope: "diagnostic-on-disk-path-snapshots-not-loaded-code-or-process-image-proof";
  unchanged: true;
};

export type CaliforniaPhase4IndependentReferenceCandidate = {
  candidateSha256: string;
  formalExecutionAuthorized: false;
  humanReviewReceiptAvailable: false;
  independentExpectedRasterAvailable: false;
  producer: {
    browserScreenshotReadback: false;
    diagnosticOnDiskIdentity: CaliforniaPhase4IndependentReferenceDiagnosticOnDiskCheckpoints;
    importsTestedComponent: false;
    renderer: "independent-pure-node-software-renderer";
    samePageCanvasReadback: false;
  };
  rasters: readonly CaliforniaPhase4IndependentReferenceRaster[];
  sceneRegistrySha256: string;
  schemaVersion: typeof CALIFORNIA_PHASE4_INDEPENDENT_REFERENCE_RENDERER_SCHEMA_VERSION;
  status: "diagnostic-independent-reference-raster-candidate-v1";
  targetPlanSha256: string;
};

export type CaliforniaPhase4IndependentReferenceObservation = {
  backingHeight: number;
  backingWidth: number;
  classId: string;
  pixels: Uint8Array;
  targetSha256: string;
};

export type CaliforniaPhase4IndependentReferenceComparison = {
  comparisonSha256: string;
  currentPixelsSha256: string;
  diagnosticOnDiskCheckpointSha256: string;
  expectedPixelsSha256: string;
  firstMismatchPixelIndex: number | null;
  formalExecutionAuthorized: false;
  independentExpectedRasterAvailable: false;
  matches: boolean;
  mismatchPixelCount: number;
  targetSha256: string;
};
