import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = realpathSync(path.join(scriptDirectory, ".."));
const fixtureParent = path.join(projectRoot, ".tmp");
const runnerPath = path.join(scriptDirectory, "run-signature-lab-tests.mjs");
const retainedEvidenceModulePath = path.join(
  scriptDirectory,
  "signature-lab-retained-evidence.mjs",
);
const retainedEvidenceModuleUrl = pathToFileURL(retainedEvidenceModulePath).href;

const PASS_RETAINED_SEALED_ARCHIVE = "PASS_RETAINED_SEALED_ARCHIVE";
const FAIL_RETAINED_SEALED_ARCHIVE = "FAIL_RETAINED_SEALED_ARCHIVE";
const FAIL_RETAINED_UNSEALED = "FAIL_RETAINED_UNSEALED";
const EXTERNAL_RECEIPT_SCHEMA =
  "ca.signature-lab.retained-external-receipt.v1";
const SIDECAR_PUBLICATION_SCHEMA =
  "ca.signature-lab.descriptor-sidecar-publication.v1";
const SIDECAR_REVALIDATION_SCHEMA =
  "ca.signature-lab.descriptor-sidecar-revalidation.v1";
const RETAINED_RUN_INSPECTION_SCHEMA =
  "ca.signature-lab.retained-run-inspection.v1";
const SIDECAR_BASENAMES = Object.freeze([
  "retained-manifest.json",
  "retained-report.json",
  "retained-seal.json",
]);
const STABLE_IDENTITY_KEYS = Object.freeze([
  "type",
  "dev",
  "ino",
  "uid",
  "gid",
  "mode",
  "nlink",
]);
const FULL_IDENTITY_KEYS = Object.freeze([
  ...STABLE_IDENTITY_KEYS,
  "size",
  "mtimeNs",
  "ctimeNs",
]);
const RETENTION_MARKER = "INTENTIONALLY_RETAINED_TEST_FIXTURE.json";
const STARSHIP_PREFIX = "/Volumes/Starship/";
const EXACT_ASSIGNMENT_ARCHIVE_BYTE_LENGTH = 57_499_068;
const MAX_RETAINED_WRITE_BYTES = 64 * 1024 * 1024;
const currentUid = process.getuid?.();

assert.ok(
  projectRoot.startsWith(STARSHIP_PREFIX),
  `contract fixtures must stay on Starship: ${projectRoot}`,
);

function modeBits(stat) {
  return Number(stat.mode & 0o7777n);
}

function normalizeIdentity(stat, type) {
  return {
    type,
    dev: stat.dev.toString(),
    ino: stat.ino.toString(),
    uid: Number(stat.uid),
    gid: Number(stat.gid),
    mode: modeBits(stat),
    nlink: Number(stat.nlink),
  };
}

function normalizeFullIdentity(stat, type) {
  return {
    ...normalizeIdentity(stat, type),
    size: stat.size.toString(),
    mtimeNs: stat.mtimeNs.toString(),
    ctimeNs: stat.ctimeNs.toString(),
  };
}

function assertExactKeys(value, expectedKeys, label) {
  assert.ok(
    value && typeof value === "object" && !Array.isArray(value),
    `${label} must be one object`,
  );
  assert.deepEqual(
    Object.keys(value).toSorted(),
    [...expectedKeys].toSorted(),
    `${label} exact key set drift`,
  );
}

function assertDeepFrozen(value, label, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true, `${label} must be deeply frozen`);
  for (const [key, child] of Object.entries(value)) {
    assertDeepFrozen(child, `${label}.${key}`, seen);
  }
}

function assertSha256(value, label) {
  assert.equal(typeof value, "string", `${label} must be a string`);
  assert.match(value, /^[0-9a-f]{64}$/u, `${label} must be lowercase SHA-256`);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function canonicalRecord(value, label = "record") {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    assert.equal(Number.isSafeInteger(value), true, `${label} must be a safe integer`);
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => canonicalRecord(entry, `${label}[${index}]`));
  }
  assert.ok(
    value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype,
    `${label} must be canonical JSON data`,
  );
  return Object.fromEntries(Object.keys(value).sort().map((key) => [
    key,
    canonicalRecord(value[key], `${label}.${key}`),
  ]));
}

function canonicalJsonBytes(value, label = "record") {
  return Buffer.from(`${JSON.stringify(canonicalRecord(value, label))}\n`, "utf8");
}

function canonicalJsonBodyBytes(value, label = "record") {
  return Buffer.from(JSON.stringify(canonicalRecord(value, label)), "utf8");
}

function decodeExecutionJournal(bytes) {
  const frames = [];
  let offset = 0;
  while (offset < bytes.length) {
    assert.ok(bytes.length - offset >= 4, "journal frame prefix is truncated");
    const length = bytes.readUInt32BE(offset);
    assert.ok(length >= 1 && length <= 1024 * 1024, "journal frame length drift");
    const end = offset + 4 + length + 32;
    assert.ok(end <= bytes.length, "journal frame body or digest is truncated");
    const prefix = bytes.subarray(offset, offset + 4);
    const bodyBytes = bytes.subarray(offset + 4, offset + 4 + length);
    const digestBytes = bytes.subarray(offset + 4 + length, end);
    const body = JSON.parse(bodyBytes.toString("utf8"));
    assert.deepEqual(
      bodyBytes,
      canonicalJsonBodyBytes(body, `journal frame ${frames.length}`),
      "journal frame body must be canonical JSON",
    );
    const digest = sha256(Buffer.concat([prefix, bodyBytes]));
    assert.equal(digestBytes.toString("hex"), digest, "journal frame digest drift");
    frames.push({ body, digest });
    offset = end;
  }
  assert.equal(offset, bytes.length, "journal must end on one complete frame");
  return frames;
}

function freezeDeep(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

function processDescriptorCount() {
  return readdirSync("/dev/fd").filter((name) => /^[0-9]+$/u.test(name)).length;
}

function assertSameObject(named, opened, targetPath) {
  assert.equal(
    named.dev,
    opened.dev,
    `opened device drifted from named path: ${targetPath}`,
  );
  assert.equal(
    named.ino,
    opened.ino,
    `opened inode drifted from named path: ${targetPath}`,
  );
  assert.equal(
    named.uid,
    opened.uid,
    `opened owner drifted from named path: ${targetPath}`,
  );
  assert.equal(
    named.nlink,
    opened.nlink,
    `opened link count drifted from named path: ${targetPath}`,
  );
}

function openBoundPhysical(targetPath, expectedType, expectedMode) {
  const named = lstatSync(targetPath, { bigint: true });
  assert.equal(
    named.isSymbolicLink(),
    false,
    `symbolic links are forbidden in retained fixtures: ${targetPath}`,
  );

  const descriptor = openSync(
    targetPath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  );
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    assertSameObject(named, opened, targetPath);

    if (expectedType === "directory") {
      assert.equal(opened.isDirectory(), true, `expected directory: ${targetPath}`);
    } else {
      assert.equal(opened.isFile(), true, `expected regular file: ${targetPath}`);
    }

    if (expectedMode !== undefined && expectedMode !== null) {
      assert.equal(
        modeBits(opened),
        expectedMode,
        `unexpected private mode for ${targetPath}`,
      );
    }
    if (currentUid !== undefined) {
      assert.equal(
        Number(opened.uid),
        currentUid,
        `retained fixture must be owned by the current uid: ${targetPath}`,
      );
    }

    return {
      descriptor,
      identity: normalizeIdentity(opened, expectedType),
    };
  } catch (error) {
    closeSync(descriptor);
    throw error;
  }
}

function assertPrivateDirectory(targetPath) {
  const opened = openBoundPhysical(targetPath, "directory", 0o700);
  closeSync(opened.descriptor);
  return opened.identity;
}

function readPhysicalFile(targetPath, expectedMode = 0o600) {
  const opened = openBoundPhysical(targetPath, "regular", expectedMode);
  try {
    return {
      bytes: readFileSync(opened.descriptor),
      identity: opened.identity,
    };
  } finally {
    closeSync(opened.descriptor);
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function writePrivateFile(targetPath, bytes) {
  writeFileSync(targetPath, bytes, { flag: "wx", mode: 0o600 });
  chmodSync(targetPath, 0o600);
  readPhysicalFile(targetPath);
}

function makePrivateDirectory(targetPath) {
  mkdirSync(targetPath, { mode: 0o700 });
  chmodSync(targetPath, 0o700);
  assertPrivateDirectory(targetPath);
}

function safeLabel(label) {
  return label.replaceAll(/[^a-z0-9-]+/giu, "-").replaceAll(/^-|-$/gu, "");
}

function createRetainedCase(testName) {
  const fixtureParentStat = lstatSync(fixtureParent, { bigint: true });
  assert.equal(fixtureParentStat.isDirectory(), true, fixtureParent);
  assert.equal(fixtureParentStat.isSymbolicLink(), false, fixtureParent);
  if (currentUid !== undefined) {
    assert.equal(Number(fixtureParentStat.uid), currentUid, fixtureParent);
  }

  const caseRoot = mkdtempSync(
    path.join(fixtureParent, `signature-lab-retained-${safeLabel(testName)}-`),
  );
  chmodSync(caseRoot, 0o700);
  assertPrivateDirectory(caseRoot);
  assert.ok(caseRoot.startsWith(STARSHIP_PREFIX), caseRoot);
  assert.equal(realpathSync(caseRoot), caseRoot, `case root is not canonical: ${caseRoot}`);

  const classification = {
    schemaVersion: "signature-lab-retained-contract-fixture.v1",
    classification: "INTENTIONALLY_RETAINED_SECURITY_TEST_EVIDENCE",
    testName,
    retainedRoot: caseRoot,
    destructiveCleanupAuthorized: false,
    cleanupPolicy: "RETAIN_DO_NOT_DELETE",
    createdAt: new Date().toISOString(),
    creatorPid: process.pid,
  };
  const markerPath = path.join(caseRoot, RETENTION_MARKER);
  writePrivateFile(markerPath, `${JSON.stringify(classification, null, 2)}\n`);

  return { caseRoot, markerPath, testName };
}

function diagnoseRetention(context, retainedCase, extra = {}) {
  context.diagnostic(
    JSON.stringify({
      classification: "INTENTIONALLY_RETAINED_SECURITY_TEST_EVIDENCE",
      retainedRoot: retainedCase.caseRoot,
      destructiveCleanupAuthorized: false,
      ...extra,
    }),
  );
}

function snapshotArchive(archiveRoot) {
  const expectedRootIdentity = assertPrivateDirectory(archiveRoot);
  const expectedEntries = [];

  function visit(directoryPath, relativeDirectory) {
    assertPrivateDirectory(directoryPath);
    const names = readdirSync(directoryPath).toSorted();
    for (const name of names) {
      assert.notEqual(name, "", "archive entry name must not be empty");
      assert.notEqual(name, ".", "archive entry name must not be dot");
      assert.notEqual(name, "..", "archive entry name must not be dot-dot");
      assert.equal(name.includes("/"), false, `invalid archive entry name: ${name}`);

      const entryPath = path.join(directoryPath, name);
      const relativePath = relativeDirectory
        ? `${relativeDirectory}/${name}`
        : name;
      const named = lstatSync(entryPath, { bigint: true });
      assert.equal(
        named.isSymbolicLink(),
        false,
        `archive symlink is forbidden: ${entryPath}`,
      );

      if (named.isDirectory()) {
        const identity = assertPrivateDirectory(entryPath);
        expectedEntries.push({ relativePath, ...identity });
        visit(entryPath, relativePath);
        continue;
      }

      assert.equal(named.isFile(), true, `archive special entry is forbidden: ${entryPath}`);
      const physical = readPhysicalFile(entryPath);
      expectedEntries.push({
        relativePath,
        ...physical.identity,
        byteLength: physical.bytes.byteLength,
        sha256: sha256(physical.bytes),
      });
    }
  }

  visit(archiveRoot, "");
  return {
    expectedRootIdentity,
    expectedEntries: expectedEntries.toSorted((left, right) =>
      left.relativePath.localeCompare(right.relativePath),
    ),
  };
}

function makeSealableArchive(context, label) {
  const retainedCase = createRetainedCase(label);
  const archiveRoot = path.join(retainedCase.caseRoot, "archive");
  const evidenceRoot = path.join(retainedCase.caseRoot, "external-evidence");
  makePrivateDirectory(archiveRoot);
  makePrivateDirectory(evidenceRoot);

  const guardPath = path.join(archiveRoot, "guard");
  makePrivateDirectory(guardPath);
  writePrivateFile(
    path.join(guardPath, "result.json"),
    `${JSON.stringify({ status: "PASS", label })}\n`,
  );
  writePrivateFile(path.join(archiveRoot, "stdout.log"), `retained ${label}\n`);

  const snapshot = snapshotArchive(archiveRoot);
  const provenance = {
    schemaVersion: "signature-lab-retained-provenance.v1",
    contractCase: label,
    runnerPath,
    runnerSha256: sha256(readPhysicalFile(runnerPath, null).bytes),
    nodeVersion: process.version,
  };

  diagnoseRetention(context, retainedCase, { archiveRoot, evidenceRoot });
  return {
    ...retainedCase,
    archiveRoot,
    evidenceRoot,
    provenance,
    ...snapshot,
  };
}

function expectedSealArguments(fixture) {
  return {
    archiveRoot: fixture.archiveRoot,
    expectedRootIdentity: fixture.expectedRootIdentity,
    expectedEntries: fixture.expectedEntries,
    evidenceRoot: fixture.evidenceRoot,
    outcome: PASS_RETAINED_SEALED_ARCHIVE,
    provenance: fixture.provenance,
  };
}

async function loadRetainedEvidenceCapability() {
  let capability;
  try {
    capability = await import(retainedEvidenceModuleUrl);
  } catch (error) {
    assert.fail(
      `retained evidence module capability unavailable at ${retainedEvidenceModulePath}: ${error?.code ?? error?.name ?? "UNKNOWN"}: ${error?.message ?? String(error)}`,
    );
  }

  assert.equal(
    typeof capability.sealRetainedSignatureLabEvidence,
    "function",
    "sealRetainedSignatureLabEvidence export is required",
  );
  assert.equal(
    typeof capability.revalidateRetainedSignatureLabEvidence,
    "function",
    "revalidateRetainedSignatureLabEvidence export is required",
  );
  return capability;
}

async function loadRetainedRunCapability() {
  const capability = await loadRetainedEvidenceCapability();
  for (const exportName of [
    "createRetainedSignatureLabRun",
    "createRetainedSignatureLabDirectory",
    "writeRetainedSignatureLabFile",
  ]) {
    assert.equal(
      typeof capability[exportName],
      "function",
      `${exportName} export is required for held-root archive construction`,
    );
  }
  return capability;
}

async function loadRetainedRunLifecycleCapability() {
  const capability = await loadRetainedRunCapability();
  for (const exportName of [
    "inspectRetainedSignatureLabRun",
    "closeRetainedSignatureLabRun",
  ]) {
    assert.equal(
      typeof capability[exportName],
      "function",
      `${exportName} export is required for explicit retained-run lifecycle`,
    );
  }
  return capability;
}

function assertExactDescendant(targetPath, expectedParent) {
  assert.equal(path.isAbsolute(targetPath), true, `expected absolute path: ${targetPath}`);
  const canonicalParent = realpathSync(expectedParent);
  const canonicalTarget = realpathSync(targetPath);
  const relative = path.relative(canonicalParent, canonicalTarget);
  assert.notEqual(relative, "", `expected child, received parent: ${targetPath}`);
  assert.equal(
    relative === ".." || relative.startsWith(`..${path.sep}`),
    false,
    `path escaped expected parent: ${targetPath}`,
  );
  assert.equal(path.isAbsolute(relative), false, `path escaped expected parent: ${targetPath}`);
}

function parsePrivateJson(targetPath) {
  const physical = readPhysicalFile(targetPath);
  return {
    bytes: physical.bytes,
    identity: physical.identity,
    value: JSON.parse(physical.bytes.toString("utf8")),
  };
}

function assertSealedResult(result, fixture) {
  assertExactKeys(result, [
    "archiveRoot",
    "destructiveCleanupAttempted",
    "externalReceipt",
    "manifestPath",
    "manifestSha256",
    "outcome",
    "reportPath",
    "reportSha256",
    "retainedArchiveCount",
    "sealPath",
    "sealSha256",
    "treeDigestSha256",
  ], "sealed result");
  assert.equal(Object.isFrozen(result), true, "sealed result must be frozen");
  assert.equal(result.outcome, PASS_RETAINED_SEALED_ARCHIVE);
  assert.ok(
    Number.isInteger(result.retainedArchiveCount) && result.retainedArchiveCount >= 1,
    `invalid retainedArchiveCount: ${result.retainedArchiveCount}`,
  );
  assert.equal(result.destructiveCleanupAttempted, false);
  for (const [field, value] of [
    ["manifestSha256", result.manifestSha256],
    ["reportSha256", result.reportSha256],
    ["sealSha256", result.sealSha256],
    ["treeDigestSha256", result.treeDigestSha256],
  ]) {
    assertSha256(value, `sealed result ${field}`);
  }

  const artifactPaths = [result.manifestPath, result.sealPath, result.reportPath];
  assert.equal(new Set(artifactPaths).size, 3, "seal artifacts must use distinct paths");
  for (const artifactPath of artifactPaths) {
    assert.equal(typeof artifactPath, "string");
    assertExactDescendant(artifactPath, fixture.evidenceRoot);
    readPhysicalFile(artifactPath);
  }

  const archiveToEvidence = path.relative(fixture.archiveRoot, fixture.evidenceRoot);
  assert.equal(
    archiveToEvidence === "" ||
      (archiveToEvidence !== ".." && !archiveToEvidence.startsWith(`..${path.sep}`)),
    false,
    "evidence root must remain external to the retained archive",
  );

  const manifest = parsePrivateJson(result.manifestPath);
  assert.equal(manifest.value.archiveRoot, fixture.archiveRoot);
  assert.deepEqual(manifest.value.expectedRootIdentity, fixture.expectedRootIdentity);
  assert.deepEqual(manifest.value.expectedEntries, fixture.expectedEntries);
  assert.deepEqual(manifest.value.provenance, fixture.provenance);

  const report = parsePrivateJson(result.reportPath);
  assert.equal(report.value.outcome, PASS_RETAINED_SEALED_ARCHIVE);
  assert.ok(report.value.retainedArchiveCount >= 1);
  assert.equal(report.value.destructiveCleanupAttempted, false);
  assert.equal(report.value.archiveRoot, fixture.archiveRoot);

  const seal = parsePrivateJson(result.sealPath);
  assert.equal(seal.value.manifestSha256, sha256(manifest.bytes));
  assert.equal(seal.value.reportSha256, sha256(report.bytes));
  assert.equal(result.manifestSha256, sha256(manifest.bytes));
  assert.equal(result.reportSha256, sha256(report.bytes));
  assert.equal(result.sealSha256, sha256(seal.bytes));
  assert.ok(
    result.externalReceipt && typeof result.externalReceipt === "object",
    "sealed result must carry its external receipt",
  );

  return {
    manifestBytes: manifest.bytes,
    sealBytes: seal.bytes,
    reportBytes: report.bytes,
  };
}

function assertSealArtifactsUnchanged(result, before) {
  assert.deepEqual(readPhysicalFile(result.manifestPath).bytes, before.manifestBytes);
  assert.deepEqual(readPhysicalFile(result.sealPath).bytes, before.sealBytes);
  assert.deepEqual(readPhysicalFile(result.reportPath).bytes, before.reportBytes);
}

function assertReceiptIdentity(actual, targetPath, expectedType) {
  assertExactKeys(actual, FULL_IDENTITY_KEYS, `external receipt identity ${targetPath}`);
  const named = lstatSync(targetPath, { bigint: true });
  assert.equal(named.isSymbolicLink(), false, targetPath);
  assert.equal(
    expectedType === "directory" ? named.isDirectory() : named.isFile(),
    true,
    targetPath,
  );
  assert.deepEqual(
    actual,
    normalizeFullIdentity(named, expectedType),
    `external receipt full identity drift for ${targetPath}`,
  );
}

function assertExternalReceipt(result, evidenceRoot) {
  const receipt = result.externalReceipt;
  assertExactKeys(receipt, [
    "evidenceRoot",
    "evidenceRootIdentity",
    "helperProvenance",
    "schemaVersion",
    "sidecars",
  ], "externalReceipt");
  assert.equal(receipt.schemaVersion, EXTERNAL_RECEIPT_SCHEMA);
  assert.equal(receipt.evidenceRoot, evidenceRoot);
  assertReceiptIdentity(receipt.evidenceRootIdentity, evidenceRoot, "directory");
  assert.ok(Array.isArray(receipt.sidecars), "externalReceipt.sidecars must be an array");

  const expected = [
    [SIDECAR_BASENAMES[0], result.manifestPath],
    [SIDECAR_BASENAMES[1], result.reportPath],
    [SIDECAR_BASENAMES[2], result.sealPath],
  ];
  assert.deepEqual(
    receipt.sidecars.map((entry) => entry.basename),
    SIDECAR_BASENAMES,
    "external receipt must bind the exact ordered sidecar basename inventory",
  );
  for (let index = 0; index < expected.length; index += 1) {
    const [basename, sidecarPath] = expected[index];
    const entry = receipt.sidecars[index];
    assertExactKeys(entry, [
      "basename",
      "byteLength",
      "identity",
      "sha256",
    ], `externalReceipt.sidecars[${index}]`);
    assert.equal(entry.basename, basename);
    assertReceiptIdentity(entry.identity, sidecarPath, "regular");
    const bytes = readPhysicalFile(sidecarPath).bytes;
    assert.equal(entry.byteLength, bytes.byteLength);
    assert.ok(Number.isSafeInteger(entry.byteLength) && entry.byteLength >= 0);
    assertSha256(entry.sha256, `externalReceipt ${basename} sha256`);
    assert.equal(entry.sha256, sha256(bytes));
  }

  assertExactKeys(receipt.helperProvenance, [
    "publication",
    "python",
    "revalidation",
  ], "externalReceipt.helperProvenance");
  const python = receipt.helperProvenance.python;
  assertExactKeys(python, ["identity", "path", "sha256"],
    "externalReceipt.helperProvenance.python");
  assert.equal(python.path, "/usr/bin/python3");
  assertReceiptIdentity(python.identity, python.path, "regular");
  assertSha256(python.sha256, "externalReceipt helper Python sha256");
  const pythonDescriptor = openSync(
    python.path,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  );
  try {
    const opened = fstatSync(pythonDescriptor, { bigint: true });
    const named = lstatSync(python.path, { bigint: true });
    assertSameObject(named, opened, python.path);
    assert.equal(python.sha256, sha256(readFileSync(pythonDescriptor)));
  } finally {
    closeSync(pythonDescriptor);
  }

  for (const [label, helper, expectedSchema] of [
    ["publication", receipt.helperProvenance.publication, SIDECAR_PUBLICATION_SCHEMA],
    ["revalidation", receipt.helperProvenance.revalidation, SIDECAR_REVALIDATION_SCHEMA],
  ]) {
    assertExactKeys(helper, ["schemaVersion", "sourceSha256"],
      `externalReceipt helper ${label}`);
    assert.equal(helper.schemaVersion, expectedSchema);
    assertSha256(helper.sourceSha256, `externalReceipt helper ${label} sourceSha256`);
  }
  assertDeepFrozen(receipt, "externalReceipt");
  return receipt;
}

function assertStableIdentityRecord(actual, targetPath, expectedType, label) {
  assertExactKeys(actual, STABLE_IDENTITY_KEYS, `${label}.identity`);
  const named = lstatSync(targetPath, { bigint: true });
  assert.equal(named.isSymbolicLink(), false, `${label} target must be physical`);
  assert.equal(
    expectedType === "directory" ? named.isDirectory() : named.isFile(),
    true,
    `${label} target type drift`,
  );
  assert.deepEqual(actual, normalizeIdentity(named, expectedType), `${label} identity drift`);
}

function assertDirectoryPublicationRecord(actual, runInfo, relativePath) {
  assertExactKeys(actual, ["identity", "path", "relativePath"],
    "retained directory publication record");
  assertDeepFrozen(actual, "retained directory publication record");
  const expectedPath = path.join(runInfo.archiveRoot, ...relativePath.split("/"));
  assert.equal(actual.relativePath, relativePath);
  assert.equal(actual.path, expectedPath);
  assertStableIdentityRecord(actual.identity, expectedPath, "directory",
    "retained directory publication record");
}

function assertFilePublicationRecord(actual, runInfo, relativePath, expectedBytes) {
  assertExactKeys(actual, [
    "byteLength",
    "identity",
    "path",
    "relativePath",
    "sha256",
  ], "retained file publication record");
  assertDeepFrozen(actual, "retained file publication record");
  const expectedPath = path.join(runInfo.archiveRoot, ...relativePath.split("/"));
  assert.equal(actual.relativePath, relativePath);
  assert.equal(actual.path, expectedPath);
  assert.equal(actual.byteLength, expectedBytes.byteLength);
  assertSha256(actual.sha256, "retained file publication record sha256");
  assert.equal(actual.sha256, sha256(expectedBytes));
  assertStableIdentityRecord(actual.identity, expectedPath, "regular",
    "retained file publication record");
  assert.deepEqual(readPhysicalFile(expectedPath).bytes, expectedBytes);
}

function assertRunInspection(actual, runInfo, expectedState) {
  assertExactKeys(actual, [
    "archiveRoot",
    "bound",
    "destructiveCleanupAttempted",
    "evidenceRoot",
    "retainedArchiveCount",
    "runRoot",
    "schemaVersion",
    "state",
  ], "retained run inspection");
  assertDeepFrozen(actual, "retained run inspection");
  assert.equal(actual.schemaVersion, RETAINED_RUN_INSPECTION_SCHEMA);
  assert.equal(actual.state, expectedState);
  assert.equal(actual.bound, expectedState === "OPEN");
  assert.equal(actual.runRoot, runInfo.runRoot);
  assert.equal(actual.archiveRoot, runInfo.archiveRoot);
  assert.equal(actual.evidenceRoot, runInfo.evidenceRoot);
  assert.equal(actual.retainedArchiveCount, 1);
  assert.equal(actual.destructiveCleanupAttempted, false);
  return actual;
}

async function invokeReplacementBoundOperation(operation) {
  try {
    await operation();
    return { rejected: false, error: null };
  } catch (error) {
    assert.match(
      `${error?.code ?? ""} ${error?.message ?? String(error)}`,
      /bound|descriptor|drift|identity|namespace|replace|root|safe|ENOENT/iu,
      "replacement must fail closed with an identity or descriptor safety error",
    );
    return { rejected: true, error };
  }
}

async function createOpaqueRun(capability, retainedCase, label, context) {
  assert.equal(
    typeof context?.after,
    "function",
    "opaque retained-run tests must register exact worker teardown immediately",
  );
  assert.equal(
    typeof capability.closeRetainedSignatureLabRun,
    "function",
    "opaque retained-run tests require the exact lifecycle close capability",
  );
  const beforeNames = new Set(readdirSync(retainedCase.caseRoot));
  const classification = {
    schemaVersion: "ca.signature-lab.retained-run-classification.v1",
    classification: "INTENTIONALLY_RETAINED_SIGNATURE_LAB_EVIDENCE",
    state: "STARTED_UNSEALED",
    label,
    retainedArchiveCount: 1,
    destructiveCleanupAttempted: false,
    policy: "RETAIN_DO_NOT_DELETE",
  };
  const run = await capability.createRetainedSignatureLabRun({
    scratchParent: retainedCase.caseRoot,
    classification,
  });
  context.after(async () => {
    await capability.closeRetainedSignatureLabRun(run);
  });
  assert.ok(
    run && ["object", "function", "symbol"].includes(typeof run),
    "createRetainedSignatureLabRun must return an opaque capability token",
  );
  assert.notEqual(typeof run, "string", "run capability must not be a pathname");
  assert.equal(Buffer.isBuffer(run), false, "run capability must not be path bytes");

  const createdNames = readdirSync(retainedCase.caseRoot)
    .filter((name) => !beforeNames.has(name));
  assert.equal(createdNames.length, 1, "run creation must publish one private run root");
  const runRoot = path.join(retainedCase.caseRoot, createdNames[0]);
  assertPrivateDirectory(runRoot);
  const archiveRoot = path.join(runRoot, "archive");
  const evidenceRoot = path.join(runRoot, "external-evidence");
  assertPrivateDirectory(archiveRoot);
  assertPrivateDirectory(evidenceRoot);
  assertExactKeys(run, ["archiveRoot", "evidenceRoot", "runRoot"],
    "opaque retained-run token metadata");
  assertDeepFrozen(run, "opaque retained-run token metadata");
  assert.equal(run.runRoot, runRoot);
  assert.equal(run.archiveRoot, archiveRoot);
  assert.equal(run.evidenceRoot, evidenceRoot);
  return { run, runRoot, archiveRoot, evidenceRoot, classification };
}

async function assertSafetyRejection(operation) {
  await assert.rejects(async () => {
    await operation();
  });
}

async function captureRejection(operation) {
  try {
    await operation();
    return null;
  } catch (error) {
    return error;
  }
}

async function initializeOneGateExecutionJournal(capability, runInfo, gateId) {
  const plannedGates = [{ ordinal: 1, gateId }];
  return capability.initializeRetainedSignatureLabExecutionJournal(
    runInfo.run,
    {
      relativePath: "executions/execution-journal.v1.bin",
      planSha256: sha256(canonicalJsonBytes(plannedGates, `${gateId} plan`)),
      plannedGates,
    },
  );
}

async function appendOneGateStarted(capability, runInfo, gateId, gateDirectory) {
  const attemptBytes = canonicalJsonBytes({
    schemaVersion: "ca.signature-lab.execution-attempt.v1",
    gateId,
    ordinal: 1,
    status: "STARTED",
  }, `${gateId} attempt`);
  return capability.appendRetainedSignatureLabExecutionJournal(
    runInfo.run,
    {
      eventType: "STARTED",
      ordinal: 1,
      gateId,
      attempt: {
        relativePath: `${gateDirectory}/attempt.json`,
        bytes: attemptBytes,
      },
    },
  );
}

function oneGateResultEvent(gateId, gateDirectory, overrides = {}) {
  const stdoutBytes = Buffer.from(`${gateId} output\n`, "utf8");
  const stderrBytes = Buffer.alloc(0);
  const status = overrides.status ?? "PASS";
  const exitCode = Object.hasOwn(overrides, "exitCode") ? overrides.exitCode : 0;
  const signal = Object.hasOwn(overrides, "signal") ? overrides.signal : null;
  const resultBytes = canonicalJsonBytes({
    schemaVersion: "ca.signature-lab.execution-result.v1",
    gateId,
    ordinal: 1,
    status,
    exitCode,
    signal,
  }, `${gateId} result`);
  return {
    eventType: "RESULT",
    ordinal: 1,
    gateId,
    status,
    exitCode,
    signal,
    stdout: {
      relativePath: `${gateDirectory}/stdout.bin`,
      bytes: stdoutBytes,
    },
    stderr: {
      relativePath: `${gateDirectory}/stderr.bin`,
      bytes: stderrBytes,
    },
    result: {
      relativePath: `${gateDirectory}/result.json`,
      bytes: resultBytes,
    },
  };
}

async function loadArtifactReplacementFaultCapability(retainedCase) {
  const moduleSource = readFileSync(retainedEvidenceModulePath, "utf8");
  const needle = [
    "    batch_result = perform_worker_batch(",
    "        prepared_event[\"batch\"], prepared_event[\"prepared\"])",
    "    files_by_role = {}",
  ].join("\n");
  assert.equal(
    moduleSource.split(needle).length,
    2,
    "fault fixture requires one exact artifact-batch/journal-append barrier",
  );
  const replacement = [
    "    batch_result = perform_worker_batch(",
    "        prepared_event[\"batch\"], prepared_event[\"prepared\"])",
    "    fault_relative = prepared_event[\"prepared\"][\"metadata\"][0][\"relativePath\"]",
    "    fault_parked = fault_relative + \".fault-original\"",
    "    os.rename(fault_relative, fault_parked,",
    "              src_dir_fd=ROOT_FD, dst_dir_fd=ROOT_FD)",
    "    fault_flags = os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW",
    "    if hasattr(os, \"O_CLOEXEC\"):",
    "        fault_flags |= os.O_CLOEXEC",
    "    fault_descriptor = os.open(fault_relative, fault_flags, 0o600,",
    "                               dir_fd=ROOT_FD)",
    "    try:",
    "        os.fchmod(fault_descriptor, 0o600)",
    "        write_all(fault_descriptor,",
    "                  b\"FAULT_REPLACEMENT_AFTER_BATCH_FINAL_BINDING\\n\")",
    "        os.fsync(fault_descriptor)",
    "    finally:",
    "        os.close(fault_descriptor)",
    "    files_by_role = {}",
  ].join("\n");
  const faultSource = moduleSource.replace(needle, replacement);
  const faultModulePath = path.join(
    retainedCase.caseRoot,
    "signature-lab-retained-evidence-artifact-replacement-fault.mjs",
  );
  writePrivateFile(faultModulePath, Buffer.from(faultSource, "utf8"));
  const capability = await import(pathToFileURL(faultModulePath).href);
  return {
    capability,
    faultModulePath,
    faultModuleSha256: sha256(Buffer.from(faultSource, "utf8")),
  };
}

async function collectRejectedArchiveInvariant({
  failures,
  label,
  runInfo,
  operation,
  errorPattern,
}) {
  const before = snapshotArchive(runInfo.archiveRoot);
  const error = await captureRejection(operation);
  if (error === null) {
    failures.push(`${label}: operation unexpectedly acknowledged`);
  } else if (!errorPattern.test(error.message ?? String(error))) {
    failures.push(
      `${label}: rejection did not expose the exact policy (${error.message ?? String(error)})`,
    );
  }
  try {
    assert.deepEqual(
      snapshotArchive(runInfo.archiveRoot),
      before,
      `${label}: rejected request changed the retained archive`,
    );
  } catch (archiveError) {
    failures.push(archiveError.message ?? String(archiveError));
  }
}

function assertPathMissing(targetPath) {
  assert.throws(
    () => lstatSync(targetPath),
    (error) => error?.code === "ENOENT",
    `expected path to be absent from the archive namespace: ${targetPath}`,
  );
}

function assertArchiveDurabilitySourceContract(moduleSource) {
  assert.match(
    moduleSource,
    /os\.fsync\(classification_fd\)[\s\S]{0,1000}?os\.fsync\(archive_fd\)[\s\S]{0,200}?os\.fsync\(evidence_fd\)[\s\S]{0,200}?os\.fsync\(run_fd\)[\s\S]{0,200}?os\.fsync\(ROOT_FD\)/u,
    "STARTED_UNSEALED classification and created directory chain must be durable",
  );
  assert.match(
    moduleSource,
    /os\.fsync\(file_fd\)[\s\S]{0,1400}?for record in reversed\(opened_directories\):[\s\S]{0,200}?os\.fsync\(record\["descriptor"\]\)[\s\S]{0,200}?os\.fsync\(ROOT_FD\)/u,
    "archive writes must fsync the file and directory chain bottom-up",
  );
  assert.match(
    moduleSource,
    /for observed in file_records:[\s\S]{0,200}?os\.fsync\(observed\["descriptor"\]\)[\s\S]{0,200}?for observed in reversed\(directory_records\):[\s\S]{0,200}?os\.fsync\(observed\["descriptor"\]\)/u,
    "seal inventory must durably fsync files and directories bottom-up",
  );
  assert.match(
    moduleSource,
    /write_all\(descriptor, data\)[\s\S]{0,200}?os\.fsync\(descriptor\)[\s\S]{0,1800}?os\.fsync\(ROOT_FD\)/u,
    "external sidecars and their evidence directory must be durable",
  );
}

test("signature lab runner uses only truthful retained-archive outcomes", () => {
  const source = readPhysicalFile(runnerPath, null).bytes.toString("utf8");

  assert.doesNotMatch(source, /signature-lab-exact-remove/u);
  assert.doesNotMatch(source, /clang|codesign|CoreServices/u);
  assert.doesNotMatch(
    source,
    /\b(?:rm(?:Sync)?|unlink(?:Sync)?|rmdir(?:Sync)?)\b/u,
  );
  assert.match(
    source,
    /from\s+["'][^"']*signature-lab-retained-evidence\.mjs["']/u,
  );
  assert.match(source, /\bsealRetainedSignatureLabEvidence\b/u);
  assert.match(source, /\brevalidateRetainedSignatureLabEvidence\b/u);

  for (const outcome of [
    PASS_RETAINED_SEALED_ARCHIVE,
    FAIL_RETAINED_SEALED_ARCHIVE,
    FAIL_RETAINED_UNSEALED,
  ]) {
    assert.match(source, new RegExp(`["']${outcome}["']`, "u"));
  }

  assert.match(source, /\bdestructiveCleanupAttempted\s*:\s*false\b/u);
  assert.doesNotMatch(source, /\bdestructiveCleanupAttempted\s*:\s*true\b/u);
  assert.match(source, /\bretainedArchiveCount\b/u);
  assert.ok(
    /retainedArchiveCount\s*:\s*[1-9][0-9]*/u.test(source) ||
      /retainedArchiveCount\s*(?:>=\s*1|>\s*0|<\s*1|===?\s*0)/u.test(source),
    "runner must prove retainedArchiveCount is at least one",
  );
});

test(
  "retained evidence module exposes sealing and revalidation capabilities",
  async (context) => {
    const retainedCase = createRetainedCase("missing-capability-red");
    diagnoseRetention(context, retainedCase, {
      expectedModulePath: retainedEvidenceModulePath,
      expectedFailure: "MISSING_MODULE_OR_EXPORT_CAPABILITY",
    });
    await loadRetainedEvidenceCapability();
  },
);

test("clean private archive seals externally and remains byte-identical", async (context) => {
  const fixture = makeSealableArchive(context, "clean-archive");
  const capability = await loadRetainedEvidenceCapability();
  const before = snapshotArchive(fixture.archiveRoot);

  const result = await capability.sealRetainedSignatureLabEvidence(
    expectedSealArguments(fixture),
  );
  assertSealedResult(result, fixture);
  assert.deepEqual(snapshotArchive(fixture.archiveRoot), before);

  const revalidated = await capability.revalidateRetainedSignatureLabEvidence({
    manifestPath: result.manifestPath,
    sealPath: result.sealPath,
    reportPath: result.reportPath,
    externalReceipt: result.externalReceipt,
  });
  assert.equal(revalidated.valid, true);
  assert.equal(revalidated.outcome, PASS_RETAINED_SEALED_ARCHIVE);
  assert.ok(revalidated.retainedArchiveCount >= 1);
  assert.equal(revalidated.destructiveCleanupAttempted, false);
  assert.deepEqual(snapshotArchive(fixture.archiveRoot), before);
});

test("root replacement fails before seal and preserves both archives", async (context) => {
  const fixture = makeSealableArchive(context, "root-replacement");
  const expectedOriginal = snapshotArchive(fixture.archiveRoot);
  const parkedOriginal = path.join(fixture.caseRoot, "archive-original-parked");
  const preparedReplacement = path.join(fixture.caseRoot, "archive-replacement-prepared");
  makePrivateDirectory(preparedReplacement);
  writePrivateFile(
    path.join(preparedReplacement, "replacement.txt"),
    "replacement root must survive\n",
  );

  renameSync(fixture.archiveRoot, parkedOriginal);
  renameSync(preparedReplacement, fixture.archiveRoot);
  const capability = await loadRetainedEvidenceCapability();

  await assertSafetyRejection(() =>
    capability.sealRetainedSignatureLabEvidence(expectedSealArguments(fixture)),
  );

  assert.deepEqual(snapshotArchive(parkedOriginal), expectedOriginal);
  assert.equal(
    readPhysicalFile(path.join(fixture.archiveRoot, "replacement.txt")).bytes.toString(
      "utf8",
    ),
    "replacement root must survive\n",
  );
  assert.deepEqual(readdirSync(fixture.evidenceRoot), []);
});

test(
  "intermediate replacement fails before seal and preserves both directories",
  async (context) => {
    const fixture = makeSealableArchive(context, "intermediate-replacement");
    const guardPath = path.join(fixture.archiveRoot, "guard");
    const parkedOriginal = path.join(fixture.caseRoot, "guard-original-parked");
    const preparedReplacement = path.join(
      fixture.caseRoot,
      "guard-replacement-prepared",
    );
    makePrivateDirectory(preparedReplacement);
    writePrivateFile(
      path.join(preparedReplacement, "result.json"),
      '{"status":"REPLACEMENT_MUST_SURVIVE"}\n',
    );

    renameSync(guardPath, parkedOriginal);
    renameSync(preparedReplacement, guardPath);
    const capability = await loadRetainedEvidenceCapability();

    await assertSafetyRejection(() =>
      capability.sealRetainedSignatureLabEvidence(expectedSealArguments(fixture)),
    );

    assert.equal(
      readPhysicalFile(path.join(parkedOriginal, "result.json")).bytes.toString("utf8"),
      '{"status":"PASS","label":"intermediate-replacement"}\n',
    );
    assert.equal(
      readPhysicalFile(path.join(guardPath, "result.json")).bytes.toString("utf8"),
      '{"status":"REPLACEMENT_MUST_SURVIVE"}\n',
    );
    assert.deepEqual(readdirSync(fixture.evidenceRoot), []);
  },
);

test(
  "post-seal byte add remove and replace drift rejects without deleting evidence",
  async (context) => {
    const capability = await loadRetainedEvidenceCapability();
    const attacks = [
      {
        label: "post-seal-byte",
        mutate(fixture) {
          const targetPath = path.join(fixture.archiveRoot, "guard", "result.json");
          writeFileSync(targetPath, '{"status":"MUTATED_AND_RETAINED"}\n');
          chmodSync(targetPath, 0o600);
          return () => {
            assert.equal(
              readPhysicalFile(targetPath).bytes.toString("utf8"),
              '{"status":"MUTATED_AND_RETAINED"}\n',
            );
          };
        },
      },
      {
        label: "post-seal-add",
        mutate(fixture) {
          const addedPath = path.join(fixture.archiveRoot, "guard", "added.txt");
          writePrivateFile(addedPath, "added bytes remain retained\n");
          return () => {
            assert.equal(
              readPhysicalFile(addedPath).bytes.toString("utf8"),
              "added bytes remain retained\n",
            );
          };
        },
      },
      {
        label: "post-seal-remove",
        mutate(fixture) {
          const targetPath = path.join(fixture.archiveRoot, "guard", "result.json");
          const parkedPath = path.join(fixture.caseRoot, "removed-result-original-parked.json");
          renameSync(targetPath, parkedPath);
          return () => {
            assertPathMissing(targetPath);
            assert.equal(
              readPhysicalFile(parkedPath).bytes.toString("utf8"),
              '{"status":"PASS","label":"post-seal-remove"}\n',
            );
          };
        },
      },
      {
        label: "post-seal-replace",
        mutate(fixture) {
          const targetPath = path.join(fixture.archiveRoot, "guard", "result.json");
          const parkedPath = path.join(fixture.caseRoot, "replaced-result-original-parked.json");
          renameSync(targetPath, parkedPath);
          writePrivateFile(targetPath, '{"status":"REPLACEMENT_RETAINED"}\n');
          return () => {
            assert.equal(
              readPhysicalFile(parkedPath).bytes.toString("utf8"),
              '{"status":"PASS","label":"post-seal-replace"}\n',
            );
            assert.equal(
              readPhysicalFile(targetPath).bytes.toString("utf8"),
              '{"status":"REPLACEMENT_RETAINED"}\n',
            );
          };
        },
      },
    ];

    for (const attack of attacks) {
      const fixture = makeSealableArchive(context, attack.label);
      const result = await capability.sealRetainedSignatureLabEvidence(
        expectedSealArguments(fixture),
      );
      const sealedArtifacts = assertSealedResult(result, fixture);
      const assertMutationSurvives = attack.mutate(fixture);

      await assertSafetyRejection(() =>
        capability.revalidateRetainedSignatureLabEvidence({
          manifestPath: result.manifestPath,
          sealPath: result.sealPath,
          reportPath: result.reportPath,
          externalReceipt: result.externalReceipt,
        }),
      );

      assertPrivateDirectory(fixture.archiveRoot);
      assertMutationSurvives();
      assertSealArtifactsUnchanged(result, sealedArtifacts);
    }
  },
);

test(
  "P1 retained evidence review: archive construction is descriptor anchored",
  async (context) => {
    const rootReplacementCase = createRetainedCase("p1-run-root-replacement");
    const intermediateCase = createRetainedCase("p1-run-intermediate-replacement");
    const opaqueSealCase = createRetainedCase("p1-opaque-run-seal");
    diagnoseRetention(context, rootReplacementCase, {
      attack: "SAME_NAME_RUN_ROOT_REPLACEMENT",
    });
    diagnoseRetention(context, intermediateCase, {
      attack: "SAME_NAME_ARCHIVE_INTERMEDIATE_REPLACEMENT",
    });
    diagnoseRetention(context, opaqueSealCase, {
      contract: "OPAQUE_RUN_TOKEN_SEALING",
    });

    const capability = await loadRetainedRunCapability();
    const moduleSource = readPhysicalFile(retainedEvidenceModulePath, null).bytes.toString(
      "utf8",
    );
    assert.match(moduleSource, /O_NOFOLLOW/u);
    assert.match(moduleSource, /dir_fd|openat|mkdirat/u);
    assert.match(moduleSource, /fsync(?:Sync)?\s*\(/u);
    assertArchiveDurabilitySourceContract(moduleSource);

    const rootOutside = path.join(rootReplacementCase.caseRoot, "outside");
    makePrivateDirectory(rootOutside);
    writePrivateFile(path.join(rootOutside, "sentinel.txt"), "outside root bytes\n");
    const rootRun = await createOpaqueRun(
      capability,
      rootReplacementCase,
      "root-replacement",
      context,
    );
    const parkedRunRoot = path.join(
      rootReplacementCase.caseRoot,
      "run-root-original-parked",
    );
    renameSync(rootRun.runRoot, parkedRunRoot);
    makePrivateDirectory(rootRun.runRoot);
    makePrivateDirectory(path.join(rootRun.runRoot, "archive"));
    makePrivateDirectory(path.join(rootRun.runRoot, "external-evidence"));
    writePrivateFile(
      path.join(rootRun.runRoot, "archive", "replacement-sentinel.txt"),
      "replacement root bytes\n",
    );

    await invokeReplacementBoundOperation(() =>
      capability.createRetainedSignatureLabDirectory(rootRun.run, "root-bound"),
    );
    const rootWrite = await invokeReplacementBoundOperation(() =>
      capability.writeRetainedSignatureLabFile(
        rootRun.run,
        "root-bound/result.bin",
        Buffer.from("held original root bytes\n", "utf8"),
      ),
    );
    assert.deepEqual(
      readdirSync(path.join(rootRun.runRoot, "archive")),
      ["replacement-sentinel.txt"],
      "same-name root replacement received archive bytes",
    );
    assert.deepEqual(readdirSync(rootOutside), ["sentinel.txt"]);
    assert.equal(
      readPhysicalFile(
        path.join(rootRun.runRoot, "archive", "replacement-sentinel.txt"),
      ).bytes.toString("utf8"),
      "replacement root bytes\n",
    );
    assert.equal(
      readPhysicalFile(path.join(rootOutside, "sentinel.txt")).bytes.toString("utf8"),
      "outside root bytes\n",
    );
    if (!rootWrite.rejected) {
      assert.equal(
        readPhysicalFile(
          path.join(parkedRunRoot, "archive", "root-bound", "result.bin"),
        ).bytes.toString("utf8"),
        "held original root bytes\n",
      );
    }

    const intermediateOutside = path.join(intermediateCase.caseRoot, "outside");
    makePrivateDirectory(intermediateOutside);
    writePrivateFile(
      path.join(intermediateOutside, "sentinel.txt"),
      "outside intermediate bytes\n",
    );
    const intermediateRun = await createOpaqueRun(
      capability,
      intermediateCase,
      "intermediate-replacement",
      context,
    );
    await capability.createRetainedSignatureLabDirectory(intermediateRun.run, "guard");
    const guardPath = path.join(intermediateRun.archiveRoot, "guard");
    const parkedGuard = path.join(
      intermediateRun.archiveRoot,
      "guard-original-parked",
    );
    renameSync(guardPath, parkedGuard);
    makePrivateDirectory(guardPath);
    writePrivateFile(path.join(guardPath, "sentinel.txt"), "replacement guard bytes\n");

    const intermediateWrite = await invokeReplacementBoundOperation(() =>
      capability.writeRetainedSignatureLabFile(
        intermediateRun.run,
        "guard/result.bin",
        Buffer.from("held original guard bytes\n", "utf8"),
      ),
    );
    assert.deepEqual(
      readdirSync(guardPath),
      ["sentinel.txt"],
      "same-name intermediate replacement received archive bytes",
    );
    assert.deepEqual(readdirSync(intermediateOutside), ["sentinel.txt"]);
    assert.equal(
      readPhysicalFile(path.join(guardPath, "sentinel.txt")).bytes.toString("utf8"),
      "replacement guard bytes\n",
    );
    assert.equal(
      readPhysicalFile(path.join(intermediateOutside, "sentinel.txt")).bytes.toString(
        "utf8",
      ),
      "outside intermediate bytes\n",
    );
    if (!intermediateWrite.rejected) {
      assert.equal(
        readPhysicalFile(path.join(parkedGuard, "result.bin")).bytes.toString("utf8"),
        "held original guard bytes\n",
      );
    }

    const opaqueSealRun = await createOpaqueRun(
      capability,
      opaqueSealCase,
      "opaque-token-seal",
      context,
    );
    const gateDirectory = await capability.createRetainedSignatureLabDirectory(
      opaqueSealRun.run,
      "gate",
    );
    assertDirectoryPublicationRecord(gateDirectory, opaqueSealRun, "gate");
    const gateResultBytes = Buffer.from('{"status":"PASS"}\n', "utf8");
    const gateResult = await capability.writeRetainedSignatureLabFile(
      opaqueSealRun.run,
      "gate/result.json",
      gateResultBytes,
    );
    assertFilePublicationRecord(
      gateResult,
      opaqueSealRun,
      "gate/result.json",
      gateResultBytes,
    );
    const opaqueSeal = await capability.sealRetainedSignatureLabEvidence({
      run: opaqueSealRun.run,
      outcome: PASS_RETAINED_SEALED_ARCHIVE,
      provenance: {
        schemaVersion: "ca.signature-lab.retained-provenance.v1",
        contractCase: "opaque-token-seal",
      },
    });
    assertExactKeys(opaqueSeal, [
      "archiveRoot",
      "destructiveCleanupAttempted",
      "externalReceipt",
      "manifestPath",
      "manifestSha256",
      "outcome",
      "reportPath",
      "reportSha256",
      "retainedArchiveCount",
      "sealPath",
      "sealSha256",
      "treeDigestSha256",
    ], "opaque-token sealed result");
    assert.equal(Object.isFrozen(opaqueSeal), true);
    assert.equal(opaqueSeal.outcome, PASS_RETAINED_SEALED_ARCHIVE);
    assert.equal(opaqueSeal.archiveRoot, opaqueSealRun.archiveRoot);
    for (const artifactPath of [
      opaqueSeal.manifestPath,
      opaqueSeal.reportPath,
      opaqueSeal.sealPath,
    ]) {
      assertExactDescendant(artifactPath, opaqueSealRun.evidenceRoot);
      readPhysicalFile(artifactPath);
    }
    assert.equal(
      opaqueSeal.manifestSha256,
      sha256(readPhysicalFile(opaqueSeal.manifestPath).bytes),
    );
    assert.equal(
      opaqueSeal.reportSha256,
      sha256(readPhysicalFile(opaqueSeal.reportPath).bytes),
    );
    assert.equal(
      opaqueSeal.sealSha256,
      sha256(readPhysicalFile(opaqueSeal.sealPath).bytes),
    );
    assertSha256(opaqueSeal.treeDigestSha256, "opaque-token tree digest");
    assertExternalReceipt(opaqueSeal, opaqueSealRun.evidenceRoot);
  },
);

test(
  "P1 retained evidence review: receipt schema is exact frozen and tamper evident",
  async (context) => {
    const fixture = makeSealableArchive(context, "p1-external-receipt-schema");
    const capability = await loadRetainedEvidenceCapability();
    const archiveBefore = snapshotArchive(fixture.archiveRoot);
    const result = await capability.sealRetainedSignatureLabEvidence(
      expectedSealArguments(fixture),
    );
    const sealedArtifacts = assertSealedResult(result, fixture);
    const receipt = assertExternalReceipt(result, fixture.evidenceRoot);
    const revalidationArguments = {
      manifestPath: result.manifestPath,
      sealPath: result.sealPath,
      reportPath: result.reportPath,
    };

    const clean = await capability.revalidateRetainedSignatureLabEvidence({
      ...revalidationArguments,
      externalReceipt: receipt,
    });
    assert.equal(clean.valid, true);

    const attacks = [
      {
        label: "EXTRA_TOP_LEVEL_FIELD",
        mutate(candidate) {
          candidate.unexpected = false;
        },
      },
      {
        label: "MISSING_ROOT_IDENTITY",
        mutate(candidate) {
          delete candidate.evidenceRootIdentity;
        },
      },
      {
        label: "TAMPERED_EVIDENCE_ROOT_PATH",
        mutate(candidate) {
          candidate.evidenceRoot = fixture.caseRoot;
        },
      },
      {
        label: "TAMPERED_EVIDENCE_ROOT_IDENTITY",
        mutate(candidate) {
          candidate.evidenceRootIdentity.ino =
            `${BigInt(candidate.evidenceRootIdentity.ino) + 1n}`;
        },
      },
      {
        label: "EXTRA_SIDECAR",
        mutate(candidate) {
          candidate.sidecars.push(cloneJson(candidate.sidecars[0]));
        },
      },
      {
        label: "MISSING_SIDECAR",
        mutate(candidate) {
          candidate.sidecars.pop();
        },
      },
      {
        label: "REORDERED_SIDECARS",
        mutate(candidate) {
          candidate.sidecars.reverse();
        },
      },
      {
        label: "TAMPERED_SIDECAR_BYTE_LENGTH",
        mutate(candidate) {
          candidate.sidecars[0].byteLength += 1;
        },
      },
      {
        label: "TAMPERED_SIDECAR_DIGEST",
        mutate(candidate) {
          candidate.sidecars[0].sha256 = "0".repeat(64);
        },
      },
      {
        label: "TAMPERED_SIDECAR_IDENTITY",
        mutate(candidate) {
          candidate.sidecars[0].identity.ino =
            `${BigInt(candidate.sidecars[0].identity.ino) + 1n}`;
        },
      },
      {
        label: "EXTRA_HELPER_PROVENANCE_FIELD",
        mutate(candidate) {
          candidate.helperProvenance.publication.unexpected = false;
        },
      },
      {
        label: "MISSING_HELPER_PROVENANCE",
        mutate(candidate) {
          delete candidate.helperProvenance.revalidation;
        },
      },
      {
        label: "TAMPERED_HELPER_SOURCE_DIGEST",
        mutate(candidate) {
          candidate.helperProvenance.revalidation.sourceSha256 = "f".repeat(64);
        },
      },
    ];

    for (const attack of attacks) {
      const candidate = cloneJson(receipt);
      attack.mutate(candidate);
      freezeDeep(candidate);
      await assertSafetyRejection(() =>
        capability.revalidateRetainedSignatureLabEvidence({
          ...revalidationArguments,
          externalReceipt: candidate,
        }),
      );
      assertSealArtifactsUnchanged(result, sealedArtifacts);
      assert.deepEqual(snapshotArchive(fixture.archiveRoot), archiveBefore, attack.label);
    }
  },
);

test(
  "P1 retained evidence review: retained run lifecycle closes or poisons descriptors",
  async (context) => {
    const closedCase = createRetainedCase("p1-run-lifecycle-closed");
    const poisonedCase = createRetainedCase("p1-run-lifecycle-poisoned");
    diagnoseRetention(context, closedCase, { lifecycle: "CLOSED" });
    diagnoseRetention(context, poisonedCase, { lifecycle: "POISONED" });
    const capability = await loadRetainedRunLifecycleCapability();
    const descriptorBaseline = processDescriptorCount();

    const closedRun = await createOpaqueRun(
      capability,
      closedCase,
      "lifecycle-closed",
      context,
    );
    assert.ok(
      processDescriptorCount() >= descriptorBaseline + 3,
      "an OPEN run must hold its bound run/archive/evidence descriptors",
    );
    assertRunInspection(
      await capability.inspectRetainedSignatureLabRun(closedRun.run),
      closedRun,
      "OPEN",
    );
    assertRunInspection(
      await capability.closeRetainedSignatureLabRun(closedRun.run),
      closedRun,
      "CLOSED",
    );
    assert.equal(
      processDescriptorCount(),
      descriptorBaseline,
      "normal retained-run close leaked a descriptor",
    );
    assertRunInspection(
      await capability.inspectRetainedSignatureLabRun(closedRun.run),
      closedRun,
      "CLOSED",
    );
    assertRunInspection(
      await capability.closeRetainedSignatureLabRun(closedRun.run),
      closedRun,
      "CLOSED",
    );
    for (const operation of [
      () => capability.createRetainedSignatureLabDirectory(closedRun.run, "after-close"),
      () => capability.writeRetainedSignatureLabFile(
        closedRun.run,
        "after-close.bin",
        Buffer.from("must not write after close\n", "utf8"),
      ),
      () => capability.sealRetainedSignatureLabEvidence({
        run: closedRun.run,
        outcome: PASS_RETAINED_SEALED_ARCHIVE,
        provenance: { contractCase: "after-close" },
      }),
    ]) {
      await assert.rejects(operation, /CLOSED/u);
    }
    assertPrivateDirectory(closedRun.runRoot);

    const poisonedRun = await createOpaqueRun(
      capability,
      poisonedCase,
      "lifecycle-poisoned",
      context,
    );
    const parkedPoisonedRoot = path.join(poisonedCase.caseRoot, "run-original-parked");
    renameSync(poisonedRun.runRoot, parkedPoisonedRoot);
    makePrivateDirectory(poisonedRun.runRoot);
    makePrivateDirectory(path.join(poisonedRun.runRoot, "archive"));
    makePrivateDirectory(path.join(poisonedRun.runRoot, "external-evidence"));
    await assertSafetyRejection(() =>
      capability.createRetainedSignatureLabDirectory(poisonedRun.run, "must-not-write"),
    );
    assertRunInspection(
      await capability.inspectRetainedSignatureLabRun(poisonedRun.run),
      poisonedRun,
      "POISONED",
    );
    assert.equal(
      processDescriptorCount(),
      descriptorBaseline,
      "poisoned retained run leaked a descriptor",
    );
    for (const operation of [
      () => capability.createRetainedSignatureLabDirectory(
        poisonedRun.run,
        "after-poison",
      ),
      () => capability.writeRetainedSignatureLabFile(
        poisonedRun.run,
        "after-poison.bin",
        Buffer.from("must not write after poison\n", "utf8"),
      ),
      () => capability.sealRetainedSignatureLabEvidence({
        run: poisonedRun.run,
        outcome: PASS_RETAINED_SEALED_ARCHIVE,
        provenance: { contractCase: "after-poison" },
      }),
    ]) {
      await assert.rejects(operation, /POISONED/u);
    }
    assertRunInspection(
      await capability.closeRetainedSignatureLabRun(poisonedRun.run),
      poisonedRun,
      "POISONED",
    );
    assertPrivateDirectory(parkedPoisonedRoot);
    assertPrivateDirectory(poisonedRun.runRoot);
    assert.equal(processDescriptorCount(), descriptorBaseline);
  },
);

test(
  "P1 retained evidence review: persistent mutation worker binds FD3 before READY",
  async (context) => {
    const retainedCase = createRetainedCase("p1-mutation-worker-ready");
    diagnoseRetention(context, retainedCase, {
      contract: "PERSISTENT_MUTATION_WORKER_FD3_READY_AND_EXACT_CLOSE",
    });
    const capability = await loadRetainedRunLifecycleCapability();
    const descriptorBaseline = processDescriptorCount();
    let runInfo = null;
    let closed = false;
    try {
      runInfo = await createOpaqueRun(
        capability,
        retainedCase,
        "persistent-mutation-worker-ready",
        context,
      );
      assert.ok(
        processDescriptorCount() >= descriptorBaseline + 7,
        "OPEN run must retain run/archive/evidence descriptors plus four worker pipes",
      );
      assert.deepEqual(
        readdirSync(runInfo.archiveRoot).toSorted(),
        ["INTENTIONALLY_RETAINED_RUN.json"],
        "worker READY must not mutate the archive namespace",
      );
      assertRunInspection(
        await capability.inspectRetainedSignatureLabRun(runInfo.run),
        runInfo,
        "OPEN",
      );
      assertRunInspection(
        await capability.closeRetainedSignatureLabRun(runInfo.run),
        runInfo,
        "CLOSED",
      );
      closed = true;
      assert.equal(
        processDescriptorCount(),
        descriptorBaseline,
        "CLOSE acknowledgement and worker exit must precede descriptor release",
      );
    } finally {
      if (runInfo !== null && !closed) {
        await capability.closeRetainedSignatureLabRun(runInfo.run).catch(() => undefined);
      }
    }
  },
);

test(
  "P1 retained evidence review: worker source orders root binding before READY and request read",
  () => {
    const moduleSource = readFileSync(retainedEvidenceModulePath, "utf8");
    assert.match(
      moduleSource,
      /import\s*\{[^}]*\bspawn\b[^}]*\bspawnSync\b[^}]*\}\s*from\s*["']node:child_process["']/su,
      "retained module must use async spawn for the persistent worker",
    );
    const workerStart = moduleSource.indexOf(
      "def run_persistent_worker():",
    );
    assert.notEqual(workerStart, -1, "persistent worker source must be frozen in the module");
    const workerEnd = moduleSource.indexOf("\n\nrequire(len(sys.argv)", workerStart);
    assert.ok(workerEnd > workerStart, "persistent worker source boundary is missing");
    const workerSource = moduleSource.slice(workerStart, workerEnd);
    const started = workerSource.indexOf(
      'publish_worker_progress("WORKER_STARTED")',
    );
    const rootStat = workerSource.indexOf("os.fstat(ROOT_FD)");
    const rootBound = workerSource.indexOf(
      'publish_worker_progress("ROOT_BOUND")',
    );
    const ready = workerSource.indexOf('"messageType": "READY"');
    const requestRead = workerSource.indexOf(
      'publish_worker_progress("REQUEST_READ_BEGIN")',
    );
    const frameRead = workerSource.indexOf("read_frame(", requestRead);
    for (const [label, index] of [
      ["WORKER_STARTED", started],
      ["FD3 root fstat", rootStat],
      ["ROOT_BOUND", rootBound],
      ["READY frame", ready],
      ["REQUEST_READ_BEGIN", requestRead],
      ["request frame read", frameRead],
    ]) {
      assert.ok(index >= 0, `${label} is missing from the persistent worker source`);
    }
    assert.ok(
      started < rootStat && rootStat < rootBound && rootBound < ready &&
        ready < requestRead && requestRead < frameRead,
      "worker must bind FD3, publish READY, and only then begin reading requests",
    );
    assert.match(
      moduleSource,
      /stdio:\s*\[\s*["']pipe["']\s*,\s*["']pipe["']\s*,\s*["']pipe["']\s*,\s*state\.archiveDescriptor\s*,\s*["']pipe["']\s*\]/su,
      "persistent worker must inherit archive FD3 and expose a dedicated FD4 progress pipe",
    );
  },
);

test(
  "P1 retained evidence review: worker startup installs exact reap authority before pipe validation",
  () => {
    const moduleSource = readFileSync(retainedEvidenceModulePath, "utf8");
    const startupStart = moduleSource.indexOf(
      "async function startRetainedMutationWorker(state)",
    );
    const startupEnd = moduleSource.indexOf(
      "\nfunction writeRetainedMutationWorkerChunk",
      startupStart,
    );
    assert.ok(
      startupStart >= 0 && startupEnd > startupStart,
      "persistent worker startup source boundary is missing",
    );
    const startupSource = moduleSource.slice(startupStart, startupEnd);
    const spawnIndex = startupSource.indexOf("const child = spawn(");
    const workerIndex = startupSource.indexOf("const worker = {");
    const closePromiseIndex = startupSource.indexOf(
      "worker.closePromise = new Promise",
    );
    const installIndex = startupSource.indexOf("state.mutationWorker = worker;");
    const pipeValidationIndex = startupSource.indexOf(
      "retained mutation worker pipe allocation drift",
    );
    const rollbackIndex = startupSource.indexOf(
      "await terminateRetainedMutationWorker(state",
      pipeValidationIndex,
    );
    for (const [label, index] of [
      ["async spawn", spawnIndex],
      ["provisional worker record", workerIndex],
      ["close evidence promise", closePromiseIndex],
      ["state installation", installIndex],
      ["pipe validation", pipeValidationIndex],
      ["exact termination rollback", rollbackIndex],
    ]) {
      assert.ok(index >= 0, `${label} is missing from worker startup`);
    }
    assert.ok(
      spawnIndex < workerIndex && workerIndex < closePromiseIndex &&
        closePromiseIndex < installIndex && installIndex < pipeValidationIndex &&
        pipeValidationIndex < rollbackIndex,
      "spawned worker close/reap authority must be installed before any pipe validation",
    );
    assert.match(
      startupSource,
      /child\.stdin\s*==\s*null[\s\S]*typeof\s+child\.stdin\.write\s*!==\s*["']function["'][\s\S]*child\.stdout\s*==\s*null[\s\S]*typeof\s+child\.stdout\.on\s*!==\s*["']function["'][\s\S]*child\.stderr\s*==\s*null[\s\S]*typeof\s+child\.stderr\.on\s*!==\s*["']function["'][\s\S]*worker\.progress\s*==\s*null[\s\S]*typeof\s+worker\.progress\.on\s*!==\s*["']function["']/u,
      "startup must reject null, undefined, and non-stream worker pipes",
    );
  },
);

test(
  "P1 retained evidence review: every retained mutation uses the persistent framed worker",
  () => {
    const moduleSource = readFileSync(retainedEvidenceModulePath, "utf8");
    const mutationStart = moduleSource.indexOf("async function mutateRetainedRun(");
    const mutationEnd = moduleSource.indexOf(
      "\nexport async function createRetainedSignatureLabDirectory",
      mutationStart,
    );
    assert.ok(
      mutationStart >= 0 && mutationEnd > mutationStart,
      "mutateRetainedRun source boundary is missing",
    );
    const mutationSource = moduleSource.slice(mutationStart, mutationEnd);
    assert.match(
      mutationSource,
      /await\s+requestRetainedMutationWorkerMutation\s*\(/u,
      "mutations must await one response from the retained worker",
    );
    assert.doesNotMatch(
      mutationSource,
      /\bexecuteDescriptorHelper\s*\(|\bspawnSync\s*\(/u,
      "mutations must not launch a fresh synchronous helper",
    );
    const workerStart = moduleSource.indexOf("def run_persistent_worker():");
    const workerEnd = moduleSource.indexOf("\n\nrequire(len(sys.argv)", workerStart);
    assert.ok(workerStart >= 0 && workerEnd > workerStart);
    const workerSource = moduleSource.slice(workerStart, workerEnd);
    assert.match(workerSource, /while\s+True\s*:/u);
    assert.match(workerSource, /expected_request_id\s*=\s*1/u);
    assert.match(workerSource, /message_type\s*==\s*"MUTATE"/u);
    assert.match(workerSource, /expected_request_id\s*\+=\s*1/u);
    assert.match(
      moduleSource,
      /function\s+writeRetainedMutationWorkerChunk\([^)]*\)[\s\S]*?\.write\s*\(/u,
      "mutation frames must preserve worker stdin for subsequent requests",
    );
  },
);

test(
  "P1 retained evidence review: one worker durably serves sequential mkdir and writes",
  async (context) => {
    const retainedCase = createRetainedCase("p1-persistent-worker-sequential");
    diagnoseRetention(context, retainedCase, {
      contract: "ONE_WORKER_SEQUENTIAL_MUTATION_AND_EXACT_CLOSE",
      writeCount: 2,
    });
    const capability = await loadRetainedRunLifecycleCapability();
    const descriptorBaseline = processDescriptorCount();
    let runInfo = null;
    let closed = false;
    try {
      runInfo = await createOpaqueRun(
        capability,
        retainedCase,
        "persistent-worker-sequential",
        context,
      );
      const workerDescriptorCount = processDescriptorCount();
      assert.ok(workerDescriptorCount >= descriptorBaseline + 7);
      const directory = await capability.createRetainedSignatureLabDirectory(
        runInfo.run,
        "snapshots",
      );
      assertDirectoryPublicationRecord(directory, runInfo, "snapshots");
      for (let index = 0; index < 2; index += 1) {
        const bytes = Buffer.from(`persistent worker write ${index}\n`, "utf8");
        const relativePath = `snapshots/write-${index}.bin`;
        const publication = await capability.writeRetainedSignatureLabFile(
          runInfo.run,
          relativePath,
          bytes,
        );
        assertFilePublicationRecord(publication, runInfo, relativePath, bytes);
        assert.equal(
          processDescriptorCount(),
          workerDescriptorCount,
          "sequential mutation spawned or leaked an additional descriptor set",
        );
      }
      assertRunInspection(
        await capability.closeRetainedSignatureLabRun(runInfo.run),
        runInfo,
        "CLOSED",
      );
      closed = true;
      assert.equal(processDescriptorCount(), descriptorBaseline);
    } finally {
      if (runInfo !== null && !closed) {
        await capability.closeRetainedSignatureLabRun(runInfo.run).catch(() => undefined);
      }
    }
  },
);

test(
  "P1 retained evidence review: overlapping mutation is rejected without poisoning the active request",
  { timeout: 120_000 },
  async (context) => {
    const retainedCase = createRetainedCase("p1-persistent-worker-overlap");
    diagnoseRetention(context, retainedCase, {
      contract: "ONE_IN_FLIGHT_MUTATION_WITH_FAIL_CLOSED_OVERLAP",
    });
    const capability = await loadRetainedRunLifecycleCapability();
    const runInfo = await createOpaqueRun(
      capability,
      retainedCase,
      "persistent-worker-overlap",
      context,
    );
    await capability.createRetainedSignatureLabDirectory(runInfo.run, "snapshots");
    const firstBytes = Buffer.alloc(4 * 1024 * 1024, 0x41);
    const firstPromise = capability.writeRetainedSignatureLabFile(
      runInfo.run,
      "snapshots/first.bin",
      firstBytes,
    );
    await Promise.resolve();
    const secondPromise = capability.writeRetainedSignatureLabFile(
      runInfo.run,
      "snapshots/overlap.bin",
      Buffer.from("must be rejected before worker input\n", "utf8"),
    );
    const [first, second] = await Promise.allSettled([firstPromise, secondPromise]);
    assert.equal(first.status, "fulfilled", "the active mutation must complete exactly once");
    assert.equal(second.status, "rejected", "the overlapping mutation must fail closed");
    assert.match(
      second.reason?.message ?? String(second.reason),
      /retained run operation is already in progress/u,
      "overlap rejection must identify the one-in-flight policy",
    );
    assertFilePublicationRecord(
      first.value,
      runInfo,
      "snapshots/first.bin",
      firstBytes,
    );
    assertPathMissing(path.join(runInfo.archiveRoot, "snapshots", "overlap.bin"));
    assertRunInspection(
      await capability.inspectRetainedSignatureLabRun(runInfo.run),
      runInfo,
      "OPEN",
    );
  },
);

test(
  "P1 retained evidence review: overlapping seal is rejected before sidecar publication",
  { timeout: 120_000 },
  async (context) => {
    const retainedCase = createRetainedCase("p1-persistent-worker-overlap-seal");
    diagnoseRetention(context, retainedCase, {
      contract: "SEAL_CANNOT_RACE_AN_ACTIVE_MUTATION",
    });
    const capability = await loadRetainedRunLifecycleCapability();
    const runInfo = await createOpaqueRun(
      capability,
      retainedCase,
      "persistent-worker-overlap-seal",
      context,
    );
    await capability.createRetainedSignatureLabDirectory(runInfo.run, "snapshots");
    const firstBytes = Buffer.alloc(8 * 1024 * 1024, 0x53);
    const writePromise = capability.writeRetainedSignatureLabFile(
      runInfo.run,
      "snapshots/active.bin",
      firstBytes,
    );
    await Promise.resolve();
    const sealPromise = capability.sealRetainedSignatureLabEvidence({
      run: runInfo.run,
      outcome: PASS_RETAINED_SEALED_ARCHIVE,
      provenance: {
        schemaVersion: "ca.signature-lab.retained-provenance.v1",
        contractCase: "overlapping-seal",
      },
    });
    const [write, seal] = await Promise.allSettled([writePromise, sealPromise]);
    assert.equal(write.status, "fulfilled", "the active mutation must remain authoritative");
    assert.equal(seal.status, "rejected", "overlapping seal must fail before publication");
    assert.match(
      seal.reason?.message ?? String(seal.reason),
      /retained run operation is already in progress/u,
    );
    assertFilePublicationRecord(
      write.value,
      runInfo,
      "snapshots/active.bin",
      firstBytes,
    );
    assert.deepEqual(
      readdirSync(runInfo.evidenceRoot),
      [],
      "rejected overlapping seal must publish no sidecar",
    );
    assertRunInspection(
      await capability.inspectRetainedSignatureLabRun(runInfo.run),
      runInfo,
      "OPEN",
    );
  },
);

test(
  "P1 retained evidence review: overlapping close is rejected without consuming worker streams",
  { timeout: 120_000 },
  async (context) => {
    const retainedCase = createRetainedCase("p1-persistent-worker-overlap-close");
    diagnoseRetention(context, retainedCase, {
      contract: "CLOSE_CANNOT_RACE_AN_ACTIVE_MUTATION",
    });
    const capability = await loadRetainedRunLifecycleCapability();
    const runInfo = await createOpaqueRun(
      capability,
      retainedCase,
      "persistent-worker-overlap-close",
      context,
    );
    await capability.createRetainedSignatureLabDirectory(runInfo.run, "snapshots");
    const firstBytes = Buffer.alloc(8 * 1024 * 1024, 0x43);
    const writePromise = capability.writeRetainedSignatureLabFile(
      runInfo.run,
      "snapshots/active.bin",
      firstBytes,
    );
    await Promise.resolve();
    const closePromise = capability.closeRetainedSignatureLabRun(runInfo.run);
    const [write, close] = await Promise.allSettled([writePromise, closePromise]);
    assert.equal(write.status, "fulfilled", "the active mutation must survive close overlap");
    assert.equal(close.status, "rejected", "overlapping close must fail before worker input");
    assert.match(
      close.reason?.message ?? String(close.reason),
      /retained run operation is already in progress/u,
    );
    assertFilePublicationRecord(
      write.value,
      runInfo,
      "snapshots/active.bin",
      firstBytes,
    );
    assertRunInspection(
      await capability.inspectRetainedSignatureLabRun(runInfo.run),
      runInfo,
      "OPEN",
    );
  },
);

test(
  "P1 retained evidence review: immutable batch publishes exact files in one worker request",
  { timeout: 120_000 },
  async (context) => {
    const retainedCase = createRetainedCase("p1-persistent-worker-immutable-batch");
    diagnoseRetention(context, retainedCase, {
      contract: "ONE_FRAMED_IMMUTABLE_BATCH_WITH_EXACT_DURABILITY",
      entryCount: 3,
    });
    const capability = await loadRetainedRunLifecycleCapability();
    assert.equal(
      typeof capability.writeRetainedSignatureLabBatch,
      "function",
      "writeRetainedSignatureLabBatch export is required before immutable snapshots can be batched",
    );
    const descriptorBaseline = processDescriptorCount();
    const runInfo = await createOpaqueRun(
      capability,
      retainedCase,
      "persistent-worker-immutable-batch",
      context,
    );
    const workerDescriptorCount = processDescriptorCount();
    const entries = [
      {
        relativePath: "immutable/audit-a.mjs",
        bytes: Buffer.from("export const audit = 1;\n", "utf8"),
      },
      {
        relativePath: "immutable/nested/Lab.jsx",
        bytes: Buffer.from("export default function Lab() { return null; }\n", "utf8"),
      },
      {
        relativePath: "immutable/z-plan.json",
        bytes: Buffer.from('{"status":"NOT_RUN"}\n', "utf8"),
      },
    ];
    const batch = await capability.writeRetainedSignatureLabBatch(runInfo.run, entries);
    assertExactKeys(batch, [
      "schemaVersion",
      "entryCount",
      "totalByteLength",
      "directories",
      "files",
    ], "immutable retained batch publication");
    assertDeepFrozen(batch, "immutable retained batch publication");
    assert.equal(
      batch.schemaVersion,
      "ca.signature-lab.retained-batch-publication.v1",
    );
    assert.equal(batch.entryCount, entries.length);
    assert.equal(
      batch.totalByteLength,
      entries.reduce((sum, entry) => sum + entry.bytes.length, 0),
    );
    assert.deepEqual(
      batch.directories.map((record) => record.relativePath),
      ["immutable", "immutable/nested"],
    );
    for (const directory of batch.directories) {
      assertDirectoryPublicationRecord(directory, runInfo, directory.relativePath);
    }
    assert.deepEqual(
      batch.files.map((record) => record.relativePath),
      entries.map((entry) => entry.relativePath),
    );
    for (let index = 0; index < entries.length; index += 1) {
      assertFilePublicationRecord(
        batch.files[index],
        runInfo,
        entries[index].relativePath,
        entries[index].bytes,
      );
    }
    assert.equal(
      processDescriptorCount(),
      workerDescriptorCount,
      "one batch request must not spawn or leak another descriptor set",
    );
    assertRunInspection(
      await capability.inspectRetainedSignatureLabRun(runInfo.run),
      runInfo,
      "OPEN",
    );
    await capability.closeRetainedSignatureLabRun(runInfo.run);
    assert.equal(processDescriptorCount(), descriptorBaseline);
  },
);

test(
  "P1 retained evidence review: immutable batch has one framed request and no rollback path",
  () => {
    const moduleSource = readFileSync(retainedEvidenceModulePath, "utf8");
    const publicStart = moduleSource.indexOf(
      "export async function writeRetainedSignatureLabBatch(run, entries)",
    );
    const publicEnd = moduleSource.indexOf(
      "\nfunction normalizeExpectedEntries",
      publicStart,
    );
    assert.ok(publicStart >= 0 && publicEnd > publicStart);
    const publicSource = moduleSource.slice(publicStart, publicEnd);
    assert.equal(
      [...publicSource.matchAll(/requestRetainedMutationWorkerBatch\s*\(/gu)].length,
      1,
      "one public batch call must issue exactly one worker batch request",
    );
    assert.doesNotMatch(
      publicSource,
      /\b(?:writeRetainedSignatureLabFile|mutateRetainedRun|spawnSync)\s*\(/u,
      "batch publication must not fall back to per-file helpers",
    );

    const requestStart = moduleSource.indexOf(
      "async function writeRetainedMutationWorkerBatchRequest",
    );
    const requestEnd = moduleSource.indexOf(
      "\nfunction endRetainedMutationWorkerFrame",
      requestStart,
    );
    assert.ok(requestStart >= 0 && requestEnd > requestStart);
    const requestSource = moduleSource.slice(requestStart, requestEnd);
    assert.equal(
      [...requestSource.matchAll(/encodeRetainedMutationWorkerFrame\s*\(/gu)].length,
      1,
      "batch transport must emit one control frame",
    );
    assert.match(requestSource, /for\s*\(const payload of payloads\)/u);
    assert.doesNotMatch(requestSource, /\.end\s*\(/u,
      "batch transport must preserve the persistent worker stdin");

    const workerStart = moduleSource.indexOf("def validate_worker_batch(batch, stream):");
    const workerEnd = moduleSource.indexOf("\ndef run_persistent_worker():", workerStart);
    assert.ok(workerStart >= 0 && workerEnd > workerStart);
    const workerBatchSource = moduleSource.slice(workerStart, workerEnd);
    assert.match(moduleSource, /message_type\s*==\s*["']WRITE_BATCH["']/u);
    assert.match(moduleSource, /["']messageType["']:\s*["']BATCH_RESULT["']/u);
    assert.match(
      workerBatchSource,
      /BATCH_PAYLOADS_VERIFIED[\s\S]*os\.mkdir\s*\(/u,
      "all batch payloads must verify before the first namespace mutation",
    );
    assert.doesNotMatch(
      workerBatchSource,
      /\bos\.(?:unlink|remove|rmdir|rename|replace)\s*\(|\bshutil\.rmtree\s*\(/u,
      "partial batch failure must retain evidence without rollback or deletion",
    );
  },
);

test(
  "P1 retained evidence review: journal STARTED is durable before executor eligibility and RESULT binds exact artifacts",
  { timeout: 120_000 },
  async (context) => {
    const retainedCase = createRetainedCase("p1-execution-journal-one-gate");
    diagnoseRetention(context, retainedCase, {
      contract: "DURABLE_STARTED_BEFORE_EXECUTOR_AND_EXACT_RESULT_ARTIFACTS",
      plannedGateCount: 1,
      expectedRecordCount: 2,
    });
    const capability = await loadRetainedRunLifecycleCapability();
    const descriptorBaseline = processDescriptorCount();
    const runInfo = await createOpaqueRun(
      capability,
      retainedCase,
      "execution-journal-one-gate",
      context,
    );
    const workerDescriptorCount = processDescriptorCount();
    assert.equal(
      typeof capability.initializeRetainedSignatureLabExecutionJournal,
      "function",
      "initializeRetainedSignatureLabExecutionJournal export is required before a gate can become executable",
    );
    assert.equal(
      typeof capability.appendRetainedSignatureLabExecutionJournal,
      "function",
      "appendRetainedSignatureLabExecutionJournal export is required before gate evidence can be journaled",
    );

    const gateId = "gate-0001-journal-contract";
    const plannedGates = [{ ordinal: 1, gateId }];
    const planSha256 = sha256(canonicalJsonBytes(plannedGates, "planned gates"));
    const plannedGateIdsSha256 = sha256(
      canonicalJsonBytes(plannedGates, "planned gate identity manifest"),
    );
    const journal = await capability.initializeRetainedSignatureLabExecutionJournal(
      runInfo.run,
      {
        relativePath: "executions/execution-journal.v1.bin",
        planSha256,
        plannedGates,
      },
    );
    assertExactKeys(journal, [
      "schemaVersion",
      "relativePath",
      "path",
      "identity",
      "byteLength",
      "sha256",
      "planSha256",
      "plannedGateCount",
      "plannedGateIdsSha256",
      "recordCount",
      "lastFrameSha256",
      "nextEventType",
      "nextOrdinal",
    ], "execution journal publication");
    assertDeepFrozen(journal, "execution journal publication");
    assert.equal(
      journal.schemaVersion,
      "ca.signature-lab.execution-journal-publication.v1",
    );
    assert.equal(journal.relativePath, "executions/execution-journal.v1.bin");
    assert.equal(journal.path, path.join(
      runInfo.archiveRoot,
      "executions",
      "execution-journal.v1.bin",
    ));
    assert.equal(journal.planSha256, planSha256);
    assert.equal(journal.plannedGateCount, 1);
    assert.equal(journal.recordCount, 0);
    assert.equal(journal.nextEventType, "STARTED");
    assert.equal(journal.nextOrdinal, 1);
    assertSha256(journal.sha256, "execution journal sha256");
    assertSha256(journal.lastFrameSha256, "execution journal lastFrameSha256");
    assertSha256(
      journal.plannedGateIdsSha256,
      "execution journal plannedGateIdsSha256",
    );
    assert.equal(journal.plannedGateIdsSha256, plannedGateIdsSha256);
    assertStableIdentityRecord(
      journal.identity,
      journal.path,
      "regular",
      "execution journal publication",
    );
    const initialJournalBytes = readPhysicalFile(journal.path).bytes;
    assert.equal(initialJournalBytes.byteLength, journal.byteLength);
    assert.equal(sha256(initialJournalBytes), journal.sha256);
    const headerFrames = decodeExecutionJournal(initialJournalBytes);
    assert.equal(headerFrames.length, 1);
    assert.deepEqual(headerFrames[0].body, {
      schemaVersion: "ca.signature-lab.execution-journal-header.v1",
      encoding: "U32BE_CANONICAL_JSON_SHA256_CHAIN",
      planSha256,
      plannedGateCount: 1,
      plannedGateIdsSha256,
      plannedGates,
      expectedEventCount: 2,
    });
    assert.equal(headerFrames[0].digest, journal.lastFrameSha256);

    const attemptBytes = Buffer.from(JSON.stringify({
      schemaVersion: "ca.signature-lab.execution-attempt.v1",
      gateId,
      ordinal: 1,
      status: "STARTED",
    }) + "\n", "utf8");
    let executorEligible = false;
    const startedPromise = capability.appendRetainedSignatureLabExecutionJournal(
      runInfo.run,
      {
        eventType: "STARTED",
        ordinal: 1,
        gateId,
        attempt: {
          relativePath: "executions/gate-0001-journal-contract/attempt.json",
          bytes: attemptBytes,
        },
      },
    );
    assert.equal(
      executorEligible,
      false,
      "executor eligibility must remain false before the STARTED acknowledgment",
    );
    const started = await startedPromise;
    executorEligible = true;
    assertExactKeys(started, [
      "schemaVersion",
      "eventType",
      "sequence",
      "gateId",
      "ordinal",
      "journal",
      "artifacts",
    ], "execution journal STARTED append");
    assertDeepFrozen(started, "execution journal STARTED append");
    assert.equal(
      started.schemaVersion,
      "ca.signature-lab.execution-journal-append.v1",
    );
    assert.equal(started.eventType, "STARTED");
    assert.equal(started.sequence, 1);
    assert.equal(started.gateId, gateId);
    assert.equal(started.ordinal, 1);
    assertExactKeys(started.artifacts, ["attempt"], "STARTED artifacts");
    assertFilePublicationRecord(
      started.artifacts.attempt,
      runInfo,
      "executions/gate-0001-journal-contract/attempt.json",
      attemptBytes,
    );
    assert.equal(executorEligible, true);
    assertExactKeys(started.journal, [
      "relativePath",
      "path",
      "identity",
      "byteLength",
      "sha256",
      "recordCount",
      "lastFrameSha256",
      "nextEventType",
      "nextOrdinal",
    ], "STARTED journal binding");
    assertDeepFrozen(started.journal, "STARTED journal binding");
    assert.equal(started.journal.relativePath, journal.relativePath);
    assert.equal(started.journal.path, journal.path);
    assertSha256(started.journal.sha256, "STARTED journal sha256");
    assertSha256(started.journal.lastFrameSha256, "STARTED journal lastFrameSha256");
    assert.equal(started.journal.recordCount, 1);
    assert.equal(started.journal.nextEventType, "RESULT");
    assert.equal(started.journal.nextOrdinal, 1);
    assert.deepEqual(started.journal.identity, journal.identity);
    assert.ok(started.journal.byteLength > journal.byteLength);
    assert.notEqual(started.journal.sha256, journal.sha256);
    assert.notEqual(started.journal.lastFrameSha256, journal.lastFrameSha256);
    const startedJournalBytes = readPhysicalFile(journal.path).bytes;
    assert.equal(startedJournalBytes.byteLength, started.journal.byteLength);
    assert.equal(sha256(startedJournalBytes), started.journal.sha256);
    assert.deepEqual(
      startedJournalBytes.subarray(0, initialJournalBytes.length),
      initialJournalBytes,
      "STARTED must append without rewriting the durable header prefix",
    );
    const startedFrames = decodeExecutionJournal(startedJournalBytes);
    assert.equal(startedFrames.length, 2);
    assert.deepEqual(startedFrames[0], headerFrames[0]);
    assert.deepEqual(startedFrames[1].body, {
      schemaVersion: "ca.signature-lab.execution-journal-record.v1",
      recordType: "STARTED",
      sequence: 1,
      previousFrameSha256: headerFrames[0].digest,
      ordinal: 1,
      gateId,
      attempt: {
        relativePath: started.artifacts.attempt.relativePath,
        identity: started.artifacts.attempt.identity,
        byteLength: started.artifacts.attempt.byteLength,
        sha256: started.artifacts.attempt.sha256,
      },
    });
    assert.equal(startedFrames[1].digest, started.journal.lastFrameSha256);
    assertPrivateDirectory(path.join(
      runInfo.archiveRoot,
      "executions/gate-0001-journal-contract",
    ));
    assertPathMissing(path.join(
      runInfo.archiveRoot,
      "executions/gate-0001-journal-contract/stdout.bin",
    ));
    assertPathMissing(path.join(
      runInfo.archiveRoot,
      "executions/gate-0001-journal-contract/stderr.bin",
    ));
    assertPathMissing(path.join(
      runInfo.archiveRoot,
      "executions/gate-0001-journal-contract/result.json",
    ));

    const stdoutBytes = Buffer.from("gate output\n", "utf8");
    const stderrBytes = Buffer.alloc(0);
    const resultBytes = Buffer.from(JSON.stringify({
      schemaVersion: "ca.signature-lab.execution-result.v1",
      gateId,
      ordinal: 1,
      status: "PASS",
      exitCode: 0,
      signal: null,
    }) + "\n", "utf8");
    const completed = await capability.appendRetainedSignatureLabExecutionJournal(
      runInfo.run,
      {
        eventType: "RESULT",
        ordinal: 1,
        gateId,
        status: "PASS",
        exitCode: 0,
        signal: null,
        stdout: {
          relativePath: "executions/gate-0001-journal-contract/stdout.bin",
          bytes: stdoutBytes,
        },
        stderr: {
          relativePath: "executions/gate-0001-journal-contract/stderr.bin",
          bytes: stderrBytes,
        },
        result: {
          relativePath: "executions/gate-0001-journal-contract/result.json",
          bytes: resultBytes,
        },
      },
    );
    assertExactKeys(completed, [
      "schemaVersion",
      "eventType",
      "sequence",
      "gateId",
      "ordinal",
      "journal",
      "artifacts",
    ], "execution journal RESULT append");
    assertDeepFrozen(completed, "execution journal RESULT append");
    assert.equal(
      completed.schemaVersion,
      "ca.signature-lab.execution-journal-append.v1",
    );
    assert.equal(completed.eventType, "RESULT");
    assert.equal(completed.sequence, 2);
    assert.equal(completed.gateId, gateId);
    assert.equal(completed.ordinal, 1);
    assertExactKeys(
      completed.artifacts,
      ["stdout", "stderr", "result"],
      "RESULT artifacts",
    );
    for (const [role, relativePath, bytes] of [
      ["stdout", "executions/gate-0001-journal-contract/stdout.bin", stdoutBytes],
      ["stderr", "executions/gate-0001-journal-contract/stderr.bin", stderrBytes],
      ["result", "executions/gate-0001-journal-contract/result.json", resultBytes],
    ]) {
      assertFilePublicationRecord(
        completed.artifacts[role],
        runInfo,
        relativePath,
        bytes,
      );
    }
    assertExactKeys(completed.journal, [
      "relativePath",
      "path",
      "identity",
      "byteLength",
      "sha256",
      "recordCount",
      "lastFrameSha256",
      "nextEventType",
      "nextOrdinal",
    ], "RESULT journal binding");
    assertDeepFrozen(completed.journal, "RESULT journal binding");
    assert.equal(completed.journal.relativePath, journal.relativePath);
    assert.equal(completed.journal.path, journal.path);
    assertSha256(completed.journal.sha256, "RESULT journal sha256");
    assertSha256(completed.journal.lastFrameSha256, "RESULT journal lastFrameSha256");
    assert.equal(completed.journal.recordCount, 2);
    assert.equal(completed.journal.nextEventType, "COMPLETE");
    assert.equal(completed.journal.nextOrdinal, 2);
    assert.deepEqual(completed.journal.identity, journal.identity);
    assert.ok(completed.journal.byteLength > started.journal.byteLength);
    assert.notEqual(completed.journal.sha256, started.journal.sha256);
    assert.notEqual(
      completed.journal.lastFrameSha256,
      started.journal.lastFrameSha256,
    );
    const finalJournalBytes = readPhysicalFile(journal.path).bytes;
    assert.equal(finalJournalBytes.byteLength, completed.journal.byteLength);
    assert.equal(sha256(finalJournalBytes), completed.journal.sha256);
    assert.deepEqual(
      finalJournalBytes.subarray(0, startedJournalBytes.length),
      startedJournalBytes,
      "RESULT must append without rewriting the durable STARTED prefix",
    );
    const completedFrames = decodeExecutionJournal(finalJournalBytes);
    assert.equal(completedFrames.length, 3);
    assert.deepEqual(completedFrames[0], headerFrames[0]);
    assert.deepEqual(completedFrames[1], startedFrames[1]);
    assert.deepEqual(completedFrames[2].body, {
      schemaVersion: "ca.signature-lab.execution-journal-record.v1",
      recordType: "RESULT",
      sequence: 2,
      previousFrameSha256: startedFrames[1].digest,
      ordinal: 1,
      gateId,
      status: "PASS",
      exitCode: 0,
      signal: null,
      stdout: {
        relativePath: completed.artifacts.stdout.relativePath,
        identity: completed.artifacts.stdout.identity,
        byteLength: completed.artifacts.stdout.byteLength,
        sha256: completed.artifacts.stdout.sha256,
      },
      stderr: {
        relativePath: completed.artifacts.stderr.relativePath,
        identity: completed.artifacts.stderr.identity,
        byteLength: completed.artifacts.stderr.byteLength,
        sha256: completed.artifacts.stderr.sha256,
      },
      result: {
        relativePath: completed.artifacts.result.relativePath,
        identity: completed.artifacts.result.identity,
        byteLength: completed.artifacts.result.byteLength,
        sha256: completed.artifacts.result.sha256,
      },
    });
    assert.equal(completedFrames[2].digest, completed.journal.lastFrameSha256);
    assert.equal(
      processDescriptorCount(),
      workerDescriptorCount,
      "journal requests must reuse one persistent worker descriptor set",
    );
    assertRunInspection(
      await capability.inspectRetainedSignatureLabRun(runInfo.run),
      runInfo,
      "OPEN",
    );
    await capability.closeRetainedSignatureLabRun(runInfo.run);
    assert.equal(processDescriptorCount(), descriptorBaseline);
  },
);

test(
  "P1 retained evidence review: execution journal worker is append-only and state-bound",
  () => {
    const moduleSource = readFileSync(retainedEvidenceModulePath, "utf8");
    assert.match(moduleSource, /message_type\s*==\s*["']CREATE_EXECUTION_JOURNAL["']/u);
    assert.match(moduleSource, /message_type\s*==\s*["']APPEND_EXECUTION_JOURNAL["']/u);
    assert.match(
      moduleSource,
      /["']messageType["']:\s*["']EXECUTION_JOURNAL_CREATED["']/u,
    );
    assert.match(
      moduleSource,
      /["']messageType["']:\s*["']EXECUTION_JOURNAL_APPEND_RESULT["']/u,
    );

    const workerStart = moduleSource.indexOf(
      "def initialize_worker_execution_journal(journal):",
    );
    const workerEnd = moduleSource.indexOf("\ndef run_persistent_worker():", workerStart);
    assert.ok(workerStart >= 0 && workerEnd > workerStart);
    const workerJournalSource = moduleSource.slice(workerStart, workerEnd);
    assert.match(
      workerJournalSource,
      /perform_worker_batch\s*\([\s\S]*execution_journal_frame\s*\([\s\S]*write_all\(opened\["descriptor"\], frame\)/u,
      "physical artifacts must complete before the journal frame append",
    );
    assert.match(
      workerJournalSource,
      /write_all\(opened\["descriptor"\], frame\)[\s\S]*os\.fsync\(opened\["descriptor"\]\)[\s\S]*parse_execution_journal\(after_data\)[\s\S]*JOURNAL_FINAL_BINDING_VERIFIED/u,
      "journal append must be fsynced, fully parsed, and identity-bound before response",
    );
    assert.match(
      moduleSource,
      /os\.O_RDWR\s*\|\s*os\.O_APPEND\s*\|\s*os\.O_NOFOLLOW/u,
      "existing journal must open O_APPEND and O_NOFOLLOW",
    );
    assert.match(
      moduleSource,
      /os\.O_RDWR\s*\|\s*os\.O_CREAT\s*\|\s*os\.O_EXCL\s*\|\s*os\.O_NOFOLLOW/u,
      "journal and artifacts must originate as O_EXCL private singletons",
    );
    assert.doesNotMatch(
      workerJournalSource,
      /\bos\.(?:unlink|remove|rmdir|rename|replace|truncate|ftruncate)\s*\(|\bshutil\.rmtree\s*\(/u,
      "journal failure must retain the exact physical prefix without rollback",
    );

    const publicStart = moduleSource.indexOf(
      "export async function initializeRetainedSignatureLabExecutionJournal",
    );
    const publicEnd = moduleSource.indexOf(
      "\nfunction normalizeExpectedEntries",
      publicStart,
    );
    assert.ok(publicStart >= 0 && publicEnd > publicStart);
    const publicSource = moduleSource.slice(publicStart, publicEnd);
    assert.equal(
      [...publicSource.matchAll(/requestRetainedMutationWorkerJournalCreate\s*\(/gu)]
        .length,
      1,
      "journal initialization must issue exactly one persistent-worker request",
    );
    assert.equal(
      [...publicSource.matchAll(/requestRetainedMutationWorkerJournalAppend\s*\(/gu)]
        .length,
      1,
      "each journal event must issue exactly one persistent-worker request",
    );
    assert.doesNotMatch(
      publicSource,
      /\b(?:spawn|spawnSync|writeRetainedSignatureLabFile|writeRetainedSignatureLabBatch)\s*\(/u,
      "journal APIs must not spawn helpers or fall back to independent artifact writes",
    );
    assert.match(
      publicSource,
      /const nextDirectories = new Map\(state\.directories\)[\s\S]*const nextFiles = new Map\(state\.files\)[\s\S]*nextFiles\.set\(journal\.relativePath[\s\S]*state\.directories = nextDirectories[\s\S]*state\.files = nextFiles[\s\S]*state\.executionJournal =/u,
      "journal, artifacts, and directories must commit through one validated state transition",
    );
    assert.match(
      moduleSource,
      /executionJournal:\s*null/u,
      "every retained run must begin without journal append authority",
    );
  },
);

test(
  "P1 retained evidence review: 197-gate execution journal completes 394 durable ACKs on one worker",
  { timeout: 600_000 },
  async (context) => {
    const retainedCase = createRetainedCase("p1-execution-journal-197-gate-stress");
    diagnoseRetention(context, retainedCase, {
      contract: "ONE_PERSISTENT_WORKER_197_GATES_394_DURABLE_ACKS",
      plannedGateCount: 197,
      expectedRecordCount: 394,
    });
    const capability = await loadRetainedRunLifecycleCapability();
    const descriptorBaseline = processDescriptorCount();
    const runInfo = await createOpaqueRun(
      capability,
      retainedCase,
      "execution-journal-197-gate-stress",
      context,
    );
    const workerDescriptorCount = processDescriptorCount();
    const plannedGates = Array.from({ length: 197 }, (unused, index) => ({
      ordinal: index + 1,
      gateId: `gate-${String(index + 1).padStart(4, "0")}-journal-stress`,
    }));
    const journal = await capability.initializeRetainedSignatureLabExecutionJournal(
      runInfo.run,
      {
        relativePath: "executions/execution-journal.v1.bin",
        planSha256: sha256(canonicalJsonBytes(plannedGates, "stress plan")),
        plannedGates,
      },
    );
    assert.equal(journal.recordCount, 0);
    assert.equal(journal.nextEventType, "STARTED");
    assert.equal(journal.nextOrdinal, 1);
    let finalJournal = journal;
    for (const gate of plannedGates) {
      const gateDirectory = `executions/${gate.gateId}`;
      const attemptBytes = canonicalJsonBytes({
        schemaVersion: "ca.signature-lab.execution-attempt.v1",
        gateId: gate.gateId,
        ordinal: gate.ordinal,
        status: "STARTED",
      }, `${gate.gateId} attempt`);
      const started = await capability.appendRetainedSignatureLabExecutionJournal(
        runInfo.run,
        {
          eventType: "STARTED",
          ordinal: gate.ordinal,
          gateId: gate.gateId,
          attempt: {
            relativePath: `${gateDirectory}/attempt.json`,
            bytes: attemptBytes,
          },
        },
      );
      assert.equal(started.sequence, gate.ordinal * 2 - 1);
      assert.equal(started.journal.recordCount, gate.ordinal * 2 - 1);
      assert.equal(started.journal.nextEventType, "RESULT");
      assert.equal(started.journal.nextOrdinal, gate.ordinal);
      const stdoutBytes = Buffer.from(`${gate.gateId} PASS\n`, "utf8");
      const stderrBytes = Buffer.alloc(0);
      const resultBytes = canonicalJsonBytes({
        schemaVersion: "ca.signature-lab.execution-result.v1",
        gateId: gate.gateId,
        ordinal: gate.ordinal,
        status: "PASS",
        exitCode: 0,
        signal: null,
      }, `${gate.gateId} result`);
      const completed = await capability.appendRetainedSignatureLabExecutionJournal(
        runInfo.run,
        {
          eventType: "RESULT",
          ordinal: gate.ordinal,
          gateId: gate.gateId,
          status: "PASS",
          exitCode: 0,
          signal: null,
          stdout: {
            relativePath: `${gateDirectory}/stdout.bin`,
            bytes: stdoutBytes,
          },
          stderr: {
            relativePath: `${gateDirectory}/stderr.bin`,
            bytes: stderrBytes,
          },
          result: {
            relativePath: `${gateDirectory}/result.json`,
            bytes: resultBytes,
          },
        },
      );
      assert.equal(completed.sequence, gate.ordinal * 2);
      assert.equal(completed.journal.recordCount, gate.ordinal * 2);
      assert.equal(
        completed.journal.nextEventType,
        gate.ordinal === plannedGates.length ? "COMPLETE" : "STARTED",
      );
      assert.equal(completed.journal.nextOrdinal, gate.ordinal + 1);
      finalJournal = completed.journal;
      assert.equal(
        processDescriptorCount(),
        workerDescriptorCount,
        `${gate.gateId}: persistent journal worker descriptor count drift`,
      );
    }
    const finalJournalBytes = readPhysicalFile(journal.path).bytes;
    const frames = decodeExecutionJournal(finalJournalBytes);
    assert.equal(frames.length, 395);
    assert.equal(frames.at(-1).body.recordType, "RESULT");
    assert.equal(frames.at(-1).body.ordinal, 197);
    assert.equal(finalJournal.recordCount, 394);
    assert.equal(finalJournal.nextEventType, "COMPLETE");
    assert.equal(finalJournal.nextOrdinal, 198);
    assert.equal(finalJournal.byteLength, finalJournalBytes.length);
    assert.equal(finalJournal.sha256, sha256(finalJournalBytes));
    assert.equal(finalJournal.lastFrameSha256, frames.at(-1).digest);
    assertRunInspection(
      await capability.inspectRetainedSignatureLabRun(runInfo.run),
      runInfo,
      "OPEN",
    );
    await capability.closeRetainedSignatureLabRun(runInfo.run);
    assert.equal(processDescriptorCount(), descriptorBaseline);
  },
);

test(
  "P0 retained evidence review: artifact replacement at the journal barrier poisons without ACK",
  { timeout: 120_000 },
  async (context) => {
    const retainedCase = createRetainedCase("p0-journal-artifact-replacement-barrier");
    const {
      capability,
      faultModulePath,
      faultModuleSha256,
    } = await loadArtifactReplacementFaultCapability(retainedCase);
    diagnoseRetention(context, retainedCase, {
      contract: "ARTIFACT_REPLACEMENT_AFTER_BATCH_FINAL_BINDING_BEFORE_JOURNAL_APPEND",
      faultModulePath,
      faultModuleSha256,
      expectedState: "POISONED_WITHOUT_ACK",
    });
    const descriptorBaseline = processDescriptorCount();
    const runInfo = await createOpaqueRun(
      capability,
      retainedCase,
      "journal-artifact-replacement-barrier",
      context,
    );
    const gateId = "gate-0001-artifact-replacement-barrier";
    const gateDirectory = `executions/${gateId}`;
    await initializeOneGateExecutionJournal(capability, runInfo, gateId);

    const appendError = await captureRejection(() =>
      appendOneGateStarted(capability, runInfo, gateId, gateDirectory));
    assert.ok(
      appendError instanceof Error,
      "artifact replacement after batch final binding must never receive a journal ACK",
    );
    assert.match(
      appendError.message,
      /POISONED|artifact.*binding|identity drift/u,
      "artifact replacement must fail closed as one exact binding violation",
    );
    assertRunInspection(
      await capability.inspectRetainedSignatureLabRun(runInfo.run),
      runInfo,
      "POISONED",
    );

    const attemptPath = path.join(runInfo.archiveRoot, gateDirectory, "attempt.json");
    const parkedAttemptPath = `${attemptPath}.fault-original`;
    const replacement = readPhysicalFile(attemptPath);
    const parkedOriginal = readPhysicalFile(parkedAttemptPath);
    assert.notDeepEqual(
      replacement.identity,
      parkedOriginal.identity,
      "fault fixture must retain both the replacement and the displaced original identity",
    );
    assert.equal(
      replacement.bytes.toString("utf8"),
      "FAULT_REPLACEMENT_AFTER_BATCH_FINAL_BINDING\n",
    );
    assert.equal(
      processDescriptorCount(),
      descriptorBaseline,
      "poisoned journal barrier request leaked a descriptor",
    );
  },
);

test(
  "P1 retained evidence review: mismatched RESULT parent is rejected before any mutation",
  { timeout: 120_000 },
  async (context) => {
    const retainedCase = createRetainedCase("p1-journal-result-parent-preflight");
    diagnoseRetention(context, retainedCase, {
      contract: "RESULT_PARENT_EQUALS_PENDING_STARTED_PARENT_BEFORE_MUTATION",
      expectedMutationCount: 0,
    });
    const capability = await loadRetainedRunLifecycleCapability();
    const runInfo = await createOpaqueRun(
      capability,
      retainedCase,
      "journal-result-parent-preflight",
      context,
    );
    const gateId = "gate-0001-result-parent-preflight";
    const gateDirectory = `executions/${gateId}`;
    const decoyDirectory = "executions/decoy-result-parent";
    const journal = await initializeOneGateExecutionJournal(capability, runInfo, gateId);
    await capability.createRetainedSignatureLabDirectory(runInfo.run, decoyDirectory);
    await capability.writeRetainedSignatureLabFile(
      runInfo.run,
      `${decoyDirectory}/attempt.json`,
      canonicalJsonBytes({
        schemaVersion: "ca.signature-lab.execution-attempt.v1",
        gateId: "decoy-not-the-pending-gate",
        ordinal: 999,
        status: "STARTED",
      }, "decoy attempt"),
    );
    await appendOneGateStarted(capability, runInfo, gateId, gateDirectory);
    const journalBefore = readPhysicalFile(journal.path).bytes;
    const mismatchError = await captureRejection(() =>
      capability.appendRetainedSignatureLabExecutionJournal(
        runInfo.run,
        oneGateResultEvent(gateId, decoyDirectory),
      ));
    assert.ok(mismatchError instanceof Error, "mismatched RESULT parent must not ACK");
    assert.deepEqual(
      readPhysicalFile(journal.path).bytes,
      journalBefore,
      "mismatched RESULT parent must not append even one journal byte",
    );
    for (const basename of ["stdout.bin", "stderr.bin", "result.json"]) {
      assertPathMissing(path.join(runInfo.archiveRoot, decoyDirectory, basename));
    }
  },
);

test(
  "P1 retained evidence review: execution journal rejects every non-ASCII wire string before mutation",
  { timeout: 180_000 },
  async (context) => {
    const capability = await loadRetainedRunLifecycleCapability();
    const failures = [];

    {
      const retainedCase = createRetainedCase("p1-journal-non-ascii-plan-gate-id");
      diagnoseRetention(context, retainedCase, {
        contract: "ASCII_ONLY_EXECUTION_JOURNAL_GATE_ID",
      });
      const runInfo = await createOpaqueRun(
        capability,
        retainedCase,
        "journal-non-ascii-plan-gate-id",
        context,
      );
      const gateId = "gate-é";
      const plannedGates = [{ ordinal: 1, gateId }];
      await collectRejectedArchiveInvariant({
        failures,
        label: "non-ASCII planned gateId",
        runInfo,
        errorPattern: /ASCII/u,
        operation: () => capability.initializeRetainedSignatureLabExecutionJournal(
          runInfo.run,
          {
            relativePath: "executions/execution-journal.v1.bin",
            planSha256: sha256(canonicalJsonBytes(plannedGates, "non-ASCII plan")),
            plannedGates,
          },
        ),
      });
    }

    {
      const retainedCase = createRetainedCase("p1-journal-non-ascii-artifact-path");
      diagnoseRetention(context, retainedCase, {
        contract: "ASCII_ONLY_EXECUTION_JOURNAL_ARTIFACT_PATH",
      });
      const runInfo = await createOpaqueRun(
        capability,
        retainedCase,
        "journal-non-ascii-artifact-path",
        context,
      );
      const gateId = "gate-0001-ascii-path-policy";
      await initializeOneGateExecutionJournal(capability, runInfo, gateId);
      await collectRejectedArchiveInvariant({
        failures,
        label: "non-ASCII artifact path",
        runInfo,
        errorPattern: /ASCII/u,
        operation: () => appendOneGateStarted(
          capability,
          runInfo,
          gateId,
          "executions/gaté",
        ),
      });
    }

    {
      const retainedCase = createRetainedCase("p1-journal-non-ascii-signal");
      diagnoseRetention(context, retainedCase, {
        contract: "ASCII_ONLY_EXECUTION_JOURNAL_SIGNAL",
      });
      const runInfo = await createOpaqueRun(
        capability,
        retainedCase,
        "journal-non-ascii-signal",
        context,
      );
      const gateId = "gate-0001-ascii-signal-policy";
      const gateDirectory = `executions/${gateId}`;
      await initializeOneGateExecutionJournal(capability, runInfo, gateId);
      await appendOneGateStarted(capability, runInfo, gateId, gateDirectory);
      await collectRejectedArchiveInvariant({
        failures,
        label: "non-ASCII signal",
        runInfo,
        errorPattern: /ASCII/u,
        operation: () => capability.appendRetainedSignatureLabExecutionJournal(
          runInfo.run,
          oneGateResultEvent(gateId, gateDirectory, {
            status: "FAIL",
            exitCode: null,
            signal: "SÍGTERM",
          }),
        ),
      });
    }

    assert.deepEqual(failures, [], failures.join("\n"));
  },
);

test(
  "P1 retained evidence review: execution journal artifact grammar and 197-plan ceiling are exact",
  { timeout: 240_000 },
  async (context) => {
    const capability = await loadRetainedRunLifecycleCapability();
    const failures = [];
    for (const testCase of [
      {
        label: "extra artifact-parent depth",
        gateDirectory: "executions/too/deep",
        errorPattern:
          /execution journal artifact path must be executions\/<gate-directory>\/<role>/u,
      },
      {
        label: "artifact path outside executions",
        gateDirectory: "journal-gates/outside",
        errorPattern:
          /execution journal artifact path must be executions\/<gate-directory>\/<role>/u,
      },
      {
        label: "256-byte gate-directory component",
        gateDirectory: `executions/${"g".repeat(256)}`,
        errorPattern: /execution journal gate-directory exceeds 255 UTF-8 bytes/u,
      },
    ]) {
      const retainedCase = createRetainedCase(`p1-journal-${testCase.label}`);
      diagnoseRetention(context, retainedCase, {
        contract: "EXACT_EXECUTIONS_ONE_GATE_DIRECTORY_ARTIFACT_GRAMMAR",
        testCase: testCase.label,
      });
      const runInfo = await createOpaqueRun(
        capability,
        retainedCase,
        `journal-${testCase.label}`,
        context,
      );
      const gateId = `gate-0001-${safeLabel(testCase.label)}`;
      await initializeOneGateExecutionJournal(capability, runInfo, gateId);
      await collectRejectedArchiveInvariant({
        failures,
        label: testCase.label,
        runInfo,
        errorPattern: testCase.errorPattern,
        operation: () => appendOneGateStarted(
          capability,
          runInfo,
          gateId,
          testCase.gateDirectory,
        ),
      });
    }

    {
      const retainedCase = createRetainedCase("p1-journal-198-gate-plan");
      diagnoseRetention(context, retainedCase, {
        contract: "EXACT_197_GATE_PLAN_CEILING",
        rejectedPlannedGateCount: 198,
      });
      const runInfo = await createOpaqueRun(
        capability,
        retainedCase,
        "journal-198-gate-plan",
        context,
      );
      const plannedGates = Array.from({ length: 198 }, (unused, index) => ({
        ordinal: index + 1,
        gateId: `gate-${String(index + 1).padStart(4, "0")}-over-limit`,
      }));
      await collectRejectedArchiveInvariant({
        failures,
        label: "198-gate plan",
        runInfo,
        errorPattern: /between 1 and 197 gates/u,
        operation: () => capability.initializeRetainedSignatureLabExecutionJournal(
          runInfo.run,
          {
            relativePath: "executions/execution-journal.v1.bin",
            planSha256: sha256(canonicalJsonBytes(plannedGates, "198-gate plan")),
            plannedGates,
          },
        ),
      });
    }

    assert.deepEqual(failures, [], failures.join("\n"));
  },
);

test(
  "P1 retained evidence review: prospective journal limits precede artifact mutation and append",
  () => {
    const moduleSource = readFileSync(retainedEvidenceModulePath, "utf8");
    const appendStart = moduleSource.indexOf("def append_worker_execution_journal(append, stream):");
    const appendEnd = moduleSource.indexOf("\ndef run_persistent_worker():", appendStart);
    assert.ok(appendStart >= 0 && appendEnd > appendStart);
    const appendSource = moduleSource.slice(appendStart, appendEnd);
    const artifactMutation = appendSource.indexOf("batch_result = perform_worker_batch(");
    const framePreflight = appendSource.indexOf("WORKER_MAX_FRAME_BYTES");
    const frameConstruction = appendSource.indexOf("frame, frame_sha256 = execution_journal_frame");
    const journalAppend = appendSource.indexOf('write_all(opened["descriptor"], frame)');
    const prospectiveJournalLimit = appendSource.indexOf(
      "MAX_JOURNAL_BYTES",
      frameConstruction,
    );
    const failures = [];
    if (!(framePreflight >= 0 && framePreflight < artifactMutation)) {
      failures.push(
        "the conservative 1 MiB frame bound must be checked before artifact mutation",
      );
    }
    if (!(prospectiveJournalLimit > frameConstruction &&
          prospectiveJournalLimit < journalAppend)) {
      failures.push(
        "len(before_data) + len(frame) must be checked against 64 MiB before O_APPEND",
      );
    }
    assert.deepEqual(failures, [], failures.join("\n"));
  },
);

test(
  "P1 retained evidence review: execution RESULT status fields obey exact process truth",
  { timeout: 180_000 },
  async (context) => {
    const capability = await loadRetainedRunLifecycleCapability();
    const failures = [];
    for (const testCase of [
      {
        label: "PASS with nonzero exitCode",
        overrides: { status: "PASS", exitCode: 1, signal: null },
        errorPattern: /PASS requires exitCode 0 and signal null/u,
      },
      {
        label: "signaled RESULT with non-null exitCode",
        overrides: { status: "FAIL", exitCode: 0, signal: "SIGTERM" },
        errorPattern: /signaled RESULT requires exitCode null/u,
      },
    ]) {
      const retainedCase = createRetainedCase(`p1-journal-${testCase.label}`);
      diagnoseRetention(context, retainedCase, {
        contract: "EXACT_RESULT_PROCESS_TRUTH",
        testCase: testCase.label,
      });
      const runInfo = await createOpaqueRun(
        capability,
        retainedCase,
        `journal-${testCase.label}`,
        context,
      );
      const gateId = `gate-0001-${safeLabel(testCase.label)}`;
      const gateDirectory = `executions/${gateId}`;
      await initializeOneGateExecutionJournal(capability, runInfo, gateId);
      await appendOneGateStarted(capability, runInfo, gateId, gateDirectory);
      await collectRejectedArchiveInvariant({
        failures,
        label: testCase.label,
        runInfo,
        errorPattern: testCase.errorPattern,
        operation: () => capability.appendRetainedSignatureLabExecutionJournal(
          runInfo.run,
          oneGateResultEvent(gateId, gateDirectory, testCase.overrides),
        ),
      });
    }
    assert.deepEqual(failures, [], failures.join("\n"));
  },
);

test(
  "P1 retained evidence review: sealing remains inspectable until explicit close",
  async (context) => {
    const retainedCase = createRetainedCase("p1-run-post-seal-inspection");
    diagnoseRetention(context, retainedCase, {
      lifecycle: "SEALED_OPEN_UNTIL_EXPLICIT_CLOSE",
    });
    const capability = await loadRetainedRunLifecycleCapability();
    const descriptorBaseline = processDescriptorCount();
    const runInfo = await createOpaqueRun(
      capability,
      retainedCase,
      "post-seal-inspection",
      context,
    );
    await capability.createRetainedSignatureLabDirectory(runInfo.run, "gate");
    await capability.writeRetainedSignatureLabFile(
      runInfo.run,
      "gate/result.json",
      Buffer.from('{"status":"PASS"}\n', "utf8"),
    );
    const sealed = await capability.sealRetainedSignatureLabEvidence({
      run: runInfo.run,
      outcome: PASS_RETAINED_SEALED_ARCHIVE,
      provenance: {
        schemaVersion: "ca.signature-lab.retained-provenance.v1",
        contractCase: "post-seal-inspection",
      },
    });
    assert.equal(sealed.outcome, PASS_RETAINED_SEALED_ARCHIVE);
    assertRunInspection(
      await capability.inspectRetainedSignatureLabRun(runInfo.run),
      runInfo,
      "OPEN",
    );
    assert.ok(
      processDescriptorCount() >= descriptorBaseline + 3,
      "the sealed run must retain exact descriptor authority until its caller closes it",
    );
    assertRunInspection(
      await capability.closeRetainedSignatureLabRun(runInfo.run),
      runInfo,
      "CLOSED",
    );
    assert.equal(processDescriptorCount(), descriptorBaseline);
  },
);

test(
  "P1 retained evidence review: intermediate symlink cannot redirect archive writes",
  async (context) => {
    const retainedCase = createRetainedCase("p1-run-intermediate-symlink");
    diagnoseRetention(context, retainedCase, {
      attack: "ARCHIVE_INTERMEDIATE_SYMLINK_OUTSIDE_WRITE",
    });
    const capability = await loadRetainedRunCapability();
    const runInfo = await createOpaqueRun(
      capability,
      retainedCase,
      "intermediate-symlink",
      context,
    );
    const guardRecord = await capability.createRetainedSignatureLabDirectory(
      runInfo.run,
      "guard",
    );
    assertDirectoryPublicationRecord(guardRecord, runInfo, "guard");

    const outside = path.join(retainedCase.caseRoot, "outside");
    makePrivateDirectory(outside);
    const outsideSentinel = path.join(outside, "sentinel.txt");
    writePrivateFile(outsideSentinel, "outside sentinel must remain unchanged\n");
    const guardPath = path.join(runInfo.archiveRoot, "guard");
    const parkedGuard = path.join(runInfo.archiveRoot, "guard-original-parked");
    renameSync(guardPath, parkedGuard);
    symlinkSync(outside, guardPath);
    assert.equal(lstatSync(guardPath).isSymbolicLink(), true);

    await assertSafetyRejection(() =>
      capability.writeRetainedSignatureLabFile(
        runInfo.run,
        "guard/redirected.bin",
        Buffer.from("must never reach outside\n", "utf8"),
      ),
    );
    assert.equal(
      readPhysicalFile(outsideSentinel).bytes.toString("utf8"),
      "outside sentinel must remain unchanged\n",
    );
    assertPathMissing(path.join(outside, "redirected.bin"));
    assert.deepEqual(readdirSync(outside), ["sentinel.txt"]);
    assert.deepEqual(readdirSync(parkedGuard), []);
    assert.deepEqual(readdirSync(runInfo.evidenceRoot), []);
  },
);

test(
  "P1 retained evidence review: external receipt rejects evidence root replacement",
  async (context) => {
    const fixture = makeSealableArchive(context, "p1-external-receipt-replacement");
    const capability = await loadRetainedEvidenceCapability();
    const archiveBefore = snapshotArchive(fixture.archiveRoot);
    const result = await capability.sealRetainedSignatureLabEvidence(
      expectedSealArguments(fixture),
    );
    const receipt = assertExternalReceipt(result, fixture.evidenceRoot);
    const moduleSource = readPhysicalFile(retainedEvidenceModulePath, null).bytes.toString(
      "utf8",
    );
    assert.match(moduleSource, /externalReceipt/u);
    assert.match(
      moduleSource,
      /(?:REVALIDAT|revalidat)[\s\S]{0,12000}?(?:ROOT_FD|dir_fd)[\s\S]{0,3000}?O_NOFOLLOW/iu,
      "revalidation must bind basenames and reads beneath one held evidence descriptor",
    );

    await assertSafetyRejection(() =>
      capability.revalidateRetainedSignatureLabEvidence({
        manifestPath: result.manifestPath,
        sealPath: result.sealPath,
        reportPath: result.reportPath,
      }),
    );
    const clean = await capability.revalidateRetainedSignatureLabEvidence({
      manifestPath: result.manifestPath,
      sealPath: result.sealPath,
      reportPath: result.reportPath,
      externalReceipt: receipt,
    });
    assert.equal(clean.valid, true);

    const originalEvidenceRootIdentity = normalizeIdentity(
      lstatSync(fixture.evidenceRoot, { bigint: true }),
      "directory",
    );
    const sidecars = [result.manifestPath, result.reportPath, result.sealPath];
    const originalBytes = new Map(
      sidecars.map((sidecarPath) => [path.basename(sidecarPath), readPhysicalFile(sidecarPath).bytes]),
    );
    const parkedEvidenceRoot = path.join(
      fixture.caseRoot,
      "external-evidence-original-parked",
    );
    renameSync(fixture.evidenceRoot, parkedEvidenceRoot);
    makePrivateDirectory(fixture.evidenceRoot);
    const parkedEvidenceRootIdentity = normalizeIdentity(
      lstatSync(parkedEvidenceRoot, { bigint: true }),
      "directory",
    );
    const replacementEvidenceRootIdentity = normalizeIdentity(
      lstatSync(fixture.evidenceRoot, { bigint: true }),
      "directory",
    );
    assert.equal(parkedEvidenceRootIdentity.dev, originalEvidenceRootIdentity.dev);
    assert.equal(parkedEvidenceRootIdentity.ino, originalEvidenceRootIdentity.ino);
    assert.notEqual(
      replacementEvidenceRootIdentity.ino,
      originalEvidenceRootIdentity.ino,
      "same-name replacement evidence root must have a distinct physical identity",
    );
    for (const [basename, bytes] of originalBytes) {
      writePrivateFile(path.join(fixture.evidenceRoot, basename), bytes);
    }

    await assertSafetyRejection(() =>
      capability.revalidateRetainedSignatureLabEvidence({
        manifestPath: result.manifestPath,
        sealPath: result.sealPath,
        reportPath: result.reportPath,
        externalReceipt: receipt,
      }),
    );

    for (const [basename, bytes] of originalBytes) {
      assert.deepEqual(readPhysicalFile(path.join(parkedEvidenceRoot, basename)).bytes, bytes);
      assert.deepEqual(
        readPhysicalFile(path.join(fixture.evidenceRoot, basename)).bytes,
        bytes,
        `same-name replacement ${basename} must remain byte-identical and parseable`,
      );
      assert.notEqual(
        lstatSync(path.join(parkedEvidenceRoot, basename), { bigint: true }).ino,
        lstatSync(path.join(fixture.evidenceRoot, basename), { bigint: true }).ino,
        `replacement ${basename} must have a distinct physical identity`,
      );
    }
    assert.deepEqual(snapshotArchive(fixture.archiveRoot), archiveBefore);
  },
);

test(
  "P1 retained evidence review: mutation timeout preserves the exact last helper stage",
  () => {
    const moduleSource = readPhysicalFile(
      retainedEvidenceModulePath,
      null,
    ).bytes.toString("utf8");
    const helperStart = moduleSource.indexOf(
      "const RETAINED_RUN_MUTATION_PYTHON_SOURCE",
    );
    const helperEnd = moduleSource.indexOf(
      "\n`;\n\nconst EVIDENCE_REVALIDATION_PYTHON_SOURCE",
      helperStart,
    );
    assert.ok(helperStart >= 0 && helperEnd > helperStart);
    const helperSource = moduleSource.slice(helperStart, helperEnd);
    assert.match(
      moduleSource,
      /const RETAINED_MUTATION_PROGRESS_FD = 4;/u,
    );
    assert.match(
      helperSource,
      /PROGRESS_FD = 4[\s\S]*def publish_progress\(stage\):/u,
    );
    const expectedWriteStages = [
      "WORKER_STARTED",
      "REQUEST_READ",
      "REQUEST_VALIDATED",
      "ROOT_BOUND",
      "DIRECTORIES_BOUND",
      "TARGET_ABSENCE_CONFIRMED",
      "INPUT_SIZE_VALIDATED",
      "INPUT_HASH_VERIFIED",
      "TARGET_OPENED",
      "FILE_WRITTEN",
      "FILE_FSYNCED",
      "FILE_READBACK_VERIFIED",
      "DIRECTORIES_FSYNCED",
      "FINAL_BINDING_VERIFIED",
      "RESULT_EMITTED",
    ];
    let previousStageIndex = -1;
    for (const stage of expectedWriteStages) {
      const stageIndex = helperSource.indexOf(`publish_progress("${stage}")`);
      assert.ok(
        stageIndex > previousStageIndex,
        `mutation helper progress stage is missing or out of order: ${stage}`,
      );
      previousStageIndex = stageIndex;
    }
    assert.match(
      moduleSource,
      /stdio:\s*\["pipe", "pipe", "pipe", descriptor, "pipe"\]/u,
    );
    assert.match(
      moduleSource,
      /lastProgressStage/u,
    );

    const progressRecord = `${JSON.stringify({
      schemaVersion: "ca.signature-lab.retained-mutation-progress.v1",
      stage: "ROOT_BOUND",
    })}\n`;
    const probeSource = [
      "import os",
      "import time",
      `os.write(4, ${JSON.stringify(progressRecord)}.encode(\"utf-8\"))`,
      "time.sleep(2)",
    ].join("\n");
    const execution = spawnSync(
      "/usr/bin/python3",
      ["-I", "-S", "-E", "-B", "-c", probeSource],
      {
        cwd: "/",
        encoding: "utf8",
        env: { LANG: "C", LC_ALL: "C", PATH: "/usr/bin:/bin" },
        timeout: 250,
        stdio: ["ignore", "pipe", "pipe", "ignore", "pipe"],
      },
    );
    assert.equal(execution.error?.code, "ETIMEDOUT");
    assert.equal(execution.output[4], progressRecord);
  },
);

test(
  "P1 retained evidence review: 400 sequential durable writes expose the exact timeout stage",
  { timeout: 600_000 },
  async (context) => {
    const retainedCase = createRetainedCase("p1-sequential-write-progress");
    diagnoseRetention(context, retainedCase, {
      contract: "SEQUENTIAL_DURABLE_MUTATION_PROGRESS_AND_COMPLETION",
      expectedWriteCount: 400,
      bytesPerWrite: 53_150,
    });
    const capability = await loadRetainedRunLifecycleCapability();
    const runInfo = await createOpaqueRun(
      capability,
      retainedCase,
      "sequential-write-progress",
      context,
    );
    await capability.createRetainedSignatureLabDirectory(runInfo.run, "snapshots");
    const bytes = Buffer.alloc(53_150, 0x4e);
    for (let index = 0; index < 400; index += 1) {
      const relativePath = `snapshots/snapshot-${String(index).padStart(3, "0")}.bin`;
      const publication = await capability.writeRetainedSignatureLabFile(
        runInfo.run,
        relativePath,
        bytes,
      );
      assertFilePublicationRecord(publication, runInfo, relativePath, bytes);
    }
    assertRunInspection(
      await capability.inspectRetainedSignatureLabRun(runInfo.run),
      runInfo,
      "OPEN",
    );
    assertRunInspection(
      await capability.closeRetainedSignatureLabRun(runInfo.run),
      runInfo,
      "CLOSED",
    );
  },
);

test(
  "P1 retained evidence review: retained mutation budget is bounded for the exact assignment archive",
  async () => {
    const moduleSource = readPhysicalFile(
      retainedEvidenceModulePath,
      null,
    ).bytes.toString("utf8");
    assert.match(
      moduleSource,
      /const MAX_RETAINED_SIGNATURE_LAB_FILE_BYTES = 64 \* 1024 \* 1024;/u,
    );
    assert.match(moduleSource, /const RETAINED_MKDIR_TIMEOUT_MS = 60_000;/u);
    assert.match(moduleSource, /const RETAINED_WRITE_TIMEOUT_BASE_MS = 120_000;/u);
    assert.match(
      moduleSource,
      /const RETAINED_WRITE_TIMEOUT_PER_STARTED_MIB_MS = 1_000;/u,
    );
    assert.match(moduleSource, /const RETAINED_WRITE_TIMEOUT_MAX_MS = 180_000;/u);
    assert.match(
      moduleSource,
      /function retainedSignatureLabMutationTimeoutMs\(operation, byteLength\)/u,
    );
    const policyStart = moduleSource.indexOf(
      "function retainedSignatureLabMutationTimeoutMs(operation, byteLength)",
    );
    const policyEnd = moduleSource.indexOf(
      "\n}\n\nconst ARCHIVE_INVENTORY_PYTHON_SOURCE",
      policyStart,
    );
    assert.ok(policyStart >= 0 && policyEnd > policyStart);
    const policySource = moduleSource.slice(policyStart, policyEnd + 2);
    assert.match(
      policySource,
      /if \(operation === "mkdir"\) \{[\s\S]*return RETAINED_MKDIR_TIMEOUT_MS;/u,
    );
    assert.match(
      policySource,
      /if \(byteLength > MAX_RETAINED_SIGNATURE_LAB_FILE_BYTES\) \{[\s\S]*maximum retained file size of 64 MiB/u,
    );
    assert.match(
      policySource,
      /return Math\.min\(\s*RETAINED_WRITE_TIMEOUT_MAX_MS,\s*RETAINED_WRITE_TIMEOUT_BASE_MS \+\s*Math\.ceil\(byteLength \/ \(1024 \* 1024\)\) \*\s*RETAINED_WRITE_TIMEOUT_PER_STARTED_MIB_MS,\s*\);/u,
    );
    const reviewedTimeout = (byteLength) => Math.min(
      180_000,
      120_000 + Math.ceil(byteLength / (1024 * 1024)) * 1_000,
    );
    assert.equal(reviewedTimeout(2_321_701), 123_000);
    assert.equal(reviewedTimeout(EXACT_ASSIGNMENT_ARCHIVE_BYTE_LENGTH), 175_000);
    assert.equal(reviewedTimeout(MAX_RETAINED_WRITE_BYTES), 180_000);
    const writeStart = moduleSource.indexOf(
      "export async function writeRetainedSignatureLabFile",
    );
    const writeEnd = moduleSource.indexOf("\nexport ", writeStart + 1);
    assert.ok(writeStart >= 0 && writeEnd > writeStart);
    const writeSource = moduleSource.slice(writeStart, writeEnd);
    assert.ok(
      writeSource.indexOf("retainedSignatureLabMutationTimeoutMs") >= 0 &&
        writeSource.indexOf("Buffer.from(bytes)") >
          writeSource.indexOf("retainedSignatureLabMutationTimeoutMs"),
      "the retained byte cap must run before the owned Buffer copy",
    );

    const mutationStart = moduleSource.indexOf("function mutateRetainedRun");
    const mutationEnd = moduleSource.indexOf(
      "\nexport async function createRetainedSignatureLabDirectory",
      mutationStart,
    );
    assert.ok(mutationStart >= 0 && mutationEnd > mutationStart);
    const mutationSource = moduleSource.slice(mutationStart, mutationEnd);
    const mutationTimeoutIndex = mutationSource.indexOf(
      "const timeout = retainedSignatureLabMutationTimeoutMs(operation, bytes.length)",
    );
    const mutationDigestIndex = mutationSource.indexOf("const digest = sha256(bytes)");
    assert.ok(
      mutationTimeoutIndex >= 0 && mutationDigestIndex > mutationTimeoutIndex,
      "the size-tiered worker timeout must be selected before digest/payload work",
    );
    assert.match(
      mutationSource,
      /await\s+requestRetainedMutationWorkerMutation\([\s\S]*?bytes,\s*timeout,\s*\)/u,
      "the retained mutation must send the owned raw payload through the bounded worker request",
    );
    assert.doesNotMatch(
      mutationSource,
      /\bexecuteDescriptorHelper\s*\(|\bspawnSync\s*\(|\.toString\(["']base64["']\)/u,
      "the live mutation path must not launch or base64-feed a one-shot helper",
    );
    assert.doesNotMatch(mutationSource, /timeout:\s*30_000/u);
    const helperStart = moduleSource.indexOf(
      "const RETAINED_RUN_MUTATION_PYTHON_SOURCE",
    );
    const helperEnd = moduleSource.indexOf(
      "\n`;\n\nconst EVIDENCE_REVALIDATION_PYTHON_SOURCE",
      helperStart,
    );
    assert.ok(helperStart >= 0 && helperEnd > helperStart);
    const helperSource = moduleSource.slice(helperStart, helperEnd);
    assert.match(
      helperSource,
      /^MAX_RETAINED_WRITE_BYTES = 64 \* 1024 \* 1024$/mu,
    );
    assert.match(
      helperSource,
      /^WORKER_MAX_FRAME_BYTES = 1024 \* 1024$/mu,
      "worker control envelopes must have a separate 1 MiB cap",
    );
    const workerStart = helperSource.indexOf("def run_persistent_worker():");
    const workerEnd = helperSource.indexOf(
      "\n\nrequire(len(sys.argv)",
      workerStart,
    );
    assert.ok(workerStart >= 0 && workerEnd > workerStart);
    const workerSource = helperSource.slice(workerStart, workerEnd);
    const payloadBoundIndex = workerSource.indexOf(
      '0 <= mutation["byteLength"] <= MAX_RETAINED_WRITE_BYTES',
    );
    const payloadReadIndex = workerSource.indexOf(
      'data = read_exact(sys.stdin.buffer, mutation["byteLength"])',
    );
    const mutationCallIndex = workerSource.indexOf(
      "result = perform_worker_mutation(mutation, data)",
    );
    assert.ok(
      payloadBoundIndex >= 0 && payloadReadIndex > payloadBoundIndex &&
        mutationCallIndex > payloadReadIndex,
      "the worker must cap the announced payload before reading raw bytes or mutating",
    );
    const performStart = helperSource.indexOf("def perform_worker_mutation(request, data):");
    const performEnd = helperSource.indexOf("\n\ndef run_persistent_worker():", performStart);
    assert.ok(performStart >= 0 && performEnd > performStart);
    const performSource = helperSource.slice(performStart, performEnd);
    const exactLengthIndex = performSource.indexOf(
      'len(data) == request["byteLength"]',
    );
    const digestCheckIndex = performSource.indexOf(
      'hashlib.sha256(data).hexdigest() == request["sha256"]',
    );
    const rootBindingIndex = performSource.indexOf("root_before_value = os.fstat(ROOT_FD)");
    assert.ok(
      exactLengthIndex >= 0 && digestCheckIndex > exactLengthIndex &&
        rootBindingIndex > digestCheckIndex,
      "payload length and digest must be verified before descriptor-relative namespace mutation",
    );
    assert.doesNotMatch(
      workerSource,
      /base64|json\.load\(sys\.stdin\)/u,
      "the persistent worker must not use base64 or EOF-delimited request input",
    );
    // The transitional one-shot branch may remain for non-mutation provenance, but it
    // is not authoritative for retained-run writes.
    assert.match(
      helperSource,
      /^MAX_RETAINED_WRITE_BASE64_CHARACTERS = 89_478_488$/mu,
    );
  },
);

test(
  "P1 retained evidence review: exact assignment-sized write is durable and oversize is rejected before mutation",
  { timeout: 300_000 },
  async (context) => {
    const retainedCase = createRetainedCase("p1-exact-assignment-archive-write");
    diagnoseRetention(context, retainedCase, {
      contract: "EXACT_ASSIGNMENT_ARCHIVE_CAPACITY_AND_PREALLOCATION_BOUND",
    });
    const capability = await loadRetainedRunLifecycleCapability();
    const runInfo = await createOpaqueRun(
      capability,
      retainedCase,
      "exact-assignment-archive-write",
      context,
    );
    await capability.createRetainedSignatureLabDirectory(runInfo.run, "inputs");

    let exactBytes = Buffer.alloc(EXACT_ASSIGNMENT_ARCHIVE_BYTE_LENGTH, 0x5a);
    const expectedSha256 = sha256(exactBytes);
    const publication = await capability.writeRetainedSignatureLabFile(
      runInfo.run,
      "inputs/assignment-archive.v1.bin",
      exactBytes,
    );
    assertFilePublicationRecord(
      publication,
      runInfo,
      "inputs/assignment-archive.v1.bin",
      exactBytes,
    );
    assert.equal(publication.byteLength, EXACT_ASSIGNMENT_ARCHIVE_BYTE_LENGTH);
    assert.equal(publication.sha256, expectedSha256);
    exactBytes = Buffer.alloc(0);

    const oversizedTarget = path.join(runInfo.archiveRoot, "inputs", "oversized.bin");
    await assert.rejects(
      capability.writeRetainedSignatureLabFile(
        runInfo.run,
        "inputs/oversized.bin",
        new Uint8Array(MAX_RETAINED_WRITE_BYTES + 1),
      ),
      /64 MiB|maximum retained file size/u,
    );
    assertPathMissing(oversizedTarget);
    assertRunInspection(
      await capability.inspectRetainedSignatureLabRun(runInfo.run),
      runInfo,
      "OPEN",
    );
    assertRunInspection(
      await capability.closeRetainedSignatureLabRun(runInfo.run),
      runInfo,
      "CLOSED",
    );
  },
);
