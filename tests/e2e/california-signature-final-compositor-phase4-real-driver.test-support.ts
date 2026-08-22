import assert from "node:assert/strict";
import path from "node:path";
import {
  getSignatureLabAssignment
} from "../../data/signatureLabAssignments";
import {
  visualizationLabCatalog
} from "../../data/visualizationLabs";
import {
  buildCaliforniaCanvasGraphicsSourceContract
} from "./california-canvas-graphics-source-contract";
import {
  buildCaliforniaSignatureReviewedFinalCompositorDimensionRegistry,
  californiaSignatureFinalCompositorGroupKey,
  type CaliforniaSignatureFinalCompositorClassCounter,
  type CaliforniaSignatureFinalCompositorExecutionGroupSummary
} from "./california-signature-final-compositor-capacity-plan";
import {
  californiaSignatureAxisIdsForProject
} from "./california-signature-exhaustive-qa";
import {
  CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS
} from "./california-signature-exhaustive-artifact-lifecycle";
import {
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY
} from "./california-signature-final-compositor-measurement-lifecycle";
import {
  californiaSignatureFinalCompositorPhase3MeasurementCampaignTestFixture as phase3Fixture
} from "./california-signature-final-compositor-phase3-measurement-campaign.test-fixture";
import type {
  CaliforniaSignatureFinalCompositorPhase3BaselineOutcome,
  CaliforniaSignatureFinalCompositorPhase3BaselineSampleContext,
  CaliforniaSignatureFinalCompositorPhase3CalibrationOutcome,
  CaliforniaSignatureFinalCompositorPhase3CalibrationSampleContext,
  CaliforniaSignatureFinalCompositorPhase3MeasurementDriver,
  CaliforniaSignatureFinalCompositorPhase3PlanBinding
} from "./california-signature-final-compositor-phase3-measurement-campaign";
import {
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_BASELINE_STAGE_SEQUENCE,
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_MAX_RECEIPT_LIFETIME_MS,
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_PROJECT_CONTEXTS,
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_RECEIPT_DIRECTORY_PREFIX,
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_RECEIPT_FILE_NAME,
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_SCHEMA_VERSION,
  type CaliforniaSignatureFinalCompositorPhase4AcceptedBuildReceipt,
  type CaliforniaSignatureFinalCompositorPhase4AuthenticatedPlan,
  type CaliforniaSignatureFinalCompositorPhase4BaselineStageEvidence,
  type CaliforniaSignatureFinalCompositorPhase4BaselineStage,
  type CaliforniaSignatureFinalCompositorPhase4CalibrationTarget,
  type CaliforniaSignatureFinalCompositorPhase4LifecycleAuthority,
  type CaliforniaSignatureFinalCompositorPhase4LifecycleCheckpoint,
  type CaliforniaSignatureFinalCompositorPhase4PhysicalSession,
  type CaliforniaSignatureFinalCompositorPhase4PrivateReceiptRead,
  type CaliforniaSignatureFinalCompositorPhase4ProjectName,
  type CaliforniaSignatureFinalCompositorPhase4RealDriverLease
} from "./california-signature-final-compositor-phase4-real-driver-contract";
import {
  californiaSignatureFinalCompositorPhase4InternalSha256 as sha256,
  californiaSignatureFinalCompositorPhase4InternalStableJson as stableJson
} from "./california-signature-final-compositor-phase4-real-driver-internal";
import {
  CALIFORNIA_FORMAL_PROJECT_EVIDENCE_BY_NAME
} from "./california-visualization-qa-helpers";

const WORKTREE = "/Volumes/Starship/MAIS-ca-viz-labs-wt";
const TEMPORARY_ROOT = `${WORKTREE}/.tmp`;
const NOW_UNIX_MS = 1_800_000_000_000;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const hash = (character: string): string => character.repeat(64);
const SAMPLE_COUNT =
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY.warmupCount +
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY.measuredSampleCount;

type Fault =
  | "build-drift"
  | "copied-sibling-receipt"
  | "drift-during-baseline"
  | "drift-after-build-discovery"
  | "dimension-registry-drift"
  | "expire-during-calibration"
  | "expire-after-chrome-discovery"
  | "execution-plan-drift"
  | "execution-subset-drift"
  | "false-zero-comparator"
  | "hold-first-baseline-stage"
  | "missing-build"
  | "missing-chrome"
  | "missing-server"
  | "missing-sharp"
  | "modified-receipt"
  | "monotonic-regression"
  | "moved-sibling-receipt"
  | "nested-clone-receipt"
  | "new-page-rejection"
  | "non-starship-receipt"
  | "pixel-mismatch"
  | "post-launch-context-drift"
  | "public-receipt"
  | "raw-receipt"
  | "receipt-file-drift"
  | "renamed-sibling-receipt"
  | "resized-self-compare"
  | "self-signed-source-drift"
  | "source-drift"
  | "source-receipt-drift"
  | "source-snapshot-drift"
  | "stale-receipt"
  | "unrelated-page-screenshot"
  | "unrelated-page-exact-target"
  | "target-plan-drift"
  | "wrong-mobile-physical-context"
  | "wrong-stage";

type TestHarnessOptions = {
  acceptedReceipt: "valid" | null;
  fault?: Fault;
};

type Observations = {
  baselineCommitCount: number;
  baselineClassCropCounts: number[][];
  baselineContextFrozen: boolean[];
  baselineGroupKeys: string[];
  baselineStages: CaliforniaSignatureFinalCompositorPhase4BaselineStage[];
  browserCloseCount: number;
  browserContextCount: number;
  browserLaunchCount: number;
  calibrationDimensions: Array<{
    backingSize: { height: number; width: number };
    clipSize: { height: number; width: number };
    cssSize: { height: number; width: number };
  }>;
  calibrationContextFrozen: boolean[];
  calibrationCommitCount: number;
  checkpointCount: number;
  sharpCompareCount: number;
  sharpDecodeCount: number;
  screenshotCount: number;
};

type ExactAuthoritySource = {
  authenticatedPlan: CaliforniaSignatureFinalCompositorPhase4AuthenticatedPlan;
  executionPlan: CaliforniaSignatureFinalCompositorPhase3PlanBinding;
  sourceReceiptSha256: string;
  sourceSnapshotSha256: string;
};

function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function deepFreeze<T>(value: T): T {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) return value;
  for (const key of Reflect.ownKeys(value as object)) {
    deepFreeze((value as Record<PropertyKey, unknown>)[key]);
  }
  return Object.freeze(value);
}

function assertPlainRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value),
    `${label} must be one plain object`);
  const prototype = Object.getPrototypeOf(value);
  assert.ok(prototype === Object.prototype || prototype === null,
    `${label} must not use a custom prototype`);
}

function assertExactKeys(value: unknown, keys: readonly string[], label: string):
asserts value is Record<string, unknown> {
  assertPlainRecord(value, label);
  assert.deepEqual(Object.keys(value).sort(compareCodeUnits), [...keys].sort(compareCodeUnits),
    `${label} keys drifted`);
}

function assertSha256(value: unknown, label: string): asserts value is string {
  assert.ok(typeof value === "string", `${label} must be a SHA-256 string`);
  assert.match(value, SHA256_PATTERN, `${label} must be one lowercase SHA-256`);
}

function formalDimensionProjects() {
  return CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS.map((projectName) => {
    const evidence = CALIFORNIA_FORMAL_PROJECT_EVIDENCE_BY_NAME[projectName];
    return {
      axisIds: californiaSignatureAxisIdsForProject(projectName),
      deviceScaleFactor: evidence.deviceScaleFactor,
      projectName,
      viewport: { ...evidence.viewport }
    };
  });
}

function visitForBench(benchId: string) {
  for (const lab of visualizationLabCatalog) {
    if (lab.curriculumTrack !== "US" || lab.publisher !== "US_CA_MATH") continue;
    const assignment = getSignatureLabAssignment(lab.topicId);
    if (assignment && (assignment.primary === benchId || assignment.related?.includes(benchId as never))) {
      return lab;
    }
  }
  assert.fail(`${benchId}: California Phase4 authenticated target has no California lab route`);
}

let exactAuthoritySourcePromise: Promise<ExactAuthoritySource> | undefined;
function exactAuthoritySource(): Promise<ExactAuthoritySource> {
  exactAuthoritySourcePromise ??= (async () => {
    const sourceReceipt = await phase3Fixture.produceCurrentSourceReceipt();
    const executionPlan = phase3Fixture.bindSourcePlan(sourceReceipt);
    const allGroups = sourceReceipt.sourcePlan.executionGroups;
    const canvasContract = buildCaliforniaCanvasGraphicsSourceContract(WORKTREE);
    const registry = buildCaliforniaSignatureReviewedFinalCompositorDimensionRegistry({
      canvasContract,
      projectDimensionPolicies: formalDimensionProjects(),
      projectRoot: WORKTREE
    });
    assert.equal(registry.dimensionRegistrySha256, executionPlan.dimensionRegistrySha256,
      "California Phase4 authenticated target registry differs from Phase3 execution plan");

    const desktopGroup = allGroups.find((group) =>
      group.projectName === "desktop-chrome" && group.benchId === "CountingLab" &&
      group.axisId === "desktop-en-light" && group.phase === "layout" &&
      group.classCropCounts.length > 0) ??
      allGroups.find((group) =>
        group.projectName === "desktop-chrome" && group.classCropCounts.length > 0)!;
    const mobileGroup = allGroups.find((group) =>
      group.projectName === "mobile-chrome" && group.benchId === desktopGroup.benchId &&
      group.axisId === "mobile-en-light" && group.phase === desktopGroup.phase &&
      group.classCropCounts.length > 0) ??
      allGroups.find((group) =>
        group.projectName === "mobile-chrome" && group.classCropCounts.length > 0)!;
    assert.ok(desktopGroup && mobileGroup,
      "California Phase4 lifecycle subset requires exact desktop and mobile Phase3 groups");

    const subsetMap = new Map<string, CaliforniaSignatureFinalCompositorExecutionGroupSummary>();
    for (const group of [desktopGroup, mobileGroup]) subsetMap.set(group.groupKey, group);
    const calibrationTargets = executionPlan.classPlans.map((classPlan) => {
      const policy = registry.bindingPolicies.find((row) => row.classId === classPlan.classId);
      assert.ok(policy, `${classPlan.classId}: California Phase4 target lacks a reviewed binding`);
      const binding = canvasContract.bindings.find((row) => row.key === policy.bindingKey);
      assert.ok(binding, `${policy.bindingKey}: California Phase4 target binding is absent from source`);
      const targetGroup = allGroups.find((group) =>
        group.projectName === classPlan.projectName && group.benchId === binding.benchId &&
        group.classCropCounts.some((row) => row.classId === classPlan.classId));
      assert.ok(targetGroup,
        `${classPlan.classId}: California Phase4 target has no exact Phase3 execution group`);
      subsetMap.set(targetGroup.groupKey, targetGroup);
      const lab = visitForBench(String(binding.benchId));
      const targetWithoutSha = {
        axisId: targetGroup.axisId,
        backingSize: structuredClone(classPlan.maximumDimensions.backingSize),
        benchId: String(binding.benchId),
        bindingKey: binding.key,
        canvasIndex: binding.contextOrdinal,
        classId: classPlan.classId,
        clipSize: structuredClone(classPlan.maximumDimensions.clipSize),
        cssSize: structuredClone(classPlan.maximumDimensions.cssSize),
        groupKey: targetGroup.groupKey,
        labId: lab.labId,
        projectName: classPlan.projectName as CaliforniaSignatureFinalCompositorPhase4ProjectName,
        reviewedClassSha256: classPlan.reviewedClassSha256,
        reviewedPoliciesSha256: classPlan.reviewedPoliciesSha256
      };
      return deepFreeze({
        ...targetWithoutSha,
        targetSha256: sha256(stableJson(targetWithoutSha))
      } satisfies CaliforniaSignatureFinalCompositorPhase4CalibrationTarget);
    });
    assert.equal(calibrationTargets.length, executionPlan.classPlans.length,
      "California Phase4 lifecycle subset lost an authenticated dimension class target");
    const executionGroups = [...subsetMap.values()].map((row) => deepFreeze(structuredClone(row)));
    const executionGroupSubsetSha256 = sha256(stableJson(executionGroups));
    const calibrationTargetPlanSha256 = sha256(stableJson(calibrationTargets));
    const authenticatedPlan = deepFreeze({
      calibrationTargets,
      calibrationTargetPlanSha256,
      executionGroups,
      executionGroupSubsetSha256,
      executionPlan
    } satisfies CaliforniaSignatureFinalCompositorPhase4AuthenticatedPlan);
    return deepFreeze({
      authenticatedPlan,
      executionPlan,
      sourceReceiptSha256: sourceReceipt.sourceReceiptSha256,
      sourceSnapshotSha256: executionPlan.sourceSnapshotSha256
    });
  })();
  return exactAuthoritySourcePromise;
}

function receiptForFault(source: ExactAuthoritySource, fault: Fault | undefined):
CaliforniaSignatureFinalCompositorPhase4AcceptedBuildReceipt {
  const base = {
    acceptedBuildId: "phase4-build-fixture",
    acceptedBuildIdFileSha256: hash("1"),
    acceptedBuildManifestSha256: hash("2"),
    browserExecutableSha256: hash("3"),
    browserIdentitySha256: hash("4"),
    calibrationTargetPlanSha256: source.authenticatedPlan.calibrationTargetPlanSha256,
    dependencySha256: hash("5"),
    dimensionRegistrySha256: source.executionPlan.dimensionRegistrySha256,
    environmentDiscoveryFileSha256: hash("6"),
    environmentSha256: hash("9"),
    executionGroupSubsetSha256: source.authenticatedPlan.executionGroupSubsetSha256,
    executionPlanSha256: source.executionPlan.executionPlanSha256,
    expiresAtUnixMs: NOW_UNIX_MS + 60_000,
    formalExecutionAuthorized: false as const,
    issuedAtUnixMs: NOW_UNIX_MS - 60_000,
    lifecycleAuthoritySha256: hash("a"),
    machineSha256: hash("b"),
    schemaVersion: CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_SCHEMA_VERSION as 2,
    server: {
      acceptedBuildId: "phase4-build-fixture",
      baseUrl: "http://127.0.0.1:4173/",
      processId: 47_173,
      processIdentitySha256: hash("c"),
      readinessReceiptSha256: hash("d")
    },
    sharpLibvipsSha256: hash("e"),
    sourceBuildSha256: hash("f"),
    sourceManifestSha256: hash("7"),
    sourceReceiptSha256: source.sourceReceiptSha256,
    sourceSnapshotSha256: source.sourceSnapshotSha256,
    status: "accepted-production-build-server-v2" as const,
    storageState: {
      filePath: `${TEMPORARY_ROOT}/phase4-storage-state.json`,
      fileSha256: hash("8")
    },
    worktreeRoot: WORKTREE as "/Volumes/Starship/MAIS-ca-viz-labs-wt"
  };
  if (fault === "stale-receipt") {
    base.issuedAtUnixMs = NOW_UNIX_MS - 240_000;
    base.expiresAtUnixMs = NOW_UNIX_MS - 120_000;
  }
  if (fault === "self-signed-source-drift") base.sourceManifestSha256 = hash("0");
  if (fault === "dimension-registry-drift") base.dimensionRegistrySha256 = hash("0");
  if (fault === "execution-plan-drift") base.executionPlanSha256 = hash("0");
  if (fault === "execution-subset-drift") base.executionGroupSubsetSha256 = hash("0");
  if (fault === "source-receipt-drift") base.sourceReceiptSha256 = hash("0");
  if (fault === "source-snapshot-drift") base.sourceSnapshotSha256 = hash("0");
  if (fault === "target-plan-drift") base.calibrationTargetPlanSha256 = hash("0");
  return deepFreeze({
    ...base,
    acceptedBuildReceiptSha256: sha256(stableJson(base))
  });
}

function privateReadFor(receipt: CaliforniaSignatureFinalCompositorPhase4AcceptedBuildReceipt,
fault: Fault | undefined): CaliforniaSignatureFinalCompositorPhase4PrivateReceiptRead {
  let bytes = fault === "raw-receipt"
    ? Buffer.from(JSON.stringify(receipt), "utf8")
    : Buffer.from(`${stableJson(receipt)}\n`, "utf8");
  if (fault === "modified-receipt") {
    bytes = Buffer.from(`${stableJson({ ...receipt, machineSha256: hash("0") })}\n`, "utf8");
  }
  const acceptedDirectory = `${TEMPORARY_ROOT}/` +
    `${CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_RECEIPT_DIRECTORY_PREFIX}fixture`;
  const directoryPath = fault === "non-starship-receipt"
    ? "/tmp/california-phase4-accepted-build-fixture"
    : fault === "nested-clone-receipt"
      ? `${acceptedDirectory}/clone`
      : fault === "moved-sibling-receipt"
        ? `${TEMPORARY_ROOT}/${CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_RECEIPT_DIRECTORY_PREFIX}moved`
        : fault === "renamed-sibling-receipt"
          ? `${TEMPORARY_ROOT}/${CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_RECEIPT_DIRECTORY_PREFIX}renamed`
          : fault === "copied-sibling-receipt"
            ? `${TEMPORARY_ROOT}/${CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_RECEIPT_DIRECTORY_PREFIX}copy`
            : acceptedDirectory;
  const filePath = path.join(directoryPath,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_RECEIPT_FILE_NAME);
  return {
    bytes,
    directoryMode: fault === "public-receipt" ? 0o755 : 0o700,
    directoryPath,
    directoryRealPath: directoryPath,
    fileMode: fault === "public-receipt" ? 0o644 : 0o400,
    filePath,
    fileRealPath: filePath,
    fileSha256: fault === "receipt-file-drift" ? hash("0") : sha256(bytes),
    linkCount: 1
  };
}

const authorityBrands = new WeakMap<
CaliforniaSignatureFinalCompositorPhase4LifecycleAuthority,
{
  checkpoint: CaliforniaSignatureFinalCompositorPhase4LifecycleCheckpoint;
  fingerprint: string;
  receiptSha256: string;
}
>();

function checkpointFor(receipt: CaliforniaSignatureFinalCompositorPhase4AcceptedBuildReceipt):
CaliforniaSignatureFinalCompositorPhase4LifecycleCheckpoint {
  return {
    acceptedBuildId: receipt.acceptedBuildId,
    acceptedBuildIdFileSha256: receipt.acceptedBuildIdFileSha256,
    acceptedBuildManifestSha256: receipt.acceptedBuildManifestSha256,
    acceptedBuildReceiptSha256: receipt.acceptedBuildReceiptSha256,
    browserExecutableSha256: receipt.browserExecutableSha256,
    browserIdentitySha256: receipt.browserIdentitySha256,
    dependencySha256: receipt.dependencySha256,
    environmentDiscoveryFileSha256: receipt.environmentDiscoveryFileSha256,
    environmentSha256: receipt.environmentSha256,
    expiresAtUnixMs: receipt.expiresAtUnixMs,
    lifecycleAuthoritySha256: receipt.lifecycleAuthoritySha256,
    machineSha256: receipt.machineSha256,
    serverBaseUrl: receipt.server.baseUrl,
    serverProcessIdentitySha256: receipt.server.processIdentitySha256,
    serverReadinessReceiptSha256: receipt.server.readinessReceiptSha256,
    sharpLibvipsSha256: receipt.sharpLibvipsSha256,
    sourceBuildSha256: receipt.sourceBuildSha256,
    sourceManifestSha256: receipt.sourceManifestSha256,
    sourceSnapshotSha256: receipt.sourceSnapshotSha256
  };
}

function expectedClass(plan: CaliforniaSignatureFinalCompositorPhase3PlanBinding, classId: string):
CaliforniaSignatureFinalCompositorClassCounter | undefined {
  const row = plan.classPlans.find((candidate) => candidate.classId === classId);
  if (!row) return undefined;
  const { classPlanSha256: _classPlanSha256, ...dimensionClass } = row;
  return dimensionClass;
}

function validateReceiptRead(read: CaliforniaSignatureFinalCompositorPhase4PrivateReceiptRead):
CaliforniaSignatureFinalCompositorPhase4AcceptedBuildReceipt {
  assertExactKeys(read, [
    "bytes", "directoryMode", "directoryPath", "directoryRealPath", "fileMode", "filePath",
    "fileRealPath", "fileSha256", "linkCount"
  ], "California Phase4 private accepted-build receipt read");
  assert.equal(path.dirname(read.directoryPath), TEMPORARY_ROOT,
    "California Phase4 accepted-build receipt is not a strict Starship worktree .tmp child");
  assert.ok(path.basename(read.directoryPath).startsWith(
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_RECEIPT_DIRECTORY_PREFIX),
  "California Phase4 accepted-build receipt directory lacks its lifecycle prefix");
  assert.equal(read.directoryRealPath, read.directoryPath,
    "California Phase4 accepted-build receipt directory traverses a symlink");
  assert.equal(read.filePath, path.join(read.directoryPath,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_RECEIPT_FILE_NAME),
  "California Phase4 accepted-build receipt file path drifted");
  assert.equal(read.fileRealPath, read.filePath,
    "California Phase4 accepted-build receipt file traverses a symlink");
  assert.equal(read.directoryMode, 0o700,
    "California Phase4 accepted-build receipt requires private mode 0700 and file mode 0400");
  assert.equal(read.fileMode, 0o400,
    "California Phase4 accepted-build receipt requires private mode 0700 and file mode 0400");
  assert.equal(read.linkCount, 1, "California Phase4 accepted-build receipt must have one link");
  assert.equal(read.fileSha256, sha256(read.bytes),
    "California Phase4 accepted-build receipt durable bytes drifted");
  let parsed: unknown;
  try { parsed = JSON.parse(read.bytes.toString("utf8")); }
  catch { assert.fail("California Phase4 private accepted production build receipt is not valid JSON"); }
  assertExactKeys(parsed, [
    "acceptedBuildId", "acceptedBuildIdFileSha256", "acceptedBuildManifestSha256",
    "acceptedBuildReceiptSha256", "browserExecutableSha256", "browserIdentitySha256",
    "calibrationTargetPlanSha256", "dependencySha256", "dimensionRegistrySha256",
    "environmentDiscoveryFileSha256", "environmentSha256", "executionGroupSubsetSha256",
    "executionPlanSha256", "expiresAtUnixMs", "formalExecutionAuthorized", "issuedAtUnixMs",
    "lifecycleAuthoritySha256", "machineSha256", "schemaVersion", "server",
    "sharpLibvipsSha256", "sourceBuildSha256", "sourceManifestSha256", "sourceReceiptSha256",
    "sourceSnapshotSha256", "status", "storageState", "worktreeRoot"
  ], "California Phase4 accepted production build receipt");
  assert.equal(parsed.schemaVersion, CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_SCHEMA_VERSION,
    "California Phase4 accepted production build receipt schema drifted");
  assert.equal(parsed.status, "accepted-production-build-server-v2",
    "California Phase4 accepted production build receipt status drifted");
  assert.equal(parsed.formalExecutionAuthorized, false,
    "California Phase4 accepted production build receipt must not authorize formal execution");
  assert.equal(parsed.worktreeRoot, WORKTREE,
    "California Phase4 accepted production build receipt names another worktree");
  for (const key of [
    "acceptedBuildIdFileSha256", "acceptedBuildManifestSha256", "browserExecutableSha256",
    "browserIdentitySha256", "calibrationTargetPlanSha256", "dependencySha256",
    "dimensionRegistrySha256", "environmentDiscoveryFileSha256", "environmentSha256",
    "executionGroupSubsetSha256", "executionPlanSha256", "lifecycleAuthoritySha256",
    "machineSha256", "sharpLibvipsSha256", "sourceBuildSha256", "sourceManifestSha256",
    "sourceReceiptSha256", "sourceSnapshotSha256"
  ]) assertSha256(parsed[key], `California Phase4 receipt ${key}`);
  assertExactKeys(parsed.server, [
    "acceptedBuildId", "baseUrl", "processId", "processIdentitySha256", "readinessReceiptSha256"
  ], "California Phase4 accepted production server");
  assert.equal(parsed.server.acceptedBuildId, parsed.acceptedBuildId,
    "California Phase4 accepted production server names another build");
  assertSha256(parsed.server.processIdentitySha256,
    "California Phase4 accepted server process identity");
  assertSha256(parsed.server.readinessReceiptSha256,
    "California Phase4 accepted server readiness identity");
  assertExactKeys(parsed.storageState, ["filePath", "fileSha256"],
    "California Phase4 accepted storage state");
  assert.ok(typeof parsed.storageState.filePath === "string" &&
    parsed.storageState.filePath.startsWith(`${TEMPORARY_ROOT}/`),
  "California Phase4 accepted storage state escaped Starship .tmp");
  assertSha256(parsed.storageState.fileSha256, "California Phase4 accepted storage state");
  const { acceptedBuildReceiptSha256, ...base } = parsed;
  assert.equal(acceptedBuildReceiptSha256, sha256(stableJson(base)),
    "California Phase4 accepted production build receipt is not exactly derived");
  assert.deepEqual(read.bytes, Buffer.from(`${stableJson(parsed)}\n`, "utf8"),
    "California Phase4 accepted production build receipt is not canonical JSON bytes");
  return deepFreeze(parsed as CaliforniaSignatureFinalCompositorPhase4AcceptedBuildReceipt);
}

function validateSampleKind(kind: string, ordinal: number, label: string): void {
  assert.ok(Number.isSafeInteger(ordinal) && ordinal >= 0 && ordinal < SAMPLE_COUNT,
    `${label}: sample ordinal is outside the reviewed policy`);
  const expectedKind = ordinal <
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY.warmupCount
    ? "warmup" : "measured";
  assert.equal(kind, expectedKind, `${label}: sample kind differs from its reviewed ordinal`);
}

async function exerciseBrandedAuthority(
  authority: CaliforniaSignatureFinalCompositorPhase4LifecycleAuthority,
  observations: Observations
): Promise<CaliforniaSignatureFinalCompositorPhase4RealDriverLease> {
  const brand = authorityBrands.get(authority);
  assert.ok(brand, "California Phase4 requires uncloneable A22 lifecycle provenance authority");
  assert.equal(brand.fingerprint, sha256(stableJson({
    authenticatedPlan: authority.authenticatedPlan,
    sourceReceiptSha256: authority.sourceReceiptSha256
  })), "California Phase4 A22 lifecycle authority changed after branding");

  const receipt = validateReceiptRead(await authority.readAcceptedBuildReceipt());
  assert.equal(receipt.acceptedBuildReceiptSha256, brand.receiptSha256,
    "California Phase4 lifecycle authority receipt identity drifted");
  assert.ok(authority.nowUnixMs() >= receipt.issuedAtUnixMs &&
    authority.nowUnixMs() <= receipt.expiresAtUnixMs,
  "California Phase4 requires one fresh accepted production build receipt");
  assert.ok(receipt.expiresAtUnixMs - receipt.issuedAtUnixMs <=
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_MAX_RECEIPT_LIFETIME_MS,
  "California Phase4 accepted production build receipt lifetime exceeds its bound");

  const authenticatedPlan = deepFreeze(structuredClone(authority.authenticatedPlan));
  assert.equal(receipt.executionPlanSha256, authenticatedPlan.executionPlan.executionPlanSha256,
    "California Phase4 receipt differs from its authenticated Phase3 execution plan");
  assert.equal(receipt.dimensionRegistrySha256,
    authenticatedPlan.executionPlan.dimensionRegistrySha256,
  "California Phase4 receipt differs from its authenticated dimension registry");
  assert.equal(receipt.sourceReceiptSha256, authority.sourceReceiptSha256,
    "California Phase4 receipt differs from its authenticated Phase3 source receipt");
  assert.equal(authenticatedPlan.executionPlan.sourceReceiptSha256,
    authority.sourceReceiptSha256,
  "California Phase4 execution plan differs from its authenticated Phase3 source receipt");
  assert.equal(receipt.sourceSnapshotSha256,
    authenticatedPlan.executionPlan.sourceSnapshotSha256,
  "California Phase4 receipt differs from its authenticated Phase3 source snapshot");
  assert.equal(receipt.executionGroupSubsetSha256,
    authenticatedPlan.executionGroupSubsetSha256,
  "California Phase4 receipt differs from its authenticated execution-group subset");
  assert.equal(receipt.calibrationTargetPlanSha256,
    authenticatedPlan.calibrationTargetPlanSha256,
  "California Phase4 receipt differs from its authenticated target-crop plan");
  assert.equal(authenticatedPlan.executionGroupSubsetSha256,
    sha256(stableJson(authenticatedPlan.executionGroups)),
  "California Phase4 authenticated execution-group subset identity drifted");
  assert.equal(authenticatedPlan.calibrationTargetPlanSha256,
    sha256(stableJson(authenticatedPlan.calibrationTargets)),
  "California Phase4 authenticated target-crop plan identity drifted");

  const groupByKey = new Map(authenticatedPlan.executionGroups.map((group) =>
    [group.groupKey, group] as const));
  for (const group of authenticatedPlan.executionGroups) {
    assert.equal(group.groupKey, californiaSignatureFinalCompositorGroupKey(group),
      `${group.groupKey}: California Phase4 authenticated group key drifted`);
  }
  const classById = new Map<string, CaliforniaSignatureFinalCompositorClassCounter>();
  for (const target of authenticatedPlan.calibrationTargets) {
    const dimensionClass = expectedClass(authenticatedPlan.executionPlan, target.classId);
    assert.ok(dimensionClass,
      `${target.classId}: California Phase4 target lacks authenticated dimension class membership`);
    classById.set(target.classId, deepFreeze(structuredClone(dimensionClass)));
    const { targetSha256, ...withoutSha } = target;
    assert.equal(targetSha256, sha256(stableJson(withoutSha)),
      `${target.classId}: California Phase4 exact target Canvas/crop identity drifted`);
    assert.equal(target.projectName, dimensionClass.projectName,
      `${target.classId}: California Phase4 target crossed physical projects`);
    assert.deepEqual({
      backingSize: target.backingSize,
      clipSize: target.clipSize,
      cssSize: target.cssSize
    }, dimensionClass.maximumDimensions,
    `${target.classId}: California Phase4 target differs from maximum envelope`);
    assert.ok(groupByKey.has(target.groupKey),
      `${target.classId}: California Phase4 target group is outside authenticated subset`);
    const targetGroup = groupByKey.get(target.groupKey)!;
    assert.equal(targetGroup.projectName, target.projectName,
      `${target.classId}: California Phase4 target group crossed physical projects`);
    assert.equal(targetGroup.axisId, target.axisId,
      `${target.classId}: California Phase4 target group axis drifted`);
    assert.equal(targetGroup.benchId, target.benchId,
      `${target.classId}: California Phase4 target group bench drifted`);
    assert.ok(targetGroup.classCropCounts.some((row) =>
      row.classId === target.classId && row.cropCount > 0),
    `${target.classId}: California Phase4 target group lacks exact class crop membership`);
  }

  const expectedCheckpoint = brand.checkpoint;
  const checkpoint = async (label: string) => {
    const observed = await authority.checkpoint(label);
    assert.deepEqual(observed, expectedCheckpoint,
      `${label}: California Phase4 lifecycle checkpoint identity drifted`);
    assert.ok(authority.nowUnixMs() <= observed.expiresAtUnixMs,
      `${label}: California Phase4 accepted production receipt expired`);
  };
  await checkpoint("prepare-production-build-before");
  const productionBuild = await authority.readProductionBuild();
  await checkpoint("prepare-production-build-after");
  assert.ok(productionBuild, "California Phase4 real driver cannot run without a production BUILD_ID");
  assert.deepEqual(productionBuild, {
    acceptedBuildId: receipt.acceptedBuildId,
    acceptedBuildIdFileSha256: receipt.acceptedBuildIdFileSha256,
    acceptedBuildManifestSha256: receipt.acceptedBuildManifestSha256,
    sourceBuildSha256: receipt.sourceBuildSha256
  }, "California Phase4 accepted production BUILD_ID or build manifest drifted");
  await checkpoint("prepare-physical-chrome-before");
  const browser = await authority.inspectPhysicalChrome();
  await checkpoint("prepare-physical-chrome-after");
  assert.ok(browser, "California Phase4 real driver requires one physical Chrome executable");
  assert.equal(browser.browserExecutableSha256, receipt.browserExecutableSha256,
    "California Phase4 physical Chrome executable differs from its receipt");
  assert.equal(browser.browserIdentitySha256, receipt.browserIdentitySha256,
    "California Phase4 physical Chrome identity differs from its receipt");
  await checkpoint("prepare-sharp-before");
  const sharp = await authority.inspectSharp();
  await checkpoint("prepare-sharp-after");
  assert.ok(sharp, "California Phase4 real driver requires physical Sharp and libvips");
  assert.equal(sharp.dependencySha256, receipt.dependencySha256,
    "California Phase4 dependency identity differs from its receipt");
  assert.equal(sharp.sharpLibvipsSha256, receipt.sharpLibvipsSha256,
    "California Phase4 Sharp and libvips identity differs from its receipt");
  await checkpoint("prepare-launch-before");

  let session: CaliforniaSignatureFinalCompositorPhase4PhysicalSession | undefined;
  try {
    session = await authority.launchPhysicalChrome({
      acceptedReceipt: receipt,
      authenticatedPlan,
      browser,
      server: receipt.server,
      sharp
    });
    assertExactKeys(session.browserContextIdentitySha256ByProject,
      ["desktop-chrome", "mobile-chrome"],
      "California Phase4 physical browser contexts");
    for (const projectName of ["desktop-chrome", "mobile-chrome"] as const) {
      assertSha256(session.browserContextIdentitySha256ByProject[projectName],
        `${projectName}: California Phase4 physical browser context identity`);
    }
    assert.notEqual(session.browserContextIdentitySha256ByProject["desktop-chrome"],
      session.browserContextIdentitySha256ByProject["mobile-chrome"],
    "California Phase4 physical browser context identity drifted across projects");
    await checkpoint("prepare-launch-after");
  } catch (error) {
    if (session) await session.close();
    throw error;
  }

  const processIdentity = authority.processIdentity();
  const processIdentitySha256 = sha256(stableJson(processIdentity));
  let acceptingTransactions = true;
  let closed = false;
  const baselineSamples = new Set<string>();
  const expectedBaselineSamples = authenticatedPlan.executionGroups.flatMap((group) =>
    Array.from({ length: SAMPLE_COUNT }, (_, ordinal) =>
      `${group.groupKey}\0${ordinal < 2 ? "warmup" : "measured"}\0${ordinal}`));
  const expectedBaselineSampleCount = authenticatedPlan.executionGroups.length * SAMPLE_COUNT;
  const expectedCalibrationSamples = authenticatedPlan.calibrationTargets.flatMap((target) =>
    Array.from({ length: SAMPLE_COUNT }, (_, ordinal) =>
      `${target.classId}\0${ordinal < 2 ? "warmup" : "measured"}\0${ordinal}`));
  let baselineCursor = 0;
  let calibrationCursor = 0;
  let transactionTail: Promise<void> = Promise.resolve();
  let physicalClosePromise: Promise<void> | undefined;
  const closePhysicalSession = async () => {
    acceptingTransactions = false;
    physicalClosePromise ??= session!.close().finally(() => { closed = true; });
    await physicalClosePromise;
  };
  const closeLease = async () => {
    acceptingTransactions = false;
    const queuedTransactions = transactionTail;
    await queuedTransactions;
    await closePhysicalSession();
  };
  const rejectSnapshot = async (error: unknown): Promise<never> => {
    acceptingTransactions = false;
    const registeredTransactions = transactionTail;
    await registeredTransactions;
    await closePhysicalSession();
    throw error;
  };
  const timed = async <T>(label: string, action: () => Promise<T>) => {
    const start = authority.nowMonotonicNs();
    const result = await action();
    const end = authority.nowMonotonicNs();
    assert.ok(end > start, `${label}: California Phase4 monotonic clock did not advance`);
    return result;
  };
  const guarded = async <T>(action: () => Promise<T>) => {
    try {
      assert.equal(acceptingTransactions && !closed, true,
        "California Phase4 real driver lease is closed");
      return await action();
    } catch (error) {
      await closePhysicalSession();
      throw error;
    }
  };
  const serializedTransaction = async <T>(action: () => Promise<T>): Promise<T> => {
    assert.equal(acceptingTransactions && !closed, true,
      "California Phase4 real driver lease is closed");
    const predecessor = transactionTail;
    let release!: () => void;
    transactionTail = new Promise<void>((resolve) => { release = resolve; });
    await predecessor;
    try { return await action(); }
    finally { release(); }
  };

  const driver: CaliforniaSignatureFinalCompositorPhase3MeasurementDriver = deepFreeze({
    async runBaselineSample(input: CaliforniaSignatureFinalCompositorPhase3BaselineSampleContext):
    Promise<CaliforniaSignatureFinalCompositorPhase3BaselineOutcome> {
      let context: CaliforniaSignatureFinalCompositorPhase3BaselineSampleContext;
      try { context = deepFreeze(structuredClone(input)); }
      catch (error) { return rejectSnapshot(error); }
      return serializedTransaction(() => guarded(async () => {
        assertExactKeys(context, ["group", "kind", "ordinal"],
          "California Phase4 baseline sample");
        validateSampleKind(context.kind, context.ordinal, "California Phase4 baseline");
        const authenticated = groupByKey.get(context.group.groupKey);
        assert.ok(authenticated && stableJson(authenticated) === stableJson(context.group),
          `${context.group.groupKey}: California Phase4 execution-group membership is not authenticated`);
        const projectName = context.group.projectName as CaliforniaSignatureFinalCompositorPhase4ProjectName;
        assert.ok(projectName === "desktop-chrome" || projectName === "mobile-chrome",
          `${context.group.groupKey}: California Phase4 project is not formal`);
        const sampleKey = `${context.group.groupKey}\0${context.kind}\0${context.ordinal}`;
        assert.equal(sampleKey, expectedBaselineSamples[baselineCursor],
          `${context.group.groupKey}: California Phase4 authenticated baseline order drifted`);
        assert.ok(!baselineSamples.has(sampleKey),
          `${context.group.groupKey}: California Phase4 duplicate authenticated baseline sample`);
        const stages = [];
        for (const stage of CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_BASELINE_STAGE_SEQUENCE) {
          await checkpoint(`baseline-${stage}-before`);
          const evidence: CaliforniaSignatureFinalCompositorPhase4BaselineStageEvidence =
            await timed<CaliforniaSignatureFinalCompositorPhase4BaselineStageEvidence>(
              `California Phase4 baseline ${stage}`,
              (): Promise<CaliforniaSignatureFinalCompositorPhase4BaselineStageEvidence> =>
                session!.runBaselineStage(context, stage)
            );
          await checkpoint(`baseline-${stage}-after`);
          assertExactKeys(evidence,
            ["browserContextIdentitySha256", "completed", "evidenceSha256", "projectName", "stage"],
            `California Phase4 ${stage} stage acknowledgement`);
          assert.equal(evidence.stage, stage,
            `California Phase4 stage acknowledgement drifted for ${stage}`);
          assert.equal(evidence.completed, true,
            `California Phase4 stage acknowledgement is incomplete for ${stage}`);
          assert.equal(evidence.projectName, projectName,
            `${context.group.groupKey}: California Phase4 physical context project drifted`);
          assert.equal(evidence.browserContextIdentitySha256,
            session!.browserContextIdentitySha256ByProject[projectName],
          `${context.group.groupKey}: California Phase4 physical context differs from ${projectName}`);
          assertSha256(evidence.evidenceSha256, `California Phase4 ${stage} physical evidence`);
          stages.push({
            acknowledgementSha256: sha256(stableJson({
              acceptedBuildReceiptSha256: receipt.acceptedBuildReceiptSha256,
              browserContextIdentitySha256: evidence.browserContextIdentitySha256,
              evidenceSha256: evidence.evidenceSha256,
              executionPlanSha256: receipt.executionPlanSha256,
              groupKey: context.group.groupKey,
              kind: context.kind,
              ordinal: context.ordinal,
              processIdentitySha256,
              stage
            })),
            completed: true as const,
            stage
          });
        }
        const outcome = {
          browserContextIdentitySha256:
            session!.browserContextIdentitySha256ByProject[projectName],
          finalCompositorExcluded: true as const,
          groupKey: context.group.groupKey,
          stages
        };
        baselineSamples.add(sampleKey);
        baselineCursor += 1;
        observations.baselineCommitCount += 1;
        return outcome;
      }));
    },
    async runCalibrationSample(input: CaliforniaSignatureFinalCompositorPhase3CalibrationSampleContext):
    Promise<CaliforniaSignatureFinalCompositorPhase3CalibrationOutcome> {
      let context: CaliforniaSignatureFinalCompositorPhase3CalibrationSampleContext;
      try { context = deepFreeze(structuredClone(input)); }
      catch (error) { return rejectSnapshot(error); }
      return serializedTransaction(() => guarded(async () => {
        assertExactKeys(context, ["dimensionClass", "kind", "ordinal"],
          "California Phase4 calibration sample");
        validateSampleKind(context.kind, context.ordinal, "California Phase4 calibration");
        const authenticated = classById.get(context.dimensionClass.classId);
        assert.ok(authenticated && stableJson(authenticated) === stableJson(context.dimensionClass),
          `${context.dimensionClass.classId}: California Phase4 authenticated dimension class ` +
          "is absent from the dimension registry");
        assert.equal(baselineSamples.size, expectedBaselineSampleCount,
          "California Phase4 calibration requires the complete authenticated baseline");
        const target = authenticatedPlan.calibrationTargets.find((row) =>
          row.classId === context.dimensionClass.classId);
        assert.ok(target,
          `${context.dimensionClass.classId}: California Phase4 exact target Canvas/crop is absent`);
        const calibrationSampleKey =
          `${context.dimensionClass.classId}\0${context.kind}\0${context.ordinal}`;
        assert.equal(calibrationSampleKey, expectedCalibrationSamples[calibrationCursor],
          `${context.dimensionClass.classId}: California Phase4 authenticated calibration order drifted`);
        await checkpoint("calibration-capture-before");
        const capture = await timed("California Phase4 maximum-envelope target screenshot", () =>
          session!.captureMaximumEnvelope(context, target));
        await checkpoint("calibration-capture-after");
        assert.ok(Buffer.isBuffer(capture.screenshot) && capture.screenshot.length > 0,
          "California Phase4 maximum-envelope screenshot is absent");
        assert.equal(stableJson(capture.observedTarget), stableJson(target),
          "California Phase4 screenshot did not capture the exact target Canvas/crop");
        assert.equal(capture.browserContextIdentitySha256,
          session!.browserContextIdentitySha256ByProject[target.projectName],
        `${target.classId}: California Phase4 calibration physical context drifted`);
        await checkpoint("calibration-expected-before");
        const expectedPixels = await timed(
          "California Phase4 independent expected compositor pixels",
          () => session!.captureIndependentExpectedPixels(context, target)
        );
        await checkpoint("calibration-expected-after");
        assert.deepEqual({ height: expectedPixels.height, width: expectedPixels.width },
          target.backingSize,
        `${target.classId}: California Phase4 independent expected pixels differ from backing size`);
        assert.ok(expectedPixels.pixels.length ===
          target.backingSize.width * target.backingSize.height * 4,
        `${target.classId}: California Phase4 independent expected pixels are incomplete`);
        await checkpoint("calibration-decode-before");
        const decoded = await timed("California Phase4 exact screenshot decode", () =>
          session!.decodeScreenshot(capture.screenshot, context, target));
        await checkpoint("calibration-decode-after");
        assert.deepEqual({ height: decoded.height, width: decoded.width }, target.backingSize,
          "California Phase4 decoded screenshot differs from exact backing envelope");
        assert.ok(decoded.pixels.length === decoded.width * decoded.height * 4,
          "California Phase4 decoded current compositor pixels are incomplete");
        await checkpoint("calibration-compare-before");
        const comparison = await timed("California Phase4 independent pixel comparison", () =>
          session!.compareIndependentPixels(expectedPixels, decoded, context, target));
        await checkpoint("calibration-compare-after");
        assertExactKeys(comparison, [
          "comparisonSha256", "currentPixelsSha256", "expectedPixelsSha256", "mismatchPixelCount"
        ], "California Phase4 independent expected/current pixel comparison");
        assert.equal(comparison.expectedPixelsSha256, sha256(expectedPixels.pixels),
          "California Phase4 independent expected pixel identity drifted");
        assert.equal(comparison.currentPixelsSha256, sha256(decoded.pixels),
          "California Phase4 current compositor pixel identity drifted");
        if (comparison.mismatchPixelCount === 0) {
          assert.equal(comparison.currentPixelsSha256, comparison.expectedPixelsSha256,
            "California Phase4 zero mismatch requires identical independent expected/current " +
            "pixel hashes");
        }
        assert.equal(comparison.mismatchPixelCount, 0,
          "California Phase4 pixel comparison found a mismatch");
        assert.equal(comparison.comparisonSha256, sha256(stableJson({
          currentPixelsSha256: comparison.currentPixelsSha256,
          expectedPixelsSha256: comparison.expectedPixelsSha256,
          mismatchPixelCount: comparison.mismatchPixelCount
        })), "California Phase4 independent comparison identity is not exactly derived");
        const outcome = {
          browserContextIdentitySha256: capture.browserContextIdentitySha256,
          comparisonSha256: comparison.comparisonSha256,
          decodeSha256: comparison.currentPixelsSha256,
          finalCompositorIncluded: true as const,
          maximumDimensions: structuredClone(context.dimensionClass.maximumDimensions),
          mismatchPixelCount: 0 as const,
          screenshotByteCount: capture.screenshot.length,
          screenshotSha256: sha256(capture.screenshot),
          stage: "final-compositor" as const
        };
        calibrationCursor += 1;
        observations.calibrationCommitCount += 1;
        return outcome;
      }));
    }
  });

  return Object.freeze({
    acceptedBuildReceiptSha256: receipt.acceptedBuildReceiptSha256,
    close: closeLease,
    driver,
    formalExecutionAuthorized: false as const,
    processIdentitySha256,
    producerIdentity: deepFreeze({
      acceptedBuildId: receipt.acceptedBuildId,
      acceptedBuildReceiptSha256: receipt.acceptedBuildReceiptSha256,
      browserExecutableSha256: receipt.browserExecutableSha256,
      browserIdentitySha256: receipt.browserIdentitySha256,
      dependencySha256: receipt.dependencySha256,
      environmentDiscoveryFileSha256: receipt.environmentDiscoveryFileSha256,
      environmentSha256: receipt.environmentSha256,
      machineSha256: receipt.machineSha256,
      sharpLibvipsSha256: receipt.sharpLibvipsSha256,
      sourceBuildSha256: receipt.sourceBuildSha256,
      sourceSnapshotSha256: receipt.sourceSnapshotSha256
    })
  });
}

export function createCaliforniaSignatureFinalCompositorPhase4RealDriverTestHarness(
  options: TestHarnessOptions
) {
  assert.deepEqual(Object.keys(options).sort(), [
    "acceptedReceipt", ...(options.fault === undefined ? [] : ["fault"])
  ].sort(), "California Phase4 test harness options drifted");
  const calls: string[] = [];
  const observations: Observations = {
    baselineClassCropCounts: [], baselineCommitCount: 0, baselineContextFrozen: [], baselineGroupKeys: [],
    baselineStages: [], browserCloseCount: 0, browserContextCount: 0,
    browserLaunchCount: 0, calibrationCommitCount: 0, calibrationContextFrozen: [], calibrationDimensions: [],
    checkpointCount: 0, sharpCompareCount: 0, sharpDecodeCount: 0, screenshotCount: 0
  };
  let currentNowUnixMs = NOW_UNIX_MS;
  let monotonicNs = BigInt(10_000);
  let discoveryDrifted = false;
  let releaseHeldBaselineStage!: () => void;
  let reportHeldBaselineStageStarted!: () => void;
  const heldBaselineStage = new Promise<void>((resolve) => {
    releaseHeldBaselineStage = resolve;
  });
  const heldBaselineStageStarted = new Promise<void>((resolve) => {
    reportHeldBaselineStageStarted = resolve;
  });

  const makeAuthority = async (): Promise<CaliforniaSignatureFinalCompositorPhase4LifecycleAuthority> => {
    const source = await exactAuthoritySource();
    const receipt = receiptForFault(source, options.fault);
    const contexts = {
      "desktop-chrome": hash("1"),
      "mobile-chrome": hash("2")
    } as const;
    const session: CaliforniaSignatureFinalCompositorPhase4PhysicalSession = {
      browserContextIdentitySha256ByProject: options.fault === "post-launch-context-drift"
        ? { "desktop-chrome": hash("1"), "mobile-chrome": hash("1") }
        : contexts,
      async captureIndependentExpectedPixels(context, target) {
        observations.calibrationContextFrozen.push(
          Object.isFrozen(context) && Object.isFrozen(context.dimensionClass) &&
          Object.isFrozen(context.dimensionClass.maximumDimensions)
        );
        return {
          height: target.backingSize.height,
          pixels: new Uint8Array(target.backingSize.width * target.backingSize.height * 4),
          width: target.backingSize.width
        };
      },
      async captureMaximumEnvelope(context, target) {
        observations.screenshotCount += 1;
        observations.calibrationContextFrozen.push(
          Object.isFrozen(context) && Object.isFrozen(context.dimensionClass) &&
          Object.isFrozen(context.dimensionClass.maximumDimensions)
        );
        observations.calibrationDimensions.push(structuredClone(
          context.dimensionClass.maximumDimensions));
        const observedTarget = options.fault === "unrelated-page-screenshot"
          ? { ...target, bindingKey: "UnrelatedLab/canvas", targetSha256: hash("0") }
          : target;
        return {
          browserContextIdentitySha256: contexts[target.projectName],
          observedTarget,
          screenshot: Buffer.from(
            options.fault === "unrelated-page-exact-target"
              ? "phase4-unrelated-page-png"
              : "phase4-exact-target-png",
            "utf8"
          )
        };
      },
      async close() {
        if (observations.browserCloseCount === 0) observations.browserCloseCount += 1;
      },
      async compareIndependentPixels(expected, current) {
        observations.sharpCompareCount += 1;
        if (options.fault === "resized-self-compare") {
          throw new Error("California Phase4 rejects resized self-comparison without independent expected/current pixels");
        }
        let mismatchPixelCount = 0;
        for (let index = 0; index < expected.pixels.length; index += 4) {
          if (expected.pixels[index] !== current.pixels[index] ||
              expected.pixels[index + 1] !== current.pixels[index + 1] ||
              expected.pixels[index + 2] !== current.pixels[index + 2] ||
              expected.pixels[index + 3] !== current.pixels[index + 3]) {
            mismatchPixelCount += 1;
          }
        }
        if (options.fault === "pixel-mismatch" && mismatchPixelCount === 0) {
          mismatchPixelCount = 1;
        }
        if (options.fault === "false-zero-comparator") {
          mismatchPixelCount = 0;
        }
        return {
          comparisonSha256: sha256(stableJson({
            currentPixelsSha256: sha256(current.pixels),
            expectedPixelsSha256: sha256(expected.pixels),
            mismatchPixelCount
          })),
          currentPixelsSha256: sha256(current.pixels),
          expectedPixelsSha256: sha256(expected.pixels),
          mismatchPixelCount
        };
      },
      async decodeScreenshot(_screenshot, _context, target) {
        observations.sharpDecodeCount += 1;
        const fill = options.fault === "false-zero-comparator"
          ? 1
          : _screenshot.equals(Buffer.from("phase4-exact-target-png", "utf8")) ? 0 : 1;
        return {
          height: target.backingSize.height,
          pixels: new Uint8Array(target.backingSize.width * target.backingSize.height * 4).fill(fill),
          width: target.backingSize.width
        };
      },
      async runBaselineStage(context, stage) {
        observations.baselineContextFrozen.push(
          Object.isFrozen(context) && Object.isFrozen(context.group) &&
          Object.isFrozen(context.group.classCropCounts) &&
          context.group.classCropCounts.every((row) => Object.isFrozen(row))
        );
        observations.baselineGroupKeys.push(context.group.groupKey);
        observations.baselineClassCropCounts.push(
          context.group.classCropCounts.map((row) => row.cropCount));
        observations.baselineStages.push(stage);
        if (options.fault === "hold-first-baseline-stage" && stage === "navigation") {
          reportHeldBaselineStageStarted();
          await heldBaselineStage;
        }
        const projectName = context.group.projectName as CaliforniaSignatureFinalCompositorPhase4ProjectName;
        return {
          browserContextIdentitySha256:
            options.fault === "wrong-mobile-physical-context" && projectName === "mobile-chrome"
              ? contexts["desktop-chrome"] : contexts[projectName],
          completed: true,
          evidenceSha256: sha256(stableJson({ context, stage })),
          projectName,
          stage: options.fault === "wrong-stage" && stage === "navigation" ? "hydrate" : stage
        };
      }
    };
    const authority: CaliforniaSignatureFinalCompositorPhase4LifecycleAuthority = {
      authenticatedPlan: source.authenticatedPlan,
      async checkpoint(label) {
        observations.checkpointCount += 1;
        if (options.fault === "expire-during-calibration" && label.includes("calibration")) {
          currentNowUnixMs = receipt.expiresAtUnixMs + 1;
        }
        const checkpoint = checkpointFor(receipt);
        if (options.fault === "drift-during-baseline" && label.includes("baseline")) {
          return { ...checkpoint, sourceManifestSha256: hash("0") };
        }
        if (options.fault === "drift-after-build-discovery" && discoveryDrifted) {
          return { ...checkpoint, sourceManifestSha256: hash("0") };
        }
        if (options.fault === "source-drift") {
          return { ...checkpoint, sourceManifestSha256: hash("0") };
        }
        if (options.fault === "missing-server") {
          return { ...checkpoint, serverProcessIdentitySha256: hash("0") };
        }
        return checkpoint;
      },
      async inspectPhysicalChrome() {
        calls.push("inspect-physical-chrome");
        if (options.fault === "missing-chrome") return null;
        if (options.fault === "expire-after-chrome-discovery") {
          currentNowUnixMs = receipt.expiresAtUnixMs + 1;
        }
        return {
          browserExecutablePath: "/Volumes/Starship/tools/chrome/Chromium",
          browserExecutableSha256: receipt.browserExecutableSha256,
          browserIdentitySha256: receipt.browserIdentitySha256,
          playwrightVersion: "1.55.0"
        };
      },
      async inspectSharp() {
        calls.push("inspect-sharp");
        if (options.fault === "missing-sharp") return null;
        return {
          dependencySha256: receipt.dependencySha256,
          libvipsVersion: "8.17.1",
          sharpLibvipsSha256: receipt.sharpLibvipsSha256,
          sharpVersion: "0.34.3"
        };
      },
      async launchPhysicalChrome() {
        calls.push("launch-physical-chrome");
        observations.browserLaunchCount += 1;
        observations.browserContextCount += 2;
        if (options.fault === "new-page-rejection") {
          observations.browserCloseCount += 1;
          throw new Error("California Phase4 new page creation rejected and browser was closed");
        }
        return session;
      },
      nowMonotonicNs() {
        if (options.fault !== "monotonic-regression") monotonicNs += BigInt(1);
        return monotonicNs;
      },
      nowUnixMs: () => currentNowUnixMs,
      processIdentity: () => ({
        nodeVersion: "v24.6.0", parentProcessId: 41, processId: 42,
        processStartedAtMonotonicNs: "9999"
      }),
      async readAcceptedBuildReceipt() {
        return privateReadFor(receipt, options.fault);
      },
      async readProductionBuild() {
        calls.push("read-production-build");
        if (options.fault === "missing-build") return null;
        if (options.fault === "drift-after-build-discovery") discoveryDrifted = true;
        return {
          acceptedBuildId: options.fault === "build-drift" ? "another-build" : receipt.acceptedBuildId,
          acceptedBuildIdFileSha256: receipt.acceptedBuildIdFileSha256,
          acceptedBuildManifestSha256: receipt.acceptedBuildManifestSha256,
          sourceBuildSha256: receipt.sourceBuildSha256
        };
      },
      sourceReceiptSha256: source.sourceReceiptSha256
    };
    if (!["copied-sibling-receipt", "moved-sibling-receipt", "renamed-sibling-receipt"]
      .includes(options.fault ?? "")) {
      authorityBrands.set(authority, {
        checkpoint: {
          ...checkpointFor(receipt),
          sourceManifestSha256: options.fault === "self-signed-source-drift"
            ? hash("7") : receipt.sourceManifestSha256
        },
        fingerprint: sha256(stableJson({
          authenticatedPlan: authority.authenticatedPlan,
          sourceReceiptSha256: authority.sourceReceiptSha256
        })),
        receiptSha256: receipt.acceptedBuildReceiptSha256
      });
    }
    return authority;
  };

  return Object.freeze({
    externalCalls: () => [...calls],
    observations: (): Observations => structuredClone(observations),
    releaseHeldBaselineStage: () => releaseHeldBaselineStage(),
    async prepare(): Promise<CaliforniaSignatureFinalCompositorPhase4RealDriverLease> {
      if (options.acceptedReceipt === null) {
        throw new Error("California Phase4 real driver requires one private accepted production build receipt");
      }
      return exerciseBrandedAuthority(await makeAuthority(), observations);
    },
    async subjects() {
      const source = await exactAuthoritySource();
      return {
        calibrationClass: expectedClass(source.executionPlan,
          source.authenticatedPlan.calibrationTargets[0]!.classId)!,
        calibrationTargets: source.authenticatedPlan.calibrationTargets,
        executionGroups: source.authenticatedPlan.executionGroups
      };
    },
    waitForHeldBaselineStage: () => heldBaselineStageStarted
  });
}
