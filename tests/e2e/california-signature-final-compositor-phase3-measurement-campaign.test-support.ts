import assert from "node:assert/strict";
import { createHash, type Hash } from "node:crypto";
import {
  chmodSync,
  closeSync,
  constants as fsConstants,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdtempSync,
  openSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
  writeSync
} from "node:fs";
import path from "node:path";
import {
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE3_EXACT_COUNTERS,
  type CaliforniaSignatureFinalCompositorPhase3BaselineOutcome,
  type CaliforniaSignatureFinalCompositorPhase3CalibrationOutcome,
  type CaliforniaSignatureFinalCompositorPhase3CampaignPublication,
  type CaliforniaSignatureFinalCompositorPhase3CampaignSeal,
  type CaliforniaSignatureFinalCompositorPhase3CampaignSourcePlan,
  type CaliforniaSignatureFinalCompositorPhase3CurrentSourceReceipt,
  type CaliforniaSignatureFinalCompositorPhase3MeasurementDriver,
  type CaliforniaSignatureFinalCompositorPhase3PlanBinding,
  type CaliforniaSignatureFinalCompositorPhase3ProducerIdentity
} from "./california-signature-final-compositor-phase3-measurement-campaign";
import {
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY,
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY_SHA256,
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_TIMING_PROCEDURE_SHA256,
  type CaliforniaSignatureFinalCompositorReviewedMaximumDimensions
} from "./california-signature-final-compositor-measurement-lifecycle";
import {
  CALIFORNIA_SIGNATURE_REVIEWED_FINAL_COMPOSITOR_DIMENSION_REGISTRY_SHA256,
  buildCaliforniaSignatureReviewedFinalCompositorSourcePlan,
  calculateCaliforniaSignatureFinalCompositorCapacitySourceIdentitySha256,
  californiaSignatureFinalCompositorGroupKey,
  summarizeCaliforniaSignatureFinalCompositorCapacityGroups,
  type CaliforniaSignatureFinalCompositorCapacitySourceIdentity,
  type CaliforniaSignatureFinalCompositorClassCounter,
  type CaliforniaSignatureFinalCompositorExecutionGroupSummary
} from "./california-signature-final-compositor-capacity-plan";
import {
  CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS
} from "./california-signature-exhaustive-artifact-lifecycle";
import {
  CALIFORNIA_FORMAL_PROJECT_EVIDENCE_BY_NAME
} from "./california-visualization-qa-helpers";
import {
  californiaSignatureAxisIdsForProject
} from "./california-signature-exhaustive-qa";
import {
  buildCaliforniaSignatureSourceManifest
} from "./california-signature-control-manifest";
import {
  buildCaliforniaSignatureSourceExpectedEvidenceOracle
} from "./california-signature-source-expected-provider";
import {
  buildCaliforniaCanvasGraphicsSourceContract
} from "./california-canvas-graphics-source-contract";

const WORKTREE_ROOT = "/Volumes/Starship/MAIS-ca-viz-labs-wt";
const TEMPORARY_ROOT = path.join(WORKTREE_ROOT, ".tmp");
const RECEIPT_STREAM_FILE_NAME = "phase3-measurement-receipts.ndjson";
const SEAL_FILE_NAME = "phase3-measurement-campaign-seal.json";
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const PHASE3_SCHEMA_VERSION = 1;
const WARMUP_COUNT = CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY.warmupCount;
const MEASURED_COUNT =
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY.measuredSampleCount;
const SAMPLE_COUNT_PER_RECEIPT = WARMUP_COUNT + MEASURED_COUNT;

const EXACT_PROJECT_COUNTERS = Object.freeze([
  Object.freeze({
    cropCount: 524_634,
    evidenceRecordCount: 570_931,
    groupCount: 2_418,
    projectName: "desktop-chrome",
    receiptCount: 515_508
  }),
  Object.freeze({
    cropCount: 524_634,
    evidenceRecordCount: 557_064,
    groupCount: 2_232,
    projectName: "mobile-chrome",
    receiptCount: 515_508
  })
] as const);

const EXPECTED_CLASS_IDS = Object.freeze([
  "desktop-chrome-source-dpr-cap-2",
  "desktop-chrome-source-dpr-cap-3",
  "mobile-chrome-source-dpr-cap-2",
  "mobile-chrome-source-dpr-cap-3"
] as const);

const BASELINE_STAGE_SEQUENCE = Object.freeze([
  "navigation",
  "hydrate",
  "replay",
  "layout",
  "real-reset"
] as const);

const CAPACITY_AUTHORIZATION_BLOCKERS = Object.freeze([
  "actual-lane-process-manifest-unavailable",
  "artifact-24h-capacity-unreviewed",
  "formal-72h-capacity-unreviewed",
  "formal-runner-integration-unavailable",
  "physical-browser-measurement-receipts-unreviewed"
] as const);

function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => compareCodeUnits(left, right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function deepFreeze<T>(value: T): T {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    return value;
  }
  for (const key of Reflect.ownKeys(value as object)) {
    deepFreeze((value as Record<PropertyKey, unknown>)[key]);
  }
  return Object.freeze(value);
}

function updateFramedHash(hash: Hash, value: unknown): void {
  const payload = Buffer.from(stableJson(value), "utf8");
  hash.update(String(payload.length));
  hash.update(":");
  hash.update(payload);
}

function assertPlainRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value),
    `${label} must be one plain object`);
  const prototype = Object.getPrototypeOf(value);
  assert.ok(prototype === Object.prototype || prototype === null,
    `${label} must not use a custom prototype`);
}

function assertExactKeys(
  value: unknown,
  keys: readonly string[],
  label: string
): asserts value is Record<string, unknown> {
  assertPlainRecord(value, label);
  assert.deepEqual(Object.keys(value).sort(compareCodeUnits), [...keys].sort(compareCodeUnits),
    `${label} keys drifted`);
}

function assertSafeString(value: unknown, label: string, maximum = 1024): asserts value is string {
  assert.ok(typeof value === "string" && value.length > 0 && value.length <= maximum,
    `${label} must be one non-empty bounded string`);
  assert.ok(!value.includes("\0"), `${label} contains a NUL delimiter`);
}

function assertSha256(value: unknown, label: string): asserts value is string {
  assert.ok(typeof value === "string", `${label} must be a SHA-256 string`);
  assert.match(value, SHA256_PATTERN, `${label} must be one lowercase SHA-256`);
}

function assertPositiveSafeInteger(value: unknown, label: string): asserts value is number {
  assert.ok(typeof value === "number" && Number.isSafeInteger(value) && value > 0,
    `${label} must be one positive safe integer`);
}

function assertNonNegativeSafeInteger(value: unknown, label: string): asserts value is number {
  assert.ok(typeof value === "number" && Number.isSafeInteger(value) && value >= 0,
    `${label} must be one non-negative safe integer`);
}

function assertMaximumDimensions(
  value: unknown,
  label: string
): asserts value is CaliforniaSignatureFinalCompositorReviewedMaximumDimensions {
  assertExactKeys(value, ["backingSize", "clipSize", "cssSize"], label);
  for (const key of ["backingSize", "clipSize", "cssSize"] as const) {
    assertExactKeys(value[key], ["height", "width"], `${label}.${key}`);
    assertPositiveSafeInteger(value[key].height, `${label}.${key}.height`);
    assertPositiveSafeInteger(value[key].width, `${label}.${key}.width`);
  }
}

function expectedMaximumDimensions(classId: string) {
  if (classId.startsWith("desktop-chrome-")) {
    return {
      backingSize: { height: 1_100, width: 1_440 },
      clipSize: { height: 1_100, width: 1_440 },
      cssSize: { height: 1_100, width: 1_440 }
    };
  }
  const cap = classId.endsWith("-2") ? 2 : 3;
  return {
    backingSize: cap === 2
      ? { height: 1_454, width: 786 }
      : { height: 1_999, width: 1_081 },
    clipSize: { height: 727, width: 393 },
    cssSize: { height: 727, width: 393 }
  };
}

function validateProducerIdentity(
  value: unknown
): CaliforniaSignatureFinalCompositorPhase3ProducerIdentity {
  const keys = [
    "acceptedBuildId", "acceptedBuildReceiptSha256", "browserExecutableSha256",
    "browserIdentitySha256", "dependencySha256", "environmentDiscoveryFileSha256",
    "environmentSha256", "machineSha256", "sharpLibvipsSha256", "sourceBuildSha256",
    "sourceSnapshotSha256"
  ] as const;
  assertExactKeys(value, keys, "California Phase3 producer identity");
  assertSafeString(value.acceptedBuildId, "California Phase3 accepted BUILD_ID", 256);
  for (const key of keys.slice(1)) {
    assertSha256(value[key], `California Phase3 producer identity ${key}`);
  }
  return { ...value } as CaliforniaSignatureFinalCompositorPhase3ProducerIdentity;
}

function validateExecutionGroup(
  group: CaliforniaSignatureFinalCompositorExecutionGroupSummary,
  index: number
): void {
  assert.equal(group.groupKey, californiaSignatureFinalCompositorGroupKey(group),
    `California Phase3 execution group ${index} key drifted`);
  assertPositiveSafeInteger(group.expectedRecordCount,
    `${group.groupKey}: Phase3 expected record count`);
  assertNonNegativeSafeInteger(group.receiptCount,
    `${group.groupKey}: Phase3 Canvas receipt count`);
  assertNonNegativeSafeInteger(group.cropCount,
    `${group.groupKey}: Phase3 Canvas crop count`);
  assert.ok(Array.isArray(group.classCropCounts),
    `${group.groupKey}: Phase3 class crop rows are absent`);
  const classIds = new Set<string>();
  let classCropCount = 0;
  for (const row of group.classCropCounts) {
    assertSafeString(row.classId, `${group.groupKey}: Phase3 class ID`, 256);
    assert.ok(!classIds.has(row.classId),
      `${group.groupKey}: Phase3 duplicate class ${row.classId}`);
    classIds.add(row.classId);
    assertPositiveSafeInteger(row.cropCount,
      `${group.groupKey}/${row.classId}: Phase3 crop count`);
    classCropCount += row.cropCount;
    assert.ok(Number.isSafeInteger(classCropCount),
      `${group.groupKey}: Phase3 class crop count overflowed`);
  }
  assert.equal(classCropCount, group.cropCount,
    `${group.groupKey}: Phase3 class crops differ from group crops`);
}

function calculateExecutionGroupOrderSha256(
  groups: readonly CaliforniaSignatureFinalCompositorExecutionGroupSummary[]
): string {
  return sha256(groups.map((group) => group.groupKey).join("\n"));
}

type AuthoritativeCurrentSourceBrand = {
  fingerprint: string;
  sourceIdentities: CaliforniaSignatureFinalCompositorPhase3CurrentSourceReceipt[
    "sourceIdentities"
  ];
  sourcePlan: CaliforniaSignatureFinalCompositorPhase3CampaignSourcePlan;
  sourceReceiptSha256: string;
};

const authoritativeCurrentSourceBrands = new WeakMap<
CaliforniaSignatureFinalCompositorPhase3CurrentSourceReceipt,
AuthoritativeCurrentSourceBrand>();

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

export async function produceCaliforniaSignatureFinalCompositorPhase3TestCurrentSourceReceipt():
Promise<CaliforniaSignatureFinalCompositorPhase3CurrentSourceReceipt> {
  assert.equal(arguments.length, 0,
    "California Phase3 current-source lifecycle takes no caller-authored source identities");
  const manifest = buildCaliforniaSignatureSourceManifest(WORKTREE_ROOT);
  const oracle = await buildCaliforniaSignatureSourceExpectedEvidenceOracle(manifest);
  const canvasContract = buildCaliforniaCanvasGraphicsSourceContract(WORKTREE_ROOT);
  const sourceSnapshotSha256 = sha256([
    oracle.blueprintSha256,
    oracle.canvasContractSha256,
    oracle.componentSourceSha256,
    oracle.evidenceKeysSha256
  ].join("\0"));
  const reviewed = buildCaliforniaSignatureReviewedFinalCompositorSourcePlan({
    canvasContract,
    manifest,
    oracle,
    projectDimensionPolicies: formalDimensionProjects(),
    projectRoot: WORKTREE_ROOT,
    sourceSnapshotSha256
  });
  assert.equal(reviewed.dimensionRegistry.dimensionRegistrySha256,
    CALIFORNIA_SIGNATURE_REVIEWED_FINAL_COMPOSITOR_DIMENSION_REGISTRY_SHA256,
  "California Phase3 authoritative lifecycle differs from the canonical dimension registry");
  assert.equal(reviewed.sourceIdentity.dimensionRegistrySha256,
    CALIFORNIA_SIGNATURE_REVIEWED_FINAL_COMPOSITOR_DIMENSION_REGISTRY_SHA256,
  "California Phase3 authoritative source identity lost the canonical dimension registry");
  assert.equal(reviewed.sourceIdentity.sourceSnapshotSha256, sourceSnapshotSha256,
    "California Phase3 authoritative lifecycle source snapshot drifted");
  assert.equal(reviewed.sourceIdentity.receiptsSha256, reviewed.summary.receiptsSha256,
    "California Phase3 authoritative lifecycle receipt identity drifted");
  assert.equal(reviewed.sourceIdentity.summarySha256, reviewed.summary.summarySha256,
    "California Phase3 authoritative lifecycle summary identity drifted");
  assert.equal(reviewed.sourceIdentity.workUnitsSha256, reviewed.summary.workUnitsSha256,
    "California Phase3 authoritative lifecycle work-unit identity drifted");
  assert.deepEqual(reviewed.sourceIdentity.classes, reviewed.summary.classes,
    "California Phase3 authoritative lifecycle class identities drifted");

  const authoritativeClasses = reviewed.sourceIdentity.classes.map((row) => {
    const registryClass = reviewed.dimensionRegistry.dimensionClasses.find((candidate) =>
      candidate.classId === row.classId);
    assert.ok(registryClass,
      `${row.classId}: California Phase3 authoritative registry class is missing`);
    assert.equal(row.reviewedClassSha256, registryClass.reviewedClassSha256,
      `${row.classId}: California Phase3 authoritative reviewed class identity drifted`);
    const reviewedPoliciesSha256 = sha256(stableJson(
      reviewed.dimensionRegistry.bindingPolicies.filter((policy) =>
        policy.classId === row.classId)
    ));
    assert.equal(row.reviewedPoliciesSha256, reviewedPoliciesSha256,
      `${row.classId}: California Phase3 authoritative reviewed policies identity drifted`);
    return {
      classId: row.classId,
      maximumDimensions: structuredClone(row.maximumDimensions),
      projectName: row.projectName,
      reviewedClassSha256: row.reviewedClassSha256,
      reviewedPoliciesSha256: row.reviewedPoliciesSha256
    };
  });
  const sourceIdentitySha256 =
    calculateCaliforniaSignatureFinalCompositorCapacitySourceIdentitySha256(
      reviewed.sourceIdentity
    );
  const sourceIdentities = deepFreeze({
    dimensionRegistrySha256:
      CALIFORNIA_SIGNATURE_REVIEWED_FINAL_COMPOSITOR_DIMENSION_REGISTRY_SHA256,
    receiptsSha256: reviewed.summary.receiptsSha256,
    reviewedClassesSha256: sha256(stableJson(authoritativeClasses)),
    sourceContractSha256: reviewed.dimensionRegistry.sourceContractSha256,
    sourceIdentitySha256,
    sourceSha256: reviewed.dimensionRegistry.sourceSha256,
    sourceSnapshotSha256,
    summarySha256: reviewed.summary.summarySha256,
    workUnitsSha256: reviewed.summary.workUnitsSha256
  });
  const sourcePlan = deepFreeze({
    canvasGroupCount: reviewed.summary.groupCount,
    executionGroupOrderSha256:
      calculateExecutionGroupOrderSha256(reviewed.executionGroups),
    executionGroups: reviewed.executionGroups.map((group) => structuredClone(group)),
    sourceIdentity: structuredClone(reviewed.sourceIdentity)
  } satisfies CaliforniaSignatureFinalCompositorPhase3CampaignSourcePlan);
  const receiptWithoutSha = {
    schemaVersion: 1 as const,
    sourceIdentities,
    sourcePlan,
    status: "authoritative-current-source-plan-v1" as const
  };
  const sourceReceiptSha256 = sha256(stableJson(receiptWithoutSha));
  const receipt = deepFreeze({ ...receiptWithoutSha, sourceReceiptSha256 });
  authoritativeCurrentSourceBrands.set(receipt, {
    fingerprint: sha256(stableJson(receipt)),
    sourceIdentities,
    sourcePlan,
    sourceReceiptSha256
  });
  return receipt;
}

function readAuthoritativeCurrentSourceReceipt(
  receipt: CaliforniaSignatureFinalCompositorPhase3CurrentSourceReceipt
): AuthoritativeCurrentSourceBrand {
  const brand = receipt && typeof receipt === "object"
    ? authoritativeCurrentSourceBrands.get(receipt)
    : undefined;
  assert.ok(brand,
    "California Phase3 source plan lacks an authoritative current-source receipt brand");
  assertExactKeys(receipt, [
    "schemaVersion", "sourceIdentities", "sourcePlan", "sourceReceiptSha256", "status"
  ], "California Phase3 authoritative current-source receipt");
  assert.equal(receipt.schemaVersion, PHASE3_SCHEMA_VERSION,
    "California Phase3 authoritative current-source receipt schema drifted");
  assert.equal(receipt.status, "authoritative-current-source-plan-v1",
    "California Phase3 authoritative current-source receipt status drifted");
  assert.equal(Object.isFrozen(receipt), true,
    "California Phase3 authoritative current-source receipt is not immutable");
  assert.equal(sha256(stableJson(receipt)), brand.fingerprint,
    "California Phase3 authoritative current-source receipt changed after lifecycle production");
  assert.equal(receipt.sourceReceiptSha256, brand.sourceReceiptSha256,
    "California Phase3 authoritative current-source receipt identity drifted");
  const { sourceReceiptSha256, ...receiptWithoutSha } = receipt;
  assert.equal(sourceReceiptSha256, sha256(stableJson(receiptWithoutSha)),
    "California Phase3 authoritative current-source receipt is not exactly derived");
  assert.deepEqual(receipt.sourceIdentities, brand.sourceIdentities,
    "California Phase3 authoritative current-source identities drifted");
  assert.deepEqual(receipt.sourcePlan, brand.sourcePlan,
    "California Phase3 authoritative current-source plan drifted");
  assert.equal(brand.sourceIdentities.dimensionRegistrySha256,
    CALIFORNIA_SIGNATURE_REVIEWED_FINAL_COMPOSITOR_DIMENSION_REGISTRY_SHA256,
  "California Phase3 authoritative receipt differs from the canonical registry");
  return brand;
}

export function bindCaliforniaSignatureFinalCompositorPhase3TestSourcePlan(
  receipt: CaliforniaSignatureFinalCompositorPhase3CurrentSourceReceipt
): CaliforniaSignatureFinalCompositorPhase3PlanBinding {
  const authoritative = readAuthoritativeCurrentSourceReceipt(receipt);
  const value = deepFreeze(structuredClone(authoritative.sourcePlan));
  assertExactKeys(value,
    ["canvasGroupCount", "executionGroupOrderSha256", "executionGroups", "sourceIdentity"],
    "California Phase3 source execution plan");
  assert.equal(value.canvasGroupCount,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE3_EXACT_COUNTERS.canvasGroupCount,
  "California Phase3 exact Canvas group count drifted");
  assertSha256(value.executionGroupOrderSha256,
    "California Phase3 execution group order identity");
  assert.ok(Array.isArray(value.executionGroups),
    "California Phase3 execution group plan is absent");
  assert.equal(value.executionGroups.length,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE3_EXACT_COUNTERS.executionGroupCount,
  "California Phase3 exact execution group count must remain 4,650");
  const groupKeys = new Set<string>();
  value.executionGroups.forEach((group, index) => {
    validateExecutionGroup(group, index);
    assert.ok(!groupKeys.has(group.groupKey),
      `${group.groupKey}: California Phase3 duplicate execution group`);
    groupKeys.add(group.groupKey);
  });
  assert.equal(value.executionGroupOrderSha256,
    calculateExecutionGroupOrderSha256(value.executionGroups),
  "California Phase3 canonical execution order drifted");
  const sourceIdentitySha256 =
    calculateCaliforniaSignatureFinalCompositorCapacitySourceIdentitySha256(value.sourceIdentity);
  assert.equal(sourceIdentitySha256, authoritative.sourceIdentities.sourceIdentitySha256,
    "California Phase3 source identity differs from its authoritative current-source receipt");
  assert.equal(value.sourceIdentity.dimensionRegistrySha256,
    authoritative.sourceIdentities.dimensionRegistrySha256,
  "California Phase3 source dimension registry differs from its authoritative receipt");
  assert.equal(value.sourceIdentity.receiptsSha256,
    authoritative.sourceIdentities.receiptsSha256,
  "California Phase3 source receipt identity differs from its authoritative receipt");
  assert.equal(value.sourceIdentity.sourceSnapshotSha256,
    authoritative.sourceIdentities.sourceSnapshotSha256,
  "California Phase3 source snapshot differs from its authoritative receipt");
  assert.equal(value.sourceIdentity.summarySha256,
    authoritative.sourceIdentities.summarySha256,
  "California Phase3 source summary differs from its authoritative receipt");
  assert.equal(value.sourceIdentity.workUnitsSha256,
    authoritative.sourceIdentities.workUnitsSha256,
  "California Phase3 source work units differ from its authoritative receipt");
  assert.equal(value.sourceIdentity.unreviewedDiagnostic, false,
    "California Phase3 rejects an unreviewed source plan");
  assert.equal(value.sourceIdentity.groupCount,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE3_EXACT_COUNTERS.executionGroupCount,
  "California Phase3 source group count is not exact");
  assert.equal(value.sourceIdentity.evidenceRecordCount,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE3_EXACT_COUNTERS.evidenceRecordCount,
  "California Phase3 source evidence record count is not exact");
  assert.equal(value.sourceIdentity.receiptCount,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE3_EXACT_COUNTERS.canvasReceiptCount,
  "California Phase3 source Canvas receipt count is not exact");
  assert.equal(value.sourceIdentity.cropCount,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE3_EXACT_COUNTERS.canvasCropCount,
  "California Phase3 source Canvas crop count is not exact");
  assert.deepEqual(value.sourceIdentity.projects, EXACT_PROJECT_COUNTERS,
    "California Phase3 source project counters drifted");
  assert.deepEqual(value.sourceIdentity.formalContract, {
    projectNames: ["desktop-chrome", "mobile-chrome"],
    terminalArtifactTarget: 102
  }, "California Phase3 formal project/artifact contract drifted");
  const summary = summarizeCaliforniaSignatureFinalCompositorCapacityGroups(
    value.executionGroups.map((group) => ({ ...group, weightMs: 1 }))
  );
  assert.equal(summary.groupCount, value.sourceIdentity.groupCount,
    "California Phase3 execution groups differ from source group count");
  assert.equal(summary.evidenceRecordCount, value.sourceIdentity.evidenceRecordCount,
    "California Phase3 execution groups differ from source evidence records");
  assert.equal(summary.receiptCount, value.sourceIdentity.receiptCount,
    "California Phase3 execution groups differ from source Canvas receipts");
  assert.equal(summary.cropCount, value.sourceIdentity.cropCount,
    "California Phase3 execution groups differ from source Canvas crops");
  assert.equal(summary.groupsSha256, value.sourceIdentity.groupsSha256,
    "California Phase3 execution groups differ from source group identity");
  assert.deepEqual(summary.projects, value.sourceIdentity.projects,
    "California Phase3 execution groups differ from source project counters");
  const derivedClassDistribution = summary.classes.map((row) => ({
    classId: row.classId,
    cropCount: row.cropCount,
    projectName: row.projectName
  }));
  const sourceClassDistribution = value.sourceIdentity.classes.map((row) => ({
    classId: row.classId,
    cropCount: row.cropCount,
    projectName: row.projectName
  }));
  assert.equal(derivedClassDistribution.length,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE3_EXACT_COUNTERS.dimensionClassCount,
  "California Phase3 must calibrate all four source-owned dimension classes");
  assert.deepEqual(derivedClassDistribution.map((row) => row.classId), EXPECTED_CLASS_IDS,
    "California Phase3 independently derived dimension class order drifted");
  assert.deepEqual(sourceClassDistribution.map((row) => row.classId), EXPECTED_CLASS_IDS,
    "California Phase3 source-owned dimension class identities drifted");
  assert.deepEqual(sourceClassDistribution, derivedClassDistribution,
    "California Phase3 source class counters differ from independently derived class crop distribution");
  const classDistributionSha256 = sha256(stableJson(derivedClassDistribution));
  const classRegistryOrder = value.sourceIdentity.classes.map((row) => ({
    classId: row.classId,
    maximumDimensions: structuredClone(row.maximumDimensions),
    projectName: row.projectName,
    reviewedClassSha256: row.reviewedClassSha256,
    reviewedPoliciesSha256: row.reviewedPoliciesSha256
  }));
  const classRegistryOrderSha256 = sha256(stableJson(classRegistryOrder));
  assert.equal(classRegistryOrderSha256,
    authoritative.sourceIdentities.reviewedClassesSha256,
  "California Phase3 reviewed class and policy identities differ from the authoritative receipt");
  const classPlans = derivedClassDistribution.map((derivedRow, index) => {
    const registryRow = value.sourceIdentity.classes[index]!;
    assert.equal(registryRow.classId, derivedRow.classId,
      `${derivedRow.classId}: California Phase3 registry class order drifted`);
    assert.equal(registryRow.projectName, derivedRow.projectName,
      `${derivedRow.classId}: California Phase3 registry class crossed projects`);
    assertMaximumDimensions(registryRow.maximumDimensions,
      `${derivedRow.classId}: California Phase3 reviewed maximum dimensions`);
    assert.deepEqual(registryRow.maximumDimensions, expectedMaximumDimensions(derivedRow.classId),
      `${derivedRow.classId}: California Phase3 maximum envelope drifted`);
    const base = {
      classId: derivedRow.classId,
      cropCount: derivedRow.cropCount,
      maximumDimensions: structuredClone(registryRow.maximumDimensions),
      projectName: derivedRow.projectName,
      reviewedClassSha256: registryRow.reviewedClassSha256,
      reviewedPoliciesSha256: registryRow.reviewedPoliciesSha256
    };
    return { ...base, classPlanSha256: sha256(stableJson(base)) };
  });
  const executionGroupsSha256 = sha256(stableJson(value.executionGroups.map((group) => ({
    axisId: group.axisId,
    benchId: group.benchId,
    classCropCounts: group.classCropCounts,
    cropCount: group.cropCount,
    expectedRecordCount: group.expectedRecordCount,
    groupKey: group.groupKey,
    phase: group.phase,
    projectName: group.projectName,
    receiptCount: group.receiptCount
  }))));
  const withoutPlanSha = {
    classDistributionSha256,
    classPlans,
    classRegistryOrderSha256,
    counters: CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE3_EXACT_COUNTERS,
    dimensionRegistrySha256: authoritative.sourceIdentities.dimensionRegistrySha256,
    executionGroupOrderSha256: value.executionGroupOrderSha256,
    executionGroupsSha256,
    receiptsSha256: authoritative.sourceIdentities.receiptsSha256,
    reviewedClassesSha256: authoritative.sourceIdentities.reviewedClassesSha256,
    sourceContractSha256: authoritative.sourceIdentities.sourceContractSha256,
    sourceIdentitySha256: authoritative.sourceIdentities.sourceIdentitySha256,
    sourceReceiptSha256: authoritative.sourceReceiptSha256,
    sourceSha256: authoritative.sourceIdentities.sourceSha256,
    sourceSnapshotSha256: authoritative.sourceIdentities.sourceSnapshotSha256,
    summarySha256: authoritative.sourceIdentities.summarySha256,
    workUnitsSha256: authoritative.sourceIdentities.workUnitsSha256
  };
  return deepFreeze({
    ...withoutPlanSha,
    executionPlanSha256: sha256(stableJson(withoutPlanSha))
  });
}

function validateBaselineOutcome(
  value: unknown,
  group: CaliforniaSignatureFinalCompositorExecutionGroupSummary
): CaliforniaSignatureFinalCompositorPhase3BaselineOutcome {
  assertExactKeys(value,
    ["browserContextIdentitySha256", "finalCompositorExcluded", "groupKey", "stages"],
    `${group.groupKey}: California Phase3 baseline outcome`);
  assertSha256(value.browserContextIdentitySha256,
    `${group.groupKey}: California Phase3 baseline browser context`);
  assert.equal(value.finalCompositorExcluded, true,
    `${group.groupKey}: California Phase3 baseline must keep final compositor excluded`);
  assert.equal(value.groupKey, group.groupKey,
    `${group.groupKey}: California Phase3 baseline outcome crossed execution groups`);
  assert.ok(Array.isArray(value.stages),
    `${group.groupKey}: California Phase3 baseline stage sequence is absent`);
  assert.deepEqual(value.stages.map((stage) =>
    stage && typeof stage === "object" ? (stage as Record<string, unknown>).stage : null),
  BASELINE_STAGE_SEQUENCE,
  `${group.groupKey}: California Phase3 baseline stage sequence must include real-reset`);
  value.stages.forEach((stage, index) => {
    assertExactKeys(stage, ["acknowledgementSha256", "completed", "stage"],
      `${group.groupKey}: California Phase3 baseline stage ${index}`);
    assert.equal(stage.completed, true,
      `${group.groupKey}: California Phase3 baseline stage ${index} is incomplete`);
    assert.equal(stage.stage, BASELINE_STAGE_SEQUENCE[index],
      `${group.groupKey}: California Phase3 baseline stage ${index} order drifted`);
    assertSha256(stage.acknowledgementSha256,
      `${group.groupKey}: California Phase3 baseline stage ${index} acknowledgement`);
  });
  return value as CaliforniaSignatureFinalCompositorPhase3BaselineOutcome;
}

function validateCalibrationOutcome(
  value: unknown,
  dimensionClass: CaliforniaSignatureFinalCompositorClassCounter
): CaliforniaSignatureFinalCompositorPhase3CalibrationOutcome {
  assertExactKeys(value, [
    "browserContextIdentitySha256", "comparisonSha256", "decodeSha256",
    "finalCompositorIncluded", "maximumDimensions", "mismatchPixelCount",
    "screenshotByteCount", "screenshotSha256", "stage"
  ], `${dimensionClass.classId}: California Phase3 calibration outcome`);
  assertSha256(value.browserContextIdentitySha256,
    `${dimensionClass.classId}: California Phase3 calibration browser context`);
  assert.equal(value.finalCompositorIncluded, true,
    `${dimensionClass.classId}: California Phase3 calibration omitted final compositor`);
  assert.equal(value.stage, "final-compositor",
    `${dimensionClass.classId}: California Phase3 calibration stage drifted`);
  assertMaximumDimensions(value.maximumDimensions,
    `${dimensionClass.classId}: California Phase3 observed maximum dimensions`);
  assert.deepEqual(value.maximumDimensions, dimensionClass.maximumDimensions,
    `${dimensionClass.classId}: California Phase3 calibration maximum dimensions differ from maximum envelope`);
  assertSha256(value.screenshotSha256,
    `${dimensionClass.classId}: California Phase3 real screenshot`);
  assertPositiveSafeInteger(value.screenshotByteCount,
    `${dimensionClass.classId}: California Phase3 screenshot bytes`);
  assertSha256(value.decodeSha256,
    `${dimensionClass.classId}: California Phase3 decoded pixels`);
  assertSha256(value.comparisonSha256,
    `${dimensionClass.classId}: California Phase3 comparison`);
  assert.equal(value.mismatchPixelCount, 0,
    `${dimensionClass.classId}: California Phase3 comparison found mismatched pixels`);
  return value as CaliforniaSignatureFinalCompositorPhase3CalibrationOutcome;
}

type RawSample = {
  durationMs: number;
  endedAtMonotonicNs: string;
  kind: "measured" | "warmup";
  ordinal: number;
  outcomeSha256: string;
  startedAtMonotonicNs: string;
};

async function measureSample<T>(options: {
  kind: RawSample["kind"];
  nowMonotonicNs: () => bigint;
  ordinal: number;
  run: () => Promise<T>;
  validate: (value: unknown) => T;
}): Promise<RawSample> {
  const startedAtMonotonicNs = options.nowMonotonicNs();
  assert.ok(typeof startedAtMonotonicNs === "bigint" &&
    startedAtMonotonicNs >= BigInt(0),
  "California Phase3 producer-owned monotonic clock start is invalid");
  const outcome = options.validate(await options.run());
  const endedAtMonotonicNs = options.nowMonotonicNs();
  assert.ok(typeof endedAtMonotonicNs === "bigint" &&
    endedAtMonotonicNs > startedAtMonotonicNs,
  "California Phase3 producer-owned monotonic clock did not advance");
  const durationNanoseconds = endedAtMonotonicNs - startedAtMonotonicNs;
  const durationMsBigInt = (durationNanoseconds + BigInt(999_999)) / BigInt(1_000_000);
  const durationMs = Number(durationMsBigInt);
  assertPositiveSafeInteger(durationMs, "California Phase3 raw sample duration");
  return {
    durationMs,
    endedAtMonotonicNs: String(endedAtMonotonicNs),
    kind: options.kind,
    ordinal: options.ordinal,
    outcomeSha256: sha256(stableJson(outcome)),
    startedAtMonotonicNs: String(startedAtMonotonicNs)
  };
}

async function measureSubject<T>(options: {
  run: (context: { kind: RawSample["kind"]; ordinal: number }) => Promise<unknown>;
  validate: (value: unknown) => T;
  nowMonotonicNs: () => bigint;
}): Promise<{ samples: readonly RawSample[]; upperBoundMs: number }> {
  const samples: RawSample[] = [];
  for (let ordinal = 0; ordinal < SAMPLE_COUNT_PER_RECEIPT; ordinal += 1) {
    const kind = ordinal < WARMUP_COUNT ? "warmup" : "measured";
    samples.push(await measureSample({
      kind,
      nowMonotonicNs: options.nowMonotonicNs,
      ordinal,
      run: () => options.run({ kind, ordinal }),
      validate: options.validate
    }));
  }
  const measuredSamples = samples.slice(WARMUP_COUNT);
  assert.equal(measuredSamples.length, MEASURED_COUNT,
    "California Phase3 fixed measured sample count drifted");
  const maximumObservedMs = Math.max(...measuredSamples.map((sample) => sample.durationMs));
  const upperBoundMs = Math.ceil(maximumObservedMs *
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY.safetyMultiplierBps / 10_000) +
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY.fixedHeadroomMs;
  assertPositiveSafeInteger(upperBoundMs, "California Phase3 timing upper bound");
  return { samples, upperBoundMs };
}

function canonicalReceiptLine(value: unknown): Buffer {
  return Buffer.from(`${stableJson(value)}\n`, "utf8");
}

function assertPrivateDirectory(directoryPath: string, descriptor: number): void {
  const descriptorStats = fstatSync(descriptor, { bigint: true });
  const pathStats = lstatSync(directoryPath, { bigint: true });
  assert.ok(descriptorStats.isDirectory() && pathStats.isDirectory() && !pathStats.isSymbolicLink(),
    "California Phase3 held campaign directory is no longer one real directory");
  assert.deepEqual({ dev: pathStats.dev, ino: pathStats.ino },
    { dev: descriptorStats.dev, ino: descriptorStats.ino },
  "California Phase3 held campaign directory path drifted from its descriptor");
  assert.equal(Number(pathStats.mode) & 0o777, 0o700,
    "California Phase3 campaign directory must remain mode 0700");
  assert.equal(realpathSync.native(directoryPath), directoryPath,
    "California Phase3 campaign directory traverses a symlink");
}

function publishReadOnlyFile(options: {
  bytes: Buffer;
  directoryDescriptor: number;
  directoryPath: string;
  fileName: string;
}): { filePath: string; fileSha256: string } {
  assertPrivateDirectory(options.directoryPath, options.directoryDescriptor);
  assert.match(options.fileName, /^[a-z0-9][a-z0-9._-]{0,127}$/,
    "California Phase3 publication file name is unsafe");
  assert.equal(path.basename(options.fileName), options.fileName,
    "California Phase3 publication file name contains traversal");
  const filePath = path.join(options.directoryPath, options.fileName);
  const descriptor = openSync(filePath,
    fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_NOFOLLOW,
    0o600);
  try {
    writeFileSync(descriptor, options.bytes);
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  chmodSync(filePath, 0o400);
  fsyncSync(options.directoryDescriptor);
  const durableDescriptor = openSync(filePath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const stats = fstatSync(durableDescriptor, { bigint: true });
    assert.ok(stats.isFile() && stats.nlink === BigInt(1),
      `California Phase3 ${options.fileName} is not one exclusive regular file`);
    assert.equal(Number(stats.mode) & 0o777, 0o400,
      `California Phase3 ${options.fileName} must remain mode 0400`);
    const durableBytes = readFileSync(durableDescriptor);
    assert.deepEqual(durableBytes, options.bytes,
      `California Phase3 ${options.fileName} durable bytes drifted`);
  } finally {
    closeSync(durableDescriptor);
  }
  return { filePath, fileSha256: sha256(options.bytes) };
}

function validateCampaignSeal(
  candidate: unknown
): CaliforniaSignatureFinalCompositorPhase3CampaignSeal {
  assertExactKeys(candidate, [
    "capacityAuthorization", "counters", "executionPlan", "formalExecutionAuthorized",
    "producerIdentity", "producerIdentitySha256", "receiptSequenceSha256", "receiptStream",
    "schemaVersion", "sealSha256", "status", "timingPolicy", "timingPolicySha256",
    "timingProcedureSha256"
  ], "California Phase3 campaign seal");
  assert.equal(candidate.schemaVersion, PHASE3_SCHEMA_VERSION,
    "California Phase3 campaign seal schema drifted");
  assert.equal(candidate.status, "diagnostic-phase3-measurement-campaign",
    "California Phase3 campaign seal status drifted");
  assert.equal(candidate.formalExecutionAuthorized, false,
    "California Phase3 campaign seal must never authorize formal execution");
  assert.deepEqual(candidate.counters,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE3_EXACT_COUNTERS,
  "California Phase3 campaign seal counters drifted");
  assert.deepEqual(candidate.capacityAuthorization, {
    artifact24hPassed: false,
    blockers: CAPACITY_AUTHORIZATION_BLOCKERS,
    formal72hPassed: false,
    laneManifestReviewed: false,
    measurementReceiptsReviewed: false,
    runnerIntegrated: false
  }, "California Phase3 campaign must retain every formal authorization blocker");
  assert.deepEqual(candidate.timingPolicy,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY,
  "California Phase3 campaign timing policy drifted");
  assert.equal(candidate.timingPolicySha256,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY_SHA256,
  "California Phase3 campaign timing policy identity drifted");
  assert.equal(candidate.timingProcedureSha256,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_TIMING_PROCEDURE_SHA256,
  "California Phase3 campaign timing procedure identity drifted");
  assert.deepEqual(validateProducerIdentity(candidate.producerIdentity), candidate.producerIdentity,
    "California Phase3 campaign producer identity drifted");
  assert.equal(candidate.producerIdentitySha256, sha256(stableJson(candidate.producerIdentity)),
    "California Phase3 campaign producer identity digest drifted");
  assertSha256(candidate.receiptSequenceSha256,
    "California Phase3 campaign receipt sequence");
  assertExactKeys(candidate.receiptStream,
    ["byteCount", "fileName", "fileSha256", "lineCount"],
    "California Phase3 campaign receipt stream");
  assertPositiveSafeInteger(candidate.receiptStream.byteCount,
    "California Phase3 campaign receipt stream bytes");
  assert.equal(candidate.receiptStream.fileName, RECEIPT_STREAM_FILE_NAME,
    "California Phase3 campaign receipt stream file name drifted");
  assertSha256(candidate.receiptStream.fileSha256,
    "California Phase3 campaign receipt stream file");
  assert.equal(candidate.receiptStream.lineCount,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE3_EXACT_COUNTERS.measurementReceiptCount,
  "California Phase3 campaign receipt stream lost measurement receipts");
  assertPlainRecord(candidate.executionPlan, "California Phase3 campaign execution plan binding");
  assertSha256(candidate.executionPlan.executionPlanSha256,
    "California Phase3 campaign execution plan");
  assertSha256(candidate.sealSha256, "California Phase3 campaign seal");
  const { sealSha256, ...base } = candidate;
  assert.equal(sealSha256, sha256(stableJson(base)),
    "California Phase3 campaign seal is not exactly derived");
  return candidate as CaliforniaSignatureFinalCompositorPhase3CampaignSeal;
}

type PublicationBrand = {
  directoryDescriptor: number;
  directoryIdentity: { dev: bigint; ino: bigint };
  receiptStreamFileSha256: string;
  sealFileSha256: string;
};

const publicationBrands = new WeakMap<
CaliforniaSignatureFinalCompositorPhase3CampaignPublication,
PublicationBrand>();

export async function executeCaliforniaSignatureFinalCompositorPhase3TestCampaign(options: {
  driver: CaliforniaSignatureFinalCompositorPhase3MeasurementDriver;
  nowMonotonicNs: () => bigint;
  producerIdentity: CaliforniaSignatureFinalCompositorPhase3ProducerIdentity;
  sourceReceipt: CaliforniaSignatureFinalCompositorPhase3CurrentSourceReceipt;
}): Promise<CaliforniaSignatureFinalCompositorPhase3CampaignPublication> {
  assertExactKeys(options, ["driver", "nowMonotonicNs", "producerIdentity", "sourceReceipt"],
    "California Phase3 internal campaign request");
  assertExactKeys(options.driver, ["runBaselineSample", "runCalibrationSample"],
    "California Phase3 internal measurement driver");
  assert.equal(typeof options.driver.runBaselineSample, "function",
    "California Phase3 baseline driver is absent");
  assert.equal(typeof options.driver.runCalibrationSample, "function",
    "California Phase3 calibration driver is absent");
  assert.equal(typeof options.nowMonotonicNs, "function",
    "California Phase3 producer-owned clock is absent");
  const producerIdentity = validateProducerIdentity(options.producerIdentity);
  const authoritative = readAuthoritativeCurrentSourceReceipt(options.sourceReceipt);
  const sourcePlan = deepFreeze(structuredClone(authoritative.sourcePlan));
  const executionPlan = bindCaliforniaSignatureFinalCompositorPhase3TestSourcePlan(
    options.sourceReceipt
  );
  const authenticatedGroups = sourcePlan.executionGroups.map((group) => deepFreeze({
    group,
    groupIdentitySha256: sha256(stableJson(group)),
    groupKey: group.groupKey
  }));
  const authenticatedClasses = executionPlan.classPlans.map((classPlan) => {
    const dimensionClass = deepFreeze({
      classId: classPlan.classId,
      cropCount: classPlan.cropCount,
      maximumDimensions: structuredClone(classPlan.maximumDimensions),
      projectName: classPlan.projectName,
      reviewedClassSha256: classPlan.reviewedClassSha256,
      reviewedPoliciesSha256: classPlan.reviewedPoliciesSha256
    } satisfies CaliforniaSignatureFinalCompositorClassCounter);
    return deepFreeze({
      classIdentitySha256: sha256(stableJson(dimensionClass)),
      dimensionClass
    });
  });
  assert.equal(producerIdentity.sourceSnapshotSha256, executionPlan.sourceSnapshotSha256,
    "California Phase3 producer source snapshot differs from its exact execution plan");
  assert.equal(realpathSync.native(WORKTREE_ROOT), WORKTREE_ROOT,
    "California Phase3 worktree path traverses a symlink");
  assert.equal(realpathSync.native(TEMPORARY_ROOT), TEMPORARY_ROOT,
    "California Phase3 .tmp path traverses a symlink");
  const directoryPath = mkdtempSync(path.join(TEMPORARY_ROOT,
    "california-phase3-measurement-campaign-"));
  chmodSync(directoryPath, 0o700);
  const directoryDescriptor = openSync(directoryPath,
    fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW);
  let success = false;
  let streamDescriptor: number | null = null;
  try {
    assertPrivateDirectory(directoryPath, directoryDescriptor);
    const streamFilePath = path.join(directoryPath, RECEIPT_STREAM_FILE_NAME);
    streamDescriptor = openSync(streamFilePath,
      fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL |
      fsConstants.O_NOFOLLOW,
      0o600);
    const streamHash = createHash("sha256");
    const sequenceHash = createHash("sha256");
    let streamByteCount = 0;
    let streamLineCount = 0;
    const publishMeasurementReceipt = (receiptWithoutSha: Record<string, unknown>) => {
      const measurementReceiptSha256 = sha256(stableJson(receiptWithoutSha));
      const receipt = { ...receiptWithoutSha, measurementReceiptSha256 };
      const line = canonicalReceiptLine(receipt);
      const written = writeSync(streamDescriptor!, line);
      assert.equal(written, line.length,
        "California Phase3 measurement receipt stream was partially written");
      streamHash.update(line);
      updateFramedHash(sequenceHash, measurementReceiptSha256);
      streamByteCount += line.length;
      assert.ok(Number.isSafeInteger(streamByteCount),
        "California Phase3 measurement receipt stream byte count overflowed");
      streamLineCount += 1;
    };

    for (const authenticatedGroup of authenticatedGroups) {
      const { group, groupIdentitySha256, groupKey } = authenticatedGroup;
      const measured = await measureSubject({
        nowMonotonicNs: options.nowMonotonicNs,
        run: ({ kind, ordinal }) => options.driver.runBaselineSample({ group, kind, ordinal }),
        validate: (value) => validateBaselineOutcome(value, group)
      });
      assert.equal(group.groupKey, groupKey,
        `${groupKey}: California Phase3 group key mutated after authentication`);
      assert.equal(californiaSignatureFinalCompositorGroupKey(group), groupKey,
        `${groupKey}: California Phase3 group identity mutated after authentication`);
      assert.equal(sha256(stableJson(group)), groupIdentitySha256,
        `${groupKey}: California Phase3 sealed execution-group payload mutated before receipt write`);
      publishMeasurementReceipt({
        executionPlanSha256: executionPlan.executionPlanSha256,
        finalCompositorExcluded: true,
        formalExecutionAuthorized: false,
        groupIdentitySha256,
        groupKey,
        kind: "baseline-group-v3",
        producerIdentitySha256: sha256(stableJson(producerIdentity)),
        samples: measured.samples,
        schemaVersion: PHASE3_SCHEMA_VERSION,
        stageSequence: BASELINE_STAGE_SEQUENCE,
        timingPolicySha256:
          CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY_SHA256,
        timingProcedureSha256:
          CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_TIMING_PROCEDURE_SHA256,
        upperBoundMs: measured.upperBoundMs
      });
    }
    for (const authenticatedClass of authenticatedClasses) {
      const { classIdentitySha256, dimensionClass } = authenticatedClass;
      const measured = await measureSubject({
        nowMonotonicNs: options.nowMonotonicNs,
        run: ({ kind, ordinal }) => options.driver.runCalibrationSample({
          dimensionClass,
          kind,
          ordinal
        }),
        validate: (value) => validateCalibrationOutcome(value, dimensionClass)
      });
      assert.equal(sha256(stableJson(dimensionClass)), classIdentitySha256,
        `${dimensionClass.classId}: California Phase3 authenticated class mutated before receipt write`);
      publishMeasurementReceipt({
        calibratedCropCount: 1,
        classIdentitySha256,
        classId: dimensionClass.classId,
        executionPlanSha256: executionPlan.executionPlanSha256,
        finalCompositorIncluded: true,
        formalExecutionAuthorized: false,
        kind: "compositor-class-calibration-v3",
        maximumDimensions: dimensionClass.maximumDimensions,
        producerIdentitySha256: sha256(stableJson(producerIdentity)),
        samples: measured.samples,
        schemaVersion: PHASE3_SCHEMA_VERSION,
        screenshotDecodeCompareRequired: true,
        sourceClassCropCount: dimensionClass.cropCount,
        timingPolicySha256:
          CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY_SHA256,
        timingProcedureSha256:
          CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_TIMING_PROCEDURE_SHA256,
        upperBoundMs: measured.upperBoundMs
      });
    }
    assert.equal(streamLineCount,
      CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE3_EXACT_COUNTERS.measurementReceiptCount,
    "California Phase3 campaign did not publish every baseline and calibration receipt");
    fsyncSync(streamDescriptor);
    closeSync(streamDescriptor);
    streamDescriptor = null;
    chmodSync(streamFilePath, 0o400);
    fsyncSync(directoryDescriptor);
    const streamFileSha256 = streamHash.digest("hex");
    const durableStreamDescriptor = openSync(streamFilePath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    try {
      const stats = fstatSync(durableStreamDescriptor, { bigint: true });
      assert.ok(stats.isFile() && stats.nlink === BigInt(1),
        "California Phase3 receipt stream is not one exclusive regular file");
      assert.equal(Number(stats.mode) & 0o777, 0o400,
        "California Phase3 receipt stream must remain mode 0400");
      assert.equal(Number(stats.size), streamByteCount,
        "California Phase3 receipt stream durable size drifted");
      const durableBytes = readFileSync(durableStreamDescriptor);
      assert.equal(sha256(durableBytes), streamFileSha256,
        "California Phase3 receipt stream durable SHA drifted");
    } finally {
      closeSync(durableStreamDescriptor);
    }
    const sealBase = {
      capacityAuthorization: {
        artifact24hPassed: false as const,
        blockers: CAPACITY_AUTHORIZATION_BLOCKERS,
        formal72hPassed: false as const,
        laneManifestReviewed: false as const,
        measurementReceiptsReviewed: false as const,
        runnerIntegrated: false as const
      },
      counters: CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE3_EXACT_COUNTERS,
      executionPlan,
      formalExecutionAuthorized: false as const,
      producerIdentity,
      producerIdentitySha256: sha256(stableJson(producerIdentity)),
      receiptSequenceSha256: sequenceHash.digest("hex"),
      receiptStream: {
        byteCount: streamByteCount,
        fileName: RECEIPT_STREAM_FILE_NAME,
        fileSha256: streamFileSha256,
        lineCount: streamLineCount
      },
      schemaVersion: PHASE3_SCHEMA_VERSION,
      status: "diagnostic-phase3-measurement-campaign" as const,
      timingPolicy: CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY,
      timingPolicySha256:
        CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY_SHA256,
      timingProcedureSha256:
        CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_TIMING_PROCEDURE_SHA256
    };
    const seal = validateCampaignSeal({
      ...sealBase,
      sealSha256: sha256(stableJson(sealBase))
    });
    const sealBytes = canonicalReceiptLine(seal);
    const sealPublication = publishReadOnlyFile({
      bytes: sealBytes,
      directoryDescriptor,
      directoryPath,
      fileName: SEAL_FILE_NAME
    });
    const directoryStats = fstatSync(directoryDescriptor, { bigint: true });
    const publication = Object.freeze({
      directoryPath,
      receiptStreamFilePath: streamFilePath,
      seal,
      sealFilePath: sealPublication.filePath,
      sealFileSha256: sealPublication.fileSha256
    });
    publicationBrands.set(publication, {
      directoryDescriptor,
      directoryIdentity: { dev: directoryStats.dev, ino: directoryStats.ino },
      receiptStreamFileSha256: streamFileSha256,
      sealFileSha256: sealPublication.fileSha256
    });
    success = true;
    return publication;
  } finally {
    if (streamDescriptor !== null) closeSync(streamDescriptor);
    if (!success) {
      closeSync(directoryDescriptor);
      rmSync(directoryPath, { force: true, recursive: true });
    }
  }
}

export function disposeCaliforniaSignatureFinalCompositorPhase3TestCampaign(
  publication: CaliforniaSignatureFinalCompositorPhase3CampaignPublication
): void {
  const brand = publicationBrands.get(publication);
  assert.ok(brand, "California Phase3 test tried to dispose an unbranded publication");
  publicationBrands.delete(publication);
  const directoryStats = fstatSync(brand.directoryDescriptor, { bigint: true });
  assert.deepEqual({ dev: directoryStats.dev, ino: directoryStats.ino },
    brand.directoryIdentity,
  "California Phase3 campaign directory changed before cleanup");
  assert.equal(sha256(readFileSync(publication.receiptStreamFilePath)),
    brand.receiptStreamFileSha256,
  "California Phase3 receipt stream changed before cleanup");
  assert.equal(sha256(readFileSync(publication.sealFilePath)), brand.sealFileSha256,
    "California Phase3 seal changed before cleanup");
  closeSync(brand.directoryDescriptor);
  chmodSync(publication.receiptStreamFilePath, 0o600);
  chmodSync(publication.sealFilePath, 0o600);
  rmSync(publication.directoryPath, { force: true, recursive: true });
}
