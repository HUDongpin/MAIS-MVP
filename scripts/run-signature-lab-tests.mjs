/**
 * run-signature-lab-tests.mjs — Phase 0 QA gates for signature labs.
 *
 * The math audits and assignment contract run from one private, content-stable
 * snapshot. Live source is revalidated after execution, so a concurrent edit
 * cannot make the bound TypeScript compiler check one graph while the
 * descriptor-only TAP runtime executes another. Scratch
 * final evidence is retained, descriptor-inventoried, and externally sealed.
 *
 * Run: npm run test:signature-labs
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRetainedSignatureLabExecutionJournal,
  createRetainedSignatureLabDirectory,
  createRetainedSignatureLabRun,
  closeRetainedSignatureLabRun,
  initializeRetainedSignatureLabExecutionJournal,
  inspectRetainedSignatureLabRun,
  revalidateRetainedSignatureLabEvidence,
  sealRetainedSignatureLabEvidence,
  writeRetainedSignatureLabBatch,
  writeRetainedSignatureLabFile,
} from "./signature-lab-retained-evidence.mjs";
import {
  assertExactAuditLabSourceBindings,
  EXPECTED_AUDIT_LAB_PAIR_NAMES_SHA256,
  EXPECTED_AUDIT_LAB_SOURCE_SHA256,
} from "./signature-lab-source-bindings.mjs";
import {
  EXACT_BOUND_SIGNATURE_AUDIT_CAPSULE_SHA256,
  exactBoundSignatureAuditArgv,
  runExactBoundSignatureAudit,
} from "./signature-lab-execution-capsule.mjs";
import {
  EXACT_BOUND_ASSIGNMENT_CAPSULE_SHA256,
  EXPECTED_ASSIGNMENT_COMPILER_OPTIONS,
  EXPECTED_ASSIGNMENT_DECLARATION_PATHS,
  EXPECTED_TYPESCRIPT_BUNDLE_BYTE_LENGTH,
  EXPECTED_TYPESCRIPT_BUNDLE_SHA256,
  EXPECTED_TYPESCRIPT_VERSION,
  buildCanonicalAssignmentArchive,
  exactBoundAssignmentArgv,
  runExactBoundSignatureAssignment,
} from "./signature-lab-assignment-execution-capsule.mjs";

const projectRoot = realpathSync(process.cwd());
const auditsRelativeDir = "components/visualizations/signature";
const auditsDir = path.join(projectRoot, auditsRelativeDir);
const scratchParent = path.join(projectRoot, ".tmp");
const assignmentContractRelative = "data/signatureLabAssignments.test.ts";
const assignmentContract = path.join(projectRoot, assignmentContractRelative);
const projectTsconfig = path.join(projectRoot, "tsconfig.json");
const typescriptBundlePath = path.join(
  projectRoot,
  "node_modules/typescript/lib/typescript.js",
);
const runnerPath = fileURLToPath(import.meta.url);
const retainedEvidenceModulePath = path.join(
  projectRoot,
  "scripts/signature-lab-retained-evidence.mjs",
);
const sourceBindingsModulePath = path.join(
  projectRoot,
  "scripts/signature-lab-source-bindings.mjs",
);
const executionCapsuleModulePath = path.join(
  projectRoot,
  "scripts/signature-lab-execution-capsule.mjs",
);
const assignmentExecutionCapsuleModulePath = path.join(
  projectRoot,
  "scripts/signature-lab-assignment-execution-capsule.mjs",
);

const EXPECTED_AUDIT_COUNT = 192;
const EXPECTED_LAB_COUNT = 192;
const EXPECTED_IMMUTABLE_SOURCE_COUNT = 384;
const EXPECTED_IMMUTABLE_SOURCE_BYTES = 12_088_176;
const EXPECTED_IMMUTABLE_SOURCE_MAX_BYTES = 84_282;
const EXPECTED_AUDIT_NAMES_SHA256 =
  "9d64f8a3c7812487bb7a99c4f454bb571ce5b4e53143542447800550217f06d7";
const EXPECTED_LAB_NAMES_SHA256 =
  "6c5698f86ae211364fac40271b20183f00ef8cc44be0ce2d13e058cecf6568fb";
const EXPECTED_CONTRACT_TEST_NAMES = Object.freeze([
  "every referenced bench is actually ported",
  "primary is never also listed as related, and related has no duplicates",
  "every assignment carries a curation rationale",
  "every assigned topic id exists in the visualization catalog",
  "assigned topics render as signature labs; unassigned topics do not",
  "getSignatureLabAssignment resolves assigned topics and rejects others"
]);
const EXPECTED_CONTRACT_TEST_NAMES_SHA256 =
  "6f605a9802be34bac5724630c35f9abcd75bdcd5bd782d110b4b656ca1a0f754";
const SAFE_CHILD_ENV_KEYS = Object.freeze([
  "FORCE_COLOR",
  "LANG",
  "LC_ALL",
  "NODE_DISABLE_COMPILE_CACHE",
  "NO_COLOR",
  "PATH",
  "TMPDIR",
]);
const EXPECTED_ASSIGNMENT_GATE_NAMES = Object.freeze([
  "assignment-live-graph-initial",
  "assignment-snapshot-graph",
  "assignment-snapshot-typecheck",
  "assignment-snapshot-tap",
  "assignment-live-graph-final",
]);
const EXPECTED_ASSIGNMENT_GATE_COUNT = 5;
const EXPECTED_GATE_PLAN_COUNT = 197;
const EXPECTED_ASSIGNMENT_GATE_NAMES_SHA256 =
  "60ce236df8594f0a195f7a58427d63ad5a841ef3f972d992309d4e6f32236011";
const EXPECTED_GATE_PLAN_NAMES_SHA256 =
  "ff3c9132d31462ae501e44620f157bc03c5726ef6b019e7f8a5569f155aa8c36";
const EXPECTED_ASSIGNMENT_SOURCE_GRAPH_NAMES_SHA256 =
  "360aaa2c530f138ba81938c14f3b2a7d6849687c5332c04c9e3d4b88a9508990";
const EXPECTED_ASSIGNMENT_SOURCE_GRAPH_SHA256 =
  "1f70939a6c6ff9fe3e5031a5db3c3ff6bae6dcb758b5277c3d80e61fec6e5819";
const EXPECTED_PROJECT_TSCONFIG_SHA256 =
  "463a2abe6c2c803606ddf13aa6cb7d2f68cab049052ed876e5ffb77f5f4d96a8";
const EXPECTED_ASSIGNMENT_SOURCE_GRAPH = Object.freeze([
  "components/visualizations/three/threeDSceneMath.ts",
  "components/visualizations/three/threeDSceneTypes.ts",
  "components/visualizations/visualizationTemplateIds.ts",
  "data/generated-content/ccss-textbook-practice-v1/question-pack.json",
  "data/generated-content/mainland-bnu-high-generated-bank-v1-1500/question-pack.approved.json",
  "data/generated-content/mainland-bnu-junior-generated-bank-v1-1500/approved-question-pack.json",
  "data/generated-content/mainland-bnu-primary-generated-bank-v1-1500/question-pack.json",
  "data/generated-content/mainland-bnu-primary-generated-bank-v2-1500/question-pack.json",
  "data/generated-content/mainland-hjb-high-generated-bank-v1/question-pack.json",
  "data/generated-content/mainland-hjb-high-generated-bank-v2/question-pack.json",
  "data/generated-content/mainland-hjb-high-generated-bank-v3-remediated/question-pack.json",
  "data/generated-content/mainland-hjb-high-generated-bank-v4-remediated/question-pack.json",
  "data/generated-content/mainland-hjb-primary-generated-bank-v1-1500/question-pack.json",
  "data/generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json",
  "data/generated-content/us-ar-math-k-g5-generated-bank-v1-1500/question-pack.json",
  "data/generated-content/us-ca-k5-knowledge-point-practice-v1/question-pack.json",
  "data/generated-content/us-ca-math-g6-g12-generated-bank-v2-1500/question-pack.json",
  "data/generated-content/us-ca-math-k-g5-generated-bank-v3-deepseek-1500/question-pack.json",
  "data/generated-content/us-ca-math-k-g5-textbooks-v1/lessons.json",
  "data/generated-content/us-fl-math-middle-school-textbooks-v1/textbook-pack.json",
  "data/grades.ts",
  "data/hjbQuestionLocalization.ts",
  "data/mainlandBnuHighTopics.ts",
  "data/mainlandBnuJuniorTopics.ts",
  "data/mainlandBnuPrimaryTopics.ts",
  "data/mainlandHjbHighTopics.ts",
  "data/mainlandHjbJuniorTopics.ts",
  "data/mainlandHjbPrimaryTopics.ts",
  "data/mainlandPepHighTopics.ts",
  "data/mainlandPepJuniorTopics.ts",
  "data/mainlandPepPrimaryTopics.ts",
  "data/rag/mainlandBnuHigh.ts",
  "data/rag/mainlandBnuJunior.ts",
  "data/rag/mainlandBnuPrimary.ts",
  "data/rag/mainlandHjbHigh.ts",
  "data/rag/mainlandHjbJunior.ts",
  "data/rag/mainlandHjbPrimary.ts",
  "data/rag/mainlandPepJunior.ts",
  "data/rag/usMath.ts",
  "data/signatureLabAssignments.test.ts",
  "data/signatureLabAssignments.ts",
  "data/topics.ts",
  "data/usArkansasTopics.ts",
  "data/usCaliforniaKnowledgePoints.ts",
  "data/usCaliforniaMathematicalPractices.ts",
  "data/usCaliforniaMicroLessons.ts",
  "data/usCaliforniaTopics.ts",
  "data/usFloridaMiddleSchoolTopics.ts",
  "data/usMathTopics.ts",
  "data/visualizationLabs.ts",
  "lib/difficulty.ts",
  "lib/i18n.ts",
  "types/index.ts",
]);
const EXPECTED_PLANNED_GATE_RECORD_KEYS = Object.freeze([
  "argv",
  "cwd",
  "environmentBinding",
  "gateId",
  "kind",
  "name",
  "ordinal",
  "schemaVersion",
  "sourceBinding",
  "status",
  "toolBinding",
]);
const EXPECTED_GATE_RESULT_RECORD_KEYS = Object.freeze([
  "exitCode",
  "gateId",
  "result",
  "schemaVersion",
  "signal",
  "status",
  "stderr",
  "stdout",
]);
const EXPECTED_GATE_ARTIFACT_RECORD_KEYS = Object.freeze([
  "byteLength",
  "relativePath",
  "sha256",
]);
const EXPECTED_GATE_ATTEMPT_RECORD_KEYS = Object.freeze([
  "attempt",
  "gateId",
  "status",
]);
const EXPECTED_SEALED_EVIDENCE_RESULT_KEYS = Object.freeze([
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
]);
const PASS_RETAINED_SEALED_ARCHIVE = "PASS_RETAINED_SEALED_ARCHIVE";
const FAIL_RETAINED_SEALED_ARCHIVE = "FAIL_RETAINED_SEALED_ARCHIVE";
const FAIL_RETAINED_UNSEALED = "FAIL_RETAINED_UNSEALED";
const EXPECTED_NODE_SHA256 =
  "a5ebb9adc969c8fcc486823ada530a4130b0d56edf954de7b05c280170487b1a";

let immutableGatePlan = Object.freeze([]);
let plannedAuditRecords = Object.freeze([]);
let plannedAssignmentGateRecords = Object.freeze([]);
const gateResultRecords = [];
const gateAttemptRecords = [];
let outputDir = null;
let retainedCaseRoot = null;
let evidenceRoot = null;
let retainedRun = null;
let executionJournalPublication = null;
let executionJournal = null;
let primaryFailure = null;
let retainedEvidenceFailure = null;
let retainedEvidenceResult = null;
let retainedRunCloseFailure = null;
let runnerSourceRecord = null;
let retainedEvidenceModuleRecord = null;
let sourceBindingsModuleRecord = null;
let executionCapsuleModuleRecord = null;
let assignmentExecutionCapsuleModuleRecord = null;
let typescriptBundleRecord = null;
let assignmentArchiveBuild = null;
let assignmentArchiveRecord = null;
let exactToolBinding = null;
const retainedDirectoryPaths = new Set();

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function compareUnicodeOrdinal(left, right) {
  const leftCodePoints = left[Symbol.iterator]();
  const rightCodePoints = right[Symbol.iterator]();
  while (true) {
    const leftNext = leftCodePoints.next();
    const rightNext = rightCodePoints.next();
    if (leftNext.done || rightNext.done) {
      if (leftNext.done && rightNext.done) return 0;
      return leftNext.done ? -1 : 1;
    }
    const leftCodePoint = leftNext.value.codePointAt(0);
    const rightCodePoint = rightNext.value.codePointAt(0);
    if (leftCodePoint !== rightCodePoint) {
      return leftCodePoint < rightCodePoint ? -1 : 1;
    }
  }
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function canonicalNameManifest(names) {
  return Buffer.from(`${names.join("\n")}\n`, "utf8");
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function identityFromStat(stat) {
  return {
    ctimeNs: stat.ctimeNs,
    dev: stat.dev,
    gid: stat.gid,
    ino: stat.ino,
    mode: stat.mode,
    mtimeNs: stat.mtimeNs,
    nlink: stat.nlink,
    size: stat.size,
    uid: stat.uid
  };
}

function jsonSafeIdentity(identity) {
  return {
    dev: String(identity.dev),
    ino: String(identity.ino),
    uid: Number(identity.uid),
    gid: Number(identity.gid),
    mode: Number(identity.mode & BigInt(0o7777)),
    nlink: Number(identity.nlink),
    size: String(identity.size),
    mtimeNs: String(identity.mtimeNs),
    ctimeNs: String(identity.ctimeNs),
  };
}

function canonicalRecord(value, label = "record") {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}: expected one object`);
  }
  const visit = (candidate, nestedLabel) => {
    if (candidate === null || typeof candidate === "string" ||
        typeof candidate === "boolean") return candidate;
    if (typeof candidate === "number") {
      if (!Number.isSafeInteger(candidate)) {
        throw new Error(`${nestedLabel}: expected a safe integer`);
      }
      return candidate;
    }
    if (Array.isArray(candidate)) {
      return candidate.map((entry, index) => visit(entry, `${nestedLabel}[${index}]`));
    }
    if (typeof candidate !== "object") {
      throw new Error(`${nestedLabel}: unsupported canonical value`);
    }
    const result = {};
    for (const key of Object.keys(candidate).sort()) {
      result[key] = visit(candidate[key], `${nestedLabel}.${key}`);
    }
    return result;
  };
  return visit(value, label);
}

function canonicalJsonBytes(value, label = "record") {
  return Buffer.from(`${JSON.stringify(canonicalRecord(value, label))}\n`, "utf8");
}

function canonicalJsonArrayBytes(values, label = "records") {
  if (!Array.isArray(values)) {
    throw new Error(`${label}: expected one array`);
  }
  const canonicalValues = values.map((value, index) =>
    canonicalRecord(value, `${label}[${index}]`));
  return Buffer.from(`${JSON.stringify(canonicalValues)}\n`, "utf8");
}

function assertIdentity(actual, expected, label, fields) {
  for (const field of fields) {
    if (actual[field] !== expected[field]) {
      throw new Error(`${label}: ${field} identity drifted`);
    }
  }
}

function assertPrivateDirectory(target, expected = null) {
  const resolved = path.resolve(target);
  if (!isInside(projectRoot, resolved) || resolved === projectRoot) {
    throw new Error(`${target}: private directory escapes the project root`);
  }
  const identity = lstatSync(resolved, { bigint: true });
  if (!identity.isDirectory() || identity.isSymbolicLink() ||
      identity.uid !== BigInt(process.getuid()) ||
      (identity.mode & BigInt(0o777)) !== BigInt(0o700) ||
      realpathSync(resolved) !== resolved) {
    throw new Error(`${resolved}: expected one exact private physical directory`);
  }
  if (expected !== null) {
    assertIdentity(identity, expected, resolved, ["dev", "ino", "uid", "mode"]);
  }
  return identityFromStat(identity);
}

function archiveRelative(target) {
  if (outputDir === null || target === outputDir || !isInside(outputDir, target)) {
    throw new Error(`${target}: retained entry escapes the archive root`);
  }
  return path.relative(outputDir, target).split(path.sep).join("/");
}

async function mkdirOwned(target) {
  if (retainedRun === null) throw new Error("retained run is unavailable");
  if (target === outputDir || retainedDirectoryPaths.has(target)) return null;
  const parent = path.dirname(target);
  if (parent !== outputDir) await mkdirOwned(parent);
  const result = await createRetainedSignatureLabDirectory(
    retainedRun,
    archiveRelative(target),
  );
  retainedDirectoryPaths.add(target);
  return result;
}

async function writeOwnedFile(target, bytes) {
  if (retainedRun === null) throw new Error("retained run is unavailable");
  await mkdirOwned(path.dirname(target));
  return writeRetainedSignatureLabFile(retainedRun, archiveRelative(target), bytes);
}

function stableReadSourceFile(target, label) {
  const resolved = path.resolve(target);
  if (!isInside(projectRoot, resolved) || resolved === projectRoot ||
      isInside(scratchParent, resolved)) {
    throw new Error(`${label}: source path is not one non-scratch project descendant`);
  }
  const pathIdentity = lstatSync(resolved, { bigint: true });
  if (!pathIdentity.isFile() || pathIdentity.isSymbolicLink() ||
      pathIdentity.nlink !== BigInt(1) || realpathSync(resolved) !== resolved) {
    throw new Error(`${label}: source must be one physical regular singleton`);
  }
  const fd = openSync(resolved, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  let bytes;
  let before;
  try {
    before = fstatSync(fd, { bigint: true });
    assertIdentity(before, pathIdentity, label, ["dev", "ino", "nlink"]);
    bytes = readFileSync(fd);
    const after = fstatSync(fd, { bigint: true });
    assertIdentity(after, before, label,
      ["dev", "ino", "size", "mtimeNs", "ctimeNs", "nlink"]);
    const finalPath = lstatSync(resolved, { bigint: true });
    assertIdentity(finalPath, before, label,
      ["dev", "ino", "size", "mtimeNs", "ctimeNs", "nlink"]);
  } finally {
    closeSync(fd);
  }
  return {
    bytes,
    byteLength: bytes.length,
    identity: identityFromStat(before),
    path: resolved,
    sha256: sha256(bytes),
  };
}

function stableReadSystemTool(target, expectedSha256, label) {
  const resolved = path.resolve(target);
  const pathIdentity = lstatSync(resolved, { bigint: true });
  if (!pathIdentity.isFile() ||
      pathIdentity.isSymbolicLink() || pathIdentity.nlink < BigInt(1) ||
      pathIdentity.uid !== BigInt(0) ||
      (pathIdentity.mode & BigInt(0o022)) !== BigInt(0) ||
      realpathSync(resolved) !== resolved) {
    throw new Error(`${label}: system tool is not one immutable-looking root-owned file`);
  }
  const fd = openSync(resolved, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  let bytes;
  let before;
  try {
    before = fstatSync(fd, { bigint: true });
    assertIdentity(before, pathIdentity, label, ["dev", "ino", "uid", "mode", "nlink"]);
    bytes = readFileSync(fd);
    const after = fstatSync(fd, { bigint: true });
    assertIdentity(after, before, label,
      ["dev", "ino", "uid", "mode", "size", "mtimeNs", "ctimeNs", "nlink"]);
    const finalPath = lstatSync(resolved, { bigint: true });
    assertIdentity(finalPath, before, label,
      ["dev", "ino", "uid", "mode", "size", "mtimeNs", "ctimeNs", "nlink"]);
  } finally {
    closeSync(fd);
  }
  const digest = sha256(bytes);
  if (digest !== expectedSha256) {
    throw new Error(`${label}: executable bytes drifted (${digest})`);
  }
  return {
    bytes,
    identity: identityFromStat(before),
    path: resolved,
    sha256: digest
  };
}

function bindExactPhysicalTools() {
  const nodeRecord = stableReadSystemTool(
    process.execPath,
    EXPECTED_NODE_SHA256,
    "node executable",
  );
  const toolBinding = Object.freeze({
    node: Object.freeze({ name: "node", executable: sourceRecordForProvenance(nodeRecord) }),
  });
  return Object.freeze({
    nodeRecord,
    toolBinding,
  });
}

function assertExactPhysicalToolsUnchanged(binding) {
  const currentNode = stableReadSystemTool(
    binding.nodeRecord.path,
    binding.nodeRecord.sha256,
    "node executable",
  );
  assertIdentity(currentNode.identity, binding.nodeRecord.identity, "node executable",
    ["dev", "ino", "uid", "gid", "mode", "nlink", "size", "mtimeNs", "ctimeNs"]);
}

function assertSourceRecordUnchanged(record, label) {
  const current = stableReadSourceFile(record.path, label);
  assertIdentity(current.identity, record.identity, label,
    ["dev", "ino", "size", "mtimeNs", "ctimeNs", "nlink"]);
  if (current.sha256 !== record.sha256) throw new Error(`${label}: source bytes drifted`);
}

function assertDescriptorMatchesStableSource(descriptor, record, label) {
  const identity = fstatSync(descriptor, { bigint: true });
  if (!identity.isFile() || identity.isSymbolicLink?.() === true) {
    throw new Error(`${label}: held descriptor is not one regular file`);
  }
  assertIdentity(identity, record.identity, label, [
    "dev",
    "ino",
    "uid",
    "gid",
    "mode",
    "nlink",
    "size",
    "mtimeNs",
    "ctimeNs",
  ]);
  if (identity.size !== BigInt(record.byteLength)) {
    throw new Error(`${label}: held byte length drifted`);
  }
}

function assertDescriptorMatchesRetainedSource(descriptor, record, label) {
  const identity = fstatSync(descriptor, { bigint: true });
  if (!identity.isFile() || identity.isSymbolicLink?.() === true) {
    throw new Error(`${label}: held descriptor is not one regular file`);
  }
  const actual = {
    type: "regular",
    ...jsonSafeIdentity(identityFromStat(identity)),
  };
  const expected = record.identity;
  for (const field of [
    "type",
    "dev",
    "ino",
    "uid",
    "gid",
    "mode",
    "nlink",
  ]) {
    if (actual[field] !== expected[field]) {
      throw new Error(`${label}: held ${field} identity drifted`);
    }
  }
  if (identity.size !== BigInt(record.byteLength)) {
    throw new Error(`${label}: held byte length drifted`);
  }
}

function assertRetainedSourcePathBound(record, label) {
  const descriptor = openSync(
    record.path,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  );
  try {
    assertDescriptorMatchesRetainedSource(descriptor, record, label);
  } finally {
    closeSync(descriptor);
  }
}

function auditSourceReadsPairedLab(record) {
  return /\b(?:readFileSync|readFile)\s*\(/u.test(record.bytes.toString("utf8"));
}

async function executeExactBoundAuditGate({
  planRecord,
  auditRecord,
  labRecord,
  expectedLabRead,
  validation,
}) {
  const expectedAuditSha256 = planRecord.sourceBinding?.audit?.snapshot?.sha256;
  const expectedLabSha256 = planRecord.sourceBinding?.lab?.snapshot?.sha256;
  if (expectedAuditSha256 !== auditRecord.sha256 ||
      expectedLabSha256 !== labRecord.sha256) {
    throw new Error(`${planRecord.name}: planned descriptor digests drifted`);
  }
  let auditFd = null;
  try {
    auditFd = openSync(
      auditRecord.path,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    );
    let labFd = null;
    try {
      labFd = openSync(
        labRecord.path,
        fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
      );
      assertDescriptorMatchesRetainedSource(auditFd, auditRecord,
        `${planRecord.name} audit input`);
      assertDescriptorMatchesRetainedSource(labFd, labRecord,
        `${planRecord.name} Lab input`);
      const expectedArgv = exactBoundSignatureAuditArgv({
        nodePath: planRecord.argv[0],
        auditVirtualPath: auditRecord.path,
        labVirtualPath: labRecord.path,
        expectedLabRead,
        expectedAuditSha256,
        expectedLabSha256,
      });
      if (JSON.stringify(planRecord.argv) !== JSON.stringify(expectedArgv)) {
        throw new Error(`${planRecord.name}: exact descriptor-capsule argv drifted`);
      }
      return await executeRecordedGate(planRecord, validation, () => {
        const execution = runExactBoundSignatureAudit({
          nodePath: planRecord.argv[0],
          auditFd,
          labFd,
          auditVirtualPath: auditRecord.path,
          labVirtualPath: labRecord.path,
          expectedLabRead,
          expectedAuditSha256,
          expectedLabSha256,
          cwd: planRecord.cwd,
          environment: planRecord.environmentBinding,
        });
        assertDescriptorMatchesRetainedSource(auditFd, auditRecord,
          `${planRecord.name} audit input after execution`);
        assertDescriptorMatchesRetainedSource(labFd, labRecord,
          `${planRecord.name} Lab input after execution`);
        return execution;
      });
    } finally {
      if (labFd !== null) closeSync(labFd);
    }
  } finally {
    if (auditFd !== null) closeSync(auditFd);
  }
}

async function executeExactBoundAssignmentGate({
  planRecord,
  mode,
  validation = null,
}) {
  if (typescriptBundleRecord === null || assignmentArchiveRecord === null ||
      assignmentArchiveBuild === null) {
    throw new Error(`${planRecord.name}: assignment descriptor inputs are not initialized`);
  }
  const expectedArgv = exactBoundAssignmentArgv({
    nodePath: planRecord.argv[0],
    mode,
    expectedArchiveSha256: assignmentArchiveBuild.sha256,
  });
  if (JSON.stringify(planRecord.argv) !== JSON.stringify(expectedArgv)) {
    throw new Error(`${planRecord.name}: exact assignment-capsule argv drifted`);
  }
  return executeRecordedGate(planRecord, validation, () => {
    let typescriptFd = null;
    let archiveFd = null;
    let execution = null;
    const failures = [];
    try {
      typescriptFd = openSync(
        typescriptBundleRecord.path,
        fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
      );
      assertDescriptorMatchesStableSource(
        typescriptFd,
        typescriptBundleRecord,
        `${planRecord.name} TypeScript bundle`,
      );
      try {
        archiveFd = openSync(
          assignmentArchiveRecord.path,
          fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
        );
        assertDescriptorMatchesRetainedSource(
          archiveFd,
          assignmentArchiveRecord,
          `${planRecord.name} assignment archive`,
        );
        execution = runExactBoundSignatureAssignment({
          nodePath: planRecord.argv[0],
          typescriptFd,
          archiveFd,
          mode,
          expectedArchiveSha256: assignmentArchiveBuild.sha256,
          cwd: planRecord.cwd,
          environment: planRecord.environmentBinding,
        });
        assertDescriptorMatchesStableSource(
          typescriptFd,
          typescriptBundleRecord,
          `${planRecord.name} TypeScript bundle after execution`,
        );
        assertDescriptorMatchesRetainedSource(
          archiveFd,
          assignmentArchiveRecord,
          `${planRecord.name} assignment archive after execution`,
        );
      } catch (error) {
        failures.push(error);
      } finally {
        if (archiveFd !== null) {
          try {
            closeSync(archiveFd);
          } catch (error) {
            failures.push(error);
          }
        }
      }
    } catch (error) {
      failures.push(error);
    } finally {
      if (typescriptFd !== null) {
        try {
          closeSync(typescriptFd);
        } catch (error) {
          failures.push(error);
        }
      }
    }
    const normalized = execution ?? {
      status: null,
      signal: null,
      stdout: Buffer.alloc(0),
      stderr: Buffer.alloc(0),
    };
    if (failures.length === 0) return normalized;
    return {
      ...normalized,
      error: new AggregateError(
        failures,
        `${planRecord.name}: descriptor-bound assignment execution failed`,
      ),
    };
  });
}

async function copySourceRecord(record, target) {
  const written = await writeOwnedFile(target, record.bytes);
  if (written.sha256 !== record.sha256 || written.byteLength !== record.bytes.length) {
    throw new Error(`${target}: copied source bytes drifted`);
  }
  return written;
}

async function prepareAssignmentSourceBindings({
  contractSnapshot,
  liveGraphConfig,
  snapshotTsconfig,
  projectTsconfigRecord,
}) {
  const liveRecords = new Map(EXPECTED_ASSIGNMENT_SOURCE_GRAPH.map((relative) => [
    relative,
    stableReadSourceFile(path.join(projectRoot, relative),
      `reviewed assignment source ${relative}`),
  ]));
  const graphNameManifest = Buffer.from(
    `${EXPECTED_ASSIGNMENT_SOURCE_GRAPH.join("\n")}\n`,
    "utf8",
  );
  const liveSourceManifest = Buffer.from(
    `${EXPECTED_ASSIGNMENT_SOURCE_GRAPH.map((relative) =>
      `${relative}\t${liveRecords.get(relative).sha256}`).join("\n")}\n`,
    "utf8",
  );
  if (sha256(graphNameManifest) !== EXPECTED_ASSIGNMENT_SOURCE_GRAPH_NAMES_SHA256 ||
      sha256(liveSourceManifest) !== EXPECTED_ASSIGNMENT_SOURCE_GRAPH_SHA256) {
    throw new Error("reviewed assignment dependency graph or source bytes drifted");
  }

  const liveGraphConfigBytes = Buffer.from(`${JSON.stringify({
    extends: projectTsconfig,
    compilerOptions: { incremental: false, noEmit: true },
    files: [assignmentContract],
    include: [],
  }, null, 2)}\n`, "utf8");
  const liveGraphConfigRecord = await writeOwnedFile(
    liveGraphConfig,
    liveGraphConfigBytes,
  );

  await mkdirOwned(contractSnapshot);
  const snapshotRecords = new Map();
  for (const relative of EXPECTED_ASSIGNMENT_SOURCE_GRAPH) {
    snapshotRecords.set(
      relative,
      await copySourceRecord(liveRecords.get(relative), path.join(contractSnapshot, relative)),
    );
  }
  const snapshotProjectTsconfigRecord = await copySourceRecord(
    projectTsconfigRecord,
    path.join(contractSnapshot, "tsconfig.project.json"),
  );
  const snapshotTsconfigBytes = Buffer.from(`${JSON.stringify({
    extends: "./tsconfig.project.json",
    compilerOptions: { incremental: false, noEmit: true },
    files: [`./${assignmentContractRelative}`],
    include: [],
  }, null, 2)}\n`, "utf8");
  const snapshotTsconfigRecord = await writeOwnedFile(
    snapshotTsconfig,
    snapshotTsconfigBytes,
  );

  const declarationRecords = new Map(
    EXPECTED_ASSIGNMENT_DECLARATION_PATHS.map((relative) => [
      relative,
      stableReadSourceFile(
        path.join(projectRoot, relative),
        `reviewed assignment declaration ${relative}`,
      ),
    ]),
  );
  if (declarationRecords.size !== EXPECTED_ASSIGNMENT_DECLARATION_PATHS.length) {
    throw new Error("reviewed assignment declaration inventory is not unique");
  }
  const compilerEntries = new Map([
    ...liveRecords,
    ...declarationRecords,
  ]);
  assignmentArchiveBuild = buildCanonicalAssignmentArchive({
    compilerEntries,
    compilerOptions: EXPECTED_ASSIGNMENT_COMPILER_OPTIONS,
  });
  await mkdirOwned(path.join(outputDir, "inputs"));
  assignmentArchiveRecord = await writeRetainedSignatureLabFile(
    retainedRun,
    "inputs/assignment-archive.v1.bin",
    assignmentArchiveBuild.bytes,
  );
  if (assignmentArchiveRecord.sha256 !== assignmentArchiveBuild.sha256 ||
      assignmentArchiveRecord.byteLength !== assignmentArchiveBuild.byteLength) {
    throw new Error("descriptor-bound assignment archive publication drifted");
  }

  const reviewedGraph = EXPECTED_ASSIGNMENT_SOURCE_GRAPH.map((relative) => ({
    relativePath: relative,
    live: sourceRecordForProvenance(liveRecords.get(relative)),
    snapshot: snapshotRecords.get(relative),
  }));
  const archiveBinding = {
    descriptor: 4,
    relativePath: assignmentArchiveRecord.relativePath,
    path: assignmentArchiveRecord.path,
    identity: assignmentArchiveRecord.identity,
    byteLength: assignmentArchiveBuild.byteLength,
    sha256: assignmentArchiveBuild.sha256,
    headerByteLength: assignmentArchiveBuild.headerByteLength,
    headerSha256: assignmentArchiveBuild.headerSha256,
    compilerEntryCount: assignmentArchiveBuild.compilerEntryCount,
    compilerEntriesNamesSha256: assignmentArchiveBuild.compilerEntriesNamesSha256,
    compilerEntriesContentManifestSha256:
      assignmentArchiveBuild.compilerEntriesContentManifestSha256,
    projectGraphCount: assignmentArchiveBuild.projectGraphCount,
    projectGraphNamesSha256: assignmentArchiveBuild.projectGraphNamesSha256,
    projectGraphContentManifestSha256:
      assignmentArchiveBuild.projectGraphContentManifestSha256,
    declarationCount: assignmentArchiveBuild.declarationCount,
    declarationNamesSha256: assignmentArchiveBuild.declarationNamesSha256,
    declarationContentManifestSha256:
      assignmentArchiveBuild.declarationContentManifestSha256,
    runtimeSourceCount: assignmentArchiveBuild.runtimeSourceCount,
    runtimeGraphNamesSha256: assignmentArchiveBuild.runtimeGraphNamesSha256,
    runtimeEdgeCount: assignmentArchiveBuild.runtimeEdgeCount,
    runtimeEdgesSha256: assignmentArchiveBuild.runtimeEdgesSha256,
  };
  const typescriptBundleBinding = {
    descriptor: 3,
    version: EXPECTED_TYPESCRIPT_VERSION,
    ...sourceRecordForProvenance(typescriptBundleRecord),
  };
  const executionCapsuleBinding = {
    schemaVersion: "ca.signature-lab.bound-assignment-execution.v1",
    capsuleSha256: EXACT_BOUND_ASSIGNMENT_CAPSULE_SHA256,
  };
  const assignmentLiveSourceBinding = deepFreeze({
    schemaVersion: "ca.signature-lab.assignment-bound-archive.v1",
    mode: "LIVE_REVALIDATED_BOUND_ARCHIVE",
    archive: archiveBinding,
    typescriptBundle: typescriptBundleBinding,
    executionCapsule: executionCapsuleBinding,
    executionCompilerOptions: EXPECTED_ASSIGNMENT_COMPILER_OPTIONS,
    generatedConfigContext: liveGraphConfigRecord,
    projectConfigContext: sourceRecordForProvenance(projectTsconfigRecord),
    liveSources: reviewedGraph.map(({ relativePath, live }) => ({ relativePath, live })),
  });
  const assignmentSnapshotSourceBinding = deepFreeze({
    schemaVersion: "ca.signature-lab.assignment-bound-archive.v1",
    mode: "SNAPSHOT_BOUND_ARCHIVE",
    archive: archiveBinding,
    typescriptBundle: typescriptBundleBinding,
    executionCapsule: executionCapsuleBinding,
    executionCompilerOptions: EXPECTED_ASSIGNMENT_COMPILER_OPTIONS,
    generatedConfigContext: snapshotTsconfigRecord,
    projectConfigContext: {
      live: sourceRecordForProvenance(projectTsconfigRecord),
      snapshot: snapshotProjectTsconfigRecord,
    },
    snapshotSources: reviewedGraph,
  });
  return {
    assignmentLiveSourceBinding,
    assignmentSnapshotSourceBinding,
    declarationRecords,
    liveRecords,
    snapshotRecords,
  };
}

function buildSafeChildEnvironment(overrides = {}) {
  for (const key of Object.keys(overrides)) {
    if (!SAFE_CHILD_ENV_KEYS.includes(key)) {
      throw new Error(`unreviewed child environment key ${key}`);
    }
  }
  const environment = {
    FORCE_COLOR: "0",
    LANG: "C",
    LC_ALL: "C",
    NO_COLOR: "1",
    PATH: "/usr/local/bin:/usr/bin:/bin",
  };
  environment.NODE_DISABLE_COMPILE_CACHE = "1";
  Object.assign(environment, overrides);
  const actualKeys = Object.keys(environment).sort();
  if (actualKeys.some((key) => !SAFE_CHILD_ENV_KEYS.includes(key))) {
    throw new Error("child environment escaped the reviewed allowlist");
  }
  return deepFreeze(canonicalRecord(environment, "child environment"));
}

function runCaptured(command, args, options = {}) {
  try {
    return spawnSync(command, args, {
      cwd: projectRoot,
      env: buildSafeChildEnvironment(),
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
      ...options
    });
  } catch (error) {
    return {
      error,
      status: null,
      signal: null,
      stdout: Buffer.alloc(0),
      stderr: Buffer.alloc(0),
    };
  }
}

function printCaptured(result) {
  if (result.stdout?.length) process.stdout.write(result.stdout);
  if (result.stderr?.length) process.stderr.write(result.stderr);
}

function assertPinnedInventory(names, expectedCount, expectedSha256, label) {
  if (names.length !== expectedCount || new Set(names).size !== names.length) {
    throw new Error(`${label}: expected exactly ${expectedCount} unique names, got ${names.length}`);
  }
  const actualSha256 = sha256(canonicalNameManifest(names));
  if (actualSha256 !== expectedSha256) {
    throw new Error(`${label}: sorted reviewed filename manifest drifted (${actualSha256})`);
  }
}

function listBoundProjectFiles(output, label) {
  const result = output.split(/\r?\n/u).filter(Boolean);
  for (const relative of result) {
    if (path.isAbsolute(relative) || relative.includes("\\") ||
        relative.split("/").some((part) => part === "" || part === "." || part === "..")) {
      throw new Error(`${label}: capsule returned an escaping source path`);
    }
  }
  const sorted = [...result].sort();
  if (JSON.stringify(result) !== JSON.stringify(sorted) ||
      new Set(result).size !== result.length ||
      !result.includes(assignmentContractRelative)) {
    throw new Error(`${label}: capsule returned an unsorted, duplicate, or rootless graph`);
  }
  return result;
}

function validateTap(stdout) {
  const names = stdout.split(/\r?\n/u)
    .filter((line) => line.startsWith("# Subtest: "))
    .map((line) => line.slice("# Subtest: ".length));
  if (sha256(canonicalNameManifest(names)) !== EXPECTED_CONTRACT_TEST_NAMES_SHA256 ||
      JSON.stringify(names) !== JSON.stringify(EXPECTED_CONTRACT_TEST_NAMES)) {
    throw new Error("assignment contract TAP test-name inventory drifted");
  }
  const summary = new Map();
  for (const line of stdout.split(/\r?\n/u)) {
    const match = /^# (tests|suites|pass|fail|cancelled|skipped|todo) (\d+)$/u.exec(line);
    if (match) summary.set(match[1], Number(match[2]));
  }
  const expected = {
    cancelled: 0,
    fail: 0,
    pass: EXPECTED_CONTRACT_TEST_NAMES.length,
    skipped: 0,
    suites: 0,
    tests: EXPECTED_CONTRACT_TEST_NAMES.length,
    todo: 0
  };
  for (const [key, value] of Object.entries(expected)) {
    if (summary.get(key) !== value) throw new Error(`assignment contract TAP summary ${key} drifted`);
  }
  if (!stdout.split(/\r?\n/u).includes(`1..${EXPECTED_CONTRACT_TEST_NAMES.length}`)) {
    throw new Error("assignment contract TAP plan drifted");
  }
}

async function createRetainedRoots() {
  const scratchIdentity = lstatSync(scratchParent, { bigint: true });
  if (!scratchIdentity.isDirectory() || scratchIdentity.isSymbolicLink() ||
      scratchIdentity.uid !== BigInt(process.getuid()) ||
      (scratchIdentity.mode & BigInt(0o022)) !== BigInt(0) ||
      realpathSync(scratchParent) !== scratchParent ||
      !scratchParent.startsWith(`/Volumes/Starship${path.sep}`)) {
    throw new Error("signature scratch parent is not one owner-controlled Starship directory");
  }
  retainedRun = await createRetainedSignatureLabRun({
    scratchParent,
    classification: {
      schemaVersion: "ca.signature-lab.retained-run-classification.v1",
      classification: "INTENTIONALLY_RETAINED_SIGNATURE_LAB_EVIDENCE",
      state: "STARTED_UNSEALED",
      retainedArchiveCount: 1,
      destructiveCleanupAttempted: false,
      policy: "RETAIN_DO_NOT_DELETE",
    },
  });
  retainedCaseRoot = retainedRun.runRoot;
  outputDir = retainedRun.archiveRoot;
  evidenceRoot = retainedRun.evidenceRoot;
  assertPrivateDirectory(retainedCaseRoot);
  assertPrivateDirectory(outputDir);
  assertPrivateDirectory(evidenceRoot);
}

function sourceRecordForProvenance(record) {
  return {
    path: record.path,
    sha256: record.sha256,
    identity: {
      dev: String(record.identity.dev),
      ino: String(record.identity.ino),
      uid: Number(record.identity.uid),
      gid: Number(record.identity.gid),
      mode: Number(record.identity.mode & BigInt(0o7777)),
      nlink: Number(record.identity.nlink),
      size: String(record.identity.size),
      mtimeNs: String(record.identity.mtimeNs),
      ctimeNs: String(record.identity.ctimeNs),
    },
  };
}

function failureRecord(error) {
  if (error === null) return null;
  return {
    name: error instanceof Error ? error.name : "Error",
    message: error instanceof Error ? error.message : String(error),
  };
}

function recordSlug(value) {
  const result = value.toLowerCase().replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  if (result === "" || result.length > 180) {
    throw new Error(`${value}: invalid retained execution-record name`);
  }
  return result;
}

async function writeCanonicalRetainedRecord(relativePath, value, label) {
  const bytes = canonicalJsonBytes(value, label);
  const target = path.join(outputDir, ...relativePath.split("/"));
  const written = await writeOwnedFile(target, bytes);
  if (written.sha256 !== sha256(bytes) || written.byteLength !== bytes.length) {
    throw new Error(`${label}: durable publication binding drifted`);
  }
  return Object.freeze({
    path: written.path,
    relativePath: written.relativePath,
    sha256: written.sha256,
    byteLength: written.byteLength,
    identity: written.identity,
  });
}

function makePlannedRecord({ ordinal, name, kind, argv, cwd,
  environmentBinding, sourceBinding, toolBinding }) {
  return {
    schemaVersion: "ca.signature-lab.planned-gate.v1",
    gateId: `gate-${String(ordinal).padStart(4, "0")}-${recordSlug(name)}`,
    ordinal,
    name,
    kind,
    status: "NOT_RUN",
    argv,
    cwd,
    environmentBinding,
    sourceBinding,
    toolBinding,
  };
}

function assertExactObjectKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  if (JSON.stringify(actual) !== JSON.stringify([...expected].sort())) {
    throw new Error(`${label}: exact key schema drifted`);
  }
}

function assertExactPlannedGateInventory(plannedGateRecords, expectedCount) {
  if (plannedGateRecords.length !== expectedCount ||
      expectedCount !== EXPECTED_GATE_PLAN_COUNT) {
    throw new Error(`planned gate count drifted (${plannedGateRecords.length})`);
  }
  const plannedGateIds = new Set(plannedGateRecords.map((record) => record.gateId));
  const plannedGateNames = new Set(plannedGateRecords.map((record) => record.name));
  if (plannedGateIds.size !== expectedCount || plannedGateNames.size !== expectedCount) {
    throw new Error("planned gate ids or names are not unique");
  }
  for (let index = 0; index < plannedGateRecords.length; index += 1) {
    const record = plannedGateRecords[index];
    assertExactObjectKeys(record, EXPECTED_PLANNED_GATE_RECORD_KEYS,
      `planned gate ${record.gateId}`);
    if (record.ordinal !== index + 1 || record.status !== "NOT_RUN" ||
        record.gateId !==
          `gate-${String(record.ordinal).padStart(4, "0")}-${recordSlug(record.name)}`) {
      throw new Error(`${record.name}: planned gate identity drifted`);
    }
  }
  const namesSha256 = sha256(canonicalNameManifest(
    plannedGateRecords.map((record) => record.name),
  ));
  if (namesSha256 !== EXPECTED_GATE_PLAN_NAMES_SHA256) {
    throw new Error(`planned gate name binding drifted (${namesSha256})`);
  }
  const assignmentNames = plannedGateRecords
    .slice(EXPECTED_AUDIT_COUNT)
    .map((record) => record.name);
  if (assignmentNames.length !== EXPECTED_ASSIGNMENT_GATE_COUNT ||
      sha256(canonicalNameManifest(assignmentNames)) !==
        EXPECTED_ASSIGNMENT_GATE_NAMES_SHA256 ||
      JSON.stringify(assignmentNames) !==
        JSON.stringify(EXPECTED_ASSIGNMENT_GATE_NAMES)) {
    throw new Error("planned assignment gate binding drifted");
  }
}

function assertExactGateResultRecords(records, plannedGateRecords) {
  const plannedGateById = new Map(
    plannedGateRecords.map((record) => [record.gateId, record]),
  );
  const resultGateIds = new Set(records.map((record) => record.gateId));
  if (resultGateIds.size !== records.length) {
    throw new Error("gate result ids are not unique");
  }
  for (const record of records) {
    assertExactObjectKeys(record, EXPECTED_GATE_RESULT_RECORD_KEYS,
      `gate result ${record.gateId}`);
    if (!plannedGateById.has(record.gateId)) {
      throw new Error(`${record.gateId}: result has no immutable planned gate`);
    }
    for (const artifact of [record.stdout, record.stderr, record.result]) {
      assertExactObjectKeys(artifact, EXPECTED_GATE_ARTIFACT_RECORD_KEYS,
        `${record.gateId} artifact`);
    }
    if (!Object.isFrozen(record)) {
      throw new Error(`${record.gateId}: result record is not deeply immutable`);
    }
  }
}

function assertExactGateAttemptRecords(records, plannedGateRecords) {
  const plannedGateIds = new Set(plannedGateRecords.map((record) => record.gateId));
  const attemptedGateIds = new Set(records.map((record) => record.gateId));
  if (attemptedGateIds.size !== records.length) {
    throw new Error("gate attempt ids are not unique");
  }
  for (const record of records) {
    assertExactObjectKeys(record, EXPECTED_GATE_ATTEMPT_RECORD_KEYS,
      `gate attempt ${record.gateId}`);
    if (!plannedGateIds.has(record.gateId) || record.status !== "STARTED") {
      throw new Error(`${record.gateId}: attempt has no immutable planned gate`);
    }
    assertExactObjectKeys(record.attempt, EXPECTED_GATE_ARTIFACT_RECORD_KEYS,
      `${record.gateId} attempt artifact`);
    if (!Object.isFrozen(record)) {
      throw new Error(`${record.gateId}: attempt record is not deeply immutable`);
    }
  }
}

function gateArtifactRecord(record) {
  return {
    relativePath: record.relativePath,
    sha256: record.sha256,
    byteLength: record.byteLength,
  };
}

function sealedTerminalEvidence(result) {
  assertExactObjectKeys(
    result,
    EXPECTED_SEALED_EVIDENCE_RESULT_KEYS,
    "sealed retained-evidence result",
  );
  return {
    archiveRoot: result.archiveRoot,
    destructiveCleanupAttempted: result.destructiveCleanupAttempted,
    externalReceipt: result.externalReceipt,
    manifestPath: result.manifestPath,
    manifestSha256: result.manifestSha256,
    outcome: result.outcome,
    reportPath: result.reportPath,
    reportSha256: result.reportSha256,
    retainedArchiveCount: result.retainedArchiveCount,
    sealPath: result.sealPath,
    sealSha256: result.sealSha256,
    treeDigestSha256: result.treeDigestSha256,
    currentRunPhysicalState: "PHYSICALLY_BOUND",
    globalResidueState: "NOT_EVALUATED",
    gateFailure: null,
    sealingFailure: null,
    closeFailure: null,
  };
}

function executionErrorRecord(error) {
  if (error === undefined || error === null) return null;
  return {
    name: error.name ?? "Error",
    code: typeof error.code === "string" ? error.code : null,
    message: error.message ?? String(error),
  };
}

async function executeRecordedGate(planRecord, validation = null, executor = null) {
  if (planRecord.status !== "NOT_RUN" ||
      gateResultRecords.some((record) => record.gateId === planRecord.gateId)) {
    throw new Error(`${planRecord.name}: planned gate was already executed`);
  }
  const [command, ...args] = planRecord.argv;
  const slug = `${String(planRecord.ordinal).padStart(4, "0")}-${recordSlug(planRecord.name)}`;
  const executionDirectory = path.join(outputDir, "executions", slug);
  const startedMonotonicNs = process.hrtime.bigint();
  const attemptValue = {
    schemaVersion: "ca.signature-lab.execution-attempt.v1",
    gateId: planRecord.gateId,
    ordinal: planRecord.ordinal,
    status: "STARTED",
    argv: planRecord.argv,
    cwd: planRecord.cwd,
    environmentBindingSha256: sha256(canonicalJsonBytes(
      planRecord.environmentBinding,
      `${planRecord.name} environmentBinding`,
    )),
    sourceBinding: planRecord.sourceBinding,
    toolBinding: planRecord.toolBinding,
    startedMonotonicNs: String(startedMonotonicNs),
  };
  const attemptBytes = canonicalJsonBytes(attemptValue, `${planRecord.name} attempt`);
  const started = await appendRetainedSignatureLabExecutionJournal(
    retainedRun,
    {
      eventType: "STARTED",
      ordinal: planRecord.ordinal,
      gateId: planRecord.gateId,
      attempt: {
        relativePath: archiveRelative(path.join(executionDirectory, "attempt.json")),
        bytes: attemptBytes,
      },
    },
  );
  executionJournal = started.journal;
  retainedDirectoryPaths.add(path.join(outputDir, "executions"));
  retainedDirectoryPaths.add(executionDirectory);
  const attempt = started.artifacts.attempt;
  if (attempt.sha256 !== sha256(attemptBytes) ||
      attempt.byteLength !== attemptBytes.length) {
    throw new Error(`${planRecord.name}: retained attempt binding drifted`);
  }
  gateAttemptRecords.push(deepFreeze({
    gateId: planRecord.gateId,
    status: "STARTED",
    attempt: gateArtifactRecord(attempt),
  }));
  const execution = executor === null
    ? runCaptured(command, args, {
      cwd: planRecord.cwd,
      env: planRecord.environmentBinding,
    })
    : executor();
  const endedMonotonicNs = process.hrtime.bigint();
  const stdoutBytes = Buffer.isBuffer(execution.stdout)
    ? execution.stdout
    : Buffer.from(execution.stdout ?? "", "utf8");
  const stderrBytes = Buffer.isBuffer(execution.stderr)
    ? execution.stderr
    : Buffer.from(execution.stderr ?? "", "utf8");
  const expectedStdout = {
    relativePath: archiveRelative(path.join(executionDirectory, "stdout.bin")),
    byteLength: stdoutBytes.length,
    sha256: sha256(stdoutBytes),
  };
  const expectedStderr = {
    relativePath: archiveRelative(path.join(executionDirectory, "stderr.bin")),
    byteLength: stderrBytes.length,
    sha256: sha256(stderrBytes),
  };
  let semanticFailure = null;
  let validationValue = null;
  const processPassed = execution.error === undefined && execution.signal === null &&
    execution.status === 0;
  if (processPassed && validation !== null) {
    try {
      validationValue = validation(execution);
    } catch (error) {
      semanticFailure = error;
    }
  }
  const passed = processPassed && semanticFailure === null;
  const resultValue = {
    schemaVersion: "ca.signature-lab.execution-result.v1",
    gateId: planRecord.gateId,
    status: passed ? "PASS" : "FAIL",
    argv: planRecord.argv,
    cwd: planRecord.cwd,
    environmentBinding: planRecord.environmentBinding,
    environmentBindingSha256: sha256(canonicalJsonBytes(
      planRecord.environmentBinding,
      `${planRecord.name} environmentBinding`,
    )),
    toolBinding: planRecord.toolBinding,
    sourceBinding: planRecord.sourceBinding,
    startedMonotonicNs: String(startedMonotonicNs),
    endedMonotonicNs: String(endedMonotonicNs),
    durationNs: String(endedMonotonicNs - startedMonotonicNs),
    exitCode: execution.status,
    signal: execution.signal,
    error: executionErrorRecord(execution.error),
    semanticFailure: failureRecord(semanticFailure),
    stdout: gateArtifactRecord(expectedStdout),
    stderr: gateArtifactRecord(expectedStderr),
  };
  const resultBytes = canonicalJsonBytes(resultValue, `${planRecord.name} result`);
  const completed = await appendRetainedSignatureLabExecutionJournal(
    retainedRun,
    {
      eventType: "RESULT",
      ordinal: planRecord.ordinal,
      gateId: planRecord.gateId,
      status: resultValue.status,
      exitCode: execution.status,
      signal: execution.signal,
      stdout: {
        relativePath: expectedStdout.relativePath,
        bytes: stdoutBytes,
      },
      stderr: {
        relativePath: expectedStderr.relativePath,
        bytes: stderrBytes,
      },
      result: {
        relativePath: archiveRelative(path.join(executionDirectory, "result.json")),
        bytes: resultBytes,
      },
    },
  );
  executionJournal = completed.journal;
  const stdout = completed.artifacts.stdout;
  const stderr = completed.artifacts.stderr;
  const result = completed.artifacts.result;
  if (stdout.relativePath !== expectedStdout.relativePath ||
      stdout.sha256 !== expectedStdout.sha256 ||
      stdout.byteLength !== expectedStdout.byteLength ||
      stderr.relativePath !== expectedStderr.relativePath ||
      stderr.sha256 !== expectedStderr.sha256 ||
      stderr.byteLength !== expectedStderr.byteLength) {
    throw new Error(`${planRecord.name}: retained output binding drifted`);
  }
  if (result.sha256 !== sha256(resultBytes) ||
      result.byteLength !== resultBytes.length) {
    throw new Error(`${planRecord.name}: retained result binding drifted`);
  }
  gateResultRecords.push(deepFreeze({
    schemaVersion: "ca.signature-lab.gate-result.v1",
    gateId: planRecord.gateId,
    status: resultValue.status,
    exitCode: execution.status,
    signal: execution.signal,
    stdout: gateArtifactRecord(stdout),
    stderr: gateArtifactRecord(stderr),
    result: gateArtifactRecord(result),
  }));
  if (semanticFailure !== null) throw semanticFailure;
  return { execution, passed, resultValue, result, validationValue };
}

async function publishInitialPlan() {
  await writeCanonicalRetainedRecord(
    "plans/planned-audits.json",
    {
      schemaVersion: "ca.signature-lab.planned-audit-ledger.v1",
      records: plannedAuditRecords,
    },
    "planned audit ledger",
  );
  await writeCanonicalRetainedRecord(
    "plans/planned-assignment-gates.json",
    {
      schemaVersion: "ca.signature-lab.planned-assignment-ledger.v1",
      records: plannedAssignmentGateRecords,
    },
    "planned assignment gate ledger",
  );
}

async function publishFinalLedger() {
  return writeCanonicalRetainedRecord(
    "plans/final-ledger.json",
    {
      schemaVersion: "ca.signature-lab.final-gate-ledger.v1",
      plannedGateRecords: immutableGatePlan,
      gateAttemptRecords,
      gateResultRecords,
      gateFailure: failureRecord(primaryFailure),
    },
    "final gate ledger",
  );
}

function assertExecutionJournalChronology() {
  if (executionJournalPublication === null || executionJournal === null) {
    throw new Error("execution journal was not durably initialized");
  }
  const attemptCount = gateAttemptRecords.length;
  const resultCount = gateResultRecords.length;
  if (resultCount > attemptCount || attemptCount > resultCount + 1 ||
      executionJournal.recordCount !== attemptCount + resultCount) {
    throw new Error("execution journal and gate ledgers are not one valid prefix");
  }
  for (let index = 0; index < attemptCount; index += 1) {
    if (gateAttemptRecords[index].gateId !== immutableGatePlan[index]?.gateId) {
      throw new Error("execution journal attempt prefix drifted from the immutable plan");
    }
  }
  for (let index = 0; index < resultCount; index += 1) {
    if (gateResultRecords[index].gateId !== immutableGatePlan[index]?.gateId) {
      throw new Error("execution journal result prefix drifted from the immutable plan");
    }
  }
  const expectedNextEventType = attemptCount > resultCount
    ? "RESULT"
    : resultCount === immutableGatePlan.length
      ? "COMPLETE"
      : "STARTED";
  const expectedNextOrdinal = attemptCount > resultCount
    ? attemptCount
    : resultCount + 1;
  if (executionJournal.nextEventType !== expectedNextEventType ||
      executionJournal.nextOrdinal !== expectedNextOrdinal ||
      executionJournal.relativePath !== executionJournalPublication.relativePath ||
      executionJournal.path !== executionJournalPublication.path ||
      executionJournal.byteLength < executionJournalPublication.byteLength) {
    throw new Error("execution journal final state is not the expected gate prefix");
  }
  for (const field of ["type", "dev", "ino", "uid", "gid", "mode", "nlink"]) {
    if (executionJournal.identity[field] !== executionJournalPublication.identity[field]) {
      throw new Error(`execution journal final ${field} identity drifted`);
    }
  }
  if (primaryFailure === null &&
      (attemptCount !== EXPECTED_GATE_PLAN_COUNT ||
       resultCount !== EXPECTED_GATE_PLAN_COUNT ||
       executionJournal.recordCount !== EXPECTED_GATE_PLAN_COUNT * 2 ||
       executionJournal.nextEventType !== "COMPLETE" ||
       executionJournal.nextOrdinal !== EXPECTED_GATE_PLAN_COUNT + 1)) {
    throw new Error("successful runner did not complete all 394 journal events");
  }
  return deepFreeze({
    schemaVersion: "ca.signature-lab.execution-journal-provenance.v1",
    planSha256: executionJournalPublication.planSha256,
    plannedGateCount: executionJournalPublication.plannedGateCount,
    plannedGateIdsSha256: executionJournalPublication.plannedGateIdsSha256,
    relativePath: executionJournal.relativePath,
    identity: executionJournal.identity,
    byteLength: executionJournal.byteLength,
    sha256: executionJournal.sha256,
    recordCount: executionJournal.recordCount,
    lastFrameSha256: executionJournal.lastFrameSha256,
    nextEventType: executionJournal.nextEventType,
    nextOrdinal: executionJournal.nextOrdinal,
  });
}

async function finalizeRetainedEvidence() {
  if (retainedRun === null || outputDir === null || evidenceRoot === null ||
      retainedCaseRoot === null ||
      runnerSourceRecord === null || retainedEvidenceModuleRecord === null ||
      sourceBindingsModuleRecord === null || executionCapsuleModuleRecord === null ||
      assignmentExecutionCapsuleModuleRecord === null ||
      typescriptBundleRecord === null || assignmentArchiveRecord === null ||
      assignmentArchiveBuild === null) {
    throw new Error("retained evidence roots or provenance were not initialized");
  }
  assertExactPlannedGateInventory(immutableGatePlan, EXPECTED_GATE_PLAN_COUNT);
  assertExactGateAttemptRecords(gateAttemptRecords, immutableGatePlan);
  assertExactGateResultRecords(gateResultRecords, immutableGatePlan);
  assertSourceRecordUnchanged(runnerSourceRecord, "signature lab runner source");
  assertSourceRecordUnchanged(retainedEvidenceModuleRecord,
    "signature retained-evidence module source");
  assertSourceRecordUnchanged(sourceBindingsModuleRecord,
    "signature source-bindings module source");
  assertSourceRecordUnchanged(executionCapsuleModuleRecord,
    "signature execution-capsule module source");
  assertSourceRecordUnchanged(assignmentExecutionCapsuleModuleRecord,
    "signature assignment execution-capsule module source");
  assertSourceRecordUnchanged(typescriptBundleRecord,
    "descriptor-bound TypeScript bundle source");
  if (exactToolBinding !== null) assertExactPhysicalToolsUnchanged(exactToolBinding);
  const executionJournalProvenance = assertExecutionJournalChronology();
  const finalLedger = await publishFinalLedger();
  const outcome = primaryFailure === null
    ? PASS_RETAINED_SEALED_ARCHIVE
    : FAIL_RETAINED_SEALED_ARCHIVE;
  const provenance = {
    schemaVersion: "ca.signature-lab.retained-run-provenance.v1",
    retainedCaseRoot,
    archiveRoot: outputDir,
    evidenceRoot,
    destructiveCleanupAttempted: false,
    retainedArchiveCount: 1,
    globalResidueState: "NOT_EVALUATED",
    gateAttemptRecords,
    executionJournal: executionJournalProvenance,
    auditInventory: {
      count: EXPECTED_AUDIT_COUNT,
      namesSha256: EXPECTED_AUDIT_NAMES_SHA256,
      planRecords: plannedAuditRecords,
      resultRecords: gateResultRecords.filter((record) =>
        plannedAuditRecords.some((plan) => plan.gateId === record.gateId)),
    },
    labInventory: {
      count: EXPECTED_LAB_COUNT,
      namesSha256: EXPECTED_LAB_NAMES_SHA256,
      auditLabPairNamesSha256: EXPECTED_AUDIT_LAB_PAIR_NAMES_SHA256,
      auditLabSourceSha256: EXPECTED_AUDIT_LAB_SOURCE_SHA256,
    },
    assignmentContracts: {
      count: EXPECTED_CONTRACT_TEST_NAMES.length,
      names: EXPECTED_CONTRACT_TEST_NAMES,
      namesSha256: EXPECTED_CONTRACT_TEST_NAMES_SHA256,
      planRecords: plannedAssignmentGateRecords,
      resultRecords: gateResultRecords.filter((record) =>
        plannedAssignmentGateRecords.some((plan) => plan.gateId === record.gateId)),
    },
    finalLedger,
    runner: sourceRecordForProvenance(runnerSourceRecord),
    retainedEvidenceModule: sourceRecordForProvenance(retainedEvidenceModuleRecord),
    sourceBindingsModule: sourceRecordForProvenance(sourceBindingsModuleRecord),
    executionCapsuleModule: sourceRecordForProvenance(executionCapsuleModuleRecord),
    executionCapsuleSha256: EXACT_BOUND_SIGNATURE_AUDIT_CAPSULE_SHA256,
    assignmentExecutionCapsuleModule:
      sourceRecordForProvenance(assignmentExecutionCapsuleModuleRecord),
    assignmentExecutionCapsuleSha256: EXACT_BOUND_ASSIGNMENT_CAPSULE_SHA256,
    assignmentArchive: {
      relativePath: assignmentArchiveRecord.relativePath,
      byteLength: assignmentArchiveRecord.byteLength,
      sha256: assignmentArchiveRecord.sha256,
      identity: assignmentArchiveRecord.identity,
      headerSha256: assignmentArchiveBuild.headerSha256,
      compilerEntryCount: assignmentArchiveBuild.compilerEntryCount,
      declarationCount: assignmentArchiveBuild.declarationCount,
    },
    typescriptBundle: sourceRecordForProvenance(typescriptBundleRecord),
    exactToolBinding: exactToolBinding?.toolBinding ?? null,
    node: { executable: process.execPath, version: process.version,
      sha256: exactToolBinding?.nodeRecord.sha256 ?? null },
    gateFailure: failureRecord(primaryFailure),
  };
  const result = await sealRetainedSignatureLabEvidence({
    run: retainedRun,
    outcome,
    provenance,
  });
  // Publication has crossed the durable sealed boundary even if the
  // independent receipt revalidation below detects a later inconsistency.
  retainedEvidenceResult = result;
  const revalidated = await revalidateRetainedSignatureLabEvidence({
    manifestPath: result.manifestPath,
    sealPath: result.sealPath,
    reportPath: result.reportPath,
    externalReceipt: result.externalReceipt,
  });
  if (result.retainedArchiveCount < 1 || revalidated.retainedArchiveCount < 1 ||
      result.destructiveCleanupAttempted !== false ||
      revalidated.destructiveCleanupAttempted !== false ||
      result.outcome !== outcome || revalidated.outcome !== outcome ||
      result.sealSha256 !== revalidated.sealSha256) {
    throw new Error("retained evidence result/revalidation binding drifted");
  }
  return result;
}

async function executeGates() {
  runnerSourceRecord = stableReadSourceFile(runnerPath, "signature lab runner source");
  retainedEvidenceModuleRecord = stableReadSourceFile(
    retainedEvidenceModulePath,
    "signature retained-evidence module source",
  );
  sourceBindingsModuleRecord = stableReadSourceFile(
    sourceBindingsModulePath,
    "signature source-bindings module source",
  );
  executionCapsuleModuleRecord = stableReadSourceFile(
    executionCapsuleModulePath,
    "signature execution-capsule module source",
  );
  assignmentExecutionCapsuleModuleRecord = stableReadSourceFile(
    assignmentExecutionCapsuleModulePath,
    "signature assignment execution-capsule module source",
  );
  typescriptBundleRecord = stableReadSourceFile(
    typescriptBundlePath,
    "descriptor-bound TypeScript bundle source",
  );
  if (typescriptBundleRecord.sha256 !== EXPECTED_TYPESCRIPT_BUNDLE_SHA256 ||
      typescriptBundleRecord.byteLength !== EXPECTED_TYPESCRIPT_BUNDLE_BYTE_LENGTH) {
    throw new Error("descriptor-bound TypeScript bundle provenance drifted");
  }
  await createRetainedRoots();
  exactToolBinding = bindExactPhysicalTools();
  const auditFiles = readdirSync(auditsDir)
    .filter((name) => name.startsWith("audit-") && name.endsWith(".mjs"))
    .sort();
  const labFiles = readdirSync(auditsDir)
    .filter((name) => name.endsWith("Lab.jsx"))
    .sort();
  assertPinnedInventory(auditFiles, EXPECTED_AUDIT_COUNT,
    EXPECTED_AUDIT_NAMES_SHA256, "signature math audit inventory");
  assertPinnedInventory(labFiles, EXPECTED_LAB_COUNT,
    EXPECTED_LAB_NAMES_SHA256, "signature lab source inventory");
  const sourceFiles = [...auditFiles, ...labFiles];
  if (new Set(sourceFiles).size !== sourceFiles.length) {
    throw new Error("signature audit and lab source inventories overlap");
  }
  const auditSourceRecords = new Map(sourceFiles.map((name) => [
    name,
    stableReadSourceFile(path.join(auditsDir, name), `signature source ${name}`)
  ]));
  const auditLabPairs = assertExactAuditLabSourceBindings(
    auditFiles,
    labFiles,
    auditSourceRecords,
  );
  const projectTsconfigRecord = stableReadSourceFile(projectTsconfig, "project tsconfig");
  if (projectTsconfigRecord.sha256 !== EXPECTED_PROJECT_TSCONFIG_SHA256) {
    throw new Error("project tsconfig bytes drifted from the reviewed assignment projection");
  }

  const auditSnapshot = path.join(outputDir, auditsRelativeDir);
  const auditBatchEntries = [...auditSourceRecords.entries()]
    .map(([name, record]) => ({
      name,
      relativePath: `${auditsRelativeDir}/${name}`,
      bytes: record.bytes,
      source: record,
    }))
    .toSorted((left, right) =>
      compareUnicodeOrdinal(left.relativePath, right.relativePath));
  const immutableSourceBytes = auditBatchEntries.reduce(
    (total, entry) => total + entry.bytes.length,
    0,
  );
  const immutableSourceMaxBytes = Math.max(
    ...auditBatchEntries.map((entry) => entry.bytes.length),
  );
  if (auditBatchEntries.length !== EXPECTED_IMMUTABLE_SOURCE_COUNT ||
      immutableSourceBytes !== EXPECTED_IMMUTABLE_SOURCE_BYTES ||
      immutableSourceMaxBytes !== EXPECTED_IMMUTABLE_SOURCE_MAX_BYTES) {
    throw new Error("immutable audit/Lab batch inventory or byte totals drifted");
  }
  const batch = await writeRetainedSignatureLabBatch(
    retainedRun,
    auditBatchEntries.map(({ relativePath, bytes }) => ({ relativePath, bytes })),
  );
  if (batch.entryCount !== EXPECTED_IMMUTABLE_SOURCE_COUNT ||
      batch.totalByteLength !== EXPECTED_IMMUTABLE_SOURCE_BYTES ||
      batch.files.length !== EXPECTED_IMMUTABLE_SOURCE_COUNT) {
    throw new Error("immutable audit/Lab batch publication summary drifted");
  }
  const publishedByRelativePath = new Map();
  for (let index = 0; index < auditBatchEntries.length; index += 1) {
    const expected = auditBatchEntries[index];
    const published = batch.files[index];
    if (published.relativePath !== expected.relativePath ||
        published.path !== path.join(outputDir, ...expected.relativePath.split("/")) ||
        published.byteLength !== expected.bytes.length ||
        published.sha256 !== expected.source.sha256 ||
        publishedByRelativePath.has(published.relativePath)) {
      throw new Error("immutable audit/Lab batch file binding drifted");
    }
    publishedByRelativePath.set(published.relativePath, published);
  }
  for (const directory of batch.directories) {
    const expectedPath = path.join(outputDir, ...directory.relativePath.split("/"));
    if (directory.path !== expectedPath || !isInside(outputDir, directory.path) ||
        directory.path === outputDir) {
      throw new Error("immutable audit/Lab batch directory binding drifted");
    }
    retainedDirectoryPaths.add(directory.path);
  }
  const auditSnapshotRecords = new Map(sourceFiles.map((name) => {
    const relativePath = `${auditsRelativeDir}/${name}`;
    const published = publishedByRelativePath.get(relativePath);
    if (published === undefined) {
      throw new Error(`immutable audit/Lab batch omitted ${relativePath}`);
    }
    return [name, published];
  }));

  const graphEnvironment = buildSafeChildEnvironment();
  const liveGraphConfig = path.join(outputDir, "live-graph-tsconfig.json");
  const contractSnapshot = path.join(outputDir, "contract-snapshot");
  const snapshotTsconfig = path.join(contractSnapshot, "tsconfig.json");
  const snapshotEnvironment = graphEnvironment;
  const {
    assignmentLiveSourceBinding,
    assignmentSnapshotSourceBinding,
    declarationRecords,
    liveRecords,
    snapshotRecords,
  } = await prepareAssignmentSourceBindings({
    contractSnapshot,
    liveGraphConfig,
    snapshotTsconfig,
    projectTsconfigRecord,
  });
  const plannedGateRecords = deepFreeze([
    ...auditFiles.map((name, index) => {
      const pair = auditLabPairs[index];
      const auditSnapshotRecord = auditSnapshotRecords.get(pair.audit);
      const labSnapshotRecord = auditSnapshotRecords.get(pair.lab);
      const expectedLabRead = auditSourceReadsPairedLab(
        auditSourceRecords.get(pair.audit),
      );
      return makePlannedRecord({
        ordinal: index + 1,
        name,
        kind: "signature-math-audit",
        argv: exactBoundSignatureAuditArgv({
          nodePath: exactToolBinding.nodeRecord.path,
          auditVirtualPath: auditSnapshotRecord.path,
          labVirtualPath: labSnapshotRecord.path,
          expectedLabRead,
          expectedAuditSha256: auditSnapshotRecord.sha256,
          expectedLabSha256: labSnapshotRecord.sha256,
        }),
        cwd: auditSnapshot,
        environmentBinding: graphEnvironment,
        sourceBinding: {
          schemaVersion: "ca.signature-lab.audit-source-binding.v1",
          reviewedPairNamesSha256: EXPECTED_AUDIT_LAB_PAIR_NAMES_SHA256,
          reviewedSourceSha256: EXPECTED_AUDIT_LAB_SOURCE_SHA256,
          executionCapsule: {
            schemaVersion: "ca.signature-lab.bound-audit-execution.v1",
            capsuleSha256: EXACT_BOUND_SIGNATURE_AUDIT_CAPSULE_SHA256,
            auditDescriptor: 3,
            labDescriptor: 4,
            expectedLabRead,
            expectedAuditSha256: auditSnapshotRecord.sha256,
            expectedLabSha256: labSnapshotRecord.sha256,
          },
          audit: {
            live: sourceRecordForProvenance(auditSourceRecords.get(pair.audit)),
            snapshot: auditSnapshotRecord,
          },
          lab: {
            live: sourceRecordForProvenance(auditSourceRecords.get(pair.lab)),
            snapshot: labSnapshotRecord,
          },
        },
        toolBinding: exactToolBinding.toolBinding.node,
      });
    }),
    makePlannedRecord({
      ordinal: 193,
      name: EXPECTED_ASSIGNMENT_GATE_NAMES[0],
      kind: "assignment-graph",
      argv: exactBoundAssignmentArgv({
        nodePath: exactToolBinding.nodeRecord.path,
        mode: "graph",
        expectedArchiveSha256: assignmentArchiveBuild.sha256,
      }),
      cwd: projectRoot,
      environmentBinding: graphEnvironment,
      sourceBinding: assignmentLiveSourceBinding,
      toolBinding: exactToolBinding.toolBinding.node,
    }),
    makePlannedRecord({
      ordinal: 194,
      name: EXPECTED_ASSIGNMENT_GATE_NAMES[1],
      kind: "assignment-graph",
      argv: exactBoundAssignmentArgv({
        nodePath: exactToolBinding.nodeRecord.path,
        mode: "graph",
        expectedArchiveSha256: assignmentArchiveBuild.sha256,
      }),
      cwd: contractSnapshot,
      environmentBinding: snapshotEnvironment,
      sourceBinding: assignmentSnapshotSourceBinding,
      toolBinding: exactToolBinding.toolBinding.node,
    }),
    makePlannedRecord({
      ordinal: 195,
      name: EXPECTED_ASSIGNMENT_GATE_NAMES[2],
      kind: "assignment-typecheck",
      argv: exactBoundAssignmentArgv({
        nodePath: exactToolBinding.nodeRecord.path,
        mode: "typecheck",
        expectedArchiveSha256: assignmentArchiveBuild.sha256,
      }),
      cwd: contractSnapshot,
      environmentBinding: snapshotEnvironment,
      sourceBinding: assignmentSnapshotSourceBinding,
      toolBinding: exactToolBinding.toolBinding.node,
    }),
    makePlannedRecord({
      ordinal: 196,
      name: EXPECTED_ASSIGNMENT_GATE_NAMES[3],
      kind: "assignment-tap",
      argv: exactBoundAssignmentArgv({
        nodePath: exactToolBinding.nodeRecord.path,
        mode: "tap",
        expectedArchiveSha256: assignmentArchiveBuild.sha256,
      }),
      cwd: contractSnapshot,
      environmentBinding: snapshotEnvironment,
      sourceBinding: assignmentSnapshotSourceBinding,
      toolBinding: exactToolBinding.toolBinding.node,
    }),
    makePlannedRecord({
      ordinal: 197,
      name: EXPECTED_ASSIGNMENT_GATE_NAMES[4],
      kind: "assignment-graph",
      argv: exactBoundAssignmentArgv({
        nodePath: exactToolBinding.nodeRecord.path,
        mode: "graph",
        expectedArchiveSha256: assignmentArchiveBuild.sha256,
      }),
      cwd: projectRoot,
      environmentBinding: graphEnvironment,
      sourceBinding: assignmentLiveSourceBinding,
      toolBinding: exactToolBinding.toolBinding.node,
    }),
  ]);
  assertExactPlannedGateInventory(plannedGateRecords, EXPECTED_GATE_PLAN_COUNT);
  immutableGatePlan = plannedGateRecords;
  plannedAuditRecords = Object.freeze(plannedGateRecords.slice(0, EXPECTED_AUDIT_COUNT));
  plannedAssignmentGateRecords = Object.freeze(
    plannedGateRecords.slice(EXPECTED_AUDIT_COUNT),
  );
  await publishInitialPlan();
  executionJournalPublication =
    await initializeRetainedSignatureLabExecutionJournal(retainedRun, {
      relativePath: "executions/execution-journal.v1.bin",
      planSha256: sha256(canonicalJsonArrayBytes(
        immutableGatePlan,
        "immutable gate plan",
      )),
      plannedGates: immutableGatePlan.map(({ ordinal, gateId }) => ({
        ordinal,
        gateId,
      })),
    });
  executionJournal = Object.freeze({
    relativePath: executionJournalPublication.relativePath,
    path: executionJournalPublication.path,
    identity: executionJournalPublication.identity,
    byteLength: executionJournalPublication.byteLength,
    sha256: executionJournalPublication.sha256,
    recordCount: executionJournalPublication.recordCount,
    lastFrameSha256: executionJournalPublication.lastFrameSha256,
    nextEventType: executionJournalPublication.nextEventType,
    nextOrdinal: executionJournalPublication.nextOrdinal,
  });
  retainedDirectoryPaths.add(path.join(outputDir, "executions"));

  console.log("== Signature lab math audits ==");
  for (const [index, file] of auditFiles.entries()) {
    console.log(`\n-- ${file}`);
    const pair = auditLabPairs[index];
    const expectedLabRead = auditSourceReadsPairedLab(
      auditSourceRecords.get(pair.audit),
    );
    const auditSnapshotRecord = auditSnapshotRecords.get(pair.audit);
    const labSnapshotRecord = auditSnapshotRecords.get(pair.lab);
    const recorded = await executeExactBoundAuditGate({
      planRecord: plannedAuditRecords[index],
      auditRecord: auditSnapshotRecord,
      labRecord: labSnapshotRecord,
      expectedLabRead,
      validation: () => {
        assertSourceRecordUnchanged(
          auditSourceRecords.get(pair.audit),
          `signature audit source ${pair.audit}`,
        );
        assertSourceRecordUnchanged(
          auditSourceRecords.get(pair.lab),
          `signature Lab source ${pair.lab}`,
        );
        assertRetainedSourcePathBound(
          auditSnapshotRecord,
          `signature audit snapshot ${pair.audit}`,
        );
        assertRetainedSourcePathBound(
          labSnapshotRecord,
          `signature Lab snapshot ${pair.lab}`,
        );
      },
    });
    printCaptured(recorded.execution);
    if (!recorded.passed) {
      throw new Error(`${file} reported a math failure`);
    }
  }
  console.log("\n== Signature lab contract test ==");
  const liveGraphExecution = await executeExactBoundAssignmentGate({
    planRecord: plannedAssignmentGateRecords[0],
    mode: "graph",
    validation: (execution) => {
      const graph = listBoundProjectFiles(
        execution.stdout.toString("utf8"),
        "signature assignment live dependency graph",
      );
      if (JSON.stringify(graph) !== JSON.stringify(EXPECTED_ASSIGNMENT_SOURCE_GRAPH)) {
        throw new Error("signature assignment compiler graph differs from reviewed graph");
      }
      for (const [relative, record] of liveRecords) {
        assertSourceRecordUnchanged(record, `assignment source ${relative}`);
      }
      assertSourceRecordUnchanged(projectTsconfigRecord, "project tsconfig");
      return graph;
    },
  });
  const graphResult = liveGraphExecution.execution;
  if (!liveGraphExecution.passed) {
    printCaptured(graphResult);
    throw new Error("assignment capsule could not derive the reviewed dependency graph");
  }
  const liveGraph = liveGraphExecution.validationValue;

  const snapshotListRecord = await executeExactBoundAssignmentGate({
    planRecord: plannedAssignmentGateRecords[1],
    mode: "graph",
    validation: (execution) => {
      const graph = listBoundProjectFiles(
        execution.stdout.toString("utf8"),
        "signature assignment snapshot dependency graph",
      );
      if (JSON.stringify(graph) !== JSON.stringify(liveGraph)) {
        throw new Error(
          "signature assignment snapshot dependency graph differs from live graph",
        );
      }
      for (const [relative, record] of snapshotRecords) {
        assertRetainedSourcePathBound(record, `assignment snapshot ${relative}`);
      }
      return graph;
    },
  });
  const snapshotList = snapshotListRecord.execution;
  if (!snapshotListRecord.passed) {
    printCaptured(snapshotList);
    throw new Error("assignment capsule could not rederive its bound dependency graph");
  }
  const snapshotGraph = snapshotListRecord.validationValue;

  const typeCheckedRecord = await executeExactBoundAssignmentGate({
    planRecord: plannedAssignmentGateRecords[2],
    mode: "typecheck",
  });
  const typeChecked = typeCheckedRecord.execution;
  if (!typeCheckedRecord.passed) {
    printCaptured(typeChecked);
    throw new Error("assignment capsule failed to type-check its bound dependency graph");
  }

  const contractExecution = await executeExactBoundAssignmentGate({
    planRecord: plannedAssignmentGateRecords[3],
    mode: "tap",
    validation: (execution) => {
      validateTap(execution.stdout.toString("utf8"));
    },
  });
  const contractResult = contractExecution.execution;
  printCaptured(contractResult);
  if (!contractExecution.passed) throw new Error("assignment contract test failed");

  const finalGraphRecord = await executeExactBoundAssignmentGate({
    planRecord: plannedAssignmentGateRecords[4],
    mode: "graph",
    validation: (execution) => {
      const finalGraph = listBoundProjectFiles(
        execution.stdout.toString("utf8"),
        "signature assignment final dependency graph",
      );
      if (JSON.stringify(finalGraph) !== JSON.stringify(liveGraph)) {
        throw new Error("signature assignment live dependency graph changed during the gate");
      }
      for (const [relative, record] of liveRecords) {
        assertSourceRecordUnchanged(record, `assignment source ${relative}`);
      }
      assertSourceRecordUnchanged(projectTsconfigRecord, "project tsconfig");
      assertSourceRecordUnchanged(runnerSourceRecord, "signature lab runner source");
      assertSourceRecordUnchanged(retainedEvidenceModuleRecord,
        "signature retained-evidence module source");
      assertSourceRecordUnchanged(sourceBindingsModuleRecord,
        "signature source-bindings module source");
      assertSourceRecordUnchanged(executionCapsuleModuleRecord,
        "signature execution-capsule module source");
      assertSourceRecordUnchanged(assignmentExecutionCapsuleModuleRecord,
        "signature assignment execution-capsule module source");
      assertSourceRecordUnchanged(typescriptBundleRecord,
        "descriptor-bound TypeScript bundle source");
      assertExactPhysicalToolsUnchanged(exactToolBinding);
      return finalGraph;
    },
  });
  const finalGraphResult = finalGraphRecord.execution;
  if (!finalGraphRecord.passed) {
    printCaptured(finalGraphResult);
    throw new Error("assignment capsule could not rederive the final reviewed graph");
  }
}

async function executeAndSealRetainedGate() {
  try {
    await executeGates();
  } catch (error) {
    primaryFailure = error;
  }

  if (retainedRun !== null) {
    try {
      retainedEvidenceResult = await finalizeRetainedEvidence();
    } catch (error) {
      retainedEvidenceFailure = error;
    }
  }
}

async function inspectAndCloseRetainedRun() {
  let observedBinding = null;
  let closeBinding = null;
  try {
    const freshRetainedRunBinding = retainedRun === null
      ? null
      : await inspectRetainedSignatureLabRun(retainedRun);
    observedBinding = freshRetainedRunBinding;
  } catch (error) {
    if (retainedEvidenceFailure === null) retainedEvidenceFailure = error;
  } finally {
    if (retainedRun !== null) {
      try {
        const freshRetainedRunClose = await closeRetainedSignatureLabRun(retainedRun);
        closeBinding = freshRetainedRunClose;
        if (freshRetainedRunClose?.state !== "CLOSED" ||
            freshRetainedRunClose?.bound !== false) {
          const error = new Error(
            `retained run close was not exact CLOSED/unbound (state=${
              freshRetainedRunClose?.state ?? "UNKNOWN"
            }, bound=${String(freshRetainedRunClose?.bound)})`,
          );
          retainedRunCloseFailure = error;
          if (retainedEvidenceFailure === null) retainedEvidenceFailure = error;
        }
      } catch (error) {
        retainedRunCloseFailure = error;
        if (retainedEvidenceFailure === null) retainedEvidenceFailure = error;
      }
    }
  }
  return { observedBinding, closeBinding };
}

await executeAndSealRetainedGate();

const {
  observedBinding: freshRetainedRunBinding,
  closeBinding: freshRetainedRunClose,
} = await inspectAndCloseRetainedRun();
const retainedRunClosureProven = freshRetainedRunBinding?.bound === true &&
  freshRetainedRunClose?.state === "CLOSED" &&
  freshRetainedRunClose?.bound === false;
const terminalEvidence = primaryFailure === null &&
    retainedEvidenceFailure === null && retainedEvidenceResult !== null &&
    retainedRunClosureProven
  ? sealedTerminalEvidence(retainedEvidenceResult)
  : {
  outcome: retainedEvidenceResult === null
    ? FAIL_RETAINED_UNSEALED
    : FAIL_RETAINED_SEALED_ARCHIVE,
  retainedArchiveCount: retainedRunClosureProven ? 1 : null,
  currentRunPhysicalState: retainedRun === null
    ? "UNKNOWN"
    : retainedRunClosureProven
      ? "PHYSICALLY_BOUND"
      : "UNKNOWN",
  globalResidueState: "NOT_EVALUATED",
  destructiveCleanupAttempted: false,
  retainedCaseRoot,
  archiveRoot: outputDir,
  evidenceRoot,
  gateFailure: failureRecord(primaryFailure),
  sealingFailure: failureRecord(retainedEvidenceFailure),
  closeFailure: failureRecord(retainedRunCloseFailure),
};
console.log(`\nSIGNATURE_LAB_RETAINED_EVIDENCE ${JSON.stringify(terminalEvidence)}`);

if (primaryFailure !== null || retainedEvidenceFailure !== null ||
    retainedEvidenceResult === null || freshRetainedRunBinding?.bound !== true ||
    freshRetainedRunClose?.state !== "CLOSED" ||
    freshRetainedRunClose?.bound !== false) {
  process.exitCode = 1;
}

if (primaryFailure !== null) {
  console.error(`\n✗ ${primaryFailure instanceof Error ? primaryFailure.message : String(primaryFailure)}`);
}
if (retainedEvidenceFailure !== null) {
  console.error(`\n✗ retained evidence sealing failed: ${
    retainedEvidenceFailure instanceof Error
      ? retainedEvidenceFailure.message
      : String(retainedEvidenceFailure)
  }`);
}
if (process.exitCode !== 1) {
  console.log("\n✓ Signature lab gates passed and remain in one sealed retained archive " +
    "(192 math audits + 6 assignment contracts).");
}
