import assert from "node:assert/strict";
import path from "node:path";
import {
  californiaSignatureFinalCompositorPhase3MeasurementCampaignTestFixture as phase3Fixture
} from "./california-signature-final-compositor-phase3-measurement-campaign.test-fixture";
import type {
  CaliforniaSignatureFinalCompositorPhase3ProducerIdentity
} from "./california-signature-final-compositor-phase3-measurement-campaign";
import {
  californiaSignatureFinalCompositorPhase4RealDriverTestFixture as phase4Fixture
} from "./california-signature-final-compositor-phase4-real-driver.test-fixture";
import {
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_MAX_RECEIPT_LIFETIME_MS,
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_SCHEMA_VERSION,
  type CaliforniaSignatureFinalCompositorPhase4AcceptedBuildReceipt,
  type CaliforniaSignatureFinalCompositorPhase4AuthenticatedPlan,
  type CaliforniaSignatureFinalCompositorPhase4LifecycleCheckpoint
} from "./california-signature-final-compositor-phase4-real-driver-contract";
import {
  californiaSignatureFinalCompositorPhase4InternalSha256 as sha256,
  californiaSignatureFinalCompositorPhase4InternalStableJson as stableJson
} from "./california-signature-final-compositor-phase4-real-driver-internal";
import {
  CALIFORNIA_PHASE4_A22_LIFECYCLE_DIRECTORY_PREFIX,
  CALIFORNIA_PHASE4_A22_LIFECYCLE_MAX_AGE_MS,
  CALIFORNIA_PHASE4_A22_LIFECYCLE_PUBLICATION_FILE_NAME,
  CALIFORNIA_PHASE4_A22_LIFECYCLE_SCHEMA_VERSION,
  CALIFORNIA_PHASE4_EXPECTED_RASTER_BLOCKER,
  type CaliforniaPhase4A22HeldDirectoryIdentity,
  type CaliforniaPhase4A22HeldFileIdentity,
  type CaliforniaPhase4A22HeldFileRead,
  type CaliforniaPhase4A22LifecycleLease,
  type CaliforniaPhase4A22LifecyclePublication,
  type CaliforniaPhase4A22LifecycleSnapshot,
  type CaliforniaPhase4A22LifecycleSourceBinding
} from "./california-signature-final-compositor-phase4-a22-lifecycle-contract";

const WORKTREE = "/Volumes/Starship/MAIS-ca-viz-labs-wt" as const;
const TEMPORARY_ROOT = `${WORKTREE}/.tmp`;
const HELD_EVIDENCE_FILE_NAME = "held-a22-lifecycle-evidence.json";
const NOW_UNIX_MS = 1_800_000_000_000;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export type CaliforniaPhase4A22LifecycleTestFault =
  | "accepted-build-drift"
  | "browser-drift"
  | "checkpoint-drift"
  | "clone-authority"
  | "dependency-drift"
  | "directory-device-drift-after-acquisition"
  | "directory-inode-replacement-after-acquisition"
  | "directory-moved"
  | "directory-public"
  | "directory-realpath-replacement-after-acquisition"
  | "directory-symlink"
  | "environment-drift"
  | "evidence-hardlink"
  | "evidence-identity-drift"
  | "evidence-public"
  | "evidence-symlink"
  | "expired"
  | "plan-drift"
  | "publication-byte-drift"
  | "publication-identity-drift"
  | "server-drift"
  | "sharp-drift"
  | "source-drift"
  | "storage-drift";

type TestHarnessOptions = { fault?: CaliforniaPhase4A22LifecycleTestFault };

type LifecycleCheckpoint = {
  authorityNonceSha256: string;
  directory: CaliforniaPhase4A22HeldDirectoryIdentity | null;
  directoryIdentitySha256: string | null;
  evidenceIdentitySha256: string;
  snapshotSha256: string;
};

type LifecycleAuthority = {
  beginFreshDirectory(): Promise<CaliforniaPhase4A22HeldDirectoryIdentity>;
  captureSnapshot(): Promise<CaliforniaPhase4A22LifecycleSnapshot>;
  checkpoint(): Promise<LifecycleCheckpoint>;
  cleanup(): Promise<void>;
  nowUnixMs(): number;
  publishCanonical(bytes: Buffer): Promise<CaliforniaPhase4A22HeldFileRead>;
  readHeldEvidence(): Promise<CaliforniaPhase4A22HeldFileRead>;
};

type AuthorityBrand = {
  authorityNonceSha256: string;
  directoryIdentitySha256: string | null;
  directoryPath: string;
  evidenceIdentitySha256: string;
  snapshotSha256: string;
};

type Observations = {
  checkpointCount: number;
  cleanupCount: number;
  directoryCreateCount: number;
  heldEvidenceReadCount: number;
  publicationWriteCount: number;
};

const authorityBrands = new WeakMap<LifecycleAuthority, AuthorityBrand>();

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

function assertPlainRecord(value: unknown, label: string):
asserts value is Record<string, unknown> {
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

function identity(seed: number, mode: number, size: number): CaliforniaPhase4A22HeldFileIdentity {
  return {
    ctimeNs: String(1_800_000_000_000_000 + seed),
    dev: "42",
    ino: String(90_000 + seed),
    mode,
    mtimeNs: String(1_800_000_000_000_000 + seed),
    nlink: 1,
    size
  };
}

function heldRead(options: {
  bytes: Buffer;
  directoryPath: string;
  fileName: string;
  fault?: "hardlink" | "identity-drift" | "public" | "symlink";
  seed: number;
}): CaliforniaPhase4A22HeldFileRead {
  const requestedPath = path.join(options.directoryPath, options.fileName);
  const base = identity(options.seed, options.fault === "public" ? 0o644 : 0o400,
    options.bytes.length);
  const changed = options.fault === "identity-drift"
    ? { ...base, mtimeNs: String(Number(base.mtimeNs) + 1) }
    : base;
  return {
    bytes: Buffer.from(options.bytes),
    fileName: options.fileName,
    fstatAfter: changed,
    fstatBefore: base,
    lstat: options.fault === "hardlink" ? { ...base, nlink: 2 } : base,
    realPath: options.fault === "symlink" ? `${requestedPath}.target` : requestedPath,
    requestedPath
  };
}

function fileIdentitySha256(read: CaliforniaPhase4A22HeldFileRead): string {
  return sha256(stableJson({
    fileName: read.fileName,
    fstatAfter: read.fstatAfter,
    fstatBefore: read.fstatBefore,
    lstat: read.lstat,
    realPath: read.realPath,
    requestedPath: read.requestedPath
  }));
}

function validateIdentity(value: CaliforniaPhase4A22HeldFileIdentity, label: string): void {
  assertExactKeys(value, ["ctimeNs", "dev", "ino", "mode", "mtimeNs", "nlink", "size"],
    label);
  for (const key of ["ctimeNs", "dev", "ino", "mtimeNs"] as const) {
    assert.match(value[key], /^(?:0|[1-9][0-9]*)$/, `${label}.${key} is not decimal`);
  }
  assert.ok(Number.isSafeInteger(value.mode) && value.mode >= 0, `${label}.mode is invalid`);
  assert.ok(Number.isSafeInteger(value.nlink) && value.nlink > 0, `${label}.nlink is invalid`);
  assert.ok(Number.isSafeInteger(value.size) && value.size >= 0, `${label}.size is invalid`);
}

function validateDirectory(
  directory: CaliforniaPhase4A22HeldDirectoryIdentity,
  brand: AuthorityBrand
): string {
  assertExactKeys(directory, ["directoryPath", "directoryRealPath", "identity"],
    "California Phase4 A22 fresh lifecycle directory");
  assert.equal(path.dirname(directory.directoryPath), TEMPORARY_ROOT,
    "California Phase4 A22 lifecycle directory is not a direct Starship .tmp child");
  assert.ok(path.basename(directory.directoryPath).startsWith(
    CALIFORNIA_PHASE4_A22_LIFECYCLE_DIRECTORY_PREFIX),
  "California Phase4 A22 lifecycle directory lost its prefix");
  assert.equal(directory.directoryPath, brand.directoryPath,
    "California Phase4 A22 lifecycle directory moved after authority branding");
  assert.equal(directory.directoryRealPath, directory.directoryPath,
    "California Phase4 A22 lifecycle directory traverses a symlink");
  validateIdentity(directory.identity, "California Phase4 A22 lifecycle directory identity");
  assert.equal(directory.identity.mode, 0o700,
    "California Phase4 A22 lifecycle directory must remain private mode 0700");
  assert.equal(directory.identity.nlink, 1,
    "California Phase4 A22 lifecycle directory must remain uniquely held");
  return sha256(stableJson(directory));
}

function validateHeldFile(options: {
  brand: AuthorityBrand;
  expectedFileName: string;
  read: CaliforniaPhase4A22HeldFileRead;
}): string {
  const { read } = options;
  assertExactKeys(read, [
    "bytes", "fileName", "fstatAfter", "fstatBefore", "lstat", "realPath", "requestedPath"
  ], `California Phase4 A22 held ${options.expectedFileName}`);
  assert.ok(Buffer.isBuffer(read.bytes),
    `California Phase4 A22 held ${options.expectedFileName} bytes are absent`);
  assert.equal(read.fileName, options.expectedFileName,
    `California Phase4 A22 held ${options.expectedFileName} name drifted`);
  assert.equal(path.dirname(read.requestedPath), options.brand.directoryPath,
    `California Phase4 A22 held ${options.expectedFileName} escaped its fresh .tmp child`);
  assert.equal(read.requestedPath, path.join(options.brand.directoryPath, options.expectedFileName),
    `California Phase4 A22 held ${options.expectedFileName} path drifted`);
  assert.equal(read.realPath, read.requestedPath,
    `California Phase4 A22 held ${options.expectedFileName} traverses a symlink`);
  validateIdentity(read.lstat, `California Phase4 A22 ${options.expectedFileName} lstat`);
  validateIdentity(read.fstatBefore, `California Phase4 A22 ${options.expectedFileName} fstat before`);
  validateIdentity(read.fstatAfter, `California Phase4 A22 ${options.expectedFileName} fstat after`);
  assert.equal(read.lstat.nlink, 1,
    `California Phase4 A22 held ${options.expectedFileName} must have one hard link`);
  assert.deepEqual(read.lstat, read.fstatBefore,
    `California Phase4 A22 held ${options.expectedFileName} changed between lstat and open`);
  assert.deepEqual(read.fstatAfter, read.fstatBefore,
    `California Phase4 A22 held ${options.expectedFileName} changed while read`);
  assert.equal(read.fstatBefore.mode, 0o400,
    `California Phase4 A22 held ${options.expectedFileName} must be mode 0400`);
  assert.equal(read.fstatBefore.nlink, 1,
    `California Phase4 A22 held ${options.expectedFileName} must have one hard link`);
  assert.equal(read.fstatBefore.size, read.bytes.length,
    `California Phase4 A22 held ${options.expectedFileName} size drifted`);
  return fileIdentitySha256(read);
}

function checkpointForReceipt(
  receipt: CaliforniaSignatureFinalCompositorPhase4AcceptedBuildReceipt
): CaliforniaSignatureFinalCompositorPhase4LifecycleCheckpoint {
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

let exactSourcePromise: Promise<CaliforniaPhase4A22LifecycleSourceBinding> | undefined;
async function exactSource(): Promise<CaliforniaPhase4A22LifecycleSourceBinding> {
  exactSourcePromise ??= (async () => {
    const sourceReceipt = await phase3Fixture.produceCurrentSourceReceipt();
    const executionPlan = phase3Fixture.bindSourcePlan(sourceReceipt);
    const subjects = await phase4Fixture.createHarness({ acceptedReceipt: "valid" }).subjects();
    const calibrationTargets = subjects.calibrationTargets.map((row) =>
      deepFreeze(structuredClone(row)));
    const executionGroups = subjects.executionGroups.map((row) =>
      deepFreeze(structuredClone(row)));
    const authenticatedPlan = deepFreeze({
      calibrationTargets,
      calibrationTargetPlanSha256: sha256(stableJson(calibrationTargets)),
      executionGroups,
      executionGroupSubsetSha256: sha256(stableJson(executionGroups)),
      executionPlan
    } satisfies CaliforniaSignatureFinalCompositorPhase4AuthenticatedPlan);
    return deepFreeze({
      authenticatedPlan,
      executionPlan,
      sourceManifestSha256: sha256(stableJson(sourceReceipt.sourceIdentities)),
      sourcePlanSha256: sha256(stableJson(sourceReceipt.sourcePlan)),
      sourceReceiptSha256: sourceReceipt.sourceReceiptSha256,
      sourceSnapshotSha256: executionPlan.sourceSnapshotSha256
    });
  })();
  return exactSourcePromise;
}

function validateSnapshot(snapshot: CaliforniaPhase4A22LifecycleSnapshot, nowUnixMs: number): void {
  assertExactKeys(snapshot, [
    "acceptedBuildReceipt", "browser", "checkpoint", "productionBuild", "producerIdentity",
    "server", "sharp", "source", "storageStateSha256"
  ], "California Phase4 A22 lifecycle snapshot");
  const receipt = snapshot.acceptedBuildReceipt;
  assert.equal(receipt.schemaVersion, CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_SCHEMA_VERSION,
    "California Phase4 A22 accepted build receipt schema drifted");
  assert.equal(receipt.status, "accepted-production-build-server-v2",
    "California Phase4 A22 accepted build receipt status drifted");
  assert.equal(receipt.formalExecutionAuthorized, false,
    "California Phase4 A22 receipt cannot authorize formal execution");
  assert.equal(receipt.worktreeRoot, WORKTREE,
    "California Phase4 A22 accepted build names another worktree");
  assert.ok(nowUnixMs >= receipt.issuedAtUnixMs && nowUnixMs <= receipt.expiresAtUnixMs,
    "California Phase4 A22 accepted build receipt is stale or expired");
  assert.ok(receipt.expiresAtUnixMs - receipt.issuedAtUnixMs <=
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_MAX_RECEIPT_LIFETIME_MS,
  "California Phase4 A22 accepted build receipt lifetime exceeds its bound");
  const { acceptedBuildReceiptSha256, ...receiptBase } = receipt;
  assert.equal(acceptedBuildReceiptSha256, sha256(stableJson(receiptBase)),
    "California Phase4 A22 accepted build receipt is not exactly derived");
  assert.deepEqual(snapshot.productionBuild, {
    acceptedBuildId: receipt.acceptedBuildId,
    acceptedBuildIdFileSha256: receipt.acceptedBuildIdFileSha256,
    acceptedBuildManifestSha256: receipt.acceptedBuildManifestSha256,
    sourceBuildSha256: receipt.sourceBuildSha256
  }, "California Phase4 A22 production build identity drifted");
  assert.deepEqual(snapshot.server, receipt.server,
    "California Phase4 A22 accepted server identity drifted");
  assert.equal(snapshot.browser.browserExecutableSha256, receipt.browserExecutableSha256,
    "California Phase4 A22 physical Chrome executable identity drifted");
  assert.equal(snapshot.browser.browserIdentitySha256, receipt.browserIdentitySha256,
    "California Phase4 A22 physical Chrome runtime identity drifted");
  assert.equal(snapshot.sharp.dependencySha256, receipt.dependencySha256,
    "California Phase4 A22 dependency identity drifted");
  assert.equal(snapshot.sharp.sharpLibvipsSha256, receipt.sharpLibvipsSha256,
    "California Phase4 A22 Sharp/libvips identity drifted");
  assert.equal(snapshot.storageStateSha256, receipt.storageState.fileSha256,
    "California Phase4 A22 storage-state identity drifted");
  assert.deepEqual(snapshot.checkpoint, checkpointForReceipt(receipt),
    "California Phase4 A22 lifecycle checkpoint drifted");

  const source = snapshot.source;
  assert.equal(source.executionPlan.executionPlanSha256, receipt.executionPlanSha256,
    "California Phase4 A22 Phase3 execution plan drifted");
  assert.equal(source.executionPlan.dimensionRegistrySha256, receipt.dimensionRegistrySha256,
    "California Phase4 A22 dimension registry drifted");
  assert.equal(source.sourceReceiptSha256, receipt.sourceReceiptSha256,
    "California Phase4 A22 Phase3 source receipt drifted");
  assert.equal(source.sourceSnapshotSha256, receipt.sourceSnapshotSha256,
    "California Phase4 A22 source snapshot drifted");
  assert.equal(source.sourceManifestSha256, receipt.sourceManifestSha256,
    "California Phase4 A22 source manifest drifted");
  assert.equal(source.authenticatedPlan.executionPlan.executionPlanSha256,
    source.executionPlan.executionPlanSha256,
  "California Phase4 A22 authenticated Phase3 plan drifted");
  assert.equal(source.authenticatedPlan.executionGroupSubsetSha256,
    receipt.executionGroupSubsetSha256,
  "California Phase4 A22 authenticated execution subset drifted");
  assert.equal(source.authenticatedPlan.calibrationTargetPlanSha256,
    receipt.calibrationTargetPlanSha256,
  "California Phase4 A22 authenticated calibration targets drifted");
  assert.equal(source.authenticatedPlan.executionGroupSubsetSha256,
    sha256(stableJson(source.authenticatedPlan.executionGroups)),
  "California Phase4 A22 execution subset hash is not exactly derived");
  assert.equal(source.authenticatedPlan.calibrationTargetPlanSha256,
    sha256(stableJson(source.authenticatedPlan.calibrationTargets)),
  "California Phase4 A22 target-plan hash is not exactly derived");
  assert.equal(source.authenticatedPlan.calibrationTargets.length, 4,
    "California Phase4 A22 lifecycle requires exactly four dimension-class targets");
  assert.equal(new Set(source.authenticatedPlan.calibrationTargets.map((row) => row.classId)).size, 4,
    "California Phase4 A22 lifecycle lost an exact dimension class");

  const expectedProducer: CaliforniaSignatureFinalCompositorPhase3ProducerIdentity = {
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
  };
  assert.deepEqual(snapshot.producerIdentity, expectedProducer,
    "California Phase4 A22 producer identity drifted");
  for (const value of [
    source.sourcePlanSha256, receipt.environmentDiscoveryFileSha256, receipt.environmentSha256,
    receipt.machineSha256, receipt.server.processIdentitySha256,
    receipt.server.readinessReceiptSha256
  ]) assertSha256(value, "California Phase4 A22 bound identity");
}

function publicationFor(options: {
  evidenceFileSha256: string;
  evidenceIdentitySha256: string;
  issuedAtUnixMs: number;
  snapshot: CaliforniaPhase4A22LifecycleSnapshot;
}): CaliforniaPhase4A22LifecyclePublication {
  const receipt = options.snapshot.acceptedBuildReceipt;
  const base = {
    acceptedBuildId: receipt.acceptedBuildId,
    acceptedBuildManifestSha256: receipt.acceptedBuildManifestSha256,
    acceptedBuildReceiptSha256: receipt.acceptedBuildReceiptSha256,
    browserExecutableSha256: receipt.browserExecutableSha256,
    browserIdentitySha256: receipt.browserIdentitySha256,
    calibrationTargetPlanSha256: receipt.calibrationTargetPlanSha256,
    dependencySha256: receipt.dependencySha256,
    dimensionRegistrySha256: receipt.dimensionRegistrySha256,
    environmentDiscoveryFileSha256: receipt.environmentDiscoveryFileSha256,
    environmentSha256: receipt.environmentSha256,
    executionGroupSubsetSha256: receipt.executionGroupSubsetSha256,
    executionPlanSha256: receipt.executionPlanSha256,
    expiresAtUnixMs: Math.min(
      receipt.expiresAtUnixMs,
      options.issuedAtUnixMs + CALIFORNIA_PHASE4_A22_LIFECYCLE_MAX_AGE_MS
    ),
    formalExecutionAuthorized: false as const,
    independentExpectedRasterAvailable: false as const,
    independentExpectedRasterBlocker: CALIFORNIA_PHASE4_EXPECTED_RASTER_BLOCKER,
    issuedAtUnixMs: options.issuedAtUnixMs,
    lifecycleArtifactFileSha256: options.evidenceFileSha256,
    lifecycleArtifactIdentitySha256: options.evidenceIdentitySha256,
    machineSha256: receipt.machineSha256,
    producerIdentitySha256: sha256(stableJson(options.snapshot.producerIdentity)),
    schemaVersion: CALIFORNIA_PHASE4_A22_LIFECYCLE_SCHEMA_VERSION as 1,
    serverBaseUrl: receipt.server.baseUrl,
    serverProcessIdentitySha256: receipt.server.processIdentitySha256,
    serverReadinessReceiptSha256: receipt.server.readinessReceiptSha256,
    sharpLibvipsSha256: receipt.sharpLibvipsSha256,
    sourceBuildSha256: receipt.sourceBuildSha256,
    sourceManifestSha256: receipt.sourceManifestSha256,
    sourcePlanSha256: options.snapshot.source.sourcePlanSha256,
    sourceReceiptSha256: receipt.sourceReceiptSha256,
    sourceSnapshotSha256: receipt.sourceSnapshotSha256,
    status: "diagnostic-a22-lifecycle-publication-v1" as const,
    storageStateSha256: receipt.storageState.fileSha256,
    worktreeRoot: WORKTREE
  };
  return deepFreeze({ ...base, publicationSha256: sha256(stableJson(base)) });
}

async function exerciseBrandedLifecycle(
  authority: LifecycleAuthority,
  observations: Observations
): Promise<CaliforniaPhase4A22LifecycleLease> {
  let cleaned = false;
  const cleanup = async () => {
    if (cleaned) return;
    cleaned = true;
    await authority.cleanup();
  };
  try {
    const brand = authorityBrands.get(authority);
    assert.ok(brand, "California Phase4 A22 lifecycle requires uncloneable in-process authority");
    const checkpoint = async () => {
      const current = await authority.checkpoint();
      assertExactKeys(current, [
        "authorityNonceSha256",
        "directory",
        "directoryIdentitySha256",
        "evidenceIdentitySha256",
        "snapshotSha256"
      ], "California Phase4 A22 held lifecycle checkpoint");
      assert.equal(current.authorityNonceSha256, brand.authorityNonceSha256,
        "California Phase4 A22 held lifecycle checkpoint drifted");
      assert.equal(current.evidenceIdentitySha256, brand.evidenceIdentitySha256,
        "California Phase4 A22 held lifecycle checkpoint drifted");
      assert.equal(current.snapshotSha256, brand.snapshotSha256,
        "California Phase4 A22 held lifecycle checkpoint drifted");
      if (brand.directoryIdentitySha256 === null) {
        assert.equal(current.directory, null,
          "California Phase4 A22 held lifecycle directory appeared before acquisition");
        assert.equal(current.directoryIdentitySha256, null,
          "California Phase4 A22 held lifecycle directory identity appeared before acquisition");
        return;
      }
      assert.ok(current.directory,
        "California Phase4 A22 held lifecycle directory disappeared after acquisition");
      const currentDirectoryIdentitySha256 = sha256(stableJson(current.directory));
      assert.equal(current.directoryIdentitySha256, currentDirectoryIdentitySha256,
        "California Phase4 A22 held lifecycle directory checkpoint digest is not canonical");
      assert.equal(currentDirectoryIdentitySha256, brand.directoryIdentitySha256,
        "California Phase4 A22 held lifecycle directory identity drifted after acquisition");
      assert.equal(validateDirectory(current.directory, brand), brand.directoryIdentitySha256,
        "California Phase4 A22 held lifecycle directory validation drifted after acquisition");
    };
    await checkpoint();
    const directory = await authority.beginFreshDirectory();
    brand.directoryIdentitySha256 = validateDirectory(directory, brand);
    await checkpoint();
    const snapshot = deepFreeze(structuredClone(await authority.captureSnapshot()));
    validateSnapshot(snapshot, authority.nowUnixMs());
    assert.equal(sha256(stableJson(snapshot)), brand.snapshotSha256,
      "California Phase4 A22 lifecycle snapshot changed after branding");
    await checkpoint();
    const evidence = await authority.readHeldEvidence();
    const evidenceIdentitySha256 = validateHeldFile({
      brand,
      expectedFileName: HELD_EVIDENCE_FILE_NAME,
      read: evidence
    });
    assert.equal(evidenceIdentitySha256, brand.evidenceIdentitySha256,
      "California Phase4 A22 held evidence identity changed after branding");
    assert.equal(sha256(evidence.bytes), snapshot.acceptedBuildReceipt.lifecycleAuthoritySha256,
      "California Phase4 A22 held evidence bytes differ from accepted lifecycle authority");
    await checkpoint();
    const publication = publicationFor({
      evidenceFileSha256: sha256(evidence.bytes),
      evidenceIdentitySha256,
      issuedAtUnixMs: authority.nowUnixMs(),
      snapshot
    });
    const bytes = Buffer.from(`${stableJson(publication)}\n`, "utf8");
    const publishedRead = await authority.publishCanonical(bytes);
    validateHeldFile({
      brand,
      expectedFileName: CALIFORNIA_PHASE4_A22_LIFECYCLE_PUBLICATION_FILE_NAME,
      read: publishedRead
    });
    assert.deepEqual(publishedRead.bytes, bytes,
      "California Phase4 A22 canonical publication bytes drifted");
    await checkpoint();
    let closed = false;
    return Object.freeze({
      async checkpoint() {
        assert.equal(closed, false, "California Phase4 A22 lifecycle lease is closed");
        await checkpoint();
        assert.ok(authority.nowUnixMs() <= publication.expiresAtUnixMs,
          "California Phase4 A22 lifecycle publication expired");
        return publication;
      },
      async close() {
        if (closed) return;
        closed = true;
        await cleanup();
      },
      formalExecutionAuthorized: false as const,
      independentExpectedRasterAvailable: false as const,
      publication
    });
  } catch (error) {
    await cleanup();
    throw error;
  }
}

function mutateSnapshot(
  snapshot: CaliforniaPhase4A22LifecycleSnapshot,
  fault: CaliforniaPhase4A22LifecycleTestFault | undefined
): CaliforniaPhase4A22LifecycleSnapshot {
  if (!fault) return snapshot;
  const changed = structuredClone(snapshot);
  const zero = "0".repeat(64);
  if (fault === "accepted-build-drift") changed.productionBuild.acceptedBuildId = "other-build";
  if (fault === "browser-drift") changed.browser.browserIdentitySha256 = zero;
  if (fault === "dependency-drift") changed.sharp.dependencySha256 = zero;
  if (fault === "environment-drift") changed.producerIdentity.environmentSha256 = zero;
  if (fault === "plan-drift") changed.source.authenticatedPlan = {
    ...changed.source.authenticatedPlan,
    executionGroupSubsetSha256: zero
  };
  if (fault === "server-drift") changed.server.processIdentitySha256 = zero;
  if (fault === "sharp-drift") changed.sharp.sharpLibvipsSha256 = zero;
  if (fault === "source-drift") changed.source.sourceSnapshotSha256 = zero;
  if (fault === "storage-drift") changed.storageStateSha256 = zero;
  if (fault === "expired") {
    changed.acceptedBuildReceipt = {
      ...changed.acceptedBuildReceipt,
      expiresAtUnixMs: NOW_UNIX_MS - 1,
      issuedAtUnixMs: NOW_UNIX_MS - 60_000
    };
    const { acceptedBuildReceiptSha256: _old, ...base } = changed.acceptedBuildReceipt;
    changed.acceptedBuildReceipt.acceptedBuildReceiptSha256 = sha256(stableJson(base));
  }
  return deepFreeze(changed);
}

let harnessOrdinal = 0;
export function createCaliforniaPhase4A22LifecycleTestHarness(
  options: TestHarnessOptions = {}
) {
  assert.deepEqual(Object.keys(options), options.fault === undefined ? [] : ["fault"],
    "California Phase4 A22 lifecycle test options drifted");
  const observations: Observations = {
    checkpointCount: 0,
    cleanupCount: 0,
    directoryCreateCount: 0,
    heldEvidenceReadCount: 0,
    publicationWriteCount: 0
  };
  let publishStarted = false;
  const ordinal = ++harnessOrdinal;
  const directoryPath = `${TEMPORARY_ROOT}/` +
    `${CALIFORNIA_PHASE4_A22_LIFECYCLE_DIRECTORY_PREFIX}fixture-${ordinal}`;
  let authorityPromise: Promise<LifecycleAuthority> | undefined;

  const makeAuthority = async (): Promise<LifecycleAuthority> => {
    const source = await exactSource();
    const evidenceBytes = Buffer.from(stableJson({
      sourceManifestSha256: source.sourceManifestSha256,
      sourcePlanSha256: source.sourcePlanSha256,
      sourceReceiptSha256: source.sourceReceiptSha256,
      sourceSnapshotSha256: source.sourceSnapshotSha256
    }), "utf8");
    const evidenceFault = options.fault === "evidence-hardlink" ? "hardlink"
      : options.fault === "evidence-identity-drift" ? "identity-drift"
        : options.fault === "evidence-public" ? "public"
          : options.fault === "evidence-symlink" ? "symlink" : undefined;
    const evidenceRead = heldRead({
      bytes: evidenceBytes,
      directoryPath,
      fault: evidenceFault,
      fileName: HELD_EVIDENCE_FILE_NAME,
      seed: ordinal * 10 + 1
    });
    const baseReceipt = {
      acceptedBuildId: `phase4-a22-build-fixture-${ordinal}`,
      acceptedBuildIdFileSha256: sha256(`BUILD_ID:${ordinal}`),
      acceptedBuildManifestSha256: sha256(`build-manifest:${ordinal}`),
      browserExecutableSha256: sha256(`chrome-executable:${ordinal}`),
      browserIdentitySha256: sha256(`chrome-identity:${ordinal}`),
      calibrationTargetPlanSha256: source.authenticatedPlan.calibrationTargetPlanSha256,
      dependencySha256: sha256(`dependency:${ordinal}`),
      dimensionRegistrySha256: source.executionPlan.dimensionRegistrySha256,
      environmentDiscoveryFileSha256: sha256(`environment-file:${ordinal}`),
      environmentSha256: sha256(`environment:${ordinal}`),
      executionGroupSubsetSha256: source.authenticatedPlan.executionGroupSubsetSha256,
      executionPlanSha256: source.executionPlan.executionPlanSha256,
      expiresAtUnixMs: NOW_UNIX_MS + 60_000,
      formalExecutionAuthorized: false as const,
      issuedAtUnixMs: NOW_UNIX_MS - 1_000,
      lifecycleAuthoritySha256: sha256(evidenceBytes),
      machineSha256: sha256(`machine:${ordinal}`),
      schemaVersion: CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_SCHEMA_VERSION as 2,
      server: {
        acceptedBuildId: `phase4-a22-build-fixture-${ordinal}`,
        baseUrl: `http://127.0.0.1:${41_800 + ordinal}/`,
        processId: 41_800 + ordinal,
        processIdentitySha256: sha256(`server-process:${ordinal}`),
        readinessReceiptSha256: sha256(`server-readiness:${ordinal}`)
      },
      sharpLibvipsSha256: sha256(`sharp-libvips:${ordinal}`),
      sourceBuildSha256: sha256(`source-build:${ordinal}`),
      sourceManifestSha256: source.sourceManifestSha256,
      sourceReceiptSha256: source.sourceReceiptSha256,
      sourceSnapshotSha256: source.sourceSnapshotSha256,
      status: "accepted-production-build-server-v2" as const,
      storageState: {
        filePath: `${directoryPath}/storage-state.json`,
        fileSha256: sha256(`storage-state:${ordinal}`)
      },
      worktreeRoot: WORKTREE
    };
    const acceptedBuildReceipt = deepFreeze({
      ...baseReceipt,
      acceptedBuildReceiptSha256: sha256(stableJson(baseReceipt))
    } satisfies CaliforniaSignatureFinalCompositorPhase4AcceptedBuildReceipt);
    const producerIdentity = deepFreeze({
      acceptedBuildId: acceptedBuildReceipt.acceptedBuildId,
      acceptedBuildReceiptSha256: acceptedBuildReceipt.acceptedBuildReceiptSha256,
      browserExecutableSha256: acceptedBuildReceipt.browserExecutableSha256,
      browserIdentitySha256: acceptedBuildReceipt.browserIdentitySha256,
      dependencySha256: acceptedBuildReceipt.dependencySha256,
      environmentDiscoveryFileSha256: acceptedBuildReceipt.environmentDiscoveryFileSha256,
      environmentSha256: acceptedBuildReceipt.environmentSha256,
      machineSha256: acceptedBuildReceipt.machineSha256,
      sharpLibvipsSha256: acceptedBuildReceipt.sharpLibvipsSha256,
      sourceBuildSha256: acceptedBuildReceipt.sourceBuildSha256,
      sourceSnapshotSha256: acceptedBuildReceipt.sourceSnapshotSha256
    } satisfies CaliforniaSignatureFinalCompositorPhase3ProducerIdentity);
    const cleanSnapshot = deepFreeze({
      acceptedBuildReceipt,
      browser: {
        browserExecutablePath: "/Volumes/Starship/tools/chrome/Chromium",
        browserExecutableSha256: acceptedBuildReceipt.browserExecutableSha256,
        browserIdentitySha256: acceptedBuildReceipt.browserIdentitySha256,
        playwrightVersion: "1.55.0"
      },
      checkpoint: checkpointForReceipt(acceptedBuildReceipt),
      productionBuild: {
        acceptedBuildId: acceptedBuildReceipt.acceptedBuildId,
        acceptedBuildIdFileSha256: acceptedBuildReceipt.acceptedBuildIdFileSha256,
        acceptedBuildManifestSha256: acceptedBuildReceipt.acceptedBuildManifestSha256,
        sourceBuildSha256: acceptedBuildReceipt.sourceBuildSha256
      },
      producerIdentity,
      server: structuredClone(acceptedBuildReceipt.server),
      sharp: {
        dependencySha256: acceptedBuildReceipt.dependencySha256,
        libvipsVersion: "8.17.1",
        sharpLibvipsSha256: acceptedBuildReceipt.sharpLibvipsSha256,
        sharpVersion: "0.34.3"
      },
      source,
      storageStateSha256: acceptedBuildReceipt.storageState.fileSha256
    } satisfies CaliforniaPhase4A22LifecycleSnapshot);
    const snapshot = mutateSnapshot(cleanSnapshot, options.fault);
    const authorityNonceSha256 = sha256(`authority-nonce:${ordinal}`);
    const brand: AuthorityBrand = {
      authorityNonceSha256,
      directoryIdentitySha256: null,
      directoryPath,
      evidenceIdentitySha256: fileIdentitySha256(evidenceRead),
      snapshotSha256: sha256(stableJson(cleanSnapshot))
    };
    let checkpointFaultUsed = false;
    let acquiredDirectory: CaliforniaPhase4A22HeldDirectoryIdentity | null = null;
    const authority: LifecycleAuthority = {
      async beginFreshDirectory() {
        observations.directoryCreateCount += 1;
        const actualPath = options.fault === "directory-moved"
          ? `${TEMPORARY_ROOT}/${CALIFORNIA_PHASE4_A22_LIFECYCLE_DIRECTORY_PREFIX}moved-${ordinal}`
          : directoryPath;
        acquiredDirectory = {
          directoryPath: actualPath,
          directoryRealPath: options.fault === "directory-symlink"
            ? `${actualPath}.target` : actualPath,
          identity: identity(
            ordinal * 10,
            options.fault === "directory-public" ? 0o755 : 0o700,
            0
          )
        };
        return structuredClone(acquiredDirectory);
      },
      async captureSnapshot() {
        return snapshot;
      },
      async checkpoint() {
        observations.checkpointCount += 1;
        const changed = options.fault === "checkpoint-drift" && checkpointFaultUsed;
        checkpointFaultUsed = true;
        const currentDirectory = structuredClone(acquiredDirectory);
        if (currentDirectory &&
            options.fault === "directory-device-drift-after-acquisition") {
          currentDirectory.identity.dev = String(Number(currentDirectory.identity.dev) + 1);
        }
        if (currentDirectory &&
            options.fault === "directory-inode-replacement-after-acquisition") {
          currentDirectory.identity.ino = String(Number(currentDirectory.identity.ino) + 1);
        }
        if (currentDirectory &&
            options.fault === "directory-realpath-replacement-after-acquisition") {
          currentDirectory.directoryRealPath = `${currentDirectory.directoryPath}.replacement`;
        }
        return {
          authorityNonceSha256,
          directory: currentDirectory,
          directoryIdentitySha256: currentDirectory === null
            ? null : sha256(stableJson(currentDirectory)),
          evidenceIdentitySha256: brand.evidenceIdentitySha256,
          snapshotSha256: changed ? "0".repeat(64) : brand.snapshotSha256
        };
      },
      async cleanup() {
        observations.cleanupCount += 1;
      },
      nowUnixMs: () => NOW_UNIX_MS,
      async publishCanonical(bytes) {
        observations.publicationWriteCount += 1;
        const actual = options.fault === "publication-byte-drift"
          ? Buffer.concat([bytes, Buffer.from("drift")]) : bytes;
        return heldRead({
          bytes: actual,
          directoryPath,
          fault: options.fault === "publication-identity-drift" ? "identity-drift" : undefined,
          fileName: CALIFORNIA_PHASE4_A22_LIFECYCLE_PUBLICATION_FILE_NAME,
          seed: ordinal * 10 + 2
        });
      },
      async readHeldEvidence() {
        observations.heldEvidenceReadCount += 1;
        return evidenceRead;
      }
    };
    if (options.fault !== "clone-authority") authorityBrands.set(authority, brand);
    return authority;
  };

  return Object.freeze({
    observations: (): Observations => structuredClone(observations),
    async publish(): Promise<CaliforniaPhase4A22LifecycleLease> {
      if (arguments.length !== 0) {
        throw new Error(
          "California Phase4 A22 lifecycle test publisher takes no caller-authored authority"
        );
      }
      assert.equal(publishStarted, false,
        "California Phase4 A22 lifecycle publisher is one-shot per held authority");
      publishStarted = true;
      authorityPromise ??= makeAuthority();
      return exerciseBrandedLifecycle(await authorityPromise, observations);
    }
  });
}
