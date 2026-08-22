import assert from "node:assert/strict";
import path from "node:path";
import {
  californiaSignatureFinalCompositorPhase4RealDriverTestFixture as phase4Fixture
} from "./california-signature-final-compositor-phase4-real-driver.test-fixture";
import type {
  CaliforniaSignatureFinalCompositorPhase4CalibrationTarget
} from "./california-signature-final-compositor-phase4-real-driver-contract";
import {
  californiaSignatureFinalCompositorPhase4InternalSha256 as sha256,
  californiaSignatureFinalCompositorPhase4InternalStableJson as stableJson
} from "./california-signature-final-compositor-phase4-real-driver-internal";
import type {
  CaliforniaPhase4A22HeldDirectoryIdentity,
  CaliforniaPhase4A22HeldFileIdentity,
  CaliforniaPhase4A22HeldFileRead
} from "./california-signature-final-compositor-phase4-a22-lifecycle-contract";
import {
  CALIFORNIA_PHASE4_INDEPENDENT_EXPECTED_RASTER_CLASS_COUNT,
  CALIFORNIA_PHASE4_INDEPENDENT_EXPECTED_RASTER_DIRECTORY_PREFIX,
  CALIFORNIA_PHASE4_INDEPENDENT_EXPECTED_RASTER_MANIFEST_FILE_NAME,
  CALIFORNIA_PHASE4_INDEPENDENT_EXPECTED_RASTER_SCHEMA_VERSION,
  type CaliforniaPhase4IndependentExpectedRasterEntry,
  type CaliforniaPhase4IndependentExpectedRasterManifest
} from "./california-signature-final-compositor-phase4-independent-expected-raster-contract";

const WORKTREE = "/Volumes/Starship/MAIS-ca-viz-labs-wt" as const;
const TEMPORARY_ROOT = `${WORKTREE}/.tmp`;
const NOW_UNIX_MS = 1_800_000_000_000;
const MAX_PACKAGE_AGE_MS = 5 * 60 * 1_000;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export type CaliforniaPhase4IndependentExpectedRasterAttack =
  | "all-zero-pixels"
  | "clone-package"
  | "dimension-drift"
  | "directory-symlink"
  | "duplicate-class"
  | "extra-class"
  | "false-zero-audit"
  | "manifest-hash-drift"
  | "manifest-symlink"
  | "missing-class"
  | "moved-package"
  | "noncanonical-manifest"
  | "order-drift"
  | "pixel-hash-drift"
  | "raster-symlink"
  | "stale-package"
  | "wrong-renderer-origin";

type RasterAuthority = {
  cleanup(): Promise<void>;
  directory(): Promise<CaliforniaPhase4A22HeldDirectoryIdentity>;
  manifest(): Promise<CaliforniaPhase4A22HeldFileRead>;
  nowUnixMs(): number;
  rasterFiles(): Promise<readonly CaliforniaPhase4A22HeldFileRead[]>;
  targets(): Promise<readonly CaliforniaSignatureFinalCompositorPhase4CalibrationTarget[]>;
};

type RasterBrand = {
  directoryPath: string;
  reviewerReceiptInstalled: false;
};

type Observations = {
  cleanupCount: number;
  manifestReadCount: number;
  rasterReadCount: number;
};

const rasterBrands = new WeakMap<RasterAuthority, RasterBrand>();

function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
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
    ctimeNs: String(1_800_000_000_100_000 + seed),
    dev: "43",
    ino: String(120_000 + seed),
    mode,
    mtimeNs: String(1_800_000_000_100_000 + seed),
    nlink: 1,
    size
  };
}

function heldRead(options: {
  bytes: Buffer;
  directoryPath: string;
  fileName: string;
  seed: number;
  symlink?: boolean;
}): CaliforniaPhase4A22HeldFileRead {
  const requestedPath = path.join(options.directoryPath, options.fileName);
  const stat = identity(options.seed, 0o400, options.bytes.length);
  return {
    bytes: Buffer.from(options.bytes),
    fileName: options.fileName,
    fstatAfter: stat,
    fstatBefore: stat,
    lstat: stat,
    realPath: options.symlink ? `${requestedPath}.target` : requestedPath,
    requestedPath
  };
}

function validateHeldRead(options: {
  brand: RasterBrand;
  expectedFileName: string;
  read: CaliforniaPhase4A22HeldFileRead;
}): void {
  const read = options.read;
  assertExactKeys(read, [
    "bytes", "fileName", "fstatAfter", "fstatBefore", "lstat", "realPath", "requestedPath"
  ], `California Phase4 independent raster held ${options.expectedFileName}`);
  assert.ok(Buffer.isBuffer(read.bytes),
    `California Phase4 independent raster ${options.expectedFileName} bytes are absent`);
  assert.equal(read.fileName, options.expectedFileName,
    `California Phase4 independent raster ${options.expectedFileName} name drifted`);
  assert.equal(read.requestedPath, path.join(options.brand.directoryPath, options.expectedFileName),
    `California Phase4 independent raster ${options.expectedFileName} escaped its package`);
  assert.equal(read.realPath, read.requestedPath,
    `California Phase4 independent raster ${options.expectedFileName} traverses a symlink`);
  assert.deepEqual(read.lstat, read.fstatBefore,
    `California Phase4 independent raster ${options.expectedFileName} changed at open`);
  assert.deepEqual(read.fstatAfter, read.fstatBefore,
    `California Phase4 independent raster ${options.expectedFileName} changed while held`);
  assert.equal(read.fstatBefore.mode, 0o400,
    `California Phase4 independent raster ${options.expectedFileName} must be mode 0400`);
  assert.equal(read.fstatBefore.nlink, 1,
    `California Phase4 independent raster ${options.expectedFileName} must have one hard link`);
  assert.equal(read.fstatBefore.size, read.bytes.length,
    `California Phase4 independent raster ${options.expectedFileName} size drifted`);
}

function deepFreeze<T>(value: T): T {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) return value;
  for (const key of Reflect.ownKeys(value as object)) {
    deepFreeze((value as Record<PropertyKey, unknown>)[key]);
  }
  return Object.freeze(value);
}

let targetsPromise: Promise<readonly CaliforniaSignatureFinalCompositorPhase4CalibrationTarget[]> |
undefined;
async function exactTargets(): Promise<
readonly CaliforniaSignatureFinalCompositorPhase4CalibrationTarget[]> {
  targetsPromise ??= phase4Fixture.createHarness({ acceptedReceipt: "valid" }).subjects()
    .then((subjects) => deepFreeze(subjects.calibrationTargets.map((target) =>
      deepFreeze(structuredClone(target)))));
  return targetsPromise;
}

function rgbaFileName(index: number, classId: string): string {
  const safeClass = classId.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `class-${String(index + 1).padStart(2, "0")}-${safeClass}.rgba`;
}

function adversarialPixels(target: CaliforniaSignatureFinalCompositorPhase4CalibrationTarget,
index: number, zero = false): Buffer {
  const byteCount = target.backingSize.width * target.backingSize.height * 4;
  assert.ok(Number.isSafeInteger(byteCount) && byteCount > 0 && byteCount <= 256 * 1024 * 1024,
    `${target.classId}: California Phase4 raster attack payload exceeds its test bound`);
  return Buffer.alloc(byteCount, zero ? 0 : (index % 251) + 1);
}

function entryFor(options: {
  bytes: Buffer;
  index: number;
  target: CaliforniaSignatureFinalCompositorPhase4CalibrationTarget;
}): CaliforniaPhase4IndependentExpectedRasterEntry {
  const rgbaSha256 = sha256(options.bytes);
  const auditBase = {
    decodedRgbaSha256: rgbaSha256,
    declaredRgbaSha256: rgbaSha256,
    mismatchPixelCount: 0
  };
  const withoutSha = {
    backingHeight: options.target.backingSize.height,
    backingWidth: options.target.backingSize.width,
    bindingKey: options.target.bindingKey,
    classId: options.target.classId,
    pixelAudit: {
      ...auditBase,
      comparisonSha256: sha256(stableJson(auditBase))
    },
    pixelByteCount: options.bytes.length,
    projectName: options.target.projectName,
    rgbaFileName: rgbaFileName(options.index, options.target.classId),
    rgbaSha256,
    targetSha256: options.target.targetSha256
  };
  return deepFreeze({ ...withoutSha, entrySha256: sha256(stableJson(withoutSha)) });
}

function manifestFor(options: {
  attack: CaliforniaPhase4IndependentExpectedRasterAttack;
  entries: CaliforniaPhase4IndependentExpectedRasterEntry[];
  ordinal: number;
  targets: readonly CaliforniaSignatureFinalCompositorPhase4CalibrationTarget[];
}): CaliforniaPhase4IndependentExpectedRasterManifest {
  let entries = options.entries.map((row) => structuredClone(row));
  if (options.attack === "order-drift") [entries[0], entries[1]] = [entries[1]!, entries[0]!];
  if (options.attack === "missing-class") entries = entries.slice(0, -1);
  if (options.attack === "extra-class") entries.push({
    ...structuredClone(entries[0]!),
    classId: "unreviewed-extra-class",
    entrySha256: "0".repeat(64)
  });
  if (options.attack === "duplicate-class") entries[1] = structuredClone(entries[0]!);
  if (options.attack === "dimension-drift") {
    const changed = { ...entries[0]!, backingWidth: entries[0]!.backingWidth + 1 };
    const { entrySha256: _old, ...base } = changed;
    entries[0] = { ...base, entrySha256: sha256(stableJson(base)) };
  }
  if (options.attack === "false-zero-audit") {
    const entry = entries[0]!;
    const auditBase = {
      decodedRgbaSha256: entry.rgbaSha256,
      declaredRgbaSha256: sha256("different-declared-raster"),
      mismatchPixelCount: 0
    };
    const changed = {
      ...entry,
      pixelAudit: { ...auditBase, comparisonSha256: sha256(stableJson(auditBase)) },
      rgbaSha256: auditBase.declaredRgbaSha256
    };
    const { entrySha256: _old, ...base } = changed;
    entries[0] = { ...base, entrySha256: sha256(stableJson(base)) };
  }
  if (options.attack === "pixel-hash-drift") {
    const entry = entries[0]!;
    const declared = "0".repeat(64);
    const auditBase = {
      decodedRgbaSha256: entry.pixelAudit.decodedRgbaSha256,
      declaredRgbaSha256: declared,
      mismatchPixelCount: 1
    };
    const changed = {
      ...entry,
      pixelAudit: { ...auditBase, comparisonSha256: sha256(stableJson(auditBase)) },
      rgbaSha256: declared
    };
    const { entrySha256: _old, ...base } = changed;
    entries[0] = { ...base, entrySha256: sha256(stableJson(base)) };
  }
  const base = {
    acceptedBuildId: `phase4-raster-build-fixture-${options.ordinal}`,
    acceptedBuildReceiptSha256: sha256(`accepted-build-receipt:${options.ordinal}`),
    calibrationTargetPlanSha256: sha256(stableJson(options.targets)),
    entries,
    entryCount: entries.length as 4,
    entryOrderSha256: sha256(stableJson(entries.map((entry) => ({
      classId: entry.classId,
      targetSha256: entry.targetSha256
    })))),
    expiresAtUnixMs: options.attack === "stale-package"
      ? NOW_UNIX_MS - 1 : NOW_UNIX_MS + 60_000,
    formalExecutionAuthorized: false as const,
    independentExpectedRasterAvailable: true as const,
    issuedAtUnixMs: NOW_UNIX_MS - 1_000,
    producer: {
      browserScreenshotReadback: false as const,
      producerExecutableSha256: sha256(`independent-renderer:${options.ordinal}`),
      producerSourceSha256: sha256(`independent-renderer-source:${options.ordinal}`),
      renderer: "independent-reference-renderer" as const,
      samePageCanvasReadback: false as const
    },
    reviewerReceiptSha256: sha256(`uninstalled-reviewer-receipt:${options.ordinal}`),
    schemaVersion: CALIFORNIA_PHASE4_INDEPENDENT_EXPECTED_RASTER_SCHEMA_VERSION as 1,
    sourceSnapshotSha256: sha256(`source-snapshot:${options.ordinal}`),
    status: "reviewed-independent-expected-raster-v1" as const,
    worktreeRoot: WORKTREE
  };
  if (options.attack === "wrong-renderer-origin") {
    (base.producer as { samePageCanvasReadback: boolean }).samePageCanvasReadback = true;
  }
  return deepFreeze({
    ...base,
    manifestSha256: options.attack === "manifest-hash-drift"
      ? "0".repeat(64) : sha256(stableJson(base))
  });
}

function validateManifest(options: {
  manifest: CaliforniaPhase4IndependentExpectedRasterManifest;
  nowUnixMs: number;
  targets: readonly CaliforniaSignatureFinalCompositorPhase4CalibrationTarget[];
}): void {
  const manifest = options.manifest;
  assertExactKeys(manifest, [
    "acceptedBuildId", "acceptedBuildReceiptSha256", "calibrationTargetPlanSha256", "entries",
    "entryCount", "entryOrderSha256", "expiresAtUnixMs", "formalExecutionAuthorized",
    "independentExpectedRasterAvailable", "issuedAtUnixMs", "manifestSha256", "producer",
    "reviewerReceiptSha256", "schemaVersion", "sourceSnapshotSha256", "status", "worktreeRoot"
  ], "California Phase4 independent expected raster manifest");
  assert.equal(manifest.schemaVersion,
    CALIFORNIA_PHASE4_INDEPENDENT_EXPECTED_RASTER_SCHEMA_VERSION,
  "California Phase4 independent expected raster schema drifted");
  assert.equal(manifest.status, "reviewed-independent-expected-raster-v1",
    "California Phase4 independent expected raster status drifted");
  assert.equal(manifest.formalExecutionAuthorized, false,
    "California Phase4 independent raster cannot authorize formal execution");
  assert.equal(manifest.independentExpectedRasterAvailable, true,
    "California Phase4 independent raster candidate is not available");
  assert.equal(manifest.worktreeRoot, WORKTREE,
    "California Phase4 independent raster names another worktree");
  assert.ok(options.nowUnixMs >= manifest.issuedAtUnixMs &&
    options.nowUnixMs <= manifest.expiresAtUnixMs,
  "California Phase4 independent expected raster package is stale or expired");
  assert.ok(manifest.expiresAtUnixMs - manifest.issuedAtUnixMs <= MAX_PACKAGE_AGE_MS,
    "California Phase4 independent expected raster package lifetime exceeds its bound");
  const { manifestSha256, ...manifestBase } = manifest;
  assert.equal(manifestSha256, sha256(stableJson(manifestBase)),
    "California Phase4 independent expected raster manifest hash drifted");
  assertExactKeys(manifest.producer, [
    "browserScreenshotReadback", "producerExecutableSha256", "producerSourceSha256", "renderer",
    "samePageCanvasReadback"
  ], "California Phase4 independent expected raster producer");
  assert.equal(manifest.producer.renderer, "independent-reference-renderer",
    "California Phase4 expected raster lacks an independent reference renderer");
  assert.equal(manifest.producer.samePageCanvasReadback, false,
    "California Phase4 expected raster cannot use same-page Canvas readback");
  assert.equal(manifest.producer.browserScreenshotReadback, false,
    "California Phase4 expected raster cannot use tested-browser screenshot readback");
  assertSha256(manifest.producer.producerExecutableSha256,
    "California Phase4 expected raster producer executable");
  assertSha256(manifest.producer.producerSourceSha256,
    "California Phase4 expected raster producer source");
  assertSha256(manifest.reviewerReceiptSha256,
    "California Phase4 expected raster reviewer receipt");
  assert.equal(manifest.entryCount, CALIFORNIA_PHASE4_INDEPENDENT_EXPECTED_RASTER_CLASS_COUNT,
    "California Phase4 independent expected raster requires exactly four class entries");
  assert.equal(manifest.entries.length, CALIFORNIA_PHASE4_INDEPENDENT_EXPECTED_RASTER_CLASS_COUNT,
    "California Phase4 independent expected raster lost or gained a class entry");
  assert.equal(new Set(manifest.entries.map((entry) => entry.classId)).size,
    CALIFORNIA_PHASE4_INDEPENDENT_EXPECTED_RASTER_CLASS_COUNT,
  "California Phase4 independent expected raster contains a duplicate class");
  assert.deepEqual(manifest.entries.map((entry) => entry.classId),
    options.targets.map((target) => target.classId),
  "California Phase4 independent expected raster class order drifted");
  assert.equal(manifest.entryOrderSha256, sha256(stableJson(manifest.entries.map((entry) => ({
    classId: entry.classId,
    targetSha256: entry.targetSha256
  })))), "California Phase4 independent expected raster entry-order hash drifted");
  for (let index = 0; index < manifest.entries.length; index += 1) {
    const entry = manifest.entries[index]!;
    const target = options.targets[index]!;
    assertExactKeys(entry, [
      "backingHeight", "backingWidth", "bindingKey", "classId", "entrySha256", "pixelAudit",
      "pixelByteCount", "projectName", "rgbaFileName", "rgbaSha256", "targetSha256"
    ], `${target.classId}: California Phase4 independent raster entry`);
    const { entrySha256, ...entryBase } = entry;
    assert.equal(entrySha256, sha256(stableJson(entryBase)),
      `${target.classId}: California Phase4 independent raster entry hash drifted`);
    assert.equal(entry.classId, target.classId,
      `${target.classId}: California Phase4 independent raster class drifted`);
    assert.equal(entry.targetSha256, target.targetSha256,
      `${target.classId}: California Phase4 independent raster target drifted`);
    assert.equal(entry.bindingKey, target.bindingKey,
      `${target.classId}: California Phase4 independent raster binding drifted`);
    assert.equal(entry.projectName, target.projectName,
      `${target.classId}: California Phase4 independent raster project drifted`);
    assert.deepEqual({ height: entry.backingHeight, width: entry.backingWidth }, target.backingSize,
      `${target.classId}: California Phase4 independent raster dimensions drifted`);
    assert.equal(entry.pixelByteCount, entry.backingWidth * entry.backingHeight * 4,
      `${target.classId}: California Phase4 independent raster RGBA byte count drifted`);
    assert.equal(entry.rgbaFileName, rgbaFileName(index, target.classId),
      `${target.classId}: California Phase4 independent raster file order drifted`);
    assertSha256(entry.rgbaSha256, `${target.classId}: California Phase4 expected RGBA`);
  }
}

async function rejectBrandedCandidate(
  authority: RasterAuthority,
  observations: Observations
): Promise<never> {
  const brand = rasterBrands.get(authority);
  let cleaned = false;
  const cleanup = async () => {
    if (cleaned) return;
    cleaned = true;
    await authority.cleanup();
  };
  try {
    assert.ok(brand,
      "California Phase4 independent raster requires uncloneable package provenance");
    const directory = await authority.directory();
    assert.equal(path.dirname(directory.directoryPath), TEMPORARY_ROOT,
      "California Phase4 independent raster directory is not a direct Starship .tmp child");
    assert.ok(path.basename(directory.directoryPath).startsWith(
      CALIFORNIA_PHASE4_INDEPENDENT_EXPECTED_RASTER_DIRECTORY_PREFIX),
    "California Phase4 independent raster directory lost its prefix");
    assert.equal(directory.directoryPath, brand.directoryPath,
      "California Phase4 independent raster package was cloned or moved");
    assert.equal(directory.directoryRealPath, directory.directoryPath,
      "California Phase4 independent raster directory traverses a symlink");
    assert.equal(directory.identity.mode, 0o700,
      "California Phase4 independent raster directory must be mode 0700");
    assert.equal(directory.identity.nlink, 1,
      "California Phase4 independent raster directory must remain uniquely held");

    const manifestRead = await authority.manifest();
    validateHeldRead({
      brand,
      expectedFileName: CALIFORNIA_PHASE4_INDEPENDENT_EXPECTED_RASTER_MANIFEST_FILE_NAME,
      read: manifestRead
    });
    let parsed: unknown;
    try { parsed = JSON.parse(manifestRead.bytes.toString("utf8")); }
    catch { assert.fail("California Phase4 independent raster manifest is not valid JSON"); }
    assert.deepEqual(manifestRead.bytes, Buffer.from(`${stableJson(parsed)}\n`, "utf8"),
      "California Phase4 independent raster manifest is not canonical JSON bytes");
    const targets = await authority.targets();
    validateManifest({
      manifest: parsed as CaliforniaPhase4IndependentExpectedRasterManifest,
      nowUnixMs: authority.nowUnixMs(),
      targets
    });
    const manifest = parsed as CaliforniaPhase4IndependentExpectedRasterManifest;
    const rasterReads = await authority.rasterFiles();
    assert.equal(rasterReads.length, manifest.entries.length,
      "California Phase4 independent raster file count drifted");
    for (let index = 0; index < manifest.entries.length; index += 1) {
      const entry = manifest.entries[index]!;
      const read = rasterReads[index]!;
      validateHeldRead({ brand, expectedFileName: entry.rgbaFileName, read });
      assert.equal(read.bytes.length, entry.pixelByteCount,
        `${entry.classId}: California Phase4 independent raster pixel bytes are incomplete`);
      const decodedRgbaSha256 = sha256(read.bytes);
      const audit = entry.pixelAudit;
      assertExactKeys(audit, [
        "comparisonSha256", "decodedRgbaSha256", "declaredRgbaSha256", "mismatchPixelCount"
      ], `${entry.classId}: California Phase4 independent raster pixel audit`);
      const { comparisonSha256, ...auditBase } = audit;
      assert.equal(comparisonSha256, sha256(stableJson(auditBase)),
        `${entry.classId}: California Phase4 independent raster audit hash drifted`);
      assert.equal(audit.decodedRgbaSha256, decodedRgbaSha256,
        `${entry.classId}: California Phase4 independent raster decoded hash drifted`);
      if (audit.mismatchPixelCount === 0) {
        assert.equal(audit.decodedRgbaSha256, audit.declaredRgbaSha256,
          `${entry.classId}: California Phase4 false-zero audit has unequal pixel hashes`);
      }
      assert.equal(decodedRgbaSha256, entry.rgbaSha256,
        `${entry.classId}: California Phase4 independent raster pixel hash drifted`);
      assert.equal(audit.declaredRgbaSha256, entry.rgbaSha256,
        `${entry.classId}: California Phase4 independent raster declared hash drifted`);
      assert.equal(audit.mismatchPixelCount, 0,
        `${entry.classId}: California Phase4 independent raster audit found mismatches`);
      assert.equal(read.bytes.some((byte) => byte !== 0), true,
        `${entry.classId}: California Phase4 independent raster cannot be all-zero pixels`);
    }
    assert.equal(brand.reviewerReceiptInstalled, true,
      "California Phase4 independent reviewed four-class expected raster is unavailable");
    assert.fail("California Phase4 test candidate unexpectedly reached a positive raster result");
  } catch (error) {
    await cleanup();
    throw error;
  }
}

let harnessOrdinal = 0;
export function createCaliforniaPhase4IndependentExpectedRasterTestHarness() {
  const ordinal = ++harnessOrdinal;
  const observations: Observations = {
    cleanupCount: 0,
    manifestReadCount: 0,
    rasterReadCount: 0
  };
  return Object.freeze({
    observations: (): Observations => structuredClone(observations),
    async readReviewedPackage(): Promise<never> {
      if (arguments.length !== 0) {
        throw new Error(
          "California Phase4 independent raster test reader takes no caller-authored package"
        );
      }
      throw new Error(
        "California Phase4 independent reviewed four-class expected raster is unavailable"
      );
    },
    async rejectAttack(attack: CaliforniaPhase4IndependentExpectedRasterAttack): Promise<never> {
      const targets = await exactTargets();
      const directoryPath = `${TEMPORARY_ROOT}/` +
        `${CALIFORNIA_PHASE4_INDEPENDENT_EXPECTED_RASTER_DIRECTORY_PREFIX}fixture-${ordinal}`;
      const bytesByClass = targets.map((target, index) =>
        adversarialPixels(target, index, attack === "all-zero-pixels" && index === 0));
      const entries = targets.map((target, index) => entryFor({
        bytes: bytesByClass[index]!, index, target
      }));
      const manifest = manifestFor({ attack, entries, ordinal, targets });
      const canonicalManifestBytes = Buffer.from(`${stableJson(manifest)}\n`, "utf8");
      const manifestBytes = attack === "noncanonical-manifest"
        ? Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8") : canonicalManifestBytes;
      const rasterReads = manifest.entries.slice(0,
        CALIFORNIA_PHASE4_INDEPENDENT_EXPECTED_RASTER_CLASS_COUNT).map((entry, index) =>
          heldRead({
            bytes: bytesByClass[index]!,
            directoryPath,
            fileName: entry.rgbaFileName,
            seed: ordinal * 20 + index + 2,
            symlink: attack === "raster-symlink" && index === 0
          }));
      const brand: RasterBrand = { directoryPath, reviewerReceiptInstalled: false };
      const authority: RasterAuthority = {
        async cleanup() { observations.cleanupCount += 1; },
        async directory() {
          const actualPath = attack === "moved-package"
            ? `${TEMPORARY_ROOT}/${CALIFORNIA_PHASE4_INDEPENDENT_EXPECTED_RASTER_DIRECTORY_PREFIX}` +
              `moved-${ordinal}` : directoryPath;
          return {
            directoryPath: actualPath,
            directoryRealPath: attack === "directory-symlink" ? `${actualPath}.target` : actualPath,
            identity: identity(ordinal * 20, 0o700, 0)
          };
        },
        async manifest() {
          observations.manifestReadCount += 1;
          return heldRead({
            bytes: manifestBytes,
            directoryPath,
            fileName: CALIFORNIA_PHASE4_INDEPENDENT_EXPECTED_RASTER_MANIFEST_FILE_NAME,
            seed: ordinal * 20 + 1,
            symlink: attack === "manifest-symlink"
          });
        },
        nowUnixMs: () => NOW_UNIX_MS,
        async rasterFiles() {
          observations.rasterReadCount += rasterReads.length;
          return rasterReads;
        },
        async targets() { return targets; }
      };
      if (attack !== "clone-package") rasterBrands.set(authority, brand);
      return rejectBrandedCandidate(authority, observations);
    }
  });
}
