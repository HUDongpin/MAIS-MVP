import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  EXACT_BOUND_ASSIGNMENT_CAPSULE_SHA256,
  EXACT_BOUND_ASSIGNMENT_CAPSULE_SOURCE,
  EXPECTED_ASSIGNMENT_COMPILER_CONTENT_SHA256,
  EXPECTED_ASSIGNMENT_COMPILER_NAMES_SHA256,
  EXPECTED_ASSIGNMENT_COMPILER_OPTIONS,
  EXPECTED_ASSIGNMENT_COMPILER_SOURCE_PATHS,
  EXPECTED_ASSIGNMENT_DECLARATION_CONTENT_SHA256,
  EXPECTED_ASSIGNMENT_DECLARATION_NAMES_SHA256,
  EXPECTED_ASSIGNMENT_DECLARATION_PATHS,
  EXPECTED_ASSIGNMENT_PROJECT_GRAPH_CONTENT_SHA256,
  EXPECTED_ASSIGNMENT_PROJECT_GRAPH_NAMES_SHA256,
  EXPECTED_ASSIGNMENT_PROJECT_SOURCE_PATHS,
  EXPECTED_ASSIGNMENT_RUNTIME_EDGES,
  EXPECTED_ASSIGNMENT_RUNTIME_EDGES_SHA256,
  EXPECTED_ASSIGNMENT_RUNTIME_GRAPH_NAMES_SHA256,
  EXPECTED_ASSIGNMENT_RUNTIME_SOURCE_PATHS,
  EXPECTED_TYPESCRIPT_BUNDLE_BYTE_LENGTH,
  EXPECTED_TYPESCRIPT_BUNDLE_SHA256,
  EXPECTED_TYPESCRIPT_VERSION,
  buildCanonicalAssignmentArchive,
  parseCanonicalAssignmentArchive,
  runExactBoundSignatureAssignment,
} from "./signature-lab-assignment-execution-capsule.mjs";

const EXPECTED_MODULE_SHA256 =
  "f2bcde21fbffe73e2f6a28ca3fdc317ee039149e994a59e61b296650018d91ae";
const EXPECTED_CAPSULE_SHA256 =
  "0812577c6258fad840d5bd465f65598c6b89cce1258b3517315ef98268e352ae";
const EXPECTED_ARCHIVE_SHA256 =
  "bea52ca6c5ba8c5425e3fc40ffc322bedc61b23ddb71d75baf7a9e4bbf261983";
const EXPECTED_ARCHIVE_BYTE_LENGTH = 57_499_068;
const EXPECTED_ARCHIVE_HEADER_SHA256 =
  "453190462c467767ac2f61133ba93b10c3d41ddbfb70ad33307e5ab833684db7";
const EXPECTED_ARCHIVE_HEADER_BYTE_LENGTH = 149_289;
const EXPECTED_PROJECT_SOURCE_COUNT = 53;
const EXPECTED_DECLARATION_COUNT = 603;
const EXPECTED_COMPILER_ENTRY_COUNT = 656;
const EXPECTED_RUNTIME_SOURCE_COUNT = 52;
const EXPECTED_RUNTIME_EDGE_COUNT = 63;
const EXPECTED_CONTRACT_TEST_NAMES = Object.freeze([
  "every referenced bench is actually ported",
  "primary is never also listed as related, and related has no duplicates",
  "every assignment carries a curation rationale",
  "every assigned topic id exists in the visualization catalog",
  "assigned topics render as signature labs; unassigned topics do not",
  "getSignatureLabAssignment resolves assigned topics and rejects others",
]);

const modulePath = fileURLToPath(new URL(
  "./signature-lab-assignment-execution-capsule.mjs",
  import.meta.url,
));
const projectRoot = realpathSync(fileURLToPath(new URL("../", import.meta.url)));
const projectTmpRoot = realpathSync(path.join(projectRoot, ".tmp"));
const typescriptBundlePath = path.join(
  projectRoot,
  "node_modules/typescript/lib/typescript.js",
);
const evidenceDirectoryInput =
  process.env.SIGNATURE_LAB_ASSIGNMENT_CONTRACT_TMPDIR;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalNameManifest(names) {
  return Buffer.from(`${names.join("\n")}\n`, "utf8");
}

function canonicalRuntimeEdgeManifest(edges) {
  return Buffer.from(`${edges.map((edge) => edge.join("\t")).join("\n")}\n`, "utf8");
}

function immutableIdentity(stats) {
  return {
    dev: stats.dev,
    gid: stats.gid,
    ino: stats.ino,
    mode: stats.mode,
    mtimeNs: stats.mtimeNs,
    ctimeNs: stats.ctimeNs,
    nlink: stats.nlink,
    size: stats.size,
    uid: stats.uid,
  };
}

function assertStableIdentity(actual, expected, label) {
  assert.deepEqual(immutableIdentity(actual), immutableIdentity(expected), label);
}

function stableReadRegularFile(filePath, label) {
  const descriptor = openSync(
    filePath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  );
  try {
    const before = fstatSync(descriptor, { bigint: true });
    assert.equal(before.isFile(), true, `${label}: expected a regular file`);
    assert.equal(before.nlink >= 1n, true, `${label}: expected a linked file`);
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor, { bigint: true });
    assertStableIdentity(after, before, `${label}: identity changed during read`);
    assert.equal(BigInt(bytes.length), before.size, `${label}: byte length changed during read`);
    return bytes;
  } finally {
    closeSync(descriptor);
  }
}

function isDeeplyFrozen(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return true;
  seen.add(value);
  if (!Object.isFrozen(value)) return false;
  return Object.values(value).every((nested) => isDeeplyFrozen(nested, seen));
}

function assertSortedUniqueRelativePaths(values, expectedCount, label) {
  assert.equal(Object.isFrozen(values), true, `${label}: export must be frozen`);
  assert.equal(values.length, expectedCount, `${label}: count drifted`);
  assert.equal(new Set(values).size, values.length, `${label}: duplicate path`);
  assert.deepEqual(values, [...values].sort(), `${label}: paths are not sorted`);
  for (const relativePath of values) {
    assert.equal(path.posix.isAbsolute(relativePath), false, `${label}: absolute path`);
    assert.equal(relativePath.includes("\\"), false, `${label}: non-POSIX path`);
    assert.equal(path.posix.normalize(relativePath), relativePath, `${label}: path drifted`);
    assert.equal(
      relativePath.split("/").some((part) => part === "" || part === "." || part === ".."),
      false,
      `${label}: escaping path`,
    );
  }
}

function writeExclusiveArchive(filePath, bytes) {
  const descriptor = openSync(
    filePath,
    fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_NOFOLLOW,
    0o600,
  );
  try {
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
    const identity = fstatSync(descriptor, { bigint: true });
    assert.equal(identity.isFile(), true, "retained archive must be a regular file");
    assert.equal(identity.nlink, 1n, "retained archive must have exactly one link");
    assert.equal(identity.size, BigInt(bytes.length), "retained archive length drifted");
    assert.equal(Number(identity.mode & 0o777n), 0o600, "retained archive mode drifted");
  } finally {
    closeSync(descriptor);
  }
}

function executeBoundMode({ archivePath, childEnvironment, mode, typescriptPath }) {
  let typescriptDescriptor;
  let archiveDescriptor;
  try {
    typescriptDescriptor = openSync(
      typescriptPath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    );
    const typescriptBefore = fstatSync(typescriptDescriptor, { bigint: true });
    assert.equal(typescriptBefore.isFile(), true, `${mode}: FD3 is not regular`);
    archiveDescriptor = openSync(
      archivePath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    );
    const archiveBefore = fstatSync(archiveDescriptor, { bigint: true });
    assert.equal(archiveBefore.isFile(), true, `${mode}: FD4 is not regular`);
    const execution = runExactBoundSignatureAssignment({
      nodePath: realpathSync(process.execPath),
      typescriptFd: typescriptDescriptor,
      archiveFd: archiveDescriptor,
      mode,
      expectedArchiveSha256: EXPECTED_ARCHIVE_SHA256,
      cwd: projectRoot,
      environment: childEnvironment,
    });
    assertStableIdentity(
      fstatSync(typescriptDescriptor, { bigint: true }),
      typescriptBefore,
      `${mode}: FD3 identity changed during execution`,
    );
    assertStableIdentity(
      fstatSync(archiveDescriptor, { bigint: true }),
      archiveBefore,
      `${mode}: FD4 identity changed during execution`,
    );
    return execution;
  } finally {
    if (archiveDescriptor !== undefined) closeSync(archiveDescriptor);
    if (typescriptDescriptor !== undefined) closeSync(typescriptDescriptor);
  }
}

function assertSuccessfulExecution(execution, mode) {
  assert.equal(execution.error, undefined, `${mode}: spawn error`);
  assert.equal(execution.signal, null, `${mode}: unexpected signal`);
  assert.equal(execution.status, 0, `${mode}: nonzero exit status`);
  assert.equal(execution.stderr.length, 0, `${mode}: unexpected stderr`);
}

function validateTap(stdout) {
  assert.equal(stdout.startsWith("TAP version 13\n"), true, "TAP version drifted");
  const lines = stdout.split(/\r?\n/u);
  const names = lines
    .filter((line) => line.startsWith("# Subtest: "))
    .map((line) => line.slice("# Subtest: ".length));
  assert.deepEqual(names, EXPECTED_CONTRACT_TEST_NAMES, "TAP subtest names drifted");
  const summary = new Map();
  for (const line of lines) {
    const match = /^# (tests|suites|pass|fail|cancelled|skipped|todo) (\d+)$/u.exec(line);
    if (match) summary.set(match[1], Number(match[2]));
  }
  assert.deepEqual(
    Object.fromEntries([...summary].sort(([left], [right]) => left.localeCompare(right))),
    {
      cancelled: 0,
      fail: 0,
      pass: EXPECTED_CONTRACT_TEST_NAMES.length,
      skipped: 0,
      suites: 0,
      tests: EXPECTED_CONTRACT_TEST_NAMES.length,
      todo: 0,
    },
    "TAP summary drifted",
  );
  assert.equal(lines.some((line) => line.startsWith("not ok ")), false, "TAP reported RED");
}

test("assignment execution capsule preserves its descriptor-only behavior contract", {
  timeout: 120_000,
}, () => {
  assert.equal(
    sha256(stableReadRegularFile(modulePath, "assignment capsule module")),
    EXPECTED_MODULE_SHA256,
    "assignment capsule module hash drifted",
  );
  assert.equal(EXPECTED_TYPESCRIPT_VERSION, "5.8.3");
  assert.equal(EXPECTED_TYPESCRIPT_BUNDLE_BYTE_LENGTH, 9_066_411);
  assert.equal(
    EXPECTED_TYPESCRIPT_BUNDLE_SHA256,
    "dd17428736a07e1db1a138d8a14295ddb2699ba780ee15038acdd2c6da5373a0",
  );
  assert.equal(EXACT_BOUND_ASSIGNMENT_CAPSULE_SHA256, EXPECTED_CAPSULE_SHA256);
  assert.equal(
    sha256(Buffer.from(EXACT_BOUND_ASSIGNMENT_CAPSULE_SOURCE, "utf8")),
    EXPECTED_CAPSULE_SHA256,
  );

  assertSortedUniqueRelativePaths(
    EXPECTED_ASSIGNMENT_PROJECT_SOURCE_PATHS,
    EXPECTED_PROJECT_SOURCE_COUNT,
    "project source graph",
  );
  assertSortedUniqueRelativePaths(
    EXPECTED_ASSIGNMENT_DECLARATION_PATHS,
    EXPECTED_DECLARATION_COUNT,
    "declaration graph",
  );
  assert.equal(
    EXPECTED_ASSIGNMENT_DECLARATION_PATHS.every((entry) =>
      entry.startsWith("node_modules/") && entry.endsWith(".d.ts")),
    true,
    "declaration graph escaped reviewed package declarations",
  );
  assertSortedUniqueRelativePaths(
    EXPECTED_ASSIGNMENT_COMPILER_SOURCE_PATHS,
    EXPECTED_COMPILER_ENTRY_COUNT,
    "compiler graph",
  );
  assert.deepEqual(
    EXPECTED_ASSIGNMENT_COMPILER_SOURCE_PATHS,
    [...EXPECTED_ASSIGNMENT_PROJECT_SOURCE_PATHS,
      ...EXPECTED_ASSIGNMENT_DECLARATION_PATHS].sort(),
    "compiler graph partition drifted",
  );
  assertSortedUniqueRelativePaths(
    EXPECTED_ASSIGNMENT_RUNTIME_SOURCE_PATHS,
    EXPECTED_RUNTIME_SOURCE_COUNT,
    "runtime source graph",
  );
  assert.equal(Object.isFrozen(EXPECTED_ASSIGNMENT_RUNTIME_EDGES), true);
  assert.equal(EXPECTED_ASSIGNMENT_RUNTIME_EDGES.length, EXPECTED_RUNTIME_EDGE_COUNT);
  assert.equal(
    EXPECTED_ASSIGNMENT_RUNTIME_EDGES.every((edge) =>
      Object.isFrozen(edge) && edge.length === 3),
    true,
    "runtime edge triples are not frozen",
  );
  assert.equal(
    new Set(EXPECTED_ASSIGNMENT_RUNTIME_EDGES.map((edge) => edge.join("\t"))).size,
    EXPECTED_RUNTIME_EDGE_COUNT,
    "runtime edge inventory contains duplicates",
  );
  assert.equal(isDeeplyFrozen(EXPECTED_ASSIGNMENT_COMPILER_OPTIONS), true);
  assert.equal(
    sha256(canonicalNameManifest(EXPECTED_ASSIGNMENT_PROJECT_SOURCE_PATHS)),
    EXPECTED_ASSIGNMENT_PROJECT_GRAPH_NAMES_SHA256,
  );
  assert.equal(
    sha256(canonicalNameManifest(EXPECTED_ASSIGNMENT_DECLARATION_PATHS)),
    EXPECTED_ASSIGNMENT_DECLARATION_NAMES_SHA256,
  );
  assert.equal(
    sha256(canonicalNameManifest(EXPECTED_ASSIGNMENT_COMPILER_SOURCE_PATHS)),
    EXPECTED_ASSIGNMENT_COMPILER_NAMES_SHA256,
  );
  assert.equal(
    sha256(canonicalNameManifest(EXPECTED_ASSIGNMENT_RUNTIME_SOURCE_PATHS)),
    EXPECTED_ASSIGNMENT_RUNTIME_GRAPH_NAMES_SHA256,
  );
  assert.equal(
    sha256(canonicalRuntimeEdgeManifest(EXPECTED_ASSIGNMENT_RUNTIME_EDGES)),
    EXPECTED_ASSIGNMENT_RUNTIME_EDGES_SHA256,
  );
  assert.equal(
    EXPECTED_ASSIGNMENT_PROJECT_GRAPH_CONTENT_SHA256,
    "1f70939a6c6ff9fe3e5031a5db3c3ff6bae6dcb758b5277c3d80e61fec6e5819",
  );
  assert.equal(
    EXPECTED_ASSIGNMENT_DECLARATION_CONTENT_SHA256,
    "915ee4cd0841d10c718a65cf825fdfe2d53783060bb937c3bce29c53396c7ec3",
  );
  assert.equal(
    EXPECTED_ASSIGNMENT_COMPILER_CONTENT_SHA256,
    "761b44b92ad0a67484aadc2abf5dd76d8e4a0288318a007515576fb1e4e1b583",
  );

  assert.equal(typeof evidenceDirectoryInput, "string", "evidence directory is required");
  const evidenceDirectory = realpathSync(evidenceDirectoryInput);
  const evidenceRelative = path.relative(projectTmpRoot, evidenceDirectory);
  assert.equal(
    evidenceRelative !== "" && !path.isAbsolute(evidenceRelative) &&
      evidenceRelative !== ".." && !evidenceRelative.startsWith(`..${path.sep}`),
    true,
    "evidence directory must be a unique child of project .tmp",
  );
  const evidenceIdentity = lstatSync(evidenceDirectory);
  assert.equal(evidenceIdentity.isDirectory(), true, "evidence path is not a directory");
  assert.equal(evidenceIdentity.isSymbolicLink(), false, "evidence directory is a symlink");

  const typescriptBytes = stableReadRegularFile(
    typescriptBundlePath,
    "pinned TypeScript bundle",
  );
  assert.equal(typescriptBytes.length, EXPECTED_TYPESCRIPT_BUNDLE_BYTE_LENGTH);
  assert.equal(sha256(typescriptBytes), EXPECTED_TYPESCRIPT_BUNDLE_SHA256);

  const compilerEntries = new Map();
  for (const relativePath of EXPECTED_ASSIGNMENT_COMPILER_SOURCE_PATHS) {
    compilerEntries.set(
      relativePath,
      stableReadRegularFile(
        path.join(projectRoot, relativePath),
        `compiler source ${relativePath}`,
      ),
    );
  }
  assert.equal(compilerEntries.size, EXPECTED_COMPILER_ENTRY_COUNT);
  const archive = buildCanonicalAssignmentArchive({ compilerEntries });
  assert.equal(archive.schemaVersion, "ca.signature-lab.assignment-archive-build.v1");
  assert.equal(archive.byteLength, EXPECTED_ARCHIVE_BYTE_LENGTH);
  assert.equal(archive.sha256, EXPECTED_ARCHIVE_SHA256);
  assert.equal(archive.headerByteLength, EXPECTED_ARCHIVE_HEADER_BYTE_LENGTH);
  assert.equal(archive.headerSha256, EXPECTED_ARCHIVE_HEADER_SHA256);
  assert.equal(archive.compilerEntryCount, EXPECTED_COMPILER_ENTRY_COUNT);
  assert.equal(archive.projectGraphCount, EXPECTED_PROJECT_SOURCE_COUNT);
  assert.equal(archive.declarationCount, EXPECTED_DECLARATION_COUNT);
  assert.equal(archive.runtimeSourceCount, EXPECTED_RUNTIME_SOURCE_COUNT);
  assert.equal(archive.runtimeEdgeCount, EXPECTED_RUNTIME_EDGE_COUNT);
  assert.equal(archive.compilerEntriesNamesSha256, EXPECTED_ASSIGNMENT_COMPILER_NAMES_SHA256);
  assert.equal(
    archive.compilerEntriesContentManifestSha256,
    EXPECTED_ASSIGNMENT_COMPILER_CONTENT_SHA256,
  );
  assert.equal(
    archive.projectGraphNamesSha256,
    EXPECTED_ASSIGNMENT_PROJECT_GRAPH_NAMES_SHA256,
  );
  assert.equal(
    archive.projectGraphContentManifestSha256,
    EXPECTED_ASSIGNMENT_PROJECT_GRAPH_CONTENT_SHA256,
  );
  assert.equal(
    archive.declarationNamesSha256,
    EXPECTED_ASSIGNMENT_DECLARATION_NAMES_SHA256,
  );
  assert.equal(
    archive.declarationContentManifestSha256,
    EXPECTED_ASSIGNMENT_DECLARATION_CONTENT_SHA256,
  );
  assert.equal(
    archive.runtimeGraphNamesSha256,
    EXPECTED_ASSIGNMENT_RUNTIME_GRAPH_NAMES_SHA256,
  );
  assert.equal(archive.runtimeEdgesSha256, EXPECTED_ASSIGNMENT_RUNTIME_EDGES_SHA256);

  const parsed = parseCanonicalAssignmentArchive(archive.bytes, {
    expectedArchiveSha256: EXPECTED_ARCHIVE_SHA256,
  });
  assert.equal(parsed.schemaVersion, "ca.signature-lab.assignment-archive-parse.v1");
  assert.equal(parsed.byteLength, EXPECTED_ARCHIVE_BYTE_LENGTH);
  assert.equal(parsed.sha256, EXPECTED_ARCHIVE_SHA256);
  assert.equal(parsed.headerSha256, EXPECTED_ARCHIVE_HEADER_SHA256);
  assert.deepEqual(parsed.header, archive.header);
  assert.equal(parsed.entries.size, EXPECTED_COMPILER_ENTRY_COUNT);
  for (const [relativePath, expectedBytes] of compilerEntries) {
    assert.equal(
      parsed.entries.get(relativePath)?.equals(expectedBytes),
      true,
      `${relativePath}: parsed archive bytes drifted`,
    );
  }

  const retainedArchivePath = path.join(evidenceDirectory, "assignment-archive.v1.bin");
  writeExclusiveArchive(retainedArchivePath, archive.bytes);
  assert.equal(
    sha256(stableReadRegularFile(retainedArchivePath, "retained canonical archive")),
    EXPECTED_ARCHIVE_SHA256,
  );

  const childEnvironment = Object.freeze({
    FORCE_COLOR: "0",
    LANG: "C",
    LC_ALL: "C",
    NODE_DISABLE_COMPILE_CACHE: "1",
    NO_COLOR: "1",
    PATH: "/usr/local/bin:/usr/bin:/bin",
    TMPDIR: evidenceDirectory,
  });

  const graphExecution = executeBoundMode({
    archivePath: retainedArchivePath,
    childEnvironment,
    mode: "graph",
    typescriptPath: typescriptBundlePath,
  });
  assertSuccessfulExecution(graphExecution, "graph");
  const expectedGraphStdout = `${EXPECTED_ASSIGNMENT_PROJECT_SOURCE_PATHS.join("\n")}\n`;
  assert.equal(graphExecution.stdout.toString("utf8"), expectedGraphStdout);

  const typecheckExecution = executeBoundMode({
    archivePath: retainedArchivePath,
    childEnvironment,
    mode: "typecheck",
    typescriptPath: typescriptBundlePath,
  });
  assertSuccessfulExecution(typecheckExecution, "typecheck");
  assert.equal(typecheckExecution.stdout.length, 0, "typecheck emitted stdout");

  const tapExecution = executeBoundMode({
    archivePath: retainedArchivePath,
    childEnvironment,
    mode: "tap",
    typescriptPath: typescriptBundlePath,
  });
  assertSuccessfulExecution(tapExecution, "tap");
  validateTap(tapExecution.stdout.toString("utf8"));

  const wrongDescriptorExecution = executeBoundMode({
    archivePath: retainedArchivePath,
    childEnvironment,
    mode: "tap",
    typescriptPath: modulePath,
  });
  assert.equal(wrongDescriptorExecution.error, undefined, "wrong-FD3 spawn error");
  assert.equal(wrongDescriptorExecution.signal, null, "wrong-FD3 unexpected signal");
  assert.notEqual(wrongDescriptorExecution.status, 0, "wrong FD3 was accepted");
  assert.equal(wrongDescriptorExecution.stdout.length, 0, "wrong FD3 emitted stdout");
  assert.equal(
    wrongDescriptorExecution.stderr.toString("utf8"),
    "Error: TypeScript descriptor digest mismatch\n",
    "wrong FD3 rejection drifted",
  );

  console.log(`ASSIGNMENT_CAPSULE_CONTRACT ${JSON.stringify({
    archiveByteLength: archive.byteLength,
    archiveSha256: archive.sha256,
    capsuleSha256: EXACT_BOUND_ASSIGNMENT_CAPSULE_SHA256,
    compilerEntries: EXPECTED_ASSIGNMENT_COMPILER_SOURCE_PATHS.length,
    declarations: EXPECTED_ASSIGNMENT_DECLARATION_PATHS.length,
    graphSources: EXPECTED_ASSIGNMENT_PROJECT_SOURCE_PATHS.length,
    moduleSha256: EXPECTED_MODULE_SHA256,
    runtimeEdges: EXPECTED_ASSIGNMENT_RUNTIME_EDGES.length,
    runtimeSources: EXPECTED_ASSIGNMENT_RUNTIME_SOURCE_PATHS.length,
    tapFail: 0,
    tapPass: EXPECTED_CONTRACT_TEST_NAMES.length,
    wrongFd3Status: wrongDescriptorExecution.status,
  })}`);
});
