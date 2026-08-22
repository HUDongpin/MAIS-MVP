import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
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
  writeFileSync
} from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);

const WORKTREE_ROOT = "/Volumes/Starship/MAIS-ca-viz-labs-wt";
const TEMPORARY_ROOT = path.join(WORKTREE_ROOT, ".tmp");
const RECEIPT_FILE_NAME = "environment-discovery.json";
const MAX_HELD_FILE_BYTES = 256 * 1024 * 1024;
const MAX_COMMAND_OUTPUT_BYTES = 64 * 1024 * 1024;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const DECIMAL_INTEGER_PATTERN = /^(?:0|[1-9][0-9]{0,39})$/;

export const CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REAL_MEASUREMENT_PRODUCER_SCHEMA_VERSION = 1;

export const CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_FIXED_BROWSER_LAUNCH_ARGS = Object.freeze([
  "--disable-background-networking",
  "--disable-component-update",
  "--disable-default-apps",
  "--disable-dev-shm-usage",
  "--disable-features=Translate,BackForwardCache",
  "--force-color-profile=srgb",
  "--no-first-run"
] as const);

export const CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_FIXED_REAL_MEASUREMENT_PROCEDURE =
  Object.freeze({
    baseline: Object.freeze({
      finalCompositorIncluded: false,
      stageSequence: Object.freeze([
        "navigation",
        "hydrate",
        "replay",
        "layout",
        "real-reset"
      ] as const)
    }),
    calibration: Object.freeze({
      calibratedCropCount: 1,
      finalCompositorIncluded: true,
      requiresExactCompositorImplementationIdentity: true,
      requiresExactReviewedMaximumDimensions: true,
      stageSequence: Object.freeze(["final-compositor"] as const)
    }),
    clock: "process.hrtime.bigint",
    measuredSampleCount: 5,
    measurementOrder: "two-warmups-then-five-measured",
    oneBrowserContextPerProcess: true,
    oneWorkerPerProcess: true,
    warmupCount: 2
  } as const);

const FIXED_PROCEDURE_SHA256 = sha256(stableJson(
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_FIXED_REAL_MEASUREMENT_PROCEDURE
));
const FIXED_BROWSER_ARGS_SHA256 = sha256(stableJson(
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_FIXED_BROWSER_LAUNCH_ARGS
));

const SOURCE_RELATIVE_PATHS = Object.freeze([
  "tests/e2e/california-canvas-graphics-instrumentation.ts",
  "tests/e2e/california-canvas-graphics-runtime.ts",
  "tests/e2e/california-canvas-text-audit.ts",
  "tests/e2e/california-signature-composed-staging.ts",
  "tests/e2e/california-signature-evidence-stream.ts",
  "tests/e2e/california-signature-exhaustive-artifact-lifecycle.ts",
  "tests/e2e/california-signature-exhaustive-ledger.test.ts",
  "tests/e2e/california-signature-exhaustive-qa.ts",
  "tests/e2e/california-signature-final-compositor-capacity-plan.ts",
  "tests/e2e/california-signature-final-compositor-measurement-lifecycle.ts",
  "tests/e2e/california-signature-final-compositor-real-measurement-producer.ts"
] as const);

const COMPOSITOR_IMPLEMENTATION_RELATIVE_PATHS = Object.freeze([
  "tests/e2e/california-canvas-graphics-instrumentation.ts",
  "tests/e2e/california-canvas-graphics-runtime.ts",
  "tests/e2e/california-canvas-text-audit.ts",
  "tests/e2e/california-signature-composed-staging.ts"
] as const);

const BASE_READINESS_BLOCKERS = Object.freeze([
  "actual-lane-process-manifest-unavailable",
  "exact-full-group-baseline-receipts-unavailable",
  "formal-source-snapshot-receipt-unavailable",
  "real-browser-calibration-receipts-unavailable",
  "runner-integration-unavailable"
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

function assertDecimalInteger(value: unknown, label: string): asserts value is string {
  assert.ok(typeof value === "string", `${label} must be one decimal integer string`);
  assert.match(value, DECIMAL_INTEGER_PATTERN, `${label} is not a bounded decimal integer`);
}

function assertAbsolutePath(value: unknown, label: string): asserts value is string {
  assertSafeString(value, label, 4096);
  assert.equal(path.resolve(value), value, `${label} must be one normalized absolute path`);
}

function assertCanonicalJson(value: unknown, label: string, depth = 0): void {
  assert.ok(depth <= 16, `${label} exceeds the canonical JSON depth bound`);
  if (value === null || typeof value === "boolean" || typeof value === "string") return;
  if (typeof value === "number") {
    assert.ok(Number.isSafeInteger(value), `${label} contains a non-safe integer`);
    return;
  }
  if (Array.isArray(value)) {
    assert.ok(value.length <= 100_000, `${label} exceeds the array length bound`);
    value.forEach((nested, index) => assertCanonicalJson(nested, `${label}[${index}]`, depth + 1));
    return;
  }
  assertPlainRecord(value, label);
  assert.ok(Object.keys(value).length <= 10_000, `${label} exceeds the object key bound`);
  for (const [key, nested] of Object.entries(value)) {
    assertSafeString(key, `${label} key`, 256);
    assertCanonicalJson(nested, `${label}.${key}`, depth + 1);
  }
}

type HeldFileIdentity = {
  ctimeNs: string;
  dev: string;
  ino: string;
  mode: number;
  mtimeNs: string;
  nlink: number;
  size: number;
};

type HeldFileRead = {
  bytes: Buffer;
  identity: HeldFileIdentity;
  realPath: string;
  requestedPath: string;
};

type CommandResult = {
  signal: string | null;
  status: number | null;
  stderr: Buffer;
  stdout: Buffer;
};

type Probe = {
  browserExecutablePath(): string;
  nodeOsSnapshot(): {
    architecture: string;
    cpuLogicalCoreCount: number;
    cpuModel: string;
    kernelVersion: string;
    loadAverage1mMilli: number;
    nodeVersion: string;
    operatingSystem: string;
    ramBytes: number;
  };
  nowMonotonicNs(): bigint;
  packageFilePath(packageName: string, relativePath: string): string;
  readHeldFile(filePath: string): HeldFileRead;
  runCommand(executablePath: string, args: readonly string[]): CommandResult;
  sharpRuntimeVersions(): { libvipsVersion: string; sharpVersion: string };
};

export type CaliforniaSignatureFinalCompositorDiscoveryFileIdentity = HeldFileIdentity & {
  fileSha256: string;
  purposes: readonly string[];
  realPath: string;
  requestedPath: string;
};

export type CaliforniaSignatureFinalCompositorDiscoveryCommandReceipt = {
  args: readonly string[];
  argsSha256: string;
  commandId: string;
  durationNs: string;
  endedAtMonotonicNs: string;
  executable: Omit<CaliforniaSignatureFinalCompositorDiscoveryFileIdentity, "purposes">;
  receiptSha256: string;
  signal: null;
  startedAtMonotonicNs: string;
  status: 0;
  stderrByteCount: number;
  stderrSha256: string;
  stdoutByteCount: number;
  stdoutSha256: string;
};

export type CaliforniaSignatureFinalCompositorEnvironmentDiscoveryReceipt = {
  browser: {
    browserBuildId: string;
    browserChannel: "playwright-chromium";
    browserExecutableSha256: string;
    browserLaunchArgs: typeof CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_FIXED_BROWSER_LAUNCH_ARGS;
    browserLaunchArgsSha256: string;
    browserVersion: string;
    physicalBinaryPath: string;
    versionProbeCommandReceiptSha256: string;
  };
  calibrationReady: false;
  commands: readonly CaliforniaSignatureFinalCompositorDiscoveryCommandReceipt[];
  dependencies: {
    dependencyLockSha256: string;
    dependencySha256: string;
    libvipsVersion: string;
    nextVersion: string;
    nodeVersion: string;
    playwrightVersion: string;
    sharpVersion: string;
  };
  environmentSha256: string;
  files: readonly CaliforniaSignatureFinalCompositorDiscoveryFileIdentity[];
  fixedProcedure: typeof CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_FIXED_REAL_MEASUREMENT_PROCEDURE;
  fixedProcedureSha256: string;
  formalExecutionAuthorized: false;
  machine: {
    architecture: string;
    colorProfile: "srgb-forced";
    cpuLogicalCoreCount: number;
    cpuModel: string;
    cpuPhysicalCoreCount: number;
    displayInventorySha256: string;
    fontInventory: readonly {
      family: string;
      fileSha256: string;
      postscriptName: string;
      sourcePath: string;
      version: string;
    }[];
    fontInventorySha256: string;
    kernelVersion: string;
    loadAverage1mMilli: number;
    locale: string;
    operatingSystem: string;
    powerSource: "ac" | "battery" | "ups";
    ramBytes: number;
    storageFileSystem: string;
    storageFreeBytes: number;
    storageTotalBytes: number;
    storageVolumePath: "/Volumes/Starship";
    thermalState: "critical" | "fair" | "nominal" | "serious";
    timezone: string;
  };
  measurementBoundary: {
    baselineReceiptCount: 0;
    browserContextStarted: false;
    calibrationReceiptCount: 0;
    rawSampleCount: 0;
    rawSamples: readonly [];
  };
  processSuccess: {
    commandCount: number;
    commandsSha256: string;
    physicalExecutablesSha256: string;
    processSuccessReceiptSha256: string;
    status: "success";
  };
  readinessBlockers: readonly string[];
  receiptSha256: string;
  resourceLifecycle: {
    browserContextClosed: true;
    browserProfilePath: null;
    browserProfileRemoved: true;
    calibrationBrowserProcessReaped: true;
    calibrationBrowserProcessStarted: false;
    discoveryArtifactDirectory: string;
    receiptFilePath: string;
    versionProbeProcessReaped: true;
  };
  schemaVersion:
    typeof CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REAL_MEASUREMENT_PRODUCER_SCHEMA_VERSION;
  source: {
    cleanProductionBuild: {
      buildId: string | null;
      buildIdFileSha256: string | null;
      buildManifestSha256: string | null;
      status: "available" | "unavailable";
    };
    compositorImplementationSha256: string;
    formalSourceSnapshotSha256: null;
    producerSourceBundleSha256: string;
    sourcePlanFileSha256: string;
    worktreeRoot: typeof WORKTREE_ROOT;
  };
  status: "diagnostic-environment-discovery";
};

export type CaliforniaSignatureFinalCompositorEnvironmentDiscoveryPublication = {
  directoryPath: string;
  filePath: string;
  fileSha256: string;
  receipt: CaliforniaSignatureFinalCompositorEnvironmentDiscoveryReceipt;
};

function realReadHeldFile(requestedPath: string): HeldFileRead {
  assertAbsolutePath(requestedPath, "California measurement discovery held file request");
  const realPath = realpathSync.native(requestedPath);
  assertAbsolutePath(realPath, "California measurement discovery physical file path");
  const descriptor = openSync(realPath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const before = fstatSync(descriptor, { bigint: true });
    assert.ok(before.isFile(), `${realPath}: held input is not one regular file`);
    assert.ok(before.size > BigInt(0) && before.size <= BigInt(MAX_HELD_FILE_BYTES),
      `${realPath}: held input is empty or exceeds its byte bound`);
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor, { bigint: true });
    const lexical = lstatSync(realPath, { bigint: true });
    const identity = (stats: typeof before) => ({
      ctimeNs: String(stats.ctimeNs),
      dev: String(stats.dev),
      ino: String(stats.ino),
      mode: Number(stats.mode) & 0o777,
      mtimeNs: String(stats.mtimeNs),
      nlink: Number(stats.nlink),
      size: Number(stats.size)
    });
    assert.deepEqual(identity(after), identity(before),
      `${realPath}: held input changed while it was read`);
    assert.deepEqual(identity(lexical), identity(before),
      `${realPath}: held input path differs from its open descriptor`);
    assert.equal(bytes.length, Number(before.size),
      `${realPath}: held input byte count differs from its descriptor`);
    return { bytes, identity: identity(before), realPath, requestedPath };
  } finally {
    closeSync(descriptor);
  }
}

function realPackageFilePath(packageName: string, relativePath: string): string {
  const packageJsonPath = require.resolve(`${packageName}/package.json`);
  return path.join(path.dirname(packageJsonPath), relativePath);
}

const realProbe: Probe = Object.freeze({
  browserExecutablePath() {
    const playwrightCore = require("playwright-core") as {
      chromium: { executablePath(): string };
    };
    return realpathSync.native(playwrightCore.chromium.executablePath());
  },
  nodeOsSnapshot() {
    const cpus = os.cpus();
    assert.ok(cpus.length > 0, "California measurement discovery found no logical CPUs");
    const cpuModels = [...new Set(cpus.map((cpu) => cpu.model.trim()).filter(Boolean))];
    assert.equal(cpuModels.length, 1,
      "California measurement discovery CPU model inventory is heterogeneous or absent");
    return {
      architecture: os.arch(),
      cpuLogicalCoreCount: cpus.length,
      cpuModel: cpuModels[0]!,
      kernelVersion: os.release(),
      loadAverage1mMilli: Math.max(0, Math.round(os.loadavg()[0] * 1_000)),
      nodeVersion: process.version,
      operatingSystem: os.platform(),
      ramBytes: os.totalmem()
    };
  },
  nowMonotonicNs() {
    return process.hrtime.bigint();
  },
  packageFilePath: realPackageFilePath,
  readHeldFile: realReadHeldFile,
  runCommand(executablePath, args) {
    const commandEnvironment: NodeJS.ProcessEnv = { ...process.env };
    for (const forbiddenEnvironmentKey of
      ["HOME", "home", "CODEX_HOME", "TMPDIR", "TMP", "TEMP"] as const) {
      delete commandEnvironment[forbiddenEnvironmentKey];
    }
    assertSafeString(commandEnvironment.NODE_ENV,
      "California measurement discovery NODE_ENV", 64);
    const result = spawnSync(executablePath, [...args], {
      cwd: WORKTREE_ROOT,
      encoding: null,
      env: commandEnvironment,
      maxBuffer: MAX_COMMAND_OUTPUT_BYTES,
      shell: false,
      windowsHide: true
    });
    assert.equal(result.error, undefined,
      `California measurement discovery command failed to launch: ${result.error?.message}`);
    return {
      signal: result.signal,
      status: result.status,
      stderr: Buffer.from(result.stderr ?? []),
      stdout: Buffer.from(result.stdout ?? [])
    };
  },
  sharpRuntimeVersions() {
    const sharp = require("sharp") as { versions: Record<string, string> };
    return {
      libvipsVersion: sharp.versions.vips,
      sharpVersion: sharp.versions.sharp
    };
  }
});

function validateHeldFileRead(value: HeldFileRead, requestedPath: string, label: string): HeldFileRead {
  assertExactKeys(value, ["bytes", "identity", "realPath", "requestedPath"], label);
  assert.ok(Buffer.isBuffer(value.bytes) && value.bytes.length > 0 &&
    value.bytes.length <= MAX_HELD_FILE_BYTES, `${label} bytes are absent or oversized`);
  assertAbsolutePath(value.requestedPath, `${label} requested path`);
  assert.equal(value.requestedPath, requestedPath, `${label} returned another requested path`);
  assertAbsolutePath(value.realPath, `${label} physical path`);
  assertExactKeys(value.identity,
    ["ctimeNs", "dev", "ino", "mode", "mtimeNs", "nlink", "size"],
    `${label} identity`);
  assertDecimalInteger(value.identity.ctimeNs, `${label} ctimeNs`);
  assertDecimalInteger(value.identity.dev, `${label} dev`);
  assertDecimalInteger(value.identity.ino, `${label} ino`);
  assertDecimalInteger(value.identity.mtimeNs, `${label} mtimeNs`);
  assertNonNegativeSafeInteger(value.identity.mode, `${label} mode`);
  assertPositiveSafeInteger(value.identity.nlink, `${label} nlink`);
  assertPositiveSafeInteger(value.identity.size, `${label} size`);
  assert.equal(value.identity.size, value.bytes.length, `${label} size differs from bytes`);
  return value;
}

function fileFingerprint(value: HeldFileRead): string {
  return stableJson({
    fileSha256: sha256(value.bytes),
    identity: value.identity,
    realPath: value.realPath,
    requestedPath: value.requestedPath
  });
}

function toDiscoveryFile(
  value: HeldFileRead,
  purposes: readonly string[]
): CaliforniaSignatureFinalCompositorDiscoveryFileIdentity {
  return {
    ...value.identity,
    fileSha256: sha256(value.bytes),
    purposes: [...purposes].sort(compareCodeUnits),
    realPath: value.realPath,
    requestedPath: value.requestedPath
  };
}

function parseJsonObject(bytes: Buffer, label: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch {
    assert.fail(`${label} is not valid JSON`);
  }
  assertPlainRecord(parsed, label);
  return parsed;
}

function parsePackageVersion(bytes: Buffer, label: string): string {
  const parsed = parseJsonObject(bytes, label);
  assertSafeString(parsed.version, `${label} version`, 128);
  return parsed.version;
}

function buildCommandReceipt(options: {
  args: readonly string[];
  commandId: string;
  executable: HeldFileRead;
  result: CommandResult;
  startedAtMonotonicNs: bigint;
  endedAtMonotonicNs: bigint;
}): CaliforniaSignatureFinalCompositorDiscoveryCommandReceipt {
  assertSafeString(options.commandId, "California discovery command ID", 128);
  assert.ok(options.endedAtMonotonicNs > options.startedAtMonotonicNs,
    `${options.commandId}: California measurement monotonic clock did not advance`);
  assert.equal(options.result.status, 0,
    `${options.commandId}: California discovery command lacks a zero exit process-success receipt`);
  assert.equal(options.result.signal, null,
    `${options.commandId}: California discovery command was signalled`);
  assert.ok(Buffer.isBuffer(options.result.stdout) && Buffer.isBuffer(options.result.stderr),
    `${options.commandId}: California discovery command output is not byte-oriented`);
  const executable = toDiscoveryFile(options.executable, []);
  const { purposes: _purposes, ...executableWithoutPurposes } = executable;
  const base = {
    args: [...options.args],
    argsSha256: sha256(stableJson(options.args)),
    commandId: options.commandId,
    durationNs: String(options.endedAtMonotonicNs - options.startedAtMonotonicNs),
    endedAtMonotonicNs: String(options.endedAtMonotonicNs),
    executable: executableWithoutPurposes,
    signal: null,
    startedAtMonotonicNs: String(options.startedAtMonotonicNs),
    status: 0,
    stderrByteCount: options.result.stderr.length,
    stderrSha256: sha256(options.result.stderr),
    stdoutByteCount: options.result.stdout.length,
    stdoutSha256: sha256(options.result.stdout)
  } as const;
  return { ...base, receiptSha256: sha256(stableJson(base)) };
}

function parsePositiveInteger(bytes: Buffer, label: string): number {
  const value = bytes.toString("utf8").trim();
  assert.match(value, /^[1-9][0-9]*$/, `${label} is unavailable or invalid`);
  const parsed = Number(value);
  assertPositiveSafeInteger(parsed, label);
  return parsed;
}

function parsePowerSource(bytes: Buffer): "ac" | "battery" | "ups" {
  const value = bytes.toString("utf8");
  if (/AC Power/i.test(value)) return "ac";
  if (/Battery Power/i.test(value)) return "battery";
  if (/UPS Power/i.test(value)) return "ups";
  assert.fail("California measurement power source is unavailable or unsupported");
}

function parseThermalState(bytes: Buffer): "critical" | "fair" | "nominal" | "serious" {
  const value = bytes.toString("utf8");
  if (/critical/i.test(value)) return "critical";
  if (/serious/i.test(value)) return "serious";
  if (/thermal warning level\s*=\s*[1-9]/i.test(value)) return "fair";
  if (/No thermal warning level has been recorded/i.test(value) &&
      /No performance warning level has been recorded/i.test(value)) return "nominal";
  assert.fail("California measurement thermal state is unavailable or unparseable");
}

function parseStorage(dfBytes: Buffer, mountBytes: Buffer) {
  const rows = dfBytes.toString("utf8").trim().split(/\r?\n/);
  assert.equal(rows.length, 2, "California measurement storage df output is unavailable or ambiguous");
  const fields = rows[1]!.trim().split(/\s+/);
  assert.ok(fields.length >= 6, "California measurement storage df row is incomplete");
  assert.equal(fields.at(-1), "/Volumes/Starship",
    "California measurement storage df row is not the Starship volume");
  const totalKiB = Number(fields[1]);
  const freeKiB = Number(fields[3]);
  assertPositiveSafeInteger(totalKiB, "California measurement storage total KiB");
  assertNonNegativeSafeInteger(freeKiB, "California measurement storage free KiB");
  const totalBytes = totalKiB * 1024;
  const freeBytes = freeKiB * 1024;
  assert.ok(Number.isSafeInteger(totalBytes) && Number.isSafeInteger(freeBytes),
    "California measurement storage byte conversion overflowed");
  const mountLine = mountBytes.toString("utf8").split(/\r?\n/)
    .find((line) => line.includes(" on /Volumes/Starship "));
  assert.ok(mountLine, "California measurement Starship mount row is unavailable");
  const fileSystemMatch = mountLine.match(/\(([^,\s)]+)/);
  assert.ok(fileSystemMatch, "California measurement Starship filesystem is unavailable");
  return {
    storageFileSystem: fileSystemMatch[1]!,
    storageFreeBytes: freeBytes,
    storageTotalBytes: totalBytes,
    storageVolumePath: "/Volumes/Starship" as const
  };
}

function parseLocale(bytes: Buffer): string {
  const locale = bytes.toString("utf8").trim();
  assertSafeString(locale, "California measurement locale", 128);
  assert.match(locale, /^[A-Za-z]{2,3}(?:[_-][A-Za-z0-9]+)*$/,
    "California measurement locale is unavailable or invalid");
  return locale;
}

function parseTimezone(bytes: Buffer): string {
  const physical = bytes.toString("utf8").trim();
  const marker = "/zoneinfo/";
  const index = physical.indexOf(marker);
  assert.ok(index >= 0, "California measurement timezone source is unavailable");
  const timezone = physical.slice(index + marker.length);
  assertSafeString(timezone, "California measurement timezone", 128);
  assert.match(timezone, /^[A-Za-z0-9_+.-]+(?:\/[A-Za-z0-9_+.-]+)+$/,
    "California measurement timezone is invalid");
  return timezone;
}

function parseBrowserBuildId(bytes: Buffer): string {
  const parsed = parseJsonObject(bytes, "California Playwright browsers registry");
  assert.ok(Array.isArray(parsed.browsers),
    "California Playwright browsers registry omits browsers");
  const chromium = parsed.browsers.find((entry) =>
    entry && typeof entry === "object" && !Array.isArray(entry) &&
    (entry as Record<string, unknown>).name === "chromium") as Record<string, unknown> | undefined;
  assert.ok(chromium, "California Playwright browsers registry omits Chromium");
  assertSafeString(chromium.revision, "California Playwright Chromium revision", 128);
  return chromium.revision;
}

function parseBrowserVersion(bytes: Buffer): string {
  const value = bytes.toString("utf8").trim();
  const match = value.match(/(?:Chrome|Chromium)(?: for Testing)?\s+([0-9]+(?:\.[0-9]+){2,3})/i);
  assert.ok(match, "California physical Chrome version probe is unavailable or invalid");
  return match[1]!;
}

function parseDisplayInventorySha256(bytes: Buffer): string {
  const parsed = parseJsonObject(bytes, "California display inventory");
  assert.ok(Array.isArray(parsed.SPDisplaysDataType) && parsed.SPDisplaysDataType.length > 0,
    "California display inventory is unavailable");
  return sha256(stableJson(parsed.SPDisplaysDataType));
}

function parseFontCandidates(bytes: Buffer): Array<{
  family: string;
  path: string;
  postscriptName: string;
  version: string;
}> {
  const parsed = parseJsonObject(bytes, "California font inventory");
  assert.ok(Array.isArray(parsed.SPFontsDataType),
    "California font inventory is unavailable");
  const candidates: Array<{
    family: string;
    path: string;
    postscriptName: string;
    version: string;
  }> = [];
  for (const font of parsed.SPFontsDataType) {
    if (!font || typeof font !== "object" || Array.isArray(font)) continue;
    const record = font as Record<string, unknown>;
    if (record.enabled !== "yes" || typeof record.path !== "string" ||
        !path.isAbsolute(record.path) || !Array.isArray(record.typefaces)) continue;
    for (const face of record.typefaces) {
      if (!face || typeof face !== "object" || Array.isArray(face)) continue;
      const typeface = face as Record<string, unknown>;
      if (typeface.enabled !== "yes" || typeof typeface.family !== "string" ||
          typeof typeface._name !== "string" || typeof typeface.version !== "string") continue;
      candidates.push({
        family: typeface.family,
        path: record.path,
        postscriptName: typeface._name,
        version: typeface.version
      });
    }
  }
  assert.ok(candidates.length > 0, "California font inventory has no enabled physical fonts");
  return candidates;
}

function sourceManifestSha256(files: readonly CaliforniaSignatureFinalCompositorDiscoveryFileIdentity[]) {
  return sha256(stableJson(files.map((file) => ({
    fileSha256: file.fileSha256,
    realPath: file.realPath,
    requestedPath: file.requestedPath,
    size: file.size
  }))));
}

function validateCommandReceipt(
  candidate: unknown,
  index: number
): CaliforniaSignatureFinalCompositorDiscoveryCommandReceipt {
  assertExactKeys(candidate, [
    "args", "argsSha256", "commandId", "durationNs", "endedAtMonotonicNs",
    "executable", "receiptSha256", "signal", "startedAtMonotonicNs", "status",
    "stderrByteCount", "stderrSha256", "stdoutByteCount", "stdoutSha256"
  ], `California discovery command receipt ${index}`);
  assert.ok(Array.isArray(candidate.args) && candidate.args.length > 0,
    `California discovery command receipt ${index} args are absent`);
  candidate.args.forEach((argument, argumentIndex) =>
    assertSafeString(argument, `California discovery command ${index} argument ${argumentIndex}`));
  assert.equal(candidate.argsSha256, sha256(stableJson(candidate.args)),
    `California discovery command receipt ${index} args SHA drifted`);
  assertSafeString(candidate.commandId, `California discovery command receipt ${index} ID`, 128);
  assertDecimalInteger(candidate.durationNs, `California discovery command receipt ${index} duration`);
  assertDecimalInteger(candidate.startedAtMonotonicNs,
    `California discovery command receipt ${index} start`);
  assertDecimalInteger(candidate.endedAtMonotonicNs,
    `California discovery command receipt ${index} end`);
  assert.ok(BigInt(candidate.endedAtMonotonicNs) > BigInt(candidate.startedAtMonotonicNs),
    `California discovery command receipt ${index} monotonic clock did not advance`);
  assert.equal(BigInt(candidate.durationNs),
    BigInt(candidate.endedAtMonotonicNs) - BigInt(candidate.startedAtMonotonicNs),
  `California discovery command receipt ${index} duration drifted`);
  assert.equal(candidate.signal, null,
    `California discovery command receipt ${index} was signalled`);
  assert.equal(candidate.status, 0,
    `California discovery command receipt ${index} lacks process success`);
  assertNonNegativeSafeInteger(candidate.stderrByteCount,
    `California discovery command receipt ${index} stderr bytes`);
  assertNonNegativeSafeInteger(candidate.stdoutByteCount,
    `California discovery command receipt ${index} stdout bytes`);
  assertSha256(candidate.stderrSha256,
    `California discovery command receipt ${index} stderr`);
  assertSha256(candidate.stdoutSha256,
    `California discovery command receipt ${index} stdout`);
  assertCanonicalJson(candidate.executable,
    `California discovery command receipt ${index} executable`);
  assertSha256(candidate.receiptSha256,
    `California discovery command receipt ${index} receipt`);
  const { receiptSha256, ...base } = candidate;
  assert.equal(receiptSha256, sha256(stableJson(base)),
    `California discovery command receipt ${index} is not exactly derived`);
  return candidate as CaliforniaSignatureFinalCompositorDiscoveryCommandReceipt;
}

function validateDiscoveryReceipt(
  candidate: unknown
): CaliforniaSignatureFinalCompositorEnvironmentDiscoveryReceipt {
  assertExactKeys(candidate, [
    "browser", "calibrationReady", "commands", "dependencies", "environmentSha256",
    "files", "fixedProcedure", "fixedProcedureSha256", "formalExecutionAuthorized",
    "machine", "measurementBoundary", "processSuccess", "readinessBlockers",
    "receiptSha256", "resourceLifecycle", "schemaVersion", "source", "status"
  ], "California final compositor environment discovery receipt");
  assert.equal(candidate.schemaVersion,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REAL_MEASUREMENT_PRODUCER_SCHEMA_VERSION,
  "California environment discovery schema drifted");
  assert.equal(candidate.status, "diagnostic-environment-discovery",
    "California environment discovery status drifted");
  assert.equal(candidate.formalExecutionAuthorized, false,
    "California diagnostic discovery must never authorize formal execution");
  assert.equal(candidate.calibrationReady, false,
    "California diagnostic discovery must remain calibration-incomplete");
  assert.deepEqual(candidate.fixedProcedure,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_FIXED_REAL_MEASUREMENT_PROCEDURE,
  "California fixed measurement procedure drifted");
  assert.equal(candidate.fixedProcedureSha256, FIXED_PROCEDURE_SHA256,
    "California fixed measurement procedure SHA drifted");
  assertExactKeys(candidate.measurementBoundary, [
    "baselineReceiptCount", "browserContextStarted", "calibrationReceiptCount",
    "rawSampleCount", "rawSamples"
  ], "California discovery measurement boundary");
  assert.deepEqual(candidate.measurementBoundary, {
    baselineReceiptCount: 0,
    browserContextStarted: false,
    calibrationReceiptCount: 0,
    rawSampleCount: 0,
    rawSamples: []
  }, "California discovery measurement boundary must contain no browser claims or raw samples");
  assert.ok(Array.isArray(candidate.commands) && candidate.commands.length > 0,
    "California environment discovery commands are absent");
  const commands = candidate.commands.map(validateCommandReceipt);
  assert.equal(new Set(commands.map((command) => command.commandId)).size, commands.length,
    "California environment discovery repeats a command ID");
  assert.ok(Array.isArray(candidate.files) && candidate.files.length > 0,
    "California environment discovery held files are absent");
  candidate.files.forEach((file, index) => {
    assertCanonicalJson(file, `California environment discovery file ${index}`);
    assertPlainRecord(file, `California environment discovery file ${index}`);
    assertSha256(file.fileSha256, `California environment discovery file ${index} SHA`);
    assertAbsolutePath(file.realPath, `California environment discovery file ${index} physical path`);
    assertAbsolutePath(file.requestedPath,
      `California environment discovery file ${index} requested path`);
  });
  const sortedFiles = [...candidate.files].sort((left, right) =>
    compareCodeUnits(String((left as Record<string, unknown>).realPath),
      String((right as Record<string, unknown>).realPath)));
  assert.deepEqual(candidate.files, sortedFiles,
    "California environment discovery files are not canonically sorted");
  assertExactKeys(candidate.processSuccess, [
    "commandCount", "commandsSha256", "physicalExecutablesSha256",
    "processSuccessReceiptSha256", "status"
  ], "California environment discovery process success");
  assert.equal(candidate.processSuccess.status, "success",
    "California environment discovery process success status drifted");
  assert.equal(candidate.processSuccess.commandCount, commands.length,
    "California environment discovery process success lost commands");
  const commandsSha256 = sha256(stableJson(commands.map((command) => command.receiptSha256)));
  assert.equal(candidate.processSuccess.commandsSha256, commandsSha256,
    "California environment discovery process success command identity drifted");
  const physicalExecutablesSha256 = sha256(stableJson(commands.map((command) => ({
    commandId: command.commandId,
    executableSha256: command.executable.fileSha256,
    physicalPath: command.executable.realPath
  }))));
  assert.equal(candidate.processSuccess.physicalExecutablesSha256, physicalExecutablesSha256,
    "California environment discovery physical executable identity drifted");
  const { processSuccessReceiptSha256, ...processBase } = candidate.processSuccess;
  assert.equal(processSuccessReceiptSha256, sha256(stableJson(processBase)),
    "California environment discovery process-success receipt is not exactly derived");
  assertExactKeys(candidate.resourceLifecycle, [
    "browserContextClosed", "browserProfilePath", "browserProfileRemoved",
    "calibrationBrowserProcessReaped", "calibrationBrowserProcessStarted",
    "discoveryArtifactDirectory", "receiptFilePath", "versionProbeProcessReaped"
  ], "California discovery resource lifecycle");
  assert.equal(candidate.resourceLifecycle.browserContextClosed, true);
  assert.equal(candidate.resourceLifecycle.browserProfilePath, null);
  assert.equal(candidate.resourceLifecycle.browserProfileRemoved, true);
  assert.equal(candidate.resourceLifecycle.calibrationBrowserProcessStarted, false);
  assert.equal(candidate.resourceLifecycle.calibrationBrowserProcessReaped, true);
  assert.equal(candidate.resourceLifecycle.versionProbeProcessReaped, true);
  assertAbsolutePath(candidate.resourceLifecycle.discoveryArtifactDirectory,
    "California discovery artifact directory");
  assert.equal(path.dirname(candidate.resourceLifecycle.discoveryArtifactDirectory), TEMPORARY_ROOT,
    "California discovery artifact directory must be a fresh direct worktree .tmp child");
  assert.equal(candidate.resourceLifecycle.receiptFilePath,
    path.join(candidate.resourceLifecycle.discoveryArtifactDirectory, RECEIPT_FILE_NAME),
  "California discovery receipt path drifted from its artifact directory");
  assert.ok(Array.isArray(candidate.readinessBlockers) && candidate.readinessBlockers.length >= 5,
    "California environment discovery readiness blockers are incomplete");
  const blockers = candidate.readinessBlockers as string[];
  blockers.forEach((blocker, index) => assertSafeString(blocker,
    `California environment discovery blocker ${index}`, 128));
  assert.deepEqual(blockers, [...blockers].sort(compareCodeUnits),
    "California environment discovery blockers are not sorted");
  for (const blocker of BASE_READINESS_BLOCKERS) {
    assert.ok(blockers.includes(blocker),
      `California environment discovery omitted blocker ${blocker}`);
  }
  assertCanonicalJson(candidate.browser, "California environment discovery browser");
  assertCanonicalJson(candidate.dependencies, "California environment discovery dependencies");
  assertCanonicalJson(candidate.machine, "California environment discovery machine");
  assertCanonicalJson(candidate.source, "California environment discovery source");
  assert.equal((candidate.browser as Record<string, unknown>).browserLaunchArgsSha256,
    FIXED_BROWSER_ARGS_SHA256, "California environment discovery browser args SHA drifted");
  assert.deepEqual((candidate.browser as Record<string, unknown>).browserLaunchArgs,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_FIXED_BROWSER_LAUNCH_ARGS,
  "California environment discovery browser args drifted");
  assert.equal((candidate.source as Record<string, unknown>).formalSourceSnapshotSha256, null,
    "California dry discovery must not claim a formal source snapshot");
  assertSha256(candidate.environmentSha256, "California environment discovery environment");
  const expectedEnvironmentSha256 = sha256(stableJson({
    browser: candidate.browser,
    dependencies: candidate.dependencies,
    machine: candidate.machine,
    processSuccess: candidate.processSuccess,
    source: candidate.source
  }));
  assert.equal(candidate.environmentSha256, expectedEnvironmentSha256,
    "California environment discovery environment SHA is not exactly derived");
  assertSha256(candidate.receiptSha256, "California environment discovery receipt");
  const { receiptSha256, ...base } = candidate;
  assert.equal(receiptSha256, sha256(stableJson(base)),
    "California environment discovery receipt is not exactly derived");
  return candidate as CaliforniaSignatureFinalCompositorEnvironmentDiscoveryReceipt;
}

function buildRealProbe(): Probe {
  return realProbe;
}

let testProbeOverride: Probe | null = null;

function currentProbe(): Probe {
  return testProbeOverride ?? buildRealProbe();
}

const publicationBrands = new WeakMap<
CaliforniaSignatureFinalCompositorEnvironmentDiscoveryPublication,
{
  bytes: Buffer;
  directoryDescriptor: number;
  directoryIdentity: { dev: bigint; ino: bigint };
  fileIdentity: HeldFileIdentity;
}>();

function discoverWithProbe(
  probe: Probe,
  artifactDirectory: string
): CaliforniaSignatureFinalCompositorEnvironmentDiscoveryReceipt {
  const commandReceipts: CaliforniaSignatureFinalCompositorDiscoveryCommandReceipt[] = [];
  const commandOutput = new Map<string, Buffer>();
  const inputFiles = new Map<string, {
    purposes: Set<string>;
    read: HeldFileRead;
  }>();

  const readInput = (requestedPath: string, purpose: string) => {
    assertAbsolutePath(requestedPath, `${purpose} input path`);
    const read = validateHeldFileRead(probe.readHeldFile(requestedPath), requestedPath, purpose);
    const existing = inputFiles.get(read.realPath);
    if (existing) {
      assert.equal(fileFingerprint(existing.read), fileFingerprint(read),
        `${purpose}: physical input drifted across discovery`);
      existing.purposes.add(purpose);
    } else {
      inputFiles.set(read.realPath, { purposes: new Set([purpose]), read });
    }
    return read;
  };

  const run = (commandId: string, executablePath: string, args: readonly string[]) => {
    assert.ok(args.length > 0, `${commandId}: command arguments must be explicit`);
    const before = readInput(executablePath, `command-executable:${commandId}`);
    const startedAtMonotonicNs = probe.nowMonotonicNs();
    assert.ok(typeof startedAtMonotonicNs === "bigint" &&
      startedAtMonotonicNs >= BigInt(0),
      `${commandId}: California measurement monotonic clock start is invalid`);
    const result = probe.runCommand(before.realPath, args);
    const endedAtMonotonicNs = probe.nowMonotonicNs();
    assert.ok(typeof endedAtMonotonicNs === "bigint",
      `${commandId}: California measurement monotonic clock end is invalid`);
    const after = validateHeldFileRead(probe.readHeldFile(executablePath), executablePath,
      `${commandId} physical executable after command`);
    assert.equal(fileFingerprint(after), fileFingerprint(before),
      `${commandId}: California physical executable drifted during command execution`);
    const receipt = buildCommandReceipt({
      args,
      commandId,
      endedAtMonotonicNs,
      executable: before,
      result,
      startedAtMonotonicNs
    });
    commandReceipts.push(receipt);
    commandOutput.set(commandId, result.stdout);
    return result.stdout;
  };

  const nodeOs = probe.nodeOsSnapshot();
  assertExactKeys(nodeOs, [
    "architecture", "cpuLogicalCoreCount", "cpuModel", "kernelVersion",
    "loadAverage1mMilli", "nodeVersion", "operatingSystem", "ramBytes"
  ], "California measurement Node and OS snapshot");
  assertSafeString(nodeOs.architecture, "California measurement architecture", 64);
  assertPositiveSafeInteger(nodeOs.cpuLogicalCoreCount,
    "California measurement logical CPU count");
  assertSafeString(nodeOs.cpuModel, "California measurement CPU model", 256);
  assertSafeString(nodeOs.kernelVersion, "California measurement kernel version", 128);
  assertNonNegativeSafeInteger(nodeOs.loadAverage1mMilli,
    "California measurement one-minute load average");
  assertSafeString(nodeOs.nodeVersion, "California measurement Node version", 128);
  assertSafeString(nodeOs.operatingSystem, "California measurement operating system", 64);
  assertPositiveSafeInteger(nodeOs.ramBytes, "California measurement RAM bytes");

  const browserRequestedPath = probe.browserExecutablePath();
  assertAbsolutePath(browserRequestedPath, "California physical Chrome path");
  const browserFile = readInput(browserRequestedPath, "physical-chrome-binary");
  const browserVersionBytes = run("physical-chrome-version", browserRequestedPath, ["--version"]);
  const physicalCpuBytes = run("physical-cpu-count", "/usr/sbin/sysctl",
    ["-n", "hw.physicalcpu"]);
  const powerBytes = run("power-source", "/usr/bin/pmset", ["-g", "batt"]);
  const thermalBytes = run("thermal-state", "/usr/bin/pmset", ["-g", "therm"]);
  const dfBytes = run("starship-storage-capacity", "/bin/df", ["-Pk", "/Volumes/Starship"]);
  const mountBytes = run("starship-storage-filesystem", "/sbin/mount", ["-v"]);
  const localeBytes = run("system-locale", "/usr/bin/defaults", ["read", "-g", "AppleLocale"]);
  const timezoneBytes = run("system-timezone", "/usr/bin/readlink", ["/etc/localtime"]);
  const displayBytes = run("display-inventory", "/usr/sbin/system_profiler",
    ["SPDisplaysDataType", "-json"]);
  const fontBytes = run("font-inventory", "/usr/sbin/system_profiler",
    ["SPFontsDataType", "-json"]);

  const packageLock = readInput(path.join(WORKTREE_ROOT, "package-lock.json"),
    "dependency-lock");
  const playwrightPackage = readInput(
    probe.packageFilePath("playwright-core", "package.json"), "playwright-package");
  const playwrightBrowsers = readInput(
    probe.packageFilePath("playwright-core", "browsers.json"), "playwright-browser-registry");
  const sharpPackage = readInput(probe.packageFilePath("sharp", "package.json"),
    "sharp-package");
  const nextPackage = readInput(probe.packageFilePath("next", "package.json"),
    "next-package");
  const runtimeVersions = probe.sharpRuntimeVersions();
  assertExactKeys(runtimeVersions, ["libvipsVersion", "sharpVersion"],
    "California Sharp runtime versions");
  assertSafeString(runtimeVersions.libvipsVersion, "California libvips version", 128);
  assertSafeString(runtimeVersions.sharpVersion, "California Sharp runtime version", 128);
  const sharpPackageVersion = parsePackageVersion(sharpPackage.bytes, "California Sharp package");
  assert.equal(runtimeVersions.sharpVersion, sharpPackageVersion,
    "California Sharp runtime differs from its physical package");

  const sourceReads = SOURCE_RELATIVE_PATHS.map((relativePath) => readInput(
    path.join(WORKTREE_ROOT, relativePath), `source:${relativePath}`));
  const sourceFiles = sourceReads.map((read) => toDiscoveryFile(read, []))
    .sort((left, right) => compareCodeUnits(left.realPath, right.realPath));
  const sourcePlan = sourceFiles.find((file) => file.requestedPath.endsWith(
    "california-signature-final-compositor-capacity-plan.ts"));
  assert.ok(sourcePlan, "California discovery source plan file identity is absent");
  const compositorFiles = sourceFiles.filter((file) =>
    COMPOSITOR_IMPLEMENTATION_RELATIVE_PATHS.some((relativePath) =>
      file.requestedPath === path.join(WORKTREE_ROOT, relativePath)));
  assert.equal(compositorFiles.length, COMPOSITOR_IMPLEMENTATION_RELATIVE_PATHS.length,
    "California discovery compositor implementation file set is incomplete");

  const fontCandidates = parseFontCandidates(fontBytes);
  const fontInventory = fontCandidates.map((font) => {
    const file = readInput(font.path, `font:${font.postscriptName}`);
    return {
      family: font.family,
      fileSha256: sha256(file.bytes),
      postscriptName: font.postscriptName,
      sourcePath: file.realPath,
      version: font.version
    };
  }).sort((left, right) => compareCodeUnits(
    [left.family, left.postscriptName, left.version, left.sourcePath, left.fileSha256].join("\0"),
    [right.family, right.postscriptName, right.version, right.sourcePath, right.fileSha256].join("\0")
  ));
  const dedupedFontInventory = fontInventory.filter((font, index) => index === 0 ||
    stableJson(font) !== stableJson(fontInventory[index - 1]));
  assert.ok(dedupedFontInventory.length > 0,
    "California measurement font inventory became empty after canonicalization");

  let cleanProductionBuild:
    CaliforniaSignatureFinalCompositorEnvironmentDiscoveryReceipt["source"]["cleanProductionBuild"];
  try {
    const buildId = readInput(path.join(WORKTREE_ROOT, ".next/BUILD_ID"), "next-build-id");
    const buildManifest = readInput(path.join(WORKTREE_ROOT, ".next/build-manifest.json"),
      "next-build-manifest");
    const buildIdValue = buildId.bytes.toString("utf8").trim();
    assertSafeString(buildIdValue, "California production build ID", 256);
    cleanProductionBuild = {
      buildId: buildIdValue,
      buildIdFileSha256: sha256(buildId.bytes),
      buildManifestSha256: sha256(buildManifest.bytes),
      status: "available"
    };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error
      ? String((error as NodeJS.ErrnoException).code)
      : null;
    if (code !== "ENOENT") throw error;
    cleanProductionBuild = {
      buildId: null,
      buildIdFileSha256: null,
      buildManifestSha256: null,
      status: "unavailable"
    };
  }

  const files = [...inputFiles.values()].map(({ purposes, read }) =>
    toDiscoveryFile(read, [...purposes])).sort((left, right) =>
    compareCodeUnits(left.realPath, right.realPath));
  const storage = parseStorage(dfBytes, mountBytes);
  const machine = {
    architecture: nodeOs.architecture,
    colorProfile: "srgb-forced" as const,
    cpuLogicalCoreCount: nodeOs.cpuLogicalCoreCount,
    cpuModel: nodeOs.cpuModel,
    cpuPhysicalCoreCount: parsePositiveInteger(physicalCpuBytes,
      "California measurement physical CPU count"),
    displayInventorySha256: parseDisplayInventorySha256(displayBytes),
    fontInventory: dedupedFontInventory,
    fontInventorySha256: sha256(stableJson(dedupedFontInventory)),
    kernelVersion: nodeOs.kernelVersion,
    loadAverage1mMilli: nodeOs.loadAverage1mMilli,
    locale: parseLocale(localeBytes),
    operatingSystem: nodeOs.operatingSystem,
    powerSource: parsePowerSource(powerBytes),
    ramBytes: nodeOs.ramBytes,
    ...storage,
    thermalState: parseThermalState(thermalBytes),
    timezone: parseTimezone(timezoneBytes)
  };
  assert.ok(machine.cpuPhysicalCoreCount <= machine.cpuLogicalCoreCount,
    "California measurement physical CPU count exceeds logical CPUs");

  const playwrightVersion = parsePackageVersion(playwrightPackage.bytes,
    "California Playwright package");
  const nextVersion = parsePackageVersion(nextPackage.bytes, "California Next package");
  const dependenciesWithoutSha = {
    dependencyLockSha256: sha256(packageLock.bytes),
    libvipsVersion: runtimeVersions.libvipsVersion,
    nextVersion,
    nodeVersion: nodeOs.nodeVersion,
    playwrightVersion,
    sharpVersion: runtimeVersions.sharpVersion
  };
  const dependencies = {
    ...dependenciesWithoutSha,
    dependencySha256: sha256(stableJson(dependenciesWithoutSha))
  };
  const versionCommand = commandReceipts.find((command) =>
    command.commandId === "physical-chrome-version");
  assert.ok(versionCommand, "California physical Chrome version command receipt is absent");
  const browser = {
    browserBuildId: parseBrowserBuildId(playwrightBrowsers.bytes),
    browserChannel: "playwright-chromium" as const,
    browserExecutableSha256: sha256(browserFile.bytes),
    browserLaunchArgs: CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_FIXED_BROWSER_LAUNCH_ARGS,
    browserLaunchArgsSha256: FIXED_BROWSER_ARGS_SHA256,
    browserVersion: parseBrowserVersion(browserVersionBytes),
    physicalBinaryPath: browserFile.realPath,
    versionProbeCommandReceiptSha256: versionCommand.receiptSha256
  };
  const processSuccessWithoutSha = {
    commandCount: commandReceipts.length,
    commandsSha256: sha256(stableJson(commandReceipts.map((command) => command.receiptSha256))),
    physicalExecutablesSha256: sha256(stableJson(commandReceipts.map((command) => ({
      commandId: command.commandId,
      executableSha256: command.executable.fileSha256,
      physicalPath: command.executable.realPath
    })))),
    status: "success" as const
  };
  const processSuccess = {
    ...processSuccessWithoutSha,
    processSuccessReceiptSha256: sha256(stableJson(processSuccessWithoutSha))
  };
  const source = {
    cleanProductionBuild,
    compositorImplementationSha256: sourceManifestSha256(compositorFiles),
    formalSourceSnapshotSha256: null,
    producerSourceBundleSha256: sourceManifestSha256(sourceFiles),
    sourcePlanFileSha256: sourcePlan.fileSha256,
    worktreeRoot: WORKTREE_ROOT
  } as const;
  const readinessBlockers = [...BASE_READINESS_BLOCKERS,
    ...(cleanProductionBuild.status === "unavailable"
      ? ["clean-production-build-unavailable"]
      : [])].sort(compareCodeUnits);
  const resourceLifecycle = {
    browserContextClosed: true as const,
    browserProfilePath: null,
    browserProfileRemoved: true as const,
    calibrationBrowserProcessReaped: true as const,
    calibrationBrowserProcessStarted: false as const,
    discoveryArtifactDirectory: artifactDirectory,
    receiptFilePath: path.join(artifactDirectory, RECEIPT_FILE_NAME),
    versionProbeProcessReaped: true as const
  };
  const environmentSha256 = sha256(stableJson({
    browser,
    dependencies,
    machine,
    processSuccess,
    source
  }));
  const base = {
    browser,
    calibrationReady: false as const,
    commands: commandReceipts,
    dependencies,
    environmentSha256,
    files,
    fixedProcedure: CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_FIXED_REAL_MEASUREMENT_PROCEDURE,
    fixedProcedureSha256: FIXED_PROCEDURE_SHA256,
    formalExecutionAuthorized: false as const,
    machine,
    measurementBoundary: {
      baselineReceiptCount: 0 as const,
      browserContextStarted: false as const,
      calibrationReceiptCount: 0 as const,
      rawSampleCount: 0 as const,
      rawSamples: [] as const
    },
    processSuccess,
    readinessBlockers,
    resourceLifecycle,
    schemaVersion:
      CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REAL_MEASUREMENT_PRODUCER_SCHEMA_VERSION,
    source,
    status: "diagnostic-environment-discovery" as const
  };
  const receipt = { ...base, receiptSha256: sha256(stableJson(base)) };
  return validateDiscoveryReceipt(receipt);
}

export function discoverCaliforniaSignatureFinalCompositorMeasurementEnvironment():
CaliforniaSignatureFinalCompositorEnvironmentDiscoveryPublication {
  assert.equal(arguments.length, 0,
    "California measurement environment discovery takes no caller-authored options");
  assert.equal(path.dirname(TEMPORARY_ROOT), WORKTREE_ROOT,
    "California measurement discovery .tmp is not a direct worktree child");
  assert.equal(realpathSync.native(WORKTREE_ROOT), WORKTREE_ROOT,
    "California measurement discovery worktree path traverses a symlink");
  assert.equal(realpathSync.native(TEMPORARY_ROOT), TEMPORARY_ROOT,
    "California measurement discovery .tmp path traverses a symlink");
  const directoryPath = mkdtempSync(path.join(
    TEMPORARY_ROOT,
    "california-real-measurement-discovery-"
  ));
  chmodSync(directoryPath, 0o700);
  const directoryDescriptor = openSync(directoryPath,
    fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW);
  let success = false;
  try {
    const directoryStats = fstatSync(directoryDescriptor, { bigint: true });
    assert.ok(directoryStats.isDirectory(),
      "California measurement discovery held artifact descriptor is not a directory");
    const receipt = discoverWithProbe(currentProbe(), directoryPath);
    const bytes = Buffer.from(`${stableJson(receipt)}\n`, "utf8");
    const filePath = path.join(directoryPath, RECEIPT_FILE_NAME);
    const fileDescriptor = openSync(filePath,
      fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_NOFOLLOW,
      0o600);
    try {
      writeFileSync(fileDescriptor, bytes);
      fsyncSync(fileDescriptor);
      chmodSync(filePath, 0o400);
    } finally {
      closeSync(fileDescriptor);
    }
    fsyncSync(directoryDescriptor);
    const durable = realReadHeldFile(filePath);
    assert.deepEqual(durable.bytes, bytes,
      "California environment discovery durable receipt bytes drifted");
    assert.equal(durable.identity.mode, 0o400,
      "California environment discovery durable receipt must be read-only mode 0400");
    const parsed = validateDiscoveryReceipt(JSON.parse(durable.bytes.toString("utf8")));
    assert.deepEqual(parsed, receipt,
      "California environment discovery durable receipt differs from the producer value");
    const publication = Object.freeze({
      directoryPath,
      filePath,
      fileSha256: sha256(bytes),
      receipt: parsed
    });
    publicationBrands.set(publication, {
      bytes,
      directoryDescriptor,
      directoryIdentity: { dev: directoryStats.dev, ino: directoryStats.ino },
      fileIdentity: durable.identity
    });
    success = true;
    return publication;
  } finally {
    if (!success) {
      closeSync(directoryDescriptor);
      rmSync(directoryPath, { force: true, recursive: true });
    }
  }
}

export function assertCaliforniaSignatureFinalCompositorEnvironmentDiscoveryPublication(
  publication: CaliforniaSignatureFinalCompositorEnvironmentDiscoveryPublication
): void {
  const brand = publication && typeof publication === "object"
    ? publicationBrands.get(publication)
    : undefined;
  assert.ok(brand,
    "California environment discovery publication lacks its lifecycle-owned producer brand");
  const directoryStats = fstatSync(brand.directoryDescriptor, { bigint: true });
  assert.deepEqual({ dev: directoryStats.dev, ino: directoryStats.ino }, brand.directoryIdentity,
    "California environment discovery held artifact directory drifted");
  const durable = realReadHeldFile(publication.filePath);
  assert.deepEqual(durable.identity, brand.fileIdentity,
    "California environment discovery durable receipt identity drifted");
  assert.deepEqual(durable.bytes, brand.bytes,
    "California environment discovery durable receipt bytes drifted");
  assert.equal(sha256(durable.bytes), publication.fileSha256,
    "California environment discovery durable receipt SHA drifted");
  const parsed = validateDiscoveryReceipt(JSON.parse(durable.bytes.toString("utf8")));
  assert.deepEqual(parsed, publication.receipt,
    "California environment discovery publication differs from durable receipt");
}

const TEST_HOOK_KEY = Symbol.for(
  "mais.california.final-compositor.real-measurement-producer.test-fixture.v1"
);
const exactTestEntrypoint = path.join(
  WORKTREE_ROOT,
  "tests/e2e/california-signature-final-compositor-real-measurement-producer.test.ts"
);
const isExactTestProcess = process.env.NODE_TEST_CONTEXT === "child-v8" &&
  process.argv.length === 2 && path.resolve(process.argv[1]!) === exactTestEntrypoint;
if (isExactTestProcess) {
  Object.defineProperty(globalThis, TEST_HOOK_KEY, {
    configurable: false,
    enumerable: false,
    value: Object.freeze({
      dispose(publication: CaliforniaSignatureFinalCompositorEnvironmentDiscoveryPublication) {
        const brand = publicationBrands.get(publication);
        assert.ok(brand, "California discovery test tried to dispose an unbranded publication");
        publicationBrands.delete(publication);
        closeSync(brand.directoryDescriptor);
        chmodSync(publication.filePath, 0o600);
        rmSync(publication.directoryPath, { force: true, recursive: true });
      },
      runWithProbe<T>(probe: Probe, callback: () => T): T {
        assert.equal(testProbeOverride, null,
          "California discovery test probe override is already active");
        assertPlainRecord(probe, "California discovery test probe");
        assert.equal(typeof callback, "function",
          "California discovery test probe callback is absent");
        testProbeOverride = probe;
        try {
          return callback();
        } finally {
          testProbeOverride = null;
        }
      },
      validate: validateDiscoveryReceipt
    }),
    writable: false
  });
}
