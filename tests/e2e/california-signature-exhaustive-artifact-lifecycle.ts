import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync
} from "node:fs";
import {
  link,
  lstat,
  mkdir,
  open,
  readdir,
  rmdir,
  statfs,
  unlink
} from "node:fs/promises";
import path from "node:path";
import type { TestInfo } from "@playwright/test";
import type {
  CaliforniaCanvasGraphicsNoDeployMarker,
  CaliforniaSignatureControlQaNoDeployMarker
} from "./california-signature-composed-staging";
import {
  CALIFORNIA_SIGNATURE_EXHAUSTIVE_SCHEMA_VERSION,
  assertCaliforniaSignatureExactEvidenceRecordSchema,
  assertReviewedCaliforniaSignatureExhaustiveSnapshotCandidate,
  buildCaliforniaSignatureSourceExecutionGroups,
  californiaSignatureAxisIdsForProject,
  californiaSignatureExactEvidenceOrderKey,
  californiaSignatureExpandedOracleKeyFromRecord,
  iterateCaliforniaSignatureExpandedSourceEvidenceOracle,
  snapshotCaliforniaSignatureExhaustiveEvidence,
  validateCaliforniaSignatureEvidenceRecords,
  type CaliforniaSignatureExternalEvidenceExpectations,
  type CaliforniaSignatureExactEvidenceRecord
} from "./california-signature-exhaustive-qa";
import { buildCaliforniaCanvasGraphicsSourceContract } from
  "./california-canvas-graphics-source-contract";
import {
  CALIFORNIA_SIGNATURE_MAX_EVIDENCE_RUN_BYTES,
  californiaSignatureEvidenceMerkleRootSha256,
  canonicalCaliforniaSignatureEvidenceJson,
  createCaliforniaSignatureEvidenceStreamWriter,
  readCaliforniaSignatureEvidenceStream,
  type CaliforniaSignatureEvidenceStreamManifest,
  type CaliforniaSignaturePartialEvidenceStreamDiagnostic
} from "./california-signature-evidence-stream";
import type { CaliforniaSignatureSourceManifest } from "./california-signature-control-manifest";
import {
  iterateCaliforniaSignatureSourceEvidenceOracleRows,
  type CaliforniaSignatureSourceExpectedEvidenceOracle
} from "./california-signature-source-expected-provider";
import {
  californiaSignatureFinalCompositorGroupKey,
  summarizeCaliforniaSignatureFinalCompositorCapacityGroups,
  type CaliforniaSignatureFinalCompositorCapacitySourceIdentity,
  type CaliforniaSignatureFinalCompositorExecutionGroupSummary,
  type CaliforniaSignatureFinalCompositorPartitionPlan
} from "./california-signature-final-compositor-capacity-plan";

export const CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION = 3;
export const CALIFORNIA_SIGNATURE_EXECUTION_GROUP_OWNERSHIP_SCHEMA_VERSION = 1;
export const CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX = ".signature-exhaustive.json";
export const CALIFORNIA_SIGNATURE_PARTIAL_ARTIFACT_SUFFIX = ".signature-exhaustive.partial.json";
export const CALIFORNIA_SIGNATURE_FAILURE_ARTIFACT_SUFFIX = ".signature-exhaustive.failure.json";
export const CALIFORNIA_SIGNATURE_RUN_MANIFEST_FILENAME = ".california-signature-exhaustive-run.json";
export const CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME = ".california-signature-exhaustive-seal.json";
export const CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME =
  ".california-signature-exhaustive-producer-success.json";
export const CALIFORNIA_SIGNATURE_EVIDENCE_RESERVATION_SUFFIX =
  ".signature-evidence-reservation.json";
export const CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS = ["desktop-chrome", "mobile-chrome"] as const;
export const CALIFORNIA_SIGNATURE_FROZEN_BENCHES_PER_PACKAGE = 4;
const CALIFORNIA_SIGNATURE_EVIDENCE_RESERVATION_BLOCK_BYTES = 64 * 1024 * 1024;

const ID_PATTERN = /^[a-z0-9:_-]{24,128}$/i;
const LOGICAL_SEGMENT_PATTERN = /^[a-z0-9._-]{1,160}$/i;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export type CaliforniaSignatureArtifactShard = { index: number; total: number } | null;

export type CaliforniaSignatureArtifactExecution = {
  repeatEachIndex: number;
  retry: 0;
};

export type CaliforniaSignatureRuntimeMarkerIdentities = {
  canvas: CaliforniaCanvasGraphicsNoDeployMarker;
  control: CaliforniaSignatureControlQaNoDeployMarker;
};

export type CaliforniaSignatureArtifactRunIdentity = {
  buildId: string;
  componentSourceSha256: string;
  controlBlueprintSha256: string;
  markerIdentities: CaliforniaSignatureRuntimeMarkerIdentities;
  markerIdentitiesSha256: string;
  origin: string;
  runId: string;
  runtimeRunId: string;
  sourceSnapshotSha256: string;
};

export type CaliforniaSignatureOfficialArtifact = CaliforniaSignatureArtifactRunIdentity & {
  artifactId: string;
  createdAt: string;
  evidenceSnapshot: CaliforniaSignatureEvidenceSnapshot;
  evidenceStream: CaliforniaSignatureEvidenceStreamManifest;
  evidenceStreamOwnershipSha256: string;
  execution: CaliforniaSignatureArtifactExecution;
  executionGroupOwnership: CaliforniaSignatureExecutionGroupOwnership | null;
  lifecycleSchemaVersion: typeof CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION;
  packageId: string;
  projectName: string;
  schemaVersion: number;
  shard: CaliforniaSignatureArtifactShard;
  terminalStatus: "passed";
};

export type CaliforniaSignatureDiagnosticArtifact = CaliforniaSignatureArtifactRunIdentity & {
  createdAt: string;
  diagnosticId: string;
  execution: { repeatEachIndex: number; retry: number; workerIndex: number };
  failure: { message: string; name: string };
  lifecycleSchemaVersion: typeof CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION;
  packageId: string;
  projectName: string;
  schemaVersion: number;
  shard: CaliforniaSignatureArtifactShard;
  streamDiagnostic: CaliforniaSignaturePartialEvidenceStreamDiagnostic | null;
  terminalStatus: "failed" | "partial";
};

export type CaliforniaSignatureEvidenceSnapshot = {
  blueprintSha256: string;
  keyCount: number;
  keysSha256: string;
  schemaVersion: typeof CALIFORNIA_SIGNATURE_EXHAUSTIVE_SCHEMA_VERSION;
};

type CaliforniaSignatureRunManifest = CaliforniaSignatureArtifactRunIdentity & {
  lifecycleSchemaVersion: typeof CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION;
  officialArtifactSuffix: typeof CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX;
  requiredProjects: readonly string[];
  status: "open";
};

type CaliforniaSignatureArtifactByteIdentity = {
  artifactId: string;
  evidenceChunkMerkleRootSha256: string;
  evidenceChunks: readonly CaliforniaSignatureEvidenceChunkByteIdentity[];
  evidenceFramedBytes: number;
  evidenceManifestSha256: string;
  evidenceRecordCount: number;
  evidenceStreamOwnershipSha256: string;
  executionGroupOwnership: CaliforniaSignatureExecutionGroupOwnership | null;
  fileName: string;
  sha256: string;
};

type CaliforniaSignatureEvidenceChunkByteIdentity = {
  fileName: string;
  framedBytes: number;
  recordCount: number;
  recordMerkleRootSha256: string;
  sha256: string;
};

type CaliforniaSignatureRunSeal = CaliforniaSignatureArtifactRunIdentity & {
  artifacts: readonly CaliforniaSignatureArtifactByteIdentity[];
  evidenceReservations: readonly CaliforniaSignatureEvidenceReservationIdentity[];
  expectedArtifactsSha256: string;
  lifecycleSchemaVersion: typeof CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION;
  manifestSha256: string;
  producerReportSha256: string;
  producerSuccessSha256: string;
  sealedAt: string;
  status: "sealed";
};

type CaliforniaSignatureProducerSuccess = CaliforniaSignatureArtifactRunIdentity & {
  artifacts: readonly CaliforniaSignatureArtifactByteIdentity[];
  evidenceReservations: readonly CaliforniaSignatureEvidenceReservationIdentity[];
  expectedArtifactsSha256: string;
  lifecycleSchemaVersion: typeof CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION;
  producerReportSha256: string;
  publishedAt: string;
  status: "producer-succeeded";
};

export type CaliforniaSignatureSealReceipt = {
  fileName: typeof CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME;
  sha256: string;
};

export type CaliforniaSignatureProducerSuccessReceipt = {
  fileName: typeof CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME;
  sha256: string;
};

export type CaliforniaSignatureExpectedArtifact = {
  artifactId: string;
  benchIds: readonly string[];
  execution: CaliforniaSignatureArtifactExecution;
  executionGroupOwnership: CaliforniaSignatureExecutionGroupOwnership | null;
  fileName: string;
  packageId: string;
  projectName: string;
  shard: CaliforniaSignatureArtifactShard;
};

export type CaliforniaSignatureArtifactValidationContext = {
  externalExpectations: CaliforniaSignatureExternalEvidenceExpectations;
  expectedBenchIds: readonly string[];
  executionGroupOwnership: CaliforniaSignatureExecutionGroupOwnership | null;
  manifest: CaliforniaSignatureSourceManifest;
  sourceEvidenceOracle: CaliforniaSignatureSourceExpectedEvidenceOracle;
};

export type CaliforniaSignatureExecutionGroupOwnership = {
  cropCount: number;
  expectedRecordCount: number;
  groupKeys: readonly string[];
  planSha256: string;
  receiptCount: number;
  schemaVersion: typeof CALIFORNIA_SIGNATURE_EXECUTION_GROUP_OWNERSHIP_SCHEMA_VERSION;
  sourceIdentitySha256: string;
  sourceSnapshotSha256: string;
};

export type CaliforniaSignatureExecutionGroupOwnershipProjectSlice = {
  benchIds: readonly string[];
  cropCount: number;
  expectedRecordCount: number;
  groupKeys: readonly string[];
  projectName: typeof CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS[number];
  receiptCount: number;
};

export type CaliforniaSignatureExecutionGroupOwnershipManifest = {
  capacityPlanSha256: string;
  cropCount: number;
  evidenceRecordCount: number;
  formalExecutionAuthorized: false;
  groupCount: number;
  packages: readonly {
    packageId: string;
    projects: readonly CaliforniaSignatureExecutionGroupOwnershipProjectSlice[];
    slotIndex: number;
  }[];
  receiptCount: number;
  schemaVersion: typeof CALIFORNIA_SIGNATURE_EXECUTION_GROUP_OWNERSHIP_SCHEMA_VERSION;
  sourceIdentitySha256: string;
  sourceSnapshotSha256: string;
  status: "diagnostic-capacity-partition";
};

export class CaliforniaSignatureCapacityAuthorizationHoldError extends Error {
  constructor(message =
    "California signature exhaustive execution is on HOLD: the capacity partition is diagnostic-only and no reviewed measured authorization receipt exists") {
    super(message);
    this.name = "CaliforniaSignatureCapacityAuthorizationHoldError";
  }
}

const californiaSignatureValidatedExecutionGroupOwnershipFingerprints =
  new WeakMap<object, string>();

export function assertCaliforniaSignatureFormalExecutionAuthorizationUnavailable(
  manifest: CaliforniaSignatureExecutionGroupOwnershipManifest
): void {
  assert.equal(manifest.formalExecutionAuthorized, false,
    "California signature diagnostic ownership manifest changed authorization state");
  assert.equal(manifest.status, "diagnostic-capacity-partition",
    "California signature diagnostic ownership manifest status drifted");
  throw new CaliforniaSignatureCapacityAuthorizationHoldError();
}

const californiaSignatureBoundedFixtureStreamSha256 = new Set<string>();

export type CaliforniaSignatureLoadedArtifact = {
  artifact: CaliforniaSignatureOfficialArtifact;
  fileName: string;
  fileSha256: string;
  runDirectory: string;
};

type CaliforniaSignatureEvidenceReservationIdentity = {
  artifactId: string;
  bytes: number;
  fileName: string;
  sha256: string;
};

const RUN_IDENTITY_KEYS = [
  "buildId",
  "componentSourceSha256",
  "controlBlueprintSha256",
  "markerIdentities",
  "markerIdentitiesSha256",
  "origin",
  "runId",
  "runtimeRunId",
  "sourceSnapshotSha256"
] as const;

const OFFICIAL_ARTIFACT_KEYS = [
  ...RUN_IDENTITY_KEYS,
  "artifactId",
  "createdAt",
  "evidenceSnapshot",
  "evidenceStream",
  "evidenceStreamOwnershipSha256",
  "execution",
  "executionGroupOwnership",
  "lifecycleSchemaVersion",
  "packageId",
  "projectName",
  "schemaVersion",
  "shard",
  "terminalStatus"
] as const;

const RUN_MANIFEST_KEYS = [
  ...RUN_IDENTITY_KEYS,
  "lifecycleSchemaVersion",
  "officialArtifactSuffix",
  "requiredProjects",
  "status"
] as const;

const RUN_SEAL_KEYS = [
  ...RUN_IDENTITY_KEYS,
  "artifacts",
  "evidenceReservations",
  "expectedArtifactsSha256",
  "lifecycleSchemaVersion",
  "manifestSha256",
  "producerReportSha256",
  "producerSuccessSha256",
  "sealedAt",
  "status"
] as const;

const PRODUCER_SUCCESS_KEYS = [
  ...RUN_IDENTITY_KEYS,
  "artifacts",
  "evidenceReservations",
  "expectedArtifactsSha256",
  "lifecycleSchemaVersion",
  "producerReportSha256",
  "publishedAt",
  "status"
] as const;

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function capacityStableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(capacityStableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([key, nested]) => `${JSON.stringify(key)}:${capacityStableJson(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function assertNonNegativeSafeInteger(value: number, label: string) {
  assert.ok(Number.isSafeInteger(value) && value >= 0,
    `${label}: expected one non-negative safe integer`);
  return value;
}

function assertPositiveSafeInteger(value: number, label: string) {
  assert.ok(Number.isSafeInteger(value) && value > 0,
    `${label}: expected one positive safe integer`);
  return value;
}

function executionGroupOwnershipSha256(
  ownership: CaliforniaSignatureExecutionGroupOwnership | null
) {
  return sha256(capacityStableJson(ownership));
}

function evidenceStreamOwnershipSha256(options: {
  evidenceStream: CaliforniaSignatureEvidenceStreamManifest;
  ownership: CaliforniaSignatureExecutionGroupOwnership | null;
}) {
  return sha256(capacityStableJson({
    evidenceStreamManifestSha256: sha256(
      canonicalCaliforniaSignatureEvidenceJson(options.evidenceStream)
    ),
    executionGroupOwnershipSha256: executionGroupOwnershipSha256(options.ownership)
  }));
}

function markCaliforniaSignatureExecutionGroupOwnershipValidated(
  manifest: CaliforniaSignatureExecutionGroupOwnershipManifest
) {
  californiaSignatureValidatedExecutionGroupOwnershipFingerprints.set(
    manifest,
    sha256(capacityStableJson(manifest))
  );
  return manifest;
}

function assertCaliforniaSignatureExecutionGroupOwnershipValidated(
  manifest: CaliforniaSignatureExecutionGroupOwnershipManifest
) {
  const expectedFingerprint =
    californiaSignatureValidatedExecutionGroupOwnershipFingerprints.get(manifest);
  assert.ok(expectedFingerprint,
    "California signature group-owned matrix requires one opaque validated ownership manifest");
  assert.equal(
    sha256(capacityStableJson(manifest)),
    expectedFingerprint,
    "California signature validated ownership manifest changed after validation"
  );
}

export function californiaSignatureArtifactValidationContextKey(
  projectName: string,
  packageId: string
) {
  assertLogicalSegment(projectName, "California signature validation-context projectName");
  assertLogicalSegment(packageId, "California signature validation-context packageId");
  return `${projectName}\0${packageId}`;
}

function assertExecutionGroupOwnership(
  value: CaliforniaSignatureExecutionGroupOwnership | null,
  label: string
) {
  if (value === null) return;
  assert.deepEqual(Object.keys(value).sort(), [
    "cropCount",
    "expectedRecordCount",
    "groupKeys",
    "planSha256",
    "receiptCount",
    "schemaVersion",
    "sourceIdentitySha256",
    "sourceSnapshotSha256"
  ].sort(), `${label}: exact execution-group ownership schema drifted`);
  assert.equal(value.schemaVersion,
    CALIFORNIA_SIGNATURE_EXECUTION_GROUP_OWNERSHIP_SCHEMA_VERSION,
  `${label}: execution-group ownership schema drifted`);
  assertPositiveSafeInteger(value.expectedRecordCount, `${label}: expected record count`);
  assertNonNegativeSafeInteger(value.cropCount, `${label}: crop count`);
  assertNonNegativeSafeInteger(value.receiptCount, `${label}: receipt count`);
  assertSha256(value.planSha256, `${label}: capacity plan SHA`);
  assertSha256(value.sourceIdentitySha256, `${label}: source identity SHA`);
  assertSha256(value.sourceSnapshotSha256, `${label}: source snapshot SHA`);
  assert.ok(Array.isArray(value.groupKeys) && value.groupKeys.length > 0,
    `${label}: execution-group ownership has no group keys`);
  assert.equal(new Set(value.groupKeys).size, value.groupKeys.length,
    `${label}: execution-group ownership repeats a group key`);
  for (const groupKey of value.groupKeys) {
    assert.ok(typeof groupKey === "string" && groupKey.length > 0 &&
      groupKey.split("\0").length === 4,
    `${label}: malformed execution group key`);
  }
}

export function buildCaliforniaSignatureExecutionGroupOwnershipManifest(options: {
  capacityPlan: CaliforniaSignatureFinalCompositorPartitionPlan;
  executionGroups: readonly CaliforniaSignatureFinalCompositorExecutionGroupSummary[];
  sourceIdentity: CaliforniaSignatureFinalCompositorCapacitySourceIdentity;
  sourceSnapshotSha256: string;
}): CaliforniaSignatureExecutionGroupOwnershipManifest {
  assertRecord(options.capacityPlan,
    "California signature execution ownership capacity plan");
  assertExactKeys(options.capacityPlan as unknown as Record<string, unknown>, [
    "packages",
    "planSha256",
    "projectNames",
    "schemaVersion",
    "slotCount",
    "sourceIdentitySha256",
    "terminalArtifactTarget"
  ], "California signature execution ownership capacity plan");
  assertSha256(options.sourceSnapshotSha256,
    "California signature execution ownership source snapshot");
  assert.equal(options.sourceIdentity.sourceSnapshotSha256, options.sourceSnapshotSha256,
    "California signature execution ownership mixes the frozen source snapshot");
  assert.equal(options.sourceIdentity.unreviewedDiagnostic, false,
    "California signature execution ownership rejects an unreviewed source identity");
  const sourceIdentitySha256 = sha256(capacityStableJson(options.sourceIdentity));
  assert.equal(options.capacityPlan.sourceIdentitySha256, sourceIdentitySha256,
    "California signature capacity plan cites another source identity");
  const { planSha256, ...planBase } = options.capacityPlan;
  assertSha256(planSha256, "California signature execution ownership capacity plan SHA");
  assert.equal(planSha256, sha256(capacityStableJson(planBase)),
    "California signature execution ownership capacity plan digest drifted");
  assert.equal(options.capacityPlan.schemaVersion, 1,
    "California signature execution ownership capacity plan schema drifted");
  assert.deepEqual(options.capacityPlan.projectNames,
    [...CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS],
  "California signature execution ownership projects drifted");
  assert.equal(options.capacityPlan.terminalArtifactTarget, 102,
    "California signature execution ownership must preserve 102 terminal artifacts");
  assert.equal(options.capacityPlan.slotCount, 51,
    "California signature execution ownership must preserve 51 package slots");
  assert.equal(options.capacityPlan.packages.length, 51,
    "California signature execution ownership must publish 51 package slots");

  const groupSummary = summarizeCaliforniaSignatureFinalCompositorCapacityGroups(
    options.executionGroups.map((group) => ({ ...group, weightMs: 1 }))
  );
  assert.equal(groupSummary.groupsSha256, options.sourceIdentity.groupsSha256,
    "California signature execution groups differ from the exact source identity");
  assert.equal(groupSummary.groupCount, options.sourceIdentity.groupCount,
    "California signature execution group count differs from source identity");
  assert.equal(groupSummary.evidenceRecordCount, options.sourceIdentity.evidenceRecordCount,
    "California signature execution record count differs from source identity");
  assert.equal(groupSummary.cropCount, options.sourceIdentity.cropCount,
    "California signature execution crop count differs from source identity");
  assert.equal(groupSummary.receiptCount, options.sourceIdentity.receiptCount,
    "California signature execution receipt count differs from source identity");
  assert.deepEqual(groupSummary.projects, options.sourceIdentity.projects,
    "California signature execution project counters differ from source identity");

  const groupsByKey = new Map(options.executionGroups.map((group) => [group.groupKey, group]));
  assert.equal(groupsByKey.size, options.executionGroups.length,
    "California signature execution ownership source groups repeat a key");
  const packageIds = new Set<string>();
  const plannedByProject = new Map<string, string[]>(
    CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS.map((projectName) => [projectName, []])
  );
  const packages = options.capacityPlan.packages.map((workPackage, slotIndex) => {
    assertRecord(workPackage,
      `California signature execution ownership package slot ${slotIndex}`);
    assertExactKeys(workPackage as unknown as Record<string, unknown>, [
      "packageId",
      "projects",
      "slotIndex"
    ], `California signature execution ownership package slot ${slotIndex}`);
    assert.equal(workPackage.slotIndex, slotIndex,
      "California signature execution ownership package slots are missing or retrograde");
    assertLogicalSegment(workPackage.packageId,
      "California signature execution ownership packageId");
    assert.equal(
      workPackage.packageId,
      `signature-final-compositor-capacity-${String(slotIndex + 1).padStart(3, "0")}`,
      "California signature execution ownership canonical packageId drifted"
    );
    assert.ok(!packageIds.has(workPackage.packageId),
      `California signature execution ownership repeats package ${workPackage.packageId}`);
    packageIds.add(workPackage.packageId);
    assert.equal(workPackage.projects.length, CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS.length,
      `${workPackage.packageId}: execution ownership project slice count drifted`);
    const projects = CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS.map((projectName, projectIndex) => {
      const slice = workPackage.projects[projectIndex];
      assert.ok(slice, `${workPackage.packageId}/${projectName}: project slice is missing`);
      assertRecord(slice,
        `${workPackage.packageId}/${projectName}: execution ownership project slice`);
      assertExactKeys(slice as unknown as Record<string, unknown>, [
        "groupKeys",
        "projectName",
        "weightMs"
      ], `${workPackage.packageId}/${projectName}: execution ownership project slice`);
      assert.equal(slice.projectName, projectName,
        `${workPackage.packageId}: execution ownership project order drifted`);
      assertPositiveSafeInteger(slice.weightMs,
        `${workPackage.packageId}/${projectName}: diagnostic group weight`);
      assert.ok(slice.groupKeys.length > 0,
        `${workPackage.packageId}/${projectName}: execution ownership slice is empty`);
      assert.equal(new Set(slice.groupKeys).size, slice.groupKeys.length,
        `${workPackage.packageId}/${projectName}: execution ownership slice repeats a group`);
      let expectedRecordCount = 0;
      let cropCount = 0;
      let receiptCount = 0;
      const benchIds: string[] = [];
      const seenBenches = new Set<string>();
      for (const groupKey of slice.groupKeys) {
        const group = groupsByKey.get(groupKey);
        assert.ok(group,
          `${workPackage.packageId}/${projectName}: capacity plan cites unknown group ${groupKey}`);
        assert.equal(group.projectName, projectName,
          `${workPackage.packageId}/${groupKey}: capacity plan swaps group projects`);
        assert.equal(group.groupKey, californiaSignatureFinalCompositorGroupKey(group),
          `${workPackage.packageId}/${groupKey}: capacity plan group identity drifted`);
        expectedRecordCount += group.expectedRecordCount;
        cropCount += group.cropCount;
        receiptCount += group.receiptCount;
        assert.ok(Number.isSafeInteger(expectedRecordCount) && Number.isSafeInteger(cropCount) &&
          Number.isSafeInteger(receiptCount),
        `${workPackage.packageId}/${projectName}: execution ownership counters overflowed`);
        if (!seenBenches.has(group.benchId)) {
          seenBenches.add(group.benchId);
          benchIds.push(group.benchId);
        }
      }
      plannedByProject.get(projectName)!.push(...slice.groupKeys);
      return {
        benchIds,
        cropCount,
        expectedRecordCount,
        groupKeys: [...slice.groupKeys],
        projectName,
        receiptCount
      };
    });
    return { packageId: workPackage.packageId, projects, slotIndex };
  });

  for (const projectName of CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS) {
    const expected = options.executionGroups
      .filter((group) => group.projectName === projectName)
      .map((group) => group.groupKey);
    const actual = plannedByProject.get(projectName)!;
    assert.deepEqual(actual, expected,
      `${projectName}: capacity packages are not the exact ordered source group union`);
    assert.equal(new Set(actual).size, actual.length,
      `${projectName}: capacity packages repeat an execution group`);
  }
  return markCaliforniaSignatureExecutionGroupOwnershipValidated({
    capacityPlanSha256: planSha256,
    cropCount: options.sourceIdentity.cropCount,
    evidenceRecordCount: options.sourceIdentity.evidenceRecordCount,
    formalExecutionAuthorized: false,
    groupCount: options.sourceIdentity.groupCount,
    packages,
    receiptCount: options.sourceIdentity.receiptCount,
    schemaVersion: CALIFORNIA_SIGNATURE_EXECUTION_GROUP_OWNERSHIP_SCHEMA_VERSION,
    sourceIdentitySha256,
    sourceSnapshotSha256: options.sourceSnapshotSha256,
    status: "diagnostic-capacity-partition"
  });
}

function assertSha256(value: string, label: string) {
  assert.match(value, SHA256_PATTERN, `${label}: expected one exact lowercase SHA-256`);
  return value;
}

function exactStringSet(expectedInput: readonly string[], actualInput: readonly string[], label: string) {
  assert.equal(new Set(expectedInput).size, expectedInput.length, `${label}: duplicate expected values`);
  assert.equal(new Set(actualInput).size, actualInput.length, `${label}: duplicate actual values`);
  assert.deepEqual([...actualInput].sort(), [...expectedInput].sort(), `${label}: exact values drifted`);
}

export function buildCaliforniaSignatureArtifactValidationContext(options: {
  expectedBenchIds: readonly string[];
  executionGroupOwnership?: CaliforniaSignatureExecutionGroupOwnership | null;
  externalExpectations: CaliforniaSignatureExternalEvidenceExpectations;
  manifest: CaliforniaSignatureSourceManifest;
  projectName?: string;
  sourceEvidenceOracle: CaliforniaSignatureSourceExpectedEvidenceOracle;
}): CaliforniaSignatureArtifactValidationContext {
  assert.ok(options.expectedBenchIds.length > 0,
    "California signature artifact validation requires at least one expected bench");
  assert.equal(new Set(options.expectedBenchIds).size, options.expectedBenchIds.length,
    "California signature artifact validation repeats an expected bench");
  const fullBenches = new Map<string, CaliforniaSignatureSourceManifest["benches"][number]>(
    options.manifest.benches.map((bench) => [bench.benchId, bench])
  );
  const benches = options.expectedBenchIds.map((benchId) => {
    const bench = fullBenches.get(benchId);
    assert.ok(bench, `California signature artifact validation cites unknown bench ${benchId}`);
    return bench;
  });
  const benchIds = new Set(options.expectedBenchIds);
  const states = options.sourceEvidenceOracle.states.filter((state) => benchIds.has(state.benchId));
  const evidenceRows = [...iterateCaliforniaSignatureSourceEvidenceOracleRows({
    benchIds: options.expectedBenchIds,
    manifest: options.manifest,
    oracle: options.sourceEvidenceOracle
  })];
  assert.ok(evidenceRows.length > 0,
    "California signature package source oracle contains no expected evidence rows");
  const combinationRows = evidenceRows.filter((row) => row.rowKind === "combination");
  const combinationCountsByState = new Map<string, number>();
  for (const row of combinationRows) {
    const stateKey = stableJson({ benchId: row.benchId, branchPath: row.branchPath, stepKey: row.stepKey });
    combinationCountsByState.set(stateKey, (combinationCountsByState.get(stateKey) ?? 0) + 1);
  }
  let pairwisePeak = { rowCount: 0, stateKey: "" };
  for (const state of states) {
    const rowCount = combinationCountsByState.get(state.key) ?? 0;
    if (rowCount > pairwisePeak.rowCount) pairwisePeak = { rowCount, stateKey: state.key };
  }
  const numericOccurrences = states.flatMap((state) => state.controls.filter(
    (control) => control.numericMidpoint !== null
  ));
  const numericUnavailable = numericOccurrences.filter(
    (control) => control.numericMidpoint?.status === "unavailable"
  );
  const numericUnavailableContracts = new Set(numericUnavailable.map((control) => stableJson({
    benchId: control.benchId,
    instanceKey: control.instanceKey,
    numericMidpoint: control.numericMidpoint,
    sourceSiteKey: control.sourceSiteKey
  })));
  const numericUnavailableSites = new Set(numericUnavailable.map(
    (control) => `${control.benchId}\0${control.sourceSiteKey}`
  ));
  const sourceEvidenceOracle: CaliforniaSignatureSourceExpectedEvidenceOracle = {
    ...options.sourceEvidenceOracle,
    counts: {
      authoredStates: states.filter((state) => state.kind === "authored").length,
      branchStates: states.filter((state) => state.kind === "branch").length,
      canvasReceiptRows: evidenceRows.filter((row) =>
        (row.canvasSurface?.requiredPhases.length ?? 0) > 0
      ).length,
      combinationOccurrences: combinationRows.length,
      controlOccurrences: states.reduce((sum, state) => sum + state.controls.length, 0),
      endpointOccurrences: states.reduce((sum, state) => sum +
        state.controls.reduce((controlSum, control) => controlSum + control.activeEndpoints.length, 0), 0),
      evidenceControlRows: evidenceRows.filter((row) => row.rowKind === "control").length,
      evidenceCombinationRows: combinationRows.length,
      evidenceEndpointRows: evidenceRows.filter((row) => row.rowKind === "endpoint").length,
      evidenceRows: evidenceRows.length,
      evidenceStateRows: evidenceRows.filter((row) => row.rowKind === "authored-state").length,
      numericAvailableOccurrences: numericOccurrences.length - numericUnavailable.length,
      numericOccurrences: numericOccurrences.length,
      numericUnavailableContracts: numericUnavailableContracts.size,
      numericUnavailableOccurrences: numericUnavailable.length,
      numericUnavailableSites: numericUnavailableSites.size,
      reachableStates: states.length
    },
    evidenceKeysSha256: sha256(evidenceRows.map((row) => row.key).sort().join("\n")),
    pairwisePeak,
    states
  };
  const manifest: CaliforniaSignatureSourceManifest = {
    ...options.manifest,
    benches,
    counts: {
      benches: benches.length,
      controlSites: benches.reduce((sum, bench) => sum + bench.controlSites.length, 0),
      exactMultiplicitySites: benches.reduce((sum, bench) =>
        sum + bench.controlSites.filter((site) => site.multiplicityIsExact).length, 0),
      lessonChoices: benches.reduce((sum, bench) =>
        sum + bench.lessonSteps.reduce((stepSum, step) => stepSum + step.choiceCount, 0), 0),
      lessonSteps: benches.reduce((sum, bench) => sum + bench.lessonSteps.length, 0),
      unresolvedInteractions: benches.reduce((sum, bench) => sum + bench.unresolvedInteractions.length, 0)
    }
  };
  const routes = options.externalExpectations.routes.filter((route) => benchIds.has(route.benchId));
  exactStringSet(options.expectedBenchIds, routes.map((route) => route.benchId),
    "California signature package external route ownership");
  const executionGroupOwnership = options.executionGroupOwnership ?? null;
  assertExecutionGroupOwnership(executionGroupOwnership,
    "California signature artifact validation context");
  if (executionGroupOwnership) {
    assert.ok(options.projectName && CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS.includes(
      options.projectName as typeof CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS[number]
    ), "California signature group-owned validation context requires one formal project");
    const projectName = options.projectName as
      typeof CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS[number];
    const selectedGroupKeys = new Set(executionGroupOwnership.groupKeys);
    const sourceGroups = buildCaliforniaSignatureSourceExecutionGroups({
      benchIds: options.expectedBenchIds,
      manifest: options.manifest,
      oracle: options.sourceEvidenceOracle,
      projectName
    }).map((group) => ({
      ...group,
      groupKey: californiaSignatureFinalCompositorGroupKey({ ...group, projectName })
    })).filter((group) => selectedGroupKeys.has(group.groupKey));
    assert.deepEqual(sourceGroups.map((group) => group.groupKey),
      executionGroupOwnership.groupKeys,
    "California signature validation context group keys differ from exact source order");
    assert.equal(sourceGroups.reduce((sum, group) => sum + group.expectedRecordCount, 0),
      executionGroupOwnership.expectedRecordCount,
    "California signature validation context record count differs from exact source groups");
    assert.equal(sourceGroups.length, executionGroupOwnership.groupKeys.length,
      "California signature validation context has missing or duplicate source groups");
  }
  return {
    expectedBenchIds: [...options.expectedBenchIds],
    executionGroupOwnership: executionGroupOwnership
      ? structuredClone(executionGroupOwnership)
      : null,
    externalExpectations: { ...options.externalExpectations, routes },
    manifest,
    sourceEvidenceOracle
  };
}

function validateCaliforniaSignatureOfficialEvidence(options: {
  context: CaliforniaSignatureArtifactValidationContext;
  evidence: readonly CaliforniaSignatureExactEvidenceRecord[];
  identity: CaliforniaSignatureArtifactRunIdentity;
  label: string;
}) {
  assert.equal(options.context.externalExpectations.expectedOrigin, options.identity.origin,
    `${options.label}: validation origin is not bound to the artifact run`);
  assert.equal(options.context.externalExpectations.expectedRuntimeRunId, options.identity.runtimeRunId,
    `${options.label}: validation runtime is not bound to the artifact run`);
  assert.equal(options.context.manifest.componentSourceSha256, options.identity.componentSourceSha256,
    `${options.label}: validation component source is not bound to the artifact run`);
  assert.equal(options.context.manifest.blueprintSha256, options.identity.controlBlueprintSha256,
    `${options.label}: validation control blueprint is not bound to the artifact run`);
  exactStringSet(
    options.context.expectedBenchIds,
    [...new Set(options.evidence.map((record) => record.benchId))],
    `${options.label}: package evidence benches`
  );
  validateCaliforniaSignatureEvidenceRecords({
    evidence: options.evidence,
    externalExpectations: options.context.externalExpectations,
    manifest: options.context.manifest,
    sourceEvidenceOracle: options.context.sourceEvidenceOracle
  });
  return snapshotCaliforniaSignatureExhaustiveEvidence(options.evidence);
}

function californiaSignatureEvidenceSnapshotFromStream(
  context: CaliforniaSignatureArtifactValidationContext,
  stream: CaliforniaSignatureEvidenceStreamManifest
): CaliforniaSignatureEvidenceSnapshot {
  return {
    blueprintSha256: context.manifest.blueprintSha256,
    keyCount: stream.recordCount,
    keysSha256: stream.orderedEvidenceKeySha256,
    schemaVersion: CALIFORNIA_SIGNATURE_EXHAUSTIVE_SCHEMA_VERSION
  };
}

function* iterateCaliforniaSignatureOwnedExpandedSourceEvidence(options: {
  context: CaliforniaSignatureArtifactValidationContext;
  projectName: typeof CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS[number];
}) {
  const ownership = options.context.executionGroupOwnership;
  const groupKeys = ownership ? new Set(ownership.groupKeys) : null;
  let ownedGroupCount = 0;
  let previousGroupKey: string | null = null;
  for (const expectation of iterateCaliforniaSignatureExpandedSourceEvidenceOracle({
    axisIds: californiaSignatureAxisIdsForProject(options.projectName),
    benchIds: options.context.expectedBenchIds,
    manifest: options.context.manifest,
    oracle: options.context.sourceEvidenceOracle
  })) {
    const groupKey = californiaSignatureFinalCompositorGroupKey({
      axisId: expectation.axisId,
      benchId: expectation.benchId,
      phase: expectation.phase,
      projectName: options.projectName
    });
    if (groupKeys && !groupKeys.has(groupKey)) continue;
    if (groupKey !== previousGroupKey) {
      ownedGroupCount += 1;
      previousGroupKey = groupKey;
    }
    yield expectation;
  }
  if (ownership) {
    assert.equal(ownedGroupCount, ownership.groupKeys.length,
      "California signature owned source iterator lost an execution group");
  }
}

async function validateCaliforniaSignatureOfficialEvidenceStream(options: {
  artifact: CaliforniaSignatureOfficialArtifact;
  context: CaliforniaSignatureArtifactValidationContext;
  identity: CaliforniaSignatureArtifactRunIdentity;
  label: string;
  runDirectory: string;
}) {
  assert.equal(options.context.externalExpectations.expectedOrigin, options.identity.origin,
    `${options.label}: validation origin is not bound to the artifact run`);
  assert.equal(options.context.externalExpectations.expectedRuntimeRunId, options.identity.runtimeRunId,
    `${options.label}: validation runtime is not bound to the artifact run`);
  assert.equal(options.context.manifest.componentSourceSha256, options.identity.componentSourceSha256,
    `${options.label}: validation component source is not bound to the artifact run`);
  assert.equal(options.context.manifest.blueprintSha256, options.identity.controlBlueprintSha256,
    `${options.label}: validation control blueprint is not bound to the artifact run`);
  assert.ok(CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS.includes(
    options.artifact.projectName as typeof CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS[number]
  ), `${options.label}: unsupported project ${options.artifact.projectName}`);
  const projectName = options.artifact.projectName as
    typeof CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS[number];
  assert.deepEqual(options.artifact.executionGroupOwnership,
    options.context.executionGroupOwnership,
  `${options.label}: artifact/validation execution-group ownership drifted`);
  assertExecutionGroupOwnership(options.artifact.executionGroupOwnership,
    `${options.label}: official artifact execution-group ownership`);
  if (options.artifact.executionGroupOwnership) {
    assert.equal(options.artifact.executionGroupOwnership.sourceSnapshotSha256,
      options.identity.sourceSnapshotSha256,
    `${options.label}: execution-group ownership mixes the artifact source snapshot`);
  }
  assert.equal(options.artifact.evidenceStreamOwnershipSha256,
    evidenceStreamOwnershipSha256({
      evidenceStream: options.artifact.evidenceStream,
      ownership: options.artifact.executionGroupOwnership
    }),
  `${options.label}: evidence stream is not bound to execution-group ownership`);
  if (californiaSignatureBoundedFixtureStreamSha256.has(
    sha256(stableJson(options.artifact.evidenceStream))
  )) {
    assert.equal(options.artifact.executionGroupOwnership, null,
      `${options.label}: bounded legacy fixture cannot impersonate group-plan ownership`);
    const records: CaliforniaSignatureExactEvidenceRecord[] = [];
    for await (const rawRecord of readCaliforniaSignatureEvidenceStream({
      manifest: options.artifact.evidenceStream,
      orderKey(record) {
        assertCaliforniaSignatureExactEvidenceRecordSchema(record, `${options.label}: fixture order`);
        return californiaSignatureExactEvidenceOrderKey({
          manifest: options.context.manifest,
          record
        });
      },
      runDirectory: options.runDirectory
    })) {
      assertCaliforniaSignatureExactEvidenceRecordSchema(rawRecord, `${options.label}: fixture record`);
      records.push(rawRecord);
      assert.ok(records.length <= 4_096,
        `${options.label}: bounded fixture record cap exceeded`);
    }
    validateCaliforniaSignatureEvidenceRecords({
      evidence: records,
      externalExpectations: options.context.externalExpectations,
      manifest: options.context.manifest
    });
    exactStringSet(
      options.context.expectedBenchIds,
      [...new Set(records.map((record) => record.benchId))],
      `${options.label}: fixture package evidence benches`
    );
    const snapshot = californiaSignatureEvidenceSnapshotFromStream(
      options.context,
      options.artifact.evidenceStream
    );
    assert.deepEqual(options.artifact.evidenceSnapshot, snapshot,
      `${options.label}: fixture snapshot drifted`);
    return snapshot;
  }
  const expected = iterateCaliforniaSignatureOwnedExpandedSourceEvidence({
    context: options.context,
    projectName
  });
  const observedBenches = new Set<string>();
  const observedGroupKeys = new Set<string>();
  const observedReceiptIds = new Set<string>();
  let observedCropCount = 0;
  let expectedEntry = expected.next();
  let recordCount = 0;
  let validationBatch: CaliforniaSignatureExactEvidenceRecord[] = [];
  let validationBatchBytes = 0;
  const flushValidationBatch = () => {
    if (validationBatch.length === 0) return;
    validateCaliforniaSignatureEvidenceRecords({
      evidence: validationBatch,
      externalExpectations: options.context.externalExpectations,
      manifest: options.context.manifest
    });
    validationBatch = [];
    validationBatchBytes = 0;
  };
  for await (const rawRecord of readCaliforniaSignatureEvidenceStream({
    manifest: options.artifact.evidenceStream,
    orderKey(record) {
      assertCaliforniaSignatureExactEvidenceRecordSchema(
        record,
        `${options.label}: stream order record`
      );
      return californiaSignatureExactEvidenceOrderKey({
        manifest: options.context.manifest,
        record
      });
    },
    runDirectory: options.runDirectory
  })) {
    assertCaliforniaSignatureExactEvidenceRecordSchema(
      rawRecord,
      `${options.label}: record ${recordCount}`
    );
    const record = rawRecord;
    const recordGroupKey = californiaSignatureFinalCompositorGroupKey({
      axisId: record.axisId,
      benchId: record.benchId,
      phase: record.phase,
      projectName
    });
    if (options.artifact.executionGroupOwnership) {
      assert.ok(options.artifact.executionGroupOwnership.groupKeys.includes(recordGroupKey),
        `${options.label}: record escaped plan-owned execution groups`);
    }
    observedGroupKeys.add(recordGroupKey);
    assert.equal(expectedEntry.done, false,
      `${options.label}: actual stream contains an extra record at ${record.key}`);
    const sourceExpectation = expectedEntry.value!;
    const orderKey = californiaSignatureExactEvidenceOrderKey({
      manifest: options.context.manifest,
      record
    });
    assert.equal(orderKey, sourceExpectation.orderKey,
      `${options.label}: actual/source semantic order key drifted`);
    assert.equal(
      californiaSignatureExpandedOracleKeyFromRecord({
        manifest: options.context.manifest,
        record
      }),
      sourceExpectation.key,
      `${options.label}: actual/source expanded identity is not exact`
    );
    assert.equal(record.benchId, sourceExpectation.benchId,
      `${options.label}: source expectation bench drifted`);
    const requiresCanvas = sourceExpectation.canvasSurface?.requiredPhases.includes(record.phase) ?? false;
    assert.equal(record.canvasGraphicsEvidence !== null, requiresCanvas,
      `${options.label}/${record.benchId}/${record.stepKey}: source-required Canvas receipt drifted`);
    if (requiresCanvas) {
      assert.ok(sourceExpectation.canvasSurface && record.canvasGraphicsEvidence,
        `${options.label}: source-required Canvas surface disappeared`);
      assert.equal(record.canvasGraphicsEvidence.surfaceKey, sourceExpectation.canvasSurface.surfaceKey,
        `${options.label}: Canvas surface identity drifted`);
      assert.deepEqual(
        record.canvasGraphicsEvidence.canvases.map((canvas) => canvas.bindingKey).sort(),
        [...sourceExpectation.canvasSurface.bindingKeys].sort(),
        `${options.label}: Canvas binding inventory drifted`
      );
      assert.equal(record.canvasGraphicsEvidence.canvases.length,
        sourceExpectation.canvasSurface.canvasCount,
      `${options.label}: Canvas count drifted`);
      assert.equal(observedReceiptIds.has(record.canvasGraphicsEvidence.receiptId), false,
        `${options.label}: duplicate one-shot Canvas receipt ${record.canvasGraphicsEvidence.receiptId}`);
      observedReceiptIds.add(record.canvasGraphicsEvidence.receiptId);
      observedCropCount += record.canvasGraphicsEvidence.canvases.length;
    }
    observedBenches.add(record.benchId);
    const canonicalBytes = Buffer.byteLength(canonicalCaliforniaSignatureEvidenceJson(record), "utf8");
    if (validationBatch.length > 0 &&
        (validationBatch.length >= 128 || validationBatchBytes + canonicalBytes > 16 * 1024 * 1024)) {
      flushValidationBatch();
    }
    validationBatch.push(record);
    validationBatchBytes += canonicalBytes;
    recordCount += 1;
    expectedEntry = expected.next();
  }
  flushValidationBatch();
  assert.equal(expectedEntry.done, true,
    `${options.label}: actual stream ended before the complete source oracle`);
  assert.equal(recordCount, options.artifact.evidenceStream.recordCount,
    `${options.label}: streamed record count drifted`);
  if (options.artifact.executionGroupOwnership) {
    assert.equal(recordCount, options.artifact.executionGroupOwnership.expectedRecordCount,
      `${options.label}: plan-owned record count drifted`);
    assert.deepEqual([...observedGroupKeys],
      options.artifact.executionGroupOwnership.groupKeys,
    `${options.label}: observed execution groups differ from plan ownership`);
    assert.equal(observedReceiptIds.size,
      options.artifact.executionGroupOwnership.receiptCount,
    `${options.label}: plan-owned Canvas receipt count drifted`);
    assert.equal(observedCropCount, options.artifact.executionGroupOwnership.cropCount,
      `${options.label}: plan-owned final-compositor crop count drifted`);
  }
  exactStringSet(
    options.context.expectedBenchIds,
    [...observedBenches],
    `${options.label}: package evidence benches`
  );
  const snapshot = californiaSignatureEvidenceSnapshotFromStream(
    options.context,
    options.artifact.evidenceStream
  );
  assert.deepEqual(options.artifact.evidenceSnapshot, snapshot,
    `${options.label}: evidence snapshot does not bind the complete stream`);
  return snapshot;
}

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${label}: expected one object`);
}

function assertExactKeys(value: Record<string, unknown>, expected: readonly string[], label: string) {
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), `${label}: exact schema drifted`);
}

function assertLogicalSegment(value: string, label: string) {
  assert.match(value, LOGICAL_SEGMENT_PATTERN, `${label}: unsafe or empty logical identifier`);
  return value;
}

function assertHighEntropyId(value: string, label: string) {
  assert.match(value, ID_PATTERN, `${label}: expected one externally generated high-entropy ID`);
  return value;
}

function canonicalOrigin(value: string) {
  const trimmed = value.trim();
  assert.ok(trimmed, "California signature artifact origin is required");
  const parsed = new URL(trimmed);
  assert.ok(parsed.protocol === "http:" || parsed.protocol === "https:",
    "California signature artifact origin must use HTTP(S)");
  assert.equal(parsed.username, "", "California signature artifact origin must not contain credentials");
  assert.equal(parsed.password, "", "California signature artifact origin must not contain credentials");
  assert.equal(parsed.pathname, "/", "California signature artifact origin must not contain a path");
  assert.equal(parsed.search, "", "California signature artifact origin must not contain a query");
  assert.equal(parsed.hash, "", "California signature artifact origin must not contain a fragment");
  assert.equal(trimmed.replace(/\/$/, ""), parsed.origin,
    "California signature artifact origin must be a canonical exact origin");
  return parsed.origin;
}

function assertBuildId(value: string) {
  const trimmed = value.trim();
  assert.ok(trimmed.length >= 1 && trimmed.length <= 256, "California signature buildId is required");
  assert.doesNotMatch(trimmed, /[\u0000-\u001f\u007f/\\]/,
    "California signature buildId contains unsafe characters");
  return trimmed;
}

function cloneMarkerIdentities(markers: {
  canvas: CaliforniaCanvasGraphicsNoDeployMarker;
  control: CaliforniaSignatureControlQaNoDeployMarker;
}) {
  const markerIdentities: CaliforniaSignatureRuntimeMarkerIdentities = {
    canvas: structuredClone(markers.canvas),
    control: structuredClone(markers.control)
  };
  assert.equal(markerIdentities.control.productSourceSha256, markerIdentities.canvas.productSourceSha256,
    "control and Canvas markers disagree on the frozen product source identity");
  assert.match(markerIdentities.control.productSourceSha256, SHA256_PATTERN);
  assert.match(markerIdentities.control.blueprintSha256, SHA256_PATTERN);
  assert.match(markerIdentities.canvas.sourceContractSha256, SHA256_PATTERN);
  return markerIdentities;
}

export function buildCaliforniaSignatureArtifactRunIdentity(options: {
  buildId: string;
  markers: {
    canvas: CaliforniaCanvasGraphicsNoDeployMarker;
    control: CaliforniaSignatureControlQaNoDeployMarker;
  };
  origin: string;
  runId: string;
  runtimeRunId: string;
  sourceSnapshotSha256: string;
}): CaliforniaSignatureArtifactRunIdentity {
  const markerIdentities = cloneMarkerIdentities(options.markers);
  return {
    buildId: assertBuildId(options.buildId),
    componentSourceSha256: markerIdentities.control.productSourceSha256,
    controlBlueprintSha256: markerIdentities.control.blueprintSha256,
    markerIdentities,
    markerIdentitiesSha256: sha256(stableJson(markerIdentities)),
    origin: canonicalOrigin(options.origin),
    runId: assertHighEntropyId(options.runId.trim(), "California signature exhaustive runId"),
    runtimeRunId: assertHighEntropyId(
      options.runtimeRunId.trim(),
      "California signature Canvas runtimeRunId"
    ),
    sourceSnapshotSha256: assertSha256(
      options.sourceSnapshotSha256,
      "California signature frozen source snapshot"
    )
  };
}

export function californiaSignatureArtifactRunIdentityFromEnvironment(options: {
  actualOrigin: string;
  markers: {
    canvas: CaliforniaCanvasGraphicsNoDeployMarker;
    control: CaliforniaSignatureControlQaNoDeployMarker;
  };
  runtimeRunId: string;
}) {
  const expectedOrigin = process.env.CA_SIGNATURE_EXHAUSTIVE_ORIGIN?.trim() ?? "";
  assert.ok(expectedOrigin, "CA_SIGNATURE_EXHAUSTIVE_ORIGIN is required");
  assert.equal(canonicalOrigin(options.actualOrigin), canonicalOrigin(expectedOrigin),
    "browser baseURL does not match CA_SIGNATURE_EXHAUSTIVE_ORIGIN");
  return buildCaliforniaSignatureArtifactRunIdentity({
    buildId: process.env.CA_SIGNATURE_EXHAUSTIVE_BUILD_ID?.trim() ?? "",
    markers: options.markers,
    origin: expectedOrigin,
    runId: process.env.CA_SIGNATURE_EXHAUSTIVE_RUN_ID?.trim() ?? "",
    runtimeRunId: options.runtimeRunId,
    sourceSnapshotSha256: process.env.CA_VIZ_SOURCE_SNAPSHOT_SHA256?.trim() ?? ""
  });
}

export function californiaSignatureArtifactRunDirectory(ledgerRoot: string, runId: string) {
  assertHighEntropyId(runId, "California signature exhaustive runId");
  const root = path.resolve(ledgerRoot);
  const runDirectory = path.resolve(root, runId);
  const relative = path.relative(root, runDirectory);
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative),
    "California signature run directory escapes its ledger root");
  return runDirectory;
}

function californiaSignaturePublicationLockDirectory(ledgerRoot: string, runId: string) {
  assertHighEntropyId(runId, "California signature exhaustive runId");
  return path.join(path.resolve(ledgerRoot), `.${runId}.publication-lock`);
}

async function withCaliforniaSignaturePublicationLock<T>(options: {
  ledgerRoot: string;
  runId: string;
  task(): Promise<T>;
}): Promise<T> {
  const ledgerRoot = path.resolve(options.ledgerRoot);
  await mkdir(ledgerRoot, { recursive: true });
  const rootIdentity = await lstat(ledgerRoot);
  assert.ok(rootIdentity.isDirectory() && !rootIdentity.isSymbolicLink(),
    "California signature publication lock requires a regular non-symlink ledger root");
  const lockDirectory = californiaSignaturePublicationLockDirectory(ledgerRoot, options.runId);
  let acquiredIdentity: Awaited<ReturnType<typeof lstat>> | null = null;
  for (let attempt = 0; ; attempt += 1) {
    try {
      await mkdir(lockDirectory);
      acquiredIdentity = await lstat(lockDirectory);
      assert.ok(acquiredIdentity.isDirectory() && !acquiredIdentity.isSymbolicLink(),
        "California signature publication lock must be one regular non-symlink directory");
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST" || attempt >= 399) throw error;
      await new Promise<void>((resolve) => setTimeout(resolve, 25));
    }
  }
  try {
    return await options.task();
  } finally {
    assert.ok(acquiredIdentity, "California signature publication lock identity was not captured");
    const currentIdentity = await lstat(lockDirectory);
    assert.ok(currentIdentity.isDirectory() && !currentIdentity.isSymbolicLink(),
      "California signature publication lock changed type before cleanup");
    assert.equal(currentIdentity.dev, acquiredIdentity.dev,
      "California signature publication lock ownership changed device before cleanup");
    assert.equal(currentIdentity.ino, acquiredIdentity.ino,
      "California signature publication lock ownership changed inode before cleanup");
    await rmdir(lockDirectory);
  }
}

async function assertCaliforniaSignatureRunIsUnsealed(runDirectory: string) {
  try {
    await lstat(path.join(runDirectory, CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  throw new Error("California signature run is sealed; late official publication is forbidden");
}

async function assertCaliforniaSignatureRunAcceptsProducerArtifacts(runDirectory: string) {
  await assertCaliforniaSignatureRunIsUnsealed(runDirectory);
  try {
    await lstat(path.join(runDirectory, CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  throw new Error(
    "California signature producer already reported process success; later artifact publication is forbidden"
  );
}

function exactRunManifest(identity: CaliforniaSignatureArtifactRunIdentity): CaliforniaSignatureRunManifest {
  return {
    ...structuredClone(identity),
    lifecycleSchemaVersion: CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION as
      typeof CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
    officialArtifactSuffix: CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX,
    requiredProjects: [...CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS],
    status: "open"
  };
}

function assertRunIdentity(actual: CaliforniaSignatureArtifactRunIdentity, expected: CaliforniaSignatureArtifactRunIdentity,
  label: string) {
  for (const field of RUN_IDENTITY_KEYS) {
    assert.deepEqual(actual[field], expected[field], `${label}: mixed or stale ${field}`);
  }
  assert.equal(actual.markerIdentitiesSha256, sha256(stableJson(actual.markerIdentities)),
    `${label}: markerIdentitiesSha256 does not bind exact marker contents`);
  assert.equal(actual.componentSourceSha256, actual.markerIdentities.control.productSourceSha256,
    `${label}: component source identity does not match control marker`);
  assert.equal(actual.controlBlueprintSha256, actual.markerIdentities.control.blueprintSha256,
    `${label}: control blueprint identity does not match control marker`);
  assert.equal(actual.markerIdentities.canvas.productSourceSha256, actual.componentSourceSha256,
    `${label}: Canvas marker source identity drifted`);
}

function assertRunManifest(
  manifest: Record<string, unknown>,
  expectedIdentity: CaliforniaSignatureArtifactRunIdentity
) {
  assertExactKeys(manifest, RUN_MANIFEST_KEYS, "California signature run manifest");
  assert.equal(manifest.lifecycleSchemaVersion, CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
    "California signature run manifest lifecycle schema drifted");
  assert.equal(manifest.officialArtifactSuffix, CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX,
    "California signature run manifest official suffix drifted");
  assert.deepEqual(manifest.requiredProjects, [...CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS],
    "California signature run manifest required projects drifted");
  assert.equal(manifest.status, "open", "California signature run manifest is not open");
  assertRunIdentity(manifest as unknown as CaliforniaSignatureArtifactRunIdentity, expectedIdentity,
    "California signature run manifest");
}

function assertProducerSuccess(options: {
  expectedArtifactsSha256: string;
  expectedIdentity: CaliforniaSignatureArtifactRunIdentity;
  producer: CaliforniaSignatureReadJson;
}) {
  const value = options.producer.value;
  assertExactKeys(value, PRODUCER_SUCCESS_KEYS, "California signature producer process-success receipt");
  assertArtifactByteIdentities(
    value.artifacts,
    "California signature producer process-success receipt"
  );
  assertEvidenceReservationIdentities(
    value.evidenceReservations,
    "California signature producer process-success receipt"
  );
  assert.equal(value.lifecycleSchemaVersion, CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
    "California signature producer process-success lifecycle schema drifted");
  assert.equal(value.status, "producer-succeeded",
    "California signature producer process-success receipt is not terminal");
  assert.ok(typeof value.publishedAt === "string" && !Number.isNaN(Date.parse(value.publishedAt)),
    "California signature producer process-success timestamp is invalid");
  assert.equal(value.expectedArtifactsSha256, options.expectedArtifactsSha256,
    "California signature producer process-success expected matrix digest drifted");
  assertSha256(value.producerReportSha256 as string,
    "California signature producer Playwright report");
  assertRunIdentity(
    value as unknown as CaliforniaSignatureArtifactRunIdentity,
    options.expectedIdentity,
    "California signature producer process-success receipt"
  );
}

async function assertRunSeal(options: {
  entries: readonly { name: string }[];
  evidenceReservations: readonly CaliforniaSignatureEvidenceReservationIdentity[];
  expectedArtifactsSha256: string;
  expectedIdentity: CaliforniaSignatureArtifactRunIdentity;
  manifestSha256: string;
  producer: CaliforniaSignatureReadJson;
  runDirectory: string;
  seal: CaliforniaSignatureReadJson;
  sealReceipt: CaliforniaSignatureSealReceipt;
  loadedArtifactByteIdentities: readonly CaliforniaSignatureArtifactByteIdentity[];
}) {
  assert.equal(options.sealReceipt.fileName, CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME,
    "California signature external seal receipt names the wrong file");
  assertSha256(options.sealReceipt.sha256, "California signature external seal receipt");
  assert.equal(options.seal.sha256, options.sealReceipt.sha256,
    "California signature run seal no longer matches its external receipt");
  const value = options.seal.value;
  assertExactKeys(value, RUN_SEAL_KEYS, "California signature run seal");
  assert.equal(value.lifecycleSchemaVersion, CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
    "California signature run seal lifecycle schema drifted");
  assert.equal(value.status, "sealed", "California signature run seal is not terminal");
  assert.ok(typeof value.sealedAt === "string" && !Number.isNaN(Date.parse(value.sealedAt)),
    "California signature run seal timestamp is invalid");
  assertRunIdentity(value as unknown as CaliforniaSignatureArtifactRunIdentity,
    options.expectedIdentity, "California signature run seal");
  assert.equal(value.expectedArtifactsSha256, options.expectedArtifactsSha256,
    "California signature run seal expected matrix digest drifted");
  assert.equal(value.manifestSha256, options.manifestSha256,
    "California signature run seal does not bind the exact manifest bytes");
  assert.equal(value.producerSuccessSha256, options.producer.sha256,
    "California signature run seal does not bind producer process-success bytes");
  assert.equal(value.producerReportSha256, options.producer.value.producerReportSha256,
    "California signature run seal does not bind the verified Playwright report");
  assert.ok(Array.isArray(value.artifacts) && value.artifacts.length > 0,
    "California signature run seal has no artifacts");
  const sealedArtifacts = value.artifacts as Array<Record<string, unknown>>;
  assertArtifactByteIdentities(sealedArtifacts, "California signature run seal");
  assertEvidenceReservationIdentities(
    value.evidenceReservations,
    "California signature run seal"
  );
  assertArtifactByteIdentities(
    options.producer.value.artifacts,
    "California signature producer process-success receipt"
  );
  assert.deepEqual(
    sealedArtifacts,
    options.producer.value.artifacts,
    "California signature run seal does not bind producer artifact byte identities"
  );
  assert.deepEqual(
    value.evidenceReservations,
    options.producer.value.evidenceReservations,
    "California signature run seal does not bind producer evidence reservations"
  );
  assert.deepEqual(
    value.evidenceReservations,
    options.evidenceReservations,
    "California signature run seal does not bind current evidence reservations"
  );
  assert.deepEqual(
    sealedArtifacts,
    options.loadedArtifactByteIdentities,
    "California signature run seal does not bind the currently loaded artifact byte identities"
  );
  const actualNames = options.entries
    .map((entry) => entry.name)
    .filter((name) => name.endsWith(CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX))
    .sort();
  const sealedNames = sealedArtifacts.map((artifact) => artifact.fileName as string).sort();
  exactStringSet(sealedNames, actualNames, "California signature sealed official filenames");
  const sealedChunkNames = sealedArtifacts.flatMap((artifact) =>
    (artifact.evidenceChunks as CaliforniaSignatureEvidenceChunkByteIdentity[])
      .map((chunk) => chunk.fileName)
  );
  const actualChunkNames = options.entries
    .map((entry) => entry.name)
    .filter((name) => name.endsWith(".frame"));
  exactStringSet(
    sealedChunkNames,
    actualChunkNames,
    "California signature sealed evidence chunk filenames"
  );
  for (const artifact of sealedArtifacts) {
    const reread = await readJsonFile(
      path.join(options.runDirectory, artifact.fileName as string),
      `${artifact.fileName}: sealed official artifact reread`
    );
    assert.equal(reread.sha256, artifact.sha256,
      `${artifact.fileName}: sealed official artifact digest drifted`);
  }
}

type CaliforniaSignatureReadJson = {
  bytes: Buffer;
  sha256: string;
  value: Record<string, unknown>;
};

async function readJsonFile(
  target: string,
  label: string,
  expectedLinkCount = 1
): Promise<CaliforniaSignatureReadJson> {
  const handle = await open(target, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const identity = await handle.stat();
    assert.ok(identity.isFile(), `${label}: expected one regular non-symlink file`);
    assert.equal(
      identity.nlink,
      expectedLinkCount,
      expectedLinkCount === 1
        ? `${label}: hard-linked files are forbidden`
        : `${label}: unexpected hard-link count during exact read`
    );
    const bytes = await handle.readFile();
    const after = await handle.stat();
    for (const key of ["dev", "ino", "nlink", "mode", "size", "mtimeMs", "ctimeMs"] as const) {
      assert.equal(after[key], identity[key], `${label}: held file identity changed during exact read (${key})`);
    }
    assert.equal(bytes.length, identity.size, `${label}: held file size changed during exact read`);
    const pathnameIdentity = await lstat(target);
    assert.ok(pathnameIdentity.isFile() && !pathnameIdentity.isSymbolicLink(),
      `${label}: pathname stopped naming one regular non-symlink file`);
    assert.equal(pathnameIdentity.dev, identity.dev, `${label}: pathname device changed during exact read`);
    assert.equal(pathnameIdentity.ino, identity.ino, `${label}: pathname inode changed during exact read`);
    assert.equal(pathnameIdentity.nlink, expectedLinkCount,
      `${label}: pathname link count changed during exact read`);
    let parsed: unknown;
    try {
      parsed = JSON.parse(bytes.toString("utf8"));
    } catch (error) {
      throw new Error(`${label}: invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
    assertRecord(parsed, label);
    return { bytes, sha256: sha256(bytes), value: parsed };
  } finally {
    await handle.close();
  }
}

async function readJsonObject(target: string, label: string, expectedLinkCount = 1) {
  return (await readJsonFile(target, label, expectedLinkCount)).value;
}

async function waitForRunManifest(runDirectory: string) {
  const manifestPath = path.join(runDirectory, CALIFORNIA_SIGNATURE_RUN_MANIFEST_FILENAME);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      return await readJsonObject(manifestPath, "California signature run manifest");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT" || attempt === 49) throw error;
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
    }
  }
  throw new Error("California signature run manifest did not become durable");
}

async function writeExclusiveJson(destination: string, value: unknown) {
  const expectedBytes = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
  const temporary = `${destination}.${process.pid}.${randomUUID()}.tmp`;
  let temporaryExists = false;
  try {
    const temporaryHandle = await open(temporary, "wx", 0o600);
    temporaryExists = true;
    try {
      await temporaryHandle.writeFile(expectedBytes);
      await temporaryHandle.sync();
    } finally {
      await temporaryHandle.close();
    }
    await link(temporary, destination);
    await unlink(temporary);
    temporaryExists = false;
    const directoryHandle = await open(path.dirname(destination), "r");
    try {
      await directoryHandle.sync();
    } finally {
      await directoryHandle.close();
    }
    const published = await readJsonFile(
      destination,
      `${path.basename(destination)}: exclusive publication readback`
    );
    assert.deepEqual(published.bytes, expectedBytes,
      `${path.basename(destination)}: durable publication bytes drifted on immediate reread`);
    return { bytes: published.bytes, sha256: published.sha256 };
  } finally {
    if (temporaryExists) await unlink(temporary).catch(() => undefined);
  }
}

/**
 * Keep the hard-link source as a durable producer intent until every
 * post-publication check and the outer publication-lock cleanup succeeds.
 * Any rejected writer Promise after the official link exists must leave this
 * unknown `.producer-pending.tmp` entry behind so no finalizer can mistake the
 * incomplete producer for a terminally successful artifact.
 */
async function writeValidatedOfficialJson<TValue>(options: {
  destination: string;
  validate(value: TValue): Promise<void> | void;
  value: TValue;
}) {
  const expectedBytes = Buffer.from(`${JSON.stringify(options.value)}\n`, "utf8");
  const temporary = `${options.destination}.${process.pid}.${randomUUID()}.producer-pending.tmp`;
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(expectedBytes);
    await handle.sync();
  } finally {
    await handle.close();
  }

  const staged = await readJsonFile(
    temporary,
    `${path.basename(options.destination)}: producer-pending validation`
  );
  assert.deepEqual(staged.bytes, expectedBytes,
    `${path.basename(options.destination)}: producer-pending bytes drifted`);
  await options.validate(staged.value as TValue);

  await link(temporary, options.destination);
  const directoryHandle = await open(path.dirname(options.destination), "r");
  try {
    await directoryHandle.sync();
  } finally {
    await directoryHandle.close();
  }
  const publishedIdentity = await lstat(options.destination);
  assert.ok(
    publishedIdentity.isFile() && !publishedIdentity.isSymbolicLink() && publishedIdentity.nlink === 2,
    `${path.basename(options.destination)}: official publication did not retain its producer intent`
  );
  const published = await readJsonFile(
    options.destination,
    `${path.basename(options.destination)}: official publication readback`,
    2
  );
  assert.deepEqual(published.bytes, expectedBytes,
    `${path.basename(options.destination)}: official publication bytes drifted`);
  await options.validate(published.value as TValue);
  return {
    producerPendingPath: temporary,
    sha256: published.sha256,
    value: published.value as TValue
  };
}

export async function initializeCaliforniaSignatureArtifactRunDirectory(options: {
  identity: CaliforniaSignatureArtifactRunIdentity;
  ledgerRoot: string;
}) {
  const ledgerRoot = path.resolve(options.ledgerRoot);
  await mkdir(ledgerRoot, { recursive: true });
  const rootIdentity = await lstat(ledgerRoot);
  assert.ok(rootIdentity.isDirectory() && !rootIdentity.isSymbolicLink(),
    "California signature ledger root must be a regular directory, not a symlink");
  const runDirectory = californiaSignatureArtifactRunDirectory(ledgerRoot, options.identity.runId);
  let created = false;
  try {
    await mkdir(runDirectory);
    created = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  const runIdentity = await lstat(runDirectory);
  assert.ok(runIdentity.isDirectory() && !runIdentity.isSymbolicLink(),
    "California signature run directory must be a regular directory, not a symlink");
  if (created) {
    assert.deepEqual(await readdir(runDirectory), [],
      "new California signature run directory was not verified empty");
    await writeExclusiveJson(
      path.join(runDirectory, CALIFORNIA_SIGNATURE_RUN_MANIFEST_FILENAME),
      exactRunManifest(options.identity)
    );
  }
  const manifest = await waitForRunManifest(runDirectory);
  assertRunManifest(manifest, options.identity);
  return runDirectory;
}

function assertShard(shard: CaliforniaSignatureArtifactShard, label: string) {
  if (shard === null) return;
  assert.ok(Number.isSafeInteger(shard.index) && Number.isSafeInteger(shard.total) &&
    shard.total >= 2 && shard.index >= 1 && shard.index <= shard.total,
  `${label}: invalid shard`);
}

function shardSegment(shard: CaliforniaSignatureArtifactShard) {
  assertShard(shard, "California signature artifact");
  return shard ? `shard-${shard.index}-of-${shard.total}` : "shard-all";
}

function artifactLogicalIdentity(options: {
  packageId: string;
  projectName: string;
  repeatEachIndex: number;
  runId: string;
  shard: CaliforniaSignatureArtifactShard;
}) {
  assertLogicalSegment(options.packageId, "California signature packageId");
  assertLogicalSegment(options.projectName, "California signature projectName");
  assert.ok(Number.isSafeInteger(options.repeatEachIndex) && options.repeatEachIndex >= 0,
    "California signature repeatEachIndex must be a non-negative integer");
  const artifactId = [
    options.runId,
    options.projectName,
    options.packageId,
    shardSegment(options.shard),
    `repeat-${options.repeatEachIndex}`
  ].join("__");
  return {
    artifactId,
    fileName: `${artifactId}${CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX}`
  };
}

function artifactBase(options: {
  identity: CaliforniaSignatureArtifactRunIdentity;
  packageId: string;
  projectName: string;
  shard: CaliforniaSignatureArtifactShard;
}) {
  assertShard(options.shard, "California signature artifact");
  assertLogicalSegment(options.packageId, "California signature packageId");
  assertLogicalSegment(options.projectName, "California signature projectName");
  return {
    ...structuredClone(options.identity),
    createdAt: new Date().toISOString(),
    lifecycleSchemaVersion: CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION as
      typeof CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
    packageId: options.packageId,
    projectName: options.projectName,
    schemaVersion: CALIFORNIA_SIGNATURE_EXHAUSTIVE_SCHEMA_VERSION,
    shard: options.shard ? { ...options.shard } : null
  };
}

type CaliforniaSignatureEvidenceReservationRecord = {
  artifactId: string;
  bytes: number;
  createdAt: string;
  lifecycleSchemaVersion: typeof CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION;
  reservationId: string;
  runId: string;
};

const EVIDENCE_RESERVATION_RECORD_KEYS = [
  "artifactId",
  "bytes",
  "createdAt",
  "lifecycleSchemaVersion",
  "reservationId",
  "runId"
] as const;

function assertEvidenceReservationRecord(
  value: Record<string, unknown>,
  expectedRunId: string,
  label: string
): asserts value is CaliforniaSignatureEvidenceReservationRecord {
  assertExactKeys(value, EVIDENCE_RESERVATION_RECORD_KEYS, label);
  assert.equal(value.lifecycleSchemaVersion, CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
    `${label}: lifecycle schema drifted`);
  assert.equal(value.runId, expectedRunId, `${label}: run identity drifted`);
  assert.ok(typeof value.artifactId === "string" && ID_PATTERN.test(value.artifactId),
    `${label}: artifactId is invalid`);
  assert.ok(typeof value.reservationId === "string" && ID_PATTERN.test(value.reservationId),
    `${label}: reservationId is invalid`);
  assert.ok(Number.isSafeInteger(value.bytes) && (value.bytes as number) > 0 &&
    (value.bytes as number) <= CALIFORNIA_SIGNATURE_MAX_EVIDENCE_RUN_BYTES,
  `${label}: reservation byte count is invalid`);
  assert.ok(typeof value.createdAt === "string" && !Number.isNaN(Date.parse(value.createdAt)),
    `${label}: createdAt is invalid`);
}

async function loadCaliforniaSignatureEvidenceReservations(
  runDirectory: string,
  expectedRunId: string
) {
  const fileNames = (await readdir(runDirectory))
    .filter((name) => name.endsWith(CALIFORNIA_SIGNATURE_EVIDENCE_RESERVATION_SUFFIX))
    .sort();
  assert.ok(fileNames.length <= 4_096,
    "California signature evidence reservation inventory exceeds its fail-closed cap");
  const identities: CaliforniaSignatureEvidenceReservationIdentity[] = [];
  let totalBytes = 0;
  for (const fileName of fileNames) {
    assert.match(fileName,
      /^\.ca-signature-evidence-reservation-[a-z0-9_-]{24,128}\.signature-evidence-reservation\.json$/i,
      `${fileName}: unsafe evidence reservation filename`);
    const read = await readJsonFile(
      path.join(runDirectory, fileName),
      `${fileName}: evidence reservation`
    );
    assertEvidenceReservationRecord(read.value, expectedRunId, fileName);
    assert.equal(
      fileName,
      `.ca-signature-evidence-reservation-${read.value.reservationId}` +
        CALIFORNIA_SIGNATURE_EVIDENCE_RESERVATION_SUFFIX,
      `${fileName}: reservation filename/payload identity drifted`
    );
    totalBytes += read.value.bytes;
    assert.ok(Number.isSafeInteger(totalBytes) && totalBytes <= CALIFORNIA_SIGNATURE_MAX_EVIDENCE_RUN_BYTES,
      `California signature evidence run reservation exceeds ${CALIFORNIA_SIGNATURE_MAX_EVIDENCE_RUN_BYTES}`);
    identities.push({
      artifactId: read.value.artifactId,
      bytes: read.value.bytes,
      fileName,
      sha256: read.sha256
    });
  }
  return { identities, totalBytes };
}

async function reserveCaliforniaSignatureEvidenceBytes(options: {
  artifactId: string;
  bytes: number;
  identity: CaliforniaSignatureArtifactRunIdentity;
  ledgerRoot: string;
  runDirectory: string;
}) {
  assert.ok(Number.isSafeInteger(options.bytes) && options.bytes > 0,
    `${options.artifactId}: invalid evidence byte reservation`);
  await withCaliforniaSignaturePublicationLock({
    ledgerRoot: options.ledgerRoot,
    runId: options.identity.runId,
    async task() {
      await assertCaliforniaSignatureRunAcceptsProducerArtifacts(options.runDirectory);
      const existing = await loadCaliforniaSignatureEvidenceReservations(
        options.runDirectory,
        options.identity.runId
      );
      assert.ok(existing.totalBytes + options.bytes <= CALIFORNIA_SIGNATURE_MAX_EVIDENCE_RUN_BYTES,
        `${options.artifactId}: evidence run byte cap ${CALIFORNIA_SIGNATURE_MAX_EVIDENCE_RUN_BYTES} exceeded`);
      const available = await statfs(options.runDirectory);
      const freeBytes = Number(available.bavail) * Number(available.bsize);
      assert.ok(Number.isSafeInteger(freeBytes) && freeBytes >= options.bytes,
        `${options.artifactId}: Starship free space ${freeBytes} is below reservation ${options.bytes}`);
      const reservationId = `reservation-${randomUUID()}`;
      const fileName = `.ca-signature-evidence-reservation-${reservationId}` +
        CALIFORNIA_SIGNATURE_EVIDENCE_RESERVATION_SUFFIX;
      const record: CaliforniaSignatureEvidenceReservationRecord = {
        artifactId: options.artifactId,
        bytes: options.bytes,
        createdAt: new Date().toISOString(),
        lifecycleSchemaVersion: CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
        reservationId,
        runId: options.identity.runId
      };
      await writeExclusiveJson(path.join(options.runDirectory, fileName), record);
    }
  });
}

export type CaliforniaSignatureOfficialEvidenceWriter = {
  abort(): Promise<void>;
  appendBatch(records: readonly CaliforniaSignatureExactEvidenceRecord[]): Promise<void>;
  artifactId: string;
  diagnostic(): CaliforniaSignaturePartialEvidenceStreamDiagnostic;
  executionGroupOwnership: CaliforniaSignatureExecutionGroupOwnership | null;
  finalize(): Promise<CaliforniaSignatureEvidenceStreamManifest>;
  runDirectory: string;
};

export async function createCaliforniaSignatureOfficialEvidenceWriter(options: {
  executionGroupOwnership?: CaliforniaSignatureExecutionGroupOwnership | null;
  identity: CaliforniaSignatureArtifactRunIdentity;
  ledgerRoot: string;
  manifest: CaliforniaSignatureSourceManifest;
  packageId: string;
  projectName: string;
  repeatEachIndex: number;
  shard: CaliforniaSignatureArtifactShard;
}): Promise<CaliforniaSignatureOfficialEvidenceWriter> {
  assert.ok(CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS.includes(
    options.projectName as typeof CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS[number]
  ), `${options.projectName}: unsupported California signature project`);
  const logical = artifactLogicalIdentity({
    packageId: options.packageId,
    projectName: options.projectName,
    repeatEachIndex: options.repeatEachIndex,
    runId: options.identity.runId,
    shard: options.shard
  });
  const executionGroupOwnership = options.executionGroupOwnership ?? null;
  assertExecutionGroupOwnership(executionGroupOwnership,
    `${logical.artifactId}: evidence writer execution-group ownership`);
  if (executionGroupOwnership) {
    assert.equal(executionGroupOwnership.sourceSnapshotSha256,
      options.identity.sourceSnapshotSha256,
    `${logical.artifactId}: evidence writer ownership mixes source snapshots`);
    assert.ok(executionGroupOwnership.groupKeys.every((groupKey) =>
      groupKey.startsWith(`${options.projectName}\0`)),
    `${logical.artifactId}: evidence writer ownership crosses projects`);
  }
  const runDirectory = await initializeCaliforniaSignatureArtifactRunDirectory(options);
  let localReservedBytes = 0;
  const streamArtifactId = `ca-signature-evidence-${sha256(
    executionGroupOwnership
      ? `${logical.artifactId}\0${executionGroupOwnershipSha256(executionGroupOwnership)}`
      : logical.artifactId
  ).slice(0, 48)}`;
  const writer = await createCaliforniaSignatureEvidenceStreamWriter({
    artifactId: streamArtifactId,
    orderKey(record) {
      assertCaliforniaSignatureExactEvidenceRecordSchema(
        record,
        `${logical.artifactId}: evidence stream order`
      );
      return californiaSignatureExactEvidenceOrderKey({ manifest: options.manifest, record });
    },
    async reserveRunBytes(bytes) {
      if (localReservedBytes < bytes) {
        const block = Math.max(bytes, CALIFORNIA_SIGNATURE_EVIDENCE_RESERVATION_BLOCK_BYTES);
        await reserveCaliforniaSignatureEvidenceBytes({
          artifactId: logical.artifactId,
          bytes: block,
          identity: options.identity,
          ledgerRoot: options.ledgerRoot,
          runDirectory
        });
        localReservedBytes += block;
      }
      localReservedBytes -= bytes;
    },
    runDirectory
  });
  return {
    abort: () => writer.abort(),
    appendBatch(records) {
      for (const [index, record] of records.entries()) {
        assertCaliforniaSignatureExactEvidenceRecordSchema(
          record,
          `${logical.artifactId}: append batch record ${index}`
        );
      }
      return writer.appendBatch(records);
    },
    artifactId: logical.artifactId,
    diagnostic: () => writer.diagnostic(),
    executionGroupOwnership: executionGroupOwnership
      ? structuredClone(executionGroupOwnership)
      : null,
    finalize: () => writer.finalize(),
    runDirectory
  };
}

export async function persistCaliforniaSignatureSuccessfulArtifact(options: {
  evidenceStream: CaliforniaSignatureEvidenceStreamManifest;
  executionGroupOwnership?: CaliforniaSignatureExecutionGroupOwnership | null;
  identity: CaliforniaSignatureArtifactRunIdentity;
  ledgerRoot: string;
  packageId: string;
  projectName: string;
  shard: CaliforniaSignatureArtifactShard;
  testInfo: Pick<TestInfo, "attach" | "errors" | "repeatEachIndex" | "retry">;
  validateAdditionalPublicationEvidence?(
    artifact: CaliforniaSignatureOfficialArtifact
  ): Promise<void> | void;
  validationContext: CaliforniaSignatureArtifactValidationContext;
}) {
  assert.ok(options.validationContext,
    "successful California signature artifact requires a concrete validation context");
  assert.ok(options.evidenceStream.recordCount > 0,
    "successful California signature artifact must contain streamed evidence");
  assert.equal(options.testInfo.errors.length, 0,
    "successful California signature artifact cannot publish after a recorded test error");
  assert.equal(options.testInfo.retry, 0,
    "California signature official artifacts require the frozen retries=0 contract");
  const logical = artifactLogicalIdentity({
    packageId: options.packageId,
    projectName: options.projectName,
    repeatEachIndex: options.testInfo.repeatEachIndex,
    runId: options.identity.runId,
    shard: options.shard
  });
  const executionGroupOwnership = options.executionGroupOwnership ?? null;
  assertExecutionGroupOwnership(executionGroupOwnership,
    `${options.packageId}: artifact execution-group ownership`);
  assert.deepEqual(executionGroupOwnership,
    options.validationContext.executionGroupOwnership,
  `${options.packageId}: writer/artifact validation ownership drifted`);
  const expectedStreamId = `ca-signature-evidence-${sha256(
    executionGroupOwnership
      ? `${logical.artifactId}\0${executionGroupOwnershipSha256(executionGroupOwnership)}`
      : logical.artifactId
  ).slice(0, 48)}`;
  assert.ok(options.evidenceStream.chunks.every((chunk) =>
    chunk.fileName.startsWith(`${expectedStreamId}.evidence-`)
  ), `${options.packageId}: evidence stream does not belong to the canonical artifact writer`);
  const runDirectory = await initializeCaliforniaSignatureArtifactRunDirectory(options);
  const artifact: CaliforniaSignatureOfficialArtifact = {
    ...artifactBase(options),
    artifactId: logical.artifactId,
    evidenceSnapshot: californiaSignatureEvidenceSnapshotFromStream(
      options.validationContext,
      options.evidenceStream
    ),
    evidenceStream: structuredClone(options.evidenceStream),
    evidenceStreamOwnershipSha256: evidenceStreamOwnershipSha256({
      evidenceStream: options.evidenceStream,
      ownership: executionGroupOwnership
    }),
    execution: { repeatEachIndex: options.testInfo.repeatEachIndex, retry: 0 },
    executionGroupOwnership: executionGroupOwnership
      ? structuredClone(executionGroupOwnership)
      : null,
    terminalStatus: "passed"
  };
  const validatedSnapshot = await validateCaliforniaSignatureOfficialEvidenceStream({
    artifact,
    context: options.validationContext,
    identity: options.identity,
    label: `${options.packageId}: pre-publication evidence stream`,
    runDirectory
  });
  const destination = path.join(runDirectory, logical.fileName);
  await options.testInfo.attach("california-signature-exhaustive-ledger", {
    body: Buffer.from(JSON.stringify({
      artifactId: artifact.artifactId,
      evidenceCount: artifact.evidenceStream.recordCount,
      markerIdentitiesSha256: artifact.markerIdentitiesSha256,
      snapshot: validatedSnapshot,
      terminalStatus: artifact.terminalStatus
    }, null, 2)),
    contentType: "application/json"
  });
  assert.deepEqual(
    await validateCaliforniaSignatureOfficialEvidenceStream({
      artifact,
      context: options.validationContext,
      identity: options.identity,
      label: `${options.packageId}: post-attachment evidence stream`,
      runDirectory
    }),
    validatedSnapshot,
    `${options.packageId}: evidence changed between validation and publication`
  );
  // Exclusive official publication is deliberately the final awaited action:
  // no attachment or diagnostic side effect may fail after a passed artifact
  // has become aggregator-visible.
  const completed = await withCaliforniaSignaturePublicationLock({
    ledgerRoot: options.ledgerRoot,
    runId: options.identity.runId,
    async task() {
      const lockedRunDirectory = await initializeCaliforniaSignatureArtifactRunDirectory(options);
      assert.equal(lockedRunDirectory, runDirectory,
        `${options.packageId}: publication lock resolved a different run directory`);
      await assertCaliforniaSignatureRunAcceptsProducerArtifacts(runDirectory);
      const publication = await writeValidatedOfficialJson({
        destination,
        value: artifact,
        async validate(candidate) {
          assertRecord(candidate, `${logical.fileName}: producer validation`);
          assertOfficialArtifactSchema(candidate, `${logical.fileName}: producer validation`);
          const official = candidate as unknown as CaliforniaSignatureOfficialArtifact;
          assert.deepEqual(official, artifact, `${logical.fileName}: publication payload drifted`);
          await validateCaliforniaSignatureOfficialEvidenceStream({
            artifact: official,
            context: options.validationContext,
            identity: options.identity,
            label: `${options.packageId}: producer validation evidence stream`,
            runDirectory
          });
          await options.validateAdditionalPublicationEvidence?.(structuredClone(official));
        }
      });
      return {
        producerPendingPath: publication.producerPendingPath,
        result: destination
      };
    }
  });
  // Final fallible operation: if outer lock cleanup or this unlink fails, the
  // retained pending intent keeps the run unsealable.
  await unlink(completed.producerPendingPath);
  return completed.result;
}

/**
 * Bounded pure-test adapter. Product/E2E producers must open the official
 * writer before browser work and flush one source-derived bench/axis group at
 * a time; this adapter deliberately refuses package-scale evidence arrays.
 */
export async function persistCaliforniaSignatureSuccessfulArtifactFixture(options: {
  evidence: CaliforniaSignatureExactEvidenceRecord[];
  identity: CaliforniaSignatureArtifactRunIdentity;
  ledgerRoot: string;
  packageId: string;
  projectName: string;
  shard: CaliforniaSignatureArtifactShard;
  testInfo: Pick<TestInfo, "attach" | "errors" | "repeatEachIndex" | "retry">;
  validateAdditionalPublicationEvidence?(
    artifact: CaliforniaSignatureOfficialArtifact
  ): Promise<void> | void;
  validationContext: CaliforniaSignatureArtifactValidationContext;
}) {
  assert.ok(options.validationContext,
    "successful California signature artifact requires a concrete validation context");
  assert.ok(options.evidence.length > 0 && options.evidence.length <= 4_096,
    "California signature fixture evidence must contain 1..4096 bounded records");
  const fixtureBytes = options.evidence.reduce((sum, record) =>
    sum + Buffer.byteLength(canonicalCaliforniaSignatureEvidenceJson(record), "utf8"), 0);
  assert.ok(fixtureBytes <= 32 * 1024 * 1024,
    "California signature fixture evidence exceeds the 32MiB pure-test cap");
  const writer = await createCaliforniaSignatureOfficialEvidenceWriter({
    executionGroupOwnership: options.validationContext.executionGroupOwnership,
    identity: options.identity,
    ledgerRoot: options.ledgerRoot,
    manifest: options.validationContext.manifest,
    packageId: options.packageId,
    projectName: options.projectName,
    repeatEachIndex: options.testInfo.repeatEachIndex,
    shard: options.shard
  });
  await writer.appendBatch(options.evidence);
  const evidenceStream = await writer.finalize();
  californiaSignatureBoundedFixtureStreamSha256.add(sha256(stableJson(evidenceStream)));
  return persistCaliforniaSignatureSuccessfulArtifact({
    ...options,
    evidenceStream,
    executionGroupOwnership: writer.executionGroupOwnership
  });
}

function failureDetail(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message.replace(/\s+/g, " ").trim().slice(0, 2_000),
      name: error.name || "Error"
    };
  }
  return { message: String(error).replace(/\s+/g, " ").trim().slice(0, 2_000), name: "Error" };
}

export async function persistCaliforniaSignatureFailureDiagnostic(options: {
  error: unknown;
  identity: CaliforniaSignatureArtifactRunIdentity;
  ledgerRoot: string;
  packageId: string;
  projectName: string;
  shard: CaliforniaSignatureArtifactShard;
  streamDiagnostic: CaliforniaSignaturePartialEvidenceStreamDiagnostic | null;
  testInfo: Pick<TestInfo, "repeatEachIndex" | "retry" | "workerIndex">;
}) {
  const terminalStatus = (options.streamDiagnostic?.completedRecordCount ?? 0) > 0
    ? "partial"
    : "failed";
  const logical = artifactLogicalIdentity({
    packageId: options.packageId,
    projectName: options.projectName,
    repeatEachIndex: options.testInfo.repeatEachIndex,
    runId: options.identity.runId,
    shard: options.shard
  });
  const diagnosticId = `${logical.artifactId}__${terminalStatus}__${randomUUID()}`;
  const diagnostic: CaliforniaSignatureDiagnosticArtifact = {
    ...artifactBase(options),
    createdAt: new Date().toISOString(),
    diagnosticId,
    execution: {
      repeatEachIndex: options.testInfo.repeatEachIndex,
      retry: options.testInfo.retry,
      workerIndex: options.testInfo.workerIndex
    },
    failure: failureDetail(options.error),
    streamDiagnostic: options.streamDiagnostic
      ? structuredClone(options.streamDiagnostic)
      : null,
    terminalStatus
  };
  const suffix = terminalStatus === "partial"
    ? CALIFORNIA_SIGNATURE_PARTIAL_ARTIFACT_SUFFIX
    : CALIFORNIA_SIGNATURE_FAILURE_ARTIFACT_SUFFIX;
  const runDirectory = californiaSignatureArtifactRunDirectory(options.ledgerRoot, options.identity.runId);
  const destination = path.join(runDirectory, `${diagnosticId}${suffix}`);
  await withCaliforniaSignaturePublicationLock({
    ledgerRoot: options.ledgerRoot,
    runId: options.identity.runId,
    async task() {
      const lockedRunDirectory = await initializeCaliforniaSignatureArtifactRunDirectory(options);
      assert.equal(lockedRunDirectory, runDirectory,
        `${options.packageId}: diagnostic publication lock resolved a different run directory`);
      await assertCaliforniaSignatureRunAcceptsProducerArtifacts(runDirectory);
      await writeExclusiveJson(destination, diagnostic);
    }
  });
  return destination;
}

export async function persistCaliforniaSignatureFailureDiagnosticFixture(options: {
  error: unknown;
  evidence: CaliforniaSignatureExactEvidenceRecord[];
  identity: CaliforniaSignatureArtifactRunIdentity;
  ledgerRoot: string;
  packageId: string;
  projectName: string;
  shard: CaliforniaSignatureArtifactShard;
  testInfo: Pick<TestInfo, "repeatEachIndex" | "retry" | "workerIndex">;
}) {
  assert.ok(options.evidence.length <= 4_096,
    "California signature diagnostic fixture exceeds its bounded record cap");
  return persistCaliforniaSignatureFailureDiagnostic({
    ...options,
    streamDiagnostic: options.evidence.length === 0
      ? null
      : {
          chunks: [],
          completedCanonicalRecordBytes: options.evidence.reduce((sum, record) =>
            sum + Buffer.byteLength(canonicalCaliforniaSignatureEvidenceJson(record), "utf8"), 0),
          completedFramedBytes: 0,
          completedRecordCount: options.evidence.length,
          schemaVersion: 1
        }
  });
}

export function buildCaliforniaSignatureExpectedArtifactMatrix(options: {
  packages: readonly { benchIds: readonly string[]; packageId: string }[];
  projects?: readonly string[];
  repeatEachIndices?: readonly number[];
  runId: string;
  shardTotal?: number;
}) {
  assertHighEntropyId(options.runId, "California signature exhaustive runId");
  const projects = options.projects ?? CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS;
  const repeats = options.repeatEachIndices ?? [0];
  const shardTotal = options.shardTotal ?? 1;
  assert.ok(Number.isSafeInteger(shardTotal) && shardTotal >= 1,
    "California signature expected shard total must be a positive integer");
  const packageIds = options.packages.map((workPackage) => workPackage.packageId);
  assert.equal(new Set(packageIds).size, packageIds.length,
    "California signature expected packages repeat an ID");
  assert.equal(new Set(projects).size, projects.length,
    "California signature expected projects repeat an ID");
  assert.equal(new Set(repeats).size, repeats.length,
    "California signature expected repeats repeat an index");
  const expected = new Map<string, CaliforniaSignatureExpectedArtifact>();
  for (const [packageIndex, workPackage] of options.packages.entries()) {
    const { packageId } = workPackage;
    assert.ok(workPackage.benchIds.length > 0,
      `${packageId}: California signature expected package has no benches`);
    assert.equal(new Set(workPackage.benchIds).size, workPackage.benchIds.length,
      `${packageId}: California signature expected package repeats a bench`);
    const shard = shardTotal === 1
      ? null
      : { index: packageIndex % shardTotal + 1, total: shardTotal };
    for (const projectName of projects) {
      for (const repeatEachIndex of repeats) {
        const logical = artifactLogicalIdentity({
          packageId,
          projectName,
          repeatEachIndex,
          runId: options.runId,
          shard
        });
        const key = `${projectName}\0${packageId}\0${repeatEachIndex}`;
        assert.ok(!expected.has(key), `California signature expected artifact key repeats: ${key}`);
        expected.set(key, {
          ...logical,
          benchIds: [...workPackage.benchIds],
          execution: { repeatEachIndex, retry: 0 },
          executionGroupOwnership: null,
          packageId,
          projectName,
          shard
        });
      }
    }
  }
  assert.ok(expected.size > 0, "California signature expected artifact matrix is empty");
  return expected;
}

function buildCaliforniaSignatureGroupOwnedExpectedArtifactMatrixInternal(options: {
  ownershipManifest: CaliforniaSignatureExecutionGroupOwnershipManifest;
  runId: string;
  shardTotal?: number;
}) {
  assertHighEntropyId(options.runId, "California signature group-owned runId");
  const manifest = structuredClone(options.ownershipManifest);
  assertRecord(manifest, "California signature execution ownership manifest");
  assertExactKeys(manifest as unknown as Record<string, unknown>, [
    "capacityPlanSha256",
    "cropCount",
    "evidenceRecordCount",
    "formalExecutionAuthorized",
    "groupCount",
    "packages",
    "receiptCount",
    "schemaVersion",
    "sourceIdentitySha256",
    "sourceSnapshotSha256",
    "status"
  ], "California signature execution ownership manifest");
  assert.equal(manifest.schemaVersion,
    CALIFORNIA_SIGNATURE_EXECUTION_GROUP_OWNERSHIP_SCHEMA_VERSION,
  "California signature execution ownership manifest version drifted");
  assert.equal(manifest.status, "diagnostic-capacity-partition",
    "California signature execution ownership manifest status drifted");
  assert.equal(manifest.formalExecutionAuthorized, false,
    "capacity ownership is diagnostic and must never authorize formal execution");
  assertSha256(manifest.capacityPlanSha256,
    "California signature execution ownership capacity plan");
  assertSha256(manifest.sourceIdentitySha256,
    "California signature execution ownership source identity");
  assertSha256(manifest.sourceSnapshotSha256,
    "California signature execution ownership source snapshot");
  assertPositiveSafeInteger(manifest.groupCount,
    "California signature execution ownership group count");
  assertPositiveSafeInteger(manifest.evidenceRecordCount,
    "California signature execution ownership evidence record count");
  assertPositiveSafeInteger(manifest.cropCount,
    "California signature execution ownership crop count");
  assertPositiveSafeInteger(manifest.receiptCount,
    "California signature execution ownership receipt count");
  assert.ok(Array.isArray(manifest.packages),
    "California signature execution ownership packages must be an array");
  assert.equal(manifest.packages.length, 51,
    "California signature execution ownership must contain 51 package slots");
  const shardTotal = options.shardTotal ?? 1;
  assert.ok(Number.isSafeInteger(shardTotal) && shardTotal >= 1,
    "California signature group-owned shard total must be a positive integer");
  const expected = new Map<string, CaliforniaSignatureExpectedArtifact>();
  const allGroupKeys = new Set<string>();
  let evidenceRecordCount = 0;
  let cropCount = 0;
  let receiptCount = 0;
  for (const [packageIndex, workPackage] of manifest.packages.entries()) {
    const workPackageRecord: unknown = workPackage;
    assertRecord(workPackageRecord,
      `California signature group-owned package ${packageIndex}`);
    assertExactKeys(workPackageRecord, [
      "packageId",
      "projects",
      "slotIndex"
    ], `California signature group-owned package ${packageIndex}`);
    assert.equal(workPackage.slotIndex, packageIndex,
      "California signature execution ownership package slots drifted");
    assertLogicalSegment(workPackage.packageId,
      "California signature group-owned packageId");
    assert.equal(
      workPackage.packageId,
      `signature-final-compositor-capacity-${String(packageIndex + 1).padStart(3, "0")}`,
      "California signature group-owned canonical packageId drifted"
    );
    assert.ok(Array.isArray(workPackage.projects),
      `${workPackage.packageId}: group-owned projects must be an array`);
    assert.equal(workPackage.projects.length, CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS.length,
      `${workPackage.packageId}: group-owned project count drifted`);
    const shard = shardTotal === 1
      ? null
      : { index: packageIndex % shardTotal + 1, total: shardTotal };
    for (const [projectIndex, projectName] of
      CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS.entries()) {
      const slice = workPackage.projects[projectIndex];
      assert.ok(slice, `${workPackage.packageId}/${projectName}: group-owned slice is missing`);
      const sliceRecord: unknown = slice;
      assertRecord(sliceRecord,
        `${workPackage.packageId}/${projectName}: group-owned project slice`);
      assertExactKeys(sliceRecord, [
        "benchIds",
        "cropCount",
        "expectedRecordCount",
        "groupKeys",
        "projectName",
        "receiptCount"
      ], `${workPackage.packageId}/${projectName}: group-owned project slice`);
      assert.equal(slice.projectName, projectName,
        `${workPackage.packageId}: group-owned project order drifted`);
      assert.ok(Array.isArray(slice.benchIds),
        `${workPackage.packageId}/${projectName}: group-owned benchIds must be an array`);
      assert.ok(slice.benchIds.length > 0,
        `${workPackage.packageId}/${projectName}: group-owned slice has no benches`);
      assert.equal(new Set(slice.benchIds).size, slice.benchIds.length,
        `${workPackage.packageId}/${projectName}: group-owned slice repeats a bench`);
      for (const benchId of slice.benchIds) {
        assertLogicalSegment(benchId,
          `${workPackage.packageId}/${projectName}: group-owned benchId`);
      }
      const ownership: CaliforniaSignatureExecutionGroupOwnership = {
        cropCount: slice.cropCount,
        expectedRecordCount: slice.expectedRecordCount,
        groupKeys: [...slice.groupKeys],
        planSha256: manifest.capacityPlanSha256,
        receiptCount: slice.receiptCount,
        schemaVersion: CALIFORNIA_SIGNATURE_EXECUTION_GROUP_OWNERSHIP_SCHEMA_VERSION,
        sourceIdentitySha256: manifest.sourceIdentitySha256,
        sourceSnapshotSha256: manifest.sourceSnapshotSha256
      };
      assertExecutionGroupOwnership(ownership,
        `${workPackage.packageId}/${projectName}: group-owned expected artifact`);
      const derivedBenchIds: string[] = [];
      const derivedBenchIdSet = new Set<string>();
      for (const groupKey of ownership.groupKeys) {
        const groupFields = groupKey.split("\0");
        assert.equal(groupFields.length, 4,
          `${workPackage.packageId}/${projectName}: group key field count drifted`);
        const [groupProjectName, benchId, axisId, phase] = groupFields as
          [string, string, string, string];
        assert.equal(groupProjectName, projectName,
          `${workPackage.packageId}/${projectName}: group key swaps projects`);
        assert.equal(groupKey, californiaSignatureFinalCompositorGroupKey({
          axisId,
          benchId,
          phase: phase as "functional" | "layout" | "structural",
          projectName: groupProjectName
        }), `${workPackage.packageId}/${projectName}: group key semantics drifted`);
        if (!derivedBenchIdSet.has(benchId)) {
          derivedBenchIdSet.add(benchId);
          derivedBenchIds.push(benchId);
        }
        assert.ok(!allGroupKeys.has(groupKey),
          `${workPackage.packageId}/${projectName}: execution group repeats across packages`);
        allGroupKeys.add(groupKey);
      }
      assert.deepEqual(slice.benchIds, derivedBenchIds,
        `${workPackage.packageId}/${projectName}: benchIds do not derive from exact group keys`);
      evidenceRecordCount += ownership.expectedRecordCount;
      cropCount += ownership.cropCount;
      receiptCount += ownership.receiptCount;
      assert.ok(Number.isSafeInteger(evidenceRecordCount) && Number.isSafeInteger(cropCount) &&
        Number.isSafeInteger(receiptCount),
      "California signature group-owned expected matrix counters overflowed");
      const logical = artifactLogicalIdentity({
        packageId: workPackage.packageId,
        projectName,
        repeatEachIndex: 0,
        runId: options.runId,
        shard
      });
      const key = `${projectName}\0${workPackage.packageId}\0${0}`;
      assert.ok(!expected.has(key),
        `${workPackage.packageId}/${projectName}: group-owned expected artifact repeats`);
      expected.set(key, {
        ...logical,
        benchIds: [...slice.benchIds],
        execution: { repeatEachIndex: 0, retry: 0 },
        executionGroupOwnership: ownership,
        packageId: workPackage.packageId,
        projectName,
        shard
      });
    }
  }
  assert.equal(expected.size, 102,
    "California signature group-owned expected matrix must remain 51x2");
  assert.equal(allGroupKeys.size, manifest.groupCount,
    "California signature group-owned expected matrix group count drifted");
  assert.equal(evidenceRecordCount, manifest.evidenceRecordCount,
    "California signature group-owned expected matrix evidence count drifted");
  assert.equal(cropCount, manifest.cropCount,
    "California signature group-owned expected matrix crop count drifted");
  assert.equal(receiptCount, manifest.receiptCount,
    "California signature group-owned expected matrix receipt count drifted");
  return expected;
}

export function buildCaliforniaSignatureGroupOwnedExpectedArtifactMatrix(options: {
  ownershipManifest: CaliforniaSignatureExecutionGroupOwnershipManifest;
  runId: string;
  shardTotal?: number;
}) {
  const expected = buildCaliforniaSignatureGroupOwnedExpectedArtifactMatrixInternal(options);
  assertCaliforniaSignatureExecutionGroupOwnershipValidated(options.ownershipManifest);
  return expected;
}

export function readCaliforniaSignatureExecutionGroupOwnershipManifest(options: {
  allowedRoot: string;
  expectedSha256: string;
  expectedSourceSnapshotSha256: string;
  manifestPath: string;
}) {
  const allowedRoot = path.resolve(options.allowedRoot);
  const manifestPath = path.resolve(options.manifestPath);
  assert.equal(options.manifestPath, manifestPath,
    "California signature execution ownership path must be absolute and normalized");
  const relative = path.relative(allowedRoot, manifestPath);
  assert.ok(relative && relative !== ".." && !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative),
  "California signature execution ownership manifest escapes its allowed Starship root");
  assert.ok(allowedRoot.startsWith("/Volumes/Starship/") &&
    manifestPath.startsWith("/Volumes/Starship/"),
  "California signature execution ownership manifest must remain on /Volumes/Starship");
  assertSha256(options.expectedSha256,
    "California signature execution ownership external byte receipt");
  assertSha256(options.expectedSourceSnapshotSha256,
    "California signature execution ownership expected source snapshot");
  const pathIdentity = lstatSync(manifestPath, { bigint: true });
  assert.ok(pathIdentity.isFile() && !pathIdentity.isSymbolicLink() &&
    pathIdentity.nlink === BigInt(1),
  "California signature execution ownership manifest must be one regular non-linked file");
  assert.equal(realpathSync(manifestPath), manifestPath,
    "California signature execution ownership manifest traverses a symlink");
  const fd = openSync(manifestPath,
    fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  let bytes: Buffer;
  try {
    const before = fstatSync(fd, { bigint: true });
    assert.equal(before.dev, pathIdentity.dev,
      "California signature execution ownership device changed before held-FD read");
    assert.equal(before.ino, pathIdentity.ino,
      "California signature execution ownership inode changed before held-FD read");
    bytes = readFileSync(fd);
    const after = fstatSync(fd, { bigint: true });
    for (const key of ["dev", "ino", "size", "mtimeNs", "ctimeNs", "nlink"] as const) {
      assert.equal(after[key], before[key],
        `California signature execution ownership held-FD ${key} changed during read`);
    }
    const finalPath = lstatSync(manifestPath, { bigint: true });
    assert.equal(finalPath.dev, before.dev,
      "California signature execution ownership path device changed during read");
    assert.equal(finalPath.ino, before.ino,
      "California signature execution ownership path inode changed during read");
  } finally {
    closeSync(fd);
  }
  const fileSha256 = sha256(bytes);
  assert.equal(fileSha256, options.expectedSha256,
    "California signature execution ownership bytes differ from the external receipt");
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(
      `California signature execution ownership manifest is invalid JSON: ${
        error instanceof Error ? error.message : String(error)}`
    );
  }
  assertRecord(parsed, "California signature execution ownership manifest");
  const manifest = parsed as unknown as CaliforniaSignatureExecutionGroupOwnershipManifest;
  assert.equal(manifest.sourceSnapshotSha256, options.expectedSourceSnapshotSha256,
    "California signature execution ownership manifest mixes source snapshots");
  // Reuse the exact 51x2 matrix validator so a byte-receipted but schema-valid
  // legacy whole-bench payload cannot be interpreted as a group plan.
  buildCaliforniaSignatureGroupOwnedExpectedArtifactMatrixInternal({
    ownershipManifest: manifest,
    runId: "ca-signature-ownership-read-validation-0123456789abcdef"
  });
  const validatedManifest = markCaliforniaSignatureExecutionGroupOwnershipValidated(
    structuredClone(manifest)
  );
  return { fileSha256, manifest: validatedManifest };
}

function sortedCaliforniaSignatureExpectedArtifacts(
  expectedMatrix: ReadonlyMap<string, CaliforniaSignatureExpectedArtifact>
) {
  assert.ok(expectedMatrix.size > 0, "California signature expected artifact matrix is empty");
  const values = [...expectedMatrix.values()].map((value) => structuredClone(value));
  const keys = new Set<string>();
  for (const expected of values) {
    const key = `${expected.projectName}\0${expected.packageId}\0${expected.execution.repeatEachIndex}`;
    assert.ok(!keys.has(key), `California signature expected artifact matrix repeats ${key}`);
    keys.add(key);
    assert.deepEqual(expectedMatrix.get(key), expected,
      `${key}: California signature expected artifact map key/value drifted`);
    const logical = artifactLogicalIdentity({
      packageId: expected.packageId,
      projectName: expected.projectName,
      repeatEachIndex: expected.execution.repeatEachIndex,
      runId: expected.artifactId.split("__", 1)[0]!,
      shard: expected.shard
    });
    assert.equal(expected.artifactId, logical.artifactId, `${key}: expected artifactId is not canonical`);
    assert.equal(expected.fileName, logical.fileName, `${key}: expected filename is not canonical`);
    assert.equal(expected.execution.retry, 0, `${key}: expected retry is not frozen to zero`);
    assertExecutionGroupOwnership(expected.executionGroupOwnership,
      `${key}: expected artifact execution-group ownership`);
    assert.ok(expected.benchIds.length > 0, `${key}: expected artifact owns no benches`);
    assert.equal(new Set(expected.benchIds).size, expected.benchIds.length,
      `${key}: expected artifact repeats a bench`);
  }
  return values.sort((left, right) => left.fileName.localeCompare(right.fileName));
}

function californiaSignatureExpectedArtifactsSha256(
  expectedMatrix: ReadonlyMap<string, CaliforniaSignatureExpectedArtifact>
) {
  return sha256(stableJson(sortedCaliforniaSignatureExpectedArtifacts(expectedMatrix)));
}

function exactCaliforniaSignatureArtifactByteIdentities(
  loaded: readonly CaliforniaSignatureLoadedArtifact[]
): CaliforniaSignatureArtifactByteIdentity[] {
  return loaded.map(({ artifact, fileName, fileSha256 }) => ({
    artifactId: artifact.artifactId,
    evidenceChunkMerkleRootSha256: artifact.evidenceStream.chunkMerkleRootSha256,
    evidenceChunks: artifact.evidenceStream.chunks.map((chunk) => ({
      fileName: chunk.fileName,
      framedBytes: chunk.framedBytes,
      recordCount: chunk.recordCount,
      recordMerkleRootSha256: chunk.recordMerkleRootSha256,
      sha256: chunk.sha256
    })),
    evidenceFramedBytes: artifact.evidenceStream.framedBytes,
    evidenceManifestSha256: sha256(
      canonicalCaliforniaSignatureEvidenceJson(artifact.evidenceStream)
    ),
    evidenceRecordCount: artifact.evidenceStream.recordCount,
    evidenceStreamOwnershipSha256: artifact.evidenceStreamOwnershipSha256,
    executionGroupOwnership: artifact.executionGroupOwnership
      ? structuredClone(artifact.executionGroupOwnership)
      : null,
    fileName,
    sha256: fileSha256
  })).sort((left, right) => left.fileName.localeCompare(right.fileName));
}

function assertArtifactByteIdentities(
  value: unknown,
  label: string
): asserts value is CaliforniaSignatureArtifactByteIdentity[] {
  assert.ok(Array.isArray(value) && value.length > 0, `${label}: artifacts must be one non-empty array`);
  for (const artifact of value) {
    assertRecord(artifact, `${label}: artifact byte identity`);
    assertExactKeys(
      artifact,
      [
        "artifactId",
        "evidenceChunkMerkleRootSha256",
        "evidenceChunks",
        "evidenceFramedBytes",
        "evidenceManifestSha256",
        "evidenceRecordCount",
        "evidenceStreamOwnershipSha256",
        "executionGroupOwnership",
        "fileName",
        "sha256"
      ],
      `${label}: artifact byte identity`
    );
    assert.ok(typeof artifact.artifactId === "string" && artifact.artifactId.length > 0,
      `${label}: artifactId is invalid`);
    assert.ok(
      typeof artifact.fileName === "string" &&
        artifact.fileName.endsWith(CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX),
      `${label}: official artifact filename is invalid`
    );
    assert.ok(typeof artifact.sha256 === "string" && SHA256_PATTERN.test(artifact.sha256),
      `${label}: artifact SHA-256 is invalid`);
    assert.ok(typeof artifact.evidenceChunkMerkleRootSha256 === "string" &&
      SHA256_PATTERN.test(artifact.evidenceChunkMerkleRootSha256),
    `${label}: evidence chunk Merkle root is invalid`);
    assert.ok(typeof artifact.evidenceManifestSha256 === "string" &&
      SHA256_PATTERN.test(artifact.evidenceManifestSha256),
    `${label}: evidence manifest SHA-256 is invalid`);
    assert.ok(typeof artifact.evidenceStreamOwnershipSha256 === "string" &&
      SHA256_PATTERN.test(artifact.evidenceStreamOwnershipSha256),
    `${label}: evidence stream ownership SHA-256 is invalid`);
    assertExecutionGroupOwnership(
      artifact.executionGroupOwnership as CaliforniaSignatureExecutionGroupOwnership | null,
      `${label}: artifact byte execution-group ownership`
    );
    assert.ok(Array.isArray(artifact.evidenceChunks) && artifact.evidenceChunks.length > 0,
      `${label}: evidence chunks must be one non-empty array`);
    let chunkFramedBytes = 0;
    let chunkRecordCount = 0;
    const chunkFileNames = new Set<string>();
    for (const [chunkIndex, chunk] of artifact.evidenceChunks.entries()) {
      assertRecord(chunk, `${label}: evidence chunk ${chunkIndex}`);
      assertExactKeys(
        chunk,
        ["fileName", "framedBytes", "recordCount", "recordMerkleRootSha256", "sha256"],
        `${label}: evidence chunk ${chunkIndex}`
      );
      assert.ok(typeof chunk.fileName === "string" && chunk.fileName.endsWith(".frame") &&
        path.basename(chunk.fileName) === chunk.fileName,
      `${label}: evidence chunk ${chunkIndex} filename is invalid`);
      assert.equal(chunkFileNames.has(chunk.fileName), false,
        `${label}: evidence chunk filenames repeat`);
      chunkFileNames.add(chunk.fileName);
      assert.ok(typeof chunk.framedBytes === "number" &&
        Number.isSafeInteger(chunk.framedBytes) && chunk.framedBytes > 0,
      `${label}: evidence chunk ${chunkIndex} framed byte count is invalid`);
      assert.ok(typeof chunk.recordCount === "number" &&
        Number.isSafeInteger(chunk.recordCount) && chunk.recordCount > 0,
      `${label}: evidence chunk ${chunkIndex} record count is invalid`);
      assert.ok(typeof chunk.recordMerkleRootSha256 === "string" &&
        SHA256_PATTERN.test(chunk.recordMerkleRootSha256),
      `${label}: evidence chunk ${chunkIndex} record Merkle root is invalid`);
      assert.ok(typeof chunk.sha256 === "string" && SHA256_PATTERN.test(chunk.sha256),
        `${label}: evidence chunk ${chunkIndex} SHA-256 is invalid`);
      chunkFramedBytes += chunk.framedBytes;
      chunkRecordCount += chunk.recordCount;
    }
    assert.deepEqual(
      artifact.evidenceChunks,
      [...artifact.evidenceChunks].sort((left, right) => left.fileName.localeCompare(right.fileName)),
      `${label}: evidence chunks are not in canonical filename order`
    );
    assert.ok(typeof artifact.evidenceFramedBytes === "number" &&
      Number.isSafeInteger(artifact.evidenceFramedBytes) && artifact.evidenceFramedBytes > 0 &&
      artifact.evidenceFramedBytes <= 8 * 1024 * 1024 * 1024,
    `${label}: evidence framed byte count is invalid`);
    assert.ok(typeof artifact.evidenceRecordCount === "number" &&
      Number.isSafeInteger(artifact.evidenceRecordCount) && artifact.evidenceRecordCount > 0,
      `${label}: evidence record count is invalid`);
    assert.equal(chunkFramedBytes, artifact.evidenceFramedBytes,
      `${label}: evidence chunk bytes do not sum to the artifact byte binding`);
    assert.equal(chunkRecordCount, artifact.evidenceRecordCount,
      `${label}: evidence chunk records do not sum to the artifact count binding`);
    assert.equal(
      californiaSignatureEvidenceMerkleRootSha256(
        artifact.evidenceChunks.map((chunk) => chunk.sha256)
      ),
      artifact.evidenceChunkMerkleRootSha256,
      `${label}: evidence chunk list does not recompute the artifact Merkle root`
    );
  }
  const sorted = [...value].sort((left, right) => left.fileName.localeCompare(right.fileName));
  assert.deepEqual(value, sorted, `${label}: artifact byte identities must use exact filename order`);
  assert.equal(new Set(value.map((artifact) => artifact.fileName)).size, value.length,
    `${label}: artifact byte identities repeat a filename`);
  assert.equal(new Set(value.map((artifact) => artifact.artifactId)).size, value.length,
    `${label}: artifact byte identities repeat an artifactId`);
  const chunkFileNames = value.flatMap((artifact) =>
    artifact.evidenceChunks.map((chunk: CaliforniaSignatureEvidenceChunkByteIdentity) => chunk.fileName)
  );
  assert.equal(new Set(chunkFileNames).size, chunkFileNames.length,
    `${label}: artifact byte identities repeat an evidence chunk filename`);
}

function assertEvidenceReservationIdentities(
  value: unknown,
  label: string
): asserts value is CaliforniaSignatureEvidenceReservationIdentity[] {
  assert.ok(Array.isArray(value) && value.length > 0,
    `${label}: evidence reservations must be one non-empty array`);
  let totalBytes = 0;
  for (const reservation of value) {
    assertRecord(reservation, `${label}: evidence reservation identity`);
    assertExactKeys(
      reservation,
      ["artifactId", "bytes", "fileName", "sha256"],
      `${label}: evidence reservation identity`
    );
    assert.ok(typeof reservation.artifactId === "string" && reservation.artifactId.length > 0,
      `${label}: evidence reservation artifactId is invalid`);
    assert.ok(typeof reservation.bytes === "number" &&
      Number.isSafeInteger(reservation.bytes) && reservation.bytes > 0,
      `${label}: evidence reservation byte count is invalid`);
    assert.ok(typeof reservation.fileName === "string" &&
      reservation.fileName.endsWith(CALIFORNIA_SIGNATURE_EVIDENCE_RESERVATION_SUFFIX),
    `${label}: evidence reservation filename is invalid`);
    assert.ok(typeof reservation.sha256 === "string" && SHA256_PATTERN.test(reservation.sha256),
      `${label}: evidence reservation SHA-256 is invalid`);
    totalBytes += reservation.bytes;
    assert.ok(Number.isSafeInteger(totalBytes) && totalBytes <= CALIFORNIA_SIGNATURE_MAX_EVIDENCE_RUN_BYTES,
      `${label}: evidence reservations exceed the run cap`);
  }
  const sorted = [...value].sort((left, right) => left.fileName.localeCompare(right.fileName));
  assert.deepEqual(value, sorted, `${label}: evidence reservations are not in filename order`);
  assert.equal(new Set(value.map((entry) => entry.fileName)).size, value.length,
    `${label}: evidence reservations repeat a filename`);
}

function assertOfficialArtifactSchema(value: Record<string, unknown>, label: string) {
  assertExactKeys(value, OFFICIAL_ARTIFACT_KEYS, label);
  assert.equal(value.lifecycleSchemaVersion, CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
    `${label}: unsupported artifact lifecycle schema`);
  assert.equal(value.schemaVersion, CALIFORNIA_SIGNATURE_EXHAUSTIVE_SCHEMA_VERSION,
    `${label}: unsupported exhaustive evidence schema`);
  assert.equal(value.terminalStatus, "passed", `${label}: official artifact is not terminally passed`);
  assertRecord(value.evidenceStream, `${label}: evidence stream manifest`);
  assertRecord(value.evidenceSnapshot, `${label}: evidence snapshot`);
  assertSha256(value.evidenceStreamOwnershipSha256 as string,
    `${label}: evidence stream ownership`);
  assertExecutionGroupOwnership(
    value.executionGroupOwnership as CaliforniaSignatureExecutionGroupOwnership | null,
    `${label}: execution-group ownership`
  );
  assertExactKeys(
    value.evidenceSnapshot,
    ["blueprintSha256", "keyCount", "keysSha256", "schemaVersion"],
    `${label}: evidence snapshot`
  );
}

async function loadCaliforniaSignatureArtifactsInternal(options: {
  expectedMatrix: ReadonlyMap<string, CaliforniaSignatureExpectedArtifact>;
  expectedIdentity: CaliforniaSignatureArtifactRunIdentity;
  ledgerRoot: string;
  producerState: "forbidden" | "required";
  producerSuccessReceipt?: CaliforniaSignatureProducerSuccessReceipt;
  sealReceipt?: CaliforniaSignatureSealReceipt;
  sealState: "forbidden" | "required";
}) {
  const runDirectory = californiaSignatureArtifactRunDirectory(
    options.ledgerRoot,
    options.expectedIdentity.runId
  );
  const runIdentity = await lstat(runDirectory);
  assert.ok(runIdentity.isDirectory() && !runIdentity.isSymbolicLink(),
    "California signature run directory must be a regular directory, not a symlink");
  const entries = await readdir(runDirectory, { withFileTypes: true });
  const names = entries.map((entry) => entry.name);
  assert.ok(names.includes(CALIFORNIA_SIGNATURE_RUN_MANIFEST_FILENAME),
    "California signature run directory lacks its exact run manifest");
  if (options.producerState === "required") {
    assert.ok(names.includes(CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME),
      "California signature run lacks its producer process-success receipt");
    assert.ok(options.producerSuccessReceipt,
      "California signature loader requires the external producer process-success receipt");
    assert.equal(
      options.producerSuccessReceipt.fileName,
      CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME,
      "California signature external producer receipt names the wrong file"
    );
    assertSha256(options.producerSuccessReceipt.sha256,
      "California signature external producer process-success receipt");
  } else {
    assert.equal(names.includes(CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME), false,
      "California signature open producer run already has a process-success receipt");
  }
  if (options.sealState === "required") {
    assert.ok(names.includes(CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME),
      "California signature run lacks its terminal seal");
    assert.ok(options.sealReceipt,
      "California signature sealed loader requires an external seal receipt");
  } else {
    assert.equal(names.includes(CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME), false,
      "California signature open-run loader refuses an already sealed run");
  }
  const unexpected = entries.filter((entry) =>
    entry.name !== CALIFORNIA_SIGNATURE_RUN_MANIFEST_FILENAME &&
    !(options.producerState === "required" &&
      entry.name === CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME) &&
    !(options.sealState === "required" && entry.name === CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME) &&
    !entry.name.endsWith(CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX) &&
    !entry.name.endsWith(CALIFORNIA_SIGNATURE_EVIDENCE_RESERVATION_SUFFIX) &&
    !entry.name.endsWith(".frame")
  );
  assert.deepEqual(
    unexpected.map((entry) => entry.name),
    [],
    "California signature run directory contains failure/partial/temp/unknown files"
  );
  for (const entry of entries) {
    assert.ok(entry.isFile() && !entry.isSymbolicLink(),
      `${entry.name}: California signature run entries must be regular non-symlink files`);
  }
  const expectedArtifacts = sortedCaliforniaSignatureExpectedArtifacts(options.expectedMatrix);
  const expectedArtifactsSha256 = californiaSignatureExpectedArtifactsSha256(options.expectedMatrix);
  const expectedNames = expectedArtifacts.map((artifact) => artifact.fileName).sort();
  const actualNames = entries
    .filter((entry) => entry.name.endsWith(CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX))
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(actualNames, expectedNames,
    "California signature official files have a missing or extra project/package/repeat item");
  const manifest = await readJsonFile(
    path.join(runDirectory, CALIFORNIA_SIGNATURE_RUN_MANIFEST_FILENAME),
    "California signature run manifest"
  );
  assertRunManifest(manifest.value, options.expectedIdentity);
  let producer: CaliforniaSignatureReadJson | undefined;
  if (options.producerState === "required") {
    producer = await readJsonFile(
      path.join(runDirectory, CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME),
      "California signature producer process-success receipt"
    );
    assert.equal(producer.sha256, options.producerSuccessReceipt!.sha256,
      "California signature producer process-success no longer matches its external receipt");
    assertProducerSuccess({
      expectedArtifactsSha256,
      expectedIdentity: options.expectedIdentity,
      producer
    });
  }

  const loaded: CaliforniaSignatureLoadedArtifact[] = [];
  for (const fileName of actualNames) {
    const read = await readJsonFile(path.join(runDirectory, fileName), fileName);
    assertOfficialArtifactSchema(read.value, fileName);
    loaded.push({
      artifact: read.value as unknown as CaliforniaSignatureOfficialArtifact,
      fileName,
      fileSha256: read.sha256,
      runDirectory
    });
  }
  assert.ok(loaded.length > 0, "California signature run directory has no official artifacts");
  const expectedChunkNames = loaded.flatMap(({ artifact }) =>
    artifact.evidenceStream.chunks.map((chunk) => chunk.fileName)
  );
  assert.equal(new Set(expectedChunkNames).size, expectedChunkNames.length,
    "California signature official artifacts repeat an evidence chunk filename");
  const actualChunkNames = entries.filter((entry) => entry.name.endsWith(".frame"))
    .map((entry) => entry.name);
  exactStringSet(
    expectedChunkNames,
    actualChunkNames,
    "California signature official evidence chunk inventory"
  );
  const reservations = await loadCaliforniaSignatureEvidenceReservations(
    runDirectory,
    options.expectedIdentity.runId
  );
  assert.ok(reservations.identities.length > 0,
    "California signature run has no durable evidence byte reservations");
  const artifactIds = new Set(loaded.map(({ artifact }) => artifact.artifactId));
  for (const reservation of reservations.identities) {
    assert.ok(artifactIds.has(reservation.artifactId),
      `${reservation.fileName}: reservation belongs to no official artifact`);
  }
  const reservedByArtifact = new Map<string, number>();
  for (const reservation of reservations.identities) {
    reservedByArtifact.set(
      reservation.artifactId,
      (reservedByArtifact.get(reservation.artifactId) ?? 0) + reservation.bytes
    );
  }
  for (const { artifact } of loaded) {
    assert.ok((reservedByArtifact.get(artifact.artifactId) ?? 0) >= artifact.evidenceStream.framedBytes,
      `${artifact.artifactId}: evidence bytes exceed the durable run reservation`);
  }
  assert.ok(loaded.reduce((sum, { artifact }) => sum + artifact.evidenceStream.framedBytes, 0) <=
    reservations.totalBytes,
  "California signature evidence stream bytes exceed total durable run reservations");
  const loadedArtifactByteIdentities = exactCaliforniaSignatureArtifactByteIdentities(loaded);
  if (producer) {
    assertArtifactByteIdentities(
      producer.value.artifacts,
      "California signature producer process-success receipt"
    );
    assert.deepEqual(
      producer.value.artifacts,
      loadedArtifactByteIdentities,
      "California signature official artifact bytes no longer match producer process-success"
    );
    assertEvidenceReservationIdentities(
      producer.value.evidenceReservations,
      "California signature producer process-success receipt"
    );
    assert.deepEqual(
      producer.value.evidenceReservations,
      reservations.identities,
      "California signature evidence reservations no longer match producer process-success"
    );
  }
  if (options.sealState === "required") {
    assert.ok(producer, "California signature terminal seal requires producer process-success");
    const seal = await readJsonFile(
      path.join(runDirectory, CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME),
      "California signature run seal"
    );
    await assertRunSeal({
      entries,
      expectedArtifactsSha256,
      expectedIdentity: options.expectedIdentity,
      manifestSha256: manifest.sha256,
      producer,
      runDirectory,
      seal,
      sealReceipt: options.sealReceipt!,
      evidenceReservations: reservations.identities,
      loadedArtifactByteIdentities
    });
  }
  return { loaded, manifest, producer, reservations, runDirectory };
}

export async function loadCaliforniaSignatureOfficialArtifacts(options: {
  expectedIdentity: CaliforniaSignatureArtifactRunIdentity;
  expectedMatrix: ReadonlyMap<string, CaliforniaSignatureExpectedArtifact>;
  ledgerRoot: string;
}) {
  return (await loadCaliforniaSignatureArtifactsInternal({
    ...options,
    producerState: "forbidden",
    sealState: "forbidden"
  })).loaded;
}

export async function loadCaliforniaSignatureSealedOfficialArtifacts(options: {
  expectedIdentity: CaliforniaSignatureArtifactRunIdentity;
  expectedMatrix: ReadonlyMap<string, CaliforniaSignatureExpectedArtifact>;
  ledgerRoot: string;
  producerSuccessReceipt: CaliforniaSignatureProducerSuccessReceipt;
  sealReceipt: CaliforniaSignatureSealReceipt;
}) {
  return (await loadCaliforniaSignatureArtifactsInternal({
    ...options,
    producerState: "required",
    sealState: "required"
  })).loaded;
}

export async function verifyCaliforniaSignatureOfficialArtifactMatrix(options: {
  expectedIdentity: CaliforniaSignatureArtifactRunIdentity;
  expectedMatrix: ReadonlyMap<string, CaliforniaSignatureExpectedArtifact>;
  loaded: readonly CaliforniaSignatureLoadedArtifact[];
  validationContexts: ReadonlyMap<string, CaliforniaSignatureArtifactValidationContext>;
}) {
  assert.ok(options.loaded.length > 0, "no California signature official artifacts were loaded");
  const actualByKey = new Map<string, CaliforniaSignatureLoadedArtifact[]>();
  const artifactIds = new Set<string>();
  const fileNames = new Set<string>();
  for (const item of options.loaded) {
    const { artifact, fileName } = item;
    assertRunIdentity(artifact, options.expectedIdentity, fileName);
    assert.equal(artifact.terminalStatus, "passed", `${fileName}: terminal status is not passed`);
    assert.ok(!Number.isNaN(Date.parse(artifact.createdAt)), `${fileName}: createdAt is invalid`);
    assert.ok(artifact.evidenceStream.recordCount > 0,
      `${fileName}: official artifact has no streamed evidence`);
    assert.equal(artifact.execution.retry, 0, `${fileName}: retry drifted from frozen retries=0`);
    const key = `${artifact.projectName}\0${artifact.packageId}\0${artifact.execution.repeatEachIndex}`;
    const grouped = actualByKey.get(key) ?? [];
    grouped.push(item);
    actualByKey.set(key, grouped);
    assert.ok(!artifactIds.has(artifact.artifactId), `${fileName}: duplicate artifactId ${artifact.artifactId}`);
    artifactIds.add(artifact.artifactId);
    assert.ok(!fileNames.has(fileName), `${fileName}: duplicate official filename`);
    fileNames.add(fileName);
  }
  const duplicateKeys = [...actualByKey].filter(([, artifacts]) => artifacts.length !== 1)
    .map(([key]) => key);
  assert.deepEqual(duplicateKeys, [], "California signature official artifacts contain duplicate logical keys");
  const expectedKeys = [...options.expectedMatrix.keys()].sort();
  const actualKeys = [...actualByKey.keys()].sort();
  assert.deepEqual(actualKeys, expectedKeys,
    "California signature official artifact matrix has missing or extra package/project/repeat keys");
  for (const [key, expected] of options.expectedMatrix) {
    const actual = actualByKey.get(key)![0]!;
    assert.equal(actual.fileName, expected.fileName, `${key}: stray or stale official filename`);
    assert.equal(actual.artifact.artifactId, expected.artifactId, `${key}: artifactId drifted`);
    assert.equal(actual.artifact.packageId, expected.packageId, `${key}: packageId drifted`);
    assert.equal(actual.artifact.projectName, expected.projectName, `${key}: projectName drifted`);
    assert.deepEqual(actual.artifact.shard, expected.shard, `${key}: shard drifted`);
    assert.deepEqual(actual.artifact.execution, expected.execution, `${key}: execution drifted`);
    assert.deepEqual(actual.artifact.executionGroupOwnership,
      expected.executionGroupOwnership,
    `${key}: execution-group ownership drifted`);
    const validationContext = options.validationContexts.get(
      californiaSignatureArtifactValidationContextKey(expected.projectName, expected.packageId)
    ) ?? (expected.executionGroupOwnership === null
      ? options.validationContexts.get(expected.packageId)
      : undefined);
    assert.ok(validationContext, `${key}: package validation context is missing`);
    assert.deepEqual(validationContext.executionGroupOwnership,
      expected.executionGroupOwnership,
    `${key}: expected artifact and validation execution-group ownership drifted`);
    exactStringSet(expected.benchIds, validationContext.expectedBenchIds,
      `${key}: expected package and validation benches`);
    await validateCaliforniaSignatureOfficialEvidenceStream({
      artifact: actual.artifact,
      context: validationContext,
      identity: options.expectedIdentity,
      label: `${key}: reloaded official evidence stream`,
      runDirectory: actual.runDirectory
    });
  }
  return [...options.loaded];
}

export type CaliforniaSignatureStreamingAggregateResult = {
  canvasReceiptRows: number;
  canvasSourceSiteCount: number;
  evidenceRows: number;
  runtimeRunId: string;
  snapshot: CaliforniaSignatureEvidenceSnapshot;
  sourceOracleRows: number;
};

const CALIFORNIA_SIGNATURE_MAX_STREAMING_AGGREGATE_RECORDS = 2_000_000;
const CALIFORNIA_SIGNATURE_MAX_STREAMING_CANVAS_IDENTITIES = 1_500_000;

type CaliforniaSignatureAggregatePackage = {
  benchIds: readonly string[];
  entries: CaliforniaSignatureExpectedArtifact[];
  firstBenchIndex: number;
  packageId: string;
};

function californiaSignatureAggregatePackages(options: {
  expectedMatrix: ReadonlyMap<string, CaliforniaSignatureExpectedArtifact>;
  manifest: CaliforniaSignatureSourceManifest;
}) {
  const benchIndex = new Map<string, number>(
    options.manifest.benches.map((bench, index) => [bench.benchId, index])
  );
  const byPackage = new Map<string, CaliforniaSignatureAggregatePackage>();
  for (const expected of options.expectedMatrix.values()) {
    assert.ok(expected.execution.repeatEachIndex === 0,
      `${expected.packageId}: terminal aggregate rejects repeated evidence executions`);
    const indices = expected.benchIds.map((benchId) => {
      const index = benchIndex.get(benchId);
      assert.ok(index !== undefined,
        `${expected.packageId}: terminal aggregate cites unknown bench ${benchId}`);
      return index;
    });
    assert.deepEqual(indices, [...indices].sort((left, right) => left - right),
      `${expected.packageId}: terminal aggregate benches are not in source order`);
    const existing = byPackage.get(expected.packageId);
    if (existing) {
      assert.deepEqual(expected.benchIds, existing.benchIds,
        `${expected.packageId}: terminal aggregate project bench ownership drifted`);
      existing.entries.push(expected);
    } else {
      byPackage.set(expected.packageId, {
        benchIds: [...expected.benchIds],
        entries: [expected],
        firstBenchIndex: indices[0]!,
        packageId: expected.packageId
      });
    }
  }
  const packages = [...byPackage.values()].sort((left, right) =>
    left.firstBenchIndex - right.firstBenchIndex
  );
  for (const workPackage of packages) {
    exactStringSet(
      CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS,
      workPackage.entries.map((entry) => entry.projectName),
      `${workPackage.packageId}: terminal aggregate project partition`
    );
  }
  assert.deepEqual(
    packages.flatMap((workPackage) => workPackage.benchIds),
    options.manifest.benches.map((bench) => bench.benchId),
    "California signature terminal aggregate package benches are not one exact source partition"
  );
  return packages;
}

async function* iterateCaliforniaSignatureActualAggregate(options: {
  expectedMatrix: ReadonlyMap<string, CaliforniaSignatureExpectedArtifact>;
  loaded: readonly CaliforniaSignatureLoadedArtifact[];
  manifest: CaliforniaSignatureSourceManifest;
  validationContexts: ReadonlyMap<string, CaliforniaSignatureArtifactValidationContext>;
}): AsyncGenerator<CaliforniaSignatureExactEvidenceRecord> {
  const loadedByArtifactId = new Map(options.loaded.map((item) => [item.artifact.artifactId, item]));
  assert.equal(loadedByArtifactId.size, options.loaded.length,
    "California signature terminal aggregate repeats an artifactId");
  const ownershipModes = new Set([...options.expectedMatrix.values()].map((expected) =>
    expected.executionGroupOwnership === null ? "legacy" : "group-plan"
  ));
  assert.equal(ownershipModes.size, 1,
    "California signature terminal aggregate rejects mixed legacy/group-plan ownership");
  if (ownershipModes.has("group-plan")) {
    type GroupCursor = {
      globalOrderKey: string;
      iterator: AsyncGenerator<Record<string, unknown> & { key: string }>;
      record: CaliforniaSignatureExactEvidenceRecord;
    };
    const heap: GroupCursor[] = [];
    const iterators: Array<AsyncGenerator<Record<string, unknown> & { key: string }>> = [];
    const push = (cursor: GroupCursor) => {
      heap.push(cursor);
      let index = heap.length - 1;
      while (index > 0) {
        const parent = Math.floor((index - 1) / 2);
        if (heap[parent]!.globalOrderKey < heap[index]!.globalOrderKey) break;
        assert.notEqual(heap[parent]!.globalOrderKey, heap[index]!.globalOrderKey,
          "California signature group-plan streams repeat a semantic evidence key");
        [heap[parent], heap[index]] = [heap[index]!, heap[parent]!];
        index = parent;
      }
    };
    const pop = () => {
      const first = heap[0]!;
      const tail = heap.pop()!;
      if (heap.length > 0) {
        heap[0] = tail;
        let index = 0;
        for (;;) {
          const left = index * 2 + 1;
          const right = left + 1;
          let smallest = index;
          if (left < heap.length &&
              heap[left]!.globalOrderKey < heap[smallest]!.globalOrderKey) smallest = left;
          if (right < heap.length &&
              heap[right]!.globalOrderKey < heap[smallest]!.globalOrderKey) smallest = right;
          if (smallest === index) break;
          assert.notEqual(heap[index]!.globalOrderKey, heap[smallest]!.globalOrderKey,
            "California signature group-plan streams repeat a semantic evidence key");
          [heap[index], heap[smallest]] = [heap[smallest]!, heap[index]!];
          index = smallest;
        }
      }
      return first;
    };
    try {
      for (const expected of options.expectedMatrix.values()) {
        assert.ok(expected.executionGroupOwnership,
          `${expected.packageId}/${expected.projectName}: group-plan aggregate ownership is missing`);
        const loaded = loadedByArtifactId.get(expected.artifactId);
        assert.ok(loaded,
          `${expected.packageId}/${expected.projectName}: group-plan aggregate artifact is missing`);
        const context = options.validationContexts.get(
          californiaSignatureArtifactValidationContextKey(
            expected.projectName,
            expected.packageId
          )
        );
        assert.ok(context,
          `${expected.packageId}/${expected.projectName}: group-plan aggregate context is missing`);
        assert.deepEqual(context.executionGroupOwnership, expected.executionGroupOwnership,
          `${expected.packageId}/${expected.projectName}: group-plan aggregate ownership drifted`);
        const iterator = readCaliforniaSignatureEvidenceStream({
          manifest: loaded.artifact.evidenceStream,
          orderKey(record) {
            assertCaliforniaSignatureExactEvidenceRecordSchema(
              record,
              `${expected.packageId}/${expected.projectName}: group-plan local stream order`
            );
            return californiaSignatureExactEvidenceOrderKey({
              manifest: context.manifest,
              record
            });
          },
          runDirectory: loaded.runDirectory
        });
        iterators.push(iterator);
        const first = await iterator.next();
        assert.equal(first.done, false,
          `${expected.packageId}/${expected.projectName}: group-plan stream is empty`);
        assertCaliforniaSignatureExactEvidenceRecordSchema(
          first.value,
          `${expected.packageId}/${expected.projectName}: first group-plan aggregate record`
        );
        push({
          globalOrderKey: californiaSignatureExactEvidenceOrderKey({
            manifest: options.manifest,
            record: first.value
          }),
          iterator,
          record: first.value
        });
      }
      let previousGlobalOrderKey: string | null = null;
      while (heap.length > 0) {
        const cursor = pop();
        assert.ok(previousGlobalOrderKey === null ||
          previousGlobalOrderKey < cursor.globalOrderKey,
        "California signature group-plan aggregate is duplicate or retrograde");
        previousGlobalOrderKey = cursor.globalOrderKey;
        yield cursor.record;
        const next = await cursor.iterator.next();
        if (next.done) continue;
        assertCaliforniaSignatureExactEvidenceRecordSchema(
          next.value,
          "California signature group-plan aggregate record"
        );
        cursor.record = next.value;
        cursor.globalOrderKey = californiaSignatureExactEvidenceOrderKey({
          manifest: options.manifest,
          record: next.value
        });
        push(cursor);
      }
    } finally {
      await Promise.all(iterators.map(async (iterator) => {
        try {
          await iterator.return(undefined);
        } catch {
          // Preserve the primary streaming/authentication failure.
        }
      }));
    }
    return;
  }
  for (const workPackage of californiaSignatureAggregatePackages(options)) {
    const context = options.validationContexts.get(workPackage.packageId);
    assert.ok(context,
      `${workPackage.packageId}: terminal aggregate validation context is missing`);
    type Cursor = {
      globalOrderKey: string;
      iterator: AsyncGenerator<Record<string, unknown> & { key: string }>;
      record: CaliforniaSignatureExactEvidenceRecord;
    };
    const cursors: Cursor[] = [];
    const iterators: Array<AsyncGenerator<Record<string, unknown> & { key: string }>> = [];
    try {
      for (const expected of workPackage.entries) {
        const loaded = loadedByArtifactId.get(expected.artifactId);
        assert.ok(loaded,
          `${workPackage.packageId}/${expected.projectName}: terminal aggregate artifact is missing`);
        const iterator = readCaliforniaSignatureEvidenceStream({
          manifest: loaded.artifact.evidenceStream,
          orderKey(record) {
            assertCaliforniaSignatureExactEvidenceRecordSchema(
              record,
              `${workPackage.packageId}/${expected.projectName}: local stream order`
            );
            return californiaSignatureExactEvidenceOrderKey({
              manifest: context.manifest,
              record
            });
          },
          runDirectory: loaded.runDirectory
        });
        iterators.push(iterator);
        const first = await iterator.next();
        assert.equal(first.done, false,
          `${workPackage.packageId}/${expected.projectName}: terminal aggregate stream is empty`);
        assertCaliforniaSignatureExactEvidenceRecordSchema(
          first.value,
          `${workPackage.packageId}/${expected.projectName}: first aggregate record`
        );
        cursors.push({
          globalOrderKey: californiaSignatureExactEvidenceOrderKey({
            manifest: options.manifest,
            record: first.value
          }),
          iterator,
          record: first.value
        });
      }
      while (cursors.length > 0) {
        let minimumIndex = 0;
        for (let index = 1; index < cursors.length; index += 1) {
          assert.notEqual(cursors[index]!.globalOrderKey, cursors[minimumIndex]!.globalOrderKey,
            `${workPackage.packageId}: project streams repeat a semantic evidence key`);
          if (cursors[index]!.globalOrderKey < cursors[minimumIndex]!.globalOrderKey) {
            minimumIndex = index;
          }
        }
        const cursor = cursors[minimumIndex]!;
        yield cursor.record;
        const next = await cursor.iterator.next();
        if (next.done) {
          cursors.splice(minimumIndex, 1);
          continue;
        }
        assertCaliforniaSignatureExactEvidenceRecordSchema(
          next.value,
          `${workPackage.packageId}: aggregate stream record`
        );
        cursor.record = next.value;
        cursor.globalOrderKey = californiaSignatureExactEvidenceOrderKey({
          manifest: options.manifest,
          record: next.value
        });
      }
    } finally {
      await Promise.all(iterators.map(async (iterator) => {
        try {
          await iterator.return(undefined);
        } catch {
          // Preserve the primary streaming/authentication failure.
        }
      }));
    }
  }
}

/**
 * Terminal, bounded-memory verification.  This independently reopens every
 * authenticated stream and merge-compares each exact record with the lazy
 * full-source oracle.  Only bounded validation batches and global uniqueness
 * identities are retained; no evidence-record array is constructed.
 */
export async function validateCaliforniaSignatureStreamingAggregate(options: {
  expectedIdentity: CaliforniaSignatureArtifactRunIdentity;
  expectedMatrix: ReadonlyMap<string, CaliforniaSignatureExpectedArtifact>;
  externalExpectations: CaliforniaSignatureExternalEvidenceExpectations;
  loaded: readonly CaliforniaSignatureLoadedArtifact[];
  manifest: CaliforniaSignatureSourceManifest;
  sourceEvidenceOracle: CaliforniaSignatureSourceExpectedEvidenceOracle;
  validationContexts: ReadonlyMap<string, CaliforniaSignatureArtifactValidationContext>;
}): Promise<CaliforniaSignatureStreamingAggregateResult> {
  assert.equal(options.externalExpectations.expectedRuntimeRunId, options.expectedIdentity.runtimeRunId,
    "California signature streaming aggregate runtime identity drifted");
  assert.equal(options.externalExpectations.expectedOrigin, options.expectedIdentity.origin,
    "California signature streaming aggregate origin drifted");
  const expected = iterateCaliforniaSignatureExpandedSourceEvidenceOracle({
    manifest: options.manifest,
    oracle: options.sourceEvidenceOracle
  });
  let expectedEntry = expected.next();
  const orderedKeyHash = createHash("sha256");
  const receiptIds = new Set<string>();
  const logicalCanvasStates = new Set<string>();
  const observedCanvasSourceSites = new Set<string>();
  const runtimeRunIds = new Set<string>();
  let evidenceRows = 0;
  let canvasReceiptRows = 0;
  let expectedCanvasReceiptRows = 0;
  let validationBatch: CaliforniaSignatureExactEvidenceRecord[] = [];
  let validationBatchBytes = 0;
  const flush = () => {
    if (validationBatch.length === 0) return;
    validateCaliforniaSignatureEvidenceRecords({
      evidence: validationBatch,
      externalExpectations: options.externalExpectations,
      manifest: options.manifest
    });
    validationBatch = [];
    validationBatchBytes = 0;
  };
  for await (const record of iterateCaliforniaSignatureActualAggregate(options)) {
    assert.ok(evidenceRows < CALIFORNIA_SIGNATURE_MAX_STREAMING_AGGREGATE_RECORDS,
      `California signature terminal aggregate exceeds ${CALIFORNIA_SIGNATURE_MAX_STREAMING_AGGREGATE_RECORDS} records`);
    assert.equal(expectedEntry.done, false,
      `${record.benchId}/${record.stepKey}: terminal aggregate contains an extra record`);
    const sourceExpectation = expectedEntry.value!;
    const globalOrderKey = californiaSignatureExactEvidenceOrderKey({
      manifest: options.manifest,
      record
    });
    assert.equal(globalOrderKey, sourceExpectation.orderKey,
      `${record.benchId}/${record.stepKey}: terminal aggregate/source semantic order drifted`);
    assert.equal(
      californiaSignatureExpandedOracleKeyFromRecord({ manifest: options.manifest, record }),
      sourceExpectation.key,
      `${record.benchId}/${record.stepKey}: terminal aggregate/source identity drifted`
    );
    assert.equal(record.benchId, sourceExpectation.benchId,
      `${record.benchId}/${record.stepKey}: terminal aggregate/source bench drifted`);
    const sourceRequiresCanvas = sourceExpectation.canvasSurface?.requiredPhases.includes(
      sourceExpectation.phase
    ) ?? false;
    expectedCanvasReceiptRows += sourceRequiresCanvas ? 1 : 0;
    assert.equal(record.canvasGraphicsEvidence !== null, sourceRequiresCanvas,
      `${record.benchId}/${record.stepKey}: terminal aggregate/source Canvas requirement drifted`);
    orderedKeyHash.update(record.key).update("\n");
    const canonicalBytes = Buffer.byteLength(canonicalCaliforniaSignatureEvidenceJson(record), "utf8");
    if (validationBatch.length > 0 &&
        (validationBatch.length >= 128 || validationBatchBytes + canonicalBytes > 16 * 1024 * 1024)) {
      flush();
    }
    validationBatch.push(record);
    validationBatchBytes += canonicalBytes;
    if (record.canvasGraphicsEvidence) {
      const canvas = record.canvasGraphicsEvidence;
      assert.ok(canvasReceiptRows < CALIFORNIA_SIGNATURE_MAX_STREAMING_CANVAS_IDENTITIES,
        `California signature Canvas aggregate exceeds ${CALIFORNIA_SIGNATURE_MAX_STREAMING_CANVAS_IDENTITIES} receipts`);
      assert.equal(receiptIds.has(canvas.receiptId), false,
        `California signature Canvas aggregate repeats one-shot receipt ${canvas.receiptId}`);
      receiptIds.add(canvas.receiptId);
      const logicalState = [
        [...new Set(canvas.canvases.map((surface) => surface.benchId))].sort().join(","),
        canvas.capturedUrl,
        canvas.stateKey,
        canvas.surfaceKey
      ].join("|");
      assert.equal(logicalCanvasStates.has(logicalState), false,
        `California signature Canvas aggregate repeats logical state ${logicalState}`);
      logicalCanvasStates.add(logicalState);
      runtimeRunIds.add(canvas.runtimeRunId);
      for (const sourceSiteKey of canvas.observedSourceSiteKeys) {
        observedCanvasSourceSites.add(sourceSiteKey);
      }
      canvasReceiptRows += 1;
    }
    evidenceRows += 1;
    expectedEntry = expected.next();
  }
  flush();
  assert.equal(expectedEntry.done, true,
    "California signature terminal aggregate ended before the complete source oracle");
  assert.equal(canvasReceiptRows, expectedCanvasReceiptRows,
    "California signature terminal aggregate Canvas receipt count drifted from source truth");
  if (expectedCanvasReceiptRows > 0) {
    assert.equal(runtimeRunIds.size, 1,
      "California signature terminal aggregate has a missing or mixed Canvas runtime run");
    assert.deepEqual([...runtimeRunIds], [options.expectedIdentity.runtimeRunId],
      "California signature terminal aggregate Canvas runtime identity drifted");
    const canvasContract = buildCaliforniaCanvasGraphicsSourceContract();
    const expectedCanvasSourceSites = canvasContract.paintSites
      .filter((site) => site.role === "essential")
      .map((site) => site.sourceSiteKey)
      .sort();
    exactStringSet(
      expectedCanvasSourceSites,
      [...observedCanvasSourceSites],
      "California signature terminal aggregate essential Canvas source sites"
    );
  } else {
    assert.equal(runtimeRunIds.size, 0,
      "California signature terminal aggregate carries Canvas runtime IDs without source receipts");
    assert.equal(observedCanvasSourceSites.size, 0,
      "California signature terminal aggregate carries Canvas source sites without source receipts");
  }
  const snapshot: CaliforniaSignatureEvidenceSnapshot = {
    blueprintSha256: options.manifest.blueprintSha256,
    keyCount: evidenceRows,
    keysSha256: orderedKeyHash.digest("hex"),
    schemaVersion: CALIFORNIA_SIGNATURE_EXHAUSTIVE_SCHEMA_VERSION
  };
  return {
    canvasReceiptRows,
    canvasSourceSiteCount: observedCanvasSourceSites.size,
    evidenceRows,
    runtimeRunId: options.expectedIdentity.runtimeRunId,
    snapshot,
    sourceOracleRows: options.sourceEvidenceOracle.counts.evidenceRows
  };
}

export function assertReviewedCaliforniaSignatureStreamingAggregate(
  aggregate: CaliforniaSignatureStreamingAggregateResult
) {
  return assertReviewedCaliforniaSignatureExhaustiveSnapshotCandidate(aggregate.snapshot);
}

export async function publishCaliforniaSignatureExhaustiveProducerSuccess(options: {
  expectedIdentity: CaliforniaSignatureArtifactRunIdentity;
  expectedMatrix: ReadonlyMap<string, CaliforniaSignatureExpectedArtifact>;
  ledgerRoot: string;
  producerReportSha256: string;
  validationContexts: ReadonlyMap<string, CaliforniaSignatureArtifactValidationContext>;
}) {
  assertSha256(options.producerReportSha256,
    "California signature producer Playwright report");
  return withCaliforniaSignaturePublicationLock({
    ledgerRoot: options.ledgerRoot,
    runId: options.expectedIdentity.runId,
    async task() {
      const runDirectory = await initializeCaliforniaSignatureArtifactRunDirectory({
        identity: options.expectedIdentity,
        ledgerRoot: options.ledgerRoot
      });
      await assertCaliforniaSignatureRunIsUnsealed(runDirectory);
      const openRun = await loadCaliforniaSignatureArtifactsInternal({
        ...options,
        producerState: "forbidden",
        sealState: "forbidden"
      });
      await verifyCaliforniaSignatureOfficialArtifactMatrix({
        expectedIdentity: options.expectedIdentity,
        expectedMatrix: options.expectedMatrix,
        loaded: openRun.loaded,
        validationContexts: options.validationContexts
      });
      const producer: CaliforniaSignatureProducerSuccess = {
        ...structuredClone(options.expectedIdentity),
        artifacts: exactCaliforniaSignatureArtifactByteIdentities(openRun.loaded),
        evidenceReservations: openRun.reservations.identities,
        expectedArtifactsSha256: californiaSignatureExpectedArtifactsSha256(options.expectedMatrix),
        lifecycleSchemaVersion: CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
        producerReportSha256: options.producerReportSha256,
        publishedAt: new Date().toISOString(),
        status: "producer-succeeded"
      };
      const publication = await writeExclusiveJson(
        path.join(runDirectory, CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME),
        producer
      );
      const receipt: CaliforniaSignatureProducerSuccessReceipt = {
        fileName: CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME,
        sha256: publication.sha256
      };
      const reread = await loadCaliforniaSignatureArtifactsInternal({
        ...options,
        producerState: "required",
        producerSuccessReceipt: receipt,
        sealState: "forbidden"
      });
      await verifyCaliforniaSignatureOfficialArtifactMatrix({
        expectedIdentity: options.expectedIdentity,
        expectedMatrix: options.expectedMatrix,
        loaded: reread.loaded,
        validationContexts: options.validationContexts
      });
      return receipt;
    }
  });
}

export async function sealCaliforniaSignatureOfficialArtifactRun(options: {
  expectedIdentity: CaliforniaSignatureArtifactRunIdentity;
  expectedMatrix: ReadonlyMap<string, CaliforniaSignatureExpectedArtifact>;
  ledgerRoot: string;
  producerSuccessReceipt: CaliforniaSignatureProducerSuccessReceipt;
  validateAggregate(artifacts: readonly CaliforniaSignatureLoadedArtifact[]): Promise<void> | void;
  validationContexts: ReadonlyMap<string, CaliforniaSignatureArtifactValidationContext>;
}) {
  return withCaliforniaSignaturePublicationLock({
    ledgerRoot: options.ledgerRoot,
    runId: options.expectedIdentity.runId,
    async task() {
      const runDirectory = californiaSignatureArtifactRunDirectory(
        options.ledgerRoot,
        options.expectedIdentity.runId
      );
      await assertCaliforniaSignatureRunIsUnsealed(runDirectory);
      const openRun = await loadCaliforniaSignatureArtifactsInternal({
        ...options,
        producerState: "required",
        sealState: "forbidden"
      });
      const artifacts = await verifyCaliforniaSignatureOfficialArtifactMatrix({
        expectedIdentity: options.expectedIdentity,
        expectedMatrix: options.expectedMatrix,
        loaded: openRun.loaded,
        validationContexts: options.validationContexts
      });
      await options.validateAggregate(artifacts);
      assert.ok(openRun.producer,
        "California signature finalizer requires producer process-success");
      const sealedArtifacts = exactCaliforniaSignatureArtifactByteIdentities(openRun.loaded);
      assert.deepEqual(
        openRun.producer.value.artifacts,
        sealedArtifacts,
        "California signature finalizer refuses artifact bytes that drifted after producer success"
      );
      const seal: CaliforniaSignatureRunSeal = {
        ...structuredClone(options.expectedIdentity),
        artifacts: sealedArtifacts,
        evidenceReservations: openRun.reservations.identities,
        expectedArtifactsSha256: californiaSignatureExpectedArtifactsSha256(options.expectedMatrix),
        lifecycleSchemaVersion: CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
        manifestSha256: openRun.manifest.sha256,
        producerReportSha256: openRun.producer.value.producerReportSha256 as string,
        producerSuccessSha256: openRun.producer.sha256,
        sealedAt: new Date().toISOString(),
        status: "sealed"
      };
      const sealPublication = await writeExclusiveJson(
        path.join(runDirectory, CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME),
        seal
      );
      const sealReceipt: CaliforniaSignatureSealReceipt = {
        fileName: CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME,
        sha256: sealPublication.sha256
      };
      const reloaded = await loadCaliforniaSignatureSealedOfficialArtifacts({
        ...options,
        sealReceipt
      });
      const reloadedArtifacts = await verifyCaliforniaSignatureOfficialArtifactMatrix({
        expectedIdentity: options.expectedIdentity,
        expectedMatrix: options.expectedMatrix,
        loaded: reloaded,
        validationContexts: options.validationContexts
      });
      await options.validateAggregate(reloadedArtifacts);
      return { artifacts: reloadedArtifacts, sealReceipt };
    }
  });
}
