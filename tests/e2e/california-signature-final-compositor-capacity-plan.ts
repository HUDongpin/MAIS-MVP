import assert from "node:assert/strict";
import { createHash, type Hash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync
} from "node:fs";
import path from "node:path";
import ts from "typescript";
import {
  buildCaliforniaSignatureSourceExecutionGroups,
  iterateCaliforniaSignatureSourceOracleCanvasReceiptMatrix,
  type CaliforniaSignatureCanvasReceiptExpectation
} from "./california-signature-exhaustive-qa";
import type { CaliforniaSignatureSourceManifest } from
  "./california-signature-control-manifest";
import type { CaliforniaSignatureSourceExpectedEvidenceOracle } from
  "./california-signature-source-expected-provider";
import {
  assertCaliforniaCanvasGraphicsSourceContractFrozen,
  buildCaliforniaCanvasGraphicsSourceContract,
  type CaliforniaCanvasGraphicsSourceContract
} from
  "./california-canvas-graphics-source-contract";
import {
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY,
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY_SHA256,
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_TIMING_PROCEDURE_SHA256 as
    MEASUREMENT_TIMING_PROCEDURE_SHA256,
  assertCaliforniaSignatureFinalCompositorMeasurementEnvironmentIdentity,
  assertCaliforniaSignatureFinalCompositorValidatedMeasurementReceipt,
  calculateCaliforniaSignatureFinalCompositorMeasurementSubjectSha256,
  type CaliforniaSignatureFinalCompositorMeasurementEnvironmentIdentity,
  type CaliforniaSignatureFinalCompositorMeasurementSubject,
  type CaliforniaSignatureFinalCompositorRawTimingSample,
  type CaliforniaSignatureFinalCompositorReviewedMaximumDimensions,
  type CaliforniaSignatureFinalCompositorValidatedMeasurementReceipt
} from "./california-signature-final-compositor-measurement-lifecycle";

export const CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_CAPACITY_PLAN_SCHEMA_VERSION = 1;
export const CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_ARTIFACT_LIMIT_MS =
  24 * 60 * 60 * 1_000;
export const CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_FORMAL_LIMIT_MS =
  72 * 60 * 60 * 1_000;
export const CALIFORNIA_SIGNATURE_REVIEWED_FINAL_COMPOSITOR_DIMENSION_REGISTRY_SHA256 =
  "368ac8bcf4db390c684f17f57309692b1d63d15421b04fc98afc045b588f20c6";
export const CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_TIMING_PROCEDURE_SHA256 =
  MEASUREMENT_TIMING_PROCEDURE_SHA256;
export const CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_FORMAL_PROJECTS =
  ["desktop-chrome", "mobile-chrome"] as const;
export const CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_TERMINAL_ARTIFACT_TARGET = 102;

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

type CaliforniaSignatureFinalCompositorPhase =
  CaliforniaSignatureCanvasReceiptExpectation["phase"];

function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export type CaliforniaSignatureFinalCompositorSize = {
  height: number;
  width: number;
};

export type CaliforniaSignatureFinalCompositorSizeBounds = {
  maxHeight: number;
  maxWidth: number;
  minHeight: number;
  minWidth: number;
};

export type CaliforniaSignatureFinalCompositorProject = {
  axisIds: readonly string[];
  projectName: string;
};

export type CaliforniaSignatureFinalCompositorProjectDimensionPolicy =
  CaliforniaSignatureFinalCompositorProject & {
    deviceScaleFactor: number;
    viewport: CaliforniaSignatureFinalCompositorSize;
  };

export type CaliforniaSignatureFinalCompositorDimensionClass = {
  backingSizeBounds: CaliforniaSignatureFinalCompositorSizeBounds;
  classId: string;
  clipSizeBounds: CaliforniaSignatureFinalCompositorSizeBounds;
  cssSizeBounds: CaliforniaSignatureFinalCompositorSizeBounds;
  projectName: string;
  reviewedClassSha256: string;
};

export type CaliforniaSignatureFinalCompositorBindingDimensionPolicy = {
  bindingKey: string;
  classId: string;
  projectName: string;
  reviewedPolicySha256: string;
};

export type CaliforniaSignatureFinalCompositorGroupIdentity = {
  axisId: string;
  benchId: string;
  phase: CaliforniaSignatureFinalCompositorPhase;
  projectName: string;
};

export type CaliforniaSignatureFinalCompositorWorkUnit = {
  bindingKey: string;
  classId: string;
  dimensionClass: CaliforniaSignatureFinalCompositorDimensionClass;
  dimensionRegistrySha256: string;
  group: CaliforniaSignatureFinalCompositorGroupIdentity;
  groupKey: string;
  key: string;
  oracleRowKey: string;
  receiptCanvasCount: number;
  receiptKey: string;
  receiptOrdinal: number;
  reviewedClassSha256: string;
  reviewedPoliciesSha256: string;
  sourceSnapshotSha256: string;
  stateKey: string;
  unreviewedDiagnostic: boolean;
};

export type CaliforniaSignatureFinalCompositorClassCounter = {
  classId: string;
  cropCount: number;
  maximumDimensions: CaliforniaSignatureFinalCompositorReviewedMaximumDimensions;
  projectName: string;
  reviewedClassSha256: string;
  reviewedPoliciesSha256: string;
};

export type CaliforniaSignatureFinalCompositorGroupSummary =
  CaliforniaSignatureFinalCompositorGroupIdentity & {
    classCropCounts: readonly {
      classId: string;
      cropCount: number;
    }[];
    cropCount: number;
    groupKey: string;
    receiptCount: number;
  };

export type CaliforniaSignatureFinalCompositorProjectCounter = {
  cropCount: number;
  groupCount: number;
  projectName: string;
  receiptCount: number;
};

export type CaliforniaSignatureFinalCompositorExecutionProjectCounter =
  CaliforniaSignatureFinalCompositorProjectCounter & {
    evidenceRecordCount: number;
  };

export type CaliforniaSignatureFinalCompositorExecutionGroupSummary =
  CaliforniaSignatureFinalCompositorGroupIdentity & {
    classCropCounts: readonly {
      classId: string;
      cropCount: number;
    }[];
    cropCount: number;
    expectedRecordCount: number;
    groupKey: string;
    receiptCount: number;
  };

export type CaliforniaSignatureFinalCompositorSummary = {
  classes: readonly CaliforniaSignatureFinalCompositorClassCounter[];
  cropCount: number;
  dimensionRegistrySha256: string;
  groupCount: number;
  groups: readonly CaliforniaSignatureFinalCompositorGroupSummary[];
  projects: readonly CaliforniaSignatureFinalCompositorProjectCounter[];
  receiptCount: number;
  receiptsSha256: string;
  schemaVersion: typeof CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_CAPACITY_PLAN_SCHEMA_VERSION;
  summarySha256: string;
  sourceSnapshotSha256: string;
  unreviewedDiagnostic: boolean;
  workUnitsSha256: string;
};

export type CaliforniaSignatureReviewedFinalCompositorSourcePlan = {
  dimensionRegistry: ReturnType<
    typeof buildCaliforniaSignatureReviewedFinalCompositorDimensionRegistry
  >;
  executionGroups: readonly CaliforniaSignatureFinalCompositorExecutionGroupSummary[];
  sourceIdentity: CaliforniaSignatureFinalCompositorCapacitySourceIdentity;
  summary: CaliforniaSignatureFinalCompositorSummary;
};

export type CaliforniaSignatureFinalCompositorExpectedReceiptSequence = {
  receiptCount: number;
  receiptsSha256: string;
  sourceSnapshotSha256: string;
};

export type CaliforniaSignatureFinalCompositorCapacitySourceIdentity = {
  classes: readonly CaliforniaSignatureFinalCompositorClassCounter[];
  cropCount: number;
  dimensionRegistrySha256: string;
  groupCount: number;
  groupsSha256: string;
  evidenceRecordCount: number;
  formalContract: {
    projectNames: readonly string[];
    terminalArtifactTarget: number;
  };
  projects: readonly CaliforniaSignatureFinalCompositorExecutionProjectCounter[];
  receiptCount: number;
  receiptsSha256: string;
  sourceSnapshotSha256: string;
  summarySha256: string;
  unreviewedDiagnostic: boolean;
  workUnitsSha256: string;
};

export type CaliforniaSignatureFinalCompositorObservedDimensions = {
  backingSize: CaliforniaSignatureFinalCompositorSize;
  clipSize: CaliforniaSignatureFinalCompositorSize;
  cssSize: CaliforniaSignatureFinalCompositorSize;
  workUnitKey: string;
};

export type CaliforniaSignatureFinalCompositorWeightedGroup =
  CaliforniaSignatureFinalCompositorExecutionGroupSummary & {
    weightMs: number;
  };

export type CaliforniaSignatureFinalCompositorPackageProjectSlice = {
  groupKeys: readonly string[];
  projectName: string;
  weightMs: number;
};

export type CaliforniaSignatureFinalCompositorPackage = {
  packageId: string;
  projects: readonly CaliforniaSignatureFinalCompositorPackageProjectSlice[];
  slotIndex: number;
};

export type CaliforniaSignatureFinalCompositorPartitionPlan = {
  packages: readonly CaliforniaSignatureFinalCompositorPackage[];
  planSha256: string;
  projectNames: readonly string[];
  schemaVersion: typeof CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_CAPACITY_PLAN_SCHEMA_VERSION;
  slotCount: number;
  sourceIdentitySha256: string;
  terminalArtifactTarget: number;
};

export type CaliforniaSignatureFinalCompositorBaselineCoverage = {
  finalCompositorExcluded: boolean;
  hydrate: boolean;
  layout: boolean;
  navigation: boolean;
  realReset: boolean;
  replay: boolean;
};

export type CaliforniaSignatureFinalCompositorBaseline = {
  coverage: CaliforniaSignatureFinalCompositorBaselineCoverage;
  dimensionRegistrySha256: string;
  environment: CaliforniaSignatureFinalCompositorEnvironmentIdentity;
  groupKey: string;
  sourcePlanSha256: string;
  sourceSnapshotSha256: string;
  timingReceipt: CaliforniaSignatureFinalCompositorTimingReceipt;
  upperBoundMs: number;
  workUnitsSha256: string;
};

export type CaliforniaSignatureFinalCompositorEnvironmentIdentity =
  CaliforniaSignatureFinalCompositorMeasurementEnvironmentIdentity;

export type CaliforniaSignatureFinalCompositorCalibration = {
  classId: string;
  dimensionRegistrySha256: string;
  environment: CaliforniaSignatureFinalCompositorEnvironmentIdentity;
  maximumDimensions: CaliforniaSignatureFinalCompositorReviewedMaximumDimensions;
  reviewedClassSha256: string;
  reviewedPoliciesSha256: string;
  sourceClassCropCount: number;
  sourcePlanSha256: string;
  timingReceipt: CaliforniaSignatureFinalCompositorTimingReceipt;
  upperBoundMsPerCrop: number;
};

export type CaliforniaSignatureFinalCompositorTimingPolicy =
  typeof CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY;

export type CaliforniaSignatureFinalCompositorTimingSample =
  CaliforniaSignatureFinalCompositorRawTimingSample;

export type CaliforniaSignatureFinalCompositorTimingReceipt = {
  compositorImplementationSha256: string;
  dependencySha256: string;
  environmentSha256: string;
  measurementFileSha256: string;
  measurementReceiptSha256: string;
  measurementsSha256: string;
  policy: CaliforniaSignatureFinalCompositorTimingPolicy;
  policySha256: string;
  procedureSha256: typeof CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_TIMING_PROCEDURE_SHA256;
  receiptSha256: string;
  sourceBuildId: string;
  sourceBuildSha256: string;
  sourcePlanSha256: string;
  sourceSnapshotSha256: string;
  subjectSha256: string;
  upperBoundMs: number;
};

export type CaliforniaSignatureFinalCompositorArtifactForecast = {
  artifactKey: string;
  baselineUpperBoundMs: number;
  compositorCropCount: number;
  compositorUpperBoundMs: number;
  groupKeys: readonly string[];
  laneIndex: number;
  packageId: string;
  projectName: string;
  upperBoundMs: number;
};

export type CaliforniaSignatureFinalCompositorCapacityDecision = {
  artifactHeadroomMs: number;
  artifactLimitMs: typeof CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_ARTIFACT_LIMIT_MS;
  artifactForecasts: readonly CaliforniaSignatureFinalCompositorArtifactForecast[];
  baselineUpperBoundMs: number;
  compositorCropCount: number;
  compositorImplementationSha256: string;
  compositorUpperBoundMs: number;
  decisionSha256: string;
  environment: CaliforniaSignatureFinalCompositorEnvironmentIdentity;
  formalExecutionAuthorized: false;
  formalHeadroomMs: number;
  formalLimitMs: typeof CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_FORMAL_LIMIT_MS;
  issues: readonly string[];
  laneForecasts: readonly { laneIndex: number; upperBoundMs: number }[];
  makespanUpperBoundMs: number;
  measurementReceiptCount: number;
  measurementReceiptsSha256: string;
  passed: boolean;
  planSha256: string;
  schemaVersion: typeof CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_CAPACITY_PLAN_SCHEMA_VERSION;
  status: "capacity-bounds-rejected" | "capacity-bounds-satisfied";
};

export function calculateCaliforniaSignatureFinalCompositorPartitionPlanSha256(
  plan: Omit<CaliforniaSignatureFinalCompositorPartitionPlan, "planSha256">
) {
  return sha256(stableJson(plan));
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

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function updateFramedHash(hash: Hash, value: unknown) {
  const serialized = stableJson(value);
  hash.update(String(Buffer.byteLength(serialized, "utf8")));
  hash.update(":");
  hash.update(serialized);
  hash.update("\n");
}

function assertSafeIdentity(value: string, label: string) {
  assert.ok(typeof value === "string" && value.length > 0 && value.length <= 512,
    `${label} must be one non-empty bounded string`);
  assert.ok(!value.includes("\0"), `${label} must not contain a NUL delimiter`);
  return value;
}

function assertSha256(value: string, label: string) {
  assert.match(value, SHA256_PATTERN, `${label} must be one lowercase SHA-256`);
  return value;
}

function assertPositiveSafeInteger(value: number, label: string) {
  assert.ok(Number.isSafeInteger(value) && value > 0, `${label} must be one positive safe integer`);
  return value;
}

function assertNonNegativeSafeInteger(value: number, label: string) {
  assert.ok(Number.isSafeInteger(value) && value >= 0,
    `${label} must be one non-negative safe integer`);
  return value;
}

function checkedAdd(left: number, right: number, label: string) {
  assertNonNegativeSafeInteger(left, `${label} left operand`);
  assertNonNegativeSafeInteger(right, `${label} right operand`);
  const result = left + right;
  assert.ok(Number.isSafeInteger(result), `${label} addition overflowed safe integers`);
  return result;
}

function checkedMultiply(left: number, right: number, label: string) {
  assertNonNegativeSafeInteger(left, `${label} left operand`);
  assertNonNegativeSafeInteger(right, `${label} right operand`);
  const result = left * right;
  assert.ok(Number.isSafeInteger(result), `${label} multiplication overflowed safe integers`);
  return result;
}

function timingReceiptFromValidatedMeasurement(
  measurement: CaliforniaSignatureFinalCompositorValidatedMeasurementReceipt,
  subject: CaliforniaSignatureFinalCompositorMeasurementSubject
): CaliforniaSignatureFinalCompositorTimingReceipt {
  const measured = measurement.receipt;
  assert.equal(measured.policySha256,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY_SHA256,
  "California final compositor timing receipt does not use the fixed reviewed policy");
  const subjectSha256 = calculateCaliforniaSignatureFinalCompositorMeasurementSubjectSha256(
    subject);
  assert.equal(subjectSha256, measured.subjectSha256,
    "California final compositor timing subject differs from held-FD measurement receipt");
  assert.deepEqual(subject, measured.subject,
    "California final compositor timing subject fields differ from held-FD measurement receipt");
  const base = {
    compositorImplementationSha256: measured.compositorImplementationSha256,
    dependencySha256: measured.dependencySha256,
    environmentSha256: measured.environmentSha256,
    measurementFileSha256: measurement.fileSha256,
    measurementReceiptSha256: measured.receiptSha256,
    measurementsSha256: measured.measurementsSha256,
    policy: { ...measured.policy },
    policySha256: measured.policySha256,
    procedureSha256: CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_TIMING_PROCEDURE_SHA256,
    sourceBuildId: measured.sourceBuildId,
    sourceBuildSha256: measured.sourceBuildSha256,
    sourcePlanSha256: measured.sourcePlanSha256,
    sourceSnapshotSha256: measured.sourceSnapshotSha256,
    subjectSha256,
    upperBoundMs: measured.upperBoundMs
  } as const;
  return { ...base, receiptSha256: sha256(stableJson(base)) };
}

const timingReceiptBrands = new WeakMap<object, {
  fingerprint: string;
  measurement: CaliforniaSignatureFinalCompositorValidatedMeasurementReceipt;
}>();

export function buildCaliforniaSignatureFinalCompositorTimingReceipt(options: {
  measurement: CaliforniaSignatureFinalCompositorValidatedMeasurementReceipt;
  subject: CaliforniaSignatureFinalCompositorMeasurementSubject;
}): CaliforniaSignatureFinalCompositorTimingReceipt {
  assertCaliforniaSignatureFinalCompositorValidatedMeasurementReceipt(options.measurement);
  const receipt = timingReceiptFromValidatedMeasurement(options.measurement, options.subject);
  Object.freeze(receipt.policy);
  Object.freeze(receipt);
  timingReceiptBrands.set(receipt, {
    fingerprint: sha256(stableJson(receipt)),
    measurement: options.measurement
  });
  return receipt;
}

function assertCaliforniaSignatureFinalCompositorTimingReceipt(options: {
  environment: CaliforniaSignatureFinalCompositorEnvironmentIdentity;
  receipt: CaliforniaSignatureFinalCompositorTimingReceipt;
  subject: CaliforniaSignatureFinalCompositorMeasurementSubject;
}) {
  const brand = options.receipt && typeof options.receipt === "object"
    ? timingReceiptBrands.get(options.receipt)
    : undefined;
  assert.ok(brand,
    "California final compositor timing receipt lacks a held-FD validated measurement brand");
  assert.equal(brand.fingerprint, sha256(stableJson(options.receipt)),
    "California final compositor timing receipt changed after measurement validation");
  assertCaliforniaSignatureFinalCompositorValidatedMeasurementReceipt(brand.measurement);
  assertCaliforniaSignatureFinalCompositorMeasurementEnvironmentIdentity(options.environment);
  assert.deepEqual(brand.measurement.receipt.environment, options.environment,
    "California final compositor timing environment differs from its held-FD measurement");
  const rebuilt = timingReceiptFromValidatedMeasurement(brand.measurement, options.subject);
  assert.deepEqual(options.receipt, rebuilt,
    "California final compositor timing receipt is not an exact immutable measured receipt");
  return {
    compositorImplementationSha256: rebuilt.compositorImplementationSha256,
    measurementFileSha256: rebuilt.measurementFileSha256,
    measurementReceiptSha256: rebuilt.measurementReceiptSha256,
    measurementsSha256: rebuilt.measurementsSha256,
    subjectSha256: rebuilt.subjectSha256,
    upperBoundMs: rebuilt.upperBoundMs
  };
}

function assertBounds(bounds: CaliforniaSignatureFinalCompositorSizeBounds, label: string) {
  for (const [key, value] of Object.entries(bounds)) {
    assertPositiveSafeInteger(value, `${label}.${key}`);
  }
  assert.ok(bounds.minWidth <= bounds.maxWidth, `${label} width bounds are inverted`);
  assert.ok(bounds.minHeight <= bounds.maxHeight, `${label} height bounds are inverted`);
}

function reviewedMaximumDimensions(
  dimensionClass: CaliforniaSignatureFinalCompositorDimensionClass
): CaliforniaSignatureFinalCompositorReviewedMaximumDimensions {
  return {
    backingSize: {
      height: dimensionClass.backingSizeBounds.maxHeight,
      width: dimensionClass.backingSizeBounds.maxWidth
    },
    clipSize: {
      height: dimensionClass.clipSizeBounds.maxHeight,
      width: dimensionClass.clipSizeBounds.maxWidth
    },
    cssSize: {
      height: dimensionClass.cssSizeBounds.maxHeight,
      width: dimensionClass.cssSizeBounds.maxWidth
    }
  };
}

function assertReviewedMaximumDimensions(
  dimensions: CaliforniaSignatureFinalCompositorReviewedMaximumDimensions,
  label: string
) {
  assert.deepEqual(Object.keys(dimensions).sort(compareCodeUnits),
    ["backingSize", "clipSize", "cssSize"], `${label} surface keys drifted`);
  for (const [surface, size] of Object.entries(dimensions)) {
    assert.deepEqual(Object.keys(size).sort(compareCodeUnits), ["height", "width"],
      `${label}.${surface} keys drifted`);
    assertPositiveSafeInteger(size.height, `${label}.${surface}.height`);
    assertPositiveSafeInteger(size.width, `${label}.${surface}.width`);
  }
}

function policyKey(projectName: string, bindingKey: string) {
  return `${projectName}\0${bindingKey}`;
}

export function californiaSignatureFinalCompositorGroupKey(
  group: CaliforniaSignatureFinalCompositorGroupIdentity
) {
  assert.ok(group.phase === "functional" || group.phase === "layout" ||
    group.phase === "structural",
  "California final compositor group phase must be functional, layout, or structural");
  return [group.projectName, group.benchId, group.axisId, group.phase].map((value, index) =>
    assertSafeIdentity(value, `California final compositor group field ${index}`)
  ).join("\0");
}

function buildDimensionRegistry(options: {
  bindingPolicies: readonly CaliforniaSignatureFinalCompositorBindingDimensionPolicy[];
  dimensionClasses: readonly CaliforniaSignatureFinalCompositorDimensionClass[];
  projects: readonly CaliforniaSignatureFinalCompositorProject[];
}) {
  assert.ok(options.projects.length > 0, "California final compositor project registry is empty");
  const projectByName = new Map<string, CaliforniaSignatureFinalCompositorProject>();
  const projectByAxis = new Map<string, string>();
  for (const project of options.projects) {
    const projectName = assertSafeIdentity(project.projectName,
      "California final compositor projectName");
    assert.ok(!projectByName.has(projectName),
      `California final compositor project registry repeats ${projectName}`);
    assert.ok(project.axisIds.length > 0, `${projectName}: project has no independently owned axes`);
    projectByName.set(projectName, {
      axisIds: [...project.axisIds],
      projectName
    });
    for (const axisId of project.axisIds) {
      assertSafeIdentity(axisId, `${projectName}: axisId`);
      assert.ok(!projectByAxis.has(axisId),
        `California final compositor project axes repeat ${axisId}`);
      projectByAxis.set(axisId, projectName);
    }
  }

  assert.ok(options.dimensionClasses.length > 0,
    "California final compositor dimension class registry is empty");
  const classById = new Map<string, CaliforniaSignatureFinalCompositorDimensionClass>();
  for (const dimensionClass of options.dimensionClasses) {
    const classId = assertSafeIdentity(dimensionClass.classId,
      "California final compositor dimension classId");
    const projectName = assertSafeIdentity(dimensionClass.projectName,
      `${classId}: dimension class projectName`);
    assert.ok(projectByName.has(projectName),
      `${classId}: dimension class cites unknown project ${projectName}`);
    assert.ok(!classById.has(classId),
      `California final compositor dimension class registry repeats ${classId}`);
    assertSha256(dimensionClass.reviewedClassSha256, `${classId}: reviewed class identity`);
    assertBounds(dimensionClass.backingSizeBounds, `${classId}: backingSizeBounds`);
    assertBounds(dimensionClass.clipSizeBounds, `${classId}: clipSizeBounds`);
    assertBounds(dimensionClass.cssSizeBounds, `${classId}: cssSizeBounds`);
    classById.set(classId, structuredClone(dimensionClass));
  }

  assert.ok(options.bindingPolicies.length > 0,
    "California final compositor reviewed binding dimension policy registry is empty");
  const policyByKey = new Map<string, CaliforniaSignatureFinalCompositorBindingDimensionPolicy>();
  for (const policy of options.bindingPolicies) {
    const bindingKey = assertSafeIdentity(policy.bindingKey,
      "California final compositor dimension policy bindingKey");
    const projectName = assertSafeIdentity(policy.projectName,
      `${bindingKey}: dimension policy projectName`);
    const classId = assertSafeIdentity(policy.classId,
      `${projectName}/${bindingKey}: dimension policy classId`);
    assertSha256(policy.reviewedPolicySha256,
      `${projectName}/${bindingKey}: reviewed dimension policy identity`);
    assert.ok(projectByName.has(projectName),
      `${projectName}/${bindingKey}: dimension policy cites unknown project`);
    const dimensionClass = classById.get(classId);
    assert.ok(dimensionClass,
      `${projectName}/${bindingKey}: dimension policy cites unknown dimension class ${classId}`);
    assert.equal(dimensionClass.projectName, projectName,
      `${projectName}/${bindingKey}: dimension policy class belongs to another project`);
    const key = policyKey(projectName, bindingKey);
    assert.ok(!policyByKey.has(key),
      `California final compositor duplicate reviewed dimension policy ${projectName}/${bindingKey}`);
    policyByKey.set(key, { ...policy });
  }

  const canonical = {
    bindingPolicies: [...policyByKey.values()].sort((left, right) =>
      compareCodeUnits(
        policyKey(left.projectName, left.bindingKey),
        policyKey(right.projectName, right.bindingKey)
      )
    ),
    dimensionClasses: [...classById.values()].sort((left, right) =>
      compareCodeUnits(left.classId, right.classId)
    ),
    projects: [...projectByName.values()].sort((left, right) =>
      compareCodeUnits(left.projectName, right.projectName)
    )
  };
  const reviewedPoliciesSha256ByClass = new Map<string, string>();
  for (const dimensionClass of canonical.dimensionClasses) {
    reviewedPoliciesSha256ByClass.set(dimensionClass.classId, sha256(stableJson(
      canonical.bindingPolicies.filter((policy) => policy.classId === dimensionClass.classId)
    )));
  }
  return {
    classById,
    dimensionRegistrySha256: sha256(stableJson(canonical)),
    policyByKey,
    projectByAxis,
    reviewedPoliciesSha256ByClass
  };
}

export function calculateCaliforniaSignatureFinalCompositorDimensionRegistrySha256(options: {
  bindingPolicies: readonly CaliforniaSignatureFinalCompositorBindingDimensionPolicy[];
  dimensionClasses: readonly CaliforniaSignatureFinalCompositorDimensionClass[];
  projects: readonly CaliforniaSignatureFinalCompositorProject[];
}) {
  return buildDimensionRegistry(options).dimensionRegistrySha256;
}

function assertSourceFileIdentity(options: {
  expectedSha256: string;
  projectRoot: string;
  sourcePath: string;
}) {
  const absoluteProjectRoot = path.resolve(options.projectRoot);
  const absoluteSourcePath = path.resolve(absoluteProjectRoot, options.sourcePath);
  const relative = path.relative(absoluteProjectRoot, absoluteSourcePath);
  assert.ok(relative && relative !== ".." && !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative), `${options.sourcePath}: Canvas sizing source escapes project root`);
  const beforePathIdentity = lstatSync(absoluteSourcePath, { bigint: true });
  assert.ok(beforePathIdentity.isFile() && !beforePathIdentity.isSymbolicLink() &&
    beforePathIdentity.nlink === BigInt(1),
    `${options.sourcePath}: Canvas sizing source must be one regular non-symlink, non-hardlinked file`);
  assert.equal(realpathSync(absoluteSourcePath), absoluteSourcePath,
    `${options.sourcePath}: Canvas sizing source traverses a symlink`);
  const fd = openSync(absoluteSourcePath,
    fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  let source: string;
  try {
    const beforeFdIdentity = fstatSync(fd, { bigint: true });
    assert.ok(beforeFdIdentity.isFile() && beforeFdIdentity.nlink === BigInt(1),
      `${options.sourcePath}: opened Canvas sizing source is not one regular single-link file`);
    assert.equal(beforeFdIdentity.dev, beforePathIdentity.dev,
      `${options.sourcePath}: Canvas sizing source device changed before held-FD read`);
    assert.equal(beforeFdIdentity.ino, beforePathIdentity.ino,
      `${options.sourcePath}: Canvas sizing source inode changed before held-FD read`);
    source = readFileSync(fd, "utf8");
    const afterFdIdentity = fstatSync(fd, { bigint: true });
    assert.equal(afterFdIdentity.dev, beforeFdIdentity.dev,
      `${options.sourcePath}: held Canvas sizing source device changed during read`);
    assert.equal(afterFdIdentity.ino, beforeFdIdentity.ino,
      `${options.sourcePath}: held Canvas sizing source inode changed during read`);
    assert.equal(afterFdIdentity.size, beforeFdIdentity.size,
      `${options.sourcePath}: held Canvas sizing source size changed during read`);
    assert.equal(afterFdIdentity.mtimeNs, beforeFdIdentity.mtimeNs,
      `${options.sourcePath}: held Canvas sizing source mtime changed during read`);
    assert.equal(afterFdIdentity.ctimeNs, beforeFdIdentity.ctimeNs,
      `${options.sourcePath}: held Canvas sizing source ctime changed during read`);
    assert.equal(afterFdIdentity.nlink, BigInt(1),
      `${options.sourcePath}: held Canvas sizing source gained another link during read`);
    const afterPathIdentity = lstatSync(absoluteSourcePath, { bigint: true });
    assert.ok(afterPathIdentity.isFile() && !afterPathIdentity.isSymbolicLink() &&
      afterPathIdentity.nlink === BigInt(1),
    `${options.sourcePath}: Canvas sizing source path changed type after held-FD read`);
    assert.equal(afterPathIdentity.dev, beforeFdIdentity.dev,
      `${options.sourcePath}: Canvas sizing source path device changed during read`);
    assert.equal(afterPathIdentity.ino, beforeFdIdentity.ino,
      `${options.sourcePath}: Canvas sizing source path inode changed during read`);
  } finally {
    closeSync(fd);
  }
  assert.equal(sha256(source), options.expectedSha256,
    `${options.sourcePath}: Canvas sizing source bytes differ from the frozen source contract`);
  return source;
}

export function deriveCaliforniaCanvasSourceBackingScaleCap(
  source: string,
  sourcePath: string
) {
  const sourceFile = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JSX
  );
  const parseDiagnostics = (sourceFile as ts.SourceFile & {
    parseDiagnostics?: readonly ts.Diagnostic[];
  }).parseDiagnostics ?? [];
  assert.equal(parseDiagnostics.length, 0,
    `${sourcePath}: Canvas sizing source has syntax diagnostics`);
  const matches: number[] = [];
  let dprDeclarationCount = 0;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) &&
        node.name.text === "dpr") {
      dprDeclarationCount += 1;
      assert.ok(node.initializer,
        `${sourcePath}: Canvas dpr declaration has no exact bounded initializer`);
      const declarationList = node.parent;
      assert.ok(ts.isVariableDeclarationList(declarationList) &&
        (declarationList.flags & ts.NodeFlags.Const) !== 0,
      `${sourcePath}: Canvas dpr declaration must be immutable const`);
      const exact = node.initializer.getText(sourceFile).match(
        /^Math\.min\(\s*window\.devicePixelRatio\s*\|\|\s*1\s*,\s*([0-9]+(?:\.[0-9]+)?)\s*\)$/
      );
      assert.ok(exact,
        `${sourcePath}: Canvas dpr declaration has no exact bounded devicePixelRatio policy`);
      matches.push(Number(exact[1]));
    }
    if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
        ts.isIdentifier(node.operand) && node.operand.text === "dpr") {
      assert.fail(`${sourcePath}: Canvas dpr declaration is mutated after review`);
    }
    if (ts.isBinaryExpression(node) && ts.isIdentifier(node.left) &&
        node.left.text === "dpr" &&
        node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
        node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
      assert.fail(`${sourcePath}: Canvas dpr declaration is reassigned after review`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  assert.ok(dprDeclarationCount > 0 && matches.length === dprDeclarationCount,
    `${sourcePath}: Canvas source has no exact bounded devicePixelRatio policy in a dpr declaration`);
  const unique = [...new Set(matches)];
  assert.equal(unique.length, 1,
    `${sourcePath}: Canvas source mixes multiple devicePixelRatio caps`);
  const cap = unique[0]!;
  assert.ok(Number.isFinite(cap) && cap >= 1 && cap <= 4,
    `${sourcePath}: Canvas source devicePixelRatio cap is outside the reviewed 1..4 range`);
  return cap;
}

function assertCanvasBackingAssignmentsUseSourceDpr(options: {
  canvasAliases: ReadonlySet<string>;
  expectedCanvasCount: number;
  source: string;
  sourcePath: string;
}) {
  const sourceFile = ts.createSourceFile(
    options.sourcePath,
    options.source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JSX
  );
  const assignments: Record<"height" | "width", string[]> = { height: [], width: [] };
  const dprDeclarationsByScope = new Map<ts.Node, ts.VariableDeclaration[]>();
  const isLexicalFunctionScope = (node: ts.Node) =>
    ts.isArrowFunction(node) || ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) || ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) || ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node);
  const lexicalScope = (node: ts.Node): ts.Node => {
    let current: ts.Node | undefined = node;
    while (current && !ts.isSourceFile(current) && !isLexicalFunctionScope(current)) {
      current = current.parent;
    }
    assert.ok(current, `${options.sourcePath}: Canvas sizing node lost its lexical scope`);
    return current;
  };
  const collectDprDeclarations = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) &&
        node.name.text === "dpr") {
      const scope = lexicalScope(node);
      const declarations = dprDeclarationsByScope.get(scope) ?? [];
      declarations.push(node);
      dprDeclarationsByScope.set(scope, declarations);
    }
    ts.forEachChild(node, collectDprDeclarations);
  };
  collectDprDeclarations(sourceFile);
  const assertExactLexicalDpr = (node: ts.Node, label: string) => {
    const declarations = dprDeclarationsByScope.get(lexicalScope(node)) ?? [];
    assert.equal(declarations.length, 1,
      `${options.sourcePath}: ${label} must resolve one exact lexical dpr declaration`);
    assert.ok(declarations[0]!.getStart(sourceFile) < node.getStart(sourceFile),
      `${options.sourcePath}: ${label} precedes its reviewed lexical dpr declaration`);
  };
  let setTransformCount = 0;
  const visit = (node: ts.Node) => {
    if (ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isPropertyAccessExpression(node.left) &&
        ts.isIdentifier(node.left.expression) &&
        options.canvasAliases.has(node.left.expression.text) &&
        (node.left.name.text === "width" || node.left.name.text === "height")) {
      const property = node.left.name.text;
      const expression = node.right.getText(sourceFile);
      assertExactLexicalDpr(node, `Canvas ${property} assignment`);
      assignments[property].push(expression);
      assert.match(expression,
        /^Math\.round\([\s\S]+\*\s*dpr\)$/,
        `${options.sourcePath}: Canvas ${property} is not derived through the exact reviewed dpr cap`);
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "setTransform") {
      const argumentsText = node.arguments.map((argument) => argument.getText(sourceFile));
      if (argumentsText.length === 6 && argumentsText[0] === "dpr" &&
          argumentsText[1] === "0" && argumentsText[2] === "0" &&
          argumentsText[3] === "dpr" && argumentsText[4] === "0" &&
          argumentsText[5] === "0") {
        assertExactLexicalDpr(node, "Canvas setTransform");
        setTransformCount += 1;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  assert.equal(assignments.width.length, options.expectedCanvasCount,
    `${options.sourcePath}: Canvas width assignments do not match source bindings`);
  assert.equal(assignments.height.length, options.expectedCanvasCount,
    `${options.sourcePath}: Canvas height assignments do not match source bindings`);
  assert.equal(setTransformCount, options.expectedCanvasCount,
    `${options.sourcePath}: Canvas setTransform calls do not match source bindings`);
}

export function buildCaliforniaSignatureReviewedFinalCompositorDimensionRegistry(options: {
  canvasContract: CaliforniaCanvasGraphicsSourceContract;
  projectDimensionPolicies: readonly CaliforniaSignatureFinalCompositorProjectDimensionPolicy[];
  projectRoot?: string;
}) {
  assert.deepEqual(options.projectDimensionPolicies.map((project) => project.projectName),
    [...CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_FORMAL_PROJECTS],
  "California reviewed final compositor formal project order drifted");
  const projectRoot = options.projectRoot ?? process.cwd();
  const rebuiltCanvasContract = buildCaliforniaCanvasGraphicsSourceContract(projectRoot);
  assertCaliforniaCanvasGraphicsSourceContractFrozen(rebuiltCanvasContract);
  assert.deepEqual(options.canvasContract, rebuiltCanvasContract,
    "California reviewed final compositor Canvas contract payload differs from current frozen source");
  assert.ok(options.canvasContract.bindings.length > 0,
    "California reviewed final compositor registry has no source Canvas bindings");
  assert.equal(options.canvasContract.apiCensus.canvasPropertyWrites.width,
    options.canvasContract.bindings.length,
    "California reviewed final compositor registry requires one source width write per Canvas binding");
  assert.equal(options.canvasContract.apiCensus.canvasPropertyWrites.height,
    options.canvasContract.bindings.length,
    "California reviewed final compositor registry requires one source height write per Canvas binding");
  const sourceContractByPath = new Map(options.canvasContract.sources.map((source) => [
    source.sourcePath,
    source
  ]));
  assert.equal(sourceContractByPath.size, options.canvasContract.sources.length,
    "California reviewed final compositor registry repeats a frozen source path");
  const capBySourcePath = new Map<string, number>();
  for (const [sourcePath, sourceIdentity] of sourceContractByPath) {
    const source = assertSourceFileIdentity({
      expectedSha256: sourceIdentity.sourceSha256,
      projectRoot,
      sourcePath
    });
    capBySourcePath.set(sourcePath,
      deriveCaliforniaCanvasSourceBackingScaleCap(source, sourcePath));
    const bindings = options.canvasContract.bindings.filter((binding) =>
      binding.sourcePath === sourcePath
    );
    assertCanvasBackingAssignmentsUseSourceDpr({
      canvasAliases: new Set(bindings.map((binding) => binding.canvasAlias)),
      expectedCanvasCount: bindings.length,
      source,
      sourcePath
    });
  }

  const projectNames = new Set<string>();
  for (const project of options.projectDimensionPolicies) {
    assertSafeIdentity(project.projectName,
      "California reviewed final compositor project dimension policy projectName");
    assert.ok(!projectNames.has(project.projectName),
      `California reviewed final compositor project dimension policy repeats ${project.projectName}`);
    projectNames.add(project.projectName);
    assert.ok(Number.isFinite(project.deviceScaleFactor) && project.deviceScaleFactor >= 1 &&
      project.deviceScaleFactor <= 4,
    `${project.projectName}: formal deviceScaleFactor is outside the reviewed 1..4 range`);
    assertPositiveSafeInteger(project.viewport.width,
      `${project.projectName}: formal viewport width`);
    assertPositiveSafeInteger(project.viewport.height,
      `${project.projectName}: formal viewport height`);
  }
  assert.ok(projectNames.size > 0,
    "California reviewed final compositor registry has no formal projects");

  const bindingCaps = options.canvasContract.bindings.map((binding) => {
    const backingScaleCap = capBySourcePath.get(binding.sourcePath);
    assert.ok(backingScaleCap !== undefined,
      `${binding.key}: Canvas binding has no frozen source sizing policy`);
    return { backingScaleCap, binding };
  });
  const usedCaps = [...new Set(bindingCaps.map((row) => row.backingScaleCap))]
    .sort((left, right) => left - right);
  const dimensionClasses: CaliforniaSignatureFinalCompositorDimensionClass[] = [];
  for (const project of options.projectDimensionPolicies) {
    for (const backingScaleCap of usedCaps) {
      const effectiveScale = Math.min(project.deviceScaleFactor, backingScaleCap);
      const classId = `${project.projectName}-source-dpr-cap-${String(backingScaleCap).replace(".", "_")}`;
      const base = {
        backingSizeBounds: {
          maxHeight: Math.round(project.viewport.height * effectiveScale),
          maxWidth: Math.round(project.viewport.width * effectiveScale),
          minHeight: 1,
          minWidth: 1
        },
        classId,
        clipSizeBounds: {
          maxHeight: project.viewport.height,
          maxWidth: project.viewport.width,
          minHeight: 1,
          minWidth: 1
        },
        cssSizeBounds: {
          maxHeight: project.viewport.height,
          maxWidth: project.viewport.width,
          minHeight: 1,
          minWidth: 1
        },
        policy: "source-dpr-cap-within-formal-viewport-v1",
        project: {
          axisIds: [...project.axisIds],
          deviceScaleFactor: project.deviceScaleFactor,
          projectName: project.projectName,
          viewport: { ...project.viewport }
        },
        sourceContractSha256: options.canvasContract.contractSha256,
        sourceSha256: options.canvasContract.sourceSha256
      } as const;
      dimensionClasses.push({
        backingSizeBounds: base.backingSizeBounds,
        classId,
        clipSizeBounds: base.clipSizeBounds,
        cssSizeBounds: base.cssSizeBounds,
        projectName: project.projectName,
        reviewedClassSha256: sha256(stableJson(base))
      });
    }
  }
  const classIdByProjectAndCap = new Map(dimensionClasses.map((dimensionClass) => {
    const suffix = dimensionClass.classId.match(/-source-dpr-cap-([0-9_]+)$/)?.[1];
    assert.ok(suffix, `${dimensionClass.classId}: reviewed dimension class lost its DPR cap`);
    return [`${dimensionClass.projectName}\0${suffix.replace("_", ".")}`, dimensionClass.classId];
  }));
  const bindingPolicies = options.projectDimensionPolicies.flatMap((project) =>
    bindingCaps.map(({ backingScaleCap, binding }) => {
      const classId = classIdByProjectAndCap.get(
        `${project.projectName}\0${backingScaleCap}`
      );
      assert.ok(classId,
        `${project.projectName}/${binding.key}: reviewed dimension class is missing`);
      return {
        bindingKey: binding.key,
        classId,
        projectName: project.projectName,
        reviewedPolicySha256: sha256(stableJson({
          backingScaleCap,
          binding,
          classId,
          policy: "source-dpr-cap-within-formal-viewport-v1",
          project,
          sourceContractSha256: options.canvasContract.contractSha256,
          sourceSha256: options.canvasContract.sourceSha256
        }))
      };
    })
  ).sort((left, right) => compareCodeUnits(
    policyKey(left.projectName, left.bindingKey),
    policyKey(right.projectName, right.bindingKey)
  ));
  dimensionClasses.sort((left, right) => compareCodeUnits(left.classId, right.classId));
  const projects = options.projectDimensionPolicies.map((project) => ({
    axisIds: [...project.axisIds],
    projectName: project.projectName
  }));
  const registry = { bindingPolicies, dimensionClasses, projects };
  const dimensionRegistrySha256 =
    calculateCaliforniaSignatureFinalCompositorDimensionRegistrySha256(registry);
  assert.equal(
    dimensionRegistrySha256,
    CALIFORNIA_SIGNATURE_REVIEWED_FINAL_COMPOSITOR_DIMENSION_REGISTRY_SHA256,
    "California reviewed final compositor dimension registry drifted"
  );
  return {
    ...registry,
    dimensionRegistrySha256,
    sourceContractSha256: options.canvasContract.contractSha256,
    sourceSha256: options.canvasContract.sourceSha256,
    unreviewedDiagnostic: false as const
  };
}

function canonicalReceiptTransition(receipt: CaliforniaSignatureCanvasReceiptExpectation) {
  assertSafeIdentity(receipt.key, "California final compositor receipt key");
  assertSha256(receipt.oracleRowKey,
    `${receipt.key}: California final compositor oracle row key`);
  assertSafeIdentity(receipt.stateKey, `${receipt.key}: stateKey`);
  assertSafeIdentity(receipt.axisId, `${receipt.key}: axisId`);
  assertSafeIdentity(receipt.benchId, `${receipt.key}: benchId`);
  assert.equal(receipt.surfaceKey, "signature-canvas",
    `${receipt.key}: final compositor receipt cites a non-Canvas surface`);
  assertPositiveSafeInteger(receipt.canvasCount, `${receipt.key}: Canvas count`);
  assert.equal(receipt.canvasCount, receipt.bindingKeys.length,
    `${receipt.key}: Canvas count differs from binding cardinality`);
  assert.equal(new Set(receipt.bindingKeys).size, receipt.bindingKeys.length,
    `${receipt.key}: duplicate Canvas binding in source receipt`);
  const bindingKeys = [...receipt.bindingKeys].sort(compareCodeUnits);
  for (const bindingKey of bindingKeys) {
    assertSafeIdentity(bindingKey, `${receipt.key}: Canvas bindingKey`);
  }
  return {
    axisId: receipt.axisId,
    benchId: receipt.benchId,
    bindingKeys,
    canvasCount: receipt.canvasCount,
    key: receipt.key,
    oracleRowKey: receipt.oracleRowKey,
    phase: receipt.phase,
    stateKey: receipt.stateKey,
    surfaceKey: receipt.surfaceKey
  };
}

export function deriveCaliforniaSignatureFinalCompositorExpectedReceiptSequence(options: {
  receipts: Iterable<CaliforniaSignatureCanvasReceiptExpectation>;
  sourceSnapshotSha256: string;
}): CaliforniaSignatureFinalCompositorExpectedReceiptSequence {
  assertSha256(options.sourceSnapshotSha256,
    "California final compositor expected receipt source snapshot");
  const hash = createHash("sha256");
  let receiptCount = 0;
  for (const receipt of options.receipts) {
    updateFramedHash(hash, canonicalReceiptTransition(receipt));
    receiptCount += 1;
    assert.ok(Number.isSafeInteger(receiptCount),
      "California final compositor expected receipt count overflowed");
  }
  assert.ok(receiptCount > 0,
    "California final compositor expected receipt sequence is empty");
  return {
    receiptCount,
    receiptsSha256: hash.digest("hex"),
    sourceSnapshotSha256: options.sourceSnapshotSha256
  };
}

export function* iterateCaliforniaSignatureFinalCompositorWorkUnits(options: {
  bindingPolicies: readonly CaliforniaSignatureFinalCompositorBindingDimensionPolicy[];
  dimensionClasses: readonly CaliforniaSignatureFinalCompositorDimensionClass[];
  expectedDimensionRegistrySha256: string | null;
  projects: readonly CaliforniaSignatureFinalCompositorProject[];
  receipts: Iterable<CaliforniaSignatureCanvasReceiptExpectation>;
  sourceSnapshotSha256: string;
  unreviewedDiagnostic: boolean;
}): Generator<CaliforniaSignatureFinalCompositorWorkUnit> {
  const registry = buildDimensionRegistry(options);
  assertSha256(options.sourceSnapshotSha256,
    "California final compositor source snapshot identity");
  assert.equal(typeof options.unreviewedDiagnostic, "boolean",
    "California final compositor diagnostic disposition must be explicit");
  if (options.unreviewedDiagnostic) {
    assert.equal(options.expectedDimensionRegistrySha256, null,
      "unreviewed diagnostic registry must not present a reviewed dimension registry receipt");
  } else {
    assert.ok(options.expectedDimensionRegistrySha256,
      "reviewed dimension registry receipt is required for capacity work units");
    assertSha256(options.expectedDimensionRegistrySha256,
      "California final compositor reviewed dimension registry receipt");
    assert.equal(registry.dimensionRegistrySha256, options.expectedDimensionRegistrySha256,
      "California final compositor reviewed dimension registry digest mismatched its exact policy registry");
  }
  const usedPolicies = new Set<string>();
  const usedClasses = new Set<string>();
  let receiptOrdinal = 0;
  for (const receipt of options.receipts) {
    const canonicalReceipt = canonicalReceiptTransition(receipt);
    const projectName = registry.projectByAxis.get(receipt.axisId);
    assert.ok(projectName,
      `${receipt.key}: unknown project axis ${receipt.axisId}`);
    const group: CaliforniaSignatureFinalCompositorGroupIdentity = {
      axisId: receipt.axisId,
      benchId: receipt.benchId,
      phase: receipt.phase,
      projectName
    };
    const groupKey = californiaSignatureFinalCompositorGroupKey(group);
    const bindingKeys = canonicalReceipt.bindingKeys;
    for (const bindingKey of bindingKeys) {
      assertSafeIdentity(bindingKey, `${receipt.key}: Canvas bindingKey`);
      const exactPolicyKey = policyKey(projectName, bindingKey);
      const policy = registry.policyByKey.get(exactPolicyKey);
      assert.ok(policy,
        `${receipt.key}: missing reviewed dimension policy for ${projectName}/${bindingKey}`);
      const dimensionClass = registry.classById.get(policy.classId);
      assert.ok(dimensionClass,
        `${receipt.key}: unknown dimension class ${policy.classId} for ${projectName}/${bindingKey}`);
      usedPolicies.add(exactPolicyKey);
      usedClasses.add(dimensionClass.classId);
      const identity = {
        bindingKey,
        classId: dimensionClass.classId,
        groupKey,
        oracleRowKey: receipt.oracleRowKey,
        receiptKey: receipt.key,
        stateKey: receipt.stateKey
      };
      yield {
        ...identity,
        dimensionClass,
        dimensionRegistrySha256: registry.dimensionRegistrySha256,
        group,
        key: sha256(stableJson(identity)),
        receiptCanvasCount: receipt.canvasCount,
        receiptOrdinal,
        reviewedClassSha256: dimensionClass.reviewedClassSha256,
        reviewedPoliciesSha256:
          registry.reviewedPoliciesSha256ByClass.get(dimensionClass.classId)!,
        sourceSnapshotSha256: options.sourceSnapshotSha256,
        unreviewedDiagnostic: options.unreviewedDiagnostic
      };
    }
    receiptOrdinal += 1;
    assert.ok(Number.isSafeInteger(receiptOrdinal),
      "California final compositor receipt ordinal overflowed");
  }
  const extraPolicies = [...registry.policyByKey.keys()].filter((key) => !usedPolicies.has(key));
  assert.deepEqual(extraPolicies, [],
    `California final compositor extra reviewed dimension policies: ${extraPolicies.join(",")}`);
  const extraClasses = [...registry.classById.keys()].filter((classId) => !usedClasses.has(classId));
  assert.deepEqual(extraClasses, [],
    `California final compositor extra reviewed dimension classes: ${extraClasses.join(",")}`);
}

export function* iterateCaliforniaSignatureSourceFinalCompositorWorkUnits(options: {
  bindingPolicies: readonly CaliforniaSignatureFinalCompositorBindingDimensionPolicy[];
  dimensionClasses: readonly CaliforniaSignatureFinalCompositorDimensionClass[];
  expectedDimensionRegistrySha256: string | null;
  manifest: CaliforniaSignatureSourceManifest;
  oracle: CaliforniaSignatureSourceExpectedEvidenceOracle;
  projects: readonly CaliforniaSignatureFinalCompositorProject[];
  sourceSnapshotSha256: string;
  unreviewedDiagnostic: boolean;
}): Generator<CaliforniaSignatureFinalCompositorWorkUnit> {
  yield* iterateCaliforniaSignatureFinalCompositorWorkUnits({
    bindingPolicies: options.bindingPolicies,
    dimensionClasses: options.dimensionClasses,
    expectedDimensionRegistrySha256: options.expectedDimensionRegistrySha256,
    projects: options.projects,
    receipts: iterateCaliforniaSignatureSourceOracleCanvasReceiptMatrix({
      manifest: options.manifest,
      oracle: options.oracle
    }),
    sourceSnapshotSha256: options.sourceSnapshotSha256,
    unreviewedDiagnostic: options.unreviewedDiagnostic
  });
}

function assertSizeWithinBounds(
  size: CaliforniaSignatureFinalCompositorSize,
  bounds: CaliforniaSignatureFinalCompositorSizeBounds,
  label: string
) {
  assertPositiveSafeInteger(size.width, `${label}.width`);
  assertPositiveSafeInteger(size.height, `${label}.height`);
  assert.ok(size.width >= bounds.minWidth && size.width <= bounds.maxWidth &&
    size.height >= bounds.minHeight && size.height <= bounds.maxHeight,
  `${label} is outside reviewed final compositor dimension class bounds`);
}

export function assertCaliforniaSignatureObservedFinalCompositorDimensions(options: {
  observation: CaliforniaSignatureFinalCompositorObservedDimensions;
  workUnit: CaliforniaSignatureFinalCompositorWorkUnit;
}) {
  assert.equal(options.observation.workUnitKey, options.workUnit.key,
    "observed final compositor dimensions cite another expected work unit");
  const dimensionClass = options.workUnit.dimensionClass;
  assert.equal(options.workUnit.classId, dimensionClass.classId,
    "expected final compositor work unit class identity drifted");
  assertSizeWithinBounds(options.observation.backingSize, dimensionClass.backingSizeBounds,
    `${options.workUnit.key}: observed backingSize`);
  assertSizeWithinBounds(options.observation.clipSize, dimensionClass.clipSizeBounds,
    `${options.workUnit.key}: observed clipSize`);
  assertSizeWithinBounds(options.observation.cssSize, dimensionClass.cssSizeBounds,
    `${options.workUnit.key}: observed cssSize`);
  return dimensionClass.classId;
}

type MutableGroupSummary = CaliforniaSignatureFinalCompositorGroupIdentity & {
  classCropCounts: Map<string, number>;
  cropCount: number;
  groupKey: string;
  receiptCount: number;
};

export function summarizeCaliforniaSignatureFinalCompositorWorkUnits(
  workUnits: Iterable<CaliforniaSignatureFinalCompositorWorkUnit>,
  expectedReceiptSequence: CaliforniaSignatureFinalCompositorExpectedReceiptSequence
): CaliforniaSignatureFinalCompositorSummary {
  assertPositiveSafeInteger(expectedReceiptSequence.receiptCount,
    "California final compositor expected receipt count");
  assertSha256(expectedReceiptSequence.receiptsSha256,
    "California final compositor expected receipt sequence digest");
  assertSha256(expectedReceiptSequence.sourceSnapshotSha256,
    "California final compositor expected receipt source snapshot");
  const workUnitsHash = createHash("sha256");
  const receiptsHash = createHash("sha256");
  const classes = new Map<string, CaliforniaSignatureFinalCompositorClassCounter>();
  const groups = new Map<string, MutableGroupSummary>();
  const projects = new Map<string, CaliforniaSignatureFinalCompositorProjectCounter>();
  let cropCount = 0;
  let receiptCount = 0;
  let currentReceiptKey: string | null = null;
  let currentReceiptCropCount = 0;
  let currentReceiptExpectedCropCount = 0;
  let currentReceiptGroupKey: string | null = null;
  let currentReceiptOracleRowKey: string | null = null;
  let currentReceiptStateKey: string | null = null;
  let currentReceiptOrdinal: number | null = null;
  let currentReceiptBindingKeys: string[] = [];
  let dimensionRegistrySha256: string | null = null;
  let sourceSnapshotSha256: string | null = null;
  let unreviewedDiagnostic: boolean | null = null;

  const closeReceipt = () => {
    if (currentReceiptKey === null) return;
    assert.equal(currentReceiptCropCount, currentReceiptExpectedCropCount,
      `${currentReceiptKey}: streamed crop count differs from source Canvas count`);
    const group = groups.get(currentReceiptGroupKey!);
    assert.ok(group, `${currentReceiptKey}: streamed receipt lost its final compositor group`);
    updateFramedHash(receiptsHash, {
      axisId: group.axisId,
      benchId: group.benchId,
      bindingKeys: currentReceiptBindingKeys,
      canvasCount: currentReceiptExpectedCropCount,
      key: currentReceiptKey,
      oracleRowKey: currentReceiptOracleRowKey,
      phase: group.phase,
      stateKey: currentReceiptStateKey,
      surfaceKey: "signature-canvas"
    });
  };

  for (const unit of workUnits) {
    assertSha256(unit.key, "California final compositor work unit key");
    assertSha256(unit.dimensionRegistrySha256,
      `${unit.key}: California final compositor dimension registry identity`);
    if (dimensionRegistrySha256 === null) dimensionRegistrySha256 = unit.dimensionRegistrySha256;
    else assert.equal(unit.dimensionRegistrySha256, dimensionRegistrySha256,
      `${unit.key}: final compositor stream mixes dimension registries`);
    assertSha256(unit.sourceSnapshotSha256,
      `${unit.key}: California final compositor source snapshot identity`);
    if (sourceSnapshotSha256 === null) sourceSnapshotSha256 = unit.sourceSnapshotSha256;
    else assert.equal(unit.sourceSnapshotSha256, sourceSnapshotSha256,
      `${unit.key}: final compositor stream mixes source snapshots`);
    assert.equal(typeof unit.unreviewedDiagnostic, "boolean",
      `${unit.key}: final compositor registry review disposition is missing`);
    if (unreviewedDiagnostic === null) unreviewedDiagnostic = unit.unreviewedDiagnostic;
    else assert.equal(unit.unreviewedDiagnostic, unreviewedDiagnostic,
      `${unit.key}: final compositor stream mixes reviewed and diagnostic registries`);
    assert.equal(unit.groupKey, californiaSignatureFinalCompositorGroupKey(unit.group),
      `${unit.key}: final compositor work unit group key drifted`);
    assert.equal(unit.key, sha256(stableJson({
      bindingKey: unit.bindingKey,
      classId: unit.classId,
      groupKey: unit.groupKey,
      oracleRowKey: unit.oracleRowKey,
      receiptKey: unit.receiptKey,
      stateKey: unit.stateKey
    })), `${unit.receiptKey}: final compositor work unit identity drifted`);
    assertNonNegativeSafeInteger(unit.receiptOrdinal,
      `${unit.receiptKey}: receipt ordinal`);

    if (unit.receiptKey !== currentReceiptKey) {
      closeReceipt();
      assert.equal(unit.receiptOrdinal, receiptCount,
        `${unit.receiptKey}: receipt ordinal is duplicate, missing, or retrograde; ` +
        `expected exact transition ${receiptCount}`);
      currentReceiptKey = unit.receiptKey;
      currentReceiptCropCount = 0;
      currentReceiptExpectedCropCount = unit.receiptCanvasCount;
      currentReceiptGroupKey = unit.groupKey;
      currentReceiptOracleRowKey = unit.oracleRowKey;
      currentReceiptStateKey = unit.stateKey;
      currentReceiptOrdinal = unit.receiptOrdinal;
      currentReceiptBindingKeys = [];
      receiptCount += 1;
      const group = groups.get(unit.groupKey);
      if (group) group.receiptCount += 1;
      const project = projects.get(unit.group.projectName);
      if (project) project.receiptCount += 1;
    } else {
      assert.equal(unit.groupKey, currentReceiptGroupKey,
        `${unit.receiptKey}: one source receipt crosses final compositor groups`);
      assert.equal(unit.receiptCanvasCount, currentReceiptExpectedCropCount,
        `${unit.receiptKey}: source Canvas count drifted within one receipt`);
      assert.equal(unit.receiptOrdinal, currentReceiptOrdinal,
        `${unit.receiptKey}: receipt ordinal drifted within one exact transition`);
      assert.equal(unit.oracleRowKey, currentReceiptOracleRowKey,
        `${unit.receiptKey}: oracle row drifted within one exact transition`);
      assert.equal(unit.stateKey, currentReceiptStateKey,
        `${unit.receiptKey}: state key drifted within one exact transition`);
    }
    const previousBindingKey = currentReceiptBindingKeys.at(-1);
    if (previousBindingKey !== undefined) {
      assert.ok(compareCodeUnits(previousBindingKey, unit.bindingKey) < 0,
        `${unit.receiptKey}: streamed Canvas bindings are duplicate or not exactly sorted`);
    }
    currentReceiptBindingKeys.push(unit.bindingKey);

    let group = groups.get(unit.groupKey);
    if (!group) {
      group = {
        ...unit.group,
        classCropCounts: new Map<string, number>(),
        cropCount: 0,
        groupKey: unit.groupKey,
        receiptCount: 1
      };
      groups.set(unit.groupKey, group);
      const project = projects.get(unit.group.projectName) ?? {
        cropCount: 0,
        groupCount: 0,
        projectName: unit.group.projectName,
        receiptCount: 1
      };
      project.groupCount += 1;
      projects.set(unit.group.projectName, project);
    }

    const project = projects.get(unit.group.projectName)!;
    const classCounter = classes.get(unit.classId) ?? {
      classId: unit.classId,
      cropCount: 0,
      maximumDimensions: reviewedMaximumDimensions(unit.dimensionClass),
      projectName: unit.group.projectName,
      reviewedClassSha256: unit.reviewedClassSha256,
      reviewedPoliciesSha256: unit.reviewedPoliciesSha256
    };
    assert.equal(classCounter.projectName, unit.group.projectName,
      `${unit.classId}: one dimension class crosses projects`);
    assertSha256(unit.reviewedClassSha256,
      `${unit.classId}: reviewed class identity`);
    assertSha256(unit.reviewedPoliciesSha256,
      `${unit.classId}: reviewed binding policies identity`);
    assert.equal(classCounter.reviewedClassSha256, unit.reviewedClassSha256,
      `${unit.classId}: reviewed class identity drifted within work-unit stream`);
    assert.equal(classCounter.reviewedPoliciesSha256, unit.reviewedPoliciesSha256,
      `${unit.classId}: reviewed binding policy identity drifted within work-unit stream`);
    assert.deepEqual(classCounter.maximumDimensions,
      reviewedMaximumDimensions(unit.dimensionClass),
    `${unit.classId}: reviewed maximum dimensions drifted within work-unit stream`);
    classCounter.cropCount += 1;
    classes.set(unit.classId, classCounter);
    group.classCropCounts.set(unit.classId,
      (group.classCropCounts.get(unit.classId) ?? 0) + 1);
    group.cropCount += 1;
    project.cropCount += 1;
    cropCount += 1;
    currentReceiptCropCount += 1;
    updateFramedHash(workUnitsHash, {
      bindingKey: unit.bindingKey,
      classId: unit.classId,
      groupKey: unit.groupKey,
      key: unit.key,
      oracleRowKey: unit.oracleRowKey,
      receiptOrdinal: unit.receiptOrdinal,
      receiptKey: unit.receiptKey,
      stateKey: unit.stateKey
    });
  }
  closeReceipt();
  assert.ok(cropCount > 0, "California final compositor work-unit stream is empty");
  assert.ok(dimensionRegistrySha256,
    "California final compositor work-unit stream lost its dimension registry identity");
  assert.ok(sourceSnapshotSha256,
    "California final compositor work-unit stream lost its source snapshot identity");
  assert.notEqual(unreviewedDiagnostic, null,
    "California final compositor work-unit stream lost its registry review disposition");
  assert.equal(sourceSnapshotSha256, expectedReceiptSequence.sourceSnapshotSha256,
    "California final compositor receipt sequence expected another source snapshot");
  assert.equal(receiptCount, expectedReceiptSequence.receiptCount,
    "California final compositor receipt count differs from independently expected sequence");
  const receiptsSha256 = receiptsHash.digest("hex");
  assert.equal(receiptsSha256, expectedReceiptSequence.receiptsSha256,
    "California final compositor receipt sequence differs from independently expected digest");

  const classRows = [...classes.values()].sort((left, right) =>
    compareCodeUnits(left.classId, right.classId)
  );
  const groupRows = [...groups.values()].map((group): CaliforniaSignatureFinalCompositorGroupSummary => ({
    axisId: group.axisId,
    benchId: group.benchId,
    classCropCounts: [...group.classCropCounts].map(([classId, count]) => ({
      classId,
      cropCount: count
    })).sort((left, right) => compareCodeUnits(left.classId, right.classId)),
    cropCount: group.cropCount,
    groupKey: group.groupKey,
    phase: group.phase,
    projectName: group.projectName,
    receiptCount: group.receiptCount
  }));
  const projectRows = [...projects.values()].sort((left, right) =>
    compareCodeUnits(left.projectName, right.projectName)
  );
  const base = {
    classes: classRows,
    cropCount,
    dimensionRegistrySha256,
    groupCount: groupRows.length,
    groups: groupRows,
    projects: projectRows,
    receiptCount,
    receiptsSha256,
    schemaVersion: CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_CAPACITY_PLAN_SCHEMA_VERSION,
    sourceSnapshotSha256,
    unreviewedDiagnostic: unreviewedDiagnostic!,
    workUnitsSha256: workUnitsHash.digest("hex")
  } as const;
  assert.equal(classRows.reduce((sum, row) => checkedAdd(sum, row.cropCount,
    "California final compositor summary class crops"), 0), cropCount,
    "California final compositor class counters do not sum to exact crops");
  assert.equal(projectRows.reduce((sum, row) => checkedAdd(sum, row.cropCount,
    "California final compositor summary project crops"), 0), cropCount,
    "California final compositor project counters do not sum to exact crops");
  assert.equal(projectRows.reduce((sum, row) => checkedAdd(sum, row.receiptCount,
    "California final compositor summary project receipts"), 0), receiptCount,
    "California final compositor project counters do not sum to exact receipts");
  return { ...base, summarySha256: sha256(stableJson(base)) };
}

export function buildCaliforniaSignatureReviewedFinalCompositorSourcePlan(options: {
  canvasContract: CaliforniaCanvasGraphicsSourceContract;
  manifest: CaliforniaSignatureSourceManifest;
  oracle: CaliforniaSignatureSourceExpectedEvidenceOracle;
  projectDimensionPolicies: readonly CaliforniaSignatureFinalCompositorProjectDimensionPolicy[];
  projectRoot?: string;
  sourceSnapshotSha256: string;
}): CaliforniaSignatureReviewedFinalCompositorSourcePlan {
  assertSha256(options.sourceSnapshotSha256,
    "California reviewed final compositor source plan snapshot identity");
  const dimensionRegistry =
    buildCaliforniaSignatureReviewedFinalCompositorDimensionRegistry({
      canvasContract: options.canvasContract,
      projectDimensionPolicies: options.projectDimensionPolicies,
      projectRoot: options.projectRoot
    });
  const expectedReceipts = deriveCaliforniaSignatureFinalCompositorExpectedReceiptSequence({
    receipts: iterateCaliforniaSignatureSourceOracleCanvasReceiptMatrix({
      manifest: options.manifest,
      oracle: options.oracle
    }),
    sourceSnapshotSha256: options.sourceSnapshotSha256
  });
  const summary = summarizeCaliforniaSignatureFinalCompositorWorkUnits(
    iterateCaliforniaSignatureSourceFinalCompositorWorkUnits({
      bindingPolicies: dimensionRegistry.bindingPolicies,
      dimensionClasses: dimensionRegistry.dimensionClasses,
      expectedDimensionRegistrySha256: dimensionRegistry.dimensionRegistrySha256,
      manifest: options.manifest,
      oracle: options.oracle,
      projects: dimensionRegistry.projects,
      sourceSnapshotSha256: options.sourceSnapshotSha256,
      unreviewedDiagnostic: dimensionRegistry.unreviewedDiagnostic
    }),
    expectedReceipts
  );
  assert.equal(summary.unreviewedDiagnostic, false,
    "California reviewed final compositor source plan remained diagnostic-only");
  assert.equal(summary.dimensionRegistrySha256, dimensionRegistry.dimensionRegistrySha256,
    "California reviewed final compositor source plan lost its registry identity");
  const canvasGroupsByKey = new Map(summary.groups.map((group) => [group.groupKey, group]));
  const usedCanvasGroups = new Set<string>();
  const executionGroups: CaliforniaSignatureFinalCompositorExecutionGroupSummary[] = [];
  const allBenchIds = options.manifest.benches.map((bench) => bench.benchId);
  for (const project of dimensionRegistry.projects) {
    assert.ok(project.projectName === "desktop-chrome" || project.projectName === "mobile-chrome",
      `${project.projectName}: reviewed final compositor source plan has an unsupported formal project`);
    const groups = buildCaliforniaSignatureSourceExecutionGroups({
      benchIds: allBenchIds,
      manifest: options.manifest,
      oracle: options.oracle,
      projectName: project.projectName
    });
    for (const group of groups) {
      const identity: CaliforniaSignatureFinalCompositorGroupIdentity = {
        axisId: group.axisId,
        benchId: group.benchId,
        phase: group.phase,
        projectName: project.projectName
      };
      const groupKey = californiaSignatureFinalCompositorGroupKey(identity);
      const canvasGroup = canvasGroupsByKey.get(groupKey);
      if (canvasGroup) usedCanvasGroups.add(groupKey);
      executionGroups.push({
        ...identity,
        classCropCounts: canvasGroup?.classCropCounts.map((row) => ({ ...row })) ?? [],
        cropCount: canvasGroup?.cropCount ?? 0,
        expectedRecordCount: group.expectedRecordCount,
        groupKey,
        receiptCount: canvasGroup?.receiptCount ?? 0
      });
    }
  }
  assert.equal(usedCanvasGroups.size, canvasGroupsByKey.size,
    "California reviewed final compositor source plan lost a Canvas execution group");
  for (const groupKey of canvasGroupsByKey.keys()) {
    assert.ok(usedCanvasGroups.has(groupKey),
      `${groupKey}: reviewed final compositor source plan omitted a Canvas execution group`);
  }
  const executionSummary = summarizeCaliforniaSignatureFinalCompositorCapacityGroups(
    executionGroups.map((group) => ({ ...group, weightMs: 1 }))
  );
  const sourceIdentity: CaliforniaSignatureFinalCompositorCapacitySourceIdentity = {
    classes: summary.classes.map((row) => ({ ...row })),
    cropCount: summary.cropCount,
    dimensionRegistrySha256: summary.dimensionRegistrySha256,
    evidenceRecordCount: executionSummary.evidenceRecordCount,
    formalContract: {
      projectNames: [...CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_FORMAL_PROJECTS],
      terminalArtifactTarget:
        CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_TERMINAL_ARTIFACT_TARGET
    },
    groupCount: executionSummary.groupCount,
    groupsSha256: executionSummary.groupsSha256,
    projects: executionSummary.projects.map((row) => ({ ...row })),
    receiptCount: summary.receiptCount,
    receiptsSha256: summary.receiptsSha256,
    sourceSnapshotSha256: summary.sourceSnapshotSha256,
    summarySha256: summary.summarySha256,
    unreviewedDiagnostic: summary.unreviewedDiagnostic,
    workUnitsSha256: summary.workUnitsSha256
  };
  calculateCaliforniaSignatureFinalCompositorCapacitySourceIdentitySha256(sourceIdentity);
  return { dimensionRegistry, executionGroups, sourceIdentity, summary };
}

function partitionsRequired(weights: readonly number[], maximumPartitionWeight: number) {
  let partitions = 1;
  let current = 0;
  for (const weight of weights) {
    if (current > 0 && current + weight > maximumPartitionWeight) {
      partitions += 1;
      current = 0;
    }
    current += weight;
  }
  return partitions;
}

function contiguousWeightedPartition(
  groups: readonly CaliforniaSignatureFinalCompositorWeightedGroup[],
  slotCount: number
) {
  assert.ok(groups.length >= slotCount,
    `California final compositor project has ${groups.length} groups for ${slotCount} non-empty slots`);
  const weights = groups.map((group) =>
    assertPositiveSafeInteger(group.weightMs, `${group.groupKey}: group weightMs`)
  );
  const totalWeight = weights.reduce((sum, weight) => checkedAdd(sum, weight,
    "California final compositor group weights"), 0);
  let lower = Math.max(...weights);
  let upper = totalWeight;
  while (lower < upper) {
    const middle = lower + Math.floor((upper - lower) / 2);
    if (partitionsRequired(weights, middle) <= slotCount) upper = middle;
    else lower = middle + 1;
  }
  const maximumPartitionWeight = lower;
  const partitions: CaliforniaSignatureFinalCompositorWeightedGroup[][] = [];
  let current: CaliforniaSignatureFinalCompositorWeightedGroup[] = [];
  let currentWeight = 0;
  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index]!;
    const remainingGroups = groups.length - index;
    const remainingSlotsAfterCurrent = slotCount - partitions.length - 1;
    const mustLeaveOnePerSlot = current.length > 0 &&
      remainingGroups === remainingSlotsAfterCurrent;
    if (current.length > 0 &&
        (currentWeight + group.weightMs > maximumPartitionWeight || mustLeaveOnePerSlot)) {
      partitions.push(current);
      current = [];
      currentWeight = 0;
    }
    current.push(group);
    currentWeight = checkedAdd(currentWeight, group.weightMs,
      "California final compositor partition weight");
  }
  if (current.length > 0) partitions.push(current);
  assert.equal(partitions.length, slotCount,
    "California final compositor weighted partition did not produce the exact slot count");
  assert.ok(partitions.every((partition) => partition.length > 0),
    "California final compositor weighted partition produced an empty slot");
  return partitions;
}

export function calculateCaliforniaSignatureFinalCompositorCapacitySourceIdentitySha256(
  sourceIdentity: CaliforniaSignatureFinalCompositorCapacitySourceIdentity
) {
  assertPositiveSafeInteger(sourceIdentity.cropCount,
    "California final compositor capacity source cropCount");
  assertSha256(sourceIdentity.dimensionRegistrySha256,
    "California final compositor capacity dimension registry identity");
  assertPositiveSafeInteger(sourceIdentity.groupCount,
    "California final compositor capacity source groupCount");
  assertPositiveSafeInteger(sourceIdentity.evidenceRecordCount,
    "California final compositor capacity source evidenceRecordCount");
  assert.deepEqual(sourceIdentity.formalContract.projectNames,
    sourceIdentity.projects.map((project) => project.projectName),
  "California final compositor capacity formal contract has another source-owned project order");
  assert.equal(new Set(sourceIdentity.formalContract.projectNames).size,
    sourceIdentity.formalContract.projectNames.length,
  "California final compositor capacity formal contract repeats a project");
  assertPositiveSafeInteger(sourceIdentity.formalContract.terminalArtifactTarget,
    "California final compositor capacity formal terminal artifact target");
  assert.equal(sourceIdentity.formalContract.terminalArtifactTarget %
    sourceIdentity.formalContract.projectNames.length, 0,
  "California final compositor capacity formal artifact target is not divisible by project count");
  assertSha256(sourceIdentity.groupsSha256,
    "California final compositor capacity source group summary identity");
  assertPositiveSafeInteger(sourceIdentity.receiptCount,
    "California final compositor capacity source receiptCount");
  assertSha256(sourceIdentity.receiptsSha256,
    "California final compositor capacity receipt sequence identity");
  assertSha256(sourceIdentity.sourceSnapshotSha256,
    "California final compositor capacity source snapshot identity");
  assertSha256(sourceIdentity.summarySha256,
    "California final compositor capacity source summary identity");
  assertSha256(sourceIdentity.workUnitsSha256,
    "California final compositor capacity work-unit identity");
  assert.equal(typeof sourceIdentity.unreviewedDiagnostic, "boolean",
    "California final compositor capacity source review disposition must be explicit");
  assert.ok(sourceIdentity.classes.length > 0,
    "California final compositor capacity source has no dimension classes");
  let previousClassId: string | null = null;
  for (const row of sourceIdentity.classes) {
    assertSafeIdentity(row.classId, "California final compositor capacity classId");
    assertPositiveSafeInteger(row.cropCount, `${row.classId}: capacity source class cropCount`);
    assertReviewedMaximumDimensions(row.maximumDimensions,
      `${row.classId}: capacity source reviewed maximum dimensions`);
    assertSafeIdentity(row.projectName, `${row.classId}: capacity source class projectName`);
    assertSha256(row.reviewedClassSha256,
      `${row.classId}: capacity reviewed class identity`);
    assertSha256(row.reviewedPoliciesSha256,
      `${row.classId}: capacity reviewed binding policies identity`);
    if (previousClassId !== null) {
      assert.ok(compareCodeUnits(previousClassId, row.classId) < 0,
        "California final compositor capacity classes must be unique and exactly sorted");
    }
    previousClassId = row.classId;
  }
  assert.equal(sourceIdentity.classes.reduce((sum, row) => checkedAdd(sum, row.cropCount,
    "California final compositor capacity source class crops"), 0),
    sourceIdentity.cropCount,
  "California final compositor capacity source class crops do not sum to exact crops");
  assert.ok(sourceIdentity.projects.length > 0,
    "California final compositor capacity source has no projects");
  let previousProjectName: string | null = null;
  for (const row of sourceIdentity.projects) {
    assertSafeIdentity(row.projectName,
      "California final compositor capacity source projectName");
    assertPositiveSafeInteger(row.cropCount,
      `${row.projectName}: capacity source project cropCount`);
    assertPositiveSafeInteger(row.groupCount,
      `${row.projectName}: capacity source project groupCount`);
    assertPositiveSafeInteger(row.evidenceRecordCount,
      `${row.projectName}: capacity source project evidenceRecordCount`);
    assertPositiveSafeInteger(row.receiptCount,
      `${row.projectName}: capacity source project receiptCount`);
    if (previousProjectName !== null) {
      assert.ok(compareCodeUnits(previousProjectName, row.projectName) < 0,
        "California final compositor capacity projects must be unique and exactly sorted");
    }
    previousProjectName = row.projectName;
  }
  assert.equal(sourceIdentity.projects.reduce((sum, row) => checkedAdd(sum, row.cropCount,
    "California final compositor capacity source project crops"), 0),
    sourceIdentity.cropCount,
  "California final compositor capacity source project crops do not sum to exact crops");
  assert.equal(sourceIdentity.projects.reduce((sum, row) => checkedAdd(sum, row.groupCount,
    "California final compositor capacity source project groups"), 0),
    sourceIdentity.groupCount,
  "California final compositor capacity source project groups do not sum to exact groups");
  assert.equal(sourceIdentity.projects.reduce((sum, row) => checkedAdd(sum,
    row.evidenceRecordCount,
    "California final compositor capacity source project evidence"), 0),
    sourceIdentity.evidenceRecordCount,
  "California final compositor capacity source project evidence does not sum to exact records");
  assert.equal(sourceIdentity.projects.reduce((sum, row) => checkedAdd(sum, row.receiptCount,
    "California final compositor capacity source project receipts"), 0),
    sourceIdentity.receiptCount,
  "California final compositor capacity source project receipts do not sum to exact receipts");
  return sha256(stableJson(sourceIdentity));
}

export function summarizeCaliforniaSignatureFinalCompositorCapacityGroups(
  groups: readonly CaliforniaSignatureFinalCompositorWeightedGroup[]
) {
  const classes = new Map<string, { classId: string; cropCount: number; projectName: string }>();
  const projects = new Map<string, CaliforniaSignatureFinalCompositorExecutionProjectCounter>();
  const canonicalGroups: CaliforniaSignatureFinalCompositorExecutionGroupSummary[] = [];
  const groupKeys = new Set<string>();
  let cropCount = 0;
  let evidenceRecordCount = 0;
  let receiptCount = 0;
  for (const group of groups) {
    assert.equal(group.groupKey, californiaSignatureFinalCompositorGroupKey(group),
      `${group.groupKey}: capacity group identity drifted from source summary`);
    assert.ok(!groupKeys.has(group.groupKey),
      `California final compositor capacity source group summary has duplicate group ${group.groupKey}`);
    groupKeys.add(group.groupKey);
    assertNonNegativeSafeInteger(group.cropCount, `${group.groupKey}: source summary cropCount`);
    assertPositiveSafeInteger(group.expectedRecordCount,
      `${group.groupKey}: source summary expectedRecordCount`);
    assertNonNegativeSafeInteger(group.receiptCount, `${group.groupKey}: source summary receiptCount`);
    let groupClassCropCount = 0;
    let previousClassId: string | null = null;
    for (const row of group.classCropCounts) {
      assertSafeIdentity(row.classId, `${group.groupKey}: source summary classId`);
      assertPositiveSafeInteger(row.cropCount,
        `${group.groupKey}/${row.classId}: source summary class cropCount`);
      if (previousClassId !== null) {
        assert.ok(compareCodeUnits(previousClassId, row.classId) < 0,
          `${group.groupKey}: source summary classes are duplicate or not exactly sorted`);
      }
      previousClassId = row.classId;
      const existingClass = classes.get(row.classId) ?? {
        classId: row.classId,
        cropCount: 0,
        projectName: group.projectName
      };
      assert.equal(existingClass.projectName, group.projectName,
        `${row.classId}: source summary class crosses projects`);
      existingClass.cropCount = checkedAdd(existingClass.cropCount, row.cropCount,
        `${row.classId}: source summary class crop count`);
      classes.set(row.classId, existingClass);
      groupClassCropCount = checkedAdd(groupClassCropCount, row.cropCount,
        `${group.groupKey}: source summary group class crop count`);
    }
    assert.equal(groupClassCropCount, group.cropCount,
      `${group.groupKey}: source summary class crops do not sum to exact group crops`);
    const project = projects.get(group.projectName) ?? {
      cropCount: 0,
      evidenceRecordCount: 0,
      groupCount: 0,
      projectName: group.projectName,
      receiptCount: 0
    };
    project.cropCount = checkedAdd(project.cropCount, group.cropCount,
      `${group.projectName}: source summary project crop count`);
    project.evidenceRecordCount = checkedAdd(project.evidenceRecordCount,
      group.expectedRecordCount,
      `${group.projectName}: source summary project evidence count`);
    project.groupCount = checkedAdd(project.groupCount, 1,
      `${group.projectName}: source summary project group count`);
    project.receiptCount = checkedAdd(project.receiptCount, group.receiptCount,
      `${group.projectName}: source summary project receipt count`);
    projects.set(group.projectName, project);
    cropCount = checkedAdd(cropCount, group.cropCount,
      "California final compositor capacity source crop count");
    evidenceRecordCount = checkedAdd(evidenceRecordCount, group.expectedRecordCount,
      "California final compositor capacity source evidence count");
    receiptCount = checkedAdd(receiptCount, group.receiptCount,
      "California final compositor capacity source receipt count");
    canonicalGroups.push({
      axisId: group.axisId,
      benchId: group.benchId,
      classCropCounts: group.classCropCounts.map((row) => ({ ...row })),
      cropCount: group.cropCount,
      expectedRecordCount: group.expectedRecordCount,
      groupKey: group.groupKey,
      phase: group.phase,
      projectName: group.projectName,
      receiptCount: group.receiptCount
    });
  }
  assert.ok(canonicalGroups.length > 0,
    "California final compositor capacity source group summary is empty");
  return {
    classes: [...classes.values()].sort((left, right) => compareCodeUnits(left.classId, right.classId)),
    cropCount,
    evidenceRecordCount,
    groupCount: canonicalGroups.length,
    groupsSha256: sha256(stableJson(canonicalGroups)),
    projects: [...projects.values()].sort((left, right) =>
      compareCodeUnits(left.projectName, right.projectName)),
    receiptCount
  };
}

function assertCapacityGroupsMatchSourceIdentity(
  groups: readonly CaliforniaSignatureFinalCompositorWeightedGroup[],
  sourceIdentity: CaliforniaSignatureFinalCompositorCapacitySourceIdentity
) {
  const actual = summarizeCaliforniaSignatureFinalCompositorCapacityGroups(groups);
  assert.equal(actual.groupsSha256, sourceIdentity.groupsSha256,
    "California final compositor group summary differs from exact source identity");
  assert.equal(actual.groupCount, sourceIdentity.groupCount,
    "California final compositor group summary count differs from exact source identity");
  assert.equal(actual.receiptCount, sourceIdentity.receiptCount,
    "California final compositor group summary receipt count differs from exact source identity");
  assert.equal(actual.cropCount, sourceIdentity.cropCount,
    "California final compositor group summary crop count differs from exact source identity");
  assert.equal(actual.evidenceRecordCount, sourceIdentity.evidenceRecordCount,
    "California final compositor group summary evidence count differs from exact source identity");
  assert.deepEqual(actual.projects, sourceIdentity.projects,
    "California final compositor group summary project counters differ from exact source identity");
  assert.deepEqual(actual.classes, sourceIdentity.classes.map((row) => ({
    classId: row.classId,
    cropCount: row.cropCount,
    projectName: row.projectName
  })), "California final compositor group summary class counters differ from exact source identity");
}

export function partitionCaliforniaSignatureFinalCompositorGroups(options: {
  groups: readonly CaliforniaSignatureFinalCompositorWeightedGroup[];
  projectNames: readonly string[];
  sourceIdentity: CaliforniaSignatureFinalCompositorCapacitySourceIdentity;
  terminalArtifactTarget: number;
}): CaliforniaSignatureFinalCompositorPartitionPlan {
  const sourceIdentitySha256 =
    calculateCaliforniaSignatureFinalCompositorCapacitySourceIdentitySha256(
      options.sourceIdentity);
  assertCapacityGroupsMatchSourceIdentity(options.groups, options.sourceIdentity);
  assertPositiveSafeInteger(options.terminalArtifactTarget,
    "California final compositor terminal artifact target");
  assert.deepEqual(options.projectNames, options.sourceIdentity.formalContract.projectNames,
    "California final compositor partition differs from the source-owned project order");
  assert.equal(options.terminalArtifactTarget,
    options.sourceIdentity.formalContract.terminalArtifactTarget,
  "California final compositor partition differs from the source-owned terminal artifact target");
  assert.ok(options.projectNames.length > 0,
    "California final compositor partition has no projects");
  assert.equal(new Set(options.projectNames).size, options.projectNames.length,
    "California final compositor partition repeats a project");
  for (const projectName of options.projectNames) {
    assertSafeIdentity(projectName, "California final compositor partition projectName");
  }
  assert.equal(options.terminalArtifactTarget % options.projectNames.length, 0,
    "California final compositor terminal artifact target is not divisible by project count");
  const slotCount = options.terminalArtifactTarget / options.projectNames.length;
  assertPositiveSafeInteger(slotCount, "California final compositor package slot count");
  const knownProjects = new Set(options.projectNames);
  const groupKeys = new Set<string>();
  for (const group of options.groups) {
    assert.ok(knownProjects.has(group.projectName),
      `${group.groupKey}: group cites unknown partition project ${group.projectName}`);
    assert.equal(group.groupKey, californiaSignatureFinalCompositorGroupKey(group),
      `${group.groupKey}: weighted group identity drifted`);
    assert.ok(!groupKeys.has(group.groupKey),
      `California final compositor duplicate group ${group.groupKey}`);
    groupKeys.add(group.groupKey);
    assertNonNegativeSafeInteger(group.receiptCount, `${group.groupKey}: receiptCount`);
    assertNonNegativeSafeInteger(group.cropCount, `${group.groupKey}: cropCount`);
    assertPositiveSafeInteger(group.expectedRecordCount, `${group.groupKey}: expectedRecordCount`);
    assert.equal(group.classCropCounts.reduce((sum, row) => checkedAdd(sum, row.cropCount,
      `${group.groupKey}: partition class crops`), 0),
      group.cropCount, `${group.groupKey}: class crops do not sum to group crops`);
  }

  const partitionsByProject = new Map<string,
    CaliforniaSignatureFinalCompositorWeightedGroup[][]>();
  for (const projectName of options.projectNames) {
    const projectGroups = options.groups.filter((group) => group.projectName === projectName);
    partitionsByProject.set(projectName, contiguousWeightedPartition(projectGroups, slotCount));
  }
  const packages: CaliforniaSignatureFinalCompositorPackage[] = [];
  for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
    const projectSlices = options.projectNames.map((projectName) => {
      const partition = partitionsByProject.get(projectName)![slotIndex]!;
      return {
        groupKeys: partition.map((group) => group.groupKey),
        projectName,
        weightMs: partition.reduce((sum, group) => checkedAdd(sum, group.weightMs,
          `${projectName}: California final compositor package weight`), 0)
      };
    });
    packages.push({
      packageId: `signature-final-compositor-capacity-${String(slotIndex + 1).padStart(3, "0")}`,
      projects: projectSlices,
      slotIndex
    });
  }
  for (const projectName of options.projectNames) {
    const expected = options.groups.filter((group) => group.projectName === projectName)
      .map((group) => group.groupKey);
    const actual = packages.flatMap((workPackage) =>
      workPackage.projects.find((project) => project.projectName === projectName)!.groupKeys
    );
    assert.deepEqual(actual, expected,
      `${projectName}: final compositor package groups are not one exact contiguous union`);
    assert.equal(new Set(actual).size, actual.length,
      `${projectName}: final compositor package groups repeat across slots`);
  }
  const base = {
    packages,
    projectNames: [...options.projectNames],
    schemaVersion: CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_CAPACITY_PLAN_SCHEMA_VERSION,
    slotCount,
    sourceIdentitySha256,
    terminalArtifactTarget: options.terminalArtifactTarget
  } as const;
  assert.equal(packages.length * options.projectNames.length, options.terminalArtifactTarget,
    "California final compositor partition changed the terminal artifact contract");
  return {
    ...base,
    planSha256: calculateCaliforniaSignatureFinalCompositorPartitionPlanSha256(base)
  };
}

function assertEnvironmentIdentity(
  value: CaliforniaSignatureFinalCompositorEnvironmentIdentity,
  label: string
) {
  try {
    assertCaliforniaSignatureFinalCompositorMeasurementEnvironmentIdentity(value);
  } catch (error) {
    assert.fail(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assertExactEnvironment(
  value: CaliforniaSignatureFinalCompositorEnvironmentIdentity,
  expected: CaliforniaSignatureFinalCompositorEnvironmentIdentity,
  label: string
) {
  assertEnvironmentIdentity(value, label);
  assertEnvironmentIdentity(expected, `${label} expected`);
  assert.equal(value.browserSha256, expected.browserSha256,
    `${label} browser identity drifted`);
  assert.equal(value.sharpVersion, expected.sharpVersion,
    `${label} Sharp identity drifted`);
  assert.equal(value.machineSha256, expected.machineSha256,
    `${label} machine identity drifted`);
  assert.equal(value.processCount, expected.processCount,
    `${label} concurrency processCount drifted`);
  assert.equal(value.workersPerProcess, expected.workersPerProcess,
    `${label} concurrency workersPerProcess drifted`);
  assert.deepEqual(value, expected, `${label} exact environment fields drifted`);
}

function assertPlanSha256(plan: CaliforniaSignatureFinalCompositorPartitionPlan) {
  assert.equal(plan.schemaVersion,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_CAPACITY_PLAN_SCHEMA_VERSION,
  "California final compositor capacity plan schema drifted");
  assertPositiveSafeInteger(plan.slotCount,
    "California final compositor capacity plan slotCount");
  assertPositiveSafeInteger(plan.terminalArtifactTarget,
    "California final compositor capacity plan terminalArtifactTarget");
  assertSha256(plan.sourceIdentitySha256,
    "California final compositor capacity plan source identity");
  const { planSha256, ...base } = plan;
  assertSha256(planSha256, "California final compositor partition plan SHA");
  assert.equal(planSha256,
    calculateCaliforniaSignatureFinalCompositorPartitionPlanSha256(base),
    "California final compositor partition plan digest does not bind its exact contents");
}

export function decideCaliforniaSignatureFinalCompositorCapacity(options: {
  artifactHeadroomMs: number;
  baselines: readonly CaliforniaSignatureFinalCompositorBaseline[];
  calibrations: readonly CaliforniaSignatureFinalCompositorCalibration[];
  environment: CaliforniaSignatureFinalCompositorEnvironmentIdentity;
  formalHeadroomMs: number;
  groups: readonly CaliforniaSignatureFinalCompositorWeightedGroup[];
  plan: CaliforniaSignatureFinalCompositorPartitionPlan;
  sourceIdentity: CaliforniaSignatureFinalCompositorCapacitySourceIdentity;
}): CaliforniaSignatureFinalCompositorCapacityDecision {
  assertEnvironmentIdentity(options.environment, "California final compositor formal environment");
  assertNonNegativeSafeInteger(options.artifactHeadroomMs,
    "California final compositor artifact headroom");
  assertNonNegativeSafeInteger(options.formalHeadroomMs,
    "California final compositor formal headroom");
  assert.equal(options.sourceIdentity.unreviewedDiagnostic, false,
    "California final compositor capacity decision rejects an unreviewed diagnostic registry");
  const sourceIdentitySha256 =
    calculateCaliforniaSignatureFinalCompositorCapacitySourceIdentitySha256(
      options.sourceIdentity);
  assertCapacityGroupsMatchSourceIdentity(options.groups, options.sourceIdentity);
  assertPlanSha256(options.plan);
  assert.equal(options.plan.sourceIdentitySha256, sourceIdentitySha256,
    "California final compositor capacity plan cites another source/work-unit identity");
  assert.deepEqual(options.plan.projectNames,
    options.sourceIdentity.formalContract.projectNames,
  "California final compositor capacity decision differs from the source-owned project order");
  assert.equal(options.plan.terminalArtifactTarget,
    options.sourceIdentity.formalContract.terminalArtifactTarget,
  "California final compositor capacity decision differs from the source-owned terminal artifact target");
  const canonicalPlan = partitionCaliforniaSignatureFinalCompositorGroups({
    groups: options.groups,
    projectNames: options.sourceIdentity.formalContract.projectNames,
    sourceIdentity: options.sourceIdentity,
    terminalArtifactTarget: options.sourceIdentity.formalContract.terminalArtifactTarget
  });
  assert.deepEqual(options.plan, canonicalPlan,
    "California final compositor capacity decision requires the exact canonical weighted partition");
  assert.ok(options.environment.processCount <= options.plan.packages.length,
    "California final compositor process concurrency exceeds non-empty package lanes");

  const groupsByKey = new Map<string, CaliforniaSignatureFinalCompositorWeightedGroup>();
  const usedClassIds = new Set<string>();
  for (const group of options.groups) {
    assert.ok(!groupsByKey.has(group.groupKey),
      `California final compositor capacity duplicate group ${group.groupKey}`);
    assert.equal(group.groupKey, californiaSignatureFinalCompositorGroupKey(group),
      `${group.groupKey}: capacity group identity drifted`);
    assertNonNegativeSafeInteger(group.cropCount, `${group.groupKey}: capacity cropCount`);
    assertPositiveSafeInteger(group.expectedRecordCount,
      `${group.groupKey}: capacity expectedRecordCount`);
    assertPositiveSafeInteger(group.weightMs, `${group.groupKey}: capacity weightMs`);
    const classIds = new Set<string>();
    let classCropCount = 0;
    for (const row of group.classCropCounts) {
      assertSafeIdentity(row.classId, `${group.groupKey}: capacity classId`);
      assert.ok(!classIds.has(row.classId),
        `${group.groupKey}: capacity group repeats class ${row.classId}`);
      classIds.add(row.classId);
      assertPositiveSafeInteger(row.cropCount,
        `${group.groupKey}/${row.classId}: capacity class cropCount`);
      classCropCount = checkedAdd(classCropCount, row.cropCount,
        `${group.groupKey}: capacity class crop count`);
      usedClassIds.add(row.classId);
    }
    assert.equal(classCropCount, group.cropCount,
      `${group.groupKey}: capacity class crops do not sum to exact group crops`);
    groupsByKey.set(group.groupKey, group);
  }
  assert.ok(groupsByKey.size > 0, "California final compositor capacity has no groups");
  const sourceClassById = new Map(options.sourceIdentity.classes.map((row) => [row.classId, row]));
  const missingSourceClasses = [...usedClassIds].filter((classId) => !sourceClassById.has(classId));
  const extraSourceClasses = [...sourceClassById.keys()].filter((classId) => !usedClassIds.has(classId));
  assert.deepEqual(missingSourceClasses, [],
    `California final compositor source identity misses classes: ${missingSourceClasses.join(",")}`);
  assert.deepEqual(extraSourceClasses, [],
    `California final compositor source identity has extra classes: ${extraSourceClasses.join(",")}`);

  let compositorImplementationSha256: string | null = null;
  const measurementReceiptIdentities: Array<{
    evidenceKey: string;
    measurementFileSha256: string;
    measurementReceiptSha256: string;
    measurementsSha256: string;
    subjectSha256: string;
  }> = [];
  const bindMeasurementIdentity = (
    evidenceKey: string,
    measurement: ReturnType<typeof assertCaliforniaSignatureFinalCompositorTimingReceipt>
  ) => {
    assertSha256(measurement.compositorImplementationSha256,
      `${evidenceKey}: measured compositor implementation`);
    if (compositorImplementationSha256 === null) {
      compositorImplementationSha256 = measurement.compositorImplementationSha256;
    } else {
      assert.equal(measurement.compositorImplementationSha256,
        compositorImplementationSha256,
      `${evidenceKey}: measurement compositor implementation drifted`);
    }
    measurementReceiptIdentities.push({
      evidenceKey,
      measurementFileSha256: measurement.measurementFileSha256,
      measurementReceiptSha256: measurement.measurementReceiptSha256,
      measurementsSha256: measurement.measurementsSha256,
      subjectSha256: measurement.subjectSha256
    });
  };

  const baselineByGroup = new Map<string, CaliforniaSignatureFinalCompositorBaseline>();
  for (const baseline of options.baselines) {
    assert.ok(!baselineByGroup.has(baseline.groupKey),
      `California final compositor duplicate baseline ${baseline.groupKey}`);
    assertPositiveSafeInteger(baseline.upperBoundMs,
      `${baseline.groupKey}: baseline upperBoundMs`);
    assert.equal(baseline.coverage.hydrate, true,
      `${baseline.groupKey}: baseline must include hydrate`);
    assert.equal(baseline.coverage.navigation, true,
      `${baseline.groupKey}: baseline must include navigation`);
    assert.equal(baseline.coverage.replay, true,
      `${baseline.groupKey}: baseline must include replay`);
    assert.equal(baseline.coverage.layout, true,
      `${baseline.groupKey}: baseline must include layout`);
    assert.equal(baseline.coverage.realReset, true,
      `${baseline.groupKey}: baseline must include real Reset`);
    assert.equal(baseline.coverage.finalCompositorExcluded, true,
      `${baseline.groupKey}: baseline final compositor must be excluded before additive calibration`);
    assert.equal(baseline.sourceSnapshotSha256, options.sourceIdentity.sourceSnapshotSha256,
      `${baseline.groupKey}: baseline source snapshot identity drifted`);
    assert.equal(baseline.sourcePlanSha256, sourceIdentitySha256,
      `${baseline.groupKey}: baseline source plan identity drifted`);
    assert.equal(baseline.workUnitsSha256, options.sourceIdentity.workUnitsSha256,
      `${baseline.groupKey}: baseline work-unit digest drifted`);
    assert.equal(baseline.dimensionRegistrySha256,
      options.sourceIdentity.dimensionRegistrySha256,
    `${baseline.groupKey}: baseline dimension registry identity drifted`);
    assertExactEnvironment(baseline.environment, options.environment,
      `${baseline.groupKey}: baseline`);
    const measuredBaseline =
      assertCaliforniaSignatureFinalCompositorTimingReceipt({
        environment: baseline.environment,
        receipt: baseline.timingReceipt,
        subject: {
          dimensionRegistrySha256: baseline.dimensionRegistrySha256,
          groupKey: baseline.groupKey,
          kind: "baseline-group-v2",
          sourcePlanSha256: baseline.sourcePlanSha256,
          sourceSnapshotSha256: baseline.sourceSnapshotSha256,
          stageCoverage: {
            finalCompositorIncluded: !baseline.coverage.finalCompositorExcluded,
            hydrate: baseline.coverage.hydrate,
            layout: baseline.coverage.layout,
            navigation: baseline.coverage.navigation,
            realReset: baseline.coverage.realReset,
            replay: baseline.coverage.replay
          },
          workUnitsSha256: baseline.workUnitsSha256
        }
      });
    bindMeasurementIdentity(`baseline\0${baseline.groupKey}`, measuredBaseline);
    assert.equal(baseline.upperBoundMs, measuredBaseline.upperBoundMs,
      `${baseline.groupKey}: baseline upper bound was not derived from raw measurements`);
    baselineByGroup.set(baseline.groupKey, baseline);
  }
  const missingBaselines = [...groupsByKey.keys()].filter((key) => !baselineByGroup.has(key));
  const extraBaselines = [...baselineByGroup.keys()].filter((key) => !groupsByKey.has(key));
  assert.deepEqual(missingBaselines, [],
    `California final compositor missing baseline groups: ${missingBaselines.join(",")}`);
  assert.deepEqual(extraBaselines, [],
    `California final compositor extra baseline groups: ${extraBaselines.join(",")}`);

  const calibrationByClass = new Map<string, CaliforniaSignatureFinalCompositorCalibration>();
  for (const calibration of options.calibrations) {
    assertSafeIdentity(calibration.classId, "California final compositor calibration classId");
    assert.ok(!calibrationByClass.has(calibration.classId),
      `California final compositor duplicate calibration ${calibration.classId}`);
    assertPositiveSafeInteger(calibration.upperBoundMsPerCrop,
      `${calibration.classId}: calibration upperBoundMsPerCrop`);
    assertExactEnvironment(calibration.environment, options.environment,
      `${calibration.classId}: calibration`);
    const sourceClass = sourceClassById.get(calibration.classId);
    if (sourceClass) {
      assert.equal(calibration.reviewedClassSha256, sourceClass.reviewedClassSha256,
        `${calibration.classId}: calibration reviewed class identity drifted`);
      assert.equal(calibration.reviewedPoliciesSha256, sourceClass.reviewedPoliciesSha256,
        `${calibration.classId}: calibration reviewed policy identity drifted`);
      assert.equal(calibration.dimensionRegistrySha256,
        options.sourceIdentity.dimensionRegistrySha256,
      `${calibration.classId}: calibration dimension registry identity drifted`);
      assert.equal(calibration.sourcePlanSha256, sourceIdentitySha256,
        `${calibration.classId}: calibration source plan identity drifted`);
      assert.equal(calibration.sourceClassCropCount, sourceClass.cropCount,
        `${calibration.classId}: calibration source class crop count drifted`);
      assert.deepEqual(calibration.maximumDimensions, sourceClass.maximumDimensions,
        `${calibration.classId}: calibration maximum dimensions drifted`);
    }
    const measuredCalibration =
      assertCaliforniaSignatureFinalCompositorTimingReceipt({
        environment: calibration.environment,
        receipt: calibration.timingReceipt,
        subject: {
          calibratedCropCount: 1,
          classId: calibration.classId,
          dimensionRegistrySha256: calibration.dimensionRegistrySha256,
          kind: "compositor-class-calibration-v2",
          maximumDimensions: calibration.maximumDimensions,
          reviewedClassSha256: calibration.reviewedClassSha256,
          reviewedPoliciesSha256: calibration.reviewedPoliciesSha256,
          sourceClassCropCount: calibration.sourceClassCropCount,
          sourcePlanSha256: calibration.sourcePlanSha256,
          sourceSnapshotSha256: options.sourceIdentity.sourceSnapshotSha256,
          stageCoverage: {
            finalCompositorIncluded: true,
            hydrate: false,
            layout: false,
            navigation: false,
            realReset: false,
            replay: false
          }
        }
      });
    bindMeasurementIdentity(`calibration\0${calibration.classId}`, measuredCalibration);
    assert.equal(calibration.upperBoundMsPerCrop, measuredCalibration.upperBoundMs,
      `${calibration.classId}: calibration upper bound was not derived from raw measurements`);
    calibrationByClass.set(calibration.classId, calibration);
  }
  const missingCalibrations = [...usedClassIds].filter((classId) => !calibrationByClass.has(classId));
  const extraCalibrations = [...calibrationByClass.keys()].filter((classId) => !usedClassIds.has(classId));
  assert.deepEqual(missingCalibrations, [],
    `California final compositor missing calibrations: ${missingCalibrations.join(",")}`);
  assert.deepEqual(extraCalibrations, [],
    `California final compositor extra calibrations: ${extraCalibrations.join(",")}`);

  const plannedGroupKeys = new Set<string>();
  const projectNames = new Set(options.plan.projectNames);
  assert.equal(projectNames.size, options.plan.projectNames.length,
    "California final compositor capacity plan repeats a project");
  assert.equal(options.plan.packages.length, options.plan.slotCount,
    "California final compositor capacity plan package/slot cardinality drifted");
  assert.equal(options.plan.packages.length * options.plan.projectNames.length,
    options.plan.terminalArtifactTarget,
  "California final compositor capacity plan changed terminal artifact cardinality");
  const packageIds = new Set<string>();
  for (let packageIndex = 0; packageIndex < options.plan.packages.length; packageIndex += 1) {
    const workPackage = options.plan.packages[packageIndex]!;
    assertSafeIdentity(workPackage.packageId,
      "California final compositor capacity packageId");
    assert.equal(workPackage.packageId,
      `signature-final-compositor-capacity-${String(packageIndex + 1).padStart(3, "0")}`,
    `${workPackage.packageId}: California final compositor capacity plan has a non-canonical package ID`);
    assert.ok(!packageIds.has(workPackage.packageId),
      `California final compositor capacity plan repeats package ${workPackage.packageId}`);
    packageIds.add(workPackage.packageId);
    assert.equal(workPackage.slotIndex, packageIndex,
      `${workPackage.packageId}: capacity plan slot index is missing, duplicate, or retrograde`);
    assert.equal(workPackage.projects.length, options.plan.projectNames.length,
      `${workPackage.packageId}: capacity plan has an incomplete project matrix`);
    assert.deepEqual(workPackage.projects.map((project) => project.projectName),
      options.plan.projectNames,
    `${workPackage.packageId}: capacity plan project matrix is not exact and ordered`);
    for (const project of workPackage.projects) {
      assert.ok(projectNames.has(project.projectName),
        `${workPackage.packageId}: capacity plan cites unknown project ${project.projectName}`);
      assert.ok(project.groupKeys.length > 0,
        `${workPackage.packageId}/${project.projectName}: capacity artifact has no groups`);
      let exactWeightMs = 0;
      for (const groupKey of project.groupKeys) {
        const group = groupsByKey.get(groupKey);
        assert.ok(group, `${workPackage.packageId}: capacity plan cites unknown group ${groupKey}`);
        assert.equal(group.projectName, project.projectName,
          `${workPackage.packageId}: capacity plan assigns ${groupKey} to another project`);
        assert.ok(!plannedGroupKeys.has(groupKey),
          `${workPackage.packageId}: capacity plan repeats group ${groupKey}`);
        plannedGroupKeys.add(groupKey);
        exactWeightMs = checkedAdd(exactWeightMs, group.weightMs,
          `${workPackage.packageId}/${project.projectName}: exact package weight`);
      }
      assert.equal(project.weightMs, exactWeightMs,
        `${workPackage.packageId}/${project.projectName}: capacity plan weight drifted`);
    }
  }
  const missingPlannedGroups = [...groupsByKey.keys()].filter((key) => !plannedGroupKeys.has(key));
  assert.deepEqual(missingPlannedGroups, [],
    `California final compositor capacity plan misses groups: ${missingPlannedGroups.join(",")}`);

  const groupForecasts = new Map<string, {
    baselineUpperBoundMs: number;
    compositorCropCount: number;
    compositorUpperBoundMs: number;
    upperBoundMs: number;
  }>();
  let baselineUpperBoundMs = 0;
  let compositorCropCount = 0;
  let compositorUpperBoundMs = 0;
  for (const group of options.groups) {
    const baselineMs = baselineByGroup.get(group.groupKey)!.upperBoundMs;
    let groupCompositorMs = 0;
    for (const row of group.classCropCounts) {
      const calibrationMs = calibrationByClass.get(row.classId)!.upperBoundMsPerCrop;
      groupCompositorMs = checkedAdd(groupCompositorMs,
        checkedMultiply(row.cropCount, calibrationMs,
          `${group.groupKey}/${row.classId}: compositor forecast`),
        `${group.groupKey}: compositor forecast`);
    }
    const upperBoundMs = checkedAdd(baselineMs, groupCompositorMs,
      `${group.groupKey}: capacity forecast`);
    groupForecasts.set(group.groupKey, {
      baselineUpperBoundMs: baselineMs,
      compositorCropCount: group.cropCount,
      compositorUpperBoundMs: groupCompositorMs,
      upperBoundMs
    });
    baselineUpperBoundMs = checkedAdd(baselineUpperBoundMs, baselineMs,
      "California final compositor total baseline forecast");
    compositorCropCount = checkedAdd(compositorCropCount, group.cropCount,
      "California final compositor total crop count");
    compositorUpperBoundMs = checkedAdd(compositorUpperBoundMs, groupCompositorMs,
      "California final compositor total compositor forecast");
  }

  const artifactForecasts: CaliforniaSignatureFinalCompositorArtifactForecast[] = [];
  const laneUpperBounds = Array.from({ length: options.environment.processCount }, () => 0);
  for (const workPackage of options.plan.packages) {
    const laneIndex = workPackage.slotIndex % options.environment.processCount;
    for (const project of workPackage.projects) {
      let artifactBaselineMs = 0;
      let artifactCropCount = 0;
      let artifactCompositorMs = 0;
      let artifactUpperBoundMs = 0;
      for (const groupKey of project.groupKeys) {
        const forecast = groupForecasts.get(groupKey)!;
        artifactBaselineMs = checkedAdd(artifactBaselineMs, forecast.baselineUpperBoundMs,
          `${workPackage.packageId}/${project.projectName}: artifact baseline forecast`);
        artifactCropCount = checkedAdd(artifactCropCount, forecast.compositorCropCount,
          `${workPackage.packageId}/${project.projectName}: artifact crop count`);
        artifactCompositorMs = checkedAdd(artifactCompositorMs,
          forecast.compositorUpperBoundMs,
          `${workPackage.packageId}/${project.projectName}: artifact compositor forecast`);
        artifactUpperBoundMs = checkedAdd(artifactUpperBoundMs, forecast.upperBoundMs,
          `${workPackage.packageId}/${project.projectName}: artifact total forecast`);
      }
      artifactForecasts.push({
        artifactKey: `${project.projectName}\0${workPackage.packageId}`,
        baselineUpperBoundMs: artifactBaselineMs,
        compositorCropCount: artifactCropCount,
        compositorUpperBoundMs: artifactCompositorMs,
        groupKeys: [...project.groupKeys],
        laneIndex,
        packageId: workPackage.packageId,
        projectName: project.projectName,
        upperBoundMs: artifactUpperBoundMs
      });
      laneUpperBounds[laneIndex] = checkedAdd(laneUpperBounds[laneIndex]!, artifactUpperBoundMs,
        `California final compositor lane ${laneIndex} forecast`);
    }
  }
  assert.equal(artifactForecasts.length, options.plan.terminalArtifactTarget,
    "California final compositor capacity forecast changed terminal artifact count");
  assert.equal(artifactForecasts.reduce((sum, artifact) => sum + artifact.baselineUpperBoundMs, 0),
    baselineUpperBoundMs, "California final compositor baseline was omitted or counted twice");
  assert.equal(artifactForecasts.reduce((sum, artifact) => sum + artifact.compositorCropCount, 0),
    compositorCropCount, "California final compositor crops were omitted or counted twice");
  assert.equal(artifactForecasts.reduce((sum, artifact) => sum + artifact.compositorUpperBoundMs, 0),
    compositorUpperBoundMs, "California final compositor calibration was omitted or counted twice");

  const issues: string[] = [];
  for (const artifact of artifactForecasts) {
    if (checkedAdd(artifact.upperBoundMs, options.artifactHeadroomMs,
      `${artifact.artifactKey}: artifact forecast plus headroom`) >=
        CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_ARTIFACT_LIMIT_MS) {
      issues.push(
        `${artifact.artifactKey}: artifact forecast ${artifact.upperBoundMs}ms plus headroom ` +
        `${options.artifactHeadroomMs}ms violates strict 24h bound ` +
        `${CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_ARTIFACT_LIMIT_MS}ms`
      );
    }
  }
  const makespanUpperBoundMs = Math.max(...laneUpperBounds);
  if (checkedAdd(makespanUpperBoundMs, options.formalHeadroomMs,
    "California final compositor formal forecast plus headroom") >=
      CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_FORMAL_LIMIT_MS) {
    issues.push(
      `formal makespan ${makespanUpperBoundMs}ms plus headroom ${options.formalHeadroomMs}ms ` +
      `violates strict 72h bound ${CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_FORMAL_LIMIT_MS}ms`
    );
  }
  const laneForecasts = laneUpperBounds.map((upperBoundMs, laneIndex) => ({
    laneIndex,
    upperBoundMs
  }));
  assert.ok(compositorImplementationSha256,
    "California final compositor capacity decision has no measured compositor implementation");
  assert.equal(measurementReceiptIdentities.length,
    options.groups.length + usedClassIds.size,
  "California final compositor capacity decision lost baseline or calibration measurement receipts");
  measurementReceiptIdentities.sort((left, right) =>
    compareCodeUnits(left.evidenceKey, right.evidenceKey));
  const measurementReceiptsSha256 = sha256(stableJson(measurementReceiptIdentities));
  const base = {
    artifactHeadroomMs: options.artifactHeadroomMs,
    artifactLimitMs: CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_ARTIFACT_LIMIT_MS,
    artifactForecasts,
    baselineUpperBoundMs,
    compositorCropCount,
    compositorImplementationSha256,
    compositorUpperBoundMs,
    environment: structuredClone(options.environment),
    formalExecutionAuthorized: false as const,
    formalHeadroomMs: options.formalHeadroomMs,
    formalLimitMs: CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_FORMAL_LIMIT_MS,
    issues,
    laneForecasts,
    makespanUpperBoundMs,
    measurementReceiptCount: measurementReceiptIdentities.length,
    measurementReceiptsSha256,
    passed: issues.length === 0,
    planSha256: options.plan.planSha256,
    schemaVersion: CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_CAPACITY_PLAN_SCHEMA_VERSION,
    status: issues.length === 0
      ? "capacity-bounds-satisfied" as const
      : "capacity-bounds-rejected" as const
  } as const;
  return { ...base, decisionSha256: sha256(stableJson(base)) };
}
