import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  closeSync,
  chmodSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  mkdtempSync,
  openSync,
  realpathSync,
  rmSync
} from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

export const CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_MEASUREMENT_SCHEMA_VERSION = 1;
export const CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_TIMING_PROCEDURE_SHA256 =
  "ff7a411fed484b5ade9c0b31001534ba6b05ff3515e3b667c8c9f41f98ef1564";
export const CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY = Object.freeze({
  fixedHeadroomMs: 7,
  measuredSampleCount: 5,
  quantile: "maximum-observed",
  rounding: "ceil-ms",
  safetyMultiplierBps: 12_500,
  warmupCount: 2
} as const);

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_FILE_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}\.json$/;
const MAX_RECEIPT_BYTES = 2 * 1024 * 1024;
const CALIFORNIA_SIGNATURE_CAPACITY_WORKTREE_ROOT =
  "/Volumes/Starship/MAIS-MVP/.worktrees/a06-ca-viz-resume-20260819";

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

export const CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY_SHA256 =
  sha256(stableJson(CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY));

function assertPlainRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value),
    `${label} must be one plain object`);
  const prototype = Object.getPrototypeOf(value);
  assert.ok(prototype === Object.prototype || prototype === null,
    `${label} must not use a custom prototype`);
}

function assertExactKeys(
  value: unknown,
  expectedKeys: readonly string[],
  label: string
): asserts value is Record<string, unknown> {
  assertPlainRecord(value, label);
  assert.deepEqual(Object.keys(value).sort(compareCodeUnits),
    [...expectedKeys].sort(compareCodeUnits), `${label} keys drifted`);
}

function assertSafeIdentity(value: unknown, label: string): asserts value is string {
  assert.ok(typeof value === "string" && value.length > 0 && value.length <= 512,
    `${label} must be one non-empty bounded string`);
  assert.ok(!value.includes("\0"), `${label} must not contain a NUL delimiter`);
}

function assertSha256(value: unknown, label: string): asserts value is string {
  assert.ok(typeof value === "string", `${label} must be one lowercase SHA-256 string`);
  assert.match(value, SHA256_PATTERN, `${label} must be one lowercase SHA-256`);
}

function assertBoundedDecimalInteger(value: unknown, label: string): asserts value is string {
  assert.ok(typeof value === "string" && /^(?:0|[1-9][0-9]{0,39})$/.test(value),
    `${label} is not one bounded decimal integer`);
}

function assertPositiveSafeInteger(value: unknown, label: string): asserts value is number {
  assert.ok(typeof value === "number" && Number.isSafeInteger(value) && value > 0,
    `${label} must be one positive safe integer`);
}

function assertNonNegativeSafeInteger(value: unknown, label: string): asserts value is number {
  assert.ok(typeof value === "number" && Number.isSafeInteger(value) && value >= 0,
    `${label} must be one non-negative safe integer`);
}

function assertAbsolutePath(value: unknown, label: string): asserts value is string {
  assertSafeIdentity(value, label);
  assert.equal(path.resolve(value), value, `${label} must be one normalized absolute path`);
}

function assertGroupKey(value: unknown, label: string): asserts value is string {
  assert.ok(typeof value === "string", `${label} must be one string`);
  const segments = value.split("\0");
  assert.equal(segments.length, 4,
    `${label} must contain exact project, bench, axis, and phase segments`);
  segments.forEach((segment, index) => assertSafeIdentity(segment, `${label} segment ${index}`));
  assert.ok(segments[3] === "functional" || segments[3] === "layout" ||
    segments[3] === "structural", `${label} phase is unsupported`);
}

function checkedAdd(left: number, right: number, label: string): number {
  assertNonNegativeSafeInteger(left, `${label} left operand`);
  assertNonNegativeSafeInteger(right, `${label} right operand`);
  const result = left + right;
  assert.ok(Number.isSafeInteger(result), `${label} addition overflowed safe integers`);
  return result;
}

function checkedMultiply(left: number, right: number, label: string): number {
  assertNonNegativeSafeInteger(left, `${label} left operand`);
  assertNonNegativeSafeInteger(right, `${label} right operand`);
  const result = left * right;
  assert.ok(Number.isSafeInteger(result), `${label} multiplication overflowed safe integers`);
  return result;
}

export type CaliforniaSignatureFinalCompositorMeasurementFont = {
  family: string;
  fileSha256: string;
  postscriptName: string;
  sourcePath: string;
  version: string;
};

export type CaliforniaSignatureFinalCompositorMeasurementEnvironmentInput = {
  architecture: string;
  browserBinaryPath: string;
  browserBuildId: string;
  browserChannel: string;
  browserExecutableSha256: string;
  browserLaunchArgs: readonly string[];
  browserVersion: string;
  colorProfile: string;
  cpuLogicalCoreCount: number;
  cpuModel: string;
  cpuPhysicalCoreCount: number;
  dependencyLockSha256: string;
  fontInventory: readonly CaliforniaSignatureFinalCompositorMeasurementFont[];
  headless: true;
  kernelVersion: string;
  libvipsVersion: string;
  loadAverage1mMilli: number;
  locale: string;
  nodeVersion: string;
  operatingSystem: string;
  playwrightVersion: string;
  powerSource: "ac" | "battery" | "ups";
  processCount: number;
  ramBytes: number;
  sharpVersion: string;
  sourceBuildId: string;
  sourceBuildSha256: string;
  sourcePlanSha256: string;
  sourceSnapshotSha256: string;
  storageFileSystem: string;
  storageFreeBytes: number;
  storageTotalBytes: number;
  storageVolumePath: string;
  thermalState: "critical" | "fair" | "nominal" | "serious";
  timezone: string;
  workersPerProcess: number;
};

export type CaliforniaSignatureFinalCompositorMeasurementEnvironmentIdentity =
  CaliforniaSignatureFinalCompositorMeasurementEnvironmentInput & {
    browserLaunchArgsSha256: string;
    browserSha256: string;
    dependencySha256: string;
    environmentSha256: string;
    fontInventorySha256: string;
    machineSha256: string;
  };

export type CaliforniaSignatureFinalCompositorStageCoverage = {
  finalCompositorIncluded: boolean;
  hydrate: boolean;
  layout: boolean;
  navigation: boolean;
  realReset: boolean;
  replay: boolean;
};

export type CaliforniaSignatureFinalCompositorReviewedMaximumDimensions = {
  backingSize: { height: number; width: number };
  clipSize: { height: number; width: number };
  cssSize: { height: number; width: number };
};

export type CaliforniaSignatureFinalCompositorBaselineMeasurementSubject = {
  dimensionRegistrySha256: string;
  groupKey: string;
  kind: "baseline-group-v2";
  sourcePlanSha256: string;
  sourceSnapshotSha256: string;
  stageCoverage: CaliforniaSignatureFinalCompositorStageCoverage;
  workUnitsSha256: string;
};

export type CaliforniaSignatureFinalCompositorCalibrationMeasurementSubject = {
  calibratedCropCount: 1;
  classId: string;
  dimensionRegistrySha256: string;
  kind: "compositor-class-calibration-v2";
  maximumDimensions: CaliforniaSignatureFinalCompositorReviewedMaximumDimensions;
  reviewedClassSha256: string;
  reviewedPoliciesSha256: string;
  sourceClassCropCount: number;
  sourcePlanSha256: string;
  sourceSnapshotSha256: string;
  stageCoverage: CaliforniaSignatureFinalCompositorStageCoverage;
};

export type CaliforniaSignatureFinalCompositorMeasurementSubject =
  CaliforniaSignatureFinalCompositorBaselineMeasurementSubject |
  CaliforniaSignatureFinalCompositorCalibrationMeasurementSubject;

export type CaliforniaSignatureFinalCompositorRawTimingSample = {
  durationMs: number;
  endedAtMonotonicMs: number;
  kind: "measured" | "warmup";
  ordinal: number;
  startedAtMonotonicMs: number;
};

export type CaliforniaSignatureFinalCompositorMeasurementReceipt = {
  compositorImplementationSha256: string;
  dependencySha256: string;
  environment: CaliforniaSignatureFinalCompositorMeasurementEnvironmentIdentity;
  environmentSha256: string;
  formalExecutionAuthorized: false;
  measurementKind: CaliforniaSignatureFinalCompositorMeasurementSubject["kind"];
  measurementsSha256: string;
  policy: typeof CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY;
  policySha256: string;
  procedureSha256: typeof CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_TIMING_PROCEDURE_SHA256;
  receiptSha256: string;
  samples: readonly CaliforniaSignatureFinalCompositorRawTimingSample[];
  schemaVersion: typeof CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_MEASUREMENT_SCHEMA_VERSION;
  sourceBuildId: string;
  sourceBuildSha256: string;
  sourcePlanSha256: string;
  sourceSnapshotSha256: string;
  status: "diagnostic-measurement";
  subject: CaliforniaSignatureFinalCompositorMeasurementSubject;
  subjectSha256: string;
  upperBoundMs: number;
};

export type CaliforniaSignatureFinalCompositorMeasurementPublication = {
  fileName: string;
  filePath: string;
  fileSha256: string;
};

export type CaliforniaSignatureFinalCompositorMeasurementLifecycle = {
  lifecycleVersion: 1;
};

export type CaliforniaSignatureFinalCompositorValidatedMeasurementReceipt = {
  fileName: string;
  filePath: string;
  fileSha256: string;
  receipt: CaliforniaSignatureFinalCompositorMeasurementReceipt;
};

const environmentInputKeys = [
  "architecture", "browserBinaryPath", "browserBuildId", "browserChannel",
  "browserExecutableSha256", "browserLaunchArgs", "browserVersion", "colorProfile",
  "cpuLogicalCoreCount", "cpuModel", "cpuPhysicalCoreCount", "dependencyLockSha256",
  "fontInventory", "headless", "kernelVersion", "libvipsVersion", "loadAverage1mMilli",
  "locale", "nodeVersion", "operatingSystem", "playwrightVersion", "powerSource",
  "processCount", "ramBytes", "sharpVersion", "sourceBuildId", "sourceBuildSha256",
  "sourcePlanSha256", "sourceSnapshotSha256", "storageFileSystem", "storageFreeBytes",
  "storageTotalBytes", "storageVolumePath", "thermalState", "timezone", "workersPerProcess"
] as const;

const environmentIdentityKeys = [
  ...environmentInputKeys,
  "browserLaunchArgsSha256", "browserSha256", "dependencySha256", "environmentSha256",
  "fontInventorySha256", "machineSha256"
] as const;

const stageCoverageKeys = [
  "finalCompositorIncluded", "hydrate", "layout", "navigation", "realReset", "replay"
] as const;

const sizeKeys = ["height", "width"] as const;
const maximumDimensionsKeys = ["backingSize", "clipSize", "cssSize"] as const;

function validateFontInventory(value: unknown): CaliforniaSignatureFinalCompositorMeasurementFont[] {
  assert.ok(Array.isArray(value) && value.length > 0,
    "California final compositor measurement font inventory must be non-empty");
  const fonts = value.map((candidate, index) => {
    assertExactKeys(candidate,
      ["family", "fileSha256", "postscriptName", "sourcePath", "version"],
      `California final compositor measurement font ${index}`);
    assertSafeIdentity(candidate.family,
      `California final compositor measurement font ${index} family`);
    assertSha256(candidate.fileSha256,
      `California final compositor measurement font ${index} file`);
    assertSafeIdentity(candidate.postscriptName,
      `California final compositor measurement font ${index} PostScript name`);
    assertAbsolutePath(candidate.sourcePath,
      `California final compositor measurement font ${index} source path`);
    assertSafeIdentity(candidate.version,
      `California final compositor measurement font ${index} version`);
    return {
      family: candidate.family,
      fileSha256: candidate.fileSha256,
      postscriptName: candidate.postscriptName,
      sourcePath: candidate.sourcePath,
      version: candidate.version
    };
  });
  const keys = fonts.map((font) =>
    [font.family, font.postscriptName, font.version, font.sourcePath, font.fileSha256].join("\0"));
  assert.deepEqual(keys, [...keys].sort(compareCodeUnits),
    "California final compositor measurement font inventory must be exactly sorted");
  assert.equal(new Set(keys).size, keys.length,
    "California final compositor measurement font inventory repeats one font");
  return fonts;
}

function buildEnvironmentIdentity(
  candidate: unknown
): CaliforniaSignatureFinalCompositorMeasurementEnvironmentIdentity {
  assertExactKeys(candidate, environmentInputKeys,
    "California final compositor measurement environment input");
  assertSafeIdentity(candidate.architecture,
    "California final compositor measurement architecture");
  assertAbsolutePath(candidate.browserBinaryPath,
    "California final compositor measurement browser binary path");
  assertSafeIdentity(candidate.browserBuildId,
    "California final compositor measurement browser build ID");
  assertSafeIdentity(candidate.browserChannel,
    "California final compositor measurement browser channel");
  assertSha256(candidate.browserExecutableSha256,
    "California final compositor measurement browser executable");
  assert.ok(Array.isArray(candidate.browserLaunchArgs) && candidate.browserLaunchArgs.length > 0,
    "California final compositor measurement browser arguments must be non-empty");
  const browserLaunchArgs = candidate.browserLaunchArgs.map((argument, index) => {
    assertSafeIdentity(argument,
      `California final compositor measurement browser argument ${index}`);
    return argument;
  });
  assert.equal(new Set(browserLaunchArgs).size, browserLaunchArgs.length,
    "California final compositor measurement browser arguments repeat");
  assertSafeIdentity(candidate.browserVersion,
    "California final compositor measurement browser version");
  assertSafeIdentity(candidate.colorProfile,
    "California final compositor measurement color profile");
  assertPositiveSafeInteger(candidate.cpuLogicalCoreCount,
    "California final compositor measurement logical CPU cores");
  assertSafeIdentity(candidate.cpuModel,
    "California final compositor measurement CPU model");
  assertPositiveSafeInteger(candidate.cpuPhysicalCoreCount,
    "California final compositor measurement physical CPU cores");
  assert.ok(candidate.cpuPhysicalCoreCount <= candidate.cpuLogicalCoreCount,
    "California final compositor measurement physical CPU cores exceed logical cores");
  assertSha256(candidate.dependencyLockSha256,
    "California final compositor measurement dependency lock");
  const fontInventory = validateFontInventory(candidate.fontInventory);
  assert.equal(candidate.headless, true,
    "California final compositor measurement must use reviewed headless mode");
  assertSafeIdentity(candidate.kernelVersion,
    "California final compositor measurement kernel version");
  assertSafeIdentity(candidate.libvipsVersion,
    "California final compositor measurement libvips version");
  assertNonNegativeSafeInteger(candidate.loadAverage1mMilli,
    "California final compositor measurement one-minute load average milli-units");
  assertSafeIdentity(candidate.locale,
    "California final compositor measurement locale");
  assertSafeIdentity(candidate.nodeVersion,
    "California final compositor measurement Node version");
  assertSafeIdentity(candidate.operatingSystem,
    "California final compositor measurement operating system");
  assertSafeIdentity(candidate.playwrightVersion,
    "California final compositor measurement Playwright version");
  assert.ok(candidate.powerSource === "ac" || candidate.powerSource === "battery" ||
    candidate.powerSource === "ups",
  "California final compositor measurement power source is absent or unsupported");
  assertPositiveSafeInteger(candidate.processCount,
    "California final compositor measurement process count");
  assert.ok(candidate.processCount <= candidate.cpuLogicalCoreCount,
    "California final compositor measurement processes exceed logical CPU cores");
  assertPositiveSafeInteger(candidate.ramBytes,
    "California final compositor measurement RAM bytes");
  assertSafeIdentity(candidate.sharpVersion,
    "California final compositor measurement Sharp version");
  assertSafeIdentity(candidate.sourceBuildId,
    "California final compositor measurement source build ID");
  assertSha256(candidate.sourceBuildSha256,
    "California final compositor measurement source build");
  assertSha256(candidate.sourcePlanSha256,
    "California final compositor measurement source plan");
  assertSha256(candidate.sourceSnapshotSha256,
    "California final compositor measurement source snapshot");
  assertSafeIdentity(candidate.storageFileSystem,
    "California final compositor measurement storage filesystem");
  assertNonNegativeSafeInteger(candidate.storageFreeBytes,
    "California final compositor measurement storage free bytes");
  assertPositiveSafeInteger(candidate.storageTotalBytes,
    "California final compositor measurement storage total bytes");
  assert.ok(candidate.storageFreeBytes <= candidate.storageTotalBytes,
    "California final compositor measurement storage free bytes exceed total bytes");
  assertAbsolutePath(candidate.storageVolumePath,
    "California final compositor measurement storage volume path");
  assert.ok(candidate.storageVolumePath === "/Volumes/Starship" ||
    candidate.storageVolumePath.startsWith("/Volumes/Starship/"),
  "California final compositor measurement storage volume must remain on /Volumes/Starship");
  assert.ok(candidate.thermalState === "nominal" || candidate.thermalState === "fair" ||
    candidate.thermalState === "serious" || candidate.thermalState === "critical",
  "California final compositor measurement thermal state is absent or unsupported");
  assertSafeIdentity(candidate.timezone,
    "California final compositor measurement timezone");
  assertPositiveSafeInteger(candidate.workersPerProcess,
    "California final compositor measurement workers per process");
  assert.equal(candidate.workersPerProcess, 1,
    "California final compositor measurement workersPerProcess must remain one");

  const input: CaliforniaSignatureFinalCompositorMeasurementEnvironmentInput = {
    architecture: candidate.architecture,
    browserBinaryPath: candidate.browserBinaryPath,
    browserBuildId: candidate.browserBuildId,
    browserChannel: candidate.browserChannel,
    browserExecutableSha256: candidate.browserExecutableSha256,
    browserLaunchArgs,
    browserVersion: candidate.browserVersion,
    colorProfile: candidate.colorProfile,
    cpuLogicalCoreCount: candidate.cpuLogicalCoreCount,
    cpuModel: candidate.cpuModel,
    cpuPhysicalCoreCount: candidate.cpuPhysicalCoreCount,
    dependencyLockSha256: candidate.dependencyLockSha256,
    fontInventory,
    headless: true,
    kernelVersion: candidate.kernelVersion,
    libvipsVersion: candidate.libvipsVersion,
    loadAverage1mMilli: candidate.loadAverage1mMilli,
    locale: candidate.locale,
    nodeVersion: candidate.nodeVersion,
    operatingSystem: candidate.operatingSystem,
    playwrightVersion: candidate.playwrightVersion,
    powerSource: candidate.powerSource,
    processCount: candidate.processCount,
    ramBytes: candidate.ramBytes,
    sharpVersion: candidate.sharpVersion,
    sourceBuildId: candidate.sourceBuildId,
    sourceBuildSha256: candidate.sourceBuildSha256,
    sourcePlanSha256: candidate.sourcePlanSha256,
    sourceSnapshotSha256: candidate.sourceSnapshotSha256,
    storageFileSystem: candidate.storageFileSystem,
    storageFreeBytes: candidate.storageFreeBytes,
    storageTotalBytes: candidate.storageTotalBytes,
    storageVolumePath: candidate.storageVolumePath,
    thermalState: candidate.thermalState,
    timezone: candidate.timezone,
    workersPerProcess: candidate.workersPerProcess
  };
  const browserLaunchArgsSha256 = sha256(stableJson(browserLaunchArgs));
  const fontInventorySha256 = sha256(stableJson(fontInventory));
  const browserSha256 = sha256(stableJson({
    browserBinaryPath: input.browserBinaryPath,
    browserBuildId: input.browserBuildId,
    browserChannel: input.browserChannel,
    browserExecutableSha256: input.browserExecutableSha256,
    browserLaunchArgs,
    browserLaunchArgsSha256,
    browserVersion: input.browserVersion,
    headless: input.headless
  }));
  const dependencySha256 = sha256(stableJson({
    dependencyLockSha256: input.dependencyLockSha256,
    libvipsVersion: input.libvipsVersion,
    nodeVersion: input.nodeVersion,
    playwrightVersion: input.playwrightVersion,
    sharpVersion: input.sharpVersion
  }));
  const machineSha256 = sha256(stableJson({
    architecture: input.architecture,
    colorProfile: input.colorProfile,
    cpuLogicalCoreCount: input.cpuLogicalCoreCount,
    cpuModel: input.cpuModel,
    cpuPhysicalCoreCount: input.cpuPhysicalCoreCount,
    fontInventory,
    fontInventorySha256,
    kernelVersion: input.kernelVersion,
    loadAverage1mMilli: input.loadAverage1mMilli,
    locale: input.locale,
    operatingSystem: input.operatingSystem,
    powerSource: input.powerSource,
    ramBytes: input.ramBytes,
    storageFileSystem: input.storageFileSystem,
    storageFreeBytes: input.storageFreeBytes,
    storageTotalBytes: input.storageTotalBytes,
    storageVolumePath: input.storageVolumePath,
    thermalState: input.thermalState,
    timezone: input.timezone
  }));
  const withoutEnvironmentSha = {
    ...input,
    browserLaunchArgsSha256,
    browserSha256,
    dependencySha256,
    fontInventorySha256,
    machineSha256
  };
  return {
    ...withoutEnvironmentSha,
    environmentSha256: sha256(stableJson(withoutEnvironmentSha))
  };
}

function assertEnvironmentIdentityShape(
  candidate: unknown
): CaliforniaSignatureFinalCompositorMeasurementEnvironmentIdentity {
  assertExactKeys(candidate, environmentIdentityKeys,
    "California final compositor measurement environment identity");
  const input = Object.fromEntries(environmentInputKeys.map((key) => [key, candidate[key]]));
  const expected = buildEnvironmentIdentity(input);
  assert.deepEqual(candidate, expected,
    "California final compositor measurement environment identity is not exactly derived");
  return expected;
}

function validateStageCoverage(
  candidate: unknown,
  kind: CaliforniaSignatureFinalCompositorMeasurementSubject["kind"]
): CaliforniaSignatureFinalCompositorStageCoverage {
  assertExactKeys(candidate, stageCoverageKeys,
    "California final compositor measurement stage coverage");
  for (const key of stageCoverageKeys) {
    assert.equal(typeof candidate[key], "boolean",
      `California final compositor measurement stage coverage ${key} must be explicit`);
  }
  const coverage = candidate as CaliforniaSignatureFinalCompositorStageCoverage;
  const expected: CaliforniaSignatureFinalCompositorStageCoverage = kind === "baseline-group-v2"
    ? {
        finalCompositorIncluded: false,
        hydrate: true,
        layout: true,
        navigation: true,
        realReset: true,
        replay: true
      }
    : {
        finalCompositorIncluded: true,
        hydrate: false,
        layout: false,
        navigation: false,
        realReset: false,
        replay: false
      };
  assert.deepEqual(coverage, expected,
    `${kind}: California final compositor measurement stage coverage is not the exact reviewed procedure`);
  return { ...coverage };
}

function validateSize(candidate: unknown, label: string): { height: number; width: number } {
  assertExactKeys(candidate, sizeKeys, label);
  assertPositiveSafeInteger(candidate.height, `${label}.height`);
  assertPositiveSafeInteger(candidate.width, `${label}.width`);
  return { height: candidate.height, width: candidate.width };
}

function validateMaximumDimensions(
  candidate: unknown
): CaliforniaSignatureFinalCompositorReviewedMaximumDimensions {
  assertExactKeys(candidate, maximumDimensionsKeys,
    "California final compositor calibration maximum dimensions");
  return {
    backingSize: validateSize(candidate.backingSize,
      "California final compositor calibration maximum backing size"),
    clipSize: validateSize(candidate.clipSize,
      "California final compositor calibration maximum clip size"),
    cssSize: validateSize(candidate.cssSize,
      "California final compositor calibration maximum CSS size")
  };
}

function validateSubject(candidate: unknown): CaliforniaSignatureFinalCompositorMeasurementSubject {
  assertPlainRecord(candidate, "California final compositor measurement subject");
  if (candidate.kind === "baseline-group-v2") {
    assertExactKeys(candidate, [
      "dimensionRegistrySha256", "groupKey", "kind", "sourcePlanSha256",
      "sourceSnapshotSha256", "stageCoverage", "workUnitsSha256"
    ], "California final compositor baseline measurement subject");
    assertSha256(candidate.dimensionRegistrySha256,
      "California final compositor baseline dimension registry");
    assertGroupKey(candidate.groupKey,
      "California final compositor baseline group key");
    assertSha256(candidate.sourcePlanSha256,
      "California final compositor baseline source plan");
    assertSha256(candidate.sourceSnapshotSha256,
      "California final compositor baseline source snapshot");
    assertSha256(candidate.workUnitsSha256,
      "California final compositor baseline work units");
    return {
      dimensionRegistrySha256: candidate.dimensionRegistrySha256,
      groupKey: candidate.groupKey,
      kind: "baseline-group-v2",
      sourcePlanSha256: candidate.sourcePlanSha256,
      sourceSnapshotSha256: candidate.sourceSnapshotSha256,
      stageCoverage: validateStageCoverage(candidate.stageCoverage, "baseline-group-v2"),
      workUnitsSha256: candidate.workUnitsSha256
    };
  }
  assert.equal(candidate.kind, "compositor-class-calibration-v2",
    "California final compositor measurement subject kind is unsupported");
  assertExactKeys(candidate, [
    "calibratedCropCount", "classId", "dimensionRegistrySha256", "kind",
    "maximumDimensions", "reviewedClassSha256", "reviewedPoliciesSha256",
    "sourceClassCropCount", "sourcePlanSha256", "sourceSnapshotSha256", "stageCoverage"
  ], "California final compositor calibration measurement subject");
  assert.equal(candidate.calibratedCropCount, 1,
    "California final compositor calibration must measure exactly one maximum-dimension crop");
  assertSafeIdentity(candidate.classId, "California final compositor calibration class ID");
  assertSha256(candidate.dimensionRegistrySha256,
    "California final compositor calibration dimension registry");
  assertSha256(candidate.reviewedClassSha256,
    "California final compositor calibration reviewed class");
  assertSha256(candidate.reviewedPoliciesSha256,
    "California final compositor calibration reviewed policies");
  assertPositiveSafeInteger(candidate.sourceClassCropCount,
    "California final compositor calibration source class crop count");
  assertSha256(candidate.sourcePlanSha256,
    "California final compositor calibration source plan");
  assertSha256(candidate.sourceSnapshotSha256,
    "California final compositor calibration source snapshot");
  return {
    calibratedCropCount: 1,
    classId: candidate.classId,
    dimensionRegistrySha256: candidate.dimensionRegistrySha256,
    kind: "compositor-class-calibration-v2",
    maximumDimensions: validateMaximumDimensions(candidate.maximumDimensions),
    reviewedClassSha256: candidate.reviewedClassSha256,
    reviewedPoliciesSha256: candidate.reviewedPoliciesSha256,
    sourceClassCropCount: candidate.sourceClassCropCount,
    sourcePlanSha256: candidate.sourcePlanSha256,
    sourceSnapshotSha256: candidate.sourceSnapshotSha256,
    stageCoverage: validateStageCoverage(candidate.stageCoverage,
      "compositor-class-calibration-v2")
  };
}

function validateSamples(candidate: unknown): CaliforniaSignatureFinalCompositorRawTimingSample[] {
  assert.ok(Array.isArray(candidate),
    "California final compositor measurement samples must be one array");
  const expectedCount = CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY.warmupCount +
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY.measuredSampleCount;
  assert.equal(candidate.length, expectedCount,
    "California final compositor measurement sample count differs from fixed reviewed policy");
  return candidate.map((sample, ordinal) => {
    assertExactKeys(sample,
      ["durationMs", "endedAtMonotonicMs", "kind", "ordinal", "startedAtMonotonicMs"],
      `California final compositor measurement sample ${ordinal}`);
    assert.equal(sample.ordinal, ordinal,
      "California final compositor measurement samples are duplicate, missing, or retrograde");
    assertNonNegativeSafeInteger(sample.startedAtMonotonicMs,
      `California final compositor measurement sample ${ordinal} start`);
    assertPositiveSafeInteger(sample.endedAtMonotonicMs,
      `California final compositor measurement sample ${ordinal} end`);
    assertPositiveSafeInteger(sample.durationMs,
      `California final compositor measurement sample ${ordinal} duration`);
    assert.equal(sample.endedAtMonotonicMs - sample.startedAtMonotonicMs, sample.durationMs,
      `California final compositor measurement sample ${ordinal} duration differs from monotonic interval`);
    const expectedKind = ordinal <
      CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY.warmupCount
      ? "warmup"
      : "measured";
    assert.equal(sample.kind, expectedKind,
      `California final compositor measurement sample ${ordinal} warmup/measured order drifted`);
    if (ordinal > 0) {
      const previous = candidate[ordinal - 1];
      assertPlainRecord(previous,
        `California final compositor measurement previous sample ${ordinal - 1}`);
      assert.ok(sample.startedAtMonotonicMs >= Number(previous.endedAtMonotonicMs),
        `California final compositor measurement sample ${ordinal} overlaps or regresses`);
    }
    return {
      durationMs: sample.durationMs,
      endedAtMonotonicMs: sample.endedAtMonotonicMs,
      kind: sample.kind as "measured" | "warmup",
      ordinal,
      startedAtMonotonicMs: sample.startedAtMonotonicMs
    };
  });
}

function buildReceipt(options: {
  compositorImplementationSha256: string;
  environment: unknown;
  samples: unknown;
  subject: unknown;
}): CaliforniaSignatureFinalCompositorMeasurementReceipt {
  assertSha256(options.compositorImplementationSha256,
    "California final compositor measurement implementation");
  const environment = buildEnvironmentIdentity(options.environment);
  const subject = validateSubject(options.subject);
  assert.equal(subject.sourcePlanSha256, environment.sourcePlanSha256,
    "California final compositor measurement subject cites another source plan");
  assert.equal(subject.sourceSnapshotSha256, environment.sourceSnapshotSha256,
    "California final compositor measurement subject cites another source snapshot");
  const samples = validateSamples(options.samples);
  const measured = samples.slice(
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY.warmupCount);
  const maximumObservedMs = Math.max(...measured.map((sample) => sample.durationMs));
  const scaled = checkedMultiply(maximumObservedMs,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY.safetyMultiplierBps,
    "California final compositor measurement safety bound");
  const upperBoundMs = checkedAdd(Math.ceil(scaled / 10_000),
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY.fixedHeadroomMs,
    "California final compositor measurement upper bound");
  const base = {
    compositorImplementationSha256: options.compositorImplementationSha256,
    dependencySha256: environment.dependencySha256,
    environment,
    environmentSha256: environment.environmentSha256,
    formalExecutionAuthorized: false,
    measurementKind: subject.kind,
    measurementsSha256: sha256(stableJson({
      policy: CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY,
      samples
    })),
    policy: { ...CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY },
    policySha256: CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY_SHA256,
    procedureSha256: CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_TIMING_PROCEDURE_SHA256,
    samples,
    schemaVersion: CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_MEASUREMENT_SCHEMA_VERSION,
    sourceBuildId: environment.sourceBuildId,
    sourceBuildSha256: environment.sourceBuildSha256,
    sourcePlanSha256: environment.sourcePlanSha256,
    sourceSnapshotSha256: environment.sourceSnapshotSha256,
    status: "diagnostic-measurement",
    subject,
    subjectSha256: sha256(stableJson(subject)),
    upperBoundMs
  } as const;
  return { ...base, receiptSha256: sha256(stableJson(base)) };
}

const receiptKeys = [
  "compositorImplementationSha256", "dependencySha256", "environment", "environmentSha256",
  "formalExecutionAuthorized", "measurementKind", "measurementsSha256", "policy",
  "policySha256", "procedureSha256", "receiptSha256", "samples", "schemaVersion",
  "sourceBuildId", "sourceBuildSha256", "sourcePlanSha256", "sourceSnapshotSha256",
  "status", "subject", "subjectSha256", "upperBoundMs"
] as const;

function validateReceipt(candidate: unknown): CaliforniaSignatureFinalCompositorMeasurementReceipt {
  assertExactKeys(candidate, receiptKeys,
    "California final compositor measurement receipt");
  assert.equal(candidate.schemaVersion,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_MEASUREMENT_SCHEMA_VERSION,
  "California final compositor measurement receipt schema drifted");
  assert.equal(candidate.status, "diagnostic-measurement",
    "California final compositor measurement receipt status drifted");
  assert.equal(candidate.formalExecutionAuthorized, false,
    "California final compositor measurement receipt must never authorize formal execution");
  assert.equal(candidate.procedureSha256,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_TIMING_PROCEDURE_SHA256,
  "California final compositor measurement procedure identity drifted");
  assert.equal(candidate.policySha256,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY_SHA256,
  "California final compositor measurement policy identity drifted");
  assert.deepEqual(candidate.policy,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY,
  "California final compositor measurement timing policy is not the fixed reviewed policy");
  assertSha256(candidate.compositorImplementationSha256,
    "California final compositor measurement implementation");
  const environment = assertEnvironmentIdentityShape(candidate.environment);
  const expected = buildReceipt({
    compositorImplementationSha256: candidate.compositorImplementationSha256,
    environment: Object.fromEntries(environmentInputKeys.map((key) => [key, environment[key]])),
    samples: candidate.samples,
    subject: candidate.subject
  });
  assert.deepEqual(candidate, expected,
    "California final compositor measurement receipt is not an exact derived receipt");
  return expected;
}

function canonicalReceiptBytes(receipt: CaliforniaSignatureFinalCompositorMeasurementReceipt): Buffer {
  return Buffer.from(`${stableJson(receipt)}\n`, "utf8");
}

function assertReceiptFileName(fileName: string): string {
  assert.match(fileName, SAFE_FILE_NAME_PATTERN,
    "California final compositor measurement file name must be one bounded JSON basename");
  assert.equal(path.basename(fileName), fileName,
    "California final compositor measurement file name must not contain path traversal");
  return fileName;
}

type HeldDirectoryIdentity = { dev: bigint; ino: bigint };

type HeldFileIdentity = {
  ctimeNs: string;
  dev: string;
  ino: string;
  mode: number;
  mtimeNs: string;
  nlink: number;
  size: number;
};

type ProducedMeasurementFile = {
  fileIdentity: HeldFileIdentity;
  fileSha256: string;
};

type HeldAncestorDirectory = {
  fileDescriptor: number;
  identity: HeldDirectoryIdentity;
  path: string;
};

type MeasurementLifecycleState = {
  ancestors: readonly HeldAncestorDirectory[];
  beforeNextIoForTest: ((directoryPath: string) => void) | null;
  directoryFileDescriptor: number;
  directoryIdentity: HeldDirectoryIdentity;
  directoryPath: string;
  disposed: boolean;
  producedFiles: Map<string, ProducedMeasurementFile>;
  temporaryRootPath: string;
  worktreeRoot: string;
};

const measurementLifecycleStates =
  new WeakMap<CaliforniaSignatureFinalCompositorMeasurementLifecycle, MeasurementLifecycleState>();

function heldDirectoryIdentity(fileDescriptor: number): HeldDirectoryIdentity {
  const stats = fstatSync(fileDescriptor, { bigint: true });
  assert.ok(stats.isDirectory(),
    "California final compositor measurement held descriptor is not a directory");
  return { dev: stats.dev, ino: stats.ino };
}

function assertPathMatchesHeldDirectory(options: {
  expected: HeldDirectoryIdentity;
  fileDescriptor: number;
  label: string;
  path: string;
  privateMode: boolean;
}) {
  assertAbsolutePath(options.path, options.label);
  const descriptorIdentity = heldDirectoryIdentity(options.fileDescriptor);
  assert.deepEqual(descriptorIdentity, options.expected,
    `${options.label} held directory inode drifted`);
  const stats = lstatSync(options.path, { bigint: true });
  assert.ok(stats.isDirectory() && !stats.isSymbolicLink(),
    `${options.label} path is no longer one real directory`);
  assert.deepEqual({ dev: stats.dev, ino: stats.ino }, options.expected,
    `${options.label} ancestor path inode drifted`);
  assert.equal(realpathSync.native(options.path), options.path,
    `${options.label} ancestor path traverses a symlink`);
  if (options.privateMode) {
    assert.equal(Number(stats.mode) & 0o777, 0o700,
      `${options.label} must remain private mode 0700`);
  }
}

function requireLifecycleState(
  lifecycle: CaliforniaSignatureFinalCompositorMeasurementLifecycle
): MeasurementLifecycleState {
  const state = lifecycle && typeof lifecycle === "object"
    ? measurementLifecycleStates.get(lifecycle)
    : undefined;
  assert.ok(state,
    "California final compositor measurement lifecycle handle is not authentic");
  assert.equal(state.disposed, false,
    "California final compositor measurement lifecycle is already closed");
  for (const ancestor of state.ancestors) {
    assertPathMatchesHeldDirectory({
      expected: ancestor.identity,
      fileDescriptor: ancestor.fileDescriptor,
      label: `California final compositor measurement ancestor ${ancestor.path}`,
      path: ancestor.path,
      privateMode: false
    });
  }
  assertPathMatchesHeldDirectory({
    expected: state.directoryIdentity,
    fileDescriptor: state.directoryFileDescriptor,
    label: "California final compositor measurement private directory",
    path: state.directoryPath,
    privateMode: true
  });
  return state;
}

export function createCaliforniaSignatureFinalCompositorMeasurementLifecycle(options: {
  worktreeRoot: string;
}): CaliforniaSignatureFinalCompositorMeasurementLifecycle {
  assertExactKeys(options, ["worktreeRoot"],
    "California final compositor measurement lifecycle creation request");
  assertAbsolutePath(options.worktreeRoot,
    "California final compositor measurement lifecycle worktree root");
  assert.equal(options.worktreeRoot, CALIFORNIA_SIGNATURE_CAPACITY_WORKTREE_ROOT,
    "California final compositor measurement lifecycle must use the exact Starship CA worktree");
  const temporaryRootPath = path.join(options.worktreeRoot, ".tmp");
  assert.equal(path.dirname(temporaryRootPath), options.worktreeRoot,
    "California final compositor measurement .tmp root is not a direct worktree child");
  const ancestorPaths = [
    "/",
    "/Volumes",
    "/Volumes/Starship",
    options.worktreeRoot,
    temporaryRootPath
  ];
  const ancestors: HeldAncestorDirectory[] = [];
  let directoryFileDescriptor: number | null = null;
  try {
    for (const ancestorPath of ancestorPaths) {
      const fileDescriptor = openSync(ancestorPath,
        fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW);
      const identity = heldDirectoryIdentity(fileDescriptor);
      ancestors.push({ fileDescriptor, identity, path: ancestorPath });
      assertPathMatchesHeldDirectory({
        expected: identity,
        fileDescriptor,
        label: `California final compositor measurement ancestor ${ancestorPath}`,
        path: ancestorPath,
        privateMode: false
      });
    }
    const directoryPath = mkdtempSync(path.join(
      temporaryRootPath,
      "california-final-compositor-measurement-"
    ));
    assert.equal(path.dirname(directoryPath), temporaryRootPath,
      "California final compositor measurement directory is not a fresh direct .tmp child");
    chmodSync(directoryPath, 0o700);
    directoryFileDescriptor = openSync(directoryPath,
      fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW);
    const directoryIdentity = heldDirectoryIdentity(directoryFileDescriptor);
    assertPathMatchesHeldDirectory({
      expected: directoryIdentity,
      fileDescriptor: directoryFileDescriptor,
      label: "California final compositor measurement private directory",
      path: directoryPath,
      privateMode: true
    });
    const lifecycle = Object.freeze({ lifecycleVersion: 1 as const });
    measurementLifecycleStates.set(lifecycle, {
      ancestors,
      beforeNextIoForTest: null,
      directoryFileDescriptor,
      directoryIdentity,
      directoryPath,
      disposed: false,
      producedFiles: new Map(),
      temporaryRootPath,
      worktreeRoot: options.worktreeRoot
    });
    return lifecycle;
  } catch (error) {
    if (directoryFileDescriptor !== null) closeSync(directoryFileDescriptor);
    for (const ancestor of ancestors.reverse()) closeSync(ancestor.fileDescriptor);
    throw error;
  }
}

const HELD_DIRECTORY_IO_HELPER_SOURCE = String.raw`
import json, os, re, stat, sys
operation, expected_dev, expected_ino, file_name, maximum_bytes = sys.argv[1:]
directory_fd = 3
directory_stat = os.fstat(directory_fd)
if not stat.S_ISDIR(directory_stat.st_mode) or str(directory_stat.st_dev) != expected_dev or str(directory_stat.st_ino) != expected_ino:
    sys.stderr.write("held-directory-inode-mismatch")
    sys.exit(73)
if not re.fullmatch(r"[a-z0-9][a-z0-9._-]{0,127}\.json", file_name) or os.path.basename(file_name) != file_name:
    sys.stderr.write("invalid-receipt-basename")
    sys.exit(74)
maximum = int(maximum_bytes)
if maximum <= 0:
    sys.exit(75)
nofollow = getattr(os, "O_NOFOLLOW", 0)
def file_identity(value):
    return {
        "ctimeNs": str(value.st_ctime_ns),
        "dev": str(value.st_dev),
        "ino": str(value.st_ino),
        "mode": stat.S_IMODE(value.st_mode),
        "mtimeNs": str(value.st_mtime_ns),
        "nlink": value.st_nlink,
        "size": value.st_size,
    }
def emit(identity, payload=b""):
    header = json.dumps(identity, separators=(",", ":"), sort_keys=True).encode("ascii")
    sys.stdout.buffer.write(header + b"\n" + payload)
if operation == "write-exclusive":
    payload = sys.stdin.buffer.read(maximum + 1)
    if len(payload) == 0 or len(payload) > maximum:
        sys.exit(76)
    file_fd = os.open(file_name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | nofollow,
                      0o600, dir_fd=directory_fd)
    try:
        offset = 0
        while offset < len(payload):
            written = os.write(file_fd, payload[offset:])
            if written <= 0:
                sys.exit(77)
            offset += written
        os.fsync(file_fd)
        produced = os.fstat(file_fd)
        if not stat.S_ISREG(produced.st_mode) or produced.st_nlink != 1 or \
           stat.S_IMODE(produced.st_mode) != 0o600 or produced.st_size != len(payload):
            sys.exit(83)
        produced_identity = file_identity(produced)
    finally:
        os.close(file_fd)
    os.fsync(directory_fd)
    emit(produced_identity)
    sys.exit(0)
if operation == "read-stable":
    before_path = os.stat(file_name, dir_fd=directory_fd, follow_symlinks=False)
    if not stat.S_ISREG(before_path.st_mode) or before_path.st_nlink != 1 or \
       stat.S_IMODE(before_path.st_mode) != 0o600 or before_path.st_size <= 0 or \
       before_path.st_size > maximum:
        sys.exit(78)
    file_fd = os.open(file_name, os.O_RDONLY | nofollow, dir_fd=directory_fd)
    try:
        before = os.fstat(file_fd)
        chunks = []
        remaining = maximum + 1
        while remaining > 0:
            chunk = os.read(file_fd, min(65536, remaining))
            if not chunk:
                break
            chunks.append(chunk)
            remaining -= len(chunk)
        payload = b"".join(chunks)
        after = os.fstat(file_fd)
        identity_tuple = lambda value: (value.st_dev, value.st_ino, value.st_mode, value.st_nlink,
                                        value.st_size, value.st_mtime_ns, value.st_ctime_ns)
        if identity_tuple(before) != identity_tuple(after):
            sys.exit(79)
        after_path = os.stat(file_name, dir_fd=directory_fd, follow_symlinks=False)
        if identity_tuple(before) != identity_tuple(after_path):
            sys.exit(80)
        read_identity = file_identity(after)
    finally:
        os.close(file_fd)
    if len(payload) == 0 or len(payload) > maximum:
        sys.exit(82)
    emit(read_identity, payload)
    sys.exit(0)
sys.exit(81)
`;

function runHeldDirectoryIo(options: {
  fileName: string;
  input?: Buffer;
  lifecycle: CaliforniaSignatureFinalCompositorMeasurementLifecycle;
  operation: "read-stable" | "write-exclusive";
}): { bytes: Buffer; fileIdentity: HeldFileIdentity } {
  const fileName = assertReceiptFileName(options.fileName);
  const state = requireLifecycleState(options.lifecycle);
  const beforeIo = state.beforeNextIoForTest;
  state.beforeNextIoForTest = null;
  beforeIo?.(state.directoryPath);
  const result = spawnSync("/usr/bin/python3", [
    "-c",
    HELD_DIRECTORY_IO_HELPER_SOURCE,
    options.operation,
    String(state.directoryIdentity.dev),
    String(state.directoryIdentity.ino),
    fileName,
    String(MAX_RECEIPT_BYTES)
  ], {
    encoding: null,
    input: options.input,
    maxBuffer: MAX_RECEIPT_BYTES + 64 * 1024,
    stdio: ["pipe", "pipe", "pipe", state.directoryFileDescriptor]
  });
  let afterError: unknown;
  try {
    requireLifecycleState(options.lifecycle);
  } catch (error) {
    afterError = error;
  }
  assert.equal(afterError, undefined,
    `California final compositor measurement ancestor drifted during ${options.operation}: ` +
    `${afterError instanceof Error ? afterError.message : String(afterError)}`);
  assert.equal(result.error, undefined,
    `California final compositor held-directory helper failed to launch: ${result.error?.message}`);
  assert.equal(result.signal, null,
    `California final compositor held-directory helper was signalled: ${result.signal}`);
  assert.equal(result.status, 0,
    `California final compositor held-directory helper rejected ${options.operation}: ` +
    `${Buffer.from(result.stderr ?? []).toString("utf8") || `exit ${result.status}`}`);
  const stdout = Buffer.from(result.stdout ?? []);
  const headerDelimiter = stdout.indexOf(0x0a);
  assert.ok(headerDelimiter > 0,
    "California final compositor held-directory helper omitted its file identity header");
  let parsedIdentity: unknown;
  try {
    parsedIdentity = JSON.parse(stdout.subarray(0, headerDelimiter).toString("ascii"));
  } catch {
    assert.fail("California final compositor held-directory helper returned invalid identity JSON");
  }
  assertExactKeys(parsedIdentity,
    ["ctimeNs", "dev", "ino", "mode", "mtimeNs", "nlink", "size"],
    "California final compositor held file identity");
  assertBoundedDecimalInteger(parsedIdentity.ctimeNs,
    "California final compositor held file identity ctimeNs");
  assertBoundedDecimalInteger(parsedIdentity.dev,
    "California final compositor held file identity dev");
  assertBoundedDecimalInteger(parsedIdentity.ino,
    "California final compositor held file identity ino");
  assertBoundedDecimalInteger(parsedIdentity.mtimeNs,
    "California final compositor held file identity mtimeNs");
  assert.equal(parsedIdentity.mode, 0o600,
    "California final compositor held file identity mode drifted");
  assert.equal(parsedIdentity.nlink, 1,
    "California final compositor held file identity link count drifted");
  assertPositiveSafeInteger(parsedIdentity.size,
    "California final compositor held file identity size");
  assert.ok(parsedIdentity.size <= MAX_RECEIPT_BYTES,
    "California final compositor held file identity size exceeds its receipt byte bound");
  const bytes = stdout.subarray(headerDelimiter + 1);
  if (options.operation === "read-stable") {
    assert.equal(bytes.length, parsedIdentity.size,
      "California final compositor held file bytes differ from the held identity size");
  } else {
    assert.equal(bytes.length, 0,
      "California final compositor held-directory writer returned unexpected receipt bytes");
    assert.equal(options.input?.length, parsedIdentity.size,
      "California final compositor held file identity differs from the published byte count");
  }
  return {
    bytes,
    fileIdentity: Object.freeze({
      ctimeNs: parsedIdentity.ctimeNs,
      dev: parsedIdentity.dev,
      ino: parsedIdentity.ino,
      mode: parsedIdentity.mode,
      mtimeNs: parsedIdentity.mtimeNs,
      nlink: parsedIdentity.nlink,
      size: parsedIdentity.size
    })
  };
}

function publishCaliforniaSignatureFinalCompositorMeasurementTestFixtureInternal(options: {
  compositorImplementationSha256: string;
  environment: CaliforniaSignatureFinalCompositorMeasurementEnvironmentInput;
  fileName: string;
  lifecycle: CaliforniaSignatureFinalCompositorMeasurementLifecycle;
  samples: readonly CaliforniaSignatureFinalCompositorRawTimingSample[];
  subject: CaliforniaSignatureFinalCompositorMeasurementSubject;
}): CaliforniaSignatureFinalCompositorMeasurementPublication {
  assertExactKeys(options,
    ["compositorImplementationSha256", "environment", "fileName", "lifecycle",
      "samples", "subject"],
    "California final compositor measurement publication request");
  const state = requireLifecycleState(options.lifecycle);
  const fileName = assertReceiptFileName(options.fileName);
  const filePath = path.join(state.directoryPath, fileName);
  const receipt = buildReceipt(options);
  const bytes = canonicalReceiptBytes(receipt);
  assert.ok(bytes.length <= MAX_RECEIPT_BYTES,
    "California final compositor measurement receipt exceeds its byte bound");
  assert.ok(!state.producedFiles.has(fileName),
    "California final compositor measurement lifecycle repeats a produced receipt name");
  const publicationIo = runHeldDirectoryIo({
    fileName,
    input: bytes,
    lifecycle: options.lifecycle,
    operation: "write-exclusive"
  });
  const fileSha256 = sha256(bytes);
  state.producedFiles.set(fileName, Object.freeze({
    fileIdentity: publicationIo.fileIdentity,
    fileSha256
  }));
  return Object.freeze({ fileName, filePath, fileSha256 });
}

export function publishCaliforniaSignatureFinalCompositorMeasurementReceipt(): never {
  assert.fail(
    "California final compositor measurement producer is unavailable: HOLD until the " +
    "lifecycle-owned browser/stage producer records authoritative environment and raw samples"
  );
}

const TEST_FIXTURE_HOOK_KEY =
  Symbol.for("mais.california.final-compositor.measurement-lifecycle.test-fixture.v1");
const exactMeasurementTestEntrypoints = new Set([
  path.join(
    CALIFORNIA_SIGNATURE_CAPACITY_WORKTREE_ROOT,
    "tests/e2e/california-signature-final-compositor-measurement-lifecycle.test.ts"
  ),
  path.join(
    CALIFORNIA_SIGNATURE_CAPACITY_WORKTREE_ROOT,
    "tests/e2e/california-signature-final-compositor-capacity-plan.test.ts"
  )
]);
const isExactMeasurementLifecycleTestProcess =
  process.env.NODE_TEST_CONTEXT === "child-v8" &&
  process.argv.length === 2 &&
  exactMeasurementTestEntrypoints.has(path.resolve(process.argv[1]!));
if (isExactMeasurementLifecycleTestProcess) {
  Object.defineProperty(globalThis, TEST_FIXTURE_HOOK_KEY, {
    configurable: false,
    enumerable: false,
    value: Object.freeze({
      beforeNextIo(
        lifecycle: CaliforniaSignatureFinalCompositorMeasurementLifecycle,
        hook: (directoryPath: string) => void
      ) {
        const state = requireLifecycleState(lifecycle);
        assert.equal(state.beforeNextIoForTest, null,
          "California final compositor measurement test already has a pending I/O hook");
        state.beforeNextIoForTest = hook;
      },
      directoryPath(lifecycle: CaliforniaSignatureFinalCompositorMeasurementLifecycle) {
        return requireLifecycleState(lifecycle).directoryPath;
      },
      dispose(lifecycle: CaliforniaSignatureFinalCompositorMeasurementLifecycle) {
        const state = requireLifecycleState(lifecycle);
        state.disposed = true;
        closeSync(state.directoryFileDescriptor);
        for (const ancestor of [...state.ancestors].reverse()) {
          closeSync(ancestor.fileDescriptor);
        }
        rmSync(state.directoryPath, { force: true, recursive: true });
      },
      publish: publishCaliforniaSignatureFinalCompositorMeasurementTestFixtureInternal,
      publishRaw(options: {
        bytes: Buffer;
        fileName: string;
        lifecycle: CaliforniaSignatureFinalCompositorMeasurementLifecycle;
      }) {
        const state = requireLifecycleState(options.lifecycle);
        const fileName = assertReceiptFileName(options.fileName);
        assert.ok(Buffer.isBuffer(options.bytes) && options.bytes.length > 0 &&
          options.bytes.length <= MAX_RECEIPT_BYTES,
        "California final compositor raw test fixture bytes are absent or oversized");
        assert.ok(!state.producedFiles.has(fileName),
          "California final compositor measurement lifecycle repeats a produced receipt name");
        const publicationIo = runHeldDirectoryIo({
          fileName,
          input: options.bytes,
          lifecycle: options.lifecycle,
          operation: "write-exclusive"
        });
        const fileSha256 = sha256(options.bytes);
        state.producedFiles.set(fileName, Object.freeze({
          fileIdentity: publicationIo.fileIdentity,
          fileSha256
        }));
        return Object.freeze({
          fileName,
          filePath: path.join(state.directoryPath, fileName),
          fileSha256
        });
      }
    }),
    writable: false
  });
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

const validatedReceiptBrands = new WeakMap<object, {
  fingerprint: string;
  lifecycle: CaliforniaSignatureFinalCompositorMeasurementLifecycle;
}>();
const environmentBrands = new WeakMap<object, string>();

export function readCaliforniaSignatureFinalCompositorMeasurementReceipt(options: {
  expectedFileSha256: string;
  fileName: string;
  lifecycle: CaliforniaSignatureFinalCompositorMeasurementLifecycle;
}): CaliforniaSignatureFinalCompositorValidatedMeasurementReceipt {
  assertExactKeys(options, ["expectedFileSha256", "fileName", "lifecycle"],
    "California final compositor measurement read request");
  const state = requireLifecycleState(options.lifecycle);
  const fileName = assertReceiptFileName(options.fileName);
  assertSha256(options.expectedFileSha256,
    "California final compositor expected measurement file");
  const producedFile = state.producedFiles.get(fileName);
  assert.equal(producedFile?.fileSha256, options.expectedFileSha256,
    "California final compositor measurement receipt was not produced by this lifecycle-owned producer");
  const receiptIo = runHeldDirectoryIo({
    fileName,
    lifecycle: options.lifecycle,
    operation: "read-stable"
  });
  assert.deepEqual(receiptIo.fileIdentity, producedFile?.fileIdentity,
    "California final compositor measurement file lost its exclusive producer identity");
  const bytes = receiptIo.bytes;
  assert.equal(sha256(bytes), options.expectedFileSha256,
    "California final compositor measurement file SHA differs from its published identity");
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch {
    assert.fail("California final compositor measurement file is not valid JSON");
  }
  const receipt = validateReceipt(parsed);
  assert.deepEqual(bytes, canonicalReceiptBytes(receipt),
    "California final compositor measurement file is not exact canonical JSON bytes");
  const validated = {
    fileName,
    filePath: path.join(state.directoryPath, fileName),
    fileSha256: options.expectedFileSha256,
    receipt
  };
  deepFreeze(validated);
  environmentBrands.set(receipt.environment, sha256(stableJson(receipt.environment)));
  validatedReceiptBrands.set(validated, {
    fingerprint: sha256(stableJson(validated)),
    lifecycle: options.lifecycle
  });
  return validated;
}

export function assertCaliforniaSignatureFinalCompositorMeasurementEnvironmentIdentity(
  value: CaliforniaSignatureFinalCompositorMeasurementEnvironmentIdentity
): void {
  const brand = value && typeof value === "object" ? environmentBrands.get(value) : undefined;
  assert.ok(brand,
    "California final compositor environment lacks the held-FD validated measurement brand");
  assert.equal(brand, sha256(stableJson(value)),
    "California final compositor environment changed after held-FD validation");
  assertEnvironmentIdentityShape(value);
}

export function assertCaliforniaSignatureFinalCompositorValidatedMeasurementReceipt(
  value: CaliforniaSignatureFinalCompositorValidatedMeasurementReceipt
): void {
  const brand = value && typeof value === "object" ? validatedReceiptBrands.get(value) : undefined;
  assert.ok(brand,
    "California final compositor validated measurement lacks the held-FD reader brand");
  assert.equal(brand.fingerprint, sha256(stableJson(value)),
    "California final compositor validated measurement changed after held-FD validation");
  assertCaliforniaSignatureFinalCompositorMeasurementEnvironmentIdentity(value.receipt.environment);
  const state = requireLifecycleState(brand.lifecycle);
  assert.equal(value.filePath, path.join(state.directoryPath, value.fileName),
    "California final compositor validated measurement path drifted from its lifecycle directory");
  const producedFile = state.producedFiles.get(value.fileName);
  assert.equal(producedFile?.fileSha256, value.fileSha256,
    "California final compositor validated measurement lost its lifecycle producer identity");
  const durableIo = runHeldDirectoryIo({
    fileName: value.fileName,
    lifecycle: brand.lifecycle,
    operation: "read-stable"
  });
  assert.deepEqual(durableIo.fileIdentity, producedFile?.fileIdentity,
    "California final compositor validated measurement file lost its exclusive producer identity");
  const durableBytes = durableIo.bytes;
  assert.equal(sha256(durableBytes), value.fileSha256,
    "California final compositor validated measurement durable file changed after held-FD read");
  assert.deepEqual(durableBytes, canonicalReceiptBytes(value.receipt),
    "California final compositor validated measurement durable file no longer matches its receipt");
  assert.equal(value.fileSha256, sha256(canonicalReceiptBytes(value.receipt)),
    "California final compositor validated measurement file identity drifted");
}

export function calculateCaliforniaSignatureFinalCompositorMeasurementSubjectSha256(
  subject: CaliforniaSignatureFinalCompositorMeasurementSubject
): string {
  return sha256(stableJson(validateSubject(subject)));
}
