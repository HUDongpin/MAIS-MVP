import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import {
  link,
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rmdir,
  unlink
} from "node:fs/promises";
import { constants as fsConstants, type Dirent } from "node:fs";
import path from "node:path";
import type {
  CaliforniaCoverageProvenance,
  CaliforniaFormalProjectEvidence
} from "./california-visualization-qa-helpers";

export const CALIFORNIA_VISUALIZATION_COVERAGE_LIFECYCLE_VERSION = 2;
export const CALIFORNIA_VISUALIZATION_COVERAGE_PAYLOAD_SCHEMA_VERSION = 5;
export const CALIFORNIA_VISUALIZATION_COVERAGE_OFFICIAL_SUFFIX = ".coverage.passed.json";
export const CALIFORNIA_VISUALIZATION_COVERAGE_PARTIAL_SUFFIX = ".coverage.partial.json";
export const CALIFORNIA_VISUALIZATION_COVERAGE_FAILURE_SUFFIX = ".coverage.failure.json";
export const CALIFORNIA_VISUALIZATION_COVERAGE_RUN_MANIFEST_FILENAME =
  ".california-visualization-coverage-run.json";
export const CALIFORNIA_VISUALIZATION_COVERAGE_RUN_SEAL_FILENAME =
  ".california-visualization-coverage-seal.json";
export const CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME =
  ".california-visualization-coverage-producer-success.json";
export const CALIFORNIA_VISUALIZATION_COVERAGE_REQUIRED_PROJECTS = [
  "desktop-chrome",
  "mobile-chrome"
] as const;

const STARSHIP_ROOT = path.resolve("/Volumes/Starship");
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const BASELINE_SHA_PATTERN = /^[a-f0-9]{7,64}$/i;
const RUN_ID_PATTERN = /^[a-z0-9_-]{24,64}$/i;
const PACKAGE_SEGMENT_PATTERN = /^[a-z0-9._-]{1,80}$/i;
const PROJECT_SEGMENT_PATTERN = /^[a-z0-9._-]{1,40}$/i;

const PROVENANCE_KEYS = [
  "baselineSha",
  "buildId",
  "catalogHash",
  "harnessHash",
  "matrixConfigHash",
  "matrixRunId",
  "sourceHash",
  "sourceSnapshotSha256"
] as const;

const OFFICIAL_ARTIFACT_KEYS = [
  "artifactId",
  "createdAt",
  "execution",
  "lifecycleSchemaVersion",
  "packageId",
  "payload",
  "payloadSha256",
  "projectName",
  "provenance",
  "provenanceSha256",
  "schemaVersion",
  "terminalStatus"
] as const;

const RUN_MANIFEST_KEYS = [
  "expectedArtifacts",
  "expectedArtifactsSha256",
  "lifecycleSchemaVersion",
  "officialArtifactSuffix",
  "provenance",
  "provenanceSha256",
  "requiredPackages",
  "requiredProjects",
  "requiredRepeatEachIndices",
  "schemaVersion",
  "status"
] as const;

const RUN_SEAL_KEYS = [
  "artifacts",
  "expectedArtifactsSha256",
  "lifecycleSchemaVersion",
  "manifestSha256",
  "producerReportSha256",
  "producerSuccessSha256",
  "provenance",
  "provenanceSha256",
  "sealedAt",
  "status"
] as const;

const PRODUCER_SUCCESS_KEYS = [
  "artifacts",
  "expectedArtifactsSha256",
  "lifecycleSchemaVersion",
  "producerReportSha256",
  "provenance",
  "provenanceSha256",
  "publishedAt",
  "status"
] as const;

export type CaliforniaVisualizationCoverageRunIdentity = CaliforniaCoverageProvenance;

export type CaliforniaVisualizationCoveragePassedPayload = Record<string, unknown> & {
  attachmentsDurable: boolean;
  execution: {
    repeatEachIndex: number;
    retry: number;
  };
  expected: number;
  packageIssues: unknown[];
  project: string;
  projectEvidence: CaliforniaFormalProjectEvidence;
  provenance: CaliforniaVisualizationCoverageRunIdentity;
  records: Array<Record<string, unknown> & {
    attempted: boolean;
    status: string;
  }>;
  schemaVersion: number;
  summary: {
    attempted: number;
    failed: number;
    passed: number;
    pending: number;
    unattempted: number;
  };
  workItem: Record<string, unknown> & {
    id: string;
  };
};

export type CaliforniaVisualizationCoverageOfficialArtifact<
  TPayload extends CaliforniaVisualizationCoveragePassedPayload = CaliforniaVisualizationCoveragePassedPayload
> = {
  artifactId: string;
  createdAt: string;
  execution: {
    repeatEachIndex: number;
    retry: 0;
  };
  lifecycleSchemaVersion: typeof CALIFORNIA_VISUALIZATION_COVERAGE_LIFECYCLE_VERSION;
  packageId: string;
  payload: TPayload;
  payloadSha256: string;
  projectName: string;
  provenance: CaliforniaVisualizationCoverageRunIdentity;
  provenanceSha256: string;
  schemaVersion: typeof CALIFORNIA_VISUALIZATION_COVERAGE_PAYLOAD_SCHEMA_VERSION;
  terminalStatus: "passed";
};

export type CaliforniaVisualizationCoverageExpectedArtifact = {
  artifactId: string;
  execution: {
    repeatEachIndex: number;
    retry: 0;
  };
  fileName: string;
  packageId: string;
  projectName: string;
};

export type CaliforniaVisualizationCoverageLoadedArtifact<
  TPayload extends CaliforniaVisualizationCoveragePassedPayload = CaliforniaVisualizationCoveragePassedPayload
> = {
  artifact: CaliforniaVisualizationCoverageOfficialArtifact<TPayload>;
  fileName: string;
  fileSha256: string;
};

export type CaliforniaVisualizationCoverageSealReceipt = {
  fileName: typeof CALIFORNIA_VISUALIZATION_COVERAGE_RUN_SEAL_FILENAME;
  sha256: string;
};

export type CaliforniaVisualizationCoverageProducerSuccessReceipt = {
  fileName: typeof CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME;
  sha256: string;
};

type CaliforniaVisualizationCoverageRunManifest = {
  expectedArtifacts: CaliforniaVisualizationCoverageExpectedArtifact[];
  expectedArtifactsSha256: string;
  lifecycleSchemaVersion: typeof CALIFORNIA_VISUALIZATION_COVERAGE_LIFECYCLE_VERSION;
  officialArtifactSuffix: typeof CALIFORNIA_VISUALIZATION_COVERAGE_OFFICIAL_SUFFIX;
  provenance: CaliforniaVisualizationCoverageRunIdentity;
  provenanceSha256: string;
  requiredPackages: string[];
  requiredProjects: string[];
  requiredRepeatEachIndices: number[];
  schemaVersion: typeof CALIFORNIA_VISUALIZATION_COVERAGE_PAYLOAD_SCHEMA_VERSION;
  status: "open";
};

type CaliforniaVisualizationCoverageRunSeal = {
  artifacts: CaliforniaVisualizationCoverageArtifactByteIdentity[];
  expectedArtifactsSha256: string;
  lifecycleSchemaVersion: typeof CALIFORNIA_VISUALIZATION_COVERAGE_LIFECYCLE_VERSION;
  manifestSha256: string;
  producerReportSha256: string;
  producerSuccessSha256: string;
  provenance: CaliforniaVisualizationCoverageRunIdentity;
  provenanceSha256: string;
  sealedAt: string;
  status: "sealed";
};

type CaliforniaVisualizationCoverageArtifactByteIdentity = {
  artifactId: string;
  fileName: string;
  sha256: string;
};

type ReadJsonResult = {
  bytes: Buffer;
  sha256: string;
  value: Record<string, unknown>;
};

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

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  assert.ok(value && typeof value === "object" && !Array.isArray(value),
    `${label}: expected one object`);
}

function assertExactKeys(value: Record<string, unknown>, expected: readonly string[], label: string) {
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), `${label}: exact schema drifted`);
}

function assertSafeBuildId(value: string) {
  assert.equal(value, value.trim(), "California coverage buildId must be exact-trimmed");
  assert.ok(value.length >= 1 && value.length <= 256, "California coverage buildId is required");
  assert.doesNotMatch(value, /[\u0000-\u001f\u007f/\\]/,
    "California coverage buildId contains unsafe characters");
}

function assertRunId(value: string) {
  assert.match(value, RUN_ID_PATTERN,
    "California coverage matrixRunId must be one high-entropy filesystem-safe ID");
  return value;
}

function assertPackageId(value: string) {
  assert.match(value, PACKAGE_SEGMENT_PATTERN, "California coverage packageId is unsafe or empty");
  return value;
}

function assertProjectName(value: string) {
  assert.match(value, PROJECT_SEGMENT_PATTERN, "California coverage projectName is unsafe or empty");
  return value;
}

function provenanceSha256(provenance: CaliforniaVisualizationCoverageRunIdentity) {
  return sha256(stableJson(provenance));
}

function assertRunIdentity(
  actual: CaliforniaVisualizationCoverageRunIdentity,
  expected: CaliforniaVisualizationCoverageRunIdentity,
  label: string
) {
  assertRecord(actual, `${label} provenance`);
  assertExactKeys(actual, PROVENANCE_KEYS, `${label} provenance`);
  for (const key of PROVENANCE_KEYS) {
    assert.equal(actual[key], expected[key], `${label}: mixed or stale provenance field ${key}`);
  }
  assert.match(actual.baselineSha, BASELINE_SHA_PATTERN, `${label}: invalid baselineSha`);
  assertSafeBuildId(actual.buildId);
  assertRunId(actual.matrixRunId);
  for (const key of [
    "catalogHash",
    "harnessHash",
    "matrixConfigHash",
    "sourceHash",
    "sourceSnapshotSha256"
  ] as const) {
    assert.match(actual[key], SHA256_PATTERN, `${label}: invalid ${key}`);
  }
}

export function buildCaliforniaVisualizationCoverageRunIdentity(
  provenance: CaliforniaCoverageProvenance
): CaliforniaVisualizationCoverageRunIdentity {
  assertRecord(provenance, "California coverage provenance");
  assertExactKeys(provenance, PROVENANCE_KEYS, "California coverage provenance");
  const identity: CaliforniaVisualizationCoverageRunIdentity = {
    baselineSha: provenance.baselineSha,
    buildId: provenance.buildId,
    catalogHash: provenance.catalogHash,
    harnessHash: provenance.harnessHash,
    matrixConfigHash: provenance.matrixConfigHash,
    matrixRunId: provenance.matrixRunId,
    sourceHash: provenance.sourceHash,
    sourceSnapshotSha256: provenance.sourceSnapshotSha256
  };
  assertRunIdentity(identity, identity, "California coverage run identity");
  return structuredClone(identity);
}

function logicalArtifact(options: {
  packageId: string;
  projectName: string;
  provenance: CaliforniaVisualizationCoverageRunIdentity;
  repeatEachIndex: number;
}): CaliforniaVisualizationCoverageExpectedArtifact {
  assertPackageId(options.packageId);
  assertProjectName(options.projectName);
  assert.ok(Number.isSafeInteger(options.repeatEachIndex) && options.repeatEachIndex >= 0,
    "California coverage repeatEachIndex must be a non-negative integer");
  const artifactId = [
    assertRunId(options.provenance.matrixRunId),
    options.projectName,
    options.packageId,
    `repeat-${options.repeatEachIndex}`
  ].join("__");
  return {
    artifactId,
    execution: { repeatEachIndex: options.repeatEachIndex, retry: 0 },
    fileName: `${artifactId}${CALIFORNIA_VISUALIZATION_COVERAGE_OFFICIAL_SUFFIX}`,
    packageId: options.packageId,
    projectName: options.projectName
  };
}

function expectedMatrixKey(options: {
  packageId: string;
  projectName: string;
  repeatEachIndex: number;
}) {
  return `${options.projectName}\0${options.packageId}\0${options.repeatEachIndex}`;
}

export function buildCaliforniaVisualizationCoverageExpectedArtifactMatrix(options: {
  packages: readonly string[];
  projects?: readonly string[];
  provenance: CaliforniaVisualizationCoverageRunIdentity;
  repeatEachIndices?: readonly number[];
}) {
  assertRunIdentity(options.provenance, options.provenance, "California coverage expected matrix");
  const packages = [...options.packages];
  const projects = [...(options.projects ?? CALIFORNIA_VISUALIZATION_COVERAGE_REQUIRED_PROJECTS)];
  const repeats = [...(options.repeatEachIndices ?? [0])];
  assert.ok(packages.length > 0, "California coverage expected matrix has no packages");
  assert.ok(projects.length > 0, "California coverage expected matrix has no projects");
  assert.ok(repeats.length > 0, "California coverage expected matrix has no repeats");
  assert.equal(new Set(packages).size, packages.length,
    "California coverage expected matrix repeats a package");
  assert.equal(new Set(projects).size, projects.length,
    "California coverage expected matrix repeats a project");
  assert.equal(new Set(repeats).size, repeats.length,
    "California coverage expected matrix repeats a repeatEachIndex");
  packages.forEach(assertPackageId);
  projects.forEach(assertProjectName);
  for (const repeatEachIndex of repeats) {
    assert.ok(Number.isSafeInteger(repeatEachIndex) && repeatEachIndex >= 0,
      "California coverage expected repeatEachIndex must be a non-negative integer");
  }
  const matrix = new Map<string, CaliforniaVisualizationCoverageExpectedArtifact>();
  for (const projectName of projects) {
    for (const packageId of packages) {
      for (const repeatEachIndex of repeats) {
        const expected = logicalArtifact({
          packageId,
          projectName,
          provenance: options.provenance,
          repeatEachIndex
        });
        const key = expectedMatrixKey({
          packageId,
          projectName,
          repeatEachIndex
        });
        assert.ok(!matrix.has(key), `California coverage expected logical key repeats: ${key}`);
        matrix.set(key, expected);
      }
    }
  }
  assert.equal(matrix.size, packages.length * projects.length * repeats.length,
    "California coverage expected matrix is not the exact Cartesian product");
  return matrix;
}

function sortedExpectedArtifacts(
  expectedMatrix: ReadonlyMap<string, CaliforniaVisualizationCoverageExpectedArtifact>,
  provenance: CaliforniaVisualizationCoverageRunIdentity
) {
  assert.ok(expectedMatrix.size > 0, "California coverage expected matrix is empty");
  assertRunIdentity(provenance, provenance, "California coverage expected matrix provenance");
  const values: CaliforniaVisualizationCoverageExpectedArtifact[] = [];
  const expectedKeys = new Set<string>();
  for (const [mapKey, rawExpected] of expectedMatrix) {
    const expected = structuredClone(rawExpected);
    const rebuilt = logicalArtifact({
      packageId: expected.packageId,
      projectName: expected.projectName,
      provenance,
      repeatEachIndex: expected.execution.repeatEachIndex
    });
    assert.equal(expected.artifactId, rebuilt.artifactId,
      `${expected.fileName}: expected artifactId is not canonical`);
    assert.equal(expected.fileName, rebuilt.fileName,
      `${expected.fileName}: expected official filename is not canonical`);
    assert.equal(expected.execution.retry, 0,
      `${expected.fileName}: expected retry must be exactly zero`);
    const key = expectedMatrixKey({
      packageId: expected.packageId,
      projectName: expected.projectName,
      repeatEachIndex: expected.execution.repeatEachIndex
    });
    assert.equal(mapKey, key, `${expected.fileName}: expected matrix map key is not canonical`);
    assert.ok(!expectedKeys.has(key), `California coverage expected matrix duplicates ${key}`);
    expectedKeys.add(key);
    values.push(expected);
  }
  const packages = [...new Set(values.map((value) => value.packageId))].sort();
  const projects = [...new Set(values.map((value) => value.projectName))].sort();
  const repeats = [...new Set(values.map((value) => value.execution.repeatEachIndex))].sort((a, b) => a - b);
  assert.equal(values.length, packages.length * projects.length * repeats.length,
    "California coverage expected matrix omits a package/project/repeat combination");
  for (const projectName of projects) {
    for (const packageId of packages) {
      for (const repeatEachIndex of repeats) {
        assert.ok(expectedKeys.has(expectedMatrixKey({ packageId, projectName, repeatEachIndex })),
          `California coverage expected matrix omits ${projectName}/${packageId}/repeat-${repeatEachIndex}`);
      }
    }
  }
  return values.sort((left, right) => left.fileName.localeCompare(right.fileName));
}

function exactRunManifest(options: {
  expectedMatrix: ReadonlyMap<string, CaliforniaVisualizationCoverageExpectedArtifact>;
  provenance: CaliforniaVisualizationCoverageRunIdentity;
}): CaliforniaVisualizationCoverageRunManifest {
  const expectedArtifacts = sortedExpectedArtifacts(options.expectedMatrix, options.provenance);
  return {
    expectedArtifacts,
    expectedArtifactsSha256: sha256(stableJson(expectedArtifacts)),
    lifecycleSchemaVersion: CALIFORNIA_VISUALIZATION_COVERAGE_LIFECYCLE_VERSION,
    officialArtifactSuffix: CALIFORNIA_VISUALIZATION_COVERAGE_OFFICIAL_SUFFIX,
    provenance: structuredClone(options.provenance),
    provenanceSha256: provenanceSha256(options.provenance),
    requiredPackages: [...new Set(expectedArtifacts.map((artifact) => artifact.packageId))].sort(),
    requiredProjects: [...new Set(expectedArtifacts.map((artifact) => artifact.projectName))].sort(),
    requiredRepeatEachIndices: [
      ...new Set(expectedArtifacts.map((artifact) => artifact.execution.repeatEachIndex))
    ].sort((a, b) => a - b),
    schemaVersion: CALIFORNIA_VISUALIZATION_COVERAGE_PAYLOAD_SCHEMA_VERSION,
    status: "open"
  };
}

async function assertStarshipLedgerRoot(ledgerRootInput: string) {
  assert.ok(ledgerRootInput.trim(), "California coverage ledgerRoot must be explicitly supplied");
  const ledgerRoot = path.resolve(ledgerRootInput);
  const relative = path.relative(STARSHIP_ROOT, ledgerRoot);
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative),
    "California coverage ledgerRoot must be a strict descendant of /Volumes/Starship");
  await mkdir(ledgerRoot, { recursive: true });
  const identity = await lstat(ledgerRoot);
  assert.ok(identity.isDirectory() && !identity.isSymbolicLink(),
    "California coverage ledgerRoot must be a regular non-symlink directory");
  assert.equal(await realpath(ledgerRoot), ledgerRoot,
    "California coverage ledgerRoot must not traverse a symlink");
  return ledgerRoot;
}

export function californiaVisualizationCoverageRunDirectory(
  ledgerRoot: string,
  matrixRunId: string
) {
  assertRunId(matrixRunId);
  const root = path.resolve(ledgerRoot);
  const runDirectory = path.resolve(root, matrixRunId);
  const relative = path.relative(root, runDirectory);
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative),
    "California coverage run directory escapes its ledgerRoot");
  return runDirectory;
}

function publicationLockDirectory(ledgerRoot: string, matrixRunId: string) {
  return path.join(ledgerRoot, `.${assertRunId(matrixRunId)}.coverage-publication-lock`);
}

async function withPublicationLock<T>(options: {
  ledgerRoot: string;
  matrixRunId: string;
  task(): Promise<T>;
}): Promise<T> {
  const ledgerRoot = await assertStarshipLedgerRoot(options.ledgerRoot);
  const lockDirectory = publicationLockDirectory(ledgerRoot, options.matrixRunId);
  let acquiredIdentity: Awaited<ReturnType<typeof lstat>> | null = null;
  for (let attempt = 0; ; attempt += 1) {
    try {
      await mkdir(lockDirectory);
      acquiredIdentity = await lstat(lockDirectory);
      assert.ok(acquiredIdentity.isDirectory() && !acquiredIdentity.isSymbolicLink(),
        "California coverage publication lock must be one regular non-symlink directory");
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST" || attempt >= 399) throw error;
      await new Promise<void>((resolve) => setTimeout(resolve, 25));
    }
  }
  try {
    return await options.task();
  } finally {
    assert.ok(acquiredIdentity, "California coverage publication lock identity was not captured");
    const currentIdentity = await lstat(lockDirectory);
    assert.ok(currentIdentity.isDirectory() && !currentIdentity.isSymbolicLink(),
      "California coverage publication lock changed type before cleanup");
    assert.equal(currentIdentity.dev, acquiredIdentity.dev,
      "California coverage publication lock ownership changed device before cleanup");
    assert.equal(currentIdentity.ino, acquiredIdentity.ino,
      "California coverage publication lock ownership changed inode before cleanup");
    await rmdir(lockDirectory);
  }
}

async function writeExclusiveJson(destination: string, value: unknown) {
  const expectedBytes = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
  const temporary = `${destination}.${process.pid}.${randomUUID()}.tmp`;
  let temporaryExists = false;
  try {
    const handle = await open(temporary, "wx", 0o600);
    temporaryExists = true;
    try {
      await handle.writeFile(expectedBytes);
      await handle.sync();
    } finally {
      await handle.close();
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
    const published = await readJsonObject(
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
 * Publish an official artifact while retaining the temporary hard-link source
 * as a fail-closed producer intent until every durable reread and caller
 * validation has completed.
 *
 * A finalizer may be started by another process as soon as this writer drops
 * the run-level publication lock. If anything throws after `destination` is
 * linked, deleting the temporary file in a `finally` block would leave a
 * plausible official artifact with no durable indication that its producer
 * failed. The broad loader deliberately rejects every unknown / `.tmp` entry,
 * so an error after publication must leave this intent behind permanently.
 * This helper intentionally returns the intent path without deleting it. The
 * public writer removes it only after the run-level publication lock itself
 * has been released successfully, so a lock-cleanup failure cannot turn a
 * rejected writer Promise into an apparently sealable official artifact.
 */
async function writeValidatedOfficialJson<TValue>(options: {
  destination: string;
  validate(value: TValue): Promise<void> | void;
  value: TValue;
}) {
  const expectedBytes = Buffer.from(`${JSON.stringify(options.value)}\n`, "utf8");
  const temporary = `${options.destination}.${process.pid}.${randomUUID()}.producer-pending.tmp`;
  try {
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(expectedBytes);
      await handle.sync();
    } finally {
      await handle.close();
    }

    const staged = await readJsonObject(
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
    const published = await readJsonObject(
      options.destination,
      `${path.basename(options.destination)}: official publication readback`,
      2
    );
    assert.deepEqual(published.bytes, expectedBytes,
      `${path.basename(options.destination)}: official publication bytes drifted`);
    await options.validate(published.value as TValue);

    return {
      bytes: published.bytes,
      producerPendingPath: temporary,
      sha256: published.sha256,
      value: published.value as TValue
    };
  } catch (error) {
    // Never clean up a producer intent after a failed publication attempt.
    // It is durable poison that prevents an earlier/partial official artifact
    // from being sealed by a concurrent or manually launched finalizer.
    throw error;
  }
}

async function readJsonObject(
  target: string,
  label: string,
  expectedLinkCount = 1
): Promise<ReadJsonResult> {
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

function assertRunManifest(
  actual: Record<string, unknown>,
  expected: CaliforniaVisualizationCoverageRunManifest
) {
  assertExactKeys(actual, RUN_MANIFEST_KEYS, "California coverage run manifest");
  assert.equal(actual.lifecycleSchemaVersion, CALIFORNIA_VISUALIZATION_COVERAGE_LIFECYCLE_VERSION,
    "California coverage run manifest lifecycle schema drifted");
  assert.equal(actual.schemaVersion, CALIFORNIA_VISUALIZATION_COVERAGE_PAYLOAD_SCHEMA_VERSION,
    "California coverage run manifest payload schema drifted");
  assert.equal(actual.officialArtifactSuffix, CALIFORNIA_VISUALIZATION_COVERAGE_OFFICIAL_SUFFIX,
    "California coverage run manifest official suffix drifted");
  assert.equal(actual.status, "open", "California coverage run manifest is not open");
  assertRecord(actual.provenance, "California coverage run manifest provenance");
  assertRunIdentity(
    actual.provenance as CaliforniaVisualizationCoverageRunIdentity,
    expected.provenance,
    "California coverage run manifest"
  );
  assert.equal(actual.provenanceSha256, provenanceSha256(expected.provenance),
    "California coverage run manifest provenance digest drifted");
  assert.deepEqual(actual.expectedArtifacts, expected.expectedArtifacts,
    "California coverage run manifest expected artifact matrix drifted");
  assert.equal(actual.expectedArtifactsSha256, expected.expectedArtifactsSha256,
    "California coverage run manifest expected matrix digest drifted");
  assert.deepEqual(actual.requiredPackages, expected.requiredPackages,
    "California coverage run manifest required packages drifted");
  assert.deepEqual(actual.requiredProjects, expected.requiredProjects,
    "California coverage run manifest required projects drifted");
  assert.deepEqual(actual.requiredRepeatEachIndices, expected.requiredRepeatEachIndices,
    "California coverage run manifest required repeats drifted");
}

async function initializeUnlocked(options: {
  expectedMatrix: ReadonlyMap<string, CaliforniaVisualizationCoverageExpectedArtifact>;
  ledgerRoot: string;
  provenance: CaliforniaVisualizationCoverageRunIdentity;
}) {
  const ledgerRoot = await assertStarshipLedgerRoot(options.ledgerRoot);
  assertRunIdentity(options.provenance, options.provenance, "California coverage run initialization");
  const runDirectory = californiaVisualizationCoverageRunDirectory(
    ledgerRoot,
    options.provenance.matrixRunId
  );
  let created = false;
  try {
    await mkdir(runDirectory);
    created = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  const runIdentity = await lstat(runDirectory);
  assert.ok(runIdentity.isDirectory() && !runIdentity.isSymbolicLink(),
    "California coverage run directory must be a regular non-symlink directory");
  assert.equal(await realpath(runDirectory), runDirectory,
    "California coverage run directory must not traverse a symlink");
  const expectedManifest = exactRunManifest(options);
  const manifestPath = path.join(runDirectory, CALIFORNIA_VISUALIZATION_COVERAGE_RUN_MANIFEST_FILENAME);
  if (created) {
    assert.deepEqual(await readdir(runDirectory), [],
      "new California coverage run directory was not verified empty");
    await writeExclusiveJson(manifestPath, expectedManifest);
  }
  let manifest: ReadJsonResult | undefined;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      manifest = await readJsonObject(manifestPath, "California coverage run manifest");
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT" || attempt === 49) throw error;
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
    }
  }
  assert.ok(manifest, "California coverage run manifest did not become durable");
  assertRunManifest(manifest.value, expectedManifest);
  return { manifest, runDirectory };
}

export async function initializeCaliforniaVisualizationCoverageArtifactRun(options: {
  expectedMatrix: ReadonlyMap<string, CaliforniaVisualizationCoverageExpectedArtifact>;
  ledgerRoot: string;
  provenance: CaliforniaVisualizationCoverageRunIdentity;
}) {
  return withPublicationLock({
    ledgerRoot: options.ledgerRoot,
    matrixRunId: options.provenance.matrixRunId,
    task: () => initializeUnlocked(options)
  });
}

async function assertRunUnsealed(runDirectory: string) {
  try {
    await lstat(path.join(runDirectory, CALIFORNIA_VISUALIZATION_COVERAGE_RUN_SEAL_FILENAME));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  throw new Error("California coverage run is sealed; publication after terminal seal is forbidden");
}

async function assertRunAcceptsProducerArtifacts(runDirectory: string) {
  await assertRunUnsealed(runDirectory);
  try {
    await lstat(path.join(
      runDirectory,
      CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME
    ));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  throw new Error(
    "California coverage producer already reported process success; later artifact publication is forbidden"
  );
}

function cloneExactJson<T>(value: T, label: string): T {
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch (error) {
    throw new Error(`${label}: value is not JSON serializable: ${error instanceof Error ? error.message : String(error)}`);
  }
  assert.notEqual(serialized, undefined, `${label}: value is not JSON serializable`);
  const clone = JSON.parse(serialized!) as T;
  assert.deepEqual(clone, value, `${label}: JSON serialization is lossy`);
  return clone;
}

function assertPassedPayloadBinding(options: {
  expected: CaliforniaVisualizationCoverageExpectedArtifact;
  payload: CaliforniaVisualizationCoveragePassedPayload;
  provenance: CaliforniaVisualizationCoverageRunIdentity;
  label: string;
}) {
  const { expected, label, payload, provenance } = options;
  assert.equal(payload.schemaVersion, CALIFORNIA_VISUALIZATION_COVERAGE_PAYLOAD_SCHEMA_VERSION,
    `${label}: coverage payload schema must be exactly v5`);
  assert.equal(payload.attachmentsDurable, true,
    `${label}: official coverage payload requires durable attachments`);
  assert.deepEqual(payload.packageIssues, [],
    `${label}: official coverage payload contains package issues`);
  assert.equal(payload.project, expected.projectName,
    `${label}: payload project does not bind the logical artifact`);
  assertRecord(payload.projectEvidence, `${label} projectEvidence`);
  assertExactKeys(
    payload.projectEvidence,
    ["deviceScaleFactor", "hasTouch", "isMobile", "screen", "viewport", "viewportClass"],
    `${label} projectEvidence`
  );
  assert.ok(Number.isFinite(payload.projectEvidence.deviceScaleFactor) && payload.projectEvidence.deviceScaleFactor > 0,
    `${label}: projectEvidence deviceScaleFactor is invalid`);
  assert.equal(typeof payload.projectEvidence.hasTouch, "boolean",
    `${label}: projectEvidence hasTouch is invalid`);
  assert.equal(typeof payload.projectEvidence.isMobile, "boolean",
    `${label}: projectEvidence isMobile is invalid`);
  assert.ok(payload.projectEvidence.viewportClass === "desktop" || payload.projectEvidence.viewportClass === "mobile",
    `${label}: projectEvidence viewportClass is invalid`);
  for (const dimension of ["screen", "viewport"] as const) {
    assertRecord(payload.projectEvidence[dimension], `${label} projectEvidence ${dimension}`);
    assertExactKeys(payload.projectEvidence[dimension], ["height", "width"],
      `${label} projectEvidence ${dimension}`);
    assert.ok(
      Number.isSafeInteger(payload.projectEvidence[dimension].height) &&
      payload.projectEvidence[dimension].height > 0 &&
      Number.isSafeInteger(payload.projectEvidence[dimension].width) &&
      payload.projectEvidence[dimension].width > 0,
      `${label}: projectEvidence ${dimension} is invalid`
    );
  }
  assertRecord(payload.workItem, `${label} workItem`);
  assert.equal(payload.workItem.id, expected.packageId,
    `${label}: payload workItem does not bind the logical artifact`);
  assertRecord(payload.execution, `${label} execution`);
  assertExactKeys(payload.execution, ["repeatEachIndex", "retry"], `${label} execution`);
  assert.equal(payload.execution.repeatEachIndex, expected.execution.repeatEachIndex,
    `${label}: payload repeatEachIndex does not bind the logical artifact`);
  assert.equal(payload.execution.retry, 0, `${label}: retries must be exactly zero`);
  assertRecord(payload.provenance, `${label} provenance`);
  assertRunIdentity(payload.provenance, provenance, label);
  assert.ok(Number.isSafeInteger(payload.expected) && payload.expected > 0,
    `${label}: official payload expected count must be positive`);
  assert.equal(payload.records.length, payload.expected,
    `${label}: official payload record count is incomplete`);
  assert.ok(payload.records.every((record) => record.attempted === true && record.status === "passed"),
    `${label}: official payload contains an unattempted or non-passing record`);
  assert.deepEqual(payload.summary, {
    attempted: payload.expected,
    failed: 0,
    passed: payload.expected,
    pending: 0,
    unattempted: 0
  }, `${label}: official payload summary is not terminally passed`);
}

function assertOfficialArtifactSchema(value: Record<string, unknown>, label: string) {
  assertExactKeys(value, OFFICIAL_ARTIFACT_KEYS, label);
  assert.equal(value.lifecycleSchemaVersion, CALIFORNIA_VISUALIZATION_COVERAGE_LIFECYCLE_VERSION,
    `${label}: unsupported lifecycle schema`);
  assert.equal(value.schemaVersion, CALIFORNIA_VISUALIZATION_COVERAGE_PAYLOAD_SCHEMA_VERSION,
    `${label}: unsupported payload schema`);
  assert.equal(value.terminalStatus, "passed", `${label}: official artifact is not terminally passed`);
}

function expectedForPublication(options: {
  expectedMatrix: ReadonlyMap<string, CaliforniaVisualizationCoverageExpectedArtifact>;
  packageId: string;
  projectName: string;
  repeatEachIndex: number;
}) {
  const key = expectedMatrixKey(options);
  const expected = options.expectedMatrix.get(key);
  assert.ok(expected, `${key}: artifact is outside the exact expected project/package/repeat matrix`);
  return expected;
}

export async function persistCaliforniaVisualizationCoveragePassedArtifact<
  TPayload extends CaliforniaVisualizationCoveragePassedPayload
>(options: {
  errors: readonly unknown[];
  expectedMatrix: ReadonlyMap<string, CaliforniaVisualizationCoverageExpectedArtifact>;
  ledgerRoot: string;
  packageId: string;
  payload: TPayload;
  projectName: string;
  provenance: CaliforniaVisualizationCoverageRunIdentity;
  repeatEachIndex: number;
  retry: number;
  validatePayload(payload: TPayload): Promise<void> | void;
}) {
  assert.equal(options.retry, 0,
    "California coverage official artifacts require the frozen retries=0 contract");
  assert.equal(options.errors.length, 0,
    "California coverage official artifact cannot publish after a recorded test error");
  const expected = expectedForPublication(options);
  const payload = cloneExactJson(options.payload, `${expected.fileName} payload`);
  assertPassedPayloadBinding({ expected, payload, provenance: options.provenance, label: expected.fileName });
  const artifact: CaliforniaVisualizationCoverageOfficialArtifact<TPayload> = {
    artifactId: expected.artifactId,
    createdAt: new Date().toISOString(),
    execution: { repeatEachIndex: expected.execution.repeatEachIndex, retry: 0 },
    lifecycleSchemaVersion: CALIFORNIA_VISUALIZATION_COVERAGE_LIFECYCLE_VERSION,
    packageId: expected.packageId,
    payload,
    payloadSha256: sha256(stableJson(payload)),
    projectName: expected.projectName,
    provenance: structuredClone(options.provenance),
    provenanceSha256: provenanceSha256(options.provenance),
    schemaVersion: CALIFORNIA_VISUALIZATION_COVERAGE_PAYLOAD_SCHEMA_VERSION,
    terminalStatus: "passed"
  };
  const completed = await withPublicationLock({
    ledgerRoot: options.ledgerRoot,
    matrixRunId: options.provenance.matrixRunId,
    async task() {
      const { runDirectory } = await initializeUnlocked(options);
      await assertRunAcceptsProducerArtifacts(runDirectory);
      const destination = path.join(runDirectory, expected.fileName);
      const publication = await writeValidatedOfficialJson({
        destination,
        value: artifact,
        async validate(candidate) {
          assertRecord(candidate, `${expected.fileName}: producer validation`);
          assertOfficialArtifactSchema(candidate, `${expected.fileName}: producer validation`);
          const official = candidate as unknown as CaliforniaVisualizationCoverageOfficialArtifact<TPayload>;
          assert.deepEqual(official, artifact, `${expected.fileName}: publication payload drifted`);
          assertPassedPayloadBinding({
            expected,
            payload: official.payload,
            provenance: options.provenance,
            label: `${expected.fileName}: producer validation`
          });
          assert.equal(official.payloadSha256, sha256(stableJson(official.payload)),
            `${expected.fileName}: payloadSha256 does not bind exact payload`);
          assert.equal(official.provenanceSha256, provenanceSha256(official.provenance),
            `${expected.fileName}: provenanceSha256 does not bind exact provenance`);
          await options.validatePayload(structuredClone(official.payload));
        }
      });
      const official = publication.value;
      return {
        producerPendingPath: publication.producerPendingPath,
        result: {
          artifact: official,
          destination,
          fileSha256: publication.sha256
        }
      };
    }
  });
  // This is the public writer's final awaited/fallible operation. Until the
  // publication lock has been released successfully the pending intent stays
  // durable, and if unlink itself fails the run remains poisoned.
  await unlink(completed.producerPendingPath);
  return completed.result;
}

function compactFailure(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message.replace(/\s+/g, " ").trim().slice(0, 2_000),
      name: error.name || "Error"
    };
  }
  return {
    message: String(error).replace(/\s+/g, " ").trim().slice(0, 2_000),
    name: "Error"
  };
}

export async function persistCaliforniaVisualizationCoverageDiagnostic(options: {
  error: unknown;
  expectedMatrix: ReadonlyMap<string, CaliforniaVisualizationCoverageExpectedArtifact>;
  ledgerRoot: string;
  packageId: string;
  partialPayload?: unknown;
  projectName: string;
  provenance: CaliforniaVisualizationCoverageRunIdentity;
  repeatEachIndex: number;
  retry: number;
}) {
  const expected = expectedForPublication(options);
  assert.ok(Number.isSafeInteger(options.retry) && options.retry >= 0,
    "California coverage diagnostic retry must be a non-negative integer");
  const terminalStatus = options.partialPayload === undefined ? "failed" : "partial";
  const suffix = terminalStatus === "partial"
    ? CALIFORNIA_VISUALIZATION_COVERAGE_PARTIAL_SUFFIX
    : CALIFORNIA_VISUALIZATION_COVERAGE_FAILURE_SUFFIX;
  const diagnosticId = `${expected.artifactId}__${terminalStatus}__${randomUUID()}`;
  const diagnostic = {
    createdAt: new Date().toISOString(),
    diagnosticId,
    execution: {
      repeatEachIndex: options.repeatEachIndex,
      retry: options.retry
    },
    failure: compactFailure(options.error),
    lifecycleSchemaVersion: CALIFORNIA_VISUALIZATION_COVERAGE_LIFECYCLE_VERSION,
    packageId: options.packageId,
    partialPayload: options.partialPayload === undefined
      ? null
      : cloneExactJson(options.partialPayload, `${diagnosticId} partial payload`),
    projectName: options.projectName,
    provenance: structuredClone(options.provenance),
    provenanceSha256: provenanceSha256(options.provenance),
    terminalStatus
  };
  return withPublicationLock({
    ledgerRoot: options.ledgerRoot,
    matrixRunId: options.provenance.matrixRunId,
    async task() {
      const { runDirectory } = await initializeUnlocked(options);
      await assertRunAcceptsProducerArtifacts(runDirectory);
      const destination = path.join(runDirectory, `${diagnosticId}${suffix}`);
      await writeExclusiveJson(destination, diagnostic);
      return destination;
    }
  });
}

function assertLoadedOfficialArtifact<TPayload extends CaliforniaVisualizationCoveragePassedPayload>(options: {
  expected: CaliforniaVisualizationCoverageExpectedArtifact;
  fileName: string;
  provenance: CaliforniaVisualizationCoverageRunIdentity;
  value: Record<string, unknown>;
  validatePayload(payload: TPayload): Promise<void> | void;
}) {
  assertOfficialArtifactSchema(options.value, options.fileName);
  const artifact = options.value as unknown as CaliforniaVisualizationCoverageOfficialArtifact<TPayload>;
  assert.equal(artifact.artifactId, options.expected.artifactId,
    `${options.fileName}: artifactId drifted`);
  assert.equal(artifact.packageId, options.expected.packageId,
    `${options.fileName}: packageId drifted`);
  assert.equal(artifact.projectName, options.expected.projectName,
    `${options.fileName}: projectName drifted`);
  assert.deepEqual(artifact.execution, options.expected.execution,
    `${options.fileName}: execution drifted from retries=0 matrix`);
  assertRunIdentity(artifact.provenance, options.provenance, options.fileName);
  assert.equal(artifact.provenanceSha256, provenanceSha256(artifact.provenance),
    `${options.fileName}: provenanceSha256 does not bind exact provenance`);
  assertPassedPayloadBinding({
    expected: options.expected,
    payload: artifact.payload,
    provenance: options.provenance,
    label: options.fileName
  });
  assert.equal(artifact.payloadSha256, sha256(stableJson(artifact.payload)),
    `${options.fileName}: payloadSha256 does not bind exact payload`);
  return Promise.resolve(options.validatePayload(structuredClone(artifact.payload))).then(() => artifact);
}

function assertDirectoryEntries(options: {
  allowProducerSuccess: boolean;
  allowSeal: boolean;
  entries: Dirent[];
}) {
  const allowed = new Set([
    CALIFORNIA_VISUALIZATION_COVERAGE_RUN_MANIFEST_FILENAME,
    ...(options.allowProducerSuccess
      ? [CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME]
      : []),
    ...(options.allowSeal ? [CALIFORNIA_VISUALIZATION_COVERAGE_RUN_SEAL_FILENAME] : [])
  ]);
  const unexpected = options.entries.filter((entry) =>
    !allowed.has(entry.name) && !entry.name.endsWith(CALIFORNIA_VISUALIZATION_COVERAGE_OFFICIAL_SUFFIX)
  );
  assert.deepEqual(unexpected.map((entry) => entry.name), [],
    "California coverage run contains failure/partial/temp/unknown files");
}

function exactArtifactByteIdentities<
  TPayload extends CaliforniaVisualizationCoveragePassedPayload
>(loaded: readonly CaliforniaVisualizationCoverageLoadedArtifact<TPayload>[]) {
  return loaded.map(({ artifact, fileName, fileSha256 }) => ({
    artifactId: artifact.artifactId,
    fileName,
    sha256: fileSha256
  })).sort((left, right) => left.fileName.localeCompare(right.fileName));
}

function assertArtifactByteIdentities(
  value: unknown,
  label: string
): asserts value is CaliforniaVisualizationCoverageArtifactByteIdentity[] {
  assert.ok(Array.isArray(value), `${label}: artifacts must be an array`);
  for (const artifact of value) {
    assertRecord(artifact, `${label}: artifact byte identity`);
    assertExactKeys(
      artifact,
      ["artifactId", "fileName", "sha256"],
      `${label}: artifact byte identity`
    );
    assert.ok(typeof artifact.artifactId === "string" && artifact.artifactId.length > 0,
      `${label}: artifactId is invalid`);
    assert.ok(typeof artifact.fileName === "string" && artifact.fileName.length > 0,
      `${label}: fileName is invalid`);
    assert.ok(typeof artifact.sha256 === "string" && SHA256_PATTERN.test(artifact.sha256),
      `${label}: artifact SHA-256 is invalid`);
  }
  const sorted = [...value].sort((left, right) => left.fileName.localeCompare(right.fileName));
  assert.deepEqual(value, sorted, `${label}: artifact byte identities must use exact filename order`);
  assert.equal(
    new Set(value.map((artifact) => artifact.fileName)).size,
    value.length,
    `${label}: artifact byte identities repeat a filename`
  );
  assert.equal(
    new Set(value.map((artifact) => artifact.artifactId)).size,
    value.length,
    `${label}: artifact byte identities repeat an artifactId`
  );
}

function assertProducerSuccessRecord(options: {
  expectedManifest: CaliforniaVisualizationCoverageRunManifest;
  label: string;
  provenance: CaliforniaVisualizationCoverageRunIdentity;
  value: Record<string, unknown>;
}) {
  assertExactKeys(options.value, PRODUCER_SUCCESS_KEYS, options.label);
  assertArtifactByteIdentities(options.value.artifacts, options.label);
  assert.equal(
    options.value.lifecycleSchemaVersion,
    CALIFORNIA_VISUALIZATION_COVERAGE_LIFECYCLE_VERSION,
    `${options.label}: lifecycle schema drifted`
  );
  assert.equal(options.value.status, "producer-succeeded",
    `${options.label}: producer did not terminate successfully`);
  assert.ok(
    typeof options.value.publishedAt === "string" && !Number.isNaN(Date.parse(options.value.publishedAt)),
    `${options.label}: publishedAt is invalid`
  );
  assert.equal(
    options.value.expectedArtifactsSha256,
    options.expectedManifest.expectedArtifactsSha256,
    `${options.label}: expected matrix digest drifted`
  );
  assertRecord(options.value.provenance, `${options.label} provenance`);
  assertRunIdentity(
    options.value.provenance as CaliforniaVisualizationCoverageRunIdentity,
    options.provenance,
    options.label
  );
  assert.equal(
    options.value.provenanceSha256,
    provenanceSha256(options.provenance),
    `${options.label}: provenance digest drifted`
  );
  assert.match(
    options.value.producerReportSha256 as string,
    SHA256_PATTERN,
    `${options.label}: producer report SHA-256 is invalid`
  );
}

async function loadArtifactsInternal<TPayload extends CaliforniaVisualizationCoveragePassedPayload>(options: {
  expectedMatrix: ReadonlyMap<string, CaliforniaVisualizationCoverageExpectedArtifact>;
  ledgerRoot: string;
  producerState: "forbidden" | "required";
  producerSuccessReceipt?: CaliforniaVisualizationCoverageProducerSuccessReceipt;
  provenance: CaliforniaVisualizationCoverageRunIdentity;
  sealReceipt?: CaliforniaVisualizationCoverageSealReceipt;
  sealState: "forbidden" | "required";
  validatePayload(payload: TPayload): Promise<void> | void;
}) {
  const ledgerRoot = await assertStarshipLedgerRoot(options.ledgerRoot);
  const runDirectory = californiaVisualizationCoverageRunDirectory(
    ledgerRoot,
    options.provenance.matrixRunId
  );
  const runIdentity = await lstat(runDirectory);
  assert.ok(runIdentity.isDirectory() && !runIdentity.isSymbolicLink(),
    "California coverage run directory must be a regular non-symlink directory");
  assert.equal(await realpath(runDirectory), runDirectory,
    "California coverage run directory must not traverse a symlink");
  const entries = await readdir(runDirectory, { withFileTypes: true });
  const names = entries.map((entry) => entry.name);
  assert.ok(names.includes(CALIFORNIA_VISUALIZATION_COVERAGE_RUN_MANIFEST_FILENAME),
    "California coverage run lacks its exact manifest");
  if (options.sealState === "required") {
    assert.ok(names.includes(CALIFORNIA_VISUALIZATION_COVERAGE_RUN_SEAL_FILENAME),
      "California coverage run lacks its terminal seal");
    assert.ok(options.sealReceipt, "California coverage sealed loader requires an external seal receipt");
    assert.equal(options.sealReceipt.fileName, CALIFORNIA_VISUALIZATION_COVERAGE_RUN_SEAL_FILENAME,
      "California coverage external seal receipt names the wrong file");
    assert.match(options.sealReceipt.sha256, SHA256_PATTERN,
      "California coverage external seal receipt has an invalid SHA-256");
  } else {
    assert.equal(names.includes(CALIFORNIA_VISUALIZATION_COVERAGE_RUN_SEAL_FILENAME), false,
      "California coverage open-run loader refuses an already sealed run");
  }
  if (options.producerState === "required") {
    assert.ok(names.includes(CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME),
      "California coverage run lacks its producer process-success receipt");
    assert.ok(options.producerSuccessReceipt,
      "California coverage loader requires the external producer process-success receipt");
    assert.equal(
      options.producerSuccessReceipt.fileName,
      CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME,
      "California coverage external producer receipt names the wrong file"
    );
    assert.match(options.producerSuccessReceipt.sha256, SHA256_PATTERN,
      "California coverage external producer receipt has an invalid SHA-256");
  } else {
    assert.equal(names.includes(CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME), false,
      "California coverage open producer run already has a process-success receipt");
  }
  assertDirectoryEntries({
    allowProducerSuccess: options.producerState === "required",
    allowSeal: options.sealState === "required",
    entries
  });
  for (const entry of entries) {
    assert.ok(entry.isFile() && !entry.isSymbolicLink(),
      `${entry.name}: California coverage run entries must be regular non-symlink files`);
  }
  const expectedManifest = exactRunManifest(options);
  const manifest = await readJsonObject(
    path.join(runDirectory, CALIFORNIA_VISUALIZATION_COVERAGE_RUN_MANIFEST_FILENAME),
    "California coverage run manifest"
  );
  assertRunManifest(manifest.value, expectedManifest);
  let producerSuccess: ReadJsonResult | undefined;
  if (options.producerState === "required") {
    producerSuccess = await readJsonObject(
      path.join(runDirectory, CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME),
      "California coverage producer process-success receipt"
    );
    assert.equal(
      producerSuccess.sha256,
      options.producerSuccessReceipt!.sha256,
      "California coverage producer process-success receipt no longer matches its external receipt"
    );
    assertProducerSuccessRecord({
      expectedManifest,
      label: "California coverage producer process-success receipt",
      provenance: options.provenance,
      value: producerSuccess.value
    });
  }
  const expectedArtifacts = sortedExpectedArtifacts(options.expectedMatrix, options.provenance);
  const expectedNames = expectedArtifacts.map((artifact) => artifact.fileName).sort();
  const actualNames = entries
    .filter((entry) => entry.name.endsWith(CALIFORNIA_VISUALIZATION_COVERAGE_OFFICIAL_SUFFIX))
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(actualNames, expectedNames,
    "California coverage official files have a missing or extra project/package/repeat item");
  const expectedByName = new Map(expectedArtifacts.map((expected) => [expected.fileName, expected]));
  const loaded: CaliforniaVisualizationCoverageLoadedArtifact<TPayload>[] = [];
  for (const fileName of actualNames) {
    const read = await readJsonObject(path.join(runDirectory, fileName), fileName);
    const artifact = await assertLoadedOfficialArtifact<TPayload>({
      expected: expectedByName.get(fileName)!,
      fileName,
      provenance: options.provenance,
      validatePayload: options.validatePayload,
      value: read.value
    });
    loaded.push({ artifact, fileName, fileSha256: read.sha256 });
  }
  const logicalKeys = loaded.map(({ artifact }) => expectedMatrixKey({
    packageId: artifact.packageId,
    projectName: artifact.projectName,
    repeatEachIndex: artifact.execution.repeatEachIndex
  }));
  assert.equal(new Set(logicalKeys).size, logicalKeys.length,
    "California coverage official files contain a duplicate logical item");
  const loadedArtifactByteIdentities = exactArtifactByteIdentities(loaded);
  if (producerSuccess) {
    assertArtifactByteIdentities(
      producerSuccess.value.artifacts,
      "California coverage producer process-success receipt"
    );
    assert.deepEqual(
      producerSuccess.value.artifacts,
      loadedArtifactByteIdentities,
      "California coverage official artifact bytes no longer match producer process-success"
    );
  }
  if (options.sealState === "required") {
    const seal = await readJsonObject(
      path.join(runDirectory, CALIFORNIA_VISUALIZATION_COVERAGE_RUN_SEAL_FILENAME),
      "California coverage terminal seal"
    );
    assert.equal(seal.sha256, options.sealReceipt!.sha256,
      "California coverage terminal seal no longer matches its external receipt");
    assertExactKeys(seal.value, RUN_SEAL_KEYS, "California coverage terminal seal");
    assert.equal(seal.value.lifecycleSchemaVersion, CALIFORNIA_VISUALIZATION_COVERAGE_LIFECYCLE_VERSION,
      "California coverage terminal seal lifecycle schema drifted");
    assert.equal(seal.value.status, "sealed", "California coverage terminal seal is not terminal");
    assert.ok(typeof seal.value.sealedAt === "string" && !Number.isNaN(Date.parse(seal.value.sealedAt)),
      "California coverage terminal seal timestamp is invalid");
    assertRecord(seal.value.provenance, "California coverage terminal seal provenance");
    assertRunIdentity(
      seal.value.provenance as CaliforniaVisualizationCoverageRunIdentity,
      options.provenance,
      "California coverage terminal seal"
    );
    assert.equal(seal.value.provenanceSha256, provenanceSha256(options.provenance),
      "California coverage terminal seal provenance digest drifted");
    assert.equal(seal.value.expectedArtifactsSha256, expectedManifest.expectedArtifactsSha256,
      "California coverage terminal seal expected matrix digest drifted");
    assert.equal(seal.value.manifestSha256, manifest.sha256,
      "California coverage terminal seal does not bind the exact manifest bytes");
    assert.ok(producerSuccess,
      "California coverage terminal seal lacks its producer process-success record");
    assert.equal(
      seal.value.producerSuccessSha256,
      producerSuccess.sha256,
      "California coverage terminal seal does not bind the producer process-success bytes"
    );
    assert.equal(
      seal.value.producerReportSha256,
      producerSuccess.value.producerReportSha256,
      "California coverage terminal seal does not bind the producer Playwright report"
    );
    assert.ok(Array.isArray(seal.value.artifacts),
      "California coverage terminal seal artifacts must be an array");
    const sealedArtifacts = seal.value.artifacts as Array<Record<string, unknown>>;
    assertArtifactByteIdentities(sealedArtifacts, "California coverage terminal seal");
    assert.deepEqual(
      sealedArtifacts,
      producerSuccess.value.artifacts,
      "California coverage terminal seal does not bind the producer artifact byte identities"
    );
    assert.deepEqual(sealedArtifacts, loadedArtifactByteIdentities,
      "California coverage terminal seal file list or artifact SHA drifted");
  }
  return { loaded, manifest, producerSuccess, runDirectory };
}

export async function publishCaliforniaVisualizationCoverageProducerSuccess<
  TPayload extends CaliforniaVisualizationCoveragePassedPayload
>(options: {
  expectedMatrix: ReadonlyMap<string, CaliforniaVisualizationCoverageExpectedArtifact>;
  ledgerRoot: string;
  producerReportSha256: string;
  provenance: CaliforniaVisualizationCoverageRunIdentity;
  validatePayload(payload: TPayload): Promise<void> | void;
}) {
  assert.match(options.producerReportSha256, SHA256_PATTERN,
    "California coverage producer report requires one exact SHA-256");
  return withPublicationLock({
    ledgerRoot: options.ledgerRoot,
    matrixRunId: options.provenance.matrixRunId,
    async task() {
      const initialized = await initializeUnlocked(options);
      await assertRunUnsealed(initialized.runDirectory);
      const openRun = await loadArtifactsInternal<TPayload>({
        ...options,
        producerState: "forbidden",
        sealState: "forbidden"
      });
      verifyCaliforniaVisualizationCoverageArtifactMatrix({
        expectedMatrix: options.expectedMatrix,
        loaded: openRun.loaded,
        provenance: options.provenance
      });
      const manifest = exactRunManifest(options);
      const producerSuccess = {
        artifacts: exactArtifactByteIdentities(openRun.loaded),
        expectedArtifactsSha256: manifest.expectedArtifactsSha256,
        lifecycleSchemaVersion: CALIFORNIA_VISUALIZATION_COVERAGE_LIFECYCLE_VERSION,
        producerReportSha256: options.producerReportSha256,
        provenance: structuredClone(options.provenance),
        provenanceSha256: provenanceSha256(options.provenance),
        publishedAt: new Date().toISOString(),
        status: "producer-succeeded"
      } as const;
      assertProducerSuccessRecord({
        expectedManifest: manifest,
        label: "California coverage producer process-success publication",
        provenance: options.provenance,
        value: producerSuccess
      });
      const publication = await writeExclusiveJson(
        path.join(
          initialized.runDirectory,
          CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME
        ),
        producerSuccess
      );
      const receipt: CaliforniaVisualizationCoverageProducerSuccessReceipt = {
        fileName: CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME,
        sha256: publication.sha256
      };
      const reread = await loadArtifactsInternal<TPayload>({
        ...options,
        producerState: "required",
        producerSuccessReceipt: receipt,
        sealState: "forbidden"
      });
      verifyCaliforniaVisualizationCoverageArtifactMatrix({
        expectedMatrix: options.expectedMatrix,
        loaded: reread.loaded,
        provenance: options.provenance
      });
      return receipt;
    }
  });
}

export async function loadCaliforniaVisualizationCoverageSealedArtifacts<
  TPayload extends CaliforniaVisualizationCoveragePassedPayload
>(options: {
  expectedMatrix: ReadonlyMap<string, CaliforniaVisualizationCoverageExpectedArtifact>;
  ledgerRoot: string;
  producerSuccessReceipt: CaliforniaVisualizationCoverageProducerSuccessReceipt;
  provenance: CaliforniaVisualizationCoverageRunIdentity;
  sealReceipt: CaliforniaVisualizationCoverageSealReceipt;
  validatePayload(payload: TPayload): Promise<void> | void;
}) {
  const { loaded } = await loadArtifactsInternal<TPayload>({
    ...options,
    producerState: "required",
    sealState: "required"
  });
  return loaded;
}

export function verifyCaliforniaVisualizationCoverageArtifactMatrix<
  TPayload extends CaliforniaVisualizationCoveragePassedPayload
>(options: {
  expectedMatrix: ReadonlyMap<string, CaliforniaVisualizationCoverageExpectedArtifact>;
  loaded: readonly CaliforniaVisualizationCoverageLoadedArtifact<TPayload>[];
  provenance: CaliforniaVisualizationCoverageRunIdentity;
}) {
  const expected = sortedExpectedArtifacts(options.expectedMatrix, options.provenance);
  assert.equal(options.loaded.length, expected.length,
    "California coverage loaded artifact count does not match the exact matrix");
  const expectedByName = new Map(expected.map((artifact) => [artifact.fileName, artifact]));
  const logicalKeys = new Set<string>();
  const artifactIds = new Set<string>();
  for (const item of options.loaded) {
    const contract = expectedByName.get(item.fileName);
    assert.ok(contract, `${item.fileName}: unexpected official artifact`);
    assert.equal(item.artifact.artifactId, contract.artifactId,
      `${item.fileName}: artifactId drifted`);
    assertRunIdentity(item.artifact.provenance, options.provenance, item.fileName);
    assert.match(item.fileSha256, SHA256_PATTERN, `${item.fileName}: missing exact file SHA-256`);
    const key = expectedMatrixKey({
      packageId: item.artifact.packageId,
      projectName: item.artifact.projectName,
      repeatEachIndex: item.artifact.execution.repeatEachIndex
    });
    assert.ok(!logicalKeys.has(key), `${item.fileName}: duplicate logical item ${key}`);
    logicalKeys.add(key);
    assert.ok(!artifactIds.has(item.artifact.artifactId),
      `${item.fileName}: duplicate artifactId ${item.artifact.artifactId}`);
    artifactIds.add(item.artifact.artifactId);
  }
  assert.deepEqual([...options.loaded.map((item) => item.fileName)].sort(),
    expected.map((item) => item.fileName).sort(),
    "California coverage loaded matrix has missing or extra artifact files");
  return options.loaded.map((item) => item.artifact);
}

export async function sealCaliforniaVisualizationCoverageArtifactRun<
  TPayload extends CaliforniaVisualizationCoveragePassedPayload
>(options: {
  expectedMatrix: ReadonlyMap<string, CaliforniaVisualizationCoverageExpectedArtifact>;
  ledgerRoot: string;
  producerSuccessReceipt: CaliforniaVisualizationCoverageProducerSuccessReceipt;
  provenance: CaliforniaVisualizationCoverageRunIdentity;
  validateAggregate(
    artifacts: readonly CaliforniaVisualizationCoverageOfficialArtifact<TPayload>[]
  ): Promise<void> | void;
  validatePayload(payload: TPayload): Promise<void> | void;
}) {
  return withPublicationLock({
    ledgerRoot: options.ledgerRoot,
    matrixRunId: options.provenance.matrixRunId,
    async task() {
      const initialized = await initializeUnlocked(options);
      await assertRunUnsealed(initialized.runDirectory);
      const openRun = await loadArtifactsInternal<TPayload>({
        ...options,
        producerState: "required",
        sealState: "forbidden"
      });
      const artifacts = verifyCaliforniaVisualizationCoverageArtifactMatrix({
        expectedMatrix: options.expectedMatrix,
        loaded: openRun.loaded,
        provenance: options.provenance
      });
      await options.validateAggregate(artifacts);
      const manifest = exactRunManifest(options);
      assert.ok(openRun.producerSuccess,
        "California coverage finalizer requires a producer process-success record");
      const artifactByteIdentities = exactArtifactByteIdentities(openRun.loaded);
      assert.deepEqual(
        openRun.producerSuccess.value.artifacts,
        artifactByteIdentities,
        "California coverage finalizer refuses artifact bytes that drifted after producer success"
      );
      const seal: CaliforniaVisualizationCoverageRunSeal = {
        artifacts: artifactByteIdentities,
        expectedArtifactsSha256: manifest.expectedArtifactsSha256,
        lifecycleSchemaVersion: CALIFORNIA_VISUALIZATION_COVERAGE_LIFECYCLE_VERSION,
        manifestSha256: openRun.manifest.sha256,
        producerReportSha256: openRun.producerSuccess.value.producerReportSha256 as string,
        producerSuccessSha256: openRun.producerSuccess.sha256,
        provenance: structuredClone(options.provenance),
        provenanceSha256: provenanceSha256(options.provenance),
        sealedAt: new Date().toISOString(),
        status: "sealed"
      };
      const sealPublication = await writeExclusiveJson(
        path.join(openRun.runDirectory, CALIFORNIA_VISUALIZATION_COVERAGE_RUN_SEAL_FILENAME),
        seal
      );
      const sealReceipt: CaliforniaVisualizationCoverageSealReceipt = {
        fileName: CALIFORNIA_VISUALIZATION_COVERAGE_RUN_SEAL_FILENAME,
        sha256: sealPublication.sha256
      };
      const reloaded = await loadCaliforniaVisualizationCoverageSealedArtifacts<TPayload>({
        ...options,
        sealReceipt
      });
      const reloadedArtifacts = verifyCaliforniaVisualizationCoverageArtifactMatrix({
        expectedMatrix: options.expectedMatrix,
        loaded: reloaded,
        provenance: options.provenance
      });
      await options.validateAggregate(reloadedArtifacts);
      return {
        artifacts: reloadedArtifacts,
        sealReceipt
      };
    }
  });
}
